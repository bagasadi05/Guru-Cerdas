/**
 * Enhanced Error Handling & Monitoring Service
 * Features: Centralized error reporting, recovery strategies, 
 * user-friendly messages, network error handling, comprehensive context capture
 */

import { logger } from './logger';

// ============================================
// ERROR TYPES & CLASSIFICATION
// ============================================

export enum ErrorType {
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
    COMPONENT = 'COMPONENT',
    UNKNOWN = 'UNKNOWN'
}

export enum ErrorSeverity {
    LOW = 'low',
    MEDIUM = 'medium',
    HIGH = 'high',
    CRITICAL = 'critical'
}

export enum ErrorCategory {
    NETWORK = 'network',
    VALIDATION = 'validation',
    AUTHENTICATION = 'authentication',
    AUTHORIZATION = 'authorization',
    BUSINESS_LOGIC = 'business_logic',
    SYSTEM = 'system',
    UI = 'ui'
}

export interface AppError {
    id: string;
    type: ErrorType;
    category: ErrorCategory;
    message: string;
    userMessage: string;
    code?: string;
    severity: ErrorSeverity;
    timestamp: string;
    stack?: string;
    context?: Record<string, any>;
    recoverable: boolean;
    retryable: boolean;
    userId?: string;
    sessionId: string;
    component?: string;
    url: string;
    userAgent: string;
}

// ============================================
// USER-FRIENDLY ERROR MESSAGES
// ============================================

const ERROR_MESSAGES: Record<ErrorType, { title: string; message: string; action: string }> = {
    [ErrorType.NETWORK]: {
        title: 'Koneksi Bermasalah',
        message: 'Tidak dapat terhubung ke server. Periksa koneksi internet Anda.',
        action: 'Coba Lagi'
    },
    [ErrorType.AUTH]: {
        title: 'Sesi Berakhir',
        message: 'Sesi Anda telah berakhir. Silakan login kembali.',
        action: 'Login'
    },
    [ErrorType.VALIDATION]: {
        title: 'Data Tidak Valid',
        message: 'Beberapa data yang dimasukkan tidak valid. Periksa kembali form Anda.',
        action: 'Perbaiki'
    },
    [ErrorType.SERVER]: {
        title: 'Kesalahan Server',
        message: 'Terjadi kesalahan pada server. Tim kami sedang memperbaikinya.',
        action: 'Coba Lagi Nanti'
    },
    [ErrorType.CLIENT]: {
        title: 'Terjadi Kesalahan',
        message: 'Terjadi kesalahan pada aplikasi. Silakan refresh halaman.',
        action: 'Refresh'
    },
    [ErrorType.TIMEOUT]: {
        title: 'Waktu Habis',
        message: 'Permintaan membutuhkan waktu terlalu lama. Silakan coba lagi.',
        action: 'Coba Lagi'
    },
    [ErrorType.NOT_FOUND]: {
        title: 'Tidak Ditemukan',
        message: 'Data yang Anda cari tidak ditemukan atau telah dihapus.',
        action: 'Kembali'
    },
    [ErrorType.PERMISSION]: {
        title: 'Akses Ditolak',
        message: 'Anda tidak memiliki izin untuk mengakses halaman ini.',
        action: 'Kembali'
    },
    [ErrorType.RATE_LIMIT]: {
        title: 'Terlalu Banyak Permintaan',
        message: 'Anda telah melakukan terlalu banyak permintaan. Tunggu beberapa saat.',
        action: 'Tunggu'
    },
    [ErrorType.OFFLINE]: {
        title: 'Anda Offline',
        message: 'Tidak ada koneksi internet. Beberapa fitur mungkin terbatas.',
        action: 'Mode Offline'
    },
    [ErrorType.COMPONENT]: {
        title: 'Kesalahan Komponen',
        message: 'Terjadi kesalahan pada komponen aplikasi. Silakan refresh halaman.',
        action: 'Refresh'
    },
    [ErrorType.UNKNOWN]: {
        title: 'Terjadi Kesalahan',
        message: 'Terjadi kesalahan yang tidak diketahui. Silakan coba lagi.',
        action: 'Coba Lagi'
    }
};

