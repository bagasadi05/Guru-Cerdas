import { useState } from 'react';
import { QueryClient } from '@tanstack/react-query';
import { supabase } from '../../../../../services/supabase';
import { r2StorageService } from '../../../../../services/r2StorageService';
import { AppUser } from '../../../../../hooks/useAuth';
import { useToast } from '../../../../../hooks/useToast';
import { violationList } from '../../../../../services/violations.data';
import { writeAuditLog } from '../../../../../services/auditTrail';
import { resolveSubmitSemesterId } from '../../studentDetailHelpers';
import { type SeverityLevel } from '../../violationMeta';
import { type DuplicateViolationData } from '../../components/DuplicateViolationDialog';
import { ModalState, StudentWithClass, ViolationRow } from '../../types';
import { ViolationFormValues } from '../../schemas';

const getViolationSeverityFromCategory = (category?: string): SeverityLevel | null => {
    const normalized = category?.toLowerCase();
    if (normalized === 'ringan' || normalized === 'sedang' || normalized === 'berat') {
        return normalized as SeverityLevel;
    }
    return null;
};

interface UseStudentViolationActionsParams {
    user: AppUser | null;
    studentId: string | undefined;
    modalState: ModalState;
    selectedSemesterId: string | null;
    activeSemester: { id: string } | null | undefined;
    studentDetails: { student: StudentWithClass; violations: ViolationRow[] } | null;
    filteredViolations: ViolationRow[];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    violationMutation: any;
    queryClient: QueryClient;
    toast: ReturnType<typeof useToast>;
}

