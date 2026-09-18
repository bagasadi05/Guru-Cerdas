import { findStudentMatch, MinimStudent } from './studentMatcher';

export type VoiceCommand = 'next' | 'prev' | 'clear' | 'stop' | 'first' | 'last' | 'undo';

export const BASIC_NUMBERS: Record<string, number> = {
    'nol': 0,
    'kosong': 0,
    'satu': 1,
    'se': 1,
    'siji': 1,
    'hiji': 1,
    'pertama': 1,
    'kesatu': 1,
    'dua': 2,
    'loro': 2,
    'duo': 2,
    'kedua': 2,
    'tiga': 3,
    'telu': 3,
    'tilu': 3,
    'ketiga': 3,
    'empat': 4,
    'papat': 4,
    'opat': 4,
    'ampat': 4,
    'keempat': 4,
    'lima': 5,
    'limo': 5,
    'lime': 5,
    'kelima': 5,
    'enam': 6,
    'nem': 6,
    'genep': 6,
    'anam': 6,
    'keenam': 6,
    'tujuh': 7,
    'pitu': 7,
    'tuju': 7,
    'ketujuh': 7,
    'delapan': 8,
    'lapan': 8,
    'dapan': 8,
    'wolu': 8,
    'dalapan': 8,
    'kedelapan': 8,
    'sembilan': 9,
    'songo': 9,
    'salapan': 9,
    'sambilan': 9,
    'kesembilan': 9,
    'sepuluh': 10,
    'sedasa': 10,
    'kesepuluh': 10,
    'sewelas': 11,
    'sebelas': 11,
    'kesebelas': 11,
    'seket': 50,
    'suwidak': 60,
    'cepek': 100,
    'seratus': 100,
    'satus': 100,
    'atus': 100,
};

export const COMMAND_MAP: Record<string, VoiceCommand> = {
    'lanjut': 'next',
    'lewati': 'next',
    'lewat': 'next',
    'next': 'next',
    'skip': 'next',
    'berikutnya': 'next',
    'berikut': 'next',
    'lanjutkan': 'next',
    'teruskan': 'next',
    'skip aja': 'next',
    'kembali': 'prev',
    'mundur': 'prev',
    'balik': 'prev',
    'sebelumnya': 'prev',
    'prev': 'prev',
    'back': 'prev',
    'ulang': 'prev',
    'ulangi': 'prev',
    'hapus': 'clear',
    'kosongkan': 'clear',
    'reset': 'clear',
    'batalkan': 'clear',
    'clear': 'clear',
    'delete': 'clear',
    'hilangkan': 'clear',
    'selesai': 'stop',
    'stop': 'stop',
    'tutup': 'stop',
    'berhenti': 'stop',
    'akhiri': 'stop',
    'cukup': 'stop',
    'keluar': 'stop',
    'sudah selesai': 'stop',
    'sudah cukup': 'stop',
    'sudah stop': 'stop',
    'awal': 'first',
    'ke awal': 'first',
    'dari awal': 'first',
    'paling awal': 'first',
    'akhir': 'last',
    'ke akhir': 'last',
    'paling akhir': 'last',
    'terakhir': 'last',
    'undo': 'undo',
    'urungkan': 'undo',
    'kembalikan': 'undo',
    'batal': 'undo',
    'batalkan nilai': 'undo',
    'batalkan perubahan': 'undo',
};

export const ROLL_PREFIX_REGEX =
    /^(?:lompat\s+ke|pindah\s+ke|ke|pilih|buka|lihat|pada\s+)?(?:nomor\s+absen|no\s+absen|absen\s+nomor|absen\s+no|nomor\s+urut|no\s+urut|siswa\s+nomor|murid\s+nomor|anak\s+nomor|absen\s+ke|nomor\s+ke|urutan\s+ke|presensi\s+ke|presensi\s+nomor|ke\s+absen|ke\s+nomor|nomor|no|absen|urutan|presensi|siswa|murid)\s+(?:ke\s+|ke-)?/i;

