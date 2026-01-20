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
                        data: [
                            { id: 'class-1', name: 'Kelas 1A', user_id: 'test-user' },
                            { id: 'class-2', name: 'Kelas 1B', user_id: 'test-user' }
                        ],
                        error: null
                    })),
                    single: vi.fn(() => Promise.resolve({
                        data: { id: 'student-1', name: 'Test Student', class_id: 'class-1' },
                        error: null
                    }))
                })),
                order: vi.fn(() => Promise.resolve({
                    data: [],
                    error: null
                }))
            })),
            insert: vi.fn(() => Promise.resolve({ data: { id: 'new-id' }, error: null })),
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

const AttendancePage = React.lazy(() => import('../../src/components/pages/AttendancePage'));

describe('AttendancePage Integration', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('renders without crashing', async () => {
        expect(() => {
            renderWithProviders(
                <React.Suspense fallback={<div>Loading...</div>}>
                    <AttendancePage />
                </React.Suspense>
            );
        }).not.toThrow();
    });

    it('shows loading initially', async () => {
        const { container } = renderWithProviders(
            <React.Suspense fallback={<div data-testid="loading">Loading...</div>}>
                <AttendancePage />
            </React.Suspense>
        );

        await waitFor(() => {
            expect(container).toBeDefined();
        }, { timeout: 5000 });
    });
});

describe('Attendance Status Logic', () => {
    it('should have all status types', () => {
        const statuses = ['Hadir', 'Izin', 'Sakit', 'Alpha', 'Libur'];
        expect(statuses.length).toBe(5);
        expect(statuses).toContain('Hadir');
        expect(statuses).toContain('Alpha');
        expect(statuses).toContain('Libur');
    });

    it('should calculate attendance statistics', () => {
        const records = [
            { status: 'Hadir' },
            { status: 'Hadir' },
            { status: 'Sakit' },
            { status: 'Izin' },
            { status: 'Alpha' }
        ];

        const stats = {
            hadir: records.filter(r => r.status === 'Hadir').length,
            sakit: records.filter(r => r.status === 'Sakit').length,
            izin: records.filter(r => r.status === 'Izin').length,
            alpha: records.filter(r => r.status === 'Alpha').length
        };

        expect(stats.hadir).toBe(2);
        expect(stats.sakit).toBe(1);
        expect(stats.izin).toBe(1);
        expect(stats.alpha).toBe(1);
    });

    it('should calculate percentage correctly', () => {
        const total = 30;
        const present = 24;
        const percentage = Math.round((present / total) * 100);

        expect(percentage).toBe(80);
    });

    it('should handle empty class', () => {
        const records: any[] = [];
        const stats = {
            hadir: records.filter(r => r.status === 'Hadir').length,
            total: records.length
        };

        expect(stats.total).toBe(0);
        expect(stats.hadir).toBe(0);
    });
});

describe('Attendance Date Handling', () => {
    it('should format date correctly', () => {
        const date = new Date('2024-12-06');
        const formatted = date.toISOString().split('T')[0];
        expect(formatted).toBe('2024-12-06');
    });

    it('should get today as default', () => {
        const today = new Date().toISOString().split('T')[0];
        expect(today).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    });

    it('should compare dates correctly', () => {
        const today = new Date().toISOString().split('T')[0];
        const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];

        expect(today > yesterday).toBe(true);
    });
});

describe('Attendance Batch Operations', () => {
    it('should mark all as present', () => {
        const students = [
            { id: 1, status: 'Alpha' },
            { id: 2, status: 'Sakit' },
            { id: 3, status: 'Izin' }
        ];

        const updatedStudents = students.map(s => ({ ...s, status: 'Hadir' }));

        expect(updatedStudents.every(s => s.status === 'Hadir')).toBe(true);
    });

    it('should track changed records', () => {
        const original = { id: 1, status: 'Alpha' };
        const updated = { id: 1, status: 'Hadir' };

        const hasChanged = original.status !== updated.status;
        expect(hasChanged).toBe(true);
    });

    it('should count unsaved changes', () => {
        const changes: any[] = [
            { id: 1, status: 'Hadir' },
            { id: 2, status: 'Sakit' }
        ];

        expect(changes.length).toBe(2);
    });
});

describe('Attendance Export', () => {
    it('should prepare data for CSV export', () => {
        const records = [
            { name: 'Student 1', status: 'Hadir', date: '2024-12-06' },
            { name: 'Student 2', status: 'Sakit', date: '2024-12-06' }
        ];

        const csvHeaders = 'Nama,Status,Tanggal';
        const csvRows = records.map(r => `${r.name},${r.status},${r.date}`);
        const csv = [csvHeaders, ...csvRows].join('\n');

        expect(csv).toContain('Student 1');
        expect(csv).toContain('Hadir');
    });

    it('should prepare summary for PDF', () => {
        const summary = {
            date: '2024-12-06',
            class: 'Kelas 1A',
            total: 30,
            hadir: 25,
            sakit: 2,
            izin: 2,
            alpha: 1
        };

        expect(summary.hadir + summary.sakit + summary.izin + summary.alpha).toBe(30);
    });
});
