import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '../../../services/supabase';
import { bintangService, calculateAspectPoints, BINTANG_THRESHOLDS, type BintangGrade } from '../../../services/bintangService';
import { CustomDropdown } from '../../ui/CustomDropdown';
import { gradeColors, aspectMeta } from './bintangConstants';
import { TrendingUp, TrendingDown, Minus, BarChart3 } from 'lucide-react';

// ─── Types ──────────────────────────────────────────────────────────────────

interface TrendMonth {
    month: string;
    label: string;
    ADAB: { points: number; grade: BintangGrade };
    KEDISIPLINAN: { points: number; grade: BintangGrade };
    KERAPIAN: { points: number; grade: BintangGrade };
}

type AspectKey = 'ADAB' | 'KEDISIPLINAN' | 'KERAPIAN';

interface BintangTrendChartProps {
    selectedClass: string;
}

const ASPECT_KEYS: AspectKey[] = ['ADAB', 'KEDISIPLINAN', 'KERAPIAN'];

const ASPECT_COLORS: Record<AspectKey, { stroke: string; area: string; dot: string }> = {
    ADAB: { stroke: '#6366f1', area: 'rgba(99,102,241,0.08)', dot: '#6366f1' },
    KEDISIPLINAN: { stroke: '#f59e0b', area: 'rgba(245,158,11,0.08)', dot: '#f59e0b' },
    KERAPIAN: { stroke: '#14b8a6', area: 'rgba(20,184,166,0.08)', dot: '#14b8a6' },
};

const ASPECT_LABELS: Record<AspectKey, string> = {
    ADAB: 'Adab',
    KEDISIPLINAN: 'Disiplin',
    KERAPIAN: 'Rapi',
};

const THRESHOLD_BANDS = [
    { max: 0, color: 'rgba(16,185,129,0.06)', label: 'A' },
    { min: 1, max: 10, color: 'rgba(59,130,246,0.06)', label: 'B' },
    { min: 11, max: 20, color: 'rgba(245,158,11,0.06)', label: 'C' },
    { min: 21, color: 'rgba(244,63,94,0.06)', label: 'D' },
];

// ─── Helpers ────────────────────────────────────────────────────────────────

function generatePastMonths(count: number): string[] {
    const months: string[] = [];
    const now = new Date();
    for (let i = count - 1; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        months.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
    }
    return months;
}

function monthLabel(month: string): string {
    const d = new Date(month + '-01');
    return d.toLocaleDateString('id-ID', { month: 'short' });
}

// ─── Component ──────────────────────────────────────────────────────────────

