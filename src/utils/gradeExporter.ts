import { getXLSX, getExcelJS } from './dynamicImports';
import { findStudentMatch } from './studentMatcher';

interface ExportGradeData {
    studentName: string;
    studentId: string;
    score: number | string;
    status?: string;
    notes?: string;
}

interface ExportOptions {
    filename?: string;
    sheetName?: string;
    includeStats?: boolean;
    subject?: string;
    assessmentName?: string;
    className?: string;
    date?: string;
    kkm?: number;
}

/**
 * Export grade data to Excel file
 */
export const exportGradesToExcel = async (
    data: ExportGradeData[],
    options: ExportOptions = {}
): Promise<void> => {
    const {
        filename = 'data_nilai.xlsx',
        sheetName = 'Data Nilai',
        includeStats = true,
        subject = '',
        assessmentName = '',
        className = '',
        date = new Date().toLocaleDateString('id-ID'),
        kkm = 75,
    } = options;

    const XLSX = await getXLSX();
    const wb = XLSX.utils.book_new();

    // Prepare main data
    const rows = data.map((item, index) => ({
        'No': index + 1,
        'Nama Siswa': item.studentName,
        'Nilai': item.score === '' ? '-' : item.score,
        'Status': typeof item.score === 'number'
            ? (item.score >= kkm ? 'Tuntas' : 'Belum Tuntas')
            : (item.score && !isNaN(Number(item.score))
                ? (Number(item.score) >= kkm ? 'Tuntas' : 'Belum Tuntas')
                : '-'),
        'Catatan': item.notes || '',
    }));

    // Calculate stats
    const validScores = data
        .map(d => typeof d.score === 'number' ? d.score : parseFloat(String(d.score)))
        .filter(s => !isNaN(s));

    const stats = validScores.length > 0 ? {
        total: data.length,
        filled: validScores.length,
        average: Math.round(validScores.reduce((a, b) => a + b, 0) / validScores.length),
        min: Math.min(...validScores),
        max: Math.max(...validScores),
        aboveKkm: validScores.filter(s => s >= kkm).length,
        belowKkm: validScores.filter(s => s < kkm).length,
    } : null;

    // Create info sheet
    if (includeStats) {
        const infoData = [
            ['LAPORAN NILAI'],
            [''],
            ['Mata Pelajaran', subject],
            ['Nama Penilaian', assessmentName],
            ['Kelas', className],
            ['Tanggal', date],
            ['KKM', kkm],
            [''],
            ['STATISTIK'],
            ['Jumlah Siswa', data.length],
            ['Sudah Dinilai', stats?.filled || 0],
            ['Belum Dinilai', data.length - (stats?.filled || 0)],
            ['Rata-rata', stats?.average || '-'],
            ['Nilai Terendah', stats?.min || '-'],
            ['Nilai Tertinggi', stats?.max || '-'],
            ['Tuntas', stats?.aboveKkm || 0],
            ['Belum Tuntas', stats?.belowKkm || 0],
            ['Persentase Ketuntasan', stats ? `${Math.round((stats.aboveKkm / stats.filled) * 100)}%` : '-'],
        ];

        const infoWs = XLSX.utils.aoa_to_sheet(infoData);
        infoWs['!cols'] = [{ wch: 20 }, { wch: 30 }];
        XLSX.utils.book_append_sheet(wb, infoWs, 'Info');
    }

    // Create data sheet
    const ws = XLSX.utils.json_to_sheet(rows);
    ws['!cols'] = [
        { wch: 5 },   // No
        { wch: 30 },  // Nama
        { wch: 10 },  // Nilai
        { wch: 15 },  // Status
        { wch: 30 },  // Catatan
    ];
    XLSX.utils.book_append_sheet(wb, ws, sheetName);

    // Download
    XLSX.writeFile(wb, filename);
};

/**
 * Export grade data to CSV
 */
export const exportGradesToCSV = async (
    data: ExportGradeData[],
    filename: string = 'data_nilai.csv'
): Promise<void> => {
    const XLSX = await getXLSX();
    const rows = data.map((item, index) => ({
        'No': index + 1,
        'Nama Siswa': item.studentName,
        'Nilai': item.score === '' ? '' : item.score,
        'Catatan': item.notes || '',
    }));

    const ws = XLSX.utils.json_to_sheet(rows);
    const csv = XLSX.utils.sheet_to_csv(ws);

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = filename;
    link.click();
    URL.revokeObjectURL(link.href);
};

/**
 * Copy grades to clipboard as text
 */
export const copyGradesToClipboard = async (
    data: ExportGradeData[],
    format: 'simple' | 'detailed' = 'simple'
): Promise<boolean> => {
    try {
        let text: string;

        if (format === 'simple') {
            text = data
                .filter(d => d.score !== '')
                .map(d => `${d.studentName}: ${d.score}`)
                .join('\n');
        } else {
            text = data
                .map((d, i) => `${i + 1}. ${d.studentName} - ${d.score === '' ? 'Belum dinilai' : d.score}`)
                .join('\n');
        }

        await navigator.clipboard.writeText(text);
        return true;
    } catch {
        return false;
    }
};

