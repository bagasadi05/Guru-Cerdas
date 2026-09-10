/**
 * Attendance Auto-Fill Service
 * Handles exception-based attendance automation (auto-filling missing weekdays as 'Hadir')
 * and smart assistant detection for unrecorded weekdays.
 */

import { supabase } from './supabase';

export interface MissingWeekday {
    date: string;
    dayName: string;
    formattedDate: string;
}

export interface AutoFillResult {
    success: boolean;
    week_start: string;
    week_end: string;
    target_date: string;
    total_inserted: number;
    affected_classes: number;
}

const INDONESIAN_DAY_NAMES: Record<number, string> = {
    1: 'Senin',
    2: 'Selasa',
    3: 'Rabu',
    4: 'Kamis',
    5: 'Jumat',
    6: 'Sabtu',
    0: 'Minggu',
};

const INDONESIAN_MONTH_SHORT: Record<number, string> = {
    0: 'Jan',
    1: 'Feb',
    2: 'Mar',
    3: 'Apr',
    4: 'Mei',
    5: 'Jun',
    6: 'Jul',
    7: 'Agu',
    8: 'Sep',
    9: 'Okt',
    10: 'Nov',
    11: 'Des',
};

/**
 * Get current date string (YYYY-MM-DD) in Asia/Jakarta timezone.
 */
export function getJakartaDateString(d: Date = new Date()): string {
    const wib = new Date(d.getTime() + 7 * 60 * 60 * 1000);
    return `${wib.getUTCFullYear()}-${String(wib.getUTCMonth() + 1).padStart(2, '0')}-${String(wib.getUTCDate()).padStart(2, '0')}`;
}

/**
 * Returns the Monday (YYYY-MM-DD) of the week containing the given date.
 */
export function getMondayOfWeek(dateStr: string): string {
    const [year, month, day] = dateStr.split('-').map(Number);
    const d = new Date(year, month - 1, day);
    const dayOfWeek = d.getDay(); // 0 is Sunday, 1 is Monday...
    const diff = d.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1);
    const monday = new Date(d.setDate(diff));
    return `${monday.getFullYear()}-${String(monday.getMonth() + 1).padStart(2, '0')}-${String(monday.getDate()).padStart(2, '0')}`;
}

/**
 * Formats a date (YYYY-MM-DD) to Indonesian short format, e.g. "Selasa, 8 Sep".
 */
export function formatIndonesianWeekdayDate(dateStr: string): { dayName: string; formattedDate: string } {
    const [year, month, day] = dateStr.split('-').map(Number);
    const d = new Date(year, month - 1, day);
    const dayName = INDONESIAN_DAY_NAMES[d.getDay()] || '';
    const monthName = INDONESIAN_MONTH_SHORT[d.getMonth()] || '';
    return {
        dayName,
        formattedDate: `${dayName}, ${day} ${monthName}`,
    };
}

export const attendanceAutoFillService = {
    /**
     * Calls database RPC to auto-fill missing attendance records for a class or all classes.
     */
    async autoFillWeeklyAttendance(params?: {
        classId?: string;
        targetDate?: string;
        notes?: string;
    }): Promise<AutoFillResult> {
        const { data, error } = await supabase.rpc('auto_fill_weekly_missing_attendance', {
            p_class_id: params?.classId || null,
            p_target_date: params?.targetDate || null,
            p_notes: params?.notes || '[Auto-fill Sistem: Hadir]',
        });

        if (error) {
            console.error('attendanceAutoFillService.autoFillWeeklyAttendance error:', error);
            throw error;
        }

        return data as unknown as AutoFillResult;
    },

    /**
     * Checks which weekdays (Monday to Friday, up to targetDate) have 0 attendance records for the class.
     */
    async getMissingWeekdaysForClass(
        classId: string,
        studentIds: string[],
        targetDateStr?: string
    ): Promise<MissingWeekday[]> {
        if (!classId || studentIds.length === 0) return [];

        const todayStr = targetDateStr || getJakartaDateString();
        const mondayStr = getMondayOfWeek(todayStr);

        // Generate weekdays from Monday up to today (or Friday, whichever is earlier)
        const weekdays: string[] = [];
        const [mYear, mMonth, mDay] = mondayStr.split('-').map(Number);
        const curDate = new Date(mYear, mMonth - 1, mDay);

        for (let i = 0; i < 5; i++) {
            const dateStr = `${curDate.getFullYear()}-${String(curDate.getMonth() + 1).padStart(2, '0')}-${String(curDate.getDate()).padStart(2, '0')}`;
            if (dateStr <= todayStr) {
                weekdays.push(dateStr);
            }
            curDate.setDate(curDate.getDate() + 1);
        }

        if (weekdays.length === 0) return [];

        // Query attendance records for these weekdays
        const { data, error } = await supabase
            .from('attendance')
            .select('date')
            .in('student_id', studentIds)
            .gte('date', weekdays[0])
            .lte('date', weekdays[weekdays.length - 1])
            .is('deleted_at', null);

        if (error) {
            console.warn('attendanceAutoFillService.getMissingWeekdaysForClass error:', error);
            return [];
        }

        const recordedDates = new Set((data || []).map(r => r.date));

        const missing: MissingWeekday[] = [];
        for (const wDate of weekdays) {
            if (!recordedDates.has(wDate)) {
                const { dayName, formattedDate } = formatIndonesianWeekdayDate(wDate);
                missing.push({
                    date: wDate,
                    dayName,
                    formattedDate,
                });
            }
        }

        return missing;
    },

    /**
     * Checks whether the attendance records for the active date were auto-filled by the system.
     */
    isDateAutoFilled(records: Record<string, { note?: string; notes?: string }>): boolean {
        const values = Object.values(records);
        if (values.length === 0) return false;
        // Check if more than half of the recorded notes contain the auto-fill tag
        let autoFilledCount = 0;
        for (const r of values) {
            const noteContent = r.note || r.notes || '';
            if (noteContent.includes('[Auto-fill')) {
                autoFilledCount++;
            }
        }
        return autoFilledCount > 0 && autoFilledCount >= Math.floor(values.length / 2);
    },
};
