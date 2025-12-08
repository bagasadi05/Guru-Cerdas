import React, { useState, useRef, useCallback, useMemo } from 'react';
import { Download, Maximize2, ZoomIn, ChevronDown, Info } from 'lucide-react';

/**
 * Advanced Data Visualization Components
 * Features: Interactive charts, rich tooltips, legends, export, accessible colors
 */

// ============================================
// ACCESSIBLE COLOR PALETTES
// ============================================

export const chartColors = {
    // Main palette - WCAG AA compliant
    primary: [
        '#6366F1', // indigo
        '#EC4899', // pink
        '#14B8A6', // teal
        '#F59E0B', // amber
        '#8B5CF6', // violet
        '#EF4444', // red
        '#22C55E', // green
        '#3B82F6', // blue
    ],
    // Semantic colors
    semantic: {
        success: '#22C55E',
        warning: '#F59E0B',
        error: '#EF4444',
        info: '#3B82F6',
    },
    // Attendance colors (consistent across app)
    attendance: {
        Hadir: '#22C55E',
        Sakit: '#F59E0B',
        Izin: '#3B82F6',
        Alpha: '#EF4444',
    },
    // Gradient pairs for filled charts
    gradients: {
        indigo: ['#6366F1', '#4F46E5'],
        pink: ['#EC4899', '#DB2777'],
        teal: ['#14B8A6', '#0D9488'],
        amber: ['#F59E0B', '#D97706'],
    }
};

// ============================================
// TYPES
// ============================================

export interface ChartDataPoint {
    label: string;
    value: number;
    color?: string;
    metadata?: Record<string, any>;
}

export interface ChartSeries {
    name: string;
    data: number[];
    color?: string;
}

export interface ChartProps {
    title?: string;
    subtitle?: string;
    height?: number;
    showLegend?: boolean;
    showGrid?: boolean;
    showTooltip?: boolean;
    showExport?: boolean;
    onDrillDown?: (point: ChartDataPoint, index: number) => void;
    className?: string;
}

// ============================================
// TOOLTIP COMPONENT
// ============================================

interface TooltipProps {
    x: number;
    y: number;
    title: string;
    items: { label: string; value: string | number; color?: string }[];
    visible: boolean;
}

const ChartTooltip: React.FC<TooltipProps> = ({ x, y, title, items, visible }) => {
    if (!visible) return null;

    return (
        <div
            className="absolute z-50 pointer-events-none animate-fade-in"
            style={{
                left: x,
                top: y,
                transform: 'translate(-50%, -100%)',
                marginTop: -10
            }}
        >
            <div className="bg-slate-900 text-white rounded-xl px-4 py-3 shadow-xl min-w-[150px]">
                <div className="text-sm font-medium mb-2">{title}</div>
                <div className="space-y-1">
                    {items.map((item, i) => (
                        <div key={i} className="flex items-center justify-between gap-4 text-sm">
                            <span className="flex items-center gap-2">
                                {item.color && (
                                    <span
                                        className="w-2.5 h-2.5 rounded-full"
                                        style={{ backgroundColor: item.color }}
                                    />
                                )}
                                <span className="text-slate-300">{item.label}</span>
                            </span>
                            <span className="font-medium">{item.value}</span>
                        </div>
                    ))}
                </div>
            </div>
            {/* Arrow */}
            <div className="absolute left-1/2 -translate-x-1/2 -bottom-1">
                <div className="w-2 h-2 bg-slate-900 rotate-45" />
            </div>
        </div>
    );
};

// ============================================
// LEGEND COMPONENT
// ============================================

interface LegendItem {
    label: string;
    color: string;
    value?: number | string;
    active?: boolean;
}

interface LegendProps {
    items: LegendItem[];
    onToggle?: (index: number) => void;
    position?: 'top' | 'bottom' | 'right';
}

