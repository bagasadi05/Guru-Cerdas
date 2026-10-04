import { supabase } from '../../../../../services/supabase';
import type { AppUser } from '../../../../../hooks/useAuth';
import { Database } from '../../../../../services/database.types';
import { recordAction } from '../../../../../services/UndoManager';
import { schoolDate } from '../../../../../utils/reminderDates';

/** Mutation outcome that saved the main data but needs the teacher's attention. */
export interface MutationWarning {
    tone: 'warning';
    message: string;
}

interface ExecuteAttitudeMutationParams {
    user: AppUser;
    selectedStudentIds: Set<string>;
    attitudeName?: string;
    attitudeCategory?: string;
    attitudeDate?: string;
    attitudeNotes?: string;
    subjectGradeInfo: { semester: string };
    activeSemester: { id: string } | null | undefined;
    /** Semester resolved from the attitude date. Takes precedence when provided. */
    attitudeSemester?: { id: string } | null;
    shouldBypassGuard: boolean;
    getDuplicateGuardWindowIso: () => string;
}

const ATTITUDE_SUMMARY_SUBJECT = 'Sikap & Pembiasaan';
const UNIQUE_VIOLATION = '23505';

const inFlightAttitudeKeys = new Set<string>();

type AttitudeRecordInsert = Database['public']['Tables']['attitude_records']['Insert'];

/**
 * Keeps the per-semester attitude summary (attitude_records) in step with the
 * points just recorded. The table holds one live row per student, activity and
 * semester (uq_attitude_records), so a repeat of the same activity updates the
 * row instead of inserting a second one. Returns how many students could not be
 * synced.
 */
async function syncAttitudeSummary(
    rows: AttitudeRecordInsert[],
    semesterId: string | null,
    activityName: string,
): Promise<number> {
    if (rows.length === 0) return 0;

    let existingQuery = supabase
        .from('attitude_records')
        .select('id, student_id, notes')
        .in('student_id', rows.map(r => r.student_id))
        .eq('subject', ATTITUDE_SUMMARY_SUBJECT)
        .eq('assessment_name', activityName)
        .is('deleted_at', null);
    existingQuery = semesterId ? existingQuery.eq('semester_id', semesterId) : existingQuery.is('semester_id', null);

    const { data: existingRows, error: existingError } = await existingQuery;
    if (existingError) return rows.length;

    const existingByStudent = new Map((existingRows || []).map(r => [r.student_id, r]));
    let failed = 0;

    for (const row of rows) {
        const existing = existingByStudent.get(row.student_id);
        if (!existing) continue;
        const { error } = await supabase
            .from('attitude_records')
            .update({
                date: row.date,
                spiritual_predicate: row.spiritual_predicate,
                social_predicate: row.social_predicate,
                notes: row.notes || existing.notes,
                updated_at: new Date().toISOString(),
            })
            .eq('id', existing.id);
        if (error) failed++;
    }

    const toInsert = rows.filter(r => !existingByStudent.has(r.student_id));
    if (toInsert.length === 0) return failed;

    const { error: insertError } = await supabase.from('attitude_records').insert(toInsert);
    if (!insertError) return failed;
    if (insertError.code !== UNIQUE_VIOLATION) return failed + toInsert.length;

    // A row another teacher owns is invisible to this teacher (RLS), so the
    // batch can collide with it. Retry one by one: a collision means the
    // summary already exists and needs nothing from us.
    for (const row of toInsert) {
        const { error } = await supabase.from('attitude_records').insert(row);
        if (error && error.code !== UNIQUE_VIOLATION) failed++;
    }
    return failed;
}

