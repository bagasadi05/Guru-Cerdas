/**
 * Standardized UI Wrapper Components
 * 
 * These components provide consistent styling across the application.
 * Use these instead of applying Tailwind classes directly for major UI elements.
 */

import React from 'react';

// ============================================
// PAGE CONTAINER
// ============================================
interface PageContainerProps {
    children: React.ReactNode;
    className?: string;
    maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '7xl' | 'full';
}

export const PageContainer: React.FC<PageContainerProps> = ({
    children,
    className = '',
    maxWidth = '7xl'
}) => {
    const maxWidthClass = {
        sm: 'max-w-sm',
        md: 'max-w-md',
        lg: 'max-w-lg',
        xl: 'max-w-xl',
        '2xl': 'max-w-2xl',
        '7xl': 'max-w-7xl',
        full: 'max-w-full',
    }[maxWidth];

    return (
        <div className={`w-full min-h-full p-3 sm:p-4 md:p-6 lg:p-8 ${maxWidthClass} mx-auto pb-24 lg:pb-8 ${className}`}>
            {children}
        </div>
    );
};

// ============================================
// SECTION
// ============================================
interface SectionProps {
    children: React.ReactNode;
    className?: string;
    spacing?: 'tight' | 'normal' | 'relaxed';
}

export const Section: React.FC<SectionProps> = ({
    children,
    className = '',
    spacing = 'normal'
}) => {
    const spacingClass = {
        tight: 'space-y-3 sm:space-y-4',
        normal: 'space-y-4 sm:space-y-6',
        relaxed: 'space-y-6 sm:space-y-8',
    }[spacing];

    return (
        <div className={`${spacingClass} ${className}`}>
            {children}
        </div>
    );
};

// ============================================
// CARD
// ============================================
interface CardWrapperProps {
    children: React.ReactNode;
    className?: string;
    variant?: 'default' | 'glass' | 'stat' | 'interactive';
    padding?: 'none' | 'sm' | 'md' | 'lg';
}

export const CardWrapper: React.FC<CardWrapperProps> = ({
    children,
    className = '',
    variant = 'default',
    padding = 'md'
}) => {
    const baseClasses = 'rounded-2xl';

    const variantClasses = {
        default: 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm',
        glass: 'glass-card border border-white/20 dark:border-white/10 shadow-lg',
        stat: 'glass-card border border-white/20 dark:border-white/5 shadow-lg shadow-slate-200/50 dark:shadow-black/20 card-hover-glow',
        interactive: 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-lg hover:-translate-y-1 transition-all duration-300',
    }[variant];

    const paddingClasses = {
        none: '',
        sm: 'p-3 sm:p-4',
        md: 'p-4 sm:p-5 md:p-6',
        lg: 'p-5 sm:p-6 md:p-8',
    }[padding];

    return (
        <div className={`${baseClasses} ${variantClasses} ${paddingClasses} ${className}`}>
            {children}
        </div>
    );
};

// ============================================
// CARD HEADER
// ============================================
interface CardHeaderProps {
    title: string;
    description?: string;
    icon?: React.ReactNode;
    action?: React.ReactNode;
    className?: string;
    gradient?: boolean;
}

export const CardHeader: React.FC<CardHeaderProps> = ({
    title,
    description,
    icon,
    action,
    className = '',
    gradient = false
}) => {
    const bgClass = gradient
        ? 'bg-gradient-to-r from-indigo-500/10 via-purple-500/5 to-transparent'
        : '';

    return (
        <div className={`p-4 sm:p-6 border-b border-slate-200/50 dark:border-white/5 ${bgClass} ${className}`}>
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    {icon && (
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-600 to-purple-600 flex items-center justify-center text-white shadow-lg shadow-indigo-500/25">
                            {icon}
                        </div>
                    )}
                    <div>
                        <h3 className="font-bold text-lg text-slate-800 dark:text-white">{title}</h3>
                        {description && (
                            <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">{description}</p>
                        )}
                    </div>
                </div>
                {action && <div>{action}</div>}
            </div>
        </div>
    );
};

