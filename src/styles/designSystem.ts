/**
 * Design System - Consistent Design Tokens
 * Provides standardized spacing, typography, colors, shadows, and border radius
 */

// ============================================
// SPACING SCALE
// Based on 4px base unit
// ============================================

export const spacing = {
    0: '0',
    px: '1px',
    0.5: '0.125rem', // 2px
    1: '0.25rem',    // 4px
    2: '0.5rem',     // 8px
    3: '0.75rem',    // 12px
    4: '1rem',       // 16px
    5: '1.25rem',    // 20px
    6: '1.5rem',     // 24px
    8: '2rem',       // 32px
    10: '2.5rem',    // 40px
    12: '3rem',      // 48px
    16: '4rem',      // 64px
    20: '5rem',      // 80px
    24: '6rem',      // 96px
} as const;

// Semantic spacing
export const spacingTokens = {
    // Component internal padding
    componentPaddingSm: spacing[2],  // 8px - Small buttons, chips
    componentPaddingMd: spacing[3],  // 12px - Regular inputs, buttons
    componentPaddingLg: spacing[4],  // 16px - Cards, modals

    // Section spacing
    sectionPaddingSm: spacing[4],    // 16px
    sectionPaddingMd: spacing[6],    // 24px
    sectionPaddingLg: spacing[8],    // 32px

    // Gap between elements
    gapXs: spacing[1],   // 4px - Inline elements
    gapSm: spacing[2],   // 8px - List items
    gapMd: spacing[3],   // 12px - Cards in grid
    gapLg: spacing[4],   // 16px - Sections
    gapXl: spacing[6],   // 24px - Major sections

    // Page margins
    pageMarginMobile: spacing[4],    // 16px
    pageMarginDesktop: spacing[6],   // 24px
} as const;

// ============================================
// BORDER RADIUS
// ============================================

export const borderRadius = {
    none: '0',
    sm: '0.25rem',     // 4px - Badges, small elements
    md: '0.5rem',      // 8px - Buttons, inputs
    lg: '0.75rem',     // 12px - Cards
    xl: '1rem',        // 16px - Modals, large cards
    '2xl': '1.25rem',  // 20px - Large containers
    '3xl': '1.5rem',   // 24px - Hero sections
    full: '9999px',    // Pills, avatars
} as const;

// Semantic radius
export const radiusTokens = {
    button: borderRadius.lg,      // 12px
    buttonSm: borderRadius.md,    // 8px
    input: borderRadius.lg,       // 12px
    card: borderRadius.xl,        // 16px
    modal: borderRadius['2xl'],   // 20px
    chip: borderRadius.full,      // Full
    avatar: borderRadius.full,    // Full
    badge: borderRadius.sm,       // 4px
} as const;

// ============================================
// SHADOWS
// ============================================

export const shadows = {
    none: 'none',
    xs: '0 1px 2px 0 rgb(0 0 0 / 0.05)',
    sm: '0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)',
    md: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)',
    lg: '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)',
    xl: '0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)',
    '2xl': '0 25px 50px -12px rgb(0 0 0 / 0.25)',
    inner: 'inset 0 2px 4px 0 rgb(0 0 0 / 0.05)',
} as const;

// Semantic shadows
export const shadowTokens = {
    button: shadows.sm,
    buttonHover: shadows.md,
    card: shadows.sm,
    cardHover: shadows.lg,
    dropdown: shadows.lg,
    modal: shadows['2xl'],
    toast: shadows.lg,
    input: shadows.none,
    inputFocus: shadows.sm,
} as const;

// ============================================
// TYPOGRAPHY
// ============================================

export const fontSize = {
    xs: ['0.75rem', { lineHeight: '1rem' }],      // 12px
    sm: ['0.875rem', { lineHeight: '1.25rem' }],  // 14px
    base: ['1rem', { lineHeight: '1.5rem' }],     // 16px
    lg: ['1.125rem', { lineHeight: '1.75rem' }],  // 18px
    xl: ['1.25rem', { lineHeight: '1.75rem' }],   // 20px
    '2xl': ['1.5rem', { lineHeight: '2rem' }],    // 24px
    '3xl': ['1.875rem', { lineHeight: '2.25rem' }], // 30px
    '4xl': ['2.25rem', { lineHeight: '2.5rem' }], // 36px
    '5xl': ['3rem', { lineHeight: '1' }],         // 48px
} as const;

export const fontWeight = {
    normal: '400',
    medium: '500',
    semibold: '600',
    bold: '700',
} as const;

// Semantic typography
export const typographyTokens = {
    // Headings
    h1: { size: fontSize['4xl'][0], weight: fontWeight.bold },
    h2: { size: fontSize['3xl'][0], weight: fontWeight.bold },
    h3: { size: fontSize['2xl'][0], weight: fontWeight.semibold },
    h4: { size: fontSize.xl[0], weight: fontWeight.semibold },
    h5: { size: fontSize.lg[0], weight: fontWeight.semibold },
    h6: { size: fontSize.base[0], weight: fontWeight.semibold },

    // Body text
    bodyLg: { size: fontSize.lg[0], weight: fontWeight.normal },
    body: { size: fontSize.base[0], weight: fontWeight.normal },
    bodySm: { size: fontSize.sm[0], weight: fontWeight.normal },
    bodyXs: { size: fontSize.xs[0], weight: fontWeight.normal },

    // UI text
    label: { size: fontSize.sm[0], weight: fontWeight.medium },
    button: { size: fontSize.sm[0], weight: fontWeight.medium },
    caption: { size: fontSize.xs[0], weight: fontWeight.normal },
    overline: { size: fontSize.xs[0], weight: fontWeight.semibold },
} as const;

