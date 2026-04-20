import React, { useMemo } from 'react';
import {
    AlertTriangleIcon,
    BarChartIcon,
    BookOpenIcon,
    CalendarIcon,
    CheckCircleIcon,
    ClockIcon,
    MinusIcon,
    ShieldAlertIcon,
    SparklesIcon,
    StarIcon,
    TargetIcon,
    TrendingDownIcon,
    TrendingUpIcon,
} from '../Icons';

interface AcademicRecord {
    id: string;
    subject: string;
    score: number;
    assessment_name?: string | null;
    notes?: string;
}

interface AttendanceRecord {
    id: string;
    status: string;
    date: string;
}

interface Violation {
    id: string;
    description: string | null;
    points: number;
    date: string;
}

interface ChildAnalyticsProps {
    academicRecords: AcademicRecord[];
    attendanceRecords: AttendanceRecord[];
    violations: Violation[];
    studentName: string;
    className?: string;
}

type Tone = 'success' | 'info' | 'warning' | 'danger';
type Trend = 'up' | 'down' | 'stable';

interface FocusItem {
    title: string;
    description: string;
    tone: Tone;
    icon: React.ElementType;
}

const toneStyles: Record<Tone, {
    card: string;
    icon: string;
    badge: string;
    bar: string;
}> = {
    success: {
        card: 'border-emerald-200 bg-emerald-50 text-emerald-900 dark:border-emerald-400/20 dark:bg-emerald-400/10 dark:text-emerald-100',
        icon: 'bg-emerald-500 text-white',
        badge: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-400/15 dark:text-emerald-200',
        bar: 'bg-emerald-500',
    },
    info: {
        card: 'border-sky-200 bg-sky-50 text-sky-900 dark:border-sky-400/20 dark:bg-sky-400/10 dark:text-sky-100',
        icon: 'bg-sky-500 text-white',
        badge: 'bg-sky-100 text-sky-700 dark:bg-sky-400/15 dark:text-sky-200',
        bar: 'bg-sky-500',
    },
    warning: {
        card: 'border-amber-200 bg-amber-50 text-amber-900 dark:border-amber-400/20 dark:bg-amber-400/10 dark:text-amber-100',
        icon: 'bg-amber-500 text-white',
        badge: 'bg-amber-100 text-amber-700 dark:bg-amber-400/15 dark:text-amber-200',
        bar: 'bg-amber-500',
    },
    danger: {
        card: 'border-rose-200 bg-rose-50 text-rose-900 dark:border-rose-400/20 dark:bg-rose-400/10 dark:text-rose-100',
        icon: 'bg-rose-500 text-white',
        badge: 'bg-rose-100 text-rose-700 dark:bg-rose-400/15 dark:text-rose-200',
        bar: 'bg-rose-500',
    },
};

const normalizeStatus = (status: string): string => status.trim().toLowerCase();

const getAcademicTone = (value: number): Tone => {
    if (value >= 85) return 'success';
    if (value >= 75) return 'info';
    if (value >= 65) return 'warning';
    return 'danger';
};

const getAttendanceTone = (value: number): Tone => {
    if (value >= 95) return 'success';
    if (value >= 85) return 'info';
    if (value >= 75) return 'warning';
    return 'danger';
};

const getBehaviorTone = (points: number): Tone => {
    if (points === 0) return 'success';
    if (points <= 10) return 'info';
    if (points <= 25) return 'warning';
    return 'danger';
};

const getSubjectTone = (value: number): Tone => {
    if (value >= 80) return 'success';
    if (value >= 75) return 'info';
    if (value >= 65) return 'warning';
    return 'danger';
};

const getTrendLabel = (trend: Trend): string => {
    if (trend === 'up') return 'Naik';
    if (trend === 'down') return 'Menurun';
    return 'Stabil';
};

