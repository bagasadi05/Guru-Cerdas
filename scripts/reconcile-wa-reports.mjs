import { readFile } from 'node:fs/promises';
import { parseArgs } from 'node:util';
import { reconciliationSql, validateEvidence } from './wa-worker/reconciliation.mjs';

const { values } = parseArgs({ options: {
  date: { type: 'string' }, evidence: { type: 'string' }, 'project-ref': { type: 'string' },
  apply: { type: 'boolean', default: false }, 'worker-stopped': { type: 'boolean', default: false },
} });
const ref = values['project-ref'];
const token = process.env.SUPABASE_ACCESS_TOKEN;
if (!/^[a-z]{20}$/.test(ref ?? '') || !token || !values.date || !values.evidence) {
  throw new Error('Explicit --project-ref, --date, --evidence and SUPABASE_ACCESS_TOKEN are required');
}
if (values.apply && !values['worker-stopped']) throw new Error('Stop the VPS poller before applying repairs');
const evidence = validateEvidence(JSON.parse(await readFile(values.evidence, 'utf8')), values.date);
async function query(sql, readOnly = true) {
  const response = await fetch(`https://api.supabase.com/v1/projects/${ref}/database/query`, {
    method: 'POST', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ query: sql, read_only: readOnly }), signal: AbortSignal.timeout(30000),
  });
  if (!response.ok) throw new Error(`Supabase reconciliation failed (HTTP ${response.status})`);
  const result = await response.json();
  if (!Array.isArray(result)) throw new Error('Unexpected reconciliation response');
  return result;
}
const select = `select id,status,attempts,error,wa_id from public.wa_outbox
where id like 'laporan-%-${values.date}' order by id;`;
const before = await query(select);
const counts = { sent: before.filter(r => r.status === 'sent').length,
  failed: before.filter(r => r.status === 'failed' && r.error?.startsWith('delivery_unknown:')).length };
if (counts.sent + counts.failed !== before.length) throw new Error('Active or unexpected report states require manual review');
for (const item of evidence) {
  const row = before.find(r => r.id === item.id);
  if (!row) throw new Error('Evidence references a report not found in this project');
  if (row.status === 'sent' && item.outcome !== 'unknown'
    && (item.outcome !== 'sent' || item.wa_id !== row.wa_id)) throw new Error('Evidence conflicts with an existing receipt');
}
console.log(JSON.stringify({ date: values.date, before: counts, apply: values.apply,
  proven_sent: evidence.filter(e => e.outcome === 'sent').length,
  proven_not_sent: evidence.filter(e => e.outcome === 'not_sent').length,
  held: evidence.filter(e => e.outcome === 'unknown').length }, null, 2));
if (values.apply) {
  await query(reconciliationSql(evidence, values.date, counts), false);
  const after = await query(select);
  for (const item of evidence) {
    const row = after.find(r => r.id === item.id);
    const old = before.find(r => r.id === item.id);
    if (item.outcome === 'sent' && (row.status !== 'sent' || row.wa_id !== item.wa_id)) {
      throw new Error('Sent receipt was not preserved after repair');
    }
    if (item.outcome === 'not_sent' && (row.status !== 'pending' || row.attempts !== 0)) {
      throw new Error('Verified unsent delivery was not requeued');
    }
    if (item.outcome === 'unknown' && JSON.stringify(row) !== JSON.stringify(old)) {
      throw new Error('An unresolved delivery changed during repair');
    }
  }
  console.log(JSON.stringify({ verified: true, total: after.length,
    sent: after.filter(r => r.status === 'sent').length,
    pending: after.filter(r => r.status === 'pending').length,
    failed: after.filter(r => r.status === 'failed').length }, null, 2));
}
