import React, { Suspense, lazy } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { CustomDropdown } from '../ui/CustomDropdown';
import {
    ArrowLeftIcon,
    CheckCircleIcon,
    XCircleIcon,
    AlertCircleIcon,
    FileTextIcon,
    UserCircleIcon,
    BrainCircuitIcon,
    CameraIcon,
    ShieldAlertIcon,
    SparklesIcon,
    KeyRoundIcon,
    CopyIcon,
    CopyCheckIcon,
    Share2Icon,
    PrinterIcon
} from '../Icons';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/Tabs';
import { Modal } from '../ui/Modal';
import { Trophy } from 'lucide-react';
import { Breadcrumb } from '../ui/Breadcrumb';
import { StatCard } from './student/StatCard';
import { EditStudentForm } from './student/forms/EditStudentForm';
import { ReportForm } from './student/forms/ReportForm';
import { AcademicForm } from './student/forms/AcademicForm';
import { QuizForm } from './student/forms/QuizForm';
import { ViolationForm } from './student/forms/ViolationForm';
import { CommunicationForm } from './student/forms/CommunicationForm';
import { StudentDetailPageSkeleton } from '../skeletons/PageSkeletons';
import { getStudentAvatar } from '../../utils/avatarUtils';
import { SemesterSelector } from '../ui/SemesterSelector';
import { Skeleton } from '../ui/Skeleton';
import { createWhatsAppLink } from '../../utils/whatsappUtils';

// Hook
import { useStudentDetailPage } from './student/hooks/useStudentDetailPage';

const GradesTab = lazy(() => import('./student/GradesTab').then((module) => ({ default: module.GradesTab })));
const ActivityTab = lazy(() => import('./student/ActivityTab').then((module) => ({ default: module.ActivityTab })));
const ViolationsTab = lazy(() => import('./student/ViolationsTab').then((module) => ({ default: module.ViolationsTab })));
const ReportsTab = lazy(() => import('./student/ReportsTab').then((module) => ({ default: module.ReportsTab })));
const CommunicationTab = lazy(() => import('./student/CommunicationTab').then((module) => ({ default: module.CommunicationTab })));
const ExtracurricularTab = lazy(() => import('./student/ExtracurricularTab').then((module) => ({ default: module.ExtracurricularTab })));
const ChildDevelopmentAnalysisTab = lazy(() => import('./student-detail/child-development').then((module) => ({ default: module.ChildDevelopmentAnalysisTab })));
const AchievementsTab = lazy(() => import('./student/AchievementsTab').then((module) => ({ default: module.AchievementsTab })));
const BintangTab = lazy(() => import('./student/BintangTab').then((module) => ({ default: module.BintangTab })));

import {
    useStudentAchievements,
    useDeleteAchievement,
    useCreateAchievement,
    useUpdateAchievement,
} from '../../hooks/useAchievements';
import { AchievementForm } from './student/forms/AchievementForm';
import achievementService from '../../services/achievementService';
import { AchievementFormValues } from './student/schemas';

const StudentDetailTabFallback = () => (
    <div className="space-y-4 p-4 sm:p-6">
        <Skeleton className="h-6 w-48" />
        <Skeleton className="h-24 w-full rounded-2xl" />
        <Skeleton className="h-24 w-full rounded-2xl" />
        <Skeleton className="h-64 w-full rounded-2xl" />
    </div>
);

