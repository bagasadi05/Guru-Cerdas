import { getAutoTable, getJsPDF } from './dynamicImports';
import { addPdfHeader, ensureLogosLoaded } from './pdfHeaderUtils';

interface AttendanceRecord {
    student_id: string;
    date: string;
    status: 'Hadir' | 'Sakit' | 'Izin' | 'Alpha';
}

interface Student {
    id: string;
    name: string;
    gender?: string;
}

interface ClassInfo {
    name: string;
    students: Student[];
}

interface AttendanceStats {
    hadir: number;
    sakit: number;
    izin: number;
    alpha: number;
    total: number;
    percentage: number;
}

/**
 * Generate PDF report for daily attendance
 */
export const exportDailyAttendanceToPDF = async (
    classData: ClassInfo,
    attendanceData: AttendanceRecord[],
    date: string,
    schoolName: string = 'MI AL IRSYAD KOTA MADIUN',
    teacherName: string = ''
) => {
    // Ensure logos are loaded
    await ensureLogosLoaded();

    const { default: jsPDF } = await getJsPDF();
    const { default: autoTable } = await getAutoTable();
    const doc = new jsPDF('p', 'mm', 'a4');
    const pageWidth = doc.internal.pageSize.getWidth();

    // Add header with logos
    let y = addPdfHeader(doc, { schoolName, orientation: 'portrait' });

    // Title
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('DAFTAR HADIR SISWA', pageWidth / 2, y, { align: 'center' });
    y += 8;

    // Class and Date Info
    doc.setFontSize(11);
    const formattedDate = new Date(date).toLocaleDateString('id-ID', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });
    doc.text(`Kelas: ${classData.name}`, 14, y);
    doc.text(`Tanggal: ${formattedDate}`, 14, y + 7);
    const tableStartY = y + 14;

    // Prepare table data
    const tableData = classData.students.map((student, index) => {
        const record = attendanceData.find(
            att => att.student_id === student.id && att.date === date
        );
        const status = record?.status || '-';
        return [
            index + 1,
            student.name,
            student.gender || '-',
            status === 'Hadir' ? '✓' : '',
            status === 'Sakit' ? '✓' : '',
            status === 'Izin' ? '✓' : '',
            status === 'Alpha' ? '✓' : ''
        ];
    });

    // Generate table
    autoTable(doc, {
        head: [['No', 'Nama Siswa', 'L/P', 'H', 'S', 'I', 'A']],
        body: tableData,
        startY: tableStartY,
        styles: {
            fontSize: 10,
            cellPadding: 3,
            halign: 'center'
        },
        headStyles: {
            fillColor: [79, 70, 229],
            textColor: 255,
            fontStyle: 'bold'
        },
        columnStyles: {
            0: { cellWidth: 12 },
            1: { cellWidth: 70, halign: 'left' },
            2: { cellWidth: 15 },
            3: { cellWidth: 15 },
            4: { cellWidth: 15 },
            5: { cellWidth: 15 },
            6: { cellWidth: 15 }
        },
        alternateRowStyles: { fillColor: [248, 250, 252] }
    });

    // Summary statistics
    const stats = calculateAttendanceStats(classData.students, attendanceData, date);
    const finalY = (doc as any).lastAutoTable.finalY + 10;

    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text('Rekap Kehadiran:', 14, finalY);
    doc.setFont('helvetica', 'normal');
    doc.text(`Hadir: ${stats.hadir}  |  Sakit: ${stats.sakit}  |  Izin: ${stats.izin}  |  Alpha: ${stats.alpha}`, 14, finalY + 6);
    doc.text(`Persentase Kehadiran: ${stats.percentage.toFixed(1)}%`, 14, finalY + 12);

    // Footer with signature
    const signatureY = finalY + 30;
    doc.text(`${schoolName.split(' ').pop()}, ${formattedDate}`, pageWidth - 60, signatureY);
    doc.text('Wali Kelas,', pageWidth - 60, signatureY + 6);
    doc.text('', pageWidth - 60, signatureY + 25);
    doc.text(`( ${teacherName || '............................'} )`, pageWidth - 60, signatureY + 30);

    // Save PDF
    const fileName = `Absensi_${classData.name}_${date}.pdf`;
    doc.save(fileName);
    return fileName;
};

/**
 * Generate PDF report for monthly attendance
 */
