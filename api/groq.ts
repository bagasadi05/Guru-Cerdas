import { validBudget, groqConfig, upstreamAbort, retryHint, type AiBudgetProfile } from './_aiBudget.js';
import { authenticateRequest } from './_auth.js';
import {
  createRateLimiter,
  isOriginAllowed,
  type ExtendedRequest,
  type ExtendedResponse,
} from './_requestGuard.js';

/**
 * Groq serverless proxy — keeps GROQ_API_KEY server-side.
 *
 * Mirrors the security model of api/gemini.ts:
 *  - Origin allowlist (GROQ_ALLOWED_ORIGIN, comma-separated)
 *  - Per-client rate limiting (in-memory, or Upstash Redis)
 *  - Server-side multi-key round-robin with per-key cooldown after upstream 429s
 *
 * Client contract (see src/services/groqService.ts):
 *   POST /api/groq
 *   body: { model, messages, temperature?, max_tokens?, response_format? }
 *   response: passthrough of Groq's Chat Completions JSON
 */

const GROQ_BASE_URL = 'https://api.groq.com/openai/v1/chat/completions';
const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_MAX = 30;
const RATE_LIMIT_BURST = 10;
const MAX_BODY_BYTES = 500_000;

const checkRateLimit = createRateLimiter({
  prefix: 'rl:groq',
  windowMs: RATE_LIMIT_WINDOW_MS,
  max: RATE_LIMIT_MAX,
  burst: RATE_LIMIT_BURST,
});

const keyCooldowns = new Map<string, number>();
let keyIndex = 0;

function getKeys(): string[] {
  return (process.env.GROQ_API_KEY || process.env.VITE_GROQ_API_KEY || '')
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

function isModelAllowed(model: unknown): model is string {
  if (typeof model !== 'string') return false;
  return model === 'openai/gpt-oss-20b' || /^(llama|mixtral|gemma)-[a-z0-9._-]+$/i.test(model);
}

function isBodyValid(body: any): body is {
  model: string;
  budgetProfile?: AiBudgetProfile;
  meetings?: number;
  messages: { role: string; content: string }[];
  temperature?: number;
  max_tokens?: number;
  response_format?: unknown;
} {
  if (!body || typeof body !== 'object' || !validBudget(body)) return false;
  if (!isModelAllowed(body.model)) return false;
  if (!Array.isArray(body.messages) || body.messages.length === 0) return false;
  try {
    if (JSON.stringify(body).length > MAX_BODY_BYTES) return false;
  } catch {
    return false;
  }
  return true;
}

export default async function handler(req: ExtendedRequest, res: ExtendedResponse): Promise<void> {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  // Security: Authentication check
  const auth = await authenticateRequest(req);
  if (!auth.authorized) {
    res.status(401).json({ error: auth.error || 'Unauthorized' });
    return;
  }

  const body = req.body || {};
  if (!isBodyValid(body)) {
    res.status(400).json({ error: 'Invalid request body or model not allowed' });
    return;
  }

  if (getKeys().length === 0) {
    res.status(500).json({ error: 'GROQ_API_KEY is not configured' });
    return;
  }

  if (!isOriginAllowed(req, process.env.GROQ_ALLOWED_ORIGIN)) {
    res.status(403).json({ error: 'Origin not allowed' });
    return;
  }

  const rateLimit = await checkRateLimit(req, auth.userId);

  if (!rateLimit.allowed) {
    res.setHeader('Retry-After', String(Math.ceil(rateLimit.retryAfterMs / 1000)));
    res.status(429).json({ error: 'Rate limit exceeded' });
    return;
  }

  const apiKey = pickNextKey();
  if (!apiKey) {
    const waitMs = Math.max(1000, Math.min(...getKeys().map(key => keyCooldowns.get(key) ?? Date.now())) - Date.now());
    res.setHeader('Retry-After', String(Math.ceil(waitMs / 1000)));
    res.status(429).json({ error: 'Provider keys are cooling down' });
    return;
  }

  const abort = upstreamAbort(req, res);
  try {
    const upstream = await fetch(GROQ_BASE_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      signal: abort.signal,
      body: JSON.stringify({
        model: body.model,
        messages: body.messages,
        temperature: body.temperature ?? 0.7,
        ...groqConfig(body),
      }),
    });

    const text = await upstream.text();
    const retryAfter = upstream.headers.get('retry-after');
    if (retryAfter) res.setHeader('Retry-After', retryAfter);
    if (upstream.status === 429) {
      markKeyCooldown(apiKey, Math.max(retryHint(retryAfter, text), parseRetryAfterSeconds(retryAfter) * 1000));
    }

    res.status(upstream.status);
    res.setHeader('Content-Type', upstream.headers.get('content-type') || 'application/json');
    res.send(text);
  } catch {
    res.status(502).json({ error: 'Failed to reach Groq' });
  } finally {
    abort.dispose();
  }
}
