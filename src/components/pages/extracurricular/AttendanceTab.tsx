import React, { useMemo } from 'react';
import { Calendar, Save, CheckSquare, Activity, Info, CalendarOff, FileText, FileSpreadsheet, CheckCircle2, XCircle } from 'lucide-react';
import { DatePicker } from '../../ui/DatePicker';
import { EnrollmentView } from './types';

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
                    <button
                        onClick={onExportPDF}
                        disabled={enrollments.length === 0}
                        className="flex items-center justify-center w-10 h-10 bg-white dark:bg-slate-800 text-red-600 dark:text-red-400 border border-slate-200 dark:border-slate-700 rounded-xl hover:bg-red-50 dark:hover:bg-red-900/20 hover:border-red-200 transition-colors disabled:opacity-50"
                        title="Export Rekap Bulanan PDF"
                    >
                        <FileText className="w-5 h-5" />
                    </button>
                    <button
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
                            <button
                                onClick={() => onToggleAutoSave(true)}
                                className={`px-4 py-1.5 text-sm font-medium rounded-lg transition-all ${
                                    autoSaveAttendance 
                                        ? 'bg-white dark:bg-slate-800 text-amber-600 dark:text-amber-400 shadow-sm' 
                                        : 'text-slate-500 hover:text-slate-700 dark:text-slate-400'
                                }`}
                            >
                                ⚡ Otomatis
                            </button>
                            <button
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
                    <div className="flex flex-wrap items-center gap-2">
                        <span className="text-sm font-semibold text-slate-500 dark:text-slate-400 mr-2 hidden sm:inline">Tandai Semua:</span>
                        {[
                            { label: 'Hadir', status: 'Hadir', icon: CheckSquare, color: 'text-emerald-700 dark:text-emerald-400', bg: 'bg-emerald-50 dark:bg-emerald-900/20 hover:bg-emerald-100 dark:hover:bg-emerald-900/40', border: 'border-emerald-200 dark:border-emerald-800/50' },
                            { label: 'Sakit', status: 'Sakit', icon: Activity, color: 'text-sky-700 dark:text-sky-400', bg: 'bg-sky-50 dark:bg-sky-900/20 hover:bg-sky-100 dark:hover:bg-sky-900/40', border: 'border-sky-200 dark:border-sky-800/50' },
                            { label: 'Izin', status: 'Izin', icon: Info, color: 'text-amber-700 dark:text-amber-400', bg: 'bg-amber-50 dark:bg-amber-900/20 hover:bg-amber-100 dark:hover:bg-amber-900/40', border: 'border-amber-200 dark:border-amber-800/50' },
                            { label: 'Libur', status: 'Libur', icon: CalendarOff, color: 'text-purple-700 dark:text-purple-400', bg: 'bg-purple-50 dark:bg-purple-900/20 hover:bg-purple-100 dark:hover:bg-purple-900/40', border: 'border-purple-200 dark:border-purple-800/50' },
                        ].map((btn) => (
                            <button
                                key={btn.status}
                                onClick={() => onMarkAll(btn.status)}
                                className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors ${btn.bg} ${btn.color} ${btn.border}`}
                            >
                                <btn.icon className="w-3.5 h-3.5" />
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
                    ].map((stat) => {
                        const count = enrollments.reduce((acc, curr) => {
                            const key = `${curr.participantType}:${curr.participantId}`;
                            return mergedAttendance[key] === stat.key ? acc + 1 : acc;
                        }, 0);
                        return (
                            <div key={stat.key} className={`rounded-xl p-3 border border-slate-100 dark:border-slate-800 ${stat.bg} flex flex-col items-center justify-center`}>
                                <p className={`text-[10px] font-bold tracking-wider ${stat.color} uppercase mb-1`}>{stat.label}</p>
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
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead className="bg-slate-50 dark:bg-slate-900/80 border-b border-slate-200 dark:border-slate-700 sticky top-0 z-10">
                                <tr>
                                    <th className="px-6 py-4 text-left text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider w-[35%]">Siswa</th>
                                    <th className="px-6 py-4 text-left text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider w-[15%]">Kelas</th>
                                    <th className="px-6 py-4 text-center text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider w-[50%]">Status Kehadiran</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 dark:divide-slate-700/50">
                                {enrollmentsSortedByName.map((enrollment) => {
                                    const key = `${enrollment.participantType}:${enrollment.participantId}`;
                                    const currentStatus = mergedAttendance[key] || '';

                                    return (
                                        <tr key={enrollment.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors">
                                            <td className="px-6 py-4">
                                                <div className="font-semibold text-slate-800 dark:text-white">{enrollment.name}</div>
                                                {enrollment.participantType === 'extracurricular_student' && (
                                                    <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400 mt-1">
                                                        Siswa Ekskul
                                                    </span>
                                                )}
                                            </td>
                                            <td className="px-6 py-4 text-sm font-medium text-slate-600 dark:text-slate-400">
                                                {enrollment.className || '-'}
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex justify-center flex-wrap gap-1.5 sm:gap-2">
                                                    {[
                                                        { id: 'Hadir', label: 'H', fullLabel: 'Hadir', icon: CheckCircle2, activeClass: 'bg-emerald-500 text-white shadow-md shadow-emerald-500/20 ring-2 ring-emerald-500 ring-offset-2 dark:ring-offset-slate-800 border-emerald-500' },
                                                        { id: 'Sakit', label: 'S', fullLabel: 'Sakit', icon: Activity, activeClass: 'bg-sky-500 text-white shadow-md shadow-sky-500/20 ring-2 ring-sky-500 ring-offset-2 dark:ring-offset-slate-800 border-sky-500' },
                                                        { id: 'Izin', label: 'I', fullLabel: 'Izin', icon: Info, activeClass: 'bg-amber-500 text-white shadow-md shadow-amber-500/20 ring-2 ring-amber-500 ring-offset-2 dark:ring-offset-slate-800 border-amber-500' },
                                                        { id: 'Alpha', label: 'A', fullLabel: 'Alpha', icon: XCircle, activeClass: 'bg-rose-500 text-white shadow-md shadow-rose-500/20 ring-2 ring-rose-500 ring-offset-2 dark:ring-offset-slate-800 border-rose-500' },
                                                        { id: 'Libur', label: 'L', fullLabel: 'Libur', icon: CalendarOff, activeClass: 'bg-purple-500 text-white shadow-md shadow-purple-500/20 ring-2 ring-purple-500 ring-offset-2 dark:ring-offset-slate-800 border-purple-500' },
                                                    ].map((status) => {
                                                        const Icon = status.icon;
                                                        const isActive = currentStatus === status.id;
                                                        return (
                                                            <button
                                                                key={status.id}
                                                                onClick={() => onAttendanceClick(enrollment.participantId, enrollment.participantType, status.id)}
                                                                className={`
                                                                    relative flex items-center justify-center gap-1.5 px-3 py-2 sm:py-1.5 rounded-lg text-sm font-semibold transition-all duration-200
                                                                    disabled:opacity-50
                                                                    ${isActive
                                                                        ? status.activeClass
                                                                        : 'bg-white dark:bg-slate-800 text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-700 hover:border-slate-300 dark:hover:border-slate-500'
                                                                    }
                                                                `}
                                                                aria-pressed={isActive}
                                                                title={status.fullLabel}
                                                            >
                                                                <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-white' : 'text-slate-400'} hidden sm:block`} />
                                                                <span className="sm:hidden">{status.label}</span>
                                                                <span className="hidden sm:inline">{status.fullLabel}</span>
                                                            </button>
                                                        );
                                                    })}
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* Floating Save Button for Manual Mode */}
            {!autoSaveAttendance && pendingChangesCount > 0 && (
                <div className="fixed bottom-6 right-6 z-50 animate-in slide-in-from-bottom-10 fade-in duration-300">
                    <button
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
