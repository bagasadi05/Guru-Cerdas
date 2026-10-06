import { beforeEach, describe, expect, it, vi } from 'vitest';
import { normalizePreferences, bindPreferencesToUser, getPreferences } from '../../src/services/NotificationService';
import { syncNotificationPreferences, saveAccountNotificationPreferences } from '../../src/services/notificationPreferenceSync';
import { notificationDestination } from '../../src/hooks/usePushClickNavigation';
import { daysUntilDeadline, schoolDate } from '../../src/utils/reminderDates';

const cloud = vi.hoisted(() => ({ rows: new Map<string, { task_reminders: boolean; task_reminder_days: number }>(), fail: false }));
vi.mock('../../src/services/supabase', () => ({
    supabase: { from: () => {
        let userId = '';
        return {
            select: () => ({ eq: (_column: string, id: string) => {
                userId = id;
                const result = async () => ({ data: cloud.rows.get(userId) ?? null, error: cloud.fail ? new Error('offline') : null });
                return { maybeSingle: result, single: result };
            } }),
            upsert: (value: { user_id: string; task_reminders: boolean; task_reminder_days: number }, options: { ignoreDuplicates?: boolean }) => {
                if (!cloud.fail && (!options.ignoreDuplicates || !cloud.rows.has(value.user_id))) cloud.rows.set(value.user_id, value);
                const result = async () => ({ data: cloud.rows.get(value.user_id), error: cloud.fail ? new Error('offline') : null });
                return { then: (resolve: (v: unknown) => void) => result().then(resolve), select: () => ({ single: result }) };
            },
        };
    } },
}));

beforeEach(() => { localStorage.clear(); cloud.rows.clear(); cloud.fail = false; });

describe('account notification preferences', () => {
    it.each([[6, 0], [12, 0], [24, 1], [48, 2], [72, 3]])('migrates %i hours to %i days', (hours, days) => {
        expect(normalizePreferences({ taskReminderHours: hours, taskReminders: false })).toMatchObject({ taskReminderDays: days, taskReminders: false });
    });
    it('imports legacy settings for one account and isolates later accounts', () => {
        localStorage.setItem('portal_guru_notification_prefs', JSON.stringify({ taskReminders: false, taskReminderHours: 48 }));
        expect(bindPreferencesToUser('a').taskReminders).toBe(false);
        expect(bindPreferencesToUser('b').taskReminders).toBe(true);
        expect(getPreferences('a').taskReminderDays).toBe(2);
    });
    it('uses the server as authority and seeds a missing row from local preferences', async () => {
        localStorage.setItem('portal_guru_notification_prefs', JSON.stringify({ taskReminders: false, taskReminderHours: 12 }));
        await syncNotificationPreferences('a');
        expect(cloud.rows.get('a')).toMatchObject({ task_reminders: false, task_reminder_days: 0 });
        cloud.rows.set('a', { task_reminders: true, task_reminder_days: 3 });
        expect(await syncNotificationPreferences('a')).toMatchObject({ taskReminders: true, taskReminderDays: 3 });
    });
    it('does not report or cache a failed cloud save', async () => {
        await syncNotificationPreferences('a');
        cloud.fail = true;
        await expect(saveAccountNotificationPreferences('a', { taskReminders: false })).rejects.toThrow('offline');
        expect(getPreferences('a').taskReminders).toBe(true);
    });
    it('rejects corrupt settings and computes date-only deadlines in WIB', () => {
        expect(normalizePreferences({ taskReminderDays: 90 }).taskReminderDays).toBe(1);
        expect(schoolDate(new Date('2026-10-04T17:00:00Z'))).toBe('2026-10-05');
        expect(daysUntilDeadline('2026-10-05', '2026-10-05')).toBe(0);
        expect(daysUntilDeadline('2026-10-04', '2026-10-05')).toBe(-1);
    });
});

describe('notification navigation', () => {
    it('opens supported routes and rejects external or unknown destinations', () => {
        expect(notificationDestination('/jadwal?tab=jurnal', 'https://school.example')).toBe('/jadwal?tab=jurnal');
        expect(notificationDestination('https://school.example/tugas', 'https://school.example')).toBe('/tugas');
        for (const value of ['//evil.example/tugas', 'javascript:alert(1)', '/tasks/123', undefined]) {
            expect(notificationDestination(value, 'https://school.example')).toBeNull();
        }
    });
});
