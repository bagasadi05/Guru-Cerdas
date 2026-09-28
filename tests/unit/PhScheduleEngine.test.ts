import { describe, it, expect } from 'vitest';
import { PhScheduleEngine, PhScheduleItem } from '../../src/components/schedule/engine/PhScheduleEngine';
import { normalizeSubjectDisplay } from '../../src/components/schedule/engine/usePhScheduleDomain';

const createMockSchedule = (
    partial: Partial<PhScheduleItem> & { id: string; subject: string; date: string; period_label: string }
): PhScheduleItem => ({
    class_id: 'cls-1',
    semester_id: 'sem-1',
    created_by: 'user-1',
    created_at: '2026-09-20T00:00:00Z',
    updated_at: '2026-09-20T00:00:00Z',
    deleted_at: null,
    ...partial,
});

const mockSchedules: PhScheduleItem[] = [
    createMockSchedule({
        id: 'ph-1',
        subject: 'Matematika',
        date: '2026-10-01',
        period_label: '1-2',
    }),
    createMockSchedule({
        id: 'ph-2',
        subject: 'Bahasa Indonesia',
        date: '2026-10-01',
        period_label: '3-4',
    }),
    createMockSchedule({
        id: 'ph-3',
        subject: 'IPA',
        date: '2026-10-01',
        period_label: '5-6',
    }),
    createMockSchedule({
        id: 'ph-4',
        subject: 'IPS',
        date: '2026-10-05',
        period_label: '1-2',
    }),
];

