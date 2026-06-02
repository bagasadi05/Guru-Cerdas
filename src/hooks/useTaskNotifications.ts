import { useEffect, useCallback, useState } from 'react';
import { Database } from '../services/database.types';
import { logger } from '../services/logger';
import {
    checkAndNotify,
    getDueTasks,
    DueTask,
    getUnreadCount
} from '../services/NotificationService';
import { useAuth } from './useAuth';

type Task = Database['public']['Tables']['tasks']['Row'];

interface UseTaskNotificationsReturn {
    dueTasks: DueTask[];
    overdueCount: number;
    upcomingCount: number;
    unreadCount: number;
    checkNow: () => Promise<void>;
    isLoading: boolean;
}

/**
 * Hook for managing task notifications
 * 
 * Combines service worker push notifications with in-app notification tracking.
 * Automatically checks for due tasks and provides counts for UI badges.
 */
export const useTaskNotifications = (tasks?: Task[]): UseTaskNotificationsReturn => {
    const { user } = useAuth();
    const [dueTasks, setDueTasks] = useState<DueTask[]>([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const [isLoading, setIsLoading] = useState(false);

    // Push notification sync with service worker (original functionality)
    useEffect(() => {
        if (!tasks || tasks.length === 0) return;
        if (!('serviceWorker' in navigator) || !('Notification' in window)) return;
        if (Notification.permission !== 'granted') return;

        const syncTasks = async () => {
            try {
                const registration = await navigator.serviceWorker.getRegistration();
                if (registration?.active) {
                    registration.active.postMessage({
                        type: 'TASKS_UPDATED',
                        payload: tasks
                    });
                }
            } catch (error) {
                logger.error('Error syncing task notifications', error as Error, undefined, 'TaskNotifications');
            }
        };

        syncTasks();
    }, [tasks]);

    // In-app notification check
    const checkNow = useCallback(async () => {
        if (!user) return;

        setIsLoading(true);
        try {
            const tasksData = await getDueTasks(user.id);
            const count = await checkAndNotify(user.id, tasksData);
            setDueTasks(tasksData);
            setUnreadCount(count);
        } catch (error) {
            logger.error('Error checking task notifications', error as Error, undefined, 'TaskNotifications');
        } finally {
            setIsLoading(false);
        }
    }, [user]);

    // Check on mount and periodically
    useEffect(() => {
        if (user) {
            checkNow();
            // Check every 15 minutes
            const interval = setInterval(checkNow, 15 * 60 * 1000);
            return () => clearInterval(interval);
        }
    }, [user, checkNow]);

    // Update unread count when storage changes
    useEffect(() => {
        const syncUnreadCount = () => {
            setUnreadCount(getUnreadCount());
        };
        window.addEventListener('portal-guru-notifications-updated', syncUnreadCount);
        window.addEventListener('storage', syncUnreadCount);
        return () => {
            window.removeEventListener('portal-guru-notifications-updated', syncUnreadCount);
            window.removeEventListener('storage', syncUnreadCount);
        };
    }, []);

    const overdueCount = dueTasks.filter(t => t.isOverdue).length;
    const upcomingCount = dueTasks.filter(t => !t.isOverdue).length;

    return {
        dueTasks,
        overdueCount,
        upcomingCount,
        unreadCount,
        checkNow,
        isLoading,
    };
};

export default useTaskNotifications;
