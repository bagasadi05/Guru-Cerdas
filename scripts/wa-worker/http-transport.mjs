/**
 * WhatsApp transport for the poller: forwards one message to the Baileys service running
 * on the same VPS (`guru-cerdas-wa`, http://127.0.0.1:3001 by default).
 *
 * Service contract:
 *   GET  /status → {"connected": true|false}
 *   POST /send   {"phone","message"} → {"ok":true,"id":"<key.id>"}
 *                or {"ok":false,"notAttempted":true} when nothing reached WhatsApp
 *
 * Environment: WA_SERVICE_TOKEN (required), WA_SERVICE_URL, WA_SERVICE_AUTH_HEADER.
 */

const baseUrl = new URL(process.env.WA_SERVICE_URL ?? 'http://127.0.0.1:3001');
const token = process.env.WA_SERVICE_TOKEN ?? '';
const authHeader = process.env.WA_SERVICE_AUTH_HEADER ?? 'x-auth-token';
if (!token) throw new Error('WA_SERVICE_TOKEN is required');
// The token travels in plain HTTP, so only a service on this machine is allowed.
if (baseUrl.protocol !== 'https:' && !['127.0.0.1', 'localhost', '[::1]'].includes(baseUrl.hostname)) {
  throw new Error('WA_SERVICE_URL must be local or HTTPS');
}

const headers = { [authHeader]: token, 'Content-Type': 'application/json' };

export async function isReady() {
  try {
    const response = await fetch(new URL('/status', baseUrl), { headers, signal: AbortSignal.timeout(5000) });
    if (!response.ok) return false;
    const body = await response.json();
    return body?.connected === true;
  } catch {
    return false;
  }
}

export async function send(message, { signal } = {}) {
  let response;
  try {
    response = await fetch(new URL('/send', baseUrl), {
      method: 'POST',
      headers,
      body: JSON.stringify({ phone: message.phone, message: message.message }),
      signal,
    });
  } catch (error) {
    // The request may have reached the service; the poller records the outcome as unknown.
    throw new Error(`service request failed: ${error?.name ?? 'error'}`);
  }

  let body = null;
  try {
    body = await response.json();
  } catch {
    body = null;
  }

  if (response.ok && body?.ok === true && typeof body.id === 'string' && body.id.trim()) {
    return { wa_id: body.id };
  }
  const error = new Error(`service did not confirm the send (HTTP ${response.status})`);
  // Only an explicit notAttempted answer proves nothing was sent.
  if (body?.notAttempted === true) error.deliveryNotAttempted = true;
  throw error;
}
