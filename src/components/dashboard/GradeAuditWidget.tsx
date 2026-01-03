/**
 * @fileoverview Grade Audit Widget Component
 * 
 * This component provides a grade completeness checker for teachers,
 * allowing them to see which students are missing grades for specific
 * subjects and assessments.
 * 
 * Features:
 * - Filter by class, subject, and assessment
 * - Progress bar showing completion percentage
 * - Quick action to navigate to mass grade input
 * 
 * @module components/dashboard/GradeAuditWidget
 */

import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { UserMinusIcon, ClipboardPenIcon, CheckCircleIcon } from '../Icons';
import { Select } from '../ui/Select';
import { Button } from '../ui/Button';
import type { DashboardQueryData } from '../../types';

// =============================================================================
// TYPES
// =============================================================================

interface GradeAuditWidgetProps {
    /** Dashboard data containing students, classes, and academic records */
    data: DashboardQueryData;
}

interface StudentMissingGrade {
    id: string;
    name: string;
    avatar_url?: string | null;
    class_id: string | null;
    className: string;
    missingAssessment?: string;
    missingAssessments?: string[];
}

// =============================================================================
// COMPONENT
// =============================================================================

/**
 * Widget for auditing grade completeness across subjects and assessments.
 * 
 * Allows teachers to:
 * - Select a class to filter students
 * - Select a subject to check
 * - Select a specific assessment or check all
 * - View progress percentage
 * - Navigate to mass input to complete missing grades
 * 
 * @param props - Component props
 * @param props.data - Dashboard data from useDashboardData hook
 * 
 * @example
 * ```tsx
 * <GradeAuditWidget data={dashboardData} />
 * ```
 */