const NUMBER_KEYWORDS = new Set([
    ...Object.keys(BASIC_NUMBERS),
    'belas', 'welas', 'puluh', 'ngpuluh', 'ratus', 'atus', 'ribu',
]);

const PREFIX_GRADE_KEYWORDS = new Set([
    'nilai', 'nilainya', 'skor', 'skornya', 'angka', 'angkanya', 'poin', 'poinnya',
    'dapat', 'dapet', 'kasih', 'kasihkan', 'berikan', 'diberi'
]);

const CORRECTION_KEYWORDS = new Set([
    'ralat', 'ganti', 'ubah', 'salah', 'bukan'
]);

/**
 * Normalizes spoken Indonesian text by trimming, lowercasing, and removing punctuation.
 */
export function normalizeSpeechText(text: string): string {
    return text
        .toLowerCase()
        .replace(/[.,/#!$%^&*;:{}=\-_`~()]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
}

/**
 * Checks whether a spoken phrase is a navigational voice command.
 * Strictly avoids false positives on phrases containing numbers, student scores, or conversational fillers.
 */
export function parseVoiceCommand(text: string): VoiceCommand | null {
    const normalized = normalizeSpeechText(text);
    if (!normalized) return null;

    // Immediately reject if the phrase contains any numeric digits
    if (/\d/.test(normalized)) return null;

    const words = normalized.split(' ').filter(Boolean);
    // Reject if phrase contains score prefixes (e.g. "nilai", "skor", "dapat")
    if (words.some(w => PREFIX_GRADE_KEYWORDS.has(w))) return null;

    // Reject if phrase contains number words
    if (words.some(w => NUMBER_KEYWORDS.has(w))) return null;

    // Check direct full match
    if (COMMAND_MAP[normalized]) {
        return COMMAND_MAP[normalized];
    }

    // Strip polite conversational affixes (e.g. "tolong lanjut ya", "skip aja", "kembali dulu")
    const trimmedCommand = normalized
        .replace(/^(?:tolong|coba|silakan|mohon|klik|bisa|ayo)\s+/i, '')
        .replace(/\s+(?:ya|dong|dulu|aja|saja|deh|lah|nih|tuh|oke)$/i, '')
        .trim();

    if (COMMAND_MAP[trimmedCommand]) {
        return COMMAND_MAP[trimmedCommand];
    }

    return null;
}

/**
 * Returns single digit (0-9) from a digit character or Indonesian/regional word.
 */
export function getSingleDigitValue(token: string): number | null {
    if (/^[0-9]$/.test(token)) {
        return Number(token);
    }
    const val = BASIC_NUMBERS[token];
    if (val !== undefined && val >= 0 && val <= 9) {
        return val;
    }
    return null;
}

/**
 * Evaluates a sequence of contiguous number tokens into an integer (0-100+).
 * Returns null if unparseable, or a number.
 */
export function evaluateNumberTokens(words: string[]): number | null {
    if (words.length === 0) return null;

    // Direct multi-digit numeric string e.g. "85" or "100"
    if (words.length === 1 && /^\d+$/.test(words[0])) {
        return Number(words[0]);
    }

    const joined = words.join(' ');

    // 1. Single-word direct lookup ("seratus", "cepek", "seket", "sembilan", etc.)
    if (BASIC_NUMBERS[joined] !== undefined) {
        return BASIC_NUMBERS[joined];
    }

    // 2. Contains "ribu" -> at least 1000 (> 100)
    if (words.includes('ribu')) {
        return 1000;
    }

    // 3. Contains "ratus" or "atus"
    if (words.includes('ratus') || words.includes('atus')) {
        return 150;
    }

    // 4. "seratus" / "cepek" followed by other words -> strictly > 100 (e.g. "seratus lima")
    if (words[0] === 'seratus' || words[0] === 'cepek' || words[0] === 'atus' || words[0] === 'satus') {
        if (words.length > 1) {
            return 150;
        }
    }

    // 5. "X belas" / "X welas" (11 - 19) e.g. "dua belas", "5 belas", "tujuh welas"
    if (words.length === 2 && (words[1] === 'belas' || words[1] === 'welas')) {
        const base = getSingleDigitValue(words[0]);
        if (base !== null && base >= 1 && base <= 9) {
            return 10 + (base === 1 ? 1 : base);
        }
        return null;
    }

    // 6. "X puluh [Y]" (e.g., "delapan puluh lima" -> 85, "8 puluh 5" -> 85, "tujuh puluh" -> 70, "8 puluh" -> 80)
    const puluhIndex = words.findIndex(w => w === 'puluh' || w === 'ngpuluh');
    if (puluhIndex !== -1) {
        if (puluhIndex === 0) return null;
        const tensWord = words[puluhIndex - 1];
        const baseTens = getSingleDigitValue(tensWord);
        if (baseTens === null || baseTens < 1 || baseTens > 9) return null;

        const tens = baseTens * 10;
        let units = 0;
        if (puluhIndex + 1 < words.length) {
            const unitsWord = words[puluhIndex + 1];
            const baseUnits = getSingleDigitValue(unitsWord);
            if (baseUnits !== null && baseUnits >= 1 && baseUnits <= 9) {
                units = baseUnits;
            } else {
                return null;
            }
        }
        return tens + units;
    }

    // 7. Casual shorthand 2 digits: e.g. "delapan lima", "8 5", "8 lima", "lapan lima", "sembilan nol", "9 0"
    if (words.length === 2) {
        const d1 = getSingleDigitValue(words[0]);
        const d2 = getSingleDigitValue(words[1]);
        if (d1 !== null && d2 !== null) {
            return d1 * 10 + d2;
        }
    }

    // 8. Casual shorthand 3 digits: e.g. "satu nol nol", "1 0 0", "1 nol nol", "satu kosong kosong" -> 100
    if (words.length === 3) {
        const d1 = getSingleDigitValue(words[0]);
        const d2 = getSingleDigitValue(words[1]);
        const d3 = getSingleDigitValue(words[2]);
        if (d1 === 1 && d2 === 0 && d3 === 0) {
            return 100;
        }
    }

    return null;
}

/**
 * Checks whether a word is considered a number token (digits or number word).
 */
function isNumberToken(word: string): boolean {
    return /^\d+$/.test(word) || NUMBER_KEYWORDS.has(word);
}

/**
 * Parses spoken Indonesian words or direct digits into a score between 0 and 100.
 *
 * Examples:
 * - "85", "8 5", "nilai 85 ya", "8.5" -> 85
 * - "delapan lima", "lapan lima", "wolu lima" -> 85
 * - "tujuh puluh lima", "kasih 7 puluh 5" -> 75
 * - "seratus", "cepek", "100", "1 0 0" -> 100
 * - "nol", "kosong", "0" -> 0
 * - "seratus lima", "105" -> null (exceeds 100)
 */
export function parseIndonesianNumber(
    text: string,
    options: { allowSingleDigitWithoutPrefix?: boolean } = {}
): number | null {
    const normalized = normalizeSpeechText(text);
    if (!normalized) return null;

    const words = normalized.split(' ').filter(Boolean);
    if (words.length === 0) return null;

    const isDirectDigits = /^\d+$/.test(normalized);
    const hasGradePrefix = words.some(w => PREFIX_GRADE_KEYWORDS.has(w) || CORRECTION_KEYWORDS.has(w));
    const allowSingleDigit = options.allowSingleDigitWithoutPrefix || hasGradePrefix || isDirectDigits;

    // Group adjacent number tokens together
    const numberGroups: string[][] = [];
    let currentGroup: string[] = [];

    for (const word of words) {
        if (isNumberToken(word)) {
            currentGroup.push(word);
        } else {
            if (currentGroup.length > 0) {
                numberGroups.push(currentGroup);
                currentGroup = [];
            }
        }
    }
    if (currentGroup.length > 0) {
        numberGroups.push(currentGroup);
    }

    if (numberGroups.length === 0) {
        return null;
    }

    // Prioritize the last number group (often the score in phrases like "siswa tiga nilai delapan puluh lima")
    for (let i = numberGroups.length - 1; i >= 0; i--) {
        const group = numberGroups[i];
        const val = evaluateNumberTokens(group);

        if (val !== null) {
            // Strictly reject > 100 or < 0
            if (val > 100 || val < 0) {
                return null;
            }

            // If 0, always allowed
            if (val === 0) {
                return 0;
            }

            // Single digit 1-9 requires explicit context
            if (val >= 1 && val <= 9) {
                if (!allowSingleDigit) {
                    continue;
                }
                return val;
            }

            // Multi-digit valid score (10 - 100)
            return val;
        }
    }

    return null;
}

/**
 * Parses attendance/roll number commands with a score.
 * Examples:
 * - "nomor dua 85" -> { studentIndex: 1, score: 85 }
 * - "nomor 2 8 5" -> { studentIndex: 1, score: 85 }
 * - "absen 14 sembilan puluh" -> { studentIndex: 13, score: 90 }
 * - "nomor absen 5 85" -> { studentIndex: 4, score: 85 }
 * - "absen ke 3 nilainya 80" -> { studentIndex: 2, score: 80 }
 * - "siswa 3 dapat 75" -> { studentIndex: 2, score: 75 }
 * - "urutan 5 nilai 80" -> { studentIndex: 4, score: 80 }
 */
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

export interface NameAndGradeParsed {
    studentId: string;
    studentName: string;
    score: number;
    confidence: number;
    rawText: string;
    studentIndex?: number;
    rollNumber?: number;
    matchType?: 'roll_number' | 'name';
    isAmbiguous?: boolean;
    possibleCandidates?: MinimStudent[];
}

const TRAILING_PARTICLES = new Set(['ya', 'dong', 'oke', 'sip', 'deh', 'nih', 'tuh', 'aja', 'saja', 'dulu', 'lah']);

/**
 * Splits continuous speech transcripts into individual student entries even when
 * speech recognition outputs text without commas or explicit conjunctions.
 * Examples:
 * - "Adzkiyah 85 Aiyra 90 Ali 80" -> ["Adzkiyah 85", "Aiyra 90", "Ali 80"]
 * - "Adzkiyah Haura 85 Aiyra Azzahwa sembilan puluh Ali 80"
 * - "1 85 2 90 3 75"
 */
export function splitContinuousSpeech(transcript: string, totalStudents: number): string[] {
    if (!transcript) return [];

    // 1. Insert boundary before roll prefixes if spoken continuously
    const withRollBoundaries = transcript.replace(
        /(?<=[0-9a-zA-Z])\s+(?=(?:nomor\s+absen|no\s+absen|absen\s+nomor|absen\s+no|nomor\s+urut|no\s+urut|siswa\s+nomor|murid\s+nomor|anak\s+nomor|absen\s+ke|nomor\s+ke|urutan\s+ke|absen|nomor|no|urutan|presensi)\s+(?:ke\s+|ke-)?(?:\d+|satu|dua|tiga|empat|lima|enam|tujuh|delapan|sembilan|sepuluh|\w+\s+belas|\w+\s+puluh)\b)/gi,
        ', '
    );

    // 2. Split by standard punctuation and conjunctions
    const initialSegments = withRollBoundaries
        .split(/[,;\n]|\bdan\b|\blalu\b|\bterus\b|\bkemudian\b|\bberikutnya\b/i)
        .map(s => s.trim())
        .filter(Boolean);

    const finalSegments: string[] = [];

    for (const seg of initialSegments) {
        const words = seg.split(/\s+/).filter(Boolean);
        if (words.length <= 3) {
            finalSegments.push(seg);
            continue;
        }

        // Scan for entries inside composite sentences
        const subSegments: string[] = [];
        let currentChunk: string[] = [];
        let i = 0;

        while (i < words.length) {
            const word = words[i];
            currentChunk.push(word);

            // Check if currentChunk has accumulated a valid score candidate at its tail
            let foundScoreAtTail = false;
            let scoreTokenCount = 0;

            for (let tailLen = Math.min(currentChunk.length - 1, 3); tailLen >= 1; tailLen--) {
                const tailWords = currentChunk.slice(currentChunk.length - tailLen);
                const val = evaluateNumberTokens(tailWords);
                if (val !== null && val >= 0 && val <= 100) {
                    foundScoreAtTail = true;
                    scoreTokenCount = tailLen;
                    break;
                }
            }

            if (foundScoreAtTail && i + 1 < words.length) {
                let nextWord = words[i + 1].toLowerCase();
                let hasTrailingParticle = false;

                // If next word is a conversational particle like "ya" or "oke", include it and advance
                if (TRAILING_PARTICLES.has(nextWord)) {
                    currentChunk.push(words[i + 1]);
                    i++;
                    hasTrailingParticle = true;
                    nextWord = i + 1 < words.length ? words[i + 1].toLowerCase() : '';
                }

                if (i + 1 < words.length) {
                    const nextIsNumber = isNumberToken(nextWord);
                    const headWords = currentChunk.slice(0, currentChunk.length - scoreTokenCount - (hasTrailingParticle ? 1 : 0));

                    // Condition A: Name-based dictation (next word is NOT a number token, and headWords has words)
                    if (!nextIsNumber && headWords.length > 0) {
                        subSegments.push(currentChunk.join(' '));
                        currentChunk = [];
                    }
                    // Condition B: Short roll dictation "1 85 2 90 3 75"
                    else if (nextIsNumber && headWords.length === 1) {
                        const rollVal = parseIndonesianNumber(headWords[0], { allowSingleDigitWithoutPrefix: true });
                        if (rollVal !== null && rollVal >= 1 && rollVal <= totalStudents) {
                            const nextRollVal = parseIndonesianNumber(nextWord, { allowSingleDigitWithoutPrefix: true });
                            if (nextRollVal !== null && nextRollVal >= 1 && nextRollVal <= totalStudents && i + 2 < words.length) {
                                subSegments.push(currentChunk.join(' '));
                                currentChunk = [];
                            }
                        }
                    }
                }
            }

            i++;
        }

        if (currentChunk.length > 0) {
            subSegments.push(currentChunk.join(' '));
        }

        if (subSegments.length > 0) {
            finalSegments.push(...subSegments);
        } else {
            finalSegments.push(seg);
        }
    }

    return finalSegments;
}

/**
 * Parses free-form spoken text containing student roll numbers OR student names and their respective scores.
 * Supports batch dictation e.g.:
 * - "absen 1 85, absen 2 90, absen 3 75"
 * - "absen 1 85 absen 2 90 absen 3 75" (continuous without commas)
 * - "Ahmad Fauzi 85, Siti Rahma sembilan puluh, Budi Santoso 75"
 * - "1 85, 2 90, 3 75"
 */
export function parseNameAndGradeSpeech(
    transcript: string,
    students: MinimStudent[]
): NameAndGradeParsed[] {
    if (!transcript || !students || students.length === 0) return [];

    const rawSegments = splitContinuousSpeech(transcript, students.length);

    const results: NameAndGradeParsed[] = [];
    const matchedStudentIds = new Set<string>();

    for (const segment of rawSegments) {
        // 1. Try matching as attendance roll number + score (e.g. "absen 1 85", "nomor 2 sembilan puluh", "absen 3 nilainya 80")
        const rollMatch = parseAttendanceNumberAndScore(segment, students.length);
        if (rollMatch) {
            const targetStudent = students[rollMatch.studentIndex];
            if (targetStudent && !matchedStudentIds.has(targetStudent.id)) {
                matchedStudentIds.add(targetStudent.id);
                results.push({
                    studentId: targetStudent.id,
                    studentName: targetStudent.name,
                    score: rollMatch.score,
                    confidence: 100,
                    rawText: segment,
                    studentIndex: rollMatch.studentIndex,
                    rollNumber: rollMatch.studentIndex + 1,
                    matchType: 'roll_number',
                });
                continue;
            }
        }

        // 2. Try matching short roll + score without explicit prefix (e.g. "1 85", "2 90")
        const words = segment.split(/\s+/).filter(Boolean);
        let directRollMatched = false;
        if (words.length >= 2) {
            for (let splitIdx = 1; splitIdx <= Math.min(words.length - 1, 2); splitIdx++) {
                const rollStr = words.slice(0, splitIdx).join(' ');
                const scoreStr = words.slice(splitIdx).join(' ');
                const rollNum = parseIndonesianNumber(rollStr, { allowSingleDigitWithoutPrefix: true });
                if (rollNum !== null && rollNum >= 1 && rollNum <= students.length) {
                    const score = parseIndonesianNumber(scoreStr, { allowSingleDigitWithoutPrefix: true });
                    if (score !== null && score >= 0 && score <= 100) {
                        const targetStudent = students[rollNum - 1];
                        if (targetStudent && !matchedStudentIds.has(targetStudent.id)) {
                            matchedStudentIds.add(targetStudent.id);
                            results.push({
                                studentId: targetStudent.id,
                                studentName: targetStudent.name,
                                score,
                                confidence: 95,
                                rawText: segment,
                                studentIndex: rollNum - 1,
                                rollNumber: rollNum,
                                matchType: 'roll_number',
                            });
                            directRollMatched = true;
                            break;
                        }
                    }
                }
            }
        }
        if (directRollMatched) continue;

        // 3. Fallback to matching student by Name + Score
        let bestMatch: {
            student: MinimStudent;
            score: number;
            confidence: number;
            rawText: string;
            studentIndex: number;
            potentialNameLength: number;
            isAmbiguous?: boolean;
            candidates?: MinimStudent[];
        } | null = null;

        for (let i = 1; i < words.length; i++) {
            const potentialName = words.slice(0, i).join(' ');
            const potentialNumberStr = words.slice(i).join(' ');
            const score = parseIndonesianNumber(potentialNumberStr, { allowSingleDigitWithoutPrefix: true });

            if (score !== null) {
                const match = findStudentMatch(potentialName, students);
                if (match.method !== 'none' && match.confidence >= 70 && !matchedStudentIds.has(match.studentId)) {
                    const studentIndex = students.findIndex(s => s.id === match.studentId);
                    const isBetter = !bestMatch ||
                        match.confidence > bestMatch.confidence ||
                        (match.confidence === bestMatch.confidence && potentialName.length > bestMatch.potentialNameLength);

                    if (isBetter) {
                        bestMatch = {
                            student: { id: match.studentId, name: match.studentName },
                            score,
                            confidence: match.confidence,
                            rawText: segment,
                            studentIndex,
                            potentialNameLength: potentialName.length,
                            isAmbiguous: match.isAmbiguous,
                            candidates: match.candidates,
                        };
                    }
                }
            }
        }

        if (bestMatch) {
            matchedStudentIds.add(bestMatch.student.id);
            results.push({
                studentId: bestMatch.student.id,
                studentName: bestMatch.student.name,
                score: bestMatch.score,
                confidence: bestMatch.confidence,
                rawText: bestMatch.rawText,
                studentIndex: bestMatch.studentIndex,
                rollNumber: bestMatch.studentIndex !== -1 ? bestMatch.studentIndex + 1 : undefined,
                matchType: 'name',
                isAmbiguous: bestMatch.isAmbiguous,
                possibleCandidates: bestMatch.candidates,
            });
        }
    }

    return results;
}

export type SpeechParseResult =
    | { type: 'command'; command: VoiceCommand }
    | { type: 'correction'; score: number; studentIndex?: number; rawText: string }
    | { type: 'roll_grade'; studentIndex: number; score: number; rawText: string }
    | { type: 'jump_to_student'; studentIndex: number; rawText: string }
    | { type: 'name_grade'; studentId: string; studentName: string; studentIndex: number; score: number; rawText: string }
    | { type: 'active_grade'; score: number; rawText: string }
    | { type: 'none' };

/**
 * Unified smart analyzer that detects commands, corrections, attendance roll numbers, student names,
 * and direct grades from spoken Indonesian phrases.
 */
export function parseSpokenInput(
    spokenText: string,
    students: MinimStudent[],
    _activeStudentIndex: number
): SpeechParseResult {
    const text = spokenText.trim();
    if (!text) return { type: 'none' };

    // 1. Check for navigation/control commands
    const command = parseVoiceCommand(text);
    if (command) {
        return { type: 'command', command };
    }

    // 2. Check for explicit correction (e.g. "ralat 85", "ganti 90", "salah 80", "bukan 95", "ralat absen 2 85")
    const words = normalizeSpeechText(text).split(' ');
    const hasCorrectionWord = words.some(w => CORRECTION_KEYWORDS.has(w));
    if (hasCorrectionWord) {
        const remainder = text.replace(/^(?:ralat|ganti|ubah|salah|bukan)\s+/i, '').trim();
        // Check if remainder has roll number (e.g. "nomor 2 85", "absen 3 90")
        const rollCheck = parseAttendanceNumberAndScore(remainder, students.length);
        if (rollCheck) {
            return {
                type: 'correction',
                score: rollCheck.score,
                studentIndex: rollCheck.studentIndex,
                rawText: text,
            };
        }

        const score = parseIndonesianNumber(remainder || text, { allowSingleDigitWithoutPrefix: true });
        if (score !== null) {
            return {
                type: 'correction',
                score,
                rawText: text,
            };
        }
    }

    // 3. Check for attendance/roll number pattern with score ("nomor dua 85", "absen 14 nilai 90", "nomor 2 8 5")
    const rollResult = parseAttendanceNumberAndScore(text, students.length);
    if (rollResult) {
        return {
            type: 'roll_grade',
            studentIndex: rollResult.studentIndex,
            score: rollResult.score,
            rawText: text,
        };
    }

    // 4. Check for attendance jump without score ("nomor lima", "absen 12", "lompat ke nomor 7")
    const jumpResult = parseAttendanceJump(text, students.length);
    if (jumpResult) {
        return {
            type: 'jump_to_student',
            studentIndex: jumpResult.studentIndex,
            rawText: text,
        };
    }

    // 5. Check for student name + score ("Almira 90", "Daneen 40", "Ahmad Fauzi 85")
    const nameMatches = parseNameAndGradeSpeech(text, students);
    if (nameMatches.length > 0) {
        const match = nameMatches[0];
        const studentIndex = students.findIndex(s => s.id === match.studentId);
        if (studentIndex !== -1) {
            return {
                type: 'name_grade',
                studentId: match.studentId,
                studentName: match.studentName,
                studentIndex,
                score: match.score,
                rawText: text,
            };
        }
    }

    // 6. Check for jumping to student by name alone ("Ahmad Fauzi", "ke Siti Rahma", "pilih Citra")
    const cleanJumpName = text.replace(/^(?:ke|pindah ke|lompat ke|pilih|cari)\s+/i, '').trim();
    if (cleanJumpName.length >= 3 && !parseIndonesianNumber(cleanJumpName)) {
        const match = findStudentMatch(cleanJumpName, students);
        if (match.method !== 'none' && match.confidence >= 80) {
            const studentIndex = students.findIndex(s => s.id === match.studentId);
            if (studentIndex !== -1) {
                return {
                    type: 'jump_to_student',
                    studentIndex,
                    rawText: text,
                };
            }
        }
    }

    // 7. Fallback to direct Indonesian score for currently active student ("85", "8 5", "delapan lima", "nilainya 90 ya")
    const score = parseIndonesianNumber(text);
    if (score !== null) {
        return {
            type: 'active_grade',
            score,
            rawText: text,
        };
    }

    return { type: 'none' };
}
