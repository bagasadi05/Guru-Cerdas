import React from 'react';
import { Activity, PlusCircle, Edit3, Trash2, RotateCcw } from 'lucide-react';
import { ActionHistoryStats } from '../types';

interface ActionHistoryStatsCardsProps {
    stats: ActionHistoryStats;
}

export const ActionHistoryStatsCards: React.FC<ActionHistoryStatsCardsProps> = ({ stats }) => {
    return (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            {/* Total */}
            <div className="bg-white dark:bg-slate-800/40 backdrop-blur-sm border border-slate-200 dark:border-slate-700/50 rounded-2xl p-4 shadow-sm">
                <div className="flex items-center justify-between">
                    <div className="w-10 h-10 rounded-xl bg-brand-500/10 flex items-center justify-center">
                        <Activity className="w-5 h-5 text-brand-500" />
                    </div>
                    <div className="text-2xl font-bold text-slate-900 dark:text-white">{stats.total}</div>
                </div>
                <div className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider mt-2">Total</div>
            </div>

            {/* Create */}
            <div className="bg-white dark:bg-slate-800/40 backdrop-blur-sm border border-slate-200 dark:border-slate-700/50 rounded-2xl p-4 shadow-sm">
                <div className="flex items-center justify-between">
                    <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center">
                        <PlusCircle className="w-5 h-5 text-emerald-500" />
                    </div>
                    <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">{stats.create}</div>
                </div>
                <div className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider mt-2">Dibuat</div>
            </div>

            {/* Update */}
            <div className="bg-white dark:bg-slate-800/40 backdrop-blur-sm border border-slate-200 dark:border-slate-700/50 rounded-2xl p-4 shadow-sm">
                <div className="flex items-center justify-between">
                    <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center">
                        <Edit3 className="w-5 h-5 text-blue-500" />
                    </div>
                    <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">{stats.update}</div>
                </div>
                <div className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider mt-2">Diupdate</div>
            </div>

            {/* Delete */}
            <div className="bg-white dark:bg-slate-800/40 backdrop-blur-sm border border-slate-200 dark:border-slate-700/50 rounded-2xl p-4 shadow-sm">
                <div className="flex items-center justify-between">
                    <div className="w-10 h-10 rounded-xl bg-red-500/10 flex items-center justify-center">
                        <Trash2 className="w-5 h-5 text-red-500" />
                    </div>
                    <div className="text-2xl font-bold text-red-600 dark:text-red-400">{stats.delete}</div>
                </div>
                <div className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider mt-2">Dihapus</div>
            </div>

            {/* Undoable */}
            <div className="bg-white dark:bg-slate-800/40 backdrop-blur-sm border border-slate-200 dark:border-slate-700/50 rounded-2xl p-4 shadow-sm">
                <div className="flex items-center justify-between">
                    <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center">
                        <RotateCcw className="w-5 h-5 text-amber-500" />
                    </div>
                    <div className="text-2xl font-bold text-amber-600 dark:text-amber-400">{stats.undoable}</div>
                </div>
                <div className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider mt-2">Undo</div>
            </div>
        </div>
    );
};
