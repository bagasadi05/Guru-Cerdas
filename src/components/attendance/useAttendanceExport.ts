/**
 * @fileoverview useAttendanceExport — Export attendance data to PDF/Excel
 *
 * Extracted from useAttendance.ts to reduce complexity.
 * Handles export modal state, data fetching, and PDF/Excel generation.
 */

import { useState, useEffect } from 'react';
import { supabase } from '../../services/supabase';
import { useToast } from '../../hooks/useToast';
import { AttendanceStatus, StudentRow, ClassRow, AttendanceRow } from '../../types';
import { getAutoTable, getJsPDF } from '../../utils/dynamicImports';
import { exportAttendanceToExcel, exportSemesterAttendanceToExcel } from '../../utils/exportUtils';
import { addPdfHeader, ensureLogosLoaded } from '../../utils/pdfHeaderUtils';

interface ExportData {
  students: StudentRow[];
  attendance: AttendanceRow[];
  classes: ClassRow[];
}

export const useAttendanceExport = (
  user: { id: string } | null,
  attendanceClasses: ClassRow[],
  semesters: any[],
  activeSemester: any | null,
) => {
  const toast = useToast();
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [exportMonth, setExportMonth] = useState(new Date().toISOString().slice(0, 7));
  const [selectedExportClasses, setSelectedExportClasses] = useState<string[]>([]);
  const [exportPeriod, setExportPeriod] = useState<'monthly' | 'semester'>('monthly');
  const [exportSemesterId, setExportSemesterId] = useState<string | null>(null);
  const [isExporting, setIsExporting] = useState(false);

  useEffect(() => {
    if (activeSemester && !exportSemesterId) {
      setExportSemesterId(activeSemester.id);
    }
  }, [activeSemester, exportSemesterId]);

  const fetchAttendanceDataForExport = async (): Promise<ExportData | null> => {
    if (!user) return null;
    let startDate: string, endDate: string;

    if (exportPeriod === 'monthly') {
      const [year, monthNum] = exportMonth.split('-').map(Number);
      startDate = `${year}-${String(monthNum).padStart(2, '0')}-01`;
      endDate = `${year}-${String(monthNum).padStart(2, '0')}-${String(new Date(year, monthNum, 0).getDate()).padStart(2, '0')}`;
    } else {
      const semester = semesters.find(s => s.id === exportSemesterId);
      if (!semester) throw new Error('Semester tidak valid');
      startDate = semester.start_date;
      endDate = semester.end_date;
    }

    const exportClasses = selectedExportClasses.length === 0
      ? attendanceClasses
      : attendanceClasses.filter((classRow) => selectedExportClasses.includes(classRow.id));

    if (exportClasses.length === 0) {
      return { students: [], attendance: [], classes: [] };
    }

    const classIds = exportClasses.map((classRow) => classRow.id);

    const [studentsRes, attendanceRes] = await Promise.all([
      supabase
        .from('students')
        .select('id, name, class_id, user_id')
        .in('class_id', classIds)
        .is('deleted_at', null)
        .range(0, 1999),
      supabase
        .from('attendance')
        .select('student_id, date, status')
        .gte('date', startDate)
        .lte('date', endDate)
        .is('deleted_at', null)
        .range(0, 9999),
    ]);

    if (studentsRes.error || attendanceRes.error) throw new Error('Gagal mengambil data untuk ekspor.');

    const classRows = exportClasses;
    const studentRows = (studentsRes.data || []) as unknown as StudentRow[];
    const attendanceRows = (attendanceRes.data || []) as unknown as AttendanceRow[];
    const classMap = new Map(classRows.map(c => [c.id, { name: c.name }]));
    const studentsWithClasses = studentRows.map((s: StudentRow) => ({
      ...s,
      classes: s.class_id ? (classMap.get(s.class_id) || null) : null
    }));

    return { students: studentsWithClasses, attendance: attendanceRows, classes: classRows };
  };

  const handleExport = async (format: 'pdf' | 'excel', schoolName: string) => {
    setIsExporting(true);
    toast.info(`Membuat laporan ${format.toUpperCase()}...`);
    try {
      const data = await fetchAttendanceDataForExport();
      if (!data || !data.students || data.students.length === 0) {
        toast.warning('Tidak ada data untuk periode yang dipilih.');
        return;
      }

      const { students, attendance, classes } = data;

      let exportTitle = '';
      if (exportPeriod === 'monthly') {
        const [year, monthNum] = exportMonth.split('-').map(Number);
        const monthName = new Date(year, monthNum - 1).toLocaleString('id-ID', { month: 'long' });
        exportTitle = `Absensi ${monthName} ${year}`;
      } else {
        const semester = semesters.find(s => s.id === exportSemesterId);
        exportTitle = `Absensi Semester ${semester?.semester_number === 1 ? 'Ganjil' : 'Genap'} ${semester?.academic_years?.name || ''}`;
      }

      let studentsByClass = classes.map((c: ClassRow) => ({
        ...c,
        students: students.filter((s: StudentRow) => s.class_id === c.id).sort((a: StudentRow, b: StudentRow) => a.name.localeCompare(b.name))
      })).filter((c) => c.students.length > 0);

      if (selectedExportClasses.length > 0) {
        studentsByClass = studentsByClass.filter((c: ClassRow) => selectedExportClasses.includes(c.id));
      }

      if (exportPeriod === 'monthly' && format === 'pdf') {
        await ensureLogosLoaded();
        const [year, monthNum] = exportMonth.split('-').map(Number);
        const daysInMonth = new Date(year, monthNum, 0).getDate();

        const { default: jsPDF } = await getJsPDF();
        const { default: autoTable } = await getAutoTable();
        const doc = new jsPDF({ orientation: 'landscape' });
        const pageHeight = doc.internal.pageSize.getHeight();
        const pageWidth = doc.internal.pageSize.getWidth();
        let isFirstClass = true;

        for (const classData of studentsByClass) {
          if (!isFirstClass) doc.addPage('landscape');
          isFirstClass = false;

          const titleText = `REKAPITULASI KEHADIRAN SISWA - KELAS ${classData.name.toUpperCase()}`;
          const subText = `${exportTitle.toUpperCase()} • ${schoolName || '-'}`;
          const headerY = addPdfHeader(doc, { schoolName, orientation: 'landscape' });
          const pageWidthHeader = doc.internal.pageSize.getWidth();
          doc.setFontSize(12);
          doc.setFont('helvetica', 'bold');
          doc.text(titleText, pageWidthHeader / 2, headerY, { align: 'center' });
          doc.setFontSize(9);
          doc.setFont('helvetica', 'normal');
          doc.text(subText, pageWidthHeader / 2, headerY + 5, { align: 'center' });

          const attendanceMap = new Map<string, Map<string, AttendanceStatus>>();
          attendance.forEach((r: AttendanceRow) => {
            const stdMap = attendanceMap.get(r.student_id) || new Map<string, AttendanceStatus>();
            stdMap.set(r.date, r.status as AttendanceStatus);
            attendanceMap.set(r.student_id, stdMap);
          });

          const headers = ['No', 'Nama Siswa'];
          for (let day = 1; day <= daysInMonth; day++) {
            headers.push(String(day));
          }
          headers.push('H', 'S', 'I', 'A');

          const rows = classData.students.map((student: StudentRow, index: number) => {
            const stdMap = attendanceMap.get(student.id);
            const rowData: string[] = [String(index + 1), student.name];
            let h = 0, s = 0, izin = 0, a = 0;

            for (let day = 1; day <= daysInMonth; day++) {
              const dateStr = `${year}-${String(monthNum).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
              const status = stdMap?.get(dateStr);
              if (status === 'Hadir') { rowData.push('✓'); h++; }
              else if (status === 'Sakit') { rowData.push('S'); s++; }
              else if (status === 'Izin') { rowData.push('I'); izin++; }
              else if (status === 'Alpha') { rowData.push('A'); a++; }
              else { rowData.push('-'); }
            }

            rowData.push(String(h), String(s), String(izin), String(a));
            return rowData;
          });

          autoTable(doc, {
            head: [headers],
            body: rows,
            startY: 38,
            styles: { fontSize: 7, cellPadding: 1, halign: 'center' },
            columnStyles: { 1: { halign: 'left', fontStyle: 'bold' } },
            headStyles: { fillColor: [79, 70, 229] },
            didDrawPage: (_data: any) => {
              doc.setFontSize(8);
              doc.setTextColor(100);
              doc.text(`Dicetak dari ${schoolName} pada ${new Date().toLocaleDateString('id-ID')}`, 14, pageHeight - 10);
              doc.text(`Halaman ${doc.internal.pages!.length - 1}`, pageWidth - 25, pageHeight - 10);
            }
          });
        }

        doc.save(`Laporan_Absensi_Bulanan_${exportMonth}.pdf`);
        toast.success('Laporan PDF berhasil diunduh!');
      } else if (exportPeriod === 'semester' && format === 'pdf') {
        await ensureLogosLoaded();
        const { default: jsPDF } = await getJsPDF();
        const { default: autoTable } = await getAutoTable();
        const doc = new jsPDF();
        const pageHeight = doc.internal.pageSize.getHeight();
        const pageWidth = doc.internal.pageSize.getWidth();
        let isFirstClass = true;

        for (const classData of studentsByClass) {
          if (!isFirstClass) doc.addPage();
          isFirstClass = false;

          const titleText = `RINGKASAN ABSENSI SEMESTER - KELAS ${classData.name.toUpperCase()}`;
          const subText = `${exportTitle.toUpperCase()} • ${schoolName || '-'}`;
          const headerY = addPdfHeader(doc, { schoolName, orientation: 'portrait' });
          const pageWidthHeader2 = doc.internal.pageSize.getWidth();
          doc.setFontSize(12);
          doc.setFont('helvetica', 'bold');
          doc.text(titleText, pageWidthHeader2 / 2, headerY, { align: 'center' });
          doc.setFontSize(9);
          doc.setFont('helvetica', 'normal');
          doc.text(subText, pageWidthHeader2 / 2, headerY + 5, { align: 'center' });

          const attendanceMap = new Map<string, { h: number, s: number, i: number, a: number }>();
          attendance.forEach((r: AttendanceRow) => {
            const current = attendanceMap.get(r.student_id) || { h: 0, s: 0, i: 0, a: 0 };
            if (r.status === 'Hadir') current.h++;
            else if (r.status === 'Sakit') current.s++;
            else if (r.status === 'Izin') current.i++;
            else if (r.status === 'Alpha') current.a++;
            attendanceMap.set(r.student_id, current);
          });

          const headers = ['No', 'Nama Siswa', 'Hadir (H)', 'Sakit (S)', 'Izin (I)', 'Alpha (A)', 'Persentase'];
          const rows = classData.students.map((student: StudentRow, index: number) => {
            const counts = attendanceMap.get(student.id) || { h: 0, s: 0, i: 0, a: 0 };
            const totalDays = counts.h + counts.s + counts.i + counts.a;
            const percent = totalDays > 0 ? `${Math.round((counts.h / totalDays) * 100)}%` : '100%';

            return [
              String(index + 1),
              student.name,
              String(counts.h),
              String(counts.s),
              String(counts.i),
              String(counts.a),
              percent
            ];
          });

          autoTable(doc, {
            head: [headers],
            body: rows,
            startY: 38,
            styles: { fontSize: 9, cellPadding: 2, halign: 'center' },
            columnStyles: { 1: { halign: 'left', fontStyle: 'bold' } },
            headStyles: { fillColor: [79, 70, 229] },
            didDrawPage: (_data: any) => {
              doc.setFontSize(8);
              doc.setTextColor(100);
              doc.text(`Dicetak dari ${schoolName} pada ${new Date().toLocaleDateString('id-ID')}`, 14, pageHeight - 10);
              doc.text(`Halaman ${doc.internal.pages!.length - 1}`, pageWidth - 25, pageHeight - 10);
            }
          });
        }

        doc.save(`Laporan_Absensi_Semester_${exportSemesterId}.pdf`);
        toast.success('Laporan PDF berhasil diunduh!');
      } else if (format === 'excel') {
        if (exportPeriod === 'monthly') {
          const year = parseInt(exportMonth.slice(0, 4), 10);
          const monthNum = parseInt(exportMonth.slice(5, 7), 10);
          const daysInMonth = new Date(year, monthNum, 0).getDate();
          const monthName = new Date(year, monthNum - 1).toLocaleString('id-ID', { month: 'long' });

          await exportAttendanceToExcel(
            studentsByClass,
            attendance,
            monthName,
            year,
            monthNum,
            daysInMonth,
            `Laporan_Absensi_Bulanan_${exportMonth}`,
            schoolName || 'MI AL IRSYAD KOTA MADIUN'
          );
        } else {
          await exportSemesterAttendanceToExcel(
            studentsByClass,
            attendance,
            exportTitle,
            `Laporan_Absensi_Semester_${exportSemesterId}`,
            schoolName || 'MI AL IRSYAD KOTA MADIUN'
          );
        }
        toast.success('Laporan Excel berhasil diunduh!');
      }
    } catch (err: unknown) {
      toast.error(`Gagal mengekspor laporan: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setIsExporting(false);
      setIsExportModalOpen(false);
    }
  };

  return {
    isExportModalOpen,
    setIsExportModalOpen,
    exportMonth,
    setExportMonth,
    selectedExportClasses,
    setSelectedExportClasses,
    exportPeriod,
    setExportPeriod,
    exportSemesterId,
    setExportSemesterId,
    isExporting,
    handleExport,
  };
};