const GradeAuditWidget: React.FC<GradeAuditWidgetProps> = ({ data }) => {
    const navigate = useNavigate();

    // Filter states - using empty string as "unset" sentinel
    const [subjectForCheckInput, setSubjectForCheckInput] = useState<string | null>(null);
    const [assessmentForCheckInput, setAssessmentForCheckInput] = useState<string | null>(null);
    const [selectedClass, setSelectedClass] = useState('');

    // ==========================================================================
    // DERIVED DATA
    // ==========================================================================

    /**
     * Get unique subjects from academic records.
     */
    const uniqueSubjects = useMemo(() => {
        const { academicRecords } = data;
        if (!academicRecords) return [];
        const subjects = new Set(academicRecords.map(r => r.subject));
        return Array.from(subjects).sort();
    }, [data]);

    /**
     * Effective subject for check - uses first available if not explicitly set.
     * This avoids the need for useEffect to set default value.
     */
    const subjectForCheck = useMemo(() => {
        if (subjectForCheckInput !== null) return subjectForCheckInput;
        return uniqueSubjects.length > 0 ? uniqueSubjects[0] : '';
    }, [subjectForCheckInput, uniqueSubjects]);

    /**
     * Handler to update subject and reset assessment.
     */
    const setSubjectForCheck = (value: string) => {
        setSubjectForCheckInput(value);
        setAssessmentForCheckInput(null); // Reset assessment when subject changes
    };

    /**
     * Effective assessment for check.
     */
    const assessmentForCheck = assessmentForCheckInput ?? '';

    /**
     * Handler to update assessment.
     */
    const setAssessmentForCheck = (value: string) => {
        setAssessmentForCheckInput(value || null);
    };

    /**
     * Get unique assessments for the selected subject.
     * Filtered by class if one is selected.
     */
    const uniqueAssessmentsForSubject = useMemo(() => {
        const { academicRecords, students } = data;
        if (!subjectForCheck || !academicRecords || !students) return [];

        // If a class is selected, only consider records for students in that class
        let relevantStudentIds: Set<string> | null = null;
        if (selectedClass) {
            relevantStudentIds = new Set(
                students
                    .filter(s => s.class_id === selectedClass)
                    .map(s => s.id)
            );
        }

        const assessmentNames = academicRecords
            .filter(r => {
                if (r.subject !== subjectForCheck) return false;
                if (!r.assessment_name) return false;
                if (relevantStudentIds && !relevantStudentIds.has(r.student_id)) return false;
                return true;
            })
            .map(r => r.assessment_name!.trim());

        return [...new Set(assessmentNames)]
            .filter(Boolean)
            .sort((a, b) => a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' }));
    }, [data, subjectForCheck, selectedClass]);

    /**
     * Calculate students missing grades for the selected subject/assessment.
     */
    const studentsMissingGrade: StudentMissingGrade[] = useMemo(() => {
        if (!subjectForCheck || !data.students || !data.academicRecords || !data.classes) {
            return [];
        }

        const classMap = new Map(data.classes.map(c => [c.id, c.name]));

        // Filter students by class if selected
        let targetStudents = data.students;
        if (selectedClass) {
            targetStudents = targetStudents.filter(s => s.class_id === selectedClass);
        }

        if (assessmentForCheck) {
            // Check specific assessment
            const gradedStudentIds = new Set(
                data.academicRecords
                    .filter(r => r.subject === subjectForCheck && r.assessment_name === assessmentForCheck)
                    .map(r => r.student_id)
            );

            return targetStudents
                .filter(s => !gradedStudentIds.has(s.id))
                .map(s => ({
                    ...s,
                    className: classMap.get(s.class_id ?? '') || 'N/A',
                    missingAssessment: assessmentForCheck
                }));
        } else {
            // Check all assessments for this subject
            if (uniqueAssessmentsForSubject.length === 0) return [];

            return targetStudents
                .map(s => {
                    const studentRecords = data.academicRecords.filter(
                        r => r.student_id === s.id && r.subject === subjectForCheck
                    );
                    const studentAssessments = new Set(studentRecords.map(r => r.assessment_name));
                    const missingAssessments = uniqueAssessmentsForSubject.filter(
                        a => !studentAssessments.has(a)
                    );

                    return {
                        ...s,
                        className: classMap.get(s.class_id ?? '') || 'N/A',
                        missingAssessments
                    };
                })
                .filter(s => s.missingAssessments.length > 0);
        }
    }, [subjectForCheck, assessmentForCheck, data, selectedClass, uniqueAssessmentsForSubject]);

    /**
     * Calculate total students for completion percentage.
     */
    const totalStudentsForCheck = useMemo(() => {
        const { students } = data;
        if (!students) return 0;
        if (selectedClass) {
            return students.filter(s => s.class_id === selectedClass).length;
        }
        return students.length;
    }, [data, selectedClass]);

    /**
     * Calculate completion percentage.
     */
    const completionPercentage = useMemo(() => {
        if (totalStudentsForCheck === 0) return 0;
        return Math.round(
            ((totalStudentsForCheck - studentsMissingGrade.length) / totalStudentsForCheck) * 100
        );
    }, [totalStudentsForCheck, studentsMissingGrade.length]);

    // ==========================================================================
    // HANDLERS
    // ==========================================================================

    /**
     * Navigate to mass input page with pre-filled data.
     */
    const handleOpenMassInput = () => {
        if (!subjectForCheck) return;

        let classIdToPass: string | null = selectedClass || null;
        if (!classIdToPass && studentsMissingGrade.length > 0) {
            classIdToPass = studentsMissingGrade[0].class_id;
        }

        let assessmentToPass = assessmentForCheck;
        if (!assessmentToPass && studentsMissingGrade.length > 0 && studentsMissingGrade[0].missingAssessments) {
            assessmentToPass = studentsMissingGrade[0].missingAssessments[0];
        }

        navigate('/input-massal', {
            state: {
                prefill: {
                    mode: 'subject_grade',
                    classId: classIdToPass,
                    subject: subjectForCheck,
                    assessment_name: assessmentToPass
                }
            }
        });
    };

    // ==========================================================================
    // RENDER
    // ==========================================================================

    return (
        <div className="glass-card rounded-3xl p-0 overflow-hidden flex flex-col">
            {/* Header */}
            <div className="p-6 border-b border-slate-200/50 dark:border-white/5 bg-gradient-to-r from-amber-500/5 to-transparent">
                <div className="flex items-center justify-between">
                    <div>
                        <h3 className="font-bold text-lg text-slate-800 dark:text-white tracking-wide">
                            Audit Nilai
                        </h3>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                            Cek kelengkapan penilaian siswa
                        </p>
                    </div>
                    <div className="w-10 h-10 rounded-full bg-amber-100 dark:bg-amber-500/20 flex items-center justify-center">
                        <UserMinusIcon className="w-5 h-5 text-amber-500" />
                    </div>
                </div>
            </div>

            {/* Content */}
            <div className="p-6 flex-1 flex flex-col">
                {/* Filters */}
                <div className="space-y-4 mb-4">
                    <Select
                        value={selectedClass}
                        onChange={(e) => setSelectedClass(e.target.value)}
                        className="bg-white/50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700 rounded-xl"
                    >
                        <option value="">Semua Kelas</option>
                        {data.classes.map(c => (
                            <option key={c.id} value={c.id}>{c.name}</option>
                        ))}
                    </Select>

                    <div className="flex gap-3">
                        <Select
                            value={subjectForCheck}
                            onChange={(e) => setSubjectForCheck(e.target.value)}
                            className="flex-1 bg-white/50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700 rounded-xl"
                        >
                            <option value="" disabled>Mapel</option>
                            {uniqueSubjects.map((subject) => (
                                <option key={subject} value={subject}>{subject}</option>
                            ))}
                        </Select>

                        <Select
                            value={assessmentForCheck}
                            onChange={(e) => setAssessmentForCheck(e.target.value)}
                            className="flex-1 bg-white/50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700 rounded-xl"
                            disabled={uniqueAssessmentsForSubject.length === 0}
                        >
                            <option value="">Semua</option>
                            {uniqueAssessmentsForSubject.map((assessment) => (
                                <option key={assessment} value={assessment}>{assessment}</option>
                            ))}
                        </Select>
                    </div>
                </div>

                {/* Progress Section */}
                {subjectForCheck ? (
                    <div className="flex-1">
                        {/* Progress Header */}
                        <div className="flex justify-between text-xs mb-2 font-bold uppercase tracking-wider">
                            <span className="text-slate-400">Progres</span>
                            <span className={`${completionPercentage === 100 ? 'text-green-500' : 'text-indigo-500'}`}>
                                {completionPercentage}%
                            </span>
                        </div>

                        {/* Progress Bar */}
                        <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-3 overflow-hidden mb-4">
                            <div
                                className={`h-full rounded-full transition-all duration-1000 ease-out ${completionPercentage === 100 ? 'bg-green-500' : 'bg-indigo-500'
                                    }`}
                                style={{ width: `${completionPercentage}%` }}
                            />
                        </div>

                        {/* Action Button or Completion Message */}
                        {studentsMissingGrade.length > 0 ? (
                            <div className="mt-auto">
                                <Button
                                    onClick={handleOpenMassInput}
                                    className="w-full bg-indigo-600 hover:bg-indigo-700 text-white shadow-lg shadow-indigo-500/20 rounded-xl"
                                    size="sm"
                                >
                                    <ClipboardPenIcon className="w-4 h-4 mr-2" />
                                    Lengkapi ({studentsMissingGrade.length})
                                </Button>
                            </div>
                        ) : (
                            <div className="mt-auto text-center py-2 text-green-500 font-medium text-sm flex items-center justify-center gap-2">
                                <CheckCircleIcon className="w-4 h-4" />
                                Lengkap!
                            </div>
                        )}
                    </div>
                ) : (
                    <div className="flex-1 flex items-center justify-center text-slate-400 text-sm">
                        Pilih mapel untuk cek
                    </div>
                )}
            </div>
        </div>
    );
};

export default GradeAuditWidget;
