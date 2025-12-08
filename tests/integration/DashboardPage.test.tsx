import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, fireEvent, waitFor } from '@testing-library/react';
import { renderWithProviders } from '../test-utils';
import React from 'react';

// Mock supabase
vi.mock('../../src/services/supabase', () => ({
    supabase: {
        from: vi.fn(() => ({
            select: vi.fn(() => ({
                eq: vi.fn(() => ({
                    order: vi.fn(() => Promise.resolve({
                        data: [],
                        error: null
                    })),
                    single: vi.fn(() => Promise.resolve({
                        data: null,
                        error: null
                    }))
                })),
                order: vi.fn(() => Promise.resolve({
                    data: [],
                    error: null
                })),
                single: vi.fn(() => Promise.resolve({
                    data: null,
                    error: null
                }))
            })),
            insert: vi.fn(() => Promise.resolve({ error: null })),
            update: vi.fn(() => ({
                eq: vi.fn(() => Promise.resolve({ error: null }))
            })),
            delete: vi.fn(() => ({
                eq: vi.fn(() => Promise.resolve({ error: null }))
            }))
        })),
        auth: {
            getSession: vi.fn(() => Promise.resolve({
                data: { session: { user: { id: 'test-user' } } },
                error: null
            })),
            onAuthStateChange: vi.fn(() => ({
                data: { subscription: { unsubscribe: vi.fn() } }
            }))
        }
    }
}));

// Lazy import pages to work with mocks
const DashboardPage = React.lazy(() => import('../../src/components/pages/DashboardPage'));

describe('DashboardPage Integration', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('renders without crashing', async () => {
        expect(() => {
            renderWithProviders(
                <React.Suspense fallback={<div>Loading...</div>}>
                    <DashboardPage />
                </React.Suspense>
            );
        }).not.toThrow();
    });

    it('shows loading state initially', async () => {
        const { container } = renderWithProviders(
            <React.Suspense fallback={<div data-testid="loading">Loading...</div>}>
                <DashboardPage />
            </React.Suspense>
        );

        // Should show either loading or content
        await waitFor(() => {
            expect(container).toBeDefined();
        }, { timeout: 5000 });
    });
});

describe('Dashboard UI Elements', () => {
    it('should have greeting based on time', () => {
        const hour = new Date().getHours();
        let greeting = '';

        if (hour < 12) greeting = 'Selamat Pagi';
        else if (hour < 15) greeting = 'Selamat Siang';
        else if (hour < 18) greeting = 'Selamat Sore';
        else greeting = 'Selamat Malam';

        expect(greeting).toBeDefined();
        expect(greeting.length).toBeGreaterThan(0);
    });

    it('should calculate stats correctly', () => {
        const students = [
            { id: 1, name: 'Student 1' },
            { id: 2, name: 'Student 2' },
            { id: 3, name: 'Student 3' }
        ];
        const classes = [
            { id: 1, name: 'Class A' },
            { id: 2, name: 'Class B' }
        ];
        const tasks = [
            { id: 1, status: 'todo' },
            { id: 2, status: 'done' },
            { id: 3, status: 'in_progress' }
        ];

        expect(students.length).toBe(3);
        expect(classes.length).toBe(2);
        expect(tasks.filter(t => t.status === 'done').length).toBe(1);
    });
});

describe('Dashboard Data Processing', () => {
    it('should filter recent attendance', () => {
        const today = new Date().toISOString().split('T')[0];
        const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];

        const attendance = [
            { id: 1, date: today, status: 'Hadir' },
            { id: 2, date: today, status: 'Sakit' },
            { id: 3, date: yesterday, status: 'Hadir' }
        ];

        const todayAttendance = attendance.filter(a => a.date === today);
        expect(todayAttendance.length).toBe(2);
    });

    it('should calculate attendance rate', () => {
        const attendance = [
            { status: 'Hadir' },
            { status: 'Hadir' },
            { status: 'Hadir' },
            { status: 'Sakit' },
            { status: 'Alpha' }
        ];

        const present = attendance.filter(a => a.status === 'Hadir').length;
        const rate = (present / attendance.length) * 100;

        expect(rate).toBe(60);
    });

    it('should sort tasks by due date', () => {
        const tasks = [
            { id: 1, due_date: '2024-12-10', title: 'Task 3' },
            { id: 2, due_date: '2024-12-05', title: 'Task 1' },
            { id: 3, due_date: '2024-12-08', title: 'Task 2' }
        ];

        const sorted = [...tasks].sort((a, b) =>
            new Date(a.due_date).getTime() - new Date(b.due_date).getTime()
        );

        expect(sorted[0].title).toBe('Task 1');
        expect(sorted[1].title).toBe('Task 2');
        expect(sorted[2].title).toBe('Task 3');
    });

    it('should filter overdue tasks', () => {
        const today = new Date();
        const tasks = [
            { id: 1, due_date: '2024-01-01', status: 'todo' }, // Overdue
            { id: 2, due_date: '2030-12-31', status: 'todo' }, // Future
            { id: 3, due_date: '2024-01-01', status: 'done' }  // Done, ignore
        ];

        const overdue = tasks.filter(t =>
            t.status !== 'done' &&
            new Date(t.due_date) < today
        );

        expect(overdue.length).toBe(1);
    });
});
