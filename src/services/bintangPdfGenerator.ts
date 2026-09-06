import jsPDF from 'jspdf';
import { getAutoTable } from '../utils/dynamicImports';
import { addPdfHeader, ensureLogosLoaded } from '../utils/pdfHeaderUtils';
import { BintangGrade, calculateAspectPoints } from './bintangService';
import { supabase } from './supabase';
import { formatExportDate } from '../utils/exportUtils';
import { formatDegreeProperly } from '../utils/greetingUtils';
import { generateContextualHomeroomNote } from '../components/pages/bintang/bintangConstants';



type AppUser = {
    id: string;
    email?: string;
    name: string;
    avatarUrl: string;
};

const DESKRIPSI_ASPEK = {
    ADAB: {
        A: "Ananda senantiasa menampilkan akhlakul karimah, bertutur kata santun, dan menghormati ustadz/ustadzah serta teman.",
        B: "Adab dan perilaku Ananda dinilai baik, mari terus dibimbing agar semakin santun dan berakhlak terpuji di madrasah.",
        C: "Adab dan tutur kata Ananda perlu bimbingan lebih di rumah agar senantiasa mencerminkan kesantunan pergaulan islami.",
        D: "Memerlukan bimbingan dan perhatian intensif dari orang tua terkait adab, sopan santun, dan pembiasaan akhlakul karimah."
    },
    KEDISIPLINAN: {
        A: "Sangat disiplin menaati tata tertib madrasah, tertib waktu, dan khusyuk mengikuti pembiasaan ibadah.",
        B: "Kedisiplinan Ananda cukup baik, sesekali masih perlu diingatkan untuk konsisten mematuhi aturan madrasah.",
        C: "Perlu motivasi dan pengawasan orang tua agar Ananda lebih disiplin hadir tepat waktu dan tertib saat KBM.",
        D: "Tingkat kedisiplinan memerlukan evaluasi serius dan kerja sama intensif antara madrasah dan orang tua di rumah."
    },
    KERAPIAN: {
        A: "Senantiasa menjaga kebersihan, kerapian seragam madrasah, serta kelengkapan atribut muslim/muslimah dengan istiqamah.",
        B: "Penampilan rapi, mohon pertahankan kelengkapan atribut seragam madrasah sesuai jadwal hari yang ditentukan.",
        C: "Kerapian seragam perlu dicek kembali sebelum berangkat ke madrasah agar senantiasa rapi, bersih, dan lengkap.",
        D: "Kerapian diri dan kelengkapan seragam madrasah sangat membutuhkan bimbingan dan pembiasaan dari orang tua di rumah."
    }
};

export const ensureBintangLogosLoaded = async (): Promise<void> => {
    await ensureLogosLoaded();
};