const ChartLegend: React.FC<LegendProps> = ({ items, onToggle, position = 'bottom' }) => {
    const positionClass = {
        top: 'mb-4',
        bottom: 'mt-4',
        right: 'ml-4 flex-col'
    }[position];

    return (
        <div className={`flex flex-wrap gap-3 justify-center ${positionClass}`}>
            {items.map((item, i) => (
                <button
                    key={i}
                    onClick={() => onToggle?.(i)}
                    className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm transition-all
                        ${item.active === false
                            ? 'opacity-40 hover:opacity-60'
                            : 'hover:bg-slate-100 dark:hover:bg-slate-800'
                        }`}
                >
                    <span
                        className="w-3 h-3 rounded-sm"
                        style={{ backgroundColor: item.color }}
                    />
                    <span className="text-slate-600 dark:text-slate-400">{item.label}</span>
                    {item.value !== undefined && (
                        <span className="font-medium text-slate-900 dark:text-white">
                            {item.value}
                        </span>
                    )}
                </button>
            ))}
        </div>
    );
};

// ============================================
// CHART WRAPPER WITH EXPORT
// ============================================

interface ChartWrapperProps {
    title?: string;
    subtitle?: string;
    showExport?: boolean;
    showFullscreen?: boolean;
    children: React.ReactNode;
    className?: string;
}

const ChartWrapper: React.FC<ChartWrapperProps> = ({
    title,
    subtitle,
    showExport = true,
    showFullscreen = false,
    children,
    className = ''
}) => {
    const chartRef = useRef<HTMLDivElement>(null);
    const [isFullscreen, setIsFullscreen] = useState(false);

    const handleExport = useCallback(async () => {
        if (!chartRef.current) return;

        try {
            // Use html2canvas if available, otherwise fallback to basic
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            const rect = chartRef.current.getBoundingClientRect();

            canvas.width = rect.width * 2;
            canvas.height = rect.height * 2;

            if (ctx) {
                ctx.scale(2, 2);
                ctx.fillStyle = '#ffffff';
                ctx.fillRect(0, 0, rect.width, rect.height);

                // Note: For full functionality, you'd want to use html2canvas library
                // This is a simplified version
                const dataUrl = canvas.toDataURL('image/png');
                const link = document.createElement('a');
                link.download = `chart-${Date.now()}.png`;
                link.href = dataUrl;
                link.click();
            }
        } catch (error) {
            console.error('Export failed:', error);
        }
    }, []);

    const toggleFullscreen = useCallback(() => {
        if (!chartRef.current) return;

        if (!document.fullscreenElement) {
            chartRef.current.requestFullscreen();
            setIsFullscreen(true);
        } else {
            document.exitFullscreen();
            setIsFullscreen(false);
        }
    }, []);

    return (
        <div
            ref={chartRef}
            className={`bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-sm ${className}`}
        >
            {/* Header */}
            {(title || showExport) && (
                <div className="flex items-start justify-between mb-6">
                    <div>
                        {title && (
                            <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
                                {title}
                            </h3>
                        )}
                        {subtitle && (
                            <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
                                {subtitle}
                            </p>
                        )}
                    </div>
                    <div className="flex items-center gap-2">
                        {showFullscreen && (
                            <button
                                onClick={toggleFullscreen}
                                className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
                                title="Fullscreen"
                            >
                                <Maximize2 className="w-4 h-4" />
                            </button>
                        )}
                        {showExport && (
                            <button
                                onClick={handleExport}
                                className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
                                title="Export as Image"
                            >
                                <Download className="w-4 h-4" />
                            </button>
                        )}
                    </div>
                </div>
            )}

            {children}
        </div>
    );
};

// ============================================
// BAR CHART
// ============================================

interface BarChartProps extends ChartProps {
    data: ChartDataPoint[];
    horizontal?: boolean;
    showValues?: boolean;
    barRadius?: number;
    animate?: boolean;
}

export const BarChart: React.FC<BarChartProps> = ({
    data,
    title,
    subtitle,
    height = 300,
    horizontal = false,
    showValues = true,
    showLegend = false,
    showGrid = true,
    showTooltip = true,
    showExport = true,
    barRadius = 4,
    animate = true,
    onDrillDown,
    className = ''
}) => {
    const [tooltip, setTooltip] = useState({ visible: false, x: 0, y: 0, data: null as ChartDataPoint | null });
    const [activeIndex, setActiveIndex] = useState<number | null>(null);

    const maxValue = useMemo(() => Math.max(...data.map(d => d.value)), [data]);
    const barWidth = useMemo(() => 100 / data.length - 8, [data.length]);

    const handleMouseEnter = (point: ChartDataPoint, index: number, event: React.MouseEvent) => {
        const rect = event.currentTarget.getBoundingClientRect();
        const parentRect = event.currentTarget.parentElement?.getBoundingClientRect();

        setTooltip({
            visible: true,
            x: rect.left - (parentRect?.left || 0) + rect.width / 2,
            y: rect.top - (parentRect?.top || 0),
            data: point
        });
        setActiveIndex(index);
    };

    const handleMouseLeave = () => {
        setTooltip({ visible: false, x: 0, y: 0, data: null });
        setActiveIndex(null);
    };

    const handleClick = (point: ChartDataPoint, index: number) => {
        onDrillDown?.(point, index);
    };

    return (
        <ChartWrapper title={title} subtitle={subtitle} showExport={showExport} className={className}>
            <div className="relative" style={{ height }}>
                {/* Grid lines */}
                {showGrid && (
                    <div className="absolute inset-0 flex flex-col justify-between pointer-events-none">
                        {[...Array(5)].map((_, i) => (
                            <div key={i} className="border-t border-slate-100 dark:border-slate-700 flex items-center">
                                <span className="text-xs text-slate-400 w-8 -ml-10">
                                    {Math.round(maxValue * (1 - i / 4))}
                                </span>
                            </div>
                        ))}
                    </div>
                )}

                {/* Bars */}
                <svg width="100%" height="100%" className="overflow-visible">
                    {data.map((point, i) => {
                        const barHeight = (point.value / maxValue) * (height - 40);
                        const x = (i / data.length) * 100 + (100 / data.length - barWidth) / 2;
                        const color = point.color || chartColors.primary[i % chartColors.primary.length];
                        const isActive = activeIndex === i;

                        return (
                            <g key={i}>
                                {/* Bar */}
                                <rect
                                    x={`${x}%`}
                                    y={height - barHeight - 30}
                                    width={`${barWidth}%`}
                                    height={barHeight}
                                    rx={barRadius}
                                    fill={color}
                                    className={`transition-all duration-200 cursor-pointer ${isActive ? 'opacity-100' : 'opacity-80 hover:opacity-100'
                                        }`}
                                    style={{
                                        transform: isActive ? 'scaleY(1.02)' : 'scaleY(1)',
                                        transformOrigin: 'bottom',
                                        animation: animate ? `grow-bar 0.6s ease-out ${i * 0.1}s both` : undefined
                                    }}
                                    onMouseEnter={(e) => handleMouseEnter(point, i, e)}
                                    onMouseLeave={handleMouseLeave}
                                    onClick={() => handleClick(point, i)}
                                />

                                {/* Value label */}
                                {showValues && (
                                    <text
                                        x={`${x + barWidth / 2}%`}
                                        y={height - barHeight - 35}
                                        textAnchor="middle"
                                        className="text-xs font-medium fill-slate-600 dark:fill-slate-400"
                                    >
                                        {point.value}
                                    </text>
                                )}

                                {/* X-axis label */}
                                <text
                                    x={`${x + barWidth / 2}%`}
                                    y={height - 10}
                                    textAnchor="middle"
                                    className="text-xs fill-slate-500 dark:fill-slate-400"
                                >
                                    {point.label}
                                </text>
                            </g>
                        );
                    })}
                </svg>

                {/* Tooltip */}
                {showTooltip && tooltip.visible && tooltip.data && (
                    <ChartTooltip
                        x={tooltip.x}
                        y={tooltip.y}
                        title={tooltip.data.label}
                        items={[
                            { label: 'Value', value: tooltip.data.value, color: tooltip.data.color }
                        ]}
                        visible={tooltip.visible}
                    />
                )}
            </div>

            {/* Legend */}
            {showLegend && (
                <ChartLegend
                    items={data.map((d, i) => ({
                        label: d.label,
                        color: d.color || chartColors.primary[i % chartColors.primary.length],
                        value: d.value
                    }))}
                />
            )}
        </ChartWrapper>
    );
};

// ============================================
// LINE CHART
// ============================================

interface LineChartProps extends ChartProps {
    series: ChartSeries[];
    labels: string[];
    showArea?: boolean;
    showDots?: boolean;
    curved?: boolean;
}

export const LineChart: React.FC<LineChartProps> = ({
    series,
    labels,
    title,
    subtitle,
    height = 300,
    showArea = false,
    showDots = true,
    curved = true,
    showLegend = true,
    showGrid = true,
    showTooltip = true,
    showExport = true,
    onDrillDown,
    className = ''
}) => {
    const [tooltip, setTooltip] = useState({ visible: false, x: 0, y: 0, index: -1 });
    const [activeSeries, setActiveSeries] = useState<boolean[]>(series.map(() => true));

    const maxValue = useMemo(() => {
        return Math.max(...series.flatMap((s, i) => activeSeries[i] ? s.data : []));
    }, [series, activeSeries]);

    const getPath = useCallback((data: number[], area = false) => {
        const points = data.map((value, i) => ({
            x: (i / (data.length - 1)) * 100,
            y: 100 - (value / maxValue) * 100
        }));

        if (curved) {
            // Bezier curve
            let path = `M ${points[0].x} ${points[0].y}`;
            for (let i = 1; i < points.length; i++) {
                const prev = points[i - 1];
                const curr = points[i];
                const cp1x = prev.x + (curr.x - prev.x) / 3;
                const cp2x = prev.x + (curr.x - prev.x) * 2 / 3;
                path += ` C ${cp1x} ${prev.y} ${cp2x} ${curr.y} ${curr.x} ${curr.y}`;
            }
            if (area) {
                path += ` L 100 100 L 0 100 Z`;
            }
            return path;
        } else {
            // Straight lines
            let path = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
            if (area) {
                path += ` L 100 100 L 0 100 Z`;
            }
            return path;
        }
    }, [maxValue, curved]);

    const handleDotHover = (index: number, event: React.MouseEvent) => {
        const rect = event.currentTarget.getBoundingClientRect();
        const parentRect = event.currentTarget.parentElement?.parentElement?.getBoundingClientRect();

        setTooltip({
            visible: true,
            x: rect.left - (parentRect?.left || 0) + rect.width / 2,
            y: rect.top - (parentRect?.top || 0),
            index
        });
    };

    const toggleSeries = (index: number) => {
        setActiveSeries(prev => {
            const next = [...prev];
            next[index] = !next[index];
            return next;
        });
    };

    return (
        <ChartWrapper title={title} subtitle={subtitle} showExport={showExport} className={className}>
            {/* Legend at top */}
            {showLegend && (
                <ChartLegend
                    items={series.map((s, i) => ({
                        label: s.name,
                        color: s.color || chartColors.primary[i % chartColors.primary.length],
                        active: activeSeries[i]
                    }))}
                    onToggle={toggleSeries}
                    position="top"
                />
            )}

            <div className="relative" style={{ height }}>
                {/* Grid */}
                {showGrid && (
                    <div className="absolute inset-0 flex flex-col justify-between pointer-events-none">
                        {[...Array(5)].map((_, i) => (
                            <div key={i} className="border-t border-slate-100 dark:border-slate-700" />
                        ))}
                    </div>
                )}

                <svg
                    viewBox="0 0 100 100"
                    preserveAspectRatio="none"
                    className="w-full h-full overflow-visible"
                >
                    <defs>
                        {series.map((s, i) => (
                            <linearGradient key={i} id={`gradient-${i}`} x1="0" y1="0" x2="0" y2="1">
                                <stop offset="0%" stopColor={s.color || chartColors.primary[i]} stopOpacity="0.3" />
                                <stop offset="100%" stopColor={s.color || chartColors.primary[i]} stopOpacity="0" />
                            </linearGradient>
                        ))}
                    </defs>

                    {series.map((s, seriesIndex) => {
                        if (!activeSeries[seriesIndex]) return null;
                        const color = s.color || chartColors.primary[seriesIndex % chartColors.primary.length];

                        return (
                            <g key={seriesIndex}>
                                {/* Area fill */}
                                {showArea && (
                                    <path
                                        d={getPath(s.data, true)}
                                        fill={`url(#gradient-${seriesIndex})`}
                                        className="transition-opacity duration-300"
                                    />
                                )}

                                {/* Line */}
                                <path
                                    d={getPath(s.data)}
                                    fill="none"
                                    stroke={color}
                                    strokeWidth="0.5"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    className="transition-all duration-300"
                                />

                                {/* Dots */}
                                {showDots && s.data.map((value, i) => (
                                    <circle
                                        key={i}
                                        cx={`${(i / (s.data.length - 1)) * 100}%`}
                                        cy={`${100 - (value / maxValue) * 100}%`}
                                        r="1"
                                        fill="white"
                                        stroke={color}
                                        strokeWidth="0.4"
                                        className="transition-all duration-200 cursor-pointer hover:r-[1.5]"
                                        onMouseEnter={(e) => handleDotHover(i, e)}
                                        onMouseLeave={() => setTooltip(prev => ({ ...prev, visible: false }))}
                                    />
                                ))}
                            </g>
                        );
                    })}
                </svg>

                {/* X-axis labels */}
                <div className="flex justify-between mt-2">
                    {labels.map((label, i) => (
                        <span key={i} className="text-xs text-slate-500 dark:text-slate-400">
                            {label}
                        </span>
                    ))}
                </div>

                {/* Tooltip */}
                {showTooltip && tooltip.visible && tooltip.index >= 0 && (
                    <ChartTooltip
                        x={tooltip.x}
                        y={tooltip.y}
                        title={labels[tooltip.index]}
                        items={series
                            .filter((_, i) => activeSeries[i])
                            .map((s, i) => ({
                                label: s.name,
                                value: s.data[tooltip.index],
                                color: s.color || chartColors.primary[i]
                            }))}
                        visible={tooltip.visible}
                    />
                )}
            </div>
        </ChartWrapper>
    );
};

