import React from 'react';
import { createPortal } from 'react-dom';
import { Trash2 } from 'lucide-react';
import { Extracurricular } from '../types';

interface DeleteExtracurricularDialogProps {
    extracurricular: Extracurricular | null;
    onConfirm: (id: string) => void;
    onClose: () => void;
    isDeleting?: boolean;
}

export const DeleteExtracurricularDialog: React.FC<DeleteExtracurricularDialogProps> = ({
    extracurricular,
    onConfirm,
    onClose,
    isDeleting = false,
}) => {
    if (!extracurricular) return null;

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
            <div className="relative w-full max-w-md bg-white dark:bg-slate-800 rounded-2xl shadow-2xl p-6">
                <h2 className="text-xl font-bold text-slate-800 dark:text-white flex items-center gap-2 mb-4">
                    <Trash2 className="w-5 h-5 text-red-500" />
                    Hapus Ekstrakurikuler?
                </h2>
                <p className="text-slate-600 dark:text-slate-400 mb-4">
                    Hapus{' '}
                    <strong className="text-slate-900 dark:text-white">
                        {extracurricular.name}
                    </strong>
                    ? Data ekstrakurikuler ini akan dipindahkan ke pemulihan.
                </p>
                <div className="flex gap-3">
                    <button
                        type="button"
                        onClick={onClose}
                        className="flex-1 px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-300 hover:bg-slate-50 transition-colors"
                    >
                        Batal
                    </button>
                    <button
                        type="button"
                        disabled={isDeleting}
                        onClick={() => onConfirm(extracurricular.id)}
                        className="flex-1 px-4 py-2.5 bg-red-600 text-white rounded-xl font-bold hover:bg-red-700 transition-colors disabled:opacity-50"
                    >
                        {isDeleting ? 'Menghapus...' : 'Ya, Hapus'}
                    </button>
                </div>
            </div>
        </div>,
        document.body
    );
};
