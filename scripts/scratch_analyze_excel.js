import ExcelJS from 'exceljs';
import path from 'path';
import fs from 'fs';

async function analyzeExcel() {
  const filePath = "e:\\Coding\\Guru-Cerdas\\data\\JADWAL 2627 REVISI (1).xlsx";
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(filePath);
  
  let output = "";
  
  for (const sheet of workbook.worksheets) {
    output += `\n--- Sheet: ${sheet.name} ---\n`;
    
    // Read the first 20 rows to understand the structure
    let rowCount = 0;
    sheet.eachRow((row, rowNumber) => {
      if (rowCount < 20) {
        output += `Row ${rowNumber}: ${JSON.stringify(row.values)}\n`;
        rowCount++;
      }
    });
  }
  
  fs.writeFileSync("e:\\Coding\\Guru-Cerdas\\data\\excel_analysis.txt", output);
  console.log("Analysis complete. Saved to excel_analysis.txt");
}

analyzeExcel().catch(console.error);
