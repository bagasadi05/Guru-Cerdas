import React, { Suspense, lazy, useState, useMemo, useEffect, useRef } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import { AttendanceStatus } from '../../types';
import { useToast } from '../../hooks/useToast';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { Select } from '../ui/Select';
import { ArrowLeftIcon, CheckCircleIcon, XCircleIcon, AlertCircleIcon, FileTextIcon, UserCircleIcon, BrainCircuitIcon, CameraIcon, ShieldAlertIcon, PlusIcon, BookOpenIcon, SparklesIcon, MessageSquareIcon, KeyRoundIcon, CopyIcon, CopyCheckIcon, Share2Icon, PrinterIcon } from '../Icons';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/Tabs';
import { Modal } from '../ui/Modal';
import { supabase } from '../../services/supabase';
import { useAuth } from '../../hooks/useAuth';
import { Database } from '../../services/database.types';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useOfflineStatus } from '../../hooks/useOfflineStatus';
import { optimizeImage } from '../utils/image';
import { violationList } from '../../services/violations.data';
import { ChildDevelopmentData } from '../../services/childDevelopmentAnalysis';
import FloatingActionButton from '../ui/FloatingActionButton';
import { Breadcrumb } from '../ui/Breadcrumb';

import { StatCard } from './student/StatCard';
import { Trophy } from 'lucide-react';

import { ModalState, StudentMutationVars, AcademicRecordRow, AttendanceRow, ViolationRow, QuizPointRow, CommunicationRow, ReportRow, StudentWithClass } from './student/types';
import { EditStudentFormValues, ReportFormValues, AcademicFormValues, QuizFormValues, ViolationFormValues, CommunicationFormValues } from './student/schemas';
import { EditStudentForm } from './student/forms/EditStudentForm';
import { ReportForm } from './student/forms/ReportForm';
import { AcademicForm } from './student/forms/AcademicForm';
import { QuizForm } from './student/forms/QuizForm';
import { ViolationForm } from './student/forms/ViolationForm';
import { CommunicationForm } from './student/forms/CommunicationForm';
import { useStudentMutations } from './student/hooks/useStudentMutations';
import { useConfetti } from '../../hooks/useConfetti';
import { StudentDetailPageSkeleton } from '../skeletons/PageSkeletons';
import { getStudentAvatar } from '../../utils/avatarUtils';
import { useUserSettings } from '../../hooks/useUserSettings';
import { useSemester } from '../../contexts/SemesterContext';
import { SemesterSelector } from '../ui/SemesterSelector';
import { Skeleton } from '../ui/Skeleton';
import { SeverityLevel } from './student/violationMeta';
import { getSemesterDisplayName } from '../../utils/semesterUtils';
import {
    buildStudentCommunicationSignals,
    extractStoragePathFromPublicUrl,
    getAvailableQuizPoints,
    getLatestRecordForSubject,
    resolveSubmitSemesterId,
} from './student/studentDetailHelpers';
import { writeAuditLog } from '../../services/auditTrail';

const GradesTab = lazy(() => import('./student/GradesTab').then((module) => ({ default: module.GradesTab })));
const ActivityTab = lazy(() => import('./student/ActivityTab').then((module) => ({ default: module.ActivityTab })));
const ViolationsTab = lazy(() => import('./student/ViolationsTab').then((module) => ({ default: module.ViolationsTab })));
const ReportsTab = lazy(() => import('./student/ReportsTab').then((module) => ({ default: module.ReportsTab })));
const CommunicationTab = lazy(() => import('./student/CommunicationTab').then((module) => ({ default: module.CommunicationTab })));
const ExtracurricularTab = lazy(() => import('./student/ExtracurricularTab').then((module) => ({ default: module.ExtracurricularTab })));
const ChildDevelopmentAnalysisTab = lazy(() => import('./ChildDevelopmentAnalysisTab').then((module) => ({ default: module.ChildDevelopmentAnalysisTab })));

const StudentDetailTabFallback = () => (
    <div className="space-y-4 p-4 sm:p-6">
        <Skeleton className="h-6 w-48" />
        <Skeleton className="h-24 w-full rounded-2xl" />
        <Skeleton className="h-24 w-full rounded-2xl" />
        <Skeleton className="h-64 w-full rounded-2xl" />
    </div>
);

const generateAccessCode = (): string => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // No 0, O, 1, I
    let result = '';
    for (let i = 0; i < 6; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
};

const getViolationSeverityFromCategory = (category?: string): SeverityLevel | null => {
    const normalized = category?.toLowerCase();
    if (normalized === 'ringan' || normalized === 'sedang' || normalized === 'berat') {
        return normalized;
    }
    return null;
};

