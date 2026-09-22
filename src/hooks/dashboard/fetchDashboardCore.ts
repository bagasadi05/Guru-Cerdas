/**
 * @fileoverview Core data fetching for Dashboard (Classes & Students)
 * 
 * @module hooks/dashboard/fetchDashboardCore
 */

import { supabase } from '../../services/supabase';
import type { StudentListItem, ClassListItem } from '../../types';

export interface DashboardCoreData {
    classes: ClassListItem[];
    students: StudentListItem[];
    activeClassIds: Set<string>;
    activeStudentIds: Set<string>;
}

export const fetchDashboardCore = async (userId: string, userRole: string): Promise<DashboardCoreData> => {
    const isGlobalRole = userRole === 'waka_kesiswaan' || userRole === 'waka_kurikulum' || userRole === 'kepala_madrasah' || userRole === 'admin';

    const [classesRes, studentsRes] = await Promise.all([
        isGlobalRole
            ? supabase
                .from('classes')
                .select('id, name')
                .is('deleted_at', null)
                .eq('is_archived', false)
            : supabase
                .from('classes')
                .select('id, name')
                .is('deleted_at', null)
                .eq('is_archived', false)
                .or(`user_id.eq.${userId},wali_kelas_id.eq.${userId}`),
        supabase
            .from('students')
            .select('id, name, class_id, avatar_url')
            .is('deleted_at', null),
    ]);

    if (classesRes.error || studentsRes.error) {
        const errorMsg = [classesRes.error?.message, studentsRes.error?.message].filter(Boolean).join(', ');
        throw new Error(errorMsg || 'Gagal memuat data kelas dan siswa.');
    }

    const activeClassIds = new Set((classesRes.data || []).map(c => c.id));
    const activeStudents = (studentsRes.data || []).filter((s): s is StudentListItem => !!s.class_id && activeClassIds.has(s.class_id));
    const activeStudentIds = new Set(activeStudents.map(s => s.id));

    return {
        classes: classesRes.data || [],
        students: activeStudents,
        activeClassIds,
        activeStudentIds,
    };
};
