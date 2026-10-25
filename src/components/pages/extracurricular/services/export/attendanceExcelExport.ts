import { supabase } from '../../../../../services/supabase';
import { getExcelJS } from '../../../../../utils/dynamicImports';
import { formatExportDate } from '../../../../../utils/exportFormatUtils';
import {
    parseLocalDate,
    getActiveMeetingDays,
    compareEnrollmentsByClassAndName,
    resolveAttendancePeriod,
    MonthPeriodItem,
} from '../../extracurricularUtils';
import type { ExportAttendanceOptions } from './types';
export async function exportAttendanceExcel(options: ExportAttendanceOptions): Promise<void> {
    const { selectedExtracurricular, enrollments, queryClient } = options;
    const period = resolveAttendancePeriod(options);

    const periodAttendance = await queryClient.fetchQuery({
        queryKey: [
            'export_attendance_period',
            selectedExtracurricular.id,
            period.startDate,
            period.endDate,
        ],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('extracurricular_attendance')
                .select('student_id, extracurricular_student_id, date, status')
                .eq('extracurricular_id', selectedExtracurricular.id)
                .is('deleted_at', null)
                .gte('date', period.startDate)
                .lte('date', period.endDate);
            if (error) throw error;
            return data || [];
        },
    });

    const exportAttendanceMap: Record<string, string> = {};
    const recordedDaysByMonthKey: Record<string, Set<number>> = {};

    periodAttendance?.forEach((record: { student_id: string | null; extracurricular_student_id: string | null; date: string; status: string }) => {
        const id = record.student_id
            ? `student:${record.student_id}`
            : `extracurricular_student:${record.extracurricular_student_id}`;
        exportAttendanceMap[`${id}:${record.date}`] = record.status;

        const { year, month, day } = parseLocalDate(record.date);
        const mKey = `${year}-${month}`;
        if (!recordedDaysByMonthKey[mKey]) {
            recordedDaysByMonthKey[mKey] = new Set<number>();
        }
        recordedDaysByMonthKey[mKey].add(day);
    });

    const activeMeetingDaysByMonth: Record<string, { day: number; dayName: string }[]> = {};
    period.months.forEach((m) => {
        const mKey = `${m.year}-${m.month}`;
        const recordedSet = recordedDaysByMonthKey[mKey] || new Set<number>();
        activeMeetingDaysByMonth[mKey] = getActiveMeetingDays(
            m.year,
            m.month,
            m.daysInMonth,
            selectedExtracurricular.schedule_day,
            recordedSet
        );
    });

    const sortedEnrollments = [...enrollments].sort(compareEnrollmentsByClassAndName);

    const ExcelJS = await getExcelJS();
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'MI AL IRSYAD KOTA MADIUN';

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

    const printDateStr = new Date().toLocaleDateString('id-ID', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
    });
    const coachDisplay =
        selectedExtracurricular.coach_name?.trim() ||
        '....................................';

    // Helper to render single month worksheet
    const renderMonthlyWorksheet = (m: MonthPeriodItem) => {
        const mKey = `${m.year}-${m.month}`;
        const activeMeetingDays = activeMeetingDaysByMonth[mKey] || [];
        const cleanSheetName = `${m.shortMonthName} ${m.year}`
            .replace(/[\\/?*:[\]]/g, '')
            .slice(0, 31);
        const ws = workbook.addWorksheet(cleanSheetName);

        const totalColumns = Math.max(7, 3 + activeMeetingDays.length + 4);
        const summaryStartCol = 4 + activeMeetingDays.length;

        // Title Rows
        ws.mergeCells(1, 1, 1, totalColumns);
        const headerCell = ws.getCell(1, 1);
        headerCell.value = 'MI AL IRSYAD KOTA MADIUN';
        headerCell.font = fontHeader;
        headerCell.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FF0F766E' },
        };
        headerCell.alignment = { horizontal: 'center', vertical: 'middle' };
        ws.getRow(1).height = 28;

        ws.mergeCells(2, 1, 2, totalColumns);
        const titleRow2 = ws.getCell(2, 1);
        titleRow2.value = `DAFTAR HADIR EKSTRAKURIKULER ${selectedExtracurricular.name.toUpperCase()}`;
        titleRow2.font = fontTitle;
        titleRow2.alignment = { horizontal: 'center', vertical: 'middle' };
        ws.getRow(2).height = 20;

        ws.mergeCells(3, 1, 3, totalColumns);
        const titleRow3 = ws.getCell(3, 1);
        titleRow3.value = `BULAN: ${m.monthName.toUpperCase()} ${m.year} - TAHUN PELAJARAN ${period.academicYear}`;
        titleRow3.font = fontSub;
        titleRow3.alignment = { horizontal: 'center', vertical: 'middle' };
        ws.getRow(3).height = 18;

        ws.mergeCells(4, 1, 4, totalColumns);
        const titleRow4 = ws.getCell(4, 1);
        titleRow4.value = `PEMBINA: ${(selectedExtracurricular.coach_name || '-').toUpperCase()} | JADWAL: ${(selectedExtracurricular.schedule_day || '-').toUpperCase()} ${selectedExtracurricular.schedule_time || ''}`;
        titleRow4.font = { italic: true, size: 9, name: 'Arial' };
        titleRow4.alignment = { horizontal: 'center', vertical: 'middle' };
        ws.getRow(4).height = 16;

        // Header Table
        ws.mergeCells(5, 1, 6, 1);
        ws.getCell(5, 1).value = 'NO';
        ws.mergeCells(5, 2, 6, 2);
        ws.getCell(5, 2).value = 'NAMA SISWA';
        ws.mergeCells(5, 3, 6, 3);
        ws.getCell(5, 3).value = 'KELAS';

        if (activeMeetingDays.length > 0) {
            ws.mergeCells(5, 4, 5, 3 + activeMeetingDays.length);
            const tglHdr = ws.getCell(5, 4);
            tglHdr.value = 'TANGGAL PERTEMUAN';
            tglHdr.alignment = { horizontal: 'center', vertical: 'middle' };
            tglHdr.fill = {
                type: 'pattern',
                pattern: 'solid',
                fgColor: { argb: 'FFF59E0B' },
            };
            tglHdr.font = { bold: true, color: { argb: 'FFFFFFFF' } };

            activeMeetingDays.forEach((item, idx) => {
                const c = ws.getCell(6, 4 + idx);
                c.value = `${item.day}\n${item.dayName}`;
                c.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
                c.fill = {
                    type: 'pattern',
                    pattern: 'solid',
                    fgColor: { argb: 'FFFEF3C7' },
                };
                c.font = { bold: true, size: 8 };
            });
        }

        ws.mergeCells(5, summaryStartCol, 5, summaryStartCol + 3);
        const sumHdr = ws.getCell(5, summaryStartCol);
        sumHdr.value = 'JUMLAH';
        sumHdr.alignment = { horizontal: 'center', vertical: 'middle' };
        sumHdr.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FF0284C7' },
        };
        sumHdr.font = { bold: true, color: { argb: 'FFFFFFFF' } };

        ['S', 'I', 'A', 'H'].forEach((code, idx) => {
            const c = ws.getCell(6, summaryStartCol + idx);
            c.value = code;
            c.alignment = { horizontal: 'center', vertical: 'middle' };
            c.fill = {
                type: 'pattern',
                pattern: 'solid',
                fgColor: { argb: 'FFBAE6FD' },
            };
            c.font = { bold: true };
        });

        [5, 6].forEach((rNum) => {
            const r = ws.getRow(rNum);
            r.eachCell({ includeEmpty: true }, (c, col) => {
                if (col <= totalColumns) {
                    c.border = borderAll;
                    if (col <= 3) {
                        c.fill = {
                            type: 'pattern',
                            pattern: 'solid',
                            fgColor: { argb: 'FF334155' },
                        };
                        c.font = { bold: true, color: { argb: 'FFFFFFFF' } };
                        c.alignment = { horizontal: 'center', vertical: 'middle' };
                    }
                }
            });
        });

        ws.getColumn(1).width = 5;
        ws.getColumn(2).width = 32;
        ws.getColumn(3).width = 12;
        for (let i = 0; i < activeMeetingDays.length; i++) {
            ws.getColumn(4 + i).width = 6.5;
        }
        for (let i = 0; i < 4; i++) {
            ws.getColumn(summaryStartCol + i).width = 6;
        }

        sortedEnrollments.forEach((enrollment, index) => {
            const row = ws.addRow([]);
            row.getCell(1).value = index + 1;
            row.getCell(1).alignment = { horizontal: 'center', vertical: 'middle' };
            row.getCell(2).value = ` ${enrollment.name}`;
            row.getCell(2).alignment = { horizontal: 'left', vertical: 'middle' };
            row.getCell(3).value = enrollment.className || '-';
            row.getCell(3).alignment = { horizontal: 'center', vertical: 'middle' };

            const id = `${enrollment.participantType}:${enrollment.participantId}`;
            let s = 0,
                i = 0,
                a = 0,
                h = 0;

            activeMeetingDays.forEach((item, colIdx) => {
                const dateStr = `${m.year}-${String(m.month + 1).padStart(2, '0')}-${String(item.day).padStart(2, '0')}`;
                const status = exportAttendanceMap[`${id}:${dateStr}`] || '';
                const cell = row.getCell(4 + colIdx);
                cell.alignment = { horizontal: 'center', vertical: 'middle' };

                if (status === 'Hadir') {
                    h++;
                    cell.value = 'H';
                    cell.font = { color: { argb: 'FF15803D' }, bold: true };
                } else if (status === 'Sakit') {
                    s++;
                    cell.value = 'S';
                    cell.font = { color: { argb: 'FFB45309' }, bold: true };
                    cell.fill = {
                        type: 'pattern',
                        pattern: 'solid',
                        fgColor: { argb: 'FFFEF3C7' },
                    };
                } else if (status === 'Izin') {
                    i++;
                    cell.value = 'I';
                    cell.font = { color: { argb: 'FF1D4ED8' }, bold: true };
                    cell.fill = {
                        type: 'pattern',
                        pattern: 'solid',
                        fgColor: { argb: 'FFDBEAFE' },
                    };
                } else if (status === 'Alpha') {
                    a++;
                    cell.value = 'A';
                    cell.font = { color: { argb: 'FFB91C1C' }, bold: true };
                    cell.fill = {
                        type: 'pattern',
                        pattern: 'solid',
                        fgColor: { argb: 'FFFEE2E2' },
                    };
                } else {
                    cell.value = '';
                }
            });

            row.getCell(summaryStartCol).value = s;
            row.getCell(summaryStartCol + 1).value = i;
            row.getCell(summaryStartCol + 2).value = a;
            row.getCell(summaryStartCol + 3).value = h;

            const fillColor = index % 2 !== 0 ? 'FFF8FAFC' : 'FFFFFFFF';
            row.eachCell({ includeEmpty: true }, (cell, colNumber) => {
                if (colNumber <= totalColumns) {
                    cell.border = borderAll;
                    if (!cell.fill) {
                        cell.fill = {
                            type: 'pattern',
                            pattern: 'solid',
                            fgColor: { argb: fillColor },
                        };
                    }
                    if (colNumber >= summaryStartCol) {
                        cell.alignment = { horizontal: 'center', vertical: 'middle' };
                        cell.font = { bold: true };
                    }
                }
            });
        });

        const lastRow = sortedEnrollments.length + 7;
        const sigStartCol = Math.max(1, totalColumns - 3);

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
    };

    // Case 1: 1 Bulan (Single Month)
    if (period.months.length === 1) {
        renderMonthlyWorksheet(period.months[0]);
    }
    // Case 2: Bulan - Bulan / Semester
    else {
        // Sheet 1: Rekap Kumulatif
        const summaryWs = workbook.addWorksheet('Rekap Kumulatif');
        const monthCount = period.months.length;
        const totalColumns = 3 + monthCount * 4 + 5;
        const cumStartCol = 4 + monthCount * 4;

        summaryWs.mergeCells(1, 1, 1, totalColumns);
        const headerCell = summaryWs.getCell(1, 1);
        headerCell.value = 'MI AL IRSYAD KOTA MADIUN';
        headerCell.font = fontHeader;
        headerCell.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FF0F766E' },
        };
        headerCell.alignment = { horizontal: 'center', vertical: 'middle' };
        summaryWs.getRow(1).height = 28;

        summaryWs.mergeCells(2, 1, 2, totalColumns);
        const titleRow2 = summaryWs.getCell(2, 1);
        titleRow2.value = `REKAPITULASI PRESENSI EKSTRAKURIKULER ${selectedExtracurricular.name.toUpperCase()}`;
        titleRow2.font = fontTitle;
        titleRow2.alignment = { horizontal: 'center', vertical: 'middle' };
        summaryWs.getRow(2).height = 20;

        summaryWs.mergeCells(3, 1, 3, totalColumns);
        const titleRow3 = summaryWs.getCell(3, 1);
        titleRow3.value = period.titlePeriodText;
        titleRow3.font = fontSub;
        titleRow3.alignment = { horizontal: 'center', vertical: 'middle' };
        summaryWs.getRow(3).height = 18;

        summaryWs.mergeCells(4, 1, 4, totalColumns);
        const titleRow4 = summaryWs.getCell(4, 1);
        titleRow4.value = `PEMBINA: ${(selectedExtracurricular.coach_name || '-').toUpperCase()} | JADWAL: ${(selectedExtracurricular.schedule_day || '-').toUpperCase()} ${selectedExtracurricular.schedule_time || ''} | TOTAL ANGGOTA: ${enrollments.length} SISWA`;
        titleRow4.font = { italic: true, size: 9, name: 'Arial' };
        titleRow4.alignment = { horizontal: 'center', vertical: 'middle' };
        summaryWs.getRow(4).height = 16;

        summaryWs.mergeCells(5, 1, 6, 1);
        summaryWs.getCell(5, 1).value = 'NO';
        summaryWs.mergeCells(5, 2, 6, 2);
        summaryWs.getCell(5, 2).value = 'NAMA SISWA';
        summaryWs.mergeCells(5, 3, 6, 3);
        summaryWs.getCell(5, 3).value = 'KELAS';

        period.months.forEach((m, idx) => {
            const startC = 4 + idx * 4;
            summaryWs.mergeCells(5, startC, 5, startC + 3);
            const cell = summaryWs.getCell(5, startC);
            cell.value = m.monthName.toUpperCase();
            cell.alignment = { horizontal: 'center', vertical: 'middle' };
            cell.fill = {
                type: 'pattern',
                pattern: 'solid',
                fgColor: { argb: 'FFF59E0B' },
            };
            cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };

            ['H', 'S', 'I', 'A'].forEach((code, cIdx) => {
                const subC = summaryWs.getCell(6, startC + cIdx);
                subC.value = code;
                subC.alignment = { horizontal: 'center', vertical: 'middle' };
                subC.fill = {
                    type: 'pattern',
                    pattern: 'solid',
                    fgColor: { argb: 'FFFEF3C7' },
                };
                subC.font = { bold: true, size: 9 };
            });
        });

        summaryWs.mergeCells(5, cumStartCol, 5, cumStartCol + 4);
        const cumHeader = summaryWs.getCell(5, cumStartCol);
        cumHeader.value = 'TOTAL REKAPITULASI';
        cumHeader.alignment = { horizontal: 'center', vertical: 'middle' };
        cumHeader.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FF0284C7' },
        };
        cumHeader.font = { bold: true, color: { argb: 'FFFFFFFF' } };

        ['H', 'S', 'I', 'A', '% Hadir'].forEach((code, cIdx) => {
            const subC = summaryWs.getCell(6, cumStartCol + cIdx);
            subC.value = code;
            subC.alignment = { horizontal: 'center', vertical: 'middle' };
            subC.fill = {
                type: 'pattern',
                pattern: 'solid',
                fgColor: { argb: 'FFBAE6FD' },
            };
            subC.font = { bold: true };
        });

        [5, 6].forEach((rNum) => {
            const r = summaryWs.getRow(rNum);
            r.eachCell({ includeEmpty: true }, (c, col) => {
                if (col <= totalColumns) {
                    c.border = borderAll;
                    if (col <= 3) {
                        c.fill = {
                            type: 'pattern',
                            pattern: 'solid',
                            fgColor: { argb: 'FF334155' },
                        };
                        c.font = { bold: true, color: { argb: 'FFFFFFFF' } };
                        c.alignment = { horizontal: 'center', vertical: 'middle' };
                    }
                }
            });
        });

        summaryWs.getColumn(1).width = 5;
        summaryWs.getColumn(2).width = 30;
        summaryWs.getColumn(3).width = 12;
        for (let c = 4; c < cumStartCol; c++) {
            summaryWs.getColumn(c).width = 6;
        }
        for (let c = cumStartCol; c <= totalColumns; c++) {
            summaryWs.getColumn(c).width = 7.5;
        }

        sortedEnrollments.forEach((enrollment, index) => {
            const row = summaryWs.addRow([]);
            row.getCell(1).value = index + 1;
            row.getCell(1).alignment = { horizontal: 'center', vertical: 'middle' };
            row.getCell(2).value = ` ${enrollment.name}`;
            row.getCell(2).alignment = { horizontal: 'left', vertical: 'middle' };
            row.getCell(3).value = enrollment.className || '-';
            row.getCell(3).alignment = { horizontal: 'center', vertical: 'middle' };

            const id = `${enrollment.participantType}:${enrollment.participantId}`;
            let cumH = 0,
                cumS = 0,
                cumI = 0,
                cumA = 0;

            period.months.forEach((m, idx) => {
                const mKey = `${m.year}-${m.month}`;
                const days = activeMeetingDaysByMonth[mKey] || [];
                let mH = 0,
                    mS = 0,
                    mI = 0,
                    mA = 0;
                days.forEach((item) => {
                    const dateStr = `${m.year}-${String(m.month + 1).padStart(2, '0')}-${String(item.day).padStart(2, '0')}`;
                    const status = exportAttendanceMap[`${id}:${dateStr}`] || '';
                    if (status === 'Hadir') mH++;
                    else if (status === 'Sakit') mS++;
                    else if (status === 'Izin') mI++;
                    else if (status === 'Alpha') mA++;
                });
                cumH += mH;
                cumS += mS;
                cumI += mI;
                cumA += mA;

                const startC = 4 + idx * 4;
                row.getCell(startC).value = mH;
                row.getCell(startC + 1).value = mS;
                row.getCell(startC + 2).value = mI;
                row.getCell(startC + 3).value = mA;
                for (let k = 0; k < 4; k++) {
                    row.getCell(startC + k).alignment = {
                        horizontal: 'center',
                        vertical: 'middle',
                    };
                }
            });

            const totalMeetings = cumH + cumS + cumI + cumA;
            const pct = totalMeetings > 0 ? Math.round((cumH / totalMeetings) * 100) : 0;

            row.getCell(cumStartCol).value = cumH;
            row.getCell(cumStartCol + 1).value = cumS;
            row.getCell(cumStartCol + 2).value = cumI;
            row.getCell(cumStartCol + 3).value = cumA;
            row.getCell(cumStartCol + 4).value = `${pct}%`;

            const fillColor = index % 2 !== 0 ? 'FFF8FAFC' : 'FFFFFFFF';
            row.eachCell({ includeEmpty: true }, (cell, colNumber) => {
                if (colNumber <= totalColumns) {
                    cell.border = borderAll;
                    if (!cell.fill) {
                        cell.fill = {
                            type: 'pattern',
                            pattern: 'solid',
                            fgColor: { argb: fillColor },
                        };
                    }
                    if (colNumber >= cumStartCol) {
                        cell.alignment = { horizontal: 'center', vertical: 'middle' };
                        cell.font = { bold: true };
                    }
                }
            });
        });

        const lastRow = sortedEnrollments.length + 7;
        const sigStartCol = Math.max(1, totalColumns - 4);
        summaryWs.mergeCells(lastRow + 2, sigStartCol, lastRow + 2, totalColumns);
        const sigCell1 = summaryWs.getCell(lastRow + 2, sigStartCol);
        sigCell1.value = `Madiun, ${printDateStr}`;
        sigCell1.alignment = { horizontal: 'center', vertical: 'middle' };

        summaryWs.mergeCells(lastRow + 3, sigStartCol, lastRow + 3, totalColumns);
        const sigCell2 = summaryWs.getCell(lastRow + 3, sigStartCol);
        sigCell2.value = `Pembina Ekstrakurikuler ${selectedExtracurricular.name}`;
        sigCell2.alignment = { horizontal: 'center', vertical: 'middle' };

        summaryWs.mergeCells(lastRow + 6, sigStartCol, lastRow + 6, totalColumns);
        const sigCell3 = summaryWs.getCell(lastRow + 6, sigStartCol);
        sigCell3.value = `( ${coachDisplay} )`;
        sigCell3.font = { bold: true };
        sigCell3.alignment = { horizontal: 'center', vertical: 'middle' };

        if (period.includeMonthlyDetails) {
            period.months.forEach((m) => {
                renderMonthlyWorksheet(m);
            });
        }
    }

    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Presensi_${selectedExtracurricular.name.replace(/\s+/g, '_')}_${period.filePeriodName}_${formatExportDate()}.xlsx`;
    a.click();
    window.URL.revokeObjectURL(url);
}