/**
 * Design System Tokens
 * 
 * This file contains all design tokens for the application.
 * Use these constants instead of hardcoded values to ensure consistency.
 */

// ============================================
// SPACING SCALE
// ============================================

export const spacing = {
    /** 0px */
    none: '0',
    /** 2px */
    '2xs': '0.125rem',
    /** 4px */
    xs: '0.25rem',
    /** 8px */
    sm: '0.5rem',
    /** 12px */
    md: '0.75rem',
    /** 16px */
    lg: '1rem',
    /** 20px */
    xl: '1.25rem',
    /** 24px */
    '2xl': '1.5rem',
    /** 32px */
    '3xl': '2rem',
    /** 40px */
    '4xl': '2.5rem',
    /** 48px */
    '5xl': '3rem',
    /** 64px */
    '6xl': '4rem',
    /** 80px */
    '7xl': '5rem',
    /** 96px */
    '8xl': '6rem',
} as const;

// Tailwind class mappings
export const spacingClasses = {
    none: 'p-0',
    '2xs': 'p-0.5',
    xs: 'p-1',
    sm: 'p-2',
    md: 'p-3',
    lg: 'p-4',
    xl: 'p-5',
    '2xl': 'p-6',
    '3xl': 'p-8',
    '4xl': 'p-10',
    '5xl': 'p-12',
    '6xl': 'p-16',
} as const;

// ============================================
// BORDER RADIUS
// ============================================

export const radius = {
    /** 0px - Sharp corners */
    none: '0',
    /** 4px - Subtle rounding */
    sm: '0.25rem',
    /** 8px - Standard rounding (buttons, inputs) */
    md: '0.5rem',
    /** 12px - Medium rounding (cards, panels) */
    lg: '0.75rem',
    /** 16px - Large rounding (modals, sheets) */
    xl: '1rem',
    /** 24px - Extra large (feature cards) */
    '2xl': '1.5rem',
    /** 32px - Prominent elements */
    '3xl': '2rem',
    /** 9999px - Full/pill shape */
    full: '9999px',
} as const;

// Tailwind class mappings
export const radiusClasses = {
    none: 'rounded-none',
    sm: 'rounded',
    md: 'rounded-lg',
    lg: 'rounded-xl',
    xl: 'rounded-2xl',
    '2xl': 'rounded-3xl',
    '3xl': 'rounded-[2rem]',
    full: 'rounded-full',
} as const;

// Component-specific radius standards
export const componentRadius = {
    /** Buttons - rounded-lg (0.5rem) */
    button: radiusClasses.md,
    /** Inputs - rounded-lg (0.5rem) */
    input: radiusClasses.md,
    /** Cards - rounded-xl (1rem) */
    card: radiusClasses.lg,
    /** Modals/Dialogs - rounded-2xl (1.5rem) */
    modal: radiusClasses.xl,
    /** Bottom sheets - rounded-t-2xl */
    bottomSheet: 'rounded-t-2xl',
    /** Badges/Pills - rounded-full */
    badge: radiusClasses.full,
    /** Avatars - rounded-full */
    avatar: radiusClasses.full,
    /** Tooltips - rounded-lg */
    tooltip: radiusClasses.md,
    /** Dropdowns - rounded-xl */
    dropdown: radiusClasses.lg,
    /** Sidebar - rounded-none or rounded-r-2xl */
    sidebar: radiusClasses.xl,
    /** Nav items - rounded-xl */
    navItem: radiusClasses.lg,
    /** Tags/Chips - rounded-full */
    tag: radiusClasses.full,
} as const;

// ============================================
// SHADOWS
// ============================================

export const shadows = {
    /** No shadow */
    none: 'none',
    /** Extra small - subtle elevation */
    xs: '0 1px 2px rgba(0, 0, 0, 0.05)',
    /** Small - card hover state */
    sm: '0 1px 3px rgba(0, 0, 0, 0.1), 0 1px 2px rgba(0, 0, 0, 0.06)',
    /** Medium - floating elements */
    md: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
    /** Large - dropdowns, tooltips */
    lg: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
    /** Extra large - modals */
    xl: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
    /** 2XL - prominent modals */
    '2xl': '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
} as const;

// Tailwind class mappings
export const shadowClasses = {
    none: 'shadow-none',
    xs: 'shadow-xs',
    sm: 'shadow-sm',
    md: 'shadow-md',
    lg: 'shadow-lg',
    xl: 'shadow-xl',
    '2xl': 'shadow-2xl',
} as const;

