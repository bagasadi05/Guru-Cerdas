import React, { useState, useMemo, useEffect } from 'react';
import { ChevronLeftIcon, ChevronRightIcon } from 'lucide-react';
import { Button } from '../ui/Button';
import { AttendanceStatus } from '../../types';

interface AttendanceRecord {
    date: string;
    status: AttendanceStatus;
}

interface AttendanceCalendarProps {
    records: AttendanceRecord[];
    selectedDate?: string;
    onDateClick?: (date: string) => void;
    onMonthChange?: (date: Date) => void;
    className?: string;
}

const DAYS_OF_WEEK = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'];
const MONTHS = [
    'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
    'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
];

const STATUS_COLORS: Record<AttendanceStatus, string> = {
    [AttendanceStatus.Hadir]: 'bg-green-500',
    [AttendanceStatus.Izin]: 'bg-amber-500',
    [AttendanceStatus.Sakit]: 'bg-blue-500',
    [AttendanceStatus.Alpha]: 'bg-red-500',
    [AttendanceStatus.Libur]: 'bg-purple-500',
};

const STATUS_LABELS: Record<AttendanceStatus, string> = {
    [AttendanceStatus.Hadir]: 'Hadir',
    [AttendanceStatus.Izin]: 'Izin',
    [AttendanceStatus.Sakit]: 'Sakit',
    [AttendanceStatus.Alpha]: 'Alpha',
    [AttendanceStatus.Libur]: 'Libur',
};

export const AttendanceCalendar: React.FC<AttendanceCalendarProps> = ({
    records,
    selectedDate,
    onDateClick,
    onMonthChange,
    className = '',
}) => {
    const [currentDate, setCurrentDate] = useState(() => (
        selectedDate ? new Date(`${selectedDate}T00:00:00`) : new Date()
    ));

    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();

    // Build a map of date -> status for quick lookup
    const recordMap = useMemo(() => {
        const map = new Map<string, AttendanceStatus>();
        records.forEach(r => map.set(r.date, r.status));
        return map;
    }, [records]);

    // Get calendar grid data
    const calendarDays = useMemo(() => {
        const firstDay = new Date(year, month, 1);
        const lastDay = new Date(year, month + 1, 0);
        const daysInMonth = lastDay.getDate();
        const startingDayOfWeek = firstDay.getDay(); // 0 = Sunday

        const days: (number | null)[] = [];

        // Add empty cells for days before the first of the month
        for (let i = 0; i < startingDayOfWeek; i++) {
            days.push(null);
        }

        // Add days of the month
        for (let day = 1; day <= daysInMonth; day++) {
            days.push(day);
        }

        return days;
    }, [year, month]);

    const goToPreviousMonth = () => {
        setCurrentDate(new Date(year, month - 1, 1));
    };

    const goToNextMonth = () => {
        setCurrentDate(new Date(year, month + 1, 1));
    };

    const goToToday = () => {
        setCurrentDate(new Date());
    };

    useEffect(() => {
        onMonthChange?.(currentDate);
    }, [currentDate, onMonthChange]);

    useEffect(() => {
        if (!selectedDate) return;
        const nextDate = new Date(`${selectedDate}T00:00:00`);
        if (nextDate.getFullYear() !== year || nextDate.getMonth() !== month) {
            setCurrentDate(nextDate);
        }
    }, [month, selectedDate, year]);

    const formatDateString = (day: number): string => {
        return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    };

    const isToday = (day: number): boolean => {
        const today = new Date();
        return today.getFullYear() === year && today.getMonth() === month && today.getDate() === day;
    };

    // Calculate monthly stats
    const monthlyStats = useMemo(() => {
        const stats = { Hadir: 0, Izin: 0, Sakit: 0, Alpha: 0, Libur: 0 };
        calendarDays.forEach(day => {
            if (day) {
                const dateStr = formatDateString(day);
                const status = recordMap.get(dateStr);
                if (status) stats[status]++;
            }
        });
        return stats;
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [calendarDays, recordMap, year, month]);

    return (
            <div className={`bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden ${className}`}>
            {/* Header */}
            <div className="p-4 bg-gradient-to-r from-green-500 to-emerald-600">
                <div className="flex items-center justify-between mb-4">
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={goToPreviousMonth}
                        className="text-white hover:bg-white/20"
                        aria-label="Bulan sebelumnya"
                    >
                        <ChevronLeftIcon className="w-5 h-5" />
                    </Button>
                    <div className="text-center">
                        <h3 className="text-lg font-bold text-white">
                            {MONTHS[month]} {year}
                        </h3>
                        <button
                            onClick={goToToday}
                            className="text-xs text-white/70 hover:text-white transition-colors"
                        >
                            Hari ini
                        </button>
                    </div>
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={goToNextMonth}
                        className="text-white hover:bg-white/20"
                        aria-label="Bulan berikutnya"
                    >
                        <ChevronRightIcon className="w-5 h-5" />
                    </Button>
                </div>

                {/* Monthly Stats */}
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                    {Object.entries(monthlyStats).map(([status, count]) => (
                        <div
                            key={status}
                            className="bg-white/10 backdrop-blur-sm rounded-lg p-2 text-center"
                        >
                            <div className="text-lg font-bold text-white">{count}</div>
                            <div className="text-xs text-white/70">{STATUS_LABELS[status as AttendanceStatus]}</div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Calendar Grid */}
            <div className="p-4">
                {/* Day Headers */}
                <div className="grid grid-cols-7 gap-1 mb-2">
                    {DAYS_OF_WEEK.map(day => (
                        <div
                            key={day}
                            className="text-center text-xs font-medium text-slate-500 dark:text-slate-400 py-2"
                        >
                            {day}
                        </div>
                    ))}
                </div>

                {/* Day Cells */}
                <div className="grid grid-cols-7 gap-1">
                    {calendarDays.map((day, index) => {
                        if (day === null) {
                            return <div key={`empty-${index}`} className="aspect-square" />;
                        }

                        const dateStr = formatDateString(day);
                        const status = recordMap.get(dateStr);
                        const today = isToday(day);
                        const isSelected = selectedDate === dateStr;

                        return (
                            <button
                                key={day}
                                onClick={() => onDateClick?.(dateStr)}
                                className={`
                                    aspect-square rounded-lg flex items-center justify-center text-sm font-medium
                                    transition-all hover:scale-105 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2
                                    ${isSelected ? 'ring-2 ring-green-500 ring-offset-2 dark:ring-offset-slate-900' : ''}
                                    ${!isSelected && today ? 'ring-2 ring-emerald-400 ring-offset-2 dark:ring-offset-slate-900' : ''}
                                    ${status
                                        ? `${STATUS_COLORS[status]} text-white shadow-md`
                                        : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
                                    }
                                `}
                                aria-label={`${day} ${MONTHS[month]} ${year}${status ? ` - ${STATUS_LABELS[status]}` : ''}`}
                                aria-current={isSelected ? 'date' : undefined}
                            >
                                {day}
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* Legend */}
            <div className="px-4 pb-4">
                <div className="flex flex-wrap justify-center gap-4 text-xs">
                    {Object.entries(STATUS_LABELS).map(([status, label]) => (
                        <div key={status} className="flex items-center gap-1.5">
                            <div className={`w-3 h-3 rounded-full ${STATUS_COLORS[status as AttendanceStatus]}`} />
                            <span className="text-slate-600 dark:text-slate-400">{label}</span>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default AttendanceCalendar;
