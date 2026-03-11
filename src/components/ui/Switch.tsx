import React from 'react';

export type SwitchProps = React.InputHTMLAttributes<HTMLInputElement>;

export const Switch = React.forwardRef<HTMLInputElement, SwitchProps>(
  ({ className, ...props }, ref) => {
    return (
      <label className={`relative inline-flex items-center cursor-pointer${className ? ` ${className}` : ''}`}>
        <input type="checkbox" className="sr-only peer" ref={ref} {...props} />
        <div className="w-11 h-6 bg-slate-200 dark:bg-slate-700 rounded-full peer peer-focus:ring-2 peer-focus:ring-indigo-500/50 dark:peer-focus:ring-indigo-800/50 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-slate-600 peer-checked:bg-indigo-600"></div>
      </label>
    );
  }
);
Switch.displayName = 'Switch';
