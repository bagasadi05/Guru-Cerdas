import { createClient, SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { ProviderRouter } from "../_shared/ai/providerRouter.ts";
import { ModulAjarFullSchema } from "../_shared/modul-ajar/schema.ts";
import { resolveLearningSyntax } from "../_shared/modul-ajar/syntaxResolver.ts";
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

  // 1. JWT verification
  const authHeader = req.headers.get('Authorization');
  if (!authHeader) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: corsHeaders });
  }

  const userClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    global: { headers: { Authorization: authHeader } }
  });
  
  const { data: { user }, error: authError } = await userClient.auth.getUser();
  if (authError || !user) {
    return new Response(JSON.stringify({ error: 'Invalid token' }), { status: 401, headers: corsHeaders });
  }

  // Hanya guru/admin yang boleh memicu worker — mencegah role authenticated
  // (siswa/orang tua) memakai kuota Gemini via endpoint ini.
  const { data: roleData, error: roleError } = await userClient
    .from('user_roles')
    .select('role')
    .eq('user_id', user.id)
    .in('role', ['admin', 'kepala_sekolah', 'teacher'])
    .maybeSingle();

  if (roleError || !roleData) {
    return new Response(
      JSON.stringify({ error: 'Forbidden: hanya guru/admin yang dapat memicu worker' }),
      { status: 403, headers: corsHeaders }
    );
  }

  const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  // Release stale jobs before starting
  await supabaseAdmin.rpc('release_stale_modul_ajar_ai_jobs', { p_lease_duration_seconds: 120 });

  // 3. Queue background processing
  // @ts-ignore
  if (typeof EdgeRuntime !== 'undefined' && typeof EdgeRuntime.waitUntil === 'function') {
    // @ts-ignore
    EdgeRuntime.waitUntil(processQueue(supabaseAdmin));
  } else {
    processQueue(supabaseAdmin).catch(console.error);
  }

  return new Response(JSON.stringify({ ok: true, message: "Queue processing started" }), {
    status: 202,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});

