import { ROLL_PREFIX_REGEX } from './constants';
import { normalizeSpeechText } from './normalizer';
import { parseIndonesianNumber } from './numberParser';

export function parseAttendanceNumberAndScore(
    text: string,
    totalStudents: number
): { studentIndex: number; score: number } | null {
    const normalized = normalizeSpeechText(text);
    if (!normalized) return null;

    // Check if it matches roll prefix pattern
    const match = normalized.match(ROLL_PREFIX_REGEX);
    if (!match) return null;

    const remainder = normalized.replace(ROLL_PREFIX_REGEX, '').trim();
    const words = remainder.split(' ').filter(Boolean);
    if (words.length < 2) return null;

    // Try splitting words between roll number tokens and score tokens
    const maxRollTokens = Math.min(words.length - 1, 3);
    for (let splitIdx = 1; splitIdx <= maxRollTokens; splitIdx++) {
        const rollWords = words.slice(0, splitIdx);
        const scoreWords = words.slice(splitIdx);

        // Roll number can be single digit (1-totalStudents) or Indonesian words
        const rollNum = parseIndonesianNumber(rollWords.join(' '), { allowSingleDigitWithoutPrefix: true });
        if (rollNum !== null && rollNum >= 1 && rollNum <= totalStudents) {
            const score = parseIndonesianNumber(scoreWords.join(' '), { allowSingleDigitWithoutPrefix: true });
            if (score !== null && score >= 0 && score <= 100) {
                return {
                    studentIndex: rollNum - 1, // 0-indexed
                    score,
                };
            }
        }
    }

    return null;
}

/**
 * Parses attendance jump commands without a score.
 * Examples:
 * - "nomor lima", "absen 14", "siswa tiga", "lompat ke nomor 10"
 * - "nomor absen 5", "absen ke 8", "ke absen 3", "absen pertama", "absen terakhir"
 * Returns studentIndex (0-indexed) or null.
 */
export function parseAttendanceJump(
    text: string,
    totalStudents: number
): { studentIndex: number } | null {
    const normalized = normalizeSpeechText(text);
    if (!normalized) return null;

    // Check jump to first student
    if (
        /\b(?:absen|nomor|no|urutan|siswa)\s+(?:pertama|kesatu|awal)\b/i.test(normalized) ||
        /\b(?:ke\s+awal|dari\s+awal|paling\s+awal)\b/i.test(normalized)
    ) {
        return { studentIndex: 0 };
    }

    // Check jump to last student
    if (
        /\b(?:absen|nomor|no|urutan|siswa)\s+terakhir\b/i.test(normalized) ||
        /\b(?:ke\s+akhir|paling\s+akhir)\b/i.test(normalized)
    ) {
        return { studentIndex: Math.max(0, totalStudents - 1) };
    }

    // Check roll prefix pattern
    const match = normalized.match(ROLL_PREFIX_REGEX);
    if (!match) return null;

    let remainder = normalized.replace(ROLL_PREFIX_REGEX, '').trim();
    if (!remainder) return null;

    // Do not match if words contain score indicators
    if (
        /\b(?:nilai|nilainya|skor|skornya|dapat|dapet|angka|angkanya|poin|poinnya)\b/i.test(remainder)
    ) {
        return null;
    }

    // Remove filler suffixes: "aja", "saja", "dong", "ya", "deh"
    remainder = remainder.replace(/\b(?:aja|saja|dong|ya|deh|lah|nih|tuh|dulu)\b/g, '').trim();

    const rollNum = parseIndonesianNumber(remainder, { allowSingleDigitWithoutPrefix: true });
    if (rollNum !== null && rollNum >= 1 && rollNum <= totalStudents) {
        return { studentIndex: rollNum - 1 };
    }

    return null;
}

