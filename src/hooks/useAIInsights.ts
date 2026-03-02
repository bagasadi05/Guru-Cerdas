/**
 * @fileoverview Custom hook for AI-powered dashboard insights
 * 
 * Handles AI insight generation, caching, and state management.
 * Automatically regenerates insights when the date changes.
 * 
 * @module hooks/useAIInsights
 */

import { useState, useEffect, useCallback } from 'react';
import {
  generateAIInsight,
  cacheInsight,
  getCachedInsight,
  getTodayDate,
  type AIInsight,
  type DashboardDataForAI,
} from '../services/aiInsightService';

export interface UseAIInsightsReturn {
  /** Current AI insight data */
  insight: AIInsight | null;
  /** Whether insight is being generated */
  isLoading: boolean;
  /** Error message if generation failed */
  error: string | null;
  /** Date when insight was last generated (YYYY-MM-DD) */
  lastGeneratedDate: string | null;
  /** Function to manually trigger insight generation */
  generateInsight: () => Promise<void>;
  /** Function to clear current insight */
  clearInsight: () => void;
}

/**
 * Custom hook for managing AI-powered dashboard insights.
 * 
 * Features:
 * - Automatic caching with localStorage
 * - Auto-regeneration on new day
 * - Manual generation trigger
 * - Loading and error states
 * 
 * @param dashboardData - Dashboard data for AI analysis
 * @param userId - User ID for cache isolation
 * @returns AI insights state and control functions
 * 
 * @example
 * ```tsx
 * const { insight, isLoading, generateInsight } = useAIInsights(data, user?.id);
 * 
 * if (isLoading) return <Skeleton />;
 * if (!insight) return <Button onClick={generateInsight}>Generate</Button>;
 * return <InsightDisplay insight={insight} />;
 * ```
 */
export const useAIInsights = (
  dashboardData: DashboardDataForAI | null,
  userId?: string | null
): UseAIInsightsReturn => {
  const [insight, setInsight] = useState<AIInsight | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastGeneratedDate, setLastGeneratedDate] = useState<string | null>(null);

  /**
   * Generates new AI insight from dashboard data.
   */
  const generateInsight = useCallback(async () => {
    if (!dashboardData) return;

    setIsLoading(true);
    setError(null);

    try {
      const generatedInsight = await generateAIInsight(dashboardData);
      const today = getTodayDate();

      // Save to cache
      cacheInsight(generatedInsight, userId);

      // Update state
      setInsight(generatedInsight);
      setLastGeneratedDate(today);
    } catch (err) {
      console.error('AI Insight Error:', err);
      setError('Gagal membuat wawasan AI. Silakan coba lagi.');
    } finally {
      setIsLoading(false);
    }
  }, [dashboardData, userId]);

  /**
   * Clears current insight from state and cache.
   */
  const clearInsight = useCallback(() => {
    setInsight(null);
    setLastGeneratedDate(null);
    setError(null);
  }, []);

  // Load cached insight on mount or when userId changes
  useEffect(() => {
    const cachedInsight = getCachedInsight(userId);

    if (cachedInsight) {
      setInsight(cachedInsight);
      setLastGeneratedDate(getTodayDate());
    }
  }, [userId]);

  // Auto-generate insight if data is available and cache is expired
  useEffect(() => {
    const today = getTodayDate();

    // Don't auto-generate if:
    // - No dashboard data
    // - Currently loading
    // - Already have insight for today
    // - There's an error
    if (
      !dashboardData ||
      isLoading ||
      (lastGeneratedDate === today && insight) ||
      error
    ) {
      return;
    }

    // Auto-generate if we have old insight or no insight at all
    if (lastGeneratedDate && lastGeneratedDate !== today) {
      generateInsight();
    }
  }, [dashboardData, isLoading, lastGeneratedDate, insight, error, generateInsight]);

  return {
    insight,
    isLoading,
    error,
    lastGeneratedDate,
    generateInsight,
    clearInsight,
  };
};
