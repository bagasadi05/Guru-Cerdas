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
    Activity,
    TrendingUp,
    TrendingDown,
    Minus,
    Award,
    ChevronRight,
    School
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

    // Calculate weekly summary metrics (average on school days & top day)
    const weeklySummary = useMemo(() => {
        if (!weeklyData || weeklyData.length === 0) return null;
        const activeDays = weeklyData.filter(d => {
            const isWeekend = d.day.toLowerCase().startsWith('sab') || d.day.toLowerCase().startsWith('min');
            return !isWeekend || d.present_percentage > 0;
        });
        if (activeDays.length === 0) return null;

        const avg = activeDays.reduce((acc, curr) => acc + curr.present_percentage, 0) / activeDays.length;
        const best = [...activeDays].sort((a, b) => b.present_percentage - a.present_percentage)[0];

        return {
            average: Math.round(avg),
            bestDay: best ? `${best.day.slice(0, 3)} (${Math.round(best.present_percentage)}%)` : '-',
            activeCount: activeDays.length
        };
    }, [weeklyData]);

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
            <DashboardPanelContent className="p-5 sm:p-6 flex-1 flex flex-col justify-between">
                <div>
                    {/* Header */}
                    <div className="flex items-center justify-between mb-5">
                        <div className="flex items-center gap-3">
                            <div className="p-2.5 sm:p-3 bg-emerald-500 rounded-xl shadow-sm">
                                <CalendarIcon className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
                            </div>
                            <div>
                                <h3 className="font-semibold text-base sm:text-lg text-slate-900 dark:text-white">Statistik Kehadiran</h3>
                                <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">{formattedDate}</p>
                            </div>
                        </div>
                        <div className="text-right">
                            <span className="text-2xl sm:text-3xl font-bold text-emerald-600 dark:text-emerald-400">
                                {overallStats.percentage.toFixed(0)}%
                            </span>
                            <p className="text-xs text-slate-500 dark:text-slate-400">Hari Ini</p>
                        </div>
                    </div>

                    {/* Overall Stats - Responsive 2x2 on mobile, 4x1 on desktop */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-2.5 mb-5">
                        <div className="flex flex-col items-center justify-center p-2.5 min-h-[85px] sm:min-h-[92px] bg-emerald-50/80 dark:bg-emerald-900/20 rounded-xl border border-emerald-100/60 dark:border-emerald-800/30">
                            <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-gradient-to-br from-emerald-500 to-emerald-600 flex items-center justify-center mb-1 shadow-sm">
                                <CheckCircleIcon className="w-4 h-4 text-white" />
                            </div>
                            <span className="text-xl sm:text-2xl font-extrabold leading-none text-emerald-600 dark:text-emerald-400">{overallStats.hadir}</span>
                            <p className="text-xxs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mt-1">Hadir</p>
                        </div>
                        <div className="flex flex-col items-center justify-center p-2.5 min-h-[85px] sm:min-h-[92px] bg-blue-50/80 dark:bg-blue-900/20 rounded-xl border border-blue-100/60 dark:border-blue-800/30">
                            <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-gradient-to-br from-blue-500 to-cyan-600 flex items-center justify-center mb-1 shadow-sm">
                                <AlertTriangleIcon className="w-4 h-4 text-white" />
                            </div>
                            <span className="text-xl sm:text-2xl font-extrabold leading-none text-blue-600 dark:text-blue-400">{overallStats.sakit}</span>
                            <p className="text-xxs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mt-1">Sakit</p>
                        </div>
                        <div className="flex flex-col items-center justify-center p-2.5 min-h-[85px] sm:min-h-[92px] bg-amber-50/80 dark:bg-amber-900/20 rounded-xl border border-amber-100/60 dark:border-amber-800/30">
                            <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center mb-1 shadow-sm">
                                <UsersIcon className="w-4 h-4 text-white" />
                            </div>
                            <span className="text-xl sm:text-2xl font-extrabold leading-none text-amber-600 dark:text-amber-400">{overallStats.izin}</span>
                            <p className="text-xxs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mt-1">Izin</p>
                        </div>
                        <div className="flex flex-col items-center justify-center p-2.5 min-h-[85px] sm:min-h-[92px] bg-rose-50/80 dark:bg-rose-900/20 rounded-xl border border-rose-100/60 dark:border-rose-800/30">
                            <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-gradient-to-br from-rose-500 to-red-600 flex items-center justify-center mb-1 shadow-sm">
                                <XCircleIcon className="w-4 h-4 text-white" />
                            </div>
                            <span className="text-xl sm:text-2xl font-extrabold leading-none text-rose-600 dark:text-rose-400">{overallStats.alpha}</span>
                            <p className="text-xxs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mt-1">Alpha</p>
                        </div>
                    </div>

                    {/* Weekly Trend Chart & Summary Highlights */}
                    {weeklyData && weeklyData.length > 0 && (
                        <div className="pt-4 border-t border-slate-200/70 dark:border-slate-800/70">
                            <div className="flex items-center justify-between mb-2">
                                <div>
                                    <h4 className="font-bold text-sm text-slate-800 dark:text-white flex items-center gap-2">
                                        <Activity className="w-4 h-4 text-emerald-500" />
                                        Tren Kehadiran Mingguan
                                    </h4>
                                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">5 Hari Terakhir</p>
                                </div>
                            </div>

                            {/* Chart */}
                            <div className="w-full">
                                <WeeklyAttendanceChart data={weeklyData} />
                            </div>

                            {/* Weekly KPIs */}
                            {weeklySummary && (
                                <div className="grid grid-cols-2 gap-2 mt-3 pt-3 border-t border-dashed border-slate-200/80 dark:border-slate-800/80">
                                    <div className="flex items-center gap-2.5 p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800">
                                        <div className="p-2 rounded-lg bg-emerald-100 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400">
                                            <TrendingUp className="w-4 h-4" />
                                        </div>
                                        <div>
                                            <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-tight">Rata-rata 5 Hari</p>
                                            <p className="text-sm font-bold text-slate-800 dark:text-white">{weeklySummary.average}%</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2.5 p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800">
                                        <div className="p-2 rounded-lg bg-amber-100 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400">
                                            <Award className="w-4 h-4" />
                                        </div>
                                        <div>
                                            <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-tight">Hari Tertinggi</p>
                                            <p className="text-sm font-bold text-slate-800 dark:text-white truncate max-w-[110px] sm:max-w-none">{weeklySummary.bestDay}</p>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Per-Class Breakdown Section */}
                    {classStats.length > 0 && (
                        <div className="mt-4 pt-4 border-t border-slate-200/70 dark:border-slate-800/70">
                            <div className="flex items-center justify-between mb-2.5">
                                <div className="flex items-center gap-2">
                                    <School className="w-4 h-4 text-emerald-500" />
                                    <h4 className="font-bold text-sm text-slate-800 dark:text-white">
                                        Kehadiran per Kelas Hari Ini
                                    </h4>
                                </div>
                                <span className="text-xs px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 font-medium">
                                    {classStats.length} Kelas
                                </span>
                            </div>

                            {/* Class List with smooth scroll if many classes */}
                            <div className="space-y-2 max-h-52 overflow-y-auto pr-1">
                                {classStats.map((item) => {
                                    const isHigh = item.percentage >= 85;
                                    const isMedium = item.percentage >= 70;
                                    const badgeClass = isHigh
                                        ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400 border-emerald-200/60 dark:border-emerald-800/40'
                                        : isMedium
                                        ? 'bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400 border-amber-200/60 dark:border-amber-800/40'
                                        : 'bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-400 border-rose-200/60 dark:border-rose-800/40';

                                    return (
                                        <div
                                            key={item.classId}
                                            className="p-2.5 rounded-xl bg-slate-50/70 dark:bg-slate-800/30 border border-slate-100 dark:border-slate-800/60 flex items-center justify-between gap-3 hover:border-slate-200 dark:hover:border-slate-700 transition-colors"
                                        >
                                            <div className="min-w-0 flex-1">
                                                <div className="flex items-center justify-between mb-1">
                                                    <span className="text-xs font-semibold text-slate-800 dark:text-slate-200 truncate">
                                                        {item.className}
                                                    </span>
                                                    <span className="text-[11px] text-slate-500 dark:text-slate-400">
                                                        {item.hadir}/{item.total} Siswa
                                                    </span>
                                                </div>
                                                {/* Mini progress bar */}
                                                <div className="w-full h-1.5 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                                                    <div
                                                        className={`h-full rounded-full transition-all duration-500 ${
                                                            isHigh
                                                                ? 'bg-emerald-500'
                                                                : isMedium
                                                                ? 'bg-amber-500'
                                                                : 'bg-rose-500'
                                                        }`}
                                                        style={{ width: `${Math.min(item.percentage, 100)}%` }}
                                                    />
                                                </div>
                                            </div>

                                            {/* Percentage Pill & Trend */}
                                            <div className="flex items-center gap-1.5 flex-shrink-0">
                                                <span className={`text-xs font-bold px-2 py-0.5 rounded-lg border ${badgeClass}`}>
                                                    {Math.round(item.percentage)}%
                                                </span>
                                                {showTrend && (
                                                    <span className="text-slate-400 dark:text-slate-500">
                                                        {item.trend === 'up' && <TrendingUp className="w-3.5 h-3.5 text-emerald-500" />}
                                                        {item.trend === 'down' && <TrendingDown className="w-3.5 h-3.5 text-rose-500" />}
                                                        {item.trend === 'stable' && <Minus className="w-3.5 h-3.5 text-slate-400" />}
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer Action Button */}
                <button
                    onClick={() => navigate('/absensi')}
                    className="w-full mt-4 py-2.5 px-3 rounded-xl border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/60 text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center justify-center gap-1.5 transition-all group active:scale-[0.99]"
                >
                    <span>Buka Rekap & Catat Absensi</span>
                    <ChevronRight className="w-4 h-4 text-slate-400 group-hover:translate-x-0.5 transition-transform" />
                </button>
            </DashboardPanelContent>
        </DashboardPanel>
    );
};

export default AttendanceStatsWidget;