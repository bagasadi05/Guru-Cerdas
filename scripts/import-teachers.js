import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

// Pastikan environment variables tersedia
const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Error: VITE_SUPABASE_URL dan SUPABASE_SERVICE_ROLE_KEY harus di-set di .env');
  console.error('Tambahkan SUPABASE_SERVICE_ROLE_KEY=... ke file .env Anda (dapatkan dari Supabase Dashboard -> Project Settings -> API).');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

const filePath = process.argv[2] || 'scripts/data-guru.csv';

async function importTeachers() {
  console.log(`Membaca file data dari: ${filePath}`);
  
  if (!fs.existsSync(filePath)) {
    console.error(`File ${filePath} tidak ditemukan.`);
    console.error('Silakan buat file tersebut dengan format CSV (header: nama,email,password)');
    process.exit(1);
  }

  const fileContent = fs.readFileSync(filePath, 'utf-8');
  // Simple CSV parsing (mengasumsikan tidak ada koma di dalam nama)
  const lines = fileContent.split('\n').filter(line => line.trim() !== '');
  
  if (lines.length < 2) {
    console.error('File CSV kosong atau tidak memiliki data.');
    process.exit(1);
  }

  const headers = lines[0].split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/).map(h => h.trim().toLowerCase().replace(/^"|"$/g, ''));
  
  const nameIdx = headers.indexOf('nama');
  const emailIdx = headers.indexOf('email');
  const passIdx = headers.indexOf('password');

  if (nameIdx === -1 || emailIdx === -1 || passIdx === -1) {
    console.error('Format header CSV salah. Harus ada: nama,email,password');
    process.exit(1);
  }

  let successCount = 0;
  let errorCount = 0;

  for (let i = 1; i < lines.length; i++) {
    const row = lines[i].split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/).map(cell => cell.replace(/^"|"$/g, ''));
    if (row.length < 3) continue;

    const name = row[nameIdx].trim();
    const email = row[emailIdx].trim();
    const password = row[passIdx].trim();

    if (!email || !password) continue;

    console.log(`Memproses guru: ${name} (${email})...`);

    try {
      // 1. Buat user di Supabase Auth
      const { data: authData, error: authError } = await supabase.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: {
          full_name: name,
        },
      });

      if (authError) {
        if (authError.message.includes('already been registered') || authError.message.includes('already exists')) {
          console.warn(`[SKIP] Email ${email} sudah terdaftar.`);
          continue;
        }
        throw new Error(`Gagal membuat Auth User: ${authError.message}`);
      }

      const userId = authData.user.id;

      // 2. Insert/Update ke tabel user_roles
      const { error: roleError } = await supabase
        .from('user_roles')
        .upsert({
          user_id: userId,
          email: email,
          full_name: name,
          role: 'teacher'
        }, { onConflict: 'user_id' });

      if (roleError) {
        throw new Error(`Gagal assign role teacher: ${roleError.message}`);
      }

      console.log(`[OK] Berhasil mendaftarkan guru: ${name}`);
      successCount++;
    } catch (err) {
      console.error(`[ERROR] Gagal memproses ${email}:`, err.message);
      errorCount++;
    }
  }

  console.log('--------------------------------------------------');
  console.log(`Selesai! Berhasil: ${successCount}, Gagal: ${errorCount}`);
}

importTeachers();
