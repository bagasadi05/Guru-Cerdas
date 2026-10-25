import type { ClassRow } from '../../../types';

export function parseSubjectString(fullStr: string): { baseSubject: string; topic: string } {
    const trimmed = fullStr?.trim() || '';
    const parenthesized = trimmed.match(/^(.+?)\s*\((.+?)\)$/);
    if (parenthesized) return { baseSubject: parenthesized[1].trim(), topic: parenthesized[2].trim() };
    const separated = trimmed.match(/^(.+?)\s*[-\u2013]\s*(.+)$/);
    if (separated) return { baseSubject: separated[1].trim(), topic: separated[2].trim() };
    return { baseSubject: trimmed, topic: '' };
}

export function normalizeSubjectDisplay(raw: string): string {
    if (!raw) return '';
    const cleaned = raw.trim().replace(/^Ass\.?\s+/i, '');
    const lower = cleaned.toLowerCase();
    if (lower === 'bhs arab' || lower === 'bhs. arab' || lower === 'bahasa arab') return 'Bahasa Arab';
    if (lower === 'bhs indonesia' || lower === 'bhs. indonesia' || lower === 'bahasa indonesia') return 'Bahasa Indonesia';
    if (lower === 'bhs inggris' || lower === 'bhs. inggris' || lower === 'bahasa inggris') return 'Bahasa Inggris';
    if (lower === 'bhs jawa' || lower === 'bhs. jawa' || lower === 'bahasa jawa') return 'Bahasa Jawa';
    if (lower === 'ipas' || lower === 'i.p.a.s') return 'IPAS';
    if (lower === 'ipa') return 'IPA';
    if (lower === 'ips') return 'IPS';
    if (lower === 'pjok') return 'PJOK';
    if (lower === 'ppkn' || lower === 'pkn') return 'PPKn';
    if (lower === 'pai') return 'PAI';
    if (lower === 'ski') return 'SKI';
    return cleaned;
}

export function choosePhClass(classes: readonly Pick<ClassRow, 'id'>[], requestedIds: (string | undefined)[], homeroomIds: string[]) {
    for (const id of [...requestedIds, ...homeroomIds]) {
        if (id && classes.some(item => item.id === id)) return id;
    }
    return classes[0]?.id || '';
}

const FALLBACK_DOT_PALETTE = [
    'bg-violet-500 shadow-[0_0_8px_rgba(139,92,246,0.45)]',
    'bg-cyan-500 shadow-[0_0_8px_rgba(6,182,212,0.45)]',
    'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.45)]',
    'bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.45)]',
    'bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.45)]',
    'bg-indigo-500 shadow-[0_0_8px_rgba(99,102,241,0.45)]',
];

export function phSubjectColor(subject: string): string {
    const name = parseSubjectString(subject).baseSubject.toLowerCase().trim();
    if (name.includes('matematika')) return 'bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.45)]';
    if (name.includes('informatika') || name.includes('tik') || name.includes('komputer')) {
        return 'bg-cyan-400 shadow-[0_0_8px_rgba(34,211,238,0.5)]';
    }
    if (name.includes('fikih') || name.includes('fiqih')) {
        return 'bg-teal-400 shadow-[0_0_8px_rgba(45,212,191,0.5)]';
    }
    if (name.includes('aqidah') || name.includes('akidah') || name.includes('pai') || name.includes('agama')) {
        return 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.45)]';
    }
    if (name.includes('qur') || name.includes('hadis') || name.includes('tahfidz')) {
        return 'bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.45)]';
    }
    if (name.includes('ski') || name.includes('sejarah')) {
        return 'bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.45)]';
    }
    if (name.includes('arab')) return 'bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.45)]';
    if (name.includes('indonesia')) return 'bg-orange-500 shadow-[0_0_8px_rgba(249,115,22,0.45)]';
    if (name.includes('inggris')) return 'bg-purple-500 shadow-[0_0_8px_rgba(168,85,247,0.45)]';
    if (name.includes('ipa') || name.includes('fisika') || name.includes('biologi') || name.includes('kimia')) {
        return 'bg-sky-500 shadow-[0_0_8px_rgba(14,165,233,0.45)]';
    }
    if (name.includes('ips') || name.includes('ekonomi') || name.includes('geografi') || name.includes('sosiologi')) {
        return 'bg-yellow-500 shadow-[0_0_8px_rgba(234,179,8,0.45)]';
    }
    if (name.includes('pkn') || name.includes('ppkn') || name.includes('pancasila')) {
        return 'bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.45)]';
    }
    if (name.includes('pjok') || name.includes('olahraga') || name.includes('penjas')) {
        return 'bg-lime-500 shadow-[0_0_8px_rgba(132,204,22,0.45)]';
    }
    if (name.includes('seni') || name.includes('prakarya')) {
        return 'bg-pink-500 shadow-[0_0_8px_rgba(236,72,153,0.45)]';
    }

    let hash = 0;
    for (let i = 0; i < name.length; i++) {
        hash = (hash * 31 + name.charCodeAt(i)) >>> 0;
    }
    return FALLBACK_DOT_PALETTE[hash % FALLBACK_DOT_PALETTE.length];
}
