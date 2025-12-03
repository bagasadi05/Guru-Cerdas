import React, { useState, useMemo, useEffect } from 'react';
import { AttendanceStatus, AttendanceInsert, AttendanceRecord, AiAnalysis } from '../../types';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Modal } from '../ui/Modal';
import { CheckCircleIcon, CalendarIcon, ChevronDownIcon, SearchIcon, InfoIcon } from '../Icons';
import BottomSheet from '../ui/BottomSheet';
import { useToast } from '../../hooks/useToast';
import { supabase, ai } from '../../services/supabase';
import { useAuth } from '../../hooks/useAuth';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useOfflineStatus } from '../../hooks/useOfflineStatus';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Type } from '@google/genai';
import * as XLSX from 'xlsx';
import { addToQueue } from '../../services/offlineQueue';
import { statusOptions } from '../../constants';

// Sub-components
import { AttendanceHeader } from '../attendance/AttendanceHeader';
import { AttendanceStats } from '../attendance/AttendanceStats';
import { AttendanceList } from '../attendance/AttendanceList';
import { AttendanceExportModal } from '../attendance/AttendanceExportModal';
import { AiAnalysisModal } from '../attendance/AiAnalysisModal';

const AttendancePage: React.FC = () => {
    const toast = useToast();
    const queryClient = useQueryClient();
    const { user } = useAuth();
    const isOnline = useOfflineStatus();
    const now = new Date();
    const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;

    const [selectedClass, setSelectedClass] = useState<string>('');
    const [selectedDate, setSelectedDate] = useState<string>(today);
    const [attendanceRecords, setAttendanceRecords] = useState<Record<string, AttendanceRecord>>({});
    const [selectedStudents, setSelectedStudents] = useState<Set<string>>(new Set());
    const [isDatePickerOpen, setDatePickerOpen] = useState(false);
    const [isNoteModalOpen, setIsNoteModalOpen] = useState(false);
    const [noteText, setNoteText] = useState('');
    const [searchQuery, setSearchQuery] = useState('');

    const [isExportModalOpen, setIsExportModalOpen] = useState(false);
    const [exportMonth, setExportMonth] = useState(new Date().toISOString().slice(0, 7));
    const [isExporting, setIsExporting] = useState(false);

    const [isAiModalOpen, setIsAiModalOpen] = useState(false);
    const [aiAnalysisResult, setAiAnalysisResult] = useState<AiAnalysis | null>(null);
    const [isAiLoading, setIsAiLoading] = useState(false);

    const { data: classes, isLoading: isLoadingClasses } = useQuery({
        queryKey: ['classes', user?.id],
        queryFn: async () => {
            const { data, error } = await supabase.from('classes').select('*').eq('user_id', user!.id);
            if (error) throw error;
            return data || [];
        },
        enabled: !!user,
    });

    useEffect(() => {
        if (classes && classes.length > 0 && !selectedClass) {
            setSelectedClass(classes[0].id);
        }
    }, [classes, selectedClass]);

    const { data: students, isLoading: isLoadingStudents } = useQuery({
        queryKey: ['studentsForAttendance', selectedClass],
        queryFn: async () => {
            if (!selectedClass || !user) return [];
            const { data: studentsData, error: studentsError } = await supabase.from('students').select('*').eq('class_id', selectedClass).eq('user_id', user.id).order('name', { ascending: true });
            if (studentsError) throw studentsError;
            return studentsData || [];
        },
        enabled: !!selectedClass && !!user
    });

    const { data: existingAttendance } = useQuery({
        queryKey: ['attendanceData', selectedClass, selectedDate],
        queryFn: async () => {
            if (!students || students.length === 0) return {};
            const { data: attendanceData, error: attendanceError } = await supabase.from('attendance').select('*').eq('date', selectedDate).in('student_id', students.map(s => s.id));
            if (attendanceError) throw attendanceError;
            return (attendanceData || []).reduce((acc, record: any) => {
                acc[record.student_id] = { id: record.id, status: record.status as AttendanceStatus, note: record.notes || '' };
                return acc;
            }, {} as Record<string, AttendanceRecord>);
        },
        enabled: !!students && students.length > 0,
    });

    useEffect(() => {
        setAttendanceRecords(existingAttendance || {});
    }, [existingAttendance]);

    const { mutate: saveAttendance, isPending: isSaving } = useMutation<
        { synced: boolean },
        Error,
        (AttendanceInsert & { id?: string })[],
        { previousAttendance: Record<string, AttendanceRecord> | undefined }
    >({
        mutationFn: async (recordsToUpsert: (AttendanceInsert & { id?: string })[]) => {
            if (isOnline) {
                const { error } = await supabase.from('attendance').upsert(recordsToUpsert);
                if (error) throw error;
                return { synced: true };
            } else {
                addToQueue({
                    table: 'attendance',
                    operation: 'upsert',
                    payload: recordsToUpsert,
                });
                return { synced: false };
            }
        },
        onMutate: async (recordsToUpsert) => {
            await queryClient.cancelQueries({ queryKey: ['attendanceData', selectedClass, selectedDate] });
            const previousAttendance = queryClient.getQueryData<Record<string, AttendanceRecord>>(['attendanceData', selectedClass, selectedDate]);
            queryClient.setQueryData(['attendanceData', selectedClass, selectedDate], (old: Record<string, AttendanceRecord> = {}) => {
                const newData = { ...old };
                recordsToUpsert.forEach(record => {
                    if (record.student_id) {
                        newData[record.student_id] = { id: record.id, status: record.status as AttendanceStatus, note: record.notes || '' };
                    }
                });
                return newData;
            });
            return { previousAttendance };
        },
        onError: (err: Error, newRecords, context) => {
            queryClient.setQueryData(['attendanceData', selectedClass, selectedDate], context?.previousAttendance);
            toast.error(`Gagal menyimpan absensi: ${err.message}`);
        },
        onSuccess: (data) => {
            if (data.synced) {
                toast.success('Absensi berhasil disimpan!');
            } else {
                toast.info('Absensi disimpan offline. Akan disinkronkan saat kembali online.');
            }
        },
        onSettled: () => {
            queryClient.invalidateQueries({ queryKey: ['attendanceData', selectedClass, selectedDate] });
            queryClient.invalidateQueries({ queryKey: ['dashboardData'] });
        },
    });

    const attendanceSummary = useMemo(() => {
        const summary = statusOptions.reduce((acc, opt) => ({ ...acc, [opt.value]: 0 }), {} as Record<AttendanceStatus, number>);
        Object.values(attendanceRecords).forEach((record: AttendanceRecord) => {
            summary[record.status]++;
        });
        return summary;
    }, [attendanceRecords]);

    const unmarkedStudents = useMemo(() => {
        if (!students) return [];
        return students.filter(student => !attendanceRecords[student.id]);
    }, [students, attendanceRecords]);

    const filteredStudents = useMemo(() => {
        if (!students) return [];
        return students.filter(student => student.name.toLowerCase().includes(searchQuery.toLowerCase()));
    }, [students, searchQuery]);

    const handleSaveNote = () => {
        if (selectedStudents.size === 0) return;
        const updatedRecords = { ...attendanceRecords };
        selectedStudents.forEach(studentId => {
            updatedRecords[studentId] = { ...updatedRecords[studentId], note: noteText };
        });
        setAttendanceRecords(updatedRecords);
        setSelectedStudents(new Set());
        setIsNoteModalOpen(false);
        setNoteText('');
        toast.success(`Catatan berhasil disimpan`);
    };

    const handleStatusChange = (studentId: string, status: AttendanceStatus) => {
        setAttendanceRecords(prev => ({
            ...prev,
            [studentId]: { ...prev[studentId], status, note: (status === 'Izin' || status === 'Sakit') ? (prev[studentId]?.note || '') : '' }
        }));
    };

    const markRestAsPresent = () => {
        const updatedRecords = { ...attendanceRecords };
        unmarkedStudents.forEach(student => {
            updatedRecords[student.id] = { status: AttendanceStatus.Hadir, note: '' };
        });
        setAttendanceRecords(updatedRecords);
    };

    const handleSave = () => {
        if (!user || !students) return;
        if (unmarkedStudents.length > 0) {
            if (!window.confirm(`Masih ada ${unmarkedStudents.length} siswa yang belum diabsen. Apakah Anda ingin menandai mereka semua sebagai "Hadir" dan menyimpan?`)) {
                return;
            }
        }

        const recordsToSave = { ...attendanceRecords };
        unmarkedStudents.forEach(student => {
            recordsToSave[student.id] = { status: AttendanceStatus.Hadir, note: '' };
        });

        const recordsToUpsert = Object.entries(recordsToSave).map(([student_id, record]: [string, AttendanceRecord]) => ({
            id: record.id || crypto.randomUUID(),
            student_id,
            date: selectedDate,
            status: record.status,
            notes: record.note,
            user_id: user.id
        }));

        saveAttendance(recordsToUpsert);
    };

    const fetchMonthAttendanceData = async (month: string) => {
        if (!user) return null;
        const [year, monthNum] = month.split('-').map(Number);
        const startDate = `${year}-${String(monthNum).padStart(2, '0')}-01`;
        const endDate = new Date(year, monthNum, 0).toISOString().split('T')[0];

        const [studentsRes, attendanceRes, classesRes] = await Promise.all([
            supabase.from('students').select('*').eq('user_id', user.id),
            supabase.from('attendance').select('*').eq('user_id', user.id).gte('date', startDate).lte('date', endDate),
            supabase.from('classes').select('id, name').eq('user_id', user.id),
        ]);

        if (studentsRes.error || attendanceRes.error || classesRes.error) throw new Error('Gagal mengambil data untuk ekspor.');

        const classMap = new Map((classesRes.data || []).map(c => [c.id, { name: c.name }]));
        const studentsWithClasses = (studentsRes.data || []).map((s: any) => ({
            ...s,
            classes: classMap.get(s.class_id) || null
        }));

        return { students: studentsWithClasses, attendance: attendanceRes.data, classes: classesRes.data };
    };

    const handleExport = async (format: 'pdf' | 'excel') => {
        setIsExporting(true);
        toast.info(`Membuat laporan ${format.toUpperCase()}...`);
        try {
            const data = await fetchMonthAttendanceData(exportMonth);
            if (!data || !data.students || data.students.length === 0) {
                toast.warning("Tidak ada data untuk bulan yang dipilih.");
                return;
            }

            const { students, attendance, classes } = data;
            const [year, monthNum] = exportMonth.split('-').map(Number);
            const monthName = new Date(year, monthNum - 1).toLocaleString('id-ID', { month: 'long' });
            const daysInMonth = new Date(year, monthNum, 0).getDate();

            const studentsByClass = classes.map((c: any) => ({
                ...c,
                students: students.filter((s: any) => s.class_id === c.id).sort((a: any, b: any) => a.name.localeCompare(b.name))
            })).filter((c: any) => c.students.length > 0);

            if (format === 'excel') {
                const wb = XLSX.utils.book_new();

                for (const classData of studentsByClass) {
                    const wsData = [];
                    wsData.push(['Laporan Absensi Bulanan']);
                    wsData.push([`Kelas: ${classData.name}`]);
                    wsData.push([`Periode: ${monthName} ${year}`]);
                    wsData.push([]);

                    const headerRow = ['No', 'Nama Siswa'];
                    for (let i = 1; i <= daysInMonth; i++) headerRow.push(String(i));
                    headerRow.push('Hadir', 'Sakit', 'Izin', 'Alpha');
                    wsData.push(headerRow);

                    classData.students.forEach((student: any, index: number) => {
                        const row = [index + 1, student.name];
                        let h = 0, s = 0, i = 0, a = 0;

                        for (let day = 1; day <= daysInMonth; day++) {
                            const dateStr = `${year}-${String(monthNum).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                            const record = attendance.find((att: any) => att.student_id === student.id && att.date === dateStr);
                            if (record) {
                                if (record.status === 'Hadir') { row.push('H'); h++; }
                                else if (record.status === 'Sakit') { row.push('S'); s++; }
                                else if (record.status === 'Izin') { row.push('I'); i++; }
                                else if (record.status === 'Alpha') { row.push('A'); a++; }
                                else row.push('-');
                            } else {
                                row.push('-');
                            }
                        }
                        row.push(h, s, i, a);
                        wsData.push(row);
                    });

                    const ws = XLSX.utils.aoa_to_sheet(wsData);
                    const wscols = [{ wch: 5 }, { wch: 30 }];
                    for (let i = 0; i < daysInMonth; i++) wscols.push({ wch: 3 });
                    wscols.push({ wch: 5 }, { wch: 5 }, { wch: 5 }, { wch: 5 });
                    ws['!cols'] = wscols;

                    XLSX.utils.book_append_sheet(wb, ws, classData.name.substring(0, 31));
                }

                XLSX.writeFile(wb, `Absensi_${exportMonth}.xlsx`);
                toast.success('Laporan Excel berhasil diunduh!');

            } else {
                const doc = new jsPDF({ orientation: 'landscape' });
                const pageHeight = doc.internal.pageSize.getHeight();
                const pageWidth = doc.internal.pageSize.getWidth();
                let isFirstClass = true;

                for (const classData of studentsByClass) {
                    if (!isFirstClass) doc.addPage('landscape');
                    isFirstClass = false;

                    let yPos = 20;
                    doc.setFillColor(240, 249, 255);
                    doc.rect(0, 0, pageWidth, 40, 'F');

                    doc.setFontSize(22);
                    doc.setFont('helvetica', 'bold');
                    doc.setTextColor('#0f172a');
                    doc.text('PortalGuru', 14, 18);

                    doc.setFontSize(12);
                    doc.setFont('helvetica', 'normal');
                    doc.setTextColor('#64748b');
                    doc.text('Laporan Absensi Siswa', 14, 26);

                    yPos = 50;

                    doc.setFontSize(14);
                    doc.setFont('helvetica', 'bold');
                    doc.setTextColor('#334155');
                    doc.text(`Kelas: ${classData.name}`, 14, yPos);
                    doc.text(`Periode: ${monthName} ${year}`, pageWidth - 14, yPos, { align: 'right' });
                    yPos += 10;

                    const classAttendance = attendance.filter((a: any) => classData.students.some((s: any) => s.id === a.student_id));
                    const summary = { H: 0, S: 0, I: 0, A: 0 };
                    classAttendance.forEach((rec: any) => {
                        if (rec.status === 'Hadir') summary.H++;
                        else if (rec.status === 'Sakit') summary.S++;
                        else if (rec.status === 'Izin') summary.I++;
                        else if (rec.status === 'Alpha') summary.A++;
                    });

                    doc.setFontSize(10);
                    const summaryColors: Record<string, string> = { H: '#22c55e', S: '#3b82f6', I: '#f59e0b', A: '#ef4444' };
                    let xPos = 14;
                    Object.entries(summary).forEach(([key, value]) => {
                        doc.setFillColor(summaryColors[key]);
                        doc.roundedRect(xPos, yPos - 4, 24, 12, 3, 3, 'F');
                        doc.setTextColor('#ffffff');
                        doc.setFont('helvetica', 'bold');
                        doc.text(`${key}: ${value}`, xPos + 12, yPos + 4, { align: 'center' });
                        xPos += 30;
                    });
                    yPos += 15;

                    const head = [['No', 'Nama Siswa', ...Array.from({ length: daysInMonth }, (_, i) => String(i + 1)), 'H', 'S', 'I', 'A']];
                    const body = classData.students.map((student: any, index: number) => {
                        const row = [String(index + 1), student.name];
                        let h = 0, s = 0, i = 0, a = 0;
                        for (let day = 1; day <= daysInMonth; day++) {
                            const dateStr = `${year}-${String(monthNum).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                            const record = attendance.find((att: any) => att.student_id === student.id && att.date === dateStr);
                            if (record) {
                                const statusChar = { Hadir: 'H', Sakit: 'S', Izin: 'I', Alpha: 'A' }[record.status as string] || '-';
                                row.push(statusChar);
                                if (record.status === 'Hadir') h++;
                                else if (record.status === 'Sakit') s++;
                                else if (record.status === 'Izin') i++;
                                else if (record.status === 'Alpha') a++;
                            } else {
                                row.push('-');
                            }
                        }
                        row.push(String(h), String(s), String(i), String(a));
                        return row;
                    });

                    autoTable(doc, {
                        head: head,
                        body: body,
                        startY: yPos,
                        theme: 'grid',
                        headStyles: { fillColor: '#0f172a', textColor: '#ffffff', fontStyle: 'bold', halign: 'center', fontSize: 8 },
                        bodyStyles: { fontSize: 7, cellPadding: 1 },
                        alternateRowStyles: { fillColor: '#f8fafc' },
                        columnStyles: {
                            0: { cellWidth: 8, halign: 'center' },
                            1: { cellWidth: 40, fontStyle: 'bold' },
                        },
                        didDrawCell: (data: any) => {
                            const statusColors: Record<string, string> = { 'S': '#3b82f6', 'I': '#f59e0b', 'A': '#ef4444', 'H': '#dcfce7' };
                            const cellText = data.cell.text[0];
                            if (data.column.index > 1 && data.column.index < daysInMonth + 2) {
                                if (statusColors[cellText]) {
                                    if (cellText === 'H') {
                                        doc.setFillColor(statusColors[cellText]);
                                        doc.rect(data.cell.x, data.cell.y, data.cell.width, data.cell.height, 'F');
                                        doc.setTextColor('#166534');
                                    } else {
                                        doc.setFillColor(statusColors[cellText]);
                                        doc.rect(data.cell.x, data.cell.y, data.cell.width, data.cell.height, 'F');
                                        doc.setTextColor('#ffffff');
                                    }
                                    doc.text(cellText, data.cell.x + data.cell.width / 2, data.cell.y + data.cell.height / 2, { align: 'center', baseline: 'middle' });
                                }
                            }
                        }
                    });

                    const pageCount = (doc as any).internal.getNumberOfPages();
                    doc.setFontSize(8);
                    doc.setTextColor('#94a3b8');
                    doc.text(`Dicetak dari PortalGuru pada ${new Date().toLocaleDateString('id-ID')}`, 14, pageHeight - 10);
                }

                doc.save(`Absensi_${exportMonth}.pdf`);
                toast.success('Laporan PDF berhasil diunduh!');
            }

        } catch (error: any) {
            toast.error(`Gagal membuat laporan: ${error.message}`);
            console.error(error);
        } finally {
            setIsExporting(false);
            setIsExportModalOpen(false);
        }
    };

    const handleAnalyzeAttendance = async () => {
        if (!students || students.length === 0) {
            toast.warning('Pilih kelas dengan siswa terlebih dahulu.'); return;
        }
        setIsAiModalOpen(true); setIsAiLoading(true); setAiAnalysisResult(null);

        try {
            const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
            const { data: attendanceData, error } = await supabase
                .from('attendance').select('student_id, date, status, students(name)')
                .in('student_id', students.map(s => s.id))
                .gte('date', thirtyDaysAgo);
            if (error) throw error;

            const systemInstruction = `Anda adalah asisten analisis data untuk guru. Analisis data kehadiran JSON yang diberikan, yang mencakup 30 hari terakhir. Berikan wawasan dalam format JSON yang valid dan sesuai dengan skema. Fokus pada identifikasi siswa dengan kehadiran sempurna, siswa yang sering absen, dan pola absensi yang tidak biasa.`;
            const prompt = `Analisis data kehadiran berikut: ${JSON.stringify(attendanceData)}`;
            const responseSchema = { type: Type.OBJECT, properties: { perfect_attendance: { type: Type.ARRAY, description: "Nama siswa dengan kehadiran 100% (tidak ada Izin, Sakit, atau Alpha).", items: { type: Type.STRING } }, frequent_absentees: { type: Type.ARRAY, description: "Siswa dengan 3 atau lebih status 'Alpha'.", items: { type: Type.OBJECT, properties: { student_name: { type: Type.STRING }, absent_days: { type: Type.NUMBER } } } }, pattern_warnings: { type: Type.ARRAY, description: "Pola absensi yang tidak biasa atau mengkhawatirkan.", items: { type: Type.OBJECT, properties: { pattern_description: { type: Type.STRING, description: "cth., 'Tingkat absensi (Alpha) tinggi pada hari Senin.'" }, implicated_students: { type: Type.ARRAY, description: "Siswa yang terkait dengan pola ini.", items: { type: Type.STRING } } } } } } };

            const response = await ai.models.generateContent({ model: 'gemini-2.5-flash', contents: prompt, config: { systemInstruction, responseMimeType: "application/json", responseSchema } });
            setAiAnalysisResult(JSON.parse(response.text || '{}'));
        } catch (err: any) {
            toast.error("Gagal menganalisis data kehadiran.");
            console.error(err);
        } finally {
            setIsAiLoading(false);
        }
    };

    return (
        <div className="w-full min-h-full p-3 sm:p-4 md:p-6 lg:p-8 flex flex-col animate-fade-in-up">
            <AttendanceHeader
                onAnalyze={handleAnalyzeAttendance}
                onExport={() => setIsExportModalOpen(true)}
                isOnline={isOnline}
            />

            <div className="relative z-10 glass-card p-4 border border-white/20 shadow-lg shadow-black/5 -mx-4 px-4 sm:mx-0 sm:p-0 sm:static sm:border-none sm:shadow-none mb-6 transition-all rounded-2xl overflow-hidden">
                <div
                    className="group relative overflow-hidden w-full rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 shadow-lg shadow-indigo-500/30 cursor-pointer"
                    onClick={() => setDatePickerOpen(true)}
                >
                    <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20"></div>
                    <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none"></div>

                    <div className="relative p-5 sm:p-6 flex items-center justify-between">
                        <div className="flex items-center gap-5">
                            <div className="w-14 h-14 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center text-white shadow-inner border border-white/20 group-hover:scale-110 transition-transform duration-300">
                                <CalendarIcon className="w-7 h-7" />
                            </div>
                            <div className="text-left">
                                <p className="text-xs font-bold uppercase tracking-wider text-indigo-100 mb-1">Tanggal Absensi</p>
                                <h2 className="text-xl sm:text-2xl font-bold text-white flex items-center gap-3">
                                    {new Date(selectedDate).toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
                                    {selectedDate === today && <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-white/20 text-white border border-white/20 backdrop-blur-sm">HARI INI</span>}
                                </h2>
                            </div>
                        </div>
                        <div className="w-10 h-10 rounded-full bg-white/10 backdrop-blur-md flex items-center justify-center border border-white/20 group-hover:bg-white/20 transition-colors">
                            <ChevronDownIcon className="w-6 h-6 text-white" />
                        </div>
                    </div>
                </div>
            </div>

            {students && students.length > 0 && (
                <AttendanceStats summary={attendanceSummary} />
            )}

            <main className="bg-transparent flex flex-col">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6 px-1">
                    <div className="flex items-center gap-3 w-full sm:w-auto">
                        <h3 className="font-bold text-lg text-slate-900 dark:text-white flex items-center gap-2 tracking-wide">
                            Direktori Peserta Didik
                            <span className="bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-xs font-bold py-1 px-2.5 rounded-full border border-slate-200 dark:border-slate-700">{filteredStudents.length}</span>
                        </h3>
                        <div className="relative flex-1 sm:w-64">
                            <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                            <Input
                                placeholder="Cari nama siswa..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="pl-9 h-9 text-sm bg-white/50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700 focus:ring-indigo-500"
                            />
                        </div>
                    </div>
                    <div className="flex items-center gap-2 w-full sm:w-auto">
                        {unmarkedStudents.length > 0 && (
                            <Button onClick={markRestAsPresent} size="sm" variant="ghost" className="w-full sm:w-auto text-indigo-600 hover:bg-indigo-50 dark:text-indigo-400 dark:hover:bg-indigo-900/20 font-medium">
                                <CheckCircleIcon className="w-4 h-4 mr-2" />
                                Tandai Sisa Hadir ({unmarkedStudents.length})
                            </Button>
                        )}
                    </div>
                </div>

                <div className="space-y-3">
                    {isLoadingStudents ? <div className="p-12 text-center text-slate-500">Memuat daftar siswa...</div> :
                        !students || students.length === 0 ? <div className="p-16 text-center text-slate-400 bg-white/50 dark:bg-white/5 rounded-3xl border border-dashed border-slate-300 dark:border-slate-700">Pilih kelas untuk memulai absensi.</div> :
                            <AttendanceList
                                students={filteredStudents}
                                attendanceRecords={attendanceRecords}
                                onStatusChange={handleStatusChange}
                                onNoteClick={(studentId, currentNote) => {
                                    setNoteText(currentNote);
                                    setSelectedStudents(new Set([studentId]));
                                    setIsNoteModalOpen(true);
                                }}
                            />
                    }
                </div>

                {/* Static Save Button */}
                {students && students.length > 0 && (
                    <div className="mt-8 mb-8">
                        <Button
                            onClick={handleSave}
                            disabled={isSaving}
                            className="w-full h-14 text-lg font-bold shadow-xl shadow-indigo-500/30 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 border-none rounded-2xl transition-all hover:scale-[1.02] active:scale-[0.98]"
                        >
                            {isSaving ? 'Menyimpan...' : (isOnline ? 'Simpan Perubahan Absensi' : 'Simpan Offline')}
                        </Button>
                    </div>
                )}
            </main>

            <AiAnalysisModal
                isOpen={isAiModalOpen}
                onClose={() => setIsAiModalOpen(false)}
                isLoading={isAiLoading}
                result={aiAnalysisResult}
            />

            <Modal title="Catatan Absensi" isOpen={isNoteModalOpen} onClose={() => setIsNoteModalOpen(false)}>
                <div className="space-y-4">
                    <p className="text-sm text-slate-500">Tambahkan catatan untuk siswa yang dipilih.</p>
                    <textarea
                        value={noteText}
                        onChange={(e) => setNoteText(e.target.value)}
                        className="w-full h-32 p-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none"
                        placeholder="Contoh: Pulang cepat karena urusan keluarga..."
                    />
                    <div className="flex justify-end gap-2">
                        <Button variant="ghost" onClick={() => setIsNoteModalOpen(false)}>Batal</Button>
                        <Button onClick={handleSaveNote}>Simpan Catatan</Button>
                    </div>
                </div>
            </Modal>

            <AttendanceExportModal
                isOpen={isExportModalOpen}
                onClose={() => setIsExportModalOpen(false)}
                onExport={handleExport}
                isExporting={isExporting}
                exportMonth={exportMonth}
                setExportMonth={setExportMonth}
            />

            <BottomSheet isOpen={isDatePickerOpen} onClose={() => setDatePickerOpen(false)} title="Pilih Tanggal Absensi">
                <div className="space-y-6 pb-6">
                    <div className="bg-indigo-50 dark:bg-indigo-900/20 p-4 rounded-xl border border-indigo-100 dark:border-indigo-800/50 flex items-start gap-3">
                        <InfoIcon className="w-5 h-5 text-indigo-600 dark:text-indigo-400 flex-shrink-0 mt-0.5" />
                        <p className="text-sm text-indigo-800 dark:text-indigo-200">
                            Anda sedang melihat data absensi untuk tanggal <span className="font-bold">{new Date(selectedDate).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}</span>.
                        </p>
                    </div>

                    <div>
                        <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-3">Aksi Cepat</label>
                        <div className="grid grid-cols-2 gap-3">
                            <button
                                onClick={() => {
                                    setSelectedDate(today);
                                    setDatePickerOpen(false);
                                }}
                                className={`flex items-center justify-center gap-2 p-4 rounded-xl border transition-all ${selectedDate === today
                                    ? 'bg-indigo-600 border-indigo-600 text-white shadow-lg shadow-indigo-500/30'
                                    : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:border-indigo-400 dark:hover:border-indigo-500 text-slate-700 dark:text-slate-200'
                                    }`}
                            >
                                <CalendarIcon className="w-5 h-5" />
                                <span className="font-bold">Hari Ini</span>
                            </button>
                            <button
                                onClick={() => {
                                    const d = new Date();
                                    d.setDate(d.getDate() - 1);
                                    const yesterday = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
                                    setSelectedDate(yesterday);
                                    setDatePickerOpen(false);
                                }}
                                className={`flex items-center justify-center gap-2 p-4 rounded-xl border transition-all ${selectedDate !== today && new Date(selectedDate).getTime() === new Date(new Date().setDate(new Date().getDate() - 1)).getTime()
                                    ? 'bg-indigo-600 border-indigo-600 text-white shadow-lg shadow-indigo-500/30'
                                    : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:border-indigo-400 dark:hover:border-indigo-500 text-slate-700 dark:text-slate-200'
                                    }`}
                            >
                                <span className="font-bold">Kemarin</span>
                            </button>
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-3">Pilih Tanggal Manual</label>
                        <Input
                            type="date"
                            value={selectedDate}
                            onChange={(e) => {
                                setSelectedDate(e.target.value);
                                setDatePickerOpen(false);
                            }}
                            className="w-full h-12 text-lg"
                        />
                    </div>
                </div>
            </BottomSheet>
        </div>
    );
};

export default AttendancePage;