// ============================================
// ERROR CLASSIFICATION
// ============================================

const SESSION_ID = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

export function classifyError(error: unknown, context?: Record<string, any>): AppError {
    const timestamp = new Date().toISOString();
    const errorId = crypto.randomUUID();
    const url = typeof window !== 'undefined' ? window.location.href : '';
    const userAgent = typeof navigator !== 'undefined' ? navigator.userAgent : '';
    const userId = getUserId();

    // Component errors (React Error Boundary)
    if (context?.componentStack) {
        let errorMessage: string;
        try {
            errorMessage = error instanceof Error ? error.message : String(error);
        } catch {
            errorMessage = '[Object cannot be converted to string]';
        }

        return {
            id: errorId,
            type: ErrorType.COMPONENT,
            category: ErrorCategory.UI,
            message: errorMessage,
            userMessage: ERROR_MESSAGES[ErrorType.COMPONENT].message,
            severity: ErrorSeverity.HIGH,
            timestamp,
            stack: error instanceof Error ? error.stack : undefined,
            context,
            recoverable: true,
            retryable: false,
            userId,
            sessionId: SESSION_ID,
            component: context.component,
            url,
            userAgent
        };
    }

    // Network errors
    if (error instanceof TypeError && (
        error.message.includes('fetch') || 
        error.message.includes('network') || 
        error.message.includes('connection')
    )) {
        return {
            id: errorId,
            type: ErrorType.NETWORK,
            category: ErrorCategory.NETWORK,
            message: error.message,
            userMessage: ERROR_MESSAGES[ErrorType.NETWORK].message,
            severity: ErrorSeverity.MEDIUM,
            timestamp,
            stack: error.stack,
            context,
            recoverable: true,
            retryable: true,
            userId,
            sessionId: SESSION_ID,
            url,
            userAgent
        };
    }

    // Offline
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
        return {
            id: errorId,
            type: ErrorType.OFFLINE,
            category: ErrorCategory.NETWORK,
            message: 'No internet connection',
            userMessage: ERROR_MESSAGES[ErrorType.OFFLINE].message,
            severity: ErrorSeverity.MEDIUM,
            timestamp,
            context,
            recoverable: true,
            retryable: true,
            userId,
            sessionId: SESSION_ID,
            url,
            userAgent
        };
    }

    // Response errors
    if (error instanceof Response || (error as any)?.status) {
        const status = (error as any).status;
        const statusText = (error as any).statusText || '';

        if (status === 401 || status === 403) {
            return {
                id: errorId,
                type: status === 401 ? ErrorType.AUTH : ErrorType.PERMISSION,
                category: status === 401 ? ErrorCategory.AUTHENTICATION : ErrorCategory.AUTHORIZATION,
                message: statusText,
                userMessage: ERROR_MESSAGES[status === 401 ? ErrorType.AUTH : ErrorType.PERMISSION].message,
                code: String(status),
                severity: ErrorSeverity.HIGH,
                timestamp,
                context,
                recoverable: status === 401,
                retryable: false,
                userId,
                sessionId: SESSION_ID,
                url,
                userAgent
            };
        }

        if (status === 404) {
            return {
                id: errorId,
                type: ErrorType.NOT_FOUND,
                category: ErrorCategory.BUSINESS_LOGIC,
                message: statusText,
                userMessage: ERROR_MESSAGES[ErrorType.NOT_FOUND].message,
                code: '404',
                severity: ErrorSeverity.LOW,
                timestamp,
                context,
                recoverable: true,
                retryable: false,
                userId,
                sessionId: SESSION_ID,
                url,
                userAgent
            };
        }

        if (status === 429) {
            return {
                id: errorId,
                type: ErrorType.RATE_LIMIT,
                category: ErrorCategory.SYSTEM,
                message: statusText,
                userMessage: ERROR_MESSAGES[ErrorType.RATE_LIMIT].message,
                code: '429',
                severity: ErrorSeverity.MEDIUM,
                timestamp,
                context,
                recoverable: true,
                retryable: true,
                userId,
                sessionId: SESSION_ID,
                url,
                userAgent
            };
        }

        if (status >= 500) {
            return {
                id: errorId,
                type: ErrorType.SERVER,
                category: ErrorCategory.SYSTEM,
                message: statusText,
                userMessage: ERROR_MESSAGES[ErrorType.SERVER].message,
                code: String(status),
                severity: ErrorSeverity.HIGH,
                timestamp,
                context,
                recoverable: true,
                retryable: true,
                userId,
                sessionId: SESSION_ID,
                url,
                userAgent
            };
        }
    }

    // Timeout errors
    if (error instanceof Error && error.name === 'AbortError') {
        return {
            id: errorId,
            type: ErrorType.TIMEOUT,
            category: ErrorCategory.NETWORK,
            message: error.message,
            userMessage: ERROR_MESSAGES[ErrorType.TIMEOUT].message,
            severity: ErrorSeverity.MEDIUM,
            timestamp,
            stack: error.stack,
            context,
            recoverable: true,
            retryable: true,
            userId,
            sessionId: SESSION_ID,
            url,
            userAgent
        };
    }

    // Validation errors
    if ((error as any)?.errors || (error as any)?.issues) {
        let validationMessage: string;
        try {
            validationMessage = JSON.stringify((error as any).errors || (error as any).issues);
        } catch {
            validationMessage = '[Validation errors cannot be serialized]';
        }

        return {
            id: errorId,
            type: ErrorType.VALIDATION,
            category: ErrorCategory.VALIDATION,
            message: validationMessage,
            userMessage: ERROR_MESSAGES[ErrorType.VALIDATION].message,
            severity: ErrorSeverity.LOW,
            timestamp,
            context: { 
                ...context, 
                errors: (error as any).errors || (error as any).issues 
            },
            recoverable: true,
            retryable: false,
            userId,
            sessionId: SESSION_ID,
            url,
            userAgent
        };
    }

    // Generic Error
    if (error instanceof Error) {
        return {
            id: errorId,
            type: ErrorType.CLIENT,
            category: ErrorCategory.SYSTEM,
            message: error.message,
            userMessage: ERROR_MESSAGES[ErrorType.CLIENT].message,
            severity: ErrorSeverity.MEDIUM,
            timestamp,
            stack: error.stack,
            context,
            recoverable: true,
            retryable: false,
            userId,
            sessionId: SESSION_ID,
            url,
            userAgent
        };
    }

    // Unknown error
    let errorMessage: string;
    try {
        errorMessage = String(error);
    } catch {
        errorMessage = '[Object cannot be converted to string]';
    }

    return {
        id: errorId,
        type: ErrorType.UNKNOWN,
        category: ErrorCategory.SYSTEM,
        message: errorMessage,
        userMessage: ERROR_MESSAGES[ErrorType.UNKNOWN].message,
        severity: ErrorSeverity.MEDIUM,
        timestamp,
        context,
        recoverable: true,
        retryable: true,
        userId,
        sessionId: SESSION_ID,
        url,
        userAgent
    };
}

