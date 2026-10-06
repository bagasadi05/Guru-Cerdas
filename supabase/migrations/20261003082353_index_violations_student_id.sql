-- violations had no index besides the primary key, so per-class lookups
-- (`student_id IN (...)`, used by Input Massal and student detail) and the
-- ON DELETE CASCADE from students scanned the whole table. Not partial on
-- deleted_at: the cascade lookup has no such filter and would skip it.
create index if not exists idx_violations_student_id_date
  on public.violations (student_id, date desc);
