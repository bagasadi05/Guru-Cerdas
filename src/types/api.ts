/**
 * @fileoverview API and data fetching type definitions
 * 
 * This file contains types for API responses, request payloads,
 * and data structures used in service layer communications.
 * 
 * @module types/api
 */

import type {
    StudentListItem,
    ClassListItem,
    TaskRow,
    ScheduleRow,
    AcademicRecordSummary,
    ViolationSummary,
    WeeklyAttendance,
    DailyAttendanceSummary,
} from './database';

// =============================================================================
// DASHBOARD API TYPES
// =============================================================================

/**
 * Complete data structure returned by the dashboard query.
 * Contains all statistics and records needed for the main dashboard view.
 */
export interface DashboardQueryData {
    /** List of students with basic info */
    students: StudentListItem[];
    /** Active/pending tasks */
    tasks: TaskRow[];
    /** Today's schedule entries */
    schedule: ScheduleRow[];
    /** List of classes */
    classes: ClassListItem[];
    /** Today's attendance summary */
    dailyAttendanceSummary: DailyAttendanceSummary;
    /** Last 5 days attendance trend */
    weeklyAttendance: WeeklyAttendance[];
    /** Academic records for grade analysis */
    academicRecords: AcademicRecordSummary[];
    /** Violation records for points calculation */
    violations: ViolationSummary[];
}

// =============================================================================
// AI INSIGHT TYPES
// =============================================================================

/**
 * Individual student highlight/concern in AI analysis.
 */
export interface StudentInsightItem {
    /** Name of the student */
    student_name: string;
    /** Reason for highlighting this student */
    reason: string;
    /** Optional student ID for linking */
    student_id?: string;
}

/**
 * AI-generated daily insight structure.
 * Contains analysis of student performance and class recommendations.
 */
export interface AiInsight {
    /** Students with positive achievements */
    positive_highlights: StudentInsightItem[];
    /** Students needing attention */
    areas_for_attention: StudentInsightItem[];
    /** General suggestion for class focus today */
    class_focus_suggestion: string;
}

/**
 * Stored AI insight with date for caching.
 */
export interface StoredInsight {
    /** Date of generation in YYYY-MM-DD format */
    date: string;
    /** The generated insight */
    insight: AiInsight;
}

/**
 * AI-generated student summary for reports.
 */
export interface AiStudentSummary {
    /** Overall evaluation text */
    general_evaluation: string;
    /** List of student strengths */
    strengths: string[];
    /** Areas needing development */
    development_focus: string[];
    /** Recommendations for improvement */
    recommendations: string[];
}

// =============================================================================
// EXPORT TYPES
// =============================================================================

/**
 * Column configuration for export operations.
 */
export interface ExportColumn {
    /** Unique key/identifier for the column */
    key: string;
    /** Display label for the column header */
    label: string;
    /** Whether the column is selected for export */
    selected: boolean;
}

/**
 * Student data prepared for export.
 */
export interface ExportableStudentData {
    /** Student ID */
    id: string;
    /** Student name */
    name: string;
    /** Class name */
    class_name: string;
    /** NIS (Student ID Number) if available */
    nis?: string;
    /** Additional data fields */
    [key: string]: string | number | undefined;
}

/**
 * Attendance data prepared for export.
 */
export interface ExportableAttendanceData {
    /** Student ID */
    student_id: string;
    /** Student name */
    student_name: string;
    /** Date of attendance */
    date: string;
    /** Attendance status */
    status: string;
    /** Optional note */
    note?: string;
}

// =============================================================================
// SEARCH TYPES
// =============================================================================

/**
 * Search result item structure.
 */
export interface SearchResult {
    /** Unique identifier */
    id: string;
    /** Type of result for categorization */
    type: 'student' | 'class' | 'attendance' | 'task';
    /** Main display text */
    title: string;
    /** Secondary display text */
    subtitle: string;
    /** Additional metadata for the result */
    metadata?: Record<string, unknown>;
}

// =============================================================================
// VALIDATION TYPES
// =============================================================================

/**
 * Single validation rule definition.
 */
export interface ValidationRule<T = unknown> {
    /**
     * Validation function that returns true if valid.
     * @param value - The value to validate
     * @returns true if validation passes
     */
    validate: (value: T) => boolean;
    /** Error message to display when validation fails */
    message: string;
}

/**
 * Collection of validation rules keyed by field name.
 */
export type ValidationRules<T extends Record<string, unknown> = Record<string, unknown>> = {
    [K in keyof T]?: ValidationRule<T[K]>[];
};

/**
 * Validation result for a single field.
 */
export interface ValidationResult {
    /** Whether the value is valid */
    isValid: boolean;
    /** Error messages if validation failed */
    errors: string[];
}

/**
 * Form validation state.
 */
export interface FormValidationState<T extends Record<string, unknown>> {
    /** Validation errors by field name */
    errors: Partial<Record<keyof T, string[]>>;
    /** Whether the entire form is valid */
    isValid: boolean;
    /** Whether validation has been triggered */
    touched: Partial<Record<keyof T, boolean>>;
}

// =============================================================================
// OFFLINE QUEUE TYPES
// =============================================================================

/**
 * Priority levels for offline queue operations.
 */
export enum QueuePriority {
    LOW = 1,
    NORMAL = 2,
    HIGH = 3,
}

/**
 * Offline queue item structure.
 */
export interface QueueItem<T = unknown> {
    /** Unique identifier for the queue item */
    id: string;
    /** Type of operation (e.g., 'attendance', 'student') */
    type: string;
    /** HTTP method or operation type */
    operation: 'insert' | 'update' | 'delete';
    /** Data payload for the operation */
    data: T;
    /** Timestamp when the item was queued */
    timestamp: number;
    /** Number of retry attempts */
    retryCount: number;
    /** Priority level for processing order */
    priority: QueuePriority;
    /** Optional conflict data if sync failed */
    conflictWith?: T;
}

/**
 * Sync status information.
 */
export interface SyncStatus {
    /** Whether sync is currently in progress */
    isSyncing: boolean;
    /** Number of items pending sync */
    pendingCount: number;
    /** Number of items with conflicts */
    conflictCount: number;
    /** Last successful sync timestamp */
    lastSyncAt: number | null;
    /** Error message if last sync failed */
    lastError: string | null;
}

// =============================================================================
// BACKUP TYPES
// =============================================================================

/**
 * Complete backup data structure.
 */
export interface BackupData {
    /** Backup format version */
    version: string;
    /** Backup creation timestamp */
    timestamp: string;
    /** All student records */
    students: import('./database').StudentRow[];
    /** All class records */
    classes: import('./database').ClassRow[];
    /** All attendance records */
    attendance: import('./database').AttendanceRow[];
    /** All task records */
    tasks: import('./database').TaskRow[];
    /** All schedule records */
    schedules: import('./database').ScheduleRow[];
    /** All academic records */
    academic_records: import('./database').AcademicRecordRow[];
    /** All violation records */
    violations: import('./database').ViolationRow[];
}

// =============================================================================
// ANALYTICS TYPES
// =============================================================================

/**
 * AI-generated attendance analysis.
 */
export interface AiAnalysis {
    /** Students with perfect attendance */
    perfect_attendance: string[];
    /** Students with frequent absences */
    frequent_absentees: {
        student_name: string;
        absent_days: number;
    }[];
    /** Pattern warnings detected */
    pattern_warnings: {
        pattern_description: string;
        implicated_students: string[];
    }[];
}
