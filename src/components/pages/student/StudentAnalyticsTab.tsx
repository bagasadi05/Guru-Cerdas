import React, { useMemo } from 'react';
import { AcademicRecordRow } from './types';
import { BarChart2Icon, RadarIcon } from 'lucide-react';

interface StudentAnalyticsTabProps {
    academicRecords: AcademicRecordRow[];
    classAverages?: Record<string, number>; // Optional: subject -> class average
}

// Helper to calculate polygon points for a radar chart
const calculateRadarPoints = (values: number[], max: number, centerX: number, centerY: number, radius: number): string => {
    const n = values.length;
    if (n === 0) return '';
    const angleStep = (2 * Math.PI) / n;
    const points = values.map((value, i) => {
        const angle = i * angleStep - Math.PI / 2; // Start from top
        const ratio = value / max;
        const x = centerX + radius * ratio * Math.cos(angle);
        const y = centerY + radius * ratio * Math.sin(angle);
        return `${x},${y}`;
    });
    return points.join(' ');
};

const calculateAxisEndpoints = (n: number, centerX: number, centerY: number, radius: number): { x1: number; y1: number; x2: number; y2: number }[] => {
    if (n === 0) return [];
    const angleStep = (2 * Math.PI) / n;
    return Array.from({ length: n }).map((_, i) => {
        const angle = i * angleStep - Math.PI / 2;
        return {
            x1: centerX,
            y1: centerY,
            x2: centerX + radius * Math.cos(angle),
            y2: centerY + radius * Math.sin(angle),
        };
    });
};

const calculateLabelPositions = (labels: string[], centerX: number, centerY: number, radius: number): { x: number; y: number; label: string }[] => {
    const n = labels.length;
    if (n === 0) return [];
    const angleStep = (2 * Math.PI) / n;
    return labels.map((label, i) => {
        const angle = i * angleStep - Math.PI / 2;
        const offset = 15;
        return {
            x: centerX + (radius + offset) * Math.cos(angle),
            y: centerY + (radius + offset) * Math.sin(angle),
            label,
        };
    });
};

