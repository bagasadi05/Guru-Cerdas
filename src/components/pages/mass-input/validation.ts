import { InputMode } from './types';

export const getSemesterValidationError = (
    mode: InputMode | null,
    subjectSemesterId: string,
    activeSemesterId?: string
): string => {
    if (mode === 'subject_grade' && !subjectSemesterId) {
        return 'Pilih semester terlebih dahulu sebelum menyimpan nilai.';
    }
    if ((mode === 'quiz' || mode === 'violation') && !activeSemesterId) {
        return 'Semester aktif tidak ditemukan. Atur semester aktif terlebih dahulu.';
    }
    return '';
};

export const normalizeAiScore = (rawScore: unknown): string | null => {
    if (rawScore === null || rawScore === undefined) return null;
    const normalized = String(rawScore).replace(',', '.').trim();
    if (!normalized) return null;
    const numericScore = Number(normalized);
    if (!Number.isFinite(numericScore) || numericScore < 0 || numericScore > 100) return null;
    return String(numericScore);
};
