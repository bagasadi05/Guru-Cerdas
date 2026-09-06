import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { screen, fireEvent } from '@testing-library/react';
import { renderWithProviders } from '../test-utils';
import ClassAnalyticsSection from '../../src/components/dashboard/ClassAnalyticsSection';

// Mock supabase
vi.mock('../../src/services/supabase', () => ({
    supabase: {
        from: vi.fn(() => ({
            select: vi.fn(() => ({
                eq: vi.fn(() => ({
                    is: vi.fn().mockResolvedValue({ data: [], error: null }),
                })),
            })),
        })),
    },
}));

describe('ClassAnalyticsSection', () => {
    const mockClasses = [
        { id: 'c1', name: 'Kelas 1A' },
        { id: 'c2', name: 'Kelas 1B' },
        { id: 'c3', name: 'Kelas 2A' },
    ];

    const mockStudents = [
        { id: 's1', class_id: 'c1' },
        { id: 's2', class_id: 'c1' },
        { id: 's3', class_id: 'c2' },
        { id: 's4', class_id: 'c3' },
    ];

    const mockAcademicRecords = [
        { student_id: 's1', score: 80 },
        { student_id: 's2', score: 90 },
        { student_id: 's3', score: 70 },
        { student_id: 's4', score: 85 },
    ];

    const mockAttendanceRecords = [
        { student_id: 's1', status: 'Hadir', date: '2026-09-01' },
        { student_id: 's2', status: 'Hadir', date: '2026-09-01' },
        { student_id: 's3', status: 'Sakit', date: '2026-09-01' },
        { student_id: 's4', status: 'Hadir', date: '2026-09-01' },
    ];

    it('renders the section title and class items when open', () => {
        renderWithProviders(
            <ClassAnalyticsSection
                classes={mockClasses}
                students={mockStudents}
                academicRecords={mockAcademicRecords}
                attendanceRecords={mockAttendanceRecords}
                defaultOpen={true}
            />
        );

        expect(screen.getByText('Analisis Kelas')).toBeInTheDocument();
        expect(screen.getByText('Kelas 1A')).toBeInTheDocument();
        expect(screen.getByText('Kelas 1B')).toBeInTheDocument();
        expect(screen.getByText('Kelas 2A')).toBeInTheDocument();
    });

    it('renders grade filter chips and filters classes correctly', () => {
        renderWithProviders(
            <ClassAnalyticsSection
                classes={mockClasses}
                students={mockStudents}
                academicRecords={mockAcademicRecords}
                attendanceRecords={mockAttendanceRecords}
                defaultOpen={true}
            />
        );

        // Filter buttons should exist
        const allBtn = screen.getByRole('button', { name: /Semua/i });
        const grade1Btn = screen.getByRole('button', { name: /Kelas 1/i });
        const grade2Btn = screen.getByRole('button', { name: /Kelas 2/i });

        expect(allBtn).toBeInTheDocument();
        expect(grade1Btn).toBeInTheDocument();
        expect(grade2Btn).toBeInTheDocument();

        // Click Kelas 2 filter
        fireEvent.click(grade2Btn);

        // Only Kelas 2A should be visible
        expect(screen.getByText('Kelas 2A')).toBeInTheDocument();
        expect(screen.queryByText('Kelas 1A')).not.toBeInTheDocument();
        expect(screen.queryByText('Kelas 1B')).not.toBeInTheDocument();

        // Click back to Semua
        fireEvent.click(allBtn);
        expect(screen.getByText('Kelas 1A')).toBeInTheDocument();
        expect(screen.getByText('Kelas 2A')).toBeInTheDocument();
    });

    it('displays explicit Nilai Rata-rata and Kehadiran metrics', () => {
        renderWithProviders(
            <ClassAnalyticsSection
                classes={mockClasses}
                students={mockStudents}
                academicRecords={mockAcademicRecords}
                attendanceRecords={mockAttendanceRecords}
                defaultOpen={true}
            />
        );

        const gradeLabels = screen.getAllByText('Nilai Rata-rata');
        expect(gradeLabels.length).toBeGreaterThan(0);

        const attendanceLabels = screen.getAllByText('Kehadiran');
        expect(attendanceLabels.length).toBeGreaterThan(0);
    });
});
