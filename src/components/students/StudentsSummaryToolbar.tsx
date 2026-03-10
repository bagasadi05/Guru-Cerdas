import React from 'react';

interface StudentsSummaryToolbarProps {
  visibleCount: number;
  searchTerm: string;
  viewMode: 'grid' | 'list';
}

export const StudentsSummaryToolbar: React.FC<StudentsSummaryToolbarProps> = ({
  visibleCount,
  searchTerm,
  viewMode,
}) => {
  return (
    <div className="flex items-center justify-between mb-4 px-1">
      <p className="text-sm text-gray-500 dark:text-gray-400">
        Menampilkan <span className="font-bold text-gray-900 dark:text-white">{visibleCount}</span> siswa
        {searchTerm && ` untuk pencarian "${searchTerm}"`}
      </p>
      {visibleCount > 0 && viewMode === 'list' && (
        <span className="hidden lg:inline-block text-xs text-gray-400 italic">
          *Klik header tabel untuk mengurutkan (segera hadir)
        </span>
      )}
    </div>
  );
};
