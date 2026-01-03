/**
 * @fileoverview AI Dashboard Insight Component
 * 
 * This component displays AI-generated insights about class performance,
 * including positive highlights, areas needing attention, and daily suggestions.
 * 
 * Features:
 * - Automatic insight generation on new day
 * - Local storage caching to prevent redundant API calls
 * - Loading and error states
 * - Interactive student links
 * 
 * @module components/dashboard/AiDashboardInsight
 */

import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { SparklesIcon, CheckCircleIcon, AlertTriangleIcon } from '../Icons';
import { Button } from '../ui/Button';
import { Skeleton } from '../ui/Skeleton';
import { MarkdownText } from '../ui/MarkdownText';
import { generateOpenRouterJson } from '../../services/openRouterService';
import type { DashboardQueryData, AiInsight, StoredInsight } from '../../types';

// =============================================================================
// CONSTANTS
// =============================================================================

/**
 * LocalStorage key for caching AI insights.
 * Insights are cached per day to prevent redundant API calls.
 */
const AI_INSIGHT_STORAGE_KEY = 'portal_guru_ai_insight';

// =============================================================================
// TYPES
// =============================================================================

interface AiDashboardInsightProps {
    /** Dashboard data containing students, grades, and violations */
    dashboardData: DashboardQueryData | null;
}

interface StudentDataForPrompt {
    name: string;
    total_violation_points: number;
    average_score: number | 'N/A';
}

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Gets today's date in YYYY-MM-DD format.
 * Used for cache key comparison and insight date tracking.
 * 
 * @returns Today's date string in ISO format (YYYY-MM-DD)
 */
const getTodayDate = (): string => new Date().toISOString().split('T')[0];

/**
 * Builds the AI prompt for generating class insights.
 * 
 * @param students - Array of student data for analysis
 * @param studentCount - Total number of students
 * @param presentCount - Number of students present today
 * @returns Formatted prompt string for the AI
 */
const buildInsightPrompt = (
    students: StudentDataForPrompt[],
    studentCount: number,
    presentCount: number
): string => {
    return `Analisis data guru berikut untuk memberikan wawasan harian. Data Ringkasan: Total Siswa: ${studentCount}, Absensi Hari Ini: ${presentCount} dari ${studentCount} hadir. Data Rinci Siswa (nilai & pelanggaran): ${JSON.stringify(students)} Tugas Anda: 1. Identifikasi 1-2 siswa berprestasi (nilai rata-rata tinggi, 0 poin pelanggaran). 2. Identifikasi 1-2 siswa yang memerlukan perhatian (nilai rata-rata rendah atau poin pelanggaran tinggi). 3. Berikan satu saran fokus untuk kelas secara umum.`;
};

/**
 * System instruction for the AI model.
 * Defines the expected output format and language requirements.
 */
const SYSTEM_INSTRUCTION = `Anda adalah asisten guru AI yang cerdas dan proaktif. Analisis data yang diberikan dan hasilkan ringkasan dalam format JSON yang valid. Fokus pada menyoroti pencapaian positif, area yang memerlukan perhatian, dan saran umum. Gunakan Bahasa Indonesia.

Format JSON yang diharapkan:
{
    "positive_highlights": [{ "student_name": "Nama Siswa", "reason": "Alasan singkat" }],
    "areas_for_attention": [{ "student_name": "Nama Siswa", "reason": "Masalah/Concern" }],
    "class_focus_suggestion": "Saran fokus untuk kelas hari ini"
}`;

// =============================================================================
// COMPONENT
// =============================================================================

/**
 * AI-powered dashboard insight component.
 * 
 * Displays AI-generated analysis of student performance including:
 * - High-performing students (positive highlights)
 * - Students needing attention (areas for attention)
 * - Daily class focus suggestions
 * 
 * @param props - Component props
 * @param props.dashboardData - Dashboard data for analysis
 * 
 * @example
 * ```tsx
 * <AiDashboardInsight dashboardData={dashboardData} />
 * ```
 */
