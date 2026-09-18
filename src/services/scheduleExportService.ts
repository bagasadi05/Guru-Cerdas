import { addPdfHeader, ensureLogosLoaded } from '../utils/pdfHeaderUtils';
import { getJsPDF, getAutoTable } from '../utils/dynamicImports';
import type { RowInput } from 'jspdf-autotable';
import { daysOfWeek, resolveClassName } from '../utils/scheduleUtils';
import { ScheduleRow, PhScheduleRow } from '../types';
import { formatExportDate } from '../utils/exportUtils';

// ─── PDF Export ──────────────────────────────────────────────────────────────

export async function exportSchedulePdf(
    schedule: ScheduleRow[],
    scheduleByDay: Record<string, ScheduleRow[]>,
    teacherName: string,
    toast: { success: (msg: string) => void; warning: (msg: string) => void },
    classNameMap?: Map<string, string>
) {
    if (!schedule || schedule.length === 0) {
        toast.warning("Tidak ada jadwal untuk diekspor.");
        return;
    }

    await ensureLogosLoaded();

    const { default: jsPDF } = await getJsPDF();
    const { default: autoTable } = await getAutoTable();
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 15;

    let startY = addPdfHeader(doc, { orientation: 'portrait' });
    
    // Draw Title and Info
    doc.setFont("helvetica", "bold");
    doc.setFontSize(16);
    doc.setTextColor(31, 41, 55);
    doc.text("Jadwal Mengajar", pageWidth / 2, startY, { align: 'center' });
    
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.setTextColor(107, 114, 128);
    const teacherNameDisplay = teacherName || 'Guru';
    doc.text(`Guru: ${teacherNameDisplay}`, margin, startY + 8);
    doc.text(`Tahun Ajaran: ${new Date().getFullYear()}/${new Date().getFullYear() + 1}`, pageWidth - margin, startY + 8, { align: 'right' });
    
    startY += 15;

    // Helper to format time (remove seconds if present, e.g., 07:30:00 -> 07:30)
    const formatTime = (time: string) => {
        if (!time) return '';
        const parts = time.split(':');
        if (parts.length >= 2) return `${parts[0]}:${parts[1]}`;
        return time;
    };

    // Prepare table data
    const tableBody: RowInput[] = [];

    daysOfWeek.forEach((day) => {
        const itemsForDay = scheduleByDay[day] || [];
        if (itemsForDay.length === 0) return;

        itemsForDay.forEach((item, index) => {
            const timeStr = `${formatTime(item.start_time)} - ${formatTime(item.end_time)}`;
            const className = resolveClassName(item.class_id ? classNameMap?.get(item.class_id) : undefined, item.class_id);
            
            // Add a separator/header row for the day if it's the first item
            if (index === 0) {
                tableBody.push([{ content: day.toUpperCase(), colSpan: 3, styles: { fillColor: [243, 244, 246], fontStyle: 'bold', textColor: [31, 41, 55] } }]);
            }
            
            tableBody.push([
                timeStr,
                item.subject,
                className
            ]);
        });
    });

    autoTable(doc, {
        startY,
        head: [['Waktu', 'Mata Pelajaran', 'Kelas']],
        body: tableBody,
        theme: 'grid',
        styles: {
            font: 'helvetica',
            fontSize: 10,
            cellPadding: 5,
            lineColor: [229, 231, 235],
            lineWidth: 0.1,
            textColor: [55, 65, 81],
        },
        headStyles: {
            fillColor: [16, 185, 129], // Emerald 500
            textColor: 255,
            fontStyle: 'bold',
            halign: 'center',
        },
        columnStyles: {
            0: { halign: 'center', cellWidth: 35 },
            2: { halign: 'center', cellWidth: 40 },
        },
        alternateRowStyles: {
            fillColor: [252, 253, 253], // Very light gray
        },
        margin: { left: margin, right: margin },
        didDrawPage: (data) => {
            // Footer with page numbers
            doc.setFontSize(8);
            doc.setTextColor(150, 150, 150);
            doc.text(`Hal ${data.pageNumber}`, pageWidth - margin, pageHeight - 10, { align: 'right' });
            doc.text(`Portal Guru App`, margin, pageHeight - 10);
        }
    });

    doc.save(`Jadwal_Mengajar_${formatExportDate()}.pdf`);
    toast.success("Jadwal PDF berhasil diunduh!");
}

