import React, { useMemo, useState } from 'react';
import { BarChartIcon, TrendingUpIcon, UsersIcon, ChevronDown, ChevronUp, RotateCw } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { DashboardPanel } from './DashboardPanel';
import { supabase } from '../../services/supabase';

interface ClassStats {
    classId: string;
    className: string;
    studentCount: number;
    averageGrade: number;
    attendanceRate: number;
}

interface MonthlyAttendance {
    month: string;
    percentage: number;
}

interface ClassAnalyticsAttendanceData {
    class_rates: Record<string, number>;
    monthly_trend: { month: string; percentage: number }[];
}

interface ClassAnalyticsSectionProps {
    classes: { id: string; name: string }[];
    students: { id: string; class_id: string | null }[];
    academicRecords: { student_id: string; score: number }[];
    attendanceRecords?: { student_id: string; status: string; date: string }[];
    defaultOpen?: boolean;
}

const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];

const computeMonthlyTrendFromRecords = (records: { status: string; date: string }[]): MonthlyAttendance[] => {
    const monthMap: Record<string, { present: number; total: number }> = {};

    records.forEach(record => {
        const date = new Date(record.date);
        const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;

        if (!monthMap[monthKey]) {
            monthMap[monthKey] = { present: 0, total: 0 };
        }
        monthMap[monthKey].total++;
        if (record.status === 'Hadir') {
            monthMap[monthKey].present++;
        }
    });

    return Object.entries(monthMap)
        .sort(([a], [b]) => a.localeCompare(b))
        .slice(-6)
        .map(([key, data]) => {
            const [, month] = key.split('-');
            return {
                month: MONTH_NAMES[parseInt(month, 10) - 1],
                percentage: data.total > 0 ? Math.round((data.present / data.total) * 100) : 0,
            };
        });
};

const extractGradeLevel = (name: string): string => {
    const match = name.match(/(?:Kelas\s+)?(\d+|[IVXLCDM]+)/i);
    return match ? match[1].toUpperCase() : 'Lainnya';
};

