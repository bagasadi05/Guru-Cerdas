import { useState, useMemo, useCallback } from 'react';
import type { BintangGrade, AspectPointsSummary } from '../../../../services/bintangService';
import { bintangService } from '../../../../services/bintangService';
import { downloadBintangReportAction } from '../../../../services/bintangPdfGenerator';
import { exportBintangToExcel } from '../../../../services/bintangExcelExport';
import { generateAutoNote, generateHomeroomNote } from '../bintangConstants';
import { supabase } from '../../../../services/supabase';

// ─── Types ──────────────────────────────────────────────────────────────────

export interface EvaluationFormData {
    adab_score: BintangGrade;
    kedisiplinan_score: BintangGrade;
    kerapian_score: BintangGrade;
    adab_notes: string;
    kedisiplinan_notes: string;
    kerapian_notes: string;
    catatan_wali: string;
}

type ToastFn = { success: (msg: string) => void; error: (msg: string) => void };

export interface UseBintangEvaluationOptions {
    toast: ToastFn;
    confirmPublish: (opts: {
        title: string;
        message: string;
        confirmText: string;
        variant: 'warning' | 'danger' | 'info';
        onConfirm: () => Promise<void>;
    }) => Promise<boolean>;
    fetchData: () => Promise<void>;
    selectedMonth: string;
    user: any;
    students: Array<{ id: string; name: string }>;
    evaluations: Array<{
        id: string; student_id: string; month: string;
        adab_score: string | null; kedisiplinan_score: string | null; kerapian_score: string | null;
        adab_notes: string | null; kedisiplinan_notes: string | null; kerapian_notes: string | null;
        catatan_wali: string | null; is_published: boolean; evaluator_id: string;
    }>;
    selectedClass: string;
    /** Getter function for quiz points — avoids TDZ issues with computed values */
    getStudentQuizPoints?: (studentId: string) => number;
}

export interface UseBintangEvaluationReturn {
    // State
    isEditModalOpen: boolean;
    setIsEditModalOpen: (v: boolean) => void;
    editingStudent: any;
    formData: EvaluationFormData;
    setFormData: React.Dispatch<React.SetStateAction<EvaluationFormData>>;
    isSubmitting: boolean;
    isPublishing: boolean;
    isGenerating: boolean;
    downloadingStudentId: string | null;
    isDownloadingClass: boolean;
    downloadProgress: { current: number; total: number } | null;

    // Getters
    getEvaluationForStudent: (studentId: string) => any;
    evalStats: { filled: number; published: number; total: number };

    // Handlers
    handleOpenEditModal: (student: any, getAspectSummary: (id: string) => AspectPointsSummary) => void;
    handleSaveEvaluation: (e: React.FormEvent, getAspectSummary: (id: string) => AspectPointsSummary) => Promise<void>;
    handleGenerateAll: (getAspectSummary: (id: string) => AspectPointsSummary) => Promise<void>;
    handlePublish: () => Promise<void>;
    handleDownloadSinglePdf: (studentId: string) => Promise<void>;
    handleDownloadClassPdf: () => Promise<void>;
    handleExportExcel: () => Promise<void>;
    isExportingExcel: boolean;
}

// ─── Hook ───────────────────────────────────────────────────────────────────

