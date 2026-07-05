


import React, { useState, lazy, Suspense } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { motion } from 'framer-motion';
import { useTour } from '../OnboardingHelp';
import AnalyticsPageSkeleton from '../skeletons/AnalyticsPageSkeleton';
import AnalyticsExportModal from './analytics/AnalyticsExportModal';
import { generateAnalyticsPdf } from '../../utils/analyticsPdfGenerator';
import { useAnalyticsData } from './analytics/useAnalyticsData';

// Tabs (Lazy Loaded)
const OverviewTab = lazy(() => import('./analytics/OverviewTab').then(m => ({ default: m.OverviewTab })));
const AcademicTab = lazy(() => import('./analytics/AcademicTab').then(m => ({ default: m.AcademicTab })));
const AttendanceTab = lazy(() => import('./analytics/AttendanceTab').then(m => ({ default: m.AttendanceTab })));
const ClassComparisonTab = lazy(() => import('./analytics/ClassComparisonTab'));
const CharacterTab = lazy(() => import('./analytics/CharacterTab').then(m => ({ default: m.CharacterTab })));

// UI Components
import { Button } from '../ui/Button';
import { CustomDropdown } from '../ui/CustomDropdown';
import { Download, RefreshCwIcon, UsersIcon, CalendarIcon, LayoutDashboard, GraduationCap, Clock, ShieldAlert, BarChart3 } from 'lucide-react';

const AnalyticsPage: React.FC = () => {
    const { start } = useTour();
    const { userRole } = useAuth();
    const isLeadership = userRole === 'kepala_madrasah' || userRole === 'waka_kesiswaan' || userRole === 'admin';
    const [isExportModalOpen, setIsExportModalOpen] = useState(false);
    const [activeTab, setActiveTab] = useState<'overview' | 'academic' | 'attendance' | 'character' | 'comparison'>('overview');

    const {
        dateRange, setDateRange,
        selectedClassId, setSelectedClassId,
        classes, isLoading, refetch,
        students, attendance: _attendance, academicRecords, violations: _violations, quizPoints: _quizPoints, tasks: _tasks,
        gradeStats, attendanceStats, classStats, atRiskStudents, topPerformingStudents,
        dailyAttendance, taskStats, genderStats, violationsStats, quizPointsStats
    } = useAnalyticsData();

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

    const dateRangeLabel = {
        '7d': '7 Hari',
        '30d': '30 Hari',
        '90d': '90 Hari',
        all: 'Semua',
    }[dateRange];

    const selectedClassLabel = selectedClassId === 'all'
        ? 'Semua Kelas'
        : classes.find(cls => cls.id === selectedClassId)?.name || 'Kelas Dipilih';

    const processExport = async (options: any) => {
        const analyticsData = {
            students,
            classStats,
            attendanceStats,
            gradeStats,
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

    const tabs = [
        { id: 'overview', label: 'Ringkasan', icon: LayoutDashboard },
        { id: 'academic', label: 'Akademik', icon: GraduationCap },
        { id: 'attendance', label: 'Kehadiran', icon: Clock },
        { id: 'character', label: 'Karakter', icon: ShieldAlert },
        { id: 'comparison', label: 'Perbandingan Kelas', icon: BarChart3 },
    ] as const;

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
                        <Button variant="outline" size="sm" onClick={() => setIsExportModalOpen(true)} className="px-4 gap-2">
                            <Download className="w-4 h-4" />
                            <span className="hidden sm:inline">Export PDF</span>
                        </Button>
                        <Button variant="outline" size="sm" onClick={() => refetch()} className="px-4 gap-2">
                            <RefreshCwIcon className="w-4 h-4" />
                        </Button>
                    </div>
                </div>

                {/* Filter Bar */}
                <div className="flex flex-col sm:flex-row gap-3 p-3 bg-white/80 dark:bg-slate-900/60 backdrop-blur-xl rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] transition-all border border-slate-200/70 dark:border-slate-700/60 shadow-sm">
                    <div className="flex items-center gap-3 px-2 sm:px-4 py-1 sm:border-r border-slate-100 dark:border-slate-800">
                        <UsersIcon className="w-4 h-4 text-slate-400 hidden sm:block" />
                        <CustomDropdown
                            value={selectedClassId}
                            onChange={setSelectedClassId}
                            options={[
                                { value: 'all', label: isLeadership ? 'Semua Kelas' : 'Semua Kelas Anda' },
                                ...classes.map(cls => ({ value: cls.id, label: cls.name }))
                            ]}
                        />
                    </div>
                    <div className="flex items-center gap-3 px-2 sm:px-4 py-1">
                        <CalendarIcon className="w-4 h-4 text-slate-400 hidden sm:block" />
                        <CustomDropdown
                            value={dateRange}
                            onChange={(val) => setDateRange(val as any)}
                            options={[
                                { value: '7d', label: '7 Hari Terakhir' },
                                { value: '30d', label: '30 Hari Terakhir' },
                                { value: '90d', label: '90 Hari Terakhir' },
                                { value: 'all', label: 'Semua Waktu (Semester Ini)' },
                            ]}
                        />
                    </div>
                </div>
            </header>

            {/* Smart Navigation Tabs */}
            <div id="tour-tabs" className="flex overflow-x-auto scrollbar-hide gap-2 p-1 bg-slate-100 dark:bg-slate-800/50 rounded-2xl">
                {tabs.filter(tab => tab.id !== 'comparison' || isLeadership).map(tab => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        className={`relative flex-shrink-0 sm:flex-1 min-w-[110px] flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-sm font-bold whitespace-nowrap transition-all duration-300 focus:outline-none
                            ${activeTab === tab.id 
                                ? 'text-indigo-600 dark:text-indigo-400 scale-100' 
                                : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-200/50 dark:hover:bg-slate-800 scale-95 hover:scale-100'}`}
                    >
                        {activeTab === tab.id && (
                            <motion.div
                                layoutId="activeAnalyticsTab"
                                className="absolute inset-0 bg-white/80 dark:bg-slate-900/60 backdrop-blur-xl rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] transition-all shadow-sm z-0"
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
                <Suspense fallback={<div className="flex justify-center items-center h-64"><div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div></div>}>
                    {activeTab === 'overview' && (
                        <OverviewTab 
                            students={students} classes={classes} attendanceStats={attendanceStats} 
                            taskStats={taskStats} genderStats={genderStats} 
                            atRiskStudents={atRiskStudents} topPerformingStudents={topPerformingStudents} 
                        />
                    )}
                    {activeTab === 'academic' && (
                        <AcademicTab 
                            gradeStats={gradeStats} classes={classes} students={students} 
                            academicRecords={academicRecords} selectedClassId={selectedClassId} 
                        />
                    )}
                    {activeTab === 'attendance' && (
                        <AttendanceTab 
                            dailyAttendance={dailyAttendance} attendanceStats={attendanceStats} 
                            titleContext={selectedClassLabel}
                        />
                    )}
                    {activeTab === 'character' && (
                        <CharacterTab 
                            violationsStats={violationsStats} quizPointsStats={quizPointsStats} 
                        />
                    )}
                    {activeTab === 'comparison' && isLeadership && (
                        <ClassComparisonTab />
                    )}
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