import { Database } from '../../../services/database.types';

export interface AttendanceStats {
    total: number;
    hadir: number;
    izin: number;
    sakit: number;
    alpha: number;
    hadirRate: number;
}

export interface ClassStats {
    id: string;
    name: string;
    studentCount: number;
    attendanceRate: number;
    avgGrade?: number;
}

export interface DailyAttendance {
    date: string;
    hadir: number;
    izin: number;
    sakit: number;
    alpha: number;
    total: number;
}

export type AnalyticsClass = Pick<Database['public']['Tables']['classes']['Row'], 'id' | 'name'>;
export type Student = Pick<Database['public']['Tables']['students']['Row'], 'id' | 'name' | 'class_id' | 'gender'>;
export type AnalyticsAttendance = Pick<Database['public']['Tables']['attendance']['Row'], 'student_id' | 'date' | 'status'>;
export type AnalyticsTask = Pick<Database['public']['Tables']['tasks']['Row'], 'id' | 'status' | 'due_date'>;
export type AnalyticsAcademicRecord = Pick<Database['public']['Tables']['academic_records']['Row'], 'student_id' | 'score' | 'subject' | 'assessment_name' | 'created_at'>;
export type AnalyticsViolation = Pick<Database['public']['Tables']['violations']['Row'], 'id' | 'student_id' | 'type' | 'description' | 'points' | 'date' | 'created_at'>;
export type AnalyticsQuizPoint = Pick<Database['public']['Tables']['quiz_points']['Row'], 'id' | 'student_id' | 'points' | 'category' | 'created_at'>;

export interface AtRiskItem {
    student: Student;
    reason: 'attendance' | 'academic' | 'both';
    details: string;
}

export interface GradeDistribution {
    label: string;
    range: string;
    count: number;
    color: string;
    percentage: number;
}

export interface AnalyticsDataPayload {
    classes: AnalyticsClass[];
    students: Student[];
    attendance: AnalyticsAttendance[];
    tasks: AnalyticsTask[];
    academicRecords: AnalyticsAcademicRecord[];
    violations: AnalyticsViolation[];
    quizPoints: AnalyticsQuizPoint[];
    
    // Processed stats (can be moved out or kept depending on who calculates them)
    // We will calculate them in a view model hook
}

// =============================================================================
// PREDICTIVE ANALYTICS & AI REPORT TYPES (Roadmap Q3)
// =============================================================================

export type RiskLevel = 'low' | 'medium' | 'high';

export interface RiskFactor {
    category: 'attendance' | 'academic' | 'discipline' | 'task';
    severity: 'low' | 'medium' | 'high';
    title: string;
    description: string;
    scoreContribution: number; // 0 - 100 component
}

export interface StudentRiskAssessment {
    student: Student;
    riskScore: number; // 0 - 100
    riskLevel: RiskLevel;
    factors: RiskFactor[];
    metrics: {
        attendanceRate: number;
        recentAlphaCount: number;
        recentGradeAvg: number | null;
        gradeDropPoints: number; // Drop in points from previous average
        violationPoints: number;
        pendingTasksCount: number;
    };
    predictedTrend: 'improving' | 'stable' | 'declining' | 'critical';
}

export interface DayOfWeekPattern {
    dayName: string; // 'Senin', 'Selasa', dst.
    dayIndex: number; // 0 = Minggu, 1 = Senin, ...
    totalSessions: number;
    absentCount: number;
    absentRate: number; // percentage
    isHighRisk: boolean;
}

export interface AttendancePatternAnalysis {
    dayPatterns: DayOfWeekPattern[];
    mostVulnerableDay: string | null;
    consecutiveAbsenceAlerts: Array<{
        student: Student;
        consecutiveDays: number;
        startDate: string;
        endDate: string;
    }>;
    overallAttendanceTrend: 'rising' | 'stable' | 'dropping';
    recentSpikeDetected: boolean;
}

export interface SubjectForecast {
    subject: string;
    currentAvg: number;
    predictedScore: number;
    trendSlope: number; // positive = naik, negative = turun
    kktpGap: number; // predictedScore - kktpTarget
    status: 'safe' | 'warning' | 'critical';
}

export interface StudentPerformanceForecast {
    student: Student;
    overallPredictedAvg: number;
    subjectForecasts: SubjectForecast[];
    kktpRiskCount: number; // jumlah mapel di bawah KKTP
}

export interface InterventionPlan {
    studentId: string;
    studentName: string;
    summary: string;
    instructionalRemedial: string[];
    behavioralCounseling: string[];
    parentCommunicationDraft: string;
    recommendedTimeline: string;
    generatedBy: 'AI' | 'Offline Fallback';
}

export interface AiClassNarrativeReport {
    title: string;
    period: string;
    executiveSummary: string;
    keyAchievements: string[];
    criticalConcerns: string[];
    suggestedTeacherActions: string[];
    generatedAt: string;
    generatedBy: 'AI' | 'Offline Fallback';
}

