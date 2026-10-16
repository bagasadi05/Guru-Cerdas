import { AiRequestError, abortableDelay, aiBudget, canRetry, linkAbort, providerError, throwIfAborted, tokenCount, unknownUsage } from '../lib/aiRequestPolicy';
import type { GeminiMessage, GeminiResponse, AiTaskType } from './aiProvider';
import type { AiProvider, AiRequestTimeout } from './aiProvider';
import { aiRouter } from './aiProvider';
import { logger } from './logger';
import { supabase } from './supabase';
import { robustParseJson } from '../utils/jsonUtils';
import {
  pickNextGroqKey,
  getGroqKeyCount,
  isCircuitAllowed,
  getBackoffDelay,
  isRateLimitError,
  isTransientError,
} from '../utils/aiConfig';

// =============================================================================
// CONSTANTS
// =============================================================================

const GROQ_ENDPOINT = 'https://api.groq.com/openai/v1/chat/completions';
const MAX_RETRIES = 3;
const BASE_TIMEOUT = 30_000;

// =============================================================================
// ENVIRONMENT
// =============================================================================

function isDev(): boolean {
  // Hanya izinkan jalur direct (API key di client) saat development lokal.
  // Build production TIDAK PERNAH boleh memakai direct endpoint — key harus
  // tetap di server (proxy). Guard ini mencegah VITE_GROQ_API_KEY bocor
  // ke bundle yang di-deploy.
  return import.meta.env.DEV === true && !import.meta.env.PROD;
}

function devApiKey(): string {
  return import.meta.env.VITE_GROQ_API_KEY || '';
}

function proxyUrl(): string {
  return import.meta.env.VITE_GROQ_PROXY_URL || '/api/groq';
}

function getEndpoint(): string {
  if (isDev() && !import.meta.env.VITE_GROQ_PROXY_URL && devApiKey()) {
    return GROQ_ENDPOINT;
  }
  return proxyUrl();
}

function usesDirectEndpoint(): boolean {
  return getEndpoint() === GROQ_ENDPOINT;
}

// =============================================================================
// GROQ ADAPTER
// =============================================================================

export class GroqProvider implements AiProvider {
  readonly name = 'groq' as const;
  available(): boolean { return !isDev() || !!import.meta.env.VITE_GROQ_PROXY_URL || !!devApiKey(); }

  async generateContent(messages: GeminiMessage[], model: string, options: AiRequestTimeout = {}): Promise<GeminiResponse> {
    if (isDev() && !import.meta.env.VITE_GROQ_PROXY_URL && !devApiKey()) {
      throw new Error('Groq API key tidak dikonfigurasi. Tambahkan VITE_GROQ_API_KEY di .env.');
    }

    if (usesDirectEndpoint() && getGroqKeyCount() === 0) {
      throw new Error('Groq API key tidak ditemukan. Cek VITE_GROQ_API_KEY di .env');
    }

    if (!isCircuitAllowed('groq')) {
      throw new Error('Layanan Groq sedang dalam masa pemulihan.');
    }

    try {
      return await this.callWithRetry(messages, model, options);
    } catch (err: any) {
      logger.warn(`[Groq] Failed: ${err.message}`, 'AI');
      throw err;
    }
  }

