import { afterEach, describe, expect, it, vi } from 'vitest';
import { waitFor } from '@testing-library/react';

vi.mock('../../src/services/supabase', () => ({ supabase: {} }));
vi.mock('../../src/utils/storage', () => ({ storageGetJSON: vi.fn(async () => []), storageSetJSON: vi.fn(), storageRemove: vi.fn() }));
import { storageSetJSON } from '../../src/utils/storage';

const mutation = { table: 'attendance' as const, operation: 'upsert' as const, payload: [{ student_id: 'student-1', date: '2026-10-10', status: 'Hadir' }] };
function fakeDatabase() {
    const request = { error: null, onsuccess: null, onerror: null } as unknown as IDBRequest;
    const add = vi.fn(() => request);
    const transaction = { objectStore: () => ({ add }), error: null, oncomplete: null, onabort: null, onerror: null } as unknown as IDBTransaction;
    const database = { transaction: () => transaction } as unknown as IDBDatabase;
    vi.stubGlobal('indexedDB', { open: () => {
        const opening = { result: database, onsuccess: null } as unknown as IDBOpenDBRequest;
        queueMicrotask(() => opening.onsuccess?.call(opening, new Event('success')));
        return opening;
    } });
    return { transaction, request, add };
}

afterEach(() => { vi.unstubAllGlobals(); vi.clearAllMocks(); });

describe('persistent attendance queue', () => {
    it('resolves only after transaction commit, not the individual write', async () => {
        vi.resetModules();
        const { transaction, request, add } = fakeDatabase();
        const { addToQueue } = await import('../../src/services/offlineQueue');
        let completed = false;
        const pending = addToQueue(mutation, { requirePersistence: true }).then(() => { completed = true; });
        await waitFor(() => expect(add).toHaveBeenCalledTimes(1));
        request.onsuccess?.call(request, new Event('success'));
        await Promise.resolve();
        expect(completed).toBe(false);
        transaction.oncomplete?.call(transaction, new Event('complete'));
        await pending;
        expect(completed).toBe(true);
    });

    it('rejects aborted transactions without falling back to temporary storage', async () => {
        vi.resetModules();
        const { transaction, add } = fakeDatabase();
        const { addToQueue } = await import('../../src/services/offlineQueue');
        const pending = addToQueue(mutation, { requirePersistence: true });
        const assertion = expect(pending).rejects.toThrow('aborted');
        await waitFor(() => expect(add).toHaveBeenCalledTimes(1));
        transaction.onabort?.call(transaction, new Event('abort'));
        await assertion;
        expect(storageSetJSON).not.toHaveBeenCalled();
    });

    it('rejects unavailable IndexedDB instead of reporting a temporary save as persisted', async () => {
        vi.resetModules();
        vi.stubGlobal('indexedDB', undefined);
        const { addToQueue } = await import('../../src/services/offlineQueue');
        await expect(addToQueue(mutation, { requirePersistence: true })).rejects.toThrow('IndexedDB');
        expect(storageSetJSON).not.toHaveBeenCalled();
    });
});
