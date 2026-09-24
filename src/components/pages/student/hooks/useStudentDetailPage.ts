import { useState, useEffect, useMemo, useRef } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { useToast } from '../../../../hooks/useToast';
import { supabase } from '../../../../services/supabase';
import { useAuth } from '../../../../hooks/useAuth';
import { Database } from '../../../../services/database.types';
import { useQueryClient } from '@tanstack/react-query';
import { useOfflineStatus } from '../../../../hooks/useOfflineStatus';
import { useUserSettings } from '../../../../hooks/useUserSettings';
import { useSemester } from '../../../../contexts/SemesterContext';
import { getSemesterDisplayName } from '../../../../utils/semesterUtils';
import { resolveSubmitSemesterId } from '../studentDetailHelpers';
import { useStudentMutations } from './useStudentMutations';
import { normalizeStudentName } from '../../../../utils/textSanitizer';
import { useConfetti } from '../../../../hooks/useConfetti';

import {
    ModalState,
    StudentMutationVars,
} from '../types';

import {
    EditStudentFormValues,
    ReportFormValues,
    AcademicFormValues,
    QuizFormValues,
    CommunicationFormValues,
} from '../schemas';

// Modular domain sub-hooks
import { useStudentProfileData } from './detail/useStudentProfileData';
import { useStudentTabQueries } from './detail/useStudentTabQueries';
import { useStudentTabFilters } from './detail/useStudentTabFilters';
import { useStudentViolationActions } from './detail/useStudentViolationActions';
import { useStudentAiReport } from './detail/useStudentAiReport';
import { useStudentProfileActions } from './detail/useStudentProfileActions';

