import React, { useState, useRef, useEffect } from 'react';
import { ZoomInIcon, ZoomOutIcon, Maximize2Icon, XIcon } from 'lucide-react';

interface ChartTooltip {
    x: number;
    y: number;
    content: React.ReactNode;
}

interface ResponsiveChartProps {
    children: React.ReactNode;
    title?: string;
    subtitle?: string;
    minHeight?: number;
    enableZoom?: boolean;
    enableFullscreen?: boolean;
    className?: string;
}

// Tooltip Component
export const ChartTooltipDisplay: React.FC<{ tooltip: ChartTooltip | null }> = ({ tooltip }) => {
    if (!tooltip) return null;

    return (
        <div
            className="absolute z-50 px-3 py-2 bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 text-sm rounded-lg shadow-lg pointer-events-none transform -translate-x-1/2 -translate-y-full"
            style={{ left: tooltip.x, top: tooltip.y - 8 }}
        >
            {tooltip.content}
            <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 translate-y-full border-4 border-transparent border-t-gray-900 dark:border-t-gray-100" />
        </div>
    );
};

// Context for chart interactions
interface ChartContextValue {
    tooltip: ChartTooltip | null;
    setTooltip: (tooltip: ChartTooltip | null) => void;
    zoom: number;
    setZoom: (zoom: number) => void;
    isFullscreen: boolean;
    toggleFullscreen: () => void;
}

const ChartContext = React.createContext<ChartContextValue | null>(null);

export const useChartContext = () => {
    const context = React.useContext(ChartContext);
    if (!context) {
        throw new Error('useChartContext must be used within ResponsiveChart');
    }
    return context;
};

export const ResponsiveChart: React.FC<ResponsiveChartProps> = ({
    children,
    title,
    subtitle,
    minHeight = 200,
    enableZoom = false,
    enableFullscreen = true,
    className = ''
}) => {
    const [tooltip, setTooltip] = useState<ChartTooltip | null>(null);
    const [zoom, setZoom] = useState(1);
    const [isFullscreen, setIsFullscreen] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);

    const toggleFullscreen = () => {
        if (!document.fullscreenElement && containerRef.current) {
            containerRef.current.requestFullscreen?.();
            setIsFullscreen(true);
        } else {
            document.exitFullscreen?.();
            setIsFullscreen(false);
        }
    };

    // Listen for fullscreen changes
    useEffect(() => {
        const handleFullscreenChange = () => {
            setIsFullscreen(!!document.fullscreenElement);
        };
        document.addEventListener('fullscreenchange', handleFullscreenChange);
        return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
    }, []);

    const handleZoomIn = () => setZoom(prev => Math.min(prev + 0.25, 2));
    const handleZoomOut = () => setZoom(prev => Math.max(prev - 0.25, 0.5));

    const contextValue: ChartContextValue = {
        tooltip,
        setTooltip,
        zoom,
        setZoom,
        isFullscreen,
        toggleFullscreen
    };

    return (
        <ChartContext.Provider value={contextValue}>
            <div
                ref={containerRef}
                className={`relative bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden ${isFullscreen ? 'fixed inset-0 z-50 rounded-none' : ''
                    } ${className}`}
            >
                {/* Header */}
                {(title || enableZoom || enableFullscreen) && (
                    <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-700">
                        <div>
                            {title && (
                                <h3 className="font-semibold text-gray-900 dark:text-white">{title}</h3>
                            )}
                            {subtitle && (
                                <p className="text-xs text-gray-500">{subtitle}</p>
                            )}
                        </div>
                        <div className="flex items-center gap-1">
                            {enableZoom && (
                                <>
                                    <button
                                        onClick={handleZoomOut}
                                        disabled={zoom <= 0.5}
                                        className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed"
                                        title="Zoom Out"
                                    >
                                        <ZoomOutIcon className="w-4 h-4 text-gray-500" />
                                    </button>
                                    <span className="text-xs text-gray-400 w-12 text-center">{Math.round(zoom * 100)}%</span>
                                    <button
                                        onClick={handleZoomIn}
                                        disabled={zoom >= 2}
                                        className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed"
                                        title="Zoom In"
                                    >
                                        <ZoomInIcon className="w-4 h-4 text-gray-500" />
                                    </button>
                                </>
                            )}
                            {enableFullscreen && (
                                <button
                                    onClick={toggleFullscreen}
                                    className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800"
                                    title={isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}
                                >
                                    {isFullscreen ? (
                                        <XIcon className="w-4 h-4 text-gray-500" />
                                    ) : (
                                        <Maximize2Icon className="w-4 h-4 text-gray-500" />
                                    )}
                                </button>
                            )}
                        </div>
                    </div>
                )}

                {/* Chart Container */}
                <div
                    className="relative overflow-auto"
                    style={{
                        minHeight: isFullscreen ? '100%' : minHeight,
                        maxHeight: isFullscreen ? '100vh' : undefined
                    }}
                    onMouseLeave={() => setTooltip(null)}
                >
                    <div
                        className="p-4 transition-transform origin-top-left"
                        style={{ transform: `scale(${zoom})` }}
                    >
                        {children}
                    </div>

                    {/* Tooltip */}
                    <ChartTooltipDisplay tooltip={tooltip} />
                </div>
            </div>
        </ChartContext.Provider>
    );
};

// Interactive Bar for charts with hover tooltip
interface InteractiveBarProps {
    value: number;
    maxValue: number;
    label: string;
    subLabel?: string;
    color?: string;
    tooltipContent?: React.ReactNode;
    onClick?: () => void;
}

export const InteractiveBar: React.FC<InteractiveBarProps> = ({
    value,
    maxValue,
    label,
    subLabel,
    color = 'bg-indigo-500',
    tooltipContent,
    onClick
}) => {
    const barRef = useRef<HTMLDivElement>(null);
    const context = React.useContext(ChartContext);
    const percentage = Math.min((value / maxValue) * 100, 100);

    const handleMouseEnter = (e: React.MouseEvent) => {
        if (context && tooltipContent && barRef.current) {
            const rect = barRef.current.getBoundingClientRect();
            const parentRect = barRef.current.closest('.relative')?.getBoundingClientRect();
            if (parentRect) {
                context.setTooltip({
                    x: rect.left - parentRect.left + rect.width / 2,
                    y: rect.top - parentRect.top,
                    content: tooltipContent
                });
            }
        }
    };

    const handleMouseLeave = () => {
        context?.setTooltip(null);
    };

    return (
        <div
            ref={barRef}
            className={`group ${onClick ? 'cursor-pointer' : ''}`}
            onClick={onClick}
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
        >
            <div className="flex justify-between text-sm mb-1">
                <span className="font-medium text-gray-700 dark:text-gray-300 truncate max-w-[60%]">
                    {label}
                </span>
                <div className="flex items-center gap-2">
                    {subLabel && (
                        <span className="text-xs text-gray-400">{subLabel}</span>
                    )}
                    <span className="font-bold text-gray-900 dark:text-white">{value}</span>
                </div>
            </div>
            <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                <div
                    className={`h-full ${color} rounded-full transition-all duration-500 group-hover:opacity-80`}
                    style={{ width: `${percentage}%` }}
                />
            </div>
        </div>
    );
};

export default ResponsiveChart;
