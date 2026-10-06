import { supabase } from '../../../../../services/supabase';
import type { AppUser } from '../../../../../hooks/useAuth';
import { Database } from '../../../../../services/database.types';
import { recordAction } from '../../../../../services/UndoManager';
import { buildQuizPointDailyKey } from '../../../../../utils/academicRecordUtils';

/** Keeps each duplicate-check request URL short for large "Semua Kelas" selections. */
const GUARD_CHUNK_SIZE = 100;

interface ExecuteQuizPointsMutationParams {
    user: AppUser;
    quizInfo: { name: string; category?: string; subject: string; date: string; points: number; max_points: number };
    selectedStudentIds: Set<string>;
    activeSemester: { id: string } | null | undefined;
    shouldBypassGuard: boolean;
    getDuplicateGuardWindowIso: () => string;
}

const inFlightQuizKeys = new Set<string>();

export async function executeQuizPointsMutation({
    user,
    quizInfo,
    selectedStudentIds,
    activeSemester,
    shouldBypassGuard,
    getDuplicateGuardWindowIso: _getDuplicateGuardWindowIso,
}: ExecuteQuizPointsMutationParams): Promise<string> {
    const normalizedQuizName = (quizInfo.name || '').trim();
    const normalizedSubject = (quizInfo.subject || '').trim();

    if (!normalizedQuizName || !normalizedSubject || selectedStudentIds.size === 0) {
        throw new Error('Informasi aktivitas dan siswa harus diisi.');
    }
    const studentIds = Array.from(new Set(selectedStudentIds));

    const inFlightKey = `${user.id}::${normalizedSubject}::${normalizedQuizName}::${quizInfo.date}::${activeSemester?.id || 'no-sem'}`;
    if (inFlightQuizKeys.has(inFlightKey)) {
        return 'Poin keaktifan sedang diproses. Mohon tunggu sejenak.';
    }
    inFlightQuizKeys.add(inFlightKey);

    try {
        const duplicateStudentIds = new Set<string>();
        if (!shouldBypassGuard) {
            // Same rule as the Bintang read side: any teacher's point for this
            // activity, subject and day counts, compared case-insensitively.
            for (let i = 0; i < studentIds.length; i += GUARD_CHUNK_SIZE) {
                const { data: existingQuizRows, error: existingQuizError } = await supabase
                    .from('quiz_points')
                    .select('student_id, subject, quiz_name, quiz_date')
                    .in('student_id', studentIds.slice(i, i + GUARD_CHUNK_SIZE))
                    .eq('quiz_date', quizInfo.date)
                    .is('deleted_at', null);
                if (existingQuizError) throw existingQuizError;

                for (const row of existingQuizRows || []) {
                    const sameActivity = buildQuizPointDailyKey(row) === buildQuizPointDailyKey({
                        student_id: row.student_id,
                        subject: normalizedSubject,
                        quiz_name: normalizedQuizName,
                        quiz_date: quizInfo.date,
                    });
                    if (sameActivity) duplicateStudentIds.add(row.student_id);
                }
            }
        }

        const records: Database['public']['Tables']['quiz_points']['Insert'][] = studentIds
            .filter((student_id) => !duplicateStudentIds.has(student_id))
            .map((student_id: string) => ({
                quiz_name: normalizedQuizName,
                category: quizInfo.category || 'lainnya',
                subject: normalizedSubject,
                quiz_date: quizInfo.date,
                student_id,
                user_id: user.id,
                points: 1, // STRICT CONSTRAINT: Poin keaktifan selalu 1 sesuai kesepakatan kelas
                max_points: 1,
                semester_id: activeSemester?.id || null,
            }));

        if (records.length === 0) {
            return 'Tidak ada poin baru yang disimpan. Poin keaktifan untuk siswa yang dipilih sudah pernah disimpan pada tanggal ini.';
        }

        const { data, error } = await supabase.from('quiz_points').insert(records).select();
        if (error) throw error;
        await recordAction(user.id, 'create', 'quiz_points', data.map(d => d.id));
        return duplicateStudentIds.size > 0
            ? `Poin keaktifan (+1 ${normalizedQuizName}) untuk ${records.length} siswa berhasil disimpan! ${duplicateStudentIds.size} data duplikat dilewati.`
            : `Poin keaktifan (+1 ${normalizedQuizName}) untuk ${records.length} siswa berhasil disimpan! 🌟`;
    } finally {
        inFlightQuizKeys.delete(inFlightKey);
    }
}
