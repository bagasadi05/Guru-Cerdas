import React from 'react';
import { describe, it, expect } from 'vitest';
import { screen, fireEvent } from '@testing-library/react';
import { renderWithProviders } from '../test-utils';
import { AcademicTrendChart } from '../../src/components/pages/analytics/academic/AcademicTrendChart';
import { calculateAcademicTrends } from '../../src/services/academicAnalyticsService';
import type { AnalyticsAcademicRecord } from '../../src/components/pages/analytics/types';

describe('calculateAcademicTrends', () => {
    const mockRecords: AnalyticsAcademicRecord[] = [
        // Bahasa Indonesia - PH 1 entered on 2 different days
        {
            student_id: 's1',
            subject: 'Bahasa Indonesia',
            assessment_name: 'PH 1',
            score: 80,
            created_at: '2026-08-26T10:00:00Z',
        },
        {
            student_id: 's2',
            subject: 'Bahasa Indonesia',
            assessment_name: 'PH 1',
            score: 90,
            created_at: '2026-09-02T10:00:00Z', // Make-up test entered next week
        },
        // Bahasa Indonesia - PH 2
        {
            student_id: 's1',
            subject: 'Bahasa Indonesia',
            assessment_name: 'PH 2',
            score: 95,
            created_at: '2026-09-15T10:00:00Z',
        },
        // Matematika - PH 1
        {
            student_id: 's1',
            subject: 'Matematika',
            assessment_name: 'PH 1',
            score: 85,
            created_at: '2026-08-26T10:00:00Z',
        },
    ];

    it('groups student scores by assessment_name rather than fragmented input dates', () => {
        const trends = calculateAcademicTrends(mockRecords, ['Bahasa Indonesia', 'Matematika'], 'assessment');
        
        const bIndo = trends.find((t) => t.subject === 'Bahasa Indonesia')!;
        expect(bIndo).toBeDefined();
        // Should have 2 assessments (PH 1 and PH 2), not 3 split days
        expect(bIndo.data).toHaveLength(2);
        expect(bIndo.data[0].label).toBe('PH 1');
        // Average of 80 and 90 = 85
        expect(bIndo.data[0].average).toBe(85);
        expect(bIndo.data[0].count).toBe(2);

        expect(bIndo.data[1].label).toBe('PH 2');
        expect(bIndo.data[1].average).toBe(95);

        const mtk = trends.find((t) => t.subject === 'Matematika')!;
        expect(mtk).toBeDefined();
        expect(mtk.data).toHaveLength(1);
        expect(mtk.data[0].label).toBe('PH 1');
        expect(mtk.data[0].average).toBe(85);
    });

    it('groups student scores by calendar month when monthly mode is requested', () => {
        const trends = calculateAcademicTrends(mockRecords, ['Bahasa Indonesia'], 'monthly');
        const bIndo = trends.find((t) => t.subject === 'Bahasa Indonesia')!;
        expect(bIndo.data).toHaveLength(2); // Aug and Sep
        expect(bIndo.data[0].average).toBe(80); // Aug
        expect(bIndo.data[1].average).toBe(93); // Sep: (90 + 95) / 2 = 92.5 -> 93
    });
});

