import React, { useState, useEffect, useRef } from 'react';

/**
 * Skeleton & Loading Components
 * Features: Shimmer effect, skeleton screens, progressive image loading
 */

// ============================================
// SHIMMER ANIMATION STYLES
// ============================================

const shimmerClass = `
    relative overflow-hidden
    before:absolute before:inset-0
    before:-translate-x-full
    before:animate-[shimmer_1.5s_infinite]
    before:bg-gradient-to-r
    before:from-transparent before:via-white/20 before:to-transparent
`;

// Add to your global CSS:
// @keyframes shimmer {
//   100% { transform: translateX(100%); }
// }

// ============================================
// BASE SKELETON
// ============================================

interface SkeletonProps {
    className?: string;
    width?: string | number;
    height?: string | number;
    rounded?: 'none' | 'sm' | 'md' | 'lg' | 'full';
    animate?: boolean;
}

export const Skeleton: React.FC<SkeletonProps> = ({
    className = '',
    width,
    height,
    rounded = 'md',
    animate = true
}) => {
    const roundedClass = {
        none: '',
        sm: 'rounded-sm',
        md: 'rounded-md',
        lg: 'rounded-lg',
        full: 'rounded-full'
    }[rounded];

    return (
        <div
            className={`
                bg-slate-200 dark:bg-slate-700 
                ${roundedClass}
                ${animate ? 'animate-pulse' : ''}
                ${className}
            `}
            style={{
                width: typeof width === 'number' ? `${width}px` : width,
                height: typeof height === 'number' ? `${height}px` : height
            }}
        />
    );
};

// Skeleton with shimmer effect
export const SkeletonShimmer: React.FC<SkeletonProps> = ({
    className = '',
    width,
    height,
    rounded = 'md'
}) => {
    const roundedClass = {
        none: '',
        sm: 'rounded-sm',
        md: 'rounded-md',
        lg: 'rounded-lg',
        full: 'rounded-full'
    }[rounded];

    return (
        <div
            className={`
                bg-slate-200 dark:bg-slate-700 
                ${roundedClass}
                relative overflow-hidden
                ${className}
            `}
            style={{
                width: typeof width === 'number' ? `${width}px` : width,
                height: typeof height === 'number' ? `${height}px` : height
            }}
        >
            <div className="absolute inset-0 animate-shimmer-slide bg-gradient-to-r from-transparent via-white/30 dark:via-white/10 to-transparent" />
        </div>
    );
};

// ============================================
// TEXT SKELETON
// ============================================

interface SkeletonTextProps {
    lines?: number;
    className?: string;
    animate?: boolean;
}

export const SkeletonText: React.FC<SkeletonTextProps> = ({
    lines = 3,
    className = '',
    animate = true
}) => {
    return (
        <div className={`space-y-2 ${className}`}>
            {Array.from({ length: lines }).map((_, i) => (
                <Skeleton
                    key={i}
                    height={16}
                    width={i === lines - 1 ? '75%' : '100%'}
                    animate={animate}
                />
            ))}
        </div>
    );
};

// ============================================
// AVATAR SKELETON
// ============================================

interface SkeletonAvatarProps {
    size?: 'sm' | 'md' | 'lg' | 'xl';
    className?: string;
}

export const SkeletonAvatar: React.FC<SkeletonAvatarProps> = ({
    size = 'md',
    className = ''
}) => {
    const sizeMap = {
        sm: 32,
        md: 40,
        lg: 56,
        xl: 80
    };

    return (
        <SkeletonShimmer
            width={sizeMap[size]}
            height={sizeMap[size]}
            rounded="full"
            className={className}
        />
    );
};

// ============================================
// CARD SKELETON
// ============================================

interface SkeletonCardProps {
    hasImage?: boolean;
    hasAvatar?: boolean;
    lines?: number;
    className?: string;
}

