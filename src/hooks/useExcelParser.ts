import { useState, useCallback } from 'react';
import { getXLSX } from '../utils/dynamicImports';

export interface ParsedRow {
    [key: string]: string | number;
}

export interface ColumnMapping {
    sourceColumn: string;
    targetColumn: string;
    confidence: number;
}

export interface ParseResult {
    data: ParsedRow[];
    headers: string[];
    suggestedMappings: ColumnMapping[];
    errors: string[];
    totalRows: number;
}

export interface ExcelColumn {
    key: string;
    label: string;
    required?: boolean;
    type?: 'string' | 'number';
}

/**
 * Hook for parsing Excel and CSV files
 */
export const useExcelParser = () => {
    const [isParsing, setIsParsing] = useState(false);
    const [error, setError] = useState<string | null>(null);

    /**
     * Parse Excel or CSV file
     */
    const parse = useCallback(async (
        file: File,
        options: {
            expectedColumns?: ExcelColumn[];
            skipRows?: number;
            maxRows?: number;
        } = {}
    ): Promise<ParseResult> => {
        const { expectedColumns = [], skipRows = 0, maxRows = 1000 } = options;

        setIsParsing(true);
        setError(null);

        try {
            const XLSX = await getXLSX();
            const data = await file.arrayBuffer();
            const workbook = XLSX.read(data, { type: 'array' });

            // Get first sheet
            const sheetName = workbook.SheetNames[0];
            if (!sheetName) {
                throw new Error('File tidak memiliki data');
            }

            const sheet = workbook.Sheets[sheetName];

            // Convert to JSON
            const jsonData: any[][] = XLSX.utils.sheet_to_json(sheet, {
                header: 1,
                defval: '',
                blankrows: false,
            });

            if (jsonData.length === 0) {
                throw new Error('File kosong');
            }

            // Get headers (first row after skip)
            const headers = (jsonData[skipRows] || []).map((h: any) => String(h).trim());

            // Get data rows
            const dataRows = jsonData.slice(skipRows + 1, skipRows + 1 + maxRows);

            // Convert to objects
            const parsedData: ParsedRow[] = dataRows.map(row => {
                const obj: ParsedRow = {};
                headers.forEach((header, index) => {
                    if (header) {
                        obj[header] = row[index] ?? '';
                    }
                });
                return obj;
            }).filter(row => Object.values(row).some(v => v !== ''));

            // Suggest column mappings
            const suggestedMappings = suggestColumnMappings(headers, expectedColumns);

            // Validate
            const errors: string[] = [];
            if (parsedData.length === 0) {
                errors.push('Tidak ada data yang dapat diparse');
            }

            expectedColumns.filter(c => c.required).forEach(col => {
                const mapping = suggestedMappings.find(m => m.targetColumn === col.key);
                if (!mapping || mapping.confidence < 0.5) {
                    errors.push(`Kolom "${col.label}" tidak ditemukan`);
                }
            });

            return {
                data: parsedData,
                headers,
                suggestedMappings,
                errors,
                totalRows: parsedData.length,
            };
        } catch (err: any) {
            const errorMessage = err.message || 'Gagal membaca file';
            setError(errorMessage);
            return {
                data: [],
                headers: [],
                suggestedMappings: [],
                errors: [errorMessage],
                totalRows: 0,
            };
        } finally {
            setIsParsing(false);
        }
    }, []);

    /**
     * Generate Excel template
     */
    const generateTemplate = useCallback(async (
        columns: ExcelColumn[],
        sampleData?: ParsedRow[],
        options: {
            sheetName?: string;
            filename?: string;
        } = {}
    ): Promise<void> => {
        const { sheetName = 'Template', filename = 'template.xlsx' } = options;

        // Dynamically import XLSX
        const XLSX = await getXLSX();

        // Create workbook
        const wb = XLSX.utils.book_new();

        // Create header row
        const headers = columns.map(c => c.label);

        // Create data rows (sample or empty)
        const data = sampleData || [
            // Create one example row
            columns.reduce((acc, col) => {
                acc[col.label] = col.type === 'number' ? 0 : 'Contoh';
                return acc;
            }, {} as ParsedRow)
        ];

        // Create worksheet
        const ws = XLSX.utils.json_to_sheet(data, { header: headers });

        // Set column widths
        const colWidths = columns.map(c => ({ wch: Math.max(c.label.length + 2, 15) }));
        ws['!cols'] = colWidths;

        // Add to workbook
        XLSX.utils.book_append_sheet(wb, ws, sheetName);

        // Download
        XLSX.writeFile(wb, filename);
    }, []);

    /**
     * Generate grade input template with student names
     */
    const generateGradeTemplate = useCallback(async (
        students: { id: string; name: string }[],
        options: {
            subject?: string;
            assessmentName?: string;
            filename?: string;
        } = {}
    ): Promise<void> => {
        const {
            subject = 'Mata Pelajaran',
            assessmentName = 'Penilaian',
            filename = 'template_nilai.xlsx'
        } = options;

        const XLSX = await getXLSX();
        const wb = XLSX.utils.book_new();

        // Info sheet
        const infoData = [
            ['Mata Pelajaran', subject],
            ['Nama Penilaian', assessmentName],
            ['Tanggal', new Date().toLocaleDateString('id-ID')],
            [''],
            ['Petunjuk:'],
            ['1. Isi nilai pada kolom "Nilai" (0-100)'],
            ['2. Jangan mengubah nama siswa'],
            ['3. Simpan file dan upload kembali'],
        ];
        const infoWs = XLSX.utils.aoa_to_sheet(infoData);
        XLSX.utils.book_append_sheet(wb, infoWs, 'Info');

        // Data sheet
        const data = students.map((s, index) => ({
            'No': index + 1,
            'Nama Siswa': s.name,
            'Nilai': '',
            'Catatan': '',
        }));

        const ws = XLSX.utils.json_to_sheet(data);
        ws['!cols'] = [
            { wch: 5 },  // No
            { wch: 30 }, // Nama
            { wch: 10 }, // Nilai
            { wch: 30 }, // Catatan
        ];

        XLSX.utils.book_append_sheet(wb, ws, 'Data Nilai');

        XLSX.writeFile(wb, filename);
    }, []);

    return {
        parse,
        generateTemplate,
        generateGradeTemplate,
        isParsing,
        error,
    };
};

