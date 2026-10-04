// Release notes shown in the "Apa yang baru" dialog when a new app version is
// deployed. The list lives in public/release-notes.json (newest first) and is
// fetched from the server, so an old client always reads the new version's notes.

export type ReleaseChangeType = 'baru' | 'peningkatan' | 'perbaikan';

export interface ReleaseChange {
    type: ReleaseChangeType;
    text: string;
}

export interface ReleaseNote {
    id: string;
    date: string;
    title?: string;
    changes: ReleaseChange[];
}

const LAST_SEEN_KEY = 'release-notes-last-seen';
/** Never show more than this many releases at once after a long absence. */
const MAX_RELEASES_SHOWN = 3;
const CHANGE_TYPES: ReleaseChangeType[] = ['baru', 'peningkatan', 'perbaikan'];

function isReleaseNote(value: unknown): value is ReleaseNote {
    if (!value || typeof value !== 'object') return false;
    const note = value as Record<string, unknown>;
    return typeof note.id === 'string'
        && typeof note.date === 'string'
        && Array.isArray(note.changes)
        && note.changes.every((c: unknown) => {
            const change = c as Record<string, unknown> | null;
            return !!change
                && typeof change.text === 'string'
                && CHANGE_TYPES.includes(change.type as ReleaseChangeType);
        });
}

/** Fetches release notes straight from the network (bypassing caches); [] on any failure. */
export async function fetchReleaseNotes(): Promise<ReleaseNote[]> {
    try {
        const res = await fetch(`/release-notes.json?t=${Date.now()}`, { cache: 'no-store' });
        if (!res.ok) return [];
        const data: unknown = await res.json();
        return Array.isArray(data) ? data.filter(isReleaseNote) : [];
    } catch {
        return [];
    }
}

/**
 * Releases newer than the one the user last saw, newest first. Unknown or
 * missing history shows only the latest release.
 */
export function getUnseenReleases(notes: ReleaseNote[], lastSeenId: string | null): ReleaseNote[] {
    if (notes.length === 0) return [];
    const seenIndex = lastSeenId ? notes.findIndex(n => n.id === lastSeenId) : -1;
    if (seenIndex === -1) return notes.slice(0, 1);
    return notes.slice(0, Math.min(seenIndex, MAX_RELEASES_SHOWN));
}

export function getLastSeenReleaseId(): string | null {
    try {
        return localStorage.getItem(LAST_SEEN_KEY);
    } catch {
        return null;
    }
}

export function markReleaseSeen(id: string): void {
    try {
        localStorage.setItem(LAST_SEEN_KEY, id);
    } catch {
        // Storage can be unavailable (private mode); the dialog may then repeat.
    }
}
