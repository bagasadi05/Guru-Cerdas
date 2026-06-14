import React from 'react';
import { BulkActionBar } from '../advanced-features/BulkActionBar';
import { StudentActionSheet } from './StudentActionSheet';
import { StudentFilters } from './StudentFilters';
import { StudentsClassContent } from './StudentsClassContent';
import { StudentsClassFormModal } from './StudentsClassFormModal';
import { StudentsClassManageModal } from './StudentsClassManageModal';
import { StudentsClassTabsHeader } from './StudentsClassTabsHeader';
import { StudentsHeaderActions } from './StudentsHeaderActions';
import { StudentsModalStack } from './StudentsModalStack';
import { StudentsStudentFormModal } from './StudentsStudentFormModal';
import { Tabs, TabsContent } from '../ui/Tabs';
import { ClassRow, ConfirmModalState, SortConfig, StudentRow } from './types';
import { StudentsHeaderActionId } from './studentsMenuConfig';
import { ExportFormat } from '../advanced-features/ExportPreviewModal';
import { ParsedRow } from '../../services/ImportService';
import { Button } from '../ui/Button';
import { PlusIcon, UsersIcon } from '../Icons';

interface StudentsPageFilterProps {
  searchTerm: string;
  onSearchChange: (value: string) => void;
  viewMode: 'grid' | 'list';
  onViewModeChange: (mode: 'grid' | 'list') => void;
  genderFilter: 'all' | 'Laki-laki' | 'Perempuan';
  onGenderFilterChange: (value: 'all' | 'Laki-laki' | 'Perempuan') => void;
  accessCodeFilter: 'all' | 'has_code' | 'no_code';
  onAccessCodeFilterChange: (value: 'all' | 'has_code' | 'no_code') => void;
}

interface StudentsPageClassSectionProps {
  activeClassId: string;
  onActiveClassChange: (value: string) => void;
  classes: ClassRow[];
  studentsForActiveClass: StudentRow[];
  canManageActiveClass: boolean;
  isSelected: (id: string) => boolean;
  toggleItem: (id: string) => void;
  isAllSelected: boolean;
  toggleAll: () => void;
  onStudentAction: (student: StudentRow, action: 'view' | 'edit' | 'delete' | 'menu') => void;
  sortConfig: SortConfig;
  onSort: (key: string) => void;
  onAddStudent: () => void;
  searchTerm: string;
  viewMode: 'grid' | 'list';
}

interface StudentsPageActionSheetProps {
  canManageActiveClass: boolean;
  onHeaderAction: (actionId: StudentsHeaderActionId) => void;
  selectedStudentForActions: StudentRow | null;
  onCloseStudentActions: () => void;
  onEditStudent: (student: StudentRow) => void;
  onDeleteStudent: (student: StudentRow) => void;
  onCopyCode: (code: string) => void;
  onGenerateCodeInfo: () => void;
}

interface StudentsPageStudentModalProps {
  isStudentModalOpen: boolean;
  studentModalMode: 'add' | 'edit';
  currentStudent: StudentRow | null;
  activeClassId: string;
  classes: ClassRow[];
  genderSelection: 'Laki-laki' | 'Perempuan';
  onGenderChange: (value: 'Laki-laki' | 'Perempuan') => void;
  onCloseStudentModal: () => void;
  onSubmitStudentForm: (event: React.FormEvent<HTMLFormElement>) => void;
  isStudentSubmitting: boolean;
}

interface StudentsPageClassModalProps {
  isClassManageModalOpen: boolean;
  onCloseClassManageModal: () => void;
  classes: ClassRow[];
  canManageClass: (classItem: ClassRow) => boolean;
  onGenerateCodesForClass: (classItem: ClassRow) => void;
  onEditClass: (classItem: ClassRow) => void;
  onDeleteClass: (classItem: ClassRow) => void;
  onAddClass: () => void;
  isClassModalOpen: boolean;
  classModalMode: 'add' | 'edit';
  classNameInput: string;
  onClassNameChange: (value: string) => void;
  onCloseClassModal: () => void;
  onSubmitClassForm: (event: React.FormEvent<HTMLFormElement>) => void;
  isClassSubmitting: boolean;
}

interface StudentsPageBulkActionProps {
  selectedCount: number;
  bulkActions: {
    id: string;
    label: string;
    icon: React.ReactNode;
    variant: 'default' | 'danger';
    onClick: ((ids: string[]) => void) | (() => void);
  }[];
  onClearSelection: () => void;
}

