import React, { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronRight, ArrowUpRight } from 'lucide-react';
import {
  AlertTriangleIcon,
  BellIcon,
  CheckCircleIcon,
  ClipboardPenIcon,
  MessageSquareIcon,
  TrendingDownIcon,
  BookOpenIcon,
  TrendingUpIcon,
  ClockIcon,
  SparklesIcon,
} from '../Icons';
import type { DashboardQueryData } from '../../types';
import { isTaskOverdue, isTaskDueSoon, formatTaskDueDate } from '../../utils/dateHelpers';
import { useI18n } from '../../utils/i18n';
import { Skeleton } from '../ui/Skeleton';
import { Button } from '../ui/Button';

interface TodayActionPanelProps {
  data: DashboardQueryData | null | undefined;
  isLoading?: boolean;
  isCombined?: boolean;
  currentTime?: Date;
}

type ActionTone = 'danger' | 'warning' | 'info' | 'success';

interface TodayActionItem {
  id: string;
  title: string;
  description: string;
  badge: string;
  actionLabel: string;
  href: string;
  tone: ActionTone;
  icon: React.FC<{ className?: string }>;
}

const getToneAccent = (tone: ActionTone) => {
  switch (tone) {
    case 'danger':
      return {
        border: 'border-rose-200/80 dark:border-rose-800/40',
        bannerBg: 'bg-gradient-to-r from-rose-50/90 via-white to-rose-50/40 dark:from-rose-950/25 dark:via-slate-900/60 dark:to-rose-950/15',
        cardBg: 'bg-gradient-to-br from-rose-50/70 via-white to-white dark:from-rose-950/20 dark:via-slate-900/60 dark:to-slate-900/40',
        hoverBorder: 'hover:border-rose-300 dark:hover:border-rose-700/60',
        iconBox: 'bg-rose-500/10 dark:bg-rose-500/20 border-rose-500/20 text-rose-700 dark:text-rose-400',
        titleHover: 'group-hover:text-rose-600 dark:group-hover:text-rose-400',
        btn: 'bg-rose-600 hover:bg-rose-700 text-white shadow-sm',
        badge: 'bg-rose-100/90 text-rose-700 dark:bg-rose-900/50 dark:text-rose-300 border border-rose-200/50 dark:border-rose-800/40',
      };
    case 'warning':
      return {
        border: 'border-amber-200/80 dark:border-amber-800/40',
        bannerBg: 'bg-gradient-to-r from-amber-50/90 via-white to-amber-50/40 dark:from-amber-950/25 dark:via-slate-900/60 dark:to-amber-950/15',
        cardBg: 'bg-gradient-to-br from-amber-50/70 via-white to-white dark:from-amber-950/20 dark:via-slate-900/60 dark:to-slate-900/40',
        hoverBorder: 'hover:border-amber-300 dark:hover:border-amber-700/60',
        iconBox: 'bg-amber-500/10 dark:bg-amber-500/20 border-amber-500/20 text-amber-700 dark:text-amber-400',
        titleHover: 'group-hover:text-amber-600 dark:group-hover:text-amber-400',
        btn: 'bg-amber-600 hover:bg-amber-700 text-white shadow-sm',
        badge: 'bg-amber-100/90 text-amber-700 dark:bg-amber-900/50 dark:text-amber-300 border border-amber-200/50 dark:border-amber-800/40',
      };
    case 'info':
      return {
        border: 'border-sky-200/80 dark:border-sky-800/40',
        bannerBg: 'bg-gradient-to-r from-sky-50/90 via-white to-sky-50/40 dark:from-sky-950/25 dark:via-slate-900/60 dark:to-sky-950/15',
        cardBg: 'bg-gradient-to-br from-sky-50/70 via-white to-white dark:from-sky-950/20 dark:via-slate-900/60 dark:to-slate-900/40',
        hoverBorder: 'hover:border-sky-300 dark:hover:border-sky-700/60',
        iconBox: 'bg-sky-500/10 dark:bg-sky-500/20 border-sky-500/20 text-sky-700 dark:text-sky-400',
        titleHover: 'group-hover:text-sky-600 dark:group-hover:text-sky-400',
        btn: 'bg-sky-600 hover:bg-sky-700 text-white shadow-sm',
        badge: 'bg-sky-100/90 text-sky-700 dark:bg-sky-900/50 dark:text-sky-300 border border-sky-200/50 dark:border-sky-800/40',
      };
    case 'success':
    default:
      return {
        border: 'border-emerald-200/80 dark:border-emerald-800/40',
        bannerBg: 'bg-gradient-to-r from-emerald-50/90 via-white to-emerald-50/40 dark:from-emerald-950/25 dark:via-slate-900/60 dark:to-emerald-950/15',
        cardBg: 'bg-gradient-to-br from-emerald-50/70 via-white to-white dark:from-emerald-950/20 dark:via-slate-900/60 dark:to-slate-900/40',
        hoverBorder: 'hover:border-emerald-300 dark:hover:border-emerald-700/60',
        iconBox: 'bg-emerald-500/10 dark:bg-emerald-500/20 border-emerald-500/20 text-emerald-700 dark:text-emerald-400',
        titleHover: 'group-hover:text-emerald-600 dark:group-hover:text-emerald-400',
        btn: 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm',
        badge: 'bg-emerald-100/90 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300 border border-emerald-200/50 dark:border-emerald-800/40',
      };
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

export const TodayActionPanel: React.FC<TodayActionPanelProps> = ({
  data,
  isLoading,
  isCombined,
  currentTime = new Date(),
}) => {
  const navigate = useNavigate();
  const { t } = useI18n();

  // Quick Action Shortcuts Definition
  const quickShortcuts = useMemo(() => {
    const totalStudents = data?.students?.length || 0;
    const presentCount = data?.dailyAttendanceSummary?.present || 0;
    const recordedTotal = data?.dailyAttendanceSummary?.total || 0;
    const attendanceMissing = Math.max(totalStudents - recordedTotal, 0);

    return [
      {
        id: 'absensi',
        title: 'Isi Absensi',
        subtitle: totalStudents > 0 ? `${presentCount}/${totalStudents} Hadir` : 'Catat kehadiran',
        badge: attendanceMissing > 0 ? `${attendanceMissing} Belum` : 'Lengkap',
        badgeColor: attendanceMissing > 0 ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300' : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300',
        href: '/absensi',
        icon: ClipboardPenIcon,
        borderHover: 'hover:border-emerald-500/60',
        iconBg: 'bg-emerald-500/10 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border-emerald-500/20',
      },
      {
        id: 'jurnal',
        title: 'Jurnal Mengajar',
        subtitle: 'Catat materi & kelas',
        href: '/jurnal',
        icon: BookOpenIcon,
        borderHover: 'hover:border-indigo-500/60',
        iconBg: 'bg-indigo-500/10 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 border-indigo-500/20',
      },
      {
        id: 'nilai',
        title: 'Input Nilai',
        subtitle: 'Formatif & Sumatif',
        href: '/input-massal',
        icon: TrendingUpIcon,
        borderHover: 'hover:border-sky-500/60',
        iconBg: 'bg-sky-500/10 dark:bg-sky-500/20 text-sky-600 dark:text-sky-400 border-sky-500/20',
      },
      {
        id: 'perangkat',
        title: 'Perangkat Ajar',
        subtitle: 'Modul & Prota-Promes',
        href: '/perangkat-ajar',
        icon: SparklesIcon,
        borderHover: 'hover:border-amber-500/60',
        iconBg: 'bg-amber-500/10 dark:bg-amber-500/20 text-amber-600 dark:text-amber-400 border-amber-500/20',
      },
    ];
  }, [data]);

  const actions = useMemo<TodayActionItem[]>(() => {
    if (!data) return [];
    const items: TodayActionItem[] = [];
    const now = currentTime;
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
        badge: `${attendanceMissing} Siswa`,
        actionLabel: 'Catat Absensi',
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
        badge: `${overdueTasks || dueSoonTasks} Tugas`,
        actionLabel: 'Buka Tugas',
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
        badge: `${unreadParentMessages} Pesan`,
        actionLabel: 'Buka Pesan',
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
        badge: `-${firstDrop.drop} Poin`,
        actionLabel: 'Lihat Siswa',
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
        actionLabel: 'Dashboard',
        href: '/dashboard',
        tone: 'success',
        icon: CheckCircleIcon,
      });
    }

    return items.slice(0, 4);
  }, [data, t, currentTime]);

  // Tasks preview list
  const pendingTasks = useMemo(() => {
    if (!data?.tasks) return [];
    return data.tasks
      .filter((task) => task.status !== 'done')
      .slice(0, 3);
  }, [data]);

  if (isLoading) {
    return (
      <div className={isCombined ? '' : 'overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900'}>
        <div className="p-5 pb-4 space-y-3">
          <Skeleton className="h-5 w-32 rounded-full" />
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            <Skeleton className="h-18 rounded-xl" />
            <Skeleton className="h-18 rounded-xl" />
            <Skeleton className="h-18 rounded-xl" />
            <Skeleton className="h-18 rounded-xl" />
          </div>
          <Skeleton className="h-24 w-full rounded-xl" />
        </div>
      </div>
    );
  }

  const isAllClear = actions.length === 1 && actions[0].id === 'all-clear';

  return (
    <div className={isCombined ? '' : 'overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900 flex flex-col h-full transition-all duration-200'}>
      {/* Unified Header */}
      <div className="p-4 sm:p-5 pb-3 border-b border-slate-100 dark:border-slate-800/80 bg-slate-50/50 dark:bg-slate-900/50">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200/60 dark:border-emerald-800/40 px-3 py-1 text-xs font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-300">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              <BellIcon className="h-3.5 w-3.5" />
              {t.dashboard.teacherPriority}
            </div>
            <h3 className="mt-2 font-bold text-lg sm:text-xl text-slate-900 dark:text-white leading-tight">
              {t.dashboard.actionsToday}
            </h3>
            <p className="mt-0.5 text-xs sm:text-sm text-slate-500 dark:text-slate-400">
              {t.dashboard.actionsSubtitle}
            </p>
          </div>

          <div className="shrink-0 self-start sm:self-auto">
            {isAllClear ? (
              <span className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200/60 dark:border-emerald-800/50 shadow-xs">
                <CheckCircleIcon className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                Semua Beres
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold bg-rose-50 text-rose-700 dark:bg-rose-950/50 dark:text-rose-300 border border-rose-200/80 dark:border-rose-800/50 shadow-xs">
                <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse"></span>
                {actions.length} Tindakan Diperlukan
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="p-4 sm:p-5 flex-1 space-y-4">
        {/* ==================================================== */}
        {/* ROW 1: PINTASAN AKSI UTAMA (Quick Action Bar)       */}
        {/* ==================================================== */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Pintasan Aksi Utama
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            {quickShortcuts.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => navigate(item.href)}
                className={`group p-3 rounded-xl border border-slate-200/70 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-850/50 text-left transition-all duration-150 hover:-translate-y-0.5 hover:shadow-xs active:scale-95 cursor-pointer flex flex-col justify-between min-h-[90px] ${item.borderHover}`}
              >
                <div className="flex items-start justify-between gap-1">
                  <div className={`w-8 h-8 rounded-lg border flex items-center justify-center shrink-0 shadow-2xs group-hover:scale-105 transition-transform ${item.iconBg}`}>
                    <item.icon className="w-4 h-4" />
                  </div>
                  {item.badge && (
                    <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${item.badgeColor}`}>
                      {item.badge}
                    </span>
                  )}
                </div>

                <div className="mt-2">
                  <h4 className="font-bold text-xs sm:text-sm text-slate-900 dark:text-white group-hover:text-brand-600 transition-colors line-clamp-1">
                    {item.title}
                  </h4>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-1 mt-0.5">
                    {item.subtitle}
                  </p>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* ==================================================== */}
        {/* ROW 2: STATUS & PERINGATAN MENDESAK                  */}
        {/* ==================================================== */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Status & Peringatan Hari Ini
            </span>
          </div>

          {isAllClear ? (
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 rounded-2xl border border-emerald-200/80 bg-emerald-50/60 dark:border-emerald-800/40 dark:bg-emerald-950/20 transition-colors">
              <div className="flex items-center gap-3.5">
                <div className="w-11 h-11 rounded-2xl bg-white dark:bg-emerald-900/40 border border-emerald-200/60 dark:border-emerald-700/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0 shadow-xs">
                  <CheckCircleIcon className="w-6 h-6" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h4 className="font-bold text-sm sm:text-base text-slate-900 dark:text-white">
                      {t.dashboard.noUrgentActions}
                    </h4>
                    <span className="rounded-full bg-emerald-100 dark:bg-emerald-900/50 text-emerald-700 dark:text-emerald-300 text-xxs sm:text-xs px-2 sm:px-2.5 py-0.5 font-bold">
                      Aman
                    </span>
                  </div>
                  <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 mt-1 max-w-xl leading-relaxed">
                    {t.dashboard.noUrgentDesc}
                  </p>
                </div>
              </div>

              {/* Quick action shortcuts */}
              <div className="flex items-center gap-2 w-full sm:w-auto pt-3 sm:pt-0 border-t sm:border-t-0 border-emerald-200/40 dark:border-emerald-800/40 shrink-0">
                <button
                  type="button"
                  onClick={() => navigate('/absensi')}
                  className="flex-1 sm:flex-initial px-3.5 py-2 min-h-[40px] text-xs font-semibold rounded-xl bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700/80 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 shadow-xs transition-all duration-150 cursor-pointer active:scale-95 flex items-center justify-center"
                >
                  Cek Absensi
                </button>
                <button
                  type="button"
                  onClick={() => navigate('/input-massal')}
                  className="flex-1 sm:flex-initial px-3.5 py-2 min-h-[40px] text-xs font-semibold rounded-xl bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700/80 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 shadow-xs transition-all duration-150 cursor-pointer active:scale-95 flex items-center justify-center"
                >
                  Input Nilai
                </button>
                <button
                  type="button"
                  onClick={() => navigate('/jadwal?tab=mengajar')}
                  className="flex-1 sm:flex-initial px-3.5 py-2 min-h-[40px] text-xs font-semibold rounded-xl bg-brand-600 hover:bg-brand-700 text-white shadow-xs transition-all duration-150 cursor-pointer active:scale-95 flex items-center justify-center"
                >
                  Buka Jadwal
                </button>
              </div>
            </div>
          ) : actions.length === 1 ? (
            /* Single Action: Render as a cohesive, full-width Hero Action Banner */
            (() => {
              const item = actions[0];
              const accent = getToneAccent(item.tone);
              return (
                <div
                  onClick={() => navigate(item.href)}
                  className={`group cursor-pointer rounded-2xl border ${accent.border} ${accent.bannerBg} ${accent.hoverBorder} p-4 sm:p-5 transition-all duration-150 hover:shadow-xs hover:-translate-y-0.5 active:scale-[0.99]`}
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex items-start sm:items-center gap-3.5 min-w-0">
                      <div className={`w-11 h-11 sm:w-12 sm:h-12 rounded-2xl border flex items-center justify-center shrink-0 shadow-xs transition-transform group-hover:scale-105 ${accent.iconBox}`}>
                        <item.icon className="w-5 h-5 sm:w-6 sm:h-6" />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2.5 flex-wrap">
                          <h4 className={`font-bold text-sm sm:text-base text-slate-900 dark:text-white transition-colors ${accent.titleHover}`}>
                            {item.title}
                          </h4>
                          <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${accent.badge}`}>
                            {item.badge}
                          </span>
                        </div>
                        <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 mt-1 line-clamp-1">
                          {item.description}
                        </p>
                      </div>
                    </div>

                    <div className="shrink-0 flex items-center">
                      <span className={`inline-flex items-center gap-1.5 px-4 py-2.5 text-xs font-bold rounded-xl transition-all ${accent.btn}`}>
                        <span>{item.actionLabel}</span>
                        <ChevronRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                      </span>
                    </div>
                  </div>
                </div>
              );
            })()
          ) : (
            /* Multiple Actions: Render as an aligned, cohesive action grid */
            <div className={`grid gap-3 ${
              actions.length === 2 ? 'grid-cols-1 md:grid-cols-2' :
              actions.length === 3 ? 'grid-cols-1 md:grid-cols-3' :
              'grid-cols-1 md:grid-cols-2 xl:grid-cols-4'
            }`}>
              {actions.map((item) => {
                const accent = getToneAccent(item.tone);
                return (
                  <div
                    key={item.id}
                    onClick={() => navigate(item.href)}
                    className={`group cursor-pointer rounded-2xl border ${accent.border} ${accent.cardBg} ${accent.hoverBorder} p-4 text-left transition-all duration-150 hover:-translate-y-0.5 hover:shadow-xs active:scale-[0.98] flex flex-col justify-between`}
                  >
                    <div>
                      <div className="flex items-center justify-between gap-2 mb-3">
                        <div className={`w-9 h-9 rounded-xl border flex items-center justify-center shrink-0 shadow-2xs ${accent.iconBox}`}>
                          <item.icon className="h-4.5 w-4.5" />
                        </div>
                        <span className={`px-2 py-0.5 rounded-full text-[11px] font-bold ${accent.badge}`}>
                          {item.badge}
                        </span>
                      </div>
                      <h4 className={`font-bold text-sm text-slate-900 dark:text-white transition-colors ${accent.titleHover}`}>
                        {item.title}
                      </h4>
                      <p className="mt-1 text-xs text-slate-600 dark:text-slate-400 line-clamp-2 leading-relaxed">
                        {item.description}
                      </p>
                    </div>

                    <div className="mt-3.5 pt-2.5 border-t border-slate-200/50 dark:border-slate-800/50 flex items-center justify-between text-xs font-semibold text-slate-600 dark:text-slate-300">
                      <span className={`transition-colors ${accent.titleHover}`}>
                        {item.actionLabel}
                      </span>
                      <ChevronRight className="w-3.5 h-3.5 text-slate-400 group-hover:translate-x-0.5 transition-transform" />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* ==================================================== */}
        {/* ROW 3: CHECKLIST TUGAS AKTIF                         */}
        {/* ==================================================== */}
        {pendingTasks.length > 0 && (
          <div className="pt-1">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Tenggat Tugas Aktif ({data?.tasks?.length || 0})
              </span>
              <button
                type="button"
                onClick={() => navigate('/tugas')}
                className="text-xs font-semibold text-brand-600 dark:text-brand-400 hover:underline flex items-center gap-0.5 cursor-pointer"
              >
                <span>Lihat Semua</span>
                <ArrowUpRight className="w-3 h-3" />
              </button>
            </div>

            <div className="space-y-1.5">
              {pendingTasks.map((task) => {
                const overdue = isTaskOverdue(task.due_date, currentTime);
                return (
                  <div
                    key={task.id}
                    onClick={() => navigate('/tugas')}
                    className="p-2.5 rounded-xl border border-slate-200/60 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-850/40 hover:bg-white dark:hover:bg-slate-800 transition-all duration-150 cursor-pointer flex items-center justify-between gap-2 group"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <div
                        className={`w-2 h-2 rounded-full shrink-0 ${
                          overdue ? 'bg-rose-500 animate-pulse' : 'bg-brand-500'
                        }`}
                      />
                      <p className="font-semibold text-xs text-slate-800 dark:text-slate-200 line-clamp-1 group-hover:text-brand-600 transition-colors">
                        {task.title}
                      </p>
                    </div>

                    <span className="text-[11px] text-slate-500 dark:text-slate-400 shrink-0 flex items-center gap-1">
                      <ClockIcon className="w-3 h-3 text-slate-400" />
                      {task.due_date ? formatTaskDueDate(task.due_date) : 'Tanpa deadline'}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="p-3 border-t border-slate-100 dark:border-slate-800/80 bg-slate-50/50 dark:bg-slate-900/50 flex items-center justify-between gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => navigate('/tugas')}
          className="text-xs font-semibold rounded-xl h-8 px-3 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:text-brand-600 cursor-pointer active:scale-95 duration-150"
        >
          <span>Kelola Daftar Tugas</span>
          <ChevronRight className="w-3.5 h-3.5 ml-1 text-slate-400" />
        </Button>

        <Button
          size="sm"
          onClick={() => navigate('/absensi')}
          className="text-xs font-bold rounded-xl h-8 px-3 bg-emerald-600 hover:bg-emerald-500 text-white cursor-pointer active:scale-95 duration-150"
        >
          <ClipboardPenIcon className="w-3.5 h-3.5 mr-1" />
          <span>Isi Absensi</span>
        </Button>
      </div>
    </div>
  );
};

export default TodayActionPanel;
