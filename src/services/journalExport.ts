/**
 * Service for exporting teaching journal data (Agenda KBM).
 * Supports Excel (.xlsx) and PDF (.pdf).
 *
 * @module services/journalExport
 */

import { supabase } from './supabase';
import { getAutoTable, getJsPDF, getXLSX } from '../utils/dynamicImports';
import { addPdfHeader, ensureLogosLoaded } from '../utils/pdfHeaderUtils';
import type { TeachingJournal, TeachingJournalRekap } from '../types/teachingJournal';

export interface JournalExcelExportOptions {
    journals?: (TeachingJournal & { className?: string })[];
    rekap?: TeachingJournalRekap[];
    schoolName: string;
    teacherName?: string;
    className?: string; // Optional overall filter context
    subject?: string;   // Optional overall filter context
    startDate?: string;
    endDate?: string;
}

export interface JournalPdfExportOptions {
    journals: (TeachingJournal & { className?: string })[];
    schoolName: string;
    teacherName?: string;
    className?: string; // Optional overall filter context
    subject?: string;   // Optional overall filter context
    startDate?: string;
    endDate?: string;
}

const getTeacherSignatureText = (teacherName?: string) =>
    teacherName?.trim() ? `(${teacherName.trim()})` : '(___________________)';

const formatExportDate = () =>
    new Date().toLocaleDateString('id-ID', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
    });

const formatDateString = (dateStr: string) => {
    try {
        return new Date(dateStr).toLocaleDateString('id-ID', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
        });
    } catch {
        return dateStr;
    }
};

/**
 * Fetch class names map for the given class IDs.
 */
const fetchClassMap = async (classIds: string[]): Promise<Record<string, string>> => {
    const uniqueIds = [...new Set(classIds)].filter(Boolean);
    if (uniqueIds.length === 0) return {};

    try {
        const { data: classes } = await (supabase
            .from('classes' as any) as any)
            .select('id, name')
            .in('id', uniqueIds);

        if (!classes) return {};
        return classes.reduce((acc: Record<string, string>, c: any) => {
            acc[c.id] = c.name;
            return acc;
        }, {} as Record<string, string>);
    } catch (err) {
        console.error('Failed to fetch class names for export:', err);
        return {};
    }
};

/**
 * Export Teaching Journals to Excel (xlsx)
 */
