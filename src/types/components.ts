/**
 * @fileoverview Shared component prop type definitions
 * 
 * This file contains type definitions for common component props
 * that are shared across multiple components.
 * 
 * @module types/components
 */

import type { StudentRow, ClassRow, ViolationRow, AcademicRecordRow, CommunicationRow, ReportRow, QuizPointRow } from './database';
import type { SortDirection } from './enums';

// =============================================================================
// COMMON PROP TYPES
// =============================================================================

/**
 * Base props for components that can be styled with className.
 */
export interface ClassNameProps {
    /** Additional CSS class names */
    className?: string;
}

/**
 * Base props for components with children.
 */
export interface ChildrenProps {
    /** React children elements */
    children?: React.ReactNode;
}

/**
 * Combined base props for styled components with children.
 */
export interface BaseComponentProps extends ClassNameProps, ChildrenProps { }

// =============================================================================
// STUDENT COMPONENT TYPES
// =============================================================================

/**
 * Props for student view components (table, card, list).
 */
export interface StudentViewProps {
    /** Array of students to display */
    students: StudentRow[];
    /** Function to check if a student is selected */
    isSelected: (id: string) => boolean;
    /** Function to toggle student selection */
    toggleItem: (id: string) => void;
    /** Handler for student actions (view, edit, delete, menu) */
    onAction: (student: StudentRow, action: 'view' | 'edit' | 'delete' | 'menu') => void;
}

/**
 * Sort configuration for tables.
 */
export interface SortConfig {
    /** Column key to sort by */
    key: string;
    /** Sort direction */
    direction: SortDirection | 'asc' | 'desc';
}

/**
 * Props for student table component with sorting.
 */
export interface StudentTableProps extends StudentViewProps {
    /** Whether all visible students are selected */
    isAllSelected: boolean;
    /** Function to toggle all selections */
    toggleAll: () => void;
    /** Current sort configuration */
    sortConfig: SortConfig;
    /** Handler for column sort click */
    onSort: (key: string) => void;
}

// =============================================================================
// MODAL TYPES
// =============================================================================

/**
 * Base props for modal components.
 */
export interface ModalBaseProps {
    /** Whether the modal is open */
    isOpen: boolean;
    /** Handler to close the modal */
    onClose: () => void;
}

/**
 * Props for confirmation modals.
 */
export interface ConfirmModalProps extends ModalBaseProps {
    /** Title of the confirmation dialog */
    title: string;
    /** Message body of the confirmation */
    message: string;
    /** Handler when user confirms */
    onConfirm: () => void;
    /** Text for the confirm button */
    confirmText?: string;
    /** Variant for the confirm button */
    confirmVariant?: 'default' | 'destructive';
    /** Whether confirmation is in progress */
    isLoading?: boolean;
}

/**
 * Discriminated union for student detail page modal states.
 */
export type StudentDetailModalState =
    | { type: 'closed' }
    | { type: 'editStudent'; data: StudentRow & { classes: Pick<ClassRow, 'id' | 'name'> | null } }
    | { type: 'report'; data: ReportRow | null }
    | { type: 'academic'; data: AcademicRecordRow | null }
    | { type: 'quiz'; data: QuizPointRow | null }
    | { type: 'violation'; mode: 'add' | 'edit'; data: ViolationRow | null }
    | { type: 'confirmDelete'; title: string; message: string; onConfirm: () => void; isPending: boolean }
    | { type: 'applyPoints' }
    | { type: 'editCommunication'; data: CommunicationRow }
    | { type: 'portalAccess' };

// =============================================================================
// FORM COMPONENT TYPES
// =============================================================================

/**
 * Base props for form input components.
 */
export interface FormInputProps {
    /** Input name/id */
    name: string;
    /** Input label */
    label?: string;
    /** Placeholder text */
    placeholder?: string;
    /** Whether the input is required */
    required?: boolean;
    /** Whether the input is disabled */
    disabled?: boolean;
    /** Error message to display */
    error?: string;
    /** Help text to display */
    helpText?: string;
}

