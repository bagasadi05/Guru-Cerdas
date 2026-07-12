import ExcelJS from 'exceljs';
import fs from 'fs';

async function readExcel() {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile('data/Pembagian_Kelas_1_2026_2027.xlsx');
  
  workbook.worksheets.forEach(worksheet => {
    console.log(`\nWorksheet: ${worksheet.name}`);
    let rowCount = 0;
    worksheet.eachRow({ includeEmpty: false }, (row, rowNumber) => {
      if (rowCount < 5) {
        console.log(`Row ${rowNumber}: ${JSON.stringify(row.values)}`);
      }
      rowCount++;
    });
    console.log(`Total non-empty rows: ${rowCount}`);
  });
}

readExcel().catch(console.error);
