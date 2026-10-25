import type { QueryClient } from '@tanstack/react-query';
import type {
    Extracurricular,
    EnrollmentView,
    ExtracurricularGrade,
} from '../../types';
import type {
    GradeDraft,
    AttendanceExportPeriodConfig,
} from '../../extracurricularUtils';

export interface AutoTableDoc {
    lastAutoTable?: { finalY: number };
}

export interface ExportAttendanceOptions extends AttendanceExportPeriodConfig {
    selectedExtracurricular: Extracurricular;
    selectedDate?: string;
    enrollments: EnrollmentView[];
    queryClient: QueryClient;
}

export interface ExportGradesOptions {
    selectedExtracurricular: Extracurricular;
    activeSemester: { name: string; semester_number: number } | null;
    enrollments: EnrollmentView[];
    gradesMap: Record<string, ExtracurricularGrade>;
    gradeDrafts: Record<string, GradeDraft>;
}
