import { supabase } from '../../../../../services/supabase';
import { AppUser } from '../../../../../hooks/useAuth';
import { Database } from '../../../../../services/database.types';
import { recordAction } from '../../../../../services/UndoManager';

interface ExecuteQuizPointsMutationParams {
    user: AppUser;
    quizInfo: { name: string; category?: string; subject: string; date: string; points: number; max_points: number };
    selectedStudentIds: Set<string>;
    activeSemester: { id: string } | null | undefined;
    shouldBypassGuard: boolean;
    getDuplicateGuardWindowIso: () => string;
}

export async function executeQuizPointsMutation({
    user,
    quizInfo,
    selectedStudentIds,
    activeSemester,
    shouldBypassGuard,
    getDuplicateGuardWindowIso,
}: ExecuteQuizPointsMutationParams): Promise<string> {
    if (!quizInfo.name || !quizInfo.subject || selectedStudentIds.size === 0) {
        throw new Error('Informasi aktivitas dan siswa harus diisi.');
    }
    const studentIds = Array.from(selectedStudentIds);

    let duplicateStudentIds = new Set<string>();
    if (!shouldBypassGuard) {
        let existingQuizQuery = supabase
            .from('quiz_points')
            .select('id, student_id')
            .in('student_id', studentIds)
            .eq('user_id', user.id)
            .eq('quiz_name', quizInfo.name)
            .eq('subject', quizInfo.subject)
            .eq('quiz_date', quizInfo.date)
            .gte('created_at', getDuplicateGuardWindowIso())
            .is('deleted_at', null);

        existingQuizQuery = activeSemester?.id
            ? existingQuizQuery.eq('semester_id', activeSemester.id)
            : existingQuizQuery.is('semester_id', null);

        const { data: existingQuizRows, error: existingQuizError } = await existingQuizQuery;
        if (existingQuizError) throw existingQuizError;
        duplicateStudentIds = new Set((existingQuizRows || []).map((row) => row.student_id));
    }

    const records: Database['public']['Tables']['quiz_points']['Insert'][] = studentIds
        .filter((student_id) => !duplicateStudentIds.has(student_id))
        .map((student_id: string) => ({
            quiz_name: quizInfo.name,
            category: quizInfo.category || 'lainnya',
            subject: quizInfo.subject,
            quiz_date: quizInfo.date,
            student_id,
            user_id: user.id,
            points: 1, // STRICT CONSTRAINT: Poin keaktifan selalu 1 sesuai kesepakatan kelas
            max_points: 1,
            semester_id: activeSemester?.id || null,
        }));

    if (records.length === 0) {
        return 'Tidak ada poin baru yang disimpan. Sistem mendeteksi input yang sama sudah tersimpan beberapa menit terakhir.';
    }

    const { data, error } = await supabase.from('quiz_points').insert(records).select();
    if (error) throw error;
    await recordAction(user.id, 'create', 'quiz_points', data.map(d => d.id));
    return duplicateStudentIds.size > 0
        ? `Poin keaktifan (+1 ${quizInfo.name}) untuk ${records.length} siswa berhasil disimpan! ${duplicateStudentIds.size} data duplikat terbaru dilewati.`
        : `Poin keaktifan (+1 ${quizInfo.name}) untuk ${records.length} siswa berhasil disimpan! 🌟`;
}
