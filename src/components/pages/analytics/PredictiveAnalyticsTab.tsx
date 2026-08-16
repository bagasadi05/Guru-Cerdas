import React, { useMemo, useState } from 'react';
import {
    Sparkles,
    AlertTriangle,
    ShieldAlert,
    TrendingDown,
    TrendingUp,
    Calendar,
    Users,
    CheckCircle2,
    Copy,
    Check,
    Search,
    BookOpen,
    MessageSquare,
    BrainCircuit,
    ArrowRight,
    HelpCircle,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../../ui/Card';
import { Button } from '../../ui/Button';
import { Modal } from '../../ui/Modal';
import { useToast } from '../../../hooks/useToast';
import {
    calculateStudentRiskScores,
    analyzeAttendancePatterns,
    forecastAcademicPerformance,
    generateAiInterventionPlan,
    generateAiClassNarrativeReport,
    DEFAULT_KKTP_THRESHOLD,
} from '../../../services/predictiveAnalyticsService';
import type {
    Student,
    AnalyticsClass,
    AnalyticsAttendance,
    AnalyticsAcademicRecord,
    AnalyticsViolation,
    AnalyticsTask,
    StudentRiskAssessment,
    InterventionPlan,
    AiClassNarrativeReport,
    RiskLevel,
} from './types';

interface PredictiveAnalyticsTabProps {
    students: Student[];
    classes: AnalyticsClass[];
    attendance: AnalyticsAttendance[];
    academicRecords: AnalyticsAcademicRecord[];
    violations: AnalyticsViolation[];
    tasks?: AnalyticsTask[];
    selectedClassId?: string;
    kktpThreshold?: number;
}

export const PredictiveAnalyticsTab: React.FC<PredictiveAnalyticsTabProps> = ({
    students,
    classes,
    attendance,
    academicRecords,
    violations,
    tasks = [],
    selectedClassId = 'all',
    kktpThreshold = DEFAULT_KKTP_THRESHOLD,
}) => {
    const toast = useToast();

    // Filters & Search
    const [riskFilter, setRiskFilter] = useState<'all' | RiskLevel>('all');
    const [searchQuery, setSearchQuery] = useState('');

    // Modal states
    const [selectedAssessment, setSelectedAssessment] = useState<StudentRiskAssessment | null>(null);
    const [interventionPlan, setInterventionPlan] = useState<InterventionPlan | null>(null);
    const [isGeneratingIntervention, setIsGeneratingIntervention] = useState(false);
    const [isInterventionModalOpen, setIsInterventionModalOpen] = useState(false);

    const [classReport, setClassReport] = useState<AiClassNarrativeReport | null>(null);
    const [isGeneratingReport, setIsGeneratingReport] = useState(false);
    const [isReportModalOpen, setIsReportModalOpen] = useState(false);

    const [copiedKey, setCopiedKey] = useState<string | null>(null);

    // Selected class name
    const currentClassName = useMemo(() => {
        if (selectedClassId === 'all') return 'Semua Kelas';
        const found = classes.find((c) => c.id === selectedClassId);
        return found ? found.name : 'Kelas Terpilih';
    }, [classes, selectedClassId]);

    // 1. Calculate Student Risk Assessments
    const riskAssessments = useMemo(() => {
        return calculateStudentRiskScores(students, attendance, academicRecords, violations, tasks, {
            kktpThreshold,
        });
    }, [students, attendance, academicRecords, violations, tasks, kktpThreshold]);

    // 2. Analyze Attendance Patterns
    const attendancePatterns = useMemo(() => {
        return analyzeAttendancePatterns(attendance, students);
    }, [attendance, students]);

    // 3. Forecast Academic Performance
    const academicForecasts = useMemo(() => {
        return forecastAcademicPerformance(students, academicRecords, kktpThreshold);
    }, [students, academicRecords, kktpThreshold]);

    // Summary counts
    const highRiskStudents = useMemo(() => riskAssessments.filter((a) => a.riskLevel === 'high'), [riskAssessments]);
    const mediumRiskStudents = useMemo(() => riskAssessments.filter((a) => a.riskLevel === 'medium'), [riskAssessments]);
    const lowRiskStudents = useMemo(() => riskAssessments.filter((a) => a.riskLevel === 'low'), [riskAssessments]);

    // Filtered list for UI table
    const filteredAssessments = useMemo(() => {
        return riskAssessments.filter((item) => {
            const matchesFilter = riskFilter === 'all' || item.riskLevel === riskFilter;
            const matchesSearch = item.student.name.toLowerCase().includes(searchQuery.toLowerCase());
            return matchesFilter && matchesSearch;
        });
    }, [riskAssessments, riskFilter, searchQuery]);

    // Handle Copy to Clipboard
    const copyToClipboard = async (text: string, key: string) => {
        try {
            await navigator.clipboard.writeText(text);
            setCopiedKey(key);
            toast.success('Berhasil disalin ke clipboard!');
            setTimeout(() => setCopiedKey(null), 2500);
        } catch {
            toast.error('Gagal menyalin teks');
        }
    };

    // Handle Open Intervention Generator
    const handleOpenIntervention = async (assessment: StudentRiskAssessment) => {
        setSelectedAssessment(assessment);
        setIsInterventionModalOpen(true);
        setIsGeneratingIntervention(true);
        setInterventionPlan(null);

        try {
            const plan = await generateAiInterventionPlan(assessment);
            setInterventionPlan(plan);
        } catch (_err) {
            toast.error('Gagal menghasilkan rencana intervensi');
        } finally {
            setIsGeneratingIntervention(false);
        }
    };

    // Handle Generate Class Narrative Report
    const handleGenerateClassReport = async () => {
        setIsReportModalOpen(true);
        setIsGeneratingReport(true);
        setClassReport(null);

        const totalStudents = students.length;
        const validAtt = attendance.filter((a) => a.status !== 'Libur');
        const hadirCount = validAtt.filter((a) => a.status === 'Hadir').length;
        const attRate = validAtt.length > 0 ? Math.round((hadirCount / validAtt.length) * 100) : 100;

        const scores = academicRecords.map((r) => Number(r.score) || 0);
        const classAvg = scores.length > 0 ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 0;

        const vulnerabilities: string[] = [];
        if (attendancePatterns.mostVulnerableDay) {
            vulnerabilities.push(`Hari paling rawan ketidakhadiran: ${attendancePatterns.mostVulnerableDay}`);
        }
        if (attendancePatterns.consecutiveAbsenceAlerts.length > 0) {
            vulnerabilities.push(`${attendancePatterns.consecutiveAbsenceAlerts.length} siswa memiliki catatan absen berturut-turut >= 3 hari.`);
        }

        try {
            const report = await generateAiClassNarrativeReport({
                className: currentClassName,
                period: 'Semester Aktif',
                totalStudents,
                attendanceRate: attRate,
                classAvgScore: classAvg,
                highRiskCount: highRiskStudents.length,
                topPerformerCount: lowRiskStudents.length,
                vulnerabilities,
            });
            setClassReport(report);
        } catch {
            toast.error('Gagal membuat laporan narasi kelas');
        } finally {
            setIsGeneratingReport(false);
        }
    };

    return (
        <div className="space-y-6 animate-fade-in pb-12">
            {/* Header Banner */}
            <div className="p-6 rounded-3xl bg-gradient-to-br from-indigo-900 via-brand-900 to-slate-900 text-white shadow-xl relative overflow-hidden">
                <div className="absolute right-0 top-0 w-80 h-80 bg-brand-500/10 rounded-full blur-3xl pointer-events-none" />
                <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="space-y-2">
                        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-brand-500/20 text-brand-300 text-xs font-bold uppercase tracking-wider border border-brand-400/30">
                            <Sparkles className="w-3.5 h-3.5" />
                            AI Predictive Intelligence • Roadmap Q3
                        </div>
                        <h2 className="text-2xl font-bold text-white tracking-tight">
                            Prediksi & Sistem Peringatan Dini Siswa
                        </h2>
                        <p className="text-sm text-slate-300 max-w-2xl leading-relaxed">
                            Menganalisis multi-faktor (kehadiran, tren nilai, kedisiplinan, & tugas) untuk mendeteksi risiko sedini mungkin serta menyusun rekomendasi intervensi terarah.
                        </p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                        <Button
                            onClick={handleGenerateClassReport}
                            className="bg-brand-500 hover:bg-brand-600 text-white shadow-lg hover:shadow-brand-500/25 px-4 py-2.5 rounded-2xl gap-2 font-semibold min-h-[44px]"
                        >
                            <BrainCircuit className="w-4 h-4" />
                            Buat Narasi Laporan Kelas
                        </Button>
                    </div>
                </div>
            </div>

            {/* Quick Metrics Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* 1. High Risk */}
                <Card className="border-0 shadow-md bg-white dark:bg-slate-900 border-l-4 border-l-rose-500">
                    <CardContent className="p-5">
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-xs font-bold uppercase tracking-wider text-rose-600 dark:text-rose-400">
                                Peringatan Kritis
                            </span>
                            <div className="p-2 rounded-xl bg-rose-100 dark:bg-rose-950/50 text-rose-600">
                                <ShieldAlert className="w-5 h-5" />
                            </div>
                        </div>
                        <p className="text-3xl font-extrabold text-slate-900 dark:text-white">
                            {highRiskStudents.length} <span className="text-sm font-normal text-slate-500">Siswa</span>
                        </p>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                            Memerlukan intervensi segera (SRI &ge; 55)
                        </p>
                    </CardContent>
                </Card>

                {/* 2. Medium Risk (Watchlist) */}
                <Card className="border-0 shadow-md bg-white dark:bg-slate-900 border-l-4 border-l-amber-500">
                    <CardContent className="p-5">
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-xs font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400">
                                Pengawasan (Watchlist)
                            </span>
                            <div className="p-2 rounded-xl bg-amber-100 dark:bg-amber-950/50 text-amber-600">
                                <AlertTriangle className="w-5 h-5" />
                            </div>
                        </div>
                        <p className="text-3xl font-extrabold text-slate-900 dark:text-white">
                            {mediumRiskStudents.length} <span className="text-sm font-normal text-slate-500">Siswa</span>
                        </p>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                            Indikasi awal penurunan performa (SRI 28-54)
                        </p>
                    </CardContent>
                </Card>

                {/* 3. Most Vulnerable Day */}
                <Card className="border-0 shadow-md bg-white dark:bg-slate-900 border-l-4 border-l-blue-500">
                    <CardContent className="p-5">
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-xs font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400">
                                Hari Rawan Absensi
                            </span>
                            <div className="p-2 rounded-xl bg-blue-100 dark:bg-blue-950/50 text-blue-600">
                                <Calendar className="w-5 h-5" />
                            </div>
                        </div>
                        <p className="text-lg font-bold text-slate-900 dark:text-white truncate">
                            {attendancePatterns.mostVulnerableDay || 'Tidak Terdeteksi'}
                        </p>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                            {attendancePatterns.recentSpikeDetected ? '⚠️ Lonjakan absensi terdeteksi' : 'Pola absensi dalam batas wajar'}
                        </p>
                    </CardContent>
                </Card>

                {/* 4. Safe / Optimal */}
                <Card className="border-0 shadow-md bg-white dark:bg-slate-900 border-l-4 border-l-emerald-500">
                    <CardContent className="p-5">
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-xs font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
                                Kondisi Stabil & Optimal
                            </span>
                            <div className="p-2 rounded-xl bg-emerald-100 dark:bg-emerald-950/50 text-emerald-600">
                                <CheckCircle2 className="w-5 h-5" />
                            </div>
                        </div>
                        <p className="text-3xl font-extrabold text-slate-900 dark:text-white">
                            {lowRiskStudents.length} <span className="text-sm font-normal text-slate-500">Siswa</span>
                        </p>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                            {students.length > 0 ? `${Math.round((lowRiskStudents.length / students.length) * 100)}% dari total kelas` : 'Belum ada data'}
                        </p>
                    </CardContent>
                </Card>
            </div>

            {/* Main Risk Matrix Section */}
            <Card className="bg-white dark:bg-slate-900 border-0 shadow-lg overflow-hidden rounded-3xl">
                <CardHeader className="p-6 border-b border-slate-100 dark:border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <CardTitle className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                            <Users className="w-5 h-5 text-brand-500" />
                            Matriks Risiko & Indikator Siswa ({currentClassName})
                        </CardTitle>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                            Skor dihitung otomatis berdasarkan kombinasi absensi, penurunan nilai, poin pelanggaran, dan tugas.
                        </p>
                    </div>

                    {/* Filter Chips & Search */}
                    <div className="flex flex-wrap items-center gap-2">
                        <div className="relative">
                            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                            <input
                                type="text"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                placeholder="Cari nama siswa..."
                                className="pl-9 pr-3 py-1.5 text-xs rounded-xl bg-slate-100 dark:bg-slate-800 border-0 text-slate-800 dark:text-slate-200 placeholder-slate-400 focus:ring-2 focus:ring-brand-500 outline-none w-44"
                            />
                        </div>
                        <div className="flex rounded-xl bg-slate-100 dark:bg-slate-800 p-1">
                            {(['all', 'high', 'medium', 'low'] as const).map((lvl) => (
                                <button
                                    key={lvl}
                                    type="button"
                                    onClick={() => setRiskFilter(lvl)}
                                    className={`px-3 py-1 text-xs font-semibold rounded-lg transition-all ${
                                        riskFilter === lvl
                                            ? 'bg-white dark:bg-slate-700 text-brand-600 dark:text-brand-300 shadow-xs'
                                            : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                                    }`}
                                >
                                    {lvl === 'all' && `Semua (${riskAssessments.length})`}
                                    {lvl === 'high' && `🔴 Tinggi (${highRiskStudents.length})`}
                                    {lvl === 'medium' && `🟡 Sedang (${mediumRiskStudents.length})`}
                                    {lvl === 'low' && `🟢 Rendah (${lowRiskStudents.length})`}
                                </button>
                            ))}
                        </div>
                    </div>
                </CardHeader>

                <CardContent className="p-0">
                    {filteredAssessments.length > 0 ? (
                        <div className="divide-y divide-slate-100 dark:divide-slate-800/60">
                            {filteredAssessments.map((assessment) => {
                                const isHigh = assessment.riskLevel === 'high';
                                const isMedium = assessment.riskLevel === 'medium';

                                return (
                                    <div
                                        key={assessment.student.id}
                                        className="p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4 hover:bg-slate-50/80 dark:hover:bg-slate-800/30 transition-colors"
                                    >
                                        {/* Left: Student info & Risk gauge */}
                                        <div className="flex items-start gap-4 min-w-0 flex-1">
                                            {/* Circular Risk Score */}
                                            <div
                                                className={`w-14 h-14 shrink-0 rounded-2xl flex flex-col items-center justify-center font-extrabold border-2 shadow-sm ${
                                                    isHigh
                                                        ? 'bg-rose-50 border-rose-300 text-rose-700 dark:bg-rose-950/40 dark:border-rose-800 dark:text-rose-300'
                                                        : isMedium
                                                        ? 'bg-amber-50 border-amber-300 text-amber-700 dark:bg-amber-950/40 dark:border-amber-800 dark:text-amber-300'
                                                        : 'bg-emerald-50 border-emerald-300 text-emerald-700 dark:bg-emerald-950/40 dark:border-emerald-800 dark:text-emerald-300'
                                                }`}
                                            >
                                                <span className="text-base leading-none">{assessment.riskScore}</span>
                                                <span className="text-[9px] uppercase tracking-tighter opacity-80 mt-0.5">SRI</span>
                                            </div>

                                            {/* Details & Factors */}
                                            <div className="min-w-0 flex-1">
                                                <div className="flex items-center gap-2 flex-wrap">
                                                    <h4 className="font-bold text-slate-900 dark:text-white text-base">
                                                        {assessment.student.name}
                                                    </h4>
                                                    <span
                                                        className={`px-2.5 py-0.5 text-[11px] font-bold rounded-full uppercase tracking-wider ${
                                                            isHigh
                                                                ? 'bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300'
                                                                : isMedium
                                                                ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300'
                                                                : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300'
                                                        }`}
                                                    >
                                                        Risiko {assessment.riskLevel}
                                                    </span>
                                                    {assessment.predictedTrend === 'critical' && (
                                                        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/40 px-2 py-0.5 rounded-md">
                                                            <TrendingDown className="w-3 h-3" /> Tren Kritis
                                                        </span>
                                                    )}
                                                    {assessment.predictedTrend === 'improving' && (
                                                        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded-md">
                                                            <TrendingUp className="w-3 h-3" /> Membaik
                                                        </span>
                                                    )}
                                                </div>

                                                {/* Metrics summary */}
                                                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-2 text-xs text-slate-600 dark:text-slate-400">
                                                    <span>Kehadiran: <strong>{assessment.metrics.attendanceRate}%</strong> ({assessment.metrics.recentAlphaCount} alpha)</span>
                                                    <span>Rata Nilai: <strong>{assessment.metrics.recentGradeAvg ?? '-'}</strong></span>
                                                    {assessment.metrics.gradeDropPoints > 0 && (
                                                        <span className="text-rose-600 dark:text-rose-400 font-semibold">
                                                            Drop: -{assessment.metrics.gradeDropPoints} poin
                                                        </span>
                                                    )}
                                                    {assessment.metrics.violationPoints > 0 && (
                                                        <span className="text-amber-600 dark:text-amber-400 font-semibold">
                                                            Pelanggaran: {assessment.metrics.violationPoints} poin
                                                        </span>
                                                    )}
                                                </div>

                                                {/* Risk Factors Chips */}
                                                {assessment.factors.length > 0 && (
                                                    <div className="mt-2.5 flex flex-wrap gap-1.5">
                                                        {assessment.factors.map((f, i) => (
                                                            <span
                                                                key={i}
                                                                className={`px-2 py-0.5 rounded-lg text-[11px] font-medium border ${
                                                                    f.severity === 'high'
                                                                        ? 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/30 dark:text-rose-300 dark:border-rose-900/40'
                                                                        : 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/30 dark:text-amber-300 dark:border-amber-900/40'
                                                                }`}
                                                            >
                                                                {f.title}: {f.description}
                                                            </span>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                        </div>

                                        {/* Right: Actions */}
                                        <div className="flex items-center gap-2 shrink-0 self-end lg:self-center">
                                            <Button
                                                size="sm"
                                                variant="outline"
                                                onClick={() => (window.location.href = `/siswa/${assessment.student.id}`)}
                                                className="text-xs min-h-[40px] sm:min-h-0"
                                            >
                                                Profil Siswa
                                            </Button>
                                            <Button
                                                size="sm"
                                                onClick={() => handleOpenIntervention(assessment)}
                                                className={`text-xs gap-1.5 min-h-[40px] sm:min-h-0 ${
                                                    isHigh
                                                        ? 'bg-rose-600 hover:bg-rose-700 text-white shadow-xs'
                                                        : 'bg-brand-600 hover:bg-brand-700 text-white shadow-xs'
                                                }`}
                                            >
                                                <Sparkles className="w-3.5 h-3.5" />
                                                Rencana Intervensi AI
                                            </Button>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    ) : (
                        <div className="p-12 text-center text-slate-500 dark:text-slate-400">
                            Tidak ada siswa yang sesuai dengan filter ini.
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Bottom Row: Attendance Anomaly & Academic Projections */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* 1. Day of Week Attendance Pattern */}
                <Card className="bg-white dark:bg-slate-900 border-0 shadow-lg rounded-3xl">
                    <CardHeader className="p-6 border-b border-slate-100 dark:border-slate-800">
                        <CardTitle className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                            <Calendar className="w-5 h-5 text-blue-500" />
                            Pola Ketidakhadiran per Hari
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="p-6">
                        <div className="space-y-3">
                            {attendancePatterns.dayPatterns.map((dp) => (
                                <div key={dp.dayName} className="space-y-1">
                                    <div className="flex items-center justify-between text-xs font-semibold">
                                        <span className="text-slate-700 dark:text-slate-200">{dp.dayName}</span>
                                        <span className={dp.isHighRisk ? 'text-rose-600 font-bold' : 'text-slate-500'}>
                                            {dp.absentRate}% ketidakhadiran ({dp.absentCount}/{dp.totalSessions})
                                        </span>
                                    </div>
                                    <div className="w-full h-2.5 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                                        <div
                                            className={`h-full rounded-full transition-all ${
                                                dp.isHighRisk ? 'bg-rose-500' : dp.absentRate >= 15 ? 'bg-amber-500' : 'bg-brand-500'
                                            }`}
                                            style={{ width: `${Math.min(100, dp.absentRate)}%` }}
                                        />
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* Consecutive Absences Alert */}
                        {attendancePatterns.consecutiveAbsenceAlerts.length > 0 && (
                            <div className="mt-6 p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/40">
                                <h4 className="text-xs font-bold text-amber-800 dark:text-amber-300 flex items-center gap-1.5">
                                    <AlertTriangle className="w-4 h-4 text-amber-600" />
                                    Peringatan Absen Berturut-turut (&ge; 3 Hari)
                                </h4>
                                <ul className="mt-2 space-y-1 text-xs text-amber-900 dark:text-amber-200">
                                    {attendancePatterns.consecutiveAbsenceAlerts.slice(0, 4).map((alert, i) => (
                                        <li key={i} className="flex justify-between items-center">
                                            <span>{alert.student.name}</span>
                                            <span className="font-semibold">{alert.consecutiveDays} hari berturut-turut</span>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* 2. Academic Performance Forecast vs KKTP */}
                <Card className="bg-white dark:bg-slate-900 border-0 shadow-lg rounded-3xl">
                    <CardHeader className="p-6 border-b border-slate-100 dark:border-slate-800">
                        <CardTitle className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                            <TrendingDown className="w-5 h-5 text-indigo-500" />
                            Proyeksi Capaian vs Target KKTP ({kktpThreshold})
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="p-6">
                        <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
                            Proyeksi nilai akhir berdasarkan kemiringan regresi linier penilaian harian.
                        </p>
                        {academicForecasts.filter((f) => f.kktpRiskCount > 0).length > 0 ? (
                            <div className="space-y-3 max-h-80 overflow-y-auto pr-1">
                                {academicForecasts
                                    .filter((f) => f.kktpRiskCount > 0)
                                    .slice(0, 6)
                                    .map((f) => (
                                        <div
                                            key={f.student.id}
                                            className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800 flex items-center justify-between"
                                        >
                                            <div>
                                                <p className="text-sm font-bold text-slate-900 dark:text-white">
                                                    {f.student.name}
                                                </p>
                                                <div className="flex flex-wrap gap-1.5 mt-1">
                                                    {f.subjectForecasts
                                                        .filter((s) => s.status !== 'safe')
                                                        .map((s, idx) => (
                                                            <span
                                                                key={idx}
                                                                className={`text-[10px] font-semibold px-2 py-0.5 rounded-md ${
                                                                    s.status === 'critical'
                                                                        ? 'bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300'
                                                                        : 'bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300'
                                                                }`}
                                                            >
                                                                {s.subject}: Proyeksi {s.predictedScore} ({s.kktpGap} pts)
                                                            </span>
                                                        ))}
                                                </div>
                                            </div>
                                            <span className="text-xs font-bold text-rose-600 dark:text-rose-400 shrink-0 ml-2">
                                                {f.kktpRiskCount} Mapel Rawan
                                            </span>
                                        </div>
                                    ))}
                            </div>
                        ) : (
                            <div className="p-8 text-center text-slate-500 text-xs">
                                Seluruh siswa diproyeksikan aman memenuhi target KKTP.
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>

            {/* ================================================================= */}
            {/* MODAL 1: INTERVENTION PLAN */}
            {/* ================================================================= */}
            <Modal
                isOpen={isInterventionModalOpen}
                onClose={() => setIsInterventionModalOpen(false)}
                title={`Rencana Tindakan Intervensi: ${selectedAssessment?.student.name || ''}`}
                maxWidth="max-w-2xl"
                icon={<Sparkles className="w-5 h-5 text-brand-500" />}
            >
                <div className="space-y-5 p-1 max-h-[75vh] overflow-y-auto">
                    {isGeneratingIntervention ? (
                        <div className="py-12 flex flex-col items-center justify-center space-y-3 text-center">
                            <div className="w-10 h-10 border-4 border-brand-500 border-t-transparent rounded-full animate-spin" />
                            <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">
                                AI sedang menyusun strategi intervensi pedagogik & konseling...
                            </p>
                        </div>
                    ) : interventionPlan ? (
                        <div className="space-y-4">
                            {/* Summary Box */}
                            <div className="p-4 rounded-2xl bg-indigo-50 dark:bg-indigo-950/30 border border-indigo-200 dark:border-indigo-900/40">
                                <span className="text-[10px] font-extrabold uppercase tracking-wider text-indigo-700 dark:text-indigo-300">
                                    Diagnosis AI ({interventionPlan.generatedBy})
                                </span>
                                <p className="text-sm text-indigo-950 dark:text-indigo-100 font-medium mt-1">
                                    {interventionPlan.summary}
                                </p>
                            </div>

                            {/* Remedial Instructional */}
                            <div className="space-y-2">
                                <h4 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-1.5">
                                    <BookOpen className="w-4 h-4 text-brand-500" />
                                    Langkah Remedial & Pembelajaran
                                </h4>
                                <ul className="space-y-1.5 text-xs text-slate-700 dark:text-slate-300 list-disc list-inside">
                                    {interventionPlan.instructionalRemedial.map((item, i) => (
                                        <li key={i} className="leading-relaxed">{item}</li>
                                    ))}
                                </ul>
                            </div>

                            {/* Behavioral & Counseling */}
                            <div className="space-y-2">
                                <h4 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-1.5">
                                    <HelpCircle className="w-4 h-4 text-amber-500" />
                                    Pendekatan Afektif & Konseling BK
                                </h4>
                                <ul className="space-y-1.5 text-xs text-slate-700 dark:text-slate-300 list-disc list-inside">
                                    {interventionPlan.behavioralCounseling.map((item, i) => (
                                        <li key={i} className="leading-relaxed">{item}</li>
                                    ))}
                                </ul>
                            </div>

                            {/* Parent Communication Draft */}
                            <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                                <div className="flex items-center justify-between">
                                    <h4 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-1.5">
                                        <MessageSquare className="w-4 h-4 text-emerald-500" />
                                        Draft Pesan Komunikasi Wali Murid
                                    </h4>
                                    <Button
                                        size="sm"
                                        variant="outline"
                                        onClick={() => copyToClipboard(interventionPlan.parentCommunicationDraft, 'parent-draft')}
                                        className="text-xs gap-1.5 h-7 px-2.5"
                                    >
                                        {copiedKey === 'parent-draft' ? (
                                            <>
                                                <Check className="w-3.5 h-3.5 text-emerald-500" />
                                                Tersalin
                                            </>
                                        ) : (
                                            <>
                                                <Copy className="w-3.5 h-3.5" />
                                                Salin Pesan
                                            </>
                                        )}
                                    </Button>
                                </div>
                                <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60 text-xs text-slate-800 dark:text-slate-200 whitespace-pre-wrap font-mono leading-relaxed">
                                    {interventionPlan.parentCommunicationDraft}
                                </div>
                            </div>
                        </div>
                    ) : null}
                </div>
            </Modal>

            {/* ================================================================= */}
            {/* MODAL 2: CLASS NARRATIVE REPORT */}
            {/* ================================================================= */}
            <Modal
                isOpen={isReportModalOpen}
                onClose={() => setIsReportModalOpen(false)}
                title={classReport?.title || 'Laporan Narasi Kinerja Kelas'}
                maxWidth="max-w-3xl"
                icon={<BrainCircuit className="w-5 h-5 text-brand-500" />}
            >
                <div className="space-y-5 p-1 max-h-[75vh] overflow-y-auto">
                    {isGeneratingReport ? (
                        <div className="py-16 flex flex-col items-center justify-center space-y-3 text-center">
                            <div className="w-12 h-12 border-4 border-brand-500 border-t-transparent rounded-full animate-spin" />
                            <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">
                                AI sedang mengompilasi analisis narasi komprehensif untuk {currentClassName}...
                            </p>
                        </div>
                    ) : classReport ? (
                        <div className="space-y-5">
                            {/* Action Bar */}
                            <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-100 dark:bg-slate-800">
                                <span className="text-xs font-semibold text-slate-600 dark:text-slate-300">
                                    Dibuat: {new Date(classReport.generatedAt).toLocaleDateString('id-ID')} ({classReport.generatedBy})
                                </span>
                                <Button
                                    size="sm"
                                    onClick={() => {
                                        const fullText = `${classReport.title}\nPeriode: ${classReport.period}\n\nRINGKASAN EKSEKUTIF:\n${classReport.executiveSummary}\n\nPENCAPAIAN UTAMA:\n${classReport.keyAchievements.map((a) => `- ${a}`).join('\n')}\n\nISU KRUSIAL:\n${classReport.criticalConcerns.map((c) => `- ${c}`).join('\n')}\n\nREKOMENDASI TINDAKAN:\n${classReport.suggestedTeacherActions.map((t) => `- ${t}`).join('\n')}`;
                                        copyToClipboard(fullText, 'full-report');
                                    }}
                                    className="gap-1.5 text-xs bg-brand-600 hover:bg-brand-700 text-white"
                                >
                                    {copiedKey === 'full-report' ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                                    Salin Seluruh Laporan
                                </Button>
                            </div>

                            {/* Executive Summary */}
                            <div className="space-y-1.5">
                                <h4 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                                    Ringkasan Eksekutif
                                </h4>
                                <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed bg-slate-50 dark:bg-slate-800/40 p-4 rounded-2xl border border-slate-100 dark:border-slate-800">
                                    {classReport.executiveSummary}
                                </p>
                            </div>

                            {/* Key Achievements */}
                            <div className="space-y-2">
                                <h4 className="text-xs font-bold text-emerald-700 dark:text-emerald-400 uppercase tracking-wider flex items-center gap-1.5">
                                    <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                                    Pencapaian & Kekuatan Kelas
                                </h4>
                                <ul className="space-y-1 text-xs text-slate-700 dark:text-slate-300 list-disc list-inside">
                                    {classReport.keyAchievements.map((ach, i) => (
                                        <li key={i}>{ach}</li>
                                    ))}
                                </ul>
                            </div>

                            {/* Critical Concerns */}
                            <div className="space-y-2">
                                <h4 className="text-xs font-bold text-rose-700 dark:text-rose-400 uppercase tracking-wider flex items-center gap-1.5">
                                    <AlertTriangle className="w-4 h-4 text-rose-500" />
                                    Catatan Kritis & Area Perhatian
                                </h4>
                                <ul className="space-y-1 text-xs text-slate-700 dark:text-slate-300 list-disc list-inside">
                                    {classReport.criticalConcerns.map((con, i) => (
                                        <li key={i}>{con}</li>
                                    ))}
                                </ul>
                            </div>

                            {/* Suggested Teacher Actions */}
                            <div className="space-y-2">
                                <h4 className="text-xs font-bold text-brand-700 dark:text-brand-400 uppercase tracking-wider flex items-center gap-1.5">
                                    <ArrowRight className="w-4 h-4 text-brand-500" />
                                    Rekomendasi Tindakan Guru / Wali Kelas
                                </h4>
                                <ul className="space-y-1 text-xs text-slate-700 dark:text-slate-300 list-disc list-inside">
                                    {classReport.suggestedTeacherActions.map((act, i) => (
                                        <li key={i}>{act}</li>
                                    ))}
                                </ul>
                            </div>
                        </div>
                    ) : null}
                </div>
            </Modal>
        </div>
    );
};

export default PredictiveAnalyticsTab;
