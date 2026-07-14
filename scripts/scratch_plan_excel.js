import ExcelJS from 'exceljs';
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

// Load .env variables manually to be safe
const envPath = 'e:\\Coding\\Guru-Cerdas\\.env';
const envContent = fs.readFileSync(envPath, 'utf8');
const envVars = {};
envContent.split('\n').forEach(line => {
  const [key, ...val] = line.split('=');
  if (key && val) {
    envVars[key.trim()] = val.join('=').trim().replace(/['"]/g, '');
  }
});

const supabaseUrl = envVars['VITE_SUPABASE_URL'] || envVars['SUPABASE_URL'];
const supabaseKey = envVars['SUPABASE_SERVICE_ROLE_KEY'];

if (!supabaseUrl || !supabaseKey) {
    console.error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  // 1. Fetch DB Data
  const { data: users, error: userError } = await supabase.from('user_roles').select('user_id, full_name, email');
  if (userError) throw userError;
  
  const { data: classes, error: classError } = await supabase.from('classes').select('id, name');
  if (classError) throw classError;
  
  const { data: activeSemester, error: semError } = await supabase
    .from('semesters')
    .select('id, name')
    .eq('is_active', true)
    .single();
  if (semError) throw semError;

  // 2. Parse Excel
  const filePath = "e:\\Coding\\Guru-Cerdas\\data\\JADWAL 2627 REVISI (1).xlsx";
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(filePath);
  
  const sheet = workbook.getWorksheet('PEMBAGIAN MAPEL DAN JP');
  
  let assignments = [];
  let currentTeacher = null;
  let currentMapel = null;
  let currentKODE = null;

  sheet.eachRow((row, rowNumber) => {
    if (rowNumber < 4) return; // Skip headers
    
    // NO = 1, KODE = 2, NAMA GURU = 3, MAPEL = 4, KELAS = 5, TOTAL JAM = 6, JAM TAMBAHAN = 7
    // Values array is 1-indexed in ExcelJS sometimes, but let's safely access by cell index
    // Note: row.values[1] might be null depending on how excelJS reads it. 
    // Let's use row.getCell(col).value
    
    const kode = row.getCell(2).value;
    const rawTeacher = row.getCell(3).value;
    const rawMapel = row.getCell(4).value;
    const className = row.getCell(5).value;
    
    if (rawTeacher && rawTeacher.toString().trim() !== '') {
        currentTeacher = rawTeacher.toString().trim();
    }
    if (rawMapel && rawMapel.toString().trim() !== '') {
        currentMapel = rawMapel.toString().trim();
    }
    if (kode && kode.toString().trim() !== '') {
        currentKODE = kode.toString().trim();
    }
    
    if (className && className.toString().trim() !== '' && currentTeacher && currentMapel) {
        // Skip "JUMLAH JAM" rows
        if (currentTeacher.includes('JUMLAH JAM') || (className && className.toString().includes('JUMLAH JAM'))) {
            return;
        }
        
        assignments.push({
            kode: currentKODE,
            teacherName: currentTeacher,
            subject: currentMapel,
            className: className.toString().trim()
        });
    }
  });

  // 3. Match Data
  let matched = [];
  let unmatchedTeachers = new Set();
  let unmatchedClasses = new Set();
  
  for (const a of assignments) {
      // Find teacher
      let dbUser = users.find(u => {
          if (!u.full_name) return false;
          // Simple match: lower case and ignore punctuation
          const name1 = u.full_name.toLowerCase().replace(/[^a-z ]/g, '');
          const name2 = a.teacherName.toLowerCase().replace(/[^a-z ]/g, '');
          return name1.includes(name2) || name2.includes(name1);
      });
      
      let dbClass = classes.find(c => c.name.toLowerCase() === a.className.toLowerCase());
      
      if (!dbUser) unmatchedTeachers.add(a.teacherName);
      if (!dbClass) unmatchedClasses.add(a.className);
      
      if (dbUser && dbClass) {
          matched.push({
              teacher_user_id: dbUser.user_id,
              teacher_name: dbUser.full_name,
              class_id: dbClass.id,
              class_name: dbClass.name,
              semester_id: activeSemester.id,
              assignment_role: 'subject_teacher',
              subject_name: a.subject
          });
      }
  }

  // Generate Markdown Report
  let md = `# Implementation Plan: Impor Jadwal Guru\n\n`;
  md += `## Ringkasan\n`;
  md += `Script akan menambahkan penugasan guru (Teacher Class Assignments) berdasarkan file Excel jadwal revisi terbaru.\n`;
  md += `- **Semester Aktif**: ${activeSemester.name}\n`;
  md += `- **Total Penugasan Terbaca**: ${assignments.length}\n`;
  md += `- **Penugasan Siap Diimpor**: ${matched.length}\n\n`;
  
  if (unmatchedTeachers.size > 0 || unmatchedClasses.size > 0) {
      md += `> [!WARNING]\n`;
      md += `> **Ada beberapa data yang tidak cocok dengan database:**\n>\n`;
      if (unmatchedTeachers.size > 0) {
          md += `> **Guru Tidak Ditemukan di Database (Harus dipastikan ejaannya atau ditambahkan profilnya):**\n`;
          Array.from(unmatchedTeachers).forEach(t => md += `> - ${t}\n`);
      }
      if (unmatchedClasses.size > 0) {
          md += `> **Kelas Tidak Ditemukan di Database:**\n`;
          Array.from(unmatchedClasses).forEach(c => md += `> - ${c}\n`);
      }
      md += `\n`;
  }
  
  md += `## Daftar Penugasan yang Akan Diimpor\n\n`;
  md += `| Nama Guru | Mata Pelajaran | Kelas |\n`;
  md += `|-----------|----------------|-------|\n`;
  matched.forEach(m => {
      md += `| ${m.teacher_name} | ${m.subject_name} | ${m.class_name} |\n`;
  });
  
  md += `\n## Open Questions\n`;
  md += `> [!IMPORTANT]\n`;
  md += `> 1. Apakah Anda ingin tetap melanjutkan proses impor untuk ${matched.length} data yang cocok terlebih dahulu?\n`;
  md += `> 2. Untuk guru atau kelas yang tidak ditemukan, apakah Anda ingin mengabaikannya atau menyesuaikan datanya dulu di tabel pengguna/kelas?\n`;
  
  const planPath = "e:\\Coding\\Guru-Cerdas\\data\\plan_output.md";
  fs.writeFileSync(planPath, md);
  
  // Save the matched array to JSON for later execution
  fs.writeFileSync("e:\\Coding\\Guru-Cerdas\\data\\matched_assignments.json", JSON.stringify(matched, null, 2));

  console.log("Analysis and plan generated successfully!");
}

run().catch(console.error);
