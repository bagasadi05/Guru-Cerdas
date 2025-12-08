import React, { useState } from 'react';
import { CalendarIcon, ChevronLeftIcon, ChevronRightIcon, XIcon } from 'lucide-react';
import { Button } from './Button';

interface DateRange {
    start: string | null;
    end: string | null;
}

interface DateRangePickerProps {
    value: DateRange;
    onChange: (range: DateRange) => void;
    className?: string;
    placeholder?: string;
}

const MONTHS = [
    'Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun',
    'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'
];

const PRESETS = [
    {
        label: 'Hari ini', getDates: () => {
            const today = new Date().toISOString().slice(0, 10);
            return { start: today, end: today };
        }
    },
    {
        label: '7 hari terakhir', getDates: () => {
            const end = new Date();
            const start = new Date(end.getTime() - 6 * 24 * 60 * 60 * 1000);
            return { start: start.toISOString().slice(0, 10), end: end.toISOString().slice(0, 10) };
        }
    },
    {
        label: '30 hari terakhir', getDates: () => {
            const end = new Date();
            const start = new Date(end.getTime() - 29 * 24 * 60 * 60 * 1000);
            return { start: start.toISOString().slice(0, 10), end: end.toISOString().slice(0, 10) };
        }
    },
    {
        label: 'Bulan ini', getDates: () => {
            const now = new Date();
            const start = new Date(now.getFullYear(), now.getMonth(), 1);
            const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
            return { start: start.toISOString().slice(0, 10), end: end.toISOString().slice(0, 10) };
        }
    },
    {
        label: 'Bulan lalu', getDates: () => {
            const now = new Date();
            const start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
            const end = new Date(now.getFullYear(), now.getMonth(), 0);
            return { start: start.toISOString().slice(0, 10), end: end.toISOString().slice(0, 10) };
        }
    },
];

