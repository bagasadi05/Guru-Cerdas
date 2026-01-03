/**
 * Design Tokens for Portal Guru
 * 
 * This file provides standardized design tokens that can be imported
 * and used throughout the application to ensure UI consistency.
 * 
 * Usage:
 * import { tokens, cn } from '@/utils/designTokens';
 * 
 * <div className={cn(tokens.card.base, tokens.card.interactive)}>
 */

// ============================================
// BORDER RADIUS
// ============================================
export const radius = {
    none: 'rounded-none',
    sm: 'rounded',          // 4px - tiny elements
    md: 'rounded-md',       // 6px - small elements
    lg: 'rounded-lg',       // 8px - buttons, inputs
    xl: 'rounded-xl',       // 12px - dropdowns
    '2xl': 'rounded-2xl',   // 16px - cards, containers
    '3xl': 'rounded-3xl',   // 24px - modals
    full: 'rounded-full',   // badges, avatars
} as const;

// Component-specific radius
export const componentRadius = {
    button: radius.lg,
    input: radius.lg,
    card: radius['2xl'],
    modal: radius['3xl'],
    badge: radius.full,
    avatar: radius.full,
    dropdown: radius.xl,
    tooltip: radius.lg,
    section: radius['2xl'],
} as const;

// ============================================
// SPACING
// ============================================
export const spacing = {
    // Padding presets
    padding: {
        page: 'p-3 sm:p-4 md:p-6 lg:p-8',
        card: 'p-4 sm:p-5 md:p-6',
        cardCompact: 'p-3 sm:p-4',
        section: 'p-4 sm:p-6 lg:p-8',
        button: {
            sm: 'px-3 py-1.5',
            default: 'px-4 py-2',
            lg: 'px-6 py-3',
        },
    },
    // Gap presets
    gap: {
        items: 'gap-2',           // items in a list
        cards: 'gap-3 sm:gap-4',  // cards in a grid
        sections: 'gap-4 sm:gap-6 lg:gap-8', // major sections
    },
    // Space-y presets
    stack: {
        tight: 'space-y-1',
        normal: 'space-y-2',
        relaxed: 'space-y-3',
        section: 'space-y-4 sm:space-y-6',
        page: 'space-y-6 sm:space-y-8',
    },
} as const;

// ============================================
// COLORS & GRADIENTS
// ============================================
export const gradients = {
    // Primary gradients
    primary: 'bg-gradient-to-r from-indigo-600 to-purple-600',
    primaryHover: 'hover:from-indigo-700 hover:to-purple-700',
    primaryBr: 'bg-gradient-to-br from-indigo-600 via-purple-600 to-indigo-800',
    primarySubtle: 'bg-gradient-to-br from-indigo-500/10 to-purple-500/10',

    // Status gradients
    success: 'bg-gradient-to-r from-emerald-500 to-green-600',
    warning: 'bg-gradient-to-r from-amber-500 to-orange-500',
    info: 'bg-gradient-to-r from-blue-500 to-cyan-500',
    danger: 'bg-gradient-to-r from-rose-500 to-red-600',

    // Attendance status gradients
    hadir: 'from-emerald-500 to-green-600',
    izin: 'from-amber-500 to-orange-500',
    sakit: 'from-blue-500 to-cyan-500',
    alpha: 'from-rose-500 to-red-600',
} as const;

export const statusColors = {
    success: {
        bg: 'bg-emerald-50 dark:bg-emerald-900/20',
        text: 'text-emerald-600 dark:text-emerald-400',
        border: 'border-emerald-200 dark:border-emerald-800',
    },
    warning: {
        bg: 'bg-amber-50 dark:bg-amber-900/20',
        text: 'text-amber-600 dark:text-amber-400',
        border: 'border-amber-200 dark:border-amber-800',
    },
    error: {
        bg: 'bg-rose-50 dark:bg-rose-900/20',
        text: 'text-rose-600 dark:text-rose-400',
        border: 'border-rose-200 dark:border-rose-800',
    },
    info: {
        bg: 'bg-blue-50 dark:bg-blue-900/20',
        text: 'text-blue-600 dark:text-blue-400',
        border: 'border-blue-200 dark:border-blue-800',
    },
} as const;

