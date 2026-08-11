import type { GeminiMessage, GeminiResponse, AiTaskType } from './aiProvider';
import type { AiProvider } from './aiProvider';
import { aiRouter } from './aiProvider';
import { logger } from './logger';
import {
  pickNextGroqKey,
  getGroqKeyCount,
  isCircuitAllowed,
  recordCircuitSuccess,
  recordCircuitFailure,
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
  return import.meta.env.DEV === true;
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

  async generateContent(messages: GeminiMessage[], model: string): Promise<GeminiResponse> {
    if (usesDirectEndpoint() && getGroqKeyCount() === 0) {
      throw new Error('Groq API key tidak ditemukan. Cek VITE_GROQ_API_KEY di .env');
    }

    if (!isCircuitAllowed('groq')) {
      throw new Error('Layanan Groq sedang dalam masa pemulihan.');
    }

    try {
      const result = await this.callWithRetry(messages, model);
      recordCircuitSuccess('groq');
      return result;
    } catch (err: any) {
      logger.warn(`[Groq] Failed: ${err.message}`, 'AI');
      recordCircuitFailure('groq');
      throw err;
    }
  }

  private async callWithRetry(messages: GeminiMessage[], model: string): Promise<GeminiResponse> {
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
      try {
        return await this.callOnce(messages, model);
      } catch (err: any) {
        lastError = err;
        const isTransient = isTransientError(err);

        if (!isTransient) {
          throw err;
        }

        if (attempt < MAX_RETRIES) {
          const backoffMs = getBackoffDelay(attempt, isRateLimitError(err) ? 5000 : 1500);
          const delay = Math.min(backoffMs, 60_000);
          logger.warn(
            `[Groq] Attempt ${attempt}/${MAX_RETRIES} failed, retrying in ${Math.round(delay)}ms`,
            'AI'
          );
          await sleep(delay);
        }
      }
    }

    throw lastError || new Error('Groq gagal setelah beberapa percobaan.');
  }

  private async callOnce(messages: GeminiMessage[], model: string): Promise<GeminiResponse> {
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
      max_tokens: 4096,
    };

    if (systemMessage?.content) {
      body.messages.unshift({ role: 'system', content: systemMessage.content });
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), BASE_TIMEOUT);

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
        const status = response.status;

        if (status === 429) {
          const retryAfterMs = parseRetryAfter(response.headers.get('retry-after'));
          throw new GroqRateLimitError(`Groq rate limit: 429`, retryAfterMs);
        }
        if (status >= 500) {
          throw new Error(`Groq server error ${status}: ${text}`);
        }
        throw new Error(`Groq API ${status}: ${text}`);
      }

      const data = await response.json();
      return this.normalizeResponse(data);
    } finally {
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
    let content = data?.choices?.[0]?.message?.content || '';

    // Strip markdown just in case
    content = content.replace(/```json\s*/g, '').replace(/```\s*/g, '');

    const start = content.indexOf('{');
    const end = content.lastIndexOf('}');
    if (start !== -1 && end !== -1 && end > start) {
      content = content.substring(start, end + 1);
    }

    return JSON.parse(content) as T;
  } catch (e: any) {
    if (e instanceof SyntaxError) {
      logger.error('[Groq JSON] Parse error', 'AI');
      throw new Error('Respon AI tidak valid (JSON corrupt).');
    }
    throw e;
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

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function parseRetryAfter(header: string | null | undefined): number {
  if (!header) return 0;
  const seconds = Number(header);
  if (Number.isFinite(seconds) && seconds > 0) return seconds * 1000;
  const date = Date.parse(header);
  if (Number.isFinite(date)) return Math.max(0, date - Date.now());
  return 0;
}

export { getEndpoint, usesDirectEndpoint };
