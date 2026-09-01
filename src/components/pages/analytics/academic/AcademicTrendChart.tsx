import React, { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../../../ui/Card';
import { TrendingUp } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';
import type { SubjectTrendData } from '../../../../services/academicAnalyticsService';

interface AcademicTrendChartProps {
    trends: SubjectTrendData[];
    kktpThreshold: number;
}

export const AcademicTrendChart: React.FC<AcademicTrendChartProps> = ({ trends, kktpThreshold }) => {
    const [activeSubjects, setActiveSubjects] = useState<Set<string>>(
        new Set(trends.map((t) => t.subject))
    );

    // Merge all trend data into a unified timeline
    const chartData = useMemo(() => {
        const dateMap = new Map<string, Record<string, number | string>>();
        trends.forEach((t) => {
            t.data.forEach((point) => {
                if (!dateMap.has(point.date)) {
                    dateMap.set(point.date, { label: point.label, date: point.date });
                }
                const row = dateMap.get(point.date)!;
                if (activeSubjects.has(t.subject)) {
                    row[t.subject] = point.average;
                }
            });
        });
        return Array.from(dateMap.values()).sort((a, b) => (a.date as string).localeCompare(b.date as string));
    }, [trends, activeSubjects]);

    const toggleSubject = (subject: string) => {
        setActiveSubjects((prev) => {
            const next = new Set(prev);
            if (next.has(subject)) {
                next.delete(subject);
            } else {
                next.add(subject);
            }
            return next;
        });
    };

    if (trends.length === 0) return null;

    const hasData = chartData.length >= 2;

    return (
        <Card className="bg-white dark:bg-slate-900 border-0 shadow-lg">
            <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center gap-2 text-base">
                        <TrendingUp className="w-5 h-5 text-brand-500" />
                        Tren Nilai Per Mapel
                    </CardTitle>
                </div>
                {/* Subject Legend Toggles */}
                <div className="flex flex-wrap gap-2 mt-2">
                    {trends.map((t) => (
                        <button
                            key={t.subject}
                            type="button"
                            onClick={() => toggleSubject(t.subject)}
                            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold transition-all border ${
                                activeSubjects.has(t.subject)
                                    ? 'border-transparent shadow-sm'
                                    : 'border-slate-200 dark:border-slate-700 opacity-50'
                            }`}
                            style={activeSubjects.has(t.subject) ? {
                                backgroundColor: `${t.color}15`,
                                color: t.color,
                                borderColor: `${t.color}40`,
                            } : undefined}
                        >
                            <span
                                className="w-2 h-2 rounded-full"
                                style={{ backgroundColor: t.color }}
                            />
                            {t.subject}
                        </button>
                    ))}
                </div>
            </CardHeader>
            <CardContent className="pt-2">
                {hasData ? (
                    <div className="h-64">
                        <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={chartData} margin={{ top: 5, right: 10, left: -10, bottom: 5 }}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                                <XAxis
                                    dataKey="label"
                                    tick={{ fontSize: 11, fill: '#94a3b8' }}
                                    tickLine={false}
                                    axisLine={{ stroke: '#e2e8f0' }}
                                />
                                <YAxis
                                    domain={[0, 100]}
                                    tick={{ fontSize: 11, fill: '#94a3b8' }}
                                    tickLine={false}
                                    axisLine={false}
                                />
                                <Tooltip
                                    contentStyle={{
                                        backgroundColor: 'rgba(15, 23, 42, 0.9)',
                                        border: 'none',
                                        borderRadius: '12px',
                                        color: '#f8fafc',
                                        fontSize: '12px',
                                        padding: '8px 12px',
                                    }}
                                    labelStyle={{ color: '#94a3b8', fontSize: '11px' }}
                                />
                                <ReferenceLine
                                    y={kktpThreshold}
                                    stroke="#f59e0b"
                                    strokeDasharray="6 4"
                                    label={{
                                        value: `KKTP ${kktpThreshold}`,
                                        position: 'right',
                                        fill: '#f59e0b',
                                        fontSize: 10,
                                        fontWeight: 600,
                                    }}
                                />
                                {trends.filter((t) => activeSubjects.has(t.subject)).map((t) => (
                                    <Line
                                        key={t.subject}
                                        type="monotone"
                                        dataKey={t.subject}
                                        stroke={t.color}
                                        strokeWidth={2}
                                        dot={{ r: 3, fill: t.color }}
                                        activeDot={{ r: 5 }}
                                        connectNulls
                                    />
                                ))}
                            </LineChart>
                        </ResponsiveContainer>
                    </div>
                ) : (
                    <div className="h-48 flex items-center justify-center text-center">
                        <div>
                            <TrendingUp className="w-8 h-8 text-slate-300 dark:text-slate-600 mx-auto mb-2" />
                            <p className="text-sm text-slate-500 dark:text-slate-400">
                                Perlu minimal 2 data point untuk menampilkan tren
                            </p>
                            <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">
                                Tambahkan lebih banyak penilaian untuk melihat grafik tren
                            </p>
                        </div>
                    </div>
                )}
            </CardContent>
        </Card>
    );
};
