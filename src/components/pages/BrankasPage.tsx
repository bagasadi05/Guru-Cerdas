import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../../services/supabase';
import { useAuth } from '../../hooks/useAuth';
import { useToast } from '../../hooks/useToast';
import { Button } from '../ui/Button';
import { Modal } from '../ui/Modal';
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
} from 'lucide-react';
import { triggerSubtleConfetti } from '../../utils/confetti';
import { useSemester } from '../../contexts/SemesterContext';

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
  const { user } = useAuth();
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
    queryKey: ['classes', user?.id, 'all_classes_brankas'],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from('classes')
        .select('*')
        .is('deleted_at', null)
        .eq('user_id', user.id)
        .order('name');

      if (error) throw error;
      return data as unknown as ClassItem[];
    },
    enabled: !!user,
  });

  // Filter classes by active/archived tabs
  const activeClasses = useMemo(() => allClasses.filter(c => !c.is_archived), [allClasses]);
  const archivedClasses = useMemo(() => allClasses.filter(c => c.is_archived), [allClasses]);

  const displayedClasses = useMemo(() => {
    const list = activeTab === 'active' ? activeClasses : archivedClasses;
    if (!searchQuery) return list;
    return list.filter(c => c.name.toLowerCase().includes(searchQuery.toLowerCase()));
  }, [activeTab, activeClasses, archivedClasses, searchQuery]);

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
    return classStudents.filter(s => s.name.toLowerCase().includes(studentSearchQuery.toLowerCase()));
  }, [classStudents, studentSearchQuery]);

  // 3. Fetch academic, attendance, violations, and quiz points of the selected historical student
  const { data: studentHistory = null, isLoading: loadingStudentHistory } = useQuery({
    queryKey: ['students', 'brankas_student_history', selectedStudent?.id],
    queryFn: async () => {
      if (!selectedStudent) return null;

      const [academicRes, attendanceRes, violationsRes, quizPointsRes] = await Promise.all([
        supabase
          .from('academic_records')
          .select('id, subject, score, assessment_name, notes, created_at')
          .eq('student_id', selectedStudent.id)
          .is('deleted_at', null)
          .order('created_at', { ascending: false }),
        supabase
          .from('attendance')
          .select('id, date, status, notes')
          .eq('student_id', selectedStudent.id)
          .is('deleted_at', null),
        supabase
          .from('violations')
          .select('id, date, description, points, type')
          .eq('student_id', selectedStudent.id)
          .is('deleted_at', null),
        supabase
          .from('quiz_points')
          .select('id, quiz_name, points, category, created_at')
          .eq('student_id', selectedStudent.id)
          .is('deleted_at', null),
      ]);

      return {
        academics: academicRes.data || [],
        attendance: attendanceRes.data || [],
        violations: violationsRes.data || [],
        quizPoints: quizPointsRes.data || [],
      };
    },
    enabled: !!selectedStudent,
  });

  // Mutation: Archive class (is_archived = true)
  const archiveMutation = useMutation({
    mutationFn: async (classId: string) => {
      const { error } = await supabase
        .from('classes')
        .update({ is_archived: true } as any)
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
        .update({ is_archived: false } as any)
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
      ? Math.round(academics.reduce((sum: number, r: any) => sum + r.score, 0) / academics.length)
      : 0;

    const hadirCount = attendance.filter((a: any) => a.status === 'Hadir').length;
    const attendanceRate = attendance.length > 0
      ? Math.round((hadirCount / attendance.length) * 100)
      : 100;

    const totalViolations = violations.reduce((sum: number, v: any) => sum + (v.points || 0), 0);
    const totalQuizPoints = quizPoints.reduce((sum: number, q: any) => sum + (q.points || 0), 0);

    return {
      avgScore,
      attendanceRate,
      totalViolations,
      totalQuizPoints,
      present: hadirCount,
      totalAttendance: attendance.length,
      sakit: attendance.filter((a: any) => a.status === 'Sakit').length,
      izin: attendance.filter((a: any) => a.status === 'Izin').length,
      alpha: attendance.filter((a: any) => a.status === 'Alpha').length,
    };
  }, [studentHistory]);

  if (loadingClasses) {
    return (
      <div className="h-full flex items-center justify-center bg-slate-50 dark:bg-slate-950/20">
        <div className="text-center">
          <Loader2 className="w-10 h-10 text-indigo-500 animate-spin mx-auto" />
          <p className="mt-4 text-slate-500 dark:text-slate-400 font-medium">Memuat Brankas Kelas...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full min-h-full pb-20 lg:pb-6 font-sans">
      {/* Header Panel */}
      <header className="mb-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-500/20">
              <FolderLock className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white font-serif">Brankas Kelas</h1>
              <p className="text-slate-500 dark:text-slate-400 text-sm mt-0.5">
                Simpan data kelas lama di Brankas untuk mereset dashboard Anda secara aman.
              </p>
            </div>
          </div>
        </div>
      </header>

      {/* Tabs and Search Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div className="flex p-1 bg-slate-100 dark:bg-white/5 rounded-xl border border-slate-200/50 dark:border-white/5 w-fit">
          <button
            onClick={() => {
              setActiveTab('active');
              setSearchQuery('');
            }}
            className={`flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-lg transition-all ${
              activeTab === 'active'
                ? 'bg-white dark:bg-slate-800 text-indigo-600 dark:text-white shadow-md shadow-slate-200/40 dark:shadow-none'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Unlock className="w-3.5 h-3.5" />
            Kelas Aktif ({activeClasses.length})
          </button>
          <button
            onClick={() => {
              setActiveTab('archived');
              setSearchQuery('');
            }}
            className={`flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-lg transition-all ${
              activeTab === 'archived'
                ? 'bg-white dark:bg-slate-800 text-indigo-600 dark:text-white shadow-md shadow-slate-200/40 dark:shadow-none'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Lock className="w-3.5 h-3.5" />
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
            className="w-full pl-9 pr-4 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-medium text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-sm"
          />
        </div>
      </div>

      {/* Detail Mode (Read-only Historical Viewer) */}
      {detailClass ? (
        <div className="bg-white/95 dark:bg-slate-900/90 border border-slate-200 dark:border-white/10 rounded-3xl shadow-xl overflow-hidden animate-fade-in-up">
          {/* Detail Header */}
          <div className="p-6 bg-gradient-to-r from-indigo-500/10 to-purple-500/10 border-b border-slate-200/60 dark:border-white/5 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div className="flex items-center gap-3">
              <button
                onClick={() => {
                  setDetailClass(null);
                  setSelectedStudent(null);
                  setStudentSearchQuery('');
                }}
                className="w-10 h-10 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors shadow-sm"
              >
                <ArrowLeft className="w-5 h-5 text-slate-600 dark:text-slate-300" />
              </button>
              <div>
                <h3 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <Archive className="w-5 h-5 text-indigo-500" />
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

          <div className="grid grid-cols-1 lg:grid-cols-3 min-h-[500px]">
            {/* Left Side: Students List */}
            <div className="border-r border-slate-200 dark:border-white/5 p-5 flex flex-col max-h-[600px] bg-slate-50/50 dark:bg-slate-950/20">
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
                      className="w-full pl-8 pr-3 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-medium text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-sm"
                    />
                  </div>
                )}
              </div>

              <div className="flex-1 overflow-y-auto custom-scrollbar pr-1 space-y-2">
                {loadingStudents ? (
                  <div className="py-20 text-center">
                    <Loader2 className="w-6 h-6 text-indigo-500 animate-spin mx-auto" />
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
                      className={`w-full flex items-center gap-3 p-3 rounded-2xl border text-left transition-all ${
                        selectedStudent?.id === student.id
                          ? 'bg-indigo-600 border-indigo-600 text-white shadow-lg shadow-indigo-600/20'
                          : 'bg-white dark:bg-slate-900 border-slate-200/70 dark:border-slate-800 text-slate-800 dark:text-slate-300 hover:border-indigo-300 dark:hover:border-slate-700 hover:shadow-sm'
                      }`}
                    >
                      <img
                        src={student.avatar_url || `https://api.dicebear.com/7.x/adventurer/svg?seed=${student.name}`}
                        alt="Avatar"
                        className="w-10 h-10 rounded-xl object-cover border-2 border-white dark:border-white/10"
                      />
                      <div className="overflow-hidden flex-1">
                        <p className="font-bold text-sm truncate">{student.name}</p>
                        <p className={`text-[10px] ${selectedStudent?.id === student.id ? 'text-indigo-200' : 'text-slate-400 dark:text-slate-500'} font-semibold truncate mt-0.5`}>
                          Gender: {student.gender}
                        </p>
                      </div>
                    </button>
                  ))
                )}
              </div>
            </div>

            {/* Right Side: Student History Viewer */}
            <div className="lg:col-span-2 p-6 flex flex-col justify-between overflow-y-auto max-h-[600px] custom-scrollbar">
              {selectedStudent ? (
                <div className="space-y-6 animate-fade-in">
                  {/* Student Title */}
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-4 border-b border-slate-100 dark:border-white/5">
                    <div className="flex items-center gap-3">
                      <img
                        src={selectedStudent.avatar_url || `https://api.dicebear.com/7.x/adventurer/svg?seed=${selectedStudent.name}`}
                        alt="Avatar"
                        className="w-14 h-14 rounded-2xl object-cover border-2 border-slate-200 dark:border-white/20 shadow-md"
                      />
                      <div>
                        <h4 className="text-xl font-bold text-slate-800 dark:text-white">{selectedStudent.name}</h4>
                        <p className="text-xs text-slate-500 dark:text-slate-400 font-semibold mt-0.5">
                          Gender: {selectedStudent.gender}
                        </p>
                      </div>
                    </div>
                    {/* Cetak Rapor Button */}
                    <a
                      href={`/cetak-rapot/${selectedStudent.id}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold text-sm shadow-md shadow-indigo-500/20 hover:shadow-lg transition-all"
                    >
                      <Printer className="w-4 h-4" />
                      Cetak Rapor Lama
                    </a>
                  </div>

                  {loadingStudentHistory ? (
                    <div className="py-20 text-center">
                      <Loader2 className="w-8 h-8 text-indigo-500 animate-spin mx-auto" />
                    </div>
                  ) : studentStats ? (
                    <div className="space-y-6">
                      {/* Stats Mini Grid */}
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                        <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-500/5 border border-emerald-200/50 dark:border-emerald-500/10 flex flex-col items-center justify-center text-center shadow-sm">
                          <Award className="w-5 h-5 text-emerald-500 mb-1" />
                          <span className="text-2xl font-black text-emerald-600 dark:text-emerald-400">{studentStats.avgScore}</span>
                          <span className="text-[10px] text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider mt-0.5">Rata-rata Nilai</span>
                        </div>

                        <div className="p-4 rounded-2xl bg-blue-50 dark:bg-blue-500/5 border border-blue-200/50 dark:border-blue-500/10 flex flex-col items-center justify-center text-center shadow-sm">
                          <Calendar className="w-5 h-5 text-blue-500 mb-1" />
                          <span className="text-2xl font-black text-blue-600 dark:text-blue-400">{studentStats.attendanceRate}%</span>
                          <span className="text-[10px] text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider mt-0.5">Kehadiran</span>
                        </div>

                        <div className="p-4 rounded-2xl bg-amber-50 dark:bg-amber-500/5 border border-amber-200/50 dark:border-amber-500/10 flex flex-col items-center justify-center text-center shadow-sm">
                          <Sparkles className="w-5 h-5 text-amber-500 mb-1" />
                          <span className="text-2xl font-black text-amber-600 dark:text-amber-400">{studentStats.totalQuizPoints}</span>
                          <span className="text-[10px] text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider mt-0.5">Poin Keaktifan</span>
                        </div>

                        <div className="p-4 rounded-2xl bg-red-50 dark:bg-red-500/5 border border-red-200/50 dark:border-red-500/10 flex flex-col items-center justify-center text-center shadow-sm">
                          <ShieldAlert className="w-5 h-5 text-red-500 mb-1" />
                          <span className="text-2xl font-black text-red-600 dark:text-red-400">{studentStats.totalViolations}</span>
                          <span className="text-[10px] text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider mt-0.5">Poin Pelanggaran</span>
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
                              {studentHistory?.academics.map((record: any) => (
                                <div key={record.id} className="p-3 bg-slate-50 dark:bg-white/5 rounded-xl border border-slate-100 dark:border-slate-800 flex justify-between items-center hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors shadow-sm">
                                  <div className="overflow-hidden">
                                    <p className="text-xs font-bold text-slate-800 dark:text-white truncate">{record.subject}</p>
                                    <p className="text-[9px] text-slate-400 font-semibold truncate mt-0.5">{record.assessment_name || 'Asesmen'}</p>
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
                                <p className="text-[9px] font-bold text-slate-500 dark:text-slate-400 uppercase mt-0.5">Hadir</p>
                              </div>
                              <div className="p-3 bg-sky-500/10 border border-sky-500/20 rounded-xl text-center">
                                <p className="text-lg font-black text-sky-600 dark:text-sky-400">{studentStats.sakit}</p>
                                <p className="text-[9px] font-bold text-slate-500 dark:text-slate-400 uppercase mt-0.5">Sakit</p>
                              </div>
                              <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl text-center">
                                <p className="text-lg font-black text-amber-600 dark:text-amber-400">{studentStats.izin}</p>
                                <p className="text-[9px] font-bold text-slate-500 dark:text-slate-400 uppercase mt-0.5">Izin</p>
                              </div>
                              <div className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl text-center">
                                <p className="text-lg font-black text-rose-600 dark:text-rose-400">{studentStats.alpha}</p>
                                <p className="text-[9px] font-bold text-slate-500 dark:text-slate-400 uppercase mt-0.5">Alpha</p>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : null}
                </div>
              ) : (
                <div className="h-full flex flex-col items-center justify-center text-center p-10 py-24 bg-slate-50/50 dark:bg-slate-950/20 rounded-2xl border border-dashed border-slate-300/60 dark:border-slate-800/80">
                  <Smile className="w-12 h-12 text-slate-400 dark:text-slate-600 mb-3" />
                  <h4 className="text-base font-bold text-slate-700 dark:text-slate-300">Pilih Siswa</h4>
                  <p className="text-xs text-slate-500 dark:text-slate-500 max-w-xs mt-1">
                    Silakan pilih siswa dari daftar sebelah kiri untuk melihat rekam jejak nilai akademik dan riwayat kehadirannya secara mendetail.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      ) : (
        /* Grid list of classes based on active tab */
        displayedClasses.length === 0 ? (
          <div className="text-center py-20 bg-white/60 dark:bg-slate-900/30 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm animate-fade-in">
            <div className="w-24 h-24 mx-auto rounded-3xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center mb-6 border border-slate-200/50 dark:border-slate-700/50">
              <Archive className="w-12 h-12 text-slate-400 dark:text-slate-500" />
            </div>
            <h3 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">
              {activeTab === 'active' ? 'Tidak Ada Kelas Aktif' : 'Brankas Kosong'}
            </h3>
            <p className="text-slate-500 dark:text-slate-400 max-w-md mx-auto text-sm">
              {searchQuery
                ? 'Tidak ada kelas yang cocok dengan kata kunci Anda.'
                : activeTab === 'active'
                ? 'Anda belum membuat kelas aktif apa pun. Silakan buat kelas baru di halaman Manajemen Siswa.'
                : 'Belum ada kelas yang diarsipkan. Kelas lama Anda yang diarsipkan akan tersimpan dengan aman di sini.'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-fade-in-up">
            {displayedClasses.map((cls) => (
              <div
                key={cls.id}
                className="bg-white/95 dark:bg-slate-900/90 border border-slate-200 dark:border-white/10 rounded-3xl p-5 shadow-lg relative overflow-hidden group hover:shadow-xl hover:border-indigo-300 dark:hover:border-indigo-500/30 hover:-translate-y-1 transition-all duration-300 flex flex-col justify-between min-h-[180px]"
              >
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-indigo-500 to-purple-600 opacity-50"></div>
                <div>
                  <div className="flex justify-between items-start mb-4">
                    <div className="w-10 h-10 rounded-xl bg-indigo-500/10 dark:bg-indigo-500/20 flex items-center justify-center">
                      <BookOpen className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                    </div>
                    {cls.is_archived ? (
                      <span className="px-2.5 py-1 bg-amber-500/10 text-amber-600 dark:text-amber-400 text-[10px] font-black rounded-lg uppercase tracking-wider flex items-center gap-1">
                        <Lock className="w-3 h-3" />
                        Terarsip
                      </span>
                    ) : (
                      <span className="px-2.5 py-1 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-[10px] font-black rounded-lg uppercase tracking-wider flex items-center gap-1">
                        <Unlock className="w-3 h-3" />
                        Aktif
                      </span>
                    )}
                  </div>

                  <h3 className="text-xl font-bold text-slate-800 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors flex items-center gap-2">
                    Kelas {cls.name}
                    {cls.grade_level && (
                      <span className="px-2 py-0.5 bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 text-[10px] font-bold rounded-lg border border-indigo-200/50 dark:border-indigo-500/20">
                        Tingkat {cls.grade_level}
                      </span>
                    )}
                  </h3>
                  <p className="text-xs text-slate-400 dark:text-slate-500 font-semibold uppercase tracking-wider mt-1.5 flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                    Tahun Ajaran: {getAcademicYearLabel(cls)}
                  </p>
                </div>

                <div className="mt-5 pt-4 border-t border-slate-100 dark:border-white/5 flex items-center justify-between gap-3">
                  {cls.is_archived ? (
                    <>
                      <Button
                        onClick={() => {
                          setDetailClass(cls);
                          setStudentSearchQuery('');
                        }}
                        variant="outline"
                        size="sm"
                        className="flex-1 bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100 dark:bg-slate-800/40 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800 shadow-sm"
                      >
                        <FolderLock className="w-4 h-4 mr-1.5" />
                        Buka Arsip
                      </Button>
                      <Button
                        onClick={() => setConfirmRestoreClass(cls)}
                        variant="outline"
                        size="sm"
                        className="bg-emerald-50 border-emerald-200 text-emerald-600 hover:bg-emerald-100 dark:bg-emerald-500/5 dark:border-emerald-500/10 dark:text-emerald-400 dark:hover:bg-emerald-500/10"
                        title="Pulihkan Kelas ke Dashboard"
                      >
                        <Unlock className="w-4 h-4" />
                      </Button>
                    </>
                  ) : (
                    <Button
                      onClick={() => setConfirmArchiveClass(cls)}
                      className="w-full bg-gradient-to-r from-indigo-500 to-purple-600 text-white font-bold shadow-md shadow-indigo-500/20 hover:shadow-lg transition-all"
                    >
                      <Archive className="w-4 h-4 mr-1.5" />
                      Simpan di Brankas
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )
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
            Data ini **TIDAK AKAN DIHAPUS**. Anda tetap dapat meninjau rekam jejak nilai akademik, pelanggaran, riwayat absensi, serta mencetak kembali rapot siswa tersebut kapan saja langsung dari Brankas Kelas.
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
              className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-bold text-center tracking-widest text-slate-900 dark:text-white placeholder:text-slate-400 placeholder:tracking-normal focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-inner"
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
              className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold shadow-lg shadow-indigo-500/20"
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
