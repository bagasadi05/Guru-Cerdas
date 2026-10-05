import { describe, it, expect, beforeEach, vi } from 'vitest';

type Call = { table: string; method: string; args: unknown[] };

const calls: Call[] = [];
type Result = { data?: unknown; error: { message: string; code?: string } | null };
/** A single result, or a queue consumed one call at a time. */
const results = new Map<string, Result | Result[]>();
const take = (key: string): Result => {
  const value = results.get(key);
  if (Array.isArray(value)) return value.shift() ?? { data: null, error: null };
  return value ?? { data: null, error: null };
};

/** Chainable stand-in for the Supabase query builder; awaiting it records the chain. */
function builder(table: string) {
  const chain: string[] = [];
  const proxy: Record<string, unknown> = {};
  const record = (method: string) => (...args: unknown[]) => {
    chain.push(method);
    calls.push({ table, method, args });
    return proxy;
  };
  for (const method of ['select', 'insert', 'upsert', 'delete', 'eq', 'not', 'in', 'is', 'order', 'limit']) {
    proxy[method] = record(method);
  }
  proxy.maybeSingle = () => Promise.resolve(take(`${table}.maybeSingle`));
  proxy.then = (resolve: (v: unknown) => void) => {
    const key = `${table}.${chain[0]}`;
    calls.push({ table, method: 'await', args: [chain.join('.')] });
    resolve(take(key));
  };
  return proxy;
}

vi.mock('../../src/services/supabase', () => ({
  supabase: {
    from: (table: string) => builder(table),
    auth: { getUser: () => Promise.resolve({ data: { user: { id: 'user-1' } } }) },
  },
}));

import { deleteProta, savePromes, saveProta } from '../../src/services/perangkatAjarService';
import type { MatrixCell, ProtaHeader, ProtaItem } from '../../src/types/perangkatAjar';

const PROTA_ID = '11111111-1111-4111-8111-111111111111';
const ITEM_A = '22222222-2222-4222-8222-222222222222';
const ITEM_B = '33333333-3333-4333-8333-333333333333';

const header: ProtaHeader = {
  id: PROTA_ID,
  userId: 'user-1',
  academicYear: '2026/2027',
  subject: 'Matematika',
  gradeLevel: 'Kelas 4',
  phase: 'B',
  curriculum: 'MERDEKA',
  weeklyJpQuota: 4,
  reserveJpSem1: 0,
  reserveJpSem2: 0,
};

const item = (id: string, orderIndex: number): ProtaItem => ({
  id,
  semesterNumber: 1,
  elementOrDomain: 'Bilangan',
  learningObjectiveCode: `TP ${orderIndex + 1}`,
  learningObjectiveText: 'Memahami bilangan',
  coreTopic: 'Bab 1',
  targetJp: 8,
  orderIndex,
});

const itemCalls = () => calls.filter((c) => c.table === 'prota_items');

describe('saveProta', () => {
  beforeEach(() => {
    calls.length = 0;
    results.clear();
    localStorage.clear();
  });

  it('upserts items and deletes only rows that were removed', async () => {
    await saveProta(header, [item(ITEM_A, 0), item(ITEM_B, 1)]);

    const methods = itemCalls().map((c) => c.method);
    expect(methods.indexOf('upsert')).toBeLessThan(methods.indexOf('delete'));
    expect(methods).not.toContain('insert');

    const notFilter = itemCalls().find((c) => c.method === 'not');
    expect(notFilter?.args).toEqual(['id', 'in', `(${ITEM_A},${ITEM_B})`]);
  });

  it('keeps existing rows when the upsert fails', async () => {
    results.set('prota_items.upsert', { error: { message: 'network' } });

    await saveProta(header, [item(ITEM_A, 0)]);

    expect(itemCalls().some((c) => c.method === 'delete')).toBe(false);
  });

  it('clears all items when the Prota is emptied', async () => {
    await saveProta(header, []);

    const methods = itemCalls().map((c) => c.method);
    expect(methods).toContain('delete');
    expect(methods).not.toContain('not');
    expect(methods).not.toContain('upsert');
  });

  it('runs overlapping saves of the same Prota one after another', async () => {
    await Promise.all([
      saveProta(header, [item(ITEM_A, 0)]),
      saveProta(header, [item(ITEM_A, 0), item(ITEM_B, 1)]),
    ]);

    const awaited = itemCalls()
      .filter((c) => c.method === 'await')
      .map((c) => String(c.args[0]).split('.')[0]);
    // First save: upsert, delete. Second save: upsert, delete. Never interleaved.
    expect(awaited).toEqual(['upsert', 'delete', 'upsert', 'delete']);
  });
});

