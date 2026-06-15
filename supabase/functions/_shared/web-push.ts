// Web Push sender for Supabase Edge Functions (Deno)
// Implements RFC 8030 + VAPID auth (RFC 8292) + aesgcm payload encryption (RFC 8188)
//
// Usage:
//   import { sendPushNotification } from "../_shared/web-push.ts";
//   const result = await sendPushNotification({ endpoint, keys: { p256dh, auth } }, payload, vapid);

import { crypto } from "https://deno.land/std@0.224.0/crypto/mod.ts";
import { encodeBase64Url } from "https://deno.land/std@0.224.0/encoding/base64url.ts";

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
  publicKey: string;
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

// -- helpers ---------------------------------------------------------------

function base64UrlDecode(input: string): Uint8Array {
  // Accept both standard and URL-safe base64
  const normalized = input.replace(/-/g, "+").replace(/_/g, "/");
  const padded = normalized + "===".slice((normalized.length + 3) % 4);
  const binary = atob(padded);
  const out = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) out[i] = binary.charCodeAt(i);
  return out;
}

function concatBytes(...arrays: Uint8Array[]): Uint8Array {
  const total = arrays.reduce((s, a) => s + a.byteLength, 0);
  const out = new Uint8Array(total);
  let offset = 0;
  for (const a of arrays) {
    out.set(a, offset);
    offset += a.byteLength;
  }
  return out;
}

async function hmacSha256(key: Uint8Array, data: Uint8Array): Promise<Uint8Array> {
  const cryptoKey = await crypto.subtle.importKey(
    "raw",
    key as BufferSource,
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", cryptoKey, data as BufferSource);
  return new Uint8Array(sig);
}

async function importHmacKey(key: Uint8Array): Promise<CryptoKey> {
  return await crypto.subtle.importKey(
    "raw",
    key as BufferSource,
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
}

async function aesGcmEncrypt(
  key: Uint8Array,
  iv: Uint8Array,
  plaintext: Uint8Array,
  additionalData: Uint8Array,
): Promise<Uint8Array> {
  const cryptoKey = await crypto.subtle.importKey(
    "raw",
    key as BufferSource,
    { name: "AES-GCM" },
    false,
    ["encrypt"],
  );
  const ct = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv: iv as BufferSource, additionalData: additionalData as BufferSource },
    cryptoKey,
    plaintext as BufferSource,
  );
  return new Uint8Array(ct);
}

async function ecdhDeriveSharedSecret(
  privateKeyRaw: Uint8Array,
  publicKeyRaw: Uint8Array,
): Promise<Uint8Array> {
  const priv = await crypto.subtle.importKey(
    "raw",
    privateKeyRaw as BufferSource,
    { name: "ECDH", namedCurve: "P-256" },
    false,
    ["deriveBits"],
  );
  const sharedBits = await crypto.subtle.deriveBits(
    { name: "ECDH", public: await crypto.subtle.importKey(
      "raw",
      publicKeyRaw as BufferSource,
      { name: "ECDH", namedCurve: "P-256" },
      false,
      [],
    ) },
    priv,
    256,
  );
  return new Uint8Array(sharedBits);
}

async function importEcPublicKey(raw: Uint8Array): Promise<CryptoKey> {
  return await crypto.subtle.importKey(
    "raw",
    raw as BufferSource,
    { name: "ECDH", namedCurve: "P-256" },
    false,
    [],
  );
}

async function importEcPrivateKey(raw: Uint8Array): Promise<CryptoKey> {
  return await crypto.subtle.importKey(
    "raw",
    raw as BufferSource,
    { name: "ECDH", namedCurve: "P-256" },
    false,
    ["deriveBits"],
  );
}

async function importEcPublicKeyForSign(raw: Uint8Array): Promise<CryptoKey> {
  // SEC1 uncompressed form for ECDSA verify
  return await crypto.subtle.importKey(
    "raw",
    raw as BufferSource,
    { name: "ECDSA", namedCurve: "P-256" },
    false,
    ["verify"],
  );
}

async function importEcPrivateKeyForSign(raw: Uint8Array): Promise<CryptoKey> {
  return await crypto.subtle.importKey(
    "raw",
    raw as BufferSource,
    { name: "ECDSA", namedCurve: "P-256" },
    false,
    ["sign"],
  );
}

function randomBytes(length: number): Uint8Array {
  const buf = new Uint8Array(length);
  crypto.getRandomValues(buf);
  return buf;
}

// -- JWT / VAPID -----------------------------------------------------------

async function createVapidJwt(
  audience: string,
  subject: string,
  vapidPrivateKey: Uint8Array,
  publicKey: Uint8Array,
): Promise<string> {
  const header = { typ: "JWT", alg: "ES256" };
  const now = Math.floor(Date.now() / 1000);
  const claims = {
    aud: audience,
    exp: now + 12 * 60 * 60,
    iat: now,
    sub: subject,
  };
  const enc = (obj: unknown) =>
    encodeBase64Url(new TextEncoder().encode(JSON.stringify(obj)));
  const signingInput = `${enc(header)}.${enc(claims)}`;
  const signingInputBytes = new TextEncoder().encode(signingInput);

  const key = await importEcPrivateKeyForSign(vapidPrivateKey);
  const sig = await crypto.subtle.sign(
    { name: "ECDSA", hash: "SHA-256" },
    key,
    signingInputBytes as BufferSource,
  );
  const sigBytes = new Uint8Array(sig);
  // Convert ASN.1 DER signature to raw r||s form (required by VAPID/JWT ES256)
  const raw = derToJoseSignature(sigBytes, 32);
  return `${signingInput}.${encodeBase64Url(raw)}`;
}

