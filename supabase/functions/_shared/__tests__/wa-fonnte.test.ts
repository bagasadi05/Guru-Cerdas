import { describe, it, expect, vi } from 'vitest';
import {
  MAX_GAP_MS,
  MIN_GAP_MS,
  gapAfter,
  interpretFonnteResponse,
  jakartaClock,
  parseReportId,
  runFonnteSender,
  type FonnteSenderDeps,
  type FonnteSendResult,
  type OutboxMessage,
} from '../wa-fonnte';

const CLASS_ID = '11111111-2222-4333-8444-555555555555';
// 17:05 WIB on 6 Oct 2026
const DURING_REPORTS = new Date('2026-10-06T10:05:00Z');

const message = (date: string, attempts = 1, id = `laporan-${CLASS_ID}-${date}`): OutboxMessage => ({
  id,
  phone: '6281234567890',
  message: 'Laporan Harian',
  claim_token: `token-${id}`,
  attempts,
});

function setup(
  queue: OutboxMessage[],
  sendResult: FonnteSendResult | Error,
  now = DURING_REPORTS,
  lastAttempt: { at: Date; key: string } | null = null,
) {
  const pending = [...queue];
  const deps: FonnteSenderDeps = {
    lastAttempt: vi.fn(async () => lastAttempt),
    recover: vi.fn(async () => {}),
    claim: vi.fn(async () => pending.shift() ?? null),
    complete: vi.fn(async () => true),
    requeue: vi.fn(async () => true),
    send: vi.fn(async () => {
      if (sendResult instanceof Error) throw sendResult;
      return sendResult;
    }),
    notifyWaliKelas: vi.fn(async () => {}),
    now: () => now,
  };
  return deps;
}

describe('runFonnteSender', () => {
  it('sends one message per run and records the Fonnte id', async () => {
    const deps = setup([message('2026-10-06'), message('2026-10-06', 1, 'laporan-x')], { ok: true, id: '80367170' });

    const summary = await runFonnteSender(deps);

    expect(summary).toMatchObject({ sent: 1, failed: 0, requeued: 0 });
    expect(deps.send).toHaveBeenCalledTimes(1);
    expect(deps.send).toHaveBeenCalledWith('6281234567890', 'Laporan Harian');
    expect(deps.complete).toHaveBeenCalledWith(expect.objectContaining({ claim_token: `token-laporan-${CLASS_ID}-2026-10-06` }), 'sent', '80367170', null);
    expect(deps.claim).toHaveBeenCalledTimes(1);
    expect(deps.recover).toHaveBeenCalledTimes(1);
  });

  it('expires reports from earlier days instead of sending them late', async () => {
    const deps = setup([message('2026-10-05'), message('2026-10-05', 1, `laporan-${CLASS_ID.replace('1111', '9999')}-2026-10-05`), message('2026-10-06')], { ok: true, id: '1' });

    const summary = await runFonnteSender(deps);

    expect(summary).toMatchObject({ expired: 2, sent: 1 });
    expect(deps.complete).toHaveBeenNthCalledWith(1, expect.anything(), 'failed', null, 'expired: report day has passed');
    expect(deps.notifyWaliKelas).not.toHaveBeenCalled();
  });

  it('retries a Fonnte error on the next run while attempts remain', async () => {
    const deps = setup([message('2026-10-06', 1)], { ok: false, reason: 'device disconnected', retryable: true });

    const summary = await runFonnteSender(deps);

    expect(summary).toMatchObject({ requeued: 1, failed: 0 });
    expect(deps.requeue).toHaveBeenCalledWith(expect.anything(), 'fonnte: device disconnected');
    expect(deps.notifyWaliKelas).not.toHaveBeenCalled();
  });

  it('fails and notifies the wali kelas after the last attempt', async () => {
    const deps = setup([message('2026-10-06', 3)], { ok: false, reason: 'device disconnected', retryable: true });

    const summary = await runFonnteSender(deps);

    expect(summary).toMatchObject({ failed: 1, notified: 1, requeued: 0 });
    expect(deps.complete).toHaveBeenCalledWith(expect.anything(), 'failed', null, 'fonnte: device disconnected');
    expect(deps.notifyWaliKelas).toHaveBeenCalledWith(CLASS_ID, '2026-10-06');
  });

  it('does not retry a permanent error such as an empty quota', async () => {
    const deps = setup([message('2026-10-06', 1)], { ok: false, reason: 'insufficient quota', retryable: false });

    const summary = await runFonnteSender(deps);

    expect(summary).toMatchObject({ failed: 1, notified: 1 });
    expect(deps.requeue).not.toHaveBeenCalled();
  });

  it('never resends when the request to Fonnte did not finish', async () => {
    const deps = setup([message('2026-10-06', 1)], new Error('The signal has been aborted'));

    const summary = await runFonnteSender(deps);

    expect(summary).toMatchObject({ failed: 1, notified: 1, requeued: 0 });
    expect(deps.complete).toHaveBeenCalledWith(
      expect.anything(), 'failed', null, 'delivery_unknown: The signal has been aborted',
    );
  });

  it('keeps a failed push from breaking the run', async () => {
    const deps = setup([message('2026-10-06', 3)], { ok: false, reason: 'token invalid', retryable: true });
    deps.notifyWaliKelas = vi.fn(async () => { throw new Error('push down'); });

    const summary = await runFonnteSender(deps);

    expect(summary).toMatchObject({ failed: 1, notified: 0 });
  });

  it('sends nothing at night', async () => {
    const deps = setup([message('2026-10-06')], { ok: true, id: '1' }, new Date('2026-10-06T15:00:00Z')); // 22:00 WIB

    const summary = await runFonnteSender(deps);

    expect(summary.skipped).toBe('outside_send_window');
    expect(deps.recover).not.toHaveBeenCalled();
    expect(deps.claim).not.toHaveBeenCalled();
  });

  it('does nothing when the queue is empty', async () => {
    const deps = setup([], { ok: true, id: '1' });
    expect(await runFonnteSender(deps)).toMatchObject({ sent: 0, failed: 0, expired: 0 });
    expect(deps.send).not.toHaveBeenCalled();
  });

  it('waits until the gap since the previous attempt has passed', async () => {
    const key = 'laporan-a@2026-10-06T10:00:00Z';
    const gap = gapAfter(key);
    const tooSoon = setup([message('2026-10-06')], { ok: true, id: '1' }, DURING_REPORTS,
      { at: new Date(DURING_REPORTS.getTime() - gap + 1000), key });

    expect(await runFonnteSender(tooSoon)).toMatchObject({ skipped: 'waiting_for_gap', sent: 0 });
    expect(tooSoon.claim).not.toHaveBeenCalled();

    const ready = setup([message('2026-10-06')], { ok: true, id: '1' }, DURING_REPORTS,
      { at: new Date(DURING_REPORTS.getTime() - gap), key });
    expect(await runFonnteSender(ready)).toMatchObject({ sent: 1 });
  });
});

