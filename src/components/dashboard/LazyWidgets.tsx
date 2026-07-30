/**
 * @fileoverview Lazy-loaded Dashboard Widget Components
 * 
 * Exports dashboard widgets with React.lazy() for code splitting.
 * This improves initial page load performance by deferring non-critical widget loading.
 * 
 * @module components/dashboard/LazyWidgets
 */

import { lazy } from 'react';

/**
 * Lazy-loaded Class Analytics Section
 * Shows per-class performance metrics
 */
export const LazyClassAnalyticsSection = lazy(() =>
  import('./ClassAnalyticsSection').then((module) => ({
    default: module.ClassAnalyticsSection,
  }))
);

/**
 * Lazy-loaded Leaderboard Card
 * Displays top-performing students gamification view
 */
export const LazyLeaderboardCard = lazy(() =>
  import('../gamification/LeaderboardCard').then((module) => ({
    default: module.LeaderboardCard,
  }))
);

/**
 * Lazy-loaded Attendance Stats Widget
 * Shows weekly attendance chart with trends
 */
export const LazyAttendanceStatsWidget = lazy(() =>
  import('./AttendanceStatsWidget')
);

/**
 * Lazy-loaded Parent Messages Widget
 * Displays recent parent communication
 */
export const LazyParentMessagesWidget = lazy(() =>
  import('./ParentMessagesWidget')
);

/**
 * Lazy-loaded Activity Feed Widget
 * Shows reminders and activity timeline
 */
export const LazyActivityFeedWidget = lazy(() =>
  import('./ActivityFeedWidget')
);

/**
 * Lazy-loaded school-wide attendance widget.
 * Only leadership roles render this, so classroom teachers never fetch it.
 */
export const LazySchoolAttendanceWidget = lazy(() =>
  import('./SchoolAttendanceWidget').then((module) => ({
    default: module.SchoolAttendanceWidget,
  }))
);

/**
 * Lazy-loaded school-wide violations widget.
 * Only leadership roles render this, so classroom teachers never fetch it.
 */
export const LazySchoolViolationsWidget = lazy(() =>
  import('./SchoolViolationsWidget').then((module) => ({
    default: module.SchoolViolationsWidget,
  }))
);

/**
 * Lazy-loaded Wall of Fame widget.
 * Sits well below the fold on every viewport.
 */
export const LazyWallOfFameWidget = lazy(() =>
  import('./WallOfFameWidget').then((module) => ({
    default: module.WallOfFameWidget,
  }))
);

/**
 * Lazy-loaded Smart Insights Panel.
 * Only leadership roles render this on the dashboard (school-wide analytics).
 */
export const LazySmartInsightsPanel = lazy(() =>
  import('../pages/analytics/SmartInsightsPanel')
);

/**
 * Lazy-loaded School Stats Grid.
 * Leadership-only widget showing school-wide metrics (students, classes,
 * teachers, attendance). Replaces the teacher-centric StatsGrid for
 * kepala_madrasah / waka_kesiswaan / admin.
 */
export const LazySchoolStatsGrid = lazy(() =>
  import('./SchoolStatsGrid')
);
