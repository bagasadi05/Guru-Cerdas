import { supabase } from '../../../../../services/supabase';
import type { AppUser } from '../../../../../hooks/useAuth';
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

const UNIQUE_VIOLATION = '23505';

export interface GradeConflict {
    student_id: string;
    /** Score currently stored on the server, null when it was removed. */
    serverScore: number | null;
    /** Score this form is about to save. */
    localScore: number;
}

/**
 * Thrown when a score the teacher edited was also changed on the server after
 * the form loaded it, so saving would silently overwrite someone else's work.
 */
export class GradeConflictError extends Error {
    readonly conflicts: GradeConflict[];

    constructor(conflicts: GradeConflict[]) {
        super(`${conflicts.length} nilai sudah diubah dari perangkat lain.`);
        this.name = 'GradeConflictError';
        this.conflicts = conflicts;
    }
}

/** Parses a form score; empty input yields null. */
export const parseScore = (value: string | undefined | null): number | null => {
    if (value === undefined || value === null || value.trim() === '') return null;
    const num = Number(value.trim().replace(',', '.'));
    return Number.isNaN(num) ? null : num;
};

export interface ScoreChangeSummary {
    added: number;
    changed: number;
    unchanged: number;
}

/** Splits the filled scores into new, edited and untouched against the server baseline. */
export function summarizeScoreChanges(
    scores: Record<string, string>,
    baseline: Record<string, string> | null | undefined,
): ScoreChangeSummary {
    const summary: ScoreChangeSummary = { added: 0, changed: 0, unchanged: 0 };
    Object.entries(scores).forEach(([studentId, value]) => {
        const score = parseScore(value);
        if (score === null) return;
        const before = parseScore(baseline?.[studentId]);
        if (before === null) summary.added++;
        else if (before !== score) summary.changed++;
        else summary.unchanged++;
    });
    return summary;
}

interface ExecuteSubjectGradeMutationParams {
    user: AppUser;
    subjectGradeInfo: { subject: string; assessment_name: string; notes: string; semester: string };
    scores: Record<string, string>;
    validationErrors: Record<string, string>;
    gradedCount: number;
    existingGrades: AcademicRecordRow[] | undefined;
    /**
     * Server scores the form started from. Only scores that differ from it are
     * sent, and each is checked against the server's current value first.
     * Without a baseline every filled score is sent (legacy behaviour).
     */
    baselineScores?: Record<string, string> | null;
    /** Save even though the server changed since the baseline was loaded. */
    overwriteConflicts?: boolean;
}

