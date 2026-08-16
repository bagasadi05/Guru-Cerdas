/**
 * @fileoverview Predictive Analytics Service & AI Report Generator (Roadmap Q3)
 * 
 * Provides:
 * 1. Student Risk Index (SRI) calculation & Early Warning Scoring
 * 2. Attendance Pattern Analysis & Anomaly Detection (day-of-week clustering & consecutive absences)
 * 3. Academic Performance Forecasting (Linear regression trend projection vs KKTP)
 * 4. AI-Powered Actionable Intervention Plans & Periodic Class Narrative Reports
 * 
 * @module services/predictiveAnalyticsService
 */

import { generateGeminiJson } from './geminiService';
import { logger } from './logger';
import type {
    Student,
    AnalyticsAttendance,
    AnalyticsAcademicRecord,
    AnalyticsViolation,
    AnalyticsTask,
    StudentRiskAssessment,
    RiskFactor,
    RiskLevel,
    AttendancePatternAnalysis,
    DayOfWeekPattern,
    StudentPerformanceForecast,
    SubjectForecast,
    InterventionPlan,
    AiClassNarrativeReport,
} from '../components/pages/analytics/types';

// =============================================================================
// CONSTANTS & HELPERS
// =============================================================================

const INDONESIAN_DAYS = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];

export const DEFAULT_KKTP_THRESHOLD = 75;

/**
 * Calculates a simple linear regression slope (y = mx + c)
 * x: 0, 1, 2, ...
 * y: array of numbers
 */
export function calculateLinearSlope(values: number[]): number {
    const n = values.length;
    if (n < 2) return 0;

    let sumX = 0;
    let sumY = 0;
    let sumXY = 0;
    let sumXX = 0;

    for (let i = 0; i < n; i++) {
        sumX += i;
        sumY += values[i];
        sumXY += i * values[i];
        sumXX += i * i;
    }

    const denominator = n * sumXX - sumX * sumX;
    if (denominator === 0) return 0;

    const slope = (n * sumXY - sumX * sumY) / denominator;
    return Number(slope.toFixed(2));
}

// =============================================================================
// 1. STUDENT RISK INDEX (SRI) & EARLY WARNING SYSTEM
// =============================================================================

export interface CalculateRiskOptions {
    kktpThreshold?: number;
    recentDays?: number;
}

/**
 * Computes Student Risk Index (SRI) score (0-100) and risk factors for each student.
 * 
 * Weights:
 * - Attendance: 35%
 * - Academic Trajectory: 35%
 * - Behavioral Violations: 20%
 * - Task Completion: 10%
 */