describe('gapAfter', () => {
  it('stays between 4 and 7 minutes and varies between messages', () => {
    const gaps = Array.from({ length: 200 }, (_, i) => gapAfter(`laporan-${i}@2026-10-06T10:${i % 60}:00Z`));
    expect(Math.min(...gaps)).toBeGreaterThanOrEqual(MIN_GAP_MS);
    expect(Math.max(...gaps)).toBeLessThanOrEqual(MAX_GAP_MS);
    expect(new Set(gaps.map((g) => Math.round(g / 30_000))).size).toBeGreaterThan(4);
  });

  it('gives the same gap for the same attempt on every run', () => {
    expect(gapAfter('laporan-x@t')).toBe(gapAfter('laporan-x@t'));
  });
});

describe('interpretFonnteResponse', () => {
  it('accepts the documented success response', () => {
    expect(
      interpretFonnteResponse(200, {
        detail: 'success! message in queue', id: ['80367170'], process: 'pending',
        requestid: 2937124, status: true, target: ['6282227097005'],
      }),
    ).toEqual({ ok: true, id: '80367170' });
  });

  it('reads failures with either status spelling', () => {
    expect(interpretFonnteResponse(200, { Status: false, reason: 'token invalid', requestid: 1 }))
      .toEqual({ ok: false, reason: 'token invalid', retryable: true });
    expect(interpretFonnteResponse(200, { status: false, reason: 'input invalid' }))
      .toEqual({ ok: false, reason: 'input invalid', retryable: false });
    expect(interpretFonnteResponse(200, { status: false, reason: 'insufficient quota' }).ok).toBe(false);
    expect(interpretFonnteResponse(200, { status: false, reason: 'insufficient quota' })).toMatchObject({ retryable: false });
  });

  it('does not treat a success flag without an id as sent', () => {
    expect(interpretFonnteResponse(200, { status: true })).toMatchObject({ ok: false, retryable: true });
    expect(interpretFonnteResponse(502, null)).toEqual({ ok: false, reason: 'HTTP 502', retryable: true });
  });
});

describe('helpers', () => {
  it('parses class report ids', () => {
    expect(parseReportId(`laporan-${CLASS_ID}-2026-10-06`)).toEqual({ classId: CLASS_ID, reportDate: '2026-10-06' });
    expect(parseReportId('broadcast-1')).toBeNull();
  });

  it('uses Jakarta time for the date and hour', () => {
    expect(jakartaClock(new Date('2026-10-05T17:30:00Z'))).toEqual({ date: '2026-10-06', hour: 0 });
    expect(jakartaClock(DURING_REPORTS)).toEqual({ date: '2026-10-06', hour: 17 });
  });
});
