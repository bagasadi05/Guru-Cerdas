import { S3Client, ListObjectsV2Command } from 'npm:@aws-sdk/client-s3';

const client = new S3Client({
  region: 'auto',
  endpoint: Deno.env.get('R2_ENDPOINT'),
  credentials: {
    accessKeyId: Deno.env.get('R2_ACCESS_KEY_ID')!,
    secretAccessKey: Deno.env.get('R2_SECRET_ACCESS_KEY')!,
  },
});

const FOLDERS = ['student_avatars', 'teacher_avatars', 'violations', 'achievement_certificates', 'teaching_journals'];

Deno.serve(async () => {
  const results = [];
  for (const folder of FOLDERS) {
    const cmd = new ListObjectsV2Command({ Bucket: Deno.env.get('R2_BUCKET_NAME'), Prefix: `${folder}/` });
    const resp = await client.send(cmd);
    const contents = resp.Contents || [];
    results.push({
      folder,
      object_count: contents.length,
      total_size_bytes: contents.reduce((sum, obj) => sum + (obj.Size || 0), 0),
    });
  }

  const { createClient } = await import('https://esm.sh/@supabase/supabase-js@2');
  const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
  for (const r of results) {
    await supabase.from('storage_usage_snapshots').insert({ folder: r.folder, object_count: r.object_count, total_size_bytes: r.total_size_bytes });
  }
  return new Response(JSON.stringify({ ok: true, results }), { headers: { 'Content-Type': 'application/json' } });
});
