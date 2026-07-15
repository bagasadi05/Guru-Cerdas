import { useQuery } from '@tanstack/react-query';
import { supabase } from '../../../../services/supabase';
import { ClassRow, StudentRow, AcademicRecordRow, ViolationRow } from '../types';
import { useAuth } from '../../../../hooks/useAuth';
import { getAssignedSubjects, TeacherClassAssignmentRow } from '../../../../services/teacherAssignments';
import { dedupeAcademicRecords } from '../../../../utils/academicRecordUtils';

const DEFAULT_SUBJECT_OPTIONS = [
    'TQA',
    'Bahasa Indonesia',
    'Matematika',
    'IPAS',
    'Pancasila',
    'Akidah',
    'Fikih',
    'Bahasa Arab',
    'Bahasa Jawa',
    'Bahasa Inggris',
    "Qur'an Hadits",
    'SKI',
    'PJOK',
    'TIK',
    'Seni Budaya',
    'Pramuka',
    'Ekstra'
];

export const useMassInputData = (selectedClass: string, subject?: string, assessmentName?: string, mode?: string, semesterId?: string) => {
    const { user } = useAuth();

    const { data: teacherAssignments = [] } = useQuery({
        queryKey: ['teacherClassAssignments', user?.id],
        queryFn: async (): Promise<TeacherClassAssignmentRow[]> => {
            if (!user) return [];
            const { data, error } = await supabase
                .from('teacher_class_assignments')
                .select('id, teacher_user_id, class_id, semester_id, assignment_role, subject_name, notes, created_by, created_at, updated_at, deleted_at')
                .eq('teacher_user_id', user.id)
                .is('deleted_at', null);
            if (error) throw error;
            return (data || []) as TeacherClassAssignmentRow[];
        },
        enabled: !!user,
    });

    const { data: classes, isLoading: isLoadingClasses } = useQuery({
        queryKey: ['classes', user?.id, mode],
        queryFn: async (): Promise<ClassRow[]> => {
            if (!user) return [];
            
            // Kolaboratif: Mode pelanggaran bisa diakses semua guru,
            // jadi kita pakai RPC khusus yang membypass RLS assignments.
            if (mode === 'violation') {
                const { data, error } = await supabase.rpc('get_active_classes');
                if (error) throw error; 
                return (data || []) as unknown as ClassRow[];
            }
            
            const { data, error } = await supabase.from('classes').select('id, name, user_id').is('deleted_at', null).eq('is_archived', false).order('name');
            if (error) throw error; return (data || []) as unknown as ClassRow[];
        },
        enabled: !!user,
    });

    const { data: studentsData, isLoading: isLoadingStudents } = useQuery({
        queryKey: ['studentsForMassInput', selectedClass, mode],
        queryFn: async (): Promise<StudentRow[]> => {
            if (!selectedClass) return [];
            
            // Kolaboratif: Mode pelanggaran bisa diakses semua guru
            if (mode === 'violation') {
                const { data, error } = await supabase.rpc('get_student_directory');
                if (error) throw error;
                // get_student_directory returns all students, filter by selectedClass
                const filteredData = (data || []).filter((s: any) => s.class_id === selectedClass);
                return filteredData as unknown as StudentRow[];
            }
            
            const { data, error } = await supabase.from('students').select('id, name, class_id, user_id, gender, avatar_url, access_code, parent_name, parent_phone').eq('class_id', selectedClass).is('deleted_at', null).order('name');
            if (error) throw error; return (data || []) as unknown as StudentRow[];
        },
        enabled: !!selectedClass
    });

    const { data: uniqueSubjects } = useQuery({
        queryKey: ['distinctSubjects', 'v2', user?.id, selectedClass, semesterId, teacherAssignments.length],
        queryFn: async (): Promise<string[]> => {
            if (!user) return [];
            const assignedSubjects = getAssignedSubjects(teacherAssignments, selectedClass || null, semesterId || null);
            
            // Always include the default subjects, but put assigned subjects first, and remove duplicates
            const combinedSubjects = Array.from(new Set([...assignedSubjects, ...DEFAULT_SUBJECT_OPTIONS]));
            
            if (combinedSubjects.length > 0) {
                return combinedSubjects;
            }

            let query = supabase
                .from('academic_records')
                .select('subject')
                .is('deleted_at', null);

            if (selectedClass && studentsData && studentsData.length > 0) {
                query = query.in('student_id', studentsData.map((student) => student.id));
            }

            if (semesterId) {
                query = query.eq('semester_id', semesterId);
            }

            const { data, error } = await query;
            if (error) { console.error("Error fetching distinct subjects:", error); return []; }
            const subjects = ((data as { subject: string }[]) || []).map((item) => item.subject);
            const uniqueSubjectList = [...new Set(subjects)].sort();
            return uniqueSubjectList.length > 0 ? uniqueSubjectList : DEFAULT_SUBJECT_OPTIONS;
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
                .select('id, student_id, user_id, subject, assessment_name, score, notes, semester_id, created_at, version')
                .eq('subject', subject)
                .eq('assessment_name', assessmentName)
                .in('student_id', studentsData?.map(s => s.id) || [])
                .is('deleted_at', null);

            if (semesterId) {
                query = query.eq('semester_id', semesterId);
            }

            const { data, error } = await query;
            if (error) throw error;
            return dedupeAcademicRecords((data || []) as unknown as AcademicRecordRow[]);
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
