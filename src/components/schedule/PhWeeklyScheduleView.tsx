import React, { useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight, Plus, Clock, MoreVertical, Edit3, Copy, Trash2, ClipboardPen } from 'lucide-react';
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
    schedules, canAdd, canModify, onAdd, onEdit, onDuplicate, onDelete, onInputNilai, referenceDate,
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
    const today = referenceDate ?? new Date().toLocaleDateString('sv-SE', { timeZone: 'Asia/Jakarta' });

    return (
        <section aria-label="Agenda PH mingguan" className="space-y-4">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <h2 className="text-lg font-semibold text-slate-900 dark:text-white">{range}</h2>
                    <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">{total} PH Terjadwal</p>
                </div>
                <div className="flex items-center gap-2">
                    <Button type="button" variant="outline" className="!h-11 !w-11 !min-h-11 !min-w-11 !p-0" aria-label="Minggu Sebelumnya" title="Minggu sebelumnya" onClick={() => setWeekOffset((offset) => offset - 1)}><ChevronLeft className="h-5 w-5" /></Button>
                    <Button type="button" variant="outline" className="!min-h-11 min-w-28 text-sm" aria-label="Minggu Ini" onClick={() => setWeekOffset(0)}>Minggu Ini</Button>
                    <Button type="button" variant="outline" className="!h-11 !w-11 !min-h-11 !min-w-11 !p-0" aria-label="Minggu Berikutnya" title="Minggu berikutnya" onClick={() => setWeekOffset((offset) => offset + 1)}><ChevronRight className="h-5 w-5" /></Button>
                </div>
            </div>
            {total === 0 ? <div className="flex flex-col items-center gap-4 border-y border-slate-200 py-12 text-center dark:border-slate-700">
                <h3 className="text-base font-semibold text-slate-900 dark:text-white">Belum ada jadwal PH minggu ini</h3>
                {canAdd && <Button onClick={() => onAdd(weekDays.some(day => day.dateStr === today) ? today : weekDays[0].dateStr)} title="Tambah jadwal PH pada minggu yang ditampilkan">
                    <Plus className="h-4 w-4" aria-hidden />Tambah PH minggu ini
                </Button>}
            </div> : <div className="grid grid-cols-1 items-start gap-3 md:grid-cols-2 xl:grid-cols-4 2xl:grid-cols-7" aria-label="Jadwal Senin sampai Minggu">
                {weekDays.map((day) => {
                    const items = itemsByDate.get(day.dateStr) ?? [];
                    const isPast = day.dateStr < today;
                    return (
                        <article
                            key={day.dateStr}
                            className={`min-w-0 overflow-hidden rounded-2xl border ${
                                day.isToday
                                    ? 'border-brand-400 bg-white shadow-sm dark:border-brand-600 dark:bg-slate-900'
                                    : 'border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900'
                            }`}
                        >
                            <div className={`flex items-center justify-between gap-2 border-b px-4 py-3 ${
                                day.isToday
                                    ? 'border-brand-200 bg-brand-50 dark:border-brand-800 dark:bg-brand-950/40'
                                    : 'border-slate-100 dark:border-slate-800'
                            }`}>
                                <div className="min-w-0">
                                    <h3 className={`text-sm font-semibold ${isPast && !day.isToday ? 'text-slate-600 dark:text-slate-400' : 'text-slate-900 dark:text-white'}`}>{day.dayName}</h3>
                                    <p className="mt-0.5 text-sm text-slate-600 dark:text-slate-400">{day.dateFormatted}</p>
                                </div>
                                {day.isToday
                                    ? <span className="shrink-0 rounded-lg bg-brand-700 px-2 py-1 text-xs font-semibold text-white dark:bg-brand-600">Hari ini</span>
                                    : <span className="shrink-0 text-sm tabular-nums text-slate-600 dark:text-slate-400">{items.length} PH</span>}
                            </div>
                            <div className={items.length ? 'space-y-3 p-3' : 'flex items-center justify-between gap-2 p-3 sm:block sm:space-y-3'}>
                                {items.map((item) => (
                                    <div
                                        key={item.id}
                                        className={`rounded-xl border p-3 ${
                                            isPast && !day.isToday
                                                ? 'border-slate-200 bg-slate-50/60 dark:border-slate-800 dark:bg-slate-800/40'
                                                : 'border-slate-200 bg-slate-50 dark:border-slate-700 dark:bg-slate-800/70'
                                        }`}
                                    >
                                        <div className="flex items-start justify-between gap-1">
                                            <div className="min-w-0 flex-1">
                                                <p className="mb-1.5 flex items-center gap-1.5 text-sm text-slate-600 dark:text-slate-400"><Clock className="h-4 w-4 shrink-0" aria-hidden />Jam {item.period_label}</p>
                                                <h4 className="break-words text-base font-semibold leading-6 text-slate-900 dark:text-white"><span aria-hidden className={`mr-2 inline-block h-2.5 w-2.5 rounded-full ${phSubjectColor(item.subject)}`} />{parseSubjectString(item.subject).baseSubject}</h4>
                                                <p className="mt-1 text-xs text-slate-600 dark:text-slate-300">{parseSubjectString(item.subject).topic || 'Materi belum diisi'}</p>
                                            </div>
                                            {canAdd && <DropdownMenu><DropdownTrigger aria-label="Menu Aksi Jadwal" title={`Aksi jadwal ${item.subject}`} className="!h-11 !w-11 !min-h-11 !min-w-11 !p-0 !shadow-none !rounded-xl"><MoreVertical className="h-4 w-4" /></DropdownTrigger><DropdownContent align="right">
                                                {canModify(item) && <DropdownItem className="min-h-11" onClick={() => onEdit(item)}><Edit3 className="mr-2 h-4 w-4" />Edit Jadwal</DropdownItem>}
                                                <DropdownItem className="min-h-11" onClick={() => onDuplicate(item)}><Copy className="mr-2 h-4 w-4" />Duplikasi</DropdownItem>
                                                {canModify(item) && <DropdownItem className="min-h-11 text-rose-600" onClick={() => onDelete(item)}><Trash2 className="mr-2 h-4 w-4" />Hapus</DropdownItem>}
                                            </DropdownContent></DropdownMenu>}
                                        </div>
                                        <Button type="button" variant="primary" className="mt-3 min-h-11 w-full gap-2 !bg-teal-700 hover:!bg-teal-800 text-sm text-white" aria-label={`Input nilai untuk ${item.subject}`} onClick={() => onInputNilai(item)}><ClipboardPen className="h-4 w-4" aria-hidden />Input Nilai</Button>
                                    </div>
                                ))}
                                {!items.length && <p className="px-1 py-2 text-sm text-slate-600 dark:text-slate-400">Tidak ada PH</p>}
                                {canAdd && <button type="button" onClick={() => onAdd(day.dateStr)} title={`Tambah Jadwal PH untuk ${day.dayName}, ${day.dateFormatted}`} className={`flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-xl border border-dashed border-slate-300 px-2 text-sm font-medium text-brand-700 transition-colors hover:border-brand-400 hover:bg-brand-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 dark:border-slate-700 dark:text-brand-300 dark:hover:border-brand-700 dark:hover:bg-brand-950/40 ${items.length ? 'w-full' : 'sm:w-full'}`}><Plus className="h-4 w-4" aria-hidden />Tambah PH</button>}
                            </div>
                        </article>
                    );
                })}
            </div>}
        </section>
    );
};
