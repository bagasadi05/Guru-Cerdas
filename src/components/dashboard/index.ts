/**
 * @fileoverview Dashboard Components Index
 * 
 * Central export point for all dashboard-related components.
 * Import components from here instead of individual files.
 * 
 * @module components/dashboard
 * 
 * @example
 * ```typescript
 * import { 
 *   AiDashboardInsight, 
 *   InteractiveAttendanceChart,
 *   CollapsibleSection,
 *   ResponsiveGrid 
 * } from '@/components/dashboard';
 * ```
 */

// Core components
export { default as AiDashboardInsight } from './AiDashboardInsight';
export { default as WeeklyAttendanceChart } from './WeeklyAttendanceChart';
export { default as StatsGrid } from './StatsGrid';
export { default as GradeAuditWidget } from './GradeAuditWidget';

// Enhanced interactive components
export { InteractiveAttendanceChart } from './InteractiveAttendanceChart';
export type { DateRangeOption, AttendanceData, InteractiveAttendanceChartProps } from './InteractiveAttendanceChart';

// Mobile optimization components
export { CollapsibleSection } from './CollapsibleSection';
export type { CollapsibleSectionProps } from './CollapsibleSection';

export { ResponsiveGrid } from './ResponsiveGrid';
export type { ResponsiveGridProps, GridVariant } from './ResponsiveGrid';
