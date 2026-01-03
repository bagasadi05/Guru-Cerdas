/**
 * @fileoverview Custom hook for fetching and managing dashboard data
 * 
 * This hook encapsulates all data fetching logic for the main dashboard,
 * including students, tasks, schedules, attendance, and academic records.
 * It uses React Query for caching and automatic background updates.
 * 
 * @module hooks/useDashboardData
 */

import { useQuery } from '@tanstack/react-query';
import { supabase } from '../services/supabase';
import { useAuth } from './useAuth';
import { queryKeys } from '../lib/queryKeys';
import type { DashboardQueryData, WeeklyAttendance } from '../types';
import type { Database } from '../types';

// =============================================================================
// TYPES
// =============================================================================

/**
 * Return type for the useDashboardData hook.
 */
export interface UseDashboardDataReturn {
    /** Dashboard data when loaded successfully */
    data: DashboardQueryData | undefined;
    /** Whether the data is currently loading */
    isLoading: boolean;
    /** Error object if the query failed */
    error: Error | null;
    /** Function to refetch the data */
    refetch: () => void;
    /** Whether a refetch is in progress */
    isRefetching: boolean;
}

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Generates an array of the last N days' dates in YYYY-MM-DD format.
 * 
 * @param count - Number of days to generate
 * @returns Array of date strings
 * 
 * @example
 * ```typescript
 * const dates = getLastNDays(5);
 * // ['2024-01-01', '2024-01-02', '2024-01-03', '2024-01-04', '2024-01-05']
 * ```
 */
const getLastNDays = (count: number): string[] => {
    const dates: string[] = [];
    for (let i = count - 1; i >= 0; i--) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        dates.push(date.toISOString().slice(0, 10));
    }
    return dates;
};

/**
 * Gets today's day name in Indonesian locale.
 * 
 * @returns Day name (e.g., "Senin", "Selasa")
 */
const getTodayDayName = (): string => {
    return new Date().toLocaleDateString('id-ID', { weekday: 'long' });
};

/**
 * Calculates weekly attendance percentages from raw attendance data.
 * 
 * @param attendanceData - Raw attendance records
 * @param dates - Array of dates to calculate for
 * @param totalStudents - Total number of students for percentage calculation
 * @returns Array of weekly attendance data points
 */
const calculateWeeklyAttendance = (
    attendanceData: Array<{ date: string; status: string }>,
    dates: string[],
    totalStudents: number
): WeeklyAttendance[] => {
    return dates.map(date => {
        // Filter attendance records for this specific date
        const dayAttendance = attendanceData.filter(a => a.date === date);

        // Count students marked as present
        const presentOnDay = dayAttendance.filter(a => a.status === 'Hadir').length;

        // Use day's attendance count or total students as denominator
        const total = dayAttendance.length || totalStudents;

        // Get day name for display
        const dayName = new Date(date).toLocaleDateString('id-ID', { weekday: 'long' });

        return {
            day: dayName,
            present_percentage: total > 0 ? (presentOnDay / total) * 100 : 0
        };
    });
};

// =============================================================================
// DATA FETCHING
// =============================================================================

/**
 * Fetches all dashboard data from Supabase.
 * 
 * This function executes multiple parallel queries to fetch:
 * - Students (id, name, avatar_url, class_id)
 * - Active tasks (not deleted, not done)
 * - Today's schedule
 * - Classes
 * - Daily attendance summary
 * - Weekly attendance trend
 * - Academic records
 * - Violations
 * 
 * @param userId - The authenticated user's ID
 * @returns Promise resolving to dashboard data
 * @throws Error if any of the queries fail
 */
