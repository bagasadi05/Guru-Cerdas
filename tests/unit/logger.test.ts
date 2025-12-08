import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { logger, LogLevel, Logger } from '../../src/services/logger';

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

describe('Logger Service', () => {
    beforeEach(() => {
        localStorageMock.clear();
        vi.clearAllMocks();
    });

    describe('Log Levels', () => {
        it('should have correct log levels defined', () => {
            expect(LogLevel.DEBUG).toBe('DEBUG');
            expect(LogLevel.INFO).toBe('INFO');
            expect(LogLevel.WARN).toBe('WARN');
            expect(LogLevel.ERROR).toBe('ERROR');
            expect(LogLevel.FATAL).toBe('FATAL');
        });
    });

    describe('Logging Methods', () => {
        it('should have debug method', () => {
            expect(() => logger.debug('test message')).not.toThrow();
        });

        it('should have info method', () => {
            expect(() => logger.info('test message')).not.toThrow();
        });

        it('should have warn method', () => {
            expect(() => logger.warn('test message')).not.toThrow();
        });

        it('should have error method', () => {
            expect(() => logger.error('test message')).not.toThrow();
        });

        it('should have fatal method', () => {
            expect(() => logger.fatal('test message')).not.toThrow();
        });
    });

    describe('Context and Data', () => {
        it('should accept context parameter', () => {
            expect(() => logger.info('test', 'TestContext')).not.toThrow();
        });

        it('should accept data parameter', () => {
            expect(() => logger.info('test', 'TestContext', { key: 'value' })).not.toThrow();
        });

        it('should accept error parameter', () => {
            const error = new Error('Test error');
            expect(() => logger.error('test', 'TestContext', error)).not.toThrow();
        });
    });

    describe('Log Storage', () => {
        it('should store logs', () => {
            logger.info('stored message', 'TestContext');
            const logs = logger.getStoredLogs();
            expect(logs.length).toBeGreaterThan(0);
        });

        it('should clear logs', () => {
            logger.info('message to clear');
            logger.clearStoredLogs();
            const logs = logger.getStoredLogs();
            expect(logs.length).toBe(0);
        });

        it('should export logs as string', () => {
            logger.info('exportable message');
            const exported = logger.exportLogs();
            expect(typeof exported).toBe('string');
        });
    });

    describe('Error Tracking', () => {
        it('should track errors separately', () => {
            logger.error('tracked error', 'Test', new Error('Test'));
            const errors = logger.getErrorLogs();
            expect(errors.length).toBeGreaterThan(0);
        });
    });

    describe('Tracking Methods', () => {
        it('should have trackAction method', () => {
            expect(() => logger.trackAction('click', 'Button')).not.toThrow();
        });

        it('should have trackApiCall method', () => {
            expect(() => logger.trackApiCall('GET', '/api/test', 100, true)).not.toThrow();
        });

        it('should have trackPerformance method', () => {
            expect(() => logger.trackPerformance('render', 50)).not.toThrow();
        });
    });

    describe('User ID', () => {
        it('should set user ID', () => {
            expect(() => logger.setUserId('user-123')).not.toThrow();
        });

        it('should accept null user ID', () => {
            expect(() => logger.setUserId(null)).not.toThrow();
        });
    });

    describe('Configuration', () => {
        it('should accept config changes', () => {
            expect(() => logger.setConfig({ enableConsole: false })).not.toThrow();
        });
    });
});

describe('Logger Error Handling', () => {
    it('should not throw on invalid data', () => {
        expect(() => logger.info('test', undefined, undefined)).not.toThrow();
    });

    it('should handle circular references in data', () => {
        const circular: any = { name: 'test' };
        circular.self = circular;
        // Should not crash even with circular reference
        expect(() => logger.debug('test', 'Context', circular)).not.toThrow();
    });
});
