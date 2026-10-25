import { useState, useMemo, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../../../../services/supabase';
import { useAuth } from '../../../../hooks/useAuth';
import { useToast } from '../../../../hooks/useToast';
import { triggerSubtleConfetti } from '../../../../utils/confetti';
import { useSemester } from '../../../../contexts/SemesterContext';
import {
  Student,
  ClassItem,
  StudentHistoryData,
  StudentStats,
} from '../types';

export const useBrankasData = () => {
  const { user, isAdmin } = useAuth();
  const toast = useToast();
  const queryClient = useQueryClient();
  const { activeAcademicYear } = useSemester();

  // Resolve academic year label
  const getAcademicYearLabel = useCallback((cls: Pick<ClassItem, 'academic_year'>): string => {
    return cls.academic_year || activeAcademicYear?.name || 'Belum diatur';
  }, [activeAcademicYear?.name]);

  // State Management
  const [activeTab, setActiveTab] = useState<'active' | 'archived'>('active');
  const [searchQuery, setSearchQuery] = useState('');
  const [confirmArchiveClass, setConfirmArchiveClass] = useState<ClassItem | null>(null);
  const [confirmRestoreClass, setConfirmRestoreClass] = useState<ClassItem | null>(null);
  const [confirmText, setConfirmText] = useState('');
  const [detailClass, setDetailClass] = useState<ClassItem | null>(null);
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [studentSearchQuery, setStudentSearchQuery] = useState('');

  // 1. Fetch ALL classes
  const { data: allClasses = [], isLoading: loadingClasses } = useQuery<ClassItem[]>({
    queryKey: ['classes', 'all_classes_brankas', user?.id, isAdmin],
    queryFn: async () => {
      if (!user) return [];
      let query = supabase
        .from('classes')
        .select('*')
        .is('deleted_at', null)
        .order('name');
        
      if (!isAdmin) {
        query = query.eq('user_id', user.id);
      }
      
      const { data, error } = await query;
      if (error) throw error;
      return (data || []) as unknown as ClassItem[];
    },
    enabled: !!user,
  });

  // 1b. Fetch student counts per class (lightweight)
  const { data: studentCountMap = {} } = useQuery<Record<string, number>>({
    queryKey: ['students', 'brankas_counts', user?.id],
    queryFn: async () => {
      if (!user || allClasses.length === 0) return {};
      const classIds = allClasses.map(c => c.id);
      const { data, error } = await supabase
        .from('students')
        .select('class_id')
        .in('class_id', classIds)
        .is('deleted_at', null);
      if (error) throw error;
      const counts: Record<string, number> = {};
      (data || []).forEach(s => {
        if (s.class_id) {
          counts[s.class_id] = (counts[s.class_id] || 0) + 1;
        }
      });
      return counts;
    },
    enabled: !!user && allClasses.length > 0,
  });

  // Filter classes by active/archived tabs
  const activeClasses = useMemo(() => allClasses.filter(c => !c.is_archived), [allClasses]);
  const archivedClasses = useMemo(() => allClasses.filter(c => c.is_archived), [allClasses]);

  const totalArchivedStudents = useMemo(() => {
    return archivedClasses.reduce((sum, cls) => sum + (studentCountMap[cls.id] || 0), 0);
  }, [archivedClasses, studentCountMap]);

  const displayedClasses = useMemo(() => {
    const list = activeTab === 'active' ? activeClasses : archivedClasses;
    if (!searchQuery) return list;
    return list.filter(c => c.name.toLowerCase().includes(searchQuery.toLowerCase()));
  }, [activeTab, activeClasses, archivedClasses, searchQuery]);

  const handleTabSwitch = useCallback((tab: 'active' | 'archived') => {
    setActiveTab(tab);
    setSearchQuery('');
  }, []);

  // 2. Fetch students for the detailed class
  const { data: classStudents = [], isLoading: loadingStudents } = useQuery<Student[]>({
    queryKey: ['students', 'brankas_students', detailClass?.id],
    queryFn: async () => {
      if (!detailClass) return [];
      const { data, error } = await supabase
        .from('students')
        .select('id, name, class_id, gender, avatar_url')
        .eq('class_id', detailClass.id)
        .is('deleted_at', null)
        .order('name');

      if (error) throw error;
      return (data || []) as Student[];
    },
    enabled: !!detailClass,
  });
  
  const displayedStudents = useMemo(() => {
    if (!studentSearchQuery) return classStudents;
    const q = studentSearchQuery.toLowerCase();
    return classStudents.filter(s =>
      s.name.toLowerCase().includes(q) ||
      (s.nis && s.nis.includes(studentSearchQuery)) ||
      (s.nisn && s.nisn.includes(studentSearchQuery))
    );
  }, [classStudents, studentSearchQuery]);

  // 3. Fetch academic, attendance, violations, and quiz points of the selected historical student
  const { data: studentHistory, isLoading: loadingStudentHistory } = useQuery<StudentHistoryData | null>({
    queryKey: ['students', 'brankas_student_history', selectedStudent?.id],
    queryFn: async () => {
      if (!selectedStudent) return null;

      const safeQuery = async <T,>(queryPromise: PromiseLike<{ data: T | null; error: unknown }>): Promise<T | []> => {
        const { data, error } = await queryPromise;
        if (error) console.error('Brankas query error:', error);
        return (data || []) as T;
      };

      const [academics, attendance, violations, quizPoints] = await Promise.all([
        safeQuery(
          supabase
            .from('academic_records')
            .select('id, subject, score, assessment_name, notes, created_at')
            .eq('student_id', selectedStudent.id)
            .is('deleted_at', null)
            .order('created_at', { ascending: false })
        ),
        safeQuery(
          supabase
            .from('attendance')
            .select('id, date, status, notes')
            .eq('student_id', selectedStudent.id)
            .is('deleted_at', null)
        ),
        safeQuery(
          supabase
            .from('violations')
            .select('id, date, description, points, type')
            .eq('student_id', selectedStudent.id)
            .is('deleted_at', null)
        ),
        safeQuery(
          supabase
            .from('quiz_points')
            .select('id, quiz_name, points, category, created_at')
            .eq('student_id', selectedStudent.id)
            .is('deleted_at', null)
        ),
      ]);

      return { academics, attendance, violations, quizPoints } as unknown as StudentHistoryData;
    },
    enabled: !!selectedStudent,
  });

  // Mutation: Archive class (is_archived = true)
  const archiveMutation = useMutation({
    mutationFn: async (classId: string) => {
      const { error } = await supabase
        .from('classes')
        .update({ is_archived: true })
        .eq('id', classId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['classes'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard_data'] });
      queryClient.invalidateQueries({ queryKey: ['analytics_allowed_classes'] });
      queryClient.invalidateQueries({ queryKey: ['attendanceData'] });
      queryClient.invalidateQueries({ queryKey: ['students'] });
      
      toast.success(`Kelas berhasil diamankan di Brankas!`);
      setConfirmArchiveClass(null);
      setConfirmText('');
      triggerSubtleConfetti();
    },
    onError: (err: Error) => {
      toast.error(`Gagal mengarsipkan: ${err.message}`);
    },
  });

  // Mutation: Restore class (is_archived = false)
  const restoreMutation = useMutation({
    mutationFn: async (classId: string) => {
      const { error } = await supabase
        .from('classes')
        .update({ is_archived: false })
        .eq('id', classId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['classes'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard_data'] });
      queryClient.invalidateQueries({ queryKey: ['analytics_allowed_classes'] });
      queryClient.invalidateQueries({ queryKey: ['students'] });
      
      toast.success(`Kelas berhasil dipulihkan ke Dashboard Aktif!`);
      setConfirmRestoreClass(null);
      triggerSubtleConfetti();
    },
    onError: (err: Error) => {
      toast.error(`Gagal memulihkan: ${err.message}`);
    },
  });

  const handleArchive = () => {
    if (!confirmArchiveClass) return;
    if (confirmText !== 'ARSIP') {
      toast.warning("Silakan ketik 'ARSIP' dengan benar untuk mengonfirmasi.");
      return;
    }
    archiveMutation.mutate(confirmArchiveClass.id);
  };

  const handleRestore = () => {
    if (!confirmRestoreClass) return;
    restoreMutation.mutate(confirmRestoreClass.id);
  };

  // Derive historical analytics for selected student
  const studentStats: StudentStats | null = useMemo(() => {
    if (!studentHistory) return null;
    const { academics, attendance, violations, quizPoints } = studentHistory;

    const avgScore = academics.length > 0
      ? Math.round(academics.reduce((sum: number, r) => sum + r.score, 0) / academics.length)
      : 0;

    const hadirCount = attendance.filter((a) => a.status === 'Hadir').length;
    const attendanceRate = attendance.length > 0
      ? Math.round((hadirCount / attendance.length) * 100)
      : 100;

    const totalViolations = violations.reduce((sum: number, v) => sum + (v.points || 0), 0);
    const totalQuizPoints = quizPoints.reduce((sum: number, q) => sum + (q.points || 0), 0);

    return {
      avgScore,
      attendanceRate,
      totalViolations,
      totalQuizPoints,
      present: hadirCount,
      totalAttendance: attendance.length,
      sakit: attendance.filter((a) => a.status === 'Sakit').length,
      izin: attendance.filter((a) => a.status === 'Izin').length,
      alpha: attendance.filter((a) => a.status === 'Alpha').length,
    };
  }, [studentHistory]);

  return {
    user,
    activeTab,
    setActiveTab,
    searchQuery,
    setSearchQuery,
    confirmArchiveClass,
    setConfirmArchiveClass,
    confirmRestoreClass,
    setConfirmRestoreClass,
    confirmText,
    setConfirmText,
    detailClass,
    setDetailClass,
    selectedStudent,
    setSelectedStudent,
    studentSearchQuery,
    setStudentSearchQuery,
    loadingClasses,
    allClasses,
    studentCountMap,
    activeClasses,
    archivedClasses,
    totalArchivedStudents,
    displayedClasses,
    handleTabSwitch,
    classStudents,
    loadingStudents,
    displayedStudents,
    studentHistory,
    loadingStudentHistory,
    studentStats,
    archiveMutation,
    restoreMutation,
    handleArchive,
    handleRestore,
    getAcademicYearLabel,
  };
};
