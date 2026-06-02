import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { screen } from '@testing-library/react';
import { renderWithProviders } from '../test-utils';
import ScheduleTimeline from '../../src/components/dashboard/ScheduleTimeline';
import GradeAuditWidget from '../../src/components/dashboard/GradeAuditWidget';

// Mock useGradeAudit hook
vi.mock('../../src/hooks/useGradeAudit', () => ({
    useGradeAudit: () => ({
        uniqueSubjects: ['Matematika', 'IPA'],
        subjectForCompletionCheck: '',
        setSubjectForCompletionCheck: vi.fn(),
        assessmentForCompletionCheck: '',
        setAssessmentForCompletionCheck: vi.fn(),
        selectedClassForCheck: '',
        setSelectedClassForCheck: vi.fn(),
        uniqueAssessmentsForSubject: [],
        studentsMissingGrade: [],
        completionPercentage: 0,
    }),
}));

describe('ScheduleTimeline', () => {
    it('renders empty state when no schedule', () => {
        renderWithProviders(
            <ScheduleTimeline schedule={[]} currentTime={new Date('2025-06-01T10:00:00')} />
        );
        expect(screen.getByText(/Tidak ada jadwal hari ini/i)).toBeInTheDocument();
    });

    it('renders schedule items', () => {
        const schedule = [
            {
                id: '1',
                subject: 'Matematika',
                start_time: '08:00',
                end_time: '09:30',
                class_id: 'c1',
                className: 'Kelas 7A',
            },
            {
                id: '2',
                subject: 'IPA',
                start_time: '10:00',
                end_time: '11:30',
                class_id: 'c2',
                className: 'Kelas 8B',
            },
        ];
        renderWithProviders(
            <ScheduleTimeline schedule={schedule} currentTime={new Date('2025-06-01T07:00:00')} />
        );
        expect(screen.getByText('Matematika')).toBeInTheDocument();
        expect(screen.getByText('IPA')).toBeInTheDocument();
        expect(screen.getByText('Kelas 7A')).toBeInTheDocument();
    });

    it('shows in-progress indicator for current class', () => {
        const schedule = [
            {
                id: '1',
                subject: 'Matematika',
                start_time: '08:00',
                end_time: '09:30',
                class_id: 'c1',
                className: 'Kelas 7A',
            },
        ];
        // Set time to 08:30 (mid-class)
        renderWithProviders(
            <ScheduleTimeline schedule={schedule} currentTime={new Date('2025-06-01T08:30:00')} />
        );
        expect(screen.getByText(/Berjalan/i)).toBeInTheDocument();
    });
});

describe('GradeAuditWidget', () => {
    const mockData = {
        classes: [
            { id: 'c1', name: 'Kelas 7A' },
            { id: 'c2', name: 'Kelas 8B' },
        ],
    };

    it('renders the widget title using i18n', () => {
        renderWithProviders(
            <GradeAuditWidget data={undefined} classes={mockData.classes as any} />
        );
        expect(screen.getByText('Audit Nilai')).toBeInTheDocument();
    });

    it('renders class selector', () => {
        renderWithProviders(
            <GradeAuditWidget data={undefined} classes={mockData.classes as any} />
        );
        expect(screen.getByText('Semua Kelas')).toBeInTheDocument();
    });

    it('shows empty state prompt when no subject selected', () => {
        renderWithProviders(
            <GradeAuditWidget data={undefined} classes={mockData.classes as any} />
        );
        expect(screen.getByText(/Pilih mapel untuk cek/i)).toBeInTheDocument();
    });
});
