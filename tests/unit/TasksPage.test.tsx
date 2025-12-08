import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import { renderWithProviders } from '../test-utils';
import TasksPage from '../../src/components/pages/TasksPage';

// Mock supabase at module level
vi.mock('../../src/services/supabase', () => ({
    supabase: {
        from: () => ({
            select: () => ({
                eq: () => ({
                    order: () => Promise.resolve({ data: [], error: null })
                })
            }),
            insert: () => Promise.resolve({ error: null }),
            update: () => ({
                eq: () => Promise.resolve({ error: null })
            }),
            delete: () => ({
                eq: () => Promise.resolve({ error: null })
            })
        })
    }
}));

describe('TasksPage', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('renders without crashing', () => {
        expect(() => renderWithProviders(<TasksPage />)).not.toThrow();
    });

    it('renders the page header', async () => {
        renderWithProviders(<TasksPage />);

        await waitFor(() => {
            expect(screen.getByText('Manajemen Tugas')).toBeInTheDocument();
        }, { timeout: 3000 });
    });

    it('renders kanban columns', async () => {
        renderWithProviders(<TasksPage />);

        await waitFor(() => {
            expect(screen.getByText('To Do')).toBeInTheDocument();
            expect(screen.getByText('In Progress')).toBeInTheDocument();
            expect(screen.getByText('Selesai')).toBeInTheDocument();
        }, { timeout: 3000 });
    });

    it('has a search input', async () => {
        renderWithProviders(<TasksPage />);

        await waitFor(() => {
            expect(screen.getByPlaceholderText('Cari tugas...')).toBeInTheDocument();
        }, { timeout: 3000 });
    });
});

describe('TasksPage Error Handling', () => {
    it('handles empty data gracefully', async () => {
        renderWithProviders(<TasksPage />);

        // Should not crash with empty data
        await waitFor(() => {
            expect(screen.getByText('Manajemen Tugas')).toBeInTheDocument();
        }, { timeout: 3000 });
    });
});
