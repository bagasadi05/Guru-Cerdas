import type {
    AttendanceSummary,
    PortalAcademicRecord,
    PortalActivityItem,
    PortalAnnouncement,
    PortalAttentionItem,
    PortalAttendance,
    PortalCommunication,
    PortalQuickSummary,
    PortalTask,
    PortalViolation,
} from './types';

const DAY_IN_MS = 24 * 60 * 60 * 1000;

function toSafeDate(value: string | null | undefined): Date | null {
    if (!value) return null;
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? null : date;
}

function sortByDateDesc<T>(items: T[], getDate: (item: T) => string | null | undefined): T[] {
    return [...items].sort((left, right) => {
        const leftDate = toSafeDate(getDate(left))?.getTime() ?? 0;
        const rightDate = toSafeDate(getDate(right))?.getTime() ?? 0;
        return rightDate - leftDate;
    });
}

function isDueSoon(date: string | null, days = 3, referenceDate = new Date()): boolean {
    const dueDate = toSafeDate(date);
    if (!dueDate) return false;
    const difference = dueDate.getTime() - referenceDate.getTime();
    return difference >= 0 && difference <= days * DAY_IN_MS;
}

function isOverdue(date: string | null, referenceDate = new Date()): boolean {
    const dueDate = toSafeDate(date);
    if (!dueDate) return false;
    return dueDate.getTime() < referenceDate.getTime();
}

export function getFilteredAttendance(
    records: PortalAttendance[],
    selectedSemesterId: string | null
): PortalAttendance[] {
    if (!selectedSemesterId) return records;
    return records.filter((record) => record.semester_id === selectedSemesterId);
}

export function getAttendanceSummary(records: PortalAttendance[]): AttendanceSummary {
    return {
        present: records.filter((record) => record.status === 'Hadir').length,
        sick: records.filter((record) => record.status === 'Sakit').length,
        permission: records.filter((record) => record.status === 'Izin').length,
        absent: records.filter((record) => record.status === 'Alpha' || record.status === 'Alpa').length,
    };
}

export function getFilteredViolations(
    records: PortalViolation[],
    selectedSemesterId: string | null
): PortalViolation[] {
    if (!selectedSemesterId) return records;
    return records.filter((record) => record.semester_id === selectedSemesterId);
}

export function getTotalViolationPoints(records: PortalViolation[]): number {
    return records.reduce((sum, record) => sum + record.points, 0);
}

export function getAverageScore(records: PortalAcademicRecord[]): number | null {
    if (records.length === 0) return null;
    const total = records.reduce((sum, record) => sum + record.score, 0);
    return Math.round(total / records.length);
}

export function getUnreadMessagesCount(communications: PortalCommunication[]): number {
    return communications.filter((message) => message.sender === 'teacher' && !message.is_read).length;
}

export function getUpcomingTasks(tasks: PortalTask[], referenceDate = new Date()): PortalTask[] {
    return sortByDateDesc(
        tasks.filter((task) => task.status !== 'done' && isDueSoon(task.due_date, 3, referenceDate)),
        (task) => task.due_date
    );
}

export function getOverdueTasks(tasks: PortalTask[], referenceDate = new Date()): PortalTask[] {
    return sortByDateDesc(
        tasks.filter((task) => task.status !== 'done' && isOverdue(task.due_date, referenceDate)),
        (task) => task.due_date
    );
}

export function getRecentAnnouncements(
    announcements: PortalAnnouncement[],
    limit = 3
): PortalAnnouncement[] {
    return sortByDateDesc(announcements, (announcement) => announcement.date).slice(0, limit);
}

export function getRecentActivities(input: {
    communications: PortalCommunication[];
    announcements: PortalAnnouncement[];
    tasks: PortalTask[];
    attendance: PortalAttendance[];
    violations: PortalViolation[];
    limit?: number;
}): PortalActivityItem[] {
    const { communications, announcements, tasks, attendance, violations, limit = 5 } = input;

    const activityItems: PortalActivityItem[] = [
        ...communications.map((message) => ({
            id: `message-${message.id}`,
            type: 'message' as const,
            title: message.sender === 'teacher' ? 'Pesan baru dari guru' : 'Pesan terkirim',
            description: message.content,
            createdAt: message.created_at,
            href: 'komunikasi',
        })),
        ...announcements.map((announcement) => ({
            id: `announcement-${announcement.id}`,
            type: 'announcement' as const,
            title: announcement.title,
            description: announcement.content,
            createdAt: announcement.date || '',
            href: 'beranda',
        })),
        ...tasks.map((task) => ({
            id: `task-${task.id}`,
            type: 'task' as const,
            title: `Tugas ${task.title}`,
            description: task.description || 'Ada pembaruan tugas untuk siswa.',
            createdAt: task.due_date || '',
            href: 'lainnya:tugas',
        })),
        ...attendance.map((record) => ({
            id: `attendance-${record.id}`,
            type: 'attendance' as const,
            title: `Absensi: ${record.status}`,
            description: record.notes || 'Status kehadiran diperbarui.',
            createdAt: record.date,
            href: 'kehadiran',
        })),
        ...violations.map((violation) => ({
            id: `behavior-${violation.id}`,
            type: 'behavior' as const,
            title: violation.type,
            description: violation.description || 'Ada catatan perilaku baru.',
            createdAt: violation.date,
            href: 'lainnya:perilaku',
        })),
    ];

    return sortByDateDesc(activityItems, (item) => item.createdAt).slice(0, limit);
}