export function calculateStudentRiskScores(
    students: Student[],
    attendance: AnalyticsAttendance[],
    academicRecords: AnalyticsAcademicRecord[],
    violations: AnalyticsViolation[],
    tasks: AnalyticsTask[] = [],
    options: CalculateRiskOptions = {}
): StudentRiskAssessment[] {
    const kktp = options.kktpThreshold ?? DEFAULT_KKTP_THRESHOLD;

    // Pre-group data by student_id for O(N) lookup
    const attendanceByStudent = new Map<string, AnalyticsAttendance[]>();
    attendance.forEach((att) => {
        const list = attendanceByStudent.get(att.student_id) || [];
        list.push(att);
        attendanceByStudent.set(att.student_id, list);
    });

    const academicsByStudent = new Map<string, AnalyticsAcademicRecord[]>();
    academicRecords.forEach((rec) => {
        const list = academicsByStudent.get(rec.student_id) || [];
        list.push(rec);
        academicsByStudent.set(rec.student_id, list);
    });

    const violationsByStudent = new Map<string, AnalyticsViolation[]>();
    violations.forEach((v) => {
        const list = violationsByStudent.get(v.student_id) || [];
        list.push(v);
        violationsByStudent.set(v.student_id, list);
    });

    const overdueTasksCount = tasks.filter((t) => {
        if (t.status === 'done') return false;
        if (!t.due_date) return false;
        return new Date(t.due_date).getTime() < Date.now();
    }).length;

    return students.map((student) => {
        const studentAtt = attendanceByStudent.get(student.id) || [];
        const studentAca = academicsByStudent.get(student.id) || [];
        const studentVio = violationsByStudent.get(student.id) || [];

        const factors: RiskFactor[] = [];

        // ── 1. Attendance Analysis (Weight: 35 pts max) ──
        const countedAtt = studentAtt.filter((a) => a.status !== 'Libur');
        const hadirCount = countedAtt.filter((a) => a.status === 'Hadir').length;
        const alphaCount = countedAtt.filter((a) => a.status === 'Alpha').length;
        const attendanceRate = countedAtt.length > 0
            ? Math.round((hadirCount / countedAtt.length) * 100)
            : 100;

        let attendanceRiskComponent = 0;

        if (attendanceRate < 70) {
            attendanceRiskComponent += 28;
            factors.push({
                category: 'attendance',
                severity: 'high',
                title: 'Tingkat Kehadiran Kritis',
                description: `Kehadiran hanya ${attendanceRate}% (${countedAtt.length - hadirCount} hari tidak hadir).`,
                scoreContribution: 28,
            });
        } else if (attendanceRate < 80) {
            attendanceRiskComponent += 18;
            factors.push({
                category: 'attendance',
                severity: 'medium',
                title: 'Kehadiran di Bawah Batas Aman',
                description: `Kehadiran ${attendanceRate}% (ambang aman >= 85%).`,
                scoreContribution: 18,
            });
        } else if (attendanceRate < 88) {
            attendanceRiskComponent += 8;
        }

        if (alphaCount >= 3) {
            const alphaPenalty = Math.min(12, alphaCount * 4);
            attendanceRiskComponent += alphaPenalty;
            factors.push({
                category: 'attendance',
                severity: 'high',
                title: 'Akumulasi Alpha Tinggi',
                description: `Tercatat ${alphaCount} kali Alpha (tanpa keterangan).`,
                scoreContribution: alphaPenalty,
            });
        } else if (alphaCount >= 1) {
            attendanceRiskComponent += 4;
        }

        attendanceRiskComponent = Math.min(35, attendanceRiskComponent);

        // ── 2. Academic Performance & Trend (Weight: 35 pts max) ──
        let academicRiskComponent = 0;
        let recentGradeAvg: number | null = null;
        let gradeDropPoints = 0;

        if (studentAca.length > 0) {
            const sortedAca = [...studentAca].sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
            const scores = sortedAca.map((s) => Number(s.score) || 0);
            const totalScore = scores.reduce((sum, s) => sum + s, 0);
            recentGradeAvg = Math.round(totalScore / scores.length);

            // Baseline score vs KKTP
            if (recentGradeAvg < kktp - 15) {
                academicRiskComponent += 24;
                factors.push({
                    category: 'academic',
                    severity: 'high',
                    title: 'Rata-rata Nilai Jauh di Bawah KKTP',
                    description: `Rata-rata nilai ${recentGradeAvg} (Target KKTP: ${kktp}).`,
                    scoreContribution: 24,
                });
            } else if (recentGradeAvg < kktp) {
                academicRiskComponent += 14;
                factors.push({
                    category: 'academic',
                    severity: 'medium',
                    title: 'Rata-rata Nilai di Bawah KKTP',
                    description: `Rata-rata nilai ${recentGradeAvg} perlu perbaikan menuju target ${kktp}.`,
                    scoreContribution: 14,
                });
            }

            // Drop trend check
            if (scores.length >= 2) {
                const half = Math.floor(scores.length / 2);
                const firstHalf = scores.slice(0, half);
                const secondHalf = scores.slice(half);

                const avgFirst = firstHalf.reduce((a, b) => a + b, 0) / firstHalf.length;
                const avgSecond = secondHalf.reduce((a, b) => a + b, 0) / secondHalf.length;
                const drop = avgFirst - avgSecond;

                if (drop >= 8) {
                    gradeDropPoints = Math.round(drop);
                    const dropPenalty = Math.min(15, Math.round(drop * 1.2));
                    academicRiskComponent += dropPenalty;
                    factors.push({
                        category: 'academic',
                        severity: drop >= 15 ? 'high' : 'medium',
                        title: 'Tren Penurunan Nilai Signifikan',
                        description: `Terjadi penurunan performa sebesar ~${gradeDropPoints} poin dari penilaian sebelumnya.`,
                        scoreContribution: dropPenalty,
                    });
                }
            }
        }

        academicRiskComponent = Math.min(35, academicRiskComponent);

        // ── 3. Discipline & Violations (Weight: 20 pts max) ──
        let violationRiskComponent = 0;
        const totalViolationPoints = studentVio.reduce((sum, v) => sum + (Number(v.points) || 0), 0);

        if (totalViolationPoints >= 25) {
            violationRiskComponent = 20;
            factors.push({
                category: 'discipline',
                severity: 'high',
                title: 'Poin Pelanggaran Sangat Tinggi',
                description: `Akumulasi ${totalViolationPoints} poin pelanggaran tercatat.`,
                scoreContribution: 20,
            });
        } else if (totalViolationPoints >= 10) {
            violationRiskComponent = 12;
            factors.push({
                category: 'discipline',
                severity: 'medium',
                title: 'Catatan Pelanggaran Perlu Perhatian',
                description: `Akumulasi ${totalViolationPoints} poin pelanggaran.`,
                scoreContribution: 12,
            });
        } else if (totalViolationPoints > 0) {
            violationRiskComponent = 5;
        }

        // ── 4. Task Completion (Weight: 10 pts max) ──
        let taskRiskComponent = 0;
        if (overdueTasksCount >= 3) {
            taskRiskComponent = 10;
            factors.push({
                category: 'task',
                severity: 'medium',
                title: 'Tugas Kelas Terlambat',
                description: `${overdueTasksCount} tugas terlewat dari tenggat waktu.`,
                scoreContribution: 10,
            });
        } else if (overdueTasksCount >= 1) {
            taskRiskComponent = 5;
        }

        // ── Total Composite Score (0 - 100) ──
        const rawTotalScore = attendanceRiskComponent + academicRiskComponent + violationRiskComponent + taskRiskComponent;
        const riskScore = Math.min(100, Math.max(0, Math.round(rawTotalScore)));

        let riskLevel: RiskLevel = 'low';
        if (riskScore >= 55) {
            riskLevel = 'high';
        } else if (riskScore >= 28) {
            riskLevel = 'medium';
        }

        // Trend projection
        let predictedTrend: StudentRiskAssessment['predictedTrend'] = 'stable';
        if (riskScore >= 65 || (alphaCount >= 3 && gradeDropPoints >= 10)) {
            predictedTrend = 'critical';
        } else if (gradeDropPoints >= 8 || alphaCount >= 2 || riskScore >= 40) {
            predictedTrend = 'declining';
        } else if (riskScore < 20 && attendanceRate >= 95 && (recentGradeAvg ?? 0) >= kktp) {
            predictedTrend = 'improving';
        }

        return {
            student,
            riskScore,
            riskLevel,
            factors,
            metrics: {
                attendanceRate,
                recentAlphaCount: alphaCount,
                recentGradeAvg,
                gradeDropPoints,
                violationPoints: totalViolationPoints,
                pendingTasksCount: overdueTasksCount,
            },
            predictedTrend,
        };
    }).sort((a, b) => b.riskScore - a.riskScore);
}

