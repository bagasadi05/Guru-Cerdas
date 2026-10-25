import React from 'react';
import { AlertTriangle } from 'lucide-react';
import { MAX_ASH_PER_DAY } from '../../engine/phScheduleValidation';
import { getDayInfo } from '../../utils/phScheduleTopicPresets';
import type { PhScheduleRow } from '../../../../types/database';

interface PhScheduleFormWarningsProps {
    holidayInfo: { name: string; kind?: string } | null;
    isDailyQuotaFull: boolean;
    sameDaySchedules: PhScheduleRow[];
    nextAvailableDate: string | null;
    conflictSchedule: PhScheduleRow | null | undefined;
    validationError: string | null;
    onSelectDate: (date: string) => void;
}

export const PhScheduleFormWarnings: React.FC<PhScheduleFormWarningsProps> = ({
    holidayInfo,
    isDailyQuotaFull,
    sameDaySchedules,
    nextAvailableDate,
    conflictSchedule,
    validationError,
    onSelectDate,
}) => {
    return (
        <>
            {/* Kaldik Holiday Warning */}
            {holidayInfo && (
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-800 dark:text-amber-200 text-xs">
                    <div className="flex items-start gap-2.5">
                        <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                        <div>
                            <span className="font-bold">
                                Peringatan Kalender Pendidikan ({holidayInfo.kind === 'CUTI' ? 'Cuti Bersama' : 'Libur Nasional'})
                            </span>
                            <p className="text-xs opacity-90 mt-0.5">
                                Tanggal yang dipilih bertepatan dengan hari libur resmi: <strong>{holidayInfo.name}</strong>. Pastikan sekolah tetap mengadakan KBM pada tanggal tersebut atau pilih hari efektif berikutnya.
                            </p>
                        </div>
                    </div>
                    {nextAvailableDate && (
                        <button
                            type="button"
                            onClick={() => onSelectDate(nextAvailableDate)}
                            className="shrink-0 min-h-[38px] px-3 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs transition-colors cursor-pointer"
                        >
                            Pilih Hari Efektif ({getDayInfo(nextAvailableDate)?.formatted || nextAvailableDate})
                        </button>
                    )}
                </div>
            )}

            {/* Daily Quota Exceeded Warning (Max 2 ASH per day) */}
            {isDailyQuotaFull && (
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-700 dark:text-rose-300 text-xs">
                    <div className="flex items-start gap-2.5">
                        <AlertTriangle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
                        <div>
                            <span className="font-bold">
                                Kuota Harian Penuh (Maksimal {MAX_ASH_PER_DAY} ASH per Hari)
                            </span>
                            <p className="text-xs opacity-90 mt-0.5">
                                Tanggal ini sudah terisi {sameDaySchedules.length} jadwal ASH:{' '}
                                <strong>
                                    {sameDaySchedules
                                        .map((s) => `${s.subject} (Jam ${s.period_label})`)
                                        .join(' & ')}
                                </strong>
                                . Silakan pilih tanggal lain.
                            </p>
                        </div>
                    </div>
                    {nextAvailableDate && (
                        <button
                            type="button"
                            onClick={() => onSelectDate(nextAvailableDate)}
                            className="shrink-0 min-h-[38px] px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs transition-colors cursor-pointer"
                        >
                            Pilih Hari Kosong ({getDayInfo(nextAvailableDate)?.formatted || nextAvailableDate})
                        </button>
                    )}
                </div>
            )}

            {/* Inline Conflict Warning */}
            {!isDailyQuotaFull && conflictSchedule && (
                <div className="flex items-start gap-2.5 p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-700 dark:text-amber-300 text-xs">
                    <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                    <div>
                        <span className="font-bold">Jam pelajaran bertumpang tindih</span>
                        <p className="text-xs opacity-90 mt-0.5">
                            Sudah ada jadwal ASH <strong>"{conflictSchedule.subject}"</strong> pada Jam{' '}
                            {conflictSchedule.period_label} di tanggal yang sama.
                        </p>
                    </div>
                </div>
            )}

            {/* Validation Error */}
            {validationError && !isDailyQuotaFull && (
                <p role="status" className="text-sm font-medium text-amber-700 dark:text-amber-300">
                    {validationError}
                </p>
            )}
        </>
    );
};
