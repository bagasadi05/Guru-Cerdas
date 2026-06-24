# Production Checklist — Guru-Cerdas

## 1. Database Migrations → Object Mapping

| Migration | Object DB | Fitur |
|-----------|-----------|-------|
| `20241221_create_user_settings.sql` | Table `user_settings`, Function `handle_updated_at()`, Trigger `handle_settings_updated_at`, 3 RLS policies | User settings |
| `20250207000000_add_undo_and_soft_delete.sql` | Columns: `deleted_at` on 4 tables, Tables: `action_history`, `export_templates`, 7 indexes | Soft delete & undo |
| `20250822100000_update_portal_functions.sql` | ⚠️ FILE BINARY/CORRUPTED - needs investigation | Portal functions |
| `20251222130000_add_tasks_class_id_and_update_rpc.sql` | Column: `class_id` on `tasks`, Function `get_student_portal_data(uuid, text)` | Tasks class assignment |
| `20251222133000_parent_portal_enhancements.sql` | Table `announcements`, Columns: `parent_name`, `parent_phone` on `students`, Functions: `update_parent_info`, `get_student_portal_data` | Parent portal |
| `20251223000000_create_roles_table.sql` | Table `user_roles`, Function `get_user_role(UUID)`, 2 RLS policies | User roles |
| `20251223000001_enhance_user_roles.sql` | Columns: `email`, `full_name` on `user_roles`, Function `handle_new_user()`, Trigger `on_auth_user_created`, Function `sync_users_to_roles()` | Role management |
| `20260106000000_add_attendance_semester_trigger.sql` | Functions: `get_semester_id_for_date(DATE)`, `set_attendance_semester_id()`, Trigger `trigger_set_attendance_semester_id` | Attendance semester |
| `20260106190000_backfill_academic_semester_id.sql` | Function `set_academic_record_semester_id()`, Trigger `ensure_academic_record_semester` | Academic semester backfill |
| `20260107000000_add_violation_type.sql` | Column: `type` on `violations` | Violation type |
| `20260109000000_create_extracurricular_tables.sql` | Tables: `extracurriculars`, `student_extracurriculars`, `extracurricular_attendance`, `extracurricular_grades`, 12 indexes, 16 RLS policies | Extracurricular |
| `20260115000000_add_extracurricular_students.sql` | Table: `extracurricular_students`, Columns: `extracurricular_student_id` on 3 tables, 6 unique indexes, 3 check constraints, 4 RLS policies | Extracurricular students |
| `20260115001000_migrate_extracurricular_only_students.sql` | Data migration only | Extracurricular data migration |
| `20260116000000_add_upsert_extracurricular_attendance_rpc.sql` | Function `upsert_extracurricular_attendance(jsonb, uuid)` | Extracurricular attendance RPC |
| `20260117000000_fix_settings_issues.sql` | RLS policies on `academic_years`, `semesters`, Function `activate_semester(UUID, UUID)` | Settings fixes |
| `20260416120000_harden_core_teacher_rls.sql` | RLS policies on 15 tables | Teacher RLS hardening |
| `20260424093000_add_teacher_class_assignments.sql` | Table `teacher_class_assignments`, 4 indexes, Functions: `set_teacher_class_assignments_updated_at()`, `is_admin_user()`, `has_teacher_class_assignment()`, `can_access_student_roster()`, `can_access_student_grade_record()`, `can_access_student_behavior_record()`, Trigger `trg_teacher_class_assignments_updated_at`, 5 RLS policies | Teacher class assignments |
| `20260424113000_add_shared_communication_and_violation_actions.sql` | Columns: `teacher_id`, `parent_id` on `communications`, Functions: `mark_accessible_communications_read()`, `update_accessible_violation_follow_up()`, 8 RLS policies | Communication & violation actions |
| `20260520200000_create_student_development_analyses.sql` | Table `student_development_analyses`, Trigger `update_student_development_analyses_updated_at`, 1 RLS policy | Student development |
| `20260529000000_add_class_archiving.sql` | Column: `is_archived` on `classes`, Index `idx_classes_is_archived` | Class archiving |
| `20260615100000_create_push_subscriptions.sql` | Extension `pgcrypto`, Table `push_subscriptions`, 4 indexes, 4 RLS policies, Function `handle_updated_at()`, Trigger `handle_push_subscriptions_updated_at`, Functions: `subscribe_parent()`, `unsubscribe_parent()`, `get_parent_subscription_status()` | Push subscriptions |
| `20260615100100_add_pg_cron_jobs.sql` | Extensions: `pg_cron`, `pg_net`, Cron jobs: `dispatch-push-hourly`, `dispatch-push-quarterly`, Function `set_dispatch_push_config()` | Cron jobs |
| `20260619000000_create_student_achievements.sql` | Table `student_achievements`, 3 indexes, 1 RLS policy, Trigger `update_student_achievements_updated_at`, 3 check constraints | Achievements |
| `20260619000100_add_achievements_to_portal_rpc.sql` | Function `get_student_portal_data(uuid, text)` | Portal RPC achievements |
| `20260619000200_harden_achievements_idempotent.sql` | Table `student_achievements` (duplicate), all constraints/indexes/RLS/trigger | Achievements hardening |
| `20260620190500_achievement_certificates_storage_policies.sql` | Bucket `student_assets`, 4 storage policies for `achievement_certificates` | Achievement certificates storage |
| `20260621100000_create_teaching_journals.sql` | Table `teaching_journals`, 2 indexes, 1 RLS policy, Trigger `update_teaching_journals_updated_at`, 4 storage policies | Teaching journals |
| `20260622000000_expand_soft_delete_coverage.sql` | Columns: `deleted_at` on 16 tables, 16 indexes | Soft delete expansion |
| `20260622001000_deletion_audit_table.sql` | Table `deletion_audit`, 5 indexes, 2 RLS policies, Function `capture_soft_delete()`, 20 triggers | Deletion audit |
| `20260622010000_scheduled_r2_backup.sql` | Extensions: `pg_cron`, `pg_net`, Table `backup_runs`, 2 RLS policies, Functions: `invoke_scheduled_backup()`, `get_backup_runs()`, Cron job `daily-r2-backup` | R2 backup |
| `20260622110000_create_push_triggers.sql` | Functions: `invoke_dispatch_push_instant()`, `on_academic_record_inserted()`, `on_attendance_inserted_or_updated()`, `on_announcement_inserted()`, 3 triggers | Push triggers |
| `backend_improvements.sql` | Table `audit_logs`, 3 indexes, 1 RLS policy, Function `log_audit_event()`, Trigger `audit_academic_records`, Table `rate_limits`, 1 index, Functions: `check_rate_limit()`, `validate_grade_input()`, `bulk_insert_grades()`, `update_grade_with_version()`, `cleanup_old_rate_limits()`, Column `version` on `academic_records` | Audit & rate limiting |

