import { useState, useEffect, useMemo } from 'react';
import { supabase } from '../../../../services/supabase';
import { bintangService } from '../../../../services/bintangService';
import { writeAuditLog } from '../../../../services/auditTrail';
import { r2StorageService } from '../../../../services/r2StorageService';
import { violationList } from '../../../../services/violations.data';
import { formatLocalDate } from '../../../../hooks/dashboard/dashboardHelpers';
import { ViolationFormValues, QuizFormValues } from '../../student/schemas';
import { ViolationRow, QuizPointRow } from '../../student/types';
import { useConfirmation } from '../../../ui/ConfirmationDialog';
import { useToast } from '../../../../hooks/useToast';
import { useAuth } from '../../../../hooks/useAuth';
import { useSemester } from '../../../../contexts/SemesterContext';
import {
    getViolationSeverityFromCategory,
    type BintangStudent,
    type BintangViolation,
    type MentoringLogItem,
} from '../types/bintangDashboardTypes';
import type { MentoringLog } from '../tabs/PembinaanTab';

type ConfirmFn = ReturnType<typeof useConfirmation>['confirm'];
type ToastFn = ReturnType<typeof useToast>;
type AuthUser = ReturnType<typeof useAuth>['user'];
type ActiveSemester = ReturnType<typeof useSemester>['activeSemester'];

interface UseBintangMutationsOptions {
    user: AuthUser;
    activeSemester: ActiveSemester;
    students: BintangStudent[];
    violations: BintangViolation[];
    selectedClass: string;
    fetchAllData: () => Promise<void>;
    confirmDeleteViolation: ConfirmFn;
    confirmDuplicateViolation: ConfirmFn;
    confirmDeleteQuiz: ConfirmFn;
    confirmDeleteMentoring: ConfirmFn;
    toast: ToastFn;
    getStudentName: (id: string) => string;
}

