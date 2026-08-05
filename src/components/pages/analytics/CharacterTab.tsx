import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../../ui/Card';
import { Shield, Zap, Award, Users, Search, ChevronUp, ChevronDown, ChevronsUpDown, ArrowRight, CheckCircle2, AlertTriangle, XCircle, TrendingUp } from 'lucide-react';

// ─── Types ───────────────────────────────────────────────────────────────────

interface Student {
    id: string;
    name: string;
    class_id: string | null;
    gender: string | null;
}

interface AnalyticsClass {
    id: string;
    name: string;
}

interface AnalyticsAttendance {
    student_id: string;
    date: string;
    status: string | null;
}

interface AnalyticsViolation {
    id: string;
    student_id: string;
    type: string | null;
    points: number;
    date: string;
    created_at: string;
}

interface AnalyticsQuizPoint {
    id: string;
    student_id: string;
    points: number;
    category: string | null;
    created_at: string;
}

type SortField = 'name' | 'attendance' | 'violations' | 'activity' | 'status';
type SortDir = 'asc' | 'desc';
type StatusFilter = 'all' | 'baik' | 'perhatian' | 'tindak_lanjut';

interface StudentRow {
    student: Student;
    className: string;
    attendanceRate: number;
    hadirCount: number;
    totalAttendance: number;
    violationCount: number;
    violationPoints: number;
    activityPoints: number;
    status: 'baik' | 'perhatian' | 'tindak_lanjut';
}