export const generateBintangReportPdf = async (
    doc: jsPDF,
    reports: Array<{
        student: { id: string; name?: string | null; classes?: { name?: string | null } | null; nis?: string | null; nisn?: string | null; class_id?: string | null; access_code?: string | null };
        evaluation: Record<string, string | number | boolean | null> | null;
        aspects: any;
        violations?: { date: string; description: string; points: number }[];
        quizPoints?: { quiz_name?: string | null; category?: string | null; points: number }[];
    }>,
    monthName: string,
    printDate: string,
    user: AppUser | null,
    options?: { schoolName?: string; academicYear?: string; semesterName?: string },
    onProgress?: (current: number, total: number) => void
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

    interface LayoutConfig {
        isTwoPageReport: boolean;
        expansionFactor: number;
        p1Expansion: number;
    }

    interface SingleReportRenderContext {
        autoTable: (d: jsPDF, opts: Record<string, unknown>) => void;
        pageWidth: number;
        pageHeight: number;
        margin: number;
        resolvedSchoolName: string;
        resolvedAcademicYear: string;
        resolvedSemester: string;
        monthName: string;
        printDate: string;
        user: AppUser | null;
    }

    const renderSingleBintangReport = (
        targetDoc: jsPDF,
        report: typeof reports[0],
        layoutConfig: LayoutConfig,
        ctx: SingleReportRenderContext
    ): { finalY: number; pageCount: number; p1ContentFinalY: number } => {
        const { isTwoPageReport, expansionFactor, p1Expansion } = layoutConfig;
        const { autoTable, pageWidth, margin, resolvedSchoolName, resolvedAcademicYear, resolvedSemester, monthName, printDate, user } = ctx;

        const reportStartPage = targetDoc.getNumberOfPages();
        addPdfHeader(targetDoc, { schoolName: resolvedSchoolName });
        let currentY = 41.5;

        // Resolve Notes, Aspects, and Metrics
        const adabScore = report.evaluation?.adab_score || report.aspects.ADAB.grade;
        const kedisiplinanScore = report.evaluation?.kedisiplinan_score || report.aspects.KEDISIPLINAN.grade;
        const kerapianScore = report.evaluation?.kerapian_score || report.aspects.KERAPIAN.grade;

        const hasQuiz = Boolean(report.quizPoints && report.quizPoints.length > 0);
        const catatanLetter = hasQuiz ? 'D' : 'C';
        const pengesahanLetter = hasQuiz ? 'E' : 'D';

        const formalTemplates = [
            "Ananda telah menunjukkan adab yang sangat baik dan budi pekerti luhur dalam berinteraksi dengan Bapak/Ibu Guru serta teman sebaya. Mohon untuk terus dipertahankan.",
            "Adab dan perilaku Ananda secara umum sudah baik, namun masih perlu arahan dan bimbingan agar senantiasa menjaga tata krama dan lisan dalam pergaulan sehari-hari.",
            "Adab Ananda masih perlu banyak bimbingan. Mohon perhatian orang tua untuk membantu Ananda memperbaiki tata krama dan sopan santun dalam pergaulan sehari-hari.",
            "Ananda memerlukan perhatian dan bimbingan ekstra dari orang tua di rumah terkait etika dan kesantunan, agar dapat mencerminkan akhlak mulia sesuai harapan kita bersama.",
            "Ananda memiliki kedisiplinan yang sangat tinggi, senantiasa mematuhi aturan kelas, dan menjalankan tugas dengan penuh tanggung jawab.",
            "Kedisiplinan Ananda sudah cukup memadai, namun mohon bantuan orang tua untuk terus memotivasi agar lebih konsisten dalam mematuhi tata tertib sekolah.",
            "Kedisiplinan Ananda masih kurang konsisten. Mohon bantuan orang tua untuk lebih tegas mengawasi kepatuhan Ananda terhadap jadwal dan aturan sekolah.",
            "Tingkat kedisiplinan Ananda masih butuh perhatian khusus. Kami memohon sinergi dari orang tua untuk lebih intensif memantau dan membimbing kedisiplinan Ananda.",
            "Ananda senantiasa menjaga kebersihan dan kerapian diri dengan konsisten, serta selalu mengenakan atribut seragam sekolah dengan sangat rapi.",
            "Kerapian Ananda terpantau cukup baik, namun sesekali masih perlu diingatkan terkait kelengkapan atribut seragam sekolah sesuai hari yang ditentukan.",
            "Kerapian Ananda masih perlu banyak perbaikan. Mohon orang tua membiasakan Ananda untuk selalu mengecek kelengkapan dan kerapian seragam sebelum berangkat sekolah.",
            "Ananda masih perlu bimbingan dalam menjaga kerapian berpenampilan. Mohon kerja sama orang tua untuk senantiasa mengecek seragam Ananda sebelum berangkat sekolah.",
            "Sangat santun dan ramah kepada guru maupun teman.",
            "Mohon tingkatkan lagi tata krama saat berinteraksi.",
            "Pertahankan sikap saling menghargai di kelas.",
            "Sangat disiplin dan tepat waktu.",
            "Mohon perhatikan agar datang lebih awal.",
            "Tingkatkan fokus dan tidak mengobrol saat pelajaran.",
            "Selalu berpakaian rapi dan bersih.",
            "Mohon lengkapi atribut seragam sekolah.",
            "Perlu merapikan rambut sesuai tata tertib sekolah.",
            "Sangat membutuhkan bimbingan intensif dari Ayah/Bunda di rumah terkait adab, sopan santun, dan pembiasaan akhlakul karimah.",
            "Tingkat kedisiplinan Ananda memerlukan perhatian dan kerja sama pengawasan yang intensif antara madrasah dan Ayah/Bunda di rumah.",
            "Kerapian dan kelengkapan seragam madrasah sangat perlu bimbingan dan pembiasaan rutin dari Ayah/Bunda di rumah."
        ];
        const cleanNote = (n: string | undefined) => n && !formalTemplates.includes(n.trim()) ? n : '-';

        const notesWidth = pageWidth - (margin * 2) - 8;
        targetDoc.setFontSize(8.5);

        const catatanWaliStr = report.evaluation?.catatan_wali ? String(report.evaluation.catatan_wali) : '';
        const adabNotesStr = report.evaluation?.adab_notes ? String(report.evaluation.adab_notes) : undefined;
        let generalNotes = (catatanWaliStr.trim() !== '')
            ? catatanWaliStr.trim()
            : (cleanNote(adabNotesStr) || '-');

        if (generalNotes === '-') {
            generalNotes = generateContextualHomeroomNote({
                studentName: report.student.name || undefined,
                adabGrade: adabScore as BintangGrade,
                kedisGrade: kedisiplinanScore as BintangGrade,
                kerapianGrade: kerapianScore as BintangGrade,
                activePoints: report.quizPoints?.reduce((s, q) => s + (q.points || 0), 0) || 0,
                violations: report.violations?.map(v => ({ description: v.description, points: v.points })) || [],
                seed: report.student.id
            });
        }

        const notesLines = targetDoc.splitTextToSize(generalNotes, notesWidth);
        const notesLinesCount = notesLines.length;

        // Group quiz points if present
        const groupedQP = new Map<string, { activity: string; count: number; totalPoints: number }>();
        if (hasQuiz && report.quizPoints) {
            report.quizPoints.forEach((item: { quiz_name?: string | null; category?: string | null; points: number }) => {
                const activity = item.quiz_name || item.category || 'Aktivitas';
                const current = groupedQP.get(activity);
                if (current) {
                    current.count += 1;
                    current.totalPoints += item.points;
                } else {
                    groupedQP.set(activity, { activity, count: 1, totalPoints: item.points });
                }
            });
        }

        // Dynamically calibrated sizing parameters
        const sectionGap = isTwoPageReport ? (4.5 + (p1Expansion * 2.0)) : (3.2 + (expansionFactor * 2.0));
        const titleSubtitleGap = isTwoPageReport ? (4.0 + (p1Expansion * 1.0)) : (3.6 + (expansionFactor * 0.8));
        const titleBottomGap = isTwoPageReport ? (4.2 + (p1Expansion * 1.8)) : (3.8 + (expansionFactor * 1.4));

        const infoBoxHeight = isTwoPageReport ? (18.0 + (p1Expansion * 3.0)) : (16.0 + (expansionFactor * 3.0));
        const infoTopPadding = isTwoPageReport ? (3.8 + (p1Expansion * 0.8)) : (3.6 + (expansionFactor * 0.8));
        const infoLineSpacing = isTwoPageReport ? (4.6 + (p1Expansion * 1.0)) : (4.0 + (expansionFactor * 0.7));

        const tableACellPadding = isTwoPageReport ? (1.6 + (p1Expansion * 0.6)) : (1.2 + (expansionFactor * 0.5));
        const tableAFontSize = isTwoPageReport ? 8.5 : (8.0 + (expansionFactor * 0.4));

        const tableBCellPadding = isTwoPageReport ? (1.3 + (p1Expansion * 0.4)) : (1.1 + (expansionFactor * 0.4));
        const tableBFontSize = isTwoPageReport ? 8.5 : (8.0 + (expansionFactor * 0.4));

        const notesLineH = isTwoPageReport ? 4.8 : (3.4 + (expansionFactor * 0.5));
        const notesBasePadding = isTwoPageReport ? 8.0 : (3.5 + (expansionFactor * 2.0));
        const notesBoxHeight = isTwoPageReport
            ? Math.max(50.0, notesBasePadding + (notesLinesCount * notesLineH))
            : Math.max(12.0, notesBasePadding + (notesLinesCount * notesLineH) + (expansionFactor * 3.5));

        const signatureBoxHeight = isTwoPageReport ? 55.0 : (25.0 + (expansionFactor * 6.0));
        const p2SectionGap = isTwoPageReport ? 16.0 : sectionGap;

        // Helper: Section header bar
        const renderSectionHeader = (title: string) => {
            const barHeight = isTwoPageReport ? 6.0 : (5.2 + (expansionFactor * 0.5));
            targetDoc.setFillColor(PRIMARY_DARK[0], PRIMARY_DARK[1], PRIMARY_DARK[2]);
            targetDoc.roundedRect(margin, currentY, pageWidth - (margin * 2), barHeight, 1.5, 1.5, 'F');
            targetDoc.setFont('helvetica', 'bold');
            targetDoc.setFontSize(8.5);
            targetDoc.setTextColor(255, 255, 255);
            targetDoc.text(title, margin + 3, currentY + (barHeight * 0.68));
            currentY += barHeight + 0.8;
        };

        // Title
        targetDoc.setFont('helvetica', 'bold');
        targetDoc.setFontSize(14);
        targetDoc.setTextColor(PRIMARY_DARK[0], PRIMARY_DARK[1], PRIMARY_DARK[2]);
        targetDoc.text("LAPORAN PROGRAM BINTANG", pageWidth / 2, currentY, { align: 'center' });
        
        currentY += titleSubtitleGap;
        
        targetDoc.setFont('helvetica', 'italic');
        targetDoc.setFontSize(8.5);
        targetDoc.setTextColor(MUTED[0], MUTED[1], MUTED[2]);
        targetDoc.text("(Bina Tertib dan Tanggung Jawab)", pageWidth / 2, currentY, { align: 'center' });
        
        currentY += titleBottomGap;

        // Student Info Box
        const hasNisNisn = !!(report.student.nis || report.student.nisn);
        targetDoc.setDrawColor(BORDER[0], BORDER[1], BORDER[2]);
        targetDoc.setFillColor(BG_LIGHT[0], BG_LIGHT[1], BG_LIGHT[2]);
        targetDoc.roundedRect(margin, currentY, pageWidth - (margin * 2), infoBoxHeight, 1.5, 1.5, 'FD');

        targetDoc.setFontSize(8.5);
        
        const col1X = margin + 4;
        const col2X = pageWidth / 2 + 4;
        let lineY = currentY + infoTopPadding;
        const colonOffset = 21;
        const valueOffset = 24;

        // Row 1
        targetDoc.setFont('helvetica', 'bold');
        targetDoc.setTextColor(MUTED[0], MUTED[1], MUTED[2]);
        targetDoc.text("Nama Siswa", col1X, lineY);
        targetDoc.text(":", col1X + colonOffset, lineY);
        targetDoc.setFont('helvetica', 'normal');
        targetDoc.setTextColor(PRIMARY_DARK[0], PRIMARY_DARK[1], PRIMARY_DARK[2]);
        targetDoc.text((report.student.name || '').toUpperCase(), col1X + valueOffset, lineY);

        targetDoc.setFont('helvetica', 'bold');
        targetDoc.setTextColor(MUTED[0], MUTED[1], MUTED[2]);
        targetDoc.text("Tahun Ajaran", col2X, lineY);
        targetDoc.text(":", col2X + colonOffset, lineY);
        targetDoc.setFont('helvetica', 'normal');
        targetDoc.setTextColor(PRIMARY_DARK[0], PRIMARY_DARK[1], PRIMARY_DARK[2]);
        targetDoc.text(resolvedAcademicYear, col2X + valueOffset, lineY);

        lineY += infoLineSpacing;

        // Row 2
        targetDoc.setFont('helvetica', 'bold');
        targetDoc.setTextColor(MUTED[0], MUTED[1], MUTED[2]);
        targetDoc.text("Kelas", col1X, lineY);
        targetDoc.text(":", col1X + colonOffset, lineY);
        targetDoc.setFont('helvetica', 'normal');
        targetDoc.setTextColor(PRIMARY_DARK[0], PRIMARY_DARK[1], PRIMARY_DARK[2]);
        targetDoc.text(report.student.classes?.name || '-', col1X + valueOffset, lineY);

        targetDoc.setFont('helvetica', 'bold');
        targetDoc.setTextColor(MUTED[0], MUTED[1], MUTED[2]);
        targetDoc.text("Semester", col2X, lineY);
        targetDoc.text(":", col2X + colonOffset, lineY);
        targetDoc.setFont('helvetica', 'normal');
        targetDoc.setTextColor(PRIMARY_DARK[0], PRIMARY_DARK[1], PRIMARY_DARK[2]);
        targetDoc.text(resolvedSemester, col2X + valueOffset, lineY);

        lineY += infoLineSpacing;

        // Row 3
        if (hasNisNisn) {
            targetDoc.setFont('helvetica', 'bold');
            targetDoc.setTextColor(MUTED[0], MUTED[1], MUTED[2]);
            targetDoc.text("NIS/NISN", col1X, lineY);
            targetDoc.text(":", col1X + colonOffset, lineY);
            targetDoc.setFont('helvetica', 'normal');
            targetDoc.setTextColor(PRIMARY_DARK[0], PRIMARY_DARK[1], PRIMARY_DARK[2]);
            const nisPart = report.student.nis || '(tidak ada)';
            const nisnPart = report.student.nisn || '(tidak ada)';
            targetDoc.text(nisPart + " / " + nisnPart, col1X + valueOffset, lineY);

            targetDoc.setFont('helvetica', 'bold');
            targetDoc.setTextColor(MUTED[0], MUTED[1], MUTED[2]);
            targetDoc.text("Periode", col2X, lineY);
            targetDoc.text(":", col2X + colonOffset, lineY);
            targetDoc.setFont('helvetica', 'normal');
            targetDoc.setTextColor(PRIMARY_DARK[0], PRIMARY_DARK[1], PRIMARY_DARK[2]);
            targetDoc.text((monthName || '').toUpperCase(), col2X + valueOffset, lineY);
        } else {
            targetDoc.setFont('helvetica', 'bold');
            targetDoc.setTextColor(MUTED[0], MUTED[1], MUTED[2]);
            targetDoc.text("Periode", col1X, lineY);
            targetDoc.text(":", col1X + colonOffset, lineY);
            targetDoc.setFont('helvetica', 'normal');
            targetDoc.setTextColor(PRIMARY_DARK[0], PRIMARY_DARK[1], PRIMARY_DARK[2]);
            targetDoc.text((monthName || '').toUpperCase(), col1X + valueOffset, lineY);
        }

        currentY += infoBoxHeight + sectionGap;

        // 6. Main Evaluation Table (Section A)
        renderSectionHeader("A. Rekapitulasi Penilaian Bintang");

        autoTable(targetDoc, {
            startY: currentY,
            margin: { left: margin, right: margin, bottom: 14 },
            pageBreak: 'avoid',
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
                lineColor: BORDER,
                fontSize: tableAFontSize + 0.5,
                cellPadding: tableACellPadding
            },
            bodyStyles: {
                textColor: PRIMARY_DARK,
                fontSize: tableAFontSize,
                lineWidth: 0.1,
                lineColor: BORDER,
                cellPadding: tableACellPadding
            },
            columnStyles: {
                0: { halign: 'center', cellWidth: 10, textColor: MUTED },
                1: { fontStyle: 'bold', cellWidth: 32 },
                2: { halign: 'center', fontStyle: 'bold', cellWidth: 12, textColor: PRIMARY_DARK },
                3: { cellWidth: 'auto', textColor: MUTED, halign: 'justify' }
            },
            didDrawPage: (data: { cursor?: { y: number } | null }) => {
                currentY = data.cursor?.y || currentY;
            }
        });

        currentY += sectionGap;

        // 7. Rincian Poin Pelanggaran (Section B)
        renderSectionHeader("B. Rincian Poin Pelanggaran");

        if (!report.violations || report.violations.length === 0) {
            const noVioBoxHeight = 8.5 + (expansionFactor * 3.5);
            targetDoc.setDrawColor(BORDER[0], BORDER[1], BORDER[2]);
            targetDoc.setFillColor(255, 255, 255);
            targetDoc.roundedRect(margin, currentY, pageWidth - (margin * 2), noVioBoxHeight, 1.5, 1.5, 'FD');
            targetDoc.setFont('helvetica', 'italic');
            targetDoc.setFontSize(tableBFontSize);
            targetDoc.setTextColor(MUTED[0], MUTED[1], MUTED[2]);
            targetDoc.text("Tidak terdapat catatan pelanggaran bulan ini. Ananda telah menunjukkan akhlak dan kedisiplinan yang baik sesuai tata tertib madrasah.", margin + 4, currentY + (noVioBoxHeight * 0.58));
            currentY += noVioBoxHeight + sectionGap;
        } else {
            const totalPoin = report.violations.reduce((sum, v) => sum + (v.points || 0), 0);
            const viosData = report.violations.map((v: { date: string; description: string; points: number }, idx: number) => {
                const vDate = new Date(v.date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
                return [
                    (idx + 1).toString(),
                    vDate,
                    v.description || '-',
                    v.points?.toString() || '0'
                ];
            });

            // Add TOTAL row
            viosData.push(['', 'TOTAL', `${report.violations.length} pelanggaran`, totalPoin.toString()]);

            autoTable(targetDoc, {
                startY: currentY,
                margin: { left: margin, right: margin, bottom: 14 },
                head: [['No', 'Tanggal', 'Jenis Pelanggaran', 'Poin']],
                body: viosData,
                theme: 'grid',
                headStyles: {
                    fillColor: [248, 250, 252],
                    textColor: PRIMARY_DARK,
                    fontStyle: 'bold',
                    halign: 'center',
                    lineWidth: 0.1,
                    lineColor: BORDER,
                    fontSize: tableBFontSize + 0.5,
                    cellPadding: tableBCellPadding
                },
                bodyStyles: {
                    textColor: PRIMARY_DARK,
                    fontSize: tableBFontSize,
                    lineWidth: 0.1,
                    lineColor: BORDER,
                    cellPadding: tableBCellPadding
                },
                columnStyles: {
                    0: { halign: 'center', cellWidth: 10, textColor: MUTED },
                    1: { halign: 'center', cellWidth: 26 },
                    2: { cellWidth: 'auto' },
                    3: { halign: 'center', cellWidth: 14, fontStyle: 'bold', textColor: [225, 29, 72] }
                },
                didParseCell: (data: { row: { index: number }; table: { body: unknown[] }; column: { index: number }; cell: { styles: { fillColor?: number[]; fontStyle?: string; textColor?: number[] } } }) => {
                    // Highlight TOTAL row with amber background
                    if (data.row.index === data.table.body.length - 1) {
                        data.cell.styles.fillColor = [254, 243, 199]; // amber-100
                        data.cell.styles.fontStyle = 'bold';
                        if (data.column.index === 3) {
                            data.cell.styles.textColor = [180, 83, 9]; // amber-700
                        }
                    }
                },
                didDrawPage: (data: { cursor?: { y: number } | null }) => {
                    currentY = data.cursor?.y || currentY;
                }
            });
            currentY += sectionGap;
        }

        // 8. Rincian Poin Keaktifan & Prestasi (Section C - Conditional)
        let p1ContentFinalY = currentY;
        if (hasQuiz && report.quizPoints) {
            const estC = 6.0 + 10.0 + (groupedQP.size * 5.0);
            if (targetDoc.getCurrentPageInfo().pageNumber === reportStartPage && (currentY + estC > 268)) {
                targetDoc.addPage();
                addPdfHeader(targetDoc, { schoolName: resolvedSchoolName });
                currentY = 41.5;
            }

            renderSectionHeader("C. Rincian Poin Keaktifan & Prestasi");

            const qpData = Array.from(groupedQP.values())
                .sort((a, b) => b.totalPoints - a.totalPoints)
                .map((q, idx) => [
                    (idx + 1).toString(),
                    q.activity,
                    q.count + 'x',
                    q.totalPoints.toString()
                ]);

            autoTable(targetDoc, {
                startY: currentY,
                margin: { left: margin, right: margin, bottom: 14 },
                pageBreak: 'avoid',
                head: [['No', 'Kegiatan / Prestasi', 'Frekuensi', 'Total Poin']],
                body: qpData,
                theme: 'grid',
                headStyles: {
                    fillColor: [248, 250, 252],
                    textColor: PRIMARY_DARK,
                    fontStyle: 'bold',
                    halign: 'center',
                    lineWidth: 0.1,
                    lineColor: BORDER,
                    fontSize: tableBFontSize + 0.5,
                    cellPadding: tableBCellPadding
                },
                bodyStyles: {
                    textColor: PRIMARY_DARK,
                    fontSize: tableBFontSize,
                    lineWidth: 0.1,
                    lineColor: BORDER,
                    cellPadding: tableBCellPadding
                },
                columnStyles: {
                    0: { halign: 'center', cellWidth: 10, textColor: MUTED },
                    1: { cellWidth: 'auto' },
                    2: { halign: 'center', cellWidth: 26, fontStyle: 'bold' },
                    3: { halign: 'center', cellWidth: 22, fontStyle: 'bold', textColor: [5, 150, 105] } // emerald-600
                },
                didDrawPage: (data: { cursor?: { y: number } | null }) => {
                    currentY = data.cursor?.y || currentY;
                }
            });
            currentY += (targetDoc.getCurrentPageInfo().pageNumber > reportStartPage ? p2SectionGap : sectionGap);
            if (targetDoc.getCurrentPageInfo().pageNumber === reportStartPage) {
                p1ContentFinalY = currentY;
            }
        }

        // 9. Multi-Page Split & Anti-Orphan Protection
        const sectionHeaderHeight = (isTwoPageReport ? 6.0 : (5.2 + (expansionFactor * 0.5))) + 0.8;
        const currentGap = targetDoc.getCurrentPageInfo().pageNumber > reportStartPage ? p2SectionGap : sectionGap;
        const totalNotesSpace = sectionHeaderHeight + notesBoxHeight + currentGap;
        const totalSigSpace = sectionHeaderHeight + signatureBoxHeight;
        const combinedNotesAndSigSpace = totalNotesSpace + totalSigSpace;

        if (targetDoc.getCurrentPageInfo().pageNumber === reportStartPage && (isTwoPageReport || (currentY + combinedNotesAndSigSpace > 272))) {
            targetDoc.addPage();
            addPdfHeader(targetDoc, { schoolName: resolvedSchoolName });
            currentY = 44.0;
        }

        // Render Catatan Wali Kelas
        renderSectionHeader(`${catatanLetter}. Catatan Wali Kelas`);

        targetDoc.setDrawColor(BORDER[0], BORDER[1], BORDER[2]);
        targetDoc.setFillColor(255, 255, 255);
        targetDoc.rect(margin, currentY, pageWidth - (margin * 2), notesBoxHeight, 'FD');

        targetDoc.setFont('helvetica', 'normal');
        targetDoc.setFontSize(isTwoPageReport ? 9.0 : (8.5 + (expansionFactor * 0.5)));
        targetDoc.setTextColor(PRIMARY_DARK[0], PRIMARY_DARK[1], PRIMARY_DARK[2]);
        targetDoc.text(generalNotes, margin + 4, currentY + (isTwoPageReport ? 5.0 : (3.8 + (expansionFactor * 0.8))), {
            align: 'justify',
            maxWidth: notesWidth,
            lineHeightFactor: isTwoPageReport ? 1.45 : (1.15 + (expansionFactor * 0.15))
        });

        currentY += notesBoxHeight + (targetDoc.getCurrentPageInfo().pageNumber > reportStartPage ? p2SectionGap : sectionGap);

        // Render Pengesahan (Signatures)
        if (targetDoc.getCurrentPageInfo().pageNumber === reportStartPage && (currentY + totalSigSpace > 272)) {
            targetDoc.addPage();
            addPdfHeader(targetDoc, { schoolName: resolvedSchoolName });
            currentY = 44.0;
        }

        renderSectionHeader(`${pengesahanLetter}. Pengesahan`);

        targetDoc.setDrawColor(BORDER[0], BORDER[1], BORDER[2]);
        targetDoc.setFillColor(255, 255, 255);
        targetDoc.rect(margin, currentY, pageWidth - (margin * 2), signatureBoxHeight, 'FD');

        // Divider line in middle
        targetDoc.line(pageWidth / 2, currentY, pageWidth / 2, currentY + signatureBoxHeight);

        const halfBoxWidth = (pageWidth - (margin * 2)) / 2;
        const leftCenterX = margin + (halfBoxWidth / 2);
        const rightCenterX = (pageWidth / 2) + (halfBoxWidth / 2);

        // Header strips
        const stripHeight = isTwoPageReport ? 6.0 : (5.0 + (expansionFactor * 0.5));
        targetDoc.setFillColor(BG_LIGHT[0], BG_LIGHT[1], BG_LIGHT[2]);
        targetDoc.rect(margin, currentY, halfBoxWidth, stripHeight, 'F');
        targetDoc.rect(pageWidth / 2, currentY, halfBoxWidth, stripHeight, 'F');
        targetDoc.setDrawColor(BORDER[0], BORDER[1], BORDER[2]);
        targetDoc.line(margin, currentY + stripHeight, pageWidth - margin, currentY + stripHeight);

        // Header titles
        targetDoc.setFont('helvetica', 'bold');
        targetDoc.setFontSize(isTwoPageReport ? 8.5 : (8.0 + (expansionFactor * 0.5)));
        targetDoc.setTextColor(PRIMARY_DARK[0], PRIMARY_DARK[1], PRIMARY_DARK[2]);
        targetDoc.text("PIHAK ORANG TUA / WALI", leftCenterX, currentY + (stripHeight * 0.7), { align: 'center' });
        targetDoc.text("WALI KELAS", rightCenterX, currentY + (stripHeight * 0.7), { align: 'center' });

        // Subtitle (Date)
        const subtitleY = currentY + stripHeight + (isTwoPageReport ? 4.5 : (3.5 + (expansionFactor * 0.5)));
        targetDoc.setFont('helvetica', 'normal');
        targetDoc.setFontSize(isTwoPageReport ? 8.0 : (7.5 + (expansionFactor * 0.5)));
        targetDoc.setTextColor(MUTED[0], MUTED[1], MUTED[2]);
        targetDoc.text("Mengetahui,", leftCenterX, subtitleY, { align: 'center' });
        targetDoc.text(`Madiun, ${printDate}`, rightCenterX, subtitleY, { align: 'center' });

        // Signer names & lines
        const signerLineY = currentY + signatureBoxHeight - (isTwoPageReport ? 7.5 : (3.5 + (expansionFactor * 1.0)));
        const parentRoleY = signerLineY - (isTwoPageReport ? 5.5 : (3.5 + (expansionFactor * 0.5)));

        targetDoc.setFont('helvetica', 'normal');
        targetDoc.setFontSize(isTwoPageReport ? 8.0 : (7.5 + (expansionFactor * 0.5)));
        targetDoc.setTextColor(MUTED[0], MUTED[1], MUTED[2]);
        targetDoc.text("Orang Tua / Wali Murid", leftCenterX, parentRoleY, { align: 'center' });
        targetDoc.setFontSize(isTwoPageReport ? 8.5 : (8.0 + (expansionFactor * 0.5)));
        targetDoc.setTextColor(PRIMARY_DARK[0], PRIMARY_DARK[1], PRIMARY_DARK[2]);
        targetDoc.text("( ................................... )", leftCenterX, signerLineY, { align: 'center' });

        const hasValidTeacherName = !!(user?.name && user.name.trim() !== '' && user.name.trim().toLowerCase() !== 'wali kelas');
        const teacherName = hasValidTeacherName ? formatDegreeProperly(user.name.trim()) : "...................................";
        targetDoc.setFont('helvetica', 'bold');
        targetDoc.setFontSize(isTwoPageReport ? 8.5 : (8.0 + (expansionFactor * 0.5)));
        targetDoc.setTextColor(PRIMARY_DARK[0], PRIMARY_DARK[1], PRIMARY_DARK[2]);
        targetDoc.text(teacherName, rightCenterX, signerLineY, { align: 'center' });

        const textWidth = targetDoc.getTextWidth(teacherName);
        targetDoc.setDrawColor(PRIMARY_DARK[0], PRIMARY_DARK[1], PRIMARY_DARK[2]);
        targetDoc.setLineWidth(0.2);
        targetDoc.line(rightCenterX - (textWidth / 2) - 2, signerLineY + 1.0, rightCenterX + (textWidth / 2) + 2, signerLineY + 1.0);

        currentY += signatureBoxHeight;

        const pageCount = targetDoc.getNumberOfPages() - reportStartPage + 1;
        return {
            finalY: currentY,
            pageCount,
            p1ContentFinalY
        };
    };

    const resolvedSchoolName = options?.schoolName || 'MI AL IRSYAD AL ISLAMIYYAH KOTA MADIUN';
    const resolvedAcademicYear = options?.academicYear || '2026/2027';
    const resolvedSemester = options?.semesterName || 'Ganjil';

    const renderCtx: SingleReportRenderContext = {
        autoTable: autoTable as (d: jsPDF, opts: Record<string, unknown>) => void,
        pageWidth,
        pageHeight,
        margin,
        resolvedSchoolName,
        resolvedAcademicYear,
        resolvedSemester,
        monthName,
        printDate,
        user
    };

    const totalReports = reports.length;
    for (let i = 0; i < totalReports; i++) {
        // Report progress before generating each student's page
        onProgress?.(i + 1, totalReports);

        const report = reports[i];

        // =========================================================================
        // PASS 1: VIRTUAL DRY-RUN MEASUREMENT
        // =========================================================================
        const probeDoc = new jsPDF();
        const probe1 = renderSingleBintangReport(
            probeDoc,
            report,
            { isTwoPageReport: false, expansionFactor: 0, p1Expansion: 0 },
            renderCtx
        );

        let isTwoPageReport = false;
        let expansionFactor = 0;
        let p1Expansion = 0;

        if (probe1.pageCount === 1 && probe1.finalY <= 268) {
            // Fits cleanly on 1 page!
            isTwoPageReport = false;
            const remainingSpace = Math.max(0, 258 - probe1.finalY);
            // Dynamic scaling: allows expansionFactor up to 2.2 for low-content students
            let targetExpansion = Math.min(2.2, Math.max(0, remainingSpace / 22));

            // Verify with an in-memory probe that targetExpansion does not cause overflow
            if (targetExpansion > 0.2) {
                const testDoc = new jsPDF();
                const testProbe = renderSingleBintangReport(
                    testDoc,
                    report,
                    { isTwoPageReport: false, expansionFactor: targetExpansion, p1Expansion: 0 },
                    renderCtx
                );
                if (testProbe.pageCount > 1 || testProbe.finalY > 268) {
                    // Back off to guaranteed safe expansion
                    targetExpansion = Math.max(0, Math.min(1.0, (258 - probe1.finalY) / 50));
                }
            }
            expansionFactor = targetExpansion;
            p1Expansion = 0;
        } else {
            // Definitively requires 2 pages!
            isTwoPageReport = true;
            expansionFactor = 0;

            const probe2Doc = new jsPDF();
            const probe2 = renderSingleBintangReport(
                probe2Doc,
                report,
                { isTwoPageReport: true, expansionFactor: 0, p1Expansion: 0 },
                renderCtx
            );

            // probe2.p1ContentFinalY is the physically measured final Y on Page 1!
            const p1Remaining = Math.max(0, 252 - probe2.p1ContentFinalY);
            p1Expansion = Math.min(1.0, Math.max(0, p1Remaining / 20));
        }

        // =========================================================================
        // PASS 2: FINAL PRECISION RENDER ONTO ACTUAL DOCUMENT
        // =========================================================================
        if (i > 0) {
            doc.addPage();
        }

        renderSingleBintangReport(
            doc,
            report,
            { isTwoPageReport, expansionFactor, p1Expansion },
            renderCtx
        );
    }

    // ── Page numbers (footer on every page) ──────────────────────────────────
    const pageCount = doc.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(MUTED[0], MUTED[1], MUTED[2]);

        // Separator line
        doc.setDrawColor(BORDER[0], BORDER[1], BORDER[2]);
        doc.setLineWidth(0.3);
        doc.line(margin, pageHeight - 14, pageWidth - margin, pageHeight - 14);

        // Page number on the right
        doc.text(
            `Halaman ${i} dari ${pageCount}`,
            pageWidth - margin,
            pageHeight - 7,
            { align: 'right' }
        );

        // App name on the left
        doc.text(
            'Portal Guru — Program BINTANG',
            margin,
            pageHeight - 7
        );
    }
};

