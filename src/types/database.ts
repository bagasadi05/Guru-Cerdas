/**
 * @fileoverview Centralized database type definitions
 * 
 * This file consolidates all database-related type definitions derived from
 * the Supabase database schema. All components and services should import
 * types from here instead of directly from database.types.ts.
 * 
 * @module types/database
 */

import { Database } from '../services/database.types';

// =============================================================================
// TABLE ROW TYPES
// =============================================================================

/**
 * Represents a student record from the database.
 * Contains basic student information including name, class assignment, and avatar.
 */
export type StudentRow = Database['public']['Tables']['students']['Row'];

/**
 * Represents a class/homeroom record from the database.
 * Contains class name, grade level, and teacher assignment.
 */
export type ClassRow = Database['public']['Tables']['classes']['Row'];

/**
 * Represents an attendance record from the database.
 * Contains student attendance status for a specific date.
 */
export type AttendanceRow = Database['public']['Tables']['attendance']['Row'];

/**
 * Represents a task/assignment record from the database.
 * Contains task details, due dates, and completion status.
 */
export type TaskRow = Database['public']['Tables']['tasks']['Row'];

/**
 * Represents a schedule entry from the database.
 * Contains subject, day, time slot, and class assignment.
 */
export type ScheduleRow = Database['public']['Tables']['schedules']['Row'];

/**
 * Represents an academic record (grade) from the database.
 * Contains subject, assessment type, score, and student reference.
 */
export type AcademicRecordRow = Database['public']['Tables']['academic_records']['Row'];

/**
 * Represents a violation/discipline record from the database.
 * Contains violation type, points, and student reference.
 */
export type ViolationRow = Database['public']['Tables']['violations']['Row'];

/**
 * Represents a report/evaluation record from the database.
 * Contains semester report data for a student.
 */
export type ReportRow = Database['public']['Tables']['reports']['Row'];

/**
 * Represents a quiz point record from the database.
 * Contains gamification points earned from quizzes.
 */
export type QuizPointRow = Database['public']['Tables']['quiz_points']['Row'];

/**
 * Represents a communication/message record from the database.
 * Contains parent-teacher communication messages.
 */
export type CommunicationRow = Database['public']['Tables']['communications']['Row'];

/**
 * Represents an academic year.
 */
export type AcademicYearRow = Database['public']['Tables']['academic_years']['Row'];

/**
 * Represents a semester.
 */
export type SemesterRow = Database['public']['Tables']['semesters']['Row'];

// =============================================================================
// INSERT TYPES
// =============================================================================

/**
 * Type for inserting a new attendance record.
 */
export type AttendanceInsert = Database['public']['Tables']['attendance']['Insert'];

/**
 * Type for inserting a new student record.
 */
export type StudentInsert = Database['public']['Tables']['students']['Insert'];

/**
 * Type for inserting a new class record.
 */
export type ClassInsert = Database['public']['Tables']['classes']['Insert'];

/**
 * Type for inserting a new task record.
 */
export type TaskInsert = Database['public']['Tables']['tasks']['Insert'];

/**
 * Type for inserting a new schedule record.
 */
export type ScheduleInsert = Database['public']['Tables']['schedules']['Insert'];

/**
 * Type for inserting a new academic record.
 */
export type AcademicRecordInsert = Database['public']['Tables']['academic_records']['Insert'];

/**
 * Type for inserting a new violation record.
 */
export type ViolationInsert = Database['public']['Tables']['violations']['Insert'];

/**
 * Type for inserting a new report record.
 */
export type ReportInsert = Database['public']['Tables']['reports']['Insert'];

/**
 * Type for inserting a new quiz point record.
 */
export type QuizPointInsert = Database['public']['Tables']['quiz_points']['Insert'];

/**
 * Type for inserting a new communication record.
 */
export type CommunicationInsert = Database['public']['Tables']['communications']['Insert'];

/**
 * Type for inserting a new academic year.
 */
export type AcademicYearInsert = Database['public']['Tables']['academic_years']['Insert'];

/**
 * Type for inserting a new semester.
 */
export type SemesterInsert = Database['public']['Tables']['semesters']['Insert'];

// =============================================================================
// UPDATE TYPES
// =============================================================================

/**
 * Type for updating an existing student record.
 */
export type StudentUpdate = Database['public']['Tables']['students']['Update'];

/**
 * Type for updating an existing class record.
 */
export type ClassUpdate = Database['public']['Tables']['classes']['Update'];

/**
 * Type for updating an existing attendance record.
 */
export type AttendanceUpdate = Database['public']['Tables']['attendance']['Update'];

/**
 * Type for updating an existing task record.
 */
export type TaskUpdate = Database['public']['Tables']['tasks']['Update'];

/**
 * Type for updating an existing schedule record.
 */
export type ScheduleUpdate = Database['public']['Tables']['schedules']['Update'];

/**
 * Type for updating an existing academic record.
 */
export type AcademicRecordUpdate = Database['public']['Tables']['academic_records']['Update'];

/**
 * Type for updating an existing violation record.
 */
export type ViolationUpdate = Database['public']['Tables']['violations']['Update'];

/**
 * Type for updating an existing report record.
 */
export type ReportUpdate = Database['public']['Tables']['reports']['Update'];

/**
 * Type for updating an existing quiz point record.
 */
export type QuizPointUpdate = Database['public']['Tables']['quiz_points']['Update'];

/**
 * Type for updating an existing communication record.
 */
export type CommunicationUpdate = Database['public']['Tables']['communications']['Update'];

/**
 * Type for updating an existing academic year.
 */
export type AcademicYearUpdate = Database['public']['Tables']['academic_years']['Update'];

/**
 * Type for updating an existing semester.
 */
export type SemesterUpdate = Database['public']['Tables']['semesters']['Update'];

// =============================================================================
// COMPOSITE/DERIVED TYPES
// =============================================================================

/**
 * Student with their associated class information.
 * Used when displaying student lists with class names.
 */
export type StudentWithClass = StudentRow & {
    classes: Pick<ClassRow, 'id' | 'name'> | null;
};

/**
 * Minimal student data for list views and selection.
 */
export type StudentListItem = Pick<StudentRow, 'id' | 'name' | 'avatar_url' | 'class_id'>;

/**
 * Minimal class data for dropdowns and references.
 */
export type ClassListItem = Pick<ClassRow, 'id' | 'name'>;

/**
 * Academic record with minimal fields for aggregation.
 */
export type AcademicRecordSummary = Pick<AcademicRecordRow, 'student_id' | 'subject' | 'score' | 'assessment_name'>;

/**
 * Violation record with minimal fields for aggregation.
 */
export type ViolationSummary = Pick<ViolationRow, 'student_id' | 'points'>;

/**
 * Weekly attendance data point for charts.
 */
export interface WeeklyAttendance {
    /** Day name (e.g., "Senin", "Selasa") */
    day: string;
    /** Percentage of students present (0-100) */
    present_percentage: number;
}

/**
 * Daily attendance summary for dashboard.
 */
export interface DailyAttendanceSummary {
    /** Number of students present */
    present: number;
    /** Total number of attendance records for the day */
    total: number;
}

// =============================================================================
// RE-EXPORT DATABASE TYPE FOR DIRECT ACCESS
// =============================================================================

export type { Database };
