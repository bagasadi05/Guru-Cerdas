export interface Student {
  id: string;
  name: string;
  class_id: string;
  gender: string;
  avatar_url?: string;
  nis?: string;
  nisn?: string;
}

export interface ClassItem {
  id: string;
  name: string;
  academic_year: string | null;
  grade_level: number | null;
  is_archived: boolean;
  user_id: string;
  created_at: string;
}

export interface AcademicRecord {
  id: string;
  subject: string;
  score: number;
  assessment_name?: string;
  notes?: string;
  created_at?: string;
}

export interface AttendanceRecord {
  id: string;
  date: string;
  status: string;
  notes?: string;
}

export interface ViolationRecord {
  id: string;
  date: string;
  description?: string;
  points?: number;
  type?: string;
}

export interface QuizPointRecord {
  id: string;
  quiz_name?: string;
  points?: number;
  category?: string;
  created_at?: string;
}

export interface StudentHistoryData {
  academics: AcademicRecord[];
  attendance: AttendanceRecord[];
  violations: ViolationRecord[];
  quizPoints: QuizPointRecord[];
}

export interface StudentStats {
  avgScore: number;
  attendanceRate: number;
  totalViolations: number;
  totalQuizPoints: number;
  present: number;
  totalAttendance: number;
  sakit: number;
  izin: number;
  alpha: number;
}
