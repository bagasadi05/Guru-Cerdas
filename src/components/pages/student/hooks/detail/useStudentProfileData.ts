import { useQuery } from '@tanstack/react-query';
import { supabase } from '../../../../../services/supabase';
import { AppUser } from '../../../../../hooks/useAuth';
import { Database } from '../../../../../services/database.types';
import { StudentWithClass, ViolationRow, AttendanceRow } from '../../types';

interface UseStudentProfileDataParams {
    studentId: string | undefined;
    user: AppUser | null;
}

export function useStudentProfileData({ studentId, user }: UseStudentProfileDataParams) {
    // 1. Core Profile Query (Fastest, High Priority)
    const {
        data: studentProfile,
        isLoading: isProfileLoading,
        error: profileError
    } = useQuery({
        queryKey: ['studentProfile', studentId],
        queryFn: async () => {
            if (!studentId || !user) throw new Error('User or Student ID not found');
            const studentRes = await supabase
                .from('students')
                .select('id, name, user_id, class_id, gender, avatar_url, access_code, parent_name, parent_phone, nis, nisn, birth_date, created_at, deleted_at')
                .eq('id', studentId)
                .is('deleted_at', null)
                .single();

            if (studentRes.error) throw studentRes.error;

            const [classInfoRes, assignmentsRes, classesRes] = await Promise.all([
                studentRes.data.class_id
                    ? supabase
                        .from('classes')
                        .select('id, name, user_id, created_at, deleted_at')
                        .eq('id', studentRes.data.class_id)
                        .is('deleted_at', null)
                        .single()
                    : Promise.resolve({ data: null, error: null }),
                supabase
                    .from('teacher_class_assignments')
                    .select('class_id, assignment_role, subject_name')
                    .eq('teacher_user_id', user.id)
                    .is('deleted_at', null),
                supabase
                    .rpc('get_active_classes')
                    .then(async (rpcRes) => {
                        if (!rpcRes.error && rpcRes.data && rpcRes.data.length > 0) {
                            return rpcRes;
                        }
                        return supabase
                            .from('classes')
                            .select('id, name, user_id, created_at, deleted_at')
                            .is('deleted_at', null)
                            .eq('is_archived', false)
                            .order('name');
                    })
            ]);

            if (classInfoRes.error) throw classInfoRes.error;
            if (assignmentsRes.error) throw assignmentsRes.error;

            const studentData = studentRes.data as unknown as StudentWithClass;
            const assignments = (assignmentsRes.data || []) as { class_id: string; assignment_role: string; subject_name: string | null }[];
            let classRows = (classesRes.data || []) as unknown as Database['public']['Tables']['classes']['Row'][];
            const classInfo = classInfoRes.data as Database['public']['Tables']['classes']['Row'];

            // Pastikan kelas siswa saat ini selalu ada dalam daftar kelas meskipun berstatus diarsipkan
            if (classInfo && !classRows.some(c => c.id === classInfo.id)) {
                classRows = [classInfo, ...classRows];
            }

            const studentWithClass = {
                ...studentData,
                classes: classInfo ? { id: classInfo.id, name: classInfo.name, user_id: classInfo.user_id } : null
            };

            return { student: studentWithClass, assignments, classes: classRows };
        },
        enabled: !!studentId && !!user,
        staleTime: 0,
    });

    // 2. Stats Query (Attendance & Violations) - Needed for top cards
    const { data: statsData } = useQuery({
        queryKey: ['studentStats', studentId],
        queryFn: async () => {
            if (!studentId || !user) return { attendanceRecords: [], violations: [] };
            const [attendanceRes, violationsRes] = await Promise.all([
                supabase.from('attendance').select('id, student_id, user_id, date, status, notes, semester_id, created_at').eq('student_id', studentId).is('deleted_at', null),
                supabase.from('violations').select('id, student_id, user_id, date, description, context_notes, points, type, severity, semester_id, follow_up_status, follow_up_notes, evidence_url, parent_notified, parent_notified_at, created_at, deleted_at').eq('student_id', studentId).is('deleted_at', null)
            ]);

            const rawViolations = (violationsRes.data || []) as ViolationRow[];
            const recorderIds = Array.from(new Set(rawViolations.map(v => v.user_id).filter(Boolean)));
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

    return {
        studentProfile,
        isProfileLoading,
        profileError,
        statsData,
    };
}
