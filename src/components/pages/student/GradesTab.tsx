import React, { useMemo, useState, useRef } from 'react';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '../../ui/Card';
import { Button } from '../../ui/Button';
import { PlusIcon, BarChartIcon, PencilIcon, TrashIcon, TrendingUpIcon, FilterIcon, DownloadIcon, TargetIcon, UsersIcon, LockIcon } from 'lucide-react';
import { AcademicRecordRow } from './types';
import { GradeTrendChart } from '../../ui/GradeTrendChart';
import { canModifyRecord } from '../../../utils/semesterUtils';
import { useUserSettings } from '../../../hooks/useUserSettings';

// Default KKM value - can be made configurable
const DEFAULT_KKM = 75;

interface GradesTabProps {
    records: AcademicRecordRow[];
    onAdd: () => void;
    onEdit: (record: AcademicRecordRow) => void;
    onDelete: (id: string) => void;
    isOnline: boolean;
    classAverages?: Record<string, number>; // Optional class averages for comparison
    kkm?: number; // Kriteria Ketuntasan Minimal
}

// Semester/Period filter options
type PeriodFilter = 'all' | 'semester1' | 'semester2' | 'thisMonth' | 'last3Months';

const PERIOD_OPTIONS: { value: PeriodFilter; label: string }[] = [
    { value: 'all', label: 'Semua Waktu' },
    { value: 'semester1', label: 'Semester 1 (Jul-Des)' },
    { value: 'semester2', label: 'Semester 2 (Jan-Jun)' },
    { value: 'thisMonth', label: 'Bulan Ini' },
    { value: 'last3Months', label: '3 Bulan Terakhir' },
];

// Helper function to filter records by period
const filterRecordsByPeriod = (records: AcademicRecordRow[], period: PeriodFilter): AcademicRecordRow[] => {
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    return records.filter(record => {
        const recordDate = new Date(record.created_at);
        const recordMonth = recordDate.getMonth();
        const recordYear = recordDate.getFullYear();

        switch (period) {
            case 'semester1':
                // July (6) to December (11)
                return recordMonth >= 6 && recordMonth <= 11;
            case 'semester2':
                // January (0) to June (5)
                return recordMonth >= 0 && recordMonth <= 5;
            case 'thisMonth':
                return recordMonth === currentMonth && recordYear === currentYear;
            case 'last3Months':
                const threeMonthsAgo = new Date(now);
                threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);
                return recordDate >= threeMonthsAgo;
            default:
                return true;
        }
    });
};

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
                            <div className="flex justify-between text-[10px] text-slate-400 mt-0.5">
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

    return (
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3 mb-6">
            <div className="p-3 rounded-xl bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800/30">
                <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">{stats.avg}</p>
                <p className="text-xs text-blue-500">Rata-rata</p>
            </div>
            <div className="p-3 rounded-xl bg-green-50 dark:bg-green-900/20 border border-green-100 dark:border-green-800/30">
                <p className="text-2xl font-bold text-green-600 dark:text-green-400">{stats.max}</p>
                <p className="text-xs text-green-500">Tertinggi</p>
            </div>
            <div className="p-3 rounded-xl bg-orange-50 dark:bg-orange-900/20 border border-orange-100 dark:border-orange-800/30">
                <p className="text-2xl font-bold text-orange-600 dark:text-orange-400">{stats.min}</p>
                <p className="text-xs text-orange-500">Terendah</p>
            </div>
            <div className="p-3 rounded-xl bg-purple-50 dark:bg-purple-900/20 border border-purple-100 dark:border-purple-800/30">
                <p className="text-2xl font-bold text-purple-600 dark:text-purple-400">{stats.total}</p>
                <p className="text-xs text-purple-500">Total Nilai</p>
            </div>
            <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-100 dark:border-emerald-800/30">
                <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">{stats.tuntas}</p>
                <p className="text-xs text-emerald-500">Tuntas</p>
            </div>
            <div className="p-3 rounded-xl bg-cyan-50 dark:bg-cyan-900/20 border border-cyan-100 dark:border-cyan-800/30">
                <p className="text-2xl font-bold text-cyan-600 dark:text-cyan-400">{stats.tuntasPercent}%</p>
                <p className="text-xs text-cyan-500">Ketuntasan</p>
            </div>
        </div>
    );
};

