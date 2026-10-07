/**
 * Sends the queued WhatsApp class reports (public.wa_outbox) through Fonnte.
 *
 * One message per run, and only after a 4–7 minute gap since the previous attempt
 * (see `gapAfter`); this pacing protects the sender number. Delivery rules:
 * - A report whose day has passed is expired instead of sent late.
 * - When Fonnte answers with an error, nothing was queued there, so the message is
 *   retried on the next run (up to the outbox's 3 attempts).
 * - When the request to Fonnte does not finish, Fonnte may already have queued it.
 *   The message is closed as `delivery_unknown` and never resent, so a wali kelas
 *   does not receive the same report twice.
 * - A message that ends up failed triggers a push notification to the wali kelas.
 *
 * Pure logic with injected I/O; the Edge Function wires it to Supabase and Fonnte.
 */

export interface OutboxMessage {
  id: string;
  phone: string;
  message: string;
  claim_token: string;
  attempts: number;
}

export type FonnteSendResult =
  | { ok: true; id: string }
  | { ok: false; reason: string; retryable: boolean; unknownOutcome?: boolean };

export interface FonnteSenderDeps {
  /** Latest real attempt (sent, failed or retried, not expired), or null if there is none. */
  lastAttempt(): Promise<{ at: Date; key: string } | null>;
  recover(): Promise<void>;
  claim(): Promise<OutboxMessage | null>;
  complete(message: OutboxMessage, status: 'sent' | 'failed', waId: string | null, error: string | null): Promise<boolean>;
  requeue(message: OutboxMessage, error: string): Promise<boolean>;
  send(phone: string, text: string): Promise<FonnteSendResult>;
  notifyWaliKelas(classId: string, reportDate: string): Promise<void>;
  now(): Date;
}

export interface FonnteSenderSummary {
  skipped?: 'outside_send_window' | 'waiting_for_gap';
  sent: number;
  failed: number;
  requeued: number;
  expired: number;
  notified: number;
}

export const MAX_ATTEMPTS = 3;
/** Reports go out between these WIB hours; nothing is sent at night. */
export const SEND_WINDOW_WIB = { fromHour: 6, toHour: 21 } as const;
/** Expired messages are cheap to skip; cap how many one run closes. */
const MAX_EXPIRED_PER_RUN = 25;
/**
 * Gap between two sends. pg_cron calls every minute; a run only sends once the gap since
 * the previous attempt has passed, so sends land 4–7 minutes apart instead of on a fixed
 * beat, which looks less like a bot to WhatsApp.
 */
export const MIN_GAP_MS = 4 * 60_000;
export const MAX_GAP_MS = 7 * 60_000;

/**
 * Gap to wait after an attempt. Derived from the attempt's own key so every minute's run
 * agrees on the same gap without storing it anywhere.
 */
export function gapAfter(key: string): number {
  let hash = 2166136261;
  for (let i = 0; i < key.length; i++) {
    hash ^= key.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  const span = MAX_GAP_MS - MIN_GAP_MS;
  return MIN_GAP_MS + ((hash >>> 0) % (span + 1));
}

const REPORT_ID = /^laporan-([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})-(\d{4}-\d{2}-\d{2})$/i;

export function parseReportId(id: string): { classId: string; reportDate: string } | null {
  const match = id.match(REPORT_ID);
  return match ? { classId: match[1].toLowerCase(), reportDate: match[2] } : null;
}

/** Date (YYYY-MM-DD) and hour in Asia/Jakarta (UTC+7, no daylight saving). */
export function jakartaClock(now: Date): { date: string; hour: number } {
  const shifted = new Date(now.getTime() + 7 * 60 * 60 * 1000);
  return { date: shifted.toISOString().slice(0, 10), hour: shifted.getUTCHours() };
}

/** Interprets a Fonnte /send response. Fonnte spells the flag `status` or `Status`. */
export function interpretFonnteResponse(httpStatus: number, body: unknown): FonnteSendResult {
  const data = body && typeof body === 'object' ? (body as Record<string, unknown>) : {};
  const accepted = data.status === true || data.Status === true;
  const ids = Array.isArray(data.id) ? data.id : data.id != null ? [data.id] : [];
  if (httpStatus >= 200 && httpStatus < 300 && accepted && ids.length > 0) {
    return { ok: true, id: String(ids[0]) };
  }
  const reason = String(data.reason ?? data.detail ?? `HTTP ${httpStatus}`).slice(0, 300);
  const lower = reason.toLowerCase();
  // A bad number or an empty quota does not get better by retrying in 5 minutes.
  const permanent = lower.includes('input invalid') || lower.includes('invalid target')
    || lower.includes('target invalid') || lower.includes('insufficient quota') || lower.includes('quota');
  return { ok: false, reason, retryable: !permanent };
}

export async function runFonnteSender(deps: FonnteSenderDeps): Promise<FonnteSenderSummary> {
  const summary: FonnteSenderSummary = { sent: 0, failed: 0, requeued: 0, expired: 0, notified: 0 };
  const now = deps.now();
  const clock = jakartaClock(now);
  if (clock.hour < SEND_WINDOW_WIB.fromHour || clock.hour >= SEND_WINDOW_WIB.toHour) {
    return { ...summary, skipped: 'outside_send_window' };
  }

  const last = await deps.lastAttempt();
  if (last && now.getTime() - last.at.getTime() < gapAfter(last.key)) {
    return { ...summary, skipped: 'waiting_for_gap' };
  }

  await deps.recover();

  const failAndNotify = async (message: OutboxMessage, error: string) => {
    if (await deps.complete(message, 'failed', null, error)) summary.failed++;
    const report = parseReportId(message.id);
    if (!report) return;
    try {
      await deps.notifyWaliKelas(report.classId, report.reportDate);
      summary.notified++;
    } catch (err) {
      console.warn('wa-fonnte: push fallback failed', err instanceof Error ? err.message : err);
    }
  };

  for (let i = 0; i <= MAX_EXPIRED_PER_RUN; i++) {
    const message = await deps.claim();
    if (!message) break;

    const report = parseReportId(message.id);
    if (report && report.reportDate < clock.date) {
      if (await deps.complete(message, 'failed', null, 'expired: report day has passed')) summary.expired++;
      continue;
    }

    let result: FonnteSendResult;
    try {
      result = await deps.send(message.phone, message.message);
    } catch (err) {
      result = {
        ok: false,
        reason: err instanceof Error ? err.message : 'request failed',
        retryable: false,
        unknownOutcome: true,
      };
    }

    if (result.ok) {
      if (await deps.complete(message, 'sent', result.id, null)) summary.sent++;
    } else if (result.unknownOutcome) {
      await failAndNotify(message, `delivery_unknown: ${result.reason}`.slice(0, 400));
    } else if (result.retryable && message.attempts < MAX_ATTEMPTS) {
      if (await deps.requeue(message, `fonnte: ${result.reason}`)) summary.requeued++;
    } else {
      await failAndNotify(message, `fonnte: ${result.reason}`);
    }
    // One real send per run keeps the 5-minute pace.
    break;
  }

  return summary;
}
