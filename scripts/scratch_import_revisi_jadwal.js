import ExcelJS from 'exceljs';
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

// Read .env file manually
const envPath = path.resolve('e:/Coding/Guru-Cerdas/.env');
const envContent = fs.readFileSync(envPath, 'utf-8');
const env = {};
envContent.split('\n').forEach(line => {
  const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
  if (match) {
    const key = match[1];
    let value = match[2] || '';
    if (value.startsWith('"') && value.endsWith('"')) {
      value = value.substring(1, value.length - 1);
    } else if (value.startsWith("'") && value.endsWith("'")) {
      value = value.substring(1, value.length - 1);
    }
    env[key] = value.trim();
  }
});

const supabaseUrl = env.VITE_SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Subjects normalization map to comply with UI SUBJECTS
const SUBJECT_MAP = {
  'b inggris': 'Bahasa Inggris',
  'b ing': 'Bahasa Inggris',
  'seni budaya': 'Seni Budaya',
  'sb': 'Seni Budaya',
  'b jawa': 'Bahasa Jawa',
  'asisten tik': 'TIK',
  'tik': 'TIK',
  'b arab': 'Bahasa Arab',
  'barab': 'Bahasa Arab',
  'b indo': 'Bahasa Indonesia',
  'b. indonesia': 'Bahasa Indonesia',
  'bahasa indonesia': 'Bahasa Indonesia',
  'tqa': 'TQA',
  'pjok': 'PJOK',
  'pramuka': 'Pramuka',
  'ekstra': 'Ekstra',
  'mate': 'Matematika',
  'matematika': 'Matematika',
  'akidah': 'Akidah',
  'akidah akhlak': 'Akidah',
  'aa': 'Akidah',
  'fikih': 'Fikih',
  'fik': 'Fikih',
  'ipas': 'IPAS',
  'qurdits': 'Qur\'an Hadits',
  'qh': 'Qur\'an Hadits',
  'qur\'an hadits': 'Qur\'an Hadits',
  'ski': 'SKI',
  'pancasila': 'Pancasila',
  'p pancasila': 'Pancasila',
  'pend pancasila': 'Pancasila',
  'pkn': 'Pancasila',
  'p karakter': 'Pendidikan Karakter'
};

const normalizeSubject = (sub) => {
  if (!sub) return null;
  const clean = sub.toLowerCase().trim();
  return SUBJECT_MAP[clean] || sub.trim();
};

