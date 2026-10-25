import React from 'react';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { Tabs } from '../ui/Tabs';
import { ArrowLeftIcon, AlertCircleIcon } from '../Icons';
import { StudentDetailPageSkeleton } from '../skeletons/PageSkeletons';
import { useStudentDetailPage } from './student/hooks/useStudentDetailPage';
import { useViolationRealtimeNotifications } from '../../hooks/useViolationRealtimeNotifications';
import { useStudentAchievementActions } from './student/hooks/detail/useStudentAchievementActions';
import {
    StudentDetailNavHeader,
    StudentDetailProfileCard,
    StudentDetailSummaryCard,
    StudentDetailTabsNav,
    StudentDetailTabPanels,
    StudentPortalPrintSlip,
    StudentDetailModals,
} from './student/components';

const StudentDetailPage: React.FC = () => {
    const {
        studentId,
        navigate,
        user,
        userRole,
        isOnline,
        toast,
        modalState,
        setModalState,
        activeTab,
        setActiveTab,
        copied,
        aiReport,
        setAiReport,
        isAiReportLoading,
        aiReportError,
        copiedAiReport,
        setCopiedAiReport,
        photoInputRef,
        isUploadingPhoto,
        messagesEndRef: _messagesEndRef,
        tabsScrollRef,
        tabScrollState,
        subjectToApply,
        setSubjectToApply,
        kkm,
        semesters: _semesters,
        selectedSemesterId,
        setSelectedSemesterId,
        selectedSemesterLabel,
        studentProfile,
        isLoading,
        isError,
        queryError,
        filteredAttendance,
        attendanceSummary,
        filteredViolations,
        filteredAcademicRecords,
        filteredQuizPoints,
        availableFilteredQuizPoints,
        filteredExtracurriculars,
        filteredExAttendance,
        filteredExGrades,
        totalViolationPoints,
        communicationSignals,
        uniqueSubjectsForGrades,
        currentRecordForSubject,
        handleEditStudentSubmit,
        handleReportSubmit,
        handleAcademicSubmit,
        handleQuizSubmit,
        handleViolationSubmit,
        handleDuplicateConfirm,
        handleDuplicateCancel,
        duplicateDialog,
        violationConflictFields,
        setViolationConflictFields,
        handleCommunicationSubmit,
        handleDelete,
        handleCopyAccessCode,
        handleNotifyParent,
        handleGenerateAccessCode,
        handlePhotoChange,
        handleShare,
        handlePrint,
        handleApplyPointsSubmit,
        handleGenerateAiReport,
        studentMutation,
        reportMutation,
        academicMutation,
        quizMutation,
        violationMutation,
        communicationMutation,
        deleteMutation,
        sendMessageMutation,
        applyPointsMutation,
        reports,
        communications,
        unreadMessagesCount,
    } = useStudentDetailPage();

    // Realtime notification for violations from other teachers
    useViolationRealtimeNotifications(studentId);

    // Achievement mutations & file handling
    const {
        achievements,
        isAchievementsLoading,
        achievementsError,
        fileActionStatus,
        handleDeleteAchievement,
        handleAchievementSubmit,
        isSubmittingAchievement,
        deleteAchievementMutation,
        createAchievementMutation,
        updateAchievementMutation,
    } = useStudentAchievementActions({
        studentId,
        modalState,
        setModalState,
        selectedSemesterId,
        toast,
    });

    if (isLoading) return <StudentDetailPageSkeleton />;

    if (isError) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] p-6">
                <div className="max-w-md w-full bg-white dark:bg-slate-800 rounded-2xl shadow-sm p-6 text-center border border-red-200 dark:border-red-900">
                    <AlertCircleIcon className="w-16 h-16 text-red-500 mx-auto mb-4" />
                    <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Gagal Memuat Data</h2>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                        {(queryError as Error).message}
                    </p>
                    <Button onClick={() => navigate('/siswa')} variant="outline" className="w-full">
                        <ArrowLeftIcon className="w-4 h-4 mr-2" />
                        Kembali ke Daftar Siswa
                    </Button>
                </div>
            </div>
        );
    }

    if (!studentProfile || !studentProfile.student) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] p-6">
                <div className="max-w-md w-full bg-white dark:bg-slate-800 rounded-2xl shadow-sm p-6 text-center border border-slate-200 dark:border-slate-700">
                    <AlertCircleIcon className="w-16 h-16 text-yellow-500 mx-auto mb-4" />
                    <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Siswa Tidak Ditemukan</h2>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                        Data siswa tidak tersedia atau telah dihapus.
                    </p>
                    <Button onClick={() => navigate('/siswa')} variant="outline" className="w-full">
                        <ArrowLeftIcon className="w-4 h-4 mr-2" />
                        Kembali ke Daftar Siswa
                    </Button>
                </div>
            </div>
        );
    }

    const student = studentProfile.student;
    const assignments = studentProfile.assignments || [];
    const classes = studentProfile.classes || [];
    const isHomeroomTeacher = assignments.some(
        (a: any) => a.class_id === student.class_id && a.assignment_role === 'homeroom'
    );
    const canManageStudentProfile = student.user_id === user?.id || isHomeroomTeacher || userRole === 'admin';
    const canManageAllRecords = isHomeroomTeacher || userRole === 'admin';
    const isAssistant = assignments.some(
        (a: any) => a.class_id === student.class_id && a.assignment_role === 'assistant'
    );
    const isLeadership =
        userRole === 'kepala_madrasah' || userRole === 'waka_kesiswaan' || userRole === 'waka_kurikulum';
    const canAdd = !isAssistant && !isLeadership;

    return (
        <div className="pb-8 lg:pb-6">
            <div className="no-print space-y-4">
                {/* Navigation Header (Back Button + Breadcrumb) */}
                <StudentDetailNavHeader
                    studentName={student.name}
                    classId={student.class_id}
                    onNavigate={navigate}
                />

                {/* Profile Header Card */}
                <StudentDetailProfileCard
                    student={student}
                    studentId={studentId}
                    canManageStudentProfile={canManageStudentProfile}
                    isOnline={isOnline}
                    photoInputRef={photoInputRef}
                    isUploadingPhoto={isUploadingPhoto}
                    onPhotoChange={handlePhotoChange}
                    onEditProfile={() => setModalState({ type: 'editStudent', data: student })}
                    onPrintReport={() => navigate(`/cetak-rapot/${studentId}`)}
                    onOpenPortalAccess={() => setModalState({ type: 'portalAccess' })}
                />

                {/* Unified Semester & Attendance Summary Card */}
                <StudentDetailSummaryCard
                    selectedSemesterId={selectedSemesterId}
                    selectedSemesterLabel={selectedSemesterLabel}
                    onSelectSemesterId={setSelectedSemesterId}
                    attendanceSummary={attendanceSummary}
                    totalViolationPoints={totalViolationPoints}
                />

                {/* Tabs & Tab Content Panels */}
                <Card>
                    <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                        <StudentDetailTabsNav
                            tabsScrollRef={tabsScrollRef}
                            tabScrollState={tabScrollState}
                            activeTab={activeTab}
                            totalViolationPoints={totalViolationPoints}
                            unreadMessagesCount={unreadMessagesCount}
                        />

                        <StudentDetailTabPanels
                            activeTab={activeTab}
                            student={student}
                            studentId={studentId!}
                            user={user}
                            isOnline={isOnline}
                            selectedSemesterId={selectedSemesterId}
                            selectedSemesterLabel={selectedSemesterLabel}
                            kkm={kkm}
                            canAdd={canAdd}
                            canManageAllRecords={canManageAllRecords}
                            isHomeroomTeacher={isHomeroomTeacher}
                            filteredAcademicRecords={filteredAcademicRecords}
                            filteredQuizPoints={filteredQuizPoints}
                            filteredViolations={filteredViolations}
                            filteredAttendance={filteredAttendance}
                            filteredExtracurriculars={filteredExtracurriculars}
                            filteredExAttendance={filteredExAttendance}
                            filteredExGrades={filteredExGrades}
                            achievements={achievements}
                            isAchievementsLoading={isAchievementsLoading}
                            achievementsError={achievementsError}
                            reports={reports}
                            communications={communications}
                            communicationSignals={communicationSignals}
                            fileActionStatus={fileActionStatus}
                            isSubmittingAchievement={isSubmittingAchievement}
                            setModalState={setModalState}
                            handleDelete={handleDelete}
                            handleNotifyParent={handleNotifyParent}
                            handleAchievementSubmit={handleAchievementSubmit}
                            handleDeleteAchievement={handleDeleteAchievement}
                            sendMessageMutation={sendMessageMutation}
                        />
                    </Tabs>
                </Card>
            </div>

            {/* Hidden Print Slip */}
            <StudentPortalPrintSlip student={student} />

            {/* Modal Dialogs Container */}
            <StudentDetailModals
                modalState={modalState}
                setModalState={setModalState}
                student={student}
                classes={classes}
                isOnline={isOnline}
                handleEditStudentSubmit={handleEditStudentSubmit}
                handleReportSubmit={handleReportSubmit}
                handleAcademicSubmit={handleAcademicSubmit}
                handleQuizSubmit={handleQuizSubmit}
                handleViolationSubmit={handleViolationSubmit}
                handleAchievementSubmit={handleAchievementSubmit}
                handleCommunicationSubmit={handleCommunicationSubmit}
                violationConflictFields={violationConflictFields}
                setViolationConflictFields={setViolationConflictFields}
                duplicateDialog={duplicateDialog}
                handleDuplicateConfirm={handleDuplicateConfirm}
                handleDuplicateCancel={handleDuplicateCancel}
                studentMutation={studentMutation}
                reportMutation={reportMutation}
                academicMutation={academicMutation}
                quizMutation={quizMutation}
                violationMutation={violationMutation}
                communicationMutation={communicationMutation}
                deleteMutation={deleteMutation}
                deleteAchievementMutation={deleteAchievementMutation}
                createAchievementMutation={createAchievementMutation}
                updateAchievementMutation={updateAchievementMutation}
                applyPointsMutation={applyPointsMutation}
                fileActionStatus={fileActionStatus}
                copied={copied}
                handleCopyAccessCode={handleCopyAccessCode}
                handleShare={handleShare}
                handlePrint={handlePrint}
                handleGenerateAccessCode={handleGenerateAccessCode}
                availableFilteredQuizPoints={availableFilteredQuizPoints}
                subjectToApply={subjectToApply}
                setSubjectToApply={setSubjectToApply}
                uniqueSubjectsForGrades={uniqueSubjectsForGrades}
                currentRecordForSubject={currentRecordForSubject}
                handleApplyPointsSubmit={handleApplyPointsSubmit}
                isAiReportLoading={isAiReportLoading}
                aiReportError={aiReportError}
                aiReport={aiReport}
                setAiReport={setAiReport}
                copiedAiReport={copiedAiReport}
                setCopiedAiReport={setCopiedAiReport}
                handleGenerateAiReport={handleGenerateAiReport}
                toast={toast}
            />
        </div>
    );
};

export default StudentDetailPage;
