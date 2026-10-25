import React from 'react';

interface StudentsSummaryToolbarProps {
  visibleCount: number;
  searchTerm: string;
  viewMode: 'grid' | 'list';
}

export const StudentsSummaryToolbar: React.FC<StudentsSummaryToolbarProps> = ({
  visibleCount,
  searchTerm,
}) => {
  return (
    <div className="flex items-center justify-between mb-4 px-1">
      <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white dark:bg-slate-900 sm:bg-white/60 sm:dark:bg-slate-900/40 sm:backdrop-blur-md border border-slate-200/80 dark:border-white/10 shadow-2xs text-xs sm:text-sm text-slate-600 dark:text-slate-400">
        <span className="w-2 h-2 rounded-full bg-emerald-500" />
        <p>
          Menampilkan <span className="font-extrabold text-slate-900 dark:text-white">{visibleCount}</span> siswa
          {searchTerm && ` untuk pencarian "${searchTerm}"`}
        </p>
      </div>
    </div>
  );
};