export async function executeSubjectGradeMutation({
    user,
    subjectGradeInfo,
    scores,
    validationErrors,
    gradedCount,
    existingGrades,
    baselineScores,
    overwriteConflicts = false,
}: ExecuteSubjectGradeMutationParams): Promise<string> {
    if (!subjectGradeInfo.subject || !subjectGradeInfo.assessment_name || gradedCount === 0) {
        throw new Error('Mata pelajaran, nama penilaian, dan setidaknya satu nilai harus diisi.');
    }
    if (Object.keys(validationErrors).length > 0) {
        throw new Error('Perbaiki nilai yang tidak valid sebelum menyimpan.');
    }

    const filledScores = Object.entries(scores)
        .filter(([, score]: [string, string]) => score && score.trim() !== '')
        .map(([student_id, score]: [string, string]) => {
            const numScore = parseScore(score);
            if (numScore === null || numScore < 0 || numScore > 100) {
                throw new Error(`Nilai untuk siswa tidak valid: ${score}. Harus antara 0-100.`);
            }
            return { student_id, numScore };
        });

    let pendingScores = baselineScores
        ? filledScores.filter(({ student_id, numScore }) => parseScore(baselineScores[student_id]) !== numScore)
        : filledScores;
    let unchangedCount = filledScores.length - pendingScores.length;

    if (pendingScores.length === 0) {
        return 'Tidak ada perubahan nilai. Semua nilai sama dengan yang sudah tersimpan.';
    }

    const recordIdByStudent = new Map<string, string>();
    const existingNotesByStudent = new Map<string, string>();
    const existingRecordMap = new Map<string, { id: string; score: number; notes: string | null; version: number }>();
    dedupeAcademicRecords(existingGrades || []).forEach(record => {
        recordIdByStudent.set(record.student_id, record.id);
        if (record.notes) existingNotesByStudent.set(record.student_id, record.notes);
        existingRecordMap.set(record.student_id, {
            id: record.id,
            score: record.score,
            notes: record.notes,
            version: typeof record.version === 'number' ? record.version : 1,
        });
    });

    // Read the current server rows for every student about to be written. The
    // form's copy may be minutes old; this is what the save is compared to.
    const pendingStudentIds = pendingScores.map(item => item.student_id);
    let keyQuery = supabase
        .from('academic_records')
        .select('id, student_id, deleted_at, notes, score, version')
        .eq('subject', subjectGradeInfo.subject)
        .eq('assessment_name', subjectGradeInfo.assessment_name)
        .in('student_id', pendingStudentIds);

    keyQuery = subjectGradeInfo.semester
        ? keyQuery.eq('semester_id', subjectGradeInfo.semester)
        : keyQuery.is('semester_id', null);

    const { data: keyRows, error: keyError } = await keyQuery;
    if (keyError) throw keyError;

    const liveScoreByStudent = new Map<string, number>();
    (keyRows || []).forEach(row => {
        if (row.deleted_at === null) {
            recordIdByStudent.set(row.student_id, row.id);
            liveScoreByStudent.set(row.student_id, Number(row.score));
            existingRecordMap.set(row.student_id, {
                id: row.id,
                score: Number(row.score),
                notes: row.notes,
                version: typeof row.version === 'number' ? row.version : 1,
            });
            if (row.notes) existingNotesByStudent.set(row.student_id, row.notes);
        } else if (!liveScoreByStudent.has(row.student_id)) {
            // Reuse a soft-deleted row's id so restoring keeps one record per key.
            recordIdByStudent.set(row.student_id, row.id);
            existingRecordMap.delete(row.student_id);
            if (row.notes && !existingNotesByStudent.has(row.student_id)) {
                existingNotesByStudent.set(row.student_id, row.notes);
            }
        }
    });

    // The server may already hold the value: a retried offline save whose
    // first attempt landed before the connection dropped, or the same score
    // typed on two devices. Writing it again is pointless and is no conflict.
    const alreadySaved = new Set(pendingScores
        .filter(({ student_id, numScore }) => liveScoreByStudent.get(student_id) === numScore)
        .map(({ student_id }) => student_id));
    if (alreadySaved.size > 0) {
        pendingScores = pendingScores.filter(({ student_id }) => !alreadySaved.has(student_id));
        unchangedCount += alreadySaved.size;
        if (pendingScores.length === 0) {
            return 'Semua nilai sudah tersimpan.';
        }
    }

    if (baselineScores && !overwriteConflicts) {
        const conflicts: GradeConflict[] = pendingScores
            .filter(({ student_id }) => {
                const before = parseScore(baselineScores[student_id]);
                const now = liveScoreByStudent.get(student_id) ?? null;
                return before !== now;
            })
            .map(({ student_id, numScore }) => ({
                student_id,
                serverScore: liveScoreByStudent.get(student_id) ?? null,
                localScore: numScore,
            }));
        if (conflicts.length > 0) throw new GradeConflictError(conflicts);
    }

    const records: Database['public']['Tables']['academic_records']['Insert'][] = pendingScores.map(({ student_id, numScore }) => {
        let id = recordIdByStudent.get(student_id);
        if (!id) {
            id = selfCryptoUUID();
            recordIdByStudent.set(student_id, id);
        }
        const existing = existingRecordMap.get(student_id);
        return {
            id,
            subject: subjectGradeInfo.subject,
            assessment_name: subjectGradeInfo.assessment_name,
            notes: subjectGradeInfo.notes || existingNotesByStudent.get(student_id) || '',
            score: numScore,
            student_id,
            user_id: user.id,
            semester_id: subjectGradeInfo.semester || null,
            // Every row carries the column: a bulk upsert fills missing keys with null.
            version: existing ? existing.version + 1 : 1,
            deleted_at: null,
        };
    });

    const { error } = await supabase
        .from('academic_records')
        .upsert(records)
        .select();
    if (error) {
        if (error.code === UNIQUE_VIOLATION) {
            throw new Error('Sebagian nilai baru saja disimpan dari perangkat lain. Tekan Simpan sekali lagi untuk melihat perbedaannya sebelum menimpa.');
        }
        throw error;
    }

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
    return unchangedCount > 0
        ? `Nilai untuk ${records.length} siswa berhasil disimpan. ${unchangedCount} nilai lain tidak berubah.`
        : `Nilai untuk ${records.length} siswa berhasil disimpan.`;
}
