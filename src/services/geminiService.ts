import { logger } from './logger';
import {
  pickNextGeminiKey,
  getGeminiKeyCount,
  isCircuitAllowed,
  recordCircuitSuccess,
  recordCircuitFailure,
  getCachedResponse,
  setCachedResponse,
  getBackoffDelay,
  isRateLimitError,
  isTransientError,
} from '../utils/aiConfig';

// ─── Environment ──────────────────────────────────────────────────
// Env is read lazily (inside functions) so tests can stub it with vi.stubEnv.

const GEMINI_MODEL = 'gemini-2.0-flash';
const DIRECT_ENDPOINT = 'https://generativelanguage.googleapis.com/v1beta/models';

function getModel(): string {
  return import.meta.env.VITE_GEMINI_MODEL || GEMINI_MODEL;
}

function isDev(): boolean {
  return import.meta.env.DEV === true;
}

/** Dev-only direct-call key (VITE_* values are bundled — never use in production). */
function devApiKey(): string {
  return import.meta.env.VITE_GEMINI_API_KEY || '';
}

/** Proxy URL. Defaults to the same-origin serverless proxy shipped with the app. */
function proxyUrl(): string {
  return import.meta.env.VITE_GEMINI_PROXY_URL || '/api/gemini';
}

/**
 * Endpoint selection:
 *  - Dev without a proxy env but with a dev key → call Google directly (multi-key round-robin).
 *  - Otherwise → serverless proxy (production; keys stay server-side).
 */
function getEndpoint(): string {
  if (isDev() && !import.meta.env.VITE_GEMINI_PROXY_URL && devApiKey()) {
    return DIRECT_ENDPOINT;
  }
  return proxyUrl();
}

function usesDirectEndpoint(): boolean {
  return getEndpoint() === DIRECT_ENDPOINT;
}

// ─── Interfaces ───────────────────────────────────────────────────

export interface GeminiMessage {
  role: 'user' | 'assistant' | 'system';
  content: string | null;
}

export interface GeminiResponse {
  choices: {
    message: GeminiMessage;
  }[];
}

/**
 * 429 that carries the server's Retry-After hint (seconds → ms).
 * The retry loop waits at least this long before the next attempt.
 */
export class GeminiRateLimitError extends Error {
  retryAfterMs: number;
  constructor(message: string, retryAfterMs = 0) {
    super(message);
    this.name = 'GeminiRateLimitError';
    this.retryAfterMs = retryAfterMs;
  }
}

// ─── Constants ────────────────────────────────────────────────────

const MAX_RETRIES = 3;
const BASE_TIMEOUT = 30_000;
/**
 * Max concurrent AI requests. The Modul Ajar page fires several field
 * generations in quick succession; a burst blows through Gemini's per-minute
 * quota instantly. Serializing keeps in-flight requests under the limit.
 */
const MAX_CONCURRENT = 2;

// ─── Concurrency Queue ────────────────────────────────────────────

let activeCount = 0;
const waiters: (() => void)[] = [];

async function runWithConcurrency<T>(fn: () => Promise<T>): Promise<T> {
  if (activeCount >= MAX_CONCURRENT) {
    await new Promise<void>((resolve) => waiters.push(resolve));
  }
  activeCount++;
  try {
    return await fn();
  } finally {
    activeCount--;
    const next = waiters.shift();
    if (next) next();
  }
}

// ─── Retry-After Parsing ──────────────────────────────────────────

function parseRetryAfter(header: string | null | undefined): number {
  if (!header) return 0;
  const seconds = Number(header);
  if (Number.isFinite(seconds) && seconds > 0) return seconds * 1000;
  const date = Date.parse(header);
  if (Number.isFinite(date)) return Math.max(0, date - Date.now());
  return 0;
}

// ─── Main Entry Point ─────────────────────────────────────────────

/**
 * Generates content using Gemini (via serverless proxy, or direct in dev).
 * Includes caching, circuit breaker, exponential backoff, Retry-After
 * honoring, and a concurrency queue.
 */
