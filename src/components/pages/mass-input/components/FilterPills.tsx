import React from 'react';
import { StudentFilter } from '../types';

export const FilterPills: React.FC<{
    options: { value: StudentFilter; label: string }[];
    currentValue: StudentFilter;
    onFilterChange: (value: StudentFilter) => void;
}> = ({ options, currentValue, onFilterChange }) => (
    <div className="flex items-center gap-1.5 sm:gap-2 flex-nowrap min-w-max">
        {options.map(({ value, label }) => (
            <button
                key={value}
                onClick={() => onFilterChange(value)}
                className={`px-2.5 sm:px-3 py-1 sm:py-1.5 text-xs font-semibold rounded-full transition-colors whitespace-nowrap ${currentValue === value
                    ? 'bg-purple-500 text-white'
                    : 'bg-slate-100 dark:bg-white/10 text-slate-700 dark:text-gray-300 hover:bg-slate-200 dark:hover:bg-white/20'
                    }`}
            >
                {label}
            </button>
        ))}
    </div>
);
