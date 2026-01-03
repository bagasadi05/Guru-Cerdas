/**
 * Interactive Attendance Chart Component
 * 
 * Enhanced version with tooltips, click interactions, and export
 */

import React, { useState } from 'react';
import { TrendingUp, Download, Info } from 'lucide-react';

interface AttendanceData {
    day: string;
    present_percentage: number;
    present?: number;
    total?: number;
}

interface InteractiveAttendanceChartProps {
    data: AttendanceData[];
    onBarClick?: (day: string) => void;
    showExport?: boolean;
}

export const InteractiveAttendanceChart: React.FC<InteractiveAttendanceChartProps> = ({
    data,
    onBarClick,
    showExport = true,
}) => {
    const [hoveredDay, setHoveredDay] = useState<string | null>(null);
    const [tooltipPosition, setTooltipPosition] = useState({ x: 0, y: 0 });

    const maxPercentage = Math.max(...data.map(d => d.present_percentage), 100);

    const handleMouseEnter = (day: string, event: React.MouseEvent) => {
        setHoveredDay(day);
        const rect = event.currentTarget.getBoundingClientRect();
        setTooltipPosition({
            x: rect.left + rect.width / 2,
            y: rect.top - 10,
        });
    };

    const handleMouseLeave = () => {
        setHoveredDay(null);
    };

    const handleExport = () => {
        // Export as CSV
        const csv = [
            ['Hari', 'Persentase Kehadiran', 'Hadir', 'Total'],
            ...data.map(d => [
                d.day,
                d.present_percentage.toFixed(1),
                d.present || '-',
                d.total || '-',
            ]),
        ]
            .map(row => row.join(','))
            .join('\n');

        const blob = new Blob([csv], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `kehadiran-${new Date().toISOString().slice(0, 10)}.csv`;
        a.click();
        URL.revokeObjectURL(url);
    };

    const hoveredData = data.find(d => d.day === hoveredDay);
    const averageAttendance = data.reduce((sum, d) => sum + d.present_percentage, 0) / data.length;

    return (
        <div className="relative" role="region" aria-label="Grafik Kehadiran Mingguan">
            {/* Header with Export */}
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                    <TrendingUp className="w-5 h-5 text-indigo-500" />
                    <div>
                        <h3 className="font-semibold text-gray-900 dark:text-white">
                            Tren Kehadiran 5 Hari Terakhir
                        </h3>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                            Rata-rata: {averageAttendance.toFixed(1)}%
                        </p>
                    </div>
                </div>
                {showExport && (
                    <button
                        onClick={handleExport}
                        className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                        aria-label="Export data kehadiran"
                        title="Export CSV"
                    >
                        <Download className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                    </button>
                )}
            </div>

            {/* Chart */}
            <div className="relative h-48 flex items-end justify-between gap-2">
                {data.map((item, index) => {
                    const height = (item.present_percentage / maxPercentage) * 100;
                    const isHovered = hoveredDay === item.day;
                    const isLow = item.present_percentage < 70;
                    const isMedium = item.present_percentage >= 70 && item.present_percentage < 85;
                    const isHigh = item.present_percentage >= 85;

                    return (
                        <div
                            key={item.day}
                            className="flex-1 flex flex-col items-center gap-2 group"
                            onMouseEnter={(e) => handleMouseEnter(item.day, e)}
                            onMouseLeave={handleMouseLeave}
                            onClick={() => onBarClick?.(item.day)}
                            role="button"
                            tabIndex={0}
                            aria-label={`${item.day}: ${item.present_percentage.toFixed(1)}% kehadiran`}
                            onKeyPress={(e) => {
                                if (e.key === 'Enter' || e.key === ' ') {
                                    onBarClick?.(item.day);
                                }
                            }}
                        >
                            {/* Bar */}
                            <div className="w-full relative">
                                <div
                                    className={`w-full rounded-t-lg transition-all duration-300 cursor-pointer ${isHovered ? 'scale-105 shadow-lg' : ''
                                        } ${isLow
                                            ? 'bg-gradient-to-t from-red-500 to-red-400'
                                            : isMedium
                                                ? 'bg-gradient-to-t from-amber-500 to-amber-400'
                                                : 'bg-gradient-to-t from-emerald-500 to-emerald-400'
                                        }`}
                                    style={{ height: `${height}%` }}
                                    aria-hidden="true"
                                >
                                    {/* Percentage Label on Bar */}
                                    <div className="absolute -top-6 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <span className="text-xs font-bold text-gray-900 dark:text-white bg-white dark:bg-gray-800 px-2 py-1 rounded shadow-lg">
                                            {item.present_percentage.toFixed(0)}%
                                        </span>
                                    </div>
                                </div>
                            </div>

                            {/* Day Label */}
                            <span className="text-xs font-medium text-gray-600 dark:text-gray-400 text-center">
                                {item.day.slice(0, 3)}
                            </span>
                        </div>
                    );
                })}
            </div>

            {/* Tooltip */}
            {hoveredDay && hoveredData && (
                <div
                    className="fixed z-50 pointer-events-none"
                    style={{
                        left: `${tooltipPosition.x}px`,
                        top: `${tooltipPosition.y}px`,
                        transform: 'translate(-50%, -100%)',
                    }}
                    role="tooltip"
                    aria-live="polite"
                >
                    <div className="bg-gray-900 dark:bg-gray-800 text-white px-4 py-3 rounded-lg shadow-2xl border border-gray-700">
                        <div className="text-sm font-semibold mb-1">{hoveredData.day}</div>
                        <div className="text-lg font-bold text-emerald-400">
                            {hoveredData.present_percentage.toFixed(1)}%
                        </div>
                        {hoveredData.present !== undefined && hoveredData.total !== undefined && (
                            <div className="text-xs text-gray-400 mt-1">
                                {hoveredData.present} dari {hoveredData.total} siswa
                            </div>
                        )}
                        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-full">
                            <div className="w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-900 dark:border-t-gray-800" />
                        </div>
                    </div>
                </div>
            )}

            {/* Legend */}
            <div className="flex items-center justify-center gap-4 mt-4 text-xs">
                <div className="flex items-center gap-1">
                    <div className="w-3 h-3 rounded bg-gradient-to-br from-emerald-500 to-emerald-400" />
                    <span className="text-gray-600 dark:text-gray-400">≥85% Baik</span>
                </div>
                <div className="flex items-center gap-1">
                    <div className="w-3 h-3 rounded bg-gradient-to-br from-amber-500 to-amber-400" />
                    <span className="text-gray-600 dark:text-gray-400">70-84% Cukup</span>
                </div>
                <div className="flex items-center gap-1">
                    <div className="w-3 h-3 rounded bg-gradient-to-br from-red-500 to-red-400" />
                    <span className="text-gray-600 dark:text-gray-400">&lt;70% Rendah</span>
                </div>
            </div>

            {/* Info Note */}
            <div className="mt-3 p-2 bg-blue-50 dark:bg-blue-900/20 rounded-lg flex items-start gap-2">
                <Info className="w-4 h-4 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
                <p className="text-xs text-blue-700 dark:text-blue-300">
                    Klik pada bar untuk melihat detail kehadiran harian
                </p>
            </div>
        </div>
    );
};