export function useBintangEvaluation(options: UseBintangEvaluationOptions): UseBintangEvaluationReturn {
    const {
        toast, confirmPublish, fetchData, selectedMonth, user,
        students, evaluations, selectedClass, getStudentQuizPoints,
    } = options;

    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [editingStudent, setEditingStudent] = useState<any>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isPublishing, setIsPublishing] = useState(false);
    const [isGenerating, setIsGenerating] = useState(false);
    const [downloadingStudentId, setDownloadingStudentId] = useState<string | null>(null);
    const [isDownloadingClass, setIsDownloadingClass] = useState(false);
    const [downloadProgress, setDownloadProgress] = useState<{ current: number; total: number } | null>(null);
    const [isExportingExcel, setIsExportingExcel] = useState(false);

    const initialFormData: EvaluationFormData = {
        adab_score: 'A',
        kedisiplinan_score: 'A',
        kerapian_score: 'A',
        adab_notes: '',
        kedisiplinan_notes: '',
        kerapian_notes: '',
        catatan_wali: '',
    };

    const [formData, setFormData] = useState<EvaluationFormData>(initialFormData);

    // Getters
    const getEvaluationForStudent = useCallback(
        (studentId: string) => evaluations.find(e => e.student_id === studentId),
        [evaluations]
    );

    const evalStats = useMemo(() => {
        const filled = evaluations.length;
        const published = evaluations.filter(e => e.is_published).length;
        return { filled, published, total: students.length };
    }, [evaluations, students]);

    // Handlers

    const handleOpenEditModal = useCallback(
        (student: any, getAspectSummary: (id: string) => AspectPointsSummary) => {
            setEditingStudent(student);
            const existingEval = getEvaluationForStudent(student.id);
            const aspect = getAspectSummary(student.id);
            const activePts = getStudentQuizPoints?.(student.id) || 0;

            if (existingEval) {
                setFormData({
                    adab_score: (existingEval.adab_score as BintangGrade) || aspect.ADAB.grade,
                    kedisiplinan_score: (existingEval.kedisiplinan_score as BintangGrade) || aspect.KEDISIPLINAN.grade,
                    kerapian_score: (existingEval.kerapian_score as BintangGrade) || aspect.KERAPIAN.grade,
                    adab_notes: existingEval.adab_notes || '',
                    kedisiplinan_notes: existingEval.kedisiplinan_notes || '',
                    kerapian_notes: existingEval.kerapian_notes || '',
                    catatan_wali: existingEval.catatan_wali || '',
                });
            } else {
                const autoNotes = generateAutoNote(aspect.ADAB.grade, aspect.KEDISIPLINAN.grade, aspect.KERAPIAN.grade, activePts);
                const autoHomeroomNote = generateHomeroomNote(aspect.ADAB.grade, aspect.KEDISIPLINAN.grade, aspect.KERAPIAN.grade, activePts);
                setFormData({
                    adab_score: aspect.ADAB.grade,
                    kedisiplinan_score: aspect.KEDISIPLINAN.grade,
                    kerapian_score: aspect.KERAPIAN.grade,
                    adab_notes: autoNotes.adabNote,
                    kedisiplinan_notes: autoNotes.kedisNote,
                    kerapian_notes: autoNotes.kerapianNote,
                    catatan_wali: autoHomeroomNote,
                });
            }
            setIsEditModalOpen(true);
        },
        [getEvaluationForStudent, getStudentQuizPoints]
    );

    const handleSaveEvaluation = useCallback(
        async (e: React.FormEvent, _getAspectSummary: (id: string) => AspectPointsSummary) => {
            e.preventDefault();
            setIsSubmitting(true);
            try {
                await bintangService.upsertEvaluation({
                    student_id: editingStudent.id,
                    month: selectedMonth,
                    evaluator_id: user?.id || '',
                    adab_score: formData.adab_score,
                    kedisiplinan_score: formData.kedisiplinan_score,
                    kerapian_score: formData.kerapian_score,
                    adab_notes: formData.adab_notes,
                    kedisiplinan_notes: formData.kedisiplinan_notes,
                    kerapian_notes: formData.kerapian_notes,
                    catatan_wali: formData.catatan_wali,
                });
                toast.success('Rapor BINTANG berhasil disimpan');
                setIsEditModalOpen(false);
                await fetchData();
            } catch (error) {
                console.error(error);
                toast.error('Gagal menyimpan rapor');
            } finally {
                setIsSubmitting(false);
            }
        },
        [editingStudent, selectedMonth, user, formData, toast, fetchData]
    );

    const handleGenerateAll = useCallback(
        async (getAspectSummary: (id: string) => AspectPointsSummary) => {
            setIsGenerating(true);
            try {
                const evalInserts = students.map(student => {
                    const aspect = getAspectSummary(student.id);
                    const activePts = getStudentQuizPoints?.(student.id) || 0;
                    const autoNotes = generateAutoNote(aspect.ADAB.grade, aspect.KEDISIPLINAN.grade, aspect.KERAPIAN.grade, activePts);
                    const autoHomeroomNote = generateHomeroomNote(aspect.ADAB.grade, aspect.KEDISIPLINAN.grade, aspect.KERAPIAN.grade, activePts);
                    return {
                        student_id: student.id,
                        month: selectedMonth,
                        evaluator_id: user?.id || '',
                        adab_score: aspect.ADAB.grade,
                        adab_notes: autoNotes.adabNote,
                        kedisiplinan_score: aspect.KEDISIPLINAN.grade,
                        kedisiplinan_notes: autoNotes.kedisNote,
                        kerapian_score: aspect.KERAPIAN.grade,
                        kerapian_notes: autoNotes.kerapianNote,
                        catatan_wali: autoHomeroomNote,
                    };
                });

                await bintangService.bulkUpsertEvaluations(evalInserts);
                toast.success(`Berhasil generate rapor untuk ${students.length} siswa`);
                await fetchData();
            } catch (error) {
                console.error(error);
                toast.error('Gagal generate rapor otomatis');
            } finally {
                setIsGenerating(false);
            }
        },
        [students, selectedMonth, user, getStudentQuizPoints, toast, fetchData]
    );

    const handlePublish = useCallback(async () => {
        await confirmPublish({
            title: 'Publikasi Rapor BINTANG',
            message: `Anda akan mempublikasikan rapor BINTANG untuk ${evalStats.filled} siswa. Rapor yang sudah dipublikasikan tidak dapat diubah lagi. Lanjutkan?`,
            confirmText: 'Ya, Publikasikan',
            variant: 'warning',
            onConfirm: async () => {
                setIsPublishing(true);
                try {
                    await bintangService.publishEvaluations(selectedClass, selectedMonth);
                    toast.success('Rapor BINTANG berhasil dipublikasikan');
                    await fetchData();
                } catch (error) {
                    console.error(error);
                    toast.error('Gagal mempublikasikan rapor');
                } finally {
                    setIsPublishing(false);
                }
            },
        });
    }, [confirmPublish, evalStats.filled, selectedClass, selectedMonth, toast, fetchData]);

    const handleDownloadSinglePdf = useCallback(
        async (studentId: string) => {
            setDownloadingStudentId(studentId);
            try {
                await downloadBintangReportAction({
                    studentId,
                    month: selectedMonth,
                    user: user
                        ? {
                              id: user.id,
                              name: user.user_metadata?.full_name || 'Wali Kelas',
                              avatarUrl: user.user_metadata?.avatar_url || '',
                              email: user.email,
                          }
                        : null,
                });
                toast.success('Rapor Bintang berhasil diunduh');
            } catch (error: any) {
                console.error('Error downloading PDF:', error);
                toast.error(error.message || 'Gagal mengunduh PDF');
            } finally {
                setDownloadingStudentId(null);
            }
        },
        [selectedMonth, user, toast]
    );

    const handleDownloadClassPdf = useCallback(async () => {
        if (!selectedClass) return;
        setIsDownloadingClass(true);
        setDownloadProgress({ current: 0, total: 0 });
        try {
            await downloadBintangReportAction({
                classId: selectedClass,
                month: selectedMonth,
                user: user
                    ? {
                          id: user.id,
                          name: user.user_metadata?.full_name || 'Wali Kelas',
                          avatarUrl: user.user_metadata?.avatar_url || '',
                          email: user.email,
                      }
                    : null,
                onProgress: (current, total) => {
                    setDownloadProgress({ current, total });
                },
            });
            setDownloadProgress(null);
            toast.success('Rapor Kelas berhasil diunduh');
        } catch (error: any) {
            console.error('Error downloading PDF:', error);
            toast.error(error.message || 'Gagal mengunduh PDF');
            setDownloadProgress(null);
        } finally {
            setIsDownloadingClass(false);
        }
    }, [selectedClass, selectedMonth, user, toast]);

    const handleExportExcel = useCallback(async () => {
        if (!selectedClass || !students || students.length === 0) {
            toast.error('Tidak ada data untuk diexport');
            return;
        }
        if (!selectedMonth) {
            toast.error('Pilih bulan terlebih dahulu');
            return;
        }
        setIsExportingExcel(true);
        try {
            const parts = selectedMonth.split('-');
            const year = parseInt(parts[0], 10) || new Date().getFullYear();
            const monthNum = parseInt(parts[1], 10) || (new Date().getMonth() + 1);
            const monthDate = new Date(year, monthNum - 1, 1);
            const monthName = monthDate.toLocaleDateString('id-ID', { month: 'long', year: 'numeric' });
            const monthSemester = monthNum >= 7 ? '1' : '2';
            const monthAcadYearStart = monthSemester === '1' ? year : year - 1;
            const academicYear = `${monthAcadYearStart}/${monthAcadYearStart + 1}`;
            const semesterName = monthSemester === '1' ? 'Ganjil' : 'Genap';

            // Fetch class name
            const { data: classData } = await supabase
                .from('classes')
                .select('name')
                .eq('id', selectedClass)
                .maybeSingle();
            const className = classData?.name || selectedClass;

            const startDate = `${selectedMonth}-01`;
            const nextMonthNum = monthNum === 12 ? 1 : monthNum + 1;
            const nextYear = monthNum === 12 ? year + 1 : year;
            const endDate = `${nextYear}-${nextMonthNum.toString().padStart(2, '0')}-01`;

            // Fetch violations & quiz points directly for export completeness
            const [viosData, quizData] = await Promise.all([
                bintangService.getViolationsForClass(selectedClass, selectedMonth),
                (async () => {
                    const { data: classStudents } = await supabase
                        .from('students')
                        .select('id')
                        .eq('class_id', selectedClass)
                        .is('deleted_at', null);
                    
                    const studentIds = (classStudents || []).map((s: any) => s.id);
                    if (studentIds.length === 0) return [];
                    const { data, error } = await supabase
                        .from('quiz_points')
                        .select('*')
                        .in('student_id', studentIds)
                        .gte('quiz_date', startDate)
                        .lt('quiz_date', endDate)
                        .is('deleted_at', null);
                    if (error) {
                        console.warn('Error fetching quiz_points for export:', error);
                    }
                    return data || [];
                })(),
            ]);

            await exportBintangToExcel({
                className,
                schoolName: 'LAPORAN PROGRAM BINTANG',
                monthName,
                academicYear,
                semesterName,
                students,
                violations: viosData || [],
                quizPoints: quizData || [],
                evaluations,
            });

            toast.success('Data BINTANG berhasil diexport ke Excel');
        } catch (error: any) {
            console.error('Error exporting Excel:', error);
            toast.error(error.message || 'Gagal export Excel');
        } finally {
            setIsExportingExcel(false);
        }
    }, [selectedClass, selectedMonth, students, evaluations, toast]);

    return {
        isEditModalOpen,
        setIsEditModalOpen,
        editingStudent,
        formData,
        setFormData,
        isSubmitting,
        isPublishing,
        isGenerating,
        downloadingStudentId,
        isDownloadingClass,
        downloadProgress,

        getEvaluationForStudent,
        evalStats,

        handleOpenEditModal,
        handleSaveEvaluation,
        handleGenerateAll,
        handlePublish,
        handleDownloadSinglePdf,
        handleDownloadClassPdf,
        handleExportExcel,
        isExportingExcel,
    };
}