export const ClassAnalyticsSection: React.FC<ClassAnalyticsSectionProps> = ({
    classes,
    students,
    academicRecords,
    attendanceRecords,
    defaultOpen = false,
}) => {
    const [isOpen, setIsOpen] = useState(defaultOpen);
    const [selectedGrade, setSelectedGrade] = useState<string>('Semua');

    // 1. Fetch pre-aggregated class rates and monthly trend via RPC
    const { data: rpcData, refetch: refetchRpc, isFetching: isFetchingRpc } = useQuery<ClassAnalyticsAttendanceData | null>({
        queryKey: ['class-analytics-rpc-attendance'],
        queryFn: async () => {
            if (typeof supabase.rpc !== 'function') return null;
            const { data, error } = await supabase.rpc('get_class_analytics_attendance');
            if (error) {
                console.warn('Failed to fetch class analytics attendance via RPC:', error);
                return null;
            }
            return (data as unknown) as ClassAnalyticsAttendanceData;
        },
        enabled: !attendanceRecords || attendanceRecords.length === 0,
        staleTime: 5 * 60 * 1000,
    });

    // 2. Secondary fallback query if RPC returns null and no attendanceRecords were provided
    const { data: fallbackAttendance = [], refetch: refetchFallback, isFetching: isFetchingFallback } = useQuery({
        queryKey: ['class-analytics-fallback-attendance'],
        queryFn: async () => {
            const sixMonthsAgo = new Date();
            sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 5);
            sixMonthsAgo.setDate(1);
            const dateStr = sixMonthsAgo.toISOString().split('T')[0];

            const { data, error } = await supabase
                .from('attendance')
                .select('student_id, status, date')
                .gte('date', dateStr)
                .order('date', { ascending: false })
                .limit(2000);

            if (error) return [];
            return (data || []) as { student_id: string; status: string; date: string }[];
        },
        enabled: (!attendanceRecords || attendanceRecords.length === 0) && rpcData === null,
        staleTime: 5 * 60 * 1000,
    });

    const isRefreshing = isFetchingRpc || isFetchingFallback;
    const handleRefresh = async (e: React.MouseEvent) => {
        e.stopPropagation();
        await Promise.all([refetchRpc(), refetchFallback()]);
    };

    // Calculate class statistics
    const classStats = useMemo((): ClassStats[] => {
        const hasPropAttendance = Boolean(attendanceRecords && attendanceRecords.length > 0);
        const effectiveAttendance = hasPropAttendance ? attendanceRecords! : fallbackAttendance;

        return classes.map(cls => {
            const classStudents = students.filter(s => s.class_id === cls.id);
            const classStudentIds = new Set(classStudents.map(s => s.id));

            // Average grade
            const classGrades = academicRecords.filter(r => classStudentIds.has(r.student_id));
            const avgGrade = classGrades.length > 0
                ? Math.round(classGrades.reduce((sum, r) => sum + r.score, 0) / classGrades.length)
                : 0;

            // Attendance rate
            let attendanceRate = 0;
            if (hasPropAttendance || (!rpcData?.class_rates && effectiveAttendance.length > 0)) {
                const classAttendance = effectiveAttendance.filter(r => classStudentIds.has(r.student_id));
                const presentCount = classAttendance.filter(r => r.status === 'Hadir').length;
                attendanceRate = classAttendance.length > 0
                    ? Math.round((presentCount / classAttendance.length) * 100)
                    : 0;
            } else if (rpcData?.class_rates) {
                attendanceRate = rpcData.class_rates[cls.id] ?? 0;
            }

            return {
                classId: cls.id,
                className: cls.name,
                studentCount: classStudents.length,
                averageGrade: avgGrade,
                attendanceRate: attendanceRate,
            };
        }).filter(c => c.studentCount > 0);
    }, [classes, students, academicRecords, attendanceRecords, rpcData, fallbackAttendance]);

    // Available grade levels for filter chips
    const gradeLevels = useMemo(() => {
        const levels = new Set<string>();
        classStats.forEach(c => {
            levels.add(extractGradeLevel(c.className));
        });
        return Array.from(levels).sort((a, b) => {
            const numA = parseInt(a, 10);
            const numB = parseInt(b, 10);
            if (!isNaN(numA) && !isNaN(numB)) return numA - numB;
            return a.localeCompare(b);
        });
    }, [classStats]);

    // Filtered classes according to selected grade
    const filteredClassStats = useMemo(() => {
        if (selectedGrade === 'Semua') return classStats;
        return classStats.filter(c => extractGradeLevel(c.className) === selectedGrade);
    }, [classStats, selectedGrade]);

    // Calculate monthly attendance trend
    const monthlyAttendance = useMemo((): MonthlyAttendance[] => {
        if (attendanceRecords && attendanceRecords.length > 0) {
            return computeMonthlyTrendFromRecords(attendanceRecords);
        }
        if (rpcData?.monthly_trend && rpcData.monthly_trend.length > 0) {
            return rpcData.monthly_trend;
        }
        if (fallbackAttendance.length > 0) {
            return computeMonthlyTrendFromRecords(fallbackAttendance);
        }
        return [];
    }, [attendanceRecords, rpcData, fallbackAttendance]);

    const chartWidth = 500;
    const chartHeight = 150;
    const paddingX = 40;
    const paddingTop = 22;
    const paddingBottom = 28;
    const drawingHeight = chartHeight - paddingTop - paddingBottom;
    const baselineY = chartHeight - paddingBottom;

    const chartPoints = useMemo(() => {
        if (monthlyAttendance.length === 0) return [];
        return monthlyAttendance.map((m, i) => {
            const x = monthlyAttendance.length > 1
                ? paddingX + i * ((chartWidth - paddingX * 2) / (monthlyAttendance.length - 1))
                : chartWidth / 2;
            const y = paddingTop + drawingHeight * (1 - Math.min(Math.max(m.percentage, 0), 100) / 100);
            return {
                x,
                y,
                month: m.month,
                percentage: m.percentage,
            };
        });
    }, [monthlyAttendance, drawingHeight]);

    const { linePath, areaPath } = useMemo(() => {
        if (chartPoints.length === 0) return { linePath: '', areaPath: '' };
        if (chartPoints.length === 1) {
            const p = chartPoints[0];
            return {
                linePath: `M ${(p.x - 30).toFixed(1)} ${p.y.toFixed(1)} L ${(p.x + 30).toFixed(1)} ${p.y.toFixed(1)}`,
                areaPath: `M ${(p.x - 30).toFixed(1)} ${p.y.toFixed(1)} L ${(p.x + 30).toFixed(1)} ${p.y.toFixed(1)} L ${(p.x + 30).toFixed(1)} ${baselineY} L ${(p.x - 30).toFixed(1)} ${baselineY} Z`,
            };
        }

        const lineD = chartPoints.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(' ');
        const firstX = chartPoints[0].x.toFixed(1);
        const lastX = chartPoints[chartPoints.length - 1].x.toFixed(1);
        const areaD = `${lineD} L ${lastX} ${baselineY} L ${firstX} ${baselineY} Z`;

        return { linePath: lineD, areaPath: areaD };
    }, [chartPoints, baselineY]);

    if (classStats.length === 0) {
        return null;
    }


    const maxGrade = Math.max(...classStats.map(c => c.averageGrade), 100);

    return (
        <DashboardPanel className="flex flex-col h-full">
            <div className="w-full flex items-center justify-between p-4 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                <button
                    type="button"
                    onClick={() => setIsOpen(!isOpen)}
                    className="flex-1 flex items-center gap-2 text-left cursor-pointer select-none"
                >
                    <BarChartIcon className="w-5 h-5 text-emerald-500" />
                    <h3 className="font-semibold text-slate-900 dark:text-white">Analisis Kelas</h3>
                </button>
                <div className="flex items-center gap-1.5">
                    <button
                        type="button"
                        onClick={handleRefresh}
                        disabled={isRefreshing}
                        title="Segarkan data analisis kelas"
                        className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-200/50 dark:hover:bg-slate-700/50 transition-all cursor-pointer disabled:opacity-50"
                    >
                        <RotateCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin text-emerald-500' : ''}`} />
                    </button>
                    <button
                        type="button"
                        onClick={() => setIsOpen(!isOpen)}
                        aria-label={isOpen ? "Tutup analisis kelas" : "Buka analisis kelas"}
                        className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
                    >
                        {isOpen ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                    </button>
                </div>
            </div>

            {isOpen && (
                <div className="p-4 border-t border-slate-200/60 dark:border-slate-700/60 space-y-4">
                    {/* Grade Level Filter Chips */}
                    {gradeLevels.length > 1 && (
                        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-1 -mx-1 px-1 touch-pan-x">
                            <button
                                type="button"
                                onClick={() => setSelectedGrade('Semua')}
                                className={`min-h-[36px] px-3 py-1 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap ${
                                    selectedGrade === 'Semua'
                                        ? 'bg-emerald-600 text-white shadow-sm'
                                        : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
                                }`}
                            >
                                Semua ({classStats.length})
                            </button>
                            {gradeLevels.map(grade => {
                                const count = classStats.filter(c => extractGradeLevel(c.className) === grade).length;
                                return (
                                    <button
                                        key={grade}
                                        type="button"
                                        onClick={() => setSelectedGrade(grade)}
                                        className={`min-h-[36px] px-3 py-1 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap ${
                                            selectedGrade === grade
                                                ? 'bg-emerald-600 text-white shadow-sm'
                                                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
                                        }`}
                                    >
                                        Kelas {grade} ({count})
                                    </button>
                                );
                            })}
                        </div>
                    )}

                    {/* Class Comparison Chart Content with constrained height and smooth scrolling */}
                    <div className="space-y-3 max-h-[340px] sm:max-h-[420px] overflow-y-auto custom-scrollbar pr-1">
                        {filteredClassStats.length === 0 ? (
                            <div className="py-8 text-center text-xs text-slate-400">
                                Tidak ada data kelas untuk filter ini
                            </div>
                        ) : (
                            filteredClassStats.map((cls) => (
                                <div
                                    key={cls.classId}
                                    className="p-3 bg-slate-50/70 dark:bg-slate-800/40 border border-slate-200/60 dark:border-slate-700/60 rounded-xl space-y-2 hover:bg-slate-100/60 dark:hover:bg-slate-800/60 transition-colors"
                                >
                                    <div className="flex items-center justify-between text-sm">
                                        <span className="font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-2">
                                            <UsersIcon className="w-4 h-4 text-emerald-500 shrink-0" />
                                            {cls.className}
                                            <span className="text-xs font-normal text-slate-400">({cls.studentCount} siswa)</span>
                                        </span>
                                    </div>

                                    {/* Grade Bar */}
                                    <div className="flex items-center gap-2.5">
                                        <span className="text-xs font-medium text-slate-500 dark:text-slate-400 w-24 shrink-0">
                                            Nilai Rata-rata
                                        </span>
                                        <div className="flex-1 h-2 bg-slate-200/60 dark:bg-slate-700/60 rounded-full overflow-hidden">
                                            <div
                                                className="h-full bg-gradient-to-r from-blue-500 to-indigo-500 rounded-full transition-all duration-500"
                                                style={{ width: `${(cls.averageGrade / maxGrade) * 100}%` }}
                                            />
                                        </div>
                                        <span className="text-xs font-bold text-blue-600 dark:text-blue-400 min-w-[32px] text-right">
                                            {cls.averageGrade > 0 ? cls.averageGrade : '-'}
                                        </span>
                                    </div>

                                    {/* Attendance Bar */}
                                    <div className="flex items-center gap-2.5">
                                        <span className="text-xs font-medium text-slate-500 dark:text-slate-400 w-24 shrink-0">
                                            Kehadiran
                                        </span>
                                        <div className="flex-1 h-2 bg-slate-200/60 dark:bg-slate-700/60 rounded-full overflow-hidden">
                                            <div
                                                className="h-full bg-gradient-to-r from-emerald-500 to-teal-500 rounded-full transition-all duration-500"
                                                style={{ width: `${cls.attendanceRate}%` }}
                                            />
                                        </div>
                                        <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 min-w-[32px] text-right">
                                            {cls.attendanceRate}%
                                        </span>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>

                    {/* Legend */}
                    <div className="flex justify-center gap-6 pt-2 border-t border-slate-200/60 dark:border-slate-700/60">
                        <div className="flex items-center gap-1.5">
                            <div className="w-3 h-3 rounded-full bg-gradient-to-r from-blue-500 to-blue-600" />
                            <span className="text-xs text-slate-500">Rata-rata Nilai</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                            <div className="w-3 h-3 rounded-full bg-gradient-to-r from-emerald-500 to-emerald-500" />
                            <span className="text-xs text-slate-500">Tingkat Kehadiran</span>
                        </div>
                    </div>

                    {/* Monthly Attendance Trend */}
                    {monthlyAttendance.length > 0 && (
                        <div className="pt-4 border-t border-slate-100 dark:border-slate-800">
                            <div className="flex items-center justify-between mb-3">
                                <div className="flex items-center gap-2">
                                    <TrendingUpIcon className="w-5 h-5 text-emerald-500" />
                                    <h3 className="font-semibold text-sm text-slate-900 dark:text-white">Tren Kehadiran Bulanan</h3>
                                </div>
                                {monthlyAttendance.length >= 2 && (
                                    <div className="text-xs font-medium">
                                        {monthlyAttendance[monthlyAttendance.length - 1].percentage >= monthlyAttendance[monthlyAttendance.length - 2].percentage ? (
                                            <span className="text-emerald-600 dark:text-emerald-400 font-semibold inline-flex items-center gap-1">
                                                <TrendingUpIcon className="w-3.5 h-3.5" />
                                                +{(monthlyAttendance[monthlyAttendance.length - 1].percentage - monthlyAttendance[monthlyAttendance.length - 2].percentage)}%
                                                <span className="text-slate-400 dark:text-slate-500 font-normal ml-0.5">vs bln lalu</span>
                                            </span>
                                        ) : (
                                            <span className="text-rose-600 dark:text-rose-400 font-semibold inline-flex items-center gap-1">
                                                <TrendingUpIcon className="w-3.5 h-3.5 rotate-180" />
                                                -{(monthlyAttendance[monthlyAttendance.length - 2].percentage - monthlyAttendance[monthlyAttendance.length - 1].percentage)}%
                                                <span className="text-slate-400 dark:text-slate-500 font-normal ml-0.5">vs bln lalu</span>
                                            </span>
                                        )}
                                    </div>
                                )}
                            </div>

                            {/* Line Chart */}
                            <div className="relative w-full bg-slate-50/50 dark:bg-slate-800/30 rounded-xl p-3 border border-slate-100 dark:border-slate-800/60">
                                <svg
                                    viewBox={`0 0 ${chartWidth} ${chartHeight}`}
                                    className="w-full h-40 overflow-visible select-none"
                                >
                                    <defs>
                                        <linearGradient id="lineGradientMonth" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="0%" stopColor="rgb(16, 185, 129)" stopOpacity="0.35" />
                                            <stop offset="100%" stopColor="rgb(16, 185, 129)" stopOpacity="0.0" />
                                        </linearGradient>
                                        <linearGradient id="lineStrokeMonth" x1="0" y1="0" x2="1" y2="0">
                                            <stop offset="0%" stopColor="#059669" />
                                            <stop offset="100%" stopColor="#10b981" />
                                        </linearGradient>
                                    </defs>

                                    {/* Grid lines & Y-axis labels */}
                                    {[0, 25, 50, 75, 100].map(val => {
                                        const y = paddingTop + drawingHeight * (1 - val / 100);
                                        return (
                                            <g key={val}>
                                                <line
                                                    x1={paddingX}
                                                    y1={y}
                                                    x2={chartWidth - paddingX}
                                                    y2={y}
                                                    stroke="currentColor"
                                                    strokeWidth="1"
                                                    strokeDasharray="3 3"
                                                    className="text-slate-200/80 dark:text-slate-700/60"
                                                />
                                                <text
                                                    x={paddingX - 8}
                                                    y={y + 3}
                                                    textAnchor="end"
                                                    className="text-[9px] font-medium fill-slate-400 dark:fill-slate-500"
                                                >
                                                    {val}%
                                                </text>
                                            </g>
                                        );
                                    })}

                                    {/* Area fill */}
                                    {areaPath && (
                                        <path
                                            d={areaPath}
                                            fill="url(#lineGradientMonth)"
                                        />
                                    )}

                                    {/* Line */}
                                    {linePath && (
                                        <path
                                            d={linePath}
                                            fill="none"
                                            stroke="url(#lineStrokeMonth)"
                                            strokeWidth="2.5"
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                        />
                                    )}

                                    {/* Points and Labels */}
                                    {chartPoints.map((p, i) => (
                                        <g key={i}>
                                            {/* Glow outer ring */}
                                            <circle
                                                cx={p.x}
                                                cy={p.y}
                                                r="7"
                                                className="fill-emerald-500/15 dark:fill-emerald-400/20"
                                            />
                                            {/* Point marker */}
                                            <circle
                                                cx={p.x}
                                                cy={p.y}
                                                r="4.5"
                                                className="fill-white dark:fill-slate-900 stroke-emerald-500 dark:stroke-emerald-400"
                                                strokeWidth="2.5"
                                            />
                                            {/* Percentage value label floating directly above point */}
                                            <text
                                                x={p.x}
                                                y={Math.max(p.y - 10, 14)}
                                                textAnchor="middle"
                                                className="text-[11px] font-bold fill-emerald-600 dark:fill-emerald-400"
                                            >
                                                {p.percentage}%
                                            </text>
                                            {/* Month name along baseline */}
                                            <text
                                                x={p.x}
                                                y={baselineY + 18}
                                                textAnchor="middle"
                                                className="text-[11px] font-semibold fill-slate-600 dark:fill-slate-300"
                                            >
                                                {p.month}
                                            </text>
                                        </g>
                                    ))}
                                </svg>
                            </div>
                        </div>
                    )}

                </div>
            )}
        </DashboardPanel>
    );
};

export default ClassAnalyticsSection;