const StudentDetailPage = () => {
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
        studentDetails,
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

    const [fileActionStatus, setFileActionStatus] = React.useState<'idle' | 'uploading' | 'deleting'>('idle');

    const { data: achievements = [], isLoading: isAchievementsLoading, error: achievementsError } = useStudentAchievements(studentId || '');
    const deleteAchievementMutation = useDeleteAchievement(studentId || '', () => {
        setModalState({ type: 'closed' });
    });
    const createAchievementMutation = useCreateAchievement(studentId || '', () => {
        setModalState({ type: 'closed' });
    });
    const updateAchievementMutation = useUpdateAchievement(studentId || '', () => {
        setModalState({ type: 'closed' });
    });

    if (isLoading) return <StudentDetailPageSkeleton />;

    if (isError) {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen p-6 bg-gray-50 dark:bg-gray-950">
                <div className="max-w-md w-full bg-white dark:bg-gray-900 rounded-lg shadow-lg p-6 text-center border border-red-200 dark:border-red-900">
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
            <div className="flex flex-col items-center justify-center min-h-screen p-6 bg-gray-50 dark:bg-gray-950">
                <div className="max-w-md w-full bg-white dark:bg-gray-900 rounded-lg shadow-lg p-6 text-center">
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
    const isHomeroomTeacher = assignments.some((a: any) => a.class_id === student.class_id && a.assignment_role === 'homeroom');
    const canManageStudentProfile = student.user_id === user?.id || isHomeroomTeacher || userRole === 'admin';
    const canManageAllRecords = isHomeroomTeacher || userRole === 'admin';
    const isAssistant = assignments.some((a: any) => a.class_id === student.class_id && a.assignment_role === 'assistant');
    const isLeadership = userRole === 'kepala_madrasah' || userRole === 'waka_kesiswaan';
    const canAdd = !isAssistant && !isLeadership;

    const handleDeleteAchievement = (id: string) => {
        setModalState({
            type: 'confirmDelete',
            title: 'Konfirmasi Hapus',
            message: 'Apakah Anda yakin ingin menghapus data prestasi ini secara permanen beserta file sertifikatnya?',
            onConfirm: () => {
                setModalState(prev => ({ ...prev, isPending: true }));
                deleteAchievementMutation.mutate(id);
            },
            isPending: false
        });
    };

    const handleAchievementSubmit = async (data: AchievementFormValues & { evidence_file?: File | null; certificate_removed?: boolean }) => {
        if (!studentId) return;

        let certificateUrl = modalState.type === 'achievement' && modalState.mode === 'edit' ? modalState.data?.certificate_url : null;
        let certificateName = modalState.type === 'achievement' && modalState.mode === 'edit' ? modalState.data?.certificate_name : null;

        if (data.evidence_file) {
            setFileActionStatus('uploading');
            try {
                const uploadResult = await achievementService.uploadCertificate(studentId, data.evidence_file);
                if (modalState.type === 'achievement' && modalState.mode === 'edit' && modalState.data?.certificate_url) {
                    await achievementService.removeCertificate(modalState.data.certificate_url);
                }
                certificateUrl = uploadResult.publicUrl;
                certificateName = data.evidence_file.name;
            } catch (error: any) {
                toast.error(`Gagal mengunggah file: ${error.message}`);
                setFileActionStatus('idle');
                return;
            }
        } else if (data.certificate_removed === true) {
            if (modalState.type === 'achievement' && modalState.mode === 'edit' && modalState.data?.certificate_url) {
                setFileActionStatus('deleting');
                try {
                    await achievementService.removeCertificate(modalState.data.certificate_url);
                } catch (error: any) {
                    toast.error(`Gagal menghapus file lama: ${error.message}`);
                    setFileActionStatus('idle');
                    return;
                }
            }
            certificateUrl = null;
            certificateName = null;
        }

        const payload = {
            title: data.title,
            category: data.category,
            level: data.level,
            rank: data.rank || null,
            organizer: data.organizer || null,
            date: data.date,
            description: data.description || null,
            points: data.points || null,
            certificate_url: certificateUrl,
            certificate_name: certificateName,
            semester_id: selectedSemesterId || null,
        };

        const mutationOptions = {
            onSettled: () => {
                setFileActionStatus('idle');
            }
        };

        if (modalState.type === 'achievement' && modalState.mode === 'edit' && modalState.data?.id) {
            updateAchievementMutation.mutate({
                id: modalState.data.id,
                payload,
            }, mutationOptions);
        } else {
            createAchievementMutation.mutate(payload, mutationOptions);
        }
    };

    return (
        <div className="space-y-8 p-4 md:p-6 pb-8 lg:pb-6 bg-gray-50 dark:bg-gray-900 min-h-screen max-w-7xl mx-auto">
            <div className="no-print">
                {/* Breadcrumb Navigation */}
                <Breadcrumb
                    items={[
                        { label: 'Beranda', path: '/dashboard' },
                        { label: 'Siswa', path: '/siswa' },
                        { label: student.name }
                    ]}
                    className="mb-4"
                />

                <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div className="flex items-center gap-3 sm:gap-4 w-full md:w-auto">
                        <Button variant="outline" size="icon" onClick={() => navigate(-1)} aria-label="Kembali" className="flex-shrink-0 h-10 w-10 bg-white/50 dark:bg-white/10 border-gray-200 dark:border-white/20 hover:bg-white/80 dark:hover:bg-white/20 text-gray-900 dark:text-white transition-transform hover:-translate-x-1">
                            <ArrowLeftIcon className="w-5 h-5" />
                        </Button>
                        <div className="relative group flex-shrink-0">
                            <img src={getStudentAvatar(student.avatar_url, student.gender, student.id)} alt={student.name} className="w-16 h-16 sm:w-20 sm:h-20 rounded-full object-cover border-4 border-white shadow-md group-hover:shadow-lg transition-all duration-300 dark:border-white/10 group-hover:scale-105" />
                            <input type="file" ref={photoInputRef} onChange={handlePhotoChange} accept="image/png, image/jpeg" className="hidden" disabled={isUploadingPhoto || !isOnline} />
                            {canManageStudentProfile ? (
                                <button type="button" onClick={() => photoInputRef.current?.click()} disabled={isUploadingPhoto || !isOnline} aria-label="Unggah foto profil siswa" className="absolute -bottom-1 -right-1 p-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-full shadow-md hover:scale-110 transition-transform">
                                    <CameraIcon className="w-4 h-4" />
                                </button>
                            ) : null}
                        </div>
                        <div className="flex-1 min-w-0">
                            <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-gray-900 dark:text-white truncate">{student.name}</h1>
                            <p className="text-sm sm:text-base text-gray-500 dark:text-gray-400 truncate">Kelas {student.classes?.name || 'N/A'}</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2 w-full md:w-auto self-start md:self-center flex-wrap">
                        {canManageStudentProfile ? (
                            <Button
                                variant="outline"
                                onClick={() => setModalState({ type: 'editStudent', data: student })}
                                disabled={!isOnline}
                                className="flex-1 sm:flex-none h-10 px-3 sm:px-4 bg-white/50 dark:bg-white/10 border-gray-200 dark:border-white/20 hover:bg-white/80 dark:hover:bg-white/20 text-gray-900 dark:text-white transition-all hover:-translate-y-0.5"
                            >
                                <UserCircleIcon className="w-4 h-4 sm:mr-2" /><span className="hidden sm:inline">Edit Profil</span>
                            </Button>
                        ) : null}

                        <Link to={`/cetak-rapot/${studentId}`} className="flex-1 sm:flex-none flex">
                            <Button variant="outline" className="w-full h-10 px-3 sm:px-4 bg-white/50 dark:bg-white/10 border-gray-200 dark:border-white/20 hover:bg-white/80 dark:hover:bg-white/20 text-gray-900 dark:text-white transition-all hover:-translate-y-0.5">
                                <FileTextIcon className="w-4 h-4 sm:mr-2" /><span className="hidden sm:inline">Cetak Rapor</span>
                            </Button>
                        </Link>

                        {canManageStudentProfile ? (
                            <Button
                                onClick={() => setModalState({ type: 'portalAccess' })}
                                className="flex-1 sm:flex-none h-10 px-3 sm:px-4 bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-700 hover:to-emerald-800 text-white shadow-lg shadow-emerald-500/20 transition-all hover:-translate-y-0.5"
                            >
                                <KeyRoundIcon className="w-4 h-4 sm:mr-2" /><span className="hidden sm:inline">Akses Portal</span>
                            </Button>
                        ) : null}
                    </div>
                </header>

                {/* Semester Selector */}
                <div className="mt-6 mb-4 flex flex-wrap items-center justify-between gap-3 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md rounded-2xl p-3 border border-gray-200 dark:border-white/10 animate-fade-in-up">
                    <span className="text-sm font-medium text-slate-600 dark:text-slate-400">Filter Semester:</span>
                    <SemesterSelector
                        value={selectedSemesterId || 'all'}
                        onChange={(semId) => setSelectedSemesterId(semId === 'all' ? null : semId)}
                        size="sm"
                        includeAllOption={true}
                        className="min-w-[200px] lg:min-w-[200px] w-full lg:w-auto"
                    />
                    <div className="w-full sm:w-auto text-xs text-slate-500 dark:text-slate-400">
                        Sedang melihat: <span className="font-semibold text-slate-800 dark:text-slate-200">{selectedSemesterLabel}</span>
                    </div>
                </div>

                <section className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4 mt-6">
                    <StatCard icon={CheckCircleIcon} label="Hadir" value={`${attendanceSummary.Hadir} hari`} color="from-green-500 to-emerald-400" />
                    <StatCard icon={AlertCircleIcon} label="Izin" value={`${attendanceSummary.Izin} hari`} color="from-blue-500 to-cyan-400" />
                    <StatCard icon={AlertCircleIcon} label="Sakit" value={`${attendanceSummary.Sakit} hari`} color="from-yellow-500 to-amber-400" />
                    <StatCard icon={XCircleIcon} label="Alpha" value={`${attendanceSummary.Alpha} hari`} color="from-orange-500 to-red-400" />
                    <div className="col-span-2 sm:col-span-1">
                        <StatCard icon={ShieldAlertIcon} label="Poin Pelanggaran" value={totalViolationPoints} color="from-red-500 to-rose-400" />
                    </div>
                </section>

                <Card>
                    <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                        {/* Sticky Tab Navigation */}
                        <div className="border-b border-gray-200 dark:border-white/10 sticky top-0 z-20 bg-white/90 dark:bg-gray-900/90 backdrop-blur-xl">
                            <div className="relative">
                                <div className={`absolute left-0 top-0 bottom-0 w-8 bg-gradient-to-r from-white dark:from-gray-900 to-transparent pointer-events-none z-10 transition-opacity duration-300 ${tabScrollState.left ? 'opacity-100' : 'opacity-0'}`} />
                                <div className={`absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-l from-white dark:from-gray-900 to-transparent pointer-events-none z-10 transition-opacity duration-300 ${tabScrollState.right ? 'opacity-100' : 'opacity-0'}`} />
                                <div ref={tabsScrollRef} className="flex justify-start sm:justify-center px-2 sm:px-6 py-2 overflow-x-auto scrollbar-hide">
                                    <TabsList className="bg-gray-100/70 dark:bg-black/30 p-1 rounded-xl">
                                        <TabsTrigger value="grades" className="h-11">Nilai</TabsTrigger>
                                        <TabsTrigger value="activity" className="h-11">Keaktifan</TabsTrigger>
                                        <TabsTrigger value="violations" className="h-11">Pelanggaran</TabsTrigger>
                                        <TabsTrigger value="bintang" className="h-11">
                                            <ShieldAlertIcon className="w-4 h-4 mr-1.5 inline text-emerald-500" />
                                            BINTANG
                                        </TabsTrigger>
                                        <TabsTrigger value="extracurricular" className="h-11">
                                            <Trophy className="w-4 h-4 mr-1.5 inline" />
                                            Ekstrakurikuler
                                        </TabsTrigger>
                                        <TabsTrigger value="achievements" className="h-11">
                                            <Trophy className="w-4 h-4 mr-1.5 inline" />
                                            Prestasi
                                        </TabsTrigger>
                                        <TabsTrigger value="reports" className="h-11">Catatan Guru</TabsTrigger>
                                        <TabsTrigger value="development" className="h-11">
                                            <BrainCircuitIcon className="w-4 h-4 mr-1.5 inline" />
                                            Analisis Perkembangan
                                        </TabsTrigger>
                                        <TabsTrigger value="communication" className="h-11">
                                            <div className="relative">
                                                Komunikasi
                                                {unreadMessagesCount > 0 && (
                                                    <span className="absolute -top-1.5 -right-4 min-w-4.5 h-4.5 px-1 bg-red-500 rounded-full text-xxs text-white flex items-center justify-center font-bold">
                                                        {unreadMessagesCount > 99 ? '99+' : unreadMessagesCount}
                                                    </span>
                                                )}
                                            </div>
                                        </TabsTrigger>
                                    </TabsList>
                                </div>
                            </div>
                        </div>
                        <TabsContent value="grades" className="p-0">
                            {activeTab === 'grades' && (
                                <Suspense fallback={<StudentDetailTabFallback />}>
                                    <GradesTab records={filteredAcademicRecords} onAdd={() => setModalState({ type: 'academic', data: null })} onEdit={(r) => setModalState({ type: 'academic', data: r })} onDelete={(id) => handleDelete('academic_records', id)} isOnline={isOnline} currentUserId={user?.id} kkm={kkm} semesterLabel={selectedSemesterLabel} canAdd={canAdd} canManageAllRecords={canManageAllRecords} />
                                </Suspense>
                            )}
                        </TabsContent>
                        <TabsContent value="activity" className="p-0">
                            {activeTab === 'activity' && (
                                <Suspense fallback={<StudentDetailTabFallback />}>
                                    <ActivityTab quizPoints={filteredQuizPoints} onAdd={() => setModalState({ type: 'quiz', data: null })} onEdit={(r) => setModalState({ type: 'quiz', data: r })} onDelete={(id) => handleDelete('quiz_points', id)} onApplyPoints={() => setModalState({ type: 'applyPoints' })} isOnline={isOnline} currentUserId={user?.id} semesterLabel={selectedSemesterLabel} canAdd={canAdd} canManageAllRecords={canManageAllRecords} />
                                </Suspense>
                            )}
                        </TabsContent>
                        <TabsContent value="violations" className="p-0">
                            {activeTab === 'violations' && (
                                <Suspense fallback={<StudentDetailTabFallback />}>
                                    <ViolationsTab
                                        violations={filteredViolations}
                                        onAdd={() => setModalState({ type: 'violation', mode: 'add', data: null })}
                                        onEdit={(r) => setModalState({ type: 'violation', mode: 'edit', data: r })}
                                        onDelete={(id) => handleDelete('violations', id)}

                                        onNotifyParent={handleNotifyParent}
                                        studentName={student.name}
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
                        <TabsContent value="bintang" className="p-4 sm:p-6 bg-white dark:bg-slate-900 border-x border-b border-gray-200 dark:border-white/10 rounded-b-2xl">
                            {activeTab === 'bintang' && (
                                <Suspense fallback={<StudentDetailTabFallback />}>
                                    <BintangTab 
                                        studentId={studentId || ''} 
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
                        <TabsContent value="achievements" className="p-4 sm:p-6 bg-white dark:bg-slate-900 border-x border-b border-gray-200 dark:border-white/10 rounded-b-2xl">
                            {activeTab === 'achievements' && (
                                <Suspense fallback={<StudentDetailTabFallback />}>
                                    <AchievementsTab
                                        achievements={achievements}
                                        isLoading={isAchievementsLoading}
                                        error={achievementsError}
                                        onAdd={() => setModalState({ type: 'achievement', mode: 'add', data: null } as any)}
                                        onEdit={(r) => setModalState({ type: 'achievement', mode: 'edit', data: r } as any)}
                                        onDelete={handleDeleteAchievement}
                                        isOnline={isOnline}
                                        currentUserId={user?.id}
                                        studentName={student.name}
                                        className={student.classes?.name || '-'}
                                        canAdd={canManageStudentProfile && !isAssistant}
                                    />
                                </Suspense>
                            )}
                        </TabsContent>
                        <TabsContent value="reports" className="p-0">
                            {activeTab === 'reports' && (
                                <Suspense fallback={<StudentDetailTabFallback />}>
                                    <ReportsTab reports={reports} onAdd={() => setModalState({ type: 'report', data: null })} onEdit={(r) => setModalState({ type: 'report', data: r })} onDelete={(id) => handleDelete('reports', id)} isOnline={isOnline} currentUserId={user?.id} canAdd={canManageStudentProfile && !isAssistant} />
                                </Suspense>
                            )}
                        </TabsContent>
                        <TabsContent value="development" className="p-4 sm:p-6">
                            {activeTab === 'development' && (
                                <Suspense fallback={<StudentDetailTabFallback />}>
                                    <ChildDevelopmentAnalysisTab
                                        studentData={{
                                            student: {
                                                id: student.id,
                                                name: student.name,
                                                age: student.date_of_birth ? (() => { const dob = new Date(student.date_of_birth); const today = new Date(); let age = today.getFullYear() - dob.getFullYear(); const m = today.getMonth() - dob.getMonth(); if (m < 0 || (m === 0 && today.getDate() < dob.getDate())) age--; return age; })() : 12,
                                                class: student.classes?.name
                                            },
                                            academicRecords: filteredAcademicRecords.map((r) => ({
                                                subject: r.subject,
                                                score: r.score,
                                                assessment_name: r.assessment_name ?? undefined,
                                                notes: r.notes ?? undefined
                                            })),
                                            attendanceRecords: filteredAttendance.map((a) => ({
                                                status: a.status,
                                                date: a.date
                                            })),
                                            violations: filteredViolations.map((v) => ({
                                                description: v.description,
                                                points: v.points,
                                                date: v.date
                                            })),
                                            quizPoints: filteredQuizPoints.map((q) => ({
                                                activity: q.quiz_name,
                                                points: q.points,
                                                date: q.quiz_date
                                            }))
                                        }}
                                        allAcademicRecords={studentDetails?.academicRecords || []}
                                        allAttendanceRecords={studentDetails?.attendanceRecords || []}
                                        allViolations={studentDetails?.violations || []}
                                        allQuizPoints={studentDetails?.quizPoints || []}
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
                                        userAvatarUrl={user?.avatarUrl}
                                        studentName={student.name}
                                        currentUserId={user?.id}
                                        onSendMessage={(msg, attachment) => sendMessageMutation.mutate({ message: msg, attachment })}
                                        onEditMessage={(msg) => setModalState({ type: 'editCommunication', data: msg })}
                                        onDeleteMessage={(id) => handleDelete('communications', id)}
                                        isOnline={isOnline}
                                        isSending={sendMessageMutation.isPending}
                                        quickTemplates={communicationSignals}
                                    />
                                </Suspense>
                            )}
                        </TabsContent>
                    </Tabs>
                </Card>
            </div>

            <div className="hidden print:block">
                <div id="printable-slip">
                    <div className="p-8 text-black" style={{ width: '12cm', fontFamily: 'sans-serif' }}>
                        <h3 className="text-lg font-bold">Informasi Akses Portal Siswa</h3>
                        <p className="text-sm mb-4">Harap simpan informasi ini dengan baik.</p>
                        <div className="border-t border-b border-gray-300 py-4 my-4">
                            <p className="text-xs">Nama Siswa:</p>
                            <p className="text-base font-semibold">{student.name}</p>
                            <p className="text-xs mt-2">Kelas:</p>
                            <p className="text-base font-semibold">{student.classes?.name || 'N/A'}</p>
                        </div>
                        <p className="text-center text-sm">Gunakan kode berikut untuk masuk:</p>
                        <div className="text-center my-2 p-3 bg-gray-100 rounded-md">
                            <p className="text-3xl font-mono font-bold tracking-widest">{student.access_code}</p>
                        </div>
                        <p className="text-center text-xs mt-4">
                            Masuk melalui: <span className="font-mono">{window.location.origin}</span>
                        </p>
                    </div>
                </div>
            </div>



            {
                modalState.type === 'applyPoints' ? (
                    <Modal isOpen={true} onClose={() => setModalState({ type: 'closed' })} title="Gunakan Poin Keaktifan">
                        <div className="space-y-4">
                            <p className="text-sm text-gray-600 dark:text-gray-400">
                                Anda akan menggunakan <strong>{availableFilteredQuizPoints.length} poin</strong> keaktifan sebagai nilai tambahan. Poin ini akan ditandai sudah digunakan.
                            </p>
                            <div>
                                <label htmlFor="subject-select" className="block text-sm font-medium mb-1">Pilih Mata Pelajaran</label>
                                <CustomDropdown
                                    id="subject-select"
                                    value={subjectToApply}
                                    onChange={setSubjectToApply}
                                    options={uniqueSubjectsForGrades.filter((s): s is string => !!s).map(s => ({ value: s, label: s }))}
                                    placeholder="-- Pilih --"
                                />
                            </div>
                            {currentRecordForSubject && (
                                <div className="p-3 bg-gray-100 dark:bg-gray-800 rounded-md text-sm">
                                    <p>Nilai Saat Ini: <strong className="text-lg">{currentRecordForSubject.score}</strong></p>
                                    <p>Nilai Baru: <strong className="text-lg text-green-500">{Math.min(100, currentRecordForSubject.score + availableFilteredQuizPoints.length)}</strong></p>
                                </div>
                            )}
                            <div className="flex justify-end gap-2 pt-4">
                                <Button type="button" variant="ghost" onClick={() => setModalState({ type: 'closed' })}>Batal</Button>
                                <Button type="button" onClick={handleApplyPointsSubmit} disabled={applyPointsMutation.isPending || !subjectToApply || availableFilteredQuizPoints.length === 0}>
                                    {applyPointsMutation.isPending ? 'Menerapkan...' : 'Terapkan Poin'}
                                </Button>
                            </div>
                        </div>
                    </Modal>
                ) : modalState.type !== 'closed' && modalState.type !== 'confirmDelete' && (
                    <Modal isOpen={true} onClose={() => setModalState({ type: 'closed' })} title={
                        modalState.type === 'editStudent' ? 'Edit Profil Siswa' :
                            modalState.type === 'report' ? (modalState.data ? 'Edit Catatan' : 'Tambah Catatan Baru') :
                                modalState.type === 'academic' ? (modalState.data ? 'Edit Nilai' : 'Tambah Nilai Baru') :
                                    modalState.type === 'quiz' ? (modalState.data ? 'Edit Poin' : 'Tambah Poin Keaktifan') :
                                        modalState.type === 'editCommunication' ? 'Edit Pesan' :
                                            modalState.type === 'portalAccess' ? 'Akses Portal Orang Tua' :
                                                modalState.type === 'achievement' ? (modalState.mode === 'edit' ? 'Edit Prestasi' : 'Tambah Prestasi Baru') :
                                                    'Tambah Pelanggaran'
                    }>
                        {modalState.type === 'editStudent' && (
                            <EditStudentForm
                                defaultValues={modalState.data}
                                classes={classes}
                                onSubmit={handleEditStudentSubmit}
                                onClose={() => setModalState({ type: 'closed' })}
                                isPending={studentMutation.isPending}
                            />
                        )}
                        {modalState.type === 'report' && (
                            <ReportForm
                                defaultValues={modalState.data}
                                onSubmit={handleReportSubmit}
                                onClose={() => setModalState({ type: 'closed' })}
                                isPending={reportMutation.isPending}
                            />
                        )}
                        {modalState.type === 'academic' && (
                            <AcademicForm
                                defaultValues={modalState.data}
                                onSubmit={handleAcademicSubmit}
                                onClose={() => setModalState({ type: 'closed' })}
                                isPending={academicMutation.isPending}
                            />
                        )}
                        {modalState.type === 'quiz' && (
                            <QuizForm
                                defaultValues={modalState.data}
                                onSubmit={handleQuizSubmit}
                                onClose={() => setModalState({ type: 'closed' })}
                                isPending={quizMutation.isPending}
                            />
                        )}
                        {modalState.type === 'violation' && (
                            <ViolationForm
                                defaultValues={modalState.data}
                                onSubmit={handleViolationSubmit}
                                onClose={() => setModalState({ type: 'closed' })}
                                isPending={violationMutation.isPending}
                            />
                        )}
                        {modalState.type === 'achievement' && (
                            <AchievementForm
                                defaultValues={modalState.data}
                                onSubmit={handleAchievementSubmit}
                                onClose={() => setModalState({ type: 'closed' })}
                                isPending={createAchievementMutation.isPending || updateAchievementMutation.isPending || fileActionStatus !== 'idle'}
                                fileActionStatus={fileActionStatus}
                            />
                        )}
                        {modalState.type === 'editCommunication' && (
                            <CommunicationForm
                                defaultValues={modalState.data}
                                onSubmit={handleCommunicationSubmit}
                                onClose={() => setModalState({ type: 'closed' })}
                                isPending={communicationMutation.isPending}
                            />
                        )}
                        {modalState.type === 'portalAccess' && (
                            <div className="p-4 flex flex-col items-center">
                                <p className="text-sm text-gray-500 dark:text-gray-400 mb-6 text-center">Bagikan kode akses ini kepada orang tua atau wali siswa.</p>

                                {student.access_code ? (
                                    <div className="w-full max-w-sm p-6 rounded-2xl bg-gradient-to-br from-green-100 to-emerald-100 dark:from-green-900/40 dark:to-emerald-900/40 shadow-inner border border-green-200 dark:border-green-800 text-center mb-6">
                                        <p className="text-sm font-semibold text-green-900 dark:text-green-200 mb-2">Kode Akses Siswa</p>
                                        <div className="bg-white/80 dark:bg-black/40 p-3 rounded-lg border border-green-100 dark:border-green-800 mb-2">
                                            <p className="text-3xl font-mono font-bold tracking-[0.2em] text-green-700 dark:text-green-300">{student.access_code}</p>
                                        </div>
                                        <p className="text-xs text-green-600 dark:text-green-400">Kode ini bersifat rahasia.</p>
                                    </div>
                                ) : (
                                    <div className="text-center py-8 mb-6">
                                        <KeyRoundIcon className="w-12 h-12 mx-auto text-gray-300 dark:text-gray-600 mb-3" />
                                        <p className="text-gray-500">Belum ada kode akses.</p>
                                    </div>
                                )}

                                <div className="grid grid-cols-2 gap-3 w-full">
                                    <Button onClick={handleCopyAccessCode} variant="outline" className="w-full" disabled={!student.access_code}>
                                        {copied ? <CopyCheckIcon className="w-4 h-4 mr-2 text-green-500" /> : <CopyIcon className="w-4 h-4 mr-2" />}
                                        {copied ? 'Disalin' : 'Salin'}
                                    </Button>
                                    <Button onClick={handleShare} variant="outline" className="w-full" disabled={!student.access_code}>
                                        <Share2Icon className="w-4 h-4 mr-2" /> Bagikan
                                    </Button>
                                    <Button onClick={handlePrint} variant="outline" className="w-full" disabled={!student.access_code}>
                                        <PrinterIcon className="w-4 h-4 mr-2" /> Cetak
                                    </Button>
                                    <Button onClick={handleGenerateAccessCode} variant="outline" className="w-full" disabled={!isOnline || studentMutation.isPending}>
                                        <SparklesIcon className="w-4 h-4 mr-2" /> {student.access_code ? 'Reset' : 'Buat Baru'}
                                    </Button>
                                </div>
                            </div>
                        )}
                    </Modal>
                )
            }
            {
                modalState.type === 'confirmDelete' && (
                    <Modal isOpen={true} onClose={() => setModalState({ type: 'closed' })} title={modalState.title}>
                        <p className="text-sm text-gray-600 dark:text-gray-400">{modalState.message}</p>
                        <div className="flex justify-end gap-2 pt-4">
                            <Button type="button" variant="ghost" onClick={() => setModalState({ type: 'closed' })} disabled={deleteMutation.isPending || deleteAchievementMutation.isPending}>Batal</Button>
                            <Button type="button" variant="destructive" onClick={modalState.onConfirm} disabled={deleteMutation.isPending || deleteAchievementMutation.isPending}>
                                {deleteMutation.isPending || deleteAchievementMutation.isPending ? 'Menghapus...' : 'Ya, Hapus'}
                            </Button>
                        </div>
                    </Modal>
                )
            }
            {
                modalState.type === 'aiAssistant' && (
                    <Modal isOpen={true} onClose={() => setModalState({ type: 'closed' })} title="🤖 Asisten AI Wali Kelas - Laporan Orang Tua">
                        <div className="space-y-4">
                            {isAiReportLoading ? (
                                <div className="flex flex-col items-center justify-center py-12 text-center animate-fade-in">
                                    <div className="relative w-16 h-16 mb-4">
                                        <div className="absolute inset-0 rounded-full border-4 border-fuchsia-200 animate-ping"></div>
                                        <div className="relative w-16 h-16 rounded-full border-4 border-fuchsia-600 border-t-transparent animate-spin"></div>
                                    </div>
                                    <h4 className="font-semibold text-gray-900 dark:text-white mb-2">Merangkum Laporan Perkembangan...</h4>
                                    <p className="text-xs text-gray-500 dark:text-gray-400 max-w-sm">
                                        Kecerdasan Buatan sedang menganalisis data nilai akademik, kehadiran, keaktifan, dan perilaku {student.name} secara menyeluruh untuk menyusun pesan WhatsApp yang santun, apresiatif, dan memotivasi.
                                    </p>
                                </div>
                            ) : aiReportError ? (
                                <div className="p-4 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900 rounded-xl text-center">
                                    <AlertCircleIcon className="w-12 h-12 text-red-500 mx-auto mb-2 animate-bounce" />
                                    <h4 className="font-semibold text-red-800 dark:text-red-300 mb-1">Gagal Membuat Laporan</h4>
                                    <p className="text-xs text-red-600 dark:text-red-400 mb-4">{aiReportError}</p>
                                    <Button onClick={handleGenerateAiReport} variant="outline" className="text-red-600 border-red-200 hover:bg-red-50 dark:border-red-900 dark:hover:bg-red-950/40">
                                        Coba Lagi
                                    </Button>
                                </div>
                            ) : (
                                <div className="space-y-4 animate-fade-in">
                                    <p className="text-xs text-gray-600 dark:text-gray-400 leading-relaxed bg-fuchsia-50 dark:bg-fuchsia-950/20 p-3 rounded-xl border border-fuchsia-100 dark:border-fuchsia-900/30">
                                        ✨ Laporan perkembangan anak telah berhasil dibuat berdasarkan data riil semester ini. Anda dapat menyunting atau langsung menyalin laporan ini untuk WhatsApp orang tua.
                                    </p>

                                    <textarea
                                        value={aiReport}
                                        onChange={(e) => setAiReport(e.target.value)}
                                        rows={12}
                                        className="w-full rounded-xl border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white shadow-sm focus:border-fuchsia-500 focus:ring-fuchsia-500 text-sm p-4 transition-all resize-y min-h-[250px] overflow-y-auto leading-relaxed"
                                    />

                                    <div className="flex flex-col sm:flex-row gap-3 pt-2">
                                        <Button
                                            onClick={() => {
                                                navigator.clipboard.writeText(aiReport);
                                                setCopiedAiReport(true);
                                                toast.success("Laporan WhatsApp berhasil disalin ke clipboard!");
                                                setTimeout(() => setCopiedAiReport(false), 2000);
                                            }}
                                            className="flex-1 bg-gradient-to-r from-fuchsia-600 to-pink-600 hover:from-fuchsia-700 hover:to-pink-700 text-white shadow-lg shadow-fuchsia-500/20 transition-all font-semibold h-11"
                                        >
                                            {copiedAiReport ? (
                                                <>
                                                    <CheckCircleIcon className="w-4 h-4 mr-2 animate-scale-in" />
                                                    Tersalin!
                                                </>
                                            ) : (
                                                <>
                                                    <CopyIcon className="w-4 h-4 mr-2" />
                                                    Salin Laporan WhatsApp
                                                </>
                                            )}
                                        </Button>

                                        {student.parent_phone && (
                                            <a
                                                href={createWhatsAppLink(student.parent_phone, aiReport)}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="flex-1 flex items-center justify-center bg-emerald-600 hover:bg-emerald-700 text-white shadow-lg shadow-emerald-500/20 rounded-lg text-sm font-semibold transition-all h-11"
                                            >
                                                <Share2Icon className="w-4 h-4 mr-2" />
                                                Kirim via WhatsApp
                                            </a>
                                        )}

                                        <Button
                                            variant="outline"
                                            onClick={handleGenerateAiReport}
                                            className="h-11 border-gray-200 dark:border-white/10 hover:bg-gray-50 dark:hover:bg-white/5"
                                        >
                                            <SparklesIcon className="w-4 h-4 mr-2 text-fuchsia-500 animate-pulse" />
                                            Buat Ulang
                                        </Button>
                                    </div>
                                </div>
                            )}
                        </div>
                    </Modal>
                )
            }
        </div >
    );
};

export default StudentDetailPage;
