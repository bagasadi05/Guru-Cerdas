import { QueryClient } from '@tanstack/react-query';
import { supabase } from '../../../../services/supabase';
import { getJsPDF, getAutoTable, getExcelJS } from '../../../../utils/dynamicImports';
import { addPdfHeader, ensureLogosLoaded } from '../../../../utils/pdfHeaderUtils';
import { formatExportDate } from '../../../../utils/exportFormatUtils';
import {
    Extracurricular,
    EnrollmentView,
    ExtracurricularGrade,
} from '../types';
import {
    parseLocalDate,
    getActiveMeetingDays,
    GradeDraft,
    compareEnrollmentsByClassAndName,
    resolveAttendancePeriod,
    AttendanceExportPeriodConfig,
    MonthPeriodItem,
} from '../extracurricularUtils';
import type { CellHookData, RowInput, CellInput } from 'jspdf-autotable';

interface AutoTableDoc {
    lastAutoTable?: { finalY: number };
}

export interface ExportAttendanceOptions extends AttendanceExportPeriodConfig {
    selectedExtracurricular: Extracurricular;
    selectedDate?: string;
    enrollments: EnrollmentView[];
    queryClient: QueryClient;
}

export interface ExportGradesOptions {
    selectedExtracurricular: Extracurricular;
    activeSemester: { name: string; semester_number: number } | null;
    enrollments: EnrollmentView[];
    gradesMap: Record<string, ExtracurricularGrade>;
    gradeDrafts: Record<string, GradeDraft>;
}

/**
 * Exports extracurricular attendance report to PDF format (Supports 1 Bulan, Bulan - Bulan, and Semester).
 */
