// Supabase Edge Function: scheduled-backup
// Automated daily backup of all database tables to Cloudflare R2
// Triggered by pg_cron + pg_net, or can be invoked manually

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { S3Client, PutObjectCommand, ListObjectsV2Command, DeleteObjectCommand } from "npm:@aws-sdk/client-s3@3.515.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function jsonResponse(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

// Tables to backup (matching browser-based backup coverage + extras)
const BACKUP_TABLES = [
  "students",
  "classes",
  "attendance",
  "academic_records",
  "violations",
  "quiz_points",
  "reports",
  "tasks",
  "schedules",
  "communications",
  "homework",
  "extracurriculars",
  "student_extracurriculars",
  "extracurricular_attendance",
  "extracurricular_grades",
  "extracurricular_students",
  "student_achievements",
  "student_development_analyses",
  "school_info",
  "announcements",
  "academic_years",
  "semesters",
  "user_roles",
  "teaching_journals",
  "teacher_class_assignments",
];

const RETENTION_DAYS = 30;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // 1. Authenticate — accept either JWT auth or internal header from pg_net
    const authHeader = req.headers.get("Authorization");
    const internalSecret = req.headers.get("X-Internal-Secret");
    const scheduledSecret = Deno.env.get("SCHEDULED_BACKUP_SECRET");

    let supabase: ReturnType<typeof createClient>;

    if (internalSecret && scheduledSecret && internalSecret === scheduledSecret) {
      // Internal call from pg_cron — use service role
      const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
      const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
      supabase = createClient(supabaseUrl, serviceRoleKey, {
        auth: { persistSession: false, autoRefreshToken: false },
      });
    } else if (authHeader) {
      // Normal user auth
      const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
      const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
      supabase = createClient(supabaseUrl, supabaseAnonKey, {
        global: { headers: { Authorization: authHeader } },
        auth: { persistSession: false, autoRefreshToken: false },
      });
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) {
        return jsonResponse({ error: "Unauthorized" }, 401);
      }
    } else {
      return jsonResponse({ error: "Missing auth" }, 401);
    }

    // 2. Load R2 config
    const accountId = Deno.env.get("R2_ACCOUNT_ID");
    const accessKeyId = Deno.env.get("R2_ACCESS_KEY_ID");
    const secretAccessKey = Deno.env.get("R2_SECRET_ACCESS_KEY");
    const bucketName = Deno.env.get("R2_BUCKET_NAME");

    if (!accountId || !accessKeyId || !secretAccessKey || !bucketName) {
      return jsonResponse({ error: "R2 environment variables not configured" }, 500);
    }

    const s3 = new S3Client({
      region: "auto",
      endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
      credentials: { accessKeyId, secretAccessKey },
    });

    // 3. Export all tables
    const backupData: Record<string, unknown[]> = {};
    let totalRows = 0;

    for (const table of BACKUP_TABLES) {
      try {
        const { data, error } = await supabase
          .from(table)
          .select("*");

        if (error) {
          console.error(`Error fetching ${table}:`, error.message);
          backupData[table] = [];
        } else {
          backupData[table] = data ?? [];
          totalRows += (data ?? []).length;
        }
      } catch (e) {
        console.error(`Table ${table} not found or error:`, e);
        backupData[table] = [];
      }
    }

    // 4. Create backup JSON
    const now = new Date();
    const timestamp = now.toISOString().replace(/[:.]/g, "-");
    const backupPayload = {
      version: 3,
      timestamp: now.getTime(),
      created_at: now.toISOString(),
      tables: Object.keys(backupData).length,
      total_rows: totalRows,
      data: backupData,
    };

    const backupJson = JSON.stringify(backupPayload);
    const backupSize = new TextEncoder().encode(backupJson).length;

    // 5. Upload to R2
    const backupKey = `backups/daily/${timestamp}_backup.json`;

    await s3.send(new PutObjectCommand({
      Bucket: bucketName,
      Key: backupKey,
      Body: backupJson,
      ContentType: "application/json",
      Metadata: {
        "backup-version": "3",
        "total-rows": String(totalRows),
        "table-count": String(Object.keys(backupData).length),
      },
    }));

    // 6. Cleanup old backups (older than RETENTION_DAYS)
    let deletedCount = 0;
    try {
      const listResponse = await s3.send(new ListObjectsV2Command({
        Bucket: bucketName,
        Prefix: "backups/daily/",
      }));

      const cutoffTime = now.getTime() - (RETENTION_DAYS * 24 * 60 * 60 * 1000);

      if (listResponse.Contents) {
        for (const obj of listResponse.Contents) {
          if (!obj.Key || !obj.LastModified) continue;
          if (obj.Key === backupKey) continue;

          if (obj.LastModified.getTime() < cutoffTime) {
            await s3.send(new DeleteObjectCommand({
              Bucket: bucketName,
              Key: obj.Key,
            }));
            deletedCount++;
          }
        }
      }
    } catch (e) {
      console.error("Cleanup error:", e);
    }

    return jsonResponse({
      success: true,
      backup_key: backupKey,
      size_bytes: backupSize,
      total_rows: totalRows,
      tables: Object.keys(backupData).length,
      deleted_old_backups: deletedCount,
      timestamp: now.toISOString(),
    });
  } catch (err: any) {
    console.error("Scheduled backup error:", err);
    return jsonResponse({ error: err.message || "Backup failed" }, 500);
  }
});
