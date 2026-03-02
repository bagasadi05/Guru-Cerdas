/**
 * @fileoverview AI Insight Service for Dashboard
 * 
 * Handles AI-powered insights generation and caching for dashboard analytics.
 * Uses OpenRouter API to generate daily insights about student performance.
 * 
 * @module services/aiInsightService
 */

import { generateOpenRouterJson } from './openRouterService';
import type { Database } from './database.types';

// =============================================================================
// TYPES
// =============================================================================

type StudentRow = Database['public']['Tables']['students']['Row'];
type AcademicRecord = Database['public']['Tables']['academic_records']['Row'];
type Violation = Database['public']['Tables']['violations']['Row'];

export interface AIInsight {
  positive_highlights: Array<{
    student_name: string;
    reason: string;
    student_id?: string;
  }>;
  areas_for_attention: Array<{
    student_name: string;
    reason: string;
    student_id?: string;
  }>;
  class_focus_suggestion: string;
}

export interface DashboardDataForAI {
  students: Pick<StudentRow, 'id' | 'name'>[];
  academicRecords: Pick<AcademicRecord, 'student_id' | 'subject' | 'score'>[];
  violations: Pick<Violation, 'student_id' | 'points'>[];
  dailyAttendanceSummary: { present: number; total: number };
}

interface StoredInsight {
  date: string; // YYYY-MM-DD format
  insight: AIInsight;
}

// =============================================================================
// CONSTANTS
// =============================================================================

const AI_INSIGHT_STORAGE_KEY = 'portal_guru_ai_insight';

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Gets today's date in YYYY-MM-DD format.
 */
export const getTodayDate = (): string => {
  return new Date().toISOString().split('T')[0];
};

/**
 * Generates storage key for user-specific insights.
 */
export const getInsightStorageKey = (userId?: string | null): string => {
  return userId ? `${AI_INSIGHT_STORAGE_KEY}:${userId}` : AI_INSIGHT_STORAGE_KEY;
};

/**
 * Normalizes student name for matching.
 */
const normalizeStudentName = (name: string): string => {
  return name.trim().toLowerCase();
};

/**
 * Creates a map of student names to their IDs.
 */
const createStudentNameMap = (
  students: Pick<StudentRow, 'id' | 'name'>[]
): Map<string, string[]> => {
  const nameMap = new Map<string, string[]>();
  
  students.forEach((student) => {
    const key = normalizeStudentName(student.name);
    const existing = nameMap.get(key);
    
    if (existing) {
      existing.push(student.id);
    } else {
      nameMap.set(key, [student.id]);
    }
  });
  
  return nameMap;
};

/**
 * Resolves student ID from name (only if unique).
 */
const resolveStudentId = (
  name: string,
  nameMap: Map<string, string[]>
): string | undefined => {
  const ids = nameMap.get(normalizeStudentName(name));
  return ids && ids.length === 1 ? ids[0] : undefined;
};

// =============================================================================
// AI INSIGHT GENERATION
// =============================================================================

/**
 * Generates AI-powered insights for dashboard.
 * 
 * @param dashboardData - Dashboard data containing students, grades, violations
 * @returns AI-generated insights with student performance analysis
 */
