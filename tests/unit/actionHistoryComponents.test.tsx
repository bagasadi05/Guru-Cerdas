import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import { ActionHistoryHeader } from '../../src/components/history/components/ActionHistoryHeader';
import { ActionHistoryStatsCards } from '../../src/components/history/components/ActionHistoryStatsCards';
import { ActionHistoryFilters } from '../../src/components/history/components/ActionHistoryFilters';
import { ActionHistoryTimeline } from '../../src/components/history/components/ActionHistoryTimeline';
import { ActionHistoryItem } from '../../src/services/UndoManager';

describe('ActionHistory Component Decomposition', () => {
    it('renders ActionHistoryHeader with title and buttons', () => {
        const onExportClick = vi.fn();
        const onInfoClick = vi.fn();
        const onClearClick = vi.fn();

        render(
            <ActionHistoryHeader
                totalCount={42}
                hasItems={true}
                isClearPending={false}
                onExportClick={onExportClick}
                onInfoClick={onInfoClick}
                onClearHistoryClick={onClearClick}
            />
        );

        expect(screen.getByText('Riwayat Aksi')).toBeInTheDocument();
        expect(screen.getByText('42 aksi ditemukan')).toBeInTheDocument();

        fireEvent.click(screen.getByRole('button', { name: /export/i }));
        expect(onExportClick).toHaveBeenCalled();

        fireEvent.click(screen.getByTitle('Informasi'));
        expect(onInfoClick).toHaveBeenCalled();

        fireEvent.click(screen.getByRole('button', { name: /hapus riwayat/i }));
        expect(onClearClick).toHaveBeenCalled();
    });

    it('renders ActionHistoryStatsCards with correct counts', () => {
        const stats = {
            total: 100,
            undoable: 15,
            create: 50,
            update: 30,
            delete: 20,
        };

        render(<ActionHistoryStatsCards stats={stats} />);

        expect(screen.getByText('100')).toBeInTheDocument();
        expect(screen.getByText('50')).toBeInTheDocument();
        expect(screen.getByText('30')).toBeInTheDocument();
        expect(screen.getByText('20')).toBeInTheDocument();
        expect(screen.getByText('15')).toBeInTheDocument();
    });

    it('renders ActionHistoryFilters and handles filter toggle and search', () => {
        const onSearchChange = vi.fn();
        const onToggleFilters = vi.fn();

        render(
            <ActionHistoryFilters
                searchQuery="test"
                onSearchChange={onSearchChange}
                showFilters={true}
                onToggleShowFilters={onToggleFilters}
                hasActiveFilters={true}
                activeFilterCount={1}
                filterType="all"
                onFilterTypeChange={() => {}}
                filterEntity="all"
                onFilterEntityChange={() => {}}
                dateRange={{}}
                onDateRangeChange={() => {}}
                totalCount={5}
                onClearFilters={() => {}}
            />
        );

        const searchInput = screen.getByPlaceholderText(/cari riwayat aksi/i);
        expect(searchInput).toHaveValue('test');

        fireEvent.change(searchInput, { target: { value: 'siswa baru' } });
        expect(onSearchChange).toHaveBeenCalledWith('siswa baru');

        expect(screen.getByText('Tipe Aksi')).toBeInTheDocument();
        expect(screen.getByText('Tipe Data')).toBeInTheDocument();
    });

    it('renders ActionHistoryTimeline with actions and trigger detail/undo', () => {
        const onViewDetail = vi.fn();
        const onUndo = vi.fn();

        const mockItem: ActionHistoryItem = {
            id: 'act-1',
            actionType: 'create',
            entity: 'students',
            description: 'Menambahkan siswa Budi',
            createdAt: new Date(),
            entityIds: ['s1'],
            canUndo: true,
            previousState: [{ id: 's1', name: 'Budi' }],
        };

        render(
            <ActionHistoryTimeline
                actions={[mockItem]}
                groupedActions={{ 'Hari Ini': [mockItem] }}
                hasActiveFilters={false}
                page={0}
                pageSize={20}
                totalCount={1}
                onPageChange={() => {}}
                onViewDetail={onViewDetail}
                onUndo={onUndo}
                isUndoPending={false}
                formatRelativeTime={() => 'Baru saja'}
            />
        );

        expect(screen.getByText('Menambahkan siswa Budi')).toBeInTheDocument();
        expect(screen.getByText('Hari Ini')).toBeInTheDocument();

        fireEvent.click(screen.getByTitle('Lihat Detail'));
        expect(onViewDetail).toHaveBeenCalledWith(mockItem);

        fireEvent.click(screen.getByRole('button', { name: /undo/i }));
        expect(onUndo).toHaveBeenCalledWith('act-1');
    });

    it('renders empty state when no actions available', () => {
        render(
            <ActionHistoryTimeline
                actions={[]}
                groupedActions={{}}
                hasActiveFilters={false}
                page={0}
                pageSize={20}
                totalCount={0}
                onPageChange={() => {}}
                onViewDetail={() => {}}
                onUndo={() => {}}
                isUndoPending={false}
                formatRelativeTime={() => ''}
            />
        );

        expect(screen.getByText('Tidak Ada Riwayat')).toBeInTheDocument();
        expect(screen.getByText('Belum ada aksi yang tercatat.')).toBeInTheDocument();
    });
});
