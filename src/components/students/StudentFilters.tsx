import React from 'react';
import { Input } from '../ui/Input';
import { Select } from '../ui/Select';
import { LayoutGridIcon, ListIcon, SearchIcon } from '../Icons';

interface StudentFiltersProps {
    searchTerm: string;
    onSearchChange: (value: string) => void;
    viewMode: 'grid' | 'list';
    onViewModeChange: (mode: 'grid' | 'list') => void;
    genderFilter: 'all' | 'Laki-laki' | 'Perempuan';
    onGenderFilterChange: (value: 'all' | 'Laki-laki' | 'Perempuan') => void;
    accessCodeFilter: 'all' | 'has_code' | 'no_code';
    onAccessCodeFilterChange: (value: 'all' | 'has_code' | 'no_code') => void;
}

export const StudentFilters: React.FC<StudentFiltersProps> = ({
    searchTerm,
    onSearchChange,
    viewMode,
    onViewModeChange,
    genderFilter,
    onGenderFilterChange,
    accessCodeFilter,
    onAccessCodeFilterChange,
}) => {
    return (
        <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center">
            {/* Search Input */}
            <div className="relative flex-1 group">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none z-10">
                    <SearchIcon className="h-4 w-4 text-slate-400 group-focus-within:text-emerald-500 transition-colors" />
                </div>
                <Input
                    type="text"
                    placeholder="Cari nama atau kode akses siswa..."
                    value={searchTerm}
                    onChange={e => onSearchChange(e.target.value)}
                    className="pl-10 h-11 text-xs sm:text-sm w-full shadow-sm border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-emerald-500 rounded-xl bg-white dark:bg-slate-800 transition-all"
                />
            </div>

            {/* Filter Controls Row */}
            <div className="flex items-center gap-2 overflow-x-auto pb-1 md:pb-0 scrollbar-hide">
                {/* View Mode Toggle */}
                <div className="flex items-center bg-slate-100 dark:bg-slate-800/80 rounded-xl p-1 border border-slate-200 dark:border-slate-700/60 shadow-sm shrink-0 h-11">
                    <button
                        type="button"
                        onClick={() => onViewModeChange('grid')}
                        className={`h-9 px-2.5 rounded-lg flex items-center justify-center transition-all ${
                            viewMode === 'grid'
                                ? 'bg-white dark:bg-slate-700 text-emerald-600 dark:text-emerald-400 shadow-sm font-semibold'
                                : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'
                        }`}
                        title="Tampilan Grid"
                    >
                        <LayoutGridIcon className="h-4 w-4" />
                    </button>
                    <button
                        type="button"
                        onClick={() => onViewModeChange('list')}
                        className={`h-9 px-2.5 rounded-lg flex items-center justify-center transition-all ${
                            viewMode === 'list'
                                ? 'bg-white dark:bg-slate-700 text-emerald-600 dark:text-emerald-400 shadow-sm font-semibold'
                                : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'
                        }`}
                        title="Tampilan List/Tabel"
                    >
                        <ListIcon className="h-4 w-4" />
                    </button>
                </div>

                {/* Gender Select */}
                <div className="flex-1 sm:flex-none min-w-[145px]">
                    <Select
                        value={genderFilter}
                        onChange={(e) => onGenderFilterChange(e.target.value as any)}
                        className="h-11 !text-xs sm:!text-sm font-medium rounded-xl border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 !px-3 shadow-sm cursor-pointer"
                    >
                        <option value="all">Semua Gender</option>
                        <option value="Laki-laki">Laki-laki</option>
                        <option value="Perempuan">Perempuan</option>
                    </Select>
                </div>

                {/* Status Select */}
                <div className="flex-1 sm:flex-none min-w-[155px]">
                    <Select
                        value={accessCodeFilter}
                        onChange={(e) => onAccessCodeFilterChange(e.target.value as any)}
                        className="h-11 !text-xs sm:!text-sm font-medium rounded-xl border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 !px-3 shadow-sm cursor-pointer"
                    >
                        <option value="all">Semua Status</option>
                        <option value="has_code">Sudah Ada Kode</option>
                        <option value="no_code">Belum Ada Kode</option>
                    </Select>
                </div>
            </div>
        </div>
    );
};
