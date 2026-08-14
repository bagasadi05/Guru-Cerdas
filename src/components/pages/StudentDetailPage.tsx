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
import { DuplicateViolationDialog } from './student/components/DuplicateViolationDialog';
import { CommunicationForm } from './student/forms/CommunicationForm';
import { StudentDetailPageSkeleton } from '../skeletons/PageSkeletons';
import { getStudentAvatar } from '../../utils/avatarUtils';
import { SemesterSelector } from '../ui/SemesterSelector';
import { Skeleton } from '../ui/Skeleton';
import { createWhatsAppLink } from '../../utils/whatsappUtils';

// Hook
import { useStudentDetailPage } from './student/hooks/useStudentDetailPage';
import { useViolationRealtimeNotifications } from '../../hooks/useViolationRealtimeNotifications';

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
    const isLeadership = userRole === 'kepala_madrasah' || userRole === 'waka_kesiswaan' || userRole === 'waka_kurikulum';
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
                {/* Navigation Header (Back Button + Breadcrumb) */}
                <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                            const targetClassId = student?.class_id;
                            if (targetClassId) {
                                try { sessionStorage.setItem('guru_cerdas_active_class_id', targetClassId); } catch { /* ignore storage error */ }
                                navigate(`/siswa?class=${targetClassId}`);
                            } else {
                                navigate('/siswa');
                            }
                        }}
                        className="gap-2 bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700/80 text-slate-700 dark:text-slate-200 shadow-sm rounded-xl font-semibold text-xs sm:text-sm min-h-[40px]"
                    >
                        <ArrowLeftIcon className="w-4 h-4 text-slate-500 dark:text-slate-400" />
                        <span>Kembali ke Data Siswa</span>
                    </Button>
                    <Breadcrumb
                        items={[
                            { label: 'Beranda', path: '/dashboard' },
                            { label: 'Siswa', path: student?.class_id ? `/siswa?class=${student.class_id}` : '/siswa' },
                            { label: student.name }
                        ]}
                    />
                </div>
                {/* Profile Header Card */}
                <div className="bg-white dark:bg-slate-800/60 rounded-2xl border border-slate-200/80 dark:border-slate-700/60 shadow-sm overflow-hidden">
                    <div className="flex flex-col sm:flex-row sm:items-center gap-4 f-p-card">
                        {/* Avatar + Name */}
                        <div className="flex items-center gap-3.5 flex-1 min-w-0">
                            <div className="relative group shrink-0">
                                <img
                                    src={getStudentAvatar(student.avatar_url, student.gender, student.id, undefined, 'md')}
                                    alt={student.name}
                                    className="w-14 h-14 sm:w-16 sm:h-16 rounded-xl object-cover border-2 border-white shadow-md dark:border-slate-600"
                                />
                                <input type="file" ref={photoInputRef} onChange={handlePhotoChange} accept="image/png, image/jpeg" className="hidden" disabled={isUploadingPhoto || !isOnline} />
                                {canManageStudentProfile ? (
                                    <button
                                        type="button"
                                        onClick={() => photoInputRef.current?.click()}
                                        disabled={isUploadingPhoto || !isOnline}
                                        aria-label="Unggah foto profil siswa"
                                        className="absolute -bottom-1 -right-1 p-1 bg-emerald-500 hover:bg-emerald-600 text-white rounded-md shadow-md transition-transform hover:scale-110"
                                    >
                                        <CameraIcon className="w-3 h-3" />
                                    </button>
                                ) : null}
                            </div>
                            <div className="flex-1 min-w-0">
                                <h1 className="f-text-xl text-slate-900 dark:text-white font-bold leading-snug truncate">
                                    {student.name}
                                </h1>
                                <p className="f-text-sm text-slate-500 dark:text-slate-400 mt-0.5">
                                    {student.classes?.name
                                        ? (student.classes.name.toLowerCase().startsWith('kelas')
                                            ? student.classes.name
                                            : `Kelas ${student.classes.name}`)
                                        : 'N/A'}
                                </p>
                            </div>
                        </div>

                        {/* Action buttons — auto width on desktop, full width on mobile */}
                        <div className="flex items-center gap-2 shrink-0">
                            {canManageStudentProfile ? (
                                <Button
                                    variant="outline"
                                    onClick={() => setModalState({ type: 'editStudent', data: student })}
                                    disabled={!isOnline}
                                    className="f-btn flex-1 sm:flex-none bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 shadow-sm"
                                >
                                    <UserCircleIcon className="f-icon-sm text-slate-500 dark:text-slate-400" />
                                    <span className="truncate">Edit Profil</span>
                                </Button>
                            ) : null}

                            <Link to={`/cetak-rapot/${studentId}`} className="flex-1 sm:flex-none flex min-w-0">
                                <Button
                                    variant="outline"
                                    className="w-full f-btn bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 shadow-sm"
                                >
                                    <FileTextIcon className="f-icon-sm text-slate-500 dark:text-slate-400" />
                                    <span className="truncate">Cetak Rapor</span>
                                </Button>
                            </Link>

                            {canManageStudentProfile ? (
                                <Button
                                    onClick={() => setModalState({ type: 'portalAccess' })}
                                    className="f-btn flex-1 sm:flex-none bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white shadow-sm"
                                >
                                    <KeyRoundIcon className="f-icon-sm" />
                                    <span className="truncate">Akses Portal</span>
                                </Button>
                            ) : null}
                        </div>
                    </div>
                </div>

                {/* Semester Selector */}
                <div className="f-mt-lg f-mb-md bg-white/80 dark:bg-slate-900/80 backdrop-blur-md rounded-2xl f-p-card border border-slate-200 dark:border-white/10 animate-fade-in-up space-y-2">
                    <div className="flex items-center justify-between f-gap-row">
                        <span className="f-text-sm-medium text-slate-600 dark:text-slate-400 shrink-0">Filter Semester:</span>
                        <SemesterSelector
                            value={selectedSemesterId || 'all'}
                            onChange={(semId) => setSelectedSemesterId(semId === 'all' ? null : semId)}
                            size="sm"
                            includeAllOption={true}
                            className="flex-1 min-w-0"
                        />
                    </div>
                    <div className="f-text-xs text-slate-500 dark:text-slate-400">
                        Sedang melihat: <span className="font-semibold text-slate-800 dark:text-slate-200">{selectedSemesterLabel}</span>
                    </div>
                </div>

                <section className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 f-gap-grid">
                    <StatCard icon={CheckCircleIcon} label="Hadir" value={`${attendanceSummary.Hadir} hari`} color="from-green-500 to-emerald-400" />
                    <StatCard icon={AlertCircleIcon} label="Izin" value={`${attendanceSummary.Izin} hari`} color="from-blue-500 to-cyan-400" />
                    <StatCard icon={AlertCircleIcon} label="Sakit" value={`${attendanceSummary.Sakit} hari`} color="from-yellow-500 to-amber-400" />
                    <StatCard icon={XCircleIcon} label="Alpha" value={`${attendanceSummary.Alpha} hari`} color="from-orange-500 to-red-400" />
                    <StatCard icon={ShieldAlertIcon} label="Poin Pelanggaran" value={totalViolationPoints} color="from-red-500 to-rose-400" className="col-span-2 sm:col-span-1" />
                </section>


                <Card>
                    <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                        {/* Sticky Tab Navigation */}
                        <div className="border-b border-gray-200 dark:border-white/10 sticky top-0 z-20 bg-white/90 dark:bg-gray-900/90 backdrop-blur-xl">
                            <div className="relative">
                                <div className={`absolute left-0 top-0 bottom-0 w-8 bg-gradient-to-r from-white dark:from-gray-900 to-transparent pointer-events-none z-10 transition-opacity duration-300 ${tabScrollState.left ? 'opacity-100' : 'opacity-0'}`} />
                                <div className={`absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-l from-white dark:from-gray-900 to-transparent pointer-events-none z-10 transition-opacity duration-300 ${tabScrollState.right ? 'opacity-100' : 'opacity-0'}`} />
                                <div ref={tabsScrollRef} className="flex justify-start px-2 sm:px-4 py-2 overflow-x-auto scrollbar-hide">
                                    <TabsList className="bg-gray-100/70 dark:bg-black/30 p-1 rounded-xl w-full flex justify-between gap-1 min-w-max lg:min-w-0 flex-nowrap lg:flex-wrap xl:flex-nowrap">
                                        <TabsTrigger value="grades" className="h-10 px-2.5 lg:px-3 text-xs xl:text-sm flex-1 lg:flex-none">Nilai</TabsTrigger>
                                        <TabsTrigger value="activity" className="h-10 px-2.5 lg:px-3 text-xs xl:text-sm flex-1 lg:flex-none">Keaktifan</TabsTrigger>
                                        <TabsTrigger value="violations" className="h-10 px-2.5 lg:px-3 text-xs xl:text-sm flex-1 lg:flex-none">Pelanggaran</TabsTrigger>
                                        <TabsTrigger value="bintang" className="h-10 px-2.5 lg:px-3 text-xs xl:text-sm flex-1 lg:flex-none">
                                            <ShieldAlertIcon className="w-3.5 h-3.5 mr-1 inline text-emerald-500" />
                                            BINTANG
                                        </TabsTrigger>
                                        <TabsTrigger value="extracurricular" className="h-10 px-2.5 lg:px-3 text-xs xl:text-sm flex-1 lg:flex-none">
                                            <Trophy className="w-3.5 h-3.5 mr-1 inline" />
                                            Ekstra
                                        </TabsTrigger>
                                        <TabsTrigger value="achievements" className="h-10 px-2.5 lg:px-3 text-xs xl:text-sm flex-1 lg:flex-none">
                                            <Trophy className="w-3.5 h-3.5 mr-1 inline" />
                                            Prestasi
                                        </TabsTrigger>
                                        <TabsTrigger value="reports" className="h-10 px-2.5 lg:px-3 text-xs xl:text-sm flex-1 lg:flex-none">Catatan Guru</TabsTrigger>
                                        <TabsTrigger value="development" className="h-10 px-2.5 lg:px-3 text-xs xl:text-sm flex-1 lg:flex-none">
                                            <BrainCircuitIcon className="w-3.5 h-3.5 mr-1 inline" />
                                            Perkembangan
                                        </TabsTrigger>
                                        <TabsTrigger value="communication" className="h-10 px-2.5 lg:px-3 text-xs xl:text-sm flex-1 lg:flex-none">
                                            <div className="relative">
                                                Komunikasi
                                                {unreadMessagesCount > 0 && (
                                                    <span className="absolute -top-1.5 -right-3 min-w-4 h-4 px-1 bg-red-500 rounded-full text-xxs text-white flex items-center justify-center font-bold">
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
                                    <GradesTab records={filteredAcademicRecords} onAdd={() => setModalState({ type: 'academic', mode: 'add', data: undefined })} onEdit={(r) => setModalState({ type: 'academic', mode: 'edit', data: r })} onDelete={(id) => handleDelete('academic_records', id)} isOnline={isOnline} currentUserId={user?.id} kkm={kkm} semesterLabel={selectedSemesterLabel} canAdd={canAdd} canManageAllRecords={canManageAllRecords} />
                                </Suspense>
                            )}
                        </TabsContent>
                        <TabsContent value="activity" className="p-0">
                            {activeTab === 'activity' && (
                                <Suspense fallback={<StudentDetailTabFallback />}>
                                    <ActivityTab quizPoints={filteredQuizPoints} onAdd={() => setModalState({ type: 'quiz', mode: 'add', data: undefined })} onEdit={(r) => setModalState({ type: 'quiz', mode: 'edit', data: r })} onDelete={(id) => handleDelete('quiz_points', id)} onApplyPoints={() => setModalState({ type: 'applyPoints' })} isOnline={isOnline} currentUserId={user?.id} semesterLabel={selectedSemesterLabel} canAdd={canAdd} canManageAllRecords={canManageAllRecords} />
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
                                        studentId={studentId!}
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
                                        studentId={studentId!}
                                        isSubmitting={createAchievementMutation.isPending || updateAchievementMutation.isPending}
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
                                                class: student.classes?.name || undefined
                                            },
                                            academicRecords: filteredAcademicRecords.map(r => ({
                                                subject: r.subject,
                                                score: r.score,
                                                assessment_name: r.assessment_name || undefined,
                                                notes: r.notes || undefined
                                            })),
                                            attendanceRecords: filteredAttendance.map(a => ({
                                                status: a.status,
                                                date: a.date
                                            })),
                                            violations: filteredViolations.map(v => ({
                                                description: v.description,
                                                points: v.points,
                                                date: v.date
                                            })),
                                            quizPoints: filteredQuizPoints.map(q => ({
                                                activity: q.quiz_name || q.subject || 'Keaktifan',
                                                points: q.points,
                                                date: q.quiz_date || q.created_at
                                            }))
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
                                defaultValues={modalState.data || null}
                                onSubmit={handleReportSubmit}
                                onClose={() => setModalState({ type: 'closed' })}
                                isPending={reportMutation.isPending}
                            />
                        )}
                        {modalState.type === 'academic' && (
                            <AcademicForm
                                defaultValues={modalState.data || null}
                                onSubmit={handleAcademicSubmit}
                                onClose={() => setModalState({ type: 'closed' })}
                                isPending={academicMutation.isPending}
                            />
                        )}
                        {modalState.type === 'quiz' && (
                            <QuizForm
                                defaultValues={modalState.data || null}
                                onSubmit={handleQuizSubmit}
                                onClose={() => setModalState({ type: 'closed' })}
                                isPending={quizMutation.isPending}
                            />
                        )}
                        {modalState.type === 'violation' && (
                            <ViolationForm
                                defaultValues={modalState.data || null}
                                onSubmit={handleViolationSubmit}
                                onClose={() => { setModalState({ type: 'closed' }); setViolationConflictFields([]); }}
                                isPending={violationMutation.isPending}
                                conflictFields={violationConflictFields}
                            />
                        )}
                        {modalState.type === 'achievement' && (
                            <AchievementForm
                                defaultValues={modalState.data || null}
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
            {
                duplicateDialog && (
                    <DuplicateViolationDialog
                        isOpen={true}
                        onClose={handleDuplicateCancel}
                        onConfirm={handleDuplicateConfirm}
                        existingViolation={duplicateDialog.existingViolation}
                    />
                )
            }
        </div >
    );
};

export default StudentDetailPage;
