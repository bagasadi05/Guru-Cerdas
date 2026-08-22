import { logger } from './logger';
import {
  pickNextGeminiKey,
  getGeminiKeyCount,
  isCircuitAllowed,
  getCachedResponse,
  setCachedResponse,
  getBackoffDelay,
  isRateLimitError,
  isTransientError,
} from '../utils/aiConfig';
import { robustParseJson } from '../utils/jsonUtils';
import {
  aiRouter,
  type AiTaskType,
  type AiProvider,
  type GeminiMessage,
  type GeminiResponse,
} from './aiProvider';
import { initGroqProvider } from './groqService';

// ─── Environment ──────────────────────────────────────────────────
// Env is read lazily (inside functions) so tests can stub it with vi.stubEnv.

const DIRECT_ENDPOINT = 'https://generativelanguage.googleapis.com/v1beta/models';

function isDev(): boolean {
  // Hanya izinkan jalur direct (API key di client) saat development lokal.
  // Build production TIDAK PERNAH boleh memakai direct endpoint — key harus
  // tetap di server (proxy). Guard ini mencegah VITE_GEMINI_API_KEY bocor
  // ke bundle yang di-deploy.
  return import.meta.env.DEV === true && !import.meta.env.PROD;
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

// Types re-exported from aiProvider for backward compatibility
export type { GeminiMessage, GeminiResponse } from './aiProvider';

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
 * Generates content using the AI provider system (Gemini primary, Groq fallback).
 * Includes caching, circuit breaker, exponential backoff, and a concurrency queue.
 * 
 * @param messages - Chat messages array with role/content
 * @param taskType - Task classification for smart routing (default: 'general')
 */
export async function generateGeminiContent(
  messages: GeminiMessage[],
  taskType: AiTaskType = 'general'
): Promise<GeminiResponse> {
  // Provider init happens eagerly; cache layer doesn't depend on Groq
  const cacheKey = buildCacheKeyForMessages(messages);
  const cached = getCachedResponse<GeminiResponse>(cacheKey, `content:${taskType}`);
  if (cached) {
    logger.info('[AI] Cache HIT — returning cached response', 'AI');
    return cached;
  }

  if (usesDirectEndpoint() && getGeminiKeyCount() === 0) {
    throw new Error('Gemini API key tidak ditemukan. Cek VITE_GEMINI_API_KEY di .env');
  }

  try {
    const result = await runWithConcurrency(() =>
      aiRouter.generateContent(taskType, messages)
    );
    logger.info('[AI] Generation success', 'AI');
    setCachedResponse(cacheKey, result, 'default', `content:${taskType}`);
    return result;
  } catch (err: any) {
    logger.warn(`[AI] Generation failed: ${err.message}`, 'AI');
    throw err;
  }
}

// ─── Gemini Adapter (AiProvider implementation) ────────────────────

/** Gemini provider directly via Google API. Registered as 'gemini' in aiRouter. */
export class GeminiProvider implements AiProvider {
  readonly name = 'gemini' as const;

  async generateContent(messages: GeminiMessage[], model: string): Promise<GeminiResponse> {
    if (usesDirectEndpoint() && getGeminiKeyCount() === 0) {
      throw new Error('Gemini API key tidak ditemukan.');
    }

    if (!isCircuitAllowed('gemini')) {
      throw new Error('Layanan Gemini sedang dalam masa pemulihan.');
    }

    return this.callWithRetry(messages, model);
  }

  private async callWithRetry(messages: GeminiMessage[], model: string): Promise<GeminiResponse> {
    let lastError: Error | null = null;
    const defaultEnvModel = (typeof import.meta !== 'undefined' && import.meta.env?.VITE_GEMINI_MODEL) || 'gemini-1.5-flash';
    const candidateModels = [
      model || defaultEnvModel,
      'gemini-1.5-flash',
      'gemini-2.0-flash',
      'gemini-1.5-pro',
      'gemini-1.5-flash-latest'
    ].filter((v, idx, arr) => arr.indexOf(v) === idx);

    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
      const currentModel = candidateModels[(attempt - 1) % candidateModels.length];
      try {
        return await this.callOnce(messages, currentModel);
      } catch (err: any) {
        lastError = err;
        const isTransient = isTransientError(err);

        if (!isTransient) {
          throw err;
        }

        if (attempt < MAX_RETRIES) {
          const retryAfterMs = err instanceof GeminiRateLimitError ? err.retryAfterMs : 0;
          const backoffMs = getBackoffDelay(attempt, isRateLimitError(err) ? 3000 : 1000);
          const delay = Math.min(Math.max(retryAfterMs, backoffMs), 10_000);
          logger.warn(
            `[Gemini] Attempt ${attempt}/${MAX_RETRIES} with ${currentModel} failed, retrying in ${Math.round(delay)}ms: ${err.message}`,
            'AI'
          );
          await sleep(delay);
        }
      }
    }

    throw lastError || new Error('Gemini gagal setelah beberapa percobaan.');
  }

  private async callOnce(messages: GeminiMessage[], model: string): Promise<GeminiResponse> {
    const endpoint = getEndpoint();

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
        url = `${DIRECT_ENDPOINT}/${model}:generateContent?key=${apiKey}`;
        init = {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
          signal: controller.signal,
        };
      } else {
        url = endpoint;
        init = {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ model, ...body }),
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
}

// ─── Legacy: old function aliases (removed — replaced by class above) ──
// callGeminiWithRetry and callGeminiOnce moved into GeminiProvider class.

// ─── Provider Initialization ───────────────────────────────────────

// Register Gemini eagerly — Groq follows on module load
aiRouter.register(new GeminiProvider());

// Init Groq lazily to avoid circular dep issue during module evaluation
setTimeout(() => {
  try {
    initGroqProvider();
  } catch {
    logger.info('[AI] Groq not available, Gemini standalone', 'AI');
  }
}, 0);

// ─── JSON Generation ──────────────────────────────────────────────

/**
 * Wrapper for JSON generation commands.
 * Automatically tries to parse JSON and handles markdown cleanup.
 * Now supports multi-provider routing via taskType parameter.
 */
export async function generateGeminiJson<T>(
  prompt: string,
  systemInstruction?: string,
  taskType: AiTaskType = 'general'
): Promise<T> {
  // Check cache first — namespace per taskType agar prompt yang sama di
  // konteks berbeda (modul-ajar vs insight) tidak saling menimpa.
  const cacheCategory = detectCacheCategory(prompt);
  const cached = getCachedResponse<T>(prompt, `json:${taskType}`);
  if (cached) return cached;

  const messages: GeminiMessage[] = [];

  if (systemInstruction) {
    messages.push({ role: 'system', content: systemInstruction });
  }

  // Force JSON in prompt
  const jsonPrompt = `${prompt}\n\nIMPORTANT: Respond ONLY with valid JSON. Do not include markdown formatting like \`\`\`json. The response should be a raw JSON object string.`;

  messages.push({ role: 'user', content: jsonPrompt });

  const response = await generateGeminiContent(messages, taskType);
  const content = getAssistantContent(response);

  // Parse using multi-stage robust JSON recovery
  try {
    const parsed = robustParseJson<T>(content);
    // Cache successful parse
    setCachedResponse(prompt, parsed, cacheCategory, `json:${taskType}`);
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
