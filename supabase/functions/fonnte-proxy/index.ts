// Supabase Edge Function: fonnte-proxy
// Proxy aman untuk memanggil API Fonnte dari browser tanpa melanggar CSP.
// Mendukung dua aksi: 'device' (cek status perangkat) dan 'send' (kirim pesan).

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const FONNTE_BASE_URL = "https://api.fonnte.com";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

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

  const action = String(body.action || "device");

  // --- Resolve Fonnte token dari database ---
  let fonnteToken = (Deno.env.get("FONNTE_TOKEN") ?? "").trim();
  if (!fonnteToken) {
    const { data: dbToken } = await supabase.rpc("get_app_config", { p_key: "fonnte_token" });
    if (typeof dbToken === "string" && dbToken.trim()) {
      fonnteToken = dbToken.trim();
    }
  }
  if (!fonnteToken) {
    const { data: configValue } = await supabase.rpc("get_app_config", { p_key: "fonnte_config" });
    if (configValue) {
      try {
        const cfg = typeof configValue === "string" ? JSON.parse(configValue) : configValue;
        if (cfg?.token) fonnteToken = String(cfg.token).trim();
      } catch { /* ignore */ }
    }
  }

  if (!fonnteToken) {
    return new Response(
      JSON.stringify({ error: "Fonnte token belum dikonfigurasi" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }

  try {
    if (action === "device") {
      // Cek status perangkat Fonnte
      const resp = await fetch(`${FONNTE_BASE_URL}/device`, {
        method: "POST",
        headers: { Authorization: fonnteToken },
      });
      const data = await resp.json();
      return new Response(JSON.stringify(data), {
        status: resp.status,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "send") {
      const target = String(body.target || "");
      const message = String(body.message || "");

      if (!target || !message) {
        return new Response(
          JSON.stringify({ error: "target dan message wajib diisi" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }

      const formData = new URLSearchParams();
      formData.append("target", target);
      formData.append("message", message);

      const resp = await fetch(`${FONNTE_BASE_URL}/send`, {
        method: "POST",
        headers: {
          Authorization: fonnteToken,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: formData.toString(),
      });

      const data = await resp.json();
      return new Response(JSON.stringify({ ok: data.status === true, ...data }), {
        status: resp.status,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(
      JSON.stringify({ error: `Aksi '${action}' tidak dikenali. Gunakan 'device' atau 'send'.` }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    console.error("fonnte-proxy error:", err);
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : "Internal server error" }),
      { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
