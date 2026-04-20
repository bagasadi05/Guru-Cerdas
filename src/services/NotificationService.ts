/**
 * Notification Service
 * 
 * Provides task notification functionality including due task detection,
 * notification preferences, and reminder management.
 * 
 * @module services/NotificationService
 * @since 1.0.0
 */

import { supabase } from './supabase';

/**
 * Notification types
 */
export type NotificationType = 'task_due' | 'task_overdue' | 'attendance_reminder' | 'message' | 'grade_trend' | 'system';

export interface Notification {
    id: string;
    type: NotificationType;
    title: string;
    message: string;
    timestamp: Date;
    read: boolean;
    metadata?: Record<string, any>;
    link?: string;
}

export interface NotificationPreferences {
    taskReminders: boolean;
    taskReminderHours: number; // hours before due date
    dailyDigest: boolean;
    attendanceReminders: boolean;
    messageNotifications: boolean;
}

export interface DueTask {
    id: string;
    title: string;
    description?: string;
    due_date: string;
    status: string;
    isOverdue: boolean;
    hoursUntilDue: number;
}

// Storage keys
const NOTIFICATIONS_KEY = 'portal_guru_notifications';
const PREFERENCES_KEY = 'portal_guru_notification_prefs';
const LAST_CHECK_KEY = 'portal_guru_last_notification_check';

/**
 * Default notification preferences
 */
const DEFAULT_PREFERENCES: NotificationPreferences = {
    taskReminders: true,
    taskReminderHours: 24,
    dailyDigest: false,
    attendanceReminders: true,
    messageNotifications: true,
};

/**
 * Get notifications from storage
 */
export const getNotifications = (): Notification[] => {
    try {
        const stored = localStorage.getItem(NOTIFICATIONS_KEY);
        if (!stored) return [];
        return JSON.parse(stored).map((n: any) => ({
            ...n,
            timestamp: new Date(n.timestamp),
        }));
    } catch {
        return [];
    }
};

/**
 * Save notifications to storage
 */
const saveNotifications = (notifications: Notification[]): void => {
    localStorage.setItem(NOTIFICATIONS_KEY, JSON.stringify(notifications));
    if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('portal-guru-notifications-updated'));
    }
};

/**
 * Add a new notification
 */
export const addNotification = (notification: Omit<Notification, 'id' | 'timestamp' | 'read'>): void => {
    const notifications = getNotifications();
    const duplicateKey = notification.metadata?.taskId
        ?? notification.metadata?.messageId
        ?? notification.metadata?.attendanceId
        ?? notification.metadata?.gradeTrendId
        ?? notification.metadata?.systemId;

    // Only deduplicate notifications that expose a stable entity id.
    const isDuplicate = duplicateKey
        ? notifications.some(n => {
            const existingKey = n.metadata?.taskId
                ?? n.metadata?.messageId
                ?? n.metadata?.attendanceId
                ?? n.metadata?.gradeTrendId
                ?? n.metadata?.systemId;
            return n.type === notification.type && existingKey === duplicateKey;
        })
        : false;

    if (isDuplicate) return;

    const newNotification: Notification = {
        ...notification,
        id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        timestamp: new Date(),
        read: false,
    };

    notifications.unshift(newNotification);

    // Keep only last 50 notifications
    saveNotifications(notifications.slice(0, 50));
};

/**
 * Mark notification as read
 */
export const markAsRead = (notificationId: string): void => {
    const notifications = getNotifications();
    const index = notifications.findIndex(n => n.id === notificationId);

    if (index !== -1) {
        notifications[index].read = true;
        saveNotifications(notifications);
    }
};

/**
 * Mark all notifications as read
 */
export const markAllAsRead = (): void => {
    const notifications = getNotifications();
    notifications.forEach(n => n.read = true);
    saveNotifications(notifications);
};

/**
 * Clear all notifications
 */
export const clearNotifications = (): void => {
    localStorage.removeItem(NOTIFICATIONS_KEY);
    if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('portal-guru-notifications-updated'));
    }
};

/**
 * Get unread notification count
 */
export const getUnreadCount = (): number => {
    return getNotifications().filter(n => !n.read).length;
};

/**
 * Get notification preferences
 */