// Component-specific shadow standards
export const componentShadow = {
    /** Cards - shadow-sm, shadow-lg on hover */
    card: { default: shadowClasses.sm, hover: shadowClasses.lg },
    /** Buttons - shadow-sm, shadow-md on hover */
    button: { default: shadowClasses.sm, hover: shadowClasses.md },
    /** Modals - shadow-2xl */
    modal: shadowClasses['2xl'],
    /** Dropdowns - shadow-lg */
    dropdown: shadowClasses.lg,
    /** Bottom sheet - shadow-2xl */
    bottomSheet: shadowClasses['2xl'],
    /** Floating action buttons - shadow-xl */
    fab: shadowClasses.xl,
    /** Tooltips - shadow-lg */
    tooltip: shadowClasses.lg,
} as const;

// ============================================
// COLORS
// ============================================

export const colors = {
    // Primary palette
    primary: {
        50: '#eef2ff',
        100: '#e0e7ff',
        200: '#c7d2fe',
        300: '#a5b4fc',
        400: '#818cf8',
        500: '#6366f1', // Main primary
        600: '#4f46e5',
        700: '#4338ca',
        800: '#3730a3',
        900: '#312e81',
        950: '#1e1b4b',
    },

    // Secondary/Accent palette
    secondary: {
        50: '#ecfdf5',
        100: '#d1fae5',
        200: '#a7f3d0',
        300: '#6ee7b7',
        400: '#34d399',
        500: '#10b981', // Main secondary
        600: '#059669',
        700: '#047857',
        800: '#065f46',
        900: '#064e3b',
        950: '#022c22',
    },

    // Neutral/Slate palette
    neutral: {
        50: '#f8fafc',
        100: '#f1f5f9',
        200: '#e2e8f0',
        300: '#cbd5e1',
        400: '#94a3b8',
        500: '#64748b',
        600: '#475569',
        700: '#334155',
        800: '#1e293b',
        900: '#0f172a',
        950: '#020617',
    },

    // Semantic colors
    success: {
        light: '#d1fae5',
        main: '#10b981',
        dark: '#065f46',
    },
    warning: {
        light: '#fef3c7',
        main: '#f59e0b',
        dark: '#92400e',
    },
    error: {
        light: '#fee2e2',
        main: '#ef4444',
        dark: '#991b1b',
    },
    info: {
        light: '#dbeafe',
        main: '#3b82f6',
        dark: '#1e40af',
    },
} as const;

// Tailwind color class mappings
export const colorClasses = {
    primary: {
        bg: 'bg-indigo-600',
        bgHover: 'hover:bg-indigo-700',
        bgLight: 'bg-indigo-50 dark:bg-indigo-900/20',
        text: 'text-indigo-600 dark:text-indigo-400',
        border: 'border-indigo-600',
        ring: 'ring-indigo-500',
    },
    secondary: {
        bg: 'bg-emerald-600',
        bgHover: 'hover:bg-emerald-700',
        bgLight: 'bg-emerald-50 dark:bg-emerald-900/20',
        text: 'text-emerald-600 dark:text-emerald-400',
        border: 'border-emerald-600',
        ring: 'ring-emerald-500',
    },
    success: {
        bg: 'bg-green-600',
        bgLight: 'bg-green-50 dark:bg-green-900/20',
        text: 'text-green-600 dark:text-green-400',
    },
    warning: {
        bg: 'bg-amber-500',
        bgLight: 'bg-amber-50 dark:bg-amber-900/20',
        text: 'text-amber-600 dark:text-amber-400',
    },
    error: {
        bg: 'bg-red-600',
        bgLight: 'bg-red-50 dark:bg-red-900/20',
        text: 'text-red-600 dark:text-red-400',
    },
    info: {
        bg: 'bg-blue-600',
        bgLight: 'bg-blue-50 dark:bg-blue-900/20',
        text: 'text-blue-600 dark:text-blue-400',
    },
    neutral: {
        bg: 'bg-slate-600',
        bgLight: 'bg-slate-50 dark:bg-slate-800',
        text: 'text-slate-600 dark:text-slate-400',
    },
} as const;

// ============================================
// TYPOGRAPHY
// ============================================

