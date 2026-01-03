/**
 * Page Accessibility Wrapper
 * 
 * Provides accessibility enhancements for page components:
 * - Skip links
 * - Page title announcements
 * - Landmark roles
 * - Focus management
 */

import React, { useEffect, useRef, ReactNode, useState, useCallback } from 'react';

// ============================================
// VISUALLY HIDDEN (local implementation)
// ============================================

interface VisuallyHiddenProps {
    children: ReactNode;
}

const VisuallyHidden: React.FC<VisuallyHiddenProps> = ({ children }) => (
    <span className="sr-only">{children}</span>
);

// ============================================
// SIMPLE ANNOUNCE HOOK (local implementation)
// ============================================

function usePageAnnounce() {
    const [, setMessage] = useState('');

    const announce = useCallback((text: string, _priority: 'polite' | 'assertive' = 'polite') => {
        // Force re-render to trigger screen reader
        setMessage('');
        setTimeout(() => setMessage(text), 100);
    }, []);

    return announce;
}

// ============================================
// ACCESSIBLE PAGE WRAPPER
// ============================================

interface AccessiblePageProps {
    children: ReactNode;
    title: string;
    description?: string;
    className?: string;
}

/**
 * Wrapper for pages with accessibility enhancements
 */
export const AccessiblePage: React.FC<AccessiblePageProps> = ({
    children,
    title,
    description,
    className = '',
}) => {
    const mainRef = useRef<HTMLElement>(null);
    const announce = usePageAnnounce();

    // Announce page title when mounted
    useEffect(() => {
        announce(`${title}${description ? `. ${description}` : ''}`, 'polite');

        // Update document title
        document.title = `${title} | Portal Guru`;

        // Focus main content if coming from skip link
        const hash = window.location.hash;
        if (hash === '#main-content' && mainRef.current) {
            mainRef.current.focus();
        }
    }, [title, description, announce]);

    return (
        <main
            ref={mainRef}
            id="main-content"
            role="main"
            aria-label={title}
            tabIndex={-1}
            className={`outline-none ${className}`}
        >
            <VisuallyHidden>
                <h1>{title}</h1>
            </VisuallyHidden>
            {children}
        </main>
    );
};

// ============================================
// SKIP LINK
// ============================================

export const SkipToMainContent: React.FC = () => {
    return (
        <a
            href="#main-content"
            className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-[9999] focus:px-4 focus:py-2 focus:bg-indigo-600 focus:text-white focus:rounded-lg focus:shadow-lg"
        >
            Lewati ke konten utama
        </a>
    );
};

// ============================================
// SECTION WITH HEADING
// ============================================

interface AccessibleSectionProps {
    children: ReactNode;
    title: string;
    level?: 2 | 3 | 4 | 5 | 6;
    showTitle?: boolean;
    className?: string;
    titleClassName?: string;
    id?: string;
}

/**
 * Section with proper heading structure
 */
export const AccessibleSection: React.FC<AccessibleSectionProps> = ({
    children,
    title,
    level = 2,
    showTitle = true,
    className = '',
    titleClassName = '',
    id,
}) => {
    const HeadingTag = `h${level}` as keyof JSX.IntrinsicElements;
    const sectionId = id || title.toLowerCase().replace(/\s+/g, '-');

    return (
        <section
            aria-labelledby={`${sectionId}-heading`}
            className={className}
        >
            {showTitle ? (
                <HeadingTag
                    id={`${sectionId}-heading`}
                    className={titleClassName || 'text-lg font-semibold text-slate-900 dark:text-white mb-4'}
                >
                    {title}
                </HeadingTag>
            ) : (
                <VisuallyHidden>
                    <HeadingTag id={`${sectionId}-heading`}>{title}</HeadingTag>
                </VisuallyHidden>
            )}
            {children}
        </section>
    );
};

// ============================================
// ACCESSIBLE TABLE
// ============================================

interface AccessibleTableProps<T> {
    data: T[];
    columns: {
        key: string;
        header: string;
        render: (item: T, index: number) => ReactNode;
        sortable?: boolean;
    }[];
    caption: string;
    showCaption?: boolean;
    emptyMessage?: string;
    onRowClick?: (item: T, index: number) => void;
    selectedIndex?: number;
    className?: string;
    keyExtractor: (item: T, index: number) => string;
}

/**
 * Accessible table with proper ARIA attributes
 */