// ============================================
// SHADOWS
// ============================================
export const shadows = {
    none: 'shadow-none',
    sm: 'shadow-sm',
    md: 'shadow-md',
    lg: 'shadow-lg',
    xl: 'shadow-xl',
    '2xl': 'shadow-2xl',

    // Colored shadows
    primary: 'shadow-lg shadow-indigo-500/25',
    success: 'shadow-lg shadow-emerald-500/25',
    warning: 'shadow-lg shadow-amber-500/25',
    error: 'shadow-lg shadow-rose-500/25',
} as const;

// ============================================
// TRANSITIONS
// ============================================
export const transitions = {
    fast: 'transition-all duration-150 ease-out',
    normal: 'transition-all duration-300 ease-out',
    slow: 'transition-all duration-500 ease-out',
    colors: 'transition-colors duration-200',
    transform: 'transition-transform duration-300',
} as const;

// ============================================
// COMPONENT PRESETS
// ============================================
export const tokens = {
    // Card styles
    card: {
        base: `bg-white dark:bg-slate-900 ${componentRadius.card} border border-slate-200 dark:border-slate-800 shadow-sm`,
        glass: `glass-card ${componentRadius.card} border border-white/20 dark:border-white/10`,
        interactive: `hover:shadow-lg hover:-translate-y-1 ${transitions.normal}`,
        stat: `glass-card ${componentRadius.card} p-5 card-hover-glow border border-white/20 dark:border-white/5 shadow-lg`,
    },

    // Button styles
    button: {
        base: `inline-flex items-center justify-center font-medium ${componentRadius.button} ${transitions.normal}`,
        primary: `${gradients.primary} ${gradients.primaryHover} text-white ${shadows.primary}`,
        secondary: 'bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700',
        ghost: 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800',
        destructive: `bg-rose-600 hover:bg-rose-700 text-white ${shadows.error}`,
    },

    // Input styles
    input: {
        base: `w-full ${componentRadius.input} border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 ${transitions.colors}`,
        focus: 'focus:ring-2 focus:ring-indigo-500 focus:border-transparent',
    },

    // Typography
    text: {
        pageTitle: 'text-2xl sm:text-3xl md:text-4xl font-bold text-slate-900 dark:text-white',
        sectionTitle: 'text-xl sm:text-2xl font-bold text-slate-900 dark:text-white',
        cardTitle: 'text-lg font-semibold text-slate-900 dark:text-white',
        subtitle: 'text-sm text-slate-500 dark:text-slate-400',
        body: 'text-sm sm:text-base text-slate-700 dark:text-slate-300',
        caption: 'text-xs text-slate-500 dark:text-slate-400',
    },

    // Layout
    layout: {
        pageContainer: `w-full min-h-full ${spacing.padding.page} ${spacing.stack.page}`,
        grid: {
            cols1: 'grid grid-cols-1',
            cols2: 'grid grid-cols-1 sm:grid-cols-2',
            cols3: 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3',
            cols4: 'grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4',
        },
    },
} as const;

// ============================================
// UTILITY FUNCTION
// ============================================

/**
 * Utility function to combine class names
 * Similar to clsx/classnames but simpler
 */
export function cn(...classes: (string | undefined | null | false)[]): string {
    return classes.filter(Boolean).join(' ');
}

/**
 * Get status color classes
 */
export function getStatusClasses(status: 'success' | 'warning' | 'error' | 'info') {
    return statusColors[status];
}

/**
 * Get attendance status gradient
 */
export function getAttendanceGradient(status: 'Hadir' | 'Izin' | 'Sakit' | 'Alpha') {
    const map = {
        'Hadir': gradients.hadir,
        'Izin': gradients.izin,
        'Sakit': gradients.sakit,
        'Alpha': gradients.alpha,
    };
    return map[status];
}

export default tokens;
