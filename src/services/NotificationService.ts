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
export type NotificationType = 'task_due' | 'task_overdue' | 'attendance_reminder' | 'message' | 'system';

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
    priority: 'low' | 'medium' | 'high';
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
};

/**
 * Add a new notification
 */
export const addNotification = (notification: Omit<Notification, 'id' | 'timestamp' | 'read'>): void => {
    const notifications = getNotifications();

    // Check for duplicate (same type and metadata id)
    const isDuplicate = notifications.some(n =>
        n.type === notification.type &&
        n.metadata?.taskId === notification.metadata?.taskId
    );

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
    const { data: tasks } = await supabase
        .from('tasks')
        .select('id, title, description, due_date, priority, status')
        .eq('user_id', userId)
        .neq('status', 'done')
        .not('due_date', 'is', null)
        .order('due_date', { ascending: true });

    if (!tasks) return [];

    const now = new Date();
    const preferences = getPreferences();
    const reminderThreshold = preferences.taskReminderHours * 60 * 60 * 1000; // Convert to ms

    return tasks
        .map(task => {
            const dueDate = new Date(task.due_date);
            const timeDiff = dueDate.getTime() - now.getTime();
            const hoursUntilDue = timeDiff / (1000 * 60 * 60);

            return {
                id: task.id,
                title: task.title,
                description: task.description,
                due_date: task.due_date,
                priority: task.priority as 'low' | 'medium' | 'high',
                status: task.status,
                isOverdue: timeDiff < 0,
                hoursUntilDue: Math.round(hoursUntilDue),
            };
        })
        .filter(task => task.isOverdue || task.hoursUntilDue <= preferences.taskReminderHours);
};

/**
 * Check for due tasks and create notifications
 */
export const checkAndNotify = async (userId: string): Promise<number> => {
    const preferences = getPreferences();
    if (!preferences.taskReminders) return 0;

    const lastCheck = localStorage.getItem(LAST_CHECK_KEY);
    const now = Date.now();

    // Don't check more than once per 15 minutes
    if (lastCheck && now - parseInt(lastCheck) < 15 * 60 * 1000) {
        return getUnreadCount();
    }

    localStorage.setItem(LAST_CHECK_KEY, now.toString());

    const dueTasks = await getDueTasks(userId);
    let newNotifications = 0;

    for (const task of dueTasks) {
        if (task.isOverdue) {
            addNotification({
                type: 'task_overdue',
                title: 'Tugas Terlambat!',
                message: `"${task.title}" sudah melewati deadline.`,
                metadata: { taskId: task.id, priority: task.priority },
                link: '/tugas',
            });
            newNotifications++;
        } else if (task.hoursUntilDue <= 24) {
            addNotification({
                type: 'task_due',
                title: 'Tugas Hampir Deadline',
                message: `"${task.title}" deadline dalam ${task.hoursUntilDue} jam.`,
                metadata: { taskId: task.id, priority: task.priority, hoursLeft: task.hoursUntilDue },
                link: '/tugas',
            });
            newNotifications++;
        }
    }

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
