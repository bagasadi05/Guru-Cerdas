import React, { useState, useEffect, useCallback, createContext, useContext, useRef } from 'react';
import { X, Check, AlertCircle, Info, AlertTriangle, Undo2, ChevronRight, Loader2 } from 'lucide-react';

/**
 * Micro-interactions & Feedback System
 * Features: Haptic feedback, toast notifications, progress indicators, undo functionality
 */

// ============================================
// HAPTIC FEEDBACK
// ============================================

type HapticType = 'light' | 'medium' | 'heavy' | 'success' | 'warning' | 'error' | 'selection';

interface HapticPatterns {
    [key: string]: number[];
}

const hapticPatterns: HapticPatterns = {
    light: [10],
    medium: [25],
    heavy: [50],
    success: [10, 50, 10],
    warning: [30, 30, 30],
    error: [50, 100, 50],
    selection: [5]
};

export function useHapticFeedback() {
    const isSupported = typeof navigator !== 'undefined' && 'vibrate' in navigator;

    const vibrate = useCallback((type: HapticType = 'light') => {
        if (!isSupported) return false;

        const pattern = hapticPatterns[type] || hapticPatterns.light;
        return navigator.vibrate(pattern);
    }, [isSupported]);

    const vibratePattern = useCallback((pattern: number[]) => {
        if (!isSupported) return false;
        return navigator.vibrate(pattern);
    }, [isSupported]);

    const stop = useCallback(() => {
        if (!isSupported) return;
        navigator.vibrate(0);
    }, [isSupported]);

    return {
        isSupported,
        vibrate,
        vibratePattern,
        stop,
        // Shorthand methods
        light: () => vibrate('light'),
        medium: () => vibrate('medium'),
        heavy: () => vibrate('heavy'),
        success: () => vibrate('success'),
        warning: () => vibrate('warning'),
        error: () => vibrate('error'),
        selection: () => vibrate('selection')
    };
}

// ============================================
// TOAST NOTIFICATIONS
// ============================================

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
    duration?: number; // ms, 0 = never auto-dismiss
    action?: ToastAction;
    undoAction?: () => void;
    dismissible?: boolean;
    progress?: number; // 0-100 for loading type
}

interface ToastContextValue {
    toasts: Toast[];
    addToast: (toast: Omit<Toast, 'id'>) => string;
    removeToast: (id: string) => void;
    updateToast: (id: string, updates: Partial<Toast>) => void;
    clearAll: () => void;
    // Shorthand methods
    success: (title: string, options?: Partial<Toast>) => string;
    error: (title: string, options?: Partial<Toast>) => string;
    warning: (title: string, options?: Partial<Toast>) => string;
    info: (title: string, options?: Partial<Toast>) => string;
    loading: (title: string, options?: Partial<Toast>) => string;
    promise: <T>(
        promise: Promise<T>,
        messages: { loading: string; success: string; error: string }
    ) => Promise<T>;
}

const ToastContext = createContext<ToastContextValue | null>(null);

