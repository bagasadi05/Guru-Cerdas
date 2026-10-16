import React from 'react';
import { SemesterSelector } from '../ui/SemesterSelector';
import { CalendarIcon, ChevronDownIcon } from 'lucide-react';
import { useI18n } from '../../utils/i18n';
import { attendanceCopy } from '../../locales/attendance';

interface AttendanceDateControlBarProps {
    selectedSemesterId: string | null;
    setSelectedSemesterId: (id: string | null) => void;
    selectedDate: string;
    today: string;
    setDatePickerOpen: (open: boolean) => void;
}

export const AttendanceDateControlBar: React.FC<AttendanceDateControlBarProps> = ({
    selectedSemesterId,
    setSelectedSemesterId,
    selectedDate,
    today,
    setDatePickerOpen,
}) => {
    const { language } = useI18n();
    const copy = attendanceCopy[language];
    return (
        <div className="flex flex-col lg:flex-row gap-3 lg:items-center mb-2 sm:mb-4">
            {/* Semester Selector */}
            <div className="flex flex-row items-center gap-2 sm:gap-3 lg:w-1/3 [&_button]:min-h-11">
                <span className="shrink-0 whitespace-nowrap text-sm font-medium text-slate-600 dark:text-slate-400">Semester:</span>
                <SemesterSelector
                    value={selectedSemesterId || 'all'}
                    onChange={(semId) => setSelectedSemesterId(semId === 'all' ? null : semId)}
                    size="sm"
                    includeAllOption={false}
                    className="min-w-0 flex-1"
                />
            </div>

            {/* Date Picker Banner */}
            <div className="relative z-10 min-w-0 transition-all rounded-xl flex-1 shadow-sm">
                <button
                    type="button"
                    className="group relative overflow-hidden w-full rounded-xl bg-gradient-to-r from-brand-600 via-brand-700 to-brand-800 dark:from-brand-700 dark:via-brand-800 dark:to-brand-900 cursor-pointer text-left active:scale-[0.99] transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-slate-900"
                    onClick={() => setDatePickerOpen(true)}
                    aria-label="Pilih tanggal absensi"
                >
                    <div className="relative p-3 sm:p-4 flex items-center justify-between gap-2">
                        <div className="flex items-center gap-3 sm:gap-4 flex-1 min-w-0">
                            <div className="hidden sm:flex w-12 h-12 rounded-xl bg-white/20 items-center justify-center text-white border border-white/20 flex-shrink-0">
                                <CalendarIcon className="w-5 h-5 sm:w-6 sm:h-6" />
                            </div>
                            <div className="text-left flex-1 min-w-0">
                                <div className="flex flex-wrap items-center gap-x-2 gap-y-1 mb-1">
                                    <p className="text-xs font-semibold text-emerald-100">{copy.date}</p>
                                    {selectedDate === today && <span className="text-xs font-semibold text-white rounded-full bg-white/15 px-2 py-0.5">{copy.today}</span>}
                                </div>
                                <h2 className="text-sm sm:text-xl font-bold text-white leading-snug break-words">
                                    {new Date(selectedDate).toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
                                </h2>
                            </div>
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-lg bg-white/10 flex items-center justify-center border border-white/20 group-hover:bg-white/20 transition-colors">
                                <ChevronDownIcon className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
                            </div>
                        </div>
                    </div>
                </button>
            </div>
        </div>
    );
};
