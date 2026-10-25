import React from 'react';
import { AlertCircle, X } from 'lucide-react';

interface AdminErrorToastProps {
    error: string | null;
    onDismiss: () => void;
}

export const AdminErrorToast: React.FC<AdminErrorToastProps> = ({ error, onDismiss }) => {
    if (!error) return null;

    return (
        <div className="fixed bottom-4 right-4 bg-red-500 text-white px-6 py-3 rounded-xl shadow-lg flex items-center gap-3 z-50 animate-in fade-in slide-in-from-bottom-2">
            <AlertCircle size={20} />
            <span>{error}</span>
            <button
                type="button"
                onClick={onDismiss}
                aria-label="Tutup pesan error"
                className="cursor-pointer hover:bg-white/10 p-1 rounded-lg transition-colors"
            >
                <X size={18} />
            </button>
        </div>
    );
};
