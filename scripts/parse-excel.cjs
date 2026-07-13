const ExcelJS = require('exceljs');

async function parseExcel(filePath) {
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.readFile(filePath);
    
    workbook.worksheets.forEach(worksheet => {
        console.log(`\nWorksheet: ${worksheet.name}`);
        worksheet.eachRow((row, rowNumber) => {
            const rowData = row.values.slice(1).map(val => {
                if (val && typeof val === 'object') {
                    if (val.text) return val.text;
                    if (val.richText) return val.richText.map(rt => rt.text).join('');
                }
                return val;
            });
            console.log(`Row ${rowNumber}:`, JSON.stringify(rowData));
        });
    });
}

async function main() {
    console.log('--- 6C ---');
    await parseExcel('e:\\Coding\\Guru-Cerdas\\data\\ABSENSI 6C 2026-2027.xlsx');
    console.log('--- V-C ---');
    await parseExcel('e:\\Coding\\Guru-Cerdas\\data\\DAFTAR PESERTA DIDIK KELAS V-C_T.A 2026-2027.xlsx');
}

main().catch(console.error);
