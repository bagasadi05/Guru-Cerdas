import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { AnalyticsAcademicRecord, Student } from '../../src/components/pages/analytics/types';

const gemini = vi.hoisted(() => ({ generateGeminiJson: vi.fn() }));
vi.mock('../../src/services/geminiService', () => gemini);
vi.mock('../../src/services/logger', () => ({ logger: { warn: vi.fn(), error: vi.fn(), info: vi.fn(), debug: vi.fn() } }));

import {
    normalizeAcademicRecords,
    buildGradeDistribution,
    calculateStudentAverages,
    calculateOverallGradeStats,
    calculateSubjectStats,
    calculateAcademicKPI,
    calculateAcademicTrends,
    findStudentsBelowKKTP,
    generateOfflineAcademicInsights,
    generateAIAcademicInsights,
} from '../../src/services/academicAnalyticsService';

const rec = (
    student_id: string,
    subject: string,
    assessment_name: string,
    score: number,
    created_at = '2026-08-03T03:00:00Z',
): AnalyticsAcademicRecord => ({ student_id, subject, assessment_name, score, created_at, semester_id: 'sem-1', version: null });

const student = (id: string, name: string, class_id = 'c1'): Student => ({ id, name, class_id, gender: 'Laki-laki' });

describe('normalizeAcademicRecords', () => {
    it('merges subjects that differ only by case or spacing and trims assessment names', () => {
        const out = normalizeAcademicRecords([
            rec('s1', 'Matematika', ' PH 1 ', 80),
            rec('s2', ' matematika  ', 'PH 1', 70),
        ]);
        expect(out.map((r) => r.subject)).toEqual(['Matematika', 'Matematika']);
        expect(out.map((r) => r.assessment_name)).toEqual(['PH 1', 'PH 1']);
    });

    it('drops records whose score is not a finite number between 0 and 100', () => {
        const out = normalizeAcademicRecords([
            rec('s1', 'IPAS', 'PH 1', Number.NaN),
            rec('s1', 'IPAS', 'PH 2', 120),
            rec('s1', 'IPAS', 'PH 3', 88),
        ]);
        expect(out).toHaveLength(1);
        expect(out[0].score).toBe(88);
    });
});

describe('buildGradeDistribution', () => {
    it('derives the predicate bands from the KKTP instead of fixed cut-offs', () => {
        const dist = buildGradeDistribution([95, 85, 76, 74], 75);
        expect(dist.map((d) => [d.label, d.range, d.count])).toEqual([
            ['A', '92–100', 1],
            ['B', '83–91', 1],
            ['C', '75–82', 1],
            ['D', '< 75', 1],
        ]);
        expect(dist.map((d) => d.percentage)).toEqual([25, 25, 25, 25]);
    });

    it('moves a student below the line when the KKTP rises', () => {
        const dist = buildGradeDistribution([76], 80);
        expect(dist.find((d) => d.label === 'D')!.count).toBe(1);
    });
});

describe('student averages', () => {
    it('weights every subject equally, regardless of how many assessments it has', () => {
        const records = [
            rec('s1', 'Matematika', 'PH 1', 60),
            rec('s1', 'Matematika', 'PH 2', 60),
            rec('s1', 'Matematika', 'PH 3', 60),
            rec('s1', 'IPAS', 'PH 1', 100),
        ];
        expect(calculateStudentAverages(records).get('s1')).toBe(80);
    });

    it('gives the grade chart and the KPI card the same overall average', () => {
        const records = [
            rec('s1', 'Matematika', 'PH 1', 60),
            rec('s1', 'Matematika', 'PH 2', 60),
            rec('s1', 'IPAS', 'PH 1', 100),
            rec('s2', 'IPAS', 'PH 1', 90),
        ];
        const students = [student('s1', 'Ani'), student('s2', 'Budi')];
        const overall = calculateOverallGradeStats(records, 75);
        const subjects = calculateSubjectStats(records, 75);
        const kpi = calculateAcademicKPI(records, students, subjects, 75);
        expect(overall.overallAverage).toBe(85);
        expect(kpi.overallAverage).toBe(overall.overallAverage);
    });
});

