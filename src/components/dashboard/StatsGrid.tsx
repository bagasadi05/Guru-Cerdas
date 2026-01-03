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
    UsersIcon,
    BookOpenIcon,
    CalendarIcon,
    CheckSquareIcon
} from '../Icons';
import { staggerContainerVariants, statsCardVariants } from '../../utils/animations';
import { AnimatedCounter } from '../ui/AnimatedCounter';
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
        <motion.div
            className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4"
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
                        <div className="glass-card rounded-2xl p-5 h-full flex flex-col justify-between card-hover-glow relative overflow-hidden border border-white/20 dark:border-white/5 shadow-lg shadow-slate-200/50 dark:shadow-black/20">
                            {/* Hover overlay effect */}
                            <div className="absolute inset-0 bg-gradient-to-br from-white/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

                            {/* Icon container */}
                            <div className="flex items-start justify-between mb-4 relative z-10">
                                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center bg-gradient-to-br ${stat.color} shadow-lg text-white transform group-hover:scale-110 transition-transform duration-300`}>
                                    <stat.icon className="w-6 h-6" />
                                </div>
                            </div>

                            {/* Content */}
                            <div className="relative z-10">
                                <div className="text-3xl font-bold text-slate-800 dark:text-white leading-none mb-2 tracking-tight">
                                    {typeof stat.value === 'number' ? (
                                        <AnimatedCounter
                                            value={stat.value}
                                            duration={1500}
                                            className="text-3xl font-bold"
                                        />
                                    ) : (
                                        stat.value
                                    )}
                                </div>
                                <p className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-1">
                                    {stat.label}
                                </p>
                                {stat.subValue && (
                                    <p className="text-xs font-medium text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-white/5 px-2 py-1 rounded-lg inline-block">
                                        {stat.subValue}
                                    </p>
                                )}
                            </div>
                        </div>
                    </Link>
                </motion.div>
            ))}
        </motion.div>
    );
};

export default StatsGrid;
