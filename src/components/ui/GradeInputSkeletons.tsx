import React from 'react';

interface SkeletonProps {
    className?: string;
}

/**
 * Base skeleton component with shimmer animation
 */
export const Skeleton: React.FC<SkeletonProps> = ({ className = '' }) => (
    <div
        className={`animate-pulse bg-gradient-to-r from-gray-200 via-gray-100 to-gray-200 dark:from-gray-700 dark:via-gray-600 dark:to-gray-700 rounded ${className}`}
        style={{ backgroundSize: '200% 100%', animation: 'shimmer 1.5s infinite' }}
    />
);

/**
 * Skeleton for configuration card (class, subject, assessment selectors)
 */
export const ConfigurationCardSkeleton: React.FC = () => (
    <div className="p-6 rounded-3xl bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-900 border border-gray-200 dark:border-gray-700">
        <div className="flex items-center gap-2 mb-4">
            <Skeleton className="w-6 h-6 rounded-full" />
            <Skeleton className="w-32 h-6" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
                <Skeleton className="w-16 h-4 mb-2" />
                <Skeleton className="w-full h-10 rounded-xl" />
            </div>
            <div>
                <Skeleton className="w-20 h-4 mb-2" />
                <Skeleton className="w-full h-10 rounded-xl" />
            </div>
            <div>
                <Skeleton className="w-24 h-4 mb-2" />
                <Skeleton className="w-full h-10 rounded-xl" />
            </div>
        </div>
    </div>
);

/**
 * Skeleton for statistics preview (4 stat cards)
 */
export const StatisticsPreviewSkeleton: React.FC = () => (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[...Array(4)].map((_, i) => (
            <div
                key={i}
                className="p-4 rounded-xl bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700"
            >
                <Skeleton className="w-8 h-8 rounded-lg mb-2" />
                <Skeleton className="w-12 h-6 mb-1" />
                <Skeleton className="w-16 h-3" />
            </div>
        ))}
    </div>
);

/**
 * Skeleton for a single student row
 */
export const StudentRowSkeleton: React.FC = () => (
    <div className="flex items-center gap-4 p-4 border-b border-gray-100 dark:border-gray-800">
        <Skeleton className="w-8 h-4" />
        <Skeleton className="w-10 h-10 rounded-full" />
        <div className="flex-grow">
            <Skeleton className="w-32 h-5 mb-1" />
            <Skeleton className="w-20 h-3" />
        </div>
        <Skeleton className="w-20 h-10 rounded-xl" />
    </div>
);

/**
 * Skeleton for student list (multiple rows)
 */
export const StudentListSkeleton: React.FC<{ rows?: number }> = ({ rows = 5 }) => (
    <div className="rounded-2xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 overflow-hidden">
        {/* Header */}
        <div className="flex items-center gap-4 p-4 bg-gray-50 dark:bg-gray-800/50 border-b border-gray-200 dark:border-gray-700">
            <Skeleton className="w-8 h-4" />
            <Skeleton className="w-20 h-4" />
            <div className="flex-grow" />
            <Skeleton className="w-16 h-4" />
        </div>
        {/* Rows */}
        {[...Array(rows)].map((_, i) => (
            <StudentRowSkeleton key={i} />
        ))}
    </div>
);

/**
 * Skeleton for quick actions toolbar
 */
export const QuickActionsToolbarSkeleton: React.FC = () => (
    <div className="flex flex-wrap gap-2">
        {[...Array(5)].map((_, i) => (
            <Skeleton key={i} className="w-28 h-9 rounded-lg" />
        ))}
    </div>
);

/**
 * Full page skeleton for BulkGradeInputPage
 */
export const BulkGradeInputPageSkeleton: React.FC = () => (
    <div className="space-y-6 p-4 md:p-6">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2">
            <Skeleton className="w-16 h-4" />
            <Skeleton className="w-4 h-4" />
            <Skeleton className="w-24 h-4" />
        </div>

        {/* Header */}
        <div className="flex justify-between items-start">
            <div>
                <Skeleton className="w-48 h-10 mb-2" />
                <Skeleton className="w-64 h-4" />
            </div>
            <div className="flex gap-2">
                <Skeleton className="w-32 h-10 rounded-lg" />
                <Skeleton className="w-32 h-10 rounded-lg" />
            </div>
        </div>

        {/* Configuration Card */}
        <ConfigurationCardSkeleton />

        {/* Statistics Preview */}
        <StatisticsPreviewSkeleton />

        {/* Quick Actions */}
        <QuickActionsToolbarSkeleton />

        {/* Student List */}
        <StudentListSkeleton rows={8} />
    </div>
);

export default {
    Skeleton,
    ConfigurationCardSkeleton,
    StatisticsPreviewSkeleton,
    StudentRowSkeleton,
    StudentListSkeleton,
    QuickActionsToolbarSkeleton,
    BulkGradeInputPageSkeleton,
};
