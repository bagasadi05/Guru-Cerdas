import React from 'react';
import {
    RotateCcw,
    AlertTriangle,
    Info,
    Clock,
    FileText,
    Download,
    Loader2,
    Filter,
    TrendingUp,
} from 'lucide-react';
import { Modal } from '../../ui/Modal';
import { Button } from '../../ui/Button';
import { ActionHistoryItem } from '../types';
import { actionTypeConfig, entityLabels } from '../config';

interface ActionHistoryModalsProps {
    showInfo: boolean;
    onCloseInfo: () => void;
    confirmClearHistory: boolean;
    onCloseConfirmClear: () => void;
    onConfirmClear: () => void;
    isClearPending: boolean;
    viewDetailItem: ActionHistoryItem | null;
    onCloseDetail: () => void;
    onUndoDetail: (actionId: string) => void;
    isUndoPending: boolean;
    formatRelativeTime: (date: Date) => string;
    showExport: boolean;
    onCloseExport: () => void;
    onExport: (format: 'csv' | 'json') => void;
    isExporting: boolean;
    actionsCount: number;
    totalCount: number;
}

export const ActionHistoryModals: React.FC<ActionHistoryModalsProps> = ({
    showInfo,
    onCloseInfo,
    confirmClearHistory,
    onCloseConfirmClear,
    onConfirmClear,
    isClearPending,
    viewDetailItem,
    onCloseDetail,
    onUndoDetail,
    isUndoPending,
    formatRelativeTime,
    showExport,
    onCloseExport,
    onExport,
    isExporting,
    actionsCount,
    totalCount,
}) => {
    // Render Previous State Item Details
    const renderDetailState = (state: Record<string, unknown>) => {
        const excludedKeys = ['id', 'user_id', 'created_at', 'updated_at', 'deleted_at', 'school_id'];

        return (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-2">
                {Object.entries(state)
                    .filter(([key]) => !excludedKeys.includes(key) && !key.endsWith('_id'))
                    .map(([key, value]) => (
                        <div key={key} className="bg-slate-50 dark:bg-slate-800 p-2.5 rounded-lg border border-slate-100 dark:border-slate-700">
                            <div className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-1">
                                {key.replace(/_/g, ' ')}
                            </div>
                            <div className="text-sm font-semibold text-slate-900 dark:text-white break-words">
                                {value === null || value === undefined ? '-' : String(value)}
                            </div>
                        </div>
                    ))}
            </div>
        );
    };

    return (
        <>
            {/* Info Modal */}
            <Modal
                isOpen={showInfo}
                onClose={onCloseInfo}
                title="Tentang Riwayat Aksi"
            >
                <div className="space-y-4 text-slate-600 dark:text-slate-400">
                    <div className="flex items-start gap-3 p-4 rounded-xl bg-brand-500/10 border border-brand-500/20">
                        <Info className="w-5 h-5 text-brand-500 mt-0.5 flex-shrink-0" />
                        <div>
                            <p className="font-semibold text-brand-600 dark:text-brand-400 mb-1">Apa itu Riwayat Aksi?</p>
                            <p className="text-sm">Riwayat Aksi mencatat semua perubahan data yang Anda lakukan, termasuk menambah, mengedit, dan menghapus data.</p>
                        </div>
                    </div>

                    <div className="space-y-3">
                        <h4 className="font-semibold text-slate-900 dark:text-white">Fitur Utama:</h4>
                        <ul className="space-y-3 text-sm">
                            <li className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                                    <RotateCcw className="w-4 h-4 text-emerald-500" />
                                </div>
                                <span><strong>Undo</strong> - Batalkan aksi terakhir dalam waktu terbatas</span>
                            </li>
                            <li className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center">
                                    <Filter className="w-4 h-4 text-blue-500" />
                                </div>
                                <span><strong>Filter</strong> - Cari berdasarkan tipe aksi, data, atau tanggal</span>
                            </li>
                            <li className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-lg bg-purple-500/10 flex items-center justify-center">
                                    <TrendingUp className="w-4 h-4 text-purple-500" />
                                </div>
                                <span><strong>Statistik</strong> - Lihat ringkasan aktivitas Anda</span>
                            </li>
                        </ul>
                    </div>

                    <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20">
                        <p className="text-sm text-amber-600 dark:text-amber-400 flex items-center gap-2">
                            <Clock className="w-4 h-4" />
                            Aksi hanya dapat dibatalkan dalam waktu singkat setelah dilakukan.
                        </p>
                    </div>
                </div>
            </Modal>

            {/* Confirm Clear History Modal */}
            <Modal
                isOpen={confirmClearHistory}
                onClose={onCloseConfirmClear}
                title="Hapus Semua Riwayat"
                icon={<AlertTriangle className="w-5 h-5 text-red-500" />}
            >
                <div className="space-y-4">
                    <p className="text-slate-600 dark:text-slate-400">
                        Apakah Anda yakin ingin menghapus <strong className="text-slate-900 dark:text-white">semua riwayat aksi</strong>?
                    </p>
                    <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20">
                        <p className="text-sm text-red-600 dark:text-red-400 flex items-center gap-2">
                            <AlertTriangle className="w-4 h-4" />
                            Tindakan ini tidak dapat dibatalkan. Catatan riwayat akan hilang selamanya, namun pemulihan data (undo) mungkin masih bisa dilakukan jika dalam batas waktu.
                        </p>
                    </div>
                    <div className="flex justify-end gap-3 pt-2">
                        <Button variant="ghost" onClick={onCloseConfirmClear}>
                            Batal
                        </Button>
                        <Button
                            onClick={onConfirmClear}
                            disabled={isClearPending}
                            className="bg-red-600 hover:bg-red-700 text-white"
                        >
                            {isClearPending && (
                                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            )}
                            Hapus Semua
                        </Button>
                    </div>
                </div>
            </Modal>

            {/* Detail Modal */}
            <Modal
                isOpen={!!viewDetailItem}
                onClose={onCloseDetail}
                title="Detail Aksi"
                maxWidth="max-w-2xl"
            >
                {viewDetailItem && (
                    <div className="space-y-6">
                        <div className="flex items-center gap-4">
                            <div className={`w-14 h-14 rounded-2xl flex items-center justify-center ${actionTypeConfig[viewDetailItem.actionType].bgColor} ${actionTypeConfig[viewDetailItem.actionType].color}`}>
                                {React.cloneElement(actionTypeConfig[viewDetailItem.actionType].icon as React.ReactElement, { className: 'w-7 h-7' })}
                            </div>
                            <div>
                                <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                                    {viewDetailItem.description}
                                </h3>
                                <p className="text-slate-500 dark:text-slate-400 text-sm">
                                    {formatRelativeTime(viewDetailItem.createdAt)} • {entityLabels[viewDetailItem.entity]}
                                </p>
                            </div>
                        </div>

                        {viewDetailItem.previousState && viewDetailItem.previousState.length > 0 ? (
                            <div>
                                <h4 className="text-sm font-semibold text-slate-900 dark:text-white mb-3">
                                    {viewDetailItem.actionType === 'update' ? 'Data Sebelum Perubahan' : 'Data Terkait'}
                                </h4>
                                <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-2 custom-scrollbar">
                                    {viewDetailItem.previousState.map((state, idx) => (
                                        <div key={idx} className="border-l-4 border-brand-500 pl-4 py-1">
                                            <div className="text-xs font-bold text-brand-600 dark:text-brand-400 mb-1">
                                                Item #{idx + 1} ({String(state.id)})
                                            </div>
                                            {renderDetailState(state)}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ) : (
                            <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl text-center text-slate-500 italic">
                                Tidak ada detail data yang tersimpan untuk aksi ini.
                            </div>
                        )}

                        <div className="flex justify-end gap-3 pt-4 border-t border-slate-200 dark:border-slate-700">
                            <Button variant="ghost" onClick={onCloseDetail}>
                                Tutup
                            </Button>
                            {viewDetailItem.canUndo && (
                                <Button
                                    onClick={() => onUndoDetail(viewDetailItem.id)}
                                    disabled={isUndoPending}
                                    className="bg-emerald-600 hover:bg-emerald-700 text-white"
                                >
                                    <RotateCcw className="w-4 h-4 mr-2" />
                                    Undo Aksi Ini
                                </Button>
                            )}
                        </div>
                    </div>
                )}
            </Modal>

            {/* Export Modal */}
            <Modal
                isOpen={showExport}
                onClose={onCloseExport}
                title="Export Riwayat Aksi"
                icon={<FileText className="w-5 h-5 text-brand-500" />}
            >
                <div className="space-y-4">
                    <p className="text-slate-600 dark:text-slate-400">
                        Export <strong className="text-slate-900 dark:text-white">{actionsCount} riwayat aksi</strong> yang ada di halaman ini.
                    </p>

                    <div className="grid grid-cols-2 gap-3">
                        <button
                            type="button"
                            onClick={() => onExport('csv')}
                            disabled={isExporting}
                            className="flex flex-col items-center gap-3 p-5 rounded-2xl border-2 border-slate-200 dark:border-slate-700 hover:border-brand-500 dark:hover:border-brand-500 hover:bg-brand-50 dark:hover:bg-brand-500/10 transition-all group"
                        >
                            <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 flex items-center justify-center group-hover:bg-emerald-500/20 transition-colors">
                                <FileText className="w-7 h-7 text-emerald-500" />
                            </div>
                            <div className="text-center">
                                <div className="font-bold text-slate-900 dark:text-white">CSV</div>
                                <div className="text-xs text-slate-500">Untuk Excel</div>
                            </div>
                        </button>

                        <button
                            type="button"
                            onClick={() => onExport('json')}
                            disabled={isExporting}
                            className="flex flex-col items-center gap-3 p-5 rounded-2xl border-2 border-slate-200 dark:border-slate-700 hover:border-brand-500 dark:hover:border-brand-500 hover:bg-brand-50 dark:hover:bg-brand-500/10 transition-all group"
                        >
                            <div className="w-14 h-14 rounded-2xl bg-blue-500/10 flex items-center justify-center group-hover:bg-blue-500/20 transition-colors">
                                <Download className="w-7 h-7 text-blue-500" />
                            </div>
                            <div className="text-center">
                                <div className="font-bold text-slate-900 dark:text-white">JSON</div>
                                <div className="text-xs text-slate-500">Untuk Developer</div>
                            </div>
                        </button>
                    </div>

                    {isExporting && (
                        <div className="flex items-center justify-center gap-2 py-3 text-brand-600 dark:text-brand-400">
                            <Loader2 className="w-5 h-5 animate-spin" />
                            <span>Mengexport data...</span>
                        </div>
                    )}

                    <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20">
                        <p className="text-sm text-amber-600 dark:text-amber-400 flex items-center gap-2">
                            <Info className="w-4 h-4 flex-shrink-0" />
                            Export hanya mencakup riwayat di halaman ini ({actionsCount} dari {totalCount} total).
                        </p>
                    </div>
                </div>
            </Modal>
        </>
    );
};
