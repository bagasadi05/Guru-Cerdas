import React, { useState, useEffect, useMemo } from 'react';
 
import { useAuth } from '../../hooks/useAuth';
import { useScheduleNotifications } from '../../hooks/useScheduleNotifications';
import { useDashboardData } from '../../hooks/useDashboardData';
import { Link, useNavigate } from 'react-router-dom';
import {
    CalendarIcon,
    AlertTriangleIcon,
    UserMinusIcon,
    ClipboardPenIcon,
    CheckCircleIcon,
    UsersIcon,
    ClockIcon,
    BookOpenIcon,
    SearchIcon,
    BrainCircuitIcon,
    SettingsIcon,
    PlusIcon
} from '../Icons';
import { Button } from '../ui/Button';
import { WelcomeEmptyState } from '../EmptyStates';
import { AIInsightWidget } from '../dashboard/AIInsightWidget';
import StatsGrid from '../dashboard/StatsGrid';
import { QuickActionCards } from '../dashboard/QuickActionCards';
import DashboardPageSkeleton from '../skeletons/DashboardPageSkeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/Tabs';
import { Select } from '../ui/Select';
import FloatingActionButton from '../ui/FloatingActionButton';
import AttendanceStatsWidget from '../dashboard/AttendanceStatsWidget';
import ParentMessagesWidget from '../dashboard/ParentMessagesWidget';
import { ClassAnalyticsSection } from '../dashboard/ClassAnalyticsSection';
import { LeaderboardCard } from '../gamification/LeaderboardCard';

import ActivityFeedWidget from '../dashboard/ActivityFeedWidget';
import { transformToGameData } from '../../services/gamificationService';
import { Reminder } from '../dashboard/SmartReminders';
import { ActivityItem } from '../dashboard/RecentActivityTimeline';
import { ErrorState } from '../ui/ErrorState';

// ==========================================
// CLIENT-SIDE HELPERS (Restored)
// ==========================================

const isDateOnly = (value: string) => /^\d{4}-\d{2}-\d{2}$/.test(value);

const parseDateOnly = (value: string) => {
    const [year, month, day] = value.split('-').map(Number);
    return new Date(year, month - 1, day);
};

const formatTaskDueDate = (dueDate: string) => {
    const date = isDateOnly(dueDate) ? parseDateOnly(dueDate) : new Date(dueDate);
    if (Number.isNaN(date.getTime())) return '-';
    // ID-ID locale format
    return date.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' });
};

const isTaskOverdue = (dueDate: string | null) => {
    if (!dueDate) return false;
    const now = new Date();
    if (isDateOnly(dueDate)) {
        const date = parseDateOnly(dueDate);
        // Compare with end of day
        const endOfDay = new Date(date.getFullYear(), date.getMonth(), date.getDate(), 23, 59, 59, 999);
        return endOfDay < now;
    }
    const parsed = new Date(dueDate);
    if (Number.isNaN(parsed.getTime())) return false;
    return parsed < now;
};

// ==========================================
// DASHBOARD PAGE
// ==========================================

