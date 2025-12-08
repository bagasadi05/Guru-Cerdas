import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { useScheduleNotifications } from '../../hooks/useScheduleNotifications';
import { Card, CardHeader, CardTitle, CardContent, CardFooter, CardDescription } from '../ui/Card';
import { Link, useNavigate } from 'react-router-dom';
import { CalendarIcon, UsersIcon, BookOpenIcon, ClockIcon, BrainCircuitIcon, CheckSquareIcon, AlertTriangleIcon, CheckCircleIcon, UserMinusIcon, ChevronRightIcon, ClipboardPenIcon, PlusIcon, SearchIcon, SettingsIcon, SparklesIcon, TrendingUpIcon, ActivityIcon } from '../Icons';
import { Button } from '../ui/Button';
import { Type } from '@google/genai';
import { ai } from '../../services/supabase';
import { supabase } from '../../services/supabase';
import { Database } from '../../services/database.types';
import { useQuery } from '@tanstack/react-query';
import DashboardPageSkeleton from '../skeletons/DashboardPageSkeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/Tabs';
import { Select } from '../ui/Select';
import { Skeleton } from '../ui/Skeleton';
import FloatingActionButton from '../ui/FloatingActionButton';
import { GradeDistributionChart, ClassComparisonChart } from '../ui/AnalyticsCharts';
import { EmptyState } from '../ui/EmptyState';
import AttendanceStatsWidget from '../dashboard/AttendanceStatsWidget';
import ParentMessagesWidget from '../dashboard/ParentMessagesWidget';
import { ClassAnalyticsSection } from '../dashboard/ClassAnalyticsSection';
import { LeaderboardCard } from '../gamification/LeaderboardCard';
import { transformToGameData, StudentGameData } from '../../services/gamificationService';

type TaskRow = Database['public']['Tables']['tasks']['Row'];
type ScheduleRow = Database['public']['Tables']['schedules']['Row'];
type StudentRow = Database['public']['Tables']['students']['Row'];
type ClassRow = Database['public']['Tables']['classes']['Row'];
type WeeklyAttendance = { day: string; present_percentage: number };

type DashboardQueryData = {
    students: Pick<StudentRow, 'id' | 'name' | 'avatar_url' | 'class_id'>[];
    tasks: TaskRow[];
    schedule: ScheduleRow[];
    classes: Pick<ClassRow, 'id' | 'name'>[];
    dailyAttendanceSummary: { present: number; total: number };
    weeklyAttendance: WeeklyAttendance[];
    academicRecords: Pick<Database['public']['Tables']['academic_records']['Row'], 'student_id' | 'subject' | 'score' | 'assessment_name'>[];
    violations: Pick<Database['public']['Tables']['violations']['Row'], 'student_id' | 'points'>[];
};

type AiInsight = {
    positive_highlights: { student_name: string; reason: string; student_id?: string; }[];
    areas_for_attention: { student_name: string; reason: string; student_id?: string; }[];
    class_focus_suggestion: string;
};

const fetchDashboardData = async (userId: string): Promise<DashboardQueryData> => {
    const today = new Date().toISOString().slice(0, 10);
    const todayDay = new Date().toLocaleDateString('id-ID', { weekday: 'long' });

    const [
        studentsRes, tasksRes, scheduleRes, classesRes, dailyAttendanceRes,
        weeklyAttendanceRes, academicRecordsRes, violationsRes
    ] = await Promise.all([
        supabase.from('students').select('id, name, avatar_url, class_id').eq('user_id', userId),
        supabase.from('tasks').select('*').eq('user_id', userId).neq('status', 'done').order('due_date'),
        supabase.from('schedules').select('*').eq('user_id', userId).eq('day', todayDay as Database['public']['Tables']['schedules']['Row']['day']).order('start_time'),
        supabase.from('classes').select('id, name').eq('user_id', userId),
        supabase.from('attendance').select('status', { count: 'exact' }).eq('user_id', userId).eq('date', today),
        supabase.rpc('get_weekly_attendance_summary'),
        supabase.from('academic_records').select('student_id, subject, score, assessment_name').eq('user_id', userId),
        supabase.from('violations').select('student_id, points').eq('user_id', userId)
    ]);

    const errors = [studentsRes, tasksRes, scheduleRes, classesRes, dailyAttendanceRes, weeklyAttendanceRes, academicRecordsRes, violationsRes]
        .map(res => res.error).filter((e): e is NonNullable<typeof e> => e !== null);
    if (errors.length > 0) throw new Error(errors.map(e => e.message).join(', '));

    const presentCount = dailyAttendanceRes.data?.filter(a => a.status === 'Hadir').length || 0;

    return {
        students: studentsRes.data || [],
        tasks: tasksRes.data || [],
        schedule: scheduleRes.data || [],
        classes: classesRes.data || [],
        dailyAttendanceSummary: { present: presentCount, total: dailyAttendanceRes.count || 0 },
        weeklyAttendance: weeklyAttendanceRes.data as WeeklyAttendance[] || [],
        academicRecords: academicRecordsRes.data || [],
        violations: violationsRes.data || [],
    };
};

const AI_INSIGHT_STORAGE_KEY = 'portal_guru_ai_insight';

interface StoredInsight {
    date: string; // YYYY-MM-DD format
    insight: AiInsight;
}

