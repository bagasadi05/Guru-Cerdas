import React from 'react';
import { describe, it, expect } from 'vitest';
import { screen } from '@testing-library/react';
import { renderWithProviders } from '../test-utils';
import { TodayActionPanel } from '../../src/components/dashboard/TodayActionPanel';
import { DashboardQueryData } from '../../src/types';

describe('TodayActionPanel', () => {
    const createMockData = (overrides?: Partial<DashboardQueryData>): DashboardQueryData => ({
        classes: [{ id: 'c1', name: 'Kelas 7A' }],
        students: [
            { id: 's1', name: 'Ahmad Faiz', class_id: 'c1', avatar_url: null },
            { id: 's2', name: 'Budi Santoso', class_id: 'c1', avatar_url: null },
        ],
        dailyAttendanceSummary: { present: 0, total: 0 },
        tasks: [],
        schedule: [],
        weeklyAttendance: [],
        academicRecords: [],
        violations: [],
        achievements: [],
        recentTasks: [],
        todayAttendanceRecords: [],
        unreadParentMessages: [],
        ...overrides,
    });

    it('renders single priority hero action banner with clear CTA button when attendance is missing', () => {
        const mockData = createMockData();
        renderWithProviders(<TodayActionPanel data={mockData} />);

        // Header elements
        expect(screen.getByText('Prioritas Guru')).toBeInTheDocument();
        expect(screen.getByText('Butuh Tindakan Hari Ini')).toBeInTheDocument();
        expect(screen.getByText(/1 Tindakan Diperlukan/i)).toBeInTheDocument();

        // Hero banner content
        expect(screen.getByText('Absensi belum lengkap')).toBeInTheDocument();
        expect(screen.getByText('2 dari 2 siswa belum tercatat hari ini.')).toBeInTheDocument();
        expect(screen.getByText('2 Siswa')).toBeInTheDocument();
        expect(screen.getByText('Catat Absensi')).toBeInTheDocument();
    });

    it('renders "Semua Beres" state with quick shortcuts when there are no urgent actions', () => {
        const mockData = createMockData({
            dailyAttendanceSummary: { present: 2, total: 2 },
        });
        renderWithProviders(<TodayActionPanel data={mockData} />);

        expect(screen.getByText('Semua Beres')).toBeInTheDocument();
        expect(screen.getByText('Tidak ada tindakan mendesak')).toBeInTheDocument();
        expect(screen.getByText('Aman')).toBeInTheDocument();

        // Shortcut buttons
        expect(screen.getByRole('button', { name: 'Cek Absensi' })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'Input Nilai' })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'Buka Jadwal' })).toBeInTheDocument();
    });

    it('renders multiple actions in a cohesive grid when multiple issues exist', () => {
        const mockData = createMockData({
            tasks: [
                {
                    id: 't1',
                    title: 'Koreksi PR Matematika',
                    due_date: new Date(Date.now() - 86400000).toISOString(), // overdue
                    status: 'todo',
                    completed: false,
                    class_id: null,
                    user_id: 'u1',
                    created_at: '',
                    updated_at: '',
                    description: null,
                    deleted_at: null,
                },
            ],
            unreadParentMessages: [
                {
                    id: 'm1',
                    student_id: 's1',
                    message: 'Mohon info PR ananda Faiz',
                    sender: 'Ibu Faiz',
                    created_at: new Date().toISOString(),
                    is_read: false,
                },
            ],
        });
        renderWithProviders(<TodayActionPanel data={mockData} />);

        // 3 items needed: attendance + overdue task + unread message
        expect(screen.getByText(/3 Tindakan Diperlukan/i)).toBeInTheDocument();
        expect(screen.getByText('Absensi belum lengkap')).toBeInTheDocument();
        expect(screen.getByText('Tugas melewati deadline')).toBeInTheDocument();
        expect(screen.getByText('Pesan wali belum dibaca')).toBeInTheDocument();
    });
});
