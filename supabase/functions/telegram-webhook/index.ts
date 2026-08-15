// Supabase Edge Function: telegram-webhook
// Menerima pesan dari Telegram (webhook) dan menjawab pertanyaan admin
// tentang data aplikasi (guru aktif, input harian/mingguan) via AI Gemini.
//
// Keamanan:
//  - Verifikasi header X-Telegram-Bot-Api-Secret-Token (secret_token setWebhook).
//  - Hanya chat ID admin (app_config 'telegram_config'.chatId) yang boleh bertanya.
//  - Balas 200 cepat, proses async via EdgeRuntime.waitUntil.

import { createClient, SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { ProviderRouter } from "../_shared/ai/providerRouter.ts";
import { z } from "npm:zod";

const TELEGRAM_BASE_URL = "https://api.telegram.org";
const WIB_OFFSET_MS = 7 * 60 * 60 * 1000; // Asia/Jakarta = UTC+7

interface TelegramUpdate {
  update_id?: number;
  message?: {
    chat?: { id?: number; type?: string };
    from?: { id?: number; is_bot?: boolean; first_name?: string; username?: string };
    text?: string;
    date?: number;
  };
}

const AnswerSchema = z.object({
  answer: z.string(),
});

function corsHeaders(extra?: Record<string, string>): Record<string, string> {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-telegram-bot-api-secret-token",
    "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
    ...extra,
  };
}

async function getTelegramToken(supabase: SupabaseClient): Promise<string> {
  const envToken = (Deno.env.get("TELEGRAM_BOT_TOKEN") ?? "").trim();
  if (envToken) return envToken;
  const { data: dbToken } = await supabase.rpc("get_app_config", { p_key: "telegram_bot_token" });
  if (typeof dbToken === "string" && dbToken.trim()) return dbToken.trim();
  return "";
}

async function getWebhookSecret(supabase: SupabaseClient): Promise<string> {
  const envSecret = (Deno.env.get("TELEGRAM_WEBHOOK_SECRET") ?? "").trim();
  if (envSecret) return envSecret;
  const { data: dbSecret } = await supabase.rpc("get_app_config", { p_key: "telegram_webhook_secret" });
  if (typeof dbSecret === "string" && dbSecret.trim()) return dbSecret.trim();
  return "";
}

/** Batas WIB hari ini (pola daily-report). */
function getWibDayStart(): string {
  const now = Date.now();
  const wibDate = new Date(now + WIB_OFFSET_MS);
  const startOfWibDayUtc =
    Date.UTC(wibDate.getUTCFullYear(), wibDate.getUTCMonth(), wibDate.getUTCDate()) -
    WIB_OFFSET_MS;
  return new Date(startOfWibDayUtc).toISOString();
}

function getWibDateLabel(): string {
  return new Intl.DateTimeFormat("id-ID", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "Asia/Jakarta",
  }).format(new Date());
}

interface ActiveTeacherRow {
  full_name: string;
  role: string;
}

interface InputLogRow {
  teacher_name: string;
  mode: string;
  student_count: number;
  created_at: string;
}

/** Ambil data yang relevan untuk menjawab pertanyaan seputar guru & input. */
async function collectData(supabase: SupabaseClient): Promise<Record<string, unknown>> {
  const weekStart = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const todayStart = getWibDayStart();

  const [activeTeachers, todayLogs, weekLogs] = await Promise.all([
    // Guru aktif (approved + tidak dihapus), role guru/administratif
    supabase
      .from("user_roles")
      .select("full_name, role")
      .eq("deleted_at", null)
      .eq("is_approved", true)
      .in("role", ["teacher", "admin", "kepala_madrasah", "waka_kesiswaan", "waka_kurikulum"])
      .order("full_name", { ascending: true }),

    // Input hari ini (WIB) dari daily_input_log
    supabase
      .from("daily_input_log")
      .select("teacher_name, mode, student_count, created_at")
      .gte("created_at", todayStart)
      .order("created_at", { ascending: true }),

    // Input minggu ini
    supabase
      .from("daily_input_log")
      .select("teacher_name, mode, student_count, created_at")
      .gte("created_at", weekStart)
      .order("created_at", { ascending: true }),
  ]);

  const teachers = (activeTeachers.data ?? []) as ActiveTeacherRow[];
  const today = (todayLogs.data ?? []) as InputLogRow[];
  const week = (weekLogs.data ?? []) as InputLogRow[];

  // Guru yang input hari ini (distinct)
  const todayTeacherNames = new Set(today.map((l) => l.teacher_name));
  const activeNames = teachers.map((t) => t.full_name).filter(Boolean);
  const teachersToday = activeNames.filter((n) => todayTeacherNames.has(n));
  const teachersNotToday = activeNames.filter((n) => !todayTeacherNames.has(n));

  const summarizeLogs = (logs: InputLogRow[]) => {
    const byTeacher: Record<string, { entries: number; students: number; modes: Record<string, number> }> = {};
    for (const log of logs) {
      if (!byTeacher[log.teacher_name]) {
        byTeacher[log.teacher_name] = { entries: 0, students: 0, modes: {} };
      }
      byTeacher[log.teacher_name].entries += 1;
      byTeacher[log.teacher_name].students += Number(log.student_count) || 0;
      byTeacher[log.teacher_name].modes[log.mode] = (byTeacher[log.teacher_name].modes[log.mode] || 0) + 1;
    }
    return {
      totalEntries: logs.length,
      totalStudents: logs.reduce((s, l) => s + (Number(l.student_count) || 0), 0),
      byMode: logs.reduce<Record<string, number>>((acc, l) => {
        acc[l.mode] = (acc[l.mode] || 0) + 1;
        return acc;
      }, {}),
      byTeacher,
    };
  };

  return {
    tanggal: getWibDateLabel(),
    guruAktif: {
      jumlah: teachers.length,
      daftar: activeNames,
    },
    inputHariIni: {
      ...summarizeLogs(today),
      guruYangInput: teachersToday,
      guruYangBelumInput: teachersNotToday,
      jumlahGuruYangInput: teachersToday.length,
    },
    inputMingguIni: summarizeLogs(week),
  };
}

