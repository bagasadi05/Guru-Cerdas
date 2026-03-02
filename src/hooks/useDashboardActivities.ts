/**
 * @fileoverview Custom hook for generating dashboard activity feed
 * 
 * Converts dashboard data into activity timeline items and smart reminders.
 * 
 * @module hooks/useDashboardActivities
 */

import { useMemo, useState, useCallback } from 'react';
import type { Database } from '../types';
import type { ActivityItem } from '../components/dashboard/RecentActivityTimeline';
import type { Reminder } from '../components/dashboard/SmartReminders';

type TaskRow = Database['public']['Tables']['tasks']['Row'];
type AcademicRecord = Database['public']['Tables']['academic_records']['Row'];
type AttendanceRecord = { created_at: string; status: string; count: number };

export interface DashboardActivityData {
  students: Array<{ id: string; name: string }>;
  tasks: TaskRow[];
  recentTasks: Pick<TaskRow, 'id' | 'title' | 'created_at' | 'status'>[];
  academicRecords: Pick<AcademicRecord, 'student_id' | 'subject' | 'score' | 'assessment_name' | 'created_at'>[];
  dailyAttendanceSummary: { present: number; total: number };
  todayAttendanceRecords: AttendanceRecord[];
}

export interface UseDashboardActivitiesReturn {
  /** Generated activity items for timeline */
  activities: ActivityItem[];
  /** Smart reminders based on dashboard state */
  reminders: Reminder[];
  /** Active (non-dismissed) reminders */
  activeReminders: Reminder[];
  /** Dismissed reminder IDs */
  dismissedReminders: Set<string>;
  /** Function to dismiss a reminder */
  dismissReminder: (id: string) => void;
}

/**
 * Generates activity feed items from dashboard data.
 * 
 * @param data - Dashboard activity data
 * @returns Array of activity items sorted by timestamp
 */
const generateActivities = (data: DashboardActivityData | null): ActivityItem[] => {
  if (!data) return [];

  const activities: ActivityItem[] = [];

  // 1. Attendance activities from today
  if (data.dailyAttendanceSummary?.total && data.dailyAttendanceSummary.total > 0) {
    const latestAttendance = data.todayAttendanceRecords?.[0];
    activities.push({
      id: 'activity-attendance-today',
      type: 'attendance',
      title: 'Absensi Tercatat',
      description: `${data.dailyAttendanceSummary.present} dari ${data.students?.length || 0} siswa hadir hari ini`,
      timestamp: latestAttendance?.created_at ? new Date(latestAttendance.created_at) : new Date(),
      link: '/absensi',
    });
  }

  // 2. Recent grades/academic records
  const recentGrades = data.academicRecords?.slice(0, 3) || [];
  recentGrades.forEach((record, index) => {
    if (record.created_at) {
      activities.push({
        id: `activity-grade-${index}`,
        type: 'grade',
        title: 'Nilai Diinput',
        description: `${record.subject} - ${record.assessment_name || 'Penilaian'} (Skor: ${record.score})`,
        timestamp: new Date(record.created_at),
        link: '/analytics',
      });
    }
  });

  // 3. Recent tasks created
  const recentTasks = data.recentTasks?.slice(0, 3) || [];
  recentTasks.forEach((task, index) => {
    if (task.created_at) {
      activities.push({
        id: `activity-task-${index}`,
        type: 'task',
        title: task.status === 'done' ? 'Tugas Selesai' : 'Tugas Dibuat',
        description: task.title,
        timestamp: new Date(task.created_at),
        link: '/tugas',
      });
    }
  });

  // Sort by timestamp (newest first) and limit to 5
  return activities
    .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
    .slice(0, 5);
};

/**
 * Generates smart reminders based on dashboard state.
 * 
 * @param data - Dashboard activity data
 * @returns Array of reminder items
 */
const generateReminders = (data: DashboardActivityData | null): Reminder[] => {
  if (!data) return [];

  const reminders: Reminder[] = [];

  // Check for unrecorded attendance today
  const { students = [], dailyAttendanceSummary } = data;
  const attendanceRecorded = dailyAttendanceSummary?.total || 0;
  
  if (students.length > 0 && attendanceRecorded < students.length) {
    reminders.push({
      id: 'attendance-incomplete',
      type: 'warning',
      title: 'Absensi Belum Lengkap',
      message: `${students.length - attendanceRecorded} siswa belum diabsen hari ini`,
      action: { label: 'Isi Sekarang', link: '/absensi' },
      dismissible: true,
    });
  }

  // Check for pending tasks
  const pendingTasks = data.tasks?.filter((t) => t.status !== 'done').length || 0;
  if (pendingTasks > 5) {
    reminders.push({
      id: 'tasks-pending',
      type: 'info',
      title: `${pendingTasks} Tugas Pending`,
      message: 'Beberapa tugas belum diselesaikan',
      action: { label: 'Lihat Tugas', link: '/tugas' },
      dismissible: true,
    });
  }

  // Check for low attendance
  const attendancePercentage =
    students.length > 0
      ? Math.round((dailyAttendanceSummary?.present || 0) / students.length * 100)
      : 100;
      
  if (attendancePercentage < 70 && attendanceRecorded > 0) {
    reminders.push({
      id: 'low-attendance',
      type: 'urgent',
      title: 'Kehadiran Rendah!',
      message: `Hanya ${attendancePercentage}% siswa hadir hari ini`,
      action: { label: 'Cek Details', link: '/absensi' },
      dismissible: false,
    });
  }

  return reminders;
};

/**
 * Custom hook for managing dashboard activities and reminders.
 * 
 * @param data - Dashboard activity data
 * @returns Activity items, reminders, and control functions
 * 
 * @example
 * ```tsx
 * const { activities, activeReminders, dismissReminder } = useDashboardActivities(data);
 * 
 * return (
 *   <>
 *     <ActivityFeed activities={activities} />
 *     <ReminderList reminders={activeReminders} onDismiss={dismissReminder} />
 *   </>
 * );
 * ```
 */
export const useDashboardActivities = (
  data: DashboardActivityData | null
): UseDashboardActivitiesReturn => {
  const [dismissedReminders, setDismissedReminders] = useState<Set<string>>(new Set());

  // Generate activities from data
  const activities = useMemo(() => generateActivities(data), [data]);

  // Generate reminders from data
  const reminders = useMemo(() => generateReminders(data), [data]);

  // Filter out dismissed reminders
  const activeReminders = useMemo(
    () => reminders.filter((r) => !dismissedReminders.has(r.id)),
    [reminders, dismissedReminders]
  );

  // Dismiss reminder handler
  const dismissReminder = useCallback((id: string) => {
    setDismissedReminders((prev) => new Set([...prev, id]));
  }, []);

  return {
    activities,
    reminders,
    activeReminders,
    dismissedReminders,
    dismissReminder,
  };
};
