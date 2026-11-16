/**
 * Shared statistics engine for the child-development feature.
 *
 * Single source of truth for averages, attendance rate, engagement score,
 * badge tone thresholds, and score trends — used by
 * `childDevelopmentAnalysis.ts` (AI prompt + offline fallback),
 * `useSingleChildAnalysis` / `useComparativeChildAnalysis` hooks, and the
 * parent-portal `ChildDevelopmentAnalytics` component, so the numbers shown to
 * teachers, parents, and the AI can never drift apart (review findings CD2/CD3/CD4).
 *
 * @module services/childDevelopmentStats
 */

export type DevTone = 'success' | 'info' | 'warning' | 'danger';

/** One canonical scale for academic/subject scores (0-100). */
export const ACADEMIC_TONE_THRESHOLDS = {
    sangatBaik: 85,
    baik: 75,
    cukup: 65,
} as const;

/** One canonical scale for attendance rate (percent). */
export const ATTENDANCE_TONE_THRESHOLDS = {
    sangatBaik: 95,
    baik: 85,
    cukup: 75,
} as const;

/** One canonical scale for cumulative violation points. */
export const BEHAVIOR_TONE_THRESHOLDS = {
    aman: 0,
    perhatian: 10,
    warning: 25,
} as const;

export interface ScoredRecordLike {
    score: number;
    /** ISO date (any precision); optional — trends need it. */
    date?: string | null;
    created_at?: string | null;
}

export interface AttendanceRecordLike {
    status: string;
}

export interface QuizPointLike {
    points?: number | null;
}

export interface SubjectAverageLike {
    subject: string;
    average: number;
}

export type ScoreTrend = 'up' | 'down' | 'stable';

export interface TrendResult {
    /** null = data tidak cukup untuk tren yang jujur (kurang dari 4 record bernama tanggal, atau hanya satu tanggal). */
    trend: ScoreTrend | null;
    /** lateAvg - earlyAvg (bisa pecahan); null ketika trend null. */
    delta: number | null;
}

const resolveDate = (record: ScoredRecordLike): string | null => record.date ?? record.created_at ?? null;

const normalizeStatus = (status: string): string => status.trim().toLowerCase();

/**
 * CD2 canonical average: mean of ALL records (bukan rata-rata dari rata-rata
 * per mapel). Semua UI dan prompt AI wajib memakai fungsi ini.
 */
export function averageScore(records: ScoredRecordLike[]): number {
    if (records.length === 0) return 0;
    const total = records.reduce((sum, record) => sum + record.score, 0);
    return Math.round(total / records.length);
}

export function computeSubjectAverages(records: Array<ScoredRecordLike & { subject?: string | null }>): SubjectAverageLike[] {
    const subjectMap: Record<string, { total: number; count: number }> = {};
    records.forEach((record) => {
        const subject = record.subject || 'Lainnya';
        if (!subjectMap[subject]) subjectMap[subject] = { total: 0, count: 0 };
        subjectMap[subject].total += record.score;
        subjectMap[subject].count += 1;
    });
    return Object.entries(subjectMap).map(([subject, data]) => ({
        subject,
        average: Math.round(data.total / data.count),
    }));
}

export function attendanceRate(records: AttendanceRecordLike[]): number {
    if (records.length === 0) return 100;
    const present = records.filter((record) => normalizeStatus(record.status) === 'hadir').length;
    return Math.round((present / records.length) * 100);
}

/**
 * Canonical engagement score: poin keaktifan lebih diutamakan; jumlah kegiatan
 * dipakai sebagai fallback ketika tidak ada poin.
 */
export function engagementScore(quizPoints: QuizPointLike[]): number {
    const total = quizPoints.reduce((sum, quiz) => sum + (quiz.points || 0), 0);
    if (total > 0) return Math.min(total * 5, 100);
    return Math.min(quizPoints.length * 15, 100);
}

export function getAcademicTone(score: number): DevTone {
    if (score >= ACADEMIC_TONE_THRESHOLDS.sangatBaik) return 'success';
    if (score >= ACADEMIC_TONE_THRESHOLDS.baik) return 'info';
    if (score >= ACADEMIC_TONE_THRESHOLDS.cukup) return 'warning';
    return 'danger';
}

export function getAttendanceTone(rate: number): DevTone {
    if (rate >= ATTENDANCE_TONE_THRESHOLDS.sangatBaik) return 'success';
    if (rate >= ATTENDANCE_TONE_THRESHOLDS.baik) return 'info';
    if (rate >= ATTENDANCE_TONE_THRESHOLDS.cukup) return 'warning';
    return 'danger';
}

export function getBehaviorTone(violationPoints: number): DevTone {
    if (violationPoints <= BEHAVIOR_TONE_THRESHOLDS.aman) return 'success';
    if (violationPoints <= BEHAVIOR_TONE_THRESHOLDS.perhatian) return 'info';
    if (violationPoints <= BEHAVIOR_TONE_THRESHOLDS.warning) return 'warning';
    return 'danger';
}

/**
 * CD3 honest trend: compares records dated BEFORE the median date against
 * records ON/AFTER it (time-based, bukan split berdasarkan urutan indeks).
 * Returns trend null ketika data tidak cukup — pemanggil harus menyembunyikan
 * atau melaporkan "stabil", bukan mengarang delta.
 */
export function computeTrendFromRecords(records: ScoredRecordLike[]): TrendResult {
    const dated = records
        .map((record) => ({ score: record.score, date: resolveDate(record) }))
        .filter((record): record is { score: number; date: string } => Boolean(record.date));

    const distinctDays = new Set(dated.map((record) => record.date.slice(0, 10)));
    if (dated.length < 4 || distinctDays.size < 2) {
        return { trend: null, delta: null };
    }

    const sorted = [...dated].sort((left, right) => left.date.localeCompare(right.date));
    const midDate = sorted[Math.floor(sorted.length / 2)].date.slice(0, 10);
    const early = sorted.filter((record) => record.date.slice(0, 10) < midDate);
    const late = sorted.filter((record) => record.date.slice(0, 10) >= midDate);

    if (early.length === 0 || late.length === 0) {
        return { trend: null, delta: null };
    }

    const earlyAvg = early.reduce((sum, record) => sum + record.score, 0) / early.length;
    const lateAvg = late.reduce((sum, record) => sum + record.score, 0) / late.length;
    const delta = lateAvg - earlyAvg;

    if (delta > 5) return { trend: 'up', delta };
    if (delta < -5) return { trend: 'down', delta };
    return { trend: 'stable', delta };
}
