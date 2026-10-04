import { execFileSync } from 'node:child_process';

const projectRef = process.env.SUPABASE_PROJECT_ID;
const token = process.env.SUPABASE_ACCESS_TOKEN;
const before = process.env.MIGRATION_BEFORE_SHA;
const after = process.env.MIGRATION_AFTER_SHA;
if (!projectRef || !token || !before || !after) throw new Error('Migration verification configuration is missing');
const changes = execFileSync('git', ['diff', '--name-status', before, after, '--', 'supabase/migrations/'], { encoding: 'utf8' })
  .trim().split('\n').filter(Boolean);
const migrations = [];
for (const change of changes) {
  const [status, file] = change.split('\t');
  if (!file.endsWith('.sql')) continue;
  if (status !== 'A') throw new Error('Historical migration edits require manual reconciliation');
  const match = file.match(/\/(\d{14})_([a-z0-9_]+)\.sql$/);
  if (!match) throw new Error('Invalid migration filename');
  migrations.push({ version: match[1], name: match[2] });
}
if (migrations.length) {
  const response = await fetch(`https://api.supabase.com/v1/projects/${projectRef}/database/query`, {
    method: 'POST', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ read_only: true, query: `SELECT version,name FROM supabase_migrations.schema_migrations WHERE version IN (${migrations.map(m => `'${m.version}'`).join(',')})` }),
    signal: AbortSignal.timeout(30000),
  });
  if (!response.ok) throw new Error(`Migration history verification failed (HTTP ${response.status})`);
  const rows = await response.json();
  if (!Array.isArray(rows) || migrations.some(m => !rows.some(r => r.version === m.version && r.name === m.name))) {
    throw new Error('Apply new migrations through the targeted deployment path before pushing');
  }
}
console.log(`Verified ${migrations.length} new migrations already registered in Supabase.`);
