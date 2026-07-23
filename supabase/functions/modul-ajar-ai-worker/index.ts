import { createClient, SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { ProviderRouter } from "../_shared/ai/providerRouter.ts";
import { ModulAjarFullSchema } from "../_shared/modul-ajar/schema.ts";
import { AIProviderError } from "../_shared/ai/errors.ts";
import zodToJsonSchema from "npm:zod-to-json-schema";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const WORKER_ID = `edge-worker-${crypto.randomUUID()}`;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  // 1. JWT verification (Basic checks if client passes Authorization)
  const authHeader = req.headers.get('Authorization');
  if (!authHeader) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: corsHeaders });
  }

  // Ensure this is a valid user calling the trigger
  const userClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    global: { headers: { Authorization: authHeader } }
  });
  
  const { data: { user }, error: authError } = await userClient.auth.getUser();
  if (authError || !user) {
    return new Response(JSON.stringify({ error: 'Invalid token' }), { status: 401, headers: corsHeaders });
  }

  const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  // Release stale jobs before starting
  await supabaseAdmin.rpc('release_stale_modul_ajar_ai_jobs', { p_lease_duration_seconds: 120 });

  // 3. Queue the background processing
  // @ts-ignore: EdgeRuntime is specific to Supabase Deno runtime
  if (typeof EdgeRuntime !== 'undefined' && typeof EdgeRuntime.waitUntil === 'function') {
    // @ts-ignore
    EdgeRuntime.waitUntil(processQueue(supabaseAdmin));
  } else {
    // Fallback for local dev without EdgeRuntime
    processQueue(supabaseAdmin).catch(console.error);
  }

  // 4. Return 202 Accepted immediately
  return new Response(JSON.stringify({ ok: true, message: "Queue processing started" }), {
    status: 202,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});

