import { setTimeout as delay } from 'node:timers/promises';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { createPoller, createWorkerApi, DeliveryJournal, randomGap } from './poller.mjs';

// 4–7 minutes between sends, different every time, and only between 06:00 and 21:00 WIB.
const MIN_GAP_MS = 4 * 60_000;
const MAX_GAP_MS = 7 * 60_000;

const adapterPath = process.env.WA_TRANSPORT_MODULE;
const stateDirectory = process.env.WA_STATE_DIRECTORY;
if (!adapterPath || !stateDirectory) throw new Error('WA_TRANSPORT_MODULE and WA_STATE_DIRECTORY are required');
const transport = await import(pathToFileURL(resolve(adapterPath)).href);
if (typeof transport.isReady !== 'function' || typeof transport.send !== 'function') {
  throw new Error('WhatsApp adapter must export isReady() and send(message)');
}
const poller = createPoller({
  api: createWorkerApi({ url: process.env.SUPABASE_URL, anonKey: process.env.SUPABASE_ANON_KEY,
    token: process.env.WA_WORKER_TOKEN }),
  transport, journal: new DeliveryJournal(stateDirectory),
  sendIntervalMs: () => randomGap(MIN_GAP_MS, MAX_GAP_MS),
  sendWindowWib: { fromHour: 6, toHour: 21 },
});
let stopped = false;
process.once('SIGTERM', () => { stopped = true; });
process.once('SIGINT', () => { stopped = true; });
while (!stopped) {
  try { await poller.tick(); } catch (error) {
    console.error({ event: poller.storageFailed ? 'journal_unavailable' : 'worker_tick_failed',
      http_status: error.status ?? null });
    if (poller.storageFailed) { process.exitCode = 1; break; }
  }
  if (!stopped) await delay(5000);
}
