import React from 'react';
import { Calendar, Clock } from 'lucide-react';
import { Input } from '../../../ui/Input';
import { PERIOD_PRESETS } from '../../engine/usePhScheduleDomain';

interface PhScheduleDateTimeSectionProps {
    date: string;
    onDateChange: (date: string) => void;
    semester?: { start_date: string; end_date: string };
    dayInfo: { dayName: string; formatted: string; isWeekend: boolean } | null;
    holidayInfo: { name: string; kind?: string } | null;
    quickDateTargets: { today: string; tomorrow: string; nextMonday: string };
    onSetQuickDate: (offsetDays: number) => void;
    onSetQuickNextMonday: () => void;
    periodLabel: string;
    isCustomPeriod: boolean;
    onPresetPeriod: (label: string) => void;
    onCustomPeriodClick: () => void;
    onCustomPeriodChange: (val: string) => void;
}

export const PhScheduleDateTimeSection: React.FC<PhScheduleDateTimeSectionProps> = ({
    date,
    onDateChange,
    semester,
    dayInfo,
    holidayInfo,
    quickDateTargets,
    onSetQuickDate,
    onSetQuickNextMonday,
    periodLabel,
    isCustomPeriod,
    onPresetPeriod,
    onCustomPeriodClick,
    onCustomPeriodChange,
}) => {
    return (
        <div className="rounded-2xl border border-slate-200/80 bg-slate-50/50 p-4 space-y-3.5 dark:border-slate-800 dark:bg-slate-850/40">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                <Clock className="w-4 h-4 text-brand-600 dark:text-brand-400" />
                <span>1. Waktu &amp; Jam Pelaksanaan</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-stretch">
                {/* Left Column: Tanggal Pelaksanaan */}
                <div className="flex flex-col justify-between space-y-2.5">
                    <div className="space-y-2">
                        <div className="flex items-center justify-between gap-2">
                            <label
                                htmlFor="ph-modal-date"
                                className="block text-sm font-semibold text-slate-700 dark:text-slate-200"
                            >
                                Tanggal Pelaksanaan <span className="text-brand-500">*</span>
                            </label>
                            <span className="text-[11px] font-medium text-slate-400">
                                Pilih tanggal ujian
                            </span>
                        </div>

                        <Input
                            id="ph-modal-date"
                            type="date"
                            min={semester?.start_date}
                            max={semester?.end_date}
                            value={date}
                            onChange={(e) => onDateChange(e.target.value)}
                            className="h-11 rounded-xl font-medium bg-white dark:bg-slate-900"
                            required
                        />

                        {/* Full-width Day Status Banner */}
                        {dayInfo ? (
                            <div
                                className={`flex items-center justify-between gap-2 px-3 py-2 rounded-xl text-xs font-semibold border transition-colors ${
                                    holidayInfo
                                        ? 'bg-rose-500/10 text-rose-700 dark:text-rose-300 border-rose-500/25'
                                        : dayInfo.isWeekend
                                        ? 'bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/25'
                                        : 'bg-brand-500/8 text-brand-700 dark:text-brand-300 border-brand-500/20'
                                }`}
                            >
                                <div className="flex items-center gap-1.5 min-w-0">
                                    <Calendar className="w-3.5 h-3.5 shrink-0" />
                                    <span className="truncate">{dayInfo.formatted}</span>
                                </div>
                                {holidayInfo ? (
                                    <span className="shrink-0 text-[10px] bg-rose-500/20 text-rose-700 dark:text-rose-300 px-1.5 py-0.5 rounded-md font-bold uppercase tracking-wider">
                                        {holidayInfo.kind === 'CUTI' ? 'Cuti Bersama' : 'Tanggal Merah'}
                                    </span>
                                ) : dayInfo.isWeekend ? (
                                    <span className="shrink-0 text-[10px] bg-amber-500/20 text-amber-700 dark:text-amber-300 px-1.5 py-0.5 rounded-md font-bold uppercase tracking-wider">
                                        Akhir pekan
                                    </span>
                                ) : (
                                    <span className="shrink-0 text-[10px] bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 px-1.5 py-0.5 rounded-md font-bold">
                                        Hari Efektif
                                    </span>
                                )}
                            </div>
                        ) : (
                            <div className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs text-slate-400 border border-dashed border-slate-200 dark:border-slate-700">
                                <Calendar className="w-3.5 h-3.5 shrink-0" />
                                <span>Belum ada tanggal dipilih</span>
                            </div>
                        )}
                    </div>

                    {/* Equal-Width 3-Column Quick Date Shortcuts */}
                    <div className="grid grid-cols-3 gap-1.5 pt-0.5">
                        {[
                            { label: 'Hari Ini', date: quickDateTargets.today, onClick: () => onSetQuickDate(0) },
                            { label: 'Besok', date: quickDateTargets.tomorrow, onClick: () => onSetQuickDate(1) },
                            { label: 'Senin Depan', date: quickDateTargets.nextMonday, onClick: onSetQuickNextMonday },
                        ].map((shortcut) => {
                            const isActive = date === shortcut.date;
                            return (
                                <button
                                    key={shortcut.label}
                                    type="button"
                                    onClick={shortcut.onClick}
                                    className={`h-9 px-2 text-xs font-semibold rounded-xl border transition-all active:scale-95 whitespace-nowrap ${
                                        isActive
                                            ? 'bg-brand-50 dark:bg-brand-950/50 text-brand-700 dark:text-brand-300 border-brand-400 dark:border-brand-600 shadow-2xs'
                                            : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:text-brand-600 dark:hover:text-brand-400 border-slate-200 dark:border-slate-700 hover:border-brand-400/60'
                                    }`}
                                >
                                    {shortcut.label}
                                </button>
                            );
                        })}
                    </div>
                </div>

                {/* Right Column: Jam Pelajaran Ke- */}
                <div className="flex flex-col justify-between space-y-2.5">
                    <div className="space-y-2">
                        <div className="flex justify-between items-center gap-2">
                            <label className="block text-sm font-semibold text-slate-700 dark:text-slate-200">
                                Jam Pelajaran Ke- <span className="text-brand-500">*</span>
                            </label>
                            <span className="text-[11px] font-medium text-slate-400">
                                Pilih jam atau kustom
                            </span>
                        </div>

                        {/* 2x2 Spacious Preset Grid */}
                        <div className="grid grid-cols-2 gap-2">
                            {PERIOD_PRESETS.map((label) => {
                                const isSelected = !isCustomPeriod && periodLabel === label;
                                return (
                                    <button
                                        key={label}
                                        type="button"
                                        onClick={() => onPresetPeriod(label)}
                                        className={`h-11 px-3 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-1.5 border active:scale-95 whitespace-nowrap ${
                                            isSelected
                                                ? 'bg-brand-600 text-white border-brand-500 shadow-sm shadow-brand-500/20'
                                                : 'bg-white dark:bg-slate-800/90 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-700 hover:border-brand-400/60 hover:bg-slate-50 dark:hover:bg-slate-700/70'
                                        }`}
                                    >
                                        <Clock className="w-3.5 h-3.5 shrink-0 opacity-85" />
                                        <span>Jam {label}</span>
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    {/* Full-width Kustom Toggle / Input */}
                    <div className="space-y-2 pt-0.5">
                        <button
                            type="button"
                            onClick={onCustomPeriodClick}
                            className={`w-full h-9 px-3 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-1.5 border active:scale-95 whitespace-nowrap ${
                                isCustomPeriod
                                    ? 'bg-brand-600 text-white border-brand-500 shadow-sm shadow-brand-500/20'
                                    : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-brand-400/60 hover:text-brand-600 dark:hover:text-brand-400'
                            }`}
                        >
                            <span>+ Kustom</span>
                            <span className="font-normal opacity-80">(Jam Lainnya)</span>
                        </button>

                        {isCustomPeriod && (
                            <div className="animate-fade-in">
                                <Input
                                    type="text"
                                    value={periodLabel}
                                    onChange={(e) => onCustomPeriodChange(e.target.value)}
                                    placeholder="cth. 1-3 atau 7-8"
                                    className="h-10 rounded-xl font-medium bg-white dark:bg-slate-900 text-xs"
                                    autoFocus
                                    required
                                />
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};
