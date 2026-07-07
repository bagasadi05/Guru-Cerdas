import type jsPDF from 'jspdf';
import { getAutoTable } from '../utils/dynamicImports';
import { addPdfHeader, ensureLogosLoaded } from '../utils/pdfHeaderUtils';
import { BintangGrade, bintangService, calculateAspectPoints } from './bintangService';
import { supabase } from './supabase';



type AppUser = {
    id: string;
    email?: string;
    name: string;
    avatarUrl: string;
};

const DESKRIPSI_ASPEK = {
    ADAB: {
        A: "Ananda telah menunjukkan adab yang sangat baik dan budi pekerti luhur dalam berinteraksi dengan Bapak/Ibu Guru serta teman sebaya. Mohon untuk terus dipertahankan.",
        B: "Adab dan perilaku Ananda secara umum sudah baik, namun masih perlu arahan dan bimbingan agar senantiasa menjaga tata krama dan lisan dalam pergaulan sehari-hari.",
        C: "Adab dan perilaku Ananda secara umum sudah baik, namun masih perlu arahan dan bimbingan agar senantiasa menjaga tata krama dan lisan dalam pergaulan sehari-hari.",
        D: "Ananda memerlukan perhatian dan bimbingan ekstra dari orang tua di rumah terkait etika dan kesantunan, agar dapat mencerminkan akhlak mulia sesuai harapan kita bersama."
    },
    KEDISIPLINAN: {
        A: "Ananda memiliki kedisiplinan yang sangat tinggi, senantiasa mematuhi aturan kelas, dan menjalankan tugas dengan penuh tanggung jawab.",
        B: "Kedisiplinan Ananda sudah cukup memadai, namun mohon bantuan orang tua untuk terus memotivasi agar lebih konsisten dalam mematuhi tata tertib sekolah.",
        C: "Kedisiplinan Ananda sudah cukup memadai, namun mohon bantuan orang tua untuk terus memotivasi agar lebih konsisten dalam mematuhi tata tertib sekolah.",
        D: "Tingkat kedisiplinan Ananda masih butuh perhatian khusus. Kami memohon sinergi dari orang tua untuk lebih intensif memantau dan membimbing kedisiplinan Ananda."
    },
    KERAPIAN: {
        A: "Ananda senantiasa menjaga kebersihan dan kerapian diri dengan konsisten, serta selalu mengenakan atribut seragam sekolah dengan sangat rapi.",
        B: "Kerapian Ananda terpantau cukup baik, namun sesekali masih perlu diingatkan terkait kelengkapan atribut seragam sekolah sesuai hari yang ditentukan.",
        C: "Kerapian Ananda terpantau cukup baik, namun sesekali masih perlu diingatkan terkait kelengkapan atribut seragam sekolah sesuai hari yang ditentukan.",
        D: "Ananda masih perlu bimbingan dalam menjaga kerapian berpenampilan. Mohon kerja sama orang tua untuk senantiasa mengecek seragam Ananda sebelum berangkat sekolah."
    }
};

export const ensureBintangLogosLoaded = async (): Promise<void> => {
    await ensureLogosLoaded();
};

