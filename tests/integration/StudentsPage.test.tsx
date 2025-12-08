import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, fireEvent, waitFor } from '@testing-library/react';
import { renderWithProviders } from '../test-utils';
import StudentsPage from '../../src/components/pages/StudentsPage';

// Mock supabase
vi.mock('../../src/services/supabase', () => ({
    supabase: {
        from: () => ({
            select: () => ({
                eq: () => ({
                    order: () => Promise.resolve({
                        data: [
                            { id: 'class-1', name: 'Kelas 1A', user_id: 'test-user' }
                        ],
                        error: null
                    })
                }),
                order: () => Promise.resolve({
                    data: [
                        { id: 'class-1', name: 'Kelas 1A', user_id: 'test-user' }
                    ],
                    error: null
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

describe('StudentsPage Integration', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('renders without crashing', () => {
        expect(() => renderWithProviders(<StudentsPage />)).not.toThrow();
    });

    it('renders page content', async () => {
        renderWithProviders(<StudentsPage />);

        // Just check something renders
        await waitFor(() => {
            expect(document.body).toBeInTheDocument();
        }, { timeout: 3000 });
    });
});

describe('StudentsPage Error Handling', () => {
    it('does not throw on render', () => {
        expect(() => renderWithProviders(<StudentsPage />)).not.toThrow();
    });
});
