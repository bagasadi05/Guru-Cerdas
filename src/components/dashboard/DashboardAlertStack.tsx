import React, { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../ui/Button';
import {
  AlertTriangleIcon,
  BookOpenIcon,
  ClockIcon,
} from '../Icons';
import type { DashboardQueryData } from '../../types';

interface DashboardAlertStackProps {
  data: DashboardQueryData | undefined;
  journalStatus?: { unfilled: number } | null;
}

interface AlertItem {
  id: string;
  severity: 'danger' | 'warning' | 'info';
  icon: React.FC<{ className?: string }>;
  title: string;
  description: string;
  cta: { label: string; href: string };
}

const severityStyles: Record<string, string> = {
  danger: 'bg-rose-50/90 dark:bg-rose-500/10 border-rose-200/80 dark:border-rose-500/20 shadow-[0_8px_30px_rgb(243,24,96,0.06)]',
  warning: 'bg-amber-50/90 dark:bg-amber-500/10 border-amber-200/80 dark:border-amber-500/20 shadow-[0_8px_30px_rgb(245,158,11,0.06)]',
  info: 'bg-blue-50/90 dark:bg-blue-500/10 border-blue-200/80 dark:border-blue-500/20 shadow-[0_8px_30px_rgb(59,130,246,0.06)]',
};

const iconBgStyles: Record<string, string> = {
  danger: 'bg-rose-100 dark:bg-rose-900/40',
  warning: 'bg-amber-100 dark:bg-amber-900/40',
  info: 'bg-blue-100 dark:bg-blue-900/40',
};

const iconTextStyles: Record<string, string> = {
  danger: 'text-rose-600 dark:text-rose-400',
  warning: 'text-amber-600 dark:text-amber-400',
  info: 'text-blue-600 dark:text-blue-400',
};

const titleTextStyles: Record<string, string> = {
  danger: 'text-rose-800 dark:text-rose-400',
  warning: 'text-amber-800 dark:text-amber-400',
  info: 'text-blue-800 dark:text-blue-400',
};

const ctaStyles: Record<string, string> = {
  danger: '!bg-rose-600 hover:!bg-rose-700 text-white',
  warning: '!bg-amber-600 hover:!bg-amber-700 text-white',
  info: '!bg-blue-600 hover:!bg-blue-700 text-white',
};

export const DashboardAlertStack: React.FC<DashboardAlertStackProps> = ({ data, journalStatus }) => {
  const navigate = useNavigate();

  const alerts = useMemo((): AlertItem[] => {
    if (!data) return [];
    const items: AlertItem[] = [];
    const totalStudents = data.students.length;

    // 1. Attendance incomplete
    const attendanceMissing = Math.max(totalStudents - (data.dailyAttendanceSummary?.total || 0), 0);
    if (totalStudents > 0 && attendanceMissing > 0) {
      items.push({
        id: 'attendance-incomplete',
        severity: attendanceMissing > Math.max(totalStudents * 0.25, 1) ? 'danger' : 'warning',
        icon: AlertTriangleIcon,
        title: 'Tunggakan Absensi Hari Ini',
        description: `Ada ${attendanceMissing} siswa yang belum dicatat kehadirannya hari ini.`,
        cta: { label: 'Isi Sekarang', href: '/absensi' },
      });
    }

    // 2. Journal unfilled
    if (journalStatus && journalStatus.unfilled > 0) {
      items.push({
        id: 'journal-unfilled',
        severity: 'warning',
        icon: BookOpenIcon,
        title: 'Jurnal Hari Ini Belum Diisi',
        description: `Ada ${journalStatus.unfilled} agenda KBM hari ini yang belum dicatat ke jurnal mengajar.`,
        cta: { label: 'Isi Sekarang', href: '/jadwal' },
      });
    }

    // 3. Overdue tasks
    const now = new Date();
    const overdueTasks = data.tasks.filter(t =>
      t.status !== 'done' && t.due_date && new Date(t.due_date) < now
    );
    if (overdueTasks.length > 0) {
      items.push({
        id: 'overdue-tasks',
        severity: overdueTasks.length >= 3 ? 'danger' : 'warning',
        icon: ClockIcon,
        title: `${overdueTasks.length} Tugas Terlambat`,
        description: `Tugas yang melewati deadline perlu segera ditindaklanjuti.`,
        cta: { label: 'Lihat Tugas', href: '/tugas' },
      });
    }

    return items;
  }, [data, journalStatus]);

  if (alerts.length === 0) return null;

  return (
    <div className="space-y-3 animate-fade-in">
      {alerts.map(alert => {
        const Icon = alert.icon;
        return (
          <div
            key={alert.id}
            className={`p-5 rounded-3xl backdrop-blur-xl border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 transition-all hover:shadow-lg ${severityStyles[alert.severity]}`}
          >
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${iconBgStyles[alert.severity]}`}>
                <Icon className={`w-5 h-5 ${iconTextStyles[alert.severity]}`} />
              </div>
              <div>
                <h4 className={`font-bold text-sm ${titleTextStyles[alert.severity]}`}>
                  {alert.title}
                </h4>
                <p className="text-xs text-slate-600 dark:text-slate-300 mt-0.5">
                  {alert.description}
                </p>
              </div>
            </div>
            <Button
              onClick={() => navigate(alert.cta.href)}
              size="sm"
              className={`w-full sm:w-auto shrink-0 rounded-xl ${ctaStyles[alert.severity]}`}
            >
              {alert.cta.label}
            </Button>
          </div>
        );
      })}
    </div>
  );
};
