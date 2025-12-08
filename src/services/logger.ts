// Enhanced Logger Service with performance tracking and remote flushing
export enum LogLevel {
    DEBUG = 'DEBUG',
    INFO = 'INFO',
    WARN = 'WARN',
    ERROR = 'ERROR',
    FATAL = 'FATAL'
}

export interface LogEntry {
    timestamp: string;
    level: LogLevel;
    message: string;
    component?: string;
    data?: any;
    error?: {
        name: string;
        message: string;
        stack?: string;
    };
    userId?: string;
    sessionId?: string;
    context?: string; // Kept for backward compatibility
}

export interface PerformanceMetric {
    name: string;
    value: number;
    unit: string;
    timestamp: number;
}

interface LoggerConfig {
    minLevel: LogLevel;
    enableConsole: boolean;
    enableStorage: boolean;
    maxStoredLogs: number;
    monitoringEndpoint?: string;
}

const LOG_STORAGE_KEY = 'portal_guru_logs';
const SESSION_ID = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

const levelPriority: Record<LogLevel, number> = {
    [LogLevel.DEBUG]: 0,
    [LogLevel.INFO]: 1,
    [LogLevel.WARN]: 2,
    [LogLevel.ERROR]: 3,
    [LogLevel.FATAL]: 4
};

export class Logger {
    private config: LoggerConfig = {
        minLevel: import.meta.env.DEV ? LogLevel.DEBUG : LogLevel.INFO,
        enableConsole: true,
        enableStorage: true,
        maxStoredLogs: 100
    };

    private userId: string | null = null;
    private performanceMetrics: PerformanceMetric[] = [];

    setUserId(userId: string | null) {
        this.userId = userId;
    }

    setConfig(config: Partial<LoggerConfig>) {
        this.config = { ...this.config, ...config };
    }

    private shouldLog(level: LogLevel): boolean {
        return levelPriority[level] >= levelPriority[this.config.minLevel];
    }

    private formatLogEntry(entry: LogEntry): string {
        const timestamp = entry.timestamp;
        const level = entry.level.padEnd(5);
        const context = entry.component || entry.context ? `[${entry.component || entry.context}]` : '';
        return `${timestamp} ${level} ${context} ${entry.message}`;
    }

    private storeLog(entry: LogEntry) {
        if (!this.config.enableStorage) return;

        try {
            const storedLogs = this.getStoredLogs();
            storedLogs.push(entry);

            // Keep only the last N logs
            while (storedLogs.length > this.config.maxStoredLogs) {
                storedLogs.shift();
            }

            localStorage.setItem(LOG_STORAGE_KEY, JSON.stringify(storedLogs));
        } catch (e) {
            // Storage might be full or unavailable
            console.warn('Failed to store log entry:', e);
        }
    }

    getStoredLogs(): LogEntry[] {
        try {
            const stored = localStorage.getItem(LOG_STORAGE_KEY);
            return stored ? JSON.parse(stored) : [];
        } catch {
            return [];
        }
    }

    clearStoredLogs() {
        localStorage.removeItem(LOG_STORAGE_KEY);
    }

    exportLogs(): string {
        const logs = this.getStoredLogs();
        return logs.map(log => this.formatLogEntry(log)).join('\n');
    }

