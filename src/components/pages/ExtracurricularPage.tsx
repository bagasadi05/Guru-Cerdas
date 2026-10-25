import React, { useState, useCallback, useMemo } from 'react';
import { Trophy, Plus, UserCog, Sparkles } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { useToast } from '../../hooks/useToast';

// Types & Utils
import {
    Extracurricular,
    ExtracurricularStudent,
    EnrollmentView,
} from './extracurricular/types';
import {
    formatLocalDate,
    getGradeFromScore,
    gradeDraftFromSaved,
    DEFAULT_GRADE_DESCRIPTIONS,
    GradeDraft,
} from './extracurricular/extracurricularUtils';
import { useExtracurricularData } from './extracurricular/useExtracurricularData';
import { useExtracurricularMutations } from './extracurricular/useExtracurricularMutations';

// Views & Tabs
import { ExtracurricularMasterView } from './extracurricular/ExtracurricularMasterView';
import { ExtracurricularDetailView } from './extracurricular/ExtracurricularDetailView';
import { MembersTab } from './extracurricular/MembersTab';
import { AttendanceTab } from './extracurricular/AttendanceTab';
import { GradesTab } from './extracurricular/GradesTab';
import { ExternalStudentsManager } from './extracurricular/ExternalStudentsManager';

// Export Services
import {
    exportAttendancePDF,
    exportAttendanceExcel,
    exportGradesPDF,
    exportGradesExcel,
} from './extracurricular/services/extracurricularExportService';

// Modals & Dialogs
import {
    ExtracurricularFormModal,
    ExtracurricularFormData,
    DeleteExtracurricularDialog,
    AddExternalStudentModal,
    EditExternalStudentModal,
    DeleteExternalStudentDialog,
    ConfirmMarkAllDialog,
    NewStudentRow,
    ExtracurricularAttendanceExportModal,
} from './extracurricular/modals';
import { AttendanceExportPeriodConfig } from './extracurricular/extracurricularUtils';

