import React, { useMemo, useState } from 'react';
import {
    AwardIcon,
    BarChartIcon,
    BookOpenIcon,
    CalendarIcon,
    CheckCircleIcon,
    DownloadIcon,
    SparklesIcon,
    StarIcon,
    TargetIcon,
    TrendingUpIcon,
} from '../../Icons';
import type { PortalAcademicRecord, PortalQuizPoint, PortalSchoolInfo } from './types';

interface PortalProgressTabProps {
    academicRecords: PortalAcademicRecord[];
    quizPoints: PortalQuizPoint[];
    averageScore: number | null;
    schoolInfo: PortalSchoolInfo;
    onDownloadPdf: () => void;
    analyticsContent?: React.ReactNode;
}

type PointView = 'ringkasan' | 'riwayat' | 'mapel';

const pointDateFormatter = new Intl.DateTimeFormat('id-ID', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
});

const longPointDateFormatter = new Intl.DateTimeFormat('id-ID', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
});

const getPointDate = (point: PortalQuizPoint): string => point.quiz_date || point.created_at;

const getPointTitle = (point: PortalQuizPoint): string => (
    point.reason || point.quiz_name || (point.subject ? `Keaktifan ${point.subject}` : 'Aktivitas kelas')
);

const getPointSubject = (point: PortalQuizPoint): string => (
    point.used_for_subject || point.subject || 'Umum'
);

const formatPointCategory = (value?: string | null): string => {
    if (!value) return 'Keaktifan';
    return value
        .replace(/_/g, ' ')
        .split(' ')
        .filter(Boolean)
        .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');
};

const isWithinLastDays = (value: string, days: number): boolean => {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return false;

    const diff = Date.now() - date.getTime();
    return diff >= 0 && diff <= days * 24 * 60 * 60 * 1000;
};