// =============================================================================
// 2. ATTENDANCE PATTERN ANALYSIS & ANOMALY DETECTION
// =============================================================================

/**
 * Analyzes attendance patterns by weekday and detects consecutive absences.
 */
export function analyzeAttendancePatterns(
    attendance: AnalyticsAttendance[],
    students: Student[]
): AttendancePatternAnalysis {
    const studentMap = new Map<string, Student>(students.map((s) => [s.id, s]));

    // Day of week buckets: index 0 (Sunday) to 6 (Saturday)
    const dayStats: Array<{ total: number; absent: number }> = Array.from({ length: 7 }, () => ({
        total: 0,
        absent: 0,
    }));

    attendance.forEach((att) => {
        if (!att.date || att.status === 'Libur') return;
        const dateObj = new Date(att.date);
        if (isNaN(dateObj.getTime())) return;

        const dayIdx = dateObj.getDay();
        dayStats[dayIdx].total += 1;

        if (att.status === 'Alpha' || att.status === 'Sakit' || att.status === 'Izin') {
            dayStats[dayIdx].absent += 1;
        }
    });

    const dayPatterns: DayOfWeekPattern[] = dayStats.map((stat, idx) => {
        const absentRate = stat.total > 0 ? Math.round((stat.absent / stat.total) * 100) : 0;
        return {
            dayName: INDONESIAN_DAYS[idx],
            dayIndex: idx,
            totalSessions: stat.total,
            absentCount: stat.absent,
            absentRate,
            isHighRisk: absentRate >= 20 && stat.total >= 5,
        };
    }).filter((d) => d.dayIndex >= 1 && d.dayIndex <= 6); // Filter out Sunday if mostly empty

    // Find most vulnerable day
    let highestRate = -1;
    let mostVulnerableDay: string | null = null;

    dayPatterns.forEach((d) => {
        if (d.totalSessions >= 5 && d.absentRate > highestRate && d.absentRate > 10) {
            highestRate = d.absentRate;
            mostVulnerableDay = `${d.dayName} (${d.absentRate}% ketidakhadiran)`;
        }
    });

    // Consecutive absences detection (>= 3 consecutive days for the same student)
    const consecutiveAlerts: AttendancePatternAnalysis['consecutiveAbsenceAlerts'] = [];
    const studentAttMap = new Map<string, AnalyticsAttendance[]>();

    attendance.forEach((a) => {
        const list = studentAttMap.get(a.student_id) || [];
        list.push(a);
        studentAttMap.set(a.student_id, list);
    });

    studentAttMap.forEach((records, sid) => {
        const student = studentMap.get(sid);
        if (!student) return;

        const sorted = [...records]
            .filter((r) => r.status !== 'Libur')
            .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

        let run = 0;
        let runStart = '';
        let runEnd = '';

        for (let i = 0; i < sorted.length; i++) {
            const isAbsent = sorted[i].status === 'Alpha' || sorted[i].status === 'Sakit';
            if (isAbsent) {
                if (run === 0) runStart = sorted[i].date;
                runEnd = sorted[i].date;
                run += 1;
            } else {
                if (run >= 3) {
                    consecutiveAlerts.push({
                        student,
                        consecutiveDays: run,
                        startDate: runStart,
                        endDate: runEnd,
                    });
                }
                run = 0;
            }
        }

        if (run >= 3) {
            consecutiveAlerts.push({
                student,
                consecutiveDays: run,
                startDate: runStart,
                endDate: runEnd,
            });
        }
    });

    // Trend calculation
    const allValid = attendance.filter((a) => a.status !== 'Libur');
    let overallTrend: 'rising' | 'stable' | 'dropping' = 'stable';

    if (allValid.length >= 10) {
        const sorted = [...allValid].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
        const mid = Math.floor(sorted.length / 2);
        const early = sorted.slice(0, mid);
        const late = sorted.slice(mid);

        const earlyHadirRate = early.filter((a) => a.status === 'Hadir').length / early.length;
        const lateHadirRate = late.filter((a) => a.status === 'Hadir').length / late.length;

        if (lateHadirRate - earlyHadirRate >= 0.05) {
            overallTrend = 'rising';
        } else if (earlyHadirRate - lateHadirRate >= 0.05) {
            overallTrend = 'dropping';
        }
    }

    return {
        dayPatterns,
        mostVulnerableDay,
        consecutiveAbsenceAlerts: consecutiveAlerts.slice(0, 10),
        overallAttendanceTrend: overallTrend,
        recentSpikeDetected: highestRate >= 25,
    };
}