## 2. Edge Functions

| Function | Deploy Command | Deskripsi |
|----------|---------------|-----------|
| `scheduled-backup` | `supabase functions deploy scheduled-backup` | Daily backup to R2 |
| `dispatch-push` | `supabase functions deploy dispatch-push` | Web Push notifications |
| `r2-storage` | `supabase functions deploy r2-storage` | R2 presigned URLs |

## 3. Required Secrets

### Supabase Edge Functions
| Secret | Nilai |
|--------|-------|
| `SUPABASE_URL` | From `.env` |
| `SUPABASE_ANON_KEY` | From `.env` |
| `SUPABASE_SERVICE_ROLE_KEY` | From `.env` |
| `SCHEDULED_BACKUP_SECRET` | Custom secret for pg_cron auth |
| `R2_ACCOUNT_ID` | From Cloudflare Dashboard |
| `R2_ACCESS_KEY_ID` | From Cloudflare Dashboard |
| `R2_SECRET_ACCESS_KEY` | From Cloudflare Dashboard |
| `R2_BUCKET_NAME` | From Cloudflare Dashboard |
| `VAPID_PUBLIC_KEY` | From `.env` |
| `VAPID_PRIVATE_KEY` | Generate with `npx web-push generate-vapid-keys` |
| `VAPID_SUBJECT` | `mailto:admin@portalguru.app` |
| `APP_BASE_URL` | `https://guru-cerdas.my.id` |

