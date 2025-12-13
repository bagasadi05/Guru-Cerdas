import './styles/designSystem.css';
import './styles/accessibility.css';

import React, { lazy, Suspense } from 'react';
import { BrowserRouter, Navigate, Outlet, Route, Routes } from 'react-router-dom';
import { AuthProvider, useAuth } from './hooks/useAuth';
import { ThemeProvider } from './hooks/useTheme';
import { ToastProvider } from './hooks/useToast';
import { useSound } from './hooks/useSound';
import Layout from './components/Layout';
import PwaPrompt from './components/PwaPrompt';
import { QueryClientProvider } from '@tanstack/react-query';
import { QueryClient } from '@tanstack/query-core';
import ErrorBoundary from './components/ErrorBoundary';
import { OfflineBanner, SyncProvider, UploadManagerProvider } from './components/StatusIndicators';
import { GlobalSearchProvider, GlobalSearchModal } from './components/SearchSystem';
import { TourProvider, HelpButton, HelpCenter } from './components/OnboardingHelp';
import { KeyboardShortcutsProvider, KeyboardShortcutsPanel, useKeyboardShortcuts } from './components/AdvancedFeatures';
import { AccessibilityProvider } from './components/ui/AccessibilityFeatures';
import { UploadProgressProvider } from './components/ui/PerformanceIndicators';
import { UndoToastProvider } from './components/ui/UndoToast';
import { useNavigate } from 'react-router-dom';
import { startCleanupScheduler } from './services/CleanupService';
import { useSessionTimeout } from './hooks/useSessionTimeout';
import { SessionTimeoutWarning } from './components/ui/SessionTimeoutWarning';
import { cleanupExpiredBackups } from './utils/dataBackup';
import { supabase } from './services/supabase';
import helpArticles from './data/helpArticles';

// Start cleanup scheduler on app load
startCleanupScheduler();

// Cleanup expired backups on app load
cleanupExpiredBackups();

// Lazy load pages for code splitting using path aliases
const RoleSelectionPage = lazy(() => import('@/components/pages/RoleSelectionPage'));
const LoginPage = lazy(() => import('@/components/pages/LoginPage'));
const DashboardPage = lazy(() => import('@/components/pages/DashboardPage'));
const AttendancePage = lazy(() => import('@/components/pages/AttendancePage'));
const StudentsPage = lazy(() => import('@/components/pages/StudentsPage'));
const StudentDetailPage = lazy(() => import('@/components/pages/StudentDetailPage'));
const SchedulePage = lazy(() => import('@/components/pages/SchedulePage'));
const SettingsPage = lazy(() => import('@/components/pages/SettingsPage'));
const TasksPage = lazy(() => import('@/components/pages/TasksPage'));
const ReportPage = lazy(() => import('@/components/pages/ReportPage'));
const MassInputPage = lazy(() => import('@/components/pages/MassInputPage'));
const BulkGradeInputPage = lazy(() => import('@/components/pages/BulkGradeInputPage'));
const PortalLoginPage = lazy(() => import('@/components/pages/PortalLoginPage'));
// FIX: The lazy import for ParentPortalPage was failing because the component is a named export, not a default one.
// The import has been updated to correctly resolve the named export for React.lazy.
const ParentPortalPage = lazy(() => import('@/components/pages/ParentPortalPage').then(module => ({ default: module.ParentPortalPage })));
const TrashPage = lazy(() => import('@/components/pages/TrashPage'));
const ActionHistoryPage = lazy(() => import('@/components/pages/ActionHistoryPage'));
const AnalyticsPage = lazy(() => import('@/components/pages/AnalyticsPage'));


// A wrapper for routes that require authentication.
// It shows a loader while checking the session, redirects to login if not authenticated,
// or renders the main Layout with the requested page.
const PrivateRoutes = () => {
  const { session, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-50 dark:bg-gray-950">
        <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return session ? (
    <Layout>
      <Outlet />
    </Layout>
  ) : (
    <Navigate to="/guru-login" replace />
  );
};

const loadingSpinner = (
  <div className="flex items-center justify-center h-screen bg-gray-50 dark:bg-gray-950">
    <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
  </div>
);

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      refetchOnWindowFocus: false,
    },
  },
});

