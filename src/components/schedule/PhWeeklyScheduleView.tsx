import React, { useMemo, useState } from 'react';
import {
    ChevronLeft,
    ChevronRight,
    Plus,
    Clock,
    MoreVertical,
    Edit3,
    Copy,
    Trash2,
    ClipboardPen,
    Calendar,
    CheckCircle2,
    AlertCircle,
    Sparkles,
    UserCheck,
    Lock,
} from 'lucide-react';
import { Button } from '../ui/Button';
import { DropdownMenu, DropdownTrigger, DropdownContent, DropdownItem } from '../ui/DropdownMenu';
import { PhScheduleEngine, type GradeStatusInfo } from './engine/PhScheduleEngine';
import { MAX_ASH_PER_DAY, comparePhPeriods } from './engine/phScheduleValidation';
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
    gradeStatusById?: Map<string, GradeStatusInfo>;
    isCreatedByOtherTeacher?: (item: PhScheduleRow) => boolean;
    isNewlyAddedByOtherTeacher?: (item: PhScheduleRow) => boolean;
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
    gradeStatusById,
    isCreatedByOtherTeacher,
    isNewlyAddedByOtherTeacher,
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
                                            : d.holiday
                                                ? 'border-rose-300 bg-rose-50/70 text-rose-700 dark:border-rose-800 dark:bg-rose-950/30 dark:text-rose-300'
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
                            displayDays.length <= 5 ? 'lg:grid-cols-3 xl:grid-cols-5' : 'lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-7'
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
                                    className={`min-w-0 rounded-2xl border transition-all ${
                                        isSelectedInMobile ? 'block' : 'hidden md:block'
                                    } ${
                                        day.isToday
                                            ? 'border-teal-500/60 bg-white shadow-sm ring-1 ring-teal-500/25 dark:border-teal-500/50 dark:bg-slate-900'
                                            : day.holiday
                                                ? 'border-rose-200 bg-white dark:border-rose-900/60 dark:bg-slate-900'
                                                : 'border-slate-200/90 bg-white dark:border-slate-800 dark:bg-slate-900/95'
                                    }`}
                                >
                                    {/* Day Header */}
                                    <div className={`flex items-center justify-between gap-2 border-b rounded-t-2xl px-3.5 py-2.5 ${
                                        day.isToday
                                            ? 'border-teal-500/20 bg-gradient-to-r from-teal-500/10 via-brand-500/5 to-transparent dark:border-teal-500/20 dark:from-teal-500/15 dark:via-brand-950/30'
                                            : day.holiday
                                                ? 'border-rose-100 bg-rose-50/60 dark:border-rose-900/40 dark:bg-rose-950/20'
                                                : 'border-slate-100 bg-slate-50/60 dark:border-slate-800/80 dark:bg-slate-800/30'
                                    }`}>
                                        <div className="flex items-baseline gap-2 md:block min-w-0">
                                            <h3 className={`text-sm font-bold tracking-tight ${
                                                day.holiday
                                                    ? 'text-rose-700 dark:text-rose-300'
                                                    : isPast && !day.isToday
                                                        ? 'text-slate-600 dark:text-slate-400'
                                                        : 'text-slate-900 dark:text-white'
                                            }`}>
                                                {day.dayName}
                                            </h3>
                                            <p className="text-[11px] font-medium text-slate-500 dark:text-slate-400">{day.dateFormatted}</p>
                                        </div>
                                        {day.isToday ? (
                                            <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-teal-600 px-2.5 py-0.5 text-[11px] font-bold text-white shadow-2xs dark:bg-teal-500/90">
                                                <span className="h-1.5 w-1.5 rounded-full bg-white animate-pulse" />
                                                Hari ini ({items.length}/{MAX_ASH_PER_DAY})
                                            </span>
                                        ) : (
                                            <span
                                                className={`shrink-0 text-[11px] font-semibold tabular-nums ${
                                                    items.length >= MAX_ASH_PER_DAY
                                                        ? 'rounded-full bg-amber-500/15 border border-amber-500/25 px-2 py-0.5 text-amber-700 dark:text-amber-300'
                                                        : 'text-slate-400 dark:text-slate-500'
                                                }`}
                                            >
                                                {items.length}/{MAX_ASH_PER_DAY} ASH
                                            </span>
                                        )}
                                    </div>

                                    {/* Holiday Banner if Kaldik Holiday */}
                                    {day.holiday && (
                                        <div className="border-b border-rose-100 bg-rose-50/90 px-3 py-1.5 text-[11px] font-medium text-rose-800 dark:border-rose-900/40 dark:bg-rose-950/40 dark:text-rose-200">
                                            <span className="font-bold">
                                                {day.holiday.kind === 'CUTI' ? 'Cuti Bersama:' : 'Libur Nasional:'}
                                            </span>{' '}
                                            {day.holiday.name}
                                        </div>
                                    )}

                                    {/* Items List */}
                                    <div className="space-y-2.5 p-2.5 sm:p-3">
                                        {items.map((item) => {
                                            const gradeStatus = gradeStatusById?.get(item.id);
                                            const seqLabel = gradeStatus?.assessmentName || 'PH 1';
                                            const fromOtherTeacher = isCreatedByOtherTeacher?.(item) ?? false;
                                            const isNewFromOther = isNewlyAddedByOtherTeacher?.(item) ?? false;
                                            const { baseSubject, topic } = parseSubjectString(item.subject);
                                            const isComplete = gradeStatus?.state === 'complete';

                                            return (
                                                <div
                                                    key={item.id}
                                                    className={`group relative rounded-xl border p-3 transition-all duration-150 ${
                                                        isNewFromOther
                                                            ? 'border-sky-400/80 bg-sky-50/40 ring-1 ring-sky-400/25 dark:border-sky-500/60 dark:bg-sky-950/20'
                                                            : isComplete
                                                                ? 'border-slate-200/90 bg-slate-50/70 hover:border-emerald-500/40 dark:border-slate-800 dark:bg-slate-800/45 dark:hover:border-emerald-500/40'
                                                                : 'border-slate-200 bg-white shadow-2xs hover:border-teal-500/50 dark:border-slate-700/80 dark:bg-slate-800/75 dark:hover:border-teal-500/50'
                                                    }`}
                                                >
                                                    {/* Top Row: Time + Sequence Badge + Action Menu */}
                                                    <div className="flex items-center justify-between gap-1.5">
                                                        <div className="flex flex-wrap items-center gap-1.5 text-[11px] font-medium text-slate-500 dark:text-slate-400 min-w-0">
                                                            <span className="inline-flex items-center gap-1 text-slate-600 dark:text-slate-300 font-semibold">
                                                                <Clock className="h-3 w-3 shrink-0 text-slate-400 dark:text-slate-400" aria-hidden />
                                                                <span>Jam {item.period_label}</span>
                                                            </span>
                                                            <span className="rounded-md bg-teal-500/15 border border-teal-500/25 px-1.5 py-0.5 text-[10px] font-bold leading-none text-teal-700 dark:bg-teal-500/20 dark:text-teal-300">
                                                                {seqLabel}
                                                            </span>
                                                            {isNewFromOther && (
                                                                <span className="inline-flex items-center gap-0.5 rounded-md bg-sky-600 px-1.5 py-0.5 text-[10px] font-bold leading-none text-white">
                                                                    <Sparkles className="h-2.5 w-2.5" />
                                                                    Baru
                                                                </span>
                                                            )}
                                                            {fromOtherTeacher && (
                                                                <span className="inline-flex items-center gap-0.5 rounded-md bg-indigo-500/15 border border-indigo-500/25 px-1.5 py-0.5 text-[10px] font-semibold leading-none text-indigo-700 dark:text-indigo-300">
                                                                    <UserCheck className="h-2.5 w-2.5" />
                                                                    Mapel
                                                                </span>
                                                            )}
                                                        </div>

                                                        {canAdd && (
                                                            <DropdownMenu>
                                                                <DropdownTrigger
                                                                    aria-label="Menu Aksi Jadwal"
                                                                    title={`Aksi jadwal ${item.subject}`}
                                                                    className="-mr-1 -my-1 !h-7 !w-7 !min-h-7 !min-w-7 shrink-0 !p-0 !shadow-none !rounded-lg text-slate-400 hover:bg-slate-200/70 hover:text-slate-700 dark:hover:bg-slate-700/70 dark:hover:text-slate-100"
                                                                >
                                                                    <MoreVertical className="h-3.5 w-3.5" />
                                                                </DropdownTrigger>
                                                                <DropdownContent align="right" className="w-48 rounded-2xl p-1">
                                                                    {canModify(item) && (
                                                                        <DropdownItem className="min-h-10 rounded-xl" onClick={() => onEdit(item)}>
                                                                            <Edit3 className="mr-2 h-4 w-4 shrink-0" />Edit Jadwal
                                                                        </DropdownItem>
                                                                    )}
                                                                    <DropdownItem className="min-h-10 rounded-xl" onClick={() => onDuplicate(item)}>
                                                                        <Copy className="mr-2 h-4 w-4 shrink-0" />Duplikasi
                                                                    </DropdownItem>
                                                                    {canModify(item) && (
                                                                        <DropdownItem className="min-h-10 rounded-xl text-rose-600 dark:text-rose-400" onClick={() => onDelete(item)}>
                                                                            <Trash2 className="mr-2 h-4 w-4 shrink-0" />Hapus
                                                                        </DropdownItem>
                                                                    )}
                                                                </DropdownContent>
                                                            </DropdownMenu>
                                                        )}
                                                    </div>

                                                    {/* Subject Title & Topic */}
                                                    <div className="mt-2">
                                                        <h4 className="flex items-center gap-2 break-words hyphens-none text-[15px] font-extrabold leading-snug tracking-tight text-slate-900 dark:text-white">
                                                            <span
                                                                aria-hidden
                                                                className={`inline-block h-2.5 w-2.5 rounded-full shrink-0 ${phSubjectColor(item.subject)}`}
                                                            />
                                                            <span className="truncate" title={baseSubject}>{baseSubject}</span>
                                                        </h4>
                                                        <p
                                                            className="mt-1 border-l-2 border-slate-200 dark:border-slate-700 pl-2 text-xs text-slate-600 dark:text-slate-300 line-clamp-2"
                                                            title={topic || 'Materi belum diisi'}
                                                        >
                                                            {topic || 'Materi belum diisi'}
                                                        </p>
                                                    </div>

                                                    {/* Responsive Grade Status Bar */}
                                                    {gradeStatus && gradeStatus.state !== 'pending' && (
                                                        <div className="mt-2.5">
                                                            {gradeStatus.state === 'complete' && (
                                                                <div className="flex flex-wrap items-center justify-between gap-x-2 gap-y-1 rounded-lg border border-emerald-500/25 bg-emerald-500/10 px-2 py-1.5 text-[11px] font-semibold text-emerald-800 dark:bg-emerald-500/15 dark:text-emerald-300">
                                                                    <span className="inline-flex items-center gap-1.5">
                                                                        <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-emerald-600 dark:text-emerald-400" />
                                                                        <span>{gradeStatus.gradedCount}/{gradeStatus.totalStudents} Siswa</span>
                                                                    </span>
                                                                    {gradeStatus.averageScore !== null && (
                                                                        <span className="shrink-0 rounded bg-emerald-500/20 px-1.5 py-0.5 text-[10px] font-bold tabular-nums text-emerald-900 dark:text-emerald-200">
                                                                            Rata² {gradeStatus.averageScore}
                                                                        </span>
                                                                    )}
                                                                </div>
                                                            )}
                                                            {gradeStatus.state === 'partial' && (
                                                                <div className="flex flex-wrap items-center justify-between gap-x-2 gap-y-1 rounded-lg border border-amber-500/30 bg-amber-500/10 px-2 py-1.5 text-[11px] font-semibold text-amber-800 dark:text-amber-300">
                                                                    <span className="inline-flex items-center gap-1.5">
                                                                        <AlertCircle className="h-3.5 w-3.5 shrink-0 text-amber-500" />
                                                                        <span>Terinput {gradeStatus.gradedCount}/{gradeStatus.totalStudents}</span>
                                                                    </span>
                                                                    <span className="shrink-0 rounded bg-amber-500/20 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-amber-900 dark:text-amber-200">
                                                                        Sebagian
                                                                    </span>
                                                                </div>
                                                            )}
                                                            {gradeStatus.state === 'overdue' && (
                                                                <div className="flex flex-wrap items-center justify-between gap-x-2 gap-y-1 rounded-lg border border-rose-500/30 bg-rose-500/10 px-2 py-1.5 text-[11px] font-semibold text-rose-800 dark:text-rose-300">
                                                                    <span className="inline-flex items-center gap-1.5">
                                                                        <AlertCircle className="h-3.5 w-3.5 shrink-0 text-rose-500" />
                                                                        <span>Belum Dinilai</span>
                                                                    </span>
                                                                    <span className="shrink-0 rounded bg-rose-500/20 px-1.5 py-0.5 text-[10px] font-bold tabular-nums text-rose-900 dark:text-rose-200">
                                                                        0/{gradeStatus.totalStudents}
                                                                    </span>
                                                                </div>
                                                            )}
                                                        </div>
                                                    )}

                                                    {/* Action Button: Tonal/Subtle when Complete, Prominent Solid when Action Needed */}
                                                    <Button
                                                        type="button"
                                                        variant={isComplete ? 'outline' : 'primary'}
                                                        className={`mt-2.5 !min-h-9 !h-9 w-full !px-2 gap-1.5 text-xs font-bold rounded-lg transition-all ${
                                                            isComplete
                                                                ? '!border-emerald-500/30 !bg-emerald-500/10 hover:!bg-emerald-500/20 !text-emerald-700 dark:!text-emerald-300 shadow-none'
                                                                : '!bg-teal-600 hover:!bg-teal-500 text-white shadow-xs'
                                                        }`}
                                                        aria-label={`Input nilai untuk ${item.subject}`}
                                                        onClick={() => onInputNilai(item)}
                                                    >
                                                        <ClipboardPen className="h-3.5 w-3.5 shrink-0" aria-hidden />
                                                        <span>
                                                            {isComplete
                                                                ? 'Lihat Nilai'
                                                                : gradeStatus?.state === 'partial'
                                                                    ? 'Lengkapi Nilai'
                                                                    : 'Input Nilai'}
                                                        </span>
                                                    </Button>
                                                </div>
                                            );
                                        })}

                                        {!items.length && (
                                            <p className="py-4 text-center text-xs text-slate-400 dark:text-slate-500">
                                                Tidak ada ASH
                                            </p>
                                        )}

                                        {canAdd && (
                                            items.length >= MAX_ASH_PER_DAY ? (
                                                <div
                                                    aria-label={`Kuota penuh untuk ${day.dayName}`}
                                                    className="flex items-center justify-center gap-1.5 rounded-xl border border-slate-200/70 dark:border-slate-800/80 bg-slate-100/50 dark:bg-slate-800/30 py-2 px-3 text-[11px] font-medium text-slate-400 dark:text-slate-500 select-none"
                                                >
                                                    <Lock className="h-3 w-3 shrink-0 opacity-70" aria-hidden />
                                                    <span>Kuota Penuh ({MAX_ASH_PER_DAY}/{MAX_ASH_PER_DAY} ASH)</span>
                                                </div>
                                            ) : (
                                                <button
                                                    type="button"
                                                    onClick={() => onAdd(day.dateStr)}
                                                    title={`Tambah Jadwal ASH untuk ${day.dayName}, ${day.dateFormatted}`}
                                                    className="flex min-h-9 w-full items-center justify-center gap-1.5 rounded-xl border border-dashed border-slate-300 dark:border-slate-700 py-2 px-3 text-xs font-semibold text-brand-700 dark:text-brand-300 hover:border-brand-400 hover:bg-brand-50/50 dark:hover:border-brand-600 dark:hover:bg-brand-950/30 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
                                                >
                                                    <Plus className="h-3.5 w-3.5" aria-hidden />
                                                    <span>Tambah ASH</span>
                                                </button>
                                            )
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
