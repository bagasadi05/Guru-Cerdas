import { supabase } from './supabase';
import {
    bindPreferencesToUser, getPreferences, savePreferences, type NotificationPreferences,
} from './NotificationService';

function cacheServerPreferences(userId: string, row: { task_reminders: boolean; task_reminder_days: number }) {
    const value = { ...getPreferences(userId), taskReminders: row.task_reminders, taskReminderDays: row.task_reminder_days };
    savePreferences(value, userId);
    return value;
}

/** Load account settings and seed a missing row without overwriting another device. */
export async function syncNotificationPreferences(userId: string): Promise<NotificationPreferences> {
    const local = bindPreferencesToUser(userId);
    const { data, error } = await supabase.from('user_notification_preferences')
        .select('task_reminders,task_reminder_days').eq('user_id', userId).maybeSingle();
    if (error) throw error;
    if (data) return cacheServerPreferences(userId, data);
    const { error: insertError } = await supabase.from('user_notification_preferences').upsert({
        user_id: userId, task_reminders: local.taskReminders, task_reminder_days: local.taskReminderDays,
    }, { onConflict: 'user_id', ignoreDuplicates: true });
    if (insertError) throw insertError;
    const { data: inserted, error: readError } = await supabase.from('user_notification_preferences')
        .select('task_reminders,task_reminder_days').eq('user_id', userId).single();
    if (readError) throw readError;
    return cacheServerPreferences(userId, inserted);
}

/** Persist task settings before updating the browser cache or reporting success. */
export async function saveAccountNotificationPreferences(
    userId: string, changes: Partial<NotificationPreferences>,
): Promise<NotificationPreferences> {
    const current = await syncNotificationPreferences(userId);
    const next = { ...current, ...changes };
    const { data, error } = await supabase.from('user_notification_preferences').upsert({
        user_id: userId, task_reminders: next.taskReminders, task_reminder_days: next.taskReminderDays,
    }, { onConflict: 'user_id' }).select('task_reminders,task_reminder_days').single();
    if (error) throw error;
    return cacheServerPreferences(userId, data);
}
