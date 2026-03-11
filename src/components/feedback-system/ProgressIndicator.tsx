import React from 'react';

type ProgressColor = 'indigo' | 'emerald' | 'red' | 'amber' | 'blue';

const circularColorClasses: Record<ProgressColor, string> = {
    indigo: 'text-indigo-500',
    emerald: 'text-emerald-500',
    red: 'text-red-500',
    amber: 'text-amber-500',
    blue: 'text-blue-500'
};

const linearColorClasses: Record<ProgressColor, string> = {
    indigo: 'bg-indigo-500',
    emerald: 'bg-emerald-500',
    red: 'bg-red-500',
    amber: 'bg-amber-500',
    blue: 'bg-blue-500'
};

export interface ProgressIndicatorProps {
    value: number;
    showLabel?: boolean;
    size?: 'sm' | 'md' | 'lg';
    variant?: 'linear' | 'circular';
    color?: ProgressColor;
    className?: string;
}

export const ProgressIndicator: React.FC<ProgressIndicatorProps> = ({
    value,
    showLabel = true,
    size = 'md',
    variant = 'linear',
    color = 'indigo',
    className = ''
}) => {
    const clampedValue = Math.min(100, Math.max(0, value));

    const sizeClasses = {
        sm: variant === 'linear' ? 'h-1' : 'h-8 w-8',
        md: variant === 'linear' ? 'h-2' : 'h-12 w-12',
        lg: variant === 'linear' ? 'h-3' : 'h-16 w-16'
    };

    if (variant === 'circular') {
        const radius = size === 'sm' ? 14 : size === 'md' ? 20 : 28;
        const circumference = 2 * Math.PI * radius;
        const strokeDashoffset = circumference - (clampedValue / 100) * circumference;

        return (
            <div className={`relative ${sizeClasses[size]} ${className}`}>
                <svg className="h-full w-full -rotate-90" viewBox="0 0 64 64">
                    <circle
                        cx="32"
                        cy="32"
                        r={radius}
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="4"
                        className="text-slate-200 dark:text-slate-700"
                    />
                    <circle
                        cx="32"
                        cy="32"
                        r={radius}
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="4"
                        strokeLinecap="round"
                        className={`${circularColorClasses[color]} transition-all duration-300`}
                        style={{
                            strokeDasharray: circumference,
                            strokeDashoffset
                        }}
                    />
                </svg>
                {showLabel && size !== 'sm' && (
                    <span className="absolute inset-0 flex items-center justify-center text-xs font-medium text-slate-700 dark:text-slate-300">
                        {Math.round(clampedValue)}%
                    </span>
                )}
            </div>
        );
    }

    return (
        <div className={className}>
            <div className={`w-full overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700 ${sizeClasses[size]}`}>
                <div
                    className={`h-full rounded-full ${linearColorClasses[color]} transition-all duration-300`}
                    style={{ width: `${clampedValue}%` }}
                    role="progressbar"
                    aria-valuenow={clampedValue}
                    aria-valuemin={0}
                    aria-valuemax={100}
                />
            </div>
            {showLabel && (
                <div className="mt-1 text-right text-sm text-slate-500 dark:text-slate-400">
                    {Math.round(clampedValue)}%
                </div>
            )}
        </div>
    );
};
