import React from 'react';
import { Card, CardContent } from '../../../ui/Card';
import { TrendingUp, TrendingDown, Minus, GraduationCap, Users, AlertTriangle, CheckCircle } from 'lucide-react';
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
    return (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {/* Overall Average */}
            <Card className="bg-white dark:bg-slate-900 border-0 shadow-md">
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
                            <span className={`inline-flex items-center gap-0.5 text-xs font-semibold ${kpi.averageTrend > 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                                <TrendIndicator value={kpi.averageTrend} />
                                {kpi.averageTrend > 0 ? '+' : ''}{kpi.averageTrend}
                            </span>
                        )}
                    </div>
                    <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-0.5">
                        Target KKTP: {kktpThreshold}
                    </p>
                </CardContent>
            </Card>

            {/* Assessed Students */}
            <Card className="bg-white dark:bg-slate-900 border-0 shadow-md">
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
                        {kpi.assessedStudents}<span className="text-sm font-normal text-slate-400">/{kpi.totalStudents}</span>
                    </p>
                    <div className="mt-1.5">
                        <div className="w-full h-1.5 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                            <div
                                className={`h-full rounded-full transition-all duration-700 ${kpi.completionRate >= 80 ? 'bg-emerald-500' : kpi.completionRate >= 50 ? 'bg-amber-500' : 'bg-rose-500'}`}
                                style={{ width: `${kpi.completionRate}%` }}
                            />
                        </div>
                        <p className="text-[11px] text-slate-400 mt-0.5">{kpi.completionRate}% kelengkapan</p>
                    </div>
                </CardContent>
            </Card>

            {/* Subjects Below KKTP */}
            <Card className={`bg-white dark:bg-slate-900 border-0 shadow-md ${kpi.subjectsBelowKKTP > 0 ? 'border-l-4 border-l-amber-500' : ''}`}>
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
                        <span className="text-sm font-normal text-slate-400">/{kpi.totalSubjects} mapel</span>
                    </p>
                    <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-0.5">
                        {kpi.subjectsBelowKKTP === 0 ? 'Semua mapel aman' : 'Perlu perhatian'}
                    </p>
                </CardContent>
            </Card>

            {/* Completion Rate */}
            <Card className="bg-white dark:bg-slate-900 border-0 shadow-md">
                <CardContent className="p-4">
                    <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                            Kelengkapan
                        </span>
                        <div className={`p-1.5 rounded-lg ${kpi.completionRate >= 80 ? 'bg-emerald-100 dark:bg-emerald-900/30' : 'bg-rose-100 dark:bg-rose-900/30'}`}>
                            <CheckCircle className={`w-4 h-4 ${kpi.completionRate >= 80 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`} />
                        </div>
                    </div>
                    <p className="text-2xl font-extrabold text-slate-900 dark:text-white">
                        {kpi.completionRate}<span className="text-lg">%</span>
                    </p>
                    <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-0.5">
                        {kpi.totalStudents - kpi.assessedStudents > 0
                            ? `${kpi.totalStudents - kpi.assessedStudents} siswa belum dinilai`
                            : 'Semua siswa sudah dinilai'}
                    </p>
                </CardContent>
            </Card>
        </div>
    );
};
