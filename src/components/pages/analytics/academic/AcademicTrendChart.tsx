import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../../../ui/Card';
import { TrendingUp, Sparkles, CheckCircle, AlertTriangle, Calendar, Layers } from 'lucide-react';
import {
    LineChart,
    Line,
    BarChart,
    Bar,
    Cell,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    ReferenceLine,
    LabelList,
} from 'recharts';
import {
    calculateAcademicTrends,
    type SubjectTrendData,
    type AcademicTrendMode,
} from '../../../../services/academicAnalyticsService';
import type { AnalyticsAcademicRecord } from '../types';

interface AcademicTrendChartProps {
    trends: SubjectTrendData[];
    kktpThreshold: number;
    academicRecords?: AnalyticsAcademicRecord[];
    subjects?: string[];
}

interface CustomTooltipItem {
    name: string;
    value: number;
    color: string;
}

const CustomLineTooltip: React.FC<{
    active?: boolean;
    payload?: Array<{ name: string; value: number; color: string }>;
    label?: string;
    kktpThreshold: number;
    mode: AcademicTrendMode;
}> = ({ active, payload, label, kktpThreshold, mode }) => {
    if (!active || !payload || payload.length === 0) return null;

    const sortedItems = [...payload]
        .filter((item): item is CustomTooltipItem => typeof item.value === 'number')
        .sort((a, b) => b.value - a.value);

    return (
        <div className="rounded-2xl border border-slate-700/80 bg-slate-900/95 p-3.5 shadow-xl backdrop-blur-md text-xs text-white min-w-[200px] z-50">
            <div className="flex items-center justify-between gap-2 pb-2 mb-2 border-b border-slate-800">
                <span className="font-bold text-slate-300 flex items-center gap-1.5">
                    {mode === 'assessment' ? (
                        <>
                            <Layers className="w-3.5 h-3.5 text-brand-400" />
                            Asesmen: {label}
                        </>
                    ) : (
                        <>
                            <Calendar className="w-3.5 h-3.5 text-brand-400" />
                            Periode: {label}
                        </>
                    )}
                </span>
                <span className="text-[10px] text-slate-400 font-medium">KKTP: {kktpThreshold}</span>
            </div>
            <div className="space-y-1.5">
                {sortedItems.map((item) => {
                    const isPassing = item.value >= kktpThreshold;
                    return (
                        <div key={item.name} className="flex items-center justify-between gap-3">
                            <div className="flex items-center gap-2 min-w-0">
                                <span
                                    className="w-2.5 h-2.5 rounded-full shrink-0 shadow-xs"
                                    style={{ backgroundColor: item.color }}
                                />
                                <span className="text-slate-200 truncate font-medium">{item.name}</span>
                            </div>
                            <div className="flex items-center gap-1.5 shrink-0">
                                <span className="font-bold text-white text-sm">{item.value}</span>
                                {isPassing ? (
                                    <span className="text-[10px] font-semibold text-emerald-400 bg-emerald-950/60 px-1.5 py-0.5 rounded border border-emerald-800/40">
                                        ✓ Tuntas
                                    </span>
                                ) : (
                                    <span className="text-[10px] font-semibold text-rose-400 bg-rose-950/60 px-1.5 py-0.5 rounded border border-rose-800/40">
                                        &lt; KKTP
                                    </span>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

const CustomBarTooltip: React.FC<{
    active?: boolean;
    payload?: Array<{ payload: { subject: string; average: number; count: number; diff: number; isAboveKKTP: boolean } }>;
    kktpThreshold: number;
}> = ({ active, payload, kktpThreshold }) => {
    if (!active || !payload || payload.length === 0) return null;
    const data = payload[0].payload;
    const diff = data.diff;

    return (
        <div className="rounded-2xl border border-slate-700/80 bg-slate-900/95 p-3.5 shadow-xl backdrop-blur-md text-xs text-white min-w-[190px] z-50">
            <p className="font-bold text-slate-200 mb-1.5 text-[13px]">{data.subject}</p>
            <div className="space-y-1">
                <div className="flex items-center justify-between gap-4">
                    <span className="text-slate-400">Rata-rata Kelas:</span>
                    <span className="text-base font-black text-white">{data.average}</span>
                </div>
                {data.count > 0 && (
                    <div className="flex items-center justify-between gap-4 text-[11px]">
                        <span className="text-slate-400">Siswa Dinilai:</span>
                        <span className="text-slate-200 font-semibold">{data.count} siswa</span>
                    </div>
                )}
                <div className="pt-1.5 mt-1 border-t border-slate-800 flex items-center justify-between gap-2">
                    <span className="text-slate-400 text-[11px]">Target KKTP ({kktpThreshold}):</span>
                    {data.isAboveKKTP ? (
                        <span className="text-[11px] font-bold text-emerald-400 flex items-center gap-1">
                            <CheckCircle className="w-3 h-3" />
                            +{diff} di atas
                        </span>
                    ) : (
                        <span className="text-[11px] font-bold text-rose-400 flex items-center gap-1">
                            <AlertTriangle className="w-3 h-3" />
                            {diff} di bawah
                        </span>
                    )}
                </div>
            </div>
        </div>
    );
};

export const AcademicTrendChart: React.FC<AcademicTrendChartProps> = ({
    trends,
    kktpThreshold,
    academicRecords,
    subjects,
}) => {
    const [viewMode, setViewMode] = useState<AcademicTrendMode>('weekly');

    // Dynamically compute trends when academicRecords and subjects are passed and viewMode changes
    const currentTrends = useMemo<SubjectTrendData[]>(() => {
        if (academicRecords && subjects && subjects.length > 0) {
            return calculateAcademicTrends(academicRecords, subjects, viewMode);
        }
        return trends;
    }, [academicRecords, subjects, viewMode, trends]);

    const [activeSubjects, setActiveSubjects] = useState<Set<string>>(
        new Set(currentTrends.map((t) => t.subject))
    );
    const knownSubjects = useRef(new Set(currentTrends.map((t) => t.subject)));

    useEffect(() => {
        const availableSubjects = new Set(currentTrends.map((trend) => trend.subject));
        const addedSubjects = currentTrends
            .map((trend) => trend.subject)
            .filter((subject) => !knownSubjects.current.has(subject));

        setActiveSubjects((current) => {
            const next = new Set([...current].filter((subject) => availableSubjects.has(subject)));
            addedSubjects.forEach((subject) => next.add(subject));
            return next;
        });
        knownSubjects.current = availableSubjects;
    }, [currentTrends]);

    // Merge and continuously fill all trend data across the timeline (forward-fill & backward-fill)
    // This ensures every active subject has continuous, unbroken lines rather than isolated dots or truncated lines.
    const chartData = useMemo(() => {
        // 1. Collect all distinct timeline slots across all trends
        const slotMap = new Map<string, { label: string; date: string; orderDate: string }>();
        currentTrends.forEach((t) => {
            t.data.forEach((point) => {
                const key = point.label;
                if (!slotMap.has(key)) {
                    slotMap.set(key, { label: point.label, date: point.date, orderDate: point.date });
                }
            });
        });

        const sortedSlots = Array.from(slotMap.values()).sort((a, b) =>
            a.orderDate.localeCompare(b.orderDate)
        );

        if (sortedSlots.length === 0) return [];

        // 2. Pre-index each trend's recorded points by slot label
        const subjectPoints = new Map<string, Map<string, number>>();
        currentTrends.forEach((t) => {
            const m = new Map<string, number>();
            t.data.forEach((p) => m.set(p.label, p.average));
            subjectPoints.set(t.subject, m);
        });

        // 3. For each active subject, compute continuous values across all timeline slots
        const filledSeries = new Map<string, number[]>();
        activeSubjects.forEach((subject) => {
            const pMap = subjectPoints.get(subject);
            if (!pMap || pMap.size === 0) return;

            // Pass 1: Forward-fill (carry forward previous test score if no new assessment yet)
            let lastVal: number | null = null;
            const values: (number | null)[] = [];
            sortedSlots.forEach((slot) => {
                const val = pMap.get(slot.label);
                if (typeof val === 'number') {
                    lastVal = val;
                    values.push(val);
                } else {
                    values.push(lastVal);
                }
            });

            // Pass 2: Back-fill for leading nulls (baseline from first recorded assessment)
            const firstNonNull = values.find((v): v is number => v !== null) ?? null;
            const fullyFilled = values.map((v) => (v !== null ? v : firstNonNull));

            if (fullyFilled.length > 0 && fullyFilled[0] !== null) {
                filledSeries.set(subject, fullyFilled as number[]);
            }
        });

        // 4. Construct rows for Recharts
        return sortedSlots.map((slot, idx) => {
            const row: Record<string, number | string> = {
                label: slot.label,
                date: slot.date,
                orderDate: slot.orderDate,
            };
            filledSeries.forEach((values, subject) => {
                row[subject] = values[idx];
            });
            return row;
        });
    }, [currentTrends, activeSubjects]);

    // Calculate dynamic Y-axis min score to avoid flat squished graphs at top
    const { minScore } = useMemo(() => {
        let min = 100;
        chartData.forEach((row) => {
            Object.entries(row).forEach(([k, v]) => {
                if (k !== 'label' && k !== 'date' && k !== 'orderDate' && typeof v === 'number') {
                    if (v < min) min = v;
                }
            });
        });
        return { minScore: min === 100 ? 50 : min };
    }, [chartData]);

    const yMin = Math.max(0, Math.min(Math.floor((kktpThreshold - 20) / 10) * 10, Math.floor((minScore - 10) / 10) * 10));

    // Data for single-assessment benchmark bar chart when chartData.length === 1
    const barData = useMemo(() => {
        if (chartData.length !== 1) return [];
        const currentLabel = (chartData[0]?.label as string) || 'Penilaian';
        return currentTrends
            .filter((t) => activeSubjects.has(t.subject))
            .map((t) => {
                const point = t.data[0];
                const avg = point ? point.average : 0;
                return {
                    subject: t.subject,
                    average: avg,
                    count: point ? point.count : 0,
                    color: t.color,
                    label: currentLabel,
                    isAboveKKTP: avg >= kktpThreshold,
                    diff: avg - kktpThreshold,
                };
            })
            .sort((a, b) => b.average - a.average);
    }, [chartData, currentTrends, activeSubjects, kktpThreshold]);

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

    if (currentTrends.length === 0) return null;

    const hasMultiplePoints = chartData.length >= 2;
    const hasSinglePoint = chartData.length === 1;

    return (
        <Card className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800/80 shadow-md">
            <CardHeader className="pb-2.5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <CardTitle className="flex items-center gap-2.5 text-base font-bold text-slate-900 dark:text-white">
                        <div className="w-8 h-8 rounded-xl bg-brand-500/10 dark:bg-brand-500/20 text-brand-600 dark:text-brand-400 flex items-center justify-center border border-brand-500/20 shadow-xs">
                            <TrendingUp className="w-4 h-4" />
                        </div>
                        <div>
                            <span>Tren Nilai Per Mapel</span>
                            <p className="text-xs text-slate-500 dark:text-slate-400 font-normal mt-0.5">
                                {hasSinglePoint
                                    ? `Komparasi capaian nilai pada asesmen ${chartData[0]?.label}`
                                    : 'Pergerakan nilai antar penilaian terhadap target KKTP'}
                            </p>
                        </div>
                    </CardTitle>

                    {/* Mode Toggle Switch: Mingguan vs Bulanan vs Per Asesmen */}
                    {academicRecords && (
                        <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl border border-slate-200 dark:border-slate-700/70 text-xs self-start sm:self-auto">
                            <button
                                type="button"
                                onClick={() => setViewMode('weekly')}
                                className={`px-3 py-1.5 rounded-lg font-semibold transition-all cursor-pointer ${
                                    viewMode === 'weekly'
                                        ? 'bg-white dark:bg-slate-900 text-brand-600 dark:text-brand-400 shadow-xs'
                                        : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'
                                }`}
                            >
                                Mingguan
                            </button>
                            <button
                                type="button"
                                onClick={() => setViewMode('monthly')}
                                className={`px-3 py-1.5 rounded-lg font-semibold transition-all cursor-pointer ${
                                    viewMode === 'monthly'
                                        ? 'bg-white dark:bg-slate-900 text-brand-600 dark:text-brand-400 shadow-xs'
                                        : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'
                                }`}
                            >
                                Bulanan
                            </button>
                            <button
                                type="button"
                                onClick={() => setViewMode('assessment')}
                                className={`px-3 py-1.5 rounded-lg font-semibold transition-all cursor-pointer ${
                                    viewMode === 'assessment'
                                        ? 'bg-white dark:bg-slate-900 text-brand-600 dark:text-brand-400 shadow-xs'
                                        : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'
                                }`}
                            >
                                Per Asesmen
                            </button>
                        </div>
                    )}
                </div>

                {/* Subject Legend Toggles with latest grade badges */}
                <div className="flex flex-wrap gap-2 mt-3 pt-2 border-t border-slate-100 dark:border-slate-800">
                    {currentTrends.map((t) => {
                        const isActive = activeSubjects.has(t.subject);
                        const latestPoint = t.data[t.data.length - 1];
                        return (
                            <button
                                key={t.subject}
                                type="button"
                                onClick={() => toggleSubject(t.subject)}
                                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-all border cursor-pointer ${
                                    isActive
                                        ? 'shadow-xs border-transparent'
                                        : 'border-slate-200 dark:border-slate-700/60 opacity-40 hover:opacity-75 bg-slate-50 dark:bg-slate-800 text-slate-500'
                                }`}
                                style={
                                    isActive
                                        ? {
                                              backgroundColor: `${t.color}15`,
                                              color: t.color,
                                              borderColor: `${t.color}40`,
                                          }
                                        : undefined
                                }
                            >
                                <span
                                    className="w-2.5 h-2.5 rounded-full shrink-0 shadow-xs"
                                    style={{ backgroundColor: t.color }}
                                />
                                <span>{t.subject}</span>
                                {isActive && latestPoint && (
                                    <span
                                        className="text-[10px] font-bold px-1.5 py-0.2 rounded-md bg-white/80 dark:bg-slate-900/80 border border-current ml-0.5"
                                    >
                                        {latestPoint.average}
                                    </span>
                                )}
                            </button>
                        );
                    })}
                </div>
            </CardHeader>

            <CardContent className="pt-2">
                {hasMultiplePoints ? (
                    // Multiple points -> Render LineChart multi-series trend
                    <div className="h-68">
                        <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={chartData} margin={{ top: 20, right: 25, left: 0, bottom: 5 }}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" className="dark:stroke-slate-800/80" />
                                <XAxis
                                    dataKey="label"
                                    tick={{ fontSize: 11, fill: '#94a3b8' }}
                                    tickLine={false}
                                    axisLine={{ stroke: '#e2e8f0' }}
                                />
                                <YAxis
                                    domain={[yMin, 100]}
                                    tick={{ fontSize: 11, fill: '#94a3b8' }}
                                    tickLine={false}
                                    axisLine={false}
                                />
                                <Tooltip
                                    content={
                                        <CustomLineTooltip
                                            kktpThreshold={kktpThreshold}
                                            mode={viewMode}
                                        />
                                    }
                                />
                                <ReferenceLine
                                    y={kktpThreshold}
                                    stroke="#f59e0b"
                                    strokeDasharray="5 5"
                                    strokeWidth={1.5}
                                    label={{
                                        value: `Batas KKTP (${kktpThreshold})`,
                                        position: 'insideTopRight',
                                        fill: '#f59e0b',
                                        fontSize: 11,
                                        fontWeight: 700,
                                        offset: 10,
                                    }}
                                />
                                {currentTrends
                                    .filter((t) => activeSubjects.has(t.subject))
                                    .map((t) => (
                                        <Line
                                            key={t.subject}
                                            type="monotone"
                                            dataKey={t.subject}
                                            name={t.subject}
                                            stroke={t.color}
                                            strokeWidth={2.5}
                                            dot={{ r: 4, fill: t.color, strokeWidth: 1.5, stroke: '#fff' }}
                                            activeDot={{ r: 6, stroke: '#fff', strokeWidth: 2 }}
                                            connectNulls
                                        />
                                    ))}
                            </LineChart>
                        </ResponsiveContainer>
                    </div>
                ) : hasSinglePoint ? (
                    // Single assessment -> Render BarChart benchmark against KKTP to avoid floating single dots
                    <div>
                        <div className="h-64">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={barData} margin={{ top: 25, right: 25, left: -15, bottom: 10 }}>
                                    <CartesianGrid
                                        strokeDasharray="3 3"
                                        stroke="#e2e8f0"
                                        className="dark:stroke-slate-800/80"
                                        vertical={false}
                                    />
                                    <XAxis
                                        dataKey="subject"
                                        tick={{ fontSize: 11, fill: '#94a3b8' }}
                                        tickLine={false}
                                        axisLine={{ stroke: '#e2e8f0' }}
                                    />
                                    <YAxis
                                        domain={[yMin, 100]}
                                        tick={{ fontSize: 11, fill: '#94a3b8' }}
                                        tickLine={false}
                                        axisLine={false}
                                    />
                                    <ReferenceLine
                                        y={kktpThreshold}
                                        stroke="#f59e0b"
                                        strokeDasharray="5 5"
                                        strokeWidth={1.5}
                                        label={{
                                            value: `Batas KKTP (${kktpThreshold})`,
                                            position: 'insideTopRight',
                                            fill: '#f59e0b',
                                            fontSize: 11,
                                            fontWeight: 700,
                                            offset: 8,
                                        }}
                                    />
                                    <Tooltip content={<CustomBarTooltip kktpThreshold={kktpThreshold} />} />
                                    <Bar dataKey="average" radius={[8, 8, 0, 0]} maxBarSize={52}>
                                        {barData.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={entry.color} />
                                        ))}
                                        <LabelList
                                            dataKey="average"
                                            position="top"
                                            fill="#475569"
                                            className="dark:fill-slate-200"
                                            fontSize={12}
                                            fontWeight={700}
                                            formatter={(val: unknown) => `${val}`}
                                        />
                                    </Bar>
                                </BarChart>
                            </ResponsiveContainer>
                        </div>

                        {/* Informative notification banner */}
                        <div className="mt-3 p-3 rounded-2xl bg-brand-500/10 dark:bg-brand-500/15 border border-brand-500/20 text-xs text-brand-800 dark:text-brand-300 flex items-center justify-between gap-3">
                            <div className="flex items-center gap-2.5">
                                <Sparkles className="w-4 h-4 text-brand-600 dark:text-brand-400 shrink-0" />
                                <span>
                                    <strong>Capaian Asesmen {chartData[0]?.label || 'PH 1'}:</strong> Menampilkan perbandingan nilai rata-rata tiap mapel terhadap target KKTP ({kktpThreshold}). Grafik garis tren perkembangan akan aktif otomatis begitu penilaian berikutnya (PH 2) diinput.
                                </span>
                            </div>
                        </div>
                    </div>
                ) : (
                    // Empty state
                    <div className="h-48 flex items-center justify-center text-center">
                        <div>
                            <TrendingUp className="w-8 h-8 text-slate-300 dark:text-slate-600 mx-auto mb-2" />
                            <p className="text-sm text-slate-500 dark:text-slate-400 font-medium">
                                Belum ada data penilaian tercatat
                            </p>
                            <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">
                                Input penilaian siswa melalui menu Input Penilaian untuk melihat grafik capaian dan tren
                            </p>
                        </div>
                    </div>
                )}
            </CardContent>
        </Card>
    );
};
export default AcademicTrendChart;
