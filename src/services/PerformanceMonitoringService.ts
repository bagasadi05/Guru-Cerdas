/**
 * Performance Monitoring Service
 * 
 * Tracks Core Web Vitals and other performance metrics:
 * - FCP (First Contentful Paint)
 * - LCP (Largest Contentful Paint)
 * - FID (First Input Delay)
 * - CLS (Cumulative Layout Shift)
 * - TTFB (Time to First Byte)
 * - INP (Interaction to Next Paint)
 */

import { LoggerService } from './LoggerService';

interface PerformanceMetric {
    name: string;
    value: number;
    rating: 'good' | 'needs-improvement' | 'poor';
    timestamp: number;
}

interface WebVitalsThresholds {
    good: number;
    poor: number;
}

// Core Web Vitals thresholds (in milliseconds, except CLS which is unitless)
const THRESHOLDS: Record<string, WebVitalsThresholds> = {
    FCP: { good: 1800, poor: 3000 },
    LCP: { good: 2500, poor: 4000 },
    FID: { good: 100, poor: 300 },
    CLS: { good: 0.1, poor: 0.25 },
    TTFB: { good: 800, poor: 1800 },
    INP: { good: 200, poor: 500 },
};

class PerformanceMonitoringService {
    private static instance: PerformanceMonitoringService;
    private metrics: Map<string, PerformanceMetric> = new Map();
    private logger = LoggerService.getInstance();
    private observers: Set<(metrics: Map<string, PerformanceMetric>) => void> = new Set();
    private isEnabled: boolean = true;

    private constructor() {
        if (typeof window !== 'undefined') {
            this.initializeObservers();
        }
    }

    static getInstance(): PerformanceMonitoringService {
        if (!PerformanceMonitoringService.instance) {
            PerformanceMonitoringService.instance = new PerformanceMonitoringService();
        }
        return PerformanceMonitoringService.instance;
    }

    /**
     * Enable or disable performance monitoring
     */
    setEnabled(enabled: boolean): void {
        this.isEnabled = enabled;
    }

    /**
     * Get rating for a metric value
     */
    private getRating(name: string, value: number): 'good' | 'needs-improvement' | 'poor' {
        const threshold = THRESHOLDS[name];
        if (!threshold) return 'good';

        if (value <= threshold.good) return 'good';
        if (value <= threshold.poor) return 'needs-improvement';
        return 'poor';
    }

    /**
     * Record a metric
     */
    private recordMetric(name: string, value: number): void {
        if (!this.isEnabled) return;

        const metric: PerformanceMetric = {
            name,
            value,
            rating: this.getRating(name, value),
            timestamp: Date.now(),
        };

        this.metrics.set(name, metric);
        this.notifyObservers();

        // Log warnings for poor metrics
        if (metric.rating === 'poor') {
            this.logger.warn('PerformanceMonitor', `Poor ${name} detected: ${value.toFixed(2)}`, { metric });

            if (process.env.NODE_ENV === 'development') {
                console.warn(`⚠️ Poor ${name}: ${value.toFixed(2)} (threshold: ${THRESHOLDS[name].poor})`);
            }
        } else if (metric.rating === 'needs-improvement') {
            this.logger.info('PerformanceMonitor', `${name} needs improvement: ${value.toFixed(2)}`, { metric });
        } else {
            this.logger.debug('PerformanceMonitor', `${name}: ${value.toFixed(2)} (good)`, { metric });
        }
    }

    /**
     * Initialize performance observers
     */
    private initializeObservers(): void {
        // FCP - First Contentful Paint
        this.observePaint('first-contentful-paint', 'FCP');

        // LCP - Largest Contentful Paint
        this.observeLCP();

        // FID - First Input Delay
        this.observeFID();

        // CLS - Cumulative Layout Shift
        this.observeCLS();

        // TTFB - Time to First Byte
        this.observeTTFB();

        // INP - Interaction to Next Paint
        this.observeINP();

        // Log navigation timing on load
        if (document.readyState === 'complete') {
            this.logNavigationTiming();
        } else {
            window.addEventListener('load', () => {
                setTimeout(() => this.logNavigationTiming(), 0);
            });
        }
    }

