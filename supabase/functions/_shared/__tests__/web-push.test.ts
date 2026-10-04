import { describe, it, expect, vi, afterEach } from 'vitest';
import {
    base64UrlDecode,
    base64UrlEncode,
    createVapidJwt,
    encryptPayload,
    importP256PrivateKey,
    sendPushNotification,
    type VapidKeys,
} from '../web-push';

const subtle = globalThis.crypto.subtle;
const encoder = new TextEncoder();

// RFC 8291 Appendix A — "Encryption Example"
const RFC = {
    plaintext: 'When I grow up, I want to be a watermelon',
    asPublic: 'BP4z9KsN6nGRTbVYI_c7VJSPQTBtkgcy27mlmlMoZIIgDll6e3vCYLocInmYWAmS6TlzAC8wEqKK6PBru3jl7A8',
    asPrivate: 'yfWPiYE-n46HLnH0KqZOF1fJJU3MYrct3AELtAQ-oRw',
    uaPublic: 'BCVxsr7N_eNgVRqvHtD0zTZsEc6-VV-JvLexhqUzORcxaOzi6-AYWXvTBHm4bjyPjs7Vd8pZGH6SRpkNtoIAiw4',
    uaPrivate: 'q1dXpw3UpT5VOmu_cf_v6ih07Aems3njxI-JWgLcM94',
    salt: 'DGv6ra1nlYgDCS1FRnbzlw',
    authSecret: 'BTBZMqHH6r4Tts7J_aSIgg',
    body: 'DGv6ra1nlYgDCS1FRnbzlwAAEABBBP4z9KsN6nGRTbVYI_c7VJSPQTBtkgcy27mlmlMoZIIgDll6e3vCYLocInmYWAmS6TlzAC8wEqKK6PBru3jl7A_yl95bQpu6cVPTpK4Mqgkf1CXztLVBSt2Ks3oZwbuwXPXLWyouBWLVWGNWQexSgSxsj_Qulcy4a-fN',
};

