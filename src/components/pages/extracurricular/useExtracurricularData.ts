import { useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../../../services/supabase';
import { useAuth } from '../../../hooks/useAuth';
import { useSemester } from '../../../contexts/SemesterContext';
import { useToast } from '../../../hooks/useToast';
import {
    Extracurricular,
    ExtracurricularAttendance,
    ExtracurricularGrade,
    Student,
    ExtracurricularStudent,
    EnrollmentView,
    ParticipantOption,
    Class,
    Gender,
} from './types';
import { compareEnrollmentsByClassAndName, compareClassNames } from './extracurricularUtils';

export interface UseExtracurricularDataOptions {
    selectedExtracurricular: string;
    selectedClassId: string;
    selectedDate: string;
}

export function useExtracurricularData(options: UseExtracurricularDataOptions) {
    const { selectedExtracurricular, selectedClassId, selectedDate } = options;
    const { user } = useAuth();
    const { activeSemester } = useSemester();
    const queryClient = useQueryClient();
    const toast = useToast();

    // ==================== QUERIES ====================

    // Fetch all extracurriculars
    const { data: extracurriculars = [], isLoading: loadingExtracurriculars } = useQuery({
        queryKey: ['extracurriculars', user?.id],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('extracurriculars')
                .select('*')
                .eq('user_id', user!.id)
                .is('deleted_at', null)
                .order('name');
            if (error) throw error;
            return (data || []) as Extracurricular[];
        },
        enabled: !!user,
    });

    const selectedExtracurricularData = useMemo(() => {
        return extracurriculars.find((e) => e.id === selectedExtracurricular);
    }, [extracurriculars, selectedExtracurricular]);

    // Fetch classes
    const { data: classes = [] } = useQuery({
        queryKey: ['classes', 'all_active', user?.id],
        queryFn: async () => {
            const { data, error } = await supabase.rpc('get_active_classes');
            if (error) throw error;
            return (data || []) as Class[];
        },
        enabled: !!user,
    });

    const selectedClassName = useMemo(() => {
        if (!selectedClassId) return '';
        return classes.find((c) => c.id === selectedClassId)?.name || '';
    }, [classes, selectedClassId]);

    const normalizedClassName = useMemo(() => {
        if (!selectedClassName) return '';
        return normalizeClassName(selectedClassName);
    }, [selectedClassName]);

    // Fetch all active regular students (cached once, filtered client-side for instant class switching)
    const { data: allRegularStudents = [] } = useQuery({
        queryKey: ['students', 'all_active', user?.id],
        queryFn: async () => {
            const { data, error } = await supabase.rpc('get_student_directory');
            if (error) throw error;
            return (data || []) as unknown as Student[];
        },
        enabled: !!user,
    });

    const students = useMemo(() => {
        if (!selectedClassId) return allRegularStudents;
        return allRegularStudents.filter((s) => s.class_id === selectedClassId);
    }, [allRegularStudents, selectedClassId]);

    // Fetch ALL extracurricular students
    const { data: allExtracurricularStudents = [], isLoading: loadingAllExtraStudents } = useQuery({
        queryKey: ['all_extracurricular_students', user?.id],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('extracurricular_students')
                .select('*')
                .eq('user_id', user!.id)
                .is('deleted_at', null)
                .order('name');
            if (error) throw error;
            return (data || []) as ExtracurricularStudent[];
        },
        enabled: !!user,
    });

    const extracurricularStudents = useMemo(() => {
        if (!normalizedClassName) return allExtracurricularStudents;
        return allExtracurricularStudents.filter(
            (s) => s.class_name && normalizeClassName(s.class_name) === normalizedClassName
        );
    }, [allExtracurricularStudents, normalizedClassName]);

    // Fetch enrollment counts across all extracurriculars for the active semester
    const { data: allSemesterEnrollmentRows = [] } = useQuery({
        queryKey: ['student_extracurriculars_counts', user?.id, activeSemester?.id],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('student_extracurriculars')
                .select('id, extracurricular_id')
                .eq('semester_id', activeSemester!.id)
                .is('deleted_at', null);
            if (error) throw error;
            return (data || []) as Array<{ id: string; extracurricular_id: string | null }>;
        },
        enabled: !!user && !!activeSemester?.id,
    });

    const enrollmentCountsByEkskul = useMemo(() => {
        const counts: Record<string, number> = {};
        allSemesterEnrollmentRows.forEach((row) => {
            if (row.extracurricular_id) {
                counts[row.extracurricular_id] = (counts[row.extracurricular_id] || 0) + 1;
            }
        });
        return counts;
    }, [allSemesterEnrollmentRows]);

    // Fetch enrollments for selected extracurricular
    const { data: enrollments = [], isLoading: loadingEnrollments } = useQuery({
        queryKey: ['student_extracurriculars', selectedExtracurricular, activeSemester?.id],
        queryFn: async () => {
            const [studentRes, extraRes] = await Promise.all([
                supabase
                    .from('student_extracurriculars')
                    .select('id, student_id, extracurricular_id, semester_id, students(id, name, gender, class_id, classes(name))')
                    .eq('extracurricular_id', selectedExtracurricular)
                    .eq('semester_id', activeSemester!.id)
                    .is('deleted_at', null)
                    .not('student_id', 'is', null),
                supabase
                    .from('student_extracurriculars')
                    .select('id, extracurricular_student_id, extracurricular_id, semester_id, extracurricular_students(id, name, gender, class_name)')
                    .eq('extracurricular_id', selectedExtracurricular)
                    .eq('semester_id', activeSemester!.id)
                    .is('deleted_at', null)
                    .not('extracurricular_student_id', 'is', null),
            ]);

            if (studentRes.error) throw studentRes.error;
            if (extraRes.error) throw extraRes.error;

            type RawStudentRow = {
                id: string;
                student_id: string;
                students: {
                    name?: string | null;
                    gender?: Gender | null;
                    classes?: { name?: string | null } | null;
                } | null;
            };

            type RawExtraRow = {
                id: string;
                extracurricular_student_id: string;
                extracurricular_students: {
                    name?: string | null;
                    gender?: Gender | null;
                    class_name?: string | null;
                } | null;
            };

            const studentEnrollments = ((studentRes.data as unknown as RawStudentRow[]) || []).map((row): EnrollmentView => ({
                id: row.id,
                participantId: row.student_id,
                participantType: 'student',
                name: row.students?.name || 'Siswa',
                className: row.students?.classes?.name || null,
                gender: row.students?.gender || null,
            }));

            const extraEnrollments = ((extraRes.data as unknown as RawExtraRow[]) || []).map((row): EnrollmentView => ({
                id: row.id,
                participantId: row.extracurricular_student_id,
                participantType: 'extracurricular_student',
                name: row.extracurricular_students?.name || 'Siswa Ekskul',
                className: row.extracurricular_students?.class_name || null,
                gender: row.extracurricular_students?.gender || null,
            }));

            return [...studentEnrollments, ...extraEnrollments].sort(compareEnrollmentsByClassAndName);
        },
        enabled: !!selectedExtracurricular && !!activeSemester,
    });

    // Fetch attendance for selected extracurricular and date
    const { data: attendanceRecords = [], isLoading: loadingAttendance } = useQuery({
        queryKey: ['extracurricular_attendance', selectedExtracurricular, selectedDate],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('extracurricular_attendance')
                .select('*')
                .eq('extracurricular_id', selectedExtracurricular)
                .eq('date', selectedDate)
                .is('deleted_at', null);
            if (error) throw error;
            return (data || []) as ExtracurricularAttendance[];
        },
        enabled: !!selectedExtracurricular && !!selectedDate,
    });

    // Fetch grades for selected extracurricular
    const { data: grades = [], isLoading: loadingGrades } = useQuery({
        queryKey: ['extracurricular_grades', selectedExtracurricular, activeSemester?.id],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('extracurricular_grades')
                .select('*')
                .eq('extracurricular_id', selectedExtracurricular)
                .eq('semester_id', activeSemester!.id)
                .is('deleted_at', null);
            if (error) throw error;
            return (data || []) as ExtracurricularGrade[];
        },
        enabled: !!selectedExtracurricular && !!activeSemester,
    });

    // ==================== DERIVED DATA ====================

    const classNameById = useMemo(() => {
        const map = new Map<string, string>();
        classes.forEach((c: Class) => map.set(c.id, c.name));
        return map;
    }, [classes]);

    const enrolledParticipantIds = useMemo(() => {
        return new Set(enrollments.map((e) => `${e.participantType}:${e.participantId}`));
    }, [enrollments]);

    const participants = useMemo((): ParticipantOption[] => {
        const baseStudents: ParticipantOption[] = students
            .filter((s) => (s.class_id && classNameById.has(s.class_id)) || enrolledParticipantIds.has(`student:${s.id}`))
            .map((s) => ({
                id: s.id,
                type: 'student' as const,
                name: s.name,
                className: s.class_id ? classNameById.get(s.class_id) || null : null,
                gender: s.gender || null,
            }));

        const extra: ParticipantOption[] = extracurricularStudents.map((s) => ({
            id: s.id,
            type: 'extracurricular_student' as const,
            name: s.name,
            className: s.class_name || null,
            gender: s.gender || null,
        }));

        return [...baseStudents, ...extra].sort(compareEnrollmentsByClassAndName);
    }, [students, extracurricularStudents, classNameById, enrolledParticipantIds]);

    const attendanceMap = useMemo(() => {
        const map: Record<string, string> = {};
        attendanceRecords.forEach((a) => {
            const key = a.student_id
                ? `student:${a.student_id}`
                : a.extracurricular_student_id
                    ? `extracurricular_student:${a.extracurricular_student_id}`
                    : '';
            if (key) map[key] = a.status;
        });
        return map;
    }, [attendanceRecords]);

    const gradesMap = useMemo(() => {
        const map: Record<string, ExtracurricularGrade> = {};
        grades.forEach((g: ExtracurricularGrade) => {
            const key = g.student_id
                ? `student:${g.student_id}`
                : g.extracurricular_student_id
                    ? `extracurricular_student:${g.extracurricular_student_id}`
                    : '';
            if (key) map[key] = g;
        });
        return map;
    }, [grades]);

    const uniqueExtraStudentClasses = useMemo(() => {
        const classSet = new Set<string>();
        allExtracurricularStudents.forEach((s) => {
            if (s.class_name) classSet.add(s.class_name);
        });
        return Array.from(classSet).sort(compareClassNames);
    }, [allExtracurricularStudents]);

    return {
        // Loading states
        loadingExtracurriculars,
        loadingAllExtraStudents,
        loadingEnrollments,
        loadingAttendance,
        loadingGrades,

        // Core data
        extracurriculars,
        selectedExtracurricularData,
        classes,
        students,
        allRegularStudents,
        extracurricularStudents,
        allExtracurricularStudents,
        enrollments,
        enrollmentCountsByEkskul,
        attendanceRecords,
        grades,
        activeSemester,

        // Derived/computed data
        participants,
        enrolledParticipantIds,
        attendanceMap,
        gradesMap,
        uniqueExtraStudentClasses,
        classNameById,

        // Query client for invalidation
        queryClient,
        toast,
        user,
    };
}

export function normalizeClassName(value: string) {
    return value.trim().replace(/\s+/g, ' ').toUpperCase();
}