export function getAttentionItems(input: {
    tasks: PortalTask[];
    communications: PortalCommunication[];
    attendance: PortalAttendance[];
    violations: PortalViolation[];
    announcements: PortalAnnouncement[];
    referenceDate?: Date;
}): PortalAttentionItem[] {
    const {
        tasks,
        communications,
        attendance,
        violations,
        announcements,
        referenceDate = new Date(),
    } = input;

    const items: PortalAttentionItem[] = [];
    const overdueTasks = getOverdueTasks(tasks, referenceDate);
    const upcomingTasks = getUpcomingTasks(tasks, referenceDate);
    const unreadMessages = getUnreadMessagesCount(communications);
    const latestAttendance = sortByDateDesc(attendance, (record) => record.date)[0];
    const latestViolation = sortByDateDesc(violations, (record) => record.date)[0];
    const latestAnnouncement = getRecentAnnouncements(announcements, 1)[0];

    if (overdueTasks.length > 0) {
        items.push({
            id: 'attention-overdue-task',
            type: 'task',
            title: `${overdueTasks.length} tugas terlambat`,
            description: 'Segera cek tugas yang belum selesai.',
            severity: 'critical',
            href: 'lainnya:tugas',
            badge: `${overdueTasks.length}`,
        });
    }

    if (upcomingTasks.length > 0) {
        items.push({
            id: 'attention-upcoming-task',
            type: 'task',
            title: `${upcomingTasks.length} tugas mendekati deadline`,
            description: 'Ada tugas yang perlu diprioritaskan dalam 3 hari ke depan.',
            severity: 'warning',
            href: 'lainnya:tugas',
            badge: `${upcomingTasks.length}`,
        });
    }

    if (unreadMessages > 0) {
        items.push({
            id: 'attention-unread-message',
            type: 'message',
            title: `${unreadMessages} pesan guru belum dibaca`,
            description: 'Buka komunikasi untuk melihat pembaruan terbaru dari guru.',
            severity: 'warning',
            href: 'komunikasi',
            badge: `${unreadMessages}`,
        });
    }

    if (latestAttendance && latestAttendance.status !== 'Hadir') {
        items.push({
            id: 'attention-latest-attendance',
            type: 'attendance',
            title: `Status kehadiran terakhir: ${latestAttendance.status}`,
            description: latestAttendance.notes || 'Periksa detail kehadiran terbaru siswa.',
            severity: 'info',
            href: 'kehadiran',
        });
    }

    if (latestViolation) {
        items.push({
            id: 'attention-latest-violation',
            type: 'behavior',
            title: 'Ada catatan perilaku terbaru',
            description: latestViolation.description || latestViolation.type,
            severity: 'warning',
            href: 'lainnya:perilaku',
        });
    }

    if (latestAnnouncement) {
        items.push({
            id: 'attention-latest-announcement',
            type: 'announcement',
            title: 'Pengumuman baru tersedia',
            description: latestAnnouncement.title,
            severity: 'info',
            href: 'beranda',
        });
    }

    return items.slice(0, 4);
}

export function getQuickSummary(input: {
    academicRecords: PortalAcademicRecord[];
    attendance: PortalAttendance[];
    tasks: PortalTask[];
    communications: PortalCommunication[];
    violations: PortalViolation[];
}): PortalQuickSummary {
    const { academicRecords, attendance, tasks, communications, violations } = input;

    return {
        averageScore: getAverageScore(academicRecords),
        presentCount: attendance.filter((record) => record.status === 'Hadir').length,
        activeTasksCount: tasks.filter((task) => task.status !== 'done').length,
        unreadMessagesCount: getUnreadMessagesCount(communications),
        violationPoints: getTotalViolationPoints(violations),
    };
}
