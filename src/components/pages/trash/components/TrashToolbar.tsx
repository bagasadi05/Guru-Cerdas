import React from 'react';
import { Button } from '../../../ui/Button';
import { Search, ArrowUpDown, RotateCcw, Trash2, X } from 'lucide-react';
import { entityConfig, sortOptions, useTrashData } from '../hooks/useTrashData';
import { useTrashMutations } from '../hooks/useTrashMutations';
import { SoftDeleteEntity } from '../../../../services/SoftDeleteService';

interface TrashToolbarProps {
    searchQuery: string;
    setSearchQuery: (q: string) => void;
    filterEntity: ReturnType<typeof useTrashData>['filterEntity'];
    setFilterEntity: ReturnType<typeof useTrashData>['setFilterEntity'];
    sortBy: ReturnType<typeof useTrashData>['sortBy'];
    setSortBy: ReturnType<typeof useTrashData>['setSortBy'];
    showExpiringOnly: boolean;
    setShowExpiringOnly: React.Dispatch<React.SetStateAction<boolean>>;
    selectedItems: Set<string>;
    selectedItemsArray: ReturnType<typeof useTrashData>['selectedItemsArray'];
    restoreBulkMutation: ReturnType<typeof useTrashMutations>['restoreBulkMutation'];
    setConfirmBulkDelete: (confirm: boolean) => void;
    hasActiveFilters: boolean;
    stats: ReturnType<typeof useTrashData>['stats'];
}

export const TrashToolbar: React.FC<TrashToolbarProps> = ({
    searchQuery,
    setSearchQuery,
    filterEntity,
    setFilterEntity,
    sortBy,
    setSortBy,
    showExpiringOnly,
    setShowExpiringOnly,
    selectedItems,
    selectedItemsArray,
    restoreBulkMutation,
    setConfirmBulkDelete,
    hasActiveFilters,
    stats,
}) => {
    return (
        <div className="space-y-4">
            {/* Search, Sort, and Actions */}
            <div className="flex flex-col md:flex-row gap-4">
                <div className="relative flex-1">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                    <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Cari item yang dihapus..."
                        className="w-full pl-12 pr-4 py-3 bg-white dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/50 rounded-xl text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-sm transition-shadow"
                    />
                </div>

                {/* Sort Dropdown */}
                <div className="relative">
                    <select
                        value={sortBy}
                        onChange={(e) => setSortBy(e.target.value as any)}
                        className="appearance-none pl-10 pr-10 py-3 bg-white dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/50 rounded-xl text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-sm cursor-pointer"
                    >
                        {sortOptions.map(opt => (
                            <option key={opt.value} value={opt.value}>{opt.label}</option>
                        ))}
                    </select>
                    <ArrowUpDown className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 pointer-events-none" />
                </div>

                {selectedItems.size > 0 && (
                    <div className="hidden md:flex items-center gap-2 animate-fade-in">
                        <span className="text-sm text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-3 py-1.5 rounded-lg">
                            {selectedItems.size} dipilih
                        </span>
                        <Button
                            onClick={() => restoreBulkMutation.mutate(selectedItemsArray)}
                            disabled={restoreBulkMutation.isPending}
                            size="sm"
                            className="bg-emerald-600 hover:bg-emerald-700 text-white"
                        >
                            <RotateCcw className="w-4 h-4 mr-1.5" />
                            Pulihkan
                        </Button>
                        <Button
                            onClick={() => setConfirmBulkDelete(true)}
                            variant="ghost"
                            size="sm"
                            className="text-red-500 hover:text-red-400 hover:bg-red-500/10"
                        >
                            <Trash2 className="w-4 h-4 mr-1.5" />
                            Hapus
                        </Button>
                    </div>
                )}
            </div>

            {selectedItems.size > 0 && (
                <div className="md:hidden fixed bottom-4 left-4 right-4 z-20">
                    <div className="flex items-center justify-between gap-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700/50 shadow-xl rounded-2xl px-4 py-3">
                        <span className="text-sm font-medium text-slate-700 dark:text-slate-200">
                            {selectedItems.size} dipilih
                        </span>
                        <div className="flex items-center gap-2">
                            <Button
                                onClick={() => restoreBulkMutation.mutate(selectedItemsArray)}
                                disabled={restoreBulkMutation.isPending}
                                size="sm"
                                className="bg-emerald-600 hover:bg-emerald-700 text-white"
                            >
                                <RotateCcw className="w-4 h-4 mr-1.5" />
                                Pulihkan
                            </Button>
                            <Button
                                onClick={() => setConfirmBulkDelete(true)}
                                variant="ghost"
                                size="sm"
                                className="text-red-500 hover:text-red-400 hover:bg-red-500/10"
                            >
                                <Trash2 className="w-4 h-4 mr-1.5" />
                                Hapus
                            </Button>
                        </div>
                    </div>
                </div>
            )}

            {/* Filter Chips */}
            <div className="flex flex-wrap items-center gap-2">
                <button
                    onClick={() => setFilterEntity('all')}
                    aria-pressed={filterEntity === 'all'}
                    className={`px-3 py-1.5 rounded-full text-sm font-medium border transition-colors ${
                        filterEntity === 'all'
                            ? 'bg-indigo-600 text-white border-indigo-600'
                            : 'bg-white dark:bg-slate-800/50 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700/50 hover:border-indigo-300 dark:hover:border-indigo-500/50'
                    }`}
                >
                    Semua ({stats.total})
                </button>

                {Object.entries(entityConfig).map(([key, config]) => (
                    <button
                        key={key}
                        onClick={() => setFilterEntity(filterEntity === key ? 'all' : key as SoftDeleteEntity)}
                        aria-pressed={filterEntity === key}
                        className={`px-3 py-1.5 rounded-full text-sm font-medium border transition-colors ${
                            filterEntity === key
                                ? `border-transparent ${config.bgColor} ${config.color} ring-2 ring-indigo-500/40`
                                : 'bg-white dark:bg-slate-800/50 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700/50 hover:border-indigo-300 dark:hover:border-indigo-500/50'
                        }`}
                    >
                        <span className="inline-flex items-center gap-1.5">
                            {config.icon}
                            {config.labelPlural} ({stats[key as SoftDeleteEntity]})
                        </span>
                    </button>
                ))}

                <button
                    onClick={() => setShowExpiringOnly(prev => !prev)}
                    aria-pressed={showExpiringOnly}
                    className={`px-3 py-1.5 rounded-full text-sm font-medium border transition-colors ${
                        showExpiringOnly
                            ? 'bg-red-500 text-white border-red-500'
                            : 'bg-white dark:bg-slate-800/50 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700/50 hover:border-red-300 dark:hover:border-red-500/50'
                    }`}
                >
                    Segera Hapus ({stats.expiringThisWeek})
                </button>

                {hasActiveFilters && (
                    <button
                        onClick={() => {
                            setSearchQuery('');
                            setFilterEntity('all');
                            setShowExpiringOnly(false);
                        }}
                        className="ml-auto inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium border border-slate-200 dark:border-slate-700/50 text-slate-500 dark:text-slate-300 hover:text-slate-700 dark:hover:text-white bg-white dark:bg-slate-800/50"
                    >
                        <X className="w-4 h-4" />
                        Reset Filter
                    </button>
                )}
            </div>
        </div>
    );
};