## 4. pg_cron Jobs

| Job | Schedule | Function |
|-----|----------|----------|
| `daily-r2-backup` | `0 19 * * *` (02:00 WIB) | `invoke_scheduled_backup()` |
| `dispatch-push-hourly` | `0 * * * *` | Via pg_net → Edge Function |
| `dispatch-push-quarterly` | `*/15 * * * *` | Via pg_net → Edge Function |

## 5. Production Activation Steps

### Step 1: Database Setup
```bash
# Run all migrations
supabase db push

# Verify migrations
supabase db diff
```

### Step 2: Enable Extensions
```sql
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;
CREATE EXTENSION IF NOT EXISTS pgcrypto;
```

### Step 3: Deploy Edge Functions
```bash
supabase functions deploy scheduled-backup
supabase functions deploy dispatch-push
supabase functions deploy r2-storage
```

### Step 4: Set Edge Function Secrets
```bash
supabase secrets set SCHEDULED_BACKUP_SECRET=<your-secret>
supabase secrets set R2_ACCOUNT_ID=<your-r2-account-id>
supabase secrets set R2_ACCESS_KEY_ID=<your-r2-access-key-id>
supabase secrets set R2_SECRET_ACCESS_KEY=<your-r2-secret-access-key>
supabase secrets set R2_BUCKET_NAME=<your-r2-bucket-name>
supabase secrets set VAPID_PUBLIC_KEY=<your-vapid-public-key>
supabase secrets set VAPID_PRIVATE_KEY=<your-vapid-private-key>
supabase secrets set VAPID_SUBJECT=mailto:admin@portalguru.app
supabase secrets set APP_BASE_URL=https://guru-cerdas.my.id
```

### Step 5: Setup pg_cron Jobs
```sql
-- Daily backup at 02:00 WIB (19:00 UTC)
SELECT cron.schedule(
  'daily-r2-backup',
  '0 19 * * *',
  $$SELECT invoke_scheduled_backup()$$
);

-- Hourly push dispatch
SELECT cron.schedule(
  'dispatch-push-hourly',
  '0 * * * *',
  $$SELECT net.http_post(
    url := current_setting('app.settings.supabase_url') || '/functions/v1/dispatch-push',
    headers := jsonb_build_object(
      'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key'),
      'Content-Type', 'application/json'
    ),
    body := '{"mode": "all"}'::jsonb
  )$$
);

-- Quarterly push dispatch
SELECT cron.schedule(
  'dispatch-push-quarterly',
  '*/15 * * * *',
  $$SELECT net.http_post(
    url := current_setting('app.settings.supabase_url') || '/functions/v1/dispatch-push',
    headers := jsonb_build_object(
      'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key'),
      'Content-Type', 'application/json'
    ),
    body := '{"mode": "all"}'::jsonb
  )$$
);
```

### Step 6: Vercel Deployment
```bash
# Set environment variables in Vercel dashboard
VITE_SUPABASE_URL=<your-supabase-url>
VITE_SUPABASE_ANON_KEY=<your-anon-key>
VITE_VAPID_PUBLIC_KEY=<your-vapid-public-key>
```

### Step 7: Verify Production
1. Test backup: `SELECT invoke_scheduled_backup();`
2. Test push: Check browser notification permission
3. Test R2 upload: Upload a file via the app
4. Check pg_cron: `SELECT * FROM cron.job;`

## 6. Monitoring

- **pg_cron logs**: `SELECT * FROM cron.job_run_details ORDER BY start_time DESC LIMIT 100;`
- **Edge Function logs**: Supabase Dashboard → Edge Functions → Logs
- **R2 usage**: Cloudflare Dashboard → R2 → Analytics
- **Push subscriptions**: `SELECT COUNT(*) FROM push_subscriptions WHERE is_active = true;`
