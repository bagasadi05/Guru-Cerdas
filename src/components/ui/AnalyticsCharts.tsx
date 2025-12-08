import React, { useMemo } from 'react';
import { TrendingUpIcon, TrendingDownIcon, MinusIcon } from 'lucide-react';

interface AttendanceTrendData {
    label: string; // e.g., "Jan", "Feb"
    percentage: number;
}

interface GradeDistributionData {
    label: string; // e.g., "A", "B", "C"
    count: number;
    color: string;
}

interface ClassComparisonData {
    className: string;
    attendanceRate: number;
    averageGrade: number;
}

// ============================================
// Attendance Trend Chart (Line Chart)
// ============================================
interface AttendanceTrendChartProps {
    data: AttendanceTrendData[];
    title?: string;
    className?: string;
}

export const AttendanceTrendChart: React.FC<AttendanceTrendChartProps> = ({
    data,
    title = 'Tren Kehadiran',
    className = '',
}) => {
    const maxValue = Math.max(...data.map(d => d.percentage), 100);
    const minValue = Math.min(...data.map(d => d.percentage));

    // Calculate trend
    const trend = useMemo(() => {
        if (data.length < 2) return 0;
        const first = data[0].percentage;
        const last = data[data.length - 1].percentage;
        return last - first;
    }, [data]);

    return (
        <div className={`bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 ${className}`}>
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-slate-900 dark:text-white">{title}</h3>
                <div className={`flex items-center gap-1 text-sm font-medium ${trend > 0 ? 'text-green-500' : trend < 0 ? 'text-red-500' : 'text-slate-500'
                    }`}>
                    {trend > 0 ? (
                        <TrendingUpIcon className="w-4 h-4" />
                    ) : trend < 0 ? (
                        <TrendingDownIcon className="w-4 h-4" />
                    ) : (
                        <MinusIcon className="w-4 h-4" />
                    )}
                    <span>{Math.abs(trend).toFixed(1)}%</span>
                </div>
            </div>

            {/* Chart */}
            <div className="relative h-48">
                {/* Grid lines */}
                <div className="absolute inset-0 flex flex-col justify-between">
                    {[100, 75, 50, 25, 0].map(value => (
                        <div key={value} className="flex items-center gap-2">
                            <span className="text-[10px] text-slate-400 w-8 text-right">{value}%</span>
                            <div className="flex-1 border-t border-slate-100 dark:border-slate-800" />
                        </div>
                    ))}
                </div>

                {/* Line chart */}
                <svg className="absolute inset-0 w-full h-full" preserveAspectRatio="none">
                    <defs>
                        <linearGradient id="lineGradient" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="rgb(99, 102, 241)" stopOpacity="0.3" />
                            <stop offset="100%" stopColor="rgb(99, 102, 241)" stopOpacity="0" />
                        </linearGradient>
                    </defs>

                    {/* Area fill */}
                    <path
                        d={`
                            M ${10} ${100 - (data[0]?.percentage || 0)}
                            ${data.map((d, i) => `L ${10 + (i * ((100 - 20) / (data.length - 1 || 1)))} ${100 - d.percentage}`).join(' ')}
                            L ${100 - 10} 100
                            L 10 100
                            Z
                        `}
                        fill="url(#lineGradient)"
                        className="transform scale-y-[0.48] origin-bottom"
                        style={{ transform: 'scaleY(0.48)', transformOrigin: 'bottom' }}
                    />

                    {/* Line */}
                    <polyline
                        points={data.map((d, i) =>
                            `${10 + (i * ((100 - 20) / (data.length - 1 || 1)))},${48 - (d.percentage * 0.48)}`
                        ).join(' ')}
                        fill="none"
                        stroke="rgb(99, 102, 241)"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        vectorEffect="non-scaling-stroke"
                    />

                    {/* Points */}
                    {data.map((d, i) => (
                        <circle
                            key={i}
                            cx={`${10 + (i * ((100 - 20) / (data.length - 1 || 1)))}%`}
                            cy={`${48 - (d.percentage * 0.48)}%`}
                            r="4"
                            fill="white"
                            stroke="rgb(99, 102, 241)"
                            strokeWidth="2"
                        />
                    ))}
                </svg>
            </div>

            {/* Labels */}
            <div className="flex justify-between mt-2 px-2">
                {data.map((d, i) => (
                    <span key={i} className="text-xs text-slate-500 dark:text-slate-400">
                        {d.label}
                    </span>
                ))}
            </div>
        </div>
    );
};

// ============================================
// Grade Distribution Chart (Bar Chart)
// ============================================
interface GradeDistributionChartProps {
    data: GradeDistributionData[];
    title?: string;
    className?: string;
}

