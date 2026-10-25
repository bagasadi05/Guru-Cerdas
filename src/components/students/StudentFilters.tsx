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
    <div className="bg-white dark:bg-slate-900 md:bg-white/80 md:dark:bg-slate-900/70 md:backdrop-blur-xl rounded-2xl p-3 sm:p-3.5 border border-slate-200/80 dark:border-white/10 shadow-xs flex flex-col md:flex-row gap-2.5 sm:gap-3 items-stretch md:items-center">
      {/* Search Input */}
      <div className="relative flex-1 group">
        <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none z-10">
          <SearchIcon className="h-4 w-4 text-slate-400 group-focus-within:text-emerald-500 transition-colors" />
        </div>
        <Input
          type="text"
          aria-label="Cari siswa"
          placeholder="Cari siswa, NIS, atau kode..."
          value={searchTerm}
          onChange={(e) => onSearchChange(e.target.value)}
          className="pl-10 pr-9 h-10 sm:h-11 text-xs sm:text-sm w-full shadow-2xs border-slate-200/80 dark:border-white/10 focus:ring-2 focus:ring-emerald-500/40 focus:border-emerald-500 rounded-xl bg-slate-50/80 dark:bg-slate-800/60 text-slate-800 dark:text-white placeholder:text-slate-400 transition-colors sm:transition-all motion-reduce:transition-none"
        />
        {searchTerm && (
          <button
            type="button"
            onClick={() => onSearchChange('')}
            className="absolute inset-y-0 right-0 w-10 sm:w-11 flex items-center justify-center text-slate-400 hover:text-slate-700 dark:hover:text-white rounded-lg focus-visible:outline-2 focus-visible:outline-emerald-500 transition-colors"
            title="Hapus pencarian"
            aria-label="Hapus kata kunci pencarian"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Filter Controls Row */}
      <div className="flex flex-wrap items-center gap-2 sm:gap-2.5 md:justify-end">
        {/* View Mode Toggle */}
        <div className="flex items-center bg-slate-100/90 dark:bg-slate-800/80 rounded-xl p-1 border border-slate-200/80 dark:border-white/10 shrink-0 h-10 sm:h-11">
          <button
            type="button"
            onClick={() => onViewModeChange('grid')}
            aria-pressed={viewMode === 'grid'}
            className={`min-h-[32px] sm:min-h-[36px] min-w-[32px] sm:min-w-[36px] px-2 sm:px-2.5 rounded-lg flex items-center justify-center cursor-pointer transition-colors sm:transition-all motion-reduce:transition-none focus-visible:outline-2 focus-visible:outline-emerald-600 dark:focus-visible:outline-emerald-400 ${
              viewMode === 'grid'
                ? 'bg-white dark:bg-slate-700 text-emerald-600 dark:text-emerald-400 shadow-xs font-bold'
                : 'text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white'
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
            className={`min-h-[32px] sm:min-h-[36px] min-w-[32px] sm:min-w-[36px] px-2 sm:px-2.5 rounded-lg flex items-center justify-center cursor-pointer transition-colors sm:transition-all motion-reduce:transition-none focus-visible:outline-2 focus-visible:outline-emerald-600 dark:focus-visible:outline-emerald-400 ${
              viewMode === 'list'
                ? 'bg-white dark:bg-slate-700 text-emerald-600 dark:text-emerald-400 shadow-xs font-bold'
                : 'text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white'
            }`}
            title="Tampilan List/Tabel"
            aria-label="Tampilan List"
          >
            <ListIcon className="h-4 w-4" />
          </button>
        </div>

        {/* Gender Select */}
        <label className="flex-1 sm:flex-initial min-w-[110px] sm:w-36 text-xs text-slate-700 dark:text-slate-200">
          <span className="sr-only">Jenis kelamin</span>
          <Select
            aria-label="Filter jenis kelamin"
            value={genderFilter}
            onChange={(e) =>
              onGenderFilterChange(e.target.value as 'all' | 'Laki-laki' | 'Perempuan')
            }
            className="h-10 sm:h-11 !text-xs sm:!text-sm font-medium rounded-xl border-slate-200/80 dark:border-white/10 bg-slate-50/80 dark:bg-slate-800/60 text-slate-800 dark:text-white hover:border-slate-300 dark:hover:border-white/20 !px-2.5 sm:!px-3 shadow-2xs cursor-pointer sm:active:scale-[0.98] transition-colors sm:transition-all motion-reduce:transform-none motion-reduce:transition-none w-full"
          >
            <option value="all">Semua Gender</option>
            <option value="Laki-laki">Laki-laki</option>
            <option value="Perempuan">Perempuan</option>
          </Select>
        </label>

        {/* Status Select */}
        <label className="flex-1 sm:flex-initial min-w-[110px] sm:w-36 text-xs text-slate-700 dark:text-slate-200">
          <span className="sr-only">Kode akses</span>
          <Select
            aria-label="Filter kode akses"
            value={accessCodeFilter}
            onChange={(e) =>
              onAccessCodeFilterChange(e.target.value as 'all' | 'has_code' | 'no_code')
            }
            className="h-10 sm:h-11 !text-xs sm:!text-sm font-medium rounded-xl border-slate-200/80 dark:border-white/10 bg-slate-50/80 dark:bg-slate-800/60 text-slate-800 dark:text-white hover:border-slate-300 dark:hover:border-white/20 !px-2.5 sm:!px-3 shadow-2xs cursor-pointer sm:active:scale-[0.98] transition-colors sm:transition-all motion-reduce:transform-none motion-reduce:transition-none w-full"
          >
            <option value="all">Semua Kode</option>
            <option value="has_code">Sudah ada</option>
            <option value="no_code">Belum ada</option>
          </Select>
        </label>

        {(genderFilter !== 'all' || accessCodeFilter !== 'all') && (
          <button
            type="button"
            onClick={() => {
              onGenderFilterChange('all');
              onAccessCodeFilterChange('all');
            }}
            className="h-10 sm:h-11 px-2.5 sm:px-3 text-xs font-semibold text-rose-600 dark:text-rose-400 hover:bg-rose-100/70 dark:hover:bg-rose-950/40 rounded-xl border border-rose-200/80 dark:border-rose-800/50 transition-colors flex items-center justify-center gap-1.5 cursor-pointer shadow-2xs active:scale-95 motion-reduce:transform-none"
            title="Reset semua filter"
            aria-label="Reset semua filter"
          >
            <X className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Reset</span>
          </button>
        )}
      </div>
    </div>
  );
};
