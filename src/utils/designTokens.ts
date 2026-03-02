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
    sm: 'rounded-lg',          // 8px - buttons, inputs
    md: 'rounded-xl',          // 12px - cards, containers
    lg: 'rounded-2xl',         // 16px - sections
    xl: 'rounded-[1.25rem]',   // 20px - hero sections
    '2xl': 'rounded-3xl',      // 24px - modals
    '3xl': 'rounded-[2rem]',   // 32px - extra prominent
    full: 'rounded-full',   // badges, avatars
} as const;

// Component-specific radius
export const componentRadius = {
    button: radius.sm,
    input: radius.sm,
    card: radius.md,
    modal: radius.lg,
    badge: radius.full,
    avatar: radius.full,
    dropdown: radius.md,
    tooltip: radius.sm,
    section: radius.lg,
} as const;

// ============================================
// SPACING
// ============================================
export const spacing = {
    // Padding presets
    padding: {
        page: 'p-3 sm:p-4 md:p-6 lg:p-8',
        card: 'p-4 sm:p-5',
        cardCompact: 'p-3 sm:p-4',
        section: 'p-4 sm:p-6',
        button: {
            sm: 'px-3 py-2',
            default: 'px-4 py-2.5',
            lg: 'px-6 py-3.5',
        },
    },
    // Gap presets
    gap: {
        items: 'gap-2',           // items in a list
        cards: 'gap-3 sm:gap-4',  // cards in a grid
        sections: 'gap-6', // major sections (24px)
    },
    // Space-y presets
    stack: {
        tight: 'space-y-1',
        normal: 'space-y-2',
        relaxed: 'space-y-3',
        section: 'space-y-6',
        page: 'space-y-6 sm:space-y-8',
    },
} as const;

// ============================================
// COLORS & GRADIENTS
// ============================================
export const gradients = {
    // Primary gradients
    primary: 'bg-emerald-500',
    primaryHover: 'hover:bg-emerald-600',
    primaryBr: 'bg-gradient-to-br from-emerald-500 to-emerald-600',
    primarySubtle: 'bg-emerald-500/10',

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
        bg: 'bg-green-50 dark:bg-green-900/20',
        text: 'text-green-600 dark:text-green-400',
        border: 'border-green-200 dark:border-green-800',
    },
    warning: {
        bg: 'bg-yellow-50 dark:bg-yellow-900/20',
        text: 'text-yellow-600 dark:text-yellow-400',
        border: 'border-yellow-200 dark:border-yellow-800',
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
    primary: 'shadow-sm',
    success: 'shadow-sm',
    warning: 'shadow-lg shadow-amber-500/25',
    error: 'shadow-sm',
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
        secondary: 'bg-slate-700 text-white hover:bg-slate-600',
        ghost: 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800',
        destructive: `bg-red-500 hover:bg-red-600 text-white ${shadows.error}`,
    },

    // Input styles
    input: {
        base: `w-full ${componentRadius.input} border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 ${transitions.colors}`,
        focus: 'focus:ring-2 focus:ring-emerald-500 focus:border-transparent',
    },

    // Typography
    text: {
        pageTitle: 'text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white',
        sectionTitle: 'text-xl font-semibold text-slate-900 dark:text-white',
        cardTitle: 'text-base font-semibold text-slate-900 dark:text-white',
        subtitle: 'text-sm text-slate-500 dark:text-slate-400',
        body: 'text-base text-slate-700 dark:text-slate-300',
        caption: 'text-sm text-slate-500 dark:text-slate-400',
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
