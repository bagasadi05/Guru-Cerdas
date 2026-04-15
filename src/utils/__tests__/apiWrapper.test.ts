import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import fc from 'fast-check';
import { safeApiCall } from '../apiWrapper';
import { logger } from '../../services/logger';

describe('apiWrapper Property Tests', () => {
    beforeEach(() => {
        logger.clearStoredLogs();
        vi.useFakeTimers();
        vi.spyOn(logger, 'error').mockImplementation(() => undefined);
    });

    afterEach(() => {
        vi.useRealTimers();
        vi.restoreAllMocks();
    });

    // Property: successful call returns the result
    it('should return the result of a successful API call', async () => {
        await fc.assert(
            fc.asyncProperty(
                fc.anything(), // any return value
                async (expected) => {
                    const fn = vi.fn().mockResolvedValue(expected);
                    const result = await safeApiCall(fn, { retries: 0 });
                    expect(result).toEqual(expected);
                    expect(fn).toHaveBeenCalledOnce();
                }
            )
        );
    });

    // Property: error logging on failure
    // Validates: Requirements 3.2
    it('should log an error and include context/attempt info when API call fails', async () => {
        await fc.assert(
            fc.asyncProperty(
                fc.string({ minLength: 1 }), // context
                fc.string({ minLength: 1 }), // error message
                async (context, errorMsg) => {
                    vi.mocked(logger.error).mockClear();
                    const fn = vi.fn().mockImplementation(async () => {
                        throw new Error(errorMsg);
                    });
                    const promise = safeApiCall(fn, { retries: 0, context });
                    void promise.catch(() => undefined);
                    await vi.runAllTimersAsync();
                    await expect(promise).rejects.toThrow(errorMsg);

                    expect(logger.error).toHaveBeenCalled();

                    const lastCall = vi.mocked(logger.error).mock.calls[
                        vi.mocked(logger.error).mock.calls.length - 1
                    ];
                    // Data argument should include context and attempt info
                    const dataArg = lastCall[2] as Record<string, unknown>;
                    expect(dataArg).toBeDefined();
                    expect(dataArg).toEqual(expect.objectContaining({ context, attempt: 1 }));
                }
            )
        );
    });

    // Property: retries the configured number of times before throwing
    it('should retry exactly `retries` times before re-throwing', async () => {
        await fc.assert(
            fc.asyncProperty(
                fc.integer({ min: 0, max: 3 }), // number of retries
                async (retries) => {
                    const fn = vi.fn().mockImplementation(async () => {
                        throw new Error('fail');
                    });
                    const promise = safeApiCall(fn, { retries, backoff: 1 });
                    void promise.catch(() => undefined);
                    await vi.runAllTimersAsync();
                    await expect(promise).rejects.toThrow();
                    // Should be called: 1 initial + retries
                    expect(fn).toHaveBeenCalledTimes(retries + 1);
                }
            )
        );
    });
});
