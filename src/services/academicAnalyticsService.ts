/**
 * @fileoverview Academic Analytics Service
 *
 * Business logic for the enhanced Academic Analysis tab.
 * Provides per-subject statistics, trend analysis, KKTP gap detection,
 * and AI-powered academic insights.
 *
 * @module services/academicAnalyticsService
 */

import { generateGeminiJson } from './geminiService';
import { logger } from './logger';
import type {
    Student,
    AnalyticsAcademicRecord,
    GradeDistribution,
} from '../components/pages/analytics/types';

// =============================================================================
// TYPES
// =============================================================================

export interface SubjectStats {
    subject: string;
    studentCount: number;
    assessmentCount: number;
    average: number;
    highest: number;
    lowest: number;
    distribution: GradeDistribution[];
    kktpStatus: 'safe' | 'warning' | 'critical';
    kktpGap: number;
    trend: 'up' | 'down' | 'stable';
    trendDelta: number;
}

export interface AcademicKPI {
    overallAverage: number;
    averageTrend: number;
    assessedStudents: number;
    totalStudents: number;
    subjectsBelowKKTP: number;
    totalSubjects: number;
    completionRate: number;
}

export interface TrendDataPoint {
    date: string;
    label: string;
    average: number;
    count: number;
}

export interface SubjectTrendData {
    subject: string;
    data: TrendDataPoint[];
    color: string;
}

export interface AcademicInsight {
    id: string;
    severity: 'high' | 'warning' | 'info' | 'good';
    title: string;
    detail: string;
    cta?: { label: string; action: string };
}

export interface StudentBelowKKTP {
    studentId: string;
    studentName: string;
    className: string;
    subject: string;
    average: number;
    gap: number;
}

// =============================================================================
// CONSTANTS
// =============================================================================

export const DEFAULT_KKTP = 75;

const SUBJECT_COLORS = [
    '#6366f1', '#22c55e', '#f59e0b', '#ef4444', '#8b5cf6',
    '#06b6d4', '#ec4899', '#14b8a6', '#f97316', '#3b82f6',
];

// =============================================================================
// 1. PER-SUBJECT STATISTICS
// =============================================================================

export function calculateSubjectStats(
    academicRecords: AnalyticsAcademicRecord[],
    students: Student[],
    kktpThreshold: number = DEFAULT_KKTP,
): SubjectStats[] {
    const bySubject = new Map<string, AnalyticsAcademicRecord[]>();
    academicRecords.forEach((r) => {
        const subj = r.subject || 'Umum';
        const list = bySubject.get(subj) || [];
        list.push(r);
        bySubject.set(subj, list);
    });

    return Array.from(bySubject.entries()).map(([subject, records]) => {
        const scores = records.map((r) => Number(r.score) || 0);
        const average = Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);
        const highest = Math.max(...scores);
        const lowest = Math.min(...scores);

        const uniqueStudents = new Set(records.map((r) => r.student_id));
        const studentCount = uniqueStudents.size;
        const assessmentCount = new Set(records.map((r) => r.assessment_name || 'Umum')).size;

        // Distribution
        const studentAverages = new Map<string, number>();
        uniqueStudents.forEach((sid) => {
            const sScores = records.filter((r) => r.student_id === sid).map((r) => Number(r.score) || 0);
            studentAverages.set(sid, sScores.reduce((a, b) => a + b, 0) / sScores.length);
        });

        const distribution: GradeDistribution[] = [
            { label: 'A', range: '90-100', count: 0, color: '#22c55e', percentage: 0 },
            { label: 'B', range: '80-89', count: 0, color: '#3b82f6', percentage: 0 },
            { label: 'C', range: '70-79', count: 0, color: '#eab308', percentage: 0 },
            { label: 'D', range: '60-69', count: 0, color: '#f97316', percentage: 0 },
            { label: 'E', range: '<60', count: 0, color: '#ef4444', percentage: 0 },
        ];

        studentAverages.forEach((avg) => {
            if (avg >= 90) distribution[0].count++;
            else if (avg >= 80) distribution[1].count++;
            else if (avg >= 70) distribution[2].count++;
            else if (avg >= 60) distribution[3].count++;
            else distribution[4].count++;
        });

        distribution.forEach((d) => {
            d.percentage = studentCount > 0 ? Math.round((d.count / studentCount) * 100) : 0;
        });

        // KKTP status
        const kktpGap = average - kktpThreshold;
        let kktpStatus: SubjectStats['kktpStatus'] = 'safe';
        if (average < kktpThreshold - 7) kktpStatus = 'critical';
        else if (average < kktpThreshold) kktpStatus = 'warning';

        // Trend: compare first half vs second half of records sorted by date
        let trend: SubjectStats['trend'] = 'stable';
        let trendDelta = 0;
        if (scores.length >= 4) {
            const sorted = [...records].sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
            const half = Math.floor(sorted.length / 2);
            const firstAvg = sorted.slice(0, half).reduce((s, r) => s + (Number(r.score) || 0), 0) / half;
            const secondAvg = sorted.slice(half).reduce((s, r) => s + (Number(r.score) || 0), 0) / (sorted.length - half);
            trendDelta = Math.round(secondAvg - firstAvg);
            if (trendDelta >= 3) trend = 'up';
            else if (trendDelta <= -3) trend = 'down';
        }

        return {
            subject,
            studentCount,
            assessmentCount,
            average,
            highest,
            lowest,
            distribution,
            kktpStatus,
            kktpGap,
            trend,
            trendDelta,
        };
    }).sort((a, b) => a.subject.localeCompare(b.subject, 'id'));
}

