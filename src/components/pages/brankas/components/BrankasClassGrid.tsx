import React from 'react';
import {
  BookOpen,
  FolderLock,
  Unlock,
  Lock,
  Search,
  Users,
} from 'lucide-react';
import { Button } from '../../../ui/Button';
import { Card, CardContent } from '../../../ui/Card';
import { AnimatePresence, MotionDiv } from '../../../ui/MotionComponents';
import { ClassItem } from '../types';
import { BrankasClassCard } from './BrankasClassCard';

interface BrankasClassGridProps {
  activeTab: 'active' | 'archived';
  onTabSwitch: (tab: 'active' | 'archived') => void;
  activeCount: number;
  archivedCount: number;
  searchQuery: string;
  onSearchChange: (value: string) => void;
  displayedClasses: ClassItem[];
  studentCountMap: Record<string, number>;
  getAcademicYearLabel: (cls: Pick<ClassItem, 'academic_year'>) => string;
  onOpenDetail: (cls: ClassItem) => void;
  onConfirmRestore: (cls: ClassItem) => void;
  onConfirmArchive: (cls: ClassItem) => void;
}

export const BrankasClassGrid: React.FC<BrankasClassGridProps> = ({
  activeTab,
  onTabSwitch,
  activeCount,
  archivedCount,
  searchQuery,
  onSearchChange,
  displayedClasses,
  studentCountMap,
  getAcademicYearLabel,
  onOpenDetail,
  onConfirmRestore,
  onConfirmArchive,
}) => {
  return (
    <>
      {/* Tabs and Search Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4 mb-6">
        <div className="flex p-1 bg-slate-100 dark:bg-white/5 rounded-2xl border border-slate-200/50 dark:border-white/5 w-full sm:w-fit">
          <button
            type="button"
            onClick={() => onTabSwitch('active')}
            className={`flex-1 sm:flex-none flex justify-center items-center gap-2 px-3.5 sm:px-4 py-2 min-h-[40px] text-xs font-semibold rounded-xl transition-all duration-150 cursor-pointer active:scale-95 ${
              activeTab === 'active'
                ? 'bg-white dark:bg-slate-800 text-emerald-600 dark:text-white shadow-md shadow-slate-200/40 dark:shadow-none'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Unlock className="w-3.5 h-3.5 hidden sm:block" />
            Kelas Aktif ({activeCount})
          </button>
          <button
            type="button"
            onClick={() => onTabSwitch('archived')}
            className={`flex-1 sm:flex-none flex justify-center items-center gap-2 px-3.5 sm:px-4 py-2 min-h-[40px] text-xs font-semibold rounded-xl transition-all duration-150 cursor-pointer active:scale-95 ${
              activeTab === 'archived'
                ? 'bg-white dark:bg-slate-800 text-emerald-600 dark:text-white shadow-md shadow-slate-200/40 dark:shadow-none'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Lock className="w-3.5 h-3.5 hidden sm:block" />
            Brankas Arsip ({archivedCount})
          </button>
        </div>

        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Cari kelas..."
            aria-label="Cari kelas di brankas"
            className="w-full h-10 pl-9 pr-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs sm:text-sm font-medium text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 shadow-sm"
          />
        </div>
      </div>

      {/* Grid of classes */}
      <AnimatePresence mode="wait">
        <MotionDiv
          key={activeTab}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -12 }}
          transition={{ duration: 0.25, ease: 'easeInOut' }}
        >
          {displayedClasses.length === 0 ? (
            <Card className="text-center py-16 sm:py-20 shadow-sm border-slate-200/60 dark:border-slate-700/50">
              <CardContent className="flex flex-col items-center">
                <div className="w-20 h-20 sm:w-24 sm:h-24 mx-auto rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center mb-5 sm:mb-6 border border-slate-200/50 dark:border-slate-700/50 animate-[float_3s_ease-in-out_infinite]">
                  {activeTab === 'active' ? (
                    <BookOpen className="w-10 h-10 sm:w-12 sm:h-12 text-slate-400 dark:text-slate-500" />
                  ) : (
                    <FolderLock className="w-10 h-10 sm:w-12 sm:h-12 text-slate-400 dark:text-slate-500" />
                  )}
                </div>
                <h3 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white mb-2">
                  {searchQuery
                    ? 'Tidak Ditemukan'
                    : activeTab === 'active' ? 'Tidak Ada Kelas Aktif' : 'Brankas Kosong'}
                </h3>
                <p className="text-slate-500 dark:text-slate-400 max-w-md mx-auto text-xs sm:text-sm">
                  {searchQuery
                    ? `Tidak ada kelas yang cocok dengan "${searchQuery}".`
                    : activeTab === 'active'
                    ? 'Semua kelas Anda sudah diamankan di Brankas. Buat kelas baru di halaman Manajemen Siswa untuk memulai tahun ajaran baru.'
                    : 'Belum ada kelas yang diarsipkan. Kelas lama yang sudah selesai akan tersimpan aman di sini.'}
                </p>
                {!searchQuery && activeTab === 'active' && (
                  <Button
                    onClick={() => { window.location.href = '/siswa'; }}
                    className="mt-5 sm:mt-6"
                  >
                    <Users className="w-4 h-4 mr-2" />
                    Buat Kelas Baru
                  </Button>
                )}
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
              {displayedClasses.map((cls, index) => (
                <MotionDiv
                  key={cls.id}
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, delay: index * 0.05, ease: 'easeOut' }}
                  className="h-full"
                >
                  <BrankasClassCard
                    cls={cls}
                    studentCount={studentCountMap[cls.id] || 0}
                    academicYearLabel={getAcademicYearLabel(cls)}
                    onOpenDetail={onOpenDetail}
                    onConfirmRestore={onConfirmRestore}
                    onConfirmArchive={onConfirmArchive}
                  />
                </MotionDiv>
              ))}
            </div>
          )}
        </MotionDiv>
      </AnimatePresence>
    </>
  );
};
