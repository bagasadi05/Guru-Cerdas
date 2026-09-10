import { useState, useMemo, useCallback } from 'react';
import type { BintangGrade, AspectPointsSummary } from '../../../../services/bintangService';
import { bintangService } from '../../../../services/bintangService';
import { downloadBintangReportAction } from '../../../../services/bintangPdfGenerator';
import { exportBintangToExcel } from '../../../../services/bintangExcelExport';
import { generateAutoNote, generateHomeroomNote, type StudentViolationSummaryItem } from '../bintangConstants';
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
    manual_aspects: string[];
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
    confirmUnpublish?: (opts: {
        title: string;
        message: string;
        confirmText: string;
        cancelText?: string;
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
        manual_aspects?: string[] | null;
    }>;
    selectedClass: string;
    /** Getter function for quiz points — avoids TDZ issues with computed values */
    getStudentQuizPoints?: (studentId: string) => number;
    /** Getter function for student violations list — allows contextual note generation */
    getStudentViolations?: (studentId: string) => StudentViolationSummaryItem[];
    /** Getter function for student attitude predicates (KI-1 Spiritual & KI-2 Sosial) */
    getStudentAttitude?: (studentId: string) => { spiritual?: string; social?: string } | undefined;
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
    isUnpublishing: boolean;
    unpublishingStudentId: string | null;
    isGenerating: boolean;
    downloadingStudentId: string | null;
    isDownloadingClass: boolean;
    downloadProgress: { current: number; total: number } | null;

    // Getters
    getEvaluationForStudent: (studentId: string) => any;
    evalStats: { filled: number; published: number; total: number };

    // Handlers
    handleOpenEditModal: (student: any, getAspectSummary: (id: string) => AspectPointsSummary) => void;
    handleRegenerateHomeroomNote: (student: any, getAspectSummary: (id: string) => AspectPointsSummary) => void;
    handleSaveEvaluation: (e: React.FormEvent, getAspectSummary: (id: string) => AspectPointsSummary) => Promise<void>;
    handleGenerateAll: (getAspectSummary: (id: string) => AspectPointsSummary) => Promise<void>;
    handlePublish: () => Promise<void>;
    handleUnpublish: () => Promise<void>;
    handleUnpublishSingle: (studentId: string, studentName?: string) => Promise<void>;
    handleDownloadSinglePdf: (studentId: string) => Promise<void>;
    handleDownloadClassPdf: () => Promise<void>;
    handleDownloadBulkPdf: (studentIds: string[]) => Promise<void>;
    handleExportExcel: (targetStudentIds?: string[]) => Promise<void>;
    isExportingExcel: boolean;
    isDownloadingBulk: boolean;
}

// ─── Hook ───────────────────────────────────────────────────────────────────