export const exportJournalsToExcel = async (options: JournalExcelExportOptions): Promise<void> => {
    const { journals, rekap, schoolName, teacherName, className, subject, startDate, endDate } = options;
    const XLSX = await getXLSX();
    const wb = XLSX.utils.book_new();

    const periodStr = startDate && endDate
        ? `${formatDateString(startDate)} - ${formatDateString(endDate)}`
        : 'Semua Periode';

    // ----------------------------------------------------
    // Sheet 1: Rekap (if provided)
    // ----------------------------------------------------
    if (rekap && rekap.length > 0) {
        const ws_rekap_data: any[][] = [
            [schoolName],
            ['REKAPITULASI JURNAL MENGAJAR (AGENDA KBM)'],
            [],
            ['Wali Kelas / Guru', teacherName || '-'],
            ['Periode', periodStr],
            ['Filter Kelas', className || 'Semua Kelas'],
            ['Filter Mapel', subject || 'Semua Mapel'],
            ['Tanggal Unduh', formatExportDate()],
            [],
            ['No', 'Kelas', 'Mata Pelajaran', 'Pertemuan Terisi', 'Tanggal Jurnal Terakhir']
        ];

        rekap.forEach((item, index) => {
            ws_rekap_data.push([
                index + 1,
                item.className,
                item.subject,
                item.journalsFilled,
                item.lastJournalDate ? formatDateString(item.lastJournalDate) : '-'
            ]);
        });

        ws_rekap_data.push([]);
        ws_rekap_data.push(['', 'Mengetahui,', '', '', 'Mengetahui,']);
        ws_rekap_data.push(['', 'Orang Tua/Wali', '', '', 'Wali Kelas / Guru']);
        ws_rekap_data.push([]);
        ws_rekap_data.push([]);
        ws_rekap_data.push(['', '(___________________)', '', '', getTeacherSignatureText(teacherName)]);

        const ws_rekap = XLSX.utils.aoa_to_sheet(ws_rekap_data);
        ws_rekap['!cols'] = [
            { wch: 5 },  // No
            { wch: 20 }, // Kelas
            { wch: 25 }, // Mapel
            { wch: 18 }, // Pertemuan Terisi
            { wch: 24 }  // Jurnal Terakhir
        ];
        XLSX.utils.book_append_sheet(wb, ws_rekap, 'Rekap Jurnal');
    }

    // ----------------------------------------------------
    // Sheet 2: Detail Journals (if provided)
    // ----------------------------------------------------
    if (journals && journals.length > 0) {
        const classIds = journals.map(j => j.class_id).filter((id): id is string => !!id);
        const classMap = await fetchClassMap(classIds);

        const ws_detail_data: any[][] = [
            [schoolName],
            ['DETAIL JURNAL MENGAJAR (AGENDA KBM)'],
            [],
            ['Wali Kelas / Guru', teacherName || '-'],
            ['Periode', periodStr],
            ['Filter Kelas', className || 'Semua Kelas'],
            ['Filter Mapel', subject || 'Semua Mapel'],
            ['Tanggal Unduh', formatExportDate()],
            [],
            [
                'No', 
                'Tanggal', 
                'Kelas', 
                'Mata Pelajaran', 
                'Pertemuan Ke', 
                'Topik / Materi KBM', 
                'Tujuan Pembelajaran', 
                'Kegiatan Pembelajaran', 
                'Catatan / Hambatan', 
                'Lampiran'
            ]
        ];

        journals.forEach((j, index) => {
            const rowClassName = j.className || classMap[j.class_id || ''] || '-';
            ws_detail_data.push([
                index + 1,
                formatDateString(j.date),
                rowClassName,
                j.subject,
                j.meeting_number ?? '-',
                j.topic,
                j.objectives || '-',
                j.activities || '-',
                j.notes || '-',
                j.attachment_url ? 'Ada' : 'Tidak Ada'
            ]);
        });

        ws_detail_data.push([]);
        ws_detail_data.push(['', 'Mengetahui,', '', '', '', 'Mengetahui,']);
        ws_detail_data.push(['', 'Orang Tua/Wali', '', '', '', 'Wali Kelas / Guru']);
        ws_detail_data.push([]);
        ws_detail_data.push([]);
        ws_detail_data.push(['', '(___________________)', '', '', '', getTeacherSignatureText(teacherName)]);

        const ws_detail = XLSX.utils.aoa_to_sheet(ws_detail_data);
        ws_detail['!cols'] = [
            { wch: 5 },  // No
            { wch: 15 }, // Tanggal
            { wch: 15 }, // Kelas
            { wch: 20 }, // Mapel
            { wch: 15 }, // Pertemuan Ke
            { wch: 30 }, // Topik / Materi
            { wch: 30 }, // Tujuan
            { wch: 35 }, // Kegiatan
            { wch: 25 }, // Catatan
            { wch: 12 }  // Lampiran
        ];
        XLSX.utils.book_append_sheet(wb, ws_detail, 'Detail Jurnal');
    }

    const filePrefix = journals && journals.length > 0 ? 'Detail' : 'Rekap';
    const cleanFileName = `Jurnal_Mengajar_${filePrefix}_${periodStr.replace(/[\s/]+/g, '_')}.xlsx`;
    await XLSX.writeFile(wb, cleanFileName);
};

/**
 * Export Teaching Journals to PDF (Formal Report)
 */