const AiDashboardInsight: React.FC<{ dashboardData: DashboardQueryData | null }> = ({ dashboardData }) => {
    const [insight, setInsight] = useState<AiInsight | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [lastGeneratedDate, setLastGeneratedDate] = useState<string | null>(null);

    // Get today's date in YYYY-MM-DD format
    const getTodayDate = () => new Date().toISOString().split('T')[0];

    // Load cached insight on mount
    useEffect(() => {
        const stored = localStorage.getItem(AI_INSIGHT_STORAGE_KEY);
        if (stored) {
            try {
                const parsed: StoredInsight = JSON.parse(stored);
                const today = getTodayDate();

                if (parsed.date === today) {
                    // Same day - use cached insight
                    setInsight(parsed.insight);
                    setLastGeneratedDate(parsed.date);
                } else {
                    // Different day - clear old insight and auto-generate new one
                    setLastGeneratedDate(parsed.date);
                    if (dashboardData) {
                        generateInsight();
                    }
                }
            } catch (e) {
                console.error('Error parsing stored insight:', e);
            }
        }
    }, [dashboardData]);

    // Auto-generate insight if new day and data is available
    useEffect(() => {
        const today = getTodayDate();
        if (dashboardData && lastGeneratedDate && lastGeneratedDate !== today && !isLoading && !insight) {
            generateInsight();
        }
    }, [dashboardData, lastGeneratedDate]);

    const generateInsight = async () => {
        if (!dashboardData) return;
        setIsLoading(true);
        setError(null);
        try {
            const { students, academicRecords, violations, dailyAttendanceSummary } = dashboardData;
            const studentMap = new Map(dashboardData.students.map(s => [s.name, s.id]));

            const systemInstruction = `Anda adalah asisten guru AI yang cerdas dan proaktif. Analisis data yang diberikan dan hasilkan ringkasan dalam format JSON yang valid. Fokus pada menyoroti pencapaian positif, area yang memerlukan perhatian, dan saran umum. Gunakan Bahasa Indonesia.`;
            const studentDataForPrompt = students.map(s => {
                const studentViolations = violations.filter(v => v.student_id === s.id).reduce((sum, v) => sum + v.points, 0);
                const studentScores = academicRecords.filter(r => r.student_id === s.id);
                const avgScore = studentScores.length > 0 ? studentScores.reduce((a, b) => a + b.score, 0) / studentScores.length : null;
                return { name: s.name, total_violation_points: studentViolations, average_score: avgScore ? Math.round(avgScore) : 'N/A' };
            });
            const prompt = `Analisis data guru berikut untuk memberikan wawasan harian. Data Ringkasan: Total Siswa: ${students.length}, Absensi Hari Ini: ${dailyAttendanceSummary.present} dari ${students.length} hadir. Data Rinci Siswa (nilai & pelanggaran): ${JSON.stringify(studentDataForPrompt)} Tugas Anda: 1. Identifikasi 1-2 siswa berprestasi (nilai rata-rata tinggi, 0 poin pelanggaran). 2. Identifikasi 1-2 siswa yang memerlukan perhatian (nilai rata-rata rendah atau poin pelanggaran tinggi). 3. Berikan satu saran fokus untuk kelas secara umum.`;
            const responseSchema = { type: Type.OBJECT, properties: { positive_highlights: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { student_name: { type: Type.STRING }, reason: { type: Type.STRING } } } }, areas_for_attention: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { student_name: { type: Type.STRING }, reason: { type: Type.STRING } } } }, class_focus_suggestion: { type: Type.STRING } } };

            const response = await ai.models.generateContent({ model: 'gemini-2.5-flash', contents: prompt, config: { systemInstruction, responseMimeType: "application/json", responseSchema } });
            const parsedInsight: AiInsight = JSON.parse(response.text || '{}');

            const enrichedInsight = {
                ...parsedInsight,
                positive_highlights: parsedInsight.positive_highlights.map(h => ({ ...h, student_id: studentMap.get(h.student_name) })),
                areas_for_attention: parsedInsight.areas_for_attention.map(a => ({ ...a, student_id: studentMap.get(a.student_name) }))
            };

            // Save to localStorage with today's date
            const today = getTodayDate();
            const storedData: StoredInsight = { date: today, insight: enrichedInsight };
            localStorage.setItem(AI_INSIGHT_STORAGE_KEY, JSON.stringify(storedData));

            setInsight(enrichedInsight);
            setLastGeneratedDate(today);
        } catch (err) {
            console.error("AI Insight Error:", err);
            setError("Gagal membuat wawasan AI. Silakan coba lagi.");
        } finally {
            setIsLoading(false);
        }
    };

    if (isLoading) {
        return <div className="space-y-4"><Skeleton className="h-4 w-1/2" /><Skeleton className="h-4 w-full" /><Skeleton className="h-4 w-3/4" /></div>;
    }

    if (error) {
        return <p className="text-sm text-red-400">{error}</p>;
    }

    if (!insight) {
        return (
            <div className="text-center py-8">
                <Button onClick={generateInsight} disabled={isLoading || !dashboardData} className="bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white border-0 shadow-lg shadow-indigo-500/20 transition-all hover:scale-105 rounded-full px-6">
                    <SparklesIcon className="w-4 h-4 mr-2" />
                    Buat Wawasan Harian AI
                </Button>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-3">Dapatkan ringkasan performa kelas hari ini.</p>
            </div>
        );
    }

    return (
        <div className="space-y-4 text-sm animate-fade-in">
            {insight.positive_highlights?.length > 0 && (
                <div className="flex items-start gap-3 p-4 rounded-2xl bg-emerald-500/5 border border-emerald-500/10">
                    <div className="flex-shrink-0 w-8 h-8 rounded-full bg-emerald-500/20 flex items-center justify-center"><CheckCircleIcon className="w-5 h-5 text-emerald-500" /></div>
                    <div><p className="font-bold text-slate-800 dark:text-slate-200">Siswa Berprestasi</p>
                        {insight.positive_highlights.map(item => (
                            <p key={item.student_name} className="text-slate-600 dark:text-slate-400 mt-1">
                                <Link to={`/siswa/${item.student_id}`} className="font-semibold text-emerald-600 dark:text-emerald-400 hover:underline">{item.student_name}</Link>: {item.reason}
                            </p>
                        ))}
                    </div>
                </div>
            )}
            {insight.areas_for_attention?.length > 0 && (
                <div className="flex items-start gap-3 p-4 rounded-2xl bg-amber-500/5 border border-amber-500/10">
                    <div className="flex-shrink-0 w-8 h-8 rounded-full bg-amber-500/20 flex items-center justify-center"><AlertTriangleIcon className="w-5 h-5 text-amber-500" /></div>
                    <div><p className="font-bold text-slate-800 dark:text-slate-200">Perlu Perhatian</p>
                        {insight.areas_for_attention.map(item => (
                            <p key={item.student_name} className="text-slate-600 dark:text-slate-400 mt-1">
                                <Link to={`/siswa/${item.student_id}`} className="font-semibold text-amber-600 dark:text-amber-400 hover:underline">{item.student_name}</Link>: {item.reason}
                            </p>
                        ))}
                    </div>
                </div>
            )}
            {insight.class_focus_suggestion && (
                <div className="flex items-start gap-3 p-4 rounded-2xl bg-indigo-500/5 border border-indigo-500/10">
                    <div className="flex-shrink-0 w-8 h-8 rounded-full bg-indigo-500/20 flex items-center justify-center"><SparklesIcon className="w-5 h-5 text-indigo-500" /></div>
                    <div><p className="font-bold text-slate-800 dark:text-slate-200">Saran Hari Ini</p><p className="text-slate-600 dark:text-slate-400 mt-1">{insight.class_focus_suggestion}</p></div>
                </div>
            )}
        </div>
    );
};