/**
 * Props for select/dropdown components.
 */
export interface SelectOption<T = string> {
    /** Option value */
    value: T;
    /** Display label */
    label: string;
    /** Whether option is disabled */
    disabled?: boolean;
}

// =============================================================================
// DATA DISPLAY TYPES
// =============================================================================

/**
 * Props for loading skeleton components.
 */
export interface SkeletonProps extends ClassNameProps {
    /** Width of the skeleton */
    width?: string | number;
    /** Height of the skeleton */
    height?: string | number;
    /** Whether to show as circular */
    circle?: boolean;
    /** Number of skeleton items to render */
    count?: number;
}

/**
 * Props for empty state components.
 */
export interface EmptyStateProps extends ClassNameProps {
    /** Icon to display */
    icon?: React.ReactNode;
    /** Title text */
    title: string;
    /** Description text */
    description?: string;
    /** Action button/element */
    action?: React.ReactNode;
}

/**
 * Props for error state components.
 */
export interface ErrorStateProps extends ClassNameProps {
    /** Error message to display */
    message: string;
    /** Handler to retry the failed operation */
    onRetry?: () => void;
    /** Text for the retry button */
    retryText?: string;
}

// =============================================================================
// ACTION TYPES
// =============================================================================

/**
 * Bulk action option configuration.
 */
export interface BulkAction {
    /** Unique key for the action */
    key: string;
    /** Display label */
    label: string;
    /** Icon component */
    icon?: React.ReactNode;
    /** Handler for the action */
    onClick: (selectedIds: string[]) => void;
    /** Whether the action is destructive */
    destructive?: boolean;
    /** Whether the action is disabled */
    disabled?: boolean;
}

/**
 * Context menu action configuration.
 */
export interface ContextMenuAction {
    /** Unique key for the action */
    key: string;
    /** Display label */
    label: string;
    /** Icon component */
    icon?: React.ReactNode;
    /** Handler for the action */
    onClick: () => void;
    /** Whether the action is destructive */
    destructive?: boolean;
    /** Whether to show a divider before this action */
    divider?: boolean;
}

// =============================================================================
// EXPORT COMPONENT TYPES
// =============================================================================

/**
 * Export format option.
 */
export type ExportFormatType = 'pdf' | 'excel' | 'csv';

/**
 * Props for export modal/dialog components.
 */
export interface ExportModalProps extends ModalBaseProps {
    /** Data to export */
    data: unknown[];
    /** Available columns for export */
    columns: Array<{ key: string; label: string }>;
    /** Default filename without extension */
    defaultFilename?: string;
    /** Handler when export is triggered */
    onExport: (format: ExportFormatType, selectedColumns: string[]) => void;
    /** Whether export is in progress */
    isExporting?: boolean;
}

// =============================================================================
// MUTATION VARIABLE TYPES
// =============================================================================

/**
 * Variables for student mutations (update).
 */
export type StudentMutationVars = import('./database').StudentUpdate;

/**
 * Variables for report mutations.
 */
export type ReportMutationVars =
    | { operation: 'add'; data: import('./database').ReportInsert }
    | { operation: 'edit'; data: import('./database').ReportUpdate; id: string };

/**
 * Variables for academic record mutations.
 */
export type AcademicMutationVars =
    | { operation: 'add'; data: import('./database').AcademicRecordInsert }
    | { operation: 'edit'; data: import('./database').AcademicRecordUpdate; id: string };

/**
 * Variables for quiz point mutations.
 */
export type QuizMutationVars =
    | { operation: 'add'; data: import('./database').QuizPointInsert }
    | { operation: 'edit'; data: import('./database').QuizPointUpdate; id: number };

/**
 * Variables for violation mutations.
 */
export type ViolationMutationVars =
    | { operation: 'add'; data: import('./database').ViolationInsert }
    | { operation: 'edit'; data: import('./database').ViolationUpdate; id: string };

/**
 * Variables for communication mutations.
 */
export type CommunicationMutationVars = {
    operation: 'edit';
    data: { message: string };
    id: string;
};
