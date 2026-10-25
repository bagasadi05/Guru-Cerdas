import {
    BASIC_NUMBERS,
    NUMBER_KEYWORDS,
    PREFIX_GRADE_KEYWORDS,
    CORRECTION_KEYWORDS,
} from './constants';
import { normalizeSpeechText } from './normalizer';

/**
 * Returns single digit (0-9) from a digit character or Indonesian/regional word.
 */
export function getSingleDigitValue(token: string): number | null {
    if (/^[0-9]$/.test(token)) {
        return Number(token);
    }
    const val = BASIC_NUMBERS[token];
    if (val !== undefined && Number.isInteger(val) && val >= 0 && val <= 9) {
        return val;
    }
    return null;
}

/**
 * Evaluates a sequence of contiguous number tokens into an integer or decimal score (0-100+).
 * Returns null if unparseable, or a number.
 */
export function evaluateNumberTokens(words: string[]): number | null {
    if (words.length === 0) return null;

    // Direct multi-digit or decimal numeric string e.g. "85", "8.5", "100"
    if (words.length === 1 && /^\d+(?:\.\d+)?$/.test(words[0])) {
        return Number(words[0]);
    }

    // A. Spoken decimal with "koma" (e.g. "delapan puluh koma lima" -> 80.5, "tujuh koma lima" -> 7.5, "koma lima" -> 0.5)
    const komaIndex = words.indexOf('koma');
    if (komaIndex !== -1) {
        if (words.lastIndexOf('koma') !== komaIndex) {
            return null; // Reject multiple "koma" in one number
        }

        const integerWords = words.slice(0, komaIndex);
        const fractionWords = words.slice(komaIndex + 1);

        if (fractionWords.length === 0) {
            return null;
        }

        let integerVal = 0;
        if (integerWords.length > 0) {
            const parsedInt = evaluateNumberTokens(integerWords);
            if (parsedInt === null) return null;
            integerVal = parsedInt;
        }

        let fractionVal = 0;
        if (fractionWords.length === 1 && /^\d+$/.test(fractionWords[0])) {
            fractionVal = Number(`0.${fractionWords[0]}`);
        } else {
            let allSingleDigits = true;
            let digitStr = '';
            for (const fw of fractionWords) {
                const d = getSingleDigitValue(fw);
                if (d !== null) {
                    digitStr += String(d);
                } else {
                    allSingleDigits = false;
                    break;
                }
            }

            if (allSingleDigits && digitStr.length > 0) {
                fractionVal = Number(`0.${digitStr}`);
            } else {
                const parsedFrac = evaluateNumberTokens(fractionWords);
                if (parsedFrac === null) return null;
                fractionVal = Number(`0.${parsedFrac}`);
            }
        }

        const total = integerVal + fractionVal;
        return Math.round(total * 1000) / 1000;
    }

    // B. Spoken fractions ("setengah", "separuh", "seperempat", "tiga per empat", "tiga perempat")
    let fractionSuffixVal: number | null = null;
    let prefixTokenCount = 0;

    if (words.length >= 1 && (words[words.length - 1] === 'setengah' || words[words.length - 1] === 'separuh')) {
        fractionSuffixVal = 0.5;
        prefixTokenCount = 1;
    } else if (words.length >= 1 && words[words.length - 1] === 'seperempat') {
        fractionSuffixVal = 0.25;
        prefixTokenCount = 1;
    } else if (
        words.length >= 3 &&
        words[words.length - 3] === 'tiga' &&
        words[words.length - 2] === 'per' &&
        words[words.length - 1] === 'empat'
    ) {
        fractionSuffixVal = 0.75;
        prefixTokenCount = 3;
    } else if (
        words.length >= 2 &&
        words[words.length - 2] === 'tiga' &&
        words[words.length - 1] === 'perempat'
    ) {
        fractionSuffixVal = 0.75;
        prefixTokenCount = 2;
    } else if (
        words.length >= 3 &&
        words[words.length - 3] === 'satu' &&
        words[words.length - 2] === 'per' &&
        words[words.length - 1] === 'empat'
    ) {
        fractionSuffixVal = 0.25;
        prefixTokenCount = 3;
    } else if (
        words.length >= 2 &&
        words[words.length - 2] === 'satu' &&
        words[words.length - 1] === 'perempat'
    ) {
        fractionSuffixVal = 0.25;
        prefixTokenCount = 2;
    }

    if (fractionSuffixVal !== null) {
        const prefixWords = words.slice(0, words.length - prefixTokenCount);
        if (prefixWords.length === 0) {
            return fractionSuffixVal;
        }
        const prefixVal = evaluateNumberTokens(prefixWords);
        if (prefixVal !== null) {
            return Math.round((prefixVal + fractionSuffixVal) * 1000) / 1000;
        }
        return null;
    }

    const joined = words.join(' ');

    // 1. Single-word / full phrase direct lookup ("seratus", "cepek", "seket", "sembilan", "slawe", "selikur", etc.)
    if (BASIC_NUMBERS[joined] !== undefined) {
        return BASIC_NUMBERS[joined];
    }

    // 2. Javanese Likur (21 - 29): "X likur" e.g. "se likur", "ro likur", "telu likur", "pitu likur"
    if (words.length === 2 && words[1] === 'likur') {
        const base = getSingleDigitValue(words[0]);
        if (base !== null && base >= 1 && base <= 9) {
            return 20 + base;
        }
        return null;
    }

    // 3. Regional / slang base tens followed by unit digit:
    // e.g. "gocap lima" (55), "seket lima" (55), "suwidak lima" (65)
    if (words.length === 2) {
        if (words[0] === 'gocap' || words[0] === 'seket') {
            const unit = getSingleDigitValue(words[1]);
            if (unit !== null && unit >= 1 && unit <= 9) {
                return 50 + unit;
            }
        } else if (words[0] === 'suwidak') {
            const unit = getSingleDigitValue(words[1]);
            if (unit !== null && unit >= 1 && unit <= 9) {
                return 60 + unit;
            }
        }
    }

    // 4. Contains "ribu" -> at least 1000 (> 100)
    if (words.includes('ribu')) {
        return 1000;
    }

    // 5. Contains "ratus" or "atus"
    if (words.includes('ratus') || words.includes('atus')) {
        return 150;
    }

    // 6. "seratus" / "cepek" followed by other words -> strictly > 100 (e.g. "seratus lima")
    if (words[0] === 'seratus' || words[0] === 'cepek' || words[0] === 'atus' || words[0] === 'satus') {
        if (words.length > 1) {
            return 150;
        }
    }

    // 7. "X belas" / "X welas" (11 - 19) e.g. "dua belas", "5 belas", "tujuh welas"
    if (words.length === 2 && (words[1] === 'belas' || words[1] === 'welas')) {
        const base = getSingleDigitValue(words[0]);
        if (base !== null && base >= 1 && base <= 9) {
            return 10 + (base === 1 ? 1 : base);
        }
        return null;
    }

    // 8. "X puluh [Y]" (e.g., "delapan puluh lima" -> 85, "8 puluh 5" -> 85, "tujuh puluh" -> 70, "8 puluh" -> 80)
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

    // 9. Casual shorthand 2 digits: e.g. "delapan lima", "8 5", "8 lima", "lapan lima", "sembilan nol", "9 0"
    if (words.length === 2) {
        const d1 = getSingleDigitValue(words[0]);
        const d2 = getSingleDigitValue(words[1]);
        if (d1 !== null && d2 !== null) {
            return d1 * 10 + d2;
        }
    }

    // 10. Casual shorthand 3 digits: e.g. "satu nol nol", "1 0 0", "1 nol nol", "satu kosong kosong" -> 100
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
export function isNumberToken(word: string): boolean {
    return /^\d+(?:\.\d+)?$/.test(word) || NUMBER_KEYWORDS.has(word);
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

    const isDirectDigits = /^\d+(?:\.\d+)?$/.test(normalized);
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

            // Single integer digit 1-9 requires explicit context; float scores (e.g. 7.5, 8.5) are valid grades
            if (Number.isInteger(val) && val >= 1 && val <= 9) {
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
