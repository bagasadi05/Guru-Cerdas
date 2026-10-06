/**
 * Riwayat versions, soft delete with undo, and cancelling an AI job.
 */
import React from 'react';
import { act, fireEvent, render, renderHook, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const db = vi.hoisted(() => ({ rows: [] as any[], updates: [] as any[], filters: [] as string[][] }));
const ai = vi.hoisted(() => ({ resolve: null as null | ((v: unknown) => void) }));

vi.mock('../../src/services/supabase', () => {
  const query = (table: string) => {
    const state: { filters: string[][]; update?: any } = { filters: [] };
    const chain: any = {
      select: () => chain,
      eq: (col: string, val: string) => { state.filters.push(['eq', col, val]); return chain; },
      is: (col: string, val: unknown) => { state.filters.push(['is', col, String(val)]); return chain; },
      order: () => chain,
      single: async () => ({ data: db.rows.find((r) => r.id === state.filters.find((f) => f[1] === 'id')?.[2]) ?? null, error: null }),
      update: (values: any) => { state.update = values; return chain; },
      then: (resolve: any) => {
        db.filters.push(...state.filters);
        if (state.update) {
          db.updates.push({ table, values: state.update, filters: state.filters });
          return Promise.resolve({ data: null, error: null }).then(resolve);
        }
        return Promise.resolve({ data: db.rows, error: null }).then(resolve);
      },
    };
    return chain;
  };
  return { supabase: { from: query } };
});
vi.mock('../../src/services/modelIdResolver', () => ({ resolveModelId: async () => null }));
vi.mock('../../src/services/modulAjarAiService', () => ({ modulAjarAiService: { checkCacheHit: async () => false } }));
vi.mock('../../src/services/modulAjarAiGenerator', () => ({
  generateModulAjarAiContent: () => new Promise((resolve) => { ai.resolve = resolve; }),
}));
vi.mock('../../src/utils/i18n', () => ({
  useTranslation: () => ({ t: { lessonPlan: { rubricHapus: 'Hapus', historyLoading: 'Memuat', historyEmpty: 'Kosong' } } }),
}));

import { useModulAjarHistory } from '../../src/components/pages/modul-ajar/hooks/useModulAjarHistory';
import { ModulAjarHistory } from '../../src/components/pages/modul-ajar/components/ModulAjarHistory';
import { useModulAjarAiJob } from '../../src/components/pages/modul-ajar/hooks/useModulAjarAiJob';
import { AiWaitingCard } from '../../src/components/pages/modul-ajar/components/AiWaitingCard';
import { UndoBar } from '../../src/components/pages/modul-ajar/components/UndoBar';

const plan = (id: string, created: string, topik = 'Siklus Air') => ({
  id,
  user_id: 'u1',
  document_type: 'Modul Ajar',
  curriculum_approach: 'Merdeka',
  generation_method: 'AI',
  identity: { mapel: 'IPAS', topik, kelas: '3' },
  components: { model: 'PBL' },
  created_at: created,
  updated_at: created,
});

beforeEach(() => {
  db.rows = [];
  db.updates = [];
  db.filters = [];
  ai.resolve = null;
});

describe('useModulAjarHistory', () => {
  it('lists only documents that are not deleted', async () => {
    db.rows = [plan('a', '2026-10-01T08:00:00Z')];
    const { result } = renderHook(() => useModulAjarHistory('u1'));
    await waitFor(() => expect(result.current.history).toHaveLength(1));
    expect(db.filters).toContainEqual(['is', 'deleted_at', 'null']);
  });

  it('soft-deletes and can undo, keeping newest first', async () => {
    db.rows = [plan('new', '2026-10-02T08:00:00Z'), plan('old', '2026-10-01T08:00:00Z')];
    const { result } = renderHook(() => useModulAjarHistory('u1'));
    await waitFor(() => expect(result.current.history).toHaveLength(2));

    let removed: any;
    await act(async () => { removed = await result.current.softDelete('new'); });
    expect(removed?.id).toBe('new');
    expect(result.current.history.map((p) => p.id)).toEqual(['old']);
    expect(db.updates[0].values.deleted_at).toEqual(expect.any(String));

    await act(async () => { await result.current.undoDelete(removed); });
    expect(result.current.history.map((p) => p.id)).toEqual(['new', 'old']);
    expect(db.updates[1].values).toEqual({ deleted_at: null });
  });
});

describe('Riwayat versions', () => {
  const props = { isLoading: false, onDelete: vi.fn(), onDuplicate: vi.fn() };

  it('shows one card per document with its older versions behind a toggle', () => {
    const onRestore = vi.fn();
    render(
      <ModulAjarHistory
        {...props}
        onRestore={onRestore}
        history={[
          plan('v3', '2026-10-03T08:00:00Z'),
          plan('v2', '2026-10-02T08:00:00Z'),
          plan('other', '2026-10-01T08:00:00Z', 'Gaya Magnet'),
          plan('v1', '2026-09-30T08:00:00Z'),
        ]}
      />,
    );
    expect(screen.getAllByText('IPAS')).toHaveLength(2);
    const toggle = screen.getByText('2 versi sebelumnya').closest('button')!;
    fireEvent.click(toggle);
    expect(toggle).toHaveAttribute('aria-expanded', 'true');
    const versions = screen.getAllByTitle('Buka versi ini');
    expect(versions).toHaveLength(2);
    fireEvent.click(versions[1]);
    expect(onRestore).toHaveBeenCalledWith(expect.objectContaining({ id: 'v1' }));
  });
});

describe('cancelling an AI job', () => {
  const form: any = { mataPelajaran: 'IPAS', topik: 'Siklus Air', fase: 'B', selectedModelId: 'pbl', metodePembelajaran: [] };

  it('ignores an answer that arrives after Batalkan', async () => {
    const onSuccess = vi.fn();
    const onError = vi.fn();
    const { result } = renderHook(() => useModulAjarAiJob(form, onSuccess, onError));

    let running: Promise<void> = Promise.resolve();
    act(() => { running = result.current.startJob(); });
    await waitFor(() => expect(ai.resolve).not.toBeNull());
    expect(result.current.startedAt).toEqual(expect.any(Number));

    act(() => result.current.cancelJob());
    expect(result.current.jobStatus).toBe('idle');

    await act(async () => { ai.resolve!({ tujuanPembelajaran: ['TP'] }); await running; });
    expect(onSuccess).not.toHaveBeenCalled();
    expect(onError).not.toHaveBeenCalled();
    expect(result.current.jobStatus).toBe('idle');
  });
});

describe('AiWaitingCard', () => {
  it('shows the real elapsed time and a cancel button', () => {
    const onCancel = vi.fn();
    render(<AiWaitingCard title="AI sedang menyusun" startedAt={Date.now() - 5000} onCancel={onCancel} />);
    expect(screen.getByText(/Sudah 5 detik/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Batalkan' }));
    expect(onCancel).toHaveBeenCalled();
  });
});

describe('UndoBar', () => {
  it('offers Urungkan and closes itself when the window ends', () => {
    vi.useFakeTimers();
    const onUndo = vi.fn();
    const onExpire = vi.fn();
    const { rerender } = render(<UndoBar message="Dihapus." onUndo={onUndo} onExpire={onExpire} durationMs={10000} />);
    fireEvent.click(screen.getByRole('button', { name: /Urungkan/ }));
    expect(onUndo).toHaveBeenCalled();

    // A parent re-render must not restart the countdown.
    vi.advanceTimersByTime(6000);
    rerender(<UndoBar message="Dihapus." onUndo={onUndo} onExpire={onExpire} durationMs={10000} />);
    vi.advanceTimersByTime(4000);
    expect(onExpire).toHaveBeenCalledTimes(1);
    vi.useRealTimers();
  });
});