const ExtracurricularPage: React.FC = () => {
    const { userRole } = useAuth();
    const isLeadership =
        userRole === 'kepala_madrasah' ||
        userRole === 'waka_kesiswaan' ||
        userRole === 'waka_kurikulum';
    const canAdd = !isLeadership;
    const toast = useToast();

    // ==================== STATE ====================
    // Navigation / Router State
    const [selectedExtracurricularId, setSelectedExtracurricularId] = useState<string>('');
    const [isExternalStudentsView, setIsExternalStudentsView] = useState(false);

    // Detail State
    const [selectedClassId, setSelectedClassId] = useState<string>('');
    const [selectedDate, setSelectedDate] = useState(() => formatLocalDate(new Date()));

    // Attendance Local State
    const [autoSaveAttendance, setAutoSaveAttendance] = useState(true);
    const [localAttendance, setLocalAttendance] = useState<Record<string, string>>({});

    // Grades Local State
    const [gradeDrafts, setGradeDrafts] = useState<Record<string, GradeDraft>>({});

    // Extracurricular Modals State
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingExtracurricular, setEditingExtracurricular] = useState<Extracurricular | null>(null);
    const [confirmDeleteExtracurricular, setConfirmDeleteExtracurricular] = useState<Extracurricular | null>(null);

    // External Students Modals State
    const [isAddStudentModalOpen, setIsAddStudentModalOpen] = useState(false);
    const [newStudentRows, setNewStudentRows] = useState<NewStudentRow[]>([
        { name: '', gender: 'Laki-laki', class_name: '' },
    ]);
    const [bulkClassName, setBulkClassName] = useState('');
    const [editingExtraStudent, setEditingExtraStudent] = useState<ExtracurricularStudent | null>(null);
    const [confirmDeleteExtraStudent, setConfirmDeleteExtraStudent] = useState<ExtracurricularStudent | null>(null);

    // Bulk Attendance Status Confirmation
    const [confirmMarkAllStatus, setConfirmMarkAllStatus] = useState<string | null>(null);

    // Export Attendance Modal State (1 Bulan, Bulan - Bulan, Semester)
    const [attendanceExportModalOpen, setAttendanceExportModalOpen] = useState(false);
    const [attendanceExportFormat, setAttendanceExportFormat] = useState<'pdf' | 'excel'>('pdf');

    // Extracurricular Form Data
    const [formData, setFormData] = useState<ExtracurricularFormData>({
        name: '',
        category: '',
        description: '',
        schedule_day: '',
        schedule_time: '',
        coach_name: '',
        max_participants: 30,
        is_active: true,
    });

    // ==================== HOOKS ====================
    const {
        loadingExtracurriculars,
        loadingAllExtraStudents,
        extracurriculars,
        selectedExtracurricularData,
        classes,
        participants,
        allExtracurricularStudents,
        enrollments,
        enrollmentCountsByEkskul,
        activeSemester,
        enrolledParticipantIds,
        attendanceMap,
        gradesMap,
        uniqueExtraStudentClasses,
        queryClient,
    } = useExtracurricularData({
        selectedExtracurricular: selectedExtracurricularId,
        selectedClassId,
        selectedDate,
    });

    const mutations = useExtracurricularMutations({
        selectedExtracurricular: selectedExtracurricularId,
        selectedDate,
        editingExtracurricular,
        onModalClose: () => {
            setIsModalOpen(false);
            setEditingExtracurricular(null);
        },
        onAddStudentModalClose: () => {
            setIsAddStudentModalOpen(false);
            setNewStudentRows([{ name: '', gender: 'Laki-laki', class_name: '' }]);
            setBulkClassName('');
        },
    });

    const handleSelectExtracurricular = useCallback((id: string) => {
        setSelectedExtracurricularId(id);
        setLocalAttendance({});
        setGradeDrafts({});
    }, []);

    const handleBackFromDetail = useCallback(() => {
        setSelectedExtracurricularId('');
        setLocalAttendance({});
        setGradeDrafts({});
    }, []);

    // ==================== DERIVED COUNTS FOR DETAIL HEADER ====================
    const attendanceFilledCount = useMemo(() => {
        const merged = { ...attendanceMap, ...localAttendance };
        return enrollments.reduce((count, e) => {
            const key = `${e.participantType}:${e.participantId}`;
            return merged[key] ? count + 1 : count;
        }, 0);
    }, [enrollments, attendanceMap, localAttendance]);

    const gradedCount = useMemo(() => {
        return enrollments.reduce((count, e) => {
            const key = `${e.participantType}:${e.participantId}`;
            const saved = gradesMap[key];
            const draft = gradeDrafts[key];
            const hasVal = Boolean(
                (draft?.grade ?? saved?.grade) ||
                    (draft?.score ?? (saved?.score == null ? '' : String(saved.score))).trim() !==
                        '' ||
                    (draft?.description ?? saved?.description ?? '').trim() !== ''
            );
            return hasVal ? count + 1 : count;
        }, 0);
    }, [enrollments, gradesMap, gradeDrafts]);

    const semesterLabel = useMemo(() => {
        if (!activeSemester) return undefined;
        return `${activeSemester.name} • Semester ${activeSemester.semester_number}`;
    }, [activeSemester]);

    const openExtracurricularModal = useCallback((extracurricular?: Extracurricular) => {
        if (extracurricular) {
            setEditingExtracurricular(extracurricular);
            setFormData({
                name: extracurricular.name,
                category: extracurricular.category || '',
                description: extracurricular.description || '',
                schedule_day: extracurricular.schedule_day || '',
                schedule_time: extracurricular.schedule_time || '',
                coach_name: extracurricular.coach_name || '',
                max_participants: extracurricular.max_participants ?? 30,
                is_active: extracurricular.is_active ?? true,
            });
        } else {
            setEditingExtracurricular(null);
            setFormData({
                name: '',
                category: '',
                description: '',
                schedule_day: '',
                schedule_time: '',
                coach_name: '',
                max_participants: 30,
                is_active: true,
            });
        }
        setIsModalOpen(true);
    }, []);

    // ==================== ATTENDANCE HANDLERS ====================
    const handleAttendanceClick = (
        studentId: string,
        studentType: 'student' | 'extracurricular_student',
        status: string
    ) => {
        if (autoSaveAttendance) {
            mutations.attendanceMutation.mutate({ studentId, studentType, status });
        } else {
            const key =
                studentType === 'student'
                    ? `student:${studentId}`
                    : `extracurricular_student:${studentId}`;
            setLocalAttendance((prev) => ({ ...prev, [key]: status }));
        }
    };

    const handleSaveAttendance = useCallback(() => {
        const items = Object.entries(localAttendance).map(([key, status]) => {
            const [type, id] = key.split(':');
            return {
                studentId: id,
                studentType: (type === 'student' ? 'student' : 'extracurricular_student') as 'student' | 'extracurricular_student',
                status,
            };
        });
        mutations.bulkAttendanceMutation.mutate(items, {
            onSuccess: () => setLocalAttendance({}),
        });
    }, [localAttendance, mutations.bulkAttendanceMutation]);

    const executeMarkAll = useCallback(() => {
        if (!confirmMarkAllStatus) return;
        if (autoSaveAttendance) {
            const items = enrollments.map((e) => ({
                studentId: e.participantId,
                studentType: e.participantType,
                status: confirmMarkAllStatus,
            }));
            mutations.bulkAttendanceMutation.mutate(items);
        } else {
            const newLocal = { ...localAttendance };
            enrollments.forEach((e) => {
                const key =
                    e.participantType === 'student'
                        ? `student:${e.participantId}`
                        : `extracurricular_student:${e.participantId}`;
                newLocal[key] = confirmMarkAllStatus;
            });
            setLocalAttendance(newLocal);
            toast.success(`Semua ditandai ${confirmMarkAllStatus} (Belum disimpan)`);
        }
        setConfirmMarkAllStatus(null);
    }, [
        confirmMarkAllStatus,
        autoSaveAttendance,
        enrollments,
        localAttendance,
        mutations.bulkAttendanceMutation,
        toast,
    ]);

    // ==================== GRADES HANDLERS ====================
    const updateGradeDraft = useCallback(
        (key: string, patch: Partial<GradeDraft>) => {
            setGradeDrafts((prev) => {
                const current = prev[key] || gradeDraftFromSaved(gradesMap[key]);
                return { ...prev, [key]: { ...current, ...patch } };
            });
        },
        [gradesMap]
    );

    const saveGradeEntry = useCallback(
        (enrollment: EnrollmentView, patch?: Partial<GradeDraft>) => {
            const key = `${enrollment.participantType}:${enrollment.participantId}`;
            const savedGrade = gradesMap[key];
            const current = gradeDrafts[key] || gradeDraftFromSaved(savedGrade);
            const next = { ...current, ...patch };
            const scoreText = next.score.trim();
            const description = next.description.trim();
            let normalizedScore: number | null = null;

            if (scoreText) {
                const parsed = Number(scoreText);
                if (!Number.isFinite(parsed) || parsed < 0 || parsed > 100) {
                    toast.warning('Nilai harus berupa angka antara 0 hingga 100');
                    return;
                }
                normalizedScore = parsed;
            }

            const resolvedGrade =
                patch?.grade !== undefined
                    ? patch.grade
                    : normalizedScore !== null
                        ? next.grade ?? getGradeFromScore(normalizedScore)
                        : next.grade;

            setGradeDrafts((prev) => ({
                ...prev,
                [key]: { grade: resolvedGrade, score: scoreText, description },
            }));

            mutations.gradeMutation.mutate({
                studentId: enrollment.participantId,
                studentType: enrollment.participantType,
                grade: resolvedGrade,
                score: normalizedScore,
                description: description || null,
            });
        },
        [gradeDrafts, gradesMap, mutations.gradeMutation, toast]
    );

    const handleAutoFillDescriptions = useCallback(() => {
        const batchItems: Array<{
            studentId: string;
            studentType: 'student' | 'extracurricular_student';
            grade: string | null;
            score: number | null;
            description: string | null;
        }> = [];

        const nextDrafts = { ...gradeDrafts };

        enrollments.forEach((enrollment) => {
            const key = `${enrollment.participantType}:${enrollment.participantId}`;
            const saved = gradesMap[key];
            const current = nextDrafts[key] || gradeDraftFromSaved(saved);
            const scoreText = current.score.trim();
            const parsedScore =
                scoreText !== '' && Number.isFinite(Number(scoreText)) ? Number(scoreText) : null;
            const resolvedGrade =
                current.grade ?? (parsedScore !== null ? getGradeFromScore(parsedScore) : null);

            if (resolvedGrade && !current.description.trim()) {
                const autoDesc = DEFAULT_GRADE_DESCRIPTIONS[resolvedGrade] || '';
                if (autoDesc) {
                    nextDrafts[key] = {
                        grade: resolvedGrade,
                        score: scoreText,
                        description: autoDesc,
                    };
                    batchItems.push({
                        studentId: enrollment.participantId,
                        studentType: enrollment.participantType,
                        grade: resolvedGrade,
                        score: parsedScore,
                        description: autoDesc,
                    });
                }
            }
        });

        if (batchItems.length === 0) {
            toast.info('Semua siswa yang memiliki predikat sudah memiliki deskripsi.');
            return;
        }

        setGradeDrafts(nextDrafts);
        mutations.bulkGradeMutation.mutate(batchItems);
    }, [enrollments, gradeDrafts, gradesMap, mutations.bulkGradeMutation, toast]);

    // ==================== EXPORT HANDLERS ====================
    const handleOpenAttendanceExportModal = useCallback((format: 'pdf' | 'excel') => {
        setAttendanceExportFormat(format);
        setAttendanceExportModalOpen(true);
    }, []);

    const handleExecuteAttendanceExport = useCallback(
        async (config: AttendanceExportPeriodConfig, format: 'pdf' | 'excel') => {
            if (!selectedExtracurricularData) return;
            try {
                if (format === 'pdf') {
                    await exportAttendancePDF({
                        selectedExtracurricular: selectedExtracurricularData,
                        enrollments,
                        queryClient,
                        ...config,
                    });
                    toast.success('Download PDF Presensi berhasil');
                } else {
                    await exportAttendanceExcel({
                        selectedExtracurricular: selectedExtracurricularData,
                        enrollments,
                        queryClient,
                        ...config,
                    });
                    toast.success('Download Excel Presensi berhasil');
                }
            } catch (err: unknown) {
                toast.error(
                    `Gagal export ${format.toUpperCase()}: ${
                        err instanceof Error ? err.message : String(err)
                    }`
                );
            }
        },
        [enrollments, queryClient, selectedExtracurricularData, toast]
    );

    const handleExportAttendancePDF = useCallback(() => {
        handleOpenAttendanceExportModal('pdf');
    }, [handleOpenAttendanceExportModal]);

    const handleExportAttendanceExcel = useCallback(() => {
        handleOpenAttendanceExportModal('excel');
    }, [handleOpenAttendanceExportModal]);

    const handleExportGradesPDF = useCallback(async () => {
        if (!selectedExtracurricularData) return;
        try {
            await exportGradesPDF({
                selectedExtracurricular: selectedExtracurricularData,
                activeSemester,
                enrollments,
                gradesMap,
                gradeDrafts,
            });
            toast.success('Download PDF Nilai berhasil');
        } catch (err: unknown) {
            toast.error(`Gagal export PDF: ${err instanceof Error ? err.message : String(err)}`);
        }
    }, [activeSemester, enrollments, gradeDrafts, gradesMap, selectedExtracurricularData, toast]);

    const handleExportGradesExcel = useCallback(async () => {
        if (!selectedExtracurricularData) return;
        try {
            await exportGradesExcel({
                selectedExtracurricular: selectedExtracurricularData,
                activeSemester,
                enrollments,
                gradesMap,
                gradeDrafts,
            });
            toast.success('Download Excel Nilai berhasil');
        } catch (err: unknown) {
            toast.error(`Gagal export Excel: ${err instanceof Error ? err.message : String(err)}`);
        }
    }, [activeSemester, enrollments, gradeDrafts, gradesMap, selectedExtracurricularData, toast]);

    return (
        <div className="min-h-screen h-full flex flex-col overflow-auto pb-6 px-4 md:px-6">
            {/* Top Navigation Bar / Context Switcher */}
            {!selectedExtracurricularId && (
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 border-b border-slate-200 dark:border-slate-800 pb-4">
                    <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center shadow-lg shadow-amber-500/20 shrink-0">
                            <Trophy className="w-6 h-6 text-white" />
                        </div>
                        <div>
                            <div className="flex flex-wrap items-center gap-2.5">
                                <h1 className="text-2xl lg:text-3xl font-bold text-slate-800 dark:text-white">
                                    Ekstrakurikuler
                                </h1>
                                {semesterLabel && (
                                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300">
                                        <Sparkles className="w-3 h-3" />
                                        {semesterLabel}
                                    </span>
                                )}
                            </div>
                            <p className="text-slate-500 dark:text-slate-400 text-sm mt-0.5">
                                Kelola kegiatan ekstrakurikuler, anggota, presensi pertemuan, dan rekap nilai siswa
                            </p>
                        </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2.5">
                        {canAdd && (
                            <>
                                <button
                                    type="button"
                                    onClick={() =>
                                        setIsExternalStudentsView(!isExternalStudentsView)
                                    }
                                    className={`inline-flex items-center gap-2 px-4 py-2.5 text-sm font-semibold rounded-xl border transition-all ${
                                        isExternalStudentsView
                                            ? 'bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-900/40 dark:text-amber-300 dark:border-amber-700/60'
                                            : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700'
                                    }`}
                                >
                                    <UserCog className="w-4 h-4 text-amber-500" />
                                    <span>Menu Siswa Eksternal</span>
                                    {allExtracurricularStudents.length > 0 && (
                                        <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-amber-500/15 text-amber-700 dark:text-amber-300">
                                            {allExtracurricularStudents.length}
                                        </span>
                                    )}
                                </button>

                                {!isExternalStudentsView && (
                                    <button
                                        type="button"
                                        onClick={() => openExtracurricularModal()}
                                        className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-bold rounded-xl bg-gradient-to-r from-amber-600 to-orange-600 text-white shadow-md shadow-amber-500/20 hover:shadow-lg hover:-translate-y-0.5 transition-all"
                                    >
                                        <Plus className="w-4 h-4" />
                                        Tambah Ekskul
                                    </button>
                                )}
                            </>
                        )}
                    </div>
                </div>
            )}

            {/* View Router */}
            {isExternalStudentsView && !selectedExtracurricularId ? (
                <ExternalStudentsManager
                    students={allExtracurricularStudents}
                    loading={loadingAllExtraStudents}
                    uniqueClasses={uniqueExtraStudentClasses}
                    onAddStudent={() => setIsAddStudentModalOpen(true)}
                    onEditStudent={(s) => setEditingExtraStudent(s)}
                    onDeleteStudent={(s) => setConfirmDeleteExtraStudent(s)}
                    onBack={() => setIsExternalStudentsView(false)}
                    canEdit={canAdd}
                />
            ) : selectedExtracurricularId && selectedExtracurricularData ? (
                <ExtracurricularDetailView
                    extracurricular={selectedExtracurricularData}
                    onBack={handleBackFromDetail}
                    onEdit={(e) => openExtracurricularModal(e)}
                    canEdit={canAdd}
                    enrolledCount={enrollments.length}
                    attendanceFilledCount={attendanceFilledCount}
                    gradedCount={gradedCount}
                    semesterLabel={semesterLabel}
                >
                    {(activeTab) => (
                        <>
                            {activeTab === 'members' && (
                                <MembersTab
                                    extracurricularId={selectedExtracurricularId}
                                    enrollments={enrollments}
                                    participants={participants}
                                    enrolledParticipantIds={enrolledParticipantIds}
                                    classes={classes}
                                    selectedClassId={selectedClassId}
                                    onClassIdChange={setSelectedClassId}
                                    onEnrollmentChange={(id, type, action) =>
                                        mutations.enrollmentMutation.mutate({
                                            studentId: id,
                                            studentType: type,
                                            action,
                                        })
                                    }
                                    onBulkEnroll={(items) =>
                                        mutations.bulkEnrollmentMutation.mutate(items)
                                    }
                                    isEnrolling={mutations.bulkEnrollmentMutation.isPending}
                                    maxParticipants={selectedExtracurricularData.max_participants}
                                    canEdit={canAdd}
                                    onAddExternalStudent={() => setIsAddStudentModalOpen(true)}
                                    onEditExternalStudent={(id) => {
                                        const found = allExtracurricularStudents.find((s) => s.id === id);
                                        if (found) setEditingExtraStudent(found);
                                    }}
                                />
                            )}
                            {activeTab === 'attendance' && (
                                <AttendanceTab
                                    extracurricularId={selectedExtracurricularId}
                                    scheduleDay={selectedExtracurricularData.schedule_day}
                                    enrollments={enrollments}
                                    selectedDate={selectedDate}
                                    onDateChange={setSelectedDate}
                                    attendanceMap={attendanceMap}
                                    localAttendance={localAttendance}
                                    autoSaveAttendance={autoSaveAttendance}
                                    onToggleAutoSave={setAutoSaveAttendance}
                                    onAttendanceClick={handleAttendanceClick}
                                    onMarkAll={setConfirmMarkAllStatus}
                                    onSaveManual={handleSaveAttendance}
                                    onDiscardManual={() => setLocalAttendance({})}
                                    isSaving={mutations.bulkAttendanceMutation.isPending}
                                    canEdit={canAdd}
                                    onExportPDF={handleExportAttendancePDF}
                                    onExportExcel={handleExportAttendanceExcel}
                                    onOpenExportModal={handleOpenAttendanceExportModal}
                                />
                            )}
                            {activeTab === 'grades' && (
                                <GradesTab
                                    extracurricularId={selectedExtracurricularId}
                                    enrollments={enrollments}
                                    gradesMap={gradesMap}
                                    gradeDrafts={gradeDrafts}
                                    onUpdateDraft={updateGradeDraft}
                                    onSaveGrade={saveGradeEntry}
                                    onAutoFillDescriptions={handleAutoFillDescriptions}
                                    isSavingBulk={mutations.bulkGradeMutation.isPending}
                                    canEdit={canAdd}
                                    onExportPDF={handleExportGradesPDF}
                                    onExportExcel={handleExportGradesExcel}
                                />
                            )}
                        </>
                    )}
                </ExtracurricularDetailView>
            ) : (
                <ExtracurricularMasterView
                    extracurriculars={extracurriculars}
                    enrollmentCountsByEkskul={enrollmentCountsByEkskul}
                    loading={loadingExtracurriculars}
                    onSelectExtracurricular={handleSelectExtracurricular}
                    onOpenModal={openExtracurricularModal}
                    onDeleteExtracurricular={setConfirmDeleteExtracurricular}
                    canAdd={canAdd}
                />
            )}

            {/* Modal Add / Edit Extracurricular */}
            <ExtracurricularFormModal
                isOpen={isModalOpen}
                editingExtracurricular={editingExtracurricular}
                formData={formData}
                onChangeFormData={setFormData}
                onClose={() => setIsModalOpen(false)}
                isSubmitting={mutations.extracurricularMutation.isPending}
                onSubmit={(e) => {
                    e.preventDefault();
                    if (!formData.schedule_day) {
                        toast.warning('Pilih minimal satu hari untuk jadwal ekstrakurikuler!');
                        return;
                    }
                    mutations.extracurricularMutation.mutate(formData);
                }}
            />

            {/* Modal Delete Extracurricular */}
            <DeleteExtracurricularDialog
                extracurricular={confirmDeleteExtracurricular}
                onClose={() => setConfirmDeleteExtracurricular(null)}
                isDeleting={mutations.deleteExtracurricularMutation.isPending}
                onConfirm={(id) => {
                    mutations.deleteExtracurricularMutation.mutate(id);
                    setConfirmDeleteExtracurricular(null);
                }}
            />

            {/* Modal Add External Students */}
            <AddExternalStudentModal
                isOpen={isAddStudentModalOpen}
                extracurricularName={selectedExtracurricularData?.name}
                newStudentRows={newStudentRows}
                setNewStudentRows={setNewStudentRows}
                bulkClassName={bulkClassName}
                setBulkClassName={setBulkClassName}
                onClose={() => setIsAddStudentModalOpen(false)}
                isSubmitting={mutations.createStudentsMutation.isPending}
                onSubmit={(e) => {
                    e.preventDefault();
                    mutations.createStudentsMutation.mutate({
                        rows: newStudentRows,
                        bulkClassName,
                    });
                }}
            />

            {/* Modal Edit External Student */}
            <EditExternalStudentModal
                student={editingExtraStudent}
                onChangeStudent={setEditingExtraStudent}
                onClose={() => setEditingExtraStudent(null)}
                isSubmitting={mutations.updateExtraStudentMutation.isPending}
                onSubmit={(e) => {
                    e.preventDefault();
                    if (!editingExtraStudent) return;
                    mutations.updateExtraStudentMutation.mutate(
                        {
                            id: editingExtraStudent.id,
                            name: editingExtraStudent.name,
                            gender: (editingExtraStudent.gender as 'Laki-laki' | 'Perempuan') || 'Laki-laki',
                            class_name: editingExtraStudent.class_name || '',
                        },
                        {
                            onSuccess: () => setEditingExtraStudent(null),
                        }
                    );
                }}
            />

            {/* Modal Delete External Student */}
            <DeleteExternalStudentDialog
                student={confirmDeleteExtraStudent}
                onClose={() => setConfirmDeleteExtraStudent(null)}
                isDeleting={mutations.deleteExtraStudentMutation.isPending}
                onConfirm={(id) => {
                    mutations.deleteExtraStudentMutation.mutate(id, {
                        onSuccess: () => setConfirmDeleteExtraStudent(null),
                    });
                }}
            />

            {/* Modal Confirm Mark All Attendance */}
            <ConfirmMarkAllDialog
                status={confirmMarkAllStatus}
                count={enrollments.length}
                onClose={() => setConfirmMarkAllStatus(null)}
                onConfirm={executeMarkAll}
            />

            {/* Modal Export Attendance (1 Bulan, Bulan - Bulan, Semester) */}
            {attendanceExportModalOpen && selectedExtracurricularData && (
                <ExtracurricularAttendanceExportModal
                    isOpen={attendanceExportModalOpen}
                    onClose={() => setAttendanceExportModalOpen(false)}
                    extracurricular={selectedExtracurricularData}
                    enrollments={enrollments}
                    activeSemester={activeSemester}
                    selectedDate={selectedDate}
                    initialFormat={attendanceExportFormat}
                    onExport={handleExecuteAttendanceExport}
                />
            )}
        </div>
    );
};

export default ExtracurricularPage;
