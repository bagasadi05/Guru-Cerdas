import React, { useState } from 'react';
import {
    LineChart,
    Line,
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    Legend,
    ResponsiveContainer,
    TooltipProps,
} from 'recharts';
import { TrendingUpIcon, TrendingDownIcon, MinusIcon, DownloadIcon } from 'lucide-react';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

interface AttendanceTrendData {
    label: string;
    percentage: number;
}

interface GradeDistributionData {
    label: string;
    count: number;
    color: string;
}

interface ClassComparisonData {
    className: string;
    attendanceRate: number;
    averageGrade: number;
}

// Custom Tooltip Component
const CustomTooltip: React.FC<TooltipProps<number, string>> = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
        return (
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-3 shadow-xl">
                <p className="font-medium text-slate-900 dark:text-white mb-1">{label}</p>
                {payload.map((entry, index) => (
                    <p key={index} className="text-sm" style={{ color: entry.color }}>
                        {entry.name}: <span className="font-bold">{entry.value}%</span>
                    </p>
                ))}
            </div>
        );
    }
    return null;
};

// Export Chart Functions
const exportToPNG = async (elementId: string, filename: string) => {
    const element = document.getElementById(elementId);
    if (!element) return;

    const canvas = await html2canvas(element, {
        backgroundColor: '#ffffff',
        scale: 2,
    });

    const link = document.createElement('a');
    link.download = `${filename}.png`;
    link.href = canvas.toDataURL();
    link.click();
};

const exportToPDF = async (elementId: string, filename: string) => {
    const element = document.getElementById(elementId);
    if (!element) return;

    const canvas = await html2canvas(element, {
        backgroundColor: '#ffffff',
        scale: 2,
    });

    const imgData = canvas.toDataURL('image/png');
    const pdf = new jsPDF({
        orientation: 'landscape',
        unit: 'px',
        format: [canvas.width, canvas.height],
    });

    pdf.addImage(imgData, 'PNG', 0, 0, canvas.width, canvas.height);
    pdf.save(`${filename}.pdf`);
};

// ============================================
// Interactive Attendance Trend Chart
// ============================================
interface InteractiveAttendanceTrendChartProps {
    data: AttendanceTrendData[];
    title?: string;
    className?: string;
}

export const InteractiveAttendanceTrendChart: React.FC<InteractiveAttendanceTrendChartProps> = ({
    data,
    title = 'Tren Kehadiran',
    className = '',
}) => {
    const [hoveredPoint, setHoveredPoint] = useState<number | null>(null);
    const chartId = `chart-attendance-${Date.now()}`;

    const trend = React.useMemo(() => {
        if (data.length < 2) return 0;
        const first = data[0].percentage;
        const last = data[data.length - 1].percentage;
        return last - first;
    }, [data]);

    return (
        <div
            id={chartId}
            className={`bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 ${className}`}
        >
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
                <div>
                    <h3 className="font-semibold text-slate-900 dark:text-white">{title}</h3>
                    <div
                        className={`flex items-center gap-1 text-sm font-medium mt-1 ${trend > 0 ? 'text-green-500' : trend < 0 ? 'text-red-500' : 'text-slate-500'
                            }`}
                    >
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

                {/* Export Buttons */}
                <div className="flex gap-2">
                    <button
                        onClick={() => exportToPNG(chartId, 'attendance-trend')}
                        className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                        title="Export to PNG"
                        aria-label="Export chart to PNG"
                    >
                        <DownloadIcon className="w-4 h-4 text-slate-600 dark:text-slate-400" />
                    </button>
                    <button
                        onClick={() => exportToPDF(chartId, 'attendance-trend')}
                        className="px-3 py-1.5 rounded-lg bg-indigo-100 dark:bg-indigo-900/30 hover:bg-indigo-200 dark:hover:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300 text-xs font-medium transition-colors"
                        aria-label="Export chart to PDF"
                    >
                        PDF
                    </button>
                </div>
            </div>

            {/* Interactive Chart */}
            <ResponsiveContainer width="100%" height={250}>
                <LineChart
                    data={data}
                    margin={{ top: 5, right: 30, left: 0, bottom: 5 }}
                    onMouseMove={(state) => {
                        if (state.activeTooltipIndex !== undefined) {
                            setHoveredPoint(state.activeTooltipIndex);
                        }
                    }}
                    onMouseLeave={() => setHoveredPoint(null)}
                >
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" opacity={0.3} />
                    <XAxis
                        dataKey="label"
                        stroke="#94a3b8"
                        style={{ fontSize: '12px' }}
                    />
                    <YAxis
                        stroke="#94a3b8"
                        style={{ fontSize: '12px' }}
                        domain={[0, 100]}
                    />
                    <Tooltip content={<CustomTooltip />} />
                    <Legend />
                    <Line
                        type="monotone"
                        dataKey="percentage"
                        name="Kehadiran"
                        stroke="#6366f1"
                        strokeWidth={3}
                        dot={{
                            fill: '#6366f1',
                            strokeWidth: 2,
                            r: 5,
                            cursor: 'pointer',
                        }}
                        activeDot={{
                            r: 8,
                            fill: '#6366f1',
                            stroke: '#fff',
                            strokeWidth: 2,
                        }}
                    />
                </LineChart>
            </ResponsiveContainer>
        </div>
    );
};

