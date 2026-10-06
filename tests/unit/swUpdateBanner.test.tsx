import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, act, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { SWUpdateBanner } from '../../src/components/StatusIndicators';

const NOTES = [
    {
        id: '2026.10.04',
        date: '2026-10-04',
        title: 'Absensi lebih andal',
        changes: [
            { type: 'perbaikan', text: 'Absensi yang sudah direset kini bisa disimpan lagi.' },
            { type: 'baru', text: 'Absensi tidak bisa disimpan di hari Minggu.' },
        ],
    },
    { id: '2026.09.28', date: '2026-09-28', changes: [{ type: 'baru', text: 'Modul Prota & Promes.' }] },
];

function mockNotes(response: unknown = NOTES, ok = true) {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok, json: async () => response }));
}

function renderAt(path = '/dashboard') {
    return render(
        <MemoryRouter initialEntries={[path]}>
            <SWUpdateBanner />
        </MemoryRouter>,
    );
}

function announceUpdate(updateSW = vi.fn()) {
    act(() => {
        window.dispatchEvent(new CustomEvent('sw-update-available', { detail: { updateSW } }));
    });
    return updateSW;
}

describe('SWUpdateBanner ("Apa yang baru")', () => {
    beforeEach(() => {
        sessionStorage.clear();
        localStorage.clear();
    });

    afterEach(() => {
        vi.unstubAllGlobals();
        vi.unstubAllEnvs();
        vi.useRealTimers();
    });

    it('stays hidden until a new version is announced', () => {
        mockNotes();
        renderAt();
        expect(screen.queryByText('Versi baru tersedia')).not.toBeInTheDocument();
    });

    it('shows the new release notes before updating, without reloading on its own', async () => {
        mockNotes();
        renderAt();
        const updateSW = announceUpdate();

        expect(await screen.findByText('Versi baru tersedia')).toBeInTheDocument();
        expect(screen.getByText('Absensi lebih andal')).toBeInTheDocument();
        expect(screen.getByText('Absensi yang sudah direset kini bisa disimpan lagi.')).toBeInTheDocument();
        // Only the latest release when the user has no history yet.
        expect(screen.queryByText('Modul Prota & Promes.')).not.toBeInTheDocument();
        expect(updateSW).not.toHaveBeenCalled();
    });

    it('lists every release since the one the user last saw', async () => {
        localStorage.setItem('release-notes-last-seen', '2026.09.20');
        mockNotes([...NOTES, { id: '2026.09.20', date: '2026-09-20', changes: [{ type: 'baru', text: 'Lama' }] }]);
        renderAt();
        announceUpdate();

        expect(await screen.findByText('Absensi lebih andal')).toBeInTheDocument();
        expect(screen.getByText('Modul Prota & Promes.')).toBeInTheDocument();
        expect(screen.queryByText('Lama')).not.toBeInTheDocument();
    });

    it('updates and remembers the notes as read on "Perbarui sekarang"', async () => {
        mockNotes();
        renderAt();
        const updateSW = announceUpdate();

        fireEvent.click(await screen.findByRole('button', { name: /Perbarui sekarang/i }));

        expect(updateSW).toHaveBeenCalledWith(true);
        expect(localStorage.getItem('release-notes-last-seen')).toBe('2026.10.04');
        expect(sessionStorage.getItem('post-reload-path')).toBe(window.location.pathname + window.location.search);
    });

    it('postpones with "Nanti" and asks again 10 minutes later', async () => {
        mockNotes();
        renderAt();
        const updateSW = announceUpdate();
        const later = await screen.findByRole('button', { name: /Nanti/i });

        vi.useFakeTimers();
        fireEvent.click(later);
        expect(screen.queryByText('Versi baru tersedia')).not.toBeInTheDocument();

        act(() => { vi.advanceTimersByTime(10 * 60 * 1000); });
        expect(screen.getByText('Versi baru tersedia')).toBeInTheDocument();
        expect(updateSW).not.toHaveBeenCalled();
    });

    it('still offers the update when the notes cannot be loaded', async () => {
        mockNotes(null, false);
        renderAt();
        announceUpdate();

        expect(await screen.findByText(/Ada versi baru aplikasi/i)).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /Perbarui sekarang/i })).toBeInTheDocument();
    });

    it('updates quietly on the parent portal, where teacher notes do not apply', () => {
        mockNotes();
        renderAt('/portal/abc');
        const updateSW = announceUpdate();

        expect(updateSW).toHaveBeenCalledWith(true);
        expect(screen.queryByText('Versi baru tersedia')).not.toBeInTheDocument();
    });

    it('after an update applied in the background, shows what changed once', async () => {
        vi.stubEnv('PROD', true);
        localStorage.setItem('release-notes-last-seen', '2026.09.28');
        mockNotes();
        renderAt();

        expect(await screen.findByText('Aplikasi sudah diperbarui')).toBeInTheDocument();
        fireEvent.click(screen.getByRole('button', { name: /Mengerti/i }));

        await waitFor(() => expect(screen.queryByText('Aplikasi sudah diperbarui')).not.toBeInTheDocument());
        expect(localStorage.getItem('release-notes-last-seen')).toBe('2026.10.04');
    });

    it('does not repeat notes the user already read', async () => {
        vi.stubEnv('PROD', true);
        localStorage.setItem('release-notes-last-seen', '2026.10.04');
        mockNotes();
        renderAt();

        await waitFor(() => expect(fetch).toHaveBeenCalled());
        expect(screen.queryByText('Aplikasi sudah diperbarui')).not.toBeInTheDocument();
    });
});
