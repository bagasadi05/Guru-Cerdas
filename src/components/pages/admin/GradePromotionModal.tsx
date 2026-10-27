import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { useQueryClient } from '@tanstack/react-query';
import { Button } from '../../ui/Button';
import { useToast } from '../../../hooks/useToast';
import { useAuth } from '../../../hooks/useAuth';
import { useSemester } from '../../../contexts/SemesterContext';
import {
    computeGrade4LiveCounters,
    generateBalancedGrade4Draft,
    RETAINED_TARGET,
} from '../../../utils/gradePromotionEngine';
import {
    fetchGradePromotionWorkspace,
    saveDeliberationDraft,
    buildPlannedStudentMoves,
    executeGradePromotion,
    rollbackGradePromotion,
    exportClassPromotionToExcel,
    DEFAULT_PROMOTION_DRAFT,
    type GradePromotionWorkspaceData,
    type PromotionDraftState,
} from '../../../services/gradePromotionService';
import {
    ArrowLeft,
    Save,
    FileSpreadsheet,
    RotateCcw,
    AlertTriangle,
    Search,
    ChevronDown,
    ChevronRight,
    X,
} from 'lucide-react';

interface GradePromotionModalProps {
    isOpen: boolean;
    onClose: () => void;
    targetAcademicYearId?: string | null;
    targetAcademicYearName?: string;
}

type StepNumber = 1 | 2 | 3 | 4;