/**
 * Export grade data using the school's Excel templates
 */
/**
 * Helper to generate and download a single Excel file using a template
 */
const generateSingleExportFile = async (
    listData: any[],
    finalScores: Record<string, string>,
    selectedSubject: string,
    assessmentNameForFile: string,
    assessmentsList: string[],
    className: string,
    activeScenario: string,
    isSas: boolean,
    kkmValue?: number,
    materiValue?: string
): Promise<void> => {
    const ExcelJS = await getExcelJS();
    const templateUrl = isSas ? '/Template nilai SAT-SAS.xlsx' : '/Template nilai PH.xlsx';
    
    // Fetch the template
    const response = await fetch(templateUrl);
    if (!response.ok) {
        throw new Error(`Gagal memuat template: ${response.statusText}`);
    }
    const arrayBuffer = await response.arrayBuffer();
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(arrayBuffer);
    
    // Clear strikethrough styling which is set by default on templates
    workbook.worksheets.forEach(ws => {
        ws.eachRow((row) => {
            row.eachCell({ includeEmpty: true }, (cell) => {
                if (cell.font) {
                    cell.font = { ...cell.font, strike: false };
                }
            });
        });
    });
    
    const usedSheetNames = new Set<string>();

    // For each assessment to export, fill in the data
    assessmentsList.forEach(assessName => {
        // Find corresponding sheet
        let worksheet = workbook.worksheets[0]; // fallback to first worksheet
        
        if (!isSas) {
            // Try to match sum number from assessName (e.g. "Sumatif 2" or "PH 2" -> "SUM 2")
            const match = assessName.match(/(\d+)/);
            if (match) {
                const num = match[1];
                const sumSheetName = `SUM ${num}`;
                const found = workbook.getWorksheet(sumSheetName);
                if (found) {
                    worksheet = found;
                }
            }
        } else {
            // For SAS, match "SAS 1", "SAS 2" etc.
            const match = assessName.match(/(\d+)/);
            if (match) {
                const num = match[1];
                const sasSheetName = `SAS ${num}`;
                const found = workbook.getWorksheet(sasSheetName);
                if (found) {
                    worksheet = found;
                }
            }
        }
        
        if (!worksheet) return;
        usedSheetNames.add(worksheet.name);
        
        // Update E2 (Row index 2, Column index 5 in 1-based index) with Class and Subject: e.g. "III.B/Bahasa Indonesia"
        worksheet.getCell(2, 5).value = `${className}/${selectedSubject}`;
        
        // Update B2 (Row index 2, Column index 2 in 1-based index) with assessment name: e.g. "SAS 1"
        worksheet.getCell(2, 2).value = assessName;

        // Update B3 (Row index 3, Column index 2 in 1-based index) with Materi
        if (materiValue !== undefined) {
            worksheet.getCell(3, 2).value = materiValue;
        }

        // Update B5 (Row index 5, Column index 2 in 1-based index) with KKTP / KKM
        if (kkmValue !== undefined) {
            worksheet.getCell(5, 2).value = kkmValue;
        }
        
        // Find header row and map column indices dynamically
        let headerRowIndex = 6; // default to Row 6 (1-based)
        let idCol = 2; // Column B (default)
        let _nisCol = 3; // Column C (default)
        let _nisnCol = 4; // Column D (default)
        let nameCol = 5; // Column E (default)
        let nilaiCol = 6; // Column F (default)
        
        // Search rows 3 to 10 to find the header row index
        for (let r = 3; r <= Math.min(10, worksheet.rowCount); r++) {
            let foundHeader = false;
            for (let c = 1; c <= Math.min(15, worksheet.columnCount); c++) {
                const cellVal = worksheet.getCell(r, c).value;
                if (cellVal) {
                    const val = String(cellVal).trim().toLowerCase();
                    if (val.includes('id siswa') || val.includes('id_siswa') || val === 'nama' || val === 'nilai') {
                        headerRowIndex = r;
                        foundHeader = true;
                        break;
                    }
                }
            }
            if (foundHeader) break;
        }
        
        // Map columns in the header row
        const headerRow = worksheet.getRow(headerRowIndex);
        for (let c = 1; c <= worksheet.columnCount; c++) {
            const cellVal = headerRow.getCell(c).value;
            if (cellVal) {
                const val = String(cellVal).trim().toLowerCase();
                if (val.includes('id siswa') || val.includes('id_siswa')) {
                    idCol = c;
                } else if (val === 'nis') {
                    _nisCol = c;
                } else if (val === 'nisn') {
                    _nisnCol = c;
                } else if (val === 'nama' || val.includes('nama siswa') || val.includes('nama lengkap')) {
                    nameCol = c;
                } else if (val === 'nilai') {
                    nilaiCol = c;
                }
            }
        }
        
        // Loop through listData and write them to the rows in the worksheet
        listData.forEach((student, index) => {
            const r = headerRowIndex + 1 + index;
            
            // Set No (column index 1 in 1-based index)
            worksheet.getCell(r, 1).value = index + 1;
            
            // Set ID Siswa
            if (idCol) worksheet.getCell(r, idCol).value = student.id;
            
            // Set NIS
            if (_nisCol && student.nis !== undefined) worksheet.getCell(r, _nisCol).value = student.nis;
            
            // Set NISN
            if (_nisnCol && student.nisn !== undefined) worksheet.getCell(r, _nisnCol).value = student.nisn;
            
            // Set Name
            if (nameCol) worksheet.getCell(r, nameCol).value = student.name;
            
            // Get score value (check compound key first, then fallback to student.id)
            const compoundKey = `${student.id}_${assessName}`;
            const simpleKey = student.id;
            let scoreValue: number | null = null;
            
            if (finalScores[compoundKey] !== undefined && finalScores[compoundKey] !== '') {
                scoreValue = Number(finalScores[compoundKey]);
            } else if (finalScores[simpleKey] !== undefined && finalScores[simpleKey] !== '') {
                scoreValue = Number(finalScores[simpleKey]);
            } else {
                // Fallback to scenario value if not overridden
                const assessData = student.assessments ? student.assessments[assessName] : student;
                if (assessData) {
                    if (activeScenario === 'original' && assessData.original !== null) {
                        scoreValue = assessData.original;
                    } else if (activeScenario === 'formula' && assessData.formula !== null) {
                        scoreValue = assessData.formula;
                    } else if (activeScenario === 'ai' && assessData.ai !== null) {
                        scoreValue = assessData.ai;
                    }
                }
            }
            
            if (scoreValue !== null && !isNaN(scoreValue)) {
                worksheet.getCell(r, nilaiCol).value = scoreValue;
            } else {
                worksheet.getCell(r, nilaiCol).value = '';
            }
        });
        
        // Clear remaining rows in the template
        for (let r = headerRowIndex + 1 + listData.length; r <= worksheet.rowCount; r++) {
            worksheet.getCell(r, 1).value = '';
            if (idCol) worksheet.getCell(r, idCol).value = '';
            if (_nisCol) worksheet.getCell(r, _nisCol).value = '';
            if (_nisnCol) worksheet.getCell(r, _nisnCol).value = '';
            if (nameCol) worksheet.getCell(r, nameCol).value = '';
            if (nilaiCol) worksheet.getCell(r, nilaiCol).value = '';
        }
    });
    
    // Remove unused sheets from the workbook
    if (usedSheetNames.size > 0) {
        const sheetsToDelete: string[] = [];
        workbook.worksheets.forEach(ws => {
            if (!usedSheetNames.has(ws.name)) {
                sheetsToDelete.push(ws.name);
            }
        });
        sheetsToDelete.forEach(name => {
            workbook.removeWorksheet(name);
        });
    }
    
    // Save workbook
    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    const filename = `nilai_terkatrol_${selectedSubject}_${assessmentNameForFile}.xlsx`.replace(/\s+/g, '_');
    link.download = filename;
    link.click();
    URL.revokeObjectURL(link.href);
};

