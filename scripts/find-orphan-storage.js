/**
 * Orphan Storage Finder
 *
 * Scans R2 bucket objects and cross-references against DB records.
 * Run: node scripts/find-orphan-storage.js
 *
 * Prerequisites: Supabase URL + service_role key in .env
 */
import { createClient } from '@supabase/supabase-js';
import { S3Client, ListObjectsV2Command } from '@aws-sdk/client-s3';
import 'dotenv/config';

const BUCKET = process.env.R2_BUCKET || 'portal-guru-storage';
const PREFIXES = ['student_avatars/', 'teacher_avatars/', 'violations/', 'achievement_certificates/', 'teaching_journals/'];

const s3 = new S3Client({
  region: 'auto',
  endpoint: process.env.R2_ENDPOINT,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
  },
});

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function getReferencedUrls() {
  const { data: violations } = await supabase.from('violations').select('evidence_url').not('evidence_url', 'is', null);
  const { data: achievements } = await supabase.from('student_achievements').select('certificate_url').not('certificate_url', 'is', null);
  const { data: journals } = await supabase.from('teaching_journals').select('attachment_url').not('attachment_url', 'is', null);
  const { data: students } = await supabase.from('students').select('photo_url, avatar_url');

  const refs = new Set();
  violations?.forEach(r => r.evidence_url && refs.add(r.evidence_url.split('?')[0]));
  achievements?.forEach(r => r.certificate_url && refs.add(r.certificate_url.split('?')[0]));
  journals?.forEach(r => r.attachment_url && refs.add(r.attachment_url.split('?')[0]));
  students?.forEach(r => { r.photo_url && refs.add(r.photo_url.split('?')[0]); r.avatar_url && refs.add(r.avatar_url.split('?')[0]); });
  return refs;
}

async function listR2Objects(prefix) {
  const objects = [];
  let cursor;
  do {
    const cmd = new ListObjectsV2Command({ Bucket: BUCKET, Prefix: prefix, ContinuationToken: cursor });
    const resp = await s3.send(cmd);
    objects.push(...(resp.Contents || []));
    cursor = resp.NextContinuationToken;
  } while (cursor);
  return objects;
}

async function main() {
  console.log('Fetching referenced URLs from DB...');
  const refs = await getReferencedUrls();
  console.log(`Found ${refs.size} unique referenced URLs in DB.`);

  let totalOrphans = 0;
  let totalSize = 0;

  for (const prefix of PREFIXES) {
    console.log(`\nScanning ${prefix}...`);
    const objects = await listR2Objects(prefix);
    let orphans = 0;
    let orphansSize = 0;

    for (const obj of objects) {
      const url = `${process.env.R2_PUBLIC_URL || ''}/${obj.Key}`;
      if (!refs.has(url) && !refs.has(obj.Key)) {
        console.log(`  ORPHAN: ${obj.Key} (${(obj.Size / 1024).toFixed(1)}KB)`);
        orphans++;
        orphansSize += obj.Size;
      }
    }

    if (orphans === 0) {
      console.log('  ✅ No orphans found.');
    } else {
      console.log(`  ⚠️ ${orphans} orphans (${(orphansSize / 1024 / 1024).toFixed(1)}MB)`);
    }
    totalOrphans += orphans;
    totalSize += orphansSize;
  }

  console.log(`\n📊 Total: ${totalOrphans} orphan objects, ${(totalSize / 1024 / 1024).toFixed(1)}MB wasted.`);
}

main().catch(console.error);
