import React, { useMemo, useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../../ui/Card';
import { GraduationCapIcon, InfoIcon, ClipboardPen } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import type { AnalyticsAcademicRecord, AnalyticsClass, GradeDistribution, Student } from './types';
// Lazy load heavy components to optimize initial bundle size
const AcademicTrendChart = React.lazy(() =>
    import('./academic/AcademicTrendChart').then((m) => ({ default: m.AcademicTrendChart }))
);
const GradeCompletionAnalysis = React.lazy(() =>
    import('./GradeCompletionAnalysis')
);
const SubjectDetailModal = React.lazy(() =>
    import('./academic/SubjectDetailModal').then((m) => ({ default: m.SubjectDetailModal }))
);
import { AcademicKPICards, type AcademicSubView } from './academic/AcademicKPICards';
import { SubjectAnalysisGrid } from './academic/SubjectAnalysisGrid';
import { AcademicInsightPanel } from './academic/AcademicInsightPanel';
import { StudentsBelowKKTPList } from './academic/StudentsBelowKKTPList';
import {
    calculateSubjectStats,
    calculateAcademicKPI,
    findStudentsBelowKKTP,
    generateOfflineAcademicInsights,
    generateAIAcademicInsights,
    type SubjectStats,
    type AcademicInsightResult,
    type InsightAction,
    type OverallGradeStats,
} from '../../../services/academicAnalyticsService';

export type { AcademicSubView };

const ChartSkeleton = () => (
    <Card className="border-slate-200 dark:border-slate-800 animate-pulse">
        <CardHeader>
            <div className="h-5 bg-slate-200 dark:bg-slate-700 rounded w-48" />
        </CardHeader>
        <CardContent>
            <div className="h-[280px] bg-slate-100 dark:bg-slate-800/50 rounded-xl" />
        </CardContent>
    </Card>
);

const SectionSkeleton = () => (
    <Card className="border-slate-200 dark:border-slate-800 animate-pulse">
        <CardHeader>
            <div className="h-5 bg-slate-200 dark:bg-slate-700 rounded w-56" />
        </CardHeader>
        <CardContent>
            <div className="h-44 bg-slate-100 dark:bg-slate-800/50 rounded-xl" />
        </CardContent>
    </Card>
);

interface AcademicTabProps {
    gradeStats: OverallGradeStats;
    classes: AnalyticsClass[];
    students: Student[];
    academicRecords: AnalyticsAcademicRecord[];
    selectedClassId: string;
    kktp: number;
    semesterName: string | null;
}

export const AcademicTab: React.FC<AcademicTabProps> = ({
    gradeStats,
    classes,
    students,
    academicRecords,
    selectedClassId,
    kktp,
    semesterName,
}) => {
    const navigate = useNavigate();
    const [selectedSubject, setSelectedSubject] = useState<SubjectStats | null>(null);
    const [aiResult, setAiResult] = useState<(AcademicInsightResult & { signature: string }) | null>(null);
    const [isAiLoading, setIsAiLoading] = useState(false);
    const [subView, setSubView] = useState<AcademicSubView>('remedial');

    const subjectStats = useMemo(() => calculateSubjectStats(academicRecords, kktp), [academicRecords, kktp]);

    const kpi = useMemo(
        () => calculateAcademicKPI(academicRecords, students, subjectStats, kktp),
        [academicRecords, students, subjectStats, kktp],
    );

    const studentsBelowKKTP = useMemo(
        () => findStudentsBelowKKTP(academicRecords, students, classes, kktp),
        [academicRecords, students, classes, kktp],
    );

    const studentClassIds = useMemo(() => {
        const map = new Map<string, string | null>();
        for (const s of students) {
            map.set(s.id, s.class_id ?? null);
        }
        return map;
    }, [students]);

    const offlineInsights = useMemo(
        () => generateOfflineAcademicInsights(subjectStats, kpi, studentsBelowKKTP, kktp),
        [subjectStats, kpi, studentsBelowKKTP, kktp],
    );

    // AI insights belong to the data they were generated from; any change makes them stale.
    const dataSignature = useMemo(
        () =>
            [
                selectedClassId,
                kktp,
                kpi.overallAverage,
                kpi.gradeCompleteness,
                ...subjectStats.map((s) => `${s.subject}:${s.average}:${s.studentCount}:${s.trendDelta}`),
            ].join('|'),
        [selectedClassId, kktp, kpi, subjectStats],
    );
    const currentAi = aiResult?.signature === dataSignature ? aiResult : null;

    const selectedClassLabel =
        selectedClassId === 'all'
            ? 'Semua Kelas'
            : classes.find((c) => c.id === selectedClassId)?.name || 'Kelas';

    const inputClassId =
        selectedClassId !== 'all' ? selectedClassId : classes.length === 1 ? classes[0].id : null;

    const handleNavigateInput = useCallback(
        (targetClassId?: string | null, subjectName?: string) => {
            const resolvedClassId = targetClassId !== undefined ? targetClassId : inputClassId;
            navigate('/input-massal', {
                state: {
                    prefill: {
                        mode: 'subject_grade',
                        ...(resolvedClassId ? { classId: resolvedClassId } : {}),
                        ...(subjectName ? { subject: subjectName } : {}),
                    },
                },
            });
        },
        [navigate, inputClassId]
    );

    const handleSelectSubjectByName = useCallback(
        (subjectName: string) => {
            const match = subjectStats.find((s) => s.subject === subjectName);
            if (match) {
                setSelectedSubject(match);
            }
        },
        [subjectStats]
    );

    const handleGenerateAi = async () => {
        const signature = dataSignature;
        setIsAiLoading(true);
        try {
            const result = await generateAIAcademicInsights(
                subjectStats,
                kpi,
                studentsBelowKKTP,
                selectedClassLabel,
                kktp
            );
            setAiResult({ ...result, signature });
        } finally {
            setIsAiLoading(false);
        }
    };

    const handleInsightAction = useCallback(
        (action: InsightAction) => {
            if (action === 'navigate-input') {
                handleNavigateInput(inputClassId);
                return;
            }
            if (action === 'scroll-below-kktp') {
                setSubView('remedial');
                setTimeout(
                    () => document.getElementById('below-kktp-section')?.scrollIntoView({ behavior: 'smooth' }),
                    50
                );
                return;
            }
            if (action === 'scroll-subjects') {
                setSubView('subjects');
                setTimeout(
                    () => document.getElementById('subject-grid')?.scrollIntoView({ behavior: 'smooth' }),
                    50
                );
                return;
            }
            if (action === 'scroll-completion') {
                setSubView('completion');
                setTimeout(
                    () => document.getElementById('completion-section')?.scrollIntoView({ behavior: 'smooth' }),
                    50
                );
                return;
            }
        },
        [handleNavigateInput, inputClassId]
    );

    const hasData = academicRecords.length > 0;

    return (
        <div className="space-y-5 animate-fade-in">
            {/* Compact Context Bar */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/70 dark:border-slate-700/60">
                <p className="flex items-start sm:items-center gap-2 text-xs text-slate-600 dark:text-slate-300">
                    <InfoIcon className="w-4 h-4 text-brand-600 dark:text-brand-400 shrink-0 mt-0.5 sm:mt-0" aria-hidden />
                    <span>
                        {semesterName
                            ? `Nilai dihitung dari seluruh semester ${semesterName} dengan KKTP ${kktp}. Ketuk salah satu kartu di bawah untuk beralih tampilan.`
                            : `Belum ada semester aktif, jadi nilai dari semua semester ikut dihitung dengan KKTP ${kktp}. Ketuk kartu untuk beralih tampilan.`}
                    </span>
                </p>
                <button
                    type="button"
                    onClick={() => handleNavigateInput(inputClassId)}
                    className="inline-flex items-center justify-center gap-1.5 min-h-[38px] sm:min-h-[32px] px-3 py-1.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs font-semibold text-brand-700 dark:text-brand-300 hover:bg-brand-50 dark:hover:bg-slate-800 transition-colors shrink-0 cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
                >
                    <ClipboardPen className="w-3.5 h-3.5" />
                    <span>Input Nilai</span>
                </button>
            </div>

            {/* 4 Interactive KPI Summary Cards (Single Navigation Switcher) */}
            <AcademicKPICards
                kpi={kpi}
                kktpThreshold={kktp}
                activeSubView={subView}
                onSelectSubView={setSubView}
            />

            {/* View 1: Di Bawah KKTP -> Daftar Remedial & Insight AI */}
            {subView === 'remedial' && (
                <div className="space-y-5 animate-fade-in">
                    <div id="below-kktp-section" className="scroll-mt-4">
                        <StudentsBelowKKTPList
                            students={studentsBelowKKTP}
                            kktp={kktp}
                            studentClassIds={studentClassIds}
                            defaultClassId={inputClassId}
                            onSelectSubject={handleSelectSubjectByName}
                            onInputRemedial={handleNavigateInput}
                        />
                    </div>

                    {hasData && (
                        <AcademicInsightPanel
                            insights={currentAi ? currentAi.insights : offlineInsights}
                            source={currentAi?.source ?? null}
                            isAiLoading={isAiLoading}
                            onGenerateAi={handleGenerateAi}
                            onAction={handleInsightAction}
                        />
                    )}
                </div>
            )}

            {/* View 2: Rata-rata Nilai -> Analisis Per Mata Pelajaran */}
            {subView === 'subjects' && (
                <div className="space-y-6 animate-fade-in">
                    <div id="subject-grid" className="scroll-mt-4">
                        <SubjectAnalysisGrid
                            subjectStats={subjectStats}
                            onSelectSubject={setSelectedSubject}
                            onInputSubjectGrade={(subjectName) => handleNavigateInput(inputClassId, subjectName)}
                        />
                    </div>
                </div>
            )}

            {/* View 3: Kelengkapan Nilai -> Audit Nilai Belum Masuk */}
            {subView === 'completion' && (
                <div id="completion-section" className="space-y-6 animate-fade-in scroll-mt-4">
                    <React.Suspense fallback={<SectionSkeleton />}>
                        <GradeCompletionAnalysis
                            classes={classes}
                            students={students}
                            academicRecords={academicRecords}
                            selectedClassId={selectedClassId}
                        />
                    </React.Suspense>
                </div>
            )}

            {/* View 4: Tren & Capaian -> Grafik Tren & Sebaran Predikat */}
            {subView === 'trends' && (
                <div className="space-y-6 animate-fade-in">
                    <React.Suspense fallback={<ChartSkeleton />}>
                        <AcademicTrendChart
                            academicRecords={academicRecords}
                            subjects={subjectStats.map((s) => s.subject)}
                            kktpThreshold={kktp}
                        />
                    </React.Suspense>

                    {gradeStats.totalStudentsWithGrades > 0 && (
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <GraduationCapIcon className="w-5 h-5 text-brand-600" aria-hidden />
                                    Sebaran Predikat Kelas
                                </CardTitle>
                                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                                    Distribusi nilai predikat A, B, C, dan D dari total {gradeStats.totalStudentsWithGrades} siswa yang sudah memiliki nilai.
                                </p>
                            </CardHeader>
                            <CardContent>
                                <GradeDistributionBar data={gradeStats.distribution} />
                            </CardContent>
                        </Card>
                    )}
                </div>
            )}

            <React.Suspense fallback={null}>
                <SubjectDetailModal
                    subject={selectedSubject}
                    studentsBelowKKTP={studentsBelowKKTP}
                    kktp={kktp}
                    classId={inputClassId}
                    onClose={() => setSelectedSubject(null)}
                />
            </React.Suspense>
        </div>
    );
};

const GradeDistributionBar = ({ data }: { data: GradeDistribution[] }) => {
    const summary = data.map((d) => `${d.label} ${d.count} siswa`).join(', ');
    return (
        <div>
            <div
                className="flex h-3 w-full rounded-full overflow-hidden bg-slate-100 dark:bg-slate-700"
                role="img"
                aria-label={`Sebaran predikat: ${summary}`}
            >
                {data.map(
                    (d) =>
                        d.count > 0 && (
                            <div
                                key={d.label}
                                className="h-full"
                                style={{ width: `${d.percentage}%`, backgroundColor: d.color }}
                            />
                        )
                )}
            </div>
            <dl className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4">
                {data.map((d) => (
                    <div key={d.label} className="flex items-start gap-2">
                        <span
                            className="w-2.5 h-2.5 rounded-full shrink-0 mt-1"
                            style={{ backgroundColor: d.color }}
                            aria-hidden
                        />
                        <div>
                            <dt className="text-xs text-slate-500 dark:text-slate-400">
                                <span className="font-bold text-slate-700 dark:text-slate-200">{d.label}</span> · {d.range}
                            </dt>
                            <dd className="text-sm font-semibold text-slate-900 dark:text-white tabular-nums">
                                {d.count} siswa{' '}
                                <span className="text-xs font-normal text-slate-500 dark:text-slate-400">
                                    ({d.percentage}%)
                                </span>
                            </dd>
                        </div>
                    </div>
                ))}
            </dl>
        </div>
    );
};
