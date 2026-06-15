import { getExcelJS } from './dynamicImports';

// A mock Workbook class
export class WorkbookShim {
    SheetNames: string[] = [];
    Sheets: Record<string, WorksheetShim> = {};
}

// A mock Worksheet class
export class WorksheetShim {
    rows: any[][] = [];
    cols: any[] = [];
    merges: any[] = [];

    get ['!cols']() {
        return this.cols;
    }
    set ['!cols'](value: any[]) {
        this.cols = value;
    }

    get ['!merges']() {
        return this.merges;
    }
    set ['!merges'](value: any[]) {
        this.merges = value;
    }
}

// Shim functions
export const utils = {
    book_new(): WorkbookShim {
        return new WorkbookShim();
    },

    book_append_sheet(workbook: WorkbookShim, worksheet: WorksheetShim, name: string): void {
        workbook.SheetNames.push(name);
        workbook.Sheets[name] = worksheet;
    },

    json_to_sheet(data: any[], options?: any): WorksheetShim {
        const worksheet = new WorksheetShim();
        if (!data || data.length === 0) return worksheet;

        // Extract headers from keys of the first object
        const headers = Object.keys(data[0]);
        worksheet.rows.push(headers);

        // Add rows
        for (const item of data) {
            const row = headers.map(header => item[header]);
            worksheet.rows.push(row);
        }
        return worksheet;
    },

    aoa_to_sheet(data: any[][]): WorksheetShim {
        const worksheet = new WorksheetShim();
        worksheet.rows = data.map(row => [...row]);
        return worksheet;
    },

    sheet_to_json(worksheet: WorksheetShim, options?: any): any[] {
        const headerOption = options?.header;
        if (headerOption === 1) {
            // Return array of arrays
            return worksheet.rows;
        }

        // Return array of objects
        if (worksheet.rows.length === 0) return [];
        const headers = worksheet.rows[0];
        const result: any[] = [];
        for (let i = 1; i < worksheet.rows.length; i++) {
            const row = worksheet.rows[i];
            const obj: any = {};
            headers.forEach((header, index) => {
                obj[header] = row[index] !== undefined ? row[index] : (options?.defval ?? '');
            });
            result.push(obj);
        }
        return result;
    },

    sheet_to_csv(worksheet: WorksheetShim): string {
        return worksheet.rows
            .map(row => 
                row.map(cell => {
                    const str = String(cell ?? '');
                    // Escape quotes and wrap in quotes if contains commas, quotes, or newlines
                    if (str.includes(',') || str.includes('"') || str.includes('\n')) {
                        return `"${str.replace(/"/g, '""')}"`;
                    }
                    return str;
                }).join(',')
            )
            .join('\n');
    }
};

// Reads file data asynchronously using exceljs
export async function read(data: ArrayBuffer | Uint8Array, options?: any): Promise<WorkbookShim> {
    const ExcelJS = await getExcelJS();
    const workbook = new ExcelJS.Workbook();
    
    const arrayBuffer = data instanceof Uint8Array ? data.buffer : data;
    await workbook.xlsx.load(arrayBuffer as any);
    
    const shimWorkbook = new WorkbookShim();
    
    workbook.worksheets.forEach(ws => {
        const shimSheet = new WorksheetShim();
        const rows: any[][] = [];
        
        ws.eachRow({ includeEmpty: true }, (row) => {
            const rowValues = row.values;
            const values: any[] = [];
            if (Array.isArray(rowValues)) {
                // exceljs uses 1-based indexing for rowValues
                // Row values starts at index 1
                for (let i = 1; i < rowValues.length; i++) {
                    const val = rowValues[i];
                    if (val && typeof val === 'object') {
                        if ('result' in val) {
                            values.push(val.result);
                        } else if ('richText' in val && Array.isArray((val as any).richText)) {
                            values.push((val as any).richText.map((rt: any) => rt.text || '').join(''));
                        } else if ('text' in val) {
                            values.push((val as any).text);
                        } else {
                            values.push(JSON.stringify(val));
                        }
                    } else {
                        values.push(val);
                    }
                }
            }
            rows.push(values);
        });
        
        shimSheet.rows = rows;
        shimWorkbook.SheetNames.push(ws.name);
        shimWorkbook.Sheets[ws.name] = shimSheet;
    });
    
    return shimWorkbook;
}

// Writes a workbook to an ArrayBuffer using exceljs (async)
export async function write(workbook: WorkbookShim, options?: any): Promise<ArrayBuffer> {
    const ExcelJS = await getExcelJS();
    const exWorkbook = new ExcelJS.Workbook();
    
    for (const sheetName of workbook.SheetNames) {
        const shimSheet = workbook.Sheets[sheetName];
        const ws = exWorkbook.addWorksheet(sheetName);
        
        // Add rows
        ws.addRows(shimSheet.rows);
        
        // Apply column widths if provided
        if (shimSheet.cols && Array.isArray(shimSheet.cols)) {
            shimSheet.cols.forEach((col, idx) => {
                if (col && col.wch) {
                    const excelCol = ws.getColumn(idx + 1);
                    excelCol.width = col.wch;
                }
            });
        }
        
        // Apply merges if provided
        if (shimSheet.merges && Array.isArray(shimSheet.merges)) {
            shimSheet.merges.forEach(merge => {
                // SheetJS merge format: { s: { r: 0, c: 0 }, e: { r: 0, c: 5 } }
                const startRow = merge.s.r + 1;
                const startCol = merge.s.c + 1;
                const endRow = merge.e.r + 1;
                const endCol = merge.e.c + 1;
                ws.mergeCells(startRow, startCol, endRow, endCol);
            });
        }
    }
    
    if (options?.bookType === 'csv') {
        // Simple CSV export from the first sheet
        const firstSheetName = workbook.SheetNames[0];
        if (!firstSheetName) return new ArrayBuffer(0);
        const csvString = utils.sheet_to_csv(workbook.Sheets[firstSheetName]);
        const encoder = new TextEncoder();
        return encoder.encode(csvString).buffer as ArrayBuffer;
    }
    
    const buffer = await exWorkbook.xlsx.writeBuffer();
    return buffer as any;
}

// Write file to trigger download
export async function writeFile(workbook: WorkbookShim, filename: string): Promise<void> {
    const isCsv = filename.endsWith('.csv');
    const buffer = await write(workbook, { bookType: isCsv ? 'csv' : 'xlsx' });
    const mimeType = isCsv ? 'text/csv' : 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
    
    const blob = new Blob([buffer], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
}
