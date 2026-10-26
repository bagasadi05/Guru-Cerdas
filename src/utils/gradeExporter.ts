import { getXLSX, getExcelJS } from './dynamicImports';
import { formatExportDate } from './exportUtils';

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
        sheetName = 'Rekap Nilai',
        includeStats = true,
        subject = '',
        assessmentName = '',
        className = '',
        date = new Date().toLocaleDateString('id-ID'),
        kkm = 75,
    } = options;

    const ExcelJS = await getExcelJS();
    const wb = new ExcelJS.Workbook();
    wb.creator = 'Portal Guru';
    wb.created = new Date();

    const ws = wb.addWorksheet(sheetName, {
        views: [{ state: 'frozen', ySplit: 8 }],
    });

    const borderThin = {
        top: { style: 'thin' as const, color: { argb: 'FFCBD5E1' } },
        bottom: { style: 'thin' as const, color: { argb: 'FFCBD5E1' } },
        left: { style: 'thin' as const, color: { argb: 'FFCBD5E1' } },
        right: { style: 'thin' as const, color: { argb: 'FFCBD5E1' } },
    };

    // 1. Title Row
    ws.mergeCells('A2:E2');
    const titleCell = ws.getCell('A2');
    titleCell.value = 'REKAPITULASI PENILAIAN SISWA';
    titleCell.font = { name: 'Calibri', size: 14, bold: true, color: { argb: 'FF0F172A' } };
    titleCell.alignment = { horizontal: 'center', vertical: 'middle' };
    ws.getRow(2).height = 24;

    // 2. Metadata Information Block (Rows 4-6)
    ws.getCell('A4').value = 'Mata Pelajaran:';
    ws.getCell('A4').font = { name: 'Calibri', size: 10, bold: true };
    ws.getCell('B4').value = subject || '-';
    ws.getCell('B4').font = { name: 'Calibri', size: 10 };

    ws.getCell('D4').value = 'Tanggal:';
    ws.getCell('D4').font = { name: 'Calibri', size: 10, bold: true };
    ws.getCell('E4').value = date;
    ws.getCell('E4').font = { name: 'Calibri', size: 10 };

    ws.getCell('A5').value = 'Nama Penilaian:';
    ws.getCell('A5').font = { name: 'Calibri', size: 10, bold: true };
    ws.getCell('B5').value = assessmentName || '-';
    ws.getCell('B5').font = { name: 'Calibri', size: 10 };

    ws.getCell('D5').value = 'KKM / KKTP:';
    ws.getCell('D5').font = { name: 'Calibri', size: 10, bold: true };
    ws.getCell('E5').value = kkm;
    ws.getCell('E5').font = { name: 'Calibri', size: 10, bold: true, color: { argb: 'FF059669' } };

    ws.getCell('A6').value = 'Kelas:';
    ws.getCell('A6').font = { name: 'Calibri', size: 10, bold: true };
    ws.getCell('B6').value = className || '-';
    ws.getCell('B6').font = { name: 'Calibri', size: 10 };

    // 3. Table Header Row (Row 8)
    const headerRow = ws.getRow(8);
    headerRow.values = ['No', 'Nama Siswa', 'Nilai', 'Status', 'Catatan'];
    headerRow.height = 22;
    headerRow.eachCell((cell) => {
        cell.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FF047857' }, // Emerald 700
        };
        cell.font = { name: 'Calibri', size: 11, bold: true, color: { argb: 'FFFFFFFF' } };
        cell.alignment = { horizontal: 'center', vertical: 'middle' };
        cell.border = borderThin;
    });

    // 4. Data Rows (Row 9 onwards)
    const startRow = 9;
    const endRow = startRow + Math.max(data.length - 1, 0);

    data.forEach((item, idx) => {
        const rowNum = startRow + idx;
        const row = ws.getRow(rowNum);
        const parsedScore = typeof item.score === 'number' ? item.score : (item.score !== '' && !isNaN(Number(item.score)) ? Number(item.score) : null);
        const hasScore = parsedScore !== null;

        // Dynamic formula for Status: IF(ISNUMBER(C{row}), IF(C{row}>={kkm}, "Tuntas", "Belum Tuntas"), "-")
        const formulaStatus = `IF(ISNUMBER(C${rowNum}), IF(C${rowNum}>=${kkm}, "Tuntas", "Belum Tuntas"), "-")`;
        const calculatedStatus = hasScore ? (parsedScore >= kkm ? 'Tuntas' : 'Belum Tuntas') : '-';

        row.values = [
            idx + 1,
            item.studentName,
            hasScore ? parsedScore : '',
            { formula: formulaStatus, result: calculatedStatus },
            item.notes || '',
        ];

        const isEven = idx % 2 === 0;
        const rowBg = isEven ? 'FFFFFFFF' : 'FFF8FAFC';

        row.eachCell({ includeEmpty: true }, (cell, colNumber) => {
            cell.font = { name: 'Calibri', size: 10.5 };
            cell.border = borderThin;
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: rowBg } };

            if (colNumber === 1) {
                cell.alignment = { horizontal: 'center', vertical: 'middle' };
            } else if (colNumber === 2) {
                cell.alignment = { horizontal: 'left', vertical: 'middle' };
            } else if (colNumber === 3) {
                cell.alignment = { horizontal: 'center', vertical: 'middle' };
                if (hasScore) cell.numFmt = '0.0';
            } else if (colNumber === 4) {
                cell.alignment = { horizontal: 'center', vertical: 'middle' };
                cell.font = {
                    name: 'Calibri',
                    size: 10.5,
                    bold: true,
                    color: { argb: calculatedStatus === 'Tuntas' ? 'FF059669' : calculatedStatus === 'Belum Tuntas' ? 'FFE11D48' : 'FF64748B' },
                };
            } else if (colNumber === 5) {
                cell.alignment = { horizontal: 'left', vertical: 'middle' };
            }
        });
    });

    // AutoFilter on Table Header
    if (data.length > 0) {
        ws.autoFilter = { from: 'A8', to: `E${Math.max(endRow, 8)}` };
    }

    // 5. Summary Statistics Box (native formulas)
    if (includeStats && data.length > 0) {
        const statsStartRow = endRow + 2;

        ws.mergeCells(`A${statsStartRow}:E${statsStartRow}`);
        const statsHeader = ws.getCell(`A${statsStartRow}`);
        statsHeader.value = 'RINGKASAN STATISTIK KELAS';
        statsHeader.font = { name: 'Calibri', size: 10.5, bold: true, color: { argb: 'FF065F46' } };
        statsHeader.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE6F4EA' } };
        statsHeader.alignment = { horizontal: 'left', vertical: 'middle', indent: 1 };
        statsHeader.border = borderThin;

        const statRows: Array<{ label: string; formula: string }> = [
            { label: 'Jumlah Siswa', formula: `COUNTA(B${startRow}:B${endRow})` },
            { label: 'Sudah Dinilai', formula: `COUNT(C${startRow}:C${endRow})` },
            { label: 'Belum Dinilai', formula: `COUNTA(B${startRow}:B${endRow})-COUNT(C${startRow}:C${endRow})` },
            { label: 'Rata-rata Nilai', formula: `IF(COUNT(C${startRow}:C${endRow})>0, ROUND(AVERAGE(C${startRow}:C${endRow}), 1), "-")` },
            { label: 'Nilai Tertinggi', formula: `IF(COUNT(C${startRow}:C${endRow})>0, MAX(C${startRow}:C${endRow}), "-")` },
            { label: 'Nilai Terendah', formula: `IF(COUNT(C${startRow}:C${endRow})>0, MIN(C${startRow}:C${endRow}), "-")` },
            { label: 'Siswa Tuntas', formula: `COUNTIF(D${startRow}:D${endRow}, "Tuntas")` },
            { label: 'Siswa Belum Tuntas', formula: `COUNTIF(D${startRow}:D${endRow}, "Belum Tuntas")` },
            { label: 'Persentase Ketuntasan', formula: `IF(COUNT(C${startRow}:C${endRow})>0, ROUND((COUNTIF(D${startRow}:D${endRow}, "Tuntas")/COUNT(C${startRow}:C${endRow}))*100, 1) & "%", "-")` },
        ];

        statRows.forEach((item, idx) => {
            const r = statsStartRow + 1 + idx;
            ws.mergeCells(`A${r}:C${r}`);
            const labelCell = ws.getCell(`A${r}`);
            labelCell.value = item.label;
            labelCell.font = { name: 'Calibri', size: 10 };
            labelCell.border = borderThin;
            labelCell.alignment = { horizontal: 'left', vertical: 'middle', indent: 1 };

            ws.mergeCells(`D${r}:E${r}`);
            const valCell = ws.getCell(`D${r}`);
            valCell.value = { formula: item.formula };
            valCell.font = { name: 'Calibri', size: 10, bold: true };
            valCell.border = borderThin;
            valCell.alignment = { horizontal: 'center', vertical: 'middle' };
        });
    }

    // Set Column Widths
    ws.getColumn(1).width = 6;
    ws.getColumn(2).width = 34;
    ws.getColumn(3).width = 14;
    ws.getColumn(4).width = 18;
    ws.getColumn(5).width = 30;

    // Download file
    const buffer = await wb.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = filename;
    link.click();
    URL.revokeObjectURL(link.href);
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
    materiValues?: Record<string, string>
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

        // Update B3 (Row index 3, Column index 2 in 1-based index) with Materi (only for PH, not SAT/SAS)
        const materiValue = (!isSas && materiValues) ? materiValues[assessName] : undefined;
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
    const filename = `Nilai_Terkatrol_${className}_${selectedSubject}_${assessmentNameForFile}_${formatExportDate()}.xlsx`.replace(/[\s/]+/g, '_');
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
    materiValues?: Record<string, string>
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
                materiValues
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
                materiValues
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
        materiValues
    );
};

export default {
    exportGradesToExcel,
    exportGradesToCSV,
    copyGradesToClipboard,
    exportGradesWithTemplate,
};
