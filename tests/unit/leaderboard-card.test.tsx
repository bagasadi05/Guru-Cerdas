import React from 'react';
import { describe, it, expect } from 'vitest';
import { screen, fireEvent } from '@testing-library/react';
import { renderWithProviders } from '../test-utils';
import { LeaderboardCard } from '../../src/components/gamification/LeaderboardCard';
import { StudentGameData } from '../../src/services/gamificationService';

describe('LeaderboardCard', () => {
    const mockClasses = [
        { id: 'c1', name: 'Kelas 7A' },
        { id: 'c2', name: 'Kelas 7B' },
    ];

    const mockStudentsData: StudentGameData[] = [
        {
            studentId: 's1',
            studentName: 'Ahmad Faiz',
            className: 'Kelas 7A',
            classId: 'c1',
            averageScore: 90,
            perfectScoreCount: 2,
            attendanceRate: 100,
            quizPoints: 50,
            violationCount: 0,
        },
        {
            studentId: 's2',
            studentName: 'Budi Santoso',
            className: 'Kelas 7B',
            classId: 'c2',
            averageScore: 85,
            perfectScoreCount: 1,
            attendanceRate: 90,
            quizPoints: 30,
            violationCount: 0,
        },
        {
            studentId: 's3',
            studentName: 'Citra Dewi',
            className: 'Kelas 7A',
            classId: 'c1',
            averageScore: 80,
            perfectScoreCount: 0,
            attendanceRate: 80,
            quizPoints: 20,
            violationCount: 0,
        },
    ];

    it('renders and is always open by default without empty box', () => {
        renderWithProviders(
            <LeaderboardCard
                studentsData={mockStudentsData}
                classes={mockClasses}
            />
        );

        // Header should be rendered
        expect(screen.getByText('Papan Peringkat')).toBeInTheDocument();
        expect(screen.getByText('Top Siswa Berprestasi')).toBeInTheDocument();

        // Students should be visible immediately
        expect(screen.getByText('Ahmad Faiz')).toBeInTheDocument();
        expect(screen.getByText('Budi Santoso')).toBeInTheDocument();
        expect(screen.getByText('Citra Dewi')).toBeInTheDocument();

        // Points labels should be visible
        const pointElements = screen.getAllByText(/poin/i);
        expect(pointElements.length).toBe(3);
    });

    it('filters students by class when class selector changes', () => {
        renderWithProviders(
            <LeaderboardCard
                studentsData={mockStudentsData}
                classes={mockClasses}
            />
        );

        const select = screen.getByRole('combobox');
        expect(select).toBeInTheDocument();

        // Filter to Kelas 7B
        fireEvent.change(select, { target: { value: 'c2' } });

        // Only Budi Santoso belongs to Kelas 7B
        expect(screen.getByText('Budi Santoso')).toBeInTheDocument();
        expect(screen.queryByText('Ahmad Faiz')).not.toBeInTheDocument();
    });

    it('shows empty message when class filter has no students', () => {
        renderWithProviders(
            <LeaderboardCard
                studentsData={mockStudentsData}
                classes={[...mockClasses, { id: 'c3', name: 'Kelas Kosong' }]}
            />
        );

        const select = screen.getByRole('combobox');
        fireEvent.change(select, { target: { value: 'c3' } });

        expect(screen.getByText('Belum ada data siswa atau poin untuk kelas ini.')).toBeInTheDocument();
    });

    it('supports collapsible mode if explicitly specified', () => {
        renderWithProviders(
            <LeaderboardCard
                studentsData={mockStudentsData}
                classes={mockClasses}
                collapsible={true}
                defaultOpen={false}
            />
        );

        // Initially closed when defaultOpen=false and collapsible=true
        expect(screen.queryByText('Ahmad Faiz')).not.toBeInTheDocument();

        // Click to toggle open
        const button = screen.getByRole('button', { name: /Papan Peringkat/i });
        fireEvent.click(button);

        expect(screen.getByText('Ahmad Faiz')).toBeInTheDocument();
    });
});
