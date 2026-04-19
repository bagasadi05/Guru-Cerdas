import React, { useMemo, useState } from 'react';
import {
    AlertTriangleIcon,
    BookOpenIcon,
    CalendarIcon,
    CheckCircleIcon,
    ClockIcon,
    DownloadIcon,
    FileTextIcon,
    InfoIcon,
    SettingsIcon,
    ShieldAlertIcon,
    SparklesIcon,
    TrendingUpIcon,
} from '../../Icons';
import type {
    PortalMoreSection,
    PortalReport,
    PortalSchedule,
    PortalSchoolInfo,
    PortalTask,
    PortalViolation,
} from './types';

interface PortalMoreTabProps {
    activeSection: PortalMoreSection;
    onSectionChange: (section: PortalMoreSection) => void;
    tasks: PortalTask[];
    schedules: PortalSchedule[];
    violations: PortalViolation[];
    reports: PortalReport[];
    schoolInfo: PortalSchoolInfo;
    onDownloadPdf: () => void;
    onOpenSettings: () => void;
}

type TaskView = 'all' | 'active' | 'done' | 'overdue';

const sections: PortalMoreSection[] = ['tugas', 'jadwal', 'perilaku', 'dokumen', 'pengaturan'];
const weekdays = ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];

const sectionLabels: Record<PortalMoreSection, string> = {
    tugas: 'Tugas',
    jadwal: 'Jadwal',
    perilaku: 'Perilaku',
    dokumen: 'Dokumen',
    pengaturan: 'Pengaturan',
};

const sectionDescriptions: Record<PortalMoreSection, string> = {
    tugas: 'Pantau tugas yang perlu dikerjakan dan deadline terdekat.',
    jadwal: 'Lihat susunan pelajaran per hari dengan format ringkas.',
    perilaku: 'Baca catatan pembinaan dan area yang perlu didampingi.',
    dokumen: 'Temukan laporan dan dokumen sekolah dalam satu tempat.',
    pengaturan: 'Lengkapi data wali dan akses ringkasan portal.',
};

const sectionTone: Record<PortalMoreSection, string> = {
    tugas: 'from-indigo-500 to-sky-500',
    jadwal: 'from-emerald-500 to-teal-500',
    perilaku: 'from-rose-500 to-orange-500',
    dokumen: 'from-amber-500 to-yellow-500',
    pengaturan: 'from-slate-700 to-slate-950',
};

const dateFormatter = new Intl.DateTimeFormat('id-ID', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
});

const longDateFormatter = new Intl.DateTimeFormat('id-ID', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
});

const getTodayLabel = () => new Intl.DateTimeFormat('id-ID', { weekday: 'long' }).format(new Date());

const toDate = (value: string | null | undefined): Date | null => {
    if (!value) return null;
    const date = new Date(`${value}T00:00:00`);
    return Number.isNaN(date.getTime()) ? null : date;
};

const isOverdueTask = (task: PortalTask): boolean => {
    const dueDate = toDate(task.due_date);
    if (!dueDate || task.status === 'done') return false;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return dueDate.getTime() < today.getTime();
};

const getDaysUntilDue = (task: PortalTask): number | null => {
    const dueDate = toDate(task.due_date);
    if (!dueDate) return null;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return Math.ceil((dueDate.getTime() - today.getTime()) / (24 * 60 * 60 * 1000));
};

const getTaskStatusLabel = (task: PortalTask): string => {
    if (isOverdueTask(task)) return 'Terlambat';
    if (task.status === 'done') return 'Selesai';
    if (task.status === 'in_progress') return 'Dikerjakan';
    return 'Belum dikerjakan';
};

const getTaskTone = (task: PortalTask): string => {
    if (isOverdueTask(task)) return 'border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-900/30 dark:bg-rose-950/30 dark:text-rose-200';
    if (task.status === 'done') return 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/30 dark:bg-emerald-950/30 dark:text-emerald-200';
    return 'border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900/30 dark:bg-amber-950/30 dark:text-amber-200';
};

