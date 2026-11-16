import { useState, useEffect, useMemo, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useToast } from '../../../../hooks/useToast';
import { useAuth } from '../../../../hooks/useAuth';
import { useSemester } from '../../../../contexts/SemesterContext';
import {
    computeGrade4LiveCounters,
    generateBalancedGrade4Draft,
    RETAINED_TARGET,
} from '../../../../utils/gradePromotionEngine';
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
} from '../../../../services/gradePromotionService';

export type StepNumber = 1 | 2 | 3 | 4;

export interface ClassTransitionSummaryRow {
    fromClassId: string;
    fromClassName: string;
    targetLabel: string;
    movingCount: number;
    retainedCount: number;
}

export interface GradePromotionStepMeta {
    id: StepNumber;
    label: string;
    countText: string;
}

interface UseGradePromotionWizardParams {
    isOpen: boolean;
    targetAcademicYearId?: string | null;
    targetAcademicYearName?: string;
}

/**
 * Headless state and mutation orchestration hook for the 4-step Grade Promotion wizard.
 */
export function useGradePromotionWizard({
    isOpen,
    targetAcademicYearId,
    targetAcademicYearName,
}: UseGradePromotionWizardParams) {
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

    // Filter states for Step 1 (Grade 6 graduation)
    const [grade6Search, setGrade6Search] = useState<string>('');
    const [grade6ClassFilter, setGrade6ClassFilter] = useState<string>('ALL');

    // Filter states for Step 3 (Grade 4 rolling deliberation)
    const [searchQuery, setSearchQuery] = useState<string>('');
    const [sourceClassFilter, setSourceClassFilter] = useState<string>('ALL');
    const [placementFilter, setPlacementFilter] = useState<'ALL' | 'UNASSIGNED' | 'ASSIGNED'>('ALL');

    const effectiveYearName = targetAcademicYearName || activeAcademicYear?.name || 'Tahun Ajaran Baru';

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

    const classTransitionSummary = useMemo<ClassTransitionSummaryRow[]>(() => {
        if (!workspace) return [];
        const rows: ClassTransitionSummaryRow[] = [];

        for (const cls of workspace.autoMap.grade6GraduationClasses) {
            const clsMoves = plannedMoves.filter(m => m.from_class_id === cls.id);
            rows.push({
                fromClassId: cls.id,
                fromClassName: cls.name,
                targetLabel: 'Lulus (Alumni)',
                movingCount: clsMoves.filter(m => m.action_type === 'graduated').length,
                retainedCount: clsMoves.filter(m => m.action_type === 'retained').length,
            });
        }

        for (const cls of regularSourceClasses) {
            const clsMoves = plannedMoves.filter(m => m.from_class_id === cls.id);
            const defaultTargetId = workspace.autoMap.classMapping[cls.id]?.toClassId || '';
            const targetId = draft.classTargetOverrides[cls.id] || defaultTargetId;
            rows.push({
                fromClassId: cls.id,
                fromClassName: cls.name,
                targetLabel: classById.get(targetId)?.name || 'Belum dipilih',
                movingCount: clsMoves.filter(m => m.action_type === 'promoted').length,
                retainedCount: clsMoves.filter(m => m.action_type === 'retained').length,
            });
        }

        for (const cls of workspace.autoMap.grade3SourceClasses) {
            const clsMoves = plannedMoves.filter(m => m.from_class_id === cls.id);
            rows.push({
                fromClassId: cls.id,
                fromClassName: cls.name,
                targetLabel: 'Pembagian Kelas 4',
                movingCount: clsMoves.filter(m => m.action_type === 'rolled').length,
                retainedCount: clsMoves.filter(m => m.action_type === 'retained').length,
            });
        }

        return rows;
    }, [workspace, plannedMoves, regularSourceClasses, draft.classTargetOverrides, classById]);

    const handleToggleGraduateStudent = useCallback((studentId: string) => {
        setDraft(prev => {
            const set = new Set(prev.excludedGraduationStudentIds);
            if (set.has(studentId)) {
                set.delete(studentId);
            } else {
                set.add(studentId);
            }
            return { ...prev, excludedGraduationStudentIds: Array.from(set) };
        });
    }, []);

    const handleGraduateAllGrade6 = useCallback(() => {
        setDraft(prev => ({ ...prev, excludedGraduationStudentIds: [] }));
    }, []);

    const handleSetClassTargetOverride = useCallback((classId: string, targetClassId: string) => {
        setDraft(prev => ({
            ...prev,
            classTargetOverrides: {
                ...prev.classTargetOverrides,
                [classId]: targetClassId,
            },
        }));
    }, []);

    const handleToggleRetainedRegular = useCallback((studentId: string, isCurrentlyRetained: boolean) => {
        setDraft(prev => {
            const next = { ...prev.regularOverrides };
            if (isCurrentlyRetained) {
                delete next[studentId];
            } else {
                next[studentId] = RETAINED_TARGET;
            }
            return { ...prev, regularOverrides: next };
        });
    }, []);

    const handleAssignGrade3Student = useCallback((studentId: string, targetClassId: string) => {
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
    }, []);

    const handleSetCopyTeacherAssignments = useCallback((checked: boolean) => {
        setDraft(prev => ({ ...prev, copyTeacherAssignments: checked }));
    }, []);

    const handleGenerateBalancedDraft = useCallback(() => {
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
        setDraft(prev => ({ ...prev, grade3Allocations: generated }));
        toast.success('Pembagian rata siswa Kelas 4 berhasil disusun.');
    }, [workspace, toast]);

    const handleSaveDraft = useCallback(async () => {
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
    }, [activeAcademicYear?.id, targetAcademicYearId, activeSemester?.id, targetSemesterId, draft, toast]);

    const handleExportExcel = useCallback(async () => {
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
    }, [workspace, effectiveYearName, plannedMoves, draft.grade3Allocations, toast]);

    const handleExecutePromotion = useCallback(async () => {
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
    }, [
        isAdmin,
        grade4Counters.unassignedCount,
        activeAcademicYear?.id,
        targetAcademicYearId,
        activeSemester?.id,
        targetSemesterId,
        effectiveYearName,
        plannedMoves,
        draft.copyTeacherAssignments,
        toast,
        queryClient,
        loadWorkspace,
    ]);

    const handleRollback = useCallback(async (batchId: string) => {
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
    }, [isAdmin, toast, queryClient, loadWorkspace]);

    const steps = useMemo<GradePromotionStepMeta[]>(() => [
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
    ], [grade6Students.length, draft.excludedGraduationStudentIds.length, regularSourceClasses.length, grade4Counters.unassignedCount, moveSummary.total]);

    return {
        isAdmin,
        step,
        setStep,
        steps,
        loading,
        loadError,
        savingDraft,
        executing,
        rollingBack,
        confirmExecute,
        setConfirmExecute,
        workspace,
        draft,
        expandedClassId,
        setExpandedClassId,
        grade6Search,
        setGrade6Search,
        grade6ClassFilter,
        setGrade6ClassFilter,
        searchQuery,
        setSearchQuery,
        sourceClassFilter,
        setSourceClassFilter,
        placementFilter,
        setPlacementFilter,
        effectiveYearName,
        grade6Students,
        filteredGrade6Students,
        groupedRegularClasses,
        grade4Counters,
        filteredGrade3Students,
        plannedMoves,
        moveSummary,
        classById,
        classTransitionSummary,
        loadWorkspace,
        handleToggleGraduateStudent,
        handleGraduateAllGrade6,
        handleSetClassTargetOverride,
        handleToggleRetainedRegular,
        handleAssignGrade3Student,
        handleSetCopyTeacherAssignments,
        handleGenerateBalancedDraft,
        handleSaveDraft,
        handleExportExcel,
        handleExecutePromotion,
        handleRollback,
    };
}