interface StudentsPageModalStackProps {
  confirmModalState: ConfirmModalState;
  onCloseConfirm: () => void;
  isConfirmLoading: boolean;
  isExportModalOpen: boolean;
  onCloseExportModal: () => void;
  onExportConfirm: (format: ExportFormat, selectedColumns: string[]) => void;
  isImportModalOpen: boolean;
  onCloseImportModal: () => void;
  onImportStudents: (validRows: ParsedRow[]) => Promise<void>;
  isIDCardModalOpen: boolean;
  onCloseIDCardModal: () => void;
  selectedStudentsForIDCard: StudentRow[];
  isBulkMoveModalOpen: boolean;
  onCloseBulkMoveModal: () => void;
  onBulkMoveConfirm: (targetClassId: string) => void;
  selectedCount: number;
  activeClassId: string;
  isMovingStudents: boolean;
  isImportFromTeacherModalOpen: boolean;
  onCloseImportFromTeacherModal: () => void;
}

interface StudentsPageViewProps {
  filters: StudentsPageFilterProps;
  classSection: StudentsPageClassSectionProps;
  actionSheet: StudentsPageActionSheetProps;
  studentModal: StudentsPageStudentModalProps;
  classModal: StudentsPageClassModalProps;
  bulkBar: StudentsPageBulkActionProps;
  modalStack: StudentsPageModalStackProps;
  isAdmin?: boolean;
}

