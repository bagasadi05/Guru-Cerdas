import { useQuery } from '@tanstack/react-query';
import { supabase } from '../../../../../services/supabase';
import { AppUser } from '../../../../../hooks/useAuth';
import { AcademicRecordRow, QuizPointRow, ReportRow, CommunicationRow } from '../../types';

interface UseStudentTabQueriesParams {
    studentId: string | undefined;
    user: AppUser | null;
    activeTab: string;
}

export function useStudentTabQueries({ studentId, user, activeTab }: UseStudentTabQueriesParams) {
    const shouldLoadGrades = activeTab === 'grades' || activeTab === 'development';
    const { data: academicRecords = [] } = useQuery({
        queryKey: ['studentGrades', studentId],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('academic_records')
                .select('id, student_id, user_id, subject, score, assessment_name, notes, semester_id, created_at, version')
                .eq('student_id', studentId!)
                .is('deleted_at', null);
            if (error) throw error;
            const rawRecords = (data || []) as AcademicRecordRow[];
            const recorderIds = Array.from(new Set(rawRecords.map(r => r.user_id).filter(Boolean)));
            let recorderNames: Record<string, string> = {};
            if (recorderIds.length > 0) {
                const { data: roleRows } = await supabase
                    .from('user_roles')
                    .select('user_id, full_name, email')
                    .in('user_id', recorderIds);
                recorderNames = (roleRows || []).reduce((acc, r) => {
                    if (r.user_id) {
                        acc[r.user_id] = r.full_name?.trim() || (r.email ? r.email.split('@')[0] : '') || '';
                    }
                    return acc;
                }, {} as Record<string, string>);
            }
            return rawRecords.map(r => ({
                ...r,
                recorded_by_name: recorderNames[r.user_id || ''] || null
            })) as AcademicRecordRow[];
        },
        enabled: !!studentId && !!user && shouldLoadGrades,
        staleTime: 5 * 60 * 1000
    });

    const shouldLoadActivity = activeTab === 'activity' || activeTab === 'development';
    const { data: quizPoints = [] } = useQuery({
        queryKey: ['studentQuizzes', studentId],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('quiz_points')
                .select('id, student_id, user_id, quiz_date, quiz_name, subject, points, max_points, category, is_used, used_at, used_for_subject, semester_id, created_at')
                .eq('student_id', studentId!)
                .is('deleted_at', null);
            if (error) throw error;
            const rawQuizzes = (data || []) as unknown as QuizPointRow[];
            const recorderIds = Array.from(new Set(rawQuizzes.map(q => q.user_id).filter(Boolean)));
            let recorderNames: Record<string, string> = {};
            if (recorderIds.length > 0) {
                const { data: roleRows } = await supabase
                    .from('user_roles')
                    .select('user_id, full_name, email')
                    .in('user_id', recorderIds);
                recorderNames = (roleRows || []).reduce((acc, r) => {
                    if (r.user_id) {
                        acc[r.user_id] = r.full_name?.trim() || (r.email ? r.email.split('@')[0] : '') || '';
                    }
                    return acc;
                }, {} as Record<string, string>);
            }
            return rawQuizzes.map(q => ({
                ...q,
                recorded_by_name: recorderNames[q.user_id || ''] || null
            })) as QuizPointRow[];
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
                    .select('id, user_id, student_id, extracurricular_id, extracurricular_student_id, semester_id, joined_at, status, created_at, deleted_at, extracurriculars(id, user_id, name, category, description, schedule_day, schedule_time, coach_name, max_participants, is_active, created_at, updated_at, deleted_at)')
                    .eq('student_id', studentId!)
                    .is('deleted_at', null),
                supabase
                    .from('extracurricular_attendance')
                    .select('id, user_id, student_id, extracurricular_student_id, extracurricular_id, semester_id, date, status, notes, created_at, deleted_at')
                    .eq('student_id', studentId!)
                    .is('deleted_at', null),
                supabase
                    .from('extracurricular_grades')
                    .select('id, user_id, student_id, extracurricular_student_id, extracurricular_id, semester_id, grade, score, description, notes, created_at, updated_at, deleted_at')
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
                .map((record) => record.teacher_id as string))];

            if (teacherIds.length === 0) {
                return records;
            }

            const { data: teacherRoles } = await supabase
                .from('user_roles')
                .select('user_id, full_name')
                .in('user_id', teacherIds);

            const teacherNameMap = new Map(
                (teacherRoles || []).filter((r): r is { user_id: string; full_name: string } => r.full_name != null).map((role) => [role.user_id, role.full_name])
            );

            return records.map((record) => ({
                ...record,
                teacher_name: record.sender === 'teacher'
                    ? teacherNameMap.get(record.teacher_id ?? '') || null
                    : null,
            }));
        },
        enabled: !!studentId && !!user && activeTab === 'communication'
    });

    return {
        academicRecords,
        quizPoints,
        reports,
        extracurricularData,
        unreadMessagesCount,
        communications,
    };
}
