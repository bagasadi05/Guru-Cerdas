import { useEffect } from 'react';
import { logger } from '../services/logger';
import { Database } from '../services/database.types';

type ScheduleRow = Database['public']['Tables']['schedules']['Row'];

export const useScheduleNotifications = (schedule: ScheduleRow[]) => {
    useEffect(() => {
        if (!('serviceWorker' in navigator) || !('Notification' in window)) {
            return;
        }

        const shouldSync = localStorage.getItem('scheduleNotificationsEnabled') === 'true';
        if (!shouldSync || Notification.permission !== 'granted' || schedule.length === 0) {
            return;
        }

        const syncSchedule = async () => {
            try {
                const registration = await navigator.serviceWorker.getRegistration();
                if (registration?.active) {
                    registration.active.postMessage({
                        type: 'SCHEDULE_UPDATED',
                        payload: schedule
                    });
                }
            } catch (error) {
                logger.error('Error syncing schedule notifications', error as Error, undefined, 'ScheduleNotifications');
            }
        };

        syncSchedule();

    }, [schedule]);
};
