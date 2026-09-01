import React from 'react';
import { Card, CardContent } from '../../../ui/Card';
import { TrendingUp, TrendingDown, Minus, ChevronRight, AlertTriangle, CheckCircle, AlertCircle } from 'lucide-react';
import type { SubjectStats } from '../../../../services/academicAnalyticsService';

interface SubjectAnalysisGridProps {
    subjectStats: SubjectStats[];
    onSelectSubject: (subject: SubjectStats) => void;
}

const kktpBadge = (status: SubjectStats['kktpStatus'], gap: number) => {
    switch (status) {
        case 'safe':
            return (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-bold rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400">
                    <CheckCircle className="w-3 h-3" /> KKTP
                </span>
            );
        case 'warning':
            return (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-bold rounded-full bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
                    <AlertCircle className="w-3 h-3" /> {gap} pts
                </span>
            );
        case 'critical':
            return (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-bold rounded-full bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400">
                    <AlertTriangle className="w-3 h-3" /> {gap} pts
                </span>
            );
    }
};

const TrendIcon: React.FC<{ trend: SubjectStats['trend']; delta: number }> = ({ trend, delta }) => {
    if (trend === 'up') return (
        <span className="inline-flex items-center gap-0.5 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
            <TrendingUp className="w-3 h-3" /> +{delta}
        </span>
    );
    if (trend === 'down') return (
        <span className="inline-flex items-center gap-0.5 text-[11px] font-semibold text-rose-600 dark:text-rose-400">
            <TrendingDown className="w-3 h-3" /> {delta}
        </span>
    );
    return (
        <span className="inline-flex items-center gap-0.5 text-[11px] font-semibold text-slate-400">
            <Minus className="w-3 h-3" /> stabil
        </span>
    );
};

const MiniDistributionBar: React.FC<{ distribution: SubjectStats['distribution'] }> = ({ distribution }) => {
    const total = distribution.reduce((s, d) => s + d.count, 0);
    if (total === 0) return null;
    return (
        <div className="flex h-2 rounded-full overflow-hidden w-full">
            {distribution.map((d, i) => (
                d.count > 0 && (
                    <div
                        key={i}
                        style={{ width: `${d.percentage}%`, backgroundColor: d.color }}
                        className="h-full transition-all"
                        title={`${d.label}: ${d.count} siswa`}
                    />
                )
            ))}
        </div>
    );
};

export const SubjectAnalysisGrid: React.FC<SubjectAnalysisGridProps> = ({ subjectStats, onSelectSubject }) => {
    if (subjectStats.length === 0) {
        return (
            <Card className="bg-white dark:bg-slate-900 border-0 shadow-lg">
                <CardContent className="py-12 text-center">
                    <p className="text-sm text-slate-500 dark:text-slate-400">
                        Belum ada data nilai per mata pelajaran.
                    </p>
                    <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">
                        Input nilai melalui menu Input Penilaian untuk melihat analisis per mapel.
                    </p>
                </CardContent>
            </Card>
        );
    }

    return (
        <div className="space-y-3">
            <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                    Analisis Per Mata Pelajaran
                </h3>
                <span className="text-xs text-slate-500 dark:text-slate-400">
                    {subjectStats.length} mapel
                </span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {subjectStats.map((stat) => (
                    <Card
                        key={stat.subject}
                        className="bg-white dark:bg-slate-900 border-0 shadow-md hover:shadow-lg transition-all cursor-pointer group"
                        onClick={() => onSelectSubject(stat)}
                    >
                        <CardContent className="p-4">
                            <div className="flex items-start justify-between mb-2">
                                <div className="min-w-0 flex-1">
                                    <h4 className="text-sm font-bold text-slate-900 dark:text-white truncate">
                                        {stat.subject}
                                    </h4>
                                    <p className="text-[11px] text-slate-500 dark:text-slate-400">
                                        {stat.studentCount} siswa &middot; {stat.assessmentCount} penilaian
                                    </p>
                                </div>
                                <ChevronRight className="w-4 h-4 text-slate-300 dark:text-slate-600 group-hover:text-brand-500 transition-colors shrink-0" />
                            </div>

                            {/* Average & Trend */}
                            <div className="flex items-baseline gap-2 mb-2">
                                <span className="text-2xl font-extrabold text-slate-900 dark:text-white">
                                    {stat.average}
                                </span>
                                <TrendIcon trend={stat.trend} delta={stat.trendDelta} />
                            </div>

                            {/* Mini Distribution */}
                            <MiniDistributionBar distribution={stat.distribution} />

                            {/* Footer: KKTP + Range */}
                            <div className="flex items-center justify-between mt-2">
                                {kktpBadge(stat.kktpStatus, stat.kktpGap)}
                                <span className="text-[10px] text-slate-400 dark:text-slate-500">
                                    {stat.lowest}–{stat.highest}
                                </span>
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>
        </div>
    );
};
