/**
 * @fileoverview Dashboard Stats Grid Component
 * 
 * This component displays the main statistics cards on the dashboard,
 * showing key metrics like student count, attendance, active tasks, and schedules.
 * 
 * @module components/dashboard/StatsGrid
 */

import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
    ArrowRightIcon,
    UsersIcon,
    BookOpenIcon,
    CalendarIcon,
    CheckSquareIcon
} from '../Icons';
import { staggerContainerVariants, statsCardVariants } from '../../utils/animations';
import { AnimatedCounter } from '../ui/AnimatedCounter';
import { isTaskOverdue, isTaskDueToday } from '../../utils/dateHelpers';
import type { DashboardQueryData } from '../../types';
import { useAccessibility } from '../ui/AccessibilityFeatures';

// =============================================================================
// TYPES
// =============================================================================

interface StatsGridProps {
    /** Dashboard data containing all statistics */
    data: DashboardQueryData;
    /** Current time for schedule calculations */
    currentTime: Date;
}

interface StatCardConfig {
    /** Display label for the stat */
    label: string;
    /** Main value to display */
    value: number | string;
    /** Icon component to render */
    icon: React.FC<{ className?: string }>;
    /** Navigation link */
    link: string;
    /** Gradient color classes */
    color: string;
    /** Secondary value/description */
    subValue: string;
    /** Compact status label shown in the card header */
    statusLabel: string;
    /** Operational detail shown below the metric */
    statusDetail: string;
    /** Progress value for metrics that benefit from visual completion */
    progress?: number;
    /** Status color for quick scanning */
    tone: 'blue' | 'emerald' | 'amber' | 'rose' | 'violet';
}

// =============================================================================
// COMPONENT
// =============================================================================

/**
 * Renders the main statistics grid on the dashboard.
 * 
 * Displays 4 key metrics:
 * - Total students and classes
 * - Today's attendance percentage
 * - Active tasks count
 * - Today's scheduled classes
 * 
 * @param props - Component props
 * @param props.data - Dashboard data from useDashboardData hook
 * @param props.currentTime - Current time for schedule calculations
 * 
 * @example
 * ```tsx
 * <StatsGrid data={dashboardData} currentTime={new Date()} />
 * ```
 */
