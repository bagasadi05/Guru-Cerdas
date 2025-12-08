/**
 * Responsive Design Testing Utilities
 * 
 * Collection of utilities for testing responsive design compliance.
 */

// Standard breakpoints (matching Tailwind CSS)
export const BREAKPOINTS = {
    sm: 640,
    md: 768,
    lg: 1024,
    xl: 1280,
    '2xl': 1536
};

// Common device presets for testing
export const DEVICE_PRESETS = {
    // Mobile devices
    'iphone-se': { width: 375, height: 667, orientation: 'portrait' as const },
    'iphone-14': { width: 390, height: 844, orientation: 'portrait' as const },
    'iphone-14-landscape': { width: 844, height: 390, orientation: 'landscape' as const },
    'pixel-7': { width: 412, height: 915, orientation: 'portrait' as const },
    'samsung-galaxy-s21': { width: 360, height: 800, orientation: 'portrait' as const },

    // Tablets
    'ipad-mini': { width: 768, height: 1024, orientation: 'portrait' as const },
    'ipad-mini-landscape': { width: 1024, height: 768, orientation: 'landscape' as const },
    'ipad-pro-11': { width: 834, height: 1194, orientation: 'portrait' as const },
    'ipad-pro-12.9': { width: 1024, height: 1366, orientation: 'portrait' as const },
    'surface-pro-7': { width: 912, height: 1368, orientation: 'portrait' as const },

    // Desktop
    'desktop-hd': { width: 1366, height: 768, orientation: 'landscape' as const },
    'desktop-fhd': { width: 1920, height: 1080, orientation: 'landscape' as const },
    'desktop-qhd': { width: 2560, height: 1440, orientation: 'landscape' as const },
};

interface BreakpointInfo {
    name: string;
    minWidth: number;
    maxWidth?: number;
    current: boolean;
}

/**
 * Get current breakpoint information
 */
export function getCurrentBreakpoint(): BreakpointInfo {
    const width = window.innerWidth;

    if (width < BREAKPOINTS.sm) {
        return { name: 'xs', minWidth: 0, maxWidth: BREAKPOINTS.sm - 1, current: true };
    }
    if (width < BREAKPOINTS.md) {
        return { name: 'sm', minWidth: BREAKPOINTS.sm, maxWidth: BREAKPOINTS.md - 1, current: true };
    }
    if (width < BREAKPOINTS.lg) {
        return { name: 'md', minWidth: BREAKPOINTS.md, maxWidth: BREAKPOINTS.lg - 1, current: true };
    }
    if (width < BREAKPOINTS.xl) {
        return { name: 'lg', minWidth: BREAKPOINTS.lg, maxWidth: BREAKPOINTS.xl - 1, current: true };
    }
    if (width < BREAKPOINTS['2xl']) {
        return { name: 'xl', minWidth: BREAKPOINTS.xl, maxWidth: BREAKPOINTS['2xl'] - 1, current: true };
    }
    return { name: '2xl', minWidth: BREAKPOINTS['2xl'], current: true };
}

/**
 * Check if current viewport matches a breakpoint
 */
export function matchesBreakpoint(breakpoint: keyof typeof BREAKPOINTS): boolean {
    return window.innerWidth >= BREAKPOINTS[breakpoint];
}

/**
 * Check for horizontal overflow issues
 */
export function checkHorizontalOverflow(): HTMLElement[] {
    const overflowingElements: HTMLElement[] = [];
    const docWidth = document.documentElement.offsetWidth;

    document.querySelectorAll<HTMLElement>('*').forEach((element) => {
        if (element.offsetWidth > docWidth) {
            overflowingElements.push(element);
        }
    });

    return overflowingElements;
}

/**
 * Audit spacing consistency
 */
interface SpacingAuditResult {
    element: HTMLElement;
    selector: string;
    property: string;
    value: string;
    isInconsistent: boolean;
}

export function auditSpacing(): SpacingAuditResult[] {
    const results: SpacingAuditResult[] = [];
    const containers = document.querySelectorAll<HTMLElement>('[class*="p-"], [class*="m-"], [class*="gap-"]');

    containers.forEach((element) => {
        const style = window.getComputedStyle(element);
        const classes = element.className;

        // Check for intermediate breakpoint usage (which we want to avoid)
        const hasIntermediateBreakpoints = /(?:sm|md):(?:p|m|gap)-\d+/.test(classes) &&
            /lg:(?:p|m|gap)-\d+/.test(classes);

        if (hasIntermediateBreakpoints) {
            results.push({
                element,
                selector: element.tagName.toLowerCase() + (element.className ? '.' + element.className.split(' ')[0] : ''),
                property: 'spacing',
                value: classes,
                isInconsistent: true
            });
        }
    });

    return results;
}

/**
 * Check grid responsiveness
 */
interface GridInfo {
    element: HTMLElement;
    columns: number;
    gap: string;
    breakpoint: string;
}

export function getGridInfo(): GridInfo[] {
    const grids: GridInfo[] = [];
    const gridElements = document.querySelectorAll<HTMLElement>('[class*="grid-cols"]');

    gridElements.forEach((element) => {
        const style = window.getComputedStyle(element);
        const gridTemplateColumns = style.gridTemplateColumns;
        const columns = gridTemplateColumns.split(' ').filter(v => v !== '').length;

        grids.push({
            element,
            columns,
            gap: style.gap,
            breakpoint: getCurrentBreakpoint().name
        });
    });

    return grids;
}

/**
 * Log responsive design status
 */
export function logResponsiveStatus(): void {
    console.group('%c📱 Responsive Design Status', 'font-size: 16px; font-weight: bold;');

    // Current breakpoint
    const breakpoint = getCurrentBreakpoint();
    console.log(`%cCurrent Breakpoint: ${breakpoint.name}`, 'font-size: 14px; color: blue;');
    console.log(`Viewport: ${window.innerWidth}x${window.innerHeight}`);
    console.log(`Orientation: ${window.innerWidth > window.innerHeight ? 'landscape' : 'portrait'}`);

    // Horizontal overflow check
    const overflowing = checkHorizontalOverflow();
    if (overflowing.length > 0) {
        console.warn(`⚠️ ${overflowing.length} elements causing horizontal overflow:`);
        overflowing.forEach(el => console.log(el));
    } else {
        console.log('✅ No horizontal overflow detected');
    }

    // Grid info
    const grids = getGridInfo();
    if (grids.length > 0) {
        console.group('📊 Grid Layouts:');
        grids.forEach(({ element, columns, gap }) => {
            console.log(`${columns} columns, gap: ${gap}`, element);
        });
        console.groupEnd();
    }

    // Spacing audit
    const spacingIssues = auditSpacing();
    if (spacingIssues.length > 0) {
        console.warn(`⚠️ ${spacingIssues.length} potential spacing inconsistencies found`);
    }

    console.groupEnd();
}

// Attach to window for console usage
if (typeof window !== 'undefined') {
    (window as any).checkResponsive = logResponsiveStatus;
    (window as any).getBreakpoint = getCurrentBreakpoint;
    (window as any).checkOverflow = checkHorizontalOverflow;
    (window as any).auditSpacing = auditSpacing;
    (window as any).getGrids = getGridInfo;
}

export default {
    BREAKPOINTS,
    DEVICE_PRESETS,
    getCurrentBreakpoint,
    matchesBreakpoint,
    checkHorizontalOverflow,
    auditSpacing,
    getGridInfo,
    logResponsiveStatus
};