// ============================================
// Interactive Grade Distribution Chart
// ============================================
interface InteractiveGradeDistributionChartProps {
    data: GradeDistributionData[];
    title?: string;
    className?: string;
}

export const InteractiveGradeDistributionChart: React.FC<InteractiveGradeDistributionChartProps> = ({
    data,
    title = 'Distribusi Nilai',
    className = '',
}) => {
    const [selectedBar, setSelectedBar] = useState<number | null>(null);
    const chartId = `chart-grade-${Date.now()}`;

    return (
        <div
            id={chartId}
            className={`bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 ${className}`}
        >
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-slate-900 dark:text-white">{title}</h3>

                {/* Export Buttons */}
                <div className="flex gap-2">
                    <button
                        onClick={() => exportToPNG(chartId, 'grade-distribution')}
                        className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                        title="Export to PNG"
                        aria-label="Export chart to PNG"
                    >
                        <DownloadIcon className="w-4 h-4 text-slate-600 dark:text-slate-400" />
                    </button>
                    <button
                        onClick={() => exportToPDF(chartId, 'grade-distribution')}
                        className="px-3 py-1.5 rounded-lg bg-indigo-100 dark:bg-indigo-900/30 hover:bg-indigo-200 dark:hover:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300 text-xs font-medium transition-colors"
                        aria-label="Export chart to PDF"
                    >
                        PDF
                    </button>
                </div>
            </div>

            {/* Interactive Chart */}
            <ResponsiveContainer width="100%" height={250}>
                <BarChart
                    data={data}
                    margin={{ top: 5, right: 30, left: 0, bottom: 5 }}
                    onClick={(data) => {
                        if (data && data.activeTooltipIndex !== undefined) {
                            setSelectedBar(data.activeTooltipIndex);
                        }
                    }}
                >
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" opacity={0.3} />
                    <XAxis
                        dataKey="label"
                        stroke="#94a3b8"
                        style={{ fontSize: '12px' }}
                    />
                    <YAxis
                        stroke="#94a3b8"
                        style={{ fontSize: '12px' }}
                    />
                    <Tooltip content={<CustomTooltip />} />
                    <Legend />
                    <Bar
                        dataKey="count"
                        name="Jumlah Siswa"
                        radius={[8, 8, 0, 0]}
                        cursor="pointer"
                    >
                        {data.map((entry, index) => (
                            <cell
                                key={`cell-${index}`}
                                fill={selectedBar === index ? entry.color : `${entry.color}dd`}
                                opacity={selectedBar === null || selectedBar === index ? 1 : 0.6}
                            />
                        ))}
                    </Bar>
                </BarChart>
            </ResponsiveContainer>

            {selectedBar !== null && (
                <p className="text-sm text-slate-600 dark:text-slate-400 mt-2">
                    Selected: <span className="font-semibold">{data[selectedBar]?.label}</span> -{' '}
                    {data[selectedBar]?.count} students
                </p>
            )}
        </div>
    );
};

export default {
    InteractiveAttendanceTrendChart,
    InteractiveGradeDistributionChart,
};