function getUserId(): string | undefined {
    try {
        if (typeof localStorage === 'undefined') return undefined;
        const user = JSON.parse(localStorage.getItem('user') || '{}');
        return user.id;
    } catch {
        return undefined;
    }
}

// ============================================
// ERROR REPORTER (Sentry-like)
// ============================================

interface ErrorReport {
    id: string;
    error: AppError;
    user?: {
        id?: string;
        email?: string;
    };
    device: {
        userAgent: string;
        language: string;
        screen: string;
        online: boolean;
    };
    context: {
        url: string;
        referrer: string;
        timestamp: string;
    };
}

type ErrorReportCallback = (report: ErrorReport) => void | Promise<void>;

class ErrorReporter {
    private static instance: ErrorReporter;
    private enabled = true;
    private callbacks: ErrorReportCallback[] = [];
    private errorQueue: ErrorReport[] = [];
    private user?: { id?: string; email?: string };
    private maxQueueSize = 100;
    private flushInterval: ReturnType<typeof setInterval> | null = null;
    private monitoringEndpoint?: string;

    private constructor() {
        // Configure monitoring endpoint from environment
        this.monitoringEndpoint = import.meta.env.VITE_ERROR_MONITORING_ENDPOINT;
        
        // Start flush interval
        this.flushInterval = setInterval(() => this.flush(), 30000);

        // Listen for unhandled errors
        if (typeof window !== 'undefined') {
            window.addEventListener('error', this.handleGlobalError.bind(this));
            window.addEventListener('unhandledrejection', this.handleUnhandledRejection.bind(this));
        }
    }

