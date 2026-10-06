import { useState, useMemo, useCallback } from 'react';
import type { BintangGrade, AspectPointsSummary } from '../../../../services/bintangService';
import { bintangService } from '../../../../services/bintangService';
import { downloadBintangReportAction } from '../../../../services/bintangPdfGenerator';
import { exportBintangToExcel } from '../../../../services/bintangExcelExport';
import {
    generateAutoNote,
    generateHomeroomNote,
    getAspectAutoNote,
    isAutoAdabNote,
    isAutoKedisNote,
    isAutoKerapianNote,
    isAutoHomeroomNote,
    type StudentViolationSummaryItem
} from '../bintangConstants';
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
    students: Array<{ id: string; name: string; gender?: string | null }>;
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
    handleAspectScoreChange: (aspectKey: 'ADAB' | 'KEDISIPLINAN' | 'KERAPIAN', newScore: BintangGrade) => void;
    handleResetAspectNote: (aspectKey: 'ADAB' | 'KEDISIPLINAN' | 'KERAPIAN') => void;
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

// ─── Draft Resolution ───────────────────────────────────────────────────────

type ExistingEvaluation = UseBintangEvaluationOptions['evaluations'][number];

export interface EvaluationDraftContext {
    studentName?: string;
    studentGender?: string | null;
    activePoints: number;
    violations: StudentViolationSummaryItem[];
    month: string;
    attitude?: { spiritual?: string; social?: string };
}

/**
 * Merge a stored evaluation with the latest auto recommendation.
 * `manual_aspects` is the only signal that a grade was set by hand; any other
 * grade follows the recommendation so newly recorded violations are reflected.
 * Notes are kept when flagged custom or when they don't match an auto template.
 */
