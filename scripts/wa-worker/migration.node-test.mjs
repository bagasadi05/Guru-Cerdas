import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
import { reconciliationSql } from './reconciliation.mjs';

test('SQL migration enforces claims, receipts, role isolation and audited repairs',
  { skip: !process.env.PGLITE_MODULE }, async () => {
    const { PGlite } = await import(pathToFileURL(process.env.PGLITE_MODULE).href);
    const db = new PGlite();
    try {
      await db.exec(`create role anon; create role authenticated; create role service_role bypassrls;
        grant usage on schema public to anon,authenticated,service_role;
        create table public.classes(id uuid primary key,deleted_at timestamptz,is_archived boolean default false);
        create table public.wa_report_recipients(class_id uuid primary key references public.classes(id),enabled boolean default true);`);
      await db.exec(await readFile(new URL('../../supabase/migrations/20261003042918_create_wa_outbox.sql', import.meta.url), 'utf8'));
      const migration = await readFile(new URL('../../supabase/migrations/20261005105554_harden_wa_delivery.sql', import.meta.url), 'utf8');
      const pacing = await readFile(new URL('../../supabase/migrations/20261005111849_pace_wa_reports_five_minutes.sql', import.meta.url), 'utf8');
      await db.exec(migration);
      await db.exec(migration);
      const rows = async sql => (await db.query(sql)).rows;
      for (const role of ['anon', 'authenticated']) {
        await db.exec(`set role ${role}`);
        await assert.rejects(db.query('select public.worker_delivery_health()'), /permission denied/);
        await assert.rejects(db.query('select * from public.wa_delivery_reconciliation_audit'), /permission denied/);
        await assert.rejects(db.query('select * from public.worker_claim(20)'), /permission denied/);
        await db.exec('reset role');
      }
      await db.exec(`insert into public.wa_outbox(id,phone,message) values
        ('claim-1','6281234567890','synthetic'),('claim-2','6281234567890','synthetic');`);
      const claimed = await rows('select * from public.worker_claim(20)');
      assert.equal(claimed.length, 1);
      const first = claimed[0];
      const call = (status, wa = null, error = null, token = first.claim_token) => db.query(
        'select public.worker_complete($1,$2,$3,$4,$5) as ok', [first.id, token, status, wa, error]);
      await assert.rejects(call('sent'), /receipt is required/);
      assert.equal((await call('failed', null, 'delivery_unknown: send timed out')).rows[0].ok, true);
      assert.equal((await call('failed', null, 'delivery_unknown: send timed out')).rows[0].ok, true);
      assert.equal((await call('sent', 'wa-late', null, 'stale')).rows[0].ok, false);
      assert.equal((await call('sent', 'wa-late')).rows[0].ok, true);
      assert.equal((await call('sent', 'wa-late')).rows[0].ok, true);
      assert.equal((await call('sent', 'different-wa')).rows[0].ok, false);
      await db.exec('truncate public.wa_outbox cascade');
      for (let i = 1; i <= 20; i++) {
        const classId = `aaaaaaaa-aaaa-aaaa-aaaa-${String(i).padStart(12, '0')}`;
        await db.query('insert into public.classes(id) values($1)', [classId]);
        await db.query('insert into public.wa_report_recipients(class_id) values($1)', [classId]);
        const id = `laporan-${classId}-2026-10-05`;
        await db.query(`insert into public.wa_outbox(id,phone,message,status,attempts,claim_token,error,wa_id)
          values($1,'6281234567890','synthetic',$2,$3,$4,$5,$6)`,
        [id, i <= 2 ? 'sent' : 'failed', i <= 2 ? 1 : 3, `claim-${i}`,
          i <= 2 ? null : 'delivery_unknown: lease expired at max attempts', i <= 2 ? `wa-${i}` : null]);
      }
      const all = await rows('select id,status,attempts,error,wa_id from public.wa_outbox order by id');
      const manifest = [
        { id: all[2].id, outcome: 'sent', wa_id: 'wa-proof', evidence: "local journal ' quote $wa_repair$" },
        { id: all[3].id, outcome: 'not_sent', evidence: 'verified transport did not attempt this delivery' },
        { id: all[4].id, outcome: 'unknown', evidence: 'awaiting proof' },
      ];
      await assert.rejects(db.exec(reconciliationSql(manifest, '2026-10-05', { sent: 1, failed: 19 })), /states changed/);
      await db.exec('rollback');
      assert.equal((await rows('select count(*)::int as n from public.wa_delivery_reconciliation_audit'))[0].n, 0);
      await db.exec(reconciliationSql(manifest, '2026-10-05', { sent: 2, failed: 18 }));
      const after = await rows('select id,status,attempts,error,wa_id from public.wa_outbox order by id');
      assert.deepEqual(after.slice(0, 2), all.slice(0, 2));
      assert.equal(after[2].status, 'sent');
      assert.equal(after[2].wa_id, 'wa-proof');
      assert.equal(after[3].status, 'pending');
      assert.equal(after[3].attempts, 0);
      assert.deepEqual(after[4], all[4]);
      assert.equal(after.filter(r => r.status === 'sent').length, 3);
      assert.equal(after.filter(r => r.status === 'failed').length, 16);
      const audit = await rows('select before_state,evidence from public.wa_delivery_reconciliation_audit');
      assert.equal(audit.length, 2);
      assert.equal(audit[0].before_state.phone, undefined);
      assert.equal(audit[0].before_state.message, undefined);
      assert.ok(audit.some(r => r.evidence === manifest[0].evidence));
      const health = (await rows('select public.worker_delivery_health() as health'))[0].health;
      assert.equal(health.expected, 20);
      assert.equal(health.sent + health.failed + health.pending + health.sending + health.missing, 20);
      await db.exec(pacing);
      const progressing = (await rows('select public.worker_delivery_health() as health'))[0].health;
      assert.equal(progressing.send_interval_seconds, 300);
      await db.exec("update public.wa_outbox set status='pending',error=null,wa_id=null;");
      for (const [time, expected] of [['16:59:00',0],['17:09:59',0],['17:10:00',1],['17:15:00',2],['18:45:00',20]]) {
        const frozen = pacing.replaceAll('now()', `timestamptz '2026-10-05 ${time}+07'`);
        await db.exec(frozen);
        const progress = (await rows('select public.worker_delivery_health() as health'))[0].health;
        assert.equal(progress.expected_sent_by_now, expected);
        assert.equal(progress.needs_attention, expected > 0);
        assert.equal(progress.completion_deadline_wib, '2026-10-05T18:45:00');
      }
      await db.exec(pacing.replaceAll('now()', "timestamptz '2026-10-05 17:15:00+07'"));
      await db.exec(`update public.wa_outbox set status='sent',wa_id='synthetic' where id in
        (select id from public.wa_outbox order by id limit 2);`);
      const onTime = (await rows('select public.worker_delivery_health() as health'))[0].health;
      assert.equal(onTime.needs_attention, false);
      await db.exec("update public.wa_outbox set status='failed',error='delivery_unknown: account blocked' where status='pending';");
      assert.equal((await rows('select public.worker_delivery_health() as health'))[0].health.needs_attention, true);
    } finally { await db.close(); }
  });
