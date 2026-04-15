import React, { useEffect, useMemo, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../../services/supabase';
import { useToast } from '../../hooks/useToast';
import { Tabs, TabsContent } from '../ui/Tabs';
import { ChildDevelopmentAnalytics } from '../ui/ChildDevelopmentAnalytics';
import { generateReportCardPDF } from '../exports/generateReportCardPDF';
import { useSemester } from '../../contexts/SemesterContext';
import { SemesterSelector } from '../ui/SemesterSelector';
import {
    GlassCard,
    getAttentionItems,
    getAttendanceSummary,
    getAverageScore,
    getFilteredAttendance,
    getFilteredViolations,
    getQuickSummary,
    getRecentActivities,
    getRecentAnnouncements,
    getUnreadMessagesCount,
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


const fetchPortalData = async (studentId: string, accessCode: string): Promise<PortalData> => {
    const { data, error } = await supabase.rpc('get_student_portal_data', {
        student_id_param: studentId,
        access_code_param: accessCode,
    });

    if (error) {
        console.error("Portal access RPC failed:", error);
        throw new Error(`Gagal memuat data portal: ${error.message}.`);
    }

    const resultRows = Array.isArray(data) ? data : [];

    if (resultRows.length === 0) {
        throw new Error("Akses ditolak. Kode akses mungkin tidak valid untuk siswa ini atau telah kedaluwarsa.");
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
        quizPoints: toArray<PortalQuizPoint>(portalResult.quizPoints),
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
    const { activeSemester } = useSemester();

    const [settingsOpen, setSettingsOpen] = useState(false);
    const [activeTab, setActiveTab] = useState<PortalPrimaryTab>('beranda');
    const [activeMoreSection, setActiveMoreSection] = useState<PortalMoreSection>('tugas');
    const [selectedSemesterId, setSelectedSemesterId] = useState<string | null>(null);
    const effectiveSelectedSemesterId = selectedSemesterId ?? activeSemester?.id ?? null;

    // PDF Download handler
    const handleDownloadPDF = async () => {
        if (data) {
            try {
                await generateReportCardPDF(data, effectiveSelectedSemesterId || undefined);
                toast.success("PDF berhasil diunduh.");
            } catch (error) {
                console.error("Failed to generate PDF", error);
                toast.error("Gagal mengunduh PDF.");
            }
        }
    };

    // Mutation for updating parent info
    const { mutate: updateParentInfo } = useMutation({
        mutationFn: async ({ name, phone }: { name: string, phone: string }) => {
            if (!data?.student.access_code) throw new Error("Kode akses hilang.");
            const { data: result, error } = await supabase.rpc('update_parent_info', {
                student_id_param: studentId!,
                access_code_param: data.student.access_code,
                new_parent_name: name,
                new_parent_phone: phone
            });
            if (error) throw error;
            if (result === false) throw new Error("Akses portal tidak valid.");
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['portalData', studentId] });
            toast.success("Data orang tua berhasil diperbarui.");
        },
        onError: (err) => toast.error("Gagal memperbarui data: " + err.message)
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
            console.error("Portal Data Fetch Error:", error);
            sessionStorage.removeItem('portal_access_code');
            navigate('/portal-login', { replace: true });
        }
    }, [accessCode, isError, error, navigate]);

    const handleLogout = () => {
        sessionStorage.removeItem('portal_access_code');
        navigate('/', { replace: true });
    };

    // Filter attendance by selected semester
    const filteredAttendance = useMemo(() => (
        data ? getFilteredAttendance(data.attendanceRecords, effectiveSelectedSemesterId) : []
    ), [data, effectiveSelectedSemesterId]);

    const attendanceSummary = useMemo(() => getAttendanceSummary(filteredAttendance), [filteredAttendance]);

    const filteredViolations = useMemo(() => (
        data ? getFilteredViolations(data.violations, effectiveSelectedSemesterId) : []
    ), [data, effectiveSelectedSemesterId]);

    const averageScore = useMemo(() => (
        data ? getAverageScore(data.academicRecords) : null
    ), [data]);
    const unreadMessagesCount = useMemo(() => (
        data ? getUnreadMessagesCount(data.communications) : 0
    ), [data]);
    const recentAnnouncements = useMemo(() => (
        data ? getRecentAnnouncements(data.announcements) : []
    ), [data]);
    const attentionItems = useMemo(() => (
        data ? getAttentionItems({
            tasks: data.tasks,
            communications: data.communications,
            attendance: filteredAttendance,
            violations: filteredViolations,
            announcements: data.announcements,
        }) : []
    ), [data, filteredAttendance, filteredViolations]);
    const recentActivities = useMemo(() => (
        data ? getRecentActivities({
            communications: data.communications,
            announcements: data.announcements,
            tasks: data.tasks,
            attendance: filteredAttendance,
            violations: filteredViolations,
        }) : []
    ), [data, filteredAttendance, filteredViolations]);
    const quickSummary = useMemo(() => (
        data ? getQuickSummary({
            academicRecords: data.academicRecords,
            attendance: filteredAttendance,
            tasks: data.tasks,
            communications: data.communications,
            violations: filteredViolations,
        }) : {
            averageScore: null,
            presentCount: 0,
            activeTasksCount: 0,
            unreadMessagesCount: 0,
            violationPoints: 0,
        }
    ), [data, filteredAttendance, filteredViolations]);

    if (isLoading) {
        return <div className="flex items-center justify-center h-screen bg-slate-50 dark:bg-slate-950"><div className="w-16 h-16 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div></div>;
    }

    if (!data) return null;

    const { student, academicRecords, communications, teacher, quizPoints, schedules, tasks, announcements } = data;

    const handleOpenMoreSection = (section: PortalMoreSection) => {
        setActiveMoreSection(section);
        setActiveTab('lainnya');
    };

    return (
        <div className="fixed inset-0 bg-slate-50 dark:bg-slate-950 font-sans text-slate-900 dark:text-slate-100 overflow-y-auto">
            <PortalHeader
                student={student}
                announcements={announcements}
                onLogout={handleLogout}
                onSettingsClick={() => setSettingsOpen(true)}
            />

            <SettingsModal
                isOpen={settingsOpen}
                onClose={() => setSettingsOpen(false)}
                student={student}
                onSave={async (name, phone) => updateParentInfo({ name: name || '', phone: phone || '' })}
            />

            <main className="relative z-10 -mt-8 px-4 sm:px-6 pb-12 max-w-7xl mx-auto">
                {/* Semester Selector */}
                <div className="mb-4 flex flex-wrap items-center justify-between gap-3 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md rounded-xl p-3 border border-white/20 animate-fade-in-up">
                    <span className="text-sm font-medium text-slate-600 dark:text-slate-400">Filter Semester:</span>
                    <SemesterSelector
                        value={effectiveSelectedSemesterId || 'all'}
                        onChange={(semId) => setSelectedSemesterId(semId === 'all' ? null : semId)}
                        size="sm"
                        includeAllOption={true}
                        className="min-w-[200px]"
                    />
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
                                quickSummary={quickSummary}
                                recentActivities={recentActivities}
                                recentAnnouncements={recentAnnouncements}
                                onOpenTab={setActiveTab}
                                onOpenMoreSection={handleOpenMoreSection}
                                onOpenSettings={() => setSettingsOpen(true)}
                                onDownloadPdf={handleDownloadPDF}
                            />
                        </TabsContent>

                        <TabsContent value="perkembangan">
                            <PortalProgressTab
                                academicRecords={academicRecords}
                                quizPoints={quizPoints}
                                averageScore={averageScore}
                                schoolInfo={data.schoolInfo}
                                onDownloadPdf={handleDownloadPDF}
                                analyticsContent={
                                    <ChildDevelopmentAnalytics
                                        academicRecords={academicRecords}
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
                            <PortalCommunicationTab communications={communications} student={student} teacher={teacher}>
                                <PortalCommunicationPanel communications={communications} student={student} teacher={teacher} />
                            </PortalCommunicationTab>
                        </TabsContent>

                        <TabsContent value="lainnya">
                            <PortalMoreTab
                                activeSection={activeMoreSection}
                                onSectionChange={setActiveMoreSection}
                                tasks={tasks}
                                schedules={schedules}
                                violations={filteredViolations}
                                reports={data.reports}
                                schoolInfo={data.schoolInfo}
                                onDownloadPdf={handleDownloadPDF}
                                onOpenSettings={() => setSettingsOpen(true)}
                            />
                        </TabsContent>
                    </Tabs>
                </GlassCard >
            </main >
        </div >
    );
};
