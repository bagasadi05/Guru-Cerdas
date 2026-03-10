import { useEffect, useMemo } from 'react';
import { useToast } from '../../../../hooks/useToast';
import { useMassInputData } from './useMassInputData';
import { useMassInputState } from './useMassInputState';
import { useMassInputMutations } from './useMassInputMutations';
import { AcademicRecordRow, StudentFilter, StudentRow } from '../types';
import { actionCards } from '../constants';

export function useMassInputViewModel() {
    const toast = useToast();

    const state = useMassInputState();

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

    // Sync scores from existing grades (only when not dirty)
    useEffect(() => {
        if (state.mode === 'subject_grade' && data.existingGrades) {
            if (!state.isScoresDirty.current) {
                const initialScores = data.existingGrades.reduce((acc: Record<string, string>, record: AcademicRecordRow) => {
                    acc[record.student_id] = String(record.score);
                    return acc;
                }, {} as Record<string, string>);
                state.setScores(initialScores);
            }
        } else if (state.mode !== 'subject_grade') {
            state.setScores(prev => Object.keys(prev).length === 0 ? prev : {});
            state.isScoresDirty.current = false;
        }
    }, [data.existingGrades, state.mode]); // eslint-disable-line react-hooks/exhaustive-deps

    // --- Derived state ---

    const filteredExistingGrades = useMemo((): AcademicRecordRow[] => {
        if (!data.existingGrades) return [];
        if (!state.subjectGradeInfo.semester) return data.existingGrades;
        return data.existingGrades.filter(record => record.semester_id === state.subjectGradeInfo.semester);
    }, [data.existingGrades, state.subjectGradeInfo.semester]);

    const studentsWithGrades = useMemo(() => new Set(filteredExistingGrades.map(g => g.student_id)), [filteredExistingGrades]);

    const students = useMemo((): StudentRow[] => {
        if (!data.studentsData) return [];
        let filtered = data.studentsData;
        if (state.mode === 'subject_grade' || state.mode === 'delete_subject_grade') {
            if (state.studentFilter === 'graded') filtered = filtered.filter(s => studentsWithGrades.has(s.id));
            else if (state.studentFilter === 'ungraded') filtered = filtered.filter(s => !studentsWithGrades.has(s.id));
        } else if (state.mode) {
            if (state.studentFilter === 'selected') filtered = filtered.filter(s => state.selectedStudentIds.has(s.id));
            else if (state.studentFilter === 'unselected') filtered = filtered.filter(s => !state.selectedStudentIds.has(s.id));
        }
        if (state.searchTerm) filtered = filtered.filter(s => s.name.toLowerCase().includes(state.searchTerm.toLowerCase()));
        return filtered;
    }, [data.studentsData, state.searchTerm, state.studentFilter, studentsWithGrades, state.selectedStudentIds, state.mode]);

    const gradedCount = useMemo(() => Object.values(state.scores).filter((s: string) => s && s.trim() !== '').length, [state.scores]);

    const selectableStudentsCount = useMemo(() => {
        if (!data.studentsData) return 0;
        if (state.mode === 'delete_subject_grade') return data.studentsData.filter(s => studentsWithGrades.has(s.id)).length;
        return data.studentsData.length;
    }, [data.studentsData, state.mode, studentsWithGrades]);

    const isAllSelected = useMemo(() => {
        if (selectableStudentsCount === 0) return false;
        return state.selectedStudentIds.size === selectableStudentsCount;
    }, [state.selectedStudentIds.size, selectableStudentsCount]);

    const filterOptions = useMemo((): { value: StudentFilter; label: string }[] => {
        if (state.mode === 'subject_grade' || state.mode === 'delete_subject_grade')
            return [{ value: 'all', label: 'Semua' }, { value: 'graded', label: 'Sudah Dinilai' }, { value: 'ungraded', label: 'Belum Dinilai' }];
        if (['quiz', 'violation', 'bulk_report', 'academic_print'].includes(state.mode || ''))
            return [{ value: 'all', label: 'Semua' }, { value: 'selected', label: 'Terpilih' }, { value: 'unselected', label: 'Belum Dipilih' }];
        return [];
    }, [state.mode]);

    const mutations = useMassInputMutations({
        mode: state.mode,
        selectedClass: state.selectedClass,
        quizInfo: state.quizInfo,
        subjectGradeInfo: state.subjectGradeInfo,
        scores: state.scores,
        validationErrors: state.validationErrors,
        existingGrades: data.existingGrades,
        selectedStudentIds: state.selectedStudentIds,
        selectedViolationCode: state.selectedViolationCode,
        violationDate: state.violationDate,
        studentsData: data.studentsData,
        noteMethod: state.noteMethod,
        templateNote: state.templateNote,
        pasteData: state.pasteData,
        gradedCount,
        filteredExistingGrades,
        classes: data.classes,
        setScores: state.setScores,
        setSelectedStudentIds: state.setSelectedStudentIds,
    });

    const summaryText = useMemo(() => {
        const totalStudents = data.studentsData?.length || 0;
        if (state.mode === 'subject_grade') return `${gradedCount} dari ${totalStudents} siswa telah dinilai.`;
        if (state.mode === 'delete_subject_grade') return `${state.selectedStudentIds.size} dari ${studentsWithGrades.size} siswa terpilih untuk dihapus.`;
        return `${state.selectedStudentIds.size} dari ${totalStudents} siswa dipilih.`;
    }, [state.mode, gradedCount, state.selectedStudentIds.size, data.studentsData, studentsWithGrades]);

    const submitButtonTooltip = useMemo(() => {
        if (!mutations.isOnline) return 'Fitur ini memerlukan koneksi internet.';
        if (mutations.isSubmitting || mutations.isExporting || mutations.isDeleting) return 'Sedang memproses...';
        if (!state.selectedClass) return 'Pilih kelas terlebih dahulu.';
        switch (state.mode) {
            case 'subject_grade':
                if (!state.subjectGradeInfo.subject || !state.subjectGradeInfo.assessment_name) return 'Lengkapi mata pelajaran dan nama penilaian.';
                if (gradedCount === 0) return 'Masukkan setidaknya satu nilai siswa.'; break;
            case 'quiz':
                if (!state.quizInfo.name || !state.quizInfo.subject) return 'Lengkapi nama dan mata pelajaran aktivitas.';
                if (state.selectedStudentIds.size === 0) return 'Pilih setidaknya satu siswa.'; break;
            case 'violation':
                if (!state.selectedViolationCode) return 'Pilih jenis pelanggaran.';
                if (state.selectedStudentIds.size === 0) return 'Pilih setidaknya satu siswa.'; break;
            case 'delete_subject_grade':
                if (!state.subjectGradeInfo.subject || !state.subjectGradeInfo.assessment_name) return 'Pilih mata pelajaran dan penilaian.';
                if (state.selectedStudentIds.size === 0) return 'Pilih setidaknya satu nilai siswa untuk dihapus.'; break;
            case 'bulk_report':
            case 'academic_print':
                if (state.selectedStudentIds.size === 0) return 'Pilih setidaknya satu siswa.';
                if (state.mode === 'academic_print' && !state.subjectGradeInfo.subject) return 'Pilih mata pelajaran untuk dicetak.'; break;
        }
        return '';
    }, [mutations.isOnline, mutations.isSubmitting, mutations.isExporting, mutations.isDeleting, state.selectedClass, state.mode, state.subjectGradeInfo, gradedCount, state.quizInfo, state.selectedStudentIds, state.selectedViolationCode]);

    const isSubmitDisabled = !!submitButtonTooltip;

    const handleSelectAllStudents = (checked: boolean) => {
        if (checked) {
            if (!data.studentsData) return;
            let idsToSelect = data.studentsData.map(s => s.id);
            if (state.mode === 'delete_subject_grade') idsToSelect = data.studentsData.filter(s => studentsWithGrades.has(s.id)).map(s => s.id);
            state.setSelectedStudentIds(new Set(idsToSelect));
        } else {
            state.setSelectedStudentIds(new Set());
        }
    };

    const handleImport = (importedData: Record<string, unknown>[]) => {
        if (!data.studentsData) return;
        const studentMap = new Map(data.studentsData.map(s => [s.name.toLowerCase().trim(), s.id]));
        let matchedCount = 0; let skippedNaN = 0;
        const newScores = { ...state.scores };
        importedData.forEach(row => {
            const name = String(row.name || '').trim().toLowerCase();
            const score = row.score;
            const studentId = studentMap.get(name);
            if (studentId && score !== undefined && score !== '') {
                const numScore = Number(score);
                if (isNaN(numScore)) { skippedNaN++; return; }
                newScores[studentId] = String(Math.min(100, Math.max(0, numScore)));
                matchedCount++;
            }
        });
        state.setScores(newScores);
        state.isScoresDirty.current = true;
        state.setShowImportModal(false);
        const message = `${matchedCount} nilai berhasil diimport dari ${importedData.length} baris`;
        if (skippedNaN > 0) toast.warning(`${message}. ${skippedNaN} baris dilewati karena nilai bukan angka.`);
        else toast.success(message);
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
        handleBack: state.handleBack,
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
        setSubjectGradeInfo: state.setSubjectGradeInfo,
        isCustomSubject: state.isCustomSubject,
        setIsCustomSubject: state.setIsCustomSubject,
        uniqueSubjects: data.uniqueSubjects,
        selectedViolationCode: state.selectedViolationCode,
        setSelectedViolationCode: state.setSelectedViolationCode,
        violationDate: state.violationDate,
        setViolationDate: state.setViolationDate,
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
        studentsData: data.studentsData,
        existingViolations: data.existingViolations,
        isLoadingViolations: data.isLoadingViolations,
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
    };
}
