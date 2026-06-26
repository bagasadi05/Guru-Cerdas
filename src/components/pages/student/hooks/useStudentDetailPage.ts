import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { useToast } from '../../../../hooks/useToast';
import { supabase } from '../../../../services/supabase';
import { r2StorageService } from '../../../../services/r2StorageService';
import { useAuth } from '../../../../hooks/useAuth';
import { Database } from '../../../../services/database.types';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useOfflineStatus } from '../../../../hooks/useOfflineStatus';
import { optimizeImage } from '../../../utils/image';
import { violationList } from '../../../../services/violations.data';
import { useUserSettings } from '../../../../hooks/useUserSettings';
import { useSemester } from '../../../../contexts/SemesterContext';
import { getSemesterDisplayName } from '../../../../utils/semesterUtils';
import {
    buildStudentCommunicationSignals,
    extractStoragePathFromPublicUrl,
    getAvailableQuizPoints,
    getLatestRecordForSubject,
    resolveSubmitSemesterId,
} from '../studentDetailHelpers';
import { writeAuditLog } from '../../../../services/auditTrail';
import { dedupeAcademicRecords, dedupeQuizPoints, dedupeViolations } from '../../../../utils/academicRecordUtils';
import { generateSimpleAccessCode } from '../../../../utils/accessCode';
import { useStudentMutations } from './useStudentMutations';
import { useConfetti } from '../../../../hooks/useConfetti';
import { type SeverityLevel } from '../violationMeta';

import {
    ModalState,
    StudentMutationVars,
    AcademicRecordRow,
    AttendanceRow,
    ViolationRow,
    QuizPointRow,
    CommunicationRow,
    ReportRow,
    StudentWithClass
} from '../types';

import {
    EditStudentFormValues,
    ReportFormValues,
    AcademicFormValues,
    QuizFormValues,
    ViolationFormValues,
    CommunicationFormValues
} from '../schemas';

const getViolationSeverityFromCategory = (category?: string): SeverityLevel | null => {
    const normalized = category?.toLowerCase();
    if (normalized === 'ringan' || normalized === 'sedang' || normalized === 'berat') {
        return normalized as SeverityLevel;
    }
    return null;
};

