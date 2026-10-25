import React from 'react';
import { BintangEvaluationModal } from './BintangEvaluationModal';
import { BintangStudentHistoryModal } from './BintangStudentHistoryModal';
import { BintangAddViolationModal } from './BintangAddViolationModal';
import {
    BintangEditViolationModal,
    BintangEditQuizModal,
    BintangObservationModal,
    BintangMentoringModal,
    BintangMentoringEditModal,
    BintangDownloadProgressModal,
} from './BintangActionModals';
import { BintangKeaktifanModal } from '../BintangKeaktifanModal';
import { BintangBulkExportModal } from './BintangBulkExportModal';
import { aspectMeta } from '../bintangConstants';
import type { UseBintangEvaluationReturn } from '../hooks/useBintangEvaluation';
import type { AspectPointsSummary } from '../../../../services/bintangService';
import type {
    BintangStudent,
    BintangViolation,
    BintangQuizPoint,
    DailyObservationItem,
    BintangEvaluation,
} from '../types/bintangDashboardTypes';
import type { useBintangMutations } from '../hooks/useBintangMutations';

interface BintangModalsContainerProps {
    evalHook: UseBintangEvaluationReturn;
    mutations: ReturnType<typeof useBintangMutations>;
    students: BintangStudent[];
    violations: BintangViolation[];
    quizPoints: BintangQuizPoint[];
    dailyObservations: DailyObservationItem[];
    evaluations: BintangEvaluation[];
    classes: Array<{ id: string; name: string }>;
    selectedClass: string;
    selectedMonth: string;
    isWalas: boolean;
    userId: string;
    semesterId: string | null;
    detailStudentId: string | null;
    onCloseDetailStudent: () => void;
    onOpenAddViolationForStudent: (studentId: string) => void;
    onOpenKeaktifanModal: () => void;
    isKeaktifanModalOpen: boolean;
    onCloseKeaktifanModal: () => void;
    isBulkExportModalOpen: boolean;
    onCloseBulkExportModal: () => void;
    bulkSelectedStudentIds: Set<string>;
    fetchAllData: () => Promise<void>;
    getAspectSummary: (studentId: string) => AspectPointsSummary;
    studentViolationsMap: Map<string, Array<{ description: string; bintangAspect: string | null; category: string | null; context_notes: string | null; date: string; follow_up_status?: string | null; follow_up_notes?: string | null; recorded_by_name?: string }>>;
    studentQuizMap: Map<string, { totalPoints: number; count: number }>;
    studentAttitudeMap: Record<string, { spiritual?: string; social?: string }>;
    getStudentName: (id: string) => string;
}

