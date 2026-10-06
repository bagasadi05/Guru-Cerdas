// Web Push sender for Supabase Edge Functions (Deno)
// Implements RFC 8030 delivery, RFC 8291 message encryption (aes128gcm) and
// RFC 8292 VAPID authentication.
//
// Uses only the global WebCrypto API (no remote imports), so the same module
// runs in the Deno edge runtime and in Vitest.
//
// Usage:
//   import { sendPushNotification } from "../_shared/web-push.ts";
//   const result = await sendPushNotification({ endpoint, keys: { p256dh, auth } }, payload, vapid);

export interface PushSubscriptionKeys {
  p256dh: string;
  auth: string;
}

export interface PushSubscription {
  endpoint: string;
  keys: PushSubscriptionKeys;
  expirationTime?: number | null;
}

export interface VapidKeys {
  /** Base64url uncompressed P-256 public key (65 bytes), same value the browser subscribed with. */
  publicKey: string;
  /** Base64url raw P-256 private scalar (32 bytes). */
  privateKey: string;
  subject: string;
}

export interface PushPayload {
  title: string;
  body: string;
  icon?: string;
  badge?: string;
  tag?: string;
  data?: Record<string, unknown>;
  requireInteraction?: boolean;
  actions?: Array<{ action: string; title: string; icon?: string }>;
  [key: string]: unknown;
}

export interface SendResult {
  ok: boolean;
  statusCode?: number;
  error?: string;
  reason?: string;
}

/** Key pair for the sender side of RFC 8291 encryption. */
export interface EcdhKeyPair {
  privateKey: CryptoKey;
  publicKeyRaw: Uint8Array;
}

const subtle = globalThis.crypto.subtle;
const encoder = new TextEncoder();

/** RFC 8188 record size; payloads here are far below it, so one record suffices. */
const RECORD_SIZE = 4096;

// -- encoding helpers --------------------------------------------------------

export function base64UrlDecode(input: string): Uint8Array {
  // Accept both standard and URL-safe base64, with or without padding.
  const normalized = input.trim().replace(/-/g, "+").replace(/_/g, "/").replace(/=+$/, "");
  const padded = normalized + "===".slice((normalized.length + 3) % 4);
  const binary = atob(padded);
  const out = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) out[i] = binary.charCodeAt(i);
  return out;
}

