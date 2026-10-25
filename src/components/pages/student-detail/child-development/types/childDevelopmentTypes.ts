import type { Database } from '../../../../../services/database.types';
import type { ChildDevelopmentData } from '../../../../../services/childDevelopmentAnalysis';

// Canonical record shapes for semester comparison data
export type AcademicRecordRow = Database['public']['Tables']['academic_records']['Row'];
export type AttendanceRow = Database['public']['Tables']['attendance']['Row'];
export type ViolationRow = Database['public']['Tables']['violations']['Row'];
export type QuizPointRow = Database['public']['Tables']['quiz_points']['Row'];

// Flexible input type allowing UI-extended violation rows from student detail
export type ViolationInputRow =
  | ViolationRow
  | ({
      id: string;
      points?: number | null;
      description?: string | null;
      date?: string | null;
      semester_id?: string | null;
    } & Record<string, unknown>);

export interface ChildDevelopmentAnalysisTabProps {
  studentData: ChildDevelopmentData;
  allAcademicRecords?: AcademicRecordRow[];
  allAttendanceRecords?: AttendanceRow[];
  allViolations?: ViolationInputRow[];
  allQuizPoints?: QuizPointRow[];
  defaultMode?: 'single' | 'comparative';
  selectedSemesterId?: string | null;
  selectedAcademicYearId?: string | null;
}

export interface SubjectAverage {
  subject: string;
  average: number;
}

export interface PeriodStats {
  currentAvg: number;
  previousAvg: number;
}

export interface GlanceSummary {
  superpower: string;
  challenge: string;
  homeTip: string;
}

export interface DevelopmentBadgeItem {
  label: string;
  color: string;
  dot: string;
}

export interface DevelopmentBadges {
  cognitive: DevelopmentBadgeItem;
  affective: DevelopmentBadgeItem;
  psychomotor: DevelopmentBadgeItem;
}

export interface ActionableRecommendationItem {
  title: string;
  description: string;
  priority: 'high' | 'medium' | 'low';
  category: string;
  actions: string[];
}

export interface AttendanceStats {
  total: number;
  hadir: number;
  sakit: number;
  izin: number;
  alpha: number;
  percentage: number;
}

export interface ViolationStats {
  count: number;
  points: number;
}

export interface HolisticDimensions {
  labels: string[];
  sem1: number[];
  sem2: number[];
}

export interface CompSubjectAverage {
  subject: string;
  sem1: number | null;
  sem2: number | null;
}
