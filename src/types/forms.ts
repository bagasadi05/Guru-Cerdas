/**
 * @fileoverview Form-related type definitions
 * 
 * This file contains type definitions for form handling, validation,
 * and form state management throughout the application.
 * 
 * @module types/forms
 */

// =============================================================================
// VALIDATION TYPES
// =============================================================================

/**
 * Validation error for a specific field.
 */
export interface FieldError {
    /** The field identifier */
    field: string;
    /** Error message to display */
    message: string;
    /** Error type/code for programmatic handling */
    type?: 'required' | 'minLength' | 'maxLength' | 'pattern' | 'custom';
}

/**
 * Form validation state.
 */
export interface FormValidationState {
    /** Whether the form is currently valid */
    isValid: boolean;
    /** Array of field errors */
    errors: FieldError[];
    /** Fields that have been touched/interacted with */
    touchedFields: Set<string>;
    /** Whether validation is in progress */
    isValidating: boolean;
}

/**
 * Validation rule configuration.
 */
export interface ValidationRuleConfig {
    /** Rule type */
    type: 'required' | 'minLength' | 'maxLength' | 'pattern' | 'email' | 'custom';
    /** Value for the rule (e.g., min length number) */
    value?: unknown;
    /** Error message when validation fails */
    message: string;
    /** Custom validation function */
    validate?: (value: unknown) => boolean;
}

// =============================================================================
// STUDENT FORM TYPES
// =============================================================================

/**
 * Form data for creating/editing a student.
 */
export interface StudentFormData {
    /** Student's full name */
    name: string;
    /** Class ID the student belongs to */
    class_id: string;
    /** Student's gender */
    gender: 'Laki-laki' | 'Perempuan';
    /** Optional avatar URL */
    avatar_url?: string;
    /** Optional access code for parent portal */
    access_code?: string;
}

/**
 * Form state for student form modal.
 */
export interface StudentFormState {
    /** Current form data */
    data: StudentFormData;
    /** Form mode - add or edit */
    mode: 'add' | 'edit';
    /** Whether the form is submitting */
    isSubmitting: boolean;
    /** Validation errors */
    errors: FieldError[];
}

// =============================================================================
// CLASS FORM TYPES
// =============================================================================

/**
 * Form data for creating/editing a class.
 */
export interface ClassFormData {
    /** Class name (e.g., "5A", "Kelas 6B") */
    name: string;
}

/**
 * Form state for class form modal.
 */
export interface ClassFormState {
    /** Current form data */
    data: ClassFormData;
    /** Form mode */
    mode: 'add' | 'edit';
    /** Whether submitting */
    isSubmitting: boolean;
    /** Validation errors */
    errors: FieldError[];
}

// =============================================================================
// ATTENDANCE FORM TYPES
// =============================================================================

/**
 * Attendance status options.
 */
export type AttendanceStatusValue = 'Hadir' | 'Izin' | 'Sakit' | 'Alpha';

/**
 * Single attendance entry form data.
 */
export interface AttendanceEntryData {
    /** Student ID */
    student_id: string;
    /** Attendance status */
    status: AttendanceStatusValue;
    /** Optional note */
    note?: string;
}

/**
 * Bulk attendance form data.
 */
export interface BulkAttendanceFormData {
    /** Date for attendance */
    date: string;
    /** Class ID */
    class_id: string;
    /** Array of attendance entries */
    entries: AttendanceEntryData[];
}

// =============================================================================
// ACADEMIC RECORD FORM TYPES
// =============================================================================

/**
 * Form data for creating/editing an academic record (grade).
 */
export interface AcademicRecordFormData {
    /** Student ID */
    student_id: string;
    /** Subject name */
    subject: string;
    /** Assessment name (e.g., "UTS", "Quiz 1") */
    assessment_name: string;
    /** Score value */
    score: number;
    /** Date of assessment */
    date?: string;
    /** Notes about the grade */
    notes?: string;
}

/**
 * Bulk grade input form data.
 */
export interface BulkGradeFormData {
    /** Class ID */
    class_id: string;
    /** Subject */
    subject: string;
    /** Assessment name */
    assessment_name: string;
    /** Date of assessment */
    date: string;
    /** Array of student grades */
    grades: Array<{
        student_id: string;
        score: number;
    }>;
}

// =============================================================================
// VIOLATION FORM TYPES
// =============================================================================

/**
 * Form data for recording a violation.
 */
export interface ViolationFormData {
    /** Student ID */
    student_id: string;
    /** Type of violation */
    type: string;
    /** Description of the violation */
    description?: string;
    /** Points assigned */
    points: number;
    /** Date of violation */
    date: string;
}

// =============================================================================
// TASK FORM TYPES
// =============================================================================

/**
 * Form data for creating/editing a task.
 */
export interface TaskFormData {
    /** Task title */
    title: string;
    /** Task description */
    description?: string;
    /** Due date */
    due_date: string;
    /** Task priority */
    priority?: 'low' | 'medium' | 'high';
    /** Task status */
    status?: 'todo' | 'in_progress' | 'done';
}

// =============================================================================
// SCHEDULE FORM TYPES
// =============================================================================

/**
 * Form data for creating/editing a schedule entry.
 */
export interface ScheduleFormData {
    /** Day of week */
    day: 'Senin' | 'Selasa' | 'Rabu' | 'Kamis' | 'Jumat' | 'Sabtu';
    /** Subject name */
    subject: string;
    /** Start time (HH:MM format) */
    start_time: string;
    /** End time (HH:MM format) */
    end_time: string;
    /** Optional class ID */
    class_id?: string;
}

// =============================================================================
// COMMUNICATION FORM TYPES
// =============================================================================

/**
 * Form data for sending a communication message.
 */
export interface CommunicationFormData {
    /** Student ID (for context) */
    student_id: string;
    /** Message content */
    message: string;
    /** Message type */
    type?: 'announcement' | 'report' | 'complaint' | 'chat';
}

// =============================================================================
// REPORT FORM TYPES
// =============================================================================

/**
 * Form data for creating a student report.
 */
export interface ReportFormData {
    /** Student ID */
    student_id: string;
    /** Report type */
    type: 'progress' | 'behavior' | 'completion' | 'other';
    /** Report content */
    content: string;
    /** Semester */
    semester?: number;
}

// =============================================================================
// FORM HOOK TYPES
// =============================================================================

/**
 * Generic form state return type.
 */
export interface UseFormStateReturn<T> {
    /** Current form values */
    values: T;
    /** Set a single field value */
    setValue: <K extends keyof T>(field: K, value: T[K]) => void;
    /** Set all values */
    setValues: (values: Partial<T>) => void;
    /** Reset form to initial values */
    reset: () => void;
    /** Whether any field has been modified */
    isDirty: boolean;
    /** Array of validation errors */
    errors: FieldError[];
    /** Validate the form */
    validate: () => boolean;
}

/**
 * Field registration for form hook.
 */
export interface FieldRegistration {
    /** Field name */
    name: string;
    /** Current value */
    value: unknown;
    /** onChange handler */
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => void;
    /** onBlur handler */
    onBlur: () => void;
    /** Whether field has error */
    hasError: boolean;
    /** Error message if any */
    errorMessage?: string;
}
