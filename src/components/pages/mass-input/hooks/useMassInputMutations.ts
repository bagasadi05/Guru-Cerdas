import React from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../../../../services/supabase';
import { useAuth } from '../../../../hooks/useAuth';
import { useToast } from '../../../../hooks/useToast';
import { useSemester } from '../../../../contexts/SemesterContext';
import { useOfflineStatus } from '../../../../hooks/useOfflineStatus';
import { violationList } from '../../../../services/violations.data';
import { InputMode, ClassRow, StudentRow, AcademicRecordRow } from '../types';
import { triggerStarsConfetti } from '../../../../utils/confetti';

import { useDuplicateGuard, DUPLICATE_GUARD_WINDOW_MINUTES, getDuplicateGuardWindowIso } from './mutations/useDuplicateGuard';
import { executeSubjectGradeMutation } from './mutations/useSubjectGradeMutation';
import { executeAttitudeMutation } from './mutations/useAttitudeMutation';
import { executeQuizPointsMutation } from './mutations/useQuizPointsMutation';
import { executeViolationMutation } from './mutations/useViolationMutation';
import { useGradeDeletionMutation } from './mutations/useGradeDeletionMutation';
import { useMassInputExport } from './mutations/useMassInputExport';
import { useMassInputAiParse, findStudentMatch } from './mutations/useMassInputAiParse';

export { findStudentMatch, DUPLICATE_GUARD_WINDOW_MINUTES };

export interface UseMassInputMutationsParams {
    mode: InputMode | null;
    selectedClass: string;
    quizInfo: { name: string; category?: string; subject: string; date: string; points: number; max_points: number };
    subjectGradeInfo: { subject: string; assessment_name: string; notes: string; semester: string };
    attitudeDate?: string;
    attitudeCategory?: string;
    attitudeName?: string;
    attitudePoints?: number;
    attitudeNotes?: string;
    scores: Record<string, string>;
    validationErrors: Record<string, string>;
    existingGrades: AcademicRecordRow[] | undefined;
    selectedStudentIds: Set<string>;
    selectedViolationCode: string;
    violationDate: string;
    violationNotes: string;
    studentsData: StudentRow[] | undefined;
    noteMethod: 'ai' | 'template';
    templateNote: string;
    pasteData: string;
    gradedCount: number;
    filteredExistingGrades: AcademicRecordRow[];
    classes: ClassRow[] | undefined;
    setScores: React.Dispatch<React.SetStateAction<Record<string, string>>>;
    setSelectedStudentIds: React.Dispatch<React.SetStateAction<Set<string>>>;
    bypassDuplicateGuard: boolean;
    isScoresDirtyRef: React.MutableRefObject<boolean>;
    setIsScoresDirty?: (isDirty: boolean) => void;
    clearSubjectGradeDraft: () => void;
    saveSubjectGradeDraft?: (draft: any) => void;
}

