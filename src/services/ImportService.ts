/**
 * Import Service
 * 
 * Provides functionality for importing data from Excel and CSV files.
 * Includes validation, column mapping, and error reporting.
 * 
 * @module services/ImportService
 * @since 1.0.0
 */

import { getXLSX } from '../utils/dynamicImports';

/**
 * Column mapping configuration
 */
export interface ColumnMapping {
    sourceColumn: string;
    targetField: string;
    required: boolean;
    transform?: (value: any) => any;
}

/**
 * Import validation error
 */
export interface ImportError {
    row: number;
    column: string;
    value: any;
    message: string;
}

/**
 * Parsed row with validation status
 */
export interface ParsedRow {
    rowNumber: number;
    data: Record<string, any>;
    isValid: boolean;
    errors: ImportError[];
}

/**
 * Import result summary
 */
export interface ImportResult {
    success: boolean;
    totalRows: number;
    validRows: number;
    invalidRows: number;
    insertedRows: number;
    skippedRows: number;
    errors: ImportError[];
}

/**
 * Available target fields for student import
 */
export const STUDENT_FIELDS = [
    { key: 'name', label: 'Nama Siswa', required: true },
    { key: 'gender', label: 'Jenis Kelamin', required: true },
    { key: 'class_name', label: 'Nama Kelas', required: false },
    { key: 'access_code', label: 'Kode Akses', required: false },
] as const;

/**
 * Gender value mappings for normalization
 */
const GENDER_MAPPINGS: Record<string, 'Laki-laki' | 'Perempuan'> = {
    'l': 'Laki-laki',
    'laki-laki': 'Laki-laki',
    'laki': 'Laki-laki',
    'male': 'Laki-laki',
    'm': 'Laki-laki',
    'pria': 'Laki-laki',
    'p': 'Perempuan',
    'perempuan': 'Perempuan',
    'female': 'Perempuan',
    'f': 'Perempuan',
    'wanita': 'Perempuan',
};

/**
 * Parse Excel or CSV file and extract data
 */
export const parseFile = async (file: File): Promise<{ headers: string[]; rows: any[][] }> => {
    const XLSX = await getXLSX();
    return new Promise((resolve, reject) => {
        const reader = new FileReader();

        reader.onload = (e) => {
            try {
                const data = e.target?.result;
                const workbook = XLSX.read(data, { type: 'array' });

                // Get first sheet
                const firstSheetName = workbook.SheetNames[0];
                const worksheet = workbook.Sheets[firstSheetName];

                // Convert to JSON with header option
                const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as any[][];

                if (jsonData.length === 0) {
                    reject(new Error('File kosong'));
                    return;
                }

                const headers = (jsonData[0] || []).map(h => String(h || '').trim());
                const rows = jsonData.slice(1).filter(row => row.some(cell => cell !== null && cell !== undefined && cell !== ''));

                resolve({ headers, rows });
            } catch (error) {
                reject(new Error('Gagal membaca file. Pastikan format file benar.'));
            }
        };

        reader.onerror = () => reject(new Error('Gagal membaca file'));
        reader.readAsArrayBuffer(file);
    });
};

/**
 * Auto-detect column mappings based on header names
 */
export const autoDetectMappings = (headers: string[]): ColumnMapping[] => {
    const mappings: ColumnMapping[] = [];

    const namePatterns = ['nama', 'name', 'nama siswa', 'nama lengkap', 'student name'];
    const genderPatterns = ['gender', 'jenis kelamin', 'kelamin', 'jk', 'l/p'];
    const classPatterns = ['kelas', 'class', 'nama kelas', 'class name'];
    const codePatterns = ['kode', 'code', 'kode akses', 'access code', 'nis', 'nisn'];

    headers.forEach(header => {
        const lowerHeader = header.toLowerCase().trim();

        if (namePatterns.some(p => lowerHeader.includes(p))) {
            mappings.push({ sourceColumn: header, targetField: 'name', required: true });
        } else if (genderPatterns.some(p => lowerHeader.includes(p))) {
            mappings.push({
                sourceColumn: header,
                targetField: 'gender',
                required: true,
                transform: normalizeGender,
            });
        } else if (classPatterns.some(p => lowerHeader.includes(p))) {
            mappings.push({ sourceColumn: header, targetField: 'class_name', required: false });
        } else if (codePatterns.some(p => lowerHeader.includes(p))) {
            mappings.push({ sourceColumn: header, targetField: 'access_code', required: false });
        }
    });

    return mappings;
};

