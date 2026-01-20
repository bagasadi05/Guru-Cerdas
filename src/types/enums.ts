/**
 * @fileoverview Centralized enum definitions
 * 
 * This file contains all enum types used throughout the application.
 * Enums provide type-safe constants for status values, categories, and modes.
 * 
 * @module types/enums
 */

// =============================================================================
// ATTENDANCE ENUMS
// =============================================================================

/**
 * Attendance status options for student daily attendance.
 * 
 * @example
 * ```typescript
 * const status: AttendanceStatus = AttendanceStatus.Hadir;
 * ```
 */
export enum AttendanceStatus {
    /** Student is present */
    Hadir = 'Hadir',
    /** Student has permission/leave */
    Izin = 'Izin',
    /** Student is sick */
    Sakit = 'Sakit',
    /** Student is absent without permission */
    Alpha = 'Alpha',
    /** Day is a holiday */
    Libur = 'Libur',
}

/**
 * Array of all attendance status values for iteration.
 */
export const ATTENDANCE_STATUS_VALUES = Object.values(AttendanceStatus);

// =============================================================================
// TASK ENUMS
// =============================================================================

/**
 * Task completion status options.
 */
export enum TaskStatus {
    /** Task is pending, not started */
    todo = 'todo',
    /** Task is currently being worked on */
    in_progress = 'in_progress',
    /** Task is completed */
    done = 'done',
}

/**
 * Task priority levels.
 */
export enum TaskPriority {
    /** Low priority task */
    low = 'low',
    /** Medium priority task */
    medium = 'medium',
    /** High priority task */
    high = 'high',
}

// =============================================================================
// EXPORT ENUMS
// =============================================================================

/**
 * Available export file formats.
 */
export enum ExportFormat {
    /** PDF document format */
    pdf = 'pdf',
    /** Microsoft Excel format */
    excel = 'excel',
    /** Comma-separated values format */
    csv = 'csv',
}

// =============================================================================
// INPUT MODE ENUMS
// =============================================================================

/**
 * Mass input mode options for bulk data entry.
 */
export enum InputMode {
    /** Quiz score input */
    quiz = 'quiz',
    /** Subject grade input */
    subject_grade = 'subject_grade',
    /** Violation record input */
    violation = 'violation',
    /** Violation export operation */
    violation_export = 'violation_export',
    /** Bulk report generation */
    bulk_report = 'bulk_report',
    /** Academic record printing */
    academic_print = 'academic_print',
    /** Delete subject grades */
    delete_subject_grade = 'delete_subject_grade',
}

// =============================================================================
// SORT/FILTER ENUMS
// =============================================================================

/**
 * Sort direction options.
 */
export enum SortDirection {
    /** Ascending order (A-Z, 0-9) */
    asc = 'asc',
    /** Descending order (Z-A, 9-0) */
    desc = 'desc',
}

/**
 * Student filter options for mass input.
 */
export enum StudentFilter {
    /** Show all students */
    all = 'all',
    /** Show selected students only */
    selected = 'selected',
    /** Show unselected students only */
    unselected = 'unselected',
    /** Show students with grades only */
    graded = 'graded',
    /** Show students without grades only */
    ungraded = 'ungraded',
}

// =============================================================================
// SCHEDULE ENUMS
// =============================================================================

/**
 * Days of the week in Indonesian.
 */
export enum DayOfWeek {
    Senin = 'Senin',
    Selasa = 'Selasa',
    Rabu = 'Rabu',
    Kamis = 'Kamis',
    Jumat = 'Jumat',
    Sabtu = 'Sabtu',
    Minggu = 'Minggu',
}

/**
 * Array of weekday values for iteration (Monday-Saturday).
 */
export const WEEKDAYS = [
    DayOfWeek.Senin,
    DayOfWeek.Selasa,
    DayOfWeek.Rabu,
    DayOfWeek.Kamis,
    DayOfWeek.Jumat,
    DayOfWeek.Sabtu,
];

// =============================================================================
// MODAL/VIEW MODE ENUMS
// =============================================================================

/**
 * View mode options for student list display.
 */
export enum ViewMode {
    /** Table/list view */
    table = 'table',
    /** Card/grid view */
    card = 'card',
}

/**
 * Modal operation modes.
 */
export enum ModalMode {
    /** Adding new record */
    add = 'add',
    /** Editing existing record */
    edit = 'edit',
    /** Viewing record details */
    view = 'view',
}

// =============================================================================
// NOTIFICATION ENUMS
// =============================================================================

/**
 * Toast notification types.
 */
export enum ToastType {
    /** Success message */
    success = 'success',
    /** Error message */
    error = 'error',
    /** Warning message */
    warning = 'warning',
    /** Informational message */
    info = 'info',
}
