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
  teacherNameMap: Map<string, string>;
}

/** Format tanggal export: 15-08-2026 (DD-MM-YYYY) */
function formatExportDate(d: Date = new Date()): string {
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  return `${day}-${month}-${d.getFullYear()}`;
}

/** Nama file export mengikuti kelas terpilih: Kelas_Bulan_tanggal */
function buildExportFileName(classes: { name: string }[], period: 'monthly' | 'semester', monthOrLabel: string): string {
  const dateStr = formatExportDate();
  const monthPart = period === 'monthly' ? monthOrLabel : monthOrLabel;

  if (classes.length === 1) {
    const safeName = classes[0].name.replace(/[^a-zA-Z0-9]+/g, '_').replace(/^_+|_+$/g, '').toUpperCase();
    return `${safeName || 'Kelas'}_${monthPart}_${dateStr}`;
  }
  return `SEMUA_KELAS_${monthPart}_${dateStr}`;
}

export const useAttendanceExport = (
  user: { id: string; name?: string } | null,
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
      return { students: [], attendance: [], classes: [], teacherNameMap: new Map() };
    }

    const classIds = exportClasses.map((classRow) => classRow.id);

    // Ambil siswa kelas terpilih dulu, lalu filter attendance by student_ids
    // (hindari kehilangan data saat attendance > 10.000 baris karena .range)
    const studentsRes = await supabase
      .from('students')
      .select('id, name, class_id, user_id')
      .in('class_id', classIds)
      .is('deleted_at', null)
      .range(0, 1999);

    if (studentsRes.error) throw new Error('Gagal mengambil data siswa untuk ekspor.');

    const studentIds = (studentsRes.data || []).map((s) => s.id);
    if (studentIds.length === 0) {
      return { students: [], attendance: [], classes: [], teacherNameMap: new Map() };
    }

    const attendanceRes = await supabase
      .from('attendance')
      .select('student_id, date, status')
      .in('student_id', studentIds)
      .gte('date', startDate)
      .lte('date', endDate)
      .is('deleted_at', null)
      .range(0, 9999);

    if (attendanceRes.error) throw new Error('Gagal mengambil data untuk ekspor.');

    const classRows = exportClasses;
    const studentRows = (studentsRes.data || []) as unknown as StudentRow[];
    const attendanceRows = (attendanceRes.data || []) as unknown as AttendanceRow[];
    const classMap = new Map(classRows.map(c => [c.id, { name: c.name }]));
    const studentsWithClasses = studentRows.map((s: StudentRow) => ({
      ...s,
      classes: s.class_id ? (classMap.get(s.class_id) || null) : null
    }));

    // Fetch homeroom teacher names for exported classes
    const teacherNameMap = new Map<string, string>();
    const teacherUserIds = Array.from(new Set(
      exportClasses.flatMap(c => [c.wali_kelas_id, c.user_id]).filter(Boolean) as string[]
    ));

    if (teacherUserIds.length > 0) {
      const { data: roleRows } = await supabase
        .from('user_roles')
        .select('user_id, full_name')
        .in('user_id', teacherUserIds);
      (roleRows || []).forEach(r => {
        if (r.user_id && r.full_name) {
          teacherNameMap.set(r.user_id, r.full_name);
        }
      });
    }

    const { data: tcaRows } = await supabase
      .from('teacher_class_assignments')
      .select('class_id, teacher_user_id')
      .in('class_id', classIds)
      .eq('assignment_role', 'homeroom')
      .is('deleted_at', null);

    if (tcaRows && tcaRows.length > 0) {
      const tcaUserIds = Array.from(new Set(tcaRows.map(t => t.teacher_user_id).filter(Boolean) as string[]));
      if (tcaUserIds.length > 0) {
        const { data: tcaRoleRows } = await supabase
          .from('user_roles')
          .select('user_id, full_name')
          .in('user_id', tcaUserIds);
        const tcaMap = new Map((tcaRoleRows || []).map(r => [r.user_id, r.full_name]));
        tcaRows.forEach(t => {
          if (t.class_id && t.teacher_user_id && tcaMap.get(t.teacher_user_id)) {
            teacherNameMap.set(t.class_id, tcaMap.get(t.teacher_user_id)!);
          }
        });
      }
    }

    return { students: studentsWithClasses, attendance: attendanceRows, classes: classRows, teacherNameMap };
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

      const { students, attendance, classes, teacherNameMap } = data;

      let exportTitle = '';
      if (exportPeriod === 'monthly') {
        const [year, monthNum] = exportMonth.split('-').map(Number);
        const monthName = new Date(year, monthNum - 1).toLocaleString('id-ID', { month: 'long' });
        exportTitle = `Absensi ${monthName} ${year}`;
      } else {
        const semester = semesters.find(s => s.id === exportSemesterId);
        exportTitle = `Absensi Semester ${semester?.semester_number === 1 ? 'Ganjil' : 'Genap'} ${semester?.academic_years?.name || ''}`;
      }

      let studentsByClass = classes.map((c: ClassRow) => {
        const teacherName = teacherNameMap.get(c.id)
          || (c.wali_kelas_id ? teacherNameMap.get(c.wali_kelas_id) : undefined)
          || (c.user_id ? teacherNameMap.get(c.user_id) : undefined)
          || (user?.name && user.name !== 'Guru' ? user.name : '');

        return {
          ...c,
          teacherName,
          students: students.filter((s: StudentRow) => s.class_id === c.id).sort((a: StudentRow, b: StudentRow) => a.name.localeCompare(b.name))
        };
      }).filter((c) => c.students.length > 0);

      if (selectedExportClasses.length > 0) {
        studentsByClass = studentsByClass.filter((c) => selectedExportClasses.includes(c.id));
      }

      if (exportPeriod === 'monthly' && format === 'pdf') {
        await ensureLogosLoaded();
        const [year, monthNum] = exportMonth.split('-').map(Number);
        const daysInMonth = new Date(year, monthNum, 0).getDate();
        const monthName = new Date(year, monthNum - 1).toLocaleString('id-ID', { month: 'long' });
        const acadYearStart = monthNum >= 7 ? year : year - 1;
        const academicYear = `${acadYearStart}/${acadYearStart + 1}`;

        const { default: jsPDF } = await getJsPDF();
        const { default: autoTable } = await getAutoTable();
        const doc = new jsPDF({ orientation: 'landscape' });
        const pageHeight = doc.internal.pageSize.getHeight();
        const pageWidth = doc.internal.pageSize.getWidth();
        let isFirstClass = true;

        for (const classData of studentsByClass) {
          if (!isFirstClass) doc.addPage('landscape');
          isFirstClass = false;

          const cleanClassName = classData.name.trim().replace(/^kelas\s+/i, '');
          const titleText = `DAFTAR HADIR KELAS ${cleanClassName.toUpperCase()}`;
          const subText = `BULAN: ${monthName.toUpperCase()} ${year} - TAHUN PELAJARAN ${academicYear}`;
          const headerY = addPdfHeader(doc, { schoolName, orientation: 'landscape' });
          const pageWidthHeader = doc.internal.pageSize.getWidth();
          doc.setFontSize(11);
          doc.setFont('helvetica', 'bold');
          doc.text(titleText, pageWidthHeader / 2, headerY - 1, { align: 'center' });
          doc.setFontSize(8.5);
          doc.setFont('helvetica', 'normal');
          doc.text(subText, pageWidthHeader / 2, headerY + 3.5, { align: 'center' });

          // Garis pemisah kelas
          doc.setDrawColor(15, 118, 110);
          doc.setLineWidth(0.4);
          doc.line(14, headerY + 6.5, pageWidthHeader - 14, headerY + 6.5);
          doc.setDrawColor(0, 0, 0);

          const attendanceMap = new Map<string, Map<string, AttendanceStatus>>();
          attendance.forEach((r: AttendanceRow) => {
            const stdMap = attendanceMap.get(r.student_id) || new Map<string, AttendanceStatus>();
            stdMap.set(r.date, r.status as AttendanceStatus);
            attendanceMap.set(r.student_id, stdMap);
          });

          const tableHead = [
            [
              { content: 'NO', rowSpan: 2, styles: { halign: 'center' as const, valign: 'middle' as const, fillColor: [51, 65, 85] } },
              { content: 'NAMA LENGKAP', rowSpan: 2, styles: { halign: 'left' as const, valign: 'middle' as const, fillColor: [51, 65, 85] } },
              { content: 'TANGGAL', colSpan: daysInMonth, styles: { halign: 'center' as const, valign: 'middle' as const, fillColor: [245, 158, 11] } },
              { content: 'JUMLAH', colSpan: 4, styles: { halign: 'center' as const, valign: 'middle' as const, fillColor: [2, 132, 199] } },
            ],
            [
              ...Array.from({ length: daysInMonth }, (_, i) => ({
                content: String(i + 1),
                styles: { halign: 'center' as const, valign: 'middle' as const, fillColor: [253, 230, 138], textColor: [15, 23, 42] }
              })),
              { content: 'S', styles: { halign: 'center' as const, valign: 'middle' as const, fillColor: [186, 230, 253], textColor: [15, 23, 42] } },
              { content: 'I', styles: { halign: 'center' as const, valign: 'middle' as const, fillColor: [186, 230, 253], textColor: [15, 23, 42] } },
              { content: 'A', styles: { halign: 'center' as const, valign: 'middle' as const, fillColor: [186, 230, 253], textColor: [15, 23, 42] } },
              { content: 'H', styles: { halign: 'center' as const, valign: 'middle' as const, fillColor: [186, 230, 253], textColor: [15, 23, 42] } },
            ]
          ];

          const rows = classData.students.map((student: StudentRow, index: number) => {
            const stdMap = attendanceMap.get(student.id);
            const rowData: string[] = [String(index + 1), student.name];
            let h = 0, s = 0, izin = 0, a = 0;

            for (let day = 1; day <= daysInMonth; day++) {
              const dateStr = `${year}-${String(monthNum).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
              const status = stdMap?.get(dateStr);
              if (status === 'Hadir') { rowData.push('H'); h++; }
              else if (status === 'Sakit') { rowData.push('S'); s++; }
              else if (status === 'Izin') { rowData.push('I'); izin++; }
              else if (status === 'Alpha') { rowData.push('A'); a++; }
              else { rowData.push(''); }
            }

            rowData.push(String(s), String(izin), String(a), String(h));
            return rowData;
          });

          autoTable(doc, {
            head: tableHead as any,
            body: rows,
            startY: headerY + 8.5,
            showHead: 'everyPage',
            margin: { top: 12, bottom: 55, left: 10, right: 10 },
            styles: { fontSize: 6.2, cellPadding: 0.45, halign: 'center' },
            columnStyles: {
              0: { cellWidth: 7, halign: 'center' },
              1: { halign: 'left', fontStyle: 'bold', cellWidth: 46 }
            },
            alternateRowStyles: { fillColor: [248, 250, 252] },
            didParseCell: (data: any) => {
              if (data.section === 'body') {
                const colIdx = data.column.index;
                const val = String(data.cell.raw || '');
                // Kolom tanggal
                if (colIdx >= 2 && colIdx < 2 + daysInMonth) {
                  if (val === 'H') {
                    data.cell.styles.textColor = [21, 128, 61];
                    data.cell.styles.fontStyle = 'bold';
                  } else if (val === 'S') {
                    data.cell.styles.textColor = [180, 83, 9];
                    data.cell.styles.fillColor = [254, 243, 199];
                    data.cell.styles.fontStyle = 'bold';
                  } else if (val === 'I') {
                    data.cell.styles.textColor = [29, 78, 216];
                    data.cell.styles.fillColor = [219, 234, 254];
                    data.cell.styles.fontStyle = 'bold';
                  } else if (val === 'A') {
                    data.cell.styles.textColor = [185, 28, 28];
                    data.cell.styles.fillColor = [254, 226, 226];
                    data.cell.styles.fontStyle = 'bold';
                  }
                }
                // Kolom jumlah (S, I, A, H)
                else if (colIdx >= 2 + daysInMonth) {
                  data.cell.styles.fontStyle = 'bold';
                  data.cell.styles.fillColor = [240, 249, 255];
                  if (colIdx === 2 + daysInMonth) data.cell.styles.textColor = [180, 83, 9];
                  else if (colIdx === 2 + daysInMonth + 1) data.cell.styles.textColor = [29, 78, 216];
                  else if (colIdx === 2 + daysInMonth + 2) data.cell.styles.textColor = [185, 28, 28];
                  else if (colIdx === 2 + daysInMonth + 3) data.cell.styles.textColor = [21, 128, 61];
                }
              }
            },
            didDrawPage: (_data: any) => {
              doc.setFontSize(8);
              doc.setTextColor(100);
              doc.text(`Dicetak dari ${schoolName} pada ${new Date().toLocaleDateString('id-ID')}`, 14, pageHeight - 6);
              doc.text(`Halaman ${doc.internal.pages!.length - 1}`, pageWidth - 25, pageHeight - 6);
            }
          });

          // Tanda Tangan Wali Kelas — langsung di bawah tabel pada halaman akhir tabel (tidak akan yatim)
          const finalY = (doc as any).lastAutoTable?.finalY || (headerY + 20);
          const rightColX = pageWidth - 60;
          const printDateStr = new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });

          doc.setFont('helvetica', 'normal');
          doc.setFontSize(9);
          doc.setTextColor(0, 0, 0);
          doc.text(`Madiun, ${printDateStr}`, rightColX, finalY + 6, { align: 'center' });
          doc.text(`Wali Kelas ${cleanClassName}`, rightColX, finalY + 10.5, { align: 'center' });

          const teacherDisplay = classData.teacherName?.trim() ? classData.teacherName.trim() : '....................................';

          doc.setFont('helvetica', 'bold');
          doc.text(`( ${teacherDisplay} )`, rightColX, finalY + 28, { align: 'center' });
        }

        const fileName = buildExportFileName(studentsByClass, 'monthly', exportMonth);
        doc.save(`${fileName}.pdf`);
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

          const cleanClassName = classData.name.trim().replace(/^kelas\s+/i, '');
          const titleText = `REKAPITULASI KEHADIRAN SISWA - KELAS ${cleanClassName.toUpperCase()}`;
          const subText = `${exportTitle.toUpperCase()} • ${schoolName || '-'}`;
          const headerY = addPdfHeader(doc, { schoolName, orientation: 'portrait' });
          const pageWidthHeader2 = doc.internal.pageSize.getWidth();
          doc.setFontSize(11);
          doc.setFont('helvetica', 'bold');
          doc.text(titleText, pageWidthHeader2 / 2, headerY - 1, { align: 'center' });
          doc.setFontSize(8.5);
          doc.setFont('helvetica', 'normal');
          doc.text(subText, pageWidthHeader2 / 2, headerY + 3.5, { align: 'center' });

          // Garis pemisah kelas
          doc.setDrawColor(15, 118, 110);
          doc.setLineWidth(0.4);
          doc.line(14, headerY + 6.5, pageWidthHeader2 - 14, headerY + 6.5);
          doc.setDrawColor(0, 0, 0);

          const attendanceMap = new Map<string, { h: number, s: number, i: number, a: number }>();
          attendance.forEach((r: AttendanceRow) => {
            const current = attendanceMap.get(r.student_id) || { h: 0, s: 0, i: 0, a: 0 };
            if (r.status === 'Hadir') current.h++;
            else if (r.status === 'Sakit') current.s++;
            else if (r.status === 'Izin') current.i++;
            else if (r.status === 'Alpha') current.a++;
            attendanceMap.set(r.student_id, current);
          });

          const headers = ['NO', 'NAMA LENGKAP', 'HADIR (H)', 'SAKIT (S)', 'IZIN (I)', 'ALPHA (A)', 'PERSENTASE (%)'];
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
            startY: headerY + 8.5,
            showHead: 'everyPage',
            margin: { top: 12, bottom: 55, left: 14, right: 14 },
            styles: { fontSize: 8.5, cellPadding: 1.5, halign: 'center' },
            columnStyles: {
              0: { cellWidth: 10, halign: 'center' },
              1: { halign: 'left', fontStyle: 'bold' }
            },
            alternateRowStyles: { fillColor: [248, 250, 252] },
            didParseCell: (data: any) => {
              if (data.section === 'head') {
                const colIdx = data.column.index;
                if (colIdx <= 1) data.cell.styles.fillColor = [51, 65, 85];
                else if (colIdx === 6) data.cell.styles.fillColor = [2, 132, 199];
                else data.cell.styles.fillColor = [245, 158, 11];
              } else if (data.section === 'body') {
                const colIdx = data.column.index;
                if (colIdx >= 2) data.cell.styles.fontStyle = 'bold';
                if (colIdx === 2) data.cell.styles.textColor = [21, 128, 61];
                else if (colIdx === 3) data.cell.styles.textColor = [180, 83, 9];
                else if (colIdx === 4) data.cell.styles.textColor = [29, 78, 216];
                else if (colIdx === 5) data.cell.styles.textColor = [185, 28, 28];
                else if (colIdx === 6) data.cell.styles.textColor = [2, 132, 199];
              }
            },
            didDrawPage: (_data: any) => {
              doc.setFontSize(8);
              doc.setTextColor(100);
              doc.text(`Dicetak dari ${schoolName} pada ${new Date().toLocaleDateString('id-ID')}`, 14, pageHeight - 6);
              doc.text(`Halaman ${doc.internal.pages!.length - 1}`, pageWidth - 25, pageHeight - 6);
            }
          });

          // Tanda Tangan Wali Kelas — langsung di bawah tabel pada halaman akhir tabel
          const finalY = (doc as any).lastAutoTable?.finalY || (headerY + 20);
          const rightColX = pageWidth - 50;
          const printDateStr = new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });

          doc.setFont('helvetica', 'normal');
          doc.setFontSize(9);
          doc.setTextColor(0, 0, 0);
          doc.text(`Madiun, ${printDateStr}`, rightColX, finalY + 6, { align: 'center' });
          doc.text(`Wali Kelas ${cleanClassName}`, rightColX, finalY + 10.5, { align: 'center' });

          const teacherDisplay = classData.teacherName?.trim() ? classData.teacherName.trim() : '....................................';

          doc.setFont('helvetica', 'bold');
          doc.text(`( ${teacherDisplay} )`, rightColX, finalY + 28, { align: 'center' });
        }

        const fileName = buildExportFileName(studentsByClass, 'semester', exportTitle.replace(/\s+/g, '_'));
        doc.save(`${fileName}.pdf`);
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
            buildExportFileName(studentsByClass, 'monthly', exportMonth),
            schoolName || 'MI AL IRSYAD KOTA MADIUN'
          );
        } else {
          await exportSemesterAttendanceToExcel(
            studentsByClass,
            attendance,
            exportTitle,
            buildExportFileName(studentsByClass, 'semester', exportTitle.replace(/\s+/g, '_')),
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
