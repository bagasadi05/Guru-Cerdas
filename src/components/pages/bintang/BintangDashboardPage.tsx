import React, { useState, useEffect, useMemo } from 'react';
import { BarChart3, ClipboardCheck } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../../../hooks/useAuth';
import { supabase } from '../../../services/supabase';
import { useConfirmation } from '../../ui/ConfirmationDialog';
import { useToast } from '../../../hooks/useToast';
import { useBintangEvaluation } from './hooks/useBintangEvaluation';
import { useBulkSelection } from '../../advanced-features/useBulkSelection';
import { useSemester } from '../../../contexts/SemesterContext';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../../ui/Tabs';
import { PembinaanTab } from './tabs/PembinaanTab';

// Domain Hooks
import { useBintangData } from './hooks/useBintangData';
import { useBintangMutations } from './hooks/useBintangMutations';

// Modular Presentation Components
import {
    BintangHeaderCard,
    BintangSummaryCards,
    BintangActionBar,
    BintangModalsContainer,
    BintangTrendSection,
    BintangScoringBanner,
    BintangEvaluationTable,
} from './components';

export const BintangDashboardPage: React.FC = () => {
    const { user, isAdmin, userRole } = useAuth();
    const toast = useToast();
    const { activeSemester } = useSemester();

    // Confirmation Dialogs
    const { confirm: confirmPublish, Dialog: PublishConfirmDialog } = useConfirmation();
    const { confirm: confirmUnpublish, Dialog: UnpublishConfirmDialog } = useConfirmation();
    const { confirm: confirmDeleteViolation, Dialog: DeleteViolationDialog } = useConfirmation();
    const { confirm: confirmDeleteQuiz, Dialog: DeleteQuizDialog } = useConfirmation();
    const { confirm: confirmDeleteMentoring, Dialog: DeleteMentoringDialog } = useConfirmation();
    const { confirm: confirmDuplicateViolation, Dialog: DuplicateViolationDialog } = useConfirmation();

    // Access control
    const { data: teacherAssignments = [] } = useQuery({
        queryKey: ['teacher_assignments', user?.id],
        queryFn: async () => {
            if (!user) return [];
            const { data } = await supabase
                .from('teacher_class_assignments')
                .select('*')
                .eq('teacher_user_id', user.id);
            return data || [];
        },
        enabled: Boolean(user),
    });

    const isHomeroomTeacher = useMemo(() => {
        return teacherAssignments.some(
            (a: { assignment_role?: string }) => a.assignment_role === 'homeroom'
        );
    }, [teacherAssignments]);

    const isWalas =
        isAdmin ||
        isHomeroomTeacher ||
        userRole === 'waka_kesiswaan' ||
        userRole === 'waka_kurikulum' ||
        userRole === 'kepala_madrasah';

    // Core Domain Data Hook
    const data = useBintangData();

    // Mutation & Action Handlers Hook
    const mutations = useBintangMutations({
        user,
        activeSemester,
        students: data.students,
        violations: data.violations,
        selectedClass: data.selectedClass,
        fetchAllData: data.fetchAllData,
        confirmDeleteViolation,
        confirmDuplicateViolation,
        confirmDeleteQuiz,
        confirmDeleteMentoring,
        toast,
        getStudentName: data.getStudentName,
    });

    // UI Local States
    const [detailStudentId, setDetailStudentId] = useState<string | null>(null);
    const [isKeaktifanModalOpen, setIsKeaktifanModalOpen] = useState(false);
    const [isBulkExportModalOpen, setIsBulkExportModalOpen] = useState(false);

    // Bulk Selection
    const bulkSelection = useBulkSelection(data.students);
    const clearSelection = bulkSelection.clearSelection;

    useEffect(() => {
        clearSelection();
    }, [data.selectedClass, data.selectedMonth, clearSelection]);

    useEffect(() => {
        if (bulkSelection.selectedCount === 0) return;
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                clearSelection();
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [bulkSelection.selectedCount, clearSelection]);

    // Evaluation Hook (shared logic for generate, publish, unpublish, export)
    const evalHook = useBintangEvaluation({
        toast,
        confirmPublish,
        confirmUnpublish,
        fetchData: async () => {
            await data.fetchAllData();
        },
        selectedMonth: data.selectedMonth,
        user,
        students: data.students,
        evaluations: data.evaluations,
        selectedClass: data.selectedClass,
        getStudentQuizPoints: (studentId: string) => data.studentQuizMap.get(studentId)?.totalPoints || 0,
        getStudentViolations: (studentId: string) => data.studentViolationsMap.get(studentId) || [],
        getStudentAttitude: (studentId: string) => data.studentAttitudeMap[studentId],
    });

    return (
        <div className="p-4 sm:p-6 lg:p-8 space-y-6">
            {/* Hero Header & Filters Card */}
            <BintangHeaderCard
                classes={data.classes}
                selectedClass={data.selectedClass}
                onSelectClass={data.setSelectedClass}
                selectedMonth={data.selectedMonth}
                onSelectMonth={data.setSelectedMonth}
                studentCount={data.students.length}
                isLoading={data.isLoading}
            />

            {/* Empty state when no class selected */}
            {!data.selectedClass && (
                <div className="bg-white dark:bg-slate-800/60 rounded-2xl border border-dashed border-slate-300 dark:border-slate-700 py-14 px-6 text-center text-slate-500 dark:text-slate-400">
                    <div className="w-14 h-14 rounded-2xl bg-amber-500/10 text-amber-600 dark:text-amber-400 mx-auto mb-3.5 flex items-center justify-center border border-amber-500/20">
                        <BarChart3 size={28} />
                    </div>
                    <p className="text-base sm:text-lg font-bold text-slate-800 dark:text-white">
                        Pilih kelas untuk memulai
                    </p>
                    <p className="text-xs sm:text-sm mt-1 max-w-md mx-auto">
                        Semua data ringkasan karakter, poin keaktifan, evaluasi rapor bulanan, dan catatan pembinaan ditampilkan di satu halaman.
                    </p>
                </div>
            )}

            {/* Loading state */}
            {data.selectedClass && data.isLoading && (
                <div className="bg-white dark:bg-slate-800/60 rounded-2xl border border-slate-200/80 dark:border-slate-700/60 py-14 text-center text-slate-500 dark:text-slate-400 text-sm font-medium">
                    Memuat data karakter kelas...
                </div>
            )}

            {/* Main Content (Tabbed) */}
            {data.selectedClass && !data.isLoading && (
                <Tabs defaultValue="rekap" className="w-full">
                    {/* Tab Navigation */}
                    <TabsList className="w-full max-w-full overflow-x-auto justify-start sm:justify-center">
                        <TabsTrigger value="rekap">
                            <BarChart3 size={16} className="mr-1.5" /> Rekap BINTANG
                        </TabsTrigger>
                        <TabsTrigger value="pembinaan">
                            <ClipboardCheck size={16} className="mr-1.5" /> Pembinaan
                        </TabsTrigger>
                    </TabsList>

                    {/* Tab: Rekap BINTANG */}
                    <TabsContent value="rekap" className="mt-6">
                        <div className="space-y-5">
                            {/* 1. Scoring Info Banner */}
                            <BintangScoringBanner />

                            {/* 2. Summary Cards & Alert Banners */}
                            <BintangSummaryCards
                                classSummary={data.classSummary}
                                totalQuizPoints={data.quizPoints.reduce((sum, q) => sum + (q.points || 0), 0)}
                                quizPointsCount={data.quizPoints.length}
                                publishedCount={evalHook.evalStats.published}
                                totalStudents={data.students.length}
                                filledCount={evalHook.evalStats.filled}
                                loadError={data.loadError}
                                isLoading={data.isLoading}
                                onRetryLoad={data.fetchAllData}
                                isWalas={isWalas}
                                staleCount={data.staleStudentIds.size}
                            />

                            {/* 3. Action Bar */}
                            <BintangActionBar
                                isWalas={isWalas}
                                studentsCount={data.students.length}
                                isLoading={data.isLoading}
                                loadError={data.loadError}
                                evalHook={evalHook}
                                getAspectSummary={data.getAspectSummary}
                                onOpenAddKeaktifan={() => setIsKeaktifanModalOpen(true)}
                                onOpenAddViolation={() => {
                                    mutations.setViolationStudentId('');
                                    mutations.setViolationSelectedStudentIds([]);
                                    mutations.setViolationStudentSearch('');
                                    mutations.setIsAddViolationModalOpen(true);
                                }}
                                onOpenObservation={() => mutations.setIsObservationModalOpen(true)}
                                onOpenMentoring={mutations.openMentoringModal}
                                onOpenBulkExport={() => setIsBulkExportModalOpen(true)}
                            />

                            {/* 4. Evaluation Table & Bulk Actions */}
                            <BintangEvaluationTable
                                students={data.students}
                                isWalas={isWalas}
                                bulkSelection={bulkSelection}
                                evalHook={evalHook}
                                getAspectSummary={data.getAspectSummary}
                                studentQuizMap={data.studentQuizMap}
                                studentAttitudeMap={data.studentAttitudeMap}
                                selectedMonth={data.selectedMonth}
                                onOpenDetail={(studentId) => setDetailStudentId(studentId)}
                                onOpenBulkExport={() => setIsBulkExportModalOpen(true)}
                                staleStudentIds={data.staleStudentIds}
                            />

                            {/* 5. Collapsible Monthly Trend Chart */}
                            <BintangTrendSection selectedClass={data.selectedClass} />
                        </div>
                    </TabsContent>

                    {/* Tab: Pembinaan */}
                    <TabsContent value="pembinaan" className="mt-6">
                        <PembinaanTab
                            mentoringLogs={data.mentoringLogs}
                            isWalas={isWalas}
                            onOpenMentoringModal={mutations.openMentoringModal}
                            onOpenEditMentoring={mutations.openEditMentoring}
                            onDeleteMentoring={mutations.handleDeleteMentoring}
                        />
                    </TabsContent>
                </Tabs>
            )}

            {/* Confirmation Dialogs */}
            {PublishConfirmDialog}
            {UnpublishConfirmDialog}
            {DeleteQuizDialog}
            {DeleteViolationDialog}
            {DeleteMentoringDialog}
            {DuplicateViolationDialog}

            {/* Action Modals Container */}
            <BintangModalsContainer
                evalHook={evalHook}
                mutations={mutations}
                students={data.students}
                violations={data.violations}
                quizPoints={data.quizPoints}
                dailyObservations={data.dailyObservations}
                evaluations={data.evaluations}
                classes={data.classes}
                selectedClass={data.selectedClass}
                selectedMonth={data.selectedMonth}
                isWalas={isWalas}
                userId={user?.id || ''}
                semesterId={activeSemester?.id || null}
                detailStudentId={detailStudentId}
                onCloseDetailStudent={() => setDetailStudentId(null)}
                onOpenAddViolationForStudent={(sId) => {
                    mutations.setViolationInputMode('single');
                    mutations.setViolationStudentId(sId);
                    mutations.setViolationSelectedStudentIds([]);
                    mutations.setViolationStudentSearch('');
                    mutations.setIsAddViolationModalOpen(true);
                }}
                onOpenKeaktifanModal={() => setIsKeaktifanModalOpen(true)}
                isKeaktifanModalOpen={isKeaktifanModalOpen}
                onCloseKeaktifanModal={() => setIsKeaktifanModalOpen(false)}
                isBulkExportModalOpen={isBulkExportModalOpen}
                onCloseBulkExportModal={() => setIsBulkExportModalOpen(false)}
                bulkSelectedStudentIds={bulkSelection.selectedItems}
                fetchAllData={data.fetchAllData}
                getAspectSummary={data.getAspectSummary}
                studentViolationsMap={data.studentViolationsMap}
                studentQuizMap={data.studentQuizMap}
                studentAttitudeMap={data.studentAttitudeMap}
                getStudentName={data.getStudentName}
            />
        </div>
    );
};

export default BintangDashboardPage;