// =============================================================================
// 3. ACADEMIC PERFORMANCE FORECASTING
// =============================================================================

/**
 * Forecasts end-of-semester scores per subject and student using linear regression trend.
 */
export function forecastAcademicPerformance(
    students: Student[],
    academicRecords: AnalyticsAcademicRecord[],
    kktpThreshold: number = DEFAULT_KKTP_THRESHOLD
): StudentPerformanceForecast[] {
    const recordsByStudent = new Map<string, AnalyticsAcademicRecord[]>();

    academicRecords.forEach((rec) => {
        const list = recordsByStudent.get(rec.student_id) || [];
        list.push(rec);
        recordsByStudent.set(rec.student_id, list);
    });

    return students.map((student) => {
        const records = recordsByStudent.get(student.id) || [];

        // Group by subject
        const bySubject = new Map<string, AnalyticsAcademicRecord[]>();
        records.forEach((r) => {
            const subj = r.subject || 'Umum';
            const list = bySubject.get(subj) || [];
            list.push(r);
            bySubject.set(subj, list);
        });

        const subjectForecasts: SubjectForecast[] = [];
        let totalPredicted = 0;
        let kktpRiskCount = 0;

        bySubject.forEach((subjRecords, subject) => {
            const sorted = [...subjRecords].sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
            const scores = sorted.map((r) => Number(r.score) || 0);
            const currentAvg = Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);

            const slope = calculateLinearSlope(scores);
            // Project forward by 2 steps
            const rawPrediction = currentAvg + slope * 2;
            const predictedScore = Math.max(0, Math.min(100, Math.round(rawPrediction)));
            const kktpGap = predictedScore - kktpThreshold;

            let status: SubjectForecast['status'] = 'safe';
            if (predictedScore < kktpThreshold - 7) {
                status = 'critical';
                kktpRiskCount++;
            } else if (predictedScore < kktpThreshold) {
                status = 'warning';
                kktpRiskCount++;
            }

            subjectForecasts.push({
                subject,
                currentAvg,
                predictedScore,
                trendSlope: slope,
                kktpGap,
                status,
            });

            totalPredicted += predictedScore;
        });

        const overallPredictedAvg = subjectForecasts.length > 0
            ? Math.round(totalPredicted / subjectForecasts.length)
            : 0;

        return {
            student,
            overallPredictedAvg,
            subjectForecasts,
            kktpRiskCount,
        };
    }).sort((a, b) => b.kktpRiskCount - a.kktpRiskCount || a.overallPredictedAvg - b.overallPredictedAvg);
}

