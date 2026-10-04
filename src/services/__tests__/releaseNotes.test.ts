import { describe, it, expect, vi, afterEach } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fetchReleaseNotes, getUnseenReleases, type ReleaseNote } from '../releaseNotes';

const note = (id: string): ReleaseNote => ({ id, date: '2026-10-04', changes: [{ type: 'baru', text: id }] });

describe('getUnseenReleases', () => {
    const notes = [note('v5'), note('v4'), note('v3'), note('v2'), note('v1')];

    it('shows only the latest release when there is no history', () => {
        expect(getUnseenReleases(notes, null).map(n => n.id)).toEqual(['v5']);
    });

    it('shows releases newer than the last seen one', () => {
        expect(getUnseenReleases(notes, 'v3').map(n => n.id)).toEqual(['v5', 'v4']);
    });

    it('shows nothing when the latest release was already seen', () => {
        expect(getUnseenReleases(notes, 'v5')).toEqual([]);
    });

    it('caps a long backlog at three releases', () => {
        expect(getUnseenReleases(notes, 'v1').map(n => n.id)).toEqual(['v5', 'v4', 'v3']);
    });

    it('falls back to the latest release for an unknown last-seen id', () => {
        expect(getUnseenReleases(notes, 'removed').map(n => n.id)).toEqual(['v5']);
    });
});

describe('fetchReleaseNotes', () => {
    afterEach(() => vi.unstubAllGlobals());

    it('bypasses caches and drops malformed entries', async () => {
        const fetchMock = vi.fn().mockResolvedValue({
            ok: true,
            json: async () => [note('v2'), { id: 'bad', date: '2026-01-01', changes: [{ type: 'oops', text: 'x' }] }],
        });
        vi.stubGlobal('fetch', fetchMock);

        const notes = await fetchReleaseNotes();

        expect(notes.map(n => n.id)).toEqual(['v2']);
        expect(fetchMock.mock.calls[0][1]).toEqual({ cache: 'no-store' });
    });

    it('returns an empty list when the request fails', async () => {
        vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('offline')));
        await expect(fetchReleaseNotes()).resolves.toEqual([]);
    });
});

describe('public/release-notes.json', () => {
    const file = JSON.parse(readFileSync(resolve(__dirname, '../../../public/release-notes.json'), 'utf-8')) as ReleaseNote[];

    it('is a valid, newest-first list with unique ids', () => {
        expect(Array.isArray(file) && file.length > 0).toBe(true);
        const ids = file.map(n => n.id);
        expect(new Set(ids).size).toBe(ids.length);
        const dates = file.map(n => n.date);
        expect([...dates].sort().reverse()).toEqual(dates);
        for (const release of file) {
            expect(release.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
            expect(release.changes.length).toBeGreaterThan(0);
            for (const change of release.changes) {
                expect(['baru', 'peningkatan', 'perbaikan']).toContain(change.type);
                expect(change.text.trim().length).toBeGreaterThan(0);
            }
        }
    });
});
