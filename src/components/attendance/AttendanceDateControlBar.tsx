import React from 'react';
import { SemesterSelector } from '../ui/SemesterSelector';
import { CalendarIcon, ChevronDownIcon } from 'lucide-react';

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
    return (
        <div className="flex flex-col lg:flex-row gap-4 lg:items-center mb-6">
            {/* Semester Selector */}
            <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3 lg:w-1/3">
                <span className="text-sm font-medium text-slate-600 dark:text-slate-400">Semester:</span>
                <SemesterSelector
                    value={selectedSemesterId || 'all'}
                    onChange={(semId) => setSelectedSemesterId(semId === 'all' ? null : semId)}
                    size="sm"
                    includeAllOption={false}
                    className="w-full"
                />
            </div>

            {/* Date Picker Banner */}
            <div className="relative z-10 p-3 sm:p-0 -mx-4 px-4 sm:mx-0 transition-all rounded-xl overflow-hidden flex-1 shadow-md mb-2">
                <button
                    type="button"
                    className="group relative overflow-hidden w-full rounded-xl bg-gradient-to-r from-brand-600 via-brand-700 to-brand-800 dark:from-brand-700 dark:via-brand-800 dark:to-brand-900 cursor-pointer text-left active:scale-[0.99] transition-all duration-200"
                    onClick={() => setDatePickerOpen(true)}
                    aria-label="Pilih tanggal absensi"
                >
                    <div className="relative p-3 sm:p-4 flex items-center justify-between gap-3">
                        <div className="flex items-center gap-3 sm:gap-4 flex-1 min-w-0">
                            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-lg sm:rounded-xl bg-white/20 backdrop-blur-md flex items-center justify-center text-white shadow-inner border border-white/20 group-hover:scale-105 transition-transform duration-300 flex-shrink-0">
                                <CalendarIcon className="w-5 h-5 sm:w-6 sm:h-6" />
                            </div>
                            <div className="text-left flex-1 min-w-0">
                                <p className="text-xs sm:text-xs font-bold uppercase tracking-wider text-green-100 mb-0.5">Tanggal Absensi</p>
                                <h2 className="text-sm sm:text-xl font-bold text-white leading-tight truncate">
                                    {new Date(selectedDate).toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
                                </h2>
                            </div>
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                            {selectedDate === today && (
                                <>
                                    <span className="hidden sm:inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold bg-white/20 text-white border border-white/20 backdrop-blur-sm">HARI INI</span>
                                    <span className="sm:hidden inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold bg-white/20 text-white border border-white/20">HARI INI</span>
                                </>
                            )}
                            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-lg bg-white/10 backdrop-blur-md flex items-center justify-center border border-white/20 group-hover:bg-white/20 transition-colors">
                                <ChevronDownIcon className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
                            </div>
                        </div>
                    </div>
                </button>
            </div>
        </div>
    );
};
