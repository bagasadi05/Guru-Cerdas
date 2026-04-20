import React, { useEffect, useMemo, useState } from 'react';
import {
    AlertTriangleIcon,
    BrainCircuitIcon,
    CalendarIcon,
    CheckCircleIcon,
    ClockIcon,
    SparklesIcon,
} from '../../Icons';
import { AttendanceCalendar } from '../../attendance/AttendanceCalendar';
import { AttendanceStatus } from '../../../types';
import type { AttendanceSummary, PortalAttendance } from './types';

interface PortalAttendanceTabProps {
    attendance: PortalAttendance[];
    summary: AttendanceSummary;
}

interface AttendanceInsight {
    id: string;
    title: string;
    description: string;
    action: string;
    tone: 'good' | 'watch' | 'alert';
}

const monthFormatter = new Intl.DateTimeFormat('id-ID', {
    month: 'long',
    year: 'numeric',
});

const dateFormatter = new Intl.DateTimeFormat('id-ID', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
});

const compactDateFormatter = new Intl.DateTimeFormat('id-ID', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
});

const statusToneMap: Record<PortalAttendance['status'], string> = {
    Hadir: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300',
    Izin: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300',
    Sakit: 'bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-300',
    Alpha: 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300',
};

const toDate = (value: string) => new Date(`${value}T00:00:00`);

const sortAttendanceDesc = (records: PortalAttendance[]) => (
    [...records].sort((left, right) => toDate(right.date).getTime() - toDate(left.date).getTime())
);

const getAttendanceInsights = (
    attendance: PortalAttendance[],
    summary: AttendanceSummary
): AttendanceInsight[] => {
    if (attendance.length === 0) {
        return [{
            id: 'attendance-empty',
            title: 'Belum ada pola kehadiran yang bisa dibaca',
            description: 'Data kehadiran semester ini masih kosong sehingga sistem belum bisa memberi saran yang akurat.',
            action: 'Mulai pantau kembali setelah data presensi masuk.',
            tone: 'watch',
        }];
    }

    const totalRecorded = summary.present + summary.permission + summary.sick + summary.absent;
    const presentRate = totalRecorded > 0 ? Math.round((summary.present / totalRecorded) * 100) : 0;
    const sortedRecords = sortAttendanceDesc(attendance);
    const recentRecords = sortedRecords.slice(0, 6);
    const recentNonPresent = recentRecords.filter((record) => record.status !== 'Hadir').length;
    const recentAbsent = recentRecords.filter((record) => record.status === 'Alpha').length;
    const latestNonPresent = sortedRecords.find((record) => record.status !== 'Hadir');

    const insights: AttendanceInsight[] = [];

    if (presentRate >= 90 && summary.absent === 0) {
        insights.push({
            id: 'attendance-strong',
            title: 'Kehadiran siswa sangat baik',
            description: `Tingkat hadir tercatat ${presentRate}% dengan tanpa alpha pada semester yang dipilih.`,
            action: 'Pertahankan rutinitas belajar dan jam istirahat yang sudah berjalan baik.',
            tone: 'good',
        });
    }

    if (summary.absent >= 2 || recentAbsent >= 1) {
        insights.push({
            id: 'attendance-alert-absent',
            title: 'Perlu perhatian pada catatan alpha',
            description: summary.absent >= 2
                ? `Terdapat ${summary.absent} kejadian alpha yang berpotensi mengganggu kontinuitas belajar siswa.`
                : 'Ada catatan alpha pada riwayat terbaru yang perlu segera dikonfirmasi.',
            action: 'Segera koordinasikan dengan siswa dan wali kelas untuk mengetahui penyebab dan mencegah pengulangan.',
            tone: 'alert',
        });
    }

    if (summary.sick >= 3) {
        insights.push({
            id: 'attendance-watch-sick',
            title: 'Frekuensi sakit cukup sering',
            description: `Terdapat ${summary.sick} catatan sakit pada semester ini sehingga ritme belajar bisa ikut terdampak.`,
            action: 'Pantau kondisi kesehatan siswa dan siapkan dukungan belajar susulan saat diperlukan.',
            tone: 'watch',
        });
    }

    if (summary.permission >= 3) {
        insights.push({
            id: 'attendance-watch-permission',
            title: 'Izin sudah beberapa kali tercatat',
            description: `Siswa memiliki ${summary.permission} catatan izin. Jika berulang, materi tertentu bisa tertinggal.`,
            action: 'Bantu siswa mengecek tugas dan materi yang terlewat setiap selesai izin.',
            tone: 'watch',
        });
    }

    if (recentNonPresent >= 3) {
        insights.push({
            id: 'attendance-recent-pattern',
            title: 'Pola kehadiran terbaru sedang menurun',
            description: `Dalam ${recentRecords.length} catatan terakhir, ${recentNonPresent} di antaranya bukan status hadir.`,
            action: 'Lakukan pemantauan harian sementara sampai pola kehadiran kembali stabil.',
            tone: 'alert',
        });
    }

    if (insights.length === 0) {
        insights.push({
            id: 'attendance-stable',
            title: 'Kehadiran relatif stabil',
            description: latestNonPresent
                ? `Secara umum kehadiran cukup terjaga. Catatan terakhir yang perlu dicermati adalah status ${latestNonPresent.status.toLowerCase()} pada ${compactDateFormatter.format(toDate(latestNonPresent.date))}.`
                : 'Mayoritas catatan menunjukkan pola hadir yang cukup konsisten pada semester ini.',
            action: 'Tetap cek kalender presensi secara berkala agar perubahan pola cepat terdeteksi.',
            tone: 'good',
        });
    }

    return insights.slice(0, 3);
};

