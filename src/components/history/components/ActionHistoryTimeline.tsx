import React from 'react';
import {
    History,
    Calendar,
    Clock,
    Eye,
    RotateCcw,
    XCircle,
    ChevronLeft,
    ChevronRight,
} from 'lucide-react';
import { ActionHistoryItem } from '../types';
import { actionTypeConfig, entityConfig, entityLabels } from '../config';

interface ActionHistoryTimelineProps {
    actions: ActionHistoryItem[];
    groupedActions: Record<string, ActionHistoryItem[]>;
    hasActiveFilters: boolean;
    page: number;
    pageSize: number;
    totalCount: number;
    onPageChange: (newPage: number) => void;
    onViewDetail: (item: ActionHistoryItem) => void;
    onUndo: (actionId: string) => void;
    isUndoPending: boolean;
    formatRelativeTime: (date: Date) => string;
}

export const ActionHistoryTimeline: React.FC<ActionHistoryTimelineProps> = ({
    actions,
    groupedActions,
    hasActiveFilters,
    page,
    pageSize,
    totalCount,
    onPageChange,
    onViewDetail,
    onUndo,
    isUndoPending,
    formatRelativeTime,
}) => {
    if (actions.length === 0) {
        return (
            <div className="text-center py-20 bg-white dark:bg-slate-800/30 rounded-3xl border border-slate-200 dark:border-slate-700/50 shadow-sm">
                <div className="w-24 h-24 mx-auto rounded-3xl bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-800 dark:to-slate-700 flex items-center justify-center mb-6">
                    <History className="w-12 h-12 text-slate-400 dark:text-slate-500" />
                </div>
                <h3 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">Tidak Ada Riwayat</h3>
                <p className="text-slate-500 dark:text-slate-400 max-w-md mx-auto">
                    {hasActiveFilters
                        ? 'Tidak ada riwayat yang cocok dengan filter Anda. Coba ubah kriteria pencarian.'
                        : 'Belum ada aksi yang tercatat.'}
                </p>
            </div>
        );
    }

    const totalPages = Math.ceil(totalCount / pageSize);

    return (
        <div className="space-y-8">
            {Object.entries(groupedActions).map(([date, groupActions]) => (
                <div key={date} className="animate-fade-in">
                    <div className="flex items-center gap-3 mb-4">
                        <div className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
                            <Calendar className="w-4 h-4 text-slate-500" />
                        </div>
                        <h3 className="font-bold text-lg text-slate-900 dark:text-white">{date}</h3>
                        <span className="text-sm text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-2.5 py-0.5 rounded-full">
                            {groupActions.length} aksi
                        </span>
                    </div>

                    <div className="relative">
                        {/* Timeline Line */}
                        <div className="absolute left-6 top-6 bottom-6 w-0.5 bg-gradient-to-b from-brand-500/50 via-slate-300 dark:via-slate-600 to-transparent" />

                        <div className="space-y-3 relative">
                            {groupActions.map((action) => {
                                const config = actionTypeConfig[action.actionType];
                                const entity = entityConfig[action.entity];

                                return (
                                    <div
                                        key={action.id}
                                        className={`group flex flex-wrap items-center gap-3 sm:gap-4 p-4 bg-white dark:bg-slate-800/40 border rounded-2xl hover:shadow-md transition-all ${
                                            action.canUndo
                                                ? 'border-emerald-200 dark:border-emerald-500/20'
                                                : 'border-slate-200 dark:border-slate-700/50'
                                        }`}
                                    >
                                        {/* Icon */}
                                        <div className={`w-12 h-12 rounded-xl ${config.bgColor} flex items-center justify-center ${config.color} flex-shrink-0`}>
                                            {config.icon}
                                        </div>

                                        {/* Content */}
                                        <div className="flex-1 min-w-0">
                                            <p className="font-semibold text-slate-900 dark:text-white truncate">
                                                {action.description}
                                            </p>
                                            <div className="flex items-center flex-wrap gap-2 mt-1.5">
                                                <span className={`text-xs px-2.5 py-1 rounded-lg font-medium ${config.bgColor} ${config.color}`}>
                                                    {config.label}
                                                </span>
                                                <span className={`text-xs px-2.5 py-1 rounded-lg font-medium ${entity?.bgColor || 'bg-slate-100 dark:bg-slate-800'} ${entity?.color || 'text-slate-600'}`}>
                                                    {entityLabels[action.entity] || action.entity}
                                                </span>
                                                <span className="text-xs text-slate-400 dark:text-slate-500 flex items-center gap-1">
                                                    <Clock className="w-3 h-3" />
                                                    {formatRelativeTime(action.createdAt)}
                                                </span>
                                            </div>
                                        </div>

                                        {/* Actions */}
                                        <div className="flex items-center gap-2 flex-shrink-0 sm:ml-auto">
                                            <button
                                                type="button"
                                                onClick={() => onViewDetail(action)}
                                                className="p-2 rounded-lg text-slate-400 hover:text-brand-600 hover:bg-brand-50 dark:hover:bg-brand-500/10 transition-colors"
                                                title="Lihat Detail"
                                            >
                                                <Eye className="w-5 h-5" />
                                            </button>

                                            {action.canUndo ? (
                                                <button
                                                    type="button"
                                                    onClick={() => onUndo(action.id)}
                                                    disabled={isUndoPending}
                                                    className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-700 to-emerald-800 hover:from-emerald-800 hover:to-teal-800 text-white text-sm font-semibold shadow-lg shadow-emerald-500/25 transition-all disabled:opacity-50"
                                                >
                                                    <RotateCcw className={`w-4 h-4 ${isUndoPending ? 'animate-spin' : ''}`} />
                                                    Undo
                                                </button>
                                            ) : (
                                                <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-500 text-xs">
                                                    <XCircle className="w-4 h-4" />
                                                    <span className="hidden sm:inline">Tidak dapat dibatalkan</span>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>
            ))}

            {/* Pagination */}
            <div className="flex items-center justify-center gap-2 pt-6">
                <button
                    type="button"
                    onClick={() => onPageChange(Math.max(0, page - 1))}
                    disabled={page === 0}
                    className="flex items-center gap-2 px-5 py-2.5 bg-white dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/50 rounded-xl text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed shadow-sm transition-all"
                >
                    <ChevronLeft className="w-4 h-4" />
                    Sebelumnya
                </button>

                <div className="flex items-center gap-1 px-4">
                    <span className="w-10 h-10 rounded-xl bg-brand-600 text-white font-semibold flex items-center justify-center">
                        {page + 1}
                    </span>
                    <span className="text-slate-400 mx-2">/</span>
                    <span className="text-slate-600 dark:text-slate-400 font-medium">
                        {totalPages}
                    </span>
                </div>

                <button
                    type="button"
                    onClick={() => onPageChange(page + 1)}
                    disabled={(page + 1) * pageSize >= totalCount}
                    className="flex items-center gap-2 px-5 py-2.5 bg-white dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/50 rounded-xl text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed shadow-sm transition-all"
                >
                    Selanjutnya
                    <ChevronRight className="w-4 h-4" />
                </button>
            </div>
        </div>
    );
};