const StatsGrid: React.FC<StatsGridProps> = ({ data, currentTime }) => {
    const { isEasyMode } = useAccessibility();
    const {
        students,
        tasks,
        schedule,
        classes,
        dailyAttendanceSummary
    } = data;

    // Calculate attendance percentage
    const attendancePercentage = students.length > 0
        ? Math.round((dailyAttendanceSummary?.present || 0) / students.length * 100)
        : 0;
    const attendanceRecorded = dailyAttendanceSummary?.total || 0;
    const attendanceMissing = Math.max(students.length - attendanceRecorded, 0);
    const activeTasks = tasks.filter((task) => task.status !== 'done');
    const overdueTasks = activeTasks.filter((task) => isTaskOverdue(task.due_date, currentTime)).length;
    const dueTodayTasks = activeTasks.filter((task) => isTaskDueToday(task.due_date, currentTime)).length;

    // Find the next upcoming class
    let nextClassIndex = -1;
    for (let i = 0; i < schedule.length; i++) {
        const item = schedule[i];
        const [startH, startM] = item.start_time.split(':').map(Number);
        const startTime = new Date(currentTime);
        startTime.setHours(startH, startM, 0, 0);
        if (startTime > currentTime) {
            nextClassIndex = i;
            break;
        }
    }

    // Configure stats to display
    const stats: StatCardConfig[] = [
        {
            label: 'Peserta Didik',
            value: students.length,
            icon: UsersIcon,
            link: '/siswa',
            color: 'from-sky-500 to-blue-600',
            subValue: `${classes.length} kelas`,
            statusLabel: students.length > 0 ? 'Siap' : 'Kosong',
            statusDetail: students.length > 0 ? 'Data siswa siap dipantau' : 'Tambahkan siswa untuk mulai',
            tone: 'blue',
        },
        {
            label: 'Kehadiran',
            value: `${attendancePercentage}%`,
            subValue: `${dailyAttendanceSummary?.present || 0}/${students.length} hadir`,
            icon: CheckSquareIcon,
            link: '/absensi',
            color: attendanceMissing > 0 ? 'from-amber-500 to-orange-600' : 'from-emerald-500 to-emerald-600',
            statusLabel: students.length === 0
                ? 'Kosong'
                : attendanceMissing > 0
                    ? 'Belum lengkap'
                    : 'Lengkap',
            statusDetail: students.length === 0
                ? 'Belum ada siswa'
                : attendanceMissing > 0
                    ? `${attendanceMissing} siswa belum diabsen`
                    : 'Absensi hari ini lengkap',
            progress: attendancePercentage,
            tone: attendanceMissing > 0 ? 'amber' : 'emerald',
        },
        {
            label: 'Tugas Aktif',
            value: activeTasks.length,
            icon: BookOpenIcon,
            link: '/tugas',
            color: overdueTasks > 0 ? 'from-rose-500 to-red-600' : 'from-amber-500 to-orange-600',
            subValue: overdueTasks > 0 ? `${overdueTasks} terlambat` : dueTodayTasks > 0 ? `${dueTodayTasks} hari ini` : 'terkendali',
            statusLabel: overdueTasks > 0 ? 'Mendesak' : dueTodayTasks > 0 ? 'Hari ini' : 'Aman',
            statusDetail: overdueTasks > 0
                ? 'Perlu tindak lanjut deadline'
                : dueTodayTasks > 0
                    ? 'Ada tugas jatuh tempo hari ini'
                    : 'Tidak ada tugas mendesak',
            tone: overdueTasks > 0 ? 'rose' : 'amber',
        },
        {
            label: 'Jadwal',
            value: schedule.length,
            icon: CalendarIcon,
            link: '/jadwal',
            color: 'from-violet-500 to-purple-600',
            subValue: nextClassIndex >= 0
                ? `Next: ${schedule[nextClassIndex]?.subject.slice(0, 12)}${(schedule[nextClassIndex]?.subject.length || 0) > 12 ? '...' : ''}`
                : 'Selesai',
            statusLabel: nextClassIndex >= 0 ? 'Berikutnya' : 'Selesai',
            statusDetail: nextClassIndex >= 0
                ? `${schedule[nextClassIndex]?.start_time} pelajaran berikutnya`
                : 'Jadwal hari ini selesai',
            tone: 'violet',
        }
    ];

    return (
        <motion.div
            className={`grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6`}
            variants={staggerContainerVariants}
            initial="initial"
            animate="animate"
        >
            {stats.map((stat, index) => (
                <motion.div
                    key={stat.label}
                    variants={statsCardVariants}
                    whileHover="hover"
                    custom={index}
                >
                    <Link to={stat.link} className="group block h-full">
                        <div className={`bg-white/80 dark:bg-slate-900/60 backdrop-blur-xl rounded-3xl p-6 h-full flex flex-col justify-between relative overflow-hidden border transition-all duration-300 group-hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)] group-hover:-translate-y-1 ${
                            isEasyMode 
                                ? 'border-emerald-500 ring-2 ring-emerald-500/10 min-h-[160px]' 
                                : 'border-slate-200/80 dark:border-white/10 shadow-[0_8px_30px_rgb(0,0,0,0.04)] group-hover:border-indigo-500/20'
                        }`}>
                            {/* Hover overlay effect */}
                            <div className="absolute inset-0 bg-gradient-to-br from-indigo-50/50 to-transparent dark:from-white/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

                            {/* Icon container */}
                            <div className="relative z-10 mb-4 sm:mb-6 flex items-start justify-between gap-2 sm:gap-3">
                                <div className={`${isEasyMode ? 'w-12 h-12' : 'w-9 h-9 sm:w-11 sm:h-11'} shrink-0 rounded-lg flex items-center justify-center bg-gradient-to-br ${stat.color} shadow-sm text-white transform group-hover:scale-105 transition-transform duration-300`}>
                                    <stat.icon className={isEasyMode ? 'w-6 h-6 sm:w-7 sm:h-7' : 'w-5 h-5 sm:w-6 sm:h-6'} />
                                </div>
                                <span className={`max-w-[108px] truncate rounded-full px-2.5 py-1 text-xxs font-bold uppercase tracking-[0.12em] ${getToneBadgeClass(stat.tone)}`}>
                                    {stat.statusLabel}
                                </span>
                            </div>

                            {/* Metric Value & Label */}
                            <div className="relative z-10">
                                <span className={`block font-extrabold text-slate-900 dark:text-white leading-none ${isEasyMode ? 'text-3xl sm:text-4xl' : 'text-2xl sm:text-3xl'}`}>
                                    {typeof stat.value === 'number' ? (
                                        <AnimatedCounter value={stat.value} duration={1500} />
                                    ) : (
                                        stat.value
                                    )}
                                </span>
                                <span className={`block font-bold text-slate-500 dark:text-slate-400 mt-2 ${isEasyMode ? 'text-base sm:text-lg' : 'text-xs sm:text-sm'}`}>
                                    {stat.label}
                                </span>
                            </div>

                            {stat.subValue && (
                                <div className="relative z-10 mt-3">
                                    <p className={`font-medium text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-white/5 px-2 py-1 rounded-lg inline-block ${isEasyMode ? 'text-sm' : 'text-xs'}`}>
                                        {stat.subValue}
                                    </p>
                                </div>
                            )}

                            {typeof stat.progress === 'number' && (
                                <div className="relative z-10 mt-3 h-1.5 sm:h-2 overflow-hidden rounded-full bg-slate-100 dark:bg-white/10"
                                     role="progressbar"
                                     aria-valuenow={stat.progress}
                                     aria-valuemin={0}
                                     aria-valuemax={100}
                                     aria-label={`${stat.label}: ${stat.progress}%`}>
                                    <div
                                        className={`h-full rounded-full bg-gradient-to-r ${stat.color}`}
                                        style={{ width: `${Math.min(Math.max(stat.progress, 0), 100)}%` }}
                                    />
                                </div>
                            )}

                            <div className="relative z-10 mt-4 pt-4 border-t border-slate-100 dark:border-white/5 flex items-center justify-between gap-2">
                                <span className={`font-semibold line-clamp-1 flex-1 ${
                                    isEasyMode ? 'text-sm text-slate-700 dark:text-slate-300' : 'text-xxs text-slate-400 dark:text-slate-500'
                                }`}>
                                    {stat.statusDetail}
                                </span>
                                <ArrowRightIcon className={`shrink-0 transition-transform duration-300 group-hover:translate-x-1 ${
                                    isEasyMode ? 'w-5 h-5 text-emerald-500' : 'w-3.5 h-3.5 text-slate-400 dark:text-slate-600'
                                }`} />
                            </div>
                        </div>
                    </Link>
                </motion.div>
            ))}
        </motion.div>
    );
};

const getToneBadgeClass = (tone: StatCardConfig['tone']) => {
    switch (tone) {
        case 'emerald':
            return 'bg-emerald-50 text-emerald-700 dark:bg-emerald-400/10 dark:text-emerald-200';
        case 'amber':
            return 'bg-amber-50 text-amber-700 dark:bg-amber-400/10 dark:text-amber-200';
        case 'rose':
            return 'bg-rose-50 text-rose-700 dark:bg-rose-400/10 dark:text-rose-200';
        case 'violet':
            return 'bg-violet-50 text-violet-700 dark:bg-violet-400/10 dark:text-violet-200';
        case 'blue':
        default:
            return 'bg-sky-50 text-sky-700 dark:bg-sky-400/10 dark:text-sky-200';
    }
};

const getToneDotClass = (tone: StatCardConfig['tone']) => {
    switch (tone) {
        case 'emerald':
            return 'bg-emerald-500';
        case 'amber':
            return 'bg-amber-500';
        case 'rose':
            return 'bg-rose-500';
        case 'violet':
            return 'bg-violet-500';
        case 'blue':
        default:
            return 'bg-sky-500';
    }
};

export default StatsGrid;