  private async callWithRetry(messages: GeminiMessage[], model: string, options: AiRequestTimeout = {}): Promise<GeminiResponse> {
    const maxAttempts = options.maxAttempts ?? (options.budgetProfile ? 1 : MAX_RETRIES);
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      throwIfAborted(options.signal);
      const started = Date.now();
      try {
        const result = await this.callOnce(messages, model, options);
        options.onAttempt?.({ provider: 'groq', model: result.metadata?.model ?? model, latencyMs: Date.now() - started, status: 'completed', usage: result.metadata?.usage ?? unknownUsage() });
        return result;
      } catch (err: any) {
        lastError = err;
        options.onAttempt?.({ provider: 'groq', model, latencyMs: Date.now() - started, status: options.signal?.aborted ? 'cancelled' : 'failed', usage: err.usage ?? unknownUsage(), errorCategory: err instanceof AiRequestError ? err.category : undefined });
        throwIfAborted(options.signal);
        const isTransient = options.budgetProfile ? canRetry(err) && (err instanceof AiRequestError || isTransientError(err)) : isTransientError(err);

        if (!isTransient) {
          throw err;
        }

        if (attempt < maxAttempts) {
          const backoffMs = getBackoffDelay(attempt, isRateLimitError(err) ? 5000 : 1500);
          const delay = options.budgetProfile ? Math.max(backoffMs, err.retryAfterMs ?? 0) : Math.min(backoffMs, 60_000);
          logger.warn(
            `[Groq] Attempt ${attempt}/${maxAttempts} failed, retrying in ${Math.round(delay)}ms`,
            'AI'
          );
          await abortableDelay(delay, options.signal);
        }
      }
    }

