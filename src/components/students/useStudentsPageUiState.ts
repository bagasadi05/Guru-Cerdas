import { useState } from 'react';
import { ClassRow, ConfirmModalState, StudentRow } from './types';

interface ToastApi {
  warning: (message: string) => void;
}

interface UseStudentsPageUiStateOptions {
  classes: ClassRow[];
  toast: ToastApi;
}

export const useStudentsPageUiState = ({ classes, toast }: UseStudentsPageUiStateOptions) => {
  const [isStudentModalOpen, setIsStudentModalOpen] = useState(false);
  const [studentModalMode, setStudentModalMode] = useState<'add' | 'edit'>('add');
  const [currentStudent, setCurrentStudent] = useState<StudentRow | null>(null);
  const [genderSelection, setGenderSelection] = useState<'Laki-laki' | 'Perempuan'>('Laki-laki');

  const [isClassModalOpen, setIsClassModalOpen] = useState(false);
  const [classModalMode, setClassModalMode] = useState<'add' | 'edit'>('add');
  const [currentClass, setCurrentClass] = useState<ClassRow | null>(null);
  const [classNameInput, setClassNameInput] = useState('');
  const [isClassManageModalOpen, setIsClassManageModalOpen] = useState(false);

  const [confirmModalState, setConfirmModalState] = useState<ConfirmModalState>({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => {},
    confirmVariant: 'destructive',
  });
  const [selectedStudentForActions, setSelectedStudentForActions] = useState<StudentRow | null>(null);

  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [isIDCardModalOpen, setIsIDCardModalOpen] = useState(false);
  const [isBulkMoveModalOpen, setIsBulkMoveModalOpen] = useState(false);
  const [isImportFromTeacherModalOpen, setIsImportFromTeacherModalOpen] = useState(false);

  const handleOpenStudentModal = (mode: 'add' | 'edit', student: StudentRow | null = null) => {
    if (classes.length === 0) {
      toast.warning('Silakan tambah data kelas terlebih dahulu sebelum menambah siswa.');
      return;
    }

    setStudentModalMode(mode);
    setCurrentStudent(student);
    setGenderSelection(student?.gender ?? 'Laki-laki');
    setIsStudentModalOpen(true);
  };

  const handleOpenClassModal = (mode: 'add' | 'edit', classData: ClassRow | null = null) => {
    setClassModalMode(mode);
    setCurrentClass(classData);
    setClassNameInput(classData?.name || '');
    setIsClassModalOpen(true);
  };

  const closeConfirmModal = () => {
    setConfirmModalState((prev) => ({ ...prev, isOpen: false }));
  };

  return {
    isStudentModalOpen,
    setIsStudentModalOpen,
    studentModalMode,
    currentStudent,
    genderSelection,
    setGenderSelection,
    isClassModalOpen,
    setIsClassModalOpen,
    classModalMode,
    currentClass,
    classNameInput,
    setClassNameInput,
    isClassManageModalOpen,
    setIsClassManageModalOpen,
    confirmModalState,
    setConfirmModalState,
    closeConfirmModal,
    selectedStudentForActions,
    setSelectedStudentForActions,
    isExportModalOpen,
    setIsExportModalOpen,
    isImportModalOpen,
    setIsImportModalOpen,
    isIDCardModalOpen,
    setIsIDCardModalOpen,
    isBulkMoveModalOpen,
    setIsBulkMoveModalOpen,
    isImportFromTeacherModalOpen,
    setIsImportFromTeacherModalOpen,
    handleOpenStudentModal,
    handleOpenClassModal,
  };
};