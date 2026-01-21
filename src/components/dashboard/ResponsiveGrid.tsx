/**
 * ResponsiveGrid Component
 * 
 * A responsive grid layout component optimized for dashboard widgets.
 * Automatically adjusts columns based on viewport and content.
 */

import React, { memo, ReactNode } from 'react';

type GridVariant = 'stats' | 'widgets' | 'equal' | 'auto';

interface ResponsiveGridProps {
    children: ReactNode;
    /** Grid variant determines column layout */
    variant?: GridVariant;
    /** Gap between items (in Tailwind spacing units) */
    gap?: 2 | 3 | 4 | 5 | 6;
    className?: string;
}

const gridVariantClasses: Record<GridVariant, string> = {
    // Stats cards: 2 on mobile, 4 on desktop
    stats: 'grid-cols-2 sm:grid-cols-2 md:grid-cols-4',
    // Widgets: 1 on mobile, 2 on tablet, 3 on desktop
    widgets: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3',
    // Equal columns: 1 on mobile, 2 on tablet+
    equal: 'grid-cols-1 md:grid-cols-2',
    // Auto-fit with minimum width
    auto: 'grid-cols-[repeat(auto-fit,minmax(280px,1fr))]',
};

const gapClasses: Record<number, string> = {
    2: 'gap-2',
    3: 'gap-3',
    4: 'gap-4',
    5: 'gap-5',
    6: 'gap-6',
};

const ResponsiveGridBase: React.FC<ResponsiveGridProps> = ({
    children,
    variant = 'widgets',
    gap = 4,
    className = '',
}) => {
    return (
        <div
            className={`grid ${gridVariantClasses[variant]} ${gapClasses[gap]} ${className}`}
            role="list"
        >
            {children}
        </div>
    );
};

export const ResponsiveGrid = memo(ResponsiveGridBase);
export type { ResponsiveGridProps, GridVariant };
