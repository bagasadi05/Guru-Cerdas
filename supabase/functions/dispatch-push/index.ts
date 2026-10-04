import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';
import { sendPushNotification, type PushPayload, type SendResult } from '../_shared/web-push.ts';
import { handleDispatchRequest, type DispatchBody } from '../_shared/dispatch-request.ts';
import { reminderPages as pages, reminderBatches as batches } from '../_shared/reminder-query.ts';
import {
  processTeacherReminders, type ReminderTask, type ReminderSchedule, type ReminderSubscription,
  type ReminderPreference, type ReminderDelivery, type ReminderRepository, type ReminderKey,
} from '../_shared/teacher-reminders.ts';

const url = Deno.env.get('SUPABASE_URL')!;
const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const vapid = {
  publicKey: Deno.env.get('VAPID_PUBLIC_KEY') ?? '',
  privateKey: Deno.env.get('VAPID_PRIVATE_KEY') ?? '',
  subject: Deno.env.get('VAPID_SUBJECT') ?? 'mailto:admin@portalguru.app',
};
const supabase = createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });

function rpcKey(key: ReminderKey) {
  return { p_kind: key.kind, p_entity_id: key.entityId, p_occurrence_date: key.date, p_subscription_id: key.subscriptionId };
}

const repo: ReminderRepository = {
  tasks: horizon => pages<ReminderTask>((from, to) => supabase.from('tasks')
    .select('id,user_id,due_date').in('status', ['todo', 'in_progress']).is('deleted_at', null)
    .not('due_date', 'is', null).lte('due_date', horizon).order('id').range(from, to)),
  schedules: day => pages<ReminderSchedule>((from, to) => supabase.from('schedules')
    .select('id,user_id,day,start_time,end_time,subject,class_id,room')
    .eq('day', day).is('deleted_at', null).order('id').range(from, to)),
  subscriptions: ids => batches(ids, batch => pages<ReminderSubscription>((from, to) => supabase.from('push_subscriptions')
    .select('id,user_id,student_id,endpoint,p256dh,auth,is_active')
    .eq('is_active', true).is('student_id', null).in('user_id', batch).order('id').range(from, to))),
  preferences: ids => batches(ids, batch => pages<ReminderPreference>((from, to) => supabase.from('user_notification_preferences')
    .select('user_id,task_reminders,task_reminder_days').in('user_id', batch).order('user_id').range(from, to))),
  deliveries: (kind, date, ids) => batches(ids, batch => pages<ReminderDelivery>((from, to) => supabase.from('teacher_reminder_deliveries')
    .select('entity_id,subscription_id,delivered_at,lease_until,terminal').eq('kind', kind).eq('occurrence_date', date)
    .in('entity_id', batch).order('entity_id').order('subscription_id').range(from, to))),
  classNames: async ids => {
    const valid = ids.filter(id => /^[0-9a-f-]{36}$/i.test(id));
    const rows = await batches(valid, batch => pages<{ id: string; name: string }>((from, to) => supabase.from('classes')
      .select('id,name').in('id', batch).order('id').range(from, to)));
    return new Map(rows.map(row => [row.id, row.name]));
  },
  claim: async key => {
    const { data, error } = await supabase.rpc('claim_teacher_reminder', rpcKey(key));
    if (error) throw new Error(error.message);
    return data as string | null;
  },
  finish: async (key, token, result) => {
    const { data, error } = await supabase.rpc('finish_teacher_reminder', {
      ...rpcKey(key), p_lease_token: token, p_success: result.ok,
      p_terminal: result.reason === 'subscription_gone', p_error: result.ok ? null : result.reason ?? 'send_failed',
    });
    if (error) throw new Error(error.message);
    if (!data) throw new Error('Reminder lease was lost before completion');
  },
  deactivate: async id => {
    const { error } = await supabase.from('push_subscriptions').update({ is_active: false }).eq('id', id);
    if (error) throw new Error(error.message);
  },
};