export const exportGradesWithTemplate = async (
    listData: any[],
    finalScores: Record<string, string>,
    selectedSubject: string,
    activeAssessmentName: string,
    activeAssessmentsList: string[],
    className: string,
    activeScenario: string,
    kkmValue?: number,
    materiValue?: string
): Promise<void> => {
    const isSasAssessment = (name: string) => 
        name.toUpperCase().includes('SAS') || 
        name.toUpperCase().includes('SAT') || 
        name.toUpperCase().includes('AKHIR');

    if (activeAssessmentName === '-- Semua Penilaian --') {
        const phList = activeAssessmentsList.filter(name => !isSasAssessment(name));
        const sasList = activeAssessmentsList.filter(name => isSasAssessment(name));

        if (phList.length > 0) {
            await generateSingleExportFile(
                listData,
                finalScores,
                selectedSubject,
                'Semua_PH',
                phList,
                className,
                activeScenario,
                false,
                kkmValue,
                materiValue
            );
        }
        if (sasList.length > 0) {
            await generateSingleExportFile(
                listData,
                finalScores,
                selectedSubject,
                'Semua_SAT_SAS',
                sasList,
                className,
                activeScenario,
                true,
                kkmValue,
                materiValue
            );
        }
        return;
    }

    const isSas = activeAssessmentsList.some(name => isSasAssessment(name));
    await generateSingleExportFile(
        listData,
        finalScores,
        selectedSubject,
        activeAssessmentName,
        activeAssessmentsList,
        className,
        activeScenario,
        isSas,
        kkmValue,
        materiValue
    );
};

export default {
    exportGradesToExcel,
    exportGradesToCSV,
    copyGradesToClipboard,
    exportGradesWithTemplate,
};