async function processQueue(supabase: SupabaseClient) {
  console.log(`[Worker ${WORKER_ID}] Starting queue processing...`);
  const providerRouter = new ProviderRouter();
  const jsonSchema = zodToJsonSchema(ModulAjarFullSchema, "ModulAjarFullSchema");

  // Batasi batch per invokasi — mencegah worker dibunuh platform di tengah
  // antrean panjang (job terakhir tertinggal status processing selamanya).
  const MAX_JOBS_PER_INVOCATION = 5;
  let jobsProcessed = 0;

  while (jobsProcessed < MAX_JOBS_PER_INVOCATION) {
    jobsProcessed++;
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
      // 5. Check cache verified ref_boilerplate_topik
      const { data: existingVerified } = await supabase
        .from('ref_boilerplate_topik')
        .select('*')
        .eq('request_fingerprint', job.request_fingerprint)
        .eq('content_status', 'verified')
        .maybeSingle();

      if (existingVerified) {
        console.log(`[Worker ${WORKER_ID}] Cache verified hit for job ${job.id}. Skipping AI generation.`);
        await completeJob(supabase, job.id, existingVerified.konten_json || existingVerified);
        continue;
      }

      // Database-First Data Loading
      const input = job.input_json;
      
      // Load CP from DB
      const { data: cpData } = await supabase
        .from('ref_capaian_pembelajaran')
        .select('*')
        .ilike('mata_pelajaran', `%${input.mapel}%`)
        .eq('fase', input.fase)
        .maybeSingle();

      // Load Model Pembelajaran & Sintaks from DB
      let modelData = null;
      let sintaksData: any[] = [];
      if (input.modelUuid) {
        const { data: mData } = await supabase
          .from('ref_model_pembelajaran')
          .select('*')
          .eq('id', input.modelUuid)
          .maybeSingle();
        modelData = mData;

        const { data: sData } = await supabase
          .from('ref_sintaks_kegiatan')
          .select('*')
          .eq('model_id', input.modelUuid)
          .order('urutan', { ascending: true });
        sintaksData = sData || [];
      }

      // Resolve syntax using non-blocking fallback resolver
      const resolvedSyntax = resolveLearningSyntax(
        sintaksData,
        modelData?.sintaks_inti,
        modelData?.nama_model || input.modelPenyampaian
      );

      // Build Database-First System Instruction & Prompt
      const systemInstruction = `Anda adalah asisten AI pedagogis tingkat lanjut untuk Kurikulum Merdeka. 
Hasilkan Modul Ajar terstruktur secara komprehensif dalam format JSON. 
ATURAN WAJIB:
1. JANGAN menyertakan placeholder seperti {nama_siswa}, [Isi di sini], [Nama Sekolah].
2. JANGAN ada pengulangan kata berurutan seperti "siswa siswa".
3. JANGAN mengarang Capaian Pembelajaran resmi, gunakan CP yang disediakan.
4. Gunakan urutan sintaks pembelajaran yang sudah ditentukan di prompt. Anda hanya diperbolehkan mengontekstualkan kegiatan guru dan siswa sesuai topik.
5. Output harus persis mengikuti skema JSON yang diminta.`;

      let prompt = `Tolong buatkan Modul Ajar:\nMata Pelajaran: ${input.mapel}\nFase: ${input.fase}\nTopik: ${input.topik}\n`;
      if (cpData) {
        prompt += `Capaian Pembelajaran Resmi DB: ${cpData.deskripsi_cp}\nElemen: ${cpData.elemen || '-'}\nRegulasi: ${cpData.sumber_regulasi || '-'}\n`;
      } else if (input.cp) {
        prompt += `Capaian Pembelajaran (Input): ${input.cp}\n`;
      }

      prompt += `\nSintaks Pembelajaran (${resolvedSyntax.source}${resolvedSyntax.isCanonical ? ' Canonical' : ' Fallback'}):\n`;
      resolvedSyntax.steps.forEach(step => {
        prompt += `- Langkah ${step.order}: ${step.name} (Kegiatan Guru: ${step.teacherActivity} | Kegiatan Siswa: ${step.studentActivity})\n`;
      });

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
        const { data: attempt, error: attemptError } = await supabase.from('ai_generation_attempts').insert({
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

        if (attemptError) {
          // Unique violation saat retry (attempt_number bentrok) — jangan ditelan:
          // data attempt tidak bisa dipercaya kalau insert gagal diam-diam.
          console.warn(`[Worker ${WORKER_ID}] Gagal mencatat attempt sukses:`, attemptError.message);
        }

        attemptRecord = attempt;

        const aiOutput: any = result.data;

        // Save boilerplate draft_ai for Bank Bersama candidate
        const { error: insertError } = await supabase.from('ref_boilerplate_topik').insert({
          fase: input.fase,
          mata_pelajaran: input.mapel.toLowerCase().trim(),
          topik: input.topik.toLowerCase().trim(),
          tujuan_pembelajaran: aiOutput.tujuanPembelajaran || [],
          pemahaman_bermakna: aiOutput.pemahamanBermakna || [],
          pertanyaan_pemantik: aiOutput.pertanyaanPemantik || [],
          lkpd_tugas: aiOutput.lkpdTugas || '',
          soal_evaluasi: Array.isArray(aiOutput.soalEvaluasi) ? aiOutput.soalEvaluasi.join('\n') : (aiOutput.soalEvaluasi || ''),
          pengayaan: aiOutput.pengayaan || [],
          remedial: aiOutput.remedial || [],
          daftar_pustaka: aiOutput.daftarPustaka || [],
          konten_json: aiOutput,
          ai_dynamic_content: {
            sintaks: resolvedSyntax,
            asesmenPengetahuan: aiOutput.asesmenPengetahuan,
            asesmenKeterampilan: aiOutput.asesmenKeterampilan,
            pedomanJawaban: aiOutput.pedomanJawaban
          },
          content_status: 'draft_ai',
          is_verified: false,
          request_fingerprint: job.request_fingerprint,
          generated_by_provider: result.provider,
          generated_by_model: result.model,
          prompt_version: 'v1',
          sumber_regulasi: cpData?.sumber_regulasi || 'Kemendikbudristek / Kemenag',
          generation_metadata: {
            job_id: job.id,
            attempt_id: attemptRecord?.id,
            latency_ms: latency,
            syntax_source: resolvedSyntax.source,
            syntax_warning: resolvedSyntax.warning
          }
        });

        if (insertError) {
          if (insertError.code === '23505') {
            console.log(`[Worker ${WORKER_ID}] Race condition handled (Boilerplate already exists)`);
          } else {
            console.warn(`[Worker ${WORKER_ID}] Boilerplate insert warning:`, insertError.message);
          }
        }

        // Return full result JSON including resolvedSyntax warning if any
        const fullResultPayload = {
          ...aiOutput,
          _resolvedSyntax: resolvedSyntax
        };

        await completeJob(supabase, job.id, fullResultPayload);

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
           isTransient = false;
           errorCode = 'internal_worker_error';
        }

        const { error: attemptFailError } = await supabase.from('ai_generation_attempts').insert({
          job_id: job.id,
          attempt_number: job.attempt_count,
          provider: 'unknown',
          latency_ms: latency,
          http_status: 500,
          error_category: errorCode,
          error_detail: aiError.message
        });

        if (attemptFailError) {
          console.warn(`[Worker ${WORKER_ID}] Gagal mencatat attempt gagal:`, attemptFailError.message);
        }

        await handleJobFailure(supabase, job, isTransient, errorCode, aiError.message);
      }
    } catch (unexpectedError: any) {
      console.error(`[Worker ${WORKER_ID}] Unexpected error for job ${job.id}:`, unexpectedError);
      await handleJobFailure(supabase, job, false, 'fatal_crash', unexpectedError.message);
    }
  }
}

