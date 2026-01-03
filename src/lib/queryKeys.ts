/**
 * @fileoverview React Query key factory for consistent cache management
 * 
 * This file provides a centralized query key factory for React Query.
 * Using this factory ensures consistent cache keys across the application
 * and enables proper cache invalidation after mutations.
 * 
 * @module lib/queryKeys
 * 
 * @example
 * ```typescript
 * // In a component
 * const { data } = useQuery({
 *   queryKey: queryKeys.students.list({ classId: '123' }),
 *   queryFn: () => fetchStudents({ classId: '123' }),
 * });
 * 
 * // After a mutation
 * queryClient.invalidateQueries({ queryKey: queryKeys.students.lists() });
 * ```
 */

// =============================================================================
// FILTER TYPES
// =============================================================================

/**
 * Filter parameters for student queries.
 */
export interface StudentFilters {
    /** Filter by class ID */
    classId?: string;
    /** Search term for name */
    search?: string;
    /** Sort field */
    sortBy?: string;
    /** Sort direction */
    sortOrder?: 'asc' | 'desc';
}

/**
 * Filter parameters for attendance queries.
 */
export interface AttendanceFilters {
    /** Filter by class ID */
    classId?: string;
    /** Filter by date */
    date?: string;
    /** Filter by date range start */
    startDate?: string;
    /** Filter by date range end */
    endDate?: string;
}

/**
 * Filter parameters for academic record queries.
 */
export interface AcademicRecordFilters {
    /** Filter by student ID */
    studentId?: string;
    /** Filter by subject */
    subject?: string;
    /** Filter by assessment name */
    assessmentName?: string;
}

/**
 * Filter parameters for task queries.
 */
export interface TaskFilters {
    /** Filter by status */
    status?: 'todo' | 'in_progress' | 'done';
    /** Include completed tasks */
    includeCompleted?: boolean;
}

// =============================================================================
// QUERY KEY FACTORY
// =============================================================================

/**
 * Centralized query key factory for React Query.
 * 
 * This factory provides type-safe, hierarchical query keys that enable:
 * - Consistent caching across the application
 * - Granular cache invalidation
 * - Query key autocomplete in IDEs
 * 
 * @example
 * ```typescript
 * // Invalidate all student-related queries
 * queryClient.invalidateQueries({ queryKey: queryKeys.students.all });
 * 
 * // Invalidate only student lists
 * queryClient.invalidateQueries({ queryKey: queryKeys.students.lists() });
 * 
 * // Invalidate a specific student
 * queryClient.invalidateQueries({ queryKey: queryKeys.students.detail('student-id') });
 * ```
 */
