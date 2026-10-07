import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { MotionDiv, AnimatePresence } from '../../ui/MotionComponents';
import { Star, ClipboardCheck, BarChart3,
    Sparkles, Zap, Send, PlusCircle, Printer,
    ChevronDown, TrendingUp, Eye, FileSpreadsheet,
    ShieldAlert, Download, RotateCcw, AlertTriangle, Users, CheckCircle2
} from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../../../hooks/useAuth';
import { supabase } from '../../../services/supabase';
import { bintangService, calculateAspectPoints, getAspectForViolation, type AspectPointsSummary, type BintangGrade } from '../../../services/bintangService';
import { Button } from '../../ui/Button';
import { CustomDropdown } from '../../ui/CustomDropdown';
import { useConfirmation } from '../../ui/ConfirmationDialog';
import { useToast } from '../../../hooks/useToast';
import { BintangKeaktifanModal } from './BintangKeaktifanModal';
import { aspectMeta } from './bintangConstants';
import { useBintangEvaluation } from './hooks/useBintangEvaluation';
import BintangTrendChart from './BintangTrendChart';
import { useBulkSelection } from '../../advanced-features/useBulkSelection';
import { BintangBulkExportModal } from './components/BintangBulkExportModal';
import { type SeverityLevel } from '../student/violationMeta';
import { ViolationFormValues, QuizFormValues } from '../student/schemas';
import { ViolationRow, QuizPointRow } from '../student/types';
import { dedupeViolations, dedupeQuizPoints } from '../../../utils/academicRecordUtils';
import { violationList } from '../../../services/violations.data';
import { writeAuditLog } from '../../../services/auditTrail';
import { r2StorageService } from '../../../services/r2StorageService';
import { useSemester } from '../../../contexts/SemesterContext';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../../ui/Tabs';
import { BintangScoringBanner } from './components/BintangScoringBanner';
import { PembinaanTab } from './tabs/PembinaanTab';
import { BintangEvaluationModal } from './components/BintangEvaluationModal';
import { BintangStudentHistoryModal } from './components/BintangStudentHistoryModal';
import { BintangAddViolationModal } from './components/BintangAddViolationModal';
import {
    BintangEditViolationModal,
    BintangEditQuizModal,
    BintangObservationModal,
    BintangMentoringModal,
    BintangMentoringEditModal,
    BintangDownloadProgressModal,
} from './components/BintangActionModals';
import { BintangEvaluationTable } from './components/BintangEvaluationTable';
import { formatLocalDate } from '../../../hooks/dashboard/dashboardHelpers';



// ─── Violation severity helpers ─────────────────────────────────────────────

const getViolationSeverityFromCategory = (category?: string): SeverityLevel | null => {
    const normalized = category?.toLowerCase();
    if (normalized === 'ringan' || normalized === 'sedang' || normalized === 'berat') {
        return normalized as SeverityLevel;
    }
    return null;
};

/** Bulan berjalan dalam WIB (UTC+7), hindari off-by-one di 00:00 sampai 07:00 WIB. */
function getCurrentMonthWib(): string {
    const now = new Date(Date.now() + 7 * 60 * 60 * 1000);
    return `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, '0')}`;
}



// ─── Main Component ──────────────────────────────────────────────────────────

