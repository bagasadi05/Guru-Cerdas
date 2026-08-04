import { Client } from 'pg';
import fs from 'fs';
import path from 'path';
import ExcelJS from 'exceljs';
import url from 'url';

const __filename = url.fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function main() {
    console.log("Connecting to Database...");
    const client = new Client({
        connectionString: process.env.SUPABASE_DB_URL,
    });
    
    try {
        await client.connect();
        console.log("Connected to PostgreSQL successfully.");

        // Fetch all classes
        const classesRes = await client.query('SELECT id, name FROM classes WHERE deleted_at IS NULL');
        const classes = classesRes.rows;

        // Fetch all students
        const studentsRes = await client.query('SELECT id, name, class_id FROM students WHERE deleted_at IS NULL');
        const students = studentsRes.rows;

        console.log(`Fetched ${classes.length} classes and ${students.length} students.`);

        const dataDir = path.join(__dirname, '..', 'data');
        const files = fs.readdirSync(dataDir).filter(f => f.endsWith('.xlsx') && !f.startsWith('~'));

        console.log(`\nFound ${files.length} .xlsx files to check.\n`);

        for (const file of files) {
            console.log(`--- Checking File: ${file} ---`);
            
            // Guess class name from filename (e.g. 1A, 2C, 5D, 6B)
            const classMatch = file.match(/\b([1-6][A-Z])\b/i);
            if (!classMatch) {
                console.log(`❌ Could not determine class name from filename: ${file}`);
                continue;
            }
            
            const className = classMatch[1].toUpperCase();
            const possibleNames = [className, `Kelas ${className}`, `KELAS ${className}`];
            const matchingClasses = classes.filter(c => possibleNames.includes(c.name.trim()) || c.name.toUpperCase() === possibleNames[1].toUpperCase());
            
            if (matchingClasses.length === 0) {
                console.log(`❌ Class ${className} not found in Database.`);
                continue;
            }

            const cls = matchingClasses[0]; // just take the first matching if multiple

            const dbStudents = students.filter(s => s.class_id === cls.id);
            console.log(`📋 DB has ${dbStudents.length} students for class ${className}.`);

            // Read Excel file
            const workbook = new ExcelJS.Workbook();
            await workbook.xlsx.readFile(path.join(dataDir, file));
            
            const worksheet = workbook.worksheets[0]; // first sheet
            let allTextCells = [];
            
            // We will map columns to see which column has the most DB students
            const columnMatches = {};

            worksheet.eachRow((row, rowNumber) => {
                row.eachCell((cell, colNumber) => {
                    const val = cell.value ? cell.value.toString().trim() : '';
                    if (val) {
                        allTextCells.push({ val, row: rowNumber, col: colNumber });
                    }
                });
            });

            // Find missing DB students in Excel
            const missingInExcel = [];
            let foundCount = 0;
            
            for (const student of dbStudents) {
                const sName = student.name.toLowerCase();
                let found = false;
                for (const cell of allTextCells) {
                    const cVal = cell.val.toLowerCase();
                    // Substring match
                    if (cVal.includes(sName) || sName.includes(cVal) && cVal.length > 5) {
                        found = true;
                        if (!columnMatches[cell.col]) columnMatches[cell.col] = 0;
                        columnMatches[cell.col]++;
                        break;
                    }
                }
                if (!found) {
                    missingInExcel.push(student.name);
                } else {
                    foundCount++;
                }
            }

            console.log(`✅ Found ${foundCount}/${dbStudents.length} DB students in Excel.`);
            if (missingInExcel.length > 0) {
                console.log(`⚠️ Missing in Excel (${missingInExcel.length}):`);
                missingInExcel.forEach(name => console.log(`   - ${name}`));
            }

            // Guess the 'Name' column
            let bestCol = null;
            let maxMatches = 0;
            for (const col in columnMatches) {
                if (columnMatches[col] > maxMatches) {
                    maxMatches = columnMatches[col];
                    bestCol = parseInt(col);
                }
            }

            if (bestCol !== null && maxMatches > Math.max(1, dbStudents.length * 0.2)) {
                console.log(`🔍 Probable Name Column is Column ${bestCol} (${maxMatches} matches)`);
                
                // Find extra students in this column
                const potentialExtras = [];
                for (const cell of allTextCells) {
                    if (cell.col === bestCol) {
                        const cVal = cell.val.trim();
                        // Ignore short strings, numbers, common headers
                        if (cVal.length < 4) continue;
                        const lowerCVal = cVal.toLowerCase();
                        if (['nama', 'name', 'siswa', 'lengkap'].some(h => lowerCVal.includes(h))) continue;

                        // Check if this cell matches any DB student
                        let isDbStudent = false;
                        for (const student of dbStudents) {
                            const sName = student.name.toLowerCase();
                            if (lowerCVal.includes(sName) || sName.includes(lowerCVal)) {
                                isDbStudent = true;
                                break;
                            }
                        }

                        if (!isDbStudent) {
                            potentialExtras.push(cVal);
                        }
                    }
                }

                if (potentialExtras.length > 0) {
                    console.log(`⚠️ Potential Extra Students in Excel (Not in DB):`);
                    potentialExtras.forEach(e => console.log(`   + ${e}`));
                } else {
                    console.log(`✅ No extra students found in Excel Name column.`);
                }
            } else {
                console.log(`❓ Could not reliably determine Name column (max matches: ${maxMatches})`);
            }
            
            console.log("");
        }

    } catch (e) {
        console.error("Error:", e);
    } finally {
        await client.end();
    }
}

main();
