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
            const workbook = await XLSX.read(data, { type: 'array' });

            // Prefer 'Data Nilai', otherwise skip 'Info' if possible
            let sheetName = workbook.SheetNames.find(n => n.toLowerCase().trim() === 'data nilai');
            if (!sheetName) {
                sheetName = workbook.SheetNames.find(n => n.toLowerCase().trim() !== 'info');
            }
            if (!sheetName) {
                sheetName = workbook.SheetNames[0];
            }
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

            // Auto-detect header row if expectedColumns is provided
            let detectedSkipRows = skipRows;
            if (expectedColumns && expectedColumns.length > 0) {
                let bestMatchCount = 0;
                let bestRowIndex = skipRows;

                // Scan the first 15 rows of the sheet
                const scanLimit = Math.min(jsonData.length, skipRows + 15);
                for (let i = skipRows; i < scanLimit; i++) {
                    const row = jsonData[i] || [];
                    let matchCount = 0;

                    expectedColumns.forEach(col => {
                        const patterns = [
                            col.key.toLowerCase(),
                            col.label.toLowerCase(),
                            ...(col.key === 'name' ? ['nama', 'siswa', 'student', 'nama siswa', 'nama lengkap'] : []),
                            ...(col.key === 'score' ? ['nilai', 'score', 'skor', 'poin', 'points', 'grade'] : []),
                            ...(col.key === 'notes' ? ['catatan', 'notes', 'keterangan', 'remarks'] : []),
                        ];

                        const rowValuesLower = row.map((v: any) => String(v ?? '').toLowerCase().trim());
                        const hasMatch = rowValuesLower.some((val: string) => 
                            patterns.includes(val) || 
                            patterns.some(p => val.includes(p) || p.includes(val))
                        );
                        if (hasMatch) {
                            matchCount++;
                        }
                    });

                    if (matchCount > bestMatchCount) {
                        bestMatchCount = matchCount;
                        bestRowIndex = i;
                    }
                }

                // If a row matched at least one expected column header, use it
                if (bestMatchCount > 0) {
                    detectedSkipRows = bestRowIndex;
                }
            }

            // Get headers (first row after skip)
            const headers = (jsonData[detectedSkipRows] || []).map((h: any) => String(h).trim());

            // Get data rows
            const dataRows = jsonData.slice(detectedSkipRows + 1, detectedSkipRows + 1 + maxRows);

            // Convert to objects
            const parsedData: ParsedRow[] = dataRows.map(row => {
                const obj: ParsedRow = {};
                headers.forEach((header, index) => {
                    if (header) {
                        let value = row[index] ?? '';
                        // Normalize comma decimal to dot if it is a string representing a decimal
                        if (typeof value === 'string' && value.trim() !== '') {
                            const normalized = value.trim().replace(',', '.');
                            if (!isNaN(Number(normalized))) {
                                value = normalized;
                            }
                        }
                        obj[header] = value;
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
        await XLSX.writeFile(wb, filename);
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

        // Beautiful Info sheet design
        const infoData = [
            ['========================================================================'],
            ['                PORTAL GURU — MI AL IRSYAD MADIUN                       '],
            ['              TEMPLATE IMPOR NILAI BERBASIS EXCEL                       '],
            ['========================================================================'],
            [''],
            ['DETAIL PENILAIAN AKADEMIK:'],
            ['  Mata Pelajaran', ': ' + subject],
            ['  Jenis Penilaian', ': ' + assessmentName],
            ['  Tanggal Unduh', ': ' + new Date().toLocaleDateString('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })],
            ['  Status Sinkron', ': SIAP DIIMPOR'],
            [''],
            ['PANDUAN PENGISIAN NILAI (MANDATORI):'],
            ['  1. Klik tab "Data Nilai" di bagian bawah berkas ini.'],
            ['  2. Masukkan nilai siswa pada kolom "Nilai" (Skala 0 s/d 100).'],
            ['  3. Anda dapat menginput angka desimal/pecahan jika diperlukan (misal: 85.5 atau 77.75).'],
            ['  4. Kolom "Catatan" bersifat opsional untuk memberikan masukan singkat per siswa.'],
            ['  5. JANGAN mengubah ejaan nama, nomor urut, atau urutan baris siswa.'],
            ['  6. Setelah selesai, simpan berkas ini lalu unggah kembali melalui tombol "Import Excel".'],
            [''],
            ['------------------------------------------------------------------------'],
            ['Portal Guru © 2026 MI Al Irsyad Madiun. Seluruh hak cipta dilindungi.']
        ];
        
        const infoWs = XLSX.utils.aoa_to_sheet(infoData);
        
        // Auto-fit column widths for Info sheet
        infoWs['!cols'] = [
            { wch: 25 }, // Key
            { wch: 60 }  // Value
        ];
        
        XLSX.utils.book_append_sheet(wb, infoWs, 'Info');

        // Data sheet
        const data = students.map((s, index) => ({
            'No': index + 1,
            'Nama Siswa': s.name,
            'Nilai': '',
            'Catatan': '',
        }));

        const ws = XLSX.utils.json_to_sheet(data);
        
        // Adjusted column widths for Data Nilai sheet
        ws['!cols'] = [
            { wch: 6 },   // No
            { wch: 35 },  // Nama Siswa
            { wch: 12 },  // Nilai
            { wch: 35 },  // Catatan
        ];

        XLSX.utils.book_append_sheet(wb, ws, 'Data Nilai');

        await XLSX.writeFile(wb, filename);
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
        'name': ['nama', 'name', 'siswa', 'student', 'nama siswa', 'nama lengkap', 'nama/nisn', 'peserta', 'nama murid'],
        'score': ['nilai', 'score', 'skor', 'poin', 'points', 'grade', 'nilai akhir', 'nilai ph', 'nilai pts', 'nilai pas', 'nilai harian', 'hasil', 'ujicoba', 'uh'],
        'notes': ['catatan', 'notes', 'keterangan', 'remarks', 'deskripsi'],
        'no': ['no', 'nomor', 'number', '#', 'no.'],
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
