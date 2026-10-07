import { createHash, randomUUID } from 'node:crypto';
import { mkdir, open, readFile, readdir, rename } from 'node:fs/promises';
import { resolve } from 'node:path';

/** Persist delivery receipts without storing recipient numbers or message text. */
export class DeliveryJournal {
  constructor(directory) {
    this.directory = resolve(directory);
    this.writes = Promise.resolve();
  }

  file(id) {
    return resolve(this.directory, `${createHash('sha256').update(id).digest('hex')}.json`);
  }

  async get(id) {
    try {
      return JSON.parse(await readFile(this.file(id), 'utf8'));
    } catch (error) {
      if (error.code === 'ENOENT') return undefined;
      throw error;
    }
  }

  async list() {
    await mkdir(this.directory, { recursive: true, mode: 0o700 });
    const files = await readdir(this.directory);
    return Promise.all(files.filter(name => /^[a-f0-9]{64}\.json$/.test(name))
      .map(async name => JSON.parse(await readFile(resolve(this.directory, name), 'utf8'))));
  }

  async set(record) {
    const write = this.writes.then(async () => {
      await mkdir(this.directory, { recursive: true, mode: 0o700 });
      const file = this.file(record.id);
      const temporary = `${file}.${randomUUID()}.tmp`;
      const handle = await open(temporary, 'wx', 0o600);
      try {
        await handle.writeFile(JSON.stringify(record));
        await handle.sync();
      } finally {
        await handle.close();
      }
      await rename(temporary, file);
      if (process.platform !== 'win32') {
        const directory = await open(this.directory, 'r');
        try { await directory.sync(); } finally { await directory.close(); }
      }
    });
    this.writes = write.catch(() => {});
    return write;
  }
}

/** Call the authenticated worker endpoint with a bounded HTTP timeout. */
export function createWorkerApi({ url, anonKey, token, fetchImpl = fetch }) {
  if (!url || !anonKey || !token) throw new Error('WhatsApp worker credentials are missing');
  const endpoint = new URL('/functions/v1/wa-worker/', url);
  if (endpoint.protocol !== 'https:') throw new Error('The worker endpoint must use HTTPS');
  return async (operation, body = {}) => {
    const response = await fetchImpl(new URL(operation, endpoint), {
      method: 'POST',
      headers: { apikey: anonKey, Authorization: `Bearer ${anonKey}`,
        'X-Worker-Token': token, 'Content-Type': 'application/json' },
      body: JSON.stringify(body), signal: AbortSignal.timeout(10000),
    });
    if (!response.ok) {
      const error = new Error(`WhatsApp worker ${operation} returned HTTP ${response.status}`);
      error.status = response.status;
      throw error;
    }
    const result = await response.json();
    if (['complete', 'requeue'].includes(operation) && result.ok !== true) {
      throw new Error(`WhatsApp worker ${operation} did not acknowledge the operation`);
    }
    return result;
  };
}

const REPORT_ID = /^laporan-[0-9a-f-]{36}-(\d{4}-\d{2}-\d{2})$/i;

/** Report day (YYYY-MM-DD) encoded in a class report id, or null for other messages. */
export function reportDayOf(id) {
  const match = typeof id === 'string' ? id.match(REPORT_ID) : null;
  return match ? match[1] : null;
}

/** Date (YYYY-MM-DD) and hour in Asia/Jakarta (UTC+7, no daylight saving). */
export function jakartaClock(epochMs) {
  const shifted = new Date(epochMs + 7 * 60 * 60 * 1000);
  return { date: shifted.toISOString().slice(0, 10), hour: shifted.getUTCHours() };
}

/** Pause recorded by journals written before each record stored its own gap. */
const LEGACY_GAP_MS = 300000;

/** A gap between two sends, picked at random between minMs and maxMs. */
export function randomGap(minMs, maxMs, random = Math.random) {
  return minMs + Math.floor(random() * (maxMs - minMs + 1));
}

