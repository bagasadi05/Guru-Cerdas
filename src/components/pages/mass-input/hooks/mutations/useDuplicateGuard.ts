import { useState, useRef } from 'react';
import { supabase } from '../../../../../services/supabase';
import { AppUser } from '../../../../../hooks/useAuth';
import { StudentRow, InputMode } from '../../types';
import { ViolationItem } from '../../../../../services/violations.data';

export const DUPLICATE_GUARD_WINDOW_MINUTES = 10;

export const getDuplicateGuardWindowIso = (): string => (
    new Date(Date.now() - DUPLICATE_GUARD_WINDOW_MINUTES * 60 * 1000).toISOString()
);

export interface DuplicateItem {
    student_id: string;
    student_name: string;
    recorded_by_name: string | null;
    description: string;
    date: string;
    points: number;
}

interface UseDuplicateGuardParams {
    mode: InputMode | null;
    user: AppUser | null;
    selectedStudentIds: Set<string>;
    selectedViolation: ViolationItem | null;
    violationDate: string;
    quizInfo: { name: string; category?: string; subject: string; date: string; points: number; max_points: number };
    attitudeName?: string;
    attitudeCategory?: string;
    attitudeDate?: string;
    subjectGradeInfo: { subject: string; assessment_name: string; notes: string; semester: string };
    activeSemester: { id: string } | null | undefined;
    studentsData: StudentRow[] | undefined;
}

export function useDuplicateGuard({
    mode,
    user,
    selectedStudentIds,
    selectedViolation,
    violationDate,
    quizInfo,
    attitudeName,
    attitudeCategory,
    attitudeDate,
    subjectGradeInfo,
    activeSemester,
    studentsData,
}: UseDuplicateGuardParams) {
    const [duplicateList, setDuplicateList] = useState<DuplicateItem[]>([]);
    const [showDuplicateDialog, setShowDuplicateDialog] = useState(false);
    const [isCheckingDuplicates, setIsCheckingDuplicates] = useState(false);
    const isCheckingRef = useRef(false);

    const checkDuplicates = async (onProceed: () => void) => {
        if (isCheckingRef.current) return;
        if (!user || selectedStudentIds.size === 0) {
            onProceed();
            return;
        }

        isCheckingRef.current = true;
        setIsCheckingDuplicates(true);
        try {
            const studentIds = Array.from(selectedStudentIds);

        if (mode === 'violation') {
            if (!selectedViolation) {
                onProceed();
                return;
            }
            let query = supabase
                .from('violations')
                .select('id, student_id, user_id')
                .in('student_id', studentIds)
                .eq('date', violationDate)
                .eq('description', selectedViolation.description)
                .is('deleted_at', null);

            query = activeSemester?.id
                ? query.eq('semester_id', activeSemester.id)
                : query.is('semester_id', null);

            const { data: existingRows } = await query;
            if (!existingRows || existingRows.length === 0) {
                onProceed();
                return;
            }

            const allUserIds = Array.from(new Set(existingRows.map((r) => r.user_id).filter(Boolean)));
            const nameMap: Record<string, string> = {};
            if (allUserIds.length > 0) {
                const { data: roleRows } = await supabase
                    .from('user_roles')
                    .select('user_id, full_name')
                    .in('user_id', allUserIds);
                (roleRows || []).forEach((r) => { if (r.user_id) nameMap[r.user_id] = r.full_name || ''; });
            }

            setDuplicateList(existingRows.map((r) => ({
                student_id: r.student_id,
                student_name: studentsData?.find(s => s.id === r.student_id)?.name || 'Unknown',
                recorded_by_name: r.user_id === user.id ? 'Anda' : (nameMap[r.user_id] || 'Guru lain'),
                description: selectedViolation.description,
                date: violationDate,
                points: selectedViolation.points,
            })));
            setShowDuplicateDialog(true);
            return;
        }

        if (mode === 'quiz' || mode === 'attitude') {
            const activityName = mode === 'quiz' ? quizInfo.name : (attitudeName || '').trim();
            const activityDate = mode === 'quiz'
                ? quizInfo.date
                : (attitudeDate || new Date().toISOString().slice(0, 10));
            if (!activityName || (mode === 'quiz' && !quizInfo.subject)) {
                onProceed();
                return;
            }

            let query = supabase
                .from('quiz_points')
                .select('id, student_id, user_id')
                .in('student_id', studentIds)
                .eq('user_id', user.id)
                .eq('quiz_name', activityName)
                .eq('quiz_date', activityDate)
                .gte('created_at', getDuplicateGuardWindowIso())
                .is('deleted_at', null);

            if (mode === 'quiz') {
                query = query.eq('subject', quizInfo.subject);
            } else {
                query = query.eq('category', (attitudeCategory || 'Adab & Akhlak').trim());
            }

            const semesterId = mode === 'attitude'
                ? ((subjectGradeInfo.semester && subjectGradeInfo.semester.trim() !== '') ? subjectGradeInfo.semester : (activeSemester?.id || null))
                : (activeSemester?.id || null);
            query = semesterId ? query.eq('semester_id', semesterId) : query.is('semester_id', null);

            const { data: existingRows } = await query;
            if (!existingRows || existingRows.length === 0) {
                onProceed();
                return;
            }

            setDuplicateList(existingRows.map((r) => ({
                student_id: r.student_id,
                student_name: studentsData?.find(s => s.id === r.student_id)?.name || 'Unknown',
                recorded_by_name: 'Anda',
                description: activityName,
                date: activityDate,
                points: 1,
            })));
            setShowDuplicateDialog(true);
            return;
        }

            onProceed();
        } finally {
            isCheckingRef.current = false;
            setIsCheckingDuplicates(false);
        }
    };

    return {
        duplicateList,
        showDuplicateDialog,
        setShowDuplicateDialog,
        checkDuplicates,
        getDuplicateGuardWindowIso,
        isCheckingDuplicates,
    };
}
