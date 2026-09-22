/**
 * @fileoverview Date and attendance calculation helper functions for Dashboard
 * 
 * @module hooks/dashboard/dashboardHelpers
 */

import type { WeeklyAttendance } from '../../types';

export const INDONESIAN_DAY_NAMES = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'] as const;

/**
 * Formats a Date to YYYY-MM-DD in the local calendar timezone.
 */
export const formatLocalDate = (date: Date = new Date()): string => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
};

/**
 * Gets the last N days as an array of YYYY-MM-DD strings in local timezone.
 * 
 * @param count - Number of days to look back
 * @returns Array of date strings in ascending order (oldest first)
 * 
 * @example
 * ```typescript
 * const dates = getLastNDays(5);
 * // ['2024-01-01', '2024-01-02', '2024-01-03', '2024-01-04', '2024-01-05']
 * ```
 */
export const getLastNDays = (count: number): string[] => {
    const dates: string[] = [];
    for (let i = count - 1; i >= 0; i--) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        dates.push(formatLocalDate(date));
    }
    return dates;
};

/**
 * Gets today's day name in Indonesian.
 * Uses index-based lookup to avoid browser locale fallbacks returning English names.
 * 
 * @returns Day name (e.g., "Senin", "Selasa", "Kamis")
 */
export const getTodayDayName = (date: Date = new Date()): string => {
    return INDONESIAN_DAY_NAMES[date.getDay()];
};

/**
 * Calculates weekly attendance percentages from raw attendance data.
 * 
 * @param attendanceData - Raw attendance records
 * @param dates - Array of dates to calculate for
 * @param totalStudents - Total number of students for percentage calculation
 * @returns Array of weekly attendance data points
 */
export const calculateWeeklyAttendance = (
    attendanceData: Array<{ date: string; status: string }>,
    dates: string[],
    totalStudents: number
): WeeklyAttendance[] => {
    return dates.map(date => {
        // Filter attendance records for this specific date
        const dayAttendance = attendanceData.filter(a => a.date === date);

        // Count students marked as present
        const presentOnDay = dayAttendance.filter(a => a.status === 'Hadir').length;

        // Use total students as denominator to avoid inflated percentages
        const total = totalStudents || dayAttendance.length;

        // Get day name for display safely without UTC timezone shift
        const [year, month, day] = date.split('-').map(Number);
        const dayOfWeek = (year && month && day) ? new Date(year, month - 1, day).getDay() : new Date(date).getDay();
        const dayName = INDONESIAN_DAY_NAMES[dayOfWeek] || 'Senin';

        return {
            day: dayName,
            present_percentage: total > 0 ? (presentOnDay / total) * 100 : 0
        };
    });
};
