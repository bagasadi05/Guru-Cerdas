import React from 'react';
import { Trash2, Undo2, X } from 'lucide-react';
import type { UserRoleRecord } from '../types';

interface AdminUndoToastProps {
    isOpen: boolean;
    user: UserRoleRecord | null;
    onUndo: (user: UserRoleRecord) => void;
    onDismiss: () => void;
}

export const AdminUndoToast: React.FC<AdminUndoToastProps> = ({
    isOpen,
    user,
    onUndo,
    onDismiss,
}) => {
    if (!isOpen || !user) return null;

    return (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-gray-900 dark:bg-gray-800 text-white px-6 py-4 rounded-2xl shadow-2xl flex items-center gap-4 z-50 animate-in slide-in-from-bottom duration-300">
            <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-emerald-500/20 flex items-center justify-center">
                    <Trash2 size={16} className="text-emerald-400" />
                </div>
                <div>
                    <p className="font-medium">Pengguna dipindahkan ke Tempat Sampah</p>
                    <p className="text-sm text-gray-400">{user.email}</p>
                </div>
            </div>
            <button
                type="button"
                onClick={() => onUndo(user)}
                className="flex items-center gap-2 px-4 py-2 bg-brand-600 hover:bg-brand-700 rounded-xl font-medium transition-all cursor-pointer active:scale-95"
            >
                <Undo2 size={16} />
                Batalkan
            </button>
            <button
                type="button"
                onClick={onDismiss}
                className="p-1.5 hover:bg-white/10 rounded-lg transition-all cursor-pointer"
                aria-label="Tutup notifikasi"
            >
                <X size={16} />
            </button>
        </div>
    );
};
