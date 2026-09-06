import React, { useState } from 'react';

type WeeklyAttendance = { day: string; present_percentage: number };

const WeeklyAttendanceChart: React.FC<{ data: WeeklyAttendance[] }> = ({ data }) => {
    const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
    const chartHeight = 160;
    const barWidth = 32;
    const gap = 20;
    const totalWidth = data.length * (barWidth + gap) + gap;

    return (
        <div className="w-full h-full flex justify-center items-end pb-2">
            <svg
                width="100%"
                height={chartHeight}
                viewBox={`0 0 ${totalWidth} ${chartHeight}`}
                aria-label="Grafik absensi mingguan"
                className="overflow-visible max-w-full"
            >
                <defs>
                    <linearGradient id="barGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" className="text-emerald-500 dark:text-emerald-400" stopColor="currentColor" />
                        <stop offset="100%" className="text-emerald-600 dark:text-emerald-500" stopColor="currentColor" />
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
                    const barHeight = day.present_percentage > 0 ? (day.present_percentage / 100) * (chartHeight - 48) : 4;
                    const x = index * (barWidth + gap) + gap;
                    const y = chartHeight - barHeight - 24;
                    const isHovered = hoveredIndex === index;

                    return (
                        <g
                            key={day.day}
                            onMouseEnter={() => setHoveredIndex(index)}
                            onMouseLeave={() => setHoveredIndex(null)}
                            onClick={() => setHoveredIndex(hoveredIndex === index ? null : index)}
                            className="cursor-pointer group select-none"
                        >
                            {/* Invisible wide touch area (>= 44px for thumb tap) */}
                            <rect
                                x={x - 8}
                                y={0}
                                width={barWidth + 16}
                                height={chartHeight}
                                fill="transparent"
                            />

                            {/* Background track */}
                            <rect
                                x={x}
                                y={24}
                                width={barWidth}
                                height={chartHeight - 48}
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

                            {/* Numeric Percentage Label on top of Bar */}
                            <text
                                x={x + barWidth / 2}
                                y={Math.max(y - 6, 18)}
                                textAnchor="middle"
                                fontSize="10"
                                fontWeight="700"
                                className={`transition-colors duration-200 ${
                                    isHovered
                                        ? 'fill-emerald-600 dark:fill-emerald-400 font-extrabold'
                                        : 'fill-slate-500 dark:fill-slate-400'
                                }`}
                            >
                                {Math.round(day.present_percentage)}%
                            </text>

                            {/* Day Name Label */}
                            <text
                                x={x + barWidth / 2}
                                y={chartHeight - 4}
                                textAnchor="middle"
                                fontSize="11"
                                fontWeight="600"
                                className={`transition-colors duration-300 ${
                                    isHovered
                                        ? 'fill-emerald-500 dark:fill-emerald-400'
                                        : 'fill-slate-400 dark:fill-slate-500'
                                }`}
                            >
                                {day.day.slice(0, 3)}
                            </text>

                            {/* Interactive Tooltip on hover or tap */}
                            {isHovered && (
                                <g className="transition-opacity duration-300 animate-fade-in pointer-events-none" style={{ opacity: 1 }}>
                                    <rect
                                        x={x + barWidth / 2 - 24}
                                        y={Math.max(y - 40, 2)}
                                        width={48}
                                        height={26}
                                        rx="6"
                                        className="fill-slate-900 dark:fill-white shadow-xl"
                                    />
                                    <text
                                        x={x + barWidth / 2}
                                        y={Math.max(y - 23, 19)}
                                        textAnchor="middle"
                                        fontSize="11"
                                        fontWeight="bold"
                                        className="fill-white dark:fill-slate-900"
                                    >
                                        {Math.round(day.present_percentage)}%
                                    </text>
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
