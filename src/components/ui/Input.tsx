import React from 'react';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  error?: string;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, error, ...props }, ref) => {
    return (
      <div className="w-full">
        {/* Enhanced accessibility: focus-visible for keyboard navigation */}
        <input
          className={`flex h-11 sm:h-10 w-full rounded-lg border border-slate-300 bg-white dark:border-slate-600 dark:bg-slate-900 py-3 sm:py-2.5 px-4 text-base text-slate-900 dark:text-white placeholder:text-slate-500 placeholder:text-sm focus:outline-none focus:border-indigo-500 focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:focus-visible:ring-offset-slate-900 disabled:cursor-not-allowed disabled:opacity-50 transition-colors ${error ? 'border-rose-500 focus:border-rose-500 focus-visible:ring-rose-500' : ''} ${className}`}
          ref={ref}
          aria-invalid={!!error}
          aria-describedby={error ? `${props.id}-error` : undefined}
          {...props}
        />
        {error && <p id={`${props.id}-error`} className="text-rose-500 text-xs mt-1" role="alert">{error}</p>}
      </div>
    );
  }
);
Input.displayName = 'Input';
