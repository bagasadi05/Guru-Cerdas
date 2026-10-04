/**
 * Route Preloader Utility
 * 
 * Preloads code-split page chunks dynamically on user intent (hover on desktop, touch on mobile).
 * Extracted from App.tsx into an isolated utility to break circular dependencies
 * between App.tsx, Layout.tsx, DashboardSidebar.tsx, and EnhancedMobileBottomNav.tsx.
 */

export const preloadRoute = (path: string): void => {
  const baseRoute = path.split('/')[1]; // get the first part of the path
  switch (`/${baseRoute}`) {
    case '/dashboard':
      void import('@/components/pages/DashboardPage');
      break;
    case '/absensi':
      void import('@/components/pages/AttendancePage');
      break;
    case '/siswa':
      void import('@/components/pages/StudentsPage');
      void import('@/components/pages/StudentDetailPage');
      break;
    case '/jadwal':
    case '/jadwal-ph':
      void import('@/components/pages/SchedulePage');
      break;
    case '/pengaturan':
      void import('@/components/pages/SettingsPage');
      break;
    case '/tugas':
      void import('@/components/pages/TasksPage');
      break;
    case '/cetak-rapot':
      void import('@/components/pages/ReportPage');
      break;
    case '/input-massal':
      void import('@/components/pages/MassInputPage');
      break;
    case '/analytics':
      void import('@/components/pages/AnalyticsPage');
      break;
    case '/admin':
      void import('@/components/pages/AdminPage');
      break;
    case '/ekstrakurikuler':
      void import('@/components/pages/ExtracurricularPage');
      break;
    case '/brankas':
      void import('@/components/pages/BrankasPage');
      break;
    case '/pemulihan':
      void import('@/components/pages/PemulihanPage');
      break;
    case '/bintang':
      void import('@/components/pages/bintang/BintangDashboardPage');
      break;
    case '/perangkat-ajar':
    case '/modul-ajar':
      void import('@/components/pages/perangkat-ajar/PerangkatAjarPage');
      void import('@/components/pages/modul-ajar/ModulAjarCreatorPage');
      break;
  }
};

/**
 * Downloads the given routes' page chunks one at a time while the browser is
 * idle, so tapping a menu item doesn't wait on the network. Skipped when the
 * user has Data Saver on or is on a 2G connection.
 *
 * @returns a cancel function for effect cleanup.
 */
export const prefetchRoutesWhenIdle = (paths: string[]): (() => void) => {
  const connection = (navigator as Navigator & {
    connection?: { saveData?: boolean; effectiveType?: string };
  }).connection;
  if (connection?.saveData || /2g/.test(connection?.effectiveType ?? '')) return () => {};

  const queue = [...new Set(paths)];
  let handle: number | undefined;
  let cancelled = false;

  const schedule = (cb: () => void): number =>
    typeof window.requestIdleCallback === 'function'
      ? window.requestIdleCallback(cb, { timeout: 3000 })
      : window.setTimeout(cb, 500);

  const next = () => {
    if (cancelled) return;
    const path = queue.shift();
    if (!path) return;
    preloadRoute(path);
    handle = schedule(next);
  };

  handle = schedule(next);

  return () => {
    cancelled = true;
    if (handle === undefined) return;
    if (typeof window.cancelIdleCallback === 'function') window.cancelIdleCallback(handle);
    else window.clearTimeout(handle);
  };
};
