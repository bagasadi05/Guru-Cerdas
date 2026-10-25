import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { supabase } from '../../../../services/supabase';
import {
    bintangService,
    calculateAspectPoints,
    getAspectForViolation,
    type AspectPointsSummary,
    type BintangGrade,
} from '../../../../services/bintangService';
import { dedupeViolations, dedupeQuizPoints } from '../../../../utils/academicRecordUtils';
import {
    getCurrentMonthWib,
    type BintangStudent,
    type BintangViolation,
    type BintangEvaluation,
    type BintangQuizPoint,
    type MentoringLogItem,
    type DailyObservationItem,
} from '../types/bintangDashboardTypes';

export function useBintangData() {
    const [classes, setClasses] = useState<Array<{ id: string; name: string }>>([]);
    const [selectedClass, setSelectedClass] = useState('');
    const currentMonth = getCurrentMonthWib();
    const [selectedMonth, setSelectedMonth] = useState(currentMonth);

    const [students, setStudents] = useState<BintangStudent[]>([]);
    const [violations, setViolations] = useState<BintangViolation[]>([]);
    const [evaluations, setEvaluations] = useState<BintangEvaluation[]>([]);
    const [quizPoints, setQuizPoints] = useState<BintangQuizPoint[]>([]);
    const [mentoringLogs, setMentoringLogs] = useState<MentoringLogItem[]>([]);
    const [dailyObservations, setDailyObservations] = useState<DailyObservationItem[]>([]);
    const [studentAttitudeMap, setStudentAttitudeMap] = useState<Record<string, { spiritual?: string; social?: string }>>({});

    const [isLoading, setIsLoading] = useState(false);
    const [loadError, setLoadError] = useState<string | null>(null);
    const fetchRequestIdRef = useRef(0);

    // Initial classes fetch
    useEffect(() => {
        const fetchClasses = async () => {
            const { data } = await supabase
                .from('classes')
                .select('id, name')
                .is('deleted_at', null)
                .eq('is_archived', false);
            if (data) setClasses(data);
        };
        void fetchClasses();
    }, []);

    // Main data fetch
    const fetchAllData = useCallback(async () => {
        const requestId = ++fetchRequestIdRef.current;
        const isStale = () => requestId !== fetchRequestIdRef.current;
        setIsLoading(true);
        setLoadError(null);
        try {
            const [studentsRes, evalsData, viosData, logsData, obsData, attitudeData] = await Promise.all([
                supabase
                    .from('students')
                    .select('id, name, gender, parent_phone, parent_name')
                    .eq('class_id', selectedClass)
                    .is('deleted_at', null)
                    .order('name'),
                bintangService.getMonthlyEvaluations(selectedClass, selectedMonth),
                bintangService.getViolationsForClass(selectedClass, selectedMonth),
                bintangService.getMentoringLogs(selectedClass),
                bintangService.getDailyObservations(selectedClass, selectedMonth),
                bintangService.getAttitudeMapForClassInMonth(selectedClass, selectedMonth),
            ]);
            if (studentsRes.error) throw studentsRes.error;
            if (isStale()) return;

            setStudents(studentsRes.data || []);
            setEvaluations((evalsData || []) as BintangEvaluation[]);
            setViolations(dedupeViolations(viosData || []) as BintangViolation[]);
            setMentoringLogs((logsData || []) as MentoringLogItem[]);
            setDailyObservations((obsData || []) as DailyObservationItem[]);
            setStudentAttitudeMap(attitudeData || {});

            const studentIds = (studentsRes.data || []).map((s) => s.id);
            if (studentIds.length > 0) {
                const [year, monthNum] = selectedMonth.split('-');
                const nextMonthNum = parseInt(monthNum, 10) === 12 ? 1 : parseInt(monthNum, 10) + 1;
                const nextYear = parseInt(monthNum, 10) === 12 ? parseInt(year, 10) + 1 : parseInt(year, 10);
                const monthStart = `${selectedMonth}-01`;
                const monthEnd = `${nextYear}-${nextMonthNum.toString().padStart(2, '0')}-01`;
                const { data: quizData, error: quizError } = await supabase
                    .from('quiz_points')
                    .select('id, student_id, quiz_name, subject, points, category, quiz_date, semester_id, created_at')
                    .in('student_id', studentIds)
                    .is('deleted_at', null)
                    .gte('quiz_date', monthStart)
                    .lt('quiz_date', monthEnd)
                    .limit(1000);
                if (quizError) throw quizError;
                if (isStale()) return;
                setQuizPoints(dedupeQuizPoints((quizData || []) as BintangQuizPoint[]));
            } else {
                setQuizPoints([]);
            }
        } catch (error) {
            console.error('Failed to fetch BINTANG data', error);
            if (!isStale()) {
                setLoadError(
                    'Data BINTANG gagal dimuat, jadi nilai yang tampil belum tentu benar. Generate dan Publikasi dinonaktifkan sampai data berhasil dimuat ulang.'
                );
            }
        } finally {
            if (!isStale()) setIsLoading(false);
        }
    }, [selectedClass, selectedMonth]);

    useEffect(() => {
        if (selectedClass && selectedMonth) {
            void fetchAllData();
        } else {
            fetchRequestIdRef.current++;
            setIsLoading(false);
            setLoadError(null);
            setStudents([]);
            setViolations([]);
            setEvaluations([]);
            setMentoringLogs([]);
            setStudentAttitudeMap({});
        }
    }, [selectedClass, selectedMonth, fetchAllData]);

    // Computed data
    const classSummary = useMemo(() => {
        const totalQuiz = quizPoints.reduce((sum, q) => sum + (q.points || 0), 0);
        return calculateAspectPoints(
            violations.map((v) => ({ description: v.description, points: v.points })),
            totalQuiz
        );
    }, [violations, quizPoints]);

    const studentQuizMap = useMemo(() => {
        const map = new Map<string, { totalPoints: number; count: number }>();
        for (const q of quizPoints) {
            const current = map.get(q.student_id) || { totalPoints: 0, count: 0 };
            map.set(q.student_id, {
                totalPoints: current.totalPoints + (q.points || 0),
                count: current.count + 1,
            });
        }
        return map;
    }, [quizPoints]);

    const studentAspectMap = useMemo(() => {
        const map = new Map<string, AspectPointsSummary>();
        const grouped = new Map<string, Array<{ description: string; points: number }>>();
        for (const v of violations) {
            if (!grouped.has(v.student_id)) grouped.set(v.student_id, []);
            grouped.get(v.student_id)!.push({ description: v.description, points: v.points });
        }
        for (const student of students) {
            const vList = grouped.get(student.id) || [];
            const qData = studentQuizMap.get(student.id);
            map.set(student.id, calculateAspectPoints(vList, qData?.totalPoints || 0));
        }
        return map;
    }, [violations, students, studentQuizMap]);

    const studentViolationsMap = useMemo(() => {
        const map = new Map<string, Array<{
            description: string;
            bintangAspect: ReturnType<typeof getAspectForViolation>;
            category: string | null;
            context_notes: string | null;
            date: string;
            follow_up_status?: string | null;
            follow_up_notes?: string | null;
            recorded_by_name?: string;
        }>>();
        for (const v of violations) {
            const list = map.get(v.student_id) || [];
            list.push({
                description: v.description,
                bintangAspect: getAspectForViolation(v.description),
                category: v.severity,
                context_notes: v.context_notes,
                date: v.date,
                follow_up_status: v.follow_up_status,
                follow_up_notes: v.follow_up_notes,
                recorded_by_name: v.users?.name,
            });
            map.set(v.student_id, list);
        }
        return map;
    }, [violations]);

    const staleStudentIds = useMemo(() => {
        const latestInputAt = new Map<string, number>();
        const track = (studentId: string, createdAt?: string | null) => {
            const t = createdAt ? Date.parse(createdAt) : NaN;
            if (!Number.isNaN(t) && t > (latestInputAt.get(studentId) ?? 0)) latestInputAt.set(studentId, t);
        };
        violations.forEach((v) => track(v.student_id, v.created_at));
        quizPoints.forEach((q) => track(q.student_id, q.created_at));

        const stale = new Set<string>();
        for (const ev of evaluations) {
            if (ev.is_published || !ev.updated_at) continue;
            const latest = latestInputAt.get(ev.student_id);
            if (latest && latest > Date.parse(ev.updated_at) + 1000) stale.add(ev.student_id);
        }
        return stale;
    }, [violations, quizPoints, evaluations]);

    const getAspectSummary = useCallback(
        (studentId: string): AspectPointsSummary => {
            return (
                studentAspectMap.get(studentId) ?? {
                    ADAB: { points: 0, count: 0, grade: 'A' as BintangGrade },
                    KEDISIPLINAN: { points: 0, count: 0, grade: 'A' as BintangGrade },
                    KERAPIAN: { points: 0, count: 0, grade: 'A' as BintangGrade },
                }
            );
        },
        [studentAspectMap]
    );

    const getStudentName = useCallback(
        (studentId: string) => students.find((s) => s.id === studentId)?.name || 'Unknown',
        [students]
    );

    return {
        classes,
        selectedClass,
        setSelectedClass,
        selectedMonth,
        setSelectedMonth,
        students,
        violations,
        evaluations,
        quizPoints,
        mentoringLogs,
        dailyObservations,
        studentAttitudeMap,
        isLoading,
        loadError,
        fetchAllData,
        classSummary,
        studentQuizMap,
        studentAspectMap,
        studentViolationsMap,
        staleStudentIds,
        getAspectSummary,
        getStudentName,
    };
}
