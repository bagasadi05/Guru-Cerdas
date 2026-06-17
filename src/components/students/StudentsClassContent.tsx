import React from 'react';
import { Button } from '../ui/Button';
import { PlusIcon, UsersIcon } from '../Icons';
import { StudentGrid } from './StudentGrid';
import { StudentTable } from './StudentTable';
import { StudentsSummaryToolbar } from './StudentsSummaryToolbar';
import EmptyState from '../ui/EmptyState';
import { StudentRow, type SortConfig } from './types';

interface StudentsClassContentProps {
  students: StudentRow[];
  searchTerm: string;
  viewMode: 'grid' | 'list';
  canManageActiveClass: boolean;
  isAdmin?: boolean;
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
  isAdmin = false,
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
        <EmptyState
          variant="card"
          icon={<UsersIcon />}
          title="Tidak Ada Data Siswa"
          description="Belum ada siswa di kelas ini atau tidak ada yang cocok dengan filter pencarian Anda."
          actionLabel={isAdmin ? "Tambah Siswa Baru" : undefined}
          onAction={isAdmin ? onAddStudent : undefined}
        />
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
          canManageActiveClass={canManageActiveClass}
          isAdmin={isAdmin}
        />
      )}
    </>
  );
};