function App() {
  const { playClick } = useSound();

  React.useEffect(() => {
    const handleGlobalClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      // Find the closest interactive element
      const interactiveElement = target.closest('button, a, [role="button"], input, select, textarea, .glass-card') as HTMLElement | null;

      if (interactiveElement) {
        // Only play sound/animate if not already processing to avoid spam
        if (interactiveElement.dataset.isAnimating === 'true') return;

        playClick();

        // Add animation class if it's not already animating
        if (!interactiveElement.classList.contains('animate-subtle-pop')) {
          interactiveElement.dataset.isAnimating = 'true';
          interactiveElement.classList.add('animate-subtle-pop');

          setTimeout(() => {
            interactiveElement.classList.remove('animate-subtle-pop');
            delete interactiveElement.dataset.isAnimating;
          }, 400);
        }
      }
    };

    window.addEventListener('click', handleGlobalClick);
    return () => window.removeEventListener('click', handleGlobalClick);
  }, [playClick]);
  return (
    // FIX: All errors in ErrorBoundary are fixed by changing state initialization to a class property.
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <ThemeProvider>
          <AccessibilityProvider>
            <AuthProvider>
              <ToastProvider>
                <SyncProvider>
                  <UploadManagerProvider>
                    <UploadProgressProvider>
                      <UndoToastProvider>
                        <KeyboardShortcutsProvider>
                          <Suspense fallback={loadingSpinner}>
                            <BrowserRouter>
                              <AppContent />
                            </BrowserRouter>
                          </Suspense>
                        </KeyboardShortcutsProvider>
                      </UndoToastProvider>
                    </UploadProgressProvider>
                  </UploadManagerProvider>
                </SyncProvider>
              </ToastProvider>
            </AuthProvider>
          </AccessibilityProvider>
        </ThemeProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}