const MetricCard: React.FC<{
    title: string;
    value: string;
    description: string;
    tone: Tone;
    icon: React.ElementType;
    progress?: number;
}> = ({ title, value, description, tone, icon: Icon, progress }) => (
    <div className={`rounded-3xl border p-4 ${toneStyles[tone].card}`}>
        <div className="flex items-start justify-between gap-3">
            <div>
                <p className="text-xs font-semibold uppercase tracking-[0.16em] opacity-70">{title}</p>
                <p className="mt-2 text-3xl font-black">{value}</p>
            </div>
            <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl ${toneStyles[tone].icon}`}>
                <Icon className="h-5 w-5" />
            </div>
        </div>
        <p className="mt-3 text-sm leading-5 opacity-80">{description}</p>
        {typeof progress === 'number' && (
            <div className="mt-4 h-2 overflow-hidden rounded-full bg-white/70 dark:bg-slate-950/40">
                <div className={`h-full rounded-full ${toneStyles[tone].bar}`} style={{ width: `${Math.min(100, Math.max(0, progress))}%` }} />
            </div>
        )}
    </div>
);

const FocusCard: React.FC<FocusItem> = ({ title, description, tone, icon: Icon }) => (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-950/50">
        <div className="flex items-start gap-3">
            <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl ${toneStyles[tone].icon}`}>
                <Icon className="h-5 w-5" />
            </div>
            <div className="min-w-0">
                <p className="font-semibold text-slate-950 dark:text-white">{title}</p>
                <p className="mt-1 text-sm leading-6 text-slate-600 dark:text-slate-300">{description}</p>
            </div>
        </div>
    </div>
);

const SubjectRow: React.FC<{
    subject: string;
    average: number;
    count: number;
}> = ({ subject, average, count }) => {
    const tone = getSubjectTone(average);

    return (
        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-900/60">
            <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                    <p className="truncate font-semibold text-slate-950 dark:text-white">{subject}</p>
                    <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{count} penilaian</p>
                </div>
                <span className={`rounded-full px-3 py-1 text-sm font-bold ${toneStyles[tone].badge}`}>{average}</span>
            </div>
            <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800">
                <div className={`h-full rounded-full ${toneStyles[tone].bar}`} style={{ width: `${Math.min(100, average)}%` }} />
            </div>
        </div>
    );
};

