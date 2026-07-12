import { createClient } from '@supabase/supabase-js';
import ExcelJS from 'exceljs';
import fs from 'fs';
import path from 'path';

// Pastikan environment variables tersedia
const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Error: VITE_SUPABASE_URL dan SUPABASE_SERVICE_ROLE_KEY harus di-set di .env');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

const filePath = process.argv[2] || 'data/Pembagian_Kelas_1_2026_2027.xlsx';

async function importStudents() {
  console.log(`Membaca file data dari: ${filePath}`);
  
  if (!fs.existsSync(filePath)) {
    console.error(`File ${filePath} tidak ditemukan.`);
    process.exit(1);
  }

  // Cari admin/teacher user_id untuk creator
  const { data: users, error: userError } = await supabase
    .from('user_roles')
    .select('user_id')
    .limit(1);

  if (userError || !users || users.length === 0) {
    console.error('Gagal mendapatkan user_id untuk creator data:', userError?.message);
    process.exit(1);
  }
  
  const creatorUserId = users[0].user_id;
  const currentAcademicYear = '2026/2027';

  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(filePath);
  
  let totalImported = 0;
  
  for (const worksheet of workbook.worksheets) {
    const className = worksheet.name.trim(); // "Kelas 1A", etc.
    console.log(`\nMemproses Sheet: ${className}`);
    
    // 1. Buat atau cari kelas
    let classId = null;
    const { data: existingClasses } = await supabase
      .from('classes')
      .select('id')
      .eq('name', className)
      .eq('academic_year', currentAcademicYear)
      .limit(1);
      
    if (existingClasses && existingClasses.length > 0) {
      classId = existingClasses[0].id;
      console.log(`Kelas ${className} sudah ada (ID: ${classId})`);
    } else {
      const { data: newClass, error: classError } = await supabase
        .from('classes')
        .insert({
          name: className,
          grade_level: 1,
          academic_year: currentAcademicYear,
          user_id: creatorUserId,
          is_archived: false
        })
        .select()
        .single();
        
      if (classError) {
        console.error(`Gagal membuat kelas ${className}:`, classError.message);
        continue;
      }
      classId = newClass.id;
      console.log(`Dibuat Kelas ${className} baru (ID: ${classId})`);
    }

    // 2. Baca data siswa
    let rowCount = 0;
    const studentsToInsert = [];
    
    worksheet.eachRow({ includeEmpty: false }, (row, rowNumber) => {
      // Baris 1: Judul
      // Baris 2: Header (No, Nama Siswa, L/P)
      if (rowNumber <= 2) return; 
      
      const no = row.getCell(1).value;
      const nama = row.getCell(2).value;
      const lp = row.getCell(3).value;
      
      if (!nama || !no || isNaN(Number(no))) return;
      
      const gender = (lp === 'L' || lp === 'Laki-laki') ? 'Laki-laki' : 'Perempuan';
      const cleanName = nama.toString().trim();
      const slug = cleanName.toLowerCase().replace(/[^a-z0-9]/g, '');
      const uniqueNum = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
      const accessCode = Math.random().toString(36).substring(2, 8).toUpperCase();
      
      studentsToInsert.push({
        name: cleanName,
        gender: gender,
        class_id: classId,
        user_id: creatorUserId,
        access_code: accessCode,
        avatar_url: `https://ui-avatars.com/api/?name=${encodeURIComponent(cleanName)}&background=random`
      });
      rowCount++;
    });
    
    if (studentsToInsert.length > 0) {
      console.log(`Menyimpan ${studentsToInsert.length} siswa ke database...`);
      const { error: insertError } = await supabase
        .from('students')
        .insert(studentsToInsert);
        
      if (insertError) {
        console.error(`Gagal menyimpan siswa untuk kelas ${className}:`, insertError.message);
      } else {
        console.log(`[OK] Berhasil menyimpan siswa untuk kelas ${className}`);
        totalImported += studentsToInsert.length;
      }
    }
  }

  console.log('\n--------------------------------------------------');
  console.log(`Selesai! Berhasil meng-import total: ${totalImported} siswa.`);
}

importStudents().catch(err => {
  console.error("Error:", err);
  process.exit(1);
});
