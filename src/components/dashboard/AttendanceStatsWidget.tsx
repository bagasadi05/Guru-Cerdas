import React, { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '../../services/supabase';
import { useAuth } from '../../hooks/useAuth';
import {
    UsersIcon,
    CheckCircleIcon,
    XCircleIcon,
    AlertTriangleIcon,
    TrendingUpIcon,
    TrendingDownIcon,
    CalendarIcon,
    Activity
} from 'lucide-react';
import WeeklyAttendanceChart from './WeeklyAttendanceChart';

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

    // Fetch classes
    const { data: classes = [] } = useQuery({
        queryKey: ['classes', user?.id],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('classes')
                .select('id, name')
                .eq('user_id', user!.id)
                .is('deleted_at', null)
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
                .eq('date', selectedDate);
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
                .eq('date', yesterday);
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
            const total = classAttendance.length;
            const percentage = total > 0 ? (hadir / total) * 100 : 0;

            // Calculate trend
            let trend: 'up' | 'down' | 'stable' = 'stable';
            if (showTrend && yesterdayAttendance.length > 0) {
                const yesterdayClassAttendance = yesterdayAttendance.filter(a =>
                    classStudentIds.includes(a.student_id)
                );
                const yesterdayHadir = yesterdayClassAttendance.filter(a => a.status === 'Hadir').length;
                const yesterdayTotal = yesterdayClassAttendance.length;
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
        const total = totalHadir + totalSakit + totalIzin + totalAlpha;
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
            <div className="glass-card p-6 rounded-2xl">
                <div className="flex items-center gap-3 mb-4">
                    <div className="p-3 bg-indigo-100 dark:bg-indigo-900/30 rounded-xl">
                        <CalendarIcon className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
                    </div>
                    <div>
                        <h3 className="font-bold text-slate-800 dark:text-white">Statistik Kehadiran</h3>
                        <p className="text-sm text-slate-500">{formattedDate}</p>
                    </div>
                </div>
                <p className="text-center text-slate-500 dark:text-slate-400 py-8">
                    Belum ada data absensi untuk tanggal ini.
                </p>
            </div>
        );
    }

    return (
        <div className="glass-card p-6 rounded-2xl">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                    <div className="p-3 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl shadow-lg shadow-indigo-500/30">
                        <CalendarIcon className="w-6 h-6 text-white" />
                    </div>
                    <div>
                        <h3 className="font-bold text-lg text-slate-800 dark:text-white">Statistik Kehadiran</h3>
                        <p className="text-sm text-slate-500">{formattedDate}</p>
                    </div>
                </div>
                <div className="text-right">
                    <span className="text-3xl font-bold text-indigo-600 dark:text-indigo-400">
                        {overallStats.percentage.toFixed(0)}%
                    </span>
                    <p className="text-xs text-slate-500">Kehadiran</p>
                </div>
            </div>

            {/* Overall Stats */}
            <div className="grid grid-cols-4 gap-2 mb-6">
                <div className="flex flex-col items-center justify-center p-3 min-h-[100px] bg-emerald-50 dark:bg-emerald-900/20 rounded-xl">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-emerald-500 to-green-600 flex items-center justify-center mb-2 shadow-lg">
                        <CheckCircleIcon className="w-5 h-5 text-white" />
                    </div>
                    <span className="text-[28px] font-extrabold leading-none text-emerald-600 dark:text-emerald-400">{overallStats.hadir}</span>
                    <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mt-1">Hadir</p>
                </div>
                <div className="flex flex-col items-center justify-center p-3 min-h-[100px] bg-amber-50 dark:bg-amber-900/20 rounded-xl">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center mb-2 shadow-lg">
                        <AlertTriangleIcon className="w-5 h-5 text-white" />
                    </div>
                    <span className="text-[28px] font-extrabold leading-none text-amber-600 dark:text-amber-400">{overallStats.sakit}</span>
                    <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mt-1">Sakit</p>
                </div>
                <div className="flex flex-col items-center justify-center p-3 min-h-[100px] bg-blue-50 dark:bg-blue-900/20 rounded-xl">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-cyan-600 flex items-center justify-center mb-2 shadow-lg">
                        <UsersIcon className="w-5 h-5 text-white" />
                    </div>
                    <span className="text-[28px] font-extrabold leading-none text-blue-600 dark:text-blue-400">{overallStats.izin}</span>
                    <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mt-1">Izin</p>
                </div>
                <div className="flex flex-col items-center justify-center p-3 min-h-[100px] bg-rose-50 dark:bg-rose-900/20 rounded-xl">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-rose-500 to-red-600 flex items-center justify-center mb-2 shadow-lg">
                        <XCircleIcon className="w-5 h-5 text-white" />
                    </div>
                    <span className="text-[28px] font-extrabold leading-none text-rose-600 dark:text-rose-400">{overallStats.alpha}</span>
                    <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mt-1">Alpha</p>
                </div>
            </div>

            {/* Per Class Stats */}
            <div className="space-y-3">
                <h4 className="text-sm font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wider">Per Kelas</h4>
                {classStats.map(stat => (
                    <div
                        key={stat.classId}
                        className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                    >
                        <div className="flex items-center gap-3">
                            <span className="font-bold text-slate-800 dark:text-white">{stat.className}</span>
                            {showTrend && stat.trend !== 'stable' && (
                                <span className={`flex items-center gap-1 text-xs px-2 py-0.5 rounded-full ${stat.trend === 'up'
                                    ? 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400'
                                    : 'bg-rose-100 text-rose-600 dark:bg-rose-900/30 dark:text-rose-400'
                                    }`}>
                                    {stat.trend === 'up' ? <TrendingUpIcon className="w-3 h-3" /> : <TrendingDownIcon className="w-3 h-3" />}
                                </span>
                            )}
                        </div>
                        <div className="flex items-center gap-4">
                            <div className="flex items-center gap-2 text-xs">
                                <span className="text-emerald-600 dark:text-emerald-400 font-medium">{stat.hadir}H</span>
                                <span className="text-amber-600 dark:text-amber-400">{stat.sakit}S</span>
                                <span className="text-blue-600 dark:text-blue-400">{stat.izin}I</span>
                                <span className="text-rose-600 dark:text-rose-400">{stat.alpha}A</span>
                            </div>
                            <div className="w-20">
                                <div className="h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                                    <div
                                        className={`h-full rounded-full transition-all duration-500 ${stat.percentage >= 80 ? 'bg-emerald-500' :
                                            stat.percentage >= 60 ? 'bg-amber-500' : 'bg-rose-500'
                                            }`}
                                        style={{ width: `${stat.percentage}%` }}
                                    />
                                </div>
                            </div>
                            <span className={`font-bold text-sm w-12 text-right ${stat.percentage >= 80 ? 'text-emerald-600 dark:text-emerald-400' :
                                stat.percentage >= 60 ? 'text-amber-600 dark:text-amber-400' : 'text-rose-600 dark:text-rose-400'
                                }`}>
                                {stat.percentage.toFixed(0)}%
                            </span>
                        </div>
                    </div>
                ))}
            </div>


            {/* Weekly Trend Chart */}
            {
                weeklyData && weeklyData.length > 0 && (
                    <div className="mt-8 pt-6 border-t border-slate-100 dark:border-white/5">
                        <div className="flex items-center justify-between mb-4">
                            <div>
                                <h4 className="font-bold text-slate-800 dark:text-white flex items-center gap-2">
                                    <Activity className="w-4 h-4 text-indigo-500" />
                                    Tren Kehadiran Mingguan
                                </h4>
                                <p className="text-xs text-slate-500 mt-1">5 Hari Terakhir</p>
                            </div>
                        </div>
                        <div className="h-40">
                            <WeeklyAttendanceChart data={weeklyData} />
                        </div>
                    </div>
                )
            }
        </div >
    );
};

export default AttendanceStatsWidget;