export function useStudentViolationActions({
    user,
    studentId,
    modalState,
    selectedSemesterId,
    activeSemester,
    studentDetails,
    filteredViolations,
    violationMutation,
    queryClient,
    toast,
}: UseStudentViolationActionsParams) {
    const [duplicateDialog, setDuplicateDialog] = useState<{
        existingViolation: DuplicateViolationData;
        pendingData: ViolationFormValues & { evidence_file?: File };
    } | null>(null);
    const [violationConflictFields, setViolationConflictFields] = useState<string[]>([]);

    const executeViolationSubmit = async (
        data: ViolationFormValues & { evidence_file?: File },
        options?: { allowDuplicate?: boolean }
    ) => {
        if (!user || !studentId) return;

        const selectedViolation = violationList.find(v => v.description === data.description);
        const existingViolationRecord = modalState.type === 'violation' ? modalState.data : null;
        let evidenceUrl = existingViolationRecord?.evidence_url || null;

        if (data.evidence_file) {
            try {
                const result = await r2StorageService.uploadFile(data.evidence_file, 'violations');
                if (existingViolationRecord?.evidence_url) {
                    await r2StorageService.deleteFile({ publicUrl: existingViolationRecord.evidence_url });
                }
                evidenceUrl = result.publicUrl;
            } catch (error: unknown) {
                toast.error(`Gagal unggah bukti: ${error instanceof Error ? error.message : String(error)}`);
                return;
            }
        }

        const violationPayload = {
            date: data.date,
            description: data.description,
            context_notes: data.context_notes || null,
            points: selectedViolation?.points ?? existingViolationRecord?.points ?? 0,
            type: existingViolationRecord?.type || 'general',
            severity: data.severity || getViolationSeverityFromCategory(selectedViolation?.category) || existingViolationRecord?.severity || null,
            evidence_url: evidenceUrl,
            student_id: studentId,
            user_id: user.id,
            semester_id: resolveSubmitSemesterId(existingViolationRecord?.semester_id, selectedSemesterId, activeSemester?.id),
        };

        if (modalState.type === 'violation' && modalState.data?.id) {
            violationMutation.mutate({ operation: 'edit', data: violationPayload, id: modalState.data.id });
        } else {
            violationMutation.mutate({ operation: 'add', data: violationPayload, allowDuplicate: options?.allowDuplicate });
        }
    };

    const handleViolationSubmit = async (data: ViolationFormValues & { evidence_file?: File }) => {
        if (!user || !studentId) return;

        if (modalState.type === 'violation' && !modalState.data?.id) {
            const localList = studentDetails?.violations || filteredViolations || [];
            let existingViolation: {
                date: string;
                description: string;
                points: number;
                user_id?: string;
                recorded_by_name?: string | null;
            } | undefined = localList.find(
                v => v.date === data.date && v.description === data.description
            );

            if (!existingViolation) {
                const { data: dbRows } = await supabase
                    .from('violations')
                    .select('id, student_id, user_id, date, description, points')
                    .eq('student_id', studentId)
                    .eq('date', data.date)
                    .eq('description', data.description)
                    .is('deleted_at', null)
                    .order('created_at', { ascending: false })
                    .limit(1);

                if (dbRows && dbRows.length > 0) {
                    existingViolation = dbRows[0];
                }
            }

            if (existingViolation) {
                let recordedByName = existingViolation.recorded_by_name || null;
                if (existingViolation.user_id === user.id) {
                    recordedByName = 'Anda';
                } else if (!recordedByName && existingViolation.user_id) {
                    const { data: roleRow } = await supabase
                        .from('user_roles')
                        .select('full_name')
                        .eq('user_id', existingViolation.user_id)
                        .maybeSingle();
                    recordedByName = roleRow?.full_name || 'Guru lain';
                }

                setDuplicateDialog({
                    existingViolation: {
                        recorded_by_name: recordedByName,
                        date: existingViolation.date,
                        description: existingViolation.description,
                        points: existingViolation.points,
                    },
                    pendingData: data,
                });
                return;
            }
        }

        await executeViolationSubmit(data);
    };

    const handleDuplicateConfirm = () => {
        if (duplicateDialog) {
            const data = duplicateDialog.pendingData;
            setDuplicateDialog(null);
            executeViolationSubmit(data, { allowDuplicate: true });
        }
    };

    const handleDuplicateCancel = () => {
        if (duplicateDialog) {
            setViolationConflictFields(['date', 'description']);
        }
        setDuplicateDialog(null);
    };

    const handleNotifyParent = async (violation: ViolationRow) => {
        try {
            if (!studentDetails?.student || !user) return;
            const notifiedAt = new Date().toISOString();

            const message = `[NOTIFIKASI PELANGGARAN]\n\nYth. Orang Tua/Wali ${studentDetails.student.name},\n\nKami informasikan bahwa anak Anda telah melakukan pelanggaran:\n\n📋 Jenis: ${violation.description}\n📅 Tanggal: ${new Date(violation.date).toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}\n⚠️ Poin: ${violation.points}\n\nMohon perhatian dan kerjasamanya untuk membimbing anak di rumah.\n\nTerima kasih.`;

            const { error: commError } = await supabase
                .from('communications')
                .insert({
                    student_id: studentId!,
                    teacher_id: user.id,
                    user_id: user.id,
                    message,
                    sender: 'teacher',
                    is_read: false
                });

            if (commError) throw commError;

            const { data: updated, error: updateError } = await supabase.rpc('update_accessible_violation_follow_up', {
                p_violation_id: violation.id,
                p_parent_notified: true,
                p_parent_notified_at: notifiedAt,
            });

            if (updateError) throw updateError;
            if (!updated) throw new Error('Status notifikasi pelanggaran tidak dapat diperbarui.');

            queryClient.invalidateQueries({ queryKey: ['studentStats', studentId] });
            queryClient.invalidateQueries({ queryKey: ['studentComms', studentId] });
            queryClient.invalidateQueries({ queryKey: ['studentCommsUnreadCount', studentId] });
            await writeAuditLog({
                userId: user.id,
                userEmail: user.email,
                tableName: 'violations',
                recordId: violation.id,
                action: 'UPDATE',
                oldData: { parent_notified: violation.parent_notified || false },
                newData: { parent_notified: true, parent_notified_at: notifiedAt },
            });
            toast.success('Notifikasi pelanggaran berhasil dikirim ke orang tua!');
        } catch (error: unknown) {
            toast.error(`Gagal mengirim notifikasi: ${error instanceof Error ? error.message : String(error)}`);
        }
    };

    return {
        duplicateDialog,
        violationConflictFields,
        setViolationConflictFields,
        handleViolationSubmit,
        handleDuplicateConfirm,
        handleDuplicateCancel,
        handleNotifyParent,
    };
}
