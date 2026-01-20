import { Database } from '../../../services/database.types';

export type StudentRow = Database['public']['Tables']['students']['Row'];
export type ClassRow = Database['public']['Tables']['classes']['Row'];
export type AttendanceRow = Database['public']['Tables']['attendance']['Row'];
export type AcademicRecordRow = Database['public']['Tables']['academic_records']['Row'];

/**
 * Base report row from database.
 */
type ReportRowBase = Database['public']['Tables']['reports']['Row'];

/**
 * Extended ReportRow with UI-specific fields.
 */
export type ReportRow = ReportRowBase & {
    /** Report date */
    date?: string;
    /** Additional notes */
    notes?: string;
    /** Report category */
    category?: string;
    /** Tags for filtering */
    tags?: string[];
    /** Attachment URL */
    attachment_url?: string;
};

/**
 * Base communication row from database.
 */
type CommunicationRowBase = Database['public']['Tables']['communications']['Row'];

/**
 * Extended CommunicationRow with UI-specific fields.
 */
export type CommunicationRow = CommunicationRowBase & {
    /** Sender name (teacher/parent) */
    sender?: string;
    /** Message content (alias for content) */
    message?: string;
    /** Attachment URL */
    attachment_url?: string;
    /** Attachment type (image/document) */
    attachment_type?: 'image' | 'document';
    /** Attachment file name */
    attachment_name?: string;
};


/**
 * Base violation row from database.
 */
type ViolationRowBase = Database['public']['Tables']['violations']['Row'];

/**
 * Extended ViolationRow with UI-specific fields.
 * These additional fields support the violation tracking features.
 */
export type ViolationRow = ViolationRowBase & {
    /** Severity level of the violation */
    severity?: 'ringan' | 'sedang' | 'berat';
    /** Follow-up status */
    follow_up_status?: 'pending' | 'in_progress' | 'resolved';
    /** Notes about the follow-up action */
    follow_up_notes?: string;
    /** Evidence/attachment URL */
    evidence_url?: string;
    /** Whether parent has been notified */
    parent_notified?: boolean;
};

/**
 * Base quiz point row from database.
 */
type QuizPointRowBase = Database['public']['Tables']['quiz_points']['Row'];

/**
 * Point category for UI categorization.
 */
export type PointCategory = 'bertanya' | 'presentasi' | 'tugas_tambahan' | 'menjawab' | 'diskusi' | 'lainnya';

/**
 * Extended QuizPointRow with UI-specific fields.
 * These additional fields support the ActivityTab component's features for tracking
 * point usage and categorization. The base fields come from the database, while
 * the extended fields are computed/managed by the UI layer.
 */
export type QuizPointRow = QuizPointRowBase & {
    /** Name of the quiz/activity (maps to 'reason' in some contexts) */
    quiz_name?: string;
    /** Subject associated with this point */
    subject?: string;
    /** Date of the quiz/activity */
    quiz_date?: string;
    /** Whether the point has been used/applied to a grade */
    is_used?: boolean;
    /** When the point was applied */
    used_at?: string;
    /** Which subject the point was applied to */
    used_for_subject?: string;
    /** Category of the point for filtering */
    category?: PointCategory;
    /** Maximum points value */
    max_points?: number;
};

export type StudentWithClass = StudentRow & { classes: Pick<ClassRow, 'id' | 'name'> | null };

export type StudentDetailsData = {
    student: StudentWithClass;
    reports: ReportRow[];
    attendanceRecords: AttendanceRow[];
    academicRecords: AcademicRecordRow[];
    quizPoints: QuizPointRow[];
    violations: ViolationRow[];
    classes: ClassRow[];
    communications: CommunicationRow[];
    studentExtracurriculars: (Database['public']['Tables']['student_extracurriculars']['Row'] & { extracurriculars: Database['public']['Tables']['extracurriculars']['Row'] | null })[];
    extracurricularAttendance: Database['public']['Tables']['extracurricular_attendance']['Row'][];
    extracurricularGrades: Database['public']['Tables']['extracurricular_grades']['Row'][];
};

export type ModalState =
    | { type: 'closed' }
    | { type: 'editStudent', data: StudentWithClass }
    | { type: 'report', data: ReportRow | null }
    | { type: 'academic', data: AcademicRecordRow | null }
    | { type: 'quiz', data: QuizPointRow | null }
    | { type: 'violation', mode: 'add' | 'edit', data: ViolationRow | null }
    | { type: 'confirmDelete', title: string; message: string; onConfirm: () => void; isPending: boolean }
    | { type: 'applyPoints' }
    | { type: 'editCommunication', data: CommunicationRow }
    | { type: 'portalAccess' };

export type AiSummary = {
    general_evaluation: string;
    strengths: string[];
    development_focus: string[];
    recommendations: string[];
};

export type StudentMutationVars = Database['public']['Tables']['students']['Update'];
export type ReportMutationVars = { operation: 'add', data: Database['public']['Tables']['reports']['Insert'] } | { operation: 'edit', data: Database['public']['Tables']['reports']['Update'], id: string };
export type AcademicMutationVars = { operation: 'add', data: Database['public']['Tables']['academic_records']['Insert'] } | { operation: 'edit', data: Database['public']['Tables']['academic_records']['Update'], id: string };
export type QuizMutationVars = { operation: 'add', data: Database['public']['Tables']['quiz_points']['Insert'] } | { operation: 'edit', data: Database['public']['Tables']['quiz_points']['Update'], id: number };
export type ViolationMutationVars = { operation: 'add', data: Database['public']['Tables']['violations']['Insert'] } | { operation: 'edit', data: Database['public']['Tables']['violations']['Update'], id: string };
export type CommunicationMutationVars = { operation: 'edit', data: { message: string }, id: string };
