import React from 'react';
import { Modal } from './Modal';
import { Button } from './Button';
import { AlertTriangleIcon, AlertCircleIcon, CheckCircleIcon } from '../Icons';

// ============================================
// Overwrite Confirmation Modal
// ============================================

interface OverwriteConfirmationProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => void;
    studentName: string;
    oldScore: number;
    newScore: number;
}

export const OverwriteConfirmation: React.FC<OverwriteConfirmationProps> = ({
    isOpen,
    onClose,
    onConfirm,
    studentName,
    oldScore,
    newScore,
}) => {
    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title="Konfirmasi Timpa Nilai"
            icon={<AlertTriangleIcon className="w-6 h-6 text-amber-500" />}
        >
            <div className="space-y-4">
                <p className="text-gray-600 dark:text-gray-400">
                    <strong className="text-gray-900 dark:text-gray-100">{studentName}</strong> sudah memiliki nilai.
                    Apakah Anda yakin ingin mengganti nilai yang ada?
                </p>

                <div className="flex items-center justify-center gap-4 py-4">
                    <div className="text-center p-4 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
                        <p className="text-sm text-red-500 mb-1">Nilai Lama</p>
                        <p className="text-3xl font-bold text-red-600 dark:text-red-400">{oldScore}</p>
                    </div>
                    <div className="text-2xl text-gray-400">→</div>
                    <div className="text-center p-4 rounded-xl bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800">
                        <p className="text-sm text-green-500 mb-1">Nilai Baru</p>
                        <p className="text-3xl font-bold text-green-600 dark:text-green-400">{newScore}</p>
                    </div>
                </div>

                <div className="flex justify-end gap-2 pt-4 border-t border-gray-200 dark:border-gray-700">
                    <Button variant="ghost" onClick={onClose}>
                        Batal
                    </Button>
                    <Button onClick={onConfirm} className="bg-amber-500 hover:bg-amber-600">
                        Ya, Timpa Nilai
                    </Button>
                </div>
            </div>
        </Modal>
    );
};

// ============================================
// Empty Grades Confirmation Modal
// ============================================

interface EmptyGradesConfirmationProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => void;
    filledCount: number;
    emptyCount: number;
    totalCount: number;
}

export const EmptyGradesConfirmation: React.FC<EmptyGradesConfirmationProps> = ({
    isOpen,
    onClose,
    onConfirm,
    filledCount,
    emptyCount,
    totalCount,
}) => {
    const percentage = Math.round((filledCount / totalCount) * 100);

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title="Simpan dengan Nilai Kosong?"
            icon={<AlertCircleIcon className="w-6 h-6 text-blue-500" />}
        >
            <div className="space-y-4">
                <p className="text-gray-600 dark:text-gray-400">
                    Beberapa siswa belum memiliki nilai. Anda dapat menyimpan sekarang atau mengisi nilai yang kosong terlebih dahulu.
                </p>

                {/* Progress visualization */}
                <div className="p-4 bg-gray-50 dark:bg-gray-800/50 rounded-xl">
                    <div className="flex justify-between text-sm mb-2">
                        <span className="text-gray-500">Progress Input</span>
                        <span className="font-bold text-indigo-600 dark:text-indigo-400">{percentage}%</span>
                    </div>
                    <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                        <div
                            className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full transition-all"
                            style={{ width: `${percentage}%` }}
                        />
                    </div>
                    <div className="flex justify-between text-xs text-gray-500 mt-2">
                        <span>✅ {filledCount} terisi</span>
                        <span>⚠️ {emptyCount} kosong</span>
                    </div>
                </div>

                <div className="flex justify-end gap-2 pt-4 border-t border-gray-200 dark:border-gray-700">
                    <Button variant="ghost" onClick={onClose}>
                        Isi Nilai Dulu
                    </Button>
                    <Button onClick={onConfirm} className="bg-indigo-600 hover:bg-indigo-700">
                        Simpan {filledCount} Nilai
                    </Button>
                </div>
            </div>
        </Modal>
    );
};

// ============================================
// Success Animation Modal
// ============================================

interface SaveSuccessModalProps {
    isOpen: boolean;
    onClose: () => void;
    savedCount: number;
}

export const SaveSuccessModal: React.FC<SaveSuccessModalProps> = ({
    isOpen,
    onClose,
    savedCount,
}) => {
    React.useEffect(() => {
        if (isOpen) {
            const timer = setTimeout(onClose, 3000);
            return () => clearTimeout(timer);
        }
    }, [isOpen, onClose]);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none">
            <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-2xl p-8 max-w-sm text-center animate-bounce-in pointer-events-auto">
                {/* Animated checkmark */}
                <div className="w-20 h-20 mx-auto mb-4 relative">
                    <div className="absolute inset-0 bg-green-500 rounded-full animate-ping opacity-25" />
                    <div className="relative w-full h-full bg-gradient-to-br from-green-400 to-emerald-500 rounded-full flex items-center justify-center">
                        <CheckCircleIcon className="w-10 h-10 text-white animate-scale-in" />
                    </div>
                </div>

                <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-2">
                    Berhasil Disimpan! 🎉
                </h3>
                <p className="text-gray-500 dark:text-gray-400">
                    {savedCount} nilai telah berhasil disimpan ke database.
                </p>

                {/* Confetti effect (CSS-based) */}
                <div className="absolute inset-0 overflow-hidden pointer-events-none">
                    {[...Array(12)].map((_, i) => (
                        <div
                            key={i}
                            className="absolute w-2 h-2 rounded-full animate-confetti"
                            style={{
                                left: `${10 + i * 7}%`,
                                backgroundColor: ['#6366f1', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981'][i % 5],
                                animationDelay: `${i * 0.1}s`,
                            }}
                        />
                    ))}
                </div>
            </div>
        </div>
    );
};

// ============================================
// Clear All Confirmation Modal
// ============================================

interface ClearAllConfirmationProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => void;
    count: number;
}

export const ClearAllConfirmation: React.FC<ClearAllConfirmationProps> = ({
    isOpen,
    onClose,
    onConfirm,
    count,
}) => {
    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title="Hapus Semua Nilai?"
            icon={<AlertTriangleIcon className="w-6 h-6 text-red-500" />}
        >
            <div className="space-y-4">
                <p className="text-gray-600 dark:text-gray-400">
                    Anda akan menghapus <strong className="text-red-500">{count} nilai</strong> yang sudah diinput.
                    Tindakan ini tidak dapat dibatalkan.
                </p>

                <div className="p-4 bg-red-50 dark:bg-red-900/20 rounded-xl border border-red-200 dark:border-red-800">
                    <p className="text-sm text-red-600 dark:text-red-400">
                        ⚠️ Nilai yang sudah tersimpan di database tidak akan terhapus.
                        Ini hanya menghapus nilai yang belum disimpan di form ini.
                    </p>
                </div>

                <div className="flex justify-end gap-2 pt-4 border-t border-gray-200 dark:border-gray-700">
                    <Button variant="ghost" onClick={onClose}>
                        Batal
                    </Button>
                    <Button onClick={onConfirm} variant="destructive">
                        Ya, Hapus Semua
                    </Button>
                </div>
            </div>
        </Modal>
    );
};

export default {
    OverwriteConfirmation,
    EmptyGradesConfirmation,
    SaveSuccessModal,
    ClearAllConfirmation,
};