describe('PhScheduleEngine (Pure Domain Engine)', () => {
    it('correctly calculates item status relative to reference today', () => {
        const refToday = '2026-10-01';
        expect(PhScheduleEngine.getItemStatus('2026-10-01', refToday)).toBe('today');
        expect(PhScheduleEngine.getItemStatus('2026-10-05', refToday)).toBe('upcoming');
        expect(PhScheduleEngine.getItemStatus('2026-09-30', refToday)).toBe('past');
    });

    it('formats relative date badges accurately', () => {
        const refDate = new Date('2026-10-01T00:00:00');
        expect(PhScheduleEngine.getRelativeDateLabel('2026-10-01', refDate)).toBe('Hari Ini');
        expect(PhScheduleEngine.getRelativeDateLabel('2026-10-02', refDate)).toBe('Besok');
        expect(PhScheduleEngine.getRelativeDateLabel('2026-10-03', refDate)).toBe('Lusa');
        expect(PhScheduleEngine.getRelativeDateLabel('2026-10-05', refDate)).toBe('4 hari lagi');
        expect(PhScheduleEngine.getRelativeDateLabel('2026-09-30', refDate)).toBe('Kemarin');
    });

    it('detects schedule conflicts and heavy days', () => {
        const schedulesWithConflict: PhScheduleItem[] = [
            ...mockSchedules,
            createMockSchedule({
                id: 'ph-5',
                subject: 'Fisika',
                date: '2026-10-01',
                period_label: '1-2', // Conflict with Matematika!
            }),
        ];

        const anomalies = PhScheduleEngine.auditAnomalies(schedulesWithConflict);
        expect(anomalies.hasConflicts).toBe(true);
        expect(anomalies.conflicts.length).toBe(1);
        expect(anomalies.conflicts[0].date).toBe('2026-10-01');
        expect(anomalies.conflicts[0].period).toBe('1-2');
        expect(anomalies.conflicts[0].subjects).toContain('Matematika');
        expect(anomalies.conflicts[0].subjects).toContain('Fisika');

        // Heavy days (2026-10-01 has 4 assessments)
        expect(anomalies.heavyDays.length).toBe(1);
        expect(anomalies.heavyDays[0].date).toBe('2026-10-01');
        expect(anomalies.heavyDays[0].count).toBe(4);
    });

    it('filters and sorts schedules', () => {
        const filtered = PhScheduleEngine.filterAndSort(
            mockSchedules,
            { searchQuery: 'matematika', sortOrder: 'asc' },
            '2026-10-01'
        );
        expect(filtered.length).toBe(1);
        expect(filtered[0].subject).toBe('Matematika');
    });

    it('generates WhatsApp broadcast text', () => {
        const waText = PhScheduleEngine.generateWhatsAppText(
            mockSchedules,
            { className: 'Kelas 9A', semesterName: 'Semester Ganjil' },
            'all',
            '2026-09-20'
        );

        expect(waText).toContain('*JADWAL PENILAIAN HARIAN (PH)*');
        expect(waText).toContain('Kelas 9A');
        expect(waText).toContain('Semester Ganjil');
        expect(waText).toContain('Matematika');
        expect(waText).toContain('Jam Ke-1-2');
    });

    it('calculates status counts correctly', () => {
        const counts = PhScheduleEngine.getStatusCounts(mockSchedules, '2026-10-01');
        expect(counts.all).toBe(4);
        expect(counts.today).toBe(3);
        expect(counts.upcoming).toBe(1);
        expect(counts.past).toBe(0);
    });

    it('calculates Monday-to-Friday school week days and shifts with weekOffset', () => {
        // Test with a known Sunday: 2026-09-27
        const refSunday = new Date('2026-09-27T10:00:00');
        const days = PhScheduleEngine.getSchoolWeekDays(refSunday, 0);

        expect(days.length).toBe(5);
        expect(days[0].dayName).toBe('Senin');
        expect(days[0].dateStr).toBe('2026-09-28');
        expect(days[0].dateFormatted).toContain('28');

        expect(days[1].dayName).toBe('Selasa');
        expect(days[1].dateStr).toBe('2026-09-29');

        expect(days[2].dayName).toBe('Rabu');
        expect(days[2].dateStr).toBe('2026-09-30');

        expect(days[3].dayName).toBe('Kamis');
        expect(days[3].dateStr).toBe('2026-10-01');

        expect(days[4].dayName).toBe('Jumat');
        expect(days[4].dateStr).toBe('2026-10-02');

        // Test week offset +1 (next week)
        const nextWeekDays = PhScheduleEngine.getSchoolWeekDays(refSunday, 1);
        expect(nextWeekDays[0].dateStr).toBe('2026-10-05');
        expect(nextWeekDays[4].dateStr).toBe('2026-10-09');

        // Test week offset -1 (previous week)
        const prevWeekDays = PhScheduleEngine.getSchoolWeekDays(refSunday, -1);
        expect(prevWeekDays[0].dateStr).toBe('2026-09-21');
        expect(prevWeekDays[4].dateStr).toBe('2026-09-25');
    });

    it('formats week range label cleanly across months and within the same month', () => {
        const d1 = new Date('2026-09-28T00:00:00');
        const d2 = new Date('2026-10-02T00:00:00');
        const range1 = PhScheduleEngine.formatWeekRangeLabel(d1, d2);
        expect(range1).toBe('28 September – 2 Oktober 2026');

        const d3 = new Date('2026-10-05T00:00:00');
        const d4 = new Date('2026-10-09T00:00:00');
        const range2 = PhScheduleEngine.formatWeekRangeLabel(d3, d4);
        expect(range2).toBe('5 – 9 Oktober 2026');
    });

    describe('normalizeSubjectDisplay', () => {
        it('normalizes Ass. Bhs Arab and variations to Bahasa Arab', () => {
            expect(normalizeSubjectDisplay('Ass. Bhs Arab')).toBe('Bahasa Arab');
            expect(normalizeSubjectDisplay('Ass Bhs Arab')).toBe('Bahasa Arab');
            expect(normalizeSubjectDisplay('Bhs Arab')).toBe('Bahasa Arab');
            expect(normalizeSubjectDisplay('bhs. arab')).toBe('Bahasa Arab');
            expect(normalizeSubjectDisplay('Bahasa Arab')).toBe('Bahasa Arab');
        });

        it('normalizes BHS INDONESIA and abbreviations to Bahasa Indonesia', () => {
            expect(normalizeSubjectDisplay('BHS INDONESIA')).toBe('Bahasa Indonesia');
            expect(normalizeSubjectDisplay('Ass. Bhs Indonesia')).toBe('Bahasa Indonesia');
            expect(normalizeSubjectDisplay('Bhs Indonesia')).toBe('Bahasa Indonesia');
        });

        it('normalizes other common subject names', () => {
            expect(normalizeSubjectDisplay('Bhs Inggris')).toBe('Bahasa Inggris');
            expect(normalizeSubjectDisplay('Bhs Jawa')).toBe('Bahasa Jawa');
            expect(normalizeSubjectDisplay('ipas')).toBe('IPAS');
            expect(normalizeSubjectDisplay('MATEMATIKA')).toBe('Matematika');
            expect(normalizeSubjectDisplay('Fikih')).toBe('Fikih');
        });
    });
});
