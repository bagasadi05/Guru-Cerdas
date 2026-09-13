import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { MotionDiv, AnimatePresence } from '../../ui/MotionComponents';
import { Star, ClipboardCheck, BarChart3,
    Sparkles, Zap, Send, PlusCircle, Printer,
    ChevronDown, TrendingUp, Eye, FileSpreadsheet,
    ShieldAlert, Download, RotateCcw
} from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../../../hooks/useAuth';
import { supabase } from '../../../services/supabase';
import { bintangService, calculateAspectPoints, type AspectPointsSummary, type BintangGrade } from '../../../services/bintangService';
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



// ─── Violation severity helpers ─────────────────────────────────────────────

const getViolationSeverityFromCategory = (category?: string): SeverityLevel | null => {
    const normalized = category?.toLowerCase();
    if (normalized === 'ringan' || normalized === 'sedang' || normalized === 'berat') {
        return normalized as SeverityLevel;
    }
    return null;
};

/** Bulan berjalan dalam WIB (UTC+7) — hindari off-by-one di 00:00–07:00 WIB. */
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
    const [students, setStudents] = useState<Array<{ id: string; name: string; parent_phone?: string | null; parent_name?: string | null }>>([]);
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
    }>>([]);
    const [quizPoints, setQuizPoints] = useState<Array<{
        id: string; student_id: string; quiz_name: string | null; subject: string | null; points: number; category: string | null; quiz_date: string; semester_id: string | null;
    }>>([]);
    const [mentoringLogs, setMentoringLogs] = useState<any[]>([]);
    const [dailyObservations, setDailyObservations] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(false);

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
    const [mentoringDate, setMentoringDate] = useState(new Date().toISOString().split('T')[0]);
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
        setIsLoading(true);
        try {
            const [studentsRes, evalsData, viosData, logsData, obsData, attitudeData] = await Promise.all([
                supabase
                    .from('students')
                    .select('id, name, parent_phone, parent_name')
                    .eq('class_id', selectedClass)
                    .is('deleted_at', null)
                    .order('name'),
                bintangService.getMonthlyEvaluations(selectedClass, selectedMonth),
                bintangService.getViolationsForClass(selectedClass, selectedMonth),
                bintangService.getMentoringLogs(selectedClass),
                bintangService.getDailyObservations(selectedClass, selectedMonth),
                bintangService.getAttitudeMapForClass(selectedClass),
            ]);

            setStudents(studentsRes.data || []);
            setEvaluations(evalsData || []);
            setViolations(viosData || []);
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
                const { data: quizData } = await supabase
                    .from('quiz_points')
                    .select('id, student_id, quiz_name, subject, points, category, quiz_date, semester_id')
                    .in('student_id', studentIds)
                    .is('deleted_at', null)
                    .gte('quiz_date', monthStart)
                    .lt('quiz_date', monthEnd)
                    .limit(1000);
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
            const item = violationList.find(i => i.description === v.description);
            list.push({
                description: v.description,
                bintangAspect: item?.bintangAspect,
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
        if (!user || !editingViolation) return;
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
        if (!user) return;

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

        // Soft duplicate warning (harian) — scoped ke siswa-siswa yang dipilih
        let duplicateStudentNames = targetIds
            .filter(sid => violations.some(v => v.student_id === sid && v.date === data.date && v.description === data.description))
            .map(sid => students.find(s => s.id === sid)?.name || 'Siswa');

        // Query database Supabase jika state lokal violations belum mencakup catatan terbaru
        if (duplicateStudentNames.length === 0) {
            const { data: dbVios } = await supabase
                .from('violations')
                .select('student_id')
                .in('student_id', targetIds)
                .eq('date', data.date)
                .eq('description', data.description)
                .is('deleted_at', null);

            if (dbVios && dbVios.length > 0) {
                const dbIds = new Set(dbVios.map((r: any) => r.student_id));
                duplicateStudentNames = targetIds
                    .filter(sid => dbIds.has(sid))
                    .map(sid => students.find(s => s.id === sid)?.name || 'Siswa');
            }
        }

        if (duplicateStudentNames.length > 0) {
            const msg = duplicateStudentNames.length === 1
                ? `${duplicateStudentNames[0]} sudah memiliki catatan pelanggaran "${data.description}" pada hari ini (${data.date}).\n\nApakah Anda yakin ingin tetap mencatat pelanggaran ini?`
                : `${duplicateStudentNames.length} siswa (${duplicateStudentNames.slice(0, 3).join(', ')}${duplicateStudentNames.length > 3 ? '...' : ''}) sudah memiliki catatan pelanggaran "${data.description}" pada hari ini (${data.date}).\n\nApakah Anda yakin ingin tetap mencatat pelanggaran ini?`;

            const ok = await confirmDuplicateViolation({
                title: 'Pelanggaran Sudah Tercatat Hari Ini',
                message: msg,
                confirmText: 'Tetap Tambahkan',
                variant: 'warning',
                onConfirm: async () => {},
            });
            if (!ok) return;
        }

        setIsViolationSaving(true);
        try {
            const selectedViolation = violationList.find(v => v.description === data.description);
            let evidenceUrl: string | null = null;
            if (data.evidence_file) {
                const result = await r2StorageService.uploadFile(data.evidence_file, 'violations');
                evidenceUrl = result.publicUrl;
            }

            const points = selectedViolation?.points ?? 0;
            const severity = data.severity || getViolationSeverityFromCategory(selectedViolation?.category) || null;
            const type = selectedViolation?.code || 'general';

            const payloads = targetIds.map(student_id => ({
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
                    recordId: targetIds.length === 1 ? targetIds[0] : 'bulk',
                    action: 'INSERT',
                    oldData: null,
                    newData: { count: targetIds.length, description: data.description, points } as Record<string, unknown>,
                });
            } catch (auditErr) {
                console.warn('Gagal menulis audit log pelanggaran baru:', auditErr);
            }
            toast.success(
                targetIds.length === 1
                    ? 'Pelanggaran berhasil dicatat'
                    : `Pelanggaran berhasil dicatat untuk ${targetIds.length} siswa`
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
            {/* ─── Header ─────────────────────────────────────────────────── */}
            <div className="flex flex-col gap-4">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-bold text-slate-800 dark:text-white flex items-center gap-2.5">
                            <div className="p-2 rounded-xl bg-amber-500/10 text-amber-700 border border-amber-500/20">
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
                                const nowWib = new Date(Date.now() + 7 * 60 * 60 * 1000);
                                const d = new Date(nowWib.getUTCFullYear(), nowWib.getUTCMonth() - i, 1);
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

            {/* ─── Main Content (Tabbed) ──────────────────────────────────── */}
            {selectedClass && !isLoading && (
                <Tabs defaultValue="rekap" className="w-full">
                    {/* ─── Tab Navigation ─────────────────────────────────────── */}
                    <TabsList className="w-full max-w-full overflow-x-auto justify-start sm:justify-center">
                        <TabsTrigger value="rekap"><BarChart3 size={16} className="mr-1.5" /> Rekap BINTANG</TabsTrigger>
                        <TabsTrigger value="pembinaan"><ClipboardCheck size={16} className="mr-1.5" /> Pembinaan</TabsTrigger>
                    </TabsList>

                    <TabsContent value="rekap" className="mt-6">
                    <div className="space-y-6">

                    {/* ══════════════════════════════════════════════════════════
                        1. SCORING INFO BANNER (collapsible)
                       ══════════════════════════════════════════════════════════ */}
                    <BintangScoringBanner />

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
                        3. ACTION BAR — simplified
                       ══════════════════════════════════════════════════════════ */}
                    <div className="flex flex-wrap items-center justify-between gap-3 bg-white dark:bg-slate-900 p-2 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">

                        {/* Kiri: Aksi Input Utama */}
                        <div className="flex flex-wrap items-center gap-2">
                            {/* Tombol utama selalu terlihat */}
                            <Button
                                onClick={() => setIsKeaktifanModalOpen(true)}
                                className="flex items-center gap-1.5 text-sm h-10 px-4 font-medium bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl shadow-sm shadow-emerald-600/20"
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
                                className="flex items-center gap-1.5 text-sm h-10 px-4 font-medium bg-rose-600 hover:bg-rose-700 text-white rounded-xl shadow-sm shadow-rose-600/20"
                            >
                                <ShieldAlert size={15} />
                                <span>+ Pelanggaran</span>
                            </Button>

                            {/* Tombol sekunder — toggle */}
                            <div className="relative">
                                <Button
                                    variant="outline"
                                    onClick={() => setShowMoreActions(v => !v)}
                                    className="flex items-center gap-1.5 text-sm h-10 px-3 font-medium rounded-xl border-slate-200 dark:border-slate-700"
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
                                            className="w-full flex items-center gap-2.5 px-3 py-2.5 text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"
                                        >
                                            <Eye size={15} className="text-slate-400" /> Observasi Harian
                                        </button>
                                        {isWalas && (
                                            <button
                                                type="button"
                                                onClick={() => { openMentoringModal(); setShowMoreActions(false); }}
                                                className="w-full flex items-center gap-2.5 px-3 py-2.5 text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"
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
                                                className="w-full flex items-center gap-2.5 px-3 py-2.5 text-sm text-brand-600 dark:text-brand-400 font-medium hover:bg-brand-50 dark:hover:bg-brand-900/20"
                                            >
                                                <Download size={15} /> Export Bulk...
                                            </button>
                                        )}
                                        {isWalas && (
                                            <button
                                                type="button"
                                                onClick={() => { evalHook.handleDownloadClassPdf(); setShowMoreActions(false); }}
                                                disabled={evalHook.isDownloadingClass || evalHook.isDownloadingBulk}
                                                className="w-full flex items-center gap-2.5 px-3 py-2.5 text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-50"
                                            >
                                                <Printer size={15} className="text-slate-400" /> {evalHook.isDownloadingClass ? 'Proses...' : 'Cetak Rapor Kelas'}
                                            </button>
                                        )}
                                        {isWalas && (
                                            <button
                                                type="button"
                                                onClick={() => { evalHook.handleExportExcel(); setShowMoreActions(false); }}
                                                disabled={evalHook.isExportingExcel || students.length === 0}
                                                className="w-full flex items-center gap-2.5 px-3 py-2.5 text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-50"
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
                                    disabled={evalHook.isGenerating || students.length === 0}
                                    variant="outline"
                                    className="flex items-center gap-1.5 text-sm h-10 px-4 font-medium border-brand-200 dark:border-brand-800/60 text-brand-600 dark:text-brand-400 bg-brand-50/50 dark:bg-brand-900/20 hover:bg-brand-100 dark:hover:bg-brand-900/40 rounded-xl"
                                >
                                    <Zap size={16} />
                                    <span className="hidden sm:inline">{evalHook.isGenerating ? 'Proses...' : 'Generate'}</span>
                                </Button>
                                {evalHook.evalStats.published > 0 && (
                                    <Button
                                        onClick={evalHook.handleUnpublish}
                                        disabled={evalHook.isUnpublishing}
                                        variant="outline"
                                        className="flex items-center gap-1.5 text-sm h-10 px-3.5 font-medium border-amber-300 dark:border-amber-700/60 text-amber-700 dark:text-amber-400 bg-amber-50/70 dark:bg-amber-950/20 hover:bg-amber-100 dark:hover:bg-amber-950/40 rounded-xl shadow-sm"
                                        title="Kembalikan semua rapor terbit ke status Draft agar bisa diedit kembali"
                                    >
                                        <RotateCcw size={15} />
                                        <span className="hidden sm:inline">{evalHook.isUnpublishing ? 'Membatalkan...' : 'Batal Publikasi'}</span>
                                        <span className="sm:hidden">Batal</span>
                                    </Button>
                                )}
                                <Button
                                    onClick={evalHook.handlePublish}
                                    disabled={evaluations.length === 0 || evalHook.isPublishing}
                                    className="bg-brand-600 hover:bg-brand-700 text-white flex items-center gap-1.5 text-sm h-10 px-4 font-medium rounded-xl shadow-sm shadow-brand-600/20"
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
                    />

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
                                <TrendingUp size={20} className="text-brand-500" />
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
