import { useEffect } from 'react';
import { Database } from '../services/database.types';

type ScheduleRow = Database['public']['Tables']['schedules']['Row'];

export const useScheduleNotifications = (schedule: ScheduleRow[]) => {
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
                            type: 'SCHEDULE_UPDATED',
                            payload: schedule
                        });
                    }
                }
            } catch (error) {
                console.error('Error requesting notification permission:', error);
            }
        };

        if (schedule.length > 0) {
            requestPermissionAndSync();
        }

    }, [schedule]);
};
