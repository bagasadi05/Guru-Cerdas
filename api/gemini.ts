import { validBudget, geminiConfig, upstreamAbort, retryHint, type AiBudgetProfile } from './_aiBudget.js';
import { authenticateRequest } from './_auth.js';
import {
  createRateLimiter,
  isOriginAllowed,
  type ExtendedRequest,
  type ExtendedResponse,
} from './_requestGuard.js';

/**
 * Gemini serverless proxy — keeps GEMINI_API_KEY server-side.
 *
 * Mirrors the security model of the former api/openrouter.ts:
 *  - Origin allowlist (GEMINI_ALLOWED_ORIGIN, comma-separated, wildcard + subdomain support)
 *  - Per-client rate limiting (in-memory, or Upstash Redis when KV_REST_API_URL is set)
 *  - Server-side multi-key round-robin with per-key cooldown after upstream 429s
 *  - Upstream Retry-After header passed through so the client waits the full quota window
 *
 * Client contract (see src/services/geminiService.ts):
 *   POST /api/gemini
 *   body: { model: "gemini-2.0-flash", contents: [...], systemInstruction?, generationConfig?, safetySettings? }
 *   response: passthrough of Google's generateContent JSON (candidates, promptFeedback, ...)
 */

const GEMINI_BASE_URL = 'https://generativelanguage.googleapis.com/v1beta/models';
const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_MAX = 60;
const RATE_LIMIT_BURST = 20;
const MAX_BODY_BYTES = 500_000;

const checkRateLimit = createRateLimiter({
  prefix: 'rl',
  windowMs: RATE_LIMIT_WINDOW_MS,
  max: RATE_LIMIT_MAX,
  burst: RATE_LIMIT_BURST,
});

// Server-side key pool (comma-separated GEMINI_API_KEY). A key that hit an
// upstream 429 goes into cooldown so rotation skips it until it resets.
const keyCooldowns = new Map<string, number>();
let keyIndex = 0;

function getKeys(): string[] {
  return (process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY || '')
    .split(',')
    .map((k) => k.trim())
    .filter((k) => k.length > 0);
}

function pickNextKey(): string | null {
  const keys = getKeys();
  if (keys.length === 0) return null;
  const now = Date.now();
  for (let i = 0; i < keys.length; i++) {
    const key = keys[keyIndex % keys.length];
    keyIndex = (keyIndex + 1) % keys.length;
    const cooldownUntil = keyCooldowns.get(key) || 0;
    if (cooldownUntil <= now) return key;
  }
  // All keys in cooldown — use the next one anyway (client will honor Retry-After).
  return null;
}

function markKeyCooldown(key: string, ms: number): void {
  keyCooldowns.set(key, Date.now() + Math.max(ms || RATE_LIMIT_WINDOW_MS, 0));
}

function parseRetryAfterSeconds(header: string | null | undefined): number {
  if (!header) return RATE_LIMIT_WINDOW_MS / 1000;
  const seconds = Number(header);
  if (Number.isFinite(seconds) && seconds > 0) return seconds;
  const date = Date.parse(header);
  if (Number.isFinite(date)) return Math.max(0, Math.ceil((date - Date.now()) / 1000));
  return RATE_LIMIT_WINDOW_MS / 1000;
}

function getRequestId(req: ExtendedRequest): string {
  const headerId = req.headers['x-request-id'];
  if (typeof headerId === 'string' && headerId.length > 0) return headerId;
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }
  return `req_${Date.now()}_${Math.random().toString(36).slice(2)}`;
}

function isModelAllowed(model: unknown): model is string {
  if (typeof model !== 'string') return false;
  // Restrict to Gemini models — prevents abusing the proxy as a general relay.
  return /^gemini-[a-z0-9._-]+$/i.test(model);
}

function isBodyValid(body: any): body is {
  model: string;
  budgetProfile?: AiBudgetProfile;
  meetings?: number;
  contents: { parts: unknown[] }[];
  systemInstruction?: unknown;
  generationConfig?: unknown;
  safetySettings?: unknown;
} {
  if (!body || typeof body !== 'object' || !validBudget(body)) return false;
  if (!isModelAllowed(body.model)) return false;
  if (!Array.isArray(body.contents) || body.contents.length === 0 || body.contents.length > 50) return false;
  for (const item of body.contents) {
    if (!item || typeof item !== 'object') return false;
    if (!Array.isArray((item as { parts?: unknown }).parts) || ((item as { parts: unknown[] }).parts.length === 0)) return false;
  }
  try {
    if (JSON.stringify(body).length > MAX_BODY_BYTES) return false;
  } catch {
    return false;
  }
  return true;
}

export default async function handler(req: ExtendedRequest, res: ExtendedResponse): Promise<void> {
  const requestId = getRequestId(req);
  res.setHeader('X-Request-Id', requestId);
  res.setHeader('X-AI-Fallback-Available', (process.env.GROQ_API_KEY || process.env.VITE_GROQ_API_KEY) ? 'true' : 'false');

  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  // Security: Authentication check
  const auth = await authenticateRequest(req);
  if (!auth.authorized) {
    res.status(401).json({ error: auth.error || 'Unauthorized', requestId });
    return;
  }

  const body = req.body || {};
  if (!isBodyValid(body)) {
    res.status(400).json({ error: 'Invalid request body or model not allowed', requestId });
    return;
  }

  if (getKeys().length === 0) {
    res.status(500).json({ error: 'GEMINI_API_KEY is not configured' });
    return;
  }

  if (!isOriginAllowed(req, process.env.GEMINI_ALLOWED_ORIGIN)) {
    res.status(403).json({ error: 'Origin not allowed', requestId });
    return;
  }

  const rateLimit = await checkRateLimit(req, auth.userId);

  if (!rateLimit.allowed) {
    const retryAfterSeconds = Math.ceil(rateLimit.retryAfterMs / 1000);
    res.setHeader('Retry-After', String(retryAfterSeconds));
    res.status(429).json({ error: 'Rate limit exceeded', requestId });
    return;
  }

  const apiKey = pickNextKey();
  if (!apiKey) {
    res.status(500).json({ error: 'GEMINI_API_KEY is not configured' });
    return;
  }

  // Forward a sanitized payload — never send the model field or anything else
  // the client injected beyond the whitelisted Gemini body keys.
  const payload: Record<string, unknown> = { contents: body.contents };
  if (body.systemInstruction) payload.systemInstruction = body.systemInstruction;
  const config = geminiConfig(body);
  if (config) payload.generationConfig = config;
  if (body.safetySettings) payload.safetySettings = body.safetySettings;

  const abort = upstreamAbort(req, res);
  try {
    const upstream = await fetch(
      `${GEMINI_BASE_URL}/${body.model}:generateContent?key=${encodeURIComponent(apiKey)}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        signal: abort.signal,
      }
    );

    const text = await upstream.text();
    const retryAfter = upstream.headers.get('retry-after');
    if (retryAfter) res.setHeader('Retry-After', retryAfter);
    if (upstream.status === 429) {
      markKeyCooldown(apiKey, Math.max(retryHint(retryAfter, text), parseRetryAfterSeconds(retryAfter) * 1000));
    }

    res.status(upstream.status);
    res.setHeader('Content-Type', upstream.headers.get('content-type') || 'application/json');
    res.setHeader('X-Proxy-Request-Id', requestId);
    res.send(text);
  } catch {
    res.status(502).json({ error: 'Failed to reach Gemini', requestId });
  } finally {
    abort.dispose();
  }
}
