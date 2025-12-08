import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
    hasXssAttempt,
    hasSqlInjectionAttempt,
    sanitizeForXss,
    generateSecureAccessCode,
    isValidAccessCode,
    validateAndSanitize,
    runParentPortalSecurityAudit,
    SecurityEventType
} from '../../src/services/security';
import { rateLimiter, useRateLimit } from '../../src/services/rateLimiter';

// Mock localStorage
const localStorageMock = (() => {
    let store: Record<string, string> = {};
    return {
        getItem: (key: string) => store[key] || null,
        setItem: (key: string, value: string) => { store[key] = value; },
        removeItem: (key: string) => { delete store[key]; },
        clear: () => { store = {}; }
    };
})();

Object.defineProperty(window, 'localStorage', { value: localStorageMock });

describe('XSS Protection', () => {
    describe('hasXssAttempt', () => {
        it('detects script tags', () => {
            expect(hasXssAttempt('<script>alert("xss")</script>')).toBe(true);
        });

        it('detects javascript: protocol', () => {
            expect(hasXssAttempt('javascript:alert(1)')).toBe(true);
        });

        it('detects event handlers', () => {
            expect(hasXssAttempt('<img onerror="alert(1)">')).toBe(true);
        });

        it('detects iframe tags', () => {
            expect(hasXssAttempt('<iframe src="evil.com">')).toBe(true);
        });

        it('allows normal text', () => {
            expect(hasXssAttempt('Hello World')).toBe(false);
        });

        it('allows normal HTML entities', () => {
            expect(hasXssAttempt('Test &amp; more')).toBe(false);
        });
    });

    describe('sanitizeForXss', () => {
        it('escapes angle brackets', () => {
            expect(sanitizeForXss('<script>')).toBe('&lt;script&gt;');
        });

        it('escapes quotes', () => {
            expect(sanitizeForXss('"test"')).toBe('&quot;test&quot;');
        });

        it('escapes ampersand', () => {
            expect(sanitizeForXss('test & more')).toBe('test &amp; more');
        });
    });
});

describe('SQL Injection Protection', () => {
    describe('hasSqlInjectionAttempt', () => {
        it('detects SELECT statement', () => {
            expect(hasSqlInjectionAttempt('SELECT * FROM users')).toBe(true);
        });

        it('detects DROP statement', () => {
            expect(hasSqlInjectionAttempt('DROP TABLE users')).toBe(true);
        });

        it('detects OR 1=1 pattern', () => {
            expect(hasSqlInjectionAttempt("' OR 1=1 --")).toBe(true);
        });

        it('detects UNION SELECT', () => {
            expect(hasSqlInjectionAttempt('UNION SELECT password FROM users')).toBe(true);
        });

        it('allows normal text', () => {
            expect(hasSqlInjectionAttempt('Ahmad Rizki')).toBe(false);
        });

        it('allows numbers', () => {
            expect(hasSqlInjectionAttempt('12345')).toBe(false);
        });
    });
});

describe('Access Code Security', () => {
    describe('generateSecureAccessCode', () => {
        it('generates 6 character code', () => {
            const code = generateSecureAccessCode();
            expect(code.length).toBe(6);
        });

        it('generates uppercase alphanumeric code', () => {
            const code = generateSecureAccessCode();
            expect(/^[A-Z0-9]+$/.test(code)).toBe(true);
        });

        it('generates unique codes', () => {
            const codes = new Set();
            for (let i = 0; i < 10; i++) {
                codes.add(generateSecureAccessCode());
            }
            expect(codes.size).toBe(10); // All should be unique
        });
    });

    describe('isValidAccessCode', () => {
        it('accepts valid code', () => {
            expect(isValidAccessCode('ABC123')).toBe(true);
        });

        it('rejects lowercase', () => {
            expect(isValidAccessCode('abc123')).toBe(false);
        });

        it('rejects short code', () => {
            expect(isValidAccessCode('ABC12')).toBe(false);
        });

        it('rejects long code', () => {
            expect(isValidAccessCode('ABC1234')).toBe(false);
        });

        it('rejects special characters', () => {
            expect(isValidAccessCode('ABC12!')).toBe(false);
        });
    });
});

describe('Input Validation', () => {
    describe('validateAndSanitize', () => {
        it('validates normal input', () => {
            const result = validateAndSanitize('Hello World');
            expect(result.valid).toBe(true);
            expect(result.sanitized).toBe('Hello World');
        });

        it('rejects XSS attempt', () => {
            const result = validateAndSanitize('<script>alert(1)</script>');
            expect(result.valid).toBe(false);
            expect(result.error).toBeDefined();
        });

        it('rejects SQL injection attempt', () => {
            const result = validateAndSanitize("SELECT * FROM users");
            expect(result.valid).toBe(false);
        });

        it('trims whitespace', () => {
            const result = validateAndSanitize('  test  ');
            expect(result.sanitized).toBe('test');
        });
    });
});

describe('Rate Limiter', () => {
    beforeEach(() => {
        localStorageMock.clear();
        rateLimiter.resetAll();
    });

    it('allows requests within limit', () => {
        expect(rateLimiter.isAllowed('test-endpoint')).toBe(true);
    });

    it('tracks request count', () => {
        rateLimiter.isAllowed('test-endpoint');
        const remaining = rateLimiter.getRemaining('test-endpoint');
        expect(remaining).toBeLessThan(60); // Default is 60
    });

    it('blocks when limit exceeded', () => {
        // Exhaust the limit
        for (let i = 0; i < 100; i++) {
            rateLimiter.isAllowed('test-limited');
        }
        // Should be blocked now
        expect(rateLimiter.isAllowed('test-limited')).toBe(false);
    });

    it('resets after reset call', () => {
        for (let i = 0; i < 100; i++) {
            rateLimiter.isAllowed('test-reset');
        }
        rateLimiter.reset('test-reset');
        expect(rateLimiter.isAllowed('test-reset')).toBe(true);
    });

    it('has different limits for different endpoints', () => {
        // Auth has lower limit (5)
        for (let i = 0; i < 5; i++) {
            rateLimiter.isAllowed('auth');
        }
        expect(rateLimiter.isAllowed('auth')).toBe(false);
    });
});

describe('Security Audit', () => {
    describe('runParentPortalSecurityAudit', () => {
        it('returns audit result', () => {
            const result = runParentPortalSecurityAudit();
            expect(result.checks).toBeDefined();
            expect(result.score).toBeDefined();
            expect(typeof result.passed).toBe('boolean');
        });

        it('includes required checks', () => {
            const result = runParentPortalSecurityAudit();
            const checkNames = result.checks.map(c => c.name);
            expect(checkNames).toContain('HTTPS Connection');
            expect(checkNames).toContain('Session Storage');
            expect(checkNames).toContain('Crypto API');
        });

        it('calculates score correctly', () => {
            const result = runParentPortalSecurityAudit();
            expect(result.score).toBeGreaterThanOrEqual(0);
            expect(result.score).toBeLessThanOrEqual(100);
        });
    });
});