/** Process one delivery at a time using the existing connected WhatsApp session. */
export function createPoller({ api, transport, journal, log = console.error, sendTimeoutMs = 30000,
  sendIntervalMs = 300000, sendWindowWib = null, now = Date.now }) {
  // A number gives a fixed pause; a function returns a fresh pause for every send.
  const nextGap = typeof sendIntervalMs === 'function' ? sendIntervalMs : () => sendIntervalMs;
  const checkGap = gap => {
    if (!Number.isSafeInteger(gap) || gap < 0) throw new Error('Invalid send interval');
    return gap;
  };
  if (typeof sendIntervalMs !== 'function') checkGap(sendIntervalMs);
  let inFlight;
  let fatal;
  let lastHealth = -Infinity;
  let nextSendAt = -Infinity;
  const lateSends = new Set();

  async function persist(record) {
    try { await journal.set(record); } catch (error) {
      fatal = error instanceof Error ? error : new Error('Delivery journal persistence failed');
      throw fatal;
    }
  }

  async function acknowledge(record) {
    const delivered = Boolean(record.wa_id);
    try {
      await api('complete', { id: record.id, claim_token: record.claim_token,
        status: delivered ? 'sent' : 'failed', wa_id: record.wa_id ?? null,
        error: delivered ? null : record.error ?? 'delivery_unknown: worker interrupted during send' });
      await persist({ ...record, state: delivered ? 'confirmed' : 'held' });
      return true;
    } catch (error) {
      if (fatal) throw fatal;
      if (error?.status === 409) {
        await persist({ ...record, state: 'conflict' });
        log({ event: 'delivery_requires_reconciliation', id: record.id, has_receipt: delivered });
        return true;
      }
      log({ event: 'completion_retry_pending', id: record.id, http_status: error?.status ?? null });
      return false;
    }
  }

  async function reconcile() {
    let acknowledged = true;
    for (let record of await journal.list()) {
      const lastAttempt = record.send_completed_at ?? record.send_started_at;
      // Reuse the gap chosen when the message was sent; drawing a new one on every tick would
      // keep raising the pause towards the maximum. Journals from before random gaps used 5 minutes.
      const gap = Number.isSafeInteger(record.gap_ms) ? record.gap_ms : LEGACY_GAP_MS;
      if (Number.isFinite(lastAttempt)) nextSendAt = Math.max(nextSendAt, lastAttempt + gap);
      if (['confirmed', 'held', 'conflict'].includes(record.state)) continue;
      if (record.state === 'sending') {
        record = { ...record, state: 'uncertain', error: 'delivery_unknown: worker interrupted during send' };
        await persist(record);
      }
      if (!await acknowledge(record)) acknowledged = false;
    }
    return acknowledged;
  }

  async function health() {
    if (now() - lastHealth < 60000) return;
    lastHealth = now();
    try {
      const result = await api('health');
      if (result.needs_attention) log({ event: 'daily_report_overdue', ...result });
    } catch (error) {
      log({ event: 'delivery_monitor_failed', http_status: error?.status ?? null });
    }
  }

  async function deliver(message) {
    const previous = await journal.get(message.id);
    if (previous) {
      const record = { ...previous, claim_token: message.claim_token,
        state: previous.wa_id ? 'delivered' : 'uncertain' };
      await persist(record);
      await acknowledge(record);
      return;
    }
    const gap = checkGap(nextGap());
    const record = { id: message.id, claim_token: message.claim_token, state: 'sending',
      send_started_at: now(), gap_ms: gap };
    await persist(record);
    nextSendAt = record.send_started_at + gap;
    let timer;
    let timedOut = false;
    const controller = new AbortController();
    const sending = Promise.resolve().then(() => transport.send(message, { signal: controller.signal }));
    const timeout = new Promise((_, reject) => {
      timer = setTimeout(() => {
        timedOut = true;
        controller.abort();
        reject(new Error('send_timeout'));
      }, sendTimeoutMs);
    });
    try {
      const receipt = await Promise.race([sending, timeout]);
      if (typeof receipt?.wa_id !== 'string' || !receipt.wa_id.trim() || receipt.wa_id.length > 256) {
        throw new Error('missing_delivery_receipt');
      }
      const delivered = { ...record, state: 'delivered', wa_id: receipt.wa_id, send_completed_at: now() };
      await persist(delivered);
      nextSendAt = delivered.send_completed_at + gap;
      await acknowledge(delivered);
    } catch (error) {
      if (fatal) throw fatal;
      const notAttempted = !timedOut && error?.deliveryNotAttempted === true;
      const failed = { ...record, state: 'uncertain', send_completed_at: now(), error: notAttempted
        ? 'send_not_attempted: transport rejected before delivery'
        : timedOut ? 'delivery_unknown: send timed out' : 'delivery_unknown: send outcome unconfirmed' };
      await persist(failed);
      nextSendAt = failed.send_completed_at + gap;
      await acknowledge(failed);
      log({ event: 'delivery_held', id: record.id, reason: failed.error });
      if (timedOut) {
        const late = sending.then(async receipt => {
          if (typeof receipt?.wa_id !== 'string' || !receipt.wa_id.trim() || receipt.wa_id.length > 256) return;
          const delivered = { ...record, state: 'delivered', wa_id: receipt.wa_id, send_completed_at: now() };
          await persist(delivered);
          nextSendAt = delivered.send_completed_at + gap;
          await acknowledge(delivered);
        }).catch(() => { log({ event: 'late_send_unconfirmed', id: record.id }); })
          .finally(() => lateSends.delete(late));
        lateSends.add(late);
      }
    } finally {
      clearTimeout(timer);
    }
  }

  async function runTick() {
    if (fatal) throw fatal;
    await health();
    if (!await reconcile()) return;
    await api('recover');
    const clock = jakartaClock(now());
    if (sendWindowWib && (clock.hour < sendWindowWib.fromHour || clock.hour >= sendWindowWib.toHour)) return;
    if (lateSends.size > 0 || now() < nextSendAt || !await transport.isReady()) return;
    const result = await api('claim', { batch_size: 1 });
    if (!Array.isArray(result.messages) || result.messages.length > 1) {
      throw new Error('Worker claim returned an invalid batch');
    }
    if (result.messages.length === 0) return;
    const message = result.messages[0];
    if (typeof message.id !== 'string' || typeof message.claim_token !== 'string'
      || typeof message.phone !== 'string' || typeof message.message !== 'string') {
      throw new Error('Worker claim returned an invalid message');
    }
    // A report from a day that has passed is closed instead of sent late; it uses no send slot.
    const reportDay = reportDayOf(message.id);
    if (reportDay && reportDay < clock.date) {
      await api('complete', { id: message.id, claim_token: message.claim_token, status: 'failed',
        wa_id: null, error: 'expired: report day has passed' });
      log({ event: 'delivery_expired', id: message.id });
      return;
    }
    await deliver(message);
  }

  return {
    tick() {
      if (!inFlight) inFlight = runTick().finally(() => { inFlight = undefined; });
      return inFlight;
    },
    get hasUnsettledSend() { return lateSends.size > 0; },
    get storageFailed() { return Boolean(fatal); },
  };
}
