import { Dispatch, FormEvent, SetStateAction } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { triggerSuccessConfetti } from '../../utils/confetti';
import { exportToExcel } from '../../utils/exportUtils';
import { supabase } from '../../services/supabase';
import { Database } from '../../services/database.types';
import { ParsedRow } from '../../services/ImportService';
import { ExportFormat } from '../advanced-features/ExportPreviewModal';
import { ClassRow, ConfirmModalState, StudentRow } from './types';
import { getStudentAvatar } from '../../utils/avatarUtils';

const generateAccessCode = (): string => {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let result = '';
  for (let i = 0; i < 6; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
};

const pickLiveColumns = <T extends Record<string, unknown>>(data: T, columns: readonly string[]) => (
  Object.fromEntries(Object.entries(data).filter(([key]) => columns.includes(key)))
);

const LIVE_STUDENT_COLUMNS = [
  'id',
  'name',
  'user_id',
  'class_id',
  'gender',
  'avatar_url',
  'access_code',
  'parent_name',
  'parent_phone',
  'created_at',
  'deleted_at',
] as const;

const LIVE_CLASS_COLUMNS = [
  'id',
  'name',
  'user_id',
  'created_at',
  'deleted_at',
] as const;

interface StudentsPageActionsParams {
  userId?: string;
  classes: ClassRow[];
  students: StudentRow[];
  studentsForActiveClass: StudentRow[];
  activeClassId: string;
  selectedItems: Set<string>;
  clearSelection: () => void;
  toast: {
    success: (message: string) => void;
    error: (message: string) => void;
    warning: (message: string) => void;
    info: (message: string) => void;
  };
  studentModalMode: 'add' | 'edit';
  currentStudent: StudentRow | null;
  genderSelection: 'Laki-laki' | 'Perempuan';
  classModalMode: 'add' | 'edit';
  currentClass: ClassRow | null;
  classNameInput: string;
  setIsStudentModalOpen: Dispatch<SetStateAction<boolean>>;
  setIsClassModalOpen: Dispatch<SetStateAction<boolean>>;
  setIsBulkMoveModalOpen: Dispatch<SetStateAction<boolean>>;
  setIsExportModalOpen: Dispatch<SetStateAction<boolean>>;
  setIsImportModalOpen: Dispatch<SetStateAction<boolean>>;
  setConfirmModalState: Dispatch<SetStateAction<ConfirmModalState>>;
}

export const useStudentsPageActions = ({
  userId,
  classes,
  students,
  studentsForActiveClass,
  activeClassId,
  selectedItems,
  clearSelection,
  toast,
  studentModalMode,
  currentStudent,
  genderSelection,
  classModalMode,
  currentClass,
  classNameInput,
  setIsStudentModalOpen,
  setIsClassModalOpen,
  setIsBulkMoveModalOpen,
  setIsExportModalOpen,
  setIsImportModalOpen,
  setConfirmModalState,
}: StudentsPageActionsParams) => {
  const queryClient = useQueryClient();

  const invalidateStudentQueries = () => {
    queryClient.invalidateQueries({ queryKey: ['students'] });
    queryClient.invalidateQueries({ queryKey: ['classes'] });
    queryClient.invalidateQueries({ queryKey: ['studentsPageData'] });
    queryClient.invalidateQueries({ queryKey: ['deleted-items'] });
    queryClient.invalidateQueries({ queryKey: ['deleted-items-all'] });
  };

  const mutationOptions = {
    onSuccess: invalidateStudentQueries,
    onError: (error: Error) => toast.error(`Error: ${error.message}`),
  };

  const { mutate: addStudent, isPending: isAddingStudent } = useMutation({
    mutationFn: async (newStudent: Database['public']['Tables']['students']['Insert']) => {
      const { error } = await supabase.from('students').insert([pickLiveColumns(newStudent, LIVE_STUDENT_COLUMNS) as Database['public']['Tables']['students']['Insert']]);
      if (error) throw error;
    },
    ...mutationOptions,
    onSuccess: () => {
      invalidateStudentQueries();
      toast.success('Siswa berhasil ditambahkan.');
      setIsStudentModalOpen(false);
      setTimeout(() => triggerSuccessConfetti(), 300);
    },
  });

  const { mutate: updateStudent, isPending: isUpdatingStudent } = useMutation({
    mutationFn: async ({ id, ...updateData }: { id: string } & Database['public']['Tables']['students']['Update']) => {
      const { error } = await supabase.from('students').update(pickLiveColumns(updateData, LIVE_STUDENT_COLUMNS) as Database['public']['Tables']['students']['Update']).eq('id', id);
      if (error) throw error;
    },
    ...mutationOptions,
    onSuccess: () => {
      invalidateStudentQueries();
      toast.success('Siswa berhasil diperbarui.');
      setIsStudentModalOpen(false);
    },
  });

  const { mutate: deleteStudent, isPending: isDeletingStudent } = useMutation({
    mutationFn: async (studentId: string) => {
      const { error } = await supabase
        .from('students')
        .update({ deleted_at: new Date().toISOString() } as Record<string, unknown>)
        .eq('id', studentId);
      if (error) throw error;
    },
    ...mutationOptions,
    onSuccess: () => {
      invalidateStudentQueries();
      toast.success('Siswa berhasil dihapus. Lihat Sampah untuk memulihkan.');
      setConfirmModalState((prev) => ({ ...prev, isOpen: false }));
    },
  });

  const { mutate: addClass, isPending: isAddingClass } = useMutation({
    mutationFn: async (newClass: Database['public']['Tables']['classes']['Insert']) => {
      const { error } = await supabase.from('classes').insert([pickLiveColumns(newClass, LIVE_CLASS_COLUMNS) as Database['public']['Tables']['classes']['Insert']]);
      if (error) throw error;
    },
    ...mutationOptions,
    onSuccess: () => {
      invalidateStudentQueries();
      toast.success('Kelas berhasil ditambahkan.');
      setIsClassModalOpen(false);
    },
  });

  const { mutate: updateClass, isPending: isUpdatingClass } = useMutation({
    mutationFn: async ({ id, ...updateData }: { id: string } & Database['public']['Tables']['classes']['Update']) => {
      const { error } = await supabase.from('classes').update(pickLiveColumns(updateData, LIVE_CLASS_COLUMNS) as Database['public']['Tables']['classes']['Update']).eq('id', id);
      if (error) throw error;
    },
    ...mutationOptions,
    onSuccess: () => {
      invalidateStudentQueries();
      toast.success('Kelas berhasil diperbarui.');
      setIsClassModalOpen(false);
    },
  });

  const { mutate: deleteClass, isPending: isDeletingClass } = useMutation({
    mutationFn: async (classId: string) => {
      const { error } = await supabase
        .from('classes')
        .update({ deleted_at: new Date().toISOString() } as Record<string, unknown>)
        .eq('id', classId);
      if (error) throw error;
    },
    ...mutationOptions,
    onSuccess: () => {
      invalidateStudentQueries();
      toast.success('Kelas berhasil dihapus. Lihat Sampah untuk memulihkan.');
      setConfirmModalState((prev) => ({ ...prev, isOpen: false }));
    },
  });

  const { mutate: generateBulkCodes, isPending: isGeneratingBulkCodes } = useMutation({
    mutationFn: async (classId: string) => {
      const studentsInClass = students.filter((student) => student.class_id === classId);
      const studentsToUpdate = studentsInClass.filter((student) => !student.access_code);
      if (studentsToUpdate.length === 0) {
        return { message: 'Semua siswa di kelas ini sudah memiliki kode akses.' };
      }

      await Promise.all(
        studentsToUpdate.map(async (student) => {
          const { error } = await supabase
            .from('students')
            .update({ access_code: generateAccessCode() })
            .eq('id', student.id);
          if (error) throw error;
        }),
      );

      return { count: studentsToUpdate.length };
    },
    ...mutationOptions,
    onSuccess: (result) => {
      invalidateStudentQueries();
      if (result.message) {
        toast.info(result.message);
      } else {
        toast.success(`${result.count} kode akses baru berhasil dibuat.`);
      }
      setConfirmModalState((prev) => ({ ...prev, isOpen: false }));
    },
  });

  const { mutate: bulkMoveStudents, isPending: isMovingStudents } = useMutation({
    mutationFn: async ({ studentIds, targetClassId }: { studentIds: string[]; targetClassId: string }) => {
      const { error } = await supabase.from('students').update({ class_id: targetClassId }).in('id', studentIds);
      if (error) throw error;
    },
    ...mutationOptions,
    onSuccess: () => {
      invalidateStudentQueries();
      toast.success('Siswa berhasil dipindahkan.');
      setIsBulkMoveModalOpen(false);
      clearSelection();
    },
  });

  const handleStudentFormSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!userId) return;

    const formData = new FormData(event.currentTarget);
    const name = formData.get('name') as string;
    const classId = formData.get('class_id') as string;
    const avatarUrl = getStudentAvatar(null, genderSelection, undefined, name);

    if (studentModalMode === 'add') {
      const className = classes.find((item) => item.id === classId)?.name || '';
      addStudent({
        name,
        class_id: classId,
        user_id: userId,
        gender: genderSelection,
        avatar_url: avatarUrl,
        address: '',
        class: className,
        contact: '',
        date_of_birth: new Date().toISOString().split('T')[0],
        email: '',
        guardian_name: '',
        nis: '',
        nisn: '',
        photo_url: avatarUrl,
      });
      return;
    }

    if (!currentStudent) return;

    const nextAvatarUrl =
      currentStudent.gender !== genderSelection ||
      (currentStudent.avatar_url && (
        currentStudent.avatar_url.includes('pravatar') ||
        currentStudent.avatar_url.includes('dicebear') ||
        currentStudent.avatar_url.includes('avatar.iran.liara.run') ||
        currentStudent.avatar_url.includes('ui-avatars.com')
      ))
        ? avatarUrl
        : currentStudent.avatar_url;

    updateStudent({
      id: currentStudent.id,
      name,
      class_id: classId,
      gender: genderSelection,
      avatar_url: nextAvatarUrl,
    });
  };

  const handleClassFormSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!userId || !classNameInput) return;

    if (classModalMode === 'add') {
      addClass({
        name: classNameInput,
        user_id: userId,
        academic_year: `${new Date().getFullYear()}/${new Date().getFullYear() + 1}`,
        grade_level: 1,
      });
      return;
    }

    if (!currentClass) return;
    updateClass({ id: currentClass.id, name: classNameInput });
  };

  const handleDeleteStudentClick = (student: StudentRow) => {
    setConfirmModalState({
      isOpen: true,
      title: 'Hapus Siswa',
      message: `Apakah Anda yakin ingin menghapus data siswa "${student.name}" secara permanen?`,
      onConfirm: () => deleteStudent(student.id),
      confirmVariant: 'destructive',
      confirmText: 'Ya, Hapus Siswa',
    });
  };

  const handleDeleteClassClick = (classData: ClassRow) => {
    const studentCount = students.filter((student) => student.class_id === classData.id).length;
    if (studentCount > 0) {
      toast.error(`Tidak dapat menghapus kelas "${classData.name}" karena masih ada ${studentCount} siswa di dalamnya.`);
      return;
    }

    setConfirmModalState({
      isOpen: true,
      title: 'Hapus Kelas',
      message: `Apakah Anda yakin ingin menghapus kelas "${classData.name}"?`,
      onConfirm: () => deleteClass(classData.id),
      confirmVariant: 'destructive',
      confirmText: 'Ya, Hapus Kelas',
    });
  };

  const handleGenerateCodesClick = (classData: ClassRow) => {
    setConfirmModalState({
      isOpen: true,
      title: 'Buat Kode Akses Massal',
      message: `Ini akan membuat kode akses untuk semua siswa di kelas "${classData.name}" yang belum memilikinya. Lanjutkan?`,
      onConfirm: () => generateBulkCodes(classData.id),
      confirmVariant: 'default',
      confirmText: 'Ya, Buat Kode',
    });
  };

  const handleBulkDelete = (ids: string[]) => {
    setConfirmModalState({
      isOpen: true,
      title: 'Hapus Siswa Terpilih',
      message: `Apakah Anda yakin ingin menghapus ${ids.length} siswa terpilih secara permanen?`,
      onConfirm: async () => {
        try {
          for (const id of ids) {
            await deleteStudent(id);
          }
          clearSelection();
          setConfirmModalState((prev) => ({ ...prev, isOpen: false }));
          toast.success(`${ids.length} siswa berhasil dihapus.`);
        } catch {
          toast.error('Gagal menghapus beberapa siswa.');
        }
      },
      confirmVariant: 'destructive',
      confirmText: `Hapus ${ids.length} Siswa`,
    });
  };

  const handleBulkExport = (ids: string[]) => {
    const selectedStudents = studentsForActiveClass.filter((student) => ids.includes(student.id));
    if (selectedStudents.length === 0) {
      toast.warning('Tidak ada siswa terpilih untuk diekspor.');
      return;
    }

    const currentClassName = classes.find((item) => item.id === activeClassId)?.name || 'Terpilih';
    const dataToExport = selectedStudents.map((student, index) => ({
      No: index + 1,
      'Nama Lengkap': student.name,
      'Jenis Kelamin': student.gender,
      Kelas: currentClassName,
      'Kode Akses': student.access_code || 'Belum Ada',
    }));

    exportToExcel(dataToExport, `Data_Siswa_Terpilih_${currentClassName}`, `Data Siswa Terpilih - ${currentClassName}`);
    toast.success(`${selectedStudents.length} siswa berhasil diekspor!`);
    clearSelection();
  };

  const handleBulkGenerateCodes = (ids: string[]) => {
    const studentsNeedCode = studentsForActiveClass.filter((student) => ids.includes(student.id) && !student.access_code);
    if (studentsNeedCode.length === 0) {
      toast.info('Semua siswa terpilih sudah memiliki kode akses.');
      return;
    }

    setConfirmModalState({
      isOpen: true,
      title: 'Buat Kode Akses Massal',
      message: `Ini akan membuat kode akses untuk ${studentsNeedCode.length} siswa yang belum memiliki kode. Lanjutkan?`,
      onConfirm: async () => {
        try {
          await Promise.all(
            studentsNeedCode.map(async (student) => {
              const { error } = await supabase
                .from('students')
                .update({ access_code: generateAccessCode() })
                .eq('id', student.id);
              if (error) throw error;
            }),
          );

          queryClient.invalidateQueries({ queryKey: ['students'] });
          toast.success(`${studentsNeedCode.length} kode akses baru berhasil dibuat!`);
          clearSelection();
          setConfirmModalState((prev) => ({ ...prev, isOpen: false }));
        } catch (error: unknown) {
          toast.error(`Gagal membuat kode: ${error instanceof Error ? error.message : String(error)}`);
        }
      },
      confirmVariant: 'default',
      confirmText: `Buat ${studentsNeedCode.length} Kode`,
    });
  };

  const handleExportStudents = () => {
    if (studentsForActiveClass.length === 0) {
      toast.warning('Tidak ada data siswa untuk diekspor.');
      return;
    }
    setIsExportModalOpen(true);
  };

  const handleExportConfirm = (format: ExportFormat, selectedColumns: string[]) => {
    const currentClassName = classes.find((item) => item.id === activeClassId)?.name || 'Semua Kelas';
    const dataToExport = studentsForActiveClass.map((student, index) => {
      const row: Record<string, string | number | boolean | null | undefined> = {
        No: index + 1,
      };

      const columnMap: Record<string, string | number | boolean | null | undefined> = {
        name: student.name,
        gender: student.gender,
        class_id: classes.find((item) => item.id === student.class_id)?.name || '-',
        access_code: student.access_code || 'Belum Ada',
      };

      selectedColumns.forEach((column) => {
        const label =
          column === 'class_id'
            ? 'Kelas'
            : column === 'access_code'
              ? 'Kode Akses'
              : column === 'name'
                ? 'Nama Lengkap'
                : 'Jenis Kelamin';

        if (columnMap[column]) {
          row[label] = columnMap[column];
        }
      });

      return row;
    });

    if (format === 'xlsx' || format === 'csv') {
      exportToExcel(dataToExport, `Data_Siswa_${currentClassName.replace(/\s+/g, '_')}`, `Data Siswa - ${currentClassName}`);
      toast.success(`Data siswa berhasil diekspor ke ${format.toUpperCase()}!`);
      return;
    }

    toast.info(`Format ${format.toUpperCase()} belum didukung sepenuhnya, menggunakan Excel.`);
    exportToExcel(dataToExport, `Data_Siswa_${currentClassName.replace(/\s+/g, '_')}`, `Data Siswa - ${currentClassName}`);
  };

  const handleImportStudents = async (validRows: ParsedRow[]) => {
    if (!userId) throw new Error('User not authenticated');

    const studentsToInsert = validRows.map((row) => {
      const gender = row.data.gender as 'Laki-laki' | 'Perempuan';
      const avatarUrl = getStudentAvatar(null, gender, undefined, String(row.data.name || Date.now()));

      let classId = activeClassId;
      if (row.data.class_name && typeof row.data.class_name === 'string') {
        const matchedClass = classes.find((item) => item.name.toLowerCase() === String(row.data.class_name).toLowerCase());
        if (matchedClass) classId = matchedClass.id;
      }

      return {
        name: String(row.data.name || ''),
        gender,
        class_id: classId,
        user_id: userId,
        avatar_url: avatarUrl,
        access_code: row.data.access_code ? String(row.data.access_code) : undefined,
        address: '',
        class: classId ? classes.find((item) => item.id === classId)?.name || '' : '',
        contact: '',
        date_of_birth: new Date().toISOString().split('T')[0],
        email: '',
        guardian_name: '',
        nis: '',
        nisn: '',
        photo_url: avatarUrl,
      };
    });

    const sanitizedStudents = studentsToInsert.map((student) => pickLiveColumns(student, LIVE_STUDENT_COLUMNS));

    const { error } = await supabase.from('students').insert(sanitizedStudents as Database['public']['Tables']['students']['Insert'][]);
    if (error) throw error;

    queryClient.invalidateQueries({ queryKey: ['students'] });
    toast.success(`${studentsToInsert.length} siswa berhasil diimport!`);
    setIsImportModalOpen(false);
  };

  return {
    bulkMoveStudents,
    handleStudentFormSubmit,
    handleClassFormSubmit,
    handleDeleteStudentClick,
    handleDeleteClassClick,
    handleGenerateCodesClick,
    handleBulkDelete,
    handleBulkExport,
    handleBulkGenerateCodes,
    handleExportStudents,
    handleExportConfirm,
    handleImportStudents,
    isAddingStudent,
    isUpdatingStudent,
    isDeletingStudent,
    isAddingClass,
    isUpdatingClass,
    isDeletingClass,
    isGeneratingBulkCodes,
    isMovingStudents,
    selectedStudentIds: Array.from(selectedItems),
  };
};
