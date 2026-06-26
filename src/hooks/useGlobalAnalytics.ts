import { useState, useEffect } from 'react';
import { supabase } from '../services/supabase';

export interface GlobalAnalyticsData {
    totalStudentsWithViolations: number;
    criticalStudentsCount: number;
    recentViolations: any[];
    violationsByClass: { className: string; totalPoints: number }[];
    todayAttendance: {
        present: number;
        sick: number;
        permission: number;
        absent: number;
        total: number;
    };
}

export const useGlobalAnalytics = () => {
    const [data, setData] = useState<GlobalAnalyticsData | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchGlobalData = async () => {
            setLoading(true);

            // Fetch students with their violations
            const { data: studentsData, error: studentsError } = await supabase
                .from('students')
                .select(`
                    id, 
                    name, 
                    class_id,
                    classes (name),
                    violations (points, created_at, deleted_at)
                `)
                .is('deleted_at', null);

            if (!studentsError && studentsData) {
                let totalWithViolations = 0;
                let criticalCount = 0;
                const classPointsMap: Record<string, number> = {};
                let allRecentViolations: any[] = [];

                studentsData.forEach(student => {
                    const activeViolations = (student.violations || []).filter((v: any) => v.deleted_at === null);
                    if (activeViolations.length > 0) {
                        const totalPoints = activeViolations.reduce((sum: number, v: any) => sum + v.points, 0);
                        if (totalPoints > 0) totalWithViolations++;
                        if (totalPoints >= 50) criticalCount++;

                        const className = (student.classes as any)?.name || 'Unknown Class';
                        if (!classPointsMap[className]) {
                            classPointsMap[className] = 0;
                        }
                        classPointsMap[className] += totalPoints;

                        activeViolations.forEach((v: any) => {
                            allRecentViolations.push({
                                studentName: student.name,
                                className,
                                points: v.points,
                                date: v.created_at
                            });
                        });
                    }
                });

                allRecentViolations.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

                const violationsByClass = Object.entries(classPointsMap)
                    .map(([className, totalPoints]) => ({ className, totalPoints }))
                    .sort((a, b) => b.totalPoints - a.totalPoints);
                
                // Fetch today's attendance
                const today = new Date().toISOString().split('T')[0];
                const { data: attendanceData } = await supabase
                    .from('attendance')
                    .select('status')
                    .eq('date', today);

                let presentCount = 0;
                let sickCount = 0;
                let permCount = 0;
                let absentCount = 0;

                if (attendanceData) {
                    attendanceData.forEach(a => {
                        if (a.status === 'Hadir') presentCount++;
                        else if (a.status === 'Sakit') sickCount++;
                        else if (a.status === 'Izin') permCount++;
                        else if (a.status === 'Alpha') absentCount++;
                    });
                }

                setData({
                    totalStudentsWithViolations: totalWithViolations,
                    criticalStudentsCount: criticalCount,
                    recentViolations: allRecentViolations.slice(0, 10),
                    violationsByClass,
                    todayAttendance: {
                        present: presentCount,
                        sick: sickCount,
                        permission: permCount,
                        absent: absentCount,
                        total: attendanceData ? attendanceData.length : 0
                    }
                });
            }

            setLoading(false);
        };

        fetchGlobalData();
    }, []);

    return { data, loading };
};
