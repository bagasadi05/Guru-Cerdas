import type { ClassRow } from '../../../types';

export function parseSubjectString(fullStr: string): { baseSubject: string; topic: string } {
    const trimmed = fullStr?.trim() || '';
    const parenthesized = trimmed.match(/^(.+?)\s*\((.+?)\)$/);
    if (parenthesized) return { baseSubject: parenthesized[1].trim(), topic: parenthesized[2].trim() };
    const separated = trimmed.match(/^(.+?)\s*[-\u2013]\s*(.+)$/);
    if (separated) return { baseSubject: separated[1].trim(), topic: separated[2].trim() };
    return { baseSubject: trimmed, topic: '' };
}

export function choosePhClass(classes: readonly Pick<ClassRow, 'id'>[], requestedIds: (string | undefined)[], homeroomIds: string[]) {
    for (const id of [...requestedIds, ...homeroomIds]) {
        if (id && classes.some(item => item.id === id)) return id;
    }
    return classes[0]?.id || '';
}

export function phSubjectColor(subject: string): string {
    const name = parseSubjectString(subject).baseSubject.toLowerCase().trim();
    if (name.includes('matematika')) return 'bg-blue-600';
    if (name.includes('aqidah') || name.includes('akidah') || name.includes('pai')) return 'bg-emerald-700';
    if (name.includes('arab')) return 'bg-rose-600';
    if (name.includes('indonesia')) return 'bg-amber-600';
    if (name.includes('ipa') || name.includes('fisika')) return 'bg-cyan-700';
    return 'bg-slate-500';
}
