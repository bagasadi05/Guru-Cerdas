import { createWorkerApi } from './wa-worker/poller.mjs';

const api = createWorkerApi({ url: process.env.SUPABASE_URL,
  anonKey: process.env.SUPABASE_ANON_KEY, token: process.env.WA_WORKER_TOKEN });
try {
  const result = await api('health');
  console.log(JSON.stringify({ event: result.needs_attention ? 'daily_report_overdue' : 'daily_report_health',
    ...result }));
  process.exitCode = result.needs_attention ? 1 : 0;
} catch (error) {
  console.error(JSON.stringify({ event: 'delivery_monitor_failed', http_status: error.status ?? null }));
  process.exitCode = 2;
}
