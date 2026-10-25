import { getExcelJS } from '../../../../../utils/dynamicImports';
import { formatExportDate } from '../../../../../utils/exportFormatUtils';
import { compareEnrollmentsByClassAndName } from '../../extracurricularUtils';
import type { ExportGradesOptions } from './types';
export async function exportGradesExcel(options: ExportGradesOptions): Promise<void> {
    const { selectedExtracurricular, activeSemester, enrollments, gradesMap, gradeDrafts } = options;

    const ExcelJS = await getExcelJS();
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'MI AL IRSYAD KOTA MADIUN';

    const cleanSheetName = selectedExtracurricular.name
        .replace(/[\\/?*:[\]]/g, '')
        .slice(0, 31);
    const ws = workbook.addWorksheet(cleanSheetName || 'Nilai Ekskul');

    const borderAll = {
        top: { style: 'thin' },
        left: { style: 'thin' },
        bottom: { style: 'thin' },
        right: { style: 'thin' },
    } as Partial<import('exceljs').Borders>;
    const fontHeader = {
        bold: true,
        size: 14,
        name: 'Arial',
        color: { argb: 'FFFFFFFF' },
    };
    const fontTitle = { bold: true, size: 12, name: 'Arial' };
    const fontSub = { bold: true, size: 10, name: 'Arial' };

    const totalColumns = 6;
    const currentYear = new Date().getFullYear();
    const semesterName = activeSemester
        ? `${activeSemester.name} (Semester ${activeSemester.semester_number})`
        : 'Semester Ganjil';
    const academicYear = `${currentYear}/${currentYear + 1}`;

    ws.mergeCells(1, 1, 1, totalColumns);
    const titleRow1 = ws.getCell(1, 1);
    titleRow1.value = 'MI AL IRSYAD KOTA MADIUN';
    titleRow1.font = fontHeader;
    titleRow1.alignment = { horizontal: 'center', vertical: 'middle' };
    titleRow1.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FF0F766E' },
    };

    ws.mergeCells(2, 1, 2, totalColumns);
    const titleRow2 = ws.getCell(2, 1);
    titleRow2.value = `DAFTAR NILAI EKSTRAKURIKULER ${selectedExtracurricular.name.toUpperCase()}`;
    titleRow2.font = fontTitle;
    titleRow2.alignment = { horizontal: 'center', vertical: 'middle' };

    ws.mergeCells(3, 1, 3, totalColumns);
    const titleRow3 = ws.getCell(3, 1);
    titleRow3.value = `SEMESTER: ${semesterName.toUpperCase()} - TAHUN PELAJARAN ${academicYear}`;
    titleRow3.font = fontTitle;
    titleRow3.alignment = { horizontal: 'center', vertical: 'middle' };

    ws.mergeCells(4, 1, 4, totalColumns);
    const titleRow4 = ws.getCell(4, 1);
    titleRow4.value = `PEMBINA: ${(selectedExtracurricular.coach_name || '-').toUpperCase()} | TOTAL SISWA: ${enrollments.length}`;
    titleRow4.font = fontSub;
    titleRow4.alignment = { horizontal: 'center', vertical: 'middle' };

    ws.addRow([]);

    const headerRow = ws.getRow(6);
    headerRow.values = ['NO', 'NAMA SISWA', 'KELAS', 'PREDIKAT', 'NILAI', 'DESKRIPSI'];
    headerRow.eachCell({ includeEmpty: true }, (cell, colNumber) => {
        if (colNumber <= totalColumns) {
            cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
            cell.alignment = { horizontal: 'center', vertical: 'middle' };
            cell.border = borderAll;
            if (colNumber <= 3)
                cell.fill = {
                    type: 'pattern',
                    pattern: 'solid',
                    fgColor: { argb: 'FF334155' },
                };
            else if (colNumber === 4 || colNumber === 5)
                cell.fill = {
                    type: 'pattern',
                    pattern: 'solid',
                    fgColor: { argb: 'FFF59E0B' },
                };
            else
                cell.fill = {
                    type: 'pattern',
                    pattern: 'solid',
                    fgColor: { argb: 'FF0284C7' },
                };
        }
    });

    ws.getColumn(1).width = 5;
    ws.getColumn(2).width = 35;
    ws.getColumn(3).width = 12;
    ws.getColumn(4).width = 12;
    ws.getColumn(5).width = 10;
    ws.getColumn(6).width = 40;

    const sortedEnrollments = [...enrollments].sort(compareEnrollmentsByClassAndName);

    sortedEnrollments.forEach((enrollment, index) => {
        const key = `${enrollment.participantType}:${enrollment.participantId}`;
        const grade = gradesMap[key];
        const draft = gradeDrafts[key];
        const resolvedGrade = draft?.grade ?? grade?.grade ?? '-';
        const resolvedScore =
            draft?.score !== undefined && draft.score.trim() !== ''
                ? Number(draft.score.trim())
                : (grade?.score ?? '-');
        const resolvedDesc =
            draft?.description !== undefined && draft.description.trim() !== ''
                ? draft.description.trim()
                : grade?.description || '-';

        const row = ws.addRow([
            index + 1,
            ` ${enrollment.name}`,
            enrollment.className || '-',
            resolvedGrade,
            resolvedScore,
            resolvedDesc,
        ]);

        const fillColor = index % 2 !== 0 ? 'FFF8FAFC' : 'FFFFFFFF';
        row.eachCell({ includeEmpty: true }, (cell, colNumber) => {
            if (colNumber <= totalColumns) {
                cell.border = borderAll;
                cell.fill = {
                    type: 'pattern',
                    pattern: 'solid',
                    fgColor: { argb: fillColor },
                };
                if (
                    colNumber === 1 ||
                    colNumber === 3 ||
                    colNumber === 4 ||
                    colNumber === 5
                ) {
                    cell.alignment = { horizontal: 'center', vertical: 'middle' };
                    if (colNumber >= 4) cell.font = { bold: true };
                } else {
                    cell.alignment = { horizontal: 'left', vertical: 'middle' };
                }
            }
        });
    });

    const lastRow = sortedEnrollments.length + 6;
    const printDateStr = new Date().toLocaleDateString('id-ID', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
    });
    const coachDisplay =
        selectedExtracurricular.coach_name?.trim() ||
        '....................................';

    const sigStartCol = Math.max(1, totalColumns - 2);

    ws.mergeCells(lastRow + 2, sigStartCol, lastRow + 2, totalColumns);
    const sigCell1 = ws.getCell(lastRow + 2, sigStartCol);
    sigCell1.value = `Madiun, ${printDateStr}`;
    sigCell1.alignment = { horizontal: 'center', vertical: 'middle' };

    ws.mergeCells(lastRow + 3, sigStartCol, lastRow + 3, totalColumns);
    const sigCell2 = ws.getCell(lastRow + 3, sigStartCol);
    sigCell2.value = `Pembina Ekstrakurikuler ${selectedExtracurricular.name}`;
    sigCell2.alignment = { horizontal: 'center', vertical: 'middle' };

    ws.mergeCells(lastRow + 6, sigStartCol, lastRow + 6, totalColumns);
    const sigCell3 = ws.getCell(lastRow + 6, sigStartCol);
    sigCell3.value = `( ${coachDisplay} )`;
    sigCell3.font = { bold: true };
    sigCell3.alignment = { horizontal: 'center', vertical: 'middle' };

    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Nilai_${selectedExtracurricular.name.replace(/\s+/g, '_')}_${formatExportDate()}.xlsx`;
    a.click();
    window.URL.revokeObjectURL(url);
}