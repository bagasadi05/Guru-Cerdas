export const MAX_ASH_PER_DAY = 2;

export interface PhDraft {
    subject: string;
    date: string;
    period_label: string;
    id?: string;
}

export function parsePhPeriod(value: string): [number, number] | null {
    const match = value.trim().replace(/[–—]/g, '-').match(/^(\d{1,2})(?:\s*-\s*(\d{1,2}))?$/);
    if (!match) return null;
    const start = Number(match[1]);
    const end = Number(match[2] ?? match[1]);
    return start >= 1 && end >= start && end <= 20 ? [start, end] : null;
}

export function phPeriodsOverlap(left: string, right: string): boolean {
    const a = parsePhPeriod(left);
    const b = parsePhPeriod(right);
    return a && b ? a[0] <= b[1] && b[0] <= a[1] : left.trim() === right.trim();
}

export function comparePhPeriods(left: string, right: string): number {
    const a = parsePhPeriod(left);
    const b = parsePhPeriod(right);
    return a && b ? a[0] - b[0] || a[1] - b[1] : left.localeCompare(right, 'id', { numeric: true });
}

export function getSameDaySchedules<T extends PhDraft>(
    dateStr: string,
    existing: readonly T[],
    excludeId?: string,
): T[] {
    if (!dateStr) return [];
    return existing.filter((item) => !(excludeId && item.id === excludeId) && item.date === dateStr);
}

/**
 * Finds the nearest upcoming school day (Mon–Fri) from `fromDateStr` that has fewer than MAX_ASH_PER_DAY schedules.
 */
export function findNextAvailableAshDate(
    fromDateStr: string,
    existing: readonly PhDraft[],
    excludeId?: string,
    maxDateStr?: string,
): string | null {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(fromDateStr)) return null;
    const [y, m, d] = fromDateStr.split('-').map(Number);
    const cursor = new Date(y, m - 1, d);
    if (Number.isNaN(cursor.getTime())) return null;

    for (let i = 1; i <= 60; i++) {
        cursor.setDate(cursor.getDate() + 1);
        const dayOfWeek = cursor.getDay();
        if (dayOfWeek === 0 || dayOfWeek === 6) continue; // Skip Saturday & Sunday

        const candidate = `${cursor.getFullYear()}-${String(cursor.getMonth() + 1).padStart(2, '0')}-${String(cursor.getDate()).padStart(2, '0')}`;
        if (maxDateStr && candidate > maxDateStr) return null;

        const count = getSameDaySchedules(candidate, existing, excludeId).length;
        if (count < MAX_ASH_PER_DAY) {
            return candidate;
        }
    }
    return null;
}

export function validatePhDraft(
    draft: PhDraft,
    semester: { start_date: string; end_date: string } | undefined,
    existing: readonly PhDraft[],
): string | null {
    if (!draft.subject.trim() || draft.subject.trim().startsWith('(')) return 'Pilih atau isi mata pelajaran terlebih dahulu.';
    if (!semester) return 'Pilih semester terlebih dahulu.';
    if (!/^\d{4}-\d{2}-\d{2}$/.test(draft.date)
        || Number.isNaN(Date.parse(`${draft.date}T00:00:00Z`))
        || new Date(`${draft.date}T00:00:00Z`).toISOString().slice(0, 10) !== draft.date) return 'Tanggal pelaksanaan tidak valid.';
    if (draft.date < semester.start_date || draft.date > semester.end_date) return 'Tanggal ASH harus berada dalam periode semester yang dipilih.';
    if (!parsePhPeriod(draft.period_label)) return 'Isi jam pelajaran 1–20, misalnya 1 atau 1-2.';

    const sameDayItems = getSameDaySchedules(draft.date, existing, draft.id);
    if (sameDayItems.length >= MAX_ASH_PER_DAY) {
        return `Maksimal ${MAX_ASH_PER_DAY} jadwal ASH dalam satu hari (tanggal ini sudah terisi ${sameDayItems.length} ASH).`;
    }

    if (sameDayItems.some((item) => phPeriodsOverlap(item.period_label, draft.period_label))) {
        return 'Jam pelajaran bertumpang tindih dengan jadwal ASH lain pada tanggal tersebut.';
    }
    return null;
}