export const generateAIInsight = async (
  dashboardData: DashboardDataForAI
): Promise<AIInsight> => {
  const { students, academicRecords, violations, dailyAttendanceSummary } = dashboardData;

  // Prepare student data for AI prompt
  const studentDataForPrompt = students.map((student) => {
    // Calculate total violation points for student
    const studentViolations = violations
      .filter((v) => v.student_id === student.id)
      .reduce((sum, v) => sum + v.points, 0);

    // Calculate average score for student
    const studentScores = academicRecords.filter((r) => r.student_id === student.id);
    const avgScore =
      studentScores.length > 0
        ? studentScores.reduce((a, b) => a + b.score, 0) / studentScores.length
        : null;

    return {
      name: student.name,
      total_violation_points: studentViolations,
      average_score: avgScore ? Math.round(avgScore) : 'N/A',
    };
  });

  // AI System instruction
  const systemInstruction = `Anda adalah asisten guru AI yang cerdas dan proaktif. Analisis data yang diberikan dan hasilkan ringkasan dalam format JSON yang valid. Fokus pada menyoroti pencapaian positif, area yang memerlukan perhatian, dan saran umum. Gunakan Bahasa Indonesia.

Format JSON yang diharapkan:
{
  "positive_highlights": [{ "student_name": "Nama Siswa", "reason": "Alasan singkat" }],
  "areas_for_attention": [{ "student_name": "Nama Siswa", "reason": "Masalah/Concern" }],
  "class_focus_suggestion": "Saran fokus untuk kelas hari ini"
}`;

  // AI prompt with data
  const prompt = `Analisis data guru berikut untuk memberikan wawasan harian.

Data Ringkasan:
- Total Siswa: ${students.length}
- Absensi Hari Ini: ${dailyAttendanceSummary.present} dari ${students.length} hadir

Data Rinci Siswa (nilai & pelanggaran):
${JSON.stringify(studentDataForPrompt)}

Tugas Anda:
1. Identifikasi 1-2 siswa berprestasi (nilai rata-rata tinggi, 0 poin pelanggaran).
2. Identifikasi 1-2 siswa yang memerlukan perhatian (nilai rata-rata rendah atau poin pelanggaran tinggi).
3. Berikan satu saran fokus untuk kelas secara umum.`;

  // Generate insight using OpenRouter
  const parsedInsight = await generateOpenRouterJson<AIInsight>(prompt, systemInstruction);

  // Create name-to-ID map for student resolution
  const studentNameMap = createStudentNameMap(students);

  // Enrich insight with student IDs
  const enrichedInsight: AIInsight = {
    ...parsedInsight,
    positive_highlights: (parsedInsight.positive_highlights || []).map((h) => ({
      ...h,
      student_id: resolveStudentId(h.student_name, studentNameMap),
    })),
    areas_for_attention: (parsedInsight.areas_for_attention || []).map((a) => ({
      ...a,
      student_id: resolveStudentId(a.student_name, studentNameMap),
    })),
  };

  return enrichedInsight;
};

// =============================================================================
// CACHE MANAGEMENT
// =============================================================================

/**
 * Saves insight to localStorage with timestamp.
 */
export const cacheInsight = (insight: AIInsight, userId?: string | null): void => {
  const storageKey = getInsightStorageKey(userId);
  const today = getTodayDate();
  const storedData: StoredInsight = { date: today, insight };
  
  try {
    localStorage.setItem(storageKey, JSON.stringify(storedData));
  } catch (error) {
    console.error('Failed to cache AI insight:', error);
  }
};

/**
 * Retrieves cached insight from localStorage.
 * Returns null if cache is invalid or expired.
 */
export const getCachedInsight = (userId?: string | null): AIInsight | null => {
  const storageKey = getInsightStorageKey(userId);
  const stored = localStorage.getItem(storageKey);
  
  if (!stored) return null;
  
  try {
    const parsed: StoredInsight = JSON.parse(stored);
    const today = getTodayDate();
    
    // Check if cached insight is from today
    if (parsed.date === today) {
      return parsed.insight;
    }
    
    // Cache expired - return null
    return null;
  } catch (error) {
    console.error('Error parsing stored insight:', error);
    return null;
  }
};

/**
 * Clears cached insight from localStorage.
 */
export const clearInsightCache = (userId?: string | null): void => {
  const storageKey = getInsightStorageKey(userId);
  localStorage.removeItem(storageKey);
};

/**
 * Checks if cached insight exists and is valid for today.
 */
export const hasCachedInsightForToday = (userId?: string | null): boolean => {
  return getCachedInsight(userId) !== null;
};