export const BintangModalsContainer: React.FC<BintangModalsContainerProps> = ({
    evalHook,
    mutations,
    students,
    violations,
    quizPoints,
    dailyObservations,
    evaluations,
    classes,
    selectedClass,
    selectedMonth,
    isWalas,
    userId,
    semesterId,
    detailStudentId,
    onCloseDetailStudent,
    onOpenAddViolationForStudent,
    onOpenKeaktifanModal,
    isKeaktifanModalOpen,
    onCloseKeaktifanModal,
    isBulkExportModalOpen,
    onCloseBulkExportModal,
    bulkSelectedStudentIds,
    fetchAllData,
    getAspectSummary,
    studentViolationsMap,
    studentQuizMap,
    studentAttitudeMap,
    getStudentName,
}) => {
    return (
        <>
            <BintangEvaluationModal
                isOpen={evalHook.isEditModalOpen}
                onClose={() => evalHook.setIsEditModalOpen(false)}
                evalHook={evalHook}
                getAspectSummary={getAspectSummary}
                studentViolationsMap={studentViolationsMap}
                studentQuizMap={studentQuizMap}
                studentAttitudeMap={studentAttitudeMap}
            />

            <BintangStudentHistoryModal
                isOpen={Boolean(detailStudentId)}
                onClose={onCloseDetailStudent}
                studentId={detailStudentId}
                student={students.find((s) => s.id === detailStudentId)}
                violations={violations}
                quizPoints={quizPoints}
                dailyObservations={dailyObservations}
                isWalas={isWalas}
                aspectMeta={aspectMeta}
                onOpenAddViolation={() => {
                    if (detailStudentId) {
                        onOpenAddViolationForStudent(detailStudentId);
                    }
                }}
                onOpenEditViolation={(v) => {
                    onCloseDetailStudent();
                    mutations.openEditViolation(v);
                }}
                onDeleteViolation={(v) => {
                    onCloseDetailStudent();
                    void mutations.handleDeleteViolation(v);
                }}
                onOpenAddQuiz={onOpenKeaktifanModal}
                onOpenEditQuiz={(q) => {
                    onCloseDetailStudent();
                    mutations.openEditQuiz(q);
                }}
                onDeleteQuiz={(q) => {
                    onCloseDetailStudent();
                    void mutations.handleDeleteQuiz(q);
                }}
            />

            <BintangAddViolationModal
                isOpen={mutations.isAddViolationModalOpen}
                onClose={() => {
                    mutations.setIsAddViolationModalOpen(false);
                    mutations.setViolationStudentId('');
                    mutations.setViolationSelectedStudentIds([]);
                    mutations.setViolationStudentSearch('');
                }}
                inputMode={mutations.violationInputMode}
                onInputModeChange={mutations.setViolationInputMode}
                studentId={mutations.violationStudentId}
                onStudentIdChange={mutations.setViolationStudentId}
                selectedStudentIds={mutations.violationSelectedStudentIds}
                onToggleStudent={mutations.toggleViolationStudent}
                onSelectAll={mutations.selectAllViolationStudents}
                onDeselectAll={mutations.deselectAllViolationStudents}
                studentSearch={mutations.violationStudentSearch}
                onStudentSearchChange={mutations.setViolationStudentSearch}
                students={students}
                filteredStudents={mutations.filteredViolationStudents}
                onSubmit={mutations.handleAddViolation}
                isSaving={mutations.isViolationSaving}
            />

            <BintangEditViolationModal
                isOpen={mutations.isViolationModalOpen}
                onClose={() => {
                    mutations.setIsViolationModalOpen(false);
                    mutations.setEditingViolation(null);
                }}
                editingViolation={mutations.editingViolation}
                studentName={
                    mutations.editingViolation?.students?.name ||
                    getStudentName(mutations.editingViolation?.student_id || '') ||
                    'Siswa'
                }
                onSubmit={mutations.handleSaveViolation}
                isSaving={mutations.isViolationSaving}
            />

            <BintangKeaktifanModal
                isOpen={isKeaktifanModalOpen}
                onClose={onCloseKeaktifanModal}
                students={students}
                userId={userId}
                onSuccess={fetchAllData}
                semesterId={semesterId}
            />

            <BintangEditQuizModal
                isOpen={mutations.isQuizModalOpen}
                onClose={() => {
                    mutations.setIsQuizModalOpen(false);
                    mutations.setEditingQuizPoint(null);
                }}
                editingQuizPoint={mutations.editingQuizPoint}
                studentName={getStudentName(mutations.editingQuizPoint?.student_id || '')}
                onSubmit={mutations.handleSaveQuiz}
                isSaving={mutations.isQuizSaving}
            />

            <BintangObservationModal
                isOpen={mutations.isObservationModalOpen}
                onClose={() => mutations.setIsObservationModalOpen(false)}
                students={students}
                studentId={mutations.obsStudentId}
                onStudentIdChange={mutations.setObsStudentId}
                aspect={mutations.obsAspect}
                onAspectChange={mutations.setObsAspect}
                isPositive={mutations.obsIsPositive}
                onIsPositiveChange={mutations.setObsIsPositive}
                notes={mutations.obsNotes}
                onNotesChange={mutations.setObsNotes}
                onSubmit={mutations.handleObservationSubmit}
                isSubmitting={mutations.isObsSubmitting}
            />

            <BintangMentoringModal
                isOpen={mutations.isMentoringModalOpen}
                onClose={() => mutations.setIsMentoringModalOpen(false)}
                date={mutations.mentoringDate}
                onDateChange={mutations.setMentoringDate}
                role={mutations.mentoringRole}
                onRoleChange={mutations.setMentoringRole}
                mentoringClass={mutations.mentoringClass}
                onMentoringClassChange={mutations.setMentoringClass}
                classes={classes}
                targetType={mutations.mentoringTargetType}
                onTargetTypeChange={mutations.setMentoringTargetType}
                studentsInClass={mutations.mentoringStudentsInClass}
                selectedStudents={mutations.mentoringSelectedStudents}
                onSelectedStudentsChange={mutations.setMentoringSelectedStudents}
                notes={mutations.mentoringNotes}
                onNotesChange={mutations.setMentoringNotes}
                onSubmit={mutations.handleMentoringSubmit}
                isSubmitting={mutations.isMentoringSubmitting}
            />

            <BintangMentoringEditModal
                isOpen={mutations.isMentoringEditModalOpen}
                onClose={() => {
                    mutations.setIsMentoringEditModalOpen(false);
                    mutations.setEditingMentoringLog(null);
                }}
                date={mutations.mentoringDate}
                onDateChange={mutations.setMentoringDate}
                role={mutations.mentoringRole}
                onRoleChange={mutations.setMentoringRole}
                notes={mutations.mentoringNotes}
                onNotesChange={mutations.setMentoringNotes}
                onSubmit={mutations.handleSaveMentoringEdit}
                isSubmitting={mutations.isMentoringSubmitting}
            />

            <BintangDownloadProgressModal
                progress={
                    evalHook.isDownloadingClass || evalHook.isDownloadingBulk
                        ? evalHook.downloadProgress
                        : null
                }
            />

            {isBulkExportModalOpen && (
                <BintangBulkExportModal
                    isOpen={isBulkExportModalOpen}
                    onClose={onCloseBulkExportModal}
                    classNameTitle={classes.find((c) => c.id === selectedClass)?.name || 'Kelas'}
                    selectedMonth={selectedMonth}
                    students={students}
                    selectedStudentIds={bulkSelectedStudentIds}
                    evaluations={evaluations}
                    getAspectSummary={getAspectSummary}
                    onExportPdf={async (ids) => {
                        await evalHook.handleDownloadBulkPdf(ids);
                        onCloseBulkExportModal();
                    }}
                    onExportExcel={async (ids) => {
                        await evalHook.handleExportExcel(ids);
                        onCloseBulkExportModal();
                    }}
                    isExporting={evalHook.isDownloadingBulk || evalHook.isExportingExcel}
                    progress={evalHook.downloadProgress}
                />
            )}
        </>
    );
};
