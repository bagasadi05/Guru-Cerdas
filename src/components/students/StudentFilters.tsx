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
        <div className="flex flex-col lg:flex-row gap-4">
            <div className="relative flex-grow group">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <SearchIcon className="h-5 w-5 text-gray-400 group-focus-within:text-indigo-500 transition-colors" />
                </div>
                <Input
                    type="text"
                    placeholder="Cari nama atau kode akses..."
                    value={searchTerm}
                    onChange={e => onSearchChange(e.target.value)}
                    className="pl-11 h-12 text-base w-full shadow-sm border-gray-200 dark:border-gray-700 focus:ring-2 focus:ring-indigo-500 rounded-2xl bg-white dark:bg-gray-800 transition-all"
                />
            </div>

            <div className="flex gap-2 overflow-x-auto pb-2 lg:pb-0 scrollbar-hide">
                <div className="flex items-center bg-white dark:bg-gray-800 rounded-2xl p-1 border border-gray-200 dark:border-gray-700 shadow-sm">
                    <button
                        onClick={() => onViewModeChange('grid')}
                        className={`p-2.5 rounded-xl transition-all ${viewMode === 'grid' ? 'bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 shadow-sm' : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-300'}`}
                        title="Tampilan Grid"
                    >
                        <LayoutGridIcon className="h-5 w-5" />
                    </button>
                    <button
                        onClick={() => onViewModeChange('list')}
                        className={`p-2.5 rounded-xl transition-all ${viewMode === 'list' ? 'bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 shadow-sm' : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-300'}`}
                        title="Tampilan List/Tabel"
                    >
                        <ListIcon className="h-5 w-5" />
                    </button>
                </div>

                <Select
                    value={genderFilter}
                    onChange={(e) => onGenderFilterChange(e.target.value as any)}
                    className="h-12 w-40 rounded-2xl border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800"
                >
                    <option value="all">Semua Gender</option>
                    <option value="Laki-laki">Laki-laki</option>
                    <option value="Perempuan">Perempuan</option>
                </Select>

                <Select
                    value={accessCodeFilter}
                    onChange={(e) => onAccessCodeFilterChange(e.target.value as any)}
                    className="h-12 w-44 rounded-2xl border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800"
                >
                    <option value="all">Semua Status</option>
                    <option value="has_code">Sudah Ada Kode</option>
                    <option value="no_code">Belum Ada Kode</option>
                </Select>
            </div>
        </div>
    );
};
