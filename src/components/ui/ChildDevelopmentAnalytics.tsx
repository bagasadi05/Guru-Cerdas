import React, { useMemo } from 'react';
import { BarChartIcon, TrendingUpIcon, TrendingDownIcon, MinusIcon, BookOpenIcon, CalendarIcon, ShieldAlertIcon, StarIcon, TargetIcon, SparklesIcon, AwardIcon, AlertTriangleIcon, CheckCircleIcon, ClockIcon } from '../Icons';

// ============================================
// TYPES
// ============================================

interface AcademicRecord {
    id: string;
    subject: string;
    score: number;
    assessment_name?: string | null;
    notes?: string;
}

interface AttendanceRecord {
    id: string;
    status: string;
    date: string;
}

interface Violation {
    id: string;
    description: string;
    points: number;
    date: string;
}

interface ChildAnalyticsProps {
    academicRecords: AcademicRecord[];
    attendanceRecords: AttendanceRecord[];
    violations: Violation[];
    studentName: string;
    className?: string;
}

// ============================================
// DONUT CHART COMPONENT
// ============================================

interface DonutChartProps {
    percentage: number;
    size?: number;
    strokeWidth?: number;
    colorClass?: string;
    label?: string;
    sublabel?: string;
}

const DonutChart: React.FC<DonutChartProps> = ({
    percentage,
    size = 120,
    strokeWidth = 12,
    colorClass = 'text-indigo-500',
    label,
    sublabel,
}) => {
    const radius = (size - strokeWidth) / 2;
    const circumference = 2 * Math.PI * radius;
    const strokeDashoffset = circumference - (percentage / 100) * circumference;

    return (
        <div className="flex flex-col items-center">
            <div className="relative" style={{ width: size, height: size }}>
                <svg className="transform -rotate-90" width={size} height={size}>
                    {/* Background circle */}
                    <circle
                        cx={size / 2}
                        cy={size / 2}
                        r={radius}
                        fill="transparent"
                        stroke="currentColor"
                        strokeWidth={strokeWidth}
                        className="text-slate-200 dark:text-slate-700"
                    />
                    {/* Progress circle */}
                    <circle
                        cx={size / 2}
                        cy={size / 2}
                        r={radius}
                        fill="transparent"
                        stroke="currentColor"
                        strokeWidth={strokeWidth}
                        strokeDasharray={circumference}
                        strokeDashoffset={strokeDashoffset}
                        strokeLinecap="round"
                        className={`${colorClass} transition-all duration-1000 ease-out`}
                    />
                </svg>
                {/* Center text */}
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-2xl font-bold text-slate-900 dark:text-white">{Math.round(percentage)}%</span>
                </div>
            </div>
            {label && <span className="mt-2 text-sm font-medium text-slate-700 dark:text-slate-300">{label}</span>}
            {sublabel && <span className="text-xs text-slate-500 dark:text-slate-400">{sublabel}</span>}
        </div>
    );
};

// ============================================
// INSIGHT CARD COMPONENT
// ============================================

interface InsightCardProps {
    icon: React.ElementType;
    title: string;
    description: string;
    variant: 'success' | 'warning' | 'danger' | 'info';
}

const InsightCard: React.FC<InsightCardProps> = ({ icon: Icon, title, description, variant }) => {
    const variantStyles = {
        success: 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-400',
        warning: 'bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800 text-amber-700 dark:text-amber-400',
        danger: 'bg-rose-50 dark:bg-rose-900/20 border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-400',
        info: 'bg-indigo-50 dark:bg-indigo-900/20 border-indigo-200 dark:border-indigo-800 text-indigo-700 dark:text-indigo-400',
    };

    const iconColors = {
        success: 'text-emerald-500',
        warning: 'text-amber-500',
        danger: 'text-rose-500',
        info: 'text-indigo-500',
    };

    return (
        <div className={`p-4 rounded-2xl border ${variantStyles[variant]} transition-all hover:scale-[1.02]`}>
            <div className="flex items-start gap-3">
                <div className={`flex-shrink-0 w-10 h-10 rounded-xl flex items-center justify-center bg-white/50 dark:bg-slate-800/50`}>
                    <Icon className={`w-5 h-5 ${iconColors[variant]}`} />
                </div>
                <div>
                    <h4 className="font-bold text-sm">{title}</h4>
                    <p className="text-xs mt-1 opacity-80">{description}</p>
                </div>
            </div>
        </div>
    );
};

// ============================================
// MINI BAR CHART COMPONENT
// ============================================

interface MiniBarChartProps {
    data: { label: string; value: number; max: number; color?: string }[];
}