describe('calculateSubjectStats', () => {
    it('reports the trend as the change from the previous assessment to the latest one', () => {
        const stats = calculateSubjectStats([
            rec('s1', 'IPAS', 'PH 1', 70, '2026-08-01T03:00:00Z'),
            rec('s2', 'IPAS', 'PH 1', 80, '2026-08-01T03:00:00Z'),
            rec('s1', 'IPAS', 'PH 2', 84, '2026-08-20T03:00:00Z'),
            rec('s2', 'IPAS', 'PH 2', 86, '2026-08-20T03:00:00Z'),
        ], 75);
        expect(stats[0]).toMatchObject({ trend: 'up', trendDelta: 10, trendFrom: 'PH 1', trendTo: 'PH 2' });
    });

    it('stays flat when a subject has a single assessment, however many rows it has', () => {
        const stats = calculateSubjectStats([
            rec('s1', 'IPAS', 'PH 1', 50, '2026-08-01T03:00:00Z'),
            rec('s2', 'IPAS', 'PH 1', 50, '2026-08-02T03:00:00Z'),
            rec('s3', 'IPAS', 'PH 1', 90, '2026-08-03T03:00:00Z'),
            rec('s4', 'IPAS', 'PH 1', 90, '2026-08-04T03:00:00Z'),
        ], 75);
        expect(stats[0]).toMatchObject({ trend: 'stable', trendDelta: 0, trendFrom: null });
    });

    it('marks a subject against the KKTP it is given', () => {
        const records = [rec('s1', 'IPAS', 'PH 1', 72)];
        expect(calculateSubjectStats(records, 70)[0].kktpStatus).toBe('safe');
        expect(calculateSubjectStats(records, 75)[0].kktpStatus).toBe('warning');
        expect(calculateSubjectStats(records, 80)[0].kktpStatus).toBe('critical');
    });
});

describe('calculateAcademicKPI', () => {
    it('measures completeness per class assessment, not just "has any grade"', () => {
        const students = [student('s1', 'Ani'), student('s2', 'Budi')];
        const records = [
            rec('s1', 'IPAS', 'PH 1', 80),
            rec('s2', 'IPAS', 'PH 1', 80),
            rec('s1', 'IPAS', 'PH 2', 80),
        ];
        const kpi = calculateAcademicKPI(records, students, calculateSubjectStats(records, 75), 75);
        expect(kpi.assessedStudents).toBe(2);
        expect(kpi.studentCoverageRate).toBe(100);
        expect(kpi.gradeCompleteness).toBe(75);
        expect(kpi.missingGradeCount).toBe(1);
    });

    it('averages the per-subject trend deltas', () => {
        const records = [
            rec('s1', 'IPAS', 'PH 1', 70, '2026-08-01T03:00:00Z'),
            rec('s1', 'IPAS', 'PH 2', 80, '2026-08-20T03:00:00Z'),
            rec('s1', 'Matematika', 'PH 1', 80, '2026-08-01T03:00:00Z'),
            rec('s1', 'Matematika', 'PH 2', 76, '2026-08-20T03:00:00Z'),
        ];
        const kpi = calculateAcademicKPI(records, [student('s1', 'Ani')], calculateSubjectStats(records, 75), 75);
        expect(kpi.averageTrend).toBe(3);
    });
});

describe('calculateAcademicTrends', () => {
    it('buckets weekly by the local calendar date, not the UTC date', () => {
        // 06:30 WIB Monday is still Sunday 23:30 UTC.
        const trends = calculateAcademicTrends([rec('s1', 'IPAS', 'PH 1', 80, '2026-08-02T23:30:00Z')], ['IPAS'], 'weekly');
        const local = new Date('2026-08-02T23:30:00Z');
        const weekStart = new Date(local.getFullYear(), local.getMonth(), local.getDate() - local.getDay());
        const expected = `${weekStart.getFullYear()}-${String(weekStart.getMonth() + 1).padStart(2, '0')}-${String(weekStart.getDate()).padStart(2, '0')}`;
        expect(trends[0].data[0].date).toBe(expected);
    });
});

