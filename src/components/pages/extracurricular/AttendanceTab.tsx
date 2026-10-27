import React, { useMemo, useState } from 'react';
import {
    Calendar,
    Save,
    CheckSquare,
    Activity,
    Info,
    CalendarOff,
    FileText,
    FileSpreadsheet,
    CheckCircle2,
    XCircle,
    Search,
    RotateCcw,
    AlertCircle,
    X,
} from 'lucide-react';
import { DatePicker } from '../../ui/DatePicker';
import { EnrollmentView } from './types';
import { getStudentAvatar } from '../../../utils/avatarUtils';
import {
    formatLocalDate,
    getScheduledDatesInMonth,
    isDateOnScheduleDay,
    compareEnrollmentsByClassAndName,
    compareClassNames,
} from './extracurricularUtils';

const ATTENDANCE_STATUS_BUTTONS = [
    {
        id: 'Hadir',
        fullLabel: 'Hadir',
        icon: CheckCircle2,
    },
    {
        id: 'Sakit',
        fullLabel: 'Sakit',
        icon: Activity,
    },
    {
        id: 'Izin',
        fullLabel: 'Izin',
        icon: Info,
    },
    {
        id: 'Alpha',
        fullLabel: 'Alpha',
        icon: XCircle,
    },
    {
        id: 'Libur',
        fullLabel: 'Libur',
        icon: CalendarOff,
    },
] as const;

interface AttendanceTabProps {
    extracurricularId: string;
    scheduleDay?: string | null;
    enrollments: EnrollmentView[];
    selectedDate: string;
    onDateChange: (date: string) => void;
    attendanceMap: Record<string, string>;
    localAttendance: Record<string, string>;
    autoSaveAttendance: boolean;
    onToggleAutoSave: (enabled: boolean) => void;
    onAttendanceClick: (
        studentId: string,
        studentType: 'student' | 'extracurricular_student',
        status: string
    ) => void;
    onMarkAll: (status: string) => void;
    onSaveManual: () => void;
    onDiscardManual?: () => void;
    isSaving: boolean;
    canEdit?: boolean;
    onExportPDF: () => void;
    onExportExcel: () => void;
    onOpenExportModal?: (format: 'pdf' | 'excel') => void;
}

