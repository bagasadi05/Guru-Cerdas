import React, { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    AlertTriangleIcon,
    BellIcon,
    CheckCircleIcon,
    ClipboardPenIcon,
    MessageSquareIcon,
    TrendingDownIcon,
} from '../Icons';
import type { DashboardQueryData } from '../../types';
import { isTaskOverdue, isTaskDueSoon } from '../../utils/dateHelpers';
import { useI18n } from '../../utils/i18n';
import { Skeleton } from '../ui/Skeleton';
import { useAccessibility } from '../ui/AccessibilityFeatures';

interface TodayActionPanelProps {
    data: DashboardQueryData | null | undefined;
    isLoading?: boolean;
}

type ActionTone = 'danger' | 'warning' | 'info' | 'success';

interface TodayActionItem {
    id: string;
    title: string;
    description: string;
    badge: string;
    href: string;
    tone: ActionTone;
    icon: React.FC<{ className?: string }>;
}

const getToneClass = (tone: ActionTone) => {
    switch (tone) {
        case 'danger':
            return 'border-rose-200 bg-rose-50 text-rose-800 dark:border-rose-900/40 dark:bg-rose-950/30 dark:text-rose-100';
        case 'warning':
            return 'border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-900/40 dark:bg-amber-950/30 dark:text-amber-100';
        case 'info':
            return 'border-sky-200 bg-sky-50 text-sky-800 dark:border-sky-900/40 dark:bg-sky-950/30 dark:text-sky-100';
        case 'success':
        default:
            return 'border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-900/40 dark:bg-emerald-950/30 dark:text-emerald-100';
    }
};

const getLatestGradeDrops = (data: DashboardQueryData) => {
    const grouped = new Map<string, typeof data.academicRecords>();

    data.academicRecords.forEach((record) => {
        const key = `${record.student_id}:${record.subject}`;
        grouped.set(key, [...(grouped.get(key) || []), record]);
    });

    return Array.from(grouped.values())
        .map((records) => [...records].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()))
        .filter((records) => records.length >= 2)
        .map(([latest, previous]) => ({
            studentId: latest.student_id,
            subject: latest.subject,
            drop: previous.score - latest.score,
            latestScore: latest.score,
        }))
        .filter((item) => item.drop >= 10)
        .sort((a, b) => b.drop - a.drop);
};