/**
 * Suggest column mappings based on header similarity
 */
function suggestColumnMappings(
    sourceHeaders: string[],
    targetColumns: ExcelColumn[]
): ColumnMapping[] {
    const mappings: ColumnMapping[] = [];

    const similarityPatterns: Record<string, string[]> = {
        'name': ['nama', 'name', 'siswa', 'student', 'nama siswa', 'nama lengkap'],
        'score': ['nilai', 'score', 'skor', 'poin', 'points', 'grade'],
        'notes': ['catatan', 'notes', 'keterangan', 'remarks'],
        'no': ['no', 'nomor', 'number', '#'],
    };

    targetColumns.forEach(target => {
        let bestMatch = '';
        let bestConfidence = 0;

        const patterns = similarityPatterns[target.key] || [target.key, target.label.toLowerCase()];

        sourceHeaders.forEach(header => {
            const headerLower = header.toLowerCase().trim();

            patterns.forEach(pattern => {
                let confidence = 0;

                if (headerLower === pattern) {
                    confidence = 1.0;
                } else if (headerLower.includes(pattern) || pattern.includes(headerLower)) {
                    confidence = 0.8;
                } else if (headerLower.split(' ').some(w => pattern.includes(w))) {
                    confidence = 0.5;
                }

                if (confidence > bestConfidence) {
                    bestConfidence = confidence;
                    bestMatch = header;
                }
            });
        });

        mappings.push({
            sourceColumn: bestMatch,
            targetColumn: target.key,
            confidence: bestConfidence,
        });
    });

    return mappings;
}

export default useExcelParser;