export const typography = {
    // Font families
    fontFamily: {
        sans: 'Inter, system-ui, -apple-system, sans-serif',
        serif: 'Playfair Display, Georgia, serif',
        mono: 'JetBrains Mono, Consolas, monospace',
    },

    // Font sizes
    fontSize: {
        xs: '0.75rem',      // 12px
        sm: '0.875rem',     // 14px
        base: '1rem',       // 16px
        lg: '1.125rem',     // 18px
        xl: '1.25rem',      // 20px
        '2xl': '1.5rem',    // 24px
        '3xl': '1.875rem',  // 30px
        '4xl': '2.25rem',   // 36px
        '5xl': '3rem',      // 48px
    },

    // Font weights
    fontWeight: {
        normal: '400',
        medium: '500',
        semibold: '600',
        bold: '700',
        extrabold: '800',
    },

    // Line heights
    lineHeight: {
        none: '1',
        tight: '1.25',
        snug: '1.375',
        normal: '1.5',
        relaxed: '1.625',
        loose: '2',
    },
} as const;

// Tailwind typography classes
export const typographyClasses = {
    // Headings
    h1: 'text-4xl md:text-5xl font-bold tracking-tight',
    h2: 'text-3xl md:text-4xl font-bold tracking-tight',
    h3: 'text-2xl md:text-3xl font-semibold',
    h4: 'text-xl md:text-2xl font-semibold',
    h5: 'text-lg font-semibold',
    h6: 'text-base font-semibold',

    // Body text
    body: 'text-base leading-relaxed',
    bodySmall: 'text-sm leading-relaxed',
    bodyLarge: 'text-lg leading-relaxed',

    // Utility text
    caption: 'text-xs text-slate-500 dark:text-slate-400',
    label: 'text-sm font-medium',
    overline: 'text-xs uppercase tracking-wider font-semibold',
} as const;

// ============================================
// TRANSITIONS
// ============================================

export const transitions = {
    // Durations
    duration: {
        instant: '0ms',
        fast: '100ms',
        normal: '200ms',
        slow: '300ms',
        slower: '500ms',
    },

    // Easings
    easing: {
        linear: 'linear',
        easeIn: 'cubic-bezier(0.4, 0, 1, 1)',
        easeOut: 'cubic-bezier(0, 0, 0.2, 1)',
        easeInOut: 'cubic-bezier(0.4, 0, 0.2, 1)',
        bounce: 'cubic-bezier(0.68, -0.55, 0.265, 1.55)',
    },
} as const;

// Tailwind transition classes
export const transitionClasses = {
    all: 'transition-all duration-200 ease-out',
    colors: 'transition-colors duration-200 ease-out',
    opacity: 'transition-opacity duration-200 ease-out',
    transform: 'transition-transform duration-200 ease-out',
    shadow: 'transition-shadow duration-200 ease-out',
} as const;

// ============================================
// Z-INDEX SCALE
// ============================================

export const zIndex = {
    /** Below content */
    behind: -1,
    /** Default/content level */
    base: 0,
    /** Slightly elevated (dropdowns trigger) */
    dropdown: 10,
    /** Sticky elements */
    sticky: 20,
    /** Fixed elements (header, sidebar) */
    fixed: 30,
    /** Overlays (modal backdrop) */
    overlay: 40,
    /** Modals/Dialogs */
    modal: 50,
    /** Popovers/Tooltips */
    popover: 60,
    /** Toast notifications */
    toast: 70,
    /** Maximum (critical UI, loading screens) */
    max: 9999,
} as const;

// ============================================
// ICON SIZES (Mobile UI)
// ============================================

export const iconSize = {
    /** 16px - Tiny icons */
    xs: '1rem',
    /** 20px - Small action icons (card buttons) */
    sm: '1.25rem',
    /** 24px - Standard icons, bottom nav */
    md: '1.5rem',
    /** 32px - Large icons in cards */
    lg: '2rem',
    /** 48px - Hero icons, stats */
    xl: '3rem',
    /** 64px - Extra large decorative */
    '2xl': '4rem',
} as const;

// Tailwind class mappings for icon sizes
export const iconSizeClasses = {
    xs: 'w-4 h-4',
    sm: 'w-5 h-5',
    md: 'w-6 h-6',
    lg: 'w-8 h-8',
    xl: 'w-12 h-12',
    '2xl': 'w-16 h-16',
} as const;

