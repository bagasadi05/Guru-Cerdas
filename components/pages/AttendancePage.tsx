import React, { useState, useMemo, useEffect } from 'react';
import { AttendanceStatus } from '../../types';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Select } from '../ui/Select';
import { Modal } from '../ui/Modal';
import { CheckCircleIcon, XCircleIcon, AlertCircleIcon, DownloadCloudIcon, BrainCircuitIcon, UserCheckIcon, PencilIcon, SparklesIcon, UserMinusIcon, UserPlusIcon, ChevronDownIcon, CalendarIcon, HeartIcon, InfoIcon } from '../Icons';
import BottomSheet from '../ui/BottomSheet';
import { useToast } from '../../hooks/useToast';
import { supabase, ai } from '../../services/supabase';
import { useAuth } from '../../hooks/useAuth';
import { Database } from '../../services/database.types';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useOfflineStatus } from '../../hooks/useOfflineStatus';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Type } from '@google/genai';
import * as XLSX from 'xlsx';
import { addToQueue } from '../../services/offlineQueue';

type ClassRow = Database['public']['Tables']['classes']['Row'];
type StudentRow = Database['public']['Tables']['students']['Row'];
type AttendanceRow = Database['public']['Tables']['attendance']['Row'];
type StudentWithClass = StudentRow & { classes: Pick<ClassRow, 'name'> | null };
type AttendanceRecord = { id?: string; status: AttendanceStatus; note: string };
type AiAnalysis = {
    perfect_attendance: string[];
    frequent_absentees: { student_name: string; absent_days: number; }[];
    pattern_warnings: { pattern_description: string; implicated_students: string[]; }[];
};

const statusOptions = [
    { value: AttendanceStatus.Hadir, label: 'Hadir', icon: CheckCircleIcon, color: 'green' },
    { value: AttendanceStatus.Izin, label: 'Izin', icon: InfoIcon, color: 'yellow' },
    { value: AttendanceStatus.Sakit, label: 'Sakit', icon: HeartIcon, color: 'blue' },
    { value: AttendanceStatus.Alpha, label: 'Alpha', icon: XCircleIcon, color: 'red' },
];

const statusStyles: Record<string, { active: string; hover: string; icon: string }> = {
    green: { active: 'border-green-500 shadow-lg shadow-green-500/20', hover: 'hover:border-green-500/50', icon: 'text-green-500' },
    yellow: { active: 'border-yellow-500 shadow-lg shadow-yellow-500/20', hover: 'hover:border-yellow-500/50', icon: 'text-yellow-500' },
    blue: { active: 'border-blue-500 shadow-lg shadow-blue-500/20', hover: 'hover:border-blue-500/50', icon: 'text-blue-500' },
    red: { active: 'border-red-500 shadow-lg shadow-red-500/20', hover: 'hover:border-red-500/50', icon: 'text-red-500' },
};

