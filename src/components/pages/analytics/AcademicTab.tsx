import React, { useMemo, useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../../ui/Card';
import { GraduationCapIcon, BookOpenIcon } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { GradeDistribution } from './types';
import GradeCompletionAnalysis from './GradeCompletionAnalysis';
import { AcademicKPICards } from './academic/AcademicKPICards';
import { SubjectAnalysisGrid } from './academic/SubjectAnalysisGrid';
import { SubjectDetailModal } from './academic/SubjectDetailModal';
import { AcademicTrendChart } from './academic/AcademicTrendChart';
import { AcademicInsightPanel } from './academic/AcademicInsightPanel';
import {
    calculateSubjectStats,
    calculateAcademicKPI,
    calculateAcademicTrends,
    findStudentsBelowKKTP,
    generateOfflineAcademicInsights,
    generateAIAcademicInsights,
    DEFAULT_KKTP,
    type SubjectStats,
    type AcademicInsight,
} from '../../../services/academicAnalyticsService';

interface AcademicTabProps {
    gradeStats: { distribution: GradeDistribution[]; overallAverage: number; totalStudentsWithGrades: number };
    classes: any[];
    students: any[];
    academicRecords: any[];
    selectedClassId: string;
}

export const AcademicTab: React.FC<AcademicTabProps> = ({ gradeStats, classes, students, academicRecords, selectedClassId }) => {
    const navigate = useNavigate();
    const [selectedSubject, setSelectedSubject] = useState<SubjectStats | null>(null);
    const [insights, setInsights] = useState<AcademicInsight[]>([]);
    const [isInsightsLoading, setIsInsightsLoading] = useState(false);

    // Computed data
    const subjectStats = useMemo(
        () => calculateSubjectStats(academicRecords, students, DEFAULT_KKTP),
        [academicRecords, students],
    );

    const kpi = useMemo(
        () => calculateAcademicKPI(academicRecords, students, subjectStats, DEFAULT_KKTP),
        [academicRecords, students, subjectStats],
    );

    const trendData = useMemo(
        () => calculateAcademicTrends(academicRecords, subjectStats.map((s) => s.subject)),
        [academicRecords, subjectStats],
    );

    const studentsBelowKKTP = useMemo(
        () => findStudentsBelowKKTP(academicRecords, students, classes, DEFAULT_KKTP),
        [academicRecords, students, classes],
    );

    // Generate insights on mount
    React.useEffect(() => {
        if (academicRecords.length === 0) return;

        let cancelled = false;
        const generate = async () => {
            setIsInsightsLoading(true);
            const offline = generateOfflineAcademicInsights(subjectStats, kpi, studentsBelowKKTP);
            setInsights(offline);
            setIsInsightsLoading(false);

            // Try AI in background
            try {
                const selectedClassLabel = selectedClassId === 'all'
                    ? 'Semua Kelas'
                    : classes.find((c: any) => c.id === selectedClassId)?.name || 'Kelas';
                const ai = await generateAIAcademicInsights(subjectStats, kpi, studentsBelowKKTP, selectedClassLabel);
                if (!cancelled && ai.length > 0) {
                    setInsights(ai);
                }
            } catch {
                // Offline fallback already set
            }
        };
        generate();
        return () => { cancelled = true; };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [academicRecords.length, subjectStats.length, selectedClassId]);

    const handleInsightAction = useCallback((action: string) => {
        switch (action) {
            case 'navigate-input':
                navigate('/input-massal');
                break;
            case 'scroll-subjects':
                document.getElementById('subject-grid')?.scrollIntoView({ behavior: 'smooth' });
                break;
            case 'scroll-kktp':
                document.getElementById('kktp-section')?.scrollIntoView({ behavior: 'smooth' });
                break;
        }
    }, [navigate]);

    const hasData = gradeStats.totalStudentsWithGrades > 0 || academicRecords.length > 0;

    return (
        <div className="space-y-6 animate-fade-in">
            {/* KPI Cards */}
            <AcademicKPICards kpi={kpi} kktpThreshold={DEFAULT_KKTP} />

            {/* AI Insights */}
            <AcademicInsightPanel
                insights={insights}
                isLoading={isInsightsLoading}
                onAction={handleInsightAction}
            />

            {/* Grade Distribution (preserved from original) */}
            <Card className="bg-white dark:bg-slate-900 border-0 shadow-lg">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <GraduationCapIcon className="w-5 h-5 text-brand-600" />
                        Distribusi Nilai Keseluruhan
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    {gradeStats.totalStudentsWithGrades > 0 ? (
                        <GradeDistributionChart data={gradeStats.distribution} average={gradeStats.overallAverage} />
                    ) : (
                        <div className="h-48 flex flex-col items-center justify-center text-center p-6 border-2 border-dashed border-slate-100 dark:border-slate-800 rounded-xl">
                            <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-full mb-3">
                                <BookOpenIcon className="w-6 h-6 text-slate-400" />
                            </div>
                            <p className="text-sm font-medium text-slate-900 dark:text-white">Belum Ada Data Nilai</p>
                            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                                Input nilai siswa melalui menu Input Penilaian untuk melihat sebaran nilai di sini.
                            </p>
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Subject Analysis Grid */}
            <div id="subject-grid">
                <SubjectAnalysisGrid
                    subjectStats={subjectStats}
                    onSelectSubject={setSelectedSubject}
                />
            </div>

            {/* Trend Chart */}
            {subjectStats.length > 0 && (
                <AcademicTrendChart trends={trendData} kktpThreshold={DEFAULT_KKTP} />
            )}

            {/* Grade Completion Analysis (promoted - always visible) */}
            {hasData && (
                <div id="kktp-section">
                    <GradeCompletionAnalysis
                        classes={classes}
                        students={students}
                        academicRecords={academicRecords}
                        selectedClassId={selectedClassId}
                    />
                </div>
            )}

            {/* Subject Detail Modal */}
            <SubjectDetailModal
                subject={selectedSubject}
                studentsBelowKKTP={studentsBelowKKTP}
                onClose={() => setSelectedSubject(null)}
            />
        </div>
    );
};

// =============================================================================
// INLINE: Grade Distribution Chart (preserved from original)
// =============================================================================

const GradeDistributionChart = ({ data, average }: { data: GradeDistribution[]; average: number }) => {
    return (
        <div className="relative">
            <div className="flex items-end justify-between mb-6 px-2">
                <div className="text-center">
                    <p className="text-4xl font-bold text-brand-600 dark:text-brand-400">{average}</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400 uppercase tracking-widest mt-1">Rata-rata Kelas</p>
                </div>
                <div className="text-right">
                    <p className="text-sm font-medium text-slate-600 dark:text-gray-300">
                        Total {data.reduce((a, b) => a + b.count, 0)} Siswa
                    </p>
                    <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">Dinilai</p>
                </div>
            </div>

            <div className="space-y-4">
                {data.map((item, index) => (
                    <div key={index} className="group relative">
                        <div className="flex items-center justify-between text-sm mb-1.5">
                            <span className="font-semibold text-slate-700 dark:text-gray-200 w-8">{item.label}</span>
                            <span className="text-xs text-slate-500 dark:text-slate-400">
                                {item.range}
                            </span>
                            <span className="font-bold text-slate-900 dark:text-white">
                                {item.count} <span className="text-slate-400 font-normal text-xs ml-0.5">({item.percentage}%)</span>
                            </span>
                        </div>
                        <div className="h-4 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                            <div
                                className="h-full rounded-full transition-all duration-1000 ease-out relative"
                                style={{
                                    width: `${item.percentage}%`,
                                    backgroundColor: item.color
                                }}
                            />
                        </div>
                    </div>
                ))}
            </div>

            {average > 0 && average < 75 && (
                <div className="mt-6 p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl flex gap-3">
                    <div className="p-2 bg-amber-100 dark:bg-amber-800/40 rounded-lg h-fit">
                        <GraduationCapIcon className="w-5 h-5 text-amber-600 dark:text-amber-400" />
                    </div>
                    <div>
                        <h4 className="text-sm font-bold text-amber-800 dark:text-amber-300 mb-1">Perhatian Akademik</h4>
                        <p className="text-xs text-amber-700 dark:text-amber-400/80 leading-relaxed">
                            Rata-rata nilai kelas di bawah 75. Pertimbangkan untuk mengadakan remedial atau kelas tambahan.
                        </p>
                    </div>
                </div>
            )}
        </div>
    );
};
