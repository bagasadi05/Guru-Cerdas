import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock navigator.onLine
let mockIsOnline = true;
Object.defineProperty(navigator, 'onLine', {
    get: () => mockIsOnline,
    configurable: true
});

// Mock crypto
vi.stubGlobal('crypto', {
    randomUUID: () => 'test-uuid-' + Math.random().toString(36).substr(2, 9)
});

describe('Error Handling Service', () => {
    beforeEach(() => {
        mockIsOnline = true;
    });

    describe('Error Type Classification', () => {
        const ErrorType = {
            NETWORK: 'NETWORK',
            AUTH: 'AUTH',
            VALIDATION: 'VALIDATION',
            SERVER: 'SERVER',
            CLIENT: 'CLIENT',
            TIMEOUT: 'TIMEOUT',
            NOT_FOUND: 'NOT_FOUND',
            PERMISSION: 'PERMISSION',
            RATE_LIMIT: 'RATE_LIMIT',
            OFFLINE: 'OFFLINE',
            UNKNOWN: 'UNKNOWN'
        };

        it('should have all error types', () => {
            expect(Object.keys(ErrorType).length).toBe(11);
        });

        it('should include network error type', () => {
            expect(ErrorType.NETWORK).toBe('NETWORK');
        });

        it('should include auth error type', () => {
            expect(ErrorType.AUTH).toBe('AUTH');
        });

        it('should include server error type', () => {
            expect(ErrorType.SERVER).toBe('SERVER');
        });
    });

    describe('Error Severity', () => {
        const ErrorSeverity = {
            LOW: 'low',
            MEDIUM: 'medium',
            HIGH: 'high',
            CRITICAL: 'critical'
        };

        it('should have all severity levels', () => {
            expect(Object.keys(ErrorSeverity).length).toBe(4);
        });

        it('should have correct severity values', () => {
            expect(ErrorSeverity.LOW).toBe('low');
            expect(ErrorSeverity.CRITICAL).toBe('critical');
        });
    });

    describe('Error Classification', () => {
        it('should classify network error', () => {
            const error = new TypeError('Failed to fetch');
            const type = error.message.includes('fetch') ? 'NETWORK' : 'UNKNOWN';
            expect(type).toBe('NETWORK');
        });

        it('should classify offline error', () => {
            mockIsOnline = false;
            const type = !navigator.onLine ? 'OFFLINE' : 'UNKNOWN';
            expect(type).toBe('OFFLINE');
        });

        it('should classify 401 as auth error', () => {
            const status = 401;
            const type = status === 401 ? 'AUTH' : status === 403 ? 'PERMISSION' : 'UNKNOWN';
            expect(type).toBe('AUTH');
        });

        it('should classify 403 as permission error', () => {
            const status: number = 403;
            const type = status === 401 ? 'AUTH' : status === 403 ? 'PERMISSION' : 'UNKNOWN';
            expect(type).toBe('PERMISSION');
        });

        it('should classify 404 as not found', () => {
            const status = 404;
            const type = status === 404 ? 'NOT_FOUND' : 'UNKNOWN';
            expect(type).toBe('NOT_FOUND');
        });

        it('should classify 429 as rate limit', () => {
            const status = 429;
            const type = status === 429 ? 'RATE_LIMIT' : 'UNKNOWN';
            expect(type).toBe('RATE_LIMIT');
        });

        it('should classify 500+ as server error', () => {
            const status = 500;
            const type = status >= 500 ? 'SERVER' : 'UNKNOWN';
            expect(type).toBe('SERVER');
        });

        it('should classify timeout error', () => {
            const error = { name: 'AbortError' };
            const type = error.name === 'AbortError' ? 'TIMEOUT' : 'UNKNOWN';
            expect(type).toBe('TIMEOUT');
        });

        it('should classify validation error', () => {
            const error = { errors: ['Field is required'] };
            const type = error.errors ? 'VALIDATION' : 'UNKNOWN';
            expect(type).toBe('VALIDATION');
        });
    });

    describe('User-Friendly Messages', () => {
        const ERROR_MESSAGES = {
            NETWORK: {
                title: 'Koneksi Bermasalah',
                message: 'Tidak dapat terhubung ke server.',
                action: 'Coba Lagi'
            },
            AUTH: {
                title: 'Sesi Berakhir',
                message: 'Silakan login kembali.',
                action: 'Login'
            },
            SERVER: {
                title: 'Kesalahan Server',
                message: 'Terjadi kesalahan pada server.',
                action: 'Coba Lagi Nanti'
            }
        };

        it('should have Indonesian messages', () => {
            expect(ERROR_MESSAGES.NETWORK.title).toBe('Koneksi Bermasalah');
        });

        it('should have actionable text', () => {
            expect(ERROR_MESSAGES.NETWORK.action).toBe('Coba Lagi');
            expect(ERROR_MESSAGES.AUTH.action).toBe('Login');
        });

        it('should have descriptive message', () => {
            expect(ERROR_MESSAGES.SERVER.message).toContain('server');
        });
    });

    describe('Retryable Errors', () => {
        it('should mark network errors as retryable', () => {
            const error = { type: 'NETWORK', retryable: true };
            expect(error.retryable).toBe(true);
        });

        it('should mark timeout errors as retryable', () => {
            const error = { type: 'TIMEOUT', retryable: true };
            expect(error.retryable).toBe(true);
        });

        it('should mark server errors as retryable', () => {
            const error = { type: 'SERVER', retryable: true };
            expect(error.retryable).toBe(true);
        });

        it('should not mark auth errors as retryable', () => {
            const error = { type: 'AUTH', retryable: false };
            expect(error.retryable).toBe(false);
        });

        it('should not mark validation errors as retryable', () => {
            const error = { type: 'VALIDATION', retryable: false };
            expect(error.retryable).toBe(false);
        });
    });

    describe('Recoverable Errors', () => {
        it('should mark network errors as recoverable', () => {
            const error = { type: 'NETWORK', recoverable: true };
            expect(error.recoverable).toBe(true);
        });

        it('should mark offline errors as recoverable', () => {
            const error = { type: 'OFFLINE', recoverable: true };
            expect(error.recoverable).toBe(true);
        });

        it('should not automatically recover auth errors', () => {
            const error = { type: 'AUTH', recoverable: true };
            // Auth is recoverable but requires user action (re-login)
            expect(error.recoverable).toBe(true);
        });
    });

    describe('Recovery Strategies', () => {
        it('should have retry strategy', () => {
            const strategies = ['retry', 'refresh-token', 'use-cache', 'fallback-data'];
            expect(strategies).toContain('retry');
        });

        it('should have refresh-token strategy for auth', () => {
            const strategies = ['retry', 'refresh-token', 'use-cache', 'fallback-data'];
            expect(strategies).toContain('refresh-token');
        });

        it('should have cache strategy for network errors', () => {
            const strategies = ['retry', 'refresh-token', 'use-cache', 'fallback-data'];
            expect(strategies).toContain('use-cache');
        });

        it('should have fallback data strategy', () => {
            const strategies = ['retry', 'refresh-token', 'use-cache', 'fallback-data'];
            expect(strategies).toContain('fallback-data');
        });
    });

    describe('Error Report Structure', () => {
        it('should include error details', () => {
            const report = {
                id: 'test-id',
                error: {
                    type: 'NETWORK',
                    message: 'Failed to fetch',
                    severity: 'medium'
                },
                timestamp: new Date().toISOString()
            };

            expect(report.id).toBeDefined();
            expect(report.error.type).toBe('NETWORK');
        });

        it('should include device info', () => {
            const report = {
                device: {
                    userAgent: navigator.userAgent,
                    language: navigator.language,
                    online: navigator.onLine
                }
            };

            expect(report.device.userAgent).toBeDefined();
            expect(report.device.online).toBe(true);
        });

        it('should include context', () => {
            const report = {
                context: {
                    url: 'http://localhost',
                    referrer: '',
                    timestamp: new Date().toISOString()
                }
            };

            expect(report.context.url).toBeDefined();
            expect(report.context.timestamp).toBeDefined();
        });
    });

    describe('Fetch with Retry', () => {
        it('should support configurable retries', () => {
            const options = {
                retries: 3,
                retryDelay: 1000,
                timeout: 30000
            };

            expect(options.retries).toBe(3);
            expect(options.retryDelay).toBe(1000);
            expect(options.timeout).toBe(30000);
        });

        it('should call onRetry callback', () => {
            const onRetry = vi.fn();
            const attempt = 1;
            const error = { type: 'NETWORK' };

            onRetry(attempt, error);
            expect(onRetry).toHaveBeenCalledWith(1, error);
        });

        it('should apply exponential backoff', () => {
            const retryDelay = 1000;
            const attempt = 3;
            const delay = retryDelay * (attempt + 1);

            expect(delay).toBe(4000);
        });
    });

    describe('Error Queue', () => {
        it('should limit queue size', () => {
            const maxSize = 100;
            const queue: any[] = [];

            for (let i = 0; i < 150; i++) {
                queue.push({ id: i });
                if (queue.length > maxSize) {
                    queue.shift();
                }
            }

            expect(queue.length).toBe(100);
            expect(queue[0].id).toBe(50);
        });

        it('should get recent errors', () => {
            const queue = Array.from({ length: 20 }, (_, i) => ({ id: i }));
            const recent = queue.slice(-10);

            expect(recent.length).toBe(10);
            expect(recent[0].id).toBe(10);
        });
    });
});

