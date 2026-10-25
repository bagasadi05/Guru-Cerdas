import React from 'react';
import { TaskStats } from '../types';

export interface TasksStatsCardsProps {
    stats: TaskStats;
}

export const TasksStatsCards: React.FC<TasksStatsCardsProps> = ({ stats }) => {
    return (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
            <div className="bg-white dark:bg-slate-800/50 rounded-2xl border border-slate-200 dark:border-slate-700/50 shadow-lg p-3 sm:p-6 text-center">
                <div className="text-xl sm:text-4xl font-bold text-slate-800 dark:text-white mb-0.5 sm:mb-1">{stats.total}</div>
                <div className="text-xxs sm:text-sm font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Total</div>
            </div>
            <div className="bg-white dark:bg-slate-800/50 rounded-2xl border border-slate-200 dark:border-slate-700/50 shadow-lg p-3 sm:p-6 text-center">
                <div className="text-xl sm:text-4xl font-bold text-slate-400 mb-0.5 sm:mb-1">{stats.todo}</div>
                <div className="text-xxs sm:text-sm font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Belum Mulai</div>
            </div>
            <div className="bg-white dark:bg-slate-800/50 rounded-2xl border border-slate-200 dark:border-slate-700/50 shadow-lg p-3 sm:p-6 text-center">
                <div className="text-xl sm:text-4xl font-bold text-blue-500 mb-0.5 sm:mb-1">{stats.inProgress}</div>
                <div className="text-xxs sm:text-sm font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Dikerjakan</div>
            </div>
            <div className="bg-white dark:bg-slate-800/50 rounded-2xl border border-slate-200 dark:border-slate-700/50 shadow-lg p-3 sm:p-6 text-center">
                <div className="text-xl sm:text-4xl font-bold text-emerald-600 dark:text-emerald-400 mb-0.5 sm:mb-1">{stats.done}</div>
                <div className="text-xxs sm:text-sm font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Selesai</div>
            </div>
        </div>
    );
};