const MiniBarChart: React.FC<MiniBarChartProps> = ({ data }) => (
    <div className="space-y-2">
        {data.map((item, index) => (
            <div key={index}>
                <div className="flex justify-between text-xs mb-1">
                    <span className="text-slate-600 dark:text-slate-400">{item.label}</span>
                    <span className="font-bold text-slate-900 dark:text-white">{item.value}</span>
                </div>
                <div className="h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                    <div
                        className={`h-full rounded-full transition-all duration-700 ${item.color || 'bg-indigo-500'}`}
                        style={{ width: `${Math.min((item.value / item.max) * 100, 100)}%` }}
                    />
                </div>
            </div>
        ))}
    </div>
);

// ============================================
// MAIN COMPONENT
// ============================================

export const ChildDevelopmentAnalytics: React.FC<ChildAnalyticsProps> = ({
    academicRecords,
    attendanceRecords,
    violations,
    studentName,
}) => {
    // Calculate academic statistics
    const academicStats = useMemo(() => {
        if (academicRecords.length === 0) {
            return { average: 0, highest: 0, lowest: 0, passRate: 0, trend: 'stable', subjectCount: 0 };
        }

        const scores = academicRecords.map(r => r.score);
        const average = Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);
        const highest = Math.max(...scores);
        const lowest = Math.min(...scores);
        const passCount = scores.filter(s => s >= 75).length;
        const passRate = Math.round((passCount / scores.length) * 100);

        // Calculate trend (simplified - compare recent vs older)
        const halfIdx = Math.floor(scores.length / 2);
        const recentAvg = scores.slice(halfIdx).reduce((a, b) => a + b, 0) / (scores.length - halfIdx) || 0;
        const olderAvg = scores.slice(0, halfIdx).reduce((a, b) => a + b, 0) / halfIdx || 0;
        const trend = recentAvg > olderAvg + 5 ? 'up' : recentAvg < olderAvg - 5 ? 'down' : 'stable';

        const subjects = new Set(academicRecords.map(r => r.subject));

        return { average, highest, lowest, passRate, trend, subjectCount: subjects.size };
    }, [academicRecords]);

    // Calculate attendance statistics
    const attendanceStats = useMemo(() => {
        if (attendanceRecords.length === 0) {
            return { total: 0, present: 0, absent: 0, late: 0, sick: 0, rate: 0 };
        }

        const present = attendanceRecords.filter(r => r.status === 'Hadir').length;
        const absent = attendanceRecords.filter(r => r.status === 'Alpa').length;
        const late = attendanceRecords.filter(r => r.status === 'Terlambat').length;
        const sick = attendanceRecords.filter(r => r.status === 'Sakit' || r.status === 'Izin').length;
        const rate = Math.round((present / attendanceRecords.length) * 100);

        return { total: attendanceRecords.length, present, absent, late, sick, rate };
    }, [attendanceRecords]);

    // Calculate behavior statistics
    const behaviorStats = useMemo(() => {
        const totalPoints = violations.reduce((sum, v) => sum + v.points, 0);
        const violationCount = violations.length;
        const maxPoints = 100; // Maximum acceptable violation points
        const behaviorScore = Math.max(0, 100 - totalPoints);

        return { totalPoints, violationCount, behaviorScore };
    }, [violations]);

    // Generate insights for parents
    const insights = useMemo(() => {
        const result: InsightCardProps[] = [];

        // Academic insights
        if (academicStats.passRate >= 80) {
            result.push({
                icon: AwardIcon,
                title: 'Prestasi Akademik Sangat Baik! 🌟',
                description: `${studentName} berhasil mencapai KKM di ${academicStats.passRate}% penilaian. Terus pertahankan!`,
                variant: 'success',
            });
        } else if (academicStats.passRate >= 60) {
            result.push({
                icon: TargetIcon,
                title: 'Akademik Perlu Perhatian',
                description: `${academicStats.passRate}% penilaian sudah tuntas. Pertimbangkan untuk diskusi dengan guru terkait strategi belajar.`,
                variant: 'warning',
            });
        } else if (academicRecords.length > 0) {
            result.push({
                icon: AlertTriangleIcon,
                title: 'Butuh Bimbingan Akademik',
                description: `Tingkat ketuntasan masih ${academicStats.passRate}%. Disarankan untuk konsultasi dengan wali kelas.`,
                variant: 'danger',
            });
        }

        // Attendance insights
        if (attendanceStats.rate >= 95) {
            result.push({
                icon: CheckCircleIcon,
                title: 'Kehadiran Sangat Baik! ✓',
                description: `Tingkat kehadiran ${attendanceStats.rate}% menunjukkan dedikasi yang tinggi terhadap pembelajaran.`,
                variant: 'success',
            });
        } else if (attendanceStats.absent > 3) {
            result.push({
                icon: ClockIcon,
                title: 'Perhatikan Kehadiran',
                description: `Tercatat ${attendanceStats.absent}x tidak hadir. Pantau kesehatan dan motivasi belajar anak.`,
                variant: 'warning',
            });
        }

        // Behavior insights
        if (behaviorStats.violationCount === 0) {
            result.push({
                icon: StarIcon,
                title: 'Perilaku Teladan! ⭐',
                description: `${studentName} menunjukkan perilaku yang sangat baik tanpa catatan pelanggaran.`,
                variant: 'success',
            });
        } else if (behaviorStats.totalPoints > 20) {
            result.push({
                icon: ShieldAlertIcon,
                title: 'Perlu Pembinaan Perilaku',
                description: `Tercatat ${behaviorStats.violationCount} pelanggaran (${behaviorStats.totalPoints} poin). Perlu komunikasi intensif.`,
                variant: 'danger',
            });
        }

        // Trend insight
        if (academicStats.trend === 'up') {
            result.push({
                icon: TrendingUpIcon,
                title: 'Tren Positif! 📈',
                description: 'Nilai menunjukkan peningkatan dari waktu ke waktu. Apresiasi kerja keras anak!',
                variant: 'info',
            });
        } else if (academicStats.trend === 'down') {
            result.push({
                icon: TrendingDownIcon,
                title: 'Tren Menurun',
                description: 'Nilai menunjukkan penurunan. Diskusikan kendala yang mungkin dialami anak.',
                variant: 'warning',
            });
        }

        return result;
    }, [academicStats, attendanceStats, behaviorStats, studentName]);

    // Subject breakdown for detailed analysis
    const subjectBreakdown = useMemo(() => {
        const breakdown: Record<string, { total: number; count: number; avg: number }> = {};
        academicRecords.forEach(r => {
            if (!breakdown[r.subject]) {
                breakdown[r.subject] = { total: 0, count: 0, avg: 0 };
            }
            breakdown[r.subject].total += r.score;
            breakdown[r.subject].count += 1;
        });

        return Object.entries(breakdown)
            .map(([subject, data]) => ({
                subject,
                avg: Math.round(data.total / data.count),
                count: data.count,
            }))
            .sort((a, b) => b.avg - a.avg);
    }, [academicRecords]);

    // Best and weakest subjects
    const bestSubject = subjectBreakdown[0];
    const weakestSubject = subjectBreakdown[subjectBreakdown.length - 1];

    return (
        <div className="space-y-6">
            {/* Section: Overview Donut Charts */}
            <div className="p-5 bg-gradient-to-br from-indigo-50/80 to-purple-50/80 dark:from-slate-800/50 dark:to-indigo-900/30 rounded-3xl border border-indigo-100 dark:border-indigo-800/30">
                <h3 className="text-lg font-bold mb-5 flex items-center gap-2 text-slate-800 dark:text-white">
                    <SparklesIcon className="w-5 h-5 text-indigo-500" />
                    Ringkasan Tumbuh Kembang
                </h3>

                <div className="grid grid-cols-3 gap-4 sm:gap-6">
                    <DonutChart
                        percentage={academicStats.passRate}
                        colorClass={academicStats.passRate >= 75 ? 'text-emerald-500' : academicStats.passRate >= 60 ? 'text-amber-500' : 'text-rose-500'}
                        label="Ketuntasan"
                        sublabel="Akademik"
                    />
                    <DonutChart
                        percentage={attendanceStats.rate}
                        colorClass={attendanceStats.rate >= 90 ? 'text-emerald-500' : attendanceStats.rate >= 75 ? 'text-amber-500' : 'text-rose-500'}
                        label="Kehadiran"
                        sublabel="Absensi"
                    />
                    <DonutChart
                        percentage={behaviorStats.behaviorScore}
                        colorClass={behaviorStats.behaviorScore >= 90 ? 'text-emerald-500' : behaviorStats.behaviorScore >= 70 ? 'text-amber-500' : 'text-rose-500'}
                        label="Perilaku"
                        sublabel="Skor"
                    />
                </div>
            </div>

            {/* Section: Parent Insights */}
            {insights.length > 0 && (
                <div className="space-y-3">
                    <h3 className="text-lg font-bold flex items-center gap-2 text-slate-800 dark:text-white">
                        <BookOpenIcon className="w-5 h-5 text-indigo-500" />
                        Catatan untuk Orang Tua
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {insights.map((insight, idx) => (
                            <InsightCard key={idx} {...insight} />
                        ))}
                    </div>
                </div>
            )}

            {/* Section: Academic Detail Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-4 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 text-white">
                    <p className="text-xs opacity-80">Rata-rata Nilai</p>
                    <p className="text-3xl font-bold mt-1">{academicStats.average}</p>
                    <div className="flex items-center gap-1 mt-2 text-xs">
                        {academicStats.trend === 'up' && <TrendingUpIcon className="w-4 h-4" />}
                        {academicStats.trend === 'down' && <TrendingDownIcon className="w-4 h-4" />}
                        {academicStats.trend === 'stable' && <MinusIcon className="w-4 h-4" />}
                        <span>{academicStats.trend === 'up' ? 'Naik' : academicStats.trend === 'down' ? 'Turun' : 'Stabil'}</span>
                    </div>
                </div>
                <div className="p-4 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white">
                    <p className="text-xs opacity-80">Nilai Tertinggi</p>
                    <p className="text-3xl font-bold mt-1">{academicStats.highest}</p>
                    {bestSubject && <p className="text-xs mt-2 opacity-80">{bestSubject.subject}</p>}
                </div>
                <div className="p-4 rounded-2xl bg-gradient-to-br from-amber-500 to-orange-600 text-white">
                    <p className="text-xs opacity-80">Nilai Terendah</p>
                    <p className="text-3xl font-bold mt-1">{academicStats.lowest}</p>
                    {weakestSubject && <p className="text-xs mt-2 opacity-80">{weakestSubject.subject}</p>}
                </div>
                <div className="p-4 rounded-2xl bg-gradient-to-br from-rose-500 to-pink-600 text-white">
                    <p className="text-xs opacity-80">Total Penilaian</p>
                    <p className="text-3xl font-bold mt-1">{academicRecords.length}</p>
                    <p className="text-xs mt-2 opacity-80">{academicStats.subjectCount} mata pelajaran</p>
                </div>
            </div>

            {/* Section: Attendance Breakdown */}
            <div className="p-5 bg-white dark:bg-slate-800/50 rounded-2xl border border-slate-200 dark:border-slate-700">
                <h3 className="text-lg font-bold mb-4 flex items-center gap-2 text-slate-800 dark:text-white">
                    <CalendarIcon className="w-5 h-5 text-indigo-500" />
                    Detail Kehadiran
                </h3>
                <MiniBarChart
                    data={[
                        { label: 'Hadir', value: attendanceStats.present, max: attendanceStats.total, color: 'bg-emerald-500' },
                        { label: 'Sakit/Izin', value: attendanceStats.sick, max: attendanceStats.total, color: 'bg-amber-500' },
                        { label: 'Tidak Hadir', value: attendanceStats.absent, max: attendanceStats.total, color: 'bg-rose-500' },
                        { label: 'Terlambat', value: attendanceStats.late, max: attendanceStats.total, color: 'bg-slate-400' },
                    ]}
                />
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-4 text-center">
                    Total {attendanceStats.total} hari tercatat
                </p>
            </div>

            {/* Section: Subject Performance */}
            {subjectBreakdown.length > 0 && (
                <div className="p-5 bg-white dark:bg-slate-800/50 rounded-2xl border border-slate-200 dark:border-slate-700">
                    <h3 className="text-lg font-bold mb-4 flex items-center gap-2 text-slate-800 dark:text-white">
                        <BarChartIcon className="w-5 h-5 text-indigo-500" />
                        Performa per Mata Pelajaran
                    </h3>
                    <div className="space-y-3">
                        {subjectBreakdown.slice(0, 6).map((subject, idx) => {
                            const colorClass = subject.avg >= 75 ? 'bg-emerald-500' : subject.avg >= 60 ? 'bg-amber-500' : 'bg-rose-500';
                            return (
                                <div key={idx} className="flex items-center gap-3">
                                    <span className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold text-white ${colorClass}`}>
                                        {idx + 1}
                                    </span>
                                    <div className="flex-1">
                                        <div className="flex justify-between">
                                            <span className="text-sm font-medium text-slate-700 dark:text-slate-300">{subject.subject}</span>
                                            <span className="text-sm font-bold text-slate-900 dark:text-white">{subject.avg}</span>
                                        </div>
                                        <div className="h-2 bg-slate-200 dark:bg-slate-700 rounded-full mt-1 overflow-hidden">
                                            <div className={`h-full ${colorClass} rounded-full`} style={{ width: `${subject.avg}%` }} />
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}
        </div>
    );
};

export default ChildDevelopmentAnalytics;
