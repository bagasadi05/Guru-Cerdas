/**
 * AnimatedCounter Component
 * Smoothly animates numbers from 0 to target value
 */

import React, { useEffect, useState, useRef } from 'react';

interface AnimatedCounterProps {
    value: number;
    duration?: number; // in milliseconds
    prefix?: string;
    suffix?: string;
    decimals?: number;
    className?: string;
    onComplete?: () => void;
}

export const AnimatedCounter: React.FC<AnimatedCounterProps> = ({
    value,
    duration = 1000,
    prefix = '',
    suffix = '',
    decimals = 0,
    className = '',
    onComplete,
}) => {
    const [displayValue, setDisplayValue] = useState(0);
    const previousValue = useRef(0);
    const animationRef = useRef<number | null>(null);
    const startTimeRef = useRef<number | null>(null);

    useEffect(() => {
        const startValue = previousValue.current;
        const endValue = value;
        const difference = endValue - startValue;

        if (difference === 0) return;

        const animate = (currentTime: number) => {
            if (startTimeRef.current === null) {
                startTimeRef.current = currentTime;
            }

            const elapsed = currentTime - startTimeRef.current;
            const progress = Math.min(elapsed / duration, 1);

            // Easing function (ease-out-expo)
            const easeOutExpo = progress === 1 ? 1 : 1 - Math.pow(2, -10 * progress);

            const currentValue = startValue + (difference * easeOutExpo);
            setDisplayValue(currentValue);

            if (progress < 1) {
                animationRef.current = requestAnimationFrame(animate);
            } else {
                setDisplayValue(endValue);
                previousValue.current = endValue;
                startTimeRef.current = null;
                onComplete?.();
            }
        };

        animationRef.current = requestAnimationFrame(animate);

        return () => {
            if (animationRef.current) {
                cancelAnimationFrame(animationRef.current);
            }
        };
    }, [value, duration, onComplete]);

    const formattedValue = decimals > 0
        ? displayValue.toFixed(decimals)
        : Math.round(displayValue).toLocaleString('id-ID');

    return (
        <span className={`tabular-nums ${className}`}>
            {prefix}{formattedValue}{suffix}
        </span>
    );
};

/**
 * AnimatedPercentage Component
 * Specifically for percentage values with circular progress visual
 */
interface AnimatedPercentageProps {
    value: number; // 0-100
    size?: 'sm' | 'md' | 'lg';
    showRing?: boolean;
    color?: 'primary' | 'success' | 'warning' | 'error';
    className?: string;
}

export const AnimatedPercentage: React.FC<AnimatedPercentageProps> = ({
    value,
    size = 'md',
    showRing = true,
    color = 'primary',
    className = '',
}) => {
    const [animatedValue, setAnimatedValue] = useState(0);

    useEffect(() => {
        const timer = setTimeout(() => {
            setAnimatedValue(value);
        }, 100);
        return () => clearTimeout(timer);
    }, [value]);

    const sizeClasses = {
        sm: 'w-12 h-12 text-sm',
        md: 'w-16 h-16 text-lg',
        lg: 'w-24 h-24 text-2xl',
    };

    const colorClasses = {
        primary: 'text-indigo-500',
        success: 'text-emerald-500',
        warning: 'text-amber-500',
        error: 'text-rose-500',
    };

    const ringColors = {
        primary: 'stroke-indigo-500',
        success: 'stroke-emerald-500',
        warning: 'stroke-amber-500',
        error: 'stroke-rose-500',
    };

    const ringSize = size === 'sm' ? 40 : size === 'md' ? 56 : 88;
    const strokeWidth = size === 'sm' ? 3 : size === 'md' ? 4 : 6;
    const radius = (ringSize / 2) - strokeWidth;
    const circumference = 2 * Math.PI * radius;
    const offset = circumference - (animatedValue / 100) * circumference;

    return (
        <div className={`relative ${sizeClasses[size]} ${className}`}>
            {showRing && (
                <svg
                    className="absolute inset-0 -rotate-90 transform"
                    width={ringSize}
                    height={ringSize}
                >
                    {/* Background ring */}
                    <circle
                        cx={ringSize / 2}
                        cy={ringSize / 2}
                        r={radius}
                        fill="none"
                        className="stroke-slate-200 dark:stroke-slate-700"
                        strokeWidth={strokeWidth}
                    />
                    {/* Progress ring */}
                    <circle
                        cx={ringSize / 2}
                        cy={ringSize / 2}
                        r={radius}
                        fill="none"
                        className={`${ringColors[color]} transition-all duration-1000 ease-out`}
                        strokeWidth={strokeWidth}
                        strokeLinecap="round"
                        strokeDasharray={circumference}
                        strokeDashoffset={offset}
                    />
                </svg>
            )}
            <div className={`absolute inset-0 flex items-center justify-center font-bold ${colorClasses[color]}`}>
                <AnimatedCounter value={animatedValue} suffix="%" duration={1000} />
            </div>
        </div>
    );
};

/**
 * AnimatedStatCard Component
 * Complete stat card with animated number and optional trend indicator
 */
interface AnimatedStatCardProps {
    label: string;
    value: number;
    prefix?: string;
    suffix?: string;
    icon?: React.ReactNode;
    trend?: {
        value: number;
        isPositive: boolean;
    };
    color?: 'primary' | 'success' | 'warning' | 'error';
    className?: string;
}

export const AnimatedStatCard: React.FC<AnimatedStatCardProps> = ({
    label,
    value,
    prefix = '',
    suffix = '',
    icon,
    trend,
    color = 'primary',
    className = '',
}) => {
    const colorClasses = {
        primary: 'from-indigo-500 to-purple-600',
        success: 'from-emerald-500 to-green-600',
        warning: 'from-amber-500 to-orange-600',
        error: 'from-rose-500 to-red-600',
    };

    const glowClasses = {
        primary: 'shadow-indigo-500/30',
        success: 'shadow-emerald-500/30',
        warning: 'shadow-amber-500/30',
        error: 'shadow-rose-500/30',
    };

    return (
        <div className={`glass-card rounded-2xl p-5 card-hover-lift relative overflow-hidden ${className}`}>
            {/* Background gradient accent */}
            <div className={`absolute top-0 right-0 w-20 h-20 bg-gradient-to-br ${colorClasses[color]} opacity-10 rounded-full blur-2xl -mr-6 -mt-6`} />

            <div className="relative z-10">
                {icon && (
                    <div className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${colorClasses[color]} ${glowClasses[color]} shadow-lg flex items-center justify-center text-white mb-4`}>
                        {icon}
                    </div>
                )}

                <div className="space-y-1">
                    <p className="text-3xl font-bold text-slate-800 dark:text-white">
                        <AnimatedCounter
                            value={value}
                            prefix={prefix}
                            suffix={suffix}
                            duration={1200}
                        />
                    </p>
                    <p className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                        {label}
                    </p>
                </div>

                {trend && (
                    <div className={`mt-3 inline-flex items-center gap-1 text-xs font-semibold px-2 py-1 rounded-full ${trend.isPositive
                            ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400'
                            : 'bg-rose-100 text-rose-700 dark:bg-rose-500/20 dark:text-rose-400'
                        }`}>
                        <svg
                            className={`w-3 h-3 ${trend.isPositive ? '' : 'rotate-180'}`}
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                        >
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 10l7-7m0 0l7 7m-7-7v18" />
                        </svg>
                        {trend.value}%
                    </div>
                )}
            </div>
        </div>
    );
};

export default AnimatedCounter;
