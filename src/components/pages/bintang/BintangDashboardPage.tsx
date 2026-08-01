import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { MotionDiv, AnimatePresence } from '../../ui/MotionComponents';import { Star, ClipboardCheck, BarChart3, AlertTriangle,
    Sparkles, Zap, Send, FileText, CheckCircle, PlusCircle, Info, Printer,
    ChevronDown, Search, TrendingUp, Eye, Users, Gift, FileSpreadsheet
} from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../../../hooks/useAuth';
import { supabase } from '../../../services/supabase';
import { bintangService, calculateAspectPoints, BINTANG_THRESHOLDS, type AspectPointsSummary, type BintangGrade } from '../../../services/bintangService';
import { Button } from '../../ui/Button';
import { Input } from '../../ui/Input';
import { Card } from '../../ui/Card';
import { CustomDropdown } from '../../ui/CustomDropdown';
import { Modal } from '../../ui/Modal';
import { useConfirmation } from '../../ui/ConfirmationDialog';
import { useToast } from '../../../hooks/useToast';
import { BintangKeaktifanModal } from './BintangKeaktifanModal';
import { gradeColors, aspectMeta } from './bintangConstants';
import { AspectSectionEditor } from './AspectSectionEditor';
import { useBintangEvaluation } from './hooks/useBintangEvaluation';
import BintangTrendChart from './BintangTrendChart';



// ─── Main Component ──────────────────────────────────────────────────────────

