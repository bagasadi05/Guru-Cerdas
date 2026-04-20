import React, { useEffect, useMemo, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../../services/supabase';
import { useToast } from '../../hooks/useToast';
import { Tabs, TabsContent } from '../ui/Tabs';
import { Select } from '../ui/Select';
import { ChildDevelopmentAnalytics } from '../ui/ChildDevelopmentAnalytics';
import { generateReportCardPDF } from '../exports/generateReportCardPDF';
import { generateGuardianSummaryPDF } from '../exports/generateGuardianSummaryPDF';
import { useSemester } from '../../contexts/SemesterContext';
import { getSemesterTerm } from '../../utils/semesterUtils';
import { CalendarIcon } from '../Icons';
import {
    GlassCard,
    getAttentionItems,
    getAttendanceSummary,
    getAverageScore,
    getGuardianSummary,
    getQuickSummary,
    getRecentActivities,
    getRecentAnnouncements,
    getUnreadMessagesCount,
    getWeeklyGuardianSummary,
    PortalAttendanceTab,
    PortalCommunicationPanel,
    PortalCommunicationTab,
    PortalHeader,
    PortalHomeTab,
    PortalMoreTab,
    PortalNavigation,
    PortalProgressTab,
    SettingsModal,
    type PortalAcademicRecord,
    type PortalAnnouncement,
    type PortalAttendance,
    type PortalCommunication,
    type PortalData,
    type PortalMoreSection,
    type PortalPrimaryTab,
    type PortalQuizPoint,
    type PortalReport,
    type PortalSchedule,
    type PortalSchoolInfo,
    type PortalStudentInfo,
    type PortalTask,
    type PortalViolation,
    type TeacherInfo,
} from './portal';

type PortalSemesterFilter = 'all' | 'ganjil' | 'genap';
type PortalSemesterTerm = Exclude<PortalSemesterFilter, 'all'>;
type PortalFilterableRecord = {
    semester_id?: string | null;
    date?: string | null;
    created_at?: string | null;
    due_date?: string | null;
    quiz_date?: string | null;
};

const toArray = <T,>(value: unknown): T[] => (Array.isArray(value) ? value : []) as T[];

const toObject = <T,>(value: unknown, fallback: T): T => (
    value && typeof value === 'object' ? value as T : fallback
);

const normalizePortalCommunications = (value: unknown): PortalCommunication[] => (
    toArray<Record<string, unknown>>(value).map((item) => ({
        id: typeof item.id === 'string' ? item.id : '',
        message: typeof item.message === 'string'
            ? item.message
            : typeof item.content === 'string'
                ? item.content
                : '',
        is_read: Boolean(item.is_read),
        created_at: typeof item.created_at === 'string' ? item.created_at : '',
        sender: item.sender === 'parent' ? 'parent' : 'teacher',
        attachment_url: typeof item.attachment_url === 'string' ? item.attachment_url : undefined,
        attachment_type: item.attachment_type === 'image' || item.attachment_type === 'document'
            ? item.attachment_type
            : undefined,
        attachment_name: typeof item.attachment_name === 'string' ? item.attachment_name : undefined,
    }))
);

const normalizePortalQuizPoints = (value: unknown): PortalQuizPoint[] => (
    toArray<Record<string, unknown>>(value).map((item) => {
        const quizName = typeof item.quiz_name === 'string' ? item.quiz_name : null;
        const subject = typeof item.subject === 'string' ? item.subject : null;
        const category = typeof item.category === 'string' ? item.category : null;
        const reason = typeof item.reason === 'string' && item.reason.trim()
            ? item.reason
            : quizName || (subject ? `Keaktifan ${subject}` : 'Aktivitas kelas');

        return {
            id: typeof item.id === 'string' ? item.id : '',
            points: typeof item.points === 'number' ? item.points : Number(item.points || 0),
            type: typeof item.type === 'string' && item.type.trim()
                ? item.type
                : category || subject || 'Keaktifan',
            reason,
            created_at: typeof item.created_at === 'string' ? item.created_at : '',
            quiz_name: quizName,
            quiz_date: typeof item.quiz_date === 'string' ? item.quiz_date : null,
            subject,
            category,
            max_points: typeof item.max_points === 'number' ? item.max_points : null,
            is_used: typeof item.is_used === 'boolean' ? item.is_used : null,
            used_at: typeof item.used_at === 'string' ? item.used_at : null,
            used_for_subject: typeof item.used_for_subject === 'string' ? item.used_for_subject : null,
            semester_id: typeof item.semester_id === 'string' ? item.semester_id : null,
        };
    })
);

const getFilterableRecordDate = (record: PortalFilterableRecord): string | null => (
    record.date ?? record.quiz_date ?? record.created_at ?? record.due_date ?? null
);

const getRecordSemesterTerm = (
    record: PortalFilterableRecord,
    semesterTermsById: Map<string, PortalSemesterTerm | null>
): PortalSemesterTerm | null => {
    if (record.semester_id) {
        const semesterTerm = semesterTermsById.get(record.semester_id);
        if (semesterTerm) return semesterTerm;
    }

    const recordDate = getFilterableRecordDate(record);
    return getSemesterTerm(undefined, recordDate);
};

const filterRecordsBySemesterTerm = <T extends PortalFilterableRecord>(
    records: T[],
    selectedFilter: PortalSemesterFilter,
    semesterTermsById: Map<string, PortalSemesterTerm | null>
): T[] => {
    if (selectedFilter === 'all') return records;
    return records.filter((record) => getRecordSemesterTerm(record, semesterTermsById) === selectedFilter);
};

const fetchPortalData = async (studentId: string, accessCode: string): Promise<PortalData> => {
    const { data, error } = await supabase.rpc('get_student_portal_data', {
        student_id_param: studentId,
        access_code_param: accessCode,
    });

    if (error) {
        console.error('Portal access RPC failed:', error);
        throw new Error(`Gagal memuat data portal: ${error.message}.`);
    }

    const resultRows = Array.isArray(data) ? data : [];

    if (resultRows.length === 0) {
        throw new Error('Akses ditolak. Kode akses mungkin tidak valid untuk siswa ini atau telah kedaluwarsa.');
    }

    const portalResult = toObject<Record<string, unknown>>(resultRows[0], {});

    const student = toObject<PortalStudentInfo>(portalResult.student, {
        id: studentId,
        name: 'Siswa',
        gender: 'Laki-laki',
        class_id: '',
        avatar_url: null,
        access_code: accessCode || null,
        parent_name: null,
        parent_phone: null,
        classes: { name: '-' },
    });

    return {
        student: { ...student, access_code: accessCode || null },
        reports: toArray<PortalReport>(portalResult.reports),
        attendanceRecords: toArray<PortalAttendance>(portalResult.attendanceRecords),
        academicRecords: toArray<PortalAcademicRecord>(portalResult.academicRecords),
        violations: toArray<PortalViolation>(portalResult.violations),
        quizPoints: normalizePortalQuizPoints(portalResult.quizPoints),
        communications: normalizePortalCommunications(portalResult.communications),
        schedules: toArray<PortalSchedule>(portalResult.schedules),
        tasks: toArray<PortalTask>(portalResult.tasks),
        announcements: toArray<PortalAnnouncement>(portalResult.announcements),
        teacher: toObject<TeacherInfo>(portalResult.teacher, null),
        schoolInfo: toObject<PortalSchoolInfo>(portalResult.schoolInfo, { school_name: 'Sekolah' }),
    };
};

export const ParentPortalPage: React.FC = () => {
    const { studentId } = useParams<{ studentId: string }>();
    const navigate = useNavigate();
    const accessCode = sessionStorage.getItem('portal_access_code');
    const toast = useToast();
    const queryClient = useQueryClient();
    const { activeAcademicYear, semesters } = useSemester();

    const [settingsOpen, setSettingsOpen] = useState(false);
    const [activeTab, setActiveTab] = useState<PortalPrimaryTab>('beranda');
    const [activeMoreSection, setActiveMoreSection] = useState<PortalMoreSection>('tugas');
    const [selectedSemesterFilter, setSelectedSemesterFilter] = useState<PortalSemesterFilter>('all');

    const { mutate: updateParentInfo } = useMutation({
        mutationFn: async ({ name, phone }: { name: string; phone: string }) => {
            if (!data?.student.access_code) throw new Error('Kode akses hilang.');
            const { data: result, error } = await supabase.rpc('update_parent_info', {
                student_id_param: studentId!,
                access_code_param: data.student.access_code,
                new_parent_name: name,
                new_parent_phone: phone,
            });
            if (error) throw error;
            if (result === false) throw new Error('Akses portal tidak valid.');
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['portalData', studentId] });
            toast.success('Data orang tua berhasil diperbarui.');
        },
        onError: (err) => toast.error(`Gagal memperbarui data: ${err.message}`),
    });

    const { data, isLoading, isError, error } = useQuery({
        queryKey: ['portalData', studentId],
        queryFn: () => fetchPortalData(studentId!, accessCode!),
        enabled: !!studentId && !!accessCode,
        retry: false,
    });

    useEffect(() => {
        if (!accessCode) {
            navigate('/portal-login', { replace: true });
        }
        if (isError) {
            console.error('Portal Data Fetch Error:', error);
            sessionStorage.removeItem('portal_access_code');
            navigate('/portal-login', { replace: true });
        }
    }, [accessCode, isError, error, navigate]);

    const handleLogout = () => {
        sessionStorage.removeItem('portal_access_code');
        navigate('/', { replace: true });
    };

    const semesterTermsById = useMemo(() => (
        new Map(
            semesters.map((semester) => [
                semester.id,
                getSemesterTerm(semester.name, semester.start_date) as PortalSemesterTerm | null,
            ])
        )
    ), [semesters]);

    const filteredAttendance = useMemo(() => (
        data ? filterRecordsBySemesterTerm(data.attendanceRecords, selectedSemesterFilter, semesterTermsById) : []
    ), [data, selectedSemesterFilter, semesterTermsById]);

    const attendanceSummary = useMemo(() => getAttendanceSummary(filteredAttendance), [filteredAttendance]);

    const filteredViolations = useMemo(() => (
        data ? filterRecordsBySemesterTerm(data.violations, selectedSemesterFilter, semesterTermsById) : []
    ), [data, selectedSemesterFilter, semesterTermsById]);

    const filteredAcademicRecords = useMemo(() => (
        data ? filterRecordsBySemesterTerm(data.academicRecords, selectedSemesterFilter, semesterTermsById) : []
    ), [data, selectedSemesterFilter, semesterTermsById]);

    const filteredQuizPoints = useMemo(() => (
        data ? filterRecordsBySemesterTerm(data.quizPoints, selectedSemesterFilter, semesterTermsById) : []
    ), [data, selectedSemesterFilter, semesterTermsById]);

    const filteredCommunications = useMemo(() => (
        data ? filterRecordsBySemesterTerm(data.communications, selectedSemesterFilter, semesterTermsById) : []
    ), [data, selectedSemesterFilter, semesterTermsById]);

    const filteredTasks = useMemo(() => (
        data ? filterRecordsBySemesterTerm(data.tasks, selectedSemesterFilter, semesterTermsById) : []
    ), [data, selectedSemesterFilter, semesterTermsById]);

    const filteredReports = useMemo(() => (
        data ? filterRecordsBySemesterTerm(data.reports, selectedSemesterFilter, semesterTermsById) : []
    ), [data, selectedSemesterFilter, semesterTermsById]);

    const filteredAnnouncements = useMemo(() => (
        data ? filterRecordsBySemesterTerm(data.announcements, selectedSemesterFilter, semesterTermsById) : []
    ), [data, selectedSemesterFilter, semesterTermsById]);

    const averageScore = useMemo(() => (
        getAverageScore(filteredAcademicRecords)
    ), [filteredAcademicRecords]);

    const unreadMessagesCount = useMemo(() => (
        getUnreadMessagesCount(filteredCommunications)
    ), [filteredCommunications]);

    const recentAnnouncements = useMemo(() => (
        getRecentAnnouncements(filteredAnnouncements)
    ), [filteredAnnouncements]);

    const attentionItems = useMemo(() => (
        data ? getAttentionItems({
            tasks: filteredTasks,
            communications: filteredCommunications,
            attendance: filteredAttendance,
            violations: filteredViolations,
            announcements: filteredAnnouncements,
        }) : []
    ), [data, filteredAnnouncements, filteredAttendance, filteredCommunications, filteredTasks, filteredViolations]);

    const recentActivities = useMemo(() => (
        data ? getRecentActivities({
            communications: filteredCommunications,
            announcements: filteredAnnouncements,
            tasks: filteredTasks,
            attendance: filteredAttendance,
            violations: filteredViolations,
        }) : []
    ), [data, filteredAnnouncements, filteredAttendance, filteredCommunications, filteredTasks, filteredViolations]);

    const quickSummary = useMemo(() => (
        data ? getQuickSummary({
            academicRecords: filteredAcademicRecords,
            attendance: filteredAttendance,
            tasks: filteredTasks,
            communications: filteredCommunications,
            violations: filteredViolations,
        }) : {
            averageScore: null,
            presentCount: 0,
            activeTasksCount: 0,
            unreadMessagesCount: 0,
            violationPoints: 0,
        }
    ), [data, filteredAcademicRecords, filteredAttendance, filteredCommunications, filteredTasks, filteredViolations]);

    const guardianSummary = useMemo(() => (
        data ? getGuardianSummary({
            academicRecords: filteredAcademicRecords,
            attendance: filteredAttendance,
            tasks: filteredTasks,
            communications: filteredCommunications,
            violations: filteredViolations,
            quizPoints: filteredQuizPoints,
        }) : null
    ), [data, filteredAcademicRecords, filteredAttendance, filteredCommunications, filteredQuizPoints, filteredTasks, filteredViolations]);

    const weeklySummary = useMemo(() => (
        data ? getWeeklyGuardianSummary({
            academicRecords: filteredAcademicRecords,
            attendance: filteredAttendance,
            tasks: filteredTasks,
            communications: filteredCommunications,
            violations: filteredViolations,
            quizPoints: filteredQuizPoints,
        }) : null
    ), [data, filteredAcademicRecords, filteredAttendance, filteredCommunications, filteredQuizPoints, filteredTasks, filteredViolations]);

    const portalDataForExport = useMemo(() => {
        if (!data) return null;

        return {
            ...data,
            reports: filteredReports,
            attendanceRecords: filteredAttendance,
            academicRecords: filteredAcademicRecords,
            violations: filteredViolations,
            quizPoints: filteredQuizPoints,
            communications: filteredCommunications,
            tasks: filteredTasks,
            announcements: filteredAnnouncements,
            schoolInfo: {
                ...data.schoolInfo,
                semester: selectedSemesterFilter === 'ganjil'
                    ? 'Semester Ganjil'
                    : selectedSemesterFilter === 'genap'
                        ? 'Semester Genap'
                        : data.schoolInfo.semester,
            },
        };
    }, [
        data,
        filteredAcademicRecords,
        filteredAnnouncements,
        filteredAttendance,
        filteredCommunications,
        filteredQuizPoints,
        filteredReports,
        filteredTasks,
        filteredViolations,
        selectedSemesterFilter,
    ]);

    const handleDownloadPDF = async () => {
        if (portalDataForExport) {
            try {
                await generateReportCardPDF(portalDataForExport);
                toast.success('PDF berhasil diunduh.');
            } catch (error) {
                console.error('Failed to generate PDF', error);
                toast.error('Gagal mengunduh PDF.');
            }
        }
    };

    const handleDownloadGuardianSummaryPDF = async () => {
        if (portalDataForExport) {
            try {
                const semesterLabel = selectedSemesterFilter === 'ganjil'
                    ? 'Semester Ganjil'
                    : selectedSemesterFilter === 'genap'
                        ? 'Semester Genap'
                        : 'Semua Semester';
                await generateGuardianSummaryPDF(portalDataForExport, {
                    guardianSummary,
                    weeklySummary,
                    semesterLabel,
                });
                toast.success('Ringkasan wali berhasil diunduh.');
            } catch (error) {
                console.error('Failed to generate guardian summary PDF', error);
                toast.error('Gagal mengunduh ringkasan wali.');
            }
        }
    };

    if (isLoading) {
        return <div className="flex h-screen items-center justify-center bg-slate-100 dark:bg-slate-950"><div className="h-16 w-16 animate-spin rounded-full border-4 border-slate-900 border-t-transparent dark:border-white dark:border-t-transparent"></div></div>;
    }

    if (!data) return null;

    const { student, teacher, schedules } = data;

    const handleOpenMoreSection = (section: PortalMoreSection) => {
        setActiveMoreSection(section);
        setActiveTab('lainnya');
    };

    return (
        <div className="fixed inset-0 overflow-y-auto bg-[linear-gradient(180deg,#e2e8f0_0%,#f8fafc_18%,#f8fafc_100%)] font-sans text-slate-900 dark:bg-[linear-gradient(180deg,#020617_0%,#0f172a_18%,#020617_100%)] dark:text-slate-100">
            <PortalHeader
                student={student}
                announcements={filteredAnnouncements}
                onLogout={handleLogout}
                onSettingsClick={() => setSettingsOpen(true)}
            />

            <SettingsModal
                isOpen={settingsOpen}
                onClose={() => setSettingsOpen(false)}
                student={student}
                onSave={async (name, phone) => updateParentInfo({ name: name || '', phone: phone || '' })}
            />

            <main className="relative z-10 -mt-14 mx-auto max-w-7xl px-4 pb-14 sm:px-6">
                <div className="absolute inset-x-4 top-8 -z-10 h-48 rounded-[36px] bg-slate-900/8 blur-3xl dark:bg-slate-100/5 sm:inset-x-10" />

                <div className="mb-5 flex flex-wrap items-center justify-between gap-3 rounded-[24px] border border-white/70 bg-white/88 p-4 shadow-[0_16px_40px_-28px_rgba(15,23,42,0.35)] backdrop-blur-xl animate-fade-in-up dark:border-white/10 dark:bg-slate-900/82">
                    <div>
                        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">Filter Data</p>
                        <span className="mt-1 block text-sm text-slate-600 dark:text-slate-300">Tampilkan ringkasan sesuai semester yang ingin ditinjau.</span>
                        {activeAcademicYear?.name && (
                            <span className="mt-1 block text-xs text-slate-500 dark:text-slate-400">
                                Tahun ajaran aktif: {activeAcademicYear.name}
                            </span>
                        )}
                    </div>

                    <div className="relative min-w-[240px]">
                        <CalendarIcon className="pointer-events-none absolute left-3 top-1/2 z-10 h-4 w-4 -translate-y-1/2 text-emerald-500" />
                        <Select
                            value={selectedSemesterFilter}
                            onChange={(event) => setSelectedSemesterFilter(event.target.value as PortalSemesterFilter)}
                            className="h-10 rounded-xl border-slate-200 bg-white pl-9 pr-9 text-sm text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                        >
                            <option value="all">Semua Semester</option>
                            <option value="ganjil">Semester Ganjil</option>
                            <option value="genap">Semester Genap</option>
                        </Select>
                    </div>
                </div>

                <GlassCard className="animate-fade-in-up delay-100">
                    <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as PortalPrimaryTab)} className="w-full">
                        <PortalNavigation
                            activeTab={activeTab}
                            unreadMessagesCount={unreadMessagesCount}
                            attentionCount={attentionItems.length}
                        />

                        <TabsContent value="beranda">
                            <PortalHomeTab
                                student={student}
                                attentionItems={attentionItems}
                                guardianSummary={guardianSummary}
                                weeklySummary={weeklySummary}
                                quickSummary={quickSummary}
                                recentActivities={recentActivities}
                                recentAnnouncements={recentAnnouncements}
                                onOpenTab={setActiveTab}
                                onOpenMoreSection={handleOpenMoreSection}
                                onOpenSettings={() => setSettingsOpen(true)}
                                onDownloadPdf={handleDownloadGuardianSummaryPDF}
                            />
                        </TabsContent>

                        <TabsContent value="perkembangan">
                            <PortalProgressTab
                                academicRecords={filteredAcademicRecords}
                                quizPoints={filteredQuizPoints}
                                averageScore={averageScore}
                                schoolInfo={data.schoolInfo}
                                onDownloadPdf={handleDownloadPDF}
                                analyticsContent={
                                    <ChildDevelopmentAnalytics
                                        academicRecords={filteredAcademicRecords}
                                        attendanceRecords={filteredAttendance}
                                        violations={filteredViolations}
                                        studentName={student.name}
                                    />
                                }
                            />
                        </TabsContent>

                        <TabsContent value="kehadiran">
                            <PortalAttendanceTab
                                attendance={filteredAttendance}
                                summary={attendanceSummary}
                            />
                        </TabsContent>

                        <TabsContent value="komunikasi">
                            <PortalCommunicationTab communications={filteredCommunications} student={student} teacher={teacher}>
                                <PortalCommunicationPanel communications={filteredCommunications} student={student} teacher={teacher} />
                            </PortalCommunicationTab>
                        </TabsContent>

                        <TabsContent value="lainnya">
                            <PortalMoreTab
                                activeSection={activeMoreSection}
                                onSectionChange={setActiveMoreSection}
                                tasks={filteredTasks}
                                schedules={schedules}
                                violations={filteredViolations}
                                reports={filteredReports}
                                schoolInfo={data.schoolInfo}
                                onDownloadPdf={handleDownloadPDF}
                                onOpenSettings={() => setSettingsOpen(true)}
                            />
                        </TabsContent>
                    </Tabs>
                </GlassCard>
            </main>
        </div>
    );
};