function safeEqual(a: string, b: string): boolean {
  if (!a.length || a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

async function authorize(req: Request): Promise<boolean> {
  const secret = req.headers.get('x-internal-secret') ?? '';
  if (secret) {
    const { data, error } = await supabase.rpc('get_app_config', { p_key: 'dispatch_push_secret' });
    if (error) throw new Error(error.message);
    if (typeof data === 'string' && safeEqual(secret, data)) return true;
  }
  return safeEqual((req.headers.get('authorization') ?? '').replace(/^Bearer\s+/i, ''), serviceKey);
}

async function send(sub: ReminderSubscription, payload: PushPayload): Promise<SendResult> {
  const result = await sendPushNotification({ endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } }, payload, vapid);
  if (!result.ok) console.warn(`push failed: ${result.reason ?? 'unknown'} (${result.statusCode ?? '-'})`);
  return result;
}

async function run(body: DispatchBody): Promise<Record<string, unknown>> {
  const start = Date.now();
  const stats = {
    mode: body.mode, tasksFound: 0, tasksNotified: 0, schedulesFound: 0, schedulesNotified: 0,
    instantNotified: 0, candidates: 0, failedSends: 0, durationMs: 0,
    testFailure: null as { reason?: string; statusCode?: number; detail?: string } | null,
  };
  if (body.mode === 'test' || body.mode === 'instant') {
    const subscriptions = await pages<ReminderSubscription>((from, to) => {
      let query = supabase.from('push_subscriptions').select('id,user_id,student_id,endpoint,p256dh,auth,is_active').eq('is_active', true);
      if (body.mode === 'test') query = query.eq('id', body.subscriptionId!).is('student_id', null).not('user_id', 'is', null);
      else {
        query = query.not('student_id', 'is', null);
        if (body.student_id) query = query.eq('student_id', body.student_id);
      }
      return query.order('id').range(from, to);
    });
    if (body.mode === 'test' && subscriptions.length !== 1) throw new Error('Active teacher subscription not found');
    stats.candidates = subscriptions.length;
    if (!body.dryRun) {
      const payload: PushPayload = body.mode === 'test' ? {
        title: 'Tes pengingat guru', body: 'Pengiriman dari server berhasil diproses. Jadwal dan ringkasan tugas akan dikirim otomatis.',
        tag: 'teacher-reminder-test', data: { url: '/pengaturan', type: 'teacher-reminder-test' },
      } : {
        ...body.payload!, tag: `${body.event}-${body.student_id ?? 'all'}-${Date.now()}`,
        data: { url: body.student_id ? `/portal/${body.student_id}` : '/portal-login', type: body.event, studentId: body.student_id ?? null },
      };
      payload.icon = '/icons/icon-192x192.png';
      payload.badge = '/icons/badge-72x72.png';
      for (const sub of subscriptions) {
        const result = await send(sub, payload);
        if (result.ok) stats.instantNotified++;
        else {
          stats.failedSends++;
          if (body.mode === 'test') stats.testFailure = {
            reason: result.reason, statusCode: result.statusCode,
            detail: result.error?.replace(/[A-Za-z0-9_=-]{24,}/g, '[redacted]').slice(0, 300),
          };
        }
        if (result.reason === 'subscription_gone') await repo.deactivate(sub.id);
      }
    }
  } else {
    const result = await processTeacherReminders(repo, send, {
      now: new Date(), dryRun: body.dryRun,
      schedules: body.mode !== 'task-due-check', tasks: body.mode !== 'scheduled-check',
    });
    stats.tasksFound = result.tasks.found;
    stats.tasksNotified = result.tasks.notified;
    stats.schedulesFound = result.schedules.found;
    stats.schedulesNotified = result.schedules.notified;
    stats.candidates = result.tasks.candidates + result.schedules.candidates;
    stats.failedSends = result.tasks.failed + result.schedules.failed;
  }
  stats.durationMs = Date.now() - start;
  console.log(JSON.stringify({ event: 'dispatch-push', dryRun: body.dryRun, ...stats }));
  return stats;
}

Deno.serve(req => handleDispatchRequest(req, { authorize, configured: !!vapid.publicKey && !!vapid.privateKey, run }));
