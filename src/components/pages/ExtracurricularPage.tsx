import React, { useState, useCallback, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Trophy, Plus, Trash2 } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { useToast } from '../../hooks/useToast';
import { getJsPDF, getAutoTable, getExcelJS } from '../../utils/dynamicImports';
import { formatExportDate } from '../../utils/exportUtils';

// Types & Hooks
import { Extracurricular, Gender } from './extracurricular/types';
import { GradeDraft } from './extracurricular/GradesTab';
import { supabase } from '../../services/supabase';
import { useExtracurricularData } from './extracurricular/useExtracurricularData';
import { useExtracurricularMutations } from './extracurricular/useExtracurricularMutations';

// Views & Tabs
import { ExtracurricularMasterView } from './extracurricular/ExtracurricularMasterView';
import { ExtracurricularDetailView } from './extracurricular/ExtracurricularDetailView';
import { MembersTab } from './extracurricular/MembersTab';
import { AttendanceTab } from './extracurricular/AttendanceTab';
import { GradesTab } from './extracurricular/GradesTab';
import { ExternalStudentsManager } from './extracurricular/ExternalStudentsManager';
import { Input } from '../ui/Input';
import { Select } from '../ui/Select';
import { Textarea } from '../ui/Textarea';
import { Checkbox } from '../ui/Checkbox';
import { addPdfHeader, ensureLogosLoaded } from '../../utils/pdfHeaderUtils';

const DAY_NAME_TO_INDEX: Record<string, number> = {
    'minggu': 0, 'ahad': 0, 'sunday': 0,
    'senin': 1, 'monday': 1,
    'selasa': 2, 'tuesday': 2,
    'rabu': 3, 'wednesday': 3,
    'kamis': 4, 'thursday': 4,
    'jumat': 5, "jum'at": 5, 'friday': 5,
    'sabtu': 6, 'saturday': 6,
};

const DAY_INDEX_TO_NAME: Record<number, string> = {
    0: 'Min', 1: 'Sen', 2: 'Sel', 3: 'Rab', 4: 'Kam', 5: 'Jum', 6: 'Sab'
};

function getActiveMeetingDays(
    year: number,
    month: number, // 0-indexed
    daysInMonth: number,
    scheduleDayStr: string | null | undefined,
    recordedDaySet: Set<number>
): { day: number; dayName: string }[] {
    const rawTokens = (scheduleDayStr || '')
        .toLowerCase()
        .split(/[,/&+\s]+/)
        .map(t => t.trim())
        .filter(Boolean);

    const targetDayIndexes = new Set<number>();
    rawTokens.forEach(t => {
        if (t in DAY_NAME_TO_INDEX) {
            targetDayIndexes.add(DAY_NAME_TO_INDEX[t]);
        }
    });

    const activeDays: { day: number; dayName: string }[] = [];

    for (let d = 1; d <= daysInMonth; d++) {
        const jsDate = new Date(year, month, d);
        const dayOfWeek = jsDate.getDay();
        const isScheduled = targetDayIndexes.has(dayOfWeek);
        const hasRecord = recordedDaySet.has(d);

        if (isScheduled || hasRecord) {
            activeDays.push({
                day: d,
                dayName: DAY_INDEX_TO_NAME[dayOfWeek] || '',
            });
        }
    }

    if (activeDays.length === 0) {
        for (let d = 1; d <= daysInMonth; d++) {
            const jsDate = new Date(year, month, d);
            const dayOfWeek = jsDate.getDay();
            activeDays.push({
                day: d,
                dayName: DAY_INDEX_TO_NAME[dayOfWeek] || '',
            });
        }
    }

    return activeDays;
}

