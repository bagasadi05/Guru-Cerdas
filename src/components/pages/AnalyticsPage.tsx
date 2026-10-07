import React, { useState, lazy, Suspense } from 'react';
import { useSearchParams } from 'react-router-dom';
import { MotionDiv } from '../ui/MotionComponents';
import { useTour } from '../OnboardingHelp';
import AnalyticsPageSkeleton from '../skeletons/AnalyticsPageSkeleton';
import AnalyticsExportModal, { ExportOptions } from './analytics/AnalyticsExportModal';
import { generateAnalyticsPdf } from '../../utils/analyticsPdfGenerator';
import { useAnalyticsData, getCurrentMonthWib } from './analytics/useAnalyticsData';
import { calculateSubjectStats, findStudentsBelowKKTP } from '../../services/academicAnalyticsService';
import { ErrorState } from '../ui/ErrorState';

// Tabs (Lazy Loaded)
const OverviewTab = lazy(() => import('./analytics/OverviewTab').then(m => ({ default: m.OverviewTab })));
const AcademicTab = lazy(() => import('./analytics/AcademicTab').then(m => ({ default: m.AcademicTab })));
const AttendanceTab = lazy(() => import('./analytics/AttendanceTab').then(m => ({ default: m.AttendanceTab })));
const ClassComparisonTab = lazy(() => import('./analytics/ClassComparisonTab'));
const CharacterTab = lazy(() => import('./analytics/CharacterTab').then(m => ({ default: m.CharacterTab })));
const PredictiveAnalyticsTab = lazy(() => import('./analytics/PredictiveAnalyticsTab').then(m => ({ default: m.PredictiveAnalyticsTab })));

// UI Components
import { Button } from '../ui/Button';
import { CustomDropdown } from '../ui/CustomDropdown';
import { Download, RefreshCwIcon, UsersIcon, CalendarIcon, LayoutDashboard, GraduationCap, Clock, ShieldAlert, BarChart3, Sparkles } from 'lucide-react';

const TABS = [
    { id: 'overview', label: 'Ringkasan', icon: LayoutDashboard },
    { id: 'academic', label: 'Akademik', icon: GraduationCap },
    { id: 'attendance', label: 'Kehadiran', icon: Clock },
    { id: 'character', label: 'Karakter', icon: ShieldAlert },
    { id: 'predictive', label: 'Prediksi & AI', icon: Sparkles },
    { id: 'comparison', label: 'Perbandingan Kelas', icon: BarChart3 },
] as const;
type TabId = typeof TABS[number]['id'];

const ALL_PERIOD_LABEL = 'Semua (Semester Ini)';

const formatMonth = (value: string) => {
    const [y, m] = value.split('-').map(Number);
    return new Date(y, m - 1, 1).toLocaleDateString('id-ID', { month: 'long', year: 'numeric' });
};

function getAnalyticsMonthOptions(selected: string): { value: string; label: string }[] {
    const [currentYear, currentMonth] = getCurrentMonthWib().split('-').map(Number);

    const opts: { value: string; label: string }[] = [];
    for (let i = 0; i < 6; i++) {
        const d = new Date(currentYear, currentMonth - 1 - i, 1);
        const val = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
        opts.push({ value: val, label: i === 0 ? `${formatMonth(val)} (Bulan Ini)` : formatMonth(val) });
    }
    // A month shared through the URL may be older than the last six.
    if (selected !== 'all' && !opts.some((o) => o.value === selected)) {
        opts.push({ value: selected, label: formatMonth(selected) });
    }
    opts.push({ value: 'all', label: ALL_PERIOD_LABEL });
    return opts;
}

const isTabId = (value: string | null): value is TabId => TABS.some((t) => t.id === value);
const isPeriod = (value: string | null): value is string => value === 'all' || /^\d{4}-(0[1-9]|1[0-2])$/.test(value ?? '');

