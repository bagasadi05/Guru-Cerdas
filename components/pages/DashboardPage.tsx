import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { useScheduleNotifications } from '../../hooks/useScheduleNotifications';
import { Card, CardHeader, CardTitle, CardContent, CardFooter, CardDescription } from '../ui/Card';
import { Link, useNavigate } from 'react-router-dom';
import { CalendarIcon, UsersIcon, BookOpenIcon, ClockIcon, BrainCircuitIcon, CheckSquareIcon, AlertTriangleIcon, CheckCircleIcon, UserMinusIcon, ChevronRightIcon, ClipboardPenIcon, PlusIcon, SearchIcon, SettingsIcon, SparklesIcon } from '../Icons';
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

const AiDashboardInsight: React.FC<{ dashboardData: DashboardQueryData | null }> = ({ dashboardData }) => {
    const [insight, setInsight] = useState<AiInsight | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

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
            setInsight(enrichedInsight);
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
            <div className="text-center py-4">
                <Button onClick={generateInsight} disabled={isLoading || !dashboardData}>
                    <SparklesIcon className="w-4 h-4 mr-2" />
                    Buat Wawasan Harian dengan AI
                </Button>
                <p className="text-xs text-gray-400 mt-2">Dapatkan ringkasan performa kelas hari ini.</p>
            </div>
        );
    }

    return (
        <div className="space-y-4 text-sm">
            {insight.positive_highlights?.length > 0 && (
                <div className="flex items-start gap-3">
                    <div className="flex-shrink-0 w-8 h-8 rounded-full bg-green-500/20 flex items-center justify-center"><CheckCircleIcon className="w-5 h-5 text-green-400" /></div>
                    <div><p className="font-bold text-gray-900 dark:text-gray-200">Siswa Berprestasi</p>
                        {insight.positive_highlights.map(item => (
                            <p key={item.student_name} className="text-gray-600 dark:text-gray-400">
                                <Link to={`/siswa/${item.student_id}`} className="font-semibold text-green-600 dark:text-green-400 hover:underline">{item.student_name}</Link>: {item.reason}
                            </p>
                        ))}
                    </div>
                </div>
            )}
            {insight.areas_for_attention?.length > 0 && (
                <div className="flex items-start gap-3">
                    <div className="flex-shrink-0 w-8 h-8 rounded-full bg-yellow-500/20 flex items-center justify-center"><AlertTriangleIcon className="w-5 h-5 text-yellow-400" /></div>
                    <div><p className="font-bold text-gray-900 dark:text-gray-200">Perlu Perhatian</p>
                        {insight.areas_for_attention.map(item => (
                            <p key={item.student_name} className="text-gray-600 dark:text-gray-400">
                                <Link to={`/siswa/${item.student_id}`} className="font-semibold text-yellow-600 dark:text-yellow-400 hover:underline">{item.student_name}</Link>: {item.reason}
                            </p>
                        ))}
                    </div>
                </div>
            )}
            {insight.class_focus_suggestion && (
                <div className="flex items-start gap-3">
                    <div className="flex-shrink-0 w-8 h-8 rounded-full bg-blue-500/20 flex items-center justify-center"><SparklesIcon className="w-5 h-5 text-blue-400" /></div>
                    <div><p className="font-bold text-gray-900 dark:text-gray-200">Saran Hari Ini</p><p className="text-gray-600 dark:text-gray-400">{insight.class_focus_suggestion}</p></div>
                </div>
            )}
        </div>
    );
};