    /**
     * Observe paint entries
     */
    private observePaint(entryType: string, metricName: string): void {
        try {
            const observer = new PerformanceObserver((list) => {
                const entries = list.getEntries();
                entries.forEach((entry) => {
                    if (entry.name === entryType) {
                        this.recordMetric(metricName, entry.startTime);
                    }
                });
            });
            observer.observe({ type: 'paint', buffered: true });
        } catch (e) {
            // PerformanceObserver not supported
        }
    }

    /**
     * Observe Largest Contentful Paint
     */
    private observeLCP(): void {
        try {
            let lcp = 0;
            const observer = new PerformanceObserver((list) => {
                const entries = list.getEntries();
                const lastEntry = entries[entries.length - 1] as PerformanceEntry & { startTime: number };
                lcp = lastEntry.startTime;
            });
            observer.observe({ type: 'largest-contentful-paint', buffered: true });

            // Report LCP on visibility change or page unload
            const reportLCP = () => {
                if (lcp > 0) {
                    this.recordMetric('LCP', lcp);
                }
            };

            document.addEventListener('visibilitychange', () => {
                if (document.visibilityState === 'hidden') {
                    reportLCP();
                }
            });

            window.addEventListener('beforeunload', reportLCP);
        } catch (e) {
            // LCP not supported
        }
    }

    /**
     * Observe First Input Delay
     */
    private observeFID(): void {
        try {
            const observer = new PerformanceObserver((list) => {
                const entries = list.getEntries();
                entries.forEach((entry) => {
                    const fidEntry = entry as PerformanceEventTiming;
                    const fid = fidEntry.processingStart - fidEntry.startTime;
                    this.recordMetric('FID', fid);
                });
            });
            observer.observe({ type: 'first-input', buffered: true });
        } catch (e) {
            // FID not supported
        }
    }

    /**
     * Observe Cumulative Layout Shift
     */
    private observeCLS(): void {
        try {
            let cls = 0;
            let sessionValue = 0;
            let sessionEntries: PerformanceEntry[] = [];

            const observer = new PerformanceObserver((list) => {
                const entries = list.getEntries() as (PerformanceEntry & { hadRecentInput: boolean; value: number })[];

                for (const entry of entries) {
                    // Only count shifts without recent input
                    if (!entry.hadRecentInput) {
                        const firstEntry = sessionEntries[0] as PerformanceEntry & { startTime: number } | undefined;
                        const lastEntry = sessionEntries[sessionEntries.length - 1] as PerformanceEntry & { startTime: number } | undefined;

                        // If the entry occurred within 1 second of the previous entry and
                        // 5 seconds of the first entry in the session
                        if (
                            sessionValue &&
                            entry.startTime - (lastEntry?.startTime || 0) < 1000 &&
                            entry.startTime - (firstEntry?.startTime || 0) < 5000
                        ) {
                            sessionValue += entry.value;
                            sessionEntries.push(entry);
                        } else {
                            sessionValue = entry.value;
                            sessionEntries = [entry];
                        }

                        if (sessionValue > cls) {
                            cls = sessionValue;
                        }
                    }
                }
            });

            observer.observe({ type: 'layout-shift', buffered: true });

            // Report CLS on visibility change
            const reportCLS = () => {
                if (cls > 0) {
                    this.recordMetric('CLS', cls);
                }
            };

            document.addEventListener('visibilitychange', () => {
                if (document.visibilityState === 'hidden') {
                    reportCLS();
                }
            });
        } catch (e) {
            // CLS not supported
        }
    }

    /**
     * Observe Time to First Byte
     */
    private observeTTFB(): void {
        try {
            const observer = new PerformanceObserver((list) => {
                const entries = list.getEntries();
                entries.forEach((entry) => {
                    const navEntry = entry as PerformanceNavigationTiming;
                    const ttfb = navEntry.responseStart - navEntry.requestStart;
                    if (ttfb > 0) {
                        this.recordMetric('TTFB', ttfb);
                    }
                });
            });
            observer.observe({ type: 'navigation', buffered: true });
        } catch (e) {
            // TTFB not supported
        }
    }

