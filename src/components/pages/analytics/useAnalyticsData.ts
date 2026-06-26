import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '../../../services/supabase';
import { useAuth } from '../../../hooks/useAuth';
import { useSemester } from '../../../contexts/SemesterContext';
import { dedupeAcademicRecords, dedupeQuizPoints, dedupeViolations } from '../../../utils/academicRecordUtils';
import {
    AnalyticsClass, Student, AnalyticsAttendance, AnalyticsTask,
    AnalyticsAcademicRecord, AnalyticsViolation, AnalyticsQuizPoint,
    GradeDistribution, AttendanceStats, ClassStats, DailyAttendance, AtRiskItem
} from './types';

// Constants
const EMPTY_CLASSES: AnalyticsClass[] = [];
const _EMPTY_STUDENTS: Student[] = [];

export const useAnalyticsData = () => {
    const { user, userRole } = useAuth();
    const isLeadership = userRole === 'kepala_madrasah' || userRole === 'waka_kesiswaan' || userRole === 'admin';
    const { activeSemester } = useSemester();
    const [dateRange, setDateRange] = useState<'7d' | '30d' | '90d' | 'all'>(isLeadership ? 'all' : '30d');
    const [selectedClassId, setSelectedClassId] = useState<string>('all');

    // Fetch Security: Get classes the teacher is allowed to see
    const { data: allowedClasses = EMPTY_CLASSES, isLoading: isLoadingAllowedClasses } = useQuery({
        queryKey: ['analytics_allowed_classes', user?.id, userRole],
        queryFn: async () => {
            if (!user) return EMPTY_CLASSES;

            // Pimpinan (kepala madrasah / waka / admin) melihat SELURUH kelas madrasah,
            // bukan hanya kelas miliknya. RLS leadership-read sudah mengizinkan.
            if (isLeadership) {
                const { data: allClasses, error: allErr } = await supabase
                    .from('classes')
                    .select('id, name')
                    .is('deleted_at', null)
                    .eq('is_archived', false);
                if (allErr) throw allErr;
                return (allClasses || []) as AnalyticsClass[];
            }
            
            // 1. Get assignments
            const { data: assignments } = await supabase
                .from('teacher_class_assignments')
                .select('class_id')
                .eq('teacher_user_id', user.id)
                .is('deleted_at', null);

            const assignedClassIds = Array.from(new Set(assignments?.map(a => a.class_id).filter(Boolean))) as string[];

            // 2. Get classes created by teacher OR assigned to teacher
            let query = supabase.from('classes').select('id, name').is('deleted_at', null).eq('is_archived', false);
            if (assignedClassIds.length > 0) {
                query = query.or(`user_id.eq.${user.id},id.in.(${assignedClassIds.map(id => `"${id}"`).join(',')})`);
            } else {
                query = query.eq('user_id', user.id);
            }

            const { data, error } = await query;
            if (error) throw error;
            return (data || []) as AnalyticsClass[];
        },
        enabled: !!user
    });

    // Fetch main analytics data
    const { data, isLoading: isLoadingData, refetch } = useQuery({
        queryKey: ['analyticsData', user?.id, dateRange, selectedClassId, activeSemester?.id, allowedClasses.length],
        queryFn: async () => {
            if (!user || allowedClasses.length === 0) {
                return {
                    classes: [], students: [], attendance: [], tasks: [],
                    academicRecords: [], violations: [], quizPoints: []
                };
            }

            const allowedClassIds = allowedClasses.map(c => c.id);
            
            // If selectedClassId is not 'all', check if it's allowed.
            let filterClassIds = allowedClassIds;
            if (selectedClassId !== 'all') {
                if (allowedClassIds.includes(selectedClassId)) {
                    filterClassIds = [selectedClassId];
                } else {
                    // Fallback to all allowed if somehow they selected an invalid one
                    filterClassIds = allowedClassIds;
                }
            }

            const now = new Date();
            let startDate: Date | null = null;
            switch (dateRange) {
                case '7d': startDate = new Date(now.setDate(now.getDate() - 7)); break;
                case '30d': startDate = new Date(now.setDate(now.getDate() - 30)); break;
                case '90d': startDate = new Date(now.setDate(now.getDate() - 90)); break;
                default: startDate = null;
            }

            // 1. Students in allowed classes
            const { data: studentsRes, error: studentsErr } = await supabase
                .from('students')
                .select('id, name, class_id, gender')
                .in('class_id', filterClassIds)
                .is('deleted_at', null);
            if (studentsErr) throw studentsErr;

            const students = (studentsRes || []) as Student[];
            const studentIds = students.map(s => s.id);

            // If no students, we don't need to fetch their records
            if (studentIds.length === 0) {
                return {
                    classes: allowedClasses, students: [], attendance: [], tasks: [],
                    academicRecords: [], violations: [], quizPoints: []
                };
            }

            // Chunk student IDs if there are too many, but usually Supabase IN handles ~1000 fine
            // We use chunking just in case.
            const chunkArray = (arr: string[], size: number) => 
                Array.from({ length: Math.ceil(arr.length / size) }, (v, i) => arr.slice(i * size, i * size + size));
            
            const studentIdChunks = chunkArray(studentIds, 100); // chunk by 100 for safety

            let allAttendance: AnalyticsAttendance[] = [];
            let allAcademicRecords: AnalyticsAcademicRecord[] = [];
            let allViolations: AnalyticsViolation[] = [];
            let allQuizPoints: AnalyticsQuizPoint[] = [];

            for (const chunk of studentIdChunks) {
                let attendanceQuery = supabase.from('attendance').select('student_id, date, status').in('student_id', chunk).is('deleted_at', null);
                if (startDate) attendanceQuery = attendanceQuery.gte('date', startDate.toISOString().split('T')[0]);
                if (activeSemester?.id) attendanceQuery = attendanceQuery.eq('semester_id', activeSemester.id); // Add semester filter

                let academicQuery = supabase.from('academic_records').select('student_id, score, subject, assessment_name, created_at').in('student_id', chunk).is('deleted_at', null);
                if (activeSemester?.id) academicQuery = academicQuery.eq('semester_id', activeSemester.id);

                let violationsQuery = supabase.from('violations').select('id, student_id, type, points, date, created_at').in('student_id', chunk).is('deleted_at', null);
                if (startDate) violationsQuery = violationsQuery.gte('date', startDate.toISOString().split('T')[0]);
                if (activeSemester?.id) violationsQuery = violationsQuery.eq('semester_id', activeSemester.id); // Add semester filter

                let quizPointsQuery = supabase.from('quiz_points').select('id, student_id, points, category, created_at').in('student_id', chunk).is('deleted_at', null);
                if (startDate) quizPointsQuery = quizPointsQuery.gte('created_at', startDate.toISOString());
                if (activeSemester?.id) quizPointsQuery = quizPointsQuery.eq('semester_id', activeSemester.id); // Add semester filter

                const [att, aca, vio, qpz] = await Promise.all([attendanceQuery, academicQuery, violationsQuery, quizPointsQuery]);
                
                if (att.data) allAttendance = [...allAttendance, ...att.data];
                if (aca.data) allAcademicRecords = [...allAcademicRecords, ...aca.data as AnalyticsAcademicRecord[]];
                if (vio.data) allViolations = [...allViolations, ...vio.data as AnalyticsViolation[]];
                if (qpz.data) allQuizPoints = [...allQuizPoints, ...qpz.data as AnalyticsQuizPoint[]];
            }

            // Tasks (Not bound to student ids, but to teacher)
            const { data: tasksRes } = await supabase
                .from('tasks')
                .select('id, status, due_date')
                .eq('user_id', user.id)
                .is('deleted_at', null);

            // Deduplicate data before returning!
            const dedupedAcademic = dedupeAcademicRecords(allAcademicRecords as any) as AnalyticsAcademicRecord[];
            const dedupedViolations = dedupeViolations(allViolations as any) as AnalyticsViolation[];
            const dedupedQuizPoints = dedupeQuizPoints(allQuizPoints as any) as AnalyticsQuizPoint[];

            return {
                classes: allowedClasses,
                students: students,
                attendance: allAttendance,
                tasks: (tasksRes || []) as AnalyticsTask[],
                academicRecords: dedupedAcademic,
                violations: dedupedViolations,
                quizPoints: dedupedQuizPoints,
            };
        },
        enabled: !!user && !isLoadingAllowedClasses && allowedClasses.length > 0
    });

    const isLoading = isLoadingAllowedClasses || isLoadingData;
    const { classes = [], students = [], attendance = [], tasks = [], academicRecords = [], violations = [], quizPoints = [] } = data || {};

    // ============================================
    // CALCULATION LOGIC (Memoized)
    // ============================================

    const gradeStats = useMemo(() => {
        const distribution: GradeDistribution[] = [
            { label: 'A', range: '90-100', count: 0, color: '#22c55e', percentage: 0 },
            { label: 'B', range: '80-89', count: 0, color: '#3b82f6', percentage: 0 },
            { label: 'C', range: '70-79', count: 0, color: '#eab308', percentage: 0 },
            { label: 'D', range: '60-69', count: 0, color: '#f97316', percentage: 0 },
            { label: 'E', range: '<60', count: 0, color: '#ef4444', percentage: 0 },
        ];

        const studentAverages = new Map<string, { total: number; count: number }>();
        academicRecords.forEach(r => {
            const current = studentAverages.get(r.student_id) || { total: 0, count: 0 };
            studentAverages.set(r.student_id, { total: current.total + r.score, count: current.count + 1 });
        });

        let totalStudentsWithGrades = 0;
        let totalSum = 0;
        studentAverages.forEach(avg => {
            if (avg.count === 0) return;
            const finalScore = avg.total / avg.count;
            totalSum += finalScore;
            totalStudentsWithGrades++;

            if (finalScore >= 90) distribution[0].count++;
            else if (finalScore >= 80) distribution[1].count++;
            else if (finalScore >= 70) distribution[2].count++;
            else if (finalScore >= 60) distribution[3].count++;
            else distribution[4].count++;
        });

        distribution.forEach(d => {
            d.percentage = totalStudentsWithGrades > 0 ? Math.round((d.count / totalStudentsWithGrades) * 100) : 0;
        });

        const overallAverage = totalStudentsWithGrades > 0 ? Math.round(totalSum / totalStudentsWithGrades) : 0;
        return { distribution, overallAverage, totalStudentsWithGrades };
    }, [academicRecords]);

    const attendanceStats = useMemo((): AttendanceStats => {
        const total = attendance.length;
        const hadir = attendance.filter(a => a.status === 'Hadir').length;
        const izin = attendance.filter(a => a.status === 'Izin').length;
        const sakit = attendance.filter(a => a.status === 'Sakit').length;
        const alpha = attendance.filter(a => a.status === 'Alpha').length;

        return {
            total, hadir, izin, sakit, alpha,
            hadirRate: total > 0 ? Math.round((hadir / total) * 100) : 0,
        };
    }, [attendance]);

    const classStats = useMemo((): ClassStats[] => {
        return classes.map(cls => {
            const classStudents = students.filter(s => s.class_id === cls.id);
            const studentIds = new Set(classStudents.map(s => s.id));
            const classAttendance = attendance.filter(a => studentIds.has(a.student_id));

            const total = classAttendance.length;
            const hadir = classAttendance.filter(a => a.status === 'Hadir').length;

            return {
                id: cls.id,
                name: cls.name,
                studentCount: classStudents.length,
                attendanceRate: total > 0 ? Math.round((hadir / total) * 100) : 0,
            };
        }).sort((a, b) => b.attendanceRate - a.attendanceRate);
    }, [classes, students, attendance]);

    const atRiskStudents = useMemo(() => {
        const risks: AtRiskItem[] = [];
        const getStudentAvg = (studentId: string) => {
            const records = academicRecords.filter(r => r.student_id === studentId);
            if (records.length === 0) return null;
            return records.reduce((sum, r) => sum + r.score, 0) / records.length;
        };
        const getStudentAttendance = (studentId: string) => {
            const records = attendance.filter(a => a.student_id === studentId);
            if (records.length === 0) return null;
            const hadir = records.filter(r => r.status === 'Hadir').length;
            return (hadir / records.length) * 100;
        };

        students.forEach(student => {
            const avg = getStudentAvg(student.id);
            const att = getStudentAttendance(student.id);
            const isLowGrade = avg !== null && avg < 65;
            const isLowAtt = att !== null && att < 75;

            if (isLowGrade && isLowAtt) risks.push({ student, reason: 'both', details: `Nilai: ${avg?.toFixed(0)}, Hadir: ${att?.toFixed(0)}%` });
            else if (isLowGrade) risks.push({ student, reason: 'academic', details: `Rata-rata Nilai: ${avg?.toFixed(0)}` });
            else if (isLowAtt) risks.push({ student, reason: 'attendance', details: `Kehadiran: ${att?.toFixed(0)}%` });
        });
        return risks.slice(0, 5);
    }, [students, academicRecords, attendance]);

    const topPerformingStudents = useMemo(() => {
        // Just students with highest averages
        const getStudentAvg = (studentId: string) => {
            const records = academicRecords.filter(r => r.student_id === studentId);
            if (records.length === 0) return null;
            return records.reduce((sum, r) => sum + r.score, 0) / records.length;
        };
        const mapped = students.map(s => ({ student: s, avg: getStudentAvg(s.id) })).filter(s => s.avg !== null) as {student: Student, avg: number}[];
        return mapped.sort((a, b) => b.avg - a.avg).slice(0, 3);
    }, [students, academicRecords]);

    const dailyAttendance = useMemo((): DailyAttendance[] => {
        const daysToCheck = dateRange === '7d' ? 7 : dateRange === '90d' ? 90 : 30;
        const fullRangeMap = new Map<string, DailyAttendance>();
        const now = new Date();

        for (let i = 0; i < daysToCheck; i++) {
            const d = new Date();
            d.setDate(now.getDate() - i);
            const dateStr = d.toISOString().split('T')[0];
            fullRangeMap.set(dateStr, { date: dateStr, hadir: 0, izin: 0, sakit: 0, alpha: 0, total: 0 });
        }

        attendance.forEach(a => {
            if (fullRangeMap.has(a.date)) {
                const day = fullRangeMap.get(a.date)!;
                day.total++;
                if (a.status === 'Hadir') day.hadir++;
                else if (a.status === 'Izin') day.izin++;
                else if (a.status === 'Sakit') day.sakit++;
                else if (a.status === 'Alpha') day.alpha++;
            }
        });

        return Array.from(fullRangeMap.values()).sort((a, b) => a.date.localeCompare(b.date));
    }, [attendance, dateRange]);

    const taskStats = useMemo(() => {
        const todo = tasks.filter(t => t.status === 'todo').length;
        const inProgress = tasks.filter(t => t.status === 'in_progress').length;
        const done = tasks.filter(t => t.status === 'done').length;
        const overdue = tasks.filter(t => t.status !== 'done' && t.due_date && new Date(t.due_date) < new Date()).length;
        return { todo, inProgress, done, overdue, total: tasks.length };
    }, [tasks]);

    const genderStats = useMemo(() => {
        const male = students.filter(s => s.gender === 'Laki-laki').length;
        const female = students.filter(s => s.gender === 'Perempuan').length;
        return { male, female, total: students.length };
    }, [students]);

    const violationsStats = useMemo(() => {
        const byType: Record<string, number> = {};
        let totalPoints = 0;
        violations.forEach(v => {
            const type = v.type || 'Lainnya';
            byType[type] = (byType[type] || 0) + 1;
            totalPoints += v.points || 0;
        });

        const studentViolations: Record<string, { count: number; points: number }> = {};
        violations.forEach(v => {
            if (!studentViolations[v.student_id]) studentViolations[v.student_id] = { count: 0, points: 0 };
            studentViolations[v.student_id].count++;
            studentViolations[v.student_id].points += v.points || 0;
        });

        const topViolators = Object.entries(studentViolations)
            .sort((a, b) => b[1].count - a[1].count)
            .slice(0, 5)
            .map(([studentId, data]) => ({ student: students.find(s => s.id === studentId), ...data }));

        return {
            total: violations.length, totalPoints,
            byType: Object.entries(byType).map(([type, count]) => ({ type, count })),
            topViolators,
        };
    }, [violations, students]);

    const quizPointsStats = useMemo(() => {
        const totalPoints = quizPoints.reduce((sum, q) => sum + (q.points || 0), 0);
        const avgPoints = quizPoints.length > 0 ? Math.round(totalPoints / quizPoints.length) : 0;

        const byCategory: Record<string, { count: number; points: number }> = {};
        quizPoints.forEach(q => {
            const cat = q.category || 'Lainnya';
            if (!byCategory[cat]) byCategory[cat] = { count: 0, points: 0 };
            byCategory[cat].count++;
            byCategory[cat].points += q.points || 0;
        });

        const studentPoints: Record<string, number> = {};
        quizPoints.forEach(q => {
            studentPoints[q.student_id] = (studentPoints[q.student_id] || 0) + (q.points || 0);
        });

        const topEngaged = Object.entries(studentPoints)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 5)
            .map(([studentId, points]) => ({ student: students.find(s => s.id === studentId), points }));

        return {
            total: quizPoints.length, totalPoints, avgPoints,
            byCategory: Object.entries(byCategory).map(([category, data]) => ({ category, ...data })),
            topEngaged,
        };
    }, [quizPoints, students]);

    return {
        // State and setters
        dateRange, setDateRange,
        selectedClassId, setSelectedClassId,
        classes: allowedClasses, // Only allowed classes!
        isLoading, refetch,
        
        // Raw Data
        students, attendance, academicRecords, violations, quizPoints, tasks,

        // Computed Stats
        gradeStats, attendanceStats, classStats, atRiskStudents, topPerformingStudents,
        dailyAttendance, taskStats, genderStats, violationsStats, quizPointsStats,
    };
};