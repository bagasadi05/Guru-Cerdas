import { findStudentMatch, type MinimStudent } from '../studentMatcher';
import {
    CORRECTION_KEYWORDS,
    CORRECTION_PREAMBLE_REGEX,
    INLINE_CORRECTION_SPLIT_REGEX,
    type VoiceCommand,
} from './constants';
import { normalizeSpeechText } from './normalizer';
import { parseVoiceCommand } from './commandParser';
import { parseAttendanceJump, parseAttendanceNumberAndScore } from './attendanceParser';
import { parseNameAndGradeSpeech } from './nameGradeParser';
import { parseIndonesianNumber } from './numberParser';

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

    // 2. Check for explicit correction
    // 2a. Mid-sentence inline correction (e.g. "75 ralat 80", "80 eh bukan 85", "Ahmad Fauzi 75 ralat 80")
    if (INLINE_CORRECTION_SPLIT_REGEX.test(text)) {
        const parts = text.split(INLINE_CORRECTION_SPLIT_REGEX);
        if (parts.length >= 2) {
            const beforePart = parts[0].trim();
            const afterPart = parts.slice(1).join(' ').trim();

            const rollCheckAfter = parseAttendanceNumberAndScore(afterPart, students.length);
            if (rollCheckAfter) {
                return {
                    type: 'correction',
                    score: rollCheckAfter.score,
                    studentIndex: rollCheckAfter.studentIndex,
                    rawText: text,
                };
            }

            const afterScore = parseIndonesianNumber(afterPart, { allowSingleDigitWithoutPrefix: true });
            if (afterScore !== null) {
                const rollCheckBefore = parseAttendanceNumberAndScore(beforePart, students.length);
                if (rollCheckBefore) {
                    return {
                        type: 'correction',
                        score: afterScore,
                        studentIndex: rollCheckBefore.studentIndex,
                        rawText: text,
                    };
                }

                const nameCheckBefore = parseNameAndGradeSpeech(beforePart, students);
                if (nameCheckBefore.length > 0) {
                    const studentIndex = students.findIndex((s) => s.id === nameCheckBefore[0].studentId);
                    if (studentIndex !== -1) {
                        return {
                            type: 'correction',
                            score: afterScore,
                            studentIndex,
                            rawText: text,
                        };
                    }
                } else {
                    const directMatch = findStudentMatch(beforePart, students);
                    if (directMatch.method !== 'none' && directMatch.confidence >= 70) {
                        const studentIndex = students.findIndex((s) => s.id === directMatch.studentId);
                        if (studentIndex !== -1) {
                            return {
                                type: 'correction',
                                score: afterScore,
                                studentIndex,
                                rawText: text,
                            };
                        }
                    }
                }

                return {
                    type: 'correction',
                    score: afterScore,
                    rawText: text,
                };
            }
        }
    }

    // 2b. Conversational preamble correction (e.g. "eh bukan 90", "ralat 85", "eh salah, 80", "maksudnya 88", "maaf ralat jadi 95")
    if (CORRECTION_PREAMBLE_REGEX.test(text)) {
        const remainder = text.replace(CORRECTION_PREAMBLE_REGEX, '').trim();

        const rollCheck = parseAttendanceNumberAndScore(remainder, students.length);
        if (rollCheck) {
            return {
                type: 'correction',
                score: rollCheck.score,
                studentIndex: rollCheck.studentIndex,
                rawText: text,
            };
        }

        const nameCheck = parseNameAndGradeSpeech(remainder, students);
        if (nameCheck.length > 0) {
            const studentIndex = students.findIndex((s) => s.id === nameCheck[0].studentId);
            if (studentIndex !== -1) {
                return {
                    type: 'correction',
                    score: nameCheck[0].score,
                    studentIndex,
                    rawText: text,
                };
            }
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

    // 2c. Fallback for any correction keyword presence
    const words = normalizeSpeechText(text).split(' ');
    const hasCorrectionWord = words.some((w) => CORRECTION_KEYWORDS.has(w));
    if (hasCorrectionWord) {
        const remainder = text.replace(/^(?:ralat|ganti|ubah|salah|bukan|keliru|revisi|maksudnya|maksud)\s+/i, '').trim();
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
