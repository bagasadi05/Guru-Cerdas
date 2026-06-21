import React, { useState, useEffect, useMemo } from 'react';

import { useAuth } from '../../hooks/useAuth';
import { useScheduleNotifications } from '../../hooks/useScheduleNotifications';
import { useDashboardData } from '../../hooks/useDashboardData';
import { useClock } from '../../hooks/useClock';
import { useGradeAudit } from '../../hooks/useGradeAudit';
import { useDashboardActivities } from '../../hooks/useDashboardActivities';
import { useTodayJournalStatus } from '../../hooks/useTodayJournalStatus';
import { isTaskOverdue, formatTaskDueDate } from '../../utils/dateHelpers';
import { Link, useNavigate } from 'react-router-dom';
import {
  CalendarIcon,
  AlertTriangleIcon,
  ClockIcon,
  BookOpenIcon,
  SearchIcon,
  BrainCircuitIcon,
  SettingsIcon,
  PlusIcon,
} from '../Icons';
import { Button } from '../ui/Button';
import { SectionHeading } from '../ui/SectionHeading';
import { WelcomeEmptyState } from '../EmptyStates';
import { AIInsightWidget } from '../dashboard/AIInsightWidget';
import StatsGrid from '../dashboard/StatsGrid';
import { QuickActionCards } from '../dashboard/QuickActionCards';
import DashboardPageSkeleton from '../skeletons/DashboardPageSkeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/Tabs';
import DashboardGreeting from '../dashboard/DashboardGreeting';
import GradeAuditWidget from '../dashboard/GradeAuditWidget';
import ScheduleTimeline from '../dashboard/ScheduleTimeline';
import FloatingActionButton from '../ui/FloatingActionButton';
import AttendanceStatsWidget from '../dashboard/AttendanceStatsWidget';
import { ClassAnalyticsSection } from '../dashboard/ClassAnalyticsSection';
import { LeaderboardCard } from '../gamification/LeaderboardCard';
import TodayActionPanel from '../dashboard/TodayActionPanel';
import { DashboardSummaryCards, WallOfFameWidget } from '../dashboard';
import ActivityFeedWidget from '../dashboard/ActivityFeedWidget';
import ParentMessagesWidget from '../dashboard/ParentMessagesWidget';
import { transformToGameData } from '../../services/gamificationService';
import { ErrorState } from '../ui/ErrorState';
import { useGlobalSearch } from '../SearchSystem';

// ==========================================
// DASHBOARD PAGE
// ==========================================

