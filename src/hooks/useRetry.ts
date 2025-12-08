import { useState, useCallback, useRef } from 'react';

interface RetryOptions {
    maxRetries?: number;
    retryDelay?: number; // ms
    backoffMultiplier?: number;
    onRetry?: (attempt: number, error: Error) => void;
}

interface RetryState<T> {
    data: T | null;
    error: Error | null;
    isLoading: boolean;
    attempt: number;
    canRetry: boolean;
}

// User-friendly error messages
const ERROR_MESSAGES: Record<string, string> = {
    // Network errors
    'Failed to fetch': 'Tidak dapat terhubung ke server. Periksa koneksi internet Anda.',
    'Network Error': 'Tidak dapat terhubung ke server. Periksa koneksi internet Anda.',
    'NetworkError': 'Tidak dapat terhubung ke server. Periksa koneksi internet Anda.',
    'ERR_NETWORK': 'Tidak dapat terhubung ke server. Periksa koneksi internet Anda.',
    'ERR_INTERNET_DISCONNECTED': 'Tidak ada koneksi internet.',

    // Timeout
    'timeout': 'Waktu permintaan habis. Coba lagi.',
    'AbortError': 'Permintaan dibatalkan.',

    // Auth errors
    'Unauthorized': 'Sesi Anda telah berakhir. Silakan login kembali.',
    '401': 'Sesi Anda telah berakhir. Silakan login kembali.',
    'JWT expired': 'Sesi Anda telah berakhir. Silakan login kembali.',

    // Permission errors
    'Forbidden': 'Anda tidak memiliki izin untuk melakukan tindakan ini.',
    '403': 'Anda tidak memiliki izin untuk melakukan tindakan ini.',

    // Not found
    '404': 'Data yang diminta tidak ditemukan.',
    'Not Found': 'Data yang diminta tidak ditemukan.',

    // Server errors
    '500': 'Terjadi kesalahan pada server. Coba lagi nanti.',
    '502': 'Server sedang tidak tersedia. Coba lagi nanti.',
    '503': 'Layanan sedang tidak tersedia. Coba lagi nanti.',
    'Internal Server Error': 'Terjadi kesalahan pada server. Coba lagi nanti.',

    // Supabase specific
    'row not found': 'Data tidak ditemukan.',
    'duplicate key': 'Data sudah ada. Gunakan data yang berbeda.',
    'violates foreign key': 'Data terkait dengan data lain dan tidak dapat dihapus.',
    'violates check constraint': 'Data tidak valid sesuai dengan ketentuan.',

    // Storage errors
    'Payload too large': 'Ukuran file terlalu besar.',
    'Invalid image': 'Format gambar tidak valid.',
    'storage error': 'Gagal menyimpan file.',

    // Default
    'default': 'Terjadi kesalahan. Silakan coba lagi.',
};

// Convert technical error to user-friendly message
export const getUserFriendlyError = (error: any): string => {
    if (!error) return ERROR_MESSAGES.default;

    const errorString = error.message || error.toString() || '';
    const errorCode = error.code || error.status || '';

    // Check for known error patterns
    for (const [pattern, message] of Object.entries(ERROR_MESSAGES)) {
        if (
            errorString.toLowerCase().includes(pattern.toLowerCase()) ||
            errorCode.toString() === pattern
        ) {
            return message;
        }
    }

    return ERROR_MESSAGES.default;
};

// Retry hook
export const useRetry = <T,>(
    asyncFn: () => Promise<T>,
    options: RetryOptions = {}
): RetryState<T> & { execute: () => Promise<T | null>; retry: () => Promise<T | null>; reset: () => void } => {
    const {
        maxRetries = 3,
        retryDelay = 1000,
        backoffMultiplier = 2,
        onRetry,
    } = options;

    const [state, setState] = useState<RetryState<T>>({
        data: null,
        error: null,
        isLoading: false,
        attempt: 0,
        canRetry: true,
    });

    const attemptRef = useRef(0);

    const execute = useCallback(async (): Promise<T | null> => {
        setState(prev => ({ ...prev, isLoading: true, error: null }));
        attemptRef.current = 0;

        const tryExecute = async (): Promise<T | null> => {
            try {
                const result = await asyncFn();
                setState({
                    data: result,
                    error: null,
                    isLoading: false,
                    attempt: attemptRef.current,
                    canRetry: true,
                });
                return result;
            } catch (error: any) {
                attemptRef.current++;

                if (attemptRef.current <= maxRetries) {
                    onRetry?.(attemptRef.current, error);

                    // Wait before retry with exponential backoff
                    const delay = retryDelay * Math.pow(backoffMultiplier, attemptRef.current - 1);
                    await new Promise(resolve => setTimeout(resolve, delay));

                    return tryExecute();
                }

                setState({
                    data: null,
                    error,
                    isLoading: false,
                    attempt: attemptRef.current,
                    canRetry: true,
                });
                return null;
            }
        };

        return tryExecute();
    }, [asyncFn, maxRetries, retryDelay, backoffMultiplier, onRetry]);

    const retry = useCallback(async (): Promise<T | null> => {
        return execute();
    }, [execute]);

    const reset = useCallback(() => {
        setState({
            data: null,
            error: null,
            isLoading: false,
            attempt: 0,
            canRetry: true,
        });
        attemptRef.current = 0;
    }, []);

    return { ...state, execute, retry, reset };
};

// Upload with retry
export const useUploadWithRetry = (options: RetryOptions = {}) => {
    const [progress, setProgress] = useState(0);
    const [status, setStatus] = useState<'idle' | 'uploading' | 'retrying' | 'success' | 'error'>('idle');
    const [error, setError] = useState<string | null>(null);
    const [attempt, setAttempt] = useState(0);

    const { maxRetries = 3, retryDelay = 2000 } = options;

    const upload = useCallback(async (
        uploadFn: (onProgress?: (progress: number) => void) => Promise<any>
    ) => {
        setStatus('uploading');
        setProgress(0);
        setError(null);
        let currentAttempt = 0;

        const tryUpload = async (): Promise<any> => {
            try {
                const result = await uploadFn((p) => setProgress(p));
                setStatus('success');
                setProgress(100);
                return result;
            } catch (err: any) {
                currentAttempt++;
                setAttempt(currentAttempt);

                if (currentAttempt <= maxRetries) {
                    setStatus('retrying');
                    setProgress(0);
                    await new Promise(resolve => setTimeout(resolve, retryDelay));
                    return tryUpload();
                }

                setStatus('error');
                setError(getUserFriendlyError(err));
                throw err;
            }
        };

        return tryUpload();
    }, [maxRetries, retryDelay]);

    const reset = useCallback(() => {
        setProgress(0);
        setStatus('idle');
        setError(null);
        setAttempt(0);
    }, []);

    return { upload, progress, status, error, attempt, reset };
};

export default useRetry;
