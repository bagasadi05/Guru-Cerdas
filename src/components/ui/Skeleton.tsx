import React from 'react';

interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  className?: string;
}

export const Skeleton: React.FC<SkeletonProps> = ({ className, ...props }) => {
  return (
    <div
      className={`skeleton-shimmer rounded-md bg-slate-200 dark:bg-slate-700/60 ${className}`}
      {...props}
    />
  );
};
