import { useMemo } from 'react';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { useAuth } from '../../../hooks/useAuth';
import { useUserSettings } from '../../../hooks/useUserSettings';
import { useSemester } from '../../../contexts/SemesterContext';
import { violationList } from '../../../services/violations.data';
import { calculateOverallGradeStats, calculateStudentAverages } from '../../../services/academicAnalyticsService';
import {
    AnalyticsClass, Student, AnalyticsAttendance,
    AttendanceStats, ClassStats, DailyAttendance, AtRiskItem,
    StudentAttendanceSummary, AutoFillStats
} from './types';
import { attendanceAutoFillService, MissingWeekday } from '../../../services/attendanceAutoFillService';
import { EMPTY_ANALYTICS_DATA, fetchAllowedClasses, fetchAnalyticsData, getMonthBounds } from './fetchAnalyticsData';

const EMPTY_CLASSES: AnalyticsClass[] = [];

/** Overview flags a student academically once their average sits this far under the KKTP. */
const AT_RISK_GRADE_MARGIN = 10;
const AT_RISK_ATTENDANCE_RATE = 75;

export const isLeadershipRole = (role: string | null | undefined) =>
    role === 'kepala_madrasah' || role === 'waka_kesiswaan' || role === 'waka_kurikulum' || role === 'admin';

export const getCurrentMonthWib = () => {
    const nowWib = new Date(Date.now() + 7 * 60 * 60 * 1000);
    return `${nowWib.getUTCFullYear()}-${String(nowWib.getUTCMonth() + 1).padStart(2, '0')}`;
};

const countStatuses = (records: AnalyticsAttendance[]) => {
    const counts = { hadir: 0, izin: 0, sakit: 0, alpha: 0 };
    for (const a of records) {
        if (a.status === 'Hadir') counts.hadir++;
        else if (a.status === 'Izin') counts.izin++;
        else if (a.status === 'Sakit') counts.sakit++;
        else if (a.status === 'Alpha') counts.alpha++;
    }
    return counts;
};

const groupBy = <T,>(items: T[], key: (item: T) => string) => {
    const map = new Map<string, T[]>();
    for (const item of items) {
        const k = key(item);
        const list = map.get(k);
        if (list) list.push(item);
        else map.set(k, [item]);
    }
    return map;
};

