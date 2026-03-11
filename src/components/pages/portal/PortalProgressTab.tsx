import React from 'react';
import { BarChartIcon, DownloadIcon, SparklesIcon, TrendingUpIcon } from '../../Icons';
import type { PortalAcademicRecord, PortalQuizPoint, PortalSchoolInfo } from './types';

interface PortalProgressTabProps {
    academicRecords: PortalAcademicRecord[];
    quizPoints: PortalQuizPoint[];
    averageScore: number | null;
    schoolInfo: PortalSchoolInfo;
    onDownloadPdf: () => void;
    analyticsContent?: React.ReactNode;
}

export const PortalProgressTab: React.FC<PortalProgressTabProps> = ({
    academicRecords,
    quizPoints,
    averageScore,
    schoolInfo,
    onDownloadPdf,
    analyticsContent,
}) => {
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
                <h4 className="text-lg font-semibold text-slate-900 dark:text-white">Detail Nilai per Mapel</h4>
                <div className="mt-5 space-y-4">
                    {subjects.length === 0 ? (
                        <p className="text-sm text-slate-500 dark:text-slate-400">Belum ada data nilai akademik.</p>
                    ) : subjects.map((subject) => {
                        const item = subjectData[subject];
                        const average = Math.round(item.total / item.count);
                        return (
                            <div key={subject} className="overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-700">
                                <div className="flex items-center justify-between bg-slate-50 px-4 py-3 dark:bg-slate-800/70">
                                    <div>
                                        <p className="font-semibold text-slate-900 dark:text-white">{subject}</p>
                                        <p className="text-xs text-slate-500 dark:text-slate-400">{item.count} penilaian</p>
                                    </div>
                                    <div className="rounded-xl bg-indigo-50 px-3 py-1.5 text-sm font-bold text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-300">
                                        Ø {average}
                                    </div>
                                </div>
                                <div className="divide-y divide-slate-100 dark:divide-slate-700/60">
                                    {item.scores.map((score) => (
                                        <div key={score.id} className="flex items-center justify-between gap-4 px-4 py-3">
                                            <div className="min-w-0">
                                                <p className="truncate font-medium text-slate-900 dark:text-white">{score.assessment_name || 'Penilaian'}</p>
                                                {score.notes && <p className="truncate text-xs text-slate-500 dark:text-slate-400">{score.notes}</p>}
                                            </div>
                                            <div className="text-lg font-bold text-slate-900 dark:text-white">{score.score}</div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </section>

            <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:p-6">
                <h4 className="text-lg font-semibold text-slate-900 dark:text-white">Poin Keaktifan</h4>
                <div className="mt-5 space-y-3">
                    {quizPoints.length === 0 ? (
                        <p className="text-sm text-slate-500 dark:text-slate-400">Belum ada poin keaktifan yang tercatat.</p>
                    ) : quizPoints.map((point) => (
                        <div key={point.id} className="flex items-center gap-4 rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-800/70">
                            <div className="rounded-full bg-purple-100 p-3 text-purple-600 dark:bg-purple-900/30 dark:text-purple-300">
                                <SparklesIcon className="h-5 w-5" />
                            </div>
                            <div className="min-w-0 flex-1">
                                <p className="font-medium text-slate-900 dark:text-white">{point.reason}</p>
                                <p className="text-xs text-slate-500 dark:text-slate-400">{new Date(point.created_at).toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</p>
                            </div>
                            <div className="rounded-full bg-purple-50 px-3 py-1 text-sm font-bold text-purple-600 dark:bg-purple-900/30 dark:text-purple-300">+{point.points}</div>
                        </div>
                    ))}
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
