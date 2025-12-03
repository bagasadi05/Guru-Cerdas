import { Database } from './services/database.types';

export enum AttendanceStatus {
  Hadir = 'Hadir',
  Izin = 'Izin',
  Sakit = 'Sakit',
  Alpha = 'Alpha',
}

export type StudentRow = Database['public']['Tables']['students']['Row'];
export type ClassRow = Database['public']['Tables']['classes']['Row'];
export type AttendanceRow = Database['public']['Tables']['attendance']['Row'];
export type AttendanceInsert = Database['public']['Tables']['attendance']['Insert'];


export type StudentWithClass = StudentRow & { classes: Pick<ClassRow, 'name'> | null };

export type AttendanceRecord = {
  id?: string;
  status: AttendanceStatus;
  note: string;
};

export type AiAnalysis = {
  perfect_attendance: string[];
  frequent_absentees: { student_name: string; absent_days: number; }[];
  pattern_warnings: { pattern_description: string; implicated_students: string[]; }[];
};

