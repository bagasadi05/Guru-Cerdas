import React, { useState } from 'react';

type WeeklyAttendance = { day: string; present_percentage: number };

const WeeklyAttendanceChart: React.FC<{ data: WeeklyAttendance[] }> = ({ data }) => {
    const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
    const chartHeight = 160;
    const barWidth = 32;
    const gap = 24;

    return (
        <div className="w-full h-full flex justify-center items-end pb-2">
            <svg width="100%" height={chartHeight} aria-label="Grafik absensi mingguan" className="overflow-visible">
                <defs>
                    <linearGradient id="barGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" className="text-indigo-500 dark:text-indigo-400" stopColor="currentColor" />
                        <stop offset="100%" className="text-violet-600 dark:text-violet-500" stopColor="currentColor" />
                    </linearGradient>
                    <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
                        <feGaussianBlur stdDeviation="3" result="coloredBlur" />
                        <feMerge>
                            <feMergeNode in="coloredBlur" />
                            <feMergeNode in="SourceGraphic" />
                        </feMerge>
                    </filter>
                </defs>
                {data.map((day, index) => {
                    const barHeight = day.present_percentage > 0 ? (day.present_percentage / 100) * (chartHeight - 40) : 4;
                    const x = index * (barWidth + gap) + (gap);
                    const y = chartHeight - barHeight - 20;
                    const isHovered = hoveredIndex === index;

                    return (
                        <g key={day.day}
                            onMouseEnter={() => setHoveredIndex(index)}
                            onMouseLeave={() => setHoveredIndex(null)}
                            className="cursor-pointer group">

                            {/* Background track */}
                            <rect
                                x={x}
                                y={20}
                                width={barWidth}
                                height={chartHeight - 40}
                                rx="6"
                                className="fill-slate-100 dark:fill-slate-800/50"
                            />

                            {/* Active Bar */}
                            <rect
                                x={x}
                                y={y}
                                width={barWidth}
                                height={barHeight}
                                fill="url(#barGradient)"
                                rx="6"
                                filter={isHovered ? "url(#glow)" : ""}
                                className="transition-all duration-300 animate-grow-bar"
                                style={{ transformOrigin: 'bottom', animationDelay: `${index * 100}ms` }}
                            />

                            {/* Label */}
                            <text
                                x={x + barWidth / 2}
                                y={chartHeight}
                                textAnchor="middle"
                                fontSize="11"
                                fontWeight="600"
                                className={`transition-colors duration-300 ${isHovered ? 'fill-indigo-500 dark:fill-indigo-400' : 'fill-slate-400 dark:fill-slate-500'}`}
                            >
                                {day.day.slice(0, 3)}
                            </text>

                            {/* Tooltip */}
                            {isHovered && (
                                <g className="transition-opacity duration-300 animate-fade-in" style={{ opacity: 1 }}>
                                    <rect x={x + barWidth / 2 - 20} y={y - 36} width={40} height={28} rx="6" className="fill-slate-800 dark:fill-white shadow-xl" />
                                    <text
                                        x={x + barWidth / 2}
                                        y={y - 18}
                                        textAnchor="middle"
                                        fontSize="11"
                                        fontWeight="bold"
                                        className="fill-white dark:fill-slate-900"
                                    >
                                        {Math.round(day.present_percentage)}%
                                    </text>
                                    <path d={`M${x + barWidth / 2 - 5},${y - 8} L${x + barWidth / 2 + 5},${y - 8} L${x + barWidth / 2},${y - 3} Z`} className="fill-slate-800 dark:fill-white" />
                                </g>
                            )}
                        </g>
                    );
                })}
            </svg>
        </div>
    );
};

export default WeeklyAttendanceChart;
