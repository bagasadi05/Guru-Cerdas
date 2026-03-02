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
