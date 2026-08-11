/**
 * AI Configuration Utility
 *
 * Mengelola multiple API keys, caching, circuit breaker state,
 * dan konfigurasi AI secara terpusat.
 */

import { logger } from '../services/logger';

// ─── Multiple Key Support ─────────────────────────────────────────

/**
 * Memilih satu key secara acak dari daftar comma-separated keys.
 * Strategi random dipilih untuk mendistribusikan beban secara merata.
 */
export function pickRandomKey(keysEnv: string): string[] {
  return keysEnv
    .split(',')
    .map(k => k.trim())
    .filter(k => k.length > 0);
}

let geminiKeyIndex = 0;

/**
 * Round-robin key selection — lebih adil daripada random untuk
 * penggunaan jangka panjang, karena setiap key mendapat giliran yang sama.
 */
export function pickNextGeminiKey(): string {
  const keys = pickRandomKey(import.meta.env.VITE_GEMINI_API_KEY || '');
  if (keys.length === 0) return '';
  const key = keys[geminiKeyIndex % keys.length];
  geminiKeyIndex = (geminiKeyIndex + 1) % keys.length;
  return key;
}

export function getGeminiKeyCount(): number {
  return pickRandomKey(import.meta.env.VITE_GEMINI_API_KEY || '').length;
}

// ─── Groq Key Support ────────────────────────────────────────────

let groqKeyIndex = 0;

export function pickNextGroqKey(): string {
  const keys = pickRandomKey(import.meta.env.VITE_GROQ_API_KEY || '');
  if (keys.length === 0) return '';
  const key = keys[groqKeyIndex % keys.length];
  groqKeyIndex = (groqKeyIndex + 1) % keys.length;
  return key;
}

export function getGroqKeyCount(): number {
  return pickRandomKey(import.meta.env.VITE_GROQ_API_KEY || '').length;
}

// ─── Circuit Breaker ──────────────────────────────────────────────

interface CircuitState {
  failures: number;
  lastFailureTime: number;
  isOpen: boolean;
  openedAt: number;
}

const circuitStates = new Map<string, CircuitState>();

const CIRCUIT_CONFIG = {
  /** Jumlah gagal beruntun sebelum circuit terbuka */
  failureThreshold: 3,
  /** Durasi circuit terbuka (ms) sebelum dicoba lagi */
  cooldownMs: 30_000,
  /** Reset hitungan setelah sukses */
  successResetThreshold: 2,
};

/**
 * Cek apakah circuit breaker mengizinkan request ke provider ini.
 */
export function isCircuitAllowed(provider: string): boolean {
  const state = circuitStates.get(provider);
  if (!state) return true;

  if (state.isOpen) {
    const elapsed = Date.now() - state.openedAt;
    if (elapsed >= CIRCUIT_CONFIG.cooldownMs) {
      // Half-open: allow trial request
      logger.info(`[CircuitBreaker] ${provider} half-open, allowing trial`, 'AI');
      return true;
    }
    return false;
  }

  return true;
}

/**
 * Catat keberhasilan — reset hitungan gagal.
 */
export function recordCircuitSuccess(provider: string): void {
  const state = circuitStates.get(provider);
  if (state) {
    state.failures = Math.max(0, state.failures - 1);
    if (state.failures === 0) {
      state.isOpen = false;
      state.openedAt = 0;
    }
  }
}

/**
 * Catat kegagalan — buka circuit jika threshold terlampaui.
 */
export function recordCircuitFailure(provider: string): void {
  const now = Date.now();
  let state = circuitStates.get(provider);

  if (!state) {
    state = { failures: 0, lastFailureTime: now, isOpen: false, openedAt: 0 };
    circuitStates.set(provider, state);
  }

  state.failures++;
  state.lastFailureTime = now;

  if (state.failures >= CIRCUIT_CONFIG.failureThreshold) {
    state.isOpen = true;
    state.openedAt = now;
    logger.warn(
      `[CircuitBreaker] ${provider} circuit OPEN after ${state.failures} failures (cooldown: ${CIRCUIT_CONFIG.cooldownMs}ms)`,
      'AI'
    );
  }
}

/**
 * Reset semua circuit breaker (berguna saat testing atau manual reset).
 */
export function resetCircuitBreakers(): void {
  circuitStates.clear();
  geminiKeyIndex = 0;
  groqKeyIndex = 0;
}

// ─── Response Cache ───────────────────────────────────────────────

interface CacheEntry {
  data: unknown;
  expiresAt: number;
}

const responseCache = new Map<string, CacheEntry>();

const CACHE_TTL = {
  /** Cache untuk insight dashboard (bisa lebih lama) */
  insight: 5 * 60 * 1000, // 5 menit
  /** Cache untuk modul ajar (1 jam) */
  modulAjar: 60 * 60 * 1000,
  /** Default cache (2 menit) */
  default: 2 * 60 * 1000,
};

