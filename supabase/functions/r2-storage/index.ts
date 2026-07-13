// Supabase Edge Function: r2-storage
// Securely uploads files to Cloudflare R2 and handles file deletions.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { S3Client, PutObjectCommand, DeleteObjectCommand } from "npm:@aws-sdk/client-s3@3.515.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const allowedFolders = [
  "teaching_journals",
  "achievement_certificates",
  "violations",
  "student_avatars",
  "teacher_avatars",
] as const;

const uploadRules = {
  teaching_journals: {
    maxBytes: 5 * 1024 * 1024,
    contentTypes: [
      "application/pdf",
      "image/jpeg",
      "image/png",
      "image/webp",
      "application/msword",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ],
  },
  achievement_certificates: {
    maxBytes: 5 * 1024 * 1024,
    contentTypes: ["application/pdf", "image/jpeg", "image/png", "image/webp"],
  },
  violations: {
    maxBytes: 5 * 1024 * 1024,
    contentTypes: ["application/pdf", "image/jpeg", "image/png", "image/webp"],
  },
  student_avatars: {
    maxBytes: 2 * 1024 * 1024,
    contentTypes: ["image/jpeg", "image/png", "image/webp"],
  },
  teacher_avatars: {
    maxBytes: 2 * 1024 * 1024,
    contentTypes: ["image/jpeg", "image/png", "image/webp"],
  },
} as const;

type R2StorageFolder = keyof typeof uploadRules;

const isR2StorageFolder = (value: string): value is R2StorageFolder =>
  allowedFolders.includes(value as R2StorageFolder);

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

    // 4. Parse request body. Uploads use multipart form data so the browser
    // communicates only with this CORS-enabled function, never R2 directly.
    const isMultipart = req.headers.get("content-type")?.includes("multipart/form-data");
    let body: Record<string, unknown>;
    let uploadFile: File | null = null;
    try {
      if (isMultipart) {
        const formData = await req.formData();
        body = {
          action: formData.get("action"),
          folder: formData.get("folder"),
        };
        const candidate = formData.get("file");
        uploadFile = candidate instanceof File ? candidate : null;
      } else {
        body = await req.json();
      }
    } catch {
      return jsonResponse({ error: "Invalid request body" }, 400);
    }

    const { action } = body as { action?: string };
    if (!action) {
      return jsonResponse({ error: "Missing 'action' parameter in request body." }, 400);
    }

    if (action === "upload") {
      const folder = typeof body.folder === "string" ? body.folder : "";
      if (!isR2StorageFolder(folder) || !uploadFile) {
        return jsonResponse({ error: "A valid folder and file are required for upload." }, 400);
      }

      const rule = uploadRules[folder];
      if (!rule.contentTypes.includes(uploadFile.type as never)) {
        return jsonResponse({ error: `File type ${uploadFile.type || "unknown"} is not allowed for ${folder}.` }, 400);
      }
      if (uploadFile.size === 0 || uploadFile.size > rule.maxBytes) {
        return jsonResponse({ error: `File size must be between 1 byte and ${rule.maxBytes} bytes.` }, 400);
      }

      // Generate unique file key path
      const cleanFilename = uploadFile.name.replace(/[^a-zA-Z0-9.-]/g, "_");
      const key = `${folder}/${crypto.randomUUID()}-${cleanFilename}`;
      // The AWS SDK's stream adapters are not consistent across Edge Runtime
      // versions. Files are capped at 5 MB, so a Uint8Array is reliable and
      // keeps the upload entirely server-side.
      const fileBytes = new Uint8Array(await uploadFile.arrayBuffer());

      const command = new PutObjectCommand({
        Bucket: bucketName,
        Key: key,
        Body: fileBytes,
        ContentLength: uploadFile.size,
        ContentType: uploadFile.type,
      });

      await s3.send(command);
      const cleanBase = publicUrlBase.endsWith("/") ? publicUrlBase.slice(0, -1) : publicUrlBase;
      const publicUrl = `${cleanBase}/${key}`;

      return jsonResponse({
        success: true,
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