interface CharacterTabProps {
    violationsStats: any;
    quizPointsStats: any;
    students?: Student[];
    classes?: AnalyticsClass[];
    attendance?: AnalyticsAttendance[];
    violations?: AnalyticsViolation[];
    quizPoints?: AnalyticsQuizPoint[];
    selectedClassId?: string;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

const getStatus = (
    attendanceRate: number,
    violationCount: number,
    totalAttendance: number
): 'baik' | 'perhatian' | 'tindak_lanjut' => {
    if (totalAttendance === 0 && violationCount === 0) return 'baik';
    if (violationCount >= 3 || (totalAttendance > 0 && attendanceRate < 75))
        return 'tindak_lanjut';
    if (violationCount >= 1 || (totalAttendance > 0 && attendanceRate < 85))
        return 'perhatian';
    return 'baik';
};

const STATUS_CONFIG = {
    baik: {
        label: 'Baik',
        icon: CheckCircle2,
        className: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400',
        dot: 'bg-emerald-500',
    },
    perhatian: {
        label: 'Perhatian',
        icon: AlertTriangle,
        className: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400',
        dot: 'bg-amber-500',
    },
    tindak_lanjut: {
        label: 'Perlu Tindak Lanjut',
        icon: XCircle,
        className: 'bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-400',
        dot: 'bg-rose-500',
    },
};

const STATUS_ORDER = { tindak_lanjut: 0, perhatian: 1, baik: 2 };

// ─── Sort Icon ────────────────────────────────────────────────────────────────

const SortIcon: React.FC<{ field: SortField; sortField: SortField; sortDir: SortDir }> = ({
    field,
    sortField,
    sortDir,
}) => {
    if (sortField !== field)
        return <ChevronsUpDown className="w-3.5 h-3.5 text-slate-400 ml-1 inline" />;
    return sortDir === 'asc' ? (
        <ChevronUp className="w-3.5 h-3.5 text-brand-500 ml-1 inline" />
    ) : (
        <ChevronDown className="w-3.5 h-3.5 text-brand-500 ml-1 inline" />
    );
};

// ─── Student Recap Table ──────────────────────────────────────────────────────

const StudentRekapTable: React.FC<{
    students: Student[];
    classes: AnalyticsClass[];
    attendance: AnalyticsAttendance[];
    violations: AnalyticsViolation[];
    quizPoints: AnalyticsQuizPoint[];
    selectedClassId?: string;
}> = ({ students, classes, attendance, violations, quizPoints, selectedClassId }) => {
    const [search, setSearch] = useState('');
    const [sortField, setSortField] = useState<SortField>('status');
    const [sortDir, setSortDir] = useState<SortDir>('asc');
    const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');

    const classMap = useMemo(() => {
        const m = new Map<string, string>();
        classes.forEach((c) => m.set(c.id, c.name));
        return m;
    }, [classes]);

    // Build per-student row data
    const rows = useMemo<StudentRow[]>(() => {
        return students.map((student) => {
            const attRecords = attendance.filter((a) => a.student_id === student.id);
            const totalAttendance = attRecords.length;
            const hadirCount = attRecords.filter((a) => a.status === 'Hadir').length;
            const attendanceRate = totalAttendance > 0 ? (hadirCount / totalAttendance) * 100 : 0;

            const studentViolations = violations.filter((v) => v.student_id === student.id);
            const violationCount = studentViolations.length;
            const violationPoints = studentViolations.reduce((s, v) => s + (v.points || 0), 0);

            const studentQuiz = quizPoints.filter((q) => q.student_id === student.id);
            const activityPoints = studentQuiz.reduce((s, q) => s + (q.points || 0), 0);

            const status = getStatus(attendanceRate, violationCount, totalAttendance);
            const className = student.class_id ? classMap.get(student.class_id) || '-' : '-';

            return {
                student,
                className,
                attendanceRate,
                hadirCount,
                totalAttendance,
                violationCount,
                violationPoints,
                activityPoints,
                status,
            };
        });
    }, [students, attendance, violations, quizPoints, classMap]);

    const handleSort = (field: SortField) => {
        if (sortField === field) {
            setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
        } else {
            setSortField(field);
            setSortDir('asc');
        }
    };

    const filtered = useMemo(() => {
        let result = rows;
        if (statusFilter !== 'all') result = result.filter((r) => r.status === statusFilter);
        if (search.trim()) {
            const q = search.toLowerCase();
            result = result.filter(
                (r) =>
                    r.student.name.toLowerCase().includes(q) ||
                    r.className.toLowerCase().includes(q)
            );
        }
        return result.sort((a, b) => {
            let diff = 0;
            switch (sortField) {
                case 'name':
                    diff = a.student.name.localeCompare(b.student.name);
                    break;
                case 'attendance':
                    diff = a.attendanceRate - b.attendanceRate;
                    break;
                case 'violations':
                    diff = a.violationCount - b.violationCount;
                    break;
                case 'activity':
                    diff = a.activityPoints - b.activityPoints;
                    break;
                case 'status':
                    diff = STATUS_ORDER[a.status] - STATUS_ORDER[b.status];
                    break;
            }
            return sortDir === 'asc' ? diff : -diff;
        });
    }, [rows, search, statusFilter, sortField, sortDir]);

    // Summary counts
    const summary = useMemo(() => {
        const counts = { baik: 0, perhatian: 0, tindak_lanjut: 0 };
        rows.forEach((r) => counts[r.status]++);
        return counts;
    }, [rows]);

    const thClass =
        'px-4 py-3 text-left text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide cursor-pointer select-none hover:text-brand-600 dark:hover:text-brand-400 whitespace-nowrap';

    return (
        <Card className="bg-white dark:bg-slate-900 border-0 shadow-lg">
            <CardHeader className="pb-4 border-b border-slate-100 dark:border-slate-800">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                    <CardTitle className="flex items-center gap-2">
                        <Users className="w-5 h-5 text-brand-500" />
                        Rekap Semua Siswa
                        <span className="text-xs font-normal text-slate-400 ml-1">
                            ({filtered.length} dari {rows.length} siswa)
                        </span>
                    </CardTitle>

                    {/* Summary badges */}
                    <div className="flex flex-wrap gap-2">
                        {(Object.keys(STATUS_CONFIG) as (keyof typeof STATUS_CONFIG)[]).map(
                            (key) => {
                                const cfg = STATUS_CONFIG[key];
                                return (
                                    <button
                                        key={key}
                                        onClick={() =>
                                            setStatusFilter((f) =>
                                                f === key ? 'all' : (key as StatusFilter)
                                            )
                                        }
                                        className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border transition-all ${
                                            statusFilter === key
                                                ? cfg.className +
                                                  ' border-current shadow-sm scale-105'
                                                : 'border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 hover:border-slate-300 dark:hover:border-slate-600'
                                        }`}
                                    >
                                        <span
                                            className={`w-2 h-2 rounded-full ${cfg.dot}`}
                                        />
                                        {cfg.label}: {summary[key]}
                                    </button>
                                );
                            }
                        )}
                    </div>
                </div>

                {/* Search */}
                <div className="mt-3 relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder="Cari nama siswa atau kelas..."
                        className="w-full pl-9 pr-4 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-200 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500/40 focus:border-brand-500"
                    />
                </div>
            </CardHeader>

            <CardContent className="p-0">
                {filtered.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-16 text-slate-400">
                        <Users className="w-12 h-12 mb-3 opacity-30" />
                        <p className="font-medium">Tidak ada siswa ditemukan</p>
                        <p className="text-xs mt-1">Coba ubah filter atau kata kunci pencarian</p>
                    </div>
                ) : (
                    <>
                        {/* Desktop Table */}
                        <div className="hidden md:block overflow-x-auto">
                            <table className="w-full">
                                <thead className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-100 dark:border-slate-800">
                                    <tr>
                                        <th className="px-4 py-3 text-left text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide w-8">
                                            No
                                        </th>
                                        <th
                                            className={thClass}
                                            onClick={() => handleSort('name')}
                                        >
                                            Nama Siswa
                                            <SortIcon field="name" sortField={sortField} sortDir={sortDir} />
                                        </th>
                                        {selectedClassId === 'all' && (
                                            <th className="px-4 py-3 text-left text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide">
                                                Kelas
                                            </th>
                                        )}
                                        <th
                                            className={thClass}
                                            onClick={() => handleSort('attendance')}
                                        >
                                            Kehadiran
                                            <SortIcon field="attendance" sortField={sortField} sortDir={sortDir} />
                                        </th>
                                        <th
                                            className={thClass}
                                            onClick={() => handleSort('violations')}
                                        >
                                            Pelanggaran
                                            <SortIcon field="violations" sortField={sortField} sortDir={sortDir} />
                                        </th>
                                        <th
                                            className={thClass}
                                            onClick={() => handleSort('activity')}
                                        >
                                            Keaktifan
                                            <SortIcon field="activity" sortField={sortField} sortDir={sortDir} />
                                        </th>
                                        <th
                                            className={thClass}
                                            onClick={() => handleSort('status')}
                                        >
                                            Status
                                            <SortIcon field="status" sortField={sortField} sortDir={sortDir} />
                                        </th>
                                        <th className="px-4 py-3 w-10" />
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-50 dark:divide-slate-800">
                                    {filtered.map((row, idx) => {
                                        const statusCfg = STATUS_CONFIG[row.status];
                                        const attColor =
                                            row.totalAttendance === 0
                                                ? 'text-slate-400'
                                                : row.attendanceRate >= 85
                                                ? 'text-emerald-600 dark:text-emerald-400'
                                                : row.attendanceRate >= 75
                                                ? 'text-amber-600 dark:text-amber-400'
                                                : 'text-rose-600 dark:text-rose-400';

                                        return (
                                            <tr
                                                key={row.student.id}
                                                className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors group"
                                            >
                                                <td className="px-4 py-3 text-sm text-slate-400 font-medium">
                                                    {idx + 1}
                                                </td>
                                                <td className="px-4 py-3">
                                                    <div className="flex items-center gap-2">
                                                        <div
                                                            className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${
                                                                row.student.gender === 'Laki-laki'
                                                                    ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300'
                                                                    : 'bg-pink-100 text-pink-700 dark:bg-pink-900/40 dark:text-pink-300'
                                                            }`}
                                                        >
                                                            {row.student.name.substring(0, 2).toUpperCase()}
                                                        </div>
                                                        <span className="font-semibold text-sm text-slate-800 dark:text-slate-200 group-hover:text-brand-600 dark:group-hover:text-brand-400 transition-colors">
                                                            {row.student.name}
                                                        </span>
                                                    </div>
                                                </td>
                                                {selectedClassId === 'all' && (
                                                    <td className="px-4 py-3 text-xs text-slate-500 dark:text-slate-400 font-medium">
                                                        {row.className}
                                                    </td>
                                                )}
                                                <td className="px-4 py-3">
                                                    {row.totalAttendance > 0 ? (
                                                        <div>
                                                            <span className={`font-bold text-sm ${attColor}`}>
                                                                {row.attendanceRate.toFixed(0)}%
                                                            </span>
                                                            <p className="text-xxs text-slate-400 mt-0.5">
                                                                {row.hadirCount}/{row.totalAttendance} hari
                                                            </p>
                                                        </div>
                                                    ) : (
                                                        <span className="text-xs text-slate-400 italic">—</span>
                                                    )}
                                                </td>
                                                <td className="px-4 py-3">
                                                    {row.violationCount > 0 ? (
                                                        <div>
                                                            <span className="font-bold text-sm text-rose-600 dark:text-rose-400">
                                                                {row.violationCount}x
                                                            </span>
                                                            <p className="text-xxs text-slate-400 mt-0.5">
                                                                {row.violationPoints} poin
                                                            </p>
                                                        </div>
                                                    ) : (
                                                        <span className="text-xs text-emerald-500 font-medium">Bersih ✓</span>
                                                    )}
                                                </td>
                                                <td className="px-4 py-3">
                                                    {row.activityPoints > 0 ? (
                                                        <span className="font-bold text-sm text-amber-600 dark:text-amber-400 flex items-center gap-1">
                                                            <TrendingUp className="w-3.5 h-3.5" />
                                                            {row.activityPoints} pt
                                                        </span>
                                                    ) : (
                                                        <span className="text-xs text-slate-400 italic">—</span>
                                                    )}
                                                </td>
                                                <td className="px-4 py-3">
                                                    <span
                                                        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold ${statusCfg.className}`}
                                                    >
                                                        <span className={`w-1.5 h-1.5 rounded-full ${statusCfg.dot}`} />
                                                        {statusCfg.label}
                                                    </span>
                                                </td>
                                                <td className="px-4 py-3">
                                                    <a
                                                        href={`/siswa/${row.student.id}`}
                                                        className="p-1.5 rounded-lg text-slate-400 hover:text-brand-500 hover:bg-brand-50 dark:hover:bg-brand-900/30 transition-all inline-flex items-center opacity-0 group-hover:opacity-100"
                                                        title="Lihat Detail Siswa"
                                                    >
                                                        <ArrowRight className="w-4 h-4" />
                                                    </a>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>

                        {/* Mobile Card View */}
                        <div className="md:hidden divide-y divide-slate-100 dark:divide-slate-800">
                            {filtered.map((row, idx) => {
                                const statusCfg = STATUS_CONFIG[row.status];
                                const attColor =
                                    row.totalAttendance === 0
                                        ? 'text-slate-400'
                                        : row.attendanceRate >= 85
                                        ? 'text-emerald-600 dark:text-emerald-400'
                                        : row.attendanceRate >= 75
                                        ? 'text-amber-600 dark:text-amber-400'
                                        : 'text-rose-600 dark:text-rose-400';

                                return (
                                    <div
                                        key={row.student.id}
                                        className="p-4 hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors"
                                    >
                                        {/* Header row */}
                                        <div className="flex items-start justify-between mb-3">
                                            <div className="flex items-center gap-2.5">
                                                <div
                                                    className={`w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${
                                                        row.student.gender === 'Laki-laki'
                                                            ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300'
                                                            : 'bg-pink-100 text-pink-700 dark:bg-pink-900/40 dark:text-pink-300'
                                                    }`}
                                                >
                                                    {row.student.name.substring(0, 2).toUpperCase()}
                                                </div>
                                                <div>
                                                    <p className="font-bold text-sm text-slate-800 dark:text-slate-200 leading-snug">
                                                        {idx + 1}. {row.student.name}
                                                    </p>
                                                    {selectedClassId === 'all' && (
                                                        <p className="text-xs text-slate-400 mt-0.5">{row.className}</p>
                                                    )}
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <span
                                                    className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold ${statusCfg.className}`}
                                                >
                                                    <span className={`w-1.5 h-1.5 rounded-full ${statusCfg.dot}`} />
                                                    {statusCfg.label}
                                                </span>
                                                <a
                                                    href={`/siswa/${row.student.id}`}
                                                    className="p-1.5 rounded-lg text-slate-400 hover:text-brand-500 hover:bg-brand-50 dark:hover:bg-brand-900/30 transition-all"
                                                    title="Lihat Detail"
                                                >
                                                    <ArrowRight className="w-4 h-4" />
                                                </a>
                                            </div>
                                        </div>

                                        {/* Stats row */}
                                        <div className="grid grid-cols-3 gap-2">
                                            <div className="bg-slate-50 dark:bg-slate-800 rounded-xl p-2.5 text-center">
                                                <p className={`text-sm font-bold ${attColor}`}>
                                                    {row.totalAttendance > 0 ? `${row.attendanceRate.toFixed(0)}%` : '—'}
                                                </p>
                                                <p className="text-xxs text-slate-400 mt-0.5">Hadir</p>
                                            </div>
                                            <div className="bg-slate-50 dark:bg-slate-800 rounded-xl p-2.5 text-center">
                                                <p className="text-sm font-bold text-rose-600 dark:text-rose-400">
                                                    {row.violationCount > 0 ? `${row.violationCount}x` : '✓'}
                                                </p>
                                                <p className="text-xxs text-slate-400 mt-0.5">Pelanggaran</p>
                                            </div>
                                            <div className="bg-slate-50 dark:bg-slate-800 rounded-xl p-2.5 text-center">
                                                <p className="text-sm font-bold text-amber-600 dark:text-amber-400">
                                                    {row.activityPoints > 0 ? `${row.activityPoints}pt` : '—'}
                                                </p>
                                                <p className="text-xxs text-slate-400 mt-0.5">Aktif</p>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </>
                )}
            </CardContent>
        </Card>
    );
};

// ─── CharacterTab ─────────────────────────────────────────────────────────────

export const CharacterTab: React.FC<CharacterTabProps> = ({
    violationsStats,
    quizPointsStats,
    students = [],
    classes = [],
    attendance = [],
    violations = [],
    quizPoints = [],
    selectedClassId = 'all',
}) => {
    return (
        <div className="space-y-6 animate-fade-in">
            {/* Quiz Points / Engagement */}
            <Card className="bg-white dark:bg-slate-900 border-0 shadow-lg">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Zap className="w-5 h-5 text-amber-500" />
                        Pahlawan Kelas (Keaktifan)
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    {quizPointsStats.total > 0 ? (
                        <div className="space-y-6">
                            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                                <div className="p-4 bg-amber-50 dark:bg-amber-900/20 rounded-xl text-center border border-amber-100 dark:border-amber-800">
                                    <p className="text-2xl font-bold text-amber-600 dark:text-amber-400">{quizPointsStats.totalPoints}</p>
                                    <p className="text-xs text-amber-500 dark:text-amber-400 mt-1">Total Poin Kelas</p>
                                </div>
                                <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-xl text-center border border-green-100 dark:border-green-800">
                                    <p className="text-2xl font-bold text-green-600 dark:text-green-400">{quizPointsStats.avgPoints}</p>
                                    <p className="text-xs text-green-500 dark:text-green-400 mt-1">Rata-rata Poin</p>
                                </div>
                                <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-xl text-center border border-blue-100 dark:border-blue-800 col-span-2 md:col-span-1">
                                    <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">{quizPointsStats.total}</p>
                                    <p className="text-xs text-blue-500 dark:text-blue-400 mt-1">Total Aktivitas</p>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div>
                                    <h4 className="text-sm font-bold text-slate-700 dark:text-slate-300 mb-3 flex items-center gap-2">
                                        <Award className="w-4 h-4 text-amber-500" /> Top 5 Siswa Teraktif
                                    </h4>
                                    <div className="space-y-2">
                                        {quizPointsStats.topEngaged.map((item: any, i: number) => (
                                            <div key={i} className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800/50 rounded-lg">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-6 text-center font-bold text-slate-400">#{i + 1}</div>
                                                    <span className="font-semibold text-slate-700 dark:text-slate-200">{item.student?.name}</span>
                                                </div>
                                                <span className="px-3 py-1 bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-400 rounded-full text-xs font-bold">
                                                    {item.points} pt
                                                </span>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                <div>
                                    <h4 className="text-sm font-bold text-slate-700 dark:text-slate-300 mb-3">Distribusi Kategori</h4>
                                    <div className="flex flex-wrap gap-2">
                                        {quizPointsStats.byCategory.map((item: any, i: number) => (
                                            <div key={i} className="px-4 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 flex-1 min-w-[120px]">
                                                <p className="text-xs text-slate-500 mb-1">{item.category}</p>
                                                <p className="font-bold text-slate-800 dark:text-slate-200">{item.points} pt</p>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="h-48 flex flex-col items-center justify-center text-center p-6 border-2 border-dashed border-slate-100 dark:border-slate-800 rounded-xl">
                            <div className="p-3 bg-amber-50 dark:bg-amber-900/30 rounded-full mb-3">
                                <Zap className="w-6 h-6 text-amber-500" />
                            </div>
                            <p className="text-sm font-medium text-slate-900 dark:text-white">Belum Ada Poin Keaktifan</p>
                            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Berikan poin kuis untuk melihat pahlawan kelas Anda.</p>
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Violations Summary */}
            <Card className="bg-white dark:bg-slate-900 border-0 shadow-lg">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Shield className="w-5 h-5 text-red-500" />
                        Catatan Perilaku (Pelanggaran)
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    {violationsStats.total > 0 ? (
                        <div className="space-y-6">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="p-4 bg-red-50 dark:bg-red-900/20 rounded-xl text-center border border-red-100 dark:border-red-800">
                                    <p className="text-2xl font-bold text-red-600 dark:text-red-400">{violationsStats.total}</p>
                                    <p className="text-xs text-red-500 dark:text-red-400 mt-1">Total Insiden</p>
                                </div>
                                <div className="p-4 bg-orange-50 dark:bg-orange-900/20 rounded-xl text-center border border-orange-100 dark:border-orange-800">
                                    <p className="text-2xl font-bold text-orange-600 dark:text-orange-400">{violationsStats.totalPoints}</p>
                                    <p className="text-xs text-orange-500 dark:text-orange-400 mt-1">Poin Pelanggaran</p>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div>
                                    <h4 className="text-sm font-bold text-slate-700 dark:text-slate-300 mb-3 flex items-center gap-2">
                                        <Shield className="w-4 h-4 text-red-500" /> Siswa Sering Melanggar
                                    </h4>
                                    <div className="space-y-2">
                                        {violationsStats.topViolators.map((item: any, i: number) => (
                                            <div key={i} className="flex items-center justify-between p-3 bg-red-50/50 dark:bg-red-900/10 rounded-lg">
                                                <div className="flex items-center gap-3">
                                                    <span className="font-semibold text-slate-700 dark:text-slate-200">{item.student?.name}</span>
                                                </div>
                                                <div className="text-right">
                                                    <p className="text-xs font-bold text-red-600 dark:text-red-400">{item.count}x Melanggar</p>
                                                    <p className="text-xxs text-slate-500">{item.points} poin</p>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                <div>
                                    <h4 className="text-sm font-bold text-slate-700 dark:text-slate-300 mb-3">Jenis Pelanggaran</h4>
                                    <div className="space-y-2">
                                        {violationsStats.byType.map((item: any, i: number) => (
                                            <div key={i} className="flex items-center justify-between p-2 border-b border-slate-100 dark:border-slate-800 last:border-0">
                                                <span className="text-sm text-slate-600 dark:text-slate-400">{item.type}</span>
                                                <span className="font-bold text-slate-800 dark:text-slate-200">{item.count}x</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="h-48 flex flex-col items-center justify-center text-center p-6 border-2 border-dashed border-slate-100 dark:border-slate-800 rounded-xl">
                            <div className="p-3 bg-green-50 dark:bg-green-900/30 rounded-full mb-3">
                                <Shield className="w-6 h-6 text-green-500" />
                            </div>
                            <p className="text-sm font-medium text-slate-900 dark:text-white">Tidak Ada Pelanggaran</p>
                            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Luar biasa! Semua siswa berkelakuan baik.</p>
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* ─── Rekap Per Siswa ─── */}
            {students.length > 0 && (
                <StudentRekapTable
                    students={students}
                    classes={classes}
                    attendance={attendance}
                    violations={violations}
                    quizPoints={quizPoints}
                    selectedClassId={selectedClassId}
                />
            )}
        </div>
    );
};