export const ChildDevelopmentAnalytics: React.FC<ChildAnalyticsProps> = ({
    academicRecords,
    attendanceRecords,
    violations,
    studentName,
}) => {
    const academicStats = useMemo(() => {
        if (academicRecords.length === 0) {
            return {
                average: 0,
                highest: 0,
                lowest: 0,
                passRate: 0,
                trend: 'stable' as Trend,
                subjectCount: 0,
                recordCount: 0,
            };
        }

        const scores = academicRecords.map((record) => record.score);
        const average = Math.round(scores.reduce((sum, score) => sum + score, 0) / scores.length);
        const highest = Math.max(...scores);
        const lowest = Math.min(...scores);
        const passRate = Math.round((scores.filter((score) => score >= 75).length / scores.length) * 100);
        const splitIndex = Math.floor(scores.length / 2);
        const recentScores = scores.slice(splitIndex);
        const olderScores = scores.slice(0, splitIndex);
        const recentAverage = recentScores.length > 0 ? recentScores.reduce((sum, score) => sum + score, 0) / recentScores.length : average;
        const olderAverage = olderScores.length > 0 ? olderScores.reduce((sum, score) => sum + score, 0) / olderScores.length : average;
        const trend: Trend = recentAverage > olderAverage + 5 ? 'up' : recentAverage < olderAverage - 5 ? 'down' : 'stable';
        const subjectCount = new Set(academicRecords.map((record) => record.subject)).size;

        return {
            average,
            highest,
            lowest,
            passRate,
            trend,
            subjectCount,
            recordCount: academicRecords.length,
        };
    }, [academicRecords]);

    const attendanceStats = useMemo(() => {
        const total = attendanceRecords.length;
        if (total === 0) {
            return { total: 0, present: 0, absent: 0, sickOrPermission: 0, late: 0, rate: 0 };
        }

        const present = attendanceRecords.filter((record) => normalizeStatus(record.status) === 'hadir').length;
        const absent = attendanceRecords.filter((record) => ['alpa', 'alpha', 'tidak hadir'].includes(normalizeStatus(record.status))).length;
        const sickOrPermission = attendanceRecords.filter((record) => ['sakit', 'izin', 'ijin'].includes(normalizeStatus(record.status))).length;
        const late = attendanceRecords.filter((record) => normalizeStatus(record.status) === 'terlambat').length;
        const rate = Math.round((present / total) * 100);

        return { total, present, absent, sickOrPermission, late, rate };
    }, [attendanceRecords]);

    const behaviorStats = useMemo(() => {
        const totalPoints = violations.reduce((sum, violation) => sum + violation.points, 0);
        const score = Math.max(0, 100 - totalPoints);

        return {
            totalPoints,
            count: violations.length,
            score,
        };
    }, [violations]);

    const subjectBreakdown = useMemo(() => {
        const subjectMap = academicRecords.reduce((acc, record) => {
            if (!acc[record.subject]) {
                acc[record.subject] = { total: 0, count: 0 };
            }

            acc[record.subject].total += record.score;
            acc[record.subject].count += 1;
            return acc;
        }, {} as Record<string, { total: number; count: number }>);

        return Object.entries(subjectMap)
            .map(([subject, data]) => ({
                subject,
                average: Math.round(data.total / data.count),
                count: data.count,
            }))
            .sort((left, right) => right.average - left.average);
    }, [academicRecords]);

    const bestSubject = subjectBreakdown[0];
    const focusSubject = [...subjectBreakdown].reverse().find((subject) => subject.average < 75) || subjectBreakdown[subjectBreakdown.length - 1];
    const academicTone = getAcademicTone(academicStats.average);
    const attendanceTone = attendanceStats.total > 0 ? getAttendanceTone(attendanceStats.rate) : 'info';
    const behaviorTone = getBehaviorTone(behaviorStats.totalPoints);
    const overallStatus = useMemo(() => {
        if (academicRecords.length === 0 && attendanceRecords.length === 0 && violations.length === 0) {
            return {
                label: 'Data belum lengkap',
                tone: 'info' as Tone,
                message: `Belum cukup data untuk membaca perkembangan ${studentName}. Tambahkan nilai, kehadiran, atau catatan perilaku agar ringkasan lebih akurat.`,
            };
        }

        if (
            (academicRecords.length > 0 && academicStats.average < 65) ||
            (attendanceStats.total > 0 && attendanceStats.rate < 75) ||
            behaviorStats.totalPoints > 25
        ) {
            return {
                label: 'Perlu perhatian',
                tone: 'danger' as Tone,
                message: `${studentName} membutuhkan pendampingan lebih dekat, terutama pada area yang ditandai merah di bawah ini.`,
            };
        }

        if (
            (academicRecords.length > 0 && academicStats.average < 75) ||
            (attendanceStats.total > 0 && attendanceStats.rate < 85) ||
            behaviorStats.totalPoints > 0
        ) {
            return {
                label: 'Perlu dipantau',
                tone: 'warning' as Tone,
                message: `Perkembangan ${studentName} masih cukup baik, namun ada beberapa bagian yang sebaiknya dipantau bersama guru.`,
            };
        }

        if (academicStats.average >= 85 && attendanceStats.rate >= 95 && behaviorStats.totalPoints === 0) {
            return {
                label: 'Sangat baik',
                tone: 'success' as Tone,
                message: `${studentName} menunjukkan perkembangan yang kuat. Pertahankan rutinitas belajar, kehadiran, dan kebiasaan positifnya.`,
            };
        }

        return {
            label: 'Stabil baik',
            tone: 'info' as Tone,
            message: `Perkembangan ${studentName} berada pada jalur yang baik. Dukungan kecil dan konsisten di rumah akan membantu hasilnya makin kuat.`,
        };
    }, [academicRecords.length, academicStats.average, attendanceRecords.length, attendanceStats.rate, attendanceStats.total, behaviorStats.totalPoints, studentName, violations.length]);

    const focusItems = useMemo<FocusItem[]>(() => {
        const items: FocusItem[] = [];

        if (academicRecords.length === 0) {
            items.push({
                title: 'Data nilai belum tersedia',
                description: 'Ringkasan akademik akan lebih bermakna setelah guru menginput nilai.',
                tone: 'info',
                icon: BookOpenIcon,
            });
        } else if (academicStats.average < 75) {
            items.push({
                title: 'Nilai perlu dukungan',
                description: `Rata-rata nilai ${academicStats.average}. Mulai dari mapel ${focusSubject?.subject || 'yang paling rendah'} agar bantuan lebih terarah.`,
                tone: academicStats.average < 65 ? 'danger' : 'warning',
                icon: TargetIcon,
            });
        } else {
            items.push({
                title: 'Akademik terkendali',
                description: `Rata-rata nilai ${academicStats.average} dengan ketuntasan ${academicStats.passRate}%. Fokusnya menjaga konsistensi belajar.`,
                tone: academicTone,
                icon: CheckCircleIcon,
            });
        }

        if (attendanceStats.total === 0) {
            items.push({
                title: 'Data kehadiran belum tersedia',
                description: 'Kehadiran akan terbaca setelah presensi mulai tercatat.',
                tone: 'info',
                icon: CalendarIcon,
            });
        } else if (attendanceStats.rate < 85 || attendanceStats.absent > 0) {
            items.push({
                title: 'Kehadiran perlu dipantau',
                description: `Kehadiran ${attendanceStats.rate}%. Tercatat ${attendanceStats.absent} alpha dan ${attendanceStats.sickOrPermission} sakit/izin.`,
                tone: attendanceStats.rate < 75 ? 'danger' : 'warning',
                icon: ClockIcon,
            });
        } else {
            items.push({
                title: 'Kehadiran baik',
                description: `${attendanceStats.present} dari ${attendanceStats.total} hari tercatat hadir. Kebiasaan masuk sekolah sudah mendukung proses belajar.`,
                tone: attendanceTone,
                icon: CalendarIcon,
            });
        }

        if (behaviorStats.totalPoints > 0) {
            items.push({
                title: 'Catatan perilaku',
                description: `${behaviorStats.count} catatan dengan total ${behaviorStats.totalPoints} poin. Diskusi singkat di rumah bisa membantu anak memahami konsekuensi.`,
                tone: behaviorTone,
                icon: ShieldAlertIcon,
            });
        } else {
            items.push({
                title: 'Perilaku positif',
                description: 'Tidak ada poin pelanggaran pada data yang dipilih. Beri apresiasi agar kebiasaan baik ini bertahan.',
                tone: 'success',
                icon: StarIcon,
            });
        }

        return items;
    }, [academicRecords.length, academicStats.average, academicStats.passRate, academicTone, attendanceStats, attendanceTone, behaviorStats, behaviorTone, focusSubject?.subject]);

    const homeSuggestions = useMemo(() => {
        const suggestions: string[] = [];

        if (focusSubject && focusSubject.average < 75) {
            suggestions.push(`Dampingi latihan ${focusSubject.subject} 15-20 menit, 3 kali seminggu.`);
        } else if (bestSubject) {
            suggestions.push(`Apresiasi kekuatan di ${bestSubject.subject}, lalu hubungkan dengan mapel lain.`);
        } else {
            suggestions.push('Tanyakan aktivitas belajar harian anak dengan obrolan singkat dan santai.');
        }

        if (attendanceStats.absent > 0 || attendanceStats.rate < 90) {
            suggestions.push('Buat rutinitas tidur dan persiapan sekolah agar kehadiran lebih stabil.');
        } else {
            suggestions.push('Pertahankan rutinitas pagi karena kehadiran sudah mendukung proses belajar.');
        }

        if (behaviorStats.totalPoints > 0) {
            suggestions.push('Bahas satu perilaku yang ingin diperbaiki minggu ini, lalu sepakati langkah kecilnya.');
        } else {
            suggestions.push('Beri pujian spesifik saat anak menunjukkan tanggung jawab atau disiplin.');
        }

        return suggestions;
    }, [attendanceStats.absent, attendanceStats.rate, behaviorStats.totalPoints, bestSubject, focusSubject]);

    return (
        <div className="space-y-5">
            <section className="overflow-hidden rounded-[32px] border border-slate-200 bg-[radial-gradient(circle_at_top_right,rgba(14,165,233,0.18),transparent_32%),linear-gradient(135deg,#ffffff_0%,#f8fafc_50%,#eef6ff_100%)] p-5 shadow-sm dark:border-slate-800 dark:bg-[radial-gradient(circle_at_top_right,rgba(56,189,248,0.16),transparent_34%),linear-gradient(135deg,#020617_0%,#0f172a_55%,#111827_100%)] sm:p-6">
                <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
                    <div className="max-w-2xl">
                        <div className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-bold uppercase tracking-[0.16em] ${toneStyles[overallStatus.tone].badge}`}>
                            <SparklesIcon className="h-4 w-4" />
                            {overallStatus.label}
                        </div>
                        <h3 className="mt-4 text-2xl font-black tracking-tight text-slate-950 dark:text-white">
                            Analisis perkembangan yang mudah dibaca
                        </h3>
                        <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">
                            {overallStatus.message}
                        </p>
                    </div>

                    <div className="rounded-3xl border border-white/80 bg-white/85 p-4 shadow-sm backdrop-blur dark:border-white/10 dark:bg-white/10">
                        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-300">Arah nilai</p>
                        <div className="mt-3 flex items-center gap-3">
                            <div className={`flex h-12 w-12 items-center justify-center rounded-2xl ${toneStyles[academicStats.trend === 'down' ? 'warning' : academicStats.trend === 'up' ? 'success' : 'info'].icon}`}>
                                {academicStats.trend === 'up' && <TrendingUpIcon className="h-6 w-6" />}
                                {academicStats.trend === 'down' && <TrendingDownIcon className="h-6 w-6" />}
                                {academicStats.trend === 'stable' && <MinusIcon className="h-6 w-6" />}
                            </div>
                            <div>
                                <p className="text-xl font-black text-slate-950 dark:text-white">{getTrendLabel(academicStats.trend)}</p>
                                <p className="text-xs text-slate-500 dark:text-slate-300">{academicStats.recordCount} nilai tercatat</p>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="mt-6 grid gap-3 md:grid-cols-3">
                    <MetricCard
                        title="Akademik"
                        value={academicRecords.length > 0 ? String(academicStats.average) : '-'}
                        description={academicRecords.length > 0 ? `${academicStats.passRate}% penilaian sudah tuntas.` : 'Belum ada nilai pada semester ini.'}
                        tone={academicRecords.length > 0 ? academicTone : 'info'}
                        icon={BarChartIcon}
                        progress={academicRecords.length > 0 ? academicStats.passRate : 0}
                    />
                    <MetricCard
                        title="Kehadiran"
                        value={attendanceStats.total > 0 ? `${attendanceStats.rate}%` : '-'}
                        description={attendanceStats.total > 0 ? `${attendanceStats.present}/${attendanceStats.total} hari hadir.` : 'Belum ada presensi pada semester ini.'}
                        tone={attendanceStats.total > 0 ? attendanceTone : 'info'}
                        icon={CalendarIcon}
                        progress={attendanceStats.total > 0 ? attendanceStats.rate : 0}
                    />
                    <MetricCard
                        title="Perilaku"
                        value={`${behaviorStats.totalPoints} poin`}
                        description={behaviorStats.count > 0 ? `${behaviorStats.count} catatan perilaku tercatat.` : 'Tidak ada catatan pelanggaran.'}
                        tone={behaviorTone}
                        icon={ShieldAlertIcon}
                        progress={behaviorStats.score}
                    />
                </div>
            </section>

            <section className="grid gap-4 lg:grid-cols-[1.05fr_0.95fr]">
                <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
                    <div className="flex items-center justify-between gap-4">
                        <div>
                            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">Prioritas Wali Murid</p>
                            <h4 className="mt-1 text-lg font-bold text-slate-950 dark:text-white">Yang perlu diperhatikan</h4>
                        </div>
                        <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                            {focusItems.length} poin
                        </span>
                    </div>
                    <div className="mt-4 grid gap-3">
                        {focusItems.map((item) => (
                            <FocusCard key={item.title} {...item} />
                        ))}
                    </div>
                </div>

                <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
                    <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">Saran Pendampingan</p>
                    <h4 className="mt-1 text-lg font-bold text-slate-950 dark:text-white">Langkah kecil di rumah</h4>
                    <div className="mt-4 space-y-3">
                        {homeSuggestions.map((suggestion, index) => (
                            <div key={suggestion} className="flex gap-3 rounded-2xl bg-slate-50 p-4 dark:bg-slate-950/50">
                                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-slate-950 text-xs font-bold text-white dark:bg-white dark:text-slate-950">
                                    {index + 1}
                                </span>
                                <p className="text-sm leading-6 text-slate-700 dark:text-slate-300">{suggestion}</p>
                            </div>
                        ))}
                    </div>
                    <div className="mt-4 rounded-2xl bg-sky-50 p-4 text-sm leading-6 text-sky-800 dark:bg-sky-400/10 dark:text-sky-100">
                        Fokuskan pada satu kebiasaan dulu selama satu minggu agar anak tidak merasa terbebani.
                    </div>
                </div>
            </section>

            {subjectBreakdown.length > 0 && (
                <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
                        <div>
                            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">Per Mapel</p>
                            <h4 className="mt-1 text-lg font-bold text-slate-950 dark:text-white">Mapel unggulan dan perlu dukungan</h4>
                        </div>
                        <p className="text-sm text-slate-500 dark:text-slate-400">
                            {academicStats.subjectCount} mapel, {academicStats.recordCount} penilaian.
                        </p>
                    </div>

                    <div className="mt-5 grid gap-3 md:grid-cols-2">
                        {subjectBreakdown.slice(0, 6).map((subject) => (
                            <SubjectRow
                                key={subject.subject}
                                subject={subject.subject}
                                average={subject.average}
                                count={subject.count}
                            />
                        ))}
                    </div>

                    {(bestSubject || focusSubject) && (
                        <div className="mt-5 grid gap-3 md:grid-cols-2">
                            {bestSubject && (
                                <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 dark:border-emerald-400/20 dark:bg-emerald-400/10">
                                    <div className="flex items-center gap-2 text-emerald-700 dark:text-emerald-200">
                                        <StarIcon className="h-4 w-4" />
                                        <p className="font-semibold">Paling kuat: {bestSubject.subject}</p>
                                    </div>
                                    <p className="mt-2 text-sm text-emerald-800 dark:text-emerald-100">Rata-rata {bestSubject.average}. Cocok diberi apresiasi agar motivasinya bertahan.</p>
                                </div>
                            )}
                            {focusSubject && (
                                <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 dark:border-amber-400/20 dark:bg-amber-400/10">
                                    <div className="flex items-center gap-2 text-amber-700 dark:text-amber-200">
                                        <AlertTriangleIcon className="h-4 w-4" />
                                        <p className="font-semibold">Perlu dukungan: {focusSubject.subject}</p>
                                    </div>
                                    <p className="mt-2 text-sm text-amber-800 dark:text-amber-100">Rata-rata {focusSubject.average}. Bantu dengan latihan singkat dan komunikasi dengan guru jika perlu.</p>
                                </div>
                            )}
                        </div>
                    )}
                </section>
            )}
        </div>
    );
};

export default ChildDevelopmentAnalytics;
