/**
 * Performance Dashboard Component
 * 
 * Displays Core Web Vitals and performance metrics in a visual dashboard.
 * Only shows in development mode by default.
 */

import React, { useState, useEffect } from 'react';
import { performanceMonitor } from '../../services/PerformanceMonitoringService';
import { ActivityIcon, XIcon, ChevronDownIcon, ChevronUpIcon } from 'lucide-react';

interface PerformanceMetric {
    name: string;
    value: number;
    rating: 'good' | 'needs-improvement' | 'poor';
    timestamp: number;
}

interface PerformanceDashboardProps {
    /** Always show, even in production */
    forceShow?: boolean;
    /** Position of the dashboard */
    position?: 'bottom-left' | 'bottom-right' | 'top-left' | 'top-right';
}

const METRIC_INFO: Record<string, { label: string; unit: string; description: string }> = {
    FCP: { label: 'First Contentful Paint', unit: 'ms', description: 'Time until first content is painted' },
    LCP: { label: 'Largest Contentful Paint', unit: 'ms', description: 'Time until largest content is painted' },
    FID: { label: 'First Input Delay', unit: 'ms', description: 'Time from first interaction to response' },
    CLS: { label: 'Cumulative Layout Shift', unit: '', description: 'Measure of visual stability' },
    TTFB: { label: 'Time to First Byte', unit: 'ms', description: 'Time until first byte received' },
    INP: { label: 'Interaction to Next Paint', unit: 'ms', description: 'Responsiveness to user interactions' },
};

