import React from 'react';
import { Card, CardContent } from '../../../ui/Card';
import {
    TrendingUp,
    TrendingDown,
    Minus,
    GraduationCap,
    AlertTriangle,
    CheckCircle,
    ClipboardCheck,
    LineChart,
    ChevronRight,
} from 'lucide-react';
import type { AcademicKPI } from '../../../../services/academicAnalyticsService';

export type AcademicSubView = 'remedial' | 'subjects' | 'completion' | 'trends';

interface AcademicKPICardsProps {
    kpi: AcademicKPI;
    kktpThreshold: number;
    activeSubView?: AcademicSubView;
    onSelectSubView?: (sub: AcademicSubView) => void;
}

const TrendIndicator: React.FC<{ value: number }> = ({ value }) => {
    if (value > 0) return <TrendingUp className="w-3.5 h-3.5 text-emerald-500" />;
    if (value < 0) return <TrendingDown className="w-3.5 h-3.5 text-rose-500" />;
    return <Minus className="w-3.5 h-3.5 text-slate-400" />;
};

export const AcademicKPICards: React.FC<AcademicKPICardsProps> = ({
    kpi,
    kktpThreshold,
    activeSubView,
    onSelectSubView,
}) => {
    const completenessOk = kpi.expectedGradeCount === 0 || kpi.gradeCompleteness >= 80;
    const isInteractive = Boolean(onSelectSubView);

    const getCardInteractiveProps = (targetView: AcademicSubView, label: string) => {
        if (!isInteractive) return {};
        return {
            role: 'button' as const,
            tabIndex: 0,
            'aria-pressed': activeSubView === targetView,
            'aria-label': `${label} — Buka tampilan`,
            onClick: () => onSelectSubView?.(targetView),
            onKeyDown: (e: React.KeyboardEvent) => {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    onSelectSubView?.(targetView);
                }
            },
        };
    };

    return (
        <div className="space-y-2">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-3">
                {/* 1. Rata-rata Nilai -> Analisis Per Mapel */}
                <div
                    {...getCardInteractiveProps('subjects', 'Rata-rata Nilai & Analisis Per Mata Pelajaran')}
                    className={`transition-all text-left rounded-2xl ${
                        isInteractive
                            ? 'cursor-pointer hover:-translate-y-0.5 active:scale-[0.99] focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500'
                            : ''
                    }`}
                >
                    <Card
                        className={`h-full relative overflow-hidden transition-all ${
                            activeSubView === 'subjects'
                                ? 'ring-2 ring-brand-500 dark:ring-brand-400 bg-brand-50/40 dark:bg-brand-950/20 shadow-sm'
                                : 'hover:border-slate-300 dark:hover:border-slate-700'
                        }`}
                    >
                        {activeSubView === 'subjects' && (
                            <span className="absolute inset-x-0 top-0 h-1 bg-brand-500" aria-hidden />
                        )}
                        <CardContent className="p-3.5 sm:p-4 flex flex-col justify-between h-full">
                            <div>
                                <div className="flex items-center justify-between gap-1.5 mb-1.5">
                                    <span className="text-[11px] sm:text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 truncate">
                                        Rata-rata Nilai
                                    </span>
                                    <div className="p-1.5 rounded-lg bg-brand-100 dark:bg-brand-900/30 shrink-0">
                                        <GraduationCap className="w-4 h-4 text-brand-600 dark:text-brand-400" />
                                    </div>
                                </div>
                                <div className="flex items-baseline gap-2">
                                    <p className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tabular-nums">
                                        {kpi.overallAverage || '-'}
                                    </p>
                                    {kpi.averageTrend !== 0 && (
                                        <span
                                            className={`inline-flex items-center gap-0.5 text-xs font-semibold tabular-nums ${
                                                kpi.averageTrend > 0
                                                    ? 'text-emerald-700 dark:text-emerald-400'
                                                    : 'text-rose-600 dark:text-rose-400'
                                            }`}
                                        >
                                            <TrendIndicator value={kpi.averageTrend} />
                                            {kpi.averageTrend > 0 ? '+' : ''}
                                            {kpi.averageTrend}
                                        </span>
                                    )}
                                </div>
                                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 truncate">
                                    {kpi.totalSubjects > 0 ? `${kpi.totalSubjects} mapel · ` : ''}KKTP {kktpThreshold}
                                </p>
                            </div>
                            {isInteractive && (
                                <div
                                    className={`mt-3 pt-2 border-t flex items-center justify-between text-[11px] font-semibold ${
                                        activeSubView === 'subjects'
                                            ? 'border-brand-200/70 dark:border-brand-800/50 text-brand-700 dark:text-brand-300'
                                            : 'border-slate-100 dark:border-slate-800 text-slate-500 dark:text-slate-400'
                                    }`}
                                >
                                    <span>Analisis per mapel</span>
                                    <ChevronRight className="w-3.5 h-3.5 shrink-0" />
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </div>

                {/* 2. Di Bawah KKTP -> Daftar Remedial & Insight AI */}
                <div
                    {...getCardInteractiveProps('remedial', 'Siswa di Bawah KKTP & Remedial')}
                    className={`transition-all text-left rounded-2xl ${
                        isInteractive
                            ? 'cursor-pointer hover:-translate-y-0.5 active:scale-[0.99] focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500'
                            : ''
                    }`}
                >
                    <Card
                        className={`h-full relative overflow-hidden transition-all ${
                            activeSubView === 'remedial'
                                ? 'ring-2 ring-amber-500 dark:ring-amber-400 bg-amber-50/40 dark:bg-amber-950/20 shadow-sm'
                                : kpi.studentsBelowKKTP > 0
                                    ? 'border-amber-200/80 dark:border-amber-800/40 hover:border-amber-300'
                                    : 'hover:border-slate-300 dark:hover:border-slate-700'
                        }`}
                    >
                        {activeSubView === 'remedial' && (
                            <span className="absolute inset-x-0 top-0 h-1 bg-amber-500" aria-hidden />
                        )}
                        <CardContent className="p-3.5 sm:p-4 flex flex-col justify-between h-full">
                            <div>
                                <div className="flex items-center justify-between gap-1.5 mb-1.5">
                                    <span className="text-[11px] sm:text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 truncate">
                                        Di Bawah KKTP
                                    </span>
                                    <div
                                        className={`p-1.5 rounded-lg shrink-0 ${
                                            kpi.studentsBelowKKTP > 0
                                                ? 'bg-amber-100 dark:bg-amber-900/30'
                                                : 'bg-emerald-100 dark:bg-emerald-900/30'
                                        }`}
                                    >
                                        {kpi.studentsBelowKKTP > 0 ? (
                                            <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                                        ) : (
                                            <CheckCircle className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                                        )}
                                    </div>
                                </div>
                                <p className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tabular-nums">
                                    {kpi.studentsBelowKKTP}
                                    <span className="text-xs sm:text-sm font-medium text-slate-500 ml-1">siswa</span>
                                </p>
                                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 truncate">
                                    {kpi.subjectsBelowKKTP === 0
                                        ? 'Semua mapel mencapai KKTP'
                                        : `Pada ${kpi.subjectsBelowKKTP} dari ${kpi.totalSubjects} mapel`}
                                </p>
                            </div>
                            {isInteractive && (
                                <div
                                    className={`mt-3 pt-2 border-t flex items-center justify-between text-[11px] font-semibold ${
                                        activeSubView === 'remedial'
                                            ? 'border-amber-200/70 dark:border-amber-800/50 text-amber-700 dark:text-amber-300'
                                            : 'border-slate-100 dark:border-slate-800 text-slate-500 dark:text-slate-400'
                                    }`}
                                >
                                    <span>Remedial & Insight</span>
                                    <ChevronRight className="w-3.5 h-3.5 shrink-0" />
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </div>

                {/* 3. Kelengkapan Nilai -> Audit Nilai Belum Masuk */}
                <div
                    {...getCardInteractiveProps('completion', 'Kelengkapan Nilai & Audit Nilai Kosong')}
                    className={`transition-all text-left rounded-2xl ${
                        isInteractive
                            ? 'cursor-pointer hover:-translate-y-0.5 active:scale-[0.99] focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500'
                            : ''
                    }`}
                >
                    <Card
                        className={`h-full relative overflow-hidden transition-all ${
                            activeSubView === 'completion'
                                ? 'ring-2 ring-emerald-500 dark:ring-emerald-400 bg-emerald-50/40 dark:bg-emerald-950/20 shadow-sm'
                                : 'hover:border-slate-300 dark:hover:border-slate-700'
                        }`}
                    >
                        {activeSubView === 'completion' && (
                            <span className="absolute inset-x-0 top-0 h-1 bg-emerald-500" aria-hidden />
                        )}
                        <CardContent className="p-3.5 sm:p-4 flex flex-col justify-between h-full">
                            <div>
                                <div className="flex items-center justify-between gap-1.5 mb-1.5">
                                    <span className="text-[11px] sm:text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 truncate">
                                        Kelengkapan Nilai
                                    </span>
                                    <div
                                        className={`p-1.5 rounded-lg shrink-0 ${
                                            completenessOk
                                                ? 'bg-emerald-100 dark:bg-emerald-900/30'
                                                : 'bg-rose-100 dark:bg-rose-900/30'
                                        }`}
                                    >
                                        <ClipboardCheck
                                            className={`w-4 h-4 ${
                                                completenessOk
                                                    ? 'text-emerald-600 dark:text-emerald-400'
                                                    : 'text-rose-600 dark:text-rose-400'
                                            }`}
                                        />
                                    </div>
                                </div>
                                <p className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tabular-nums">
                                    {kpi.expectedGradeCount > 0 ? (
                                        <>
                                            {kpi.gradeCompleteness}
                                            <span className="text-base sm:text-lg font-bold">%</span>
                                        </>
                                    ) : (
                                        '-'
                                    )}
                                </p>
                                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 truncate">
                                    {kpi.expectedGradeCount === 0
                                        ? 'Belum ada penilaian'
                                        : kpi.missingGradeCount > 0
                                            ? kpi.studentsWithMissingGrades && kpi.studentsWithMissingGrades > 0
                                                ? `${kpi.studentsWithMissingGrades} siswa (${kpi.missingGradeCount} nilai kosong)`
                                                : `${kpi.missingGradeCount} nilai belum terisi`
                                            : 'Semua nilai sudah terisi'}
                                </p>
                            </div>
                            {isInteractive && (
                                <div
                                    className={`mt-3 pt-2 border-t flex items-center justify-between text-[11px] font-semibold ${
                                        activeSubView === 'completion'
                                            ? 'border-emerald-200/70 dark:border-emerald-800/50 text-emerald-700 dark:text-emerald-300'
                                            : 'border-slate-100 dark:border-slate-800 text-slate-500 dark:text-slate-400'
                                    }`}
                                >
                                    <span>Audit nilai kosong</span>
                                    <ChevronRight className="w-3.5 h-3.5 shrink-0" />
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </div>

                {/* 4. Tren & Capaian -> Grafik Tren & Sebaran Predikat */}
                <div
                    {...getCardInteractiveProps('trends', 'Tren Nilai & Capaian Siswa')}
                    className={`transition-all text-left rounded-2xl ${
                        isInteractive
                            ? 'cursor-pointer hover:-translate-y-0.5 active:scale-[0.99] focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500'
                            : ''
                    }`}
                >
                    <Card
                        className={`h-full relative overflow-hidden transition-all ${
                            activeSubView === 'trends'
                                ? 'ring-2 ring-blue-500 dark:ring-blue-400 bg-blue-50/40 dark:bg-blue-950/20 shadow-sm'
                                : 'hover:border-slate-300 dark:hover:border-slate-700'
                        }`}
                    >
                        {activeSubView === 'trends' && (
                            <span className="absolute inset-x-0 top-0 h-1 bg-blue-500" aria-hidden />
                        )}
                        <CardContent className="p-3.5 sm:p-4 flex flex-col justify-between h-full">
                            <div>
                                <div className="flex items-center justify-between gap-1.5 mb-1.5">
                                    <span className="text-[11px] sm:text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 truncate">
                                        Tren & Capaian
                                    </span>
                                    <div className="p-1.5 rounded-lg bg-blue-100 dark:bg-blue-900/30 shrink-0">
                                        <LineChart className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                                    </div>
                                </div>
                                <p className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tabular-nums">
                                    {kpi.assessedStudents}
                                    <span className="text-xs sm:text-sm font-normal text-slate-500">
                                        /{kpi.totalStudents} siswa
                                    </span>
                                </p>
                                <div className="mt-1.5">
                                    <div className="w-full h-1.5 rounded-full bg-slate-100 dark:bg-slate-700 overflow-hidden">
                                        <div
                                            className={`h-full rounded-full transition-all duration-700 ${
                                                kpi.studentCoverageRate >= 80
                                                    ? 'bg-emerald-500'
                                                    : kpi.studentCoverageRate >= 50
                                                        ? 'bg-amber-500'
                                                        : 'bg-rose-500'
                                            }`}
                                            style={{ width: `${kpi.studentCoverageRate}%` }}
                                        />
                                    </div>
                                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 truncate">
                                        {kpi.studentCoverageRate}% siswa sudah dinilai
                                    </p>
                                </div>
                            </div>
                            {isInteractive && (
                                <div
                                    className={`mt-3 pt-2 border-t flex items-center justify-between text-[11px] font-semibold ${
                                        activeSubView === 'trends'
                                            ? 'border-blue-200/70 dark:border-blue-800/50 text-blue-700 dark:text-blue-300'
                                            : 'border-slate-100 dark:border-slate-800 text-slate-500 dark:text-slate-400'
                                    }`}
                                >
                                    <span>Grafik & sebaran</span>
                                    <ChevronRight className="w-3.5 h-3.5 shrink-0" />
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
};