// ─── ICS Export ──────────────────────────────────────────────────────────────

export function exportScheduleIcs(
    schedule: ScheduleRow[],
    toast: { success: (msg: string) => void; warning: (msg: string) => void },
    classNameMap?: Map<string, string>
) {
    if (!schedule || schedule.length === 0) {
        toast.warning("Tidak ada jadwal untuk diekspor.");
        return;
    }

    const dayToICalDay: Record<string, string> = {
        'Senin': 'MO', 'Selasa': 'TU', 'Rabu': 'WE', 'Kamis': 'TH', 'Jumat': 'FR', 'Sabtu': 'SA',
    };
    const dayNameToIndex: Record<string, number> = {
        'Minggu': 0, 'Senin': 1, 'Selasa': 2, 'Rabu': 3, 'Kamis': 4, 'Jumat': 5, 'Sabtu': 6,
    };

    // Helper: pad number to 2 digits
    const pad = (n: number) => n.toString().padStart(2, '0');

    // Helper: format time string, strip seconds if present (07:30:00 -> 07:30)
    const parseTime = (t: string): [number, number] => {
        const parts = t.split(':').map(Number);
        return [parts[0] || 0, parts[1] || 0];
    };

    // Build VCALENDAR manually for maximum compatibility
    const lines: string[] = [
        'BEGIN:VCALENDAR',
        'VERSION:2.0',
        'PRODID:-//Guru Cerdas//Jadwal Mengajar//ID',
        'CALSCALE:GREGORIAN',
        'METHOD:PUBLISH',
        'X-WR-CALNAME:Jadwal Mengajar',
        'X-WR-TIMEZONE:Asia/Jakarta',
    ];

    schedule.forEach(item => {
        const [startHour, startMinute] = parseTime(item.start_time);
        const [endHour, endMinute] = parseTime(item.end_time);
        const icalDay = dayToICalDay[item.day];

        if (!icalDay) return; // Skip if day not mapped (e.g., Minggu)

        const targetDayIndex = dayNameToIndex[item.day];
        const now = new Date();
        const currentDayIndex = now.getDay();
        let dayDifference = targetDayIndex - currentDayIndex;
        if (dayDifference < 0) dayDifference += 7;
        if (dayDifference === 0 && (now.getHours() > startHour || (now.getHours() === startHour && now.getMinutes() > startMinute))) {
            dayDifference += 7;
        }

        const eventDate = new Date(now);
        eventDate.setDate(now.getDate() + dayDifference);

        const y = eventDate.getFullYear();
        const m = pad(eventDate.getMonth() + 1);
        const d = pad(eventDate.getDate());
        const dtStart = `${y}${m}${d}T${pad(startHour)}${pad(startMinute)}00`;
        const dtEnd = `${y}${m}${d}T${pad(endHour)}${pad(endMinute)}00`;

        const className = resolveClassName(
            item.class_id ? classNameMap?.get(item.class_id) : undefined,
            item.class_id
        );

        const uid = `guru-cerdas-${item.id}@gurucerdas.app`;
        const stamp = `${y}${m}${d}T${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`;

        lines.push('BEGIN:VEVENT');
        lines.push(`UID:${uid}`);
        lines.push(`DTSTAMP:${stamp}`);
        lines.push(`DTSTART;TZID=Asia/Jakarta:${dtStart}`);
        lines.push(`DTEND;TZID=Asia/Jakarta:${dtEnd}`);
        lines.push(`RRULE:FREQ=WEEKLY;BYDAY=${icalDay}`);
        lines.push(`SUMMARY:${item.subject} (${className})`);
        lines.push(`DESCRIPTION:Jadwal mengajar ${item.subject} untuk ${className}`);
        lines.push(`LOCATION:Sekolah`);
        lines.push('BEGIN:VALARM');
        lines.push('TRIGGER:-PT10M');
        lines.push('ACTION:DISPLAY');
        lines.push(`DESCRIPTION:Pengingat ${item.subject}`);
        lines.push('END:VALARM');
        lines.push('END:VEVENT');
    });

    lines.push('END:VCALENDAR');

    const icsContent = lines.join('\r\n');
    const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `Jadwal_Mengajar_${formatExportDate()}.ics`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(link.href);
    toast.success("File kalender (.ics) berhasil diunduh!");
}

