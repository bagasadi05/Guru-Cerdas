/**
 * Client-Side Security Utilities
 * 
 * Features:
 * - Rate limiting for API calls
 * - Input sanitization
 * - Session timeout warning
 * - CSRF protection helpers
 */

import { logger } from '../services/logger';

// ============================================
// RATE LIMITING
// ============================================

interface RateLimitConfig {
    maxRequests: number;
    windowMs: number;
    onLimitReached?: () => void;
}

interface RateLimitState {
    count: number;
    windowStart: number;
    blocked: boolean;
    blockedUntil: number;
}

const rateLimitStates = new Map<string, RateLimitState>();

/**
 * Check if an action is rate limited
 */
export function checkRateLimit(
    key: string,
    config: RateLimitConfig
): { allowed: boolean; remaining: number; resetIn: number } {
    const now = Date.now();
    let state = rateLimitStates.get(key);

    // Initialize or reset window
    if (!state || now - state.windowStart >= config.windowMs) {
        state = {
            count: 0,
            windowStart: now,
            blocked: false,
            blockedUntil: 0,
        };
        rateLimitStates.set(key, state);
    }

    // Check if currently blocked
    if (state.blocked && now < state.blockedUntil) {
        return {
            allowed: false,
            remaining: 0,
            resetIn: state.blockedUntil - now,
        };
    }

    // Reset block if time passed
    if (state.blocked && now >= state.blockedUntil) {
        state.blocked = false;
        state.count = 0;
        state.windowStart = now;
    }

    // Increment and check
    state.count++;

    if (state.count > config.maxRequests) {
        state.blocked = true;
        state.blockedUntil = now + config.windowMs;
        config.onLimitReached?.();

        logger.warn(`Rate limit reached for ${key}`, 'RateLimit', {
            count: state.count,
            maxRequests: config.maxRequests,
        });

        return {
            allowed: false,
            remaining: 0,
            resetIn: config.windowMs,
        };
    }

    return {
        allowed: true,
        remaining: config.maxRequests - state.count,
        resetIn: config.windowMs - (now - state.windowStart),
    };
}

/**
 * Rate limiter with automatic blocking
 */