/**
 * Normalize gender value
 */
export const normalizeGender = (value: any): 'Laki-laki' | 'Perempuan' | null => {
    if (!value) return null;
    const normalized = String(value).toLowerCase().trim();
    return GENDER_MAPPINGS[normalized] || null;
};

/**
 * Validate a single row of data
 */
export const validateRow = (
    rowData: Record<string, any>,
    rowNumber: number,
    mappings: ColumnMapping[]
): ParsedRow => {
    const errors: ImportError[] = [];
    const data: Record<string, any> = {};

    // Check required fields
    for (const mapping of mappings) {
        const value = rowData[mapping.sourceColumn];
        const transformedValue = mapping.transform ? mapping.transform(value) : value;

        if (mapping.required && (!transformedValue || String(transformedValue).trim() === '')) {
            errors.push({
                row: rowNumber,
                column: mapping.sourceColumn,
                value: value,
                message: `${mapping.targetField} wajib diisi`,
            });
        } else {
            data[mapping.targetField] = transformedValue;
        }
    }

    // Validate specific fields
    if (data.name && data.name.length < 2) {
        errors.push({
            row: rowNumber,
            column: 'name',
            value: data.name,
            message: 'Nama minimal 2 karakter',
        });
    }

    if (data.gender && !['Laki-laki', 'Perempuan'].includes(data.gender)) {
        errors.push({
            row: rowNumber,
            column: 'gender',
            value: data.gender,
            message: 'Jenis kelamin harus "Laki-laki" atau "Perempuan"',
        });
    }

    return {
        rowNumber,
        data,
        isValid: errors.length === 0,
        errors,
    };
};

/**
 * Parse and validate all rows
 */
export const parseAndValidate = (
    headers: string[],
    rows: any[][],
    mappings: ColumnMapping[]
): ParsedRow[] => {
    return rows.map((row, index) => {
        // Convert row array to object using headers
        const rowData: Record<string, any> = {};
        headers.forEach((header, colIndex) => {
            rowData[header] = row[colIndex];
        });

        return validateRow(rowData, index + 2, mappings); // +2 because row 1 is header
    });
};

/**
 * Generate import template with professional styling
 */