// =============================================================================
// 2. ACADEMIC KPI CALCULATION
// =============================================================================

export function calculateAcademicKPI(
    academicRecords: AnalyticsAcademicRecord[],
    students: Student[],
    subjectStats: SubjectStats[],
    _kktpThreshold: number = DEFAULT_KKTP,
): AcademicKPI {
    const scores = academicRecords.map((r) => Number(r.score) || 0);
    const overallAverage = scores.length > 0 ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 0;

    const assessedStudentIds = new Set(academicRecords.map((r) => r.student_id));
    const assessedStudents = assessedStudentIds.size;
    const totalStudents = students.length;

    const subjectsBelowKKTP = subjectStats.filter((s) => s.kktpStatus !== 'safe').length;
    const totalSubjects = subjectStats.length;

    const completionRate = totalStudents > 0 ? Math.round((assessedStudents / totalStudents) * 100) : 0;

    // Average trend: compare recent records vs older records
    let averageTrend = 0;
    if (scores.length >= 4) {
        const sorted = [...academicRecords].sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
        const half = Math.floor(sorted.length / 2);
        const firstAvg = sorted.slice(0, half).reduce((s, r) => s + (Number(r.score) || 0), 0) / half;
        const secondAvg = sorted.slice(half).reduce((s, r) => s + (Number(r.score) || 0), 0) / (sorted.length - half);
        averageTrend = Math.round(secondAvg - firstAvg);
    }

    return {
        overallAverage,
        averageTrend,
        assessedStudents,
        totalStudents,
        subjectsBelowKKTP,
        totalSubjects,
        completionRate,
    };
}

// =============================================================================
// 3. TREND DATA (TIME SERIES)
// =============================================================================

export function calculateAcademicTrends(
    academicRecords: AnalyticsAcademicRecord[],
    subjects: string[],
): SubjectTrendData[] {
    return subjects.map((subject, idx) => {
        const records = academicRecords
            .filter((r) => (r.subject || 'Umum') === subject)
            .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());

        // Group by week
        const weekMap = new Map<string, { sum: number; count: number }>();
        records.forEach((r) => {
            const d = new Date(r.created_at);
            const weekStart = new Date(d);
            weekStart.setDate(d.getDate() - d.getDay());
            const key = weekStart.toISOString().split('T')[0];
            const existing = weekMap.get(key) || { sum: 0, count: 0 };
            existing.sum += Number(r.score) || 0;
            existing.count += 1;
            weekMap.set(key, existing);
        });

        const data: TrendDataPoint[] = Array.from(weekMap.entries())
            .sort(([a], [b]) => a.localeCompare(b))
            .map(([date, { sum, count }]) => ({
                date,
                label: new Date(date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' }),
                average: Math.round(sum / count),
                count,
            }));

        return {
            subject,
            data,
            color: SUBJECT_COLORS[idx % SUBJECT_COLORS.length],
        };
    });
}

// =============================================================================
// 4. STUDENTS BELOW KKTP
// =============================================================================

export function findStudentsBelowKKTP(
    academicRecords: AnalyticsAcademicRecord[],
    students: Student[],
    classes: Array<{ id: string; name: string }>,
    kktpThreshold: number = DEFAULT_KKTP,
): StudentBelowKKTP[] {
    const studentMap = new Map(students.map((s) => [s.id, s]));
    const classMap = new Map(classes.map((c) => [c.id, c.name]));

    const byStudentSubject = new Map<string, Map<string, number[]>>();
    academicRecords.forEach((r) => {
        const subj = r.subject || 'Umum';
        let subjMap = byStudentSubject.get(r.student_id);
        if (!subjMap) {
            subjMap = new Map();
            byStudentSubject.set(r.student_id, subjMap);
        }
        const scores = subjMap.get(subj) || [];
        scores.push(Number(r.score) || 0);
        subjMap.set(subj, scores);
    });

    const results: StudentBelowKKTP[] = [];
    byStudentSubject.forEach((subjMap, studentId) => {
        const student = studentMap.get(studentId);
        if (!student) return;
        subjMap.forEach((scores, subject) => {
            const avg = Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);
            if (avg < kktpThreshold) {
                results.push({
                    studentId,
                    studentName: student.name,
                    className: classMap.get(student.class_id || '') || '-',
                    subject,
                    average: avg,
                    gap: avg - kktpThreshold,
                });
            }
        });
    });

    return results.sort((a, b) => a.gap - b.gap);
}