const DashboardPage: React.FC = () => {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [currentTime, setCurrentTime] = useState(new Date());
    const [isFabOpen, setIsFabOpen] = useState(false);

    useEffect(() => {
        const timerId = setInterval(() => setCurrentTime(new Date()), 60000); // Update every minute
        return () => clearInterval(timerId);
    }, []);

    const { data, isLoading, isError, error, refetch, isRefetching: isFetching } = useDashboardData();
    const dashboardErrorMessage = error instanceof Error
        ? error.message
        : 'Gagal memuat data dashboard. Silakan coba lagi.';

    // Sync schedule with Service Worker for notifications
    useScheduleNotifications(data?.schedule || []);

    const [subjectForCompletionCheck, setSubjectForCompletionCheck] = useState('');
    const [assessmentForCompletionCheck, setAssessmentForCompletionCheck] = useState('');
    const [selectedClassForCheck, setSelectedClassForCheck] = useState<string>('');

    const uniqueSubjects = useMemo(() => {
        const academicRecords = data?.academicRecords;
        if (!academicRecords) return [];
        const subjects = new Set(academicRecords.map(r => r.subject));
        return Array.from(subjects).sort();
    }, [data]);

    const uniqueAssessmentsForSubject = useMemo(() => {
        const academicRecords = data?.academicRecords;
        const students = data?.students;
        if (!subjectForCompletionCheck || !academicRecords || !students) return [];

        let relevantStudentIds: Set<string> | null = null;
        if (selectedClassForCheck) {
            relevantStudentIds = new Set(
                students
                    .filter(s => s.class_id === selectedClassForCheck)
                    .map(s => s.id)
            );
        }

        const assessmentNames = academicRecords
            .filter(r => {
                if (r.subject !== subjectForCompletionCheck) return false;
                if (!r.assessment_name) return false;
                if (relevantStudentIds && !relevantStudentIds.has(r.student_id)) return false;
                return true;
            })
            .map(r => r.assessment_name!.trim());

        const uniqueAssessments = [...new Set(assessmentNames)].filter(Boolean);

        return uniqueAssessments.sort((a: string, b: string) => a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' }));
    }, [data, subjectForCompletionCheck, selectedClassForCheck]);

    // Set default subject when uniqueSubjects changes
    const defaultSubject = uniqueSubjects.length > 0 ? uniqueSubjects[0] : '';
    useEffect(() => {
        if (defaultSubject && !subjectForCompletionCheck) {
            const timer = setTimeout(() => {
                setSubjectForCompletionCheck(defaultSubject);
            }, 0);
            return () => clearTimeout(timer);
        }
    }, [defaultSubject, subjectForCompletionCheck]);

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
                    className: classMap.get(s.class_id ?? '') || 'N/A',
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
                    className: classMap.get(s.class_id ?? '') || 'N/A',
                    missingAssessments: missingAssessments
                };
            })
                .filter(s => s.missingAssessments.length > 0);
        }
    }, [subjectForCompletionCheck, assessmentForCompletionCheck, data, selectedClassForCheck, uniqueAssessmentsForSubject]);

    const totalStudentsForCheck = useMemo(() => {
        const students = data?.students;
        if (!students) return 0;
        if (selectedClassForCheck) {
            return students.filter(s => s.class_id === selectedClassForCheck).length;
        }
        return students.length;
    }, [data, selectedClassForCheck]);

    const completionPercentage = useMemo(() => {
        if (totalStudentsForCheck === 0) return 0;
        return Math.round(((totalStudentsForCheck - studentsMissingGrade.length) / totalStudentsForCheck) * 100);
    }, [totalStudentsForCheck, studentsMissingGrade.length]);

    const handleOpenMassInput = () => {
        if (!subjectForCompletionCheck) return;

        let classIdToPass: string | null = selectedClassForCheck || null;
        if (!classIdToPass && studentsMissingGrade.length > 0) {
            classIdToPass = studentsMissingGrade[0].class_id;
        }

        let assessmentToPass = assessmentForCompletionCheck;
        if (!assessmentToPass && studentsMissingGrade.length > 0 && 'missingAssessments' in studentsMissingGrade[0]) {
            const missingStudent = studentsMissingGrade[0] as { missingAssessments: string[] };
            assessmentToPass = missingStudent.missingAssessments[0] ?? '';
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

    // Generate smart reminders based on data
    const smartReminders: Reminder[] = useMemo(() => {
        if (!data) return [];
        const reminders: Reminder[] = [];

        // Check for unrecorded attendance today
        const { students = [], dailyAttendanceSummary } = data;
        const attendanceRecorded = dailyAttendanceSummary?.total || 0;
        if (students.length > 0 && attendanceRecorded < students.length) {
            reminders.push({
                id: 'attendance-incomplete',
                type: 'warning',
                title: 'Absensi Belum Lengkap',
                message: `${students.length - attendanceRecorded} siswa belum diabsen hari ini`,
                action: { label: 'Isi Sekarang', link: '/absensi' },
                dismissible: true,
            });
        }

        // Check for pending tasks
        const pendingTasks = data.tasks?.filter(t => t.status !== 'done').length || 0;
        if (pendingTasks > 5) {
            reminders.push({
                id: 'tasks-pending',
                type: 'info',
                title: `${pendingTasks} Tugas Pending`,
                message: 'Beberapa tugas belum diselesaikan',
                action: { label: 'Lihat Tugas', link: '/tugas' },
                dismissible: true,
            });
        }

        // Check for low attendance
        const attendancePercentage = students.length > 0
            ? Math.round((dailyAttendanceSummary?.present || 0) / students.length * 100)
            : 100;
        if (attendancePercentage < 70 && attendanceRecorded > 0) {
            reminders.push({
                id: 'low-attendance',
                type: 'urgent',
                title: 'Kehadiran Rendah!',
                message: `Hanya ${attendancePercentage}% siswa hadir hari ini`,
                action: { label: 'Cek Details', link: '/absensi' },
                dismissible: false,
            });
        }

        return reminders;
    }, [data]);

    // Generate recent activities from REAL data
    const recentActivities: ActivityItem[] = useMemo(() => {
        const activities: ActivityItem[] = [];

        // 1. Attendance activities from today
        if (data?.dailyAttendanceSummary?.total && data.dailyAttendanceSummary.total > 0) {
            const latestAttendance = data.todayAttendanceRecords?.[0];
            activities.push({
                id: 'activity-attendance-today',
                type: 'attendance',
                title: 'Absensi Tercatat',
                description: `${data.dailyAttendanceSummary.present} dari ${data.students?.length || 0} siswa hadir hari ini`,
                timestamp: latestAttendance?.created_at ? new Date(latestAttendance.created_at) : new Date(),
                link: '/absensi',
            });
        }

        // 2. Recent grades/academic records
        const recentGrades = data?.academicRecords?.slice(0, 3) || [];
        recentGrades.forEach((record, index) => {
            if (record.created_at) {
                activities.push({
                    id: `activity-grade-${index}`,
                    type: 'grade',
                    title: 'Nilai Diinput',
                    description: `${record.subject} - ${record.assessment_name || 'Penilaian'} (Skor: ${record.score})`,
                    timestamp: new Date(record.created_at),
                    link: '/analytics',
                });
            }
        });

        // 3. Recent tasks created
        const recentTasks = data?.recentTasks?.slice(0, 3) || [];
        recentTasks.forEach((task, index) => {
            if (task.created_at) {
                activities.push({
                    id: `activity-task-${index}`,
                    type: 'task',
                    title: task.status === 'done' ? 'Tugas Selesai' : 'Tugas Dibuat',
                    description: task.title,
                    timestamp: new Date(task.created_at),
                    link: '/tugas',
                });
            }
        });

        // Sort by timestamp (newest first) and limit to 5
        return activities
            .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
            .slice(0, 5);
    }, [data]);

    // Dismiss reminder handler
    const [dismissedReminders, setDismissedReminders] = useState<Set<string>>(new Set());
    const handleDismissReminder = (id: string) => {
        setDismissedReminders(prev => new Set([...prev, id]));
    };

    const activeReminders = smartReminders.filter(r => !dismissedReminders.has(r.id));

    if (isLoading) return <DashboardPageSkeleton />;

    if (isError && !data) {
        return (
            <div className="w-full min-h-full p-4 md:p-6 lg:p-8 flex flex-col space-y-6 bg-transparent max-w-7xl mx-auto pb-24 lg:pb-8 animate-fade-in-up">
                <ErrorState
                    message={dashboardErrorMessage}
                    onRetry={() => refetch()}
                    fullWidth
                />
            </div>
        );
    }

    const { students = [], tasks = [], schedule = [], classes = [], weeklyAttendance = [] } = data || {};
    const todaySchedule = schedule.map(item => ({ ...item, className: classes.find(c => c.id === item.class_id)?.name || item.class_id }));

    // Show welcome state for new users with no data
    if (!isLoading && data && students.length === 0 && classes.length === 0) {
        return (
            <div className="w-full min-h-full p-4 lg:p-8 flex items-center justify-center animate-fade-in-up">
                <WelcomeEmptyState
                    userName={user?.name}
                    onGetStarted={() => navigate('/siswa')}
                    onViewTutorial={() => window.open('https://docs.portal-guru.com/tutorial', '_blank')}
                />
            </div>
        );
    }

    return (
        <div className="w-full min-h-full p-4 md:p-6 lg:p-8 flex flex-col space-y-6 bg-transparent max-w-7xl mx-auto pb-24 lg:pb-8 animate-fade-in-up">
            {isError && (
                <div className="rounded-xl border border-red-200/60 dark:border-red-500/30 bg-red-50/60 dark:bg-red-500/10 px-4 py-3 shadow-sm">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                        <div className="flex items-start gap-3">
                            <div className="p-2 rounded-lg bg-red-100 dark:bg-red-500/20 text-red-600 dark:text-red-400">
                                <AlertTriangleIcon className="w-4 h-4" />
                            </div>
                            <div>
                                <p className="text-sm font-semibold text-red-700 dark:text-red-300">Gagal memuat data dashboard</p>
                                <p className="text-xs text-red-600/80 dark:text-red-400/80">{dashboardErrorMessage}</p>
                            </div>
                        </div>
                        <Button
                            onClick={() => refetch()}
                            disabled={isFetching}
                            variant="destructive"
                            size="sm"
                            className="self-start sm:self-auto"
                        >
                            {isFetching ? 'Memuat...' : 'Coba Lagi'}
                        </Button>
                    </div>
                </div>
            )}
            <header className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl md:text-3xl font-bold text-slate-900 dark:text-white tracking-tight">
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

            <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
                {/* Left Column */}
                <div className="xl:col-span-9 space-y-6">
                    {/* Stats Section */}
                    <section>
                        {data && (
                            <StatsGrid data={data} currentTime={currentTime} />
                        )}
                    </section>

                    {/* Operational Section */}
                    <section className="space-y-4">
                        <div className="flex items-center gap-2 mb-4 px-2">
                            <h2 className="text-xl font-semibold text-slate-900 dark:text-white flex items-center gap-2">
                                <span className="w-1.5 h-5 bg-emerald-500 rounded-full inline-block"></span>
                                Aksi Cepat & Wawasan
                            </h2>
                        </div>
                        <QuickActionCards
                            pendingGrades={studentsMissingGrade.length}
                            incompleteTasks={tasks.length}
                        />

                        {/* AI Insight Widget */}
                        <div className="bg-white dark:bg-slate-900 rounded-xl p-0 overflow-hidden border border-slate-200/60 dark:border-slate-700/60 shadow-sm">
                            <div className="p-4 border-b border-slate-200/60 dark:border-slate-700/60 bg-emerald-500/10">
                                <h3 className="flex items-center gap-2 font-semibold text-xl text-slate-900 dark:text-white">
                                    <BrainCircuitIcon className="w-5 h-5 text-emerald-500" />
                                    Analisis Cerdas Harian
                                </h3>
                                <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Wawasan berbasis AI untuk performa kelas Anda.</p>
                            </div>
                            <div className="p-4">
                                <AIInsightWidget dashboardData={data || null} userId={user?.id} />
                            </div>
                        </div>

                    </section>

                    {/* Analytics Section */}
                    <section className="space-y-6">
                        <div className="flex items-center gap-2 mb-4 px-2">
                            <h2 className="text-xl font-semibold text-slate-900 dark:text-white flex items-center gap-2">
                                <span className="w-1.5 h-5 bg-emerald-500 rounded-full inline-block"></span>
                                Analisis Penilaian & Kehadiran
                            </h2>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {/* Attendance Chart */}
                            <div className="flex flex-col">
                                <AttendanceStatsWidget
                                    weeklyData={weeklyAttendance}
                                />
                            </div>

                            {/* Grade Audit */}
                            <div className="bg-white dark:bg-slate-900 rounded-xl p-0 overflow-hidden flex flex-col border border-slate-200/60 dark:border-slate-700/60 shadow-sm">
                                <div className="p-4 border-b border-slate-200/60 dark:border-slate-700/60 bg-amber-500/10">
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <h3 className="font-semibold text-lg text-slate-900 dark:text-white">Audit Nilai</h3>
                                            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Cek kelengkapan penilaian siswa</p>
                                        </div>
                                        <div className="w-10 h-10 rounded-lg bg-amber-100 dark:bg-amber-500/20 flex items-center justify-center">
                                            <UserMinusIcon className="w-5 h-5 text-amber-500" />
                                        </div>
                                    </div>
                                </div>
                                <div className="p-4 flex-1 flex flex-col">
                                    <div className="space-y-4 mb-4">
                                        <Select value={selectedClassForCheck} onChange={(e) => setSelectedClassForCheck(e.target.value)}>
                                            <option value="">Semua Kelas</option>
                                            {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                        </Select>
                                        <div className="flex gap-3">
                                            <Select value={subjectForCompletionCheck} onChange={handleSubjectChange} className="flex-1">
                                                <option value="" disabled>Mapel</option>
                                                {uniqueSubjects.map((subject) => (
                                                    <option key={subject} value={subject}>{subject}</option>
                                                ))}
                                            </Select>
                                            <Select value={assessmentForCompletionCheck} onChange={(e) => setAssessmentForCompletionCheck(e.target.value)} className="flex-1" disabled={uniqueAssessmentsForSubject.length === 0}>
                                                <option value="">Semua</option>
                                                {uniqueAssessmentsForSubject.map((assessment) => (
                                                    <option key={assessment} value={assessment}>{assessment}</option>
                                                ))}
                                            </Select>
                                        </div>
                                    </div>

                                    {subjectForCompletionCheck ? (
                                        <div className="flex-1">
                                            <div className="flex justify-between text-xs mb-2 font-semibold uppercase tracking-wider">
                                                <span className="text-slate-400">Progres</span>
                                                <span className="text-emerald-600">{completionPercentage}%</span>
                                            </div>
                                            <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-2 overflow-hidden mb-4">
                                                <div className="h-full rounded-full transition-all duration-700 ease-out bg-gradient-to-r from-emerald-500 to-emerald-600" style={{ width: `${completionPercentage}%` }}></div>
                                            </div>

                                            {studentsMissingGrade.length > 0 ? (
                                                <div className="mt-auto">
                                                    <Button onClick={handleOpenMassInput} variant="primary" className="w-full" size="sm">
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
                    </section>

                    {/* Performance Section */}
                    {data && (data.classes.length > 0 || data.students.length > 0) && (
                        <section className="space-y-6">
                            <div className="flex items-center gap-2 mb-4 px-2">
                                <h2 className="text-xl font-semibold text-slate-900 dark:text-white flex items-center gap-2">
                                    <span className="w-1.5 h-5 bg-emerald-500 rounded-full inline-block"></span>
                                    Performa Kelas & Siswa
                                </h2>
                            </div>

                            {/* Class Analytics */}
                            {data.classes.length > 0 && (
                                <ClassAnalyticsSection
                                    classes={data.classes}
                                    students={data.students}
                                    academicRecords={data.academicRecords}
                                    attendanceRecords={[]}
                                />
                            )}
                        </section>
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
                    <div className="bg-white dark:bg-slate-900 rounded-xl h-full max-h-[800px] flex flex-col overflow-hidden border border-slate-200/60 dark:border-slate-700/60 shadow-sm">
                        <Tabs defaultValue="schedule" className="w-full flex flex-col h-full">
                            <div className="p-4 border-b border-slate-200/60 dark:border-slate-700/60 bg-slate-50/60 dark:bg-slate-800/40 backdrop-blur-md">
                                <TabsList className="w-full grid grid-cols-2">
                                    <TabsTrigger value="schedule">Jadwal</TabsTrigger>
                                    <TabsTrigger value="tasks">Tugas</TabsTrigger>
                                </TabsList>
                            </div>

                            <TabsContent value="schedule" className="flex-1 overflow-y-auto p-0 m-0 custom-scrollbar">
                                <div className="relative p-6">
                                    {todaySchedule.length > 0 ? (
                                        <div className="space-y-0 pl-4 border-l-2 border-slate-200 dark:border-slate-800 ml-3">
                                            {todaySchedule.map((item) => {
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
                                                        <div className={`absolute -left-[9px] top-0 w-4 h-4 rounded-full border-2 transition-all duration-500 ${isCurrent ? 'bg-emerald-500 border-emerald-200 dark:border-emerald-900 shadow-[0_0_0_4px_rgba(16,185,129,0.2)] scale-110' : 'bg-slate-200 dark:bg-slate-800 border-white dark:border-slate-900'}`}></div>

                                                        {/* Schedule Card */}
                                                        <div className={`
                                                            p-4 rounded-xl border transition-all duration-300
                                                            ${isCurrent
                                                                ? 'bg-emerald-50/50 dark:bg-emerald-500/10 border-emerald-200 dark:border-emerald-500/30 shadow-md shadow-emerald-500/10 transform scale-[1.02]'
                                                                : 'bg-white/50 dark:bg-white/5 border-slate-100 dark:border-white/5 hover:bg-white dark:hover:bg-white/10'}
                                                            ${isPast ? 'opacity-60 grayscale' : ''}
                                                        `}>
                                                            <div className="flex justify-between items-start mb-2">
                                                                <div>
                                                                    <span className={`text-[10px] font-bold px-2 py-1 rounded-lg mb-2 inline-block tracking-wide ${isCurrent ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300' : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'}`}>
                                                                        {item.start_time.slice(0, 5)} - {item.end_time.slice(0, 5)}
                                                                    </span>
                                                                    <h4 className="font-bold text-base text-slate-900 dark:text-white">{item.subject}</h4>
                                                                </div>
                                                                {isCurrent && (
                                                                    <span className="flex h-3 w-3 relative">
                                                                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                                                                        <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
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
                                        <div key={task.id} className="p-4 bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-700/60 rounded-xl hover:shadow-md transition-all group cursor-pointer">
                                            <div className="flex items-start justify-between">
                                                <div>
                                                    <p className="font-semibold text-slate-800 dark:text-white line-clamp-1 group-hover:text-amber-500 transition-colors">{task.title}</p>
                                                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1.5 flex items-center gap-1.5">
                                                        <ClockIcon className="w-3.5 h-3.5" />
                                                        Jatuh tempo: {task.due_date ? formatTaskDueDate(task.due_date) : 'Tidak ada'}
                                                    </p>
                                                </div>
                                                <div className={`w-2.5 h-2.5 rounded-full mt-1.5 ${isTaskOverdue(task.due_date) ? 'bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.5)]' : 'bg-blue-500 shadow-[0_0_10px_rgba(59,130,246,0.5)]'}`}></div>
                                            </div>
                                        </div>
                                    )) : (
                                        <div className="flex flex-col items-center justify-center py-20 text-center text-slate-400 dark:text-slate-500">
                                            <BookOpenIcon className="w-16 h-16 mb-4 opacity-30" />
                                            <p className="font-medium">Tidak ada tugas aktif.</p>
                                        </div>
                                    )}
                                </div>
                                <div className="p-4 border-t border-slate-200/60 dark:border-slate-700/60 bg-slate-50/50 dark:bg-slate-800/40 backdrop-blur-md">
                                    <Button variant="outline" size="sm" onClick={() => navigate('/tugas')} className="w-full">Lihat Semua Tugas</Button>
                                </div>
                            </TabsContent>
                        </Tabs>
                    </div>

                    {/* Parent Messages Widget */}
                    <ParentMessagesWidget />

                    {/* Activity Feed (Reminders + Timeline) */}
                    <ActivityFeedWidget
                        reminders={activeReminders}
                        activities={recentActivities}
                        onDismissReminder={handleDismissReminder}
                    />
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
                        <div className="w-12 h-12 rounded-xl bg-white dark:bg-slate-800 text-amber-500 shadow-xl flex items-center justify-center hover:scale-110 transition-transform border border-slate-100 dark:border-slate-700">
                            <CalendarIcon className="w-6 h-6" />
                        </div>
                    </Link>
                    <button
                        onClick={() => (window as unknown as { toggleSearch?: () => void }).toggleSearch?.()}
                        className="flex items-center gap-3 pr-1 group"
                    >
                        <span className="bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 px-4 py-2 rounded-xl shadow-lg shadow-black/10 text-sm font-bold opacity-0 group-hover:opacity-100 transition-all transform translate-x-4 group-hover:translate-x-0">
                            Cari
                        </span>
                        <div className="w-12 h-12 rounded-xl bg-white dark:bg-slate-800 text-sky-500 shadow-xl flex items-center justify-center hover:scale-110 transition-transform border border-slate-100 dark:border-slate-700">
                            <SearchIcon className="w-6 h-6" />
                        </div>
                    </button>
                    <button
                        onClick={() => (window as unknown as { toggleAiChat?: () => void }).toggleAiChat?.()}
                        className="flex items-center gap-3 pr-1 group"
                    >
                        <span className="bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 px-4 py-2 rounded-xl shadow-lg shadow-black/10 text-sm font-bold opacity-0 group-hover:opacity-100 transition-all transform translate-x-4 group-hover:translate-x-0">
                            AI Chat
                        </span>
                        <div className="w-12 h-12 rounded-xl bg-white dark:bg-slate-800 text-purple-500 shadow-xl flex items-center justify-center hover:scale-110 transition-transform border border-slate-100 dark:border-slate-700">
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
                        <div className="w-12 h-12 rounded-xl bg-white dark:bg-slate-800 text-slate-500 shadow-xl flex items-center justify-center hover:scale-110 transition-transform border border-slate-100 dark:border-slate-700">
                            <SettingsIcon className="w-6 h-6" />
                        </div>
                    </Link>
                </div>
                <FloatingActionButton
                    onClick={() => setIsFabOpen(!isFabOpen)}
                    icon={isFabOpen ? <PlusIcon className="w-7 h-7 rotate-45 transition-transform duration-300" /> : <PlusIcon className="w-7 h-7 transition-transform duration-300" />}
                    className={`pointer-events-auto transition-all duration-300 ${isFabOpen ? 'bg-red-500 hover:bg-red-600 dark:bg-red-600 shadow-red-500/30 rotate-90' : 'bg-emerald-500 hover:bg-emerald-600 shadow-emerald-500/30'}`}
                    position="bottom-right"
                    offset={{ bottom: 0, right: 0 }}
                    size={64}
                />
            </div>
        </div>
    );
};

export default DashboardPage;
