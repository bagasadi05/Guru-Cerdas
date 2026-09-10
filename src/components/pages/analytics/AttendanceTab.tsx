import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '../../ui/Card';
import { Button } from '../../ui/Button';
import { Input } from '../../ui/Input';
import {
    BarChart3Icon,
    PieChartIcon,
    AlertTriangle,
    CheckCircle2,
    Calendar,
    Users,
    ArrowRight,
    Search,
    MessageCircle,
    PhoneOff,
    Sparkles,
    ShieldAlert,
    ChevronLeft,
    ChevronRight
} from 'lucide-react';
import { DailyAttendance, AttendanceStats, StudentAttendanceSummary, AutoFillStats } from './types';
import { MissingWeekday } from '../../../services/attendanceAutoFillService';
import { createWhatsAppLink, generateAttendanceSummaryMessage } from '../../../utils/whatsappUtils';

export interface AttendanceTabProps {
    dailyAttendance: DailyAttendance[];
    attendanceStats: AttendanceStats;
    titleContext?: string;
    studentSummaries?: StudentAttendanceSummary[];
    autoFillStats?: AutoFillStats;
    missingWeekdays?: MissingWeekday[];
    selectedClassId?: string;
}

export const AttendanceTab: React.FC<AttendanceTabProps> = ({
    dailyAttendance,
    attendanceStats,
    titleContext,
    studentSummaries = [],
    autoFillStats,
    missingWeekdays = [],
}) => {
    const navigate = useNavigate();

    // Student list search & filter state
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState<'all' | 'at_risk' | 'has_alpha' | 'perfect'>('all');
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 15;

    // Filter students
    const filteredSummaries = useMemo(() => {
        return studentSummaries.filter(item => {
            const matchesSearch = item.student.name.toLowerCase().includes(searchTerm.toLowerCase().trim());
            if (!matchesSearch) return false;

            if (statusFilter === 'at_risk') return item.isAtRisk;
            if (statusFilter === 'has_alpha') return item.alpha > 0;
            if (statusFilter === 'perfect') return item.total > 0 && item.rate === 100;
            return true;
        });
    }, [studentSummaries, searchTerm, statusFilter]);

    // Reset page on filter or search change
    useEffect(() => {
        setCurrentPage(1);
    }, [searchTerm, statusFilter]);

    // Derived counts
    const atRiskCount = useMemo(() => studentSummaries.filter(s => s.isAtRisk).length, [studentSummaries]);
    const alphaCount = useMemo(() => studentSummaries.filter(s => s.alpha > 0).length, [studentSummaries]);
    const perfectCount = useMemo(() => studentSummaries.filter(s => s.total > 0 && s.rate === 100).length, [studentSummaries]);

    // Pagination
    const totalPages = Math.max(1, Math.ceil(filteredSummaries.length / itemsPerPage));
    const paginatedSummaries = useMemo(() => {
        const start = (currentPage - 1) * itemsPerPage;
        return filteredSummaries.slice(start, start + itemsPerPage);
    }, [filteredSummaries, currentPage, itemsPerPage]);

    // Chart Components
    const SimpleBarChart = ({ data, subtitle }: { data: DailyAttendance[]; subtitle?: string }) => {
        const maxTotal = Math.max(...data.map(d => d.total), 1);
        const chartHeight = typeof window !== 'undefined' && window.innerWidth < 640 ? 160 : 220;
        const barWidth = typeof window !== 'undefined' && window.innerWidth < 640 ? 8 : 12;
        const barGap = typeof window !== 'undefined' && window.innerWidth < 640 ? 3 : 6;

        const yAxisSteps = 4;
        const stepValue = Math.ceil(maxTotal / yAxisSteps);
        const yAxisLabels = Array.from({ length: yAxisSteps + 1 }, (_, i) => stepValue * (yAxisSteps - i));

        const labelInterval = data.length > 20 ? 5 : data.length > 10 ? 3 : 2;
        const [animated, setAnimated] = useState(false);
        useEffect(() => {
            const timer = setTimeout(() => setAnimated(true), 100);
            return () => clearTimeout(timer);
        }, []);

        return (
            <div className="relative" id="tour-charts">
                {subtitle && <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">{subtitle}</p>}
                
                <div className="flex flex-wrap items-center gap-2 sm:gap-4 text-xs sm:absolute sm:top-0 sm:right-0 mb-2 sm:mb-0">
                    <div className="flex items-center gap-1.5">
                        <div className="w-2.5 h-2.5 rounded-full bg-gradient-to-r from-emerald-400 to-emerald-500" />
                        <span className="text-slate-500 dark:text-slate-400">Hadir</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                        <div className="w-2.5 h-2.5 rounded-full bg-gradient-to-r from-orange-400 to-rose-400" />
                        <span className="text-slate-500 dark:text-slate-400">Tidak Hadir</span>
                    </div>
                </div>

                <div className="flex mt-4 sm:mt-8 overflow-hidden">
                    <div className="flex-shrink-0 flex flex-col justify-between pr-2 sm:pr-3 text-right" style={{ height: `${chartHeight}px` }}>
                        {yAxisLabels.map((val, i) => (
                            <span key={i} className="text-xxs text-slate-500 dark:text-slate-400 leading-none">{val}</span>
                        ))}
                    </div>

                    <div className="flex-1 relative overflow-hidden min-w-0">
                        <div className="absolute inset-0 flex flex-col justify-between pointer-events-none" style={{ height: `${chartHeight}px` }}>
                            {yAxisLabels.map((_, i) => (
                                <div key={i} className="w-full border-t border-slate-700/30 dark:border-slate-600/20" style={{ opacity: i === yAxisLabels.length - 1 ? 1 : 0.5 }} />
                            ))}
                        </div>

                        <div className="flex items-end relative z-10 overflow-x-auto pb-1 scrollbar-hide" style={{ height: `${chartHeight}px`, gap: `${barGap}px` }}>
                            {data.map((day, i) => {
                                const totalHeight = maxTotal > 0 ? (day.total / maxTotal) * chartHeight : 0;
                                const hadirHeight = day.total > 0 ? (day.hadir / day.total) * totalHeight : 0;
                                const tidakHadirHeight = totalHeight - hadirHeight;

                                return (
                                    <div key={i} className="flex flex-col items-center group relative" style={{ minWidth: `${barWidth}px` }}>
                                        <div className="relative flex flex-col-reverse overflow-hidden transition-all duration-700 ease-out"
                                            style={{ width: `${barWidth}px`, height: animated ? `${totalHeight}px` : '0px', borderRadius: '6px 6px 2px 2px' }}>
                                            <div className="w-full bg-emerald-500 transition-all duration-300" style={{ height: `${hadirHeight}px` }} />
                                            {tidakHadirHeight > 0 && (
                                                <div className="w-full bg-gradient-to-t from-orange-500 to-rose-400 transition-all duration-300" style={{ height: `${tidakHadirHeight}px` }} />
                                            )}
                                        </div>
                                        <div className="absolute bottom-full mb-3 hidden group-hover:block z-30 pointer-events-none animate-fade-in">
                                            <div className="bg-slate-900/95 backdrop-blur-sm text-white text-xs p-4 rounded-2xl shadow-2xl border border-slate-700/50 min-w-[180px]">
                                                <p className="font-bold text-sm text-white mb-2">{day.date}</p>
                                                <div className="space-y-1.5">
                                                    <div className="flex items-center justify-between"><span className="text-green-400">Hadir</span><span>{day.hadir}</span></div>
                                                    <div className="flex items-center justify-between"><span className="text-blue-400">Izin</span><span>{day.izin}</span></div>
                                                    <div className="flex items-center justify-between"><span className="text-amber-400">Sakit</span><span>{day.sakit}</span></div>
                                                    <div className="flex items-center justify-between"><span className="text-rose-400">Alpha</span><span>{day.alpha}</span></div>
                                                </div>
                                                <div className="mt-3 pt-2 border-t border-slate-700/50 flex justify-between"><span className="text-slate-400">Total</span><span>{day.total}</span></div>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                        <div className="flex justify-between mt-3" style={{ paddingRight: `${barGap}px` }}>
                            {data.map((day, i) => {
                                const showLabel = i % labelInterval === 0 || i === data.length - 1;
                                return (
                                    <div key={i} className="flex-1 text-center" style={{ minWidth: `${barWidth}px` }}>
                                        {showLabel && (
                                            <span className="text-xxs text-slate-500 whitespace-nowrap inline-block transform -rotate-30" style={{ transform: 'rotate(-30deg)' }}>
                                                {day.date.substring(5)}
                                            </span>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>
                
                {/* Summary stats below chart */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3 mt-4 sm:mt-6 pt-3 sm:pt-4 border-t border-slate-200 dark:border-slate-700/50">
                    <div className="text-center p-2 rounded-lg bg-green-500/10">
                        <p className="text-base sm:text-lg font-bold text-green-500">{data.reduce((sum, d) => sum + d.hadir, 0)}</p>
                        <p className="text-xxs sm:text-xxs text-slate-500 uppercase tracking-wide">Hadir</p>
                    </div>
                    <div className="text-center p-2 rounded-lg bg-blue-500/10">
                        <p className="text-base sm:text-lg font-bold text-blue-500">{data.reduce((sum, d) => sum + d.izin, 0)}</p>
                        <p className="text-xxs sm:text-xxs text-slate-500 uppercase tracking-wide">Izin</p>
                    </div>
                    <div className="text-center p-2 rounded-lg bg-amber-500/10">
                        <p className="text-base sm:text-lg font-bold text-amber-500">{data.reduce((sum, d) => sum + d.sakit, 0)}</p>
                        <p className="text-xxs sm:text-xxs text-slate-500 uppercase tracking-wide">Sakit</p>
                    </div>
                    <div className="text-center p-2 rounded-lg bg-rose-500/10">
                        <p className="text-base sm:text-lg font-bold text-rose-500">{data.reduce((sum, d) => sum + d.alpha, 0)}</p>
                        <p className="text-xxs sm:text-xxs text-slate-500 uppercase tracking-wide">Alpha</p>
                    </div>
                </div>
            </div>
        );
    };

    const SimplePieChart = ({ data }: { data: { label: string; value: number; color: string }[] }) => {
        const total = data.reduce((sum, d) => sum + d.value, 0);
        const gradientParts: string[] = [];
        let currentPercent = 0;

        data.forEach((item) => {
            const percent = total > 0 ? (item.value / total) * 100 : 0;
            if (percent > 0) {
                gradientParts.push(`${item.color} ${currentPercent}% ${currentPercent + percent}%`);
                currentPercent += percent;
            }
        });

        const conicGradient = gradientParts.length > 0 ? `conic-gradient(from 0deg, ${gradientParts.join(', ')})` : 'conic-gradient(from 0deg, #e2e8f0 0% 100%)';

        return (
            <div className="flex flex-col sm:flex-row items-center gap-8 justify-center">
                <div className="relative w-44 h-44 rounded-full flex items-center justify-center" style={{ background: conicGradient }}>
                    <div className="w-28 h-28 rounded-full bg-white/80 dark:bg-slate-900/60 backdrop-blur-xl flex flex-col items-center justify-center shadow-inner">
                        <span className="text-3xl font-bold text-slate-900 dark:text-white">{total}</span>
                        <span className="text-xxs text-slate-500">Total Absen</span>
                    </div>
                </div>
                <div className="flex-1 space-y-3 min-w-[200px]">
                    {data.map((item, i) => (
                        <div key={i} className="flex items-center justify-between p-2 rounded-lg bg-slate-50 dark:bg-slate-800/50">
                            <div className="flex items-center gap-3">
                                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }} />
                                <span className="text-sm font-medium text-slate-700 dark:text-slate-300">{item.label}</span>
                            </div>
                            <span className="font-bold text-slate-900 dark:text-white">{item.value}</span>
                        </div>
                    ))}
                </div>
            </div>
        );
    };

    return (
        <div className="space-y-6 animate-fade-in">
            {/* 1. Missing Weekdays Reminder Banner */}
            {missingWeekdays.length > 0 && (
                <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-transparent border border-amber-300 dark:border-amber-700/60 shadow-sm animate-fade-in">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div className="flex items-start gap-3.5">
                            <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0 mt-0.5">
                                <AlertTriangle className="w-5 h-5" />
                            </div>
                            <div className="space-y-1.5">
                                <div className="flex items-center gap-2 flex-wrap">
                                    <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white">
                                        Peringatan: Absensi Hari Kerja Belum Diisi Minggu Ini
                                    </h3>
                                    <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-200 text-amber-900 dark:bg-amber-900/60 dark:text-amber-200">
                                        {missingWeekdays.length} Hari Kosong
                                    </span>
                                </div>
                                <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300">
                                    Terdapat hari kerja yang belum memiliki catatan absensi sama sekali:
                                </p>
                                <div className="flex flex-wrap gap-2 pt-1">
                                    {missingWeekdays.map(d => (
                                        <span
                                            key={d.date}
                                            className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-semibold bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 border border-amber-300 dark:border-amber-700 shadow-xs"
                                        >
                                            <Calendar className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                                            {d.formattedDate}
                                        </span>
                                    ))}
                                </div>
                                <p className="text-xxs sm:text-xs text-slate-500 dark:text-slate-400 pt-1">
                                    💡 <em>Sistem otomatis mengisi kehadiran menjadi Hadir setiap Sabtu pukul 23:59 WIB. Anda disarankan mencatat siswa yang berhalangan (Sakit/Izin/Alpha) sebelum waktu tersebut.</em>
                                </p>
                            </div>
                        </div>
                        <Button
                            variant="primary"
                            size="sm"
                            onClick={() => navigate('/absensi')}
                            className="shrink-0 w-full md:w-auto bg-amber-600 hover:bg-amber-700 text-white font-semibold shadow-md gap-2"
                        >
                            <span>Buka Halaman Absensi</span>
                            <ArrowRight className="w-4 h-4" />
                        </Button>
                    </div>
                </div>
            )}

            {/* 2. KPI Summary Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* Tingkat Kehadiran */}
                <Card className="bg-white dark:bg-slate-900 border-slate-200/80 dark:border-slate-800 shadow-sm hover:shadow-md transition-shadow">
                    <CardContent className="p-4 sm:p-5">
                        <div className="flex items-center justify-between">
                            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                                Rata-rata Hadir
                            </span>
                            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                                <CheckCircle2 className="w-4 h-4" />
                            </div>
                        </div>
                        <div className="mt-2 flex items-baseline gap-2">
                            <span className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white">
                                {attendanceStats.hadirRate}%
                            </span>
                            <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                                attendanceStats.hadirRate >= 90
                                    ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                                    : attendanceStats.hadirRate >= 75
                                    ? 'bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300'
                                    : 'bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300'
                            }`}>
                                {attendanceStats.hadirRate >= 90 ? 'Baik' : attendanceStats.hadirRate >= 75 ? 'Cukup' : 'Kurang'}
                            </span>
                        </div>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                            {attendanceStats.hadir} hadir dari {attendanceStats.total} total catatan
                        </p>
                    </CardContent>
                </Card>

                {/* Siswa Perlu Perhatian */}
                <Card className="bg-white dark:bg-slate-900 border-slate-200/80 dark:border-slate-800 shadow-sm hover:shadow-md transition-shadow">
                    <CardContent className="p-4 sm:p-5">
                        <div className="flex items-center justify-between">
                            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                                Perlu Perhatian
                            </span>
                            <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                                atRiskCount > 0 
                                    ? 'bg-rose-500/10 text-rose-600 dark:text-rose-400' 
                                    : 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                            }`}>
                                <AlertTriangle className="w-4 h-4" />
                            </div>
                        </div>
                        <div className="mt-2 flex items-baseline gap-2">
                            <span className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white">
                                {atRiskCount}
                            </span>
                            <span className="text-xs text-slate-500 dark:text-slate-400">Siswa</span>
                            {atRiskCount > 0 && (
                                <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300">
                                    Alpha / &lt;85%
                                </span>
                            )}
                        </div>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                            {atRiskCount > 0 ? 'Siswa terancam kendala presensi' : 'Semua siswa terpantau tertib'}
                        </p>
                    </CardContent>
                </Card>

                {/* Absensi Otomatis vs Mandiri */}
                <Card className="bg-white dark:bg-slate-900 border-slate-200/80 dark:border-slate-800 shadow-sm hover:shadow-md transition-shadow">
                    <CardContent className="p-4 sm:p-5">
                        <div className="flex items-center justify-between">
                            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                                Auto-Fill Akhir Pekan
                            </span>
                            <div className="w-8 h-8 rounded-lg bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
                                <Sparkles className="w-4 h-4" />
                            </div>
                        </div>
                        <div className="mt-2 flex items-baseline gap-2">
                            <span className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white">
                                {autoFillStats?.autoFilledRecords || 0}
                            </span>
                            <span className="text-xs text-slate-500 dark:text-slate-400">
                                ({autoFillStats?.autoFillPercentage || 0}%)
                            </span>
                        </div>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                            {autoFillStats?.manualRecords || 0} diisi manual oleh guru
                        </p>
                    </CardContent>
                </Card>

                {/* Total Alpha */}
                <Card className="bg-white dark:bg-slate-900 border-slate-200/80 dark:border-slate-800 shadow-sm hover:shadow-md transition-shadow">
                    <CardContent className="p-4 sm:p-5">
                        <div className="flex items-center justify-between">
                            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                                Total Alpha
                            </span>
                            <div className="w-8 h-8 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center">
                                <ShieldAlert className="w-4 h-4" />
                            </div>
                        </div>
                        <div className="mt-2 flex items-baseline gap-2">
                            <span className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white">
                                {attendanceStats.alpha}
                            </span>
                            <span className="text-xs text-slate-500 dark:text-slate-400">Kali</span>
                        </div>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                            {attendanceStats.sakit} sakit, {attendanceStats.izin} izin
                        </p>
                    </CardContent>
                </Card>
            </div>

            {/* 3. Charts: Trend and Breakdown */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2">
                    <Card className="bg-white dark:bg-slate-900 border-slate-200/80 dark:border-slate-800 shadow-sm">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                                <BarChart3Icon className="w-5 h-5 text-brand-600" />
                                Tren Kehadiran
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            {dailyAttendance.length > 0 ? (
                                <SimpleBarChart data={dailyAttendance} subtitle={titleContext} />
                            ) : (
                                <div className="h-48 flex items-center justify-center text-slate-500 border-2 border-dashed border-slate-100 dark:border-slate-800 rounded-xl">
                                    Tidak ada data kehadiran pada periode ini
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </div>

                <div className="lg:col-span-1">
                    <Card className="bg-white dark:bg-slate-900 border-slate-200/80 dark:border-slate-800 shadow-sm">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                                <PieChartIcon className="w-5 h-5 text-brand-600" />
                                Proporsi Status
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            {attendanceStats.total > 0 ? (
                                <SimplePieChart
                                    data={[
                                        { label: 'Hadir', value: attendanceStats.hadir, color: '#22c55e' },
                                        { label: 'Izin', value: attendanceStats.izin, color: '#3b82f6' },
                                        { label: 'Sakit', value: attendanceStats.sakit, color: '#f59e0b' },
                                        { label: 'Alpha', value: attendanceStats.alpha, color: '#ef4444' },
                                    ]}
                                />
                            ) : (
                                <div className="h-48 flex items-center justify-center text-slate-500 border-2 border-dashed border-slate-100 dark:border-slate-800 rounded-xl">
                                    Belum ada rekap data
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </div>
            </div>

            {/* 4. Student Attendance Monitoring Table */}
            <Card className="bg-white dark:bg-slate-900 border-slate-200/80 dark:border-slate-800 shadow-sm">
                <CardHeader className="pb-4">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                        <div>
                            <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                                <Users className="w-5 h-5 text-brand-600" />
                                Monitoring Kehadiran Siswa {titleContext ? `(${titleContext})` : ''}
                            </CardTitle>
                            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
                                Pantau kehadiran siswa secara individual, identifikasi siswa berisiko, dan hubungi wali murid langsung via WhatsApp.
                            </p>
                        </div>
                    </div>

                    {/* Search & Filter Controls */}
                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-3">
                        <div className="relative flex-1 max-w-sm">
                            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                            <Input
                                value={searchTerm}
                                onChange={e => setSearchTerm(e.target.value)}
                                placeholder="Cari nama siswa..."
                                className="pl-9 h-10 text-sm"
                            />
                        </div>

                        {/* Filter Chips */}
                        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-hide">
                            <button
                                type="button"
                                onClick={() => setStatusFilter('all')}
                                className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
                                    statusFilter === 'all'
                                        ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-xs'
                                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700'
                                }`}
                            >
                                Semua ({studentSummaries.length})
                            </button>
                            <button
                                type="button"
                                onClick={() => setStatusFilter('at_risk')}
                                className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
                                    statusFilter === 'at_risk'
                                        ? 'bg-rose-600 text-white shadow-xs'
                                        : 'bg-rose-50 text-rose-700 hover:bg-rose-100 dark:bg-rose-950/40 dark:text-rose-300 dark:hover:bg-rose-900/60'
                                }`}
                            >
                                ⚠️ Perlu Perhatian ({atRiskCount})
                            </button>
                            <button
                                type="button"
                                onClick={() => setStatusFilter('has_alpha')}
                                className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
                                    statusFilter === 'has_alpha'
                                        ? 'bg-amber-600 text-white shadow-xs'
                                        : 'bg-amber-50 text-amber-700 hover:bg-amber-100 dark:bg-amber-950/40 dark:text-amber-300 dark:hover:bg-amber-900/60'
                                }`}
                            >
                                Ada Alpha ({alphaCount})
                            </button>
                            <button
                                type="button"
                                onClick={() => setStatusFilter('perfect')}
                                className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
                                    statusFilter === 'perfect'
                                        ? 'bg-emerald-600 text-white shadow-xs'
                                        : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100 dark:bg-emerald-950/40 dark:text-emerald-300 dark:hover:bg-emerald-900/60'
                                }`}
                            >
                                100% Hadir ({perfectCount})
                            </button>
                        </div>
                    </div>
                </CardHeader>

                <CardContent className="pt-0">
                    {filteredSummaries.length === 0 ? (
                        <div className="py-12 text-center text-slate-500 dark:text-slate-400 border border-dashed border-slate-200 dark:border-slate-800 rounded-xl">
                            <p className="text-sm font-medium">Tidak ada data siswa yang cocok dengan filter atau pencarian.</p>
                            {searchTerm && (
                                <button
                                    type="button"
                                    onClick={() => setSearchTerm('')}
                                    className="mt-2 text-xs font-semibold text-brand-600 hover:underline"
                                >
                                    Reset Pencarian
                                </button>
                            )}
                        </div>
                    ) : (
                        <>
                            {/* Desktop Table View */}
                            <div className="hidden md:block overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800">
                                <table className="w-full text-left border-collapse text-sm">
                                    <thead>
                                        <tr className="bg-slate-50 dark:bg-slate-800/60 text-slate-600 dark:text-slate-400 font-semibold border-b border-slate-200 dark:border-slate-800">
                                            <th className="py-3 px-4 w-12 text-center">No</th>
                                            <th className="py-3 px-4">Nama Siswa</th>
                                            <th className="py-3 px-3 text-center text-emerald-600 dark:text-emerald-400 font-bold">Hadir</th>
                                            <th className="py-3 px-3 text-center text-amber-600 dark:text-amber-400 font-bold">Sakit</th>
                                            <th className="py-3 px-3 text-center text-blue-600 dark:text-blue-400 font-bold">Izin</th>
                                            <th className="py-3 px-3 text-center text-rose-600 dark:text-rose-400 font-bold">Alpha</th>
                                            <th className="py-3 px-4 text-center">% Kehadiran</th>
                                            <th className="py-3 px-4 text-center">Status</th>
                                            <th className="py-3 px-4 text-right">Aksi</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                        {paginatedSummaries.map((item, index) => {
                                            const globalIndex = (currentPage - 1) * itemsPerPage + index + 1;
                                            const hasParentPhone = Boolean(item.student.parent_phone?.trim());

                                            return (
                                                <tr
                                                    key={item.student.id}
                                                    className={`transition-colors ${
                                                        item.isAtRisk
                                                            ? 'bg-rose-50/40 dark:bg-rose-950/20 hover:bg-rose-50/70 dark:hover:bg-rose-950/30'
                                                            : 'hover:bg-slate-50 dark:hover:bg-slate-800/40'
                                                    }`}
                                                >
                                                    <td className="py-3 px-4 text-center text-slate-400 font-mono text-xs">
                                                        {globalIndex}
                                                    </td>
                                                    <td className="py-3 px-4">
                                                        <div className="font-semibold text-slate-900 dark:text-white">
                                                            {item.student.name}
                                                        </div>
                                                        <div className="text-xxs text-slate-400">
                                                            {item.student.gender || 'Siswa'}
                                                        </div>
                                                    </td>
                                                    <td className="py-3 px-3 text-center font-semibold text-emerald-600 dark:text-emerald-400">
                                                        {item.hadir}
                                                    </td>
                                                    <td className="py-3 px-3 text-center font-semibold text-amber-600 dark:text-amber-400">
                                                        {item.sakit}
                                                    </td>
                                                    <td className="py-3 px-3 text-center font-semibold text-blue-600 dark:text-blue-400">
                                                        {item.izin}
                                                    </td>
                                                    <td className="py-3 px-3 text-center font-semibold text-rose-600 dark:text-rose-400">
                                                        {item.alpha}
                                                    </td>
                                                    <td className="py-3 px-4 text-center">
                                                        <div className="flex items-center justify-center gap-2">
                                                            <div className="w-16 h-2 rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden">
                                                                <div
                                                                    className={`h-full rounded-full ${
                                                                        item.rate >= 90
                                                                            ? 'bg-emerald-500'
                                                                            : item.rate >= 75
                                                                            ? 'bg-blue-500'
                                                                            : 'bg-rose-500'
                                                                    }`}
                                                                    style={{ width: `${item.rate}%` }}
                                                                />
                                                            </div>
                                                            <span className="font-bold text-xs text-slate-700 dark:text-slate-300">
                                                                {item.rate}%
                                                            </span>
                                                        </div>
                                                    </td>
                                                    <td className="py-3 px-4 text-center">
                                                        {item.isAtRisk ? (
                                                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300">
                                                                <AlertTriangle className="w-3 h-3" />
                                                                {item.alpha >= 2 ? `${item.alpha}x Alpha` : '< 85%'}
                                                            </span>
                                                        ) : item.total > 0 && item.rate === 100 ? (
                                                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300">
                                                                <CheckCircle2 className="w-3 h-3" />
                                                                100% Sempurna
                                                            </span>
                                                        ) : (
                                                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400">
                                                                Normal
                                                            </span>
                                                        )}
                                                    </td>
                                                    <td className="py-3 px-4 text-right">
                                                        {hasParentPhone ? (
                                                            <a
                                                                href={createWhatsAppLink(
                                                                    item.student.parent_phone!,
                                                                    generateAttendanceSummaryMessage(
                                                                        item.student.name,
                                                                        item.hadir,
                                                                        item.sakit,
                                                                        item.izin,
                                                                        item.alpha,
                                                                        item.rate
                                                                    )
                                                                )}
                                                                target="_blank"
                                                                rel="noopener noreferrer"
                                                                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-xs transition-all hover:scale-105 active:scale-95"
                                                                title={`Kirim rekap absensi via WA ke wali murid (${item.student.parent_phone})`}
                                                            >
                                                                <MessageCircle className="w-3.5 h-3.5" />
                                                                <span>Hubungi Ortu</span>
                                                            </a>
                                                        ) : (
                                                            <span
                                                                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs text-slate-400 dark:text-slate-500 bg-slate-100 dark:bg-slate-800"
                                                                title="Nomor WhatsApp orang tua belum terdaftar di data siswa"
                                                            >
                                                                <PhoneOff className="w-3.5 h-3.5" />
                                                                <span>No WA Kosong</span>
                                                            </span>
                                                        )}
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>

                            {/* Mobile Card List View */}
                            <div className="md:hidden space-y-3">
                                {paginatedSummaries.map((item, index) => {
                                    const globalIndex = (currentPage - 1) * itemsPerPage + index + 1;
                                    const hasParentPhone = Boolean(item.student.parent_phone?.trim());

                                    return (
                                        <div
                                            key={item.student.id}
                                            className={`p-4 rounded-xl border transition-all ${
                                                item.isAtRisk
                                                    ? 'border-rose-300 bg-rose-50/40 dark:border-rose-800/60 dark:bg-rose-950/20'
                                                    : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800/40'
                                            }`}
                                        >
                                            <div className="flex items-start justify-between gap-2">
                                                <div className="flex items-center gap-2">
                                                    <span className="w-6 h-6 rounded-full bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 flex items-center justify-center font-mono text-xs font-bold shrink-0">
                                                        {globalIndex}
                                                    </span>
                                                    <div>
                                                        <h4 className="font-semibold text-sm text-slate-900 dark:text-white">
                                                            {item.student.name}
                                                        </h4>
                                                        <p className="text-xxs text-slate-400">
                                                            {item.student.gender || 'Siswa'}
                                                        </p>
                                                    </div>
                                                </div>

                                                {item.isAtRisk ? (
                                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xxs font-bold bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300 shrink-0">
                                                        <AlertTriangle className="w-3 h-3" />
                                                        {item.alpha >= 2 ? `${item.alpha}x Alpha` : '< 85%'}
                                                    </span>
                                                ) : item.total > 0 && item.rate === 100 ? (
                                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xxs font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 shrink-0">
                                                        <CheckCircle2 className="w-3 h-3" />
                                                        100%
                                                    </span>
                                                ) : null}
                                            </div>

                                            {/* Metrics Row */}
                                            <div className="grid grid-cols-4 gap-2 mt-3 pt-2.5 border-t border-slate-100 dark:border-slate-700/50 text-center">
                                                <div className="p-1.5 rounded-lg bg-emerald-500/10">
                                                    <div className="font-bold text-xs text-emerald-600 dark:text-emerald-400">{item.hadir}</div>
                                                    <div className="text-xxs text-slate-500">Hadir</div>
                                                </div>
                                                <div className="p-1.5 rounded-lg bg-amber-500/10">
                                                    <div className="font-bold text-xs text-amber-600 dark:text-amber-400">{item.sakit}</div>
                                                    <div className="text-xxs text-slate-500">Sakit</div>
                                                </div>
                                                <div className="p-1.5 rounded-lg bg-blue-500/10">
                                                    <div className="font-bold text-xs text-blue-600 dark:text-blue-400">{item.izin}</div>
                                                    <div className="text-xxs text-slate-500">Izin</div>
                                                </div>
                                                <div className="p-1.5 rounded-lg bg-rose-500/10">
                                                    <div className="font-bold text-xs text-rose-600 dark:text-rose-400">{item.alpha}</div>
                                                    <div className="text-xxs text-slate-500">Alpha</div>
                                                </div>
                                            </div>

                                            {/* Progress & Action */}
                                            <div className="flex items-center justify-between gap-3 mt-3 pt-2.5 border-t border-slate-100 dark:border-slate-700/50">
                                                <div className="flex-1">
                                                    <div className="flex justify-between text-xxs mb-1">
                                                        <span className="text-slate-500">Kehadiran</span>
                                                        <span className="font-bold text-slate-700 dark:text-slate-300">{item.rate}%</span>
                                                    </div>
                                                    <div className="w-full h-1.5 rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden">
                                                        <div
                                                            className={`h-full rounded-full ${
                                                                item.rate >= 90
                                                                    ? 'bg-emerald-500'
                                                                    : item.rate >= 75
                                                                    ? 'bg-blue-500'
                                                                    : 'bg-rose-500'
                                                            }`}
                                                            style={{ width: `${item.rate}%` }}
                                                        />
                                                    </div>
                                                </div>

                                                {hasParentPhone ? (
                                                    <a
                                                        href={createWhatsAppLink(
                                                            item.student.parent_phone!,
                                                            generateAttendanceSummaryMessage(
                                                                item.student.name,
                                                                item.hadir,
                                                                item.sakit,
                                                                item.izin,
                                                                item.alpha,
                                                                item.rate
                                                            )
                                                        )}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="shrink-0 inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-emerald-600 text-white text-xs font-semibold shadow-xs"
                                                    >
                                                        <MessageCircle className="w-3.5 h-3.5" />
                                                        <span>WA Ortu</span>
                                                    </a>
                                                ) : (
                                                    <span className="shrink-0 inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xxs text-slate-400 bg-slate-100 dark:bg-slate-800">
                                                        <PhoneOff className="w-3 h-3" />
                                                        <span>No WA -</span>
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>

                            {/* Pagination Controls */}
                            {totalPages > 1 && (
                                <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-4 border-t border-slate-100 dark:border-slate-800 mt-4">
                                    <span className="text-xs text-slate-500 dark:text-slate-400">
                                        Menampilkan {(currentPage - 1) * itemsPerPage + 1} - {Math.min(currentPage * itemsPerPage, filteredSummaries.length)} dari {filteredSummaries.length} siswa
                                    </span>
                                    <div className="flex items-center gap-2">
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                                            disabled={currentPage === 1}
                                            className="h-8 px-3 text-xs gap-1"
                                        >
                                            <ChevronLeft className="w-3.5 h-3.5" />
                                            <span>Sebelumnya</span>
                                        </Button>
                                        <span className="text-xs font-semibold px-2 text-slate-600 dark:text-slate-300">
                                            Halaman {currentPage} dari {totalPages}
                                        </span>
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                                            disabled={currentPage === totalPages}
                                            className="h-8 px-3 text-xs gap-1"
                                        >
                                            <span>Berikutnya</span>
                                            <ChevronRight className="w-3.5 h-3.5" />
                                        </Button>
                                    </div>
                                </div>
                            )}
                        </>
                    )}
                </CardContent>
            </Card>
        </div>
    );
};