    private log(level: LogLevel, message: string, component?: string, data?: any, error?: Error) {
        if (!this.shouldLog(level)) return;

        const entry: LogEntry = {
            timestamp: new Date().toISOString(),
            level,
            message,
            component,
            context: component, // Backward compatibility
            data,
            error: error ? {
                name: error.name,
                message: error.message,
                stack: error.stack
            } : undefined,
            userId: this.userId || undefined,
            sessionId: SESSION_ID
        };

        // Console output
        if (this.config.enableConsole) {
            const formattedMessage = this.formatLogEntry(entry);
            const consoleData = data || error ? { data, error } : undefined;

            switch (level) {
                case LogLevel.DEBUG:
                    console.debug(formattedMessage, consoleData || '');
                    break;
                case LogLevel.INFO:
                    console.info(formattedMessage, consoleData || '');
                    break;
                case LogLevel.WARN:
                    console.warn(formattedMessage, consoleData || '');
                    break;
                case LogLevel.ERROR:
                case LogLevel.FATAL:
                    console.error(formattedMessage, consoleData || '');
                    break;
            }
        }

        // Store log
        this.storeLog(entry);

        // For ERROR and FATAL, also send to error tracking (if configured)
        if (level === LogLevel.ERROR || level === LogLevel.FATAL) {
            this.trackError(entry);
        }
    }

    private trackError(entry: LogEntry) {
        try {
            const errorLogs = JSON.parse(localStorage.getItem('portal_guru_errors') || '[]');
            errorLogs.push(entry);

            // Keep only last 50 errors
            while (errorLogs.length > 50) {
                errorLogs.shift();
            }

            localStorage.setItem('portal_guru_errors', JSON.stringify(errorLogs));
        } catch {
            // Ignore storage errors
        }
    }

    getErrorLogs(): LogEntry[] {
        try {
            return JSON.parse(localStorage.getItem('portal_guru_errors') || '[]');
        } catch {
            return [];
        }
    }

    // Convenience methods
    debug(message: string, component?: string, data?: any) {
        this.log(LogLevel.DEBUG, message, component, data);
    }

    info(message: string, component?: string, data?: any) {
        this.log(LogLevel.INFO, message, component, data);
    }

    warn(message: string, component?: string, data?: any) {
        this.log(LogLevel.WARN, message, component, data);
    }

    error(message: string, error?: Error, data?: any, component?: string) {
        // Handle different signature call from older code: error(message: string, context?: string, error?: Error, data?: any)
        // If 2nd arg is string and not Error, it's likely 'component' from old signature
        if (typeof error === 'string') {
            const oldComponent = error as string;
            const oldError = data as Error | undefined;
            const oldData = component; // 4th arg
            this.log(LogLevel.ERROR, message, oldComponent, oldData, oldError);
        } else {
            this.log(LogLevel.ERROR, message, component, data, error);
        }
    }

    fatal(message: string, error?: Error, data?: any, component?: string) {
        this.log(LogLevel.FATAL, message, component, data, error);
    }

    // Track user actions for debugging
    trackAction(action: string, component?: string, data?: any) {
        this.debug(`User action: ${action}`, component, data);
    }

    // Track API calls
    trackApiCall(method: string, endpoint: string, duration?: number, success?: boolean) {
        const status = success ? 'SUCCESS' : 'FAILED';
        const durationStr = duration ? ` (${duration}ms)` : '';
        this.info(`API ${method} ${endpoint} ${status}${durationStr}`, 'API');
    }

    // Performance logging
    logPerformance(metric: PerformanceMetric) {
        this.performanceMetrics.push(metric);
        this.debug(`Performance: ${metric.name} = ${metric.value}${metric.unit}`, 'PERF');
    }

    // New API from design docs compatibility
    trackPerformance(metric: string, value: number, unit: string = 'ms') {
        this.logPerformance({
            name: metric,
            value,
            unit,
            timestamp: Date.now()
        });
    }

    // Send logs to monitoring service
    async flush(): Promise<void> {
        if (!this.config.monitoringEndpoint) return;

        try {
            const logsToFlush = this.getStoredLogs();
            if (logsToFlush.length === 0) return;

            await fetch(this.config.monitoringEndpoint, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ logs: logsToFlush, metrics: this.performanceMetrics })
            });

            // Optional: clear flushed logs or mark them sent
            this.performanceMetrics = [];
        } catch (error) {
            console.error('Failed to flush logs', error);
        }
    }
}

// Singleton instance
export const logger = new Logger();

// Export for testing
export type LoggerService = Logger;
