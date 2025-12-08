import React from 'react';
import { Skeleton } from '../ui/Skeleton';

// Generic Card Skeleton
export const CardSkeleton: React.FC<{ className?: string }> = ({ className = '' }) => (
    <div className={`glass-card rounded-2xl p-5 space-y-4 ${className}`}>
        <div className="flex items-center gap-3">
            <Skeleton className="w-12 h-12 rounded-xl" />
            <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-3 w-1/2" />
            </div>
        </div>
        <Skeleton className="h-20 w-full rounded-lg" />
        <div className="flex gap-2">
            <Skeleton className="h-8 w-20 rounded-lg" />
            <Skeleton className="h-8 w-20 rounded-lg" />
        </div>
    </div>
);

// Stats Card Skeleton
export const StatsSkeleton: React.FC<{ count?: number }> = ({ count = 4 }) => (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {Array.from({ length: count }).map((_, i) => (
            <div key={i} className="glass-card rounded-2xl p-4 space-y-3">
                <div className="flex items-center justify-between">
                    <Skeleton className="h-10 w-10 rounded-xl" />
                    <Skeleton className="h-4 w-16" />
                </div>
                <Skeleton className="h-8 w-20" />
                <Skeleton className="h-3 w-24" />
            </div>
        ))}
    </div>
);

// Table Skeleton
export const TableSkeleton: React.FC<{ rows?: number; cols?: number }> = ({ rows = 5, cols = 4 }) => (
    <div className="glass-card rounded-2xl overflow-hidden">
        <div className="p-4 border-b border-slate-200 dark:border-slate-800">
            <div className="flex gap-4">
                {Array.from({ length: cols }).map((_, i) => (
                    <Skeleton key={i} className="h-4 flex-1" />
                ))}
            </div>
        </div>
        <div className="p-4 space-y-4">
            {Array.from({ length: rows }).map((_, i) => (
                <div key={i} className="flex gap-4">
                    {Array.from({ length: cols }).map((_, j) => (
                        <Skeleton key={j} className="h-6 flex-1" />
                    ))}
                </div>
            ))}
        </div>
    </div>
);

// List Skeleton
export const ListSkeleton: React.FC<{ count?: number }> = ({ count = 5 }) => (
    <div className="space-y-3">
        {Array.from({ length: count }).map((_, i) => (
            <div key={i} className="glass-card rounded-xl p-4 flex items-center gap-4">
                <Skeleton className="w-12 h-12 rounded-full" />
                <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-1/3" />
                    <Skeleton className="h-3 w-1/2" />
                </div>
                <Skeleton className="w-20 h-8 rounded-lg" />
            </div>
        ))}
    </div>
);

// Chart Skeleton
export const ChartSkeleton: React.FC<{ className?: string }> = ({ className = '' }) => (
    <div className={`glass-card rounded-2xl p-5 ${className}`}>
        <div className="flex items-center justify-between mb-4">
            <Skeleton className="h-5 w-32" />
            <Skeleton className="h-8 w-8 rounded-lg" />
        </div>
        <div className="flex items-end justify-between gap-2 h-40">
            {Array.from({ length: 7 }).map((_, i) => (
                <Skeleton
                    key={i}
                    className="flex-1 rounded-t-md"
                    style={{ height: `${20 + Math.random() * 80}%` }}
                />
            ))}
        </div>
        <div className="flex justify-between mt-3">
            {Array.from({ length: 7 }).map((_, i) => (
                <Skeleton key={i} className="h-3 w-8" />
            ))}
        </div>
    </div>
);

// Form Skeleton
export const FormSkeleton: React.FC<{ fields?: number }> = ({ fields = 4 }) => (
    <div className="space-y-6">
        {Array.from({ length: fields }).map((_, i) => (
            <div key={i} className="space-y-2">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-12 w-full rounded-xl" />
            </div>
        ))}
        <div className="flex gap-3 pt-4">
            <Skeleton className="h-10 w-24 rounded-xl" />
            <Skeleton className="h-10 flex-1 rounded-xl" />
        </div>
    </div>
);

// Calendar Skeleton
export const CalendarSkeleton: React.FC = () => (
    <div className="glass-card rounded-2xl p-5">
        <div className="flex items-center justify-between mb-4">
            <Skeleton className="h-8 w-8 rounded-lg" />
            <Skeleton className="h-5 w-32" />
            <Skeleton className="h-8 w-8 rounded-lg" />
        </div>
        <div className="grid grid-cols-7 gap-2">
            {Array.from({ length: 7 }).map((_, i) => (
                <Skeleton key={i} className="h-4 w-full" />
            ))}
            {Array.from({ length: 35 }).map((_, i) => (
                <Skeleton key={i} className="aspect-square rounded-lg" />
            ))}
        </div>
    </div>
);

// Profile Skeleton
export const ProfileSkeleton: React.FC = () => (
    <div className="flex items-center gap-4">
        <Skeleton className="w-16 h-16 rounded-full" />
        <div className="flex-1 space-y-2">
            <Skeleton className="h-5 w-32" />
            <Skeleton className="h-4 w-48" />
            <Skeleton className="h-3 w-24" />
        </div>
    </div>
);

// Modal Content Skeleton
export const ModalContentSkeleton: React.FC = () => (
    <div className="space-y-4 py-4">
        <div className="flex items-center gap-3">
            <Skeleton className="w-10 h-10 rounded-xl" />
            <Skeleton className="h-6 flex-1" />
        </div>
        <Skeleton className="h-24 w-full rounded-lg" />
        <div className="flex justify-end gap-3">
            <Skeleton className="h-10 w-20 rounded-xl" />
            <Skeleton className="h-10 w-28 rounded-xl" />
        </div>
    </div>
);

// Notification Skeleton
export const NotificationSkeleton: React.FC<{ count?: number }> = ({ count = 3 }) => (
    <div className="space-y-2">
        {Array.from({ length: count }).map((_, i) => (
            <div key={i} className="flex items-start gap-3 p-3">
                <Skeleton className="w-2 h-2 rounded-full mt-2" />
                <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-3/4" />
                    <Skeleton className="h-3 w-full" />
                    <Skeleton className="h-2 w-16" />
                </div>
            </div>
        ))}
    </div>
);

export default {
    CardSkeleton,
    StatsSkeleton,
    TableSkeleton,
    ListSkeleton,
    ChartSkeleton,
    FormSkeleton,
    CalendarSkeleton,
    ProfileSkeleton,
    ModalContentSkeleton,
    NotificationSkeleton,
};