const AnalyticsPage: React.FC = () => {
    const { start } = useTour();
    const [searchParams, setSearchParams] = useSearchParams();
    const [isExportModalOpen, setIsExportModalOpen] = useState(false);

    const periodParam = searchParams.get('periode');
    const dateRange = isPeriod(periodParam) ? periodParam : getCurrentMonthWib();
    const selectedClassId = searchParams.get('kelas') || 'all';

    const updateParam = (key: string, value: string, defaultValue: string) => {
        setSearchParams((prev) => {
            const next = new URLSearchParams(prev);
            if (value === defaultValue) next.delete(key);
            else next.set(key, value);
            return next;
        }, { replace: true });
    };
    const setDateRange = (value: string) => updateParam('periode', value, getCurrentMonthWib());
    const setSelectedClassId = (value: string) => updateParam('kelas', value, 'all');
    const setActiveTab = (value: TabId) => updateParam('tab', value, 'overview');

    const monthOptions = React.useMemo(() => getAnalyticsMonthOptions(dateRange), [dateRange]);

    const {
        classes, isLeadership, kktp, activeSemester,
        isLoading, isFetching, isError, hasData, refetch,
        students, attendance, academicRecords, violations, quizPoints, tasks,
        gradeStats, attendanceStats, classStats, atRiskStudents, topPerformingStudents,
        dailyAttendance, taskStats, genderStats, violationsStats, quizPointsStats,
        studentAttendanceSummaries, autoFillStats, missingWeekdays
    } = useAnalyticsData({ dateRange, selectedClassId });

    const tabParam = searchParams.get('tab');
    const requestedTab: TabId = isTabId(tabParam) ? tabParam : 'overview';
    const activeTab: TabId = requestedTab === 'comparison' && !isLeadership ? 'overview' : requestedTab;

    React.useEffect(() => {
        const steps = [
            {
                id: 'analytics-intro',
                target: '#tour-tabs',
                title: 'Dashboard Analitik Cerdas',
                content: 'Kami menyederhanakan data Anda. Klik tab ini untuk beralih antara Ringkasan, Nilai, Kehadiran, atau Karakter Siswa.',
                position: 'bottom' as const
            },
            {
                id: 'help-center',
                target: '#tour-help-button',
                title: 'Pusat Bantuan',
                content: 'Bingung cara pakai? Klik tombol ini untuk melihat panduan lengkap dengan gambar.',
                position: 'left' as const
            }
        ];
        const timer = setTimeout(() => start(steps), 1000);
        return () => clearTimeout(timer);
    }, [start]);

    const dateRangeLabel = dateRange === 'all' ? ALL_PERIOD_LABEL : formatMonth(dateRange);

    const selectedClassLabel = selectedClassId === 'all'
        ? 'Semua Kelas'
        : classes.find(cls => cls.id === selectedClassId)?.name || 'Kelas Dipilih';

    const processExport = async (options: ExportOptions) => {
        const analyticsData = {
            students,
            classStats,
            attendanceStats,
            gradeStats,
            academic: {
                kktp,
                semesterName: activeSemester?.name ?? null,
                subjectStats: calculateSubjectStats(academicRecords, kktp),
                studentsBelowKKTP: findStudentsBelowKKTP(academicRecords, students, classes, kktp),
            },
            taskStats,
            violationsStats,
            quizPointsStats,
            atRiskStudents,
            genderStats,
            selectedClassLabel,
            dateRangeLabel
        };
        await generateAnalyticsPdf(analyticsData, options);
    };

    if (isLoading) {
        return <AnalyticsPageSkeleton />;
    }

    const renderTab = () => {
        if (isError && !hasData) {
            return (
                <ErrorState
                    fullWidth
                    title="Data analitik gagal dimuat"
                    message="Periksa koneksi internet, lalu coba lagi. Angka tidak ditampilkan supaya tidak terbaca sebagai data kosong."
                    onRetry={() => refetch()}
                />
            );
        }
        if (classes.length === 0) {
            return (
                <div className="py-16 text-center">
                    <p className="text-sm font-medium text-slate-900 dark:text-white">Belum ada kelas untuk dianalisis</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                        Analitik muncul setelah Anda membuat kelas atau ditugaskan ke kelas.
                    </p>
                </div>
            );
        }

        switch (activeTab) {
            case 'overview':
                return (
                    <OverviewTab
                        students={students} classes={classes} attendanceStats={attendanceStats}
                        taskStats={taskStats} genderStats={genderStats}
                        atRiskStudents={atRiskStudents} topPerformingStudents={topPerformingStudents}
                    />
                );
            case 'academic':
                return (
                    <AcademicTab
                        gradeStats={gradeStats} classes={classes} students={students}
                        academicRecords={academicRecords} selectedClassId={selectedClassId}
                        kktp={kktp} semesterName={activeSemester?.name ?? null}
                    />
                );
            case 'attendance':
                return (
                    <AttendanceTab
                        dailyAttendance={dailyAttendance}
                        attendanceStats={attendanceStats}
                        titleContext={selectedClassLabel}
                        studentSummaries={studentAttendanceSummaries}
                        autoFillStats={autoFillStats}
                        missingWeekdays={missingWeekdays}
                        selectedClassId={selectedClassId}
                    />
                );
            case 'character':
                return (
                    <CharacterTab
                        violationsStats={violationsStats}
                        quizPointsStats={quizPointsStats}
                        students={students}
                        classes={classes}
                        attendance={attendance}
                        violations={violations}
                        quizPoints={quizPoints}
                        selectedClassId={selectedClassId}
                    />
                );
            case 'predictive':
                return (
                    <PredictiveAnalyticsTab
                        students={students}
                        classes={classes}
                        attendance={attendance}
                        academicRecords={academicRecords}
                        violations={violations}
                        tasks={tasks}
                        selectedClassId={selectedClassId}
                    />
                );
            case 'comparison':
                return <ClassComparisonTab />;
        }
    };

    return (
        <div className="min-h-screen p-4 md:p-8 space-y-6 pb-24 lg:pb-8">
            {/* Minimalist Header */}
            <header className="flex flex-col gap-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                    <div>
                        <h1 className="text-2xl md:text-4xl font-bold text-slate-900 dark:text-white">
                            Performa Siswa
                        </h1>
                        <p className="text-sm md:text-base text-slate-500 dark:text-slate-400 mt-1">
                            {isLeadership ? 'Pantau performa seluruh madrasah secara menyeluruh' : 'Asisten pintar untuk memantau perkembangan siswa Anda'}
                        </p>
                    </div>
                    <div className="flex items-center gap-2">
                        <Button variant="outline" size="sm" onClick={() => setIsExportModalOpen(true)} disabled={!hasData} className="px-4 gap-2 min-h-[44px] sm:min-h-0 rounded-xl cursor-pointer active:scale-95 duration-150">
                            <Download className="w-4 h-4" />
                            <span className="hidden sm:inline">Export PDF</span>
                        </Button>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => refetch()}
                            disabled={isFetching}
                            aria-label={isFetching ? 'Sedang memuat ulang data' : 'Muat ulang data'}
                            className="px-4 gap-2 min-h-[44px] sm:min-h-0 rounded-xl cursor-pointer active:scale-95 duration-150"
                        >
                            <RefreshCwIcon className={`w-4 h-4 ${isFetching ? 'animate-spin' : ''}`} />
                        </Button>
                    </div>
                </div>

                {/* Filter Bar */}
                <div className="flex flex-col sm:flex-row sm:items-center gap-3 p-3 bg-white dark:bg-slate-900 rounded-xl transition-all border border-slate-200/70 dark:border-slate-700/60 shadow-sm">
                    <div className="flex items-center gap-3 px-2 sm:px-4 py-1 sm:border-r border-slate-100 dark:border-slate-800 w-full sm:w-auto min-w-[180px]">
                        <UsersIcon className="w-4 h-4 text-slate-400 hidden sm:block flex-shrink-0" />
                        <CustomDropdown
                            value={selectedClassId}
                            onChange={setSelectedClassId}
                            options={[
                                { value: 'all', label: isLeadership ? 'Semua Kelas' : 'Semua Kelas Anda' },
                                ...classes.map(cls => ({ value: cls.id, label: cls.name }))
                            ]}
                        />
                    </div>
                    <div className="flex items-center gap-3 px-2 sm:px-4 py-1 w-full sm:w-auto min-w-[220px]">
                        <CalendarIcon className="w-4 h-4 text-slate-400 hidden sm:block flex-shrink-0" />
                        <CustomDropdown
                            value={dateRange}
                            onChange={setDateRange}
                            options={monthOptions}
                        />
                    </div>
                    {isFetching && hasData && (
                        <span className="px-2 sm:ml-auto text-xs text-slate-500 dark:text-slate-400" role="status">
                            Memperbarui data…
                        </span>
                    )}
                </div>
            </header>

            {isError && hasData && (
                <ErrorState
                    fullWidth
                    title="Gagal memperbarui data"
                    message="Angka di bawah berasal dari pemuatan sebelumnya dan mungkin belum sesuai filter terbaru."
                    onRetry={() => refetch()}
                />
            )}

            {/* Smart Navigation Tabs */}
            <div id="tour-tabs" className="flex overflow-x-auto scrollbar-hide gap-2 p-1 sm:p-1.5 bg-slate-100 dark:bg-slate-800/50 rounded-2xl snap-x">
                {TABS.filter(tab => tab.id !== 'comparison' || isLeadership).map(tab => (
                    <button type="button"
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        aria-pressed={activeTab === tab.id}
                        className={`snap-start relative flex-shrink-0 sm:flex-1 min-w-[110px] min-h-[44px] flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-sm font-bold whitespace-nowrap transition-all duration-150 cursor-pointer active:scale-95 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500
                            ${activeTab === tab.id
                                ? 'text-brand-600 dark:text-brand-400 scale-100'
                                : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-200/50 dark:hover:bg-slate-800 scale-95 hover:scale-100'}`}
                    >
                        {activeTab === tab.id && (
                            <MotionDiv
                                layoutId="activeAnalyticsTab"
                                className="absolute inset-0 bg-white dark:bg-slate-900 rounded-xl shadow-sm z-0"
                                transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                            />
                        )}
                        <tab.icon className="w-4 h-4 relative z-10" />
                        <span className="relative z-10">{tab.label}</span>
                    </button>
                ))}
            </div>

            {/* Tab Content Rendering */}
            <div className="mt-6 min-h-[400px]">
                <Suspense fallback={<div className="flex justify-center items-center h-64"><div className="w-8 h-8 border-4 border-brand-500 border-t-transparent rounded-full animate-spin"></div></div>}>
                    {renderTab()}
                </Suspense>
            </div>

            <AnalyticsExportModal
                isOpen={isExportModalOpen}
                onClose={() => setIsExportModalOpen(false)}
                onExport={processExport}
                dateRangeLabel={dateRangeLabel}
                selectedClassLabel={selectedClassLabel}
            />
        </div>
    );
};

export default AnalyticsPage;