export const StudentAnalyticsTab: React.FC<StudentAnalyticsTabProps> = ({
    academicRecords,
    classAverages,
}) => {
    // Calculate average score per subject
    const subjectAverages = useMemo(() => {
        const subjectMap: Record<string, { total: number; count: number }> = {};
        academicRecords.forEach(record => {
            const subject = record.subject || 'Lainnya';
            if (!subjectMap[subject]) {
                subjectMap[subject] = { total: 0, count: 0 };
            }
            subjectMap[subject].total += record.score;
            subjectMap[subject].count++;
        });
        return Object.entries(subjectMap).map(([subject, data]) => ({
            subject,
            average: Math.round(data.total / data.count),
        }));
    }, [academicRecords]);

    const subjects = subjectAverages.map(s => s.subject);
    const studentScores = subjectAverages.map(s => s.average);
    const overallAverage = studentScores.length > 0
        ? Math.round(studentScores.reduce((a, b) => a + b, 0) / studentScores.length)
        : 0;

    // Radar chart dimensions
    const chartSize = 280;
    const centerX = chartSize / 2;
    const centerY = chartSize / 2;
    const radius = chartSize / 2 - 40;
    const maxScore = 100;

    const gridLevels = [20, 40, 60, 80, 100];
    const axisEndpoints = calculateAxisEndpoints(subjects.length, centerX, centerY, radius);
    const labelPositions = calculateLabelPositions(subjects, centerX, centerY, radius);
    const studentPolygonPoints = calculateRadarPoints(studentScores, maxScore, centerX, centerY, radius);

    if (academicRecords.length === 0) {
        return (
            <div className="p-6 text-center text-slate-500 dark:text-slate-400">
                <BarChart2Icon className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p className="font-medium">Belum ada data nilai untuk ditampilkan.</p>
                <p className="text-sm">Tambahkan nilai akademik untuk melihat analitik.</p>
            </div>
        );
    }

    return (
        <div className="p-4 md:p-6 pb-24 lg:pb-6 space-y-8">
            {/* Header */}
            <div className="flex items-center gap-3">
                <div className="p-2 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl text-white">
                    <RadarIcon className="w-6 h-6" />
                </div>
                <div>
                    <h3 className="text-lg font-bold text-slate-900 dark:text-white">Analitik Akademik</h3>
                    <p className="text-sm text-slate-500 dark:text-slate-400">Visualisasi performa per mata pelajaran</p>
                </div>
            </div>

            {/* Main Content Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Radar Chart Card */}
                <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700 p-5 shadow-sm">
                    <h4 className="font-semibold text-slate-800 dark:text-slate-200 mb-4">Spider Chart: Performa per Mapel</h4>
                    <div className="flex justify-center">
                        <svg width={chartSize} height={chartSize} className="overflow-visible">
                            {/* Grid circles */}
                            {gridLevels.map(level => (
                                <polygon
                                    key={level}
                                    points={calculateRadarPoints(
                                        subjects.map(() => level),
                                        maxScore,
                                        centerX,
                                        centerY,
                                        radius
                                    )}
                                    fill="none"
                                    stroke="currentColor"
                                    strokeWidth="1"
                                    className="text-slate-200 dark:text-slate-700"
                                />
                            ))}

                            {/* Axis lines */}
                            {axisEndpoints.map((axis, i) => (
                                <line
                                    key={i}
                                    x1={axis.x1}
                                    y1={axis.y1}
                                    x2={axis.x2}
                                    y2={axis.y2}
                                    stroke="currentColor"
                                    strokeWidth="1"
                                    className="text-slate-200 dark:text-slate-700"
                                />
                            ))}

                            {/* Student score polygon */}
                            <polygon
                                points={studentPolygonPoints}
                                fill="rgba(99, 102, 241, 0.3)"
                                stroke="rgb(99, 102, 241)"
                                strokeWidth="2"
                            />

                            {/* Data points */}
                            {subjects.map((_, i) => {
                                const angle = i * (2 * Math.PI / subjects.length) - Math.PI / 2;
                                const ratio = studentScores[i] / maxScore;
                                const x = centerX + radius * ratio * Math.cos(angle);
                                const y = centerY + radius * ratio * Math.sin(angle);
                                return (
                                    <circle
                                        key={i}
                                        cx={x}
                                        cy={y}
                                        r="5"
                                        fill="white"
                                        stroke="rgb(99, 102, 241)"
                                        strokeWidth="2"
                                    />
                                );
                            })}

                            {/* Labels */}
                            {labelPositions.map((pos, i) => (
                                <text
                                    key={i}
                                    x={pos.x}
                                    y={pos.y}
                                    textAnchor="middle"
                                    dominantBaseline="middle"
                                    className="text-[10px] font-medium fill-slate-600 dark:fill-slate-400"
                                >
                                    {pos.label.length > 10 ? pos.label.substring(0, 10) + '...' : pos.label}
                                </text>
                            ))}
                        </svg>
                    </div>
                    <p className="text-center text-xs text-slate-500 dark:text-slate-400 mt-3">
                        Rata-rata: <span className="font-bold text-indigo-600 dark:text-indigo-400">{overallAverage}</span>
                    </p>
                </div>

                {/* Bar Chart Card */}
                <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700 p-5 shadow-sm">
                    <h4 className="font-semibold text-slate-800 dark:text-slate-200 mb-4">Nilai per Mata Pelajaran</h4>
                    <div className="space-y-3">
                        {subjectAverages.map((item, index) => (
                            <div key={index}>
                                <div className="flex justify-between text-sm mb-1">
                                    <span className="font-medium text-slate-700 dark:text-slate-300">{item.subject}</span>
                                    <span className={`font-bold ${item.average >= 75 ? 'text-emerald-600' : item.average >= 60 ? 'text-amber-600' : 'text-rose-600'}`}>
                                        {item.average}
                                    </span>
                                </div>
                                <div className="h-3 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                                    <div
                                        className={`h-full rounded-full transition-all duration-500 ${item.average >= 75 ? 'bg-gradient-to-r from-emerald-400 to-emerald-500' : item.average >= 60 ? 'bg-gradient-to-r from-amber-400 to-amber-500' : 'bg-gradient-to-r from-rose-400 to-rose-500'}`}
                                        style={{ width: `${item.average}%` }}
                                    />
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Summary Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl p-4 text-white shadow-lg shadow-indigo-500/20">
                    <p className="text-xs opacity-80">Rata-rata Keseluruhan</p>
                    <p className="text-2xl font-bold">{overallAverage}</p>
                </div>
                <div className="bg-gradient-to-br from-emerald-500 to-green-600 rounded-xl p-4 text-white shadow-lg shadow-emerald-500/20">
                    <p className="text-xs opacity-80">Nilai Tertinggi</p>
                    <p className="text-2xl font-bold">{Math.max(...studentScores, 0)}</p>
                </div>
                <div className="bg-gradient-to-br from-amber-500 to-orange-600 rounded-xl p-4 text-white shadow-lg shadow-amber-500/20">
                    <p className="text-xs opacity-80">Nilai Terendah</p>
                    <p className="text-2xl font-bold">{Math.min(...studentScores, 0)}</p>
                </div>
                <div className="bg-gradient-to-br from-slate-600 to-slate-700 rounded-xl p-4 text-white shadow-lg shadow-slate-500/20">
                    <p className="text-xs opacity-80">Jumlah Mapel</p>
                    <p className="text-2xl font-bold">{subjects.length}</p>
                </div>
            </div>
        </div>
    );
};

export default StudentAnalyticsTab;
