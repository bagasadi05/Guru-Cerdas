import { logger } from './logger';
import {
  pickNextGeminiKey,
  pickNextOpenRouterKey,
  getGeminiKeyCount,
  getOpenRouterKeyCount,
  isCircuitAllowed,
  recordCircuitSuccess,
  recordCircuitFailure,
  getCachedResponse,
  setCachedResponse,
  getBackoffDelay,
  isRateLimitError,
  isTransientError,
  getRateLimitMessage,
} from '../utils/aiConfig';

// ─── Environment ──────────────────────────────────────────────────

const GEMINI_MODEL = import.meta.env.VITE_GEMINI_MODEL || 'gemini-2.0-flash';
const OPENROUTER_PROXY_URL = import.meta.env.VITE_OPENROUTER_PROXY_URL || '';
const DEV_API_KEY = import.meta.env.VITE_OPENROUTER_API_KEY || '';
const IS_DEV = import.meta.env.DEV === true;
const OPENROUTER_DIRECT_URL = 'https://openrouter.ai/api/v1/chat/completions';
const DEFAULT_PROXY = '/api/openrouter';
const GEMINI_ENDPOINT = 'https://generativelanguage.googleapis.com/v1beta/models';

const CUSTOM_MODEL = import.meta.env.VITE_AI_MODEL || '';
const FALLBACK_MODELS = CUSTOM_MODEL
  ? [CUSTOM_MODEL]
  : [
      'auto',
      'openai/gpt-4o-mini',
      'google/gemini-2.0-flash-001',
    ];

// ─── Interfaces ───────────────────────────────────────────────────

export interface OpenRouterMessage {
  role: 'user' | 'assistant' | 'system';
  content: string | null;
  reasoning_details?: unknown;
}

export interface OpenRouterResponse {
  choices: {
    message: OpenRouterMessage;
  }[];
}

// ─── Constants ────────────────────────────────────────────────────

const MAX_RETRIES = 3;
const BASE_TIMEOUT = 30_000;

// ─── Main Entry Point ─────────────────────────────────────────────

/**
 * Generates content — tries Gemini first (with multi-key rotation), falls back to OpenRouter.
 * Includes caching, circuit breaker, and exponential backoff.
 */
export async function generateOpenRouterContent(
  messages: OpenRouterMessage[],
  useReasoning: boolean = true
): Promise<OpenRouterResponse> {
  const cacheKey = buildCacheKeyForMessages(messages);
  const cached = getCachedResponse<OpenRouterResponse>(cacheKey, 'default');
  if (cached) {
    logger.info('[AI] Cache HIT — returning cached response', 'AI');
    return cached;
  }

  // 1. Try Gemini (with multi-key round-robin)
  const geminiKeyCount = getGeminiKeyCount();
  if (geminiKeyCount > 0 && isCircuitAllowed('gemini')) {
    try {
      const result = await callGeminiWithRetry(messages);
      logger.info(`[AI] Gemini success (${geminiKeyCount} key(s) available)`, 'AI');
      recordCircuitSuccess('gemini');
      setCachedResponse(cacheKey, result, 'default');
      return result;
    } catch (err: any) {
      logger.warn(`[AI] Gemini failed: ${err.message}`, 'AI');
      recordCircuitFailure('gemini');
      // Fall through to OpenRouter
    }
  } else if (geminiKeyCount === 0) {
    logger.info('[AI] Gemini not configured, skipping to OpenRouter', 'AI');
  } else {
    logger.info('[AI] Gemini circuit is OPEN, skipping to OpenRouter', 'AI');
  }

  // 2. Fallback: OpenRouter (with multi-key rotation if in dev)
  if (!isCircuitAllowed('openrouter')) {
    throw new Error('Layanan AI sedang dalam masa pemulihan. Silakan tunggu 30 detik dan coba lagi.');
  }

  try {
    const result = await callOpenRouterWithRetry(messages, useReasoning);
    recordCircuitSuccess('openrouter');
    setCachedResponse(cacheKey, result, 'default');
    return result;
  } catch (err: any) {
    recordCircuitFailure('openrouter');
    throw err;
  }
}

// ─── Gemini Implementation ────────────────────────────────────────