const StudentDetailPage = () => {
    const { studentId } = useParams<{ studentId: string }>();
    const navigate = useNavigate();
    const location = useLocation();
    const { user } = useAuth();
    const isOnline = useOfflineStatus();
    const toast = useToast();
    const queryClient = useQueryClient();
    const [modalState, setModalState] = useState<ModalState>({ type: 'closed' });
    const [activeTab, setActiveTab] = useState('grades');
    const [copied, setCopied] = useState(false);
    const photoInputRef = useRef<HTMLInputElement>(null);
    const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const tabsScrollRef = useRef<HTMLDivElement>(null);
    const [tabScrollState, setTabScrollState] = useState({ left: false, right: false });
    const [subjectToApply, setSubjectToApply] = useState('');
    const { kkm } = useUserSettings();
    const { activeSemester, semesters } = useSemester();

    // Initialize with activeSemester ID, will update when data loads
    const [selectedSemesterId, setSelectedSemesterId] = useState<string | null>(() => activeSemester?.id || null);
    const targetSemesterId = resolveSubmitSemesterId(null, selectedSemesterId, activeSemester?.id);
    const selectedSemester = selectedSemesterId ? semesters.find(semester => semester.id === selectedSemesterId) : null;
    const selectedSemesterLabel = selectedSemester
        ? `${selectedSemester.academic_years?.name || 'Tahun Ajaran'} - ${getSemesterDisplayName(selectedSemester.name, selectedSemester.start_date, 'full')}`
        : 'Semua Semester';

    // Initialize selectedSemesterId when activeSemester loads (if not already set)
    useEffect(() => {
        if (activeSemester && !selectedSemesterId) {
            setSelectedSemesterId(activeSemester.id);
        }
    }, [activeSemester, selectedSemesterId]);

    useEffect(() => {
        if (location.state?.openTab) {
            setActiveTab(location.state.openTab);
        }
    }, [location.state]);

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

    // 1. Core Profile Query (Fastest, High Priority)
    const { data: studentProfile, isLoading: isProfileLoading, error: profileError } = useQuery({
        queryKey: ['studentProfile', studentId],
        queryFn: async () => {
            if (!studentId || !user) throw new Error("User or Student ID not found");
            const studentRes = await supabase
                .from('students')
                .select('id, name, user_id, class_id, gender, avatar_url, access_code, parent_name, parent_phone, created_at, deleted_at')
                .eq('id', studentId)
                .is('deleted_at', null)
                .single();

            if (studentRes.error) throw studentRes.error;

            const [classInfoRes, classesRes] = await Promise.all([
                supabase
                    .from('classes')
                    .select('id, name, user_id, created_at, deleted_at')
                    .eq('id', studentRes.data.class_id)
                    .is('deleted_at', null)
                    .single(),
                supabase
                    .from('classes')
                    .select('id, name, user_id, created_at, deleted_at')
                    .eq('user_id', user.id)
                    .is('deleted_at', null)
            ]);

            if (classInfoRes.error) throw classInfoRes.error;
            if (classesRes.error) throw classesRes.error;

            const studentData = studentRes.data as unknown as StudentWithClass;
            const classRows = (classesRes.data || []) as unknown as Database['public']['Tables']['classes']['Row'][];
            const classInfo = classInfoRes.data as Database['public']['Tables']['classes']['Row'];
            const studentWithClass = { ...studentData, classes: classInfo ? { id: classInfo.id, name: classInfo.name } : null };

            return { student: studentWithClass, classes: classRows };
        },
        enabled: !!studentId && !!user,
    });

    // 2. Stats Query (Attendance & Violations) - Needed for top cards
    const { data: statsData } = useQuery({
        queryKey: ['studentStats', studentId],
        queryFn: async () => {
            if (!studentId || !user) return { attendanceRecords: [], violations: [] };
            const [attendanceRes, violationsRes] = await Promise.all([
                supabase.from('attendance').select('id, student_id, user_id, date, status, notes, semester_id, created_at').eq('student_id', studentId).is('deleted_at', null),
                supabase.from('violations').select('id, student_id, user_id, date, description, points, type, severity, semester_id, follow_up_status, follow_up_notes, evidence_url, parent_notified, parent_notified_at, created_at, deleted_at').eq('student_id', studentId).is('deleted_at', null)
            ]);
            return {
                attendanceRecords: (attendanceRes.data || []) as AttendanceRow[],
                violations: (violationsRes.data || []) as ViolationRow[]
            };
        },
        enabled: !!studentId && !!user
    });

    // 3. Tab-Specific Queries (Lazy Loaded)

    // Grades & Development Tab
    const shouldLoadGrades = activeTab === 'grades' || activeTab === 'development';
    const { data: academicRecords = [] } = useQuery({
        queryKey: ['studentGrades', studentId],
        queryFn: async () => {
            const { data, error } = await supabase.from('academic_records').select('id, student_id, user_id, subject, score, assessment_name, notes, semester_id, created_at, version').eq('student_id', studentId!).is('deleted_at', null);
            if (error) throw error;
            return (data || []) as AcademicRecordRow[];
        },
        enabled: !!studentId && !!user && shouldLoadGrades,
        staleTime: 5 * 60 * 1000
    });

    // Activity (Quiz) & Development Tab
    const shouldLoadActivity = activeTab === 'activity' || activeTab === 'development';
    const { data: quizPoints = [] } = useQuery({
        queryKey: ['studentQuizzes', studentId],
        queryFn: async () => {
            const { data, error } = await supabase.from('quiz_points').select('id, student_id, user_id, quiz_date, quiz_name, subject, points, max_points, category, is_used, used_at, used_for_subject, semester_id, created_at').eq('student_id', studentId!).is('deleted_at', null);
            if (error) throw error;
            return (data || []) as unknown as QuizPointRow[];
        },
        enabled: !!studentId && !!user && shouldLoadActivity
    });

    // Reports Tab
    const { data: reports = [] } = useQuery({
        queryKey: ['studentReports', studentId],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('reports')
                .select('id, user_id, student_id, title, notes, date, category, attachment_url, tags, created_at')
                .eq('student_id', studentId!)
                .order('created_at', { ascending: false });
            if (error) throw error;
            return (data || []) as unknown as ReportRow[];
        },
        enabled: !!studentId && !!user && activeTab === 'reports'
    });

    // Extracurricular Tab
    const { data: extracurricularData } = useQuery({
        queryKey: ['studentExtra', studentId],
        queryFn: async () => {
            const [extraRes, attRes, gradesRes] = await Promise.all([
                supabase
                    .from('student_extracurriculars')
                    .select('id, user_id, student_id, extracurricular_id, extracurricular_student_id, semester_id, joined_at, status, created_at, extracurriculars(id, user_id, name, category, description, schedule_day, schedule_time, coach_name, max_participants, is_active, created_at, updated_at)')
                    .eq('student_id', studentId!),
                supabase
                    .from('extracurricular_attendance')
                    .select('id, user_id, student_id, extracurricular_student_id, extracurricular_id, semester_id, date, status, notes, created_at')
                    .eq('student_id', studentId!),
                supabase
                    .from('extracurricular_grades')
                    .select('id, user_id, student_id, extracurricular_student_id, extracurricular_id, semester_id, grade, score, description, notes, created_at, updated_at')
                    .eq('student_id', studentId!)
            ]);
            return {
                studentExtracurriculars: extraRes.data || [],
                extracurricularAttendance: attRes.data || [],
                extracurricularGrades: gradesRes.data || []
            };
        },
        enabled: !!studentId && !!user && activeTab === 'extracurricular'
    });

    const { data: unreadMessagesCount = 0 } = useQuery({
        queryKey: ['studentCommsUnreadCount', studentId],
        queryFn: async () => {
            const { count, error } = await supabase
                .from('communications')
                .select('id', { count: 'exact', head: true })
                .eq('student_id', studentId!)
                .eq('sender', 'parent')
                .eq('is_read', false);
            if (error) throw error;
            return count || 0;
        },
        enabled: !!studentId && !!user,
        staleTime: 30 * 1000
    });

    // Communication Tab
    const { data: communications = [] } = useQuery({
        queryKey: ['studentComms', studentId],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('communications')
                .select('id, user_id, teacher_id, student_id, sender, message, is_read, parent_id, attachment_url, attachment_type, attachment_name, created_at')
                .eq('student_id', studentId!)
                .order('created_at', { ascending: true });
            if (error) throw error;
            const records = (data || []) as unknown as CommunicationRow[];
            const teacherIds = [...new Set(records
                .filter((record) => record.sender === 'teacher' && record.teacher_id)
                .map((record) => record.teacher_id))];

            if (teacherIds.length === 0) {
                return records;
            }

            const { data: teacherRoles } = await supabase
                .from('user_roles')
                .select('user_id, full_name')
                .in('user_id', teacherIds);

            const teacherNameMap = new Map(
                (teacherRoles || []).map((role) => [role.user_id, role.full_name])
            );

            return records.map((record) => ({
                ...record,
                teacher_name: record.sender === 'teacher'
                    ? teacherNameMap.get(record.teacher_id) || null
                    : null,
            }));
        },
        enabled: !!studentId && !!user && activeTab === 'communication'
    });

    // Composite Data Object to minimize refactoring impact
    const studentDetails = useMemo(() => {
        if (!studentProfile) return null;
        return {
            student: studentProfile.student,
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

    const isLoading = isProfileLoading; // Only block UI for profile
    const isError = !!profileError;
    const queryError = profileError;

    // Mutations setup using custom hook
    const {
        studentMutation,
        reportMutation,
        academicMutation,
        quizMutation,
        violationMutation,
        communicationMutation,
        deleteMutation,
        sendMessageMutation,
        applyPointsMutation
    } = useStudentMutations(studentId, () => setModalState({ type: 'closed' }));

    // Handlers
    const handleEditStudentSubmit = (data: EditStudentFormValues) => {
        const studentPayload: StudentMutationVars = {
            name: data.name,
            gender: data.gender,
            class_id: data.class_id,
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
            subject: data.subject,
            quiz_name: data.quiz_name,
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

    const handleViolationSubmit = async (data: ViolationFormValues & { evidence_file?: File }) => {
        if (!user || !studentId) return;
        const selectedViolation = violationList.find(v => v.description === data.description);
        const existingViolation = modalState.type === 'violation' ? modalState.data : null;
        let evidenceUrl = existingViolation?.evidence_url || null;

        if (data.evidence_file) {
            try {
                const fileExt = data.evidence_file.name.split('.').pop() || 'jpg';
                const filePath = `violation_evidence/${studentId}-${Date.now()}.${fileExt}`;
                const { error: uploadError } = await supabase.storage.from('student_assets').upload(filePath, data.evidence_file, { upsert: true });
                if (uploadError) throw uploadError;
                const oldEvidencePath = extractStoragePathFromPublicUrl(existingViolation?.evidence_url, 'student_assets');
                if (oldEvidencePath) {
                    await supabase.storage.from('student_assets').remove([oldEvidencePath]);
                }
                const { data: publicUrlData } = supabase.storage.from('student_assets').getPublicUrl(filePath);
                evidenceUrl = publicUrlData.publicUrl;
            } catch (error: unknown) {
                toast.error(`Gagal unggah bukti: ${error instanceof Error ? error.message : String(error)}`);
                return;
            }
        }

        const violationPayload = {
            date: data.date,
            description: data.description,
            points: selectedViolation?.points ?? existingViolation?.points ?? 0,
            type: existingViolation?.type || 'general',
            severity: data.severity || getViolationSeverityFromCategory(selectedViolation?.category) || existingViolation?.severity || null,
            follow_up_status: existingViolation?.follow_up_status || 'pending',
            follow_up_notes: data.follow_up_notes || null,
            evidence_url: evidenceUrl,
            student_id: studentId,
            user_id: user.id,
            semester_id: resolveSubmitSemesterId(existingViolation?.semester_id, selectedSemesterId, activeSemester?.id),
        };
        if (modalState.type === 'violation' && modalState.data?.id) {
            violationMutation.mutate({ operation: 'edit', data: violationPayload, id: modalState.data.id });
        } else {
            violationMutation.mutate({ operation: 'add', data: violationPayload });
        }
    };

    const handleCommunicationSubmit = (data: CommunicationFormValues) => {
        if (modalState.type === 'editCommunication' && modalState.data?.id) {
            communicationMutation.mutate({ operation: 'edit', data: { message: data.message }, id: modalState.data.id });
        }
    };

    const handleDelete = (table: keyof Database['public']['Tables'], id: string | number) => {
        setModalState({ type: 'confirmDelete', title: 'Konfirmasi Hapus', message: 'Apakah Anda yakin ingin menghapus data ini secara permanen?', onConfirm: () => deleteMutation.mutate({ table, id }), isPending: false });
    };

    // Filter attendance by selected semester
    const filteredAttendance = useMemo(() => {
        if (!studentDetails?.attendanceRecords) return [];
        if (!selectedSemesterId) return studentDetails.attendanceRecords;
        return studentDetails.attendanceRecords.filter(r => r.semester_id === selectedSemesterId);
    }, [studentDetails?.attendanceRecords, selectedSemesterId]);

    const attendanceSummary = useMemo(() => {
        const summary = { Hadir: 0, Izin: 0, Sakit: 0, Alpha: 0, Libur: 0 };
        filteredAttendance.forEach(rec => {
            const status = rec.status as AttendanceStatus;
            if (status in summary) {
                summary[status as keyof typeof summary]++;
            }
        });
        return summary;
    }, [filteredAttendance]);

    const filteredViolations = useMemo(() => {
        if (!studentDetails?.violations) return [];
        if (!selectedSemesterId) return studentDetails.violations;
        return studentDetails.violations.filter(r => r.semester_id === selectedSemesterId);
    }, [studentDetails, selectedSemesterId]);

    // Filter academic records by selected semester
    const filteredAcademicRecords = useMemo(() => {
        if (!selectedSemesterId) return academicRecords;
        return academicRecords.filter(r => r.semester_id === selectedSemesterId);
    }, [academicRecords, selectedSemesterId]);

    // Filter quiz points by selected semester
    const filteredQuizPoints = useMemo(() => {
        if (!selectedSemesterId) return quizPoints;
        return quizPoints.filter(r => r.semester_id === selectedSemesterId);
    }, [quizPoints, selectedSemesterId]);
    const availableFilteredQuizPoints = useMemo(() => getAvailableQuizPoints(filteredQuizPoints), [filteredQuizPoints]);

    // Note: Reports table has no semester_id column, so we show all reports

    const filteredExtracurriculars = useMemo(() => {
        if (!studentDetails?.studentExtracurriculars) return [];
        if (!selectedSemesterId) return studentDetails.studentExtracurriculars;
        return studentDetails.studentExtracurriculars.filter(r => r.semester_id === selectedSemesterId);
    }, [studentDetails, selectedSemesterId]);

    const filteredExAttendance = useMemo(() => {
        if (!studentDetails?.extracurricularAttendance) return [];
        if (!selectedSemesterId) return studentDetails.extracurricularAttendance;
        return studentDetails.extracurricularAttendance.filter(r => r.semester_id === selectedSemesterId);
    }, [studentDetails, selectedSemesterId]);

    const filteredExGrades = useMemo(() => {
        if (!studentDetails?.extracurricularGrades) return [];
        if (!selectedSemesterId) return studentDetails.extracurricularGrades;
        return studentDetails.extracurricularGrades.filter(r => r.semester_id === selectedSemesterId);
    }, [studentDetails, selectedSemesterId]);

    const totalViolationPoints = useMemo(() => filteredViolations.reduce((sum, v) => sum + v.points, 0) || 0, [filteredViolations]);
    const communicationSignals = useMemo(() => buildStudentCommunicationSignals({
        studentName: studentDetails?.student.name || 'Siswa',
        academicRecords: filteredAcademicRecords,
        attendanceRecords: filteredAttendance,
        violations: filteredViolations,
    }), [studentDetails?.student.name, filteredAcademicRecords, filteredAttendance, filteredViolations]);
    const handleCopyAccessCode = () => {
        if (!studentDetails?.student.access_code) return;
        navigator.clipboard.writeText(studentDetails.student.access_code);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    // Handler for updating violation follow-up status
    const handleUpdateViolationFollowUp = async (violationId: string, status: 'pending' | 'in_progress' | 'resolved', notes?: string) => {
        try {
            if (!user) return;
            const { data: updated, error } = await supabase.rpc('update_accessible_violation_follow_up', {
                p_violation_id: violationId,
                p_status: status,
                p_notes: notes ?? null,
            });

            if (error) throw error;
            if (!updated) throw new Error('Data pelanggaran tidak dapat diperbarui.');

            queryClient.invalidateQueries({ queryKey: ['studentStats', studentId] });
            queryClient.invalidateQueries({ queryKey: ['studentCommsUnreadCount', studentId] });
            await writeAuditLog({
                userId: user.id,
                userEmail: user.email,
                tableName: 'violations',
                recordId: violationId,
                action: 'UPDATE',
                oldData: { follow_up_status: 'unknown' },
                newData: { follow_up_status: status, follow_up_notes: notes || null },
            });
            toast.success(`Status tindak lanjut berhasil diubah menjadi "${status === 'pending' ? 'Belum Ditindak' : status === 'in_progress' ? 'Sedang Diproses' : 'Sudah Selesai'}"`);
        } catch (error: unknown) {
            toast.error(`Gagal mengubah status: ${error instanceof Error ? error.message : String(error)}`);
        }
    };

    // Handler for notifying parent about a violation
    const handleNotifyParent = async (violation: ViolationRow) => {
        try {
            if (!studentDetails?.student || !user) return;
            const notifiedAt = new Date().toISOString();

            // Create a communication message about the violation
            const message = `[NOTIFIKASI PELANGGARAN]\n\nYth. Orang Tua/Wali ${studentDetails.student.name},\n\nKami informasikan bahwa anak Anda telah melakukan pelanggaran:\n\n📋 Jenis: ${violation.description}\n📅 Tanggal: ${new Date(violation.date).toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}\n⚠️ Poin: ${violation.points}\n\nMohon perhatian dan kerjasamanya untuk membimbing anak di rumah.\n\nTerima kasih.`;

            // Insert communication
            const { error: commError } = await supabase
                .from('communications')
                .insert({
                    student_id: studentId!,
                    teacher_id: user.id,
                    user_id: user.id,
                    message,
                    sender: 'teacher',
                    is_read: false
                });

            if (commError) throw commError;

            // Update violation as notified
            const { data: updated, error: updateError } = await supabase.rpc('update_accessible_violation_follow_up', {
                p_violation_id: violation.id,
                p_parent_notified: true,
                p_parent_notified_at: notifiedAt,
            });

            if (updateError) throw updateError;
            if (!updated) throw new Error('Status notifikasi pelanggaran tidak dapat diperbarui.');

            queryClient.invalidateQueries({ queryKey: ['studentStats', studentId] });
            queryClient.invalidateQueries({ queryKey: ['studentComms', studentId] });
            queryClient.invalidateQueries({ queryKey: ['studentCommsUnreadCount', studentId] });
            await writeAuditLog({
                userId: user.id,
                userEmail: user.email,
                tableName: 'violations',
                recordId: violation.id,
                action: 'UPDATE',
                oldData: { parent_notified: violation.parent_notified || false },
                newData: { parent_notified: true, parent_notified_at: notifiedAt },
            });
            toast.success('Notifikasi pelanggaran berhasil dikirim ke orang tua!');
        } catch (error: unknown) {
            toast.error(`Gagal mengirim notifikasi: ${error instanceof Error ? error.message : String(error)}`);
        }
    };

    const handleGenerateAccessCode = async () => {
        if (!studentId || studentMutation.isPending) return;
        const newCode = generateAccessCode();
        studentMutation.mutate({ access_code: newCode });
    };

    const handlePhotoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!e.target.files || e.target.files.length === 0 || !studentId) return;
        setIsUploadingPhoto(true);
        const file = e.target.files[0];
        try {
            const optimizedBlob = await optimizeImage(file, { maxWidth: 300, quality: 0.8 });
            const filePath = `student_avatars/${studentId}-${new Date().getTime()}.jpg`;
            const { error: uploadError } = await supabase.storage.from('student_assets').upload(filePath, optimizedBlob, { upsert: true });
            if (uploadError) throw uploadError;

            const { data: publicUrlData } = supabase.storage.from('student_assets').getPublicUrl(filePath);
            studentMutation.mutate({ avatar_url: publicUrlData.publicUrl });
        } catch (error: unknown) {
            toast.error(`Gagal unggah foto: ${error instanceof Error ? error.message : String(error)}`);
        } finally {
            setIsUploadingPhoto(false);
        }
    };

    useEffect(() => {
        const markMessagesAsRead = async () => {
            if (activeTab === 'communication' && studentDetails?.communications) {
                const unreadIds = studentDetails.communications
                    .filter(m => m.sender === 'parent' && !m.is_read)
                    .map(m => m.id);

                if (unreadIds.length > 0) {
                    const { error } = await supabase.rpc('mark_accessible_communications_read', {
                        p_message_ids: unreadIds,
                    });

                    if (error) {
                        console.error("Failed to mark messages as read:", error);
                    } else {
                        // Invalidate to refetch and update UI
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

    const handleShare = () => {
        if (navigator.share && studentDetails?.student.access_code) {
            navigator.share({
                title: `Akses Portal Siswa - ${studentDetails.student.name}`,
                text: `Gunakan kode akses ${studentDetails.student.access_code} untuk melihat perkembangan ${studentDetails.student.name} di portal siswa.`,
                url: window.location.origin,
            })
                .then(() => console.log('Successful share'))
                .catch((error) => console.log('Error sharing', error));
        } else {
            toast.info("Fitur berbagi tidak didukung di browser ini. Silakan salin kodenya secara manual.");
        }
    };

    const handlePrint = () => {
        window.print();
    };

    const uniqueSubjectsForGrades = useMemo((): (string | null)[] => {
        const records = filteredAcademicRecords as AcademicRecordRow[];
        const subjects = records.map(r => r.subject);
        return [...new Set(subjects)];
    }, [filteredAcademicRecords]);

    const currentRecordForSubject = useMemo(() => {
        if (!subjectToApply) return null;
        return getLatestRecordForSubject(filteredAcademicRecords, subjectToApply);
    }, [subjectToApply, filteredAcademicRecords]);

    useEffect(() => {
        if (modalState.type === 'applyPoints') {
            const firstSubject = uniqueSubjectsForGrades.length > 0 ? uniqueSubjectsForGrades[0] : '';
            setSubjectToApply(firstSubject || '');
        } else {
            setSubjectToApply('');
        }
    }, [modalState.type, uniqueSubjectsForGrades]);

    const { triggerConfetti } = useConfetti();

    const handleApplyPointsSubmit = () => {
        if (!subjectToApply) {
            toast.error("Silakan pilih mata pelajaran.");
            return;
        }
        applyPointsMutation.mutate({ subject: subjectToApply, semesterId: selectedSemesterId }, {
            onSuccess: () => {
                triggerConfetti();
            }
        });
    };

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
                    <Button onClick={() => navigate('/students')} variant="outline" className="w-full">
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
                    <Button onClick={() => navigate('/students')} variant="outline" className="w-full">
                        <ArrowLeftIcon className="w-4 h-4 mr-2" />
                        Kembali ke Daftar Siswa
                    </Button>
                </div>
            </div>
        );
    }

    const student = studentProfile.student;
    const classes = studentProfile.classes;
    const canManageStudentProfile = student.user_id === user?.id;


    return (
        <div className="space-y-8 p-4 md:p-6 pb-8 lg:pb-6 animate-fade-in-up bg-gray-50 dark:bg-gray-900 min-h-screen max-w-7xl mx-auto">
            <div className="no-print">
                {/* Breadcrumb Navigation */}
                <Breadcrumb
                    items={[
                        { label: 'Beranda', path: '/dashboard' },
                        { label: 'Siswa', path: '/students' },
                        { label: student.name }
                    ]}
                    className="mb-4"
                />

                <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div className="flex items-center gap-4">
                        <Button variant="outline" size="icon" onClick={() => navigate(-1)} aria-label="Kembali" className="h-10 w-10 bg-white/50 dark:bg-white/10 border-gray-200 dark:border-white/20 hover:bg-white/80 dark:hover:bg-white/20 text-gray-900 dark:text-white">
                            <ArrowLeftIcon className="w-5 h-5" />
                        </Button>
                        <div className="relative">
                            <img src={getStudentAvatar(student.avatar_url, student.gender, student.id)} alt={student.name} className="w-16 h-16 sm:w-20 sm:h-20 rounded-full object-cover border-4 border-white shadow-lg dark:border-white/10" />
                            <input type="file" ref={photoInputRef} onChange={handlePhotoChange} accept="image/png, image/jpeg" className="hidden" disabled={isUploadingPhoto || !isOnline} />
                            {canManageStudentProfile ? (
                                <button onClick={() => photoInputRef.current?.click()} disabled={isUploadingPhoto || !isOnline} className="absolute -bottom-1 -right-1 p-2 bg-purple-600 text-white rounded-full shadow-md hover:scale-110 transition-transform">
                                    <CameraIcon className="w-4 h-4" />
                                </button>
                            ) : null}
                        </div>
                        <div>
                            <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-gray-900 dark:text-white">{student.name}</h1>
                            <p className="text-sm sm:text-base text-gray-500 dark:text-gray-400">Kelas {student.classes?.name || 'N/A'}</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2 self-start md:self-center flex-wrap">
                        {canManageStudentProfile ? (
                            <>
                                <Button
                                    variant="outline"
                                    size="icon"
                                    onClick={() => setModalState({ type: 'editStudent', data: student })}
                                    disabled={!isOnline}
                                    className="h-10 w-10 bg-white/50 dark:bg-white/10 border-gray-200 dark:border-white/20 hover:bg-white/80 dark:hover:bg-white/20 text-gray-900 dark:text-white sm:hidden"
                                    aria-label="Edit Profil"
                                >
                                    <UserCircleIcon className="w-4 h-4" />
                                </Button>
                                <Button
                                    variant="outline"
                                    onClick={() => setModalState({ type: 'editStudent', data: student })}
                                    disabled={!isOnline}
                                    className="hidden sm:inline-flex h-10 px-3 sm:px-4 bg-white/50 dark:bg-white/10 border-gray-200 dark:border-white/20 hover:bg-white/80 dark:hover:bg-white/20 text-gray-900 dark:text-white"
                                >
                                    <UserCircleIcon className="w-4 h-4 mr-2" />Edit Profil
                                </Button>
                            </>
                        ) : null}

                        <Link to={`/cetak-rapot/${studentId}`} className="sm:hidden">
                            <Button
                                variant="outline"
                                size="icon"
                                className="h-10 w-10 bg-white/50 dark:bg-white/10 border-gray-200 dark:border-white/20 hover:bg-white/80 dark:hover:bg-white/20 text-gray-900 dark:text-white"
                                aria-label="Cetak Rapor"
                            >
                                <FileTextIcon className="w-4 h-4" />
                            </Button>
                        </Link>
                        <Link to={`/cetak-rapot/${studentId}`} className="hidden sm:inline-flex">
                            <Button variant="outline" className="h-10 px-3 sm:px-4 bg-white/50 dark:bg-white/10 border-gray-200 dark:border-white/20 hover:bg-white/80 dark:hover:bg-white/20 text-gray-900 dark:text-white">
                                <FileTextIcon className="w-4 h-4 mr-2" />Cetak Rapor
                            </Button>
                        </Link>

                        {canManageStudentProfile ? (
                            <>
                                <Button
                                    onClick={() => setModalState({ type: 'portalAccess' })}
                                    size="icon"
                                    className="h-10 w-10 sm:hidden bg-gradient-to-r from-green-600 to-emerald-600 text-white shadow-lg shadow-emerald-500/20"
                                    aria-label="Akses Portal"
                                >
                                    <KeyRoundIcon className="w-4 h-4" />
                                </Button>
                                <Button
                                    onClick={() => setModalState({ type: 'portalAccess' })}
                                    className="hidden sm:inline-flex h-10 px-3 sm:px-4 bg-gradient-to-r from-green-600 to-emerald-600 text-white shadow-lg shadow-emerald-500/20"
                                >
                                    <KeyRoundIcon className="w-4 h-4 mr-2" />Akses Portal
                                </Button>
                            </>
                        ) : null}
                    </div>
                </header>

                {/* Semester Selector */}
                <div className="mt-6 mb-4 flex flex-wrap items-center justify-between gap-3 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md rounded-xl p-3 border border-gray-200 dark:border-white/10 animate-fade-in-up">
                    <span className="text-sm font-medium text-slate-600 dark:text-slate-400">Filter Semester:</span>
                    <SemesterSelector
                        value={selectedSemesterId || 'all'}
                        onChange={(semId) => setSelectedSemesterId(semId === 'all' ? null : semId)}
                        size="sm"
                        includeAllOption={true}
                        className="min-w-[200px]"
                    />
                    <div className="w-full sm:w-auto text-xs text-slate-500 dark:text-slate-400">
                        Sedang melihat: <span className="font-semibold text-slate-800 dark:text-slate-200">{selectedSemesterLabel}</span>
                    </div>
                </div>



                <section className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4 mt-6">
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
                        <div className="border-b border-gray-200 dark:border-white/10 sticky top-0 z-20 bg-white dark:bg-gray-900">
                            <div className="relative">
                                <div className={`absolute left-0 top-0 bottom-0 w-8 bg-gradient-to-r from-white dark:from-gray-900 to-transparent pointer-events-none z-10 transition-opacity ${tabScrollState.left ? 'opacity-100' : 'opacity-0'}`} />
                                <div className={`absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-l from-white dark:from-gray-900 to-transparent pointer-events-none z-10 transition-opacity ${tabScrollState.right ? 'opacity-100' : 'opacity-0'}`} />
                                <div ref={tabsScrollRef} className="flex justify-start sm:justify-center px-4 sm:px-6 py-2 overflow-x-auto scrollbar-hide">
                                    <TabsList className="bg-gray-100 dark:bg-black/20">
                                        <TabsTrigger value="grades" className="h-11">Nilai</TabsTrigger>
                                        <TabsTrigger value="activity" className="h-11">Keaktifan</TabsTrigger>
                                        <TabsTrigger value="violations" className="h-11">Pelanggaran</TabsTrigger>
                                        <TabsTrigger value="extracurricular" className="h-11">
                                            <Trophy className="w-4 h-4 mr-1.5 inline" />
                                            Ekstrakurikuler
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
                                                    <span className="absolute -top-1.5 -right-4 min-w-[18px] h-[18px] px-1 bg-red-500 rounded-full text-[10px] text-white flex items-center justify-center font-bold">
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
                                    <GradesTab records={filteredAcademicRecords} onAdd={() => setModalState({ type: 'academic', data: null })} onEdit={(r) => setModalState({ type: 'academic', data: r })} onDelete={(id) => handleDelete('academic_records', id)} isOnline={isOnline} currentUserId={user?.id} kkm={kkm} semesterLabel={selectedSemesterLabel} />
                                </Suspense>
                            )}
                        </TabsContent>
                        <TabsContent value="activity" className="p-0">
                            {activeTab === 'activity' && (
                                <Suspense fallback={<StudentDetailTabFallback />}>
                                    <ActivityTab quizPoints={filteredQuizPoints} onAdd={() => setModalState({ type: 'quiz', data: null })} onEdit={(r) => setModalState({ type: 'quiz', data: r })} onDelete={(id) => handleDelete('quiz_points', id)} onApplyPoints={() => setModalState({ type: 'applyPoints' })} isOnline={isOnline} currentUserId={user?.id} semesterLabel={selectedSemesterLabel} />
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
                                        onUpdateFollowUp={handleUpdateViolationFollowUp}
                                        onNotifyParent={handleNotifyParent}
                                        studentName={student.name}
                                        className={student.classes?.name || '-'}
                                        isOnline={isOnline}
                                        currentUserId={user?.id}
                                        semesterLabel={selectedSemesterLabel}
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
                        <TabsContent value="reports" className="p-0">
                            {activeTab === 'reports' && (
                                <Suspense fallback={<StudentDetailTabFallback />}>
                                    <ReportsTab reports={reports} onAdd={() => setModalState({ type: 'report', data: null })} onEdit={(r) => setModalState({ type: 'report', data: r })} onDelete={(id) => handleDelete('reports', id)} isOnline={isOnline} currentUserId={user?.id} canAdd={canManageStudentProfile} />
                                </Suspense>
                            )}
                        </TabsContent>
                        <TabsContent value="development" className="p-4 sm:p-6">
                            {activeTab === 'development' && (
                                <Suspense fallback={<StudentDetailTabFallback />}>
                                    <ChildDevelopmentAnalysisTab
                                        studentData={{
                                            student: {
                                                name: student.name,
                                                age: student.date_of_birth ? new Date().getFullYear() - new Date(student.date_of_birth).getFullYear() : 12,
                                                class: student.classes?.name
                                            },
                                            academicRecords: filteredAcademicRecords.map((r: AcademicRecordRow) => ({
                                                subject: r.subject,
                                                score: r.score,
                                                assessment_name: r.assessment_name,
                                                notes: r.notes
                                            })),
                                            attendanceRecords: filteredAttendance.map((a: AttendanceRow) => ({
                                                status: a.status,
                                                date: a.date
                                            })),
                                            violations: filteredViolations.map((v: ViolationRow) => ({
                                                description: v.description,
                                                points: v.points,
                                                date: v.date
                                            })),
                                            quizPoints: filteredQuizPoints.map((q: QuizPointRow) => ({
                                                activity: q.quiz_name,
                                                points: q.points,
                                                date: q.quiz_date
                                            }))
                                        } as ChildDevelopmentData}
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

            {/* Floating Action Button with Quick Actions - Hidden on Communication Tab */}
            {activeTab !== 'communication' && (
                <FloatingActionButton
                    icon={<PlusIcon className="w-6 h-6" />}
                    label="Menu Cepat"
                    offset={{ bottom: 80, right: 16 }}
                    size={56}
                    className="shadow-xl"
                    quickActions={[
                        {
                            icon: <BookOpenIcon className="w-4 h-4" />,
                            label: 'Tambah Nilai',
                            onClick: () => setModalState({ type: 'academic', data: null }),
                            color: 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400'
                        },
                        {
                            icon: <SparklesIcon className="w-4 h-4" />,
                            label: 'Tambah Keaktifan',
                            onClick: () => setModalState({ type: 'quiz', data: null }),
                            color: 'bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400'
                        },
                        {
                            icon: <ShieldAlertIcon className="w-4 h-4" />,
                            label: 'Catat Pelanggaran',
                            onClick: () => setModalState({ type: 'violation', mode: 'add', data: null }),
                            color: 'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400'
                        },
                        {
                            icon: <FileTextIcon className="w-4 h-4" />,
                            label: 'Catatan Guru',
                            onClick: () => setModalState({ type: 'report', data: null }),
                            color: 'bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400'
                        },
                        {
                            icon: <MessageSquareIcon className="w-4 h-4" />,
                            label: 'Kirim Pesan',
                            onClick: () => setActiveTab('communication'),
                            color: 'bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400'
                        }
                    ]}
                    aria-label="Menu Cepat"
                />
            )}

            {
                modalState.type === 'applyPoints' ? (
                    <Modal isOpen={true} onClose={() => setModalState({ type: 'closed' })} title="Gunakan Poin Keaktifan">
                        <div className="space-y-4">
                            <p className="text-sm text-gray-600 dark:text-gray-400">
                                Anda akan menggunakan <strong>{availableFilteredQuizPoints.length} poin</strong> keaktifan sebagai nilai tambahan. Poin ini akan ditandai sudah digunakan.
                            </p>
                            <div>
                                <label htmlFor="subject-select" className="block text-sm font-medium mb-1">Pilih Mata Pelajaran</label>
                                {/* FIX: Explicitly type the event object in onChange to resolve 'unknown' type error. */}
                                <Select id="subject-select" value={subjectToApply} onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setSubjectToApply(e.target.value)} required>
                                    <option value="" disabled>-- Pilih --</option>
                                    {/* FIX: Explicitly type the 's' parameter to resolve 'unknown' type error. */}
                                    {uniqueSubjectsForGrades.map((s) => s && <option key={s} value={s}>{s}</option>)}
                                </Select>
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
                            <Button type="button" variant="ghost" onClick={() => setModalState({ type: 'closed' })} disabled={deleteMutation.isPending}>Batal</Button>
                            <Button type="button" variant="destructive" onClick={modalState.onConfirm} disabled={deleteMutation.isPending}>
                                {deleteMutation.isPending ? 'Menghapus...' : 'Ya, Hapus'}
                            </Button>
                        </div>
                    </Modal>
                )
            }
        </div >
    );
};

export default StudentDetailPage;