export async function generateGeminiContent(
  messages: GeminiMessage[]
): Promise<GeminiResponse> {
  const cacheKey = buildCacheKeyForMessages(messages);
  const cached = getCachedResponse<GeminiResponse>(cacheKey);
  if (cached) {
    logger.info('[AI] Cache HIT — returning cached response', 'AI');
    return cached;
  }

  if (usesDirectEndpoint() && getGeminiKeyCount() === 0) {
    throw new Error('Gemini API key tidak ditemukan. Cek VITE_GEMINI_API_KEY di .env');
  }

  if (!isCircuitAllowed('gemini')) {
    throw new Error('Layanan AI sedang dalam masa pemulihan. Silakan tunggu beberapa saat dan coba lagi.');
  }

  try {
    const result = await runWithConcurrency(() => callGeminiWithRetry(messages));
    logger.info('[AI] Gemini success', 'AI');
    recordCircuitSuccess('gemini');
    setCachedResponse(cacheKey, result, 'default');
    return result;
  } catch (err: any) {
    logger.warn(`[AI] Gemini failed: ${err.message}`, 'AI');
    recordCircuitFailure('gemini');
    throw err;
  }
}

// ─── Gemini Implementation ────────────────────────────────────────

async function callGeminiWithRetry(messages: GeminiMessage[]): Promise<GeminiResponse> {
  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      return await callGeminiOnce(messages);
    } catch (err: any) {
      lastError = err;
      const isTransient = isTransientError(err);

      if (!isTransient) {
        // Non-transient error (auth, invalid request, etc.) — don't retry
        throw err;
      }

      if (attempt < MAX_RETRIES) {
        // On 429: wait at least the server's Retry-After (Gemini free tier
        // resets per minute, so retrying after 2s is guaranteed to 429 again).
        const retryAfterMs = err instanceof GeminiRateLimitError ? err.retryAfterMs : 0;
        const backoffMs = getBackoffDelay(attempt, isRateLimitError(err) ? 5000 : 1500);
        const delay = Math.min(Math.max(retryAfterMs, backoffMs), 60_000);
        logger.warn(
          `[Gemini] Attempt ${attempt}/${MAX_RETRIES} failed, retrying in ${Math.round(delay)}ms: ${err.message}`,
          'AI'
        );
        await sleep(delay);
      }
    }
  }

  throw lastError || new Error('Gemini gagal setelah beberapa percobaan.');
}

async function callGeminiOnce(messages: GeminiMessage[]): Promise<GeminiResponse> {
  const endpoint = getEndpoint();

  // Convert generic messages → Gemini contents
  const contents = messages
    .filter(m => m.role !== 'system')
    .map(m => ({
      role: m.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: m.content || '' }],
    }));

  const systemInstruction = messages.find(m => m.role === 'system')?.content;

  const body: Record<string, any> = {
    contents,
    generationConfig: { temperature: 0.7 },
  };
  if (systemInstruction) {
    body.systemInstruction = { parts: [{ text: systemInstruction }] };
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), BASE_TIMEOUT);

  try {
    let url: string;
    let init: RequestInit;

    if (usesDirectEndpoint()) {
      const apiKey = pickNextGeminiKey();
      if (!apiKey) {
        throw new Error('Gemini API key tidak ditemukan.');
      }
      url = `${DIRECT_ENDPOINT}/${getModel()}:generateContent?key=${apiKey}`;
      init = {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
        signal: controller.signal,
      };
    } else {
      // Proxy mode: model goes in the body; the server-side proxy adds the key.
      url = endpoint;
      init = {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ model: getModel(), ...body }),
        signal: controller.signal,
      };
    }

    const response = await fetch(url, init);

    if (!response.ok) {
      const text = await response.text();
      const status = response.status;

      if (status === 429) {
        const retryAfterMs = parseRetryAfter(response.headers.get('retry-after'));
        throw new GeminiRateLimitError(`Rate limit exceeded: Gemini API 429`, retryAfterMs);
      }
      if (status >= 500) {
        throw new Error(`Gemini server error ${status}: ${text}`);
      }
      throw new Error(`Gemini API ${status}: ${text}`);
    }

    const data = await response.json();
    const geminiText = data?.candidates?.[0]?.content?.parts?.[0]?.text || '';

    return {
      choices: [{ message: { role: 'assistant', content: geminiText } }],
    } as GeminiResponse;
  } finally {
    clearTimeout(timeoutId);
  }
}

