import { useBulkSelection } from '../AdvancedFeatures';
import { useStudentsPageActions } from './useStudentsPageActions';
import { useStudentsPageData } from './useStudentsPageData';
import { useStudentsPageInteractions } from './useStudentsPageInteractions';
import { useStudentsPageUiState } from './useStudentsPageUiState';
import { ClassRow, StudentRow } from './types';

interface ToastApi {
  success: (message: string) => void;
  error: (message: string) => void;
  warning: (message: string) => void;
  info: (message: string) => void;
}

interface UseStudentsPageViewModelOptions {
  userId?: string;
  toast: ToastApi;
}

export const useStudentsPageViewModel = ({ userId, toast }: UseStudentsPageViewModelOptions) => {
  const data = useStudentsPageData({ userId, toast });

  const ui = useStudentsPageUiState({ classes: data.classes, toast });

  const { selectedItems, toggleItem, toggleAll, isAllSelected, isSelected, selectedCount, clearSelection } =
    useBulkSelection(data.studentsForActiveClass);

  const actions = useStudentsPageActions({
    userId,
    classes: data.classes,
    students: data.students,
    studentsForActiveClass: data.studentsForActiveClass,
    activeClassId: data.activeClassId,
    selectedItems,
    clearSelection,
    toast,
    studentModalMode: ui.studentModalMode,
    currentStudent: ui.currentStudent,
    genderSelection: ui.genderSelection,
    classModalMode: ui.classModalMode,
    currentClass: ui.currentClass,
    classNameInput: ui.classNameInput,
    setIsStudentModalOpen: ui.setIsStudentModalOpen,
    setIsClassModalOpen: ui.setIsClassModalOpen,
    setIsBulkMoveModalOpen: ui.setIsBulkMoveModalOpen,
    setIsExportModalOpen: ui.setIsExportModalOpen,
    setIsImportModalOpen: ui.setIsImportModalOpen,
    setConfirmModalState: ui.setConfirmModalState,
  });

  const interactions = useStudentsPageInteractions({
    toast,
    studentsForActiveClass: data.studentsForActiveClass,
    isSelected,
    handleBulkExport: actions.handleBulkExport,
    handleBulkGenerateCodes: actions.handleBulkGenerateCodes,
    handleBulkDelete: actions.handleBulkDelete,
    handleDeleteStudentClick: actions.handleDeleteStudentClick,
    handleExportStudents: actions.handleExportStudents,
    handleOpenStudentModal: ui.handleOpenStudentModal,
    setSelectedStudentForActions: ui.setSelectedStudentForActions,
    setIsIDCardModalOpen: ui.setIsIDCardModalOpen,
    setIsBulkMoveModalOpen: ui.setIsBulkMoveModalOpen,
    setIsImportFromTeacherModalOpen: ui.setIsImportFromTeacherModalOpen,
    setIsImportModalOpen: ui.setIsImportModalOpen,
    setIsClassManageModalOpen: ui.setIsClassManageModalOpen,
  });

  const viewProps = {
    filters: {
      searchTerm: data.searchTerm,
      onSearchChange: data.setSearchTerm,
      viewMode: data.viewMode,
      onViewModeChange: data.setViewMode,
      genderFilter: data.genderFilter,
      onGenderFilterChange: data.setGenderFilter,
      accessCodeFilter: data.accessCodeFilter,
      onAccessCodeFilterChange: data.setAccessCodeFilter,
    },
    classSection: {
      activeClassId: data.activeClassId,
      onActiveClassChange: data.setActiveClassId,
      classes: data.classes,
      studentsForActiveClass: data.studentsForActiveClass,
      isSelected,
      toggleItem,
      isAllSelected,
      toggleAll,
      onStudentAction: interactions.handleStudentAction,
      sortConfig: data.sortConfig,
      onSort: data.handleSort,
      onAddStudent: () => ui.handleOpenStudentModal('add'),
      searchTerm: data.searchTerm,
      viewMode: data.viewMode,
    },
    actionSheet: {
      onHeaderAction: interactions.handleHeaderAction,
      selectedStudentForActions: ui.selectedStudentForActions,
      onCloseStudentActions: () => ui.setSelectedStudentForActions(null),
      onEditStudent: (student: StudentRow) => ui.handleOpenStudentModal('edit', student),
      onDeleteStudent: actions.handleDeleteStudentClick,
      onCopyCode: interactions.handleCopyCode,
      onGenerateCodeInfo: interactions.handleGenerateCodeInfo,
    },
    studentModal: {
      isStudentModalOpen: ui.isStudentModalOpen,
      studentModalMode: ui.studentModalMode,
      currentStudent: ui.currentStudent,
      activeClassId: data.activeClassId,
      classes: data.classes,
      genderSelection: ui.genderSelection,
      onGenderChange: ui.setGenderSelection,
      onCloseStudentModal: () => ui.setIsStudentModalOpen(false),
      onSubmitStudentForm: actions.handleStudentFormSubmit,
      isStudentSubmitting: actions.isAddingStudent || actions.isUpdatingStudent,
    },
    classModal: {
      isClassManageModalOpen: ui.isClassManageModalOpen,
      onCloseClassManageModal: () => ui.setIsClassManageModalOpen(false),
      classes: data.classes,
      onGenerateCodesForClass: (classItem: ClassRow) => {
        ui.setIsClassManageModalOpen(false);
        actions.handleGenerateCodesClick(classItem);
      },
      onEditClass: (classItem: ClassRow) => {
        ui.setIsClassManageModalOpen(false);
        ui.handleOpenClassModal('edit', classItem);
      },
      onDeleteClass: actions.handleDeleteClassClick,
      onAddClass: () => {
        ui.setIsClassManageModalOpen(false);
        ui.handleOpenClassModal('add');
      },
      isClassModalOpen: ui.isClassModalOpen,
      classModalMode: ui.classModalMode,
      classNameInput: ui.classNameInput,
      onClassNameChange: ui.setClassNameInput,
      onCloseClassModal: () => ui.setIsClassModalOpen(false),
      onSubmitClassForm: actions.handleClassFormSubmit,
      isClassSubmitting: actions.isAddingClass || actions.isUpdatingClass,
    },
    bulkBar: {
      selectedCount,
      bulkActions: interactions.bulkActions,
      onClearSelection: clearSelection,
    },
    modalStack: {
      confirmModalState: ui.confirmModalState,
      onCloseConfirm: ui.closeConfirmModal,
      isConfirmLoading: actions.isDeletingStudent || actions.isDeletingClass || actions.isGeneratingBulkCodes,
      isExportModalOpen: ui.isExportModalOpen,
      onCloseExportModal: () => ui.setIsExportModalOpen(false),
      onExportConfirm: actions.handleExportConfirm,
      isImportModalOpen: ui.isImportModalOpen,
      onCloseImportModal: () => ui.setIsImportModalOpen(false),
      onImportStudents: actions.handleImportStudents,
      isIDCardModalOpen: ui.isIDCardModalOpen,
      onCloseIDCardModal: () => ui.setIsIDCardModalOpen(false),
      selectedStudentsForIDCard: interactions.selectedStudentsForIDCard,
      isBulkMoveModalOpen: ui.isBulkMoveModalOpen,
      onCloseBulkMoveModal: () => ui.setIsBulkMoveModalOpen(false),
      onBulkMoveConfirm: (targetClassId: string) =>
        actions.bulkMoveStudents({ studentIds: actions.selectedStudentIds, targetClassId }),
      selectedCount,
      activeClassId: data.activeClassId,
      isMovingStudents: actions.isMovingStudents,
      isImportFromTeacherModalOpen: ui.isImportFromTeacherModalOpen,
      onCloseImportFromTeacherModal: () => ui.setIsImportFromTeacherModalOpen(false),
    },
  };

  return {
    isLoading: data.isLoading,
    viewProps,
  };
};
