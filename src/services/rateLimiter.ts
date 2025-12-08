/**
 * Rate Limiter Service
 * Prevents excessive API calls and protects against abuse
 */

import { logger } from './logger';

interface RateLimitConfig {
    maxRequests: number;
    windowMs: number;  // Time window in milliseconds
}

interface RateLimitEntry {
    count: number;
    resetTime: number;
}

const RATE_LIMIT_STORAGE_KEY = 'portal_guru_rate_limits';

// Default configurations for different endpoints
const defaultConfigs: Record<string, RateLimitConfig> = {
    'auth': { maxRequests: 5, windowMs: 60000 },        // 5 requests per minute for auth
    'api': { maxRequests: 100, windowMs: 60000 },       // 100 requests per minute for general API
    'export': { maxRequests: 10, windowMs: 300000 },    // 10 exports per 5 minutes
    'ai': { maxRequests: 20, windowMs: 60000 },         // 20 AI calls per minute
    'upload': { maxRequests: 20, windowMs: 60000 },     // 20 uploads per minute
    'default': { maxRequests: 60, windowMs: 60000 }     // 60 requests per minute default
};

class RateLimiter {
    private limits: Map<string, RateLimitEntry> = new Map();
    private configs: Map<string, RateLimitConfig> = new Map(Object.entries(defaultConfigs));

    constructor() {
        this.loadFromStorage();
    }

    /**
     * Set custom rate limit configuration for an endpoint
     */
    setConfig(endpoint: string, config: RateLimitConfig) {
        this.configs.set(endpoint, config);
    }

    /**
     * Get configuration for an endpoint
     */
    private getConfig(endpoint: string): RateLimitConfig {
        return this.configs.get(endpoint) || this.configs.get('default')!;
    }

    /**
     * Check if a request is allowed
     * @returns {boolean} true if request is allowed, false if rate limited
     */
    isAllowed(endpoint: string): boolean {
        const config = this.getConfig(endpoint);
        const key = endpoint;
        const now = Date.now();

        let entry = this.limits.get(key);

        // Reset if window has passed
        if (!entry || now > entry.resetTime) {
            entry = {
                count: 0,
                resetTime: now + config.windowMs
            };
        }

        // Check if limit exceeded
        if (entry.count >= config.maxRequests) {
            logger.warn(
                `Rate limit exceeded for ${endpoint}`,
                'RateLimiter',
                { count: entry.count, max: config.maxRequests }
            );
            return false;
        }

        // Increment count
        entry.count++;
        this.limits.set(key, entry);
        this.saveToStorage();

        return true;
    }

    /**
     * Get remaining requests for an endpoint
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
     * Get time until rate limit resets (in ms)
     */
    getResetTime(endpoint: string): number {
        const entry = this.limits.get(endpoint);

        if (!entry) {
            return 0;
        }

        return Math.max(0, entry.resetTime - Date.now());
    }

    /**
     * Force reset rate limit for an endpoint
     */
    reset(endpoint: string) {
        this.limits.delete(endpoint);
        this.saveToStorage();
    }

    /**
     * Reset all rate limits
     */
    resetAll() {
        this.limits.clear();
        this.saveToStorage();
    }

    /**
     * Save rate limits to localStorage
     */
    private saveToStorage() {
        try {
            const data = Object.fromEntries(this.limits);
            localStorage.setItem(RATE_LIMIT_STORAGE_KEY, JSON.stringify(data));
        } catch {
            // Ignore storage errors
        }
    }

    /**
     * Load rate limits from localStorage
     */
    private loadFromStorage() {
        try {
            const stored = localStorage.getItem(RATE_LIMIT_STORAGE_KEY);
            if (stored) {
                const data = JSON.parse(stored);
                this.limits = new Map(Object.entries(data));

                // Clean up expired entries
                const now = Date.now();
                for (const [key, entry] of this.limits) {
                    if ((entry as RateLimitEntry).resetTime < now) {
                        this.limits.delete(key);
                    }
                }
            }
        } catch {
            this.limits = new Map();
        }
    }
}

// Singleton instance
export const rateLimiter = new RateLimiter();

/**
 * Rate limit decorator for async functions
 */
export function withRateLimit<T extends (...args: any[]) => Promise<any>>(
    fn: T,
    endpoint: string
): T {
    return (async (...args: Parameters<T>) => {
        if (!rateLimiter.isAllowed(endpoint)) {
            const resetTime = Math.ceil(rateLimiter.getResetTime(endpoint) / 1000);
            throw new Error(`Terlalu banyak permintaan. Coba lagi dalam ${resetTime} detik.`);
        }
        return fn(...args);
    }) as T;
}

/**
 * React hook for rate limiting
 */
export function useRateLimit(endpoint: string) {
    const checkLimit = (): boolean => {
        return rateLimiter.isAllowed(endpoint);
    };

    const getRemaining = (): number => {
        return rateLimiter.getRemaining(endpoint);
    };

    const getResetTime = (): number => {
        return rateLimiter.getResetTime(endpoint);
    };

    const reset = () => {
        rateLimiter.reset(endpoint);
    };

    return { checkLimit, getRemaining, getResetTime, reset };
}

export { RateLimiter };
export type { RateLimitConfig };

