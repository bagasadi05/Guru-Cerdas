import { createClient } from '@supabase/supabase-js';
import ExcelJS from 'exceljs';
import fs from 'fs';

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing VITE_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

async function run() {
  const filePath = 'e:/Coding/Guru-Cerdas/data/Jadwal_Rapi_2026-07-09 (1).xlsx';
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(filePath);
  
  const sheetGuru = workbook.getWorksheet('Jadwal Mengajar Guru');
  const sheetMapel = workbook.getWorksheet('Jadwal Kelas (Mapel)');
  
  const teacherCodes = {};
  for (let i = 28; i <= 36; i++) {
    const row = sheetGuru.getRow(i).values;
    let code = null;
    for (let j = 1; j < row.length; j++) {
      const val = row[j];
      if (val) {
        if (!code) {
          code = val.toString().trim();
        } else {
          teacherCodes[code] = val.toString().trim();
          code = null;
        }
      }
    }
  }
  
  const { data: users } = await supabase.from('user_roles').select('*').eq('role', 'teacher');
  const { data: classes } = await supabase.from('classes').select('*').is('deleted_at', null);
  const { data: semesters } = await supabase.from('semesters').select('*').eq('is_active', true);
  
  if (!semesters || semesters.length === 0) {
    console.error('No active semester found');
    return;
  }
  const activeSemester = semesters[0];
  
  const normalize = (str) => {
    if (!str) return '';
    return str.toString().toLowerCase().replace(/[^a-z]/g, '');
  };
  const getFirstName = (str) => {
    if (!str) return '';
    const name = str.split(',')[0].split(' ')[0].toLowerCase().replace(/[^a-z]/g, '');
    return name;
  };

  const teacherIdMap = {};
  for (const [code, name] of Object.entries(teacherCodes)) {
    const firstName = getFirstName(name);
    let matchedUser = users?.find(u => {
      const dbName = normalize(u.full_name);
      return dbName.includes(firstName);
    });
    if (matchedUser) {
      teacherIdMap[code] = matchedUser.user_id;
    } else {
      console.warn(`Could not find DB match for teacher: ${name} (code: ${code})`);
    }
  }
  
  const assignments = []; 
  for (let i = 5; i <= 24; i++) { 
    const rowGuru = sheetGuru.getRow(i).values;
    if (!rowGuru || !rowGuru[2]) continue;
    const className = rowGuru[2].toString().trim();
    const expectedDbClassName = `Kelas ${className}`;
    
    let rowMapel = null;
    for (let j = 3; j <= 24; j++) {
      const rm = sheetMapel.getRow(j).values;
      if (rm && rm[1] && rm[1].toString().trim() === className) {
        rowMapel = rm;
        break;
      }
    }
    
    if (!rowMapel) continue;
    
    const matchedClass = classes?.find(c => c.name.toLowerCase() === expectedDbClassName.toLowerCase());
    if (!matchedClass) {
      console.warn(`Class not found in DB: ${expectedDbClassName}`);
      continue;
    }
    
    for (let col = 3; col < rowGuru.length; col++) {
      const guruCodes = rowGuru[col] ? rowGuru[col].toString().split('/') : [];
      const mapelName = rowMapel[col] ? rowMapel[col].toString().trim() : null;
      
      if (guruCodes.length > 0 && mapelName && mapelName !== 'X' && mapelName !== 'P' && mapelName !== 'Istirahat') {
        for (const code of guruCodes) {
          const teacherUserId = teacherIdMap[code.trim()];
          if (teacherUserId) {
            assignments.push({
              class_id: matchedClass.id,
              teacher_user_id: teacherUserId,
              subject_name: mapelName
            });
          }
        }
      }
    }
  }
  
  const uniqueAssignmentsMap = new Map();
  for (const a of assignments) {
    const key = `${a.class_id}-${a.teacher_user_id}-${a.subject_name}`;
    if (!uniqueAssignmentsMap.has(key)) {
      uniqueAssignmentsMap.set(key, {
        teacher_user_id: a.teacher_user_id,
        class_id: a.class_id,
        semester_id: activeSemester.id,
        assignment_role: 'subject_teacher',
        subject_name: a.subject_name,
      });
    }
  }
  
  const newSubjectAssignments = Array.from(uniqueAssignmentsMap.values());
  
  console.log(`Extracted ${newSubjectAssignments.length} unique subject assignments`);
  
  const { data: allExistingAssignments } = await supabase.from('teacher_class_assignments')
    .select('*')
    .eq('semester_id', activeSemester.id)
    .is('deleted_at', null);
    
  console.log(`Found ${allExistingAssignments?.length || 0} existing assignments total in DB`);
  
  // Find classes missing homeroom
  const existingWalas = allExistingAssignments?.filter(a => a.assignment_role === 'homeroom') || [];
  const walasClassIds = new Set(existingWalas.map(w => w.class_id));
  const missingWalasClasses = classes.filter(c => !walasClassIds.has(c.id));
  
  console.log(`Classes missing homeroom assignment: ${missingWalasClasses.map(c => c.name).join(', ')}`);
  
  const walasAssignmentsToInsert = [];
  for (const c of missingWalasClasses) {
    if (c.user_id) {
      walasAssignmentsToInsert.push({
        teacher_user_id: c.user_id,
        class_id: c.id,
        semester_id: activeSemester.id,
        assignment_role: 'homeroom',
        subject_name: null,
      });
    }
  }
  
  // Filter out subject assignments that already exist
  const subjectsToInsert = newSubjectAssignments.filter(nsa => {
    return !allExistingAssignments.some(ea => 
      ea.class_id === nsa.class_id &&
      ea.teacher_user_id === nsa.teacher_user_id &&
      ea.assignment_role === nsa.assignment_role &&
      ea.subject_name?.toLowerCase() === nsa.subject_name?.toLowerCase()
    );
  });
  
  console.log(`Will insert ${walasAssignmentsToInsert.length} new homeroom assignments.`);
  console.log(`Will insert ${subjectsToInsert.length} new subject assignments (filtered from ${newSubjectAssignments.length}).`);
  
  if (walasAssignmentsToInsert.length > 0) {
    const { error: wErr } = await supabase.from('teacher_class_assignments').insert(walasAssignmentsToInsert);
    if (wErr) console.error('Error inserting walas:', wErr.message);
    else console.log('Successfully inserted walas assignments.');
  }

  if (subjectsToInsert.length > 0) {
    // Insert in batches of 100 to avoid limits
    const batchSize = 100;
    for (let i = 0; i < subjectsToInsert.length; i += batchSize) {
      const batch = subjectsToInsert.slice(i, i + batchSize);
      const { error: sErr } = await supabase.from('teacher_class_assignments').insert(batch);
      if (sErr) console.error(`Error inserting subjects batch ${i}:`, sErr.message);
      else console.log(`Successfully inserted subject assignments batch ${i / batchSize + 1}.`);
    }
  }
}

run().catch(console.error);
