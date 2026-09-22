import { useMemo } from 'react';
import {
    AcademicRecordRow,
    AttendanceRow,
    ViolationRow,
    QuizPointRow,
    StudentWithClass,
    StudentDetailsData,
} from '../../types';
import {
    buildStudentCommunicationSignals,
    getAvailableQuizPoints,
    getLatestRecordForSubject,
} from '../../studentDetailHelpers';
import { dedupeAcademicRecords, dedupeQuizPoints, dedupeViolations } from '../../../../../utils/academicRecordUtils';
import { AppUser } from '../../../../../hooks/useAuth';

interface StudentDetailsComposite {
    student: StudentWithClass;
    assignments: { class_id: string; assignment_role: string; subject_name: string | null }[];
    classes: unknown[];
    attendanceRecords: AttendanceRow[];
    violations: ViolationRow[];
    academicRecords: AcademicRecordRow[];
    quizPoints: QuizPointRow[];
    reports: unknown[];
    studentExtracurriculars: StudentDetailsData['studentExtracurriculars'];
    extracurricularAttendance: StudentDetailsData['extracurricularAttendance'];
    extracurricularGrades: StudentDetailsData['extracurricularGrades'];
    communications: unknown[];
}

interface UseStudentTabFiltersParams {
    studentDetails: StudentDetailsComposite | null;
    selectedSemesterId: string | null;
    academicRecords: AcademicRecordRow[];
    quizPoints: QuizPointRow[];
    user: AppUser | null;
    userRole: string | null | undefined;
    studentProfile: {
        student: StudentWithClass;
        assignments: { class_id: string; assignment_role: string; subject_name: string | null }[];
        classes: unknown[];
    } | undefined;
    subjectToApply: string;
}

export function useStudentTabFilters({
    studentDetails,
    selectedSemesterId,
    academicRecords,
    quizPoints,
    user,
    userRole,
    studentProfile,
    subjectToApply,
}: UseStudentTabFiltersParams) {
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
                : studentDetails.violations.filter(r => !r.semester_id || r.semester_id === selectedSemesterId);
        return dedupeViolations(semesterScopedViolations);
    }, [studentDetails, selectedSemesterId]);

    const filteredAcademicRecords = useMemo(() => {
        const semesterScopedRecords = !selectedSemesterId
            ? academicRecords
            : academicRecords.filter(r => !r.semester_id || r.semester_id === selectedSemesterId);
        return dedupeAcademicRecords(semesterScopedRecords);
    }, [academicRecords, selectedSemesterId]);

    const filteredQuizPoints = useMemo(() => {
        const semesterScopedQuizPoints = !selectedSemesterId
            ? quizPoints
            : quizPoints.filter(r => !r.semester_id || r.semester_id === selectedSemesterId);
        return dedupeQuizPoints(semesterScopedQuizPoints);
    }, [quizPoints, selectedSemesterId]);

    const availableFilteredQuizPoints = useMemo(
        () => getAvailableQuizPoints(filteredQuizPoints),
        [filteredQuizPoints]
    );

    const filteredExtracurriculars = useMemo(() => {
        if (!studentDetails?.studentExtracurriculars) return [];
        if (!selectedSemesterId) return studentDetails.studentExtracurriculars;
        return studentDetails.studentExtracurriculars.filter(r => !r.semester_id || r.semester_id === selectedSemesterId);
    }, [studentDetails, selectedSemesterId]);

    const filteredExAttendance = useMemo(() => {
        if (!studentDetails?.extracurricularAttendance) return [];
        if (!selectedSemesterId) return studentDetails.extracurricularAttendance;
        return studentDetails.extracurricularAttendance.filter(r => !r.semester_id || r.semester_id === selectedSemesterId);
    }, [studentDetails, selectedSemesterId]);

    const filteredExGrades = useMemo(() => {
        if (!studentDetails?.extracurricularGrades) return [];
        if (!selectedSemesterId) return studentDetails.extracurricularGrades;
        return studentDetails.extracurricularGrades.filter(r => !r.semester_id || r.semester_id === selectedSemesterId);
    }, [studentDetails, selectedSemesterId]);

    const totalViolationPoints = useMemo(
        () => filteredViolations.reduce((sum, v) => sum + v.points, 0) || 0,
        [filteredViolations]
    );

    const communicationSignals = useMemo(() => buildStudentCommunicationSignals({
        studentName: studentDetails?.student.name || 'Siswa',
        academicRecords: filteredAcademicRecords,
        attendanceRecords: filteredAttendance,
        violations: filteredViolations,
    }), [studentDetails?.student.name, filteredAcademicRecords, filteredAttendance, filteredViolations]);

    const uniqueSubjectsForGrades = useMemo((): (string | null)[] => {
        const records = filteredAcademicRecords as AcademicRecordRow[];
        const subjects = records.map(r => r.subject);
        const unique = [...new Set(subjects)];

        // Walas or admin has access to all subjects
        const isWalas = studentProfile?.student?.classes?.user_id === user?.id ||
            (studentProfile?.assignments || []).some(
                (a) => a.class_id === studentProfile?.student?.class_id && a.assignment_role === 'homeroom'
            );

        if (isWalas || userRole === 'admin') {
            return unique;
        }

        // Subject teacher: only allow subjects they teach in this class
        const taughtSubjects = new Set(
            (studentProfile?.assignments || [])
                .filter((a) => a.class_id === studentProfile?.student?.class_id && a.assignment_role === 'subject_teacher' && a.subject_name)
                .map((a) => a.subject_name!.trim().toLowerCase())
        );

        return unique.filter(s => s && taughtSubjects.has(s.trim().toLowerCase()));
    }, [filteredAcademicRecords, studentProfile, user, userRole]);

    const currentRecordForSubject = useMemo(() => {
        if (!subjectToApply) return null;
        return getLatestRecordForSubject(filteredAcademicRecords, subjectToApply);
    }, [subjectToApply, filteredAcademicRecords]);

    return {
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
    };
}
