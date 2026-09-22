import React from 'react';
import { Sparkles, CalendarClock, Loader2, XIcon, CheckCircle2 } from 'lucide-react';
import { Button } from '../ui/Button';

interface AttendanceAssistantBannersProps {
    missingWeekdays: { date: string; formattedDate: string }[];
    isAssistantDismissed: boolean;
    setIsAssistantDismissed: (dismissed: boolean) => void;
    handleAutoFillWeekdays: () => Promise<void> | void;
    isAutoFilling: boolean;
    isCurrentDateAutoFilled: boolean;
    isAutoFillBannerDismissed: boolean;
    setIsAutoFillBannerDismissed: (dismissed: boolean) => void;
}

export const AttendanceAssistantBanners: React.FC<AttendanceAssistantBannersProps> = ({
    missingWeekdays,
    isAssistantDismissed,
    setIsAssistantDismissed,
    handleAutoFillWeekdays,
    isAutoFilling,
    isCurrentDateAutoFilled,
    isAutoFillBannerDismissed,
    setIsAutoFillBannerDismissed,
}) => {
    return (
        <>
            {/* Smart Assistant: Missing Weekdays Reminder */}
            {missingWeekdays.length > 0 && !isAssistantDismissed && (
                <div className="mb-4 p-3.5 sm:p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/60 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-3 animate-fade-in">
                    <div className="flex items-start gap-3">
                        <div className="p-2 rounded-xl bg-amber-100 dark:bg-amber-900/50 text-amber-700 dark:text-amber-400 shrink-0 mt-0.5">
                            <Sparkles size={18} />
                        </div>
                        <div>
                            <div className="flex items-center gap-2 flex-wrap">
                                <h4 className="text-xs sm:text-sm font-bold text-amber-900 dark:text-amber-200">
                                    Pengingat Absensi Hari Terlewat
                                </h4>
                                <span className="text-[10px] sm:text-[11px] px-2 py-0.5 rounded-full bg-amber-200 dark:bg-amber-900 text-amber-800 dark:text-amber-300 font-semibold">
                                    {missingWeekdays.length} hari belum diabsen
                                </span>
                            </div>
                            <p className="text-[11px] sm:text-xs text-amber-800/90 dark:text-amber-300/90 mt-0.5 leading-relaxed">
                                Kelas ini belum diabsen pada: <strong className="font-semibold">{missingWeekdays.map(m => m.formattedDate).join(', ')}</strong>.
                                Setiap Sabtu sore sistem otomatis mengisinya sebagai <em>Hadir</em>, atau Anda dapat mengisinya sekarang secara instan.
                            </p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2 w-full md:w-auto justify-end shrink-0">
                        <Button
                            variant="primary"
                            size="sm"
                            onClick={() => handleAutoFillWeekdays()}
                            disabled={isAutoFilling}
                            className="bg-amber-600 hover:bg-amber-700 text-white shadow-sm border-none font-semibold text-xs px-3 py-1.5 h-auto min-h-[36px] rounded-xl cursor-pointer active:scale-95 transition-all"
                        >
                            {isAutoFilling ? (
                                <>
                                    <Loader2 size={14} className="mr-1.5 animate-spin" />
                                    Mengisi...
                                </>
                            ) : (
                                <>
                                    <CalendarClock size={14} className="mr-1.5" />
                                    Isi Hadir Semua
                                </>
                            )}
                        </Button>
                        <button
                            type="button"
                            onClick={() => setIsAssistantDismissed(true)}
                            className="p-1.5 text-amber-700 dark:text-amber-400 hover:bg-amber-200/60 dark:hover:bg-amber-900/40 rounded-lg transition-colors cursor-pointer active:scale-90"
                            title="Tutup pengingat"
                            aria-label="Tutup pengingat"
                        >
                            <XIcon size={16} />
                        </button>
                    </div>
                </div>
            )}

            {/* Auto-filled Date Indicator Banner */}
            {isCurrentDateAutoFilled && !isAutoFillBannerDismissed && (
                <div className="mb-4 p-3 rounded-2xl bg-emerald-50/90 dark:bg-emerald-950/25 border border-emerald-200/80 dark:border-emerald-800/50 flex items-center justify-between gap-3 text-xs text-emerald-800 dark:text-emerald-300 animate-fade-in">
                    <div className="flex items-center gap-2.5">
                        <CheckCircle2 size={16} className="text-emerald-600 dark:text-emerald-400 shrink-0" />
                        <span>
                            <strong>Absensi Terisi Otomatis:</strong> Data kehadiran tanggal ini diisi otomatis oleh sistem sebagai <em>Hadir</em>. Anda dapat mengedit siswa yang Sakit, Izin, atau Alpha seperti biasa.
                        </span>
                    </div>
                    <button
                        type="button"
                        onClick={() => setIsAutoFillBannerDismissed(true)}
                        className="p-1 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-200/50 dark:hover:bg-emerald-900/40 rounded-lg transition-colors shrink-0 cursor-pointer active:scale-90"
                        title="Tutup pemberitahuan"
                        aria-label="Tutup pemberitahuan"
                    >
                        <XIcon size={15} />
                    </button>
                </div>
            )}
        </>
    );
};
