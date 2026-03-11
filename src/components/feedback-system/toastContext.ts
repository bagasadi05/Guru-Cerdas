import { createContext } from 'react';
import type { Toast } from './ToastSystem';

export interface ToastContextValue {
    toasts: Toast[];
    addToast: (toast: Omit<Toast, 'id'>) => string;
    removeToast: (id: string) => void;
    updateToast: (id: string, updates: Partial<Toast>) => void;
    clearAll: () => void;
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

export const ToastContext = createContext<ToastContextValue | null>(null);