export function base64UrlEncode(bytes: Uint8Array): string {
  let binary = "";
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function concatBytes(...arrays: Uint8Array[]): Uint8Array {
  const total = arrays.reduce((sum, a) => sum + a.byteLength, 0);
  const out = new Uint8Array(total);
  let offset = 0;
  for (const a of arrays) {
    out.set(a, offset);
    offset += a.byteLength;
  }
  return out;
}

async function hmacSha256(key: Uint8Array, data: Uint8Array): Promise<Uint8Array> {
  const cryptoKey = await subtle.importKey(
    "raw",
    key as BufferSource,
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  return new Uint8Array(await subtle.sign("HMAC", cryptoKey, data as BufferSource));
}

/** HKDF-SHA256 (RFC 5869) for output lengths up to one hash block, as RFC 8291 needs. */
async function hkdf(salt: Uint8Array, ikm: Uint8Array, info: Uint8Array, length: number): Promise<Uint8Array> {
  const prk = await hmacSha256(salt, ikm);
  const okm = await hmacSha256(prk, concatBytes(info, new Uint8Array([1])));
  return okm.slice(0, length);
}

// -- key import ----------------------------------------------------------------

/**
 * WebCrypto cannot import EC private keys in "raw" format, so the raw scalar
 * and public point are converted to a JWK first.
 */
export async function importP256PrivateKey(
  privateKeyB64: string,
  publicKeyB64: string,
  algorithm: "ECDSA" | "ECDH",
): Promise<CryptoKey> {
  const pub = base64UrlDecode(publicKeyB64);
  if (pub.length !== 65 || pub[0] !== 0x04) {
    throw new Error("Public key must be a 65-byte uncompressed P-256 point");
  }
  const d = base64UrlDecode(privateKeyB64);
  if (d.length !== 32) {
    throw new Error("Private key must be a 32-byte P-256 scalar");
  }
  const jwk: JsonWebKey = {
    kty: "EC",
    crv: "P-256",
    d: base64UrlEncode(d),
    x: base64UrlEncode(pub.subarray(1, 33)),
    y: base64UrlEncode(pub.subarray(33, 65)),
    ext: false,
  };
  return await subtle.importKey(
    "jwk",
    jwk,
    { name: algorithm, namedCurve: "P-256" },
    false,
    algorithm === "ECDSA" ? ["sign"] : ["deriveBits"],
  );
}

async function generateEcdhKeyPair(): Promise<EcdhKeyPair> {
  const pair = await subtle.generateKey({ name: "ECDH", namedCurve: "P-256" }, true, ["deriveBits"]) as CryptoKeyPair;
  const publicKeyRaw = new Uint8Array(await subtle.exportKey("raw", pair.publicKey));
  return { privateKey: pair.privateKey, publicKeyRaw };
}

// -- VAPID (RFC 8292) ------------------------------------------------------------

export async function createVapidJwt(audience: string, vapid: VapidKeys, nowSeconds = Math.floor(Date.now() / 1000)): Promise<string> {
  const header = { typ: "JWT", alg: "ES256" };
  const claims = {
    aud: audience,
    exp: nowSeconds + 12 * 60 * 60,
    sub: vapid.subject,
  };
  const encodeJson = (obj: unknown) => base64UrlEncode(encoder.encode(JSON.stringify(obj)));
  const signingInput = `${encodeJson(header)}.${encodeJson(claims)}`;

  const key = await importP256PrivateKey(vapid.privateKey, vapid.publicKey, "ECDSA");
  // WebCrypto already returns the raw r||s form that JWS ES256 expects.
  const signature = new Uint8Array(
    await subtle.sign({ name: "ECDSA", hash: "SHA-256" }, key, encoder.encode(signingInput) as BufferSource),
  );
  return `${signingInput}.${base64UrlEncode(signature)}`;
}

// -- Message encryption (RFC 8291, aes128gcm) ------------------------------------

/**
 * Encrypt a push message for one subscription. `salt` and `senderKeys` are
 * only injected by tests to reproduce the RFC 8291 Appendix A vector.
 */
export async function encryptPayload(
  plaintext: Uint8Array,
  uaPublicB64: string,
  authSecretB64: string,
  options: { salt?: Uint8Array; senderKeys?: EcdhKeyPair } = {},
): Promise<Uint8Array> {
  const uaPublic = base64UrlDecode(uaPublicB64);
  const authSecret = base64UrlDecode(authSecretB64);
  const sender = options.senderKeys ?? await generateEcdhKeyPair();
  const salt = options.salt ?? globalThis.crypto.getRandomValues(new Uint8Array(16));

  const uaKey = await subtle.importKey("raw", uaPublic as BufferSource, { name: "ECDH", namedCurve: "P-256" }, false, []);
  const ecdhSecret = new Uint8Array(
    await subtle.deriveBits({ name: "ECDH", public: uaKey } as EcdhKeyDeriveParams, sender.privateKey, 256),
  );

  const keyInfo = concatBytes(encoder.encode("WebPush: info\0"), uaPublic, sender.publicKeyRaw);
  const ikm = await hkdf(authSecret, ecdhSecret, keyInfo, 32);
  const cek = await hkdf(salt, ikm, encoder.encode("Content-Encoding: aes128gcm\0"), 16);
  const nonce = await hkdf(salt, ikm, encoder.encode("Content-Encoding: nonce\0"), 12);

  // Single final record: plaintext followed by the 0x02 delimiter, no extra padding.
  const record = concatBytes(plaintext, new Uint8Array([2]));
  const aesKey = await subtle.importKey("raw", cek as BufferSource, { name: "AES-GCM" }, false, ["encrypt"]);
  const ciphertext = new Uint8Array(
    await subtle.encrypt({ name: "AES-GCM", iv: nonce as BufferSource }, aesKey, record as BufferSource),
  );

  const recordSize = new Uint8Array(4);
  new DataView(recordSize.buffer).setUint32(0, RECORD_SIZE);
  const header = concatBytes(salt, recordSize, new Uint8Array([sender.publicKeyRaw.length]), sender.publicKeyRaw);
  return concatBytes(header, ciphertext);
}

// -- Main API ------------------------------------------------------------------

export async function sendPushNotification(
  subscription: PushSubscription,
  payload: PushPayload,
  vapid: VapidKeys,
): Promise<SendResult> {
  try {
    const endpointUrl = new URL(subscription.endpoint);
    const audience = `${endpointUrl.protocol}//${endpointUrl.host}`;
    const jwt = await createVapidJwt(audience, vapid);

    const body = await encryptPayload(
      encoder.encode(JSON.stringify(payload)),
      subscription.keys.p256dh,
      subscription.keys.auth,
    );

    const res = await fetch(subscription.endpoint, {
      method: "POST",
      signal: AbortSignal.timeout(10000),
      headers: {
        "Content-Type": "application/octet-stream",
        "Content-Encoding": "aes128gcm",
        "TTL": "86400",
        "Urgency": "normal",
        "Authorization": `vapid t=${jwt}, k=${base64UrlEncode(base64UrlDecode(vapid.publicKey))}`,
      },
      body: body as BodyInit,
    });

    if (!res.ok) {
      const text = await res.text();
      return {
        ok: false,
        statusCode: res.status,
        error: text || res.statusText,
        reason: classifyError(res.status, text),
      };
    }

    return { ok: true, statusCode: res.status };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : String(err),
      reason: "internal_error",
    };
  }
}

export function classifyError(status: number, detail = ''): string {
  if ((status === 400 || status === 403) && (
    detail.includes('VapidPkHashMismatch') || detail.includes('do not correspond to the credentials used to create')
  )) return 'vapid_key_mismatch';
  if (status === 404 || status === 410) return "subscription_gone";
  if (status === 403) return "forbidden";
  if (status === 429) return "rate_limited";
  if (status >= 500) return "push_service_unavailable";
  return "unknown";
}
