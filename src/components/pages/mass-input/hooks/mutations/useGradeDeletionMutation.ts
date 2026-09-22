import React, { useState } from 'react';
import { useMutation, QueryClient } from '@tanstack/react-query';
import { supabase } from '../../../../../services/supabase';
import { AppUser } from '../../../../../hooks/useAuth';
import { AcademicRecordRow } from '../../types';
import { recordAction } from '../../../../../services/UndoManager';
import { useToast } from '../../../../../hooks/useToast';

interface UseGradeDeletionMutationParams {
    user: AppUser | null;
    subjectGradeInfo: { subject: string; assessment_name: string; semester: string };
    existingGrades: AcademicRecordRow[] | undefined;
    selectedStudentIds: Set<string>;
    setScores: React.Dispatch<React.SetStateAction<Record<string, string>>>;
    setSelectedStudentIds: React.Dispatch<React.SetStateAction<Set<string>>>;
    isScoresDirtyRef: React.MutableRefObject<boolean>;
    setIsScoresDirty?: (isDirty: boolean) => void;
    queryClient: QueryClient;
    toast: ReturnType<typeof useToast>;
}

export function useGradeDeletionMutation({
    user,
    subjectGradeInfo,
    existingGrades,
    selectedStudentIds,
    setScores,
    setSelectedStudentIds,
    isScoresDirtyRef,
    setIsScoresDirty,
    queryClient,
    toast,
}: UseGradeDeletionMutationParams) {
    const [confirmDeleteModal, setConfirmDeleteModal] = useState<{ isOpen: boolean; count: number }>({ isOpen: false, count: 0 });
    const [confirmDeleteText, setConfirmDeleteText] = useState('');

    const { mutate: deleteGrades, mutateAsync: deleteGradesAsync, isPending: isDeleting } = useMutation({
        mutationFn: async ({ studentIds, recordIds }: { studentIds: string[]; recordIds: string[] }) => {
            if (studentIds.length === 0 && recordIds.length === 0) {
                throw new Error('Pilih setidaknya satu siswa untuk dihapus.');
            }

            let deletedRecords: { id: string }[] = [];
            let query = supabase
                .from('academic_records')
                .update({ deleted_at: new Date().toISOString() } as never);

            if (recordIds.length > 0) {
                query = query.in('id', recordIds);
            } else {
                query = query
                    .in('student_id', studentIds)
                    .eq('subject', subjectGradeInfo.subject)
                    .eq('assessment_name', subjectGradeInfo.assessment_name)
                    .is('deleted_at', null);

                if (subjectGradeInfo.semester) {
                    query = query.eq('semester_id', subjectGradeInfo.semester);
                }
            }

            const { data, error } = await query.select('id');
            if (error) throw error;
            deletedRecords = data || [];

            if (user && deletedRecords.length > 0) {
                await recordAction(user.id, 'delete', 'academic_records', deletedRecords.map(d => d.id));
            }
            return deletedRecords.length > 0
                ? `${deletedRecords.length} data nilai berhasil dihapus.`
                : 'Nilai yang dipilih berhasil dibersihkan dari daftar input.';
        },
        onSuccess: (message) => {
            toast.success(message);
            // Clear local scores for deleted students and update dirty state atomically from next scores
            setScores(prev => {
                const next = { ...prev };
                selectedStudentIds.forEach(id => {
                    delete next[id];
                });
                const hasRemaining = Object.values(next).some(v => typeof v === 'string' && v.trim() !== '');
                if (isScoresDirtyRef) {
                    isScoresDirtyRef.current = hasRemaining;
                }
                setIsScoresDirty?.(hasRemaining);
                return next;
            });
            queryClient.invalidateQueries({ queryKey: ['existingGrades'] });
            queryClient.invalidateQueries({ queryKey: ['studentDetails'] });
            queryClient.invalidateQueries({ queryKey: ['studentStats'] });
            queryClient.invalidateQueries({ queryKey: ['deleted-items'] });
            queryClient.invalidateQueries({ queryKey: ['deleted-items-all'] });
            setConfirmDeleteModal({ isOpen: false, count: 0 });
            setSelectedStudentIds(new Set());
        },
        onError: (err: Error) => toast.error(`Gagal menghapus: ${err.message}`),
    });

    const handleConfirmDelete = () => {
        const studentIds = Array.from(selectedStudentIds);
        const recordIds = (existingGrades || [])
            .filter(g => selectedStudentIds.has(g.student_id))
            .map(g => g.id);

        deleteGrades({ studentIds, recordIds });
    };

    const handleDeleteSelected = () => {
        setConfirmDeleteModal({ isOpen: true, count: selectedStudentIds.size });
    };

    return {
        deleteGrades,
        deleteGradesAsync,
        isDeleting,
        confirmDeleteModal,
        setConfirmDeleteModal,
        confirmDeleteText,
        setConfirmDeleteText,
        handleConfirmDelete,
        handleDeleteSelected,
    };
}
