/**
 * Custom hook for managing extracurricular data
 * Encapsulates all queries and mutations for the extracurricular module
 */
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
    Class,
} from './types';

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
                .order('name');
            if (error) throw error;
            return data as Extracurricular[];
        },
        enabled: !!user,
    });

    const selectedExtracurricularData = useMemo(() => {
        return extracurriculars.find((e) => e.id === selectedExtracurricular);
    }, [extracurriculars, selectedExtracurricular]);

    // Fetch classes
    const { data: classes = [] } = useQuery({
        queryKey: ['classes', user?.id],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('classes')
                .select('*')
                .eq('user_id', user!.id)
                .is('deleted_at', null)
                .order('name');
            if (error) throw error;
            return data as Class[];
        },
        enabled: !!user,
    });

    const selectedClassName = useMemo(() => {
        if (!selectedClassId) return '';
        return classes.find((c) => c.id === selectedClassId)?.name || '';
    }, [classes, selectedClassId]);

    const normalizedClassName = useMemo(() => {
        if (!selectedClassName) return '';
        return selectedClassName.trim().replace(/\s+/g, ' ').toUpperCase();
    }, [selectedClassName]);

    // Fetch students based on selected class
    const { data: students = [] } = useQuery({
        queryKey: ['students', user?.id, selectedClassId],
        queryFn: async () => {
            let query = supabase
                .from('students')
                .select('*')
                .is('deleted_at', null)
                .eq('user_id', user!.id)
                .order('name');

            if (selectedClassId) {
                query = query.eq('class_id', selectedClassId);
            }

            const { data, error } = await query;
            if (error) throw error;
            return data as Student[];
        },
        enabled: !!user,
    });

    // Fetch extracurricular-only students
    const { data: extracurricularStudents = [] } = useQuery({
        queryKey: ['extracurricular_students', user?.id, normalizedClassName],
        queryFn: async () => {
            let query = supabase
                .from('extracurricular_students')
                .select('*')
                .eq('user_id', user!.id)
                .order('name');

            if (normalizedClassName) {
                query = query.eq('class_name', normalizedClassName);
            }

            const { data, error } = await query;
            if (error) throw error;
            return data as ExtracurricularStudent[];
        },
        enabled: !!user,
    });

    // Fetch ALL extracurricular students (for student list tab)
    const { data: allExtracurricularStudents = [], isLoading: loadingAllExtraStudents } = useQuery({
        queryKey: ['all_extracurricular_students', user?.id],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('extracurricular_students')
                .select('*')
                .eq('user_id', user!.id)
                .order('name');
            if (error) throw error;
            return data as ExtracurricularStudent[];
        },
        enabled: !!user,
    });

    // Fetch enrollments for selected extracurricular
    const { data: enrollments = [] } = useQuery({
        queryKey: ['student_extracurriculars', selectedExtracurricular, activeSemester?.id],
        queryFn: async () => {
            const [studentRes, extraRes] = await Promise.all([
                supabase
                    .from('student_extracurriculars')
                    .select('id, student_id, extracurricular_id, semester_id, students(id, name, class_id, classes(name))')
                    .eq('extracurricular_id', selectedExtracurricular)
                    .eq('semester_id', activeSemester!.id)
                    .not('student_id', 'is', null),
                supabase
                    .from('student_extracurriculars')
                    .select('id, extracurricular_student_id, extracurricular_id, semester_id, extracurricular_students(id, name, class_name)')
                    .eq('extracurricular_id', selectedExtracurricular)
                    .eq('semester_id', activeSemester!.id)
                    .not('extracurricular_student_id', 'is', null),
            ]);

            if (studentRes.error) throw studentRes.error;
            if (extraRes.error) throw extraRes.error;

            const studentEnrollments = (studentRes.data || []).map((row: any): EnrollmentView => ({
                id: row.id,
                participantId: row.student_id,
                participantType: 'student',
                name: row.students?.name || 'Siswa',
                className: row.students?.classes?.name || null,
            }));

            const extraEnrollments = (extraRes.data || []).map((row: any): EnrollmentView => ({
                id: row.id,
                participantId: row.extracurricular_student_id,
                participantType: 'extracurricular_student',
                name: row.extracurricular_students?.name || 'Siswa Ekskul',
                className: row.extracurricular_students?.class_name || null,
            }));

            return [...studentEnrollments, ...extraEnrollments];
        },
        enabled: !!selectedExtracurricular && !!activeSemester,
    });

    // Fetch attendance for selected extracurricular and date
    const { data: attendanceRecords = [] } = useQuery({
        queryKey: ['extracurricular_attendance', selectedExtracurricular, selectedDate],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('extracurricular_attendance')
                .select('*')
                .eq('extracurricular_id', selectedExtracurricular)
                .eq('date', selectedDate);
            if (error) throw error;
            return data as ExtracurricularAttendance[];
        },
        enabled: !!selectedExtracurricular && !!selectedDate,
    });

    // Fetch grades for selected extracurricular
    const { data: grades = [] } = useQuery({
        queryKey: ['extracurricular_grades', selectedExtracurricular, activeSemester?.id],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('extracurricular_grades')
                .select('*')
                .eq('extracurricular_id', selectedExtracurricular)
                .eq('semester_id', activeSemester!.id);
            if (error) throw error;
            return data as ExtracurricularGrade[];
        },
        enabled: !!selectedExtracurricular && !!activeSemester,
    });

    // ==================== DERIVED DATA ====================

    const classNameById = useMemo(() => {
        const map = new Map<string, string>();
        classes.forEach((c: Class) => map.set(c.id, c.name));
        return map;
    }, [classes]);

    const participants = useMemo(() => {
        const baseStudents = students.map((s) => ({
            id: s.id,
            type: 'student' as const,
            name: s.name,
            className: s.class_id ? classNameById.get(s.class_id) || null : null,
        }));

        const extra = extracurricularStudents.map((s) => ({
            id: s.id,
            type: 'extracurricular_student' as const,
            name: s.name,
            className: s.class_name || null,
        }));

        return [...baseStudents, ...extra];
    }, [students, extracurricularStudents, classNameById]);

    const enrolledParticipantIds = useMemo(() => {
        return new Set(enrollments.map((e) => `${e.participantType}:${e.participantId}`));
    }, [enrollments]);

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
        return Array.from(classSet).sort();
    }, [allExtracurricularStudents]);

    return {
        // Loading states
        loadingExtracurriculars,
        loadingAllExtraStudents,

        // Core data
        extracurriculars,
        selectedExtracurricularData,
        classes,
        students,
        extracurricularStudents,
        allExtracurricularStudents,
        enrollments,
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
