// Supabase Edge Function: r2-storage
// Securely generates Cloudflare R2 presigned URLs for client-side uploads
// and handles file deletions.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { S3Client, PutObjectCommand, DeleteObjectCommand } from "npm:@aws-sdk/client-s3@3.515.0";
import { getSignedUrl } from "npm:@aws-sdk/s3-request-presigner@3.515.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function jsonResponse(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json",
    },
  });
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    if (req.method !== "POST") {
      return jsonResponse({ error: "Method not allowed. Use POST." }, 405);
    }

    // 1. Authenticate user using the incoming JWT
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return jsonResponse({ error: "Missing Authorization header" }, 401);
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const token = authHeader.startsWith("Bearer ") || authHeader.startsWith("bearer ")
      ? authHeader.substring(7)
      : authHeader;

    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    if (userError || !user) {
      console.error("getUser failed for token:", token.substring(0, 15) + "...", "Error:", userError);
      return jsonResponse({ error: "Unauthorized user session" }, 401);
    }

    // 2. Load R2 configuration
    const accountId = Deno.env.get("R2_ACCOUNT_ID");
    const accessKeyId = Deno.env.get("R2_ACCESS_KEY_ID");
    const secretAccessKey = Deno.env.get("R2_SECRET_ACCESS_KEY");
    const bucketName = Deno.env.get("R2_BUCKET_NAME");
    const publicUrlBase = Deno.env.get("R2_PUBLIC_URL");

    if (!accountId || !accessKeyId || !secretAccessKey || !bucketName || !publicUrlBase) {
      return jsonResponse(
        {
          code: "R2_CONFIGURATION_MISSING",
          error: "Cloudflare R2 environment variables are not fully configured in Supabase. " +
            "Required variables: R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET_NAME, R2_PUBLIC_URL"
        },
        500
      );
    }

    // 3. Initialize S3 client for Cloudflare R2
    const s3 = new S3Client({
      region: "auto",
      endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
      forcePathStyle: true,
      credentials: {
        accessKeyId,
        secretAccessKey,
      },
    });

    // 4. Parse request body
    let body;
    try {
      body = await req.json();
    } catch {
      return jsonResponse({ error: "Invalid JSON body" }, 400);
    }

    const { action } = body;
    if (!action) {
      return jsonResponse({ error: "Missing 'action' parameter in request body." }, 400);
    }

    if (action === "presign") {
      const { filename, contentType, folder } = body;
      if (!filename || !contentType || !folder) {
        return jsonResponse({ error: "Missing required parameters: filename, contentType, folder" }, 400);
      }

      // Whitelist folders to prevent arbitrary writing
      const allowedFolders = [
        "teaching_journals",
        "achievement_certificates",
        "violations",
        "student_avatars",
        "teacher_avatars",
      ];
      if (!allowedFolders.includes(folder)) {
        return jsonResponse({ error: `Invalid folder target. Allowed: ${allowedFolders.join(", ")}` }, 400);
      }

      // Generate unique file key path
      const cleanFilename = filename.replace(/[^a-zA-Z0-9.-]/g, "_");
      const key = `${folder}/${crypto.randomUUID()}-${cleanFilename}`;

      const command = new PutObjectCommand({
        Bucket: bucketName,
        Key: key,
        ContentType: contentType,
      });

      // Generate presigned PUT URL valid for 1 hour (3600 seconds)
      const uploadUrl = await getSignedUrl(s3, command, { 
        expiresIn: 3600,
        signableHeaders: new Set(["host", "content-type"])
      });
      const cleanBase = publicUrlBase.endsWith("/") ? publicUrlBase.slice(0, -1) : publicUrlBase;
      const publicUrl = `${cleanBase}/${key}`;

      return jsonResponse({
        success: true,
        uploadUrl,
        publicUrl,
        key,
      });
    }

    if (action === "delete") {
      const { key, publicUrl } = body;
      let targetKey = key;

      if (!targetKey && publicUrl) {
        // Extract key from publicUrl
        try {
          const cleanBase = publicUrlBase.endsWith("/") ? publicUrlBase : `${publicUrlBase}/`;
          const urlObj = new URL(publicUrl);
          const baseUrlObj = new URL(cleanBase);
          if (urlObj.hostname === baseUrlObj.hostname) {
            targetKey = decodeURIComponent(urlObj.pathname.substring(baseUrlObj.pathname.length));
          } else {
            // Fallback: extract the path after hostname or standard pattern
            const marker = `/${bucketName}/`;
            if (urlObj.pathname.includes(marker)) {
              const [, path] = urlObj.pathname.split(marker);
              targetKey = decodeURIComponent(path);
            } else {
              // Last resort: strip leading slash from pathname
              targetKey = decodeURIComponent(urlObj.pathname.replace(/^\//, ""));
            }
          }
        } catch {
          return jsonResponse({ error: "Failed to parse publicUrl to extract R2 key." }, 400);
        }
      }

      if (!targetKey) {
        return jsonResponse({ error: "Missing required parameter 'key' or 'publicUrl' to delete file." }, 400);
      }

      // Send delete command to R2
      const command = new DeleteObjectCommand({
        Bucket: bucketName,
        Key: targetKey,
      });
      await s3.send(command);

      return jsonResponse({
        success: true,
        message: `Successfully deleted object: ${targetKey}`,
      });
    }

    return jsonResponse({ error: `Unsupported action: ${action}` }, 400);
  } catch (err: any) {
    console.error("Global Edge Function error:", err);
    return jsonResponse({ error: err.message || "Failed to process storage request" }, 500);
  }
});
