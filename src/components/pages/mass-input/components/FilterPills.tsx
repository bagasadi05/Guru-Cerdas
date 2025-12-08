import React from 'react';
import { StudentFilter } from '../types';

export const FilterPills: React.FC<{
    options: { value: StudentFilter; label: string }[];
    currentValue: StudentFilter;
    onFilterChange: (value: StudentFilter) => void;
}> = ({ options, currentValue, onFilterChange }) => (
    <div className="flex items-center gap-2">
        {options.map(({ value, label }) => (
            <button
                key={value}
                onClick={() => onFilterChange(value)}
                className={`px-3 py-1 text-xs font-semibold rounded-full transition-colors ${currentValue === value
                    ? 'bg-purple-500 text-white'
                    : 'bg-white/10 text-gray-300 hover:bg-white/20'
                    }`}
            >
                {label}
            </button>
        ))}
    </div>
);
