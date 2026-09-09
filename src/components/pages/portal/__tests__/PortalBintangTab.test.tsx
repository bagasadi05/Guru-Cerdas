import React from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { PortalBintangTab, type PortalBintangEvaluation } from '../PortalBintangTab';

describe('PortalBintangTab', () => {
    it('renders empty state when evaluations is empty', () => {
        render(<PortalBintangTab evaluations={[]} />);
        expect(screen.getByText('Belum Ada Rapor')).toBeInTheDocument();
        expect(screen.getByText(/Rapor BINTANG untuk semester ini belum dipublikasikan/i)).toBeInTheDocument();
    });

    it('renders empty state when all evaluations are unpublished drafts (US-1 security filter)', () => {
        const drafts: PortalBintangEvaluation[] = [
            {
                id: 'eval-draft-1',
                month: '2026-08',
                is_published: false,
                adab_score: 'B',
                adab_notes: 'Draft note adab yang belum disetujui',
                kedisiplinan_score: 'C',
                kedisiplinan_notes: 'Draft kedisiplinan',
                kerapian_score: 'B',
                kerapian_notes: 'Draft kerapian',
                catatan_wali: 'Draft rahasia wali kelas',
            },
        ];

        render(<PortalBintangTab evaluations={drafts} />);
        // Since is_published is false, empty state should be rendered
        expect(screen.getByText('Belum Ada Rapor')).toBeInTheDocument();
        // Draft notes must NEVER be visible
        expect(screen.queryByText('Draft note adab yang belum disetujui')).not.toBeInTheDocument();
        expect(screen.queryByText('Draft rahasia wali kelas')).not.toBeInTheDocument();
    });

    it('renders only published evaluations and filters out unpublished drafts', () => {
        const mixedEvaluations: PortalBintangEvaluation[] = [
            {
                id: 'eval-draft-1',
                month: '2026-08',
                is_published: false,
                adab_score: 'C',
                adab_notes: 'Catatan draft yang tidak boleh terlihat',
                catatan_wali: 'Draft note wali',
            },
            {
                id: 'eval-pub-1',
                month: '2026-09',
                is_published: true,
                adab_score: 'A',
                adab_notes: 'Siswa menunjukkan adab sangat mulia',
                kedisiplinan_score: 'A',
                kedisiplinan_notes: 'Selalu tepat waktu',
                kerapian_score: 'A',
                kerapian_notes: 'Seragam rapi dan lengkap',
                catatan_wali: 'Pertahankan prestasi Ananda!',
            },
        ];

        render(<PortalBintangTab evaluations={mixedEvaluations} />);

        // Published evaluation elements should be visible
        expect(screen.getByText(/Bulan: September 2026/i)).toBeInTheDocument();
        expect(screen.getByText('"Siswa menunjukkan adab sangat mulia"')).toBeInTheDocument();
        expect(screen.getByText('Pertahankan prestasi Ananda!')).toBeInTheDocument();

        // Draft evaluation must NOT be visible
        expect(screen.queryByText(/Bulan: Agustus 2026/i)).not.toBeInTheDocument();
        expect(screen.queryByText('Catatan draft yang tidak boleh terlihat')).not.toBeInTheDocument();
    });
});
