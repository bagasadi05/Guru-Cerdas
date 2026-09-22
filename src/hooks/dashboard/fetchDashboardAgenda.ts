/**
 * @fileoverview Agenda data fetching for Dashboard (Schedules & Tasks)
 * 
 * @module hooks/dashboard/fetchDashboardAgenda
 */

import { supabase } from '../../services/supabase';
import type { DashboardQueryData, Database } from '../../types';
import { getTodayDayName } from './dashboardHelpers';

export interface DashboardAgendaData {
    tasks: DashboardQueryData['tasks'];
    schedule: DashboardQueryData['schedule'];
    recentTasks: DashboardQueryData['recentTasks'];
}

export const fetchDashboardAgenda = async (userId: string): Promise<DashboardAgendaData> => {
    const todayDay = getTodayDayName();

    const [tasksRes, scheduleRes, recentTasksRes] = await Promise.all([
        supabase
            .from('tasks')
            .select('id, title, status, due_date')
            .eq('user_id', userId)
            .neq('status', 'done')
            .is('deleted_at', null)
            .order('due_date'),
        supabase
            .from('schedules')
            .select('id, user_id, day, subject, start_time, end_time, class_id, created_at')
            .eq('user_id', userId)
            .eq('day', todayDay as Database['public']['Tables']['schedules']['Row']['day'])
            .order('start_time'),
        supabase
            .from('tasks')
            .select('id, title, created_at, status')
            .eq('user_id', userId)
            .is('deleted_at', null)
            .order('created_at', { ascending: false })
            .limit(5),
    ]);

    if (tasksRes.error || scheduleRes.error) {
        const errorMsg = [tasksRes.error?.message, scheduleRes.error?.message].filter(Boolean).join(', ');
        throw new Error(errorMsg || 'Gagal memuat jadwal dan tugas.');
    }

    if (recentTasksRes.error) {
        console.warn('[DashboardAgenda] Non-fatal error loading recent tasks:', recentTasksRes.error.message);
    }

    const tasks = (tasksRes.data || []).map(task => ({
        ...task,
        completed: task.status === 'done',
        created_at: '',
        description: null,
        due_date: task.due_date,
        updated_at: '',
        user_id: userId,
    })) as DashboardQueryData['tasks'];

    const schedule = (scheduleRes.data || []).map(item => ({
        ...item,
        room: null,
        updated_at: item.created_at,
    })) as DashboardQueryData['schedule'];

    return {
        tasks,
        schedule,
        recentTasks: recentTasksRes.data || [],
    };
};