function derToJoseSignature(der: Uint8Array, targetLength: number): Uint8Array {
  // crude DER SEQUENCE -> raw r||s conversion
  let offset = 0;
  if (der[offset++] !== 0x30) throw new Error("Invalid DER: expected SEQUENCE");
  let seqLen = der[offset++];
  if (seqLen & 0x80) {
    const n = seqLen & 0x7f;
    seqLen = 0;
    for (let i = 0; i < n; i++) seqLen = (seqLen << 8) | der[offset++];
  }
  if (der[offset++] !== 0x02) throw new Error("Invalid DER: expected INTEGER r");
  let rLen = der[offset++];
  let r = der.subarray(offset, offset + rLen);
  offset += rLen;
  // strip leading zero
  if (r.length > targetLength && r[0] === 0) r = r.subarray(1);
  if (der[offset++] !== 0x02) throw new Error("Invalid DER: expected INTEGER s");
  let sLen = der[offset++];
  let s = der.subarray(offset, offset + sLen);
  if (s.length > targetLength && s[0] === 0) s = s.subarray(1);

  const out = new Uint8Array(targetLength * 2);
  out.set(r, targetLength - r.length);
  out.set(s, targetLength * 2 - s.length);
  return out;
}

// -- Payload encryption ----------------------------------------------------

async function encryptPayload(
  payload: Uint8Array,
  p256dh: Uint8Array,
  auth: Uint8Array,
): Promise<{ ciphertext: Uint8Array; salt: Uint8Array; localPublicKey: Uint8Array }> {
  // Generate ephemeral ECDH key pair
  const localKeyPair = await crypto.subtle.generateKey(
    { name: "ECDH", namedCurve: "P-256" },
    true,
    ["deriveBits"],
  );
  const localPublicRaw = new Uint8Array(await crypto.subtle.exportKey("raw", localKeyPair.publicKey));
  const localPrivateKey = await importEcPrivateKey(localPublicRaw.length === 32
    ? // For P-256, raw private export is not supported in WebCrypto; reimport via PKCS8 if needed
      // Use crypto.subtle.exportKey with 'pkcs8'
      await (async () => {
        const pkcs8 = await crypto.subtle.exportKey("pkcs8", localKeyPair.privateKey);
        return new Uint8Array(pkcs8);
      })()
    : localPublicRaw);

  // derive shared secret
  const remotePub = await importEcPublicKey(p256dh);
  const sharedBits = await crypto.subtle.deriveBits(
    { name: "ECDH", public: remotePub },
    localKeyPair.privateKey,
    256,
  );
  const sharedSecret = new Uint8Array(sharedBits);

  // auth info for HKDF
  const authInfo = new TextEncoder().encode("WebPush: info\x00");
  const sharedAuth = concatBytes(sharedSecret, p256dh, localPublicRaw);

  // IKM = HMAC-SHA256(auth, sharedAuth)
  const ikm = await hmacSha256(auth, sharedAuth);

  // PRK = HMAC-SHA256(salt, IKM) -- salt is random 16 bytes
  const salt = randomBytes(16);
  const prkKey = await importHmacKey(salt);
  const prk = new Uint8Array(await crypto.subtle.sign("HMAC", prkKey, ikm as BufferSource));

  // Derive keys
  const cekInfo = new TextEncoder().encode("Content-Encoding: aes128gcm\x00");
  const nonceInfo = new TextEncoder().encode("Content-Encoding: nonce\x00");

  const prkKey2 = await importHmacKey(prk);
  const cek = new Uint8Array(await crypto.subtle.sign("HMAC", prkKey2, cekInfo as BufferSource));
  const iv = new Uint8Array(await crypto.subtle.sign("HMAC", prkKey2, nonceInfo as BufferSource));
  // Truncate to 12 bytes for AES-GCM nonce
  const iv12 = iv.subarray(0, 12);

  // Pad plaintext: \0 + \0 + payload
  const padded = concatBytes(new Uint8Array([0, 0]), payload);

  const ciphertext = await aesGcmEncrypt(cek, iv12, padded, new Uint8Array(0));

  return { ciphertext, salt, localPublicKey: localPublicRaw };
}

// -- Main API --------------------------------------------------------------

export async function sendPushNotification(
  subscription: PushSubscription,
  payload: PushPayload,
  vapid: VapidKeys,
): Promise<SendResult> {
  try {
    const endpointUrl = new URL(subscription.endpoint);
    const audience = `${endpointUrl.protocol}//${endpointUrl.host}`;

    const jwt = await createVapidJwt(
      audience,
      vapid.subject,
      base64UrlDecode(vapid.privateKey),
      base64UrlDecode(vapid.publicKey),
    );

    const payloadBytes = new TextEncoder().encode(JSON.stringify(payload));
    const p256dh = base64UrlDecode(subscription.keys.p256dh);
    const auth = base64UrlDecode(subscription.keys.auth);

    const { ciphertext, salt, localPublicKey } = await encryptPayload(payloadBytes, p256dh, auth);

    const headers: Record<string, string> = {
      "Content-Type": "application/octet-stream",
      "Content-Encoding": "aes128gcm",
      "TTL": "60",
      "Authorization": `vapid t=${jwt}, k=${vapid.publicKey}`,
    };

    const res = await fetch(subscription.endpoint, {
      method: "POST",
      headers,
      body: ciphertext as BodyInit,
    });

    if (!res.ok) {
      const text = await res.text();
      return {
        ok: false,
        statusCode: res.status,
        error: text || res.statusText,
        reason: classifyError(res.status),
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

function classifyError(status: number): string {
  if (status === 404 || status === 410) return "subscription_gone";
  if (status === 403) return "forbidden";
  if (status === 429) return "rate_limited";
  if (status >= 500) return "push_service_unavailable";
  return "unknown";
}
