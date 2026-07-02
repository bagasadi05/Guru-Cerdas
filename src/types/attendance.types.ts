/** Extended attendance type with multi-teacher fields */
export interface AttendanceRowExtended {
  id: string
  student_id: string
  date: string
  status: AttendanceStatus
  teacher_status: AttendanceStatus | null
  teacher_id: string | null
  official_status: AttendanceStatus | null
  official_by: string | null
  official_at: string | null
  notes: string | null
  semester_id: string | null
  user_id: string
  created_at: string
}

export type AttendanceStatus = 'Hadir' | 'Izin' | 'Sakit' | 'Alpha' | 'Libur'

export interface OfficialStatusUpdate {
  student_id: string
  official_status: AttendanceStatus
}
