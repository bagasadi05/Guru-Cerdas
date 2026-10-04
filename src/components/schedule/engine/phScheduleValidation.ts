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
    if (draft.date < semester.start_date || draft.date > semester.end_date) return 'Tanggal PH harus berada dalam periode semester yang dipilih.';
    if (!parsePhPeriod(draft.period_label)) return 'Isi jam pelajaran 1–20, misalnya 1 atau 1-2.';
    if (existing.some((item) => !(draft.id && item.id === draft.id) && item.date === draft.date && phPeriodsOverlap(item.period_label, draft.period_label))) {
        return 'Jam pelajaran bertumpang tindih dengan jadwal PH lain pada tanggal tersebut.';
    }
    return null;
}
