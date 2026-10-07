/**
 * @fileoverview Academic Analytics Service
 *
 * Business logic for the Academic Analysis tab: per-subject statistics,
 * trends, KKTP gaps, grade completeness and insights.
 *
 * Averages are defined once here so every card, chart and export agrees:
 * a student's average weights each subject equally, and a group average is
 * the mean of its students' averages.
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
    /** Assessments the trend compares; null when the subject has fewer than two. */
    trendFrom: string | null;
    trendTo: string | null;
}

export interface AcademicKPI {
    overallAverage: number;
    averageTrend: number;
    assessedStudents: number;
    totalStudents: number;
    studentCoverageRate: number;
    subjectsBelowKKTP: number;
    totalSubjects: number;
    studentsBelowKKTP: number;
    /** Filled grades / grades expected for assessments already given to each class. */
    gradeCompleteness: number;
    expectedGradeCount: number;
    missingGradeCount: number;
}

export interface OverallGradeStats {
    distribution: GradeDistribution[];
    overallAverage: number;
    totalStudentsWithGrades: number;
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

export const INSIGHT_ACTIONS = ['scroll-subjects', 'scroll-below-kktp', 'scroll-completion', 'navigate-input'] as const;
export type InsightAction = typeof INSIGHT_ACTIONS[number];

export interface AcademicInsight {
    id: string;
    severity: 'high' | 'warning' | 'info' | 'good';
    title: string;
    detail: string;
    cta?: { label: string; action: InsightAction };
}

export interface AcademicInsightResult {
    insights: AcademicInsight[];
    source: 'ai' | 'offline';
}

export interface StudentBelowKKTP {
    studentId: string;
    studentName: string;
    className: string;
    subject: string;
    average: number;
    gap: number;
}

export const DEFAULT_KKTP = 75;

/** A subject this far under the KKTP is critical rather than a warning. */
const CRITICAL_MARGIN = 7;
const TREND_THRESHOLD = 3;
const UNNAMED_ASSESSMENT = 'Penilaian';

const SUBJECT_COLORS = [
    '#6366f1', '#22c55e', '#f59e0b', '#ef4444', '#8b5cf6',
    '#06b6d4', '#ec4899', '#14b8a6', '#f97316', '#3b82f6',
];

const collapseSpaces = (value: string | null | undefined) => (value ?? '').replace(/\s+/g, ' ').trim();
const mean = (values: number[]) => values.reduce((a, b) => a + b, 0) / values.length;
const assessmentLabel = (record: AnalyticsAcademicRecord) => record.assessment_name || UNNAMED_ASSESSMENT;

const localDateKey = (d: Date) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

const parseLocalDateKey = (key: string) => {
    const [y, m, d] = key.split('-').map(Number);
    return new Date(y, m - 1, d);
};

// Normalisation

/**
 * Cleans records once at the data boundary: subjects that differ only by case
 * or spacing are merged under the first spelling seen, assessment names are
 * trimmed, and scores outside 0–100 are dropped instead of counting as 0.
 */
export function normalizeAcademicRecords<T extends AnalyticsAcademicRecord>(records: T[]): T[] {
    const subjectDisplay = new Map<string, string>();
    const normalized: T[] = [];

    for (const record of records) {
        const score = Number(record.score);
        if (!Number.isFinite(score) || score < 0 || score > 100) continue;

        const subject = collapseSpaces(record.subject) || 'Umum';
        const key = subject.toLowerCase();
        if (!subjectDisplay.has(key)) subjectDisplay.set(key, subject);

        normalized.push({
            ...record,
            score,
            subject: subjectDisplay.get(key)!,
            assessment_name: collapseSpaces(record.assessment_name) || null,
        });
    }
    return normalized;
}

// Averages and distribution

function groupScoresByStudentSubject(records: AnalyticsAcademicRecord[]) {
    const byStudent = new Map<string, Map<string, number[]>>();
    for (const r of records) {
        let bySubject = byStudent.get(r.student_id);
        if (!bySubject) {
            bySubject = new Map();
            byStudent.set(r.student_id, bySubject);
        }
        const scores = bySubject.get(r.subject) ?? [];
        scores.push(r.score);
        bySubject.set(r.subject, scores);
    }
    return byStudent;
}

export function calculateStudentAverages(records: AnalyticsAcademicRecord[]): Map<string, number> {
    const averages = new Map<string, number>();
    groupScoresByStudentSubject(records).forEach((bySubject, studentId) => {
        averages.set(studentId, mean(Array.from(bySubject.values(), mean)));
    });
    return averages;
}

/**
 * Predicate bands follow the Kurikulum Merdeka interval method: everything
 * below the KKTP is D, and the span from KKTP to 100 is split into three.
 */
export function buildGradeDistribution(averages: number[], kktp: number): GradeDistribution[] {
    const step = (100 - kktp) / 3;
    const bLower = Math.round(kktp + step);
    const aLower = Math.round(kktp + 2 * step);

    const distribution: GradeDistribution[] = [
        { label: 'A', range: `${aLower}–100`, count: 0, color: '#22c55e', percentage: 0 },
        { label: 'B', range: `${bLower}–${aLower - 1}`, count: 0, color: '#3b82f6', percentage: 0 },
        { label: 'C', range: `${kktp}–${bLower - 1}`, count: 0, color: '#eab308', percentage: 0 },
        { label: 'D', range: `< ${kktp}`, count: 0, color: '#ef4444', percentage: 0 },
    ];

    for (const avg of averages) {
        if (avg >= aLower) distribution[0].count++;
        else if (avg >= bLower) distribution[1].count++;
        else if (avg >= kktp) distribution[2].count++;
        else distribution[3].count++;
    }

    for (const d of distribution) {
        d.percentage = averages.length > 0 ? Math.round((d.count / averages.length) * 100) : 0;
    }
    return distribution;
}

export function calculateOverallGradeStats(records: AnalyticsAcademicRecord[], kktp: number): OverallGradeStats {
    const averages = Array.from(calculateStudentAverages(records).values());
    return {
        distribution: buildGradeDistribution(averages, kktp),
        overallAverage: averages.length > 0 ? Math.round(mean(averages)) : 0,
        totalStudentsWithGrades: averages.length,
    };
}

// Per-subject statistics

function kktpStatusFor(average: number, kktp: number): SubjectStats['kktpStatus'] {
    if (average < kktp - CRITICAL_MARGIN) return 'critical';
    if (average < kktp) return 'warning';
    return 'safe';
}

/** Assessments of one subject in the order they were first entered. */
function orderedAssessments(records: AnalyticsAcademicRecord[]) {
    const byName = new Map<string, { scores: number[]; earliest: number }>();
    for (const r of records) {
        const name = assessmentLabel(r);
        const time = new Date(r.created_at).getTime();
        const entry = byName.get(name) ?? { scores: [], earliest: time };
        entry.scores.push(r.score);
        if (time < entry.earliest) entry.earliest = time;
        byName.set(name, entry);
    }
    return Array.from(byName.entries())
        .map(([name, entry]) => ({ name, ...entry }))
        .sort((a, b) => a.earliest - b.earliest);
}

export function calculateSubjectStats(
    academicRecords: AnalyticsAcademicRecord[],
    kktpThreshold: number = DEFAULT_KKTP,
): SubjectStats[] {
    const bySubject = new Map<string, AnalyticsAcademicRecord[]>();
    for (const r of academicRecords) {
        const list = bySubject.get(r.subject) ?? [];
        list.push(r);
        bySubject.set(r.subject, list);
    }

    return Array.from(bySubject.entries()).map(([subject, records]) => {
        const scoresByStudent = new Map<string, number[]>();
        for (const r of records) {
            const list = scoresByStudent.get(r.student_id) ?? [];
            list.push(r.score);
            scoresByStudent.set(r.student_id, list);
        }
        const studentAverages = Array.from(scoresByStudent.values(), mean);
        const average = Math.round(mean(studentAverages));
        const scores = records.map((r) => r.score);

        const assessments = orderedAssessments(records);
        let trend: SubjectStats['trend'] = 'stable';
        let trendDelta = 0;
        let trendFrom: string | null = null;
        let trendTo: string | null = null;
        if (assessments.length >= 2) {
            const previous = assessments[assessments.length - 2];
            const latest = assessments[assessments.length - 1];
            trendDelta = Math.round(mean(latest.scores) - mean(previous.scores));
            trendFrom = previous.name;
            trendTo = latest.name;
            if (trendDelta >= TREND_THRESHOLD) trend = 'up';
            else if (trendDelta <= -TREND_THRESHOLD) trend = 'down';
        }

        return {
            subject,
            studentCount: scoresByStudent.size,
            assessmentCount: assessments.length,
            average,
            highest: Math.max(...scores),
            lowest: Math.min(...scores),
            distribution: buildGradeDistribution(studentAverages, kktpThreshold),
            kktpStatus: kktpStatusFor(average, kktpThreshold),
            kktpGap: average - kktpThreshold,
            trend,
            trendDelta,
            trendFrom,
            trendTo,
        };
    }).sort((a, b) => a.subject.localeCompare(b.subject, 'id'));
}

// KPI

/**
 * An assessment counts as given to a class once any student in that class has
 * a grade for it; every other student in the class is then expected to have one.
 */
function calculateCompleteness(records: AnalyticsAcademicRecord[], students: Student[]) {
    const classOf = new Map<string, string>();
    const classSize = new Map<string, number>();
    for (const s of students) {
        const classId = s.class_id ?? '';
        classOf.set(s.id, classId);
        classSize.set(classId, (classSize.get(classId) ?? 0) + 1);
    }

    const filledByKey = new Map<string, { classId: string; students: Set<string> }>();
    for (const r of records) {
        const classId = classOf.get(r.student_id);
        if (classId === undefined) continue;
        const key = `${classId}::${r.subject}::${assessmentLabel(r)}`;
        const entry = filledByKey.get(key) ?? { classId, students: new Set<string>() };
        entry.students.add(r.student_id);
        filledByKey.set(key, entry);
    }

    let expected = 0;
    let filled = 0;
    filledByKey.forEach((entry) => {
        expected += classSize.get(entry.classId) ?? 0;
        filled += entry.students.size;
    });
    return { expected, filled };
}

export function calculateAcademicKPI(
    academicRecords: AnalyticsAcademicRecord[],
    students: Student[],
    subjectStats: SubjectStats[],
    kktpThreshold: number = DEFAULT_KKTP,
): AcademicKPI {
    const { overallAverage, totalStudentsWithGrades } = calculateOverallGradeStats(academicRecords, kktpThreshold);
    const totalStudents = students.length;

    const trended = subjectStats.filter((s) => s.trendFrom !== null);
    const averageTrend = trended.length > 0 ? Math.round(mean(trended.map((s) => s.trendDelta))) : 0;

    let studentsBelowKKTP = 0;
    groupScoresByStudentSubject(academicRecords).forEach((bySubject) => {
        if (Array.from(bySubject.values()).some((scores) => Math.round(mean(scores)) < kktpThreshold)) {
            studentsBelowKKTP++;
        }
    });

    const { expected, filled } = calculateCompleteness(academicRecords, students);

    return {
        overallAverage,
        averageTrend,
        assessedStudents: totalStudentsWithGrades,
        totalStudents,
        studentCoverageRate: totalStudents > 0 ? Math.round((totalStudentsWithGrades / totalStudents) * 100) : 0,
        subjectsBelowKKTP: subjectStats.filter((s) => s.kktpStatus !== 'safe').length,
        totalSubjects: subjectStats.length,
        studentsBelowKKTP,
        gradeCompleteness: expected > 0 ? Math.round((filled / expected) * 100) : 0,
        expectedGradeCount: expected,
        missingGradeCount: expected - filled,
    };
}

// Trend series

export type AcademicTrendMode = 'weekly' | 'assessment' | 'monthly';

export function calculateAcademicTrends(
    academicRecords: AnalyticsAcademicRecord[],
    subjects: string[],
    mode: AcademicTrendMode = 'weekly',
): SubjectTrendData[] {
    return subjects.map((subject, idx) => {
        const color = SUBJECT_COLORS[idx % SUBJECT_COLORS.length];
        const records = academicRecords.filter((r) => r.subject === subject);

        if (mode === 'assessment') {
            const data = orderedAssessments(records).map(({ name, scores, earliest }) => ({
                date: localDateKey(new Date(earliest)),
                label: name,
                average: Math.round(mean(scores)),
                count: scores.length,
            }));
            return { subject, data, color };
        }

        const buckets = new Map<string, number[]>();
        for (const r of records) {
            const d = new Date(r.created_at);
            const key = mode === 'monthly'
                ? `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`
                : localDateKey(new Date(d.getFullYear(), d.getMonth(), d.getDate() - d.getDay()));
            const list = buckets.get(key) ?? [];
            list.push(r.score);
            buckets.set(key, list);
        }

        const labelFormat: Intl.DateTimeFormatOptions = mode === 'monthly'
            ? { month: 'short', year: 'numeric' }
            : { day: 'numeric', month: 'short' };

        const data = Array.from(buckets.entries())
            .sort(([a], [b]) => a.localeCompare(b))
            .map(([date, scores]) => ({
                date,
                label: parseLocalDateKey(date).toLocaleDateString('id-ID', labelFormat),
                average: Math.round(mean(scores)),
                count: scores.length,
            }));
        return { subject, data, color };
    });
}

// Students below KKTP

export function findStudentsBelowKKTP(
    academicRecords: AnalyticsAcademicRecord[],
    students: Student[],
    classes: Array<{ id: string; name: string }>,
    kktpThreshold: number = DEFAULT_KKTP,
): StudentBelowKKTP[] {
    const studentMap = new Map(students.map((s) => [s.id, s]));
    const classMap = new Map(classes.map((c) => [c.id, c.name]));

    const results: StudentBelowKKTP[] = [];
    groupScoresByStudentSubject(academicRecords).forEach((bySubject, studentId) => {
        const student = studentMap.get(studentId);
        if (!student) return;
        bySubject.forEach((scores, subject) => {
            const avg = Math.round(mean(scores));
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

// Insights

export function generateOfflineAcademicInsights(
    subjectStats: SubjectStats[],
    kpi: AcademicKPI,
    studentsBelowKKTP: StudentBelowKKTP[],
    kktpThreshold: number = DEFAULT_KKTP,
): AcademicInsight[] {
    const insights: AcademicInsight[] = [];

    const belowSubjects = subjectStats.filter((s) => s.kktpStatus !== 'safe');
    if (belowSubjects.length > 0) {
        insights.push({
            id: 'subjects-below-kktp',
            severity: belowSubjects.some((s) => s.kktpStatus === 'critical') ? 'high' : 'warning',
            title: `${belowSubjects.length} mapel di bawah KKTP`,
            detail: `${belowSubjects.map((s) => `${s.subject} (${s.average})`).join(', ')}. Target KKTP ${kktpThreshold}.`,
            cta: { label: 'Lihat mapel', action: 'scroll-subjects' },
        });
    }

    const declining = subjectStats.filter((s) => s.trend === 'down');
    if (declining.length > 0) {
        insights.push({
            id: 'declining-trends',
            severity: 'warning',
            title: `Nilai turun di ${declining.length} mapel`,
            detail: declining
                .map((s) => `${s.subject} turun ${Math.abs(s.trendDelta)} poin dari ${s.trendFrom} ke ${s.trendTo}`)
                .join('; ') + '.',
        });
    }

    const uniqueBelow = new Set(studentsBelowKKTP.map((s) => s.studentId)).size;
    if (uniqueBelow > 0) {
        insights.push({
            id: 'students-below-kktp',
            severity: uniqueBelow >= 5 ? 'high' : 'warning',
            title: `${uniqueBelow} siswa di bawah KKTP`,
            detail: `${studentsBelowKKTP.length} nilai mapel belum mencapai ${kktpThreshold}. Mereka kandidat remedial.`,
            cta: { label: 'Lihat daftar siswa', action: 'scroll-below-kktp' },
        });
    }

    if (kpi.expectedGradeCount > 0 && kpi.gradeCompleteness < 80) {
        insights.push({
            id: 'low-completion',
            severity: 'warning',
            title: `Kelengkapan nilai ${kpi.gradeCompleteness}%`,
            detail: `${kpi.missingGradeCount} nilai belum terisi pada penilaian yang sudah berjalan.`,
            cta: { label: 'Cek yang belum dinilai', action: 'scroll-completion' },
        });
    }

    const unassessed = kpi.totalStudents - kpi.assessedStudents;
    if (unassessed > 0 && kpi.assessedStudents > 0) {
        insights.push({
            id: 'unassessed-students',
            severity: 'info',
            title: `${unassessed} siswa belum punya nilai`,
            detail: 'Belum ada satu pun nilai mapel untuk mereka di semester ini.',
            cta: { label: 'Input nilai', action: 'navigate-input' },
        });
    }

    if (insights.length === 0 && subjectStats.length > 0) {
        insights.push({
            id: 'all-good',
            severity: 'good',
            title: 'Semua mapel mencapai KKTP',
            detail: `Rata-rata keseluruhan ${kpi.overallAverage}, target KKTP ${kktpThreshold}.`,
        });
    }

    return insights;
}

const SEVERITIES: ReadonlyArray<AcademicInsight['severity']> = ['high', 'warning', 'info', 'good'];

function sanitizeAiInsight(raw: unknown, index: number, restoreNames: (text: string) => string): AcademicInsight | null {
    if (!raw || typeof raw !== 'object') return null;
    const r = raw as Record<string, unknown>;
    const title = typeof r.title === 'string' ? restoreNames(r.title.trim()) : '';
    if (!title) return null;

    const severity = SEVERITIES.includes(r.severity as AcademicInsight['severity'])
        ? (r.severity as AcademicInsight['severity'])
        : 'info';
    const cta = r.cta as { label?: unknown; action?: unknown } | undefined;
    const validCta = cta && typeof cta.label === 'string' && INSIGHT_ACTIONS.includes(cta.action as InsightAction)
        ? { label: cta.label, action: cta.action as InsightAction }
        : undefined;

    return {
        id: typeof r.id === 'string' && r.id ? r.id : `ai-${index}`,
        severity,
        title,
        detail: typeof r.detail === 'string' ? restoreNames(r.detail) : '',
        cta: validCta,
    };
}

export async function generateAIAcademicInsights(
    subjectStats: SubjectStats[],
    kpi: AcademicKPI,
    studentsBelowKKTP: StudentBelowKKTP[],
    className: string,
    kktpThreshold: number = DEFAULT_KKTP,
): Promise<AcademicInsightResult> {
    const offline: AcademicInsightResult = {
        insights: generateOfflineAcademicInsights(subjectStats, kpi, studentsBelowKKTP, kktpThreshold),
        source: 'offline',
    };

    // Student names stay on the device: the AI sees "Siswa N" and we swap names back in.
    const sample = studentsBelowKKTP.slice(0, 5);
    const aliasIndex = new Map<string, number>();
    const aliasNames: string[] = [];
    for (const s of sample) {
        if (!aliasIndex.has(s.studentId)) {
            aliasIndex.set(s.studentId, aliasNames.length + 1);
            aliasNames.push(s.studentName);
        }
    }
    const restoreNames = (text: string) =>
        text.replace(/\bSiswa (\d+)\b/g, (match, n) => aliasNames[Number(n) - 1] ?? match);

    const systemInstruction = `Anda adalah asisten analisis akademik guru madrasah Indonesia.
Analisis data nilai siswa dan hasilkan insight dalam format JSON array.
Setiap insight memiliki: id (string), severity ("high"|"warning"|"info"|"good"), title (singkat), detail (1-2 kalimat).
Sebut siswa persis dengan label yang diberikan (mis. "Siswa 1").
Maksimal 4 insight, prioritaskan yang paling kritis.
Gunakan Bahasa Indonesia.`;

    const prompt = `Data Akademik ${className} (target KKTP ${kktpThreshold}):
- Rata-rata keseluruhan: ${kpi.overallAverage}
- Perubahan dari penilaian sebelumnya: ${kpi.averageTrend > 0 ? '+' : ''}${kpi.averageTrend} poin
- Siswa sudah dinilai: ${kpi.assessedStudents}/${kpi.totalStudents}
- Kelengkapan nilai: ${kpi.gradeCompleteness}%
- Mapel di bawah KKTP: ${kpi.subjectsBelowKKTP}/${kpi.totalSubjects}

Detail per mapel:
${subjectStats.map((s) => `- ${s.subject}: rata-rata ${s.average}, tren ${s.trend} (${s.trendDelta > 0 ? '+' : ''}${s.trendDelta}), KKTP: ${s.kktpStatus}`).join('\n')}

Siswa di bawah KKTP: ${kpi.studentsBelowKKTP} siswa, ${studentsBelowKKTP.length} nilai mapel
${sample.map((s) => `- Siswa ${aliasIndex.get(s.studentId)}: ${s.subject} = ${s.average}`).join('\n')}`;

    try {
        const response = await generateGeminiJson<unknown>(prompt, systemInstruction, 'insight');
        if (!Array.isArray(response)) return offline;
        const insights = response
            .map((raw, i) => sanitizeAiInsight(raw, i, restoreNames))
            .filter((i): i is AcademicInsight => i !== null);
        return insights.length > 0 ? { insights, source: 'ai' } : offline;
    } catch (error) {
        logger.warn('AI academic insights failed, using offline fallback', 'AcademicAnalytics', error);
        return offline;
    }
}