export const getPreferences = (): NotificationPreferences => {
    try {
        const stored = localStorage.getItem(PREFERENCES_KEY);
        if (!stored) return DEFAULT_PREFERENCES;
        return { ...DEFAULT_PREFERENCES, ...JSON.parse(stored) };
    } catch {
        return DEFAULT_PREFERENCES;
    }
};

/**
 * Save notification preferences
 */
export const savePreferences = (prefs: Partial<NotificationPreferences>): void => {
    const current = getPreferences();
    localStorage.setItem(PREFERENCES_KEY, JSON.stringify({ ...current, ...prefs }));
};

/**
 * Get tasks that are due soon or overdue
 */
export const getDueTasks = async (userId: string): Promise<DueTask[]> => {
    const { data: tasks, error } = await supabase
        .from('tasks')
        .select('id, title, description, due_date, status')
        .eq('user_id', userId)
        .neq('status', 'done')
        .not('due_date', 'is', null)
        .order('due_date', { ascending: true });

    if (error) {
        console.error('Error fetching due tasks for notifications:', error);
        return [];
    }

    if (!tasks) return [];

    const now = new Date();
    const preferences = getPreferences();

    return tasks
        .filter(task => task.due_date !== null)
        .map(task => {
            const dueDate = new Date(task.due_date!);
            const timeDiff = dueDate.getTime() - now.getTime();
            const hoursUntilDue = timeDiff / (1000 * 60 * 60);

            return {
                id: task.id,
                title: task.title,
                description: task.description ?? undefined,
                due_date: task.due_date!,
                status: task.status,
                isOverdue: timeDiff < 0,
                hoursUntilDue: Math.round(hoursUntilDue),
            };
        })
        .filter(task => task.isOverdue || task.hoursUntilDue <= preferences.taskReminderHours);
};

const getTodayDateKey = (): string => {
    const now = new Date();
    const offsetMs = now.getTimezoneOffset() * 60 * 1000;
    return new Date(now.getTime() - offsetMs).toISOString().slice(0, 10);
};

const checkAttendanceReminder = async (userId: string): Promise<void> => {
    const preferences = getPreferences();
    if (!preferences.attendanceReminders) return;

    const today = getTodayDateKey();
    const [{ data: students, error: studentsError }, { data: attendance, error: attendanceError }] = await Promise.all([
        supabase
            .from('students')
            .select('id')
            .eq('user_id', userId),
        supabase
            .from('attendance')
            .select('id')
            .eq('user_id', userId)
            .eq('date', today),
    ]);

    if (studentsError || attendanceError) {
        console.error('Error checking attendance notification:', studentsError || attendanceError);
        return;
    }

    const totalStudents = students?.length || 0;
    const recorded = attendance?.length || 0;
    const missing = Math.max(totalStudents - recorded, 0);

    if (totalStudents > 0 && missing > 0) {
        addNotification({
            type: 'attendance_reminder',
            title: 'Absensi hari ini belum lengkap',
            message: `${missing} dari ${totalStudents} siswa belum tercatat absensinya.`,
            metadata: { attendanceId: `attendance-${today}` },
            link: '/absensi',
        });
    }
};

const checkUnreadParentMessages = async (userId: string): Promise<void> => {
    const preferences = getPreferences();
    if (!preferences.messageNotifications) return;

    const { data: messages, error } = await supabase
        .from('communications')
        .select('id, student_id, message, created_at')
        .eq('user_id', userId)
        .eq('sender', 'parent')
        .eq('is_read', false)
        .order('created_at', { ascending: false })
        .limit(5);

    if (error) {
        console.error('Error checking unread parent messages:', error);
        return;
    }

    if (!messages || messages.length === 0) return;

    const firstMessage = messages[0];
    addNotification({
        type: 'message',
        title: messages.length === 1 ? 'Pesan wali belum dibaca' : `${messages.length} pesan wali belum dibaca`,
        message: messages.length === 1
            ? firstMessage.message
            : 'Buka komunikasi siswa untuk meninjau pesan terbaru dari wali murid.',
        metadata: { messageId: `unread-parent-${firstMessage.id}` },
        link: `/siswa/${firstMessage.student_id}`,
    });
};