// =============================================================================
// 4. AI INTERVENTION PLAN GENERATOR (WITH ROBUST OFFLINE FALLBACK)
// =============================================================================

/**
 * Builds a heuristic offline intervention plan if AI LLM call fails or is offline.
 */
export function generateFallbackInterventionPlan(
    assessment: StudentRiskAssessment
): InterventionPlan {
    const { student, metrics, factors, riskScore, riskLevel } = assessment;

    const instructional: string[] = [];
    const counseling: string[] = [];

    if (metrics.attendanceRate < 80 || metrics.recentAlphaCount > 0) {
        counseling.push(
            `Klarifikasi alasan ketidakhadiran (${metrics.attendanceRate}% hadir, ${metrics.recentAlphaCount} alpha) melalui sesi dialog 1-on-1 empatik.`
        );
        counseling.push('Buat lembar komitmen kehadiran bersama siswa.');
    }

    if ((metrics.recentGradeAvg ?? 100) < DEFAULT_KKTP_THRESHOLD || metrics.gradeDropPoints >= 8) {
        instructional.push(
            `Berikan sesi bimbingan belajar remedial terjadwal dengan materi esensial terdiferensiasi.`
        );
        instructional.push(
            `Tugaskan teman sebaya (peer tutor) berkemampuan tinggi untuk mendampingi latihan mandiri.`
        );
    }

    if (metrics.violationPoints > 0) {
        counseling.push(
            `Review catatan kedisiplinan (${metrics.violationPoints} poin) bersama guru BK untuk menetapkan target perbaikan perilaku bertahap.`
        );
    }

    if (instructional.length === 0) {
        instructional.push('Lanjutkan program pengayaan materi dan apresiasi konsistensi belajar siswa.');
    }

    if (counseling.length === 0) {
        counseling.push('Berikan afirmasi positif berkala untuk menjaga motivasi dan etos belajar siswa.');
    }

    const summary = riskLevel === 'high'
        ? `Siswa membutuhkan intervensi terpadu segera (skor risiko ${riskScore}/100) mencakup penguatan kehadiran dan pendampingan akademik intensif.`
        : riskLevel === 'medium'
        ? `Siswa menunjukkan potensi penurunan performa (skor risiko ${riskScore}/100) yang dapat diatasi dengan pendampingan bertahap dan pemantauan aktif.`
        : `Kondisi belajar siswa dalam kategori stabil (skor risiko ${riskScore}/100). Pertahankan performa dengan pengayaan berkala.`;

    const parentDraft = `Yth. Bapak/Ibu Wali dari ${student.name},\n\nSemoga Bapak/Ibu sekeluarga senantiasa sehat. Kami dari pihak sekolah ingin menyampaikan apresiasi atas perkembangan ananda di kelas.\n\nUntuk mendukung potensi ${student.name} agar semakin optimal, kami mencatat perlunya perhatian bersama terkait ${factors.map((f) => f.title.toLowerCase()).join(', ') || 'konsistensi belajar'}.\n\nKami mengundang Bapak/Ibu untuk berdiskusi santai mengenai langkah pendampingan di rumah. Terima kasih banyak atas kerja sama yang baik.\n\nSalam hangat,\nWali Kelas`;

    return {
        studentId: student.id,
        studentName: student.name,
        summary,
        instructionalRemedial: instructional,
        behavioralCounseling: counseling,
        parentCommunicationDraft: parentDraft,
        recommendedTimeline: riskLevel === 'high' ? '1 - 2 Minggu ke depan' : '1 Bulan ke depan',
        generatedBy: 'Offline Fallback',
    };
}

