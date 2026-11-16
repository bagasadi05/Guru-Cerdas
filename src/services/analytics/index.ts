/**
 * Analytics domain data access (F3.1).
 *
 * Semua query Supabase untuk fitur analitik hidup di sini — komponen di
 * `src/components/pages/analytics/**` tidak boleh mengimpor client Supabase
 * langsung (dijaga rule ESLint `no-restricted-imports`, lihat eslint.config.js).
 * `fetchAnalyticsData.ts` direlokasi ke folder ini pada F3.1b (10 query terpusat
 * di sini; tipe analitik masih pointer ke folder komponen).
 *
 * @module services/analytics
 */

import { supabase } from '../supabase';

export interface ClassComparisonDataset {
    classes: Array<{ id: string; name: string; user_id: string | null }>;
    students: Array<{ id: string; name: string; class_id: string | null }>;
    roles: Array<{ user_id: string; full_name: string | null }>;
    violations: Array<{ student_id: string; points: number | null }>;
    attendance: Array<{ student_id: string; status: string | null }>;
    academics: Array<{ student_id: string; score: number | null }>;
}

export interface SmartInsightsDataset {
    classes: Array<{ id: string; name: string }>;
    students: Array<{ id: string; name: string; class_id: string | null; parent_phone: string | null; parent_name: string | null }>;
    violations: Array<{ student_id: string }>;
    attendance: Array<{ student_id: string; status: string | null }>;
    academics: Array<{ student_id: string; score: number | null }>;
}

/** Applies the active-semester filter when one is selected. */
const applySemester = <T extends { eq: (column: string, value: string) => T }>(query: T, semesterId: string | null): T =>
    semesterId ? query.eq('semester_id', semesterId) : query;

export async function fetchClassComparisonData(semesterId: string | null): Promise<ClassComparisonDataset> {
    const [clsRes, stuRes, rolesRes, vioRes, attRes, acaRes] = await Promise.all([
        supabase.from('classes').select('id, name, user_id').is('deleted_at', null).eq('is_archived', false),
        supabase.from('students').select('id, name, class_id').is('deleted_at', null),
        supabase.from('user_roles').select('user_id, full_name'),
        applySemester(
            supabase.from('violations').select('student_id, points').is('deleted_at', null),
            semesterId,
        ),
        applySemester(
            supabase.from('attendance').select('student_id, status').is('deleted_at', null),
            semesterId,
        ),
        applySemester(
            supabase.from('academic_records').select('student_id, score').is('deleted_at', null),
            semesterId,
        ),
    ]);

    const err = clsRes.error || stuRes.error || rolesRes.error || vioRes.error || attRes.error || acaRes.error;
    if (err) throw err;

    return {
        classes: (clsRes.data || []) as ClassComparisonDataset['classes'],
        students: (stuRes.data || []) as ClassComparisonDataset['students'],
        roles: (rolesRes.data || []) as ClassComparisonDataset['roles'],
        violations: (vioRes.data || []) as ClassComparisonDataset['violations'],
        attendance: (attRes.data || []) as ClassComparisonDataset['attendance'],
        academics: (acaRes.data || []) as ClassComparisonDataset['academics'],
    };
}

export async function fetchSmartInsightsData(semesterId: string | null): Promise<SmartInsightsDataset> {
    const [clsRes, stuRes, vioRes, attRes, acaRes] = await Promise.all([
        supabase.from('classes').select('id, name').is('deleted_at', null).eq('is_archived', false),
        supabase.from('students').select('id, name, class_id, parent_phone, parent_name').is('deleted_at', null),
        applySemester(
            supabase.from('violations').select('student_id').is('deleted_at', null),
            semesterId,
        ),
        applySemester(
            supabase.from('attendance').select('student_id, status').is('deleted_at', null),
            semesterId,
        ),
        applySemester(
            supabase.from('academic_records').select('student_id, score').is('deleted_at', null),
            semesterId,
        ),
    ]);

    const err = clsRes.error || stuRes.error || vioRes.error || attRes.error || acaRes.error;
    if (err) throw err;

    return {
        classes: (clsRes.data || []) as SmartInsightsDataset['classes'],
        students: (stuRes.data || []) as SmartInsightsDataset['students'],
        violations: (vioRes.data || []) as SmartInsightsDataset['violations'],
        attendance: (attRes.data || []) as SmartInsightsDataset['attendance'],
        academics: (acaRes.data || []) as SmartInsightsDataset['academics'],
    };
}

export * from './fetchAnalyticsData';
