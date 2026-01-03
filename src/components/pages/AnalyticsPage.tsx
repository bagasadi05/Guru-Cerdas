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
    RefreshCwIcon,
    HelpCircle,
    ExternalLink
} from 'lucide-react';
import { Database } from '../../services/database.types';
import { GraduationCapIcon, BookOpenIcon, AlertCircleIcon } from '../Icons';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/Card';
import { Button } from '../ui/Button';
import { Select } from '../ui/Select';
import AnalyticsPageSkeleton from '../skeletons/AnalyticsPageSkeleton';
import { useTour } from '../OnboardingHelp';

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


type Student = Database['public']['Tables']['students']['Row'];

interface AtRiskItem {
    student: Student;
    reason: 'attendance' | 'academic' | 'both';
    details: string;
}

// type AcademicRecord = Database['public']['Tables']['academic_records']['Row'];

interface GradeDistribution {
    label: string;
    range: string;
    count: number;
    color: string;
    percentage: number;
}

const AnalyticsPage: React.FC = () => {
    const { user } = useAuth();

    // Onboarding Tour
    const { start } = useTour();

    React.useEffect(() => {
        const steps = [
            {
                id: 'analytics-intro',
                target: '#tour-stat-cards',
                title: 'Dashboard Analitik Baru',
                content: 'Tampilan ringkas untuk memantau kehadiran, siswa, dan tugas dengan penjelas otomatis.',
                position: 'bottom' as const
            },
            {
                id: 'analytics-charts',
                target: '#tour-charts',
                title: 'Grafik & Laporan',
                content: 'Lihat tren kehadiran 30 hari terakhir dan rincian lengkapnya di sini.',
                position: 'top' as const
            },
            {
                id: 'help-center',
                target: '#tour-help-button',
                title: 'Pusat Bantuan',
                content: 'Bingung cara pakai? Klik tombol ini untuk melihat panduan lengkap dengan gambar.',
                position: 'left' as const
            }
        ];
        // Short delay to ensure elements are rendered
        const timer = setTimeout(() => start(steps), 1000);
        return () => clearTimeout(timer);
    }, [start]);

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
            const { data: studentsData } = await studentsQuery;
            const students = (studentsData as unknown as Student[]) || [];

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

            // Fetch academic records
            const { data: academicRecords } = await supabase
                .from('academic_records')
                .select('*')
                .eq('user_id', user!.id);

            return { classes: classes || [], students: students || [], attendance: attendance || [], tasks: tasks || [], academicRecords: academicRecords || [] };
        },
        enabled: !!user,
    });

    const { classes = [], tasks = [] } = data || {};
    const students = useMemo(() => data?.students || [], [data?.students]);
    const attendance = useMemo(() => data?.attendance || [], [data?.attendance]);
    const academicRecords = useMemo(() => data?.academicRecords || [], [data?.academicRecords]);

    // Calculate grade stats
    const gradeStats = useMemo(() => {
        const studentIds = new Set(students.map(s => s.id));
        const filteredRecords = selectedClassId === 'all'
            ? academicRecords
            : academicRecords.filter(r => studentIds.has(r.student_id));

        const distribution: GradeDistribution[] = [
            { label: 'A', range: '90-100', count: 0, color: '#22c55e', percentage: 0 },
            { label: 'B', range: '80-89', count: 0, color: '#3b82f6', percentage: 0 },
            { label: 'C', range: '70-79', count: 0, color: '#eab308', percentage: 0 },
            { label: 'D', range: '60-69', count: 0, color: '#f97316', percentage: 0 },
            { label: 'E', range: '<60', count: 0, color: '#ef4444', percentage: 0 },
        ];

        // Group by average score per student
        const studentAverages = new Map<string, { total: number; count: number }>();

        filteredRecords.forEach(r => {
            if (!studentIds.has(r.student_id)) return;
            const current = studentAverages.get(r.student_id) || { total: 0, count: 0 };
            studentAverages.set(r.student_id, {
                total: current.total + r.score,
                count: current.count + 1
            });
        });

        let totalStudentsWithGrades = 0;
        let totalSum = 0;

        studentAverages.forEach(avg => {
            const finalScore = avg.total / avg.count;
            totalSum += finalScore;
            totalStudentsWithGrades++;

            if (finalScore >= 90) distribution[0].count++;
            else if (finalScore >= 80) distribution[1].count++;
            else if (finalScore >= 70) distribution[2].count++;
            else if (finalScore >= 60) distribution[3].count++;
            else distribution[4].count++;
        });

        // Calculate percentages
        distribution.forEach(d => {
            d.percentage = totalStudentsWithGrades > 0
                ? Math.round((d.count / totalStudentsWithGrades) * 100)
                : 0;
        });

        const overallAverage = totalStudentsWithGrades > 0
            ? Math.round(totalSum / totalStudentsWithGrades)
            : 0;

        return { distribution, overallAverage, totalStudentsWithGrades };
    }, [academicRecords, students, selectedClassId]);

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

    // Calculate At Risk Students
    const atRiskStudents = useMemo(() => {
        const risks: AtRiskItem[] = [];

        // Helper to get student grade
        const getStudentAvg = (studentId: string) => {
            const records = academicRecords.filter(r => r.student_id === studentId);
            if (records.length === 0) return null;
            return records.reduce((sum, r) => sum + r.score, 0) / records.length;
        };

        // Helper to get student attendance
        const getStudentAttendance = (studentId: string) => {
            const records = attendance.filter(a => a.student_id === studentId);
            if (records.length === 0) return null;
            const hadir = records.filter(r => r.status === 'Hadir').length;
            return (hadir / records.length) * 100;
        };

        students.forEach(student => {
            if (selectedClassId !== 'all' && student.class_id !== selectedClassId) return;

            const avg = getStudentAvg(student.id);
            const att = getStudentAttendance(student.id);

            const isLowGrade = avg !== null && avg < 65;
            const isLowAtt = att !== null && att < 75;

            if (isLowGrade && isLowAtt) {
                risks.push({ student, reason: 'both', details: `Nilai: ${avg?.toFixed(0)}, Hadir: ${att?.toFixed(0)}%` });
            } else if (isLowGrade) {
                risks.push({ student, reason: 'academic', details: `Rata-rata Nilai: ${avg?.toFixed(0)}` });
            } else if (isLowAtt) {
                risks.push({ student, reason: 'attendance', details: `Kehadiran: ${att?.toFixed(0)}%` });
            }
        });

        return risks.slice(0, 5); // Limit to 5 for widget
    }, [students, academicRecords, attendance, selectedClassId]);

    // Calculate daily attendance for chart
    const dailyAttendance = useMemo((): DailyAttendance[] => {
        const studentIds = new Set(students.map(s => s.id));
        const daysToCheck = dateRange === '7d' ? 7 : dateRange === '90d' ? 90 : 30;

        // 1. Initialize map with all dates in range
        const fullRangeMap = new Map<string, DailyAttendance>();
        const now = new Date();

        for (let i = 0; i < daysToCheck; i++) {
            const d = new Date();
            d.setDate(now.getDate() - i);
            const dateStr = d.toISOString().split('T')[0];
            fullRangeMap.set(dateStr, {
                date: dateStr,
                hadir: 0,
                izin: 0,
                sakit: 0,
                alpha: 0,
                total: 0
            });
        }

        // 2. Fill with actual data
        attendance
            .filter(a => selectedClassId === 'all' || studentIds.has(a.student_id))
            .forEach(a => {
                const date = a.date;
                // Only count if within our generated range
                if (fullRangeMap.has(date)) {
                    const day = fullRangeMap.get(date)!;
                    day.total++;
                    if (a.status === 'Hadir') day.hadir++;
                    else if (a.status === 'Izin') day.izin++;
                    else if (a.status === 'Sakit') day.sakit++;
                    else if (a.status === 'Alpha') day.alpha++;
                }
            });

        return Array.from(fullRangeMap.values())
            .sort((a, b) => a.date.localeCompare(b.date));
    }, [attendance, students, selectedClassId, dateRange]);

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
        color = 'indigo',
        tooltip,
        interpretation,
        actionLabel,
        actionLink
    }: {
        title: string;
        value: string | number;
        subtitle?: string;
        icon: React.ElementType;
        trend?: 'up' | 'down' | 'neutral';
        color?: 'indigo' | 'green' | 'amber' | 'red' | 'blue';
        tooltip?: string;
        interpretation?: { text: string; status: 'good' | 'warning' | 'danger' };
        actionLabel?: string;
        actionLink?: string;
    }) => {
        const colors = {
            indigo: 'from-indigo-500 to-purple-600',
            green: 'from-green-500 to-emerald-600',
            amber: 'from-amber-500 to-orange-600',
            red: 'from-red-500 to-rose-600',
            blue: 'from-blue-500 to-cyan-600',
        };

        const interpretationColors = {
            good: 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 border-green-200 dark:border-green-800',
            warning: 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-800',
            danger: 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 border-red-200 dark:border-red-800'
        };

        return (
            <Card className="relative overflow-hidden bg-white dark:bg-slate-900 border-0 shadow-lg">
                <div className={`absolute top-0 right-0 w-32 h-32 bg-gradient-to-br ${colors[color]} opacity-10 rounded-full -translate-y-8 translate-x-8`} />
                <CardContent className="p-6">
                    <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center gap-2" id="tour-stat-cards">
                            <p className="text-sm font-medium text-slate-500 dark:text-slate-400">{title}</p>
                            {tooltip && (
                                <div className="group relative">
                                    <HelpCircle className="w-4 h-4 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 cursor-help" />
                                    <div className="absolute left-0 top-full mt-2 hidden group-hover:block z-50 w-64 p-3 bg-slate-900 text-white text-xs rounded-lg shadow-xl">
                                        {tooltip}
                                        <div className="absolute -top-1 left-4 w-2 h-2 bg-slate-900 rotate-45" />
                                    </div>
                                </div>
                            )}
                        </div>
                        <div className={`p-3 rounded-xl bg-gradient-to-br ${colors[color]}`}>
                            <Icon className="w-6 h-6 text-white" />
                        </div>
                    </div>

                    <p className="text-3xl font-bold text-slate-900 dark:text-white mt-1">{value}</p>

                    {interpretation && (
                        <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border mt-3 ${interpretationColors[interpretation.status]}`}>
                            {interpretation.status === 'good' && '✅'}
                            {interpretation.status === 'warning' && '⚠️'}
                            {interpretation.status === 'danger' && '❌'}
                            {interpretation.text}
                        </div>
                    )}

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

                    {actionLabel && actionLink && (
                        <a
                            href={actionLink}
                            className="inline-flex items-center gap-1.5 mt-4 text-sm font-medium text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 transition-colors"
                        >
                            {actionLabel}
                            <ExternalLink className="w-3.5 h-3.5" />
                        </a>
                    )}
                </CardContent>
            </Card>
        );
    };

    const SimpleBarChart = ({ data, subtitle }: { data: DailyAttendance[]; subtitle?: string }) => {
        const maxTotal = Math.max(...data.map(d => d.total), 1);
        // Responsive chart height - smaller on mobile
        const chartHeight = typeof window !== 'undefined' && window.innerWidth < 640 ? 160 : 220;
        const barWidth = typeof window !== 'undefined' && window.innerWidth < 640 ? 8 : 12;
        const barGap = typeof window !== 'undefined' && window.innerWidth < 640 ? 3 : 6;

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
            <div className="relative" id="tour-charts">
                {/* Subtitle */}
                {subtitle && (
                    <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">{subtitle}</p>
                )}

                {/* Legend - Moves below subtitle on mobile */}
                <div className="flex flex-wrap items-center gap-2 sm:gap-4 text-xs sm:absolute sm:top-0 sm:right-0 mb-2 sm:mb-0">
                    <div className="flex items-center gap-1.5">
                        <div className="w-2.5 h-2.5 rounded-full bg-gradient-to-r from-indigo-500 to-purple-500" />
                        <span className="text-slate-500 dark:text-slate-400">Hadir</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                        <div className="w-2.5 h-2.5 rounded-full bg-gradient-to-r from-orange-400 to-rose-400" />
                        <span className="text-slate-500 dark:text-slate-400">Tidak Hadir</span>
                    </div>
                </div>

                <div className="flex mt-4 sm:mt-8 overflow-hidden">
                    {/* Y-axis */}
                    <div className="flex-shrink-0 flex flex-col justify-between pr-2 sm:pr-3 text-right" style={{ height: `${chartHeight}px` }}>
                        {yAxisLabels.map((val, i) => (
                            <span key={i} className="text-[10px] text-slate-500 dark:text-slate-400 leading-none">
                                {val}
                            </span>
                        ))}
                    </div>

                    {/* Chart Container */}
                    <div className="flex-1 relative overflow-hidden min-w-0">
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

                        {/* Bars Container - horizontal scroll on mobile */}
                        <div
                            className="flex items-end relative z-10 overflow-x-auto pb-1 scrollbar-hide"
                            style={{ height: `${chartHeight}px`, gap: `${barGap}px` }}
                        >
                            {data.map((day, i) => {
                                const totalHeight = maxTotal > 0 ? (day.total / maxTotal) * chartHeight : 0;
                                const hadirHeight = day.total > 0 ? (day.hadir / day.total) * totalHeight : 0;
                                const tidakHadirHeight = totalHeight - hadirHeight;


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

                {/* Summary stats below chart - 2 cols on mobile, 4 cols on larger */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3 mt-4 sm:mt-6 pt-3 sm:pt-4 border-t border-slate-200 dark:border-slate-700/50">
                    <div className="text-center p-2 rounded-lg bg-green-500/10">
                        <p className="text-base sm:text-lg font-bold text-green-500">{data.reduce((sum, d) => sum + d.hadir, 0)}</p>
                        <p className="text-[9px] sm:text-[10px] text-slate-500 uppercase tracking-wide">Hadir</p>
                    </div>
                    <div className="text-center p-2 rounded-lg bg-blue-500/10">
                        <p className="text-base sm:text-lg font-bold text-blue-500">{data.reduce((sum, d) => sum + d.izin, 0)}</p>
                        <p className="text-[9px] sm:text-[10px] text-slate-500 uppercase tracking-wide">Izin</p>
                    </div>
                    <div className="text-center p-2 rounded-lg bg-amber-500/10">
                        <p className="text-base sm:text-lg font-bold text-amber-500">{data.reduce((sum, d) => sum + d.sakit, 0)}</p>
                        <p className="text-[9px] sm:text-[10px] text-slate-500 uppercase tracking-wide">Sakit</p>
                    </div>
                    <div className="text-center p-2 rounded-lg bg-rose-500/10">
                        <p className="text-base sm:text-lg font-bold text-rose-500">{data.reduce((sum, d) => sum + d.alpha, 0)}</p>
                        <p className="text-[9px] sm:text-[10px] text-slate-500 uppercase tracking-wide">Alpha</p>
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
        const gradientParts: string[] = [];
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



    const AtRiskWidget = ({ students }: { students: AtRiskItem[] }) => {
        if (students.length === 0) return null;

        return (
            <Card className="bg-white dark:bg-slate-900 border-0 shadow-lg border-l-4 border-l-rose-500 overflow-hidden mb-6">
                <CardHeader className="pb-3 border-b border-slate-100 dark:border-slate-800 bg-rose-50/50 dark:bg-rose-900/10">
                    <CardTitle className="flex items-center gap-2 text-rose-600 dark:text-rose-400">
                        <AlertCircleIcon className="w-5 h-5" />
                        Perlu Perhatian ({students.length})
                    </CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                    <div className="divide-y divide-slate-100 dark:divide-slate-800">
                        {students.map((item, index) => (
                            <div key={index} className="p-4 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                                <div className="flex items-center gap-3">
                                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold
                                        ${item.reason === 'both' ? 'bg-rose-100 text-rose-600' :
                                            item.reason === 'academic' ? 'bg-amber-100 text-amber-600' : 'bg-blue-100 text-blue-600'}`}>
                                        {item.student.name.substring(0, 2).toUpperCase()}
                                    </div>
                                    <div>
                                        <h4 className="font-bold text-slate-800 dark:text-gray-200 text-sm">{item.student.name}</h4>
                                        <p className="text-xs text-slate-500 dark:text-slate-400">{item.details}</p>
                                    </div>
                                </div>
                                <Button size="sm" variant="ghost" className="h-8 w-8 p-0 rounded-full hover:bg-slate-200 dark:hover:bg-slate-700">
                                    <ExternalLink className="w-4 h-4 text-slate-400" />
                                </Button>
                            </div>
                        ))}
                    </div>
                </CardContent>
            </Card>
        );
    };

    const GradeDistributionChart = ({ data, average }: { data: GradeDistribution[]; average: number }) => {
        return (
            <div className="relative">
                <div className="flex items-end justify-between mb-6 px-2">
                    <div className="text-center">
                        <p className="text-3xl font-bold text-slate-900 dark:text-white">{average}</p>
                        <p className="text-xs text-slate-500 dark:text-slate-400 uppercase tracking-widest mt-1">Rata-rata</p>
                    </div>
                    <div className="text-right">
                        <p className="text-sm font-medium text-slate-600 dark:text-gray-300">
                            Total {data.reduce((a, b) => a + b.count, 0)} Siswa
                        </p>
                        <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">Dinilai</p>
                    </div>
                </div>

                <div className="space-y-4">
                    {data.map((item, index) => (
                        <div key={index} className="group relative">
                            <div className="flex items-center justify-between text-sm mb-1.5">
                                <span className="font-semibold text-slate-700 dark:text-gray-200 w-8">{item.label}</span>
                                <span className="text-xs text-slate-500 dark:text-slate-400 absolute left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity">
                                    Range: {item.range}
                                </span>
                                <span className="font-bold text-slate-900 dark:text-white">
                                    {item.count} <span className="text-slate-400 font-normal text-xs ml-0.5">({item.percentage}%)</span>
                                </span>
                            </div>
                            <div className="h-3 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                                <div
                                    className="h-full rounded-full transition-all duration-1000 ease-out relative"
                                    style={{
                                        width: `${item.percentage}%`,
                                        backgroundColor: item.color
                                    }}
                                >
                                    <div className="absolute inset-0 bg-white/20 opacity-0 group-hover:opacity-100 transition-opacity" />
                                </div>
                            </div>
                        </div>
                    ))}
                </div>

                {average < 75 && (
                    <div className="mt-6 p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl flex gap-3">
                        <div className="p-2 bg-amber-100 dark:bg-amber-800/40 rounded-lg h-fit">
                            <AlertCircleIcon className="w-5 h-5 text-amber-600 dark:text-amber-400" />
                        </div>
                        <div>
                            <h4 className="text-sm font-bold text-amber-800 dark:text-amber-300 mb-1">Perhatian Akademik</h4>
                            <p className="text-xs text-amber-700 dark:text-amber-400/80 leading-relaxed">
                                Rata-rata nilai kelas di bawah 75. Pertimbangkan untuk mengadakan remedial atau kelas tambahan untuk materi yang sulit.
                            </p>
                        </div>
                    </div>
                )}
            </div>
        );
    };

    if (isLoading) {
        return <AnalyticsPageSkeleton />;
    }

    return (
        <div className="min-h-screen p-4 md:p-8 space-y-6 animate-fade-in pb-24 lg:pb-8">
            {/* Header */}
            <header className="flex flex-col gap-4">
                <div>
                    <h1 className="text-2xl md:text-4xl font-bold text-slate-900 dark:text-white">
                        Dashboard Analitik
                    </h1>
                    <p className="text-sm md:text-base text-slate-500 dark:text-slate-400 mt-1">
                        Ringkasan data siswa, kehadiran, dan tugas Anda
                    </p>
                </div>
                <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                    <Select
                        value={selectedClassId}
                        onChange={(e) => setSelectedClassId(e.target.value)}
                        className="flex-1 min-w-[120px] sm:min-w-[150px] sm:flex-none"
                    >
                        <option value="all">Semua Kelas</option>
                        {classes.map(cls => (
                            <option key={cls.id} value={cls.id}>{cls.name}</option>
                        ))}
                    </Select>
                    <Select
                        value={dateRange}
                        onChange={(e) => setDateRange(e.target.value as '7d' | '30d' | '90d' | 'all')}
                        className="flex-1 min-w-[100px] sm:min-w-[120px] sm:flex-none"
                    >
                        <option value="7d">7 Hari</option>
                        <option value="30d">30 Hari</option>
                        <option value="90d">90 Hari</option>
                        <option value="all">Semua</option>
                    </Select>
                    <Button variant="outline" size="sm" onClick={() => refetch()} className="flex-shrink-0">
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
                    tooltip="Jumlah total siswa yang terdaftar di semua kelas Anda"
                    actionLabel="Lihat Daftar Siswa"
                    actionLink="#/siswa"
                />
                <StatCard
                    title="Kehadiran Siswa"
                    value={`${attendanceStats.hadirRate}%`}
                    subtitle={`${attendanceStats.hadir} dari ${attendanceStats.total} catatan`}
                    icon={CalendarIcon}
                    trend={attendanceStats.hadirRate >= 80 ? 'up' : attendanceStats.hadirRate >= 60 ? 'neutral' : 'down'}
                    color="green"
                    tooltip="Persentase siswa yang hadir dari total kehadiran yang tercatat. Target minimal 90% untuk kategori Sangat Baik."
                    interpretation={
                        attendanceStats.hadirRate >= 90
                            ? { text: 'Sangat Baik!', status: 'good' }
                            : attendanceStats.hadirRate >= 75
                                ? { text: 'Cukup Baik', status: 'warning' }
                                : { text: 'Perlu Perhatian', status: 'danger' }
                    }
                    actionLabel="Tandai Kehadiran Hari Ini"
                    actionLink="#/absensi"
                />
                <StatCard
                    title="Total Kelas"
                    value={classes.length}
                    subtitle="Kelas aktif"
                    icon={BarChart3Icon}
                    color="blue"
                    tooltip="Jumlah kelas yang Anda kelola saat ini"
                    actionLabel="Kelola Kelas"
                    actionLink="#/siswa"
                />
                <StatCard
                    title="Tugas Selesai"
                    value={`${taskStats.done}/${taskStats.total}`}
                    subtitle={taskStats.overdue > 0 ? `${taskStats.overdue} terlambat` : 'Semua on track'}
                    icon={TrendingUpIcon}
                    trend={taskStats.overdue > 0 ? 'down' : 'up'}
                    color={taskStats.overdue > 0 ? 'amber' : 'green'}
                    tooltip="Jumlah tugas yang sudah diselesaikan dari total tugas yang Anda buat"
                    interpretation={
                        taskStats.total === 0
                            ? undefined
                            : taskStats.done === taskStats.total
                                ? { text: 'Semua Selesai!', status: 'good' }
                                : taskStats.overdue > 0
                                    ? { text: 'Ada yang Terlambat', status: 'warning' }
                                    : { text: 'Sedang Berjalan', status: 'good' }
                    }
                    actionLabel="Lihat Semua Tugas"
                    actionLink="#/tugas"
                />
            </div>

            {/* Academic & Attendance Overview Row */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Academic Stats - New! */}
                <Card className="bg-white dark:bg-slate-900 border-0 shadow-lg lg:col-span-1">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <GraduationCapIcon className="w-5 h-5 text-indigo-600" />
                            Distribusi Nilai
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        {gradeStats.totalStudentsWithGrades > 0 ? (
                            <GradeDistributionChart data={gradeStats.distribution} average={gradeStats.overallAverage} />
                        ) : (
                            <div className="h-64 flex flex-col items-center justify-center text-center p-6 border-2 border-dashed border-slate-100 dark:border-slate-800 rounded-xl">
                                <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-full mb-3">
                                    <BookOpenIcon className="w-6 h-6 text-slate-400" />
                                </div>
                                <p className="text-sm font-medium text-slate-900 dark:text-white">Belum Ada Data Nilai</p>
                                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 mb-4">
                                    Input nilai tugas atau ujian untuk melihat analisis ini.
                                </p>
                                <Button variant="outline" size="sm" className="bg-white dark:bg-slate-800">
                                    Input Nilai
                                </Button>
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* Attendance Trend */}
                <Card className="bg-white dark:bg-slate-900 border-0 shadow-lg lg:col-span-2">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <BarChart3Icon className="w-5 h-5 text-indigo-600" />
                            Tren Kehadiran (30 Hari)
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        {dailyAttendance.length > 0 ? (
                            <SimpleBarChart
                                data={dailyAttendance}
                                subtitle={`Data kehadiran ${selectedClassId === 'all' ? 'semua kelas' : classes.find(c => c.id === selectedClassId)?.name || ''} – ${new Date().toLocaleDateString('id-ID', { month: 'long', year: 'numeric' })}`}
                            />
                        ) : (
                            <div className="h-64 flex items-center justify-center text-slate-500 border-2 border-dashed border-slate-100 dark:border-slate-800 rounded-xl">
                                Tidak ada data kehadiran
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>

            {/* At Risk Alert (Conditional) */}
            <AtRiskWidget students={atRiskStudents} />

            {/* Secondary Row for Pie Chart and others */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

                {/* Attendance Distribution */}
                <Card className="bg-white dark:bg-slate-900 border-0 shadow-lg">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <PieChartIcon className="w-5 h-5 text-indigo-600" />
                            Rincian Kehadiran Siswa
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
                        Ranking Kelas
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
