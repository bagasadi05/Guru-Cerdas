import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { BintangTrendChart } from '../BintangTrendChart';
import { supabase } from '../../../../services/supabase';
import { bintangService } from '../../../../services/bintangService';

vi.mock('../../../../services/supabase', () => ({
    supabase: {
        from: vi.fn(),
    },
}));

vi.mock('../../../../services/bintangService', () => ({
    bintangService: {
        getViolationsForClass: vi.fn(),
        getViolationsForStudent: vi.fn(),
    },
    calculateAspectPoints: vi.fn((violations) => {
        const total = (violations || []).reduce((acc: number, v: any) => acc + (v.points || 0), 0);
        return {
            ADAB: { points: total > 20 ? total : 0, grade: 'A' },
            KEDISIPLINAN: { points: total, grade: 'B' },
            KERAPIAN: { points: 0, grade: 'A' },
        };
    }),
    BINTANG_THRESHOLDS: [
        { grade: 'A', label: 'Sangat Baik', maxPoints: 0, color: 'emerald' },
        { grade: 'B', label: 'Baik', maxPoints: 10, color: 'blue' },
        { grade: 'C', label: 'Cukup', maxPoints: 20, color: 'amber' },
        { grade: 'D', label: 'Kurang', maxPoints: Infinity, color: 'rose' },
    ],
}));

describe('BintangTrendChart', () => {
    beforeEach(() => {
        vi.clearAllMocks();

        // Mock students query
        (supabase.from as any).mockReturnValue({
            select: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                    is: vi.fn().mockReturnValue({
                        order: vi.fn().mockResolvedValue({
                            data: [
                                { id: 's1', name: 'Ahmad' },
                                { id: 's2', name: 'Budi' },
                            ],
                        }),
                    }),
                }),
            }),
        });
    });

    it('renders empty state when no class is selected', () => {
        render(<BintangTrendChart selectedClass="" />);
        expect(screen.getByText('Pilih kelas untuk melihat tren bulanan')).toBeInTheDocument();
    });

    it('dynamically adapts Y-axis ticks to high violation points (US-3)', async () => {
        // Mock a class with high violation points (e.g. 40 points in Kedisiplinan)
        (bintangService.getViolationsForClass as any).mockResolvedValue([
            { description: 'Pelanggaran berat', points: 40 },
        ]);

        render(<BintangTrendChart selectedClass="class-1" />);

        await waitFor(() => {
            expect(screen.getByText('Tren Poin Pelanggaran (6 Bulan Terakhir)')).toBeInTheDocument();
        });

        // The Y-axis and table should scale up to 40 dynamically instead of clipping at 25
        await waitFor(() => {
            const elements = screen.getAllByText('40');
            expect(elements.length).toBeGreaterThanOrEqual(1);
        });
    });
});
