import React from 'react';
import { History, Download, Info, Trash2 } from 'lucide-react';
import { Button } from '../../ui/Button';

interface ActionHistoryHeaderProps {
    totalCount: number;
    hasItems: boolean;
    isClearPending: boolean;
    onExportClick: () => void;
    onInfoClick: () => void;
    onClearHistoryClick: () => void;
}

export const ActionHistoryHeader: React.FC<ActionHistoryHeaderProps> = ({
    totalCount,
    hasItems,
    isClearPending,
    onExportClick,
    onInfoClick,
    onClearHistoryClick,
}) => {
    return (
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
                <div className="flex items-center gap-3 mb-2">
                    <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-brand-600 to-brand-700 flex items-center justify-center shadow-lg shadow-brand-600/20">
                        <History className="w-6 h-6 text-white" />
                    </div>
                    <div>
                        <h1 className="text-3xl font-bold text-slate-900 dark:text-white">Riwayat Aksi</h1>
                        <p className="text-slate-500 dark:text-slate-400 text-sm">
                            {totalCount} aksi ditemukan
                        </p>
                    </div>
                </div>
            </div>

            <div className="flex items-center gap-2">
                {hasItems && (
                    <Button
                        onClick={onExportClick}
                        variant="outline"
                        className="bg-white dark:bg-slate-800/50 border-slate-200 dark:border-slate-700/50 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800"
                    >
                        <Download className="w-4 h-4 mr-2" />
                        Export
                    </Button>
                )}

                <button
                    type="button"
                    onClick={onInfoClick}
                    className="p-2.5 rounded-xl bg-white dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/50 text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 transition-colors shadow-sm"
                    title="Informasi"
                >
                    <Info className="w-5 h-5" />
                </button>

                {hasItems && (
                    <Button
                        onClick={onClearHistoryClick}
                        disabled={isClearPending}
                        variant="outline"
                        className="bg-white dark:bg-slate-800/50 border-red-200 dark:border-red-500/30 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10"
                    >
                        <Trash2 className="w-4 h-4 mr-2" />
                        Hapus Riwayat
                    </Button>
                )}
            </div>
        </div>
    );
};
