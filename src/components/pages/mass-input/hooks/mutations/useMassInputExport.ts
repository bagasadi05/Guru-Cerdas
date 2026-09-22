import { useState } from 'react';
import { supabase } from '../../../../../services/supabase';
import { AppUser } from '../../../../../hooks/useAuth';
import { ClassRow, StudentRow } from '../../types';
import { formatExportDate } from '../../../../../utils/exportFormatUtils';
import { generateStudentReport, ReportData as ReportDataType } from '../../../../../services/pdfGenerator';
import { addPdfHeader, ensureLogosLoaded } from '../../../../../utils/pdfHeaderUtils';
import { getAutoTable, getJsPDF } from '../../../../../utils/dynamicImports';
import { sanitizeFilename } from '../../../../../services/securityEnhanced';
import { dedupeAcademicRecords, dedupeQuizPoints, dedupeViolations } from '../../../../../utils/academicRecordUtils';
import { generateTeacherNotesBatched } from '../../../../../utils/aiBatch';
import { useToast } from '../../../../../hooks/useToast';

interface UseMassInputExportParams {
    selectedClass: string;
    subjectGradeInfo: { subject: string; assessment_name: string; notes: string; semester: string };
    selectedStudentIds: Set<string>;
    studentsData: StudentRow[] | undefined;
    classes: ClassRow[] | undefined;
    noteMethod: 'ai' | 'template';
    templateNote: string;
    activeSemester: { id: string; semester_number?: number } | null | undefined;
    activeAcademicYear: { name: string } | null | undefined;
    user: AppUser | null;
    toast: ReturnType<typeof useToast>;
}

