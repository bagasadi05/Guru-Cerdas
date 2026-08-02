import React from 'react';
import { act, renderHook } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useSoftDelete } from '../../src/hooks/useSoftDelete';
import { ENTITY_KEY_COLUMN } from '../../src/services/SoftDeleteService';

// ── Mock supabase untuk merekam kolom query (eq/in) per tabel ────────────────
// Hook ini memanggil softDelete/softDeleteBulk yang memakai ENTITY_KEY_COLUMN
// sebagai kolom filter — regresi ke hardcode 'id' harus tertangkap di sini.
const eqCalls: Array<{ table: string; column: string; value: string }> = [];
const inCalls: Array<{ table: string; column: string; values: string[] }> = [];

vi.mock('../../src/services/supabase', () => {
    const makeChain = (table: string) => {
        const chain: Record<string, unknown> = {
            update: vi.fn(() => chain),
            eq: vi.fn((column: string, value: string) => {
                eqCalls.push({ table, column, value });
                return chain;
            }),
            in: vi.fn((column: string, values: string[]) => {
                inCalls.push({ table, column, values });
                return chain;
            }),
            select: vi.fn(() => chain),
            insert: vi.fn(() => Promise.resolve({ data: null, error: null })),
            not: vi.fn(() => chain),
            order: vi.fn(() => chain),
            lt: vi.fn(() => chain),
            delete: vi.fn(() => chain),
            then: (resolve: (v: unknown) => void) => resolve({ data: null, error: null }),
        };
        return chain;
    };
    return {
        supabase: {
            from: vi.fn((table: string) => makeChain(table)),
        },
    };
});

// ── Mock dependensi hook ─────────────────────────────────────────────────────
vi.mock('../../src/hooks/useToast', () => ({
    useToast: () => ({ success: vi.fn(), error: vi.fn() }),
}));

vi.mock('../../src/components/ui/UndoToast', () => ({
    useUndoToastContext: () => ({
        showUndoToast: vi.fn(),
        hideUndoToast: vi.fn(),
    }),
}));

vi.mock('../../src/hooks/useAuth', () => ({
    useAuth: () => ({ user: { id: 'user-1', email: 'test@example.com' } }),
}));

const createWrapper = () => {
    const queryClient = new QueryClient({
        defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
    });

    return ({ children }: { children: React.ReactNode }) => (
        <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );
};

describe('useSoftDelete — kolom kunci dinamis (anti-HTTP 400)', () => {
    beforeEach(() => {
        eqCalls.length = 0;
        inCalls.length = 0;
        vi.clearAllMocks();
    });

    it('deleteItem user_settings memakai kolom user_id (bukan hardcode id)', async () => {
        const { result } = renderHook(
            () => useSoftDelete({ entity: 'user_settings', queryKey: ['settings'] }),
            { wrapper: createWrapper() }
        );

        await act(async () => {
            await result.current.deleteItem('user-1');
        });

        const call = eqCalls.find(c => c.table === 'user_settings');
        expect(call).toBeDefined();
        expect(call!.column).toBe('user_id');
        expect(call!.value).toBe('user-1');
    });

    it('deleteItems user_settings memakai kolom user_id pada .in()', async () => {
        const { result } = renderHook(
            () => useSoftDelete({ entity: 'user_settings', queryKey: ['settings'] }),
            { wrapper: createWrapper() }
        );

        await act(async () => {
            await result.current.deleteItems(['user-1', 'user-2']);
        });

        const call = inCalls.find(c => c.table === 'user_settings');
        expect(call).toBeDefined();
        expect(call!.column).toBe('user_id');
        expect(call!.values).toEqual(['user-1', 'user-2']);
    });

    it('deleteItem entity biasa (students) tetap memakai kolom id', async () => {
        const { result } = renderHook(
            () => useSoftDelete({ entity: 'students', queryKey: ['students'] }),
            { wrapper: createWrapper() }
        );

        await act(async () => {
            await result.current.deleteItem('student-1');
        });

        const call = eqCalls.find(c => c.table === 'students');
        expect(call).toBeDefined();
        expect(call!.column).toBe('id');
    });

    it('invariant: eq()/in() tiap entity memakai ENTITY_KEY_COLUMN[entity]', async () => {
        const entities = ['students', 'tasks', 'violations', 'homework', 'announcements', 'user_settings'] as const;

        for (const entity of entities) {
            eqCalls.length = 0;
            inCalls.length = 0;

            const { result } = renderHook(
                () => useSoftDelete({ entity, queryKey: ['k'] }),
                { wrapper: createWrapper() }
            );

            await act(async () => {
                await result.current.deleteItem('id-1');
                await result.current.deleteItems(['id-1', 'id-2']);
            });

            const eqCall = eqCalls.find(c => c.table === entity);
            const inCall = inCalls.find(c => c.table === entity);
            expect(eqCall?.column).toBe(ENTITY_KEY_COLUMN[entity]);
            expect(inCall?.column).toBe(ENTITY_KEY_COLUMN[entity]);
        }
    });
});
