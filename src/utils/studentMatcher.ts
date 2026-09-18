export interface StudentMatchResult {
    studentId: string;
    studentName: string;
    confidence: number; // 0 to 100
    method: 'exact' | 'partial' | 'token' | 'none';
    isAmbiguous?: boolean;
    candidates?: MinimStudent[];
}

export interface MinimStudent {
    id: string;
    name: string;
}

/**
 * Calculates the Levenshtein edit distance between two strings.
 */
export function levenshteinDistance(a: string, b: string): number {
    if (a === b) return 0;
    if (a.length === 0) return b.length;
    if (b.length === 0) return a.length;

    const v0 = new Int32Array(b.length + 1);
    const v1 = new Int32Array(b.length + 1);

    for (let i = 0; i <= b.length; i++) {
        v0[i] = i;
    }

    for (let i = 0; i < a.length; i++) {
        v1[0] = i + 1;
        for (let j = 0; j < b.length; j++) {
            const cost = a[i] === b[j] ? 0 : 1;
            v1[j + 1] = Math.min(v1[j] + 1, v0[j + 1] + 1, v0[j] + cost);
        }
        for (let j = 0; j <= b.length; j++) {
            v0[j] = v1[j];
        }
    }
    return v0[b.length];
}

/**
 * Computes similarity ratio between 0 and 1 using Levenshtein distance.
 */
export function levenshteinSimilarity(a: string, b: string): number {
    const maxLen = Math.max(a.length, b.length);
    if (maxLen === 0) return 1;
    const dist = levenshteinDistance(a, b);
    return 1 - dist / maxLen;
}

/**
 * Normalizes Indonesian and Arabic transliterated names phonetically.
 * Handles common variations in Indonesian school rosters and speech-to-text outputs:
 * - dz/dh -> z
 * - kh/ch -> k
 * - sh/sy -> s
 * - th/ts -> s
 * - gh -> g
 * - ph/v -> f
 * - q -> k
 * - iyah/iya/yah -> ia
 * - aiy/ay -> ai
 * - au/aw -> au
 * - ey/ei -> e
 * - iy/ie -> i
 * - oe -> u, tj -> c, dj -> j
 * - double consonants collapsed (zz->z, ss->s, etc.)
 * - trailing 'h' after vowels (e.g. adzkiyah -> azkia)
 * - al-/el- prefix stripping
 */
export function normalizeIndonesianPhonetic(str: string): string {
    if (!str) return '';
    let s = str.toLowerCase().trim();

    // Remove articles/prefixes like "al-", "el-", "al ", "el "
    s = s.replace(/\b(?:al|el)[-\s]+/g, '');

    // Common Indonesian/Arabic transliteration replacements
    s = s
        .replace(/dz|dh/g, 'z')
        .replace(/kh|ch/g, 'k')
        .replace(/sh|sy/g, 's')
        .replace(/th|ts/g, 's')
        .replace(/gh/g, 'g')
        .replace(/ph/g, 'f')
        .replace(/q/g, 'k')
        .replace(/iyah\b|iyah\s+/g, 'ia ')
        .replace(/iya\b|iya\s+/g, 'ia ')
        .replace(/yah\b|yah\s+/g, 'ia ')
        .replace(/aiy|ay/g, 'ai')
        .replace(/au|aw/g, 'au')
        .replace(/ey|ei/g, 'e')
        .replace(/iy|ie/g, 'i')
        .replace(/oe/g, 'u')
        .replace(/tj/g, 'c')
        .replace(/dj/g, 'j');

    // Collapse double consonants: zz -> z, ss -> s, ll -> l, etc.
    s = s.replace(/([b-df-hj-np-tv-z])\1+/g, '$1');

    // Remove trailing 'h' after a vowel (e.g. "rahmah" -> "rahma")
    s = s.replace(/([aeiou])h\b/g, '$1');

    // Collapse spaces
    s = s.replace(/\s+/g, ' ').trim();

    return s;
}