export async function executeAttitudeMutation({
    user,
    selectedStudentIds,
    attitudeName,
    attitudeCategory,
    attitudeDate,
    attitudeNotes,
    subjectGradeInfo,
    activeSemester,
    attitudeSemester,
    shouldBypassGuard,
    getDuplicateGuardWindowIso: _getDuplicateGuardWindowIso,
}: ExecuteAttitudeMutationParams): Promise<string | MutationWarning> {
    const targetStudentIds = Array.from(new Set(selectedStudentIds));
    if (targetStudentIds.length === 0) {
        throw new Error('Pilih minimal satu siswa untuk diberi poin sikap.');
    }
    const resolvedName = (attitudeName || '').trim();
    if (!resolvedName) {
        throw new Error('Nama aktivitas sikap harus diisi.');
    }
    const resolvedCategory = (attitudeCategory || 'Adab & Akhlak').trim();
    const resolvedDate = attitudeDate || schoolDate();
    const resolvedNotes = (attitudeNotes || '').trim();
    const legacySemesterId = (subjectGradeInfo.semester && subjectGradeInfo.semester.trim() !== '')
        ? subjectGradeInfo.semester
        : (activeSemester?.id || null);
    const semesterId = attitudeSemester === undefined ? legacySemesterId : (attitudeSemester?.id || null);

    const inFlightKey = `${user.id}::attitude::${resolvedCategory}::${resolvedName}::${resolvedDate}::${semesterId || 'no-sem'}`;
    if (inFlightAttitudeKeys.has(inFlightKey)) {
        return 'Poin sikap sedang diproses. Mohon tunggu sejenak.';
    }
    inFlightAttitudeKeys.add(inFlightKey);

    try {
        let duplicateStudentIds = new Set<string>();
        if (!shouldBypassGuard) {
            let existingAttitudeQuery = supabase
                .from('quiz_points')
                .select('id, student_id')
                .in('student_id', targetStudentIds)
                .eq('user_id', user.id)
                .eq('quiz_name', resolvedName)
                .eq('category', resolvedCategory)
                .eq('quiz_date', resolvedDate)
                .is('deleted_at', null);

            existingAttitudeQuery = semesterId
                ? existingAttitudeQuery.eq('semester_id', semesterId)
                : existingAttitudeQuery.is('semester_id', null);

            const { data: existingRows, error: existingError } = await existingAttitudeQuery;
            if (existingError) throw existingError;
            duplicateStudentIds = new Set((existingRows || []).map((row) => row.student_id));
        }

        const finalStudentIds = targetStudentIds.filter((student_id) => !duplicateStudentIds.has(student_id));

        if (finalStudentIds.length > 0) {
            // 1. Simpan ke quiz_points (Poin Keaktifan/Sikap Rapot BINTANG - Tabel C & Offset Aspek)
            const quizRecords: Database['public']['Tables']['quiz_points']['Insert'][] = finalStudentIds.map(student_id => ({
                student_id,
                user_id: user.id,
                subject: null, // Poin sikap BINTANG tidak terikat mapel spesifik
                quiz_name: resolvedName,
                quiz_date: resolvedDate,
                points: 1, // STRICT CONSTRAINT: Poin sikap selalu 1 sesuai kesepakatan kelas
                max_points: 1,
                category: resolvedCategory,
                is_used: false,
                semester_id: semesterId,
            }));

            const { data: qpData, error: qpError } = await supabase
                .from('quiz_points')
                .insert(quizRecords)
                .select();

            if (qpError) throw qpError;
            if (qpData && qpData.length > 0) {
                await recordAction(user.id, 'create', 'quiz_points', qpData.map(d => d.id));
            }
        }

        // 2. Sinkronkan rekap sikap (attitude_records). Semua siswa terpilih ikut,
        // termasuk yang poinnya sudah ada, supaya menyimpan ulang memperbaiki
        // rekap yang sebelumnya gagal.
        const summaryRows: AttitudeRecordInsert[] = targetStudentIds.map(student_id => ({
            student_id,
            subject: ATTITUDE_SUMMARY_SUBJECT,
            assessment_name: resolvedName,
            date: resolvedDate,
            spiritual_predicate: (resolvedCategory.includes('Ibadah') || resolvedCategory.includes('Adab')) ? 'SB' : 'B',
            social_predicate: (resolvedCategory.includes('Kedisiplinan') || resolvedCategory.includes('Kerapian') || resolvedCategory.includes('Keaktifan')) ? 'SB' : 'B',
            notes: resolvedNotes || null,
            semester_id: semesterId,
            user_id: user.id,
        }));
        const failedSync = await syncAttitudeSummary(summaryRows, semesterId, resolvedName);

        const pointsMessage = finalStudentIds.length === 0
            ? 'Tidak ada poin sikap baru. Poin untuk siswa yang dipilih sudah tercatat pada tanggal ini.'
            : duplicateStudentIds.size > 0
                ? `Poin sikap (+1 ${resolvedName}) untuk ${finalStudentIds.length} siswa berhasil dicatat. ${duplicateStudentIds.size} data duplikat dilewati.`
                : `Poin sikap (+1 ${resolvedName}) untuk ${finalStudentIds.length} siswa berhasil dicatat. Terhubung ke Rapot BINTANG 🌟`;

        if (failedSync > 0) {
            return {
                tone: 'warning',
                message: `${pointsMessage} Rekap sikap untuk ${failedSync} siswa belum diperbarui. Simpan ulang dengan pilihan siswa yang sama untuk mencoba lagi.`,
            };
        }
        return pointsMessage;
    } finally {
        inFlightAttitudeKeys.delete(inFlightKey);
    }
}
