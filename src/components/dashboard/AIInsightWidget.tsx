/**
 * @fileoverview AI Dashboard Insight Widget
 * 
 * Displays AI-generated insights about student performance and class focus.
 * 
 * @module components/dashboard/AIInsightWidget
 */

import React from 'react';
import { Link } from 'react-router-dom';
import { Button } from '../ui/Button';
import { Skeleton } from '../ui/Skeleton';
import { MarkdownText } from '../ui/MarkdownText';
import { CheckCircleIcon, AlertTriangleIcon, SparklesIcon } from '../Icons';
import { useAIInsights } from '../../hooks/useAIInsights';
import type { DashboardDataForAI } from '../../services/aiInsightService';

interface AIInsightWidgetProps {
  /** Dashboard data for AI analysis */
  dashboardData: DashboardDataForAI | null;
  /** User ID for cache isolation */
  userId?: string | null;
}

/**
 * AI-powered insight widget for dashboard.
 * 
 * Features:
 * - Automatic daily insight generation
 * - Highlights top-performing students
 * - Identifies students needing attention
 * - Provides class focus suggestions
 * - Cached for performance
 * 
 * @example
 * ```tsx
 * <AIInsightWidget 
 *   dashboardData={{ students, academicRecords, violations, dailyAttendanceSummary }}
 *   userId={user?.id}
 * />
 * ```
 */
export const AIInsightWidget: React.FC<AIInsightWidgetProps> = ({
  dashboardData,
  userId,
}) => {
  const { insight, isLoading, error, generateInsight } = useAIInsights(
    dashboardData,
    userId
  );

  // Loading state
  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-4 w-1/2" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-3/4" />
      </div>
    );
  }

  // Error state
  if (error) {
    return <p className="text-sm text-red-400">{error}</p>;
  }

  // Empty state - prompt to generate
  if (!insight) {
    return (
      <div className="text-center py-8">
        <Button
          onClick={generateInsight}
          disabled={isLoading || !dashboardData}
          variant="primary"
          className="px-6"
        >
          <SparklesIcon className="w-4 h-4 mr-2" />
          Buat Wawasan Harian AI
        </Button>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-3">
          Dapatkan ringkasan performa kelas hari ini.
        </p>
      </div>
    );
  }

  // Insight display
  return (
    <div className="space-y-4 text-sm animate-fade-in">
      {/* Positive Highlights */}
      {insight.positive_highlights?.length > 0 && (
        <div className="flex items-start gap-3 p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
          <div className="flex-shrink-0 w-8 h-8 rounded-full bg-emerald-500/20 flex items-center justify-center">
            <CheckCircleIcon className="w-5 h-5 text-emerald-500" />
          </div>
          <div>
            <p className="font-bold text-slate-800 dark:text-slate-200">
              Siswa Berprestasi
            </p>
            {insight.positive_highlights.map((item) => (
              <p
                key={item.student_name}
                className="text-slate-600 dark:text-slate-400 mt-1"
              >
                {item.student_id ? (
                  <Link
                    to={`/siswa/${item.student_id}`}
                    className="font-semibold text-emerald-600 dark:text-emerald-400 hover:underline"
                  >
                    {item.student_name}
                  </Link>
                ) : (
                  <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                    {item.student_name}
                  </span>
                )}
                : <MarkdownText text={item.reason} />
              </p>
            ))}
          </div>
        </div>
      )}

      {/* Areas for Attention */}
      {insight.areas_for_attention?.length > 0 && (
        <div className="flex items-start gap-3 p-4 rounded-xl bg-yellow-500/10 border border-yellow-500/20">
          <div className="flex-shrink-0 w-8 h-8 rounded-full bg-yellow-500/20 flex items-center justify-center">
            <AlertTriangleIcon className="w-5 h-5 text-yellow-500" />
          </div>
          <div>
            <p className="font-bold text-slate-800 dark:text-slate-200">
              Perlu Perhatian
            </p>
            {insight.areas_for_attention.map((item) => (
              <p
                key={item.student_name}
                className="text-slate-600 dark:text-slate-400 mt-1"
              >
                {item.student_id ? (
                  <Link
                    to={`/siswa/${item.student_id}`}
                    className="font-semibold text-yellow-600 dark:text-yellow-400 hover:underline"
                  >
                    {item.student_name}
                  </Link>
                ) : (
                  <span className="font-semibold text-yellow-600 dark:text-yellow-400">
                    {item.student_name}
                  </span>
                )}
                : <MarkdownText text={item.reason} />
              </p>
            ))}
          </div>
        </div>
      )}

      {/* Class Focus Suggestion */}
      {insight.class_focus_suggestion && (
        <div className="flex items-start gap-3 p-4 rounded-xl bg-blue-500/10 border border-blue-500/20">
          <div className="flex-shrink-0 w-8 h-8 rounded-full bg-blue-500/20 flex items-center justify-center">
            <SparklesIcon className="w-5 h-5 text-blue-500" />
          </div>
          <div>
            <p className="font-bold text-slate-800 dark:text-slate-200">
              Saran Hari Ini
            </p>
            <div className="text-slate-600 dark:text-slate-400 mt-1">
              <MarkdownText text={insight.class_focus_suggestion} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