const BintangTrendChart: React.FC<BintangTrendChartProps> = ({ selectedClass }) => {
    const [students, setStudents] = useState<Array<{ id: string; name: string }>>([]);
    const [selectedStudent, setSelectedStudent] = useState(''); // '' means all students
    const [trendData, setTrendData] = useState<TrendMonth[]>([]);
    const [isLoading, setIsLoading] = useState(false);

    // Fetch students when class changes
    useEffect(() => {
        if (selectedClass) {
            (async () => {
                const { data } = await supabase
                    .from('students')
                    .select('id, name')
                    .eq('class_id', selectedClass)
                    .is('deleted_at', null)
                    .order('name');
                setStudents(data || []);
                setSelectedStudent(''); // reset to "all students"
            })();
        } else {
            setStudents([]);
            setSelectedStudent('');
        }
    }, [selectedClass]);

    // Fetch historical data
    useEffect(() => {
        if (!selectedClass) {
            setTrendData([]);
            return;
        }
        fetchTrendData();
    }, [selectedClass, selectedStudent]);

    const fetchTrendData = async () => {
        setIsLoading(true);
        try {
            const months = generatePastMonths(6);
            const results = await Promise.all(
                months.map(async (month) => {
                    let violations: Array<{ description: string; points: number }> = [];

                    if (selectedStudent) {
                        // Fetch for specific student
                        const data = await bintangService.getViolationsForStudent(selectedStudent, month);
                        violations = (data || []).map(v => ({ description: v.description, points: v.points }));
                    } else {
                        // Fetch for entire class
                        const data = await bintangService.getViolationsForClass(selectedClass, month);
                        violations = (data || []).map(v => ({ description: v.description, points: v.points }));
                    }

                    const points = calculateAspectPoints(violations);
                    return {
                        month,
                        label: monthLabel(month),
                        ADAB: { points: points.ADAB.points, grade: points.ADAB.grade },
                        KEDISIPLINAN: { points: points.KEDISIPLINAN.points, grade: points.KEDISIPLINAN.grade },
                        KERAPIAN: { points: points.KERAPIAN.points, grade: points.KERAPIAN.grade },
                    } as TrendMonth;
                })
            );
            setTrendData(results);
        } catch (error) {
            console.error('Failed to fetch trend data:', error);
        } finally {
            setIsLoading(false);
        }
    };

    // ── Chart computations ────────────────────────────────────────────────

    const chartDimensions = { width: 600, height: 280, padding: { top: 20, right: 20, bottom: 40, left: 40 } };

    const yScale = (points: number): number => {
        const { padding, height } = chartDimensions;
        const chartH = height - padding.top - padding.bottom;
        const maxY = 25; // max violation points on chart
        const y = padding.top + chartH - (Math.min(Math.max(points, 0), maxY) / maxY) * chartH;
        return y;
    };

    const xScale = (index: number): number => {
        const { padding, width } = chartDimensions;
        const chartW = width - padding.left - padding.right;
        const count = Math.max(trendData.length - 1, 1);
        return padding.left + (index / count) * chartW;
    };

    const getPath = (aspect: AspectKey): string => {
        if (trendData.length < 2) return '';
        return trendData.map((d, i) => {
            const x = xScale(i);
            const y = yScale(d[aspect].points);
            return `${i === 0 ? 'M' : 'L'} ${x} ${y}`;
        }).join(' ');
    };

    const getAreaPath = (aspect: AspectKey): string => {
        if (trendData.length < 2) return '';
        const start = trendData.map((d, i) => {
            const x = xScale(i);
            const y = yScale(d[aspect].points);
            return `${i === 0 ? 'M' : 'L'} ${x} ${y}`;
        }).join(' ');
        const lastX = xScale(trendData.length - 1);
        const firstX = xScale(0);
        return `${start} L ${lastX} ${yScale(0)} L ${firstX} ${yScale(0)} Z`;
    };

    // ── Trend stats ───────────────────────────────────────────────────────

    const trendStats = useMemo(() => {
        if (trendData.length < 2) return null;
        const first = trendData[0];
        const last = trendData[trendData.length - 1];

        return ASPECT_KEYS.map(aspect => {
            const diff = last[aspect].points - first[aspect].points;
            const direction: 'up' | 'down' | 'stable' =
                diff > 0 ? 'up' : diff < 0 ? 'down' : 'stable';
            return { aspect, diff, direction, firstGrade: first[aspect].grade, lastGrade: last[aspect].grade };
        });
    }, [trendData]);

    // ── Render ────────────────────────────────────────────────────────────

    return (
        <div className="space-y-6">
            {/* ─── Student Filter Only — class filter is shared from parent ── */}
            {selectedClass && students.length > 0 && (
                <div className="flex flex-col sm:flex-row gap-3">
                    <div className="flex-1 max-w-xs">
                        <CustomDropdown
                            value={selectedStudent}
                            onChange={setSelectedStudent}
                            placeholder="Semua Siswa"
                            options={[
                                { value: '', label: 'Semua Siswa (Rata-rata Kelas)' },
                                ...students.map(s => ({ value: s.id, label: s.name })),
                            ]}
                        />
                    </div>
                </div>
            )}

            {!selectedClass && (
                <div className="text-center py-12 text-slate-500 dark:text-slate-400">
                    <BarChart3 size={48} className="mx-auto mb-3 text-slate-300 dark:text-slate-600" />
                    <p className="font-medium">Pilih kelas untuk melihat tren bulanan</p>
                    <p className="text-sm mt-1">Grafik perkembangan Adab, Disiplin, dan Kerapian selama 6 bulan</p>
                </div>
            )}

            {isLoading && selectedClass && (
                <div className="text-center py-12 text-slate-500">Memuat data tren...</div>
            )}

            {!isLoading && selectedClass && trendData.length === 0 && (
                <div className="text-center py-12 text-slate-500">
                    <p className="font-medium">Belum ada data pelanggaran untuk kelas ini</p>
                    <p className="text-sm mt-1">Data akan muncul setelah ada pelanggaran yang tercatat</p>
                </div>
            )}

            {!isLoading && selectedClass && trendData.length > 0 && (
                <>
                    {/* ─── Trend Stats Cards ─────────────────────────────────── */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        {trendStats?.map(({ aspect, diff, direction, firstGrade, lastGrade }) => {
                            const meta = aspectMeta[aspect];
                            const Icon = meta.icon;
                            return (
                                <div key={aspect} className={`rounded-xl border ${meta.borderColor} ${meta.bgLight} p-3 sm:p-4`}>
                                    <div className="flex items-center justify-between mb-2">
                                        <div className="flex items-center gap-2">
                                            <Icon size={16} className={meta.color} />
                                            <span className="font-semibold text-xs sm:text-sm text-slate-700 dark:text-slate-200">
                                                {meta.label}
                                            </span>
                                        </div>
                                        <div className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${
                                            direction === 'up'
                                                ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300'
                                                : direction === 'down'
                                                    ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300'
                                                    : 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400'
                                        }`}>
                                            {direction === 'up' ? <TrendingUp size={12} /> : direction === 'down' ? <TrendingDown size={12} /> : <Minus size={12} />}
                                            <span>{diff !== 0 ? `${diff > 0 ? '+' : ''}${diff}` : '0'}</span>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-3 text-xs">
                                        <span className="text-slate-500 dark:text-slate-400">
                                            {trendData[0].label}: <span className={`font-bold ${gradeColors[firstGrade].split(' ')[1]}`}>{firstGrade}</span>
                                        </span>
                                        <span className="text-slate-300 dark:text-slate-600">→</span>
                                        <span className="text-slate-500 dark:text-slate-400">
                                            {trendData[trendData.length - 1].label}: <span className={`font-bold ${gradeColors[lastGrade].split(' ')[1]}`}>{lastGrade}</span>
                                        </span>
                                    </div>
                                </div>
                            );
                        })}
                    </div>

                    {/* ─── SVG Chart ──────────────────────────────────────────── */}
                    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4 sm:p-6 overflow-x-auto">
                        <div className="min-w-[480px]">
                            {/* Chart header */}
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="font-bold text-slate-800 dark:text-white text-sm sm:text-base">
                                    Tren Poin Pelanggaran (6 Bulan Terakhir)
                                </h3>
                            </div>

                            {/* Legend */}
                            <div className="flex flex-wrap gap-4 mb-4 text-xs">
                                {ASPECT_KEYS.map(aspect => {
                                    const meta = aspectMeta[aspect];
                                    return (
                                        <div key={aspect} className="flex items-center gap-1.5">
                                            <span
                                                className="w-3 h-3 rounded-full"
                                                style={{ backgroundColor: ASPECT_COLORS[aspect].stroke }}
                                            />
                                            <span className="text-slate-600 dark:text-slate-400 font-medium">
                                                {meta.label}
                                            </span>
                                        </div>
                                    );
                                })}
                            </div>

                            {/* Threshold legend */}
                            <div className="flex flex-wrap gap-2 mb-4 text-xxs text-slate-400">
                                {BINTANG_THRESHOLDS.map(t => (
                                    <span key={t.grade} className="flex items-center gap-1">
                                        <span className={`inline-flex px-1 py-0.5 rounded text-xxs font-bold ${gradeColors[t.grade]}`}>{t.grade}</span>
                                        {t.grade === 'A' ? '0' : t.grade === 'B' ? '1-10' : t.grade === 'C' ? '11-20' : '>20'} poin
                                    </span>
                                ))}
                            </div>

                            {/* SVG */}
                            <svg
                                viewBox={`0 0 ${chartDimensions.width} ${chartDimensions.height}`}
                                className="w-full"
                                style={{ maxHeight: '300px' }}
                            >
                                {/* Threshold bands */}
                                {THRESHOLD_BANDS.map((band, i) => {                    // SVG y increases downward: top of band = yScale(max), bottom = yScale(min)
                    const yTop = band.max !== undefined ? yScale(band.max) : yScale(0);
                    const yBottom = band.min !== undefined ? yScale(band.min) : yScale(25);
                    const h = yBottom - yTop;
                                    return (
                                        <rect
                                            key={i}
                                            x={chartDimensions.padding.left}
                                            y={yTop}
                                            width={chartDimensions.width - chartDimensions.padding.left - chartDimensions.padding.right}
                                            height={Math.max(h, 0)}
                                            fill={band.color}
                                        />
                                    );
                                })}

                                {/* Horizontal grid lines */}
                                {[0, 5, 10, 15, 20, 25].map(val => (
                                    <g key={val}>
                                        <line
                                            x1={chartDimensions.padding.left}
                                            y1={yScale(val)}
                                            x2={chartDimensions.width - chartDimensions.padding.right}
                                            y2={yScale(val)}
                                            stroke="currentColor"
                                            strokeOpacity="0.1"
                                            strokeDasharray="4 4"
                                            className="text-slate-400"
                                        />
                                        <text
                                            x={chartDimensions.padding.left - 6}
                                            y={yScale(val) + 4}
                                            fontSize="9"
                                            textAnchor="end"
                                            fill="currentColor"
                                            className="text-slate-400 fill-slate-400"
                                        >
                                            {val}
                                        </text>
                                    </g>
                                ))}

                                {/* Y-axis label */}
                                <text
                                    x={12}
                                    y={chartDimensions.height / 2}
                                    fontSize="9"
                                    textAnchor="middle"
                                    transform={`rotate(-90, 12, ${chartDimensions.height / 2})`}
                                    className="fill-slate-400"
                                >
                                    Poin
                                </text>

                                {/* Area fills */}
                                {ASPECT_KEYS.map(aspect => (
                                    <path
                                        key={`area-${aspect}`}
                                        d={getAreaPath(aspect)}
                                        fill={ASPECT_COLORS[aspect].area}
                                    />
                                ))}

                                {/* Lines */}
                                {ASPECT_KEYS.map(aspect => (
                                    <path
                                        key={`line-${aspect}`}
                                        d={getPath(aspect)}
                                        fill="none"
                                        stroke={ASPECT_COLORS[aspect].stroke}
                                        strokeWidth="2.5"
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                    />
                                ))}

                                {/* Data points */}
                                {trendData.map((d, i) => {
                                    const x = xScale(i);
                                    return ASPECT_KEYS.map(aspect => {
                                        const y = yScale(d[aspect].points);
                                        return (
                                            <g key={`dot-${aspect}-${i}`}>
                                                <circle
                                                    cx={x}
                                                    cy={y}
                                                    r="4"
                                                    fill="white"
                                                    stroke={ASPECT_COLORS[aspect].stroke}
                                                    strokeWidth="2"
                                                    className="cursor-pointer hover:r-6 transition-all"
                                                />
                                                {/* Tooltip on hover — using title for simplicity */}
                                                <title>{`${ASPECT_LABELS[aspect]} • ${d.label}: ${d[aspect].points} poin (${d[aspect].grade})`}</title>
                                            </g>
                                        );
                                    });
                                })}

                                {/* X-axis labels */}
                                {trendData.map((d, i) => (
                                    <text
                                        key={`xlabel-${i}`}
                                        x={xScale(i)}
                                        y={chartDimensions.height - 8}
                                        fontSize="10"
                                        textAnchor="middle"
                                        className="fill-slate-500 text-slate-500"
                                    >
                                        {d.label}
                                    </text>
                                ))}
                            </svg>

                            {/* Threshold labels */}
                            <div className="flex justify-between text-xxs text-slate-400 mt-2 px-10">
                                <span className="text-emerald-500 font-medium">A (Sangat Baik)</span>
                                <span className="text-blue-500 font-medium">B (Baik)</span>
                                <span className="text-amber-500 font-medium">C (Cukup)</span>
                                <span className="text-rose-500 font-medium">D (Kurang)</span>
                            </div>
                        </div>
                    </div>

                    {/* ─── Data Table ─────────────────────────────────────────────── */}
                    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
                        <div className="px-4 sm:px-6 py-3 border-b border-slate-200 dark:border-slate-800">
                            <h3 className="font-bold text-sm text-slate-700 dark:text-slate-300">
                                Data Per Bulan
                            </h3>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse text-xs sm:text-sm">
                                <thead>
                                    <tr className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-700">
                                        <th className="py-2 px-3 sm:px-4 font-semibold text-slate-600 dark:text-slate-300">Bulan</th>
                                        {ASPECT_KEYS.map(aspect => (
                                            <React.Fragment key={aspect}>
                                                <th className="py-2 px-2 font-semibold text-slate-600 dark:text-slate-300 text-center">{ASPECT_LABELS[aspect]} Poin</th>
                                                <th className="py-2 px-2 font-semibold text-slate-600 dark:text-slate-300 text-center">{ASPECT_LABELS[aspect]} Grade</th>
                                            </React.Fragment>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody>
                                    {trendData.map((d) => (
                                        <tr key={d.month} className="border-b border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors">
                                            <td className="py-2 px-3 sm:px-4 font-medium text-slate-800 dark:text-slate-200 whitespace-nowrap">
                                                {d.label}
                                            </td>
                                            {ASPECT_KEYS.map(aspect => (
                                                <React.Fragment key={aspect}>
                                                    <td className="py-2 px-2 text-center text-slate-700 dark:text-slate-300">
                                                        {d[aspect].points}
                                                    </td>
                                                    <td className="py-2 px-2 text-center">
                                                        <span className={`inline-flex px-1.5 py-0.5 rounded-full text-xxs sm:text-xs font-bold ring-1 ${gradeColors[d[aspect].grade]}`}>
                                                            {d[aspect].grade}
                                                        </span>
                                                    </td>
                                                </React.Fragment>
                                            ))}
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </>
            )}
        </div>
    );
};

export default BintangTrendChart;