const WeeklyAttendanceChart: React.FC<{ data: WeeklyAttendance[] }> = ({ data }) => {
    const [hoveredIndex, setHoveredIndex] = React.useState<number | null>(null);
    const chartHeight = 160;
    const barWidth = 32;
    const gap = 24;

    return (
        <div className="w-full h-full flex justify-center items-end pb-2">
            <svg width="100%" height={chartHeight} aria-label="Grafik absensi mingguan" className="overflow-visible">
                <defs>
                    <linearGradient id="barGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" className="text-indigo-500 dark:text-indigo-400" stopColor="currentColor" />
                        <stop offset="100%" className="text-violet-600 dark:text-violet-500" stopColor="currentColor" />
                    </linearGradient>
                    <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
                        <feGaussianBlur stdDeviation="3" result="coloredBlur" />
                        <feMerge>
                            <feMergeNode in="coloredBlur" />
                            <feMergeNode in="SourceGraphic" />
                        </feMerge>
                    </filter>
                </defs>
                {data.map((day, index) => {
                    const barHeight = day.present_percentage > 0 ? (day.present_percentage / 100) * (chartHeight - 40) : 4;
                    const x = index * (barWidth + gap) + (gap);
                    const y = chartHeight - barHeight - 20;
                    const isHovered = hoveredIndex === index;

                    return (
                        <g key={day.day}
                            onMouseEnter={() => setHoveredIndex(index)}
                            onMouseLeave={() => setHoveredIndex(null)}
                            className="cursor-pointer group">

                            {/* Background track */}
                            <rect
                                x={x}
                                y={20}
                                width={barWidth}
                                height={chartHeight - 40}
                                rx="6"
                                className="fill-slate-100 dark:fill-slate-800/50"
                            />

                            {/* Active Bar */}
                            <rect
                                x={x}
                                y={y}
                                width={barWidth}
                                height={barHeight}
                                fill="url(#barGradient)"
                                rx="6"
                                filter={isHovered ? "url(#glow)" : ""}
                                className="transition-all duration-300 animate-grow-bar"
                                style={{ transformOrigin: 'bottom', animationDelay: `${index * 100}ms` }}
                            />

                            {/* Label */}
                            <text
                                x={x + barWidth / 2}
                                y={chartHeight}
                                textAnchor="middle"
                                fontSize="11"
                                fontWeight="600"
                                className={`transition-colors duration-300 ${isHovered ? 'fill-indigo-500 dark:fill-indigo-400' : 'fill-slate-400 dark:fill-slate-500'}`}
                            >
                                {day.day.slice(0, 3)}
                            </text>

                            {/* Tooltip */}
                            {isHovered && (
                                <g className="transition-opacity duration-300 animate-fade-in" style={{ opacity: 1 }}>
                                    <rect x={x + barWidth / 2 - 20} y={y - 36} width={40} height={28} rx="6" className="fill-slate-800 dark:fill-white shadow-xl" />
                                    <text
                                        x={x + barWidth / 2}
                                        y={y - 18}
                                        textAnchor="middle"
                                        fontSize="11"
                                        fontWeight="bold"
                                        className="fill-white dark:fill-slate-900"
                                    >
                                        {Math.round(day.present_percentage)}%
                                    </text>
                                    <path d={`M${x + barWidth / 2 - 5},${y - 8} L${x + barWidth / 2 + 5},${y - 8} L${x + barWidth / 2},${y - 3} Z`} className="fill-slate-800 dark:fill-white" />
                                </g>
                            )}
                        </g>
                    );
                })}
            </svg>
        </div>
    );
};

