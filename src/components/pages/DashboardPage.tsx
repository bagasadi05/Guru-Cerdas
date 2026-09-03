import React, { useState, useEffect, useMemo, Suspense } from 'react';

import { useAuth } from '../../hooks/useAuth';
import { useScheduleNotifications } from '../../hooks/useScheduleNotifications';
import { useDashboardData } from '../../hooks/useDashboardData';
import { useClock } from '../../hooks/useClock';
import { useGradeAudit } from '../../hooks/useGradeAudit';
import { useDashboardActivities } from '../../hooks/useDashboardActivities';
import { useTodayJournalStatus } from '../../hooks/useTodayJournalStatus';
import { isTaskOverdue, formatTaskDueDate } from '../../utils/dateHelpers';
import { resolveClassName } from '../../utils/scheduleUtils';
import { Link, useNavigate } from 'react-router-dom';
import {
  CalendarIcon,
  ClockIcon,
  BookOpenIcon,
  SearchIcon,
  BrainCircuitIcon,
  SettingsIcon,
  PlusIcon,
  BarChart3Icon,
} from '../Icons';
import { Button } from '../ui/Button';
import { WelcomeEmptyState } from '../EmptyStates';
import { AIInsightWidget } from '../dashboard/AIInsightWidget';
import StatsGrid from '../dashboard/StatsGrid';
import DashboardPageSkeleton from '../skeletons/DashboardPageSkeleton';
import { CardSkeleton } from '../skeletons';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/Tabs';
import DashboardGreeting from '../dashboard/DashboardGreeting';
import SemesterTransitionBanner from '../dashboard/SemesterTransitionBanner';
import GradeAuditWidget from '../dashboard/GradeAuditWidget';
import ScheduleTimeline from '../dashboard/ScheduleTimeline';
import FloatingActionButton from '../ui/FloatingActionButton';
import { LeaderboardCard } from '../gamification/LeaderboardCard';
import TodayActionPanel from '../dashboard/TodayActionPanel';
import { DashboardSummaryCards } from '../dashboard';
import { DashboardAlertStack } from '../dashboard/DashboardAlertStack';
import { DashboardSection } from '../dashboard/DashboardSection';
import {
  LazyAttendanceStatsWidget,
  LazyClassAnalyticsSection,
  LazyActivityFeedWidget,
  LazyParentMessagesWidget,
  LazySchoolStatsGrid,
  LazySmartInsightsPanel,
  LazyWallOfFameWidget,
} from '../dashboard/LazyWidgets';
import { transformToGameData } from '../../services/gamificationService';
import { ErrorState } from '../ui/ErrorState';
import { useGlobalSearch } from '../GlobalSearchContext';

// ==========================================
// DASHBOARD PAGE
// ==========================================