    static getInstance(): ErrorReporter {
        if (!ErrorReporter.instance) {
            ErrorReporter.instance = new ErrorReporter();
        }
        return ErrorReporter.instance;
    }

    setUser(user?: { id?: string; email?: string }): void {
        this.user = user;
    }

    enable(): void {
        this.enabled = true;
    }

    disable(): void {
        this.enabled = false;
    }

    addCallback(callback: ErrorReportCallback): () => void {
        this.callbacks.push(callback);
        return () => {
            this.callbacks = this.callbacks.filter(cb => cb !== callback);
        };
    }

    report(error: unknown, context?: Record<string, any>): AppError {
        const appError = classifyError(error, context);

        if (!this.enabled) {
            return appError;
        }

        const report: ErrorReport = {
            id: appError.id,
            error: appError,
            user: this.user,
            device: {
                userAgent: appError.userAgent,
                language: typeof navigator !== 'undefined' ? navigator.language : 'unknown',
                screen: typeof window !== 'undefined' ? `${window.screen.width}x${window.screen.height}` : 'unknown',
                online: typeof navigator !== 'undefined' ? navigator.onLine : true
            },
            context: {
                url: appError.url,
                referrer: typeof document !== 'undefined' ? document.referrer : '',
                timestamp: appError.timestamp
            }
        };

        this.enqueue(report);

        // Log immediately for important errors
        if (appError.severity === ErrorSeverity.HIGH || appError.severity === ErrorSeverity.CRITICAL) {
            this.sendReport(report);
        }

        // Log to console in development
        logger.error(appError.message, 'ErrorReporter', report);

        return appError;
    }

    private enqueue(report: ErrorReport): void {
        this.errorQueue.push(report);

        if (this.errorQueue.length > this.maxQueueSize) {
            this.errorQueue.shift();
        }
    }

    private async flush(): Promise<void> {
        if (this.errorQueue.length === 0) return;

        const reports = [...this.errorQueue];
        this.errorQueue = [];

        for (const report of reports) {
            await this.sendReport(report);
        }
    }

    private async sendReport(report: ErrorReport): Promise<void> {
        for (const callback of this.callbacks) {
            try {
                await callback(report);
            } catch (e) {
                logger.warn('Error callback failed', 'ErrorReporter', { error: e });
            }
        }

        // Send to external monitoring service if configured
        if (this.monitoringEndpoint) {
            try {
                await fetch(this.monitoringEndpoint, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify(report)
                });
            } catch (e) {
                logger.warn('Failed to send error to monitoring service', 'ErrorReporter', { error: e });
            }
        }
    }

    private handleGlobalError(event: ErrorEvent): void {
        this.report(event.error, {
            source: 'globalError',
            filename: event.filename,
            lineno: event.lineno,
            colno: event.colno
        });
    }

    private handleUnhandledRejection(event: PromiseRejectionEvent): void {
        this.report(event.reason, { source: 'unhandledRejection' });
    }

    getRecentErrors(limit = 10): ErrorReport[] {
        return this.errorQueue.slice(-limit);
    }

    clearQueue(): void {
        this.errorQueue = [];
    }
}

export const errorReporter = ErrorReporter.getInstance();

// ============================================
// RECOVERY STRATEGIES
// ============================================

export interface RecoveryStrategy {
    name: string;
    canRecover: (error: AppError) => boolean;
    recover: (error: AppError, context?: any) => Promise<boolean>;
}

