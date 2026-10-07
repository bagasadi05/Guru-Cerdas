import React from 'react';
import { Card, CardContent } from '../../../ui/Card';
import { TrendingUp, TrendingDown, Minus, GraduationCap, Users, AlertTriangle, CheckCircle, ClipboardCheck } from 'lucide-react';
import type { AcademicKPI } from '../../../../services/academicAnalyticsService';

interface AcademicKPICardsProps {
    kpi: AcademicKPI;
    kktpThreshold: number;
}

const TrendIndicator: React.FC<{ value: number }> = ({ value }) => {
    if (value > 0) return <TrendingUp className="w-3.5 h-3.5 text-emerald-500" />;
    if (value < 0) return <TrendingDown className="w-3.5 h-3.5 text-rose-500" />;
    return <Minus className="w-3.5 h-3.5 text-slate-400" />;
};

export const AcademicKPICards: React.FC<AcademicKPICardsProps> = ({ kpi, kktpThreshold }) => {
    const completenessOk = kpi.expectedGradeCount === 0 || kpi.gradeCompleteness >= 80;
    return (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {/* Overall Average */}
            <Card>
                <CardContent className="p-4">
                    <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                            Rata-rata
                        </span>
                        <div className="p-1.5 rounded-lg bg-brand-100 dark:bg-brand-900/30">
                            <GraduationCap className="w-4 h-4 text-brand-600 dark:text-brand-400" />
                        </div>
                    </div>
                    <div className="flex items-baseline gap-2">
                        <p className="text-2xl font-extrabold text-slate-900 dark:text-white">
                            {kpi.overallAverage || '-'}
                        </p>
                        {kpi.averageTrend !== 0 && (
                            <span className={`inline-flex items-center gap-0.5 text-xs font-semibold ${kpi.averageTrend > 0 ? 'text-emerald-700' : 'text-rose-600'}`}>
                                <TrendIndicator value={kpi.averageTrend} />
                                {kpi.averageTrend > 0 ? '+' : ''}{kpi.averageTrend}
                            </span>
                        )}
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                        Target KKTP: {kktpThreshold}
                        {kpi.averageTrend !== 0 && ' · dibanding penilaian sebelumnya'}
                    </p>
                </CardContent>
            </Card>

            {/* Assessed Students */}
            <Card>
                <CardContent className="p-4">
                    <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                            Siswa Dinilai
                        </span>
                        <div className="p-1.5 rounded-lg bg-blue-100 dark:bg-blue-900/30">
                            <Users className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                        </div>
                    </div>
                    <p className="text-2xl font-extrabold text-slate-900 dark:text-white">
                        {kpi.assessedStudents}<span className="text-sm font-normal text-slate-500">/{kpi.totalStudents}</span>
                    </p>
                    <div className="mt-1.5">
                        <div className="w-full h-1.5 rounded-full bg-slate-100 dark:bg-slate-700 overflow-hidden">
                            <div
                                className={`h-full rounded-full transition-all duration-700 ${kpi.studentCoverageRate >= 80 ? 'bg-emerald-500' : kpi.studentCoverageRate >= 50 ? 'bg-amber-500' : 'bg-rose-500'}`}
                                style={{ width: `${kpi.studentCoverageRate}%` }}
                            />
                        </div>
                        <p className="text-xs text-slate-500 mt-0.5">{kpi.studentCoverageRate}% siswa punya minimal satu nilai</p>
                    </div>
                </CardContent>
            </Card>

            {/* Subjects Below KKTP */}
            <Card className={kpi.subjectsBelowKKTP > 0 ? 'border-l-4 border-l-amber-500' : undefined}>
                <CardContent className="p-4">
                    <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                            Di Bawah KKTP
                        </span>
                        <div className={`p-1.5 rounded-lg ${kpi.subjectsBelowKKTP > 0 ? 'bg-amber-100 dark:bg-amber-900/30' : 'bg-emerald-100 dark:bg-emerald-900/30'}`}>
                            {kpi.subjectsBelowKKTP > 0
                                ? <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                                : <CheckCircle className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                            }
                        </div>
                    </div>
                    <p className="text-2xl font-extrabold text-slate-900 dark:text-white">
                        {kpi.subjectsBelowKKTP}
                        <span className="text-sm font-normal text-slate-500">/{kpi.totalSubjects} mapel</span>
                    </p>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                        {kpi.subjectsBelowKKTP === 0
                            ? 'Semua mapel mencapai KKTP'
                            : `${kpi.studentsBelowKKTP} siswa punya nilai mapel di bawah KKTP`}
                    </p>
                </CardContent>
            </Card>

            {/* Grade completeness */}
            <Card>
                <CardContent className="p-4">
                    <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                            Kelengkapan Nilai
                        </span>
                        <div className={`p-1.5 rounded-lg ${completenessOk ? 'bg-emerald-100 dark:bg-emerald-900/30' : 'bg-rose-100 dark:bg-rose-900/30'}`}>
                            <ClipboardCheck className={`w-4 h-4 ${completenessOk ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`} />
                        </div>
                    </div>
                    <p className="text-2xl font-extrabold text-slate-900 dark:text-white">
                        {kpi.expectedGradeCount > 0 ? <>{kpi.gradeCompleteness}<span className="text-lg">%</span></> : '-'}
                    </p>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                        {kpi.expectedGradeCount === 0
                            ? 'Belum ada penilaian'
                            : kpi.missingGradeCount > 0
                                ? `${kpi.missingGradeCount} nilai belum terisi`
                                : 'Semua nilai sudah terisi'}
                    </p>
                </CardContent>
            </Card>
        </div>
    );
};