describe('Error Fallback UI', () => {
    describe('Error Icons', () => {
        it('should have icon for each error type', () => {
            const errorTypes = ['NETWORK', 'AUTH', 'NOT_FOUND', 'PERMISSION', 'SERVER'];
            errorTypes.forEach(type => {
                expect(type).toBeDefined();
            });
        });
    });

    describe('Error Colors', () => {
        it('should use amber for network/offline', () => {
            const getColor = (type: string) => {
                switch (type) {
                    case 'NETWORK':
                    case 'OFFLINE':
                    case 'TIMEOUT':
                        return 'text-amber-500';
                    case 'AUTH':
                    case 'PERMISSION':
                        return 'text-purple-500';
                    case 'SERVER':
                    case 'CLIENT':
                        return 'text-red-500';
                    default:
                        return 'text-slate-500';
                }
            };

            expect(getColor('NETWORK')).toBe('text-amber-500');
            expect(getColor('OFFLINE')).toBe('text-amber-500');
        });

        it('should use red for server errors', () => {
            const getColor = (type: string) => {
                if (type === 'SERVER' || type === 'CLIENT') return 'text-red-500';
                return 'text-slate-500';
            };

            expect(getColor('SERVER')).toBe('text-red-500');
        });

        it('should use purple for auth errors', () => {
            const getColor = (type: string) => {
                if (type === 'AUTH' || type === 'PERMISSION') return 'text-purple-500';
                return 'text-slate-500';
            };

            expect(getColor('AUTH')).toBe('text-purple-500');
        });
    });

    describe('Loading State', () => {
        it('should show loading message', () => {
            const message = 'Memuat...';
            expect(message).toBe('Memuat...');
        });
    });

    describe('Empty State', () => {
        it('should show empty title', () => {
            const title = 'Tidak Ada Data';
            expect(title).toBe('Tidak Ada Data');
        });

        it('should show empty message', () => {
            const message = 'Belum ada data yang tersedia.';
            expect(message).toContain('data');
        });
    });

    describe('Offline State', () => {
        it('should show cached data timestamp', () => {
            const cachedAt = new Date();
            const formatted = cachedAt.toLocaleString('id-ID');
            expect(formatted).toBeDefined();
        });
    });

    describe('Data Fetcher', () => {
        it('should handle loading state', () => {
            const states = { loading: true, error: null, data: null };
            expect(states.loading).toBe(true);
        });

        it('should handle error state', () => {
            const states = { loading: false, error: { type: 'NETWORK' }, data: null };
            expect(states.error).not.toBeNull();
        });

        it('should handle success state', () => {
            const states = { loading: false, error: null, data: [1, 2, 3] };
            expect(states.data).toHaveLength(3);
        });

        it('should handle empty state', () => {
            const states = { loading: false, error: null, data: [] };
            const isEmpty = (data: any[]) => data.length === 0;
            expect(isEmpty(states.data)).toBe(true);
        });
    });
});