export const SkeletonCard: React.FC<SkeletonCardProps> = ({
    hasImage = false,
    hasAvatar = false,
    lines = 2,
    className = ''
}) => {
    return (
        <div className={`bg-white dark:bg-slate-800 rounded-xl p-4 shadow-sm ${className}`}>
            {hasImage && (
                <SkeletonShimmer
                    width="100%"
                    height={160}
                    rounded="lg"
                    className="mb-4"
                />
            )}
            <div className="flex items-start gap-3">
                {hasAvatar && <SkeletonAvatar size="md" />}
                <div className="flex-1">
                    <SkeletonShimmer height={20} width="60%" className="mb-2" />
                    <SkeletonText lines={lines} />
                </div>
            </div>
        </div>
    );
};

// ============================================
// LIST ITEM SKELETON
// ============================================

interface SkeletonListItemProps {
    hasAvatar?: boolean;
    hasAction?: boolean;
    className?: string;
}

export const SkeletonListItem: React.FC<SkeletonListItemProps> = ({
    hasAvatar = true,
    hasAction = false,
    className = ''
}) => {
    return (
        <div className={`flex items-center gap-4 p-4 ${className}`}>
            {hasAvatar && <SkeletonAvatar size="md" />}
            <div className="flex-1">
                <SkeletonShimmer height={18} width="50%" className="mb-2" />
                <SkeletonShimmer height={14} width="30%" />
            </div>
            {hasAction && <SkeletonShimmer height={32} width={80} rounded="lg" />}
        </div>
    );
};

export const SkeletonList: React.FC<{
    count?: number;
    hasAvatar?: boolean;
    hasAction?: boolean;
    className?: string;
}> = ({
    count = 5,
    hasAvatar = true,
    hasAction = false,
    className = ''
}) => {
        return (
            <div className={`divide-y divide-slate-200 dark:divide-slate-700 ${className}`}>
                {Array.from({ length: count }).map((_, i) => (
                    <SkeletonListItem key={i} hasAvatar={hasAvatar} hasAction={hasAction} />
                ))}
            </div>
        );
    };

// ============================================
// TABLE SKELETON
// ============================================

interface SkeletonTableProps {
    rows?: number;
    columns?: number;
    hasHeader?: boolean;
    className?: string;
}

