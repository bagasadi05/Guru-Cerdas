// Supabase Edge Function: telegram-proxy
// Proxy aman untuk memanggil Telegram Bot API dari browser tanpa melanggar CSP.
// Mendukung dua aksi: 'send' (kirim pesan) dan 'getMe' (verifikasi token bot).

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const TELEGRAM_BASE_URL = "https://api.telegram.org";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function resolveBotToken(
  envToken: string,
  dbToken: unknown,
  configToken: unknown,
): string {
  if (envToken.trim()) return envToken.trim();
  if (typeof dbToken === "string" && dbToken.trim()) return dbToken.trim();
  if (typeof configToken === "string" && configToken.trim()) return configToken.trim();
  if (configToken && typeof configToken === "object") {
    const cfg = configToken as Record<string, unknown>;
    if (typeof cfg.token === "string" && cfg.token.trim()) return cfg.token.trim();
  }
  return "";
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
  const supabase = createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false },
  });

  // --- Auth: hanya admin yang boleh memanggil ---
  const authHeader = req.headers.get("authorization");
  let isAuthorized = false;

  if (authHeader) {
    const token = authHeader.replace(/^Bearer\s+/i, "");
    if (token === serviceKey) {
      isAuthorized = true;
    } else if (token.length > 20) {
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

  // --- Parse request ---
  let body: Record<string, unknown> = {};
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const action = String(body.action || "send");

  // --- Resolve Telegram bot token dari env → app_config ---
  const envToken = Deno.env.get("TELEGRAM_BOT_TOKEN") ?? "";
  const { data: dbToken } = await supabase.rpc("get_app_config", { p_key: "telegram_bot_token" });
  const { data: configValue } = await supabase.rpc("get_app_config", { p_key: "telegram_config" });
  let cfg: unknown = null;
  if (configValue) {
    try {
      cfg = typeof configValue === "string" ? JSON.parse(configValue) : configValue;
    } catch { /* ignore */ }
  }

  const botToken = resolveBotToken(envToken, dbToken, cfg);

  if (!botToken) {
    return new Response(
      JSON.stringify({ error: "TELEGRAM_BOT_TOKEN belum dikonfigurasi" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }

  try {
    if (action === "send") {
      const chatId = String(body.chatId || "");
      const message = String(body.message || "");

      if (!chatId || !message) {
        return new Response(
          JSON.stringify({ error: "chatId dan message wajib diisi" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }

      const resp = await fetch(`${TELEGRAM_BASE_URL}/bot${botToken}/sendMessage`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: chatId,
          text: message,
          parse_mode: "Markdown",
        }),
      });

      const data = await resp.json();
      const ok = data?.ok === true;
      return new Response(JSON.stringify({ ok, ...data }), {
        status: resp.status,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "getMe") {
      // Verifikasi token bot valid
      const resp = await fetch(`${TELEGRAM_BASE_URL}/bot${botToken}/getMe`);
      const data = await resp.json();
      return new Response(JSON.stringify(data), {
        status: resp.status,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(
      JSON.stringify({ error: `Aksi '${action}' tidak dikenali. Gunakan 'send' atau 'getMe'.` }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    console.error("telegram-proxy error:", err);
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : "Internal server error" }),
      { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
