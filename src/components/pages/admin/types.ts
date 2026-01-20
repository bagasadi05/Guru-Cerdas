/**
 * Shared types for Admin page components
 */

export interface UserRoleRecord {
    user_id: string;
    role: string | null;
    email: string | null;
    full_name: string | null;
    created_at?: string;
    deleted_at?: string | null;
}

export interface SystemStats {
    totalUsers: number;
    totalClasses: number;
    totalStudents: number;
    totalAttendance: number;
    totalGrades: number;
    totalTasks: number;
    admins: number;
    teachers: number;
    students: number;
}

export interface Announcement {
    id: string;
    title: string;
    content: string;
    audience_type: string | null;
    date: string | null;
    created_at: string | null;
}

export interface AuditLog {
    id: string;
    created_at: string;
    user_email: string | null;
    table_name: string;
    action: string;
    record_id: string | null;
    old_data: Record<string, unknown> | null;
    new_data: Record<string, unknown> | null;
}

export type TabType = 'overview' | 'users' | 'announcements' | 'activity' | 'system';

export type AnnouncementTemplateIcon =
    | 'calendar'
    | 'clipboard-check'
    | 'file-text'
    | 'users'
    | 'heart-pulse'
    | 'bus'
    | 'graduation-cap'
    | 'trophy'
    | 'credit-card'
    | 'flag';

export interface AnnouncementTemplate {
    id: string;
    title: string;
    content: string;
    audience_type: string;
    category: string;
    icon: AnnouncementTemplateIcon;
}

export interface SystemHealth {
    database: 'healthy' | 'degraded' | 'down';
    api: 'healthy' | 'degraded' | 'down';
    lastChecked: Date | null;
    databaseLatencyMs: number | null;
    apiLatencyMs: number | null;
}

export interface DeleteModalState {
    show: boolean;
    user: UserRoleRecord | null;
}

export interface UndoToastState {
    show: boolean;
    user: UserRoleRecord | null;
    timeout: NodeJS.Timeout | null;
}