describe('offline insights', () => {
    const students = [student('s1', 'Ani'), student('s2', 'Budi')];

    it('counts every subject below the KKTP, matching the KPI card', () => {
        const records = [rec('s1', 'IPAS', 'PH 1', 72), rec('s1', 'Matematika', 'PH 1', 60), rec('s1', 'PAI', 'PH 1', 90)];
        const subjects = calculateSubjectStats(records, 75);
        const kpi = calculateAcademicKPI(records, students, subjects, 75);
        const below = findStudentsBelowKKTP(records, students, [{ id: 'c1', name: '4A' }], 75);
        const insight = generateOfflineAcademicInsights(subjects, kpi, below, 75).find((i) => i.id === 'subjects-below-kktp')!;
        expect(kpi.subjectsBelowKKTP).toBe(2);
        expect(insight.title).toBe('2 mapel di bawah KKTP');
        expect(insight.severity).toBe('high');
    });

    it('points the student insight at the below-KKTP list', () => {
        const records = [rec('s1', 'IPAS', 'PH 1', 60), rec('s2', 'IPAS', 'PH 1', 90)];
        const subjects = calculateSubjectStats(records, 75);
        const kpi = calculateAcademicKPI(records, students, subjects, 75);
        const below = findStudentsBelowKKTP(records, students, [{ id: 'c1', name: '4A' }], 75);
        const insight = generateOfflineAcademicInsights(subjects, kpi, below, 75).find((i) => i.id === 'students-below-kktp')!;
        expect(insight.title).toBe('1 siswa di bawah KKTP');
        expect(insight.cta?.action).toBe('scroll-below-kktp');
    });
});

describe('generateAIAcademicInsights', () => {
    beforeEach(() => { gemini.generateGeminiJson.mockReset(); });

    const setup = () => {
        const students = [student('s1', 'Ahmad Fauzi')];
        const records = [rec('s1', 'IPAS', 'PH 1', 60)];
        const subjects = calculateSubjectStats(records, 75);
        const kpi = calculateAcademicKPI(records, students, subjects, 75);
        const below = findStudentsBelowKKTP(records, students, [{ id: 'c1', name: '4A' }], 75);
        return { subjects, kpi, below };
    };

    it('never sends student names to the AI and restores them in the answer', async () => {
        gemini.generateGeminiJson.mockResolvedValue([
            { id: 'x', severity: 'high', title: 'Siswa 1 perlu remedial', detail: 'Siswa 1 masih 60 di IPAS.' },
        ]);
        const { subjects, kpi, below } = setup();
        const result = await generateAIAcademicInsights(subjects, kpi, below, '4A', 75);
        const prompt = gemini.generateGeminiJson.mock.calls[0][0] as string;
        expect(prompt).not.toContain('Ahmad');
        expect(result.source).toBe('ai');
        expect(result.insights[0].title).toBe('Ahmad Fauzi perlu remedial');
    });

    it('drops unknown severities and actions coming back from the AI', async () => {
        gemini.generateGeminiJson.mockResolvedValue([
            { id: 'x', severity: 'urgent', title: 'T', detail: 'D', cta: { label: 'Hapus', action: 'delete-all' } },
        ]);
        const { subjects, kpi, below } = setup();
        const result = await generateAIAcademicInsights(subjects, kpi, below, '4A', 75);
        expect(result.insights[0].severity).toBe('info');
        expect(result.insights[0].cta).toBeUndefined();
    });

    it('reports an offline fallback when the AI call fails', async () => {
        gemini.generateGeminiJson.mockImplementation(async () => { throw new Error('quota'); });
        const { subjects, kpi, below } = setup();
        const result = await generateAIAcademicInsights(subjects, kpi, below, '4A', 75);
        expect(result.source).toBe('offline');
        expect(result.insights.length).toBeGreaterThan(0);
    });
});