export const useStudentDetailPage = () => {
    const { studentId } = useParams<{ studentId: string }>();
    const navigate = useNavigate();
    const location = useLocation();
    const { user, userRole } = useAuth();
    const isOnline = useOfflineStatus();
    const toast = useToast();
    const queryClient = useQueryClient();

    // UI state
    const [modalState, setModalState] = useState<ModalState>({ type: 'closed' });
    const [activeTab, setActiveTab] = useState('grades');
    const [subjectToApply, setSubjectToApply] = useState('');
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const tabsScrollRef = useRef<HTMLDivElement>(null);
    const [tabScrollState, setTabScrollState] = useState({ left: false, right: false });

    const { kkm } = useUserSettings();
    const { activeSemester, semesters } = useSemester();

    // Initialize with activeSemester ID, will update when data loads
    const [selectedSemesterId, setSelectedSemesterId] = useState<string | null>(() => activeSemester?.id || null);
    const targetSemesterId = resolveSubmitSemesterId(null, selectedSemesterId, activeSemester?.id);
    const selectedSemester = selectedSemesterId ? semesters.find(semester => semester.id === selectedSemesterId) : null;
    const selectedSemesterLabel = selectedSemester
        ? `${selectedSemester.academic_years?.name || 'Tahun Ajaran'} - ${getSemesterDisplayName(selectedSemester.name, selectedSemester.start_date, 'full')}`
        : 'Semua Semester';

    const [prevActiveSemesterId, setPrevActiveSemesterId] = useState(activeSemester?.id);
    if (activeSemester?.id && activeSemester.id !== prevActiveSemesterId) {
        setPrevActiveSemesterId(activeSemester.id);
        if (!selectedSemesterId) {
            setSelectedSemesterId(activeSemester.id);
        }
    }

    const [prevOpenTab, setPrevOpenTab] = useState(location.state?.openTab);
    if (location.state?.openTab && location.state.openTab !== prevOpenTab) {
        setPrevOpenTab(location.state.openTab);
        setActiveTab(location.state.openTab);
    }

    useEffect(() => {
        const container = tabsScrollRef.current;
        if (!container) return;

        const updateScrollState = () => {
            const left = container.scrollLeft > 4;
            const right = container.scrollLeft + container.clientWidth < container.scrollWidth - 4;
            setTabScrollState({ left, right });
        };

        updateScrollState();
        container.addEventListener('scroll', updateScrollState, { passive: true });
        window.addEventListener('resize', updateScrollState);

        return () => {
            container.removeEventListener('scroll', updateScrollState);
            window.removeEventListener('resize', updateScrollState);
        };
    }, []);

    // 1. Profile Data & Stats
    const {
        studentProfile,
        isProfileLoading,
        profileError,
        statsData,
    } = useStudentProfileData({ studentId, user });

    // 2. Tab-Specific Queries (Lazy Loaded)
    const {
        academicRecords,
        quizPoints,
        reports,
        extracurricularData,
        unreadMessagesCount,
        communications,
    } = useStudentTabQueries({ studentId, user, activeTab });

    // Composite data object
    const studentDetails = useMemo(() => {
        if (!studentProfile) return null;
        return {
            student: studentProfile.student,
            assignments: studentProfile.assignments,
            classes: studentProfile.classes,
            attendanceRecords: statsData?.attendanceRecords || [],
            violations: statsData?.violations || [],
            academicRecords,
            quizPoints,
            reports,
            studentExtracurriculars: extracurricularData?.studentExtracurriculars || [],
            extracurricularAttendance: extracurricularData?.extracurricularAttendance || [],
            extracurricularGrades: extracurricularData?.extracurricularGrades || [],
            communications,
        };
    }, [studentProfile, statsData, academicRecords, quizPoints, reports, extracurricularData, communications]);

    // Mutations
    const {
        studentMutation,
        reportMutation,
        academicMutation,
        quizMutation,
        violationMutation,
        communicationMutation,
        deleteMutation,
        sendMessageMutation,
        applyPointsMutation,
    } = useStudentMutations(studentId, () => setModalState({ type: 'closed' }));

    // 3. Tab Filters & Selectors
    const {
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
    } = useStudentTabFilters({
        studentDetails,
        selectedSemesterId,
        academicRecords,
        quizPoints,
        user,
        userRole,
        studentProfile,
        subjectToApply,
    });

    // 4. Violation Actions & Duplicate Checking
    const {
        duplicateDialog,
        violationConflictFields,
        setViolationConflictFields,
        handleViolationSubmit,
        handleDuplicateConfirm,
        handleDuplicateCancel,
        handleNotifyParent,
    } = useStudentViolationActions({
        user,
        studentId,
        modalState,
        selectedSemesterId,
        activeSemester,
        studentDetails,
        filteredViolations,
        violationMutation,
        queryClient,
        toast,
    });

    // 5. AI Report Generation
    const {
        aiReport,
        setAiReport,
        isAiReportLoading,
        aiReportError,
        copiedAiReport,
        setCopiedAiReport,
        handleGenerateAiReport,
    } = useStudentAiReport({
        studentDetails,
        selectedSemesterLabel,
        filteredAcademicRecords,
        filteredAttendance,
        attendanceSummary,
        filteredQuizPoints,
        filteredViolations,
        totalViolationPoints,
        modalState,
    });

    // 6. Profile Actions (Avatar, Access Code, Share, Print)
    const {
        copied,
        setCopied,
        photoInputRef,
        isUploadingPhoto,
        handleCopyAccessCode,
        handleGenerateAccessCode,
        handlePhotoChange,
        handleShare,
        handlePrint,
    } = useStudentProfileActions({
        studentId,
        studentDetails,
        studentMutation,
        toast,
    });

    // Form Submission Handlers
    const handleEditStudentSubmit = (data: EditStudentFormValues) => {
        const studentPayload: StudentMutationVars = {
            name: normalizeStudentName(data.name),
            gender: data.gender,
            class_id: data.class_id,
            birth_date: data.birth_date ? data.birth_date : null,
            nis: data.nis?.trim() || null,
            nisn: data.nisn?.trim() || null,
            parent_name: data.parent_name?.trim() || null,
            parent_phone: data.parent_phone?.trim() || null,
        };
        studentMutation.mutate(studentPayload);
    };

    const handleReportSubmit = (data: ReportFormValues) => {
        if (!user || !studentId) return;
        const reportPayload = {
            title: data.title,
            notes: data.notes || '',
            date: data.date,
            category: data.category || null,
            tags: data.tags || null,
            student_id: studentId,
            user_id: user.id,
        };
        if (modalState.type === 'report' && modalState.data?.id) {
            reportMutation.mutate({ operation: 'edit', data: reportPayload, id: modalState.data.id });
        } else {
            reportMutation.mutate({ operation: 'add', data: reportPayload });
        }
    };

    const handleAcademicSubmit = (data: AcademicFormValues) => {
        if (!user || !studentId) return;
        const academicPayload = {
            subject: data.subject,
            assessment_name: data.assessment_name,
            score: data.score,
            notes: data.notes || '',
            student_id: studentId,
            user_id: user.id,
            semester_id: modalState.type === 'academic' && modalState.data?.id
                ? resolveSubmitSemesterId(modalState.data.semester_id, selectedSemesterId, activeSemester?.id)
                : targetSemesterId,
        };
        if (modalState.type === 'academic' && modalState.data?.id) {
            academicMutation.mutate({ operation: 'edit', data: academicPayload, id: modalState.data.id });
        } else {
            academicMutation.mutate({ operation: 'add', data: academicPayload });
        }
    };

    const handleQuizSubmit = (data: QuizFormValues) => {
        if (!user || !studentId) return;
        const quizPayload = {
            quiz_date: data.quiz_date,
            subject: data.subject?.trim() || null,
            quiz_name: data.quiz_name.trim(),
            points: 1,
            max_points: 1,
            category: data.category || null,
            student_id: studentId,
            user_id: user.id,
            semester_id: modalState.type === 'quiz' && modalState.data?.id
                ? resolveSubmitSemesterId(modalState.data.semester_id, selectedSemesterId, activeSemester?.id)
                : targetSemesterId,
        };
        if (modalState.type === 'quiz' && modalState.data?.id) {
            quizMutation.mutate({ operation: 'edit', data: quizPayload, id: String(modalState.data.id) });
        } else {
            quizMutation.mutate({ operation: 'add', data: quizPayload });
        }
    };

    const handleCommunicationSubmit = (data: CommunicationFormValues) => {
        if (modalState.type === 'editCommunication' && modalState.data?.id) {
            communicationMutation.mutate({ operation: 'edit', data: { message: data.message }, id: modalState.data.id });
        }
    };

    const handleDelete = (table: keyof Database['public']['Tables'], id: string | number) => {
        setModalState({
            type: 'confirmDelete',
            title: 'Konfirmasi Hapus',
            message: 'Apakah Anda yakin ingin menghapus data ini secara permanen?',
            onConfirm: () => deleteMutation.mutate({ table, id }),
            isPending: false,
        });
    };

    // Auto mark messages as read
    useEffect(() => {
        const markMessagesAsRead = async () => {
            if (activeTab === 'communication' && studentDetails?.communications) {
                const unreadIds = (studentDetails.communications as { id: string; sender: string; is_read: boolean }[])
                    .filter(m => m.sender === 'parent' && !m.is_read)
                    .map(m => m.id);

                if (unreadIds.length > 0) {
                    const { error } = await supabase.rpc('mark_accessible_communications_read', {
                        p_message_ids: unreadIds,
                    });

                    if (error) {
                        console.error('Failed to mark messages as read:', error);
                    } else {
                        queryClient.invalidateQueries({ queryKey: ['studentComms', studentId] });
                        queryClient.invalidateQueries({ queryKey: ['studentCommsUnreadCount', studentId] });
                    }
                }
            }
        };
        markMessagesAsRead();
    }, [activeTab, studentDetails?.communications, studentId, queryClient]);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [studentDetails?.communications]);

    // Apply Points
    const [prevModalType, setPrevModalType] = useState(modalState.type);
    if (modalState.type !== prevModalType) {
        setPrevModalType(modalState.type);
        if (modalState.type === 'applyPoints') {
            const firstSubject = uniqueSubjectsForGrades.length > 0 ? uniqueSubjectsForGrades[0] : '';
            setSubjectToApply(firstSubject || '');
        } else {
            setSubjectToApply('');
        }
    }

    const { triggerConfetti } = useConfetti();

    const handleApplyPointsSubmit = () => {
        if (!subjectToApply) {
            toast.error('Silakan pilih mata pelajaran.');
            return;
        }
        applyPointsMutation.mutate({ subject: subjectToApply, semesterId: selectedSemesterId }, {
            onSuccess: () => {
                triggerConfetti();
            },
        });
    };

    const isLoading = isProfileLoading;
    const isError = !!profileError;
    const queryError = profileError;

    return {
        studentId,
        navigate,
        user,
        isOnline,
        toast,
        queryClient,
        modalState,
        setModalState,
        activeTab,
        setActiveTab,
        copied,
        setCopied,
        aiReport,
        setAiReport,
        isAiReportLoading,
        aiReportError,
        copiedAiReport,
        setCopiedAiReport,
        photoInputRef,
        isUploadingPhoto,
        messagesEndRef,
        tabsScrollRef,
        tabScrollState,
        subjectToApply,
        setSubjectToApply,
        kkm,
        semesters,
        selectedSemesterId,
        setSelectedSemesterId,
        selectedSemester,
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
        userRole,
    };
};