export const generateTemplate = async (format: 'xlsx' | 'csv' = 'xlsx'): Promise<Blob> => {
    const TOTAL_ROWS = 30; // Pre-formatted rows for teachers

    if (format === 'csv') {
        const XLSX = await getXLSX();
        // Simple CSV for compatibility
        const templateData = [['Nama Siswa', 'Jenis Kelamin', 'Kelas']];
        for (let i = 1; i <= TOTAL_ROWS; i++) {
            templateData.push(['', '', '']);
        }
        const worksheet = XLSX.utils.aoa_to_sheet(templateData);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, 'Template');
        const excelBuffer = XLSX.write(workbook, { bookType: 'csv', type: 'array' });
        return new Blob([excelBuffer], { type: 'text/csv' });
    }

    // Use ExcelJS for styled XLSX
    const ExcelJS = await import('exceljs');
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'Portal Guru';
    workbook.created = new Date();

    const worksheet = workbook.addWorksheet('Data Siswa', {
        properties: { tabColor: { argb: '4F46E5' } },
        views: [{ state: 'frozen', ySplit: 1 }] // Freeze header row
    });

    // Column widths
    worksheet.columns = [
        { width: 8 },   // A - No
        { width: 35 },  // B - Nama Siswa
        { width: 18 },  // C - Jenis Kelamin
        { width: 12 },  // D - Kelas
    ];

    // === ROW 1: Header (MUST be row 1 for parser compatibility) ===
    const headerRow = worksheet.getRow(1);
    headerRow.values = ['No', 'Nama Siswa', 'Jenis Kelamin', 'Kelas'];
    headerRow.height = 28;
    headerRow.eachCell((cell, colNumber) => {
        if (colNumber <= 4) {
            cell.font = { bold: true, color: { argb: 'FFFFFF' }, size: 11 };
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: '4F46E5' } };
            cell.alignment = { horizontal: 'center', vertical: 'middle' };
            cell.border = {
                top: { style: 'thin', color: { argb: '4338CA' } },
                left: { style: 'thin', color: { argb: '4338CA' } },
                bottom: { style: 'thin', color: { argb: '4338CA' } },
                right: { style: 'thin', color: { argb: '4338CA' } }
            };
        }
    });

    // === DATA ROWS (30 empty rows with formatting) ===
    for (let i = 0; i < TOTAL_ROWS; i++) {
        const dataRow = worksheet.getRow(2 + i); // Start from row 2
        dataRow.values = [i + 1, '', '', ''];
        dataRow.height = 22;

        const isEven = i % 2 === 0;
        dataRow.eachCell((cell, colNumber) => {
            if (colNumber <= 4) {
                cell.fill = {
                    type: 'pattern',
                    pattern: 'solid',
                    fgColor: { argb: isEven ? 'F8FAFC' : 'FFFFFF' }
                };
                cell.border = {
                    top: { style: 'thin', color: { argb: 'E2E8F0' } },
                    left: { style: 'thin', color: { argb: 'E2E8F0' } },
                    bottom: { style: 'thin', color: { argb: 'E2E8F0' } },
                    right: { style: 'thin', color: { argb: 'E2E8F0' } }
                };
                cell.alignment = { vertical: 'middle' };
            }
        });

        // Style row number column
        const noCell = dataRow.getCell(1);
        noCell.alignment = { horizontal: 'center', vertical: 'middle' };
        noCell.font = { color: { argb: '94A3B8' } };

        // Center align for gender and class
        dataRow.getCell(3).alignment = { horizontal: 'center', vertical: 'middle' };
        dataRow.getCell(4).alignment = { horizontal: 'center', vertical: 'middle' };
    }

    // === NOTES SECTION (after data rows) ===
    const notesStartRow = 2 + TOTAL_ROWS + 1; // After data rows + 1 empty row

    worksheet.mergeCells(`A${notesStartRow}:D${notesStartRow}`);
    const notesHeaderCell = worksheet.getCell(`A${notesStartRow}`);
    notesHeaderCell.value = '📌 PETUNJUK PENGISIAN:';
    notesHeaderCell.font = { bold: true, size: 10, color: { argb: '4F46E5' } };
    notesHeaderCell.alignment = { horizontal: 'left', vertical: 'middle' };

    const notes = [
        '• Kolom "Nama Siswa" dan "Jenis Kelamin" WAJIB diisi',
        '• Jenis Kelamin: ketik "L" atau "Laki-laki" untuk laki-laki, "P" atau "Perempuan" untuk perempuan',
        '• Kolom "No" akan diabaikan saat import (hanya untuk penomoran)',
        '• Baris yang kosong (tanpa nama) akan otomatis diabaikan',
    ];

    notes.forEach((note, idx) => {
        worksheet.mergeCells(`A${notesStartRow + 1 + idx}:D${notesStartRow + 1 + idx}`);
        const noteCell = worksheet.getCell(`A${notesStartRow + 1 + idx}`);
        noteCell.value = note;
        noteCell.font = { size: 9, color: { argb: '64748B' } };
        noteCell.alignment = { horizontal: 'left', vertical: 'middle' };
    });

    // Download file
    const buffer = await workbook.xlsx.writeBuffer();
    return new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
};

/**
 * Download template file
 */
export const downloadTemplate = async (format: 'xlsx' | 'csv' = 'xlsx'): Promise<void> => {
    const blob = await generateTemplate(format);
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `template_import_siswa.${format}`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
};

export default {
    parseFile,
    autoDetectMappings,
    normalizeGender,
    validateRow,
    parseAndValidate,
    generateTemplate,
    downloadTemplate,
    STUDENT_FIELDS,
};