const DashboardPage: React.FC = () => {
  const { user, userRole } = useAuth();
  const isGlobalRole = userRole === 'waka_kesiswaan' || userRole === 'waka_kurikulum' || userRole === 'kepala_madrasah' || userRole === 'admin';
  const todayStr = new Date().toLocaleDateString('sv-SE');
  const { data: journalStatus } = useTodayJournalStatus(todayStr);
  const navigate = useNavigate();
  const currentTime = useClock();
  const [isFabOpen, setIsFabOpen] = useState(false);
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);
  const { open: openSearch } = useGlobalSearch();

  const randomQuote = useMemo(() => {
    const quotes = [
      'Pendidikan adalah senjata paling mematikan di dunia, karena dengan itu Anda bisa mengubah dunia. — Nelson Mandela',
      'Tugas utama seorang pendidik bukan sekadar mengajar, melainkan menginspirasi sanubari.',
      'Setiap siswa memiliki bakat unik yang menunggu untuk Anda kembangkan dengan penuh kasih sayang.',
      'Pendidik yang baik bagaikan lilin — ia menghabiskan dirinya sendiri untuk menerangi jalan orang lain.',
      'Terima kasih atas dedikasi luar biasa Anda hari ini dalam mencerdaskan anak bangsa!',
    ];
    const dateNum = new Date().getDate();
    return quotes[dateNum % quotes.length];
  }, []);

  const { data, isLoading, isError, error, refetch, isRefetching: isFetching } = useDashboardData();
  const dashboardErrorMessage =
    error instanceof Error ? error.message : 'Gagal memuat data dashboard. Silakan coba lagi.';

  useScheduleNotifications(user?.id);
  useGradeAudit({ data });

  const { activeReminders, activities: recentActivities, dismissReminder: handleDismissReminder } = useDashboardActivities(
    data ? {
      students: data.students ?? [],
      tasks: data.tasks ?? [],
      recentTasks: data.recentTasks ?? [],
      academicRecords: data.academicRecords ?? [],
      dailyAttendanceSummary: data.dailyAttendanceSummary ?? { present: 0, total: 0 },
      todayAttendanceRecords: data.todayAttendanceRecords ?? [],
    } : null
  );

  if (isLoading) return <DashboardPageSkeleton />;

  if (isError && !data) {
    return (
      <div className="w-full min-h-full p-4 md:p-6 lg:p-8 flex flex-col space-y-6 bg-transparent max-w-7xl mx-auto pb-24 lg:pb-8">
        <ErrorState message={dashboardErrorMessage} onRetry={() => refetch()} fullWidth />
      </div>
    );
  }

  const {
    students = [],
    tasks = [],
    schedule = [],
    classes = [],
    weeklyAttendance = [],
  } = data || {};
  const todaySchedule = schedule.map((item) => ({
    ...item,
    className: resolveClassName(classes.find((c) => c.id === item.class_id)?.name, item.class_id),
  }));

  // Show welcome state for new users with no data
  if (!isLoading && data && students.length === 0 && classes.length === 0) {
    return (
      <div className="w-full min-h-full p-4 lg:p-8 flex items-center justify-center">
        <WelcomeEmptyState
          userName={user?.name}
          onGetStarted={() => navigate('/siswa')}
          onViewTutorial={() => window.open('https://docs.portal-guru.com/tutorial', '_blank')}
        />
      </div>
    );
  }

  return (
    <div className="w-full min-h-full p-3 md:p-5 lg:p-6 flex flex-col space-y-3 sm:space-y-4 bg-transparent max-w-7xl mx-auto pb-24 lg:pb-8">
      {/* Error Banner */}
      {isError && (
        <div className="rounded-xl border border-red-200/60 dark:border-red-500/30 bg-red-50/60 dark:bg-red-500/10 px-4 py-3 shadow-sm">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm font-semibold text-red-700 dark:text-red-300">
              {dashboardErrorMessage}
            </p>
            <Button onClick={() => refetch()} disabled={isFetching} variant="destructive" size="sm">
              {isFetching ? 'Memuat...' : 'Coba Lagi'}
            </Button>
          </div>
        </div>
      )}

      {/* Semester Transition */}
      <SemesterTransitionBanner />

      {/* Dynamic Alert Stack */}
      <DashboardAlertStack data={data} journalStatus={journalStatus} />

      {/* Greeting */}
      <DashboardGreeting
        userName={user?.name}
        isOnline={isOnline}
        randomQuote={randomQuote}
        isSidebarOpen={true}
        onToggleSidebar={() => {}}
      />

      {/* ============================================ */}
      {/* SECTION 1: Hari Ini                          */}
      {/* ============================================ */}
      <DashboardSection title="Hari Ini" dataTutorial="dashboard-stats">
        {/* KPI Cards */}
        {isGlobalRole ? (
          <Suspense fallback={<CardSkeleton />}>
            <LazySchoolStatsGrid />
          </Suspense>
        ) : (
          data && <StatsGrid data={data} currentTime={currentTime} />
        )}

        {/* Action Panel + Schedule side by side */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mt-4 items-stretch">
          {/* Today Action Panel */}
          <div className="lg:col-span-2 space-y-4">
            {isGlobalRole ? (
              <>
                <Suspense fallback={<CardSkeleton />}>
                  <LazySmartInsightsPanel />
                </Suspense>
                <TodayActionPanel data={data} isLoading={isLoading} isCombined={true} />
              </>
            ) : (
              <TodayActionPanel data={data} isLoading={isLoading} />
            )}
          </div>

          {/* Schedule + Tasks Tabs */}
          <div className="bg-white/80 dark:bg-slate-900/60 backdrop-blur-xl rounded-3xl overflow-hidden border border-slate-200/80 dark:border-slate-700/60 shadow-[0_8px_30px_rgb(0,0,0,0.04)] flex flex-col h-full min-h-[360px]">
            <Tabs defaultValue="schedule" className="w-full flex flex-col flex-1 min-h-0">
              <div className="px-3 py-2.5 border-b border-slate-200/80 dark:border-slate-700/60 bg-slate-100/50 dark:bg-slate-800/40">
                <TabsList className="w-full grid grid-cols-2">
                  <TabsTrigger value="schedule">Jadwal</TabsTrigger>
                  <TabsTrigger value="tasks">Tugas ({tasks.length})</TabsTrigger>
                </TabsList>
              </div>

              <TabsContent value="schedule" className="flex-1 overflow-y-auto p-0 m-0 custom-scrollbar min-h-0">
                <ScheduleTimeline schedule={todaySchedule} currentTime={currentTime} />
              </TabsContent>
              <TabsContent value="tasks" className="flex-1 flex flex-col overflow-y-auto p-0 m-0 custom-scrollbar min-h-0">
                <div className="p-3 space-y-2 flex-1">
                  {tasks.length > 0 ? (
                    tasks.slice(0, 5).map((task) => (
                      <div
                        key={task.id}
                        className="p-2.5 bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-700/60 rounded-xl hover:-translate-y-0.5 hover:shadow-md transition-all duration-200 group cursor-pointer"
                      >
                        <div className="flex items-start justify-between">
                          <div>
                            <p className="font-semibold text-sm text-slate-800 dark:text-white line-clamp-1 group-hover:text-amber-500 transition-colors">
                              {task.title}
                            </p>
                            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 flex items-center gap-1.5">
                              <ClockIcon className="w-3.5 h-3.5" />
                              {task.due_date ? formatTaskDueDate(task.due_date) : 'Tidak ada deadline'}
                            </p>
                          </div>
                          <div className={`w-2.5 h-2.5 rounded-full mt-1.5 ${isTaskOverdue(task.due_date, currentTime) ? 'bg-red-500 shadow-sm shadow-red-500/50' : 'bg-blue-500 shadow-sm shadow-blue-500/50'}`} />
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="flex flex-col items-center justify-center h-full py-8 text-center text-slate-400">
                      <BookOpenIcon className="w-10 h-10 mb-3 opacity-30" />
                      <p className="font-medium text-sm">Tidak ada tugas aktif</p>
                    </div>
                  )}
                </div>
                {tasks.length > 0 && (
                  <div className="p-2.5 border-t border-slate-200/60 dark:border-slate-700/60 bg-slate-50/50 dark:bg-slate-800/40">
                    <Button variant="outline" size="sm" onClick={() => navigate('/tugas')} className="w-full">
                      Lihat Semua Tugas
                    </Button>
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </DashboardSection>

      {/* ============================================ */}
      {/* SECTION 2: Wawasan & Analisis                */}
      {/* ============================================ */}
      <DashboardSection
        title="Wawasan & Analisis"
        icon={<BrainCircuitIcon className="w-5 h-5 text-brand-600 dark:text-brand-400" />}
        dataTutorial="ai-insight"
      >
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 items-stretch">
          {/* AI Insight */}
          <div className="bg-white/80 dark:bg-slate-900/60 backdrop-blur-xl rounded-3xl overflow-hidden border border-slate-200/80 dark:border-slate-700/60 shadow-sm flex flex-col h-full">
            <div className="p-4 border-b border-slate-200/80 dark:border-slate-700/60 bg-gradient-to-r from-brand-500/10 to-brand-400/5">
              <h3 className="flex items-center gap-2 font-semibold text-base text-slate-900 dark:text-white">
                <BrainCircuitIcon className="w-4 h-4 text-brand-600" />
                Analisis Cerdas Harian
              </h3>
            </div>
            <div className="p-4 flex-1">
              <AIInsightWidget dashboardData={data || null} userId={user?.id} />
            </div>
          </div>

          {/* Grade Audit (guru) or extra Smart Insights (leadership) */}
          {!isGlobalRole && <GradeAuditWidget data={data} classes={classes} />}
        </div>
      </DashboardSection>

      {/* ============================================ */}
      {/* SECTION 3: Performa                          */}
      {/* ============================================ */}
      <DashboardSection
        title="Performa Kelas & Siswa"
        icon={<BarChart3Icon className="w-5 h-5 text-emerald-500" />}
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-stretch">
          {/* Attendance Chart */}
          <Suspense fallback={<CardSkeleton />}>
            <LazyAttendanceStatsWidget weeklyData={weeklyAttendance} />
          </Suspense>

          {/* Class Analytics */}
          {data && data.classes.length > 0 && (
            <Suspense fallback={<CardSkeleton />}>
              <LazyClassAnalyticsSection
                classes={data.classes}
                students={data.students}
                academicRecords={data.academicRecords}
                attendanceRecords={[]}
                defaultOpen={true}
              />
            </Suspense>
          )}
        </div>

        {/* Leaderboard + Summary Cards */}
        {data && data.students.length > 0 && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mt-4 items-stretch">
            <div className="h-full">
              <LeaderboardCard
                studentsData={data.students.map((s) => {
                  const className = data.classes.find((c) => c.id === s.class_id)?.name || 'N/A';
                  return transformToGameData(s, className, data.academicRecords, [], [], data.violations);
                })}
                classes={data.classes}
              />
            </div>

            {!isGlobalRole && <DashboardSummaryCards data={data} />}
          </div>
        )}
      </DashboardSection>

      {/* ============================================ */}
      {/* SECTION 4: Lainnya (collapsible)             */}
      {/* ============================================ */}
      <DashboardSection
        title="Lainnya"
        collapsible
        defaultOpen={false}
      >
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 items-stretch">
          {/* Wall of Fame */}
          <Suspense fallback={<CardSkeleton />}>
            <LazyWallOfFameWidget data={data} />
          </Suspense>

          {/* Parent Messages */}
          <Suspense fallback={<CardSkeleton />}>
            <LazyParentMessagesWidget />
          </Suspense>

          {/* Activity Feed (teacher only) */}
          {!isGlobalRole && (
            <Suspense fallback={<CardSkeleton />}>
              <LazyActivityFeedWidget
                reminders={activeReminders}
                activities={recentActivities}
                onDismissReminder={handleDismissReminder}
              />
            </Suspense>
          )}
        </div>
      </DashboardSection>

      {/* Speed Dial FAB */}
      <nav className="fixed bottom-24 right-4 lg:bottom-10 lg:right-10 z-50 flex flex-col items-end gap-4 pointer-events-none" aria-label="Aksi cepat">
        <div
          role="menu"
          aria-hidden={!isFabOpen}
          className={`flex flex-col gap-3 transition-all duration-300 ${isFabOpen ? 'opacity-100 translate-y-0 pointer-events-auto' : 'opacity-0 translate-y-10 pointer-events-none'}`}
        >
          <Link to="/jadwal" role="menuitem" aria-label="Buka jadwal" className="flex items-center gap-3 pr-1 group">
            <span className="bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 px-4 py-2 rounded-xl shadow-lg text-sm font-bold opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-all transform translate-x-0 sm:translate-x-4 sm:group-hover:translate-x-0">
              Jadwal
            </span>
            <div className="w-12 h-12 rounded-xl bg-white dark:bg-slate-800 text-brand-500 shadow-lg flex items-center justify-center hover:scale-110 transition-transform border border-slate-100 dark:border-slate-700">
              <CalendarIcon className="w-6 h-6" />
            </div>
          </Link>
          <button type="button" onClick={openSearch} role="menuitem" aria-label="Cari" className="flex items-center gap-3 pr-1 group">
            <span className="bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 px-4 py-2 rounded-xl shadow-lg text-sm font-bold opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-all transform translate-x-0 sm:translate-x-4 sm:group-hover:translate-x-0">
              Cari
            </span>
            <div className="w-12 h-12 rounded-xl bg-white dark:bg-slate-800 text-slate-500 shadow-lg flex items-center justify-center hover:scale-110 transition-transform border border-slate-100 dark:border-slate-700">
              <SearchIcon className="w-6 h-6" />
            </div>
          </button>
          <button type="button"
            onClick={() => document.dispatchEvent(new CustomEvent('open-ai-chat'))}
            role="menuitem"
            aria-label="Buka AI Chat"
            className="flex items-center gap-3 pr-1 group"
          >
            <span className="bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 px-4 py-2 rounded-xl shadow-lg text-sm font-bold opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-all transform translate-x-0 sm:translate-x-4 sm:group-hover:translate-x-0">
              AI Chat
            </span>
            <div className="w-12 h-12 rounded-xl bg-white dark:bg-slate-800 text-brand-500 shadow-lg flex items-center justify-center hover:scale-110 transition-transform border border-slate-100 dark:border-slate-700">
              <BrainCircuitIcon className="w-6 h-6" />
            </div>
          </button>
          <Link to="/pengaturan" role="menuitem" aria-label="Buka pengaturan" className="flex items-center gap-3 pr-1 group">
            <span className="bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 px-4 py-2 rounded-xl shadow-lg text-sm font-bold opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-all transform translate-x-0 sm:translate-x-4 sm:group-hover:translate-x-0">
              Pengaturan
            </span>
            <div className="w-12 h-12 rounded-xl bg-white dark:bg-slate-800 text-slate-400 shadow-lg flex items-center justify-center hover:scale-110 transition-transform border border-slate-100 dark:border-slate-700">
              <SettingsIcon className="w-6 h-6" />
            </div>
          </Link>
        </div>
        <FloatingActionButton
          onClick={() => setIsFabOpen(!isFabOpen)}
          aria-expanded={isFabOpen}
          aria-haspopup="menu"
          aria-label={isFabOpen ? 'Tutup menu aksi cepat' : 'Buka menu aksi cepat'}
          icon={
            isFabOpen ? (
              <PlusIcon className="w-7 h-7 rotate-45 transition-transform duration-300" />
            ) : (
              <PlusIcon className="w-7 h-7 transition-transform duration-300" />
            )
          }
          className={`pointer-events-auto transition-all duration-300 ${isFabOpen ? 'bg-red-500 hover:bg-red-600 dark:bg-red-600 shadow-red-500/30 rotate-90' : 'bg-brand-600 hover:bg-brand-700 shadow-brand-600/30'}`}
          position="bottom-right"
          offset={{ bottom: 0, right: 0 }}
          size={64}
        />
      </nav>
    </div>
  );
};

export default DashboardPage;
