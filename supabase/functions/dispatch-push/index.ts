// Supabase Edge Function: dispatch-push
// Triggered by pg_cron (hourly + every 15 min). Reads due/overdue tasks and
// schedule reminders, then sends Web Push notifications to subscribed users.

import { createClient, SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import {
  sendPushNotification,
  PushPayload,
  PushSubscription,
  VapidKeys,
} from "../_shared/web-push.ts";

interface TaskRow {
  id: string;
  user_id: string;
  title: string;
  description: string | null;
  due_date: string;
  priority: string | null;
  status: string | null;
  subject: string | null;
  class_name: string | null;
}

interface SubscriptionRow {
  id: string;
  user_id: string;
  endpoint: string;
  p256dh: string;
  auth: string;
  is_active: boolean;
}

interface ScheduleRow {
  id: string;
  user_id: string;
  title: string;
  description: string | null;
  scheduled_at: string;
  class_name: string | null;
  subject: string | null;
  reminded: boolean | null;
}

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const VAPID_PUBLIC_KEY = Deno.env.get("VAPID_PUBLIC_KEY")!;
const VAPID_PRIVATE_KEY = Deno.env.get("VAPID_PRIVATE_KEY")!;
const VAPID_SUBJECT = Deno.env.get("VAPID_SUBJECT") ?? "mailto:admin@portalguru.app";
const APP_BASE_URL = Deno.env.get("APP_BASE_URL") ?? "https://guru-cerdas.app";

const vapid: VapidKeys = {
  publicKey: VAPID_PUBLIC_KEY,
  privateKey: VAPID_PRIVATE_KEY,
  subject: VAPID_SUBJECT,
};

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const start = Date.now();
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  let body: Record<string, unknown> = {};
  try {
    body = await req.json();
  } catch {
    body = {};
  }
  const mode = (body.mode as string) ?? "all";

  const stats = {
    mode,
    tasksFound: 0,
    tasksNotified: 0,
    schedulesFound: 0,
    schedulesNotified: 0,
    failedSends: 0,
    durationMs: 0,
  };

  try {
    if (!VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY) {
      return jsonResponse(
        { ok: false, error: "VAPID keys not configured" },
        500,
      );
    }

    // Process task-due reminders
    if (mode === "all" || mode === "task-due-check") {
      const taskStats = await processTaskReminders(supabase);
      stats.tasksFound = taskStats.found;
      stats.tasksNotified = taskStats.notified;
      stats.failedSends += taskStats.failed;
    }

    // Process schedule reminders (next 60 minutes)
    if (mode === "all" || mode === "scheduled-check") {
      const scheduleStats = await processScheduleReminders(supabase);
      stats.schedulesFound = scheduleStats.found;
      stats.schedulesNotified = scheduleStats.notified;
      stats.failedSends += scheduleStats.failed;
    }

    stats.durationMs = Date.now() - start;
    return jsonResponse({ ok: true, stats });
  } catch (err) {
    console.error("dispatch-push fatal:", err);
    return jsonResponse(
      { ok: false, error: err instanceof Error ? err.message : String(err) },
      500,
    );
  }
});

async function processTaskReminders(
  supabase: SupabaseClient,
): Promise<{ found: number; notified: number; failed: number }> {
  // Find tasks due in the next 24 hours OR overdue and not done
  const now = new Date();
  const horizon = new Date(now.getTime() + 24 * 60 * 60 * 1000);

  const { data: tasks, error } = await supabase
    .from("tasks")
    .select("id, user_id, title, description, due_date, priority, status, subject, class_name")
    .lte("due_date", horizon.toISOString())
    .neq("status", "done")
    .neq("status", "completed")
    .limit(500);

  if (error) {
    console.error("tasks query error:", error);
    return { found: 0, notified: 0, failed: 0 };
  }

  const found = (tasks ?? []).length;
  if (found === 0) return { found: 0, notified: 0, failed: 0 };

  const userIds = Array.from(new Set((tasks as TaskRow[]).map((t) => t.user_id)));
  const subs = await fetchActiveSubscriptions(supabase, userIds);
  const byUser = groupBy(subs, (s) => s.user_id);

  let notified = 0;
  let failed = 0;

  for (const task of tasks as TaskRow[]) {
    const userSubs = byUser.get(task.user_id) ?? [];
    if (userSubs.length === 0) continue;

    const dueDate = new Date(task.due_date);
    const overdue = dueDate < now;
    const hoursUntilDue = Math.round((dueDate.getTime() - now.getTime()) / (60 * 60 * 1000));

    const payload: PushPayload = {
      title: overdue
        ? `⏰ Tugas Terlambat: ${task.title}`
        : `📋 Tugas Mendekati Tenggat: ${task.title}`,
      body: formatTaskBody(task, overdue, hoursUntilDue),
      icon: "/icons/icon-192x192.png",
      badge: "/icons/badge-72x72.png",
      tag: `task-${task.id}`,
      data: {
        url: `${APP_BASE_URL}/tasks/${task.id}`,
        taskId: task.id,
        type: "task-due",
      },
      requireInteraction: overdue,
      actions: [
        { action: "open", title: "Buka" },
        { action: "dismiss", title: "Tutup" },
      ],
    };

    for (const sub of userSubs) {
      const result = await sendToSubscription(supabase, sub, payload);
      if (result.ok) notified++;
      else failed++;

      if (result.reason === "subscription_gone") {
        await supabase
          .from("push_subscriptions")
          .update({ is_active: false })
          .eq("id", sub.id);
      }
    }
  }

  return { found, notified, failed };
}