export const TodayActionPanel: React.FC<TodayActionPanelProps> = ({ data, isLoading }) => {
    const navigate = useNavigate();
    const { t } = useI18n();
    const { isEasyMode } = useAccessibility();

    const actions = useMemo<TodayActionItem[]>(() => {
        if (!data) return [];
        const items: TodayActionItem[] = [];
        const now = new Date();
        const totalStudents = data.students.length;
        const attendanceMissing = Math.max(totalStudents - data.dailyAttendanceSummary.total, 0);
        const overdueTasks = data.tasks.filter((task) => isTaskOverdue(task.due_date, now)).length;
        const dueSoonTasks = data.tasks.filter((task) => !isTaskOverdue(task.due_date, now) && isTaskDueSoon(task.due_date, now)).length;
        const unreadParentMessages = data.unreadParentMessages.length;
        const gradeDrops = getLatestGradeDrops(data);

        if (attendanceMissing > 0) {
            items.push({
                id: 'attendance-missing',
                title: t.dashboard.attendanceIncomplete,
                description: `${attendanceMissing} dari ${totalStudents} siswa belum tercatat hari ini.`,
                badge: `${attendanceMissing}`,
                href: '/absensi',
                tone: attendanceMissing > Math.max(totalStudents * 0.25, 1) ? 'danger' : 'warning',
                icon: ClipboardPenIcon,
            });
        }

        if (overdueTasks > 0 || dueSoonTasks > 0) {
            items.push({
                id: 'task-deadline',
                title: overdueTasks > 0 ? t.dashboard.taskOverdue : t.dashboard.taskDueSoon,
                description: overdueTasks > 0
                    ? `${overdueTasks} tugas perlu segera diselesaikan.`
                    : `${dueSoonTasks} tugas jatuh tempo dalam 24 jam.`,
                badge: `${overdueTasks || dueSoonTasks}`,
                href: '/tugas',
                tone: overdueTasks > 0 ? 'danger' : 'warning',
                icon: AlertTriangleIcon,
            });
        }

        if (unreadParentMessages > 0) {
            const firstMessage = data.unreadParentMessages[0];
            items.push({
                id: 'parent-messages',
                title: t.dashboard.unreadMessages,
                description: unreadParentMessages === 1
                    ? firstMessage.message
                    : `${unreadParentMessages} pesan wali perlu ditinjau.`,
                badge: `${unreadParentMessages}`,
                href: `/siswa/${firstMessage.student_id}`,
                tone: 'info',
                icon: MessageSquareIcon,
            });
        }

        if (gradeDrops.length > 0) {
            const firstDrop = gradeDrops[0];
            const studentName = data.students.find((student) => student.id === firstDrop.studentId)?.name || 'Siswa';
            items.push({
                id: 'grade-drop',
                title: t.dashboard.gradeDropTrend,
                description: `${studentName} turun ${firstDrop.drop} poin di ${firstDrop.subject}.`,
                badge: `${gradeDrops.length}`,
                href: `/siswa/${firstDrop.studentId}`,
                tone: 'warning',
                icon: TrendingDownIcon,
            });
        }

        if (items.length === 0) {
            items.push({
                id: 'all-clear',
                title: t.dashboard.noUrgentActions,
                description: t.dashboard.noUrgentDesc,
                badge: 'OK',
                href: '/dashboard',
                tone: 'success',
                icon: CheckCircleIcon,
            });
        }

        return items.slice(0, 4);
    }, [data, t]);

    if (isLoading) {
        return (
            <section className="overflow-hidden rounded-2xl border border-slate-200/70 bg-white shadow-sm dark:border-slate-700/60 dark:bg-slate-900">
                <div className="p-5 border-b border-slate-200/70 dark:border-slate-700/60">
                    <Skeleton className="h-4 w-24 mb-3" />
                    <Skeleton className="h-6 w-48 mb-1" />
                    <Skeleton className="h-4 w-64" />
                </div>
                <div className="grid gap-3 p-4 md:grid-cols-2 xl:grid-cols-4">
                    {[1, 2, 3, 4].map((i) => (
                        <div key={i} className="rounded-2xl border border-slate-200/70 dark:border-slate-700/60 p-4">
                            <Skeleton className="h-10 w-10 rounded-2xl mb-4" />
                            <Skeleton className="h-4 w-24 mb-2" />
                            <Skeleton className="h-3 w-full" />
                        </div>
                    ))}
                </div>
            </section>
        );
    }

    return (
        <section className={`overflow-hidden rounded-3xl border bg-white shadow-sm dark:bg-slate-900 ${
            isEasyMode ? 'border-emerald-500 ring-2 ring-emerald-500/10' : 'border-slate-200/70 dark:border-slate-700/60'
        }`}>
            <div className="flex flex-col gap-3 border-b border-slate-200/70 bg-[linear-gradient(135deg,#ecfdf5_0%,#ffffff_55%,#f8fafc_100%)] p-5 dark:border-slate-700/60 dark:bg-[linear-gradient(135deg,rgba(6,78,59,0.3)_0%,rgba(15,23,42,0.9)_100%)] sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <div className="inline-flex items-center gap-2 rounded-full bg-emerald-100 px-3 py-1 text-xs font-bold uppercase tracking-[0.16em] text-emerald-700 dark:bg-emerald-400/10 dark:text-emerald-200">
                        <BellIcon className="h-3.5 w-3.5" />
                        {t.dashboard.teacherPriority}
                    </div>
                    <h3 className={`mt-3 font-bold text-slate-900 dark:text-white ${isEasyMode ? 'text-2xl' : 'text-xl'}`}>{t.dashboard.actionsToday}</h3>
                    <p className={`mt-1 text-slate-500 dark:text-slate-400 ${isEasyMode ? 'text-base' : 'text-sm'}`}>{t.dashboard.actionsSubtitle}</p>
                </div>
                <span className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300">
                    {actions.length} item
                </span>
            </div>

            <div className="grid gap-4 p-4 md:grid-cols-2 xl:grid-cols-4">
                {actions.map((item) => (
                    <button
                        key={item.id}
                        type="button"
                        onClick={() => navigate(item.href)}
                        className={`group rounded-2xl border p-5 text-left transition hover:-translate-y-1 hover:shadow-md ${getToneClass(item.tone)} ${
                            isEasyMode ? 'border-2 min-h-[140px]' : ''
                        }`}
                    >
                        <div className="flex items-start justify-between gap-3">
                            <div className="rounded-2xl bg-white/80 p-2.5 shadow-sm dark:bg-white/10">
                                <item.icon className={isEasyMode ? 'h-6 w-6' : 'h-5 w-5'} />
                            </div>
                            <span className="rounded-full bg-white/70 px-2.5 py-1 text-xs font-bold dark:bg-black/20">{item.badge}</span>
                        </div>
                        <p className={`mt-4 font-bold ${isEasyMode ? 'text-lg' : ''}`}>{item.title}</p>
                        <p className={`mt-1.5 line-clamp-2 font-medium opacity-90 ${isEasyMode ? 'text-sm' : 'text-xs'}`}>{item.description}</p>
                    </button>
                ))}
            </div>
        </section>
    );
};

export default TodayActionPanel;
