import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen } from '@testing-library/react';
import { renderWithProviders } from '../test-utils';
import { SmartInsightsPanel } from '../../src/components/pages/analytics/SmartInsightsPanel';
import { supabase } from '../../src/services/supabase';

// Mock Semester
vi.mock('../../src/contexts/SemesterContext', async (importOriginal) => {
    const actual = await importOriginal<Record<string, unknown>>();
    return {
        ...actual,
        useSemester: () => ({
            activeSemester: { id: 'sem-1', academic_year: '2025/2026', semester: '1' },
            activeYear: { id: 'year-1', name: '2025/2026' },
            semesters: [],
            academicYears: [],
            loading: false,
            switchSemester: vi.fn(),
            refreshSemesters: vi.fn(),
        }),
    };
});

// Mock Supabase data
let mockQueryData: Record<string, unknown[]> = {
    classes: [],
    students: [],
    violations: [],
    attendance: [],
    academic_records: [],
};

describe('SmartInsightsPanel Redesign', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        vi.spyOn(supabase, 'from').mockImplementation(((table: string) => {
            const data = mockQueryData[table] || [];
            const builder: any = {
                select: vi.fn(() => builder),
                is: vi.fn(() => builder),
                eq: vi.fn(() => builder),
                single: vi.fn().mockResolvedValue({ data: null, error: null }),
                maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
                then: (onfulfilled?: (res: { data: unknown[]; error: null }) => unknown, onrejected?: (err: unknown) => unknown) => {
                    return Promise.resolve({ data, error: null }).then(onfulfilled, onrejected);
                },
            };
            return builder;
        }) as any);
    });

    it('renders "Kondisi Normal" state when there are no active anomalies', async () => {
        mockQueryData = {
            classes: [{ id: 'c1', name: 'Kelas 1A' }],
            students: [{ id: 's1', name: 'Budi Santoso', class_id: 'c1' }],
            violations: [],
            attendance: [],
            academic_records: [],
        };

        renderWithProviders(<SmartInsightsPanel />);

        expect(await screen.findByText('Kondisi Sekolah Stabil & Normal')).toBeInTheDocument();
        expect(screen.getByText('Insight & Peringatan Cerdas')).toBeInTheDocument();
        expect(screen.getByText('Kondisi Normal')).toBeInTheDocument();
    });

    it('formats student names in Title Case and renders violation badges cleanly', async () => {
        mockQueryData = {
            classes: [
                { id: 'c1', name: 'Kelas 1C' },
                { id: 'c2', name: 'Kelas 3C' },
            ],
            students: [
                { id: 's1', name: 'ACINTYA HAFIDZAH PARAMUSITA', class_id: 'c1' },
                { id: 's2', name: 'BELAID MUHAMMAD ABD EL RAOUF', class_id: 'c2' },
            ],
            violations: [
                { student_id: 's1' },
                { student_id: 's1' },
                { student_id: 's1' },
                { student_id: 's2' },
                { student_id: 's2' },
                { student_id: 's2' },
            ],
            attendance: [],
            academic_records: [],
        };

        renderWithProviders(<SmartInsightsPanel />);

        // Should render Title Case name instead of ALL CAPS
        expect(await screen.findByText('Acintya Hafidzah Paramusita')).toBeInTheDocument();
        expect(screen.getByText('Belaid Muhammad Abd El Raouf')).toBeInTheDocument();

        // Should render class badge separately
        expect(screen.getByText('Kelas 1C')).toBeInTheDocument();
        expect(screen.getByText('Kelas 3C')).toBeInTheDocument();

        // Should render violation count pill badges
        const countBadges = screen.getAllByText('3 pelanggaran');
        expect(countBadges.length).toBeGreaterThan(0);
    });

    it('renders violation spike card with comparison metrics and CTA button', async () => {
        mockQueryData = {
            classes: [
                { id: 'c1', name: 'Kelas 6A' },
                { id: 'c2', name: 'Kelas 6B' },
            ],
            students: [
                { id: 's1', name: 'Siswa 1', class_id: 'c1' },
                { id: 's2', name: 'Siswa 2', class_id: 'c2' },
            ],
            violations: [
                // 10 violations for c1, 0 for c2 -> average is 5 -> c1 has 10 (>= 2 * 5)
                ...Array(10).fill({ student_id: 's1' }),
            ],
            attendance: [],
            academic_records: [],
        };

        renderWithProviders(<SmartInsightsPanel />);

        expect(await screen.findByText('Lonjakan Pelanggaran di Kelas 6A')).toBeInTheDocument();
        expect(screen.getByText('Kasus Kelas 6A')).toBeInTheDocument();
        expect(screen.getByText('Rata-rata Sekolah')).toBeInTheDocument();
        expect(screen.getByText('Lihat Analisis Kelas')).toBeInTheDocument();
    });

    it('renders academic score anomaly card with benchmark comparisons', async () => {
        // 5 records for c1 (avg 75), 5 records for c2 (avg 90) -> school avg 82.5, c1 is < 82.5 - 5
        mockQueryData = {
            classes: [
                { id: 'c1', name: 'Kelas 6A' },
                { id: 'c2', name: 'Kelas 6B' },
            ],
            students: [
                { id: 's1', name: 'Siswa 1', class_id: 'c1' },
                { id: 's2', name: 'Siswa 2', class_id: 'c2' },
            ],
            violations: [],
            attendance: [],
            academic_records: [
                ...Array(5).fill({ student_id: 's1', score: 75 }),
                ...Array(5).fill({ student_id: 's2', score: 90 }),
            ],
        };

        renderWithProviders(<SmartInsightsPanel />);

        expect(await screen.findByText(/Rata Nilai di Bawah Sekolah/i)).toBeInTheDocument();
        expect(screen.getByText('Kelas 6A')).toBeInTheDocument();
        expect(screen.getByText('75')).toBeInTheDocument();
        expect(screen.getByText(/Rata sekolah: 82.5/i)).toBeInTheDocument();
        expect(screen.getByText('Buka Analisis Nilai Lengkap')).toBeInTheDocument();
    });

    it('renders refresh button and WhatsApp contact action for at-risk students with parent phone', async () => {
        mockQueryData = {
            classes: [{ id: 'c1', name: 'Kelas 5B' }],
            students: [
                {
                    id: 's1',
                    name: 'Muhammad Farhan',
                    class_id: 'c1',
                    parent_phone: '08123456789',
                    parent_name: 'Pak Ahmad',
                },
            ],
            violations: [
                { student_id: 's1' },
                { student_id: 's1' },
                { student_id: 's1' },
            ],
            attendance: [],
            academic_records: [],
        };

        renderWithProviders(<SmartInsightsPanel />);

        // Refresh button should be present
        expect(await screen.findByTitle('Segarkan data insight')).toBeInTheDocument();

        // Student name in title case
        expect(screen.getByText('Muhammad Farhan')).toBeInTheDocument();

        // WhatsApp button should be rendered
        const waButton = screen.getByTitle(/Hubungi Wali Santri via WhatsApp/i);
        expect(waButton).toBeInTheDocument();
        expect(waButton).toHaveAttribute('href');
        expect(waButton.getAttribute('href')).toContain('https://wa.me/628123456789');
    });
});