export const GradePromotionModal: React.FC<GradePromotionModalProps> = ({
    isOpen,
    onClose,
    targetAcademicYearId,
    targetAcademicYearName,
}) => {
    const { isAdmin } = useAuth();
    const { activeSemester, activeAcademicYear, semesters } = useSemester();
    const queryClient = useQueryClient();
    const toast = useToast();

    const [step, setStep] = useState<StepNumber>(1);
    const [loading, setLoading] = useState<boolean>(false);
    const [loadError, setLoadError] = useState<string | null>(null);
    const [savingDraft, setSavingDraft] = useState<boolean>(false);
    const [executing, setExecuting] = useState<boolean>(false);
    const [rollingBack, setRollingBack] = useState<boolean>(false);
    const [confirmExecute, setConfirmExecute] = useState<boolean>(false);

    const [workspace, setWorkspace] = useState<GradePromotionWorkspaceData | null>(null);
    const [draft, setDraft] = useState<PromotionDraftState>(DEFAULT_PROMOTION_DRAFT);

    const [expandedClassId, setExpandedClassId] = useState<string | null>(null);

    // Filter states for Step 1 (Kelas 6)
    const [grade6Search, setGrade6Search] = useState<string>('');
    const [grade6ClassFilter, setGrade6ClassFilter] = useState<string>('ALL');

    // Filter states for Step 3 (Pembagian Kelas 4)
    const [searchQuery, setSearchQuery] = useState<string>('');
    const [sourceClassFilter, setSourceClassFilter] = useState<string>('ALL');
    const [placementFilter, setPlacementFilter] = useState<'ALL' | 'UNASSIGNED' | 'ASSIGNED'>('ALL');

    const effectiveYearName = targetAcademicYearName || activeAcademicYear?.name || 'Tahun Ajaran Baru';

    useEffect(() => {
        if (!isOpen) return;
        const prevOverflow = document.body.style.overflow;
        document.body.style.overflow = 'hidden';

        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                onClose();
            }
        };
        window.addEventListener('keydown', handleKeyDown);

        return () => {
            document.body.style.overflow = prevOverflow;
            window.removeEventListener('keydown', handleKeyDown);
        };
    }, [isOpen, onClose]);

    const targetSemesterId = useMemo(() => {
        if (targetAcademicYearId) {
            const firstSem = semesters.find(
                s => s.academic_year_id === targetAcademicYearId && s.semester_number === 1
            );
            if (firstSem) return firstSem.id;
        }
        return activeSemester?.id || null;
    }, [targetAcademicYearId, semesters, activeSemester]);

    const loadWorkspace = useCallback(async () => {
        if (!isOpen) return;
        setLoading(true);
        setLoadError(null);
        try {
            const data = await fetchGradePromotionWorkspace(
                activeSemester?.id || null,
                targetAcademicYearId || activeAcademicYear?.id || null
            );
            setWorkspace(data);
            setDraft(data.activeDraft);
        } catch (err) {
            const msg = err instanceof Error ? err.message : 'Gagal memuat data kenaikan kelas.';
            setLoadError(msg);
            toast.error(msg);
        } finally {
            setLoading(false);
        }
    }, [isOpen, activeSemester?.id, targetAcademicYearId, activeAcademicYear?.id, toast]);

    useEffect(() => {
        if (isOpen) {
            setConfirmExecute(false);
            loadWorkspace();
        }
    }, [isOpen, loadWorkspace]);

    const grade6Students = useMemo(() => {
        if (!workspace) return [];
        const grade6ClassIds = new Set(workspace.autoMap.grade6GraduationClasses.map(c => c.id));
        return workspace.students.filter(s => grade6ClassIds.has(s.class_id));
    }, [workspace]);

    const filteredGrade6Students = useMemo(() => {
        return grade6Students.filter(student => {
            if (grade6ClassFilter !== 'ALL' && student.class_id !== grade6ClassFilter) {
                return false;
            }
            if (grade6Search.trim()) {
                const q = grade6Search.toLowerCase();
                return (
                    student.name.toLowerCase().includes(q) ||
                    (student.nis || '').toLowerCase().includes(q)
                );
            }
            return true;
        });
    }, [grade6Students, grade6ClassFilter, grade6Search]);

    const regularSourceClasses = useMemo(() => {
        if (!workspace) return [];
        const { classesByGrade } = workspace.autoMap;
        return [
            ...classesByGrade[1],
            ...classesByGrade[2],
            ...classesByGrade[4],
            ...classesByGrade[5],
        ];
    }, [workspace]);

    const groupedRegularClasses = useMemo(() => {
        if (!workspace) return [];
        const groups: { grade: number; label: string; classes: typeof regularSourceClasses }[] = [
            { grade: 1, label: 'Kelas 1 ke Kelas 2', classes: workspace.autoMap.classesByGrade[1] || [] },
            { grade: 2, label: 'Kelas 2 ke Kelas 3', classes: workspace.autoMap.classesByGrade[2] || [] },
            { grade: 4, label: 'Kelas 4 ke Kelas 5', classes: workspace.autoMap.classesByGrade[4] || [] },
            { grade: 5, label: 'Kelas 5 ke Kelas 6', classes: workspace.autoMap.classesByGrade[5] || [] },
        ];
        return groups.filter(g => g.classes.length > 0);
    }, [workspace]);

    const grade4Counters = useMemo(() => {
        if (!workspace) {
            return {
                byClassId: {},
                unassignedCount: 0,
                retainedCount: 0,
                totalGrade3Students: 0,
            };
        }
        return computeGrade4LiveCounters(
            workspace.grade3DeliberationStudents,
            draft.grade3Allocations,
            workspace.autoMap.grade4TargetClasses
        );
    }, [workspace, draft.grade3Allocations]);

    const filteredGrade3Students = useMemo(() => {
        if (!workspace) return [];
        return workspace.grade3DeliberationStudents.filter(student => {
            if (sourceClassFilter !== 'ALL' && student.fromClassId !== sourceClassFilter) {
                return false;
            }
            const assignedTarget = draft.grade3Allocations[student.id];
            if (placementFilter === 'UNASSIGNED' && assignedTarget) {
                return false;
            }
            if (placementFilter === 'ASSIGNED' && !assignedTarget) {
                return false;
            }
            if (searchQuery.trim()) {
                const q = searchQuery.toLowerCase();
                return (
                    student.name.toLowerCase().includes(q) ||
                    (student.nis || '').toLowerCase().includes(q)
                );
            }
            return true;
        });
    }, [workspace, sourceClassFilter, placementFilter, searchQuery, draft.grade3Allocations]);

    const plannedMoves = useMemo(() => {
        if (!workspace) return [];
        return buildPlannedStudentMoves(
            workspace.classes,
            workspace.students,
            workspace.autoMap,
            draft
        );
    }, [workspace, draft]);

    const moveSummary = useMemo(() => {
        let graduated = 0;
        let promoted = 0;
        let rolled = 0;
        let retained = 0;
        for (const m of plannedMoves) {
            if (m.action_type === 'graduated') graduated++;
            else if (m.action_type === 'promoted') promoted++;
            else if (m.action_type === 'rolled') rolled++;
            else if (m.action_type === 'retained') retained++;
        }
        return { graduated, promoted, rolled, retained, total: plannedMoves.length };
    }, [plannedMoves]);

    const classById = useMemo(() => {
        return new Map((workspace?.classes || []).map(c => [c.id, c]));
    }, [workspace?.classes]);

    // Build per-class transition rows for Step 4 summary table
    const classTransitionSummary = useMemo(() => {
        if (!workspace) return [];
        const rows: {
            fromClassId: string;
            fromClassName: string;
            targetLabel: string;
            movingCount: number;
            retainedCount: number;
        }[] = [];

        // Grade 6 graduation
        for (const cls of workspace.autoMap.grade6GraduationClasses) {
            const clsMoves = plannedMoves.filter(m => m.from_class_id === cls.id);
            const gradCount = clsMoves.filter(m => m.action_type === 'graduated').length;
            const retCount = clsMoves.filter(m => m.action_type === 'retained').length;
            rows.push({
                fromClassId: cls.id,
                fromClassName: cls.name,
                targetLabel: 'Lulus (Alumni)',
                movingCount: gradCount,
                retainedCount: retCount,
            });
        }

        // Regular classes (1, 2, 4, 5)
        for (const cls of regularSourceClasses) {
            const clsMoves = plannedMoves.filter(m => m.from_class_id === cls.id);
            const promCount = clsMoves.filter(m => m.action_type === 'promoted').length;
            const retCount = clsMoves.filter(m => m.action_type === 'retained').length;
            const defaultTargetId = workspace.autoMap.classMapping[cls.id]?.toClassId || '';
            const targetId = draft.classTargetOverrides[cls.id] || defaultTargetId;
            const targetName = classById.get(targetId)?.name || 'Belum dipilih';
            rows.push({
                fromClassId: cls.id,
                fromClassName: cls.name,
                targetLabel: targetName,
                movingCount: promCount,
                retainedCount: retCount,
            });
        }

        // Grade 3 deliberation classes
        for (const cls of workspace.autoMap.grade3SourceClasses) {
            const clsMoves = plannedMoves.filter(m => m.from_class_id === cls.id);
            const rollCount = clsMoves.filter(m => m.action_type === 'rolled').length;
            const retCount = clsMoves.filter(m => m.action_type === 'retained').length;
            rows.push({
                fromClassId: cls.id,
                fromClassName: cls.name,
                targetLabel: 'Pembagian Kelas 4',
                movingCount: rollCount,
                retainedCount: retCount,
            });
        }

        return rows;
    }, [workspace, plannedMoves, regularSourceClasses, draft.classTargetOverrides, classById]);

    const handleToggleGraduateStudent = (studentId: string) => {
        setDraft(prev => {
            const set = new Set(prev.excludedGraduationStudentIds);
            if (set.has(studentId)) {
                set.delete(studentId);
            } else {
                set.add(studentId);
            }
            return { ...prev, excludedGraduationStudentIds: Array.from(set) };
        });
    };

    const handleAssignGrade3Student = (studentId: string, targetClassId: string) => {
        setDraft(prev => {
            const current = prev.grade3Allocations[studentId];
            const nextAllocations = { ...prev.grade3Allocations };
            if (current === targetClassId) {
                delete nextAllocations[studentId];
            } else {
                nextAllocations[studentId] = targetClassId;
            }
            return { ...prev, grade3Allocations: nextAllocations };
        });
    };

    const handleGenerateBalancedDraft = () => {
        if (!workspace) return;
        const { grade4TargetClasses } = workspace.autoMap;
        if (grade4TargetClasses.length === 0) {
            toast.warning('Belum ada kelas tingkat 4 yang terdaftar di Data Kelas.');
            return;
        }
        const generated = generateBalancedGrade4Draft(
            workspace.grade3DeliberationStudents,
            grade4TargetClasses
        );
        setDraft(prev => ({
            ...prev,
            grade3Allocations: generated,
        }));
        toast.success('Pembagian rata siswa Kelas 4 berhasil disusun.');
    };

    const handleSaveDraft = async () => {
        setSavingDraft(true);
        try {
            await saveDeliberationDraft({
                fromAcademicYearId: activeAcademicYear?.id || null,
                toAcademicYearId: targetAcademicYearId || activeAcademicYear?.id || null,
                fromSemesterId: activeSemester?.id || null,
                toSemesterId: targetSemesterId,
                draft,
            });
            toast.success('Draf berhasil disimpan.');
        } catch (err) {
            toast.error(err instanceof Error ? err.message : 'Gagal menyimpan draf.');
        } finally {
            setSavingDraft(false);
        }
    };

    const handleExportExcel = async () => {
        if (!workspace) return;
        try {
            await exportClassPromotionToExcel({
                academicYearName: effectiveYearName,
                moves: plannedMoves,
                grade3Students: workspace.grade3DeliberationStudents,
                grade3Allocations: draft.grade3Allocations,
                grade4Classes: workspace.autoMap.grade4TargetClasses,
            });
            toast.success('File Excel daftar pembagian kelas berhasil diunduh.');
        } catch (err) {
            toast.error(err instanceof Error ? err.message : 'Gagal mengunduh Excel.');
        }
    };

    const handleExecutePromotion = async () => {
        if (!isAdmin) {
            toast.error('Hanya Admin yang dapat menyimpan kenaikan kelas.');
            return;
        }
        if (grade4Counters.unassignedCount > 0) {
            toast.warning(
                `Masih ada ${grade4Counters.unassignedCount} siswa Kelas 3 yang belum dipilih kelas 4 tujuannya.`
            );
            setStep(3);
            return;
        }

        setExecuting(true);
        try {
            const result = await executeGradePromotion({
                fromAcademicYearId: activeAcademicYear?.id || null,
                toAcademicYearId: targetAcademicYearId || activeAcademicYear?.id || null,
                fromSemesterId: activeSemester?.id || null,
                toSemesterId: targetSemesterId,
                graduationYear: effectiveYearName,
                moves: plannedMoves,
                copyTeacherAssignments: draft.copyTeacherAssignments,
            });

            toast.success(
                `Kenaikan kelas selesai (${result.promoted_count} naik kelas, ${result.rolled_count} masuk kelas 4, ${result.graduated_count} lulus).`
            );
            await queryClient.invalidateQueries();
            await loadWorkspace();
            setConfirmExecute(false);
        } catch (err) {
            toast.error(err instanceof Error ? err.message : 'Gagal menyimpan kenaikan kelas.');
        } finally {
            setExecuting(false);
        }
    };

    const handleRollback = async (batchId: string) => {
        if (!isAdmin) return;
        setRollingBack(true);
        try {
            const res = await rollbackGradePromotion(batchId);
            toast.success(`Kenaikan kelas dibatalkan (${res.restored_count} siswa dikembalikan ke kelas semula).`);
            await queryClient.invalidateQueries();
            await loadWorkspace();
        } catch (err) {
            toast.error(err instanceof Error ? err.message : 'Gagal membatalkan kenaikan kelas.');
        } finally {
            setRollingBack(false);
        }
    };

    const steps: { id: StepNumber; label: string; countText: string }[] = [
        {
            id: 1,
            label: '1. Kelulusan Kelas 6',
            countText: `${grade6Students.length - draft.excludedGraduationStudentIds.length}/${grade6Students.length}`,
        },
        {
            id: 2,
            label: '2. Kenaikan Kelas 1, 2, 4, 5',
            countText: `${regularSourceClasses.length} kelas`,
        },
        {
            id: 3,
            label: '3. Pembagian Kelas 4',
            countText:
                grade4Counters.unassignedCount === 0
                    ? 'Lengkap'
                    : `${grade4Counters.unassignedCount} belum`,
        },
        {
            id: 4,
            label: '4. Ringkasan & Simpan',
            countText: `${moveSummary.total} siswa`,
        },
    ];

    if (!isOpen) return null;

    return createPortal(
        <div
            role="dialog"
            aria-modal="true"
            aria-label="Kenaikan Kelas dan Pembagian Rombel"
            className="fixed inset-0 z-50 flex flex-col bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100 overflow-hidden"
        >
            {/* Top Bar */}
            <header className="shrink-0 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
                <div className="flex items-center gap-3 min-w-0">
                    <button
                        type="button"
                        onClick={onClose}
                        className="inline-flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors cursor-pointer"
                    >
                        <ArrowLeft className="w-4 h-4" />
                        <span>Kembali</span>
                    </button>

                    <div className="h-5 w-px bg-gray-200 dark:bg-gray-700 hidden sm:block" />

                    <div className="min-w-0">
                        <h1 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-white truncate">
                            Kenaikan Kelas & Pembagian Rombel — {effectiveYearName}
                        </h1>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={handleExportExcel}
                        disabled={loading || plannedMoves.length === 0}
                        className="hidden sm:inline-flex"
                    >
                        <FileSpreadsheet className="w-4 h-4 mr-1.5" />
                        Unduh Excel
                    </Button>

                    <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={handleSaveDraft}
                        disabled={savingDraft || loading}
                        className="hidden sm:inline-flex"
                    >
                        <Save className="w-4 h-4 mr-1.5" />
                        {savingDraft ? 'Menyimpan...' : 'Simpan Draf'}
                    </Button>

                    <button
                        type="button"
                        onClick={onClose}
                        className="p-2 rounded-lg text-gray-500 hover:text-gray-800 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors cursor-pointer"
                        title="Tutup (Esc)"
                        aria-label="Tutup"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>
            </header>

            {/* Horizontal Step Tabs */}
            <nav
                aria-label="Tahapan kenaikan kelas"
                className="shrink-0 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-4 sm:px-6 overflow-x-auto"
            >
                <div className="max-w-7xl mx-auto flex items-center gap-1 sm:gap-6 min-w-max">
                    {steps.map(s => {
                        const isActive = step === s.id;
                        return (
                            <button
                                key={s.id}
                                type="button"
                                onClick={() => setStep(s.id)}
                                className={`py-3.5 px-2 border-b-2 text-sm font-medium flex items-center gap-2 transition-colors cursor-pointer whitespace-nowrap ${
                                    isActive
                                        ? 'border-emerald-600 text-emerald-700 dark:text-emerald-400 font-semibold'
                                        : 'border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
                                }`}
                            >
                                <span>{s.label}</span>
                                <span
                                    className={`text-xs px-2 py-0.5 rounded tabular-nums ${
                                        isActive
                                            ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300'
                                            : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300'
                                    }`}
                                >
                                    {s.countText}
                                </span>
                            </button>
                        );
                    })}
                </div>
            </nav>

            {/* Main Content */}
            <main className="flex-1 overflow-y-auto px-4 sm:px-6 py-6">
                <div className="max-w-7xl mx-auto space-y-5">
                    {loading ? (
                        <div className="py-20 text-center space-y-3 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
                            <div className="w-8 h-8 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin mx-auto" />
                            <p className="text-sm text-gray-600 dark:text-gray-400">
                                Memuat data kelas dan nilai siswa...
                            </p>
                        </div>
                    ) : loadError ? (
                        <div className="p-8 text-center space-y-4 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 max-w-lg mx-auto">
                            <AlertTriangle className="w-8 h-8 text-red-600 mx-auto" />
                            <div className="space-y-1">
                                <h2 className="text-base font-semibold text-gray-900 dark:text-white">
                                    Gagal Memuat Data
                                </h2>
                                <p className="text-sm text-gray-600 dark:text-gray-400">{loadError}</p>
                            </div>
                            <Button variant="primary" onClick={loadWorkspace}>
                                Muat Ulang
                            </Button>
                        </div>
                    ) : (
                        <>
                            {/* Rollback Notice if already applied */}
                            {workspace?.appliedBatch && (
                                <div className="p-4 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/60 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                                    <div className="flex items-start gap-3">
                                        <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                                        <div className="text-sm text-amber-900 dark:text-amber-200">
                                            <p className="font-semibold">
                                                Kenaikan kelas periode {effectiveYearName} sudah diterapkan pada{' '}
                                                {workspace.appliedBatch.executed_at
                                                    ? new Date(workspace.appliedBatch.executed_at).toLocaleString('id-ID')
                                                    : '-'}
                                            </p>
                                            <p className="text-amber-800 dark:text-amber-300 mt-0.5 text-xs">
                                                Jika ada kesalahan pembagian rombel, Anda dapat membatalkan perubahan ini untuk mengembalikan siswa ke kelas semula.
                                            </p>
                                        </div>
                                    </div>
                                    {isAdmin && (
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => handleRollback(workspace.appliedBatch!.id)}
                                            disabled={rollingBack}
                                            className="shrink-0"
                                        >
                                            <RotateCcw className="w-4 h-4 mr-1.5" />
                                            {rollingBack ? 'Membatalkan...' : 'Batalkan Kenaikan Kelas'}
                                        </Button>
                                    )}
                                </div>
                            )}

                            {/* STEP 1: KELULUSAN KELAS 6 */}
                            {step === 1 && (
                                <div className="space-y-4">
                                    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                                        <div>
                                            <h2 className="text-base font-semibold text-gray-900 dark:text-white">
                                                Kelulusan Siswa Kelas 6
                                            </h2>
                                            <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
                                                Siswa yang diluluskan akan dipindahkan ke daftar alumni sehingga ruang Kelas 6 dapat diisi oleh siswa Kelas 5 yang naik.
                                            </p>
                                        </div>
                                        {draft.excludedGraduationStudentIds.length > 0 && (
                                            <Button
                                                type="button"
                                                variant="outline"
                                                size="sm"
                                                onClick={() =>
                                                    setDraft(prev => ({ ...prev, excludedGraduationStudentIds: [] }))
                                                }
                                                className="shrink-0"
                                            >
                                                Luluskan Semua ({grade6Students.length})
                                            </Button>
                                        )}
                                    </div>

                                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
                                        <div className="relative flex-1 max-w-md">
                                            <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                                            <input
                                                type="text"
                                                value={grade6Search}
                                                onChange={e => setGrade6Search(e.target.value)}
                                                placeholder="Cari nama atau NIS siswa kelas 6..."
                                                className="w-full pl-9 pr-4 py-2 text-sm rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-600"
                                            />
                                        </div>

                                        <div className="flex items-center gap-1.5 overflow-x-auto">
                                            <button
                                                type="button"
                                                onClick={() => setGrade6ClassFilter('ALL')}
                                                className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap cursor-pointer transition-colors ${
                                                    grade6ClassFilter === 'ALL'
                                                        ? 'bg-emerald-600 text-white'
                                                        : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700'
                                                }`}
                                            >
                                                Semua ({grade6Students.length})
                                            </button>
                                            {workspace?.autoMap.grade6GraduationClasses.map(c => {
                                                const count = grade6Students.filter(s => s.class_id === c.id).length;
                                                return (
                                                    <button
                                                        key={c.id}
                                                        type="button"
                                                        onClick={() => setGrade6ClassFilter(c.id)}
                                                        className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap cursor-pointer transition-colors ${
                                                            grade6ClassFilter === c.id
                                                                ? 'bg-emerald-600 text-white'
                                                                : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700'
                                                        }`}
                                                    >
                                                        {c.name} ({count})
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    </div>

                                    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
                                        {filteredGrade6Students.length === 0 ? (
                                            <div className="py-12 text-center text-sm text-gray-500 dark:text-gray-400">
                                                Tidak ada data siswa Kelas 6 yang sesuai pencarian.
                                            </div>
                                        ) : (
                                            <div className="overflow-x-auto">
                                                <table className="w-full text-sm text-left">
                                                    <thead className="text-xs text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-900/60 border-b border-gray-200 dark:border-gray-700">
                                                        <tr>
                                                            <th className="py-3 px-4 font-medium w-12">No</th>
                                                            <th className="py-3 px-4 font-medium">Nama Siswa</th>
                                                            <th className="py-3 px-4 font-medium">Kelas</th>
                                                            <th className="py-3 px-4 font-medium">Jenis Kelamin</th>
                                                            <th className="py-3 px-4 font-medium text-right">Status Kelulusan</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                                                        {filteredGrade6Students.map((student, idx) => {
                                                            const isExcluded = draft.excludedGraduationStudentIds.includes(student.id);
                                                            const clsName = classById.get(student.class_id)?.name || 'Kelas 6';
                                                            return (
                                                                <tr
                                                                    key={student.id}
                                                                    className="hover:bg-gray-50 dark:hover:bg-gray-700/40"
                                                                >
                                                                    <td className="py-3 px-4 text-gray-500 tabular-nums">
                                                                        {idx + 1}
                                                                    </td>
                                                                    <td className="py-3 px-4 font-medium text-gray-900 dark:text-white">
                                                                        {student.name}
                                                                    </td>
                                                                    <td className="py-3 px-4 text-gray-600 dark:text-gray-300">
                                                                        {clsName}
                                                                    </td>
                                                                    <td className="py-3 px-4 text-gray-600 dark:text-gray-300">
                                                                        {student.gender}
                                                                    </td>
                                                                    <td className="py-2.5 px-4 text-right">
                                                                        <button
                                                                            type="button"
                                                                            onClick={() => handleToggleGraduateStudent(student.id)}
                                                                            className={`px-3 py-1.5 rounded-lg text-xs font-medium cursor-pointer transition-colors ${
                                                                                !isExcluded
                                                                                    ? 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                                                                                    : 'bg-amber-50 dark:bg-amber-950/50 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800'
                                                                            }`}
                                                                        >
                                                                            {!isExcluded ? 'Lulus' : 'Tinggal Kelas'}
                                                                        </button>
                                                                    </td>
                                                                </tr>
                                                            );
                                                        })}
                                                    </tbody>
                                                </table>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}

                            {/* STEP 2: KENAIKAN KELAS REGULER (1, 2, 4, 5) */}
                            {step === 2 && (
                                <div className="space-y-5">
                                    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 sm:p-5">
                                        <h2 className="text-base font-semibold text-gray-900 dark:text-white">
                                            Kenaikan Rombel Kelas 1, 2, 4, dan 5
                                        </h2>
                                        <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
                                            Setiap rombel otomatis dipetakan naik satu tingkat. Klik nama kelas jika ada siswa yang tinggal kelas.
                                        </p>
                                    </div>

                                    <div className="space-y-5">
                                        {groupedRegularClasses.map(group => (
                                            <div key={group.grade} className="space-y-2.5">
                                                <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 px-1">
                                                    {group.label}
                                                </h3>

                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                                    {group.classes.map(cls => {
                                                        const defaultTargetId = workspace?.autoMap.classMapping[cls.id]?.toClassId || '';
                                                        const selectedTargetId = draft.classTargetOverrides[cls.id] || defaultTargetId;
                                                        const classStudents = workspace?.students.filter(s => s.class_id === cls.id) || [];
                                                        const retainedInThisClass = classStudents.filter(
                                                            s => draft.regularOverrides[s.id] === RETAINED_TARGET
                                                        ).length;
                                                        const isExpanded = expandedClassId === cls.id;

                                                        return (
                                                            <div
                                                                key={cls.id}
                                                                className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 overflow-hidden"
                                                            >
                                                                <div className="p-4 flex items-center justify-between gap-3">
                                                                    <button
                                                                        type="button"
                                                                        onClick={() => setExpandedClassId(isExpanded ? null : cls.id)}
                                                                        className="flex items-center gap-2.5 text-left flex-1 min-w-0 cursor-pointer"
                                                                    >
                                                                        {isExpanded ? (
                                                                            <ChevronDown className="w-4 h-4 text-gray-400 shrink-0" />
                                                                        ) : (
                                                                            <ChevronRight className="w-4 h-4 text-gray-400 shrink-0" />
                                                                        )}
                                                                        <div className="min-w-0">
                                                                            <div className="flex items-center gap-2">
                                                                                <span className="text-sm font-semibold text-gray-900 dark:text-white truncate">
                                                                                    {cls.name}
                                                                                </span>
                                                                                <span className="text-xs text-gray-500 dark:text-gray-400 tabular-nums">
                                                                                    ({classStudents.length} siswa)
                                                                                </span>
                                                                            </div>
                                                                            {retainedInThisClass > 0 && (
                                                                                <p className="text-xs text-red-600 dark:text-red-400 mt-0.5">
                                                                                    {retainedInThisClass} siswa tinggal kelas
                                                                                </p>
                                                                            )}
                                                                        </div>
                                                                    </button>

                                                                    <div className="flex items-center gap-2 shrink-0">
                                                                        <span className="text-xs text-gray-500 dark:text-gray-400 hidden sm:inline">
                                                                            Tujuan:
                                                                        </span>
                                                                        <select
                                                                            aria-label={`Pilih kelas tujuan untuk ${cls.name}`}
                                                                            value={selectedTargetId}
                                                                            onChange={e =>
                                                                                setDraft(prev => ({
                                                                                    ...prev,
                                                                                    classTargetOverrides: {
                                                                                        ...prev.classTargetOverrides,
                                                                                        [cls.id]: e.target.value,
                                                                                    },
                                                                                }))
                                                                            }
                                                                            className="px-3 py-1.5 text-xs font-medium rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white cursor-pointer focus:outline-none focus:ring-2 focus:ring-emerald-600"
                                                                        >
                                                                            <option value="">Pilih kelas tujuan</option>
                                                                            {workspace?.classes
                                                                                .filter(c => c.id !== cls.id)
                                                                                .map(c => (
                                                                                    <option key={c.id} value={c.id}>
                                                                                        {c.name}
                                                                                    </option>
                                                                                ))}
                                                                        </select>
                                                                    </div>
                                                                </div>

                                                                {isExpanded && classStudents.length > 0 && (
                                                                    <div className="border-t border-gray-200 dark:border-gray-700 divide-y divide-gray-100 dark:divide-gray-700/60 bg-gray-50 dark:bg-gray-900/40 px-4 py-2">
                                                                        {classStudents.map((student, idx) => {
                                                                            const override = draft.regularOverrides[student.id];
                                                                            const isRetained = override === RETAINED_TARGET;
                                                                            return (
                                                                                <div
                                                                                    key={student.id}
                                                                                    className="py-2 flex items-center justify-between gap-2 text-xs"
                                                                                >
                                                                                    <span className="text-gray-800 dark:text-gray-200">
                                                                                        <span className="text-gray-400 tabular-nums mr-2">
                                                                                            {idx + 1}.
                                                                                        </span>
                                                                                        {student.name}
                                                                                    </span>
                                                                                    <button
                                                                                        type="button"
                                                                                        onClick={() =>
                                                                                            setDraft(prev => {
                                                                                                const next = { ...prev.regularOverrides };
                                                                                                if (isRetained) {
                                                                                                    delete next[student.id];
                                                                                                } else {
                                                                                                    next[student.id] = RETAINED_TARGET;
                                                                                                }
                                                                                                return { ...prev, regularOverrides: next };
                                                                                            })
                                                                                        }
                                                                                        className={`px-2.5 py-1 rounded text-xs font-medium cursor-pointer transition-colors ${
                                                                                            !isRetained
                                                                                                ? 'text-emerald-700 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/40'
                                                                                                : 'bg-red-50 dark:bg-red-950/60 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-800'
                                                                                        }`}
                                                                                    >
                                                                                        {!isRetained ? 'Naik Kelas' : 'Tinggal Kelas'}
                                                                                    </button>
                                                                                </div>
                                                                            );
                                                                        })}
                                                                    </div>
                                                                )}
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* STEP 3: PEMBAGIAN KELAS 4 (MUSYAWARAH ROLLING KELAS 3 -> 4) */}
                            {step === 3 && (
                                <div className="space-y-4">
                                    {/* Compact Distribution Summary Bar */}
                                    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
                                        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-3 border-b border-gray-200 dark:border-gray-700">
                                            <div>
                                                <h2 className="text-base font-semibold text-gray-900 dark:text-white">
                                                    Pembagian Rombel Kelas 4
                                                </h2>
                                                <p className="text-sm text-gray-500 dark:text-gray-400">
                                                    Pilih kelas tujuan untuk setiap siswa Kelas 3 atau gunakan tombol bagi rata otomatis sebagai draf awal.
                                                </p>
                                            </div>

                                            <div className="flex items-center gap-3 shrink-0">
                                                <span
                                                    className={`text-xs font-medium px-2.5 py-1 rounded border tabular-nums ${
                                                        grade4Counters.unassignedCount === 0
                                                            ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800'
                                                            : 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800'
                                                    }`}
                                                >
                                                    {grade4Counters.unassignedCount === 0
                                                        ? 'Semua siswa sudah ditempatkan'
                                                        : `${grade4Counters.unassignedCount} siswa belum ditempatkan`}
                                                </span>

                                                <Button
                                                    type="button"
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={handleGenerateBalancedDraft}
                                                >
                                                    Bagi Rata Otomatis
                                                </Button>
                                            </div>
                                        </div>

                                        {/* Compact Tabular Summary of Target Grade 4 Classes */}
                                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-3">
                                            {workspace?.autoMap.grade4TargetClasses.map(cls => {
                                                const stat = grade4Counters.byClassId[cls.id];
                                                const total = stat?.totalStudents || 0;
                                                const male = stat?.maleCount || 0;
                                                const female = stat?.femaleCount || 0;
                                                return (
                                                    <div
                                                        key={cls.id}
                                                        className="px-3.5 py-2.5 rounded-lg bg-gray-50 dark:bg-gray-900/60 border border-gray-200 dark:border-gray-700 flex items-center justify-between text-xs tabular-nums"
                                                    >
                                                        <div>
                                                            <span className="font-semibold text-sm text-gray-900 dark:text-white">
                                                                {cls.name}
                                                            </span>
                                                            <span className="text-gray-500 dark:text-gray-400 ml-2">
                                                                (L: {male}, P: {female})
                                                            </span>
                                                        </div>
                                                        <div className="text-right">
                                                            <span className="font-semibold text-gray-900 dark:text-white">
                                                                {total} siswa
                                                            </span>
                                                            <span className="text-gray-500 dark:text-gray-400 ml-2">
                                                                • Rata nilai: {stat?.avgScore || '-'}
                                                            </span>
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>

                                    {/* Filter Toolbar */}
                                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
                                        <div className="relative flex-1 max-w-md">
                                            <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                                            <input
                                                type="text"
                                                value={searchQuery}
                                                onChange={e => setSearchQuery(e.target.value)}
                                                placeholder="Cari nama atau NIS siswa kelas 3..."
                                                className="w-full pl-9 pr-4 py-2 text-sm rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-600"
                                            />
                                        </div>

                                        <div className="flex flex-wrap items-center gap-2">
                                            <select
                                                aria-label="Filter Kelas Asal"
                                                value={sourceClassFilter}
                                                onChange={e => setSourceClassFilter(e.target.value)}
                                                className="px-3 py-2 text-xs font-medium rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white cursor-pointer focus:outline-none focus:ring-2 focus:ring-emerald-600"
                                            >
                                                <option value="ALL">
                                                    Semua Kelas 3 ({workspace?.grade3DeliberationStudents.length || 0})
                                                </option>
                                                {workspace?.autoMap.grade3SourceClasses.map(c => (
                                                    <option key={c.id} value={c.id}>
                                                        Asal: {c.name}
                                                    </option>
                                                ))}
                                            </select>

                                            <select
                                                aria-label="Filter Status Penempatan"
                                                value={placementFilter}
                                                onChange={e => setPlacementFilter(e.target.value as 'ALL' | 'UNASSIGNED' | 'ASSIGNED')}
                                                className="px-3 py-2 text-xs font-medium rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white cursor-pointer focus:outline-none focus:ring-2 focus:ring-emerald-600"
                                            >
                                                <option value="ALL">Semua Status</option>
                                                <option value="UNASSIGNED">
                                                    Belum Ditempatkan ({grade4Counters.unassignedCount})
                                                </option>
                                                <option value="ASSIGNED">Sudah Ditempatkan</option>
                                            </select>
                                        </div>
                                    </div>

                                    {/* Student Allocation Table */}
                                    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
                                        <div className="overflow-x-auto">
                                            <table className="w-full text-sm text-left">
                                                <thead className="text-xs text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-900/60 border-b border-gray-200 dark:border-gray-700">
                                                    <tr>
                                                        <th className="py-3 px-4 font-medium w-12">No</th>
                                                        <th className="py-3 px-4 font-medium">Nama Siswa</th>
                                                        <th className="py-3 px-3 font-medium text-center">Kelas Asal</th>
                                                        <th className="py-3 px-3 font-medium text-center">L/P</th>
                                                        <th className="py-3 px-3 font-medium text-center">Rata-rata Nilai</th>
                                                        <th className="py-3 px-3 font-medium text-center">Poin Pelanggaran</th>
                                                        <th className="py-3 px-4 font-medium text-right">Penempatan Kelas 4</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                                                    {filteredGrade3Students.length === 0 ? (
                                                        <tr>
                                                            <td colSpan={7} className="py-12 text-center text-gray-500 dark:text-gray-400">
                                                                Tidak ada data siswa Kelas 3 yang sesuai dengan filter.
                                                            </td>
                                                        </tr>
                                                    ) : (
                                                        filteredGrade3Students.map((student, idx) => {
                                                            const currentTarget = draft.grade3Allocations[student.id];
                                                            return (
                                                                <tr
                                                                    key={student.id}
                                                                    className="hover:bg-gray-50 dark:hover:bg-gray-700/40"
                                                                >
                                                                    <td className="py-2.5 px-4 text-gray-500 tabular-nums">
                                                                        {idx + 1}
                                                                    </td>
                                                                    <td className="py-2.5 px-4 font-medium text-gray-900 dark:text-white">
                                                                        {student.name}
                                                                    </td>
                                                                    <td className="py-2.5 px-3 text-center text-gray-600 dark:text-gray-300">
                                                                        {student.fromClassName}
                                                                    </td>
                                                                    <td className="py-2.5 px-3 text-center text-gray-600 dark:text-gray-300">
                                                                        {student.gender === 'Laki-laki' ? 'L' : 'P'}
                                                                    </td>
                                                                    <td className="py-2.5 px-3 text-center font-medium text-gray-900 dark:text-white tabular-nums">
                                                                        {student.avgScore ?? '-'}
                                                                    </td>
                                                                    <td className="py-2.5 px-3 text-center tabular-nums">
                                                                        {student.violationPoints > 0 ? (
                                                                            <span className="text-xs font-medium text-red-600 dark:text-red-400">
                                                                                {student.violationPoints} poin
                                                                            </span>
                                                                        ) : (
                                                                            <span className="text-gray-400">-</span>
                                                                        )}
                                                                    </td>
                                                                    <td className="py-2 px-4 text-right">
                                                                        <div className="inline-flex items-center rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 p-0.5 gap-0.5">
                                                                            {workspace?.autoMap.grade4TargetClasses.map(targetCls => {
                                                                                const isSelected = currentTarget === targetCls.id;
                                                                                return (
                                                                                    <button
                                                                                        key={targetCls.id}
                                                                                        type="button"
                                                                                        onClick={() =>
                                                                                            handleAssignGrade3Student(
                                                                                                student.id,
                                                                                                targetCls.id
                                                                                            )
                                                                                        }
                                                                                        className={`px-3 py-1 rounded-md text-xs font-medium transition-colors cursor-pointer ${
                                                                                            isSelected
                                                                                                ? 'bg-emerald-600 text-white'
                                                                                                : 'text-gray-700 dark:text-gray-300 hover:bg-gray-200/70 dark:hover:bg-gray-700'
                                                                                        }`}
                                                                                    >
                                                                                        {targetCls.name.replace(/^kelas\s*/i, '')}
                                                                                    </button>
                                                                                );
                                                                            })}
                                                                            <button
                                                                                type="button"
                                                                                onClick={() =>
                                                                                    handleAssignGrade3Student(
                                                                                        student.id,
                                                                                        RETAINED_TARGET
                                                                                    )
                                                                                }
                                                                                className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors cursor-pointer ${
                                                                                    currentTarget === RETAINED_TARGET
                                                                                        ? 'bg-red-600 text-white'
                                                                                        : 'text-gray-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40'
                                                                                }`}
                                                                            >
                                                                                Tinggal
                                                                            </button>
                                                                        </div>
                                                                    </td>
                                                                </tr>
                                                            );
                                                        })
                                                    )}
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* STEP 4: RINGKASAN & SIMPAN */}
                            {step === 4 && (
                                <div className="space-y-5">
                                    {grade4Counters.unassignedCount > 0 && (
                                        <div className="p-4 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                                            <div className="flex items-center gap-2.5 text-sm text-amber-900 dark:text-amber-200">
                                                <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                                                <span>
                                                    Masih ada <strong>{grade4Counters.unassignedCount} siswa Kelas 3</strong> yang belum dipilih kelas 4 tujuannya.
                                                </span>
                                            </div>
                                            <Button
                                                type="button"
                                                variant="outline"
                                                size="sm"
                                                onClick={() => setStep(3)}
                                                className="shrink-0"
                                            >
                                                Buka Pembagian Kelas 4
                                            </Button>
                                        </div>
                                    )}

                                    {/* Summary Table by Class */}
                                    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
                                        <div className="p-4 sm:p-5 border-b border-gray-200 dark:border-gray-700 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                                            <div>
                                                <h2 className="text-base font-semibold text-gray-900 dark:text-white">
                                                    Ringkasan Perpindahan Kelas
                                                </h2>
                                                <p className="text-sm text-gray-500 dark:text-gray-400">
                                                    Periksa kembali jumlah siswa yang naik kelas, dibagi ke kelas 4, atau lulus sebelum disimpan.
                                                </p>
                                            </div>
                                            <div className="text-xs text-gray-600 dark:text-gray-300 tabular-nums flex flex-wrap items-center gap-3">
                                                <span>Lulus: <strong>{moveSummary.graduated}</strong></span>
                                                <span>•</span>
                                                <span>Naik Reguler: <strong>{moveSummary.promoted}</strong></span>
                                                <span>•</span>
                                                <span>Masuk Kelas 4: <strong>{moveSummary.rolled}</strong></span>
                                                <span>•</span>
                                                <span>Tinggal Kelas: <strong>{moveSummary.retained}</strong></span>
                                            </div>
                                        </div>

                                        <div className="overflow-x-auto">
                                            <table className="w-full text-sm text-left">
                                                <thead className="text-xs text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-900/60 border-b border-gray-200 dark:border-gray-700">
                                                    <tr>
                                                        <th className="py-3 px-4 font-medium">Kelas Asal</th>
                                                        <th className="py-3 px-4 font-medium">Tujuan</th>
                                                        <th className="py-3 px-4 font-medium text-right">Naik / Lulus</th>
                                                        <th className="py-3 px-4 font-medium text-right">Tinggal Kelas</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-gray-200 dark:divide-gray-700 tabular-nums">
                                                    {classTransitionSummary.map(row => (
                                                        <tr key={row.fromClassId} className="hover:bg-gray-50 dark:hover:bg-gray-700/40">
                                                            <td className="py-3 px-4 font-medium text-gray-900 dark:text-white">
                                                                {row.fromClassName}
                                                            </td>
                                                            <td className="py-3 px-4 text-gray-600 dark:text-gray-300">
                                                                {row.targetLabel}
                                                            </td>
                                                            <td className="py-3 px-4 text-right font-medium text-gray-900 dark:text-white">
                                                                {row.movingCount} siswa
                                                            </td>
                                                            <td className="py-3 px-4 text-right text-gray-600 dark:text-gray-400">
                                                                {row.retainedCount > 0 ? (
                                                                    <span className="text-red-600 dark:text-red-400 font-medium">
                                                                        {row.retainedCount} siswa
                                                                    </span>
                                                                ) : (
                                                                    '-'
                                                                )}
                                                            </td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>

                                    {/* Teacher Assignment Copy Option */}
                                    <label className="p-4 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 flex items-start gap-3 cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={draft.copyTeacherAssignments}
                                            onChange={e =>
                                                setDraft(prev => ({
                                                    ...prev,
                                                    copyTeacherAssignments: e.target.checked,
                                                }))
                                            }
                                            className="mt-1 w-4 h-4 rounded text-emerald-600 focus:ring-emerald-600 cursor-pointer"
                                        />
                                        <div className="text-sm">
                                            <p className="font-medium text-gray-900 dark:text-white">
                                                Salin penugasan Wali Kelas dan Guru Mata Pelajaran ke semester baru
                                            </p>
                                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                                                Menjaga akses guru ke kelas masing-masing pada semester baru. Perubahan wali kelas tetap dapat diatur kapan saja melalui menu Penugasan Guru.
                                            </p>
                                        </div>
                                    </label>

                                    {confirmExecute && (
                                        <div className="p-4 rounded-xl bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800/60 space-y-1.5">
                                            <p className="font-semibold text-sm text-red-900 dark:text-red-200">
                                                Konfirmasi Simpan Kenaikan Kelas ({effectiveYearName})
                                            </p>
                                            <p className="text-xs text-red-800 dark:text-red-300">
                                                Sebanyak {plannedMoves.length} data siswa akan diperbarui ke kelas baru. Anda tetap dapat membatalkan perubahan ini melalui tombol Batalkan Kenaikan Kelas jika diperlukan.
                                            </p>
                                        </div>
                                    )}
                                </div>
                            )}
                        </>
                    )}
                </div>
            </main>

            {/* Bottom Action Bar */}
            <footer className="shrink-0 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 px-4 sm:px-6 py-3">
                <div className="max-w-7xl mx-auto flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                        {step > 1 ? (
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => setStep((step - 1) as StepNumber)}
                            >
                                Sebelumnya
                            </Button>
                        ) : (
                            <Button type="button" variant="ghost" onClick={onClose}>
                                Tutup
                            </Button>
                        )}

                        <Button
                            type="button"
                            variant="outline"
                            onClick={handleSaveDraft}
                            disabled={savingDraft || loading}
                            className="sm:hidden"
                        >
                            {savingDraft ? 'Menyimpan...' : 'Simpan Draf'}
                        </Button>
                    </div>

                    <div className="flex items-center gap-2">
                        {step < 4 ? (
                            <Button
                                type="button"
                                variant="primary"
                                onClick={() => setStep((step + 1) as StepNumber)}
                            >
                                Lanjut
                            </Button>
                        ) : (
                            isAdmin && !workspace?.appliedBatch && (
                                !confirmExecute ? (
                                    <Button
                                        type="button"
                                        variant="primary"
                                        onClick={() => setConfirmExecute(true)}
                                        disabled={executing || plannedMoves.length === 0}
                                    >
                                        Simpan Kenaikan Kelas
                                    </Button>
                                ) : (
                                    <div className="flex items-center gap-2">
                                        <Button
                                            type="button"
                                            variant="ghost"
                                            onClick={() => setConfirmExecute(false)}
                                            disabled={executing}
                                        >
                                            Batal
                                        </Button>
                                        <Button
                                            type="button"
                                            variant="primary"
                                            onClick={handleExecutePromotion}
                                            disabled={executing}
                                            className="bg-red-600 hover:bg-red-700 text-white"
                                        >
                                            {executing ? 'Menyimpan...' : 'Ya, Simpan Sekarang'}
                                        </Button>
                                    </div>
                                )
                            )
                        )}
                    </div>
                </div>
            </footer>
        </div>,
        document.body
    );
};

export default GradePromotionModal;
