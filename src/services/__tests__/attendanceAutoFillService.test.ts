import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
    attendanceAutoFillService,
    getMondayOfWeek,
    formatIndonesianWeekdayDate,
    getJakartaDateString,
} from '../attendanceAutoFillService';

// Mock Supabase
vi.mock('../supabase', () => ({
    supabase: {
        rpc: vi.fn(),
        from: vi.fn(),
    },
}));

import { supabase } from '../supabase';

describe('attendanceAutoFillService', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe('Date utility functions', () => {
        it('getMondayOfWeek correctly returns the Monday for various days', () => {
            // 2026-09-10 is Thursday -> Monday is 2026-09-07
            expect(getMondayOfWeek('2026-09-10')).toBe('2026-09-07');
            // 2026-09-07 is Monday -> Monday is 2026-09-07
            expect(getMondayOfWeek('2026-09-07')).toBe('2026-09-07');
            // 2026-09-12 is Saturday -> Monday is 2026-09-07
            expect(getMondayOfWeek('2026-09-12')).toBe('2026-09-07');
            // 2026-09-13 is Sunday -> Monday is 2026-09-07
            expect(getMondayOfWeek('2026-09-13')).toBe('2026-09-07');
        });

        it('formatIndonesianWeekdayDate formats correctly', () => {
            const formatted = formatIndonesianWeekdayDate('2026-09-10');
            expect(formatted.dayName).toBe('Kamis');
            expect(formatted.formattedDate).toBe('Kamis, 10 Sep');
        });

        it('getJakartaDateString returns valid YYYY-MM-DD string', () => {
            const str = getJakartaDateString();
            expect(str).toMatch(/^\d{4}-\d{2}-\d{2}$/);
        });
    });

    describe('isDateAutoFilled', () => {
        it('returns false if records are empty', () => {
            expect(attendanceAutoFillService.isDateAutoFilled({})).toBe(false);
        });

        it('returns true when majority of records have [Auto-fill tag', () => {
            const records = {
                s1: { note: '[Auto-fill Sistem: Hadir]' },
                s2: { note: '[Auto-fill Sistem: Hadir]' },
                s3: { note: 'Sakit flu' },
            };
            expect(attendanceAutoFillService.isDateAutoFilled(records)).toBe(true);
        });

        it('returns false when no records have [Auto-fill tag', () => {
            const records = {
                s1: { note: 'Hadir tepat waktu' },
                s2: { note: '' },
            };
            expect(attendanceAutoFillService.isDateAutoFilled(records)).toBe(false);
        });
    });

    describe('autoFillWeeklyAttendance', () => {
        it('calls supabase.rpc with proper parameters', async () => {
            const mockResult = {
                success: true,
                week_start: '2026-09-07',
                week_end: '2026-09-11',
                target_date: '2026-09-10',
                total_inserted: 30,
                affected_classes: 1,
            };
            (supabase.rpc as any).mockResolvedValueOnce({ data: mockResult, error: null });

            const result = await attendanceAutoFillService.autoFillWeeklyAttendance({
                classId: 'class-123',
                targetDate: '2026-09-10',
                notes: '[Auto-fill Cepat: Hadir]',
            });

            expect(supabase.rpc).toHaveBeenCalledWith('auto_fill_weekly_missing_attendance', {
                p_class_id: 'class-123',
                p_target_date: '2026-09-10',
                p_notes: '[Auto-fill Cepat: Hadir]',
            });
            expect(result).toEqual(mockResult);
        });

        it('throws error when rpc fails', async () => {
            (supabase.rpc as any).mockResolvedValueOnce({ data: null, error: new Error('RPC failed') });

            await expect(
                attendanceAutoFillService.autoFillWeeklyAttendance({ classId: 'class-123' })
            ).rejects.toThrow('RPC failed');
        });
    });

    describe('getMissingWeekdaysForClass', () => {
        it('returns empty array if classId or studentIds is empty', async () => {
            const res = await attendanceAutoFillService.getMissingWeekdaysForClass('', []);
            expect(res).toEqual([]);
        });

        it('identifies unrecorded weekdays correctly', async () => {
            // Mock attendance response: only 2026-09-07 has records
            const mockSelect = vi.fn().mockReturnThis();
            const mockIn = vi.fn().mockReturnThis();
            const mockGte = vi.fn().mockReturnThis();
            const mockLte = vi.fn().mockReturnThis();
            const mockIs = vi.fn().mockResolvedValueOnce({
                data: [{ date: '2026-09-07' }],
                error: null,
            });

            (supabase.from as any).mockReturnValueOnce({
                select: mockSelect,
            });
            mockSelect.mockReturnValueOnce({
                in: mockIn,
            });
            mockIn.mockReturnValueOnce({
                gte: mockGte,
            });
            mockGte.mockReturnValueOnce({
                lte: mockLte,
            });
            mockLte.mockReturnValueOnce({
                is: mockIs,
            });

            // Target date is Thursday 2026-09-10. Weekdays up to Thursday: Mon 07, Tue 08, Wed 09, Thu 10
            // Mon 07 has record, so missing should be Tue 08, Wed 09, Thu 10
            const missing = await attendanceAutoFillService.getMissingWeekdaysForClass(
                'class-1',
                ['s1', 's2'],
                '2026-09-10'
            );

            expect(missing.length).toBe(3);
            expect(missing.map(m => m.date)).toEqual(['2026-09-08', '2026-09-09', '2026-09-10']);
        });
    });
});