describe('AcademicTrendChart Component', () => {
    it('renders single assessment benchmark mode when only 1 assessment exists (Kelas 3A case)', () => {
        const singleAssessmentTrends = [
            {
                subject: 'Bahasa Indonesia',
                color: '#6366f1',
                data: [{ date: '2026-08-26', label: 'PH 1', average: 84, count: 30 }],
            },
            {
                subject: 'Matematika',
                color: '#f59e0b',
                data: [{ date: '2026-08-26', label: 'PH 1', average: 81, count: 29 }],
            },
            {
                subject: 'IPAS',
                color: '#22c55e',
                data: [{ date: '2026-08-31', label: 'PH 1', average: 94, count: 29 }],
            },
            {
                subject: 'Seni Budaya',
                color: '#ef4444',
                data: [{ date: '2026-09-06', label: 'PH 1', average: 86, count: 30 }],
            },
        ];

        renderWithProviders(
            <AcademicTrendChart trends={singleAssessmentTrends} kktpThreshold={75} />
        );

        // Chart header and description
        expect(screen.getByText(/Tren Nilai Per Mapel/i)).toBeInTheDocument();
        expect(screen.getByText(/Komparasi capaian nilai pada asesmen PH 1/i)).toBeInTheDocument();

        // Subject legend pill buttons with their average grades
        expect(screen.getByRole('button', { name: /Bahasa Indonesia/i })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /Matematika/i })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /IPAS/i })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /Seni Budaya/i })).toBeInTheDocument();

        // Informative guidance banner explaining why benchmark is rendered and when line chart triggers
        expect(screen.getByText(/Capaian Asesmen/i)).toBeInTheDocument();
        expect(screen.getByText(/Grafik garis tren perkembangan akan aktif otomatis/i)).toBeInTheDocument();
    });

    it('renders line chart mode when multiple assessments are present', () => {
        const multiAssessmentTrends = [
            {
                subject: 'Bahasa Indonesia',
                color: '#6366f1',
                data: [
                    { date: '2026-08-26', label: 'PH 1', average: 84, count: 30 },
                    { date: '2026-09-15', label: 'PH 2', average: 88, count: 30 },
                ],
            },
            {
                subject: 'Matematika',
                color: '#f59e0b',
                data: [
                    { date: '2026-08-26', label: 'PH 1', average: 81, count: 29 },
                    { date: '2026-09-15', label: 'PH 2', average: 85, count: 29 },
                ],
            },
        ];

        renderWithProviders(
            <AcademicTrendChart trends={multiAssessmentTrends} kktpThreshold={75} />
        );

        expect(screen.getByText(/Pergerakan nilai antar penilaian terhadap target KKTP/i)).toBeInTheDocument();
        // Should not show the single assessment banner
        expect(screen.queryByText(/Grafik garis tren perkembangan akan aktif otomatis/i)).not.toBeInTheDocument();
    });

    it('toggles subject visibility on legend click', () => {
        const trends = [
            {
                subject: 'Bahasa Indonesia',
                color: '#6366f1',
                data: [{ date: '2026-08-26', label: 'PH 1', average: 84, count: 30 }],
            },
            {
                subject: 'Matematika',
                color: '#f59e0b',
                data: [{ date: '2026-08-26', label: 'PH 1', average: 81, count: 29 }],
            },
        ];

        renderWithProviders(
            <AcademicTrendChart trends={trends} kktpThreshold={75} />
        );

        const bIndoBtn = screen.getByRole('button', { name: /Bahasa Indonesia/i });
        expect(bIndoBtn).toHaveClass('shadow-xs');

        // Click to toggle off
        fireEvent.click(bIndoBtn);
        expect(bIndoBtn).toHaveClass('opacity-40');

        // Click to toggle back on
        fireEvent.click(bIndoBtn);
        expect(bIndoBtn).toHaveClass('shadow-xs');
    });

    it('switches between Mingguan, Bulanan, and Per Asesmen view modes when academicRecords are supplied', () => {
        const records: AnalyticsAcademicRecord[] = [
            {
                student_id: 's1',
                subject: 'Bahasa Indonesia',
                assessment_name: 'PH 1',
                score: 84,
                created_at: '2026-08-26T10:00:00Z',
            },
            {
                student_id: 's1',
                subject: 'Bahasa Indonesia',
                assessment_name: 'PH 2',
                score: 88,
                created_at: '2026-09-15T10:00:00Z',
            },
        ];

        renderWithProviders(
            <AcademicTrendChart
                trends={[]}
                academicRecords={records}
                subjects={['Bahasa Indonesia']}
                kktpThreshold={75}
            />
        );

        const weeklyBtn = screen.getByRole('button', { name: /Mingguan/i });
        expect(weeklyBtn).toBeInTheDocument();
        expect(weeklyBtn).toHaveClass('bg-white');

        const monthlyBtn = screen.getByRole('button', { name: /Bulanan/i });
        expect(monthlyBtn).toBeInTheDocument();

        // Switch to monthly mode
        fireEvent.click(monthlyBtn);
        expect(monthlyBtn).toHaveClass('bg-white');

        const assessmentBtn = screen.getByRole('button', { name: /Per Asesmen/i });
        fireEvent.click(assessmentBtn);
        expect(assessmentBtn).toHaveClass('bg-white');
    });

    it('renders continuous line chart for subjects with staggered dates (e.g. Kelas 3A case)', () => {
        const staggeredTrends = [
            {
                subject: 'Bahasa Indonesia',
                color: '#6366f1',
                data: [
                    { date: '2026-08-23', label: '23 Agu', average: 84, count: 25 },
                    { date: '2026-08-30', label: '30 Agu', average: 83, count: 25 },
                ],
            },
            {
                subject: 'IPAS',
                color: '#22c55e',
                data: [
                    { date: '2026-08-30', label: '30 Agu', average: 94, count: 25 },
                    { date: '2026-09-06', label: '6 Sep', average: 91, count: 25 },
                ],
            },
            {
                subject: 'Matematika',
                color: '#f59e0b',
                data: [
                    { date: '2026-08-23', label: '23 Agu', average: 81, count: 25 },
                ],
            },
            {
                subject: 'Seni Budaya',
                color: '#ef4444',
                data: [
                    { date: '2026-09-06', label: '6 Sep', average: 86, count: 25 },
                ],
            },
        ];

        renderWithProviders(
            <AcademicTrendChart trends={staggeredTrends} kktpThreshold={75} />
        );

        // Multiple distinct dates (23 Agu, 30 Agu, 6 Sep) -> renders line chart
        expect(screen.getByText(/Pergerakan nilai antar penilaian terhadap target KKTP/i)).toBeInTheDocument();
        // All 4 subject buttons are present and active
        expect(screen.getByRole('button', { name: /Bahasa Indonesia/i })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /IPAS/i })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /Matematika/i })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /Seni Budaya/i })).toBeInTheDocument();
    });
});
