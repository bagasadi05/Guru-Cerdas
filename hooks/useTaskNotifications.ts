import { useEffect } from 'react';
import { Database } from '../services/database.types';

type Task = Database['public']['Tables']['tasks']['Row'];

export const useTaskNotifications = (tasks: Task[]) => {
    useEffect(() => {
        if (!('serviceWorker' in navigator) || !('Notification' in window)) {
            return;
        }

        const requestPermissionAndSync = async () => {
            try {
                const permission = await Notification.requestPermission();
                if (permission === 'granted') {
                    if (navigator.serviceWorker.controller) {
                        navigator.serviceWorker.controller.postMessage({
                            type: 'TASKS_UPDATED',
                            payload: tasks
                        });
                    }
                }
            } catch (error) {
                console.error('Error requesting notification permission:', error);
            }
        };

        if (tasks.length > 0) {
            requestPermissionAndSync();
        }

    }, [tasks]);
};
