import React, { useMemo } from 'react';
import { Calendar, Save, CheckSquare, Activity, Info, CalendarOff, FileText, FileSpreadsheet, CheckCircle2, XCircle } from 'lucide-react';
import { DatePicker } from '../../ui/DatePicker';
import { EnrollmentView } from './types';
import { getStudentAvatar } from '../../../utils/avatarUtils';

interface AttendanceTabProps {
    extracurricularId: string;
    enrollments: EnrollmentView[];
    selectedDate: string;
    onDateChange: (date: string) => void;
    attendanceMap: Record<string, string>;
    localAttendance: Record<string, string>;
    autoSaveAttendance: boolean;
    onToggleAutoSave: (enabled: boolean) => void;
    onAttendanceClick: (studentId: string, studentType: 'student' | 'extracurricular_student', status: string) => void;
    onMarkAll: (status: string) => void;
    onSaveManual: () => void;
    isSaving: boolean;
    onExportPDF: () => void;
    onExportExcel: () => void;
}

export const AttendanceTab: React.FC<AttendanceTabProps> = ({
    extracurricularId: _extracurricularId,
    enrollments,
    selectedDate,
    onDateChange,
    attendanceMap,
    localAttendance,
    autoSaveAttendance,
    onToggleAutoSave,
    onAttendanceClick,
    onMarkAll,
    onSaveManual,
    isSaving,
    onExportPDF,
    onExportExcel
}) => {
    // Merged attendance for display (server + local)
    const mergedAttendance = useMemo(() => {
        return { ...attendanceMap, ...localAttendance };
    }, [attendanceMap, localAttendance]);

    const pendingChangesCount = Object.keys(localAttendance).length;
    
    const enrollmentsSortedByName = useMemo(() => {
        return [...enrollments].sort((a, b) => a.name.localeCompare(b.name));
    }, [enrollments]);

    return (
        <div className="space-y-6 animate-in fade-in duration-300">
            {/* Header / Date & Export Controls */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h3 className="text-lg font-bold text-slate-800 dark:text-white flex items-center gap-2">
                        <Calendar className="w-5 h-5 text-amber-500" />
                        Presensi Harian
                    </h3>
                    <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                        Pilih tanggal dan catat kehadiran anggota ekstrakurikuler.
                    </p>
                </div>
                
                <div className="flex flex-wrap items-center gap-2 bg-slate-50 dark:bg-slate-900/50 p-2 rounded-2xl border border-slate-200 dark:border-slate-800">
                    <button type="button"
                        onClick={onExportPDF}
                        disabled={enrollments.length === 0}
                        className="flex items-center justify-center w-10 h-10 bg-white dark:bg-slate-800 text-red-600 dark:text-red-400 border border-slate-200 dark:border-slate-700 rounded-xl hover:bg-red-50 dark:hover:bg-red-900/20 hover:border-red-200 transition-colors disabled:opacity-50"
                        title="Export Rekap Bulanan PDF"
                    >
                        <FileText className="w-5 h-5" />
                    </button>
                    <button type="button"
                        onClick={onExportExcel}
                        disabled={enrollments.length === 0}
                        className="flex items-center justify-center w-10 h-10 bg-white dark:bg-slate-800 text-emerald-600 dark:text-emerald-400 border border-slate-200 dark:border-slate-700 rounded-xl hover:bg-emerald-50 dark:hover:bg-emerald-900/20 hover:border-emerald-200 transition-colors disabled:opacity-50"
                        title="Export Rekap Bulanan Excel"
                    >
                        <FileSpreadsheet className="w-5 h-5" />
                    </button>
                    <div className="h-6 w-px bg-slate-300 dark:bg-slate-700 mx-1" />
                    <DatePicker
                        value={selectedDate}
                        onChange={(date) => onDateChange(date)}
                        className="min-w-[160px]"
                        align="right"
                    />
                </div>
            </div>

            {/* Quick Actions & Stats */}
            <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-5 shadow-sm">
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 mb-6">
                    {/* Auto/Manual Save Toggle */}
                    <div className="flex items-center gap-3">
                        <span className="text-sm font-semibold text-slate-600 dark:text-slate-300">Mode Simpan:</span>
                        <div className="flex bg-slate-100 dark:bg-slate-900 p-1 rounded-xl border border-slate-200 dark:border-slate-700">
                            <button type="button"
                                onClick={() => onToggleAutoSave(true)}
                                className={`px-4 py-1.5 text-sm font-medium rounded-lg transition-all ${
                                    autoSaveAttendance 
                                        ? 'bg-white dark:bg-slate-800 text-amber-600 dark:text-amber-400 shadow-sm' 
                                        : 'text-slate-500 hover:text-slate-700 dark:text-slate-400'
                                }`}
                            >
                                ⚡ Otomatis
                            </button>
                            <button type="button"
                                onClick={() => onToggleAutoSave(false)}
                                className={`relative px-4 py-1.5 text-sm font-medium rounded-lg transition-all ${
                                    !autoSaveAttendance 
                                        ? 'bg-white dark:bg-slate-800 text-amber-600 dark:text-amber-400 shadow-sm' 
                                        : 'text-slate-500 hover:text-slate-700 dark:text-slate-400'
                                }`}
                            >
                                ✋ Manual
                                {!autoSaveAttendance && pendingChangesCount > 0 && (
                                    <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-red-500 rounded-full animate-pulse" />
                                )}
                            </button>
                        </div>
                    </div>

                    {/* Bulk Actions */}
                    <div className="grid grid-cols-2 sm:flex sm:flex-wrap items-center gap-2 mt-3 sm:mt-0">
                        <span className="text-sm font-semibold text-slate-500 dark:text-slate-400 mr-2 hidden sm:inline col-span-2">Tandai Semua:</span>
                        {[
                            { label: 'Hadir', status: 'Hadir', icon: CheckSquare, color: 'text-emerald-700 dark:text-emerald-400', bg: 'bg-emerald-50 dark:bg-emerald-900/20 hover:bg-emerald-100 dark:hover:bg-emerald-900/40', border: 'border-emerald-200 dark:border-emerald-800/50' },
                            { label: 'Sakit', status: 'Sakit', icon: Activity, color: 'text-sky-700 dark:text-sky-400', bg: 'bg-sky-50 dark:bg-sky-900/20 hover:bg-sky-100 dark:hover:bg-sky-900/40', border: 'border-sky-200 dark:border-sky-800/50' },
                            { label: 'Izin', status: 'Izin', icon: Info, color: 'text-amber-700 dark:text-amber-400', bg: 'bg-amber-50 dark:bg-amber-900/20 hover:bg-amber-100 dark:hover:bg-amber-900/40', border: 'border-amber-200 dark:border-amber-800/50' },
                            { label: 'Libur', status: 'Libur', icon: CalendarOff, color: 'text-purple-700 dark:text-purple-400', bg: 'bg-purple-50 dark:bg-purple-900/20 hover:bg-purple-100 dark:hover:bg-purple-900/40', border: 'border-purple-200 dark:border-purple-800/50' },
                        ].map((btn) => (
                            <button type="button"
                                key={btn.status}
                                onClick={() => onMarkAll(btn.status)}
                                className={`flex items-center justify-center gap-1.5 px-3 py-2 sm:py-1.5 text-xs font-medium rounded-lg border transition-colors ${btn.bg} ${btn.color} ${btn.border}`}
                            >
                                <btn.icon className="w-4 h-4 sm:w-3.5 sm:h-3.5" />
                                {btn.label}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Statistics Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                    {[
                        { label: 'Hadir', key: 'Hadir', color: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-50/50 dark:bg-emerald-900/10' },
                        { label: 'Sakit', key: 'Sakit', color: 'text-sky-600 dark:text-sky-400', bg: 'bg-sky-50/50 dark:bg-sky-900/10' },
                        { label: 'Izin', key: 'Izin', color: 'text-amber-600 dark:text-amber-400', bg: 'bg-amber-50/50 dark:bg-amber-900/10' },
                        { label: 'Alpha', key: 'Alpha', color: 'text-rose-600 dark:text-rose-400', bg: 'bg-rose-50/50 dark:bg-rose-900/10' },
                        { label: 'Libur', key: 'Libur', color: 'text-purple-600 dark:text-purple-400', bg: 'bg-purple-50/50 dark:bg-purple-900/10' },
                    ].map((stat, idx) => {
                        const count = enrollments.reduce((acc, curr) => {
                            const key = `${curr.participantType}:${curr.participantId}`;
                            return mergedAttendance[key] === stat.key ? acc + 1 : acc;
                        }, 0);
                        return (
                            <div key={stat.key} className={`rounded-xl p-3 border border-slate-100 dark:border-slate-800 ${stat.bg} flex flex-col items-center justify-center ${idx === 0 ? 'col-span-2 sm:col-span-1' : ''}`}>
                                <p className={`text-xxs font-bold tracking-wider ${stat.color} uppercase mb-1`}>{stat.label}</p>
                                <p className={`text-2xl font-black ${stat.color}`}>{count}</p>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Attendance Table */}
            <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden shadow-sm">
                {enrollments.length === 0 ? (
                    <div className="text-center py-16 bg-slate-50/50 dark:bg-slate-900/20">
                        <Calendar className="w-12 h-12 mx-auto text-slate-300 dark:text-slate-600 mb-4" />
                        <p className="text-slate-500 dark:text-slate-400">Belum ada anggota yang terdaftar di ekstrakurikuler ini.</p>
                    </div>
                ) : (
                    <div className="space-y-2 lg:space-y-3">
                        {enrollmentsSortedByName.map((enrollment, index) => {
                            const key = `${enrollment.participantType}:${enrollment.participantId}`;
                            const currentStatus = mergedAttendance[key] || '';

                            return (
                                <div
                                    key={enrollment.id}
                                    id={`student-${enrollment.id}`}
                                    className={`
                                        group flex flex-col p-4 rounded-2xl bg-white dark:bg-slate-900/50 border border-slate-100 dark:border-white/5 shadow-sm 
                                        hover:shadow-lg hover:border-emerald-200 dark:hover:border-emerald-500/30 
                                        transition-all duration-300 card-interactive animate-list-item
                                    `}
                                    style={{ animationDelay: `${Math.min(index * 50, 300)}ms` }}
                                >
                                    {/* 1. Student Info (Top Row) */}
                                    <div className="flex items-center gap-4 min-w-0">
                                        <span className="hidden lg:block text-slate-300 dark:text-slate-600 font-bold font-mono w-8 text-right flex-shrink-0 text-sm">{index + 1}</span>
                                        <div className="relative">
                                            <img
                                                src={getStudentAvatar(null, null, enrollment.participantId, enrollment.name)}
                                                alt={enrollment.name}
                                                loading="lazy"
                                                decoding="async"
                                                className="w-12 h-12 rounded-full object-cover border-2 border-white dark:border-slate-700 shadow-sm"
                                            />
                                        </div>
                                        <div className="min-w-0 flex-1">
                                            <h4 className="font-bold text-sm lg:text-base leading-snug text-slate-800 dark:text-white truncate uppercase tracking-wide">
                                                {enrollment.name}
                                            </h4>
                                            {currentStatus ? (
                                                <p className="text-sm text-slate-500 dark:text-slate-400 truncate mt-0.5">
                                                    Status: <span className="font-semibold text-slate-700 dark:text-slate-200">{currentStatus}</span>
                                                </p>
                                            ) : (
                                                <p className="text-sm font-semibold text-amber-500 dark:text-amber-400 truncate mt-0.5">
                                                    Belum diabsen
                                                </p>
                                            )}
                                            {enrollment.participantType === 'extracurricular_student' && (
                                                <span className="inline-flex items-center px-2 py-0.5 rounded text-xxs font-medium bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400 mt-1">
                                                    Siswa Ekskul
                                                </span>
                                            )}
                                            {enrollment.className && (
                                                <span className="inline-flex items-center px-2 py-0.5 rounded text-xxs font-medium bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400 mt-1 ml-1">
                                                    {enrollment.className}
                                                </span>
                                            )}
                                        </div>
                                    </div>

                                    {/* 2. Attendance Buttons (Middle Row) */}
                                    <div className="mt-5 bg-slate-50 dark:bg-slate-800/60 p-2.5 rounded-2xl border border-slate-100 dark:border-slate-700/50">
                                        <div className="grid grid-cols-5 gap-1 lg:gap-2 w-full">
                                            {[
                                                { id: 'Hadir', label: 'H', fullLabel: 'Hadir', icon: CheckCircle2, activeClass: 'bg-emerald-500 text-white shadow-md shadow-emerald-500/20 ring-2 ring-emerald-500 ring-offset-2 dark:ring-offset-slate-800 border-emerald-500' },
                                                { id: 'Sakit', label: 'S', fullLabel: 'Sakit', icon: Activity, activeClass: 'bg-sky-500 text-white shadow-md shadow-sky-500/20 ring-2 ring-sky-500 ring-offset-2 dark:ring-offset-slate-800 border-sky-500' },
                                                { id: 'Izin', label: 'I', fullLabel: 'Izin', icon: Info, activeClass: 'bg-amber-500 text-white shadow-md shadow-amber-500/20 ring-2 ring-amber-500 ring-offset-2 dark:ring-offset-slate-800 border-amber-500' },
                                                { id: 'Alpha', label: 'A', fullLabel: 'Alpha', icon: XCircle, activeClass: 'bg-rose-500 text-white shadow-md shadow-rose-500/20 ring-2 ring-rose-500 ring-offset-2 dark:ring-offset-slate-800 border-rose-500' },
                                                { id: 'Libur', label: 'L', fullLabel: 'Libur', icon: CalendarOff, activeClass: 'bg-purple-500 text-white shadow-md shadow-purple-500/20 ring-2 ring-purple-500 ring-offset-2 dark:ring-offset-slate-800 border-purple-500' },
                                            ].map((status) => {
                                                const isActive = currentStatus === status.id;
                                                const initial = status.id.charAt(0).toUpperCase();

                                                let circleClass = "";
                                                let textClass = "";

                                                if (isActive) {
                                                    if (status.id === 'Hadir') circleClass = "bg-emerald-500 border-emerald-500 text-white shadow-md shadow-emerald-500/30 ring-2 ring-emerald-500 ring-offset-2 dark:ring-offset-slate-800";
                                                    else if (status.id === 'Sakit') circleClass = "bg-sky-500 border-sky-500 text-white shadow-md shadow-sky-500/30 ring-2 ring-sky-500 ring-offset-2 dark:ring-offset-slate-800";
                                                    else if (status.id === 'Izin') circleClass = "bg-amber-500 border-amber-500 text-white shadow-md shadow-amber-500/30 ring-2 ring-amber-500 ring-offset-2 dark:ring-offset-slate-800";
                                                    else if (status.id === 'Alpha') circleClass = "bg-rose-500 border-rose-500 text-white shadow-md shadow-rose-500/30 ring-2 ring-rose-500 ring-offset-2 dark:ring-offset-slate-800";
                                                    else if (status.id === 'Libur') circleClass = "bg-purple-500 border-purple-500 text-white shadow-md shadow-purple-500/30 ring-2 ring-purple-500 ring-offset-2 dark:ring-offset-slate-800";
                                                    textClass = "text-slate-800 dark:text-white font-bold";
                                                } else {
                                                    circleClass = "bg-transparent border-slate-300 dark:border-slate-600 text-slate-500 dark:text-slate-400 group-hover/btn:border-slate-400 dark:group-hover/btn:border-slate-400";
                                                    textClass = "text-slate-500 dark:text-slate-400 font-medium group-hover/btn:text-slate-700 dark:group-hover/btn:text-slate-300";
                                                }

                                                return (
                                                    <button type="button"
                                                        key={status.id}
                                                        onClick={() => onAttendanceClick(enrollment.participantId, enrollment.participantType, status.id)}
                                                        className="group/btn flex flex-col items-center justify-center gap-1.5 p-1 rounded-xl outline-none"
                                                        title={status.fullLabel}
                                                        aria-label={status.fullLabel}
                                                        aria-pressed={isActive}
                                                    >
                                                        <div className={`w-8 h-8 lg:w-10 lg:h-10 rounded-full border flex items-center justify-center transition-all duration-200 ${circleClass}`}>
                                                            <span className="text-xs lg:text-sm font-bold">{initial}</span>
                                                        </div>
                                                        <span className={`text-[10px] lg:text-xs transition-colors ${textClass}`}>
                                                            {status.fullLabel}
                                                        </span>
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* Floating Save Button for Manual Mode */}
            {!autoSaveAttendance && pendingChangesCount > 0 && (
                <div className="fixed bottom-6 right-6 z-50 animate-in slide-in-from-bottom-10 fade-in duration-300">
                    <button type="button"
                        onClick={onSaveManual}
                        disabled={isSaving}
                        className="flex items-center gap-2 px-6 py-3.5 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-2xl font-bold shadow-2xl hover:scale-105 active:scale-95 transition-all disabled:opacity-70 disabled:hover:scale-100"
                    >
                        <Save className="w-5 h-5" />
                        {isSaving ? 'Menyimpan...' : `Simpan ${pendingChangesCount} Perubahan`}
                    </button>
                </div>
            )}
        </div>
    );
};
