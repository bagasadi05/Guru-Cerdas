// Supabase Edge Function: daily-report
// Dipicu oleh pg_cron setiap sore (jadwal di app_config 'daily_report_schedule')
// atau dipanggil manual dari admin panel.
// Membaca daily_input_log hari itu (WIB) dan mengirim laporan harian WhatsApp
// via Fonnte ke nomor admin yang terdaftar (app_config 'fonnte_config').

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
  token?: string;
}

const FONNTE_SEND_URL = "https://api.fonnte.com/send";
const WIB_OFFSET_MS = 7 * 60 * 60 * 1000; // Asia/Jakarta = UTC+7
const MAX_MESSAGE_LENGTH = 1500;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-internal-secret",
  "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
};

/** Normalisasi nomor WhatsApp ke format internasional standar (628xxx). */
function normalizePhone(phone: string): string {
  let cleaned = phone.replace(/\D/g, "");
  if (cleaned.startsWith("0")) {
    cleaned = "62" + cleaned.slice(1);
  }
  return cleaned;
}

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
    const teacher = log.teacher_name || "Guru";
    if (!byTeacher[teacher]) byTeacher[teacher] = [];
    byTeacher[teacher].push(log);
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
  const tail = "\n\n… (pesan dipotong karena batas panjang Fonnte)";
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
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

  const supabase = createClient(
    supabaseUrl,
    serviceKey,
    { auth: { persistSession: false } },
  );

  // Request payload / query options
  let reqBody: Record<string, unknown> = {};
  if (req.method === "POST") {
    try {
      reqBody = await req.json();
    } catch {
      reqBody = {};
    }
  }
  const urlObj = new URL(req.url);
  const isForce = reqBody.force === true || urlObj.searchParams.get("force") === "true";

  // --- Auth check ---
  const authHeader = req.headers.get("authorization");
  const internalSecret = req.headers.get("x-internal-secret");
  const expectedKey = serviceKey;

  const { data: storedSecret } = await supabase
    .rpc("get_app_config", { p_key: "daily_report_worker_secret" });
  const workerSecret = typeof storedSecret === "string" ? storedSecret : "";
  const envScheduled = Deno.env.get("SCHEDULED_FUNCTION_SECRET") ?? "";

  const isInternal = Boolean(internalSecret) && (
    (workerSecret.length > 0 && internalSecret === workerSecret) ||
    (envScheduled.length > 0 && internalSecret === envScheduled)
  );

  // Allow: internal pg_cron header, service role header, or authenticated user with admin check
  let isAuthorized = isInternal || (Boolean(authHeader) && authHeader === `Bearer ${expectedKey}`);

  if (!isAuthorized && authHeader) {
    const token = authHeader.replace(/^Bearer\s+/i, "");
    if (token && token.length > 20) {
      const { data: userData, error: userError } = await supabase.auth.getUser(token);
      if (!userError && userData?.user) {
        const { data: isAdmin } = await supabase.rpc("is_admin_user", { p_user_id: userData.user.id });
        if (isAdmin === true) {
          isAuthorized = true;
        }
      }
    }
  }

  if (!isAuthorized) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // --- Fetch Config ---
  const { data: configValue } = await supabase
    .rpc("get_app_config", { p_key: "fonnte_config" });

  let fonnteConfig: Partial<FonnteConfig> = {};
  if (configValue) {
    if (typeof configValue === "string") {
      try {
        fonnteConfig = JSON.parse(configValue);
      } catch {
        fonnteConfig = {};
      }
    } else if (typeof configValue === "object") {
      fonnteConfig = configValue as Partial<FonnteConfig>;
    }
  }

  // Token resolution: Deno.env -> app_config('fonnte_token') -> fonnteConfig.token
  let fonnteToken = (Deno.env.get("FONNTE_TOKEN") ?? "").trim();
  if (!fonnteToken) {
    const { data: dbToken } = await supabase.rpc("get_app_config", { p_key: "fonnte_token" });
    if (typeof dbToken === "string" && dbToken.trim().length > 0) {
      fonnteToken = dbToken.trim();
    }
  }
  if (!fonnteToken && fonnteConfig.token) {
    fonnteToken = String(fonnteConfig.token).trim();
  }

  if (!fonnteToken) {
    console.error("FONNTE_TOKEN not configured");
    return new Response(
      JSON.stringify({
        error: "FONNTE_TOKEN belum dikonfigurasi. Masukkan Fonnte Token di panel admin atau secrets.",
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }

  const rawTargetPhone = fonnteConfig.adminPhone || "";
  const targetPhone = normalizePhone(rawTargetPhone);

  if (!fonnteConfig.enabled && !isForce) {
    return new Response(
      JSON.stringify({ message: "Laporan harian dinonaktifkan di pengaturan", enabled: false }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }

  if (!targetPhone) {
    return new Response(
      JSON.stringify({ error: "Nomor WhatsApp admin belum diisi", recipients: 0 }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }

  try {
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

    // Bersihkan backlog hari-hari sebelumnya
    await cleanupStaleLogs(supabase, startOfWibDayIso);

    // Anti double-send guard (kecuali force trigger)
    if (!isForce) {
      const { data: lastSentDate } = await supabase
        .rpc("get_app_config", { p_key: "daily_report_sent_date" });
      if (typeof lastSentDate === "string" && lastSentDate === wibDateStr) {
        return new Response(
          JSON.stringify({ message: `Laporan harian sudah terkirim hari ini (${wibDateStr})`, count: 0 }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }
    }

    // Ambil log hari ini (jika isForce, ambil semua log hari ini terlepas dari flag sent)
    let logQuery = supabase
      .from("daily_input_log")
      .select("*")
      .gte("created_at", startOfWibDayIso)
      .order("created_at", { ascending: true });

    if (!isForce) {
      logQuery = logQuery.eq("sent", false);
    }

    const { data: logs, error: logError } = await logQuery;

    if (logError) {
      console.error("daily_input_log query error:", logError);
      return new Response(
        JSON.stringify({ error: logError.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const typedLogs = (logs || []) as unknown as InputLogRow[];

    const message = truncateMessage(
      buildDailyReportMessage(typedLogs, dateLabel),
      MAX_MESSAGE_LENGTH,
    );

    let sentSuccess = false;
    let fonnteResponseText = "";
    let fonnteResponseJson: Record<string, unknown> = {};

    try {
      const formData = new URLSearchParams();
      formData.append("target", targetPhone);
      formData.append("message", message);

      const result = await fetch(FONNTE_SEND_URL, {
        method: "POST",
        headers: {
          Authorization: fonnteToken,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: formData.toString(),
      });

      fonnteResponseText = await result.text().catch(() => "");
      try {
        fonnteResponseJson = JSON.parse(fonnteResponseText);
      } catch {
        fonnteResponseJson = {};
      }

      // Fonnte returns status: true on actual success
      if (result.ok && fonnteResponseJson.status === true) {
        sentSuccess = true;
        console.log(`Daily report successfully sent to ${targetPhone}`);
      } else {
        console.error(`Fonnte send rejected (${result.status}):`, fonnteResponseText);
      }
    } catch (err) {
      console.error(`Fonnte network error:`, err);
    }

    if (sentSuccess) {
      // Claim hari ini
      await supabase.rpc("set_app_config", {
        p_key: "daily_report_sent_date",
        p_value: wibDateStr,
      });

      if (typedLogs.length > 0) {
        await supabase
          .from("daily_input_log")
          .update({ sent: true })
          .in("id", typedLogs.map((l) => l.id));
      }
    } else {
      // Re-open guard on failure
      await supabase.rpc("set_app_config", {
        p_key: "daily_report_sent_date",
        p_value: "",
      });
    }

    return new Response(
      JSON.stringify({
        success: sentSuccess,
        message: sentSuccess ? "Laporan harian berhasil dikirim ke WhatsApp!" : `Gagal mengirim via Fonnte: ${fonnteResponseJson.reason || fonnteResponseText || 'Unknown error'}`,
        fonnteDetail: fonnteResponseText,
        logCount: typedLogs.length,
        recipient: targetPhone,
      }),
      {
        status: sentSuccess ? 200 : 502,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  } catch (err) {
    console.error("Unexpected error in daily-report:", err);
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
