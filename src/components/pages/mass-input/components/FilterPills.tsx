import React from 'react';
import { StudentFilter } from '../types';

export const FilterPills: React.FC<{
    options: { value: StudentFilter; label: string }[];
    currentValue: StudentFilter;
    onFilterChange: (value: StudentFilter) => void;
}> = ({ options, currentValue, onFilterChange }) => (
    <div className="flex items-center gap-1.5 sm:gap-2 flex-nowrap min-w-max">
        {options.map(({ value, label }) => (
            <button type="button"
                key={value}
                onClick={() => onFilterChange(value)}
                aria-pressed={currentValue === value}
                className={`min-h-[44px] px-3.5 sm:px-4 py-2 text-xs sm:text-sm font-semibold rounded-full transition-colors whitespace-nowrap cursor-pointer active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-slate-900 ${currentValue === value
                    ? 'bg-brand-600 text-white'
                    : 'bg-slate-100 dark:bg-white/10 text-slate-700 dark:text-gray-300 hover:bg-slate-200 dark:hover:bg-white/20'
                    }`}
            >
                {label}
            </button>
        ))}
    </div>
);
