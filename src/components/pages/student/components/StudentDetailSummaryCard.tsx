import React from 'react';
import { SemesterSelector } from '../../../ui/SemesterSelector';
import { CheckCircle2, AlertCircle, XCircle, ShieldAlert } from 'lucide-react';

export type AttendanceSummaryMap = Record<'Hadir' | 'Izin' | 'Sakit' | 'Alpha', number> & Record<string, number>;

export const ATTENDANCE_STAT_CONFIGS = [
    { key: 'Hadir' as const, label: 'Hadir', unit: 'hari', badgeBg: 'bg-emerald-600', icon: CheckCircle2 },
    { key: 'Izin' as const, label: 'Izin', unit: 'hari', badgeBg: 'bg-blue-600', icon: AlertCircle },
    { key: 'Sakit' as const, label: 'Sakit', unit: 'hari', badgeBg: 'bg-amber-500', icon: AlertCircle },
    { key: 'Alpha' as const, label: 'Alpha', unit: 'hari', badgeBg: 'bg-rose-600', icon: XCircle },
] as const;

interface StudentDetailSummaryCardProps {
    selectedSemesterId: string | null;
    selectedSemesterLabel: string;
    onSelectSemesterId: (semId: string | null) => void;
    attendanceSummary: AttendanceSummaryMap;
    totalViolationPoints: number;
}

export const StudentDetailSummaryCard: React.FC<StudentDetailSummaryCardProps> = ({
    selectedSemesterId,
    selectedSemesterLabel,
    onSelectSemesterId,
    attendanceSummary,
    totalViolationPoints,
}) => {
    return (
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-4 py-2.5 bg-slate-50/70 dark:bg-slate-800/60 border-b border-slate-100 dark:border-slate-700/80">
                <div className="flex items-center gap-2 min-w-0">
                    <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 shrink-0">Ringkasan</span>
                    <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 border border-emerald-200/60 dark:border-emerald-800/40 truncate">
                        {selectedSemesterLabel}
                    </span>
                </div>
                <div className="flex items-center gap-2 w-full sm:w-auto">
                    <span className="text-xs font-medium text-slate-500 dark:text-slate-400 shrink-0">Semester:</span>
                    <SemesterSelector
                        value={selectedSemesterId || 'all'}
                        onChange={(semId) => onSelectSemesterId(semId === 'all' ? null : semId)}
                        size="sm"
                        includeAllOption={true}
                        className="w-full sm:w-56"
                    />
                </div>
            </div>

            <section aria-label={`Ringkasan ${selectedSemesterLabel}`} className="p-3 sm:p-4">
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
                    {ATTENDANCE_STAT_CONFIGS.map((item) => (
                        <div
                            key={item.key}
                            className="bg-slate-50/80 dark:bg-slate-900/60 rounded-2xl border border-slate-200/80 dark:border-slate-700/60 p-3 sm:p-3.5 flex items-center gap-3 transition-all hover:border-slate-300 dark:hover:border-slate-600 shadow-xs"
                        >
                            <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 shadow-sm ${item.badgeBg}`}>
                                <item.icon className="w-5 h-5 text-white" strokeWidth={2.2} />
                            </div>
                            <div className="flex flex-col justify-center min-w-0">
                                <p className="text-base sm:text-lg font-bold text-slate-900 dark:text-white leading-tight truncate">
                                    {attendanceSummary[item.key]} {item.unit}
                                </p>
                                <p className="text-xs text-slate-500 dark:text-slate-400 font-medium truncate mt-0.5">
                                    {item.label}
                                </p>
                            </div>
                        </div>
                    ))}
                    <div className="col-span-2 sm:col-span-1 lg:col-span-1 bg-slate-50/80 dark:bg-slate-900/60 rounded-2xl border border-slate-200/80 dark:border-slate-700/60 p-3 sm:p-3.5 flex items-center gap-3 transition-all hover:border-slate-300 dark:hover:border-slate-600 shadow-xs">
                        <div className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0 shadow-sm bg-red-700">
                            <ShieldAlert className="w-5 h-5 text-white" strokeWidth={2.2} />
                        </div>
                        <div className="flex flex-col justify-center min-w-0">
                            <p className="text-base sm:text-lg font-bold text-slate-900 dark:text-white leading-tight truncate">
                                {totalViolationPoints}
                            </p>
                            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium truncate mt-0.5">
                                Poin Pelanggaran
                            </p>
                        </div>
                    </div>
                </div>
            </section>
        </div>
    );
};