const buttonStatusStyles: Record<string, { active: string; hover: string; }> = {
    green: { active: 'bg-green-500/20 border-green-500 text-green-700 dark:text-green-300', hover: 'hover:border-green-500/50' },
    yellow: { active: 'bg-yellow-500/20 border-yellow-500 text-yellow-700 dark:text-yellow-300', hover: 'hover:border-yellow-500/50' },
    blue: { active: 'bg-blue-500/20 border-blue-500 text-blue-700 dark:text-blue-300', hover: 'hover:border-blue-500/50' },
    red: { active: 'bg-red-500/20 border-red-500 text-red-700 dark:text-red-300', hover: 'hover:border-red-500/50' },
};

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

    const [isExportModalOpen, setIsExportModalOpen] = useState(false);
    const [exportMonth, setExportMonth] = useState(new Date().toISOString().slice(0, 7));
    const [isExporting, setIsExporting] = useState(false);

    const [isAiModalOpen, setIsAiModalOpen] = useState(false);
    const [aiAnalysisResult, setAiAnalysisResult] = useState<AiAnalysis | null>(null);
    const [isAiLoading, setIsAiLoading] = useState(false);

    const { data: classes, isLoading: isLoadingClasses } = useQuery({
        queryKey: ['classes', user?.id],
        queryFn: async (): Promise<ClassRow[]> => {
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
            return (attendanceData || []).reduce((acc, record: AttendanceRow) => {
                acc[record.student_id] = { id: record.id, status: record.status as AttendanceStatus, note: record.notes || '' };
                return acc;
            }, {} as Record<string, AttendanceRecord>);
        },
        enabled: !!students && students.length > 0,
    });

    useEffect(() => {
        setAttendanceRecords(existingAttendance || {});
    }, [existingAttendance]);

    // FIX: Add explicit generic types to useMutation to ensure the `context` object in `onError` is correctly typed.
    const { mutate: saveAttendance, isPending: isSaving } = useMutation<
        { synced: boolean },
        Error,
        (Database['public']['Tables']['attendance']['Insert'] & { id?: string })[],
        { previousAttendance: Record<string, AttendanceRecord> | undefined }
    >({
        mutationFn: async (recordsToUpsert: (Database['public']['Tables']['attendance']['Insert'] & { id?: string })[]) => {
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
            // FIX: Explicitly type the `old` parameter to resolve the 'unknown' type error when optimistically updating the cache.
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
        // FIX: Explicitly type `record` to resolve 'unknown' type from Object.values.
        Object.values(attendanceRecords).forEach((record: AttendanceRecord) => {
            summary[record.status]++;
        });
        return summary;
    }, [attendanceRecords]);

    const unmarkedStudents = useMemo(() => {
        if (!students) return [];
        return students.filter(student => !attendanceRecords[student.id]);
    }, [students, attendanceRecords]);

    const completionPercentage = useMemo(() => {
        if (!students || students.length === 0) return 0;
        const marked = students.length - unmarkedStudents.length;
        return Math.round((marked / students.length) * 100);
    }, [students, unmarkedStudents]);



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

    const handleNoteChange = (studentId: string, note: string) => {
        setAttendanceRecords(prev => ({ ...prev, [studentId]: { ...prev[studentId], note } }));
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

        // FIX: Manually join student with class name as the relationship is not defined in Supabase schema.
        const classMap = new Map((classesRes.data || []).map(c => [c.id, { name: c.name }]));
        const studentsWithClasses = (studentsRes.data || []).map((s: StudentRow) => ({
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

            const studentsByClass = classes.map(c => ({
                ...c,
                students: students.filter(s => s.class_id === c.id).sort((a, b) => a.name.localeCompare(b.name))
            })).filter(c => c.students.length > 0);

            if (format === 'excel') {
                const wb = XLSX.utils.book_new();

                for (const classData of studentsByClass) {
                    const wsData = [];

                    // Header Info
                    wsData.push(['Laporan Absensi Bulanan']);
                    wsData.push([`Kelas: ${classData.name}`]);
                    wsData.push([`Periode: ${monthName} ${year}`]);
                    wsData.push([]); // Empty row

                    // Table Header
                    const headerRow = ['No', 'Nama Siswa'];
                    for (let i = 1; i <= daysInMonth; i++) headerRow.push(String(i));
                    headerRow.push('Hadir', 'Sakit', 'Izin', 'Alpha');
                    wsData.push(headerRow);

                    // Student Data
                    classData.students.forEach((student, index) => {
                        const row = [index + 1, student.name];
                        let h = 0, s = 0, i = 0, a = 0;

                        for (let day = 1; day <= daysInMonth; day++) {
                            const dateStr = `${year}-${String(monthNum).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                            const record = attendance.find(att => att.student_id === student.id && att.date === dateStr);
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

                    // Basic column width adjustment
                    const wscols = [{ wch: 5 }, { wch: 30 }];
                    for (let i = 0; i < daysInMonth; i++) wscols.push({ wch: 3 });
                    wscols.push({ wch: 5 }, { wch: 5 }, { wch: 5 }, { wch: 5 });
                    ws['!cols'] = wscols;

                    XLSX.utils.book_append_sheet(wb, ws, classData.name.substring(0, 31)); // Sheet name max 31 chars
                }

                XLSX.writeFile(wb, `Absensi_${exportMonth}.xlsx`);
                toast.success('Laporan Excel berhasil diunduh!');

            } else {
                // PDF Export
                const doc = new jsPDF({ orientation: 'landscape' });
                const pageHeight = doc.internal.pageSize.getHeight();
                const pageWidth = doc.internal.pageSize.getWidth();
                let isFirstClass = true;

                for (const classData of studentsByClass) {
                    if (!isFirstClass) doc.addPage('landscape');
                    isFirstClass = false;

                    let yPos = 20;

                    // --- HEADER WITH LOGO ---
                    // Add Logo (Assuming logo.png is available in public folder, but for PDF we need base64 or URL)
                    // Since we can't easily get base64 here without fetching, we'll use a text header for now but styled better.
                    // Ideally, we would load the image. Let's try to add a simple colored header bar.

                    doc.setFillColor(240, 249, 255); // Light blue background
                    doc.rect(0, 0, pageWidth, 40, 'F');

                    doc.setFontSize(22);
                    doc.setFont('helvetica', 'bold');
                    doc.setTextColor('#0f172a'); // Dark slate
                    doc.text('PortalGuru', 14, 18);

                    doc.setFontSize(12);
                    doc.setFont('helvetica', 'normal');
                    doc.setTextColor('#64748b');
                    doc.text('Laporan Absensi Siswa', 14, 26);

                    yPos = 50;

                    // Class Info
                    doc.setFontSize(14);
                    doc.setFont('helvetica', 'bold');
                    doc.setTextColor('#334155');
                    doc.text(`Kelas: ${classData.name}`, 14, yPos);
                    doc.text(`Periode: ${monthName} ${year}`, pageWidth - 14, yPos, { align: 'right' });
                    yPos += 10;

                    // --- SUMMARY ---
                    const classAttendance = attendance.filter(a => classData.students.some(s => s.id === a.student_id));
                    const summary = { H: 0, S: 0, I: 0, A: 0 };
                    classAttendance.forEach((rec: AttendanceRow) => {
                        if (rec.status === 'Hadir') summary.H++;
                        else if (rec.status === 'Sakit') summary.S++;
                        else if (rec.status === 'Izin') summary.I++;
                        else if (rec.status === 'Alpha') summary.A++;
                    });

                    doc.setFontSize(10);
                    const summaryColors: Record<string, string> = { H: '#22c55e', S: '#3b82f6', I: '#f59e0b', A: '#ef4444' };
                    const summaryLabels: Record<string, string> = { H: 'Hadir', S: 'Sakit', I: 'Izin', A: 'Alpha' };
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

                    // --- TABLE LOGIC ---
                    const head = [['No', 'Nama Siswa', ...Array.from({ length: daysInMonth }, (_, i) => String(i + 1)), 'H', 'S', 'I', 'A']];
                    const body = classData.students.map((student, index) => {
                        const row = [String(index + 1), student.name];
                        let h = 0, s = 0, i = 0, a = 0;
                        for (let day = 1; day <= daysInMonth; day++) {
                            const dateStr = `${year}-${String(monthNum).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                            const record = attendance.find(att => att.student_id === student.id && att.date === dateStr);
                            if (record) {
                                const statusChar = { Hadir: 'H', Sakit: 'S', Izin: 'I', Alpha: 'A' }[record.status] || '-';
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

                    // Split table if too wide (simplified split logic for PDF)
                    // For better readability, we might need to reduce font size or split columns.
                    // Let's try to fit it all first with smaller font.

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
                            // Dynamic columns for days will take remaining space
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

                    // Footer
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
        <div className="w-full min-h-full p-3 sm:p-4 md:p-6 lg:p-8 flex flex-col">
            <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-white">Pendataan Absensi</h1>
                    <p className="mt-1 text-gray-500 dark:text-gray-400">Kelola kehadiran siswa dengan mudah dan efisien.</p>
                </div>
                <div className="flex gap-2 w-full md:w-auto">
                    <Button onClick={handleAnalyzeAttendance} variant="outline" disabled={!isOnline} className="flex-1 md:flex-none justify-center">
                        <BrainCircuitIcon className="w-4 h-4 mr-2 text-purple-500" />
                        Analisis AI
                    </Button>
                    <Button onClick={() => setIsExportModalOpen(true)} variant="outline" className="flex-1 md:flex-none justify-center">
                        <DownloadCloudIcon className="w-4 h-4 mr-2 text-blue-500" />
                        Export
                    </Button>
                </div>
            </header>

            <div className="sticky top-0 z-20 bg-white/80 dark:bg-gray-950/80 backdrop-blur-md p-4 border-b border-gray-200 dark:border-gray-800 shadow-sm -mx-4 px-4 sm:mx-0 sm:p-0 sm:static sm:border-none sm:shadow-none mb-6 transition-all">
                <div
                    className="group relative overflow-hidden w-full rounded-2xl bg-gradient-to-br from-white to-blue-50 dark:from-gray-900 dark:to-blue-900/20 border border-blue-100 dark:border-blue-800/50 shadow-sm hover:shadow-md transition-all duration-300 cursor-pointer"
                    onClick={() => setDatePickerOpen(true)}
                >
                    <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/5 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none"></div>

                    <div className="relative p-4 sm:p-5 flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-xl bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-blue-600 dark:text-blue-400 group-hover:scale-110 transition-transform duration-300">
                                <CalendarIcon className="w-6 h-6" />
                            </div>
                            <div className="text-left">
                                <p className="text-xs font-semibold uppercase tracking-wider text-blue-600 dark:text-blue-400 mb-0.5">Tanggal Absensi</p>
                                <h2 className="text-lg sm:text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                                    {new Date(selectedDate).toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
                                    {selectedDate === today && <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400">Hari Ini</span>}
                                </h2>
                            </div>
                        </div>
                        <div className="w-8 h-8 rounded-full bg-white dark:bg-gray-800 flex items-center justify-center shadow-sm border border-gray-100 dark:border-gray-700 group-hover:bg-blue-50 dark:group-hover:bg-gray-700 transition-colors">
                            <ChevronDownIcon className="w-5 h-5 text-gray-400 group-hover:text-blue-500" />
                        </div>
                    </div>
                </div>
            </div>

            {students && students.length > 0 && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
                    {statusOptions.map((opt) => (
                        <div key={opt.value} className={`bg-white dark:bg-gray-800 p-4 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm flex flex-col items-center justify-center relative overflow-hidden group`}>
                            <div className={`absolute inset-0 opacity-0 group-hover:opacity-5 transition-opacity bg-${opt.color}-500`}></div>
                            <opt.icon className={`w-6 h-6 mb-2 text-${opt.color}-500`} />
                            <span className="text-2xl font-bold text-gray-900 dark:text-white">{attendanceSummary[opt.value]}</span>
                            <span className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">{opt.label}</span>
                        </div>
                    ))}
                </div>
            )}

            <main className="bg-transparent flex flex-col mb-40">
                <div className="flex justify-between items-center mb-4 px-1">
                    <h3 className="font-bold text-lg text-gray-900 dark:text-white flex items-center gap-2">
                        Daftar Siswa
                        <span className="bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 text-xs py-0.5 px-2 rounded-full">{students?.length || 0}</span>
                    </h3>
                    <div className="flex items-center gap-2">
                        {unmarkedStudents.length > 0 && (
                            <Button onClick={markRestAsPresent} size="sm" variant="ghost" className="text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20">
                                Tandai Sisa Hadir ({unmarkedStudents.length})
                            </Button>
                        )}
                    </div>
                </div>

                <div className="space-y-3">
                    {isLoadingStudents ? <div className="p-12 text-center text-gray-500">Memuat daftar siswa...</div> :
                        !students || students.length === 0 ? <div className="p-12 text-center text-gray-400 bg-white dark:bg-gray-800 rounded-2xl border border-dashed border-gray-300 dark:border-gray-700">Pilih kelas untuk memulai absensi.</div> :
                            <>
                                {students.map((student, index) => {
                                    const record = attendanceRecords[student.id];

                                    return (
                                        <div
                                            key={student.id}
                                            className="group flex flex-col sm:flex-row sm:items-center gap-4 p-4 border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-900/50 transition-colors"
                                        >
                                            {/* Student Info */}
                                            <div className="flex items-center gap-4 flex-grow min-w-0">
                                                <span className="text-gray-400 font-mono w-6 text-right flex-shrink-0">{index + 1}.</span>
                                                <img src={student.avatar_url} alt={student.name} className="w-10 h-10 rounded-full object-cover border border-gray-200 dark:border-gray-700" />
                                                <div className="min-w-0">
                                                    <h4 className="font-bold text-sm sm:text-base text-gray-900 dark:text-white uppercase tracking-wide truncate">{student.name}</h4>
                                                    {record?.note && (
                                                        <p className="text-xs text-blue-500 italic truncate flex items-center gap-1 mt-0.5">
                                                            <InfoIcon className="w-3 h-3" /> {record.note}
                                                        </p>
                                                    )}
                                                </div>
                                            </div>

                                            {/* Action Buttons */}
                                            <div className="flex items-center gap-2 w-full sm:w-auto mt-2 sm:mt-0 overflow-x-auto pb-1 sm:pb-0 no-scrollbar">
                                                {statusOptions.map((opt) => {
                                                    const isActive = record?.status === opt.value;

                                                    // Custom styles based on the screenshot reference
                                                    let buttonStyle = "bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 border border-transparent hover:bg-gray-200 dark:hover:bg-gray-700";

                                                    if (isActive) {
                                                        if (opt.value === AttendanceStatus.Hadir) buttonStyle = "bg-green-600 text-white border-green-500 shadow-lg shadow-green-900/20";
                                                        else if (opt.value === AttendanceStatus.Sakit) buttonStyle = "bg-blue-600 text-white border-blue-500 shadow-lg shadow-blue-900/20";
                                                        else if (opt.value === AttendanceStatus.Izin) buttonStyle = "bg-yellow-600 text-white border-yellow-500 shadow-lg shadow-yellow-900/20";
                                                        else if (opt.value === AttendanceStatus.Alpha) buttonStyle = "bg-red-600 text-white border-red-500 shadow-lg shadow-red-900/20";
                                                    }

                                                    return (
                                                        <button
                                                            key={opt.value}
                                                            onClick={() => handleStatusChange(student.id, opt.value)}
                                                            className={`
                                                                flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-xs sm:text-sm font-medium transition-all duration-200 min-w-[90px]
                                                                ${buttonStyle}
                                                            `}
                                                        >
                                                            <opt.icon className={`w-4 h-4 ${isActive ? 'text-white' : ''}`} />
                                                            <span>{opt.label}</span>
                                                        </button>
                                                    );
                                                })}

                                                <button
                                                    onClick={() => {
                                                        setNoteText(record?.note || '');
                                                        setSelectedStudents(new Set([student.id]));
                                                        setIsNoteModalOpen(true);
                                                    }}
                                                    className={`
                                                        p-2 rounded-lg transition-all ml-1
                                                        ${record?.note
                                                            ? 'text-blue-500 bg-blue-50 dark:bg-blue-900/20'
                                                            : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
                                                        }
                                                    `}
                                                    title="Catatan"
                                                >
                                                    <PencilIcon className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </div>
                                    );
                                })}
                            </>
                    }
                </div>

                {/* Static Save Button */}
                {students && students.length > 0 && (
                    <div className="mt-8 mb-8">
                        <Button
                            onClick={handleSave}
                            disabled={isSaving}
                            className="w-full h-12 text-lg font-bold shadow-lg shadow-indigo-500/20 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 border-none rounded-xl"
                        >
                            {isSaving ? 'Menyimpan...' : (isOnline ? 'Simpan Perubahan Absensi' : 'Simpan Offline')}
                        </Button>
                    </div>
                )}
            </main>

            <Modal title="Analisis Kehadiran AI" isOpen={isAiModalOpen} onClose={() => setIsAiModalOpen(false)} icon={<BrainCircuitIcon className="h-5 w-5" />}>
                {isAiLoading ? <div className="text-center py-8">Menganalisis data...</div> : aiAnalysisResult ? (
                    <div className="space-y-4 text-sm">
                        {aiAnalysisResult.perfect_attendance.length > 0 && <div><h4 className="font-bold text-green-500">Kehadiran Sempurna</h4><p>{aiAnalysisResult.perfect_attendance.join(', ')}</p></div>}
                        {aiAnalysisResult.frequent_absentees.length > 0 && <div><h4 className="font-bold text-yellow-500">Sering Alpha</h4><ul>{aiAnalysisResult.frequent_absentees.map(s => <li key={s.student_name}>{s.student_name} ({s.absent_days} hari)</li>)}</ul></div>}
                        {aiAnalysisResult.pattern_warnings.length > 0 && <div><h4 className="font-bold text-red-500">Pola Terdeteksi</h4><ul>{aiAnalysisResult.pattern_warnings.map(p => <li key={p.pattern_description}>{p.pattern_description} (Siswa: {p.implicated_students.join(', ')})</li>)}</ul></div>}
                    </div>
                ) : <div className="text-center py-8">Tidak ada hasil.</div>}
            </Modal>
            <Modal title="Export Laporan Absensi" isOpen={isExportModalOpen} onClose={() => setIsExportModalOpen(false)}>
                <div className="space-y-4">
                    <p className="text-sm text-gray-600 dark:text-gray-400">Pilih bulan dan tahun untuk mengekspor laporan absensi ke format PDF.</p>
                    <div>
                        <label htmlFor="export-month" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Bulan & Tahun</label>
                        <Input id="export-month" type="month" value={exportMonth} onChange={e => setExportMonth(e.target.value)} />
                    </div>
                    <div className="flex justify-end gap-2 pt-4">
                        <Button type="button" variant="ghost" onClick={() => setIsExportModalOpen(false)} disabled={isExporting}>Batal</Button>
                        <Button type="button" variant="outline" onClick={() => handleExport('excel')} disabled={isExporting} className="border-green-500 text-green-600 hover:bg-green-50">
                            {isExporting ? '...' : 'Excel (.xlsx)'}
                        </Button>
                        <Button type="button" onClick={() => handleExport('pdf')} disabled={isExporting}>
                            {isExporting ? 'Mengekspor...' : 'PDF (.pdf)'}
                        </Button>
                    </div>
                </div>
            </Modal>

            <BottomSheet isOpen={isDatePickerOpen} onClose={() => setDatePickerOpen(false)} title="Pilih Tanggal Absensi">
                <div className="space-y-6 pb-6">
                    <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-xl border border-blue-100 dark:border-blue-800/50 flex items-start gap-3">
                        <InfoIcon className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
                        <p className="text-sm text-blue-800 dark:text-blue-200">
                            Anda sedang melihat data absensi untuk tanggal <span className="font-bold">{new Date(selectedDate).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}</span>.
                        </p>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">Aksi Cepat</label>
                        <div className="grid grid-cols-2 gap-3">
                            <button
                                onClick={() => {
                                    setSelectedDate(today);
                                    setDatePickerOpen(false);
                                }}
                                className={`flex items-center justify-center gap-2 p-3 rounded-xl border transition-all ${selectedDate === today
                                    ? 'bg-blue-600 border-blue-600 text-white shadow-lg shadow-blue-500/30'
                                    : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 hover:border-blue-400 dark:hover:border-blue-500 text-gray-700 dark:text-gray-200'
                                    }`}
                            >
                                <CalendarIcon className="w-4 h-4" />
                                <span className="font-medium">Hari Ini</span>
                            </button>
                            <button
                                onClick={() => {
                                    const d = new Date();
                                    d.setDate(d.getDate() - 1);
                                    const yesterday = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
                                    setSelectedDate(yesterday);
                                    setDatePickerOpen(false);
                                }}
                                className={`flex items-center justify-center gap-2 p-3 rounded-xl border transition-all ${selectedDate !== today && new Date(selectedDate).getTime() === new Date(new Date().setDate(new Date().getDate() - 1)).getTime()
                                    ? 'bg-blue-600 border-blue-600 text-white shadow-lg shadow-blue-500/30'
                                    : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 hover:border-blue-400 dark:hover:border-blue-500 text-gray-700 dark:text-gray-200'
                                    }`}
                            >
                                <div className="w-4 h-4 rounded-full border-2 border-current opacity-60"></div>
                                <span className="font-medium">Kemarin</span>
                            </button>
                        </div>
                    </div>

                    <div>
                        <label htmlFor="attendance-date" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Pilih Tanggal Manual</label>
                        <div className="relative">
                            <Input
                                id="attendance-date"
                                type="date"
                                value={selectedDate}
                                onChange={(e) => {
                                    setSelectedDate(e.target.value);
                                    setDatePickerOpen(false);
                                }}
                                className="w-full h-12 pl-10 text-lg"
                            />
                            <CalendarIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
                        </div>
                    </div>
                </div>
            </BottomSheet>
        </div>
    );
};

export default AttendancePage;