export const useToast = () => {
    const context = useContext(ToastContext);
    if (!context) {
        throw new Error('useToast must be used within ToastProvider');
    }
    return context;
};

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
            const id = `toast-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
            const newToast: Toast = {
                ...toast,
                id,
                duration: toast.duration ?? (toast.type === 'loading' ? 0 : 5000),
                dismissible: toast.dismissible ?? true
            };

            // Haptic feedback based on type
            if (toast.type === 'success') haptic.success();
            else if (toast.type === 'error') haptic.error();
            else if (toast.type === 'warning') haptic.warning();
            else haptic.light();

            setToasts(prev => {
                const updated = [newToast, ...prev];
                return updated.slice(0, maxToasts);
            });

            return id;
        }, [haptic, maxToasts]);

        const removeToast = useCallback((id: string) => {
            setToasts(prev => prev.filter(t => t.id !== id));
        }, []);

        const updateToast = useCallback((id: string, updates: Partial<Toast>) => {
            setToasts(prev => prev.map(t =>
                t.id === id ? { ...t, ...updates } : t
            ));
        }, []);

        const clearAll = useCallback(() => {
            setToasts([]);
        }, []);

        // Shorthand methods
        const success = useCallback((title: string, options?: Partial<Toast>) =>
            addToast({ type: 'success', title, ...options }), [addToast]);

        const error = useCallback((title: string, options?: Partial<Toast>) =>
            addToast({ type: 'error', title, duration: 0, ...options }), [addToast]);

        const warning = useCallback((title: string, options?: Partial<Toast>) =>
            addToast({ type: 'warning', title, ...options }), [addToast]);

        const info = useCallback((title: string, options?: Partial<Toast>) =>
            addToast({ type: 'info', title, ...options }), [addToast]);

        const loading = useCallback((title: string, options?: Partial<Toast>) =>
            addToast({ type: 'loading', title, duration: 0, dismissible: false, ...options }), [addToast]);

        const promise = useCallback(async <T,>(
            promiseToResolve: Promise<T>,
            messages: { loading: string; success: string; error: string }
        ): Promise<T> => {
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
            } catch (err) {
                updateToast(id, {
                    type: 'error',
                    title: messages.error,
                    message: err instanceof Error ? err.message : undefined,
                    duration: 0,
                    dismissible: true
                });
                haptic.error();
                throw err;
            }
        }, [loading, updateToast, haptic]);

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
                toasts, addToast, removeToast, updateToast, clearAll,
                success, error, warning, info, loading, promise
            }}>
                {children}

                {/* Toast Container */}
                <div
                    className={`fixed ${positionClasses[position]} z-[100] flex flex-col gap-2 w-full max-w-sm pointer-events-none`}
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

// Toast Item Component
const ToastItem: React.FC<{ toast: Toast; onDismiss: () => void }> = ({ toast, onDismiss }) => {
    const [isExiting, setIsExiting] = useState(false);
    const [progress, setProgress] = useState(100);
    const progressRef = useRef<NodeJS.Timeout>();

    // Auto-dismiss timer with progress
    useEffect(() => {
        if (toast.duration && toast.duration > 0) {
            const startTime = Date.now();
            const updateProgress = () => {
                const elapsed = Date.now() - startTime;
                const remaining = Math.max(0, 100 - (elapsed / toast.duration!) * 100);
                setProgress(remaining);

                if (remaining > 0) {
                    progressRef.current = setTimeout(updateProgress, 50);
                } else {
                    handleDismiss();
                }
            };

            progressRef.current = setTimeout(updateProgress, 50);

            return () => {
                if (progressRef.current) clearTimeout(progressRef.current);
            };
        }
    }, [toast.duration]);

    const handleDismiss = () => {
        setIsExiting(true);
        setTimeout(onDismiss, 200);
    };

    const iconMap = {
        success: <Check className="w-5 h-5 text-emerald-500" />,
        error: <AlertCircle className="w-5 h-5 text-red-500" />,
        warning: <AlertTriangle className="w-5 h-5 text-amber-500" />,
        info: <Info className="w-5 h-5 text-blue-500" />,
        loading: <Loader2 className="w-5 h-5 text-indigo-500 animate-spin" />
    };

    const bgColorMap = {
        success: 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800',
        error: 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800',
        warning: 'bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800',
        info: 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800',
        loading: 'bg-indigo-50 dark:bg-indigo-900/20 border-indigo-200 dark:border-indigo-800'
    };

    const progressColorMap = {
        success: 'bg-emerald-500',
        error: 'bg-red-500',
        warning: 'bg-amber-500',
        info: 'bg-blue-500',
        loading: 'bg-indigo-500'
    };

    return (
        <div
            role="alert"
            className={`
                pointer-events-auto
                relative overflow-hidden
                p-4 rounded-xl border shadow-lg
                transform transition-all duration-200
                ${bgColorMap[toast.type]}
                ${isExiting ? 'opacity-0 translate-x-full' : 'opacity-100 translate-x-0 animate-slide-in-right'}
            `}
        >
            <div className="flex items-start gap-3">
                {/* Icon */}
                <div className="flex-shrink-0">
                    {iconMap[toast.type]}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                    <p className="font-medium text-slate-900 dark:text-white">
                        {toast.title}
                    </p>
                    {toast.message && (
                        <p className="text-sm text-slate-600 dark:text-slate-400 mt-0.5">
                            {toast.message}
                        </p>
                    )}

                    {/* Actions */}
                    <div className="flex items-center gap-2 mt-2">
                        {toast.undoAction && (
                            <button
                                onClick={() => {
                                    toast.undoAction?.();
                                    handleDismiss();
                                }}
                                className="inline-flex items-center gap-1 text-sm font-medium text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300"
                            >
                                <Undo2 className="w-3.5 h-3.5" />
                                Urungkan
                            </button>
                        )}
                        {toast.action && (
                            <button
                                onClick={() => {
                                    toast.action?.onClick();
                                    handleDismiss();
                                }}
                                className="inline-flex items-center gap-1 text-sm font-medium text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300"
                            >
                                {toast.action.label}
                                <ChevronRight className="w-3.5 h-3.5" />
                            </button>
                        )}
                    </div>
                </div>

                {/* Dismiss button */}
                {toast.dismissible && (
                    <button
                        onClick={handleDismiss}
                        className="flex-shrink-0 p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 rounded-lg hover:bg-white/50 dark:hover:bg-slate-800/50"
                        aria-label="Tutup notifikasi"
                    >
                        <X className="w-4 h-4" />
                    </button>
                )}
            </div>

            {/* Progress bar */}
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

// ============================================
// PROGRESS INDICATOR
// ============================================

interface ProgressIndicatorProps {
    value: number; // 0-100
    showLabel?: boolean;
    size?: 'sm' | 'md' | 'lg';
    variant?: 'linear' | 'circular';
    color?: string;
    className?: string;
}

export const ProgressIndicator: React.FC<ProgressIndicatorProps> = ({
    value,
    showLabel = true,
    size = 'md',
    variant = 'linear',
    color = 'indigo',
    className = ''
}) => {
    const clampedValue = Math.min(100, Math.max(0, value));

    const sizeClasses = {
        sm: variant === 'linear' ? 'h-1' : 'w-8 h-8',
        md: variant === 'linear' ? 'h-2' : 'w-12 h-12',
        lg: variant === 'linear' ? 'h-3' : 'w-16 h-16'
    };

    if (variant === 'circular') {
        const radius = size === 'sm' ? 14 : size === 'md' ? 20 : 28;
        const circumference = 2 * Math.PI * radius;
        const strokeDashoffset = circumference - (clampedValue / 100) * circumference;

        return (
            <div className={`relative ${sizeClasses[size]} ${className}`}>
                <svg className="w-full h-full -rotate-90" viewBox="0 0 64 64">
                    {/* Background circle */}
                    <circle
                        cx="32"
                        cy="32"
                        r={radius}
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="4"
                        className="text-slate-200 dark:text-slate-700"
                    />
                    {/* Progress circle */}
                    <circle
                        cx="32"
                        cy="32"
                        r={radius}
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="4"
                        strokeLinecap="round"
                        className={`text-${color}-500 transition-all duration-300`}
                        style={{
                            strokeDasharray: circumference,
                            strokeDashoffset
                        }}
                    />
                </svg>
                {showLabel && size !== 'sm' && (
                    <span className="absolute inset-0 flex items-center justify-center text-xs font-medium text-slate-700 dark:text-slate-300">
                        {Math.round(clampedValue)}%
                    </span>
                )}
            </div>
        );
    }

    return (
        <div className={className}>
            <div className={`w-full bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden ${sizeClasses[size]}`}>
                <div
                    className={`h-full bg-${color}-500 rounded-full transition-all duration-300`}
                    style={{ width: `${clampedValue}%` }}
                    role="progressbar"
                    aria-valuenow={clampedValue}
                    aria-valuemin={0}
                    aria-valuemax={100}
                />
            </div>
            {showLabel && (
                <div className="mt-1 text-right text-sm text-slate-500 dark:text-slate-400">
                    {Math.round(clampedValue)}%
                </div>
            )}
        </div>
    );
};

// ============================================
// OPERATION PROGRESS
// ============================================

interface OperationProgressProps {
    title: string;
    description?: string;
    progress: number;
    status?: 'running' | 'success' | 'error' | 'paused';
    onCancel?: () => void;
    onRetry?: () => void;
    className?: string;
}

export const OperationProgress: React.FC<OperationProgressProps> = ({
    title,
    description,
    progress,
    status = 'running',
    onCancel,
    onRetry,
    className = ''
}) => {
    const statusColors = {
        running: 'indigo',
        success: 'emerald',
        error: 'red',
        paused: 'amber'
    };

    const statusIcons = {
        running: <Loader2 className="w-5 h-5 animate-spin" />,
        success: <Check className="w-5 h-5" />,
        error: <AlertCircle className="w-5 h-5" />,
        paused: <AlertTriangle className="w-5 h-5" />
    };

    return (
        <div className={`bg-white dark:bg-slate-800 rounded-xl p-4 shadow-sm border border-slate-200 dark:border-slate-700 ${className}`}>
            <div className="flex items-start gap-3">
                <div className={`p-2 rounded-lg bg-${statusColors[status]}-100 dark:bg-${statusColors[status]}-900/30 text-${statusColors[status]}-600 dark:text-${statusColors[status]}-400`}>
                    {statusIcons[status]}
                </div>
                <div className="flex-1 min-w-0">
                    <h4 className="font-medium text-slate-900 dark:text-white">{title}</h4>
                    {description && (
                        <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">{description}</p>
                    )}

                    <div className="mt-3">
                        <ProgressIndicator
                            value={progress}
                            size="sm"
                            showLabel={false}
                            color={statusColors[status]}
                        />
                        <div className="flex items-center justify-between mt-1">
                            <span className="text-xs text-slate-500">{Math.round(progress)}% selesai</span>
                            <div className="flex gap-2">
                                {status === 'error' && onRetry && (
                                    <button
                                        onClick={onRetry}
                                        className="text-xs text-indigo-600 hover:text-indigo-700 font-medium"
                                    >
                                        Coba Lagi
                                    </button>
                                )}
                                {status === 'running' && onCancel && (
                                    <button
                                        onClick={onCancel}
                                        className="text-xs text-red-600 hover:text-red-700 font-medium"
                                    >
                                        Batalkan
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

// ============================================
// UNDO MANAGER
// ============================================

interface UndoableAction<T = any> {
    id: string;
    description: string;
    execute: () => T | Promise<T>;
    undo: () => void | Promise<void>;
    data?: any;
}

interface UndoManagerOptions {
    maxHistory?: number;
    undoTimeout?: number; // ms before undo is no longer available
}

export function useUndoManager<T>(options: UndoManagerOptions = {}) {
    const { maxHistory = 50, undoTimeout = 10000 } = options;
    const [history, setHistory] = useState<UndoableAction<T>[]>([]);
    const [future, setFuture] = useState<UndoableAction<T>[]>([]);
    const timeoutRefs = useRef<Map<string, NodeJS.Timeout>>(new Map());

    const execute = useCallback(async (action: Omit<UndoableAction<T>, 'id'>) => {
        const id = `action-${Date.now()}`;
        const actionWithId = { ...action, id };

        // Execute the action
        const result = await action.execute();

        // Add to history
        setHistory(prev => {
            const newHistory = [actionWithId, ...prev].slice(0, maxHistory);
            return newHistory;
        });

        // Clear future on new action
        setFuture([]);

        // Set timeout to remove from undoable
        if (undoTimeout > 0) {
            const timeout = setTimeout(() => {
                setHistory(prev => prev.filter(a => a.id !== id));
                timeoutRefs.current.delete(id);
            }, undoTimeout);
            timeoutRefs.current.set(id, timeout);
        }

        return { result, actionId: id };
    }, [maxHistory, undoTimeout]);

    const undo = useCallback(async () => {
        const action = history[0];
        if (!action) return null;

        // Execute undo
        await action.undo();

        // Move to future
        setHistory(prev => prev.slice(1));
        setFuture(prev => [action, ...prev]);

        // Clear timeout
        const timeout = timeoutRefs.current.get(action.id);
        if (timeout) {
            clearTimeout(timeout);
            timeoutRefs.current.delete(action.id);
        }

        return action;
    }, [history]);

    const redo = useCallback(async () => {
        const action = future[0];
        if (!action) return null;

        // Re-execute
        await action.execute();

        // Move back to history
        setFuture(prev => prev.slice(1));
        setHistory(prev => [action, ...prev]);

        return action;
    }, [future]);

    const canUndo = history.length > 0;
    const canRedo = future.length > 0;
    const lastAction = history[0] || null;

    // Cleanup timeouts on unmount
    useEffect(() => {
        return () => {
            timeoutRefs.current.forEach(timeout => clearTimeout(timeout));
        };
    }, []);

    return {
        execute,
        undo,
        redo,
        canUndo,
        canRedo,
        lastAction,
        history,
        future,
        clear: () => {
            setHistory([]);
            setFuture([]);
            timeoutRefs.current.forEach(timeout => clearTimeout(timeout));
            timeoutRefs.current.clear();
        }
    };
}

// ============================================
// DELETABLE WITH UNDO
// ============================================

interface DeletableWithUndoProps<T> {
    item: T;
    onDelete: (item: T) => Promise<void>;
    onRestore: (item: T) => Promise<void>;
    renderItem: (item: T, isPendingDelete: boolean) => React.ReactNode;
    undoDuration?: number; // ms
}

export function DeletableWithUndo<T extends { id: string }>({
    item,
    onDelete,
    onRestore,
    renderItem,
    undoDuration = 5000
}: DeletableWithUndoProps<T>) {
    const [isPendingDelete, setIsPendingDelete] = useState(false);
    const [isDeleted, setIsDeleted] = useState(false);
    const timeoutRef = useRef<NodeJS.Timeout>();
    const toast = useToast();

    const handleDelete = async () => {
        setIsPendingDelete(true);

        const toastId = toast.addToast({
            type: 'warning',
            title: 'Item akan dihapus',
            message: `Dalam ${undoDuration / 1000} detik...`,
            duration: undoDuration,
            undoAction: () => {
                setIsPendingDelete(false);
                if (timeoutRef.current) clearTimeout(timeoutRef.current);
            }
        });

        timeoutRef.current = setTimeout(async () => {
            try {
                await onDelete(item);
                setIsDeleted(true);
                toast.removeToast(toastId);
                toast.success('Item berhasil dihapus');
            } catch {
                setIsPendingDelete(false);
                toast.error('Gagal menghapus item');
            }
        }, undoDuration);
    };

    useEffect(() => {
        return () => {
            if (timeoutRef.current) clearTimeout(timeoutRef.current);
        };
    }, []);

    if (isDeleted) return null;

    return (
        <div className={`transition-opacity duration-200 ${isPendingDelete ? 'opacity-50' : ''}`}>
            {renderItem(item, isPendingDelete)}
        </div>
    );
}

// ============================================
// CONFIRM ACTION
// ============================================

interface ConfirmActionProps {
    trigger: React.ReactElement;
    title: string;
    message: string;
    confirmLabel?: string;
    cancelLabel?: string;
    variant?: 'danger' | 'warning' | 'info';
    onConfirm: () => void | Promise<void>;
    onCancel?: () => void;
}

export const ConfirmAction: React.FC<ConfirmActionProps> = ({
    trigger,
    title,
    message,
    confirmLabel = 'Konfirmasi',
    cancelLabel = 'Batal',
    variant = 'danger',
    onConfirm,
    onCancel
}) => {
    const [isOpen, setIsOpen] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const haptic = useHapticFeedback();

    const handleConfirm = async () => {
        setIsLoading(true);
        try {
            await onConfirm();
            haptic.success();
            setIsOpen(false);
        } catch {
            haptic.error();
        } finally {
            setIsLoading(false);
        }
    };

    const handleCancel = () => {
        haptic.light();
        onCancel?.();
        setIsOpen(false);
    };

    const variantClasses = {
        danger: 'bg-red-500 hover:bg-red-600',
        warning: 'bg-amber-500 hover:bg-amber-600',
        info: 'bg-indigo-500 hover:bg-indigo-600'
    };

    return (
        <>
            {React.cloneElement(trigger, {
                onClick: (e: React.MouseEvent) => {
                    e.preventDefault();
                    haptic.medium();
                    setIsOpen(true);
                }
            })}

            {isOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-black/50" onClick={handleCancel} />
                    <div className="relative bg-white dark:bg-slate-900 rounded-2xl shadow-xl max-w-sm w-full p-6 animate-scale-in">
                        <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">
                            {title}
                        </h3>
                        <p className="text-slate-600 dark:text-slate-400 mb-6">
                            {message}
                        </p>
                        <div className="flex gap-3">
                            <button
                                onClick={handleCancel}
                                disabled={isLoading}
                                className="flex-1 px-4 py-2.5 text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-xl font-medium transition-colors"
                            >
                                {cancelLabel}
                            </button>
                            <button
                                onClick={handleConfirm}
                                disabled={isLoading}
                                className={`flex-1 px-4 py-2.5 text-white rounded-xl font-medium transition-colors ${variantClasses[variant]}`}
                            >
                                {isLoading ? (
                                    <Loader2 className="w-5 h-5 animate-spin mx-auto" />
                                ) : confirmLabel}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
};

// ============================================
// PULSE EFFECT (Micro-interaction)
// ============================================

export const usePulseEffect = () => {
    const [isPulsing, setIsPulsing] = useState(false);

    const pulse = useCallback(() => {
        setIsPulsing(true);
        setTimeout(() => setIsPulsing(false), 300);
    }, []);

    return { isPulsing, pulse, pulseClass: isPulsing ? 'animate-subtle-pop' : '' };
};

// ============================================
// EXPORTS
// ============================================

export default {
    useHapticFeedback,
    ToastProvider,
    useToast,
    ProgressIndicator,
    OperationProgress,
    useUndoManager,
    DeletableWithUndo,
    ConfirmAction,
    usePulseEffect
};
