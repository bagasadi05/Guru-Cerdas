import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
    formatLocalDate,
    getLastNDays,
    calculateWeeklyAttendance,
    getTodayDayName,
} from '../../src/hooks/useDashboardData';
import { generateReminders } from '../../src/hooks/useDashboardActivities';

describe('Dashboard Bug Diagnosis & Reproduction Suite', () => {

    describe('Bug 1: Date Desynchronization at Morning School Hours (UTC+7 vs UTC)', () => {
        beforeEach(() => {
            vi.useFakeTimers();
        });

        afterEach(() => {
            vi.useRealTimers();
        });

        it('should format today using local calendar date, not UTC date during morning school hours', () => {
            // Set clock to Monday morning 06:30 AM local time (e.g. 2026-09-21 06:30:00)
            const mondayMorning = new Date(2026, 8, 21, 6, 30, 0); // Month index 8 = September
            vi.setSystemTime(mondayMorning);

            const todayFormatted = formatLocalDate(new Date());
            const dayName = getTodayDayName(new Date());

            // Local date must be 2026-09-21 and day must be Senin
            expect(todayFormatted).toBe('2026-09-21');
            expect(dayName).toBe('Senin');

            // getLastNDays(5) must end with today's local date
            const last5 = getLastNDays(5);
            expect(last5).toHaveLength(5);
            expect(last5[last5.length - 1]).toBe('2026-09-21');
            expect(last5[0]).toBe('2026-09-17');
        });
    });

    describe('Bug 2: Safe Day Parsing for Weekly Attendance (No UTC Midnight Shift)', () => {
        it('should correctly map YYYY-MM-DD to Indonesian day name without timezone shift', () => {
            // 2026-09-21 is Monday (Senin)
            // 2026-09-22 is Tuesday (Selasa)
            // 2026-09-23 is Wednesday (Rabu)
            // 2026-09-24 is Thursday (Kamis)
            // 2026-09-25 is Friday (Jumat)
            const dates = ['2026-09-21', '2026-09-22', '2026-09-23', '2026-09-24', '2026-09-25'];
            const attendanceData = [
                { date: '2026-09-21', status: 'Hadir' },
                { date: '2026-09-22', status: 'Hadir' },
            ];

            const result = calculateWeeklyAttendance(attendanceData, dates, 1);

            expect(result[0].day).toBe('Senin');
            expect(result[1].day).toBe('Selasa');
            expect(result[2].day).toBe('Rabu');
            expect(result[3].day).toBe('Kamis');
            expect(result[4].day).toBe('Jumat');
        });
    });

    describe('Bug 3: False Panic Alarm on Partial Morning Attendance Roll Call', () => {
        it('should NOT trigger "low-attendance" alert when 5 out of 30 students are recorded and all 5 are present', () => {
            const mockData = {
                students: Array.from({ length: 30 }, (_, i) => ({
                    id: `s-${i}`,
                    name: `Siswa ${i}`,
                    class_id: 'c-1',
                })),
                dailyAttendanceSummary: {
                    present: 5,
                    total: 5, // 5 students recorded so far, 100% present
                },
                tasks: [],
                recentTasks: [],
                academicRecords: [],
                todayAttendanceRecords: [],
            };

            const reminders = generateReminders(mockData);

            // Should have warning that attendance is incomplete (25 students left)
            const incompleteAlert = reminders.find(r => r.id === 'attendance-incomplete');
            expect(incompleteAlert).toBeDefined();
            expect(incompleteAlert?.message).toContain('25 siswa belum diabsen');

            // Must NOT have false urgent "Kehadiran Rendah!" alarm
            const lowAttendanceAlert = reminders.find(r => r.id === 'low-attendance');
            expect(lowAttendanceAlert).toBeUndefined();
        });

        it('SHOULD trigger "low-attendance" alert when recorded attendance has high absence rate', () => {
            const mockData = {
                students: Array.from({ length: 30 }, (_, i) => ({
                    id: `s-${i}`,
                    name: `Siswa ${i}`,
                    class_id: 'c-1',
                })),
                dailyAttendanceSummary: {
                    present: 10,
                    total: 20, // 20 recorded, only 10 present (50% < 70%)
                },
                tasks: [],
                recentTasks: [],
                academicRecords: [],
                todayAttendanceRecords: [],
            };

            const reminders = generateReminders(mockData);

            // Low attendance alert should trigger
            const lowAttendanceAlert = reminders.find(r => r.id === 'low-attendance');
            expect(lowAttendanceAlert).toBeDefined();
            expect(lowAttendanceAlert?.type).toBe('urgent');
            expect(lowAttendanceAlert?.message).toContain('50%');
        });
    });
});
