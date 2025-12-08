// ============================================
// ENHANCED SKELETON SCREENS
// Comprehensive skeleton components for all page types
// ============================================

import React from 'react';
import { Skeleton } from '../ui/Skeleton';

// ============================================
// ATTENDANCE PAGE SKELETON
// ============================================
export const AttendancePageSkeleton: React.FC = () => (
    <div className="p-4 md:p-6 space-y-6 animate-fade-in">
        {/* Header */}
        <div className="space-y-2">
            <Skeleton className="h-8 w-64" />
            <Skeleton className="h-4 w-96" />
        </div>

        {/* Date Picker and Class Selector */}
        <div className="flex flex-col sm:flex-row gap-4">
            <Skeleton className="h-12 flex-1 rounded-xl" />
            <Skeleton className="h-12 w-48 rounded-xl" />
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="bg-white dark:bg-gray-800 rounded-2xl p-4 space-y-3">
                    <Skeleton className="h-10 w-10 rounded-xl" />
                    <Skeleton className="h-7 w-16" />
                    <Skeleton className="h-3 w-24" />
                </div>
            ))}
        </div>

        {/* Student List */}
        <div className="space-y-3">
            {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="glass-card rounded-xl p-4 flex items-center gap-4">
                    <Skeleton className="w-12 h-12 rounded-full" />
                    <div className="flex-1 space-y-2">
                        <Skeleton className="h-4 w-40" />
                        <Skeleton className="h-3 w-20" />
                    </div>
                    <div className="flex gap-2">
                        <Skeleton className="w-12 h-12 rounded-lg" />
                        <Skeleton className="w-12 h-12 rounded-lg" />
                        <Skeleton className="w-12 h-12 rounded-lg" />
                        <Skeleton className="w-12 h-12 rounded-lg" />
                    </div>
                </div>
            ))}
        </div>
    </div>
);

// ============================================
// SCHEDULE PAGE SKELETON
// ============================================
export const SchedulePageSkeleton: React.FC = () => (
    <div className="p-4 md:p-6 space-y-6 animate-fade-in">
        {/* Header */}
        <div className="flex items-center justify-between">
            <div className="space-y-2">
                <Skeleton className="h-8 w-48" />
                <Skeleton className="h-4 w-64" />
            </div>
            <Skeleton className="h-10 w-32 rounded-xl" />
        </div>

        {/* Week Navigation */}
        <div className="flex items-center justify-between">
            <Skeleton className="h-10 w-10 rounded-lg" />
            <Skeleton className="h-6 w-48" />
            <Skeleton className="h-10 w-10 rounded-lg" />
        </div>

        {/* Schedule Grid */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            {Array.from({ length: 5 }).map((_, dayIndex) => (
                <div key={dayIndex} className="space-y-3">
                    <Skeleton className="h-12 rounded-xl" />
                    {Array.from({ length: 6 }).map((_, slotIndex) => (
                        <div key={slotIndex} className="bg-gradient-to-br from-indigo-50 to-purple-50 dark:from-indigo-900/20 dark:to-purple-900/20 rounded-xl p-3 space-y-2 border border-indigo-200 dark:border-indigo-800">
                            <Skeleton className="h-4 w-20" />
                            <Skeleton className="h-5 w-full" />
                            <Skeleton className="h-3 w-16" />
                        </div>
                    ))}
                </div>
            ))}
        </div>
    </div>
);

// ============================================
// TASKS PAGE SKELETON
// ============================================
export const TasksPageSkeleton: React.FC = () => (
    <div className="p-4 md:p-6 lg:p-8 space-y-6 animate-fade-in">
        {/* Header */}
        <div className="flex items-start justify-between">
            <div className="space-y-2">
                <Skeleton className="h-8 w-48" />
                <Skeleton className="h-4 w-96" />
            </div>
            <Skeleton className="h-10 w-32 rounded-xl" />
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4">
            {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="bg-slate-800/50 rounded-2xl p-6 space-y-2 text-center">
                    <Skeleton className="h-10 w-16 mx-auto" />
                    <Skeleton className="h-3 w-20 mx-auto" />
                </div>
            ))}
        </div>

        {/* Filter Tabs */}
        <div className="flex gap-2">
            <Skeleton className="h-10 w-32 rounded-full" />
            <Skeleton className="h-10 w-32 rounded-full" />
            <Skeleton className="h-10 w-24 rounded-full" />
        </div>

        {/* Task List */}
        <div className="space-y-3">
            {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="bg-white dark:bg-slate-800/80 rounded-xl p-4 flex items-center gap-4">
                    <Skeleton className="w-5 h-5 rounded" />
                    <div className="flex-1 space-y-2">
                        <Skeleton className="h-4 w-2/3" />
                        <Skeleton className="h-3 w-24" />
                    </div>
                    <Skeleton className="w-12 h-6 rounded-full" />
                </div>
            ))}
        </div>
    </div>
);