export const SkeletonTable: React.FC<SkeletonTableProps> = ({
    rows = 5,
    columns = 4,
    hasHeader = true,
    className = ''
}) => {
    return (
        <div className={`overflow-hidden rounded-xl border border-slate-200 dark:border-slate-700 ${className}`}>
            <table className="w-full">
                {hasHeader && (
                    <thead className="bg-slate-100 dark:bg-slate-800">
                        <tr>
                            {Array.from({ length: columns }).map((_, i) => (
                                <th key={i} className="px-4 py-3">
                                    <SkeletonShimmer height={16} width="70%" />
                                </th>
                            ))}
                        </tr>
                    </thead>
                )}
                <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                    {Array.from({ length: rows }).map((_, rowIndex) => (
                        <tr key={rowIndex}>
                            {Array.from({ length: columns }).map((_, colIndex) => (
                                <td key={colIndex} className="px-4 py-3">
                                    <SkeletonShimmer
                                        height={16}
                                        width={colIndex === 0 ? '80%' : '60%'}
                                    />
                                </td>
                            ))}
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
};

// ============================================
// STATS CARD SKELETON
// ============================================

export const SkeletonStatsCard: React.FC<{ className?: string }> = ({ className = '' }) => {
    return (
        <div className={`bg-white dark:bg-slate-800 rounded-xl p-6 shadow-sm ${className}`}>
            <div className="flex items-center justify-between mb-4">
                <SkeletonShimmer height={14} width="40%" />
                <SkeletonShimmer height={24} width={24} rounded="full" />
            </div>
            <SkeletonShimmer height={36} width="60%" className="mb-2" />
            <SkeletonShimmer height={12} width="30%" />
        </div>
    );
};

export const SkeletonStatsGrid: React.FC<{ count?: number; className?: string }> = ({
    count = 4,
    className = ''
}) => {
    return (
        <div className={`grid grid-cols-2 md:grid-cols-4 gap-4 ${className}`}>
            {Array.from({ length: count }).map((_, i) => (
                <SkeletonStatsCard key={i} />
            ))}
        </div>
    );
};

// ============================================
// DASHBOARD SKELETON
// ============================================

export const SkeletonDashboard: React.FC = () => {
    return (
        <div className="space-y-6">
            {/* Stats Grid */}
            <SkeletonStatsGrid count={4} />

            {/* Charts Row */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-white dark:bg-slate-800 rounded-xl p-6 shadow-sm">
                    <SkeletonShimmer height={20} width="40%" className="mb-4" />
                    <SkeletonShimmer height={200} width="100%" rounded="lg" />
                </div>
                <div className="bg-white dark:bg-slate-800 rounded-xl p-6 shadow-sm">
                    <SkeletonShimmer height={20} width="40%" className="mb-4" />
                    <SkeletonShimmer height={200} width="100%" rounded="lg" />
                </div>
            </div>

            {/* Recent Activity */}
            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm">
                <div className="p-4 border-b border-slate-200 dark:border-slate-700">
                    <SkeletonShimmer height={20} width="30%" />
                </div>
                <SkeletonList count={5} />
            </div>
        </div>
    );
};

// ============================================
// PAGE SKELETON LAYOUTS
// ============================================

export const SkeletonStudentsPage: React.FC = () => {
    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <SkeletonShimmer height={32} width={200} />
                <SkeletonShimmer height={40} width={140} rounded="lg" />
            </div>

            {/* Search & Filter */}
            <div className="flex gap-4">
                <SkeletonShimmer height={40} className="flex-1" rounded="lg" />
                <SkeletonShimmer height={40} width={120} rounded="lg" />
            </div>

            {/* Student Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {Array.from({ length: 6 }).map((_, i) => (
                    <SkeletonCard key={i} hasAvatar lines={2} />
                ))}
            </div>
        </div>
    );
};

export const SkeletonAttendancePage: React.FC = () => {
    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <SkeletonShimmer height={32} width={200} />
                <div className="flex gap-2">
                    <SkeletonShimmer height={40} width={180} rounded="lg" />
                    <SkeletonShimmer height={40} width={100} rounded="lg" />
                </div>
            </div>

            {/* Stats */}
            <SkeletonStatsGrid count={4} />

            {/* List */}
            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm">
                <SkeletonList count={10} hasAction />
            </div>
        </div>
    );
};

// ============================================
// PROGRESSIVE IMAGE LOADING
// ============================================

interface ProgressiveImageProps {
    src: string;
    alt: string;
    placeholder?: string;
    className?: string;
    width?: number;
    height?: number;
    blurDataURL?: string;
}

export const ProgressiveImage: React.FC<ProgressiveImageProps> = ({
    src,
    alt,
    placeholder,
    className = '',
    width,
    height,
    blurDataURL
}) => {
    const [isLoaded, setIsLoaded] = useState(false);
    const [isError, setIsError] = useState(false);
    const imgRef = useRef<HTMLImageElement>(null);

    useEffect(() => {
        if (imgRef.current?.complete) {
            setIsLoaded(true);
        }
    }, []);

    // Generate blur placeholder if not provided
    const defaultPlaceholder = `data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 ${width || 400} ${height || 300}'%3E%3Crect width='100%25' height='100%25' fill='%23E2E8F0'/%3E%3C/svg%3E`;

    return (
        <div
            className={`relative overflow-hidden ${className}`}
            style={{ width, height }}
        >
            {/* Blur placeholder */}
            {!isLoaded && !isError && (
                <>
                    <img
                        src={blurDataURL || placeholder || defaultPlaceholder}
                        alt=""
                        className="absolute inset-0 w-full h-full object-cover blur-lg scale-110"
                        aria-hidden="true"
                    />
                    <div className="absolute inset-0 animate-pulse bg-slate-200/50 dark:bg-slate-700/50" />
                </>
            )}

            {/* Error state */}
            {isError && (
                <div className="absolute inset-0 flex items-center justify-center bg-slate-100 dark:bg-slate-800">
                    <svg className="w-8 h-8 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                </div>
            )}

            {/* Main image */}
            <img
                ref={imgRef}
                src={src}
                alt={alt}
                className={`w-full h-full object-cover transition-opacity duration-500 ${isLoaded ? 'opacity-100' : 'opacity-0'
                    }`}
                onLoad={() => setIsLoaded(true)}
                onError={() => setIsError(true)}
            />
        </div>
    );
};

// ============================================
// LAZY LOADING WRAPPER
// ============================================

interface LazyLoadProps {
    children: React.ReactNode;
    skeleton?: React.ReactNode;
    height?: number | string;
    offset?: number;
    className?: string;
}

export const LazyLoad: React.FC<LazyLoadProps> = ({
    children,
    skeleton,
    height = 200,
    offset = 200,
    className = ''
}) => {
    const [isVisible, setIsVisible] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const observer = new IntersectionObserver(
            ([entry]) => {
                if (entry.isIntersecting) {
                    setIsVisible(true);
                    observer.disconnect();
                }
            },
            { rootMargin: `${offset}px` }
        );

        if (containerRef.current) {
            observer.observe(containerRef.current);
        }

        return () => observer.disconnect();
    }, [offset]);

    return (
        <div
            ref={containerRef}
            className={className}
            style={{ minHeight: height }}
        >
            {isVisible ? children : (skeleton || <Skeleton height={height} width="100%" />)}
        </div>
    );
};

// ============================================
// CONTENT LOADER (SVG-BASED)
// ============================================

interface ContentLoaderProps {
    width?: number;
    height?: number;
    speed?: number;
    backgroundColor?: string;
    foregroundColor?: string;
    children?: React.ReactNode;
}

export const ContentLoader: React.FC<ContentLoaderProps> = ({
    width = 400,
    height = 130,
    speed = 2,
    backgroundColor = '#e2e8f0',
    foregroundColor = '#f8fafc',
    children
}) => {
    const idClip = `clip-${Math.random().toString(36).substr(2, 9)}`;
    const idGradient = `gradient-${Math.random().toString(36).substr(2, 9)}`;

    return (
        <svg
            width={width}
            height={height}
            viewBox={`0 0 ${width} ${height}`}
            style={{ width: '100%', height: 'auto' }}
        >
            <defs>
                <clipPath id={idClip}>
                    {children || (
                        <>
                            {/* Default: Card-like content */}
                            <circle cx="30" cy="30" r="30" />
                            <rect x="75" y="15" rx="4" ry="4" width="150" height="12" />
                            <rect x="75" y="35" rx="4" ry="4" width="100" height="10" />
                            <rect x="0" y="75" rx="4" ry="4" width="400" height="10" />
                            <rect x="0" y="95" rx="4" ry="4" width="370" height="10" />
                            <rect x="0" y="115" rx="4" ry="4" width="200" height="10" />
                        </>
                    )}
                </clipPath>
                <linearGradient id={idGradient}>
                    <stop offset="0%" stopColor={backgroundColor}>
                        <animate
                            attributeName="offset"
                            values="-2; -2; 1"
                            keyTimes="0; 0.25; 1"
                            dur={`${speed}s`}
                            repeatCount="indefinite"
                        />
                    </stop>
                    <stop offset="50%" stopColor={foregroundColor}>
                        <animate
                            attributeName="offset"
                            values="-1; -1; 2"
                            keyTimes="0; 0.25; 1"
                            dur={`${speed}s`}
                            repeatCount="indefinite"
                        />
                    </stop>
                    <stop offset="100%" stopColor={backgroundColor}>
                        <animate
                            attributeName="offset"
                            values="0; 0; 3"
                            keyTimes="0; 0.25; 1"
                            dur={`${speed}s`}
                            repeatCount="indefinite"
                        />
                    </stop>
                </linearGradient>
            </defs>
            <rect
                x="0"
                y="0"
                width={width}
                height={height}
                clipPath={`url(#${idClip})`}
                fill={`url(#${idGradient})`}
            />
        </svg>
    );
};

// Pre-defined content loaders
export const CardContentLoader: React.FC = () => (
    <ContentLoader width={400} height={130}>
        <circle cx="30" cy="30" r="30" />
        <rect x="75" y="15" rx="4" ry="4" width="150" height="12" />
        <rect x="75" y="35" rx="4" ry="4" width="100" height="10" />
        <rect x="0" y="75" rx="4" ry="4" width="400" height="10" />
        <rect x="0" y="95" rx="4" ry="4" width="370" height="10" />
        <rect x="0" y="115" rx="4" ry="4" width="200" height="10" />
    </ContentLoader>
);

export const ListItemContentLoader: React.FC = () => (
    <ContentLoader width={400} height={60}>
        <circle cx="30" cy="30" r="25" />
        <rect x="70" y="15" rx="4" ry="4" width="200" height="12" />
        <rect x="70" y="35" rx="4" ry="4" width="120" height="10" />
        <rect x="320" y="20" rx="4" ry="4" width="60" height="20" />
    </ContentLoader>
);

export const TableRowContentLoader: React.FC = () => (
    <ContentLoader width={800} height={40}>
        <rect x="0" y="12" rx="4" ry="4" width="100" height="16" />
        <rect x="150" y="12" rx="4" ry="4" width="150" height="16" />
        <rect x="350" y="12" rx="4" ry="4" width="100" height="16" />
        <rect x="500" y="12" rx="4" ry="4" width="80" height="16" />
        <rect x="630" y="12" rx="4" ry="4" width="150" height="16" />
    </ContentLoader>
);

// ============================================
// LOADING OVERLAY
// ============================================

interface LoadingOverlayProps {
    isLoading: boolean;
    text?: string;
    blur?: boolean;
    children: React.ReactNode;
}

export const LoadingOverlay: React.FC<LoadingOverlayProps> = ({
    isLoading,
    text = 'Memuat...',
    blur = true,
    children
}) => {
    return (
        <div className="relative">
            {children}
            {isLoading && (
                <div className={`absolute inset-0 flex items-center justify-center bg-white/80 dark:bg-slate-900/80 z-10 ${blur ? 'backdrop-blur-sm' : ''}`}>
                    <div className="flex flex-col items-center gap-3">
                        <div className="w-10 h-10 border-4 border-indigo-200 border-t-indigo-500 rounded-full animate-spin" />
                        <span className="text-sm text-slate-600 dark:text-slate-400">{text}</span>
                    </div>
                </div>
            )}
        </div>
    );
};

// ============================================
// LOADING BUTTON
// ============================================

interface LoadingButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    isLoading?: boolean;
    loadingText?: string;
    variant?: 'primary' | 'secondary' | 'outline';
}

export const LoadingButton: React.FC<LoadingButtonProps> = ({
    isLoading = false,
    loadingText,
    children,
    disabled,
    className = '',
    variant = 'primary',
    ...props
}) => {
    const baseClass = 'inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg font-medium transition-all';
    const variantClass = {
        primary: 'bg-indigo-500 hover:bg-indigo-600 text-white disabled:bg-indigo-300',
        secondary: 'bg-slate-100 hover:bg-slate-200 text-slate-900 dark:bg-slate-700 dark:hover:bg-slate-600 dark:text-white',
        outline: 'border-2 border-indigo-500 text-indigo-500 hover:bg-indigo-50 dark:hover:bg-indigo-950'
    }[variant];

    return (
        <button
            disabled={isLoading || disabled}
            className={`${baseClass} ${variantClass} ${isLoading ? 'cursor-wait' : ''} ${className}`}
            {...props}
        >
            {isLoading && (
                <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
            )}
            {isLoading ? (loadingText || children) : children}
        </button>
    );
};

// ============================================
// EXPORTS
// ============================================

export default {
    Skeleton,
    SkeletonShimmer,
    SkeletonText,
    SkeletonAvatar,
    SkeletonCard,
    SkeletonListItem,
    SkeletonList,
    SkeletonTable,
    SkeletonStatsCard,
    SkeletonStatsGrid,
    SkeletonDashboard,
    SkeletonStudentsPage,
    SkeletonAttendancePage,
    ProgressiveImage,
    LazyLoad,
    ContentLoader,
    CardContentLoader,
    ListItemContentLoader,
    TableRowContentLoader,
    LoadingOverlay,
    LoadingButton
};
