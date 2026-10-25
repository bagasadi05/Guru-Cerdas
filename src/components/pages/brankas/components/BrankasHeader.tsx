import React from 'react';
import {
  FolderLock,
  Unlock,
  Lock,
  GraduationCap,
} from 'lucide-react';

interface BrankasHeaderProps {
  activeCount: number;
  archivedCount: number;
  totalArchivedStudents: number;
}

export const BrankasHeader: React.FC<BrankasHeaderProps> = ({
  activeCount,
  archivedCount,
  totalArchivedStudents,
}) => {
  return (
    <header className="mb-4 sm:mb-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-3 sm:gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 sm:w-12 sm:h-12 flex-shrink-0 rounded-2xl bg-emerald-100 dark:bg-emerald-500/20 flex items-center justify-center">
            <FolderLock className="w-5 h-5 sm:w-6 sm:h-6 text-emerald-600 dark:text-emerald-400" />
          </div>
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 dark:text-white font-serif leading-tight">
              Brankas Kelas
            </h1>
            <p className="text-slate-500 dark:text-slate-400 text-xs sm:text-sm mt-0.5 line-clamp-2 sm:line-clamp-none">
              Simpan data kelas lama di Brankas untuk mereset dashboard Anda secara aman.
            </p>
          </div>
        </div>
      </div>

      {/* Summary Stats Pills */}
      <div className="flex flex-wrap items-center gap-2 mt-3 sm:mt-4">
        <span className="inline-flex items-center gap-1.5 px-2.5 sm:px-3 py-1 sm:py-1.5 bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 text-[10px] sm:text-xs font-bold rounded-full border border-emerald-200/60 dark:border-emerald-500/20">
          <Unlock className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
          {activeCount} kelas aktif
        </span>
        <span className="inline-flex items-center gap-1.5 px-2.5 sm:px-3 py-1 sm:py-1.5 bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-400 text-[10px] sm:text-xs font-bold rounded-full border border-amber-200/60 dark:border-amber-500/20">
          <Lock className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
          {archivedCount} di brankas
        </span>
        {totalArchivedStudents > 0 && (
          <span className="inline-flex items-center gap-1.5 px-2.5 sm:px-3 py-1 sm:py-1.5 bg-brand-50 dark:bg-brand-500/10 text-brand-700 dark:text-brand-400 text-[10px] sm:text-xs font-bold rounded-full border border-brand-200/60 dark:border-brand-500/20">
            <GraduationCap className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
            {totalArchivedStudents} siswa diarsipkan
          </span>
        )}
      </div>
    </header>
  );
};
