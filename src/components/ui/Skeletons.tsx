/**
 * Skeleton Components Library
 * Reusable skeleton loaders for better perceived performance
 */

import React from 'react';

interface SkeletonProps {
  className?: string;
  animate?: boolean;
  style?: React.CSSProperties;
}

/**
 * Base Skeleton Component
 * Generic skeleton with pulsing animation
 */
export const Skeleton: React.FC<SkeletonProps> = ({ 
  className = '', 
  animate = true,
  style,
}) => {
  return (
    <div 
      className={`bg-slate-200 dark:bg-slate-700/60 rounded-md ${
        animate ? 'skeleton-shimmer' : ''
      } ${className}`}
      style={style}
      role="status"
      aria-label="Loading..."
    />
  );
};

/**
 * Card Skeleton
 * For loading card-based layouts
 */
export const CardSkeleton: React.FC<{ rows?: number }> = ({ rows = 3 }) => {
  return (
    <div className="glass-card rounded-xl p-6 space-y-4">
      <div className="flex items-center gap-4">
        <Skeleton className="w-12 h-12 rounded-full flex-shrink-0" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-5 w-3/4" />
          <Skeleton className="h-4 w-1/2" />
        </div>
      </div>
      <div className="space-y-3">
        {Array.from({ length: rows }).map((_, index) => (
          <Skeleton key={index} className="h-4 w-full" />
        ))}
      </div>
    </div>
  );
};

/**
 * Table Skeleton
 * For loading table/list views
 */
export const TableSkeleton: React.FC<{ rows?: number; columns?: number }> = ({ 
  rows = 5, 
  columns = 4 
}) => {
  return (
    <div className="space-y-3">
      {/* Table Header */}
      <div className="flex gap-4 px-4 py-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
        {Array.from({ length: columns }).map((_, index) => (
          <Skeleton key={`header-${index}`} className="h-5 flex-1" />
        ))}
      </div>
      
      {/* Table Rows */}
      {Array.from({ length: rows }).map((_, rowIndex) => (
        <div key={`row-${rowIndex}`} className="flex gap-4 px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-800/30 rounded-lg transition-colors">
          {Array.from({ length: columns }).map((_, colIndex) => (
            <Skeleton 
              key={`cell-${rowIndex}-${colIndex}`} 
              className={`h-6 ${colIndex === 0 ? 'w-16' : 'flex-1'}`}
            />
          ))}
        </div>
      ))}
    </div>
  );
};

/**
 * Chart Skeleton
 * For loading chart visualizations
 */
export const ChartSkeleton: React.FC<{ type?: 'bar' | 'line' | 'pie' }> = ({ 
  type = 'bar' 
}) => {
  const barHeights = React.useMemo(() => {
    const count = type === 'line' ? 8 : 6;
    const seed = type === 'line' ? 17 : 11;
    return Array.from({ length: count }, (_, index) => {
      const base = 40;
      const range = 60;
      const value = (index * 23 + seed * 7) % range;
      return base + value;
    });
  }, [type]);

  if (type === 'pie') {
    return (
      <div className="flex items-center justify-center gap-8 py-8">
        <Skeleton className="w-48 h-48 rounded-full" />
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, index) => (
            <div key={index} className="flex items-center gap-3">
              <Skeleton className="w-4 h-4 rounded" />
              <Skeleton className="h-4 w-32" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 py-8">
      {/* Chart Title */}
      <Skeleton className="h-6 w-48 mx-auto" />
      
      {/* Chart Area */}
      <div className="flex items-end gap-2 justify-between h-48 px-4">
        {barHeights.map((height, index) => (
          <Skeleton 
            key={index} 
            className="flex-1"
            style={{ 
              height: `${height}%`,
              maxWidth: type === 'bar' ? '60px' : '100%'
            }}
          />
        ))}
      </div>
      
      {/* Legend */}
      <div className="flex items-center justify-center gap-6 pt-4">
        {Array.from({ length: 3 }).map((_, index) => (
          <div key={index} className="flex items-center gap-2">
            <Skeleton className="w-4 h-4 rounded" />
            <Skeleton className="h-4 w-20" />
          </div>
        ))}
      </div>
    </div>
  );
};

/**
 * List Skeleton
 * For loading list items
 */
export const ListSkeleton: React.FC<{ items?: number; withAvatar?: boolean }> = ({ 
  items = 5,
  withAvatar = true
}) => {
  return (
    <div className="space-y-3">
      {Array.from({ length: items }).map((_, index) => (
        <div key={index} className="flex items-center gap-4 p-4 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800/30">
          {withAvatar && (
            <Skeleton className="w-10 h-10 rounded-full flex-shrink-0" />
          )}
          <div className="flex-1 space-y-2">
            <Skeleton className="h-5 w-3/4" />
            <Skeleton className="h-4 w-1/2" />
          </div>
          <Skeleton className="w-20 h-8 rounded-lg" />
        </div>
      ))}
    </div>
  );
};

/**
 * Dashboard Stats Skeleton
 * For loading dashboard statistics cards
 */
export const DashboardStatsSkeleton: React.FC<{ cards?: number }> = ({ cards = 4 }) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {Array.from({ length: cards }).map((_, index) => (
        <div key={index} className="glass-card rounded-xl p-6 space-y-4">
          <div className="flex items-center justify-between">
            <Skeleton className="w-12 h-12 rounded-lg" />
            <Skeleton className="w-16 h-6 rounded-full" />
          </div>
          <div className="space-y-2">
            <Skeleton className="h-8 w-24" />
            <Skeleton className="h-4 w-full" />
          </div>
        </div>
      ))}
    </div>
  );
};