export function exportPhScheduleIcs(
    schedules: PhScheduleRow[],
    className: string,
    toast: { success: (msg: string) => void; warning: (msg: string) => void }
) {
    if (!schedules || schedules.length === 0) {
        toast.warning("Tidak ada jadwal PH untuk diekspor.");
        return;
    }

    const pad = (n: number) => n.toString().padStart(2, '0');
    const now = new Date();
    const stamp = `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}T${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`;

    const lines: string[] = [
        'BEGIN:VCALENDAR',
        'VERSION:2.0',
        'PRODID:-//Guru Cerdas//Jadwal PH//ID',
        'CALSCALE:GREGORIAN',
        'METHOD:PUBLISH',
        `X-WR-CALNAME:Jadwal PH ${className}`,
        'X-WR-TIMEZONE:Asia/Jakarta',
    ];

    schedules.forEach(item => {
        const [year, month, day] = item.date.split('-').map(Number);
        if (!year || !month || !day) return;

        let startH = 7, startM = 30, endH = 9, endM = 0;
        const p = item.period_label.trim();
        if (p === '3-4') {
            startH = 9; startM = 15; endH = 10; endM = 45;
        } else if (p === '5-6') {
            startH = 11; startM = 0; endH = 12; endM = 30;
        } else if (p === '7-8') {
            startH = 13; startM = 0; endH = 14; endM = 30;
        }

        const dtStart = `${year}${pad(month)}${pad(day)}T${pad(startH)}${pad(startM)}00`;
        const dtEnd = `${year}${pad(month)}${pad(day)}T${pad(endH)}${pad(endM)}00`;
        const uid = `guru-cerdas-ph-${item.id}@gurucerdas.app`;

        lines.push('BEGIN:VEVENT');
        lines.push(`UID:${uid}`);
        lines.push(`DTSTAMP:${stamp}`);
        lines.push(`DTSTART;TZID=Asia/Jakarta:${dtStart}`);
        lines.push(`DTEND;TZID=Asia/Jakarta:${dtEnd}`);
        lines.push(`SUMMARY:PH ${item.subject} (${className})`);
        lines.push(`DESCRIPTION:Penilaian Harian (PH) ${item.subject} untuk ${className}, Jam Ke-${item.period_label}`);
        lines.push(`LOCATION:Sekolah`);
        lines.push('BEGIN:VALARM');
        lines.push('TRIGGER:-P1D');
        lines.push('ACTION:DISPLAY');
        lines.push(`DESCRIPTION:Pengingat: Besok Penilaian Harian (PH) ${item.subject}`);
        lines.push('END:VALARM');
        lines.push('BEGIN:VALARM');
        lines.push('TRIGGER:-PT1H');
        lines.push('ACTION:DISPLAY');
        lines.push(`DESCRIPTION:Pengingat: 1 jam lagi PH ${item.subject}`);
        lines.push('END:VALARM');
        lines.push('END:VEVENT');
    });

    lines.push('END:VCALENDAR');

    const icsContent = lines.join('\r\n');
    const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `Jadwal_PH_${className.replace(/\s+/g, '_')}_${formatExportDate()}.ics`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(link.href);
    toast.success("File kalender PH (.ics) berhasil diunduh!");
}

