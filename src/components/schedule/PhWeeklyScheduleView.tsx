import React, { useState, useMemo } from 'react';
import {
    ChevronLeft,
    ChevronRight,
    Calendar,
    Plus,
    Clock,
    MoreVertical,
    Edit3,
    Copy,
    Trash2,
    CalendarCheck,
    ClipboardPen,
} from 'lucide-react';
import { Button } from '../ui/Button';
import { DropdownMenu, DropdownTrigger, DropdownContent, DropdownItem } from '../ui/DropdownMenu';
import { PhScheduleEngine } from './engine/PhScheduleEngine';
import { getColorForSubject } from '../../utils/scheduleUtils';
import type { PhScheduleRow } from '../../types';

interface PhWeeklyScheduleViewProps {
    schedules: PhScheduleRow[];
    canManage: boolean;
    onAdd: (initialDate?: string) => void;
    onEdit: (item: PhScheduleRow) => void;
    onDuplicate: (item: PhScheduleRow) => void;
    onDelete: (item: PhScheduleRow) => void;
    onInputNilai: (item: PhScheduleRow) => void;
}

export const PhWeeklyScheduleView: React.FC<PhWeeklyScheduleViewProps> = ({
    schedules,
    canManage,
    onAdd,
    onEdit,
    onDuplicate,
    onDelete,
    onInputNilai,
}) => {
    const [weekOffset, setWeekOffset] = useState<number>(0);

    const weekDays = useMemo(() => {
        return PhScheduleEngine.getSchoolWeekDays(new Date(), weekOffset);
    }, [weekOffset]);

    const weekRangeLabel = useMemo(() => {
        if (weekDays.length === 0) return '';
        return PhScheduleEngine.formatWeekRangeLabel(weekDays[0].rawDate, weekDays[4].rawDate);
    }, [weekDays]);

    const itemsByDate = useMemo(() => {
        const map = new Map<string, PhScheduleRow[]>();
        weekDays.forEach((d) => map.set(d.dateStr, []));

        schedules.forEach((item) => {
            if (map.has(item.date)) {
                map.get(item.date)!.push(item);
            }
        });

        // Sort each day's items by period_label
        map.forEach((items) => {
            items.sort((a, b) => (a.period_label || '').localeCompare(b.period_label || ''));
        });

        return map;
    }, [weekDays, schedules]);

    const totalWeeklyPh = useMemo(() => {
        let count = 0;
        itemsByDate.forEach((items) => {
            count += items.length;
        });
        return count;
    }, [itemsByDate]);

    return (
        <div className="space-y-4 animate-fade-in">
            {/* Week Navigation Controls */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white/95 dark:bg-[#111c2e]/90 backdrop-blur-md rounded-2xl border border-slate-200/80 dark:border-[#1c2b44] p-3 sm:px-4 shadow-sm">
                <div className="flex items-center gap-2">
                    <div className="w-9 h-9 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200/80 dark:border-emerald-800/60 flex items-center justify-center text-emerald-600 dark:text-[#00d284] shrink-0">
                        <Calendar className="w-4 h-4" />
                    </div>
                    <div>
                        <div className="flex items-center gap-2">
                            <span className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white">
                                {weekRangeLabel}
                            </span>
                            <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200/60 dark:border-slate-700/60">
                                {totalWeeklyPh} PH Terjadwal
                            </span>
                        </div>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400">
                            Jadwal Penilaian Harian (Senin – Jumat)
                        </p>
                    </div>
                </div>

                {/* Week Pager Buttons */}
                <div className="flex items-center gap-1.5 self-start sm:self-auto w-full sm:w-auto justify-end">
                    <button
                        type="button"
                        onClick={() => setWeekOffset((prev) => prev - 1)}
                        className="min-h-[40px] sm:min-h-[34px] px-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/80 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 hover:text-slate-900 dark:hover:text-white transition-all flex items-center gap-1.5 text-xs sm:text-sm font-semibold cursor-pointer active:scale-95"
                        title="Minggu Sebelumnya"
                        aria-label="Minggu Sebelumnya"
                    >
                        <ChevronLeft className="w-4 h-4 shrink-0" />
                        <span className="hidden md:inline">Sebelumnya</span>
                    </button>

                    <button
                        type="button"
                        onClick={() => setWeekOffset(0)}
                        className={`min-h-[40px] sm:min-h-[34px] px-3.5 rounded-xl border text-xs sm:text-sm font-semibold transition-all cursor-pointer active:scale-95 ${
                            weekOffset === 0
                                ? 'bg-emerald-50 dark:bg-emerald-950/60 border-emerald-300 dark:border-emerald-700 text-emerald-700 dark:text-[#00d284] font-bold shadow-sm'
                                : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/80 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700'
                        }`}
                        title="Kembali ke Minggu Ini"
                        aria-label="Minggu Ini"
                    >
                        Minggu Ini
                    </button>

                    <button
                        type="button"
                        onClick={() => setWeekOffset((prev) => prev + 1)}
                        className="min-h-[40px] sm:min-h-[34px] px-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/80 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 hover:text-slate-900 dark:hover:text-white transition-all flex items-center gap-1.5 text-xs sm:text-sm font-semibold cursor-pointer active:scale-95"
                        title="Minggu Berikutnya"
                        aria-label="Minggu Berikutnya"
                    >
                        <span className="hidden md:inline">Berikutnya</span>
                        <ChevronRight className="w-4 h-4 shrink-0" />
                    </button>
                </div>
            </div>

            {/* 5-Column Grid (Horizontal / Menyamping) */}
            <div className="flex md:grid md:grid-cols-5 gap-3.5 overflow-x-auto pb-4 pt-1 snap-x scrollbar-thin">
                {weekDays.map((day) => {
                    const dayItems = itemsByDate.get(day.dateStr) || [];
                    const isToday = day.isToday;

                    return (
                        <div
                            key={day.dateStr}
                            className={`min-w-[270px] md:min-w-0 flex-1 snap-start flex flex-col rounded-2xl border transition-all ${
                                isToday
                                    ? 'bg-emerald-500/[0.03] dark:bg-[#00d284]/[0.02] border-emerald-400/80 dark:border-[#00d284]/40 shadow-sm'
                                    : 'bg-slate-50/70 dark:bg-[#0d1524]/60 border-slate-200/80 dark:border-[#1c2b44]'
                            }`}
                        >
                            {/* Day Column Header */}
                            <div
                                className={`p-3 rounded-t-2xl border-b transition-colors flex items-center justify-between ${
                                    isToday
                                        ? 'bg-emerald-500/10 dark:bg-emerald-950/40 border-emerald-300/60 dark:border-emerald-800/40'
                                        : 'bg-white/90 dark:bg-[#111c2e]/70 border-slate-200/80 dark:border-[#1c2b44]'
                                }`}
                            >
                                <div className="space-y-0.5">
                                    <div className="flex items-center gap-1.5">
                                        <span
                                            className={`text-xs font-bold uppercase tracking-wider ${
                                                isToday
                                                    ? 'text-emerald-700 dark:text-[#00d284]'
                                                    : 'text-slate-800 dark:text-slate-200'
                                            }`}
                                        >
                                            {day.dayName}
                                        </span>
                                        {isToday && (
                                            <span className="w-2 h-2 rounded-full bg-emerald-500 dark:bg-[#00d284] animate-pulse" />
                                        )}
                                    </div>
                                    {/* Date displayed prominently under the day name */}
                                    <p
                                        className={`text-sm font-extrabold ${
                                            isToday
                                                ? 'text-emerald-800 dark:text-[#00d284]'
                                                : 'text-slate-600 dark:text-slate-400'
                                        }`}
                                    >
                                        {day.dateFormatted}
                                    </p>
                                </div>

                                <div className="flex items-center gap-1">
                                    <span
                                        className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${
                                            dayItems.length > 0
                                                ? isToday
                                                    ? 'bg-emerald-500 text-white shadow-sm'
                                                    : 'bg-indigo-100 dark:bg-indigo-950/70 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800/60'
                                                : 'bg-slate-100 dark:bg-slate-800/80 text-slate-400 dark:text-slate-500'
                                        }`}
                                    >
                                        {dayItems.length} PH
                                    </span>
                                </div>
                            </div>

                            {/* Column Body: Cards or Clean Placeholder */}
                            <div className="p-2.5 flex-1 flex flex-col gap-2.5">
                                {dayItems.length > 0 ? (
                                    dayItems.map((item) => {
                                        const subjectColor = getColorForSubject(item.subject);

                                        return (
                                            <div
                                                key={item.id}
                                                className="bg-white dark:bg-[#111c2e] rounded-xl border border-slate-200/90 dark:border-[#1c2b44] p-3 shadow-xs hover:shadow-md transition-all flex flex-col justify-between gap-2.5 group"
                                            >
                                                {/* Card Header & Title */}
                                                <div className="flex items-start justify-between gap-1.5">
                                                    <div className="flex items-start gap-2 min-w-0">
                                                        <div
                                                            className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 border mt-0.5 ${subjectColor}`}
                                                        >
                                                            <CalendarCheck className="w-3.5 h-3.5" />
                                                        </div>
                                                        <div className="min-w-0">
                                                            <h4 className="font-bold text-xs sm:text-sm text-slate-900 dark:text-white truncate">
                                                                {item.subject}
                                                            </h4>
                                                            <div className="flex items-center gap-1 text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                                                                <Clock className="w-3 h-3 text-slate-400 shrink-0" />
                                                                <span className="font-mono bg-slate-100 dark:bg-slate-800/80 px-1 py-0.2 rounded text-[10px]">
                                                                    Jam {item.period_label}
                                                                </span>
                                                            </div>
                                                        </div>
                                                    </div>

                                                    {/* Context Menu */}
                                                    {canManage && (
                                                        <DropdownMenu>
                                                            <DropdownTrigger
                                                                className="!w-8 !h-8 sm:!w-7 sm:!h-7 !p-0 !bg-transparent !border-none !shadow-none rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer active:scale-95 transition-all"
                                                                aria-label="Menu Aksi Jadwal"
                                                            >
                                                                <MoreVertical className="w-4 h-4" />
                                                            </DropdownTrigger>
                                                            <DropdownContent align="right">
                                                                <DropdownItem onClick={() => onEdit(item)}>
                                                                    <Edit3 className="w-3.5 h-3.5 mr-2" /> Edit Jadwal
                                                                </DropdownItem>
                                                                <DropdownItem onClick={() => onDuplicate(item)}>
                                                                    <Copy className="w-3.5 h-3.5 mr-2" /> Duplikasi
                                                                </DropdownItem>
                                                                <DropdownItem
                                                                    onClick={() => onDelete(item)}
                                                                    className="text-rose-600 hover:text-rose-700"
                                                                >
                                                                    <Trash2 className="w-3.5 h-3.5 mr-2" /> Hapus
                                                                </DropdownItem>
                                                            </DropdownContent>
                                                        </DropdownMenu>
                                                    )}
                                                </div>

                                                {/* Bottom Action: Input Nilai */}
                                                <div className="pt-2 border-t border-slate-100 dark:border-[#1c2b44]/60 flex items-center justify-between">
                                                    <Button
                                                        type="button"
                                                        size="sm"
                                                        variant="primary"
                                                        onClick={() => onInputNilai(item)}
                                                        aria-label={`Input nilai untuk ${item.subject}`}
                                                        className="min-h-[38px] sm:min-h-[32px] h-9 sm:h-8 w-full px-2.5 text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 cursor-pointer active:scale-95 shadow-xs"
                                                    >
                                                        <ClipboardPen className="w-3.5 h-3.5" />
                                                        <span>Input Nilai</span>
                                                    </Button>
                                                </div>
                                            </div>
                                        );
                                    })
                                ) : (
                                    /* Clean Empty Placeholder */
                                    <div className="flex-1 min-h-[140px] rounded-xl border border-dashed border-slate-200 dark:border-slate-800/80 bg-white/40 dark:bg-slate-900/20 p-3 flex flex-col items-center justify-center text-center gap-2">
                                        <div className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800/60 flex items-center justify-center text-slate-400 dark:text-slate-500">
                                            <Calendar className="w-4 h-4" />
                                        </div>
                                        <p className="text-[11px] text-slate-400 dark:text-slate-500 font-medium leading-tight">
                                            Belum ada jadwal PH
                                        </p>
                                        {canManage && (
                                            <button
                                                type="button"
                                                onClick={() => onAdd(day.dateStr)}
                                                className="mt-1 inline-flex items-center justify-center gap-1.5 text-xs font-semibold text-emerald-600 hover:text-emerald-700 dark:text-[#00d284] dark:hover:text-emerald-300 min-h-[38px] py-1.5 px-3 rounded-xl bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/40 dark:hover:bg-emerald-900/40 transition-colors cursor-pointer active:scale-95"
                                                title={`Tambah Jadwal PH untuk ${day.dayName}, ${day.dateFormatted}`}
                                            >
                                                <Plus className="w-3.5 h-3.5" />
                                                <span>Tambah PH</span>
                                            </button>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};
