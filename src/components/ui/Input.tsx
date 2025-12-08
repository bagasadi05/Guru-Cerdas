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
          className={`flex h-10 w-full rounded-md border border-gray-300 bg-transparent dark:border-gray-600 dark:bg-black/20 dark:placeholder:text-gray-400 dark:focus:bg-black/30 py-2 px-3 text-sm text-gray-900 dark:text-white placeholder:text-gray-400 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-gray-950 disabled:cursor-not-allowed disabled:opacity-50 transition-shadow ${error ? 'border-red-500 focus:border-red-500 focus-visible:ring-red-500' : ''} ${className}`}
          ref={ref}
          aria-invalid={!!error}
          aria-describedby={error ? `${props.id}-error` : undefined}
          {...props}
        />
        {error && <p id={`${props.id}-error`} className="text-red-500 text-xs mt-1" role="alert">{error}</p>}
      </div>
    );
  }
);
Input.displayName = 'Input';