import { useQuery } from '@tanstack/react-query';
import { supabase } from '../../../../services/supabase';
import { ClassRow, StudentRow, AcademicRecordRow, ViolationRow } from '../types';
import { useAuth } from '../../../../hooks/useAuth';

export const useMassInputData = (selectedClass: string, subject?: string, assessmentName?: string, mode?: string, semesterId?: string) => {
    const { user } = useAuth();

    const { data: classes, isLoading: isLoadingClasses } = useQuery({
        queryKey: ['classes', user?.id],
        queryFn: async (): Promise<ClassRow[]> => {
            if (!user) return [];
            const { data, error } = await supabase.from('classes').select('id, name, user_id').eq('user_id', user.id).is('deleted_at', null).order('name');
            if (error) throw error; return (data || []) as unknown as ClassRow[];
        },
        enabled: !!user,
    });

    const { data: studentsData, isLoading: isLoadingStudents } = useQuery({
        queryKey: ['studentsForMassInput', selectedClass],
        queryFn: async (): Promise<StudentRow[]> => {
            if (!selectedClass) return [];
            const { data, error } = await supabase.from('students').select('id, name, class_id, user_id, gender, avatar_url, access_code, parent_name, parent_phone').eq('class_id', selectedClass).is('deleted_at', null).order('name');
            if (error) throw error; return (data || []) as unknown as StudentRow[];
        },
        enabled: !!selectedClass
    });

    const { data: uniqueSubjects } = useQuery({
        queryKey: ['distinctSubjects', user?.id],
        queryFn: async (): Promise<string[]> => {
            if (!user) return [];
            const { data, error } = await supabase.from('academic_records').select('subject').eq('user_id', user.id).is('deleted_at', null);
            if (error) { console.error("Error fetching distinct subjects:", error); return []; }
            const subjects = ((data as { subject: string }[]) || []).map((item) => item.subject);
            return [...new Set(subjects)].sort();
        },
        enabled: !!user, staleTime: 1000 * 60 * 15,
    });

    const { data: assessmentNames } = useQuery({
        queryKey: ['assessmentNames', selectedClass, subject, studentsData?.length ?? 0, semesterId],
        queryFn: async (): Promise<string[]> => {
            if (!selectedClass || !subject || !studentsData) return [];
            let query = supabase
                .from('academic_records')
                .select('assessment_name')
                .eq('subject', subject)
                .in('student_id', studentsData?.map(s => s.id) || [])
                .is('deleted_at', null);

            if (semesterId) {
                query = query.eq('semester_id', semesterId);
            }

            const { data, error } = await query;
            if (error) throw error;
            const names = ((data as { assessment_name: string | null }[]) || []).map((item) => item.assessment_name).filter((name): name is string => name !== null);
            return [...new Set(names)].sort();
        },
        enabled: (mode === 'delete_subject_grade') && !!selectedClass && !!subject && !!studentsData,
    });

    const { data: existingGrades, isLoading: isLoadingGrades } = useQuery({
        queryKey: ['existingGrades', selectedClass, subject, assessmentName, semesterId],
        queryFn: async (): Promise<AcademicRecordRow[]> => {
            if (!selectedClass || !subject || !assessmentName || !studentsData) return [];
            let query = supabase
                .from('academic_records')
                .select('id, student_id, subject, assessment_name, score, notes, semester_id')
                .eq('subject', subject)
                .eq('assessment_name', assessmentName)
                .in('student_id', studentsData?.map(s => s.id) || [])
                .is('deleted_at', null);

            if (semesterId) {
                query = query.eq('semester_id', semesterId);
            }

            const { data, error } = await query;
            if (error) throw error; return (data || []) as unknown as AcademicRecordRow[];
        },
        enabled: !!selectedClass && !!subject && !!assessmentName && !!studentsData && (mode === 'subject_grade' || mode === 'delete_subject_grade'),
    });

    const { data: existingViolations, isLoading: isLoadingViolations } = useQuery({
        queryKey: ['existingViolations', selectedClass, user?.id],
        queryFn: async (): Promise<ViolationRow[]> => {
            if (!selectedClass || !studentsData) return [];
            const { data, error } = await supabase
                .from('violations')
                .select('id, student_id, date, description, points, type, severity, semester_id, follow_up_status, follow_up_notes, evidence_url, parent_notified, parent_notified_at, created_at, user_id')
                .in('student_id', studentsData.map(s => s.id))
                .is('deleted_at', null)
                .order('date', { ascending: false });
            if (error) throw error; return (data || []) as unknown as ViolationRow[];
        },
        enabled: (mode === 'violation' || mode === 'violation_export') && !!selectedClass && !!studentsData,
    });

    return {
        classes,
        isLoadingClasses,
        studentsData,
        isLoadingStudents,
        uniqueSubjects,
        assessmentNames,
        existingGrades,
        isLoadingGrades,
        existingViolations,
        isLoadingViolations
    };
};
