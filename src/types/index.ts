import { Database } from '../services/database.types';

// Core database types
export type StudentRow = Database['public']['Tables']['students']['Row'];
export type ClassRow = Database['public']['Tables']['classes']['Row'];
export type AttendanceRow = Database['public']['Tables']['attendance']['Row'];
export type AttendanceInsert = Database['public']['Tables']['attendance']['Insert'];
export type TaskRow = Database['public']['Tables']['tasks']['Row'];
export type ScheduleRow = Database['public']['Tables']['schedules']['Row'];
export type AcademicRecordRow = Database['public']['Tables']['academic_records']['Row'];
export type ViolationRow = Database['public']['Tables']['violations']['Row'];

// Enums
export enum AttendanceStatus {
    Hadir = 'Hadir',
    Izin = 'Izin',
    Sakit = 'Sakit',
    Alpha = 'Alpha',
}

export enum TaskStatus {
    todo = 'todo',
    in_progress = 'in_progress',
    done = 'done',
}

// Composite types
export type StudentWithClass = StudentRow & {
    classes: Pick<ClassRow, 'name'> | null
};

export type AttendanceRecord = {
    id?: string;
    status: AttendanceStatus;
    note: string;
};

// Validation types
export type ValidationRule = {
    validate: (value: any) => boolean;
    message: string;
};

export type ValidationRules = Record<string, ValidationRule[]>;

// Export types
export type ExportFormat = 'pdf' | 'excel' | 'csv';
export type ExportColumn = {
    key: string;
    label: string;
    selected: boolean;
};

// Search types
export type SearchResult = {
    id: string;
    type: 'student' | 'class' | 'attendance' | 'task';
    title: string;
    subtitle: string;
    metadata?: Record<string, any>;
};

// Backup types
export type BackupData = {
    version: string;
    timestamp: string;
    students: StudentRow[];
    classes: ClassRow[];
    attendance: AttendanceRow[];
    tasks: TaskRow[];
    schedules: ScheduleRow[];
    academic_records: AcademicRecordRow[];
    violations: ViolationRow[];
};

export type AiAnalysis = {
    perfect_attendance: string[];
    frequent_absentees: { student_name: string; absent_days: number; }[];
    pattern_warnings: { pattern_description: string; implicated_students: string[]; }[];
};

