import { supabase } from '../../../../../services/supabase';
import { getJsPDF, getAutoTable } from '../../../../../utils/dynamicImports';
import { addPdfHeader, ensureLogosLoaded } from '../../../../../utils/pdfHeaderUtils';
import { formatExportDate } from '../../../../../utils/exportFormatUtils';
import {
    parseLocalDate,
    getActiveMeetingDays,
    compareEnrollmentsByClassAndName,
    resolveAttendancePeriod,
    MonthPeriodItem,
} from '../../extracurricularUtils';
import type { CellHookData, RowInput, CellInput } from 'jspdf-autotable';
import type { ExportAttendanceOptions, AutoTableDoc } from './types';
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