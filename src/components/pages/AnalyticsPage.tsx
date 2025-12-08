import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../../hooks/useAuth';
import { supabase } from '../../services/supabase';
import {
    TrendingUpIcon,
    UsersIcon,
    CalendarIcon,
    BarChart3Icon,
    PieChartIcon,
    ArrowUpIcon,
    ArrowDownIcon,
    MinusIcon,
    FilterIcon,
    DownloadIcon,
    RefreshCwIcon
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/Card';
import { Button } from '../ui/Button';
import { Select } from '../ui/Select';

// Types
interface AttendanceStats {
    total: number;
    hadir: number;
    izin: number;
    sakit: number;
    alpha: number;
    hadirRate: number;
}

interface ClassStats {
    id: string;
    name: string;
    studentCount: number;
    attendanceRate: number;
    avgGrade?: number;
}

interface DailyAttendance {
    date: string;
    hadir: number;
    izin: number;
    sakit: number;
    alpha: number;
    total: number;
}

const AnalyticsPage: React.FC = () => {
    const { user } = useAuth();
    const [dateRange, setDateRange] = useState<'7d' | '30d' | '90d' | 'all'>('30d');
    const [selectedClassId, setSelectedClassId] = useState<string>('all');

    // Fetch all data
    const { data, isLoading, refetch } = useQuery({
        queryKey: ['analyticsData', user?.id, dateRange, selectedClassId],
        queryFn: async () => {
            const now = new Date();
            let startDate: Date | null = null;

            switch (dateRange) {
                case '7d': startDate = new Date(now.setDate(now.getDate() - 7)); break;
                case '30d': startDate = new Date(now.setDate(now.getDate() - 30)); break;
                case '90d': startDate = new Date(now.setDate(now.getDate() - 90)); break;
                default: startDate = null;
            }

            // Fetch classes
            const { data: classes } = await supabase
                .from('classes')
                .select('id, name')
                .eq('user_id', user!.id);

            // Fetch students
            let studentsQuery = supabase
                .from('students')
                .select('id, name, class_id, gender')
                .eq('user_id', user!.id)
                .is('deleted_at', null);

            if (selectedClassId !== 'all') {
                studentsQuery = studentsQuery.eq('class_id', selectedClassId);
            }
            const { data: students } = await studentsQuery;

            // Fetch attendance
            let attendanceQuery = supabase
                .from('attendance')
                .select('*')
                .eq('user_id', user!.id);

            if (startDate) {
                attendanceQuery = attendanceQuery.gte('date', startDate.toISOString().split('T')[0]);
            }
            const { data: attendance } = await attendanceQuery;

            // Fetch tasks
            const { data: tasks } = await supabase
                .from('tasks')
                .select('*')
                .eq('user_id', user!.id);

            return { classes: classes || [], students: students || [], attendance: attendance || [], tasks: tasks || [] };
        },
        enabled: !!user,
    });

    const { classes = [], students = [], attendance = [], tasks = [] } = data || {};

    // Calculate attendance stats
    const attendanceStats = useMemo((): AttendanceStats => {
        const studentIds = new Set(students.map(s => s.id));
        const filtered = selectedClassId === 'all'
            ? attendance
            : attendance.filter(a => studentIds.has(a.student_id));

        const total = filtered.length;
        const hadir = filtered.filter(a => a.status === 'Hadir').length;
        const izin = filtered.filter(a => a.status === 'Izin').length;
        const sakit = filtered.filter(a => a.status === 'Sakit').length;
        const alpha = filtered.filter(a => a.status === 'Alpha').length;

        return {
            total,
            hadir,
            izin,
            sakit,
            alpha,
            hadirRate: total > 0 ? Math.round((hadir / total) * 100) : 0,
        };
    }, [attendance, students, selectedClassId]);

    // Calculate class stats
    const classStats = useMemo((): ClassStats[] => {
        return classes.map(cls => {
            const classStudents = students.filter(s => s.class_id === cls.id);
            const studentIds = new Set(classStudents.map(s => s.id));
            const classAttendance = attendance.filter(a => studentIds.has(a.student_id));

            const total = classAttendance.length;
            const hadir = classAttendance.filter(a => a.status === 'Hadir').length;

            return {
                id: cls.id,
                name: cls.name,
                studentCount: classStudents.length,
                attendanceRate: total > 0 ? Math.round((hadir / total) * 100) : 0,
            };
        }).sort((a, b) => b.attendanceRate - a.attendanceRate);
    }, [classes, students, attendance]);

    // Calculate daily attendance for chart
    const dailyAttendance = useMemo((): DailyAttendance[] => {
        const byDate = new Map<string, DailyAttendance>();
        const studentIds = new Set(students.map(s => s.id));

        attendance
            .filter(a => selectedClassId === 'all' || studentIds.has(a.student_id))
            .forEach(a => {
                const date = a.date;
                if (!byDate.has(date)) {
                    byDate.set(date, { date, hadir: 0, izin: 0, sakit: 0, alpha: 0, total: 0 });
                }
                const day = byDate.get(date)!;
                day.total++;
                if (a.status === 'Hadir') day.hadir++;
                else if (a.status === 'Izin') day.izin++;
                else if (a.status === 'Sakit') day.sakit++;
                else if (a.status === 'Alpha') day.alpha++;
            });

        return Array.from(byDate.values()).sort((a, b) => a.date.localeCompare(b.date)).slice(-30);
    }, [attendance, students, selectedClassId]);

    // Task stats
    const taskStats = useMemo(() => {
        const todo = tasks.filter(t => t.status === 'todo').length;
        const inProgress = tasks.filter(t => t.status === 'in_progress').length;
        const done = tasks.filter(t => t.status === 'done').length;
        const overdue = tasks.filter(t => t.status !== 'done' && t.due_date && new Date(t.due_date) < new Date()).length;

        return { todo, inProgress, done, overdue, total: tasks.length };
    }, [tasks]);

    // Gender distribution
    const genderStats = useMemo(() => {
        const male = students.filter(s => s.gender === 'Laki-laki').length;
        const female = students.filter(s => s.gender === 'Perempuan').length;
        return { male, female, total: students.length };
    }, [students]);

    const StatCard = ({
        title,
        value,
        subtitle,
        icon: Icon,
        trend,
        color = 'indigo'
    }: {
        title: string;
        value: string | number;
        subtitle?: string;
        icon: React.ElementType;
        trend?: 'up' | 'down' | 'neutral';
        color?: 'indigo' | 'green' | 'amber' | 'red' | 'blue';
    }) => {
        const colors = {
            indigo: 'from-indigo-500 to-purple-600',
            green: 'from-green-500 to-emerald-600',
            amber: 'from-amber-500 to-orange-600',
            red: 'from-red-500 to-rose-600',
            blue: 'from-blue-500 to-cyan-600',
        };

        return (
            <Card className="relative overflow-hidden bg-white dark:bg-slate-900 border-0 shadow-lg">
                <div className={`absolute top-0 right-0 w-32 h-32 bg-gradient-to-br ${colors[color]} opacity-10 rounded-full -translate-y-8 translate-x-8`} />
                <CardContent className="p-6">
                    <div className="flex items-start justify-between">
                        <div>
                            <p className="text-sm font-medium text-slate-500 dark:text-slate-400">{title}</p>
                            <p className="text-3xl font-bold text-slate-900 dark:text-white mt-1">{value}</p>
                            {subtitle && (
                                <div className="flex items-center gap-1 mt-2">
                                    {trend === 'up' && <ArrowUpIcon className="w-4 h-4 text-green-500" />}
                                    {trend === 'down' && <ArrowDownIcon className="w-4 h-4 text-red-500" />}
                                    {trend === 'neutral' && <MinusIcon className="w-4 h-4 text-slate-400" />}
                                    <span className={`text-sm ${trend === 'up' ? 'text-green-500' : trend === 'down' ? 'text-red-500' : 'text-slate-500'}`}>
                                        {subtitle}
                                    </span>
                                </div>
                            )}
                        </div>
                        <div className={`p-3 rounded-xl bg-gradient-to-br ${colors[color]}`}>
                            <Icon className="w-6 h-6 text-white" />
                        </div>
                    </div>
                </CardContent>
            </Card>
        );
    };

    const SimpleBarChart = ({ data, subtitle }: { data: DailyAttendance[]; subtitle?: string }) => {
        const maxTotal = Math.max(...data.map(d => d.total), 1);
        const chartHeight = 220;
        const barWidth = 12;
        const barGap = 6;

        // Calculate nice Y-axis intervals
        const yAxisSteps = 4;
        const stepValue = Math.ceil(maxTotal / yAxisSteps);
        const yAxisLabels = Array.from({ length: yAxisSteps + 1 }, (_, i) => stepValue * (yAxisSteps - i));

        // Show label every nth day based on data length
        const labelInterval = data.length > 20 ? 5 : data.length > 10 ? 3 : 2;

        // Animation state
        const [animated, setAnimated] = React.useState(false);
        React.useEffect(() => {
            const timer = setTimeout(() => setAnimated(true), 100);
            return () => clearTimeout(timer);
        }, []);

        return (
            <div className="relative">
                {/* Subtitle */}
                {subtitle && (
                    <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">{subtitle}</p>
                )}

                {/* Legend - Top Right */}
                <div className="absolute top-0 right-0 flex items-center gap-4 text-xs">
                    <div className="flex items-center gap-1.5">
                        <div className="w-2.5 h-2.5 rounded-full bg-gradient-to-r from-indigo-500 to-purple-500" />
                        <span className="text-slate-500 dark:text-slate-400">Hadir</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                        <div className="w-2.5 h-2.5 rounded-full bg-gradient-to-r from-orange-400 to-rose-400" />
                        <span className="text-slate-500 dark:text-slate-400">Tidak Hadir</span>
                    </div>
                </div>

                <div className="flex mt-8">
                    {/* Y-axis */}
                    <div className="flex flex-col justify-between pr-3 text-right" style={{ height: `${chartHeight}px` }}>
                        {yAxisLabels.map((val, i) => (
                            <span key={i} className="text-[10px] text-slate-500 dark:text-slate-400 leading-none">
                                {val}
                            </span>
                        ))}
                    </div>

                    {/* Chart Container */}
                    <div className="flex-1 relative">
                        {/* Grid Lines */}
                        <div className="absolute inset-0 flex flex-col justify-between pointer-events-none" style={{ height: `${chartHeight}px` }}>
                            {yAxisLabels.map((_, i) => (
                                <div
                                    key={i}
                                    className="w-full border-t border-slate-700/30 dark:border-slate-600/20"
                                    style={{ opacity: i === yAxisLabels.length - 1 ? 1 : 0.5 }}
                                />
                            ))}
                        </div>

                        {/* Bars Container */}
                        <div
                            className="flex items-end justify-between relative z-10 overflow-x-auto scrollbar-hide"
                            style={{ height: `${chartHeight}px`, gap: `${barGap}px` }}
                        >
                            {data.map((day, i) => {
                                const totalHeight = maxTotal > 0 ? (day.total / maxTotal) * chartHeight : 0;
                                const hadirHeight = day.total > 0 ? (day.hadir / day.total) * totalHeight : 0;
                                const tidakHadirHeight = totalHeight - hadirHeight;
                                const showLabel = i % labelInterval === 0 || i === data.length - 1;

                                return (
                                    <div
                                        key={i}
                                        className="flex flex-col items-center group relative"
                                        style={{ minWidth: `${barWidth}px` }}
                                    >
                                        {/* Bar container */}
                                        <div
                                            className="relative flex flex-col-reverse overflow-hidden transition-all duration-700 ease-out"
                                            style={{
                                                width: `${barWidth}px`,
                                                height: animated ? `${totalHeight}px` : '0px',
                                                borderRadius: '6px 6px 2px 2px',
                                            }}
                                        >
                                            {/* Hadir section */}
                                            <div
                                                className="w-full bg-gradient-to-t from-indigo-600 via-indigo-500 to-purple-400 transition-all duration-300 group-hover:from-indigo-500 group-hover:via-indigo-400 group-hover:to-purple-300 group-hover:shadow-lg group-hover:shadow-indigo-500/30"
                                                style={{ height: `${hadirHeight}px` }}
                                            />
                                            {/* Tidak hadir section */}
                                            {tidakHadirHeight > 0 && (
                                                <div
                                                    className="w-full bg-gradient-to-t from-orange-500 via-orange-400 to-rose-400 transition-all duration-300 group-hover:from-orange-400 group-hover:via-orange-300 group-hover:to-rose-300"
                                                    style={{ height: `${tidakHadirHeight}px` }}
                                                />
                                            )}
                                        </div>

                                        {/* Hover glow effect */}
                                        <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none">
                                            <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-8 h-full bg-gradient-to-t from-indigo-500/20 to-transparent blur-sm" />
                                        </div>

                                        {/* Tooltip */}
                                        <div className="absolute bottom-full mb-3 hidden group-hover:block z-30 pointer-events-none animate-fade-in">
                                            <div className="bg-slate-900/95 backdrop-blur-sm text-white text-xs p-4 rounded-2xl shadow-2xl border border-slate-700/50 min-w-[180px]">
                                                <p className="font-bold text-sm text-white mb-2">
                                                    {new Date(day.date).toLocaleDateString('id-ID', {
                                                        weekday: 'long',
                                                        day: 'numeric',
                                                        month: 'long',
                                                        year: 'numeric'
                                                    })}
                                                </p>
                                                <div className="space-y-1.5">
                                                    <div className="flex items-center justify-between">
                                                        <span className="flex items-center gap-2">
                                                            <span className="w-2 h-2 rounded-full bg-gradient-to-r from-indigo-500 to-purple-500" />
                                                            <span className="text-slate-300">Hadir</span>
                                                        </span>
                                                        <span className="font-bold text-green-400">{day.hadir} siswa</span>
                                                    </div>
                                                    <div className="flex items-center justify-between">
                                                        <span className="flex items-center gap-2">
                                                            <span className="w-2 h-2 rounded-full bg-blue-400" />
                                                            <span className="text-slate-300">Izin</span>
                                                        </span>
                                                        <span className="font-semibold text-blue-400">{day.izin}</span>
                                                    </div>
                                                    <div className="flex items-center justify-between">
                                                        <span className="flex items-center gap-2">
                                                            <span className="w-2 h-2 rounded-full bg-amber-400" />
                                                            <span className="text-slate-300">Sakit</span>
                                                        </span>
                                                        <span className="font-semibold text-amber-400">{day.sakit}</span>
                                                    </div>
                                                    <div className="flex items-center justify-between">
                                                        <span className="flex items-center gap-2">
                                                            <span className="w-2 h-2 rounded-full bg-rose-400" />
                                                            <span className="text-slate-300">Alpha</span>
                                                        </span>
                                                        <span className="font-semibold text-rose-400">{day.alpha}</span>
                                                    </div>
                                                </div>
                                                <div className="mt-3 pt-2 border-t border-slate-700/50 flex justify-between items-center">
                                                    <span className="text-slate-400">Total</span>
                                                    <span className="font-bold text-white text-sm">{day.total} siswa</span>
                                                </div>
                                                {/* Tooltip arrow */}
                                                <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-4 h-4 bg-slate-900/95 rotate-45 border-r border-b border-slate-700/50" />
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>

                        {/* X-axis labels */}
                        <div className="flex justify-between mt-3" style={{ paddingRight: `${barGap}px` }}>
                            {data.map((day, i) => {
                                const showLabel = i % labelInterval === 0 || i === data.length - 1;
                                return (
                                    <div
                                        key={i}
                                        className="flex-1 text-center"
                                        style={{ minWidth: `${barWidth}px` }}
                                    >
                                        {showLabel && (
                                            <span
                                                className="text-[10px] text-slate-500 dark:text-slate-400 whitespace-nowrap inline-block transform -rotate-30"
                                                style={{ transform: 'rotate(-30deg)', transformOrigin: 'center' }}
                                            >
                                                {new Date(day.date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })}
                                            </span>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>

                {/* Summary stats below chart */}
                <div className="grid grid-cols-4 gap-3 mt-6 pt-4 border-t border-slate-200 dark:border-slate-700/50">
                    <div className="text-center">
                        <p className="text-lg font-bold text-green-500">{data.reduce((sum, d) => sum + d.hadir, 0)}</p>
                        <p className="text-[10px] text-slate-500 uppercase tracking-wide">Total Hadir</p>
                    </div>
                    <div className="text-center">
                        <p className="text-lg font-bold text-blue-500">{data.reduce((sum, d) => sum + d.izin, 0)}</p>
                        <p className="text-[10px] text-slate-500 uppercase tracking-wide">Total Izin</p>
                    </div>
                    <div className="text-center">
                        <p className="text-lg font-bold text-amber-500">{data.reduce((sum, d) => sum + d.sakit, 0)}</p>
                        <p className="text-[10px] text-slate-500 uppercase tracking-wide">Total Sakit</p>
                    </div>
                    <div className="text-center">
                        <p className="text-lg font-bold text-rose-500">{data.reduce((sum, d) => sum + d.alpha, 0)}</p>
                        <p className="text-[10px] text-slate-500 uppercase tracking-wide">Total Alpha</p>
                    </div>
                </div>
            </div>
        );
    };

    const SimplePieChart = ({ data }: { data: { label: string; value: number; color: string }[] }) => {
        const total = data.reduce((sum, d) => sum + d.value, 0);
        const [hoveredIndex, setHoveredIndex] = React.useState<number | null>(null);

        // Center display
        const centerData = hoveredIndex !== null ? data[hoveredIndex] : null;
        const centerValue = centerData ? centerData.value : total;
        const centerLabel = centerData ? centerData.label : 'Total Kehadiran';
        const centerPercent = centerData && total > 0 ? ((centerData.value / total) * 100).toFixed(1) : null;

        // Build conic gradient
        let gradientParts: string[] = [];
        let currentPercent = 0;

        data.forEach((item) => {
            const percent = total > 0 ? (item.value / total) * 100 : 0;
            if (percent > 0) {
                gradientParts.push(`${item.color} ${currentPercent}% ${currentPercent + percent}%`);
                currentPercent += percent;
            }
        });

        const conicGradient = gradientParts.length > 0
            ? `conic-gradient(from 0deg, ${gradientParts.join(', ')})`
            : 'conic-gradient(from 0deg, #e2e8f0 0% 100%)';

        return (
            <div className="flex flex-col lg:flex-row items-center gap-8">
                {/* Donut Chart with conic-gradient */}
                <div className="relative">
                    {/* Outer glow */}
                    <div
                        className="absolute inset-0 rounded-full blur-2xl opacity-40"
                        style={{ background: conicGradient }}
                    />

                    {/* Main donut */}
                    <div
                        className="relative w-44 h-44 rounded-full flex items-center justify-center"
                        style={{
                            background: conicGradient,
                            boxShadow: '0 8px 32px rgba(0,0,0,0.2)',
                        }}
                    >
                        {/* Inner circle (creates the donut hole) */}
                        <div className="w-28 h-28 rounded-full bg-white dark:bg-slate-900 flex flex-col items-center justify-center shadow-inner">
                            <span
                                className="text-3xl font-bold transition-all duration-300 text-slate-900 dark:text-white"
                                style={hoveredIndex !== null ? { color: data[hoveredIndex].color } : {}}
                            >
                                {centerValue}
                            </span>
                            <span className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5 text-center px-2">
                                {centerLabel}
                            </span>
                            {centerPercent && (
                                <span
                                    className="text-xs font-bold mt-1 px-2 py-0.5 rounded-full"
                                    style={{
                                        backgroundColor: `${data[hoveredIndex!].color}20`,
                                        color: data[hoveredIndex!].color,
                                    }}
                                >
                                    {centerPercent}%
                                </span>
                            )}
                        </div>
                    </div>
                </div>

                {/* Legend */}
                <div className="flex-1 space-y-2">
                    <p className="text-xs text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-4">
                        Rincian Kehadiran
                    </p>
                    {data.map((item, i) => {
                        const percentage = total > 0 ? ((item.value / total) * 100).toFixed(1) : '0';
                        const isHovered = hoveredIndex === i;

                        return (
                            <div
                                key={i}
                                className={`flex items-center gap-4 p-3 rounded-xl transition-all duration-300 cursor-pointer border ${isHovered
                                        ? 'bg-slate-100 dark:bg-slate-800 scale-[1.02] border-slate-200 dark:border-slate-700'
                                        : 'border-transparent hover:bg-slate-50 dark:hover:bg-slate-800/50'
                                    }`}
                                onMouseEnter={() => setHoveredIndex(i)}
                                onMouseLeave={() => setHoveredIndex(null)}
                            >
                                <div
                                    className={`w-4 h-4 rounded-full transition-all duration-300 flex-shrink-0 ${isHovered ? 'scale-125' : ''
                                        }`}
                                    style={{
                                        backgroundColor: item.color,
                                        boxShadow: isHovered ? `0 0 12px ${item.color}` : 'none',
                                    }}
                                />
                                <span className={`flex-1 text-sm transition-colors ${isHovered
                                        ? 'text-slate-900 dark:text-white font-semibold'
                                        : 'text-slate-600 dark:text-slate-400'
                                    }`}>
                                    {item.label}
                                </span>
                                <span className={`text-xl font-bold transition-all duration-300 ${isHovered ? 'scale-110' : ''
                                    }`} style={{ color: isHovered ? item.color : undefined }}>
                                    {item.value}
                                </span>
                                <span
                                    className={`text-xs font-semibold px-2.5 py-1 rounded-full transition-all ${isHovered ? 'scale-105' : ''
                                        }`}
                                    style={{
                                        backgroundColor: `${item.color}20`,
                                        color: item.color,
                                    }}
                                >
                                    {percentage}%
                                </span>
                            </div>
                        );
                    })}

                    <div className="mt-4 pt-4 border-t border-slate-200 dark:border-slate-700">
                        <div className="flex items-center justify-between text-sm">
                            <span className="text-slate-500 dark:text-slate-400">Total Data</span>
                            <span className="font-bold text-slate-900 dark:text-white text-lg">{total} catatan</span>
                        </div>
                    </div>
                </div>
            </div>
        );
    };

    if (isLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <RefreshCwIcon className="w-8 h-8 animate-spin text-indigo-600" />
            </div>
        );
    }

    return (
        <div className="min-h-screen p-4 md:p-8 space-y-6 animate-fade-in">
            {/* Header */}
            <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl md:text-4xl font-bold text-slate-900 dark:text-white">
                        Analytics Dashboard
                    </h1>
                    <p className="text-slate-500 dark:text-slate-400 mt-1">
                        Statistik dan analisis data siswa, absensi, dan tugas
                    </p>
                </div>
                <div className="flex items-center gap-3">
                    <Select
                        value={selectedClassId}
                        onChange={(e) => setSelectedClassId(e.target.value)}
                        className="min-w-[150px]"
                    >
                        <option value="all">Semua Kelas</option>
                        {classes.map(cls => (
                            <option key={cls.id} value={cls.id}>{cls.name}</option>
                        ))}
                    </Select>
                    <Select
                        value={dateRange}
                        onChange={(e) => setDateRange(e.target.value as any)}
                        className="min-w-[120px]"
                    >
                        <option value="7d">7 Hari</option>
                        <option value="30d">30 Hari</option>
                        <option value="90d">90 Hari</option>
                        <option value="all">Semua</option>
                    </Select>
                    <Button variant="outline" size="sm" onClick={() => refetch()}>
                        <RefreshCwIcon className="w-4 h-4" />
                    </Button>
                </div>
            </header>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard
                    title="Total Siswa"
                    value={students.length}
                    subtitle={`${genderStats.male} Laki-laki, ${genderStats.female} Perempuan`}
                    icon={UsersIcon}
                    color="indigo"
                />
                <StatCard
                    title="Tingkat Kehadiran"
                    value={`${attendanceStats.hadirRate}%`}
                    subtitle={`${attendanceStats.hadir} dari ${attendanceStats.total} catatan`}
                    icon={CalendarIcon}
                    trend={attendanceStats.hadirRate >= 80 ? 'up' : attendanceStats.hadirRate >= 60 ? 'neutral' : 'down'}
                    color="green"
                />
                <StatCard
                    title="Total Kelas"
                    value={classes.length}
                    subtitle="Kelas aktif"
                    icon={BarChart3Icon}
                    color="blue"
                />
                <StatCard
                    title="Tugas Selesai"
                    value={`${taskStats.done}/${taskStats.total}`}
                    subtitle={taskStats.overdue > 0 ? `${taskStats.overdue} terlambat` : 'Semua on track'}
                    icon={TrendingUpIcon}
                    trend={taskStats.overdue > 0 ? 'down' : 'up'}
                    color={taskStats.overdue > 0 ? 'amber' : 'green'}
                />
            </div>

            {/* Charts Row */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Attendance Trend */}
                <Card className="bg-white dark:bg-slate-900 border-0 shadow-lg">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <BarChart3Icon className="w-5 h-5 text-indigo-600" />
                            Tren Kehadiran ({dateRange === 'all' ? 'Semua' : dateRange.replace('d', ' Hari')})
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        {dailyAttendance.length > 0 ? (
                            <SimpleBarChart
                                data={dailyAttendance}
                                subtitle={`Data kehadiran ${selectedClassId === 'all' ? 'semua kelas' : classes.find(c => c.id === selectedClassId)?.name || ''} – ${new Date().toLocaleDateString('id-ID', { month: 'long', year: 'numeric' })}`}
                            />
                        ) : (
                            <div className="h-32 flex items-center justify-center text-slate-500">
                                Tidak ada data kehadiran
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* Attendance Distribution */}
                <Card className="bg-white dark:bg-slate-900 border-0 shadow-lg">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <PieChartIcon className="w-5 h-5 text-indigo-600" />
                            Distribusi Kehadiran
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <SimplePieChart
                            data={[
                                { label: 'Hadir', value: attendanceStats.hadir, color: '#22c55e' },
                                { label: 'Izin', value: attendanceStats.izin, color: '#3b82f6' },
                                { label: 'Sakit', value: attendanceStats.sakit, color: '#f59e0b' },
                                { label: 'Alpha', value: attendanceStats.alpha, color: '#ef4444' },
                            ]}
                        />
                    </CardContent>
                </Card>
            </div>

            {/* Class Comparison */}
            <Card className="bg-white dark:bg-slate-900 border-0 shadow-lg">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <UsersIcon className="w-5 h-5 text-indigo-600" />
                        Perbandingan Kelas
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="space-y-4">
                        {classStats.map((cls, index) => (
                            <div key={cls.id} className="flex items-center gap-4">
                                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white text-sm font-bold">
                                    {index + 1}
                                </div>
                                <div className="flex-1">
                                    <div className="flex items-center justify-between mb-1">
                                        <span className="font-medium text-slate-900 dark:text-white">{cls.name}</span>
                                        <span className="text-sm text-slate-500">{cls.studentCount} siswa</span>
                                    </div>
                                    <div className="h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                                        <div
                                            className={`h-full rounded-full transition-all duration-500 ${cls.attendanceRate >= 80 ? 'bg-green-500' :
                                                cls.attendanceRate >= 60 ? 'bg-amber-500' : 'bg-red-500'
                                                }`}
                                            style={{ width: `${cls.attendanceRate}%` }}
                                        />
                                    </div>
                                </div>
                                <span className={`text-lg font-bold ${cls.attendanceRate >= 80 ? 'text-green-500' :
                                    cls.attendanceRate >= 60 ? 'text-amber-500' : 'text-red-500'
                                    }`}>
                                    {cls.attendanceRate}%
                                </span>
                            </div>
                        ))}
                        {classStats.length === 0 && (
                            <div className="text-center py-8 text-slate-500">
                                Tidak ada data kelas
                            </div>
                        )}
                    </div>
                </CardContent>
            </Card>

            {/* Task Overview */}
            <Card className="bg-white dark:bg-slate-900 border-0 shadow-lg">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <TrendingUpIcon className="w-5 h-5 text-indigo-600" />
                        Status Tugas
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                        <div className="p-4 bg-slate-100 dark:bg-slate-800 rounded-xl text-center">
                            <p className="text-3xl font-bold text-slate-700 dark:text-slate-300">{taskStats.todo}</p>
                            <p className="text-sm text-slate-500">Belum Dikerjakan</p>
                        </div>
                        <div className="p-4 bg-blue-100 dark:bg-blue-900/30 rounded-xl text-center">
                            <p className="text-3xl font-bold text-blue-600 dark:text-blue-400">{taskStats.inProgress}</p>
                            <p className="text-sm text-blue-600 dark:text-blue-400">Sedang Dikerjakan</p>
                        </div>
                        <div className="p-4 bg-green-100 dark:bg-green-900/30 rounded-xl text-center">
                            <p className="text-3xl font-bold text-green-600 dark:text-green-400">{taskStats.done}</p>
                            <p className="text-sm text-green-600 dark:text-green-400">Selesai</p>
                        </div>
                        <div className="p-4 bg-red-100 dark:bg-red-900/30 rounded-xl text-center">
                            <p className="text-3xl font-bold text-red-600 dark:text-red-400">{taskStats.overdue}</p>
                            <p className="text-sm text-red-600 dark:text-red-400">Terlambat</p>
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
};

export default AnalyticsPage;
