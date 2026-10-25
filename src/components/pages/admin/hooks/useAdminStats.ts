import { useState, useCallback } from 'react';
import { supabase } from '../../../../services/supabase';
import type { SystemStats } from '../types';

export const useAdminStats = () => {
    const [stats, setStats] = useState<SystemStats>({
        totalUsers: 0,
        totalClasses: 0,
        totalStudents: 0,
        totalAttendance: 0,
        totalGrades: 0,
        totalTasks: 0,
        admins: 0,
        teachers: 0,
        students: 0,
    });
    const [statsLoading, setStatsLoading] = useState(true);

    const fetchStats = useCallback(async () => {
        setStatsLoading(true);
        try {
            const [
                { count: usersCount },
                { count: classesCount },
                { count: studentsCount },
                { count: attendanceCount },
                { count: gradesCount },
                { count: tasksCount },
            ] = await Promise.all([
                supabase.from('user_roles').select('*', { count: 'exact', head: true }).is('deleted_at', null),
                supabase.from('classes').select('*', { count: 'exact', head: true }),
                supabase.from('students').select('*', { count: 'exact', head: true }),
                supabase.from('attendance').select('*', { count: 'exact', head: true }),
                supabase.from('academic_records').select('*', { count: 'exact', head: true }),
                supabase.from('tasks').select('*', { count: 'exact', head: true }),
            ]);

            // Get role breakdown
            const { data: roleData } = await supabase.from('user_roles').select('role').is('deleted_at', null);
            let admins = 0;
            let teachers = 0;
            let students = 0;
            roleData?.forEach((r) => {
                if (r.role === 'admin') admins++;
                else if (r.role === 'teacher') teachers++;
                else if (r.role === 'student') students++;
            });

            setStats({
                totalUsers: usersCount || 0,
                totalClasses: classesCount || 0,
                totalStudents: studentsCount || 0,
                totalAttendance: attendanceCount || 0,
                totalGrades: gradesCount || 0,
                totalTasks: tasksCount || 0,
                admins,
                teachers,
                students,
            });
        } catch (err) {
            console.error('Error fetching stats:', err);
        } finally {
            setStatsLoading(false);
        }
    }, []);

    return {
        stats,
        statsLoading,
        fetchStats,
    };
};