async function run() {
  const semesterId = '18660173-b04a-4334-a5f9-b230891d9b03'; // Ganjil 2026/2027
  console.log(`🚀 Starting Import process with Normalization for Semester ID: ${semesterId}`);

  // 1. Fetch ALL users from user_roles
  const { data: dbTeachers, error: tErr } = await supabase.from('user_roles').select('user_id, full_name');
  if (tErr) throw tErr;

  const { data: dbClasses, error: cErr } = await supabase.from('classes').select('id, name, user_id').is('deleted_at', null);
  if (cErr) throw cErr;

  console.log(`Fetched ${dbTeachers.length} users and ${dbClasses.length} classes from database.`);

  // 2. Helper to find teacher ID
  const findTeacherId = (nameStr) => {
    if (!nameStr) return null;
    const cleanStr = nameStr.toLowerCase()
      .replace(/[^a-z0-9]/g, '')
      .replace('riyadi', 'riadi')
      .replace('setianingrum', 'setyaningrum');

    const found = dbTeachers.find(t => {
      if (!t.full_name) return false;
      const cleanDb = t.full_name.toLowerCase().replace(/[^a-z0-9]/g, '').replace('riyadi', 'riadi').replace('setianingrum', 'setyaningrum');
      return cleanDb.includes(cleanStr) || cleanStr.includes(cleanDb);
    });

    return found ? found.user_id : null;
  };

  // Helper to find class ID
  const findClassId = (classNameStr) => {
    if (!classNameStr) return null;
    const cleanName = classNameStr.toUpperCase().replace(/\s+/g, '');
    const targetName = cleanName.startsWith('KELAS') ? cleanName : `KELAS${cleanName}`;
    
    const found = dbClasses.find(c => {
      const dbClean = c.name.toUpperCase().replace(/\s+/g, '');
      return dbClean === targetName;
    });

    return found ? found.id : null;
  };

  // 3. Read Excel
  const filePath = "e:\\Coding\\Guru-Cerdas\\data\\JADWAL 2627 REVISI (1).xlsx";
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(filePath);

  const sheet = workbook.getWorksheet('PEMBAGIAN MAPEL DAN JP');
  
  let currentTeacher = null;
  let currentSubject = null;

  const recordsToInsert = [];
  const unmatchedTeachers = new Set();
  const unmatchedClasses = new Set();

  sheet.eachRow((row, rowNumber) => {
    if (rowNumber < 4) return;

    const values = row.values;
    if (!values) return;

    const code = values[2] ? values[2].toString().trim() : null;
    const name = values[3] ? values[3].toString().trim() : null;
    const subject = values[4] ? values[4].toString().trim() : null;
    const kelasVal = values[5] ? values[5].toString().trim() : null;

    if (code && name) {
      currentTeacher = name;
    }
    if (subject) {
      currentSubject = subject;
    }

    if (kelasVal && currentTeacher && currentSubject) {
      const classes = kelasVal.split(',').map(c => c.trim());
      for (const cl of classes) {
        if (!cl || cl === 'JUMLAH JAM') continue;

        const teacherId = findTeacherId(currentTeacher);
        const classId = findClassId(cl);
        
        // Clean assistant prefix but keep role as 'subject_teacher' to pass check constraints and RLS
        let cleanSub = currentSubject.toLowerCase().trim();
        if (cleanSub.startsWith('ass ') || cleanSub.startsWith('ass. ') || cleanSub.startsWith('asisten ')) {
          cleanSub = cleanSub.replace(/^(ass\s+|ass\.\s+|asisten\s+)/, '');
        }

        const normSubject = normalizeSubject(cleanSub);

        if (!teacherId) {
          unmatchedTeachers.add(currentTeacher);
          continue;
        }

        if (!classId) {
          unmatchedClasses.add(cl);
          continue;
        }

        recordsToInsert.push({
          teacher_user_id: teacherId,
          class_id: classId,
          semester_id: semesterId,
          assignment_role: 'subject_teacher', // Always 'subject_teacher' to comply with constraints when subject is not null
          subject_name: normSubject
        });
      }
    }
  });

  if (unmatchedTeachers.size > 0) {
    console.warn('⚠️ Warning: Unmatched teachers:', Array.from(unmatchedTeachers));
  }
  if (unmatchedClasses.size > 0) {
    console.warn('⚠️ Warning: Unmatched classes:', Array.from(unmatchedClasses));
  }

  console.log(`Parsed and validated ${recordsToInsert.length} assignments to insert.`);

  // 4. Soft-delete old subject_teacher assignments in this active semester to prevent duplicates/stale data
  console.log('Clearing old subject_teacher assignments in semester Ganjil 2026/2027...');
  const { error: delErr } = await supabase
    .from('teacher_class_assignments')
    .update({ deleted_at: new Date().toISOString() })
    .eq('semester_id', semesterId)
    .eq('assignment_role', 'subject_teacher')
    .is('deleted_at', null);

  if (delErr) {
    console.error('Error clearing old assignments:', delErr.message);
    return;
  }

  // 5. Insert new assignments
  console.log('Inserting new assignments...');
  const batchSize = 50;
  let insertedCount = 0;
  for (let i = 0; i < recordsToInsert.length; i += batchSize) {
    const batch = recordsToInsert.slice(i, i + batchSize);
    const { error: insErr } = await supabase.from('teacher_class_assignments').insert(batch);
    if (insErr) {
      console.error(`Error inserting batch ${i}:`, insErr.message);
    } else {
      insertedCount += batch.length;
    }
  }

  // 6. Ensure Homeroom assignments exist in this active semester
  console.log('Verifying homeroom assignments...');
  const { data: existingHomerooms } = await supabase
    .from('teacher_class_assignments')
    .select('class_id')
    .eq('semester_id', semesterId)
    .eq('assignment_role', 'homeroom')
    .is('deleted_at', null);

  const existingHomeroomClassIds = new Set(existingHomerooms?.map(h => h.class_id) || []);
  const homeroomsToInsert = [];

  for (const c of dbClasses) {
    if (!existingHomeroomClassIds.has(c.id) && c.user_id) {
      homeroomsToInsert.push({
        teacher_user_id: c.user_id,
        class_id: c.id,
        semester_id: semesterId,
        assignment_role: 'homeroom',
        subject_name: null
      });
    }
  }

  if (homeroomsToInsert.length > 0) {
    console.log(`Inserting ${homeroomsToInsert.length} missing homeroom assignments...`);
    const { error: hrErr } = await supabase.from('teacher_class_assignments').insert(homeroomsToInsert);
    if (hrErr) console.error('Error inserting homerooms:', hrErr.message);
    else console.log('Successfully inserted homerooms.');
  }

  console.log(`🎉 IMPORT COMPLETE! Successfully inserted ${insertedCount} subject teacher assignments.`);
}

run().catch(console.error);