export const useAnalyticsData = ({ dateRange, selectedClassId }: { dateRange: string; selectedClassId: string }) => {
    const { user, userRole } = useAuth();
    const isLeadership = isLeadershipRole(userRole);
    const { activeSemester } = useSemester();
    const { kkm } = useUserSettings();

    const allowedClassesQuery = useQuery({
        queryKey: ['analytics_allowed_classes', user?.id, userRole],
        queryFn: () => fetchAllowedClasses(user!.id, isLeadership),
        enabled: !!user,
    });
    const allowedClasses = allowedClassesQuery.data ?? EMPTY_CLASSES;

    // An unknown class id (stale URL, revoked access) falls back to every allowed class.
    const scopedClassIds = useMemo(() => {
        const ids = allowedClasses.map((c) => c.id);
        return selectedClassId !== 'all' && ids.includes(selectedClassId) ? [selectedClassId] : ids;
    }, [allowedClasses, selectedClassId]);

    const dataQuery = useQuery({
        queryKey: ['analyticsData', user?.id, dateRange, scopedClassIds.join(','), activeSemester?.id],
        queryFn: () => fetchAnalyticsData({
            userId: user!.id,
            classIds: scopedClassIds,
            dateRange,
            semesterId: activeSemester?.id ?? null,
        }),
        enabled: !!user && allowedClassesQuery.isSuccess,
        placeholderData: keepPreviousData,
    });

    const { students, attendance, tasks, academicRecords, violations, quizPoints } = dataQuery.data ?? EMPTY_ANALYTICS_DATA;

    const isLoading = allowedClassesQuery.isLoading || (allowedClasses.length > 0 && dataQuery.isLoading);
    const error = allowedClassesQuery.error ?? dataQuery.error;
    const refetch = async () => {
        if (allowedClassesQuery.isError) await allowedClassesQuery.refetch();
        await dataQuery.refetch();
    };

    const gradeStats = useMemo(() => calculateOverallGradeStats(academicRecords, kkm), [academicRecords, kkm]);
    const studentAverages = useMemo(() => calculateStudentAverages(academicRecords), [academicRecords]);
    const attendanceByStudent = useMemo(() => groupBy(attendance, (a) => a.student_id), [attendance]);

    const attendanceStats = useMemo((): AttendanceStats => {
        const counts = countStatuses(attendance);
        const total = attendance.length;
        return { total, ...counts, hadirRate: total > 0 ? Math.round((counts.hadir / total) * 100) : 0 };
    }, [attendance]);

    const studentAttendanceSummaries = useMemo((): StudentAttendanceSummary[] => {
        return students.map(student => {
            const records = attendanceByStudent.get(student.id) ?? [];
            const { hadir, izin, sakit, alpha } = countStatuses(records);
            const total = records.length;
            const rate = total > 0 ? Math.round((hadir / total) * 100) : 0;
            const isAtRisk = alpha >= 2 || (total >= 5 && rate < 85);
            return { student, hadir, izin, sakit, alpha, total, rate, isAtRisk };
        }).sort((a, b) => {
            if (a.isAtRisk !== b.isAtRisk) return a.isAtRisk ? -1 : 1;
            if (a.rate !== b.rate) return a.rate - b.rate;
            return b.alpha - a.alpha;
        });
    }, [students, attendanceByStudent]);

    const autoFillStats = useMemo((): AutoFillStats => {
        const total = attendance.length;
        const autoFilled = attendance.filter(a => a.notes?.includes('[Auto-fill')).length;
        return {
            totalRecords: total,
            autoFilledRecords: autoFilled,
            manualRecords: total - autoFilled,
            autoFillPercentage: total > 0 ? Math.round((autoFilled / total) * 100) : 0,
        };
    }, [attendance]);

    const classStats = useMemo((): ClassStats[] => {
        const studentsByClass = groupBy(students, (s) => s.class_id ?? '');
        return allowedClasses.map(cls => {
            const classStudents = studentsByClass.get(cls.id) ?? [];
            let total = 0;
            let hadir = 0;
            for (const s of classStudents) {
                const records = attendanceByStudent.get(s.id) ?? [];
                total += records.length;
                hadir += records.filter((a) => a.status === 'Hadir').length;
            }
            return {
                id: cls.id,
                name: cls.name,
                studentCount: classStudents.length,
                attendanceRate: total > 0 ? Math.round((hadir / total) * 100) : 0,
            };
        }).sort((a, b) => b.attendanceRate - a.attendanceRate);
    }, [allowedClasses, students, attendanceByStudent]);

    const atRiskStudents = useMemo(() => {
        const risks: (AtRiskItem & { severity: number })[] = [];
        for (const student of students) {
            const avg = studentAverages.get(student.id);
            const records = attendanceByStudent.get(student.id) ?? [];
            const att = records.length > 0
                ? (records.filter((r) => r.status === 'Hadir').length / records.length) * 100
                : null;
            const isLowGrade = avg !== undefined && avg < kkm - AT_RISK_GRADE_MARGIN;
            const isLowAtt = att !== null && att < AT_RISK_ATTENDANCE_RATE;
            const severity = (isLowGrade ? kkm - avg! : 0) + (isLowAtt ? AT_RISK_ATTENDANCE_RATE - att! : 0);

            if (isLowGrade && isLowAtt) risks.push({ student, reason: 'both', details: `Nilai: ${avg!.toFixed(0)}, Hadir: ${att!.toFixed(0)}%`, severity });
            else if (isLowGrade) risks.push({ student, reason: 'academic', details: `Rata-rata Nilai: ${avg!.toFixed(0)}`, severity });
            else if (isLowAtt) risks.push({ student, reason: 'attendance', details: `Kehadiran: ${att!.toFixed(0)}%`, severity });
        }
        return risks
            .sort((a, b) => b.severity - a.severity)
            .slice(0, 5)
            .map(({ severity: _severity, ...item }): AtRiskItem => item);
    }, [students, studentAverages, attendanceByStudent, kkm]);

    const topPerformingStudents = useMemo(() => {
        return students
            .filter((s) => studentAverages.has(s.id))
            .map((s) => ({ student: s, avg: studentAverages.get(s.id)! }))
            .sort((a, b) => b.avg - a.avg)
            .slice(0, 3);
    }, [students, studentAverages]);

    const dailyAttendance = useMemo((): DailyAttendance[] => {
        const fullRangeMap = new Map<string, DailyAttendance>();
        const emptyDay = (date: string): DailyAttendance => ({ date, hadir: 0, izin: 0, sakit: 0, alpha: 0, total: 0 });

        const bounds = getMonthBounds(dateRange);
        if (bounds) {
            const lastDay = Number(bounds.end.slice(-2));
            for (let day = 1; day <= lastDay; day++) {
                const dateStr = `${dateRange}-${String(day).padStart(2, '0')}`;
                fullRangeMap.set(dateStr, emptyDay(dateStr));
            }
        } else {
            Array.from(new Set(attendance.map((a) => a.date).filter(Boolean))).sort()
                .forEach((dateStr) => fullRangeMap.set(dateStr, emptyDay(dateStr)));
        }

        for (const a of attendance) {
            const day = fullRangeMap.get(a.date);
            if (!day) continue;
            day.total++;
            if (a.status === 'Hadir') day.hadir++;
            else if (a.status === 'Izin') day.izin++;
            else if (a.status === 'Sakit') day.sakit++;
            else if (a.status === 'Alpha') day.alpha++;
        }

        return Array.from(fullRangeMap.values()).sort((a, b) => a.date.localeCompare(b.date));
    }, [attendance, dateRange]);

    const taskStats = useMemo(() => {
        const now = new Date();
        const todo = tasks.filter(t => t.status === 'todo').length;
        const inProgress = tasks.filter(t => t.status === 'in_progress').length;
        const done = tasks.filter(t => t.status === 'done').length;
        const overdue = tasks.filter(t => t.status !== 'done' && t.due_date && new Date(t.due_date) < now).length;
        return { todo, inProgress, done, overdue, total: tasks.length };
    }, [tasks]);

    const genderStats = useMemo(() => {
        const male = students.filter(s => s.gender === 'Laki-laki').length;
        const female = students.filter(s => s.gender === 'Perempuan').length;
        return { male, female, total: students.length };
    }, [students]);

    const studentById = useMemo(() => new Map<string, Student>(students.map((s) => [s.id, s])), [students]);

    const violationsStats = useMemo(() => {
        const byType: Record<string, number> = {};
        const studentViolations: Record<string, { count: number; points: number }> = {};
        let totalPoints = 0;
        for (const v of violations) {
            const rawType = v.type || '';
            const rawDesc = v.description || '';
            const matched = violationList.find(item => item.code === rawType || item.description === rawType || item.code === rawDesc);
            const label = matched?.description || rawDesc || rawType || 'Lainnya';
            byType[label] = (byType[label] || 0) + 1;
            totalPoints += v.points || 0;

            const entry = studentViolations[v.student_id] ?? { count: 0, points: 0 };
            entry.count++;
            entry.points += v.points || 0;
            studentViolations[v.student_id] = entry;
        }

        const topViolators = Object.entries(studentViolations)
            .sort((a, b) => b[1].count - a[1].count)
            .slice(0, 5)
            .map(([studentId, data]) => ({ student: studentById.get(studentId), ...data }));

        return {
            total: violations.length, totalPoints,
            byType: Object.entries(byType).map(([type, count]) => ({ type, count })).sort((a, b) => b.count - a.count),
            topViolators,
        };
    }, [violations, studentById]);

    const quizPointsStats = useMemo(() => {
        const totalPoints = quizPoints.reduce((sum, q) => sum + (q.points || 0), 0);
        const avgPoints = quizPoints.length > 0 ? Math.round(totalPoints / quizPoints.length) : 0;

        const byCategory: Record<string, { count: number; points: number }> = {};
        const studentPoints: Record<string, number> = {};
        for (const q of quizPoints) {
            const cat = q.category || 'Lainnya';
            const entry = byCategory[cat] ?? { count: 0, points: 0 };
            entry.count++;
            entry.points += q.points || 0;
            byCategory[cat] = entry;
            studentPoints[q.student_id] = (studentPoints[q.student_id] || 0) + (q.points || 0);
        }

        const topEngaged = Object.entries(studentPoints)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 5)
            .map(([studentId, points]) => ({ student: studentById.get(studentId), points }));

        return {
            total: quizPoints.length, totalPoints, avgPoints,
            byCategory: Object.entries(byCategory).map(([category, data]) => ({ category, ...data })),
            topEngaged,
        };
    }, [quizPoints, studentById]);

    // Missing weekdays for the current week; checks at most 10 classes to bound the request fan-out.
    const { data: missingWeekdays = [] } = useQuery({
        queryKey: ['analytics_missing_weekdays', scopedClassIds.join(','), students.length],
        queryFn: async (): Promise<MissingWeekday[]> => {
            const studentsByClass = groupBy(students, (s) => s.class_id ?? '');
            const results = await Promise.all(
                scopedClassIds.slice(0, 10).map((classId) => {
                    const classStudents = studentsByClass.get(classId) ?? [];
                    if (classStudents.length === 0) return Promise.resolve([]);
                    return attendanceAutoFillService.getMissingWeekdaysForClass(classId, classStudents.map((s) => s.id));
                })
            );

            const dateMap = new Map<string, MissingWeekday>();
            for (const item of results.flat()) {
                if (!dateMap.has(item.date)) dateMap.set(item.date, item);
            }
            return Array.from(dateMap.values()).sort((a, b) => a.date.localeCompare(b.date));
        },
        enabled: scopedClassIds.length > 0 && students.length > 0,
    });

    return {
        classes: allowedClasses,
        isLeadership,
        kktp: kkm,
        activeSemester,
        isLoading,
        isFetching: dataQuery.isFetching || allowedClassesQuery.isFetching,
        isError: !!error,
        hasData: !!dataQuery.data,
        refetch,

        students, attendance, academicRecords, violations, quizPoints, tasks,

        gradeStats, attendanceStats, classStats, atRiskStudents, topPerformingStudents,
        dailyAttendance, taskStats, genderStats, violationsStats, quizPointsStats,
        studentAttendanceSummaries, autoFillStats, missingWeekdays,
    };
};
