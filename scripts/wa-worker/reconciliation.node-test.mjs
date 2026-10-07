import { test } from 'node:test';
import assert from 'node:assert/strict';
import { reconciliationSql, validateEvidence } from './reconciliation.mjs';

const date = '2026-10-05';
const id = `laporan-aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa-${date}`;

test('a sent outcome requires a receipt and an explicit evidence reference', () => {
  assert.throws(() => validateEvidence([{ id, outcome: 'sent', evidence: 'journal:receipt-1' }], date), /receipt/);
  assert.throws(() => validateEvidence([{ id, outcome: 'not_sent', evidence: '' }], date), /evidence reference/);
  assert.throws(() => validateEvidence([{ id, outcome: 'not_sent', evidence: 'log', wa_id: 'receipt' }], date), /Only sent/);
});

test('duplicate IDs and a different report date cannot be repaired', () => {
  const entry = { id, outcome: 'unknown', evidence: 'pending operator review' };
  assert.throws(() => validateEvidence([entry, entry], date), /duplicate/);
  assert.throws(() => validateEvidence([entry], '2026-10-06'), /invalid report ID/);
  assert.throws(() => validateEvidence([entry], '2026-02-30'), /valid report date/);
});

test('operator evidence is escaped inside a distinct SQL delimiter', () => {
  const sql = reconciliationSql([{ id, outcome: 'unknown', evidence: "quote ' and $wa_repair$ and $repair$" }], date,
    { sent: 2, failed: 18 });
  assert.ok(sql.includes('do $wa_repair_x$'));
  assert.ok(sql.includes("quote '' and $wa_repair$"));
  assert.ok(sql.includes("entry->>'outcome' = 'unknown' then continue"));
  assert.ok(sql.includes('for update'));
  assert.ok(sql.includes('wa_delivery_reconciliation_audit'));
});