async function completeJob(supabase: SupabaseClient, jobId: string, resultJson: any) {
  // Guard: jangan menimpa job yang sudah di-cancel oleh admin saat worker
  // masih memproses (cancel/retry balapan dengan worker).
  const { error } = await supabase
    .from('ai_content_jobs')
    .update({
      status: 'completed',
      result_json: resultJson,
      completed_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      locked_by: null,
      locked_at: null
    })
    .eq('id', jobId)
    .in('status', ['processing', 'pending']);

  if (error) {
    // Jangan biarkan job "selesai" di log padahal update DB gagal —
    // kalau dibiarkan, klien akan polling selamanya tanpa status akhir.
    console.error(`[Worker] Gagal menandai job ${jobId} selesai:`, error.message);
  }
}

async function handleJobFailure(supabase: SupabaseClient, job: any, isTransient: boolean, errorCode: string, errorDetail: string) {
  const atMaxAttempts = job.attempt_count >= job.max_attempts;

  // Guard: jangan menimpa status job yang sudah di-cancel oleh admin.

  if (isTransient && !atMaxAttempts) {
    const { error } = await supabase
      .from('ai_content_jobs')
      .update({
        status: 'retry_wait',
        next_retry_at: new Date(Date.now() + 30000).toISOString(),
        error_code: errorCode,
        error_detail: errorDetail,
        locked_by: null,
        locked_at: null,
        updated_at: new Date().toISOString()
      })
      .eq('id', job.id)
      .in('status', ['processing', 'pending', 'retry_wait']);

    if (error) {
      console.error(`[Worker] Gagal menandai job ${job.id} retry_wait:`, error.message);
    }
  } else {
    const { error } = await supabase
      .from('ai_content_jobs')
      .update({
        status: 'failed',
        error_code: errorCode,
        error_detail: errorDetail,
        locked_by: null,
        locked_at: null,
        updated_at: new Date().toISOString()
      })
      .eq('id', job.id)
      .in('status', ['processing', 'pending', 'retry_wait']);

    if (error) {
      console.error(`[Worker] Gagal menandai job ${job.id} failed:`, error.message);
    }
  }
}
