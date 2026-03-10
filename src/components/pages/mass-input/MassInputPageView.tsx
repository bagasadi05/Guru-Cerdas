import React from 'react';
import { Button } from '../../ui/Button';
import { Modal } from '../../ui/Modal';
import { ExcelImporter } from '../../ui/ExcelImporter';
import { GradeDistributionChart } from '../../ui/GradeDistributionChart';
import { ArrowLeftIcon } from '../../Icons';
import { Step1_ModeSelection } from './components/Step1_ModeSelection';
import { Step2_Configuration } from './components/Step2_Configuration';
import { Step2_StudentList } from './components/Step2_StudentList';
import { Step2_Footer } from './components/Step2_Footer';
import { ViolationExportPanel } from './components/ViolationExportPanel';
import { InputMode, Step, StudentFilter, StudentRow, AcademicRecordRow, ClassRow, ViolationRow } from './types';

export interface MassInputPageViewProps {
    step: Step;
    mode: InputMode | null;
    handleModeSelect: (mode: InputMode) => void;
    handleBack: () => void;
    currentCard: { title: string; description: string } | undefined;
    // config panel
    isConfigOpen: boolean;
    setIsConfigOpen: (v: boolean) => void;
    selectedClass: string;
    setSelectedClass: (v: string) => void;
    classes: ClassRow[] | undefined;
    isLoadingClasses: boolean;
    quizInfo: { name: string; subject: string; date: string };
    setQuizInfo: React.Dispatch<React.SetStateAction<{ name: string; subject: string; date: string }>>;
    subjectGradeInfo: { subject: string; assessment_name: string; notes: string; semester: string };
    setSubjectGradeInfo: React.Dispatch<React.SetStateAction<{ subject: string; assessment_name: string; notes: string; semester: string }>>;
    isCustomSubject: boolean;
    setIsCustomSubject: (v: boolean) => void;
    uniqueSubjects: string[] | undefined;
    selectedViolationCode: string;
    setSelectedViolationCode: (v: string) => void;
    violationDate: string;
    setViolationDate: (v: string) => void;
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
    existingGrades: AcademicRecordRow[] | undefined;
    filteredExistingGrades: AcademicRecordRow[];
    // footer
    summaryText: string;
    gradedCount: number;
    setScores: React.Dispatch<React.SetStateAction<Record<string, string>>>;
    setSelectedStudentIds: React.Dispatch<React.SetStateAction<Set<string>>>;
    isExporting: boolean;
    exportProgress: string;
    handleSubmit: () => void;
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
}

export const MassInputPageView: React.FC<MassInputPageViewProps> = (props) => {
    const {
        step, mode, handleModeSelect, handleBack, currentCard,
        isConfigOpen, setIsConfigOpen, selectedClass, setSelectedClass, classes, isLoadingClasses,
        quizInfo, setQuizInfo, subjectGradeInfo, setSubjectGradeInfo,
        isCustomSubject, setIsCustomSubject, uniqueSubjects,
        selectedViolationCode, setSelectedViolationCode, violationDate, setViolationDate,
        noteMethod, setNoteMethod, templateNote, setTemplateNote,
        assessmentNames, pasteData, setPasteData, isParsing, handleAiParse, isOnline,
        showImportModal, setShowImportModal,
        searchTerm, setSearchTerm, filterOptions, studentFilter, setStudentFilter,
        isLoadingStudents, students, isAllSelected, handleSelectAllStudents,
        selectedStudentIds, handleStudentSelect, scores, handleScoreChange,
        existingGrades, filteredExistingGrades,
        summaryText, gradedCount, setScores, setSelectedStudentIds,
        isExporting, exportProgress, handleSubmit, isSubmitDisabled, submitButtonTooltip,
        isSubmitting, isDeleting, studentsData, existingViolations, isLoadingViolations,
        showChartModal, setShowChartModal,
        confirmDeleteModal, setConfirmDeleteModal, confirmDeleteText, setConfirmDeleteText,
        handleDeleteConfirmClick, handleImport,
    } = props;

    if (step === 1) {
        return <Step1_ModeSelection handleModeSelect={handleModeSelect} />;
    }

    return (
        <div className="w-full min-h-screen p-4 sm:p-6 md:p-8 pb-24 flex flex-col bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white overflow-y-auto">
            <div className="w-full max-w-7xl mx-auto flex flex-col flex-grow">
                <header className="flex items-center gap-4 mb-6">
                    <Button variant="outline" size="icon" onClick={handleBack} className="bg-white dark:bg-white/10 border-slate-200 dark:border-white/20 hover:bg-slate-100 dark:hover:bg-white/20 flex-shrink-0">
                        <ArrowLeftIcon className="w-4 h-4" />
                    </Button>
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">{currentCard?.title}</h1>
                        <p className="mt-1 text-slate-600 dark:text-gray-300">{currentCard?.description}</p>
                    </div>
                </header>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 flex-grow">
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
                                onOpenImport={mode === 'subject_grade' ? () => setShowImportModal(true) : undefined}
                            />
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
                                existingGrades={mode === 'delete_subject_grade' ? filteredExistingGrades : existingGrades}
                            />
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
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                            Anda akan menghapus <strong className="text-white">{confirmDeleteModal.count} data nilai</strong> untuk penilaian <strong className="text-white">"{subjectGradeInfo.assessment_name}"</strong>. Aksi ini tidak dapat dibatalkan.
                        </p>
                        <div className="pt-3 border-t border-gray-200 dark:border-gray-700">
                            <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">Ketik <strong className="text-red-500">HAPUS</strong> untuk mengonfirmasi:</p>
                            <input
                                type="text"
                                value={confirmDeleteText}
                                onChange={e => setConfirmDeleteText(e.target.value)}
                                placeholder="Ketik HAPUS"
                                className="w-full px-3 py-2 text-sm border rounded-md mb-3 bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-gray-100"
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

                {/* Import Excel Modal */}
                {mode === 'subject_grade' && (
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
                )}

                {/* Footer */}
                {mode !== 'violation_export' && (
                    <Step2_Footer
                        summaryText={summaryText}
                        mode={mode}
                        selectedStudentIds={selectedStudentIds}
                        gradedCount={gradedCount}
                        setScores={setScores}
                        setSelectedStudentIds={setSelectedStudentIds}
                        isExporting={isExporting}
                        exportProgress={exportProgress}
                        handleSubmit={handleSubmit}
                        isSubmitDisabled={isSubmitDisabled}
                        submitButtonTooltip={submitButtonTooltip}
                        isSubmitting={isSubmitting}
                        isDeleting={isDeleting}
                        scores={scores}
                        students={studentsData}
                        subjectGradeInfo={subjectGradeInfo}
                        className={classes?.find(c => c.id === selectedClass)?.name}
                        existingViolations={existingViolations}
                        onShowChart={() => setShowChartModal(true)}
                    />
                )}

                {/* Chart Modal */}
                {mode === 'subject_grade' && (
                    <Modal isOpen={showChartModal} onClose={() => setShowChartModal(false)} title="Distribusi Nilai">
                        <div className="p-4">
                            <GradeDistributionChart scores={scores} kkm={75} />
                        </div>
                    </Modal>
                )}
            </div>
        </div>
    );
};