const DashboardPage: React.FC = () => {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [currentTime, setCurrentTime] = useState(new Date());


    const [isFabOpen, setIsFabOpen] = useState(false);

    useEffect(() => {
        const timerId = setInterval(() => setCurrentTime(new Date()), 60000); // Update every minute
        return () => clearInterval(timerId);
    }, []);

    const { data, isLoading } = useQuery({
        queryKey: ['dashboardData', user?.id],
        queryFn: () => fetchDashboardData(user!.id),
        enabled: !!user,
    });

    // Sync schedule with Service Worker for notifications
    useScheduleNotifications(data?.schedule || []);

    const [subjectForCompletionCheck, setSubjectForCompletionCheck] = useState('');
    const [assessmentForCompletionCheck, setAssessmentForCompletionCheck] = useState('');
    const [selectedClassForCheck, setSelectedClassForCheck] = useState<string>('');

    const uniqueSubjects = useMemo(() => {
        if (!data?.academicRecords) return [];
        const subjects = new Set(data.academicRecords.map(r => r.subject));
        return Array.from(subjects).sort();
    }, [data?.academicRecords]);

    const uniqueAssessmentsForSubject = useMemo(() => {
        if (!subjectForCompletionCheck || !data?.academicRecords || !data?.students) return [];

        let relevantStudentIds: Set<string> | null = null;
        if (selectedClassForCheck) {
            relevantStudentIds = new Set(
                data.students
                    .filter(s => s.class_id === selectedClassForCheck)
                    .map(s => s.id)
            );
        }

        const assessmentNames = data.academicRecords
            .filter(r => {
                if (r.subject !== subjectForCompletionCheck) return false;
                if (!r.assessment_name) return false;
                if (relevantStudentIds && !relevantStudentIds.has(r.student_id)) return false;
                return true;
            })
            .map(r => r.assessment_name!.trim());

        const uniqueAssessments = [...new Set(assessmentNames)].filter(Boolean);

        return uniqueAssessments.sort((a: string, b: string) => a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' }));
    }, [data?.academicRecords, data?.students, subjectForCompletionCheck, selectedClassForCheck]);

    useEffect(() => {
        if (uniqueSubjects.length > 0 && !subjectForCompletionCheck) {
            setSubjectForCompletionCheck(uniqueSubjects[0]);
        }
    }, [uniqueSubjects, subjectForCompletionCheck]);

    useEffect(() => {
        setAssessmentForCompletionCheck('');
    }, [subjectForCompletionCheck]);

    const handleSubjectChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        setSubjectForCompletionCheck(e.target.value);
        setAssessmentForCompletionCheck('');
    };

    const studentsMissingGrade = useMemo(() => {
        if (!subjectForCompletionCheck || !data?.students || !data?.academicRecords || !data?.classes) return [];

        const classMap = new Map((data.classes || []).map(c => [c.id, c.name]));

        let targetStudents = data.students;
        if (selectedClassForCheck) {
            targetStudents = targetStudents.filter(s => s.class_id === selectedClassForCheck);
        }

        if (assessmentForCompletionCheck) {
            const gradedStudentIds = new Set(
                data.academicRecords
                    .filter(r => r.subject === subjectForCompletionCheck && r.assessment_name === assessmentForCompletionCheck)
                    .map(r => r.student_id)
            );

            return targetStudents
                .filter(s => !gradedStudentIds.has(s.id))
                .map(s => ({
                    ...s,
                    className: classMap.get(s.class_id) || 'N/A',
                    missingAssessment: assessmentForCompletionCheck
                }));
        } else {
            if (uniqueAssessmentsForSubject.length === 0) return [];

            return targetStudents.map(s => {
                const studentRecords = data.academicRecords.filter(r => r.student_id === s.id && r.subject === subjectForCompletionCheck);
                const studentAssessments = new Set(studentRecords.map(r => r.assessment_name));

                const missingAssessments = uniqueAssessmentsForSubject.filter(a => !studentAssessments.has(a));

                return {
                    ...s,
                    className: classMap.get(s.class_id) || 'N/A',
                    missingAssessments: missingAssessments
                };
            })
                .filter(s => s.missingAssessments.length > 0);
        }
    }, [subjectForCompletionCheck, assessmentForCompletionCheck, data, selectedClassForCheck, uniqueAssessmentsForSubject]);

    const totalStudentsForCheck = useMemo(() => {
        if (!data?.students) return 0;
        if (selectedClassForCheck) {
            return data.students.filter(s => s.class_id === selectedClassForCheck).length;
        }
        return data.students.length;
    }, [data?.students, selectedClassForCheck]);

    const completionPercentage = useMemo(() => {
        if (totalStudentsForCheck === 0) return 0;
        return Math.round(((totalStudentsForCheck - studentsMissingGrade.length) / totalStudentsForCheck) * 100);
    }, [totalStudentsForCheck, studentsMissingGrade.length]);

    const handleNavigateToStudent = (studentId: string) => {
        navigate(`/siswa/${studentId}`, { state: { openTab: 'grades' } });
    }

    const handleOpenMassInput = () => {
        if (!subjectForCompletionCheck) return;

        let classIdToPass = selectedClassForCheck;
        if (!classIdToPass && studentsMissingGrade.length > 0) {
            classIdToPass = studentsMissingGrade[0].class_id;
        }

        let assessmentToPass = assessmentForCompletionCheck;
        if (!assessmentToPass && studentsMissingGrade.length > 0 && 'missingAssessments' in studentsMissingGrade[0]) {
            // @ts-ignore
            assessmentToPass = studentsMissingGrade[0].missingAssessments[0];
        }

        navigate('/input-massal', {
            state: {
                prefill: {
                    mode: 'subject_grade',
                    classId: classIdToPass,
                    subject: subjectForCompletionCheck,
                    assessment_name: assessmentToPass
                }
            }
        });
    };

    if (isLoading) return <DashboardPageSkeleton />;

    const { students = [], tasks = [], schedule = [], classes = [], dailyAttendanceSummary, weeklyAttendance = [] } = data || {};
    const todaySchedule = schedule.map(item => ({ ...item, className: classes.find(c => c.id === item.class_id)?.name || item.class_id }));

    const attendancePercentage = students.length > 0
        ? Math.round((dailyAttendanceSummary?.present || 0) / students.length * 100)
        : 0;

    let nextClassIndex = -1;
    for (let i = 0; i < todaySchedule.length; i++) {
        const item = todaySchedule[i];
        const [startH, startM] = item.start_time.split(':').map(Number);
        const startTime = new Date(currentTime);
        startTime.setHours(startH, startM, 0, 0);
        if (startTime > currentTime) {
            nextClassIndex = i;
            break;
        }
    }

    const stats = [
        { label: 'Peserta Didik', value: students.length, icon: UsersIcon, link: '/siswa', color: 'from-sky-500 to-blue-600', subValue: `${classes.length} kelas` },
        { label: 'Kehadiran', value: `${attendancePercentage}%`, subValue: `${dailyAttendanceSummary?.present || 0}/${students.length} hadir`, icon: CheckSquareIcon, link: '/absensi', color: 'from-emerald-500 to-green-600' },
        { label: 'Tugas Aktif', value: tasks.length, icon: BookOpenIcon, link: '/tugas', color: 'from-amber-500 to-orange-600', subValue: 'tugas' },
        { label: 'Jadwal', value: schedule.length, icon: CalendarIcon, link: '/jadwal', color: 'from-violet-500 to-purple-600', subValue: nextClassIndex >= 0 ? `Next: ${schedule[nextClassIndex]?.subject.slice(0, 8)}...` : 'Selesai' }
    ];

    return (
        <div className="w-full min-h-full p-4 lg:p-8 flex flex-col space-y-6 lg:space-y-8 bg-transparent max-w-7xl mx-auto pb-32 lg:pb-12 animate-fade-in-up">
            <header className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold text-slate-900 dark:text-white tracking-tight font-serif bg-clip-text text-transparent bg-gradient-to-r from-slate-900 to-slate-600 dark:from-white dark:to-slate-300">
                        {(() => {
                            const hour = new Date().getHours();
                            let greeting = 'Selamat Pagi';
                            if (hour >= 11 && hour < 15) greeting = 'Selamat Siang';
                            else if (hour >= 15 && hour < 19) greeting = 'Selamat Sore';
                            else if (hour >= 19 || hour < 4) greeting = 'Selamat Malam';
                            return `${greeting}, ${user?.name?.split(' ')[0] || 'Guru'}`;
                        })()}
                    </h1>
                    <p className="text-sm font-medium text-slate-500 dark:text-slate-400 mt-1 flex items-center gap-2">
                        <CalendarIcon className="w-4 h-4" />
                        {new Date().toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
                    </p>
                </div>
            </header>

            <div className="grid grid-cols-1 xl:grid-cols-12 gap-4 sm:gap-6">
                {/* Left Column */}
                <div className="xl:col-span-9 space-y-4 sm:space-y-6">
                    {/* Stats Grid */}
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                        {stats.map(stat => (
                            <Link to={stat.link} key={stat.label} className="group block h-full">
                                <div className="glass-card rounded-2xl p-5 h-full flex flex-col justify-between group-hover:-translate-y-1 transition-all duration-300 relative overflow-hidden border border-white/20 dark:border-white/5 shadow-lg shadow-slate-200/50 dark:shadow-black/20 hover:shadow-xl hover:shadow-indigo-500/10">
                                    <div className="absolute inset-0 bg-gradient-to-br from-white/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                                    <div className="flex items-start justify-between mb-4 relative z-10">
                                        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center bg-gradient-to-br ${stat.color} shadow-lg text-white transform group-hover:scale-110 transition-transform duration-300`}>
                                            <stat.icon className="w-6 h-6" />
                                        </div>
                                    </div>
                                    <div className="relative z-10">
                                        <p className="text-3xl font-bold text-slate-800 dark:text-white leading-none mb-2 tracking-tight">{stat.value}</p>
                                        <p className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-1">{stat.label}</p>
                                        {stat.subValue && <p className="text-xs font-medium text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-white/5 px-2 py-1 rounded-lg inline-block">{stat.subValue}</p>}
                                    </div>
                                </div>
                            </Link>
                        ))}
                    </div>

                    {/* AI Insight */}
                    <div className="glass-card rounded-3xl p-0 overflow-hidden border border-indigo-500/20 shadow-xl shadow-indigo-500/5">
                        <div className="p-6 border-b border-white/10 bg-gradient-to-r from-indigo-500/10 via-purple-500/5 to-transparent">
                            <h3 className="flex items-center gap-2 font-bold text-xl text-slate-800 dark:text-white tracking-wide">
                                <BrainCircuitIcon className="w-6 h-6 text-indigo-500" />
                                Analisis Cerdas Harian
                            </h3>
                            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Wawasan berbasis AI untuk performa kelas Anda.</p>
                        </div>
                        <div className="p-6 bg-white/30 dark:bg-slate-900/30 backdrop-blur-sm">
                            <AiDashboardInsight dashboardData={data || null} />
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Attendance Chart */}
                        <div className="glass-card rounded-3xl p-0 overflow-hidden flex flex-col">
                            <div className="p-6 border-b border-slate-200/50 dark:border-white/5">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <h3 className="font-bold text-lg text-slate-800 dark:text-white tracking-wide">Tren Kehadiran</h3>
                                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Statistik 5 hari terakhir</p>
                                    </div>
                                    <div className="w-10 h-10 rounded-full bg-slate-100 dark:bg-white/5 flex items-center justify-center">
                                        <ActivityIcon className="w-5 h-5 text-slate-400" />
                                    </div>
                                </div>
                            </div>
                            <div className="p-6 flex-1 flex items-end justify-center min-h-[200px]">
                                <WeeklyAttendanceChart data={weeklyAttendance} />
                            </div>
                        </div>

                        {/* Grade Audit */}
                        <div className="glass-card rounded-3xl p-0 overflow-hidden flex flex-col">
                            <div className="p-6 border-b border-slate-200/50 dark:border-white/5 bg-gradient-to-r from-amber-500/5 to-transparent">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <h3 className="font-bold text-lg text-slate-800 dark:text-white tracking-wide">Audit Nilai</h3>
                                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Cek kelengkapan penilaian siswa</p>
                                    </div>
                                    <div className="w-10 h-10 rounded-full bg-amber-100 dark:bg-amber-500/20 flex items-center justify-center">
                                        <UserMinusIcon className="w-5 h-5 text-amber-500" />
                                    </div>
                                </div>
                            </div>
                            <div className="p-6 flex-1 flex flex-col">
                                <div className="space-y-4 mb-4">
                                    <Select value={selectedClassForCheck} onChange={(e) => setSelectedClassForCheck(e.target.value)} className="bg-white/50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700 rounded-xl">
                                        <option value="">Semua Kelas</option>
                                        {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                    </Select>
                                    <div className="flex gap-3">
                                        <Select value={subjectForCompletionCheck} onChange={handleSubjectChange} className="flex-1 bg-white/50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700 rounded-xl">
                                            <option value="" disabled>Mapel</option>
                                            {uniqueSubjects.map((subject) => (
                                                <option key={subject} value={subject}>{subject}</option>
                                            ))}
                                        </Select>
                                        <Select value={assessmentForCompletionCheck} onChange={(e) => setAssessmentForCompletionCheck(e.target.value)} className="flex-1 bg-white/50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700 rounded-xl" disabled={uniqueAssessmentsForSubject.length === 0}>
                                            <option value="">Semua</option>
                                            {uniqueAssessmentsForSubject.map((assessment) => (
                                                <option key={assessment} value={assessment}>{assessment}</option>
                                            ))}
                                        </Select>
                                    </div>
                                </div>

                                {subjectForCompletionCheck ? (
                                    <div className="flex-1">
                                        <div className="flex justify-between text-xs mb-2 font-bold uppercase tracking-wider">
                                            <span className="text-slate-400">Progres</span>
                                            <span className={`${completionPercentage === 100 ? 'text-green-500' : 'text-indigo-500'}`}>{completionPercentage}%</span>
                                        </div>
                                        <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-3 overflow-hidden mb-4">
                                            <div className={`h-full rounded-full transition-all duration-1000 ease-out ${completionPercentage === 100 ? 'bg-green-500' : 'bg-indigo-500'}`} style={{ width: `${completionPercentage}%` }}></div>
                                        </div>

                                        {studentsMissingGrade.length > 0 ? (
                                            <div className="mt-auto">
                                                <Button onClick={handleOpenMassInput} className="w-full bg-indigo-600 hover:bg-indigo-700 text-white shadow-lg shadow-indigo-500/20 rounded-xl" size="sm">
                                                    <ClipboardPenIcon className="w-4 h-4 mr-2" />
                                                    Lengkapi ({studentsMissingGrade.length})
                                                </Button>
                                            </div>
                                        ) : (
                                            <div className="mt-auto text-center py-2 text-green-500 font-medium text-sm flex items-center justify-center gap-2">
                                                <CheckCircleIcon className="w-4 h-4" />
                                                Lengkap!
                                            </div>
                                        )}
                                    </div>
                                ) : (
                                    <div className="flex-1 flex items-center justify-center text-slate-400 text-sm">
                                        Pilih mapel untuk cek
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Attendance Statistics Widget */}
                    <AttendanceStatsWidget />

                    {/* Class Analytics */}
                    {data && data.classes.length > 0 && (
                        <ClassAnalyticsSection
                            classes={data.classes}
                            students={data.students}
                            academicRecords={data.academicRecords}
                            attendanceRecords={[]}
                        />
                    )}

                    {/* Leaderboard */}
                    {data && data.students.length > 0 && (
                        <LeaderboardCard
                            studentsData={data.students.map(s => {
                                const className = data.classes.find(c => c.id === s.class_id)?.name || 'N/A';
                                return transformToGameData(
                                    s,
                                    className,
                                    data.academicRecords,
                                    [],
                                    [],
                                    data.violations
                                );
                            })}
                            classes={data.classes}
                        />
                    )}
                </div>

                {/* Right Column */}
                <div className="xl:col-span-3 space-y-4">
                    <div className="glass-card rounded-3xl h-full max-h-[800px] flex flex-col overflow-hidden border border-slate-200/50 dark:border-white/5 shadow-2xl shadow-slate-200/50 dark:shadow-black/20">
                        <Tabs defaultValue="schedule" className="w-full flex flex-col h-full">
                            <div className="p-4 border-b border-slate-200/50 dark:border-white/5 bg-slate-50/50 dark:bg-white/5 backdrop-blur-md">
                                <TabsList className="w-full grid grid-cols-2 p-1.5 bg-slate-200/50 dark:bg-black/20 rounded-2xl">
                                    <TabsTrigger value="schedule" className="rounded-xl font-medium data-[state=active]:bg-white dark:data-[state=active]:bg-slate-800 data-[state=active]:shadow-sm data-[state=active]:text-indigo-600 dark:data-[state=active]:text-indigo-400 transition-all">Jadwal</TabsTrigger>
                                    <TabsTrigger value="tasks" className="rounded-xl font-medium data-[state=active]:bg-white dark:data-[state=active]:bg-slate-800 data-[state=active]:shadow-sm data-[state=active]:text-amber-600 dark:data-[state=active]:text-amber-400 transition-all">Tugas</TabsTrigger>
                                </TabsList>
                            </div>

                            <TabsContent value="schedule" className="flex-1 overflow-y-auto p-0 m-0 custom-scrollbar">
                                <div className="relative p-6">
                                    {todaySchedule.length > 0 ? (
                                        <div className="space-y-0 pl-4 border-l-2 border-slate-200 dark:border-slate-800 ml-3">
                                            {todaySchedule.map((item, index) => {
                                                const now = currentTime;
                                                const [startH, startM] = item.start_time.split(':').map(Number);
                                                const [endH, endM] = item.end_time.split(':').map(Number);
                                                const startTime = new Date(now); startTime.setHours(startH, startM, 0, 0);
                                                const endTime = new Date(now); endTime.setHours(endH, endM, 0, 0);
                                                const isPast = now > endTime;
                                                const isCurrent = now >= startTime && now <= endTime;

                                                return (
                                                    <div key={item.id} className="relative pl-8 pb-8 last:pb-0 group">
                                                        {/* Timeline Dot */}
                                                        <div className={`absolute -left-[9px] top-0 w-4 h-4 rounded-full border-2 transition-all duration-500 ${isCurrent ? 'bg-indigo-500 border-indigo-200 dark:border-indigo-900 shadow-[0_0_0_4px_rgba(99,102,241,0.2)] scale-110' : 'bg-slate-200 dark:bg-slate-800 border-white dark:border-slate-900'}`}></div>

                                                        {/* Schedule Card */}
                                                        <div className={`
                                                            p-4 rounded-2xl border transition-all duration-300
                                                            ${isCurrent
                                                                ? 'bg-indigo-50/50 dark:bg-indigo-500/10 border-indigo-200 dark:border-indigo-500/30 shadow-lg shadow-indigo-500/10 transform scale-[1.02]'
                                                                : 'bg-white/50 dark:bg-white/5 border-slate-100 dark:border-white/5 hover:bg-white dark:hover:bg-white/10'}
                                                            ${isPast ? 'opacity-60 grayscale' : ''}
                                                        `}>
                                                            <div className="flex justify-between items-start mb-2">
                                                                <div>
                                                                    <span className={`text-[10px] font-bold px-2 py-1 rounded-lg mb-2 inline-block tracking-wide ${isCurrent ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-500/20 dark:text-indigo-300' : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'}`}>
                                                                        {item.start_time.slice(0, 5)} - {item.end_time.slice(0, 5)}
                                                                    </span>
                                                                    <h4 className="font-bold text-base text-slate-900 dark:text-white">{item.subject}</h4>
                                                                </div>
                                                                {isCurrent && (
                                                                    <span className="flex h-3 w-3 relative">
                                                                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
                                                                        <span className="relative inline-flex rounded-full h-3 w-3 bg-indigo-500"></span>
                                                                    </span>
                                                                )}
                                                            </div>
                                                            <p className="text-sm text-slate-600 dark:text-slate-400 mb-3 flex items-center gap-2">
                                                                <UsersIcon className="w-4 h-4 text-slate-400" />
                                                                {item.className}
                                                            </p>
                                                            <div className="flex items-center gap-3 text-xs text-slate-500 dark:text-slate-500 border-t border-slate-100 dark:border-white/5 pt-3">
                                                                <div className="flex items-center gap-1.5">
                                                                    <ClockIcon className="w-3.5 h-3.5" />
                                                                    <span>{Math.round((endTime.getTime() - startTime.getTime()) / 60000)} menit</span>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    ) : (
                                        <div className="flex flex-col items-center justify-center py-20 text-center text-slate-400 dark:text-slate-500">
                                            <div className="w-24 h-24 bg-slate-100 dark:bg-slate-800/50 rounded-full flex items-center justify-center mb-6 animate-pulse">
                                                <CalendarIcon className="w-10 h-10 opacity-30" />
                                            </div>
                                            <p className="font-medium text-lg">Tidak ada jadwal hari ini.</p>
                                            <p className="text-sm mt-1 opacity-70">Nikmati waktu luang Anda!</p>
                                        </div>
                                    )}
                                </div>
                            </TabsContent>
                            <TabsContent value="tasks" className="flex-1 overflow-y-auto p-0 m-0 custom-scrollbar">
                                <div className="p-6 space-y-4">
                                    {tasks.length > 0 ? tasks.slice(0, 10).map(task => (
                                        <div key={task.id} className="p-4 bg-white dark:bg-white/5 border border-slate-100 dark:border-white/5 rounded-2xl hover:shadow-lg hover:shadow-amber-500/5 transition-all group cursor-pointer">
                                            <div className="flex items-start justify-between">
                                                <div>
                                                    <p className="font-semibold text-slate-800 dark:text-white line-clamp-1 group-hover:text-amber-500 transition-colors">{task.title}</p>
                                                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1.5 flex items-center gap-1.5">
                                                        <ClockIcon className="w-3.5 h-3.5" />
                                                        Jatuh tempo: {task.due_date ? new Date(task.due_date).toLocaleDateString('id-ID') : 'Tidak ada'}
                                                    </p>
                                                </div>
                                                <div className={`w-2.5 h-2.5 rounded-full mt-1.5 ${task.due_date && new Date(task.due_date) < new Date() ? 'bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.5)]' : 'bg-blue-500 shadow-[0_0_10px_rgba(59,130,246,0.5)]'}`}></div>
                                            </div>
                                        </div>
                                    )) : (
                                        <div className="flex flex-col items-center justify-center py-20 text-center text-slate-400 dark:text-slate-500">
                                            <BookOpenIcon className="w-16 h-16 mb-4 opacity-30" />
                                            <p className="font-medium">Tidak ada tugas aktif.</p>
                                        </div>
                                    )}
                                </div>
                                <div className="p-4 border-t border-slate-200/50 dark:border-white/5 bg-slate-50/50 dark:bg-white/5 backdrop-blur-md">
                                    <Button variant="outline" size="sm" onClick={() => navigate('/tugas')} className="w-full border-slate-200 dark:border-slate-700 hover:bg-white dark:hover:bg-slate-800 rounded-xl">Lihat Semua Tugas</Button>
                                </div>
                            </TabsContent>
                        </Tabs>
                    </div>

                    {/* Parent Messages Widget */}
                    <ParentMessagesWidget />
                </div>
            </div>

            {/* Speed Dial FAB */}
            <div className="fixed bottom-24 right-4 lg:bottom-10 lg:right-10 z-50 flex flex-col items-end gap-4 pointer-events-none">
                <div className={`flex flex-col gap-3 transition-all duration-300 ${isFabOpen ? 'opacity-100 translate-y-0 pointer-events-auto' : 'opacity-0 translate-y-10 pointer-events-none'}`}>
                    <Link
                        to="/jadwal"
                        className="flex items-center gap-3 pr-1 group"
                    >
                        <span className="bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 px-4 py-2 rounded-xl shadow-lg shadow-black/10 text-sm font-bold opacity-0 group-hover:opacity-100 transition-all transform translate-x-4 group-hover:translate-x-0">
                            Jadwal
                        </span>
                        <div className="w-12 h-12 rounded-2xl bg-white dark:bg-slate-800 text-amber-500 shadow-xl flex items-center justify-center hover:scale-110 transition-transform border border-slate-100 dark:border-slate-700">
                            <CalendarIcon className="w-6 h-6" />
                        </div>
                    </Link>
                    <button
                        onClick={() => (window as any).toggleSearch?.()}
                        className="flex items-center gap-3 pr-1 group"
                    >
                        <span className="bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 px-4 py-2 rounded-xl shadow-lg shadow-black/10 text-sm font-bold opacity-0 group-hover:opacity-100 transition-all transform translate-x-4 group-hover:translate-x-0">
                            Cari
                        </span>
                        <div className="w-12 h-12 rounded-2xl bg-white dark:bg-slate-800 text-sky-500 shadow-xl flex items-center justify-center hover:scale-110 transition-transform border border-slate-100 dark:border-slate-700">
                            <SearchIcon className="w-6 h-6" />
                        </div>
                    </button>
                    <button
                        onClick={() => (window as any).toggleAiChat?.()}
                        className="flex items-center gap-3 pr-1 group"
                    >
                        <span className="bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 px-4 py-2 rounded-xl shadow-lg shadow-black/10 text-sm font-bold opacity-0 group-hover:opacity-100 transition-all transform translate-x-4 group-hover:translate-x-0">
                            AI Chat
                        </span>
                        <div className="w-12 h-12 rounded-2xl bg-white dark:bg-slate-800 text-purple-500 shadow-xl flex items-center justify-center hover:scale-110 transition-transform border border-slate-100 dark:border-slate-700">
                            <BrainCircuitIcon className="w-6 h-6" />
                        </div>
                    </button>
                    <Link
                        to="/pengaturan"
                        className="flex items-center gap-3 pr-1 group"
                    >
                        <span className="bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 px-4 py-2 rounded-xl shadow-lg shadow-black/10 text-sm font-bold opacity-0 group-hover:opacity-100 transition-all transform translate-x-4 group-hover:translate-x-0">
                            Pengaturan
                        </span>
                        <div className="w-12 h-12 rounded-2xl bg-white dark:bg-slate-800 text-slate-500 shadow-xl flex items-center justify-center hover:scale-110 transition-transform border border-slate-100 dark:border-slate-700">
                            <SettingsIcon className="w-6 h-6" />
                        </div>
                    </Link>
                </div>
                <FloatingActionButton
                    onClick={() => setIsFabOpen(!isFabOpen)}
                    icon={isFabOpen ? <PlusIcon className="w-7 h-7 rotate-45 transition-transform duration-300" /> : <PlusIcon className="w-7 h-7 transition-transform duration-300" />}
                    className={`pointer-events-auto transition-all duration-300 ${isFabOpen ? 'bg-red-500 hover:bg-red-600 dark:bg-red-600 shadow-red-500/30 rotate-90' : 'bg-indigo-600 hover:bg-indigo-700 shadow-indigo-500/30'}`}
                    position="bottom-right"
                    offset={{ bottom: 0, right: 0 }}
                    size={64}
                />
            </div>
        </div>
    );
};

export default DashboardPage;