// ============================================
// DONUT/PIE CHART
// ============================================

interface DonutChartProps extends ChartProps {
    data: ChartDataPoint[];
    donut?: boolean;
    showPercentage?: boolean;
    centerLabel?: string;
    centerValue?: string | number;
}

export const DonutChart: React.FC<DonutChartProps> = ({
    data,
    title,
    subtitle,
    height = 300,
    donut = true,
    showPercentage = true,
    showLegend = true,
    showTooltip = true,
    showExport = true,
    centerLabel,
    centerValue,
    onDrillDown,
    className = ''
}) => {
    const [tooltip, setTooltip] = useState({ visible: false, x: 0, y: 0, data: null as ChartDataPoint | null });
    const [activeIndex, setActiveIndex] = useState<number | null>(null);

    const total = useMemo(() => data.reduce((sum, d) => sum + d.value, 0), [data]);

    const segments = useMemo(() => {
        let currentAngle = -90; // Start from top
        return data.map((point, i) => {
            const percentage = (point.value / total) * 100;
            const angle = (percentage / 100) * 360;
            const startAngle = currentAngle;
            const endAngle = currentAngle + angle;
            currentAngle = endAngle;

            return {
                ...point,
                percentage,
                startAngle,
                endAngle,
                color: point.color || chartColors.primary[i % chartColors.primary.length]
            };
        });
    }, [data, total]);

    const describeArc = (startAngle: number, endAngle: number, radius: number, innerRadius: number = 0) => {
        const start = polarToCartesian(50, 50, radius, endAngle);
        const end = polarToCartesian(50, 50, radius, startAngle);
        const largeArcFlag = endAngle - startAngle > 180 ? 1 : 0;

        if (innerRadius > 0) {
            const innerStart = polarToCartesian(50, 50, innerRadius, endAngle);
            const innerEnd = polarToCartesian(50, 50, innerRadius, startAngle);
            return [
                'M', start.x, start.y,
                'A', radius, radius, 0, largeArcFlag, 0, end.x, end.y,
                'L', innerEnd.x, innerEnd.y,
                'A', innerRadius, innerRadius, 0, largeArcFlag, 1, innerStart.x, innerStart.y,
                'Z'
            ].join(' ');
        }

        return [
            'M', 50, 50,
            'L', start.x, start.y,
            'A', radius, radius, 0, largeArcFlag, 0, end.x, end.y,
            'Z'
        ].join(' ');
    };

    const polarToCartesian = (cx: number, cy: number, radius: number, angleInDegrees: number) => {
        const angleInRadians = (angleInDegrees * Math.PI) / 180;
        return {
            x: cx + radius * Math.cos(angleInRadians),
            y: cy + radius * Math.sin(angleInRadians)
        };
    };

    return (
        <ChartWrapper title={title} subtitle={subtitle} showExport={showExport} className={className}>
            <div className="flex items-center gap-8">
                {/* Chart */}
                <div className="relative" style={{ width: height, height }}>
                    <svg viewBox="0 0 100 100" className="w-full h-full">
                        {segments.map((segment, i) => {
                            const isActive = activeIndex === i;
                            const radius = isActive ? 47 : 45;
                            const innerRadius = donut ? (isActive ? 28 : 25) : 0;

                            return (
                                <path
                                    key={i}
                                    d={describeArc(segment.startAngle, segment.endAngle, radius, innerRadius)}
                                    fill={segment.color}
                                    className="transition-all duration-200 cursor-pointer"
                                    style={{
                                        filter: isActive ? 'brightness(1.1)' : undefined,
                                        transform: isActive ? 'scale(1.02)' : 'scale(1)',
                                        transformOrigin: 'center'
                                    }}
                                    onMouseEnter={() => setActiveIndex(i)}
                                    onMouseLeave={() => setActiveIndex(null)}
                                    onClick={() => onDrillDown?.(segment, i)}
                                />
                            );
                        })}
                    </svg>

                    {/* Center text */}
                    {donut && (centerLabel || centerValue !== undefined) && (
                        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                            {centerValue !== undefined && (
                                <span className="text-3xl font-bold text-slate-900 dark:text-white">
                                    {centerValue}
                                </span>
                            )}
                            {centerLabel && (
                                <span className="text-sm text-slate-500 dark:text-slate-400">
                                    {centerLabel}
                                </span>
                            )}
                        </div>
                    )}
                </div>

                {/* Legend */}
                {showLegend && (
                    <div className="flex-1 space-y-2">
                        {segments.map((segment, i) => (
                            <div
                                key={i}
                                className={`flex items-center justify-between p-2 rounded-lg transition-colors cursor-pointer ${activeIndex === i ? 'bg-slate-100 dark:bg-slate-700' : 'hover:bg-slate-50 dark:hover:bg-slate-800'
                                    }`}
                                onMouseEnter={() => setActiveIndex(i)}
                                onMouseLeave={() => setActiveIndex(null)}
                                onClick={() => onDrillDown?.(segment, i)}
                            >
                                <div className="flex items-center gap-2">
                                    <div
                                        className="w-3 h-3 rounded-sm"
                                        style={{ backgroundColor: segment.color }}
                                    />
                                    <span className="text-sm text-slate-600 dark:text-slate-400">
                                        {segment.label}
                                    </span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <span className="text-sm font-medium text-slate-900 dark:text-white">
                                        {segment.value}
                                    </span>
                                    {showPercentage && (
                                        <span className="text-xs text-slate-400">
                                            ({segment.percentage.toFixed(1)}%)
                                        </span>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </ChartWrapper>
    );
};

// ============================================
// ATTENDANCE CHART (SPECIALIZED)
// ============================================

interface AttendanceChartProps extends ChartProps {
    data: {
        Hadir: number;
        Sakit: number;
        Izin: number;
        Alpha: number;
    };
    type?: 'donut' | 'bar' | 'stacked';
}

export const AttendanceChart: React.FC<AttendanceChartProps> = ({
    data,
    title = 'Statistik Kehadiran',
    type = 'donut',
    ...props
}) => {
    const chartData: ChartDataPoint[] = [
        { label: 'Hadir', value: data.Hadir, color: chartColors.attendance.Hadir },
        { label: 'Sakit', value: data.Sakit, color: chartColors.attendance.Sakit },
        { label: 'Izin', value: data.Izin, color: chartColors.attendance.Izin },
        { label: 'Alpha', value: data.Alpha, color: chartColors.attendance.Alpha },
    ];

    const total = chartData.reduce((sum, d) => sum + d.value, 0);
    const attendanceRate = total > 0 ? ((data.Hadir / total) * 100).toFixed(1) : '0';

    if (type === 'donut') {
        return (
            <DonutChart
                data={chartData}
                title={title}
                centerValue={`${attendanceRate}%`}
                centerLabel="Kehadiran"
                {...props}
            />
        );
    }

    return (
        <BarChart
            data={chartData}
            title={title}
            {...props}
        />
    );
};

// ============================================
// SPARKLINE (MINI CHART)
// ============================================

interface SparklineProps {
    data: number[];
    color?: string;
    height?: number;
    showArea?: boolean;
    className?: string;
}

export const Sparkline: React.FC<SparklineProps> = ({
    data,
    color = chartColors.primary[0],
    height = 40,
    showArea = true,
    className = ''
}) => {
    const maxValue = Math.max(...data);
    const minValue = Math.min(...data);
    const range = maxValue - minValue || 1;

    const points = data.map((value, i) => ({
        x: (i / (data.length - 1)) * 100,
        y: 100 - ((value - minValue) / range) * 80 - 10 // 10% padding
    }));

    const linePath = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
    const areaPath = linePath + ` L 100 100 L 0 100 Z`;

    return (
        <svg
            viewBox="0 0 100 100"
            preserveAspectRatio="none"
            className={className}
            style={{ height }}
        >
            <defs>
                <linearGradient id="sparkline-gradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={color} stopOpacity="0.3" />
                    <stop offset="100%" stopColor={color} stopOpacity="0" />
                </linearGradient>
            </defs>

            {showArea && (
                <path d={areaPath} fill="url(#sparkline-gradient)" />
            )}
            <path
                d={linePath}
                fill="none"
                stroke={color}
                strokeWidth="2"
                strokeLinecap="round"
                vectorEffect="non-scaling-stroke"
            />

            {/* End dot */}
            <circle
                cx={points[points.length - 1].x}
                cy={points[points.length - 1].y}
                r="3"
                fill={color}
                vectorEffect="non-scaling-stroke"
            />
        </svg>
    );
};

// ============================================
// STAT CARD WITH CHART
// ============================================

interface StatCardProps {
    title: string;
    value: string | number;
    change?: number;
    changeLabel?: string;
    trend?: number[];
    color?: string;
    icon?: React.ReactNode;
}

export const StatCard: React.FC<StatCardProps> = ({
    title,
    value,
    change,
    changeLabel = 'vs last week',
    trend,
    color = chartColors.primary[0],
    icon
}) => {
    const isPositive = change !== undefined && change >= 0;

    return (
        <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-sm">
            <div className="flex items-start justify-between mb-4">
                <div>
                    <p className="text-sm text-slate-500 dark:text-slate-400">{title}</p>
                    <p className="text-3xl font-bold text-slate-900 dark:text-white mt-1">{value}</p>
                </div>
                {icon && (
                    <div
                        className="w-12 h-12 rounded-xl flex items-center justify-center"
                        style={{ backgroundColor: `${color}20` }}
                    >
                        <div style={{ color }}>{icon}</div>
                    </div>
                )}
            </div>

            <div className="flex items-end justify-between">
                {change !== undefined && (
                    <div className={`text-sm font-medium ${isPositive ? 'text-emerald-500' : 'text-red-500'}`}>
                        {isPositive ? '↑' : '↓'} {Math.abs(change)}%
                        <span className="text-slate-400 font-normal ml-1">{changeLabel}</span>
                    </div>
                )}
                {trend && (
                    <Sparkline data={trend} color={color} height={32} className="w-20" />
                )}
            </div>
        </div>
    );
};

// ============================================
// EXPORT
// ============================================

export default {
    chartColors,
    BarChart,
    LineChart,
    DonutChart,
    AttendanceChart,
    Sparkline,
    StatCard,
    ChartWrapper,
    ChartLegend,
    ChartTooltip
};
