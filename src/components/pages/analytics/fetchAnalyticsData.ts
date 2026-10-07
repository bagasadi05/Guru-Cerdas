import { supabase } from '../../../services/supabase';
import { fetchAllPages } from '../../../utils/fetchAllPages';
import { dedupeAcademicRecords, dedupeQuizPoints, dedupeViolations } from '../../../utils/academicRecordUtils';
import { normalizeAcademicRecords } from '../../../services/academicAnalyticsService';
import type {
    AnalyticsClass, Student, AnalyticsAttendance, AnalyticsTask,
    AnalyticsAcademicRecord, AnalyticsViolation, AnalyticsQuizPoint, AnalyticsDataPayload,
} from './types';

export interface AnalyticsQueryParams {
    userId: string;
    /** Classes already checked against what the user may see. */
    classIds: string[];
    /** 'all' or a 'YYYY-MM' month. */
    dateRange: string;
    semesterId: string | null;
}

/** Long `in (...)` lists make the request URL too long, so student ids go in batches. */
const STUDENT_ID_BATCH = 100;

export type AnalyticsRecords = Omit<AnalyticsDataPayload, 'classes'>;

export const EMPTY_ANALYTICS_DATA: AnalyticsRecords = {
    students: [], attendance: [], tasks: [],
    academicRecords: [], violations: [], quizPoints: [],
};

export function getMonthBounds(dateRange: string): { start: string; end: string } | null {
    const match = /^(\d{4})-(\d{2})$/.exec(dateRange);
    if (!match) return null;
    const lastDay = new Date(Number(match[1]), Number(match[2]), 0).getDate();
    return { start: `${dateRange}-01`, end: `${dateRange}-${String(lastDay).padStart(2, '0')}` };
}

const batches = (ids: string[]) =>
    Array.from({ length: Math.ceil(ids.length / STUDENT_ID_BATCH) }, (_, i) =>
        ids.slice(i * STUDENT_ID_BATCH, (i + 1) * STUDENT_ID_BATCH));

export async function fetchAllowedClasses(userId: string, isLeadership: boolean): Promise<AnalyticsClass[]> {
    if (isLeadership) {
        return fetchAllPages<AnalyticsClass>((from, to) => supabase
            .from('classes')
            .select('id, name')
            .is('deleted_at', null)
            .eq('is_archived', false)
            .order('id')
            .range(from, to));
    }

    const { data: assignments, error: assignmentsError } = await supabase
        .from('teacher_class_assignments')
        .select('class_id')
        .eq('teacher_user_id', userId)
        .is('deleted_at', null);
    if (assignmentsError) throw assignmentsError;

    const assignedClassIds = Array.from(new Set((assignments ?? []).map((a) => a.class_id).filter(Boolean))) as string[];

    let query = supabase.from('classes').select('id, name').is('deleted_at', null).eq('is_archived', false);
    query = assignedClassIds.length > 0
        ? query.or(`user_id.eq.${userId},id.in.(${assignedClassIds.map((id) => `"${id}"`).join(',')})`)
        : query.eq('user_id', userId);

    const { data, error } = await query;
    if (error) throw error;
    return (data ?? []) as AnalyticsClass[];
}

/**
 * Grades always cover the whole active semester: the month filter only narrows
 * attendance, violations and activity points.
 */
export async function fetchAnalyticsData({ userId, classIds, dateRange, semesterId }: AnalyticsQueryParams): Promise<AnalyticsRecords> {
    if (classIds.length === 0) return EMPTY_ANALYTICS_DATA;

    const bounds = getMonthBounds(dateRange);

    const students = await fetchAllPages<Student>((from, to) => supabase
        .from('students')
        .select('id, name, class_id, gender, parent_phone')
        .in('class_id', classIds)
        .is('deleted_at', null)
        .order('id')
        .range(from, to));

    if (students.length === 0) return EMPTY_ANALYTICS_DATA;

    const attendance: AnalyticsAttendance[] = [];
    const academicRecords: AnalyticsAcademicRecord[] = [];
    const violations: AnalyticsViolation[] = [];
    const quizPoints: AnalyticsQuizPoint[] = [];

    for (const ids of batches(students.map((s) => s.id))) {
        const [att, aca, vio, qpz] = await Promise.all([
            fetchAllPages<AnalyticsAttendance>((from, to) => {
                let q = supabase.from('attendance').select('student_id, date, status, notes').in('student_id', ids).is('deleted_at', null);
                if (bounds) q = q.gte('date', bounds.start).lte('date', bounds.end);
                if (semesterId) q = q.eq('semester_id', semesterId);
                return q.order('id').range(from, to);
            }),
            fetchAllPages<AnalyticsAcademicRecord>((from, to) => {
                let q = supabase.from('academic_records')
                    .select('student_id, score, subject, assessment_name, created_at, semester_id, version')
                    .in('student_id', ids).is('deleted_at', null);
                if (semesterId) q = q.eq('semester_id', semesterId);
                return q.order('id').range(from, to);
            }),
            fetchAllPages<AnalyticsViolation>((from, to) => {
                let q = supabase.from('violations').select('id, student_id, type, description, points, date, created_at').in('student_id', ids).is('deleted_at', null);
                if (bounds) q = q.gte('date', bounds.start).lte('date', bounds.end);
                if (semesterId) q = q.eq('semester_id', semesterId);
                return q.order('id').range(from, to);
            }),
            fetchAllPages<AnalyticsQuizPoint>((from, to) => {
                let q = supabase.from('quiz_points').select('id, student_id, points, category, created_at').in('student_id', ids).is('deleted_at', null);
                if (bounds) q = q.gte('created_at', `${bounds.start}T00:00:00+07:00`).lte('created_at', `${bounds.end}T23:59:59.999+07:00`);
                if (semesterId) q = q.eq('semester_id', semesterId);
                return q.order('id').range(from, to);
            }),
        ]);
        attendance.push(...att);
        academicRecords.push(...aca);
        violations.push(...vio);
        quizPoints.push(...qpz);
    }

    const tasks = await fetchAllPages<AnalyticsTask>((from, to) => supabase
        .from('tasks')
        .select('id, status, due_date')
        .eq('user_id', userId)
        .is('deleted_at', null)
        .order('id')
        .range(from, to));

    return {
        students,
        attendance,
        tasks,
        academicRecords: normalizeAcademicRecords(dedupeAcademicRecords(academicRecords)),
        violations: dedupeViolations(violations),
        quizPoints: dedupeQuizPoints(quizPoints),
    };
}
