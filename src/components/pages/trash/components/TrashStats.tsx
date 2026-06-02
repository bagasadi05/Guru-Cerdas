import React from 'react';
import { Sparkles } from 'lucide-react';
import { entityConfig, useTrashData } from '../hooks/useTrashData';
import { SoftDeleteEntity } from '../../../../services/SoftDeleteService';

interface TrashStatsProps {
    stats: ReturnType<typeof useTrashData>['stats'];
    filterEntity: ReturnType<typeof useTrashData>['filterEntity'];
    setFilterEntity: ReturnType<typeof useTrashData>['setFilterEntity'];
}

export const TrashStats: React.FC<TrashStatsProps> = ({
    stats,
    filterEntity,
    setFilterEntity,
}) => {
    return (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div
                onClick={() => setFilterEntity('all')}
                className={`bg-white dark:bg-slate-800/40 backdrop-blur-sm border rounded-2xl p-4 shadow-sm cursor-pointer transition-all hover:shadow-md ${
                    filterEntity === 'all' ? 'ring-2 ring-indigo-500 border-indigo-500/50' : 'border-slate-200 dark:border-slate-700/50'
                }`}
            >
                <div className="flex items-center justify-between">
                    <div className="text-3xl font-bold text-slate-900 dark:text-white">{stats.total}</div>
                    <Sparkles className="w-5 h-5 text-indigo-500" />
                </div>
                <div className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider mt-1">Total Item</div>
            </div>

            {Object.entries(entityConfig).map(([key, config]) => (
                <div
                    key={key}
                    onClick={() => setFilterEntity(filterEntity === key ? 'all' : key as SoftDeleteEntity)}
                    className={`bg-white dark:bg-slate-800/40 backdrop-blur-sm border rounded-2xl p-4 cursor-pointer transition-all hover:shadow-md ${
                        filterEntity === key ? `ring-2 ring-indigo-500 ${config.borderColor}` : 'border-slate-200 dark:border-slate-700/50'
                    }`}
                >
                    <div className="flex items-center justify-between">
                        <div className={`w-8 h-8 rounded-lg ${config.bgColor} flex items-center justify-center ${config.color}`}>
                            {config.icon}
                        </div>
                        <div className="text-2xl font-bold text-slate-900 dark:text-white">
                            {stats[key as keyof typeof stats]}
                        </div>
                    </div>
                    <div className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider mt-2">
                        {config.labelPlural}
                    </div>
                </div>
            ))}
        </div>
    );
};
