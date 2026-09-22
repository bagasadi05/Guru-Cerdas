/**
 * @fileoverview Custom hook for fetching and managing dashboard data
 * 
 * This hook encapsulates data fetching logic for the main dashboard,
 * decomposing queries into granular domains with tiered cache stale times:
 * - Core (Students, Classes): 10-minute cache
 * - Agenda (Tasks, Schedules): 3-minute cache
 * - Attendance (Daily, Weekly trend): 2-minute cache
 * - Academic (Grades, Violations, Achievements): 10-minute cache (heavy query, up to 3000 rows)
 * - Communications (Unread parent messages): 2-minute cache
 * 
 * @module hooks/useDashboardData
 */

import { useMemo, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from './useAuth';
import { queryKeys } from '../lib/queryKeys';
import type { DashboardQueryData } from '../types';

import {
    formatLocalDate,
    getLastNDays,
    getTodayDayName,
    calculateWeeklyAttendance,
    INDONESIAN_DAY_NAMES,
} from './dashboard/dashboardHelpers';
import { fetchDashboardCore } from './dashboard/fetchDashboardCore';
import { fetchDashboardAgenda } from './dashboard/fetchDashboardAgenda';
import { fetchDashboardAttendance } from './dashboard/fetchDashboardAttendance';
import { fetchDashboardAcademic } from './dashboard/fetchDashboardAcademic';
import { fetchDashboardCommunications } from './dashboard/fetchDashboardCommunications';

// Re-export helpers for backward compatibility & tests
export {
    formatLocalDate,
    getLastNDays,
    getTodayDayName,
    calculateWeeklyAttendance,
    INDONESIAN_DAY_NAMES,
};

// TYPES
export interface UseDashboardDataReturn {
    /** Dashboard data when loaded successfully */
    data: DashboardQueryData | undefined;
    /** Whether the primary data is currently loading */
    isLoading: boolean;
    /** Error object if the core query failed */
    error: Error | null;
    /** Whether the query encountered an error */
    isError: boolean;
    /** Function to refetch all dashboard data */
    refetch: () => void;
    /** Whether a refetch is in progress */
    isRefetching: boolean;
}

/**
 * Fetches all dashboard data from Supabase aggregating granular domain queries.
 * Maintained for standalone batch-fetch usage and backward compatibility.
 * 
 * @param userId - The authenticated user's ID
 * @param userRole - The authenticated user's role
 * @returns Promise resolving to complete dashboard data
 */
export const fetchDashboardData = async (userId: string, userRole: string): Promise<DashboardQueryData> => {
    const today = formatLocalDate(new Date());
    const last5Days = getLastNDays(5);

    const core = await fetchDashboardCore(userId, userRole);
    const [agenda, attendance, academic, communications] = await Promise.all([
        fetchDashboardAgenda(userId),
        fetchDashboardAttendance(today, last5Days, core.activeStudentIds, core.students.length),
        fetchDashboardAcademic(core.activeStudentIds),
        fetchDashboardCommunications(core.activeStudentIds),
    ]);

    return {
        students: core.students,
        classes: core.classes,
        tasks: agenda.tasks,
        schedule: agenda.schedule,
        recentTasks: agenda.recentTasks,
        dailyAttendanceSummary: attendance.dailyAttendanceSummary,
        weeklyAttendance: attendance.weeklyAttendance,
        todayAttendanceRecords: attendance.todayAttendanceRecords,
        academicRecords: academic.academicRecords,
        violations: academic.violations,
        achievements: academic.achievements,
        unreadParentMessages: communications.unreadParentMessages,
    };
};

/**
 * Custom hook for fetching and managing dashboard data.
 * 
 * Employs domain-level query decoupling and tiered stale times:
 * - Core (Students, Classes): 10 min cache
 * - Agenda (Tasks, Schedules): 3 min cache
 * - Attendance: 2 min cache
 * - Academic (Grades, Violations, Achievements): 10 min cache (heavy query, up to 3000 rows)
 * - Communications: 2 min cache
 * 
 * @returns Dashboard data, loading state, error, and refetch function
 */
export function useDashboardData(): UseDashboardDataReturn {
    const { user, userRole, loading: authLoading } = useAuth();
    const isAuthReady = !!user && !authLoading && userRole !== null && userRole !== undefined;

    // 1. Core Query (Classes & Students) — 10 min cache
    const coreQuery = useQuery({
        queryKey: queryKeys.dashboard.core(user?.id ?? '', userRole),
        queryFn: () => fetchDashboardCore(user!.id, userRole ?? ''),
        enabled: isAuthReady,
        staleTime: 10 * 60 * 1000,
        refetchOnWindowFocus: false,
    });

    // 2. Agenda Query (Schedules & Tasks) — 3 min cache
    const agendaQuery = useQuery({
        queryKey: queryKeys.dashboard.agenda(user?.id ?? ''),
        queryFn: () => fetchDashboardAgenda(user!.id),
        enabled: isAuthReady,
        staleTime: 3 * 60 * 1000,
        refetchOnWindowFocus: false,
    });

    // 3. Attendance Query (Daily & Weekly Attendance) — 2 min cache
    const today = formatLocalDate(new Date());
    const last5Days = getLastNDays(5);
    const activeStudentIds = coreQuery.data?.activeStudentIds;
    const totalStudents = coreQuery.data?.students.length ?? 0;

    const attendanceQuery = useQuery({
        queryKey: queryKeys.dashboard.attendance(user?.id ?? '', today),
        queryFn: () => fetchDashboardAttendance(today, last5Days, activeStudentIds!, totalStudents),
        enabled: isAuthReady && !!activeStudentIds,
        staleTime: 2 * 60 * 1000,
        refetchOnWindowFocus: false,
    });

    // 4. Academic Query (Grades, Violations, Achievements) — 10 min cache (heavy query, up to 3000 rows)
    const academicQuery = useQuery({
        queryKey: queryKeys.dashboard.academic(user?.id ?? ''),
        queryFn: () => fetchDashboardAcademic(activeStudentIds!),
        enabled: isAuthReady && !!activeStudentIds,
        staleTime: 10 * 60 * 1000,
        refetchOnWindowFocus: false,
    });

    // 5. Communications Query (Unread parent messages) — 2 min cache
    const communicationsQuery = useQuery({
        queryKey: queryKeys.dashboard.communications(user?.id ?? ''),
        queryFn: () => fetchDashboardCommunications(activeStudentIds!),
        enabled: isAuthReady && !!activeStudentIds,
        staleTime: 2 * 60 * 1000,
        refetchOnWindowFocus: false,
    });

    // Assemble unified DashboardQueryData
    const data: DashboardQueryData | undefined = useMemo(() => {
        if (!coreQuery.data) return undefined;

        return {
            students: coreQuery.data.students,
            classes: coreQuery.data.classes,
            tasks: agendaQuery.data?.tasks ?? [],
            schedule: agendaQuery.data?.schedule ?? [],
            recentTasks: agendaQuery.data?.recentTasks ?? [],
            dailyAttendanceSummary: attendanceQuery.data?.dailyAttendanceSummary ?? { present: 0, total: 0 },
            weeklyAttendance: attendanceQuery.data?.weeklyAttendance ?? [],
            todayAttendanceRecords: attendanceQuery.data?.todayAttendanceRecords ?? [],
            academicRecords: academicQuery.data?.academicRecords ?? [],
            violations: academicQuery.data?.violations ?? [],
            achievements: academicQuery.data?.achievements ?? [],
            unreadParentMessages: communicationsQuery.data?.unreadParentMessages ?? [],
        };
    }, [
        coreQuery.data,
        agendaQuery.data,
        attendanceQuery.data,
        academicQuery.data,
        communicationsQuery.data,
    ]);

    const isLoading = (coreQuery.isLoading || agendaQuery.isLoading) && !coreQuery.data;
    const coreError = coreQuery.error || agendaQuery.error;
    const isError = coreQuery.isError || agendaQuery.isError;
    const isRefetching = coreQuery.isRefetching || agendaQuery.isRefetching || attendanceQuery.isRefetching || academicQuery.isRefetching || communicationsQuery.isRefetching;

    const refetch = useCallback(() => {
        coreQuery.refetch();
        agendaQuery.refetch();
        attendanceQuery.refetch();
        academicQuery.refetch();
        communicationsQuery.refetch();
    }, [coreQuery, agendaQuery, attendanceQuery, academicQuery, communicationsQuery]);

    return {
        data,
        isLoading,
        error: (coreError as Error) || null,
        isError,
        refetch,
        isRefetching,
    };
}

export default useDashboardData;