// ============================================
// PAGE HEADER
// ============================================
interface PageHeaderProps {
    title: string;
    description?: string;
    icon?: React.ReactNode;
    actions?: React.ReactNode;
    className?: string;
}

export const PageHeader: React.FC<PageHeaderProps> = ({
    title,
    description,
    icon,
    actions,
    className = ''
}) => {
    return (
        <header className={`relative p-5 sm:p-8 md:p-12 rounded-2xl sm:rounded-3xl bg-gradient-to-br from-green-600 via-emerald-600 to-green-800 text-white shadow-2xl shadow-green-900/20 overflow-hidden isolate ${className}`}>
            {/* Decorative Elements */}
            <div className="absolute -top-24 -right-24 w-64 h-64 bg-emerald-500/30 rounded-full blur-3xl -z-10"></div>
            <div className="absolute bottom-0 left-0 w-full h-1/2 bg-gradient-to-t from-black/20 to-transparent -z-10"></div>

            <div className="relative z-10 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div className="flex items-start gap-4">
                    {icon && (
                        <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center">
                            {icon}
                        </div>
                    )}
                    <div>
                        <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold tracking-tight">
                            {title}
                        </h1>
                        {description && (
                            <p className="mt-2 text-green-100/80 text-sm sm:text-base max-w-2xl">
                                {description}
                            </p>
                        )}
                    </div>
                </div>
                {actions && (
                    <div className="flex items-center gap-2">
                        {actions}
                    </div>
                )}
            </div>
        </header>
    );
};

// ============================================
// GRID LAYOUTS
// ============================================
interface GridProps {
    children: React.ReactNode;
    className?: string;
    cols?: 1 | 2 | 3 | 4;
    gap?: 'sm' | 'md' | 'lg';
}

export const Grid: React.FC<GridProps> = ({
    children,
    className = '',
    cols = 3,
    gap = 'md'
}) => {
    const colsClass = {
        1: 'grid-cols-1',
        2: 'grid-cols-1 sm:grid-cols-2',
        3: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3',
        4: 'grid-cols-2 md:grid-cols-3 lg:grid-cols-4',
    }[cols];

    const gapClass = {
        sm: 'gap-2 sm:gap-3',
        md: 'gap-3 sm:gap-4 md:gap-6',
        lg: 'gap-4 sm:gap-6 lg:gap-8',
    }[gap];

    return (
        <div className={`grid ${colsClass} ${gapClass} ${className}`}>
            {children}
        </div>
    );
};

// ============================================
// STAT CARD
// ============================================
interface StatCardProps {
    label: string;
    value: string | number;
    subValue?: string;
    icon: React.ReactNode;
    color?: string;
    href?: string;
    className?: string;
}

