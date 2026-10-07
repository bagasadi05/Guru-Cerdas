import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { setTimeout as delay } from 'node:timers/promises';
import { createPoller, DeliveryJournal } from './poller.mjs';

const message = { id: 'report-1', claim_token: 'claim-1', phone: '6281234567890', message: 'synthetic' };
function fixture(overrides = {}) {
  const records = new Map();
  const calls = [];
  const sends = [];
  const logs = [];
  let queue = [message];
  const journal = {
    async get(id) { return records.get(id); },
    async list() { return [...records.values()].map(r => ({ ...r })); },
    async set(r) { records.set(r.id, { ...r }); },
  };
  const api = async (op, body) => {
    calls.push({ op, body });
    if (overrides.api) return overrides.api(op, body, records);
    if (op === 'claim') { const messages = queue; queue = []; return { messages }; }
    if (op === 'health') return { needs_attention: false };
    return { ok: true };
  };
  const transport = {
    async isReady() { return overrides.ready !== false; },
    async send(m) { sends.push(m.id); return { wa_id: 'wa-1' }; },
    ...overrides.transport,
  };
  const poller = createPoller({ api, journal: overrides.journal ?? journal, transport,
    log: event => logs.push(event), sendTimeoutMs: overrides.sendTimeoutMs ?? 30000,
    sendIntervalMs: overrides.sendIntervalMs ?? 0, now: overrides.now ?? Date.now });
  return { poller, records, calls, sends, logs, journal };
}

test('disconnected transport never claims a delivery', async () => {
  const f = fixture({ ready: false });
  await f.poller.tick();
  assert.equal(f.calls.some(c => c.op === 'claim'), false);
});

test('five-minute pause happens before claiming the next message', async () => {
  let time = 1000000;
  let claims = 0;
  const f = fixture({ sendIntervalMs: 300000, now: () => time,
    api: async op => op === 'claim' ? { messages: [{ ...message, id: `report-${++claims}` }] } : { ok: true } });
  await f.poller.tick();
  time += 299999;
  await f.poller.tick();
  assert.equal(claims, 1);
  time++;
  await f.poller.tick();
  assert.equal(claims, 2);
  assert.deepEqual(f.sends, ['report-1', 'report-2']);
});

test('restart preserves the remaining pause while receipt reconciliation continues', async () => {
  const records = new Map([[message.id, { id: message.id, claim_token: message.claim_token,
    state: 'delivered', wa_id: 'wa-1', send_started_at: 990000, send_completed_at: 1000000 }]]);
  const journal = { async list() { return [...records.values()]; }, async get(id) { return records.get(id); },
    async set(record) { records.set(record.id, record); } };
  let time = 1100000;
  const f = fixture({ journal, sendIntervalMs: 300000, now: () => time });
  await f.poller.tick();
  assert.equal(records.get(message.id).state, 'confirmed');
  assert.equal(f.calls.some(c => c.op === 'claim'), false);
  time = 1300000;
  await f.poller.tick();
  assert.equal(f.calls.filter(c => c.op === 'claim').length, 1);
  assert.deepEqual(f.sends, []);
});

test('overlapping ticks share one send and persist its receipt before completion', async () => {
  let complete = 0;
  const f = fixture({ api: async (op, body, records) => {
    if (op === 'claim') return { messages: [message] };
    if (op === 'complete') {
      complete++;
      assert.equal(records.get(message.id).wa_id, 'wa-1');
      assert.equal(body.wa_id, 'wa-1');
    }
    return { ok: true };
  } });
  const one = f.poller.tick();
  assert.equal(one, f.poller.tick());
  await one;
  assert.equal(complete, 1);
  assert.deepEqual(f.sends, [message.id]);
  assert.equal(f.records.get(message.id).state, 'confirmed');
});

test('failed completion is retried with an empty queue without resending', async () => {
  let claims = 0;
  let completes = 0;
  const f = fixture({ api: async op => {
    if (op === 'claim') return { messages: claims++ === 0 ? [message] : [] };
    if (op === 'complete' && completes++ === 0) throw Object.assign(new Error(), { status: 503 });
    return { ok: true };
  } });
  await f.poller.tick();
  assert.equal(f.records.get(message.id).state, 'delivered');
  await f.poller.tick();
  assert.deepEqual(f.sends, [message.id]);
  assert.equal(completes, 2);
  assert.equal(f.records.get(message.id).state, 'confirmed');
});

