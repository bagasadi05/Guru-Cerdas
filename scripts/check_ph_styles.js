import ExcelJS from 'exceljs';

async function test() {
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.readFile('./public/Template nilai PH.xlsx');
    
    const worksheet = workbook.worksheets[0];
    const cellE7 = worksheet.getCell('E7');
    console.log('PH E7 value:', cellE7.value);
    console.log('PH E7 font:', cellE7.font);
}

test();
