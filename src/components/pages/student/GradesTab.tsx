import React, { useMemo, useRef, useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '../../ui/Card';
import { Button } from '../../ui/Button';
import { PlusIcon, BarChartIcon, PencilIcon, TrashIcon, TrendingUpIcon, DownloadIcon, TargetIcon, UsersIcon, LockIcon, ChevronDown, CheckCircle2, BookOpen, TrendingDown } from 'lucide-react';
import { AcademicRecordRow } from './types';
import { GradeTrendChart } from '../../ui/GradeTrendChart';
import { useSemester } from '../../../contexts/SemesterContext';
import { formatExportDate } from '../../../utils/exportFormatUtils';

// Default KKM value - can be made configurable
const DEFAULT_KKM = 75;

interface GradesTabProps {
    records: AcademicRecordRow[];
    onAdd: () => void;
    onEdit: (record: AcademicRecordRow) => void;
    onDelete: (id: string) => void;
    isOnline: boolean;
    currentUserId?: string;
    classAverages?: Record<string, number>; // Optional class averages for comparison
    kkm?: number; // Kriteria Ketuntasan Minimal
    semesterLabel?: string;
    canAdd?: boolean;
    canManageAllRecords?: boolean;
}

// Helper to predict final grade based on trend
const predictFinalGrade = (scores: number[]): number | null => {
    if (scores.length < 2) return null;

    // Simple linear regression
    const n = scores.length;
    const xMean = (n - 1) / 2;
    const yMean = scores.reduce((a, b) => a + b, 0) / n;

    let numerator = 0;
    let denominator = 0;

    scores.forEach((y, x) => {
        numerator += (x - xMean) * (y - yMean);
        denominator += (x - xMean) * (x - xMean);
    });

    if (denominator === 0) return Math.round(yMean);

    const slope = numerator / denominator;
    const intercept = yMean - slope * xMean;

    // Predict for next position
    const predicted = slope * n + intercept;
    return Math.min(100, Math.max(0, Math.round(predicted)));
};

// Chart component for visualizing average grades with KKM line
const GradesChart: React.FC<{
    records: AcademicRecordRow[];
    kkm: number;
    classAverages?: Record<string, number>;
    chartRef?: React.RefObject<HTMLDivElement>;
}> = ({ records, kkm, classAverages, chartRef }) => {
    const subjectAverages = useMemo(() => {
        if (!records || records.length === 0) return [];

        const grouped = records.reduce((acc, r) => {
            const subject = r.subject || 'Tanpa Mapel';
            if (!acc[subject]) {
                acc[subject] = { total: 0, count: 0, scores: [] };
            }
            acc[subject].total += r.score;
            acc[subject].count += 1;
            acc[subject].scores.push(r.score);
            return acc;
        }, {} as Record<string, { total: number; count: number; scores: number[] }>);

        return Object.entries(grouped)
            .map(([subject, data]) => ({
                subject,
                average: Math.round(data.total / data.count),
                count: data.count,
                prediction: predictFinalGrade(data.scores),
                classAverage: classAverages?.[subject] ?? null
            }))
            .sort((a, b) => a.subject.localeCompare(b.subject));
    }, [records, classAverages]);

    if (subjectAverages.length === 0) return null;

    const maxScore = 100;

    return (
        <div ref={chartRef} className="p-4 sm:p-6 bg-gradient-to-br from-indigo-50 to-purple-50 dark:from-indigo-900/20 dark:to-purple-900/20 rounded-2xl border border-indigo-100 dark:border-indigo-800/30">
            <h3 className="text-lg font-bold mb-4 flex items-center gap-2 text-slate-800 dark:text-white">
                <BarChartIcon className="w-5 h-5 text-indigo-500" />
                Grafik Rata-rata Nilai per Mapel
            </h3>
            <div className="space-y-4">
                {subjectAverages.map((item, index) => {
                    const percentage = (item.average / maxScore) * 100;
                    const kkmPercentage = (kkm / maxScore) * 100;
                    const isAboveKkm = item.average >= kkm;
                    const barColor = isAboveKkm ? 'bg-emerald-500' : item.average >= kkm - 15 ? 'bg-amber-500' : 'bg-rose-500';
                    const textColor = isAboveKkm ? 'text-emerald-600 dark:text-emerald-400' : item.average >= kkm - 15 ? 'text-amber-600 dark:text-amber-400' : 'text-rose-600 dark:text-rose-400';

                    return (
                        <div key={item.subject} className="group">
                            <div className="flex items-center justify-between mb-1">
                                <span className="text-sm font-medium text-slate-700 dark:text-slate-300 truncate max-w-[50%]">{item.subject}</span>
                                <div className="flex items-center gap-2">
                                    {/* Class Average Comparison */}
                                    {item.classAverage !== null && (
                                        <span className="text-xs text-slate-400 flex items-center gap-1" title="Rata-rata Kelas">
                                            <UsersIcon className="w-3 h-3" />
                                            {item.classAverage}
                                        </span>
                                    )}
                                    {/* Prediction */}
                                    {item.prediction !== null && (
                                        <span className="text-xs text-blue-500 flex items-center gap-1" title="Prediksi Nilai Akhir">
                                            <TrendingUpIcon className="w-3 h-3" />
                                            ~{item.prediction}
                                        </span>
                                    )}
                                    <span className={`text-sm font-bold ${textColor}`}>{item.average}</span>
                                </div>
                            </div>
                            <div className="relative h-4 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                                {/* KKM Line */}
                                <div
                                    className="absolute top-0 bottom-0 w-0.5 bg-red-500 z-10"
                                    style={{ left: `${kkmPercentage}%` }}
                                    title={`KKM: ${kkm}`}
                                />
                                {/* Grade Bar */}
                                <div
                                    className={`h-full ${barColor} rounded-full transition-all duration-700 ease-out`}
                                    style={{
                                        width: `${percentage}%`,
                                        animationDelay: `${index * 100}ms`
                                    }}
                                />
                            </div>
                            <div className="flex justify-between text-xxs text-slate-400 mt-0.5">
                                <span>{item.count} penilaian</span>
                                <span className="flex items-center gap-1">
                                    {isAboveKkm ? (
                                        <><TargetIcon className="w-3 h-3 text-emerald-500" /> Tuntas</>
                                    ) : item.average >= kkm - 15 ? (
                                        <><TargetIcon className="w-3 h-3 text-amber-500" /> Hampir Tuntas</>
                                    ) : (
                                        <><TargetIcon className="w-3 h-3 text-rose-500" /> Belum Tuntas</>
                                    )}
                                </span>
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Legend */}
            <div className="flex flex-wrap gap-4 mt-4 pt-4 border-t border-indigo-200 dark:border-indigo-700/30">
                <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-emerald-500" />
                    <span className="text-xs text-slate-600 dark:text-slate-400">≥{kkm} Tuntas</span>
                </div>
                <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-amber-500" />
                    <span className="text-xs text-slate-600 dark:text-slate-400">{kkm - 15}-{kkm - 1} Hampir</span>
                </div>
                <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-rose-500" />
                    <span className="text-xs text-slate-600 dark:text-slate-400">&lt;{kkm - 15} Belum Tuntas</span>
                </div>
                <div className="flex items-center gap-2">
                    <div className="w-0.5 h-3 bg-red-500" />
                    <span className="text-xs text-slate-600 dark:text-slate-400">KKM: {kkm}</span>
                </div>
            </div>
        </div>
    );
};

// Summary Stats Component
const GradesSummary: React.FC<{ records: AcademicRecordRow[]; kkm: number }> = ({ records, kkm }) => {
    const stats = useMemo(() => {
        if (records.length === 0) return null;

        const scores = records.map(r => r.score);
        const avg = Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);
        const max = Math.max(...scores);
        const min = Math.min(...scores);
        const tuntas = scores.filter(s => s >= kkm).length;
        const tuntasPercent = Math.round((tuntas / scores.length) * 100);

        return { avg, max, min, total: scores.length, tuntas, tuntasPercent };
    }, [records, kkm]);

    if (!stats) return null;

    const summaryItems = [
        { label: 'Rata-rata', value: stats.avg, badgeBg: 'bg-blue-600', icon: BarChartIcon },
        { label: 'Tertinggi', value: stats.max, badgeBg: 'bg-emerald-600', icon: TrendingUpIcon },
        { label: 'Terendah', value: stats.min, badgeBg: 'bg-amber-500', icon: TrendingDown },
        { label: 'Total Nilai', value: stats.total, badgeBg: 'bg-violet-600', icon: BookOpen },
        { label: 'Tuntas', value: stats.tuntas, badgeBg: 'bg-teal-600', icon: CheckCircle2 },
        { label: 'Ketuntasan', value: `${stats.tuntasPercent}%`, badgeBg: 'bg-sky-600', icon: TargetIcon },
    ];

    return (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mb-6">
            {summaryItems.map((item) => (
                <div
                    key={item.label}
                    className="bg-slate-50/80 dark:bg-slate-900/60 rounded-2xl border border-slate-200/80 dark:border-slate-700/60 p-3 sm:p-3.5 flex items-center gap-3 transition-all hover:border-slate-300 dark:hover:border-slate-600 shadow-xs"
                >
                    <div className={`w-10 h-10 sm:w-11 sm:h-11 rounded-xl flex items-center justify-center shrink-0 shadow-sm ${item.badgeBg}`}>
                        <item.icon className="w-5 h-5 text-white" strokeWidth={2.2} />
                    </div>
                    <div className="flex flex-col justify-center min-w-0">
                        <p className="text-base sm:text-lg font-bold text-slate-900 dark:text-white leading-tight truncate">
                            {item.value}
                        </p>
                        <p className="text-xs text-slate-500 dark:text-slate-400 font-medium truncate mt-0.5">
                            {item.label}
                        </p>
                    </div>
                </div>
            ))}
        </div>
    );
};

const GradesPanel: React.FC<{
    records: AcademicRecordRow[],
    onEdit: (record: AcademicRecordRow) => void,
    onDelete: (recordId: string) => void,
    isOnline: boolean;
    currentUserId?: string;
    kkm: number;
    semesterLabel?: string;
    canManageAllRecords?: boolean;
}> = ({ records, onEdit, onDelete, isOnline, currentUserId, kkm, semesterLabel, canManageAllRecords }) => {
    const { isLocked } = useSemester();
    const recordsBySubject = useMemo(() => {
        if (!records || records.length === 0) return {};
        return records.reduce((acc, record) => {
            const subject = record.subject || 'Tanpa Mapel';
            if (!acc[subject]) {
                acc[subject] = [];
            }
            acc[subject].push(record);
            return acc;
        }, {} as Record<string, AcademicRecordRow[]>);
    }, [records]);

    const subjects = Object.keys(recordsBySubject).sort();

    if (subjects.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center py-16 text-center">
                <div className="w-16 h-16 rounded-2xl bg-slate-100 dark:bg-slate-800/50 flex items-center justify-center mb-4">
                    <BarChartIcon className="w-8 h-8 text-slate-400 dark:text-slate-600" />
                </div>
                <h4 className="text-lg font-semibold text-slate-900 dark:text-white">Tidak Ada Data Nilai Mata Pelajaran</h4>
                <p className="text-sm text-slate-500 dark:text-slate-400">
                    Belum ada nilai untuk {semesterLabel || 'semester yang dipilih'}. Nilai yang Anda tambahkan akan muncul di sini.
                </p>
            </div>
        );
    }

    const getScoreColorClasses = (score: number) => {
        if (score >= kkm) return { border: 'border-emerald-200 dark:border-emerald-800/60', text: 'text-emerald-700 dark:text-emerald-300', badgeBg: 'bg-emerald-50 dark:bg-emerald-900/30', bg: 'hover:bg-emerald-50/40 dark:hover:bg-emerald-950/10' };
        if (score >= kkm - 15) return { border: 'border-amber-200 dark:border-amber-800/60', text: 'text-amber-700 dark:text-amber-300', badgeBg: 'bg-amber-50 dark:bg-amber-900/30', bg: 'hover:bg-amber-50/40 dark:hover:bg-amber-950/10' };
        return { border: 'border-rose-200 dark:border-rose-800/60', text: 'text-rose-700 dark:text-rose-300', badgeBg: 'bg-rose-50 dark:bg-rose-900/30', bg: 'hover:bg-rose-50/40 dark:hover:bg-rose-950/10' };
    };

    return (
        <div className="space-y-6">
            {subjects.map((subject) => {
                const subjectRecords = [...recordsBySubject[subject]].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
                const scores = subjectRecords.map(r => r.score);
                const averageScore = subjectRecords.length > 0 ? Math.round(scores.reduce((a, b) => a + b, 0) / subjectRecords.length) : 0;
                const prediction = predictFinalGrade(scores);
                const isAboveKkm = averageScore >= kkm;
                const avgColorClass = isAboveKkm ? 'text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200/60 dark:border-emerald-800/40' : averageScore >= kkm - 15 ? 'text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 border border-amber-200/60 dark:border-amber-800/40' : 'text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-900/20 border border-rose-200/60 dark:border-rose-800/40';

                return (
                    <Card key={subject} className="bg-white dark:bg-slate-900/40 border border-slate-200 dark:border-slate-800 overflow-hidden shadow-xs">
                        <CardHeader className="border-b border-slate-100 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/50">
                            <div className="flex justify-between items-center">
                                <div>
                                    <CardTitle>{subject}</CardTitle>
                                    <div className="flex items-center gap-3 mt-1">
                                        <p className="text-xs text-slate-500">{subjectRecords.length} penilaian</p>
                                        {prediction !== null && (
                                            <p className="text-xs text-blue-500 flex items-center gap-1">
                                                <TrendingUpIcon className="w-3 h-3" />
                                                Prediksi: {prediction}
                                            </p>
                                        )}
                                        <p className={`text-xs flex items-center gap-1 ${isAboveKkm ? 'text-emerald-500' : 'text-rose-500'}`}>
                                            <TargetIcon className="w-3 h-3" />
                                            {isAboveKkm ? 'Tuntas' : 'Belum Tuntas'}
                                        </p>
                                    </div>
                                </div>
                                <div className={`px-3 py-1.5 rounded-xl font-bold text-lg sm:text-xl ${avgColorClass}`}>
                                    Ø {averageScore}
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent className="divide-y divide-slate-100 dark:divide-slate-800/80 p-0">
                            {subjectRecords.map((record) => {
                                const colors = getScoreColorClasses(record.score);
                                return (
                                    <div key={record.id} className={`group relative p-4 transition-colors ${colors.bg}`}>
                                        <div className="flex items-center gap-4 pr-24 lg:pr-20">
                                            <div className={`flex-shrink-0 w-13 h-13 sm:w-14 sm:h-14 rounded-2xl flex items-center justify-center font-black text-xl sm:text-2xl border ${colors.border} ${colors.text} ${colors.badgeBg} shadow-xs`}>
                                                {record.score}
                                            </div>
                                            <div className="flex-grow">
                                                <div className="flex items-center gap-2">
                                                    <h4 className="font-bold text-base text-gray-900 dark:text-white">{record.assessment_name || 'Penilaian'}</h4>
                                                    {record.score < kkm && (
                                                        <span className="text-xxs px-1.5 py-0.5 rounded bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400">
                                                            Remidi
                                                        </span>
                                                    )}
                                                </div>
                                                <p className="text-xs text-gray-500 dark:text-gray-400 font-medium flex items-center gap-1.5">
                                                    <span>{new Date(record.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}</span>
                                                    {record.recorded_by_name && (
                                                        <>
                                                            <span>•</span>
                                                            <span className="text-emerald-600 dark:text-emerald-400 font-semibold bg-emerald-50 dark:bg-emerald-950/30 px-1.5 py-0.5 rounded-md text-xs">
                                                                Oleh: {record.recorded_by_name}
                                                            </span>
                                                        </>
                                                    )}
                                                </p>
                                                {record.notes && <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 italic">"{record.notes}"</p>}
                                            </div>
                                        </div>
                                        <div className="absolute top-2 right-2 flex items-center gap-1 sm:reveal-on-hover sm:opacity-0 sm:group-hover:opacity-100 sm:group-focus-within:opacity-100 transition-opacity">
                                            {(() => {
                                                const canModify = (record.user_id === currentUserId || canManageAllRecords) && !isLocked(record.semester_id || record.created_at);

                                                return (
                                                    <>
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            className="h-10 w-10 sm:h-9 sm:w-9 min-h-[40px] min-w-[40px] sm:min-h-[36px] sm:min-w-[36px] bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-xl focus-visible:ring-2 focus-visible:ring-emerald-500"
                                                            onClick={() => onEdit(record)}
                                                            aria-label={canModify ? "Edit Catatan Akademik" : "Semester Terkunci"}
                                                            disabled={!isOnline || !canModify}
                                                            title={!canModify ? 'Semester Terkunci' : 'Edit'}
                                                        >
                                                            {canModify ? <PencilIcon className="h-4 w-4" /> : <LockIcon className="h-4 w-4 text-amber-500" />}
                                                        </Button>
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            className="h-10 w-10 sm:h-9 sm:w-9 min-h-[40px] min-w-[40px] sm:min-h-[36px] sm:min-w-[36px] text-rose-600 dark:text-rose-400 hover:text-rose-700 dark:hover:text-rose-300 hover:bg-rose-50 dark:hover:bg-rose-950/40 bg-slate-100 dark:bg-slate-800 rounded-xl focus-visible:ring-2 focus-visible:ring-rose-500"
                                                            onClick={() => onDelete(record.id)}
                                                            aria-label={canModify ? "Hapus Catatan Akademik" : "Semester Terkunci"}
                                                            disabled={!isOnline || !canModify}
                                                            title={!canModify ? 'Semester Terkunci' : 'Hapus'}
                                                        >
                                                            <TrashIcon className="h-4 w-4" />
                                                        </Button>
                                                    </>
                                                );
                                            })()}
                                        </div>
                                    </div>
                                );
                            })}
                        </CardContent>
                    </Card>
                );
            })}
        </div>
    );
};

export const GradesTab: React.FC<GradesTabProps> = ({
    records,
    onAdd,
    onEdit,
    onDelete,
    isOnline,
    currentUserId,
    classAverages,
    kkm = DEFAULT_KKM,
    semesterLabel,
    canAdd = true,
    canManageAllRecords = false,
}) => {
    const chartRef = useRef<HTMLDivElement>(null);
    const [showCharts, setShowCharts] = useState(true);

    // Export chart as image
    const handleExportChart = async () => {
        if (!chartRef.current) return;

        try {
            // Use html2canvas if available, otherwise show message
            const html2canvas = (await import('html2canvas')).default;
            const canvas = await html2canvas(chartRef.current, {
                backgroundColor: '#1e293b',
                scale: 2
            });

            const link = document.createElement('a');
            link.download = `Grafik_Nilai_${formatExportDate()}.png`;
            link.href = canvas.toDataURL('image/png');
            link.click();
        } catch {
            alert('Fitur export memerlukan library html2canvas. Jalankan: npm install html2canvas');
        }
    };

    return (
        <div className="p-4 sm:p-6 space-y-6">
            {/* Header with filters */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-4 border-b border-slate-100 dark:border-slate-800/60">
                <div>
                    <CardTitle className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2.5">
                        Nilai Akademik
                        <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border border-emerald-200/60 dark:border-emerald-800/50">
                            KKM: {kkm}
                        </span>
                    </CardTitle>
                    <CardDescription className="mt-1 text-slate-500 dark:text-slate-400 text-sm">
                        Daftar nilai sumatif atau formatif yang telah diinput.
                    </CardDescription>
                </div>
                <div className="flex items-center gap-2.5 self-start sm:self-auto shrink-0">
                    {/* Export Button */}
                    <Button
                        variant="outline"
                        onClick={handleExportChart}
                        title="Export Chart"
                        className="h-10 px-3.5 bg-slate-100 dark:bg-slate-800/80 hover:bg-slate-200 dark:hover:bg-slate-700/80 text-slate-700 dark:text-slate-200 rounded-xl border border-slate-200/80 dark:border-slate-700/80 font-medium text-sm transition-all flex items-center gap-2"
                    >
                        <DownloadIcon className="w-4 h-4 text-slate-500 dark:text-slate-400" />
                        Export
                    </Button>

                    {/* Add Button */}
                    <Button
                        onClick={onAdd}
                        disabled={!isOnline || !canAdd}
                        className="h-10 px-4 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-medium rounded-xl shadow-sm transition-all flex items-center gap-2 text-sm whitespace-nowrap"
                    >
                        <PlusIcon className="w-4 h-4" />
                        Tambah Nilai
                    </Button>
                </div>
            </div>

            {/* Summary Stats */}
            <GradesSummary records={records} kkm={kkm} />

            {/* Trend Chart Section */}
            {records.length > 0 && (
                <div className="space-y-4">
                    <div className="flex items-center justify-between">
                        <h3 className="text-base font-bold text-slate-800 dark:text-white flex items-center gap-2">
                            <BarChartIcon className="w-4 h-4 text-indigo-500" />
                            Visualisasi & Tren Nilai
                        </h3>
                        <button
                            type="button"
                            onClick={() => setShowCharts(prev => !prev)}
                            className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/80 transition-colors shadow-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
                        >
                            <span>{showCharts ? 'Sembunyikan Grafik' : 'Tampilkan Grafik'}</span>
                            <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${showCharts ? 'rotate-180' : ''}`} />
                        </button>
                    </div>

                    {showCharts && (
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
                            {/* Bar Chart with KKM */}
                            <GradesChart
                                records={records}
                                kkm={kkm}
                                classAverages={classAverages}
                                chartRef={chartRef}
                            />

                            {/* Trend Chart */}
                            <GradeTrendChart
                                records={records.map(r => ({
                                    id: r.id,
                                    subject: r.subject,
                                    score: r.score,
                                    assessment_name: r.assessment_name,
                                    created_at: r.created_at
                                }))}
                            />
                        </div>
                    )}
                </div>
            )}

            {/* Detail Section */}
            <h3 className="text-lg font-bold mb-4 flex items-center gap-2 text-slate-800 dark:text-white">
                <div className="w-1 h-5 bg-indigo-500 rounded-full" />
                Detail Nilai per Mapel
            </h3>
            <GradesPanel
                records={records}
                onEdit={onEdit}
                onDelete={onDelete}
                isOnline={isOnline}
                currentUserId={currentUserId}
                kkm={kkm}
                semesterLabel={semesterLabel}
                canManageAllRecords={canManageAllRecords}
            />
        </div>
    );
};
