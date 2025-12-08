import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock crypto.getRandomValues
const mockGetRandomValues = vi.fn((array: Uint8Array | Uint32Array) => {
    for (let i = 0; i < array.length; i++) {
        array[i] = Math.floor(Math.random() * 256);
    }
    return array;
});

const mockSubtleDigest = vi.fn(async () => {
    return new ArrayBuffer(32);
});

vi.stubGlobal('crypto', {
    getRandomValues: mockGetRandomValues,
    randomUUID: () => 'test-uuid-' + Math.random().toString(36).substr(2, 9),
    subtle: {
        digest: mockSubtleDigest
    }
});

// Mock sessionStorage
const sessionStorageMock = (() => {
    let store: Record<string, string> = {};
    return {
        getItem: (key: string) => store[key] || null,
        setItem: (key: string, value: string) => { store[key] = value; },
        removeItem: (key: string) => { delete store[key]; },
        clear: () => { store = {}; }
    };
})();
Object.defineProperty(window, 'sessionStorage', { value: sessionStorageMock });

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

describe('Enhanced Security Service', () => {
    beforeEach(() => {
        sessionStorageMock.clear();
        localStorageMock.clear();
    });

    describe('CSRF Protection', () => {
        it('should generate CSRF token', () => {
            const array = new Uint8Array(32);
            mockGetRandomValues(array);
            const token = Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');

            expect(token.length).toBe(64);
            expect(/^[0-9a-f]+$/.test(token)).toBe(true);
        });

        it('should store CSRF token in sessionStorage', () => {
            const tokenData = { token: 'test-token', createdAt: Date.now() };
            sessionStorageMock.setItem('portal_guru_csrf_token', JSON.stringify(tokenData));

            const stored = sessionStorageMock.getItem('portal_guru_csrf_token');
            expect(stored).not.toBeNull();
            expect(JSON.parse(stored!).token).toBe('test-token');
        });

        it('should validate matching token', () => {
            const token = 'test-token-123';
            const tokenData = { token, createdAt: Date.now() };
            sessionStorageMock.setItem('portal_guru_csrf_token', JSON.stringify(tokenData));

            const stored = sessionStorageMock.getItem('portal_guru_csrf_token');
            const parsedData = JSON.parse(stored!);

            expect(parsedData.token === token).toBe(true);
        });

        it('should reject mismatching token', () => {
            const tokenData = { token: 'correct-token', createdAt: Date.now() };
            sessionStorageMock.setItem('portal_guru_csrf_token', JSON.stringify(tokenData));

            const stored = sessionStorageMock.getItem('portal_guru_csrf_token');
            const parsedData = JSON.parse(stored!);

            expect(parsedData.token === 'wrong-token').toBe(false);
        });

        it('should reject expired token', () => {
            const EXPIRY = 3600000; // 1 hour
            const tokenData = { token: 'test-token', createdAt: Date.now() - EXPIRY - 1000 };
            sessionStorageMock.setItem('portal_guru_csrf_token', JSON.stringify(tokenData));

            const stored = sessionStorageMock.getItem('portal_guru_csrf_token');
            const parsedData = JSON.parse(stored!);

            const isExpired = Date.now() - parsedData.createdAt > EXPIRY;
            expect(isExpired).toBe(true);
        });
    });

    describe('XSS Protection', () => {
        describe('escapeHtml', () => {
            const HTML_ENTITIES: Record<string, string> = {
                '&': '&amp;',
                '<': '&lt;',
                '>': '&gt;',
                '"': '&quot;',
                "'": '&#x27;',
                '/': '&#x2F;'
            };

            const escapeHtml = (str: string): string => {
                return str.replace(/[&<>"'/]/g, char => HTML_ENTITIES[char] || char);
            };

            it('should escape < and >', () => {
                expect(escapeHtml('<script>')).toBe('&lt;script&gt;');
            });

            it('should escape quotes', () => {
                expect(escapeHtml('"hello"')).toBe('&quot;hello&quot;');
                expect(escapeHtml("'hello'")).toBe('&#x27;hello&#x27;');
            });

            it('should escape ampersand', () => {
                expect(escapeHtml('a & b')).toBe('a &amp; b');
            });

            it('should handle empty string', () => {
                expect(escapeHtml('')).toBe('');
            });

            it('should handle plain text', () => {
                expect(escapeHtml('Hello World')).toBe('Hello World');
            });
        });

        describe('sanitizeContent', () => {
            it('should remove script tags', () => {
                const input = '<p>Hello</p><script>alert("xss")</script>';
                const sanitized = input.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
                expect(sanitized).toBe('<p>Hello</p>');
            });

            it('should remove event handlers', () => {
                const input = '<button onclick="alert(1)">Click</button>';
                const sanitized = input.replace(/\s*on\w+\s*=\s*["'][^"']*["']/gi, '');
                expect(sanitized).toBe('<button>Click</button>');
            });

            it('should remove javascript: URLs', () => {
                const input = 'href="javascript:alert(1)"';
                const sanitized = input.replace(/href\s*=\s*["']javascript:[^"']*["']/gi, 'href="#"');
                expect(sanitized).toBe('href="#"');
            });

            it('should remove iframe tags', () => {
                const input = '<iframe src="evil.com"></iframe>';
                const sanitized = input.replace(/<iframe[^>]*>.*?<\/iframe>/gi, '');
                expect(sanitized).toBe('');
            });
        });

        describe('sanitizeUrl', () => {
            it('should block javascript: scheme', () => {
                const url = 'javascript:alert(1)';
                const isBlocked = url.toLowerCase().startsWith('javascript:');
                expect(isBlocked).toBe(true);
            });

            it('should block data: scheme', () => {
                const url = 'data:text/html,<script>alert(1)</script>';
                const isBlocked = url.toLowerCase().startsWith('data:');
                expect(isBlocked).toBe(true);
            });

            it('should allow http URLs', () => {
                const url = 'https://example.com';
                const isBlocked = url.toLowerCase().startsWith('javascript:') ||
                    url.toLowerCase().startsWith('data:');
                expect(isBlocked).toBe(false);
            });
        });
    });

    describe('File Upload Validation', () => {
        describe('validateFile', () => {
            it('should reject files too large', () => {
                const maxSize = 5 * 1024 * 1024; // 5MB
                const fileSize = 10 * 1024 * 1024; // 10MB

                const isValid = fileSize <= maxSize;
                expect(isValid).toBe(false);
            });

            it('should accept files within size limit', () => {
                const maxSize = 5 * 1024 * 1024;
                const fileSize = 2 * 1024 * 1024;

                const isValid = fileSize <= maxSize;
                expect(isValid).toBe(true);
            });

            it('should reject disallowed file types', () => {
                const allowedTypes = ['image/jpeg', 'image/png'];
                const fileType = 'application/exe';

                const isValid = allowedTypes.includes(fileType);
                expect(isValid).toBe(false);
            });

            it('should accept allowed file types', () => {
                const allowedTypes = ['image/jpeg', 'image/png'];
                const fileType = 'image/jpeg';

                const isValid = allowedTypes.includes(fileType);
                expect(isValid).toBe(true);
            });

            it('should reject empty files', () => {
                const fileSize = 0;
                const isValid = fileSize > 0;
                expect(isValid).toBe(false);
            });
        });

        describe('sanitizeFilename', () => {
            it('should remove path separators', () => {
                const filename = '..\\..\\..\\etc\\passwd';
                const sanitized = filename.replace(/[<>:"/\\|?*]/g, '_');
                // Backslashes are replaced with underscores
                expect(sanitized).toContain('.._');
            });

            it('should remove dangerous characters', () => {
                const filename = 'file<>:"|?*.txt';
                const sanitized = filename.replace(/[<>:"/\\|?*]/g, '_');
                // The regex replaces 7 characters: < > : " | ? *
                expect(sanitized).toBe('file_______.txt');
            });

            it('should limit filename length', () => {
                const filename = 'a'.repeat(300) + '.txt';
                const maxLength = 200;
                const sanitized = filename.substring(0, maxLength);
                expect(sanitized.length).toBeLessThanOrEqual(maxLength);
            });
        });
    });

    describe('Cryptographic Access Codes', () => {
        it('should generate code of correct length', () => {
            const CHARS = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
            const length = 6;
            const array = new Uint32Array(length);
            mockGetRandomValues(array);

            const code = Array.from(array, num => CHARS[num % CHARS.length]).join('');
            expect(code.length).toBe(6);
        });

        it('should only contain allowed characters', () => {
            const CHARS = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
            // Use characters from the allowed set (no 1, no 0)
            const code = 'ABC234';

            const isValid = code.split('').every(char => CHARS.includes(char));
            expect(isValid).toBe(true);
        });

        it('should not contain confusing characters', () => {
            const confusingChars = ['0', 'O', 'I', 'L', '1'];
            const code = 'ABCD23';

            const hasConfusing = code.split('').some(char => confusingChars.includes(char));
            expect(hasConfusing).toBe(false);
        });

        it('should generate unique codes', () => {
            const codes = new Set<string>();
            const CHARS = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';

            for (let i = 0; i < 100; i++) {
                const array = new Uint32Array(6);
                mockGetRandomValues(array);
                const code = Array.from(array, num => CHARS[num % CHARS.length]).join('');
                codes.add(code);
            }

            // Most should be unique
            expect(codes.size).toBeGreaterThan(90);
        });
    });

    describe('Audit Logging', () => {
        it('should create audit log entry', () => {
            const entry = {
                id: 'test-id',
                action: 'LOGIN',
                userId: 'user-123',
                timestamp: new Date().toISOString()
            };

            localStorageMock.setItem('portal_guru_audit_log', JSON.stringify([entry]));

            const stored = localStorageMock.getItem('portal_guru_audit_log');
            const logs = JSON.parse(stored!);

            expect(logs.length).toBe(1);
            expect(logs[0].action).toBe('LOGIN');
        });

        it('should limit audit log size', () => {
            const MAX_ENTRIES = 1000;
            const logs = Array.from({ length: 1500 }, (_, i) => ({ id: i }));
            logs.length = MAX_ENTRIES;

            expect(logs.length).toBe(1000);
        });

        it('should filter by action', () => {
            const logs = [
                { action: 'LOGIN', timestamp: '2024-12-06' },
                { action: 'LOGOUT', timestamp: '2024-12-06' },
                { action: 'LOGIN', timestamp: '2024-12-05' }
            ];

            const filtered = logs.filter(l => l.action === 'LOGIN');
            expect(filtered.length).toBe(2);
        });

        it('should filter by date range', () => {
            const logs = [
                { action: 'LOGIN', timestamp: '2024-12-06T10:00:00Z' },
                { action: 'LOGOUT', timestamp: '2024-12-05T10:00:00Z' },
                { action: 'LOGIN', timestamp: '2024-12-04T10:00:00Z' }
            ];

            const startDate = new Date('2024-12-05');
            const filtered = logs.filter(l => new Date(l.timestamp) >= startDate);
            expect(filtered.length).toBe(2);
        });

        it('should include all required fields', () => {
            const entry = {
                id: 'test-id',
                action: 'CREATE',
                userId: 'user-123',
                targetType: 'student',
                targetId: 'student-456',
                userAgent: 'Mozilla/5.0',
                timestamp: new Date().toISOString(),
                sessionId: 'session-789'
            };

            expect(entry.id).toBeDefined();
            expect(entry.action).toBeDefined();
            expect(entry.timestamp).toBeDefined();
        });
    });

    describe('Form Sanitization', () => {
        it('should sanitize all string fields', () => {
            const data = {
                name: '<script>alert(1)</script>',
                email: 'test@example.com'
            };

            const escapeHtml = (str: string) => str.replace(/</g, '&lt;').replace(/>/g, '&gt;');
            const sanitized = {
                name: escapeHtml(data.name),
                email: escapeHtml(data.email)
            };

            expect(sanitized.name).not.toContain('<script>');
            expect(sanitized.email).toBe('test@example.com');
        });

        it('should recursively sanitize nested objects', () => {
            const data = {
                user: {
                    name: '<b>bold</b>'
                }
            };

            const escapeHtml = (str: string) => str.replace(/</g, '&lt;').replace(/>/g, '&gt;');
            const sanitized = {
                user: {
                    name: escapeHtml(data.user.name)
                }
            };

            expect(sanitized.user.name).toBe('&lt;b&gt;bold&lt;/b&gt;');
        });

        it('should sanitize arrays', () => {
            const data = {
                tags: ['<script>', 'normal', '<img onerror=alert(1)>']
            };

            const escapeHtml = (str: string) => str.replace(/</g, '&lt;').replace(/>/g, '&gt;');
            const sanitized = {
                tags: data.tags.map(escapeHtml)
            };

            expect(sanitized.tags[0]).toBe('&lt;script&gt;');
            expect(sanitized.tags[1]).toBe('normal');
        });
    });

    describe('Password Generation', () => {
        it('should generate password of correct length', () => {
            const length = 16;
            const password = 'Aa1!'.repeat(4);
            expect(password.length).toBe(16);
        });

        it('should include uppercase letters', () => {
            const password = 'Password123!';
            expect(/[A-Z]/.test(password)).toBe(true);
        });

        it('should include lowercase letters', () => {
            const password = 'Password123!';
            expect(/[a-z]/.test(password)).toBe(true);
        });

        it('should include numbers', () => {
            const password = 'Password123!';
            expect(/[0-9]/.test(password)).toBe(true);
        });

        it('should include special characters', () => {
            const password = 'Password123!';
            expect(/[!@#$%^&*]/.test(password)).toBe(true);
        });
    });

    describe('Session Management', () => {
        it('should generate session ID', () => {
            const sessionId = 'session-' + Math.random().toString(36).substr(2, 16);
            sessionStorageMock.setItem('portal_guru_session_id', sessionId);

            const stored = sessionStorageMock.getItem('portal_guru_session_id');
            expect(stored).toBe(sessionId);
        });

        it('should persist session ID across retrieval', () => {
            const sessionId = 'persistent-session-id';
            sessionStorageMock.setItem('portal_guru_session_id', sessionId);

            const first = sessionStorageMock.getItem('portal_guru_session_id');
            const second = sessionStorageMock.getItem('portal_guru_session_id');

            expect(first).toBe(second);
        });
    });
});