/**
 * Generates an actionable AI intervention plan for an at-risk student.
 */
export async function generateAiInterventionPlan(
    assessment: StudentRiskAssessment
): Promise<InterventionPlan> {
    const fallback = generateFallbackInterventionPlan(assessment);

    const systemInstruction = `Anda adalah Asisten Pedagogik dan Konseling Guru Cerdas Kurikulum Merdeka Indonesia.
Analisis profil siswa berisiko dan susun rencana tindakan intervensi konkret, empatik, terarah, dan siap diterapkan.
Gunakan Bahasa Indonesia baku dan profesional.

Format JSON yang diwajibkan:
{
  "summary": "Ringkasan diagnosis risiko siswa dalam 1-2 kalimat.",
  "instructionalRemedial": ["Langkah instruksional 1", "Langkah instruksional 2"],
  "behavioralCounseling": ["Langkah konseling 1", "Langkah konseling 2"],
  "parentCommunicationDraft": "Draft pesan santun dan persuasif untuk orang tua siswa",
  "recommendedTimeline": "Contoh: 1-2 Minggu"
}`;

    const prompt = `Profil Risiko Siswa:
Nama: ${assessment.student.name}
Skor Risiko (SRI): ${assessment.riskScore}/100 (${assessment.riskLevel.toUpperCase()})
Tren: ${assessment.predictedTrend}
Tingkat Kehadiran: ${assessment.metrics.attendanceRate}% (Alpha: ${assessment.metrics.recentAlphaCount})
Rata-rata Nilai: ${assessment.metrics.recentGradeAvg ?? 'Belum ada'} (Penurunan: ${assessment.metrics.gradeDropPoints} poin)
Poin Pelanggaran: ${assessment.metrics.violationPoints}
Tugas Terlambat: ${assessment.metrics.pendingTasksCount}

Faktor Risiko Terdeteksi:
${assessment.factors.map((f) => `- [${f.category.toUpperCase()}] ${f.title}: ${f.description}`).join('\n') || '- Tidak ada faktor kritis'}

Susun rencana intervensi terbaik untuk guru dan wali kelas!`;

    try {
        const response = await generateGeminiJson<Partial<InterventionPlan>>(prompt, systemInstruction, 'insight');

        if (response && response.summary && response.parentCommunicationDraft) {
            return {
                studentId: assessment.student.id,
                studentName: assessment.student.name,
                summary: response.summary,
                instructionalRemedial: response.instructionalRemedial || fallback.instructionalRemedial,
                behavioralCounseling: response.behavioralCounseling || fallback.behavioralCounseling,
                parentCommunicationDraft: response.parentCommunicationDraft,
                recommendedTimeline: response.recommendedTimeline || fallback.recommendedTimeline,
                generatedBy: 'AI',
            };
        }
        return fallback;
    } catch (error) {
        logger.warn('AI intervention generation failed, using fallback heuristic', 'PredictiveAnalytics', error);
        return fallback;
    }
}

// =============================================================================
// 5. PERIODIC CLASS NARRATIVE REPORT GENERATOR
// =============================================================================

export interface GenerateClassReportInput {
    className: string;
    period: string;
    totalStudents: number;
    attendanceRate: number;
    classAvgScore: number;
    highRiskCount: number;
    topPerformerCount: number;
    vulnerabilities: string[];
}