const BintangDashboardPage: React.FC = () => {
    const { user, isAdmin, userRole } = useAuth();
    const toast = useToast();
    const { confirm: confirmPublish, Dialog: PublishConfirmDialog } = useConfirmation();
    const { confirm: confirmUnpublish, Dialog: UnpublishConfirmDialog } = useConfirmation();
    const { confirm: confirmDeleteViolation, Dialog: DeleteViolationDialog } = useConfirmation();
    const { confirm: confirmDeleteQuiz, Dialog: DeleteQuizDialog } = useConfirmation();
    const { confirm: confirmDeleteMentoring, Dialog: DeleteMentoringDialog } = useConfirmation();
    const { confirm: confirmDuplicateViolation, Dialog: DuplicateViolationDialog } = useConfirmation();
    const { activeSemester } = useSemester();

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

    const isWalas = isAdmin || isHomeroomTeacher || userRole === 'waka_kesiswaan' || userRole === 'waka_kurikulum' || userRole === 'kepala_madrasah';

    // ── Shared filters ───────────────────────────────────────────────────────
    const [classes, setClasses] = useState<Array<{ id: string; name: string }>>([]);
    const [selectedClass, setSelectedClass] = useState('');
    const currentMonth = getCurrentMonthWib();
    const [selectedMonth, setSelectedMonth] = useState(currentMonth);

    // ── Data state ───────────────────────────────────────────────────────────
    const [students, setStudents] = useState<Array<{ id: string; name: string; gender?: string | null; parent_phone?: string | null; parent_name?: string | null }>>([]);
    const [violations, setViolations] = useState<Array<{
        id: string; student_id: string; user_id: string | null; description: string; points: number;
        date: string; severity: string | null; semester_id: string | null; type: string | null;
        context_notes: string | null; evidence_url: string | null; created_at: string;
        follow_up_status?: string | null; follow_up_notes?: string | null;
        parent_notified?: boolean | null; parent_notified_at?: string | null;
        students?: any; users?: any;
    }>>([]);
    const [evaluations, setEvaluations] = useState<Array<{
        id: string; student_id: string; month: string;
        adab_score: string | null; kedisiplinan_score: string | null; kerapian_score: string | null;
        adab_notes: string | null; kedisiplinan_notes: string | null; kerapian_notes: string | null;
        catatan_wali: string | null; is_published: boolean; evaluator_id: string;
        updated_at?: string | null;
    }>>([]);
    const [quizPoints, setQuizPoints] = useState<Array<{
        id: string; student_id: string; quiz_name: string | null; subject: string | null; points: number; category: string | null; quiz_date: string; semester_id: string | null;
        created_at?: string | null;
    }>>([]);
    const [mentoringLogs, setMentoringLogs] = useState<any[]>([]);
    const [dailyObservations, setDailyObservations] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [loadError, setLoadError] = useState<string | null>(null);
    const fetchRequestIdRef = useRef(0);

    // ── UI state ─────────────────────────────────────────────────────────────
    // (mentoring search is now encapsulated inside PembinaanTab)

    // ── Violation management (view / add / edit / delete) ────────────────────
    const [isViolationModalOpen, setIsViolationModalOpen] = useState(false);
    const [editingViolation, setEditingViolation] = useState<ViolationRow | null>(null);
    const [isViolationSaving, setIsViolationSaving] = useState(false);
    const [isAddViolationModalOpen, setIsAddViolationModalOpen] = useState(false);
    const [violationStudentId, setViolationStudentId] = useState('');
    const [violationInputMode, setViolationInputMode] = useState<'single' | 'bulk'>('single');
    const [violationSelectedStudentIds, setViolationSelectedStudentIds] = useState<string[]>([]);
    const [violationStudentSearch, setViolationStudentSearch] = useState('');

    // ── Quiz point (poin keaktifan) edit/delete ──────────────────────────────
    const [isQuizModalOpen, setIsQuizModalOpen] = useState(false);
    const [editingQuizPoint, setEditingQuizPoint] = useState<QuizPointRow | null>(null);
    const [isQuizSaving, setIsQuizSaving] = useState(false);

    // Collapsible section
    const [showTrendChart, setShowTrendChart] = useState(false);
    const [showMoreActions, setShowMoreActions] = useState(false);

    // ── Student Detail Modal ─────────────────────────────────────────────────
    const [detailStudentId, setDetailStudentId] = useState<string | null>(null);


    // ── Bulk Selection & Export ──────────────────────────────────────────────
    const bulkSelection = useBulkSelection(students);
    const [isBulkExportModalOpen, setIsBulkExportModalOpen] = useState(false);

    // Clear selection when class or month changes
    const clearSelection = bulkSelection.clearSelection;
    useEffect(() => {
        clearSelection();
    }, [selectedClass, selectedMonth, clearSelection]);

    // Dismiss selection on Escape key
    useEffect(() => {
        if (bulkSelection.selectedCount === 0) return;
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                clearSelection();
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [bulkSelection.selectedCount, clearSelection]);

    // ── Keaktifan modal ──────────────────────────────────────────────────────
    const [isKeaktifanModalOpen, setIsKeaktifanModalOpen] = useState(false);

    // ── Mentoring modal ──────────────────────────────────────────────────────
    const [isMentoringModalOpen, setIsMentoringModalOpen] = useState(false);
    const [mentoringClass, setMentoringClass] = useState('');
    const [mentoringTargetType, setMentoringTargetType] = useState<'all' | 'specific'>('all');
    const [mentoringStudentsInClass, setMentoringStudentsInClass] = useState<Array<{ id: string; name: string; parent_phone?: string | null; parent_name?: string | null }>>([]);
    const [mentoringSelectedStudents, setMentoringSelectedStudents] = useState<string[]>([]);
    const [mentoringRole, setMentoringRole] = useState('WALAS');
    const [mentoringDate, setMentoringDate] = useState(formatLocalDate());
    const [mentoringNotes, setMentoringNotes] = useState('');
    const [isMentoringSubmitting, setIsMentoringSubmitting] = useState(false);
    // ── Mentoring edit/delete ─────────────────────────────────────────────
    const [editingMentoringLog, setEditingMentoringLog] = useState<any>(null);
    const [isMentoringEditModalOpen, setIsMentoringEditModalOpen] = useState(false);

    // ── Observation modal (simplified, inline) ───────────────────────────────
    const [isObservationModalOpen, setIsObservationModalOpen] = useState(false);
    const [obsStudentId, setObsStudentId] = useState('');
    const [obsAspect, setObsAspect] = useState('ADAB');
    const [obsIsPositive, setObsIsPositive] = useState(true);
    const [obsNotes, setObsNotes] = useState('');
    const [isObsSubmitting, setIsObsSubmitting] = useState(false);

    // ── Student Attitude records (KI-1 & KI-2) ───────────────────────────────
    const [studentAttitudeMap, setStudentAttitudeMap] = useState<Record<string, { spiritual?: string; social?: string }>>({});

    // ── Data fetching ────────────────────────────────────────────────────────

    useEffect(() => {
        const fetchClasses = async () => {
            const { data } = await supabase.from('classes').select('id, name').is('deleted_at', null).eq('is_archived', false);
            if (data) setClasses(data);
        };
        fetchClasses();
    }, []);

    const fetchAllData = useCallback(async () => {
        // Ignore responses from a previous class/month selection that resolve late.
        const requestId = ++fetchRequestIdRef.current;
        const isStale = () => requestId !== fetchRequestIdRef.current;
        setIsLoading(true);
        setLoadError(null);
        try {
            const [studentsRes, evalsData, viosData, logsData, obsData, attitudeData] = await Promise.all([
                supabase
                    .from('students')
                    .select('id, name, gender, parent_phone, parent_name')
                    .eq('class_id', selectedClass)
                    .is('deleted_at', null)
                    .order('name'),
                bintangService.getMonthlyEvaluations(selectedClass, selectedMonth),
                bintangService.getViolationsForClass(selectedClass, selectedMonth),
                bintangService.getMentoringLogs(selectedClass),
                bintangService.getDailyObservations(selectedClass, selectedMonth),
                bintangService.getAttitudeMapForClassInMonth(selectedClass, selectedMonth),
            ]);
            if (studentsRes.error) throw studentsRes.error;
            if (isStale()) return;

            setStudents(studentsRes.data || []);
            setEvaluations(evalsData || []);
            setViolations(dedupeViolations(viosData || []) as any);
            setMentoringLogs(logsData || []);
            setDailyObservations(obsData || []);
            setStudentAttitudeMap(attitudeData || {});

            // Fetch quiz points (poin keaktifan) for offset calculation
            const studentIds = (studentsRes.data || []).map(s => s.id);
            if (studentIds.length > 0) {
                const [year, monthNum] = selectedMonth.split('-');
                const nextMonthNum = parseInt(monthNum) === 12 ? 1 : parseInt(monthNum) + 1;
                const nextYear = parseInt(monthNum) === 12 ? parseInt(year) + 1 : parseInt(year);
                const monthStart = `${selectedMonth}-01`;
                const monthEnd = `${nextYear}-${nextMonthNum.toString().padStart(2, '0')}-01`;
                const { data: quizData, error: quizError } = await supabase
                    .from('quiz_points')
                    .select('id, student_id, quiz_name, subject, points, category, quiz_date, semester_id, created_at')
                    .in('student_id', studentIds)
                    .is('deleted_at', null)
                    .gte('quiz_date', monthStart)
                    .lt('quiz_date', monthEnd)
                    .limit(1000);
                if (quizError) throw quizError;
                if (isStale()) return;
                setQuizPoints(dedupeQuizPoints((quizData || []) as typeof quizPoints));
            } else {
                setQuizPoints([]);
            }
        } catch (error) {
            console.error('Failed to fetch BINTANG data', error);
            if (!isStale()) {
                setLoadError('Data BINTANG gagal dimuat, jadi nilai yang tampil belum tentu benar. Generate dan Publikasi dinonaktifkan sampai data berhasil dimuat ulang.');
            }
        } finally {
            if (!isStale()) setIsLoading(false);
        }
    }, [selectedClass, selectedMonth]);

    useEffect(() => {
        if (selectedClass && selectedMonth) {
            fetchAllData();
        } else {
            fetchRequestIdRef.current++;
            setIsLoading(false);
            setLoadError(null);
            setStudents([]);
            setViolations([]);
            setEvaluations([]);
            setMentoringLogs([]);
            setStudentAttitudeMap({});
        }
    }, [selectedClass, selectedMonth, fetchAllData]);

    // Fetch students for mentoring modal class selection
    useEffect(() => {
        if (mentoringClass) {
            const fetchStudents = async () => {
                const { data } = await supabase
                    .from('students')
                    .select('id, name, parent_phone, parent_name')
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

    // ── Bulk violation student filtering & selection ─────────────────────────
    const filteredViolationStudents = useMemo(() => {
        if (!violationStudentSearch.trim()) return students;
        const q = violationStudentSearch.toLowerCase();
        return students.filter(s => s.name.toLowerCase().includes(q));
    }, [students, violationStudentSearch]);

    const toggleViolationStudent = (id: string) => {
        setViolationSelectedStudentIds(prev =>
            prev.includes(id) ? prev.filter(sid => sid !== id) : [...prev, id]
        );
    };

    const selectAllViolationStudents = () => {
        setViolationSelectedStudentIds(filteredViolationStudents.map(s => s.id));
    };

    const deselectAllViolationStudents = () => {
        setViolationSelectedStudentIds([]);
    };



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

    const studentViolationsMap = useMemo(() => {
        const map = new Map<string, Array<any>>();
        for (const v of violations) {
            const list = map.get(v.student_id) || [];
            list.push({
                description: v.description,
                // Same matcher as scoring, so note wording follows the graded aspect.
                bintangAspect: getAspectForViolation(v.description),
                category: v.severity,
                context_notes: v.context_notes,
                date: v.date,
                follow_up_status: v.follow_up_status,
                follow_up_notes: v.follow_up_notes,
                recorded_by_name: v.users?.name,
            });
            map.set(v.student_id, list);
        }
        return map;
    }, [violations]);

    // A draft generated before the student's latest violation/keaktifan entry no
    // longer matches the data; Generate refreshes every non-manual grade.
    const staleStudentIds = useMemo(() => {
        const latestInputAt = new Map<string, number>();
        const track = (studentId: string, createdAt?: string | null) => {
            const t = createdAt ? Date.parse(createdAt) : NaN;
            if (!Number.isNaN(t) && t > (latestInputAt.get(studentId) ?? 0)) latestInputAt.set(studentId, t);
        };
        violations.forEach(v => track(v.student_id, v.created_at));
        quizPoints.forEach(q => track(q.student_id, q.created_at));

        const stale = new Set<string>();
        for (const ev of evaluations) {
            if (ev.is_published || !ev.updated_at) continue;
            const latest = latestInputAt.get(ev.student_id);
            if (latest && latest > Date.parse(ev.updated_at)) stale.add(ev.student_id);
        }
        return stale;
    }, [violations, quizPoints, evaluations]);

    const getAspectSummary = (studentId: string): AspectPointsSummary => {
        return studentAspectMap.get(studentId) ?? {
            ADAB: { points: 0, count: 0, grade: 'A' as BintangGrade },
            KEDISIPLINAN: { points: 0, count: 0, grade: 'A' as BintangGrade },
            KERAPIAN: { points: 0, count: 0, grade: 'A' as BintangGrade },
        };
    };

    const getStudentName = (studentId: string) => students.find(s => s.id === studentId)?.name || 'Unknown';

    // ── Evaluation state & handlers (shared hook) ──────────────────────────
    const evalHook = useBintangEvaluation({
        toast,
        confirmPublish,
        confirmUnpublish,
        fetchData: async () => { await fetchAllData(); },
        selectedMonth,
        user,
        students,
        evaluations,
        selectedClass,
        getStudentQuizPoints: (studentId: string) => studentQuizMap.get(studentId)?.totalPoints || 0,
        getStudentViolations: (studentId: string) => studentViolationsMap.get(studentId) || [],
        getStudentAttitude: (studentId: string) => studentAttitudeMap[studentId],
    });

    // ── Handlers ─────────────────────────────────────────────────────────────

    const handleMentoringSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!mentoringClass || !mentoringNotes || isMentoringSubmitting) return;
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
        if (!obsStudentId || !obsNotes || isObsSubmitting) return;

        setIsObsSubmitting(true);
        try {
            await bintangService.insertDailyObservation({
                student_id: obsStudentId,
                teacher_id: user?.id || '',
                date: formatLocalDate(),
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

    // ── Mentoring edit / delete handlers ───────────────────────────────────

    const openEditMentoring = (log: any) => {
        setEditingMentoringLog(log);
        setMentoringDate(log.date);
        setMentoringNotes(log.notes);
        setMentoringRole(log.mentor_role);
        setIsMentoringEditModalOpen(true);
    };

    const handleSaveMentoringEdit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!editingMentoringLog || !mentoringNotes) return;
        setIsMentoringSubmitting(true);
        try {
            await bintangService.updateMentoringLog(editingMentoringLog.id, {
                date: mentoringDate,
                notes: mentoringNotes,
                mentor_role: mentoringRole,
            });
            toast.success('Catatan pembinaan berhasil diperbarui');
            setIsMentoringEditModalOpen(false);
            setEditingMentoringLog(null);
            fetchAllData();
        } catch (error: any) {
            console.error(error);
            toast.error(error.message || 'Gagal memperbarui catatan pembinaan');
        } finally {
            setIsMentoringSubmitting(false);
        }
    };

    const handleDeleteMentoring = async (log: any) => {
        const studentName = (log.students as any)?.name || 'Siswa';
        await confirmDeleteMentoring({
            title: 'Hapus Catatan Pembinaan',
            message: `Yakin ingin menghapus catatan pembinaan untuk ${studentName}?`,
            confirmText: 'Ya, Hapus',
            variant: 'danger',
            onConfirm: async () => {
                try {
                    await bintangService.deleteMentoringLog(log.id);
                    toast.success('Catatan pembinaan berhasil dihapus');
                    await fetchAllData();
                } catch (error: any) {
                    console.error(error);
                    toast.error(error.message || 'Gagal menghapus catatan pembinaan');
                }
            },
        });
    };

    // ── Violation edit / delete handlers ─────────────────────────────────────

    const openEditViolation = (v: ViolationRow) => {
        setEditingViolation(v);
        setIsViolationModalOpen(true);
    };

    const handleSaveViolation = async (data: ViolationFormValues & { evidence_file?: File }) => {
        if (!user || !editingViolation || isViolationSaving) return;
        setIsViolationSaving(true);
        try {
            const selectedViolation = violationList.find(v => v.description === data.description);
            let evidenceUrl = editingViolation.evidence_url || null;

            if (data.evidence_file) {
                const result = await r2StorageService.uploadFile(data.evidence_file, 'violations');
                if (editingViolation.evidence_url) {
                    try {
                        await r2StorageService.deleteFile({ publicUrl: editingViolation.evidence_url });
                    } catch (e) {
                        console.warn('Gagal menghapus bukti lama:', e);
                    }
                }
                evidenceUrl = result.publicUrl;
            }

            const payload = {
                date: data.date,
                description: data.description,
                context_notes: data.context_notes || null,
                points: selectedViolation?.points ?? editingViolation.points ?? 0,
                severity: data.severity || getViolationSeverityFromCategory(selectedViolation?.category) || editingViolation.severity || null,
                evidence_url: evidenceUrl,
            };

            await bintangService.updateViolation(editingViolation.id, payload);
            // Audit log tidak boleh menggagalkan notifikasi sukses jika gagal dicatat.
            try {
                await writeAuditLog({
                    userId: user.id,
                    userEmail: user.email,
                    tableName: 'violations',
                    recordId: editingViolation.id,
                    action: 'UPDATE',
                    oldData: {
                        date: editingViolation.date,
                        description: editingViolation.description,
                        points: editingViolation.points,
                        severity: editingViolation.severity,
                        context_notes: editingViolation.context_notes,
                    },
                    newData: payload,
                });
            } catch (auditErr) {
                console.warn('Gagal menulis audit log pelanggaran:', auditErr);
            }
            toast.success('Pelanggaran berhasil diperbarui');
            setIsViolationModalOpen(false);
            setEditingViolation(null);
            await fetchAllData();
        } catch (error: any) {
            console.error('Gagal memperbarui pelanggaran:', error);
            toast.error(error.message || 'Gagal memperbarui pelanggaran');
        } finally {
            setIsViolationSaving(false);
        }
    };

    const handleDeleteViolation = async (v: ViolationRow) => {
        const studentName = v.students?.name || getStudentName(v.student_id);
        await confirmDeleteViolation({
            title: 'Hapus Pelanggaran',
            message: `Yakin ingin menghapus pelanggaran "${v.description}" milik ${studentName}? Catatan akan dipindah ke tempat sampah (soft delete).`,
            confirmText: 'Ya, Hapus',
            variant: 'danger',
            onConfirm: async () => {
                try {
                    await bintangService.softDeleteViolation(v.id);
                    try {
                        await writeAuditLog({
                            userId: user?.id || '',
                            userEmail: user?.email || '',
                            tableName: 'violations',
                            recordId: v.id,
                            action: 'DELETE',
                            oldData: { description: v.description, points: v.points, date: v.date },
                            newData: null,
                        });
                    } catch (auditErr) {
                        console.warn('Gagal menulis audit log hapus pelanggaran:', auditErr);
                    }
                    toast.success('Pelanggaran berhasil dihapus');
                    await fetchAllData();
                } catch (error: any) {
                    console.error('Gagal menghapus pelanggaran:', error);
                    toast.error(error.message || 'Gagal menghapus pelanggaran');
                }
            },
        });
    };

    const handleAddViolation = async (data: ViolationFormValues & { evidence_file?: File }) => {
        if (!user || isViolationSaving) return;

        const targetIds = violationInputMode === 'single'
            ? (violationStudentId ? [violationStudentId] : [])
            : violationSelectedStudentIds;

        if (targetIds.length === 0) {
            toast.error(violationInputMode === 'single'
                ? 'Pilih siswa terlebih dahulu'
                : 'Pilih minimal satu siswa'
            );
            return;
        }

        setIsViolationSaving(true);
        try {
            const normalizedDesc = (data.description || '').trim().toLowerCase();
            const localDuplicates = new Map<string, typeof violations[0]>();
            for (const sid of targetIds) {
                const match = violations.find(
                    v => v.student_id === sid && v.date === data.date && (v.description || '').trim().toLowerCase() === normalizedDesc
                );
                if (match) localDuplicates.set(sid, match);
            }

            // Always query database across targetIds to prevent race conditions or missing other-session rows
            const { data: dbVios, error: dbErr } = await supabase
                .from('violations')
                .select('id, student_id, date, description, points, severity, context_notes, evidence_url')
                .in('student_id', targetIds)
                .eq('date', data.date)
                .eq('description', data.description)
                .is('deleted_at', null);

            if (dbErr) console.warn('Gagal memeriksa duplikasi pelanggaran di database:', dbErr);

            const dbDuplicates = new Map<string, any>();
            (dbVios || []).forEach((row: any) => {
                dbDuplicates.set(row.student_id, row);
            });

            // Combine local and DB duplicates
            const allDuplicateStudentIds = Array.from(new Set([
                ...Array.from(localDuplicates.keys()),
                ...Array.from(dbDuplicates.keys()),
            ]));

            // CASE 1: Single student mode
            if (violationInputMode === 'single' || targetIds.length === 1) {
                const singleStudentId = targetIds[0];
                const studentObj = students.find(s => s.id === singleStudentId);
                const studentName = studentObj?.name || 'Siswa';

                if (allDuplicateStudentIds.includes(singleStudentId)) {
                    const existingRow = dbDuplicates.get(singleStudentId) || localDuplicates.get(singleStudentId);
                    const shouldUpdate = await confirmDuplicateViolation({
                        title: 'Pelanggaran Sudah Tercatat Hari Ini',
                        message: `${studentName} sudah memiliki catatan pelanggaran "${data.description}" pada hari ini (${data.date}).\n\nApakah Anda ingin memperbarui catatan tersebut dengan keterangan baru?`,
                        confirmText: 'Perbarui Catatan',
                        cancelText: 'Batal',
                        variant: 'warning',
                        onConfirm: async () => {},
                    });

                    if (!shouldUpdate) {
                        return;
                    }

                    // Update existing violation instead of creating duplicate
                    if (existingRow?.id) {
                        const selectedViolation = violationList.find(v => v.description === data.description);
                        let evidenceUrl = existingRow.evidence_url || null;
                        if (data.evidence_file) {
                            const result = await r2StorageService.uploadFile(data.evidence_file, 'violations');
                            evidenceUrl = result.publicUrl;
                        }
                        const updatePayload = {
                            date: data.date,
                            description: data.description,
                            context_notes: data.context_notes || existingRow.context_notes || null,
                            points: selectedViolation?.points ?? existingRow.points ?? 0,
                            severity: data.severity || getViolationSeverityFromCategory(selectedViolation?.category) || existingRow.severity || null,
                            evidence_url: evidenceUrl,
                        };
                        await bintangService.updateViolation(existingRow.id, updatePayload);
                        toast.success(`Catatan pelanggaran ${studentName} berhasil diperbarui`);
                        setIsAddViolationModalOpen(false);
                        setViolationStudentId('');
                        await fetchAllData();
                        return;
                    }
                }
            }

            // CASE 2: Bulk students mode
            let idsToInsert = targetIds;
            if (allDuplicateStudentIds.length > 0) {
                const duplicateNames = allDuplicateStudentIds
                    .map(sid => students.find(s => s.id === sid)?.name || 'Siswa');

                // If ALL selected students already have this record
                if (allDuplicateStudentIds.length >= targetIds.length) {
                    toast.warning(
                        targetIds.length === 1
                            ? `${duplicateNames[0]} sudah memiliki catatan pelanggaran "${data.description}" pada hari ini (${data.date}).`
                            : `Seluruh ${targetIds.length} siswa yang dipilih sudah memiliki catatan pelanggaran "${data.description}" pada hari ini (${data.date}).`
                    );
                    return;
                }

                // If SOME selected students already have this record
                const nonDuplicateIds = targetIds.filter(id => !allDuplicateStudentIds.includes(id));
                const confirmMsg = `${allDuplicateStudentIds.length} siswa (${duplicateNames.slice(0, 3).join(', ')}${allDuplicateStudentIds.length > 3 ? '...' : ''}) sudah memiliki catatan pelanggaran "${data.description}" pada hari ini dan akan dilewati.\n\nLanjutkan mencatat pelanggaran untuk ${nonDuplicateIds.length} siswa lainnya?`;

                const shouldProceed = await confirmDuplicateViolation({
                    title: 'Sebagian Siswa Sudah Tercatat Hari Ini',
                    message: confirmMsg,
                    confirmText: `Catat untuk ${nonDuplicateIds.length} Siswa Lainnya`,
                    cancelText: 'Batal',
                    variant: 'warning',
                    onConfirm: async () => {},
                });

                if (!shouldProceed) {
                    return;
                }

                idsToInsert = nonDuplicateIds;
            }

            if (idsToInsert.length === 0) return;

            const selectedViolation = violationList.find(v => v.description === data.description);
            let evidenceUrl: string | null = null;
            if (data.evidence_file) {
                const result = await r2StorageService.uploadFile(data.evidence_file, 'violations');
                evidenceUrl = result.publicUrl;
            }

            const points = selectedViolation?.points ?? 0;
            const severity = data.severity || getViolationSeverityFromCategory(selectedViolation?.category) || null;
            const type = selectedViolation?.code || 'general';

            const payloads = idsToInsert.map(student_id => ({
                date: data.date,
                description: data.description,
                context_notes: data.context_notes || null,
                points,
                type,
                severity,
                evidence_url: evidenceUrl,
                student_id,
                user_id: user.id,
                semester_id: activeSemester?.id || null,
            }));

            await bintangService.bulkInsertViolations(payloads);
            try {
                await writeAuditLog({
                    userId: user.id,
                    userEmail: user.email,
                    tableName: 'violations',
                    recordId: idsToInsert.length === 1 ? idsToInsert[0] : 'bulk',
                    action: 'INSERT',
                    oldData: null,
                    newData: { count: idsToInsert.length, description: data.description, points } as Record<string, unknown>,
                });
            } catch (auditErr) {
                console.warn('Gagal menulis audit log pelanggaran baru:', auditErr);
            }
            const skippedCount = targetIds.length - idsToInsert.length;
            toast.success(
                idsToInsert.length === 1
                    ? 'Pelanggaran berhasil dicatat'
                    : skippedCount > 0
                        ? `Pelanggaran berhasil dicatat untuk ${idsToInsert.length} siswa (${skippedCount} siswa dilewati karena sudah tercatat)`
                        : `Pelanggaran berhasil dicatat untuk ${idsToInsert.length} siswa`
            );
            setIsAddViolationModalOpen(false);
            setViolationStudentId('');
            setViolationSelectedStudentIds([]);
            setViolationStudentSearch('');
            await fetchAllData();
        } catch (error: any) {
            console.error('Gagal mencatat pelanggaran:', error);
            toast.error(error.message || 'Gagal mencatat pelanggaran');
        } finally {
            setIsViolationSaving(false);
        }
    };

    // ── Poin keaktifan edit / delete ─────────────────────────────────────────

    const openEditQuiz = (q: QuizPointRow) => {
        setEditingQuizPoint(q);
        setIsQuizModalOpen(true);
    };

    const handleSaveQuiz = async (data: QuizFormValues) => {
        if (!user || !editingQuizPoint) return;
        setIsQuizSaving(true);
        try {
            const payload = {
                quiz_date: data.quiz_date,
                subject: data.subject || null,
                quiz_name: data.quiz_name,
                category: data.category || null,
            };
            await bintangService.updateQuizPoint(editingQuizPoint.id, payload);
            try {
                await writeAuditLog({
                    userId: user.id,
                    userEmail: user.email,
                    tableName: 'quiz_points',
                    recordId: editingQuizPoint.id,
                    action: 'UPDATE',
                    oldData: {
                        quiz_date: editingQuizPoint.quiz_date,
                        quiz_name: editingQuizPoint.quiz_name,
                        subject: editingQuizPoint.subject,
                        category: editingQuizPoint.category,
                    },
                    newData: payload,
                });
            } catch (auditErr) {
                console.warn('Gagal menulis audit log poin keaktifan:', auditErr);
            }
            toast.success('Poin keaktifan berhasil diperbarui');
            setIsQuizModalOpen(false);
            setEditingQuizPoint(null);
            await fetchAllData();
        } catch (error: any) {
            console.error('Gagal memperbarui poin keaktifan:', error);
            toast.error(error.message || 'Gagal memperbarui poin keaktifan');
        } finally {
            setIsQuizSaving(false);
        }
    };

    const handleDeleteQuiz = async (q: QuizPointRow) => {
        const studentName = getStudentName(q.student_id);
        await confirmDeleteQuiz({
            title: 'Hapus Poin Keaktifan',
            message: `Yakin ingin menghapus poin keaktifan "${q.quiz_name || 'Aktivitas'}" milik ${studentName}?`,
            confirmText: 'Ya, Hapus',
            variant: 'danger',
            onConfirm: async () => {
                try {
                    await bintangService.softDeleteQuizPoint(q.id);
                    try {
                        await writeAuditLog({
                            userId: user?.id || '',
                            userEmail: user?.email || '',
                            tableName: 'quiz_points',
                            recordId: q.id,
                            action: 'DELETE',
                            oldData: { quiz_name: q.quiz_name, points: q.points, quiz_date: q.quiz_date },
                            newData: null,
                        });
                    } catch (auditErr) {
                        console.warn('Gagal menulis audit log hapus poin:', auditErr);
                    }
                    toast.success('Poin keaktifan berhasil dihapus');
                    await fetchAllData();
                } catch (error: any) {
                    console.error('Gagal menghapus poin keaktifan:', error);
                    toast.error(error.message || 'Gagal menghapus poin keaktifan');
                }
            },
        });
    };

    // ── For non-Walas, show simplified view ─────────────────────────────────
    // Mereka bisa input poin keaktifan & observasi, lihat data read-only

    // ── Main render ──────────────────────────────────────────────────────────

    return (
        <div className="p-4 sm:p-6 lg:p-8 space-y-6">
            {/* ─── Hero Header & Filters Card ─────────────────────────────── */}
            <div className="relative z-20 bg-white dark:bg-slate-800/90 rounded-2xl border border-slate-200/80 dark:border-slate-700/80 shadow-xs">
                <div className="h-1.5 w-full rounded-t-2xl bg-gradient-to-r from-amber-500 via-emerald-500 to-teal-500" />
                <div className="p-4 sm:p-5 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                    <div className="flex items-center gap-3.5 min-w-0">
                        <div className="w-12 h-12 rounded-2xl bg-amber-500 text-white shadow-sm shadow-amber-500/25 flex items-center justify-center shrink-0">
                            <Star size={24} className="fill-white/25" />
                        </div>
                        <div className="min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                                <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight">
                                    Program BINTANG
                                </h1>
                                {selectedClass && !isLoading && (
                                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg text-xs font-semibold bg-slate-100 dark:bg-slate-700/70 text-slate-700 dark:text-slate-200 border border-slate-200/80 dark:border-slate-600/60">
                                        <Users size={12} className="text-brand-500" />
                                        {students.length} Siswa
                                    </span>
                                )}
                            </div>
                            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5">
                                Bina Tertib &amp; Tanggung Jawab Siswa
                            </p>
                        </div>
                    </div>

                    {/* ─── Filters ────────────────────────────────────────────── */}
                    <div className="flex flex-col sm:flex-row gap-2.5 w-full lg:w-auto sm:min-w-[400px]">
                        <div className="flex-1 min-w-[180px]">
                            <CustomDropdown
                                value={selectedClass}
                                onChange={setSelectedClass}
                                placeholder="Pilih Kelas"
                                options={classes.map(c => ({ value: c.id, label: c.name }))}
                            />
                        </div>
                        <div className="flex-1 min-w-[190px]">
                            <CustomDropdown
                                value={selectedMonth}
                                onChange={setSelectedMonth}
                                options={
                                    Array.from({ length: 6 }).map((_, i) => {
                                        const nowWib = new Date(Date.now() + 7 * 60 * 60 * 1000);
                                        const d = new Date(nowWib.getUTCFullYear(), nowWib.getUTCMonth() - i, 1);
                                        const val = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
                                        const label = d.toLocaleDateString('id-ID', { month: 'long', year: 'numeric' });
                                        return { value: val, label };
                                    })
                                }
                            />
                        </div>
                    </div>
                </div>
            </div>

            {/* ─── Empty state ────────────────────────────────────────────── */}
            {!selectedClass && (
                <div className="bg-white dark:bg-slate-800/60 rounded-2xl border border-dashed border-slate-300 dark:border-slate-700 py-14 px-6 text-center text-slate-500 dark:text-slate-400">
                    <div className="w-14 h-14 rounded-2xl bg-amber-500/10 text-amber-600 dark:text-amber-400 mx-auto mb-3.5 flex items-center justify-center border border-amber-500/20">
                        <BarChart3 size={28} />
                    </div>
                    <p className="text-base sm:text-lg font-bold text-slate-800 dark:text-white">Pilih kelas untuk memulai</p>
                    <p className="text-xs sm:text-sm mt-1 max-w-md mx-auto">
                        Semua data ringkasan karakter, poin keaktifan, evaluasi rapor bulanan, dan catatan pembinaan ditampilkan di satu halaman.
                    </p>
                </div>
            )}

            {selectedClass && isLoading && (
                <div className="bg-white dark:bg-slate-800/60 rounded-2xl border border-slate-200/80 dark:border-slate-700/60 py-14 text-center text-slate-500 dark:text-slate-400 text-sm font-medium">
                    Memuat data karakter kelas...
                </div>
            )}

            {/* ─── Main Content (Tabbed) ──────────────────────────────────── */}
            {selectedClass && !isLoading && (
                <Tabs defaultValue="rekap" className="w-full">
                    {/* ─── Tab Navigation ─────────────────────────────────────── */}
                    <TabsList className="w-full max-w-full overflow-x-auto justify-start sm:justify-center">
                        <TabsTrigger value="rekap"><BarChart3 size={16} className="mr-1.5" /> Rekap BINTANG</TabsTrigger>
                        <TabsTrigger value="pembinaan"><ClipboardCheck size={16} className="mr-1.5" /> Pembinaan</TabsTrigger>
                    </TabsList>

                    <TabsContent value="rekap" className="mt-6">
                    <div className="space-y-5">

                    {/* ══════════════════════════════════════════════════════════
                        1. SCORING INFO BANNER (collapsible)
                       ══════════════════════════════════════════════════════════ */}
                    <BintangScoringBanner />

                    {/* ══════════════════════════════════════════════════════════
                        2. SUMMARY CARDS (5 Squircle Icon Badge Cards)
                       ══════════════════════════════════════════════════════════ */}
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5 sm:gap-3.5">
                        {(['ADAB', 'KEDISIPLINAN', 'KERAPIAN'] as const).map(aspect => {
                            const data = classSummary[aspect];
                            const meta = aspectMeta[aspect];
                            const Icon = meta.icon;
                            return (
                                <div
                                    key={aspect}
                                    className="bg-slate-50/80 dark:bg-slate-900/60 rounded-2xl border border-slate-200/80 dark:border-slate-700/60 p-3 sm:p-3.5 flex items-center gap-3 transition-all hover:border-slate-300 dark:hover:border-slate-600"
                                >
                                    <div className={`w-11 h-11 rounded-xl ${meta.badgeBg} flex items-center justify-center shrink-0 shadow-sm`}>
                                        <Icon size={20} className="text-white" />
                                    </div>
                                    <div className="min-w-0">
                                        <p className="text-lg sm:text-xl font-extrabold text-slate-900 dark:text-white leading-tight">
                                            {data.points} <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">poin</span>
                                        </p>
                                        <p className="text-xs font-medium text-slate-500 dark:text-slate-400 truncate mt-0.5">
                                            {meta.label} ({data.count})
                                        </p>
                                    </div>
                                </div>
                            );
                        })}

                        {/* Card 4: Poin Keaktifan Kelas */}
                        <div className="bg-slate-50/80 dark:bg-slate-900/60 rounded-2xl border border-slate-200/80 dark:border-slate-700/60 p-3 sm:p-3.5 flex items-center gap-3 transition-all hover:border-slate-300 dark:hover:border-slate-600">
                            <div className="w-11 h-11 rounded-xl bg-emerald-500 flex items-center justify-center shrink-0 shadow-sm shadow-emerald-500/20">
                                <Zap size={20} className="text-white" />
                            </div>
                            <div className="min-w-0">
                                <p className="text-lg sm:text-xl font-extrabold text-slate-900 dark:text-white leading-tight">
                                    +{quizPoints.reduce((sum, q) => sum + (q.points || 0), 0)} <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">poin</span>
                                </p>
                                <p className="text-xs font-medium text-slate-500 dark:text-slate-400 truncate mt-0.5">
                                    Keaktifan ({quizPoints.length})
                                </p>
                            </div>
                        </div>

                        {/* Card 5: Status Rapor Terbit */}
                        <div className="col-span-2 sm:col-span-1 bg-slate-50/80 dark:bg-slate-900/60 rounded-2xl border border-slate-200/80 dark:border-slate-700/60 p-3 sm:p-3.5 flex items-center gap-3 transition-all hover:border-slate-300 dark:hover:border-slate-600">
                            <div className="w-11 h-11 rounded-xl bg-sky-500 flex items-center justify-center shrink-0 shadow-sm shadow-sky-500/20">
                                <CheckCircle2 size={20} className="text-white" />
                            </div>
                            <div className="min-w-0">
                                <p className="text-lg sm:text-xl font-extrabold text-slate-900 dark:text-white leading-tight">
                                    {evalHook.evalStats.published}<span className="text-sm font-semibold text-slate-400">/{students.length}</span>
                                </p>
                                <p className="text-xs font-medium text-slate-500 dark:text-slate-400 truncate mt-0.5">
                                    Terbit ({evalHook.evalStats.filled} terisi)
                                </p>
                            </div>
                        </div>
                    </div>

                    {loadError && (
                        <div role="alert" className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-rose-200 dark:border-rose-800/60 bg-rose-50 dark:bg-rose-950/30 p-3 text-sm text-rose-800 dark:text-rose-300">
                            <div className="flex items-start gap-2">
                                <AlertTriangle size={16} className="mt-0.5 shrink-0" />
                                <span>{loadError}</span>
                            </div>
                            <Button
                                variant="outline"
                                onClick={() => fetchAllData()}
                                disabled={isLoading}
                                className="h-9 px-3 text-sm rounded-xl border-rose-300 dark:border-rose-700 cursor-pointer"
                            >
                                {isLoading ? 'Memuat...' : 'Muat Ulang'}
                            </Button>
                        </div>
                    )}

                    {isWalas && !loadError && staleStudentIds.size > 0 && (
                        <div role="status" className="flex items-start gap-2 rounded-2xl border border-amber-200 dark:border-amber-800/60 bg-amber-50 dark:bg-amber-950/30 p-3 text-sm text-amber-800 dark:text-amber-300">
                            <AlertTriangle size={16} className="mt-0.5 shrink-0" />
                            <span>
                                {staleStudentIds.size} rapor draft belum memuat pelanggaran atau poin keaktifan terbaru. Klik <strong>Generate</strong> untuk memperbarui sebelum dipublikasikan.
                            </span>
                        </div>
                    )}

                    {/* ══════════════════════════════════════════════════════════
                        3. ACTION BAR (simplified)
                       ══════════════════════════════════════════════════════════ */}
                    <div className="flex flex-wrap items-center justify-between gap-3 bg-white dark:bg-slate-900 p-2.5 rounded-2xl border border-slate-200/80 dark:border-slate-700/80 shadow-xs">

                        {/* Kiri: Aksi Input Utama */}
                        <div className="flex flex-wrap items-center gap-2">
                            {/* Tombol utama selalu terlihat */}
                            <Button
                                onClick={() => setIsKeaktifanModalOpen(true)}
                                className="flex items-center gap-1.5 text-sm h-10 px-4 font-medium bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl shadow-sm shadow-emerald-600/20 cursor-pointer active:scale-95 duration-150"
                            >
                                <Sparkles size={15} />
                                <span>+ Poin Keaktifan</span>
                            </Button>
                            <Button
                                onClick={() => {
                                    setViolationStudentId('');
                                    setViolationSelectedStudentIds([]);
                                    setViolationStudentSearch('');
                                    setIsAddViolationModalOpen(true);
                                }}
                                className="flex items-center gap-1.5 text-sm h-10 px-4 font-medium bg-rose-600 hover:bg-rose-700 text-white rounded-xl shadow-sm shadow-rose-600/20 cursor-pointer active:scale-95 duration-150"
                            >
                                <ShieldAlert size={15} />
                                <span>+ Pelanggaran</span>
                            </Button>

                            {/* Tombol sekunder (toggle) */}
                            <div className="relative">
                                <Button
                                    variant="outline"
                                    onClick={() => setShowMoreActions(v => !v)}
                                    className="flex items-center gap-1.5 text-sm h-10 px-3 font-medium rounded-xl border-slate-200 dark:border-slate-700 cursor-pointer active:scale-95 duration-150"
                                    title="Aksi lainnya"
                                >
                                    <span className="text-slate-600 dark:text-slate-300">Lainnya</span>
                                    <ChevronDown size={14} className={`text-slate-400 transition-transform duration-200 ${showMoreActions ? 'rotate-180' : ''}`} />
                                </Button>
                                {showMoreActions && (
                                    <div className="absolute left-0 top-full mt-1.5 z-20 min-w-[180px] rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-lg py-1">
                                        <button
                                            type="button"
                                            onClick={() => { setIsObservationModalOpen(true); setShowMoreActions(false); }}
                                            className="w-full flex items-center gap-2.5 px-3 py-2.5 text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer active:scale-[0.98] transition-transform"
                                        >
                                            <Eye size={15} className="text-slate-400" /> Observasi Harian
                                        </button>
                                        {isWalas && (
                                            <button
                                                type="button"
                                                onClick={() => { openMentoringModal(); setShowMoreActions(false); }}
                                                className="w-full flex items-center gap-2.5 px-3 py-2.5 text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer active:scale-[0.98] transition-transform"
                                            >
                                                <PlusCircle size={15} className="text-slate-400" /> Catat Pembinaan
                                            </button>
                                        )}
                                        {isWalas && (
                                            <div className="my-1 h-px bg-slate-100 dark:bg-slate-800" />
                                        )}
                                        {isWalas && (
                                            <button
                                                type="button"
                                                onClick={() => { setIsBulkExportModalOpen(true); setShowMoreActions(false); }}
                                                className="w-full flex items-center gap-2.5 px-3 py-2.5 text-sm text-brand-600 dark:text-brand-400 font-medium hover:bg-brand-50 dark:hover:bg-brand-900/20 cursor-pointer active:scale-[0.98] transition-transform"
                                            >
                                                <Download size={15} /> Export Bulk...
                                            </button>
                                        )}
                                        {isWalas && (
                                            <button
                                                type="button"
                                                onClick={() => { evalHook.handleDownloadClassPdf(); setShowMoreActions(false); }}
                                                disabled={evalHook.isDownloadingClass || evalHook.isDownloadingBulk}
                                                className="w-full flex items-center gap-2.5 px-3 py-2.5 text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-50 cursor-pointer active:scale-[0.98] transition-transform"
                                            >
                                                <Printer size={15} className="text-slate-400" /> {evalHook.isDownloadingClass ? 'Proses...' : 'Cetak Rapor Kelas'}
                                            </button>
                                        )}
                                        {isWalas && (
                                            <button
                                                type="button"
                                                onClick={() => { evalHook.handleExportExcel(); setShowMoreActions(false); }}
                                                disabled={evalHook.isExportingExcel || students.length === 0}
                                                className="w-full flex items-center gap-2.5 px-3 py-2.5 text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-50 cursor-pointer active:scale-[0.98] transition-transform"
                                            >
                                                <FileSpreadsheet size={15} className="text-slate-400" /> {evalHook.isExportingExcel ? 'Proses...' : 'Export Rekap Excel'}
                                            </button>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Kanan: Evaluasi Bulanan (Walas only) */}
                        {isWalas && (
                            <div className="flex items-center gap-2">
                                <Button
                                    onClick={() => evalHook.handleGenerateAll(getAspectSummary)}
                                    disabled={evalHook.isGenerating || students.length === 0 || isLoading || !!loadError}
                                    variant="outline"
                                    className="flex items-center gap-1.5 text-sm h-10 px-4 font-medium border-brand-200 dark:border-brand-800/60 text-brand-600 dark:text-brand-400 bg-brand-50/50 dark:bg-brand-900/20 hover:bg-brand-100 dark:hover:bg-brand-900/40 rounded-xl cursor-pointer active:scale-95 duration-150"
                                >
                                    <Zap size={16} />
                                    <span className="hidden sm:inline">{evalHook.isGenerating ? 'Proses...' : 'Generate'}</span>
                                </Button>
                                {evalHook.evalStats.published > 0 && (
                                    <Button
                                        onClick={evalHook.handleUnpublish}
                                        disabled={evalHook.isUnpublishing}
                                        variant="outline"
                                        className="flex items-center gap-1.5 text-sm h-10 px-3.5 font-medium border-amber-300 dark:border-amber-700/60 text-amber-700 dark:text-amber-400 bg-amber-50/70 dark:bg-amber-950/20 hover:bg-amber-100 dark:hover:bg-amber-950/40 rounded-xl shadow-sm cursor-pointer active:scale-95 duration-150"
                                        title="Kembalikan semua rapor terbit ke status Draft agar bisa diedit kembali"
                                    >
                                        <RotateCcw size={15} />
                                        <span className="hidden sm:inline">{evalHook.isUnpublishing ? 'Membatalkan...' : 'Batal Publikasi'}</span>
                                        <span className="sm:hidden">Batal</span>
                                    </Button>
                                )}
                                <Button
                                    onClick={evalHook.handlePublish}
                                    disabled={evaluations.length === 0 || evalHook.isPublishing || isLoading || !!loadError}
                                    className="bg-brand-600 hover:bg-brand-700 text-white flex items-center gap-1.5 text-sm h-10 px-4 font-medium rounded-xl shadow-sm shadow-brand-600/20 cursor-pointer active:scale-95 duration-150"
                                >
                                    <Send size={16} />
                                    <span>Publikasi</span>
                                </Button>
                            </div>
                        )}
                    </div>

                    {/* ─── Evaluation Table & Bulk Action Bar ────────────────────────── */}
                    <BintangEvaluationTable
                        students={students}
                        isWalas={isWalas}
                        bulkSelection={bulkSelection}
                        evalHook={evalHook}
                        getAspectSummary={getAspectSummary}
                        studentQuizMap={studentQuizMap}
                        studentAttitudeMap={studentAttitudeMap}
                        selectedMonth={selectedMonth}
                        onOpenDetail={(studentId) => setDetailStudentId(studentId)}
                        onOpenBulkExport={() => setIsBulkExportModalOpen(true)}
                        staleStudentIds={staleStudentIds}
                    />

                    {/* ══════════════════════════════════════════════════════════
                        8. COLLAPSIBLE: TREN BULANAN
                       ══════════════════════════════════════════════════════════ */}
                    <div className="rounded-2xl border border-slate-200/80 dark:border-slate-700/60 bg-white dark:bg-slate-900 overflow-hidden shadow-xs">
                        <button
                            type="button"
                            onClick={() => setShowTrendChart(!showTrendChart)}
                            className="w-full flex items-center justify-between px-4 py-3.5 sm:px-5 sm:py-4 text-left hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-all cursor-pointer active:scale-[0.99] duration-150"
                        >
                            <div className="flex items-center gap-3">
                                <div className="w-9 h-9 rounded-xl bg-brand-600 flex items-center justify-center shrink-0 shadow-sm shadow-brand-600/20">
                                    <TrendingUp size={18} className="text-white" />
                                </div>
                                <div>
                                    <p className="font-bold text-sm text-slate-800 dark:text-white leading-tight">Tren Bulanan</p>
                                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Grafik perkembangan poin per aspek karakter</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-1.5 shrink-0 ml-3 px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-xs font-medium text-slate-600 dark:text-slate-300">
                                <span className="hidden sm:inline">{showTrendChart ? 'Tutup' : 'Grafik'}</span>
                                <ChevronDown size={15} className={`text-slate-500 transition-transform duration-300 ${showTrendChart ? 'rotate-180' : ''}`} />
                            </div>
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
                    </TabsContent>

                    {/* ══ TAB: PEMBINAAN ══ */}
                    <TabsContent value="pembinaan" className="mt-6">
                        <PembinaanTab
                            mentoringLogs={mentoringLogs}
                            isWalas={isWalas}
                            onOpenMentoringModal={openMentoringModal}
                            onOpenEditMentoring={openEditMentoring}
                            onDeleteMentoring={handleDeleteMentoring}
                        />
                    </TabsContent>
                </Tabs>
            )}

            {/* ─── Publish & Unpublish Confirmation ───────────────────────────── */}
            {PublishConfirmDialog}
            {UnpublishConfirmDialog}

            {/* ─── Delete Quiz Point Confirmation ────────────────────────────── */}
            {DeleteQuizDialog}

            {/* ─── Delete Violation Confirmation ──────────────────────────────── */}
            {DeleteViolationDialog}

            {/* ─── Delete Mentoring Confirmation ──────────────────────────────── */}
            {DeleteMentoringDialog}

            {/* ─── Duplicate Violation Confirmation ─────────────────────────────── */}
            {DuplicateViolationDialog}

            {/* ─── Action Modals (Evaluation, History, Violations, Quiz, Observation, Mentoring, Download Progress) ─── */}
            <BintangEvaluationModal
                isOpen={evalHook.isEditModalOpen}
                onClose={() => evalHook.setIsEditModalOpen(false)}
                evalHook={evalHook}
                getAspectSummary={getAspectSummary}
                studentViolationsMap={studentViolationsMap}
                studentQuizMap={studentQuizMap}
                studentAttitudeMap={studentAttitudeMap}
            />

            <BintangStudentHistoryModal
                isOpen={!!detailStudentId}
                onClose={() => setDetailStudentId(null)}
                studentId={detailStudentId}
                student={students.find(s => s.id === detailStudentId)}
                violations={violations}
                quizPoints={quizPoints}
                dailyObservations={dailyObservations}
                isWalas={isWalas}
                aspectMeta={aspectMeta}
                onOpenAddViolation={() => {
                    setViolationInputMode('single');
                    setViolationStudentId(detailStudentId!);
                    setViolationSelectedStudentIds([]);
                    setViolationStudentSearch('');
                    setIsAddViolationModalOpen(true);
                }}
                onOpenEditViolation={(v) => {
                    setDetailStudentId(null);
                    openEditViolation(v);
                }}
                onDeleteViolation={(v) => {
                    setDetailStudentId(null);
                    handleDeleteViolation(v);
                }}
                onOpenAddQuiz={() => setIsKeaktifanModalOpen(true)}
                onOpenEditQuiz={(q) => {
                    setDetailStudentId(null);
                    openEditQuiz(q);
                }}
                onDeleteQuiz={(q) => {
                    setDetailStudentId(null);
                    handleDeleteQuiz(q);
                }}
            />

            <BintangAddViolationModal
                isOpen={isAddViolationModalOpen}
                onClose={() => {
                    setIsAddViolationModalOpen(false);
                    setViolationStudentId('');
                    setViolationSelectedStudentIds([]);
                    setViolationStudentSearch('');
                }}
                inputMode={violationInputMode}
                onInputModeChange={setViolationInputMode}
                studentId={violationStudentId}
                onStudentIdChange={setViolationStudentId}
                selectedStudentIds={violationSelectedStudentIds}
                onToggleStudent={toggleViolationStudent}
                onSelectAll={selectAllViolationStudents}
                onDeselectAll={deselectAllViolationStudents}
                studentSearch={violationStudentSearch}
                onStudentSearchChange={setViolationStudentSearch}
                students={students}
                filteredStudents={filteredViolationStudents}
                onSubmit={handleAddViolation}
                isSaving={isViolationSaving}
            />

            <BintangEditViolationModal
                isOpen={isViolationModalOpen}
                onClose={() => {
                    setIsViolationModalOpen(false);
                    setEditingViolation(null);
                }}
                editingViolation={editingViolation}
                studentName={editingViolation?.students?.name || getStudentName(editingViolation?.student_id || '') || 'Siswa'}
                onSubmit={handleSaveViolation}
                isSaving={isViolationSaving}
            />

            <BintangKeaktifanModal
                isOpen={isKeaktifanModalOpen}
                onClose={() => setIsKeaktifanModalOpen(false)}
                students={students}
                userId={user?.id || ''}
                onSuccess={fetchAllData}
                semesterId={activeSemester?.id || null}
            />

            <BintangEditQuizModal
                isOpen={isQuizModalOpen}
                onClose={() => {
                    setIsQuizModalOpen(false);
                    setEditingQuizPoint(null);
                }}
                editingQuizPoint={editingQuizPoint}
                studentName={getStudentName(editingQuizPoint?.student_id || '')}
                onSubmit={handleSaveQuiz}
                isSaving={isQuizSaving}
            />

            <BintangObservationModal
                isOpen={isObservationModalOpen}
                onClose={() => setIsObservationModalOpen(false)}
                students={students}
                studentId={obsStudentId}
                onStudentIdChange={setObsStudentId}
                aspect={obsAspect}
                onAspectChange={setObsAspect}
                isPositive={obsIsPositive}
                onIsPositiveChange={setObsIsPositive}
                notes={obsNotes}
                onNotesChange={setObsNotes}
                onSubmit={handleObservationSubmit}
                isSubmitting={isObsSubmitting}
            />

            <BintangMentoringModal
                isOpen={isMentoringModalOpen}
                onClose={() => setIsMentoringModalOpen(false)}
                date={mentoringDate}
                onDateChange={setMentoringDate}
                role={mentoringRole}
                onRoleChange={setMentoringRole}
                mentoringClass={mentoringClass}
                onMentoringClassChange={setMentoringClass}
                classes={classes}
                targetType={mentoringTargetType}
                onTargetTypeChange={setMentoringTargetType}
                studentsInClass={mentoringStudentsInClass}
                selectedStudents={mentoringSelectedStudents}
                onSelectedStudentsChange={setMentoringSelectedStudents}
                notes={mentoringNotes}
                onNotesChange={setMentoringNotes}
                onSubmit={handleMentoringSubmit}
                isSubmitting={isMentoringSubmitting}
            />

            <BintangMentoringEditModal
                isOpen={isMentoringEditModalOpen}
                onClose={() => {
                    setIsMentoringEditModalOpen(false);
                    setEditingMentoringLog(null);
                }}
                date={mentoringDate}
                onDateChange={setMentoringDate}
                role={mentoringRole}
                onRoleChange={setMentoringRole}
                notes={mentoringNotes}
                onNotesChange={setMentoringNotes}
                onSubmit={handleSaveMentoringEdit}
                isSubmitting={isMentoringSubmitting}
            />

            <BintangDownloadProgressModal
                progress={(evalHook.isDownloadingClass || evalHook.isDownloadingBulk) ? evalHook.downloadProgress : null}
            />

            {/* ─── Bulk Export Modal ───────────────────────────────────────────── */}
            {isBulkExportModalOpen && (
                <BintangBulkExportModal
                    isOpen={isBulkExportModalOpen}
                    onClose={() => setIsBulkExportModalOpen(false)}
                    classNameTitle={classes.find(c => c.id === selectedClass)?.name || 'Kelas'}
                    selectedMonth={selectedMonth}
                    students={students}
                    selectedStudentIds={bulkSelection.selectedItems}
                    evaluations={evaluations}
                    getAspectSummary={getAspectSummary}
                    onExportPdf={async (ids) => {
                        await evalHook.handleDownloadBulkPdf(ids);
                        setIsBulkExportModalOpen(false);
                    }}
                    onExportExcel={async (ids) => {
                        await evalHook.handleExportExcel(ids);
                        setIsBulkExportModalOpen(false);
                    }}
                    isExporting={evalHook.isDownloadingBulk || evalHook.isExportingExcel}
                    progress={evalHook.downloadProgress}
                />
            )}
        </div>
    );
};

export default BintangDashboardPage;
