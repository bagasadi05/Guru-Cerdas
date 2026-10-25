import React from 'react';
import { createPortal } from 'react-dom';

interface ConfirmMarkAllDialogProps {
    status: string | null;
    count: number;
    onConfirm: () => void;
    onClose: () => void;
}

export const ConfirmMarkAllDialog: React.FC<ConfirmMarkAllDialogProps> = ({
    status,
    count,
    onConfirm,
    onClose,
}) => {
    if (!status) return null;

    return createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div
                role="presentation"
                aria-hidden="true"
                onKeyDown={(e) => {
                    if (e.key === 'Escape') onClose();
                }}
                className="absolute inset-0 bg-black/50 backdrop-blur-sm"
                onClick={onClose}
            />
            <div className="relative w-full max-w-sm bg-white dark:bg-slate-800 rounded-2xl shadow-2xl p-6">
                <h2 className="text-lg font-bold text-slate-800 dark:text-white mb-2">
                    Tandai Semua Siswa?
                </h2>
                <p className="text-slate-600 dark:text-slate-400 text-sm mb-4">
                    Tandai {count} siswa sebagai{' '}
                    <strong>{status}</strong>?
                </p>
                <div className="flex gap-3">
                    <button
                        type="button"
                        onClick={onClose}
                        className="flex-1 py-2 rounded-xl border dark:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-700 dark:text-white transition-colors"
                    >
                        Batal
                    </button>
                    <button
                        type="button"
                        onClick={onConfirm}
                        className="flex-1 py-2 bg-amber-500 text-white rounded-xl font-bold hover:bg-amber-600 transition-colors"
                    >
                        Ya
                    </button>
                </div>
            </div>
        </div>,
        document.body
    );
};