export const useStudentDetailPage = () => {
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
    const [aiReport, setAiReport] = useState('');
    const [isAiReportLoading, setIsAiReportLoading] = useState(false);
    const [aiReportError, setAiReportError] = useState('');
    const [copiedAiReport, setCopiedAiReport] = useState(false);
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
                studentRes.data.class_id
                    ? supabase
                        .from('classes')
                        .select('id, name, user_id, created_at, deleted_at')
                        .eq('id', studentRes.data.class_id)
                        .is('deleted_at', null)
                        .single()
                    : Promise.resolve({ data: null, error: null }),
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
            // F17-2: enrich tiap pelanggaran dengan nama guru pencatat (akuntabilitas).
            // Karena akses kini kolaboratif, daftar bisa berisi catatan dari guru lain.
            const rawViolations = (violationsRes.data || []) as ViolationRow[];
            const recorderIds = Array.from(new Set(rawViolations.map(v => v.user_id).filter(Boolean)));
            let recorderNames: Record<string, string> = {};
            if (recorderIds.length > 0) {
                const { data: roleRows } = await supabase
                    .from('user_roles')
                    .select('user_id, full_name')
                    .in('user_id', recorderIds);
                recorderNames = (roleRows || []).reduce((acc, r) => {
                    if (r.user_id) acc[r.user_id] = r.full_name || '';
                    return acc;
                }, {} as Record<string, string>);
            }
            const violations = rawViolations.map(v => ({
                ...v,
                recorded_by_name: recorderNames[v.user_id] || null,
            }));
            return {
                attendanceRecords: (attendanceRes.data || []) as AttendanceRow[],
                violations
            };
        },
        enabled: !!studentId && !!user
    });

    // 3. Tab-Specific Queries (Lazy Loaded)
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

    const { data: extracurricularData } = useQuery({
        queryKey: ['studentExtra', studentId],
        queryFn: async () => {
            const [extraRes, attRes, gradesRes] = await Promise.all([
                supabase
                    .from('student_extracurriculars')
                    .select('id, user_id, student_id, extracurricular_id, extracurricular_student_id, semester_id, joined_at, status, created_at, extracurriculars(id, user_id, name, category, description, schedule_day, schedule_time, coach_name, max_participants, is_active, created_at, updated_at)')
                    .eq('student_id', studentId!)
                    .is('deleted_at', null),
                supabase
                    .from('extracurricular_attendance')
                    .select('id, user_id, student_id, extracurricular_student_id, extracurricular_id, semester_id, date, status, notes, created_at')
                    .eq('student_id', studentId!)
                    .is('deleted_at', null),
                supabase
                    .from('extracurricular_grades')
                    .select('id, user_id, student_id, extracurricular_student_id, extracurricular_id, semester_id, grade, score, description, notes, created_at, updated_at')
                    .eq('student_id', studentId!)
                    .is('deleted_at', null)
            ]);
            if (extraRes.error) throw extraRes.error;
            if (attRes.error) throw attRes.error;
            if (gradesRes.error) throw gradesRes.error;
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

    // Composite data object
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

    const isLoading = isProfileLoading;
    const isError = !!profileError;
    const queryError = profileError;

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
        applyPointsMutation
    } = useStudentMutations(studentId, () => setModalState({ type: 'closed' }));

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
                const result = await r2StorageService.uploadFile(data.evidence_file, 'violations');
                if (existingViolation?.evidence_url) {
                    await r2StorageService.deleteFile({ publicUrl: existingViolation.evidence_url });
                }
                evidenceUrl = result.publicUrl;
            } catch (error: unknown) {
                toast.error(`Gagal unggah bukti: ${error instanceof Error ? error.message : String(error)}`);
                return;
            }
        }

        const violationPayload = {
            date: data.date,
            description: data.description,
            context_notes: data.context_notes || null,
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
        setModalState({
            type: 'confirmDelete',
            title: 'Konfirmasi Hapus',
            message: 'Apakah Anda yakin ingin menghapus data ini secara permanen?',
            onConfirm: () => deleteMutation.mutate({ table, id }),
            isPending: false
        });
    };

    // Filters & Computations
    const filteredAttendance = useMemo(() => {
        if (!studentDetails?.attendanceRecords) return [];
        if (!selectedSemesterId) return studentDetails.attendanceRecords;
        return studentDetails.attendanceRecords.filter(r => r.semester_id === selectedSemesterId);
    }, [studentDetails?.attendanceRecords, selectedSemesterId]);

    const attendanceSummary = useMemo(() => {
        const summary = { Hadir: 0, Izin: 0, Sakit: 0, Alpha: 0, Libur: 0 };
        filteredAttendance.forEach(rec => {
            const status = rec.status as keyof typeof summary;
            if (status in summary) {
                summary[status]++;
            }
        });
        return summary;
    }, [filteredAttendance]);

    const filteredViolations = useMemo(() => {
        const semesterScopedViolations = !studentDetails?.violations
            ? []
            : !selectedSemesterId
                ? studentDetails.violations
                : studentDetails.violations.filter(r => r.semester_id === selectedSemesterId);
        return dedupeViolations(semesterScopedViolations);
    }, [studentDetails, selectedSemesterId]);

    const filteredAcademicRecords = useMemo(() => {
        const semesterScopedRecords = !selectedSemesterId
            ? academicRecords
            : academicRecords.filter(r => r.semester_id === selectedSemesterId);
        return dedupeAcademicRecords(semesterScopedRecords);
    }, [academicRecords, selectedSemesterId]);

    const filteredQuizPoints = useMemo(() => {
        const semesterScopedQuizPoints = !selectedSemesterId
            ? quizPoints
            : quizPoints.filter(r => r.semester_id === selectedSemesterId);
        return dedupeQuizPoints(semesterScopedQuizPoints);
    }, [quizPoints, selectedSemesterId]);

    const availableFilteredQuizPoints = useMemo(() => getAvailableQuizPoints(filteredQuizPoints), [filteredQuizPoints]);

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

    const handleNotifyParent = async (violation: ViolationRow) => {
        try {
            if (!studentDetails?.student || !user) return;
            const notifiedAt = new Date().toISOString();

            const message = `[NOTIFIKASI PELANGGARAN]\n\nYth. Orang Tua/Wali ${studentDetails.student.name},\n\nKami informasikan bahwa anak Anda telah melakukan pelanggaran:\n\n📋 Jenis: ${violation.description}\n📅 Tanggal: ${new Date(violation.date).toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}\n⚠️ Poin: ${violation.points}\n\nMohon perhatian dan kerjasamanya untuk membimbing anak di rumah.\n\nTerima kasih.`;

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
        const newCode = generateSimpleAccessCode();
        studentMutation.mutate({ access_code: newCode });
    };

    const handlePhotoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!e.target.files || e.target.files.length === 0 || !studentId) return;
        setIsUploadingPhoto(true);
        const file = e.target.files[0];
        try {
            const optimizedBlob = await optimizeImage(file, { maxWidth: 300, quality: 0.8 });
            const fileToUpload = new File([optimizedBlob], file.name || 'avatar.jpg', { type: 'image/jpeg' });
            const result = await r2StorageService.uploadFile(fileToUpload, 'student_avatars');

            // Delete old avatar if it exists
            const oldAvatarUrl = studentDetails?.student?.avatar_url;
            if (oldAvatarUrl) {
                try {
                    await r2StorageService.deleteFile({ publicUrl: oldAvatarUrl });
                } catch (delErr) {
                    console.error('Failed to delete old student avatar:', delErr);
                }
            }

            studentMutation.mutate({ avatar_url: result.publicUrl });
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

    const handleGenerateAiReport = async () => {
        if (!studentDetails?.student) return;
        setIsAiReportLoading(true);
        setAiReportError('');
        try {
            const { generateOpenRouterContent, getAssistantContent } = await import('../../../../services/openRouterService');

            const avgScore = filteredAcademicRecords.length > 0
                ? Math.round(filteredAcademicRecords.reduce((a, b) => a + b.score, 0) / filteredAcademicRecords.length)
                : 'N/A';
            const attendanceRate = filteredAttendance.length > 0
                ? Math.round((filteredAttendance.filter(r => r.status === 'Hadir').length / filteredAttendance.length) * 100)
                : 100;
            const violationCount = filteredViolations.length;

            const systemPrompt = `Anda adalah wali kelas yang bijaksana, peduli, dan profesional di Madrasah Ibtidaiyah. Anda ditugaskan untuk menyusun laporan perkembangan berkala siswa ("Rapor Perkembangan Wali Kelas") untuk dibagikan kepada orang tua melalui WhatsApp.

ATURAN DAN FORMAT PENULISAN:
1. Gunakan bahasa Indonesia yang santun, hangat, mengayomi, dan memberikan kesan peduli serta apresiatif. Sapa orang tua dengan hormat (Bapak/Ibu Orang Tua/Wali dari [Nama Siswa]).
2. FORMAT OUTPUT HARUS RAPI dan menggunakan EMOJI menarik agar mudah dibaca di WhatsApp. Gunakan garis pemisah/bold yang sesuai.
3. Struktur laporan wajib mencakup:
   - *SALAM & PEMBUKA*: Salam hangat pembuka, sebutkan nama siswa dan kelasnya.
   - *📊 RINGKASAN AKADEMIK*: Sebutkan rata-rata nilai dan apresiasi atas kerja kerasnya di mata pelajaran tertentu (jika ada).
   - *🌟 AKTIVITAS & KEAKTIFAN*: Sebutkan partisipasi positif siswa, poin keaktifan yang diperoleh, dan bagaimana hal itu membantu perkembangan dirinya.
   - *📅 KEHADIRAN*: Persentase kehadiran dan apresiasi kedisiplinan atau pesan motivasi jika kehadiran kurang optimal.
   - *⚠️ PERILAKU & DISIPLIN*: Sampaikan evaluasi perilaku secara objektif dan halus. Jika ada pelanggaran, sebutkan perlunya bimbingan bersama. Jika nihil pelanggaran, berikan pujian luar biasa.
   - *💡 SARAN & MOTIVASI WALI KELAS*: Kalimat penyemangat, saran konkret untuk pendampingan belajar di rumah, serta ajakan kolaborasi yang hangat antara sekolah dan orang tua.
   - *PENUTUP*: Doa dan salam penutup dari Wali Kelas.
4. Jangan menuliskan teks penjelasan teknis atau metadata di luar isi pesan. Langsung berikan teks pesan WhatsApp yang siap disalin.`;

            const prompt = `Susunlah laporan perkembangan WhatsApp terperinci untuk siswa berikut:
- Nama Siswa: ${studentDetails.student.name}
- Kelas: ${studentDetails.student.classes?.name || 'N/A'}
- Semester: ${selectedSemesterLabel}
- Rata-rata Nilai Akademik: ${avgScore} (dari ${filteredAcademicRecords.length} penilaian)
- Detail Nilai: ${filteredAcademicRecords.map(r => `${r.subject}: ${r.score} (${r.assessment_name})`).join(', ') || 'Belum ada penilaian'}
- Kehadiran: ${attendanceRate}% (Hadir: ${attendanceSummary.Hadir}, Sakit: ${attendanceSummary.Sakit}, Izin: ${attendanceSummary.Izin}, Alpha: ${attendanceSummary.Alpha})
- Keaktifan (Poin): ${filteredQuizPoints.length} poin (Detail: ${filteredQuizPoints.map(q => q.quiz_name).join(', ') || 'Belum ada catatan keaktifan'})
- Catatan Pelanggaran: ${violationCount} kejadian (Total Poin Pelanggaran: ${totalViolationPoints})
${filteredViolations.length > 0 ? `- Detail Pelanggaran: ${filteredViolations.map(v => `${v.description} (${v.points} poin)`).join(', ')}` : '- Catatan Perilaku: Sangat baik, tidak memiliki catatan pelanggaran.'}

Tulis laporan yang menyentuh hati, memotivasi, dan komprehensif agar orang tua memahami betul perkembangan anaknya secara holistik. Gunakan format WhatsApp yang indah.`;

            const response = await generateOpenRouterContent([
                { role: 'system', content: systemPrompt },
                { role: 'user', content: prompt }
            ]);

            const text = getAssistantContent(response) || '';
            setAiReport(text.trim());
        } catch (err: any) {
            console.error('Error generating AI report:', err);
            setAiReportError(err.message || 'Gagal menghasilkan laporan AI. Silakan coba lagi.');
        } finally {
            setIsAiReportLoading(false);
        }
    };

    useEffect(() => {
        if (modalState.type === 'aiAssistant') {
            handleGenerateAiReport();
        } else {
            setAiReport('');
            setAiReportError('');
            setCopiedAiReport(false);
        }
    }, [modalState.type]);

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
        handleCommunicationSubmit,
        handleDelete,
        handleCopyAccessCode,
        handleUpdateViolationFollowUp,
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
    };
};