// =============================================================================
// 5. AI ACADEMIC INSIGHTS
// =============================================================================

export function generateOfflineAcademicInsights(
    subjectStats: SubjectStats[],
    kpi: AcademicKPI,
    studentsBelowKKTP: StudentBelowKKTP[],
): AcademicInsight[] {
    const insights: AcademicInsight[] = [];

    // Critical subjects
    const criticalSubjects = subjectStats.filter((s) => s.kktpStatus === 'critical');
    if (criticalSubjects.length > 0) {
        insights.push({
            id: 'critical-subjects',
            severity: 'high',
            title: `${criticalSubjects.length} mapel di bawah KKTP`,
            detail: `${criticalSubjects.map((s) => s.subject).join(', ')} — rata-rata jauh di bawah target ${DEFAULT_KKTP}. Perlu remedial segera.`,
            cta: { label: 'Lihat detail mapel', action: 'scroll-subjects' },
        });
    }

    // Declining trends
    const declining = subjectStats.filter((s) => s.trend === 'down');
    if (declining.length > 0) {
        insights.push({
            id: 'declining-trends',
            severity: 'warning',
            title: `Tren penurunan di ${declining.length} mapel`,
            detail: `${declining.map((s) => `${s.subject} (${s.trendDelta})`).join(', ')} — nilai menurun dibanding periode sebelumnya.`,
        });
    }

    // Many students below KKTP
    if (studentsBelowKKTP.length > 5) {
        const uniqueStudents = new Set(studentsBelowKKTP.map((s) => s.studentId));
        insights.push({
            id: 'many-below-kktp',
            severity: 'high',
            title: `${uniqueStudents.size} siswa di bawah KKTP`,
            detail: `Terdapat ${studentsBelowKKTP.length} kombinasi siswa-mapel yang belum mencapai target KKTP.`,
            cta: { label: 'Lihat daftar siswa', action: 'scroll-kktp' },
        });
    }

    // Low completion rate
    if (kpi.completionRate < 80 && kpi.totalStudents > 0) {
        insights.push({
            id: 'low-completion',
            severity: 'warning',
            title: `Kelengkapan penilaian ${kpi.completionRate}%`,
            detail: `${kpi.totalStudents - kpi.assessedStudents} siswa belum memiliki nilai. Segera lengkapi penilaian.`,
            cta: { label: 'Input nilai', action: 'navigate-input' },
        });
    }

    // Positive: all good
    if (insights.length === 0) {
        insights.push({
            id: 'all-good',
            severity: 'good',
            title: 'Semua mapel dalam kondisi baik',
            detail: `Rata-rata keseluruhan ${kpi.overallAverage} — seluruh mapel memenuhi target KKTP. Pertahankan!`,
        });
    }

    return insights;
}

export async function generateAIAcademicInsights(
    subjectStats: SubjectStats[],
    kpi: AcademicKPI,
    studentsBelowKKTP: StudentBelowKKTP[],
    className: string,
): Promise<AcademicInsight[]> {
    const offline = generateOfflineAcademicInsights(subjectStats, kpi, studentsBelowKKTP);

    const systemInstruction = `Anda adalah asisten analisis akademik guru madrasah Indonesia.
Analisis data nilai siswa dan hasilkan insight dalam format JSON array.
Setiap insight memiliki: id (string), severity ("high"|"warning"|"info"|"good"), title (singkat), detail (1-2 kalimat).
Maksimal 4 insight, prioritaskan yang paling kritis.
Gunakan Bahasa Indonesia.`;

    const prompt = `Data Akademik ${className}:
- Rata-rata keseluruhan: ${kpi.overallAverage}
- Tren: ${kpi.averageTrend > 0 ? '+' : ''}${kpi.averageTrend} poin
- Siswa sudah dinilai: ${kpi.assessedStudents}/${kpi.totalStudents}
- Mapel di bawah KKTP: ${kpi.subjectsBelowKKTP}/${kpi.totalSubjects}

Detail per mapel:
${subjectStats.map((s) => `- ${s.subject}: avg ${s.average}, tren ${s.trend} (${s.trendDelta > 0 ? '+' : ''}${s.trendDelta}), KKTP: ${s.kktpStatus}`).join('\n')}

Siswa di bawah KKTP: ${studentsBelowKKTP.length} kombinasi siswa-mapel
${studentsBelowKKTP.slice(0, 5).map((s) => `- ${s.studentName} (${s.className}): ${s.subject} = ${s.average}`).join('\n')}`;

    try {
        const response = await generateGeminiJson<AcademicInsight[]>(prompt, systemInstruction, 'insight');
        if (Array.isArray(response) && response.length > 0) {
            return response.map((r, i) => ({
                id: r.id || `ai-${i}`,
                severity: r.severity || 'info',
                title: r.title || '',
                detail: r.detail || '',
                cta: r.cta,
            }));
        }
        return offline;
    } catch (error) {
        logger.warn('AI academic insights failed, using offline fallback', 'AcademicAnalytics', error);
        return offline;
    }
}