async function processQueue(supabase: SupabaseClient) {
  console.log(`[Worker ${WORKER_ID}] Starting queue processing...`);
  const providerRouter = new ProviderRouter();
  const jsonSchema = zodToJsonSchema(ModulAjarFullSchema, "ModulAjarFullSchema");

  while (true) {
    const { data: job, error } = await supabase.rpc('claim_next_modul_ajar_ai_job', {
      p_worker_id: WORKER_ID
    });

    if (error) {
      console.error(`[Worker ${WORKER_ID}] Error claiming job:`, error.message);
      break;
    }

    if (!job) {
      console.log(`[Worker ${WORKER_ID}] No more jobs found. Resting.`);
      break;
    }

    console.log(`[Worker ${WORKER_ID}] Processing job: ${job.id}`);

    try {
      // 5. Cek cache `ref_boilerplate_topik` sekali lagi sebelum call AI
      const { data: existingBoilerplate } = await supabase
        .from('ref_boilerplate_topik')
        .select('id, content_status')
        .eq('request_fingerprint', job.request_fingerprint)
        .in('content_status', ['draft_ai', 'draft_manual', 'verified'])
        .maybeSingle();

      if (existingBoilerplate) {
        console.log(`[Worker ${WORKER_ID}] Cache hit for job ${job.id}. Skipping AI generation.`);
        await completeJob(supabase, job.id, null);
        continue;
      }

      // 6. Bentuk instruksi
      const input = job.input_json;
      const systemInstruction = `Anda adalah asisten AI pedagogis tingkat lanjut. Hasilkan Modul Ajar (Paket A & Paket B) secara komprehensif berdasarkan parameter berikut dalam format JSON. JANGAN menyertakan placeholder seperti {nama_siswa}, JANGAN ada pengulangan kata "siswa siswa". Output harus persis mengikuti skema JSON yang diminta.`;
      
      let prompt = `Tolong buatkan Modul Ajar untuk:\nMata Pelajaran: ${input.mapel}\nFase: ${input.fase}\nTopik: ${input.topik}\n`;
      if (input.cp) prompt += `Capaian Pembelajaran: ${input.cp}\n`;
      if (input.modelPenyampaian) prompt += `Model/Sintaks: ${input.modelPenyampaian}\n`;

      const startTime = Date.now();
      let attemptRecord: any;

      try {
        const result = await providerRouter.routeAIRequest({
          systemInstruction,
          prompt,
          jsonSchema: jsonSchema as object,
          zodSchema: ModulAjarFullSchema
        });
        
        const latency = Date.now() - startTime;

        // Log successful attempt
        const { data: attempt } = await supabase.from('ai_generation_attempts').insert({
          job_id: job.id,
          attempt_number: job.attempt_count,
          provider: result.provider,
          model: result.model,
          latency_ms: latency,
          http_status: 200,
          input_tokens: result.inputTokens,
          output_tokens: result.outputTokens,
          cached_tokens: result.cachedTokens,
          provider_request_id: result.requestId
        }).select('id').single();

        attemptRecord = attempt;

        // Save boilerplate
        const { error: insertError } = await supabase.from('ref_boilerplate_topik').insert({
          fase: input.fase,
          mata_pelajaran: input.mapel,
          topik: input.topik,
          konten_json: result.data,
          content_status: 'draft_ai',
          request_fingerprint: job.request_fingerprint,
          generated_by_provider: result.provider,
          generated_by_model: result.model,
          prompt_version: 'v1',
          generation_metadata: {
            job_id: job.id,
            attempt_id: attemptRecord?.id,
            latency_ms: latency
          }
        });

        if (insertError) {
          // If unique constraint violation occurs here, it means another worker just inserted it
          if (insertError.code === '23505') {
            console.log(`[Worker ${WORKER_ID}] Race condition gracefully handled (Boilerplate already exists)`);
          } else {
            throw new Error(`DB Insert Error: ${insertError.message}`);
          }
        }

        await completeJob(supabase, job.id, result.data);

      } catch (aiError: any) {
        const latency = Date.now() - startTime;
        let isTransient = true;
        let errorCode = 'unknown';

        if (aiError.name === 'AIProviderError') {
          errorCode = aiError.code;
          const fatalCodes = ['invalid_request', 'unauthorized', 'forbidden', 'validation_failed'];
          if (fatalCodes.includes(errorCode)) {
            isTransient = false;
          }
        } else {
           // Any other fatal DB or logic error
           isTransient = false;
           errorCode = 'internal_worker_error';
        }

        // Log failed attempt
        await supabase.from('ai_generation_attempts').insert({
          job_id: job.id,
          attempt_number: job.attempt_count,
          provider: 'unknown',
          latency_ms: latency,
          http_status: 500,
          error_category: errorCode,
          error_detail: aiError.message
        });

        await handleJobFailure(supabase, job, isTransient, errorCode, aiError.message);
      }
    } catch (unexpectedError: any) {
      console.error(`[Worker ${WORKER_ID}] Unexpected error for job ${job.id}:`, unexpectedError);
      await handleJobFailure(supabase, job, false, 'fatal_crash', unexpectedError.message);
    }
  }
}

async function completeJob(supabase: SupabaseClient, jobId: string, resultJson: any) {
  await supabase
    .from('ai_content_jobs')
    .update({
      status: 'completed',
      result_json: resultJson,
      completed_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      locked_by: null,
      locked_at: null
    })
    .eq('id', jobId);
}

async function handleJobFailure(supabase: SupabaseClient, job: any, isTransient: boolean, errorCode: string, errorDetail: string) {
  const atMaxAttempts = job.attempt_count >= job.max_attempts;
  
  if (isTransient && !atMaxAttempts) {
    // Retryable
    await supabase
      .from('ai_content_jobs')
      .update({
        status: 'retry_wait',
        next_retry_at: new Date(Date.now() + 30000).toISOString(), // Retry in 30 seconds
        error_code: errorCode,
        error_detail: errorDetail,
        locked_by: null,
        locked_at: null,
        updated_at: new Date().toISOString()
      })
      .eq('id', job.id);
  } else {
    // Fatal or max attempts reached
    await supabase
      .from('ai_content_jobs')
      .update({
        status: 'failed',
        error_code: errorCode,
        error_detail: errorDetail,
        locked_by: null,
        locked_at: null,
        updated_at: new Date().toISOString()
      })
      .eq('id', job.id);
  }
}
