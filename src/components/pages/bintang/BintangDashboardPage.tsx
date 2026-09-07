import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { MotionDiv, AnimatePresence } from '../../ui/MotionComponents';import { Star, ClipboardCheck, BarChart3,
    Sparkles, Zap, Send, FileText, CheckCircle, PlusCircle, Info, Printer,
    ChevronDown, TrendingUp, Eye, Users, FileSpreadsheet,
    Pencil, Trash2, ShieldAlert, Plus, Download, Loader2, X
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
import { useBulkSelection } from '../../advanced-features/useBulkSelection';
import { BintangBulkExportModal } from './components/BintangBulkExportModal';
import { ViolationForm } from '../student/forms/ViolationForm';
import { QuizForm } from '../student/forms/QuizForm';
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
    const [students, setStudents] = useState<Array<{ id: string; name: string }>>([]);
    const [violations, setViolations] = useState<Array<{
        id: string; student_id: string; user_id: string | null; description: string; points: number;
        date: string; severity: string | null; semester_id: string | null; type: string | null;
        context_notes: string | null; evidence_url: string | null; created_at: string;
        students: { name: string } | null;
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
    const [mentoringStudentsInClass, setMentoringStudentsInClass] = useState<Array<{ id: string; name: string }>>([]);
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
            const [studentsRes, evalsData, viosData, logsData, obsData] = await Promise.all([
                supabase
                    .from('students')
                    .select('id, name')
                    .eq('class_id', selectedClass)
                    .is('deleted_at', null)
                    .order('name'),
                bintangService.getMonthlyEvaluations(selectedClass, selectedMonth),
                bintangService.getViolationsForClass(selectedClass, selectedMonth),
                bintangService.getMentoringLogs(selectedClass),
                bintangService.getDailyObservations(selectedClass, selectedMonth),
            ]);

            setStudents(studentsRes.data || []);
            setEvaluations(evalsData || []);
            setViolations(viosData || []);
            setMentoringLogs(logsData || []);
            setDailyObservations(obsData || []);

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
        const map = new Map<string, Array<{ description: string; bintangAspect?: 'ADAB' | 'KEDISIPLINAN' | 'KERAPIAN'; category?: string | null }>>();
        for (const v of violations) {
            const list = map.get(v.student_id) || [];
            const item = violationList.find(i => i.description === v.description);
            list.push({
                description: v.description,
                bintangAspect: item?.bintangAspect,
                category: v.severity,
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

                    {/* ─── In-Flow Bulk Action Bar (Di bawah tombol Keaktifan) ──────────── */}
                    <AnimatePresence>
                        {isWalas && bulkSelection.selectedCount > 0 && (
                            <MotionDiv
                                initial={{ opacity: 0, height: 0, y: -6 }}
                                animate={{ opacity: 1, height: 'auto', y: 0 }}
                                exit={{ opacity: 0, height: 0, y: -6 }}
                                transition={{ duration: 0.22, ease: 'easeOut' }}
                                className="overflow-hidden"
                            >
                                <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-900 dark:bg-slate-850 text-white p-3 sm:px-4 sm:py-3 rounded-2xl shadow-md border border-slate-700/80">
                                    {/* Kiri: Status pilihan */}
                                    <div className="flex items-center gap-3">
                                        <div className="flex items-center gap-2 px-2.5 py-1.5 rounded-xl bg-brand-500/20 border border-brand-500/30 text-brand-300">
                                            <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-brand-600 text-white text-xs font-bold shadow-sm">
                                                {bulkSelection.selectedCount}
                                            </span>
                                            <span className="text-sm font-semibold">
                                                siswa dipilih
                                            </span>
                                        </div>

                                        <button
                                            type="button"
                                            onClick={bulkSelection.isAllSelected ? bulkSelection.clearSelection : bulkSelection.selectAll}
                                            className="text-xs sm:text-sm font-medium text-slate-300 hover:text-white hover:bg-white/10 px-2.5 py-1.5 rounded-lg transition-colors"
                                        >
                                            {bulkSelection.isAllSelected ? 'Batal Pilih Semua' : `Pilih Semua (${students.length})`}
                                        </button>
                                    </div>

                                    {/* Kanan: Tombol-tombol aksi */}
                                    <div className="flex items-center gap-2">
                                        <Button
                                            onClick={async () => {
                                                await evalHook.handleDownloadBulkPdf(Array.from(bulkSelection.selectedItems));
                                            }}
                                            disabled={evalHook.isDownloadingBulk}
                                            className="flex items-center gap-1.5 text-xs sm:text-sm h-10 px-4 font-medium bg-brand-600 hover:bg-brand-500 text-white rounded-xl shadow-sm active:scale-95"
                                        >
                                            {evalHook.isDownloadingBulk ? (
                                                <Loader2 className="h-4 w-4 animate-spin" />
                                            ) : (
                                                <Printer size={16} />
                                            )}
                                            <span>Cetak PDF</span>
                                        </Button>

                                        <Button
                                            onClick={async () => {
                                                await evalHook.handleExportExcel(Array.from(bulkSelection.selectedItems));
                                            }}
                                            disabled={evalHook.isExportingExcel}
                                            className="flex items-center gap-1.5 text-xs sm:text-sm h-10 px-4 font-medium bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl shadow-sm active:scale-95"
                                        >
                                            {evalHook.isExportingExcel ? (
                                                <Loader2 className="h-4 w-4 animate-spin" />
                                            ) : (
                                                <FileSpreadsheet size={16} />
                                            )}
                                            <span>Export Excel</span>
                                        </Button>

                                        <Button
                                            variant="outline"
                                            onClick={() => setIsBulkExportModalOpen(true)}
                                            className="flex items-center gap-1.5 text-xs sm:text-sm h-10 px-3.5 font-medium bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700 rounded-xl active:scale-95"
                                        >
                                            <Download size={15} />
                                            <span className="hidden sm:inline">Opsi Export...</span>
                                            <span className="sm:hidden">Opsi</span>
                                        </Button>

                                        <button
                                            type="button"
                                            onClick={bulkSelection.clearSelection}
                                            className="p-2 text-slate-400 hover:text-white hover:bg-white/10 rounded-xl transition-colors ml-1"
                                            aria-label="Batalkan pilihan (Esc)"
                                            title="Batalkan pilihan (Esc)"
                                        >
                                            <X className="h-5 w-5" />
                                        </button>
                                    </div>
                                </div>
                            </MotionDiv>
                        )}
                    </AnimatePresence>

                    {/* ══════════════════════════════════════════════════════════
                        4. PROGRESS BAR (evaluation fill status) — Walas only
                       ══════════════════════════════════════════════════════════ */}
                    {isWalas && students.length > 0 && (
                        <div className="flex items-center gap-4 text-sm">
                            <div className="flex-1 bg-slate-200 dark:bg-slate-700 rounded-full h-2.5 overflow-hidden">
                                <div
                                    className="bg-brand-600 h-2.5 rounded-full transition-all duration-500"
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
                                        {isWalas && (
                                            <th className="py-2.5 px-3 w-10 text-center">
                                                <input
                                                    type="checkbox"
                                                    checked={bulkSelection.isAllSelected}
                                                    ref={(el) => {
                                                        if (el) el.indeterminate = bulkSelection.isPartiallySelected;
                                                    }}
                                                    onChange={bulkSelection.toggleAll}
                                                    className="rounded border-slate-300 dark:border-slate-600 text-brand-600 focus:ring-brand-500 h-4 w-4 cursor-pointer"
                                                    aria-label="Pilih semua siswa"
                                                />
                                            </th>
                                        )}
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
                                            <td colSpan={isWalas ? 8 : 7} className="text-center py-10 text-slate-500">
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
                                                <tr
                                                    key={student.id}
                                                    className={`border-b border-slate-100 dark:border-slate-800 transition-colors ${
                                                        bulkSelection.isSelected(student.id)
                                                            ? 'bg-brand-50/60 dark:bg-brand-900/20'
                                                            : 'hover:bg-slate-50 dark:hover:bg-slate-800/50'
                                                    }`}
                                                >
                                                    {isWalas && (
                                                        <td className="py-2 px-3 text-center">
                                                            <input
                                                                type="checkbox"
                                                                checked={bulkSelection.isSelected(student.id)}
                                                                onChange={() => bulkSelection.toggleItem(student.id)}
                                                                className="rounded border-slate-300 dark:border-slate-600 text-brand-600 focus:ring-brand-500 h-4 w-4 cursor-pointer"
                                                                aria-label={`Pilih ${student.name}`}
                                                            />
                                                        </td>
                                                    )}
                                                    <td className="py-2 px-2 sm:py-3 sm:px-4 text-[11px] sm:text-sm font-medium text-slate-900 dark:text-white max-w-[90px] sm:max-w-none truncate" title={student.name}>
                                                        <div className="flex items-center gap-1.5">
                                                            <span className="truncate">{student.name}</span>
                                                            {hasKeaktifan && (
                                                                <span className="shrink-0 text-[10px] px-1.5 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 font-semibold" title={`+${activePts.totalPoints} poin keaktifan`}>
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
                                                        const score = (ev?.[field] || aspect[aspectKey].grade) as BintangGrade;
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
                                                            <Button
                                                                variant="outline"
                                                                size="sm"
                                                                className="px-1.5 py-1 sm:px-3 sm:py-1.5 h-auto min-h-[44px] min-w-[44px] sm:min-h-0 sm:min-w-0"
                                                                onClick={() => setDetailStudentId(student.id)}
                                                                title="Detail & Riwayat"
                                                            >
                                                                <Eye size={14} className="sm:mr-1 text-slate-500 dark:text-slate-400" />
                                                                <span className="hidden lg:inline text-slate-600 dark:text-slate-300">Detail</span>
                                                            </Button>
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

            {/* ─── Publish Confirmation ──────────────────────────────────────── */}
            {PublishConfirmDialog}

            {/* ─── Delete Quiz Point Confirmation ────────────────────────────── */}
            {DeleteQuizDialog}

            {/* ─── Delete Violation Confirmation ──────────────────────────────── */}
            {DeleteViolationDialog}

            {/* ─── Delete Mentoring Confirmation ──────────────────────────────── */}
            {DeleteMentoringDialog}

            {/* ─── Duplicate Violation Confirmation ─────────────────────────────── */}
            {DuplicateViolationDialog}

            {/* ─── Edit Evaluation Modal ─────────────────────────────────────── */}
            <Modal
                isOpen={evalHook.isEditModalOpen}
                onClose={() => evalHook.setIsEditModalOpen(false)}
                title={`Rapor BINTANG: ${evalHook.editingStudent?.name}`}
                maxWidth="max-w-2xl"
            >
                <form onSubmit={(e) => evalHook.handleSaveEvaluation(e, getAspectSummary)} className="space-y-4 pt-4">
                    <div className="flex items-start gap-3 p-3 rounded-lg bg-brand-50 dark:bg-brand-900/20 border border-brand-200 dark:border-brand-800">
                        <Info size={18} className="text-brand-500 mt-0.5 shrink-0" />
                        <p className="text-xs text-brand-700 dark:text-brand-300">
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
                        <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                            <div className="flex items-center gap-2">
                                <FileText size={18} className="text-emerald-600 dark:text-emerald-400" />
                                <span className="font-bold text-sm text-slate-800 dark:text-slate-200">Catatan Wali Kelas</span>
                            </div>
                            <div className="flex items-center gap-2 flex-wrap">
                                {evalHook.editingStudent && (() => {
                                    const vios = studentViolationsMap.get(evalHook.editingStudent.id) || [];
                                    const activePts = studentQuizMap.get(evalHook.editingStudent.id)?.totalPoints || 0;
                                    return (
                                        <div className="flex items-center gap-1.5 flex-wrap">
                                            {vios.length === 0 ? (
                                                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400">
                                                    ✓ 0 Pelanggaran (Teladan)
                                                </span>
                                            ) : (
                                                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400">
                                                    {vios.length} Pelanggaran
                                                </span>
                                            )}
                                            {activePts > 0 && (
                                                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400">
                                                    +{activePts} Keaktifan
                                                </span>
                                            )}
                                        </div>
                                    );
                                })()}
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    onClick={() => evalHook.handleRegenerateHomeroomNote(evalHook.editingStudent, getAspectSummary)}
                                    className="h-7 px-2.5 text-xs text-brand-600 dark:text-brand-400 border-brand-200 dark:border-brand-800 bg-brand-50/50 dark:bg-brand-900/20 hover:bg-brand-100 rounded-lg flex items-center gap-1 shadow-sm"
                                    title="Buat ulang catatan secara otomatis berdasarkan data & nilai terbaru siswa"
                                >
                                    <Sparkles size={12} />
                                    <span>Buat Ulang Otomatis</span>
                                </Button>
                            </div>
                        </div>
                        <div className="w-full">
                            <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                                Tuliskan pesan atau catatan perkembangan umum siswa untuk Orang Tua / Wali (dihasilkan otomatis &amp; dapat disesuaikan)
                            </label>
                            <textarea
                                className="w-full bg-white dark:bg-slate-900/50 border border-slate-300 dark:border-slate-700 rounded-lg p-2.5 text-slate-800 dark:text-slate-200 text-sm focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500 leading-relaxed"
                                rows={4}
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

            {/* ─── Student Detail Modal ──────────────────────────────────────── */}
            <Modal
                isOpen={!!detailStudentId}
                onClose={() => setDetailStudentId(null)}
                title={`Detail Riwayat: ${getStudentName(detailStudentId || '')}`}
                maxWidth="max-w-4xl"
            >
                <div className="pt-4 space-y-6">
                    {/* Pelanggaran Section */}
                    <div>
                        <div className="flex justify-between items-center mb-3">
                            <h3 className="font-semibold text-slate-800 dark:text-white flex items-center gap-2">
                                <ShieldAlert size={18} className="text-rose-500" />
                                Riwayat Pelanggaran
                            </h3>
                            {isWalas && (
                                <Button
                                    size="sm"
                                    onClick={() => {
                                        setViolationInputMode('single');
                                        setViolationStudentId(detailStudentId!);
                                        setViolationSelectedStudentIds([]);
                                        setViolationStudentSearch('');
                                        setIsAddViolationModalOpen(true);
                                    }}
                                    className="bg-rose-100 hover:bg-rose-200 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300 dark:hover:bg-rose-900/50"
                                >
                                    <Plus size={14} className="mr-1" /> Catat
                                </Button>
                            )}
                        </div>
                        <div className="border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden">
                            <table className="w-full text-left text-sm">
                                <thead className="bg-slate-50 dark:bg-slate-800">
                                    <tr>
                                        <th className="py-2 px-3 font-medium text-slate-600 dark:text-slate-300">Tanggal</th>
                                        <th className="py-2 px-3 font-medium text-slate-600 dark:text-slate-300">Pelanggaran</th>
                                        <th className="py-2 px-3 font-medium text-slate-600 dark:text-slate-300 text-center">Poin</th>
                                        {isWalas && <th className="py-2 px-3 text-right font-medium text-slate-600 dark:text-slate-300">Aksi</th>}
                                    </tr>
                                </thead>
                                <tbody>
                                    {violations.filter(v => v.student_id === detailStudentId).length === 0 ? (
                                        <tr><td colSpan={4} className="py-4 text-center text-slate-500">Tidak ada pelanggaran bulan ini</td></tr>
                                    ) : (
                                        violations.filter(v => v.student_id === detailStudentId).map(v => (
                                            <tr key={v.id} className="border-t border-slate-100 dark:border-slate-700/50 hover:bg-slate-50 dark:hover:bg-slate-800/30">
                                                <td className="py-2 px-3 whitespace-nowrap">{new Date(v.date).toLocaleDateString('id-ID')}</td>
                                                <td className="py-2 px-3 text-slate-700 dark:text-slate-300">{v.description}</td>
                                                <td className="py-2 px-3 text-center font-bold text-rose-600 dark:text-rose-400">+{v.points}</td>
                                                {isWalas && (
                                                    <td className="py-2 px-3 text-right whitespace-nowrap">
                                                        <div className="flex justify-end gap-1">
                                                            <button onClick={() => { setDetailStudentId(null); openEditViolation(v as unknown as ViolationRow); }} className="p-1.5 rounded-lg text-slate-400 hover:text-brand-600 hover:bg-brand-50 dark:hover:bg-brand-900/30" title="Edit"><Pencil size={14}/></button>
                                                            <button onClick={() => { setDetailStudentId(null); handleDeleteViolation(v as unknown as ViolationRow); }} className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-900/30" title="Hapus"><Trash2 size={14}/></button>
                                                        </div>
                                                    </td>
                                                )}
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* Keaktifan Section */}
                    <div>
                        <div className="flex justify-between items-center mb-3">
                            <h3 className="font-semibold text-slate-800 dark:text-white flex items-center gap-2">
                                <Sparkles size={18} className="text-emerald-500" />
                                Poin Keaktifan
                            </h3>
                            {isWalas && (
                                <Button
                                    size="sm"
                                    onClick={() => {
                                        setIsKeaktifanModalOpen(true);
                                    }}
                                    className="bg-emerald-100 hover:bg-emerald-200 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300 dark:hover:bg-emerald-900/50"
                                >
                                    <Plus size={14} className="mr-1" /> Tambah
                                </Button>
                            )}
                        </div>
                        <div className="border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden">
                            <table className="w-full text-left text-sm">
                                <thead className="bg-slate-50 dark:bg-slate-800">
                                    <tr>
                                        <th className="py-2 px-3 font-medium text-slate-600 dark:text-slate-300">Tanggal</th>
                                        <th className="py-2 px-3 font-medium text-slate-600 dark:text-slate-300">Aktivitas</th>
                                        <th className="py-2 px-3 font-medium text-slate-600 dark:text-slate-300 text-center">Poin</th>
                                        {isWalas && <th className="py-2 px-3 text-right font-medium text-slate-600 dark:text-slate-300">Aksi</th>}
                                    </tr>
                                </thead>
                                <tbody>
                                    {quizPoints.filter(q => q.student_id === detailStudentId).length === 0 ? (
                                        <tr><td colSpan={4} className="py-4 text-center text-slate-500">Belum ada poin keaktifan bulan ini</td></tr>
                                    ) : (
                                        quizPoints.filter(q => q.student_id === detailStudentId).map(q => (
                                            <tr key={q.id} className="border-t border-slate-100 dark:border-slate-700/50 hover:bg-slate-50 dark:hover:bg-slate-800/30">
                                                <td className="py-2 px-3 whitespace-nowrap">{new Date(q.quiz_date).toLocaleDateString('id-ID')}</td>
                                                <td className="py-2 px-3 text-slate-700 dark:text-slate-300">{q.quiz_name} {q.subject && <span className="ml-1 text-[10px] bg-brand-100 text-brand-700 px-1.5 py-0.5 rounded-full">{q.subject}</span>}</td>
                                                <td className="py-2 px-3 text-center font-bold text-emerald-600 dark:text-emerald-400">+{q.points}</td>
                                                {isWalas && (
                                                    <td className="py-2 px-3 text-right whitespace-nowrap">
                                                        <div className="flex justify-end gap-1">
                                                            <button onClick={() => { setDetailStudentId(null); openEditQuiz(q as unknown as QuizPointRow); }} className="p-1.5 rounded-lg text-slate-400 hover:text-brand-600 hover:bg-brand-50 dark:hover:bg-brand-900/30" title="Edit"><Pencil size={14}/></button>
                                                            <button onClick={() => { setDetailStudentId(null); handleDeleteQuiz(q as unknown as QuizPointRow); }} className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-900/30" title="Hapus"><Trash2 size={14}/></button>
                                                        </div>
                                                    </td>
                                                )}
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* Observasi Harian Section */}
                    <div>
                        <h3 className="font-semibold text-slate-800 dark:text-white flex items-center gap-2 mb-3">
                            <Eye size={18} className="text-brand-500" />
                            Observasi Harian
                        </h3>
                        <div className="border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden">
                            <table className="w-full text-left text-sm">
                                <thead className="bg-slate-50 dark:bg-slate-800">
                                    <tr>
                                        <th className="py-2 px-3 font-medium text-slate-600 dark:text-slate-300">Tanggal</th>
                                        <th className="py-2 px-3 font-medium text-slate-600 dark:text-slate-300">Aspek</th>
                                        <th className="py-2 px-3 font-medium text-slate-600 dark:text-slate-300">Tipe</th>
                                        <th className="py-2 px-3 font-medium text-slate-600 dark:text-slate-300">Catatan</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {dailyObservations.filter((o: any) => o.student_id === detailStudentId).length === 0 ? (
                                        <tr><td colSpan={4} className="py-4 text-center text-slate-500">Belum ada observasi harian bulan ini</td></tr>
                                    ) : (
                                        dailyObservations.filter((o: any) => o.student_id === detailStudentId).map((o: any) => (
                                            <tr key={o.id} className="border-t border-slate-100 dark:border-slate-700/50 hover:bg-slate-50 dark:hover:bg-slate-800/30">
                                                <td className="py-2 px-3 whitespace-nowrap">{new Date(o.date).toLocaleDateString('id-ID')}</td>
                                                <td className="py-2 px-3">
                                                    <span className="text-xs font-medium text-slate-600 dark:text-slate-300">{aspectMeta[o.aspect as keyof typeof aspectMeta]?.label || o.aspect}</span>
                                                </td>
                                                <td className="py-2 px-3">
                                                    {o.is_positive ? (
                                                        <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300">Positif</span>
                                                    ) : (
                                                        <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400">Netral</span>
                                                    )}
                                                </td>
                                                <td className="py-2 px-3 text-slate-600 dark:text-slate-400 max-w-[200px] truncate" title={o.observation}>{o.observation}</td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </Modal>

            {/* ─── Add Violation Modal ──────────────────────────────────────── */}
            <Modal
                isOpen={isAddViolationModalOpen}
                onClose={() => {
                    setIsAddViolationModalOpen(false);
                    setViolationStudentId('');
                    setViolationSelectedStudentIds([]);
                    setViolationStudentSearch('');
                }}
                title="Catat Pelanggaran"
                maxWidth="max-w-xl"
            >
                <div className="pt-2 space-y-4">
                    <div className="flex items-start gap-3 p-3 rounded-lg bg-rose-50 dark:bg-rose-900/20 border border-rose-200 dark:border-rose-800">
                        <ShieldAlert size={18} className="text-rose-500 mt-0.5 shrink-0" />
                        <p className="text-xs text-rose-700 dark:text-rose-300">
                            Pelanggaran yang dicatat akan menambah poin aspek BINTANG siswa (Adab / Disiplin / Rapi) dan menyesuaikan grade otomatis.
                        </p>
                    </div>

                    {/* ─── Input Mode Toggle ────────────────────────────── */}
                    <div className="flex gap-2">
                        <button
                            type="button"
                            onClick={() => setViolationInputMode('single')}
                            className={`flex-1 px-3 py-2 text-sm font-medium rounded-lg transition-all ${
                                violationInputMode === 'single'
                                    ? 'bg-rose-600 text-white shadow-sm'
                                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
                            }`}
                        >
                            Per Siswa
                        </button>
                        <button
                            type="button"
                            onClick={() => setViolationInputMode('bulk')}
                            className={`flex-1 px-3 py-2 text-sm font-medium rounded-lg transition-all ${
                                violationInputMode === 'bulk'
                                    ? 'bg-rose-600 text-white shadow-sm'
                                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
                            }`}
                        >
                            Pilih Banyak Siswa ({students.length} siswa)
                        </button>
                    </div>

                    {/* ─── Student Selection ───────────────────────────── */}
                    {violationInputMode === 'single' ? (
                        <div>
                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                                Siswa <span className="text-rose-500">*</span>
                            </label>
                            <CustomDropdown
                                value={violationStudentId}
                                onChange={setViolationStudentId}
                                placeholder="Pilih siswa..."
                                options={students.map(s => ({ value: s.id, label: s.name }))}
                            />
                        </div>
                    ) : (
                        <div>
                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                                Pilih Siswa ({violationSelectedStudentIds.length} dipilih) <span className="text-rose-500">*</span>
                            </label>
                            <div className="flex gap-2 mb-2">
                                <button
                                    type="button"
                                    onClick={selectAllViolationStudents}
                                    className="text-xs px-2 py-1 rounded bg-rose-100 dark:bg-rose-900/30 text-rose-700 dark:text-rose-300 hover:bg-rose-200 dark:hover:bg-rose-800/50 transition-colors font-medium"
                                >
                                    Pilih Semua
                                </button>
                                <button
                                    type="button"
                                    onClick={deselectAllViolationStudents}
                                    className="text-xs px-2 py-1 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors font-medium"
                                >
                                    Hapus Semua
                                </button>
                            </div>
                            <Input
                                placeholder="Cari nama siswa..."
                                value={violationStudentSearch}
                                onChange={(e) => setViolationStudentSearch(e.target.value)}
                                className="mb-2 text-sm"
                            />
                            <div className="max-h-44 overflow-y-auto border border-slate-200 dark:border-slate-700 rounded-lg p-1.5 bg-slate-50 dark:bg-slate-800/50 space-y-0.5">
                                {filteredViolationStudents.length === 0 ? (
                                    <p className="text-sm text-slate-500 p-2 text-center">Tidak ada siswa ditemukan</p>
                                ) : (
                                    filteredViolationStudents.map(student => (
                                        <label
                                            key={student.id}
                                            className={`flex items-center gap-3 px-2.5 py-1.5 rounded-md cursor-pointer transition-colors ${
                                                violationSelectedStudentIds.includes(student.id)
                                                    ? 'bg-rose-100 dark:bg-rose-900/30'
                                                    : 'hover:bg-slate-100 dark:hover:bg-slate-700/50'
                                            }`}
                                        >
                                            <input
                                                type="checkbox"
                                                checked={violationSelectedStudentIds.includes(student.id)}
                                                onChange={() => toggleViolationStudent(student.id)}
                                                className="rounded text-rose-600 focus:ring-rose-500 w-4 h-4"
                                            />
                                            <span className="text-sm text-slate-700 dark:text-slate-300 font-medium">{student.name}</span>
                                        </label>
                                    ))
                                )}
                            </div>
                        </div>
                    )}

                    <ViolationForm
                        defaultValues={null}
                        onSubmit={handleAddViolation}
                        onClose={() => {
                            setIsAddViolationModalOpen(false);
                            setViolationStudentId('');
                            setViolationSelectedStudentIds([]);
                            setViolationStudentSearch('');
                        }}
                        isPending={isViolationSaving}
                    />
                </div>
            </Modal>

            {/* ─── Edit Violation Modal ──────────────────────────────────────── */}
            <Modal
                isOpen={isViolationModalOpen}
                onClose={() => {
                    setIsViolationModalOpen(false);
                    setEditingViolation(null);
                }}
                title={`Edit Pelanggaran: ${editingViolation?.students?.name || getStudentName(editingViolation?.student_id || '') || 'Siswa'}`}
                maxWidth="max-w-xl"
            >
                <div className="pt-4">
                    {editingViolation && (
                        <ViolationForm
                            defaultValues={editingViolation}
                            onSubmit={handleSaveViolation}
                            onClose={() => setIsViolationModalOpen(false)}
                            isPending={isViolationSaving}
                        />
                    )}
                </div>
            </Modal>

            {/* ─── Keaktifan Modal ──────────────────────────────────────────── */}
            <BintangKeaktifanModal
                isOpen={isKeaktifanModalOpen}
                onClose={() => setIsKeaktifanModalOpen(false)}
                students={students}
                userId={user?.id || ''}
                onSuccess={fetchAllData}
                semesterId={activeSemester?.id || null}
            />

            {/* ─── Edit Poin Keaktifan Modal ────────────────────────────────── */}
            <Modal
                isOpen={isQuizModalOpen}
                onClose={() => {
                    setIsQuizModalOpen(false);
                    setEditingQuizPoint(null);
                }}
                title={`Edit Poin Keaktifan: ${getStudentName(editingQuizPoint?.student_id || '')}`}
                maxWidth="max-w-lg"
            >
                <div className="pt-4">
                    {editingQuizPoint && (
                        <QuizForm
                            defaultValues={editingQuizPoint}
                            onSubmit={handleSaveQuiz}
                            onClose={() => setIsQuizModalOpen(false)}
                            isPending={isQuizSaving}
                        />
                    )}
                </div>
            </Modal>

            {/* ─── Observation Modal (inline, simplified) ──────────────────── */}
            <Modal
                isOpen={isObservationModalOpen}
                onClose={() => setIsObservationModalOpen(false)}
                title="Input Observasi Harian"
            >
                <form onSubmit={handleObservationSubmit} className="space-y-4 pt-2">
                    <div className="flex items-start gap-3 p-3 rounded-lg bg-brand-50 dark:bg-brand-900/20 border border-brand-200 dark:border-brand-800">
                        <Info size={18} className="text-brand-500 mt-0.5 shrink-0" />
                        <p className="text-xs text-brand-700 dark:text-brand-300">
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
                            className="w-full p-2 border border-slate-300 dark:border-slate-700 rounded-md bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-brand-500"
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
                                    <input type="radio" name="mentoringTargetType" value="all" checked={mentoringTargetType === 'all'} onChange={() => setMentoringTargetType('all')} className="text-brand-600 focus:ring-brand-500" />
                                    Seluruh Siswa
                                </label>
                                <label className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300 cursor-pointer">
                                    <input type="radio" name="mentoringTargetType" value="specific" checked={mentoringTargetType === 'specific'} onChange={() => setMentoringTargetType('specific')} className="text-brand-600 focus:ring-brand-500" />
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
                                                        className="rounded text-brand-600 focus:ring-brand-500 w-4 h-4"
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

            {/* ─── Edit Mentoring Modal ─────────────────────────────────────────── */}
            <Modal
                isOpen={isMentoringEditModalOpen}
                onClose={() => { setIsMentoringEditModalOpen(false); setEditingMentoringLog(null); }}
                title="Edit Catatan Pembinaan"
            >
                <form onSubmit={handleSaveMentoringEdit} className="space-y-4 pt-4">
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
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Catatan</label>
                        <textarea
                            className="w-full p-2 border border-slate-300 dark:border-slate-700 rounded-md bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                            rows={4}
                            value={mentoringNotes}
                            onChange={(e) => setMentoringNotes(e.target.value)}
                            required
                        />
                    </div>
                    <div className="flex justify-end gap-3 pt-4 border-t border-slate-200 dark:border-slate-700">
                        <Button type="button" variant="outline" onClick={() => { setIsMentoringEditModalOpen(false); setEditingMentoringLog(null); }}>Batal</Button>
                        <Button type="submit" disabled={isMentoringSubmitting}>
                            {isMentoringSubmitting ? 'Menyimpan...' : 'Simpan'}
                        </Button>
                    </div>
                </form>
            </Modal>

            {/* ─── Progress Modal untuk Cetak Kelas / Bulk ──────────────────── */}
            {(evalHook.isDownloadingClass || evalHook.isDownloadingBulk) && evalHook.downloadProgress && (
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
                                Mengunduh Rapor BINTANG
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
                                        className="h-full bg-gradient-to-r from-emerald-500 to-emerald-600 rounded-full transition-all duration-300 ease-out"
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
