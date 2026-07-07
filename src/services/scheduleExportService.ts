import { addPdfHeader, ensureLogosLoaded } from '../utils/pdfHeaderUtils';
import { getJsPDF } from '../utils/dynamicImports';
import { daysOfWeek } from '../utils/scheduleUtils';
import { ScheduleRow } from '../types';

import * as ics from 'ics';

// ─── PDF Export ──────────────────────────────────────────────────────────────

export async function exportSchedulePdf(
    schedule: ScheduleRow[],
    scheduleByDay: Record<string, ScheduleRow[]>,
    teacherName: string,
    toast: { success: (msg: string) => void; warning: (msg: string) => void }
) {
    if (!schedule || schedule.length === 0) {
        toast.warning("Tidak ada jadwal untuk diekspor.");
        return;
    }

    await ensureLogosLoaded();

    const { default: jsPDF } = await getJsPDF();
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 15;
    const colGap = 10;
    const colWidth = (pageWidth - (margin * 2) - colGap) / 2;

    const colors = {
        primary: [16, 185, 129],
        text: [31, 41, 55],
        secondaryText: [107, 114, 128],
        lightBg: [249, 250, 251],
        border: [229, 231, 235],
    };

    const dayHexColors: Record<string, string> = {
        Senin: '#3b82f6',
        Selasa: '#10b981',
        Rabu: '#f59e0b',
        Kamis: '#8b5cf6',
        Jumat: '#f43f5e',
        Sabtu: '#6366f1',
    };

    const drawHeader = () => {
        const headerY = addPdfHeader(doc, { orientation: 'portrait' });
        doc.setFont("helvetica", "bold");
        doc.setFontSize(16);
        doc.setTextColor(colors.text[0], colors.text[1], colors.text[2]);
        doc.text("Jadwal Mengajar", pageWidth / 2, headerY, { align: 'center' });
        doc.setFont("helvetica", "normal");
        doc.setFontSize(10);
        doc.setTextColor(colors.secondaryText[0], colors.secondaryText[1], colors.secondaryText[2]);
        const teacherNameDisplay = teacherName || 'Guru';
        doc.text(`Guru: ${teacherNameDisplay}`, margin, headerY + 8);
        doc.text(`Tahun Ajaran: ${new Date().getFullYear()}/${new Date().getFullYear() + 1}`, pageWidth - margin, headerY + 8, { align: 'right' });
        return headerY + 15;
    };

    const startY = drawHeader();
    let yLeft = startY;
    let yRight = startY;

    daysOfWeek.forEach((day) => {
        const itemsForDay = scheduleByDay[day] || [];
        if (itemsForDay.length === 0) return;

        const isLeft = yLeft <= yRight;
        const currentX = isLeft ? margin : margin + colWidth + colGap;
        let currentY = isLeft ? yLeft : yRight;

        const headerHeight = 12;
        const itemHeight = 18;
        const cardHeight = headerHeight + (itemsForDay.length * itemHeight) + 5;

        if (currentY + cardHeight > pageHeight - margin) {
            doc.addPage();
            drawHeader();
            yLeft = 45;
            yRight = 45;
            currentY = 45;
        }

        const dayColor = dayHexColors[day] || '#6b7280';
        doc.setFillColor(dayColor);
        doc.setDrawColor(dayColor);
        doc.roundedRect(currentX, currentY, colWidth, headerHeight, 2, 2, 'F');
        doc.rect(currentX, currentY + headerHeight - 2, colWidth, 2, 'F');

        doc.setTextColor(255, 255, 255);
        doc.setFontSize(12);
        doc.setFont("helvetica", "bold");
        doc.text(day.toUpperCase(), currentX + 4, currentY + 8);

        doc.setDrawColor(colors.border[0], colors.border[1], colors.border[2]);
        doc.setLineWidth(0.2);
        doc.setFillColor(255, 255, 255);
        doc.rect(currentX, currentY + headerHeight, colWidth, cardHeight - headerHeight, 'S');

        let itemY = currentY + headerHeight + 6;
        itemsForDay.forEach((item, idx) => {
            doc.setFont("courier", "bold");
            doc.setFontSize(9);
            doc.setTextColor(colors.primary[0], colors.primary[1], colors.primary[2]);
            doc.text(`${item.start_time} - ${item.end_time}`, currentX + 4, itemY);

            doc.setFont("helvetica", "bold");
            doc.setFontSize(10);
            doc.setTextColor(colors.text[0], colors.text[1], colors.text[2]);
            const subject = item.subject.length > 25 ? item.subject.substring(0, 23) + '...' : item.subject;
            doc.text(subject, currentX + 4, itemY + 5);

            doc.setFont("helvetica", "normal");
            doc.setFontSize(8);
            doc.setTextColor(colors.secondaryText[0], colors.secondaryText[1], colors.secondaryText[2]);
            doc.text(`Kelas ${item.class_id}`, currentX + 4, itemY + 9);

            if (idx < itemsForDay.length - 1) {
                doc.setDrawColor(243, 244, 246);
                doc.line(currentX + 4, itemY + 12, currentX + colWidth - 4, itemY + 12);
            }
            itemY += itemHeight;
        });

        const usedHeight = cardHeight + 8;
        if (isLeft) yLeft += usedHeight;
        else yRight += usedHeight;
    });

    const pageCount = doc.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.setTextColor(150, 150, 150);
        doc.text(`Hal ${i} dari ${pageCount}`, pageWidth - margin, pageHeight - 10, { align: 'right' });
        doc.text(`Portal Guru App`, margin, pageHeight - 10);
    }

    doc.save('Jadwal_Mengajar.pdf');
    toast.success("Jadwal PDF berhasil diunduh!");
}

