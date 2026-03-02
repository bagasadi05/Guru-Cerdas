/**
 * @fileoverview Custom hook for dashboard statistics calculation
 * 
 * Calculates various dashboard metrics including attendance, tasks, schedules,
 * and grade audit functionality.
 * 
 * @module hooks/useDashboardStats
 */

import React, { useMemo, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import type { Database } from '../types';

type StudentRow = Database['public']['Tables']['students']['Row'];
type TaskRow = Database['public']['Tables']['tasks']['Row'];
type ScheduleRow = Database['public']['Tables']['schedules']['Row'];
type ClassRow = Database['public']['Tables']['classes']['Row'];
type AcademicRecord = Database['public']['Tables']['academic_records']['Row'];

export interface DashboardStatsData {
  students: Pick<StudentRow, 'id' | 'name' | 'class_id'>[];
  tasks: TaskRow[];
  schedule: ScheduleRow[];
  classes: Pick<ClassRow, 'id' | 'name'>[];
  dailyAttendanceSummary: { present: number; total: number };
  academicRecords: Pick<AcademicRecord, 'student_id' | 'subject' | 'score' | 'assessment_name' | 'created_at'>[];
}

export interface DashboardStat {
  label: string;
  value: number | string;
  subValue?: string;
  icon: React.ComponentType<{ className?: string }> | string;
  link: string;
  color: string;
}

export interface GradeAuditResult {
  /** Students missing grades */
  studentsMissingGrade: Array<{
    id: string;
    name: string;
    class_id: string | null;
    className: string;
    missingAssessment?: string;
    missingAssessments?: string[];
  }>;
  /** Unique subjects available */
  uniqueSubjects: string[];
  /** Unique assessments for selected subject */
  uniqueAssessments: string[];
  /** Selected subject */
  selectedSubject: string;
  /** Selected assessment (optional) */
  selectedAssessment: string;
  /** Selected class for filtering */
  selectedClass: string;
  /** Completion percentage */
  completionPercentage: number;
  /** Total students being checked */
  totalStudents: number;
  /** Change subject handler */
  handleSubjectChange: (subject: string) => void;
  /** Change assessment handler */
  handleAssessmentChange: (assessment: string) => void;
  /** Change class handler */
  handleClassChange: (classId: string) => void;
  /** Navigate to mass input with prefilled data */
  navigateToMassInput: () => void;
}

/**
 * Calculates dashboard statistics.
 */
export const useDashboardStats = (
  data: DashboardStatsData | null,
  currentTime: Date
): DashboardStat[] => {
  return useMemo(() => {
    if (!data) return [];

    const { students, tasks, schedule, classes, dailyAttendanceSummary } = data;

    // Calculate attendance percentage
    const attendancePercentage =
      students.length > 0
        ? Math.round((dailyAttendanceSummary?.present || 0) / students.length * 100)
        : 0;

    // Find next class
    let nextClassIndex = -1;
    for (let i = 0; i < schedule.length; i++) {
      const item = schedule[i];
      const [startH, startM] = item.start_time.split(':').map(Number);
      const startTime = new Date(currentTime);
      startTime.setHours(startH, startM, 0, 0);
      if (startTime > currentTime) {
        nextClassIndex = i;
        break;
      }
    }

    // Icon names as strings - components will map these to actual icon components
    return [
      {
        label: 'Peserta Didik',
        value: students.length,
        icon: 'UsersIcon',
        link: '/siswa',
        color: 'from-sky-500 to-blue-600',
        subValue: `${classes.length} kelas`,
      },
      {
        label: 'Kehadiran',
        value: `${attendancePercentage}%`,
        subValue: `${dailyAttendanceSummary?.present || 0}/${students.length} hadir`,
        icon: 'CheckSquareIcon',
        link: '/absensi',
        color: 'from-emerald-500 to-green-600',
      },
      {
        label: 'Tugas Aktif',
        value: tasks.length,
        icon: 'BookOpenIcon',
        link: '/tugas',
        color: 'from-amber-500 to-orange-600',
        subValue: 'tugas',
      },
      {
        label: 'Jadwal',
        value: schedule.length,
        icon: 'CalendarIcon',
        link: '/jadwal',
        color: 'from-violet-500 to-purple-600',
        subValue:
          nextClassIndex >= 0
            ? `Next: ${schedule[nextClassIndex]?.subject.slice(0, 8)}...`
            : 'Selesai',
      },
    ];
  }, [data, currentTime]);
};

/**
 * Manages grade audit functionality.
 */
export const useGradeAudit = (data: DashboardStatsData | null): GradeAuditResult => {
  const navigate = useNavigate();
  const [selectedSubject, setSelectedSubject] = useState('');
  const [selectedAssessment, setSelectedAssessment] = useState('');
  const [selectedClass, setSelectedClass] = useState('');

  // Get unique subjects
  const uniqueSubjects = useMemo(() => {
    if (!data?.academicRecords) return [];
    const subjects = new Set(data.academicRecords.map((r) => r.subject));
    return Array.from(subjects).sort();
  }, [data]);

  // Get unique assessments for selected subject
  const uniqueAssessments = useMemo(() => {
    if (!selectedSubject || !data?.academicRecords || !data?.students) return [];

    let relevantStudentIds: Set<string> | null = null;
    if (selectedClass) {
      relevantStudentIds = new Set(
        data.students.filter((s) => s.class_id === selectedClass).map((s) => s.id)
      );
    }

    const assessmentNames = data.academicRecords
      .filter((r) => {
        if (r.subject !== selectedSubject) return false;
        if (!r.assessment_name) return false;
        if (relevantStudentIds && !relevantStudentIds.has(r.student_id)) return false;
        return true;
      })
      .map((r) => r.assessment_name!.trim());

    const unique = [...new Set(assessmentNames)].filter(Boolean);
    return unique.sort((a, b) => a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' }));
  }, [data, selectedSubject, selectedClass]);

  // Set default subject when available (using initialization instead of effect)
  React.useEffect(() => {
    if (uniqueSubjects.length > 0 && !selectedSubject) {
      // Use setTimeout to avoid setState during render
      const timer = setTimeout(() => {
        setSelectedSubject(uniqueSubjects[0]);
      }, 0);
      return () => clearTimeout(timer);
    }
  }, [uniqueSubjects, selectedSubject]);

  // Calculate students missing grades
  const studentsMissingGrade = useMemo(() => {
    if (!selectedSubject || !data?.students || !data?.academicRecords || !data?.classes) {
      return [];
    }

    const classMap = new Map(data.classes.map((c) => [c.id, c.name]));

    let targetStudents = data.students;
    if (selectedClass) {
      targetStudents = targetStudents.filter((s) => s.class_id === selectedClass);
    }

    if (selectedAssessment) {
      // Check for specific assessment
      const gradedStudentIds = new Set(
        data.academicRecords
          .filter(
            (r) =>
              r.subject === selectedSubject && r.assessment_name === selectedAssessment
          )
          .map((r) => r.student_id)
      );

      return targetStudents
        .filter((s) => !gradedStudentIds.has(s.id))
        .map((s) => ({
          ...s,
          className: classMap.get(s.class_id ?? '') || 'N/A',
          missingAssessment: selectedAssessment,
        }));
    } else {
      // Check for all assessments
      if (uniqueAssessments.length === 0) return [];

      return targetStudents
        .map((s) => {
          const studentRecords = data.academicRecords.filter(
            (r) => r.student_id === s.id && r.subject === selectedSubject
          );
          const studentAssessments = new Set(studentRecords.map((r) => r.assessment_name));

          const missingAssessments = uniqueAssessments.filter(
            (a) => !studentAssessments.has(a)
          );

          return {
            ...s,
            className: classMap.get(s.class_id ?? '') || 'N/A',
            missingAssessments,
          };
        })
        .filter((s) => s.missingAssessments && s.missingAssessments.length > 0);
    }
  }, [selectedSubject, selectedAssessment, selectedClass, uniqueAssessments, data]);

  // Calculate total students for check
  const totalStudents = useMemo(() => {
    if (!data?.students) return 0;
    if (selectedClass) {
      return data.students.filter((s) => s.class_id === selectedClass).length;
    }
    return data.students.length;
  }, [data, selectedClass]);

  // Calculate completion percentage
  const completionPercentage = useMemo(() => {
    if (totalStudents === 0) return 0;
    return Math.round(((totalStudents - studentsMissingGrade.length) / totalStudents) * 100);
  }, [totalStudents, studentsMissingGrade.length]);

  // Handlers
  const handleSubjectChange = useCallback((subject: string) => {
    setSelectedSubject(subject);
    setSelectedAssessment('');
  }, []);

  const handleAssessmentChange = useCallback((assessment: string) => {
    setSelectedAssessment(assessment);
  }, []);

  const handleClassChange = useCallback((classId: string) => {
    setSelectedClass(classId);
  }, []);

  const navigateToMassInput = useCallback(() => {
    if (!selectedSubject) return;

    let classIdToPass: string | null = selectedClass || null;
    if (!classIdToPass && studentsMissingGrade.length > 0) {
      classIdToPass = studentsMissingGrade[0].class_id;
    }

    let assessmentToPass = selectedAssessment;
    if (!assessmentToPass && studentsMissingGrade.length > 0 && 'missingAssessments' in studentsMissingGrade[0]) {
      const missingStudent = studentsMissingGrade[0] as { missingAssessments: string[] };
      assessmentToPass = missingStudent.missingAssessments[0] ?? '';
    }

    navigate('/input-massal', {
      state: {
        prefill: {
          mode: 'subject_grade',
          classId: classIdToPass,
          subject: selectedSubject,
          assessment_name: assessmentToPass,
        },
      },
    });
  }, [selectedSubject, selectedClass, selectedAssessment, studentsMissingGrade, navigate]);

  return {
    studentsMissingGrade,
    uniqueSubjects,
    uniqueAssessments,
    selectedSubject,
    selectedAssessment,
    selectedClass,
    completionPercentage,
    totalStudents,
    handleSubjectChange,
    handleAssessmentChange,
    handleClassChange,
    navigateToMassInput,
  };
};