export function useMassInputExport({
    selectedClass,
    subjectGradeInfo,
    selectedStudentIds,
    studentsData,
    classes,
    noteMethod,
    templateNote,
    activeSemester,
    activeAcademicYear,
    user,
    toast,
}: UseMassInputExportParams) {
    const [isExporting, setIsExporting] = useState(false);
    const [exportProgress, setExportProgress] = useState('0%');

    const fetchBulkReportData = async (studentIds: string[], semesterId: string): Promise<ReportDataType[]> => {
        if (studentIds.length === 0) return [];
        const [
            studentsRes,
            reportsRes,
            attendanceRes,
            academicRes,
            violationsRes,
            quizPointsRes,
            achievementsRes
        ] = await Promise.all([
            supabase.from('students').select('*, classes(id, name)').in('id', studentIds).is('deleted_at', null),
            supabase.from('reports').select('*').in('student_id', studentIds).is('deleted_at', null),
            supabase.from('attendance').select('*').in('student_id', studentIds).eq('semester_id', semesterId).is('deleted_at', null),
            supabase.from('academic_records').select('*').in('student_id', studentIds).eq('semester_id', semesterId).is('deleted_at', null),
            supabase.from('violations').select('*').in('student_id', studentIds).eq('semester_id', semesterId).is('deleted_at', null),
            supabase.from('quiz_points').select('*').in('student_id', studentIds).eq('semester_id', semesterId).is('deleted_at', null),
            supabase.from('student_achievements').select('*').in('student_id', studentIds).is('deleted_at', null),
        ]);

        const errors = [studentsRes, reportsRes, attendanceRes, academicRes, violationsRes, quizPointsRes, achievementsRes]
            .map((r) => r.error)
            .filter((e) => e !== null);
        if (errors.length > 0) throw new Error(errors.map((e) => e!.message).join(', '));

        const studentsList = studentsRes.data || [];
        const reportsByStudent = new Map<string, unknown[]>();
        const attendanceByStudent = new Map<string, unknown[]>();
        const academicByStudent = new Map<string, unknown[]>();
        const violationsByStudent = new Map<string, unknown[]>();
        const quizPointsByStudent = new Map<string, unknown[]>();
        const achievementsByStudent = new Map<string, unknown[]>();

        (reportsRes.data || []).forEach((item) => {
            const arr = reportsByStudent.get(item.student_id) || [];
            arr.push(item);
            reportsByStudent.set(item.student_id, arr);
        });
        (attendanceRes.data || []).forEach((item) => {
            const arr = attendanceByStudent.get(item.student_id) || [];
            arr.push(item);
            attendanceByStudent.set(item.student_id, arr);
        });
        (academicRes.data || []).forEach((item) => {
            const arr = academicByStudent.get(item.student_id) || [];
            arr.push(item);
            academicByStudent.set(item.student_id, arr);
        });
        (violationsRes.data || []).forEach((item) => {
            const arr = violationsByStudent.get(item.student_id) || [];
            arr.push(item);
            violationsByStudent.set(item.student_id, arr);
        });
        (quizPointsRes.data || []).forEach((item) => {
            const arr = quizPointsByStudent.get(item.student_id) || [];
            arr.push(item);
            quizPointsByStudent.set(item.student_id, arr);
        });
        (achievementsRes.data || []).forEach((item) => {
            const arr = achievementsByStudent.get(item.student_id) || [];
            arr.push(item);
            achievementsByStudent.set(item.student_id, arr);
        });

        const studentMap = new Map(studentsList.map(s => [s.id, s]));
        return studentIds
            .map(id => studentMap.get(id))
            .filter(Boolean)
            .map(student => ({
                student: student as never,
                reports: (reportsByStudent.get(student!.id) || []) as never,
                attendanceRecords: (attendanceByStudent.get(student!.id) || []) as never,
                academicRecords: dedupeAcademicRecords((academicByStudent.get(student!.id) || []) as never) as never,
                violations: dedupeViolations((violationsByStudent.get(student!.id) || []) as never) as never,
                quizPoints: dedupeQuizPoints((quizPointsByStudent.get(student!.id) || []) as never) as never,
                achievements: (achievementsByStudent.get(student!.id) || []) as never
            }));
    };

    const handlePrintBulkReports = async () => {
        if (selectedStudentIds.size === 0) { toast.warning('Pilih setidaknya satu siswa.'); return; }
        if (!studentsData) return;
        setIsExporting(true); setExportProgress('0%'); toast.info(`Mulai proses cetak ${selectedStudentIds.size} rapor...`);
        const studentsToPrint = studentsData.filter(s => selectedStudentIds.has(s.id));
        try {
            setExportProgress('10%');
            if (!activeSemester?.id) throw new Error('Semester aktif tidak ditemukan.');
            const allReportData = await fetchBulkReportData(studentsToPrint.map(s => s.id), activeSemester.id);
            setExportProgress('40%');
            let teacherNotesMap: Map<string, string>;
            if (noteMethod === 'template') {
                teacherNotesMap = new Map(allReportData.map(data => [data.student.id, templateNote.replace(/\[Nama Siswa\]/g, data.student.name)]));
            } else {
                const studentDataForPrompt = allReportData.map(data => {
                    const academicSummary = data.academicRecords.length > 0
                        ? `Nilai rata-rata: ${Math.round(data.academicRecords.reduce((sum, r) => sum + r.score, 0) / data.academicRecords.length)}. Pelajaran terbaik: ${[...data.academicRecords].sort((a, b) => b.score - a.score)[0]?.subject || 'N/A'}.`
                        : 'Belum ada data nilai.';
                    const behaviorSummary = data.violations.length > 0
                        ? `${data.violations.length} pelanggaran dengan total ${data.violations.reduce((sum, v) => sum + v.points, 0)} poin.`
                        : 'Perilaku baik, tidak ada pelanggaran.';
                    const attendanceSummary = `Sakit: ${data.attendanceRecords.filter(r => r.status === 'Sakit').length}, Izin: ${data.attendanceRecords.filter(r => r.status === 'Izin').length}, Alpha: ${data.attendanceRecords.filter(r => r.status === 'Alpha').length}.`;
                    return { studentId: data.student.id, studentName: data.student.name, academicSummary, behaviorSummary, attendanceSummary };
                });
                const systemInstruction = `Anda adalah wali kelas yang menulis catatan rapor SINGKAT. ATURAN KETAT:
1. Setiap catatan HANYA 2-3 kalimat (maksimal 40 kata per siswa)
2. Format: [Penilaian singkat]. [Saran/motivasi].
3. TIDAK perlu menyebutkan angka/data yang sudah ada
4. Langsung, to the point, tidak bertele-tele
5. Bahasa Indonesia formal tapi hangat

Format JSON yang diharapkan:
{
  "notes": [
    { "studentId": "ID_SISWA", "teacherNote": "Catatan singkat 2-3 kalimat..." }
  ]
}`;
                teacherNotesMap = await generateTeacherNotesBatched(
                    studentDataForPrompt,
                    systemInstruction,
                    (done, total) => setExportProgress(Math.round(40 + (done / total) * 25) + '%')
                );
            }
            setExportProgress('70%');
            const { default: jsPDF } = await getJsPDF();
            const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
            let isFirstPage = true;
            for (let i = 0; i < allReportData.length; i++) {
                const reportData = allReportData[i];
                const teacherNote = teacherNotesMap.get(reportData.student.id) || 'Catatan tidak dapat dibuat.';
                if (!isFirstPage) doc.addPage();
                isFirstPage = false;
                const semNumber = activeSemester?.semester_number ?? 1;
                const semName = semNumber % 2 !== 0 ? 'Ganjil' : 'Genap';
                const acadYear = activeAcademicYear?.name || `${new Date().getFullYear()} / ${new Date().getFullYear() + 1}`;
                await generateStudentReport(doc, reportData, teacherNote, new Date().toISOString().slice(0, 10), semName, acadYear, user);
                setExportProgress(`${Math.round(70 + ((i + 1) / studentsToPrint.length) * 30)}%`);
            }
            const selectedClassName = classes?.find(c => c.id === selectedClass)?.name || 'Kelas';
            const exportDate = formatExportDate();
            const fileName = allReportData.length === 1
                ? `Rapor_${sanitizeFilename(allReportData[0]?.student.name || studentsToPrint[0]?.name || 'Siswa')}_${sanitizeFilename(selectedClassName)}_${exportDate}.pdf`
                : `Rapor_Massal_${sanitizeFilename(selectedClassName)}_${exportDate}.pdf`;
            doc.save(fileName);
            toast.success(allReportData.length === 1 ? 'Rapor siswa berhasil diunduh!' : 'Semua rapor terpilih berhasil digabung dalam satu PDF!');
        } catch (err) {
            console.error('Gagal membuat rapor massal:', err);
            toast.error(`Gagal membuat rapor massal: ${err instanceof Error ? err.message : 'Unknown error'}`);
        } finally { setIsExporting(false); }
    };

    const handlePrintGrades = async () => {
        if (!selectedClass || !subjectGradeInfo.subject) { toast.warning('Pilih kelas dan mata pelajaran.'); return; }
        if (selectedStudentIds.size === 0) { toast.warning('Pilih setidaknya satu siswa untuk mencetak.'); return; }
        setIsExporting(true); toast.info('Membuat rekap nilai...');
        await ensureLogosLoaded();
        const { default: jsPDF } = await getJsPDF();
        const { default: autoTable } = await getAutoTable();
        const doc = new jsPDF();
        const className = classes?.find(c => c.id === selectedClass)?.name;
        const pageWidth = doc.internal.pageSize.getWidth();
        let y = addPdfHeader(doc, { orientation: 'portrait' });
        doc.setFontSize(14); doc.setFont('helvetica', 'bold');
        doc.text(`Rekap Nilai: ${subjectGradeInfo.subject}`, pageWidth / 2, y, { align: 'center' });
        y += 8;
        doc.setFontSize(11); doc.setFont('helvetica', 'normal');
        doc.text(`Kelas: ${className}`, 14, y);
        doc.text(`Tanggal Cetak: ${new Date().toLocaleDateString('id-ID')}`, pageWidth - 14, y, { align: 'right' });
        const tableStartY = y + 8;
        
        let query = supabase
            .from('academic_records').select('*')
            .eq('subject', subjectGradeInfo.subject)
            .in('student_id', Array.from(selectedStudentIds))
            .is('deleted_at', null);
            
        if (activeSemester?.id) {
            query = query.eq('semester_id', activeSemester.id);
        } else {
            query = query.is('semester_id', null);
        }
            
        const { data: rawAllSubjectGrades } = await query;
        const allSubjectGrades = dedupeAcademicRecords((rawAllSubjectGrades || []) as never) as { student_id: string; assessment_name?: string; score: number }[];
        const allAssessments = [...new Set(allSubjectGrades.map((r) => r.assessment_name || 'Lainnya'))].sort();
        const head = [['No', 'Nama Siswa', ...allAssessments]];
        const tableData = (studentsData || [])
            .filter(s => selectedStudentIds.has(s.id))
            .map((s, index) => {
                const studentScores: Record<string, string | number> = {};
                (allSubjectGrades || []).filter(r => r.student_id === s.id).forEach(r => { studentScores[r.assessment_name || 'Lainnya'] = r.score; });
                const rowData: (string | number)[] = [index + 1, s.name];
                allAssessments.forEach(assessmentName => { rowData.push(studentScores[assessmentName] ?? 'N/A'); });
                return rowData;
            });
        autoTable(doc, { startY: tableStartY, head, body: tableData, theme: 'grid', headStyles: { fillColor: '#0284c7' } });
        doc.save(`Nilai_${subjectGradeInfo.subject.replace(/\s/g, '_')}_${className}_${formatExportDate()}.pdf`);
        toast.success('Rekap nilai berhasil diunduh.'); setIsExporting(false);
    };

    return {
        handlePrintBulkReports,
        handlePrintGrades,
        isExporting,
        exportProgress,
    };
}
