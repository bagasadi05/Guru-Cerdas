import { supabase } from '../../../../../services/supabase';
import { AppUser } from '../../../../../hooks/useAuth';
import { Database } from '../../../../../services/database.types';
import { AcademicRecordRow } from '../../types';
import { dedupeAcademicRecords } from '../../../../../utils/academicRecordUtils';
import { recordAction } from '../../../../../services/UndoManager';

/** Safe crypto.randomUUID with fallback for non-secure contexts */
const selfCryptoUUID = (): string => {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
        return crypto.randomUUID();
    }
    return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
};

interface ExecuteSubjectGradeMutationParams {
    user: AppUser;
    subjectGradeInfo: { subject: string; assessment_name: string; notes: string; semester: string };
    scores: Record<string, string>;
    validationErrors: Record<string, string>;
    gradedCount: number;
    existingGrades: AcademicRecordRow[] | undefined;
}

export async function executeSubjectGradeMutation({
    user,
    subjectGradeInfo,
    scores,
    validationErrors,
    gradedCount,
    existingGrades,
}: ExecuteSubjectGradeMutationParams): Promise<string> {
    if (!subjectGradeInfo.subject || !subjectGradeInfo.assessment_name || gradedCount === 0) {
        throw new Error('Mata pelajaran, nama penilaian, dan setidaknya satu nilai harus diisi.');
    }
    if (Object.keys(validationErrors).length > 0) {
        throw new Error('Perbaiki nilai yang tidak valid sebelum menyimpan.');
    }

    const pendingScores = Object.entries(scores)
        .filter(([, score]: [string, string]) => score && score.trim() !== '')
        .map(([student_id, score]: [string, string]) => {
            const normalized = score.trim().replace(',', '.');
            const numScore = Number(normalized);
            if (isNaN(numScore) || numScore < 0 || numScore > 100) {
                throw new Error(`Nilai untuk siswa tidak valid: ${score}. Harus antara 0-100.`);
            }
            return { student_id, numScore };
        });

    const recordIdByStudent = new Map<string, string>();
    const existingNotesByStudent = new Map<string, string>();
    const existingRecordMap = new Map<string, { id: string; score: number; notes: string | null }>();
    dedupeAcademicRecords(existingGrades || []).forEach(record => {
        recordIdByStudent.set(record.student_id, record.id);
        if (record.notes) existingNotesByStudent.set(record.student_id, record.notes);
        existingRecordMap.set(record.student_id, { id: record.id, score: record.score, notes: record.notes });
    });

    const studentsWithoutKnownRecord = pendingScores
        .map(item => item.student_id)
        .filter(studentId => !recordIdByStudent.has(studentId));

    if (studentsWithoutKnownRecord.length > 0) {
        let keyQuery = supabase
            .from('academic_records')
            .select('id, student_id, deleted_at, notes, score')
            .eq('subject', subjectGradeInfo.subject)
            .eq('assessment_name', subjectGradeInfo.assessment_name)
            .in('student_id', studentsWithoutKnownRecord);

        keyQuery = subjectGradeInfo.semester
            ? keyQuery.eq('semester_id', subjectGradeInfo.semester)
            : keyQuery.is('semester_id', null);

        const { data: keyRows, error: keyError } = await keyQuery;
        if (keyError) throw keyError;

        (keyRows || []).forEach(row => {
            if (!recordIdByStudent.has(row.student_id) || row.deleted_at === null) {
                recordIdByStudent.set(row.student_id, row.id);
            }
            if (row.notes) existingNotesByStudent.set(row.student_id, row.notes);
            if (row.deleted_at === null) {
                existingRecordMap.set(row.student_id, { id: row.id, score: Number(row.score), notes: row.notes });
            }
        });
    }

    const records: Database['public']['Tables']['academic_records']['Insert'][] = pendingScores.map(({ student_id, numScore }) => {
        let id = recordIdByStudent.get(student_id);
        if (!id) {
            id = selfCryptoUUID();
            recordIdByStudent.set(student_id, id);
        }
        return {
            id,
            subject: subjectGradeInfo.subject,
            assessment_name: subjectGradeInfo.assessment_name,
            notes: subjectGradeInfo.notes || existingNotesByStudent.get(student_id) || '',
            score: numScore,
            student_id,
            user_id: user.id,
            semester_id: subjectGradeInfo.semester || null,
            deleted_at: null,
        };
    });

    const { error } = await supabase
        .from('academic_records')
        .upsert(records)
        .select();
    if (error) throw error;

    const createdIds: string[] = [];
    const updatedIds: string[] = [];
    const previousStates: Record<string, unknown>[] = [];

    pendingScores.forEach(({ student_id }) => {
        const recId = recordIdByStudent.get(student_id);
        const existing = existingRecordMap.get(student_id);
        if (existing && recId) {
            updatedIds.push(recId);
            previousStates.push({ score: existing.score, notes: existing.notes });
        } else if (recId) {
            createdIds.push(recId);
        }
    });

    if (createdIds.length > 0) {
        await recordAction(user.id, 'create', 'academic_records', createdIds);
    }
    if (updatedIds.length > 0) {
        await recordAction(user.id, 'update', 'academic_records', updatedIds, previousStates);
    }
    return `Nilai untuk ${records.length} siswa berhasil disimpan.`;
}
