import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import fc from 'fast-check';
import { safeApiCall } from '../apiWrapper';
import { logger } from '../../services/logger';

describe('apiWrapper Property Tests', () => {
    beforeEach(() => {
        logger.clearStoredLogs();
        vi.spyOn(logger, 'error');
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    // Property 2: Network error logging
    // Validates: Requirements 3.2
    it('should log network errors with request details when API call fails', async () => {
        await fc.assert(
            fc.asyncProperty(
                fc.string({ minLength: 1 }), // url
                fc.constantFrom('GET', 'POST', 'PUT', 'DELETE'), // method
                fc.string(), // error message
                async (url, method, errorMsg) => {
                    // Mock API function that always fails
                    const apiError: any = new Error(errorMsg);
                    apiError.config = { url, method };

                    const apiFn = vi.fn().mockRejectedValue(apiError);

                    // We expect it to throw eventually
                    await expect(safeApiCall(apiFn, { retries: 0 })).rejects.toThrow(errorMsg);

                    // Check if logger.error was called
                    expect(logger.error).toHaveBeenCalled();

                    // Verify the last call arguments contains our URL and Method
                    const errorLogs = logger.getErrorLogs();
                    // Or inspect the spy if logs aren't persisting in test env easily (though they use localStorage mock usually)
                    // The spy gives us direct access to calls
                    const lastCall = vi.mocked(logger.error).mock.calls[vi.mocked(logger.error).mock.calls.length - 1];

                    // logger.error(message, error, data, component)
                    const dataArg = lastCall[2];

                    expect(dataArg).toBeDefined();
                    expect(dataArg).toEqual(expect.objectContaining({
                        url: url,
                        method: method
                    }));
                }
            )
        );
    });
});
