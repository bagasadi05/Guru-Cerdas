import React, { useCallback, useEffect, useRef, useState } from 'react';
import { AlertCircle, AlertTriangle, Check, ChevronRight, Info, Loader2, Undo2, X } from 'lucide-react';
import { useHapticFeedback } from './haptics';
import { ToastContext } from './toastContext';

export type ToastType = 'success' | 'error' | 'warning' | 'info' | 'loading';

export interface ToastAction {
    label: string;
    onClick: () => void;
}

export interface Toast {
    id: string;
    type: ToastType;
    title: string;
    message?: string;
    duration?: number;
    action?: ToastAction;
    undoAction?: () => void;
    dismissible?: boolean;
    progress?: number;
}

export const ToastProvider: React.FC<{
    children: React.ReactNode;
    position?: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left' | 'top-center' | 'bottom-center';
    maxToasts?: number;
}> = ({
    children,
    position = 'bottom-right',
    maxToasts = 5
}) => {
    const [toasts, setToasts] = useState<Toast[]>([]);
    const haptic = useHapticFeedback();

    const addToast = useCallback((toast: Omit<Toast, 'id'>) => {
        const id = `toast-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
        const newToast: Toast = {
            ...toast,
            id,
            duration: toast.duration ?? (toast.type === 'loading' ? 0 : 5000),
            dismissible: toast.dismissible ?? true
        };

        if (toast.type === 'success') haptic.success();
        else if (toast.type === 'error') haptic.error();
        else if (toast.type === 'warning') haptic.warning();
        else haptic.light();

        setToasts(prev => [newToast, ...prev].slice(0, maxToasts));
        return id;
    }, [haptic, maxToasts]);

    const removeToast = useCallback((id: string) => {
        setToasts(prev => prev.filter(toast => toast.id !== id));
    }, []);

    const updateToast = useCallback((id: string, updates: Partial<Toast>) => {
        setToasts(prev => prev.map(toast => (
            toast.id === id ? { ...toast, ...updates } : toast
        )));
    }, []);

    const clearAll = useCallback(() => {
        setToasts([]);
    }, []);

    const success = useCallback((title: string, options?: Partial<Toast>) => (
        addToast({ type: 'success', title, ...options })
    ), [addToast]);

    const error = useCallback((title: string, options?: Partial<Toast>) => (
        addToast({ type: 'error', title, duration: 0, ...options })
    ), [addToast]);

    const warning = useCallback((title: string, options?: Partial<Toast>) => (
        addToast({ type: 'warning', title, ...options })
    ), [addToast]);

    const info = useCallback((title: string, options?: Partial<Toast>) => (
        addToast({ type: 'info', title, ...options })
    ), [addToast]);

    const loading = useCallback((title: string, options?: Partial<Toast>) => (
        addToast({ type: 'loading', title, duration: 0, dismissible: false, ...options })
    ), [addToast]);

    const promise = useCallback(async <T,>(
        promiseToResolve: Promise<T>,
        messages: { loading: string; success: string; error: string }
    ) => {
        const id = loading(messages.loading);

        try {
            const result = await promiseToResolve;
            updateToast(id, {
                type: 'success',
                title: messages.success,
                duration: 5000,
                dismissible: true
            });
            haptic.success();
            return result;
        } catch (errorValue) {
            updateToast(id, {
                type: 'error',
                title: messages.error,
                message: errorValue instanceof Error ? errorValue.message : undefined,
                duration: 0,
                dismissible: true
            });
            haptic.error();
            throw errorValue;
        }
    }, [haptic, loading, updateToast]);

    const positionClasses = {
        'top-right': 'top-4 right-4',
        'top-left': 'top-4 left-4',
        'bottom-right': 'bottom-4 right-4',
        'bottom-left': 'bottom-4 left-4',
        'top-center': 'top-4 left-1/2 -translate-x-1/2',
        'bottom-center': 'bottom-4 left-1/2 -translate-x-1/2'
    };

    return (
        <ToastContext.Provider value={{
            toasts,
            addToast,
            removeToast,
            updateToast,
            clearAll,
            success,
            error,
            warning,
            info,
            loading,
            promise
        }}>
            {children}
            <div
                className={`fixed ${positionClasses[position]} z-[100] flex w-full max-w-sm flex-col gap-2 pointer-events-none`}
                role="region"
                aria-label="Notifikasi"
                aria-live="polite"
            >
                {toasts.map(toast => (
                    <ToastItem
                        key={toast.id}
                        toast={toast}
                        onDismiss={() => removeToast(toast.id)}
                    />
                ))}
            </div>
        </ToastContext.Provider>
    );
};

const iconMap: Record<ToastType, React.ReactNode> = {
    success: <Check className="h-5 w-5 text-emerald-500" />,
    error: <AlertCircle className="h-5 w-5 text-red-500" />,
    warning: <AlertTriangle className="h-5 w-5 text-amber-500" />,
    info: <Info className="h-5 w-5 text-blue-500" />,
    loading: <Loader2 className="h-5 w-5 animate-spin text-indigo-500" />
};

const bgColorMap: Record<ToastType, string> = {
    success: 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800',
    error: 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800',
    warning: 'bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800',
    info: 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800',
    loading: 'bg-indigo-50 dark:bg-indigo-900/20 border-indigo-200 dark:border-indigo-800'
};

const progressColorMap: Record<ToastType, string> = {
    success: 'bg-emerald-500',
    error: 'bg-red-500',
    warning: 'bg-amber-500',
    info: 'bg-blue-500',
    loading: 'bg-indigo-500'
};

const ToastItem: React.FC<{ toast: Toast; onDismiss: () => void }> = ({ toast, onDismiss }) => {
    const [isExiting, setIsExiting] = useState(false);
    const [progress, setProgress] = useState(100);
    const progressRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    const handleDismiss = useCallback(() => {
        setIsExiting(true);
        setTimeout(onDismiss, 200);
    }, [onDismiss]);

    useEffect(() => {
        const duration = toast.duration;
        if (!duration || duration <= 0) {
            return undefined;
        }

        const startTime = Date.now();
        const updateProgress = () => {
            const elapsed = Date.now() - startTime;
            const remaining = Math.max(0, 100 - (elapsed / duration) * 100);
            setProgress(remaining);

            if (remaining > 0) {
                progressRef.current = setTimeout(updateProgress, 50);
            } else {
                handleDismiss();
            }
        };

        progressRef.current = setTimeout(updateProgress, 50);

        return () => {
            if (progressRef.current) {
                clearTimeout(progressRef.current);
            }
        };
    }, [handleDismiss, toast.duration]);

    return (
        <div
            role="alert"
            className={`
                pointer-events-auto relative overflow-hidden rounded-2xl border p-4 shadow-lg
                transform transition-all duration-200
                ${bgColorMap[toast.type]}
                ${isExiting ? 'translate-x-full opacity-0' : 'translate-x-0 opacity-100 animate-slide-in-right'}
            `}
        >
            <div className="flex items-start gap-3">
                <div className="flex-shrink-0">
                    {iconMap[toast.type]}
                </div>

                <div className="min-w-0 flex-1">
                    <p className="font-medium text-slate-900 dark:text-white">{toast.title}</p>
                    {toast.message && (
                        <p className="mt-0.5 text-sm text-slate-600 dark:text-slate-400">{toast.message}</p>
                    )}

                    <div className="mt-2 flex items-center gap-2">
                        {toast.undoAction && (
                            <button
                                onClick={() => {
                                    toast.undoAction?.();
                                    handleDismiss();
                                }}
                                className="inline-flex items-center gap-1 text-sm font-medium text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 dark:hover:text-indigo-300"
                            >
                                <Undo2 className="h-3.5 w-3.5" />
                                Urungkan
                            </button>
                        )}
                        {toast.action && (
                            <button
                                onClick={() => {
                                    toast.action?.onClick();
                                    handleDismiss();
                                }}
                                className="inline-flex items-center gap-1 text-sm font-medium text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 dark:hover:text-indigo-300"
                            >
                                {toast.action.label}
                                <ChevronRight className="h-3.5 w-3.5" />
                            </button>
                        )}
                    </div>
                </div>

                {toast.dismissible && (
                    <button
                        onClick={handleDismiss}
                        className="flex-shrink-0 rounded-lg p-1 text-slate-400 hover:bg-white/50 hover:text-slate-600 dark:hover:bg-slate-800/50 dark:hover:text-slate-300"
                        aria-label="Tutup notifikasi"
                    >
                        <X className="h-4 w-4" />
                    </button>
                )}
            </div>

            {toast.type === 'loading' && toast.progress !== undefined ? (
                <div className="absolute bottom-0 left-0 right-0 h-1 bg-slate-200 dark:bg-slate-700">
                    <div
                        className={`h-full ${progressColorMap[toast.type]} transition-all duration-100`}
                        style={{ width: `${toast.progress}%` }}
                    />
                </div>
            ) : toast.duration && toast.duration > 0 ? (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-slate-200/50 dark:bg-slate-700/50">
                    <div
                        className={`h-full ${progressColorMap[toast.type]} transition-all`}
                        style={{ width: `${progress}%` }}
                    />
                </div>
            ) : null}
        </div>
    );
};
