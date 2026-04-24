import { Database } from './database.types';

export type TeacherAssignmentRole = 'homeroom' | 'subject_teacher';

export type TeacherClassAssignmentRow = Database['public']['Tables']['teacher_class_assignments']['Row'];

export const normalizeSubjectName = (value?: string | null) => value?.trim().toLowerCase() || '';

export const getAssignmentsForClass = (
    assignments: TeacherClassAssignmentRow[],
    classId?: string | null,
    semesterId?: string | null,
) => assignments.filter((assignment) => {
    if (assignment.deleted_at) return false;
    if (classId && assignment.class_id !== classId) return false;
    if (semesterId && assignment.semester_id !== semesterId) return false;
    return true;
});

export const getAssignedSubjects = (
    assignments: TeacherClassAssignmentRow[],
    classId?: string | null,
    semesterId?: string | null,
) => {
    const subjectMap = new Map<string, string>();

    getAssignmentsForClass(assignments, classId, semesterId)
        .filter((assignment) => assignment.assignment_role === 'subject_teacher')
        .forEach((assignment) => {
            const subjectName = assignment.subject_name?.trim();
            if (!subjectName) return;

            const normalized = normalizeSubjectName(subjectName);
            if (!subjectMap.has(normalized)) {
                subjectMap.set(normalized, subjectName);
            }
        });

    return Array.from(subjectMap.values()).sort((left, right) => left.localeCompare(right, 'id-ID'));
};

export const hasHomeroomAssignment = (
    assignments: TeacherClassAssignmentRow[],
    classId?: string | null,
    semesterId?: string | null,
) => getAssignmentsForClass(assignments, classId, semesterId).some(
    (assignment) => assignment.assignment_role === 'homeroom',
);

export const hasSubjectAssignment = (
    assignments: TeacherClassAssignmentRow[],
    classId?: string | null,
    semesterId?: string | null,
    subjectName?: string | null,
) => {
    const normalizedSubject = normalizeSubjectName(subjectName);
    return getAssignmentsForClass(assignments, classId, semesterId).some((assignment) => (
        assignment.assignment_role === 'subject_teacher'
        && normalizeSubjectName(assignment.subject_name) === normalizedSubject
    ));
};