// ============================================
// SETTINGS PAGE SKELETON
// ============================================
export const SettingsPageSkeleton: React.FC = () => (
    <div className="p-4 md:p-6 space-y-6 animate-fade-in max-w-4xl mx-auto">
        {/* Header */}
        <div className="space-y-2">
            <Skeleton className="h-8 w-48" />
            <Skeleton className="h-4 w-96" />
        </div>

        {/* Settings Sections */}
        {Array.from({ length: 4 }).map((_, sectionIndex) => (
            <div key={sectionIndex} className="glass-card rounded-2xl p-6 space-y-4">
                <Skeleton className="h-6 w-40" />
                <div className="space-y-3">
                    {Array.from({ length: 3 }).map((_, itemIndex) => (
                        <div key={itemIndex} className="flex items-center justify-between py-3 border-b border-gray-200 dark:border-gray-700 last:border-0">
                            <div className="space-y-1">
                                <Skeleton className="h-4 w-32" />
                                <Skeleton className="h-3 w-48" />
                            </div>
                            <Skeleton className="h-6 w-12 rounded-full" />
                        </div>
                    ))}
                </div>
            </div>
        ))}
    </div>
);

// ============================================
// STUDENT DETAIL PAGE SKELETON
// ============================================
export const StudentDetailPageSkeleton: React.FC = () => (
    <div className="p-4 md:p-6 space-y-6 animate-fade-in">
        {/* Header with Back Button */}
        <div className="flex items-center gap-4">
            <Skeleton className="w-10 h-10 rounded-lg" />
            <Skeleton className="h-8 w-48" />
        </div>

        {/* Profile Card */}
        <div className="glass-card rounded-3xl p-6 space-y-4">
            <div className="flex flex-col md:flex-row gap-6">
                <Skeleton className="w-32 h-32 rounded-full mx-auto md:mx-0" />
                <div className="flex-1 space-y-3">
                    <Skeleton className="h-7 w-48" />
                    <Skeleton className="h-4 w-32" />
                    <div className="flex gap-2">
                        <Skeleton className="h-8 w-24 rounded-lg" />
                        <Skeleton className="h-8 w-24 rounded-lg" />
                    </div>
                </div>
            </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="glass-card rounded-2xl p-4 space-y-2">
                    <Skeleton className="h-8 w-8 rounded-lg" />
                    <Skeleton className="h-6 w-16" />
                    <Skeleton className="h-3 w-20" />
                </div>
            ))}
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="glass-card rounded-2xl p-5 space-y-4">
                <Skeleton className="h-5 w-32" />
                <Skeleton className="h-48 rounded-lg" />
            </div>
            <div className="glass-card rounded-2xl p-5 space-y-4">
                <Skeleton className="h-5 w-32" />
                <Skeleton className="h-48 rounded-lg" />
            </div>
        </div>
    </div>
);

// ============================================
// MASS INPUT PAGE SKELETON
// ============================================
export const MassInputPageSkeleton: React.FC = () => (
    <div className="p-4 md:p-6 space-y-6 animate-fade-in">
        {/* Header */}
        <div className="space-y-2">
            <Skeleton className="h-8 w-48" />
            <Skeleton className="h-4 w-96" />
        </div>

        {/* Filters */}
        <div className="flex flex-col md:flex-row gap-4">
            <Skeleton className="h-12 flex-1 rounded-xl" />
            <Skeleton className="h-12 w-48 rounded-xl" />
            <Skeleton className="h-12 w-48 rounded-xl" />
        </div>

        {/* Data Table */}
        <div className="glass-card rounded-2xl overflow-hidden">
            {/* Table Header */}
            <div className="bg-gray-50 dark:bg-gray-900 p-4 border-b border-gray-200 dark:border-gray-700">
                <div className="grid grid-cols-6 gap-4">
                    {Array.from({ length: 6 }).map((_, i) => (
                        <Skeleton key={i} className="h-4" />
                    ))}
                </div>
            </div>
            {/* Table Rows */}
            <div className="p-4 space-y-3">
                {Array.from({ length: 10 }).map((_, i) => (
                    <div key={i} className="grid grid-cols-6 gap-4 py-2">
                        {Array.from({ length: 6 }).map((_, j) => (
                            <Skeleton key={j} className="h-10 rounded-lg" />
                        ))}
                    </div>
                ))}
            </div>
        </div>
    </div>
);

// Export all skeletons
export default {
    AttendancePageSkeleton,
    SchedulePageSkeleton,
    TasksPageSkeleton,
    SettingsPageSkeleton,
    StudentDetailPageSkeleton,
    MassInputPageSkeleton,
};