const recoveryStrategies: RecoveryStrategy[] = [
    {
        name: 'retry',
        canRecover: (error) => error.retryable && error.type !== ErrorType.AUTH,
        recover: async (error, context) => {
            if (!context?.retryFn) return false;

            await new Promise(resolve => setTimeout(resolve, 1000));

            try {
                await context.retryFn();
                return true;
            } catch {
                return false;
            }
        }
    },
    {
        name: 'refresh-token',
        canRecover: (error) => error.type === ErrorType.AUTH,
        recover: async () => {
            // Trigger re-auth
            window.location.href = '/guru-login?expired=true';
            return true;
        }
    },
    {
        name: 'use-cache',
        canRecover: (error) => error.type === ErrorType.NETWORK || error.type === ErrorType.OFFLINE,
        recover: async (error, context) => {
            if (!context?.getCached) return false;

            const cached = await context.getCached();
            if (cached) {
                context.setData?.(cached);
                return true;
            }
            return false;
        }
    },
    {
        name: 'fallback-data',
        canRecover: (error) => error.type === ErrorType.NOT_FOUND,
        recover: async (error, context) => {
            if (context?.fallbackData) {
                context.setData?.(context.fallbackData);
                return true;
            }
            return false;
        }
    }
];

export async function attemptRecovery(
    error: AppError,
    context?: Record<string, any>
): Promise<{ recovered: boolean; strategy?: string }> {
    for (const strategy of recoveryStrategies) {
        if (strategy.canRecover(error)) {
            try {
                const recovered = await strategy.recover(error, context);
                if (recovered) {
                    logger.info(`Recovered using ${strategy.name}`, 'Recovery', { error: error.type });
                    return { recovered: true, strategy: strategy.name };
                }
            } catch {
                // Continue to next strategy
            }
        }
    }

    return { recovered: false };
}

// ============================================
// NETWORK ERROR HANDLER
// ============================================

interface FetchWithRetryOptions {
    retries?: number;
    retryDelay?: number;
    timeout?: number;
    onRetry?: (attempt: number, error: AppError) => void;
}

export async function fetchWithErrorHandling<T>(
    url: string,
    options: RequestInit & FetchWithRetryOptions = {}
): Promise<{ data: T | null; error: AppError | null }> {
    const {
        retries = 3,
        retryDelay = 1000,
        timeout = 30000,
        onRetry,
        ...fetchOptions
    } = options;

    let lastError: AppError | null = null;

    for (let attempt = 0; attempt <= retries; attempt++) {
        try {
            // Create abort controller for timeout
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), timeout);

            const response = await fetch(url, {
                ...fetchOptions,
                signal: controller.signal
            });

            clearTimeout(timeoutId);

            if (!response.ok) {
                throw response;
            }

            const data = await response.json();
            return { data, error: null };
        } catch (error) {
            lastError = classifyError(error);

            if (attempt < retries && lastError.retryable) {
                onRetry?.(attempt + 1, lastError);
                await new Promise(resolve => setTimeout(resolve, retryDelay * (attempt + 1)));
            }
        }
    }

    return { data: null, error: lastError };
}

// ============================================
// UTILITY FUNCTIONS
// ============================================

export function getUserMessage(error: AppError): { title: string; message: string; action: string } {
    return ERROR_MESSAGES[error.type] || ERROR_MESSAGES[ErrorType.UNKNOWN];
}

export function isRetryable(error: AppError): boolean {
    return error.retryable && (
        error.type === ErrorType.NETWORK ||
        error.type === ErrorType.TIMEOUT ||
        error.type === ErrorType.SERVER
    );
}

export function isRecoverable(error: AppError): boolean {
    return error.recoverable && error.type !== ErrorType.AUTH;
}

// ============================================
// EXPORTS
// ============================================

export const errorHandling = {
    classifyError,
    errorReporter,
    attemptRecovery,
    fetchWithErrorHandling,
    getUserMessage,
    isRetryable,
    isRecoverable,
    ErrorType,
    ErrorSeverity,
    ErrorCategory
};

export default errorHandling;