export const AttendanceTab: React.FC<AttendanceTabProps> = ({
    extracurricularId: _extracurricularId,
    scheduleDay,
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
    onDiscardManual,
    isSaving,
    canEdit = true,
    onExportPDF,
    onExportExcel,
    onOpenExportModal,
}) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [classFilter, setClassFilter] = useState('all');
    const [statusFilter, setStatusFilter] = useState<string>('all');
    const [pendingDateTarget, setPendingDateTarget] = useState<string | null>(null);

    const todayStr = useMemo(() => formatLocalDate(new Date()), []);

    // Merged attendance for display (server + local)
    const mergedAttendance = useMemo(() => {
        return { ...attendanceMap, ...localAttendance };
    }, [attendanceMap, localAttendance]);

    const pendingChangesCount = Object.keys(localAttendance).length;

    const handleSafeDateChange = (nextDate: string) => {
        if (nextDate === selectedDate) return;
        if (!autoSaveAttendance && pendingChangesCount > 0) {
            setPendingDateTarget(nextDate);
            return;
        }
        onDateChange(nextDate);
    };

    const scheduledDatesInMonth = useMemo(() => {
        return getScheduledDatesInMonth(selectedDate, scheduleDay);
    }, [selectedDate, scheduleDay]);

    const isOnScheduledDay = useMemo(() => {
        return isDateOnScheduleDay(selectedDate, scheduleDay);
    }, [selectedDate, scheduleDay]);

    const uniqueClasses = useMemo(() => {
        const set = new Set<string>();
        enrollments.forEach((e) => {
            if (e.className) set.add(e.className);
        });
        return Array.from(set).sort(compareClassNames);
    }, [enrollments]);

    const enrollmentsSortedByName = useMemo(() => {
        return [...enrollments].sort(compareEnrollmentsByClassAndName);
    }, [enrollments]);

    const filteredEnrollments = useMemo(() => {
        const query = searchTerm.trim().toLowerCase();
        return enrollmentsSortedByName.filter((e) => {
            const key = `${e.participantType}:${e.participantId}`;
            const status = mergedAttendance[key] || '';
            if (classFilter !== 'all' && (e.className || '') !== classFilter) return false;
            if (statusFilter === 'unmarked' && status !== '') return false;
            if (statusFilter !== 'all' && statusFilter !== 'unmarked' && status !== statusFilter) {
                return false;
            }
            if (!query) return true;
            return (
                e.name.toLowerCase().includes(query) ||
                (e.className && e.className.toLowerCase().includes(query))
            );
        });
    }, [enrollmentsSortedByName, mergedAttendance, classFilter, statusFilter, searchTerm]);

    const stats = useMemo(() => {
        const counts: Record<string, number> = {
            Hadir: 0,
            Sakit: 0,
            Izin: 0,
            Alpha: 0,
            Libur: 0,
            Unmarked: 0,
        };
        enrollments.forEach((curr) => {
            const key = `${curr.participantType}:${curr.participantId}`;
            const st = mergedAttendance[key];
            if (st && st in counts) {
                counts[st] += 1;
            } else {
                counts.Unmarked += 1;
            }
        });
        return counts;
    }, [enrollments, mergedAttendance]);

    return (
        <div className="space-y-6 animate-in fade-in duration-300">
            {/* Header / Date & Export Controls */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h3 className="text-lg font-bold text-slate-800 dark:text-white flex items-center gap-2">
                        <Calendar className="w-5 h-5 text-amber-500" />
                        Presensi Harian Ekstrakurikuler
                    </h3>
                    <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                        Pilih tanggal pertemuan dan catat kehadiran anggota ekstrakurikuler.
                    </p>
                </div>

                <div className="flex flex-wrap items-center gap-2 bg-slate-50 dark:bg-slate-900/50 p-2 rounded-2xl border border-slate-200 dark:border-slate-800">
                    <button
                        type="button"
                        onClick={() => (onOpenExportModal ? onOpenExportModal('pdf') : onExportPDF())}
                        disabled={enrollments.length === 0}
                        className="flex items-center gap-1.5 px-3 h-10 bg-white dark:bg-slate-800 text-red-600 dark:text-red-400 border border-slate-200 dark:border-slate-700 rounded-xl hover:bg-red-50 dark:hover:bg-red-900/20 hover:border-red-200 transition-colors disabled:opacity-50"
                        title="Export Rekap Presensi PDF (1 Bulan, Rentang Bulan, Semester)"
                    >
                        <FileText className="w-4 h-4" />
                        <span className="text-sm font-medium">PDF</span>
                    </button>
                    <button
                        type="button"
                        onClick={() => (onOpenExportModal ? onOpenExportModal('excel') : onExportExcel())}
                        disabled={enrollments.length === 0}
                        className="flex items-center gap-1.5 px-3 h-10 bg-white dark:bg-slate-800 text-emerald-600 dark:text-emerald-400 border border-slate-200 dark:border-slate-700 rounded-xl hover:bg-emerald-50 dark:hover:bg-emerald-900/20 hover:border-emerald-200 transition-colors disabled:opacity-50"
                        title="Export Rekap Presensi Excel (1 Bulan, Rentang Bulan, Semester)"
                    >
                        <FileSpreadsheet className="w-4 h-4" />
                        <span className="text-sm font-medium">Excel</span>
                    </button>
                    <div className="hidden sm:block h-6 w-px bg-slate-300 dark:bg-slate-700 mx-1" />
                    {selectedDate !== todayStr && (
                        <button
                            type="button"
                            onClick={() => handleSafeDateChange(todayStr)}
                            className="px-3 h-10 text-xs font-semibold rounded-xl bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800 hover:bg-amber-100 transition-colors"
                        >
                            Hari Ini
                        </button>
                    )}
                    <DatePicker
                        value={selectedDate}
                        onChange={(date) => handleSafeDateChange(date)}
                        className="w-full sm:w-auto sm:min-w-[160px] mt-1 sm:mt-0"
                        align="right"
                    />
                </div>
            </div>

            {/* Scheduled Meeting Dates Quick Jumper */}
            {scheduledDatesInMonth.length > 0 && (
                <div className="bg-slate-50/80 dark:bg-slate-900/40 rounded-2xl border border-slate-200/80 dark:border-slate-800 p-3.5">
                    <div className="flex flex-wrap items-center justify-between gap-2 mb-2.5">
                        <span className="text-xs font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                            <Calendar className="w-3.5 h-3.5 text-amber-500" />
                            Pertemuan Terjadwal Bulan Ini ({scheduleDay}):
                        </span>
                        {!isOnScheduledDay && scheduleDay && (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300">
                                <AlertCircle className="w-3.5 h-3.5" />
                                Tanggal terpilih di luar jadwal rutin ({scheduleDay})
                            </span>
                        )}
                    </div>
                    <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-hide">
                        {scheduledDatesInMonth.map((item) => {
                            const isSelected = item.dateStr === selectedDate;
                            const isToday = item.dateStr === todayStr;
                            return (
                                <button
                                    key={item.dateStr}
                                    type="button"
                                    onClick={() => handleSafeDateChange(item.dateStr)}
                                    className={`px-3 py-1.5 rounded-xl text-xs font-semibold border whitespace-nowrap transition-all ${
                                        isSelected
                                            ? 'bg-amber-500 text-white border-amber-600 shadow-sm shadow-amber-500/20'
                                            : isToday
                                                ? 'bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-300 border-amber-300 dark:border-amber-700'
                                                : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-amber-300'
                                    }`}
                                >
                                    {item.dayName}, {item.day}
                                    {isToday ? ' (Hari Ini)' : ''}
                                </button>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* Quick Actions & Stats */}
            <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-5 shadow-sm">
                {canEdit && (
                    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 mb-6">
                        {/* Auto/Manual Save Toggle */}
                        <div className="flex flex-wrap items-center gap-3">
                            <span className="text-sm font-semibold text-slate-600 dark:text-slate-300">
                                Mode Simpan:
                            </span>
                            <div className="flex bg-slate-100 dark:bg-slate-900 p-1 rounded-xl border border-slate-200 dark:border-slate-700">
                                <button
                                    type="button"
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
                                    type="button"
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

                            {!autoSaveAttendance && pendingChangesCount > 0 && (
                                <div className="flex items-center gap-2">
                                    <button
                                        type="button"
                                        onClick={onSaveManual}
                                        disabled={isSaving}
                                        className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-sm transition-colors disabled:opacity-60"
                                    >
                                        <Save className="w-3.5 h-3.5" />
                                        {isSaving ? 'Menyimpan...' : `Simpan (${pendingChangesCount})`}
                                    </button>
                                    {onDiscardManual && (
                                        <button
                                            type="button"
                                            onClick={onDiscardManual}
                                            className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:text-rose-600 text-xs font-semibold rounded-xl transition-colors"
                                        >
                                            <RotateCcw className="w-3.5 h-3.5" />
                                            Reset Draf
                                        </button>
                                    )}
                                </div>
                            )}
                        </div>

                        {/* Bulk Actions */}
                        <div className="flex flex-col gap-2">
                            <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                                Tandai Semua:
                            </span>
                            <div className="grid grid-cols-3 sm:flex sm:flex-wrap items-center gap-2">
                                {[
                                    {
                                        label: 'Hadir',
                                        status: 'Hadir',
                                        icon: CheckSquare,
                                        bg: 'bg-emerald-500 hover:bg-emerald-600 dark:bg-emerald-600 dark:hover:bg-emerald-700',
                                    },
                                    {
                                        label: 'Sakit',
                                        status: 'Sakit',
                                        icon: Activity,
                                        bg: 'bg-sky-500 hover:bg-sky-600 dark:bg-sky-600 dark:hover:bg-sky-700',
                                    },
                                    {
                                        label: 'Izin',
                                        status: 'Izin',
                                        icon: Info,
                                        bg: 'bg-amber-500 hover:bg-amber-600 dark:bg-amber-600 dark:hover:bg-amber-700',
                                    },
                                    {
                                        label: 'Alpha',
                                        status: 'Alpha',
                                        icon: XCircle,
                                        bg: 'bg-rose-500 hover:bg-rose-600 dark:bg-rose-600 dark:hover:bg-rose-700',
                                    },
                                    {
                                        label: 'Libur',
                                        status: 'Libur',
                                        icon: CalendarOff,
                                        bg: 'bg-purple-500 hover:bg-purple-600 dark:bg-purple-600 dark:hover:bg-purple-700',
                                    },
                                ].map((btn) => (
                                    <button
                                        type="button"
                                        key={btn.status}
                                        disabled={enrollments.length === 0}
                                        onClick={() => onMarkAll(btn.status)}
                                        className={`flex items-center justify-center gap-1.5 px-3 py-2 sm:py-1.5 text-xs font-medium rounded-lg border border-transparent text-white shadow-sm transition-all hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-50 ${btn.bg}`}
                                    >
                                        <btn.icon className="w-4 h-4 sm:w-3.5 sm:h-3.5" />
                                        {btn.label}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>
                )}

                {/* Statistics Grid (6 cards including Belum Diabsen) */}
                <div className={canEdit ? 'pt-4 mt-2 border-t border-slate-100 dark:border-slate-700/50' : ''}>
                    <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block mb-3">
                        Statistik Kehadiran:
                    </span>
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5 sm:gap-3">
                        {[
                            {
                                label: 'Hadir',
                                count: stats.Hadir,
                                filterKey: 'Hadir',
                                color: 'text-emerald-600 dark:text-emerald-400',
                                border: 'border-emerald-200 dark:border-emerald-900/50',
                            },
                            {
                                label: 'Sakit',
                                count: stats.Sakit,
                                filterKey: 'Sakit',
                                color: 'text-sky-600 dark:text-sky-400',
                                border: 'border-sky-200 dark:border-sky-900/50',
                            },
                            {
                                label: 'Izin',
                                count: stats.Izin,
                                filterKey: 'Izin',
                                color: 'text-amber-600 dark:text-amber-400',
                                border: 'border-amber-200 dark:border-amber-900/50',
                            },
                            {
                                label: 'Alpha',
                                count: stats.Alpha,
                                filterKey: 'Alpha',
                                color: 'text-rose-600 dark:text-rose-400',
                                border: 'border-rose-200 dark:border-rose-900/50',
                            },
                            {
                                label: 'Libur',
                                count: stats.Libur,
                                filterKey: 'Libur',
                                color: 'text-purple-600 dark:text-purple-400',
                                border: 'border-purple-200 dark:border-purple-900/50',
                            },
                            {
                                label: 'Belum Diabsen',
                                count: stats.Unmarked,
                                filterKey: 'unmarked',
                                color: 'text-slate-600 dark:text-slate-300',
                                border: 'border-slate-300 dark:border-slate-700',
                            },
                        ].map((stat) => {
                            const isFiltered = statusFilter === stat.filterKey;
                            return (
                                <button
                                    type="button"
                                    key={stat.label}
                                    onClick={() =>
                                        setStatusFilter((prev) =>
                                            prev === stat.filterKey ? 'all' : stat.filterKey
                                        )
                                    }
                                    className={`rounded-xl p-3 border-l-4 sm:border-l-0 sm:border-t-4 ${stat.border} bg-slate-50 dark:bg-slate-900/50 flex flex-col items-center justify-center transition-all ${
                                        isFiltered ? 'ring-2 ring-amber-500 shadow-sm' : 'hover:bg-slate-100/80 dark:hover:bg-slate-800/80'
                                    }`}
                                >
                                    <p className={`text-xxs font-bold tracking-wider ${stat.color} uppercase mb-1`}>
                                        {stat.label}
                                    </p>
                                    <p className={`text-2xl font-black ${stat.color}`}>{stat.count}</p>
                                </button>
                            );
                        })}
                    </div>
                </div>
            </div>

            {/* Search & Filter Bar for Attendance List */}
            {enrollments.length > 0 && (
                <div className="flex flex-col sm:flex-row gap-3 bg-slate-50 dark:bg-slate-900/50 p-3 rounded-2xl border border-slate-200 dark:border-slate-800">
                    <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <input
                            type="text"
                            aria-label="Cari nama siswa di daftar presensi"
                            placeholder="Cari nama siswa atau kelas..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-9 pr-8 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-white focus:ring-2 focus:ring-amber-500"
                        />
                        {searchTerm && (
                            <button
                                type="button"
                                onClick={() => setSearchTerm('')}
                                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        )}
                    </div>
                    <div className="flex flex-wrap gap-2">
                        <select
                            aria-label="Filter kelas presensi"
                            value={classFilter}
                            onChange={(e) => setClassFilter(e.target.value)}
                            className="px-3 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-white"
                        >
                            <option value="all">Semua Kelas</option>
                            {uniqueClasses.map((cn) => (
                                <option key={cn} value={cn}>
                                    {cn}
                                </option>
                            ))}
                        </select>
                        <select
                            aria-label="Filter status kehadiran"
                            value={statusFilter}
                            onChange={(e) => setStatusFilter(e.target.value)}
                            className="px-3 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-white"
                        >
                            <option value="all">Semua Status</option>
                            <option value="unmarked">Belum Diabsen ({stats.Unmarked})</option>
                            <option value="Hadir">Hadir ({stats.Hadir})</option>
                            <option value="Sakit">Sakit ({stats.Sakit})</option>
                            <option value="Izin">Izin ({stats.Izin})</option>
                            <option value="Alpha">Alpha ({stats.Alpha})</option>
                            <option value="Libur">Libur ({stats.Libur})</option>
                        </select>
                    </div>
                </div>
            )}

            {/* Attendance List */}
            <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden shadow-sm p-2 sm:p-4">
                {enrollments.length === 0 ? (
                    <div className="text-center py-16 bg-slate-50/50 dark:bg-slate-900/20 rounded-xl">
                        <Calendar className="w-12 h-12 mx-auto text-slate-300 dark:text-slate-600 mb-4" />
                        <p className="text-slate-500 dark:text-slate-400">
                            Belum ada anggota yang terdaftar di ekstrakurikuler ini.
                        </p>
                    </div>
                ) : filteredEnrollments.length === 0 ? (
                    <div className="text-center py-12 text-slate-500 dark:text-slate-400">
                        Tidak ada anggota yang cocok dengan filter pencarian.
                    </div>
                ) : (
                    <div className="space-y-2.5">
                        {filteredEnrollments.map((enrollment, index) => {
                            const key = `${enrollment.participantType}:${enrollment.participantId}`;
                            const currentStatus = mergedAttendance[key] || '';
                            const isDirtyLocal = key in localAttendance;

                            return (
                                <div
                                    key={enrollment.id}
                                    id={`student-${enrollment.id}`}
                                    className="group flex flex-col lg:flex-row lg:items-center justify-between gap-4 p-3.5 sm:p-4 rounded-2xl bg-white dark:bg-slate-900/50 border border-slate-100 dark:border-white/5 shadow-sm hover:border-amber-200 dark:hover:border-amber-500/30 transition-all"
                                >
                                    {/* 1. Student Info */}
                                    <div className="flex items-center gap-3.5 min-w-0 flex-1">
                                        <span className="hidden sm:block text-slate-400 dark:text-slate-500 font-bold font-mono w-6 text-right flex-shrink-0 text-xs">
                                            {index + 1}
                                        </span>
                                        <img
                                            src={getStudentAvatar(
                                                null,
                                                null,
                                                enrollment.participantId,
                                                enrollment.name,
                                                'sm'
                                            )}
                                            alt={enrollment.name}
                                            loading="lazy"
                                            decoding="async"
                                            className="w-11 h-11 rounded-full object-cover border-2 border-white dark:border-slate-700 shadow-sm shrink-0"
                                        />
                                        <div className="min-w-0 flex-1">
                                            <div className="flex items-center gap-2 flex-wrap">
                                                <h4 className="font-bold text-sm sm:text-base leading-snug text-slate-800 dark:text-white truncate">
                                                    {enrollment.name}
                                                </h4>
                                                {isDirtyLocal && (
                                                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300">
                                                        Belum disimpan
                                                    </span>
                                                )}
                                            </div>
                                            <div className="flex flex-wrap items-center gap-1.5 mt-1">
                                                {currentStatus ? (
                                                    <span className="text-xs text-slate-500 dark:text-slate-400">
                                                        Status:{' '}
                                                        <strong className="text-slate-700 dark:text-slate-200">
                                                            {currentStatus}
                                                        </strong>
                                                    </span>
                                                ) : (
                                                    <span className="text-xs font-semibold text-amber-600 dark:text-amber-400">
                                                        Belum diabsen
                                                    </span>
                                                )}
                                                {enrollment.className && (
                                                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xxs font-medium bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400">
                                                        {enrollment.className}
                                                    </span>
                                                )}
                                                {enrollment.participantType === 'extracurricular_student' && (
                                                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xxs font-medium bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400">
                                                        Siswa Ekskul
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    </div>

                                    {/* 2. Attendance Status Buttons */}
                                    <div className="bg-slate-50 dark:bg-slate-800/60 p-1.5 sm:p-2 rounded-2xl border border-slate-100 dark:border-slate-700/50 lg:w-auto">
                                        <div className="grid grid-cols-5 gap-1 sm:gap-2 w-full">
                                            {ATTENDANCE_STATUS_BUTTONS.map((status) => {
                                                const isActive = currentStatus === status.id;
                                                const initial = status.id.charAt(0).toUpperCase();

                                                let circleClass = '';
                                                let textClass = '';

                                                if (isActive) {
                                                    if (status.id === 'Hadir')
                                                        circleClass =
                                                            'bg-emerald-500 border-emerald-500 text-white shadow-sm ring-2 ring-emerald-500 ring-offset-2 dark:ring-offset-slate-800';
                                                    else if (status.id === 'Sakit')
                                                        circleClass =
                                                            'bg-sky-500 border-sky-500 text-white shadow-sm ring-2 ring-sky-500 ring-offset-2 dark:ring-offset-slate-800';
                                                    else if (status.id === 'Izin')
                                                        circleClass =
                                                            'bg-amber-500 border-amber-500 text-white shadow-sm ring-2 ring-amber-500 ring-offset-2 dark:ring-offset-slate-800';
                                                    else if (status.id === 'Alpha')
                                                        circleClass =
                                                            'bg-rose-500 border-rose-500 text-white shadow-sm ring-2 ring-rose-500 ring-offset-2 dark:ring-offset-slate-800';
                                                    else if (status.id === 'Libur')
                                                        circleClass =
                                                            'bg-purple-500 border-purple-500 text-white shadow-sm ring-2 ring-purple-500 ring-offset-2 dark:ring-offset-slate-800';
                                                    textClass = 'text-slate-800 dark:text-white font-bold';
                                                } else {
                                                    circleClass =
                                                        'bg-transparent border-slate-300 dark:border-slate-600 text-slate-500 dark:text-slate-400 group-hover/btn:border-slate-400';
                                                    textClass =
                                                        'text-slate-500 dark:text-slate-400 font-medium group-hover/btn:text-slate-700 dark:group-hover/btn:text-slate-300';
                                                }

                                                return (
                                                    <button
                                                        type="button"
                                                        key={status.id}
                                                        disabled={!canEdit}
                                                        onClick={() =>
                                                            onAttendanceClick(
                                                                enrollment.participantId,
                                                                enrollment.participantType,
                                                                status.id
                                                            )
                                                        }
                                                        className="group/btn flex flex-col items-center justify-start gap-1 py-1 px-0.5 sm:px-1 rounded-xl outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 min-h-[44px] cursor-pointer active:scale-95 transition-all duration-150 select-none disabled:opacity-60 disabled:cursor-not-allowed"
                                                        title={status.fullLabel}
                                                        aria-label={`${status.fullLabel} untuk ${enrollment.name}`}
                                                        aria-pressed={isActive}
                                                    >
                                                        <div
                                                            className={`w-8 h-8 sm:w-9 sm:h-9 rounded-full border flex items-center justify-center shrink-0 transition-all duration-150 ${circleClass}`}
                                                        >
                                                            <span className="text-xs font-bold">{initial}</span>
                                                        </div>
                                                        <span className={`text-[10px] sm:text-xs transition-colors w-full text-center whitespace-nowrap overflow-hidden text-ellipsis ${textClass}`}>
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
                <div className="fixed bottom-6 right-6 z-50 flex items-center gap-2 animate-in slide-in-from-bottom-10 fade-in duration-300">
                    {onDiscardManual && (
                        <button
                            type="button"
                            onClick={onDiscardManual}
                            className="px-4 py-3.5 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 rounded-2xl font-semibold shadow-xl hover:bg-slate-50 transition-all text-sm"
                        >
                            Batal
                        </button>
                    )}
                    <button
                        type="button"
                        onClick={onSaveManual}
                        disabled={isSaving}
                        className="flex items-center gap-2 px-6 py-3.5 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-2xl font-bold shadow-2xl hover:scale-105 active:scale-95 transition-all disabled:opacity-70 disabled:hover:scale-100"
                    >
                        <Save className="w-5 h-5" />
                        {isSaving ? 'Menyimpan...' : `Simpan ${pendingChangesCount} Perubahan`}
                    </button>
                </div>
            )}

            {/* Guard Modal When Switching Date With Unsaved Manual Attendance */}
            {pendingDateTarget && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div
                        role="presentation"
                        aria-hidden="true"
                        onClick={() => setPendingDateTarget(null)}
                        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
                    />
                    <div className="relative w-full max-w-md bg-white dark:bg-slate-800 rounded-2xl shadow-2xl p-6 border border-slate-200 dark:border-slate-700">
                        <h4 className="text-lg font-bold text-slate-800 dark:text-white mb-2">
                            Perubahan Presensi Belum Disimpan
                        </h4>
                        <p className="text-sm text-slate-600 dark:text-slate-300 mb-5">
                            Terdapat <strong>{pendingChangesCount}</strong> perubahan presensi pada tanggal{' '}
                            <strong>{selectedDate}</strong> yang belum disimpan. Buang perubahan dan pindah ke tanggal{' '}
                            <strong>{pendingDateTarget}</strong>?
                        </p>
                        <div className="flex gap-2.5">
                            <button
                                type="button"
                                onClick={() => setPendingDateTarget(null)}
                                className="flex-1 py-2 rounded-xl border border-slate-200 dark:border-slate-600 text-slate-700 dark:text-slate-200 text-sm font-semibold"
                            >
                                Tetap di Sini
                            </button>
                            <button
                                type="button"
                                onClick={() => {
                                    const next = pendingDateTarget;
                                    setPendingDateTarget(null);
                                    if (onDiscardManual) onDiscardManual();
                                    onDateChange(next);
                                }}
                                className="flex-1 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-sm font-bold"
                            >
                                Buang & Pindah Tanggal
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