async function callGeminiWithRetry(messages: OpenRouterMessage[]): Promise<OpenRouterResponse> {
  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    const geminiKey = pickNextGeminiKey();
    if (!geminiKey) {
      throw new Error('Gemini API key tidak ditemukan. Cek VITE_GEMINI_API_KEY di .env');
    }

    try {
      return await callGeminiOnce(messages, geminiKey);
    } catch (err: any) {
      lastError = err;
      const isTransient = isTransientError(err);

      if (!isTransient) {
        // Non-transient error (auth, invalid request, etc.) — don't retry
        throw err;
      }

      if (attempt < MAX_RETRIES) {
        const delay = getBackoffDelay(attempt, isRateLimitError(err) ? 2000 : 1000);
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

async function callGeminiOnce(
  messages: OpenRouterMessage[],
  apiKey: string
): Promise<OpenRouterResponse> {
  const url = `${GEMINI_ENDPOINT}/${GEMINI_MODEL}:generateContent?key=${apiKey}`;

  // Convert OpenRouter messages → Gemini contents
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
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: controller.signal,
    });

    if (!response.ok) {
      const text = await response.text();
      const status = response.status;

      if (status === 429) {
        throw new Error(`Rate limit exceeded: Gemini API 429`);
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
    } as OpenRouterResponse;
  } finally {
    clearTimeout(timeoutId);
  }
}

// ─── OpenRouter Implementation ────────────────────────────────────

async function callOpenRouterWithRetry(
  messages: OpenRouterMessage[],
  useReasoning: boolean
): Promise<OpenRouterResponse> {
  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      return await callOpenRouterOnce(messages, useReasoning);
    } catch (err: any) {
      lastError = err;
      const isTransient = isTransientError(err);

      if (!isTransient) {
        throw err;
      }

      if (attempt < MAX_RETRIES) {
        const delay = getBackoffDelay(attempt, isRateLimitError(err) ? 3000 : 1500);
        logger.warn(
          `[OpenRouter] Attempt ${attempt}/${MAX_RETRIES} failed, retrying in ${Math.round(delay)}ms: ${err.message}`,
          'AI'
        );
        await sleep(delay);
      }
    }
  }

  throw lastError || new Error('OpenRouter gagal setelah beberapa percobaan.');
}

async function callOpenRouterOnce(
  messages: OpenRouterMessage[],
  useReasoning: boolean
): Promise<OpenRouterResponse> {
  if (IS_DEV && !DEV_API_KEY && !OPENROUTER_PROXY_URL) {
    throw new Error("Set VITE_OPENROUTER_API_KEY di .env untuk development, atau VITE_OPENROUTER_PROXY_URL untuk production.");
  }

  const endpoint = OPENROUTER_PROXY_URL || (IS_DEV && DEV_API_KEY ? OPENROUTER_DIRECT_URL : DEFAULT_PROXY);

  // Build auth headers — if multiple dev keys available, rotate
  const authHeaders: Record<string, string> = {};
  if (DEV_API_KEY) {
    const devKey = pickNextOpenRouterKey();
    if (devKey) {
      authHeaders['Authorization'] = `Bearer ${devKey}`;
    }
  }

  let lastError: Error | null = null;

  for (const model of FALLBACK_MODELS) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), BASE_TIMEOUT + 5000);

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          ...authHeaders,
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify({
          model: model,
          messages: messages,
          ...(useReasoning ? { reasoning: { enabled: true } } : {}),
          temperature: 0.7,
        }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (response.status === 429) {
        const errorText = await response.text();
        logger.warn(`[OpenRouter] Model ${model} rate limited (429).`, 'AI', { errorText });
        lastError = new Error(`Rate limit exceeded for ${model}`);
        // Short delay before trying next model
        await sleep(1500);
        continue;
      }

      if (!response.ok) {
        const errorText = await response.text();
        if (response.status >= 500) {
          logger.warn(`[OpenRouter] Model ${model} 5xx.`, 'AI');
          lastError = new Error(`Server error ${response.status} from ${model}`);
          await sleep(1000);
          continue;
        }
        throw new Error(`OpenRouter Error (${model}): ${response.status} - ${errorText}`);
      }

      return await response.json();
    } catch (error: unknown) {
      logger.warn(`[OpenRouter] Failed with model ${model}:`, 'AI', error);
      lastError = error instanceof Error ? error : new Error(String(error));
      if (lastError.name === 'AbortError' || lastError.message.includes('fetch')) {
        continue;
      }
      // If non-retryable error, don't try other models
      if (!isTransientError(error)) {
        throw lastError;
      }
    }
  }

  logger.error('[OpenRouter] All models failed.', lastError || 'OpenRouter', lastError);
  throw new Error('Layanan AI sedang sibuk atau tidak tersedia. Silakan coba beberapa saat lagi.');
}

// ─── JSON Generation ──────────────────────────────────────────────

/**
 * Wrapper for JSON generation commands.
 * Automatically tries to parse JSON and handles markdown cleanup.
 * Now with caching support for identical prompts.
 */
export async function generateOpenRouterJson<T>(
  prompt: string,
  systemInstruction?: string
): Promise<T> {
  // Check cache first
  const cacheCategory = detectCacheCategory(prompt);
  const cached = getCachedResponse<T>(prompt, cacheCategory);
  if (cached) return cached;

  const messages: OpenRouterMessage[] = [];

  if (systemInstruction) {
    messages.push({ role: 'system', content: systemInstruction });
  }

  // Force JSON in prompt for models that don't support response_format: json_object strictly
  const jsonPrompt = `${prompt}\n\nIMPORTANT: Respond ONLY with valid JSON. Do not include markdown formatting like \`\`\`json. The response should be a raw JSON object string.`;

  messages.push({ role: 'user', content: jsonPrompt });

  const response = await generateOpenRouterContent(messages, false);
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
    logger.error('[AI] JSON Parse Error. Content was:', e instanceof Error ? e : 'OpenRouterJSON', {
      contentPreview: content.substring(0, 500),
    });
    throw new Error('Respon AI tidak valid (JSON corrupt). Silakan coba lagi.');
  }
}

/**
 * Helper to extract the assistant's text content from the response.
 */
export function getAssistantContent(response: OpenRouterResponse): string {
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
function buildCacheKeyForMessages(messages: OpenRouterMessage[]): string {
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
