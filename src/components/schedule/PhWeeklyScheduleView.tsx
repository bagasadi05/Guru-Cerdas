import React, { useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight, Calendar, Plus, Clock, MoreVertical, Edit3, Copy, Trash2, ClipboardPen } from 'lucide-react';
import { Button } from '../ui/Button';
import { DropdownMenu, DropdownTrigger, DropdownContent, DropdownItem } from '../ui/DropdownMenu';
import { PhScheduleEngine } from './engine/PhScheduleEngine';
import { comparePhPeriods } from './engine/phScheduleValidation';
import type { PhScheduleRow } from '../../types';

interface PhWeeklyScheduleViewProps {
    schedules: PhScheduleRow[];
    canManage: boolean;
    onAdd: (initialDate?: string) => void;
    onEdit: (item: PhScheduleRow) => void;
    onDuplicate: (item: PhScheduleRow) => void;
    onDelete: (item: PhScheduleRow) => void;
    onInputNilai: (item: PhScheduleRow) => void;
    referenceDate?: string;
}

export const PhWeeklyScheduleView: React.FC<PhWeeklyScheduleViewProps> = ({
    schedules, canManage, onAdd, onEdit, onDuplicate, onDelete, onInputNilai, referenceDate,
}) => {
    const [weekOffset, setWeekOffset] = useState(0);
    const weekDays = useMemo(() => PhScheduleEngine.getSchoolWeekDays(
        referenceDate ? new Date(`${referenceDate}T12:00:00`) : new Date(), weekOffset, true,
    ), [referenceDate, weekOffset]);
    const itemsByDate = useMemo(() => {
        const map = new Map<string, PhScheduleRow[]>(weekDays.map((day) => [day.dateStr, []]));
        schedules.forEach((item) => map.get(item.date)?.push(item));
        map.forEach((items) => items.sort((a, b) => comparePhPeriods(a.period_label, b.period_label)));
        return map;
    }, [schedules, weekDays]);
    const total = Array.from(itemsByDate.values()).reduce((sum, items) => sum + items.length, 0);
    const range = PhScheduleEngine.formatWeekRangeLabel(weekDays[0].rawDate, weekDays[weekDays.length - 1].rawDate);

    return (
        <section aria-label="Agenda PH mingguan" className="space-y-4">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <h2 className="text-lg font-semibold tracking-tight text-slate-900 dark:text-white">{range}</h2>
                    <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">{total} PH Terjadwal</p>
                </div>
                <div className="grid grid-cols-3 gap-2 sm:flex">
                    <Button type="button" variant="outline" className="min-h-11 gap-1 px-2 sm:px-3" aria-label="Minggu Sebelumnya" onClick={() => setWeekOffset((offset) => offset - 1)}><ChevronLeft className="h-4 w-4" /><span className="text-sm">Sebelumnya</span></Button>
                    <Button type="button" variant="outline" className="min-h-11 px-2 text-sm sm:px-3" aria-label="Minggu Ini" onClick={() => setWeekOffset(0)}>Minggu Ini</Button>
                    <Button type="button" variant="outline" className="min-h-11 gap-1 px-2 sm:px-3" aria-label="Minggu Berikutnya" onClick={() => setWeekOffset((offset) => offset + 1)}><span className="text-sm">Berikutnya</span><ChevronRight className="h-4 w-4" /></Button>
                </div>
            </div>
            <div className="grid grid-cols-1 items-start gap-3 md:grid-cols-2 xl:grid-cols-4 2xl:grid-cols-7" aria-label="Jadwal Senin sampai Minggu">
                {weekDays.map((day) => {
                    const items = itemsByDate.get(day.dateStr) ?? [];
                    return (
                        <article key={day.dateStr} className={`min-w-0 rounded-2xl border ${day.isToday ? 'border-brand-300 bg-brand-50/50 dark:border-brand-700 dark:bg-brand-950/30' : 'border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900'}`}>
                            <div className="flex items-center justify-between gap-2 border-b border-slate-100 px-4 py-3 dark:border-slate-800">
                                <div><h3 className="text-sm font-semibold text-slate-900 dark:text-white">{day.dayName}</h3><p className="mt-0.5 text-sm text-slate-500 dark:text-slate-400">{day.dateFormatted}</p></div>
                                {day.isToday ? <span className="rounded-lg bg-brand-100 px-2 py-1 text-xs font-medium text-brand-800 dark:bg-brand-900 dark:text-brand-200">Hari ini</span> : <span className="text-sm tabular-nums text-slate-500 dark:text-slate-400">{items.length} PH</span>}
                            </div>
                            <div className={items.length ? 'space-y-3 p-3' : 'flex items-center justify-between gap-2 p-3 sm:block sm:space-y-3'}>
                                {items.map((item) => (
                                    <div key={item.id} className="rounded-xl border border-slate-200 bg-white p-3 dark:border-slate-700 dark:bg-slate-900">
                                        <div className="flex items-start justify-between gap-1">
                                            <div className="min-w-0 flex-1"><p className="mb-1.5 flex items-center gap-1.5 text-sm text-slate-500 dark:text-slate-400"><Clock className="h-4 w-4 shrink-0" />Jam {item.period_label}</p><h4 className="break-words text-base font-semibold leading-6 text-slate-900 dark:text-white">{item.subject}</h4></div>
                                            {canManage && <DropdownMenu><DropdownTrigger aria-label="Menu Aksi Jadwal" title={`Aksi jadwal ${item.subject}`} className="!h-11 !w-11 !min-h-11 !min-w-11 !p-0 !shadow-none !rounded-xl"><MoreVertical className="h-4 w-4" /></DropdownTrigger><DropdownContent align="right">
                                                <DropdownItem className="min-h-11" onClick={() => onEdit(item)}><Edit3 className="mr-2 h-4 w-4" />Edit Jadwal</DropdownItem>
                                                <DropdownItem className="min-h-11" onClick={() => onDuplicate(item)}><Copy className="mr-2 h-4 w-4" />Duplikasi</DropdownItem>
                                                <DropdownItem className="min-h-11 text-rose-600" onClick={() => onDelete(item)}><Trash2 className="mr-2 h-4 w-4" />Hapus</DropdownItem>
                                            </DropdownContent></DropdownMenu>}
                                        </div>
                                        <Button type="button" variant="outline" className="mt-3 min-h-11 w-full gap-2 text-sm" aria-label={`Input nilai untuk ${item.subject}`} onClick={() => onInputNilai(item)}><ClipboardPen className="h-4 w-4" />Input Nilai</Button>
                                    </div>
                                ))}
                                {!items.length && <p className="flex items-center gap-2 px-1 py-2 text-sm text-slate-500 dark:text-slate-400"><Calendar className="h-4 w-4 shrink-0" />Belum ada jadwal PH</p>}
                                {canManage && <button type="button" onClick={() => onAdd(day.dateStr)} title={`Tambah Jadwal PH untuk ${day.dayName}, ${day.dateFormatted}`} className={`flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-xl px-2 text-sm font-medium text-brand-700 transition-colors hover:bg-brand-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 dark:text-brand-300 dark:hover:bg-brand-900/30 ${items.length ? 'w-full' : 'sm:w-full'}`}><Plus className="h-4 w-4" />Tambah PH</button>}
                            </div>
                        </article>
                    );
                })}
            </div>
        </section>
    );
};
