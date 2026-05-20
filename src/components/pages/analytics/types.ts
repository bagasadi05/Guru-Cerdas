import { Database } from '../../../services/database.types';

export interface AttendanceStats {
    total: number;
    hadir: number;
    izin: number;
    sakit: number;
    alpha: number;
    hadirRate: number;
}

export interface ClassStats {
    id: string;
    name: string;
    studentCount: number;
    attendanceRate: number;
    avgGrade?: number;
}

export interface DailyAttendance {
    date: string;
    hadir: number;
    izin: number;
    sakit: number;
    alpha: number;
    total: number;
}

export type AnalyticsClass = Pick<Database['public']['Tables']['classes']['Row'], 'id' | 'name'>;
export type Student = Pick<Database['public']['Tables']['students']['Row'], 'id' | 'name' | 'class_id' | 'gender'>;
export type AnalyticsAttendance = Pick<Database['public']['Tables']['attendance']['Row'], 'student_id' | 'date' | 'status'>;
export type AnalyticsTask = Pick<Database['public']['Tables']['tasks']['Row'], 'id' | 'status' | 'due_date'>;
export type AnalyticsAcademicRecord = Pick<Database['public']['Tables']['academic_records']['Row'], 'student_id' | 'score' | 'subject' | 'assessment_name' | 'created_at'>;
export type AnalyticsViolation = Pick<Database['public']['Tables']['violations']['Row'], 'id' | 'student_id' | 'type' | 'points' | 'date' | 'created_at'>;
export type AnalyticsQuizPoint = Pick<Database['public']['Tables']['quiz_points']['Row'], 'id' | 'student_id' | 'points' | 'category' | 'created_at'>;

export interface AtRiskItem {
    student: Student;
    reason: 'attendance' | 'academic' | 'both';
    details: string;
}

export interface GradeDistribution {
    label: string;
    range: string;
    count: number;
    color: string;
    percentage: number;
}

export interface AnalyticsDataPayload {
    classes: AnalyticsClass[];
    students: Student[];
    attendance: AnalyticsAttendance[];
    tasks: AnalyticsTask[];
    academicRecords: AnalyticsAcademicRecord[];
    violations: AnalyticsViolation[];
    quizPoints: AnalyticsQuizPoint[];
    
    // Processed stats (can be moved out or kept depending on who calculates them)
    // We will calculate them in a view model hook
}
