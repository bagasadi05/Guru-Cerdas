import type {
    AttendanceSummary,
    PortalAcademicRecord,
    PortalActivityItem,
    PortalAnnouncement,
    PortalAttentionItem,
    PortalAttendance,
    PortalCommunication,
    PortalGuardianSummary,
    PortalQuickSummary,
    PortalQuizPoint,
    PortalTask,
    PortalViolation,
    PortalWeeklySummary,
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
        absent: records.filter((record) => ['alpha', 'alpa'].includes(record.status.toLowerCase())).length,
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
            description: message.message,
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

export function getGuardianSummary(input: {
    academicRecords: PortalAcademicRecord[];
    attendance: PortalAttendance[];
    tasks: PortalTask[];
    communications: PortalCommunication[];
    violations: PortalViolation[];
    quizPoints: PortalQuizPoint[];
}): PortalGuardianSummary {
    const { academicRecords, attendance, tasks, communications, violations, quizPoints } = input;
    const averageScore = getAverageScore(academicRecords);
    const totalAttendance = attendance.length;
    const presentRate = totalAttendance > 0
        ? Math.round((attendance.filter((record) => record.status === 'Hadir').length / totalAttendance) * 100)
        : null;
    const activeTasks = tasks.filter((task) => task.status !== 'done').length;
    const overdueTasks = getOverdueTasks(tasks).length;
    const unreadMessages = getUnreadMessagesCount(communications);
    const violationPoints = getTotalViolationPoints(violations);
    const activePoints = quizPoints.reduce((sum, point) => sum + point.points, 0);

    const riskScore = [
        averageScore !== null && averageScore < 72 ? 2 : averageScore !== null && averageScore < 80 ? 1 : 0,
        presentRate !== null && presentRate < 80 ? 2 : presentRate !== null && presentRate < 90 ? 1 : 0,
        overdueTasks > 0 ? 2 : activeTasks > 0 ? 1 : 0,
        violationPoints >= 10 ? 2 : violationPoints > 0 ? 1 : 0,
        unreadMessages > 0 ? 1 : 0,
    ].reduce((sum, score) => sum + score, 0);

    const status: PortalGuardianSummary['status'] = riskScore >= 4
        ? 'perhatian'
        : riskScore >= 2
            ? 'pantau'
            : 'baik';

    const actions: PortalGuardianSummary['actions'] = [];

    if (overdueTasks > 0 || activeTasks > 0) {
        actions.push({
            id: 'guardian-action-tasks',
            label: overdueTasks > 0 ? 'Cek tugas terlambat' : 'Cek tugas aktif',
            description: overdueTasks > 0
                ? `${overdueTasks} tugas perlu segera ditindaklanjuti.`
                : `${activeTasks} tugas aktif perlu dipantau.`,
            target: 'lainnya:tugas',
            tone: overdueTasks > 0 ? 'danger' : 'warning',
        });
    }

    if (presentRate !== null && presentRate < 90) {
        actions.push({
            id: 'guardian-action-attendance',
            label: 'Pantau kehadiran',
            description: `Tingkat hadir semester ini ${presentRate}%.`,
            target: 'kehadiran',
            tone: presentRate < 80 ? 'danger' : 'warning',
        });
    }

    if (unreadMessages > 0) {
        actions.push({
            id: 'guardian-action-messages',
            label: 'Baca pesan guru',
            description: `${unreadMessages} pesan belum dibaca.`,
            target: 'komunikasi',
            tone: 'warning',
        });
    }

    if (violationPoints > 0) {
        actions.push({
            id: 'guardian-action-behavior',
            label: 'Lihat catatan perilaku',
            description: `${violationPoints} poin catatan perlu dipahami.`,
            target: 'lainnya:perilaku',
            tone: violationPoints >= 10 ? 'danger' : 'warning',
        });
    }

    if (actions.length === 0) {
        actions.push({
            id: 'guardian-action-download',
            label: 'Unduh ringkasan',
            description: 'Simpan laporan semester untuk arsip wali murid.',
            target: 'download',
            tone: 'primary',
        });
    }

    return {
        status,
        title: status === 'baik'
            ? 'Kondisi siswa terpantau baik'
            : status === 'pantau'
                ? 'Ada beberapa hal yang perlu dipantau'
                : 'Perlu perhatian wali murid',
        message: status === 'baik'
            ? 'Data semester ini menunjukkan kondisi relatif stabil. Orang tua cukup mempertahankan pendampingan belajar dan komunikasi rutin.'
            : status === 'pantau'
                ? 'Ada beberapa indikator yang sebaiknya dicek minggu ini agar tidak berkembang menjadi masalah akademik atau kebiasaan.'
                : 'Beberapa indikator membutuhkan tindak lanjut cepat dari wali murid bersama siswa dan guru kelas.',
        highlights: [
            {
                label: 'Rata-rata nilai',
                value: averageScore !== null ? averageScore.toFixed(1) : '-',
                description: averageScore !== null ? 'berdasarkan nilai semester terpilih' : 'belum ada nilai',
            },
            {
                label: 'Tingkat hadir',
                value: presentRate !== null ? `${presentRate}%` : '-',
                description: totalAttendance > 0 ? `${totalAttendance} catatan presensi` : 'belum ada presensi',
            },
            {
                label: 'Poin keaktifan',
                value: `+${activePoints}`,
                description: `${quizPoints.length} aktivitas tercatat`,
            },
            {
                label: 'Tindak lanjut',
                value: `${actions.length}`,
                description: 'prioritas untuk wali',
            },
        ],
        actions: actions.slice(0, 4),
    };
}

export function getWeeklyGuardianSummary(input: {
    academicRecords: PortalAcademicRecord[];
    attendance: PortalAttendance[];
    tasks: PortalTask[];
    communications: PortalCommunication[];
    violations: PortalViolation[];
    quizPoints: PortalQuizPoint[];
    referenceDate?: Date;
}): PortalWeeklySummary {
    const {
        academicRecords,
        attendance,
        tasks,
        communications,
        violations,
        quizPoints,
        referenceDate = new Date(),
    } = input;

    const weekStart = new Date(referenceDate);
    weekStart.setHours(0, 0, 0, 0);
    weekStart.setDate(weekStart.getDate() - 6);

    const isThisWeek = (value: string | null | undefined) => {
        const date = toSafeDate(value);
        return Boolean(date && date >= weekStart && date <= referenceDate);
    };

    const weeklyAttendance = attendance.filter((record) => isThisWeek(record.date));
    const weeklyPresent = weeklyAttendance.filter((record) => record.status === 'Hadir').length;
    const weeklyAbsence = weeklyAttendance.length - weeklyPresent;
    const weeklyGrades = academicRecords.filter((record) => isThisWeek(record.created_at));
    const weeklyAverage = getAverageScore(weeklyGrades);
    const activeTasks = tasks.filter((task) => task.status !== 'done');
    const dueThisWeek = activeTasks.filter((task) => isDueSoon(task.due_date, 7, referenceDate) || isOverdue(task.due_date, referenceDate));
    const unreadMessages = getUnreadMessagesCount(communications);
    const weeklyViolations = violations.filter((record) => isThisWeek(record.date));
    const weeklyPoints = quizPoints.filter((point) => isThisWeek(point.quiz_date || point.created_at)).reduce((sum, point) => sum + point.points, 0);

    const latestGrades = [...academicRecords]
        .filter((record) => record.created_at)
        .sort((a, b) => new Date(b.created_at || '').getTime() - new Date(a.created_at || '').getTime())
        .slice(0, 2);
    const gradeTrend = latestGrades.length >= 2
        ? latestGrades[0].score - latestGrades[1].score
        : 0;

    const gradeText = weeklyAverage !== null
        ? `rata-rata nilai baru ${weeklyAverage.toFixed(1)}`
        : gradeTrend < -5
            ? 'nilai terbaru perlu dipantau'
            : 'nilai relatif stabil';

    const attendanceText = weeklyAttendance.length > 0
        ? `hadir ${weeklyPresent}/${weeklyAttendance.length} hari tercatat`
        : 'belum ada catatan hadir minggu ini';

    const suggestions: string[] = [];
    if (weeklyAbsence > 0) suggestions.push('Konfirmasi alasan ketidakhadiran dan bantu siswa menyiapkan materi yang tertinggal.');
    if (dueThisWeek.length > 0) suggestions.push('Dampingi penyelesaian tugas terdekat agar tidak menumpuk.');
    if (unreadMessages > 0) suggestions.push('Baca pesan guru agar tindak lanjut sekolah dan rumah selaras.');
    if (weeklyViolations.length > 0) suggestions.push('Bahas catatan perilaku secara tenang dan sepakati perbaikan kecil untuk pekan depan.');
    if (suggestions.length === 0) suggestions.push('Pertahankan rutinitas belajar, istirahat, dan komunikasi singkat dengan siswa setiap hari.');

    return {
        title: 'Ringkasan Mingguan',
        narrative: `Minggu ini ${attendanceText}, ${gradeText}, ${dueThisWeek.length} tugas perlu dipantau, dan ${unreadMessages} pesan guru belum dibaca.`,
        stats: [
            {
                label: 'Kehadiran',
                value: weeklyAttendance.length > 0 ? `${weeklyPresent}/${weeklyAttendance.length}` : '-',
                description: weeklyAttendance.length > 0 ? 'hari hadir dari catatan minggu ini' : 'belum ada data minggu ini',
                tone: weeklyAbsence > 1 ? 'danger' : weeklyAbsence === 1 ? 'warning' : 'success',
            },
            {
                label: 'Nilai Baru',
                value: weeklyAverage !== null ? weeklyAverage.toFixed(1) : '-',
                description: weeklyGrades.length > 0 ? `${weeklyGrades.length} nilai masuk minggu ini` : 'belum ada nilai baru',
                tone: weeklyAverage !== null && weeklyAverage < 72 ? 'danger' : weeklyAverage !== null && weeklyAverage < 80 ? 'warning' : 'info',
            },
            {
                label: 'Tugas',
                value: `${dueThisWeek.length}`,
                description: 'aktif atau mendekati tenggat',
                tone: dueThisWeek.length > 2 ? 'danger' : dueThisWeek.length > 0 ? 'warning' : 'success',
            },
            {
                label: 'Keaktifan',
                value: `+${weeklyPoints}`,
                description: 'poin tercatat minggu ini',
                tone: weeklyPoints > 0 ? 'success' : 'info',
            },
        ],
        suggestions: suggestions.slice(0, 3),
    };
}