async function hmac(key: Uint8Array, data: Uint8Array): Promise<Uint8Array> {
    const k = await subtle.importKey('raw', key, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
    return new Uint8Array(await subtle.sign('HMAC', k, data));
}

async function hkdf(salt: Uint8Array, ikm: Uint8Array, info: Uint8Array, length: number) {
    const prk = await hmac(salt, ikm);
    return (await hmac(prk, new Uint8Array([...info, 1]))).slice(0, length);
}

/** Independent receiver-side decryption, written straight from RFC 8291 §3.4. */
async function decryptAsBrowser(body: Uint8Array, uaPrivateB64: string, uaPublicB64: string, authSecretB64: string) {
    const salt = body.slice(0, 16);
    const idLen = body[20];
    const senderPublic = body.slice(21, 21 + idLen);
    const ciphertext = body.slice(21 + idLen);

    const uaKey = await importP256PrivateKey(uaPrivateB64, uaPublicB64, 'ECDH');
    const senderKey = await subtle.importKey('raw', senderPublic, { name: 'ECDH', namedCurve: 'P-256' }, false, []);
    const ecdhSecret = new Uint8Array(await subtle.deriveBits({ name: 'ECDH', public: senderKey }, uaKey, 256));

    const uaPublic = base64UrlDecode(uaPublicB64);
    const keyInfo = new Uint8Array([...encoder.encode('WebPush: info\0'), ...uaPublic, ...senderPublic]);
    const ikm = await hkdf(base64UrlDecode(authSecretB64), ecdhSecret, keyInfo, 32);
    const cek = await hkdf(salt, ikm, encoder.encode('Content-Encoding: aes128gcm\0'), 16);
    const nonce = await hkdf(salt, ikm, encoder.encode('Content-Encoding: nonce\0'), 12);

    const aesKey = await subtle.importKey('raw', cek, { name: 'AES-GCM' }, false, ['decrypt']);
    const record = new Uint8Array(await subtle.decrypt({ name: 'AES-GCM', iv: nonce }, aesKey, ciphertext));
    expect(record[record.length - 1]).toBe(2); // final-record delimiter
    return new TextDecoder().decode(record.slice(0, -1));
}

async function generateVapidKeys(): Promise<VapidKeys> {
    const pair = await subtle.generateKey({ name: 'ECDSA', namedCurve: 'P-256' }, true, ['sign', 'verify']) as CryptoKeyPair;
    const jwk = await subtle.exportKey('jwk', pair.privateKey);
    const publicRaw = new Uint8Array(await subtle.exportKey('raw', pair.publicKey));
    return { publicKey: base64UrlEncode(publicRaw), privateKey: jwk.d!, subject: 'mailto:admin@example.com' };
}

describe('web-push encryption (RFC 8291)', () => {
    it('reproduces the RFC 8291 Appendix A message body byte-for-byte', async () => {
        const senderKey = await importP256PrivateKey(RFC.asPrivate, RFC.asPublic, 'ECDH');
        const body = await encryptPayload(encoder.encode(RFC.plaintext), RFC.uaPublic, RFC.authSecret, {
            salt: base64UrlDecode(RFC.salt),
            senderKeys: { privateKey: senderKey, publicKeyRaw: base64UrlDecode(RFC.asPublic) },
        });
        expect(base64UrlEncode(body)).toBe(RFC.body);
    });

    it('produces a body the browser side can decrypt with a fresh ephemeral key', async () => {
        const body = await encryptPayload(encoder.encode('{"title":"Absensi","body":"Hadir"}'), RFC.uaPublic, RFC.authSecret);
        // aes128gcm header: 16-byte salt, 4-byte record size, key id length 65
        expect(new DataView(body.buffer, body.byteOffset).getUint32(16)).toBe(4096);
        expect(body[20]).toBe(65);
        const plaintext = await decryptAsBrowser(body, RFC.uaPrivate, RFC.uaPublic, RFC.authSecret);
        expect(plaintext).toBe('{"title":"Absensi","body":"Hadir"}');
    });

    it('uses a new salt and sender key for every message', async () => {
        const a = await encryptPayload(encoder.encode('x'), RFC.uaPublic, RFC.authSecret);
        const b = await encryptPayload(encoder.encode('x'), RFC.uaPublic, RFC.authSecret);
        expect(base64UrlEncode(a.slice(0, 16))).not.toBe(base64UrlEncode(b.slice(0, 16)));
        expect(base64UrlEncode(a.slice(21, 86))).not.toBe(base64UrlEncode(b.slice(21, 86)));
    });
});

describe('VAPID (RFC 8292)', () => {
    it('imports a raw base64url VAPID key pair and signs a verifiable ES256 JWT', async () => {
        const vapid = await generateVapidKeys();
        const jwt = await createVapidJwt('https://fcm.googleapis.com', vapid, 1_800_000_000);
        const [h, c, s] = jwt.split('.');

        expect(JSON.parse(new TextDecoder().decode(base64UrlDecode(h)))).toEqual({ typ: 'JWT', alg: 'ES256' });
        expect(JSON.parse(new TextDecoder().decode(base64UrlDecode(c)))).toEqual({
            aud: 'https://fcm.googleapis.com',
            exp: 1_800_000_000 + 12 * 60 * 60,
            sub: 'mailto:admin@example.com',
        });

        const signature = base64UrlDecode(s);
        expect(signature.length).toBe(64);
        const verifyKey = await subtle.importKey('raw', base64UrlDecode(vapid.publicKey), { name: 'ECDSA', namedCurve: 'P-256' }, false, ['verify']);
        const valid = await subtle.verify({ name: 'ECDSA', hash: 'SHA-256' }, verifyKey, signature, encoder.encode(`${h}.${c}`));
        expect(valid).toBe(true);
    });

    it('rejects a malformed public key instead of sending a broken request', async () => {
        await expect(importP256PrivateKey(RFC.asPrivate, 'AAAA', 'ECDSA')).rejects.toThrow('65-byte');
    });
});

describe('sendPushNotification', () => {
    afterEach(() => vi.unstubAllGlobals());

    it('posts an encrypted aes128gcm body with VAPID authorization', async () => {
        const vapid = await generateVapidKeys();
        const fetchMock = vi.fn().mockResolvedValue(new Response(null, { status: 201 }));
        vi.stubGlobal('fetch', fetchMock);

        const result = await sendPushNotification(
            { endpoint: 'https://fcm.googleapis.com/fcm/send/abc', keys: { p256dh: RFC.uaPublic, auth: RFC.authSecret } },
            { title: 'Absensi', body: 'Ananda hadir' },
            vapid,
        );

        expect(result).toEqual({ ok: true, statusCode: 201 });
        const [url, init] = fetchMock.mock.calls[0];
        expect(url).toBe('https://fcm.googleapis.com/fcm/send/abc');
        expect(init.headers['Content-Encoding']).toBe('aes128gcm');
        expect(init.headers.Authorization).toMatch(new RegExp(`^vapid t=[\\w-]+\\.[\\w-]+\\.[\\w-]+, k=${vapid.publicKey}$`));
        const plaintext = await decryptAsBrowser(init.body, RFC.uaPrivate, RFC.uaPublic, RFC.authSecret);
        expect(JSON.parse(plaintext)).toEqual({ title: 'Absensi', body: 'Ananda hadir' });
    });

    it('marks 410 responses as gone so the subscription gets deactivated', async () => {
        const vapid = await generateVapidKeys();
        vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('expired', { status: 410 })));

        const result = await sendPushNotification(
            { endpoint: 'https://updates.push.services.mozilla.com/wpush/v2/x', keys: { p256dh: RFC.uaPublic, auth: RFC.authSecret } },
            { title: 't', body: 'b' },
            vapid,
        );

        expect(result).toMatchObject({ ok: false, statusCode: 410, reason: 'subscription_gone' });
    });
});
