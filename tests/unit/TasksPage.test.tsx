import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import { renderWithProviders } from '../test-utils';
import TasksPage from '../../src/components/pages/TasksPage';

// Mock supabase at module level
vi.mock('../../src/services/supabase', () => {
    const createSelectBuilder = () => {
        const resolveEmpty = () => Promise.resolve({ data: [], error: null });
        const resolveSingle = () => Promise.resolve({ data: null, error: { code: 'PGRST116', message: 'No rows found' } });

        return {
            eq: () => ({
                is: () => ({
                    order: resolveEmpty,
                }),
                order: resolveEmpty,
                single: resolveSingle,
            }),
            order: resolveEmpty,
            single: resolveSingle,
        };
    };

    return {
        supabase: {
            from: () => ({
                select: () => createSelectBuilder(),
                insert: () => Promise.resolve({ error: null }),
                update: () => ({
                    eq: () => Promise.resolve({ error: null })
                }),
                delete: () => ({
                    eq: () => Promise.resolve({ error: null })
                })
            })
        }
    };
});

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
            // Use getAllByText since column headers appear multiple times
            const todoElements = screen.getAllByText('To Do');
            const inProgressElements = screen.getAllByText('In Progress');
            const doneElements = screen.getAllByText('Selesai');
            
            expect(todoElements.length).toBeGreaterThan(0);
            expect(inProgressElements.length).toBeGreaterThan(0);
            expect(doneElements.length).toBeGreaterThan(0);
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
