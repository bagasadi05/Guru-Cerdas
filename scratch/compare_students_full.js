import { Client } from 'pg';
import fs from 'fs';
import path from 'path';
import ExcelJS from 'exceljs';
import JSZip from 'jszip';
import url from 'url';

const __filename = url.fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function getClassNameFromFilename(file) {
    // Check for V-C pattern
    const romanMatch = file.match(/\b(I|II|III|IV|V|VI)\s*-\s*([A-Z])\b/i);
    if (romanMatch) {
        const romanToNum = { 'I': '1', 'II': '2', 'III': '3', 'IV': '4', 'V': '5', 'VI': '6' };
        return romanToNum[romanMatch[1].toUpperCase()] + romanMatch[2].toUpperCase();
    }
    // Check for 1A pattern
    const classMatch = file.match(/\b([1-6][A-Z])\b/i);
    if (classMatch) {
        return classMatch[1].toUpperCase();
    }
    return null;
}

async function extractTextFromDocx(filePath) {
    const content = fs.readFileSync(filePath);
    const zip = await JSZip.loadAsync(content);
    const docXml = await zip.file("word/document.xml").async("text");
    // Strip XML tags
    const text = docXml.replace(/<[^>]+>/g, " ");
    return text;
}

async function main() {
    const client = new Client({
        connectionString: process.env.SUPABASE_DB_URL,
    });
    
    try {
        await client.connect();
        const classesRes = await client.query('SELECT id, name FROM classes WHERE deleted_at IS NULL');
        const classes = classesRes.rows;
        const studentsRes = await client.query('SELECT id, name, class_id FROM students WHERE deleted_at IS NULL');
        const students = studentsRes.rows;

        const dataDir = path.join(__dirname, '..', 'data');
        const files = fs.readdirSync(dataDir).filter(f => (f.endsWith('.xlsx') || f.endsWith('.docx')) && !f.startsWith('~'));

        let results = [];

        for (const file of files) {
            const className = getClassNameFromFilename(file);
            if (!className) {
                results.push({ file, status: 'UNKNOWN_CLASS' });
                continue;
            }
            
            const possibleNames = [className, `Kelas ${className}`, `KELAS ${className}`];
            const matchingClasses = classes.filter(c => possibleNames.includes(c.name.trim()) || c.name.toUpperCase() === possibleNames[1].toUpperCase());
            
            if (matchingClasses.length === 0) {
                results.push({ file, className, status: 'NOT_IN_DB' });
                continue;
            }

            const cls = matchingClasses[0];
            const dbStudents = students.filter(s => s.class_id === cls.id);

            let extractedText = "";

            if (file.endsWith('.xlsx')) {
                try {
                    const workbook = new ExcelJS.Workbook();
                    await workbook.xlsx.readFile(path.join(dataDir, file));
                    const worksheet = workbook.worksheets[0];
                    worksheet.eachRow((row) => {
                        row.eachCell((cell) => {
                            extractedText += " " + (cell.value ? cell.value.toString().trim() : "");
                        });
                    });
                } catch (e) {
                    results.push({ file, className, status: 'CORRUPTED' });
                    continue;
                }
            } else if (file.endsWith('.docx')) {
                try {
                    extractedText = await extractTextFromDocx(path.join(dataDir, file));
                } catch (e) {
                    results.push({ file, className, status: 'CORRUPTED_DOCX' });
                    continue;
                }
            }

            const extractedLower = extractedText.toLowerCase();
            let missing = [];
            let foundCount = 0;

            for (const student of dbStudents) {
                const sName = student.name.toLowerCase();
                if (extractedLower.includes(sName)) {
                    foundCount++;
                } else {
                    // Try splitting name to find partial match if full doesn't match? No, stick to full match for accuracy
                    // Allow replacing multiple spaces with single space
                    const normalizedExtracted = extractedLower.replace(/\s+/g, ' ');
                    const normalizedSName = sName.replace(/\s+/g, ' ');
                    if (normalizedExtracted.includes(normalizedSName)) {
                        foundCount++;
                    } else {
                        missing.push(student.name);
                    }
                }
            }

            if (foundCount === dbStudents.length && missing.length === 0) {
                results.push({ file, className, status: 'MATCH', missingCount: 0, total: dbStudents.length });
            } else if (foundCount === 0 && dbStudents.length > 0) {
                results.push({ file, className, status: 'EMPTY_OR_DIFFERENT', missingCount: missing.length, total: dbStudents.length, missingList: missing });
            } else {
                results.push({ file, className, status: 'PARTIAL_MATCH', missingCount: missing.length, total: dbStudents.length, missingList: missing });
            }
        }

        console.log(JSON.stringify(results, null, 2));

    } catch (e) {
        console.error("Error:", e);
    } finally {
        await client.end();
    }
}

main();
