/**
 * Rate Limiter Service v2
 *
 * Mencegah excessive API calls dengan sliding window yang dipersist ke localStorage.
 *
 * Security note: client-side rate limiting adalah UX guard, bukan security boundary.
 * Untuk true enforcement, gunakan Supabase RLS policies dan server-side rate limiting
 * (api/openrouter.ts sudah enforce server-side limits).
 *
 * v2 Improvements:
 * - State dipersist ke localStorage (tidak hilang saat page refresh)
 * - AI rate limit ditingkatkan jadi 30 req/min (dengan multi-key, rate limit aman dinaikkan)
 * - Cooldown indicator untuk UX feedback
 * - Reset info jelas (detik tersisa)
 */

import { logger } from './logger';

interface RateLimitConfig {
  maxRequests: number;
  windowMs: number; // Time window in milliseconds
}

interface RateLimitEntry {
  count: number;
  resetTime: number;
}

const STORAGE_KEY = 'portal_guru_rate_limits';

const defaultConfigs: Record<string, RateLimitConfig> = {
  auth: { maxRequests: 5, windowMs: 60_000 }, // 5 requests per minute for auth
  api: { maxRequests: 100, windowMs: 60_000 }, // 100 requests per minute for general API
  export: { maxRequests: 10, windowMs: 300_000 }, // 10 exports per 5 minutes
  ai: { maxRequests: 30, windowMs: 60_000 }, // ↑30 AI calls/min (dengan multi-key rotation aman)
  upload: { maxRequests: 20, windowMs: 60_000 }, // 20 uploads per minute
  default: { maxRequests: 60, windowMs: 60_000 }, // 60 requests per minute default
};

class RateLimiter {
  private limits: Map<string, RateLimitEntry> = new Map();
  private configs: Map<string, RateLimitConfig> = new Map(
    Object.entries(defaultConfigs)
  );
  private persistKey: string = STORAGE_KEY;

  constructor() {
    this.loadFromStorage();
    // Periodik save ke localStorage (setiap 5 detik)
    setInterval(() => this.saveToStorage(), 5_000);
  }

  // ─── Persistence ────────────────────────────────────────────────

  private loadFromStorage(): void {
    try {
      const stored = localStorage.getItem(this.persistKey);
      if (stored) {
        const parsed = JSON.parse(stored) as Record<string, RateLimitEntry>;
        const now = Date.now();
        for (const [key, entry] of Object.entries(parsed)) {
          // Skip expired entries
          if (entry.resetTime > now) {
            this.limits.set(key, entry);
          }
        }
      }
    } catch {
      // localStorage not available or corrupt — start fresh
      this.limits.clear();
    }
  }

  private saveToStorage(): void {
    try {
      const obj: Record<string, RateLimitEntry> = {};
      this.limits.forEach((entry, key) => {
        obj[key] = entry;
      });
      localStorage.setItem(this.persistKey, JSON.stringify(obj));
    } catch {
      // Storage full or unavailable — skip
    }
  }

  // ─── Configuration ──────────────────────────────────────────────

  setConfig(endpoint: string, config: RateLimitConfig): void {
    this.configs.set(endpoint, config);
  }

  private getConfig(endpoint: string): RateLimitConfig {
    return (
      this.configs.get(endpoint) ||
      this.configs.get('default')!
    );
  }

  // ─── Core Logic ─────────────────────────────────────────────────

  /**
   * Cek apakah request diizinkan.
   * @returns true jika diizinkan, false jika kena rate limit
   */
  isAllowed(endpoint: string): boolean {
    const config = this.getConfig(endpoint);
    const key = endpoint;
    const now = Date.now();

    let entry = this.limits.get(key);

    // Reset jika window sudah lewat
    if (!entry || now > entry.resetTime) {
      entry = {
        count: 0,
        resetTime: now + config.windowMs,
      };
      this.limits.set(key, entry);
    }

    // Cek limit
    if (entry.count >= config.maxRequests) {
      logger.warn(
        `[RateLimiter] ${endpoint} limit exceeded (${entry.count}/${config.maxRequests})`,
        'RateLimiter'
      );
      return false;
    }

    entry.count++;
    return true;
  }

  /**
   * Dapatkan sisa request yang diizinkan.
   */
  getRemaining(endpoint: string): number {
    const config = this.getConfig(endpoint);
    const entry = this.limits.get(endpoint);

    if (!entry || Date.now() > entry.resetTime) {
      return config.maxRequests;
    }

    return Math.max(0, config.maxRequests - entry.count);
  }

  /**
   * Dapatkan waktu hingga rate limit reset (dalam ms).
   */
  getResetTime(endpoint: string): number {
    const entry = this.limits.get(endpoint);

    if (!entry) return 0;

    return Math.max(0, entry.resetTime - Date.now());
  }

  /**
   * Dapatkan informasi lengkap rate limit (untuk UI feedback).
   */
  getStatus(endpoint: string): {
    allowed: boolean;
    remaining: number;
    resetInMs: number;
    resetInSeconds: number;
    limit: number;
  } {
    const config = this.getConfig(endpoint);
    const entry = this.limits.get(endpoint);
    const now = Date.now();

    if (!entry || now > entry.resetTime) {
      return {
        allowed: true,
        remaining: config.maxRequests,
        resetInMs: 0,
        resetInSeconds: 0,
        limit: config.maxRequests,
      };
    }

    const resetInMs = Math.max(0, entry.resetTime - now);

    return {
      allowed: entry.count < config.maxRequests,
      remaining: Math.max(0, config.maxRequests - entry.count),
      resetInMs,
      resetInSeconds: Math.ceil(resetInMs / 1000),
      limit: config.maxRequests,
    };
  }

  /**
   * Force reset rate limit untuk endpoint tertentu.
   */
  reset(endpoint: string): void {
    this.limits.delete(endpoint);
    this.saveToStorage();
  }

  /**
   * Reset semua rate limits.
   */
  resetAll(): void {
    this.limits.clear();
    this.saveToStorage();
  }
}

// ─── Singleton ────────────────────────────────────────────────────

export const rateLimiter = new RateLimiter();

// ─── Decorator ────────────────────────────────────────────────────

/**
 * Rate limit decorator untuk async functions.
 * Throw error dengan pesan user-friendly jika kena limit.
 */
export function withRateLimit<T extends (...args: any[]) => Promise<any>>(
  fn: T,
  endpoint: string
): T {
  return (async (...args: Parameters<T>) => {
    const status = rateLimiter.getStatus(endpoint);

    if (!status.allowed) {
      throw new Error(
        `Terlalu banyak permintaan. Coba lagi dalam ${status.resetInSeconds} detik.`
      );
    }

    return fn(...args);
  }) as T;
}

// ─── React Hook ───────────────────────────────────────────────────

/**
 * React hook untuk mengecek rate limit di komponen.
 */
export function useRateLimit(endpoint: string) {
  const checkLimit = (): boolean => {
    return rateLimiter.isAllowed(endpoint);
  };

  const getRemaining = (): number => {
    return rateLimiter.getRemaining(endpoint);
  };

  const getStatus = () => {
    return rateLimiter.getStatus(endpoint);
  };

  const getResetTime = (): number => {
    return rateLimiter.getResetTime(endpoint);
  };

  const reset = () => {
    rateLimiter.reset(endpoint);
  };

  return { checkLimit, getRemaining, getStatus, getResetTime, reset };
}

export { RateLimiter };
export type { RateLimitConfig };