export function generateFallbackClassNarrativeReport(
    input: GenerateClassReportInput
): AiClassNarrativeReport {
    const execSummary = `Pada periode ${input.period}, kelas ${input.className} dengan total ${input.totalStudents} siswa mencatatkan tingkat kehadiran rata-rata sebesar ${input.attendanceRate}% dan rata-rata nilai akademik ${input.classAvgScore}. Secara keseluruhan kelas menunjukkan dinamika belajar yang ${input.attendanceRate >= 85 ? 'produktif dan stabil' : 'memerlukan penguatan kedisiplinan dan remedial terarah'}.`;

    const keyAchievements: string[] = [];
    if (input.attendanceRate >= 85) keyAchievements.push(`Disiplin kehadiran kelas terjaga dengan baik pada angka ${input.attendanceRate}%.`);
    if (input.topPerformerCount > 0) keyAchievements.push(`${input.topPerformerCount} siswa menunjukkan capaian nilai akademik melampaui target KKTP.`);
    if (keyAchievements.length === 0) keyAchievements.push('Aktivitas pembelajaran harian berlangsung tertib dan tuntas.');

    const criticalConcerns: string[] = [];
    if (input.highRiskCount > 0) criticalConcerns.push(`Terdapat ${input.highRiskCount} siswa dengan indikator risiko tinggi yang memerlukan bimbingan khusus.`);
    if (input.vulnerabilities.length > 0) criticalConcerns.push(...input.vulnerabilities);
    if (criticalConcerns.length === 0) criticalConcerns.push('Tidak ditemukan kendala perilaku atau kehadiran mayor pada periode ini.');

    const actions = [
        'Lakukan evaluasi formatif mingguan untuk memetakan ketercapaian materi.',
        'Koordinasikan jadwal bimbingan remedial bagi siswa dengan capaian di bawah KKTP.',
        'Pertahankan komunikasi rutin dengan wali murid melalui catatan kelas berkala.',
    ];

    return {
        title: `Laporan Narasi Kinerja Belajar — ${input.className}`,
        period: input.period,
        executiveSummary: execSummary,
        keyAchievements,
        criticalConcerns,
        suggestedTeacherActions: actions,
        generatedAt: new Date().toISOString(),
        generatedBy: 'Offline Fallback',
    };
}

export async function generateAiClassNarrativeReport(
    input: GenerateClassReportInput
): Promise<AiClassNarrativeReport> {
    const fallback = generateFallbackClassNarrativeReport(input);

    const systemInstruction = `Anda adalah Konsultan Ahli Evaluasi Pendidikan Madrasah/Sekolah Indonesia.
Buat laporan naratif berkala yang elegan, obyektif, konstruktif, dan berbasis data untuk wali kelas dan kepala sekolah.
Gunakan Bahasa Indonesia formal.

Format JSON yang diwajibkan:
{
  "title": "Judul Laporan",
  "executiveSummary": "Ringkasan eksekutif komprehensif dalam 2-3 paragraf naratif yang padat.",
  "keyAchievements": ["Pencapaian utama 1", "Pencapaian utama 2"],
  "criticalConcerns": ["Isu krusial 1", "Isu krusial 2"],
  "suggestedTeacherActions": ["Rekomendasi tindakan guru 1", "Rekomendasi 2"]
}`;

    const prompt = `Data Kinerja Kelas:
Kelas: ${input.className}
Periode: ${input.period}
Total Siswa: ${input.totalStudents}
Rata-rata Kehadiran: ${input.attendanceRate}%
Rata-rata Nilai: ${input.classAvgScore}
Siswa Berisiko Tinggi: ${input.highRiskCount}
Siswa Berprestasi Unggul: ${input.topPerformerCount}
Catatan Kerentanan: ${input.vulnerabilities.join('; ') || 'Tidak ada'}`;

    try {
        const response = await generateGeminiJson<Partial<AiClassNarrativeReport>>(prompt, systemInstruction, 'insight');

        if (response && response.executiveSummary) {
            return {
                title: response.title || fallback.title,
                period: input.period,
                executiveSummary: response.executiveSummary,
                keyAchievements: response.keyAchievements || fallback.keyAchievements,
                criticalConcerns: response.criticalConcerns || fallback.criticalConcerns,
                suggestedTeacherActions: response.suggestedTeacherActions || fallback.suggestedTeacherActions,
                generatedAt: new Date().toISOString(),
                generatedBy: 'AI',
            };
        }
        return fallback;
    } catch (error) {
        logger.warn('AI class narrative generation failed, using fallback', 'PredictiveAnalytics', error);
        return fallback;
    }
}
