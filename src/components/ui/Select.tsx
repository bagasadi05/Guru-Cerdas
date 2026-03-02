import React from 'react';

export interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  error?: string;
}

export const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  ({ className, children, error, ...props }, ref) => {
    return (
      <div className="w-full">
        <select
          className={`flex h-11 sm:h-10 w-full items-center justify-between rounded-lg border border-slate-300 bg-white dark:border-slate-600 dark:bg-slate-900 py-2 px-4 text-base leading-normal text-slate-900 dark:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:focus-visible:ring-offset-slate-900 disabled:cursor-not-allowed disabled:opacity-50 [&>span]:line-clamp-1 ${error ? 'border-red-500 focus:border-red-500 focus-visible:ring-red-500' : ''} ${className}`}
          ref={ref}
          {...props}
        >
          {children}
        </select>
        {error && <p className="text-red-500 text-xs mt-1">{error}</p>}
      </div>
    );
  }
);
Select.displayName = 'Select';
