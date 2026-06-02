import './styles/designSystem.css';
import './styles/accessibility.css';
import './styles/mobilePolish.css';
import './styles/print.css';
import './styles/shellStyles.css';

import React, { lazy, Suspense } from 'react';
import { BrowserRouter, Navigate, Outlet, Route, Routes } from 'react-router-dom';
import { AsyncErrorBoundary } from './components/ErrorBoundary';
import { useAuth } from './hooks/useAuth';
import { useClickSound } from './hooks/useClickSound';
import Layout from './components/Layout';
import PwaPrompt from './components/PwaPrompt';
import { queryClient } from './services/queryClient';
import { AppProviders } from './components/AppProviders';
import { OfflineBanner } from './components/StatusIndicators';
import { GlobalSearchProvider, GlobalSearchModal } from './components/SearchSystem';
import { TourProvider, HelpButton } from './components/OnboardingHelp';
import { SimpleHelpCenter } from './components/SimpleHelpCenter';
import { KeyboardShortcutsPanel } from './components/advanced-features/KeyboardShortcutsPanel';
import { useKeyboardShortcuts } from './components/advanced-features/useKeyboardShortcuts';
import { startCleanupScheduler } from './services/CleanupService';
import { useSessionTimeout } from './hooks/useSessionTimeout';
import { SessionTimeoutWarning } from './components/ui/SessionTimeoutWarning';
import { cleanupExpiredBackups } from './utils/dataBackup';
import { SkipToMainContent } from './utils/pageAccessibility';
import { useAndroidBackButton } from './hooks/useAndroidBackButton';
import { useAppSearch } from './hooks/useAppSearch';
import { useNavigate } from 'react-router-dom';

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
const NotFoundPage = lazy(() => import('@/components/pages/NotFoundPage'));
const BrankasPage = lazy(() => import('@/components/pages/BrankasPage'));


// A wrapper for routes that require authentication.
// It shows a loader while checking the session, redirects to login if not authenticated,
// or renders the main Layout with the requested page.
const AppLoadingScreen = () => (
  <div className="flex items-center justify-center h-screen bg-slate-50 dark:bg-slate-950">
    <div className="w-16 h-16 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
  </div>
);

const PrivateRoutes = () => {
  const { session, loading } = useAuth();

  if (loading) {
    return <AppLoadingScreen />;
  }

  return session ? (
    <Layout>
      <Outlet />
    </Layout>
  ) : (
    <Navigate to="/guru-login" replace />
  );
};

const loadingSpinner = <AppLoadingScreen />;

function App() {
  useClickSound();

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

  // Extracted hooks
  useAndroidBackButton();
  const { handleSearch, handleSearchResult } = useAppSearch();

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

  return (
    <>
      <SkipToMainContent />
      <GlobalSearchProvider onSearch={handleSearch}>
        <TourProvider>
          <Routes>
            <Route path="/" element={<AsyncErrorBoundary context="RoleSelectionPage"><RoleSelectionPage /></AsyncErrorBoundary>} />
            <Route path="/guru-login" element={<AsyncErrorBoundary context="LoginPage"><LoginPage /></AsyncErrorBoundary>} />
            <Route path="/portal-login" element={<AsyncErrorBoundary context="PortalLoginPage"><PortalLoginPage /></AsyncErrorBoundary>} />
            <Route path="/portal/:studentId" element={<AsyncErrorBoundary context="ParentPortalPage"><ParentPortalPage /></AsyncErrorBoundary>} />

            <Route element={<PrivateRoutes />}>
              <Route path="/dashboard" element={<AsyncErrorBoundary context="DashboardPage"><DashboardPage /></AsyncErrorBoundary>} />
              <Route path="/absensi" element={<AsyncErrorBoundary context="AttendancePage"><AttendancePage /></AsyncErrorBoundary>} />
              <Route path="/siswa" element={<AsyncErrorBoundary context="StudentsPage"><StudentsPage /></AsyncErrorBoundary>} />
              <Route path="/brankas" element={<AsyncErrorBoundary context="BrankasPage"><BrankasPage /></AsyncErrorBoundary>} />
              <Route path="/siswa/:studentId" element={<AsyncErrorBoundary context="StudentDetailPage"><StudentDetailPage /></AsyncErrorBoundary>} />
              <Route path="/jadwal" element={<AsyncErrorBoundary context="SchedulePage"><SchedulePage /></AsyncErrorBoundary>} />
              <Route path="/pengaturan" element={<AsyncErrorBoundary context="SettingsPage"><SettingsPage /></AsyncErrorBoundary>} />
              <Route path="/tugas" element={<AsyncErrorBoundary context="TasksPage"><TasksPage /></AsyncErrorBoundary>} />
              <Route path="/input-massal" element={<AsyncErrorBoundary context="MassInputPage"><MassInputPage /></AsyncErrorBoundary>} />
              <Route path="/input-nilai-cepat" element={<AsyncErrorBoundary context="BulkGradeInputPage"><BulkGradeInputPage /></AsyncErrorBoundary>} />
              <Route path="/sampah" element={<AsyncErrorBoundary context="TrashPage"><TrashPage /></AsyncErrorBoundary>} />
              <Route path="/riwayat" element={<AsyncErrorBoundary context="ActionHistoryPage"><ActionHistoryPage /></AsyncErrorBoundary>} />
              <Route path="/analytics" element={<AsyncErrorBoundary context="AnalyticsPage"><AnalyticsPage /></AsyncErrorBoundary>} />
              <Route path="/ekstrakurikuler" element={<AsyncErrorBoundary context="ExtracurricularPage"><ExtracurricularPage /></AsyncErrorBoundary>} />
              <Route path="/admin" element={<AsyncErrorBoundary context="AdminPage"><AdminPage /></AsyncErrorBoundary>} />
            </Route>

            {/* Report page has no main layout */}
            <Route path="/cetak-rapot/:studentId" element={<AsyncErrorBoundary context="ReportPage"><ReportPage /></AsyncErrorBoundary>} />

            <Route path="*" element={<AsyncErrorBoundary context="NotFoundPage"><NotFoundPage /></AsyncErrorBoundary>} />
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
