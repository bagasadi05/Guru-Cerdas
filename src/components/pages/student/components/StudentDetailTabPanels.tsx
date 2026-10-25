import React, { Suspense, lazy } from 'react';
import { TabsContent } from '../../../ui/Tabs';
import { Skeleton } from '../../../ui/Skeleton';
import { getStudentAvatar } from '../../../../utils/avatarUtils';
import type {
    AcademicRecordRow,
    AttendanceRow,
    CommunicationRow,
    QuizPointRow,
    ReportRow,
    StudentWithClass,
    ViolationRow,
} from '../types';
import type { AchievementFormValues } from '../schemas';

const GradesTab = lazy(() => import('../GradesTab').then((module) => ({ default: module.GradesTab })));
const ActivityTab = lazy(() => import('../ActivityTab').then((module) => ({ default: module.ActivityTab })));
const ViolationsTab = lazy(() => import('../ViolationsTab').then((module) => ({ default: module.ViolationsTab })));
const ReportsTab = lazy(() => import('../ReportsTab').then((module) => ({ default: module.ReportsTab })));
const CommunicationTab = lazy(() => import('../CommunicationTab').then((module) => ({ default: module.CommunicationTab })));
const ExtracurricularTab = lazy(() => import('../ExtracurricularTab').then((module) => ({ default: module.ExtracurricularTab })));
const ChildDevelopmentAnalysisTab = lazy(() => import('../../student-detail/child-development').then((module) => ({ default: module.ChildDevelopmentAnalysisTab })));
const AchievementsTab = lazy(() => import('../AchievementsTab').then((module) => ({ default: module.AchievementsTab })));
const BintangTab = lazy(() => import('../BintangTab').then((module) => ({ default: module.BintangTab })));

export const StudentDetailTabFallback = () => (
    <div className="space-y-4 p-4 sm:p-6">
        <Skeleton className="h-6 w-48" />
        <Skeleton className="h-24 w-full rounded-2xl" />
        <Skeleton className="h-24 w-full rounded-2xl" />
        <Skeleton className="h-64 w-full rounded-2xl" />
    </div>
);

interface StudentDetailTabPanelsProps {
    activeTab: string;
    student: StudentWithClass;
    studentId: string;
    user: any;
    isOnline: boolean;
    selectedSemesterId: string | null;
    selectedSemesterLabel: string;
    kkm: number;
    canAdd: boolean;
    canManageAllRecords: boolean;
    isHomeroomTeacher: boolean;
    // Data
    filteredAcademicRecords: AcademicRecordRow[];
    filteredQuizPoints: QuizPointRow[];
    filteredViolations: ViolationRow[];
    filteredAttendance: AttendanceRow[];
    filteredExtracurriculars: any[];
    filteredExAttendance: any[];
    filteredExGrades: any[];
    achievements: any[];
    isAchievementsLoading: boolean;
    achievementsError: any;
    reports: ReportRow[];
    communications: CommunicationRow[];
    communicationSignals: any[];
    fileActionStatus: 'idle' | 'uploading' | 'deleting';
    isSubmittingAchievement: boolean;
    // Handlers
    setModalState: React.Dispatch<React.SetStateAction<any>>;
    handleDelete: (table: any, id: string | number) => void;
    handleNotifyParent: (v: any) => void;
    handleAchievementSubmit: (data: AchievementFormValues & { evidence_file?: File | null; certificate_removed?: boolean }) => Promise<void>;
    handleDeleteAchievement: (id: string) => void;
    sendMessageMutation: any;
}