export const exportJournalsToPDF = async (options: JournalPdfExportOptions): Promise<void> => {
    const { journals, schoolName, teacherName, className, subject, startDate, endDate } = options;

    // 1. Load logos
    await ensureLogosLoaded();

    // 2. Fetch class names if they aren't pre-populated
    const classIds = journals.map(j => j.class_id).filter((id): id is string => !!id);
    const classMap = await fetchClassMap(classIds);

    // 3. Initialize jsPDF & autoTable
    const { default: jsPDF } = await getJsPDF();
    const { default: autoTable } = await getAutoTable();
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();

    // -- Header --
    let y = addPdfHeader(doc, { schoolName, orientation: 'portrait' });

    // -- Title --
    doc.setFontSize(13);
    doc.setFont('helvetica', 'bold');
    doc.text('LAPORAN JURNAL MENGAJAR (AGENDA KBM)', pageWidth / 2, y, { align: 'center' });
    y += 8;

    // -- Subheader / Meta Info --
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');

    const periodStr = startDate && endDate
        ? `${formatDateString(startDate)} s.d. ${formatDateString(endDate)}`
        : 'Semua Periode';

    const metaLeft = [
        `Guru / Wali Kelas : ${teacherName || '-'}`,
        `Periode           : ${periodStr}`,
    ];

    const metaRight = [
        `Filter Kelas : ${className || 'Semua Kelas'}`,
        `Filter Mapel : ${subject || 'Semua Mapel'}`,
    ];

    doc.text(metaLeft.join('\n'), 14, y);
    doc.text(metaRight.join('\n'), pageWidth - 14, y, { align: 'right' });
    y += 14;

    // -- Table Data --
    const tableBody = journals.map((j, index) => {
        const rowClassName = j.className || classMap[j.class_id || ''] || '-';
        const dateStr = formatDateString(j.date);
        
        // Format combined columns to save space
        const classSubject = `${rowClassName}\n${j.subject}`;
        const topicObjectives = `Materi:\n${j.topic}\n\nTujuan:\n${j.objectives || '-'}`;
        const activitiesNotes = `Kegiatan:\n${j.activities || '-'}\n\nCatatan:\n${j.notes || '-'}`;
        
        return [
            index + 1,
            dateStr,
            classSubject,
            j.meeting_number ?? '-',
            topicObjectives,
            activitiesNotes,
        ];
    });

    autoTable(doc, {
        startY: y,
        head: [['No', 'Tanggal', 'Kelas & Mapel', 'Pertemuan', 'Materi & Tujuan', 'Kegiatan & Catatan']],
        body: tableBody,
        theme: 'grid',
        headStyles: {
            fillColor: [16, 185, 129], // Emerald-500 matching the project color palette
            textColor: 255,
            fontStyle: 'bold',
            halign: 'center',
            valign: 'middle',
            fontSize: 9,
        },
        styles: {
            fontSize: 8.5,
            cellPadding: 3,
            lineColor: [200, 200, 200],
            lineWidth: 0.1,
            valign: 'top',
        },
        columnStyles: {
            0: { cellWidth: 8, halign: 'center' }, // No
            1: { cellWidth: 22, halign: 'center' }, // Tanggal
            2: { cellWidth: 30, halign: 'left' }, // Kelas & Mapel
            3: { cellWidth: 16, halign: 'center' }, // Pertemuan
            4: { cellWidth: 50, halign: 'left' }, // Materi & Tujuan
            5: { cellWidth: 56, halign: 'left' }, // Kegiatan & Catatan
        },
        didDrawPage: (data) => {
            // Draw page number in footer
            const pageCount = doc.getNumberOfPages();
            doc.setFontSize(8);
            doc.setFont('helvetica', 'normal');
            doc.setTextColor(100, 100, 100);
            
            const pageNumberStr = `Halaman ${data.pageNumber}`;
            const downloadDateStr = `Dicetak: ${formatExportDate()}`;
            
            doc.text(pageNumberStr, pageWidth / 2, doc.internal.pageSize.getHeight() - 10, { align: 'center' });
            doc.text(downloadDateStr, pageWidth - 14, doc.internal.pageSize.getHeight() - 10, { align: 'right' });
            
            doc.setDrawColor(220, 220, 220);
            doc.line(14, doc.internal.pageSize.getHeight() - 14, pageWidth - 14, doc.internal.pageSize.getHeight() - 14);
        }
    });

    // -- Signature Section --
    const finalY = (doc as any).lastAutoTable?.finalY || y + 20;
    const pageHeight = doc.internal.pageSize.getHeight();
    const signatureSpaceNeeded = 45;

    let sigY = finalY + 15;
    if (sigY + signatureSpaceNeeded > pageHeight - 15) {
        doc.addPage();
        sigY = 25; // Safe top margin on new page
    }

    const lineWidth = 60;
    const leftX = 45;
    const rightX = pageWidth - 45;
    const signatureLineY = sigY + 22;

    doc.setFontSize(9.5);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(0, 0, 0);

    doc.text('Mengetahui,', leftX, sigY, { align: 'center' });
    doc.text('Orang Tua/Wali', leftX, sigY + 4, { align: 'center' });
    doc.line(leftX - lineWidth / 2, signatureLineY, leftX + lineWidth / 2, signatureLineY);
    doc.text('(___________________)', leftX, signatureLineY + 5, { align: 'center' });

    doc.text('Mengetahui,', rightX, sigY, { align: 'center' });
    doc.text('Wali Kelas / Guru Pengajar', rightX, sigY + 4, { align: 'center' });
    doc.line(rightX - lineWidth / 2, signatureLineY, rightX + lineWidth / 2, signatureLineY);
    doc.text(getTeacherSignatureText(teacherName), rightX, signatureLineY + 5, { align: 'center' });

    // 4. Save file
    const cleanFileName = `Jurnal_Mengajar_${periodStr.replace(/[\s/]+/g, '_')}.pdf`;
    doc.save(cleanFileName);
};
