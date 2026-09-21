import { describe, it, expect } from 'vitest';
import { PhScheduleEngine, PhScheduleItem } from '../../src/components/schedule/engine/PhScheduleEngine';

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
});
