import { readFileSync } from 'node:fs';
const version = '20261005120000';
const name = 'modul_ajar_private_ai_cache';
const ref = process.env.SUPABASE_PROJECT_REF;
const token = process.env.SUPABASE_ACCESS_TOKEN;
const mode = process.argv[2] ?? 'preflight';
if (!ref || !/^[a-z0-9]{20}$/.test(ref) || !token)
  throw new Error('Configure SUPABASE_PROJECT_REF and SUPABASE_ACCESS_TOKEN.');
const localEnv = readFileSync('.env', 'utf8');
const localRef = localEnv.match(
  /^VITE_SUPABASE_URL\s*=\s*["']?https:\/\/([a-z0-9]+)\.supabase\.co/m,
)?.[1];
if (localRef && localRef !== ref)
  throw new Error('Project ref differs from the workspace Supabase URL.');
async function query(sql, readOnly = true) {
  const response = await fetch(`https://api.supabase.com/v1/projects/${ref}/database/query`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ query: sql, read_only: readOnly }),
    signal: AbortSignal.timeout(30000),
  });
  if (!response.ok) throw new Error(`Supabase database request failed (HTTP ${response.status}).`);
  return response.json();
}
const preflight =
  await query(`select to_regclass('public.modul_ajar_ai_cache') is not null as cache_exists,
  to_regclass('public.modul_ajar_ai_usage') is not null as usage_exists,
  exists(select 1 from supabase_migrations.schema_migrations where version='${version}') as applied,
  exists(select 1 from pg_extension where extname='pg_cron') as cron_available,
  (select count(*) from auth.users) >= 2 as can_verify_two_owners`);
console.log('Preflight:', JSON.stringify(preflight));
if (mode === 'preflight') process.exit(0);
if (!['apply', 'verify'].includes(mode)) throw new Error('Use preflight, apply or verify.');
if (mode === 'apply' && !preflight[0].applied) {
  if (preflight[0].cache_exists || preflight[0].usage_exists)
    throw new Error('Unregistered tables already exist; reconcile before applying.');
  if (!preflight[0].cron_available) throw new Error('pg_cron must be available for daily cleanup.');
  const migration = readFileSync(`supabase/migrations/${version}_${name}.sql`, 'utf8');
  if (migration.includes('$migration_body$')) throw new Error('Migration quoting conflict.');
  await query(
    `begin; ${migration}\n insert into supabase_migrations.schema_migrations(version,name,statements) values ('${version}','${name}',array[$migration_body$${migration}$migration_body$]); commit;`,
    false,
  );
  console.log('Migration applied and registered.');
}
const verification =
  await query(`select c.relname, c.relrowsecurity, (select count(*) from pg_policy p where p.polrelid=c.oid) as policy_count
  from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='public' and c.relname in ('modul_ajar_ai_cache','modul_ajar_ai_usage') order by c.relname`);
if (
  verification.length !== 2 ||
  verification.some((row) => !row.relrowsecurity) ||
  verification[0].policy_count !== 4 ||
  verification[1].policy_count !== 2
)
  throw new Error('RLS verification failed.');
console.log('RLS:', JSON.stringify(verification));
const permissions = await query(`select has_table_privilege('anon','public.modul_ajar_ai_cache','select') as anon_cache,
  has_table_privilege('anon','public.modul_ajar_ai_usage','select') as anon_usage,
  has_table_privilege('authenticated','public.modul_ajar_ai_usage','update') as editable_usage,
  has_function_privilege('authenticated','public.cleanup_modul_ajar_ai_data()','execute') as user_cleanup`);
if (Object.values(permissions[0]).some(Boolean)) throw new Error('Private data privilege verification failed.');
console.log('Anonymous access, usage update and client cleanup denied.');
const cron = await query(
  `select jobname,schedule,active from cron.job where jobname='cleanup-modul-ajar-ai'`,
);
if (cron.length !== 1 || !cron[0].active || cron[0].schedule !== '0 19 * * *')
  throw new Error('Daily cleanup verification failed.');
console.log('Cleanup:', JSON.stringify(cron));
const owners = await query('select id from auth.users order by id limit 2');
if (owners.length < 2) throw new Error('Two users are required to verify isolation.');
const [first, second] = owners.map((row) => row.id);
const fingerprint = '0'.repeat(64);
await query(
  `begin;
set local role authenticated;
select set_config('request.jwt.claims','{"sub":"${first}","role":"authenticated"}',true);
insert into public.modul_ajar_ai_cache(user_id,operation,request_fingerprint,prompt_version,contract_version,content) values ('${first}','rls_probe','${fingerprint}',3,3,'{}');
insert into public.modul_ajar_ai_usage(user_id,operation,request_fingerprint,cache_hit,status,latency_ms) values ('${first}','rls_probe','${fingerprint}',true,'completed',0);
do $probe$ begin
  assert (select count(*)=1 from public.modul_ajar_ai_cache where operation='rls_probe'), 'Owner cannot read own cache';
  begin
    insert into public.modul_ajar_ai_cache(user_id,operation,request_fingerprint,prompt_version,contract_version,content) values ('${second}','rls_probe','${fingerprint}',3,3,'{}');
    raise exception 'Cross-owner cache insert unexpectedly succeeded';
  exception when insufficient_privilege then null; end;
end $probe$;
select set_config('request.jwt.claims','{"sub":"${second}","role":"authenticated"}',true);
do $probe$ declare affected integer; begin
  assert (select count(*)=0 from public.modul_ajar_ai_cache where operation='rls_probe'), 'Cache leaked across owners';
  assert (select count(*)=0 from public.modul_ajar_ai_usage where operation='rls_probe'), 'Usage leaked across owners';
  update public.modul_ajar_ai_cache set content='{"changed":true}' where operation='rls_probe';
  get diagnostics affected = row_count;
  assert affected=0, 'Cross-owner cache update succeeded';
  begin
    insert into public.modul_ajar_ai_usage(user_id,operation,request_fingerprint,cache_hit,status,latency_ms) values ('${first}','rls_probe','${fingerprint}',true,'completed',0);
    raise exception 'Cross-owner usage insert unexpectedly succeeded';
  exception when insufficient_privilege then null; end;
end $probe$;
reset role;
insert into public.modul_ajar_ai_cache(user_id,operation,request_fingerprint,prompt_version,contract_version,content,created_at,expires_at) values ('${first}','cleanup_probe','${fingerprint}',3,3,'{}',now()-interval '8 days',now()-interval '2 days');
insert into public.modul_ajar_ai_usage(user_id,operation,request_fingerprint,cache_hit,status,latency_ms,created_at) values ('${first}','cleanup_probe','${fingerprint}',true,'completed',0,now()-interval '31 days');
select public.cleanup_modul_ajar_ai_data();
do $probe$ begin
  assert (select count(*)=0 from public.modul_ajar_ai_cache where operation='cleanup_probe'), 'Expired cache retained';
  assert (select count(*)=0 from public.modul_ajar_ai_usage where operation='cleanup_probe'), 'Old usage retained';
  assert (select count(*)=1 from public.modul_ajar_ai_cache where operation='rls_probe'), 'Valid cache removed';
  assert (select count(*)=1 from public.modul_ajar_ai_usage where operation='rls_probe'), 'Recent usage removed';
end $probe$;
rollback;`,
  false,
);
console.log('Two-owner isolation and expiration/retention verified; probes rolled back.');
