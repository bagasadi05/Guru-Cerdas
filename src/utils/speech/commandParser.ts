import {
    COMMAND_MAP,
    NUMBER_KEYWORDS,
    PREFIX_GRADE_KEYWORDS,
    type VoiceCommand,
} from './constants';
import { normalizeSpeechText } from './normalizer';

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
        .replace(/\s+(?:ya|dong|dulu|aja|saja|deh|lah|nih|tuh|oke|rek|euy|atuh|yo|nggih)$/i, '')
        .trim();

    if (COMMAND_MAP[trimmedCommand]) {
        return COMMAND_MAP[trimmedCommand];
    }

    return null;
}