export function useBintangMutations({
    user,
    activeSemester,
    students,
    violations,
    selectedClass,
    fetchAllData,
    confirmDeleteViolation,
    confirmDuplicateViolation,
    confirmDeleteQuiz,
    confirmDeleteMentoring,
    toast,
    getStudentName,
}: UseBintangMutationsOptions) {
    // ── Violation state ──────────────────────────────────────────────────────
    const [isViolationModalOpen, setIsViolationModalOpen] = useState(false);
    const [editingViolation, setEditingViolation] = useState<ViolationRow | null>(null);
    const [isViolationSaving, setIsViolationSaving] = useState(false);
    const [isAddViolationModalOpen, setIsAddViolationModalOpen] = useState(false);
    const [violationStudentId, setViolationStudentId] = useState('');
    const [violationInputMode, setViolationInputMode] = useState<'single' | 'bulk'>('single');
    const [violationSelectedStudentIds, setViolationSelectedStudentIds] = useState<string[]>([]);
    const [violationStudentSearch, setViolationStudentSearch] = useState('');

    // ── Quiz point state ─────────────────────────────────────────────────────
    const [isQuizModalOpen, setIsQuizModalOpen] = useState(false);
    const [editingQuizPoint, setEditingQuizPoint] = useState<QuizPointRow | null>(null);
    const [isQuizSaving, setIsQuizSaving] = useState(false);

    // ── Mentoring state ──────────────────────────────────────────────────────
    const [isMentoringModalOpen, setIsMentoringModalOpen] = useState(false);
    const [mentoringClass, setMentoringClass] = useState('');
    const [mentoringTargetType, setMentoringTargetType] = useState<'all' | 'specific'>('all');
    const [mentoringStudentsInClass, setMentoringStudentsInClass] = useState<
        Array<{ id: string; name: string; parent_phone?: string | null; parent_name?: string | null }>
    >([]);
    const [mentoringSelectedStudents, setMentoringSelectedStudents] = useState<string[]>([]);
    const [mentoringRole, setMentoringRole] = useState('WALAS');
    const [mentoringDate, setMentoringDate] = useState(formatLocalDate());
    const [mentoringNotes, setMentoringNotes] = useState('');
    const [isMentoringSubmitting, setIsMentoringSubmitting] = useState(false);
    const [editingMentoringLog, setEditingMentoringLog] = useState<MentoringLogItem | null>(null);
    const [isMentoringEditModalOpen, setIsMentoringEditModalOpen] = useState(false);

    // ── Observation state ────────────────────────────────────────────────────
    const [isObservationModalOpen, setIsObservationModalOpen] = useState(false);
    const [obsStudentId, setObsStudentId] = useState('');
    const [obsAspect, setObsAspect] = useState('ADAB');
    const [obsIsPositive, setObsIsPositive] = useState(true);
    const [obsNotes, setObsNotes] = useState('');
    const [isObsSubmitting, setIsObsSubmitting] = useState(false);

    // Fetch students for mentoring modal class selection
    useEffect(() => {
        if (mentoringClass) {
            const fetchStudents = async () => {
                const { data } = await supabase
                    .from('students')
                    .select('id, name, parent_phone, parent_name')
                    .eq('class_id', mentoringClass)
                    .is('deleted_at', null)
                    .order('name');
                setMentoringStudentsInClass(data || []);
                setMentoringSelectedStudents([]);
            };
            void fetchStudents();
        } else {
            setMentoringStudentsInClass([]);
            setMentoringSelectedStudents([]);
        }
    }, [mentoringClass]);

    // Bulk violation filtering & selection
    const filteredViolationStudents = useMemo(() => {
        if (!violationStudentSearch.trim()) return students;
        const q = violationStudentSearch.toLowerCase();
        return students.filter((s) => s.name.toLowerCase().includes(q));
    }, [students, violationStudentSearch]);

    const toggleViolationStudent = (id: string) => {
        setViolationSelectedStudentIds((prev) =>
            prev.includes(id) ? prev.filter((sid) => sid !== id) : [...prev, id]
        );
    };

    const selectAllViolationStudents = () => {
        setViolationSelectedStudentIds(filteredViolationStudents.map((s) => s.id));
    };

    const deselectAllViolationStudents = () => {
        setViolationSelectedStudentIds([]);
    };

    // Mentoring Actions
    const openMentoringModal = () => {
        setMentoringClass(selectedClass);
        setIsMentoringModalOpen(true);
    };

    const handleMentoringSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!mentoringClass || !mentoringNotes || isMentoringSubmitting) return;
        if (mentoringTargetType === 'specific' && mentoringSelectedStudents.length === 0) {
            toast.error('Pilih minimal satu siswa untuk pembinaan');
            return;
        }

        setIsMentoringSubmitting(true);
        try {
            let targetStudentIds = mentoringSelectedStudents;
            if (mentoringTargetType === 'all') {
                targetStudentIds = mentoringStudentsInClass.map((s) => s.id);
            }

            if (targetStudentIds.length === 0) {
                toast.error('Tidak ada siswa aktif di kelas ini');
                setIsMentoringSubmitting(false);
                return;
            }

            const newLogs = targetStudentIds.map((id) => ({
                student_id: id,
                mentor_role: mentoringRole,
                mentor_id: user?.id || '',
                date: mentoringDate,
                notes: mentoringNotes,
            }));

            await bintangService.bulkInsertMentoringLogs(newLogs);
            toast.success('Catatan pembinaan berhasil disimpan');
            setIsMentoringModalOpen(false);
            setMentoringNotes('');
            await fetchAllData();
        } catch (error) {
            console.error(error);
            toast.error('Gagal menyimpan catatan pembinaan');
        } finally {
            setIsMentoringSubmitting(false);
        }
    };

    const openEditMentoring = (log: MentoringLog) => {
        setEditingMentoringLog(log);
        setMentoringDate(log.date);
        setMentoringNotes(log.notes);
        setMentoringRole(log.mentor_role);
        setIsMentoringEditModalOpen(true);
    };

    const handleSaveMentoringEdit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!editingMentoringLog || !mentoringNotes) return;
        setIsMentoringSubmitting(true);
        try {
            await bintangService.updateMentoringLog(editingMentoringLog.id, {
                date: mentoringDate,
                notes: mentoringNotes,
                mentor_role: mentoringRole,
            });
            toast.success('Catatan pembinaan berhasil diperbarui');
            setIsMentoringEditModalOpen(false);
            setEditingMentoringLog(null);
            await fetchAllData();
        } catch (error: unknown) {
            console.error(error);
            toast.error(error instanceof Error ? error.message : 'Gagal memperbarui catatan pembinaan');
        } finally {
            setIsMentoringSubmitting(false);
        }
    };

    const handleDeleteMentoring = async (log: MentoringLog) => {
        const studentName = log.students?.name || 'Siswa';
        await confirmDeleteMentoring({
            title: 'Hapus Catatan Pembinaan',
            message: `Yakin ingin menghapus catatan pembinaan untuk ${studentName}?`,
            confirmText: 'Ya, Hapus',
            variant: 'danger',
            onConfirm: async () => {
                try {
                    await bintangService.deleteMentoringLog(log.id);
                    toast.success('Catatan pembinaan berhasil dihapus');
                    await fetchAllData();
                } catch (error: unknown) {
                    console.error(error);
                    toast.error(error instanceof Error ? error.message : 'Gagal menghapus catatan pembinaan');
                }
            },
        });
    };

    // Observation Actions
    const handleObservationSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!obsStudentId || !obsNotes || isObsSubmitting) return;

        setIsObsSubmitting(true);
        try {
            await bintangService.insertDailyObservation({
                student_id: obsStudentId,
                teacher_id: user?.id || '',
                date: formatLocalDate(),
                aspect: obsAspect,
                is_positive: obsIsPositive,
                observation: obsNotes,
            });
            toast.success('Observasi harian berhasil disimpan');
            setIsObservationModalOpen(false);
            setObsNotes('');
            setObsStudentId('');
        } catch (error) {
            console.error(error);
            toast.error('Gagal menyimpan observasi harian');
        } finally {
            setIsObsSubmitting(false);
        }
    };

    // Violation Actions
    const openEditViolation = (v: ViolationRow) => {
        setEditingViolation(v);
        setIsViolationModalOpen(true);
    };

    const handleSaveViolation = async (data: ViolationFormValues & { evidence_file?: File }) => {
        if (!user || !editingViolation || isViolationSaving) return;
        setIsViolationSaving(true);
        try {
            const selectedViolation = violationList.find((v) => v.description === data.description);
            let evidenceUrl = editingViolation.evidence_url || null;

            if (data.evidence_file) {
                const result = await r2StorageService.uploadFile(data.evidence_file, 'violations');
                if (editingViolation.evidence_url) {
                    try {
                        await r2StorageService.deleteFile({ publicUrl: editingViolation.evidence_url });
                    } catch (e) {
                        console.warn('Gagal menghapus bukti lama:', e);
                    }
                }
                evidenceUrl = result.publicUrl;
            }

            const payload = {
                date: data.date,
                description: data.description,
                context_notes: data.context_notes || null,
                points: selectedViolation?.points ?? editingViolation.points ?? 0,
                severity:
                    data.severity ||
                    getViolationSeverityFromCategory(selectedViolation?.category) ||
                    editingViolation.severity ||
                    null,
                evidence_url: evidenceUrl,
            };

            await bintangService.updateViolation(editingViolation.id, payload);
            try {
                await writeAuditLog({
                    userId: user.id,
                    userEmail: user.email,
                    tableName: 'violations',
                    recordId: editingViolation.id,
                    action: 'UPDATE',
                    oldData: {
                        date: editingViolation.date,
                        description: editingViolation.description,
                        points: editingViolation.points,
                        severity: editingViolation.severity,
                        context_notes: editingViolation.context_notes,
                    },
                    newData: payload,
                });
            } catch (auditErr) {
                console.warn('Gagal menulis audit log pelanggaran:', auditErr);
            }
            toast.success('Pelanggaran berhasil diperbarui');
            setIsViolationModalOpen(false);
            setEditingViolation(null);
            await fetchAllData();
        } catch (error: unknown) {
            console.error('Gagal memperbarui pelanggaran:', error);
            toast.error(error instanceof Error ? error.message : 'Gagal memperbarui pelanggaran');
        } finally {
            setIsViolationSaving(false);
        }
    };

    const handleDeleteViolation = async (v: ViolationRow) => {
        const studentName = v.students?.name || getStudentName(v.student_id);
        await confirmDeleteViolation({
            title: 'Hapus Pelanggaran',
            message: `Yakin ingin menghapus pelanggaran "${v.description}" milik ${studentName}? Catatan akan dipindah ke tempat sampah (soft delete).`,
            confirmText: 'Ya, Hapus',
            variant: 'danger',
            onConfirm: async () => {
                try {
                    await bintangService.softDeleteViolation(v.id);
                    try {
                        await writeAuditLog({
                            userId: user?.id || '',
                            userEmail: user?.email || '',
                            tableName: 'violations',
                            recordId: v.id,
                            action: 'DELETE',
                            oldData: { description: v.description, points: v.points, date: v.date },
                            newData: null,
                        });
                    } catch (auditErr) {
                        console.warn('Gagal menulis audit log hapus pelanggaran:', auditErr);
                    }
                    toast.success('Pelanggaran berhasil dihapus');
                    await fetchAllData();
                } catch (error: unknown) {
                    console.error('Gagal menghapus pelanggaran:', error);
                    toast.error(error instanceof Error ? error.message : 'Gagal menghapus pelanggaran');
                }
            },
        });
    };

    const handleAddViolation = async (data: ViolationFormValues & { evidence_file?: File }) => {
        if (!user || isViolationSaving) return;

        const targetIds =
            violationInputMode === 'single'
                ? violationStudentId
                    ? [violationStudentId]
                    : []
                : violationSelectedStudentIds;

        if (targetIds.length === 0) {
            toast.error(
                violationInputMode === 'single' ? 'Pilih siswa terlebih dahulu' : 'Pilih minimal satu siswa'
            );
            return;
        }

        setIsViolationSaving(true);
        try {
            const normalizedDesc = (data.description || '').trim().toLowerCase();
            const localDuplicates = new Map<string, BintangViolation>();
            for (const sid of targetIds) {
                const match = violations.find(
                    (v) =>
                        v.student_id === sid &&
                        v.date === data.date &&
                        (v.description || '').trim().toLowerCase() === normalizedDesc
                );
                if (match) localDuplicates.set(sid, match);
            }

            const { data: dbVios, error: dbErr } = await supabase
                .from('violations')
                .select('id, student_id, date, description, points, severity, context_notes, evidence_url')
                .in('student_id', targetIds)
                .eq('date', data.date)
                .eq('description', data.description)
                .is('deleted_at', null);

            if (dbErr) console.warn('Gagal memeriksa duplikasi pelanggaran di database:', dbErr);

            const dbDuplicates = new Map<
                string,
                {
                    id: string;
                    points?: number;
                    severity?: string | null;
                    evidence_url?: string | null;
                    context_notes?: string | null;
                }
            >();
            (dbVios || []).forEach((row) => {
                dbDuplicates.set(row.student_id, row);
            });

            const allDuplicateStudentIds = Array.from(
                new Set([...Array.from(localDuplicates.keys()), ...Array.from(dbDuplicates.keys())])
            );

            // Single student duplicate check
            if (violationInputMode === 'single' || targetIds.length === 1) {
                const singleStudentId = targetIds[0];
                const studentName = students.find((s) => s.id === singleStudentId)?.name || 'Siswa';

                if (allDuplicateStudentIds.includes(singleStudentId)) {
                    const existingRow = dbDuplicates.get(singleStudentId) || localDuplicates.get(singleStudentId);
                    const shouldUpdate = await confirmDuplicateViolation({
                        title: 'Pelanggaran Sudah Tercatat Hari Ini',
                        message: `${studentName} sudah memiliki catatan pelanggaran "${data.description}" pada hari ini (${data.date}).\n\nApakah Anda ingin memperbarui catatan tersebut dengan keterangan baru?`,
                        confirmText: 'Perbarui Catatan',
                        cancelText: 'Batal',
                        variant: 'warning',
                        onConfirm: async () => {},
                    });

                    if (!shouldUpdate) return;

                    if (existingRow?.id) {
                        const selectedViolation = violationList.find((v) => v.description === data.description);
                        let evidenceUrl = existingRow.evidence_url || null;
                        if (data.evidence_file) {
                            const result = await r2StorageService.uploadFile(data.evidence_file, 'violations');
                            evidenceUrl = result.publicUrl;
                        }
                        const updatePayload = {
                            date: data.date,
                            description: data.description,
                            context_notes: data.context_notes || existingRow.context_notes || null,
                            points: selectedViolation?.points ?? existingRow.points ?? 0,
                            severity:
                                data.severity ||
                                getViolationSeverityFromCategory(selectedViolation?.category) ||
                                existingRow.severity ||
                                null,
                            evidence_url: evidenceUrl,
                        };
                        await bintangService.updateViolation(existingRow.id, updatePayload);
                        toast.success(`Catatan pelanggaran ${studentName} berhasil diperbarui`);
                        setIsAddViolationModalOpen(false);
                        setViolationStudentId('');
                        await fetchAllData();
                        return;
                    }
                }
            }

            // Bulk students duplicate check
            let idsToInsert = targetIds;
            if (allDuplicateStudentIds.length > 0) {
                const duplicateNames = allDuplicateStudentIds.map(
                    (sid) => students.find((s) => s.id === sid)?.name || 'Siswa'
                );

                if (allDuplicateStudentIds.length >= targetIds.length) {
                    toast.warning(
                        targetIds.length === 1
                            ? `${duplicateNames[0]} sudah memiliki catatan pelanggaran "${data.description}" pada hari ini (${data.date}).`
                            : `Seluruh ${targetIds.length} siswa yang dipilih sudah memiliki catatan pelanggaran "${data.description}" pada hari ini (${data.date}).`
                    );
                    return;
                }

                const nonDuplicateIds = targetIds.filter((id) => !allDuplicateStudentIds.includes(id));
                const confirmMsg = `${allDuplicateStudentIds.length} siswa (${duplicateNames.slice(0, 3).join(', ')}${allDuplicateStudentIds.length > 3 ? '...' : ''}) sudah memiliki catatan pelanggaran "${data.description}" pada hari ini dan akan dilewati.\n\nLanjutkan mencatat pelanggaran untuk ${nonDuplicateIds.length} siswa lainnya?`;

                const shouldProceed = await confirmDuplicateViolation({
                    title: 'Sebagian Siswa Sudah Tercatat Hari Ini',
                    message: confirmMsg,
                    confirmText: `Catat untuk ${nonDuplicateIds.length} Siswa Lainnya`,
                    cancelText: 'Batal',
                    variant: 'warning',
                    onConfirm: async () => {},
                });

                if (!shouldProceed) return;
                idsToInsert = nonDuplicateIds;
            }

            if (idsToInsert.length === 0) return;

            const selectedViolation = violationList.find((v) => v.description === data.description);
            let evidenceUrl: string | null = null;
            if (data.evidence_file) {
                const result = await r2StorageService.uploadFile(data.evidence_file, 'violations');
                evidenceUrl = result.publicUrl;
            }

            const points = selectedViolation?.points ?? 0;
            const severity =
                data.severity || getViolationSeverityFromCategory(selectedViolation?.category) || null;
            const type = selectedViolation?.code || 'general';

            const payloads = idsToInsert.map((student_id) => ({
                date: data.date,
                description: data.description,
                context_notes: data.context_notes || null,
                points,
                type,
                severity,
                evidence_url: evidenceUrl,
                student_id,
                user_id: user.id,
                semester_id: activeSemester?.id || null,
            }));

            await bintangService.bulkInsertViolations(payloads);
            try {
                await writeAuditLog({
                    userId: user.id,
                    userEmail: user.email,
                    tableName: 'violations',
                    recordId: idsToInsert.length === 1 ? idsToInsert[0] : 'bulk',
                    action: 'INSERT',
                    oldData: null,
                    newData: { count: idsToInsert.length, description: data.description, points } as Record<string, unknown>,
                });
            } catch (auditErr) {
                console.warn('Gagal menulis audit log pelanggaran baru:', auditErr);
            }
            const skippedCount = targetIds.length - idsToInsert.length;
            toast.success(
                idsToInsert.length === 1
                    ? 'Pelanggaran berhasil dicatat'
                    : skippedCount > 0
                        ? `Pelanggaran berhasil dicatat untuk ${idsToInsert.length} siswa (${skippedCount} siswa dilewati karena sudah tercatat)`
                        : `Pelanggaran berhasil dicatat untuk ${idsToInsert.length} siswa`
            );
            setIsAddViolationModalOpen(false);
            setViolationStudentId('');
            setViolationSelectedStudentIds([]);
            setViolationStudentSearch('');
            await fetchAllData();
        } catch (error: unknown) {
            console.error('Gagal mencatat pelanggaran:', error);
            toast.error(error instanceof Error ? error.message : 'Gagal mencatat pelanggaran');
        } finally {
            setIsViolationSaving(false);
        }
    };

    // Quiz Point Actions
    const openEditQuiz = (q: QuizPointRow) => {
        setEditingQuizPoint(q);
        setIsQuizModalOpen(true);
    };

    const handleSaveQuiz = async (data: QuizFormValues) => {
        if (!user || !editingQuizPoint) return;
        setIsQuizSaving(true);
        try {
            const payload = {
                quiz_date: data.quiz_date,
                subject: data.subject || null,
                quiz_name: data.quiz_name,
                category: data.category || null,
            };
            await bintangService.updateQuizPoint(editingQuizPoint.id, payload);
            try {
                await writeAuditLog({
                    userId: user.id,
                    userEmail: user.email,
                    tableName: 'quiz_points',
                    recordId: editingQuizPoint.id,
                    action: 'UPDATE',
                    oldData: {
                        quiz_date: editingQuizPoint.quiz_date,
                        quiz_name: editingQuizPoint.quiz_name,
                        subject: editingQuizPoint.subject,
                        category: editingQuizPoint.category,
                    },
                    newData: payload,
                });
            } catch (auditErr) {
                console.warn('Gagal menulis audit log poin keaktifan:', auditErr);
            }
            toast.success('Poin keaktifan berhasil diperbarui');
            setIsQuizModalOpen(false);
            setEditingQuizPoint(null);
            await fetchAllData();
        } catch (error: unknown) {
            console.error('Gagal memperbarui poin keaktifan:', error);
            toast.error(error instanceof Error ? error.message : 'Gagal memperbarui poin keaktifan');
        } finally {
            setIsQuizSaving(false);
        }
    };

    const handleDeleteQuiz = async (q: QuizPointRow) => {
        const studentName = getStudentName(q.student_id);
        await confirmDeleteQuiz({
            title: 'Hapus Poin Keaktifan',
            message: `Yakin ingin menghapus poin keaktifan "${q.quiz_name || 'Aktivitas'}" milik ${studentName}?`,
            confirmText: 'Ya, Hapus',
            variant: 'danger',
            onConfirm: async () => {
                try {
                    await bintangService.softDeleteQuizPoint(q.id);
                    try {
                        await writeAuditLog({
                            userId: user?.id || '',
                            userEmail: user?.email || '',
                            tableName: 'quiz_points',
                            recordId: q.id,
                            action: 'DELETE',
                            oldData: { quiz_name: q.quiz_name, points: q.points, quiz_date: q.quiz_date },
                            newData: null,
                        });
                    } catch (auditErr) {
                        console.warn('Gagal menulis audit log hapus poin:', auditErr);
                    }
                    toast.success('Poin keaktifan berhasil dihapus');
                    await fetchAllData();
                } catch (error: unknown) {
                    console.error('Gagal menghapus poin keaktifan:', error);
                    toast.error(error instanceof Error ? error.message : 'Gagal menghapus poin keaktifan');
                }
            },
        });
    };

    return {
        // Violation
        isViolationModalOpen,
        setIsViolationModalOpen,
        editingViolation,
        setEditingViolation,
        isViolationSaving,
        isAddViolationModalOpen,
        setIsAddViolationModalOpen,
        violationStudentId,
        setViolationStudentId,
        violationInputMode,
        setViolationInputMode,
        violationSelectedStudentIds,
        setViolationSelectedStudentIds,
        violationStudentSearch,
        setViolationStudentSearch,
        filteredViolationStudents,
        toggleViolationStudent,
        selectAllViolationStudents,
        deselectAllViolationStudents,
        openEditViolation,
        handleSaveViolation,
        handleDeleteViolation,
        handleAddViolation,
        // Quiz
        isQuizModalOpen,
        setIsQuizModalOpen,
        editingQuizPoint,
        setEditingQuizPoint,
        isQuizSaving,
        openEditQuiz,
        handleSaveQuiz,
        handleDeleteQuiz,
        // Mentoring
        isMentoringModalOpen,
        setIsMentoringModalOpen,
        mentoringClass,
        setMentoringClass,
        mentoringTargetType,
        setMentoringTargetType,
        mentoringStudentsInClass,
        mentoringSelectedStudents,
        setMentoringSelectedStudents,
        mentoringRole,
        setMentoringRole,
        mentoringDate,
        setMentoringDate,
        mentoringNotes,
        setMentoringNotes,
        isMentoringSubmitting,
        editingMentoringLog,
        setEditingMentoringLog,
        isMentoringEditModalOpen,
        setIsMentoringEditModalOpen,
        openMentoringModal,
        openEditMentoring,
        handleMentoringSubmit,
        handleSaveMentoringEdit,
        handleDeleteMentoring,
        // Observation
        isObservationModalOpen,
        setIsObservationModalOpen,
        obsStudentId,
        setObsStudentId,
        obsAspect,
        setObsAspect,
        obsIsPositive,
        setObsIsPositive,
        obsNotes,
        setObsNotes,
        isObsSubmitting,
        handleObservationSubmit,
    };
}
