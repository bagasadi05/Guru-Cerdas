/**
 * @fileoverview Dashboard Stats Grid Component
 * 
 * This component displays the main statistics cards on the dashboard,
 * showing key metrics like student count, attendance, active tasks, and schedules.
 * 
 * @module components/dashboard/StatsGrid
 */

import React from 'react';
import {
    UsersIcon,
    BookOpenIcon,
    CalendarIcon,
    CheckSquareIcon
} from '../Icons';
import { StatCard } from '../ui/StatCard';
import type { DashboardQueryData } from '../../types';

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
            subValue: `${classes.length} kelas`
        },
        {
            label: 'Kehadiran',
            value: `${attendancePercentage}%`,
            subValue: `${dailyAttendanceSummary?.present || 0}/${students.length} hadir`,
            icon: CheckSquareIcon,
            link: '/absensi',
            color: 'from-emerald-500 to-green-600'
        },
        {
            label: 'Tugas Aktif',
            value: tasks.length,
            icon: BookOpenIcon,
            link: '/tugas',
            color: 'from-amber-500 to-orange-600',
            subValue: 'tugas'
        },
        {
            label: 'Jadwal',
            value: schedule.length,
            icon: CalendarIcon,
            link: '/jadwal',
            color: 'from-violet-500 to-purple-600',
            subValue: nextClassIndex >= 0
                ? `Next: ${schedule[nextClassIndex]?.subject.slice(0, 8)}...`
                : 'Selesai'
        }
    ];

    return (
        <div
            className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4"
        >
            {stats.map((stat, index) => (
                <StatCard
                    key={stat.label}
                    label={stat.label}
                    value={stat.value}
                    icon={stat.icon}
                    gradient={stat.color}
                    subValue={stat.subValue}
                    link={stat.link}
                    size="lg"
                    layout="split"
                    animationIndex={index}
                    className="rounded-2xl card-hover-glow border-white/20 dark:border-white/5 shadow-lg shadow-slate-200/50 dark:shadow-black/20"
                />
            ))}
        </div>
    );
};

export default StatsGrid;
