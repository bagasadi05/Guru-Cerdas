import { findStudentMatch, type MinimStudent } from '../studentMatcher';
import {
    parseIndonesianNumber,
    evaluateNumberTokens,
    isNumberToken,
} from './numberParser';
import { parseAttendanceNumberAndScore } from './attendanceParser';

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