export const DateRangePicker: React.FC<DateRangePickerProps> = ({
    value,
    onChange,
    className = '',
    placeholder = 'Pilih rentang tanggal',
}) => {
    const [isOpen, setIsOpen] = useState(false);
    const [currentMonth, setCurrentMonth] = useState(new Date());
    const [selectingStart, setSelectingStart] = useState(true);

    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();

    // Get calendar grid
    const getCalendarDays = () => {
        const firstDay = new Date(year, month, 1);
        const lastDay = new Date(year, month + 1, 0);
        const daysInMonth = lastDay.getDate();
        const startingDayOfWeek = firstDay.getDay();

        const days: (number | null)[] = [];
        for (let i = 0; i < startingDayOfWeek; i++) days.push(null);
        for (let day = 1; day <= daysInMonth; day++) days.push(day);
        return days;
    };

    const formatDateString = (day: number): string => {
        return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    };

    const isInRange = (day: number): boolean => {
        if (!value.start || !value.end) return false;
        const date = formatDateString(day);
        return date >= value.start && date <= value.end;
    };

    const isStartDate = (day: number): boolean => {
        return formatDateString(day) === value.start;
    };

    const isEndDate = (day: number): boolean => {
        return formatDateString(day) === value.end;
    };

    const handleDayClick = (day: number) => {
        const date = formatDateString(day);

        if (selectingStart) {
            onChange({ start: date, end: null });
            setSelectingStart(false);
        } else {
            if (value.start && date < value.start) {
                onChange({ start: date, end: value.start });
            } else {
                onChange({ ...value, end: date });
            }
            setSelectingStart(true);
            setIsOpen(false);
        }
    };

    const handlePresetClick = (preset: typeof PRESETS[0]) => {
        onChange(preset.getDates());
        setIsOpen(false);
    };

    const handleClear = () => {
        onChange({ start: null, end: null });
        setSelectingStart(true);
    };

    const formatDisplayValue = (): string => {
        if (!value.start) return placeholder;
        if (!value.end) return new Date(value.start).toLocaleDateString('id-ID');
        return `${new Date(value.start).toLocaleDateString('id-ID')} - ${new Date(value.end).toLocaleDateString('id-ID')}`;
    };

    return (
        <div className={`relative ${className}`}>
            {/* Trigger Button */}
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="flex items-center gap-2 w-full px-4 py-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl hover:border-indigo-300 dark:hover:border-indigo-600 transition-colors text-left"
            >
                <CalendarIcon className="w-4 h-4 text-slate-400" />
                <span className={`flex-1 text-sm ${value.start ? 'text-slate-900 dark:text-white' : 'text-slate-400'}`}>
                    {formatDisplayValue()}
                </span>
                {value.start && (
                    <button
                        onClick={(e) => { e.stopPropagation(); handleClear(); }}
                        className="p-1 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-full"
                    >
                        <XIcon className="w-3 h-3 text-slate-400" />
                    </button>
                )}
            </button>

            {/* Dropdown */}
            {isOpen && (
                <>
                    <div
                        className="fixed inset-0 z-40"
                        onClick={() => setIsOpen(false)}
                    />
                    <div className="absolute top-full left-0 mt-2 z-50 bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden animate-fade-in-up">
                        <div className="flex">
                            {/* Presets */}
                            <div className="p-3 border-r border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50">
                                <p className="text-xs font-medium text-slate-500 mb-2 px-2">Preset</p>
                                <div className="space-y-1">
                                    {PRESETS.map((preset) => (
                                        <button
                                            key={preset.label}
                                            onClick={() => handlePresetClick(preset)}
                                            className="w-full text-left px-3 py-2 text-sm rounded-lg hover:bg-indigo-50 dark:hover:bg-indigo-900/20 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors whitespace-nowrap"
                                        >
                                            {preset.label}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Calendar */}
                            <div className="p-4">
                                {/* Month Navigation */}
                                <div className="flex items-center justify-between mb-4">
                                    <button
                                        onClick={() => setCurrentMonth(new Date(year, month - 1, 1))}
                                        className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg"
                                    >
                                        <ChevronLeftIcon className="w-4 h-4" />
                                    </button>
                                    <span className="font-medium text-slate-900 dark:text-white">
                                        {MONTHS[month]} {year}
                                    </span>
                                    <button
                                        onClick={() => setCurrentMonth(new Date(year, month + 1, 1))}
                                        className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg"
                                    >
                                        <ChevronRightIcon className="w-4 h-4" />
                                    </button>
                                </div>

                                {/* Day Headers */}
                                <div className="grid grid-cols-7 gap-1 mb-2">
                                    {['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'].map(day => (
                                        <div key={day} className="text-center text-xs font-medium text-slate-400 py-1">
                                            {day}
                                        </div>
                                    ))}
                                </div>

                                {/* Days Grid */}
                                <div className="grid grid-cols-7 gap-1">
                                    {getCalendarDays().map((day, index) => (
                                        day === null ? (
                                            <div key={`empty-${index}`} className="w-8 h-8" />
                                        ) : (
                                            <button
                                                key={day}
                                                onClick={() => handleDayClick(day)}
                                                className={`
                                                    w-8 h-8 rounded-lg text-sm font-medium transition-all
                                                    ${isStartDate(day) || isEndDate(day)
                                                        ? 'bg-indigo-600 text-white'
                                                        : isInRange(day)
                                                            ? 'bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600'
                                                            : 'hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300'
                                                    }
                                                `}
                                            >
                                                {day}
                                            </button>
                                        )
                                    ))}
                                </div>

                                {/* Selection Status */}
                                <div className="mt-3 pt-3 border-t border-slate-200 dark:border-slate-800">
                                    <p className="text-xs text-slate-500 text-center">
                                        {selectingStart ? 'Pilih tanggal mulai' : 'Pilih tanggal akhir'}
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                </>
            )}
        </div>
    );
};

export default DateRangePicker;