    throw lastError || new Error('Groq gagal setelah beberapa percobaan.');
  }

  private async callOnce(messages: GeminiMessage[], model: string, options: AiRequestTimeout = {}): Promise<GeminiResponse> {
    const timeoutMs = options.timeoutMs ?? BASE_TIMEOUT;
    const systemMessage = messages.find(m => m.role === 'system');
    const chatMessages = messages
      .filter(m => m.role !== 'system')
      .map(m => ({
        role: m.role as 'user' | 'assistant',
        content: m.content || '',
      }));

    const body: Record<string, any> = {
      model,
      messages: chatMessages,
      temperature: 0.7,
      ...(options.budgetProfile ? {
        max_completion_tokens: aiBudget(options.budgetProfile, options.meetings).groqOutput,
        response_format: { type: 'json_object' },
        ...(model.startsWith('openai/gpt-oss') ? { reasoning_effort: 'low', include_reasoning: false } : {}),
      } : { max_tokens: 4096 }),
    };

    if (systemMessage?.content) {
      body.messages.unshift({ role: 'system', content: systemMessage.content });
    }

    const controller = new AbortController();
    const unlink = linkAbort(options.signal, controller);
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    try {
      let url: string;
      let init: RequestInit;

      if (usesDirectEndpoint()) {
        const apiKey = pickNextGroqKey();
        if (!apiKey) {
          throw new Error('Groq API key tidak ditemukan.');
        }
        url = GROQ_ENDPOINT;
        init = {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${apiKey}`,
          },
          body: JSON.stringify(body),
          signal: controller.signal,
        };
      } else {
        url = getEndpoint();
        let token: string | undefined;
        try {
          const session = (await supabase.auth.getSession()).data.session;
          token = session?.access_token;
        } catch {
          // ignore if session fetch fails (e.g. offline/mock)
        }
        init = {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body: JSON.stringify({ ...body, ...(options.budgetProfile ? { budgetProfile: options.budgetProfile, meetings: options.meetings } : {}) }),
          signal: controller.signal,
        };
      }

      const response = await fetch(url, init);

      if (!response.ok) {
        const text = await response.text();
        const status = response.status;

        if (options.budgetProfile) throw providerError(status, text, response.headers.get('retry-after'));
        if (status === 429) {
          const retryAfterMs = parseRetryAfter(response.headers.get('retry-after'));
          throw new GroqRateLimitError(`Groq rate limit: 429`, retryAfterMs);
        }

        let parsedDetail = text;
        try {
          const jsonErr = JSON.parse(text);
          if (jsonErr && typeof jsonErr === 'object') {
            parsedDetail = jsonErr.error || jsonErr.message || text;
          }
        } catch {
          // ignore json parse error
        }

        if (status >= 500) {
          throw new Error(`Groq server error ${status}: ${parsedDetail}`);
        }
        throw new Error(`Groq API ${status}: ${parsedDetail}`);
      }

      const data = await response.json();
      const result = this.normalizeResponse(data);
      const usage = { input: tokenCount(data?.usage?.prompt_tokens), output: tokenCount(data?.usage?.completion_tokens), reasoning: tokenCount(data?.usage?.completion_tokens_details?.reasoning_tokens), total: tokenCount(data?.usage?.total_tokens) };
      if (options.budgetProfile && data?.choices?.[0]?.finish_reason === 'length') {
        const error = new AiRequestError('Jawaban AI terpotong oleh batas output. Kurangi cakupan permintaan.', 'truncated'); Object.assign(error, { usage }); throw error;
      }
      if (options.budgetProfile) result.metadata = { provider: 'groq', model: data.model || model, usage, finishReason: data?.choices?.[0]?.finish_reason };
      return result;
    } catch (error) {
      throwIfAborted(options.signal);
      if (options.budgetProfile && controller.signal.aborted) throw new AiRequestError('Waktu tunggu layanan AI habis.', 'network');
      throw error;
    } finally {
      unlink();
      clearTimeout(timeoutId);
    }
  }

  private normalizeResponse(groqData: any): GeminiResponse {
    const content = groqData?.choices?.[0]?.message?.content || '';
    return {
      choices: [{ message: { role: 'assistant', content } }],
    };
  }
}

// =============================================================================
// JSON HELPER
// =============================================================================

/**
 * Generate structured JSON using Groq's native JSON mode.
 * Groq supports response_format: { type: "json_object" } which is more
 * reliable than Gemini's prompt-based JSON enforcement.
 */
export async function generateGroqJson<T>(
  prompt: string,
  systemInstruction?: string,
  taskType: AiTaskType = 'general',
): Promise<T> {
  const model = aiRouter.getFallbackModel(taskType);
  const endpoint = getEndpoint();

  const body: Record<string, any> = {
    model,
    messages: [] as { role: string; content: string }[],
    temperature: 0.1,
    max_tokens: 4096,
    response_format: { type: 'json_object' },
  };

  if (systemInstruction) {
    body.messages.push({ role: 'system', content: systemInstruction });
  }

  const jsonPrompt = `${prompt}\n\nRespond ONLY with a valid JSON object.`;
  body.messages.push({ role: 'user', content: jsonPrompt });

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), BASE_TIMEOUT);

  try {
    let url: string;
    let init: RequestInit;

    if (usesDirectEndpoint()) {
      const apiKey = pickNextGroqKey();
      if (!apiKey) throw new Error('Groq API key tidak ditemukan.');
      url = GROQ_ENDPOINT;
      init = {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify(body),
        signal: controller.signal,
      };
    } else {
      url = endpoint;
      init = {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
        signal: controller.signal,
      };
    }

    const response = await fetch(url, init);

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`Groq JSON ${response.status}: ${text}`);
    }

    const data = await response.json();
    const content = data?.choices?.[0]?.message?.content || '';

    try {
      return robustParseJson<T>(content);
    } catch {
      logger.error('[Groq JSON] Parse error', 'AI');
      throw new Error('Respon AI tidak valid (JSON corrupt).');
    }
  } finally {
    clearTimeout(timeoutId);
  }
}

// =============================================================================
// ERROR CLASS
// =============================================================================

export class GroqRateLimitError extends Error {
  retryAfterMs: number;
  constructor(message: string, retryAfterMs = 0) {
    super(message);
    this.name = 'GroqRateLimitError';
    this.retryAfterMs = retryAfterMs;
  }
}

// =============================================================================
// INITIALIZATION
// =============================================================================

let initialized = false;

export function initGroqProvider(): void {
  if (initialized) return;
  aiRouter.register(new GroqProvider());
  initialized = true;
  logger.info('[AI] Groq provider registered', 'AI');
}

// =============================================================================
// HELPERS
// =============================================================================


function parseRetryAfter(header: string | null | undefined): number {
  if (!header) return 0;
  const seconds = Number(header);
  if (Number.isFinite(seconds) && seconds > 0) return seconds * 1000;
  const date = Date.parse(header);
  if (Number.isFinite(date)) return Math.max(0, date - Date.now());
  return 0;
}

export { getEndpoint, usesDirectEndpoint };
