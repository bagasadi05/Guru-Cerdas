import type { Database } from './database.types';

type ClassRow = Database['public']['Tables']['classes']['Row'];
type ScheduleRow = Database['public']['Tables']['schedules']['Row'];
type TaskRow = Database['public']['Tables']['tasks']['Row'];
type ExtracurricularRow = Database['public']['Tables']['extracurriculars']['Row'];
type ExtracurricularStudentRow = Database['public']['Tables']['extracurricular_students']['Row'];
type ExtracurricularGradeRow = Database['public']['Tables']['extracurricular_grades']['Row'];

type LiveClassRow = Pick<ClassRow, 'id' | 'user_id' | 'name' | 'created_at' | 'deleted_at'>;
type LiveScheduleRow = Pick<
  ScheduleRow,
  'id' | 'user_id' | 'day' | 'start_time' | 'end_time' | 'subject' | 'class_id' | 'created_at'
>;
type LiveTaskRow = Pick<TaskRow, 'id' | 'user_id' | 'title' | 'description' | 'due_date' | 'status' | 'created_at'>;
type LiveExtracurricularRow = Pick<
  ExtracurricularRow,
  'id' | 'user_id' | 'name' | 'category' | 'description' | 'schedule_day' | 'schedule_time' | 'coach_name' | 'max_participants' | 'is_active' | 'created_at'
>;
type LiveExtracurricularStudentRow = Pick<
  ExtracurricularStudentRow,
  'id' | 'user_id' | 'name' | 'gender' | 'class_name' | 'created_at'
>;
type LiveExtracurricularGradeRow = Pick<
  ExtracurricularGradeRow,
  'id' | 'user_id' | 'student_id' | 'extracurricular_student_id' | 'extracurricular_id' | 'semester_id' | 'grade' | 'description' | 'created_at'
>;

export const CLASS_COMPAT_SELECT = 'id, user_id, name, created_at, deleted_at';
export const SCHEDULE_COMPAT_SELECT = 'id, user_id, day, start_time, end_time, subject, class_id, created_at';
export const TASK_COMPAT_SELECT = 'id, user_id, title, description, due_date, status, created_at';
export const EXTRACURRICULAR_COMPAT_SELECT =
  'id, user_id, name, category, description, schedule_day, schedule_time, coach_name, max_participants, is_active, created_at';
export const EXTRACURRICULAR_STUDENT_COMPAT_SELECT =
  'id, user_id, name, gender, class_name, created_at';
export const EXTRACURRICULAR_GRADE_COMPAT_SELECT =
  'id, user_id, student_id, extracurricular_student_id, extracurricular_id, semester_id, grade, description, created_at';

export const hydrateClassRow = (row: LiveClassRow): ClassRow => ({
  ...row,
  academic_year: null,
  grade_level: null,
  updated_at: row.created_at,
});

export const hydrateScheduleRow = (row: LiveScheduleRow): ScheduleRow => ({
  ...row,
  room: null,
  updated_at: row.created_at,
});

export const hydrateTaskRow = (row: LiveTaskRow): TaskRow => ({
  ...row,
  completed: row.status === 'done',
  updated_at: row.created_at,
});

export const hydrateExtracurricularRow = (row: LiveExtracurricularRow): ExtracurricularRow => ({
  ...row,
  updated_at: row.created_at,
});

export const hydrateExtracurricularStudentRow = (
  row: LiveExtracurricularStudentRow
): ExtracurricularStudentRow => ({
  ...row,
  updated_at: row.created_at,
});

export const hydrateExtracurricularGradeRow = (
  row: LiveExtracurricularGradeRow
): ExtracurricularGradeRow => ({
  ...row,
  updated_at: row.created_at,
});
