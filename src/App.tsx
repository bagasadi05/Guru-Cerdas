import './styles/designSystem.css';
import './styles/accessibility.css';
import './styles/print.css';

import React, { lazy, Suspense } from 'react';
import { BrowserRouter, Navigate, Outlet, Route, Routes } from 'react-router-dom';
import { useAuth } from './hooks/useAuth';
import { useClickSound } from './hooks/useClickSound';
import Layout from './components/Layout';
import PwaPrompt from './components/PwaPrompt';
import { QueryClient } from '@tanstack/query-core';
import { AppProviders } from './components/AppProviders';
import { OfflineBanner } from './components/StatusIndicators';
import { GlobalSearchProvider, GlobalSearchModal } from './components/SearchSystem';
import { TourProvider, HelpButton } from './components/OnboardingHelp';
import { SimpleHelpCenter } from './components/SimpleHelpCenter';
import { KeyboardShortcutsPanel, useKeyboardShortcuts } from './components/AdvancedFeatures';
import { useNavigate } from 'react-router-dom';
import { startCleanupScheduler } from './services/CleanupService';
import { useSessionTimeout } from './hooks/useSessionTimeout';
import { SessionTimeoutWarning } from './components/ui/SessionTimeoutWarning';
import { cleanupExpiredBackups } from './utils/dataBackup';
import { globalSearch, type SearchEntityType } from './services/SearchService';
import type { SearchResult } from './components/SearchSystem';
import { SkipToMainContent } from './utils/pageAccessibility';

// Start cleanup scheduler on app load
startCleanupScheduler();

// Cleanup expired backups on app load
void cleanupExpiredBackups();

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
const AdminPage = lazy(() => import('@/components/pages/AdminPage'));
const ExtracurricularPage = lazy(() => import('@/components/pages/ExtracurricularPage'));


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

function App() {
  useClickSound();
  const [queryClient] = React.useState(() => new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 1000 * 60 * 5, // 5 minutes
        refetchOnWindowFocus: false,
      },
    },
  }));

  return (
    <AppProviders queryClient={queryClient}>
      <Suspense fallback={loadingSpinner}>
        <BrowserRouter>
          <AppContent />
        </BrowserRouter>
      </Suspense>
    </AppProviders>
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
      } catch {
        console.log('Back button handler not available on this platform');
      }
    };

    setupBackButton();
  }, [navigate]);

  // Search handler delegating to SearchService for proper fuzzy matching & relevance ranking
  const handleSearch = React.useCallback(async (query: string, type: string): Promise<SearchResult[]> => {
    if (!session?.user?.id || !query || query.length < 2) return [];

    // Map SearchSystem's 'schedule' to SearchService's 'schedules'
    const entityType = (type === 'schedule' ? 'schedules' : type) as SearchEntityType;

    try {
      const serviceResults = await globalSearch(session.user.id, query, { entityType, limit: 10 });

      return serviceResults.map(r => ({
        id: r.id,
        // Map 'schedules' back to SearchSystem's 'schedule'
        type: (r.type === 'schedules' ? 'schedule' : r.type) as SearchResult['type'],
        title: r.title,
        subtitle: r.subtitle,
        metadata: r.metadata,
        relevance: r.relevance,
      }));
    } catch (error) {
      console.error('Search error:', error);
      return [];
    }
  }, [session?.user?.id]);

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
    <>
      <SkipToMainContent />
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
              <Route path="/ekstrakurikuler" element={<ExtracurricularPage />} />
              <Route path="/admin" element={<AdminPage />} />
            </Route>

            {/* Report page has no main layout */}
            <Route path="/cetak-rapot/:studentId" element={<ReportPage />} />

            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>

          <PwaPrompt />
          <OfflineBanner />
          <GlobalSearchModal onSelect={handleSearchResult} />
          <HelpButton onClick={() => setShowHelp(true)} />
          <SimpleHelpCenter
            isOpen={showHelp}
            onClose={() => setShowHelp(false)}
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
    </>
  );
}

export default App;