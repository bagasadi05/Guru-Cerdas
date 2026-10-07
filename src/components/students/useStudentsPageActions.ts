import { Dispatch, FormEvent, SetStateAction } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { triggerSuccessConfetti } from '../../utils/confetti';
import { exportToCSV, exportToExcel } from '../../utils/exportUtils';
import { supabase } from '../../services/supabase';
import { Database } from '../../services/database.types';
import { ParsedRow } from '../../services/ImportService';
import { ExportFormat } from '../advanced-features/ExportPreviewModal';
import { ClassRow, ConfirmModalState, StudentRow } from './types';
import { getStudentAvatar } from '../../utils/avatarUtils';

import { generateSimpleAccessCode } from '../../utils/accessCode';
import { softDelete, softDeleteBulk } from '../../services/SoftDeleteService';
import { normalizeStudentName } from '../../utils/textSanitizer';
import { fetchAllPages } from '../../utils/fetchAllPages';
import { buildStudentExportRows, studentExportColumns } from './studentExportData';

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
  'nis',
  'nisn',
  'birth_date',
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
  setConfirmModalState: Dispatch<SetStateAction<ConfirmModalState>>;
}

export const useStudentsPageActions = ({
  userId,
  classes,
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

  const assertClassIsEmpty = async (classId: string) => {
    const { count, error } = await supabase.from('students')
      .select('id', { count: 'exact', head: true })
      .eq('class_id', classId)
      .is('deleted_at', null);
    if (error) throw new Error(error.message);
    if (count === null) throw new Error('Jumlah siswa belum dapat dipastikan. Coba lagi.');
    if (count > 0) {
      const className = classes.find((item) => item.id === classId)?.name || '';
      throw new Error(`Tidak dapat menghapus kelas "${className}" karena masih ada ${count} siswa di dalamnya.`);
    }
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
      const res = await softDelete('students', studentId);
      if (!res.success) throw new Error(res.error || 'Gagal menghapus siswa');
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
      await assertClassIsEmpty(classId);
      const { error } = await supabase
        .from('classes')
        .update({ deleted_at: new Date().toISOString() } as never)
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
    mutationFn: async ({ classId, studentIds }: { classId: string; studentIds?: string[] }) => {
      const studentsInClass = await fetchAllPages<Pick<StudentRow, 'id' | 'access_code'>>(async (from, to) => {
        let query = supabase.from('students').select('id, access_code')
          .eq('class_id', classId).is('deleted_at', null).order('id');
        if (studentIds) query = query.in('id', studentIds);
        return query.range(from, to);
      });
      if (studentsInClass.length === 0) return { message: 'Tidak ada siswa untuk dibuatkan kode akses.' };
      const studentsToUpdate = studentsInClass.filter((student) => !student.access_code);
      if (studentsToUpdate.length === 0) {
        return { message: 'Semua siswa di kelas ini sudah memiliki kode akses.' };
      }

      const counts = await Promise.all(
        studentsToUpdate.map(async (student) => {
          let query = supabase
            .from('students')
            .update({ access_code: generateSimpleAccessCode() })
            .eq('id', student.id).eq('class_id', classId).is('deleted_at', null);
          query = student.access_code === null
            ? query.is('access_code', null)
            : query.eq('access_code', student.access_code);
          const { data, error } = await query.select('id');
          if (error) throw error;
          return data?.length || 0;
        }),
      );

      return { count: counts.reduce((total, count) => total + count, 0) };
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
    onSettled: invalidateStudentQueries,
  });

  const { mutate: bulkMoveStudents, isPending: isMovingStudents } = useMutation({
    mutationFn: async ({ studentIds, targetClassId }: { studentIds: string[]; targetClassId: string }) => {
      const visibleIds = studentsForActiveClass.filter((student) => studentIds.includes(student.id)).map((student) => student.id);
      if (!visibleIds.length || visibleIds.length !== studentIds.length) throw new Error('Pilihan siswa sudah berubah. Pilih kembali siswa yang akan dipindahkan.');
      const { error } = await supabase.from('students').update({ class_id: targetClassId })
        .in('id', visibleIds).eq('class_id', activeClassId).is('deleted_at', null);
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
    const name = normalizeStudentName((formData.get('name') as string) || '');
    const classId = formData.get('class_id') as string;
    const nis = ((formData.get('nis') as string) || '').trim() || null;
    const nisn = ((formData.get('nisn') as string) || '').trim() || null;
    const birthDate = ((formData.get('birth_date') as string) || '').trim() || null;
    const parentName = ((formData.get('parent_name') as string) || '').trim() || null;
    const parentPhone = ((formData.get('parent_phone') as string) || '').trim() || null;
    const avatarUrl = getStudentAvatar(null, genderSelection, undefined, name);

    if (studentModalMode === 'add') {
      addStudent({
        name,
        class_id: classId,
        user_id: userId,
        gender: genderSelection,
        avatar_url: avatarUrl,
        nis,
        nisn,
        birth_date: birthDate,
        parent_name: parentName,
        parent_phone: parentPhone,
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
      nis,
      nisn,
      birth_date: birthDate,
      parent_name: parentName,
      parent_phone: parentPhone,
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
      message: `Pindahkan data siswa "${student.name}" ke Sampah? Data dapat dipulihkan dari menu Sampah.`,
      onConfirm: () => deleteStudent(student.id),
      confirmVariant: 'destructive',
      confirmText: 'Ya, Hapus Siswa',
    });
  };

  const handleDeleteClassClick = async (classData: ClassRow) => {
    try {
      await assertClassIsEmpty(classData.id);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Gagal memeriksa jumlah siswa. Coba lagi.');
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
      onConfirm: () => generateBulkCodes({ classId: classData.id }),
      confirmVariant: 'default',
      confirmText: 'Ya, Buat Kode',
    });
  };

  const handleBulkDelete = (ids: string[]) => {
    if (!ids.length || ids.some((id) => !studentsForActiveClass.some((student) => student.id === id))) {
      toast.warning('Pilihan siswa sudah berubah. Pilih kembali siswa yang akan dihapus.');
      return;
    }
    setConfirmModalState({
      isOpen: true,
      title: 'Hapus Siswa Terpilih',
      message: `Pindahkan ${ids.length} siswa terpilih ke Sampah? Data dapat dipulihkan dari menu Sampah.`,
      onConfirm: async () => {
        try {
          const res = await softDeleteBulk('students', ids);
          if (!res.success) throw new Error(res.error || 'Gagal menghapus siswa');
          invalidateStudentQueries();
          clearSelection();
          setConfirmModalState((prev) => ({ ...prev, isOpen: false }));
          toast.success(`${ids.length} siswa berhasil dihapus. Lihat Sampah untuk memulihkan.`);
        } catch {
          toast.error('Gagal menghapus beberapa siswa.');
        }
      },
      confirmVariant: 'destructive',
      confirmText: `Hapus ${ids.length} Siswa`,
    });
  };

  const handleBulkExport = async (ids: string[]) => {
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

    await exportToExcel(dataToExport, `Data_Siswa_Terpilih_${currentClassName}`, `Data Siswa Terpilih - ${currentClassName}`);
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
      onConfirm: () => generateBulkCodes({ classId: activeClassId, studentIds: studentsNeedCode.map((student) => student.id) }),
      confirmVariant: 'default',
      confirmText: `Buat ${studentsNeedCode.length} Kode`,
    });
  };

  const handleGenerateStudentCode = (student: StudentRow) => {
    setConfirmModalState({
      isOpen: true,
      title: 'Buat Kode Akses',
      message: `Buat kode akses untuk "${student.name}"?`,
      onConfirm: () => generateBulkCodes({ classId: student.class_id, studentIds: [student.id] }),
      confirmVariant: 'default',
      confirmText: 'Buat Kode',
    });
  };

  const handleExportStudents = () => {
    if (studentsForActiveClass.length === 0) {
      toast.warning('Tidak ada data siswa untuk diekspor.');
      return;
    }
    setIsExportModalOpen(true);
  };

  const handleExportConfirm = async (format: ExportFormat, selectedColumns: string[]) => {
    if (format !== 'xlsx' && format !== 'csv') {
      throw new Error('Format ekspor tidak tersedia. Pilih Excel atau CSV.');
    }
    const currentClassName = classes.find((item) => item.id === activeClassId)?.name || 'Semua Kelas';
    const columns = studentExportColumns.filter(column => selectedColumns.includes(column.key));
    const dataToExport = buildStudentExportRows(studentsForActiveClass, classes).map((student, index) => {
      const row: Record<string, string | number | boolean | null | undefined> = {
        No: index + 1,
      };
      columns.forEach(column => {
        row[column.label] = student[column.key];
      });
      return row;
    });
    const exportData = format === 'csv' ? exportToCSV : exportToExcel;
    await exportData(dataToExport, `Data_Siswa_${currentClassName.replace(/\s+/g, '_')}`, `Data Siswa - ${currentClassName}`);
    toast.success(`Data siswa berhasil diekspor ke ${format.toUpperCase()}!`);
  };

  const handleImportStudents = async (validRows: ParsedRow[]) => {
    if (!userId) throw new Error('Silakan masuk kembali sebelum mengimpor siswa.');
    if (!validRows.length) throw new Error('Tidak ada siswa valid untuk diimpor.');

    const studentsToInsert = validRows.map((row) => {
      if (!row.isValid || !row.data.name || !['Laki-laki', 'Perempuan'].includes(String(row.data.gender))) {
        throw new Error(`Baris ${row.rowNumber}: nama dan jenis kelamin siswa harus valid.`);
      }
      const gender = row.data.gender as 'Laki-laki' | 'Perempuan';
      const avatarUrl = getStudentAvatar(null, gender, undefined, String(row.data.name || Date.now()));

      let classId = activeClassId;
      const className = String(row.data.class_name || '').trim();
      if (className) {
        const matches = classes.filter((item) => item.name.trim().toLowerCase() === className.toLowerCase());
        if (matches.length !== 1) {
          throw new Error(`Baris ${row.rowNumber}: kelas "${className}" ${matches.length ? 'memiliki lebih dari satu kecocokan' : 'tidak ditemukan'}. Periksa nama kelas sebelum mengimpor.`);
        }
        classId = matches[0].id;
      }
      if (!classes.some((item) => item.id === classId)) {
        throw new Error(`Baris ${row.rowNumber}: pilih kelas tujuan sebelum mengimpor siswa.`);
      }

      return {
        name: normalizeStudentName(String(row.data.name || '')),
        gender,
        class_id: classId,
        user_id: userId,
        avatar_url: avatarUrl,
        access_code: row.data.access_code ? String(row.data.access_code) : undefined,
        parent_name: row.data.parent_name ? String(row.data.parent_name) : null,
        parent_phone: row.data.parent_phone ? String(row.data.parent_phone) : null,
        nis: row.data.nis ? String(row.data.nis) : null,
        nisn: row.data.nisn ? String(row.data.nisn) : null,
        birth_date: row.data.birth_date ? String(row.data.birth_date) : null,
        address: '',
        class: classId ? classes.find((item) => item.id === classId)?.name || '' : '',
        contact: '',
        date_of_birth: row.data.birth_date ? String(row.data.birth_date) : new Date().toISOString().split('T')[0],
        email: '',
        guardian_name: row.data.parent_name ? String(row.data.parent_name) : '',
        photo_url: avatarUrl,
      };
    });

    const sanitizedStudents = studentsToInsert.map((student) => pickLiveColumns(student, LIVE_STUDENT_COLUMNS));

    const { error } = await supabase.from('students').insert(sanitizedStudents as Database['public']['Tables']['students']['Insert'][]);
    if (error) throw error;

    queryClient.invalidateQueries({ queryKey: ['students'] });
    toast.success(`${studentsToInsert.length} siswa berhasil diimpor.`);
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
    handleGenerateStudentCode,
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
