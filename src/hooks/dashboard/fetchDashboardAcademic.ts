/**
 * @fileoverview Academic and behavior data fetching for Dashboard
 * 
 * @module hooks/dashboard/fetchDashboardAcademic
 */

import { supabase } from '../../services/supabase';
import type { DashboardQueryData, StudentAchievement } from '../../types';

export interface DashboardAcademicData {
    academicRecords: DashboardQueryData['academicRecords'];
    violations: DashboardQueryData['violations'];
    achievements: DashboardQueryData['achievements'];
}

export const fetchDashboardAcademic = async (
    activeStudentIds: Set<string>
): Promise<DashboardAcademicData> => {
    const [academicRecordsRes, violationsRes, achievementsRes] = await Promise.all([
        supabase
            .from('academic_records')
            .select('student_id, subject, score, assessment_name, created_at')
            .is('deleted_at', null)
            .order('created_at', { ascending: false })
            .limit(3000),
        supabase
            .from('violations')
            .select('student_id, points')
            .is('deleted_at', null),
        supabase
            .from('student_achievements')
            .select('*'),
    ]);

    const errors = [academicRecordsRes.error, violationsRes.error, achievementsRes.error].filter(Boolean);
    if (errors.length > 0) {
        console.warn('[DashboardAcademic] Academic queries warning:', errors.map(e => e?.message).join(', '));
    }

    return {
        // O(1) Set lookups instead of O(N * M) quadratic linear scans
        academicRecords: (academicRecordsRes.data || []).filter(r => activeStudentIds.has(r.student_id)),
        violations: (violationsRes.data || []).filter(v => activeStudentIds.has(v.student_id)),
        achievements: ((achievementsRes.data || []) as unknown as StudentAchievement[]).filter(ach => activeStudentIds.has(ach.student_id)),
    };
};