export const PortalMoreTab: React.FC<PortalMoreTabProps> = ({
    activeSection,
    onSectionChange,
    tasks,
    schedules,
    violations,
    reports,
    schoolInfo,
    onDownloadPdf,
    onOpenSettings,
}) => {
    const [taskView, setTaskView] = useState<TaskView>('all');
    const [selectedDay, setSelectedDay] = useState(() => {
        const today = getTodayLabel();
        return weekdays.includes(today) ? today : weekdays[0];
    });
    const [selectedReportId, setSelectedReportId] = useState<string | null>(reports[0]?.id ?? null);

    const sectionIcons: Record<PortalMoreSection, React.ElementType> = {
        tugas: BookOpenIcon,
        jadwal: CalendarIcon,
        perilaku: ShieldAlertIcon,
        dokumen: FileTextIcon,
        pengaturan: SettingsIcon,
    };

    const activeTasks = useMemo(() => tasks.filter((task) => task.status !== 'done'), [tasks]);
    const overdueTasks = useMemo(() => tasks.filter(isOverdueTask), [tasks]);
    const doneTasks = useMemo(() => tasks.filter((task) => task.status === 'done'), [tasks]);
    const upcomingTask = useMemo(() => (
        [...activeTasks]
            .filter((task) => task.due_date)
            .sort((left, right) => (toDate(left.due_date)?.getTime() ?? 0) - (toDate(right.due_date)?.getTime() ?? 0))[0]
    ), [activeTasks]);

    const filteredTasks = useMemo(() => {
        const source = taskView === 'active'
            ? activeTasks
            : taskView === 'done'
                ? doneTasks
                : taskView === 'overdue'
                    ? overdueTasks
                    : tasks;

        return [...source].sort((left, right) => (toDate(left.due_date)?.getTime() ?? Number.MAX_SAFE_INTEGER) - (toDate(right.due_date)?.getTime() ?? Number.MAX_SAFE_INTEGER));
    }, [activeTasks, doneTasks, overdueTasks, taskView, tasks]);

    const schedulesByDay = useMemo(() => weekdays.map((day) => ({
        day,
        items: schedules
            .filter((schedule) => schedule.day === day)
            .sort((left, right) => left.start_time.localeCompare(right.start_time)),
    })), [schedules]);

    const selectedDaySchedules = schedulesByDay.find((item) => item.day === selectedDay)?.items ?? [];
    const totalViolationPoints = violations.reduce((sum, violation) => sum + violation.points, 0);
    const latestViolation = [...violations].sort((left, right) => (toDate(right.date)?.getTime() ?? 0) - (toDate(left.date)?.getTime() ?? 0))[0];
    const violationGroups = useMemo(() => {
        const grouped = violations.reduce((acc, violation) => {
            acc[violation.type] = (acc[violation.type] || 0) + violation.points;
            return acc;
        }, {} as Record<string, number>);
        return Object.entries(grouped).sort((left, right) => right[1] - left[1]);
    }, [violations]);

    const selectedReport = reports.find((report) => report.id === selectedReportId) ?? reports[0] ?? null;
    const sectionCounts: Record<PortalMoreSection, number | string> = {
        tugas: activeTasks.length,
        jadwal: schedules.length,
        perilaku: totalViolationPoints,
        dokumen: reports.length,
        pengaturan: 'Akun',
    };

    const taskFilters: { value: TaskView; label: string; count: number }[] = [
        { value: 'all', label: 'Semua', count: tasks.length },
        { value: 'active', label: 'Aktif', count: activeTasks.length },
        { value: 'overdue', label: 'Terlambat', count: overdueTasks.length },
        { value: 'done', label: 'Selesai', count: doneTasks.length },
    ];

    return (
        <div className="space-y-6 p-4 sm:p-6">
            <section className="overflow-hidden rounded-[32px] border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
                <div className="bg-[radial-gradient(circle_at_top_right,rgba(251,191,36,0.18),transparent_30%),linear-gradient(135deg,#fff7ed_0%,#ffffff_48%,#f8fafc_100%)] p-5 dark:bg-[radial-gradient(circle_at_top_right,rgba(251,191,36,0.12),transparent_32%),linear-gradient(135deg,#0f172a_0%,#111827_52%,#020617_100%)] sm:p-6">
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-amber-700 dark:text-amber-300">Layanan Tambahan</p>
                    <div className="mt-2 flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
                        <div>
                            <h3 className="text-2xl font-bold text-slate-900 dark:text-white">Pusat informasi praktis untuk wali murid</h3>
                            <p className="mt-1 max-w-2xl text-sm leading-6 text-slate-600 dark:text-slate-300">
                                Setiap menu dibuat seperti kartu kerja agar orang tua bisa langsung tahu hal yang perlu dibaca, dipantau, atau ditindaklanjuti.
                            </p>
                        </div>
                        <button
                            className="inline-flex items-center justify-center rounded-2xl bg-slate-950 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 dark:bg-white dark:text-slate-950 dark:hover:bg-slate-100"
                            onClick={onDownloadPdf}
                        >
                            <DownloadIcon className="mr-2 h-4 w-4" />
                            Unduh Ringkasan
                        </button>
                    </div>
                    <div className="mt-5 grid gap-3 lg:grid-cols-5">
                        {sections.map((section) => {
                            const Icon = sectionIcons[section];
                            const isActive = activeSection === section;

                            return (
                                <button
                                    key={section}
                                    type="button"
                                    className={`group relative overflow-hidden rounded-3xl border p-4 text-left transition hover:-translate-y-0.5 hover:shadow-md ${isActive
                                        ? 'border-transparent bg-slate-950 text-white shadow-[0_18px_40px_-28px_rgba(15,23,42,0.8)] dark:bg-white dark:text-slate-950'
                                        : 'border-slate-200 bg-white/75 text-slate-700 hover:border-slate-300 dark:border-slate-700 dark:bg-slate-900/70 dark:text-slate-200 dark:hover:border-slate-600'
                                        }`}
                                    onClick={() => onSectionChange(section)}
                                >
                                    <div className={`absolute inset-x-0 top-0 h-1 bg-gradient-to-r ${sectionTone[section]}`} />
                                    <div className="flex items-start justify-between gap-3">
                                        <span className={`inline-flex h-11 w-11 items-center justify-center rounded-2xl ${isActive ? 'bg-white/10 dark:bg-slate-950/10' : 'bg-slate-100 text-slate-900 dark:bg-slate-800 dark:text-white'}`}>
                                            <Icon className="h-5 w-5" />
                                        </span>
                                        <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${isActive ? 'bg-white/10 dark:bg-slate-950/10' : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200'}`}>
                                            {sectionCounts[section]}
                                        </span>
                                    </div>
                                    <p className="mt-4 text-sm font-bold">{sectionLabels[section]}</p>
                                    <p className={`mt-2 text-xs leading-5 ${isActive ? 'text-white/75 dark:text-slate-700' : 'text-slate-500 dark:text-slate-400'}`}>
                                        {sectionDescriptions[section]}
                                    </p>
                                </button>
                            );
                        })}
                    </div>
                </div>
            </section>

            {activeSection === 'tugas' && (
                <section className="grid gap-6 xl:grid-cols-[0.85fr_1.15fr]">
                    <div className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
                        <div className="flex items-center gap-2">
                            <BookOpenIcon className="h-5 w-5 text-indigo-500" />
                            <h3 className="text-lg font-semibold text-slate-900 dark:text-white">Ringkasan Tugas</h3>
                        </div>
                        <div className="mt-5 grid gap-3 sm:grid-cols-3 xl:grid-cols-1">
                            <div className="rounded-2xl border border-indigo-200 bg-indigo-50 p-4 dark:border-indigo-900/30 dark:bg-indigo-950/30">
                                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-indigo-600 dark:text-indigo-300">Aktif</p>
                                <p className="mt-2 text-3xl font-bold text-indigo-700 dark:text-indigo-200">{activeTasks.length}</p>
                            </div>
                            <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 dark:border-rose-900/30 dark:bg-rose-950/30">
                                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-rose-600 dark:text-rose-300">Terlambat</p>
                                <p className="mt-2 text-3xl font-bold text-rose-700 dark:text-rose-200">{overdueTasks.length}</p>
                            </div>
                            <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 dark:border-emerald-900/30 dark:bg-emerald-950/30">
                                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-emerald-600 dark:text-emerald-300">Selesai</p>
                                <p className="mt-2 text-3xl font-bold text-emerald-700 dark:text-emerald-200">{doneTasks.length}</p>
                            </div>
                        </div>
                        <div className="mt-5 rounded-2xl bg-slate-50 p-4 dark:bg-slate-800/70">
                            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">Prioritas Wali</p>
                            <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">
                                {upcomingTask
                                    ? `Tugas terdekat: ${upcomingTask.title}${upcomingTask.due_date ? `, batas ${longDateFormatter.format(toDate(upcomingTask.due_date)!)}.` : '.'}`
                                    : 'Belum ada tugas aktif dengan tenggat yang perlu diprioritaskan.'}
                            </p>
                        </div>
                    </div>

                    <div className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                            <div>
                                <h3 className="text-lg font-semibold text-slate-900 dark:text-white">Daftar Tugas Siswa</h3>
                                <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Gunakan filter untuk melihat tugas yang butuh perhatian.</p>
                            </div>
                            <div className="flex flex-wrap gap-2">
                                {taskFilters.map((filter) => (
                                    <button
                                        key={filter.value}
                                        type="button"
                                        onClick={() => setTaskView(filter.value)}
                                        className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${taskView === filter.value
                                            ? 'bg-slate-950 text-white dark:bg-white dark:text-slate-950'
                                            : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700'
                                            }`}
                                    >
                                        {filter.label} ({filter.count})
                                    </button>
                                ))}
                            </div>
                        </div>
                        <div className="mt-5 space-y-3">
                            {filteredTasks.length === 0 ? (
                                <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-4 py-8 text-center text-sm text-slate-500 dark:border-slate-700 dark:bg-slate-800/50 dark:text-slate-400">
                                    Tidak ada tugas pada filter ini.
                                </div>
                            ) : filteredTasks.map((task) => {
                                const daysUntilDue = getDaysUntilDue(task);
                                return (
                                    <div key={task.id} className="rounded-3xl border border-slate-200 bg-slate-50 p-4 transition hover:-translate-y-0.5 hover:bg-white hover:shadow-md dark:border-slate-700 dark:bg-slate-800/70 dark:hover:bg-slate-800">
                                        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                                            <div className="min-w-0">
                                                <div className="flex flex-wrap items-center gap-2">
                                                    <p className="font-semibold text-slate-900 dark:text-white">{task.title}</p>
                                                    <span className={`rounded-full border px-2.5 py-1 text-xs font-bold ${getTaskTone(task)}`}>{getTaskStatusLabel(task)}</span>
                                                </div>
                                                <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-400">{task.description || 'Tidak ada deskripsi detail dari guru.'}</p>
                                            </div>
                                            {task.due_date && (
                                                <div className="shrink-0 rounded-2xl bg-white px-3 py-2 text-sm shadow-sm dark:bg-slate-900">
                                                    <div className="flex items-center gap-2 font-semibold text-slate-900 dark:text-white">
                                                        <ClockIcon className="h-4 w-4 text-amber-500" />
                                                        {dateFormatter.format(toDate(task.due_date)!)}
                                                    </div>
                                                    <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                                                        {daysUntilDue === null ? 'Tanpa deadline' : daysUntilDue < 0 ? `${Math.abs(daysUntilDue)} hari lewat` : daysUntilDue === 0 ? 'Hari ini' : `${daysUntilDue} hari lagi`}
                                                    </p>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </section>
            )}

            {activeSection === 'jadwal' && (
                <section className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:p-6">
                    <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
                        <div>
                            <div className="flex items-center gap-2">
                                <CalendarIcon className="h-5 w-5 text-emerald-500" />
                                <h3 className="text-lg font-semibold text-slate-900 dark:text-white">Jadwal Pelajaran</h3>
                            </div>
                            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Pilih hari untuk melihat urutan pelajaran yang perlu disiapkan.</p>
                        </div>
                        <div className="flex flex-wrap gap-2">
                            {schedulesByDay.map(({ day, items }) => (
                                <button
                                    key={day}
                                    type="button"
                                    onClick={() => setSelectedDay(day)}
                                    className={`rounded-2xl px-3 py-2 text-sm font-semibold transition ${selectedDay === day
                                        ? 'bg-emerald-600 text-white shadow-sm'
                                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700'
                                        }`}
                                >
                                    {day}
                                    <span className="ml-2 rounded-full bg-white/20 px-2 py-0.5 text-xs">{items.length}</span>
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="mt-6 grid gap-6 xl:grid-cols-[0.75fr_1.25fr]">
                        <div className="rounded-[28px] border border-emerald-200 bg-emerald-50 p-5 dark:border-emerald-900/30 dark:bg-emerald-950/30">
                            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-700 dark:text-emerald-300">Hari Dipilih</p>
                            <p className="mt-2 text-3xl font-bold text-emerald-800 dark:text-emerald-100">{selectedDay}</p>
                            <p className="mt-3 text-sm leading-6 text-emerald-700 dark:text-emerald-200">
                                {selectedDaySchedules.length > 0
                                    ? `${selectedDaySchedules.length} pelajaran tercatat. Siapkan buku sesuai urutan jam pelajaran.`
                                    : 'Belum ada jadwal pelajaran pada hari ini.'}
                            </p>
                        </div>

                        <div className="space-y-3">
                            {selectedDaySchedules.length === 0 ? (
                                <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-4 py-8 text-center text-sm text-slate-500 dark:border-slate-700 dark:bg-slate-800/50 dark:text-slate-400">
                                    Belum ada jadwal untuk {selectedDay}.
                                </div>
                            ) : selectedDaySchedules.map((schedule, index) => (
                                <div key={schedule.id} className="flex gap-4 rounded-3xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-800/70">
                                    <div className="flex flex-col items-center">
                                        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-600 text-sm font-bold text-white">{index + 1}</div>
                                        {index < selectedDaySchedules.length - 1 && <div className="mt-2 h-full w-px bg-slate-200 dark:bg-slate-700" />}
                                    </div>
                                    <div className="min-w-0 flex-1">
                                        <p className="font-semibold text-slate-900 dark:text-white">{schedule.subject}</p>
                                        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                                            {schedule.start_time.substring(0, 5)} - {schedule.end_time.substring(0, 5)}
                                        </p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </section>
            )}

            {activeSection === 'perilaku' && (
                <section className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
                    <div className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
                        <div className="flex items-center gap-2">
                            <ShieldAlertIcon className="h-5 w-5 text-rose-500" />
                            <h3 className="text-lg font-semibold text-slate-900 dark:text-white">Ringkasan Perilaku</h3>
                        </div>
                        <div className="mt-5 rounded-[28px] border border-rose-200 bg-rose-50 p-5 dark:border-rose-900/30 dark:bg-rose-950/30">
                            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-rose-600 dark:text-rose-300">Total Poin Catatan</p>
                            <p className="mt-2 text-4xl font-black text-rose-700 dark:text-rose-100">{totalViolationPoints}</p>
                            <p className="mt-3 text-sm leading-6 text-rose-700 dark:text-rose-200">
                                {totalViolationPoints === 0
                                    ? 'Tidak ada catatan perilaku pada semester ini.'
                                    : 'Gunakan catatan ini sebagai bahan pendampingan, bukan untuk menyalahkan siswa.'}
                            </p>
                        </div>
                        {latestViolation && (
                            <div className="mt-4 rounded-2xl bg-slate-50 p-4 dark:bg-slate-800/70">
                                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">Catatan Terbaru</p>
                                <p className="mt-2 font-semibold text-slate-900 dark:text-white">{latestViolation.type}</p>
                                <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">{dateFormatter.format(toDate(latestViolation.date)!)} - {latestViolation.description || 'Tidak ada deskripsi tambahan.'}</p>
                            </div>
                        )}
                    </div>

                    <div className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
                        <h3 className="text-lg font-semibold text-slate-900 dark:text-white">Area yang Perlu Didampingi</h3>
                        <div className="mt-5 space-y-3">
                            {violations.length === 0 ? (
                                <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-4 py-8 text-center text-sm text-slate-500 dark:border-slate-700 dark:bg-slate-800/50 dark:text-slate-400">
                                    Tidak ada catatan perilaku pada semester ini.
                                </div>
                            ) : (
                                <>
                                    {violationGroups.map(([type, points]) => (
                                        <div key={type} className="rounded-2xl bg-slate-50 p-4 dark:bg-slate-800/70">
                                            <div className="flex items-center justify-between gap-4">
                                                <p className="font-semibold text-slate-900 dark:text-white">{type}</p>
                                                <span className="rounded-full bg-rose-100 px-3 py-1 text-sm font-bold text-rose-700 dark:bg-rose-900/30 dark:text-rose-200">+{points}</span>
                                            </div>
                                            <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700">
                                                <div className="h-full rounded-full bg-gradient-to-r from-rose-500 to-orange-500" style={{ width: `${Math.min(100, Math.round((points / Math.max(totalViolationPoints, 1)) * 100))}%` }} />
                                            </div>
                                        </div>
                                    ))}
                                    <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-800 dark:border-amber-900/30 dark:bg-amber-950/30 dark:text-amber-100">
                                        <InfoIcon className="mr-2 inline h-4 w-4" />
                                        Saran: tanyakan situasi di sekolah dengan tenang, lalu sepakati satu kebiasaan kecil yang bisa diperbaiki minggu ini.
                                    </div>
                                </>
                            )}
                        </div>
                    </div>
                </section>
            )}

            {activeSection === 'dokumen' && (
                <section className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
                    <div className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
                        <div className="flex items-center justify-between gap-4">
                            <div>
                                <h3 className="text-lg font-semibold text-slate-900 dark:text-white">Dokumen Sekolah</h3>
                                <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Sekolah: {schoolInfo.school_name}</p>
                            </div>
                            <button className="rounded-2xl bg-amber-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-amber-600" onClick={onDownloadPdf}>
                                <DownloadIcon className="mr-2 inline-block h-4 w-4" />
                                PDF
                            </button>
                        </div>
                        <div className="mt-5 space-y-3">
                            {reports.length === 0 ? (
                                <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-4 py-8 text-center text-sm text-slate-500 dark:border-slate-700 dark:bg-slate-800/50 dark:text-slate-400">
                                    Belum ada dokumen yang dibagikan.
                                </div>
                            ) : reports.map((report) => (
                                <button
                                    key={report.id}
                                    type="button"
                                    onClick={() => setSelectedReportId(report.id)}
                                    className={`w-full rounded-3xl border p-4 text-left transition hover:-translate-y-0.5 hover:shadow-md ${selectedReport?.id === report.id
                                        ? 'border-amber-300 bg-amber-50 dark:border-amber-400/30 dark:bg-amber-400/10'
                                        : 'border-slate-200 bg-slate-50 dark:border-slate-700 dark:bg-slate-800/70'
                                        }`}
                                >
                                    <div className="flex items-start gap-3">
                                        <div className="rounded-2xl bg-white p-2 text-amber-600 shadow-sm dark:bg-slate-900 dark:text-amber-300">
                                            <FileTextIcon className="h-5 w-5" />
                                        </div>
                                        <div className="min-w-0 flex-1">
                                            <p className="font-semibold text-slate-900 dark:text-white">{report.title}</p>
                                            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{report.type}</p>
                                            <p className="mt-2 text-xs font-medium uppercase tracking-[0.14em] text-slate-400 dark:text-slate-500">
                                                {dateFormatter.format(toDate(report.date || report.created_at)!)}
                                            </p>
                                        </div>
                                    </div>
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
                        <h3 className="text-lg font-semibold text-slate-900 dark:text-white">Preview Dokumen</h3>
                        {selectedReport ? (
                            <div className="mt-5 rounded-3xl border border-slate-200 bg-slate-50 p-5 dark:border-slate-700 dark:bg-slate-800/70">
                                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">{selectedReport.type}</p>
                                <h4 className="mt-2 text-2xl font-bold text-slate-900 dark:text-white">{selectedReport.title}</h4>
                                <p className="mt-3 text-sm leading-6 text-slate-600 dark:text-slate-300">
                                    {selectedReport.content || 'Dokumen ini tersedia sebagai arsip portal. Unduh PDF ringkasan jika ingin menyimpan salinan.'}
                                </p>
                                <button className="mt-5 inline-flex items-center rounded-2xl bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800 dark:bg-white dark:text-slate-950" onClick={onDownloadPdf}>
                                    <DownloadIcon className="mr-2 h-4 w-4" />
                                    Unduh Ringkasan
                                </button>
                            </div>
                        ) : (
                            <div className="mt-5 rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-4 py-8 text-center text-sm text-slate-500 dark:border-slate-700 dark:bg-slate-800/50 dark:text-slate-400">
                                Pilih dokumen untuk melihat preview.
                            </div>
                        )}
                    </div>
                </section>
            )}

            {activeSection === 'pengaturan' && (
                <section className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:p-6">
                    <div className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
                        <div>
                            <div className="flex items-center gap-2">
                                <SettingsIcon className="h-5 w-5 text-slate-700 dark:text-slate-200" />
                                <h3 className="text-lg font-semibold text-slate-900 dark:text-white">Pengaturan Portal</h3>
                            </div>
                            <p className="mt-3 text-sm leading-6 text-slate-600 dark:text-slate-400">
                                Pastikan data wali dan nomor WhatsApp aktif agar informasi dari sekolah mudah diterima.
                            </p>
                            <div className="mt-5 flex flex-wrap gap-3">
                                <button className="rounded-2xl bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800 dark:bg-white dark:text-slate-950" onClick={onOpenSettings}>Buka Pengaturan</button>
                                <button className="rounded-2xl bg-slate-100 px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700" onClick={onDownloadPdf}>Unduh PDF</button>
                            </div>
                        </div>

                        <div className="grid gap-3 sm:grid-cols-3">
                            {[
                                { title: 'Data wali', desc: 'Nama wali perlu valid untuk arsip sekolah.', icon: CheckCircleIcon },
                                { title: 'Nomor WhatsApp', desc: 'Dipakai untuk notifikasi dan komunikasi cepat.', icon: AlertTriangleIcon },
                                { title: 'Ringkasan PDF', desc: 'Bisa diunduh kapan saja sesuai semester aktif.', icon: DownloadIcon },
                            ].map((item) => (
                                <div key={item.title} className="rounded-3xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-800/70">
                                    <item.icon className="h-5 w-5 text-slate-700 dark:text-slate-200" />
                                    <p className="mt-3 font-semibold text-slate-900 dark:text-white">{item.title}</p>
                                    <p className="mt-1 text-sm leading-5 text-slate-500 dark:text-slate-400">{item.desc}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                </section>
            )}
        </div>
    );
};
