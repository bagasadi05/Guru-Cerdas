import { createStudentsBulkActions, handleStudentListAction, handleStudentsHeaderAction } from './studentsActionHelpers';
import { StudentsHeaderActionId } from './studentsMenuConfig';
import { StudentRow } from './types';

interface ToastApi {
  success: (message: string) => void;
  info: (message: string) => void;
}

interface UseStudentsPageInteractionsOptions {
  toast: ToastApi;
  studentsForActiveClass: StudentRow[];
  isSelected: (id: string) => boolean;
  handleBulkExport: (ids: string[]) => void;
  handleBulkGenerateCodes: (ids: string[]) => void;
  handleBulkDelete: (ids: string[]) => void;
  handleDeleteStudentClick: (student: StudentRow) => void;
  handleExportStudents: () => void;
  handleOpenStudentModal: (mode: 'add' | 'edit', student?: StudentRow | null) => void;
  setSelectedStudentForActions: (student: StudentRow | null) => void;
  setIsIDCardModalOpen: (isOpen: boolean) => void;
  setIsBulkMoveModalOpen: (isOpen: boolean) => void;
  setIsImportFromTeacherModalOpen: (isOpen: boolean) => void;
  setIsImportModalOpen: (isOpen: boolean) => void;
  setIsClassManageModalOpen: (isOpen: boolean) => void;
}

export const useStudentsPageInteractions = ({
  toast,
  studentsForActiveClass,
  isSelected,
  handleBulkExport,
  handleBulkGenerateCodes,
  handleBulkDelete,
  handleDeleteStudentClick,
  handleExportStudents,
  handleOpenStudentModal,
  setSelectedStudentForActions,
  setIsIDCardModalOpen,
  setIsBulkMoveModalOpen,
  setIsImportFromTeacherModalOpen,
  setIsImportModalOpen,
  setIsClassManageModalOpen,
}: UseStudentsPageInteractionsOptions) => {
  const handleBulkCopyCodes = (selectedIds: string[]) => {
    const selected = studentsForActiveClass.filter((s) => selectedIds.includes(s.id));
    if (selected.length === 0) return;

    const lines = [
      `*Daftar Kode Akses Siswa*`,
      `Total: ${selected.length} siswa`,
      ``,
      ...selected.map((s, idx) => {
        const codeText = s.access_code ? s.access_code : '(Belum ada kode)';
        const nisText = s.nis ? ` [NIS: ${s.nis}]` : '';
        return `${idx + 1}. ${s.name}${nisText}: ${codeText}`;
      }),
      ``,
      `Gunakan kode di atas untuk login ke Portal Orang Tua & Siswa Guru Cerdas.`,
    ];

    void navigator.clipboard.writeText(lines.join('\n'));
    toast.success(`Rekap kode akses untuk ${selected.length} siswa berhasil disalin!`);
  };

  const bulkActions = createStudentsBulkActions({
    onBulkExport: handleBulkExport,
    onBulkGenerateCodes: handleBulkGenerateCodes,
    onOpenIDCard: () => setIsIDCardModalOpen(true),
    onOpenBulkMove: () => setIsBulkMoveModalOpen(true),
    onBulkDelete: handleBulkDelete,
    onBulkCopyCodes: handleBulkCopyCodes,
  });

  const handleStudentAction = (student: StudentRow, action: 'view' | 'edit' | 'delete' | 'menu') => {
    handleStudentListAction({
      action,
      student,
      onEdit: (target) => handleOpenStudentModal('edit', target),
      onDelete: handleDeleteStudentClick,
      onOpenMenu: setSelectedStudentForActions,
    });
  };

  const handleHeaderAction = (actionId: StudentsHeaderActionId) => {
    handleStudentsHeaderAction({
      actionId,
      onImportTeacher: () => setIsImportFromTeacherModalOpen(true),
      onImportExcel: () => setIsImportModalOpen(true),
      onExport: handleExportStudents,
      onManageClass: () => setIsClassManageModalOpen(true),
      onAddStudent: () => handleOpenStudentModal('add'),
    });
  };

  const handleCopyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    toast.success('Kode akses disalin!');
  };

  const selectedStudentsForIDCard = studentsForActiveClass.filter((student) => isSelected(student.id));

  return {
    bulkActions,
    handleStudentAction,
    handleHeaderAction,
    handleCopyCode,
    selectedStudentsForIDCard,
  };
};
