import { useContext } from 'react';
import { ToastContext } from './toastContext';

export function useFeedbackToast() {
    const context = useContext(ToastContext);
    if (!context) {
        throw new Error('useFeedbackToast must be used within ToastProvider');
    }
    return context;
}