const GradesPanel: React.FC<{
    records: AcademicRecordRow[],
    onEdit: (record: AcademicRecordRow) => void,
    onDelete: (recordId: string) => void,
    isOnline: boolean;
    kkm: number;
    isLocked?: boolean;
}> = ({ records, onEdit, onDelete, isOnline, kkm, isLocked = false }) => {
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
            <div className="flex flex-col items-center justify-center py-16 text-center text-gray-400">
                <BarChartIcon className="w-16 h-16 mb-4 text-gray-600" />
                <h4 className="text-lg font-semibold">Tidak Ada Data Nilai Mata Pelajaran</h4>
                <p className="text-sm">Nilai yang Anda tambahkan akan muncul di sini.</p>
            </div>
        );
    }

    const getScoreColorClasses = (score: number) => {
        if (score >= kkm) return { border: 'border-green-600/50', text: 'text-green-400', bg: 'bg-green-500/10' };
        if (score >= kkm - 15) return { border: 'border-yellow-600/50', text: 'text-yellow-400', bg: 'bg-yellow-500/10' };
        return { border: 'border-red-600/50', text: 'text-red-400', bg: 'bg-red-500/10' };
    };

    return (
        <div className="space-y-6">
            {subjects.map((subject) => {
                const subjectRecords = [...recordsBySubject[subject]].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
                const scores = subjectRecords.map(r => r.score);
                const averageScore = subjectRecords.length > 0 ? Math.round(scores.reduce((a, b) => a + b, 0) / subjectRecords.length) : 0;
                const prediction = predictFinalGrade(scores);
                const isAboveKkm = averageScore >= kkm;
                const avgColorClass = isAboveKkm ? 'text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/20' : averageScore >= kkm - 15 ? 'text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20' : 'text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-900/20';

                return (
                    <Card key={subject} className="bg-gray-50 dark:bg-black/20 overflow-hidden">
                        <CardHeader className="border-b border-gray-200 dark:border-white/10 bg-white dark:bg-slate-800/50">
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
                                <div className={`px-3 py-1.5 rounded-xl font-bold text-xl ${avgColorClass}`}>
                                    Ø {averageScore}
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent className="divide-y divide-gray-200 dark:divide-white/10 p-0">
                            {subjectRecords.map((record) => {
                                const colors = getScoreColorClasses(record.score);
                                return (
                                    <div key={record.id} className={`group relative p-4 hover:bg-gray-100 dark:hover:bg-white/5 ${colors.bg}`}>
                                        <div className="flex items-center gap-4">
                                            <div className={`flex-shrink-0 w-14 h-14 rounded-full flex items-center justify-center font-black text-2xl border-2 ${colors.border} ${colors.text} shadow-inner`}>
                                                {record.score}
                                            </div>
                                            <div className="flex-grow">
                                                <div className="flex items-center gap-2">
                                                    <h4 className="font-bold text-base text-gray-900 dark:text-white">{record.assessment_name || 'Penilaian'}</h4>
                                                    {record.score < kkm && (
                                                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400">
                                                            Remidi
                                                        </span>
                                                    )}
                                                </div>
                                                <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">
                                                    {new Date(record.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}
                                                </p>
                                                {record.notes && <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 italic">"{record.notes}"</p>}
                                            </div>
                                        </div>
                                        <div className="absolute top-3 right-3 flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                                            {(() => {
                                                const canModify = canModifyRecord(record.created_at, isLocked);
                                                return (
                                                    <>
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            className="h-8 w-8 bg-gray-200 dark:bg-black/30 backdrop-blur-sm"
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
                                                            className="h-8 w-8 text-red-500 dark:text-red-400 hover:text-red-600 dark:hover:text-red-300 bg-gray-200 dark:bg-black/30 backdrop-blur-sm"
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
    classAverages,
    kkm = DEFAULT_KKM
}) => {
    const [periodFilter, setPeriodFilter] = useState<PeriodFilter>('all');
    const [selectedSubject, setSelectedSubject] = useState<string>('all');
    const { isSemester1Locked: semester1Locked } = useUserSettings();
    const chartRef = useRef<HTMLDivElement>(null);

    // Filter records based on selected period
    const filteredRecords = useMemo(() => {
        return filterRecordsByPeriod(records, periodFilter);
    }, [records, periodFilter]);

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
            link.download = `grafik-nilai-${new Date().toISOString().split('T')[0]}.png`;
            link.href = canvas.toDataURL('image/png');
            link.click();
        } catch {
            alert('Fitur export memerlukan library html2canvas. Jalankan: npm install html2canvas');
        }
    };

    return (
        <div className="p-4 sm:p-6">
            {/* Header with filters */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
                <div>
                    <CardTitle className="flex items-center gap-2">
                        Nilai Akademik
                        <span className="text-sm font-normal px-2 py-0.5 rounded-full bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400">
                            KKM: {kkm}
                        </span>
                    </CardTitle>
                    <CardDescription>Daftar nilai sumatif atau formatif yang telah diinput.</CardDescription>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                    {/* Period Filter */}
                    <div className="relative">
                        <select
                            value={periodFilter}
                            onChange={(e) => setPeriodFilter(e.target.value as PeriodFilter)}
                            className="pl-8 pr-4 py-2 text-sm rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 appearance-none cursor-pointer"
                        >
                            {PERIOD_OPTIONS.map(opt => (
                                <option key={opt.value} value={opt.value}>{opt.label}</option>
                            ))}
                        </select>
                        <FilterIcon className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    </div>

                    {/* Export Button */}
                    <Button variant="outline" size="sm" onClick={handleExportChart} title="Export Chart">
                        <DownloadIcon className="w-4 h-4 mr-1" />
                        Export
                    </Button>

                    {/* Add Button */}
                    <Button onClick={onAdd} disabled={!isOnline} className="whitespace-nowrap">
                        <PlusIcon className="w-4 h-4 mr-2" />Tambah Nilai
                    </Button>
                </div>
            </div>

            {/* Summary Stats */}
            <GradesSummary records={filteredRecords} kkm={kkm} />

            {/* Period Info */}
            {periodFilter !== 'all' && (
                <div className="mb-4 p-3 rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800/30">
                    <p className="text-sm text-blue-600 dark:text-blue-400">
                        Menampilkan {filteredRecords.length} dari {records.length} nilai untuk periode: <strong>{PERIOD_OPTIONS.find(p => p.value === periodFilter)?.label}</strong>
                    </p>
                </div>
            )}

            {/* Trend Chart Section */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
                {/* Bar Chart with KKM */}
                <GradesChart
                    records={filteredRecords}
                    kkm={kkm}
                    classAverages={classAverages}
                    chartRef={chartRef}
                />

                {/* Trend Chart */}
                <GradeTrendChart
                    records={filteredRecords.map(r => ({
                        id: r.id,
                        subject: r.subject,
                        score: r.score,
                        assessment_name: r.assessment_name,
                        created_at: r.created_at
                    }))}
                />
            </div>

            {/* Detail Section */}
            <h3 className="text-lg font-bold mb-4 flex items-center gap-2 text-slate-800 dark:text-white">
                <div className="w-1 h-5 bg-indigo-500 rounded-full" />
                Detail Nilai per Mapel
            </h3>
            <GradesPanel
                records={filteredRecords}
                onEdit={onEdit}
                onDelete={onDelete}
                isOnline={isOnline}
                kkm={kkm}
                isLocked={semester1Locked}
            />
        </div>
    );
};