    /**
     * Observe Interaction to Next Paint
     */
    private observeINP(): void {
        try {
            let inp = 0;
            const observer = new PerformanceObserver((list) => {
                const entries = list.getEntries() as PerformanceEventTiming[];
                entries.forEach((entry) => {
                    const duration = entry.processingEnd - entry.startTime;
                    if (duration > inp) {
                        inp = duration;
                    }
                });
            });
            observer.observe({ type: 'event', buffered: true });

            // Report INP on visibility change
            const reportINP = () => {
                if (inp > 0) {
                    this.recordMetric('INP', inp);
                }
            };

            document.addEventListener('visibilitychange', () => {
                if (document.visibilityState === 'hidden') {
                    reportINP();
                }
            });
        } catch (e) {
            // INP not supported
        }
    }

    /**
     * Log navigation timing metrics
     */
    private logNavigationTiming(): void {
        try {
            const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
            if (navigation) {
                const timing = {
                    dns: navigation.domainLookupEnd - navigation.domainLookupStart,
                    connection: navigation.connectEnd - navigation.connectStart,
                    ttfb: navigation.responseStart - navigation.requestStart,
                    download: navigation.responseEnd - navigation.responseStart,
                    domParsing: navigation.domInteractive - navigation.responseEnd,
                    domContentLoaded: navigation.domContentLoadedEventEnd - navigation.domContentLoadedEventStart,
                    load: navigation.loadEventEnd - navigation.loadEventStart,
                    total: navigation.loadEventEnd - navigation.startTime,
                };

                this.logger.info('PerformanceMonitor', 'Navigation timing', timing);

                if (process.env.NODE_ENV === 'development') {
                    console.log('📊 Navigation Timing:', timing);
                }
            }
        } catch (e) {
            // Navigation timing not available
        }
    }

    /**
     * Subscribe to metric updates
     */
    subscribe(callback: (metrics: Map<string, PerformanceMetric>) => void): () => void {
        this.observers.add(callback);
        // Immediately call with current metrics
        callback(this.metrics);

        return () => {
            this.observers.delete(callback);
        };
    }

    /**
     * Notify all observers
     */
    private notifyObservers(): void {
        this.observers.forEach((callback) => callback(this.metrics));
    }

    /**
     * Get all metrics
     */
    getMetrics(): Map<string, PerformanceMetric> {
        return new Map(this.metrics);
    }

    /**
     * Get a specific metric
     */
    getMetric(name: string): PerformanceMetric | undefined {
        return this.metrics.get(name);
    }

    /**
     * Generate performance report
     */
    generateReport(): string {
        const metrics = Array.from(this.metrics.values());

        let report = `
PERFORMANCE REPORT
Generated: ${new Date().toISOString()}
URL: ${typeof window !== 'undefined' ? window.location.href : 'N/A'}

CORE WEB VITALS
---------------
`;

        const vitalOrder = ['FCP', 'LCP', 'FID', 'CLS', 'TTFB', 'INP'];

        vitalOrder.forEach((name) => {
            const metric = this.metrics.get(name);
            if (metric) {
                const statusEmoji = metric.rating === 'good' ? '✅' : metric.rating === 'needs-improvement' ? '⚠️' : '❌';
                const unit = name === 'CLS' ? '' : 'ms';
                report += `${statusEmoji} ${name}: ${metric.value.toFixed(2)}${unit} (${metric.rating})\n`;
            } else {
                report += `⏳ ${name}: Not measured yet\n`;
            }
        });

        // Summary
        const poorMetrics = metrics.filter(m => m.rating === 'poor');
        const needsImprovement = metrics.filter(m => m.rating === 'needs-improvement');

        report += `
SUMMARY
-------
Good: ${metrics.filter(m => m.rating === 'good').length}
Needs Improvement: ${needsImprovement.length}
Poor: ${poorMetrics.length}

`;

        if (poorMetrics.length > 0) {
            report += `⚠️ ATTENTION: ${poorMetrics.length} metric(s) need immediate attention!\n`;
        }

        return report;
    }
}

// Singleton export
export const performanceMonitor = PerformanceMonitoringService.getInstance();

// React hook for using performance metrics
export function usePerformanceMetrics() {
    const [metrics, setMetrics] = React.useState<Map<string, PerformanceMetric>>(new Map());

    React.useEffect(() => {
        const unsubscribe = performanceMonitor.subscribe(setMetrics);
        return unsubscribe;
    }, []);

    return {
        metrics,
        getMetric: (name: string) => metrics.get(name),
        generateReport: () => performanceMonitor.generateReport(),
    };
}

// Need to import React for the hook
import React from 'react';
