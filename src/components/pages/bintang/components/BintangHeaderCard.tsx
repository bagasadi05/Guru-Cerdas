import React from 'react';
import { Star, Users } from 'lucide-react';
import { CustomDropdown } from '../../../ui/CustomDropdown';

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
    studentCount: number;
    isLoading: boolean;
}

export const BintangHeaderCard: React.FC<BintangHeaderCardProps> = ({
    classes,
    selectedClass,
    onSelectClass,
    selectedMonth,
    onSelectMonth,
    studentCount,
    isLoading,
}) => {
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
                <div className="flex flex-col sm:flex-row gap-2.5 w-full lg:w-auto sm:min-w-[400px]">
                    <div className="flex-1 min-w-[180px]">
                        <CustomDropdown
                            value={selectedClass}
                            onChange={onSelectClass}
                            placeholder="Pilih Kelas"
                            options={classes.map((c) => ({ value: c.id, label: c.name }))}
                        />
                    </div>
                    <div className="flex-1 min-w-[190px]">
                        <CustomDropdown
                            value={selectedMonth}
                            onChange={onSelectMonth}
                            options={MONTH_OPTIONS}
                        />
                    </div>
                </div>
            </div>
        </div>
    );
};