export const downloadBintangReportAction = async ({
    studentId,
    classId,
    month,
    user,
    onProgress
}: {
    studentId?: string;
    classId?: string;
    month: string;
    user: AppUser | null;
    onProgress?: (current: number, total: number) => void;
}) => {
    if (!studentId && !classId) return;

    let studentsToFetch: Array<{ id: string; name?: string | null; access_code?: string | null; class_id?: string | null; nis?: string | null; nisn?: string | null; classes?: { name: string | null } | null }> = [];
    let classUserId: string | null = null;
    
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
                .select('name, user_id, wali_kelas_id')
                .eq('id', sData.class_id)
                .maybeSingle();
            if (cData) {
                className = cData.name;
                classUserId = cData.wali_kelas_id || cData.user_id || null;
            }
        }
        studentsToFetch = [{ ...sData, classes: { name: className } }];
    } else if (classId) {
        const { data: cData } = await supabase
            .from('classes')
            .select('name, user_id, wali_kelas_id')
            .eq('id', classId)
            .maybeSingle();
        const className = cData?.name || '-';
        classUserId = cData?.wali_kelas_id || cData?.user_id || null;

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

    // Resolve teacher name from user or homeroom teacher profile in user_roles
    let effectiveTeacherName = (user?.name && user.name.trim() !== '' && user.name.trim().toLowerCase() !== 'wali kelas')
        ? user.name.trim()
        : '';

    if (!effectiveTeacherName && classUserId) {
        try {
            const { data: roleData } = await supabase
                .from('user_roles')
                .select('full_name')
                .eq('user_id', classUserId)
                .maybeSingle();
            if (roleData?.full_name?.trim()) {
                effectiveTeacherName = roleData.full_name.trim();
            }
        } catch (e) {
            console.warn('Failed to fetch homeroom teacher name from user_roles', e);
        }
    }

    if (effectiveTeacherName) {
        effectiveTeacherName = formatDegreeProperly(effectiveTeacherName);
    }

    const effectiveUser: AppUser | null = user
        ? {
            ...user,
            name: effectiveTeacherName || user.name || '',
        }
        : (effectiveTeacherName ? {
            id: classUserId || '',
            name: effectiveTeacherName,
            avatarUrl: '',
        } : null);

    const reports = [];

    // Batch fetch untuk seluruh siswa (hindari N+1): 3 query, bukan 3×siswa
    const studentIds = studentsToFetch.map(s => s.id);
    const [year, monthNum] = month.split('-');
    const nextMonthNum = parseInt(monthNum) === 12 ? 1 : parseInt(monthNum) + 1;
    const nextYear = parseInt(monthNum) === 12 ? parseInt(year) + 1 : parseInt(year);
    const monthStart = `${month}-01`;
    const monthEnd = `${nextYear}-${nextMonthNum.toString().padStart(2, '0')}-01`;

    const [evalsBatch, viosBatch, qpBatch] = await Promise.all([
        studentIds.length > 0
            ? supabase.from('bintang_monthly_evaluations').select('*').in('student_id', studentIds).eq('month', month)
            : Promise.resolve({ data: [] }),
        studentIds.length > 0
            ? supabase.from('violations').select('id, student_id, description, points, date, severity').in('student_id', studentIds).gte('date', monthStart).lt('date', monthEnd).is('deleted_at', null)
            : Promise.resolve({ data: [] }),
        studentIds.length > 0
            ? supabase.from('quiz_points').select('id, student_id, quiz_name, subject, points, category, quiz_date, semester_id').in('student_id', studentIds).is('deleted_at', null).gte('quiz_date', monthStart).lt('quiz_date', monthEnd).limit(2000)
            : Promise.resolve({ data: [] }),
    ]);

    const allEvals = (evalsBatch.data || []) as any[];
    const allVios = (viosBatch.data || []) as any[];
    const allQuiz = (qpBatch.data || []) as any[];

    const viosByStudent = new Map<string, any[]>();
    for (const v of allVios) {
        const list = viosByStudent.get(v.student_id) || [];
        list.push(v);
        viosByStudent.set(v.student_id, list);
    }
    const quizByStudent = new Map<string, number>();
    for (const q of allQuiz) {
        quizByStudent.set(q.student_id, (quizByStudent.get(q.student_id) || 0) + (q.points || 0));
    }

    for (const student of studentsToFetch) {
        const currentEval = allEvals.find((e: any) => e.student_id === student.id && e.month === month) || null;
        const vios = viosByStudent.get(student.id) || [];
        const totalQuizPoints = quizByStudent.get(student.id) || 0;
        const aspects = calculateAspectPoints(vios, totalQuizPoints);

        reports.push({
            student,
            evaluation: currentEval || null,
            aspects,
            violations: vios,
            quizPoints: allQuiz.filter(q => q.student_id === student.id)
        });
    }

    const { default: jsPDF } = await import('jspdf');
    const doc = new jsPDF();
    
    const monthDate = new Date(`${month}-01`);
    const monthName = monthDate.toLocaleDateString('id-ID', { month: 'long', year: 'numeric' });
    const printDate = new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });

    // Derive academic year and semester from the selected month
    const monthSemester = monthDate.getMonth() >= 6 ? '1' : '2';
    const monthAcadYearStart = monthSemester === '1' ? monthDate.getFullYear() : monthDate.getFullYear() - 1;
    const academicYear = `${monthAcadYearStart}/${monthAcadYearStart + 1}`;
    const semesterName = monthSemester === '1' ? 'Ganjil' : 'Genap';

    await generateBintangReportPdf(doc, reports, monthName, printDate, effectiveUser, {
        schoolName: undefined, // Will use default from addPdfHeader
        academicYear,
        semesterName
    }, onProgress);
    
    const exportDate = formatExportDate();
    const fileName = classId 
        ? `Bintang_Kelas_${reports[0]?.student?.classes?.name || classId}_${monthName.replace(/\s+/g, '_')}_${exportDate}.pdf`
        : `Bintang_${reports[0]?.student?.name?.replace(/\s+/g, '_') || 'Siswa'}_${monthName.replace(/\s+/g, '_')}_${exportDate}.pdf`;
        
    doc.save(fileName);
};
