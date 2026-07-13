import ExcelJS from 'exceljs';

async function inspectExcel() {
  const workbook = new ExcelJS.Workbook();
  const filePath = 'e:/Coding/Guru-Cerdas/data/Jadwal_Rapi_2026-07-09 (1).xlsx';
  await workbook.xlsx.readFile(filePath);
  
  const sheet = workbook.getWorksheet('Jadwal Mengajar Guru');
  sheet.eachRow((row, rowNumber) => {
    // Only print rows that might contain the legend
    if (rowNumber > 25) {
      console.log(`Row ${rowNumber}:`, JSON.stringify(row.values));
    }
  });
}

inspectExcel().catch(console.error);