export const PortalAttendanceTab: React.FC<PortalAttendanceTabProps> = ({ attendance, summary }) => {
    const sortedAttendance = useMemo(() => sortAttendanceDesc(attendance), [attendance]);
    const defaultSelectedDate = sortedAttendance[0]?.date ?? null;
    const [selectedDate, setSelectedDate] = useState<string | undefined>(defaultSelectedDate ?? undefined);
    const [visibleMonth, setVisibleMonth] = useState<Date>(() => (
        defaultSelectedDate ? toDate(defaultSelectedDate) : new Date()
    ));

    useEffect(() => {
        const timer = window.setTimeout(() => {
            setSelectedDate(defaultSelectedDate ?? undefined);
            if (defaultSelectedDate) {
                setVisibleMonth(toDate(defaultSelectedDate));
            }
        }, 0);

        return () => window.clearTimeout(timer);
    }, [defaultSelectedDate]);

    const selectedRecord = useMemo(
        () => attendance.find((record) => record.date === selectedDate) ?? null,
        [attendance, selectedDate]
    );

    const currentMonthRecords = useMemo(() => (
        attendance.filter((record) => {
            const recordDate = toDate(record.date);
            return (
                recordDate.getMonth() === visibleMonth.getMonth() &&
                recordDate.getFullYear() === visibleMonth.getFullYear()
            );
        })
    ), [attendance, visibleMonth]);

    const currentMonthSummary = useMemo(() => ({
        present: currentMonthRecords.filter((record) => record.status === 'Hadir').length,
        permission: currentMonthRecords.filter((record) => record.status === 'Izin').length,
        sick: currentMonthRecords.filter((record) => record.status === 'Sakit').length,
        absent: currentMonthRecords.filter((record) => record.status === 'Alpha').length,
    }), [currentMonthRecords]);

    const attendanceRate = useMemo(() => {
        const total = summary.present + summary.permission + summary.sick + summary.absent;
        return total > 0 ? Math.round((summary.present / total) * 100) : 0;
    }, [summary]);

    const attendanceInsights = useMemo(
        () => getAttendanceInsights(attendance, summary),
        [attendance, summary]
    );

    return (
        <div className="space-y-6 p-4 sm:p-6">
            <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:p-6">
                <div className="flex items-center gap-2">
                    <ClockIcon className="h-5 w-5 text-indigo-500" />
                    <h3 className="text-lg font-semibold text-slate-900 dark:text-white">Kehadiran</h3>
                </div>
                <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
                    <div className="rounded-2xl border border-indigo-200 bg-indigo-50 p-4 dark:border-indigo-900/30 dark:bg-indigo-950/20">
                        <p className="text-xs font-bold uppercase text-indigo-600 dark:text-indigo-300">Tingkat Hadir</p>
                        <p className="mt-2 text-2xl font-bold text-indigo-700 dark:text-indigo-200">{attendanceRate}%</p>
                    </div>
                    <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 dark:border-emerald-900/30 dark:bg-emerald-950/30">
                        <p className="text-xs font-bold uppercase text-emerald-600 dark:text-emerald-300">Hadir</p>
                        <p className="mt-2 text-2xl font-bold text-emerald-700 dark:text-emerald-200">{summary.present}</p>
                    </div>
                    <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 dark:border-amber-900/30 dark:bg-amber-950/30">
                        <p className="text-xs font-bold uppercase text-amber-600 dark:text-amber-300">Izin</p>
                        <p className="mt-2 text-2xl font-bold text-amber-700 dark:text-amber-200">{summary.permission}</p>
                    </div>
                    <div className="rounded-2xl border border-sky-200 bg-sky-50 p-4 dark:border-sky-900/30 dark:bg-sky-950/30">
                        <p className="text-xs font-bold uppercase text-sky-600 dark:text-sky-300">Sakit</p>
                        <p className="mt-2 text-2xl font-bold text-sky-700 dark:text-sky-200">{summary.sick}</p>
                    </div>
                    <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 dark:border-rose-900/30 dark:bg-rose-950/30">
                        <p className="text-xs font-bold uppercase text-rose-600 dark:text-rose-300">Alpha</p>
                        <p className="mt-2 text-2xl font-bold text-rose-700 dark:text-rose-200">{summary.absent}</p>
                    </div>
                </div>
            </section>

            <section className="grid gap-6 xl:grid-cols-[1.35fr_0.65fr]">
                <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:p-6">
                    <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
                        <div>
                            <h4 className="text-lg font-semibold text-slate-900 dark:text-white">Kalender Kehadiran</h4>
                            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                                Orang tua dapat melihat status hadir siswa langsung pada tanggal yang tercatat.
                            </p>
                        </div>
                        <div className="text-sm text-slate-500 dark:text-slate-400">
                            Bulan aktif: {monthFormatter.format(visibleMonth)}
                        </div>
                    </div>
                    <div className="mt-5">
                        <AttendanceCalendar
                            records={attendance.map((record) => ({
                                date: record.date,
                                status: record.status as AttendanceStatus,
                            }))}
                            selectedDate={selectedDate}
                            onDateClick={setSelectedDate}
                            onMonthChange={setVisibleMonth}
                        />
                    </div>
                </div>

                <div className="space-y-6">
                    <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:p-6">
                        <div className="flex items-center gap-2">
                            <CalendarIcon className="h-5 w-5 text-indigo-500" />
                            <h4 className="text-lg font-semibold text-slate-900 dark:text-white">Detail Tanggal Dipilih</h4>
                        </div>
                        <div className="mt-5 space-y-4">
                            {selectedRecord ? (
                                <>
                                    <div className="rounded-2xl bg-slate-50 p-4 dark:bg-slate-800/70">
                                        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">Tanggal</p>
                                        <p className="mt-2 text-base font-semibold text-slate-900 dark:text-white">
                                            {dateFormatter.format(toDate(selectedRecord.date))}
                                        </p>
                                    </div>
                                    <div className="rounded-2xl bg-slate-50 p-4 dark:bg-slate-800/70">
                                        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">Status</p>
                                        <span className={`mt-2 inline-flex rounded-full px-3 py-1 text-sm font-semibold ${statusToneMap[selectedRecord.status]}`}>
                                            {selectedRecord.status}
                                        </span>
                                    </div>
                                    <div className="rounded-2xl bg-slate-50 p-4 dark:bg-slate-800/70">
                                        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">Catatan</p>
                                        <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">
                                            {selectedRecord.notes || 'Tidak ada catatan tambahan pada tanggal ini.'}
                                        </p>
                                    </div>
                                </>
                            ) : (
                                <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-4 py-8 text-center text-sm text-slate-500 dark:border-slate-700 dark:bg-slate-800/50 dark:text-slate-400">
                                    Pilih tanggal pada kalender untuk melihat detail kehadiran siswa.
                                </div>
                            )}
                        </div>
                    </section>

                    <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:p-6">
                        <div className="flex items-center gap-2">
                            <CheckCircleIcon className="h-5 w-5 text-emerald-500" />
                            <h4 className="text-lg font-semibold text-slate-900 dark:text-white">Ringkasan Bulan Ini</h4>
                        </div>
                        <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
                            <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 dark:border-emerald-900/30 dark:bg-emerald-950/30">
                                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-emerald-600 dark:text-emerald-300">Hadir</p>
                                <p className="mt-2 text-2xl font-bold text-emerald-700 dark:text-emerald-200">{currentMonthSummary.present}</p>
                            </div>
                            <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 dark:border-amber-900/30 dark:bg-amber-950/30">
                                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-amber-600 dark:text-amber-300">Izin / Sakit</p>
                                <p className="mt-2 text-2xl font-bold text-amber-700 dark:text-amber-200">{currentMonthSummary.permission + currentMonthSummary.sick}</p>
                            </div>
                            <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 dark:border-rose-900/30 dark:bg-rose-950/30">
                                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-rose-600 dark:text-rose-300">Alpha</p>
                                <p className="mt-2 text-2xl font-bold text-rose-700 dark:text-rose-200">{currentMonthSummary.absent}</p>
                            </div>
                        </div>
                    </section>
                </div>
            </section>

            <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:p-6">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
                    <div>
                        <div className="flex items-center gap-2">
                            <BrainCircuitIcon className="h-5 w-5 text-violet-500" />
                            <h4 className="text-lg font-semibold text-slate-900 dark:text-white">Saran AI Kehadiran</h4>
                        </div>
                        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                            Saran ini dihasilkan langsung dari pola kehadiran semester yang sedang ditampilkan.
                        </p>
                    </div>
                </div>

                <div className="mt-5 grid gap-4 lg:grid-cols-3">
                    {attendanceInsights.map((insight) => {
                        const toneClass = insight.tone === 'good'
                            ? 'border-emerald-200 bg-emerald-50 dark:border-emerald-900/30 dark:bg-emerald-950/30'
                            : insight.tone === 'watch'
                                ? 'border-amber-200 bg-amber-50 dark:border-amber-900/30 dark:bg-amber-950/30'
                                : 'border-rose-200 bg-rose-50 dark:border-rose-900/30 dark:bg-rose-950/30';

                        const icon = insight.tone === 'good'
                            ? <SparklesIcon className="h-5 w-5 text-emerald-600 dark:text-emerald-300" />
                            : insight.tone === 'watch'
                                ? <ClockIcon className="h-5 w-5 text-amber-600 dark:text-amber-300" />
                                : <AlertTriangleIcon className="h-5 w-5 text-rose-600 dark:text-rose-300" />;

                        return (
                            <div key={insight.id} className={`rounded-3xl border p-4 ${toneClass}`}>
                                <div className="flex items-start gap-3">
                                    <div className="mt-0.5">{icon}</div>
                                    <div>
                                        <p className="font-semibold text-slate-900 dark:text-white">{insight.title}</p>
                                        <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">{insight.description}</p>
                                        <p className="mt-3 text-sm font-medium text-slate-700 dark:text-slate-200">
                                            Saran: {insight.action}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </section>

            <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:p-6">
                <h4 className="text-lg font-semibold text-slate-900 dark:text-white">Riwayat Terbaru</h4>
                <div className="mt-5 space-y-3">
                    {sortedAttendance.length === 0 ? (
                        <p className="text-sm text-slate-500 dark:text-slate-400">Belum ada data kehadiran untuk semester ini.</p>
                    ) : sortedAttendance.slice(0, 8).map((record) => (
                        <button
                            key={record.id}
                            type="button"
                            onClick={() => setSelectedDate(record.date)}
                            className="flex w-full items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-left transition hover:border-slate-300 hover:bg-white dark:border-slate-700 dark:bg-slate-800/70 dark:hover:border-slate-600 dark:hover:bg-slate-800"
                        >
                            <div className="min-w-0 flex-1">
                                <p className="font-medium text-slate-900 dark:text-white">{dateFormatter.format(toDate(record.date))}</p>
                                <p className="text-xs text-slate-500 dark:text-slate-400">{record.notes || 'Tidak ada catatan tambahan.'}</p>
                            </div>
                            <span className={`rounded-full px-3 py-1 text-xs font-bold ${statusToneMap[record.status]}`}>{record.status}</span>
                        </button>
                    ))}
                </div>
            </section>
        </div>
    );
};
