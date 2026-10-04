import { createClient } from "@supabase/supabase-js";
import { createWorkerHandler } from "./handler.ts";

const token = Deno.env.get("WA_WORKER_TOKEN") ?? "";
const url = Deno.env.get("SUPABASE_URL") ?? "";
const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

if (!url || !key) throw new Error("Supabase worker configuration missing");

const supabase = createClient(url, key, { auth: { persistSession: false } });
Deno.serve(
  createWorkerHandler(token, (name, args) => supabase.rpc(name, args)),
);