const BintangDashboardPage: React.FC = () => {
    const { user, isAdmin, userRole } = useAuth();
    const toast = useToast();
    const { confirm: confirmPublish, Dialog: PublishConfirmDialog } = useConfirmation();

    // ── Access control ───────────────────────────────────────────────────────
    const { data: teacherAssignments = [] } = useQuery({
        queryKey: ['teacher_assignments', user?.id],
        queryFn: async () => {
            if (!user) return [];
            const { data } = await supabase
                .from('teacher_class_assignments')
                .select('*')
                .eq('teacher_user_id', user.id);
            return data || [];
        },
        enabled: !!user,
    });

    const isHomeroomTeacher = useMemo(() => {
        return teacherAssignments.some((a: any) => a.assignment_role === 'homeroom');
    }, [teacherAssignments]);

    const isWalas = isAdmin || isHomeroomTeacher || userRole === 'waka_kesiswaan' || userRole === 'kepala_madrasah';

    // ── Shared filters ───────────────────────────────────────────────────────
    const [classes, setClasses] = useState<Array<{ id: string; name: string }>>([]);
    const [selectedClass, setSelectedClass] = useState('');
    const currentMonth = new Date().toISOString().slice(0, 7);
    const [selectedMonth, setSelectedMonth] = useState(currentMonth);

    // ── Data state ───────────────────────────────────────────────────────────
    const [students, setStudents] = useState<Array<{ id: string; name: string }>>([]);
    const [violations, setViolations] = useState<Array<{
        id: string; student_id: string; description: string; points: number;
        date: string; severity: string | null; students: { name: string } | null;
    }>>([]);
    const [evaluations, setEvaluations] = useState<Array<{
        id: string; student_id: string; month: string;
        adab_score: string | null; kedisiplinan_score: string | null; kerapian_score: string | null;
        adab_notes: string | null; kedisiplinan_notes: string | null; kerapian_notes: string | null;
        catatan_wali: string | null; is_published: boolean; evaluator_id: string;
    }>>([]);
    const [quizPoints, setQuizPoints] = useState<Array<{
        id: string; student_id: string; quiz_name: string | null; subject: string | null; points: number; category: string | null; quiz_date: string;
    }>>([]);
    const [mentoringLogs, setMentoringLogs] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(false);

    // ── UI state ─────────────────────────────────────────────────────────────
    const [showMentoringHistory, setShowMentoringHistory] = useState(false);
    const [mentoringSearchQuery, setMentoringSearchQuery] = useState('');

    // Collapsible sections
    const [showTrendChart, setShowTrendChart] = useState(false);
    const [showKeaktifanHistory, setShowKeaktifanHistory] = useState(false);
    const [keaktifanFilter, setKeaktifanFilter] = useState<'semua' | 'akademik' | 'keaktifan'>('semua');

    // ── Evaluation state & handlers (shared hook) ──────────────────────────
    const evalHook = useBintangEvaluation({
        toast,
        confirmPublish,
        fetchData: async () => { await fetchAllData(); },
        selectedMonth,
        user,
        students,
        evaluations,
        selectedClass,
        getStudentQuizPoints: (studentId: string) => studentQuizMap?.get(studentId)?.totalPoints || 0,
    });

    // ── Keaktifan modal ──────────────────────────────────────────────────────
    const [isKeaktifanModalOpen, setIsKeaktifanModalOpen] = useState(false);

    // ── Mentoring modal ──────────────────────────────────────────────────────
    const [isMentoringModalOpen, setIsMentoringModalOpen] = useState(false);
    const [mentoringClass, setMentoringClass] = useState('');
    const [mentoringTargetType, setMentoringTargetType] = useState<'all' | 'specific'>('all');
    const [mentoringStudentsInClass, setMentoringStudentsInClass] = useState<Array<{ id: string; name: string }>>([]);
    const [mentoringSelectedStudents, setMentoringSelectedStudents] = useState<string[]>([]);
    const [mentoringRole, setMentoringRole] = useState('WALAS');
    const [mentoringDate, setMentoringDate] = useState(new Date().toISOString().split('T')[0]);
    const [mentoringNotes, setMentoringNotes] = useState('');
    const [isMentoringSubmitting, setIsMentoringSubmitting] = useState(false);

    // ── Observation modal (simplified, inline) ───────────────────────────────
    const [isObservationModalOpen, setIsObservationModalOpen] = useState(false);
    const [obsStudentId, setObsStudentId] = useState('');
    const [obsAspect, setObsAspect] = useState('ADAB');
    const [obsIsPositive, setObsIsPositive] = useState(true);
    const [obsNotes, setObsNotes] = useState('');
    const [isObsSubmitting, setIsObsSubmitting] = useState(false);

    // ── Data fetching ────────────────────────────────────────────────────────

    useEffect(() => {
        const fetchClasses = async () => {
            const { data } = await supabase.from('classes').select('id, name').is('deleted_at', null).eq('is_archived', false);
            if (data) setClasses(data);
        };
        fetchClasses();
    }, []);

    const fetchAllData = useCallback(async () => {
        setIsLoading(true);
        try {
            const [studentsRes, evalsData, viosData, logsData] = await Promise.all([
                supabase
                    .from('students')
                    .select('id, name')
                    .eq('class_id', selectedClass)
                    .is('deleted_at', null)
                    .order('name'),
                bintangService.getMonthlyEvaluations(selectedClass, selectedMonth),
                bintangService.getViolationsForClass(selectedClass, selectedMonth),
                bintangService.getMentoringLogs(selectedClass),
            ]);

            setStudents(studentsRes.data || []);
            setEvaluations(evalsData || []);
            setViolations(viosData || []);
            setMentoringLogs(logsData || []);

            // Fetch quiz points (poin keaktifan) for offset calculation
            const studentIds = (studentsRes.data || []).map(s => s.id);
            if (studentIds.length > 0) {
                const monthStart = `${selectedMonth}-01`;
                const { data: quizData } = await supabase
                    .from('quiz_points')
                    .select('id, student_id, quiz_name, subject, points, category, quiz_date')
                    .in('student_id', studentIds)
                    .is('deleted_at', null)
                    .gte('quiz_date', monthStart);
                setQuizPoints(quizData || []);
            } else {
                setQuizPoints([]);
            }
        } catch (error) {
            console.error('Failed to fetch BINTANG data', error);
        } finally {
            setIsLoading(false);
        }
    }, [selectedClass, selectedMonth]);

    useEffect(() => {
        if (selectedClass && selectedMonth) {
            fetchAllData();
        } else {
            setStudents([]);
            setViolations([]);
            setEvaluations([]);
            setMentoringLogs([]);
        }
    }, [selectedClass, selectedMonth, fetchAllData]);

    // Fetch students for mentoring modal class selection
    useEffect(() => {
        if (mentoringClass) {
            const fetchStudents = async () => {
                const { data } = await supabase
                    .from('students')
                    .select('id, name')
                    .eq('class_id', mentoringClass)
                    .is('deleted_at', null)
                    .order('name');
                setMentoringStudentsInClass(data || []);
                setMentoringSelectedStudents([]);
            };
            fetchStudents();
        } else {
            setMentoringStudentsInClass([]);
            setMentoringSelectedStudents([]);
        }
    }, [mentoringClass]);



    // ── Computed data ────────────────────────────────────────────────────────

    const classSummary = useMemo(() => {
        const totalQuiz = quizPoints.reduce((sum, q) => sum + (q.points || 0), 0);
        return calculateAspectPoints(violations.map(v => ({ description: v.description, points: v.points })), totalQuiz);
    }, [violations, quizPoints]);

    const studentQuizMap = useMemo(() => {
        const map = new Map<string, { totalPoints: number; count: number }>();
        for (const q of quizPoints) {
            const current = map.get(q.student_id) || { totalPoints: 0, count: 0 };
            map.set(q.student_id, {
                totalPoints: current.totalPoints + (q.points || 0),
                count: current.count + 1
            });
        }
        return map;
    }, [quizPoints]);

    const studentAspectMap = useMemo(() => {
        const map = new Map<string, AspectPointsSummary>();
        const grouped = new Map<string, Array<{ description: string; points: number }>>();
        for (const v of violations) {
            if (!grouped.has(v.student_id)) grouped.set(v.student_id, []);
            grouped.get(v.student_id)!.push({ description: v.description, points: v.points });
        }
        for (const student of students) {
            const vList = grouped.get(student.id) || [];
            const qData = studentQuizMap.get(student.id);
            map.set(student.id, calculateAspectPoints(vList, qData?.totalPoints || 0));
        }
        return map;
    }, [violations, students, studentQuizMap]);

    const getAspectSummary = (studentId: string): AspectPointsSummary => {
        return studentAspectMap.get(studentId) ?? {
            ADAB: { points: 0, count: 0, grade: 'A' as BintangGrade },
            KEDISIPLINAN: { points: 0, count: 0, grade: 'A' as BintangGrade },
            KERAPIAN: { points: 0, count: 0, grade: 'A' as BintangGrade },
        };
    };

    const filteredMentoringLogs = useMemo(() => {
        if (!mentoringSearchQuery.trim()) return mentoringLogs;
        const query = mentoringSearchQuery.toLowerCase();
        return mentoringLogs.filter((log: any) => {
            const studentName = ((log.students as any)?.name || '').toLowerCase();
            const logNotes = (log.notes || '').toLowerCase();
            return studentName.includes(query) || logNotes.includes(query);
        });
    }, [mentoringLogs, mentoringSearchQuery]);

    // ── Grouped quiz points by student for history view ────────────────────────
    // Recent quiz points (last 50, newest first)
    const recentQuizPoints = useMemo(() => {
        let filtered = [...quizPoints];
        if (keaktifanFilter === 'akademik') filtered = filtered.filter(q => q.subject != null);
        if (keaktifanFilter === 'keaktifan') filtered = filtered.filter(q => q.subject == null);
        return filtered.sort((a, b) => new Date(b.quiz_date).getTime() - new Date(a.quiz_date).getTime()).slice(0, 50);
    }, [quizPoints, keaktifanFilter]);

    const keaktifanSummary = useMemo(() => {
        const akademik = quizPoints.filter(q => q.subject != null);
        const keaktifan = quizPoints.filter(q => q.subject == null);
        return {
            akademikCount: akademik.length,
            keaktifanCount: keaktifan.length,
            akademikPoints: akademik.reduce((s, q) => s + (q.points || 0), 0),
            keaktifanPoints: keaktifan.reduce((s, q) => s + (q.points || 0), 0),
        };
    }, [quizPoints]);

    const getStudentName = (studentId: string) => students.find(s => s.id === studentId)?.name || 'Unknown';

    // ── Handlers ─────────────────────────────────────────────────────────────

    const handleMentoringSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!mentoringClass || !mentoringNotes) return;
        if (mentoringTargetType === 'specific' && mentoringSelectedStudents.length === 0) {
            toast.error('Pilih minimal satu siswa untuk pembinaan');
            return;
        }

        setIsMentoringSubmitting(true);
        try {
            let targetStudentIds = mentoringSelectedStudents;

            if (mentoringTargetType === 'all') {
                targetStudentIds = mentoringStudentsInClass.map(s => s.id);
            }

            if (targetStudentIds.length === 0) {
                toast.error('Tidak ada siswa aktif di kelas ini');
                setIsMentoringSubmitting(false);
                return;
            }

            const newLogs = targetStudentIds.map(id => ({
                student_id: id,
                mentor_role: mentoringRole,
                mentor_id: user?.id || '',
                date: mentoringDate,
                notes: mentoringNotes
            }));

            await bintangService.bulkInsertMentoringLogs(newLogs);
            toast.success('Catatan pembinaan berhasil disimpan');
            setIsMentoringModalOpen(false);
            setMentoringNotes('');
            fetchAllData();
        } catch (error) {
            console.error(error);
            toast.error('Gagal menyimpan catatan pembinaan');
        } finally {
            setIsMentoringSubmitting(false);
        }
    };

    const openMentoringModal = () => {
        setMentoringClass(selectedClass);
        setIsMentoringModalOpen(true);
    };

    const handleObservationSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!obsStudentId || !obsNotes) return;

        setIsObsSubmitting(true);
        try {
            await bintangService.insertDailyObservation({
                student_id: obsStudentId,
                teacher_id: user?.id || '',
                date: new Date().toISOString().split('T')[0],
                aspect: obsAspect,
                is_positive: obsIsPositive,
                observation: obsNotes
            });
            toast.success('Observasi harian berhasil disimpan');
            setIsObservationModalOpen(false);
            setObsNotes('');
            setObsStudentId('');
        } catch (error) {
            console.error(error);
            toast.error('Gagal menyimpan observasi harian');
        } finally {
            setIsObsSubmitting(false);
        }
    };

    // ── For non-Walas, show simplified view ─────────────────────────────────
    // Mereka bisa input poin keaktifan & observasi, lihat data read-only

    // ── Main render ──────────────────────────────────────────────────────────

    return (
        <div className="p-4 sm:p-6 lg:p-8 space-y-6">
            {/* ─── Header ─────────────────────────────────────────────────── */}
            <div className="flex flex-col gap-4">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-bold text-slate-800 dark:text-white flex items-center gap-2.5">
                            <div className="p-2 rounded-xl bg-amber-500/10 text-amber-500 border border-amber-500/20">
                                <Star size={22} className="fill-amber-500/20" />
                            </div>
                            <span>Program BINTANG</span>
                        </h1>
                        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                            Bina Tertib &amp; Tanggung Jawab Siswa
                        </p>
                    </div>
                </div>

                {/* ─── Filters ────────────────────────────────────────────── */}
                <div className="flex flex-col sm:flex-row gap-3">
                    <div className="flex-1 max-w-xs">
                        <CustomDropdown value={selectedClass} onChange={setSelectedClass} placeholder="Pilih Kelas" options={classes.map(c => ({ value: c.id, label: c.name }))} />
                    </div>
                    <div className="flex-1 max-w-xs">
                        <CustomDropdown value={selectedMonth} onChange={setSelectedMonth} options={
                            Array.from({ length: 6 }).map((_, i) => {
                                const d = new Date();
                                d.setMonth(d.getMonth() - i);
                                const val = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
                                const label = d.toLocaleDateString('id-ID', { month: 'long', year: 'numeric' });
                                return { value: val, label };
                            })
                        } />
                    </div>
                </div>
            </div>

            {/* ─── Empty state ────────────────────────────────────────────── */}
            {!selectedClass && (
                <div className="text-center py-16 text-slate-500 dark:text-slate-400">
                    <BarChart3 size={48} className="mx-auto mb-4 text-slate-300 dark:text-slate-600" />
                    <p className="text-lg font-medium">Pilih kelas untuk memulai</p>
                    <p className="text-sm mt-1">Semua data — ringkasan, poin, evaluasi, pembinaan — ada di satu halaman</p>
                </div>
            )}

            {selectedClass && isLoading && (
                <div className="text-center py-16 text-slate-500">Memuat data...</div>
            )}

            {/* ─── Main Content (Single Page) ─────────────────────────────── */}
            {selectedClass && !isLoading && (
                <div className="space-y-6">

                    {/* ══════════════════════════════════════════════════════════
                        1. SCORING INFO BANNER
                       ══════════════════════════════════════════════════════════ */}
                    <div className="flex flex-col gap-3 p-4 rounded-2xl bg-gradient-to-r from-indigo-50 to-purple-50 dark:from-indigo-950/30 dark:to-purple-950/30 border border-indigo-200/60 dark:border-indigo-800/40">
                        <div className="flex items-center gap-2 text-indigo-700 dark:text-indigo-300">
                            <Info size={16} />
                            <span className="font-semibold text-sm">Bagaimana Skor BINTANG Dihitung?</span>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs text-slate-600 dark:text-slate-400">
                            <div className="flex items-start gap-2 p-2.5 rounded-xl bg-white/60 dark:bg-slate-900/40">
                                <div className="w-7 h-7 rounded-lg bg-rose-100 dark:bg-rose-900/30 flex items-center justify-center shrink-0">
                                    <AlertTriangle size={14} className="text-rose-500" />
                                </div>
                                <div>
                                    <p className="font-medium text-slate-700 dark:text-slate-300">1. Pelanggaran</p>
                                    <p className="mt-0.5">Setiap pelanggaran menambah poin per aspek (ADAB/DISIPLIN/RAPI). Makin tinggi poin, makin turun grade.</p>
                                </div>
                            </div>
                            <div className="flex items-start gap-2 p-2.5 rounded-xl bg-white/60 dark:bg-slate-900/40">
                                <div className="w-7 h-7 rounded-lg bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center shrink-0">
                                    <Sparkles size={14} className="text-emerald-500" />
                                </div>
                                <div>
                                    <p className="font-medium text-slate-700 dark:text-slate-300">2. Poin Keaktifan</p>
                                    <p className="mt-0.5">Setiap +1 poin keaktifan <strong>meng-offset</strong> poin pelanggaran (Adab → Disiplin → Rapi).</p>
                                </div>
                            </div>
                            <div className="flex items-start gap-2 p-2.5 rounded-xl bg-white/60 dark:bg-slate-900/40">
                                <div className="w-7 h-7 rounded-lg bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center shrink-0">
                                    <FileText size={14} className="text-amber-500" />
                                </div>
                                <div>
                                    <p className="font-medium text-slate-700 dark:text-slate-300">3. Evaluasi Bulanan</p>
                                    <p className="mt-0.5">Wali kelas review & konfirmasi grade otomatis, tambah catatan, lalu publikasikan.</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* ══════════════════════════════════════════════════════════
                        2. SUMMARY CARDS (3 Aspek)
                       ══════════════════════════════════════════════════════════ */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        {(['ADAB', 'KEDISIPLINAN', 'KERAPIAN'] as const).map(aspect => {
                            const data = classSummary[aspect];
                            const meta = aspectMeta[aspect];
                            const Icon = meta.icon;
                            return (
                                <div key={aspect} className={`rounded-2xl border ${meta.borderColor} ${meta.bgLight} p-4 sm:p-5 transition-all hover:shadow-md`}>
                                    <div className="flex items-center gap-2.5 mb-3">
                                        <div className={`p-1.5 rounded-lg ${meta.bgLight}`}>
                                            <Icon size={18} className={meta.color} />
                                        </div>
                                        <span className="font-bold text-sm text-slate-700 dark:text-slate-200">
                                            {meta.label}
                                        </span>
                                    </div>
                                    <div className="flex items-end justify-between">
                                        <div>
                                            <p className="text-2xl font-bold text-slate-900 dark:text-white">{data.points} <span className="text-sm font-normal text-slate-500">poin</span></p>
                                            <p className="text-xs text-slate-500 mt-1">{data.count} pelanggaran total kelas</p>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>

                    {/* ══════════════════════════════════════════════════════════
                        3. ACTION BAR — tiered by role
                       ══════════════════════════════════════════════════════════ */}
                    <div className="flex flex-wrap items-center justify-between gap-4 bg-white dark:bg-slate-900 p-2 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
                        
                        {/* Kiri: Input Data & Pencatatan */}
                        <div className="flex flex-wrap items-center gap-2">
                            <div className="flex items-center p-1 rounded-xl bg-slate-100/80 dark:bg-slate-800/80 border border-slate-200/50 dark:border-slate-700/50">
                                <Button
                                    onClick={() => setIsKeaktifanModalOpen(true)}
                                    variant="ghost"
                                    className="flex items-center gap-1.5 text-sm h-9 px-3 font-medium text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-900/30 rounded-lg"
                                >
                                    <Sparkles size={16} />
                                    <span>+ Poin Keaktifan</span>
                                </Button>
                                <div className="w-px h-5 bg-slate-200 dark:bg-slate-700 mx-1" />
                                <Button
                                    onClick={() => setIsObservationModalOpen(true)}
                                    variant="ghost"
                                    className="flex items-center gap-1.5 text-sm h-9 px-3 font-medium hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg"
                                >
                                    <Eye size={16} />
                                    <span>Observasi</span>
                                </Button>
                                {isWalas && (
                                    <>
                                        <div className="w-px h-5 bg-slate-200 dark:bg-slate-700 mx-1" />
                                        <Button
                                            onClick={openMentoringModal}
                                            variant="ghost"
                                            className="flex items-center gap-1.5 text-sm h-9 px-3 font-medium hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg"
                                        >
                                            <PlusCircle size={16} />
                                            <span>Catat Pembinaan</span>
                                        </Button>
                                    </>
                                )}
                            </div>

                            {/* Laporan & Export */}
                            {isWalas && (
                                <div className="flex items-center p-1 rounded-xl bg-slate-100/80 dark:bg-slate-800/80 border border-slate-200/50 dark:border-slate-700/50">
                                    <Button
                                        onClick={evalHook.handleDownloadClassPdf}
                                        disabled={evalHook.isDownloadingClass || !selectedClass}
                                        variant="ghost"
                                        className="flex items-center gap-1.5 text-sm h-9 px-3 font-medium hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg"
                                    >
                                        {evalHook.isDownloadingClass ? (
                                            <span className="animate-spin inline-block w-4 h-4 border-[2px] border-current border-t-transparent rounded-full" />
                                        ) : (
                                            <Printer size={16} />
                                        )}
                                        <span className="hidden sm:inline">{evalHook.isDownloadingClass ? 'Proses...' : 'Cetak Kelas'}</span>
                                    </Button>
                                    <div className="w-px h-5 bg-slate-200 dark:bg-slate-700 mx-1" />
                                    <Button
                                        onClick={evalHook.handleExportExcel}
                                        disabled={evalHook.isExportingExcel || students.length === 0}
                                        variant="ghost"
                                        className="flex items-center gap-1.5 text-sm h-9 px-3 font-medium hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg"
                                    >
                                        {evalHook.isExportingExcel ? (
                                            <span className="animate-spin inline-block w-4 h-4 border-[2px] border-current border-t-transparent rounded-full" />
                                        ) : (
                                            <FileSpreadsheet size={16} />
                                        )}
                                        <span className="hidden sm:inline">{evalHook.isExportingExcel ? 'Proses...' : 'Export Excel'}</span>
                                    </Button>
                                </div>
                            )}
                        </div>

                        {/* Kanan: Evaluasi Bulanan */}
                        {isWalas && (
                            <div className="flex items-center gap-2 w-full md:w-auto mt-2 md:mt-0 pt-2 md:pt-0 border-t md:border-t-0 border-slate-200 dark:border-slate-800">
                                <Button
                                    onClick={() => evalHook.handleGenerateAll(getAspectSummary)}
                                    disabled={evalHook.isGenerating || students.length === 0}
                                    variant="outline"
                                    className="flex-1 md:flex-none justify-center items-center gap-1.5 text-sm h-10 px-4 font-medium border-indigo-200 dark:border-indigo-800/60 text-indigo-600 dark:text-indigo-400 bg-indigo-50/50 dark:bg-indigo-900/20 hover:bg-indigo-100 dark:hover:bg-indigo-900/40 rounded-xl"
                                >
                                    <Zap size={16} />
                                    <span>{evalHook.isGenerating ? 'Proses...' : 'Generate Semua'}</span>
                                </Button>
                                <Button
                                    onClick={evalHook.handlePublish}
                                    disabled={evaluations.length === 0 || evalHook.isPublishing}
                                    className="flex-1 md:flex-none justify-center bg-indigo-600 hover:bg-indigo-700 text-white flex items-center gap-1.5 text-sm h-10 px-4 font-medium rounded-xl shadow-sm shadow-indigo-500/20"
                                >
                                    <Send size={16} />
                                    <span>Publikasi</span>
                                </Button>
                            </div>
                        )}
                    </div>

                    {/* ══════════════════════════════════════════════════════════
                        4. PROGRESS BAR (evaluation fill status) — Walas only
                       ══════════════════════════════════════════════════════════ */}
                    {isWalas && students.length > 0 && (
                        <div className="flex items-center gap-4 text-sm">
                            <div className="flex-1 bg-slate-200 dark:bg-slate-700 rounded-full h-2.5 overflow-hidden">
                                <div
                                    className="bg-indigo-500 h-2.5 rounded-full transition-all duration-500"
                                    style={{ width: `${(evalHook.evalStats.filled / evalHook.evalStats.total) * 100}%` }}
                                />
                            </div>
                            <span className="text-slate-600 dark:text-slate-400 whitespace-nowrap font-medium">
                                {evalHook.evalStats.filled}/{evalHook.evalStats.total} terisi
                                {evalHook.evalStats.published > 0 && (
                                    <span className="text-emerald-600 dark:text-emerald-400 ml-2">
                                        ({evalHook.evalStats.published} published)
                                    </span>
                                )}
                            </span>
                        </div>
                    )}

                    {/* ══════════════════════════════════════════════════════════
                        5. STUDENT TABLE
                       ══════════════════════════════════════════════════════════ */}
                    <Card className="p-0 overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse min-w-[480px]">
                                <thead>
                                    <tr className="border-b border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/50">
                                        <th className="py-2.5 px-3 font-semibold text-xs sm:text-sm text-slate-600 dark:text-slate-300 whitespace-nowrap">
                                            <div className="flex items-center gap-1.5">
                                                <Users size={14} /> Nama Siswa
                                            </div>
                                        </th>
                                        <th className="py-2.5 px-2 font-semibold text-xs sm:text-sm text-slate-600 dark:text-slate-300 text-center whitespace-nowrap">Poin</th>
                                        <th className="py-2.5 px-2 font-semibold text-xs sm:text-sm text-slate-600 dark:text-slate-300 text-center whitespace-nowrap">Adab</th>
                                        <th className="py-2.5 px-2 font-semibold text-xs sm:text-sm text-slate-600 dark:text-slate-300 text-center whitespace-nowrap">Disiplin</th>
                                        <th className="py-2.5 px-2 font-semibold text-xs sm:text-sm text-slate-600 dark:text-slate-300 text-center whitespace-nowrap">Rapi</th>
                                        <th className="hidden md:table-cell py-2.5 px-3 font-semibold text-xs sm:text-sm text-slate-600 dark:text-slate-300 text-center whitespace-nowrap">Status</th>
                                        <th className="py-2.5 px-3 font-semibold text-xs sm:text-sm text-slate-600 dark:text-slate-300 text-right whitespace-nowrap">Aksi</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {students.length === 0 ? (
                                        <tr>
                                            <td colSpan={7} className="text-center py-10 text-slate-500">
                                                Tidak ada data siswa ditemukan di kelas ini.
                                            </td>
                                        </tr>
                                    ) : (
                                        students.map((student) => {
                                            const ev = evalHook.getEvaluationForStudent(student.id);
                                            const aspect = getAspectSummary(student.id);
                                            const isCompleted = !!ev;
                                            const isPublished = ev?.is_published;
                                            const totalPoints = (aspect.ADAB.points + aspect.KEDISIPLINAN.points + aspect.KERAPIAN.points);
                                            const activePts = studentQuizMap.get(student.id);
                                            const hasKeaktifan = activePts && activePts.totalPoints > 0;

                                            return (
                                                <tr key={student.id} className="border-b border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                                                    <td className="py-2 px-2 sm:py-3 sm:px-4 text-[11px] sm:text-sm font-medium text-slate-900 dark:text-white max-w-[90px] sm:max-w-none truncate" title={student.name}>
                                                        <div className="flex items-center gap-1.5">
                                                            <span className="truncate">{student.name}</span>
                                                            {hasKeaktifan && (
                                                                <span className="shrink-0 text-[10px] px-1.5 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 font-semibold" title={`+${activePts.totalPoints} poin keaktifan`}>
                                                                    +{activePts.totalPoints}
                                                                </span>
                                                            )}
                                                        </div>
                                                    </td>
                                                    <td className="py-2 px-1 sm:py-3 sm:px-4 text-[10px] sm:text-sm text-center">
                                                        <span className={`font-bold ${totalPoints > 20 ? 'text-rose-600' : totalPoints > 10 ? 'text-amber-600' : totalPoints > 0 ? 'text-blue-600' : 'text-emerald-600'}`}>
                                                            {totalPoints}
                                                        </span>
                                                    </td>
                                                    {(['adab_score', 'kedisiplinan_score', 'kerapian_score'] as const).map((field, idx) => {
                                                        const aspectKey = (['ADAB', 'KEDISIPLINAN', 'KERAPIAN'] as const)[idx];
                                                        const score = ev?.[field] || aspect[aspectKey].grade;
                                                        return (
                                                            <td key={field} className="py-2 px-1 sm:py-3 sm:px-4 text-center">
                                                                <span className={`inline-flex px-1.5 py-0.5 sm:px-2.5 sm:py-1 rounded-full text-[10px] sm:text-xs font-bold ring-1 ${gradeColors[score]}`}>
                                                                    {score}
                                                                </span>
                                                            </td>
                                                        );
                                                    })}
                                                    <td className="hidden md:table-cell py-2 px-2 sm:py-3 sm:px-4 text-xs sm:text-sm text-center">
                                                        {isPublished ? (
                                                            <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-[10px] sm:text-xs font-medium bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300">
                                                                <CheckCircle size={12} /> Published
                                                            </span>
                                                        ) : isCompleted ? (
                                                            <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-[10px] sm:text-xs font-medium bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300">
                                                                Draft
                                                            </span>
                                                        ) : (
                                                            <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-[10px] sm:text-xs font-medium bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400">
                                                                Auto
                                                            </span>
                                                        )}
                                                    </td>
                                                    <td className="py-2 px-2 sm:py-3 sm:px-4 text-right">
                                                        <div className="flex justify-end gap-1 sm:gap-2">
                                                            {isWalas && (
                                                                <Button
                                                                    variant="outline"
                                                                    size="sm"
                                                                    className="px-1.5 py-1 sm:px-3 sm:py-1.5 h-auto min-h-[44px] min-w-[44px] sm:min-h-0 sm:min-w-0"
                                                                    onClick={() => evalHook.handleOpenEditModal(student, getAspectSummary)}
                                                                    disabled={isPublished}
                                                                    title={isCompleted ? 'Edit' : 'Isi Rapor'}
                                                                >
                                                                    <FileText size={14} className="sm:mr-1" />
                                                                    <span className="hidden lg:inline">{isCompleted ? 'Edit' : 'Isi'}</span>
                                                                </Button>
                                                            )}
                                                            {isWalas && (
                                                                <Button
                                                                    variant="outline"
                                                                    size="sm"
                                                                    className="px-1.5 py-1 sm:px-3 sm:py-1.5 h-auto min-h-[44px] min-w-[44px] sm:min-h-0 sm:min-w-0"
                                                                    onClick={() => evalHook.handleDownloadSinglePdf(student.id)}
                                                                    disabled={evalHook.downloadingStudentId === student.id}
                                                                    title="Cetak Rapor"
                                                                >
                                                                    {evalHook.downloadingStudentId === student.id ? (
                                                                        <span className="animate-spin inline-block w-3 h-3 sm:w-4 sm:h-4 border-[2px] border-current border-t-transparent rounded-full sm:mr-1" />
                                                                    ) : (
                                                                        <Printer size={14} className="sm:mr-1" />
                                                                    )}
                                                                    <span className="hidden lg:inline">Cetak</span>
                                                                </Button>
                                                            )}
                                                            {!isWalas && (
                                                                <span className="text-[10px] text-slate-400 italic">(lihat saja)</span>
                                                            )}
                                                        </div>
                                                    </td>
                                                </tr>
                                            );
                                        })
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </Card>

                    {/* ─── Grade Legend ─────────────────────────────────────────── */}
                    <div className="flex flex-wrap gap-3 text-xs text-slate-500 dark:text-slate-400">
                        <span className="font-medium text-slate-700 dark:text-slate-300">Keterangan:</span>
                        {BINTANG_THRESHOLDS.map(t => (
                            <span key={t.grade} className="flex items-center gap-1">
                                <span className={`inline-flex px-1.5 py-0.5 rounded text-xs font-bold ${gradeColors[t.grade]}`}>{t.grade}</span>
                                {t.grade === 'A' ? '0 poin' : t.grade === 'B' ? '1-10 poin' : t.grade === 'C' ? '11-20 poin' : '>20 poin'}
                                ({t.label})
                            </span>
                        ))}
                    </div>

                    {/* ══════════════════════════════════════════════════════════
                        6. COLLAPSIBLE: RIWAYAT PEMBINAAN
                       ══════════════════════════════════════════════════════════ */}
                    <div className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 overflow-hidden">
                        <button
                            type="button"
                            onClick={() => setShowMentoringHistory(!showMentoringHistory)}
                            className="w-full flex items-center justify-between px-5 py-4 text-left hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
                        >
                            <div className="flex items-center gap-3">
                                <ClipboardCheck size={20} className="text-amber-500" />
                                <div>
                                    <p className="font-semibold text-sm text-slate-800 dark:text-white">Riwayat Pembinaan</p>
                                    <p className="text-xs text-slate-500 dark:text-slate-400">{mentoringLogs.length} catatan tersimpan</p>
                                </div>
                            </div>
                            <ChevronDown size={20} className={`text-slate-400 transition-transform duration-300 ${showMentoringHistory ? 'rotate-180' : ''}`} />
                        </button>

                        <AnimatePresence>
                            {showMentoringHistory && (
                                <MotionDiv
                                    initial={{ height: 0, opacity: 0 }}
                                    animate={{ height: 'auto', opacity: 1 }}
                                    exit={{ height: 0, opacity: 0 }}
                                    transition={{ duration: 0.25 }}
                                    className="overflow-hidden"
                                >
                                    <div className="border-t border-slate-200 dark:border-slate-700">
                                        <div className="p-4 border-b border-slate-100 dark:border-slate-800">
                                            <div className="relative max-w-sm">
                                                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" size={16} />
                                                <Input
                                                    placeholder="Cari siswa atau catatan..."
                                                    className="pl-9 w-full text-sm"
                                                    value={mentoringSearchQuery}
                                                    onChange={(e) => setMentoringSearchQuery(e.target.value)}
                                                />
                                            </div>
                                        </div>

                                        {filteredMentoringLogs.length === 0 ? (
                                            <div className="text-center py-8 text-slate-500 text-sm">
                                                {mentoringSearchQuery.trim() ? 'Tidak ada catatan yang cocok.' : 'Belum ada catatan pembinaan.'}
                                            </div>
                                        ) : (
                                            <div className="overflow-x-auto max-h-80 overflow-y-auto">
                                                <table className="w-full text-left border-collapse">
                                                    <thead className="sticky top-0 bg-slate-50 dark:bg-slate-800/80">
                                                        <tr className="border-b border-slate-200 dark:border-slate-700">
                                                            <th className="py-2.5 px-4 font-semibold text-xs text-slate-600 dark:text-slate-300">Tanggal</th>
                                                            <th className="py-2.5 px-4 font-semibold text-xs text-slate-600 dark:text-slate-300">Siswa</th>
                                                            <th className="py-2.5 px-4 font-semibold text-xs text-slate-600 dark:text-slate-300">Mentor</th>
                                                            <th className="py-2.5 px-4 font-semibold text-xs text-slate-600 dark:text-slate-300">Catatan</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody>
                                                        {filteredMentoringLogs.map((log: any) => (
                                                            <tr key={log.id} className="border-b border-slate-100 dark:border-slate-800 hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                                                                <td className="py-2.5 px-4 text-xs text-slate-600 dark:text-slate-300 whitespace-nowrap">
                                                                    {new Date(log.date).toLocaleDateString('id-ID')}
                                                                </td>
                                                                <td className="py-2.5 px-4 text-xs text-slate-700 dark:text-slate-300 font-medium">
                                                                    {(log.students as any)?.name}
                                                                </td>
                                                                <td className="py-2.5 px-4 text-xs">
                                                                    <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-300">
                                                                        {log.mentor_role}
                                                                    </span>
                                                                </td>
                                                                <td className="py-2.5 px-4 text-xs text-slate-600 dark:text-slate-400 max-w-[240px] truncate" title={log.notes}>
                                                                    {log.notes}
                                                                </td>
                                                            </tr>
                                                        ))}
                                                    </tbody>
                                                </table>
                                            </div>
                                        )}
                                    </div>
                                </MotionDiv>
                            )}
                        </AnimatePresence>
                    </div>

                    {/* ══════════════════════════════════════════════════════════
                        7. COLLAPSIBLE: RIWAYAT POIN KEAKTIFAN
                       ══════════════════════════════════════════════════════════ */}
                    <div className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 overflow-hidden">
                        <button
                            type="button"
                            onClick={() => setShowKeaktifanHistory(!showKeaktifanHistory)}
                            className="w-full flex items-center justify-between px-5 py-4 text-left hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
                        >
                            <div className="flex items-center gap-3">
                                <Gift size={20} className="text-emerald-500" />
                                <div>
                                    <p className="font-semibold text-sm text-slate-800 dark:text-white">Riwayat Poin Keaktifan</p>
                                    <p className="text-xs text-slate-500 dark:text-slate-400">{quizPoints.length} poin tercatat bulan ini</p>
                                </div>
                            </div>
                            <ChevronDown size={20} className={`text-slate-400 transition-transform duration-300 ${showKeaktifanHistory ? 'rotate-180' : ''}`} />
                        </button>

                        <AnimatePresence>
                            {showKeaktifanHistory && (
                                <MotionDiv
                                    initial={{ height: 0, opacity: 0 }}
                                    animate={{ height: 'auto', opacity: 1 }}
                                    exit={{ height: 0, opacity: 0 }}
                                    transition={{ duration: 0.25 }}
                                    className="overflow-hidden"
                                >
                                    <div className="border-t border-slate-200 dark:border-slate-700">
                                        {/* Stats row — breakdown by type */}
                                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-4 bg-slate-50/50 dark:bg-slate-800/30 border-b border-slate-100 dark:border-slate-800">
                                            <div className="text-center">
                                                <p className="text-lg font-bold text-emerald-600 dark:text-emerald-400">{keaktifanSummary.keaktifanCount}</p>
                                                <p className="text-[10px] text-slate-500">Poin Keaktifan</p>
                                            </div>
                                            <div className="text-center">
                                                <p className="text-lg font-bold text-indigo-600 dark:text-indigo-400">{keaktifanSummary.akademikCount}</p>
                                                <p className="text-[10px] text-slate-500">Poin Akademik</p>
                                            </div>
                                            <div className="text-center">
                                                <p className="text-lg font-bold text-amber-600 dark:text-amber-400">
                                                    {keaktifanSummary.keaktifanPoints + keaktifanSummary.akademikPoints}
                                                </p>
                                                <p className="text-[10px] text-slate-500">Total Offset</p>
                                            </div>
                                            <div className="text-center">
                                                <p className="text-lg font-bold text-slate-600 dark:text-slate-400">
                                                    {students.filter(s => studentQuizMap.get(s.id)?.totalPoints).length}
                                                </p>
                                                <p className="text-[10px] text-slate-500">Siswa Dapat Poin</p>
                                            </div>
                                        </div>

                                        {/* Filter tabs */}
                                        <div className="flex gap-1 px-4 pt-3 pb-2 border-b border-slate-100 dark:border-slate-800">
                                            {([
                                                { key: 'semua' as const, label: 'Semua', count: quizPoints.length },
                                                { key: 'keaktifan' as const, label: '⚡ Keaktifan', count: keaktifanSummary.keaktifanCount },
                                                { key: 'akademik' as const, label: '📚 Akademik', count: keaktifanSummary.akademikCount },
                                            ]).map(tab => (
                                                <button
                                                    key={tab.key}
                                                    type="button"
                                                    onClick={() => setKeaktifanFilter(tab.key)}
                                                    className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-all ${
                                                        keaktifanFilter === tab.key
                                                            ? 'bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300'
                                                            : 'text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                                                    }`}
                                                >
                                                    {tab.label}
                                                    <span className="ml-1 text-[10px] opacity-60">({tab.count})</span>
                                                </button>
                                            ))}
                                        </div>

                                        {/* Table */}
                                        {recentQuizPoints.length === 0 ? (
                                            <div className="text-center py-8 text-slate-500 text-sm">
                                                {keaktifanFilter === 'keaktifan' ? 'Belum ada poin keaktifan umum bulan ini.' :
                                                 keaktifanFilter === 'akademik' ? 'Belum ada poin akademik bulan ini.' :
                                                 'Belum ada poin keaktifan bulan ini. Klik <strong>"+ Poin Keaktifan"</strong> untuk menambah.'}
                                            </div>
                                        ) : (
                                            <div className="overflow-x-auto max-h-80 overflow-y-auto">
                                                <table className="w-full text-left border-collapse">
                                                    <thead className="sticky top-0 bg-slate-50 dark:bg-slate-800/80">
                                                        <tr className="border-b border-slate-200 dark:border-slate-700">
                                                            <th className="py-2.5 px-4 font-semibold text-xs text-slate-600 dark:text-slate-300">Tanggal</th>
                                                            <th className="py-2.5 px-4 font-semibold text-xs text-slate-600 dark:text-slate-300">Siswa</th>
                                                            <th className="py-2.5 px-4 font-semibold text-xs text-slate-600 dark:text-slate-300">Aktivitas</th>
                                                            <th className="py-2.5 px-4 font-semibold text-xs text-slate-600 dark:text-slate-300">Tipe</th>
                                                            <th className="py-2.5 px-4 font-semibold text-xs text-slate-600 dark:text-slate-300 text-center">Poin</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody>
                                                        {recentQuizPoints.map(q => (
                                                            <tr key={q.id} className="border-b border-slate-100 dark:border-slate-800 hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                                                                <td className="py-2.5 px-4 text-xs text-slate-600 dark:text-slate-300 whitespace-nowrap">
                                                                    {new Date(q.quiz_date).toLocaleDateString('id-ID')}
                                                                </td>
                                                                <td className="py-2.5 px-4 text-xs text-slate-700 dark:text-slate-300 font-medium">
                                                                    {getStudentName(q.student_id)}
                                                                </td>
                                                                <td className="py-2.5 px-4 text-xs text-slate-600 dark:text-slate-400 max-w-[180px] truncate" title={q.quiz_name || ''}>
                                                                    {q.quiz_name || '-'}
                                                                </td>
                                                                <td className="py-2.5 px-4 text-xs">
                                                                    {q.subject != null ? (
                                                                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 text-[10px] font-medium">
                                                                            📚 {q.subject}
                                                                        </span>
                                                                    ) : (
                                                                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 text-[10px] font-medium">
                                                                            ⚡ Keaktifan
                                                                        </span>
                                                                    )}
                                                                </td>
                                                                <td className="py-2.5 px-4 text-xs text-center">
                                                                    <span className="inline-flex px-2 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300">
                                                                        +{q.points}
                                                                    </span>
                                                                </td>
                                                            </tr>
                                                        ))}
                                                    </tbody>
                                                </table>
                                            </div>
                                        )}
                                    </div>
                                </MotionDiv>
                            )}
                        </AnimatePresence>
                    </div>

                    {/* ══════════════════════════════════════════════════════════
                        8. COLLAPSIBLE: TREN BULANAN
                       ══════════════════════════════════════════════════════════ */}
                    <div className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 overflow-hidden">
                        <button
                            type="button"
                            onClick={() => setShowTrendChart(!showTrendChart)}
                            className="w-full flex items-center justify-between px-5 py-4 text-left hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
                        >
                            <div className="flex items-center gap-3">
                                <TrendingUp size={20} className="text-indigo-500" />
                                <div>
                                    <p className="font-semibold text-sm text-slate-800 dark:text-white">Tren Bulanan</p>
                                    <p className="text-xs text-slate-500 dark:text-slate-400">Grafik perkembangan poin per aspek</p>
                                </div>
                            </div>
                            <ChevronDown size={20} className={`text-slate-400 transition-transform duration-300 ${showTrendChart ? 'rotate-180' : ''}`} />
                        </button>

                        <AnimatePresence>
                            {showTrendChart && (
                                <MotionDiv
                                    initial={{ height: 0, opacity: 0 }}
                                    animate={{ height: 'auto', opacity: 1 }}
                                    exit={{ height: 0, opacity: 0 }}
                                    transition={{ duration: 0.25 }}
                                    className="overflow-hidden"
                                >
                                    <div className="border-t border-slate-200 dark:border-slate-700 p-4 sm:p-6">
                                        <BintangTrendChart selectedClass={selectedClass} />
                                    </div>
                                </MotionDiv>
                            )}
                        </AnimatePresence>
                    </div>

                </div>
            )}

            {/* ─── Publish Confirmation ──────────────────────────────────────── */}
            {PublishConfirmDialog}

            {/* ─── Edit Evaluation Modal ─────────────────────────────────────── */}
            <Modal
                isOpen={evalHook.isEditModalOpen}
                onClose={() => evalHook.setIsEditModalOpen(false)}
                title={`Rapor BINTANG: ${evalHook.editingStudent?.name}`}
                maxWidth="max-w-2xl"
            >
                <form onSubmit={(e) => evalHook.handleSaveEvaluation(e, getAspectSummary)} className="space-y-4 pt-4">
                    <div className="flex items-start gap-3 p-3 rounded-lg bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-200 dark:border-indigo-800">
                        <Info size={18} className="text-indigo-500 mt-0.5 shrink-0" />
                        <p className="text-xs text-indigo-700 dark:text-indigo-300">
                            Nilai otomatis dihitung dari poin pelanggaran siswa bulan ini. Anda dapat mengubah nilai secara manual jika diperlukan.
                        </p>
                    </div>

                    <AspectSectionEditor
                        aspectKey="ADAB" scoreField="adab_score"
                        formValue={evalHook.formData.adab_score} notesValue={evalHook.formData.adab_notes}
                        onScoreChange={(val) => evalHook.setFormData(prev => ({ ...prev, adab_score: val }))}
                        onNotesChange={(val) => evalHook.setFormData(prev => ({ ...prev, adab_notes: val }))}
                        editingStudent={evalHook.editingStudent} getAspectSummary={getAspectSummary}
                    />
                    <AspectSectionEditor
                        aspectKey="KEDISIPLINAN" scoreField="kedisiplinan_score"
                        formValue={evalHook.formData.kedisiplinan_score} notesValue={evalHook.formData.kedisiplinan_notes}
                        onScoreChange={(val) => evalHook.setFormData(prev => ({ ...prev, kedisiplinan_score: val }))}
                        onNotesChange={(val) => evalHook.setFormData(prev => ({ ...prev, kedisiplinan_notes: val }))}
                        editingStudent={evalHook.editingStudent} getAspectSummary={getAspectSummary}
                    />
                    <AspectSectionEditor
                        aspectKey="KERAPIAN" scoreField="kerapian_score"
                        formValue={evalHook.formData.kerapian_score} notesValue={evalHook.formData.kerapian_notes}
                        onScoreChange={(val) => evalHook.setFormData(prev => ({ ...prev, kerapian_score: val }))}
                        onNotesChange={(val) => evalHook.setFormData(prev => ({ ...prev, kerapian_notes: val }))}
                        editingStudent={evalHook.editingStudent} getAspectSummary={getAspectSummary}
                    />

                    <div className="p-4 border border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50/50 dark:bg-slate-800/30">
                        <div className="flex items-center gap-2 mb-3">
                            <FileText size={18} className="text-emerald-600 dark:text-emerald-400" />
                            <span className="font-bold text-sm text-slate-800 dark:text-slate-200">Catatan Wali Kelas</span>
                        </div>
                        <div className="w-full">
                            <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Tuliskan pesan atau catatan perkembangan umum siswa untuk Orang Tua / Wali</label>
                            <textarea
                                className="w-full bg-white dark:bg-slate-900/50 border border-slate-300 dark:border-slate-700 rounded-lg p-2.5 text-slate-800 dark:text-slate-200 text-sm focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                                rows={3}
                                value={evalHook.formData.catatan_wali}
                                onChange={(e) => evalHook.setFormData(prev => ({ ...prev, catatan_wali: e.target.value }))}
                                placeholder="Tuliskan catatan umum wali kelas di sini..."
                            />
                        </div>
                    </div>

                    <div className="flex justify-end gap-3 pt-4 border-t border-slate-200 dark:border-slate-700">
                        <Button type="button" variant="outline" onClick={() => evalHook.setIsEditModalOpen(false)}>Batal</Button>
                        <Button type="submit" disabled={evalHook.isSubmitting}>
                            {evalHook.isSubmitting ? 'Menyimpan...' : 'Simpan Rapor'}
                        </Button>
                    </div>
                </form>
            </Modal>

            {/* ─── Keaktifan Modal ──────────────────────────────────────────── */}
            <BintangKeaktifanModal
                isOpen={isKeaktifanModalOpen}
                onClose={() => setIsKeaktifanModalOpen(false)}
                students={students}
                userId={user?.id || ''}
                onSuccess={fetchAllData}
            />

            {/* ─── Observation Modal (inline, simplified) ──────────────────── */}
            <Modal
                isOpen={isObservationModalOpen}
                onClose={() => setIsObservationModalOpen(false)}
                title="Input Observasi Harian"
            >
                <form onSubmit={handleObservationSubmit} className="space-y-4 pt-2">
                    <div className="flex items-start gap-3 p-3 rounded-lg bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-200 dark:border-indigo-800">
                        <Info size={18} className="text-indigo-500 mt-0.5 shrink-0" />
                        <p className="text-xs text-indigo-700 dark:text-indigo-300">
                            Observasi adalah catatan harian guru. Tidak mempengaruhi skor otomatis — hanya sebagai referensi wali kelas saat evaluasi.
                        </p>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Siswa <span className="text-rose-500">*</span></label>
                        <CustomDropdown
                            value={obsStudentId}
                            onChange={setObsStudentId}
                            placeholder="Pilih Siswa"
                            options={students.map(s => ({ value: s.id, label: s.name }))}
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Aspek BINTANG</label>
                        <CustomDropdown
                            value={obsAspect}
                            onChange={setObsAspect}
                            options={[
                                { value: 'ADAB', label: 'Adab' },
                                { value: 'KEDISIPLINAN', label: 'Kedisiplinan' },
                                { value: 'KERAPIAN', label: 'Kerapian' },
                            ]}
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Tipe Observasi</label>
                        <div className="flex gap-4 mt-2 mb-2">
                            <label className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300 cursor-pointer">
                                <input
                                    type="radio"
                                    name="obsIsPositive"
                                    checked={obsIsPositive === true}
                                    onChange={() => setObsIsPositive(true)}
                                    className="text-emerald-600 focus:ring-emerald-500"
                                />
                                <span className="text-emerald-600 font-medium">Positif (Pujian)</span>
                            </label>
                            <label className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300 cursor-pointer">
                                <input
                                    type="radio"
                                    name="obsIsPositive"
                                    checked={obsIsPositive === false}
                                    onChange={() => setObsIsPositive(false)}
                                    className="text-rose-600 focus:ring-rose-500"
                                />
                                <span className="text-rose-600 font-medium">Netral / Negatif</span>
                            </label>
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Catatan Observasi <span className="text-rose-500">*</span></label>
                        <textarea
                            className="w-full p-2 border border-slate-300 dark:border-slate-700 rounded-md bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500"
                            rows={3}
                            value={obsNotes}
                            onChange={(e) => setObsNotes(e.target.value)}
                            placeholder="Tuliskan catatan observasi harian..."
                            required
                        />
                    </div>

                    <div className="flex justify-end gap-3 pt-4 border-t border-slate-200 dark:border-slate-700">
                        <Button type="button" variant="outline" onClick={() => setIsObservationModalOpen(false)}>Batal</Button>
                        <Button type="submit" disabled={isObsSubmitting || !obsStudentId || !obsNotes}>
                            {isObsSubmitting ? 'Menyimpan...' : 'Simpan'}
                        </Button>
                    </div>
                </form>
            </Modal>

            {/* ─── Mentoring Modal ───────────────────────────────────────────── */}
            <Modal
                isOpen={isMentoringModalOpen}
                onClose={() => setIsMentoringModalOpen(false)}
                title="Catat Pembinaan"
            >
                <form onSubmit={handleMentoringSubmit} className="space-y-4 pt-4">
                    <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Tanggal</label>
                        <Input type="date" value={mentoringDate} onChange={(e) => setMentoringDate(e.target.value)} required />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Peran Mentor</label>
                        <CustomDropdown
                            value={mentoringRole}
                            onChange={setMentoringRole}
                            options={[
                                { value: 'WALAS', label: 'Wali Kelas' },
                                { value: 'KESISWAAN', label: 'Kesiswaan' },
                                { value: 'KEPSEK', label: 'Kepala Sekolah' },
                            ]}
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Kelas</label>
                        <CustomDropdown
                            value={mentoringClass}
                            onChange={setMentoringClass}
                            placeholder="Pilih Kelas"
                            options={classes.map(c => ({ value: c.id, label: c.name }))}
                        />
                    </div>

                    {mentoringClass && (
                        <div>
                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Sasaran</label>
                            <div className="flex gap-4 mt-2 mb-3">
                                <label className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300 cursor-pointer">
                                    <input type="radio" name="mentoringTargetType" value="all" checked={mentoringTargetType === 'all'} onChange={() => setMentoringTargetType('all')} className="text-indigo-600 focus:ring-indigo-500" />
                                    Seluruh Siswa
                                </label>
                                <label className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300 cursor-pointer">
                                    <input type="radio" name="mentoringTargetType" value="specific" checked={mentoringTargetType === 'specific'} onChange={() => setMentoringTargetType('specific')} className="text-indigo-600 focus:ring-indigo-500" />
                                    Siswa Tertentu
                                </label>
                            </div>

                            {mentoringTargetType === 'all' && (
                                <p className="text-xs text-slate-500">Pembinaan akan dicatat untuk seluruh {mentoringStudentsInClass.length} siswa.</p>
                            )}

                            {mentoringTargetType === 'specific' && (
                                <div className="mt-2 max-h-48 overflow-y-auto border border-slate-200 dark:border-slate-700 rounded-lg p-2 bg-slate-50 dark:bg-slate-800/50">
                                    {mentoringStudentsInClass.length === 0 ? (
                                        <p className="text-sm text-slate-500 p-2">Tidak ada siswa.</p>
                                    ) : (
                                        <div className="space-y-1">
                                            {mentoringStudentsInClass.map(student => (
                                                <label key={student.id} className="flex items-center gap-3 p-2 hover:bg-slate-100 dark:hover:bg-slate-700/50 rounded cursor-pointer transition-colors">
                                                    <input
                                                        type="checkbox"
                                                        checked={mentoringSelectedStudents.includes(student.id)}
                                                        onChange={(e) => {
                                                            if (e.target.checked) {
                                                                setMentoringSelectedStudents([...mentoringSelectedStudents, student.id]);
                                                            } else {
                                                                setMentoringSelectedStudents(mentoringSelectedStudents.filter(id => id !== student.id));
                                                            }
                                                        }}
                                                        className="rounded text-indigo-600 focus:ring-indigo-500 w-4 h-4"
                                                    />
                                                    <span className="text-sm text-slate-700 dark:text-slate-300">{student.name}</span>
                                                </label>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    )}

                    <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Materi / Catatan Pembinaan</label>
                        <textarea
                            className="w-full p-2 border border-slate-300 dark:border-slate-700 rounded-md bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                            rows={4}
                            value={mentoringNotes}
                            onChange={(e) => setMentoringNotes(e.target.value)}
                            placeholder="Tuliskan catatan atau materi pembinaan..."
                            required
                        />
                    </div>

                    <div className="flex justify-end gap-3 pt-4 border-t border-slate-200 dark:border-slate-700">
                        <Button type="button" variant="outline" onClick={() => setIsMentoringModalOpen(false)}>Batal</Button>
                        <Button type="submit" disabled={isMentoringSubmitting || !mentoringClass || !mentoringNotes}>
                            {isMentoringSubmitting ? 'Menyimpan...' : 'Simpan'}
                        </Button>
                    </div>
                </form>
            </Modal>

            {/* ─── Progress Modal untuk Cetak Kelas ──────────────────────────── */}
            {evalHook.isDownloadingClass && evalHook.downloadProgress && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
                    <div className="relative w-full max-w-md rounded-2xl bg-white dark:bg-slate-900 shadow-2xl border border-slate-200 dark:border-slate-700 p-6">
                        <div className="text-center">
                            {/* Animated icon */}
                            <div className="mx-auto mb-4 w-14 h-14 rounded-2xl bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
                                <svg className="animate-spin h-7 w-7 text-emerald-600 dark:text-emerald-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                                </svg>
                            </div>

                            <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">
                                Mengunduh Rapor Kelas
                            </h3>
                            <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">
                                Memproses {evalHook.downloadProgress.total} siswa untuk {evalHook.downloadProgress.current > 0 ? '...' : ''}
                            </p>

                            {/* Progress bar */}
                            <div className="mb-4">
                                <div className="flex justify-between text-xs text-slate-500 dark:text-slate-400 mb-1.5">
                                    <span>
                                        Memproses siswa{' '}
                                        <span className="font-bold text-emerald-600 dark:text-emerald-400">{evalHook.downloadProgress.current}</span>
                                        {' / '}
                                        <span className="font-semibold">{evalHook.downloadProgress.total}</span>
                                    </span>
                                    <span className="font-semibold">
                                        {Math.round((evalHook.downloadProgress.current / evalHook.downloadProgress.total) * 100)}%
                                    </span>
                                </div>
                                <div className="h-3 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                                    <div
                                        className="h-full bg-gradient-to-r from-emerald-500 to-emerald-400 rounded-full transition-all duration-300 ease-out"
                                        style={{
                                            width: `${(evalHook.downloadProgress.current / evalHook.downloadProgress.total) * 100}%`
                                        }}
                                    />
                                </div>
                            </div>

                            {/* Student name indicator */}
                            {evalHook.downloadProgress.current > 0 && (
                                <p className="text-xs text-slate-400 dark:text-slate-500 italic">
                                    Menambahkan halaman rapor siswa ke-{evalHook.downloadProgress.current}...
                                </p>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default BintangDashboardPage;
