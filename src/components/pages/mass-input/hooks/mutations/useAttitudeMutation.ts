import { supabase } from '../../../../../services/supabase';
import { AppUser } from '../../../../../hooks/useAuth';
import { Database } from '../../../../../services/database.types';
import { recordAction } from '../../../../../services/UndoManager';

interface ExecuteAttitudeMutationParams {
    user: AppUser;
    selectedStudentIds: Set<string>;
    attitudeName?: string;
    attitudeCategory?: string;
    attitudeDate?: string;
    attitudeNotes?: string;
    subjectGradeInfo: { semester: string };
    activeSemester: { id: string } | null | undefined;
    shouldBypassGuard: boolean;
    getDuplicateGuardWindowIso: () => string;
}

const inFlightAttitudeKeys = new Set<string>();

export async function executeAttitudeMutation({
    user,
    selectedStudentIds,
    attitudeName,
    attitudeCategory,
    attitudeDate,
    attitudeNotes: _attitudeNotes,
    subjectGradeInfo,
    activeSemester,
    shouldBypassGuard,
    getDuplicateGuardWindowIso: _getDuplicateGuardWindowIso,
}: ExecuteAttitudeMutationParams): Promise<string> {
    const targetStudentIds = Array.from(new Set(selectedStudentIds));
    if (targetStudentIds.length === 0) {
        throw new Error('Pilih minimal satu siswa untuk diberi poin sikap.');
    }
    const resolvedName = (attitudeName || '').trim();
    if (!resolvedName) {
        throw new Error('Nama aktivitas sikap harus diisi.');
    }
    const resolvedCategory = (attitudeCategory || 'Adab & Akhlak').trim();
    const resolvedDate = attitudeDate || new Date().toISOString().slice(0, 10);
    const semesterId = (subjectGradeInfo.semester && subjectGradeInfo.semester.trim() !== '')
        ? subjectGradeInfo.semester
        : (activeSemester?.id || null);

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

        if (finalStudentIds.length === 0) {
            return 'Tidak ada poin sikap baru yang disimpan. Poin sikap untuk siswa yang dipilih sudah pernah dicatat pada tanggal ini.';
        }

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

    // 2. Sinkronkan ke attitude_records untuk kompatibilitas data historis
    try {
        const attitudeRecords: Database['public']['Tables']['attitude_records']['Insert'][] = finalStudentIds.map(student_id => ({
            student_id,
            subject: 'Sikap & Pembiasaan',
            assessment_name: resolvedName,
            date: resolvedDate,
            spiritual_predicate: (resolvedCategory.includes('Ibadah') || resolvedCategory.includes('Adab')) ? 'SB' : 'B',
            social_predicate: (resolvedCategory.includes('Kedisiplinan') || resolvedCategory.includes('Kerapian') || resolvedCategory.includes('Keaktifan')) ? 'SB' : 'B',
            semester_id: semesterId,
            user_id: user.id,
        }));
        await supabase
            .from('attitude_records')
            .insert(attitudeRecords);
    } catch (attErr) {
        console.warn('Silent sync to attitude_records skipped:', attErr);
    }

        return duplicateStudentIds.size > 0
            ? `Poin sikap (+1 ${resolvedName}) untuk ${finalStudentIds.length} siswa berhasil dicatat! ${duplicateStudentIds.size} data duplikat dilewati.`
            : `Poin sikap (+1 ${resolvedName}) untuk ${finalStudentIds.length} siswa berhasil dicatat! Terhubung ke Rapot BINTANG 🌟`;
    } finally {
        inFlightAttitudeKeys.delete(inFlightKey);
    }
}
