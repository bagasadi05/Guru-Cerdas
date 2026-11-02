import React, { useMemo } from 'react';
import { Star, Users, Calendar, RotateCcw } from 'lucide-react';
import { CustomDropdown } from '../../../ui/CustomDropdown';
import { compareClassNames } from '../../../../utils/academicRecordUtils';

function getRecentMonthOptions() {
    const nowWib = new Date(Date.now() + 7 * 60 * 60 * 1000);
    return Array.from({ length: 6 }).map((_, i) => {
        const d = new Date(nowWib.getUTCFullYear(), nowWib.getUTCMonth() - i, 1);
        const val = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
        const label = d.toLocaleDateString('id-ID', {
            month: 'long',
            year: 'numeric',
        });
        return { value: val, label };
    });
}

const MONTH_OPTIONS = getRecentMonthOptions();

interface BintangHeaderCardProps {
    classes: Array<{ id: string; name: string }>;
    selectedClass: string;
    onSelectClass: (id: string) => void;
    selectedMonth: string;
    onSelectMonth: (month: string) => void;
    selectedPrintDate: string;
    onSelectPrintDate: (date: string) => void;
    onResetPrintDate?: () => void;
    isPrintDateCustom?: boolean;
    studentCount: number;
    isLoading: boolean;
}

export const BintangHeaderCard: React.FC<BintangHeaderCardProps> = ({
    classes,
    selectedClass,
    onSelectClass,
    selectedMonth,
    onSelectMonth,
    selectedPrintDate,
    onSelectPrintDate,
    onResetPrintDate,
    isPrintDateCustom,
    studentCount,
    isLoading,
}) => {
    const classOptions = useMemo(() => {
        return [...classes]
            .sort((a, b) => compareClassNames(a.name, b.name))
            .map((c) => ({ value: c.id, label: c.name }));
    }, [classes]);

    return (
        <div className="relative z-20 bg-white dark:bg-slate-800/90 rounded-2xl border border-slate-200/80 dark:border-slate-700/80 shadow-xs">
            <div className="h-1.5 w-full rounded-t-2xl bg-gradient-to-r from-amber-500 via-emerald-500 to-teal-500" />
            <div className="p-4 sm:p-5 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                <div className="flex items-center gap-3.5 min-w-0">
                    <div className="w-12 h-12 rounded-2xl bg-amber-500 text-white shadow-sm shadow-amber-500/25 flex items-center justify-center shrink-0">
                        <Star size={24} className="fill-white/25" />
                    </div>
                    <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                            <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight">
                                Program BINTANG
                            </h1>
                            {selectedClass && !isLoading && (
                                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg text-xs font-semibold bg-slate-100 dark:bg-slate-700/70 text-slate-700 dark:text-slate-200 border border-slate-200/80 dark:border-slate-600/60">
                                    <Users size={12} className="text-brand-500" />
                                    {studentCount} Siswa
                                </span>
                            )}
                        </div>
                        <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5">
                            Bina Tertib &amp; Tanggung Jawab Siswa
                        </p>
                    </div>
                </div>

                {/* Filters */}
                <div className="flex flex-col sm:flex-row items-stretch sm:items-end gap-2.5 w-full lg:w-auto">
                    <div className="min-w-[155px] flex-1 sm:flex-initial">
                        <label className="block text-[11px] font-semibold text-slate-500 dark:text-slate-400 mb-1 px-1">
                            Kelas
                        </label>
                        <CustomDropdown
                            value={selectedClass}
                            onChange={onSelectClass}
                            placeholder="Pilih Kelas"
                            options={classOptions}
                        />
                    </div>
                    <div className="min-w-[160px] flex-1 sm:flex-initial">
                        <label className="block text-[11px] font-semibold text-slate-500 dark:text-slate-400 mb-1 px-1">
                            Bulan Rapor
                        </label>
                        <CustomDropdown
                            value={selectedMonth}
                            onChange={onSelectMonth}
                            options={MONTH_OPTIONS}
                        />
                    </div>
                    <div className="min-w-[165px] flex-1 sm:flex-initial" title="Tanggal Cetak Rapor (tertera pada lembar tanda tangan rapor)">
                        <div className="flex items-center justify-between text-[11px] font-semibold text-slate-500 dark:text-slate-400 mb-1 px-1">
                            <label htmlFor="bintang-print-date-input" className="cursor-pointer">
                                Tgl Cetak
                            </label>
                            {isPrintDateCustom && onResetPrintDate && (
                                <button
                                    type="button"
                                    onClick={onResetPrintDate}
                                    className="inline-flex items-center gap-1 text-[10px] font-bold text-brand-600 dark:text-brand-400 hover:underline"
                                    title="Kembalikan ke tanggal akhir bulan"
                                >
                                    <RotateCcw size={10} />
                                    <span>Reset</span>
                                </button>
                            )}
                        </div>
                        <div className="relative w-full">
                            <Calendar size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                            <input
                                id="bintang-print-date-input"
                                type="date"
                                value={selectedPrintDate}
                                onChange={(e) => onSelectPrintDate(e.target.value)}
                                aria-label="Tanggal Cetak Rapor"
                                className={`w-full min-h-[48px] h-12 pl-9 ${isPrintDateCustom ? 'pr-9' : 'pr-3'} py-2 text-xs sm:text-sm font-medium rounded-xl border ${
                                    isPrintDateCustom
                                        ? 'border-brand-500/80 bg-brand-50/20 dark:bg-brand-950/20 text-slate-900 dark:text-slate-100 ring-1 ring-brand-500/30'
                                        : 'border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5 text-slate-900 dark:text-white'
                                } focus:outline-none focus:ring-2 focus:ring-brand-500 cursor-pointer shadow-xs transition-colors`}
                            />
                            {isPrintDateCustom && onResetPrintDate && (
                                <button
                                    type="button"
                                    onClick={onResetPrintDate}
                                    title="Kembalikan ke akhir bulan"
                                    aria-label="Kembalikan tanggal cetak ke akhir bulan"
                                    className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-200/50 dark:hover:bg-slate-700/50 transition-colors"
                                >
                                    <RotateCcw size={13} />
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
