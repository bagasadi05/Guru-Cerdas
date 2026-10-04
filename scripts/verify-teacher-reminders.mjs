const projectRef = process.env.SUPABASE_PROJECT_ID;
const token = process.env.SUPABASE_ACCESS_TOKEN;
const preflight = process.argv.includes('--preflight');
if (!projectRef || !token) throw new Error('Supabase project and access token are required');
async function query(sql) {
  const response = await fetch(`https://api.supabase.com/v1/projects/${projectRef}/database/query`, {
    method: 'POST', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ query: sql, read_only: true }), signal: AbortSignal.timeout(30000),
  });
  if (!response.ok) throw new Error(`Supabase verification query failed (HTTP ${response.status})`);
  const rows = await response.json();
  if (!Array.isArray(rows)) throw new Error('Unexpected verification query response');
  return rows;
}
const rows = await query(`
  SELECT jobname, schedule, active, command FROM cron.job
  WHERE jobname IN ('dispatch-scheduled-notifications', 'dispatch-push-hourly', 'dispatch-push-quarterly')
`);
const job = rows.find(row => row.jobname === 'dispatch-scheduled-notifications');
if (!job || (!preflight && !job.active) || job.schedule !== '*/5 * * * *' || job.command !== 'SELECT public.invoke_teacher_reminder_dispatch();') {
  throw new Error('Teacher reminder cron is missing, inactive, or incorrectly configured');
}
if (rows.some(row => row.jobname !== job.jobname && row.active)) throw new Error('An overlapping legacy dispatcher is active');
const secretResult = await query("SELECT value AS secret FROM public.app_config WHERE key = 'dispatch_push_secret'");
const secret = secretResult[0]?.secret;
if (!secret) throw new Error('Internal dispatch secret is missing');
const response = await fetch(`https://${projectRef}.supabase.co/functions/v1/dispatch-push`, {
  method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Internal-Secret': secret },
  body: JSON.stringify({ mode: 'all', dryRun: true }), signal: AbortSignal.timeout(30000),
});
const result = await response.json();
if (!response.ok || result.ok !== true || result.dryRun !== true) throw new Error(`Dispatcher dry run failed (HTTP ${response.status})`);
console.log(preflight ? `Teacher reminder preflight verified; cron ${job.active ? 'active' : 'inactive'}.`
  : 'Teacher reminder cron and authenticated dry run verified.');
