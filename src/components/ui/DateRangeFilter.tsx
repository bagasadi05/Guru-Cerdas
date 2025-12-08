import React, { useState, useRef, useEffect } from 'react';
import { CalendarIcon, ChevronDownIcon, XIcon } from '../Icons';

interface DateRange {
    startDate: string | null;
    endDate: string | null;
}

interface DateRangeFilterProps {
    value: DateRange;
    onChange: (range: DateRange) => void;
    presets?: boolean;
    className?: string;
}

const PRESETS = [
    {
        label: 'Hari Ini', getValue: () => {
            const today = new Date().toISOString().split('T')[0];
            return { startDate: today, endDate: today };
        }
    },
    {
        label: '7 Hari Terakhir', getValue: () => {
            const end = new Date();
            const start = new Date();
            start.setDate(start.getDate() - 7);
            return { startDate: start.toISOString().split('T')[0], endDate: end.toISOString().split('T')[0] };
        }
    },
    {
        label: '30 Hari Terakhir', getValue: () => {
            const end = new Date();
            const start = new Date();
            start.setDate(start.getDate() - 30);
            return { startDate: start.toISOString().split('T')[0], endDate: end.toISOString().split('T')[0] };
        }
    },
    {
        label: 'Bulan Ini', getValue: () => {
            const now = new Date();
            const start = new Date(now.getFullYear(), now.getMonth(), 1);
            const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
            return { startDate: start.toISOString().split('T')[0], endDate: end.toISOString().split('T')[0] };
        }
    },
    {
        label: 'Bulan Lalu', getValue: () => {
            const now = new Date();
            const start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
            const end = new Date(now.getFullYear(), now.getMonth(), 0);
            return { startDate: start.toISOString().split('T')[0], endDate: end.toISOString().split('T')[0] };
        }
    },
    {
        label: 'Semester 1', getValue: () => {
            const year = new Date().getFullYear();
            return { startDate: `${year}-07-01`, endDate: `${year}-12-31` };
        }
    },
    {
        label: 'Semester 2', getValue: () => {
            const year = new Date().getFullYear();
            return { startDate: `${year}-01-01`, endDate: `${year}-06-30` };
        }
    },
];

export const DateRangeFilter: React.FC<DateRangeFilterProps> = ({
    value,
    onChange,
    presets = true,
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

    const handlePresetClick = (preset: typeof PRESETS[0]) => {
        onChange(preset.getValue());
        setIsOpen(false);
    };

    const handleClear = () => {
        onChange({ startDate: null, endDate: null });
    };

    const formatDateDisplay = () => {
        if (!value.startDate && !value.endDate) return 'Pilih Tanggal';
        if (value.startDate === value.endDate) {
            return new Date(value.startDate!).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
        }
        const start = value.startDate ? new Date(value.startDate).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' }) : '...';
        const end = value.endDate ? new Date(value.endDate).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }) : '...';
        return `${start} - ${end}`;
    };

    const hasValue = value.startDate || value.endDate;

    return (
        <div ref={containerRef} className={`relative ${className}`}>
            {/* Trigger Button */}
            <button
                onClick={() => setIsOpen(!isOpen)}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg border transition-colors ${hasValue
                        ? 'border-indigo-300 dark:border-indigo-700 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-700 dark:text-indigo-300'
                        : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300'
                    } hover:border-indigo-400 dark:hover:border-indigo-600`}
            >
                <CalendarIcon className="w-4 h-4" />
                <span className="text-sm whitespace-nowrap">{formatDateDisplay()}</span>
                {hasValue ? (
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            handleClear();
                        }}
                        className="p-0.5 rounded hover:bg-indigo-200 dark:hover:bg-indigo-800"
                    >
                        <XIcon className="w-3 h-3" />
                    </button>
                ) : (
                    <ChevronDownIcon className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
                )}
            </button>

            {/* Dropdown */}
            {isOpen && (
                <div className="absolute top-full right-0 mt-2 w-72 bg-white dark:bg-gray-900 rounded-xl shadow-xl border border-gray-200 dark:border-gray-700 z-50 animate-fade-in">
                    {/* Presets */}
                    {presets && (
                        <div className="p-2 border-b border-gray-200 dark:border-gray-700">
                            <p className="text-xs font-medium text-gray-500 px-2 mb-1">Preset Cepat</p>
                            <div className="grid grid-cols-2 gap-1">
                                {PRESETS.map((preset) => (
                                    <button
                                        key={preset.label}
                                        onClick={() => handlePresetClick(preset)}
                                        className="px-3 py-1.5 text-sm text-left rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors text-gray-700 dark:text-gray-300"
                                    >
                                        {preset.label}
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Custom Date Range */}
                    <div className="p-3">
                        <p className="text-xs font-medium text-gray-500 mb-2">Range Kustom</p>
                        <div className="grid grid-cols-2 gap-2">
                            <div>
                                <label className="block text-xs text-gray-400 mb-1">Dari</label>
                                <input
                                    type="date"
                                    value={value.startDate || ''}
                                    onChange={(e) => onChange({ ...value, startDate: e.target.value || null })}
                                    className="w-full px-2 py-1.5 text-sm rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                                />
                            </div>
                            <div>
                                <label className="block text-xs text-gray-400 mb-1">Sampai</label>
                                <input
                                    type="date"
                                    value={value.endDate || ''}
                                    onChange={(e) => onChange({ ...value, endDate: e.target.value || null })}
                                    min={value.startDate || undefined}
                                    className="w-full px-2 py-1.5 text-sm rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Apply Button */}
                    <div className="p-3 border-t border-gray-200 dark:border-gray-700 flex gap-2">
                        <button
                            onClick={handleClear}
                            className="flex-1 px-3 py-2 text-sm rounded-lg bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700"
                        >
                            Reset
                        </button>
                        <button
                            onClick={() => setIsOpen(false)}
                            className="flex-1 px-3 py-2 text-sm rounded-lg bg-indigo-600 text-white hover:bg-indigo-700"
                        >
                            Terapkan
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default DateRangeFilter;
