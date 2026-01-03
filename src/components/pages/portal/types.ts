/**
 * Parent Portal Types
 * 
 * Type definitions for the Parent Portal feature
 */

// Student Information
export interface PortalStudentInfo {
    id: string;
    name: string;
    gender: 'Laki-laki' | 'Perempuan';
    class_id: string;
    avatar_url: string | null;
    access_code: string | null;
    parent_name: string | null;
    parent_phone: string | null;
    classes: { name: string };
}

// Reports
export interface PortalReport {
    id: string;
    title: string;
    type: string;
    content: string;
    created_at: string;
}

// Attendance
export interface PortalAttendance {
    id: string;
    date: string;
    status: 'Hadir' | 'Izin' | 'Sakit' | 'Alpha';
    notes: string | null;
}

// Academic Records
export interface PortalAcademicRecord {
    id: string;
    subject: string;
    score: number;
    notes: string;
    assessment_name: string | null;
}

// Violations
export interface PortalViolation {
    id: string;
    date: string;
    type: string;
    points: number;
    description: string | null;
}

// Quiz Points
export interface PortalQuizPoint {
    id: string;
    points: number;
    type: string;
    reason: string;
    created_at: string;
}

// Communications
export interface PortalCommunication {
    id: string;
    content: string;
    is_from_teacher: boolean;
    is_read: boolean;
    created_at: string;
    sender: 'parent' | 'teacher';
    // Optional attachment fields
    attachment_url?: string;
    attachment_type?: 'image' | 'document';
    attachment_name?: string;
}

// Schedule
export interface PortalSchedule {
    id: string;
    day: string;
    start_time: string;
    end_time: string;
    subject: string;
}

// Tasks
export interface PortalTask {
    id: string;
    title: string;
    description: string | null;
    status: 'todo' | 'in_progress' | 'done';
    due_date: string | null;
}

// Announcements
export interface PortalAnnouncement {
    id: string;
    title: string;
    content: string;
    date: string | null;
    audience_type: string | null;
}

// School Info
export interface PortalSchoolInfo {
    school_name: string;
    school_address?: string;
    semester?: string;
    academic_year?: string;
}

// Teacher Info
export type TeacherInfo = {
    user_id: string;
    full_name: string;
    avatar_url: string;
} | null;

// Complete Portal Data
export interface PortalData {
    student: PortalStudentInfo;
    reports: PortalReport[];
    attendanceRecords: PortalAttendance[];
    academicRecords: PortalAcademicRecord[];
    violations: PortalViolation[];
    quizPoints: PortalQuizPoint[];
    communications: PortalCommunication[];
    schedules: PortalSchedule[];
    tasks: PortalTask[];
    announcements: PortalAnnouncement[];
    teacher: TeacherInfo;
    schoolInfo: PortalSchoolInfo;
}

// Attendance Summary
export interface AttendanceSummary {
    present: number;
    sick: number;
    permission: number;
    absent: number;
}

// Communication Modal State
export interface CommunicationModalState {
    type: 'closed' | 'edit' | 'delete';
    data: PortalCommunication | null;
}
