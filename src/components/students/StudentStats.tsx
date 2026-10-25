import React from 'react';
import { UsersIcon, KeyRoundIcon } from '../Icons';
import { StudentRow } from './types';
import { formatClassName } from './studentsActionHelpers';

export interface StudentStatsProps {
  students: StudentRow[];
  activeClassName?: string;
  genderFilter: 'all' | 'Laki-laki' | 'Perempuan';
  onGenderFilterChange: (gender: 'all' | 'Laki-laki' | 'Perempuan') => void;
  accessCodeFilter: 'all' | 'has_code' | 'no_code';
  onAccessCodeFilterChange: (filter: 'all' | 'has_code' | 'no_code') => void;
  onResetFilters?: () => void;
}

export const StudentStats: React.FC<StudentStatsProps> = ({
  students,
  activeClassName,
  genderFilter,
  onGenderFilterChange,
  accessCodeFilter,
  onAccessCodeFilterChange,
  onResetFilters,
}) => {
  const totalStudents = students.length;
  const maleCount = students.filter((s) => s.gender === 'Laki-laki').length;
  const femaleCount = students.filter((s) => s.gender === 'Perempuan').length;
  const withCodeCount = students.filter((s) => !!s.access_code).length;
  const needCodeCount = totalStudents - withCodeCount;

  const malePercent = totalStudents > 0 ? Math.round((maleCount / totalStudents) * 100) : 0;
  const femalePercent = totalStudents > 0 ? Math.round((femaleCount / totalStudents) * 100) : 0;
  const codePercent = totalStudents > 0 ? Math.round((withCodeCount / totalStudents) * 100) : 0;

  const handleTotalClick = () => {
    if (onResetFilters) {
      onResetFilters();
    } else {
      onGenderFilterChange('all');
      onAccessCodeFilterChange('all');
    }
  };

  const handleMaleClick = () => {
    onGenderFilterChange(genderFilter === 'Laki-laki' ? 'all' : 'Laki-laki');
  };

  const handleFemaleClick = () => {
    onGenderFilterChange(genderFilter === 'Perempuan' ? 'all' : 'Perempuan');
  };

  const handleCodeClick = () => {
    if (accessCodeFilter === 'no_code') {
      onAccessCodeFilterChange('all');
    } else {
      onAccessCodeFilterChange('no_code');
    }
  };

  const isTotalActive = genderFilter === 'all' && accessCodeFilter === 'all';
  const isMaleActive = genderFilter === 'Laki-laki';
  const isFemaleActive = genderFilter === 'Perempuan';
  const isCodeActive = accessCodeFilter === 'no_code' || accessCodeFilter === 'has_code';

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-4" role="region" aria-label="Statistik Siswa">
      {/* 1. Total Siswa */}
      <button
        type="button"
        onClick={handleTotalClick}
        aria-label="Tampilkan semua siswa kelas ini"
        className={`text-left p-3.5 sm:p-5 rounded-2xl border transition-colors sm:transition-all sm:duration-300 motion-reduce:transform-none motion-reduce:transition-none cursor-pointer relative overflow-hidden group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 ${
          isTotalActive
            ? 'bg-emerald-50/60 dark:bg-emerald-950/30 border-emerald-300 dark:border-emerald-700/80 shadow-md ring-2 ring-emerald-500/20'
            : 'bg-white dark:bg-slate-900 md:bg-white/80 md:dark:bg-slate-900/70 md:backdrop-blur-xl border-slate-200/80 dark:border-white/10 sm:hover:border-emerald-300 dark:sm:hover:border-emerald-700/60 shadow-xs sm:hover:shadow-md sm:hover:-translate-y-0.5'
        }`}
      >
        <div className="hidden sm:block absolute -top-6 -right-6 w-20 h-20 bg-emerald-500/10 rounded-full blur-xl pointer-events-none" />

        <div className="flex items-center justify-between mb-2 sm:mb-2.5 relative z-10">
          <span className="text-[11px] sm:text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Total Siswa</span>
          <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-emerald-500/10 dark:bg-emerald-500/20 flex items-center justify-center text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 shadow-2xs transition-none sm:transition-transform sm:group-hover:scale-105 motion-reduce:transform-none">
            <UsersIcon className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
          </div>
        </div>

        <div className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight mb-0.5 sm:mb-1 relative z-10">
          {totalStudents}
        </div>

        <p className="text-[11px] sm:text-xs text-slate-500 dark:text-slate-400 truncate relative z-10 font-medium">
          {formatClassName(activeClassName)}
        </p>

        <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-1.5 mt-2 sm:mt-2.5 overflow-hidden">
          <div className="bg-gradient-to-r from-emerald-500 to-teal-500 h-1.5 rounded-full w-full" />
        </div>
      </button>

      {/* 2. Laki-laki */}
      <button
        type="button"
        onClick={handleMaleClick}
        aria-pressed={isMaleActive}
        aria-label={`Filter siswa laki-laki (${maleCount} siswa)`}
        className={`text-left p-3.5 sm:p-5 rounded-2xl border transition-colors sm:transition-all sm:duration-300 motion-reduce:transform-none motion-reduce:transition-none cursor-pointer relative overflow-hidden group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 ${
          isMaleActive
            ? 'bg-sky-50/70 dark:bg-sky-950/30 border-sky-400 dark:border-sky-700/80 shadow-md ring-2 ring-sky-500/20'
            : 'bg-white dark:bg-slate-900 md:bg-white/80 md:dark:bg-slate-900/70 md:backdrop-blur-xl border-slate-200/80 dark:border-white/10 sm:hover:border-sky-300 dark:sm:hover:border-sky-700/60 shadow-xs sm:hover:shadow-md sm:hover:-translate-y-0.5'
        }`}
      >
        <div className="hidden sm:block absolute -top-6 -right-6 w-20 h-20 bg-sky-500/10 rounded-full blur-xl pointer-events-none" />

        <div className="flex items-center justify-between mb-2 sm:mb-2.5 relative z-10">
          <span className="text-[11px] sm:text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Laki-laki</span>
          <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-sky-500/10 dark:bg-sky-500/20 flex items-center justify-center text-sky-600 dark:text-sky-300 font-bold text-xs border border-sky-500/20 shadow-2xs transition-none sm:transition-transform sm:group-hover:scale-105 motion-reduce:transform-none">
            L
          </div>
        </div>

        <div className="text-2xl sm:text-3xl font-extrabold text-sky-950 dark:text-sky-300 tracking-tight mb-0.5 sm:mb-1 relative z-10">
          {maleCount}
        </div>

        <p className="text-[11px] sm:text-xs text-slate-500 dark:text-slate-400 relative z-10 font-medium">
          {malePercent}% dari kelas
        </p>

        <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-1.5 mt-2 sm:mt-2.5 overflow-hidden">
          <div
            className="bg-gradient-to-r from-sky-500 to-blue-500 h-1.5 rounded-full transition-none sm:transition-all sm:duration-500 motion-reduce:transition-none"
            style={{ width: `${malePercent}%` }}
          />
        </div>
      </button>

      {/* 3. Perempuan */}
      <button
        type="button"
        onClick={handleFemaleClick}
        aria-pressed={isFemaleActive}
        aria-label={`Filter siswa perempuan (${femaleCount} siswa)`}
        className={`text-left p-3.5 sm:p-5 rounded-2xl border transition-colors sm:transition-all sm:duration-300 motion-reduce:transform-none motion-reduce:transition-none cursor-pointer relative overflow-hidden group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-500 ${
          isFemaleActive
            ? 'bg-rose-50/70 dark:bg-rose-950/30 border-rose-400 dark:border-rose-700/80 shadow-md ring-2 ring-rose-500/20'
            : 'bg-white dark:bg-slate-900 md:bg-white/80 md:dark:bg-slate-900/70 md:backdrop-blur-xl border-slate-200/80 dark:border-white/10 sm:hover:border-rose-300 dark:sm:hover:border-rose-700/60 shadow-xs sm:hover:shadow-md sm:hover:-translate-y-0.5'
        }`}
      >
        <div className="hidden sm:block absolute -top-6 -right-6 w-20 h-20 bg-rose-500/10 rounded-full blur-xl pointer-events-none" />

        <div className="flex items-center justify-between mb-2 sm:mb-2.5 relative z-10">
          <span className="text-[11px] sm:text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Perempuan</span>
          <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-rose-500/10 dark:bg-rose-500/20 flex items-center justify-center text-rose-600 dark:text-rose-300 font-bold text-xs border border-rose-500/20 shadow-2xs transition-none sm:transition-transform sm:group-hover:scale-105 motion-reduce:transform-none">
            P
          </div>
        </div>

        <div className="text-2xl sm:text-3xl font-extrabold text-rose-950 dark:text-rose-300 tracking-tight mb-0.5 sm:mb-1 relative z-10">
          {femaleCount}
        </div>

        <p className="text-[11px] sm:text-xs text-slate-500 dark:text-slate-400 relative z-10 font-medium">
          {femalePercent}% dari kelas
        </p>

        <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-1.5 mt-2 sm:mt-2.5 overflow-hidden">
          <div
            className="bg-gradient-to-r from-rose-500 to-pink-500 h-1.5 rounded-full transition-none sm:transition-all sm:duration-500 motion-reduce:transition-none"
            style={{ width: `${femalePercent}%` }}
          />
        </div>
      </button>

      {/* 4. Kesiapan Kode Akses */}
      <button
        type="button"
        onClick={handleCodeClick}
        aria-pressed={accessCodeFilter === 'no_code'}
        aria-label={`Status kode akses: ${withCodeCount} siswa siap, ${needCodeCount} butuh kode`}
        className={`text-left p-3.5 sm:p-5 rounded-2xl border transition-colors sm:transition-all sm:duration-300 motion-reduce:transform-none motion-reduce:transition-none cursor-pointer relative overflow-hidden group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 ${
          isCodeActive
            ? accessCodeFilter === 'no_code'
              ? 'bg-amber-50/70 dark:bg-amber-950/30 border-amber-400 dark:border-amber-700/80 shadow-md ring-2 ring-amber-500/20'
              : 'bg-emerald-50/70 dark:bg-emerald-950/30 border-emerald-400 dark:border-emerald-700/80 shadow-md ring-2 ring-emerald-500/20'
            : 'bg-white dark:bg-slate-900 md:bg-white/80 md:dark:bg-slate-900/70 md:backdrop-blur-xl border-slate-200/80 dark:border-white/10 sm:hover:border-amber-300 dark:sm:hover:border-amber-700/60 shadow-xs sm:hover:shadow-md sm:hover:-translate-y-0.5'
        }`}
      >
        <div className="hidden sm:block absolute -top-6 -right-6 w-20 h-20 bg-amber-500/10 rounded-full blur-xl pointer-events-none" />

        <div className="flex items-center justify-between mb-2 sm:mb-2.5 relative z-10">
          <span className="text-[11px] sm:text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Kesiapan Portal</span>
          <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-amber-500/10 dark:bg-amber-500/20 flex items-center justify-center text-amber-600 dark:text-amber-400 border border-amber-500/20 shadow-2xs transition-none sm:transition-transform sm:group-hover:scale-105 motion-reduce:transform-none">
            <KeyRoundIcon className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
          </div>
        </div>

        <div className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight mb-0.5 sm:mb-1 relative z-10">
          {withCodeCount}
          <span className="text-xs font-normal text-slate-500 dark:text-slate-400 ml-1">/ {totalStudents}</span>
        </div>

        <p className={`text-[11px] sm:text-xs font-semibold relative z-10 truncate leading-snug ${needCodeCount > 0 ? 'text-amber-600 dark:text-amber-400' : 'text-emerald-600 dark:text-emerald-400'}`}>
          {needCodeCount > 0 ? `${needCodeCount} butuh kode akses` : 'Semua siswa punya kode'}
        </p>

        <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-1.5 mt-2 sm:mt-2.5 overflow-hidden">
          <div
            className={`h-1.5 rounded-full transition-none sm:transition-all sm:duration-500 motion-reduce:transition-none ${
              needCodeCount === 0
                ? 'bg-gradient-to-r from-emerald-500 to-teal-500'
                : 'bg-gradient-to-r from-amber-500 to-orange-500'
            }`}
            style={{ width: `${codePercent}%` }}
          />
        </div>
      </button>
    </div>
  );
};
