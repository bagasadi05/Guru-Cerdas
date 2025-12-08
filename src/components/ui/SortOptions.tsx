import React, { useState, useRef, useEffect } from 'react';
import { ArrowUpIcon, ArrowDownIcon, ChevronDownIcon } from 'lucide-react';

interface SortOption {
    value: string;
    label: string;
}

interface SortConfig {
    field: string;
    direction: 'asc' | 'desc';
}

interface SortOptionsProps {
    options: SortOption[];
    value: SortConfig;
    onChange: (config: SortConfig) => void;
    className?: string;
}

export const SortOptions: React.FC<SortOptionsProps> = ({
    options,
    value,
    onChange,
    className = ''
}) => {
    const [isOpen, setIsOpen] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);

    // Close when clicking outside
    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
                setIsOpen(false);
            }
        };

        if (isOpen) {
            document.addEventListener('mousedown', handleClickOutside);
        }
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [isOpen]);

    const handleFieldChange = (field: string) => {
        if (field === value.field) {
            // Toggle direction if same field
            onChange({ ...value, direction: value.direction === 'asc' ? 'desc' : 'asc' });
        } else {
            // New field, default to desc
            onChange({ field, direction: 'desc' });
        }
        setIsOpen(false);
    };

    const handleDirectionToggle = () => {
        onChange({ ...value, direction: value.direction === 'asc' ? 'desc' : 'asc' });
    };

    const currentLabel = options.find(o => o.value === value.field)?.label || 'Urutkan';

    return (
        <div ref={containerRef} className={`relative ${className}`}>
            {/* Trigger Button */}
            <div className="flex items-center">
                <button
                    onClick={() => setIsOpen(!isOpen)}
                    className="flex items-center gap-2 px-3 py-2 rounded-l-lg border border-r-0 border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-750 transition-colors"
                >
                    <span className="text-sm whitespace-nowrap">{currentLabel}</span>
                    <ChevronDownIcon className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
                </button>
                <button
                    onClick={handleDirectionToggle}
                    className="flex items-center justify-center w-9 h-9 rounded-r-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-750 transition-colors"
                    title={value.direction === 'asc' ? 'Ascending (A-Z, 0-9)' : 'Descending (Z-A, 9-0)'}
                >
                    {value.direction === 'asc' ? (
                        <ArrowUpIcon className="w-4 h-4" />
                    ) : (
                        <ArrowDownIcon className="w-4 h-4" />
                    )}
                </button>
            </div>

            {/* Dropdown */}
            {isOpen && (
                <div className="absolute top-full left-0 mt-2 w-48 bg-white dark:bg-gray-900 rounded-xl shadow-xl border border-gray-200 dark:border-gray-700 z-50 py-1 animate-fade-in">
                    {options.map((option) => (
                        <button
                            key={option.value}
                            onClick={() => handleFieldChange(option.value)}
                            className={`w-full flex items-center justify-between px-4 py-2 text-sm text-left transition-colors ${value.field === option.value
                                    ? 'bg-indigo-50 dark:bg-indigo-900/20 text-indigo-700 dark:text-indigo-300'
                                    : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800'
                                }`}
                        >
                            <span>{option.label}</span>
                            {value.field === option.value && (
                                value.direction === 'asc' ? (
                                    <ArrowUpIcon className="w-4 h-4" />
                                ) : (
                                    <ArrowDownIcon className="w-4 h-4" />
                                )
                            )}
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
};

// Helper function to sort data
export const sortData = <T,>(data: T[], config: SortConfig, getField: (item: T) => any): T[] => {
    return [...data].sort((a, b) => {
        const aVal = getField(a);
        const bVal = getField(b);

        // Handle null/undefined
        if (aVal == null && bVal == null) return 0;
        if (aVal == null) return config.direction === 'asc' ? -1 : 1;
        if (bVal == null) return config.direction === 'asc' ? 1 : -1;

        // Compare
        let comparison = 0;
        if (typeof aVal === 'string' && typeof bVal === 'string') {
            comparison = aVal.localeCompare(bVal, 'id-ID');
        } else if (typeof aVal === 'number' && typeof bVal === 'number') {
            comparison = aVal - bVal;
        } else if (aVal instanceof Date && bVal instanceof Date) {
            comparison = aVal.getTime() - bVal.getTime();
        } else {
            comparison = String(aVal).localeCompare(String(bVal));
        }

        return config.direction === 'asc' ? comparison : -comparison;
    });
};

export default SortOptions;
