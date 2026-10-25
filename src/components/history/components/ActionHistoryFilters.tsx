import React from 'react';
import { Search, Filter, ChevronDown } from 'lucide-react';
import { ActionType, SoftDeleteEntity, ActionHistoryDateRange } from '../types';
import { actionTypeConfig, entityLabels } from '../config';

interface ActionHistoryFiltersProps {
    searchQuery: string;
    onSearchChange: (value: string) => void;
    showFilters: boolean;
    onToggleShowFilters: () => void;
    hasActiveFilters: boolean;
    activeFilterCount: number;
    filterType: ActionType | 'all';
    onFilterTypeChange: (type: ActionType | 'all') => void;
    filterEntity: SoftDeleteEntity | 'all';
    onFilterEntityChange: (entity: SoftDeleteEntity | 'all') => void;
    dateRange: ActionHistoryDateRange;
    onDateRangeChange: (range: ActionHistoryDateRange) => void;
    totalCount: number;
    onClearFilters: () => void;
}

export const ActionHistoryFilters: React.FC<ActionHistoryFiltersProps> = ({
    searchQuery,
    onSearchChange,
    showFilters,
    onToggleShowFilters,
    hasActiveFilters,
    activeFilterCount,
    filterType,
    onFilterTypeChange,
    filterEntity,
    onFilterEntityChange,
    dateRange,
    onDateRangeChange,
    totalCount,
    onClearFilters,
}) => {
    return (
        <div className="space-y-4">
            <div className="flex flex-col md:flex-row gap-4">
                <div className="relative flex-1">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                    <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => onSearchChange(e.target.value)}
                        placeholder="Cari riwayat aksi..."
                        className="w-full pl-12 pr-4 py-3 bg-white dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/50 rounded-xl text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500 shadow-sm transition-shadow"
                    />
                </div>

                <button
                    type="button"
                    onClick={onToggleShowFilters}
                    className={`flex items-center gap-2 px-5 py-3 rounded-xl border transition-all ${
                        hasActiveFilters
                            ? 'bg-brand-600 border-brand-600 text-white shadow-lg shadow-brand-600/25'
                            : 'bg-white dark:bg-slate-800/50 border-slate-200 dark:border-slate-700/50 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white shadow-sm'
                    }`}
                >
                    <Filter className="w-5 h-5" />
                    Filter
                    {hasActiveFilters && (
                        <span className="w-6 h-6 rounded-full bg-white/20 text-sm flex items-center justify-center font-semibold">
                            {activeFilterCount}
                        </span>
                    )}
                    <ChevronDown className={`w-4 h-4 transition-transform ${showFilters ? 'rotate-180' : ''}`} />
                </button>
            </div>

            {/* Filter Panel */}
            {showFilters && (
                <div className="bg-white dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700/50 rounded-2xl p-5 space-y-5 shadow-sm animate-fade-in">
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        <div>
                            <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                                Tipe Aksi
                            </label>
                            <select
                                value={filterType}
                                onChange={(e) => onFilterTypeChange(e.target.value as ActionType | 'all')}
                                className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:ring-2 focus:ring-brand-500 cursor-pointer"
                            >
                                <option value="all">Semua Tipe</option>
                                {Object.entries(actionTypeConfig).map(([key, config]) => (
                                    <option key={key} value={key}>{config.label}</option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                                Tipe Data
                            </label>
                            <select
                                value={filterEntity}
                                onChange={(e) => onFilterEntityChange(e.target.value as SoftDeleteEntity | 'all')}
                                className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:ring-2 focus:ring-brand-500 cursor-pointer"
                            >
                                <option value="all">Semua Data</option>
                                {Object.entries(entityLabels).map(([key, label]) => (
                                    <option key={key} value={key}>{label}</option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                                Dari Tanggal
                            </label>
                            <input
                                type="date"
                                value={dateRange.start || ''}
                                onChange={(e) => onDateRangeChange({ ...dateRange, start: e.target.value })}
                                className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:ring-2 focus:ring-brand-500"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                                Sampai Tanggal
                            </label>
                            <input
                                type="date"
                                value={dateRange.end || ''}
                                onChange={(e) => onDateRangeChange({ ...dateRange, end: e.target.value })}
                                className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:ring-2 focus:ring-brand-500"
                            />
                        </div>
                    </div>

                    {hasActiveFilters && (
                        <div className="flex justify-between items-center pt-2 border-t border-slate-200 dark:border-slate-700">
                            <p className="text-sm text-slate-500 dark:text-slate-400">
                                {totalCount} hasil ditemukan
                            </p>
                            <button
                                type="button"
                                onClick={onClearFilters}
                                className="text-sm font-medium text-brand-600 dark:text-brand-400 hover:text-brand-700 dark:hover:text-brand-300 transition-colors"
                            >
                                Reset Semua Filter
                            </button>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};
