import React from 'react';
import { act, renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useStudentsPageData } from '../../src/components/students/useStudentsPageData';

const db = vi.hoisted(() => ({
  failTable: 'teacher_class_assignments' as string | null,
  classes: [] as { id: string; name: string; user_id: string }[],
}));
vi.mock('../../src/services/supabase', () => ({
  supabase: {
    from: (table: string) => {
      const chain = {
        select: () => chain, eq: () => chain, is: () => chain, order: () => chain, or: () => chain,
        then: (resolve: (value: unknown) => void) => resolve({
          data: table === 'classes' ? db.classes : [], error: table === db.failTable ? { message: 'offline' } : null,
        }),
      };
      return chain;
    },
  },
}));

describe('student page query errors', () => {
  beforeEach(() => { db.failTable = 'teacher_class_assignments'; db.classes = []; sessionStorage.clear(); });

  it.each(['teacher_class_assignments', 'classes', 'students'])('exposes %s failures and retries instead of reporting an empty directory', async (table) => {
    db.failTable = table;
    db.classes = [{ id: 'class-a', name: 'Kelas A', user_id: 'teacher' }];
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );
    const { result } = renderHook(() => useStudentsPageData({ userId: 'teacher', toast: { error: vi.fn() } }), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.isError).toBe(true);
    db.failTable = null;
    await act(async () => { await result.current.retryData(); });
    await waitFor(() => expect(result.current.isError).toBe(false));
    expect(result.current.classes).toEqual(db.classes);
  });

  it.each([
    { isAdmin: true, canViewAll: false, canManage: true },
    { isAdmin: false, canViewAll: true, canManage: false },
  ])('keeps administrator and leadership write permissions distinct: $canManage', async ({ isAdmin, canViewAll, canManage }) => {
    db.failTable = null;
    db.classes = [{ id: 'class-a', name: 'Kelas A', user_id: 'other-teacher' }];
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );
    const { result } = renderHook(() => useStudentsPageData({
      userId: 'teacher', toast: { error: vi.fn() }, isAdmin, canViewAll,
    }), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.canManageActiveClass).toBe(canManage);
  });
});