test('restart with an in-progress journal entry holds the delivery without resending', async () => {
  const f = fixture();
  f.records.set(message.id, { id: message.id, claim_token: message.claim_token, state: 'sending' });
  await f.poller.tick();
  assert.deepEqual(f.sends, []);
  assert.equal(f.records.get(message.id).state, 'held');
  assert.ok(f.calls.filter(c => c.op === 'complete').every(c => c.body.status === 'failed'));
});

test('timed out delivery is held, aborts transport, and a late receipt is confirmed', async () => {
  let finish;
  let signal;
  const f = fixture({ sendTimeoutMs: 5, transport: {
    send(_m, options) { signal = options.signal; return new Promise(resolve => { finish = resolve; }); },
  } });
  await f.poller.tick();
  assert.equal(signal.aborted, true);
  assert.equal(f.records.get(message.id).state, 'held');
  assert.equal(f.calls.find(c => c.op === 'complete').body.error, 'delivery_unknown: send timed out');
  await f.poller.tick();
  assert.equal(f.calls.filter(c => c.op === 'claim').length, 1);
  finish({ wa_id: 'late-wa' });
  for (let i = 0; i < 20 && f.poller.hasUnsettledSend; i++) await delay(1);
  assert.equal(f.records.get(message.id).state, 'confirmed');
  assert.equal(f.records.get(message.id).wa_id, 'late-wa');
});

test('a send rejection holds that message and allows the next delivery', async () => {
  let claims = 0;
  let sends = 0;
  const f = fixture({ api: async op => op === 'claim'
    ? { messages: [{ ...message, id: `report-${++claims}` }] } : { ok: true },
  transport: { async send() { if (++sends === 1) throw new Error('unconfirmed'); return { wa_id: 'wa-2' }; } } });
  await f.poller.tick();
  await f.poller.tick();
  assert.equal(f.records.get('report-1').state, 'held');
  assert.equal(f.records.get('report-2').state, 'confirmed');
});

test('a transport rejection without an error object is still held for review', async () => {
  const f = fixture({ transport: { async send() { throw undefined; } } });
  await f.poller.tick();
  assert.equal(f.records.get(message.id).state, 'held');
  assert.equal(f.calls.find(c => c.op === 'complete').body.error, 'delivery_unknown: send outcome unconfirmed');
});

test('a conflict receipt survives for operator reconciliation and is never resent', async () => {
  const f = fixture({ api: async op => {
    if (op === 'claim') return { messages: [message] };
    if (op === 'complete') throw Object.assign(new Error(), { status: 409 });
    return { ok: true };
  } });
  f.records.set(message.id, { id: message.id, claim_token: 'old-claim', state: 'delivered', wa_id: 'wa-old' });
  await f.poller.tick();
  assert.deepEqual(f.sends, []);
  assert.equal(f.records.get(message.id).wa_id, 'wa-old');
  assert.equal(f.records.get(message.id).state, 'conflict');
});

test('journal failure stops all subsequent claims', async () => {
  const journal = { async get() {}, async list() { return []; }, async set() { throw new Error('disk full'); } };
  const f = fixture({ journal });
  await assert.rejects(f.poller.tick(), /disk full/);
  await assert.rejects(f.poller.tick(), /disk full/);
  assert.equal(f.poller.storageFailed, true);
  assert.equal(f.calls.filter(c => c.op === 'claim').length, 1);
  assert.deepEqual(f.sends, []);
});

test('monitor warns when the scheduled reports are overdue', async () => {
  const f = fixture({ ready: false, api: async op => op === 'health'
    ? { needs_attention: true, expected: 20, sent: 2 } : { ok: true } });
  await f.poller.tick();
  assert.equal(f.logs[0].event, 'daily_report_overdue');
});

test('a persisted journal survives a new instance without retaining phone or text', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'guru-wa-journal-'));
  try {
    const journal = new DeliveryJournal(directory);
    await journal.set({ id: message.id, claim_token: message.claim_token, state: 'delivered', wa_id: 'wa-1' });
    const next = new DeliveryJournal(directory);
    assert.equal((await next.get(message.id)).wa_id, 'wa-1');
    assert.equal((await next.list()).length, 1);
    assert.equal((await next.get(message.id)).phone, undefined);
    const f = fixture({ journal: next, ready: false });
    await f.poller.tick();
    assert.equal((await next.get(message.id)).state, 'confirmed');
    assert.deepEqual(f.sends, []);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});
