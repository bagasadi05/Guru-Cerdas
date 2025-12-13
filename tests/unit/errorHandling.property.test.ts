/**
 * Property-Based Tests for Error Handling
 * 
 * **Feature: portal-guru-improvements**
 * Uses fast-check library for comprehensive property-based testing
 * Each test runs minimum 100 iterations as specified in requirements
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import fc from 'fast-check';

// Mock navigator.onLine
let mockIsOnline = true;
Object.defineProperty(navigator, 'onLine', {
    get: () => mockIsOnline,
    configurable: true
});

// Error types for testing
enum ErrorType {
    NETWORK = 'NETWORK',
    AUTH = 'AUTH',
    VALIDATION = 'VALIDATION',
    SERVER = 'SERVER',
    CLIENT = 'CLIENT',
    TIMEOUT = 'TIMEOUT',
    NOT_FOUND = 'NOT_FOUND',
    PERMISSION = 'PERMISSION',
    RATE_LIMIT = 'RATE_LIMIT',
    OFFLINE = 'OFFLINE',
    UNKNOWN = 'UNKNOWN'
}

enum ErrorSeverity {
    LOW = 'low',
    MEDIUM = 'medium',
    HIGH = 'high',
    CRITICAL = 'critical'
}

// Error context interface
interface ErrorContext {
    userId?: string;
    component?: string;
    action?: string;
    metadata?: Record<string, unknown>;
    timestamp: string;
    stackTrace?: string;
}

// Error classification function
function classifyError(error: unknown): { type: ErrorType; retryable: boolean; recoverable: boolean } {
    if (!navigator.onLine) {
        return { type: ErrorType.OFFLINE, retryable: true, recoverable: true };
    }

    if (error instanceof TypeError && error.message.includes('fetch')) {
        return { type: ErrorType.NETWORK, retryable: true, recoverable: true };
    }

    if (error instanceof Error) {
        if (error.message.includes('timeout') || error.name === 'AbortError') {
            return { type: ErrorType.TIMEOUT, retryable: true, recoverable: true };
        }

        if (error.message.includes('401') || error.message.includes('Unauthorized')) {
            return { type: ErrorType.AUTH, retryable: false, recoverable: true };
        }

        if (error.message.includes('403') || error.message.includes('Forbidden')) {
            return { type: ErrorType.PERMISSION, retryable: false, recoverable: false };
        }

        if (error.message.includes('404') || error.message.includes('Not Found')) {
            return { type: ErrorType.NOT_FOUND, retryable: false, recoverable: false };
        }

        if (error.message.includes('429') || error.message.includes('Too Many')) {
            return { type: ErrorType.RATE_LIMIT, retryable: true, recoverable: true };
        }

        if (error.message.includes('500') || error.message.includes('Server Error')) {
            return { type: ErrorType.SERVER, retryable: true, recoverable: true };
        }

        if (error.message.includes('validation') || error.message.includes('invalid')) {
            return { type: ErrorType.VALIDATION, retryable: false, recoverable: true };
        }
    }

    return { type: ErrorType.UNKNOWN, retryable: true, recoverable: true };
}

// Error context capture function
function captureErrorContext(
    error: Error,
    component?: string,
    userId?: string,
    metadata?: Record<string, unknown>
): ErrorContext {
    return {
        timestamp: new Date().toISOString(),
        component,
        userId,
        action: metadata?.action as string,
        metadata,
        stackTrace: error.stack
    };
}

// User-friendly message generator
function getUserFriendlyMessage(errorType: ErrorType): { title: string; message: string; action: string } {
    const messages: Record<ErrorType, { title: string; message: string; action: string }> = {
        [ErrorType.NETWORK]: {
            title: 'Koneksi Bermasalah',
            message: 'Tidak dapat terhubung ke server. Periksa koneksi internet Anda.',
            action: 'Coba Lagi'
        },
        [ErrorType.AUTH]: {
            title: 'Sesi Berakhir',
            message: 'Silakan login kembali untuk melanjutkan.',
            action: 'Login'
        },
        [ErrorType.VALIDATION]: {
            title: 'Data Tidak Valid',
            message: 'Periksa kembali data yang Anda masukkan.',
            action: 'Perbaiki'
        },
        [ErrorType.SERVER]: {
            title: 'Kesalahan Server',
            message: 'Terjadi kesalahan pada server. Tim kami sedang menangani ini.',
            action: 'Coba Lagi Nanti'
        },
        [ErrorType.CLIENT]: {
            title: 'Kesalahan Aplikasi',
            message: 'Terjadi kesalahan pada aplikasi.',
            action: 'Muat Ulang'
        },
        [ErrorType.TIMEOUT]: {
            title: 'Waktu Habis',
            message: 'Permintaan memakan waktu terlalu lama.',
            action: 'Coba Lagi'
        },
        [ErrorType.NOT_FOUND]: {
            title: 'Tidak Ditemukan',
            message: 'Data yang Anda cari tidak ditemukan.',
            action: 'Kembali'
        },
        [ErrorType.PERMISSION]: {
            title: 'Akses Ditolak',
            message: 'Anda tidak memiliki izin untuk mengakses ini.',
            action: 'Kembali'
        },
        [ErrorType.RATE_LIMIT]: {
            title: 'Terlalu Banyak Permintaan',
            message: 'Permintaan terlalu cepat. Tunggu sebentar.',
            action: 'Tunggu'
        },
        [ErrorType.OFFLINE]: {
            title: 'Anda Offline',
            message: 'Tidak ada koneksi internet.',
            action: 'Coba Lagi'
        },
        [ErrorType.UNKNOWN]: {
            title: 'Terjadi Kesalahan',
            message: 'Terjadi kesalahan yang tidak terduga.',
            action: 'Coba Lagi'
        }
    };

    return messages[errorType];
}

// Exponential backoff calculation
function calculateBackoff(attempt: number, baseDelay: number = 1000, maxDelay: number = 30000): number {
    const delay = Math.min(baseDelay * Math.pow(2, attempt), maxDelay);
    // Add jitter (±10%)
    const jitter = delay * 0.1 * (Math.random() * 2 - 1);
    return Math.floor(delay + jitter);
}

describe('Property-Based Tests: Error Handling', () => {
    beforeEach(() => {
        mockIsOnline = true;
    });

    /**
     * **Property 1: Error Capture and Context**
     * For any error that occurs in the application, the error handling system 
     * should capture the error with complete context including stack trace, 
     * user ID, timestamp, and component information
     * **Validates: Requirements 1.1, 1.4**
     */
    describe('Property 1: Error Capture and Context', () => {
        it('should capture complete context for any error with any component and user combination', () => {
            fc.assert(
                fc.property(
                    fc.string({ minLength: 1, maxLength: 100 }), // error message
                    fc.option(fc.string({ minLength: 1, maxLength: 50 })), // component name
                    fc.option(fc.uuid()), // user ID
                    fc.option(fc.dictionary(fc.string(), fc.jsonValue())), // metadata
                    (errorMessage, component, userId, metadata) => {
                        const error = new Error(errorMessage);
                        const context = captureErrorContext(
                            error,
                            component ?? undefined,
                            userId ?? undefined,
                            metadata ?? undefined
                        );

                        // Property: Context must always have a timestamp
                        expect(context.timestamp).toBeDefined();
                        expect(new Date(context.timestamp).getTime()).not.toBeNaN();

                        // Property: Stack trace should be captured when available
                        if (error.stack) {
                            expect(context.stackTrace).toBeDefined();
                        }

                        // Property: Component and userId should be preserved when provided
                        if (component) {
                            expect(context.component).toBe(component);
                        }
                        if (userId) {
                            expect(context.userId).toBe(userId);
                        }

                        return true;
                    }
                ),
                { numRuns: 100 }
            );
        });

        it('should never throw when capturing context for any valid error', () => {
            fc.assert(
                fc.property(
                    fc.string(), // any error message
                    (message) => {
                        const error = new Error(message);

                        // Property: captureErrorContext should never throw
                        expect(() => {
                            captureErrorContext(error);
                        }).not.toThrow();

                        return true;
                    }
                ),
                { numRuns: 100 }
            );
        });
    });

    /**
     * **Property 2: Network Retry with Exponential Backoff**
     * For any failed network request, the retry mechanism should implement 
     * exponential backoff with increasing delays between attempts
     * **Validates: Requirements 1.2**
     */
    describe('Property 2: Network Retry with Exponential Backoff', () => {
        it('should have exponentially increasing delays between retry attempts', () => {
            fc.assert(
                fc.property(
                    fc.integer({ min: 0, max: 10 }), // attempt number
                    fc.integer({ min: 100, max: 5000 }), // base delay
                    fc.integer({ min: 10000, max: 60000 }), // max delay
                    (attempt, baseDelay, maxDelay) => {
                        const delay = calculateBackoff(attempt, baseDelay, maxDelay);

                        // Property: Delay should never exceed maxDelay (plus jitter)
                        expect(delay).toBeLessThanOrEqual(maxDelay * 1.1);

                        // Property: Delay should never be negative
                        expect(delay).toBeGreaterThanOrEqual(0);

                        // Property: Base delay for first attempt should be approximately baseDelay
                        if (attempt === 0) {
                            expect(delay).toBeGreaterThanOrEqual(baseDelay * 0.9);
                            expect(delay).toBeLessThanOrEqual(baseDelay * 1.1);
                        }

                        return true;
                    }
                ),
                { numRuns: 100 }
            );
        });

        it('should have increasing delays for consecutive attempts', () => {
            fc.assert(
                fc.property(
                    fc.integer({ min: 1000, max: 2000 }), // base delay
                    (baseDelay) => {
                        const maxDelay = 60000;

                        // Get average delays by running multiple times
                        const getAverageDelay = (attempt: number): number => {
                            let sum = 0;
                            for (let i = 0; i < 10; i++) {
                                sum += calculateBackoff(attempt, baseDelay, maxDelay);
                            }
                            return sum / 10;
                        };

                        const delay0 = getAverageDelay(0);
                        const delay1 = getAverageDelay(1);
                        const delay2 = getAverageDelay(2);

                        // Property: Later attempts should have longer average delays
                        expect(delay1).toBeGreaterThan(delay0);
                        expect(delay2).toBeGreaterThan(delay1);

                        return true;
                    }
                ),
                { numRuns: 100 }
            );
        });
    });

    /**
     * **Property 3: User-Friendly Error Display**
     * For any error displayed to users, the message should be user-friendly 
     * and not expose technical implementation details
     * **Validates: Requirements 1.3**
     */
    describe('Property 3: User-Friendly Error Display', () => {
        it('should provide user-friendly message for any error type', () => {
            fc.assert(
                fc.property(
                    fc.constantFrom(...Object.values(ErrorType)), // any error type
                    (errorType) => {
                        const message = getUserFriendlyMessage(errorType);

                        // Property: Message should always have title, message, and action
                        expect(message.title).toBeDefined();
                        expect(message.message).toBeDefined();
                        expect(message.action).toBeDefined();

                        // Property: Message should be non-empty
                        expect(message.title.length).toBeGreaterThan(0);
                        expect(message.message.length).toBeGreaterThan(0);
                        expect(message.action.length).toBeGreaterThan(0);

                        // Property: Message should not contain technical details
                        const technicalTerms = ['undefined', 'null', 'Error:', 'TypeError', 'ReferenceError', 'stack', 'at line'];
                        technicalTerms.forEach(term => {
                            expect(message.message.toLowerCase()).not.toContain(term.toLowerCase());
                        });

                        return true;
                    }
                ),
                { numRuns: 100 }
            );
        });

        it('should return Indonesian language messages', () => {
            fc.assert(
                fc.property(
                    fc.constantFrom(...Object.values(ErrorType)),
                    (errorType) => {
                        const message = getUserFriendlyMessage(errorType);

                        // Property: At least one word should be Indonesian
                        const indonesianWords = ['Koneksi', 'Tidak', 'Server', 'Terjadi', 'Coba', 'Kembali', 'Login', 'Tunggu', 'Akses', 'Sesi'];
                        const hasIndonesian = indonesianWords.some(word =>
                            message.title.includes(word) ||
                            message.message.includes(word) ||
                            message.action.includes(word)
                        );

                        expect(hasIndonesian).toBe(true);

                        return true;
                    }
                ),
                { numRuns: 100 }
            );
        });
    });

    /**
     * **Property 4: Application Crash Prevention**
     * For any critical error, the error boundary system should prevent application 
     * crashes and maintain application stability
     * **Validates: Requirements 1.5**
     */
    describe('Property 4: Application Crash Prevention', () => {
        it('should classify any error without crashing', () => {
            fc.assert(
                fc.property(
                    fc.oneof(
                        fc.string().map(msg => new Error(msg)),
                        fc.string().map(msg => new TypeError(msg)),
                        fc.string().map(msg => new RangeError(msg)),
                        fc.constant(null),
                        fc.constant(undefined),
                        fc.string(),
                        fc.integer(),
                        fc.object()
                    ),
                    (error) => {
                        // Property: classifyError should never throw for any input
                        expect(() => {
                            classifyError(error);
                        }).not.toThrow();

                        return true;
                    }
                ),
                { numRuns: 100 }
            );
        });

        it('should always determine retryability for any error', () => {
            fc.assert(
                fc.property(
                    fc.oneof(
                        fc.string().map(msg => new Error(msg)),
                        fc.string().map(msg => new TypeError(`fetch: ${msg}`)),
                        fc.constant(new Error('timeout')),
                        fc.constant(new Error('401 Unauthorized')),
                        fc.constant(new Error('500 Server Error'))
                    ),
                    (error) => {
                        const classified = classifyError(error);

                        // Property: Every classified error must have retryable property
                        expect(typeof classified.retryable).toBe('boolean');

                        // Property: Every classified error must have recoverable property
                        expect(typeof classified.recoverable).toBe('boolean');

                        // Property: Error type must be a valid ErrorType
                        expect(Object.values(ErrorType)).toContain(classified.type);

                        return true;
                    }
                ),
                { numRuns: 100 }
            );
        });

        it('should correctly identify retryable vs non-retryable errors', () => {
            // Retryable errors
            const retryableErrors = [
                new TypeError('Failed to fetch'),
                new Error('timeout'),
                new Error('500 Server Error'),
                new Error('429 Too Many Requests')
            ];

            // Non-retryable errors
            const nonRetryableErrors = [
                new Error('401 Unauthorized'),
                new Error('403 Forbidden'),
                new Error('404 Not Found'),
                new Error('validation error')
            ];

            retryableErrors.forEach(error => {
                const classified = classifyError(error);
                expect(classified.retryable).toBe(true);
            });

            nonRetryableErrors.forEach(error => {
                const classified = classifyError(error);
                expect(classified.retryable).toBe(false);
            });
        });
    });

    describe('Error Classification Edge Cases', () => {
        it('should handle offline state', () => {
            mockIsOnline = false;
            const classified = classifyError(new Error('any error'));
            expect(classified.type).toBe(ErrorType.OFFLINE);
            expect(classified.retryable).toBe(true);
            mockIsOnline = true;
        });

        it('should default to UNKNOWN for unrecognized errors', () => {
            const classified = classifyError(new Error('some random error message'));
            expect(classified.type).toBe(ErrorType.UNKNOWN);
        });
    });
});
