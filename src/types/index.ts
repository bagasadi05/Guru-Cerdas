/**
 * @fileoverview Central export point for all type definitions
 *
 * This file serves as the main entry point for importing types throughout
 * the application. Import types from here instead of individual type files.
 *
 * @example
 * ```typescript
 * import type { StudentRow, DashboardQueryData } from '@/types';
 * import { AttendanceStatus } from '@/types';
 * ```
 *
 * @module types
 */

// =============================================================================
// DATABASE TYPES (using 'export type' for isolatedModules compatibility)
// =============================================================================

export type {
// Row types
    StudentRow,
    ClassRow,
    AttendanceRow,
    TaskRow,
    ScheduleRow,
    AcademicRecordRow,
    ViolationRow,
    ReportRow,
    QuizPointRow,
    CommunicationRow,
    AcademicYearRow,
    SemesterRow,
    PhScheduleRow,

    // Insert types
    AttendanceInsert,
    StudentInsert,
    ClassInsert,
    TaskInsert,
    ScheduleInsert,
    AcademicRecordInsert,
    ViolationInsert,
    ReportInsert,
    QuizPointInsert,
    CommunicationInsert,
    AcademicYearInsert,
    SemesterInsert,
    PhScheduleInsert,

    // Update types
    StudentUpdate,
    ClassUpdate,
    AttendanceUpdate,
    TaskUpdate,
    ScheduleUpdate,
    AcademicRecordUpdate,
    ViolationUpdate,
    ReportUpdate,
    QuizPointUpdate,
    CommunicationUpdate,
    AcademicYearUpdate,
    SemesterUpdate,
    PhScheduleUpdate,

    // Composite types
    StudentWithClass,
    StudentListItem,
    ClassListItem,
    AcademicRecordSummary,
    ViolationSummary,
    WeeklyAttendance,
    DailyAttendanceSummary,

    // Database type for direct access
    Database,
} from './database';

// =============================================================================
// ENUM TYPES (enums are values, use regular export)
// =============================================================================

export {
    AttendanceStatus,
    ATTENDANCE_STATUS_VALUES,
    TaskStatus,
    TaskPriority,
    ExportFormat,
    InputMode,
    SortDirection,
    StudentFilter,
    DayOfWeek,
    WEEKDAYS,
    ViewMode,
    ModalMode,
    ToastType,
} from './enums';

// =============================================================================
// API TYPES
// =============================================================================

export type {
    DashboardQueryData,
    StudentInsightItem,
    AiInsight,
    StoredInsight,
    AiStudentSummary,
    ExportColumn,
    ExportableStudentData,
    ExportableAttendanceData,
    SearchResult,
    ValidationRule,
    ValidationRules,
    ValidationResult,
    FormValidationState,
    QueueItem,
    SyncStatus,
    BackupData,
    AiAnalysis,
} from './api';

export { QueuePriority } from './api';

// =============================================================================
// COMPONENT TYPES
// =============================================================================

export type {
    ClassNameProps,
    ChildrenProps,
    BaseComponentProps,
    StudentViewProps,
    SortConfig,
    StudentTableProps,
    ModalBaseProps,
    ConfirmModalProps,
    StudentDetailModalState,
    FormInputProps,
    SelectOption,
    SkeletonProps,
    EmptyStateProps,
    ErrorStateProps,
    BulkAction,
    ContextMenuAction,
    ExportFormatType,
    ExportModalProps,
    StudentMutationVars,
    ReportMutationVars,
    AcademicMutationVars,
    QuizMutationVars,
    ViolationMutationVars,
    CommunicationMutationVars,
} from './components';

// =============================================================================
// FORM TYPES
// =============================================================================

export type {
    FieldError,
    FormValidationState as FormValidationStateForm,
    ValidationRuleConfig,
    StudentFormData,
    StudentFormState,
    ClassFormData,
    ClassFormState,
    AttendanceStatusValue,
    AttendanceEntryData,
    BulkAttendanceFormData,
    AcademicRecordFormData,
    BulkGradeFormData,
    ViolationFormData,
    TaskFormData,
    ScheduleFormData,
    CommunicationFormData,
    ReportFormData,
    UseFormStateReturn,
    FieldRegistration,
} from './forms';

// =============================================================================
// LEGACY TYPES (for backward compatibility)
// =============================================================================

/**
 * @deprecated Use ExportColumn from './api' instead
 */
export type ExportColumnLegacy = {
    key: string;
    label: string;
    selected: boolean;
};

/**
 * Attendance record for local state management.
 */
export type AttendanceRecord = {
    id?: string;
    status: import('./enums').AttendanceStatus;
    note: string;
    official_status?: import('./enums').AttendanceStatus | null;
};

// =============================================================================
// ACHIEVEMENT TYPES
// =============================================================================

export type {
    StudentAchievement,
    StudentAchievementInsert,
    StudentAchievementUpdate,
    AchievementCategory,
    AchievementLevel,
    AchievementRank,
} from './studentAchievement';
export {
    ACHIEVEMENT_CATEGORIES,
    ACHIEVEMENT_LEVELS,
    ACHIEVEMENT_RANKS,
} from './studentAchievement';

// =============================================================================
// TEACHING JOURNAL TYPES
// =============================================================================

export type {
    TeachingJournal,
    TeachingJournalInsert,
    TeachingJournalUpdate,
    TeachingJournalFilters,
    TeachingJournalRekap,
} from './teachingJournal';

// =============================================================================
// PERANGKAT AJAR TYPES (Prota, Promes, Kaldik, & RME)
// =============================================================================

export type {
    WeekType,
    WeekTypeStyle,
    MonthMeta,
    KaldikWeek,
    AcademicYearConfig,
    RmeSummary,
    CurriculumType,
    PhaseType,
    ProtaBalanceStatus,
    ProtaItem,
    ProtaValidationResult,
    ProtaHeader,
    AllocationMatchStatus,
    MatrixCell,
    MatrixRowStatus,
    AutoDistributeInput,
    ColumnWeeklySum,
    PromesHeader,
    DocumentIdentity,
    ExportDocumentType,
    ExportFileFormat,
    ExportPerangkatAjarOptions,
    KaldikEntryRow,
    KaldikEntryInsert,
    KaldikEntryUpdate,
    ProtaHeaderRow,
    ProtaHeaderInsert,
    ProtaHeaderUpdate,
    ProtaItemRow,
    ProtaItemInsert,
    ProtaItemUpdate,
    PromesHeaderRow,
    PromesHeaderInsert,
    PromesHeaderUpdate,
    PromesWeeklyAllocationRow,
    PromesWeeklyAllocationInsert,
    PromesWeeklyAllocationUpdate,
} from './perangkatAjar';

export {
    WEEK_TYPES,
    WEEK_TYPE_LABELS,
    WEEK_TYPE_SHORT_LABELS,
    WEEK_TYPE_STYLES,
    isEffectiveWeek,
    ACADEMIC_MONTHS,
    createDefaultAcademicYearConfig,
    CURRICULUM_TYPES,
    PHASE_TYPES,
    PROTA_BALANCE_STATUS_LABELS,
    kaldikWeekToRowInsert,
    rowToKaldikWeek,
    protaItemToRowInsert,
    rowToProtaItem,
    matrixCellToRowInsert,
    rowToMatrixCell,
} from './perangkatAjar';

