import { useEffect, useCallback } from 'react';
import { logger } from '../services/logger';

/**
 * Hook for global error monitoring
 * Captures unhandled errors and promise rejections
 */
export function useErrorMonitoring() {
    useEffect(() => {
        // Handle unhandled errors
        const handleError = (event: ErrorEvent) => {
            const err = event.error instanceof Error ? event.error : new Error(event.message);
            logger.error(
                `[GlobalErrorHandler] Unhandled Error: ${event.message}`,
                err,
                {
                    filename: event.filename,
                    lineno: event.lineno,
                    colno: event.colno
                }
            );
        };

        // Handle unhandled promise rejections
        const handleRejection = (event: PromiseRejectionEvent) => {
            const err = event.reason instanceof Error ? event.reason : new Error(String(event.reason));
            logger.error(
                `[GlobalErrorHandler] Unhandled Promise Rejection`,
                err
            );
        };

        window.addEventListener('error', handleError);
        window.addEventListener('unhandledrejection', handleRejection);

        logger.info('Error monitoring initialized', 'GlobalErrorHandler');

        return () => {
            window.removeEventListener('error', handleError);
            window.removeEventListener('unhandledrejection', handleRejection);
        };
    }, []);
}

/**
 * Hook for tracking component performance
 */
export function usePerformanceMonitoring(componentName: string) {
    useEffect(() => {
        const startTime = performance.now();

        return () => {
            const duration = performance.now() - startTime;
            logger.trackPerformance(`${componentName} mounted duration`, duration);
        };
    }, [componentName]);
}

/**
 * Hook for tracking user actions
 */
export function useActionTracking() {
    const trackClick = useCallback((actionName: string, data?: any) => {
        logger.trackAction(`Click: ${actionName}`, 'UserAction', data);
    }, []);

    const trackSubmit = useCallback((formName: string, success: boolean, data?: any) => {
        logger.info(
            `Form ${formName} ${success ? 'submitted successfully' : 'submission failed'}`,
            'UserAction',
            data
        );
    }, []);

    const trackNavigation = useCallback((from: string, to: string) => {
        logger.info(`Navigation: ${from} -> ${to}`, 'Navigation');
    }, []);

    return { trackClick, trackSubmit, trackNavigation };
}

/**
 * Hook to get error logs for display/debugging
 */
export function useErrorLogs() {
    const getErrorLogs = useCallback(() => {
        return logger.getErrorLogs();
    }, []);

    const getAllLogs = useCallback(() => {
        return logger.getStoredLogs();
    }, []);

    const exportLogs = useCallback(() => {
        return logger.exportLogs();
    }, []);

    const clearLogs = useCallback(() => {
        logger.clearStoredLogs();
    }, []);

    return { getErrorLogs, getAllLogs, exportLogs, clearLogs };
}