export const PortalProgressTab: React.FC<PortalProgressTabProps> = ({
    academicRecords,
    quizPoints,
    averageScore,
    schoolInfo,
    onDownloadPdf,
    analyticsContent,
}) => {
    const [pointView, setPointView] = useState<PointView>('ringkasan');

    const subjectData = academicRecords.reduce((acc, record) => {
        if (!acc[record.subject]) {
            acc[record.subject] = { total: 0, count: 0, scores: [] as PortalAcademicRecord[] };
        }

        acc[record.subject].total += record.score;
        acc[record.subject].count += 1;
        acc[record.subject].scores.push(record);
        return acc;
    }, {} as Record<string, { total: number; count: number; scores: PortalAcademicRecord[] }>);

    const subjects = Object.keys(subjectData).sort();
    const subjectRows = subjects.map((subject) => {
        const item = subjectData[subject];
        const sortedByScore = [...item.scores].sort((left, right) => right.score - left.score);
        const latestScore = item.scores[item.scores.length - 1];

        return {
            subject,
            assessmentsCount: item.count,
            averageScore: item.total / item.count,
            highestScore: sortedByScore[0]?.score ?? 0,
            lowestScore: sortedByScore[sortedByScore.length - 1]?.score ?? 0,
            latestAssessment: latestScore?.assessment_name || 'Penilaian',
        };
    });
    const sortedQuizPoints = useMemo(() => (
        [...quizPoints].sort((left, right) => new Date(getPointDate(right)).getTime() - new Date(getPointDate(left)).getTime())
    ), [quizPoints]);
    const totalQuizPoints = quizPoints.reduce((sum, point) => sum + point.points, 0);
    const availablePoints = quizPoints.filter((point) => point.is_used !== true).length;
    const usedPoints = quizPoints.filter((point) => point.is_used === true).length;
    const weeklyPoints = quizPoints.filter((point) => isWithinLastDays(getPointDate(point), 7)).reduce((sum, point) => sum + point.points, 0);
    const targetPoints = Math.max(10, Math.ceil(totalQuizPoints / 10) * 10);
    const progressPercent = Math.min(100, Math.round((totalQuizPoints / targetPoints) * 100));
    const latestPoint = sortedQuizPoints[0];

    const pointSubjects = useMemo(() => {
        const subjectMap = sortedQuizPoints.reduce((acc, point) => {
            const subject = getPointSubject(point);
            if (!acc[subject]) {
                acc[subject] = {
                    subject,
                    count: 0,
                    total: 0,
                    latestDate: getPointDate(point),
                };
            }

            acc[subject].count += 1;
            acc[subject].total += point.points;
            if (new Date(getPointDate(point)).getTime() > new Date(acc[subject].latestDate).getTime()) {
                acc[subject].latestDate = getPointDate(point);
            }

            return acc;
        }, {} as Record<string, { subject: string; count: number; total: number; latestDate: string }>);

        return Object.values(subjectMap).sort((left, right) => right.total - left.total);
    }, [sortedQuizPoints]);

    const pointCategories = useMemo(() => {
        const categoryMap = sortedQuizPoints.reduce((acc, point) => {
            const category = formatPointCategory(point.category || point.type);
            acc[category] = (acc[category] || 0) + point.points;
            return acc;
        }, {} as Record<string, number>);

        return Object.entries(categoryMap).sort((left, right) => right[1] - left[1]);
    }, [sortedQuizPoints]);

    const pointViewTabs: { value: PointView; label: string; icon: React.ElementType }[] = [
        { value: 'ringkasan', label: 'Ringkasan', icon: SparklesIcon },
        { value: 'riwayat', label: 'Riwayat', icon: CalendarIcon },
        { value: 'mapel', label: 'Per Mapel', icon: BookOpenIcon },
    ];

    return (
        <div className="space-y-6 p-4 sm:p-6">
            <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:p-6">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <p className="text-sm font-medium text-indigo-600 dark:text-indigo-400">Perkembangan</p>
                        <h3 className="mt-1 text-2xl font-bold text-slate-900 dark:text-white">Ringkasan akademik dan evaluasi siswa</h3>
                    </div>
                    <button className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white" onClick={onDownloadPdf}><DownloadIcon className="mr-2 inline-block h-4 w-4" />Unduh PDF</button>
                </div>

                <div className="mt-6 grid gap-4 md:grid-cols-3">
                    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-800/70">
                        <BarChartIcon className="h-5 w-5 text-indigo-500" />
                        <p className="mt-3 text-2xl font-bold text-slate-900 dark:text-white">{averageScore ?? 'N/A'}</p>
                        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Rata-rata nilai</p>
                    </div>
                    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-800/70">
                        <TrendingUpIcon className="h-5 w-5 text-emerald-500" />
                        <p className="mt-3 text-2xl font-bold text-slate-900 dark:text-white">{subjects.length}</p>
                        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Mata pelajaran tercatat</p>
                    </div>
                    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-800/70">
                        <SparklesIcon className="h-5 w-5 text-purple-500" />
                        <p className="mt-3 text-2xl font-bold text-slate-900 dark:text-white">{quizPoints.length}</p>
                        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Poin keaktifan</p>
                    </div>
                </div>

                <p className="mt-5 text-sm text-slate-500 dark:text-slate-400">Sekolah: {schoolInfo.school_name}</p>
            </section>

            <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:p-6">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
                    <div>
                        <h4 className="text-lg font-semibold text-slate-900 dark:text-white">Detail Nilai per Mapel</h4>
                        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                            Tabel ringkas ini menampilkan inti hasil belajar per mata pelajaran agar lebih mudah dibaca wali murid.
                        </p>
                    </div>
                </div>

                <div className="mt-5">
                    {subjectRows.length === 0 ? (
                        <p className="text-sm text-slate-500 dark:text-slate-400">Belum ada data nilai akademik.</p>
                    ) : (
                        <div className="overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-700">
                            <div className="overflow-x-auto">
                                <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-700">
                                    <thead className="bg-slate-50 dark:bg-slate-800/70">
                                        <tr>
                                            <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">Mapel</th>
                                            <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">Penilaian</th>
                                            <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">Rata-rata</th>
                                            <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">Tertinggi</th>
                                            <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">Terendah</th>
                                            <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">Penilaian Terakhir</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100 bg-white dark:divide-slate-800 dark:bg-slate-900">
                                        {subjectRows.map((row) => (
                                            <tr key={row.subject} className="align-top">
                                                <td className="px-4 py-3">
                                                    <p className="font-semibold text-slate-900 dark:text-white">{row.subject}</p>
                                                </td>
                                                <td className="px-4 py-3 text-sm text-slate-600 dark:text-slate-300">{row.assessmentsCount}</td>
                                                <td className="px-4 py-3">
                                                    <span className="inline-flex rounded-full bg-indigo-50 px-3 py-1 text-sm font-semibold text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300">
                                                        {row.averageScore.toFixed(1)}
                                                    </span>
                                                </td>
                                                <td className="px-4 py-3 text-sm font-medium text-slate-700 dark:text-slate-200">{row.highestScore}</td>
                                                <td className="px-4 py-3 text-sm font-medium text-slate-700 dark:text-slate-200">{row.lowestScore}</td>
                                                <td className="px-4 py-3 text-sm text-slate-600 dark:text-slate-300">{row.latestAssessment}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}
                </div>
            </section>

            <section className="overflow-hidden rounded-[32px] border border-amber-200/80 bg-[radial-gradient(circle_at_top_right,rgba(251,191,36,0.24),transparent_30%),linear-gradient(135deg,#fff7ed_0%,#ffffff_42%,#f8fafc_100%)] shadow-sm dark:border-amber-400/15 dark:bg-[radial-gradient(circle_at_top_right,rgba(251,191,36,0.18),transparent_32%),linear-gradient(135deg,#0f172a_0%,#111827_52%,#020617_100%)]">
                <div className="p-5 sm:p-6">
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                        <div className="max-w-2xl">
                            <div className="inline-flex items-center gap-2 rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-amber-700 dark:border-amber-400/20 dark:bg-amber-400/10 dark:text-amber-200">
                                <AwardIcon className="h-4 w-4" />
                                Apresiasi Siswa
                            </div>
                            <h4 className="mt-4 text-2xl font-bold text-slate-950 dark:text-white">Poin Keaktifan</h4>
                            <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">
                                Ringkasan ini membantu wali murid melihat seberapa sering siswa aktif, mapel yang paling menonjol, dan riwayat apresiasi terbaru.
                            </p>
                        </div>

                        <div className="rounded-[28px] border border-white/80 bg-white/85 p-4 shadow-sm backdrop-blur dark:border-white/10 dark:bg-white/10">
                            <div className="flex items-end justify-between gap-8">
                                <div>
                                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-300">Total Poin</p>
                                    <p className="mt-2 text-4xl font-black text-amber-600 dark:text-amber-200">+{totalQuizPoints}</p>
                                </div>
                                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-100 text-amber-700 dark:bg-amber-400/15 dark:text-amber-200">
                                    <StarIcon className="h-7 w-7" />
                                </div>
                            </div>
                            <div className="mt-4 h-2 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800">
                                <div
                                    className="h-full rounded-full bg-gradient-to-r from-amber-500 via-orange-500 to-rose-500 transition-all duration-500"
                                    style={{ width: `${progressPercent}%` }}
                                />
                            </div>
                            <p className="mt-2 text-xs text-slate-500 dark:text-slate-300">
                                {progressPercent}% dari target apresiasi {targetPoints} poin semester ini.
                            </p>
                        </div>
                    </div>

                    {quizPoints.length === 0 ? (
                        <div className="mt-6 rounded-3xl border border-dashed border-amber-300 bg-white/70 px-5 py-10 text-center dark:border-amber-400/20 dark:bg-white/5">
                            <AwardIcon className="mx-auto h-10 w-10 text-amber-400" />
                            <p className="mt-3 font-semibold text-slate-900 dark:text-white">Belum ada poin keaktifan pada semester ini.</p>
                            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Saat guru menambahkan apresiasi, riwayatnya akan tampil di sini.</p>
                        </div>
                    ) : (
                        <>
                            <div className="mt-6 grid gap-3 md:grid-cols-4">
                                <div className="rounded-3xl border border-white/80 bg-white/80 p-4 shadow-sm dark:border-white/10 dark:bg-white/10">
                                    <TargetIcon className="h-5 w-5 text-emerald-500" />
                                    <p className="mt-3 text-2xl font-bold text-slate-950 dark:text-white">{availablePoints}</p>
                                    <p className="mt-1 text-sm text-slate-500 dark:text-slate-300">Poin tersedia</p>
                                </div>
                                <div className="rounded-3xl border border-white/80 bg-white/80 p-4 shadow-sm dark:border-white/10 dark:bg-white/10">
                                    <CheckCircleIcon className="h-5 w-5 text-sky-500" />
                                    <p className="mt-3 text-2xl font-bold text-slate-950 dark:text-white">{usedPoints}</p>
                                    <p className="mt-1 text-sm text-slate-500 dark:text-slate-300">Sudah digunakan</p>
                                </div>
                                <div className="rounded-3xl border border-white/80 bg-white/80 p-4 shadow-sm dark:border-white/10 dark:bg-white/10">
                                    <TrendingUpIcon className="h-5 w-5 text-orange-500" />
                                    <p className="mt-3 text-2xl font-bold text-slate-950 dark:text-white">+{weeklyPoints}</p>
                                    <p className="mt-1 text-sm text-slate-500 dark:text-slate-300">Poin 7 hari terakhir</p>
                                </div>
                                <div className="rounded-3xl border border-white/80 bg-white/80 p-4 shadow-sm dark:border-white/10 dark:bg-white/10">
                                    <BookOpenIcon className="h-5 w-5 text-violet-500" />
                                    <p className="mt-3 text-2xl font-bold text-slate-950 dark:text-white">{pointSubjects.length}</p>
                                    <p className="mt-1 text-sm text-slate-500 dark:text-slate-300">Mapel/area aktif</p>
                                </div>
                            </div>

                            <div className="mt-6 grid gap-4 lg:grid-cols-[0.85fr_1.15fr]">
                                <div className="rounded-[28px] border border-white/80 bg-white/85 p-5 shadow-sm dark:border-white/10 dark:bg-white/10">
                                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-300">Aktivitas Terbaru</p>
                                    <div className="mt-4 flex items-start gap-4">
                                        <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-400 to-orange-500 text-xl font-black text-white shadow-lg shadow-amber-500/20">
                                            +{latestPoint?.points ?? 0}
                                        </div>
                                        <div className="min-w-0">
                                            <p className="font-semibold text-slate-950 dark:text-white">{latestPoint ? getPointTitle(latestPoint) : '-'}</p>
                                            <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
                                                {latestPoint ? `${getPointSubject(latestPoint)} - ${formatPointCategory(latestPoint.category || latestPoint.type)}` : '-'}
                                            </p>
                                            {latestPoint && (
                                                <p className="mt-3 inline-flex rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600 dark:bg-slate-900/60 dark:text-slate-300">
                                                    {longPointDateFormatter.format(new Date(getPointDate(latestPoint)))}
                                                </p>
                                            )}
                                        </div>
                                    </div>
                                    <div className="mt-5 rounded-2xl bg-amber-50 p-4 text-sm leading-6 text-amber-800 dark:bg-amber-400/10 dark:text-amber-100">
                                        Saran untuk wali: beri apresiasi singkat di rumah saat siswa konsisten aktif agar kebiasaan positifnya makin kuat.
                                    </div>
                                </div>

                                <div className="rounded-[28px] border border-white/80 bg-white/85 p-5 shadow-sm dark:border-white/10 dark:bg-white/10">
                                    <div className="flex flex-wrap gap-2">
                                        {pointViewTabs.map((tab) => {
                                            const Icon = tab.icon;
                                            return (
                                                <button
                                                    key={tab.value}
                                                    type="button"
                                                    onClick={() => setPointView(tab.value)}
                                                    className={`inline-flex items-center gap-2 rounded-2xl px-4 py-2 text-sm font-semibold transition ${pointView === tab.value
                                                        ? 'bg-slate-950 text-white shadow-sm dark:bg-white dark:text-slate-950'
                                                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-900/70 dark:text-slate-300 dark:hover:bg-slate-800'
                                                        }`}
                                                >
                                                    <Icon className="h-4 w-4" />
                                                    {tab.label}
                                                </button>
                                            );
                                        })}
                                    </div>

                                    {pointView === 'ringkasan' && (
                                        <div className="mt-5 space-y-3">
                                            {pointCategories.slice(0, 4).map(([category, points]) => (
                                                <div key={category} className="rounded-2xl bg-slate-50 p-4 dark:bg-slate-900/60">
                                                    <div className="flex items-center justify-between gap-4">
                                                        <p className="font-semibold text-slate-900 dark:text-white">{category}</p>
                                                        <span className="rounded-full bg-amber-100 px-3 py-1 text-sm font-bold text-amber-700 dark:bg-amber-400/15 dark:text-amber-200">+{points}</span>
                                                    </div>
                                                    <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800">
                                                        <div
                                                            className="h-full rounded-full bg-gradient-to-r from-amber-500 to-orange-500"
                                                            style={{ width: `${Math.min(100, Math.round((points / totalQuizPoints) * 100))}%` }}
                                                        />
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}

                                    {pointView === 'riwayat' && (
                                        <div className="mt-5 max-h-[390px] space-y-3 overflow-y-auto pr-1">
                                            {sortedQuizPoints.map((point, index) => (
                                                <div key={point.id} className="group relative rounded-2xl border border-slate-200 bg-slate-50 p-4 transition hover:-translate-y-0.5 hover:bg-white hover:shadow-md dark:border-slate-800 dark:bg-slate-900/60 dark:hover:bg-slate-900">
                                                    <div className="flex items-start gap-4">
                                                        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-slate-950 text-sm font-black text-white dark:bg-white dark:text-slate-950">
                                                            +{point.points}
                                                        </div>
                                                        <div className="min-w-0 flex-1">
                                                            <div className="flex flex-wrap items-center gap-2">
                                                                <p className="font-semibold text-slate-950 dark:text-white">{getPointTitle(point)}</p>
                                                                {index === 0 && (
                                                                    <span className="rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-semibold text-emerald-700 dark:bg-emerald-400/15 dark:text-emerald-200">Terbaru</span>
                                                                )}
                                                            </div>
                                                            <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
                                                                {getPointSubject(point)} - {formatPointCategory(point.category || point.type)}
                                                            </p>
                                                            <p className="mt-2 text-xs font-medium uppercase tracking-[0.14em] text-slate-400 dark:text-slate-500">
                                                                {pointDateFormatter.format(new Date(getPointDate(point)))}
                                                            </p>
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}

                                    {pointView === 'mapel' && (
                                        <div className="mt-5 grid gap-3 sm:grid-cols-2">
                                            {pointSubjects.map((item) => (
                                                <div key={item.subject} className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-900/60">
                                                    <div className="flex items-start justify-between gap-4">
                                                        <div>
                                                            <p className="font-semibold text-slate-950 dark:text-white">{item.subject}</p>
                                                            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                                                                Terakhir {pointDateFormatter.format(new Date(item.latestDate))}
                                                            </p>
                                                        </div>
                                                        <span className="rounded-full bg-violet-100 px-3 py-1 text-sm font-bold text-violet-700 dark:bg-violet-400/15 dark:text-violet-200">+{item.total}</span>
                                                    </div>
                                                    <div className="mt-4 flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300">
                                                        <SparklesIcon className="h-4 w-4 text-violet-500" />
                                                        {item.count} aktivitas tercatat
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </>
                    )}
                </div>
            </section>

            {analyticsContent && (
                <section className="rounded-3xl border border-slate-200 bg-white p-2 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:p-3">
                    {analyticsContent}
                </section>
            )}
        </div>
    );
};
