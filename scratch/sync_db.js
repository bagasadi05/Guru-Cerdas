import { Client } from 'pg';
import ExcelJS from 'exceljs';
import path from 'path';
import crypto from 'crypto';
import url from 'url';

const __filename = url.fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Replace Greek/Cyrillic lookalikes with Latin letters and normalize quotes
function sanitizeName(name) {
    return name.toString()
        .replace(/Κ/g, 'K') // Greek Kappa
        .replace(/Μ/g, 'M') // Greek Mu
        .replace(/Α/g, 'A') // Greek Alpha
        .replace(/’/g, "'")
        .replace(/\s+/g, ' ')
        .trim();
}

// Simple heuristic for Indonesian names
function guessGender(name) {
    const maleKeywords = ['MUHAMMAD', 'MUH', 'ZAFRAN', 'PUTRA', 'ALVARO', 'RAYHAN', 'GHANI', 'AKMAL'];
    const femaleKeywords = ['BILQIS', 'AZZAHRA', 'ALESHA', 'CLARISHA', 'PUTRI', 'KHANZA', 'CHAYRA'];
    
    for (const w of maleKeywords) {
        if (name.toUpperCase().includes(w)) return 'Laki-laki';
    }
    for (const w of femaleKeywords) {
        if (name.toUpperCase().includes(w)) return 'Perempuan';
    }
    return 'Laki-laki'; // default
}

async function main() {
    const client = new Client({
        connectionString: process.env.SUPABASE_DB_URL,
    });
    
    try {
        await client.connect();
        
        // Classes to sync
        const targetClasses = ['1B', '1C', '3B', '4A', '4C', '5B', '5D'];
        
        const classesRes = await client.query('SELECT id, name, user_id FROM classes WHERE deleted_at IS NULL');
        const classes = classesRes.rows;
        
        const studentsRes = await client.query('SELECT id, name, class_id, gender, user_id FROM students WHERE deleted_at IS NULL');
        const students = studentsRes.rows;

        let fallbackUserId = null;
        if (students.length > 0) {
            fallbackUserId = students[0].user_id;
        }

        const filePath = path.join(__dirname, '..', 'data', 'DATA SISWA PER KELAS 2026-2027.xlsx');
        const workbook = new ExcelJS.Workbook();
        await workbook.xlsx.readFile(filePath);
        
        for (const tClass of targetClasses) {
            console.log(`\n--- Syncing Class ${tClass} ---`);
            const worksheet = workbook.getWorksheet(tClass);
            if (!worksheet) {
                console.log(`Worksheet ${tClass} not found!`);
                continue;
            }

            const cls = classes.find(c => c.name.toUpperCase() === tClass || c.name.toUpperCase() === `KELAS ${tClass}`);
            if (!cls) {
                console.log(`Class ${tClass} not found in DB!`);
                continue;
            }

            const dbStudents = students.filter(s => s.class_id === cls.id);
            const userId = cls.user_id || fallbackUserId;

            let excelStudents = [];
            worksheet.eachRow((row, rowNumber) => {
                if (rowNumber > 3) {
                    let name = null;
                    row.eachCell((cell) => {
                        const val = cell.value ? cell.value.toString().trim() : '';
                        if (val && val.length > 3 && isNaN(val)) {
                            name = sanitizeName(val);
                        }
                    });
                    if (name) excelStudents.push(name);
                }
            });

            // Sync Logic
            // 1. Identify which DB students to keep/update and which to delete
            // 2. Identify which Excel students are new
            
            let matchedDbStudentIds = new Set();
            let matchedExcelIndices = new Set();
            
            for (let i = 0; i < excelStudents.length; i++) {
                const eName = excelStudents[i];
                let matchedStudent = null;
                
                // Exact match first
                matchedStudent = dbStudents.find(s => !matchedDbStudentIds.has(s.id) && sanitizeName(s.name).toUpperCase() === eName.toUpperCase());
                
                // Substring match if no exact
                if (!matchedStudent) {
                    matchedStudent = dbStudents.find(s => {
                        if (matchedDbStudentIds.has(s.id)) return false;
                        const sName = sanitizeName(s.name).toUpperCase();
                        return sName.includes(eName.toUpperCase()) || eName.toUpperCase().includes(sName);
                    });
                }
                
                if (matchedStudent) {
                    matchedDbStudentIds.add(matchedStudent.id);
                    matchedExcelIndices.add(i);
                    // Update name in DB if it slightly differs
                    if (matchedStudent.name !== eName) {
                        await client.query('UPDATE students SET name = $1 WHERE id = $2', [eName, matchedStudent.id]);
                        console.log(`✏️ Updated name: ${matchedStudent.name} -> ${eName}`);
                    }
                }
            }
            
            // Delete DB students not matched
            for (const student of dbStudents) {
                if (!matchedDbStudentIds.has(student.id)) {
                    await client.query('UPDATE students SET deleted_at = NOW() WHERE id = $1', [student.id]);
                    console.log(`🗑️ Soft deleted: ${student.name}`);
                }
            }
            
            // Insert new Excel students not matched
            for (let i = 0; i < excelStudents.length; i++) {
                if (!matchedExcelIndices.has(i)) {
                    const eName = excelStudents[i];
                    const gender = guessGender(eName);
                    const studentId = crypto.randomUUID();
                    await client.query(`
                        INSERT INTO students (id, name, class_id, gender, user_id, created_at)
                        VALUES ($1, $2, $3, $4, $5, NOW())
                    `, [studentId, eName, cls.id, gender, userId]);
                    console.log(`➕ Inserted new student: ${eName} (${gender})`);
                }
            }
        }

    } catch (e) {
        console.error("Error:", e);
    } finally {
        await client.end();
    }
}

main();
