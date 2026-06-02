/**
 * @fileoverview Grade Audit Hook
 *
 * Extracts the "kelengkapan nilai" (grade completion) logic
 * from DashboardPage into a reusable hook.
 *
 * @module hooks/useGradeAudit
 */

import { useState, useMemo, useEffect } from 'react';
import type { DashboardQueryData } from '../types';

interface UseGradeAuditOptions {
  data: DashboardQueryData | undefined;
}

interface GradeAuditResult {
  /** Unique subject names from academic records */
  uniqueSubjects: string[];
  /** Currently selected subject */
  subjectForCompletionCheck: string;
  /** Set the subject for grade audit */
  setSubjectForCompletionCheck: (subject: string) => void;
  /** Currently selected assessment (empty = all) */
  assessmentForCompletionCheck: string;
  /** Set the assessment for grade audit */
  setAssessmentForCompletionCheck: (assessment: string) => void;
  /** Selected class filter (empty = all) */
  selectedClassForCheck: string;
  /** Set the class filter */
  setSelectedClassForCheck: (classId: string) => void;
  /** Unique assessment names for the selected subject */
  uniqueAssessmentsForSubject: string[];
  /** Students missing grades for the selected subject/assessment */
  studentsMissingGrade: Array<{
    id: string;
    name: string;
    class_id: string | null;
    className: string;
    missingAssessment?: string;
    missingAssessments?: string[];
  }>;
  /** Total students being checked */
  totalStudentsForCheck: number;
  /** Completion percentage */
  completionPercentage: number;
}

export function useGradeAudit({ data }: UseGradeAuditOptions): GradeAuditResult {
  const [subjectForCompletionCheck, setSubjectForCompletionCheck] = useState('');
  const [assessmentForCompletionCheck, setAssessmentForCompletionCheck] = useState('');
  const [selectedClassForCheck, setSelectedClassForCheck] = useState('');

  const uniqueSubjects = useMemo(() => {
    const academicRecords = data?.academicRecords;
    if (!academicRecords) return [];
    const subjects = new Set(academicRecords.map((r) => r.subject));
    return Array.from(subjects).sort();
  }, [data]);

  const uniqueAssessmentsForSubject = useMemo(() => {
    const academicRecords = data?.academicRecords;
    const students = data?.students;
    if (!subjectForCompletionCheck || !academicRecords || !students) return [];

    let relevantStudentIds: Set<string> | null = null;
    if (selectedClassForCheck) {
      relevantStudentIds = new Set(
        students.filter((s) => s.class_id === selectedClassForCheck).map((s) => s.id),
      );
    }

    const assessmentNames = academicRecords
      .filter((r) => {
        if (r.subject !== subjectForCompletionCheck) return false;
        if (!r.assessment_name) return false;
        if (relevantStudentIds && !relevantStudentIds.has(r.student_id)) return false;
        return true;
      })
      .map((r) => r.assessment_name!.trim());

    return [...new Set(assessmentNames)].filter(Boolean).sort((a, b) =>
      a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' }),
    );
  }, [data, subjectForCompletionCheck, selectedClassForCheck]);

  // Auto-select first subject when data arrives
  const defaultSubject = uniqueSubjects.length > 0 ? uniqueSubjects[0] : '';
  useEffect(() => {
    if (defaultSubject && !subjectForCompletionCheck) {
      const timer = setTimeout(() => setSubjectForCompletionCheck(defaultSubject), 0);
      return () => clearTimeout(timer);
    }
  }, [defaultSubject, subjectForCompletionCheck]);

  // Reset assessment when subject changes
  const handleSubjectChange = (subject: string) => {
    setSubjectForCompletionCheck(subject);
    setAssessmentForCompletionCheck('');
  };

  const studentsMissingGrade = useMemo(() => {
    if (!subjectForCompletionCheck || !data?.students || !data?.academicRecords || !data?.classes)
      return [];

    const classMap = new Map((data.classes || []).map((c) => [c.id, c.name]));

    let targetStudents = data.students;
    if (selectedClassForCheck) {
      targetStudents = targetStudents.filter((s) => s.class_id === selectedClassForCheck);
    }

    if (assessmentForCompletionCheck) {
      const gradedStudentIds = new Set(
        data.academicRecords
          .filter(
            (r) =>
              r.subject === subjectForCompletionCheck &&
              r.assessment_name === assessmentForCompletionCheck,
          )
          .map((r) => r.student_id),
      );

      return targetStudents
        .filter((s) => !gradedStudentIds.has(s.id))
        .map((s) => ({
          ...s,
          className: classMap.get(s.class_id ?? '') || 'N/A',
          missingAssessment: assessmentForCompletionCheck,
        }));
    }

    if (uniqueAssessmentsForSubject.length === 0) return [];

    return targetStudents
      .map((s) => {
        const studentRecords = data.academicRecords.filter(
          (r) => r.student_id === s.id && r.subject === subjectForCompletionCheck,
        );
        const studentAssessments = new Set(studentRecords.map((r) => r.assessment_name));
        const missingAssessments = uniqueAssessmentsForSubject.filter(
          (a) => !studentAssessments.has(a),
        );
        return { ...s, className: classMap.get(s.class_id ?? '') || 'N/A', missingAssessments };
      })
      .filter((s) => (s.missingAssessments?.length ?? 0) > 0);
  }, [
    subjectForCompletionCheck,
    assessmentForCompletionCheck,
    data,
    selectedClassForCheck,
    uniqueAssessmentsForSubject,
  ]);

  const totalStudentsForCheck = useMemo(() => {
    const students = data?.students;
    if (!students) return 0;
    if (selectedClassForCheck) {
      return students.filter((s) => s.class_id === selectedClassForCheck).length;
    }
    return students.length;
  }, [data, selectedClassForCheck]);

  const completionPercentage = useMemo(() => {
    if (totalStudentsForCheck === 0) return 0;
    return Math.round(
      ((totalStudentsForCheck - studentsMissingGrade.length) / totalStudentsForCheck) * 100,
    );
  }, [totalStudentsForCheck, studentsMissingGrade.length]);

  return {
    uniqueSubjects,
    subjectForCompletionCheck,
    setSubjectForCompletionCheck: handleSubjectChange,
    assessmentForCompletionCheck,
    setAssessmentForCompletionCheck,
    selectedClassForCheck,
    setSelectedClassForCheck,
    uniqueAssessmentsForSubject,
    studentsMissingGrade,
    totalStudentsForCheck,
    completionPercentage,
  };
}