type CacheCategory = keyof typeof CACHE_TTL;

/**
 * Generate cache key dari prompt.
 */
export function buildCacheKey(prompt: string): string {
  // Hash sederhana — cukup untuk mencegah duplikasi prompt identik
  let hash = 0;
  for (let i = 0; i < prompt.length; i++) {
    const char = prompt.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash |= 0; // Convert to 32bit integer
  }
  return `ai_cache_${hash}`;
}

/**
 * Coba ambil dari cache. Return undefined jika miss atau expired.
 */
export function getCachedResponse<T>(prompt: string): T | undefined {
  const key = buildCacheKey(prompt);
  const entry = responseCache.get(key);

  if (!entry) return undefined;
  if (Date.now() > entry.expiresAt) {
    responseCache.delete(key);
    return undefined;
  }

  return entry.data as T;
}

/**
 * Simpan response ke cache.
 */
export function setCachedResponse<T>(
  prompt: string,
  data: T,
  category: CacheCategory = 'default'
): void {
  const key = buildCacheKey(prompt);
  const ttl = CACHE_TTL[category];

  responseCache.set(key, {
    data,
    expiresAt: Date.now() + ttl,
  });

  // Prevent memory leak: hapus entry tertua jika cache terlalu besar
  if (responseCache.size > 200) {
    const oldestKey = responseCache.keys().next().value;
    if (oldestKey) responseCache.delete(oldestKey);
  }
}

/**
 * Hapus semua cache (berguna saat logout atau manual refresh).
 */
export function clearAiCache(): void {
  responseCache.clear();
}

// ─── Exponential Backoff ──────────────────────────────────────────

/**
 * Hitung delay dengan exponential backoff + jitter.
 *
 * @param attempt Mulai dari 1
 * @param baseMs Base delay (default 1000ms)
 * @returns Delay dalam ms
 */
export function getBackoffDelay(attempt: number, baseMs: number = 1000): number {
  const exponential = baseMs * Math.pow(2, attempt - 1);
  // Jitter: ±25% dari nilai exponential
  const jitter = exponential * 0.25 * (Math.random() * 2 - 1);
  // Max 60 detik — Gemini free-tier quota resets per menit, jadi retry yang
  // lebih cepat dari itu hampir pasti kena 429 lagi.
  return Math.min(exponential + jitter, 60_000);
}

// ─── Provider Status ──────────────────────────────────────────────

export interface ProviderStatus {
  gemini: {
    available: boolean;
    keyCount: number;
    circuitOpen: boolean;
  };
  groq: {
    available: boolean;
    keyCount: number;
    circuitOpen: boolean;
  };
  rateLimits: {
    remaining: number;
    resetInMs: number;
  };
}

/**
 * Dapatkan status semua provider AI (untuk debugging & UI).
 */
export function getProviderStatus(): ProviderStatus {
  const geminiCircuit = circuitStates.get('gemini');
  const groqCircuit = circuitStates.get('groq');

  return {
    gemini: {
      available: getGeminiKeyCount() > 0,
      keyCount: getGeminiKeyCount(),
      circuitOpen: geminiCircuit?.isOpen ?? false,
    },
    groq: {
      available: getGroqKeyCount() > 0,
      keyCount: getGroqKeyCount(),
      circuitOpen: groqCircuit?.isOpen ?? false,
    },
    rateLimits: {
      remaining: 0,
      resetInMs: 0,
    },
  };
}

// ─── User-Friendly Error Messages ─────────────────────────────────

const RATE_LIMIT_MESSAGES: Record<string, string> = {
  gemini: 'Layanan Gemini sedang sibuk. Silakan tunggu 1-2 menit dan coba lagi.',
  generic: 'Layanan AI sedang tidak tersedia. Silakan coba beberapa saat lagi.',
};

export function getRateLimitMessage(provider: string): string {
  return RATE_LIMIT_MESSAGES[provider] || RATE_LIMIT_MESSAGES.generic;
}

/**
 * Cek apakah error adalah rate limit error.
 */
export function isRateLimitError(error: unknown): boolean {
  const msg = error instanceof Error ? error.message : String(error);
  return /429|rate.?limit|too many|sibuk|tidak tersedia/i.test(msg);
}

/**
 * Cek apakah error bersifat transient (bisa di-retry).
 */
export function isTransientError(error: unknown): boolean {
  if (!(error instanceof Error)) return false;
  const msg = error.message;
  return /429|5\d{2}|timeout|abort|network|econnreset|econnrefused|fetch|sibuk|tidak tersedia|too many|rate/i.test(msg);
}