function AppContent() {
  const navigate = useNavigate();
  const [showHelp, setShowHelp] = React.useState(false);
  const [showShortcuts, setShowShortcuts] = React.useState(false);
  const { registerShortcut } = useKeyboardShortcuts();

  React.useEffect(() => {
    registerShortcut({
      key: '?',
      description: 'Panel Pintasan',
      category: 'Umum',
      action: () => setShowShortcuts(prev => !prev),
      modifiers: ['shift']
    });
  }, [registerShortcut]);

  // Session timeout - only for authenticated users
  const { session, logout } = useAuth();
  const { isWarningVisible, remainingSeconds, extendSession } = useSessionTimeout({
    warningTime: 25 * 60 * 1000, // 25 minutes
    logoutTime: 30 * 60 * 1000,  // 30 minutes
    onLogout: () => {
      if (session) {
        logout();
        navigate('/guru-login');
      }
    },
  });

  // Android Back Button Handler
  React.useEffect(() => {
    const setupBackButton = async () => {
      try {
        const { Capacitor } = await import('@capacitor/core');
        const { App: CapApp } = await import('@capacitor/app');

        if (Capacitor.isNativePlatform()) {
          const listener = await CapApp.addListener('backButton', ({ canGoBack }) => {
            const currentPath = window.location.pathname;

            // If on home/dashboard, exit app
            if (currentPath === '/' || currentPath === '/dashboard') {
              CapApp.exitApp();
            } else if (canGoBack || window.history.length > 1) {
              // Navigate back
              navigate(-1);
            } else {
              // Exit app as fallback
              CapApp.exitApp();
            }
          });

          return () => {
            listener.remove();
          };
        }
      } catch (error) {
        console.log('Back button handler not available on this platform');
      }
    };

    setupBackButton();
  }, [navigate]);

  // Real search handler using Supabase
  const handleSearch = async (query: string, type: string, _filters: unknown[]) => {
    if (!query || query.length < 2) return [];

    const results: { id: string; type: 'students' | 'classes' | 'schedule' | 'attendance' | 'tasks' | 'all'; title: string; subtitle: string }[] = [];
    const searchTerm = query.toLowerCase().trim();

    try {
      // Search students
      if (type === 'all' || type === 'students') {
        const { data: students } = await supabase
          .from('students')
          .select('id, name, class_id, classes(name)')
          .ilike('name', `%${searchTerm}%`)
          .limit(5);

        if (students) {
          students.forEach((student: any) => {
            results.push({
              id: student.id,
              type: 'students',
              title: student.name,
              subtitle: student.classes?.name || 'Tanpa Kelas',
            });
          });
        }
      }

      // Search classes
      if (type === 'all' || type === 'classes') {
        const { data: classes } = await supabase
          .from('classes')
          .select('id, name')
          .ilike('name', `%${searchTerm}%`)
          .limit(3);

        if (classes) {
          classes.forEach((cls: any) => {
            results.push({
              id: cls.id,
              type: 'classes',
              title: cls.name,
              subtitle: 'Kelas',
            });
          });
        }
      }

      // Search schedules/subjects
      if (type === 'all' || type === 'schedule') {
        const { data: schedules } = await supabase
          .from('schedules')
          .select('id, subject, day, classes(name)')
          .ilike('subject', `%${searchTerm}%`)
          .limit(3);

        if (schedules) {
          schedules.forEach((schedule: any) => {
            results.push({
              id: schedule.id,
              type: 'schedule',
              title: schedule.subject,
              subtitle: `${schedule.day} - ${schedule.classes?.name || ''}`,
            });
          });
        }
      }

      return results;
    } catch (error) {
      console.error('Search error:', error);
      return [];
    }
  };

  const handleSearchResult = (result: { id: string; type: string }) => {
    switch (result.type) {
      case 'students':
        navigate(`/siswa/${result.id}`);
        break;
      case 'classes':
        navigate('/siswa');
        break;
      case 'schedule':
        navigate('/jadwal');
        break;
      case 'attendance':
        navigate('/absensi');
        break;
      default:
        navigate('/dashboard');
    }
  };

  return (
    <GlobalSearchProvider onSearch={handleSearch}>
      <TourProvider>
        <Routes>
          <Route path="/" element={<RoleSelectionPage />} />
          <Route path="/guru-login" element={<LoginPage />} />
          <Route path="/portal-login" element={<PortalLoginPage />} />
          <Route path="/portal/:studentId" element={<ParentPortalPage />} />

          <Route element={<PrivateRoutes />}>
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/absensi" element={<AttendancePage />} />
            <Route path="/siswa" element={<StudentsPage />} />
            <Route path="/siswa/:studentId" element={<StudentDetailPage />} />
            <Route path="/jadwal" element={<SchedulePage />} />
            <Route path="/pengaturan" element={<SettingsPage />} />
            <Route path="/tugas" element={<TasksPage />} />
            <Route path="/input-massal" element={<MassInputPage />} />
            <Route path="/input-nilai-cepat" element={<BulkGradeInputPage />} />
            <Route path="/sampah" element={<TrashPage />} />
            <Route path="/riwayat" element={<ActionHistoryPage />} />
            <Route path="/analytics" element={<AnalyticsPage />} />
          </Route>

          {/* Report page has no main layout */}
          <Route path="/cetak-rapot/:studentId" element={<ReportPage />} />

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>

        <PwaPrompt />
        <OfflineBanner />
        <GlobalSearchModal onSelect={handleSearchResult} />
        <HelpButton onClick={() => setShowHelp(true)} />
        <HelpCenter
          isOpen={showHelp}
          onClose={() => setShowHelp(false)}
          articles={helpArticles}
        />
        <KeyboardShortcutsPanel isOpen={showShortcuts} onClose={() => setShowShortcuts(false)} />

        {/* Session Timeout Warning */}
        {session && (
          <SessionTimeoutWarning
            isOpen={isWarningVisible}
            remainingSeconds={remainingSeconds}
            onExtend={extendSession}
            onLogout={() => {
              logout();
              navigate('/guru-login');
            }}
          />
        )}
      </TourProvider>
    </GlobalSearchProvider>
  );
}

export default App;