export function useBintangEvaluation(options: UseBintangEvaluationOptions): UseBintangEvaluationReturn {
    const {
        toast, confirmPublish, fetchData, selectedMonth, user,
        students, evaluations, selectedClass, getStudentQuizPoints, getStudentViolations,
        getStudentAttitude,
    } = options;

    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [editingStudent, setEditingStudent] = useState<any>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isPublishing, setIsPublishing] = useState(false);
    const [isUnpublishing, setIsUnpublishing] = useState(false);
    const [unpublishingStudentId, setUnpublishingStudentId] = useState<string | null>(null);
    const [isGenerating, setIsGenerating] = useState(false);
    const [downloadingStudentId, setDownloadingStudentId] = useState<string | null>(null);
    const [isDownloadingClass, setIsDownloadingClass] = useState(false);
    const [isDownloadingBulk, setIsDownloadingBulk] = useState(false);
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
        manual_aspects: [],
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
            const studentVios = getStudentViolations?.(student.id) || [];
            const attitude = getStudentAttitude?.(student.id);

            if (existingEval) {
                // Collect manual aspects:
                // If existingEval already records manual_aspects, preserve them.
                // Backward compatibility: If an existing score differs from current recommendation, mark as manual.
                const detectedManual: string[] = Array.isArray(existingEval.manual_aspects)
                    ? [...existingEval.manual_aspects]
                    : [];

                if (existingEval.adab_score && existingEval.adab_score !== aspect.ADAB.grade && !detectedManual.includes('ADAB')) {
                    detectedManual.push('ADAB');
                }
                if (existingEval.kedisiplinan_score && existingEval.kedisiplinan_score !== aspect.KEDISIPLINAN.grade && !detectedManual.includes('KEDISIPLINAN')) {
                    detectedManual.push('KEDISIPLINAN');
                }
                if (existingEval.kerapian_score && existingEval.kerapian_score !== aspect.KERAPIAN.grade && !detectedManual.includes('KERAPIAN')) {
                    detectedManual.push('KERAPIAN');
                }

                setFormData({
                    adab_score: (existingEval.adab_score as BintangGrade) || aspect.ADAB.grade,
                    kedisiplinan_score: (existingEval.kedisiplinan_score as BintangGrade) || aspect.KEDISIPLINAN.grade,
                    kerapian_score: (existingEval.kerapian_score as BintangGrade) || aspect.KERAPIAN.grade,
                    adab_notes: existingEval.adab_notes || '',
                    kedisiplinan_notes: existingEval.kedisiplinan_notes || '',
                    kerapian_notes: existingEval.kerapian_notes || '',
                    catatan_wali: existingEval.catatan_wali || '',
                    manual_aspects: detectedManual,
                });
            } else {
                const autoNotes = generateAutoNote(aspect.ADAB.grade, aspect.KEDISIPLINAN.grade, aspect.KERAPIAN.grade, activePts);
                const autoHomeroomNote = generateHomeroomNote(
                    aspect.ADAB.grade,
                    aspect.KEDISIPLINAN.grade,
                    aspect.KERAPIAN.grade,
                    activePts,
                    {
                        studentName: student.name,
                        violations: studentVios,
                        spiritualPredicate: attitude?.spiritual,
                        socialPredicate: attitude?.social,
                    }
                );
                setFormData({
                    adab_score: aspect.ADAB.grade,
                    kedisiplinan_score: aspect.KEDISIPLINAN.grade,
                    kerapian_score: aspect.KERAPIAN.grade,
                    adab_notes: autoNotes.adabNote,
                    kedisiplinan_notes: autoNotes.kedisNote,
                    kerapian_notes: autoNotes.kerapianNote,
                    catatan_wali: autoHomeroomNote,
                    manual_aspects: [],
                });
            }
            setIsEditModalOpen(true);
        },
        [getEvaluationForStudent, getStudentQuizPoints, getStudentViolations, getStudentAttitude]
    );

    const handleRegenerateHomeroomNote = useCallback(
        (student: any, _getAspectSummary: (id: string) => AspectPointsSummary) => {
            if (!student) return;
            const activePts = getStudentQuizPoints?.(student.id) || 0;
            const studentVios = getStudentViolations?.(student.id) || [];
            const attitude = getStudentAttitude?.(student.id);

            setFormData(prev => {
                const regenerated = generateHomeroomNote(
                    prev.adab_score,
                    prev.kedisiplinan_score,
                    prev.kerapian_score,
                    activePts,
                    {
                        studentName: student.name,
                        violations: studentVios,
                        month: selectedMonth,
                        spiritualPredicate: attitude?.spiritual,
                        socialPredicate: attitude?.social,
                    }
                );
                return { ...prev, catatan_wali: regenerated };
            });
            toast.success('Catatan wali kelas berhasil dibuat ulang secara kontekstual');
        },
        [getStudentQuizPoints, getStudentViolations, getStudentAttitude, selectedMonth, toast]
    );

    const handleSaveEvaluation = useCallback(
        async (e: React.FormEvent, getAspectSummary: (id: string) => AspectPointsSummary) => {
            e.preventDefault();
            setIsSubmitting(true);
            try {
                const aspect = getAspectSummary(editingStudent.id);
                const manualAspectsSet = new Set<string>(formData.manual_aspects || []);

                // If grade differs from auto recommendation, record it in manual_aspects
                if (formData.adab_score !== aspect.ADAB.grade) {
                    manualAspectsSet.add('ADAB');
                }
                if (formData.kedisiplinan_score !== aspect.KEDISIPLINAN.grade) {
                    manualAspectsSet.add('KEDISIPLINAN');
                }
                if (formData.kerapian_score !== aspect.KERAPIAN.grade) {
                    manualAspectsSet.add('KERAPIAN');
                }

                // If custom homeroom note was written, record it
                if (formData.catatan_wali && formData.catatan_wali.trim()) {
                    manualAspectsSet.add('CATATAN_WALI');
                }

                const finalManualAspects = Array.from(manualAspectsSet);

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
                    manual_aspects: finalManualAspects,
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
                    const existingEval = getEvaluationForStudent(student.id);
                    const aspect = getAspectSummary(student.id);
                    const activePts = getStudentQuizPoints?.(student.id) || 0;
                    const studentVios = getStudentViolations?.(student.id) || [];
                    const attitude = getStudentAttitude?.(student.id);
                    const autoNotes = generateAutoNote(aspect.ADAB.grade, aspect.KEDISIPLINAN.grade, aspect.KERAPIAN.grade, activePts);

                    // Check which aspects are manual
                    const manualAspects: string[] = Array.isArray(existingEval?.manual_aspects)
                        ? [...existingEval.manual_aspects]
                        : [];

                    // Backward compatibility: If existingEval has scores different from recommendation, treat as manual
                    const isAdabManual = manualAspects.includes('ADAB') || (!!existingEval?.adab_score && existingEval.adab_score !== aspect.ADAB.grade);
                    const isKedisManual = manualAspects.includes('KEDISIPLINAN') || (!!existingEval?.kedisiplinan_score && existingEval.kedisiplinan_score !== aspect.KEDISIPLINAN.grade);
                    const isKerapianManual = manualAspects.includes('KERAPIAN') || (!!existingEval?.kerapian_score && existingEval.kerapian_score !== aspect.KERAPIAN.grade);

                    // Effective grades: manual grades are preserved, unedited grades recomputed from latest data
                    const adabScore = isAdabManual && existingEval?.adab_score ? (existingEval.adab_score as BintangGrade) : aspect.ADAB.grade;
                    const kedisScore = isKedisManual && existingEval?.kedisiplinan_score ? (existingEval.kedisiplinan_score as BintangGrade) : aspect.KEDISIPLINAN.grade;
                    const kerapianScore = isKerapianManual && existingEval?.kerapian_score ? (existingEval.kerapian_score as BintangGrade) : aspect.KERAPIAN.grade;

                    // Effective notes: preserve manual notes if aspect was manual and has notes
                    const adabNotes = isAdabManual && existingEval?.adab_notes ? existingEval.adab_notes : autoNotes.adabNote;
                    const kedisNotes = isKedisManual && existingEval?.kedisiplinan_notes ? existingEval.kedisiplinan_notes : autoNotes.kedisNote;
                    const kerapianNotes = isKerapianManual && existingEval?.kerapian_notes ? existingEval.kerapian_notes : autoNotes.kerapianNote;

                    // Catatan wali: preserve if existing has non-empty catatan_wali
                    let finalHomeroomNote: string;
                    if (existingEval?.catatan_wali && existingEval.catatan_wali.trim()) {
                        finalHomeroomNote = existingEval.catatan_wali;
                    } else {
                        finalHomeroomNote = generateHomeroomNote(
                            adabScore,
                            kedisScore,
                            kerapianScore,
                            activePts,
                            {
                                studentName: student.name,
                                violations: studentVios,
                                spiritualPredicate: attitude?.spiritual,
                                socialPredicate: attitude?.social,
                            }
                        );
                    }

                    // Combined manual aspects to persist
                    const finalManualAspects = Array.from(new Set([
                        ...manualAspects,
                        ...(isAdabManual ? ['ADAB'] : []),
                        ...(isKedisManual ? ['KEDISIPLINAN'] : []),
                        ...(isKerapianManual ? ['KERAPIAN'] : []),
                        ...(existingEval?.catatan_wali && existingEval.catatan_wali.trim() ? ['CATATAN_WALI'] : []),
                    ]));

                    return {
                        student_id: student.id,
                        month: selectedMonth,
                        evaluator_id: user?.id || '',
                        adab_score: adabScore,
                        adab_notes: adabNotes,
                        kedisiplinan_score: kedisScore,
                        kedisiplinan_notes: kedisNotes,
                        kerapian_score: kerapianScore,
                        kerapian_notes: kerapianNotes,
                        catatan_wali: finalHomeroomNote,
                        manual_aspects: finalManualAspects,
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
        [students, selectedMonth, user, getEvaluationForStudent, getStudentQuizPoints, getStudentViolations, getStudentAttitude, toast, fetchData]
    );

    const handlePublish = useCallback(async () => {
        await confirmPublish({
            title: 'Publikasi Rapor BINTANG',
            message: `Anda akan mempublikasikan rapor BINTANG untuk ${evalStats.filled} siswa. Rapor akan dapat dilihat oleh orang tua di portal. Anda dapat membatalkan publikasi ke status Draft sewaktu-waktu jika perlu mengedit kembali. Lanjutkan?`,
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

    const handleUnpublish = useCallback(async () => {
        const confirmFn = options.confirmUnpublish || confirmPublish;
        await confirmFn({
            title: 'Batalkan Publikasi Rapor BINTANG',
            message: `Anda akan membatalkan publikasi rapor BINTANG untuk ${evalStats.published} siswa. Rapor akan dikembalikan ke status Draft dan sementara disembunyikan dari Portal Orang Tua sehingga Anda dapat mengedit nilainya kembali. Lanjutkan?`,
            confirmText: 'Ya, Kembalikan ke Draft',
            variant: 'warning',
            onConfirm: async () => {
                setIsUnpublishing(true);
                try {
                    await bintangService.unpublishEvaluations(selectedClass, selectedMonth);
                    toast.success('Publikasi rapor berhasil dibatalkan. Rapor kembali ke status Draft.');
                    await fetchData();
                } catch (error) {
                    console.error(error);
                    toast.error('Gagal membatalkan publikasi rapor');
                } finally {
                    setIsUnpublishing(false);
                }
            },
        });
    }, [options.confirmUnpublish, confirmPublish, evalStats.published, selectedClass, selectedMonth, toast, fetchData]);

    const handleUnpublishSingle = useCallback(async (studentId: string, studentName?: string) => {
        const ev = evaluations.find(e => e.student_id === studentId);
        if (!ev) return;
        const confirmFn = options.confirmUnpublish || confirmPublish;
        const displayName = studentName || students.find(s => s.id === studentId)?.name || 'siswa ini';
        await confirmFn({
            title: 'Batalkan Publikasi Rapor Siswa',
            message: `Kembalikan rapor BINTANG untuk ${displayName} ke status Draft? Rapor akan sementara disembunyikan dari Portal Orang Tua agar Anda dapat mengedit nilainya kembali.`,
            confirmText: 'Ya, Kembalikan ke Draft',
            variant: 'warning',
            onConfirm: async () => {
                setUnpublishingStudentId(studentId);
                try {
                    await bintangService.unpublishSingleEvaluation(ev.id);
                    toast.success(`Rapor untuk ${displayName} dikembalikan ke Draft`);
                    await fetchData();
                } catch (error) {
                    console.error(error);
                    toast.error('Gagal membatalkan publikasi rapor');
                } finally {
                    setUnpublishingStudentId(null);
                }
            },
        });
    }, [options.confirmUnpublish, confirmPublish, evaluations, students, toast, fetchData]);

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
                              name: user.name || user.user_metadata?.full_name || user.user_metadata?.name || '',
                              avatarUrl: user.avatarUrl || user.user_metadata?.avatar_url || '',
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
                          name: user.name || user.user_metadata?.full_name || user.user_metadata?.name || '',
                          avatarUrl: user.avatarUrl || user.user_metadata?.avatar_url || '',
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

    const handleDownloadBulkPdf = useCallback(async (studentIds: string[]) => {
        if (!studentIds || studentIds.length === 0) {
            toast.error('Pilih setidaknya satu siswa untuk diunduh');
            return;
        }
        setIsDownloadingBulk(true);
        setDownloadProgress({ current: 0, total: studentIds.length });
        try {
            await downloadBintangReportAction({
                targetStudentIds: studentIds,
                month: selectedMonth,
                user: user
                    ? {
                          id: user.id,
                          name: user.name || user.user_metadata?.full_name || user.user_metadata?.name || '',
                          avatarUrl: user.avatarUrl || user.user_metadata?.avatar_url || '',
                          email: user.email,
                      }
                    : null,
                onProgress: (current, total) => {
                    setDownloadProgress({ current, total });
                },
            });
            setDownloadProgress(null);
            toast.success(`Rapor ${studentIds.length} siswa berhasil diunduh`);
        } catch (error: any) {
            console.error('Error downloading bulk PDF:', error);
            toast.error(error.message || 'Gagal mengunduh PDF');
            setDownloadProgress(null);
        } finally {
            setIsDownloadingBulk(false);
        }
    }, [selectedMonth, user, toast]);

    const handleExportExcel = useCallback(async (targetStudentIds?: string[]) => {
        if (!selectedClass || !students || students.length === 0) {
            toast.error('Tidak ada data untuk diexport');
            return;
        }
        if (!selectedMonth) {
            toast.error('Pilih bulan terlebih dahulu');
            return;
        }

        const effectiveStudents = (targetStudentIds && targetStudentIds.length > 0)
            ? students.filter(s => targetStudentIds.includes(s.id))
            : students;

        if (effectiveStudents.length === 0) {
            toast.error('Tidak ada siswa yang dipilih untuk diexport');
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

            const effectiveStudentIds = effectiveStudents.map(s => s.id);

            // Fetch violations & quiz points directly for export completeness
            const [viosData, quizData] = await Promise.all([
                bintangService.getViolationsForClass(selectedClass, selectedMonth),
                (async () => {
                    if (effectiveStudentIds.length === 0) return [];
                    const { data, error } = await supabase
                        .from('quiz_points')
                        .select('*')
                        .in('student_id', effectiveStudentIds)
                        .gte('quiz_date', startDate)
                        .lt('quiz_date', endDate)
                        .is('deleted_at', null);
                    if (error) {
                        console.warn('Error fetching quiz_points for export:', error);
                    }
                    return data || [];
                })(),
            ]);

            const filteredVios = (viosData || []).filter(v => effectiveStudentIds.includes(v.student_id));
            const filteredEvals = (evaluations || []).filter(e => effectiveStudentIds.includes(e.student_id));

            await exportBintangToExcel({
                className: (targetStudentIds && targetStudentIds.length > 0 && targetStudentIds.length < students.length)
                    ? `${className} (Subset ${effectiveStudents.length} Siswa)`
                    : className,
                schoolName: 'LAPORAN PROGRAM BINTANG',
                monthName,
                academicYear,
                semesterName,
                students: effectiveStudents,
                violations: filteredVios,
                quizPoints: quizData || [],
                evaluations: filteredEvals,
                attitudeMap: getStudentAttitude
                    ? new Map(effectiveStudents.map(s => [s.id, getStudentAttitude(s.id) || {}]))
                    : undefined,
            });

            toast.success(`Data BINTANG (${effectiveStudents.length} siswa) berhasil diexport ke Excel`);
        } catch (error: any) {
            console.error('Error exporting Excel:', error);
            toast.error(error.message || 'Gagal export Excel');
        } finally {
            setIsExportingExcel(false);
        }
    }, [selectedClass, selectedMonth, students, evaluations, getStudentAttitude, toast]);

    return {
        isEditModalOpen,
        setIsEditModalOpen,
        editingStudent,
        formData,
        setFormData,
        isSubmitting,
        isPublishing,
        isUnpublishing,
        unpublishingStudentId,
        isGenerating,
        downloadingStudentId,
        isDownloadingClass,
        isDownloadingBulk,
        downloadProgress,

        getEvaluationForStudent,
        evalStats,

        handleOpenEditModal,
        handleRegenerateHomeroomNote,
        handleSaveEvaluation,
        handleGenerateAll,
        handlePublish,
        handleUnpublish,
        handleUnpublishSingle,
        handleDownloadSinglePdf,
        handleDownloadClassPdf,
        handleDownloadBulkPdf,
        handleExportExcel,
        isExportingExcel,
    };
}
