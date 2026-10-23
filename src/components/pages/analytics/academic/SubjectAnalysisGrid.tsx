import React, { useMemo, useState } from 'react';
import { Card, CardContent } from '../../../ui/Card';
import {
    TrendingUp,
    TrendingDown,
    Minus,
    ChevronRight,
    AlertTriangle,
    CheckCircle,
    AlertCircle,
    ClipboardPen,
} from 'lucide-react';
import type { SubjectStats } from '../../../../services/academicAnalyticsService';

interface SubjectAnalysisGridProps {
    subjectStats: SubjectStats[];
    onSelectSubject: (subject: SubjectStats) => void;
    onInputSubjectGrade?: (subjectName: string) => void;
}

type SortOrder = 'lowest' | 'highest' | 'name';

const kktpBadge = (status: SubjectStats['kktpStatus'], gap: number) => {
    const gapLabel = `${Math.abs(gap)} poin di bawah KKTP`;
    switch (status) {
        case 'safe':
            return (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-bold rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400">
                    <CheckCircle className="w-3 h-3" /> Tuntas KKTP
                </span>
            );
        case 'warning':
            return (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-bold rounded-full bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
                    <AlertCircle className="w-3 h-3" /> {gapLabel}
                </span>
            );
        case 'critical':
            return (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-bold rounded-full bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400">
                    <AlertTriangle className="w-3 h-3" /> {gapLabel}
                </span>
            );
    }
};

const TrendIcon: React.FC<{ trend: SubjectStats['trend']; delta: number }> = ({ trend, delta }) => {
    if (trend === 'up')
        return (
            <span className="inline-flex items-center gap-0.5 text-xs font-semibold text-emerald-700 dark:text-emerald-400 tabular-nums">
                <TrendingUp className="w-3 h-3" /> +{delta}
            </span>
        );
    if (trend === 'down')
        return (
            <span className="inline-flex items-center gap-0.5 text-xs font-semibold text-rose-600 dark:text-rose-400 tabular-nums">
                <TrendingDown className="w-3 h-3" /> {delta}
            </span>
        );
    return (
        <span className="inline-flex items-center gap-0.5 text-xs font-semibold text-slate-500">
            <Minus className="w-3 h-3" /> stabil
        </span>
    );
};

const MiniDistributionBar: React.FC<{ distribution: SubjectStats['distribution'] }> = ({ distribution }) => {
    const total = distribution.reduce((s, d) => s + d.count, 0);
    if (total === 0) return null;
    return (
        <div className="flex h-2 rounded-full overflow-hidden w-full bg-slate-100 dark:bg-slate-800" aria-hidden>
            {distribution.map(
                (d) =>
                    d.count > 0 && (
                        <div
                            key={d.label}
                            style={{ width: `${d.percentage}%`, backgroundColor: d.color }}
                            className="h-full"
                        />
                    )
            )}
        </div>
    );
};

/** Band D holds every student whose subject average is under the KKTP. */
const belowKKTPCount = (distribution: SubjectStats['distribution']) =>
    distribution.find((d) => d.label === 'D')?.count ?? 0;