// ============================================
// TOUCH TARGETS (Accessibility)
// ============================================

export const touchTarget = {
    /** 44px - Minimum touch target (WCAG) */
    min: '2.75rem',
    /** 48px - Comfortable touch target */
    comfortable: '3rem',
    /** 56px - Large touch target */
    large: '3.5rem',
} as const;

// Tailwind class mappings for touch targets
export const touchTargetClasses = {
    min: 'min-w-[44px] min-h-[44px]',
    comfortable: 'min-w-[48px] min-h-[48px]',
    large: 'min-w-[56px] min-h-[56px]',
} as const;

// ============================================
// ANIMATION PRESETS (Mobile Interactions)
// ============================================

export const animation = {
    duration: {
        /** 200-300ms - Card tap animation */
        tap: '250ms',
        /** 300-400ms - Page transitions */
        page: '350ms',
        /** 50-100ms - List item stagger delay */
        stagger: '75ms',
        /** 200ms - Quick interactions */
        fast: '200ms',
        /** 300ms - Standard animations */
        normal: '300ms',
        /** 500ms - Slow, deliberate animations */
        slow: '500ms',
    },
    easing: {
        /** Standard ease-out */
        smooth: 'cubic-bezier(0, 0, 0.2, 1)',
        /** Springy bounce effect */
        springy: 'cubic-bezier(0.68, -0.55, 0.265, 1.55)',
        /** Sharp, quick response */
        sharp: 'cubic-bezier(0.4, 0, 0.2, 1)',
    },
    scale: {
        /** Subtle tap feedback */
        tap: 'scale(0.97)',
        /** Hover lift */
        hover: 'scale(1.02)',
        /** Active press */
        active: 'scale(0.95)',
    },
} as const;

// ============================================
// STATUS COLORS (Attendance)
// ============================================

export const statusColors = {
    /** Hadir - Green */
    hadir: {
        bg: 'bg-emerald-50 dark:bg-emerald-900/20',
        bgSolid: 'bg-emerald-500',
        text: 'text-emerald-600 dark:text-emerald-400',
        border: 'border-emerald-500',
        gradient: 'from-emerald-500 to-green-600',
    },
    /** Sakit - Blue */
    sakit: {
        bg: 'bg-blue-50 dark:bg-blue-900/20',
        bgSolid: 'bg-blue-500',
        text: 'text-blue-600 dark:text-blue-400',
        border: 'border-blue-500',
        gradient: 'from-blue-500 to-cyan-600',
    },
    /** Izin - Amber */
    izin: {
        bg: 'bg-amber-50 dark:bg-amber-900/20',
        bgSolid: 'bg-amber-500',
        text: 'text-amber-600 dark:text-amber-400',
        border: 'border-amber-500',
        gradient: 'from-amber-500 to-orange-600',
    },
    /** Alpha - Red */
    alpha: {
        bg: 'bg-rose-50 dark:bg-rose-900/20',
        bgSolid: 'bg-rose-500',
        text: 'text-rose-600 dark:text-rose-400',
        border: 'border-rose-500',
        gradient: 'from-rose-500 to-red-600',
    },
} as const;

// ============================================
// MOBILE COMPONENT SPECS
// ============================================

export const mobileSpecs = {
    /** Student card specifications */
    studentCard: {
        padding: 'p-4',
        gap: 'gap-4',
        borderRadius: 'rounded-2xl',
        minHeight: 'min-h-[88px]',
        avatarSize: 'w-12 h-12',
        avatarRadius: 'rounded-xl',
        nameSize: 'text-base font-semibold',
        actionButtonSize: 'w-10 h-10',
        actionIconSize: 'w-5 h-5',
        actionGap: 'gap-2',
    },
    /** Stats card specifications */
    statsCard: {
        padding: 'p-5',
        borderRadius: 'rounded-2xl',
        minHeight: 'min-h-[140px]',
        iconSize: 'w-12 h-12',
        iconContainer: 'w-16 h-16',
        valueSize: 'text-4xl font-extrabold',
        labelSize: 'text-xs font-bold uppercase tracking-wider',
        subValueSize: 'text-[11px] opacity-70',
    },
    /** Attendance stats specifications */
    attendanceStats: {
        gridCols: 'grid-cols-4',
        gap: 'gap-2',
        badgeSize: 'w-10 h-10',
        valueSize: 'text-[28px] font-extrabold',
        labelSize: 'text-[10px] font-bold uppercase tracking-wider',
    },
    /** Bottom navigation specifications */
    bottomNav: {
        height: 'h-[68px]',
        iconSize: 'w-6 h-6',
        activeIconSize: 'w-[26px] h-[26px]',
        labelSize: 'text-[10px]',
        itemMinSize: 'min-w-[48px] min-h-[48px]',
    },
    /** Header specifications */
    header: {
        height: 'h-16',
        maxHeight: 'max-h-16',
        greetingSize: 'text-2xl font-bold',
        dateSize: 'text-xs',
        actionButtonSize: 'w-10 h-10',
    },
    /** Form input specifications */
    formInput: {
        minHeight: 'min-h-[48px]',
        gap: 'gap-4',
        labelSize: 'text-sm font-medium',
    },
    /** Empty state specifications */
    emptyState: {
        illustrationSize: 'w-32 h-32',
        illustrationSizeLg: 'w-40 h-40',
    },
} as const;