const PerformanceDashboard: React.FC<PerformanceDashboardProps> = ({
    forceShow = false,
    position = 'bottom-right'
}) => {
    const [metrics, setMetrics] = useState<Map<string, PerformanceMetric>>(new Map());
    const [isOpen, setIsOpen] = useState(false);
    const [isMinimized, setIsMinimized] = useState(true);

    // Only show in development or when forced
    const shouldShow = forceShow || process.env.NODE_ENV === 'development';

    useEffect(() => {
        if (!shouldShow) return;

        const unsubscribe = performanceMonitor.subscribe(setMetrics);
        return unsubscribe;
    }, [shouldShow]);

    if (!shouldShow) return null;

    const metricsArray = Array.from(metrics.values());
    const poorCount = metricsArray.filter(m => m.rating === 'poor').length;
    const needsImprovementCount = metricsArray.filter(m => m.rating === 'needs-improvement').length;

    const getStatusColor = (rating: string) => {
        switch (rating) {
            case 'good': return 'text-green-500';
            case 'needs-improvement': return 'text-amber-500';
            case 'poor': return 'text-red-500';
            default: return 'text-slate-400';
        }
    };

    const getStatusBg = (rating: string) => {
        switch (rating) {
            case 'good': return 'bg-green-500/10';
            case 'needs-improvement': return 'bg-amber-500/10';
            case 'poor': return 'bg-red-500/10';
            default: return 'bg-slate-500/10';
        }
    };

    const positionClasses = {
        'bottom-left': 'bottom-4 left-4',
        'bottom-right': 'bottom-4 right-4',
        'top-left': 'top-4 left-4',
        'top-right': 'top-4 right-4',
    };

    // Minimized badge
    if (isMinimized) {
        return (
            <button
                onClick={() => setIsMinimized(false)}
                className={`fixed ${positionClasses[position]} z-50 flex items-center gap-2 px-3 py-2 rounded-full bg-slate-900/90 backdrop-blur-sm border border-slate-700 shadow-lg hover:bg-slate-800 transition-all group`}
                title="Performance Dashboard"
            >
                <ActivityIcon className="w-4 h-4 text-indigo-400" />
                <span className="text-xs font-medium text-slate-300">Perf</span>
                {poorCount > 0 && (
                    <span className="w-5 h-5 rounded-full bg-red-500 text-white text-xs flex items-center justify-center font-bold">
                        {poorCount}
                    </span>
                )}
                {poorCount === 0 && needsImprovementCount > 0 && (
                    <span className="w-5 h-5 rounded-full bg-amber-500 text-white text-xs flex items-center justify-center font-bold">
                        {needsImprovementCount}
                    </span>
                )}
                {poorCount === 0 && needsImprovementCount === 0 && metricsArray.length > 0 && (
                    <span className="w-2 h-2 rounded-full bg-green-500" />
                )}
            </button>
        );
    }

    return (
        <div className={`fixed ${positionClasses[position]} z-50 w-80 bg-slate-900/95 backdrop-blur-sm rounded-xl border border-slate-700 shadow-2xl overflow-hidden`}>
            {/* Header */}
            <div className="flex items-center justify-between p-3 border-b border-slate-700">
                <div className="flex items-center gap-2">
                    <ActivityIcon className="w-4 h-4 text-indigo-400" />
                    <h3 className="text-sm font-semibold text-white">Performance</h3>
                </div>
                <div className="flex items-center gap-1">
                    <button
                        onClick={() => setIsOpen(!isOpen)}
                        className="p-1 hover:bg-slate-700 rounded transition-colors"
                        title={isOpen ? 'Collapse' : 'Expand'}
                    >
                        {isOpen ? (
                            <ChevronUpIcon className="w-4 h-4 text-slate-400" />
                        ) : (
                            <ChevronDownIcon className="w-4 h-4 text-slate-400" />
                        )}
                    </button>
                    <button
                        onClick={() => setIsMinimized(true)}
                        className="p-1 hover:bg-slate-700 rounded transition-colors"
                        title="Minimize"
                    >
                        <XIcon className="w-4 h-4 text-slate-400" />
                    </button>
                </div>
            </div>

            {/* Quick Stats */}
            <div className="p-3 grid grid-cols-3 gap-2">
                <div className="text-center p-2 rounded-lg bg-green-500/10">
                    <div className="text-lg font-bold text-green-400">
                        {metricsArray.filter(m => m.rating === 'good').length}
                    </div>
                    <div className="text-[10px] text-green-400/70 uppercase">Good</div>
                </div>
                <div className="text-center p-2 rounded-lg bg-amber-500/10">
                    <div className="text-lg font-bold text-amber-400">
                        {needsImprovementCount}
                    </div>
                    <div className="text-[10px] text-amber-400/70 uppercase">Needs Work</div>
                </div>
                <div className="text-center p-2 rounded-lg bg-red-500/10">
                    <div className="text-lg font-bold text-red-400">
                        {poorCount}
                    </div>
                    <div className="text-[10px] text-red-400/70 uppercase">Poor</div>
                </div>
            </div>

            {/* Detailed Metrics */}
            {isOpen && (
                <div className="p-3 pt-0 space-y-2 max-h-64 overflow-y-auto">
                    {['FCP', 'LCP', 'FID', 'CLS', 'TTFB', 'INP'].map((name) => {
                        const metric = metrics.get(name);
                        const info = METRIC_INFO[name];

                        return (
                            <div
                                key={name}
                                className={`p-2 rounded-lg ${metric ? getStatusBg(metric.rating) : 'bg-slate-800/50'}`}
                            >
                                <div className="flex items-center justify-between">
                                    <div>
                                        <div className="text-xs font-medium text-slate-300">{name}</div>
                                        <div className="text-[10px] text-slate-500">{info.label}</div>
                                    </div>
                                    <div className="text-right">
                                        {metric ? (
                                            <>
                                                <div className={`text-sm font-bold ${getStatusColor(metric.rating)}`}>
                                                    {metric.value.toFixed(name === 'CLS' ? 3 : 0)}{info.unit}
                                                </div>
                                                <div className={`text-[10px] ${getStatusColor(metric.rating)}`}>
                                                    {metric.rating}
                                                </div>
                                            </>
                                        ) : (
                                            <div className="text-xs text-slate-500">Pending...</div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* Footer */}
            <div className="p-2 border-t border-slate-700 text-center">
                <button
                    onClick={() => {
                        const report = performanceMonitor.generateReport();
                        console.log(report);
                        navigator.clipboard?.writeText(report);
                    }}
                    className="text-xs text-indigo-400 hover:text-indigo-300 transition-colors"
                >
                    Copy Report to Console
                </button>
            </div>
        </div>
    );
};

export default PerformanceDashboard;
