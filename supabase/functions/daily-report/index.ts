// Supabase Edge Function: daily-report
// Dipicu oleh pg_cron setiap sore (jadwal di app_config 'daily_report_schedule').
// Membaca daily_input_log hari itu (WIB) dan mengirim laporan harian WhatsApp
// via Fonnte ke admin yang subscribe (app_config 'fonnte_config').

import { createClient, SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

interface InputLogRow {
  id: string;
  mode: string;
  teacher_name: string;
  teacher_id: string;
  class_name: string;
  student_count: number;
  details: Record<string, unknown>;
  created_at: string;
}

interface FonnteConfig {
  adminPhone: string;
  enabled: boolean;
  dailyReportTime: string;
}

const FONNTE_SEND_URL = "https://api.fonnte.com/send";
const WIB_OFFSET_MS = 7 * 60 * 60 * 1000; // Asia/Jakarta = UTC+7
// Batas aman Fonnte (~1000 karakter per pesan); dipotong agar selalu terkirim.
const MAX_MESSAGE_LENGTH = 950;

/** Kunci grup detail agar entri berbeda (kuis/nilai/pelanggaran) tidak menyatu. */
function logDetailKey(log: InputLogRow): string {
  const d = (log.details ?? {}) as Record<string, unknown>;
  switch (log.mode) {
    case "quiz":
      return String(d.quizName ?? "");
    case "subject_grade":
      return `${String(d.subject ?? "")}:${String(d.assessmentName ?? "")}`;
    case "violation":
      return String(d.violationDesc ?? "");
    default:
      return "";
  }
}

function buildDailyReportMessage(
  logs: InputLogRow[],
  dateLabel: string,
): string {
  const byTeacher: Record<string, InputLogRow[]> = {};
  for (const log of logs) {
    if (!byTeacher[log.teacher_name]) byTeacher[log.teacher_name] = [];
    byTeacher[log.teacher_name].push(log);
  }

  const teacherCount = Object.keys(byTeacher).length;

  let totalQuiz = 0;
  let totalGrade = 0;
  let totalViolation = 0;

  for (const items of Object.values(byTeacher)) {
    for (const item of items) {
      if (item.mode === "quiz") totalQuiz += item.student_count;
      else if (item.mode === "subject_grade") totalGrade += item.student_count;
      else if (item.mode === "violation") totalViolation += item.student_count;
    }
  }

  const totalEntries = totalQuiz + totalGrade + totalViolation;

  const lines: string[] = [];
  lines.push(`*📋 Laporan Aktivitas Harian*`);
  lines.push(`*Guru Cerdas — MI Al Irsyad Kota Madiun*`);
  lines.push(``);
  lines.push(`Assalamu'alaikum Wr. Wb.`);
  lines.push(``);
  lines.push(`Berikut ringkasan aktivitas pembelajaran hari ini, ${dateLabel}:`);
  lines.push(``);

  if (totalEntries === 0) {
    lines.push(`🍃 Tidak ada aktivitas input yang tercatat hari ini.`);
    lines.push(``);
    lines.push(`Semoga esok lebih produktif. Tetap semangat! 💪`);
  } else {
    lines.push(
      `📊 *${totalEntries} aktivitas* dicatat oleh *${teacherCount} guru*`,
    );
    if (totalQuiz > 0)
      lines.push(`   📝 Poin Kuis/Keaktifan — ${totalQuiz} entri`);
    if (totalGrade > 0)
      lines.push(`   📖 Nilai Akademik — ${totalGrade} entri`);
    if (totalViolation > 0)
      lines.push(`   ⚠️ Pelanggaran — ${totalViolation} entri`);
    lines.push(``);

    // Detail per guru — grup per mode+kelas+detail agar entri berbeda tetap terpisah
    for (const [teacher, items] of Object.entries(byTeacher)) {
      const grouped: Record<string, InputLogRow[]> = {};
      for (const item of items) {
        const key = `${item.mode}:${item.class_name}:${logDetailKey(item)}`;
        if (!grouped[key]) grouped[key] = [];
        grouped[key].push(item);
      }

      const teacherTotal = items.reduce((s, g) => s + g.student_count, 0);
      lines.push(`▸ *${teacher}* — ${teacherTotal} entri`);

      for (const group of Object.values(grouped)) {
        const first = group[0];
        const count = group.reduce((s, g) => s + g.student_count, 0);

        switch (first.mode) {
          case "quiz": {
            const quizName = String(first.details?.quizName || "Kuis");
            const subject = String(first.details?.subject || "");
            const subjectStr = subject ? ` (${subject})` : "";
            lines.push(
              `     ✅ Quiz *${quizName}*${subjectStr} · ${count} siswa · ${first.class_name}`,
            );
            break;
          }
          case "subject_grade": {
            const subject = String(first.details?.subject || "");
            const assessment = String(first.details?.assessmentName || "");
            lines.push(
              `     ✅ Nilai *${subject}* · ${assessment} · ${count} siswa · ${first.class_name}`,
            );
            break;
          }
          case "violation": {
            const desc = String(first.details?.violationDesc || "");
            lines.push(
              `     ⚠️ *${desc}* · ${count} siswa · ${first.class_name}`,
            );
            break;
          }
        }
      }
    }

    lines.push(``);
    lines.push(
      `Terima kasih atas dedikasi Bapak/Ibu guru hari ini. Semoga setiap catatan yang diinput menjadi amal jariyah dan membawa manfaat bagi peserta didik.`,
    );
  }

  lines.push(``);
  lines.push(`Wassalamu'alaikum Wr. Wb.`);
  lines.push(`— 🤖 Guru Cerdas`);

  return lines.join("\n");
}

function truncateMessage(message: string, maxLen: number): string {
  if (message.length <= maxLen) return message;
  const tail = "\n\n… (pesan dipotong karena terlalu panjang)";
  return message.slice(0, maxLen - tail.length) + tail;
}

/** Tandai log basi (dari hari sebelumnya yang gagal terkirim) sebagai sent. */
async function cleanupStaleLogs(
  supabase: SupabaseClient,
  startOfWibDayIso: string,
): Promise<void> {
  const { data, error } = await supabase
    .from("daily_input_log")
    .update({ sent: true })
    .lt("created_at", startOfWibDayIso)
    .eq("sent", false)
    .select("id");

  if (error) {
    console.error("Failed to clean stale daily_input_log:", error);
  } else if (data && data.length > 0) {
    console.log(`Marked ${data.length} stale log(s) as sent`);
  }
}

Deno.serve(async (req: Request) => {
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    { auth: { persistSession: false } },
  );

  // --- Auth: pg_cron (X-Internal-Secret) atau manual via service role ---
  const authHeader = req.headers.get("authorization");
  const internalSecret = req.headers.get("x-internal-secret");
  const expectedKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

  const { data: storedSecret } = await supabase
    .rpc("get_app_config", { p_key: "daily_report_worker_secret" });
  const workerSecret = typeof storedSecret === "string" ? storedSecret : "";
  const envScheduled = Deno.env.get("SCHEDULED_FUNCTION_SECRET") ?? "";

  const isInternal = Boolean(internalSecret) && (
    (workerSecret.length > 0 && internalSecret === workerSecret) ||
    (envScheduled.length > 0 && internalSecret === envScheduled)
  );
  const isAuthorized =
    isInternal ||
    (authHeader === `Bearer ${expectedKey}` && expectedKey.length > 0);

  if (!isAuthorized) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  const fonnteToken = (Deno.env.get("FONNTE_TOKEN") ?? "").trim();
  if (!fonnteToken) {
    console.error("FONNTE_TOKEN not configured");
    return new Response(JSON.stringify({ error: "FONNTE_TOKEN missing" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }

  try {
    // Batas hari "hari ini" dalam WIB (bukan UTC) — label tanggal juga WIB.
    const now = Date.now();
    const wibDate = new Date(now + WIB_OFFSET_MS);
    const wibDateStr = wibDate.toISOString().slice(0, 10);
    const startOfWibDayUtc =
      Date.UTC(wibDate.getUTCFullYear(), wibDate.getUTCMonth(), wibDate.getUTCDate()) -
      WIB_OFFSET_MS;
    const startOfWibDayIso = new Date(startOfWibDayUtc).toISOString();
    const dateLabel = new Intl.DateTimeFormat("id-ID", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
      timeZone: "Asia/Jakarta",
    }).format(new Date(now));

    // Log hari ini yang belum terkirim
    const { data: logs, error: logError } = await supabase
      .from("daily_input_log")
      .select("*")
      .eq("sent", false)
      .gte("created_at", startOfWibDayIso)
      .order("created_at", { ascending: true });

    if (logError) {
      console.error("daily_input_log query error:", logError);
      return new Response(
        JSON.stringify({ error: logError.message }),
        { status: 500, headers: { "Content-Type": "application/json" } },
      );
    }

    // Bersihkan backlog hari-hari sebelumnya agar tidak menumpuk/direlabel ulang
    await cleanupStaleLogs(supabase, startOfWibDayIso);

    if (!logs || logs.length === 0) {
      console.log("No pending input logs to report.");
      return new Response(
        JSON.stringify({ message: "No logs to report", count: 0 }),
        { headers: { "Content-Type": "application/json" } },
      );
    }

    // Guard anti double-send dalam satu hari (cron + invoke manual)
    const { data: lastSentDate } = await supabase
      .rpc("get_app_config", { p_key: "daily_report_sent_date" });
    if (typeof lastSentDate === "string" && lastSentDate === wibDateStr) {
      console.log(`Daily report already sent today (${wibDateStr}).`);
      return new Response(
        JSON.stringify({ message: "Already sent today", count: 0 }),
        { headers: { "Content-Type": "application/json" } },
      );
    }

    const typedLogs = logs as unknown as InputLogRow[];

    // Config Fonnte global (app_config, bukan per-user)
    const { data: configValue } = await supabase
      .rpc("get_app_config", { p_key: "fonnte_config" });

    let fonnteConfig: Partial<FonnteConfig> = {};
    if (configValue && typeof configValue === "string") {
      try {
        fonnteConfig = JSON.parse(configValue);
      } catch {
        fonnteConfig = {};
      }
    }

    if (!fonnteConfig.enabled || !fonnteConfig.adminPhone) {
      console.log(
        "Daily report disabled or admin phone missing; logs kept for later.",
      );
      return new Response(
        JSON.stringify({
          message: "Daily report disabled or admin phone missing",
          logCount: typedLogs.length,
          recipients: 0,
        }),
        { headers: { "Content-Type": "application/json" } },
      );
    }

    // Claim hari ini SEBELUM mengirim — kalau gagal, dibuka lagi untuk retry
    const { error: claimError } = await supabase.rpc("set_app_config", {
      p_key: "daily_report_sent_date",
      p_value: wibDateStr,
    });
    if (claimError) {
      console.error("Failed to claim daily report date:", claimError);
    }

    const message = truncateMessage(
      buildDailyReportMessage(typedLogs, dateLabel),
      MAX_MESSAGE_LENGTH,
    );

    let sentCount = 0;
    try {
      const formData = new URLSearchParams();
      formData.append("target", fonnteConfig.adminPhone);
      formData.append("message", message);

      const result = await fetch(FONNTE_SEND_URL, {
        method: "POST",
        headers: {
          Authorization: fonnteToken,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: formData.toString(),
      });

      if (result.ok) {
        sentCount++;
        console.log(`Daily report sent to ${fonnteConfig.adminPhone}`);
      } else {
        const body = await result.text().catch(() => "");
        console.error(
          `Fonnte send failed to ${fonnteConfig.adminPhone}: ${result.status} ${body}`,
        );
      }
    } catch (err) {
      console.error(
        `Fonnte error for ${fonnteConfig.adminPhone}:`,
        err,
      );
    }

    if (sentCount > 0) {
      // Tandai log yang BENAR-BENAR terkirim via id eksplisit (bukan range UUID)
      const { error: updateError } = await supabase
        .from("daily_input_log")
        .update({ sent: true })
        .in("id", typedLogs.map((l) => l.id))
        .eq("sent", false);

      if (updateError) {
        console.error("Failed to mark logs as sent:", updateError);
      }
    } else {
      // Gagal terkirim — buka guard supaya bisa dicoba lagi
      await supabase.rpc("set_app_config", {
        p_key: "daily_report_sent_date",
        p_value: "",
      });
    }

    return new Response(
      JSON.stringify({
        message: sentCount > 0 ? "Daily report sent" : "Daily report send failed",
        logCount: typedLogs.length,
        recipients: sentCount,
      }),
      { headers: { "Content-Type": "application/json" } },
    );
  } catch (err) {
    console.error("Unexpected error in daily-report:", err);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { "Content-Type": "application/json" } },
    );
  }
});
