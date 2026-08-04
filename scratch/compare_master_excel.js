import { Client } from 'pg';
import ExcelJS from 'exceljs';
import path from 'path';
import url from 'url';

const __filename = url.fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function main() {
    const client = new Client({
        connectionString: process.env.SUPABASE_DB_URL,
    });
    
    try {
        await client.connect();
        
        // Fetch all classes from DB
        const classesRes = await client.query('SELECT id, name FROM classes WHERE deleted_at IS NULL');
        const classes = classesRes.rows;
        
        // Fetch all students from DB
        const studentsRes = await client.query('SELECT id, name, class_id FROM students WHERE deleted_at IS NULL');
        const students = studentsRes.rows;

        const filePath = path.join(__dirname, '..', 'data', 'DATA SISWA PER KELAS 2026-2027.xlsx');
        const workbook = new ExcelJS.Workbook();
        await workbook.xlsx.readFile(filePath);
        
        let results = [];

        workbook.eachSheet((worksheet, sheetId) => {
            const className = worksheet.name.trim().toUpperCase();
            // Skip sheets that are not class names
            if (!/^[1-6][A-D]$/.test(className)) return;

            const possibleNames = [className, `Kelas ${className}`, `KELAS ${className}`];
            const matchingClasses = classes.filter(c => possibleNames.includes(c.name.trim()) || c.name.toUpperCase() === possibleNames[1].toUpperCase());
            
            if (matchingClasses.length === 0) {
                results.push({ className, status: 'NOT_IN_DB' });
                return;
            }
            const cls = matchingClasses[0];
            const dbStudents = students.filter(s => s.class_id === cls.id);

            let excelStudents = [];
            worksheet.eachRow((row, rowNumber) => {
                if (rowNumber > 3) {
                    let name = null;
                    row.eachCell((cell) => {
                        const val = cell.value ? cell.value.toString().trim() : '';
                        if (val && val.length > 3 && isNaN(val)) {
                            name = val;
                        }
                    });
                    if (name) excelStudents.push(name);
                }
            });

            // Find missing DB students in Excel
            let missingInExcel = [];
            // Find extra students in Excel not in DB
            let extraInExcel = [...excelStudents];

            let foundCount = 0;

            for (const student of dbStudents) {
                const sName = student.name.toLowerCase().replace(/\s+/g, ' ').trim();
                let foundIndex = -1;
                
                for (let i = 0; i < extraInExcel.length; i++) {
                    const eName = extraInExcel[i].toLowerCase().replace(/\s+/g, ' ').trim();
                    if (eName === sName || eName.includes(sName) || sName.includes(eName)) {
                        foundIndex = i;
                        break;
                    }
                }

                if (foundIndex !== -1) {
                    foundCount++;
                    extraInExcel.splice(foundIndex, 1); // Remove from extra
                } else {
                    missingInExcel.push(student.name);
                }
            }

            if (missingInExcel.length === 0 && extraInExcel.length === 0) {
                results.push({ className, status: 'MATCH', total: dbStudents.length });
            } else {
                results.push({ 
                    className, 
                    status: 'DIFFERENT', 
                    dbCount: dbStudents.length, 
                    excelCount: excelStudents.length, 
                    missingInExcel, 
                    extraInExcel 
                });
            }
        });

        console.log(JSON.stringify(results, null, 2));

    } catch (e) {
        console.error("Error:", e);
    } finally {
        await client.end();
    }
}

main();
