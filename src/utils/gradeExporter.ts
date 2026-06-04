import { getXLSX } from './dynamicImports';

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
        average: Math.round((validScores.reduce((a, b) => a + b, 0) / validScores.length) * 10) / 10,
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
export const exportGradesWithTemplate = async (
    listData: any[],
    finalScores: Record<string, string>,
    selectedSubject: string,
    activeAssessmentName: string,
    activeAssessmentsList: string[],
    className: string,
    activeScenario: string
): Promise<void> => {
    const XLSX = await getXLSX();
    
    // 1. Determine template name
    const isSas = activeAssessmentsList.some(name => 
        name.toUpperCase().includes('SAS') || 
        name.toUpperCase().includes('SAT') || 
        name.toUpperCase().includes('AKHIR')
    );
    const templateUrl = isSas ? '/Template nilai SAT-SAS.xlsx' : '/Template nilai PH.xlsx';
    
    // 2. Fetch the template
    const response = await fetch(templateUrl);
    if (!response.ok) {
        throw new Error(`Gagal memuat template: ${response.statusText}`);
    }
    const arrayBuffer = await response.arrayBuffer();
    const workbook = XLSX.read(arrayBuffer, { type: 'array' });
    
    // 3. For each assessment to export, fill in the data
    activeAssessmentsList.forEach(assessName => {
        // Find corresponding sheet
        let sheetName = workbook.SheetNames[0]; // fallback to first sheet
        
        if (!isSas) {
            // Try to match sum number from assessName (e.g. "Sumatif 2" or "PH 2" -> "SUM 2")
            const match = assessName.match(/(\d+)/);
            if (match) {
                const num = match[1];
                const sumSheetName = `SUM ${num}`;
                if (workbook.SheetNames.includes(sumSheetName)) {
                    sheetName = sumSheetName;
                }
            }
        } else {
            // For SAS, match "SAS 1", "SAS 2" etc.
            const match = assessName.match(/(\d+)/);
            if (match) {
                const num = match[1];
                const sasSheetName = `SAS ${num}`;
                if (workbook.SheetNames.includes(sasSheetName)) {
                    sheetName = sasSheetName;
                }
            }
        }
        
        const sheet = workbook.Sheets[sheetName];
        if (!sheet) return;
        
        // Update E2 (Row index 1, Column index 4) with Class and Subject: e.g. "III.B/Bahasa Indonesia"
        const classSubjectRef = XLSX.utils.encode_cell({ r: 1, c: 4 });
        sheet[classSubjectRef] = { t: 's', v: `${className}/${selectedSubject}` };
        
        // Get sheet range
        const range = XLSX.utils.decode_range(sheet['!ref'] || 'A1:A1');
        
        // Loop through rows starting from row 7 (r = 6)
        for (let r = 6; r <= range.e.r; r++) {
            const studentIdCell = sheet[XLSX.utils.encode_cell({ r, c: 1 })]; // Column B
            if (!studentIdCell || !studentIdCell.v) continue;
            
            const studentId = String(studentIdCell.v).trim();
            
            // Find student in listData by ID
            const student = listData.find(s => s.id === studentId);
            if (!student) continue;
            
            // Get score value
            const key = activeAssessmentsList.length > 1 ? `${student.id}_${assessName}` : student.id;
            let scoreValue: number | null = null;
            
            if (finalScores[key] !== undefined && finalScores[key] !== '') {
                scoreValue = Number(finalScores[key]);
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
                const targetCellRef = XLSX.utils.encode_cell({ r, c: 5 }); // Column F
                sheet[targetCellRef] = { t: 'n', v: scoreValue };
            }
        }
    });
    
    // 4. Save workbook
    const filename = `nilai_terkatrol_${selectedSubject}_${activeAssessmentName}.xlsx`.replace(/\s+/g, '_');
    XLSX.writeFile(workbook, filename);
};

export default {
    exportGradesToExcel,
    exportGradesToCSV,
    copyGradesToClipboard,
    exportGradesWithTemplate,
};