export const StudentDetailTabPanels: React.FC<StudentDetailTabPanelsProps> = ({
    activeTab,
    student,
    studentId,
    user,
    isOnline,
    selectedSemesterId,
    selectedSemesterLabel,
    kkm,
    canAdd,
    canManageAllRecords,
    isHomeroomTeacher,
    filteredAcademicRecords,
    filteredQuizPoints,
    filteredViolations,
    filteredAttendance,
    filteredExtracurriculars,
    filteredExAttendance,
    filteredExGrades,
    achievements,
    isAchievementsLoading,
    achievementsError,
    reports,
    communications,
    communicationSignals,
    fileActionStatus,
    isSubmittingAchievement,
    setModalState,
    handleDelete,
    handleNotifyParent,
    handleAchievementSubmit,
    handleDeleteAchievement,
    sendMessageMutation,
}) => {
    return (
        <>
            <TabsContent value="grades" className="p-0">
                {activeTab === 'grades' && (
                    <Suspense fallback={<StudentDetailTabFallback />}>
                        <GradesTab
                            records={filteredAcademicRecords}
                            onAdd={() => setModalState({ type: 'academic', mode: 'add', data: undefined })}
                            onEdit={(r) => setModalState({ type: 'academic', mode: 'edit', data: r })}
                            onDelete={(id) => handleDelete('academic_records', id)}
                            isOnline={isOnline}
                            currentUserId={user?.id}
                            kkm={kkm}
                            semesterLabel={selectedSemesterLabel}
                            canAdd={canAdd}
                            canManageAllRecords={canManageAllRecords}
                        />
                    </Suspense>
                )}
            </TabsContent>

            <TabsContent value="activity" className="p-0">
                {activeTab === 'activity' && (
                    <Suspense fallback={<StudentDetailTabFallback />}>
                        <ActivityTab
                            quizPoints={filteredQuizPoints}
                            onAdd={() => setModalState({ type: 'quiz', mode: 'add', data: undefined })}
                            onEdit={(r) => setModalState({ type: 'quiz', mode: 'edit', data: r })}
                            onDelete={(id) => handleDelete('quiz_points', id)}
                            onApplyPoints={() => setModalState({ type: 'applyPoints' })}
                            isOnline={isOnline}
                            currentUserId={user?.id}
                            semesterLabel={selectedSemesterLabel}
                            canAdd={canAdd}
                            canManageAllRecords={canManageAllRecords}
                        />
                    </Suspense>
                )}
            </TabsContent>

            <TabsContent value="violations" className="p-0">
                {activeTab === 'violations' && (
                    <Suspense fallback={<StudentDetailTabFallback />}>
                        <ViolationsTab
                            violations={filteredViolations}
                            onAdd={() => setModalState({ type: 'violation', mode: 'add', data: undefined })}
                            onEdit={(r) => setModalState({ type: 'violation', mode: 'edit', data: r })}
                            onDelete={(id) => handleDelete('violations', id)}
                            onNotifyParent={handleNotifyParent}
                            studentName={student.name}
                            parentName={student.parent_name}
                            parentPhone={student.parent_phone}
                            className={student.classes?.name || '-'}
                            isOnline={isOnline}
                            currentUserId={user?.id}
                            semesterLabel={selectedSemesterLabel}
                            isHomeroomTeacher={isHomeroomTeacher}
                            canAdd={canAdd}
                            canManageAllRecords={canManageAllRecords}
                        />
                    </Suspense>
                )}
            </TabsContent>

            <TabsContent value="bintang" className="p-0">
                {activeTab === 'bintang' && (
                    <Suspense fallback={<StudentDetailTabFallback />}>
                        <BintangTab
                            studentId={studentId}
                            studentName={student.name}
                            violations={filteredViolations}
                        />
                    </Suspense>
                )}
            </TabsContent>

            <TabsContent value="extracurricular" className="p-0">
                {activeTab === 'extracurricular' && (
                    <Suspense fallback={<StudentDetailTabFallback />}>
                        <ExtracurricularTab
                            studentExtracurriculars={filteredExtracurriculars}
                            attendanceRecords={filteredExAttendance}
                            grades={filteredExGrades}
                        />
                    </Suspense>
                )}
            </TabsContent>

            <TabsContent value="achievements" className="p-0">
                {activeTab === 'achievements' && (
                    <Suspense fallback={<StudentDetailTabFallback />}>
                        <AchievementsTab
                            achievements={achievements}
                            isLoading={isAchievementsLoading}
                            error={achievementsError}
                            studentId={studentId}
                            isSubmitting={isSubmittingAchievement}
                            fileActionStatus={fileActionStatus}
                            onSave={handleAchievementSubmit}
                            onDelete={handleDeleteAchievement}
                            isOnline={isOnline}
                            currentUserId={user?.id}
                            studentName={student.name}
                            className={student.classes?.name || '-'}
                            canAdd={canAdd}
                        />
                    </Suspense>
                )}
            </TabsContent>

            <TabsContent value="reports" className="p-0">
                {activeTab === 'reports' && (
                    <Suspense fallback={<StudentDetailTabFallback />}>
                        <ReportsTab
                            reports={reports}
                            onAdd={() => setModalState({ type: 'report', mode: 'add', data: undefined })}
                            onEdit={(r) => setModalState({ type: 'report', mode: 'edit', data: r })}
                            onDelete={(id) => handleDelete('reports', id)}
                            isOnline={isOnline}
                            currentUserId={user?.id}
                            canAdd={canAdd}
                        />
                    </Suspense>
                )}
            </TabsContent>

            <TabsContent value="development" className="p-0">
                {activeTab === 'development' && (
                    <Suspense fallback={<StudentDetailTabFallback />}>
                        <ChildDevelopmentAnalysisTab
                            studentData={{
                                student: {
                                    id: student.id,
                                    name: student.name,
                                    class: student.classes?.name || undefined,
                                },
                                academicRecords: filteredAcademicRecords.map((r) => ({
                                    subject: r.subject,
                                    score: r.score,
                                    assessment_name: r.assessment_name || undefined,
                                    notes: r.notes || undefined,
                                })),
                                attendanceRecords: filteredAttendance.map((a) => ({
                                    status: a.status,
                                    date: a.date,
                                })),
                                violations: filteredViolations.map((v) => ({
                                    description: v.description,
                                    points: v.points,
                                    date: v.date,
                                })),
                                quizPoints: filteredQuizPoints.map((q) => ({
                                    activity: q.quiz_name || q.subject || 'Keaktifan',
                                    points: q.points,
                                    date: q.quiz_date || q.created_at,
                                })),
                            }}
                            allAcademicRecords={filteredAcademicRecords}
                            allAttendanceRecords={filteredAttendance}
                            allViolations={filteredViolations}
                            allQuizPoints={filteredQuizPoints}
                            selectedSemesterId={selectedSemesterId}
                        />
                    </Suspense>
                )}
            </TabsContent>

            <TabsContent value="communication" className="p-0">
                {activeTab === 'communication' && (
                    <Suspense fallback={<StudentDetailTabFallback />}>
                        <CommunicationTab
                            communications={communications}
                            userAvatarUrl={getStudentAvatar(user?.avatarUrl)}
                            studentName={student.name}
                            currentUserId={user?.id}
                            onSendMessage={(msg, att) => sendMessageMutation.mutate({ message: msg, attachment: att })}
                            onEditMessage={(msg) => setModalState({ type: 'editCommunication', data: msg })}
                            onDeleteMessage={(id) => handleDelete('communications', id)}
                            isOnline={isOnline}
                            isSending={sendMessageMutation.isPending}
                            quickTemplates={communicationSignals}
                        />
                    </Suspense>
                )}
            </TabsContent>
        </>
    );
};