export const StudentsPageView: React.FC<StudentsPageViewProps> = ({
  filters,
  classSection,
  actionSheet,
  studentModal,
  classModal,
  bulkBar,
  modalStack,
  isAdmin = false,
}) => {
  return (
    <div className="w-full min-h-full p-3 sm:p-4 md:p-6 lg:p-8 flex flex-col space-y-4 sm:space-y-6 max-w-7xl mx-auto pb-24 lg:pb-8 animate-fade-in-up">
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-gray-900 dark:text-white font-serif">Manajemen Siswa</h1>
          <p className="mt-2 text-gray-600 dark:text-gray-400">
            {classSection.canManageActiveClass
              ? 'Kelola data siswa, kelas, dan kode akses.'
              : 'Mode baca untuk kelas yang ditugaskan. Detail siswa tetap bisa dibuka tanpa mengubah data master.'}
          </p>
        </div>
        <StudentsHeaderActions 
          onAction={actionSheet.onHeaderAction} 
          canManageActiveClass={classSection.canManageActiveClass || classSection.classes.length === 0} 
          isAdmin={isAdmin}
        />
      </header>

      <div className="space-y-6">
        {classSection.classes.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 sm:py-24 px-4 text-center animate-fade-in bg-white dark:bg-gray-800/50 rounded-3xl border border-dashed border-gray-200 dark:border-gray-700">
            <div className="relative mb-6">
              <span className="absolute -top-3 -left-4 w-10 h-10 bg-indigo-100/70 dark:bg-indigo-900/30 rounded-full blur-sm" />
              <span className="absolute -bottom-3 -right-5 w-12 h-12 bg-sky-100/70 dark:bg-sky-900/20 rounded-full blur-sm" />
              <div className="relative w-20 h-20 bg-indigo-50 dark:bg-indigo-900/20 rounded-2xl flex items-center justify-center">
                <UsersIcon className="w-9 h-9 text-indigo-400 dark:text-indigo-300" />
              </div>
            </div>
            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2 font-serif">Belum Ada Kelas</h3>
            <p className="text-gray-500 dark:text-gray-400 max-w-md mx-auto mb-6">
              Anda belum memiliki data kelas. Silakan buat kelas baru terlebih dahulu untuk mulai mengelola siswa.
            </p>
            <Button
              onClick={classModal.onAddClass}
              className="rounded-xl shadow-lg shadow-indigo-500/20 bg-indigo-600 hover:bg-indigo-700 text-white"
            >
              <PlusIcon className="w-4 h-4 mr-2" /> Buat Kelas Baru
            </Button>
          </div>
        ) : (
          <>
            <StudentFilters
              searchTerm={filters.searchTerm}
              onSearchChange={filters.onSearchChange}
              viewMode={filters.viewMode}
              onViewModeChange={filters.onViewModeChange}
              genderFilter={filters.genderFilter}
              onGenderFilterChange={filters.onGenderFilterChange}
              accessCodeFilter={filters.accessCodeFilter}
              onAccessCodeFilterChange={filters.onAccessCodeFilterChange}
            />

            <Tabs value={classSection.activeClassId} onValueChange={classSection.onActiveClassChange} className="w-full">
              <StudentsClassTabsHeader classes={classSection.classes} />

              {classSection.classes.map((classItem) => (
                <TabsContent key={classItem.id} value={classItem.id} className="mt-0 focus:outline-none">
                  <StudentsClassContent
                    students={classSection.studentsForActiveClass}
                    searchTerm={classSection.searchTerm}
                    viewMode={classSection.viewMode}
                    isSelected={classSection.isSelected}
                    toggleItem={classSection.toggleItem}
                    isAllSelected={classSection.isAllSelected}
                    toggleAll={classSection.toggleAll}
                    onStudentAction={classSection.onStudentAction}
                    sortConfig={classSection.sortConfig}
                    onSort={classSection.onSort}
                    onAddStudent={classSection.onAddStudent}
                    canManageActiveClass={classSection.canManageActiveClass}
                    isAdmin={isAdmin}
                  />
                </TabsContent>
              ))}
            </Tabs>
          </>
        )}
      </div>

      <StudentActionSheet
        student={actionSheet.selectedStudentForActions}
        isOpen={!!actionSheet.selectedStudentForActions}
        onClose={actionSheet.onCloseStudentActions}
        canManageActiveClass={actionSheet.canManageActiveClass}
        isAdmin={isAdmin}
        onEdit={actionSheet.onEditStudent}
        onDelete={actionSheet.onDeleteStudent}
        onCopyCode={actionSheet.onCopyCode}
        onGenerateCodeInfo={actionSheet.onGenerateCodeInfo}
      />

      <StudentsStudentFormModal
        isOpen={studentModal.isStudentModalOpen}
        mode={studentModal.studentModalMode}
        currentStudent={studentModal.currentStudent}
        activeClassId={studentModal.activeClassId}
        classes={studentModal.classes}
        genderSelection={studentModal.genderSelection}
        onGenderChange={studentModal.onGenderChange}
        onClose={studentModal.onCloseStudentModal}
        onSubmit={studentModal.onSubmitStudentForm}
        isSubmitting={studentModal.isStudentSubmitting}
      />

      <StudentsClassManageModal
        isOpen={classModal.isClassManageModalOpen}
        onClose={classModal.onCloseClassManageModal}
        classes={classModal.classes}
        canManageClass={classModal.canManageClass}
        onGenerateCodes={classModal.onGenerateCodesForClass}
        onEditClass={classModal.onEditClass}
        onDeleteClass={classModal.onDeleteClass}
        onAddClass={classModal.onAddClass}
      />

      <StudentsClassFormModal
        isOpen={classModal.isClassModalOpen}
        mode={classModal.classModalMode}
        classNameInput={classModal.classNameInput}
        onClassNameChange={classModal.onClassNameChange}
        onClose={classModal.onCloseClassModal}
        onSubmit={classModal.onSubmitClassForm}
        isSubmitting={classModal.isClassSubmitting}
      />

      <BulkActionBar
        selectedCount={bulkBar.selectedCount}
        actions={bulkBar.bulkActions}
        onClear={bulkBar.onClearSelection}
      />

      <StudentsModalStack
        confirmModalState={modalStack.confirmModalState}
        onCloseConfirm={modalStack.onCloseConfirm}
        isConfirmLoading={modalStack.isConfirmLoading}
        isExportModalOpen={modalStack.isExportModalOpen}
        onCloseExportModal={modalStack.onCloseExportModal}
        studentsForExport={classSection.studentsForActiveClass}
        onExportConfirm={modalStack.onExportConfirm}
        isImportModalOpen={modalStack.isImportModalOpen}
        onCloseImportModal={modalStack.onCloseImportModal}
        onImportStudents={modalStack.onImportStudents}
        isIDCardModalOpen={modalStack.isIDCardModalOpen}
        onCloseIDCardModal={modalStack.onCloseIDCardModal}
        selectedStudentsForIDCard={modalStack.selectedStudentsForIDCard}
        classes={classSection.classes}
        isBulkMoveModalOpen={modalStack.isBulkMoveModalOpen}
        onCloseBulkMoveModal={modalStack.onCloseBulkMoveModal}
        onBulkMoveConfirm={modalStack.onBulkMoveConfirm}
        selectedCount={modalStack.selectedCount}
        activeClassId={modalStack.activeClassId}
        isMovingStudents={modalStack.isMovingStudents}
        isImportFromTeacherModalOpen={modalStack.isImportFromTeacherModalOpen}
        onCloseImportFromTeacherModal={modalStack.onCloseImportFromTeacherModal}
      />
    </div>
  );
};
