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
    transform?: (value: unknown) => unknown;
}

/**
 * Import validation error
 */
export interface ImportError {
    row: number;
    column: string;
    value: unknown;
    message: string;
}

/**
 * Parsed row with validation status
 */
export interface ParsedRow {
    rowNumber: number;
    data: Record<string, unknown>;
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
    l: 'Laki-laki',
    'laki-laki': 'Laki-laki',
    laki: 'Laki-laki',
    male: 'Laki-laki',
    m: 'Laki-laki',
    pria: 'Laki-laki',
    p: 'Perempuan',
    perempuan: 'Perempuan',
    female: 'Perempuan',
    f: 'Perempuan',
    wanita: 'Perempuan',
};

/**
 * Parse Excel or CSV file and extract data
 */
export const parseFile = async (file: File): Promise<{ headers: string[]; rows: unknown[][] }> => {
    const XLSX = await getXLSX();
    return new Promise((resolve, reject) => {
        const reader = new FileReader();

        reader.onload = (e) => {
            try {
                const data = e.target?.result;
                const workbook = XLSX.read(data, { type: 'array' });

                const firstSheetName = workbook.SheetNames[0];
                const worksheet = workbook.Sheets[firstSheetName];
                const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as unknown[][];

                if (jsonData.length === 0) {
                    reject(new Error('File kosong'));
                    return;
                }

                const headers = (jsonData[0] || []).map((header) => String(header || '').trim());
                const rows = jsonData
                    .slice(1)
                    .filter((row) => row.some((cell) => cell !== null && cell !== undefined && cell !== ''));

                resolve({ headers, rows });
            } catch {
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

    headers.forEach((header) => {
        const lowerHeader = header.toLowerCase().trim();

        if (namePatterns.some((pattern) => lowerHeader.includes(pattern))) {
            mappings.push({ sourceColumn: header, targetField: 'name', required: true });
        } else if (genderPatterns.some((pattern) => lowerHeader.includes(pattern))) {
            mappings.push({
                sourceColumn: header,
                targetField: 'gender',
                required: true,
                transform: normalizeGender,
            });
        } else if (classPatterns.some((pattern) => lowerHeader.includes(pattern))) {
            mappings.push({ sourceColumn: header, targetField: 'class_name', required: false });
        } else if (codePatterns.some((pattern) => lowerHeader.includes(pattern))) {
            mappings.push({ sourceColumn: header, targetField: 'access_code', required: false });
        }
    });

    return mappings;
};

/**
 * Normalize gender value
 */
export const normalizeGender = (value: unknown): 'Laki-laki' | 'Perempuan' | null => {
    if (!value) return null;
    const normalized = String(value).toLowerCase().trim();
    return GENDER_MAPPINGS[normalized] || null;
};

/**
 * Validate a single row of data
 */
export const validateRow = (
    rowData: Record<string, unknown>,
    rowNumber: number,
    mappings: ColumnMapping[]
): ParsedRow => {
    const errors: ImportError[] = [];
    const data: Record<string, unknown> = {};

    for (const mapping of mappings) {
        const value = rowData[mapping.sourceColumn];
        const transformedValue = mapping.transform ? mapping.transform(value) : value;

        if (mapping.required && (!transformedValue || String(transformedValue).trim() === '')) {
            errors.push({
                row: rowNumber,
                column: mapping.sourceColumn,
                value,
                message: `${mapping.targetField} wajib diisi`,
            });
        } else {
            data[mapping.targetField] = transformedValue;
        }
    }

    if (typeof data.name === 'string' && data.name.length < 2) {
        errors.push({
            row: rowNumber,
            column: 'name',
            value: data.name,
            message: 'Nama minimal 2 karakter',
        });
    }

    if (typeof data.gender === 'string' && !['Laki-laki', 'Perempuan'].includes(data.gender)) {
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
    rows: unknown[][],
    mappings: ColumnMapping[]
): ParsedRow[] => {
    return rows.map((row, index) => {
        const rowData: Record<string, unknown> = {};
        headers.forEach((header, colIndex) => {
            rowData[header] = row[colIndex];
        });

        return validateRow(rowData, index + 2, mappings);
    });
};

/**
 * Generate import template
 */
export const generateTemplate = async (format: 'xlsx' | 'csv' = 'xlsx'): Promise<Blob> => {
    const TOTAL_ROWS = 30;
    const XLSX = await getXLSX();
    const templateData: string[][] = [['No', 'Nama Siswa', 'Jenis Kelamin', 'Kelas']];

    for (let i = 1; i <= TOTAL_ROWS; i++) {
        templateData.push([String(i), '', '', '']);
    }

    templateData.push([]);
    templateData.push(['PETUNJUK PENGISIAN:']);
    templateData.push(['- Kolom "Nama Siswa" dan "Jenis Kelamin" wajib diisi']);
    templateData.push(['- Jenis Kelamin: isi "L" / "Laki-laki" atau "P" / "Perempuan"']);
    templateData.push(['- Kolom "No" hanya untuk penomoran dan akan diabaikan saat import']);
    templateData.push(['- Baris kosong tanpa nama akan otomatis diabaikan']);

    const worksheet = XLSX.utils.aoa_to_sheet(templateData);
    worksheet['!cols'] = [
        { wch: 8 },
        { wch: 35 },
        { wch: 18 },
        { wch: 12 },
    ];

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, format === 'csv' ? 'Template' : 'Data Siswa');

    if (format === 'csv') {
        const csvBuffer = XLSX.write(workbook, { bookType: 'csv', type: 'array' });
        return new Blob([csvBuffer], { type: 'text/csv' });
    }

    const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
    return new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
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