/**
 * Form Skeleton
 * For loading form fields
 */
export const FormSkeleton: React.FC<{ fields?: number }> = ({ fields = 4 }) => {
  return (
    <div className="space-y-6">
      {Array.from({ length: fields }).map((_, index) => (
        <div key={index} className="space-y-2">
          <Skeleton className="h-5 w-32" />
          <Skeleton className="h-12 w-full rounded-lg" />
        </div>
      ))}
      <div className="flex gap-3 pt-4">
        <Skeleton className="h-12 w-32 rounded-lg" />
        <Skeleton className="h-12 w-32 rounded-lg" />
      </div>
    </div>
  );
};

/**
 * Profile Skeleton
 * For loading user profiles
 */
export const ProfileSkeleton: React.FC = () => {
  return (
    <div className="glass-card rounded-xl p-8 space-y-6">
      {/* Avatar & Basic Info */}
      <div className="flex flex-col sm:flex-row items-center gap-6">
        <Skeleton className="w-32 h-32 rounded-full" />
        <div className="flex-1 space-y-3 text-center sm:text-left w-full">
          <Skeleton className="h-8 w-48 mx-auto sm:mx-0" />
          <Skeleton className="h-5 w-64 mx-auto sm:mx-0" />
          <Skeleton className="h-4 w-32 mx-auto sm:mx-0" />
        </div>
      </div>
      
      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 py-6 border-t border-b border-gray-200 dark:border-gray-700">
        {Array.from({ length: 3 }).map((_, index) => (
          <div key={index} className="text-center space-y-2">
            <Skeleton className="h-8 w-16 mx-auto" />
            <Skeleton className="h-4 w-20 mx-auto" />
          </div>
        ))}
      </div>
      
      {/* Details */}
      <div className="space-y-4">
        {Array.from({ length: 5 }).map((_, index) => (
          <div key={index} className="flex items-center gap-4">
            <Skeleton className="w-5 h-5 rounded" />
            <div className="flex-1 space-y-1">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-5 w-full" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

/**
 * Calendar Skeleton
 * For loading calendar views
 */
export const CalendarSkeleton: React.FC = () => {
  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <Skeleton className="h-8 w-48" />
        <div className="flex gap-2">
          <Skeleton className="w-10 h-10 rounded-lg" />
          <Skeleton className="w-10 h-10 rounded-lg" />
        </div>
      </div>
      
      {/* Days of Week */}
      <div className="grid grid-cols-7 gap-2">
        {Array.from({ length: 7 }).map((_, index) => (
          <Skeleton key={`day-${index}`} className="h-10" />
        ))}
      </div>
      
      {/* Calendar Grid */}
      <div className="grid grid-cols-7 gap-2">
        {Array.from({ length: 35 }).map((_, index) => (
          <Skeleton key={`date-${index}`} className="h-16 rounded-lg" />
        ))}
      </div>
    </div>
  );
};

/**
 * Page Loading Skeleton
 * Full page loading state
 */
export const PageLoadingSkeleton: React.FC<{ type?: 'dashboard' | 'list' | 'form' | 'profile' }> = ({ 
  type = 'dashboard' 
}) => {
  const renderContent = () => {
    switch (type) {
      case 'dashboard':
        return (
          <>
            <DashboardStatsSkeleton />
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
              <ChartSkeleton type="bar" />
              <ChartSkeleton type="line" />
            </div>
          </>
        );
      case 'list':
        return <ListSkeleton items={8} />;
      case 'form':
        return <FormSkeleton fields={6} />;
      case 'profile':
        return <ProfileSkeleton />;
      default:
        return <CardSkeleton rows={5} />;
    }
  };

  return (
    <div className="animate-fadeIn space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-5 w-96" />
        </div>
        <Skeleton className="h-12 w-32 rounded-lg" />
      </div>
      
      {/* Content */}
      {renderContent()}
    </div>
  );
};

export default {
  Skeleton,
  CardSkeleton,
  TableSkeleton,
  ChartSkeleton,
  ListSkeleton,
  DashboardStatsSkeleton,
  FormSkeleton,
  ProfileSkeleton,
  CalendarSkeleton,
  PageLoadingSkeleton,
};
