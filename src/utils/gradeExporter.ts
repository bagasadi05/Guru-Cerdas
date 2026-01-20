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

export default {
    exportGradesToExcel,
    exportGradesToCSV,
    copyGradesToClipboard,
};
