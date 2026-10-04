import { supabase } from '../../../../../services/supabase';
import type { AppUser } from '../../../../../hooks/useAuth';
import { Database } from '../../../../../services/database.types';
import { ViolationItem } from '../../../../../services/violations.data';
import { recordAction } from '../../../../../services/UndoManager';

const GUARD_CHUNK_SIZE = 100;

interface ExecuteViolationMutationParams {
    user: AppUser;
    selectedViolation: ViolationItem | null;
    selectedStudentIds: Set<string>;
    violationDate: string;
    violationNotes: string;
    activeSemester: { id: string } | null | undefined;
    shouldBypassGuard: boolean;
}

export async function executeViolationMutation({
    user,
    selectedViolation,
    selectedStudentIds,
    violationDate,
    violationNotes,
    activeSemester,
    shouldBypassGuard,
}: ExecuteViolationMutationParams): Promise<string> {
    if (!selectedViolation || selectedStudentIds.size === 0) {
        throw new Error('Jenis pelanggaran dan siswa harus dipilih.');
    }
    const studentIds = Array.from(selectedStudentIds);
    const duplicateStudentIds = new Set<string>();

    if (!shouldBypassGuard) {
        // Chunked so a large "Semua Kelas" selection doesn't overflow the
        // request URL (each id adds ~37 characters to the IN filter).
        for (let i = 0; i < studentIds.length; i += GUARD_CHUNK_SIZE) {
            // No semester filter: the DB trigger assigns the semester from the date,
            // so a back-dated entry may sit in a different semester than the active one.
            const { data: existingRows, error: existingViolationError } = await supabase
                .from('violations')
                .select('id, student_id, user_id')
                .in('student_id', studentIds.slice(i, i + GUARD_CHUNK_SIZE))
                .eq('date', violationDate)
                .eq('description', selectedViolation.description)
                .is('deleted_at', null);
            if (existingViolationError) throw existingViolationError;

            for (const r of existingRows || []) duplicateStudentIds.add(r.student_id);
        }
    }

    const records: Database['public']['Tables']['violations']['Insert'][] = studentIds
        .filter((student_id) => !duplicateStudentIds.has(student_id))
        .map((student_id: string) => {
            const record: Database['public']['Tables']['violations']['Insert'] = {
                date: violationDate,
                description: selectedViolation.description,
                points: selectedViolation.points,
                type: selectedViolation.code,
                severity: selectedViolation.category?.toLowerCase() || 'ringan',
                student_id,
                user_id: user.id,
                semester_id: activeSemester?.id || null,
            };
            if (violationNotes) {
                record.context_notes = violationNotes;
            }
            return record;
        });

    if (records.length === 0) {
        return 'Tidak ada pelanggaran baru yang disimpan. Seluruh siswa yang dipilih sudah memiliki catatan pelanggaran yang sama hari ini.';
    }

    const { data, error } = await supabase.from('violations').insert(records).select();
    if (error) throw error;
    await recordAction(user.id, 'create', 'violations', data.map(d => d.id));
    return duplicateStudentIds.size > 0
        ? `Pelanggaran untuk ${records.length} siswa berhasil dicatat. ${duplicateStudentIds.size} siswa yang sudah tercatat sebelumnya dilewati.`
        : `Pelanggaran untuk ${records.length} siswa berhasil dicatat.`;
}
