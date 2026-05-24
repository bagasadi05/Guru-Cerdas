import React from 'react';

interface GradeStats {
    average: number;
    aboveKkmCount: number;
    belowKkmCount: number;
    perfectCount: number;
}

interface StatsPanelProps {
    stats: GradeStats;
    kkm: number;
}

export const StatsPanel: React.FC<StatsPanelProps> = ({ stats, kkm }) => {
    return (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 animate-fade-in">
            <div className="p-3 rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800/30">
                <p className="text-xl font-bold text-blue-600 dark:text-blue-400">{stats.average}</p>
                <p className="text-xs text-blue-500">Rata-rata</p>
            </div>
            <div className="p-3 rounded-lg bg-green-50 dark:bg-green-900/20 border border-green-100 dark:border-green-800/30">
                <p className="text-xl font-bold text-green-600 dark:text-green-400">{stats.aboveKkmCount}</p>
                <p className="text-xs text-green-500">Tuntas ≥{kkm}</p>
            </div>
            <div className="p-3 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-100 dark:border-amber-800/30">
                <p className="text-xl font-bold text-amber-600 dark:text-amber-400">{stats.belowKkmCount}</p>
                <p className="text-xs text-amber-500">Belum Tuntas</p>
            </div>
            <div className="p-3 rounded-lg bg-purple-50 dark:bg-purple-900/20 border border-purple-100 dark:border-purple-800/30">
                <p className="text-xl font-bold text-purple-600 dark:text-purple-400">{stats.perfectCount}</p>
                <p className="text-xs text-purple-500">Nilai 100</p>
            </div>
        </div>
    );
};
