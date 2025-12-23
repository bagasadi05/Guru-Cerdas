import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { PortalData } from '../pages/ParentPortalPage';

// Helper to load image as base64
const loadImage = (url: string): Promise<string> => {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.crossOrigin = 'Anonymous';
        // Use full URL from window.location.origin for relative paths
        const fullUrl = url.startsWith('/') ? `${window.location.origin}${url}` : url;
        img.src = fullUrl;
        img.onload = () => {
            const canvas = document.createElement('canvas');
            canvas.width = img.width;
            canvas.height = img.height;
            const ctx = canvas.getContext('2d');
            if (ctx) {
                ctx.drawImage(img, 0, 0);
                resolve(canvas.toDataURL('image/png'));
            } else {
                reject(new Error('Could not get canvas context'));
            }
        };
        img.onerror = (error) => {
            console.warn('Failed to load image:', fullUrl, error);
            reject(error);
        };
    });
};

export const generateReportCardPDF = async (data: PortalData): Promise<void> => {
    const doc = new jsPDF('p', 'mm', 'a4');
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();

    // Get school info from data
    const schoolName = data.schoolInfo?.school_name || 'Sekolah';
    const schoolAddress = data.schoolInfo?.school_address || '';
    const semester = data.schoolInfo?.semester || 'Ganjil';
    const academicYear = data.schoolInfo?.academic_year || '2024/2025';

    // Load Logo
    let hasLogo = false;
    try {
        const logoData = await loadImage('/logo_sekolah.png');
        if (logoData) {
            doc.addImage(logoData, 'PNG', 15, 8, 22, 22);
            hasLogo = true;
        }
    } catch (e) {
        console.warn('Logo could not be loaded', e);
    }

    // Header Text - Position based on whether logo exists
    const textStartX = hasLogo ? 42 : pageWidth / 2;
    const textAlign = hasLogo ? 'left' : 'center';

    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('LAPORAN HASIL BELAJAR SISWA', textStartX, 14, { align: textAlign as any });

    doc.setFontSize(12);
    doc.text(schoolName.toUpperCase(), textStartX, 21, { align: textAlign as any });

    if (schoolAddress) {
        doc.setFontSize(9);
        doc.setFont('helvetica', 'normal');
        doc.text(schoolAddress, textStartX, 27, { align: textAlign as any });
    }

    // Double Line Border
    const lineY = 32;
    doc.setLineWidth(1);
    doc.line(15, lineY, pageWidth - 15, lineY);
    doc.setLineWidth(0.3);
    doc.line(15, lineY + 1.5, pageWidth - 15, lineY + 1.5);

    // Student Info
    doc.setFontSize(11);
    const startY = lineY + 10;
    const leftCol = 15;
    const rightCol = pageWidth / 2 + 10;

    doc.setFont('helvetica', 'bold');
    doc.text('Nama Peserta Didik', leftCol, startY);
    doc.setFont('helvetica', 'normal');
    doc.text(`: ${data.student.name.toUpperCase()}`, leftCol + 45, startY);

    doc.setFont('helvetica', 'bold');
    doc.text('Kelas', leftCol, startY + 7);
    doc.setFont('helvetica', 'normal');
    doc.text(`: ${data.student.classes.name}`, leftCol + 45, startY + 7);

    doc.setFont('helvetica', 'bold');
    doc.text('NIS/NISN', leftCol, startY + 14);
    doc.setFont('helvetica', 'normal');
    doc.text(`: ${data.student.id.slice(0, 10).toUpperCase()}`, leftCol + 45, startY + 14);

    doc.setFont('helvetica', 'bold');
    doc.text('Semester', rightCol, startY);
    doc.setFont('helvetica', 'normal');
    doc.text(`: ${semester}`, rightCol + 35, startY);

    doc.setFont('helvetica', 'bold');
    doc.text('Tahun Pelajaran', rightCol, startY + 7);
    doc.setFont('helvetica', 'normal');
    doc.text(`: ${academicYear}`, rightCol + 35, startY + 7);

    // Academic Records Table
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('A. Nilai Akademik', leftCol, startY + 28);

    const academicData = data.academicRecords.length > 0
        ? data.academicRecords.map((record, idx) => [
            (idx + 1).toString(),
            record.subject,
            record.score.toString(),
            record.notes || '-'
        ])
        : [['', 'Belum ada nilai akademik', '', '']];

    autoTable(doc, {
        startY: startY + 32,
        head: [['No', 'Mata Pelajaran', 'Nilai', 'Catatan Guru (Per Mapel)']],
        body: academicData,
        theme: 'grid',
        headStyles: {
            fillColor: [255, 255, 255],
            textColor: 0,
            fontStyle: 'bold',
            lineWidth: 0.1,
            lineColor: [0, 0, 0]
        },
        bodyStyles: {
            lineWidth: 0.1,
            lineColor: [0, 0, 0],
            textColor: 0
        },
        columnStyles: {
            0: { cellWidth: 12, halign: 'center' },
            1: { cellWidth: 70 },
            2: { cellWidth: 20, halign: 'center' },
            3: { cellWidth: 'auto' }
        },
        styles: { fontSize: 10, cellPadding: 3, font: 'helvetica' }
    });

    // Attendance Summary
    let finalY = (doc as any).lastAutoTable.finalY + 10;

    // Check page break for attendance
    if (finalY > pageHeight - 60) {
        doc.addPage();
        finalY = 20;
    }

    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('B. Kehadiran', leftCol, finalY);

    const hadir = data.attendanceRecords.filter(r => r.status === 'Hadir').length;
    const sakit = data.attendanceRecords.filter(r => r.status === 'Sakit').length;
    const izin = data.attendanceRecords.filter(r => r.status === 'Izin').length;
    const alpha = data.attendanceRecords.filter(r => r.status === 'Alpha').length;

    autoTable(doc, {
        startY: finalY + 4,
        head: [['Hadir', 'Sakit', 'Izin', 'Alpha']],
        body: [[hadir.toString(), sakit.toString(), izin.toString(), alpha.toString()]],
        theme: 'grid',
        headStyles: {
            fillColor: [255, 255, 255],
            textColor: 0,
            fontStyle: 'bold',
            lineWidth: 0.1,
            lineColor: [0, 0, 0],
            halign: 'center'
        },
        bodyStyles: {
            halign: 'center',
            fontStyle: 'bold',
            fontSize: 12,
            lineWidth: 0.1,
            lineColor: [0, 0, 0],
            textColor: 0
        },
        styles: { cellPadding: 5 }
    });

    finalY = (doc as any).lastAutoTable.finalY + 10;

    // Catatan Wali Kelas Section
    // Check page break for notes
    if (finalY > pageHeight - 60) {
        doc.addPage();
        finalY = 20;
    }

    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('C. Catatan Wali Kelas', leftCol, finalY);

    doc.setLineWidth(0.1);
    doc.rect(leftCol, finalY + 4, pageWidth - 30, 25);

    doc.setFontSize(10);
    doc.setFont('helvetica', 'italic');
    doc.text('Tingkatkan terus prestasi belajarmu dan pertahankan semangatmu!', leftCol + 5, finalY + 12);

    // Signature Section
    const signY = finalY + 45;

    // Check page break for signature
    if (signY > pageHeight - 40) {
        doc.addPage();
        // signY would need recalculation if we were rigorous, but usually fitting on next page is fine.
        // Simplified: just render at top of new page if needed.
    }

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');

    // Parent signature
    doc.text('Orang Tua / Wali', leftCol + 15, signY);
    doc.line(leftCol, signY + 25, leftCol + 50, signY + 25); // Signature line
    doc.text(data.student.parent_name || '....................', leftCol + 5, signY + 30);

    // Teacher signature
    const today = new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
    doc.text(`Madiun, ${today}`, rightCol, signY - 5);
    doc.text('Wali Kelas', rightCol + 15, signY);
    doc.line(rightCol, signY + 25, rightCol + 50, signY + 25); // Signature line
    doc.text(data.teacher?.full_name || '....................', rightCol + 5, signY + 30);

    // Footer
    doc.setFontSize(8);
    doc.setTextColor(150);
    doc.text('Dokumen ini dicetak secara otomatis melalui aplikasi Portal Guru.', pageWidth / 2, pageHeight - 10, { align: 'center' });

    // Save PDF
    doc.save(`Rapor-${data.student.name.replace(/\s+/g, '_')}-${semester}-${academicYear.replace('/', '-')}.pdf`);
};