// ─── ICS Export ──────────────────────────────────────────────────────────────

export function exportScheduleIcs(
    schedule: ScheduleRow[],
    toast: { success: (msg: string) => void; warning: (msg: string) => void }
) {
    if (!schedule || schedule.length === 0) {
        toast.warning("Tidak ada jadwal untuk diekspor.");
        return;
    }

    const dayToICalDay: Record<string, 'MO' | 'TU' | 'WE' | 'TH' | 'FR' | 'SA'> = {
        'Senin': 'MO', 'Selasa': 'TU', 'Rabu': 'WE', 'Kamis': 'TH', 'Jumat': 'FR', 'Sabtu': 'SA',
    };
    const dayNameToIndex: Record<string, number> = {
        'Minggu': 0, 'Senin': 1, 'Selasa': 2, 'Rabu': 3, 'Kamis': 4, 'Jumat': 5, 'Sabtu': 6,
    };

    const events: ics.EventAttributes[] = schedule.map(item => {
        const [startHour, startMinute] = item.start_time.split(':').map(Number);
        const [endHour, endMinute] = item.end_time.split(':').map(Number);
        const now = new Date();
        const targetDayIndex = dayNameToIndex[item.day];
        const currentDayIndex = now.getDay();
        let dayDifference = targetDayIndex - currentDayIndex;
        if (dayDifference < 0 || (dayDifference === 0 && (now.getHours() > startHour || (now.getHours() === startHour && now.getMinutes() > startMinute)))) {
            dayDifference += 7;
        }
        const eventDate = new Date();
        eventDate.setDate(now.getDate() + dayDifference);
        const year = eventDate.getFullYear();
        const month = eventDate.getMonth() + 1;
        const day = eventDate.getDate();

        return {
            uid: `guru-pwa-${item.id}@myapp.com`,
            title: `${item.subject} (Kelas ${item.class_id})`,
            start: [year, month, day, startHour, startMinute] as ics.DateArray,
            end: [year, month, day, endHour, endMinute] as ics.DateArray,
            recurrenceRule: `FREQ=WEEKLY;BYDAY=${dayToICalDay[item.day]}`,
            description: `Jadwal mengajar untuk kelas ${item.class_id}`,
            location: 'Sekolah',
            startOutputType: 'local',
            endOutputType: 'local',
            alarms: [
                { action: 'display', description: 'Pengingat Kelas', trigger: { minutes: 10, before: true } },
            ],
        } as ics.EventAttributes;
    });

    ics.createEvents(events, (error, value) => {
        if (error) {
            toast.warning("Gagal membuat file kalender.");
            console.error(error);
            return;
        }
        const blob = new Blob([value], { type: 'text/calendar;charset=utf-8' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = 'jadwal_mengajar.ics';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        toast.success("File kalender (.ics) berhasil diunduh!");
    });
}