export const generateBintangReportPdf = async (
    doc: jsPDF,
    reports: Array<{student: any, evaluation: any, aspects: any, violations?: any[]}>,
    monthName: string,
    printDate: string,
    user: AppUser | null
) => {
    await ensureBintangLogosLoaded();
    const { default: autoTable } = await getAutoTable();

    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 15;


    const PRIMARY_DARK = [7, 54, 66] as [number, number, number]; // #073642
    const MUTED = [71, 85, 105] as [number, number, number]; // slate-600
    const BORDER = [203, 213, 225] as [number, number, number]; // slate-300
    const BG_LIGHT = [248, 250, 252] as [number, number, number]; // slate-50

    for (let i = 0; i < reports.length; i++) {
        if (i > 0) {
            doc.addPage();
        }

        const report = reports[i];
        
        let currentY = addPdfHeader(doc, { schoolName: 'MI AL IRSYAD AL ISLAMIYYAH KOTA MADIUN' }) + 2; // Reduced gap

        // 2. Title
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(16);
        doc.setTextColor(PRIMARY_DARK[0], PRIMARY_DARK[1], PRIMARY_DARK[2]);
        doc.text("LAPORAN PROGRAM BINTANG", pageWidth / 2, currentY, { align: 'center' });
        
        currentY += 4;
        
        doc.setFont('helvetica', 'italic');
        doc.setFontSize(10);
        doc.setTextColor(MUTED[0], MUTED[1], MUTED[2]);
        doc.text("(Bina Tertib dan Tanggung Jawab)", pageWidth / 2, currentY, { align: 'center' });
        
        currentY += 5;

        // 3. Student Info Box
        const infoBoxHeight = 18;
        doc.setDrawColor(BORDER[0], BORDER[1], BORDER[2]);
        doc.setFillColor(BG_LIGHT[0], BG_LIGHT[1], BG_LIGHT[2]);
        doc.roundedRect(margin, currentY, pageWidth - (margin * 2), infoBoxHeight, 2, 2, 'FD');

        doc.setFontSize(9);
        
        const col1X = margin + 5;
        const col2X = pageWidth / 2 + 5;
        let lineY = currentY + 5;
        const lineSpacing = 5;

        // Row 1
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(MUTED[0], MUTED[1], MUTED[2]);
        doc.text("Nama Siswa", col1X, lineY);
        doc.text(":", col1X + 25, lineY);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(PRIMARY_DARK[0], PRIMARY_DARK[1], PRIMARY_DARK[2]);
        doc.text((report.student.name || '').toUpperCase(), col1X + 28, lineY);

        doc.setFont('helvetica', 'bold');
        doc.setTextColor(MUTED[0], MUTED[1], MUTED[2]);
        doc.text("Tahun Ajaran", col2X, lineY);
        doc.text(":", col2X + 25, lineY);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(PRIMARY_DARK[0], PRIMARY_DARK[1], PRIMARY_DARK[2]);
        doc.text("2026/2027", col2X + 28, lineY);

        lineY += lineSpacing;

        // Row 2
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(MUTED[0], MUTED[1], MUTED[2]);
        doc.text("Kelas", col1X, lineY);
        doc.text(":", col1X + 25, lineY);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(PRIMARY_DARK[0], PRIMARY_DARK[1], PRIMARY_DARK[2]);
        doc.text(report.student.classes?.name || '-', col1X + 28, lineY);

        doc.setFont('helvetica', 'bold');
        doc.setTextColor(MUTED[0], MUTED[1], MUTED[2]);
        doc.text("Semester", col2X, lineY);
        doc.text(":", col2X + 25, lineY);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(PRIMARY_DARK[0], PRIMARY_DARK[1], PRIMARY_DARK[2]);
        doc.text("Ganjil", col2X + 28, lineY);

        lineY += lineSpacing;

        // Row 3
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(MUTED[0], MUTED[1], MUTED[2]);
        doc.text("NIS/NISN", col1X, lineY);
        doc.text(":", col1X + 25, lineY);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(PRIMARY_DARK[0], PRIMARY_DARK[1], PRIMARY_DARK[2]);
        doc.text("- / -", col1X + 28, lineY);

        doc.setFont('helvetica', 'bold');
        doc.setTextColor(MUTED[0], MUTED[1], MUTED[2]);
        doc.text("Periode", col2X, lineY);
        doc.text(":", col2X + 25, lineY);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(PRIMARY_DARK[0], PRIMARY_DARK[1], PRIMARY_DARK[2]);
        doc.text((monthName || '').toUpperCase(), col2X + 28, lineY);

        currentY += infoBoxHeight + 5;

        const checkPageBreak = (requiredSpace: number) => {
            if (currentY + requiredSpace > pageHeight - margin) {
                doc.addPage();
                currentY = addPdfHeader(doc, { schoolName: 'MI AL IRSYAD AL ISLAMIYYAH KOTA MADIUN' }) + 5;
            }
        };

        // 4. Main Evaluation Table
        checkPageBreak(30);
        
        // Draw Table Header Box
        doc.setFillColor(PRIMARY_DARK[0], PRIMARY_DARK[1], PRIMARY_DARK[2]);
        doc.roundedRect(margin, currentY, pageWidth - (margin * 2), 7, 2, 2, 'F');
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(9);
        doc.setTextColor(255, 255, 255);
        doc.text("A. Rekapitulasi Penilaian Bintang", margin + 3, currentY + 5);
        
        currentY += 7;

        const adabScore = report.evaluation?.adab_score || report.aspects.ADAB.grade;
        const kedisiplinanScore = report.evaluation?.kedisiplinan_score || report.aspects.KEDISIPLINAN.grade;
        const kerapianScore = report.evaluation?.kerapian_score || report.aspects.KERAPIAN.grade;

        autoTable(doc, {
            startY: currentY,
            margin: { left: margin, right: margin },
            head: [['No', 'Aspek Penilaian', 'Nilai', 'Deskripsi']],
            body: [
                ['1', 'Adab', adabScore, DESKRIPSI_ASPEK.ADAB[adabScore as BintangGrade]],
                ['2', 'Kedisiplinan', kedisiplinanScore, DESKRIPSI_ASPEK.KEDISIPLINAN[kedisiplinanScore as BintangGrade]],
                ['3', 'Kerapian', kerapianScore, DESKRIPSI_ASPEK.KERAPIAN[kerapianScore as BintangGrade]]
            ],
            theme: 'grid',
            headStyles: {
                fillColor: [248, 250, 252],
                textColor: PRIMARY_DARK,
                fontStyle: 'bold',
                halign: 'center',
                lineWidth: 0.1,
                lineColor: BORDER
            },
            bodyStyles: {
                textColor: PRIMARY_DARK,
                fontSize: 9,
                lineWidth: 0.1,
                lineColor: BORDER,
                cellPadding: 2.5
            },
            columnStyles: {
                0: { halign: 'center', cellWidth: 10, textColor: MUTED },
                1: { fontStyle: 'bold', cellWidth: 35 },
                2: { halign: 'center', fontStyle: 'bold', cellWidth: 15, textColor: PRIMARY_DARK },
                3: { cellWidth: 'auto', textColor: MUTED, halign: 'justify' }
            },
            didDrawPage: (data: any) => {
                currentY = data.cursor?.y || currentY;
            }
        });

        currentY += 5;

        // 5. Rincian Poin Pelanggaran
        checkPageBreak(25);
        doc.setFillColor(PRIMARY_DARK[0], PRIMARY_DARK[1], PRIMARY_DARK[2]);
        doc.roundedRect(margin, currentY, pageWidth - (margin * 2), 7, 2, 2, 'F');
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(9);
        doc.setTextColor(255, 255, 255);
        doc.text("B. Rincian Poin Pelanggaran", margin + 3, currentY + 5);
        
        currentY += 7;

        if (!report.violations || report.violations.length === 0) {
            doc.setDrawColor(BORDER[0], BORDER[1], BORDER[2]);
            doc.setFillColor(255, 255, 255);
            doc.roundedRect(margin, currentY, pageWidth - (margin * 2), 12, 2, 2, 'FD');
            doc.setFont('helvetica', 'italic');
            doc.setFontSize(9);
            doc.setTextColor(MUTED[0], MUTED[1], MUTED[2]);
            doc.text("Alhamdulillah, Ananda tidak memiliki catatan poin pelanggaran pada bulan ini.", margin + 5, currentY + 7.5);
            currentY += 12;
        } else {
            const viosData = report.violations.map((v: any, idx: number) => {
                const vDate = new Date(v.date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
                return [
                    (idx + 1).toString(),
                    vDate,
                    v.description || '-',
                    v.points?.toString() || '0'
                ];
            });

            autoTable(doc, {
                startY: currentY,
                margin: { left: margin, right: margin },
                head: [['No', 'Tanggal', 'Jenis Pelanggaran', 'Poin']],
                body: viosData,
                theme: 'grid',
                headStyles: {
                    fillColor: [248, 250, 252],
                    textColor: PRIMARY_DARK,
                    fontStyle: 'bold',
                    halign: 'center',
                    lineWidth: 0.1,
                    lineColor: BORDER
                },
                bodyStyles: {
                    textColor: PRIMARY_DARK,
                    fontSize: 9,
                    lineWidth: 0.1,
                    lineColor: BORDER,
                    cellPadding: 2
                },
                columnStyles: {
                    0: { halign: 'center', cellWidth: 10, textColor: MUTED },
                    1: { halign: 'center', cellWidth: 30 },
                    2: { cellWidth: 'auto' },
                    3: { halign: 'center', cellWidth: 15, fontStyle: 'bold', textColor: [225, 29, 72] }
                },
                didDrawPage: (data: any) => {
                    currentY = data.cursor?.y || currentY;
                }
            });
        }

        currentY += 5;

        // 6. Catatan Wali Kelas
        checkPageBreak(25);
        
        doc.setFillColor(PRIMARY_DARK[0], PRIMARY_DARK[1], PRIMARY_DARK[2]);
        doc.roundedRect(margin, currentY, pageWidth - (margin * 2), 7, 2, 2, 'F');
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(9);
        doc.setTextColor(255, 255, 255);
        doc.text("C. Catatan Wali Kelas", margin + 3, currentY + 5);
        
        currentY += 7;
        
        doc.setDrawColor(BORDER[0], BORDER[1], BORDER[2]);
        doc.setFillColor(255, 255, 255);
        
        // Filter out old formal templates
        const formalTemplates = [
            "Ananda telah menunjukkan adab yang sangat baik dan budi pekerti luhur dalam berinteraksi dengan Bapak/Ibu Guru serta teman sebaya. Mohon untuk terus dipertahankan.",
            "Adab dan perilaku Ananda secara umum sudah baik, namun masih perlu arahan dan bimbingan agar senantiasa menjaga tata krama dan lisan dalam pergaulan sehari-hari.",
            "Ananda memerlukan perhatian dan bimbingan ekstra dari orang tua di rumah terkait etika dan kesantunan, agar dapat mencerminkan akhlak mulia sesuai harapan kita bersama.",
            "Ananda memiliki kedisiplinan yang sangat tinggi, senantiasa mematuhi aturan kelas, dan menjalankan tugas dengan penuh tanggung jawab.",
            "Kedisiplinan Ananda sudah cukup memadai, namun mohon bantuan orang tua untuk terus memotivasi agar lebih konsisten dalam mematuhi tata tertib sekolah.",
            "Tingkat kedisiplinan Ananda masih butuh perhatian khusus. Kami memohon sinergi dari orang tua untuk lebih intensif memantau dan membimbing kedisiplinan Ananda.",
            "Ananda senantiasa menjaga kebersihan dan kerapian diri dengan konsisten, serta selalu mengenakan atribut seragam sekolah dengan sangat rapi.",
            "Kerapian Ananda terpantau cukup baik, namun sesekali masih perlu diingatkan terkait kelengkapan atribut seragam sekolah sesuai hari yang ditentukan.",
            "Ananda masih perlu bimbingan dalam menjaga kerapian berpenampilan. Mohon kerja sama orang tua untuk senantiasa mengecek seragam Ananda sebelum berangkat sekolah.",
            "Sangat santun dan ramah kepada guru maupun teman.",
            "Mohon tingkatkan lagi tata krama saat berinteraksi.",
            "Pertahankan sikap saling menghargai di kelas.",
            "Sangat disiplin dan tepat waktu.",
            "Mohon perhatikan agar datang lebih awal.",
            "Tingkatkan fokus dan tidak mengobrol saat pelajaran.",
            "Selalu berpakaian rapi dan bersih.",
            "Mohon lengkapi atribut seragam sekolah.",
            "Perlu merapikan rambut sesuai tata tertib sekolah."
        ];
        const cleanNote = (n: string | undefined) => n && !formalTemplates.includes(n.trim()) ? n : '-';

        // Calculate notes box height dynamically based on content
        const notesWidth = pageWidth - (margin * 2) - 10;
        
        doc.setFontSize(9);
        
        const generalNotes = (report.evaluation?.catatan_wali && report.evaluation.catatan_wali.trim() !== '')
            ? report.evaluation.catatan_wali
            : (cleanNote(report.evaluation?.adab_notes) || '-');
        
        // Use doc.splitTextToSize to calculate height
        const notesLines = doc.splitTextToSize(generalNotes, notesWidth);
        
        const lineH = 5;
        const notesBoxHeight = 15 + (notesLines.length * lineH);
        
        doc.rect(margin, currentY, pageWidth - (margin * 2), notesBoxHeight, 'FD');
        
        const noteY = currentY + 10;
        
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(PRIMARY_DARK[0], PRIMARY_DARK[1], PRIMARY_DARK[2]);
        // Use justify alignment and pass the raw string with maxWidth
        doc.text(generalNotes, margin + 5, noteY, { align: 'justify', maxWidth: notesWidth });
        
        currentY += notesBoxHeight + 5;

        // 7. Signatures
        checkPageBreak(35);
        
        doc.setFillColor(PRIMARY_DARK[0], PRIMARY_DARK[1], PRIMARY_DARK[2]);
        doc.roundedRect(margin, currentY, pageWidth - (margin * 2), 7, 2, 2, 'F');
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(9);
        doc.setTextColor(255, 255, 255);
        doc.text("D. Pengesahan", margin + 3, currentY + 5);
        
        currentY += 7;

        const signatureBoxHeight = 40;
        doc.setDrawColor(BORDER[0], BORDER[1], BORDER[2]);
        doc.setFillColor(255, 255, 255);
        doc.rect(margin, currentY, pageWidth - (margin * 2), signatureBoxHeight, 'FD');

        // Divider line
        doc.line(pageWidth / 2, currentY, pageWidth / 2, currentY + signatureBoxHeight);

        // Parent Box (Left)
        doc.setFillColor(BG_LIGHT[0], BG_LIGHT[1], BG_LIGHT[2]);
        doc.rect(margin, currentY, (pageWidth - (margin * 2)) / 2, 6, 'F');
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(8);
        doc.setTextColor(PRIMARY_DARK[0], PRIMARY_DARK[1], PRIMARY_DARK[2]);
        doc.text("PIHAK ORANG TUA / WALI", margin + ((pageWidth - (margin * 2)) / 4), currentY + 4, { align: 'center' });

        doc.setFont('helvetica', 'normal');
        doc.setTextColor(MUTED[0], MUTED[1], MUTED[2]);
        doc.text("Mengetahui,", margin + ((pageWidth - (margin * 2)) / 4), currentY + 10, { align: 'center' });
        doc.setTextColor(PRIMARY_DARK[0], PRIMARY_DARK[1], PRIMARY_DARK[2]);
        doc.text("Orang Tua / Wali Murid", margin + ((pageWidth - (margin * 2)) / 4), currentY + 32, { align: 'center' });
        
        doc.setDrawColor(MUTED[0], MUTED[1], MUTED[2]);
        doc.setLineDashPattern([1, 1], 0);
        const parentLineX = margin + ((pageWidth - (margin * 2)) / 4);
        doc.line(parentLineX - 20, currentY + 36, parentLineX + 20, currentY + 36);
        doc.setLineDashPattern([], 0);
        doc.text("( ................................... )", parentLineX, currentY + 35, { align: 'center' });

        // Teacher Box (Right)
        doc.setFillColor(BG_LIGHT[0], BG_LIGHT[1], BG_LIGHT[2]);
        doc.rect(pageWidth / 2, currentY, (pageWidth - (margin * 2)) / 2, 6, 'F');
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(8);
        doc.setTextColor(PRIMARY_DARK[0], PRIMARY_DARK[1], PRIMARY_DARK[2]);
        doc.text("WALI KELAS", (pageWidth / 2) + ((pageWidth - (margin * 2)) / 4), currentY + 4, { align: 'center' });

        doc.setFont('helvetica', 'normal');
        doc.setTextColor(MUTED[0], MUTED[1], MUTED[2]);
        doc.text(`Madiun, ${printDate}`, (pageWidth / 2) + ((pageWidth - (margin * 2)) / 4), currentY + 10, { align: 'center' });
        
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(PRIMARY_DARK[0], PRIMARY_DARK[1], PRIMARY_DARK[2]);
        const teacherLineX = (pageWidth / 2) + ((pageWidth - (margin * 2)) / 4);
        const teacherName = (user?.name && user.name.trim() !== '') ? user.name.toUpperCase() : "...................................";
        doc.text(teacherName, teacherLineX, currentY + 35, { align: 'center' });
        
        const textWidth = doc.getTextWidth(teacherName);
        doc.setDrawColor(PRIMARY_DARK[0], PRIMARY_DARK[1], PRIMARY_DARK[2]);
        doc.setLineWidth(0.2);
        doc.line(teacherLineX - (textWidth / 2) - 2, currentY + 36, teacherLineX + (textWidth / 2) + 2, currentY + 36);

    }
};

export const downloadBintangReportAction = async ({
    studentId,
    classId,
    month,
    user
}: {
    studentId?: string;
    classId?: string;
    month: string;
    user: AppUser | null;
}) => {
    if (!studentId && !classId) return;

    let studentsToFetch: any[] = [];
    
    if (studentId) {
        const { data: sData, error: sError } = await supabase
            .from('students')
            .select('id, name, access_code, class_id')
            .eq('id', studentId)
            .single();
        if (sError) throw sError;
        
        let className = '-';
        if (sData.class_id) {
            const { data: cData } = await supabase
                .from('classes')
                .select('name')
                .eq('id', sData.class_id)
                .maybeSingle();
            if (cData) className = cData.name;
        }
        studentsToFetch = [{ ...sData, classes: { name: className } }];
    } else if (classId) {
        const { data: cData } = await supabase
            .from('classes')
            .select('name')
            .eq('id', classId)
            .maybeSingle();
        const className = cData?.name || '-';

        const { data: sData, error: sError } = await supabase
            .from('students')
            .select('id, name, access_code, class_id')
            .eq('class_id', classId)
            .is('deleted_at', null)
            .order('name', { ascending: true });
        if (sError) throw sError;
        studentsToFetch = (sData || []).map(s => ({ ...s, classes: { name: className } }));
    }

    if (studentsToFetch.length === 0) {
        throw new Error('Data siswa tidak ditemukan.');
    }

    const reports = [];

    for (const student of studentsToFetch) {
        const evals = await bintangService.getStudentEvaluations(student.id, false);
        const currentEval = evals.find(e => e.month === month);
        const vios = await bintangService.getViolationsForStudent(student.id, month);
        const aspects = calculateAspectPoints(vios);

        reports.push({
            student,
            evaluation: currentEval || null,
            aspects,
            violations: vios
        });
    }

    const { default: jsPDF } = await import('jspdf');
    const doc = new jsPDF();
    
    const monthDate = new Date(`${month}-01`);
    const monthName = monthDate.toLocaleDateString('id-ID', { month: 'long', year: 'numeric' });
    const printDate = new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });

    await generateBintangReportPdf(doc, reports, monthName, printDate, user);
    
    const fileName = classId 
        ? `Rapor_Bintang_Kelas_${reports[0]?.student?.classes?.name || classId}_${monthName.replace(/\s+/g, '_')}.pdf`
        : `Rapor_Bintang_${reports[0]?.student?.name?.replace(/\s+/g, '_') || 'Siswa'}_${monthName.replace(/\s+/g, '_')}.pdf`;
        
    doc.save(fileName);
};
