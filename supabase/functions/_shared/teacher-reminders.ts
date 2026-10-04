import type { PushPayload, SendResult } from './web-push.ts';

export interface ReminderTask { id: string; user_id: string; due_date: string; }
export interface ReminderSchedule {
  id: string; user_id: string; day: string; start_time: string; end_time: string;
  subject: string; class_id: string | null; room: string | null;
}
export interface ReminderSubscription {
  id: string; user_id: string | null; student_id: string | null;
  endpoint: string; p256dh: string; auth: string; is_active: boolean;
}
export interface ReminderPreference { user_id: string; task_reminders: boolean; task_reminder_days: number; }
export interface ReminderDelivery {
  entity_id: string; subscription_id: string; delivered_at: string | null;
  lease_until: string | null; terminal: boolean;
}
export type ReminderKind = 'schedule' | 'task-digest';
export interface ReminderKey {
  kind: ReminderKind; entityId: string; date: string; subscriptionId: string;
}
export interface ReminderRepository {
  tasks(horizon: string): Promise<ReminderTask[]>;
  schedules(day: string): Promise<ReminderSchedule[]>;
  subscriptions(userIds: string[]): Promise<ReminderSubscription[]>;
  preferences(userIds: string[]): Promise<ReminderPreference[]>;
  deliveries(kind: ReminderKind, date: string, entityIds: string[]): Promise<ReminderDelivery[]>;
  classNames(ids: string[]): Promise<Map<string, string>>;
  claim(key: ReminderKey): Promise<string | null>;
  finish(key: ReminderKey, token: string, result: SendResult): Promise<void>;
  deactivate(id: string): Promise<void>;
}
export interface ReminderStats { found: number; candidates: number; notified: number; failed: number; }
const DAY_NAMES = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];

/** Read the school's calendar and clock independently of the host timezone. */
export function jakartaTime(now: Date) {
  const local = new Date(now.getTime() + 7 * 60 * 60 * 1000);
  return {
    date: local.toISOString().slice(0, 10), day: DAY_NAMES[local.getUTCDay()],
    minutes: local.getUTCHours() * 60 + local.getUTCMinutes() + local.getUTCSeconds() / 60,
    hour: local.getUTCHours(),
  };
}

/** Advance an ISO calendar date without converting it to a local midnight. */
export function addCalendarDays(date: string, days: number): string {
  const value = new Date(`${date}T00:00:00Z`);
  value.setUTCDate(value.getUTCDate() + days);
  return value.toISOString().slice(0, 10);
}

function canAttempt(record: ReminderDelivery | undefined, now: Date): boolean {
  return !record || (!record.delivered_at && !record.terminal
    && (!record.lease_until || Date.parse(record.lease_until) <= now.getTime()));
}

async function deliver(
  repo: ReminderRepository, send: (sub: ReminderSubscription, payload: PushPayload) => Promise<SendResult>,
  key: ReminderKey, sub: ReminderSubscription, payload: PushPayload, stats: ReminderStats, dryRun: boolean,
  currentTime: () => number, deadline: number,
) {
  if (currentTime() >= deadline) return;
  stats.candidates++;
  if (dryRun) return;
  const token = await repo.claim(key);
  if (!token) return;
  if (currentTime() >= deadline) {
    await repo.finish(key, token, { ok: false, reason: 'window_expired' });
    return;
  }
  const result = await send(sub, payload);
  await repo.finish(key, token, result);
  if (result.ok) stats.notified++;
  else stats.failed++;
  if (result.reason === 'subscription_gone') await repo.deactivate(sub.id);
}

