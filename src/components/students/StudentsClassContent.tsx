import React from 'react';
import { Button } from '../ui/Button';
import { PlusIcon, UsersIcon } from '../Icons';
import { StudentGrid } from './StudentGrid';
import { StudentTable } from './StudentTable';
import { StudentsSummaryToolbar } from './StudentsSummaryToolbar';
import { StudentRow, type SortConfig } from './types';

interface StudentsClassContentProps {
  students: StudentRow[];
  searchTerm: string;
  viewMode: 'grid' | 'list';
  canManageActiveClass: boolean;
  isSelected: (id: string) => boolean;
  toggleItem: (id: string) => void;
  isAllSelected: boolean;
  toggleAll: () => void;
  onStudentAction: (student: StudentRow, action: 'view' | 'edit' | 'delete' | 'menu') => void;
  sortConfig: SortConfig;
  onSort: (key: string) => void;
  onAddStudent: () => void;
}

export const StudentsClassContent: React.FC<StudentsClassContentProps> = ({
  students,
  searchTerm,
  viewMode,
  canManageActiveClass,
  isSelected,
  toggleItem,
  isAllSelected,
  toggleAll,
  onStudentAction,
  sortConfig,
  onSort,
  onAddStudent,
}) => {
  return (
    <>
      <StudentsSummaryToolbar visibleCount={students.length} searchTerm={searchTerm} viewMode={viewMode} />

      {students.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 sm:py-24 px-4 text-center animate-fade-in bg-white dark:bg-gray-800/50 rounded-3xl border border-dashed border-gray-200 dark:border-gray-700">
          <div className="relative mb-6">
            <span className="absolute -top-3 -left-4 w-10 h-10 bg-emerald-100/70 dark:bg-emerald-900/30 rounded-full blur-sm" />
            <span className="absolute -bottom-3 -right-5 w-12 h-12 bg-sky-100/70 dark:bg-sky-900/20 rounded-full blur-sm" />
            <div className="relative w-20 h-20 bg-emerald-50 dark:bg-emerald-900/20 rounded-2xl flex items-center justify-center">
              <UsersIcon className="w-9 h-9 text-emerald-400 dark:text-emerald-300" />
            </div>
          </div>
          <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Tidak Ada Data Siswa</h3>
          <p className="text-gray-500 dark:text-gray-400 max-w-md mx-auto mb-6">
            Belum ada siswa di kelas ini atau tidak ada yang cocok dengan filter pencarian Anda.
          </p>
          {canManageActiveClass ? (
            <Button
              onClick={onAddStudent}
              className="rounded-xl shadow-lg shadow-emerald-500/20 bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              <PlusIcon className="w-4 h-4 mr-2" /> Tambah Siswa Baru
            </Button>
          ) : null}
        </div>
      ) : viewMode === 'grid' ? (
        <StudentGrid
          students={students}
          isSelected={isSelected}
          toggleItem={toggleItem}
          onAction={onStudentAction}
        />
      ) : (
        <StudentTable
          students={students}
          isSelected={isSelected}
          toggleItem={toggleItem}
          isAllSelected={isAllSelected}
          toggleAll={toggleAll}
          onAction={onStudentAction}
          sortConfig={sortConfig}
          onSort={onSort}
        />
      )}
    </>
  );
};
