import React from 'react';
import { AlertTriangle, Trash2 } from 'lucide-react';
import type { UserRoleRecord } from '../types';
import { getRoleBadgeClass } from '../components';
import { getRoleLabel } from '../utils';

interface AdminDeleteUserModalProps {
    isOpen: boolean;
    user: UserRoleRecord | null;
    onClose: () => void;
    onConfirm: () => void;
}

export const AdminDeleteUserModal: React.FC<AdminDeleteUserModalProps> = ({
    isOpen,
    user,
    onClose,
    onConfirm,
}) => {
    if (!isOpen || !user) return null;

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white dark:bg-gray-800 rounded-2xl max-w-md w-full p-6 shadow-2xl animate-in fade-in zoom-in duration-200">
                <div className="flex items-center gap-4 mb-4">
                    <div className="p-3 bg-red-100 dark:bg-red-900/30 rounded-full">
                        <AlertTriangle size={24} className="text-red-600 dark:text-red-400" />
                    </div>
                    <div>
                        <h3 className="text-lg font-bold text-gray-900 dark:text-white">Hapus Pengguna?</h3>
                        <p className="text-sm text-gray-500">Aksi ini tidak dapat dibatalkan secara permanen</p>
                    </div>
                </div>

                <div className="bg-gray-50 dark:bg-gray-900/50 rounded-xl p-4 mb-6">
                    <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-rose-600 to-red-700 flex items-center justify-center text-white font-bold text-lg">
                            {user.full_name?.[0]?.toUpperCase() || user.email?.[0]?.toUpperCase() || 'U'}
                        </div>
                        <div>
                            <p className="font-semibold text-gray-900 dark:text-white">
                                {user.full_name || 'Tanpa Nama'}
                            </p>
                            <p className="text-sm text-gray-500">{user.email}</p>
                            <span
                                className={`inline-block mt-1 px-2 py-0.5 rounded text-xs font-medium ${getRoleBadgeClass(
                                    user.role || 'user'
                                )}`}
                            >
                                {getRoleLabel(user.role)}
                            </span>
                        </div>
                    </div>
                </div>

                <div className="flex gap-3">
                    <button
                        type="button"
                        onClick={onClose}
                        className="flex-1 px-4 py-2.5 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 font-medium rounded-xl hover:bg-gray-200 dark:hover:bg-gray-600 transition-all cursor-pointer"
                    >
                        Batal
                    </button>
                    <button
                        type="button"
                        onClick={onConfirm}
                        className="flex-1 px-4 py-2.5 bg-red-600 text-white font-medium rounded-xl hover:bg-red-700 transition-all flex items-center justify-center gap-2 shadow-lg shadow-red-500/30 cursor-pointer active:scale-95"
                    >
                        <Trash2 size={16} />
                        Hapus Pengguna
                    </button>
                </div>
            </div>
        </div>
    );
};