/** Dispatch recurring schedule reminders and one daily task digest per device. */
export async function processTeacherReminders(
  repo: ReminderRepository,
  send: (sub: ReminderSubscription, payload: PushPayload) => Promise<SendResult>,
  options: { now: Date; dryRun: boolean; schedules: boolean; tasks: boolean },
): Promise<{ schedules: ReminderStats; tasks: ReminderStats }> {
  const empty = (): ReminderStats => ({ found: 0, candidates: 0, notified: 0, failed: 0 });
  const stats = { schedules: empty(), tasks: empty() };
  const started = performance.now();
  const currentTime = () => options.now.getTime() + performance.now() - started;
  const clock = jakartaTime(options.now);
  const work: Array<() => Promise<void>> = [];
  if (options.schedules) {
    const schedules = (await repo.schedules(clock.day)).filter(s => {
      const [h, m, seconds = 0] = s.start_time.split(':').map(Number);
      const remaining = h * 60 + m + seconds / 60 - clock.minutes;
      return remaining > 0 && remaining <= 10;
    });
    const records = schedules.length ? await repo.deliveries('schedule', clock.date, schedules.map(s => s.id)) : [];
    const subs = schedules.length ? await repo.subscriptions([...new Set(schedules.map(s => s.user_id))]) : [];
    const names = await repo.classNames([...new Set(schedules.flatMap(s => s.class_id ? [s.class_id] : []))]);
    for (const schedule of schedules) {
      const [h, m, seconds = 0] = schedule.start_time.split(':').map(Number);
      const remaining = h * 60 + m + seconds / 60 - clock.minutes;
      const userSubs = subs.filter(s => s.user_id === schedule.user_id);
      const eligible = userSubs.filter(sub => {
        const record = records.find(r => r.entity_id === schedule.id && r.subscription_id === sub.id);
        return (remaining >= 5 || !!record) && canAttempt(record, options.now);
      });
      if (eligible.length === 0) continue;
      stats.schedules.found++;
      const minutes = Math.ceil(remaining);
      const details = [schedule.subject, schedule.class_id ? names.get(schedule.class_id) : null,
        schedule.room ? `Ruang ${schedule.room}` : null,
        `${schedule.start_time.slice(0, 5)}–${schedule.end_time.slice(0, 5)}`].filter(Boolean);
      const payload: PushPayload = {
        title: `Mengajar ${minutes} menit lagi`, body: details.join(' • '),
        icon: '/icons/icon-192x192.png', badge: '/icons/badge-72x72.png',
        tag: `schedule-${schedule.id}-${clock.date}`, data: { url: '/jadwal', type: 'schedule-reminder', scheduleId: schedule.id },
      };
      for (const sub of eligible) work.push(() => deliver(repo, send,
        { kind: 'schedule', entityId: schedule.id, date: clock.date, subscriptionId: sub.id }, sub, payload, stats.schedules, options.dryRun,
        currentTime, options.now.getTime() + remaining * 60000));
    }
  }
  if (options.tasks && clock.hour === 6) {
    const tasks = await repo.tasks(addCalendarDays(clock.date, 3));
    const users = [...new Set(tasks.map(t => t.user_id))];
    const prefs = users.length ? await repo.preferences(users) : [];
    const subs = users.length ? await repo.subscriptions(users) : [];
    const records = users.length ? await repo.deliveries('task-digest', clock.date, users) : [];
    for (const userId of users) {
      const pref = prefs.find(p => p.user_id === userId);
      if (pref && !pref.task_reminders) continue;
      const horizon = addCalendarDays(clock.date, pref?.task_reminder_days ?? 1);
      const due = tasks.filter(t => t.user_id === userId && t.due_date <= horizon);
      if (!due.length) continue;
      const eligible = subs.filter(s => s.user_id === userId && canAttempt(
        records.find(r => r.entity_id === userId && r.subscription_id === s.id), options.now));
      if (!eligible.length) continue;
      stats.tasks.found += due.length;
      const today = due.filter(t => t.due_date === clock.date).length;
      const upcoming = due.filter(t => t.due_date > clock.date).length;
      const overdue = due.filter(t => t.due_date < clock.date).length;
      const payload: PushPayload = {
        title: 'Ringkasan tugas pagi',
        body: [`${today} tugas hari ini`, `${upcoming} tugas mendatang`, `${overdue} tugas terlambat`].join(' • '),
        icon: '/icons/icon-192x192.png', badge: '/icons/badge-72x72.png',
        tag: `task-digest-${userId}-${clock.date}`, data: { url: '/tugas', type: 'task-digest' },
      };
      for (const sub of eligible) work.push(() => deliver(repo, send,
        { kind: 'task-digest', entityId: userId, date: clock.date, subscriptionId: sub.id }, sub, payload, stats.tasks, options.dryRun,
        currentTime, Date.parse(`${clock.date}T07:00:00+07:00`)));
    }
  }
  for (let from = 0; from < work.length; from += 8) await Promise.all(work.slice(from, from + 8).map(run => run()));
  return stats;
}
