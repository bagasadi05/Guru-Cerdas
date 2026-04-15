import { Database } from '../../../services/database.types';

export type ClassRow = Database['public']['Tables']['classes']['Row'];
export type StudentRow = Database['public']['Tables']['students']['Row'];
export type AcademicRecordRow = Database['public']['Tables']['academic_records']['Row'];

type ViolationRowBase = Database['public']['Tables']['violations']['Row'];
type ViolationRowRequiredKeys =
    | 'id'
    | 'student_id'
    | 'date'
    | 'description'
    | 'points'
    | 'created_at'
    | 'user_id';

/**
 * Extended ViolationRow with UI-specific fields.
 */
export type ViolationRow = Partial<ViolationRowBase> & Pick<ViolationRowBase, ViolationRowRequiredKeys> & {
    /** Severity level */
    severity?: string | null;
    /** Follow-up status */
    follow_up_status?: string | null;
    /** Follow-up notes */
    follow_up_notes?: string | null;
    /** Evidence/attachment URL */
    evidence_url?: string | null;
    /** Whether parent has been notified */
    parent_notified?: boolean | null;
};


export type InputMode = 'quiz' | 'subject_grade' | 'violation' | 'violation_export' | 'bulk_report' | 'academic_print' | 'delete_subject_grade';
export type Step = 1 | 2;
export type ReviewDataItem = { studentName: string; score: string; };
export type StudentFilter = 'all' | 'selected' | 'unselected' | 'graded' | 'ungraded';

export interface MassInputState {
    step: Step;
    mode: InputMode | null;
    selectedClass: string;
    quizInfo: { name: string; subject: string; date: string };
    subjectGradeInfo: { subject: string; assessment_name: string; notes: string };
    scores: Record<string, string>;
    pasteData: string;
    isParsing: boolean;
    selectedViolationCode: string;
    violationDate: string;
    selectedStudentIds: Set<string>;
    searchTerm: string;
    studentFilter: StudentFilter;
    isExporting: boolean;
    exportProgress: string;
    noteMethod: 'ai' | 'template';
    templateNote: string;
    confirmDeleteModal: { isOpen: boolean; count: number };
    validationErrors: Record<string, string>;
    isConfigOpen: boolean;
    isCustomSubject: boolean;
}