describe('savePromes', () => {
  const PROMES_ID = '44444444-4444-4444-8444-444444444444';
  const promesHeader = {
    id: PROMES_ID,
    protaId: PROTA_ID,
    userId: 'user-1',
    semesterNumber: 1 as const,
    weeklyJpLimit: 4,
  };
  const cells: MatrixCell[] = [
    { rowId: ITEM_A, monthIndex: 0, weekNumber: 4, allocatedJp: 4, isLocked: false },
    { rowId: ITEM_A, monthIndex: 0, weekNumber: 5, allocatedJp: 0, isLocked: false, isManual: true },
    { rowId: ITEM_A, monthIndex: 1, weekNumber: 1, allocatedJp: 0, isLocked: false },
  ];

  beforeEach(() => {
    calls.length = 0;
    results.clear();
    localStorage.clear();
    results.set('prota_headers.maybeSingle', { data: { id: PROTA_ID }, error: null });
    results.set('promes_headers.maybeSingle', { data: { id: PROMES_ID }, error: null });
    results.set('prota_items.select', { data: [{ id: ITEM_A }], error: null });
  });

  const allocationCalls = () => calls.filter((c) => c.table === 'promes_week_allocations');

  it('upserts first and deletes only rows that are no longer in the matrix', async () => {
    results.set('promes_week_allocations.select', {
      data: [
        { id: 'keep', prota_item_id: ITEM_A, month_index: 0, week_number: 4 },
        { id: 'manual-zero', prota_item_id: ITEM_A, month_index: 0, week_number: 5 },
        { id: 'old', prota_item_id: ITEM_A, month_index: 2, week_number: 3 },
      ],
      error: null,
    });

    await savePromes(promesHeader, cells);

    const methods = allocationCalls().map((c) => c.method);
    expect(methods.indexOf('upsert')).toBeLessThan(methods.indexOf('delete'));
    const [rows] = allocationCalls().find((c) => c.method === 'upsert')!.args as [Array<Record<string, unknown>>];
    // Empty automatic cells are not stored; a manual 0 is.
    expect(rows.map((row) => [row.week_number, row.allocated_jp, row.is_manual])).toEqual([
      [4, 4, false],
      [5, 0, true],
    ]);
    expect(allocationCalls().find((c) => c.method === 'in')?.args).toEqual(['id', ['old']]);
  });

  it('saves without the manual flag when the column does not exist yet', async () => {
    results.set('promes_week_allocations.upsert', [
      { error: { message: 'Could not find the is_manual column', code: 'PGRST204' } },
      { error: null },
    ]);

    await savePromes(promesHeader, cells);

    const upserts = allocationCalls().filter((c) => c.method === 'upsert');
    expect(upserts).toHaveLength(2);
    const [retryRows] = upserts[1].args as [Array<Record<string, unknown>>];
    expect(retryRows.every((row) => !('is_manual' in row))).toBe(true);
  });

  it('keeps the saved Promes when the upsert fails', async () => {
    results.set('promes_week_allocations.upsert', { error: { message: 'network' } });

    await savePromes(promesHeader, cells);

    expect(allocationCalls().some((c) => c.method === 'delete')).toBe(false);
  });
});

describe('deleteProta', () => {
  beforeEach(() => {
    calls.length = 0;
    results.clear();
    localStorage.clear();
  });

  it('removes local copies and deletes the header in the cloud', async () => {
    localStorage.setItem(`guru_cerdas_perangkat_ajar_prota_${PROTA_ID}`, '{}');
    localStorage.setItem(`guru_cerdas_perangkat_ajar_promes_${PROTA_ID}_1`, '{}');
    localStorage.setItem('guru_cerdas_perangkat_ajar_active_prota_id', PROTA_ID);

    await deleteProta(PROTA_ID);

    expect(localStorage.length).toBe(0);
    const del = calls.filter((c) => c.table === 'prota_headers');
    expect(del.map((c) => c.method)).toEqual(['delete', 'eq', 'await']);
    expect(del[1].args).toEqual(['id', PROTA_ID]);
  });

  it('reports a failed cloud delete', async () => {
    results.set('prota_headers.delete', { error: { message: 'denied' } });
    await expect(deleteProta(PROTA_ID)).rejects.toThrow('denied');
  });
});