export function createRateLimiter(config: RateLimitConfig) {
    const key = `limiter_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    return {
        check: () => checkRateLimit(key, config),
        reset: () => rateLimitStates.delete(key),
    };
}

// Pre-configured rate limiters
export const rateLimiters = {
    // Login attempts: 5 per minute
    login: () => createRateLimiter({
        maxRequests: 5,
        windowMs: 60 * 1000,
        onLimitReached: () => {
            logger.warn('Too many login attempts', 'Security');
        },
    }),

    // API calls: 100 per minute
    api: () => createRateLimiter({
        maxRequests: 100,
        windowMs: 60 * 1000,
    }),

    // Form submissions: 10 per minute
    form: () => createRateLimiter({
        maxRequests: 10,
        windowMs: 60 * 1000,
    }),

    // Export/Download: 5 per 5 minutes
    export: () => createRateLimiter({
        maxRequests: 5,
        windowMs: 5 * 60 * 1000,
    }),
};

// ============================================
// INPUT SANITIZATION
// ============================================

/**
 * Comprehensive input sanitization
 */
export const sanitize = {
    /**
     * Remove HTML tags and escape special characters
     */
    html: (input: string): string => {
        return input
            .replace(/<[^>]*>/g, '')
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
    },

    /**
     * Sanitize for safe display (keeps basic formatting)
     */
    display: (input: string): string => {
        return input
            .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
            .replace(/on\w+\s*=/gi, '')
            .replace(/javascript:/gi, '');
    },

    /**
     * Sanitize for database storage
     */
    database: (input: string): string => {
        return input
            .trim()
            // eslint-disable-next-line no-control-regex
            .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '') // Remove control chars
            .substring(0, 10000); // Limit length
    },

    /**
     * Sanitize filename
     */
    filename: (input: string): string => {
        return input
            .replace(/[^a-zA-Z0-9._-]/g, '_')
            .replace(/_{2,}/g, '_')
            .replace(/^\.+/, '')
            .substring(0, 100);
    },

    /**
     * Sanitize URL
     */
    url: (input: string): string | null => {
        try {
            const url = new URL(input);
            // Only allow http and https
            if (!['http:', 'https:'].includes(url.protocol)) {
                return null;
            }
            return url.href;
        } catch {
            return null;
        }
    },

    /**
     * Sanitize phone number (Indonesia format)
     */
    phone: (input: string): string => {
        const digits = input.replace(/\D/g, '');
        if (digits.startsWith('62')) {
            return '+' + digits;
        }
        if (digits.startsWith('0')) {
            return '+62' + digits.substring(1);
        }
        return '+62' + digits;
    },

    /**
     * Sanitize email
     */
    email: (input: string): string => {
        return input.toLowerCase().trim();
    },
};

// ============================================
// SESSION TIMEOUT
// ============================================

interface SessionTimeoutConfig {
    timeoutMs: number;
    warningMs: number;
    onWarning: (remainingMs: number) => void;
    onTimeout: () => void;
    onActivity?: () => void;
}

let activityTimeout: ReturnType<typeof setTimeout> | null = null;
let warningTimeout: ReturnType<typeof setTimeout> | null = null;
let sessionConfig: SessionTimeoutConfig | null = null;

/**
 * Initialize session timeout monitoring
 */
export function initSessionTimeout(config: SessionTimeoutConfig): () => void {
    sessionConfig = config;

    const resetTimer = () => {
        if (!sessionConfig) return;

        // Clear existing timers
        if (activityTimeout) clearTimeout(activityTimeout);
        if (warningTimeout) clearTimeout(warningTimeout);

        // Set warning timer
        warningTimeout = setTimeout(() => {
            const remaining = sessionConfig!.timeoutMs - sessionConfig!.warningMs;
            sessionConfig!.onWarning(remaining);
        }, sessionConfig.warningMs);

        // Set timeout timer
        activityTimeout = setTimeout(() => {
            sessionConfig!.onTimeout();
        }, sessionConfig.timeoutMs);

        sessionConfig.onActivity?.();
    };

    // Activity events
    const events = ['mousedown', 'keydown', 'scroll', 'touchstart'];

    // Throttle activity detection
    let lastActivity = Date.now();
    const handleActivity = () => {
        const now = Date.now();
        if (now - lastActivity > 1000) { // Throttle to 1 second
            lastActivity = now;
            resetTimer();
        }
    };

    events.forEach(event => {
        document.addEventListener(event, handleActivity, { passive: true });
    });

    // Initial timer
    resetTimer();

    // Cleanup function
    return () => {
        events.forEach(event => {
            document.removeEventListener(event, handleActivity);
        });
        if (activityTimeout) clearTimeout(activityTimeout);
        if (warningTimeout) clearTimeout(warningTimeout);
        sessionConfig = null;
    };
}

/**
 * Extend session (call after user confirms they want to stay)
 */
export function extendSession(): void {
    if (sessionConfig) {
        // Trigger activity
        document.dispatchEvent(new Event('mousedown'));
    }
}

// ============================================
// CSRF PROTECTION
// ============================================

const CSRF_STORAGE_KEY = 'csrf_token';

/**
 * Generate a CSRF token
 */
export function generateCSRFToken(): string {
    const token = crypto.randomUUID();
    sessionStorage.setItem(CSRF_STORAGE_KEY, token);
    return token;
}

/**
 * Validate CSRF token
 */
export function validateCSRFToken(token: string): boolean {
    const storedToken = sessionStorage.getItem(CSRF_STORAGE_KEY);
    return storedToken === token;
}

/**
 * Get current CSRF token
 */
export function getCSRFToken(): string | null {
    return sessionStorage.getItem(CSRF_STORAGE_KEY);
}

// ============================================
// SECURE HEADERS FOR FETCH
// ============================================

/**
 * Create secure headers for API requests
 */
export function createSecureHeaders(additionalHeaders?: Record<string, string>): Headers {
    const headers = new Headers({
        'Content-Type': 'application/json',
        'X-Requested-With': 'XMLHttpRequest',
        ...additionalHeaders,
    });

    const csrfToken = getCSRFToken();
    if (csrfToken) {
        headers.set('X-CSRF-Token', csrfToken);
    }

    return headers;
}

// ============================================
// CONTENT SECURITY
// ============================================

/**
 * Check if a URL is from a trusted domain
 */
export function isTrustedUrl(url: string, trustedDomains: string[] = []): boolean {
    const defaultTrusted = [
        'localhost',
        window.location.hostname,
        'supabase.co',
        'supabase.in',
    ];

    const allTrusted = [...defaultTrusted, ...trustedDomains];

    try {
        const parsed = new URL(url);
        return allTrusted.some(domain =>
            parsed.hostname === domain || parsed.hostname.endsWith('.' + domain)
        );
    } catch {
        return false;
    }
}

/**
 * Safely open external link
 */
export function safeExternalLink(url: string): void {
    const sanitizedUrl = sanitize.url(url);

    if (!sanitizedUrl) {
        logger.warn('Blocked invalid URL', 'Security', { url });
        return;
    }

    // Open with security attributes
    const link = document.createElement('a');
    link.href = sanitizedUrl;
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    link.click();
}

export default {
    checkRateLimit,
    createRateLimiter,
    rateLimiters,
    sanitize,
    initSessionTimeout,
    extendSession,
    generateCSRFToken,
    validateCSRFToken,
    getCSRFToken,
    createSecureHeaders,
    isTrustedUrl,
    safeExternalLink,
};
