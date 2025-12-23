import { Database } from '../../../services/database.types';

export type StudentRow = Database['public']['Tables']['students']['Row'];
export type ClassRow = Database['public']['Tables']['classes']['Row'];
export type ReportRow = Database['public']['Tables']['reports']['Row'];
export type AttendanceRow = Database['public']['Tables']['attendance']['Row'];
export type AcademicRecordRow = Database['public']['Tables']['academic_records']['Row'];
export type ViolationRow = Database['public']['Tables']['violations']['Row'];
export type QuizPointRow = Database['public']['Tables']['quiz_points']['Row'];
export type CommunicationRow = Database['public']['Tables']['communications']['Row'];

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
