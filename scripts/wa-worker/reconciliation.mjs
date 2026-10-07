/** Validate an operator-reviewed manifest without inferring delivery from missing logs. */
export function validateEvidence(entries, date) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || new Date(`${date}T00:00:00Z`).toISOString().slice(0, 10) !== date) {
    throw new Error('A valid report date is required');
  }
  if (!Array.isArray(entries) || entries.length === 0) throw new Error('A nonempty evidence manifest is required');
  const seen = new Set();
  for (const item of entries) {
    if (!item || typeof item !== 'object' || typeof item.id !== 'string'
      || !new RegExp(`^laporan-[a-f0-9-]{36}-${date}$`).test(item.id) || seen.has(item.id)) {
      throw new Error('Manifest contains a duplicate or invalid report ID');
    }
    seen.add(item.id);
    if (!['sent', 'not_sent', 'unknown'].includes(item.outcome)) throw new Error('Invalid evidence outcome');
    if (typeof item.evidence !== 'string' || !item.evidence.trim() || item.evidence.length > 1000) {
      throw new Error('Every outcome requires an explicit evidence reference');
    }
    if (item.outcome === 'sent' && (typeof item.wa_id !== 'string' || !item.wa_id.trim() || item.wa_id.length > 256)) {
      throw new Error('Sent evidence requires a WhatsApp receipt');
    }
    if (item.outcome !== 'sent' && item.wa_id != null) throw new Error('Only sent evidence may contain a receipt');
  }
  return entries;
}

function literal(value) {
  return `'${value.replaceAll("'", "''")}'`;
}

/** Create a locked, audited repair transaction for explicitly proven outcomes. */
export function reconciliationSql(entries, date, counts) {
  validateEvidence(entries, date);
  for (const key of ['sent', 'failed']) {
    if (!Number.isSafeInteger(counts[key]) || counts[key] < 0) throw new Error('Invalid preflight counts');
  }
  const manifest = literal(JSON.stringify(entries));
  const suffix = literal(`%-${date}`);
  let delimiter = '$wa_repair$';
  while (manifest.includes(delimiter)) delimiter = delimiter.replace('repair', 'repair_x');
  return `begin;
set local standard_conforming_strings = on;
do ${delimiter}
declare entry jsonb; row_before public.wa_outbox%rowtype; ok boolean;
begin
  perform 1 from public.wa_outbox where id like 'laporan-%' and id like ${suffix} for update;
  if (select count(*) from public.wa_outbox where id like 'laporan-%' and id like ${suffix}) <> ${counts.sent + counts.failed}
    or (select count(*) from public.wa_outbox where id like 'laporan-%' and id like ${suffix} and status='sent') <> ${counts.sent}
    or (select count(*) from public.wa_outbox where id like 'laporan-%' and id like ${suffix}
      and status='failed' and starts_with(error,'delivery_unknown:')) <> ${counts.failed} then
    raise exception 'Report states changed since preflight';
  end if;
  for entry in select value from jsonb_array_elements(${manifest}::jsonb) loop
    select * into strict row_before from public.wa_outbox where id=entry->>'id';
    if entry->>'outcome' = 'unknown' then continue; end if;
    if row_before.status='sent' then
      if entry->>'outcome' <> 'sent' or row_before.wa_id is distinct from entry->>'wa_id' then
        raise exception 'Cannot overwrite an existing sent receipt';
      end if;
      continue;
    end if;
    if row_before.status <> 'failed' or not starts_with(coalesce(row_before.error,''),'delivery_unknown:') then
      raise exception 'Only held deliveries may be reconciled';
    end if;
    insert into public.wa_delivery_reconciliation_audit(delivery_id,outcome,evidence,before_state)
    values(row_before.id,entry->>'outcome',entry->>'evidence',
      to_jsonb(row_before) - 'phone' - 'message');
    if entry->>'outcome' = 'sent' then
      select public.worker_complete(row_before.id,row_before.claim_token,'sent',entry->>'wa_id',null) into ok;
      if not ok then raise exception 'Completion rejected during reconciliation'; end if;
    else
      update public.wa_outbox set status='pending',attempts=0,claim_token=null,
        claimed_at=null,lease_until=null,error=null,wa_id=null,sent_at=null where id=row_before.id;
    end if;
  end loop;
end;
${delimiter};
commit;`;
}
