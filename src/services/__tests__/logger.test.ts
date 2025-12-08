import { describe, it, expect, beforeEach } from 'vitest';
import fc from 'fast-check';
import { logger, LogLevel, LogEntry } from '../logger';

describe('LoggerService Property Tests', () => {
    beforeEach(() => {
        logger.clearStoredLogs();
        // Clear error logs manually since it's using a separate key
        localStorage.removeItem('portal_guru_errors');
    });

    // Property 1: Error handling completeness
    // Validates: Requirements 3.1
    it('should capture and store any error logged via logger.error', () => {
        fc.assert(
            fc.property(
                fc.string(), // message
                fc.string(), // component
                fc.string(), // error message
                (message, component, errorMsg) => {
                    const error = new Error(errorMsg);
                    logger.error(message, error, undefined, component);

                    const errorLogs = logger.getErrorLogs();
                    const storedLog = errorLogs[errorLogs.length - 1];

                    expect(storedLog).toBeDefined();
                    expect(storedLog.level).toBe(LogLevel.ERROR);
                    expect(storedLog.message).toBe(message);
                    expect(storedLog.component).toBe(component);
                    expect(storedLog.error).toBeDefined();
                    expect(storedLog.error?.message).toBe(errorMsg);
                }
            )
        );
    });

    // Property 3: Error log structure
    // Validates: Requirements 3.4
    it('should maintain correct log structure for all log entries', () => {
        fc.assert(
            fc.property(
                fc.constantFrom(LogLevel.INFO, LogLevel.WARN, LogLevel.DEBUG),
                fc.string(), // message
                fc.string(), // component
                (level, message, component) => {
                    // Call the appropriate method dynamically
                    switch (level) {
                        case LogLevel.INFO: logger.info(message, component); break;
                        case LogLevel.WARN: logger.warn(message, component); break;
                        case LogLevel.DEBUG: logger.debug(message, component); break;
                    }

                    const logs = logger.getStoredLogs();
                    const lastLog = logs[logs.length - 1];

                    expect(lastLog).toBeDefined();
                    expect(lastLog.timestamp).toBeDefined();
                    // ISO string check roughly
                    expect(new Date(lastLog.timestamp).toISOString()).toBe(lastLog.timestamp);
                    expect(lastLog.level).toBe(level);
                    expect(lastLog.message).toBe(message);
                    expect(lastLog.component).toBe(component);
                }
            )
        );
    });
});
