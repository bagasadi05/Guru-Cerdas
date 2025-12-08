import { supabase } from './supabase';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

/**
 * Export all student reports for a class as a single PDF with multiple pages.
 * Each student gets their own page(s) in the PDF.
 */
export const exportAllClassReports = async (
    classId: string,
    userId: string,
    semester: string,
    academicYear: string,
    teacherNote: string,
    onProgress?: (current: number, total: number) => void
): Promise<Blob> => {
    // Get all students in the class
    const { data: students, error } = await supabase
        .from('students')
        .select('id, name')
        .eq('class_id', classId)
        .eq('user_id', userId)
        .order('name');

    if (error || !students || students.length === 0) {
        throw new Error('Tidak ada siswa di kelas ini');
    }

    // Get class name
    const { data: classData } = await supabase
        .from('classes')
        .select('name')
        .eq('id', classId)
        .single();
    const className = classData?.name || 'Kelas';

    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const totalStudents = students.length;

    for (let i = 0; i < totalStudents; i++) {
        const student = students[i];
        onProgress?.(i + 1, totalStudents);

        // Fetch student data
        const [academicRes, attendanceRes, violationsRes] = await Promise.all([
            supabase.from('academic_records').select('subject, score, assessment_name').eq('student_id', student.id),
            supabase.from('attendance').select('status, date').eq('student_id', student.id),
            supabase.from('violations').select('description, points, date').eq('student_id', student.id),
        ]);

        const academicRecords = academicRes.data || [];
        const attendanceRecords = attendanceRes.data || [];
        const violations = violationsRes.data || [];

        // Add new page for each student after the first
        if (i > 0) {
            doc.addPage();
        }

        let y = 20;

        // Header
        doc.setFontSize(16);
        doc.setFont('helvetica', 'bold');
        doc.text('LAPORAN HASIL BELAJAR', pageWidth / 2, y, { align: 'center' });
        y += 10;
        doc.setFontSize(12);
        doc.setFont('helvetica', 'normal');
        doc.text(`Semester ${semester} - Tahun Ajaran ${academicYear}`, pageWidth / 2, y, { align: 'center' });
        y += 15;

        // Student Info
        doc.setFontSize(11);
        doc.text(`Nama Siswa: ${student.name}`, 14, y);
        y += 7;
        doc.text(`Kelas: ${className}`, 14, y);
        y += 15;

        // Academic Records Table
        if (academicRecords.length > 0) {
            doc.setFontSize(12);
            doc.setFont('helvetica', 'bold');
            doc.text('Nilai Akademik', 14, y);
            y += 5;

            // Group by subject and calculate average
            const subjectMap: Record<string, number[]> = {};
            academicRecords.forEach(record => {
                const subj = record.subject || 'Lainnya';
                if (!subjectMap[subj]) subjectMap[subj] = [];
                subjectMap[subj].push(record.score);
            });

            const tableData = Object.entries(subjectMap).map(([subject, scores]) => {
                const avg = Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);
                const grade = avg >= 90 ? 'A' : avg >= 80 ? 'B' : avg >= 70 ? 'C' : avg >= 60 ? 'D' : 'E';
                return [subject, avg.toString(), grade];
            });

            autoTable(doc, {
                startY: y,
                head: [['Mata Pelajaran', 'Nilai', 'Predikat']],
                body: tableData,
                theme: 'striped',
                styles: { fontSize: 10 },
            });

            y = (doc as any).lastAutoTable.finalY + 10;
        }

        // Attendance Summary
        const hadir = attendanceRecords.filter(a => a.status === 'Hadir').length;
        const izin = attendanceRecords.filter(a => a.status === 'Izin').length;
        const sakit = attendanceRecords.filter(a => a.status === 'Sakit').length;
        const alpha = attendanceRecords.filter(a => a.status === 'Alpha').length;

        doc.setFontSize(12);
        doc.setFont('helvetica', 'bold');
        doc.text('Kehadiran', 14, y);
        y += 7;
        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        doc.text(`Hadir: ${hadir} hari | Izin: ${izin} hari | Sakit: ${sakit} hari | Alpha: ${alpha} hari`, 14, y);
        y += 15;

        // Violations
        if (violations.length > 0) {
            doc.setFontSize(12);
            doc.setFont('helvetica', 'bold');
            doc.text('Catatan Pelanggaran', 14, y);
            y += 5;

            autoTable(doc, {
                startY: y,
                head: [['Tanggal', 'Deskripsi', 'Poin']],
                body: violations.map(v => [v.date, v.description, v.points.toString()]),
                theme: 'striped',
                styles: { fontSize: 9 },
            });

            y = (doc as any).lastAutoTable.finalY + 10;
        }

        // Teacher Note
        if (teacherNote) {
            doc.setFontSize(12);
            doc.setFont('helvetica', 'bold');
            doc.text('Catatan Wali Kelas', 14, y);
            y += 7;
            doc.setFontSize(10);
            doc.setFont('helvetica', 'normal');
            const lines = doc.splitTextToSize(teacherNote, pageWidth - 28);
            doc.text(lines, 14, y);
        }
    }

    return doc.output('blob');
};

export const downloadBlobAsFile = (blob: Blob, filename: string) => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
};
