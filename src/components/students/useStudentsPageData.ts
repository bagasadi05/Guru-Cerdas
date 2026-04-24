import { useDeferredValue, useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '../../services/supabase';
import { ClassRow, SortConfig, StudentRow } from './types';
import { TeacherClassAssignmentRow } from '../../services/teacherAssignments';

interface ToastApi {
  error: (message: string) => void;
}

interface UseStudentsPageDataOptions {
  userId?: string;
  toast: ToastApi;
}

const EMPTY_CLASSES: ClassRow[] = [];
const EMPTY_STUDENTS: StudentRow[] = [];
const EMPTY_ASSIGNMENTS: TeacherClassAssignmentRow[] = [];

export const useStudentsPageData = ({ userId, toast }: UseStudentsPageDataOptions) => {
  const [searchTerm, setSearchTerm] = useState('');
  const deferredSearchTerm = useDeferredValue(searchTerm);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [activeClassId, setActiveClassId] = useState('');
  const [sortConfig, setSortConfig] = useState<SortConfig>({ key: 'name', direction: 'asc' });
  const [genderFilter, setGenderFilter] = useState<'all' | 'Laki-laki' | 'Perempuan'>('all');
  const [accessCodeFilter, setAccessCodeFilter] = useState<'all' | 'has_code' | 'no_code'>('all');

  const {
    data: userAssignments = EMPTY_ASSIGNMENTS,
  } = useQuery({
    queryKey: ['teacherClassAssignments', userId],
    queryFn: async () => {
      if (!userId) return EMPTY_ASSIGNMENTS;

      const { data, error } = await supabase
        .from('teacher_class_assignments')
        .select('id, teacher_user_id, class_id, semester_id, assignment_role, subject_name, notes, created_by, created_at, updated_at, deleted_at')
        .eq('teacher_user_id', userId)
        .is('deleted_at', null)
        .order('created_at', { ascending: false });

      if (error) throw new Error(error.message);
      return (data || EMPTY_ASSIGNMENTS) as TeacherClassAssignmentRow[];
    },
    enabled: !!userId,
  });

  const {
    data: classesData,
    isLoading: isLoadingClasses,
    isError: isClassesError,
    error: classesError,
  } = useQuery({
    queryKey: ['classes', userId],
    queryFn: async () => {
      if (!userId) return EMPTY_CLASSES;

      const { data, error } = await supabase
        .from('classes')
        .select('id, name, user_id, created_at, deleted_at')
        .is('deleted_at', null)
        .order('name');

      if (error) throw new Error(error.message);
      return (data || EMPTY_CLASSES) as unknown as ClassRow[];
    },
    enabled: !!userId,
  });

  const {
    data: studentsData,
    isLoading: isLoadingStudents,
    isError: isStudentsError,
    error: studentsError,
  } = useQuery({
    queryKey: ['students', userId, activeClassId],
    queryFn: async () => {
      if (!userId || !activeClassId) return EMPTY_STUDENTS;

      const { data, error } = await supabase
        .from('students')
        .select('id, name, user_id, class_id, gender, avatar_url, access_code, parent_name, parent_phone, created_at, deleted_at')
        .eq('class_id', activeClassId)
        .is('deleted_at', null);

      if (error) throw new Error(error.message);
      return (data || EMPTY_STUDENTS) as unknown as StudentRow[];
    },
    enabled: !!userId && !!activeClassId,
  });

  const classes = classesData || EMPTY_CLASSES;
  const students = studentsData || EMPTY_STUDENTS;
  const activeClass = classes.find((classItem) => classItem.id === activeClassId) || null;
  const canManageActiveClass = activeClass?.user_id === userId;
  const isLoading = isLoadingClasses || isLoadingStudents;
  const isError = isClassesError || isStudentsError;
  const queryError = classesError || studentsError;

  useEffect(() => {
    if (isError) {
      toast.error(`Gagal memuat data: ${(queryError as Error).message}`);
    }
  }, [isError, queryError, toast]);

  useEffect(() => {
    if (classes.length > 0 && !activeClassId) {
      const timer = setTimeout(() => setActiveClassId(classes[0].id), 0);
      return () => clearTimeout(timer);
    }
  }, [classes, activeClassId]);

  const studentsForActiveClass = useMemo(() => {
    let filtered = students;

    if (deferredSearchTerm) {
      const lowerTerm = deferredSearchTerm.toLowerCase();
      filtered = filtered.filter((student) =>
        student.name.toLowerCase().includes(lowerTerm) ||
        (student.access_code && student.access_code.toLowerCase().includes(lowerTerm)),
      );
    }

    if (genderFilter !== 'all') {
      filtered = filtered.filter((student) => student.gender === genderFilter);
    }

    if (accessCodeFilter !== 'all') {
      filtered = filtered.filter((student) =>
        accessCodeFilter === 'has_code' ? !!student.access_code : !student.access_code,
      );
    }

    return [...filtered].sort((a, b) => {
      const aValue = a[sortConfig.key as keyof StudentRow];
      const bValue = b[sortConfig.key as keyof StudentRow];

      if (aValue === bValue) return 0;
      if (aValue === null || aValue === undefined) return 1;
      if (bValue === null || bValue === undefined) return -1;

      const comparison = String(aValue).localeCompare(String(bValue), 'id-ID', { numeric: true });
      return sortConfig.direction === 'asc' ? comparison : -comparison;
    });
  }, [accessCodeFilter, deferredSearchTerm, genderFilter, sortConfig, students]);

  const handleSort = (key: string) => {
    setSortConfig((current) => ({
      key,
      direction: current.key === key && current.direction === 'asc' ? 'desc' : 'asc',
    }));
  };

  return {
    searchTerm,
    setSearchTerm,
    viewMode,
    setViewMode,
    activeClassId,
    setActiveClassId,
    sortConfig,
    genderFilter,
    setGenderFilter,
    accessCodeFilter,
    setAccessCodeFilter,
    classes,
    students,
    userAssignments,
    activeClass,
    canManageActiveClass,
    studentsForActiveClass,
    isLoading,
    handleSort,
  };
};