const DashboardPage: React.FC = () => {
  const { user } = useAuth();
  const todayStr = new Date().toLocaleDateString('sv-SE');
  const { data: journalStatus } = useTodayJournalStatus(todayStr);
  const navigate = useNavigate();
  const currentTime = useClock();
  const [isFabOpen, setIsFabOpen] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
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
      'Tugas utama seorang pendidik bukan sekadar mengajar, melainkan menginspirasi sanubari. 🌟',
      'Setiap siswa memiliki bakat unik yang menunggu untuk Anda kembangkan dengan penuh kasih sayang. 💖',
      'Pendidik yang baik bagaikan lilin — ia menghabiskan dirinya sendiri untuk menerangi jalan orang lain. 🕯️',
      'Terima kasih atas dedikasi luar biasa Anda hari ini dalam mencerdaskan anak bangsa! 🇮🇩',
    ];
    const dateNum = new Date().getDate();
    return quotes[dateNum % quotes.length];
  }, []);

  const { data, isLoading, isError, error, refetch, isRefetching: isFetching } = useDashboardData();
  const dashboardErrorMessage =
    error instanceof Error ? error.message : 'Gagal memuat data dashboard. Silakan coba lagi.';

  // Sync schedule with Service Worker for notifications
  useScheduleNotifications(user?.id);

  const { studentsMissingGrade } = useGradeAudit({ data });

  // Activity feed (reminders + timeline) from existing hook
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
    className: classes.find((c) => c.id === item.class_id)?.name || item.class_id,
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
    <div className="w-full min-h-full p-4 md:p-6 lg:p-8 flex flex-col space-y-6 bg-transparent max-w-7xl mx-auto pb-24 lg:pb-8">
      {isError && (
        <div className="rounded-xl border border-red-200/60 dark:border-red-500/30 bg-red-50/60 dark:bg-red-500/10 px-4 py-3 shadow-sm">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-lg bg-red-100 dark:bg-red-500/20 text-red-600 dark:text-red-400">
                <AlertTriangleIcon className="w-4 h-4" />
              </div>
              <div>
                <p className="text-sm font-semibold text-red-700 dark:text-red-300">
                  Gagal memuat data dashboard
                </p>
                <p className="text-xs text-red-600/80 dark:text-red-400/80">
                  {dashboardErrorMessage}
                </p>
              </div>
            </div>
            <Button
              onClick={() => refetch()}
              disabled={isFetching}
              variant="destructive"
              size="sm"
              className="self-start sm:self-auto"
            >
              {isFetching ? 'Memuat...' : 'Coba Lagi'}
            </Button>
          </div>
        </div>
      )}
      <DashboardGreeting
        userName={user?.name}
        isOnline={isOnline}
        randomQuote={randomQuote}
        isSidebarOpen={isSidebarOpen}
        onToggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)}
      />

      {journalStatus && journalStatus.unfilled > 0 && (
        <div className="p-4 rounded-2xl bg-amber-50/80 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/30 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-sm animate-fade-in">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-100 dark:bg-amber-900/40 flex items-center justify-center shrink-0">
              <BookOpenIcon className="w-5 h-5 text-amber-600 dark:text-amber-400" />
            </div>
            <div>
              <h4 className="font-bold text-amber-800 dark:text-amber-400 text-sm">
                Jurnal Hari Ini Belum Diisi
              </h4>
              <p className="text-xs text-slate-600 dark:text-slate-300 mt-0.5">
                Ada {journalStatus.unfilled} agenda KBM hari ini yang belum dicatat ke jurnal mengajar.
              </p>
            </div>
          </div>
          <Button
            onClick={() => navigate('/jurnal')}
            size="sm"
            className="w-full sm:w-auto shrink-0 bg-amber-600 hover:bg-amber-700 text-white rounded-xl"
          >
            Isi Sekarang
          </Button>
        </div>
      )}

      <div className="flex flex-col lg:grid lg:grid-cols-12 gap-6">
        {/* Left Column Part 1 */}
        <div className={`space-y-6 order-1 transition-all duration-300 ${isSidebarOpen ? 'lg:col-span-9 lg:col-start-1' : 'lg:col-span-12'}`}>
          {/* Stats Section */}
          <section data-tutorial="dashboard-stats">{data && <StatsGrid data={data} currentTime={currentTime} />}</section>
          {data && <TodayActionPanel data={data} />}
          {/* Operational Section */}
          <section className="space-y-4">
            <SectionHeading>Aksi Cepat & Wawasan</SectionHeading>
            <QuickActionCards
              pendingGrades={studentsMissingGrade.length}
              incompleteTasks={tasks.length}
            />

            {/* AI Insight Widget */}
            <div data-tutorial="ai-insight" className="bg-white dark:bg-slate-900 rounded-2xl p-0 overflow-hidden border border-slate-200/60 dark:border-slate-700/60 shadow-sm">
              <div className="p-4 border-b border-slate-200/60 dark:border-slate-700/60 bg-emerald-500/10">
                <h3 className="flex items-center gap-2 font-semibold text-xl text-slate-900 dark:text-white">
                  <BrainCircuitIcon className="w-5 h-5 text-emerald-500" />
                  Analisis Cerdas Harian
                </h3>
                <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                  Wawasan berbasis AI untuk performa kelas Anda.
                </p>
              </div>
              <div className="p-4">
                <AIInsightWidget dashboardData={data || null} userId={user?.id} />
              </div>
            </div>
          </section>
        </div>

        {/* Left Column Part 2 */}
        <div className={`space-y-6 order-3 lg:col-start-1 transition-all duration-300 ${isSidebarOpen ? 'lg:col-span-9' : 'lg:col-span-12'}`}>
          {/* Analytics Section */}
          <section className="space-y-6">
            <SectionHeading>Analisis Penilaian & Kehadiran</SectionHeading>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Attendance Chart */}
              <div className="flex flex-col">
                <AttendanceStatsWidget weeklyData={weeklyAttendance} />
              </div>

              {/* Grade Audit */}
              <GradeAuditWidget data={data} classes={classes} />
            </div>
          </section>
          {/* Performance Section */}
          {data && (data.classes.length > 0 || data.students.length > 0) && (
            <section className="space-y-6">
              <div className="flex items-center gap-2 mb-4 px-2">
              <SectionHeading>Performa Kelas & Siswa</SectionHeading>
              </div>

              {/* Class Analytics */}
              {data.classes.length > 0 && (
                <ClassAnalyticsSection
                  classes={data.classes}
                  students={data.students}
                  academicRecords={data.academicRecords}
                  attendanceRecords={[]}
                />
              )}
            </section>
          )}
          {/* Leaderboard */}
          {data && data.students.length > 0 && (
            <LeaderboardCard
              studentsData={data.students.map((s) => {
                const className = data.classes.find((c) => c.id === s.class_id)?.name || 'N/A';
                return transformToGameData(
                  s,
                  className,
                  data.academicRecords,
                  [],
                  [],
                  data.violations,
                );
              })}
              classes={data.classes}
            />
          )}

          {/* Summary Alerts Grid */}
          {data && (
            <section className="space-y-4">
              <SectionHeading animate>Informasi & Tindakan Prioritas</SectionHeading>
              <DashboardSummaryCards data={data} />
            </section>
          )}

        </div>

        {/* Right Column */}
        <div className={`space-y-4 order-2 lg:row-span-4 lg:row-start-1 transition-all duration-300 ${isSidebarOpen ? 'lg:col-span-3 lg:col-start-10 block' : 'hidden lg:block lg:col-span-3 lg:col-start-10'}`}>
          <div className="bg-white dark:bg-slate-900 rounded-2xl h-full max-h-[800px] flex flex-col overflow-hidden border border-slate-200/60 dark:border-slate-700/60 shadow-sm">
            <Tabs defaultValue="schedule" className="w-full flex flex-col h-full">
              <div className="p-4 border-b border-slate-200/60 dark:border-slate-700/60 bg-slate-50/60 dark:bg-slate-800/40 backdrop-blur-md">
                <TabsList className="w-full grid grid-cols-2">
                  <TabsTrigger value="schedule">Jadwal</TabsTrigger>
                  <TabsTrigger value="tasks">Tugas</TabsTrigger>
                </TabsList>
              </div>

              <TabsContent
                value="schedule"
                className="flex-1 overflow-y-auto p-0 m-0 custom-scrollbar"
              >
                <ScheduleTimeline schedule={todaySchedule} currentTime={currentTime} />
              </TabsContent>
              <TabsContent
                value="tasks"
                className="flex-1 overflow-y-auto p-0 m-0 custom-scrollbar"
              >
                <div className="p-6 space-y-4">
                  {tasks.length > 0 ? (
                    tasks.slice(0, 10).map((task) => (
                      <div
                        key={task.id}
                        className="p-4 bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-700/60 rounded-2xl hover:shadow-md transition-all group cursor-pointer"
                      >
                        <div className="flex items-start justify-between">
                          <div>
                            <p className="font-semibold text-slate-800 dark:text-white line-clamp-1 group-hover:text-amber-500 transition-colors">
                              {task.title}
                            </p>
                            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1.5 flex items-center gap-1.5">
                              <ClockIcon className="w-3.5 h-3.5" />
                              Jatuh tempo:{' '}
                              {task.due_date ? formatTaskDueDate(task.due_date) : 'Tidak ada'}
                            </p>
                          </div>
                          <div
                            className={`w-2.5 h-2.5 rounded-full mt-1.5 ${isTaskOverdue(task.due_date, currentTime) ? 'bg-red-500 shadow-sm shadow-red-500/50' : 'bg-blue-500 shadow-sm shadow-blue-500/50'}`}
                          ></div>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="flex flex-col items-center justify-center py-20 text-center text-slate-400 dark:text-slate-500">
                      <BookOpenIcon className="w-16 h-16 mb-4 opacity-30" />
                      <p className="font-medium">Tidak ada tugas aktif.</p>
                    </div>
                  )}
                </div>
                <div className="p-4 border-t border-slate-200/60 dark:border-slate-700/60 bg-slate-50/50 dark:bg-slate-800/40 backdrop-blur-md">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => navigate('/tugas')}
                    className="w-full"
                  >
                    Lihat Semua Tugas
                  </Button>
                </div>
              </TabsContent>
            </Tabs>
          </div>

          {/* Wall of Fame Widget */}
          <WallOfFameWidget data={data} />

          {/* Parent Messages Widget */}
          <ParentMessagesWidget />

          {/* Activity Feed (Reminders + Timeline) */}
          <ActivityFeedWidget
            reminders={activeReminders}
            activities={recentActivities}
            onDismissReminder={handleDismissReminder}
          />
        </div>
      </div>

      {/* Speed Dial FAB */}
      <div className="fixed bottom-24 right-4 lg:bottom-10 lg:right-10 z-50 flex flex-col items-end gap-4 pointer-events-none">
        <div
          className={`flex flex-col gap-3 transition-all duration-300 ${isFabOpen ? 'opacity-100 translate-y-0 pointer-events-auto' : 'opacity-0 translate-y-10 pointer-events-none'}`}
        >
          <Link to="/jadwal" className="flex items-center gap-3 pr-1 group">
            <span className="bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 px-4 py-2 rounded-xl shadow-lg text-sm font-bold opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-all transform translate-x-0 sm:translate-x-4 sm:group-hover:translate-x-0">
              Jadwal
            </span>
            <div className="w-12 h-12 rounded-xl bg-white dark:bg-slate-800 text-emerald-500 shadow-lg flex items-center justify-center hover:scale-110 transition-transform border border-slate-100 dark:border-slate-700">
              <CalendarIcon className="w-6 h-6" />
            </div>
          </Link>
          <button onClick={openSearch} className="flex items-center gap-3 pr-1 group">
            <span className="bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 px-4 py-2 rounded-xl shadow-lg text-sm font-bold opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-all transform translate-x-0 sm:translate-x-4 sm:group-hover:translate-x-0">
              Cari
            </span>
            <div className="w-12 h-12 rounded-xl bg-white dark:bg-slate-800 text-slate-500 shadow-lg flex items-center justify-center hover:scale-110 transition-transform border border-slate-100 dark:border-slate-700">
              <SearchIcon className="w-6 h-6" />
            </div>
          </button>
          <button
            onClick={() => document.dispatchEvent(new CustomEvent('open-ai-chat'))}
            className="flex items-center gap-3 pr-1 group"
          >
            {' '}
            <span className="bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 px-4 py-2 rounded-xl shadow-lg text-sm font-bold opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-all transform translate-x-0 sm:translate-x-4 sm:group-hover:translate-x-0">
              AI Chat
            </span>
            <div className="w-12 h-12 rounded-xl bg-white dark:bg-slate-800 text-emerald-600 shadow-lg flex items-center justify-center hover:scale-110 transition-transform border border-slate-100 dark:border-slate-700">
              <BrainCircuitIcon className="w-6 h-6" />
            </div>
          </button>
          <Link to="/pengaturan" className="flex items-center gap-3 pr-1 group">
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
          icon={
            isFabOpen ? (
              <PlusIcon className="w-7 h-7 rotate-45 transition-transform duration-300" />
            ) : (
              <PlusIcon className="w-7 h-7 transition-transform duration-300" />
            )
          }
          className={`pointer-events-auto transition-all duration-300 ${isFabOpen ? 'bg-red-500 hover:bg-red-600 dark:bg-red-600 shadow-red-500/30 rotate-90' : 'bg-emerald-500 hover:bg-emerald-600 shadow-emerald-500/30'}`}
          position="bottom-right"
          offset={{ bottom: 0, right: 0 }} // Fix build offset syntax
          size={64}
        />
      </div>
    </div>
  );
};

export default DashboardPage;
