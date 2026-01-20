import React, { useState, useEffect } from 'react';
import { CalendarIcon, ChevronLeftIcon, ChevronRightIcon, XIcon } from 'lucide-react';

interface DatePickerProps {
    value: string;
    onChange: (date: string) => void;
    className?: string;
    placeholder?: string;
    align?: 'left' | 'right';
}

const MONTHS = [
    'Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun',
    'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'
];

export const DatePicker: React.FC<DatePickerProps> = ({
    value,
    onChange,
    className = '',
    placeholder = 'Pilih tanggal',
    align = 'left',
}) => {
    const [isOpen, setIsOpen] = useState(false);
    // Initialize currentMonth based on value or today
    const [currentMonth, setCurrentMonth] = useState(() => {
        return value ? new Date(value) : new Date();
    });

    // Update internal state if value changes externally and is valid
    useEffect(() => {
        if (value) {
            const date = new Date(value);
            if (!isNaN(date.getTime())) {
                setCurrentMonth(date);
            }
        }
    }, [value]);

    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();

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

    const isSelected = (day: number): boolean => {
        return formatDateString(day) === value;
    };

    const isToday = (day: number): boolean => {
        const today = new Date();
        return (
            day === today.getDate() &&
            month === today.getMonth() &&
            year === today.getFullYear()
        );
    };

    const handleDayClick = (day: number) => {
        const date = formatDateString(day);
        onChange(date);
        setIsOpen(false);
    };

    const handleClear = (e: React.MouseEvent) => {
        e.stopPropagation();
        const today = new Date().toISOString().split('T')[0];
        onChange(today);
    };

    const formatDisplayValue = (): string => {
        if (!value) return placeholder;
        return new Date(value).toLocaleDateString('id-ID', {
            weekday: 'short',
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });
    };

    return (
        <div className={`relative ${className}`}>
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="flex items-center gap-2 w-full px-4 py-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl hover:border-amber-500 dark:hover:border-amber-500 transition-colors text-left focus:outline-none focus:ring-2 focus:ring-amber-500/20"
            >
                <CalendarIcon className="w-4 h-4 text-slate-400" />
                <span className={`flex-1 text-sm ${value ? 'text-slate-900 dark:text-white' : 'text-slate-400'}`}>
                    {formatDisplayValue()}
                </span>
                {value && (
                    <div
                        role="button"
                        onClick={handleClear}
                        className="p-1 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-full transition-colors"
                        title="Reset ke hari ini"
                    >
                        <XIcon className="w-3 h-3 text-slate-400" />
                    </div>
                )}
            </button>

            {isOpen && (
                <>
                    <div
                        className="fixed inset-0 z-40"
                        onClick={() => setIsOpen(false)}
                    />
                    <div className={`absolute top-full mt-2 z-50 bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-800 overflow-hidden animate-in fade-in zoom-in-95 duration-200 p-4 min-w-[300px] ${align === 'right' ? 'right-0' : 'left-0'}`}>

                        {/* Header */}
                        <div className="flex items-center justify-between mb-4">
                            <button
                                onClick={() => setCurrentMonth(new Date(year, month - 1, 1))}
                                className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-slate-600 dark:text-slate-400"
                            >
                                <ChevronLeftIcon className="w-4 h-4" />
                            </button>
                            <span className="font-semibold text-slate-900 dark:text-white">
                                {MONTHS[month]} {year}
                            </span>
                            <button
                                onClick={() => setCurrentMonth(new Date(year, month + 1, 1))}
                                className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-slate-600 dark:text-slate-400"
                            >
                                <ChevronRightIcon className="w-4 h-4" />
                            </button>
                        </div>

                        {/* Days Header */}
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
                                    <div key={`empty-${index}`} />
                                ) : (
                                    <button
                                        key={day}
                                        onClick={() => handleDayClick(day)}
                                        className={`
                                            w-8 h-8 rounded-lg text-sm font-medium transition-all mx-auto flex items-center justify-center
                                            ${isSelected(day)
                                                ? 'bg-amber-500 text-white shadow-md shadow-amber-500/20'
                                                : isToday(day)
                                                    ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 font-bold'
                                                    : 'hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300'
                                            }
                                        `}
                                    >
                                        {day}
                                    </button>
                                )
                            ))}
                        </div>

                        <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800">
                            <button
                                onClick={() => {
                                    const today = new Date();
                                    onChange(today.toISOString().split('T')[0]);
                                    setIsOpen(false);
                                }}
                                className="w-full py-2 text-xs font-medium text-slate-500 hover:text-amber-600 dark:text-slate-400 dark:hover:text-amber-400 transition-colors bg-slate-50 dark:bg-slate-800/50 rounded-lg hover:bg-amber-50 dark:hover:bg-amber-900/20"
                            >
                                Hari Ini
                            </button>
                        </div>
                    </div>
                </>
            )}
        </div>
    );
};