async function sendTelegramMessage(
  botToken: string,
  chatId: number,
  text: string,
): Promise<void> {
  await fetch(`${TELEGRAM_BASE_URL}/bot${botToken}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id: chatId,
      text,
      parse_mode: "Markdown",
    }),
  });
}

async function handleUpdate(update: TelegramUpdate): Promise<void> {
  const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
  const supabase = createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false },
  });

  const message = update.message;
  const chatId = message?.chat?.id;
  const text = (message?.text ?? "").trim();

  if (!chatId || !text) return;

  // Gate admin: hanya chat ID admin yang boleh bertanya
  const { data: configValue } = await supabase.rpc("get_app_config", { p_key: "telegram_config" });
  let adminChatId = "";
  if (configValue) {
    try {
      const cfg = typeof configValue === "string" ? JSON.parse(configValue) : configValue;
      adminChatId = String(cfg?.chatId ?? "").trim();
    } catch {
      adminChatId = "";
    }
  }

  const botToken = await getTelegramToken(supabase);
  if (!botToken) {
    console.error("TELEGRAM_BOT_TOKEN not configured");
    return;
  }

  if (!adminChatId || String(chatId) !== adminChatId) {
    // Bukan admin — abaikan diam-diam (jangan bocorkan keberadaan data)
    console.log(`Ignoring message from non-admin chat ${chatId}`);
    return;
  }

  // Perintah sederhana tanpa AI
  if (text === "/start" || text === "/help") {
    await sendTelegramMessage(
      botToken,
      chatId,
      "👋 *Guru Cerdas Bot*\n\nTanyakan data aplikasi, misalnya:\n- \"Berapa guru yang aktif?\"\n- \"Siapa yang sudah input data hari ini?\"\n- \"Berapa input minggu ini?\"",
    );
    return;
  }

  try {
    const data = await collectData(supabase);

    const provider = new ProviderRouter();
    const systemInstruction =
      "Kamu adalah asisten data sekolah 'Guru Cerdas'. " +
      "Jawab pertanyaan admin dalam Bahasa Indonesia dengan LAPORAN TERSTRUKTUR dan INFORMATIF. " +
      "Gunakan format Markdown Telegram (bold *teks*, bullet - , angka konkret). " +
      "Struktur jawaban yang disarankan:\n" +
      "*Ringkasan* (1-2 kalimat angka utama)\n" +
      "Lalu rincian yang relevan:\n" +
      "- Jumlah & daftar guru (jika ditanya guru)\n" +
      "- Rincian per guru: nama, jumlah entri, jumlah siswa, breakdown per mode (kuis/nilai/pelanggaran)\n" +
      "- Rincian per mode: total entri masing-masing\n" +
      "- Guru yang belum input (jika diminta)\n" +
      "Jika pertanyaan di luar data yang tersedia (nilai, kehadiran, jurnal), jawab jujur: 'Maaf, data itu belum tersedia.' " +
      "Jangan menebak angka yang tidak ada di data. Selalu sebutkan angka dari data yang diberikan.";

    const result = await provider.routeAIRequest({
      systemInstruction,
      prompt:
        `DATA SAAT INI:\n${JSON.stringify(data, null, 2)}\n\n` +
        `PERTANYAAN ADMIN:\n${text}\n\n` +
        "Susun jawaban sebagai laporan informatif dalam JSON: {\"answer\": \"<laporan lengkap dengan Markdown>\"}",
      jsonSchema: {
        type: "object",
        properties: {
          answer: { type: "string" },
        },
        required: ["answer"],
      },
      zodSchema: AnswerSchema,
      timeoutMs: 40000,
    });

    const answer = (result.data as z.infer<typeof AnswerSchema>).answer;
    await sendTelegramMessage(botToken, chatId, answer);
  } catch (err) {
    console.error("telegram-webhook error:", err);
    const msg = err instanceof Error ? err.message : "Terjadi kesalahan internal";
    await sendTelegramMessage(botToken, chatId, `⚠️ Gagal menjawab: ${msg.slice(0, 500)}`).catch(() => {});
  }
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders() });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: corsHeaders({ "Content-Type": "application/json" }),
    });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    { auth: { persistSession: false } },
  );

  // Verifikasi secret token webhook (Telegram mengirim header ini)
  const expectedSecret = await getWebhookSecret(supabase);
  const providedSecret = req.headers.get("x-telegram-bot-api-secret-token") ?? "";

  if (!expectedSecret || providedSecret !== expectedSecret) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: corsHeaders({ "Content-Type": "application/json" }),
    });
  }

  let update: TelegramUpdate;
  try {
    update = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON" }), {
      status: 400,
      headers: corsHeaders({ "Content-Type": "application/json" }),
    });
  }

  // Balas 200 segera, proses async (jawaban bisa 3-10 detik)
  EdgeRuntime.waitUntil(handleUpdate(update).catch((err: unknown) => {
    console.error("telegram-webhook async error:", err);
  }));

  return new Response("ok", { headers: corsHeaders() });
});
