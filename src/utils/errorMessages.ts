/**
 * Actionable Error Messages
 * 
 * Provides user-friendly error messages with suggested actions
 */

export interface ActionableError {
    title: string;
    message: string;
    action?: string;
    actionLabel?: string;
    retryable: boolean;
    severity: 'warning' | 'error' | 'info';
}

type ErrorCode =
    | 'NETWORK_ERROR'
    | 'TIMEOUT'
    | 'UNAUTHORIZED'
    | 'FORBIDDEN'
    | 'NOT_FOUND'
    | 'CONFLICT'
    | 'VALIDATION_ERROR'
    | 'SERVER_ERROR'
    | 'QUOTA_EXCEEDED'
    | 'OFFLINE'
    | 'UNKNOWN';

/**
 * Map error codes to actionable messages
 */
const errorMessages: Record<ErrorCode, ActionableError> = {
    NETWORK_ERROR: {
        title: 'Koneksi Terputus',
        message: 'Tidak dapat terhubung ke server. Periksa koneksi internet Anda.',
        action: 'retry',
        actionLabel: 'Coba Lagi',
        retryable: true,
        severity: 'warning',
    },
    TIMEOUT: {
        title: 'Waktu Habis',
        message: 'Server terlalu lama merespons. Ini mungkin karena koneksi lambat atau server sibuk.',
        action: 'retry',
        actionLabel: 'Coba Lagi',
        retryable: true,
        severity: 'warning',
    },
    UNAUTHORIZED: {
        title: 'Sesi Berakhir',
        message: 'Silakan login kembali untuk melanjutkan.',
        action: 'login',
        actionLabel: 'Login',
        retryable: false,
        severity: 'error',
    },
    FORBIDDEN: {
        title: 'Akses Ditolak',
        message: 'Anda tidak memiliki izin untuk melakukan aksi ini. Hubungi administrator jika ini seharusnya diizinkan.',
        retryable: false,
        severity: 'error',
    },
    NOT_FOUND: {
        title: 'Data Tidak Ditemukan',
        message: 'Data yang Anda cari tidak ada atau telah dihapus.',
        action: 'refresh',
        actionLabel: 'Muat Ulang',
        retryable: false,
        severity: 'warning',
    },
    CONFLICT: {
        title: 'Konflik Data',
        message: 'Data telah diubah oleh pengguna lain. Muat ulang halaman untuk melihat perubahan terbaru.',
        action: 'refresh',
        actionLabel: 'Muat Ulang',
        retryable: false,
        severity: 'warning',
    },
    VALIDATION_ERROR: {
        title: 'Data Tidak Valid',
        message: 'Beberapa data yang Anda masukkan tidak valid. Periksa kembali form Anda.',
        retryable: false,
        severity: 'warning',
    },
    SERVER_ERROR: {
        title: 'Kesalahan Server',
        message: 'Terjadi kesalahan di server. Tim teknis telah diberi tahu. Coba lagi nanti.',
        action: 'retry',
        actionLabel: 'Coba Lagi',
        retryable: true,
        severity: 'error',
    },
    QUOTA_EXCEEDED: {
        title: 'Kuota Terlampaui',
        message: 'Anda telah mencapai batas penggunaan. Tunggu beberapa saat sebelum mencoba lagi.',
        retryable: false,
        severity: 'warning',
    },
    OFFLINE: {
        title: 'Mode Offline',
        message: 'Anda sedang offline. Data akan disimpan dan dikirim saat online kembali.',
        retryable: false,
        severity: 'info',
    },
    UNKNOWN: {
        title: 'Terjadi Kesalahan',
        message: 'Terjadi kesalahan yang tidak diketahui. Coba lagi atau hubungi support.',
        action: 'retry',
        actionLabel: 'Coba Lagi',
        retryable: true,
        severity: 'error',
    },
};

/**
 * Parse error and return actionable error object
 */
export const parseError = (error: unknown): ActionableError => {
    // Check if offline first
    if (!navigator.onLine) {
        return errorMessages.OFFLINE;
    }

    if (error instanceof Error) {
        const message = error.message.toLowerCase();

        // Network errors
        if (message.includes('network') || message.includes('fetch') || message.includes('connection')) {
            return errorMessages.NETWORK_ERROR;
        }

        // Timeout
        if (message.includes('timeout') || message.includes('timed out')) {
            return errorMessages.TIMEOUT;
        }

        // Auth errors
        if (message.includes('401') || message.includes('unauthorized') || message.includes('not authenticated')) {
            return errorMessages.UNAUTHORIZED;
        }

        // Permission errors
        if (message.includes('403') || message.includes('forbidden') || message.includes('permission')) {
            return errorMessages.FORBIDDEN;
        }

        // Not found
        if (message.includes('404') || message.includes('not found')) {
            return errorMessages.NOT_FOUND;
        }

        // Conflict
        if (message.includes('409') || message.includes('conflict') || message.includes('already exists')) {
            return errorMessages.CONFLICT;
        }

        // Validation
        if (message.includes('validation') || message.includes('invalid') || message.includes('422')) {
            return errorMessages.VALIDATION_ERROR;
        }

        // Server errors
        if (message.includes('500') || message.includes('internal') || message.includes('server')) {
            return errorMessages.SERVER_ERROR;
        }

        // Rate limiting
        if (message.includes('429') || message.includes('too many') || message.includes('rate limit')) {
            return errorMessages.QUOTA_EXCEEDED;
        }
    }

    // Check for HTTP response objects
    if (typeof error === 'object' && error !== null) {
        const err = error as Record<string, unknown>;

        if ('status' in err) {
            const status = err.status as number;
            if (status === 401) return errorMessages.UNAUTHORIZED;
            if (status === 403) return errorMessages.FORBIDDEN;
            if (status === 404) return errorMessages.NOT_FOUND;
            if (status === 409) return errorMessages.CONFLICT;
            if (status === 422) return errorMessages.VALIDATION_ERROR;
            if (status === 429) return errorMessages.QUOTA_EXCEEDED;
            if (status >= 500) return errorMessages.SERVER_ERROR;
        }
    }

    return errorMessages.UNKNOWN;
};

/**
 * Get error code from error object
 */
export const getErrorCode = (error: unknown): ErrorCode => {
    const actionableError = parseError(error);

    // Find matching error code
    for (const [code, errMsg] of Object.entries(errorMessages)) {
        if (errMsg.title === actionableError.title) {
            return code as ErrorCode;
        }
    }

    return 'UNKNOWN';
};

/**
 * Create a user-friendly error message string
 */
export const formatErrorMessage = (error: unknown): string => {
    const actionableError = parseError(error);
    return `${actionableError.title}: ${actionableError.message}`;
};

export default {
    parseError,
    getErrorCode,
    formatErrorMessage,
    errorMessages,
};