const checkGradeTrendNotifications = async (userId: string): Promise<void> => {
    const { data: records, error } = await supabase
        .from('academic_records')
        .select('student_id, subject, score, created_at')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(80);

    if (error) {
        console.error('Error checking grade trend notifications:', error);
        return;
    }

    if (!records || records.length === 0) return;

    const grouped = new Map<string, typeof records>();
    records.forEach((record) => {
        const key = `${record.student_id}:${record.subject}`;
        grouped.set(key, [...(grouped.get(key) || []), record]);
    });

    const gradeDrop = Array.from(grouped.values())
        .map((items) => [...items].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()))
        .filter((items) => items.length >= 2)
        .map(([latest, previous]) => ({
            studentId: latest.student_id,
            subject: latest.subject,
            createdAt: latest.created_at,
            drop: previous.score - latest.score,
        }))
        .filter((item) => item.drop >= 10)
        .sort((a, b) => b.drop - a.drop)[0];

    if (!gradeDrop) return;

    const { data: student } = await supabase
        .from('students')
        .select('name')
        .eq('id', gradeDrop.studentId)
        .maybeSingle();

    addNotification({
        type: 'grade_trend',
        title: 'Tren nilai siswa menurun',
        message: `${student?.name || 'Siswa'} turun ${gradeDrop.drop} poin pada ${gradeDrop.subject}.`,
        metadata: { gradeTrendId: `${gradeDrop.studentId}-${gradeDrop.subject}-${gradeDrop.createdAt}` },
        link: `/siswa/${gradeDrop.studentId}`,
    });
};

/**
 * Check for due tasks and create notifications
 */
export const checkAndNotify = async (userId: string, preloadedDueTasks?: DueTask[]): Promise<number> => {
    const preferences = getPreferences();

    const lastCheck = localStorage.getItem(LAST_CHECK_KEY);
    const now = Date.now();

    // Don't check more than once per 15 minutes
    if (lastCheck && now - parseInt(lastCheck) < 15 * 60 * 1000) {
        return getUnreadCount();
    }

    localStorage.setItem(LAST_CHECK_KEY, now.toString());

    const dueTasks = preferences.taskReminders ? (preloadedDueTasks ?? await getDueTasks(userId)) : [];
    let newNotifications = 0;

    for (const task of dueTasks) {
        if (task.isOverdue) {
            addNotification({
                type: 'task_overdue',
                title: 'Tugas Terlambat!',
                message: `"${task.title}" sudah melewati deadline.`,
                metadata: { taskId: task.id },
                link: '/tugas',
            });
            newNotifications++;
        } else if (task.hoursUntilDue <= 24) {
            addNotification({
                type: 'task_due',
                title: 'Tugas Hampir Deadline',
                message: `"${task.title}" deadline dalam ${task.hoursUntilDue} jam.`,
                metadata: { taskId: task.id, hoursLeft: task.hoursUntilDue },
                link: '/tugas',
            });
            newNotifications++;
        }
    }

    await Promise.all([
        checkAttendanceReminder(userId),
        checkUnreadParentMessages(userId),
        checkGradeTrendNotifications(userId),
    ]);

    return getUnreadCount();
};

/**
 * Format time ago string
 */
export const formatTimeAgo = (date: Date): string => {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffMins < 1) return 'Baru saja';
    if (diffMins < 60) return `${diffMins} menit lalu`;
    if (diffHours < 24) return `${diffHours} jam lalu`;
    if (diffDays < 7) return `${diffDays} hari lalu`;
    return date.toLocaleDateString('id-ID');
};

/**
 * Get notification icon based on type
 */
export const getNotificationIcon = (type: NotificationType): string => {
    switch (type) {
        case 'task_due':
            return '⏰';
        case 'task_overdue':
            return '🚨';
        case 'attendance_reminder':
            return '📋';
        case 'message':
            return '💬';
        case 'grade_trend':
            return 'trending-down';
        case 'system':
        default:
            return '🔔';
    }
};

export default {
    getNotifications,
    addNotification,
    markAsRead,
    markAllAsRead,
    clearNotifications,
    getUnreadCount,
    getPreferences,
    savePreferences,
    getDueTasks,
    checkAndNotify,
    formatTimeAgo,
    getNotificationIcon,
};
