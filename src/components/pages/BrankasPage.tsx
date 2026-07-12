import React, { useState, useMemo, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../../services/supabase';
import { useAuth } from '../../hooks/useAuth';
import { useToast } from '../../hooks/useToast';
import { Button } from '../ui/Button';
import { Modal } from '../ui/Modal';
import { Card, CardInteractive, CardContent } from '../ui/Card';
import {
  Archive,
  BookOpen,
  Search,
  Award,
  FileText,
  CheckCircle,
  AlertTriangle,
  Printer,
  ArrowLeft,
  Calendar,
  Smile,
  ShieldAlert,
  Sparkles,
  Lock,
  Unlock,
  FolderLock,
  Loader2,
  Users,
  GraduationCap,
  RotateCcw,
} from 'lucide-react';
import { triggerSubtleConfetti } from '../../utils/confetti';
import { useSemester } from '../../contexts/SemesterContext';
import { getStudentAvatar } from '../../utils/avatarUtils';
import { AnimatePresence, motion } from 'framer-motion';

interface Student {
  id: string;
  name: string;
  class_id: string;
  gender: string;
  avatar_url?: string;
  nis?: string;
  nisn?: string;
}

interface ClassItem {
  id: string;
  name: string;
  academic_year: string | null;
  grade_level: number | null;
  is_archived: boolean;
  user_id: string;
  created_at: string;
}

const BrankasPage: React.FC = () => {
  const { user, isAdmin } = useAuth();
  const toast = useToast();
  const queryClient = useQueryClient();
  const { activeAcademicYear } = useSemester();

  // Resolve the academic year label for a class, falling back to the
  // currently active academic year when the class has none stored.
  const getAcademicYearLabel = (cls: Pick<ClassItem, 'academic_year'>): string => {
    return cls.academic_year || activeAcademicYear?.name || 'Belum diatur';
  };

  // State Management
  const [activeTab, setActiveTab] = useState<'active' | 'archived'>('active');
  const [searchQuery, setSearchQuery] = useState('');
  const [confirmArchiveClass, setConfirmArchiveClass] = useState<ClassItem | null>(null);
  const [confirmRestoreClass, setConfirmRestoreClass] = useState<ClassItem | null>(null);
  const [confirmText, setConfirmText] = useState('');
  const [detailClass, setDetailClass] = useState<ClassItem | null>(null);
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [studentSearchQuery, setStudentSearchQuery] = useState('');

  // 1. Fetch ALL classes (both active and archived)
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
      return data as unknown as ClassItem[];
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
      return data as Student[];
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
  const { data: studentHistory, isLoading: loadingStudentHistory } = useQuery({
    queryKey: ['students', 'brankas_student_history', selectedStudent?.id],
    queryFn: async () => {
      if (!selectedStudent) return null;

      const safeQuery = async (fn: () => any) => {
        const { data, error } = await fn();
        if (error) console.error('Brankas query error:', error);
        return (data || []);
      };

      const [academics, attendance, violations, quizPoints] = await Promise.all([
        safeQuery(() =>
          supabase
            .from('academic_records')
            .select('id, subject, score, assessment_name, notes, created_at')
            .eq('student_id', selectedStudent.id)
            .is('deleted_at', null)
            .order('created_at', { ascending: false })
        ),
        safeQuery(() =>
          supabase
            .from('attendance')
            .select('id, date, status, notes')
            .eq('student_id', selectedStudent.id)
            .is('deleted_at', null)
        ),
        safeQuery(() =>
          supabase
            .from('violations')
            .select('id, date, description, points, type')
            .eq('student_id', selectedStudent.id)
            .is('deleted_at', null)
        ),
        safeQuery(() =>
          supabase
            .from('quiz_points')
            .select('id, quiz_name, points, category, created_at')
            .eq('student_id', selectedStudent.id)
            .is('deleted_at', null)
        ),
      ]);

      return { academics, attendance, violations, quizPoints } as {
        academics: { id: string; subject: string; score: number; assessment_name?: string; notes?: string; created_at?: string }[];
        attendance: { id: string; date: string; status: string; notes?: string }[];
        violations: { id: string; date: string; description?: string; points?: number; type?: string }[];
        quizPoints: { id: string; quiz_name?: string; points?: number; category?: string; created_at?: string }[];
      };
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
  const studentStats = useMemo(() => {
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

  if (loadingClasses) {
    return (
      <div className="h-full flex items-center justify-center bg-slate-50 dark:bg-slate-950/20">
        <div className="text-center">
          <Loader2 className="w-10 h-10 text-emerald-500 animate-spin mx-auto" />
          <p className="mt-4 text-slate-500 dark:text-slate-400 font-medium">Memuat Brankas Kelas...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full min-h-full pb-20 lg:pb-6 font-sans">
      {/* Header Panel */}
      <header className="mb-4 sm:mb-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-3 sm:gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 sm:w-12 sm:h-12 flex-shrink-0 rounded-2xl bg-emerald-100 dark:bg-emerald-500/20 flex items-center justify-center">
              <FolderLock className="w-5 h-5 sm:w-6 sm:h-6 text-emerald-600 dark:text-emerald-400" />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 dark:text-white font-serif leading-tight">Brankas Kelas</h1>
              <p className="text-slate-500 dark:text-slate-400 text-xs sm:text-sm mt-0.5 line-clamp-2 sm:line-clamp-none">
                Simpan data kelas lama di Brankas untuk mereset dashboard Anda secara aman.
              </p>
            </div>
          </div>
        </div>

        {/* Summary Stats Pills */}
        <div className="flex flex-wrap items-center gap-2 mt-3 sm:mt-4">
          <span className="inline-flex items-center gap-1.5 px-2.5 sm:px-3 py-1 sm:py-1.5 bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 text-[10px] sm:text-xs font-bold rounded-full border border-emerald-200/60 dark:border-emerald-500/20">
            <Unlock className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
            {activeClasses.length} kelas aktif
          </span>
          <span className="inline-flex items-center gap-1.5 px-2.5 sm:px-3 py-1 sm:py-1.5 bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-400 text-[10px] sm:text-xs font-bold rounded-full border border-amber-200/60 dark:border-amber-500/20">
            <Lock className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
            {archivedClasses.length} di brankas
          </span>
          {totalArchivedStudents > 0 && (
            <span className="inline-flex items-center gap-1.5 px-2.5 sm:px-3 py-1 sm:py-1.5 bg-indigo-50 dark:bg-indigo-500/10 text-indigo-700 dark:text-indigo-400 text-[10px] sm:text-xs font-bold rounded-full border border-indigo-200/60 dark:border-indigo-500/20">
              <GraduationCap className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
              {totalArchivedStudents} siswa diarsipkan
            </span>
          )}
        </div>
      </header>

      {/* Tabs and Search Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4 mb-6">
        <div className="flex p-1 bg-slate-100 dark:bg-white/5 rounded-xl border border-slate-200/50 dark:border-white/5 w-full sm:w-fit">
          <button
            onClick={() => handleTabSwitch('active')}
            className={`flex-1 sm:flex-none flex justify-center items-center gap-2 px-3 sm:px-4 py-2 text-[11px] sm:text-xs font-semibold rounded-lg transition-all duration-200 ${
              activeTab === 'active'
                ? 'bg-white dark:bg-slate-800 text-emerald-600 dark:text-white shadow-md shadow-slate-200/40 dark:shadow-none'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Unlock className="w-3.5 h-3.5 hidden sm:block" />
            Kelas Aktif ({activeClasses.length})
          </button>
          <button
            onClick={() => handleTabSwitch('archived')}
            className={`flex-1 sm:flex-none flex justify-center items-center gap-2 px-3 sm:px-4 py-2 text-[11px] sm:text-xs font-semibold rounded-lg transition-all duration-200 ${
              activeTab === 'archived'
                ? 'bg-white dark:bg-slate-800 text-emerald-600 dark:text-white shadow-md shadow-slate-200/40 dark:shadow-none'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Lock className="w-3.5 h-3.5 hidden sm:block" />
            Brankas Arsip ({archivedClasses.length})
          </button>
        </div>

        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Cari kelas..."
            className="w-full pl-9 pr-4 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-medium text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 shadow-sm"
          />
        </div>
      </div>

      {/* Detail Mode (Read-only Historical Viewer) */}
      {detailClass ? (
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, ease: 'easeOut' }}
        >
          <Card className="overflow-hidden shadow-md border-slate-200/60 dark:border-slate-700/50">
            {/* Detail Header */}
            <div className="p-5 sm:p-6 bg-slate-50/80 dark:bg-slate-800/50 border-b border-slate-200/60 dark:border-slate-700/50 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div className="flex items-center gap-3">
              <button
                onClick={() => {
                  setDetailClass(null);
                  setSelectedStudent(null);
                  setStudentSearchQuery('');
                }}
                className="w-10 h-10 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors shadow-sm"
                aria-label="Kembali ke daftar kelas"
              >
                <ArrowLeft className="w-5 h-5 text-slate-600 dark:text-slate-300" />
              </button>
              <div>
                <h3 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <Archive className="w-5 h-5 text-emerald-500" />
                  Arsip Kelas: {detailClass.name}
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 font-semibold uppercase tracking-wider mt-0.5">
                  Tahun Ajaran: {getAcademicYearLabel(detailClass)} • {classStudents.length} Siswa
                </p>
              </div>
            </div>
            <div className="px-3.5 py-1.5 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-600 dark:text-amber-400 text-xs font-black uppercase tracking-wider flex items-center gap-1.5 shadow-sm shadow-amber-500/5">
              <Lock className="w-3.5 h-3.5" />
              Mode Kunci (Read-Only)
            </div>
          </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 min-h-[400px]">
              {/* Left Side: Students List */}
              <div className="border-b lg:border-b-0 lg:border-r border-slate-200/60 dark:border-slate-700/50 p-4 sm:p-5 flex flex-col max-h-[50vh] lg:max-h-[calc(100vh-280px)] bg-white dark:bg-slate-800">
              <div className="flex flex-col gap-2.5 mb-4">
                <h4 className="text-sm font-bold text-slate-700 dark:text-slate-300 tracking-wide uppercase">Daftar Siswa</h4>
                {classStudents.length > 0 && (
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                    <input
                      type="text"
                      value={studentSearchQuery}
                      onChange={(e) => setStudentSearchQuery(e.target.value)}
                      placeholder="Cari siswa..."
                      className="w-full pl-8 pr-3 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-medium text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 shadow-sm"
                    />
                  </div>
                )}
              </div>

              <div className="flex-1 overflow-y-auto custom-scrollbar pr-1 space-y-2">
                {loadingStudents ? (
                  <div className="py-20 text-center">
                    <Loader2 className="w-6 h-6 text-emerald-500 animate-spin mx-auto" />
                  </div>
                ) : classStudents.length === 0 ? (
                  <div className="py-20 text-center text-slate-400 italic text-sm">Tidak ada siswa terdaftar.</div>
                ) : displayedStudents.length === 0 ? (
                  <div className="py-20 text-center text-slate-400 italic text-xs">Siswa tidak ditemukan.</div>
                ) : (
                  displayedStudents.map((student) => (
                    <button
                      key={student.id}
                      onClick={() => setSelectedStudent(student)}
                      className={`w-full flex items-center gap-3 p-3 rounded-2xl border text-left transition-all duration-200 ${
                        selectedStudent?.id === student.id
                          ? 'bg-emerald-600 border-emerald-600 text-white shadow-lg shadow-emerald-500/20 scale-[1.02]'
                          : 'bg-white dark:bg-slate-900 border-slate-200/70 dark:border-slate-800 text-slate-800 dark:text-slate-300 hover:border-emerald-300 dark:hover:border-slate-700 hover:shadow-sm'
                      }`}
                    >
                      <img
                        src={getStudentAvatar(student.avatar_url, student.gender, student.id, student.name)}
                        alt="Avatar"
                        className="w-10 h-10 rounded-xl object-cover border-2 border-white dark:border-white/10"
                      />
                      <div className="overflow-hidden flex-1">
                        <p className="font-bold text-sm truncate">{student.name}</p>
                      </div>
                      <span className={`flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-xxs font-black ${
                        student.gender === 'Laki-laki'
                          ? selectedStudent?.id === student.id
                            ? 'bg-white/20 text-white'
                            : 'bg-blue-100 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400'
                          : selectedStudent?.id === student.id
                            ? 'bg-white/20 text-white'
                            : 'bg-pink-100 dark:bg-pink-500/20 text-pink-600 dark:text-pink-400'
                      }`}
                      aria-label={student.gender === 'Laki-laki' ? 'Laki-laki' : 'Perempuan'}
                      >
                        {student.gender === 'Laki-laki' ? 'L' : 'P'}
                      </span>
                    </button>
                  ))
                )}
              </div>
            </div>

              {/* Right Side: Student History Viewer */}
              <div className="lg:col-span-2 p-4 sm:p-6 flex flex-col justify-between overflow-y-auto max-h-[60vh] lg:max-h-[calc(100vh-280px)] custom-scrollbar bg-slate-50/30 dark:bg-slate-900/20">
              {selectedStudent ? (
                <div className="space-y-6 animate-fade-in">
                  {/* Student Title */}
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-4 border-b border-slate-100 dark:border-white/5">
                    <div className="flex items-center gap-3">
                      <img
                        src={getStudentAvatar(selectedStudent.avatar_url, selectedStudent.gender, selectedStudent.id, selectedStudent.name)}
                        alt="Avatar"
                        className="w-14 h-14 rounded-2xl object-cover border-2 border-slate-200 dark:border-white/20 shadow-md"
                      />
                      <div>
                        <h4 className="text-xl font-bold text-slate-800 dark:text-white flex items-center gap-2">
                          {selectedStudent.name}
                          <span className={`inline-flex items-center justify-center w-7 h-7 rounded-full text-xs font-black ${
                            selectedStudent.gender === 'Laki-laki'
                              ? 'bg-blue-100 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400'
                              : 'bg-pink-100 dark:bg-pink-500/20 text-pink-600 dark:text-pink-400'
                          }`}>
                            {selectedStudent.gender === 'Laki-laki' ? 'L' : 'P'}
                          </span>
                        </h4>
                        <p className="text-xs text-slate-500 dark:text-slate-400 font-semibold mt-0.5">
                          {detailClass.name.toLowerCase().startsWith('kelas') ? detailClass.name : `Kelas ${detailClass.name}`}
                        </p>
                      </div>
                    </div>
                    {/* Cetak Rapor Button */}
                    <a
                      href={`/cetak-rapot/${selectedStudent.id}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl font-bold text-sm shadow-md shadow-emerald-500/20 hover:shadow-lg transition-all"
                    >
                      <Printer className="w-4 h-4" />
                      Cetak Rapor Lama
                    </a>
                  </div>

                  {loadingStudentHistory ? (
                    <div className="py-20 text-center">
                      <Loader2 className="w-8 h-8 text-emerald-500 animate-spin mx-auto" />
                    </div>
                  ) : studentStats ? (
                    <div className="space-y-6">
                      {/* Stats Mini Grid */}
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                        <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-500/5 border border-emerald-200/50 dark:border-emerald-500/10 flex flex-col items-center justify-center text-center shadow-sm">
                          <Award className="w-5 h-5 text-emerald-500 mb-1" />
                          <span className="text-2xl font-black text-emerald-600 dark:text-emerald-400">{studentStats.avgScore}</span>
                          <span className="text-xxs text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider mt-0.5">Rata-rata Nilai</span>
                        </div>

                        <div className="p-4 rounded-2xl bg-blue-50 dark:bg-blue-500/5 border border-blue-200/50 dark:border-blue-500/10 flex flex-col items-center justify-center text-center shadow-sm">
                          <Calendar className="w-5 h-5 text-blue-500 mb-1" />
                          <span className="text-2xl font-black text-blue-600 dark:text-blue-400">{studentStats.attendanceRate}%</span>
                          <span className="text-xxs text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider mt-0.5">Kehadiran</span>
                        </div>

                        <div className="p-4 rounded-2xl bg-amber-50 dark:bg-amber-500/5 border border-amber-200/50 dark:border-amber-500/10 flex flex-col items-center justify-center text-center shadow-sm">
                          <Sparkles className="w-5 h-5 text-amber-500 mb-1" />
                          <span className="text-2xl font-black text-amber-600 dark:text-amber-400">{studentStats.totalQuizPoints}</span>
                          <span className="text-xxs text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider mt-0.5">Poin Keaktifan</span>
                        </div>

                        <div className="p-4 rounded-2xl bg-red-50 dark:bg-red-500/5 border border-red-200/50 dark:border-red-500/10 flex flex-col items-center justify-center text-center shadow-sm">
                          <ShieldAlert className="w-5 h-5 text-red-500 mb-1" />
                          <span className="text-2xl font-black text-red-600 dark:text-red-400">{studentStats.totalViolations}</span>
                          <span className="text-xxs text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider mt-0.5">Poin Pelanggaran</span>
                        </div>
                      </div>

                      {/* Detail Data Lists */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Academics Record */}
                        <div className="space-y-3">
                          <h5 className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider border-b border-slate-100 dark:border-white/5 pb-1 flex items-center gap-1.5">
                            <FileText className="w-4 h-4 text-emerald-500" />
                            Nilai Akademik
                          </h5>
                          {studentHistory?.academics.length === 0 ? (
                            <p className="text-xs italic text-slate-400 p-3 bg-slate-50 dark:bg-white/5 rounded-xl text-center">Tidak ada data nilai.</p>
                          ) : (
                            <div className="space-y-2 max-h-[250px] overflow-y-auto pr-1 scrollbar-hide">
                              {studentHistory?.academics.map((record) => (
                                <div key={record.id} className="p-3 bg-slate-50 dark:bg-white/5 rounded-xl border border-slate-100 dark:border-slate-800 flex justify-between items-center hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors shadow-sm">
                                  <div className="overflow-hidden">
                                    <p className="text-xs font-bold text-slate-800 dark:text-white truncate">{record.subject}</p>
                                    <p className="text-xxs text-slate-400 font-semibold truncate mt-0.5">{record.assessment_name || 'Asesmen'}</p>
                                  </div>
                                  <span className="px-2.5 py-1 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-xs font-black rounded-lg border border-emerald-500/20">
                                    {record.score}
                                  </span>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>

                        {/* Attendance Details */}
                        <div className="space-y-3">
                          <h5 className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider border-b border-slate-100 dark:border-white/5 pb-1 flex items-center gap-1.5">
                            <CheckCircle className="w-4 h-4 text-blue-500" />
                            Rincian Kehadiran
                          </h5>
                          <div className="p-4 bg-slate-50 dark:bg-white/5 rounded-2xl border border-slate-100 dark:border-slate-800 space-y-3.5 shadow-sm">
                            <div className="flex justify-between text-xs font-bold">
                              <span className="text-slate-600 dark:text-slate-400">Total Hari Absen</span>
                              <span className="text-slate-800 dark:text-white">{studentStats.totalAttendance} Hari</span>
                            </div>
                            <div className="grid grid-cols-2 gap-3.5">
                              <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-center">
                                <p className="text-lg font-black text-emerald-600 dark:text-emerald-400">{studentStats.present}</p>
                                <p className="text-xxs font-bold text-slate-500 dark:text-slate-400 uppercase mt-0.5">Hadir</p>
                              </div>
                              <div className="p-3 bg-sky-500/10 border border-sky-500/20 rounded-xl text-center">
                                <p className="text-lg font-black text-sky-600 dark:text-sky-400">{studentStats.sakit}</p>
                                <p className="text-xxs font-bold text-slate-500 dark:text-slate-400 uppercase mt-0.5">Sakit</p>
                              </div>
                              <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl text-center">
                                <p className="text-lg font-black text-amber-600 dark:text-amber-400">{studentStats.izin}</p>
                                <p className="text-xxs font-bold text-slate-500 dark:text-slate-400 uppercase mt-0.5">Izin</p>
                              </div>
                              <div className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl text-center">
                                <p className="text-lg font-black text-rose-600 dark:text-rose-400">{studentStats.alpha}</p>
                                <p className="text-xxs font-bold text-slate-500 dark:text-slate-400 uppercase mt-0.5">Alpha</p>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : null}
                </div>
              ) : (
                <Card className="h-full flex flex-col items-center justify-center text-center p-10 py-24 border-dashed border-slate-300/60 dark:border-slate-800/80">
                  <CardContent className="flex flex-col items-center">
                    <Smile className="w-12 h-12 text-slate-400 dark:text-slate-600 mb-3" />
                    <h4 className="text-base font-bold text-slate-700 dark:text-slate-300">Pilih Siswa</h4>
                    <p className="text-xs text-slate-500 dark:text-slate-500 max-w-xs mt-1">
                      Silakan pilih siswa dari daftar sebelah kiri untuk melihat rekam jejak nilai akademik dan riwayat kehadirannya secara mendetail.
                    </p>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
          </Card>
        </motion.div>
      ) : (
        /* Grid list of classes based on active tab */
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.25, ease: 'easeInOut' }}
          >
            {displayedClasses.length === 0 ? (
              <Card className="text-center py-16 sm:py-20 shadow-sm border-slate-200/60 dark:border-slate-700/50">
                <CardContent className="flex flex-col items-center">
                  <div className="w-20 h-20 sm:w-24 sm:h-24 mx-auto rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center mb-5 sm:mb-6 border border-slate-200/50 dark:border-slate-700/50 animate-[float_3s_ease-in-out_infinite]">
                    {activeTab === 'active' ? (
                      <BookOpen className="w-10 h-10 sm:w-12 sm:h-12 text-slate-400 dark:text-slate-500" />
                    ) : (
                      <FolderLock className="w-10 h-10 sm:w-12 sm:h-12 text-slate-400 dark:text-slate-500" />
                    )}
                  </div>
                  <h3 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white mb-2">
                    {searchQuery
                      ? 'Tidak Ditemukan'
                      : activeTab === 'active' ? 'Tidak Ada Kelas Aktif' : 'Brankas Kosong'}
                  </h3>
                  <p className="text-slate-500 dark:text-slate-400 max-w-md mx-auto text-xs sm:text-sm">
                    {searchQuery
                      ? `Tidak ada kelas yang cocok dengan "${searchQuery}".`
                      : activeTab === 'active'
                      ? 'Semua kelas Anda sudah diamankan di Brankas. Buat kelas baru di halaman Manajemen Siswa untuk memulai tahun ajaran baru.'
                      : 'Belum ada kelas yang diarsipkan. Kelas lama yang sudah selesai akan tersimpan aman di sini.'}
                  </p>
                  {!searchQuery && activeTab === 'active' && (
                    <Button
                      onClick={() => window.location.href = '/siswa'}
                      className="mt-5 sm:mt-6"
                    >
                      <Users className="w-4 h-4 mr-2" />
                      Buat Kelas Baru
                    </Button>
                  )}
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
                {displayedClasses.map((cls, index) => (
                  <motion.div
                    key={cls.id}
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3, delay: index * 0.05, ease: 'easeOut' }}
                    className="h-full"
                  >
                    <CardInteractive className="h-full flex flex-col justify-between group">
                      <CardContent className="p-4 sm:p-5 flex-1 flex flex-col">
                        <div className="flex justify-between items-start mb-4">
                          <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center group-hover:bg-emerald-50 dark:group-hover:bg-emerald-500/10 transition-colors duration-300">
                            <BookOpen className="w-5 h-5 text-slate-600 dark:text-slate-400 group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors" />
                          </div>
                          {cls.is_archived ? (
                            <span className="px-2.5 py-1 bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-400 text-xxs font-bold rounded-lg border border-amber-200/60 dark:border-amber-500/20 uppercase tracking-wider flex items-center gap-1">
                              <Lock className="w-3 h-3" />
                              Terarsip
                            </span>
                          ) : (
                            <span className="px-2.5 py-1 bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 text-xxs font-bold rounded-lg border border-emerald-200/60 dark:border-emerald-500/20 uppercase tracking-wider flex items-center gap-1">
                              <Unlock className="w-3 h-3" />
                              Aktif
                            </span>
                          )}
                        </div>

                        <h3 className="text-lg font-semibold text-slate-900 dark:text-white group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors flex flex-wrap items-center gap-2 mb-2">
                          {cls.name.toLowerCase().startsWith('kelas') ? cls.name : `Kelas ${cls.name}`}
                          {cls.grade_level && (
                            <span className="px-1.5 py-0.5 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-[10px] font-semibold rounded border border-slate-200 dark:border-slate-700">
                              Tingkat {cls.grade_level}
                            </span>
                          )}
                        </h3>

                        <div className="flex flex-col gap-1.5 mt-auto text-sm text-slate-500 dark:text-slate-400">
                          <div className="flex items-center gap-2">
                            <Calendar className="w-4 h-4 text-slate-400" />
                            <span>TA: {getAcademicYearLabel(cls)}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Users className="w-4 h-4 text-slate-400" />
                            <span>{studentCountMap[cls.id] || 0} siswa</span>
                          </div>
                        </div>
                      </CardContent>

                      <div className="px-4 pb-4 sm:px-5 sm:pb-5 pt-0 mt-2 flex flex-col gap-2">
                        {cls.is_archived ? (
                          <div className="flex items-center gap-2">
                            <Button
                              onClick={() => {
                                setDetailClass(cls);
                                setStudentSearchQuery('');
                              }}
                              variant="outline"
                              size="sm"
                              className="flex-1 bg-white dark:bg-slate-800"
                            >
                              <FolderLock className="w-4 h-4 mr-1.5" />
                              Buka Arsip
                            </Button>
                            <Button
                              onClick={() => setConfirmRestoreClass(cls)}
                              variant="outline"
                              size="sm"
                              className="px-3 bg-white dark:bg-slate-800"
                              title="Pulihkan Kelas ke Dashboard"
                              aria-label="Pulihkan kelas ke dashboard"
                            >
                              <RotateCcw className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                            </Button>
                          </div>
                        ) : (
                          <Button
                            onClick={() => setConfirmArchiveClass(cls)}
                            variant="secondary"
                            className="w-full"
                          >
                            <Archive className="w-4 h-4 mr-1.5" />
                            Simpan di Brankas
                          </Button>
                        )}
                      </div>
                    </CardInteractive>
                  </motion.div>
                ))}
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      )}

      {/* Modal: Confirm Archive Class */}
      <Modal
        isOpen={!!confirmArchiveClass}
        onClose={() => {
          setConfirmArchiveClass(null);
          setConfirmText('');
        }}
        title="Simpan Kelas di Brankas?"
      >
        <div className="space-y-4">
          <div className="flex items-start gap-3 p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-800 dark:text-amber-300">
            <AlertTriangle className="w-6 h-6 text-amber-500 flex-shrink-0 mt-0.5 animate-pulse" />
            <div>
              <p className="font-semibold text-sm">Tindakan Penting!</p>
              <p className="text-xs leading-relaxed mt-1 opacity-90">
                Menyimpan kelas <strong>{confirmArchiveClass?.name}</strong> di Brankas akan menguncinya menjadi data historis. Kelas dan siswanya tidak akan lagi muncul di dashboard aktif, absensi, atau input nilai cepat Anda, memastikan dashboard Anda kembali bersih dan siap digunakan untuk tahun ajaran berikutnya.
              </p>
            </div>
          </div>

          <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
            Data ini <strong>TIDAK AKAN DIHAPUS</strong>. Anda tetap dapat meninjau rekam jejak nilai akademik, pelanggaran, riwayat absensi, serta mencetak kembali rapot siswa tersebut kapan saja langsung dari Brankas Kelas.
          </p>

          <div className="space-y-2">
            <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wider">
              Ketik &quot;ARSIP&quot; untuk mengonfirmasi:
            </label>
            <input
              type="text"
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              placeholder="Ketik ARSIP di sini"
              className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-bold text-center tracking-widest text-slate-900 dark:text-white placeholder:text-slate-400 placeholder:tracking-normal focus:outline-none focus:ring-2 focus:ring-emerald-500 shadow-inner"
            />
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <Button
              variant="ghost"
              onClick={() => {
                setConfirmArchiveClass(null);
                setConfirmText('');
              }}
              className="text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 font-semibold"
            >
              Batal
            </Button>
            <Button
              onClick={handleArchive}
              disabled={archiveMutation.isPending || confirmText !== 'ARSIP'}
              className="bg-emerald-500 hover:bg-emerald-600 text-white font-bold shadow-lg shadow-emerald-500/20"
            >
              {archiveMutation.isPending ? 'Mengarsipkan...' : 'Ya, Masukkan Brankas'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Modal: Confirm Restore Class */}
      <Modal
        isOpen={!!confirmRestoreClass}
        onClose={() => setConfirmRestoreClass(null)}
        title="Pulihkan Kelas dari Brankas?"
      >
        <div className="space-y-4">
          <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
            Apakah Anda yakin ingin memulihkan kelas <strong>{confirmRestoreClass?.name}</strong> dari Brankas? Kelas ini beserta semua data siswanya akan dikembalikan ke Dashboard Aktif Anda dan dapat diedit kembali seperti biasa.
          </p>

          <div className="flex justify-end gap-3 pt-2">
            <Button
              variant="ghost"
              onClick={() => setConfirmRestoreClass(null)}
              className="text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 font-semibold"
            >
              Batal
            </Button>
            <Button
              onClick={handleRestore}
              disabled={restoreMutation.isPending}
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold shadow-lg shadow-emerald-500/20"
            >
              {restoreMutation.isPending ? 'Memulihkan...' : 'Ya, Pulihkan Kelas'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default BrankasPage;
