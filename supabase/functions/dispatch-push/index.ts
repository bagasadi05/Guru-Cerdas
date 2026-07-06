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
  user_id: string | null;
  student_id: string | null;
  endpoint: string;
  p256dh: string;
  auth: string;
  is_active: boolean;
}

interface ScheduleRow {
  id: string;
  user_id: string;
  day: string;
  start_time: string;
  end_time: string;
  subject: string;
  class_id: string | null;
  room: string | null;
  reminded: boolean | null;
}

interface InstantPayload {
  title: string;
  body: string;
  [key: string]: unknown;
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
    instantNotified: 0,
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

    // Handle instant trigger from DB triggers (parent notifications)
    if (mode === "instant") {
      const eventType = body.event as string;
      const studentId = body.student_id as string | null;
      const payload = body.payload as InstantPayload | undefined;

      if (!payload) {
        return jsonResponse({ ok: false, error: "Missing payload for instant mode" }, 400);
      }

      const instantStats = await processInstantParentNotification(
        supabase,
        eventType,
        studentId ?? null,
        payload,
      );
      stats.instantNotified = instantStats.notified;
      stats.failedSends += instantStats.failed;
      stats.durationMs = Date.now() - start;
      return jsonResponse({ ok: true, stats });
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
  // Get current time in WIB (Asia/Jakarta, UTC+7)
  const now = new Date();
  const wibOffset = 7 * 60; // minutes
  const wibNow = new Date(now.getTime() + (wibOffset + now.getTimezoneOffset()) * 60000);

  // Map day index to Indonesian day name
  const DAY_NAMES = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
  const todayName = DAY_NAMES[wibNow.getDay()];

  const currentHour = wibNow.getHours();
  const currentMinute = wibNow.getMinutes();
  const currentMinutes = currentHour * 60 + currentMinute;
  const horizonMinutes = currentMinutes + 60; // Look ahead 60 minutes

  // Query schedules for today that haven't been reminded
  const { data: schedules, error } = await supabase
    .from("schedules")
    .select("id, user_id, day, start_time, end_time, subject, class_id, room, reminded")
    .eq("day", todayName)
    .or("reminded.is.null,reminded.eq.false")
    .limit(500);

  if (error) {
    console.error("schedules query error:", error);
    return { found: 0, notified: 0, failed: 0 };
  }

  // Filter: only schedules starting within the next 60 minutes
  const upcoming = ((schedules ?? []) as ScheduleRow[]).filter((s) => {
    const [h, m] = s.start_time.split(":").map(Number);
    const startMinutes = h * 60 + m;
    return startMinutes >= currentMinutes && startMinutes <= horizonMinutes;
  });

  const found = upcoming.length;
  if (found === 0) return { found: 0, notified: 0, failed: 0 };

  const userIds = Array.from(new Set(upcoming.map((s) => s.user_id)));
  const subs = await fetchActiveSubscriptions(supabase, userIds);
  const byUser = groupBy(subs, (s) => s.user_id);

  // Fetch class names for display
  const classIds = Array.from(new Set(upcoming.map((s) => s.class_id).filter(Boolean))) as string[];
  let classNameMap = new Map<string, string>();
  if (classIds.length > 0) {
    const { data: classData } = await supabase
      .from("classes")
      .select("id, name")
      .in("id", classIds);
    if (classData) {
      classNameMap = new Map(classData.map((c: any) => [c.id, c.name]));
    }
  }

  let notified = 0;
  let failed = 0;
  const remindedIds: string[] = [];

  for (const schedule of upcoming) {
    const userSubs = byUser.get(schedule.user_id) ?? [];
    if (userSubs.length === 0) continue;

    const [h, m] = schedule.start_time.split(":").map(Number);
    const startMinutes = h * 60 + m;
    const minutesUntil = Math.max(0, startMinutes - currentMinutes);
    const className = schedule.class_id ? classNameMap.get(schedule.class_id) : null;

    const payload: PushPayload = {
      title: `🔔 Mengajar ${minutesUntil <= 1 ? 'segera' : `${minutesUntil} menit lagi`}`,
      body: formatScheduleBody(schedule, minutesUntil, className),
      icon: "/icons/icon-192x192.png",
      badge: "/icons/badge-72x72.png",
      tag: `schedule-${schedule.id}`,
      data: {
        url: `${APP_BASE_URL}/jadwal`,
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

/**
 * Handle instant DB-trigger push notification for parents.
 * If student_id is provided, sends only to subscriptions tied to that student.
 * If student_id is null (announcements), sends to ALL active parent subscriptions.
 */
async function processInstantParentNotification(
  supabase: SupabaseClient,
  eventType: string,
  studentId: string | null,
  payload: InstantPayload,
): Promise<{ notified: number; failed: number }> {
  let query = supabase
    .from("push_subscriptions")
    .select("id, user_id, student_id, endpoint, p256dh, auth, is_active")
    .eq("is_active", true)
    .not("student_id", "is", null); // Only parent subscriptions

  if (studentId) {
    query = query.eq("student_id", studentId);
  }

  const { data: subs, error } = await query.limit(1000);
  if (error) {
    console.error(`instant push query error [${eventType}]:`, error);
    return { notified: 0, failed: 0 };
  }

  const subscriptions = (subs ?? []) as SubscriptionRow[];
  if (subscriptions.length === 0) return { notified: 0, failed: 0 };

  const pushPayload: PushPayload = {
    title: payload.title,
    body: payload.body,
    icon: "/icons/icon-192x192.png",
    badge: "/icons/badge-72x72.png",
    tag: `${eventType}-${studentId ?? "all"}-${Date.now()}`,
    data: {
      url: `${APP_BASE_URL}/portal`,
      type: eventType,
      studentId: studentId,
    },
    requireInteraction: false,
    actions: [
      { action: "open", title: "Buka Portal" },
      { action: "dismiss", title: "Tutup" },
    ],
  };

  let notified = 0;
  let failed = 0;

  for (const sub of subscriptions) {
    const result = await sendToSubscription(supabase, sub, pushPayload);
    if (result.ok) notified++;
    else failed++;

    if (result.reason === "subscription_gone") {
      await supabase
        .from("push_subscriptions")
        .update({ is_active: false })
        .eq("id", sub.id);
    }
  }

  console.log(`instant push [${eventType}]: notified=${notified}, failed=${failed}, student=${studentId}`);
  return { notified, failed };
}

async function fetchActiveSubscriptions(
  supabase: SupabaseClient,
  userIds: string[],
): Promise<SubscriptionRow[]> {
  if (userIds.length === 0) return [];
  const { data, error } = await supabase
    .from("push_subscriptions")
    .select("id, user_id, student_id, endpoint, p256dh, auth, is_active")
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

function formatScheduleBody(schedule: ScheduleRow, minutesUntil: number, className?: string | null): string {
  const parts: string[] = [];
  if (schedule.subject) parts.push(schedule.subject);
  if (className) parts.push(className);
  if (schedule.room) parts.push(`Ruang: ${schedule.room}`);
  parts.push(`${schedule.start_time} – ${schedule.end_time}`);
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
