/**
 * @fileoverview Attendance metrics data fetching for Dashboard
 * 
 * @module hooks/dashboard/fetchDashboardAttendance
 */

import { supabase } from '../../services/supabase';
import type { DashboardQueryData } from '../../types';
import { calculateWeeklyAttendance } from './dashboardHelpers';

export interface DashboardAttendanceData {
    dailyAttendanceSummary: DashboardQueryData['dailyAttendanceSummary'];
    weeklyAttendance: DashboardQueryData['weeklyAttendance'];
    todayAttendanceRecords: DashboardQueryData['todayAttendanceRecords'];
}

export const fetchDashboardAttendance = async (
    today: string,
    last5Days: string[],
    activeStudentIds: Set<string>,
    totalStudents: number
): Promise<DashboardAttendanceData> => {
    const [dailyAttendanceRes, weeklyAttendanceRes, todayAttendanceRecordsRes] = await Promise.all([
        supabase
            .from('attendance')
            .select('student_id, status')
            .eq('date', today)
            .is('deleted_at', null),
        supabase
            .from('attendance')
            .select('student_id, date, status')
            .gte('date', last5Days[0])
            .lte('date', last5Days[4])
            .is('deleted_at', null),
        supabase
            .from('attendance')
            .select('student_id, created_at, status')
            .eq('date', today)
            .is('deleted_at', null)
            .order('created_at', { ascending: false })
            .limit(100),
    ]);

    const errors = [dailyAttendanceRes.error, weeklyAttendanceRes.error, todayAttendanceRecordsRes.error].filter(Boolean);
    if (errors.length > 0) {
        console.warn('[DashboardAttendance] Attendance queries warning:', errors.map(e => e?.message).join(', '));
    }

    // Filter to active students in memory
    const dailyAttendanceForActive = (dailyAttendanceRes.data || []).filter(
        a => a.student_id && activeStudentIds.has(a.student_id)
    );
    const presentCount = dailyAttendanceForActive.filter(a => a.status === 'Hadir').length || 0;

    const weeklyAttendanceFiltered = (weeklyAttendanceRes.data || []).filter(
        a => a.student_id && activeStudentIds.has(a.student_id)
    );
    const weeklyAttendance = calculateWeeklyAttendance(
        weeklyAttendanceFiltered,
        last5Days,
        totalStudents || 1
    );

    const recentAttendanceForActive = (todayAttendanceRecordsRes.data || []).filter(
        r => r.student_id && activeStudentIds.has(r.student_id)
    );

    const todayAttendanceRecords = recentAttendanceForActive.slice(0, 10).reduce((acc: { created_at: string; status: string; count: number }[], record) => {
        const existing = acc.find(a => a.created_at === record.created_at && a.status === record.status);
        if (existing) {
            existing.count++;
        } else {
            acc.push({ created_at: record.created_at || '', status: record.status || '', count: 1 });
        }
        return acc;
    }, []) || [];

    return {
        dailyAttendanceSummary: {
            present: presentCount,
            total: dailyAttendanceForActive.length,
        },
        weeklyAttendance,
        todayAttendanceRecords,
    };
};