export const cleanNameString = (str: string): string => {
    if (!str) return '';
    return str.toLowerCase()
              .replace(/^\s*\d+[.)-]?\s*/, '') // Remove leading row numbers/bullets like "1. ", "01 - "
              .replace(/\b(?:nilai|nilainya|skor|skornya|angka|angkanya|poin|poinnya|dapat|dapet|kasih|kasihkan|berikan|diberi|untuk|siswa|murid|ananda|atas\s+nama|bernama)\b/gi, ' ')
              .replace(/[.,\-_'/#!$%^&*;:{}=`~()]/g, ' ')
              .replace(/\s+/g, ' ')
              .trim();
};

export const findStudentMatch = (targetName: string, students: MinimStudent[]): StudentMatchResult => {
    if (!targetName || !students || students.length === 0) {
        return { studentId: '', studentName: '', confidence: 0, method: 'none' };
    }

    const cleanedTarget = cleanNameString(targetName);
    if (!cleanedTarget) {
        return { studentId: '', studentName: '', confidence: 0, method: 'none' };
    }

    // 1. Exact match (case & punctuation normalized)
    const exactMatches = students.filter(s => cleanNameString(s.name) === cleanedTarget);
    if (exactMatches.length === 1) {
        return { studentId: exactMatches[0].id, studentName: exactMatches[0].name, confidence: 100, method: 'exact' };
    }
    if (exactMatches.length > 1) {
        return {
            studentId: exactMatches[0].id,
            studentName: exactMatches[0].name,
            confidence: 95,
            method: 'exact',
            isAmbiguous: true,
            candidates: exactMatches,
        };
    }

    // 2. Direct Substring / Partial match (for queries with >= 3 characters)
    if (cleanedTarget.length >= 3) {
        const directPartialMatches = students.filter(s => {
            const cleanName = cleanNameString(s.name);
            return cleanName.includes(cleanedTarget) || cleanedTarget.includes(cleanName);
        });
        if (directPartialMatches.length === 1) {
            return {
                studentId: directPartialMatches[0].id,
                studentName: directPartialMatches[0].name,
                confidence: 85,
                method: 'partial'
            };
        }
        if (directPartialMatches.length > 1) {
            return {
                studentId: directPartialMatches[0].id,
                studentName: directPartialMatches[0].name,
                confidence: 85,
                method: 'partial',
                isAmbiguous: true,
                candidates: directPartialMatches,
            };
        }
    }

    // 3. Full Phonetic match
    const targetNorm = normalizeIndonesianPhonetic(cleanedTarget);
    const phoneticExactMatches = students.filter(s => {
        const studentNorm = normalizeIndonesianPhonetic(cleanNameString(s.name));
        return studentNorm === targetNorm;
    });
    if (phoneticExactMatches.length === 1) {
        return { studentId: phoneticExactMatches[0].id, studentName: phoneticExactMatches[0].name, confidence: 98, method: 'exact' };
    }
    if (phoneticExactMatches.length > 1) {
        return {
            studentId: phoneticExactMatches[0].id,
            studentName: phoneticExactMatches[0].name,
            confidence: 92,
            method: 'exact',
            isAmbiguous: true,
            candidates: phoneticExactMatches,
        };
    }

    // 4. Multi-word phrase containment
    const targetTokens = cleanedTarget.split(' ').filter(Boolean);
    const targetNormTokens = targetNorm.split(' ').filter(Boolean);

    const candidateScores = new Map<string, { student: MinimStudent; confidence: number; method: 'partial' | 'token' }>();

    const recordCandidate = (student: MinimStudent, confidence: number, method: 'partial' | 'token') => {
        const existing = candidateScores.get(student.id);
        if (!existing || confidence > existing.confidence) {
            candidateScores.set(student.id, { student, confidence, method });
        }
    };

    if (targetTokens.length >= 2) {
        const targetPhraseRegex = new RegExp(`\\b${cleanedTarget.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i');
        students.forEach(s => {
            const clean = cleanNameString(s.name);
            const norm = normalizeIndonesianPhonetic(clean);
            if (targetPhraseRegex.test(clean)) {
                recordCandidate(s, 95, 'partial');
            } else if (norm.includes(targetNorm)) {
                recordCandidate(s, 92, 'partial');
            }
        });
    }

    // 5. Token-level matching (Exact, Phonetic, Abbreviation, and Fuzzy)
    const studentTokenData = students.map(s => {
        const clean = cleanNameString(s.name);
        const tokens = clean.split(' ').filter(Boolean);
        const normTokens = tokens.map(t => normalizeIndonesianPhonetic(t)).filter(Boolean);
        return { student: s, clean, tokens, normTokens };
    });

    if (targetTokens.length === 1) {
        const singleTarget = targetTokens[0];
        const singleTargetNorm = targetNormTokens[0] || normalizeIndonesianPhonetic(singleTarget);

        studentTokenData.forEach(item => {
            // A. Exact token match in student's name
            const hasExactToken = item.tokens.some(t => t === singleTarget);
            if (hasExactToken) {
                recordCandidate(item.student, 90, 'token');
                return;
            }

            // B. Phonetic token match
            const hasPhoneticToken = item.normTokens.some(nt => {
                if (nt === singleTargetNorm) return true;
                if (singleTargetNorm.length >= 4 && (nt.endsWith(singleTargetNorm) || singleTargetNorm.endsWith(nt) || nt.includes(singleTargetNorm))) {
                    return true;
                }
                return false;
            });
            if (hasPhoneticToken) {
                recordCandidate(item.student, 88, 'token');
                return;
            }

            // C. Fuzzy token match (Levenshtein similarity >= 0.75 for tokens >= 4 chars)
            if (singleTarget.length >= 4) {
                let maxSim = 0;
                item.tokens.forEach(t => {
                    if (t.length >= 3) {
                        const sim = levenshteinSimilarity(singleTarget, t);
                        if (sim > maxSim) maxSim = sim;
                    }
                });
                item.normTokens.forEach(nt => {
                    if (nt.length >= 3) {
                        const sim = levenshteinSimilarity(singleTargetNorm, nt);
                        if (sim > maxSim) maxSim = sim;
                    }
                });

                if (maxSim >= 0.75) {
                    recordCandidate(item.student, Math.round(maxSim * 85), 'token');
                }
            }
        });
    } else if (targetTokens.length > 1) {
        // Multi-token matching
        studentTokenData.forEach(item => {
            let matchedTargetTokens = 0;
            let totalSim = 0;

            targetTokens.forEach((t, tIdx) => {
                const tNorm = targetNormTokens[tIdx] || normalizeIndonesianPhonetic(t);
                let bestTokenSim = 0;

                item.tokens.forEach(st => {
                    if (st === t) bestTokenSim = Math.max(bestTokenSim, 1.0);
                    else if ((t.length === 1 && st.startsWith(t)) || (st.length === 1 && t.startsWith(st))) bestTokenSim = Math.max(bestTokenSim, 0.9);
                    else if (t.length >= 3 && (st.startsWith(t) || t.startsWith(st))) bestTokenSim = Math.max(bestTokenSim, 0.9);
                    else if (t.length >= 4) bestTokenSim = Math.max(bestTokenSim, levenshteinSimilarity(t, st));
                });

                item.normTokens.forEach(stNorm => {
                    if (stNorm === tNorm) bestTokenSim = Math.max(bestTokenSim, 0.98);
                    else if (tNorm.length >= 4) bestTokenSim = Math.max(bestTokenSim, levenshteinSimilarity(tNorm, stNorm) * 0.95);
                });

                if (bestTokenSim >= 0.75) {
                    matchedTargetTokens++;
                    totalSim += bestTokenSim;
                }
            });

            const ratio = matchedTargetTokens / targetTokens.length;
            if (ratio >= 0.5) {
                const conf = Math.round((totalSim / targetTokens.length) * 90);
                recordCandidate(item.student, conf, 'token');
            }
        });
    }

    const candidateMatches = Array.from(candidateScores.values());
    if (candidateMatches.length === 0) {
        return { studentId: '', studentName: '', confidence: 0, method: 'none' };
    }

    // Sort candidates: highest confidence first, then shortest name difference
    candidateMatches.sort((a, b) => {
        if (b.confidence !== a.confidence) return b.confidence - a.confidence;
        const diffA = Math.abs(cleanNameString(a.student.name).length - cleanedTarget.length);
        const diffB = Math.abs(cleanNameString(b.student.name).length - cleanedTarget.length);
        return diffA - diffB;
    });

    const best = candidateMatches[0];
    const topCandidates = candidateMatches.map(c => c.student).slice(0, 3);
    const isAmbiguous = candidateMatches.length > 1 &&
        (candidateMatches[1].confidence >= best.confidence - 5) &&
        (candidateMatches[1].confidence >= 80);

    return {
        studentId: best.student.id,
        studentName: best.student.name,
        confidence: best.confidence,
        method: best.method,
        isAmbiguous,
        candidates: topCandidates,
    };
};

