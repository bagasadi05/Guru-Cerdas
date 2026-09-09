import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { PembinaanTab } from '../PembinaanTab';

describe('PembinaanTab (RBAC & Rendering)', () => {
    const mockLogs = [
        {
            id: 'log-1',
            date: '2026-09-01',
            notes: 'Pembinaan kedisiplinan sholat dhuha',
            mentor_role: 'Wali Kelas',
            students: { name: 'Ahmad Dahlan' },
        },
        {
            id: 'log-2',
            date: '2026-09-02',
            notes: 'Konseling motivasi belajar',
            mentor_role: 'Guru BK',
            students: { name: 'Fatimah Zahra' },
        },
    ];

    it('renders action buttons and Add button when user is homeroom teacher (isWalas: true)', () => {
        const handleOpenMentoringModal = vi.fn();
        const handleOpenEditMentoring = vi.fn();
        const handleDeleteMentoring = vi.fn();

        render(
            <PembinaanTab
                mentoringLogs={mockLogs}
                isWalas={true}
                onOpenMentoringModal={handleOpenMentoringModal}
                onOpenEditMentoring={handleOpenEditMentoring}
                onDeleteMentoring={handleDeleteMentoring}
            />
        );

        // Add button visible
        expect(screen.getByRole('button', { name: /Catat Pembinaan/i })).toBeInTheDocument();

        // Aksi header visible
        expect(screen.getByText('Aksi')).toBeInTheDocument();

        // Edit and Delete buttons visible
        const editButtons = screen.getAllByTitle('Edit');
        expect(editButtons).toHaveLength(2);

        const deleteButtons = screen.getAllByTitle('Hapus');
        expect(deleteButtons).toHaveLength(2);

        // Clicking edit calls onOpenEditMentoring
        fireEvent.click(editButtons[0]);
        expect(handleOpenEditMentoring).toHaveBeenCalledWith(mockLogs[0]);

        // Clicking delete calls onDeleteMentoring
        fireEvent.click(deleteButtons[1]);
        expect(handleDeleteMentoring).toHaveBeenCalledWith(mockLogs[1]);
    });

    it('hides action buttons and Add button when user is NOT homeroom teacher (isWalas: false)', () => {
        const handleOpenMentoringModal = vi.fn();
        const handleOpenEditMentoring = vi.fn();
        const handleDeleteMentoring = vi.fn();

        render(
            <PembinaanTab
                mentoringLogs={mockLogs}
                isWalas={false}
                onOpenMentoringModal={handleOpenMentoringModal}
                onOpenEditMentoring={handleOpenEditMentoring}
                onDeleteMentoring={handleDeleteMentoring}
            />
        );

        // Add button must NOT be rendered
        expect(screen.queryByRole('button', { name: /Catat Pembinaan/i })).not.toBeInTheDocument();

        // Aksi header must NOT be rendered
        expect(screen.queryByText('Aksi')).not.toBeInTheDocument();

        // Edit and Delete buttons must NOT be rendered
        expect(screen.queryByTitle('Edit')).not.toBeInTheDocument();
        expect(screen.queryByTitle('Hapus')).not.toBeInTheDocument();

        // Content should still be readable
        expect(screen.getByText('Ahmad Dahlan')).toBeInTheDocument();
        expect(screen.getByText('Pembinaan kedisiplinan sholat dhuha')).toBeInTheDocument();
    });

    it('filters logs based on search query', () => {
        render(
            <PembinaanTab
                mentoringLogs={mockLogs}
                isWalas={true}
                onOpenMentoringModal={vi.fn()}
                onOpenEditMentoring={vi.fn()}
                onDeleteMentoring={vi.fn()}
            />
        );

        const searchInput = screen.getByPlaceholderText('Cari siswa atau catatan...');
        fireEvent.change(searchInput, { target: { value: 'Fatimah' } });

        expect(screen.getByText('Fatimah Zahra')).toBeInTheDocument();
        expect(screen.queryByText('Ahmad Dahlan')).not.toBeInTheDocument();
    });
});
