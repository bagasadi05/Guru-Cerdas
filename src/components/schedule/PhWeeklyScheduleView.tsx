import React, { useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight, Plus, Clock, MoreVertical, Edit3, Copy, Trash2, ClipboardPen, Calendar } from 'lucide-react';
import { Button } from '../ui/Button';
import { DropdownMenu, DropdownTrigger, DropdownContent, DropdownItem } from '../ui/DropdownMenu';
import { PhScheduleEngine } from './engine/PhScheduleEngine';
import { comparePhPeriods } from './engine/phScheduleValidation';
import type { PhScheduleRow } from '../../types';
import { parseSubjectString, phSubjectColor } from './engine/phSchedulePresentation';

interface PhWeeklyScheduleViewProps {
    schedules: PhScheduleRow[];
    canAdd: boolean;
    canModify: (schedule: PhScheduleRow) => boolean;
    onAdd: (initialDate?: string) => void;
    onEdit: (item: PhScheduleRow) => void;
    onDuplicate: (item: PhScheduleRow) => void;
    onDelete: (item: PhScheduleRow) => void;
    onInputNilai: (item: PhScheduleRow) => void;
    referenceDate?: string;
}

export const PhWeeklyScheduleView: React.FC<PhWeeklyScheduleViewProps> = ({
    schedules,
    canAdd,
    canModify,
    onAdd,
    onEdit,
    onDuplicate,
    onDelete,
    onInputNilai,
    referenceDate,
}) => {
    const [weekOffset, setWeekOffset] = useState(0);
    const [showWeekendManual, setShowWeekendManual] = useState(false);
    const [selectedMobileDate, setSelectedMobileDate] = useState<string>('');

    // Always fetch full 7 days (Monday to Sunday) for range heading and data mapping
    const allWeekDays = useMemo(() => PhScheduleEngine.getSchoolWeekDays(
        referenceDate ? new Date(`${referenceDate}T12:00:00`) : new Date(),
        weekOffset,
        true
    ), [referenceDate, weekOffset]);

    const itemsByDate = useMemo(() => {
        const map = new Map<string, PhScheduleRow[]>(allWeekDays.map((day) => [day.dateStr, []]));
        schedules.forEach((item) => map.get(item.date)?.push(item));
        map.forEach((items) => items.sort((a, b) => comparePhPeriods(a.period_label, b.period_label)));
        return map;
    }, [schedules, allWeekDays]);

    const total = Array.from(itemsByDate.values()).reduce((sum, items) => sum + items.length, 0);
    const range = PhScheduleEngine.formatWeekRangeLabel(allWeekDays[0].rawDate, allWeekDays[6].rawDate);
    const today = referenceDate ?? new Date().toLocaleDateString('sv-SE', { timeZone: 'Asia/Jakarta' });

    // Check if weekend (Saturday or Sunday) has scheduled assessments or is today
    const hasSaturdayItems = (itemsByDate.get(allWeekDays[5]?.dateStr) ?? []).length > 0;
    const hasSundayItems = (itemsByDate.get(allWeekDays[6]?.dateStr) ?? []).length > 0;
    const hasWeekendItems = hasSaturdayItems || hasSundayItems;
    const isWeekendToday = allWeekDays[5]?.isToday || allWeekDays[6]?.isToday
        || (referenceDate && (referenceDate === allWeekDays[5]?.dateStr || referenceDate === allWeekDays[6]?.dateStr));

    // Show weekends automatically if there are weekend items or if today is weekend, or if user toggled it
    const showWeekends = hasWeekendItems || Boolean(isWeekendToday) || showWeekendManual;

    // Filter displayed days: 5 school days by default (Senin–Jumat) or all 7 days if weekend active
    const displayDays = useMemo(() => {
        return showWeekends ? allWeekDays : allWeekDays.slice(0, 5);
    }, [allWeekDays, showWeekends]);

    // Active day for mobile view (defaults to today if in range, otherwise first day with items, or Monday)
    const activeMobileDate = useMemo(() => {
        if (selectedMobileDate && displayDays.some((d) => d.dateStr === selectedMobileDate)) {
            return selectedMobileDate;
        }
        const todayMatch = displayDays.find((d) => d.isToday || d.dateStr === today);
        if (todayMatch) return todayMatch.dateStr;
        const firstWithItems = displayDays.find((d) => (itemsByDate.get(d.dateStr) ?? []).length > 0);
        return firstWithItems ? firstWithItems.dateStr : (displayDays[0]?.dateStr ?? '');
    }, [selectedMobileDate, displayDays, today, itemsByDate]);

    return (
        <section aria-label="Agenda ASH mingguan" className="space-y-3">
            {/* Header: Week Range, Total Count & Navigation on a single compact row */}
            <div className="flex items-center justify-between gap-2">
                <div className="min-w-0 flex-1">
                    <h2 className="truncate text-sm sm:text-lg font-bold text-slate-900 dark:text-white">{range}</h2>
                    <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs sm:text-sm text-slate-600 dark:text-slate-400">
                        <span className="font-semibold text-brand-700 dark:text-brand-300">{total} ASH Terjadwal</span>
                        {!showWeekends ? (
                            <button
                                type="button"
                                onClick={() => setShowWeekendManual(true)}
                                className="text-xs text-slate-500 hover:text-brand-600 dark:text-slate-400 dark:hover:text-brand-300 underline font-medium"
                            >
                                + Akhir Pekan
                            </button>
                        ) : showWeekendManual && !hasWeekendItems && !isWeekendToday ? (
                            <button
                                type="button"
                                onClick={() => setShowWeekendManual(false)}
                                className="text-xs text-slate-500 hover:text-brand-600 dark:text-slate-400 dark:hover:text-brand-300 underline font-medium"
                            >
                                Sembunyikan Akhir Pekan
                            </button>
                        ) : null}
                    </div>
                </div>

                {/* Week Navigation Buttons */}
                <div className="flex shrink-0 items-center gap-1 sm:gap-2">
                    <Button
                        type="button"
                        variant="outline"
                        className="!h-10 !w-9 sm:!h-11 sm:!w-11 !min-h-10 !min-w-9 sm:!min-h-11 sm:!min-w-11 !p-0 rounded-xl"
                        aria-label="Minggu Sebelumnya"
                        title="Minggu sebelumnya"
                        onClick={() => { setWeekOffset((offset) => offset - 1); setSelectedMobileDate(''); }}
                    >
                        <ChevronLeft className="h-4 w-4 sm:h-5 sm:w-5" />
                    </Button>
                    <Button
                        type="button"
                        variant="outline"
                        className="!h-10 sm:!h-11 !min-h-10 sm:!min-h-11 !px-2.5 sm:min-w-28 text-xs sm:text-sm font-semibold rounded-xl"
                        aria-label="Minggu Ini"
                        onClick={() => { setWeekOffset(0); setSelectedMobileDate(''); }}
                    >
                        Minggu Ini
                    </Button>
                    <Button
                        type="button"
                        variant="outline"
                        className="!h-10 !w-9 sm:!h-11 sm:!w-11 !min-h-10 !min-w-9 sm:!min-h-11 sm:!min-w-11 !p-0 rounded-xl"
                        aria-label="Minggu Berikutnya"
                        title="Minggu berikutnya"
                        onClick={() => { setWeekOffset((offset) => offset + 1); setSelectedMobileDate(''); }}
                    >
                        <ChevronRight className="h-4 w-4 sm:h-5 sm:w-5" />
                    </Button>
                </div>
            </div>

            {total === 0 ? (
                /* Empty state for the week */
                <div className="flex flex-col items-center gap-4 rounded-2xl border border-dashed border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 py-10 px-4 text-center">
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-50 text-brand-700 dark:bg-brand-950/60 dark:text-brand-300">
                        <Calendar className="h-6 w-6" aria-hidden />
                    </div>
                    <div className="space-y-1">
                        <h3 className="text-base font-semibold text-slate-900 dark:text-white">Belum ada jadwal ASH minggu ini</h3>
                        <p className="text-sm text-slate-600 dark:text-slate-400">Tidak ada agenda asesmen sumatif yang dijadwalkan pada rentang minggu ini.</p>
                    </div>
                    {canAdd && (
                        <Button
                            onClick={() => onAdd(allWeekDays.some(day => day.dateStr === today) ? today : allWeekDays[0].dateStr)}
                            title="Tambah jadwal ASH pada minggu yang ditampilkan"
                            className="min-h-11 gap-2 rounded-xl !bg-brand-700 hover:!bg-brand-800 text-white font-semibold"
                        >
                            <Plus className="h-4 w-4" aria-hidden />Tambah ASH minggu ini
                        </Button>
                    )}
                </div>
            ) : (
                <div className="space-y-2.5">
                    {/* MOBILE DAY PILL SELECTOR (visible only on mobile < md) */}
                    <div
                        role="tablist"
                        aria-label="Pilih hari jadwal"
                        className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5 md:hidden"
                    >
                        {displayDays.map((d) => {
                            const dayItems = itemsByDate.get(d.dateStr) ?? [];
                            const isSelected = d.dateStr === activeMobileDate;
                            return (
                                <button
                                    key={d.dateStr}
                                    type="button"
                                    role="tab"
                                    aria-selected={isSelected}
                                    onClick={() => setSelectedMobileDate(d.dateStr)}
                                    className={`flex min-h-11 min-w-[54px] flex-1 flex-col items-center justify-center rounded-xl border px-1.5 py-1 text-xs font-semibold transition-all ${
                                        isSelected
                                            ? 'border-brand-700 bg-brand-700 text-white shadow-xs dark:border-brand-600 dark:bg-brand-600'
                                            : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300'
                                    }`}
                                >
                                    <span className="text-[10px] uppercase tracking-wider opacity-80">{d.dayName.slice(0, 3)}</span>
                                    <div className="flex items-center gap-1">
                                        <span className="text-xs font-bold">{d.dayNumber}</span>
                                        {dayItems.length > 0 && (
                                            <span className={`inline-flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[10px] font-bold tabular-nums ${
                                                isSelected ? 'bg-white text-brand-800' : 'bg-brand-100 text-brand-800 dark:bg-brand-900/60 dark:text-brand-200'
                                            }`}>
                                                {dayItems.length}
                                            </span>
                                        )}
                                    </div>
                                </button>
                            );
                        })}
                    </div>

                    {/* SCHEDULE GRID / DETAIL CARDS */}
                    <div
                        className={`grid grid-cols-1 items-start gap-3.5 md:grid-cols-2 ${
                            displayDays.length <= 5 ? 'lg:grid-cols-5' : 'lg:grid-cols-4 2xl:grid-cols-7'
                        }`}
                        aria-label="Jadwal Senin sampai Minggu"
                    >
                        {displayDays.map((day) => {
                            const items = itemsByDate.get(day.dateStr) ?? [];
                            const isPast = day.dateStr < today;
                            const isSelectedInMobile = day.dateStr === activeMobileDate;

                            return (
                                <article
                                    key={day.dateStr}
                                    className={`min-w-0 overflow-hidden rounded-2xl border transition-all ${
                                        isSelectedInMobile ? 'block' : 'hidden md:block'
                                    } ${
                                        day.isToday
                                            ? 'border-brand-400 bg-white shadow-xs ring-1 ring-brand-400/30 dark:border-brand-500 dark:bg-slate-900'
                                            : 'border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900'
                                    }`}
                                >
                                    {/* Day Header */}
                                    <div className={`flex items-center justify-between gap-2 border-b px-3.5 py-2.5 ${
                                        day.isToday
                                            ? 'border-brand-100 bg-brand-50/80 dark:border-brand-900/50 dark:bg-brand-950/40'
                                            : 'border-slate-100 bg-slate-50/60 dark:border-slate-800/80 dark:bg-slate-800/30'
                                    }`}>
                                        <div className="flex items-baseline gap-2 md:block min-w-0">
                                            <h3 className={`text-sm font-bold ${isPast && !day.isToday ? 'text-slate-600 dark:text-slate-400' : 'text-slate-900 dark:text-white'}`}>
                                                {day.dayName}
                                            </h3>
                                            <p className="text-xs text-slate-500 dark:text-slate-400">{day.dateFormatted}</p>
                                        </div>
                                        {day.isToday ? (
                                            <span className="shrink-0 rounded-lg bg-brand-700 px-2 py-0.5 text-xs font-bold text-white dark:bg-brand-600">
                                                Hari ini
                                            </span>
                                        ) : (
                                            <span className="shrink-0 text-xs font-semibold tabular-nums text-slate-500 dark:text-slate-400">
                                                {items.length} ASH
                                            </span>
                                        )}
                                    </div>

                                    {/* Items List */}
                                    <div className="space-y-2.5 p-3">
                                        {items.map((item) => (
                                            <div
                                                key={item.id}
                                                className={`rounded-xl border p-3 transition-colors ${
                                                    isPast && !day.isToday
                                                        ? 'border-slate-200/80 bg-slate-50/60 dark:border-slate-800 dark:bg-slate-800/40'
                                                        : 'border-slate-200 bg-slate-50/90 dark:border-slate-700/80 dark:bg-slate-800/70 shadow-2xs'
                                                }`}
                                            >
                                                <div className="flex items-start justify-between gap-2">
                                                    <div className="min-w-0 flex-1">
                                                        <div className="mb-1 flex items-center gap-1.5 text-xs font-medium text-slate-500 dark:text-slate-400">
                                                            <Clock className="h-3.5 w-3.5 shrink-0" aria-hidden />
                                                            <span>Jam {item.period_label}</span>
                                                        </div>
                                                        <h4 className="break-words hyphens-none text-sm sm:text-base font-bold leading-snug text-slate-900 dark:text-white">
                                                            <span aria-hidden className={`mr-2 inline-block h-2.5 w-2.5 rounded-full shrink-0 ${phSubjectColor(item.subject)}`} />
                                                            {parseSubjectString(item.subject).baseSubject}
                                                        </h4>
                                                        <p className="mt-1 text-xs text-slate-600 dark:text-slate-300 line-clamp-2">
                                                            {parseSubjectString(item.subject).topic || 'Materi belum diisi'}
                                                        </p>
                                                    </div>
                                                    {canAdd && (
                                                        <DropdownMenu>
                                                            <DropdownTrigger
                                                                aria-label="Menu Aksi Jadwal"
                                                                title={`Aksi jadwal ${item.subject}`}
                                                                className="!h-9 !w-9 !min-h-9 !min-w-9 !p-0 !shadow-none !rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
                                                            >
                                                                <MoreVertical className="h-4 w-4" />
                                                            </DropdownTrigger>
                                                            <DropdownContent align="right" className="w-48 rounded-2xl p-1">
                                                                {canModify(item) && (
                                                                    <DropdownItem className="min-h-11 rounded-xl" onClick={() => onEdit(item)}>
                                                                        <Edit3 className="mr-2 h-4 w-4 shrink-0" />Edit Jadwal
                                                                    </DropdownItem>
                                                                )}
                                                                <DropdownItem className="min-h-11 rounded-xl" onClick={() => onDuplicate(item)}>
                                                                    <Copy className="mr-2 h-4 w-4 shrink-0" />Duplikasi
                                                                </DropdownItem>
                                                                {canModify(item) && (
                                                                    <DropdownItem className="min-h-11 rounded-xl text-rose-600 dark:text-rose-400" onClick={() => onDelete(item)}>
                                                                        <Trash2 className="mr-2 h-4 w-4 shrink-0" />Hapus
                                                                    </DropdownItem>
                                                                )}
                                                            </DropdownContent>
                                                        </DropdownMenu>
                                                    )}
                                                </div>
                                                <Button
                                                    type="button"
                                                    variant="primary"
                                                    className="mt-2.5 min-h-11 w-full gap-2 !bg-teal-700 hover:!bg-teal-800 text-sm font-semibold text-white rounded-xl shadow-xs"
                                                    aria-label={`Input nilai untuk ${item.subject}`}
                                                    onClick={() => onInputNilai(item)}
                                                >
                                                    <ClipboardPen className="h-4 w-4" aria-hidden />
                                                    <span>Input Nilai</span>
                                                </Button>
                                            </div>
                                        ))}

                                        {!items.length && (
                                            <p className="py-3 text-center text-xs text-slate-400 dark:text-slate-500">
                                                Tidak ada ASH
                                            </p>
                                        )}

                                        {canAdd && (
                                            <button
                                                type="button"
                                                onClick={() => onAdd(day.dateStr)}
                                                title={`Tambah Jadwal ASH untuk ${day.dayName}, ${day.dateFormatted}`}
                                                className="flex min-h-11 w-full items-center justify-center gap-1.5 rounded-xl border border-dashed border-slate-300 dark:border-slate-700 px-3 text-xs sm:text-sm font-semibold text-brand-700 dark:text-brand-300 hover:border-brand-400 hover:bg-brand-50/50 dark:hover:border-brand-700 dark:hover:bg-brand-950/30 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
                                            >
                                                <Plus className="h-4 w-4" aria-hidden />
                                                <span>Tambah ASH</span>
                                            </button>
                                        )}
                                    </div>
                                </article>
                            );
                        })}
                    </div>
                </div>
            )}
        </section>
    );
};
