import React, { useMemo, useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../../ui/Card';
import { GraduationCapIcon, InfoIcon } from 'lucide-react';
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
import { AcademicKPICards } from './academic/AcademicKPICards';
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

const SECTION_FOR_ACTION: Partial<Record<InsightAction, string>> = {
    'scroll-subjects': 'subject-grid',
    'scroll-below-kktp': 'below-kktp-section',
    'scroll-completion': 'completion-section',
};

export const AcademicTab: React.FC<AcademicTabProps> = ({
    gradeStats, classes, students, academicRecords, selectedClassId, kktp, semesterName,
}) => {
    const navigate = useNavigate();
    const [selectedSubject, setSelectedSubject] = useState<SubjectStats | null>(null);
    const [aiResult, setAiResult] = useState<(AcademicInsightResult & { signature: string }) | null>(null);
    const [isAiLoading, setIsAiLoading] = useState(false);

    const subjectStats = useMemo(() => calculateSubjectStats(academicRecords, kktp), [academicRecords, kktp]);

    const kpi = useMemo(
        () => calculateAcademicKPI(academicRecords, students, subjectStats, kktp),
        [academicRecords, students, subjectStats, kktp],
    );

    const studentsBelowKKTP = useMemo(
        () => findStudentsBelowKKTP(academicRecords, students, classes, kktp),
        [academicRecords, students, classes, kktp],
    );

    const offlineInsights = useMemo(
        () => generateOfflineAcademicInsights(subjectStats, kpi, studentsBelowKKTP, kktp),
        [subjectStats, kpi, studentsBelowKKTP, kktp],
    );

    // AI insights belong to the data they were generated from; any change makes them stale.
    const dataSignature = useMemo(
        () => [selectedClassId, kktp, kpi.overallAverage, kpi.gradeCompleteness, ...subjectStats.map((s) => `${s.subject}:${s.average}:${s.studentCount}:${s.trendDelta}`)].join('|'),
        [selectedClassId, kktp, kpi, subjectStats],
    );
    const currentAi = aiResult?.signature === dataSignature ? aiResult : null;

    const selectedClassLabel = selectedClassId === 'all'
        ? 'Semua Kelas'
        : classes.find((c) => c.id === selectedClassId)?.name || 'Kelas';

    const inputClassId = selectedClassId !== 'all' ? selectedClassId : classes.length === 1 ? classes[0].id : null;

    const handleGenerateAi = async () => {
        const signature = dataSignature;
        setIsAiLoading(true);
        try {
            const result = await generateAIAcademicInsights(subjectStats, kpi, studentsBelowKKTP, selectedClassLabel, kktp);
            setAiResult({ ...result, signature });
        } finally {
            setIsAiLoading(false);
        }
    };

    const handleInsightAction = useCallback((action: InsightAction) => {
        if (action === 'navigate-input') {
            navigate('/input-massal', inputClassId
                ? { state: { prefill: { mode: 'subject_grade', classId: inputClassId } } }
                : undefined);
            return;
        }
        const sectionId = SECTION_FOR_ACTION[action];
        if (sectionId) document.getElementById(sectionId)?.scrollIntoView({ behavior: 'smooth' });
    }, [navigate, inputClassId]);

    const hasData = academicRecords.length > 0;

    return (
        <div className="space-y-6 animate-fade-in">
            <p className="flex items-start gap-2 text-xs text-slate-500 dark:text-slate-400">
                <InfoIcon className="w-4 h-4 shrink-0 mt-px" aria-hidden />
                {semesterName
                    ? `Nilai dihitung dari seluruh semester ${semesterName} dengan KKTP ${kktp}. Filter bulan hanya berlaku untuk kehadiran dan karakter.`
                    : `Belum ada semester aktif, jadi nilai dari semua semester ikut dihitung. KKTP ${kktp}.`}
            </p>

            <AcademicKPICards kpi={kpi} kktpThreshold={kktp} />

            {hasData && (
                <AcademicInsightPanel
                    insights={currentAi ? currentAi.insights : offlineInsights}
                    source={currentAi?.source ?? null}
                    isAiLoading={isAiLoading}
                    onGenerateAi={handleGenerateAi}
                    onAction={handleInsightAction}
                />
            )}

            {hasData && (
                <div id="below-kktp-section" className="scroll-mt-4">
                    <StudentsBelowKKTPList students={studentsBelowKKTP} kktp={kktp} />
                </div>
            )}

            <div id="subject-grid" className="scroll-mt-4">
                <SubjectAnalysisGrid
                    subjectStats={subjectStats}
                    onSelectSubject={setSelectedSubject}
                />
            </div>

            {subjectStats.length > 0 && (
                <React.Suspense fallback={<ChartSkeleton />}>
                    <AcademicTrendChart
                        academicRecords={academicRecords}
                        subjects={subjectStats.map((s) => s.subject)}
                        kktpThreshold={kktp}
                    />
                </React.Suspense>
            )}

            {hasData && (
                <div id="completion-section" className="scroll-mt-4">
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

            {gradeStats.totalStudentsWithGrades > 0 && (
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <GraduationCapIcon className="w-5 h-5 text-brand-600" aria-hidden />
                            Sebaran Predikat
                        </CardTitle>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                            Dari rata-rata {gradeStats.totalStudentsWithGrades} siswa yang sudah punya nilai.
                        </p>
                    </CardHeader>
                    <CardContent>
                        <GradeDistributionBar data={gradeStats.distribution} />
                    </CardContent>
                </Card>
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
            <div className="flex h-3 w-full rounded-full overflow-hidden bg-slate-100 dark:bg-slate-700" role="img" aria-label={`Sebaran predikat: ${summary}`}>
                {data.map((d) => d.count > 0 && (
                    <div key={d.label} className="h-full" style={{ width: `${d.percentage}%`, backgroundColor: d.color }} />
                ))}
            </div>
            <dl className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4">
                {data.map((d) => (
                    <div key={d.label} className="flex items-start gap-2">
                        <span className="w-2.5 h-2.5 rounded-full shrink-0 mt-1" style={{ backgroundColor: d.color }} aria-hidden />
                        <div>
                            <dt className="text-xs text-slate-500 dark:text-slate-400">
                                <span className="font-bold text-slate-700 dark:text-slate-200">{d.label}</span> · {d.range}
                            </dt>
                            <dd className="text-sm font-semibold text-slate-900 dark:text-white tabular-nums">
                                {d.count} siswa <span className="text-xs font-normal text-slate-500 dark:text-slate-400">({d.percentage}%)</span>
                            </dd>
                        </div>
                    </div>
                ))}
            </dl>
        </div>
    );
};