// ============================================
// COLORS
// ============================================

export const colors = {
    // Primary
    primary: {
        50: '#eef2ff',
        100: '#e0e7ff',
        200: '#c7d2fe',
        300: '#a5b4fc',
        400: '#818cf8',
        500: '#6366f1', // Main
        600: '#4f46e5',
        700: '#4338ca',
        800: '#3730a3',
        900: '#312e81',
    },

    // Neutral (Slate)
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
    },

    // Semantic
    success: {
        light: '#d1fae5',
        main: '#10b981',
        dark: '#047857',
    },
    warning: {
        light: '#fef3c7',
        main: '#f59e0b',
        dark: '#b45309',
    },
    error: {
        light: '#fee2e2',
        main: '#ef4444',
        dark: '#b91c1c',
    },
    info: {
        light: '#dbeafe',
        main: '#3b82f6',
        dark: '#1d4ed8',
    },
} as const;

// Semantic color tokens
export const colorTokens = {
    // Backgrounds
    bgDefault: colors.neutral[50],
    bgMuted: colors.neutral[100],
    bgSubtle: colors.neutral[200],
    bgInverse: colors.neutral[900],

    // Text
    textPrimary: colors.neutral[900],
    textSecondary: colors.neutral[600],
    textMuted: colors.neutral[400],
    textInverse: colors.neutral[50],

    // Borders
    borderDefault: colors.neutral[200],
    borderSubtle: colors.neutral[100],
    borderStrong: colors.neutral[300],

    // Interactive
    interactive: colors.primary[500],
    interactiveHover: colors.primary[600],
    interactiveActive: colors.primary[700],
} as const;

// ============================================
// TRANSITIONS
// ============================================

export const transitions = {
    fast: '150ms',
    normal: '200ms',
    slow: '300ms',
    slower: '500ms',
} as const;

export const easings = {
    default: 'cubic-bezier(0.4, 0, 0.2, 1)',
    in: 'cubic-bezier(0.4, 0, 1, 1)',
    out: 'cubic-bezier(0, 0, 0.2, 1)',
    inOut: 'cubic-bezier(0.4, 0, 0.2, 1)',
    spring: 'cubic-bezier(0.175, 0.885, 0.32, 1.275)',
} as const;

// ============================================
// Z-INDEX SCALE
// ============================================

export const zIndex = {
    hide: -1,
    base: 0,
    dropdown: 10,
    sticky: 20,
    fixed: 30,
    overlay: 40,
    modal: 50,
    popover: 60,
    toast: 70,
    tooltip: 80,
    max: 100,
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
// COMPONENT PRESETS
// ============================================

export const componentPresets = {
    // Button sizes
    buttonSizes: {
        sm: {
            padding: `${spacing[2]} ${spacing[3]}`,
            fontSize: fontSize.sm[0],
            borderRadius: radiusTokens.buttonSm,
            minHeight: '36px',
        },
        md: {
            padding: `${spacing[2]} ${spacing[4]}`,
            fontSize: fontSize.sm[0],
            borderRadius: radiusTokens.button,
            minHeight: '44px',
        },
        lg: {
            padding: `${spacing[3]} ${spacing[5]}`,
            fontSize: fontSize.base[0],
            borderRadius: radiusTokens.button,
            minHeight: '52px',
        },
    },

    // Card variants
    cardVariants: {
        default: {
            padding: spacing[4],
            borderRadius: radiusTokens.card,
            shadow: shadowTokens.card,
        },
        elevated: {
            padding: spacing[4],
            borderRadius: radiusTokens.card,
            shadow: shadowTokens.cardHover,
        },
        outlined: {
            padding: spacing[4],
            borderRadius: radiusTokens.card,
            shadow: shadows.none,
            border: `1px solid ${colorTokens.borderDefault}`,
        },
    },

    // Input sizes
    inputSizes: {
        sm: {
            padding: `${spacing[2]} ${spacing[3]}`,
            fontSize: fontSize.sm[0],
            borderRadius: radiusTokens.input,
            minHeight: '36px',
        },
        md: {
            padding: `${spacing[3]} ${spacing[4]}`,
            fontSize: fontSize.base[0],
            borderRadius: radiusTokens.input,
            minHeight: '44px',
        },
        lg: {
            padding: `${spacing[4]} ${spacing[5]}`,
            fontSize: fontSize.lg[0],
            borderRadius: radiusTokens.input,
            minHeight: '52px',
        },
    },
} as const;

// ============================================
// CSS UTILITY CLASSES GENERATOR
// ============================================

export const generateSpacingClasses = () => {
    const classes: Record<string, string> = {};
    Object.entries(spacing).forEach(([key, value]) => {
        classes[`p-${key}`] = `padding: ${value}`;
        classes[`px-${key}`] = `padding-left: ${value}; padding-right: ${value}`;
        classes[`py-${key}`] = `padding-top: ${value}; padding-bottom: ${value}`;
        classes[`m-${key}`] = `margin: ${value}`;
        classes[`gap-${key}`] = `gap: ${value}`;
    });
    return classes;
};

// ============================================
// EXPORTS
// ============================================

export const designSystem = {
    spacing,
    spacingTokens,
    borderRadius,
    radiusTokens,
    shadows,
    shadowTokens,
    fontSize,
    fontWeight,
    typographyTokens,
    colors,
    colorTokens,
    transitions,
    easings,
    zIndex,
    breakpoints,
    componentPresets,
} as const;

export default designSystem;
