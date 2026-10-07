import React, { Suspense, lazy } from 'react';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { CustomDropdown } from '../ui/CustomDropdown';
import {
    ArrowLeftIcon,
    CheckCircleIcon,
    AlertCircleIcon,
    FileTextIcon,
    UserCircleIcon,
    BrainCircuitIcon,
    CameraIcon,
    SparklesIcon,
    KeyRoundIcon,
    CopyIcon,
    CopyCheckIcon,
    Share2Icon,
    PrinterIcon,
    StarIcon
} from '../Icons';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/Tabs';
import { Modal } from '../ui/Modal';
import { Trophy, Compass, CheckCircle2, AlertCircle, XCircle, ShieldAlert, BookOpen, Zap, MessageSquare, Hash, User } from 'lucide-react';
import { Breadcrumb } from '../ui/Breadcrumb';
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

// Attendance stat definitions matching individual visual cards
const ATTENDANCE_STAT_CONFIGS = [
    { key: 'Hadir' as const, label: 'Hadir', unit: 'hari', badgeBg: 'bg-emerald-600', icon: CheckCircle2 },
    { key: 'Izin' as const, label: 'Izin', unit: 'hari', badgeBg: 'bg-blue-600', icon: AlertCircle },
    { key: 'Sakit' as const, label: 'Sakit', unit: 'hari', badgeBg: 'bg-amber-500', icon: AlertCircle },
    { key: 'Alpha' as const, label: 'Alpha', unit: 'hari', badgeBg: 'bg-rose-600', icon: XCircle },
] as const;

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

    // Auto-scroll active tab into view on mobile/tablet
    React.useEffect(() => {
        if (!tabsScrollRef.current) return;
        const activeTabEl = tabsScrollRef.current.querySelector('[data-state="active"]');
        if (activeTabEl) {
            activeTabEl.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
        }
    }, [activeTab, tabsScrollRef]);

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
        <div className="pb-8 lg:pb-6">
            <div className="no-print space-y-4">
                {/* Navigation Header (Back Button + Breadcrumb) */}
                <div className="flex flex-wrap items-center justify-between gap-3">
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
                        className="gap-2 bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700/80 text-slate-700 dark:text-slate-200 shadow-sm rounded-xl font-semibold text-xs sm:text-sm min-h-[44px] cursor-pointer active:scale-95 transition-all duration-200"
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
                <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
                    <div className="h-1.5 bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500" />
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 sm:p-5">
                        {/* Avatar + Info Siswa */}
                        <div className="flex items-center gap-4 min-w-0">
                            <div className="relative group shrink-0">
                                <img
                                    src={getStudentAvatar(student.avatar_url, student.gender, student.id, undefined, 'md')}
                                    alt={student.name}
                                    className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl object-cover ring-2 ring-emerald-500/20 shadow-md dark:ring-slate-600 bg-slate-100 dark:bg-slate-700"
                                />
                                <input type="file" ref={photoInputRef} onChange={handlePhotoChange} accept="image/png, image/jpeg" className="hidden" disabled={isUploadingPhoto || !isOnline} />
                                {canManageStudentProfile ? (
                                    <button
                                        type="button"
                                        onClick={() => photoInputRef.current?.click()}
                                        disabled={isUploadingPhoto || !isOnline}
                                        aria-label="Unggah foto profil siswa"
                                        className="absolute -bottom-1.5 -right-1.5 w-10 h-10 min-w-[40px] min-h-[40px] flex items-center justify-center bg-emerald-600 hover:bg-emerald-700 text-white rounded-full shadow-md transition-transform hover:scale-105 cursor-pointer active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-slate-900"
                                    >
                                        <CameraIcon className="w-4 h-4" />
                                    </button>
                                ) : null}
                            </div>
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 flex-wrap">
                                    <h1 className="text-lg sm:text-2xl text-slate-900 dark:text-white font-bold leading-snug line-clamp-1">
                                        {student.name}
                                    </h1>
                                    <span className="text-xs font-semibold px-2.5 py-0.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 border border-emerald-200/60 dark:border-emerald-800/40 shrink-0">
                                        {student.classes?.name
                                            ? (student.classes.name.toLowerCase().startsWith('kelas')
                                                ? student.classes.name
                                                : `Kelas ${student.classes.name}`)
                                            : 'N/A'}
                                    </span>
                                </div>
                                <div className="flex items-center gap-1.5 flex-wrap mt-2">
                                    {student.gender && (
                                        <span className="inline-flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-900/60 text-slate-700 dark:text-slate-200 border border-slate-200/60 dark:border-slate-700/60">
                                            <User className="w-3 h-3 text-slate-400 shrink-0" aria-hidden="true" />
                                            <span>{student.gender}</span>
                                        </span>
                                    )}
                                    {student.nis && (
                                        <span className="inline-flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-900/60 text-slate-700 dark:text-slate-200 border border-slate-200/60 dark:border-slate-700/60">
                                            <Hash className="w-3 h-3 text-slate-400 shrink-0" aria-hidden="true" />
                                            <span>NIS: {student.nis}</span>
                                        </span>
                                    )}
                                    {student.nisn && (
                                        <span className="inline-flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-900/60 text-slate-700 dark:text-slate-200 border border-slate-200/60 dark:border-slate-700/60">
                                            <Hash className="w-3 h-3 text-slate-400 shrink-0" aria-hidden="true" />
                                            <span>NISN: {student.nisn}</span>
                                        </span>
                                    )}
                                    {student.parent_phone && (
                                        <a
                                            href={createWhatsAppLink(student.parent_phone, `Halo Bapak/Ibu wali murid dari ${student.name}.`)}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="inline-flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-lg bg-emerald-50 dark:bg-emerald-500/10 text-emerald-800 dark:text-emerald-300 border border-emerald-200/60 dark:border-emerald-800/40 hover:bg-emerald-100 dark:hover:bg-emerald-900/30 transition-colors"
                                            title="Chat WhatsApp Orang Tua Siswa"
                                        >
                                            <Share2Icon className="w-3 h-3 text-emerald-600 dark:text-emerald-400 shrink-0" aria-hidden="true" />
                                            <span>WA: {student.parent_phone}</span>
                                        </a>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Tombol Aksi Profil */}
                        <div className="flex flex-wrap sm:flex-nowrap items-center gap-2 w-full sm:w-auto mt-2 sm:mt-0 shrink-0">
                            {canManageStudentProfile ? (
                                <Button
                                    variant="outline"
                                    onClick={() => setModalState({ type: 'editStudent', data: student })}
                                    disabled={!isOnline}
                                    className="flex-1 sm:flex-none h-11 min-h-[44px] px-3.5 gap-2 text-xs sm:text-sm font-semibold rounded-xl cursor-pointer active:scale-95 transition-all duration-200 bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700/80 text-slate-700 dark:text-slate-200"
                                >
                                    <UserCircleIcon className="w-4 h-4 shrink-0 text-slate-500 dark:text-slate-400" aria-hidden="true" />
                                    <span>Edit Profil</span>
                                </Button>
                            ) : null}

                            <Button
                                variant="outline"
                                onClick={() => navigate(`/cetak-rapot/${studentId}`)}
                                className="flex-1 sm:flex-none h-11 min-h-[44px] px-3.5 gap-2 text-xs sm:text-sm font-semibold rounded-xl cursor-pointer active:scale-95 transition-all duration-200 bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700/80 text-slate-700 dark:text-slate-200"
                            >
                                <FileTextIcon className="w-4 h-4 shrink-0 text-slate-500 dark:text-slate-400" aria-hidden="true" />
                                <span>Cetak Rapor</span>
                            </Button>

                            {canManageStudentProfile ? (
                                <Button
                                    onClick={() => setModalState({ type: 'portalAccess' })}
                                    className="w-full sm:w-auto flex-1 sm:flex-none h-11 min-h-[44px] px-4 gap-2 text-xs sm:text-sm font-semibold rounded-xl cursor-pointer active:scale-95 transition-all duration-200 bg-emerald-700 hover:bg-emerald-800 text-white shadow-sm"
                                >
                                    <KeyRoundIcon className="w-4 h-4 shrink-0" aria-hidden="true" />
                                    <span>Akses Portal</span>
                                </Button>
                            ) : null}
                        </div>
                    </div>
                </div>

                {/* Unified Semester & Attendance Summary Card */}
                <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-4 py-2.5 bg-slate-50/70 dark:bg-slate-800/60 border-b border-slate-100 dark:border-slate-700/80">
                        <div className="flex items-center gap-2 min-w-0">
                            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 shrink-0">Ringkasan</span>
                            <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 border border-emerald-200/60 dark:border-emerald-800/40 truncate">
                                {selectedSemesterLabel}
                            </span>
                        </div>
                        <div className="flex items-center gap-2 w-full sm:w-auto">
                            <span className="text-xs font-medium text-slate-500 dark:text-slate-400 shrink-0">Semester:</span>
                            <SemesterSelector
                                value={selectedSemesterId || 'all'}
                                onChange={(semId) => setSelectedSemesterId(semId === 'all' ? null : semId)}
                                size="sm"
                                includeAllOption={true}
                                className="w-full sm:w-56"
                            />
                        </div>
                    </div>

                    <section aria-label={`Ringkasan ${selectedSemesterLabel}`} className="p-3 sm:p-4">
                        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
                            {ATTENDANCE_STAT_CONFIGS.map((item) => (
                                <div
                                    key={item.key}
                                    className="bg-slate-50/80 dark:bg-slate-900/60 rounded-2xl border border-slate-200/80 dark:border-slate-700/60 p-3 sm:p-3.5 flex items-center gap-3 transition-all hover:border-slate-300 dark:hover:border-slate-600 shadow-xs"
                                >
                                    <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 shadow-sm ${item.badgeBg}`}>
                                        <item.icon className="w-5 h-5 text-white" strokeWidth={2.2} />
                                    </div>
                                    <div className="flex flex-col justify-center min-w-0">
                                        <p className="text-base sm:text-lg font-bold text-slate-900 dark:text-white leading-tight truncate">
                                            {attendanceSummary[item.key]} {item.unit}
                                        </p>
                                        <p className="text-xs text-slate-500 dark:text-slate-400 font-medium truncate mt-0.5">
                                            {item.label}
                                        </p>
                                    </div>
                                </div>
                            ))}
                            <div className="col-span-2 sm:col-span-1 lg:col-span-1 bg-slate-50/80 dark:bg-slate-900/60 rounded-2xl border border-slate-200/80 dark:border-slate-700/60 p-3 sm:p-3.5 flex items-center gap-3 transition-all hover:border-slate-300 dark:hover:border-slate-600 shadow-xs">
                                <div className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0 shadow-sm bg-red-700">
                                    <ShieldAlert className="w-5 h-5 text-white" strokeWidth={2.2} />
                                </div>
                                <div className="flex flex-col justify-center min-w-0">
                                    <p className="text-base sm:text-lg font-bold text-slate-900 dark:text-white leading-tight truncate">
                                        {totalViolationPoints}
                                    </p>
                                    <p className="text-xs text-slate-500 dark:text-slate-400 font-medium truncate mt-0.5">
                                        Poin Pelanggaran
                                    </p>
                                </div>
                            </div>
                        </div>
                    </section>
                </div>

                <Card>
                    <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                        {/* Sticky Tab Navigation */}
                        <div className="border-b border-gray-200 dark:border-white/10 sticky top-0 z-20 bg-white/95 dark:bg-slate-800/95 rounded-t-2xl">
                            <div className="relative">
                                <div className={`absolute left-0 top-0 bottom-0 w-8 bg-gradient-to-r from-white dark:from-slate-800 to-transparent pointer-events-none z-10 transition-opacity duration-300 ${tabScrollState.left ? 'opacity-100' : 'opacity-0'}`} />
                                <div className={`absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-l from-white dark:from-slate-800 to-transparent pointer-events-none z-10 transition-opacity duration-300 ${tabScrollState.right ? 'opacity-100' : 'opacity-0'}`} />
                                <div ref={tabsScrollRef} className="flex justify-start px-2 sm:px-4 py-2 overflow-x-auto scrollbar-hide scroll-smooth snap-x snap-mandatory">
                                    <TabsList className="bg-slate-100/80 dark:bg-slate-900/50 p-1.5 rounded-xl w-full flex justify-between gap-1 min-w-max lg:min-w-0 flex-nowrap lg:flex-wrap xl:flex-nowrap border border-slate-200/50 dark:border-slate-700/50">
                                        <TabsTrigger value="grades" className="min-h-[44px] h-11 px-3 text-sm flex-1 lg:flex-none cursor-pointer active:scale-95 transition-all duration-150 select-none snap-start">
                                            <BookOpen className="w-3.5 h-3.5 mr-1.5 inline text-emerald-500 shrink-0" aria-hidden="true" />
                                            Nilai
                                        </TabsTrigger>
                                        <TabsTrigger value="activity" className="min-h-[44px] h-11 px-3 text-sm flex-1 lg:flex-none cursor-pointer active:scale-95 transition-all duration-150 select-none snap-start">
                                            <Zap className="w-3.5 h-3.5 mr-1.5 inline text-amber-500 shrink-0" aria-hidden="true" />
                                            Keaktifan
                                        </TabsTrigger>
                                        <TabsTrigger value="violations" className="min-h-[44px] h-11 px-3 text-sm flex-1 lg:flex-none cursor-pointer active:scale-95 transition-all duration-150 select-none snap-start">
                                            <ShieldAlert className="w-3.5 h-3.5 mr-1.5 inline text-rose-500 shrink-0" aria-hidden="true" />
                                            Pelanggaran
                                            {totalViolationPoints > 0 && (
                                                <span className="ml-1.5 text-xxs font-bold px-1.5 py-0.5 rounded-full bg-rose-100 dark:bg-rose-900/40 text-rose-700 dark:text-rose-300">
                                                    {totalViolationPoints}
                                                </span>
                                            )}
                                        </TabsTrigger>
                                        <TabsTrigger value="bintang" className="min-h-[44px] h-11 px-3 text-sm flex-1 lg:flex-none cursor-pointer active:scale-95 transition-all duration-150 select-none snap-start">
                                            <StarIcon className="w-3.5 h-3.5 mr-1.5 inline text-amber-500 fill-amber-500/20 shrink-0" aria-hidden="true" />
                                            BINTANG
                                        </TabsTrigger>
                                        <TabsTrigger value="extracurricular" className="min-h-[44px] h-11 px-3 text-sm flex-1 lg:flex-none cursor-pointer active:scale-95 transition-all duration-150 select-none snap-start">
                                            <Compass className="w-3.5 h-3.5 mr-1.5 inline text-teal-500 shrink-0" aria-hidden="true" />
                                            Ekstra
                                        </TabsTrigger>
                                        <TabsTrigger value="achievements" className="min-h-[44px] h-11 px-3 text-sm flex-1 lg:flex-none cursor-pointer active:scale-95 transition-all duration-150 select-none snap-start">
                                            <Trophy className="w-3.5 h-3.5 mr-1.5 inline text-amber-500 shrink-0" aria-hidden="true" />
                                            Prestasi
                                        </TabsTrigger>
                                        <TabsTrigger value="reports" className="min-h-[44px] h-11 px-3 text-sm flex-1 lg:flex-none cursor-pointer active:scale-95 transition-all duration-150 select-none snap-start">
                                            <FileTextIcon className="w-3.5 h-3.5 mr-1.5 inline text-blue-500 shrink-0" aria-hidden="true" />
                                            Catatan Guru
                                        </TabsTrigger>
                                        <TabsTrigger value="development" className="min-h-[44px] h-11 px-3 text-sm flex-1 lg:flex-none cursor-pointer active:scale-95 transition-all duration-150 select-none snap-start">
                                            <BrainCircuitIcon className="w-3.5 h-3.5 mr-1.5 inline text-indigo-500 shrink-0" aria-hidden="true" />
                                            Perkembangan
                                        </TabsTrigger>
                                        <TabsTrigger value="communication" className="min-h-[44px] h-11 px-3 text-sm flex-1 lg:flex-none cursor-pointer active:scale-95 transition-all duration-150 select-none snap-start">
                                            <div className="relative inline-flex items-center">
                                                <MessageSquare className="w-3.5 h-3.5 mr-1.5 inline text-sky-500 shrink-0" aria-hidden="true" />
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
                    <Modal
                        isOpen={true}
                        onClose={() => setModalState({ type: 'closed' })}
                        maxWidth={modalState.type === 'editStudent' ? 'max-w-xl' : undefined}
                        title={
                            modalState.type === 'editStudent' ? 'Edit Profil Siswa' :
                                modalState.type === 'report' ? (modalState.data ? 'Edit Catatan' : 'Tambah Catatan Baru') :
                                    modalState.type === 'academic' ? (modalState.data ? 'Edit Nilai' : 'Tambah Nilai Baru') :
                                        modalState.type === 'quiz' ? (modalState.data ? 'Edit Poin' : 'Tambah Poin Keaktifan') :
                                            modalState.type === 'editCommunication' ? 'Edit Pesan' :
                                                modalState.type === 'portalAccess' ? 'Akses Portal Orang Tua' :
                                                    modalState.type === 'achievement' ? (modalState.mode === 'edit' ? 'Edit Prestasi' : 'Tambah Prestasi Baru') :
                                                        'Tambah Pelanggaran'
                        }
                    >
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
                                    <Button onClick={handleCopyAccessCode} variant="outline" className="w-full h-11 rounded-xl cursor-pointer active:scale-95 transition-all font-medium" disabled={!student.access_code}>
                                        {copied ? <CopyCheckIcon className="w-4 h-4 mr-2 text-green-500" /> : <CopyIcon className="w-4 h-4 mr-2" />}
                                        {copied ? 'Disalin' : 'Salin'}
                                    </Button>
                                    <Button onClick={handleShare} variant="outline" className="w-full h-11 rounded-xl cursor-pointer active:scale-95 transition-all font-medium" disabled={!student.access_code}>
                                        <Share2Icon className="w-4 h-4 mr-2" /> Bagikan
                                    </Button>
                                    <Button onClick={handlePrint} variant="outline" className="w-full h-11 rounded-xl cursor-pointer active:scale-95 transition-all font-medium" disabled={!student.access_code}>
                                        <PrinterIcon className="w-4 h-4 mr-2" /> Cetak
                                    </Button>
                                    <Button onClick={handleGenerateAccessCode} variant="outline" className="w-full h-11 rounded-xl cursor-pointer active:scale-95 transition-all font-medium" disabled={!isOnline || studentMutation.isPending}>
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
                    <Modal isOpen={true} onClose={() => setModalState({ type: 'closed' })} title="Asisten AI Wali Kelas: Laporan Orang Tua">
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
                                        Laporan perkembangan anak telah berhasil dibuat berdasarkan data riil semester ini. Anda dapat menyunting atau langsung menyalin laporan ini untuk WhatsApp orang tua.
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