export function useMassInputMutations(params: UseMassInputMutationsParams) {
    const {
        mode, selectedClass, quizInfo, subjectGradeInfo, scores, validationErrors,
        existingGrades, selectedStudentIds, selectedViolationCode, violationDate, violationNotes,
        attitudeDate, attitudeCategory, attitudeName, attitudeNotes,
        studentsData, noteMethod, templateNote, pasteData,
        gradedCount, classes,
        setScores, setSelectedStudentIds, bypassDuplicateGuard, isScoresDirtyRef, setIsScoresDirty, clearSubjectGradeDraft,
        saveSubjectGradeDraft,
    } = params;

    const { user } = useAuth();
    const queryClient = useQueryClient();
    const { activeSemester, activeAcademicYear } = useSemester();
    const toast = useToast();
    const isOnline = useOfflineStatus();

    const selectedViolation = violationList.find(v => v.code === selectedViolationCode) || null;

    // Sub-hook: Duplicate guard checking
    const {
        duplicateList,
        showDuplicateDialog,
        setShowDuplicateDialog,
        checkDuplicates,
    } = useDuplicateGuard({
        mode,
        user,
        selectedStudentIds,
        selectedViolation,
        violationDate,
        quizInfo,
        attitudeName,
        attitudeCategory,
        attitudeDate,
        subjectGradeInfo,
        activeSemester,
        studentsData,
    });

    // Sub-hook: Grade deletion
    const {
        deleteGrades,
        deleteGradesAsync,
        isDeleting,
        confirmDeleteModal,
        setConfirmDeleteModal,
        confirmDeleteText,
        setConfirmDeleteText,
        handleConfirmDelete,
        handleDeleteSelected,
    } = useGradeDeletionMutation({
        user,
        subjectGradeInfo,
        existingGrades,
        selectedStudentIds,
        setScores,
        setSelectedStudentIds,
        isScoresDirtyRef,
        setIsScoresDirty,
        queryClient,
        toast,
    });

    // Sub-hook: Exports (PDF Report & Grades)
    const {
        handlePrintBulkReports,
        handlePrintGrades,
        isExporting,
        exportProgress,
    } = useMassInputExport({
        selectedClass,
        subjectGradeInfo,
        selectedStudentIds,
        studentsData,
        classes,
        noteMethod,
        templateNote,
        activeSemester,
        activeAcademicYear,
        user,
        toast,
    });

    // Sub-hook: AI table paste parser
    const {
        handleAiParse,
        isParsing,
    } = useMassInputAiParse({
        studentsData,
        pasteData,
        selectedClass,
        subjectGradeInfo,
        selectedStudentIds,
        setScores,
        isScoresDirtyRef,
        setIsScoresDirty,
        saveSubjectGradeDraft,
        toast,
    });

    // Core Mutation: Submit data across modes
    const { mutate: submitData, isPending: isSubmitting } = useMutation({
        mutationFn: async (overrideBypassGuard?: boolean | void) => {
            if (!mode || !user) throw new Error('Mode atau pengguna tidak diatur');
            const shouldBypassGuard = overrideBypassGuard ?? bypassDuplicateGuard;

            switch (mode) {
                case 'quiz':
                    return executeQuizPointsMutation({
                        user,
                        quizInfo,
                        selectedStudentIds,
                        activeSemester,
                        shouldBypassGuard,
                        getDuplicateGuardWindowIso,
                    });

                case 'subject_grade':
                    return executeSubjectGradeMutation({
                        user,
                        subjectGradeInfo,
                        scores,
                        validationErrors,
                        gradedCount,
                        existingGrades,
                    });

                case 'violation':
                    return executeViolationMutation({
                        user,
                        selectedViolation,
                        selectedStudentIds,
                        violationDate,
                        violationNotes,
                        activeSemester,
                        shouldBypassGuard,
                    });

                case 'attitude':
                    return executeAttitudeMutation({
                        user,
                        selectedStudentIds,
                        attitudeName,
                        attitudeCategory,
                        attitudeDate,
                        attitudeNotes,
                        subjectGradeInfo,
                        activeSemester,
                        shouldBypassGuard,
                        getDuplicateGuardWindowIso,
                    });

                default:
                    throw new Error(`Mode "${mode}" tidak mendukung penyimpanan data.`);
            }
        },
        onSuccess: async (message: string) => {
            toast.success(message || 'Data berhasil disimpan!');
            if (mode === 'quiz' || mode === 'attitude') {
                triggerStarsConfetti();
            }
            queryClient.invalidateQueries({ queryKey: ['existingGrades'] });
            queryClient.invalidateQueries({ queryKey: ['existingAttitudeRecords'] });
            queryClient.invalidateQueries({ queryKey: ['studentDetails'] });
            queryClient.invalidateQueries({ queryKey: ['studentStats'] });
            queryClient.invalidateQueries({ queryKey: ['existingViolations'] });
            queryClient.invalidateQueries({ queryKey: ['quiz_points'] });
            queryClient.invalidateQueries({ queryKey: ['existingQuizPointsForMassInput'] });
            queryClient.invalidateQueries({ queryKey: ['bintangEvaluations'] });
            queryClient.invalidateQueries({ queryKey: ['bintangDashboard'] });
            isScoresDirtyRef.current = false;
            setIsScoresDirty?.(false);
            clearSubjectGradeDraft();

            // Fire-and-forget: log input untuk laporan harian WhatsApp
            if (mode != null) {
                try {
                    const classObj = classes?.find(c => c.id === selectedClass);
                    const details: Record<string, string> = {};
                    let studentCount = selectedStudentIds.size;
                    if (mode === 'quiz') {
                        details.quizName = quizInfo.name;
                        details.subject = quizInfo.subject;
                    } else if (mode === 'subject_grade') {
                        details.subject = subjectGradeInfo.subject;
                        details.assessmentName = subjectGradeInfo.assessment_name;
                        studentCount = gradedCount;
                    } else if (mode === 'violation') {
                        details.violationDesc = selectedViolation?.description || '';
                    } else if (mode === 'attitude') {
                        details.attitudeCategory = attitudeCategory || 'Adab & Akhlak';
                        details.attitudeName = attitudeName || 'Sikap';
                        details.attitudeDate = attitudeDate || '';
                        if (attitudeNotes) details.attitudeNotes = attitudeNotes;
                        studentCount = selectedStudentIds.size;
                    }

                    await supabase.from('daily_input_log').insert({
                        mode: mode!,
                        teacher_name: user?.name || 'Guru',
                        teacher_id: user!.id,
                        class_name: classObj?.name || '',
                        student_count: studentCount,
                        details,
                    });
                } catch {
                    // silent fail for daily input logging
                }
            }
        },
        onError: (err: Error) => toast.error(`Gagal menyimpan: ${err.message}`),
    });

    const handleSubmit = (overrideBypassGuard?: boolean) => {
        if (mode === 'bulk_report') handlePrintBulkReports();
        else if (mode === 'academic_print') handlePrintGrades();
        else submitData(overrideBypassGuard);
    };

    return {
        submitData, isSubmitting,
        deleteGrades, deleteGradesAsync, isDeleting,
        handleAiParse, isParsing,
        handlePrintBulkReports, handlePrintGrades,
        isExporting, exportProgress,
        confirmDeleteModal, setConfirmDeleteModal,
        confirmDeleteText, setConfirmDeleteText,
        handleConfirmDelete, handleDeleteSelected, handleSubmit,
        duplicateList, showDuplicateDialog,
        setShowDuplicateDialog, checkDuplicates,
        isOnline,
    };
}
