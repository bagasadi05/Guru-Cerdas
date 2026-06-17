import React from 'react';

export type CheckboxProps = Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type'>;

export const Checkbox = React.forwardRef<HTMLInputElement, CheckboxProps>(
  ({ className, ...props }, ref) => {
    return (
      <input
        type="checkbox"
        ref={ref}
        className={`h-5 w-5 shrink-0 rounded-md border-slate-300 text-emerald-600 focus:ring-emerald-500 dark:border-slate-600 dark:bg-slate-900 dark:ring-offset-slate-950 dark:focus:ring-emerald-400 dark:checked:bg-emerald-500 dark:checked:border-emerald-500 transition duration-150 ease-in-out ${className}`}
        {...props}
      />
    );
  }
);
Checkbox.displayName = 'Checkbox';
