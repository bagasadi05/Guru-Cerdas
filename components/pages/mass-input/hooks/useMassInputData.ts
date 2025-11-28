import { useQuery } from '@tanstack/react-query';
import { supabase } from '../../../../services/supabase';
import { ClassRow, StudentRow, AcademicRecordRow } from '../types';
import { useAuth } from '../../../../hooks/useAuth';

export const useMassInputData = (selectedClass: string, subject?: string, assessmentName?: string, mode?: string) => {
    const { user } = useAuth();

    const { data: classes, isLoading: isLoadingClasses } = useQuery({
        queryKey: ['classes', user?.id],
        queryFn: async (): Promise<ClassRow[]> => {
            if (!user) return [];
            const { data, error } = await supabase.from('classes').select('*').eq('user_id', user.id).order('name');
            if (error) throw error; return data || [];
        },
        enabled: !!user,
    });

    const { data: studentsData, isLoading: isLoadingStudents } = useQuery({
        queryKey: ['studentsForMassInput', selectedClass],
        queryFn: async (): Promise<StudentRow[]> => {
            if (!selectedClass) return [];
            const { data, error } = await supabase.from('students').select('*').eq('class_id', selectedClass).order('name');
            if (error) throw error; return data || [];
        },
        enabled: !!selectedClass
    });

    const { data: uniqueSubjects } = useQuery({
        queryKey: ['distinctSubjects', user?.id],
        queryFn: async (): Promise<string[]> => {
            if (!user) return [];
            const { data, error } = await supabase.from('academic_records').select('subject').eq('user_id', user.id);
            if (error) { console.error("Error fetching distinct subjects:", error); return []; }
            const subjects = ((data as { subject: string }[]) || []).map((item) => item.subject);
            return [...new Set(subjects)].sort();
        },
        enabled: !!user, staleTime: 1000 * 60 * 15,
    });

    const { data: assessmentNames } = useQuery({
        queryKey: ['assessmentNames', selectedClass, subject],
        queryFn: async (): Promise<string[]> => {
            if (!selectedClass || !subject || !studentsData) return [];
            const { data, error } = await supabase
                .from('academic_records')
                .select('assessment_name')
                .eq('subject', subject)
                .in('student_id', studentsData?.map(s => s.id) || []);
            if (error) throw error;
            const names = ((data as { assessment_name: string | null }[]) || []).map((item) => item.assessment_name).filter((name): name is string => name !== null);
            return [...new Set(names)].sort();
        },
        enabled: (mode === 'delete_subject_grade') && !!selectedClass && !!subject && !!studentsData,
    });

    const { data: existingGrades, isLoading: isLoadingGrades } = useQuery({
        queryKey: ['existingGrades', selectedClass, subject, assessmentName],
        queryFn: async (): Promise<AcademicRecordRow[]> => {
            if (!selectedClass || !subject || !assessmentName || !studentsData) return [];
            const { data, error } = await supabase
                .from('academic_records')
                .select('*')
                .eq('subject', subject)
                .eq('assessment_name', assessmentName)
                .in('student_id', studentsData?.map(s => s.id) || []);
            if (error) throw error; return data || [];
        },
        enabled: !!selectedClass && !!subject && !!assessmentName && !!studentsData && (mode === 'subject_grade' || mode === 'delete_subject_grade'),
    });

    return {
        classes,
        isLoadingClasses,
        studentsData,
        isLoadingStudents,
        uniqueSubjects,
        assessmentNames,
        existingGrades,
        isLoadingGrades
    };
};
