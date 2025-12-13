import React from 'react';
import { Skeleton } from '../ui/Skeleton';

/**
 * Skeleton for AnalyticsPage
 * Shows loading placeholders for stats, charts, and data tables
 */
const AnalyticsPageSkeleton: React.FC = () => {
    return (
        <div className="min-h-screen p-4 md:p-8 space-y-6 animate-pulse pb-24 lg:pb-8">
            {/* Header */}
            <div className="flex flex-col gap-4">
                <div>
                    <Skeleton className="h-8 w-48 mb-2" />
                    <Skeleton className="h-4 w-64" />
                </div>
                <div className="flex flex-wrap items-center gap-2">
                    <Skeleton className="h-10 w-32" />
                    <Skeleton className="h-10 w-28" />
                    <Skeleton className="h-10 w-10" />
                </div>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {[...Array(4)].map((_, i) => (
                    <div key={i} className="bg-white dark:bg-slate-900 rounded-xl p-6 shadow-lg">
                        <div className="flex items-start justify-between">
                            <div className="flex-1">
                                <Skeleton className="h-4 w-24 mb-2" />
                                <Skeleton className="h-8 w-16 mb-2" />
                                <Skeleton className="h-3 w-32" />
                            </div>
                            <Skeleton className="h-12 w-12 rounded-xl" />
                        </div>
                    </div>
                ))}
            </div>

            {/* Charts Row */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Bar Chart Skeleton */}
                <div className="bg-white dark:bg-slate-900 rounded-xl p-6 shadow-lg">
                    <Skeleton className="h-6 w-48 mb-4" />
                    <div className="flex items-end gap-1 h-40">
                        {[...Array(15)].map((_, i) => (
                            <Skeleton
                                key={i}
                                className="flex-1"
                                style={{ height: `${Math.random() * 100 + 20}%` }}
                            />
                        ))}
                    </div>
                    <div className="flex justify-between mt-4">
                        <Skeleton className="h-3 w-12" />
                        <Skeleton className="h-3 w-12" />
                        <Skeleton className="h-3 w-12" />
                    </div>
                </div>

                {/* Pie Chart Skeleton */}
                <div className="bg-white dark:bg-slate-900 rounded-xl p-6 shadow-lg">
                    <Skeleton className="h-6 w-40 mb-4" />
                    <div className="flex items-center gap-8">
                        <Skeleton className="w-32 h-32 rounded-full" />
                        <div className="flex-1 space-y-3">
                            {[...Array(4)].map((_, i) => (
                                <div key={i} className="flex items-center gap-3">
                                    <Skeleton className="w-3 h-3 rounded-full" />
                                    <Skeleton className="h-4 flex-1" />
                                    <Skeleton className="h-4 w-8" />
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>

            {/* Class Comparison Skeleton */}
            <div className="bg-white dark:bg-slate-900 rounded-xl p-6 shadow-lg">
                <Skeleton className="h-6 w-40 mb-4" />
                <div className="space-y-4">
                    {[...Array(4)].map((_, i) => (
                        <div key={i} className="flex items-center gap-4">
                            <Skeleton className="w-8 h-8 rounded-full" />
                            <div className="flex-1">
                                <div className="flex justify-between mb-1">
                                    <Skeleton className="h-4 w-24" />
                                    <Skeleton className="h-4 w-12" />
                                </div>
                                <Skeleton className="h-2 w-full rounded-full" />
                            </div>
                            <Skeleton className="h-6 w-12" />
                        </div>
                    ))}
                </div>
            </div>

            {/* Task Overview Skeleton */}
            <div className="bg-white dark:bg-slate-900 rounded-xl p-6 shadow-lg">
                <Skeleton className="h-6 w-32 mb-4" />
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                    {[...Array(4)].map((_, i) => (
                        <div key={i} className="rounded-xl p-4 bg-slate-100 dark:bg-slate-800">
                            <Skeleton className="h-8 w-12 mx-auto mb-2" />
                            <Skeleton className="h-3 w-20 mx-auto" />
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default AnalyticsPageSkeleton;
