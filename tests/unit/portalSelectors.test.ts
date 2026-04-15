import { describe, expect, it } from 'vitest';
import {
    getAttentionItems,
    getAttendanceSummary,
    getQuickSummary,
    getRecentActivities,
    getUnreadMessagesCount,
} from '../../src/components/pages/portal/portalSelectors';
import type {
    PortalAcademicRecord,
    PortalAnnouncement,
    PortalAttendance,
    PortalCommunication,
    PortalTask,
    PortalViolation,
} from '../../src/components/pages/portal/types';

describe('portalSelectors', () => {
    it('counts absence for both Alpha and Alpa statuses', () => {
        const records: PortalAttendance[] = [
            { id: '1', date: '2026-03-01', status: 'Alpha', notes: null, semester_id: 's1' },
            { id: '2', date: '2026-03-02', status: 'Alpa' as PortalAttendance['status'], notes: null, semester_id: 's1' },
            { id: '3', date: '2026-03-03', status: 'Hadir', notes: null, semester_id: 's1' },
        ];

        expect(getAttendanceSummary(records)).toEqual({
            present: 1,
            sick: 0,
            permission: 0,
            absent: 2,
        });
    });

    it('builds attention items from overdue tasks, unread messages, attendance, and announcements', () => {
        const tasks: PortalTask[] = [
            { id: 't1', title: 'PR Matematika', description: null, status: 'todo', due_date: '2026-03-09T08:00:00.000Z' },
            { id: 't2', title: 'Poster IPA', description: null, status: 'todo', due_date: '2026-03-12T08:00:00.000Z' },
        ];
        const communications: PortalCommunication[] = [
            { id: 'c1', message: 'Mohon cek buku penghubung.', is_read: false, created_at: '2026-03-10T10:00:00.000Z', sender: 'teacher' },
        ];
        const attendance: PortalAttendance[] = [
            { id: 'a1', date: '2026-03-10T07:00:00.000Z', status: 'Izin', notes: 'Kontrol dokter', semester_id: 's1' },
        ];
        const violations: PortalViolation[] = [
            { id: 'v1', date: '2026-03-08T07:00:00.000Z', type: 'Terlambat', points: 5, description: 'Datang lewat jam masuk', semester_id: 's1' },
        ];
        const announcements: PortalAnnouncement[] = [
            { id: 'an1', title: 'Rapat Orang Tua', content: 'Sabtu pagi di aula.', date: '2026-03-10T09:00:00.000Z', audience_type: 'parent' },
        ];

        const items = getAttentionItems({
            tasks,
            communications,
            attendance,
            violations,
            announcements,
            referenceDate: new Date('2026-03-11T00:00:00.000Z'),
        });

        expect(items.map((item) => item.type)).toEqual(['task', 'task', 'message', 'attendance']);
        expect(items[0]).toMatchObject({ href: 'lainnya:tugas', severity: 'critical' });
        expect(items[2]).toMatchObject({ href: 'komunikasi', badge: '1' });
    });

    it('builds quick summary and recent activities from portal data', () => {
        const academicRecords: PortalAcademicRecord[] = [
            { id: 'ar1', subject: 'Matematika', score: 80, notes: '', assessment_name: 'UTS' },
            { id: 'ar2', subject: 'IPA', score: 90, notes: '', assessment_name: 'UH 1' },
        ];
        const attendance: PortalAttendance[] = [
            { id: 'a1', date: '2026-03-10T07:00:00.000Z', status: 'Hadir', notes: null, semester_id: 's1' },
        ];
        const tasks: PortalTask[] = [
            { id: 't1', title: 'Essay Bahasa Indonesia', description: 'Bab 3', status: 'in_progress', due_date: '2026-03-12T00:00:00.000Z' },
        ];
        const communications: PortalCommunication[] = [
            { id: 'c1', message: 'Terima kasih, Bu.', is_read: true, created_at: '2026-03-11T07:00:00.000Z', sender: 'parent' },
            { id: 'c2', message: 'Nilai ulangan sudah diunggah.', is_read: false, created_at: '2026-03-11T08:00:00.000Z', sender: 'teacher' },
        ];
        const violations: PortalViolation[] = [
            { id: 'v1', date: '2026-03-05T07:00:00.000Z', type: 'Seragam', points: 10, description: null, semester_id: 's1' },
        ];
        const announcements: PortalAnnouncement[] = [
            { id: 'an1', title: 'Try Out', content: 'Mulai pekan depan.', date: '2026-03-09T07:00:00.000Z', audience_type: 'parent' },
        ];

        expect(getUnreadMessagesCount(communications)).toBe(1);
        expect(getQuickSummary({ academicRecords, attendance, tasks, communications, violations })).toEqual({
            averageScore: 85,
            presentCount: 1,
            activeTasksCount: 1,
            unreadMessagesCount: 1,
            violationPoints: 10,
        });

        const activities = getRecentActivities({ communications, announcements, tasks, attendance, violations, limit: 3 });
        expect(activities).toHaveLength(3);
        expect(activities[0]).toMatchObject({ type: 'task', href: 'lainnya:tugas' });
        expect(activities.some((activity) => activity.type === 'message' && activity.href === 'komunikasi')).toBe(true);
    });
});
