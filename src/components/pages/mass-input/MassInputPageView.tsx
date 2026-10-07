import React, { useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { Button } from '../../ui/Button';
import { Modal } from '../../ui/Modal';
import { ExcelImporter } from '../../ui/ExcelImporter';
import { GradeDistributionChart } from '../../ui/GradeDistributionChart';
import { ArrowLeftIcon } from '../../Icons';
import { UnifiedGradeAdjustmentModal } from '../../ui/UnifiedGradeAdjustmentModal';
import { ConfirmationDialog } from '../../ui/ConfirmationDialog';
import { useSemester } from '../../../contexts/SemesterContext';
import { Step1_ModeSelection } from './components/Step1_ModeSelection';
import { Step2_Configuration } from './components/Step2_Configuration';
import { Step2_StudentList } from './components/Step2_StudentList';
import { Step2_Footer } from './components/Step2_Footer';
import { ViolationExportPanel } from './components/ViolationExportPanel';
import { InputMode, Step, StudentFilter, StudentRow, AcademicRecordRow, ClassRow, ViolationRow, AttitudeRecordRow, QuizPointRow } from './types';
import { ImportPreviewModal } from './components/ImportPreviewModal';
import { violationList } from '../../../services/violations.data';
import { getFrequentViolations, buildViolationStatusMap } from './violationInsights';
import { findSemesterForDate } from '../../../utils/semesterUtils';
import { actionCards } from './constants';
import { CheckCircle2, Loader2, AlertCircle, XIcon, School, BookOpen, Star, AlertTriangle, Sparkles, SlidersHorizontal, RotateCcw } from 'lucide-react';

export interface MassInputPageViewProps {
    step: Step;
    mode: InputMode | null;
    handleModeSelect: (mode: InputMode) => void;
    handleBack: () => void;
    // Guard for destructive actions: every clear/back path asks first, and the
    // discarded batch stays restorable for a few seconds.
    pendingClearAction: { kind: 'scores' | 'selection' | 'back' | 'switch_config'; count: number } | null;
    confirmPendingAction: () => void;
    dismissPendingAction: () => void;
    requestClear: () => void;
    undoSnapshot: { kind: 'scores' | 'selection'; count: number } | null;
    handleUndoClear: () => void;
    currentCard: { title: string; description: string } | undefined;
    // config panel
    isConfigOpen: boolean;
    setIsConfigOpen: (v: boolean) => void;
    selectedClass: string;
    setSelectedClass: (v: string) => void;
    classes: ClassRow[] | undefined;
    isLoadingClasses: boolean;
    quizInfo: { name: string; category?: string; subject: string; date: string; points: number; max_points: number };
    setQuizInfo: React.Dispatch<React.SetStateAction<{ name: string; category?: string; subject: string; date: string; points: number; max_points: number }>>;
    subjectGradeInfo: { subject: string; assessment_name: string; notes: string; semester: string };
    setSubjectGradeInfo: React.Dispatch<React.SetStateAction<{ subject: string; assessment_name: string; notes: string; semester: string }>>;
    kkm: number;
    setKkm: (v: number) => void;
    attitudeDate?: string;
    setAttitudeDate?: (v: string) => void;
    attitudeCategory?: string;
    setAttitudeCategory?: (cat: string) => void;
    attitudeName?: string;
    setAttitudeName?: (name: string) => void;
    attitudePoints?: number;
    setAttitudePoints?: (pts: number) => void;
    attitudeNotes?: string;
    setAttitudeNotes?: (notes: string) => void;
    attitudePredicates: Record<string, { spiritual: string; social: string }>;
    setAttitudePredicates: React.Dispatch<React.SetStateAction<Record<string, { spiritual: string; social: string }>>>;
    handleAttitudePredicateChange?: (studentId: string, field: 'spiritual' | 'social', value: string) => void;
    handleQuickFillAttitude?: (studentIds: string[], predicate: string, target?: 'both' | 'spiritual' | 'social') => void;
    attitudeFilledCount?: number;
    existingAttitudeRecords?: AttitudeRecordRow[];
    existingQuizPoints?: QuizPointRow[];
    isLoadingQuizPoints?: boolean;
    isCustomSubject: boolean;
    setIsCustomSubject: (v: boolean) => void;
    uniqueSubjects: string[] | undefined;
    selectedViolationCode: string;
    setSelectedViolationCode: (v: string) => void;
    violationDate: string;
    setViolationDate: (v: string) => void;
    violationNotes: string;
    setViolationNotes: (v: string) => void;
    noteMethod: 'ai' | 'template';
    setNoteMethod: (v: 'ai' | 'template') => void;
    templateNote: string;
    setTemplateNote: (v: string) => void;
    assessmentNames: string[] | undefined;
    pasteData: string;
    setPasteData: (v: string) => void;
    isParsing: boolean;
    handleAiParse: () => void;
    isOnline: boolean;
    showImportModal: boolean;
    setShowImportModal: (v: boolean) => void;
    // student list
    searchTerm: string;
    setSearchTerm: (v: string) => void;
    filterOptions: { value: StudentFilter; label: string }[];
    studentFilter: StudentFilter;
    setStudentFilter: (v: StudentFilter) => void;
    isLoadingStudents: boolean;
    students: StudentRow[];
    isAllSelected: boolean;
    handleSelectAllStudents: (checked: boolean) => void;
    selectedStudentIds: Set<string>;
    handleStudentSelect: (id: string) => void;
    scores: Record<string, string>;
    handleScoreChange: (studentId: string, value: string) => void;
    handleBatchScoreChange?: (newScores: Record<string, string>) => void;
    onScoreFieldFocus: (studentId: string | null) => void;
    validationErrors: Record<string, string>;
    existingGrades: AcademicRecordRow[] | undefined;
    filteredExistingGrades: AcademicRecordRow[];
    // footer
    summaryText: string;
    gradedCount: number;
    setScores: React.Dispatch<React.SetStateAction<Record<string, string>>>;
    setSelectedStudentIds: React.Dispatch<React.SetStateAction<Set<string>>>;
    isExporting: boolean;
    exportProgress: string;
    handleSubmit: (overrideBypassGuard?: boolean) => void;
    isSubmitDisabled: boolean;
    submitButtonTooltip: string;
    isSubmitting: boolean;
    isDeleting: boolean;
    studentsData: StudentRow[] | undefined;
    existingViolations: ViolationRow[] | undefined;
    isLoadingViolations: boolean;
    // chart modal
    showChartModal: boolean;
    setShowChartModal: (v: boolean) => void;
    // delete modal
    confirmDeleteModal: { isOpen: boolean; count: number };
    setConfirmDeleteModal: (v: { isOpen: boolean; count: number }) => void;
    confirmDeleteText: string;
    setConfirmDeleteText: (v: string) => void;
    handleDeleteConfirmClick: () => void;
    // import modal
    handleImport: (data: Record<string, unknown>[]) => void;
    handleImportConfirm: (mappedScores: Record<string, string>) => void;
    pendingImportData: any[] | null;
    setPendingImportData: (v: any[] | null) => void;
    bypassDuplicateGuard: boolean;
    setBypassDuplicateGuard: (v: boolean) => void;
    onDeleteSelected?: () => void;
    // duplicate preview (violation / quiz / attitude)
    duplicateList: { student_id: string; student_name: string; recorded_by_name: string | null; description: string; date: string; points: number }[];
    showDuplicateDialog: boolean;
    setShowDuplicateDialog: (v: boolean) => void;
    onHandleSubmit: () => void;
    isCheckingDuplicates?: boolean;
    isScoresDirty?: boolean | React.MutableRefObject<boolean>;
    setIsScoresDirty?: (v: boolean) => void;
    saveSubjectGradeDraft?: (draft: any) => void;
    /** Draft put back into the grade form; offers keep or discard. */
    restoredDraft?: { savedAt: string | null; count: number } | null;
    discardRestoredDraft?: () => void;
    configResetKey?: number;
    /** Scores changed elsewhere since this form loaded them. */
    gradeConflicts?: { student_id: string; serverScore: number | null; localScore: number }[] | null;
    dismissGradeConflicts?: () => void;
    overwriteGradeConflicts?: () => void;
    acceptServerGrades?: () => void;
    /** Offline save of this assessment: waiting to be sent, or stopped for review. */
    offlineSaveState?: 'queued' | 'review' | null;
    offlineSaveMessage?: string | null;
    /** The form still shows exactly the scores that are queued. */
    isQueuedSaveCurrent?: boolean;
}

const formatDraftTime = (iso: string | null) => {
    if (!iso) return null;
    const date = new Date(iso);
    if (Number.isNaN(date.getTime())) return null;
    const sameDay = date.toDateString() === new Date().toDateString();
    return date.toLocaleString('id-ID', sameDay
        ? { hour: '2-digit', minute: '2-digit' }
        : { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
};

export const MassInputPageView: React.FC<MassInputPageViewProps> = (props) => {
    const { semesters, activeSemester } = useSemester();
    const [showAdjustmentModal, setShowAdjustmentModal] = useState(false);
    const {
        step, mode, handleModeSelect, handleBack, currentCard,
        pendingClearAction, confirmPendingAction, dismissPendingAction, requestClear,
        undoSnapshot, handleUndoClear,
        isConfigOpen, setIsConfigOpen, selectedClass, setSelectedClass, classes, isLoadingClasses,
        quizInfo, setQuizInfo, subjectGradeInfo, setSubjectGradeInfo, kkm, setKkm,
        attitudeDate, setAttitudeDate,
        attitudeCategory, setAttitudeCategory,
        attitudeName, setAttitudeName,
        attitudePoints, setAttitudePoints,
        attitudeNotes, setAttitudeNotes,
        existingAttitudeRecords,
        existingQuizPoints,
        isCustomSubject, setIsCustomSubject, uniqueSubjects,
        selectedViolationCode, setSelectedViolationCode, violationDate, setViolationDate,
        violationNotes, setViolationNotes, noteMethod, setNoteMethod, templateNote, setTemplateNote,
        assessmentNames, pasteData, setPasteData, isParsing, handleAiParse, isOnline,
        showImportModal, setShowImportModal,
        searchTerm, setSearchTerm, filterOptions, studentFilter, setStudentFilter,
        isLoadingStudents, students, isAllSelected, handleSelectAllStudents,
        selectedStudentIds, handleStudentSelect, scores, handleScoreChange, handleBatchScoreChange, onScoreFieldFocus, validationErrors,
        existingGrades,
        summaryText, gradedCount, setScores,
        isExporting, exportProgress, handleSubmit, isSubmitDisabled, submitButtonTooltip,
        isSubmitting, isDeleting, studentsData, existingViolations, isLoadingViolations,
        showChartModal, setShowChartModal,
        confirmDeleteModal, setConfirmDeleteModal, confirmDeleteText, setConfirmDeleteText,
        handleDeleteConfirmClick, handleImport, handleImportConfirm, pendingImportData, setPendingImportData,
        bypassDuplicateGuard, setBypassDuplicateGuard,
        onDeleteSelected,
        duplicateList, showDuplicateDialog,
        setShowDuplicateDialog, onHandleSubmit, isCheckingDuplicates,
        isScoresDirty, setIsScoresDirty, saveSubjectGradeDraft,
        restoredDraft, discardRestoredDraft, configResetKey,
        gradeConflicts, dismissGradeConflicts, overwriteGradeConflicts, acceptServerGrades,
        offlineSaveState, offlineSaveMessage, isQueuedSaveCurrent,
    } = props;
    const studentNameById = useMemo(
        () => new Map((studentsData || []).map(s => [s.id, s.name])),
        [studentsData],
    );

    const frequentViolations = useMemo(
        () => (mode === 'violation' ? getFrequentViolations(existingViolations) : []),
        [mode, existingViolations],
    );
    const selectedViolationDescription = violationList.find(v => v.code === selectedViolationCode)?.description;
    // Same date → semester rule as the save path in useMassInputMutations.
    const violationSemesterId = (findSemesterForDate(semesters, violationDate) ?? activeSemester)?.id ?? null;
    const violationStatusMap = useMemo(
        () => mode === 'violation'
            ? buildViolationStatusMap(existingViolations, {
                description: selectedViolationDescription,
                date: violationDate,
                semesterId: violationSemesterId,
            })
            : undefined,
        [mode, existingViolations, selectedViolationDescription, violationDate, violationSemesterId],
    );

    const isDirty = typeof isScoresDirty === 'object' && isScoresDirty !== null && 'current' in isScoresDirty
        ? Boolean((isScoresDirty as React.MutableRefObject<boolean>).current)
        : Boolean(isScoresDirty ?? true);

    const activeModeConfig = useMemo(
        () => actionCards.find(c => c.mode === mode),
        [mode],
    );

    if (step === 1) {
        return <Step1_ModeSelection handleModeSelect={handleModeSelect} />;
    }

    const ActiveModeIcon = activeModeConfig?.icon;
    const headerIconAccent = activeModeConfig?.accent === 'rose'
        ? 'bg-rose-500 text-white shadow-rose-500/25'
        : activeModeConfig?.accent === 'amber'
        ? 'bg-amber-500 text-white shadow-amber-500/25'
        : activeModeConfig?.accent === 'brand'
        ? 'bg-brand-600 text-white shadow-brand-600/25'
        : 'bg-emerald-500 text-white shadow-emerald-500/25';

    return (
        <div className="w-full min-h-screen p-3 sm:p-5 md:p-6 pb-24 flex flex-col bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white overflow-y-auto">
            <div className="w-full max-w-7xl mx-auto flex flex-col flex-grow">
                <header className="mb-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 p-3.5 sm:p-4 shadow-sm flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                    <div className="flex items-center gap-3">
                        <Button
                            variant="outline"
                            size="icon"
                            onClick={handleBack}
                            aria-label="Kembali ke langkah sebelumnya"
                            className="h-10 w-10 rounded-xl bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 flex-shrink-0"
                        >
                            <ArrowLeftIcon className="w-4 h-4" />
                        </Button>
                        {ActiveModeIcon && (
                            <div className={`hidden sm:flex w-10 h-10 rounded-xl items-center justify-center flex-shrink-0 shadow-sm ${headerIconAccent}`}>
                                <ActiveModeIcon className="w-5 h-5" />
                            </div>
                        )}
                        <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                                <h1 className="text-lg sm:text-xl font-extrabold tracking-tight text-slate-900 dark:text-white leading-tight">
                                    {currentCard?.title}
                                </h1>
                                {activeModeConfig?.badge && (
                                    <span className="inline-flex items-center px-2 py-0.5 rounded-lg text-[10px] font-bold bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-200/80 dark:border-emerald-500/20">
                                        {activeModeConfig.badge}
                                    </span>
                                )}
                            </div>
                            <p className="text-xs text-slate-500 dark:text-slate-400 truncate max-w-2xl">
                                {currentCard?.description}
                            </p>
                        </div>
                    </div>

                    {mode !== 'violation_export' && (
                        <div className="flex items-center gap-2 sm:flex-shrink-0">
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-bold border border-slate-200/80 dark:border-slate-700">
                                <School className="w-3.5 h-3.5 text-brand-600 dark:text-brand-400" />
                                <span>{classes?.find(c => c.id === selectedClass)?.name || 'Pilih Kelas'}</span>
                            </span>
                        </div>
                    )}
                </header>

                {/* Horizontal Breadcrumbs Status Bar when Configuration is Collapsed */}
                {!isConfigOpen && mode !== 'violation_export' && (
                    <div className="mb-4 flex flex-wrap items-center justify-between gap-3 p-3 rounded-2xl border border-slate-200/80 bg-white dark:border-slate-800 dark:bg-slate-900 animate-fade-in-down shadow-sm">
                        <div className="flex flex-wrap items-center gap-2 text-xs">
                            <span className="inline-flex items-center gap-1.5 rounded-lg bg-brand-50 dark:bg-brand-500/10 px-2.5 py-1 font-bold text-brand-700 dark:text-brand-300 border border-brand-200/70 dark:border-brand-500/20">
                                <School className="w-3.5 h-3.5 text-brand-600 dark:text-brand-400 shrink-0" />
                                <span>Kelas: {classes?.find(c => c.id === selectedClass)?.name || '-'}</span>
                            </span>
                            {mode === 'subject_grade' && subjectGradeInfo.subject && (
                                <span className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-500/10 px-2.5 py-1 font-bold text-emerald-700 dark:text-emerald-300 border border-emerald-200/70 dark:border-emerald-500/20 animate-scale-in">
                                    <BookOpen className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                                    <span>Mapel: {subjectGradeInfo.subject} ({subjectGradeInfo.assessment_name || 'Penilaian'})</span>
                                </span>
                            )}
                            {mode === 'quiz' && quizInfo.name && (
                                <span className="inline-flex items-center gap-1.5 rounded-lg bg-amber-50 dark:bg-amber-500/10 px-2.5 py-1 font-bold text-amber-700 dark:text-amber-300 border border-amber-200/70 dark:border-amber-500/20 animate-scale-in">
                                    <Star className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                                    <span>Keaktifan: +1 Poin • {quizInfo.name} ({quizInfo.subject || 'Umum'})</span>
                                </span>
                            )}
                            {mode === 'violation' && selectedViolationCode && (
                                <span className="inline-flex items-center gap-1.5 rounded-lg bg-rose-50 dark:bg-rose-500/10 px-2.5 py-1 font-bold text-rose-700 dark:text-rose-300 border border-rose-200/70 dark:border-rose-500/20 animate-scale-in">
                                    <AlertTriangle className="w-3.5 h-3.5 text-rose-500 shrink-0" />
                                    <span>Pelanggaran: {violationList.find(v => v.code === selectedViolationCode)?.description || selectedViolationCode}</span>
                                </span>
                            )}
                            {mode === 'attitude' && attitudeCategory && (
                                <span className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-500/10 px-2.5 py-1 font-bold text-emerald-700 dark:text-emerald-300 border border-emerald-200/70 dark:border-emerald-500/20 animate-scale-in">
                                    <Sparkles className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                                    <span>Sikap: {attitudeCategory} (+1 Poin)</span>
                                </span>
                            )}
                        </div>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setIsConfigOpen(true)}
                            className="rounded-xl border-brand-200 dark:border-slate-700 text-brand-600 dark:text-brand-300 bg-white hover:bg-brand-50/50 dark:bg-slate-800 hover:dark:bg-slate-700 active:scale-95 transition-all text-xs font-bold inline-flex items-center gap-1.5 h-8 px-3"
                        >
                            <SlidersHorizontal className="w-3.5 h-3.5" />
                            <span>Ubah Konfigurasi</span>
                        </Button>
                    </div>
                )}

                {mode === 'subject_grade' && (offlineSaveState || (restoredDraft && isDirty)) && (
                    <div role="status" className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:border-amber-800 dark:bg-amber-900/20 dark:text-amber-100">
                        <p>
                            {offlineSaveState === 'review' ? (
                                <>
                                    <span className="font-bold">Nilai belum terkirim.</span>{' '}
                                    {offlineSaveMessage
                                        ? `Penyimpanan offline ditolak: ${offlineSaveMessage} Periksa nilainya, lalu tekan Simpan lagi.`
                                        : 'Sebagian nilai sudah diubah dari perangkat lain sejak Anda menyimpan offline. Tekan Simpan untuk melihat perbedaannya.'}
                                </>
                            ) : offlineSaveState === 'queued' ? (
                                <>
                                    <span className="font-bold">Menunggu koneksi.</span>{' '}
                                    Nilai untuk {subjectGradeInfo.assessment_name || 'penilaian ini'} tersimpan di perangkat ini dan dikirim otomatis begitu online.
                                    {!isQueuedSaveCurrent && ' Perubahan setelah itu belum ikut; tekan Simpan lagi untuk menyertakannya.'}
                                </>
                            ) : (
                                <>
                                    <span className="font-bold">Draf belum disimpan.</span>{' '}
                                    {restoredDraft?.count} nilai untuk {subjectGradeInfo.assessment_name || 'penilaian ini'} dimuat dari perangkat ini
                                    {formatDraftTime(restoredDraft?.savedAt ?? null) ? ` (terakhir diubah ${formatDraftTime(restoredDraft?.savedAt ?? null)})` : ''}.
                                    {' '}Tekan Simpan agar nilainya tercatat.
                                </>
                            )}
                        </p>
                        {discardRestoredDraft && (
                            <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={discardRestoredDraft}
                                className="rounded-xl border-amber-300 bg-white text-amber-800 hover:bg-amber-100 dark:border-amber-700 dark:bg-amber-900/40 dark:text-amber-100"
                            >
                                Buang draf
                            </Button>
                        )}
                    </div>
                )}

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 flex-grow">
                    {mode === 'violation_export' ? (
                        <ViolationExportPanel
                            classes={classes}
                            selectedClass={selectedClass}
                            setSelectedClass={setSelectedClass}
                            isLoadingClasses={isLoadingClasses}
                            existingViolations={existingViolations}
                            studentsData={studentsData}
                            isLoadingViolations={isLoadingViolations}
                        />
                    ) : (
                        <>
                            <div className={`${isConfigOpen ? 'lg:col-span-1 block' : 'hidden'} transition-all duration-300`}>
                                <Step2_Configuration
                                    mode={mode}
                                    isConfigOpen={isConfigOpen}
                                    setIsConfigOpen={setIsConfigOpen}
                                    selectedClass={selectedClass}
                                    setSelectedClass={setSelectedClass}
                                    classes={classes}
                                    isLoadingClasses={isLoadingClasses}
                                    quizInfo={quizInfo}
                                    setQuizInfo={setQuizInfo}
                                    subjectGradeInfo={subjectGradeInfo}
                                    setSubjectGradeInfo={setSubjectGradeInfo}
                                    isCustomSubject={isCustomSubject}
                                    setIsCustomSubject={setIsCustomSubject}
                                    uniqueSubjects={uniqueSubjects}
                                    selectedViolationCode={selectedViolationCode}
                                    setSelectedViolationCode={setSelectedViolationCode}
                                    violationDate={violationDate}
                                    setViolationDate={setViolationDate}
                                    violationNotes={violationNotes}
                                    setViolationNotes={setViolationNotes}
                                    noteMethod={noteMethod}
                                    setNoteMethod={setNoteMethod}
                                    templateNote={templateNote}
                                    setTemplateNote={setTemplateNote}
                                    assessmentNames={assessmentNames}
                                    pasteData={pasteData}
                                    setPasteData={setPasteData}
                                    isParsing={isParsing}
                                    handleAiParse={handleAiParse}
                                    isOnline={isOnline}
                                    bypassDuplicateGuard={bypassDuplicateGuard}
                                    setBypassDuplicateGuard={setBypassDuplicateGuard}
                                    kkm={kkm}
                                    setKkm={setKkm}
                                    attitudeDate={attitudeDate}
                                    setAttitudeDate={setAttitudeDate}
                                    attitudeCategory={attitudeCategory}
                                    setAttitudeCategory={setAttitudeCategory}
                                    attitudeName={attitudeName}
                                    setAttitudeName={setAttitudeName}
                                    attitudePoints={attitudePoints}
                                    setAttitudePoints={setAttitudePoints}
                                    attitudeNotes={attitudeNotes}
                                    setAttitudeNotes={setAttitudeNotes}
                                    frequentViolations={frequentViolations}
                                    onOpenImport={mode === 'subject_grade' ? () => setShowImportModal(true) : undefined}
                                    configResetKey={configResetKey}
                                />
                            </div>
                            <div className={`${isConfigOpen ? 'lg:col-span-2' : 'lg:col-span-3'} transition-all duration-300`}>
                                <Step2_StudentList
                                    mode={mode}
                                    searchTerm={searchTerm}
                                    setSearchTerm={setSearchTerm}
                                    filterOptions={filterOptions}
                                    studentFilter={studentFilter}
                                    setStudentFilter={setStudentFilter}
                                    isLoadingStudents={isLoadingStudents}
                                    students={students}
                                    isAllSelected={isAllSelected}
                                    handleSelectAllStudents={handleSelectAllStudents}
                                    selectedStudentIds={selectedStudentIds}
                                    handleStudentSelect={handleStudentSelect}
                                    scores={scores}
                                    handleScoreChange={handleScoreChange}
                                    handleBatchScoreChange={handleBatchScoreChange}
                                    onScoreFieldFocus={onScoreFieldFocus}
                                    validationErrors={validationErrors}
                                    existingGrades={existingGrades}
                                    existingAttitudeRecords={existingAttitudeRecords}
                                    attitudePoints={attitudePoints}
                                    attitudeCategory={attitudeCategory}
                                    attitudeDate={attitudeDate}
                                    existingQuizPoints={existingQuizPoints}
                                    quizInfo={quizInfo}
                                    classes={classes}
                                    selectedClass={selectedClass}
                                    kkm={kkm}
                                    onClearRequest={requestClear}
                                    violationStatusMap={violationStatusMap}
                                />
                            </div>
                        </>
                    )}
                </div>

                {/* Confirm Delete Modal */}
                <Modal
                    isOpen={confirmDeleteModal.isOpen}
                    onClose={() => { setConfirmDeleteModal({ isOpen: false, count: 0 }); setConfirmDeleteText(''); }}
                    title="Konfirmasi Hapus Nilai"
                >
                    <div className="space-y-4">
                        <p className="text-sm text-slate-600 dark:text-slate-400">
                            Anda akan menghapus <strong className="text-slate-900 dark:text-white">{confirmDeleteModal.count} data nilai</strong> untuk penilaian <strong className="text-slate-900 dark:text-white">"{subjectGradeInfo.assessment_name}"</strong>. Aksi ini tidak dapat dibatalkan.
                        </p>
                        <div className="pt-3 border-t border-slate-200 dark:border-slate-700">
                            <p className="text-xs text-slate-500 dark:text-slate-400 mb-3">Ketik <strong className="text-rose-500">HAPUS</strong> untuk mengonfirmasi:</p>
                            <input
                                type="text"
                                value={confirmDeleteText}
                                onChange={e => setConfirmDeleteText(e.target.value)}
                                placeholder="Ketik HAPUS"
                                className="w-full px-3 py-2 text-sm border rounded-lg mb-3 bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-600 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
                            />
                        </div>
                        <div className="flex justify-end gap-2 pt-2">
                            <Button type="button" variant="ghost" onClick={() => { setConfirmDeleteModal({ isOpen: false, count: 0 }); setConfirmDeleteText(''); }}>Batal</Button>
                            <Button type="button" variant="destructive" onClick={handleDeleteConfirmClick} disabled={isDeleting}>
                                {isDeleting ? 'Menghapus...' : 'Ya, Hapus'}
                            </Button>
                        </div>
                    </div>
                </Modal>

                {/* Import Excel Modal / Preview Matcher */}
                {mode === 'subject_grade' && (
                    <>
                        <Modal isOpen={showImportModal} onClose={() => setShowImportModal(false)} title="Import Nilai dari Excel">
                            <ExcelImporter
                                columns={[
                                    { key: 'name', label: 'Nama Siswa', required: true, type: 'string' },
                                    { key: 'score', label: 'Nilai', required: true, type: 'number' },
                                ]}
                                onImport={handleImport}
                                onCancel={() => setShowImportModal(false)}
                                templateData={studentsData?.map(s => ({ id: s.id, name: s.name }))}
                            />
                        </Modal>

                        {pendingImportData && pendingImportData.length > 0 && (
                            <ImportPreviewModal
                                isOpen={Array.isArray(pendingImportData) && pendingImportData.length > 0}
                                onClose={() => setPendingImportData(null)}
                                parsedData={pendingImportData}
                                students={studentsData?.map(s => ({ id: s.id, name: s.name })) || []}
                                onConfirm={handleImportConfirm}
                            />
                        )}
                    </>
                )}

                {/* Footer */}
                {mode !== 'violation_export' && (
                    <Step2_Footer
                        summaryText={summaryText}
                        mode={mode}
                        selectedStudentIds={selectedStudentIds}
                        gradedCount={gradedCount}
                        onClearRequest={requestClear}
                        isExporting={isExporting}
                        exportProgress={exportProgress}
                        scores={scores}
                        students={studentsData}
                        subjectGradeInfo={subjectGradeInfo}
                        className={classes?.find(c => c.id === selectedClass)?.name}
                        kkm={kkm}
                        existingViolations={existingViolations}
                        onShowChart={() => setShowChartModal(true)}
                        onShowAdjustment={() => setShowAdjustmentModal(true)}
                        onDeleteSelected={onDeleteSelected}
                    />
                )}

                {/* Chart Modal */}
                {mode === 'subject_grade' && (
                    <Modal isOpen={showChartModal} onClose={() => setShowChartModal(false)} title="Distribusi Nilai">
                        <div className="p-4">
                            <GradeDistributionChart scores={scores} kkm={kkm} />
                        </div>
                    </Modal>
                )}

                {/* Integrated Grade Adjustment & Print Preview Modal */}
                {mode === 'subject_grade' && (
                    <UnifiedGradeAdjustmentModal
                        isOpen={showAdjustmentModal}
                        onClose={() => setShowAdjustmentModal(false)}
                        students={studentsData || []}
                        scores={scores}
                        onApply={(finalScores) => {
                            setScores(finalScores);
                            setIsScoresDirty?.(true);
                            saveSubjectGradeDraft?.({
                                selectedClass,
                                subjectGradeInfo,
                                scores: finalScores,
                                selectedStudentIds: Array.from(selectedStudentIds),
                            });
                        }}
                        kkm={kkm}
                        subject={subjectGradeInfo.subject}
                        assessmentName={subjectGradeInfo.assessment_name}
                        className={classes?.find(c => c.id === selectedClass)?.name || ''}
                        semesterLabel={subjectGradeInfo.semester ? semesters.find(s => s.id === subjectGradeInfo.semester)?.name : undefined}
                    />
                )}

                {/* Duplicate preview dialog (violation / quiz / attitude) */}
                <Modal
                    isOpen={showDuplicateDialog}
                    onClose={() => setShowDuplicateDialog(false)}
                    title={mode === 'violation' ? 'Pelanggaran Sudah Tercatat Hari Ini' : 'Data Sudah Tercatat Sebelumnya'}
                    maxWidth="max-w-lg"
                >
                    <div className="space-y-4 pt-2">
                        <div className="p-4 rounded-xl bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800">
                            <p className="text-sm font-medium text-amber-800 dark:text-amber-200 mb-3">
                                {mode === 'violation'
                                    ? `Pelanggaran ini sudah pernah dicatat pada hari ini untuk ${duplicateList.length} siswa berikut:`
                                    : `Poin ${mode === 'attitude' ? 'sikap' : 'keaktifan'} ini sudah tercatat beberapa menit terakhir untuk ${duplicateList.length} siswa berikut:`}
                            </p>
                            <div className="max-h-48 overflow-y-auto space-y-2">
                                {duplicateList.map((dup) => (
                                    <div key={dup.student_id} className="flex items-center justify-between p-2.5 rounded-lg bg-white/70 dark:bg-black/20 text-xs border border-amber-200/50 dark:border-amber-800/40">
                                        <span className="font-semibold text-slate-800 dark:text-slate-200">{dup.student_name}</span>
                                        <span className="text-amber-700 dark:text-amber-300 font-medium">
                                            dicatat oleh: <strong>{dup.recorded_by_name || 'Guru lain'}</strong>
                                        </span>
                                    </div>
                                ))}
                            </div>
                        </div>
                        <p className="text-sm text-slate-600 dark:text-slate-400">
                            {mode === 'violation'
                                ? 'Apakah Anda ingin tetap mencatat pelanggaran ini? Pilih simpan semua siswa (termasuk yang sudah dicatat) atau hanya siswa yang belum tercatat hari ini.'
                                : 'Apakah Anda ingin tetap memberi poin ini? Pilih simpan semua siswa (termasuk yang baru saja tercatat) atau hanya siswa yang belum tercatat.'}
                        </p>
                        <div className="flex flex-wrap justify-end gap-2 pt-2">
                            <Button type="button" variant="ghost" onClick={() => setShowDuplicateDialog(false)}>
                                Batal
                            </Button>
                            {selectedStudentIds.size > duplicateList.length && (
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={() => {
                                        setShowDuplicateDialog(false);
                                        handleSubmit(false);
                                    }}
                                >
                                    Lewati yang Duplikat ({duplicateList.length})
                                </Button>
                            )}
                            <Button
                                type="button"
                                onClick={() => {
                                    setShowDuplicateDialog(false);
                                    setBypassDuplicateGuard(true);
                                    handleSubmit(true);
                                }}
                                className="bg-red-600 hover:bg-red-700 text-white"
                            >
                                Tetap Simpan Semua
                            </Button>
                        </div>
                    </div>
                </Modal>

                {/* Guard for every destructive clear/back action */}
                <ConfirmationDialog
                    isOpen={pendingClearAction !== null}
                    onClose={dismissPendingAction}
                    onConfirm={confirmPendingAction}
                    variant="warning"
                    title={
                        pendingClearAction?.kind === 'back'
                            ? 'Ada Nilai Belum Disimpan'
                            : pendingClearAction?.kind === 'switch_config'
                            ? 'Pindah ke Penilaian Lain?'
                            : 'Bersihkan Input Belum Disimpan?'
                    }
                    confirmText={
                        pendingClearAction?.kind === 'back'
                            ? 'Ya, Tinggalkan'
                            : pendingClearAction?.kind === 'switch_config'
                            ? 'Pindah'
                            : 'Ya, Bersihkan'
                    }
                    cancelText={pendingClearAction?.kind === 'switch_config' ? 'Tetap di Sini' : 'Batalkan'}
                    message={
                        pendingClearAction?.kind === 'back'
                            ? `${pendingClearAction.count} nilai yang sudah diketik belum tersimpan. Meninggalkan layar ini akan menghapusnya.`
                            : pendingClearAction?.kind === 'switch_config'
                            ? `${pendingClearAction.count} nilai untuk ${subjectGradeInfo.assessment_name || 'penilaian ini'} (${classes?.find(c => c.id === selectedClass)?.name || 'kelas ini'}) belum disimpan. Nilai itu disimpan sebagai draf di perangkat ini dan muncul lagi saat Anda kembali ke penilaian tersebut.`
                            : pendingClearAction?.kind === 'scores'
                            ? `${pendingClearAction.count} nilai yang sudah diketik akan dihapus dari formulir. Nilai yang sudah tersimpan di database tidak terpengaruh, dan Anda masih bisa mengurungkannya beberapa detik setelah ini.`
                            : `${pendingClearAction?.count ?? 0} siswa akan dihapus dari pilihan. Anda masih bisa mengurungkannya beberapa detik setelah ini.`
                    }
                />

                {/* Scores changed on another device since this form loaded them */}
                <Modal
                    isOpen={Boolean(gradeConflicts && gradeConflicts.length > 0)}
                    onClose={() => dismissGradeConflicts?.()}
                    title="Nilai Sudah Diubah di Perangkat Lain"
                    maxWidth="max-w-lg"
                >
                    <div className="space-y-4 pt-2">
                        <p className="text-sm text-slate-600 dark:text-slate-300">
                            Belum ada yang disimpan. Sejak formulir ini dibuka, nilai berikut diubah dari perangkat atau akun lain. Pilih nilai yang dipakai.
                        </p>
                        <div className="max-h-56 overflow-y-auto rounded-xl border border-slate-200 dark:border-slate-700">
                            <table className="w-full text-sm">
                                <thead className="bg-slate-50 text-xs text-slate-500 dark:bg-slate-800 dark:text-slate-400">
                                    <tr>
                                        <th className="px-3 py-2 text-left font-semibold">Siswa</th>
                                        <th className="px-3 py-2 text-right font-semibold">Tersimpan</th>
                                        <th className="px-3 py-2 text-right font-semibold">Isian Anda</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {(gradeConflicts || []).map(conflict => (
                                        <tr key={conflict.student_id} className="border-t border-slate-100 dark:border-slate-800">
                                            <td className="px-3 py-2 text-slate-800 dark:text-slate-200">{studentNameById.get(conflict.student_id) || 'Siswa'}</td>
                                            <td className="px-3 py-2 text-right tabular-nums text-slate-700 dark:text-slate-300">{conflict.serverScore ?? 'dihapus'}</td>
                                            <td className="px-3 py-2 text-right font-semibold tabular-nums text-slate-900 dark:text-white">{conflict.localScore}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                        <div className="flex flex-wrap justify-end gap-2 pt-2">
                            <Button type="button" variant="ghost" onClick={() => dismissGradeConflicts?.()}>
                                Batal
                            </Button>
                            <Button type="button" variant="outline" onClick={() => acceptServerGrades?.()}>
                                Pakai nilai yang tersimpan
                            </Button>
                            <Button type="button" onClick={() => overwriteGradeConflicts?.()} className="bg-amber-600 hover:bg-amber-700 text-white">
                                Simpan isian saya
                            </Button>
                        </div>
                    </div>
                </Modal>

                {/* Undo bar: restores the batch that was just cleared */}
                {undoSnapshot && typeof document !== 'undefined' && createPortal(
                    <div
                        role="status" aria-live="polite"
                        className="fixed bottom-32 lg:bottom-20 inset-x-0 z-50 pointer-events-none flex justify-center lg:pl-72 px-4 animate-in fade-in slide-in-from-bottom-5"
                    >
                        <div className="pointer-events-auto shadow-2xl bg-amber-50 dark:bg-amber-950/90 text-amber-900 dark:text-amber-100 px-4 py-2.5 rounded-2xl flex items-center gap-3 border border-amber-300 dark:border-amber-800 backdrop-blur-md max-w-[95vw]">
                            <span className="text-xs sm:text-sm font-semibold whitespace-nowrap">
                                {undoSnapshot.kind === 'scores'
                                    ? `${undoSnapshot.count} nilai dibersihkan`
                                    : `${undoSnapshot.count} pilihan dibersihkan`}
                            </span>
                            <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={handleUndoClear}
                                className="rounded-xl border-amber-400 dark:border-amber-700 bg-white dark:bg-amber-900/40 text-amber-800 dark:text-amber-100 hover:bg-amber-100 dark:hover:bg-amber-900/60 text-xs font-bold h-8 inline-flex items-center gap-1.5"
                            >
                                <RotateCcw className="w-3.5 h-3.5" />
                                <span>Urungkan</span>
                            </Button>
                        </div>
                    </div>,
                    document.body
                )}

                {/* Floating Save Bar for Step 2: rendered via portal to escape parent transform/overflow stacking contexts */}
                {step === 2 && mode !== 'violation_export' && (mode === 'subject_grade' ? gradedCount > 0 : selectedStudentIds.size > 0) && typeof document !== 'undefined' && createPortal(
                    <div
                        role="status" aria-live="polite"
                        className="fixed bottom-[calc(5rem+env(safe-area-inset-bottom,0px))] lg:bottom-6 inset-x-0 z-50 pointer-events-none flex justify-center lg:pl-72 px-4 transition-all duration-300 animate-in fade-in slide-in-from-bottom-5"
                    >
                        <div className="pointer-events-auto shadow-2xl bg-slate-900/95 dark:bg-slate-800/95 text-white px-4 sm:px-6 py-2.5 sm:py-3 rounded-2xl flex items-center gap-3 sm:gap-4 backdrop-blur-md border border-slate-700/60 dark:border-slate-600 shadow-black/40 max-w-[95vw]">
                            <div className="flex items-center gap-2">
                                <span className="relative flex h-2.5 w-2.5">
                                    {(mode !== 'subject_grade' || isDirty) ? (
                                        <>
                                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                                            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-amber-500"></span>
                                        </>
                                    ) : (
                                        <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
                                    )}
                                </span>
                                <span className="text-xs sm:text-sm font-semibold tracking-tight whitespace-nowrap">
                                    {mode === 'subject_grade'
                                        ? `${gradedCount} siswa dinilai${!isDirty ? ' (Tersimpan)' : ''}`
                                        : mode === 'attitude'
                                        ? `${selectedStudentIds.size} siswa terpilih (+${attitudePoints || 1} poin)`
                                        : `${selectedStudentIds.size} siswa terpilih`}
                                </span>
                                <button
                                    type="button"
                                    onClick={requestClear}
                                    className="min-w-[44px] min-h-[44px] p-2 inline-flex items-center justify-center text-slate-400 hover:text-rose-400 hover:bg-white/10 rounded-lg transition-colors ml-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
                                    title={mode === 'subject_grade' ? 'Bersihkan nilai yang diketik' : 'Batalkan pilihan'}
                                    aria-label={mode === 'subject_grade' ? 'Bersihkan nilai yang diketik' : 'Batalkan pilihan'}
                                >
                                    <XIcon size={16} />
                                </button>
                            </div>

                            {isSubmitDisabled && submitButtonTooltip && (
                                <>
                                    <div className="hidden sm:block h-4 w-px bg-white/20" />
                                    <span className="hidden sm:inline-flex text-xs text-amber-300 font-medium items-center gap-1 max-w-[220px] truncate" title={submitButtonTooltip}>
                                        <AlertCircle size={13} className="shrink-0" />
                                        <span className="truncate">{submitButtonTooltip}</span>
                                    </span>
                                </>
                            )}

                            <div className="h-4 w-px bg-white/20" />

                            <Button
                                onClick={onHandleSubmit}
                                disabled={isSubmitDisabled || isSubmitting || isCheckingDuplicates}
                                title={submitButtonTooltip}
                                className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs sm:text-sm px-3.5 sm:px-4 min-h-[44px] sm:min-h-[40px] h-11 sm:h-10 rounded-xl shadow-md transition-all active:scale-95 flex items-center gap-1.5 whitespace-nowrap disabled:opacity-50 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2"
                            >
                                {isSubmitting || isCheckingDuplicates ? (
                                    <>
                                        <Loader2 size={14} className="animate-spin" />
                                        {isCheckingDuplicates ? 'Memeriksa...' : 'Menyimpan...'}
                                    </>
                                ) : (
                                    <>
                                        <CheckCircle2 size={14} />
                                        {mode === 'violation'
                                            ? `Simpan Pelanggaran (${selectedStudentIds.size})`
                                            : mode === 'quiz'
                                            ? `Simpan Kuis (${selectedStudentIds.size})`
                                            : mode === 'attitude'
                                            ? `Simpan Poin Sikap (${selectedStudentIds.size})`
                                            : mode === 'subject_grade'
                                            ? offlineSaveState === 'queued' && isQueuedSaveCurrent
                                                ? `Menunggu Koneksi (${gradedCount})`
                                                : !isOnline && isDirty
                                                ? `Simpan di Perangkat (${gradedCount})`
                                                : isDirty
                                                ? `Simpan Nilai (${gradedCount})`
                                                : `Tersimpan (${gradedCount})`
                                            : mode === 'bulk_report'
                                            ? `Cetak Rapor Massal (${selectedStudentIds.size})`
                                            : mode === 'academic_print'
                                            ? `Cetak Rekap Nilai (${selectedStudentIds.size})`
                                            : `Simpan Data (${selectedStudentIds.size})`}
                                    </>
                                )}
                            </Button>
                        </div>
                    </div>,
                    document.body
                )}
            </div>
        </div>
    );
};
