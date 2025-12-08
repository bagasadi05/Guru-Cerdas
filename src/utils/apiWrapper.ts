import { logger } from '../services/logger';

interface ApiOptions {
    retries?: number;
    backoff?: number; // Initial backoff in ms
    context?: string;
    showErrorToast?: boolean;
}

/**
 * Wraps an API call with retry logic and error logging
 */
export async function safeApiCall<T>(
    apiFn: () => Promise<T>,
    options: ApiOptions = {}
): Promise<T> {
    const {
        retries = 3,
        backoff = 1000,
        context = 'API',
        showErrorToast = true
    } = options;

    let attempt = 0;

    while (attempt <= retries) {
        try {
            return await apiFn();
        } catch (error: any) {
            attempt++;

            // Log the error
            logger.error(
                `API Call Failed (Attempt ${attempt}/${retries + 1}): ${error.message || 'Unknown error'}`,
                error,
                {
                    context,
                    attempt,
                    retries,
                    url: error?.config?.url || 'unknown',
                    method: error?.config?.method || 'unknown'
                },
                context
            );

            // If we've exhausted retries, throw
            if (attempt > retries) {
                // Optionally show toast here if we had access to toast function
                throw error;
            }

            // Wait before retry (exponential backoff)
            const delay = backoff * Math.pow(2, attempt - 1);
            await new Promise(resolve => setTimeout(resolve, delay));
        }
    }

    throw new Error('Unreachable');
}
