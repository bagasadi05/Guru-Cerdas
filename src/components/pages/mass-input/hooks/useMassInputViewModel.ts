import { useEffect, useMemo, useDeferredValue, useRef, useState } from 'react';
import { useToast } from '../../../../hooks/useToast';
import { useMassInputData } from './useMassInputData';
import { useMassInputState } from './useMassInputState';
import { useMassInputMutations } from './useMassInputMutations';
import { AcademicRecordRow, StudentFilter, StudentRow } from '../types';
import { actionCards } from '../constants';
import { useWarnUnsavedChanges } from '../../../../hooks/useWarnUnsavedChanges';
import { useUserSettings } from '../../../../hooks/useUserSettings';

/** How long a cleared batch can still be restored from the undo bar. */
const UNDO_CLEAR_WINDOW_MS = 8000;

/** Debounce for persisting KKM so typing does not spam the settings row. */
const KKM_SAVE_DEBOUNCE_MS = 1000;

export function useMassInputViewModel() {
    const toast = useToast();

    const state = useMassInputState();
    const {
        settings: userSettings,
        isLoading: isLoadingUserSettings,
        updateSettings,
    } = useUserSettings();

    const data = useMassInputData(
        state.selectedClass,
        state.subjectGradeInfo.subject,
        state.subjectGradeInfo.assessment_name,
        state.mode || undefined,
        state.subjectGradeInfo.semester || undefined,
    );

    // Auto-select first class when classes load
    useEffect(() => {
        if (data.classes && data.classes.length > 0 && !state.selectedClass) {
            state.setSelectedClass(data.classes[0].id);
        }
    }, [data.classes, state.selectedClass]); // eslint-disable-line react-hooks/exhaustive-deps

    // KKM is a per-teacher setting edited on the Settings page. Seed the input
    // screen from it once the settings query settles, otherwise every visit
    // silently falls back to 75 and the pass/fail boundary shown here (grouping,
    // mini chart, Excel export) disagrees with the teacher's own setting.
    const hasSeededKkm = useRef(false);
    const { kkm, setKkm } = state;
    useEffect(() => {
        // Wait for the settings query to actually resolve — `kkm` is the 75
        // fallback until then, and seeding from it would be a no-op we could
        // not retry.
        if (hasSeededKkm.current || isLoadingUserSettings || !userSettings) return;
        hasSeededKkm.current = true;
        const savedKkm = userSettings.kkm;
        if (typeof savedKkm === 'number' && savedKkm !== kkm) {
            setKkm(savedKkm);
        }
    }, [isLoadingUserSettings, userSettings, kkm, setKkm]);

    // KKM edits write back to the teacher's settings (debounced) so the value
    // survives the next visit instead of silently resetting to 75.
    const pendingKkmRef = useRef<number | null>(null);
    const kkmSaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const handleKkmChange = (value: number) => {
        setKkm(value);
        // Before the stored value finished loading, persisting would overwrite
        // the teacher's own setting with this session's default.
        if (!hasSeededKkm.current) return;
        pendingKkmRef.current = value;
        if (kkmSaveTimerRef.current) clearTimeout(kkmSaveTimerRef.current);
        kkmSaveTimerRef.current = setTimeout(() => {
            if (pendingKkmRef.current === null) return;
            updateSettings({ kkm: pendingKkmRef.current });
            pendingKkmRef.current = null;
        }, KKM_SAVE_DEBOUNCE_MS);
    };

    // Flush a pending KKM edit when the page unmounts, otherwise the debounce
    // would swallow the last change.
    useEffect(() => () => {
        if (kkmSaveTimerRef.current) clearTimeout(kkmSaveTimerRef.current);
        if (pendingKkmRef.current !== null) {
            updateSettings({ kkm: pendingKkmRef.current });
            pendingKkmRef.current = null;
        }
    }, [updateSettings]);

    // --- Guard for destructive actions ---
    // Every path that throws away typed work goes through a confirmation, and
    // the discarded batch can still be restored from an undo bar.
    const [pendingClearAction, setPendingClearAction] = useState<{
        kind: 'scores' | 'selection' | 'back' | 'switch_config';
        count: number;
        nextInfo?: { subject: string; assessment_name: string; notes: string; semester: string };
    } | null>(null);
    const [undoSnapshot, setUndoSnapshot] = useState<{
        kind: 'scores' | 'selection';
        count: number;
        scores: Record<string, string>;
        selectedStudentIds: string[];
    } | null>(null);

    useEffect(() => {
        if (!undoSnapshot) return;
        const timer = setTimeout(() => setUndoSnapshot(null), UNDO_CLEAR_WINDOW_MS);
        return () => clearTimeout(timer);
    }, [undoSnapshot]);

    // Warn before unload if there are unsaved score changes
    useWarnUnsavedChanges(
        state.mode === 'subject_grade' && state.isScoresDirtyRef.current,
        'Ada nilai yang belum disimpan. Yakin ingin keluar?'
    );

    // Sync scores from existing grades (only when not dirty)
    useEffect(() => {
        if (state.mode === 'subject_grade' && data.existingGrades) {
            if (!state.isScoresDirtyRef.current) {
                const initialScores = data.existingGrades.reduce((acc: Record<string, string>, record: AcademicRecordRow) => {
                    acc[record.student_id] = String(record.score);
                    return acc;
                }, {} as Record<string, string>);
                state.setScores(initialScores);
            }
        } else if (state.mode !== 'subject_grade') {
            state.setScores(prev => Object.keys(prev).length === 0 ? prev : {});
            state.setIsScoresDirty(false);
        }
    }, [data.existingGrades, state.mode]); // eslint-disable-line react-hooks/exhaustive-deps

    // --- Derived state ---

    const filteredExistingGrades = useMemo((): AcademicRecordRow[] => {
        if (!data.existingGrades) return [];
        if (!state.subjectGradeInfo.semester) return data.existingGrades;
        return data.existingGrades.filter(record => record.semester_id === state.subjectGradeInfo.semester);
    }, [data.existingGrades, state.subjectGradeInfo.semester]);

    const studentsWithInputScores = useMemo(() => {
        return new Set(Object.entries(state.scores)
            .filter(([, score]) => score.trim() !== '')
            .map(([studentId]) => studentId));
    }, [state.scores]);

    // The "Sudah/Belum Dinilai" filter must not re-order the list while the
    // teacher is still typing: the row would unmount mid-entry (losing focus and
    // the digits already typed). The row that currently owns the cursor is
    // pinned in place and only leaves the list once focus moves elsewhere.
    const [focusedStudentId, setFocusedStudentId] = useState<string | null>(null);

    const deferredSearchTerm = useDeferredValue(state.searchTerm);

    const students = useMemo((): StudentRow[] => {
        if (!data.studentsData) return [];
        let filtered = data.studentsData;
        if (state.mode === 'subject_grade') {
            if (state.studentFilter === 'graded') filtered = filtered.filter(s => studentsWithInputScores.has(s.id) || s.id === focusedStudentId);
            else if (state.studentFilter === 'ungraded') filtered = filtered.filter(s => !studentsWithInputScores.has(s.id) || s.id === focusedStudentId);
        } else if (state.mode) {
            if (state.studentFilter === 'selected') filtered = filtered.filter(s => state.selectedStudentIds.has(s.id));
            else if (state.studentFilter === 'unselected') filtered = filtered.filter(s => !state.selectedStudentIds.has(s.id));
        }
        if (deferredSearchTerm) {
            const term = deferredSearchTerm.toLowerCase().trim();
            filtered = filtered.filter(s => s.name.toLowerCase().includes(term));
        }
        return filtered;
    }, [data.studentsData, deferredSearchTerm, state.studentFilter, studentsWithInputScores, state.selectedStudentIds, state.mode, focusedStudentId]);

    const gradedCount = useMemo(() => Object.values(state.scores).filter((s: string) => s && s.trim() !== '').length, [state.scores]);

    const isAllSelected = useMemo(() => {
        if (students.length === 0) return false;
        return students.every(s => state.selectedStudentIds.has(s.id));
    }, [state.selectedStudentIds, students]);

    const filterOptions = useMemo((): { value: StudentFilter; label: string }[] => {
        if (state.mode === 'subject_grade')
            return [{ value: 'all', label: 'Semua' }, { value: 'graded', label: 'Sudah Dinilai' }, { value: 'ungraded', label: 'Belum Dinilai' }];
        if (['quiz', 'violation', 'bulk_report', 'academic_print', 'attitude'].includes(state.mode || ''))
            return [{ value: 'all', label: 'Semua' }, { value: 'selected', label: 'Terpilih' }, { value: 'unselected', label: 'Belum Dipilih' }];
        return [];
    }, [state.mode]);

    const mutations = useMassInputMutations({
        mode: state.mode,
        selectedClass: state.selectedClass,
        quizInfo: state.quizInfo,
        subjectGradeInfo: state.subjectGradeInfo,
        attitudeDate: state.attitudeDate,
        attitudeCategory: state.attitudeCategory,
        attitudeName: state.attitudeName,
        attitudePoints: state.attitudePoints,
        attitudeNotes: state.attitudeNotes,
        scores: state.scores,
        validationErrors: state.validationErrors,
        existingGrades: data.existingGrades,
        selectedStudentIds: state.selectedStudentIds,
        selectedViolationCode: state.selectedViolationCode,
        violationDate: state.violationDate,
        violationNotes: state.violationNotes,
        studentsData: data.studentsData,
        noteMethod: state.noteMethod,
        templateNote: state.templateNote,
        pasteData: state.pasteData,
        gradedCount,
        filteredExistingGrades,
        classes: data.classes,
        setScores: state.setScores,
        setSelectedStudentIds: state.setSelectedStudentIds,
        bypassDuplicateGuard: state.bypassDuplicateGuard,
        isScoresDirtyRef: state.isScoresDirtyRef,
        setIsScoresDirty: state.setIsScoresDirty,
        clearSubjectGradeDraft: state.clearSubjectGradeDraft,
        saveSubjectGradeDraft: state.saveSubjectGradeDraft,
    });

    const attitudeFilledCount = useMemo(() => {
        return Object.values(state.attitudePredicates).filter(p => p && (p.spiritual?.trim() || p.social?.trim())).length;
    }, [state.attitudePredicates]);

    // Pre-fill attitude predicates from existing records
    const { setAttitudePredicates } = state;
    useEffect(() => {
        if (state.mode === 'attitude' && data.existingAttitudeRecords && data.existingAttitudeRecords.length > 0) {
            const map: Record<string, { spiritual: string; social: string }> = {};
            data.existingAttitudeRecords.forEach(rec => {
                map[rec.student_id] = {
                    spiritual: rec.spiritual_predicate || '',
                    social: rec.social_predicate || '',
                };
            });
            setAttitudePredicates(prev => {
                // If user has already made edits, keep them, otherwise use existing
                const hasEdits = Object.values(prev).some(p => p.spiritual || p.social);
                if (hasEdits) return { ...map, ...prev };
                return map;
            });
        }
    }, [state.mode, data.existingAttitudeRecords, setAttitudePredicates]);

    const summaryText = useMemo(() => {
        const totalStudents = data.studentsData?.length || 0;
        if (state.mode === 'subject_grade') return `${gradedCount} dari ${totalStudents} siswa telah dinilai.`;
        if (state.mode === 'attitude') return `${state.selectedStudentIds.size} dari ${totalStudents} siswa dipilih (+1 poin ${state.attitudeCategory}).`;
        return `${state.selectedStudentIds.size} dari ${totalStudents} siswa dipilih.`;
    }, [state.mode, gradedCount, state.attitudeCategory, state.selectedStudentIds.size, data.studentsData]);

    const submitButtonTooltip = useMemo(() => {
        if (!mutations.isOnline) return 'Fitur ini memerlukan koneksi internet.';
        if (mutations.isSubmitting || mutations.isExporting || mutations.isDeleting) return 'Sedang memproses...';
        if (!state.selectedClass) return 'Pilih kelas terlebih dahulu.';
        switch (state.mode) {
            case 'subject_grade': {
                if (!state.subjectGradeInfo.subject || !state.subjectGradeInfo.assessment_name) return 'Lengkapi mata pelajaran dan nama penilaian.';
                const invalidCount = Object.keys(state.validationErrors).length;
                if (invalidCount > 0) return `Perbaiki ${invalidCount} nilai yang tidak valid (harus 0-100) sebelum menyimpan.`;
                if (gradedCount === 0) return 'Masukkan setidaknya satu nilai siswa.'; break;
            }
            case 'attitude':
                if (!state.attitudeName?.trim()) return 'Isi nama aktivitas sikap terlebih dahulu.';
                if (state.selectedStudentIds.size === 0) return 'Pilih setidaknya satu siswa untuk diberi poin sikap.'; break;
            case 'quiz':
                if (!state.quizInfo.name || !state.quizInfo.subject) return 'Lengkapi nama dan mata pelajaran aktivitas.';
                if (state.selectedStudentIds.size === 0) return 'Pilih setidaknya satu siswa.'; break;
            case 'violation':
                if (!state.selectedViolationCode) return 'Pilih jenis pelanggaran.';
                if (state.selectedStudentIds.size === 0) return 'Pilih setidaknya satu siswa.'; break;
            case 'bulk_report':
            case 'academic_print':
                if (state.selectedStudentIds.size === 0) return 'Pilih setidaknya satu siswa.';
                if (state.mode === 'academic_print' && !state.subjectGradeInfo.subject) return 'Pilih mata pelajaran untuk dicetak.'; break;
        }
        return '';
    }, [mutations.isOnline, mutations.isSubmitting, mutations.isExporting, mutations.isDeleting, state.selectedClass, state.mode, state.subjectGradeInfo, state.validationErrors, gradedCount, state.attitudeName, state.selectedStudentIds, state.quizInfo, state.selectedViolationCode]);

    const isSubmitDisabled = !!submitButtonTooltip;

    const handleSelectAllStudents = (checked: boolean) => {
        const visibleStudentIds = students.map(s => s.id);

        state.setSelectedStudentIds(prev => {
            const next = new Set(prev);
            visibleStudentIds.forEach(id => {
                if (checked) next.add(id);
                else next.delete(id);
            });
            return next;
        });
    };

    const requestClear = () => {
        const kind = state.mode === 'subject_grade' ? 'scores' : 'selection';
        const count = kind === 'scores' ? gradedCount : state.selectedStudentIds.size;
        if (count === 0) return;
        setPendingClearAction({ kind, count });
    };

    const handleBack = () => {
        const hasUnsavedWork = state.mode === 'subject_grade'
            && gradedCount > 0
            && state.isScoresDirtyRef.current;
        if (hasUnsavedWork) {
            setPendingClearAction({ kind: 'back', count: gradedCount });
            return;
        }
        state.handleBack();
    };

    const handleSubjectGradeInfoChange = (
        updater: React.SetStateAction<{ subject: string; assessment_name: string; notes: string; semester: string }>
    ) => {
        const next = typeof updater === 'function' ? updater(state.subjectGradeInfo) : updater;
        const isTypingSubject =
            Boolean(state.subjectGradeInfo.subject) &&
            Boolean(next.subject) &&
            (next.subject.startsWith(state.subjectGradeInfo.subject) ||
             state.subjectGradeInfo.subject.startsWith(next.subject));

        const isSubjectChanged = Boolean(state.subjectGradeInfo.subject) &&
            Boolean(next.subject) &&
            !isTypingSubject &&
            next.subject !== state.subjectGradeInfo.subject;

        const isTypingAssessment =
            Boolean(state.subjectGradeInfo.assessment_name) &&
            Boolean(next.assessment_name) &&
            (next.assessment_name.startsWith(state.subjectGradeInfo.assessment_name) ||
             state.subjectGradeInfo.assessment_name.startsWith(next.assessment_name));

        const isAssessmentChanged = Boolean(state.subjectGradeInfo.assessment_name) &&
            Boolean(next.assessment_name) &&
            !isTypingAssessment &&
            next.assessment_name !== state.subjectGradeInfo.assessment_name;

        const isSubjectOrAssessmentChanged = isSubjectChanged || isAssessmentChanged;

        if (isSubjectOrAssessmentChanged && state.mode === 'subject_grade' && state.isScoresDirtyRef.current && gradedCount > 0) {
            setPendingClearAction({
                kind: 'switch_config',
                count: gradedCount,
                nextInfo: next,
            });
            return;
        }

        state.setSubjectGradeInfo(next);
    };

    const dismissPendingAction = () => setPendingClearAction(null);

    const confirmPendingAction = () => {
        const action = pendingClearAction;
        setPendingClearAction(null);
        if (!action) return;

        if (action.kind === 'back') {
            state.handleBack();
            return;
        }

        if (action.kind === 'switch_config') {
            if (action.nextInfo) {
                state.clearSubjectGradeDraft();
                state.setIsScoresDirty(false);
                state.setScores({});
                state.setSubjectGradeInfo(action.nextInfo);
            }
            return;
        }

        // Snapshot before clearing so the undo bar can put everything back.
        setUndoSnapshot({
            kind: action.kind,
            count: action.count,
            scores: { ...state.scores },
            selectedStudentIds: Array.from(state.selectedStudentIds),
        });

        if (action.kind === 'scores') state.setScores({});
        else state.setSelectedStudentIds(new Set());
    };

    const handleUndoClear = () => {
        if (!undoSnapshot) return;
        state.setScores(undoSnapshot.scores);
        state.setSelectedStudentIds(new Set(undoSnapshot.selectedStudentIds));
        setUndoSnapshot(null);
        toast.info('Input dikembalikan. Jangan lupa simpan setelah selesai.');
    };

    const handleImport = (importedData: Record<string, unknown>[]) => {
        state.setPendingImportData(importedData.map(row => ({
            name: String(row.name || ''),
            score: row.score !== undefined && row.score !== null ? String(row.score) : ''
        })));
        state.setShowImportModal(false);
    };

    const handleImportConfirm = (mappedScores: Record<string, string>) => {
        const importedScores = { ...state.scores, ...mappedScores };

        // Persist synchronously before React updates state. A service-worker
        // controller change can remount this page immediately after this click.
        state.saveSubjectGradeDraft({
            selectedClass: state.selectedClass,
            subjectGradeInfo: state.subjectGradeInfo,
            scores: importedScores,
            selectedStudentIds: Array.from(state.selectedStudentIds),
        });
        state.setScores(importedScores);
        state.setPendingImportData(null);
        // Do not let an in-flight existing-grades query overwrite imported
        // values before the teacher explicitly saves them.
        state.setIsScoresDirty(true);
        toast.success(`Berhasil memproses dan menerapkan ${Object.keys(mappedScores).length} nilai siswa. Klik Simpan untuk menyimpannya ke database.`);
    };

    const handleDeleteConfirmClick = () => {
        if (mutations.confirmDeleteText === 'HAPUS') {
            mutations.handleConfirmDelete();
            mutations.setConfirmDeleteText('');
        } else {
            toast.error('Konfirmasi tidak valid. Ketik HAPUS dengan benar.');
        }
    };

    const currentCard = actionCards.find(c => c.mode === state.mode);

    return {
        step: state.step,
        mode: state.mode,
        handleModeSelect: state.handleModeSelect,
        handleBack,
        currentCard,
        // config panel
        isConfigOpen: state.isConfigOpen,
        setIsConfigOpen: state.setIsConfigOpen,
        selectedClass: state.selectedClass,
        setSelectedClass: state.setSelectedClass,
        classes: data.classes,
        isLoadingClasses: data.isLoadingClasses,
        quizInfo: state.quizInfo,
        setQuizInfo: state.setQuizInfo,
        subjectGradeInfo: state.subjectGradeInfo,
        setSubjectGradeInfo: handleSubjectGradeInfoChange,
        kkm: state.kkm,
        // Debounced setter that also persists KKM to the teacher's settings.
        setKkm: handleKkmChange,
        pendingClearAction,
        confirmPendingAction,
        dismissPendingAction,
        requestClear,
        undoSnapshot,
        handleUndoClear,
        attitudeDate: state.attitudeDate,
        setAttitudeDate: state.setAttitudeDate,
        attitudeCategory: state.attitudeCategory,
        setAttitudeCategory: state.setAttitudeCategory,
        attitudeName: state.attitudeName,
        setAttitudeName: state.setAttitudeName,
        attitudePoints: state.attitudePoints,
        setAttitudePoints: state.setAttitudePoints,
        attitudeNotes: state.attitudeNotes,
        setAttitudeNotes: state.setAttitudeNotes,
        attitudePredicates: state.attitudePredicates,
        setAttitudePredicates: state.setAttitudePredicates,
        handleAttitudePredicateChange: state.handleAttitudePredicateChange,
        handleQuickFillAttitude: state.handleQuickFillAttitude,
        attitudeFilledCount,
        existingAttitudeRecords: data.existingAttitudeRecords,
        isLoadingAttitude: data.isLoadingAttitude,
        isCustomSubject: state.isCustomSubject,
        setIsCustomSubject: state.setIsCustomSubject,
        uniqueSubjects: data.uniqueSubjects,
        selectedViolationCode: state.selectedViolationCode,
        setSelectedViolationCode: state.setSelectedViolationCode,
        violationDate: state.violationDate,
        setViolationDate: state.setViolationDate,
        violationNotes: state.violationNotes,
        setViolationNotes: state.setViolationNotes,
        noteMethod: state.noteMethod,
        setNoteMethod: state.setNoteMethod,
        templateNote: state.templateNote,
        setTemplateNote: state.setTemplateNote,
        assessmentNames: data.assessmentNames,
        pasteData: state.pasteData,
        setPasteData: state.setPasteData,
        isParsing: mutations.isParsing,
        handleAiParse: mutations.handleAiParse,
        isOnline: mutations.isOnline,
        showImportModal: state.showImportModal,
        setShowImportModal: state.setShowImportModal,
        // student list
        searchTerm: state.searchTerm,
        setSearchTerm: state.setSearchTerm,
        filterOptions,
        studentFilter: state.studentFilter,
        setStudentFilter: state.setStudentFilter,
        isLoadingStudents: data.isLoadingStudents,
        students,
        isAllSelected,
        handleSelectAllStudents,
        selectedStudentIds: state.selectedStudentIds,
        handleStudentSelect: state.handleStudentSelect,
        scores: state.scores,
        handleScoreChange: state.handleScoreChange,
        onScoreFieldFocus: setFocusedStudentId,
        existingGrades: data.existingGrades,
        filteredExistingGrades,
        // footer
        summaryText,
        gradedCount,
        setScores: state.setScores,
        setSelectedStudentIds: state.setSelectedStudentIds,
        isExporting: mutations.isExporting,
        exportProgress: mutations.exportProgress,
        handleSubmit: mutations.handleSubmit,
        isSubmitDisabled,
        submitButtonTooltip,
        isSubmitting: mutations.isSubmitting,
        isDeleting: mutations.isDeleting,
        onDeleteSelected: mutations.handleDeleteSelected,
        studentsData: data.studentsData,
        existingViolations: data.existingViolations,
        isLoadingViolations: data.isLoadingViolations,
        existingQuizPoints: data.existingQuizPoints,
        isLoadingQuizPoints: data.isLoadingQuizPoints,
        // chart modal
        showChartModal: state.showChartModal,
        setShowChartModal: state.setShowChartModal,
        // delete modal
        confirmDeleteModal: mutations.confirmDeleteModal,
        setConfirmDeleteModal: mutations.setConfirmDeleteModal,
        confirmDeleteText: mutations.confirmDeleteText,
        setConfirmDeleteText: mutations.setConfirmDeleteText,
        handleDeleteConfirmClick,
        // import modal
        handleImport,
        handleImportConfirm,
        pendingImportData: state.pendingImportData,
        setPendingImportData: state.setPendingImportData,
        validationErrors: state.validationErrors,
        bypassDuplicateGuard: state.bypassDuplicateGuard,
        setBypassDuplicateGuard: state.setBypassDuplicateGuard,
        // duplicate detection (violation / quiz / attitude)
        duplicateList: mutations.duplicateList,
        showDuplicateDialog: mutations.showDuplicateDialog,
        setShowDuplicateDialog: mutations.setShowDuplicateDialog,
        onHandleSubmit: () => {
            // Ketiga mode ini punya jalur skip duplikat; semuanya memberi tahu guru
            // lebih dulu lewat dialog pratinjau yang sama.
            const needsDuplicatePreview =
                (state.mode === 'violation' && !!state.selectedViolationCode) ||
                (state.mode === 'quiz' && !!state.quizInfo.name && !!state.quizInfo.subject) ||
                (state.mode === 'attitude' && !!state.attitudeName?.trim());

            if (needsDuplicatePreview) {
                mutations.checkDuplicates(() => mutations.handleSubmit());
            } else {
                mutations.handleSubmit();
            }
        },
        isScoresDirty: state.isScoresDirty,
        setIsScoresDirty: state.setIsScoresDirty,
        saveSubjectGradeDraft: state.saveSubjectGradeDraft,
        clearSubjectGradeDraft: state.clearSubjectGradeDraft,
    };
}