const WeeklyAttendanceChart: React.FC<{ data: WeeklyAttendance[] }> = ({ data }) => {
    const [hoveredIndex, setHoveredIndex] = React.useState<number | null>(null);
    const chartHeight = 150;
    const barWidth = 30;
    const gap = 20;

    return (
        <div className="w-full h-full flex justify-center items-end">
            <svg width="100%" height={chartHeight} aria-label="Grafik absensi mingguan">
                <defs>
                    <linearGradient id="barGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" className="text-sky-500 dark:text-purple-500" stopColor="currentColor" />
                        <stop offset="100%" className="text-sky-700 dark:text-blue-500" stopColor="currentColor" />
                    </linearGradient>
                </defs>
                {data.map((day, index) => {
                    const barHeight = day.present_percentage > 0 ? (day.present_percentage / 100) * (chartHeight - 50) : 5; // Reserve 50px for labels and tooltip
                    const x = index * (barWidth + gap) + (gap * 2);
                    const y = chartHeight - barHeight - 20;

                    return (
                        <g key={day.day}
                            onMouseEnter={() => setHoveredIndex(index)}
                            onMouseLeave={() => setHoveredIndex(null)}
                            className="cursor-pointer group">
                            <rect
                                x={x}
                                y={y}
                                width={barWidth}
                                height={barHeight}
                                fill="url(#barGradient)"
                                rx="4"
                                className="transition-transform duration-300 animate-grow-bar group-hover:scale-y-105"
                                style={{ transformOrigin: 'bottom', animationDelay: `${index * 100}ms` }}
                            />
                            <text
                                x={x + barWidth / 2}
                                y={chartHeight - 5}
                                textAnchor="middle"
                                fontSize="12"
                                className="font-semibold fill-gray-500 dark:fill-gray-400"
                            >
                                {day.day.slice(0, 3)}
                            </text>
                            {hoveredIndex === index && (
                                <g className="transition-opacity duration-300 animate-fade-in" style={{ opacity: 1 }}>
                                    <rect x={x - 10} y={y - 28} width={barWidth + 20} height={22} rx="5" className="fill-gray-800 dark:fill-gray-900 stroke-gray-500 dark:stroke-purple-400/50" />
                                    <text
                                        x={x + barWidth / 2}
                                        y={y - 14}
                                        textAnchor="middle"
                                        fontSize="12"
                                        fontWeight="bold"
                                        fill="#fff"
                                    >
                                        {Math.round(day.present_percentage)}%
                                    </text>
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

        // If a class is selected, only consider assessments relevant to that class
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
                // If filtering by class, only include records from students in that class
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
        // Reset assessment selection when subject changes, but don't auto-select the first one anymore
        // to allow "Semua Penilaian" state.
        setAssessmentForCompletionCheck('');
    }, [subjectForCompletionCheck]);

    const handleSubjectChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        setSubjectForCompletionCheck(e.target.value);
        setAssessmentForCompletionCheck(''); // Reset when subject changes
    };

    const studentsMissingGrade = useMemo(() => {
        if (!subjectForCompletionCheck || !data?.students || !data?.academicRecords || !data?.classes) return [];

        const classMap = new Map((data.classes || []).map(c => [c.id, c.name]));

        // Filter students based on selected class (if any)
        let targetStudents = data.students;
        if (selectedClassForCheck) {
            targetStudents = targetStudents.filter(s => s.class_id === selectedClassForCheck);
        }

        // If specific assessment is selected
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
            // If "Semua Penilaian" (empty assessment) is selected
            // We want to find students who are missing ANY of the assessments available for this subject
            // Note: This checks against `uniqueAssessmentsForSubject` which is already filtered by class if selected.

            if (uniqueAssessmentsForSubject.length === 0) return []; // No assessments to check against

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

        // If specific class is selected, use it. Otherwise try to guess from first missing student or leave empty.
        let classIdToPass = selectedClassForCheck;
        if (!classIdToPass && studentsMissingGrade.length > 0) {
            classIdToPass = studentsMissingGrade[0].class_id;
        }

        // Use selected assessment or the first missing one from the first student if available
        let assessmentToPass = assessmentForCompletionCheck;
        if (!assessmentToPass && studentsMissingGrade.length > 0 && 'missingAssessments' in studentsMissingGrade[0]) {
            // @ts-ignore - we know it exists based on the check above
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
        { label: 'Total Siswa', value: students.length, icon: UsersIcon, link: '/siswa', color: 'from-sky-500 to-blue-500', darkColor: 'dark:from-sky-500 dark:to-blue-500', description: `${classes.length} kelas` },
        { label: 'Kehadiran', value: `${attendancePercentage}%`, subValue: `${dailyAttendanceSummary?.present || 0}/${students.length}`, icon: CheckSquareIcon, link: '/absensi', color: 'from-emerald-500 to-green-500', darkColor: 'dark:from-emerald-500 dark:to-green-500', description: 'siswa hadir' },
        { label: 'Tugas Aktif', value: tasks.length, icon: BookOpenIcon, link: '/tugas', color: 'from-amber-500 to-yellow-500', darkColor: 'dark:from-amber-500 dark:to-yellow-500', description: 'tugas' },
        { label: 'Jadwal', value: schedule.length, icon: CalendarIcon, link: '/jadwal', color: 'from-violet-500 to-purple-500', darkColor: 'dark:from-violet-500 dark:to-purple-500', description: nextClassIndex >= 0 ? `Next: ${schedule[nextClassIndex]?.subject.slice(0, 8)}...` : 'Selesai' }
    ];



    return (
        <div className="w-full min-h-full p-3 sm:p-4 md:p-6 lg:p-8 flex flex-col space-y-4 sm:space-y-6 md:space-y-8 bg-transparent max-w-7xl mx-auto pb-24 lg:pb-8">
            <header className="flex items-center justify-between h-16 px-1">
                <div>
                    <h1 className="text-xl font-bold text-gray-900 dark:text-white">Dashboard</h1>
                    <p className="text-sm text-gray-500 dark:text-gray-400">{new Date().toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long' })}</p>
                </div>
            </header>

            <div className="grid grid-cols-1 xl:grid-cols-5 gap-4 sm:gap-6 md:gap-8">
                {/* Left Column */}
                <div className="xl:col-span-3 space-y-4 sm:space-y-6 md:space-y-8">
                    {/* Stats Grid - Responsive: 2 cols mobile, 4 cols tablet+ */}
                    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4">
                        {stats.map(stat => (
                            <Link to={stat.link} key={stat.label} className="group block h-full">
                                <Card className="px-4 py-3 h-full flex flex-col justify-between group-hover:-translate-y-1 card-shine-hover overflow-hidden relative min-h-[96px]">
                                    <div className="flex items-start justify-between mb-2">
                                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center bg-gradient-to-br ${stat.color} ${stat.darkColor} shadow-md text-white`}>
                                            <stat.icon className="w-5 h-5" />
                                        </div>
                                        {stat.subValue && <span className="text-[10px] font-medium bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded-full text-gray-600 dark:text-gray-300">{stat.subValue}</span>}
                                    </div>
                                    <div>
                                        <p className="text-2xl font-bold text-gray-900 dark:text-white leading-none mb-1">{stat.value}</p>
                                        <p className="text-sm text-gray-600 dark:text-gray-300 font-medium truncate">{stat.label}</p>
                                    </div>
                                </Card>
                            </Link>
                        ))}
                    </div>

                    {/* Quick Actions Trigger */}


                    <Card className="animate-pulse-border-glow border-purple-500/50 bg-gradient-to-br from-white/5 to-transparent dark:from-slate-900/80 dark:to-slate-900/50">
                        <CardHeader><CardTitle className="flex items-center gap-3"><BrainCircuitIcon className="w-6 h-6 text-sky-500 dark:text-purple-400" />Wawasan Harian AI</CardTitle></CardHeader>
                        <CardContent><AiDashboardInsight dashboardData={data || null} /></CardContent>
                    </Card>

                    <Card>
                        <CardHeader><CardTitle>Absensi Mingguan</CardTitle><CardDescription>Persentase kehadiran selama 5 hari terakhir.</CardDescription></CardHeader>
                        <CardContent className="h-[180px] p-2">
                            <WeeklyAttendanceChart data={weeklyAttendance} />
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-3">
                                <UserMinusIcon className="w-6 h-6 text-sky-500 dark:text-purple-400" />
                                Pemeriksa Kelengkapan Nilai
                            </CardTitle>
                            <CardDescription>
                                Lihat siswa yang belum memiliki nilai untuk penilaian tertentu.
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-4 mb-4">
                                <Select value={selectedClassForCheck} onChange={(e) => setSelectedClassForCheck(e.target.value)}>
                                    <option value="">Semua Kelas</option>
                                    {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                </Select>
                                <div className="flex flex-col sm:flex-row gap-4">
                                    <Select value={subjectForCompletionCheck} onChange={handleSubjectChange} className="flex-1">
                                        <option value="" disabled>Pilih Mata Pelajaran</option>
                                        {uniqueSubjects.map((subject) => (
                                            <option key={subject} value={subject}>{subject}</option>
                                        ))}
                                    </Select>
                                    <Select value={assessmentForCompletionCheck} onChange={(e) => setAssessmentForCompletionCheck(e.target.value)} className="flex-1" disabled={uniqueAssessmentsForSubject.length === 0}>
                                        <option value="">Semua Penilaian</option>
                                        {uniqueAssessmentsForSubject.map((assessment) => (
                                            <option key={assessment} value={assessment}>{assessment}</option>
                                        ))}
                                    </Select>
                                </div>
                            </div>

                            {subjectForCompletionCheck && (
                                <div className="mb-4">
                                    <div className="flex justify-between text-xs mb-1">
                                        <span className="text-gray-500 dark:text-gray-400">Progres Kelengkapan ({totalStudentsForCheck - studentsMissingGrade.length}/{totalStudentsForCheck})</span>
                                        <span className={`font-bold ${completionPercentage === 100 ? 'text-green-500' : 'text-blue-500'}`}>{completionPercentage}%</span>
                                    </div>
                                    <div className="w-full bg-gray-200 rounded-full h-2 dark:bg-gray-700 overflow-hidden">
                                        <div className={`h-2 rounded-full transition-all duration-500 ${completionPercentage === 100 ? 'bg-green-500' : 'bg-blue-500'}`} style={{ width: `${completionPercentage}%` }}></div>
                                    </div>
                                </div>
                            )}

                            <div className="max-h-64 overflow-y-auto space-y-1 pr-2">
                                {subjectForCompletionCheck ? (
                                    studentsMissingGrade.length > 0 ? (
                                        <>
                                            <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-2 px-1">
                                                {studentsMissingGrade.length} SISWA BELUM DINILAI:
                                            </p>
                                            {studentsMissingGrade.map(student => (
                                                <div key={student.id} onClick={() => handleNavigateToStudent(student.id)} className="flex items-center gap-3 p-2 rounded-lg cursor-pointer hover:bg-gray-100 dark:hover:bg-white/5 transition-colors">
                                                    <img src={student.avatar_url} alt={student.name} className="w-9 h-9 rounded-full object-cover" />
                                                    <div>
                                                        <span className="font-medium text-gray-700 dark:text-gray-300">{student.name}</span>
                                                        <p className="text-xs text-gray-500 dark:text-gray-400">
                                                            {'missingAssessments' in student
                                                                ? `Kurang: ${(student as any).missingAssessments.join(', ')}`
                                                                : `Kelas ${student.className}`
                                                            }
                                                        </p>
                                                    </div>
                                                    <ChevronRightIcon className="w-5 h-5 ml-auto text-gray-400" />
                                                </div>
                                            ))}
                                        </>
                                    ) : (
                                        <div className="flex flex-col items-center justify-center text-center py-8 bg-green-500/5 dark:bg-green-500/10 rounded-lg animate-fade-in">
                                            <div className="w-16 h-16 bg-green-100 dark:bg-green-500/20 rounded-full flex items-center justify-center mb-4">
                                                <CheckCircleIcon className="w-10 h-10 text-green-600 dark:text-green-400" />
                                            </div>
                                            <p className="font-bold text-lg text-green-700 dark:text-green-300">Semua Siswa Lengkap!</p>
                                            <p className="text-sm text-green-600 dark:text-green-400">Kerja bagus, nilai untuk penilaian ini sudah lengkap.</p>
                                        </div>
                                    )
                                ) : (
                                    <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                                        <ClipboardPenIcon className="w-12 h-12 mx-auto mb-3 text-gray-400 dark:text-gray-500" />
                                        <p className="font-semibold">Pilih Mata Pelajaran & Penilaian</p>
                                        <p className="text-sm">Pilih subjek dan penilaian di atas untuk melihat siapa saja yang masih memerlukan nilai.</p>
                                    </div>
                                )}
                            </div>

                            {studentsMissingGrade.length > 0 && subjectForCompletionCheck && (
                                <div className="mt-4 pt-4 border-t border-gray-200 dark:border-white/10">
                                    <Button onClick={handleOpenMassInput} className="w-full" size="sm">
                                        <ClipboardPenIcon className="w-4 h-4 mr-2" />
                                        Lengkapi via Input Massal
                                    </Button>
                                    <p className="text-xs text-center text-gray-400 mt-2">
                                        {selectedClassForCheck ? 'Buka halaman input untuk kelas ini.' : 'Buka halaman input (pilih kelas otomatis).'}
                                    </p>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </div>

                {/* Right Column */}
                <div className="xl:col-span-2 space-y-8">
                    <Card className="h-full max-h-[700px] flex flex-col">
                        <Tabs defaultValue="schedule" className="w-full flex flex-col h-full">
                            <TabsList className="m-4 self-center">
                                <TabsTrigger value="schedule">Jadwal Hari Ini</TabsTrigger>
                                <TabsTrigger value="tasks">Tugas Mendatang</TabsTrigger>
                            </TabsList>
                            <TabsContent value="schedule" className="flex-1 overflow-y-auto px-6 pb-6">
                                <div className="relative space-y-3">
                                    {todaySchedule.length > 0 ? (
                                        <div className="space-y-4 pl-2">
                                            {todaySchedule.map((item, index) => {
                                                const now = currentTime;
                                                const [startH, startM] = item.start_time.split(':').map(Number);
                                                const [endH, endM] = item.end_time.split(':').map(Number);
                                                const startTime = new Date(now); startTime.setHours(startH, startM, 0, 0);
                                                const endTime = new Date(now); endTime.setHours(endH, endM, 0, 0);
                                                const isPast = now > endTime;
                                                const isCurrent = now >= startTime && now <= endTime;

                                                return (
                                                    <div key={item.id} className="relative flex gap-4 items-start group">
                                                        {/* Timeline Line */}
                                                        {index < todaySchedule.length - 1 && (
                                                            <div className="absolute left-8 top-10 bottom-[-20px] w-0.5 bg-gray-200 dark:bg-gray-800 group-last:hidden" />
                                                        )}

                                                        {/* Time Badge */}
                                                        <div className="flex-shrink-0 w-16 pt-1 z-10">
                                                            <div className={`
                                                                rounded-lg px-2 py-1.5 text-center border
                                                                ${isCurrent
                                                                    ? 'bg-sky-100 border-sky-200 text-sky-700 dark:bg-sky-900/30 dark:border-sky-800 dark:text-sky-300'
                                                                    : 'bg-gray-50 border-gray-100 text-gray-600 dark:bg-gray-900 dark:border-gray-800 dark:text-gray-400'}
                                                            `}>
                                                                <time className="text-xs font-bold block">
                                                                    {item.start_time.slice(0, 5)}
                                                                </time>
                                                                <span className="text-[10px] opacity-80">
                                                                    {item.end_time.slice(0, 5)}
                                                                </span>
                                                            </div>
                                                        </div>

                                                        {/* Schedule Card */}
                                                        <Card className={`
                                                            flex-1 p-4 transition-all duration-200 min-h-[72px]
                                                            ${isCurrent ? 'ring-2 ring-sky-500 shadow-md' : 'hover:bg-gray-50 dark:hover:bg-gray-900'}
                                                            ${isPast ? 'opacity-60' : ''}
                                                        `}>
                                                            <div className="flex justify-between items-start mb-1">
                                                                <h4 className="font-bold text-base text-gray-900 dark:text-white">{item.subject}</h4>
                                                                {isCurrent && (
                                                                    <span className="flex h-2 w-2">
                                                                        <span className="animate-ping absolute inline-flex h-2 w-2 rounded-full bg-sky-400 opacity-75"></span>
                                                                        <span className="relative inline-flex rounded-full h-2 w-2 bg-sky-500"></span>
                                                                    </span>
                                                                )}
                                                            </div>
                                                            <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">{item.className}</p>
                                                            <div className="flex items-center gap-3 text-xs text-gray-500 dark:text-gray-500">
                                                                <div className="flex items-center gap-1">
                                                                    <ClockIcon className="w-3.5 h-3.5" />
                                                                    <span>{Math.round((endTime.getTime() - startTime.getTime()) / 60000)} menit</span>
                                                                </div>
                                                            </div>
                                                        </Card>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    ) : (
                                        <div className="flex flex-col items-center justify-center py-12 text-center text-gray-500 dark:text-gray-400">
                                            <CalendarIcon className="w-12 h-12 mb-3 opacity-20" />
                                            <p>Tidak ada jadwal hari ini.</p>
                                        </div>
                                    )}
                                </div>
                            </TabsContent>
                            <TabsContent value="tasks" className="flex-1 overflow-y-auto px-6 pb-6">
                                <div className="space-y-3">
                                    {tasks.length > 0 ? tasks.slice(0, 10).map(task => (
                                        <div key={task.id} className="p-3 bg-gray-100 dark:bg-black/20 rounded-lg">
                                            <p className="font-semibold text-gray-900 dark:text-white">{task.title}</p>
                                            <p className="text-xs text-gray-500 dark:text-gray-400">Jatuh tempo: {task.due_date ? new Date(task.due_date).toLocaleDateString('id-ID') : 'Tidak ada'}</p>
                                        </div>
                                    )) : <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-4">Tidak ada tugas aktif.</p>}
                                </div>
                                <div className="mt-4"><Button variant="outline" size="sm" onClick={() => navigate('/tugas')} className="w-full">Lihat Semua Tugas</Button></div>
                            </TabsContent>
                        </Tabs>
                    </Card>
                </div>
            </div>

            {/* Speed Dial FAB */}
            <div className="fixed bottom-20 right-4 lg:bottom-8 lg:right-8 z-40 flex flex-col items-end gap-3">
                {isFabOpen && (
                    <div className="flex flex-col gap-3 animate-fade-in-up">
                        <Link
                            to="/jadwal"
                            className="flex items-center gap-3 pr-1 group"
                        >
                            <span className="bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 px-3 py-1.5 rounded-lg shadow-md text-sm font-medium opacity-0 group-hover:opacity-100 transition-opacity">
                                Jadwal
                            </span>
                            <div className="w-12 h-12 rounded-full bg-white dark:bg-gray-800 text-orange-600 dark:text-orange-400 shadow-lg flex items-center justify-center hover:scale-110 transition-transform">
                                <CalendarIcon className="w-5 h-5" />
                            </div>
                        </Link>
                        <button
                            onClick={() => (window as any).toggleSearch?.()}
                            className="flex items-center gap-3 pr-1 group"
                        >
                            <span className="bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 px-3 py-1.5 rounded-lg shadow-md text-sm font-medium opacity-0 group-hover:opacity-100 transition-opacity">
                                Cari
                            </span>
                            <div className="w-12 h-12 rounded-full bg-white dark:bg-gray-800 text-sky-600 dark:text-sky-400 shadow-lg flex items-center justify-center hover:scale-110 transition-transform">
                                <SearchIcon className="w-5 h-5" />
                            </div>
                        </button>
                        <button
                            onClick={() => (window as any).toggleAiChat?.()}
                            className="flex items-center gap-3 pr-1 group"
                        >
                            <span className="bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 px-3 py-1.5 rounded-lg shadow-md text-sm font-medium opacity-0 group-hover:opacity-100 transition-opacity">
                                AI Chat
                            </span>
                            <div className="w-12 h-12 rounded-full bg-white dark:bg-gray-800 text-purple-600 dark:text-purple-400 shadow-lg flex items-center justify-center hover:scale-110 transition-transform">
                                <BrainCircuitIcon className="w-5 h-5" />
                            </div>
                        </button>
                        <Link
                            to="/pengaturan"
                            className="flex items-center gap-3 pr-1 group"
                        >
                            <span className="bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 px-3 py-1.5 rounded-lg shadow-md text-sm font-medium opacity-0 group-hover:opacity-100 transition-opacity">
                                Pengaturan
                            </span>
                            <div className="w-12 h-12 rounded-full bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-400 shadow-lg flex items-center justify-center hover:scale-110 transition-transform">
                                <SettingsIcon className="w-5 h-5" />
                            </div>
                        </Link>
                    </div>
                )}
                <FloatingActionButton
                    onClick={() => setIsFabOpen(!isFabOpen)}
                    icon={isFabOpen ? <PlusIcon className="w-6 h-6 rotate-45 transition-transform" /> : <PlusIcon className="w-6 h-6 transition-transform" />}
                    className={isFabOpen ? 'bg-red-500 hover:bg-red-600 dark:bg-red-600' : ''}
                    position="bottom-right"
                    offset={{ bottom: 0, right: 0 }}
                />
            </div>

            {/* Quick Actions Bottom Sheet */}

        </div>
    );
};

export default DashboardPage;