const ExtracurricularPage: React.FC = () => {
    const { user: _user, userRole } = useAuth();
    const isLeadership = userRole === 'kepala_madrasah' || userRole === 'waka_kesiswaan' || userRole === 'waka_kurikulum';
    const canAdd = !isLeadership;
    const toast = useToast();

    // ==================== STATE ====================
    // Router State
    const [selectedExtracurricularId, setSelectedExtracurricularId] = useState<string>('');
    const [isExternalStudentsView, setIsExternalStudentsView] = useState(false);

    // Detail State
    const [selectedClassId, setSelectedClassId] = useState<string>('');
    const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
    
    // Attendance Local State
    const [autoSaveAttendance, setAutoSaveAttendance] = useState(true);
    const [localAttendance, setLocalAttendance] = useState<Record<string, string>>({});
    
    // Grades Local State
    const [gradeDrafts, setGradeDrafts] = useState<Record<string, GradeDraft>>({});

    // Modals & Confirmations State
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isAddStudentModalOpen, setIsAddStudentModalOpen] = useState(false);
    const [editingExtracurricular, setEditingExtracurricular] = useState<Extracurricular | null>(null);
    const [confirmDeleteExtracurricular, setConfirmDeleteExtracurricular] = useState<Extracurricular | null>(null);
    
    // External Students Forms
    const [newStudentRows, setNewStudentRows] = useState<Array<{ name: string; gender: Gender; class_name: string }>>([
        { name: '', gender: 'Laki-laki', class_name: '' },
    ]);
    const [bulkClassName, setBulkClassName] = useState('');
    const [editingExtraStudent, setEditingExtraStudent] = useState<any | null>(null);
    const [confirmDeleteExtraStudent, setConfirmDeleteExtraStudent] = useState<any | null>(null);
    
    const [confirmMarkAllStatus, setConfirmMarkAllStatus] = useState<string | null>(null);

    // Extracurricular Form
    const [formData, setFormData] = useState({
        name: '', category: '', description: '', schedule_day: '',
        schedule_time: '', coach_name: '', max_participants: 30, is_active: true,
    });

    // ==================== HOOKS ====================
    const {
        loadingExtracurriculars, loadingAllExtraStudents,
        extracurriculars, selectedExtracurricularData, classes,
        participants, allExtracurricularStudents, enrollments, attendanceRecords: _attendanceRecords,
        activeSemester, enrolledParticipantIds, attendanceMap, gradesMap,
        uniqueExtraStudentClasses, queryClient
    } = useExtracurricularData({
        selectedExtracurricular: selectedExtracurricularId,
        selectedClassId,
        selectedDate
    });

    const mutations = useExtracurricularMutations({
        selectedExtracurricular: selectedExtracurricularId,
        selectedDate,
        editingExtracurricular,
        onModalClose: () => { setIsModalOpen(false); setEditingExtracurricular(null); },
        onAddStudentModalClose: () => { setIsAddStudentModalOpen(false); setNewStudentRows([{ name: '', gender: 'Laki-laki', class_name: '' }]); setBulkClassName(''); }
    });

    // ==================== EFFECTS ====================
    // Sync grades from server to local drafts
    useEffect(() => {
        setGradeDrafts({});
    }, [selectedExtracurricularId, activeSemester?.id]);

    // ==================== HANDLERS ====================
    // Attendance Handlers
    const handleAttendanceClick = (studentId: string, studentType: 'student' | 'extracurricular_student', status: string) => {
        if (autoSaveAttendance) {
            mutations.attendanceMutation.mutate({ studentId, studentType, status });
        } else {
            const key = studentType === 'student' ? `student:${studentId}` : `extracurricular_student:${studentId}`;
            setLocalAttendance(prev => ({ ...prev, [key]: status }));
        }
    };

    const handleSaveAttendance = useCallback(() => {
        const items = Object.entries(localAttendance).map(([key, status]) => {
            const [type, id] = key.split(':');
            return {
                studentId: id,
                studentType: type === 'student' ? 'student' : 'extracurricular_student',
                status
            };
        });
        mutations.bulkAttendanceMutation.mutate(items, {
            onSuccess: () => setLocalAttendance({})
        });
    }, [localAttendance, mutations.bulkAttendanceMutation]);

    const executeMarkAll = useCallback(() => {
        if (!confirmMarkAllStatus) return;
        if (autoSaveAttendance) {
            const items = enrollments.map(e => ({
                studentId: e.participantId,
                studentType: e.participantType,
                status: confirmMarkAllStatus
            }));
            mutations.bulkAttendanceMutation.mutate(items);
        } else {
            const newLocal = { ...localAttendance };
            enrollments.forEach(e => {
                const key = e.participantType === 'student' ? `student:${e.participantId}` : `extracurricular_student:${e.participantId}`;
                newLocal[key] = confirmMarkAllStatus;
            });
            setLocalAttendance(newLocal);
            toast.success(`Semua ditandai ${confirmMarkAllStatus} (Belum disimpan)`);
        }
        setConfirmMarkAllStatus(null);
    }, [confirmMarkAllStatus, autoSaveAttendance, enrollments, localAttendance, mutations.bulkAttendanceMutation, toast]);


    // Grades Handlers
    const updateGradeDraft = useCallback((key: string, patch: Partial<GradeDraft>) => {
        setGradeDrafts((prev) => {
            const current = prev[key] || { grade: null, score: '', description: '' };
            return { ...prev, [key]: { ...current, ...patch } };
        });
    }, []);

    const saveGradeEntry = useCallback((enrollment: any, patch?: Partial<GradeDraft>) => {
        const key = `${enrollment.participantType}:${enrollment.participantId}`;
        const savedGrade = gradesMap[key];
        const current = gradeDrafts[key] || {
            grade: savedGrade?.grade ?? null,
            score: savedGrade?.score == null ? '' : String(savedGrade.score),
            description: savedGrade?.description || '',
        };
        const next = { ...current, ...patch };
        const scoreText = next.score.trim();
        const description = next.description.trim();
        let normalizedScore: number | null = null;

        if (scoreText) {
            const parsed = Number(scoreText);
            if (!Number.isFinite(parsed) || parsed < 0 || parsed > 100) return;
            normalizedScore = parsed;
        }

        const getGradeFromScore = (s: number) => s >= 90 ? 'A' : s >= 80 ? 'B' : s >= 70 ? 'C' : 'D';
        const resolvedGrade = next.grade ?? (normalizedScore !== null ? getGradeFromScore(normalizedScore) : null);

        setGradeDrafts(prev => ({ ...prev, [key]: { grade: resolvedGrade, score: scoreText, description } }));

        mutations.gradeMutation.mutate({
            studentId: enrollment.participantId,
            studentType: enrollment.participantType,
            grade: resolvedGrade,
            score: normalizedScore,
            description: description || null,
        });
    }, [gradeDrafts, gradesMap, mutations.gradeMutation]);


    // Export Handlers
    const handleExportAttendancePDF = useCallback(async () => {
        if (!selectedExtracurricularData) return;
        try {
            const date = new Date(selectedDate);
            const year = date.getFullYear();
            const month = date.getMonth();
            const daysInMonth = new Date(year, month + 1, 0).getDate();
            const startDate = new Date(year, month, 1).toISOString().split('T')[0];
            const endDate = new Date(year, month + 1, 0).toISOString().split('T')[0];
            const monthName = date.toLocaleDateString('id-ID', { month: 'long' });
            const acadYearStart = month >= 6 ? year : year - 1;
            const academicYear = `${acadYearStart}/${acadYearStart + 1}`;

            const monthlyAttendance = await queryClient.fetchQuery({
                queryKey: ['export_monthly_attendance', selectedExtracurricularId, startDate, endDate],
                queryFn: async () => {
                    const { data, error } = await supabase.from('extracurricular_attendance')
                        .select('student_id, extracurricular_student_id, date, status')
                        .eq('extracurricular_id', selectedExtracurricularId).gte('date', startDate).lte('date', endDate);
                    if (error) throw error; return data;
                }
            });

            const recordedDaySet = new Set<number>();
            const exportAttendanceMap: Record<string, string> = {};
            monthlyAttendance?.forEach((record: any) => {
                const id = record.student_id ? `student:${record.student_id}` : `extracurricular_student:${record.extracurricular_student_id}`;
                const day = new Date(record.date).getDate();
                recordedDaySet.add(day);
                exportAttendanceMap[`${id}:${day}`] = record.status;
            });

            const activeMeetingDays = getActiveMeetingDays(
                year,
                month,
                daysInMonth,
                selectedExtracurricularData.schedule_day,
                recordedDaySet
            );

            const { default: jsPDF } = await getJsPDF();
            const { default: autoTable } = await getAutoTable();
            const doc = new jsPDF('l', 'mm', 'a4');
            const pageWidth = doc.internal.pageSize.getWidth();
            const pageHeight = doc.internal.pageSize.getHeight();

            await ensureLogosLoaded();
            const headerY = addPdfHeader(doc, { schoolName: 'MI AL IRSYAD KOTA MADIUN', orientation: 'landscape' });

            const titleText = `DAFTAR HADIR EKSTRAKURIKULER ${selectedExtracurricularData.name.toUpperCase()}`;
            const subText = `BULAN: ${monthName.toUpperCase()} ${year} - TAHUN PELAJARAN ${academicYear}`;
            const infoText = `PEMBINA: ${(selectedExtracurricularData.coach_name || '-').toUpperCase()} • JADWAL: ${(selectedExtracurricularData.schedule_day || '-').toUpperCase()} ${selectedExtracurricularData.schedule_time || ''}`;

            doc.setFontSize(11);
            doc.setFont('helvetica', 'bold');
            doc.text(titleText, pageWidth / 2, headerY - 1, { align: 'center' });
            doc.setFontSize(8.5);
            doc.setFont('helvetica', 'normal');
            doc.text(subText, pageWidth / 2, headerY + 3.5, { align: 'center' });
            doc.setFontSize(8);
            doc.text(infoText, pageWidth / 2, headerY + 7.5, { align: 'center' });

            // Garis pemisah
            doc.setDrawColor(15, 118, 110);
            doc.setLineWidth(0.4);
            doc.line(14, headerY + 10.5, pageWidth - 14, headerY + 10.5);
            doc.setDrawColor(0, 0, 0);

            const tableHead = [
                [
                    { content: 'NO', rowSpan: 2, styles: { halign: 'center' as const, valign: 'middle' as const, fillColor: [51, 65, 85] } },
                    { content: 'NAMA SISWA', rowSpan: 2, styles: { halign: 'left' as const, valign: 'middle' as const, fillColor: [51, 65, 85] } },
                    { content: 'KELAS', rowSpan: 2, styles: { halign: 'center' as const, valign: 'middle' as const, fillColor: [51, 65, 85] } },
                    { content: 'TANGGAL PERTEMUAN', colSpan: activeMeetingDays.length, styles: { halign: 'center' as const, valign: 'middle' as const, fillColor: [245, 158, 11] } },
                    { content: 'JUMLAH', colSpan: 4, styles: { halign: 'center' as const, valign: 'middle' as const, fillColor: [2, 132, 199] } },
                ],
                [
                    ...activeMeetingDays.map(item => ({
                        content: `${item.day}\n(${item.dayName})`,
                        styles: { halign: 'center' as const, valign: 'middle' as const, fillColor: [253, 230, 138], textColor: [15, 23, 42] as [number, number, number] }
                    })),
                    { content: 'S', styles: { halign: 'center' as const, valign: 'middle' as const, fillColor: [186, 230, 253], textColor: [15, 23, 42] as [number, number, number] } },
                    { content: 'I', styles: { halign: 'center' as const, valign: 'middle' as const, fillColor: [186, 230, 253], textColor: [15, 23, 42] as [number, number, number] } },
                    { content: 'A', styles: { halign: 'center' as const, valign: 'middle' as const, fillColor: [186, 230, 253], textColor: [15, 23, 42] as [number, number, number] } },
                    { content: 'H', styles: { halign: 'center' as const, valign: 'middle' as const, fillColor: [186, 230, 253], textColor: [15, 23, 42] as [number, number, number] } },
                ]
            ];

            const tableRows = [...enrollments].sort((a, b) => a.name.localeCompare(b.name)).map((enrollment, index) => {
                const id = `${enrollment.participantType}:${enrollment.participantId}`;
                let h = 0, s = 0, iz = 0, a = 0;
                const dailyStatuses = activeMeetingDays.map(item => {
                    const status = exportAttendanceMap[`${id}:${item.day}`] || '';
                    if (status === 'Hadir') { h++; return 'H'; }
                    if (status === 'Sakit') { s++; return 'S'; }
                    if (status === 'Izin') { iz++; return 'I'; }
                    if (status === 'Alpha') { a++; return 'A'; }
                    return '';
                });
                return [index + 1, enrollment.name, enrollment.className || '-', ...dailyStatuses, String(s), String(iz), String(a), String(h)];
            });

            autoTable(doc, {
                head: tableHead as any,
                body: tableRows,
                startY: headerY + 12.5,
                theme: 'grid',
                showHead: 'everyPage',
                margin: { top: 12, bottom: 55, left: 10, right: 10 },
                styles: { fontSize: 6.5, cellPadding: 0.6, halign: 'center' },
                columnStyles: {
                    0: { cellWidth: 8, halign: 'center' },
                    1: { cellWidth: 45, halign: 'left', fontStyle: 'bold' },
                    2: { cellWidth: 16, halign: 'center' }
                },
                alternateRowStyles: { fillColor: [248, 250, 252] },
                didParseCell: (data: any) => {
                    if (data.section === 'body') {
                        const colIdx = data.column.index;
                        const val = String(data.cell.raw || '');
                        // Kolom tanggal
                        if (colIdx >= 3 && colIdx < 3 + activeMeetingDays.length) {
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
                        else if (colIdx >= 3 + activeMeetingDays.length) {
                            data.cell.styles.fontStyle = 'bold';
                            data.cell.styles.fillColor = [240, 249, 255];
                            if (colIdx === 3 + activeMeetingDays.length) data.cell.styles.textColor = [180, 83, 9];
                            else if (colIdx === 3 + activeMeetingDays.length + 1) data.cell.styles.textColor = [29, 78, 216];
                            else if (colIdx === 3 + activeMeetingDays.length + 2) data.cell.styles.textColor = [185, 28, 28];
                            else if (colIdx === 3 + activeMeetingDays.length + 3) data.cell.styles.textColor = [21, 128, 61];
                        }
                    }
                },
                didDrawPage: () => {
                    doc.setFontSize(8);
                    doc.setTextColor(100);
                    doc.text(`Dicetak dari MI AL IRSYAD KOTA MADIUN pada ${new Date().toLocaleDateString('id-ID')}`, 14, pageHeight - 6);
                    doc.text(`Halaman ${doc.internal.pages!.length - 1}`, pageWidth - 25, pageHeight - 6);
                }
            });

            // Tanda Tangan Pembina — langsung di bawah tabel pada halaman akhir tabel
            const finalY = (doc as any).lastAutoTable?.finalY || (headerY + 20);
            const rightColX = pageWidth - 60;
            const printDateStr = new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });

            doc.setFont('helvetica', 'normal');
            doc.setFontSize(9);
            doc.setTextColor(0, 0, 0);
            doc.text(`Madiun, ${printDateStr}`, rightColX, finalY + 6, { align: 'center' });
            doc.text(`Pembina Ekstrakurikuler ${selectedExtracurricularData.name}`, rightColX, finalY + 10.5, { align: 'center' });

            const coachDisplay = selectedExtracurricularData.coach_name?.trim() || '....................................';
            doc.setFont('helvetica', 'bold');
            doc.text(`( ${coachDisplay} )`, rightColX, finalY + 28, { align: 'center' });

            doc.save(`Presensi_${selectedExtracurricularData.name.replace(/\s+/g, '_')}_${monthName.replace(/\s+/g, '_')}_${formatExportDate()}.pdf`);
            toast.success('Download PDF Presensi berhasil');
        } catch (err: any) { toast.error(`Gagal export: ${err.message}`); }
    }, [selectedDate, selectedExtracurricularData, enrollments, queryClient, selectedExtracurricularId, toast]);

    const handleExportAttendanceExcel = async () => {
        if (!selectedExtracurricularData) return;
        try {
            const date = new Date(selectedDate);
            const year = date.getFullYear();
            const month = date.getMonth();
            const daysInMonth = new Date(year, month + 1, 0).getDate();
            const startDate = new Date(year, month, 1).toISOString().split('T')[0];
            const endDate = new Date(year, month + 1, 0).toISOString().split('T')[0];
            const monthName = date.toLocaleDateString('id-ID', { month: 'long' });
            const acadYearStart = month >= 6 ? year : year - 1;
            const academicYear = `${acadYearStart}/${acadYearStart + 1}`;

            const monthlyAttendance = await queryClient.fetchQuery({
                queryKey: ['export_monthly_attendance', selectedExtracurricularId, startDate, endDate],
                queryFn: async () => {
                    const { data, error } = await supabase.from('extracurricular_attendance')
                        .select('student_id, extracurricular_student_id, date, status')
                        .eq('extracurricular_id', selectedExtracurricularId).gte('date', startDate).lte('date', endDate);
                    if (error) throw error; return data;
                }
            });

            const recordedDaySet = new Set<number>();
            const exportAttendanceMap: Record<string, string> = {};
            monthlyAttendance?.forEach((record: any) => {
                const id = record.student_id ? `student:${record.student_id}` : `extracurricular_student:${record.extracurricular_student_id}`;
                const day = new Date(record.date).getDate();
                recordedDaySet.add(day);
                exportAttendanceMap[`${id}:${day}`] = record.status;
            });

            const activeMeetingDays = getActiveMeetingDays(
                year,
                month,
                daysInMonth,
                selectedExtracurricularData.schedule_day,
                recordedDaySet
            );

            const ExcelJS = await getExcelJS();
            const workbook = new ExcelJS.Workbook();
            workbook.creator = 'MI AL IRSYAD KOTA MADIUN';

            const cleanSheetName = selectedExtracurricularData.name.replace(/[\\/?*:[\\]]/g, '').slice(0, 31);
            const ws = workbook.addWorksheet(cleanSheetName || 'Presensi Ekskul');

            const borderAll = {
                top: { style: 'thin' }, left: { style: 'thin' },
                bottom: { style: 'thin' }, right: { style: 'thin' }
            } as Partial<import('exceljs').Borders>;
            const fontHeader = { bold: true, size: 14, name: 'Arial', color: { argb: 'FFFFFFFF' } };
            const fontTitle = { bold: true, size: 12, name: 'Arial' };
            const fontSub = { bold: true, size: 10, name: 'Arial' };

            const totalColumns = 3 + activeMeetingDays.length + 4;
            const summaryStartCol = 3 + activeMeetingDays.length + 1;

            // Row 1: School Name
            ws.mergeCells(1, 1, 1, totalColumns);
            const titleRow1 = ws.getCell(1, 1);
            titleRow1.value = 'MI AL IRSYAD KOTA MADIUN';
            titleRow1.font = fontHeader;
            titleRow1.alignment = { horizontal: 'center', vertical: 'middle' };
            titleRow1.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0F766E' } };

            // Row 2: Title
            ws.mergeCells(2, 1, 2, totalColumns);
            const titleRow2 = ws.getCell(2, 1);
            titleRow2.value = `DAFTAR HADIR EKSTRAKURIKULER ${selectedExtracurricularData.name.toUpperCase()}`;
            titleRow2.font = fontTitle;
            titleRow2.alignment = { horizontal: 'center', vertical: 'middle' };

            // Row 3: Subtitle
            ws.mergeCells(3, 1, 3, totalColumns);
            const titleRow3 = ws.getCell(3, 1);
            titleRow3.value = `BULAN: ${monthName.toUpperCase()} ${year} - TAHUN PELAJARAN ${academicYear}`;
            titleRow3.font = fontTitle;
            titleRow3.alignment = { horizontal: 'center', vertical: 'middle' };

            // Row 4: Coach & Schedule Info
            ws.mergeCells(4, 1, 4, totalColumns);
            const titleRow4 = ws.getCell(4, 1);
            titleRow4.value = `PEMBINA: ${(selectedExtracurricularData.coach_name || '-').toUpperCase()} | JADWAL: ${(selectedExtracurricularData.schedule_day || '-').toUpperCase()} ${selectedExtracurricularData.schedule_time || ''}`;
            titleRow4.font = fontSub;
            titleRow4.alignment = { horizontal: 'center', vertical: 'middle' };

            ws.addRow([]);

            // Headers
            ws.mergeCells(6, 1, 7, 1);
            ws.getCell(6, 1).value = 'NO';

            ws.mergeCells(6, 2, 7, 2);
            ws.getCell(6, 2).value = 'NAMA SISWA';

            ws.mergeCells(6, 3, 7, 3);
            ws.getCell(6, 3).value = 'KELAS';

            ws.mergeCells(6, 4, 6, 3 + activeMeetingDays.length);
            const tglCell = ws.getCell(6, 4);
            tglCell.value = 'TANGGAL PERTEMUAN';
            tglCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF59E0B' } };

            ws.mergeCells(6, summaryStartCol, 6, summaryStartCol + 3);
            const summaryHeader = ws.getCell(6, summaryStartCol);
            summaryHeader.value = 'JUMLAH';
            summaryHeader.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0284C7' } };

            const subHeaderRow = ws.getRow(7);
            activeMeetingDays.forEach((item, i) => {
                subHeaderRow.getCell(4 + i).value = `${item.day}\n(${item.dayName})`;
            });
            subHeaderRow.getCell(summaryStartCol).value = 'S';
            subHeaderRow.getCell(summaryStartCol + 1).value = 'I';
            subHeaderRow.getCell(summaryStartCol + 2).value = 'A';
            subHeaderRow.getCell(summaryStartCol + 3).value = 'H';

            const headerRow6 = ws.getRow(6);
            headerRow6.eachCell({ includeEmpty: true }, (cell, colNumber) => {
                if (colNumber <= totalColumns) {
                    cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
                    cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
                    cell.border = borderAll;
                    if (colNumber <= 3) cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF334155' } };
                }
            });

            subHeaderRow.eachCell({ includeEmpty: true }, (cell, colNumber) => {
                if (colNumber <= totalColumns) {
                    cell.font = { bold: true, color: { argb: (colNumber <= 3) ? 'FFFFFFFF' : 'FF0F172A' }, size: 9 };
                    cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
                    cell.border = borderAll;
                    if (colNumber > 3 && colNumber < summaryStartCol) {
                        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFDE68A' } };
                    } else if (colNumber >= summaryStartCol) {
                        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFBAE6FD' } };
                    }
                }
            });

            ws.getColumn(1).width = 5;
            ws.getColumn(2).width = 32;
            ws.getColumn(3).width = 12;
            for (let i = 0; i < activeMeetingDays.length; i++) {
                ws.getColumn(4 + i).width = 7;
            }
            for (let i = 0; i < 4; i++) {
                ws.getColumn(summaryStartCol + i).width = 6;
            }

            const sortedEnrollments = [...enrollments].sort((a, b) => a.name.localeCompare(b.name));

            sortedEnrollments.forEach((enrollment, index) => {
                const row = ws.addRow([]);
                row.getCell(1).value = index + 1;
                row.getCell(1).alignment = { horizontal: 'center', vertical: 'middle' };
                row.getCell(2).value = ` ${enrollment.name}`;
                row.getCell(2).alignment = { horizontal: 'left', vertical: 'middle' };
                row.getCell(3).value = enrollment.className || '-';
                row.getCell(3).alignment = { horizontal: 'center', vertical: 'middle' };

                const id = `${enrollment.participantType}:${enrollment.participantId}`;
                let s = 0, i = 0, a = 0, h = 0;

                activeMeetingDays.forEach((item, colIdx) => {
                    const status = exportAttendanceMap[`${id}:${item.day}`] || '';
                    const cell = row.getCell(4 + colIdx);
                    cell.alignment = { horizontal: 'center', vertical: 'middle' };

                    if (status === 'Hadir') { h++; cell.value = 'H'; cell.font = { color: { argb: 'FF15803D' }, bold: true }; }
                    else if (status === 'Sakit') { s++; cell.value = 'S'; cell.font = { color: { argb: 'FFB45309' }, bold: true }; cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFEF3C7' } }; }
                    else if (status === 'Izin') { i++; cell.value = 'I'; cell.font = { color: { argb: 'FF1D4ED8' }, bold: true }; cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFDBEAFE' } }; }
                    else if (status === 'Alpha') { a++; cell.value = 'A'; cell.font = { color: { argb: 'FFB91C1C' }, bold: true }; cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFEE2E2' } }; }
                    else { cell.value = ''; }
                });

                row.getCell(summaryStartCol).value = s;
                row.getCell(summaryStartCol + 1).value = i;
                row.getCell(summaryStartCol + 2).value = a;
                row.getCell(summaryStartCol + 3).value = h;

                const fillColor = index % 2 !== 0 ? 'FFF8FAFC' : 'FFFFFFFF';
                row.eachCell({ includeEmpty: true }, (cell, colNumber) => {
                    if (colNumber <= totalColumns) {
                        cell.border = borderAll;
                        if (!cell.fill) {
                            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: fillColor } };
                        }
                        if (colNumber >= summaryStartCol) {
                            cell.alignment = { horizontal: 'center', vertical: 'middle' };
                            cell.font = { bold: true };
                        }
                    }
                });
            });

            const lastRow = sortedEnrollments.length + 7;
            const printDateStr = new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
            const coachDisplay = selectedExtracurricularData.coach_name?.trim() || '....................................';

            const sigStartCol = Math.max(1, totalColumns - 3);

            ws.mergeCells(lastRow + 2, sigStartCol, lastRow + 2, totalColumns);
            const sigCell1 = ws.getCell(lastRow + 2, sigStartCol);
            sigCell1.value = `Madiun, ${printDateStr}`;
            sigCell1.alignment = { horizontal: 'center', vertical: 'middle' };

            ws.mergeCells(lastRow + 3, sigStartCol, lastRow + 3, totalColumns);
            const sigCell2 = ws.getCell(lastRow + 3, sigStartCol);
            sigCell2.value = `Pembina Ekstrakurikuler ${selectedExtracurricularData.name}`;
            sigCell2.alignment = { horizontal: 'center', vertical: 'middle' };

            ws.mergeCells(lastRow + 6, sigStartCol, lastRow + 6, totalColumns);
            const sigCell3 = ws.getCell(lastRow + 6, sigStartCol);
            sigCell3.value = `( ${coachDisplay} )`;
            sigCell3.font = { bold: true };
            sigCell3.alignment = { horizontal: 'center', vertical: 'middle' };

            const buffer = await workbook.xlsx.writeBuffer();
            const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `Presensi_${selectedExtracurricularData.name.replace(/\s+/g, '_')}_${monthName.replace(/\s+/g, '_')}_${formatExportDate()}.xlsx`;
            a.click();
            window.URL.revokeObjectURL(url);
            toast.success('Download Excel Presensi berhasil');
        } catch (err: any) { toast.error(`Gagal export: ${err.message}`); }
    };

    const handleExportGradesPDF = useCallback(async () => {
        if (!selectedExtracurricularData) return;
        try {
            const { default: jsPDF } = await getJsPDF();
            const { default: autoTable } = await getAutoTable();
            const doc = new jsPDF();
            const pageWidth = doc.internal.pageSize.getWidth();
            const pageHeight = doc.internal.pageSize.getHeight();
            
            await ensureLogosLoaded();
            const headerY = addPdfHeader(doc, { schoolName: 'MI AL IRSYAD KOTA MADIUN', orientation: 'portrait' });

            const currentYear = new Date().getFullYear();
            const semesterName = activeSemester ? `${activeSemester.name} (Semester ${activeSemester.semester_number})` : 'Semester Ganjil';
            const academicYear = `${currentYear}/${currentYear + 1}`;

            doc.setFontSize(12);
            doc.setFont('helvetica', 'bold');
            doc.text(`DAFTAR NILAI EKSTRAKURIKULER ${selectedExtracurricularData.name.toUpperCase()}`, pageWidth / 2, headerY, { align: 'center' });
            doc.setFontSize(9);
            doc.setFont('helvetica', 'normal');
            doc.text(`SEMESTER: ${semesterName.toUpperCase()} - TAHUN PELAJARAN ${academicYear}`, pageWidth / 2, headerY + 5, { align: 'center' });
            doc.text(`PEMBINA: ${(selectedExtracurricularData.coach_name || '-').toUpperCase()} • TOTAL SISWA: ${enrollments.length}`, pageWidth / 2, headerY + 9, { align: 'center' });

            // Garis pemisah
            doc.setDrawColor(15, 118, 110);
            doc.setLineWidth(0.4);
            doc.line(14, headerY + 12, pageWidth - 14, headerY + 12);
            doc.setDrawColor(0, 0, 0);

            const tableBody = [...enrollments].sort((a, b) => a.name.localeCompare(b.name)).map((enrollment, index) => {
                const grade = gradesMap[`${enrollment.participantType}:${enrollment.participantId}`];
                return [index + 1, enrollment.name, enrollment.className || '-', grade?.grade || '-', grade?.score ?? '-', grade?.description || '-'];
            });

            autoTable(doc, {
                head: [['NO', 'NAMA SISWA', 'KELAS', 'PREDIKAT', 'NILAI', 'DESKRIPSI']],
                body: tableBody,
                startY: headerY + 8.5,
                showHead: 'everyPage',
                margin: { top: 12, bottom: 46, left: 14, right: 14 },
                styles: { fontSize: 8.5, cellPadding: 1.5, halign: 'center' },
                columnStyles: {
                    0: { cellWidth: 10 },
                    1: { halign: 'left', fontStyle: 'bold', cellWidth: 45 },
                    2: { cellWidth: 18 },
                    3: { cellWidth: 18, fontStyle: 'bold' },
                    4: { cellWidth: 15, fontStyle: 'bold' },
                    5: { halign: 'left' }
                },
                headStyles: { fillColor: [15, 118, 110], textColor: [255, 255, 255], fontStyle: 'bold' },
                alternateRowStyles: { fillColor: [248, 250, 252] },
                didDrawPage: () => {
                    doc.setFontSize(8);
                    doc.setTextColor(100);
                    doc.text(`Dicetak dari MI AL IRSYAD KOTA MADIUN pada ${new Date().toLocaleDateString('id-ID')}`, 14, pageHeight - 6);
                    doc.text(`Halaman ${doc.internal.pages!.length - 1}`, pageWidth - 25, pageHeight - 6);
                }
            });

            // Tanda Tangan Pembina — langsung di bawah tabel pada halaman akhir tabel
            const finalY = (doc as any).lastAutoTable?.finalY || (headerY + 20);
            const rightColX = pageWidth - 50;
            const printDateStr = new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });

            doc.setFont('helvetica', 'normal');
            doc.setFontSize(9);
            doc.setTextColor(0, 0, 0);
            doc.text(`Madiun, ${printDateStr}`, rightColX, finalY + 6, { align: 'center' });
            doc.text(`Pembina Ekstrakurikuler ${selectedExtracurricularData.name}`, rightColX, finalY + 10.5, { align: 'center' });

            const coachDisplay = selectedExtracurricularData.coach_name?.trim() || '....................................';
            doc.setFont('helvetica', 'bold');
            doc.text(`( ${coachDisplay} )`, rightColX, finalY + 28, { align: 'center' });

            doc.save(`Nilai_${selectedExtracurricularData.name.replace(/\s+/g, '_')}_${formatExportDate()}.pdf`);
            toast.success('Download PDF Nilai berhasil');
        } catch (err: any) {
            toast.error(`Gagal export PDF: ${err.message}`);
        }
    }, [activeSemester, enrollments, gradesMap, selectedExtracurricularData, toast]);

    const handleExportGradesExcel = async () => {
        if (!selectedExtracurricularData) return;
        try {
            const ExcelJS = await getExcelJS();
            const workbook = new ExcelJS.Workbook();
            workbook.creator = 'MI AL IRSYAD KOTA MADIUN';

            const cleanSheetName = selectedExtracurricularData.name.replace(/[\\/?*:[\\]]/g, '').slice(0, 31);
            const ws = workbook.addWorksheet(cleanSheetName || 'Nilai Ekskul');

            const borderAll = {
                top: { style: 'thin' }, left: { style: 'thin' },
                bottom: { style: 'thin' }, right: { style: 'thin' }
            } as Partial<import('exceljs').Borders>;
            const fontHeader = { bold: true, size: 14, name: 'Arial', color: { argb: 'FFFFFFFF' } };
            const fontTitle = { bold: true, size: 12, name: 'Arial' };
            const fontSub = { bold: true, size: 10, name: 'Arial' };

            const totalColumns = 6;
            const currentYear = new Date().getFullYear();
            const semesterName = activeSemester ? `${activeSemester.name} (Semester ${activeSemester.semester_number})` : 'Semester Ganjil';
            const academicYear = `${currentYear}/${currentYear + 1}`;

            // Row 1: School
            ws.mergeCells(1, 1, 1, totalColumns);
            const titleRow1 = ws.getCell(1, 1);
            titleRow1.value = 'MI AL IRSYAD KOTA MADIUN';
            titleRow1.font = fontHeader;
            titleRow1.alignment = { horizontal: 'center', vertical: 'middle' };
            titleRow1.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0F766E' } };

            // Row 2: Title
            ws.mergeCells(2, 1, 2, totalColumns);
            const titleRow2 = ws.getCell(2, 1);
            titleRow2.value = `DAFTAR NILAI EKSTRAKURIKULER ${selectedExtracurricularData.name.toUpperCase()}`;
            titleRow2.font = fontTitle;
            titleRow2.alignment = { horizontal: 'center', vertical: 'middle' };

            // Row 3: Subtitle
            ws.mergeCells(3, 1, 3, totalColumns);
            const titleRow3 = ws.getCell(3, 1);
            titleRow3.value = `SEMESTER: ${semesterName.toUpperCase()} - TAHUN PELAJARAN ${academicYear}`;
            titleRow3.font = fontTitle;
            titleRow3.alignment = { horizontal: 'center', vertical: 'middle' };

            // Row 4: Coach
            ws.mergeCells(4, 1, 4, totalColumns);
            const titleRow4 = ws.getCell(4, 1);
            titleRow4.value = `PEMBINA: ${(selectedExtracurricularData.coach_name || '-').toUpperCase()} | TOTAL SISWA: ${enrollments.length}`;
            titleRow4.font = fontSub;
            titleRow4.alignment = { horizontal: 'center', vertical: 'middle' };

            ws.addRow([]);

            const headerRow = ws.getRow(6);
            headerRow.values = ['NO', 'NAMA SISWA', 'KELAS', 'PREDIKAT', 'NILAI', 'DESKRIPSI'];
            headerRow.eachCell({ includeEmpty: true }, (cell, colNumber) => {
                if (colNumber <= totalColumns) {
                    cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
                    cell.alignment = { horizontal: 'center', vertical: 'middle' };
                    cell.border = borderAll;
                    if (colNumber <= 3) cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF334155' } };
                    else if (colNumber === 4 || colNumber === 5) cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF59E0B' } };
                    else cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0284C7' } };
                }
            });

            ws.getColumn(1).width = 5;
            ws.getColumn(2).width = 35;
            ws.getColumn(3).width = 12;
            ws.getColumn(4).width = 12;
            ws.getColumn(5).width = 10;
            ws.getColumn(6).width = 40;

            const sortedEnrollments = [...enrollments].sort((a, b) => a.name.localeCompare(b.name));

            sortedEnrollments.forEach((enrollment, index) => {
                const grade = gradesMap[`${enrollment.participantType}:${enrollment.participantId}`];
                const row = ws.addRow([
                    index + 1,
                    ` ${enrollment.name}`,
                    enrollment.className || '-',
                    grade?.grade || '-',
                    grade?.score ?? '-',
                    grade?.description || '-'
                ]);

                const fillColor = index % 2 !== 0 ? 'FFF8FAFC' : 'FFFFFFFF';
                row.eachCell({ includeEmpty: true }, (cell, colNumber) => {
                    if (colNumber <= totalColumns) {
                        cell.border = borderAll;
                        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: fillColor } };
                        if (colNumber === 1 || colNumber === 3 || colNumber === 4 || colNumber === 5) {
                            cell.alignment = { horizontal: 'center', vertical: 'middle' };
                            if (colNumber >= 4) cell.font = { bold: true };
                        } else {
                            cell.alignment = { horizontal: 'left', vertical: 'middle' };
                        }
                    }
                });
            });

            const lastRow = sortedEnrollments.length + 6;
            const printDateStr = new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
            const coachDisplay = selectedExtracurricularData.coach_name?.trim() || '....................................';

            const sigStartCol = Math.max(1, totalColumns - 2);

            ws.mergeCells(lastRow + 2, sigStartCol, lastRow + 2, totalColumns);
            const sigCell1 = ws.getCell(lastRow + 2, sigStartCol);
            sigCell1.value = `Madiun, ${printDateStr}`;
            sigCell1.alignment = { horizontal: 'center', vertical: 'middle' };

            ws.mergeCells(lastRow + 3, sigStartCol, lastRow + 3, totalColumns);
            const sigCell2 = ws.getCell(lastRow + 3, sigStartCol);
            sigCell2.value = `Pembina Ekstrakurikuler ${selectedExtracurricularData.name}`;
            sigCell2.alignment = { horizontal: 'center', vertical: 'middle' };

            ws.mergeCells(lastRow + 6, sigStartCol, lastRow + 6, totalColumns);
            const sigCell3 = ws.getCell(lastRow + 6, sigStartCol);
            sigCell3.value = `( ${coachDisplay} )`;
            sigCell3.font = { bold: true };
            sigCell3.alignment = { horizontal: 'center', vertical: 'middle' };

            const buffer = await workbook.xlsx.writeBuffer();
            const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `Nilai_${selectedExtracurricularData.name.replace(/\s+/g, '_')}_${formatExportDate()}.xlsx`;
            a.click();
            window.URL.revokeObjectURL(url);
            toast.success('Download Excel Nilai berhasil');
        } catch (err: any) {
            toast.error(`Gagal export Excel: ${err.message}`);
        }
    };

    // ==================== RENDER ====================
    return (
        <div className="min-h-screen h-full flex flex-col overflow-auto pb-6 px-4 md:px-6">
            
            {/* Top Navigation Bar / Context Switcher */}
            {!selectedExtracurricularId && (
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8 border-b border-slate-200 dark:border-slate-800 pb-4">
                    <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center shadow-lg shadow-amber-500/20">
                            <Trophy className="w-6 h-6 text-white" />
                        </div>
                        <div>
                            <h1 className="text-2xl lg:text-3xl font-bold text-slate-800 dark:text-white">Ekstrakurikuler</h1>
                            <p className="text-slate-500 dark:text-slate-400 mt-0.5">Kelola kegiatan ekstrakurikuler, presensi, dan nilai siswa</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        {canAdd && (
                            <button type="button"
                                onClick={() => setIsExternalStudentsView(!isExternalStudentsView)}
                                className={`px-4 py-2 text-sm font-medium rounded-xl border transition-colors ${
                                    isExternalStudentsView 
                                        ? 'bg-amber-100 text-amber-700 border-amber-300 dark:bg-amber-900/30 dark:text-amber-400 dark:border-amber-700/50' 
                                        : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700'
                                }`}
                            >
                                Menu Siswa Eksternal
                            </button>
                        )}
                    </div>
                </div>
            )}

            {/* View Router */}
            {isExternalStudentsView && !selectedExtracurricularId ? (
                <ExternalStudentsManager
                    students={allExtracurricularStudents}
                    loading={loadingAllExtraStudents}
                    uniqueClasses={uniqueExtraStudentClasses}
                    onAddStudent={() => setIsAddStudentModalOpen(true)}
                    onEditStudent={(s) => setEditingExtraStudent(s)}
                    onDeleteStudent={(s) => setConfirmDeleteExtraStudent(s)}
                />
            ) : selectedExtracurricularId && selectedExtracurricularData ? (
                <ExtracurricularDetailView
                    extracurricular={selectedExtracurricularData}
                    onBack={() => { setSelectedExtracurricularId(''); setLocalAttendance({}); setGradeDrafts({}); }}
                >
                    {(activeTab) => (
                        <>
                            {activeTab === 'members' && (
                                <MembersTab
                                    extracurricularId={selectedExtracurricularId}
                                    enrollments={enrollments}
                                    participants={participants}
                                    enrolledParticipantIds={enrolledParticipantIds}
                                    classes={classes}
                                    selectedClassId={selectedClassId}
                                    onClassIdChange={setSelectedClassId}
                                    onEnrollmentChange={(id, type, action) => mutations.enrollmentMutation.mutate({ studentId: id, studentType: type, action })}
                                    onAddExternalStudent={() => setIsAddStudentModalOpen(true)}
                                    onEditExternalStudent={(id) => setEditingExtraStudent(allExtracurricularStudents.find(s => s.id === id))}
                                />
                            )}
                            {activeTab === 'attendance' && (
                                <AttendanceTab
                                    extracurricularId={selectedExtracurricularId}
                                    enrollments={enrollments}
                                    selectedDate={selectedDate}
                                    onDateChange={setSelectedDate}
                                    attendanceMap={attendanceMap}
                                    localAttendance={localAttendance}
                                    autoSaveAttendance={autoSaveAttendance}
                                    onToggleAutoSave={setAutoSaveAttendance}
                                    onAttendanceClick={handleAttendanceClick}
                                    onMarkAll={setConfirmMarkAllStatus}
                                    onSaveManual={handleSaveAttendance}
                                    isSaving={mutations.bulkAttendanceMutation.isPending}
                                    onExportPDF={handleExportAttendancePDF}
                                    onExportExcel={handleExportAttendanceExcel}
                                />
                            )}
                            {activeTab === 'grades' && (
                                <GradesTab
                                    extracurricularId={selectedExtracurricularId}
                                    enrollments={enrollments}
                                    gradesMap={gradesMap}
                                    gradeDrafts={gradeDrafts}
                                    onUpdateDraft={updateGradeDraft}
                                    onSaveGrade={saveGradeEntry}
                                    onExportPDF={handleExportGradesPDF}
                                    onExportExcel={handleExportGradesExcel}
                                />
                            )}
                        </>
                    )}
                </ExtracurricularDetailView>
            ) : (
                <ExtracurricularMasterView
                    extracurriculars={extracurriculars}
                    loading={loadingExtracurriculars}
                    onSelectExtracurricular={setSelectedExtracurricularId}
                    onOpenModal={(e) => {
                        if (e) {
                            setEditingExtracurricular(e);
                            setFormData({
                                name: e.name, category: e.category || '', description: e.description || '',
                                schedule_day: e.schedule_day || '', schedule_time: e.schedule_time || '',
                                coach_name: e.coach_name || '', max_participants: e.max_participants ?? 30, is_active: e.is_active ?? true,
                            });
                        } else {
                            setEditingExtracurricular(null);
                            setFormData({
                                name: '', category: '', description: '', schedule_day: '',
                                schedule_time: '', coach_name: '', max_participants: 30, is_active: true,
                            });
                        }
                        setIsModalOpen(true);
                    }}
                    onDeleteExtracurricular={setConfirmDeleteExtracurricular}
                    canAdd={canAdd}
                />
            )}

            {/* Modals from old file */}
            {isModalOpen && createPortal(
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setIsModalOpen(false)} />
                    <div className="relative w-full max-w-lg max-h-[90vh] overflow-y-auto bg-white dark:bg-slate-800 rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                        <div className="sticky top-0 bg-white/90 dark:bg-slate-800/90 backdrop-blur-sm px-6 py-4 border-b border-slate-200 dark:border-slate-700 z-10">
                            <h2 className="text-xl font-bold text-slate-800 dark:text-white">
                                {editingExtracurricular ? 'Edit Ekstrakurikuler' : 'Tambah Ekstrakurikuler Baru'}
                            </h2>
                        </div>
                        <form onSubmit={(e) => { 
                            e.preventDefault(); 
                            if (!formData.schedule_day) {
                                toast.warning('Pilih minimal satu hari untuk jadwal ekstrakurikuler!');
                                return;
                            }
                            mutations.extracurricularMutation.mutate(formData); 
                        }} className="p-6 space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Nama Ekstrakurikuler *</label>
                                <Input required type="text" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Kategori</label>
                                    <Select value={formData.category} onChange={(e) => setFormData({ ...formData, category: e.target.value })}>
                                        <option value="">Pilih Kategori</option>
                                        <option value="Olahraga">Olahraga</option>
                                        <option value="Seni">Seni</option>
                                        <option value="Akademik">Akademik</option>
                                        <option value="Keagamaan">Keagamaan</option>
                                        <option value="Lainnya">Lainnya</option>
                                    </Select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Maks Peserta</label>
                                    <Input type="number" min="1" value={formData.max_participants} onChange={(e) => setFormData({ ...formData, max_participants: parseInt(e.target.value) || 30 })} />
                                </div>
                            </div>
                            <div className="space-y-3">
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                                        Hari Jadwal Ekstrakurikuler * <span className="text-xs text-slate-400 font-normal">(Pilih satu atau beberapa hari)</span>
                                    </label>
                                    <div className="flex flex-wrap gap-2">
                                        {['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu', 'Minggu'].map((d) => {
                                            const currentDays = (formData.schedule_day || '')
                                                .toLowerCase()
                                                .split(/[,/&+\s]+/)
                                                .map(s => s.trim())
                                                .filter(Boolean);
                                            const isSelected = currentDays.includes(d.toLowerCase());
                                            return (
                                                <button
                                                    key={d}
                                                    type="button"
                                                    onClick={() => {
                                                        let newDays: string[];
                                                        if (isSelected) {
                                                            newDays = currentDays.filter(day => day !== d.toLowerCase());
                                                        } else {
                                                            newDays = [...currentDays, d.toLowerCase()];
                                                        }
                                                        const formatted = ['senin', 'selasa', 'rabu', 'kamis', 'jumat', 'sabtu', 'minggu']
                                                            .filter(day => newDays.includes(day))
                                                            .map(day => day.charAt(0).toUpperCase() + day.slice(1))
                                                            .join(', ');
                                                        setFormData({ ...formData, schedule_day: formatted });
                                                    }}
                                                    className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all ${
                                                        isSelected
                                                            ? 'bg-amber-500 text-white border-amber-600 shadow-sm shadow-amber-500/30'
                                                            : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700'
                                                    }`}
                                                >
                                                    {d}
                                                </button>
                                            );
                                        })}
                                    </div>
                                    {formData.schedule_day && (
                                        <p className="text-xs text-amber-700 dark:text-amber-400 font-medium mt-1">
                                            Jadwal terpilih: <span className="font-bold">{formData.schedule_day}</span>
                                        </p>
                                    )}
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Jam Jadwal</label>
                                    <Input
                                        type="text"
                                        placeholder="Contoh: 14:00 - 15:30 atau 09.30-10.40"
                                        value={formData.schedule_time}
                                        onChange={(e) => setFormData({ ...formData, schedule_time: e.target.value })}
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Nama Pembina</label>
                                <Input type="text" value={formData.coach_name} onChange={(e) => setFormData({ ...formData, coach_name: e.target.value })} />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Deskripsi</label>
                                <Textarea rows={3} value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} />
                            </div>
                            <div className="flex items-center gap-3 p-4 bg-slate-50 dark:bg-slate-700/50 rounded-xl border border-slate-200 dark:border-slate-600">
                                <Checkbox id="is_active" checked={formData.is_active} onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })} />
                                <label htmlFor="is_active" className="text-sm font-medium text-slate-700 dark:text-slate-300">Ekstrakurikuler Aktif</label>
                            </div>
                            <div className="pt-2 flex gap-3">
                                <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-300 font-medium hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors">Batal</button>
                                <button type="submit" disabled={mutations.extracurricularMutation.isPending} className="flex-1 px-4 py-2.5 bg-gradient-to-r from-amber-700 to-orange-800 text-white rounded-xl font-bold hover:opacity-90 transition-opacity">{mutations.extracurricularMutation.isPending ? 'Menyimpan...' : 'Simpan'}</button>
                            </div>
                        </form>
                    </div>
                </div>
            , document.body)}

            {/* Modal Confirm Delete */}
            {confirmDeleteExtracurricular && createPortal(
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setConfirmDeleteExtracurricular(null)} />
                    <div className="relative w-full max-w-md bg-white dark:bg-slate-800 rounded-2xl shadow-2xl p-6">
                        <h2 className="text-xl font-bold text-slate-800 dark:text-white flex items-center gap-2 mb-4">
                            <Trash2 className="w-5 h-5 text-red-500" />
                            Hapus Ekstrakurikuler?
                        </h2>
                        <p className="text-slate-600 dark:text-slate-400 mb-4">
                            Hapus <strong className="text-slate-900 dark:text-white">{confirmDeleteExtracurricular.name}</strong>? Semua data pendaftaran, presensi, dan nilai ekskul ini akan ikut terhapus permanen.
                        </p>
                        <div className="flex gap-3">
                            <button type="button" onClick={() => setConfirmDeleteExtracurricular(null)} className="flex-1 px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-300 hover:bg-slate-50 transition-colors">Batal</button>
                            <button type="button" onClick={() => { mutations.deleteExtracurricularMutation.mutate(confirmDeleteExtracurricular.id); setConfirmDeleteExtracurricular(null); }} className="flex-1 px-4 py-2.5 bg-red-600 text-white rounded-xl font-bold hover:bg-red-700 transition-colors">Ya, Hapus</button>
                        </div>
                    </div>
                </div>
            , document.body)}

            {/* Modal Add External Students */}
            {isAddStudentModalOpen && createPortal(
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setIsAddStudentModalOpen(false)} />
                    <div className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto bg-white dark:bg-slate-800 rounded-2xl shadow-2xl overflow-hidden p-6">
                        <h2 className="text-xl font-bold text-slate-800 dark:text-white mb-4">Tambah Siswa Eksternal</h2>
                        <form onSubmit={(e) => { e.preventDefault(); mutations.createStudentsMutation.mutate({ rows: newStudentRows, bulkClassName }); }} className="space-y-4">
                            <div className="space-y-4">
                                {newStudentRows.map((row, index) => (
                                    <div key={index} className="flex gap-3">
                                        <Input required type="text" value={row.name} onChange={(e) => { const n = [...newStudentRows]; n[index].name = e.target.value; setNewStudentRows(n); }} placeholder="Nama Siswa" className="flex-[2]" />
                                        <Select value={row.gender} onChange={(e) => { const n = [...newStudentRows]; n[index].gender = e.target.value as Gender; setNewStudentRows(n); }} className="flex-1">
                                            <option value="Laki-laki">L</option><option value="Perempuan">P</option>
                                        </Select>
                                        <Input type="text" value={row.class_name} onChange={(e) => { const n = [...newStudentRows]; n[index].class_name = e.target.value; setNewStudentRows(n); }} placeholder="Kelas (Opsional)" className="flex-1" />
                                    </div>
                                ))}
                            </div>
                            <button type="button" onClick={() => setNewStudentRows([...newStudentRows, { name: '', gender: 'Laki-laki', class_name: '' }])} className="w-full py-2 border border-dashed border-amber-300 text-amber-600 rounded-xl hover:bg-amber-50 flex items-center justify-center gap-2"><Plus className="w-4 h-4"/> Tambah Baris</button>
                            <div className="pt-4 flex gap-3">
                                <button type="button" onClick={() => setIsAddStudentModalOpen(false)} className="flex-1 py-2 rounded-xl border dark:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-700 dark:text-white">Batal</button>
                                <button type="submit" disabled={mutations.createStudentsMutation.isPending} className="flex-1 py-2 bg-amber-500 text-white rounded-xl font-bold">{mutations.createStudentsMutation.isPending ? 'Menyimpan...' : 'Simpan'}</button>
                            </div>
                        </form>
                    </div>
                </div>
            , document.body)}

            {/* Edit & Delete External Student Modals */}
            {editingExtraStudent && createPortal(
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setEditingExtraStudent(null)} />
                    <div className="relative w-full max-w-md bg-white dark:bg-slate-800 rounded-2xl shadow-2xl p-6">
                        <h2 className="text-xl font-bold text-slate-800 dark:text-white mb-4">Edit Siswa Eksternal</h2>
                        <form onSubmit={(e) => { e.preventDefault(); mutations.updateExtraStudentMutation.mutate(editingExtraStudent, { onSuccess: () => setEditingExtraStudent(null) }); }} className="space-y-4">
                            <Input required type="text" value={editingExtraStudent.name} onChange={(e) => setEditingExtraStudent({...editingExtraStudent, name: e.target.value})} placeholder="Nama" />
                            <Select value={editingExtraStudent.gender} onChange={(e) => setEditingExtraStudent({...editingExtraStudent, gender: e.target.value})}>
                                <option value="Laki-laki">Laki-laki</option><option value="Perempuan">Perempuan</option>
                            </Select>
                            <Input type="text" value={editingExtraStudent.class_name || ''} onChange={(e) => setEditingExtraStudent({...editingExtraStudent, class_name: e.target.value})} placeholder="Kelas" />
                            <div className="flex gap-3 pt-2">
                                <button type="button" onClick={() => setEditingExtraStudent(null)} className="flex-1 py-2 rounded-xl border dark:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-700 dark:text-white">Batal</button>
                                <button type="submit" disabled={mutations.updateExtraStudentMutation.isPending} className="flex-1 py-2 bg-amber-500 text-white rounded-xl font-bold">Simpan</button>
                            </div>
                        </form>
                    </div>
                </div>
            , document.body)}

            {confirmDeleteExtraStudent && createPortal(
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setConfirmDeleteExtraStudent(null)} />
                    <div className="relative w-full max-w-md bg-white dark:bg-slate-800 rounded-2xl shadow-2xl p-6">
                        <h2 className="text-xl font-bold text-slate-800 dark:text-white mb-4">Hapus Siswa Eksternal?</h2>
                        <p className="dark:text-slate-300 mb-4">Hapus {confirmDeleteExtraStudent.name}?</p>
                        <div className="flex gap-3">
                            <button type="button" onClick={() => setConfirmDeleteExtraStudent(null)} className="flex-1 py-2 rounded-xl border dark:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-700 dark:text-white">Batal</button>
                            <button type="button" onClick={() => { mutations.deleteExtraStudentMutation.mutate(confirmDeleteExtraStudent.id, { onSuccess: () => setConfirmDeleteExtraStudent(null) }); }} className="flex-1 py-2 bg-red-600 text-white rounded-xl font-bold">Hapus</button>
                        </div>
                    </div>
                </div>
            , document.body)}

            {/* Confirm Mark All */}
            {confirmMarkAllStatus && createPortal(
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setConfirmMarkAllStatus(null)} />
                    <div className="relative w-full max-w-sm bg-white dark:bg-slate-800 rounded-2xl shadow-2xl p-6">
                        <h2 className="text-lg font-bold text-slate-800 dark:text-white mb-2">Tandai Semua Siswa?</h2>
                        <p className="text-slate-600 dark:text-slate-400 text-sm mb-4">
                            Tandai {enrollments.length} siswa sebagai <strong>{confirmMarkAllStatus}</strong>?
                        </p>
                        <div className="flex gap-3">
                            <button type="button" onClick={() => setConfirmMarkAllStatus(null)} className="flex-1 py-2 rounded-xl border dark:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-700 dark:text-white">Batal</button>
                            <button type="button" onClick={executeMarkAll} className="flex-1 py-2 bg-amber-500 text-white rounded-xl font-bold">Ya</button>
                        </div>
                    </div>
                </div>
            , document.body)}

        </div>
    );
};

export default ExtracurricularPage;
