import React, { useMemo } from 'react';
import { TrendingUpIcon, TrendingDownIcon, MinusIcon } from 'lucide-react';

interface GradeRecord {
    id: string;
    subject: string;
    score: number;
    assessment_name: string | null;
    created_at: string;
}

interface GradeTrendChartProps {
    records: GradeRecord[];
    className?: string;
}

export const GradeTrendChart: React.FC<GradeTrendChartProps> = ({ records, className = '' }) => {
    // Group and process data
    const chartData = useMemo(() => {
        if (!records || records.length === 0) return null;

        // Sort by date
        const sorted = [...records].sort((a, b) =>
            new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
        );

        // Group by month
        const monthlyData: { [key: string]: number[] } = {};
        sorted.forEach(record => {
            const date = new Date(record.created_at);
            const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
            if (!monthlyData[monthKey]) {
                monthlyData[monthKey] = [];
            }
            monthlyData[monthKey].push(record.score);
        });

        // Calculate monthly averages
        const monthlyAverages = Object.entries(monthlyData).map(([month, scores]) => ({
            month,
            average: Math.round(scores.reduce((a, b) => a + b, 0) / scores.length),
            label: new Date(month + '-01').toLocaleDateString('id-ID', { month: 'short' })
        }));

        // Take last 6 months
        const last6 = monthlyAverages.slice(-6);

        // Calculate trend
        let trend = 0;
        if (last6.length >= 2) {
            trend = last6[last6.length - 1].average - last6[0].average;
        }

        // Get overall average
        const overallAverage = Math.round(
            records.reduce((acc, r) => acc + r.score, 0) / records.length
        );

        return {
            monthlyAverages: last6,
            trend,
            overallAverage,
            minScore: Math.min(...records.map(r => r.score)),
            maxScore: Math.max(...records.map(r => r.score)),
        };
    }, [records]);

    // Group by subject for breakdown
    const subjectBreakdown = useMemo(() => {
        if (!records || records.length === 0) return [];

        const bySubject: { [key: string]: number[] } = {};
        records.forEach(record => {
            if (!bySubject[record.subject]) {
                bySubject[record.subject] = [];
            }
            bySubject[record.subject].push(record.score);
        });

        return Object.entries(bySubject).map(([subject, scores]) => ({
            subject,
            average: Math.round(scores.reduce((a, b) => a + b, 0) / scores.length),
            count: scores.length,
            min: Math.min(...scores),
            max: Math.max(...scores),
        })).sort((a, b) => b.average - a.average);
    }, [records]);

    if (!chartData) {
        return (
            <div className={`bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 ${className}`}>
                <p className="text-slate-500 dark:text-slate-400 text-center">Belum ada data nilai</p>
            </div>
        );
    }

    const { monthlyAverages, trend, overallAverage, maxScore, minScore } = chartData;

    // SVG Chart dimensions
    const chartWidth = 280;
    const chartHeight = 120;
    const padding = 30;

    // Calculate SVG path for trend line
    const getPath = () => {
        if (monthlyAverages.length < 2) return '';

        const xStep = (chartWidth - padding * 2) / (monthlyAverages.length - 1);
        const yRange = chartHeight - padding * 2;
        const minVal = 0;
        const maxVal = 100;

        const points = monthlyAverages.map((data, i) => {
            const x = padding + i * xStep;
            const y = padding + yRange - ((data.average - minVal) / (maxVal - minVal)) * yRange;
            return { x, y };
        });

        const pathD = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
        return pathD;
    };

    // Get color for score
    const getScoreColor = (score: number) => {
        if (score >= 80) return 'text-emerald-500';
        if (score >= 65) return 'text-amber-500';
        return 'text-red-500';
    };

    const getBarColor = (score: number) => {
        if (score >= 80) return 'bg-gradient-to-r from-emerald-500 to-teal-500';
        if (score >= 65) return 'bg-gradient-to-r from-amber-500 to-orange-500';
        return 'bg-gradient-to-r from-red-500 to-rose-500';
    };

    return (
        <div className={`bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 ${className}`}>
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
                <h3 className="font-bold text-slate-800 dark:text-white text-lg">Tren Perkembangan Nilai</h3>
                <div className={`flex items-center gap-1 px-3 py-1.5 rounded-full ${trend > 0 ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400' :
                        trend < 0 ? 'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400' :
                            'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                    }`}>
                    {trend > 0 ? <TrendingUpIcon className="w-4 h-4" /> :
                        trend < 0 ? <TrendingDownIcon className="w-4 h-4" /> :
                            <MinusIcon className="w-4 h-4" />}
                    <span className="text-sm font-semibold">
                        {trend > 0 ? '+' : ''}{trend} poin
                    </span>
                </div>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-3 gap-3 mb-6">
                <div className="bg-gradient-to-br from-indigo-50 to-purple-50 dark:from-indigo-900/20 dark:to-purple-900/20 rounded-xl p-3 text-center">
                    <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">Rata-rata</p>
                    <p className={`text-2xl font-bold ${getScoreColor(overallAverage)}`}>{overallAverage}</p>
                </div>
                <div className="bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-emerald-900/20 dark:to-teal-900/20 rounded-xl p-3 text-center">
                    <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">Tertinggi</p>
                    <p className="text-2xl font-bold text-emerald-500">{maxScore}</p>
                </div>
                <div className="bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-900/20 dark:to-orange-900/20 rounded-xl p-3 text-center">
                    <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">Terendah</p>
                    <p className="text-2xl font-bold text-amber-500">{minScore}</p>
                </div>
            </div>

            {/* Line Chart */}
            {monthlyAverages.length >= 2 && (
                <div className="mb-6">
                    <svg viewBox={`0 0 ${chartWidth} ${chartHeight}`} className="w-full h-32">
                        {/* Grid lines */}
                        {[0, 25, 50, 75, 100].map(val => {
                            const y = padding + (chartHeight - padding * 2) - (val / 100) * (chartHeight - padding * 2);
                            return (
                                <g key={val}>
                                    <line
                                        x1={padding}
                                        y1={y}
                                        x2={chartWidth - padding}
                                        y2={y}
                                        stroke="currentColor"
                                        strokeOpacity="0.1"
                                        strokeDasharray="4 4"
                                        className="text-slate-400"
                                    />
                                    <text
                                        x={padding - 5}
                                        y={y + 4}
                                        fontSize="8"
                                        textAnchor="end"
                                        fill="currentColor"
                                        className="text-slate-400"
                                    >
                                        {val}
                                    </text>
                                </g>
                            );
                        })}

                        {/* Line */}
                        <path
                            d={getPath()}
                            fill="none"
                            stroke="url(#gradient)"
                            strokeWidth="3"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                        />

                        {/* Gradient definition */}
                        <defs>
                            <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="0%">
                                <stop offset="0%" stopColor="#6366f1" />
                                <stop offset="100%" stopColor="#a855f7" />
                            </linearGradient>
                        </defs>

                        {/* Data points */}
                        {monthlyAverages.map((data, i) => {
                            const xStep = (chartWidth - padding * 2) / (monthlyAverages.length - 1);
                            const x = padding + i * xStep;
                            const y = padding + (chartHeight - padding * 2) - (data.average / 100) * (chartHeight - padding * 2);
                            return (
                                <g key={i}>
                                    <circle
                                        cx={x}
                                        cy={y}
                                        r="5"
                                        fill="white"
                                        stroke="#6366f1"
                                        strokeWidth="2"
                                    />
                                    <text
                                        x={x}
                                        y={chartHeight - 5}
                                        fontSize="9"
                                        textAnchor="middle"
                                        fill="currentColor"
                                        className="text-slate-500"
                                    >
                                        {data.label}
                                    </text>
                                </g>
                            );
                        })}
                    </svg>
                </div>
            )}

            {/* Subject Breakdown */}
            <div>
                <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-3">Per Mata Pelajaran</h4>
                <div className="space-y-2">
                    {subjectBreakdown.slice(0, 5).map((item, i) => (
                        <div key={i} className="flex items-center gap-3">
                            <span className="text-sm text-slate-600 dark:text-slate-400 w-24 truncate">
                                {item.subject}
                            </span>
                            <div className="flex-1 h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                                <div
                                    className={`h-full ${getBarColor(item.average)} transition-all duration-500`}
                                    style={{ width: `${item.average}%` }}
                                />
                            </div>
                            <span className={`text-sm font-bold w-10 text-right ${getScoreColor(item.average)}`}>
                                {item.average}
                            </span>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default GradeTrendChart;
