import React, { useMemo, useState } from 'react';
import { useSemester } from '../../../contexts/SemesterContext';
import {
    Step1_ModeSelection,
    Step2_Configuration,
    Step2_StudentList,
    Step2_Footer,
    ViolationExportPanel,
    MassInputHeader,
    MassInputBreadcrumbBar,
    MassInputDraftBanner,
    MassInputModals,
    MassInputFloatingBars,
} from './components';
import {
    InputMode,
    Step,
    StudentFilter,
    StudentRow,
    AcademicRecordRow,
    ClassRow,
    ViolationRow,
    AttitudeRecordRow,
    QuizPointRow,
} from './types';
import { violationList } from '../../../services/violations.data';
import { getFrequentViolations, buildViolationStatusMap } from './violationInsights';
import { findSemesterForDate } from '../../../utils/semesterUtils';
import { actionCards } from './constants';

export interface MassInputPageViewProps {
    step: Step;
    mode: InputMode | null;
    handleModeSelect: (mode: InputMode) => void;
    handleBack: () => void;
    pendingClearAction: { kind: 'scores' | 'selection' | 'back' | 'switch_config'; count: number } | null;
    confirmPendingAction: () => void;
    dismissPendingAction: () => void;
    requestClear: () => void;
    undoSnapshot: { kind: 'scores' | 'selection'; count: number } | null;
    handleUndoClear: () => void;
    currentCard: { title: string; description: string } | undefined;
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
    showChartModal: boolean;
    setShowChartModal: (v: boolean) => void;
    confirmDeleteModal: { isOpen: boolean; count: number };
    setConfirmDeleteModal: (v: { isOpen: boolean; count: number }) => void;
    confirmDeleteText: string;
    setConfirmDeleteText: (v: string) => void;
    handleDeleteConfirmClick: () => void;
    handleImport: (data: Record<string, unknown>[]) => void;
    handleImportConfirm: (mappedScores: Record<string, string>) => void;
    pendingImportData: Record<string, unknown>[] | null;
    setPendingImportData: (v: Record<string, unknown>[] | null) => void;
    bypassDuplicateGuard: boolean;
    setBypassDuplicateGuard: (v: boolean) => void;
    onDeleteSelected?: () => void;
    duplicateList: { student_id: string; student_name: string; recorded_by_name: string | null; description: string; date: string; points: number }[];
    showDuplicateDialog: boolean;
    setShowDuplicateDialog: (v: boolean) => void;
    onHandleSubmit: () => void;
    isCheckingDuplicates?: boolean;
    isScoresDirty?: boolean | React.MutableRefObject<boolean>;
    setIsScoresDirty?: (v: boolean) => void;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    saveSubjectGradeDraft?: (draft: any) => void;
    restoredDraft?: { savedAt: string | null; count: number } | null;
    discardRestoredDraft?: () => void;
    configResetKey?: number;
    gradeConflicts?: { student_id: string; serverScore: number | null; localScore: number }[] | null;
    dismissGradeConflicts?: () => void;
    overwriteGradeConflicts?: () => void;
    acceptServerGrades?: () => void;
    offlineSaveState?: 'queued' | 'review' | null;
    offlineSaveMessage?: string | null;
    isQueuedSaveCurrent?: boolean;
}

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

    return (
        <div className="w-full min-h-screen p-3 sm:p-5 md:p-6 pb-24 flex flex-col bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white overflow-y-auto">
            <div className="w-full max-w-7xl mx-auto flex flex-col flex-grow">
                {/* Header */}
                <MassInputHeader
                    handleBack={handleBack}
                    currentCard={currentCard}
                    activeModeConfig={activeModeConfig}
                    mode={mode}
                    selectedClass={selectedClass}
                    classes={classes}
                />

                {/* Horizontal Breadcrumbs Status Bar when Configuration is Collapsed */}
                <MassInputBreadcrumbBar
                    mode={mode}
                    isConfigOpen={isConfigOpen}
                    onOpenConfig={() => setIsConfigOpen(true)}
                    selectedClass={selectedClass}
                    classes={classes}
                    subjectGradeInfo={subjectGradeInfo}
                    quizInfo={quizInfo}
                    selectedViolationCode={selectedViolationCode}
                    attitudeCategory={attitudeCategory}
                />

                {/* Draft / Offline State Notification Banner */}
                <MassInputDraftBanner
                    mode={mode}
                    offlineSaveState={offlineSaveState}
                    offlineSaveMessage={offlineSaveMessage}
                    isQueuedSaveCurrent={isQueuedSaveCurrent}
                    restoredDraft={restoredDraft}
                    isDirty={isDirty}
                    assessmentName={subjectGradeInfo.assessment_name}
                    onDiscardRestoredDraft={discardRestoredDraft}
                />

                {/* Main 2/3 column layout */}
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

                {/* All Modals (Delete, Import Excel, Chart, Adjustment, Duplicate, Clear Confirmation, Conflict Resolution) */}
                <MassInputModals
                    mode={mode}
                    confirmDeleteModal={confirmDeleteModal}
                    onCloseConfirmDelete={() => {
                        setConfirmDeleteModal({ isOpen: false, count: 0 });
                        setConfirmDeleteText('');
                    }}
                    assessmentName={subjectGradeInfo.assessment_name}
                    confirmDeleteText={confirmDeleteText}
                    onConfirmDeleteTextChange={setConfirmDeleteText}
                    onDeleteConfirmClick={handleDeleteConfirmClick}
                    isDeleting={isDeleting}
                    showImportModal={showImportModal}
                    onCloseImportModal={() => setShowImportModal(false)}
                    onImport={handleImport}
                    studentsData={studentsData}
                    pendingImportData={pendingImportData}
                    onCloseImportPreview={() => setPendingImportData(null)}
                    onImportConfirm={handleImportConfirm}
                    showChartModal={showChartModal}
                    onCloseChartModal={() => setShowChartModal(false)}
                    scores={scores}
                    kkm={kkm}
                    showAdjustmentModal={showAdjustmentModal}
                    onCloseAdjustmentModal={() => setShowAdjustmentModal(false)}
                    onApplyAdjustment={(finalScores) => {
                        setScores(finalScores);
                        setIsScoresDirty?.(true);
                        saveSubjectGradeDraft?.({
                            selectedClass,
                            subjectGradeInfo,
                            scores: finalScores,
                            selectedStudentIds: Array.from(selectedStudentIds),
                        });
                    }}
                    subjectGradeInfo={subjectGradeInfo}
                    className={classes?.find(c => c.id === selectedClass)?.name || ''}
                    semesters={semesters}
                    showDuplicateDialog={showDuplicateDialog}
                    onCloseDuplicateDialog={() => setShowDuplicateDialog(false)}
                    duplicateList={duplicateList}
                    selectedStudentCount={selectedStudentIds.size}
                    onSubmitDuplicate={(bypass) => {
                        setShowDuplicateDialog(false);
                        if (bypass) {
                            setBypassDuplicateGuard(true);
                        }
                        handleSubmit(bypass);
                    }}
                    pendingClearAction={pendingClearAction}
                    onDismissPendingAction={dismissPendingAction}
                    onConfirmPendingAction={confirmPendingAction}
                    gradeConflicts={gradeConflicts}
                    studentNameById={studentNameById}
                    onDismissGradeConflicts={dismissGradeConflicts}
                    onAcceptServerGrades={acceptServerGrades}
                    onOverwriteGradeConflicts={overwriteGradeConflicts}
                />

                {/* Floating Save & Undo Action Bars via Portals */}
                <MassInputFloatingBars
                    step={step}
                    mode={mode}
                    gradedCount={gradedCount}
                    selectedStudentCount={selectedStudentIds.size}
                    undoSnapshot={undoSnapshot}
                    onUndoClear={handleUndoClear}
                    onRequestClear={requestClear}
                    isDirty={isDirty}
                    attitudePoints={attitudePoints}
                    isSubmitDisabled={isSubmitDisabled}
                    submitButtonTooltip={submitButtonTooltip}
                    onSubmit={onHandleSubmit}
                    isSubmitting={isSubmitting}
                    isCheckingDuplicates={isCheckingDuplicates}
                    offlineSaveState={offlineSaveState}
                    isQueuedSaveCurrent={isQueuedSaveCurrent}
                    isOnline={isOnline}
                />
            </div>
        </div>
    );
};