export const queryKeys = {
    // =========================================================================
    // STUDENTS
    // =========================================================================
    students: {
        /** Root key for all student queries */
        all: ['students'] as const,

        /** Key for student list queries */
        lists: () => [...queryKeys.students.all, 'list'] as const,

        /** Key for filtered student list */
        list: (filters: StudentFilters) =>
            [...queryKeys.students.lists(), filters] as const,

        /** Key for student detail queries */
        details: () => [...queryKeys.students.all, 'detail'] as const,

        /** Key for specific student detail */
        detail: (id: string) =>
            [...queryKeys.students.details(), id] as const,

        /** Key for student with full data (used in detail page) */
        fullDetail: (id: string) =>
            [...queryKeys.students.detail(id), 'full'] as const,
    },

    // =========================================================================
    // CLASSES
    // =========================================================================
    classes: {
        /** Root key for all class queries */
        all: ['classes'] as const,

        /** Key for class list queries */
        lists: () => [...queryKeys.classes.all, 'list'] as const,

        /** Key for specific class detail */
        detail: (id: string) =>
            [...queryKeys.classes.all, 'detail', id] as const,

        /** Key for class with students */
        withStudents: (id: string) =>
            [...queryKeys.classes.detail(id), 'students'] as const,
    },

    // =========================================================================
    // ATTENDANCE
    // =========================================================================
    attendance: {
        /** Root key for all attendance queries */
        all: ['attendance'] as const,

        /** Key for attendance list queries */
        lists: () => [...queryKeys.attendance.all, 'list'] as const,

        /** Key for filtered attendance list */
        list: (filters: AttendanceFilters) =>
            [...queryKeys.attendance.lists(), filters] as const,

        /** Key for attendance by date */
        byDate: (date: string) =>
            [...queryKeys.attendance.all, 'date', date] as const,

        /** Key for attendance by class and date */
        byClassAndDate: (classId: string, date: string) =>
            [...queryKeys.attendance.all, 'class', classId, 'date', date] as const,

        /** Key for attendance summary/statistics */
        summary: (classId?: string) =>
            [...queryKeys.attendance.all, 'summary', classId ?? 'all'] as const,
    },

    // =========================================================================
    // SCHEDULES
    // =========================================================================
    schedules: {
        /** Root key for all schedule queries */
        all: ['schedules'] as const,

        /** Key for schedule list queries */
        lists: () => [...queryKeys.schedules.all, 'list'] as const,

        /** Key for schedule by day */
        byDay: (day: string) =>
            [...queryKeys.schedules.all, 'day', day] as const,

        /** Key for schedule by class */
        byClass: (classId: string) =>
            [...queryKeys.schedules.all, 'class', classId] as const,
    },

    // =========================================================================
    // TASKS
    // =========================================================================
    tasks: {
        /** Root key for all task queries */
        all: ['tasks'] as const,

        /** Key for task list queries */
        lists: () => [...queryKeys.tasks.all, 'list'] as const,

        /** Key for filtered task list */
        list: (filters: TaskFilters) =>
            [...queryKeys.tasks.lists(), filters] as const,

        /** Key for specific task detail */
        detail: (id: string) =>
            [...queryKeys.tasks.all, 'detail', id] as const,

        /** Key for pending tasks only */
        pending: () =>
            [...queryKeys.tasks.all, 'pending'] as const,
    },

    // =========================================================================
    // ACADEMIC RECORDS
    // =========================================================================
    academicRecords: {
        /** Root key for all academic record queries */
        all: ['academicRecords'] as const,

        /** Key for academic record list queries */
        lists: () => [...queryKeys.academicRecords.all, 'list'] as const,

        /** Key for filtered academic record list */
        list: (filters: AcademicRecordFilters) =>
            [...queryKeys.academicRecords.lists(), filters] as const,

        /** Key for records by student */
        byStudent: (studentId: string) =>
            [...queryKeys.academicRecords.all, 'student', studentId] as const,

        /** Key for records by subject */
        bySubject: (subject: string) =>
            [...queryKeys.academicRecords.all, 'subject', subject] as const,
    },

    // =========================================================================
    // VIOLATIONS
    // =========================================================================
    violations: {
        /** Root key for all violation queries */
        all: ['violations'] as const,

        /** Key for violation list queries */
        lists: () => [...queryKeys.violations.all, 'list'] as const,

        /** Key for violations by student */
        byStudent: (studentId: string) =>
            [...queryKeys.violations.all, 'student', studentId] as const,
    },

    // =========================================================================
    // REPORTS
    // =========================================================================
    reports: {
        /** Root key for all report queries */
        all: ['reports'] as const,

        /** Key for reports by student */
        byStudent: (studentId: string) =>
            [...queryKeys.reports.all, 'student', studentId] as const,
    },

    // =========================================================================
    // COMMUNICATIONS
    // =========================================================================
    communications: {
        /** Root key for all communication queries */
        all: ['communications'] as const,

        /** Key for communications by student */
        byStudent: (studentId: string) =>
            [...queryKeys.communications.all, 'student', studentId] as const,

        /** Key for unread communications */
        unread: () =>
            [...queryKeys.communications.all, 'unread'] as const,
    },

    // =========================================================================
    // DASHBOARD
    // =========================================================================
    dashboard: {
        /** Root key for all dashboard queries */
        all: ['dashboard'] as const,

        /** Key for dashboard data */
        data: (userId: string) =>
            [...queryKeys.dashboard.all, 'data', userId] as const,

        /** Key for AI insights */
        aiInsight: (userId: string) =>
            [...queryKeys.dashboard.all, 'aiInsight', userId] as const,

        /** Key for attendance widget */
        attendanceWidget: () =>
            [...queryKeys.dashboard.all, 'attendanceWidget'] as const,
    },

    // =========================================================================
    // USER/AUTH
    // =========================================================================
    user: {
        /** Root key for all user queries */
        all: ['user'] as const,

        /** Key for current user */
        current: () => [...queryKeys.user.all, 'current'] as const,

        /** Key for user settings */
        settings: () => [...queryKeys.user.all, 'settings'] as const,
    },
} as const;

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Invalidates all queries related to a specific entity type.
 * 
 * @param queryClient - The React Query client
 * @param entity - The entity type to invalidate
 * 
 * @example
 * ```typescript
 * invalidateEntity(queryClient, 'students');
 * ```
 */
export function getInvalidationKeys(entity: keyof typeof queryKeys) {
    return queryKeys[entity].all;
}

/**
 * Type helper to extract query key types.
 */
export type QueryKeyType<T extends keyof typeof queryKeys> =
    typeof queryKeys[T][keyof typeof queryKeys[T]];
