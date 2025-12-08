/**
 * Import Service
 * 
 * Provides functionality for importing data from Excel and CSV files.
 * Includes validation, column mapping, and error reporting.
 * 
 * @module services/ImportService
 * @since 1.0.0
 */

import * as XLSX from 'xlsx';

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
 * Generate import template
 */
export const generateTemplate = (format: 'xlsx' | 'csv' = 'xlsx'): Blob => {
    const templateData = [
        ['Nama Siswa', 'Jenis Kelamin', 'Kelas', 'Kode Akses'],
        ['Ahmad Rizki', 'Laki-laki', '7A', ''],
        ['Siti Rahma', 'Perempuan', '7A', ''],
        ['Budi Santoso', 'L', '7B', ''],
    ];

    const worksheet = XLSX.utils.aoa_to_sheet(templateData);

    // Set column widths
    worksheet['!cols'] = [
        { wch: 25 }, // Nama
        { wch: 15 }, // Gender
        { wch: 10 }, // Kelas
        { wch: 12 }, // Kode
    ];

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Template');

    const excelBuffer = XLSX.write(workbook, {
        bookType: format === 'csv' ? 'csv' : 'xlsx',
        type: 'array'
    });

    const mimeType = format === 'csv'
        ? 'text/csv'
        : 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

    return new Blob([excelBuffer], { type: mimeType });
};

/**
 * Download template file
 */
export const downloadTemplate = (format: 'xlsx' | 'csv' = 'xlsx'): void => {
    const blob = generateTemplate(format);
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
