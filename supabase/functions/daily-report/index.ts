// Supabase Edge Function: daily-report
// Triggered by pg_cron setiap sore. Membaca daily_input_log dan mengirim
// laporan harian WhatsApp via Fonnte ke admin yang sudah subscribe.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

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
  dailyReportEnabled: boolean;
  dailyReportTime: string;
}

const FONNTE_SEND_URL = "https://api.fonnte.com/send";

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

  // Hitung summary dulu
  for (const [, items] of Object.entries(byTeacher)) {
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

  // Ringkasan atas
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

    // Detail per guru
    for (const [teacher, items] of Object.entries(byTeacher)) {
      const grouped: Record<string, InputLogRow[]> = {};
      for (const item of items) {
        const key = `${item.mode}:${item.class_name}`;
        if (!grouped[key]) grouped[key] = [];
        grouped[key].push(item);
      }

      const teacherTotal = items.reduce((s, g) => s + g.student_count, 0);
      lines.push(`▸ *${teacher}* — ${teacherTotal} entri`);

      for (const [, group] of Object.entries(grouped)) {
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

Deno.serve(async (req: Request) => {
  const authHeader = req.headers.get("authorization");
  const expectedKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
  const internalSecret = req.headers.get("x-internal-secret");

  // Allow calls from pg_cron (with x-internal-secret) or with service_role key
  const scheduledSecret = Deno.env.get("SCHEDULED_FUNCTION_SECRET");
  const isInternal = Boolean(
    internalSecret && scheduledSecret && internalSecret === scheduledSecret,
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

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    expectedKey,
    { auth: { persistSession: false } },
  );

  const fonnteToken = (Deno.env.get("FONNTE_TOKEN") ?? "").trim();
  if (!fonnteToken) {
    console.error("FONNTE_TOKEN not configured");
    return new Response(JSON.stringify({ error: "FONNTE_TOKEN missing" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }

  try {
    // Fetch unsent logs
    const { data: logs, error: logError } = await supabase
      .from("daily_input_log")
      .select("*")
      .eq("sent", false)
      .order("created_at", { ascending: true });

    if (logError) {
      console.error("daily_input_log query error:", logError);
      return new Response(
        JSON.stringify({ error: logError.message }),
        { status: 500, headers: { "Content-Type": "application/json" } },
      );
    }

    if (!logs || logs.length === 0) {
      console.log("No pending input logs to report.");
      return new Response(
        JSON.stringify({ message: "No logs to report", count: 0 }),
        { headers: { "Content-Type": "application/json" } },
      );
    }

    const typedLogs = logs as unknown as InputLogRow[];

    // Fetch Fonnte config from app_config (global, bukan per-user)
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

    // Build date label for today
    const today = new Date();
    const dateLabel = today.toLocaleDateString("id-ID", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });

    const message = buildDailyReportMessage(typedLogs, dateLabel);
    let sentCount = 0;
    let minLogId: string | null = null;
    let maxLogId: string | null = null;

    // Find log id range for marking sent
    const sortedLogs = [...typedLogs].sort(
      (a, b) =>
        new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
    );
    if (sortedLogs.length > 0) {
      minLogId = sortedLogs[0].id;
      maxLogId = sortedLogs[sortedLogs.length - 1].id;
    }

    // Send to admin if config is enabled
    if (
      fonnteConfig.enabled &&
      fonnteConfig.adminPhone &&
      fonnteConfig.dailyReportEnabled !== false
    ) {
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
    }

    // Mark logs as sent
    if (sentCount > 0 && minLogId && maxLogId) {
      const { error: updateError } = await supabase
        .from("daily_input_log")
        .update({ sent: true })
        .gte("id", minLogId)
        .lte("id", maxLogId)
        .eq("sent", false);

      if (updateError) {
        console.error("Failed to mark logs as sent:", updateError);
      }
    }

    return new Response(
      JSON.stringify({
        message: "Daily report sent",
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
