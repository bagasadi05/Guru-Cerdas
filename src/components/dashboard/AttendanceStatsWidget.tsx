import React, { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '../../services/supabase';
import { useAuth } from '../../hooks/useAuth';
import {
    UsersIcon,
    CheckCircleIcon,
    XCircleIcon,
    AlertTriangleIcon,
    CalendarIcon,
    Activity
} from 'lucide-react';
import WeeklyAttendanceChart from './WeeklyAttendanceChart';
import { EmptyState } from '../ui/EmptyState';
import { DashboardPanel, DashboardPanelContent } from './DashboardPanel';

interface AttendanceStatsProps {
    selectedDate?: string;
    showTrend?: boolean;
    weeklyData?: { day: string; present_percentage: number }[];
}


interface ClassStats {
    classId: string;
    className: string;
    hadir: number;
    sakit: number;
    izin: number;
    alpha: number;
    total: number;
    percentage: number;
    trend?: 'up' | 'down' | 'stable';
}

const AttendanceStatsWidget: React.FC<AttendanceStatsProps> = ({
    selectedDate = new Date().toISOString().split('T')[0],
    showTrend = true,
    weeklyData
}) => {
    const { user } = useAuth();
    const navigate = useNavigate();

    // Fetch classes
    const { data: classes = [] } = useQuery({
        queryKey: ['classes', 'mine', user?.id],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('classes')
                .select('id, name')
                .eq('user_id', user!.id)
                .is('deleted_at', null)
                .eq('is_archived', false)
                .order('name');
            if (error) throw error;
            return data || [];
        },
        enabled: !!user,
    });

    // Fetch students
    const { data: students = [] } = useQuery({
        queryKey: ['students', user?.id],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('students')
                .select('id, class_id')
                .eq('user_id', user!.id)
                .is('deleted_at', null);
            if (error) throw error;
            return data || [];
        },
        enabled: !!user,
    });

    // Fetch attendance for selected date
    const { data: todayAttendance = [] } = useQuery({
        queryKey: ['attendance-stats', user?.id, selectedDate],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('attendance')
                .select('student_id, status')
                .eq('user_id', user!.id)
                .eq('date', selectedDate)
                .is('deleted_at', null);
            if (error) throw error;
            return data || [];
        },
        enabled: !!user,
    });

    // Fetch yesterday's attendance for trend comparison
    const yesterday = useMemo(() => {
        const d = new Date(selectedDate);
        d.setDate(d.getDate() - 1);
        return d.toISOString().split('T')[0];
    }, [selectedDate]);

    const { data: yesterdayAttendance = [] } = useQuery({
        queryKey: ['attendance-stats-yesterday', user?.id, yesterday],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('attendance')
                .select('student_id, status')
                .eq('user_id', user!.id)
                .eq('date', yesterday)
                .is('deleted_at', null);
            if (error) throw error;
            return data || [];
        },
        enabled: !!user && showTrend,
    });

    // Calculate stats per class
    const classStats: ClassStats[] = useMemo(() => {
        return classes.map(cls => {
            const classStudentIds = students
                .filter(s => s.class_id === cls.id)
                .map(s => s.id);

            const classAttendance = todayAttendance.filter(a =>
                classStudentIds.includes(a.student_id)
            );

            const hadir = classAttendance.filter(a => a.status === 'Hadir').length;
            const sakit = classAttendance.filter(a => a.status === 'Sakit').length;
            const izin = classAttendance.filter(a => a.status === 'Izin').length;
            const alpha = classAttendance.filter(a => a.status === 'Alpha').length;
            const total = classStudentIds.length;
            const percentage = total > 0 ? (hadir / total) * 100 : 0;

            // Calculate trend
            let trend: 'up' | 'down' | 'stable' = 'stable';
            if (showTrend && yesterdayAttendance.length > 0) {
                const yesterdayClassAttendance = yesterdayAttendance.filter(a =>
                    classStudentIds.includes(a.student_id)
                );
                const yesterdayHadir = yesterdayClassAttendance.filter(a => a.status === 'Hadir').length;
                const yesterdayTotal = classStudentIds.length;
                const yesterdayPercentage = yesterdayTotal > 0 ? (yesterdayHadir / yesterdayTotal) * 100 : 0;

                if (percentage > yesterdayPercentage + 5) trend = 'up';
                else if (percentage < yesterdayPercentage - 5) trend = 'down';
            }

            return {
                classId: cls.id,
                className: cls.name,
                hadir,
                sakit,
                izin,
                alpha,
                total,
                percentage,
                trend
            };
        }).filter(stat => stat.total > 0);
    }, [classes, students, todayAttendance, yesterdayAttendance, showTrend]);

    // Overall stats
    const overallStats = useMemo(() => {
        const totalHadir = classStats.reduce((sum, c) => sum + c.hadir, 0);
        const totalSakit = classStats.reduce((sum, c) => sum + c.sakit, 0);
        const totalIzin = classStats.reduce((sum, c) => sum + c.izin, 0);
        const totalAlpha = classStats.reduce((sum, c) => sum + c.alpha, 0);
        const total = classStats.reduce((sum, c) => sum + c.total, 0);
        const percentage = total > 0 ? (totalHadir / total) * 100 : 0;

        return { hadir: totalHadir, sakit: totalSakit, izin: totalIzin, alpha: totalAlpha, total, percentage };
    }, [classStats]);

    const formattedDate = new Date(selectedDate).toLocaleDateString('id-ID', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric'
    });

    if (classStats.length === 0) {
        return (
            <DashboardPanel className="flex flex-col h-full">
                <DashboardPanelContent className="p-6 flex-1">
                <div className="flex items-center gap-3 mb-4">
                    <div className="p-3 bg-emerald-100 dark:bg-emerald-900/30 rounded-lg">
                        <CalendarIcon className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
                    </div>
                    <div>
                        <h3 className="font-semibold text-slate-900 dark:text-white">Statistik Kehadiran</h3>
                        <p className="text-sm text-slate-500">{formattedDate}</p>
                    </div>
                </div>
                <EmptyState
                    icon={<CalendarIcon />}
                    title="Belum ada data absensi"
                    description="Isi absensi untuk mulai melihat ringkasan kehadiran."
                    actionLabel="Isi Absensi"
                    onAction={() => navigate('/absensi')}
                />
                </DashboardPanelContent>
            </DashboardPanel>
        );
    }

    return (
        <DashboardPanel className="flex flex-col h-full">
            <DashboardPanelContent className="p-6 flex-1">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                    <div className="p-3 bg-emerald-500 rounded-lg shadow-sm">
                        <CalendarIcon className="w-6 h-6 text-white" />
                    </div>
                    <div>
                        <h3 className="font-semibold text-lg text-slate-900 dark:text-white">Statistik Kehadiran</h3>
                        <p className="text-sm text-slate-500">{formattedDate}</p>
                    </div>
                </div>
                <div className="text-right">
                    <span className="text-3xl font-bold text-emerald-600 dark:text-emerald-400">
                        {overallStats.percentage.toFixed(0)}%
                    </span>
                    <p className="text-xs text-slate-500">Kehadiran</p>
                </div>
            </div>

            {/* Overall Stats - Responsive 2x2 on mobile, 4x1 on desktop */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 mb-6">
                <div className="flex flex-col items-center justify-center p-2.5 sm:p-3 min-h-[90px] sm:min-h-[100px] bg-emerald-50/80 dark:bg-emerald-900/20 rounded-xl border border-emerald-100/60 dark:border-emerald-800/30">
                    <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-gradient-to-br from-emerald-500 to-emerald-600 flex items-center justify-center mb-1.5 shadow-sm">
                        <CheckCircleIcon className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
                    </div>
                    <span className="text-2xl sm:text-3xl font-extrabold leading-none text-emerald-600 dark:text-emerald-400">{overallStats.hadir}</span>
                    <p className="text-xxs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mt-1">Hadir</p>
                </div>
                <div className="flex flex-col items-center justify-center p-2.5 sm:p-3 min-h-[90px] sm:min-h-[100px] bg-blue-50/80 dark:bg-blue-900/20 rounded-xl border border-blue-100/60 dark:border-blue-800/30">
                    <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-gradient-to-br from-blue-500 to-cyan-600 flex items-center justify-center mb-1.5 shadow-sm">
                        <AlertTriangleIcon className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
                    </div>
                    <span className="text-2xl sm:text-3xl font-extrabold leading-none text-blue-600 dark:text-blue-400">{overallStats.sakit}</span>
                    <p className="text-xxs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mt-1">Sakit</p>
                </div>
                <div className="flex flex-col items-center justify-center p-2.5 sm:p-3 min-h-[90px] sm:min-h-[100px] bg-amber-50/80 dark:bg-amber-900/20 rounded-xl border border-amber-100/60 dark:border-amber-800/30">
                    <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center mb-1.5 shadow-sm">
                        <UsersIcon className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
                    </div>
                    <span className="text-2xl sm:text-3xl font-extrabold leading-none text-amber-600 dark:text-amber-400">{overallStats.izin}</span>
                    <p className="text-xxs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mt-1">Izin</p>
                </div>
                <div className="flex flex-col items-center justify-center p-2.5 sm:p-3 min-h-[90px] sm:min-h-[100px] bg-rose-50/80 dark:bg-rose-900/20 rounded-xl border border-rose-100/60 dark:border-rose-800/30">
                    <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-gradient-to-br from-rose-500 to-red-600 flex items-center justify-center mb-1.5 shadow-sm">
                        <XCircleIcon className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
                    </div>
                    <span className="text-2xl sm:text-3xl font-extrabold leading-none text-rose-600 dark:text-rose-400">{overallStats.alpha}</span>
                    <p className="text-xxs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mt-1">Alpha</p>
                </div>
            </div>

            {/* Weekly Trend Chart */}
            {weeklyData && weeklyData.length > 0 && (
                <div className="mt-4 pt-5 border-t border-slate-200/60 dark:border-slate-800/60 flex flex-col flex-1">
                    <div className="flex items-center justify-between mb-2">
                        <div>
                            <h4 className="font-bold text-sm text-slate-800 dark:text-white flex items-center gap-2">
                                <Activity className="w-4 h-4 text-emerald-500" />
                                Tren Kehadiran Mingguan
                            </h4>
                            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">5 Hari Terakhir</p>
                        </div>
                    </div>
                    <div className="h-44 flex-1">
                        <WeeklyAttendanceChart data={weeklyData} />
                    </div>
                </div>
            )}
            </DashboardPanelContent>
        </DashboardPanel>
    );
};

export default AttendanceStatsWidget;