export const SubjectAnalysisGrid: React.FC<SubjectAnalysisGridProps> = ({
    subjectStats,
    onSelectSubject,
    onInputSubjectGrade,
}) => {
    const [onlyBelowKKTP, setOnlyBelowKKTP] = useState(false);
    const [sortOrder, setSortOrder] = useState<SortOrder>('lowest');

    const belowCount = useMemo(
        () => subjectStats.filter((s) => s.kktpStatus !== 'safe' || belowKKTPCount(s.distribution) > 0).length,
        [subjectStats]
    );

    const displayedStats = useMemo(() => {
        const filtered = onlyBelowKKTP
            ? subjectStats.filter((s) => s.kktpStatus !== 'safe' || belowKKTPCount(s.distribution) > 0)
            : subjectStats;

        return [...filtered].sort((a, b) => {
            if (sortOrder === 'lowest') return a.average - b.average || a.subject.localeCompare(b.subject, 'id');
            if (sortOrder === 'highest') return b.average - a.average || a.subject.localeCompare(b.subject, 'id');
            return a.subject.localeCompare(b.subject, 'id');
        });
    }, [subjectStats, onlyBelowKKTP, sortOrder]);

    if (subjectStats.length === 0) {
        return (
            <Card>
                <CardContent className="py-12 text-center">
                    <p className="text-sm font-medium text-slate-700 dark:text-slate-300">
                        Belum ada data nilai per mata pelajaran.
                    </p>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                        Input nilai melalui menu Input Penilaian untuk melihat analisis per mapel.
                    </p>
                </CardContent>
            </Card>
        );
    }

    return (
        <div className="space-y-3.5">
            {/* Header & Filter Bar */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                <div>
                    <h3 className="text-base font-bold text-slate-900 dark:text-white">
                        Analisis Per Mata Pelajaran
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                        Ketuk kartu mata pelajaran untuk melihat rincian sebaran nilai dan daftar siswa.
                    </p>
                </div>

                {subjectStats.length > 1 && (
                    <div className="flex flex-wrap items-center gap-2">
                        {belowCount > 0 && (
                            <button
                                type="button"
                                aria-pressed={onlyBelowKKTP}
                                onClick={() => setOnlyBelowKKTP((v) => !v)}
                                className={`min-h-[38px] px-3 py-1.5 rounded-xl text-xs font-semibold border transition-colors cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 ${
                                    onlyBelowKKTP
                                        ? 'bg-amber-600 text-white border-amber-600'
                                        : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800'
                                }`}
                            >
                                Perlu Perhatian ({belowCount})
                            </button>
                        )}
                        <div
                            role="group"
                            aria-label="Urutkan mata pelajaran"
                            className="inline-flex items-center p-1 rounded-xl bg-slate-100 dark:bg-slate-800/80 border border-slate-200/70 dark:border-slate-700/70 text-xs"
                        >
                            {(
                                [
                                    { id: 'lowest', label: 'Terendah' },
                                    { id: 'highest', label: 'Tertinggi' },
                                    { id: 'name', label: 'A–Z' },
                                ] as const
                            ).map((opt) => (
                                <button
                                    key={opt.id}
                                    type="button"
                                    aria-pressed={sortOrder === opt.id}
                                    onClick={() => setSortOrder(opt.id)}
                                    className={`min-h-[32px] px-2.5 py-1 rounded-lg font-semibold transition-all cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 ${
                                        sortOrder === opt.id
                                            ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                                            : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
                                    }`}
                                >
                                    {opt.label}
                                </button>
                            ))}
                        </div>
                    </div>
                )}
            </div>

            {/* Cards Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {displayedStats.map((stat) => {
                    const studentsUnder = belowKKTPCount(stat.distribution);
                    return (
                        <Card
                            key={stat.subject}
                            className="cursor-pointer group active:scale-[0.99] transition-all hover:border-brand-300 dark:hover:border-brand-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
                            onClick={() => onSelectSubject(stat)}
                            role="button"
                            tabIndex={0}
                            aria-label={`Lihat detail analisis ${stat.subject}`}
                            onKeyDown={(event) => {
                                if (event.key === 'Enter' || event.key === ' ') {
                                    event.preventDefault();
                                    onSelectSubject(stat);
                                }
                            }}
                        >
                            <CardContent className="p-4 flex flex-col justify-between h-full">
                                <div>
                                    <div className="flex items-start justify-between gap-2 mb-2.5">
                                        <div className="min-w-0 flex-1">
                                            <h4 className="text-sm font-bold text-slate-900 dark:text-white truncate">
                                                {stat.subject}
                                            </h4>
                                            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                                                {stat.studentCount} siswa &middot; {stat.assessmentCount} penilaian
                                            </p>
                                        </div>
                                        {kktpBadge(stat.kktpStatus, stat.kktpGap)}
                                    </div>

                                    {/* Average & Trend */}
                                    <div className="flex items-baseline justify-between gap-2 mb-2.5">
                                        <div className="flex items-baseline gap-2">
                                            <span className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tabular-nums">
                                                {stat.average}
                                            </span>
                                            {stat.trendFrom === null ? (
                                                <span className="text-xs text-slate-500">baru 1 penilaian</span>
                                            ) : (
                                                <span title={`${stat.trendTo} dibanding ${stat.trendFrom}`}>
                                                    <TrendIcon trend={stat.trend} delta={stat.trendDelta} />
                                                </span>
                                            )}
                                        </div>
                                        <span className="text-xs text-slate-500 dark:text-slate-400 tabular-nums">
                                            Rentang {stat.lowest}–{stat.highest}
                                        </span>
                                    </div>

                                    {/* Mini Distribution */}
                                    <MiniDistributionBar distribution={stat.distribution} />
                                    <p
                                        className={`text-xs mt-1.5 font-medium ${
                                            studentsUnder > 0
                                                ? 'text-rose-700 dark:text-rose-400'
                                                : 'text-emerald-700 dark:text-emerald-400'
                                        }`}
                                    >
                                        {studentsUnder > 0
                                            ? `${studentsUnder} dari ${stat.studentCount} siswa di bawah KKTP`
                                            : 'Semua siswa mencapai KKTP'}
                                    </p>
                                </div>

                                {/* Footer Actions */}
                                <div className="mt-3 pt-2.5 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2">
                                    <span className="inline-flex items-center gap-1 text-xs font-semibold text-brand-600 dark:text-brand-400 group-hover:underline">
                                        Rincian Mapel
                                        <ChevronRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5" />
                                    </span>
                                    {onInputSubjectGrade && (
                                        <button
                                            type="button"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                onInputSubjectGrade(stat.subject);
                                            }}
                                            className="inline-flex items-center gap-1 min-h-[34px] px-2.5 py-1 rounded-lg text-xs font-semibold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-brand-50 hover:text-brand-700 dark:hover:bg-brand-950/40 dark:hover:text-brand-300 transition-colors cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
                                        >
                                            <ClipboardPen className="w-3 h-3" />
                                            <span>Input Nilai</span>
                                        </button>
                                    )}
                                </div>
                            </CardContent>
                        </Card>
                    );
                })}
            </div>
        </div>
    );
};
