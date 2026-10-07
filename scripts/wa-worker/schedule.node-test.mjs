import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createPoller, jakartaClock, randomGap, reportDayOf } from './poller.mjs';

const CLASS_ID = '11111111-2222-4333-8444-555555555555';
const reportFor = day => ({
  id: `laporan-${CLASS_ID}-${day}`, claim_token: `claim-${day}`, phone: '6281234567890', message: 'laporan',
});
// 17:05 WIB on 7 Oct 2026
const DURING_REPORTS = Date.parse('2026-10-07T10:05:00Z');

function fixture({ queue, now = () => DURING_REPORTS, ...options }) {
  const pending = [...queue];
  const calls = [];
  const sends = [];
  const records = new Map();
  const poller = createPoller({
    api: async (op, body) => {
      calls.push({ op, body });
      if (op === 'claim') return { messages: pending.length ? [pending.shift()] : [] };
      if (op === 'health') return { needs_attention: false };
      return { ok: true };
    },
    journal: {
      async get(id) { return records.get(id); },
      async list() { return [...records.values()]; },
      async set(r) { records.set(r.id, { ...r }); },
    },
    transport: { async isReady() { return true; }, async send(m) { sends.push(m.id); return { wa_id: `wa-${m.id}` }; } },
    log: () => {},
    now,
    ...options,
  });
  return { poller, calls, sends };
}

test('a report from an earlier day is expired, not sent', async () => {
  const f = fixture({ queue: [reportFor('2026-10-06'), reportFor('2026-10-07')], sendIntervalMs: 0 });
  await f.poller.tick();
  assert.deepEqual(f.sends, []);
  const expired = f.calls.find(c => c.op === 'complete');
  assert.deepEqual(expired.body, {
    id: `laporan-${CLASS_ID}-2026-10-06`, claim_token: 'claim-2026-10-06', status: 'failed',
    wa_id: null, error: 'expired: report day has passed',
  });
  // The expired report used no send slot: today's report goes on the next tick.
  await f.poller.tick();
  assert.deepEqual(f.sends, [`laporan-${CLASS_ID}-2026-10-07`]);
});

test('nothing is claimed outside the WIB send window', async () => {
  const night = Date.parse('2026-10-07T15:00:00Z'); // 22:00 WIB
  const f = fixture({ queue: [reportFor('2026-10-07')], now: () => night,
    sendWindowWib: { fromHour: 6, toHour: 21 } });
  await f.poller.tick();
  assert.equal(f.calls.some(c => c.op === 'claim'), false);
  assert.deepEqual(f.sends, []);
});

test('each message waits its own random gap', async () => {
  let time = DURING_REPORTS;
  const gaps = [240000, 420000];
  const f = fixture({
    queue: [reportFor('2026-10-07'),
      { ...reportFor('2026-10-07'), id: 'laporan-22222222-2222-4333-8444-555555555555-2026-10-07', claim_token: 'b' },
      { ...reportFor('2026-10-07'), id: 'note-3', claim_token: 'c' }],
    now: () => time,
    sendIntervalMs: () => gaps.shift() ?? 300000,
  });
  await f.poller.tick();
  assert.equal(f.sends.length, 1);
  time += 239999;
  await f.poller.tick();
  assert.equal(f.sends.length, 1);
  time += 1;
  await f.poller.tick();
  assert.equal(f.sends.length, 2);
  time += 419999;
  await f.poller.tick();
  assert.equal(f.sends.length, 2);
  time += 1;
  await f.poller.tick();
  assert.equal(f.sends.length, 3);
});

test('randomGap stays within bounds and reportDayOf only reads class reports', () => {
  assert.equal(randomGap(240000, 420000, () => 0), 240000);
  assert.equal(randomGap(240000, 420000, () => 0.9999999), 420000);
  for (let i = 0; i < 100; i++) {
    const gap = randomGap(240000, 420000);
    assert.ok(gap >= 240000 && gap <= 420000);
  }
  assert.equal(reportDayOf(`laporan-${CLASS_ID}-2026-10-07`), '2026-10-07');
  assert.equal(reportDayOf('report-1'), null);
  assert.deepEqual(jakartaClock(Date.parse('2026-10-06T17:30:00Z')), { date: '2026-10-07', hour: 0 });
});