export async function exportAttendancePDF(options: ExportAttendanceOptions): Promise<void> {
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

    const { default: jsPDF } = await getJsPDF();
    const { default: autoTable } = await getAutoTable();
    const doc = new jsPDF('l', 'mm', 'a4');
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();

    await ensureLogosLoaded();

    const printDateStr = new Date().toLocaleDateString('id-ID', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
    });
    const coachDisplay =
        selectedExtracurricular.coach_name?.trim() ||
        '....................................';

    // Helper to draw single month attendance page into doc
    const drawSingleMonthPage = (m: MonthPeriodItem) => {
        const mKey = `${m.year}-${m.month}`;
        const activeMeetingDays = activeMeetingDaysByMonth[mKey] || [];

        const headerY = addPdfHeader(doc, {
            schoolName: 'MI AL IRSYAD KOTA MADIUN',
            orientation: 'landscape',
        });

        const titleText = `DAFTAR HADIR EKSTRAKURIKULER ${selectedExtracurricular.name.toUpperCase()}`;
        const subText = `BULAN: ${m.monthName.toUpperCase()} ${m.year} - TAHUN PELAJARAN ${period.academicYear}`;
        const infoText = `PEMBINA: ${(selectedExtracurricular.coach_name || '-').toUpperCase()} • JADWAL: ${(selectedExtracurricular.schedule_day || '-').toUpperCase()} ${selectedExtracurricular.schedule_time || ''}`;

        doc.setFontSize(11);
        doc.setFont('helvetica', 'bold');
        doc.text(titleText, pageWidth / 2, headerY - 1, { align: 'center' });
        doc.setFontSize(8.5);
        doc.setFont('helvetica', 'normal');
        doc.text(subText, pageWidth / 2, headerY + 3.5, { align: 'center' });
        doc.setFontSize(8);
        doc.text(infoText, pageWidth / 2, headerY + 7.5, { align: 'center' });

        doc.setDrawColor(15, 118, 110);
        doc.setLineWidth(0.4);
        doc.line(14, headerY + 10.5, pageWidth - 14, headerY + 10.5);
        doc.setDrawColor(0, 0, 0);

        const tableHead = [
            [
                {
                    content: 'NO',
                    rowSpan: 2,
                    styles: {
                        halign: 'center' as const,
                        valign: 'middle' as const,
                        fillColor: [51, 65, 85],
                    },
                },
                {
                    content: 'NAMA SISWA',
                    rowSpan: 2,
                    styles: {
                        halign: 'left' as const,
                        valign: 'middle' as const,
                        fillColor: [51, 65, 85],
                    },
                },
                {
                    content: 'KELAS',
                    rowSpan: 2,
                    styles: {
                        halign: 'center' as const,
                        valign: 'middle' as const,
                        fillColor: [51, 65, 85],
                    },
                },
                {
                    content: 'TANGGAL PERTEMUAN',
                    colSpan: activeMeetingDays.length,
                    styles: {
                        halign: 'center' as const,
                        valign: 'middle' as const,
                        fillColor: [245, 158, 11],
                    },
                },
                {
                    content: 'JUMLAH',
                    colSpan: 4,
                    styles: {
                        halign: 'center' as const,
                        valign: 'middle' as const,
                        fillColor: [2, 132, 199],
                    },
                },
            ],
            [
                ...activeMeetingDays.map((item) => ({
                    content: `${item.day}\n(${item.dayName})`,
                    styles: {
                        halign: 'center' as const,
                        valign: 'middle' as const,
                        fillColor: [253, 230, 138],
                        textColor: [15, 23, 42] as [number, number, number],
                    },
                })),
                {
                    content: 'S',
                    styles: {
                        halign: 'center' as const,
                        valign: 'middle' as const,
                        fillColor: [186, 230, 253],
                        textColor: [15, 23, 42] as [number, number, number],
                    },
                },
                {
                    content: 'I',
                    styles: {
                        halign: 'center' as const,
                        valign: 'middle' as const,
                        fillColor: [186, 230, 253],
                        textColor: [15, 23, 42] as [number, number, number],
                    },
                },
                {
                    content: 'A',
                    styles: {
                        halign: 'center' as const,
                        valign: 'middle' as const,
                        fillColor: [186, 230, 253],
                        textColor: [15, 23, 42] as [number, number, number],
                    },
                },
                {
                    content: 'H',
                    styles: {
                        halign: 'center' as const,
                        valign: 'middle' as const,
                        fillColor: [186, 230, 253],
                        textColor: [15, 23, 42] as [number, number, number],
                    },
                },
            ],
        ];

        const tableRows = sortedEnrollments.map((enrollment, index) => {
            const id = `${enrollment.participantType}:${enrollment.participantId}`;
            let h = 0,
                s = 0,
                iz = 0,
                a = 0;
            const dailyStatuses = activeMeetingDays.map((item) => {
                const dateStr = `${m.year}-${String(m.month + 1).padStart(2, '0')}-${String(item.day).padStart(2, '0')}`;
                const status = exportAttendanceMap[`${id}:${dateStr}`] || '';
                if (status === 'Hadir') {
                    h++;
                    return 'H';
                }
                if (status === 'Sakit') {
                    s++;
                    return 'S';
                }
                if (status === 'Izin') {
                    iz++;
                    return 'I';
                }
                if (status === 'Alpha') {
                    a++;
                    return 'A';
                }
                return '';
            });
            return [
                index + 1,
                enrollment.name,
                enrollment.className || '-',
                ...dailyStatuses,
                String(s),
                String(iz),
                String(a),
                String(h),
            ];
        });

        autoTable(doc, {
            head: tableHead as RowInput[],
            body: tableRows,
            startY: headerY + 12.5,
            theme: 'grid',
            showHead: 'everyPage',
            margin: { top: 12, bottom: 45, left: 10, right: 10 },
            styles: { fontSize: 6.5, cellPadding: 0.6, halign: 'center' },
            columnStyles: {
                0: { cellWidth: 8, halign: 'center' },
                1: { cellWidth: 45, halign: 'left', fontStyle: 'bold' },
                2: { cellWidth: 16, halign: 'center' },
            },
            alternateRowStyles: { fillColor: [248, 250, 252] },
            didParseCell: (data: CellHookData) => {
                if (data.section === 'body') {
                    const colIdx = data.column.index;
                    const val = String(data.cell.raw || '');
                    if (colIdx >= 3 && colIdx < 3 + activeMeetingDays.length) {
                        if (val === 'H') {
                            data.cell.styles.textColor = [21, 128, 61];
                            data.cell.styles.fontStyle = 'bold';
                        } else if (val === 'S') {
                            data.cell.styles.textColor = [180, 83, 9];
                            data.cell.styles.fillColor = [254, 243, 199];
                            data.cell.styles.fontStyle = 'bold';
                        } else if (val === 'I') {
                            data.cell.styles.textColor = [29, 78, 216];
                            data.cell.styles.fillColor = [219, 234, 254];
                            data.cell.styles.fontStyle = 'bold';
                        } else if (val === 'A') {
                            data.cell.styles.textColor = [185, 28, 28];
                            data.cell.styles.fillColor = [254, 226, 226];
                            data.cell.styles.fontStyle = 'bold';
                        }
                    } else if (colIdx >= 3 + activeMeetingDays.length) {
                        data.cell.styles.fontStyle = 'bold';
                        data.cell.styles.fillColor = [240, 249, 255];
                        if (colIdx === 3 + activeMeetingDays.length)
                            data.cell.styles.textColor = [180, 83, 9];
                        else if (colIdx === 3 + activeMeetingDays.length + 1)
                            data.cell.styles.textColor = [29, 78, 216];
                        else if (colIdx === 3 + activeMeetingDays.length + 2)
                            data.cell.styles.textColor = [185, 28, 28];
                        else if (colIdx === 3 + activeMeetingDays.length + 3)
                            data.cell.styles.textColor = [21, 128, 61];
                    }
                }
            },
            didDrawPage: () => {
                doc.setFontSize(8);
                doc.setTextColor(100);
                doc.text(
                    `Dicetak dari MI AL IRSYAD KOTA MADIUN pada ${new Date().toLocaleDateString('id-ID')}`,
                    14,
                    pageHeight - 6
                );
                doc.text(
                    `Halaman ${doc.internal.pages!.length - 1}`,
                    pageWidth - 25,
                    pageHeight - 6
                );
            },
        });

        const finalY = (doc as unknown as AutoTableDoc).lastAutoTable?.finalY || headerY + 20;
        const rightColX = pageWidth - 60;

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(9);
        doc.setTextColor(0, 0, 0);
        doc.text(`Madiun, ${printDateStr}`, rightColX, finalY + 6, { align: 'center' });
        doc.text(
            `Pembina Ekstrakurikuler ${selectedExtracurricular.name}`,
            rightColX,
            finalY + 10.5,
            { align: 'center' }
        );

        doc.setFont('helvetica', 'bold');
        doc.text(`( ${coachDisplay} )`, rightColX, finalY + 28, { align: 'center' });
    };

    // ==========================================
    // CASE A: 1 BULAN (SINGLE MONTH)
    // ==========================================
    if (period.months.length === 1) {
        drawSingleMonthPage(period.months[0]);
    }
    // ==========================================
    // CASE B: BULAN - BULAN / SEMESTER
    // ==========================================
    else {
        // Page 1: Lembar Rekapitulasi Kumulatif
        const headerY = addPdfHeader(doc, {
            schoolName: 'MI AL IRSYAD KOTA MADIUN',
            orientation: 'landscape',
        });

        const titleText = `REKAPITULASI PRESENSI EKSTRAKURIKULER ${selectedExtracurricular.name.toUpperCase()}`;
        const subText = period.titlePeriodText;
        const infoText = `PEMBINA: ${(selectedExtracurricular.coach_name || '-').toUpperCase()} • JADWAL: ${(selectedExtracurricular.schedule_day || '-').toUpperCase()} ${selectedExtracurricular.schedule_time || ''} • TOTAL ANGGOTA: ${enrollments.length} SISWA`;

        doc.setFontSize(11);
        doc.setFont('helvetica', 'bold');
        doc.text(titleText, pageWidth / 2, headerY - 1, { align: 'center' });
        doc.setFontSize(8.5);
        doc.setFont('helvetica', 'normal');
        doc.text(subText, pageWidth / 2, headerY + 3.5, { align: 'center' });
        doc.setFontSize(8);
        doc.text(infoText, pageWidth / 2, headerY + 7.5, { align: 'center' });

        doc.setDrawColor(15, 118, 110);
        doc.setLineWidth(0.4);
        doc.line(14, headerY + 10.5, pageWidth - 14, headerY + 10.5);
        doc.setDrawColor(0, 0, 0);

        // Header Row 1
        const headRow1 = [
            {
                content: 'NO',
                rowSpan: 2,
                styles: { halign: 'center' as const, valign: 'middle' as const, fillColor: [51, 65, 85] },
            },
            {
                content: 'NAMA SISWA',
                rowSpan: 2,
                styles: { halign: 'left' as const, valign: 'middle' as const, fillColor: [51, 65, 85] },
            },
            {
                content: 'KELAS',
                rowSpan: 2,
                styles: { halign: 'center' as const, valign: 'middle' as const, fillColor: [51, 65, 85] },
            },
            ...period.months.map((m) => ({
                content: m.monthName.toUpperCase(),
                colSpan: 4,
                styles: {
                    halign: 'center' as const,
                    valign: 'middle' as const,
                    fillColor: [245, 158, 11],
                    textColor: [255, 255, 255] as [number, number, number],
                },
            })),
            {
                content: 'TOTAL REKAPITULASI',
                colSpan: 5,
                styles: {
                    halign: 'center' as const,
                    valign: 'middle' as const,
                    fillColor: [2, 132, 199],
                    textColor: [255, 255, 255] as [number, number, number],
                },
            },
        ];

        // Header Row 2
        const headRow2: CellInput[] = [];
        period.months.forEach(() => {
            headRow2.push(
                { content: 'H', styles: { halign: 'center' as const, valign: 'middle' as const, fillColor: [254, 243, 199], textColor: [21, 128, 61] as [number, number, number] } },
                { content: 'S', styles: { halign: 'center' as const, valign: 'middle' as const, fillColor: [254, 243, 199], textColor: [180, 83, 9] as [number, number, number] } },
                { content: 'I', styles: { halign: 'center' as const, valign: 'middle' as const, fillColor: [254, 243, 199], textColor: [29, 78, 216] as [number, number, number] } },
                { content: 'A', styles: { halign: 'center' as const, valign: 'middle' as const, fillColor: [254, 243, 199], textColor: [185, 28, 28] as [number, number, number] } },
            );
        });
        headRow2.push(
            { content: 'H', styles: { halign: 'center' as const, valign: 'middle' as const, fillColor: [186, 230, 253], textColor: [21, 128, 61] as [number, number, number] } },
            { content: 'S', styles: { halign: 'center' as const, valign: 'middle' as const, fillColor: [186, 230, 253], textColor: [180, 83, 9] as [number, number, number] } },
            { content: 'I', styles: { halign: 'center' as const, valign: 'middle' as const, fillColor: [186, 230, 253], textColor: [29, 78, 216] as [number, number, number] } },
            { content: 'A', styles: { halign: 'center' as const, valign: 'middle' as const, fillColor: [186, 230, 253], textColor: [185, 28, 28] as [number, number, number] } },
            { content: '%', styles: { halign: 'center' as const, valign: 'middle' as const, fillColor: [186, 230, 253], textColor: [15, 23, 42] as [number, number, number] } },
        );

        const summaryRows = sortedEnrollments.map((enrollment, index) => {
            const id = `${enrollment.participantType}:${enrollment.participantId}`;
            let cumH = 0,
                cumS = 0,
                cumI = 0,
                cumA = 0;
            const monthlyCols: string[] = [];

            period.months.forEach((m) => {
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
                monthlyCols.push(String(mH), String(mS), String(mI), String(mA));
            });

            const totalMeetings = cumH + cumS + cumI + cumA;
            const pct = totalMeetings > 0 ? Math.round((cumH / totalMeetings) * 100) : 0;

            return [
                index + 1,
                enrollment.name,
                enrollment.className || '-',
                ...monthlyCols,
                String(cumH),
                String(cumS),
                String(cumI),
                String(cumA),
                `${pct}%`,
            ];
        });

        autoTable(doc, {
            head: [headRow1, headRow2] as RowInput[],
            body: summaryRows,
            startY: headerY + 12.5,
            theme: 'grid',
            showHead: 'everyPage',
            margin: { top: 12, bottom: 45, left: 10, right: 10 },
            styles: { fontSize: 6.5, cellPadding: 0.6, halign: 'center' },
            columnStyles: {
                0: { cellWidth: 8, halign: 'center' },
                1: { cellWidth: 42, halign: 'left', fontStyle: 'bold' },
                2: { cellWidth: 14, halign: 'center' },
            },
            alternateRowStyles: { fillColor: [248, 250, 252] },
            didDrawPage: () => {
                doc.setFontSize(8);
                doc.setTextColor(100);
                doc.text(
                    `Dicetak dari MI AL IRSYAD KOTA MADIUN pada ${new Date().toLocaleDateString('id-ID')}`,
                    14,
                    pageHeight - 6
                );
                doc.text(
                    `Halaman ${doc.internal.pages!.length - 1}`,
                    pageWidth - 25,
                    pageHeight - 6
                );
            },
        });

        const finalY = (doc as unknown as AutoTableDoc).lastAutoTable?.finalY || headerY + 20;
        const rightColX = pageWidth - 60;

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(9);
        doc.setTextColor(0, 0, 0);
        doc.text(`Madiun, ${printDateStr}`, rightColX, finalY + 6, { align: 'center' });
        doc.text(
            `Pembina Ekstrakurikuler ${selectedExtracurricular.name}`,
            rightColX,
            finalY + 10.5,
            { align: 'center' }
        );

        doc.setFont('helvetica', 'bold');
        doc.text(`( ${coachDisplay} )`, rightColX, finalY + 28, { align: 'center' });

        // If includeMonthlyDetails is true, render detailed day-by-day sheet for each month
        if (period.includeMonthlyDetails) {
            period.months.forEach((m) => {
                doc.addPage('a4', 'l');
                drawSingleMonthPage(m);
            });
        }
    }

    doc.save(
        `Presensi_${selectedExtracurricular.name.replace(/\s+/g, '_')}_${period.filePeriodName}_${formatExportDate()}.pdf`
    );
}