// ============================================
// BREAKPOINTS
// ============================================

export const breakpoints = {
    sm: '640px',
    md: '768px',
    lg: '1024px',
    xl: '1280px',
    '2xl': '1536px',
} as const;

// ============================================
// COMPONENT WRAPPER UTILITY
// ============================================

/**
 * Utility to combine design system classes
 */
export function cx(...classes: (string | undefined | null | false)[]): string {
    return classes.filter(Boolean).join(' ');
}

/**
 * Standard component styles
 */
export const componentStyles = {
    card: cx(
        componentRadius.card,
        shadowClasses.sm,
        'bg-white dark:bg-slate-800',
        'border border-slate-200 dark:border-slate-700',
        transitionClasses.all,
        'hover:shadow-lg'
    ),

    cardInteractive: cx(
        componentRadius.card,
        shadowClasses.sm,
        'bg-white dark:bg-slate-800',
        'border border-slate-200 dark:border-slate-700',
        transitionClasses.all,
        'hover:shadow-lg hover:-translate-y-1 cursor-pointer'
    ),

    buttonPrimary: cx(
        componentRadius.button,
        shadowClasses.sm,
        colorClasses.primary.bg,
        colorClasses.primary.bgHover,
        'text-white font-medium',
        transitionClasses.all,
        'hover:shadow-md active:scale-95'
    ),

    buttonSecondary: cx(
        componentRadius.button,
        'bg-white dark:bg-slate-800',
        'border border-slate-200 dark:border-slate-700',
        'text-slate-700 dark:text-slate-300',
        transitionClasses.all,
        'hover:bg-slate-50 dark:hover:bg-slate-700'
    ),

    buttonGhost: cx(
        componentRadius.button,
        'bg-transparent',
        'text-slate-700 dark:text-slate-300',
        transitionClasses.all,
        'hover:bg-slate-100 dark:hover:bg-slate-800'
    ),

    input: cx(
        componentRadius.input,
        'border border-slate-200 dark:border-slate-700',
        'bg-white dark:bg-slate-800',
        'text-slate-900 dark:text-slate-100',
        'placeholder:text-slate-400',
        transitionClasses.all,
        'focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20'
    ),

    modal: cx(
        componentRadius.modal,
        shadowClasses['2xl'],
        'bg-white dark:bg-slate-900',
        'border border-slate-200 dark:border-slate-700'
    ),

    dropdown: cx(
        componentRadius.dropdown,
        shadowClasses.lg,
        'bg-white dark:bg-slate-900',
        'border border-slate-200 dark:border-slate-700'
    ),

    badge: cx(
        componentRadius.badge,
        'px-2.5 py-0.5',
        'text-xs font-medium'
    ),

    avatar: cx(
        componentRadius.avatar,
        'object-cover',
        'bg-slate-100 dark:bg-slate-700'
    ),
} as const;

export default {
    spacing,
    spacingClasses,
    radius,
    radiusClasses,
    componentRadius,
    shadows,
    shadowClasses,
    componentShadow,
    colors,
    colorClasses,
    typography,
    typographyClasses,
    transitions,
    transitionClasses,
    zIndex,
    breakpoints,
    cx,
    componentStyles,
    // Mobile UI additions
    iconSize,
    iconSizeClasses,
    touchTarget,
    touchTargetClasses,
    animation,
    statusColors,
    mobileSpecs,
};
