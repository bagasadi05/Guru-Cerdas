import React from 'react';
import { X } from 'lucide-react';
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
          aria-label="Cari siswa"
          placeholder="Cari nama, NIS, atau kode akses siswa..."
          value={searchTerm}
          onChange={(e) => onSearchChange(e.target.value)}
          className="pl-10 pr-9 h-11 text-xs sm:text-sm w-full shadow-sm border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-emerald-500 rounded-xl bg-white dark:bg-slate-800 transition-all"
        />
        {searchTerm && (
          <button
            type="button"
            onClick={() => onSearchChange('')}
            className="absolute inset-y-0 right-0 w-11 flex items-center justify-center text-slate-600 hover:text-slate-800 dark:text-slate-300 dark:hover:text-white rounded-lg focus-visible:outline-2 focus-visible:outline-emerald-700"
            title="Hapus pencarian"
            aria-label="Hapus kata kunci pencarian"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Filter Controls Row */}
      <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap sm:items-center md:justify-end">
        {/* View Mode Toggle */}
        <div className="col-span-2 flex w-fit items-center bg-slate-100 dark:bg-slate-800 rounded-lg border border-slate-300 dark:border-slate-600 shrink-0 h-11">
          <button
            type="button"
            onClick={() => onViewModeChange('grid')}
            aria-pressed={viewMode === 'grid'}
            className={`min-h-[44px] min-w-[44px] px-2.5 rounded-lg flex items-center justify-center cursor-pointer focus-visible:outline-2 focus-visible:outline-emerald-700 dark:focus-visible:outline-emerald-400 ${
              viewMode === 'grid'
                ? 'bg-white dark:bg-slate-700 text-emerald-600 dark:text-emerald-400 shadow-sm font-semibold'
                : 'text-slate-600 hover:text-slate-800 dark:text-slate-300 dark:hover:text-white'
            }`}
            title="Tampilan Grid"
            aria-label="Tampilan Grid"
          >
            <LayoutGridIcon className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => onViewModeChange('list')}
            aria-pressed={viewMode === 'list'}
            className={`min-h-[44px] min-w-[44px] px-2.5 rounded-lg flex items-center justify-center cursor-pointer focus-visible:outline-2 focus-visible:outline-emerald-700 dark:focus-visible:outline-emerald-400 ${
              viewMode === 'list'
                ? 'bg-white dark:bg-slate-700 text-emerald-600 dark:text-emerald-400 shadow-sm font-semibold'
                : 'text-slate-600 hover:text-slate-800 dark:text-slate-300 dark:hover:text-white'
            }`}
            title="Tampilan List/Tabel"
            aria-label="Tampilan List"
          >
            <ListIcon className="h-4 w-4" />
          </button>
        </div>

        {/* Gender Select */}
        <label className="min-w-0 sm:w-40 text-xs text-slate-700 dark:text-slate-200">
          Jenis kelamin
          <Select
            aria-label="Filter jenis kelamin"
            value={genderFilter}
            onChange={(e) =>
              onGenderFilterChange(e.target.value as 'all' | 'Laki-laki' | 'Perempuan')
            }
            className="h-11 !text-xs sm:!text-sm font-medium rounded-xl border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:border-slate-300 dark:hover:border-slate-600 !px-3 shadow-sm cursor-pointer active:scale-[0.98] transition-all"
          >
            <option value="all">Semua</option>
            <option value="Laki-laki">Laki-laki</option>
            <option value="Perempuan">Perempuan</option>
          </Select>
        </label>

        {/* Status Select */}
        <label className="min-w-0 sm:w-40 text-xs text-slate-700 dark:text-slate-200">
          Kode akses
          <Select
            aria-label="Filter kode akses"
            value={accessCodeFilter}
            onChange={(e) =>
              onAccessCodeFilterChange(e.target.value as 'all' | 'has_code' | 'no_code')
            }
            className="h-11 !text-xs sm:!text-sm font-medium rounded-xl border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:border-slate-300 dark:hover:border-slate-600 !px-3 shadow-sm cursor-pointer active:scale-[0.98] transition-all"
          >
            <option value="all">Semua</option>
            <option value="has_code">Sudah ada</option>
            <option value="no_code">Belum ada</option>
          </Select>
        </label>
      </div>
    </div>
  );
};