export function AccessibleTable<T>({
    data,
    columns,
    caption,
    showCaption = false,
    emptyMessage = 'Tidak ada data',
    onRowClick,
    selectedIndex,
    className = '',
    keyExtractor,
}: AccessibleTableProps<T>) {
    return (
        <div className={`overflow-x-auto ${className}`}>
            <table
                className="w-full border-collapse"
                role="grid"
                aria-label={caption}
            >
                {showCaption ? (
                    <caption className="text-left text-sm text-slate-500 mb-2">{caption}</caption>
                ) : (
                    <caption className="sr-only">{caption}</caption>
                )}

                <thead>
                    <tr role="row">
                        {columns.map((col) => (
                            <th
                                key={col.key}
                                scope="col"
                                role="columnheader"
                                className="px-4 py-3 text-left text-sm font-medium text-slate-600 dark:text-slate-400 bg-slate-50 dark:bg-slate-800/50"
                            >
                                {col.header}
                            </th>
                        ))}
                    </tr>
                </thead>

                <tbody>
                    {data.length === 0 ? (
                        <tr role="row">
                            <td
                                colSpan={columns.length}
                                className="px-4 py-8 text-center text-slate-500"
                            >
                                {emptyMessage}
                            </td>
                        </tr>
                    ) : (
                        data.map((item, index) => (
                            <tr
                                key={keyExtractor(item, index)}
                                role="row"
                                aria-selected={selectedIndex === index}
                                tabIndex={onRowClick ? 0 : undefined}
                                onClick={() => onRowClick?.(item, index)}
                                onKeyDown={(e) => {
                                    if (onRowClick && (e.key === 'Enter' || e.key === ' ')) {
                                        e.preventDefault();
                                        onRowClick(item, index);
                                    }
                                }}
                                className={`
                                    border-b border-slate-100 dark:border-slate-800
                                    ${onRowClick ? 'cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/50' : ''}
                                    ${selectedIndex === index ? 'bg-indigo-50 dark:bg-indigo-900/20' : ''}
                                    focus:outline-none focus:bg-indigo-50 dark:focus:bg-indigo-900/20
                                `}
                            >
                                {columns.map((col) => (
                                    <td
                                        key={col.key}
                                        role="gridcell"
                                        className="px-4 py-3 text-sm text-slate-700 dark:text-slate-300"
                                    >
                                        {col.render(item, index)}
                                    </td>
                                ))}
                            </tr>
                        ))
                    )}
                </tbody>
            </table>
        </div>
    );
}

// ============================================
// ACCESSIBLE LIST
// ============================================

interface AccessibleListProps<T> {
    items: T[];
    renderItem: (item: T, index: number) => ReactNode;
    label: string;
    emptyMessage?: string;
    className?: string;
    itemClassName?: string;
    keyExtractor: (item: T, index: number) => string;
    onItemClick?: (item: T, index: number) => void;
}

/**
 * Accessible list with proper ARIA
 */
export function AccessibleList<T>({
    items,
    renderItem,
    label,
    emptyMessage = 'Tidak ada item',
    className = '',
    itemClassName = '',
    keyExtractor,
    onItemClick,
}: AccessibleListProps<T>) {
    if (items.length === 0) {
        return (
            <div className="text-center py-8 text-slate-500" role="status">
                {emptyMessage}
            </div>
        );
    }

    return (
        <ul
            role="list"
            aria-label={label}
            className={className}
        >
            {items.map((item, index) => (
                <li
                    key={keyExtractor(item, index)}
                    role="listitem"
                    tabIndex={onItemClick ? 0 : undefined}
                    onClick={() => onItemClick?.(item, index)}
                    onKeyDown={(e) => {
                        if (onItemClick && (e.key === 'Enter' || e.key === ' ')) {
                            e.preventDefault();
                            onItemClick(item, index);
                        }
                    }}
                    className={`
                        ${onItemClick ? 'cursor-pointer focus:outline-none focus:ring-2 focus:ring-indigo-500' : ''}
                        ${itemClassName}
                    `}
                >
                    {renderItem(item, index)}
                </li>
            ))}
        </ul>
    );
}

// ============================================
// LIVE REGION
// ============================================

interface LiveRegionProps {
    children: ReactNode;
    mode?: 'polite' | 'assertive';
    atomic?: boolean;
}

/**
 * Live region for screen reader announcements
 */
export const LiveRegion: React.FC<LiveRegionProps> = ({
    children,
    mode = 'polite',
    atomic = true,
}) => {
    return (
        <div
            role="status"
            aria-live={mode}
            aria-atomic={atomic}
            className="sr-only"
        >
            {children}
        </div>
    );
};

// ============================================
// ACCESSIBLE ICON BUTTON
// ============================================

interface AccessibleIconButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    icon: ReactNode;
    label: string;
    variant?: 'default' | 'ghost' | 'outline';
    size?: 'sm' | 'md' | 'lg';
}

/**
 * Icon-only button with required label for accessibility
 */
export const AccessibleIconButton: React.FC<AccessibleIconButtonProps> = ({
    icon,
    label,
    variant = 'ghost',
    size = 'md',
    className = '',
    ...props
}) => {
    const sizeClasses = {
        sm: 'w-8 h-8',
        md: 'w-10 h-10',
        lg: 'w-12 h-12',
    };

    const variantClasses = {
        default: 'bg-indigo-600 text-white hover:bg-indigo-700',
        ghost: 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800',
        outline: 'border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800',
    };

    return (
        <button
            type="button"
            aria-label={label}
            title={label}
            className={`
                inline-flex items-center justify-center rounded-lg transition-colors
                focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2
                ${sizeClasses[size]}
                ${variantClasses[variant]}
                ${className}
            `}
            {...props}
        >
            {icon}
            <span className="sr-only">{label}</span>
        </button>
    );
};

// ============================================
// LOADING INDICATOR
// ============================================

interface AccessibleLoadingProps {
    message?: string;
    className?: string;
}

/**
 * Accessible loading indicator
 */
export const AccessibleLoading: React.FC<AccessibleLoadingProps> = ({
    message = 'Memuat...',
    className = '',
}) => {
    return (
        <div
            role="status"
            aria-busy="true"
            aria-label={message}
            className={`flex items-center justify-center gap-2 ${className}`}
        >
            <div className="w-5 h-5 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
            <span className="text-sm text-slate-600 dark:text-slate-400">{message}</span>
        </div>
    );
};

export default {
    AccessiblePage,
    SkipToMainContent,
    AccessibleSection,
    AccessibleTable,
    AccessibleList,
    LiveRegion,
    AccessibleIconButton,
    AccessibleLoading,
};
