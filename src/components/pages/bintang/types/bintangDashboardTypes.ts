import { type SeverityLevel } from '../../student/violationMeta';

export interface BintangStudent {
    id: string;
    name: string;
    gender?: string | null;
    parent_phone?: string | null;
    parent_name?: string | null;
}

export interface BintangViolation {
    id: string;
    student_id: string;
    user_id: string | null;
    description: string;
    points: number;
    date: string;
    severity: string | null;
    semester_id: string | null;
    type: string | null;
    context_notes: string | null;
    evidence_url: string | null;
    created_at: string;
    follow_up_status?: string | null;
    follow_up_notes?: string | null;
    parent_notified?: boolean | null;
    parent_notified_at?: string | null;
    students?: { name?: string; [key: string]: unknown };
    users?: { name?: string; [key: string]: unknown };
}

export interface BintangEvaluation {
    id: string;
    student_id: string;
    month: string;
    adab_score: string | null;
    kedisiplinan_score: string | null;
    kerapian_score: string | null;
    adab_notes: string | null;
    kedisiplinan_notes: string | null;
    kerapian_notes: string | null;
    catatan_wali: string | null;
    is_published: boolean;
    evaluator_id: string;
    updated_at?: string | null;
}

export interface BintangQuizPoint {
    id: string;
    student_id: string;
    quiz_name: string | null;
    subject: string | null;
    points: number;
    category: string | null;
    quiz_date: string;
    semester_id: string | null;
    created_at?: string | null;
}

export interface MentoringLogItem {
    id: string;
    date: string;
    notes: string;
    mentor_role: string;
    student_id?: string;
    mentor_id?: string;
    students?: { name: string } | null;
}

export interface DailyObservationItem {
    id: string;
    student_id: string;
    teacher_id: string;
    date: string;
    aspect: string;
    is_positive: boolean;
    observation: string;
    [key: string]: unknown;
}

export const getViolationSeverityFromCategory = (category?: string): SeverityLevel | null => {
    const normalized = category?.toLowerCase();
    if (normalized === 'ringan' || normalized === 'sedang' || normalized === 'berat') {
        return normalized as SeverityLevel;
    }
    return null;
};

/** Bulan berjalan dalam WIB (UTC+7), hindari off-by-one di 00:00 sampai 07:00 WIB. */
export function getCurrentMonthWib(): string {
    const now = new Date(Date.now() + 7 * 60 * 60 * 1000);
    return `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, '0')}`;
}
