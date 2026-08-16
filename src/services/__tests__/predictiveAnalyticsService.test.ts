import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';
import {
    calculateLinearSlope,
    calculateStudentRiskScores,
    analyzeAttendancePatterns,
    forecastAcademicPerformance,
    generateFallbackInterventionPlan,
    generateAiInterventionPlan,
    generateFallbackClassNarrativeReport,
    generateAiClassNarrativeReport,
} from '../predictiveAnalyticsService';
import * as geminiService from '../geminiService';
import type {
    Student,
    AnalyticsAttendance,
    AnalyticsAcademicRecord,
    AnalyticsViolation,
    AnalyticsTask,
    StudentRiskAssessment,
} from '../../components/pages/analytics/types';

describe('predictiveAnalyticsService', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    // =========================================================================
    // 1. Linear Regression Slope
    // =========================================================================
    describe('calculateLinearSlope', () => {
        it('returns 0 for empty or single value array', () => {
            expect(calculateLinearSlope([])).toBe(0);
            expect(calculateLinearSlope([80])).toBe(0);
        });

        it('returns positive slope for improving scores', () => {
            const slope = calculateLinearSlope([70, 75, 80, 85]);
            expect(slope).toBe(5);
        });

        it('returns negative slope for declining scores', () => {
            const slope = calculateLinearSlope([90, 80, 70]);
            expect(slope).toBe(-10);
        });

        it('returns 0 for flat / constant scores', () => {
            const slope = calculateLinearSlope([75, 75, 75, 75]);
            expect(slope).toBe(0);
        });
    });

    // =========================================================================
    // 2. Student Risk Index (SRI)
    // =========================================================================
    describe('calculateStudentRiskScores', () => {
        const studentA: Student = { id: 's1', name: 'Ahmad Faiz', class_id: 'c1', gender: 'Laki-laki' };
        const studentB: Student = { id: 's2', name: 'Budi Santoso', class_id: 'c1', gender: 'Laki-laki' };
        const studentC: Student = { id: 's3', name: 'Citra Dewi', class_id: 'c1', gender: 'Perempuan' };

        it('assigns low risk to a stellar student with full attendance and high scores', () => {
            const attendance: AnalyticsAttendance[] = [
                { student_id: 's1', date: '2026-08-01', status: 'Hadir' },
                { student_id: 's1', date: '2026-08-02', status: 'Hadir' },
                { student_id: 's1', date: '2026-08-03', status: 'Hadir' },
            ];
            const academics: AnalyticsAcademicRecord[] = [
                { student_id: 's1', score: 90, subject: 'Matematika', assessment_name: 'UH 1', created_at: '2026-08-01T00:00:00Z' },
                { student_id: 's1', score: 95, subject: 'Matematika', assessment_name: 'UH 2', created_at: '2026-08-05T00:00:00Z' },
            ];
            const violations: AnalyticsViolation[] = [];

            const results = calculateStudentRiskScores([studentA], attendance, academics, violations);
            expect(results).toHaveLength(1);
            expect(results[0].riskLevel).toBe('low');
            expect(results[0].riskScore).toBeLessThan(20);
            expect(results[0].predictedTrend).toBe('improving');
        });

        it('assigns high risk to a student with multiple alphas, low grades, and violations', () => {
            const attendance: AnalyticsAttendance[] = [
                { student_id: 's2', date: '2026-08-01', status: 'Alpha' },
                { student_id: 's2', date: '2026-08-02', status: 'Alpha' },
                { student_id: 's2', date: '2026-08-03', status: 'Alpha' },
                { student_id: 's2', date: '2026-08-04', status: 'Hadir' },
            ];
            const academics: AnalyticsAcademicRecord[] = [
                { student_id: 's2', score: 85, subject: 'IPA', assessment_name: 'UH 1', created_at: '2026-08-01T00:00:00Z' },
                { student_id: 's2', score: 55, subject: 'IPA', assessment_name: 'UH 2', created_at: '2026-08-10T00:00:00Z' },
            ];
            const violations: AnalyticsViolation[] = [
                { id: 'v1', student_id: 's2', type: 'berat', description: 'Membolos', points: 30, date: '2026-08-02', created_at: '2026-08-02T00:00:00Z' },
            ];
            const tasks: AnalyticsTask[] = [
                { id: 't1', status: 'todo', due_date: '2026-08-01T00:00:00Z' },
                { id: 't2', status: 'todo', due_date: '2026-08-02T00:00:00Z' },
                { id: 't3', status: 'todo', due_date: '2026-08-03T00:00:00Z' },
            ];

            const results = calculateStudentRiskScores([studentB], attendance, academics, violations, tasks);
            expect(results).toHaveLength(1);
            const r = results[0];
            expect(r.riskLevel).toBe('high');
            expect(r.riskScore).toBeGreaterThanOrEqual(60);
            expect(r.factors.length).toBeGreaterThanOrEqual(2);
            expect(r.factors.some((f) => f.category === 'attendance')).toBe(true);
            expect(r.factors.some((f) => f.category === 'discipline')).toBe(true);
            expect(r.predictedTrend).toBe('critical');
        });

        it('sorts students by risk score descending', () => {
            const attendance: AnalyticsAttendance[] = [
                { student_id: 's1', date: '2026-08-01', status: 'Hadir' },
                { student_id: 's2', date: '2026-08-01', status: 'Alpha' },
                { student_id: 's3', date: '2026-08-01', status: 'Hadir' },
            ];
            const academics: AnalyticsAcademicRecord[] = [
                { student_id: 's1', score: 90, subject: 'IPA', assessment_name: 'UH 1', created_at: '2026-08-01T00:00:00Z' },
                { student_id: 's2', score: 50, subject: 'IPA', assessment_name: 'UH 1', created_at: '2026-08-01T00:00:00Z' },
                { student_id: 's3', score: 72, subject: 'IPA', assessment_name: 'UH 1', created_at: '2026-08-01T00:00:00Z' },
            ];

            const results = calculateStudentRiskScores([studentA, studentB, studentC], attendance, academics, []);
            expect(results[0].student.id).toBe('s2'); // Budi is highest risk
            expect(results[results.length - 1].student.id).toBe('s1'); // Ahmad is lowest risk
        });
    });

    // =========================================================================
    // 3. Attendance Pattern Analysis
    // =========================================================================
    describe('analyzeAttendancePatterns', () => {
        const student: Student = { id: 's1', name: 'Zaki', class_id: 'c1', gender: 'Laki-laki' };

        it('identifies day-of-week patterns and vulnerable days', () => {
            // Monday = 2026-08-10, Tuesday = 2026-08-11
            const attendance: AnalyticsAttendance[] = [
                { student_id: 's1', date: '2026-08-10', status: 'Alpha' }, // Monday
                { student_id: 's1', date: '2026-08-17', status: 'Alpha' }, // Monday
                { student_id: 's1', date: '2026-08-24', status: 'Alpha' }, // Monday
                { student_id: 's1', date: '2026-08-31', status: 'Alpha' }, // Monday
                { student_id: 's1', date: '2026-09-07', status: 'Alpha' }, // Monday
                { student_id: 's1', date: '2026-08-11', status: 'Hadir' }, // Tuesday
                { student_id: 's1', date: '2026-08-18', status: 'Hadir' }, // Tuesday
                { student_id: 's1', date: '2026-08-25', status: 'Hadir' }, // Tuesday
                { student_id: 's1', date: '2026-09-01', status: 'Hadir' }, // Tuesday
                { student_id: 's1', date: '2026-09-08', status: 'Hadir' }, // Tuesday
            ];

            const analysis = analyzeAttendancePatterns(attendance, [student]);
            expect(analysis.dayPatterns.length).toBeGreaterThan(0);
            expect(analysis.mostVulnerableDay).toContain('Senin');
        });

        it('detects consecutive absence runs >= 3 days', () => {
            const attendance: AnalyticsAttendance[] = [
                { student_id: 's1', date: '2026-08-01', status: 'Alpha' },
                { student_id: 's1', date: '2026-08-02', status: 'Alpha' },
                { student_id: 's1', date: '2026-08-03', status: 'Sakit' },
                { student_id: 's1', date: '2026-08-04', status: 'Hadir' },
            ];

            const analysis = analyzeAttendancePatterns(attendance, [student]);
            expect(analysis.consecutiveAbsenceAlerts).toHaveLength(1);
            expect(analysis.consecutiveAbsenceAlerts[0].consecutiveDays).toBe(3);
            expect(analysis.consecutiveAbsenceAlerts[0].student.name).toBe('Zaki');
        });
    });

    // =========================================================================
    // 4. Academic Performance Forecasting
    // =========================================================================
    describe('forecastAcademicPerformance', () => {
        const student: Student = { id: 's1', name: 'Rina', class_id: 'c1', gender: 'Perempuan' };

        it('projects forward score using slope and flags KKTP risk', () => {
            // Scores dropping 80 -> 70 -> 60
            const records: AnalyticsAcademicRecord[] = [
                { student_id: 's1', score: 80, subject: 'Matematika', assessment_name: 'UH 1', created_at: '2026-08-01T00:00:00Z' },
                { student_id: 's1', score: 70, subject: 'Matematika', assessment_name: 'UH 2', created_at: '2026-08-05T00:00:00Z' },
                { student_id: 's1', score: 60, subject: 'Matematika', assessment_name: 'UH 3', created_at: '2026-08-10T00:00:00Z' },
            ];

            const forecasts = forecastAcademicPerformance([student], records, 75);
            expect(forecasts).toHaveLength(1);
            const mtk = forecasts[0].subjectForecasts.find((s) => s.subject === 'Matematika');
            expect(mtk).toBeDefined();
            expect(mtk!.trendSlope).toBeLessThan(0);
            expect(mtk!.predictedScore).toBeLessThan(70);
            expect(mtk!.status).toBe('critical');
            expect(forecasts[0].kktpRiskCount).toBe(1);
        });
    });

    // =========================================================================
    // 5. Intervention Plan Generator
    // =========================================================================
    describe('generateAiInterventionPlan', () => {
        const mockAssessment: StudentRiskAssessment = {
            student: { id: 's1', name: 'Farhan', class_id: 'c1', gender: 'Laki-laki' },
            riskScore: 75,
            riskLevel: 'high' as const,
            factors: [
                { category: 'attendance' as const, severity: 'high' as const, title: 'Kehadiran Kritis', description: '65% hadir', scoreContribution: 28 },
            ],
            metrics: {
                attendanceRate: 65,
                recentAlphaCount: 4,
                recentGradeAvg: 60,
                gradeDropPoints: 12,
                violationPoints: 20,
                pendingTasksCount: 2,
            },
            predictedTrend: 'critical' as const,
        };

        it('generates valid fallback plan with all fields', () => {
            const plan = generateFallbackInterventionPlan(mockAssessment);
            expect(plan.studentName).toBe('Farhan');
            expect(plan.generatedBy).toBe('Offline Fallback');
            expect(plan.instructionalRemedial.length).toBeGreaterThan(0);
            expect(plan.behavioralCounseling.length).toBeGreaterThan(0);
            expect(plan.parentCommunicationDraft).toContain('Farhan');
        });

        it('uses Gemini JSON output when available', async () => {
            const aiResponse = {
                summary: 'Farhan membutuhkan pendampingan konseling kehadiran segera.',
                instructionalRemedial: ['Modul remedial Matematika bab 2'],
                behavioralCounseling: ['Bimbingan konseling mingguan'],
                parentCommunicationDraft: 'Surat panggilan diskusi wali murid Farhan...',
                recommendedTimeline: '1 Minggu',
            };

            vi.spyOn(geminiService, 'generateGeminiJson').mockResolvedValueOnce(aiResponse);

            const plan = await generateAiInterventionPlan(mockAssessment);
            expect(plan.generatedBy).toBe('AI');
            expect(plan.summary).toBe(aiResponse.summary);
            expect(plan.instructionalRemedial).toEqual(aiResponse.instructionalRemedial);
        });

        it('gracefully falls back when Gemini API throws error', async () => {
            vi.spyOn(geminiService, 'generateGeminiJson').mockRejectedValueOnce(new Error('Network error'));

            const plan = await generateAiInterventionPlan(mockAssessment);
            expect(plan.generatedBy).toBe('Offline Fallback');
            expect(plan.studentName).toBe('Farhan');
        });
    });

    // =========================================================================
    // 6. Periodic Class Narrative Report
    // =========================================================================
    describe('generateAiClassNarrativeReport', () => {
        const input = {
            className: 'Kelas 7A',
            period: 'Agustus 2026',
            totalStudents: 32,
            attendanceRate: 88,
            classAvgScore: 78,
            highRiskCount: 2,
            topPerformerCount: 6,
            vulnerabilities: ['Tren absensi di hari Jumat meningkat'],
        };

        it('generates fallback narrative report correctly', () => {
            const report = generateFallbackClassNarrativeReport(input);
            expect(report.title).toContain('Kelas 7A');
            expect(report.generatedBy).toBe('Offline Fallback');
            expect(report.executiveSummary).toContain('Kelas 7A');
            expect(report.keyAchievements.length).toBeGreaterThan(0);
        });

        it('uses AI output when API succeeds', async () => {
            const aiReport = {
                title: 'Laporan Analisis Naratif Kelas 7A',
                executiveSummary: 'Kelas 7A memperlihatkan dinamika yang sangat positif.',
                keyAchievements: ['Capaian rata-rata 78 melampaui KKTP'],
                criticalConcerns: ['2 siswa memerlukan program remedial'],
                suggestedTeacherActions: ['Tindak lanjut bimbingan belajar'],
            };

            vi.spyOn(geminiService, 'generateGeminiJson').mockResolvedValueOnce(aiReport);

            const report = await generateAiClassNarrativeReport(input);
            expect(report.generatedBy).toBe('AI');
            expect(report.executiveSummary).toBe(aiReport.executiveSummary);
        });
    });
});