export const StatCard: React.FC<StatCardProps> = ({
    label,
    value,
    subValue,
    icon,
    color = 'from-indigo-500 to-purple-600',
    href,
    className = ''
}) => {
    const content = (
        <div className={`pg-stat-card group relative overflow-hidden ${className}`}>
            <div className="absolute inset-0 bg-gradient-to-br from-white/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
            <div className="flex items-start justify-between mb-4 relative z-10">
                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center bg-gradient-to-br ${color} shadow-lg text-white transform group-hover:scale-110 transition-transform duration-300`}>
                    {icon}
                </div>
            </div>
            <div className="relative z-10">
                <div className="text-3xl font-bold text-slate-800 dark:text-white leading-none mb-2 tracking-tight">
                    {value}
                </div>
                <p className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-1">
                    {label}
                </p>
                {subValue && (
                    <p className="text-xs font-medium text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-white/5 px-2 py-1 rounded-lg inline-block">
                        {subValue}
                    </p>
                )}
            </div>
        </div>
    );

    if (href) {
        return (
            <a href={href} className="block h-full">
                {content}
            </a>
        );
    }

    return content;
};

// ============================================
// EMPTY STATE - Enhanced with Guidance
// ============================================
interface EmptyStateProps {
    icon?: React.ReactNode;
    title: string;
    description?: string;
    action?: React.ReactNode;
    className?: string;
    /** Show first-time user hint */
    showHint?: boolean;
    /** First-time hint text */
    hintText?: string;
    /** Steps for getting started */
    steps?: Array<{
        number: number;
        title: string;
        description?: string;
    }>;
    /** Illustration type */
    variant?: 'default' | 'compact' | 'full';
}

export const EmptyStateWrapper: React.FC<EmptyStateProps> = ({
    icon,
    title,
    description,
    action,
    className = '',
    showHint = false,
    hintText,
    steps,
    variant = 'default'
}) => {
    const variantClasses = {
        default: 'p-8 sm:p-12',
        compact: 'p-6 sm:p-8',
        full: 'p-10 sm:p-16 min-h-[400px]',
    }[variant];

    return (
        <div
            className={`flex flex-col items-center justify-center text-center ${variantClasses} ${className}`}
            role="region"
            aria-label={title}
        >
            {/* First Time User Hint */}
            {showHint && hintText && (
                <div className="first-time-hint flex items-start gap-3 mb-6 w-full max-w-md text-left">
                    <div className="first-time-hint-icon" aria-hidden="true">
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                    </div>
                    <div>
                        <p className="text-sm font-medium text-indigo-900 dark:text-indigo-200">
                            💡 Petunjuk untuk memulai
                        </p>
                        <p className="text-xs text-indigo-700 dark:text-indigo-300 mt-1">
                            {hintText}
                        </p>
                    </div>
                </div>
            )}

            {/* Icon */}
            {icon && (
                <div className="empty-state-icon" aria-hidden="true">
                    <div className="text-slate-400 dark:text-slate-500">
                        {icon}
                    </div>
                </div>
            )}

            {/* Title */}
            <h3 className="empty-state-title">
                {title}
            </h3>

            {/* Description */}
            {description && (
                <p className="empty-state-description">
                    {description}
                </p>
            )}

            {/* Getting Started Steps */}
            {steps && steps.length > 0 && (
                <div className="w-full max-w-sm mt-4 mb-6" role="list" aria-label="Langkah-langkah memulai">
                    {steps.map((step, index) => (
                        <div
                            key={step.number}
                            className={`flex items-start gap-3 text-left py-3 ${index !== steps.length - 1 ? 'border-b border-slate-200 dark:border-slate-700' : ''
                                }`}
                            role="listitem"
                        >
                            <span className="flex-shrink-0 w-6 h-6 rounded-full bg-gradient-to-br from-indigo-600 to-purple-600 text-white text-xs font-bold flex items-center justify-center" aria-hidden="true">
                                {step.number}
                            </span>
                            <div>
                                <p className="text-sm font-medium text-slate-700 dark:text-slate-300">
                                    {step.title}
                                </p>
                                {step.description && (
                                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                                        {step.description}
                                    </p>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Action Button */}
            {action}
        </div>
    );
};

// Alias for backward compatibility
export const EmptyState = EmptyStateWrapper;

// ============================================
// BADGE
// ============================================
interface BadgeProps {
    children: React.ReactNode;
    variant?: 'primary' | 'success' | 'warning' | 'error' | 'neutral';
    size?: 'sm' | 'md';
    className?: string;
}

export const Badge: React.FC<BadgeProps> = ({
    children,
    variant = 'primary',
    size = 'sm',
    className = ''
}) => {
    const variantClasses = {
        primary: 'bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400',
        success: 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400',
        warning: 'bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400',
        error: 'bg-rose-100 dark:bg-rose-900/30 text-rose-600 dark:text-rose-400',
        neutral: 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400',
    }[variant];

    const sizeClasses = {
        sm: 'px-2 py-0.5 text-xs',
        md: 'px-3 py-1 text-sm',
    }[size];

    return (
        <span className={`inline-flex items-center font-semibold rounded-full ${variantClasses} ${sizeClasses} ${className}`}>
            {children}
        </span>
    );
};

export default {
    PageContainer,
    Section,
    CardWrapper,
    CardHeader,
    PageHeader,
    Grid,
    StatCard,
    EmptyStateWrapper,
    Badge,
};