async function processScheduleReminders(
  supabase: SupabaseClient,
): Promise<{ found: number; notified: number; failed: number }> {
  // Find schedules in the next 60 minutes that haven't been reminded
  const now = new Date();
  const horizon = new Date(now.getTime() + 60 * 60 * 1000);

  const { data: schedules, error } = await supabase
    .from("schedules")
    .select("id, user_id, title, description, scheduled_at, class_name, subject, reminded")
    .lte("scheduled_at", horizon.toISOString())
    .gte("scheduled_at", now.toISOString())
    .or("reminded.is.null,reminded.eq.false")
    .limit(500);

  if (error) {
    console.error("schedules query error:", error);
    return { found: 0, notified: 0, failed: 0 };
  }

  const found = (schedules ?? []).length;
  if (found === 0) return { found: 0, notified: 0, failed: 0 };

  const userIds = Array.from(new Set((schedules as ScheduleRow[]).map((s) => s.user_id)));
  const subs = await fetchActiveSubscriptions(supabase, userIds);
  const byUser = groupBy(subs, (s) => s.user_id);

  let notified = 0;
  let failed = 0;
  const remindedIds: string[] = [];

  for (const schedule of schedules as ScheduleRow[]) {
    const userSubs = byUser.get(schedule.user_id) ?? [];
    if (userSubs.length === 0) continue;

    const minutesUntil = Math.max(
      0,
      Math.round((new Date(schedule.scheduled_at).getTime() - now.getTime()) / 60000),
    );

    const payload: PushPayload = {
      title: `🔔 Mengajar ${minutesUntil} menit lagi`,
      body: formatScheduleBody(schedule, minutesUntil),
      icon: "/icons/icon-192x192.png",
      badge: "/icons/badge-72x72.png",
      tag: `schedule-${schedule.id}`,
      data: {
        url: `${APP_BASE_URL}/schedules/${schedule.id}`,
        scheduleId: schedule.id,
        type: "schedule-reminder",
      },
      requireInteraction: minutesUntil <= 5,
    };

    for (const sub of userSubs) {
      const result = await sendToSubscription(supabase, sub, payload);
      if (result.ok) notified++;
      else failed++;

      if (result.reason === "subscription_gone") {
        await supabase
          .from("push_subscriptions")
          .update({ is_active: false })
          .eq("id", sub.id);
      }
    }

    remindedIds.push(schedule.id);
  }

  if (remindedIds.length > 0) {
    await supabase
      .from("schedules")
      .update({ reminded: true })
      .in("id", remindedIds);
  }

  return { found, notified, failed };
}

async function fetchActiveSubscriptions(
  supabase: SupabaseClient,
  userIds: string[],
): Promise<SubscriptionRow[]> {
  if (userIds.length === 0) return [];
  const { data, error } = await supabase
    .from("push_subscriptions")
    .select("id, user_id, endpoint, p256dh, auth, is_active")
    .eq("is_active", true)
    .in("user_id", userIds);

  if (error) {
    console.error("subscriptions query error:", error);
    return [];
  }
  return (data ?? []) as SubscriptionRow[];
}

async function sendToSubscription(
  _supabase: SupabaseClient,
  sub: SubscriptionRow,
  payload: PushPayload,
): Promise<{ ok: boolean; reason?: string }> {
  const pushSub: PushSubscription = {
    endpoint: sub.endpoint,
    keys: { p256dh: sub.p256dh, auth: sub.auth },
  };
  const result = await sendPushNotification(pushSub, payload, vapid);
  return { ok: result.ok, reason: result.reason };
}

function formatTaskBody(task: TaskRow, overdue: boolean, hoursUntilDue: number): string {
  const dueText = overdue
    ? `Terlambat ${Math.abs(hoursUntilDue)} jam`
    : hoursUntilDue <= 1
    ? "Tenggat kurang dari 1 jam"
    : `Tenggat dalam ${hoursUntilDue} jam`;
  const parts = [dueText];
  if (task.subject) parts.push(task.subject);
  if (task.class_name) parts.push(task.class_name);
  if (task.priority === "high") parts.push("⚠️ Prioritas tinggi");
  return parts.join(" • ");
}

function formatScheduleBody(schedule: ScheduleRow, minutesUntil: number): string {
  const parts: string[] = [];
  if (schedule.subject) parts.push(schedule.subject);
  if (schedule.class_name) parts.push(schedule.class_name);
  if (schedule.description) parts.push(schedule.description);
  const timeText = minutesUntil <= 1 ? "Segera" : `${minutesUntil} menit lagi`;
  return parts.length > 0 ? `${timeText} — ${parts.join(" • ")}` : timeText;
}

function groupBy<T, K>(items: T[], key: (item: T) => K): Map<K, T[]> {
  const map = new Map<K, T[]>();
  for (const item of items) {
    const k = key(item);
    const arr = map.get(k);
    if (arr) arr.push(item);
    else map.set(k, [item]);
  }
  return map;
}

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
