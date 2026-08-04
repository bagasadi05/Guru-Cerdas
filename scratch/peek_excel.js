import ExcelJS from 'exceljs';
import path from 'path';
import url from 'url';

const __filename = url.fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function peek() {
    const filePath = path.join(__dirname, '..', 'data', 'DATA SISWA PER KELAS 2026-2027.xlsx');
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.readFile(filePath);
    
    console.log("Sheets:");
    workbook.eachSheet((worksheet, sheetId) => {
        console.log(`- Sheet ID: ${sheetId}, Name: ${worksheet.name}`);
        let rowCount = 0;
        worksheet.eachRow((row, rowNumber) => {
            if (rowNumber <= 5) {
                console.log(`  Row ${rowNumber}:`, JSON.stringify(row.values));
            }
            rowCount++;
        });
        console.log(`  Total Rows: ${rowCount}\n`);
    });
}
peek().catch(console.error);