export const fetchDashboardData = async (userId: string): Promise<DashboardQueryData> => {
    const today = new Date().toISOString().slice(0, 10);
    const todayDay = getTodayDayName();
    const last5Days = getLastNDays(5);

    // Execute all queries in parallel for optimal performance
    const [
        studentsRes,
        tasksRes,
        scheduleRes,
        classesRes,
        dailyAttendanceRes,
        weeklyAttendanceRes,
        academicRecordsRes,
        violationsRes
    ] = await Promise.all([
        // Fetch students with minimal fields needed for dashboard
        supabase
            .from('students')
            .select('id, name, avatar_url, class_id')
            .eq('user_id', userId),

        // Fetch active tasks (not deleted, not completed)
        supabase
            .from('tasks')
            .select('*')
            .eq('user_id', userId)
            .is('deleted_at', null)
            .neq('status', 'done')
            .order('due_date'),

        // Fetch today's schedule entries
        supabase
            .from('schedules')
            .select('*')
            .eq('user_id', userId)
            .eq('day', todayDay as Database['public']['Tables']['schedules']['Row']['day'])
            .order('start_time'),

        // Fetch all classes
        supabase
            .from('classes')
            .select('id, name')
            .eq('user_id', userId),

        // Fetch today's attendance for summary
        supabase
            .from('attendance')
            .select('status', { count: 'exact' })
            .eq('user_id', userId)
            .eq('date', today),

        // Fetch last 5 days attendance for trend chart
        supabase
            .from('attendance')
            .select('date, status')
            .eq('user_id', userId)
            .gte('date', last5Days[0])
            .lte('date', last5Days[4]),

        // Fetch academic records for grade analysis
        supabase
            .from('academic_records')
            .select('student_id, subject, score, assessment_name')
            .eq('user_id', userId),

        // Fetch violations for behavior analysis
        supabase
            .from('violations')
            .select('student_id, points')
            .eq('user_id', userId)
    ]);

    // Collect any errors from the queries
    const errors = [
        studentsRes,
        tasksRes,
        scheduleRes,
        classesRes,
        dailyAttendanceRes,
        academicRecordsRes,
        violationsRes
    ]
        .map(res => res.error)
        .filter((e): e is NonNullable<typeof e> => e !== null);

    if (errors.length > 0) {
        throw new Error(errors.map(e => e.message).join(', '));
    }

    // Calculate attendance statistics
    const presentCount = dailyAttendanceRes.data?.filter(a => a.status === 'Hadir').length || 0;
    const totalStudents = studentsRes.data?.length || 1;

    // Calculate weekly attendance from raw data
    const weeklyAttendance = calculateWeeklyAttendance(
        weeklyAttendanceRes.data || [],
        last5Days,
        totalStudents
    );

    return {
        students: studentsRes.data || [],
        tasks: tasksRes.data || [],
        schedule: scheduleRes.data || [],
        classes: classesRes.data || [],
        dailyAttendanceSummary: {
            present: presentCount,
            total: dailyAttendanceRes.count || 0
        },
        weeklyAttendance,
        academicRecords: academicRecordsRes.data || [],
        violations: violationsRes.data || [],
    };
};

// =============================================================================
// HOOK
// =============================================================================

/**
 * Custom hook for fetching and managing dashboard data.
 * 
 * Uses React Query for:
 * - Automatic caching
 * - Background refetching
 * - Loading and error states
 * - Deduplication of requests
 * 
 * @returns Dashboard data, loading state, error, and refetch function
 * 
 * @example
 * ```tsx
 * function Dashboard() {
 *   const { data, isLoading, error, refetch } = useDashboardData();
 *   
 *   if (isLoading) return <Skeleton />;
 *   if (error) return <Error message={error.message} />;
 *   
 *   return <DashboardContent data={data} />;
 * }
 * ```
 */
export function useDashboardData(): UseDashboardDataReturn {
    const { user } = useAuth();

    const {
        data,
        isLoading,
        error,
        refetch,
        isRefetching
    } = useQuery({
        queryKey: queryKeys.dashboard.data(user?.id ?? ''),
        queryFn: () => fetchDashboardData(user!.id),
        enabled: !!user,
        // Refetch on window focus to keep data fresh
        refetchOnWindowFocus: true,
        // Keep previous data while refetching
        placeholderData: (previousData) => previousData,
    });

    return {
        data,
        isLoading,
        error: error as Error | null,
        refetch: () => { refetch(); },
        isRefetching,
    };
}

export default useDashboardData;