export function resolveEvaluationDraft(
    existingEval: ExistingEvaluation | null | undefined,
    aspect: AspectPointsSummary,
    ctx: EvaluationDraftContext
): EvaluationFormData {
    const manual = new Set<string>(Array.isArray(existingEval?.manual_aspects) ? existingEval.manual_aspects : []);

    const resolveGrade = (key: 'ADAB' | 'KEDISIPLINAN' | 'KERAPIAN', stored: string | null | undefined): BintangGrade =>
        manual.has(key) && stored ? (stored as BintangGrade) : aspect[key].grade;

    const adabScore = resolveGrade('ADAB', existingEval?.adab_score);
    const kedisScore = resolveGrade('KEDISIPLINAN', existingEval?.kedisiplinan_score);
    const kerapianScore = resolveGrade('KERAPIAN', existingEval?.kerapian_score);

    const resolveNote = (flag: string, stored: string | null | undefined, isAuto: (n?: string | null) => boolean, autoNote: string) => {
        if (stored && stored.trim() && (manual.has(flag) || !isAuto(stored))) {
            manual.add(flag);
            return stored;
        }
        manual.delete(flag);
        return autoNote;
    };

    const autoNotes = generateAutoNote(adabScore, kedisScore, kerapianScore, ctx.activePoints);
    const adabNotes = resolveNote('CUSTOM_ADAB_NOTES', existingEval?.adab_notes, isAutoAdabNote, autoNotes.adabNote);
    const kedisNotes = resolveNote('CUSTOM_KEDIS_NOTES', existingEval?.kedisiplinan_notes, isAutoKedisNote, autoNotes.kedisNote);
    const kerapianNotes = resolveNote('CUSTOM_KERAPIAN_NOTES', existingEval?.kerapian_notes, isAutoKerapianNote, autoNotes.kerapianNote);

    const storedWali = existingEval?.catatan_wali;
    let catatanWali: string;
    if (storedWali && storedWali.trim() && (manual.has('CUSTOM_CATATAN_WALI') || !isAutoHomeroomNote(storedWali))) {
        manual.add('CUSTOM_CATATAN_WALI');
        catatanWali = storedWali;
    } else {
        manual.delete('CUSTOM_CATATAN_WALI');
        catatanWali = generateHomeroomNote(adabScore, kedisScore, kerapianScore, ctx.activePoints, {
            studentName: ctx.studentName,
            gender: ctx.studentGender,
            violations: ctx.violations,
            month: ctx.month,
            spiritualPredicate: ctx.attitude?.spiritual,
            socialPredicate: ctx.attitude?.social,
        });
    }

    return {
        adab_score: adabScore,
        kedisiplinan_score: kedisScore,
        kerapian_score: kerapianScore,
        adab_notes: adabNotes,
        kedisiplinan_notes: kedisNotes,
        kerapian_notes: kerapianNotes,
        catatan_wali: catatanWali,
        manual_aspects: Array.from(manual),
    };
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
            setFormData(resolveEvaluationDraft(getEvaluationForStudent(student.id), getAspectSummary(student.id), {
                studentName: student.name,
                studentGender: student.gender,
                activePoints: getStudentQuizPoints?.(student.id) || 0,
                violations: getStudentViolations?.(student.id) || [],
                month: selectedMonth,
                attitude: getStudentAttitude?.(student.id),
            }));
            setIsEditModalOpen(true);
        },
        [getEvaluationForStudent, getStudentQuizPoints, getStudentViolations, getStudentAttitude, selectedMonth]
    );

    const handleAspectScoreChange = useCallback(
        (aspectKey: 'ADAB' | 'KEDISIPLINAN' | 'KERAPIAN', newScore: BintangGrade) => {
            if (!editingStudent) return;
            const activePts = getStudentQuizPoints?.(editingStudent.id) || 0;
            const studentVios = getStudentViolations?.(editingStudent.id) || [];
            const attitude = getStudentAttitude?.(editingStudent.id);

            setFormData(prev => {
                const manualAspectsSet = new Set<string>(prev.manual_aspects || []);
                manualAspectsSet.add(aspectKey);

                const newAdab = aspectKey === 'ADAB' ? newScore : prev.adab_score;
                const newKedis = aspectKey === 'KEDISIPLINAN' ? newScore : prev.kedisiplinan_score;
                const newKerapian = aspectKey === 'KERAPIAN' ? newScore : prev.kerapian_score;

                // 1. Aspect notes auto adjustment if not custom
                let updatedAdabNotes = prev.adab_notes;
                let updatedKedisNotes = prev.kedisiplinan_notes;
                let updatedKerapianNotes = prev.kerapian_notes;

                if (aspectKey === 'ADAB') {
                    const isCustomAdab = manualAspectsSet.has('CUSTOM_ADAB_NOTES') || !isAutoAdabNote(prev.adab_notes);
                    if (!isCustomAdab) {
                        updatedAdabNotes = getAspectAutoNote('ADAB', newScore, activePts);
                    }
                } else if (aspectKey === 'KEDISIPLINAN') {
                    const isCustomKedis = manualAspectsSet.has('CUSTOM_KEDIS_NOTES') || !isAutoKedisNote(prev.kedisiplinan_notes);
                    if (!isCustomKedis) {
                        updatedKedisNotes = getAspectAutoNote('KEDISIPLINAN', newScore, activePts);
                    }
                } else if (aspectKey === 'KERAPIAN') {
                    const isCustomKerapian = manualAspectsSet.has('CUSTOM_KERAPIAN_NOTES') || !isAutoKerapianNote(prev.kerapian_notes);
                    if (!isCustomKerapian) {
                        updatedKerapianNotes = getAspectAutoNote('KERAPIAN', newScore, activePts);
                    }
                }

                // 2. Homeroom note auto adjustment if not custom
                let updatedHomeroomNote = prev.catatan_wali;
                const isCustomHomeroom = manualAspectsSet.has('CUSTOM_CATATAN_WALI') || !isAutoHomeroomNote(prev.catatan_wali);
                if (!isCustomHomeroom) {
                    updatedHomeroomNote = generateHomeroomNote(
                        newAdab,
                        newKedis,
                        newKerapian,
                        activePts,
                        {
                            studentName: editingStudent.name,
                            gender: editingStudent.gender,
                            violations: studentVios,
                            month: selectedMonth,
                            spiritualPredicate: attitude?.spiritual,
                            socialPredicate: attitude?.social,
                        }
                    );
                }

                return {
                    ...prev,
                    adab_score: newAdab,
                    kedisiplinan_score: newKedis,
                    kerapian_score: newKerapian,
                    adab_notes: updatedAdabNotes,
                    kedisiplinan_notes: updatedKedisNotes,
                    kerapian_notes: updatedKerapianNotes,
                    catatan_wali: updatedHomeroomNote,
                    manual_aspects: Array.from(manualAspectsSet),
                };
            });
        },
        [editingStudent, getStudentQuizPoints, getStudentViolations, getStudentAttitude, selectedMonth]
    );

    const handleResetAspectNote = useCallback(
        (aspectKey: 'ADAB' | 'KEDISIPLINAN' | 'KERAPIAN') => {
            if (!editingStudent) return;
            const activePts = getStudentQuizPoints?.(editingStudent.id) || 0;

            setFormData(prev => {
                const manualAspectsSet = new Set<string>(prev.manual_aspects || []);
                if (aspectKey === 'ADAB') {
                    manualAspectsSet.delete('CUSTOM_ADAB_NOTES');
                    return {
                        ...prev,
                        adab_notes: getAspectAutoNote('ADAB', prev.adab_score, activePts),
                        manual_aspects: Array.from(manualAspectsSet),
                    };
                }
                if (aspectKey === 'KEDISIPLINAN') {
                    manualAspectsSet.delete('CUSTOM_KEDIS_NOTES');
                    return {
                        ...prev,
                        kedisiplinan_notes: getAspectAutoNote('KEDISIPLINAN', prev.kedisiplinan_score, activePts),
                        manual_aspects: Array.from(manualAspectsSet),
                    };
                }
                manualAspectsSet.delete('CUSTOM_KERAPIAN_NOTES');
                return {
                    ...prev,
                    kerapian_notes: getAspectAutoNote('KERAPIAN', prev.kerapian_score, activePts),
                    manual_aspects: Array.from(manualAspectsSet),
                };
            });
            toast.success(`Catatan ${aspectKey.toLowerCase()} berhasil direset ke deskripsi otomatis`);
        },
        [editingStudent, getStudentQuizPoints, toast]
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
                        gender: student.gender,
                        violations: studentVios,
                        month: selectedMonth,
                        spiritualPredicate: attitude?.spiritual,
                        socialPredicate: attitude?.social,
                    }
                );
                const manualAspectsSet = new Set<string>(prev.manual_aspects || []);
                manualAspectsSet.delete('CUSTOM_CATATAN_WALI');
                return { ...prev, catatan_wali: regenerated, manual_aspects: Array.from(manualAspectsSet) };
            });
            toast.success('Catatan wali kelas berhasil dibuat ulang secara kontekstual');
        },
        [getStudentQuizPoints, getStudentViolations, getStudentAttitude, selectedMonth, toast]
    );

    const handleSaveEvaluation = useCallback(
        async (e: React.FormEvent, getAspectSummary: (id: string) => AspectPointsSummary) => {
            e.preventDefault();
            if (!user?.id) {
                toast.error('Sesi login tidak ditemukan. Silakan masuk ulang.');
                return;
            }
            setIsSubmitting(true);
            try {
                const aspect = getAspectSummary(editingStudent.id);
                const manualAspectsSet = new Set<string>(formData.manual_aspects || []);

                // A grade equal to the recommendation follows future recalculation again.
                const gradeChecks: Array<['ADAB' | 'KEDISIPLINAN' | 'KERAPIAN', BintangGrade]> = [
                    ['ADAB', formData.adab_score],
                    ['KEDISIPLINAN', formData.kedisiplinan_score],
                    ['KERAPIAN', formData.kerapian_score],
                ];
                for (const [key, score] of gradeChecks) {
                    if (score !== aspect[key].grade) manualAspectsSet.add(key);
                    else manualAspectsSet.delete(key);
                }

                // Custom-note flags are set on typing and cleared only by reset/regenerate;
                // the template heuristic may add a flag but never removes one.
                if (formData.adab_notes && !isAutoAdabNote(formData.adab_notes)) {
                    manualAspectsSet.add('CUSTOM_ADAB_NOTES');
                }
                if (formData.kedisiplinan_notes && !isAutoKedisNote(formData.kedisiplinan_notes)) {
                    manualAspectsSet.add('CUSTOM_KEDIS_NOTES');
                }
                if (formData.kerapian_notes && !isAutoKerapianNote(formData.kerapian_notes)) {
                    manualAspectsSet.add('CUSTOM_KERAPIAN_NOTES');
                }
                if (formData.catatan_wali && !isAutoHomeroomNote(formData.catatan_wali)) {
                    manualAspectsSet.add('CUSTOM_CATATAN_WALI');
                }

                const finalManualAspects = Array.from(manualAspectsSet);

                await bintangService.upsertEvaluation({
                    student_id: editingStudent.id,
                    month: selectedMonth,
                    evaluator_id: user.id,
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
            if (!user?.id) {
                toast.error('Sesi login tidak ditemukan. Silakan masuk ulang.');
                return;
            }
            // Published reports are locked (DB trigger); regenerate only drafts and new rows.
            const targets = students.filter(s => !getEvaluationForStudent(s.id)?.is_published);
            const skipped = students.length - targets.length;
            if (targets.length === 0) {
                toast.error('Semua rapor bulan ini sudah dipublikasikan. Batalkan publikasi dulu untuk generate ulang.');
                return;
            }

            setIsGenerating(true);
            try {
                const evalInserts = targets.map(student => ({
                    student_id: student.id,
                    month: selectedMonth,
                    evaluator_id: user.id,
                    ...resolveEvaluationDraft(getEvaluationForStudent(student.id), getAspectSummary(student.id), {
                        studentName: student.name,
                        studentGender: student.gender,
                        activePoints: getStudentQuizPoints?.(student.id) || 0,
                        violations: getStudentViolations?.(student.id) || [],
                        month: selectedMonth,
                        attitude: getStudentAttitude?.(student.id),
                    }),
                }));

                await bintangService.bulkUpsertEvaluations(evalInserts);
                toast.success(skipped > 0
                    ? `Rapor ${targets.length} siswa berhasil dibuat. ${skipped} rapor yang sudah terbit tidak diubah.`
                    : `Rapor ${targets.length} siswa berhasil dibuat`);
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
        const draftCount = evalStats.filled - evalStats.published;
        const missingCount = Math.max(evalStats.total - evalStats.filled, 0);
        if (draftCount <= 0) {
            toast.error(missingCount > 0
                ? `Belum ada rapor draft untuk dipublikasikan. ${missingCount} siswa belum punya rapor, klik Generate dulu.`
                : 'Semua rapor bulan ini sudah dipublikasikan.');
            return;
        }
        const missingWarning = missingCount > 0
            ? ` ${missingCount} siswa belum punya rapor dan tidak ikut dipublikasikan.`
            : '';
        await confirmPublish({
            title: 'Publikasi Rapor BINTANG',
            message: `Anda akan mempublikasikan rapor BINTANG untuk ${draftCount} siswa.${missingWarning} Rapor akan dapat dilihat oleh orang tua di portal. Anda dapat membatalkan publikasi ke status Draft sewaktu-waktu jika perlu mengedit kembali. Lanjutkan?`,
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
    }, [confirmPublish, evalStats, selectedClass, selectedMonth, toast, fetchData]);

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
        handleAspectScoreChange,
        handleResetAspectNote,
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
