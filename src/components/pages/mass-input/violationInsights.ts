import { violationList, type ViolationItem } from '../../../services/violations.data';
import type { ViolationRow } from './types';

const CODE_BY_DESCRIPTION = new Map(violationList.map((v) => [v.description, v.code]));
const KNOWN_CODES = new Set(violationList.map((v) => v.code));

/**
 * Resolves a stored row to a catalogue code. Older rows were saved with
 * `type: 'general'`, so fall back to matching the description.
 */
function codeOf(row: Pick<ViolationRow, 'type' | 'description'>): string | undefined {
    if (row.type && KNOWN_CODES.has(row.type)) return row.type;
    return CODE_BY_DESCRIPTION.get(row.description);
}

/**
 * The violations recorded most often in the loaded rows, most frequent first,
 * topped up from the catalogue order when there is little history.
 */
export function getFrequentViolations(
    rows: Pick<ViolationRow, 'type' | 'description'>[] | undefined,
    limit = 5,
): ViolationItem[] {
    const counts = new Map<string, number>();
    for (const row of rows ?? []) {
        const code = codeOf(row);
        if (code) counts.set(code, (counts.get(code) ?? 0) + 1);
    }

    const ranked = [...counts.entries()]
        .sort((a, b) => b[1] - a[1])
        .map(([code]) => code);
    for (const v of violationList) {
        if (ranked.length >= limit) break;
        if (!ranked.includes(v.code)) ranked.push(v.code);
    }

    const byCode = new Map(violationList.map((v) => [v.code, v]));
    return ranked.slice(0, limit).map((code) => byCode.get(code)!);
}

export interface StudentViolationStatus {
    /** Same violation already recorded for this student on the chosen date. */
    recordedOnDate: boolean;
    /** Total points this student has in the given semester. */
    semesterPoints: number;
}

/**
 * Per-student status for the violation input list. "Recorded on date" uses the
 * same match as the save-time duplicate guard in useViolationMutation
 * (date + description + semester), so the badge predicts exactly which
 * students the save will skip.
 */
export function buildViolationStatusMap(
    rows: Pick<ViolationRow, 'student_id' | 'date' | 'description' | 'points' | 'semester_id'>[] | undefined,
    opts: { description?: string; date?: string; semesterId?: string | null },
): Map<string, StudentViolationStatus> {
    const map = new Map<string, StudentViolationStatus>();
    for (const row of rows ?? []) {
        const inSemester = opts.semesterId ? row.semester_id === opts.semesterId : false;
        // The guard filters on semester_id too (null when no semester is active).
        const sameSemester = (row.semester_id ?? null) === (opts.semesterId ?? null);
        const sameRecord = !!opts.description && sameSemester
            && row.date === opts.date && row.description === opts.description;
        if (!inSemester && !sameRecord) continue;

        const status = map.get(row.student_id) ?? { recordedOnDate: false, semesterPoints: 0 };
        if (inSemester) status.semesterPoints += row.points || 0;
        if (sameRecord) status.recordedOnDate = true;
        map.set(row.student_id, status);
    }
    return map;
}
