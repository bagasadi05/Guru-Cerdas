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

async function run() {
  const filePath = "e:\\Coding\\Guru-Cerdas\\data\\JADWAL 2627 REVISI (1).xlsx";
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(filePath);

  const sheet = workbook.getWorksheet('PEMBAGIAN MAPEL DAN JP');
  
  let currentTeacher = null;
  let currentSubject = null;
  let currentCode = null;

  const parsedAssignments = [];

  sheet.eachRow((row, rowNumber) => {
    if (rowNumber < 4) return; // Skip headers

    const values = row.values;
    if (!values) return;

    // Check if new teacher code exists in column 2 (index 2)
    const code = values[2] ? values[2].toString().trim() : null;
    const name = values[3] ? values[3].toString().trim() : null;
    const subject = values[4] ? values[4].toString().trim() : null;
    const kelasVal = values[5] ? values[5].toString().trim() : null;

    if (code && name) {
      currentCode = code;
      currentTeacher = name;
    }
    if (subject) {
      currentSubject = subject;
    }

    if (kelasVal && currentTeacher && currentSubject) {
      // Split classes if multiple (e.g. "5B, 5C" or similar, though usually it's single per row)
      const classes = kelasVal.split(',').map(c => c.trim());
      for (const cl of classes) {
        if (cl && cl !== 'JUMLAH JAM') {
          parsedAssignments.push({
            code: currentCode,
            teacher: currentTeacher,
            subject: currentSubject,
            class: cl
          });
        }
      }
    }
  });

  console.log(`Successfully parsed ${parsedAssignments.length} assignments from Excel.`);
  console.log(JSON.stringify(parsedAssignments.slice(0, 15), null, 2));
}

run().catch(console.error);