/**
 * Exports extracurricular attendance report to Excel format (Supports 1 Bulan, Bulan - Bulan, and Semester).
 */
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

/**
 * Exports extracurricular grade report to PDF format.
 */
export async function exportGradesPDF(options: ExportGradesOptions): Promise<void> {
    const { selectedExtracurricular, activeSemester, enrollments, gradesMap, gradeDrafts } = options;

    const { default: jsPDF } = await getJsPDF();
    const { default: autoTable } = await getAutoTable();
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();

    await ensureLogosLoaded();
    const headerY = addPdfHeader(doc, {
        schoolName: 'MI AL IRSYAD KOTA MADIUN',
        orientation: 'portrait',
    });

    const currentYear = new Date().getFullYear();
    const semesterName = activeSemester
        ? `${activeSemester.name} (Semester ${activeSemester.semester_number})`
        : 'Semester Ganjil';
    const academicYear = `${currentYear}/${currentYear + 1}`;

    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text(
        `DAFTAR NILAI EKSTRAKURIKULER ${selectedExtracurricular.name.toUpperCase()}`,
        pageWidth / 2,
        headerY,
        { align: 'center' }
    );
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.text(
        `SEMESTER: ${semesterName.toUpperCase()} - TAHUN PELAJARAN ${academicYear}`,
        pageWidth / 2,
        headerY + 5,
        { align: 'center' }
    );
    doc.text(
        `PEMBINA: ${(selectedExtracurricular.coach_name || '-').toUpperCase()} • TOTAL SISWA: ${enrollments.length}`,
        pageWidth / 2,
        headerY + 9,
        { align: 'center' }
    );

    doc.setDrawColor(15, 118, 110);
    doc.setLineWidth(0.4);
    doc.line(14, headerY + 12, pageWidth - 14, headerY + 12);
    doc.setDrawColor(0, 0, 0);

    const tableBody = [...enrollments]
        .sort(compareEnrollmentsByClassAndName)
        .map((enrollment, index) => {
            const key = `${enrollment.participantType}:${enrollment.participantId}`;
            const grade = gradesMap[key];
            const draft = gradeDrafts[key];
            const resolvedGrade = draft?.grade ?? grade?.grade ?? '-';
            const resolvedScore =
                draft?.score !== undefined && draft.score.trim() !== ''
                    ? draft.score.trim()
                    : (grade?.score ?? '-');
            const resolvedDesc =
                draft?.description !== undefined && draft.description.trim() !== ''
                    ? draft.description.trim()
                    : grade?.description || '-';
            return [
                index + 1,
                enrollment.name,
                enrollment.className || '-',
                resolvedGrade,
                resolvedScore,
                resolvedDesc,
            ];
        });

    autoTable(doc, {
        head: [['NO', 'NAMA SISWA', 'KELAS', 'PREDIKAT', 'NILAI', 'DESKRIPSI']],
        body: tableBody,
        startY: headerY + 14,
        showHead: 'everyPage',
        margin: { top: 12, bottom: 46, left: 14, right: 14 },
        styles: { fontSize: 8.5, cellPadding: 1.5, halign: 'center' },
        columnStyles: {
            0: { cellWidth: 10 },
            1: { halign: 'left', fontStyle: 'bold', cellWidth: 45 },
            2: { cellWidth: 18 },
            3: { cellWidth: 18, fontStyle: 'bold' },
            4: { cellWidth: 15, fontStyle: 'bold' },
            5: { halign: 'left' },
        },
        headStyles: {
            fillColor: [15, 118, 110],
            textColor: [255, 255, 255],
            fontStyle: 'bold',
        },
        alternateRowStyles: { fillColor: [248, 250, 252] },
        didDrawPage: () => {
            doc.setFontSize(8);
            doc.setTextColor(100);
            doc.text(
                `Dicetak dari MI AL IRSYAD KOTA MADIUN pada ${new Date().toLocaleDateString('id-ID')}`,
                14,
                pageHeight - 6
            );
            doc.text(
                `Halaman ${doc.internal.pages!.length - 1}`,
                pageWidth - 25,
                pageHeight - 6
            );
        },
    });

    const finalY = (doc as unknown as AutoTableDoc).lastAutoTable?.finalY || headerY + 20;
    const rightColX = pageWidth - 50;
    const printDateStr = new Date().toLocaleDateString('id-ID', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
    });

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(0, 0, 0);
    doc.text(`Madiun, ${printDateStr}`, rightColX, finalY + 6, { align: 'center' });
    doc.text(
        `Pembina Ekstrakurikuler ${selectedExtracurricular.name}`,
        rightColX,
        finalY + 10.5,
        { align: 'center' }
    );

    const coachDisplay =
        selectedExtracurricular.coach_name?.trim() ||
        '....................................';
    doc.setFont('helvetica', 'bold');
    doc.text(`( ${coachDisplay} )`, rightColX, finalY + 28, { align: 'center' });

    doc.save(
        `Nilai_${selectedExtracurricular.name.replace(/\s+/g, '_')}_${formatExportDate()}.pdf`
    );
}

/**
 * Exports extracurricular grade report to Excel format.
 */
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
