import ExcelJS from 'exceljs';

async function test() {
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.readFile('./public/Template nilai SAT-SAS.xlsx');
    
    const worksheet = workbook.worksheets[0];
    const cellE7 = worksheet.getCell('E7');
    console.log('E7 value:', cellE7.value);
    console.log('E7 font:', cellE7.font);
    
    const cellE8 = worksheet.getCell('E8');
    console.log('E8 value:', cellE8.value);
    console.log('E8 font:', cellE8.font);
    
    const cellA7 = worksheet.getCell('A7');
    console.log('A7 font:', cellA7.font);
}

test();