// ─── JSON Generation ──────────────────────────────────────────────

/**
 * Wrapper for JSON generation commands.
 * Automatically tries to parse JSON and handles markdown cleanup.
 * Now with caching support for identical prompts.
 */
export async function generateGeminiJson<T>(
  prompt: string,
  systemInstruction?: string
): Promise<T> {
  // Check cache first
  const cacheCategory = detectCacheCategory(prompt);
  const cached = getCachedResponse<T>(prompt);
  if (cached) return cached;

  const messages: GeminiMessage[] = [];

  if (systemInstruction) {
    messages.push({ role: 'system', content: systemInstruction });
  }

  // Force JSON in prompt
  const jsonPrompt = `${prompt}\n\nIMPORTANT: Respond ONLY with valid JSON. Do not include markdown formatting like \`\`\`json. The response should be a raw JSON object string.`;

  messages.push({ role: 'user', content: jsonPrompt });

  const response = await generateGeminiContent(messages);
  let content = getAssistantContent(response);

  // Robust JSON extraction:
  // 1. Remove markdown code blocks
  content = content.replace(/```json\s*/g, '').replace(/```\s*/g, '');

  // 2. Find the outer-most JSON structure (Object or Array)
  const firstBrace = content.indexOf('{');
  const firstBracket = content.indexOf('[');

  let start = -1;
  let end = -1;

  // Determine start based on which appears first
  if (firstBrace !== -1 && (firstBracket === -1 || firstBrace < firstBracket)) {
    start = firstBrace;
    end = content.lastIndexOf('}');
  } else if (firstBracket !== -1 && (firstBrace === -1 || firstBracket < firstBrace)) {
    start = firstBracket;
    end = content.lastIndexOf(']');
  }

  if (start !== -1 && end !== -1 && end > start) {
    content = content.substring(start, end + 1);
  }

  // 3. Try parsing
  try {
    const parsed = JSON.parse(content) as T;
    // Cache successful parse
    setCachedResponse(prompt, parsed, cacheCategory);
    return parsed;
  } catch (e: unknown) {
    logger.error('[AI] JSON Parse Error. Content was:', e instanceof Error ? e : 'GeminiJSON', {
      contentPreview: content.substring(0, 500),
    });
    throw new Error('Respon AI tidak valid (JSON corrupt). Silakan coba lagi.');
  }
}

/**
 * Helper to extract the assistant's text content from the response.
 */
export function getAssistantContent(response: GeminiResponse): string {
  return response.choices && response.choices[0]
    ? response.choices[0].message?.content ?? ''
    : '';
}

// ─── Helpers ──────────────────────────────────────────────────────

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Build a simple cache key from messages array.
 */
function buildCacheKeyForMessages(messages: GeminiMessage[]): string {
  return messages
    .map(m => `${m.role}:${(m.content || '').substring(0, 200)}`)
    .join('||');
}

/**
 * Detect cache category based on prompt content.
 */
function detectCacheCategory(prompt: string): 'insight' | 'modulAjar' | 'default' {
  const lower = prompt.toLowerCase();
  if (lower.includes('tujuan pembelajaran') || lower.includes('modul ajar') || lower.includes('skenario pembelajaran')) {
    return 'modulAjar';
  }
  if (lower.includes('insight') || lower.includes('wawasan') || lower.includes('ringkasan')) {
    return 'insight';
  }
  return 'default';
}