export const exportMonthlyAttendanceToPDF = async (
    classData: ClassInfo,
    attendanceData: AttendanceRecord[],
    month: number, // 1-12
    year: number,
    schoolName: string = 'MI AL IRSYAD KOTA MADIUN'
) => {
    // Ensure logos are loaded
    await ensureLogosLoaded();

    const { default: jsPDF } = await getJsPDF();
    const { default: autoTable } = await getAutoTable();
    const doc = new jsPDF('l', 'mm', 'a4'); // Landscape for monthly report
    const pageWidth = doc.internal.pageSize.getWidth();

    const monthNames = [
        'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
        'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
    ];
    const monthName = monthNames[month - 1];
    const daysInMonth = new Date(year, month, 0).getDate();

    // Add header with logos
    let y = addPdfHeader(doc, { schoolName, orientation: 'landscape' });

    // Title
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text(`REKAP ABSENSI KELAS ${classData.name}`, pageWidth / 2, y, { align: 'center' });
    y += 5;

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(`Bulan: ${monthName} ${year}`, pageWidth / 2, y, { align: 'center' });
    const tableStartY = y + 6;

    // Prepare table data with all days
    const tableData = classData.students.map((student, index) => {
        const row: (string | number)[] = [index + 1, student.name];
        let hadir = 0, sakit = 0, izin = 0, alpha = 0;

        for (let day = 1; day <= daysInMonth; day++) {
            const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
            const record = attendanceData.find(
                att => att.student_id === student.id && att.date === dateStr
            );

            if (record) {
                const statusMap: Record<string, string> = {
                    'Hadir': 'H', 'Sakit': 'S', 'Izin': 'I', 'Alpha': 'A'
                };
                row.push(statusMap[record.status] || '-');

                if (record.status === 'Hadir') hadir++;
                else if (record.status === 'Sakit') sakit++;
                else if (record.status === 'Izin') izin++;
                else if (record.status === 'Alpha') alpha++;
            } else {
                row.push('-');
            }
        }

        // Add summary columns
        row.push(hadir, sakit, izin, alpha);
        return row;
    });

    // Generate header with day numbers
    const headers = ['No', 'Nama'];
    for (let day = 1; day <= daysInMonth; day++) {
        headers.push(String(day));
    }
    headers.push('H', 'S', 'I', 'A');

    // Generate table
    autoTable(doc, {
        head: [headers],
        body: tableData,
        startY: tableStartY,
        styles: {
            fontSize: 7,
            cellPadding: 1.5,
            halign: 'center'
        },
        headStyles: {
            fillColor: [79, 70, 229],
            textColor: 255,
            fontStyle: 'bold',
            fontSize: 7
        },
        columnStyles: {
            0: { cellWidth: 8 },
            1: { cellWidth: 35, halign: 'left' },
        },
        alternateRowStyles: { fillColor: [248, 250, 252] }
    });

    // Legend
    const finalY = (doc as any).lastAutoTable.finalY + 8;
    doc.setFontSize(8);
    doc.text('Keterangan: H = Hadir, S = Sakit, I = Izin, A = Alpha', 14, finalY);

    // Save PDF
    const fileName = `Rekap_Absensi_${classData.name}_${monthName}_${year}.pdf`;
    doc.save(fileName);
    return fileName;
};

/**
 * Calculate attendance statistics
 */
export const calculateAttendanceStats = (
    students: Student[],
    attendanceData: AttendanceRecord[],
    date?: string
): AttendanceStats => {
    let hadir = 0, sakit = 0, izin = 0, alpha = 0;

    const relevantRecords = date
        ? attendanceData.filter(record => record.date === date)
        : attendanceData;

    relevantRecords.forEach(record => {
        switch (record.status) {
            case 'Hadir': hadir++; break;
            case 'Sakit': sakit++; break;
            case 'Izin': izin++; break;
            case 'Alpha': alpha++; break;
        }
    });

    const total = hadir + sakit + izin + alpha;
    const percentage = total > 0 ? (hadir / total) * 100 : 0;

    return { hadir, sakit, izin, alpha, total, percentage };
};

/**
 * Calculate class attendance statistics for a date range
 */
export const calculateClassStatsForPeriod = (
    students: Student[],
    attendanceData: AttendanceRecord[],
    startDate: string,
    endDate: string
): AttendanceStats & { totalStudents: number; daysWithRecords: number } => {
    const start = new Date(startDate);
    const end = new Date(endDate);

    const relevantRecords = attendanceData.filter(record => {
        const recordDate = new Date(record.date);
        return recordDate >= start && recordDate <= end;
    });

    const stats = calculateAttendanceStats(students, relevantRecords);

    // Calculate unique days with records
    const uniqueDays = new Set(relevantRecords.map(r => r.date)).size;

    return {
        ...stats,
        totalStudents: students.length,
        daysWithRecords: uniqueDays
    };
};