export const GradeDistributionChart: React.FC<GradeDistributionChartProps> = ({
    data,
    title = 'Distribusi Nilai',
    className = '',
}) => {
    const maxCount = Math.max(...data.map(d => d.count), 1);
    const total = data.reduce((sum, d) => sum + d.count, 0);

    return (
        <div className={`bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 ${className}`}>
            <h3 className="font-semibold text-slate-900 dark:text-white mb-4">{title}</h3>

            {/* Bars */}
            <div className="space-y-3">
                {data.map((d, i) => {
                    const percentage = total > 0 ? (d.count / total) * 100 : 0;
                    return (
                        <div key={i} className="group">
                            <div className="flex items-center justify-between mb-1">
                                <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
                                    {d.label}
                                </span>
                                <span className="text-xs text-slate-500">
                                    {d.count} ({percentage.toFixed(0)}%)
                                </span>
                            </div>
                            <div className="h-3 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                                <div
                                    className="h-full rounded-full transition-all duration-500 group-hover:opacity-80"
                                    style={{
                                        width: `${(d.count / maxCount) * 100}%`,
                                        backgroundColor: d.color,
                                    }}
                                />
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

// ============================================
// Class Comparison Chart (Horizontal Bars)
// ============================================
interface ClassComparisonChartProps {
    data: ClassComparisonData[];
    title?: string;
    className?: string;
}

export const ClassComparisonChart: React.FC<ClassComparisonChartProps> = ({
    data,
    title = 'Perbandingan Kelas',
    className = '',
}) => {
    return (
        <div className={`bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 ${className}`}>
            <h3 className="font-semibold text-slate-900 dark:text-white mb-4">{title}</h3>

            <div className="space-y-4">
                {data.map((d, i) => (
                    <div key={i} className="space-y-2">
                        <div className="flex items-center justify-between">
                            <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
                                {d.className}
                            </span>
                        </div>

                        {/* Attendance Rate */}
                        <div className="flex items-center gap-2">
                            <span className="text-xs text-slate-500 w-20">Kehadiran</span>
                            <div className="flex-1 h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                                <div
                                    className="h-full bg-green-500 rounded-full"
                                    style={{ width: `${d.attendanceRate}%` }}
                                />
                            </div>
                            <span className="text-xs font-medium text-slate-600 dark:text-slate-400 w-10 text-right">
                                {d.attendanceRate}%
                            </span>
                        </div>

                        {/* Average Grade */}
                        <div className="flex items-center gap-2">
                            <span className="text-xs text-slate-500 w-20">Rata-rata</span>
                            <div className="flex-1 h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                                <div
                                    className="h-full bg-indigo-500 rounded-full"
                                    style={{ width: `${d.averageGrade}%` }}
                                />
                            </div>
                            <span className="text-xs font-medium text-slate-600 dark:text-slate-400 w-10 text-right">
                                {d.averageGrade}
                            </span>
                        </div>
                    </div>
                ))}
            </div>

            {/* Legend */}
            <div className="flex justify-center gap-6 mt-4 pt-4 border-t border-slate-100 dark:border-slate-800">
                <div className="flex items-center gap-1.5">
                    <div className="w-3 h-3 rounded-full bg-green-500" />
                    <span className="text-xs text-slate-500">Kehadiran</span>
                </div>
                <div className="flex items-center gap-1.5">
                    <div className="w-3 h-3 rounded-full bg-indigo-500" />
                    <span className="text-xs text-slate-500">Rata-rata Nilai</span>
                </div>
            </div>
        </div>
    );
};

// ============================================
// Quick Stats Card
// ============================================
interface QuickStatProps {
    label: string;
    value: string | number;
    change?: number;
    icon?: React.ReactNode;
    color?: string;
}

export const QuickStat: React.FC<QuickStatProps> = ({
    label,
    value,
    change,
    icon,
    color = 'from-indigo-500 to-purple-500',
}) => {
    return (
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-4 hover:shadow-lg transition-shadow">
            <div className="flex items-start justify-between">
                <div>
                    <p className="text-sm text-slate-500 dark:text-slate-400">{label}</p>
                    <p className="text-2xl font-bold text-slate-900 dark:text-white mt-1">{value}</p>
                    {change !== undefined && (
                        <div className={`flex items-center gap-1 mt-1 text-xs font-medium ${change > 0 ? 'text-green-500' : change < 0 ? 'text-red-500' : 'text-slate-500'
                            }`}>
                            {change > 0 ? (
                                <TrendingUpIcon className="w-3 h-3" />
                            ) : change < 0 ? (
                                <TrendingDownIcon className="w-3 h-3" />
                            ) : (
                                <MinusIcon className="w-3 h-3" />
                            )}
                            <span>{Math.abs(change)}% dari bulan lalu</span>
                        </div>
                    )}
                </div>
                {icon && (
                    <div className={`p-2 rounded-lg bg-gradient-to-br ${color} text-white`}>
                        {icon}
                    </div>
                )}
            </div>
        </div>
    );
};

export default {
    AttendanceTrendChart,
    GradeDistributionChart,
    ClassComparisonChart,
    QuickStat,
};