const AiDashboardInsight: React.FC<AiDashboardInsightProps> = ({ dashboardData }) => {
    const [insight, setInsight] = useState<AiInsight | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [lastGeneratedDate, setLastGeneratedDate] = useState<string | null>(null);

    /**
     * Generates AI insight based on dashboard data.
     * Caches the result in localStorage for the current day.
     */
    const generateInsight = useCallback(async () => {
        if (!dashboardData) return;

        setIsLoading(true);
        setError(null);

        try {
            const { students, academicRecords, violations, dailyAttendanceSummary } = dashboardData;

            // Create a map of student names to IDs for enriching the response
            const studentMap = new Map(students.map(s => [s.name, s.id]));

            // Prepare student data for the prompt
            const studentDataForPrompt: StudentDataForPrompt[] = students.map(s => {
                // Calculate total violation points for this student
                const studentViolations = violations
                    .filter(v => v.student_id === s.id)
                    .reduce((sum, v) => sum + v.points, 0);

                // Calculate average academic score for this student
                const studentScores = academicRecords.filter(r => r.student_id === s.id);
                const avgScore = studentScores.length > 0
                    ? studentScores.reduce((a, b) => a + b.score, 0) / studentScores.length
                    : null;

                return {
                    name: s.name,
                    total_violation_points: studentViolations,
                    average_score: avgScore ? Math.round(avgScore) : 'N/A'
                };
            });

            const prompt = buildInsightPrompt(
                studentDataForPrompt,
                students.length,
                dailyAttendanceSummary.present
            );

            // Generate insight via AI
            const parsedInsight = await generateOpenRouterJson<AiInsight>(prompt, SYSTEM_INSTRUCTION);

            // Enrich insight with student IDs for linking
            const enrichedInsight: AiInsight = {
                ...parsedInsight,
                positive_highlights: parsedInsight.positive_highlights.map(h => ({
                    ...h,
                    student_id: studentMap.get(h.student_name)
                })),
                areas_for_attention: parsedInsight.areas_for_attention.map(a => ({
                    ...a,
                    student_id: studentMap.get(a.student_name)
                }))
            };

            // Cache the insight with today's date
            const today = getTodayDate();
            const storedData: StoredInsight = { date: today, insight: enrichedInsight };
            localStorage.setItem(AI_INSIGHT_STORAGE_KEY, JSON.stringify(storedData));

            setInsight(enrichedInsight);
            setLastGeneratedDate(today);
        } catch (err) {
            console.error("AI Insight Error:", err);
            setError("Gagal membuat wawasan AI. Silakan coba lagi.");
        } finally {
            setIsLoading(false);
        }
    }, [dashboardData]);

    // Load cached insight on mount
    useEffect(() => {
        const stored = localStorage.getItem(AI_INSIGHT_STORAGE_KEY);
        if (stored) {
            try {
                const parsed: StoredInsight = JSON.parse(stored);
                const today = getTodayDate();

                if (parsed.date === today) {
                    // Same day - use cached insight
                    setInsight(parsed.insight);
                    setLastGeneratedDate(parsed.date);
                } else {
                    // Different day - clear old insight and auto-generate new one
                    setLastGeneratedDate(parsed.date);
                    if (dashboardData) {
                        generateInsight();
                    }
                }
            } catch (e) {
                console.error('Error parsing stored insight:', e);
            }
        }
    }, [dashboardData, generateInsight]);

    // Auto-generate insight if new day and data is available
    useEffect(() => {
        const today = getTodayDate();
        if (
            dashboardData &&
            lastGeneratedDate &&
            lastGeneratedDate !== today &&
            !isLoading &&
            !insight
        ) {
            generateInsight();
        }
    }, [dashboardData, lastGeneratedDate, isLoading, insight, generateInsight]);

    // ==========================================================================
    // RENDER STATES
    // ==========================================================================

    if (isLoading) {
        return (
            <div className="space-y-4">
                <Skeleton className="h-4 w-1/2" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-3/4" />
            </div>
        );
    }

    if (error) {
        return <p className="text-sm text-red-400">{error}</p>;
    }

    if (!insight) {
        return (
            <div className="text-center py-8">
                <Button
                    onClick={generateInsight}
                    disabled={isLoading || !dashboardData}
                    className="bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white border-0 shadow-lg shadow-indigo-500/20 transition-all hover:scale-105 rounded-full px-6"
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

    // ==========================================================================
    // MAIN RENDER
    // ==========================================================================

    return (
        <div className="space-y-4 text-sm animate-fade-in">
            {/* Positive Highlights Section */}
            {insight.positive_highlights?.length > 0 && (
                <div className="flex items-start gap-3 p-4 rounded-2xl bg-emerald-500/5 border border-emerald-500/10">
                    <div className="flex-shrink-0 w-8 h-8 rounded-full bg-emerald-500/20 flex items-center justify-center">
                        <CheckCircleIcon className="w-5 h-5 text-emerald-500" />
                    </div>
                    <div>
                        <p className="font-bold text-slate-800 dark:text-slate-200">
                            Siswa Berprestasi
                        </p>
                        {insight.positive_highlights.map(item => (
                            <p
                                key={item.student_name}
                                className="text-slate-600 dark:text-slate-400 mt-1"
                            >
                                <Link
                                    to={`/siswa/${item.student_id}`}
                                    className="font-semibold text-emerald-600 dark:text-emerald-400 hover:underline"
                                >
                                    {item.student_name}
                                </Link>
                                : <MarkdownText text={item.reason} />
                            </p>
                        ))}
                    </div>
                </div>
            )}

            {/* Areas for Attention Section */}
            {insight.areas_for_attention?.length > 0 && (
                <div className="flex items-start gap-3 p-4 rounded-2xl bg-amber-500/5 border border-amber-500/10">
                    <div className="flex-shrink-0 w-8 h-8 rounded-full bg-amber-500/20 flex items-center justify-center">
                        <AlertTriangleIcon className="w-5 h-5 text-amber-500" />
                    </div>
                    <div>
                        <p className="font-bold text-slate-800 dark:text-slate-200">
                            Perlu Perhatian
                        </p>
                        {insight.areas_for_attention.map(item => (
                            <p
                                key={item.student_name}
                                className="text-slate-600 dark:text-slate-400 mt-1"
                            >
                                <Link
                                    to={`/siswa/${item.student_id}`}
                                    className="font-semibold text-amber-600 dark:text-amber-400 hover:underline"
                                >
                                    {item.student_name}
                                </Link>
                                : <MarkdownText text={item.reason} />
                            </p>
                        ))}
                    </div>
                </div>
            )}

            {/* Class Focus Suggestion Section */}
            {insight.class_focus_suggestion && (
                <div className="flex items-start gap-3 p-4 rounded-2xl bg-indigo-500/5 border border-indigo-500/10">
                    <div className="flex-shrink-0 w-8 h-8 rounded-full bg-indigo-500/20 flex items-center justify-center">
                        <SparklesIcon className="w-5 h-5 text-indigo-500" />
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

export default AiDashboardInsight;
