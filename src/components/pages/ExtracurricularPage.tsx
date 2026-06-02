import React, { useState, useCallback, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Trophy, Plus, Trash2 } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { useToast } from '../../hooks/useToast';
import { getJsPDF, getAutoTable, getXLSX } from '../../utils/dynamicImports';

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

const ExtracurricularPage: React.FC = () => {
    const { user: _user } = useAuth();
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
            const monthName = date.toLocaleDateString('id-ID', { month: 'long', year: 'numeric' });

            const monthlyAttendance = await queryClient.fetchQuery({
                queryKey: ['export_monthly_attendance', selectedExtracurricularId, startDate, endDate],
                queryFn: async () => {
                    const { data, error } = await supabase.from('extracurricular_attendance')
                        .select('student_id, extracurricular_student_id, date, status')
                        .eq('extracurricular_id', selectedExtracurricularId).gte('date', startDate).lte('date', endDate);
                    if (error) throw error; return data;
                }
            });

            const exportAttendanceMap: Record<string, string> = {};
            monthlyAttendance?.forEach((record: any) => {
                const id = record.student_id ? `student:${record.student_id}` : `extracurricular_student:${record.extracurricular_student_id}`;
                const day = new Date(record.date).getDate();
                exportAttendanceMap[`${id}:${day}`] = record.status;
            });

            const { default: jsPDF } = await getJsPDF();
            const { default: autoTable } = await getAutoTable();
            const doc = new jsPDF('l', 'mm', 'a4');

            doc.setFontSize(14);
            doc.text(`Rekap Presensi Bulanan - ${selectedExtracurricularData.name}`, 14, 15);
            doc.setFontSize(10);
            doc.text(`Periode: ${monthName} | Total Siswa: ${enrollments.length}`, 14, 22);

            const daysColumns = Array.from({ length: daysInMonth }, (_, i) => String(i + 1));
            const tableColumn = ["No", "Nama", "Kelas", ...daysColumns, "H", "S", "I", "A"];

            const tableRows = [...enrollments].sort((a,b) => a.name.localeCompare(b.name)).map((enrollment, index) => {
                const id = `${enrollment.participantType}:${enrollment.participantId}`;
                let h = 0, s = 0, iz = 0, a = 0;
                const dailyStatuses = daysColumns.map(day => {
                    const status = exportAttendanceMap[`${id}:${day}`] || '';
                    if (status === 'Hadir') { h++; return 'H'; }
                    if (status === 'Sakit') { s++; return 'S'; }
                    if (status === 'Izin') { iz++; return 'I'; }
                    if (status === 'Alpha') { a++; return 'A'; }
                    if (status === 'Libur') return 'L';
                    return '';
                });
                return [index + 1, enrollment.name, enrollment.className || '-', ...dailyStatuses, h, s, iz, a];
            });

            autoTable(doc, {
                head: [tableColumn], body: tableRows, startY: 28, theme: 'grid',
                headStyles: { fillColor: [245, 158, 11], fontSize: 7, halign: 'center' },
                styles: { fontSize: 6, cellPadding: 1 },
                columnStyles: { 0: { cellWidth: 8 }, 1: { cellWidth: 35 }, 2: { cellWidth: 18 } }
            });
            doc.save(`Rekap_Presensi_${selectedExtracurricularData.name}_${monthName}.pdf`);
            toast.success('Download PDF berhasil');
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
            const monthName = date.toLocaleDateString('id-ID', { month: 'long', year: 'numeric' });

            const monthlyAttendance = await queryClient.fetchQuery({
                queryKey: ['export_monthly_attendance', selectedExtracurricularId, startDate, endDate],
                queryFn: async () => {
                    const { data, error } = await supabase.from('extracurricular_attendance')
                        .select('student_id, extracurricular_student_id, date, status')
                        .eq('extracurricular_id', selectedExtracurricularId).gte('date', startDate).lte('date', endDate);
                    if (error) throw error; return data;
                }
            });

            const exportAttendanceMap: Record<string, string> = {};
            monthlyAttendance?.forEach((record: any) => {
                const id = record.student_id ? `student:${record.student_id}` : `extracurricular_student:${record.extracurricular_student_id}`;
                const day = new Date(record.date).getDate();
                exportAttendanceMap[`${id}:${day}`] = record.status;
            });

            const XLSX = await getXLSX();
            const workbook = XLSX.utils.book_new();

            const daysHeaders = Array.from({ length: daysInMonth }, (_, i) => String(i + 1));
            const headers = ["No", "Nama Siswa", "Kelas", ...daysHeaders, "Hadir", "Sakit", "Izin", "Alpha"];

            const dataRows = [...enrollments].sort((a,b) => a.name.localeCompare(b.name)).map((enrollment, index) => {
                const id = `${enrollment.participantType}:${enrollment.participantId}`;
                let h = 0, s = 0, iz = 0, a = 0;
                const dailyStatuses = daysHeaders.map(day => {
                    const status = exportAttendanceMap[`${id}:${day}`] || '-';
                    if (status === 'Hadir') { h++; return 'H'; }
                    if (status === 'Sakit') { s++; return 'S'; }
                    if (status === 'Izin') { iz++; return 'I'; }
                    if (status === 'Alpha') { a++; return 'A'; }
                    if (status === 'Libur') return 'L';
                    return '-';
                });
                return [index + 1, enrollment.name, enrollment.className || '-', ...dailyStatuses, h, s, iz, a];
            });

            const wsData = [
                [`Rekap Presensi Bulanan - ${selectedExtracurricularData.name}`],
                [`Periode: ${monthName}`], [''], headers, ...dataRows
            ];

            const worksheet = XLSX.utils.aoa_to_sheet(wsData);
            worksheet['!cols'] = [
                { wch: 5 }, { wch: 25 }, { wch: 12 },
                ...Array(daysInMonth).fill({ wch: 3 }),
                { wch: 5 }, { wch: 5 }, { wch: 5 }, { wch: 5 }
            ];
            XLSX.utils.book_append_sheet(workbook, worksheet, "Rekap Bulanan");
            XLSX.writeFile(workbook, `Rekap_Presensi_${selectedExtracurricularData.name}_${monthName}.xlsx`);
            toast.success('Download Excel berhasil');
        } catch (err: any) { toast.error(`Gagal export: ${err.message}`); }
    };

    const handleExportGradesPDF = useCallback(async () => {
        if (!selectedExtracurricularData) return;
        const { default: jsPDF } = await getJsPDF();
        const { default: autoTable } = await getAutoTable();
        const doc = new jsPDF();
        const semesterName = activeSemester ? `${activeSemester.name} (Semester ${activeSemester.semester_number})` : '-';
        doc.setFontSize(18);
        doc.text(`Nilai Ekstrakurikuler: ${selectedExtracurricularData.name}`, 14, 22);
        doc.setFontSize(11);
        doc.text(`Semester: ${semesterName}`, 14, 32);
        if (selectedExtracurricularData.coach_name) doc.text(`Pembina: ${selectedExtracurricularData.coach_name}`, 14, 38);

        const tableBody = enrollments.map((enrollment, index) => {
            const grade = gradesMap[`${enrollment.participantType}:${enrollment.participantId}`];
            return [index + 1, enrollment.name, enrollment.className || '-', grade?.grade || '-', grade?.score ?? '-', grade?.description || '-'];
        });

        autoTable(doc, {
            head: [['No', 'Nama Siswa', 'Kelas', 'Predikat', 'Nilai', 'Deskripsi']],
            body: tableBody, startY: 45, styles: { fontSize: 9 },
            headStyles: { fillColor: [245, 158, 11] },
        });
        doc.save(`Nilai_Ekskul_${selectedExtracurricularData.name}_${new Date().toISOString().split('T')[0]}.pdf`);
    }, [activeSemester, enrollments, gradesMap, selectedExtracurricularData]);

    const handleExportGradesExcel = async () => {
        if (!selectedExtracurricularData) return;
        const XLSX = await getXLSX();
        const data = enrollments.map((enrollment, index) => {
            const grade = gradesMap[`${enrollment.participantType}:${enrollment.participantId}`];
            return {
                'No': index + 1, 'Nama Siswa': enrollment.name, 'Kelas': enrollment.className || '-',
                'Predikat': grade?.grade || '-', 'Nilai': grade?.score ?? '-', 'Deskripsi': grade?.description || '-'
            };
        });
        const worksheet = XLSX.utils.json_to_sheet(data);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, "Nilai");
        worksheet["!cols"] = [{ wch: 5 }, { wch: 30 }, { wch: 10 }, { wch: 12 }, { wch: 10 }, { wch: 30 }];
        XLSX.writeFile(workbook, `Nilai_Ekskul_${selectedExtracurricularData.name}_${new Date().toISOString().split('T')[0]}.xlsx`);
    };

    // ==================== RENDER ====================
    return (
        <div className="min-h-screen h-full flex flex-col overflow-auto pb-6 px-1">
            
            {/* Top Navigation Bar / Context Switcher */}
            {!selectedExtracurricularId && (
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8 border-b border-slate-200 dark:border-slate-800 pb-4">
                    <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center shadow-lg shadow-amber-500/20">
                            <Trophy className="w-6 h-6 text-white" />
                        </div>
                        <div>
                            <h1 className="text-2xl lg:text-3xl font-bold text-slate-800 dark:text-white">Ekstrakurikuler</h1>
                            <p className="text-slate-500 dark:text-slate-400 mt-0.5">Kelola kegiatan ekstrakurikuler, presensi, dan nilai siswa</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => setIsExternalStudentsView(!isExternalStudentsView)}
                            className={`px-4 py-2 text-sm font-medium rounded-xl border transition-colors ${
                                isExternalStudentsView 
                                    ? 'bg-amber-100 text-amber-700 border-amber-300 dark:bg-amber-900/30 dark:text-amber-400 dark:border-amber-700/50' 
                                    : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700'
                            }`}
                        >
                            Menu Siswa Eksternal
                        </button>
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
                                coach_name: e.coach_name || '', max_participants: e.max_participants, is_active: e.is_active,
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
                        <form onSubmit={(e) => { e.preventDefault(); mutations.extracurricularMutation.mutate(formData); }} className="p-6 space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Nama Ekstrakurikuler *</label>
                                <input required type="text" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-800 dark:text-white focus:ring-2 focus:ring-amber-500" />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Kategori</label>
                                    <select value={formData.category} onChange={(e) => setFormData({ ...formData, category: e.target.value })} className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-800 dark:text-white focus:ring-2 focus:ring-amber-500">
                                        <option value="">Pilih Kategori</option>
                                        <option value="Olahraga">Olahraga</option>
                                        <option value="Seni">Seni</option>
                                        <option value="Akademik">Akademik</option>
                                        <option value="Keagamaan">Keagamaan</option>
                                        <option value="Lainnya">Lainnya</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Maks Peserta</label>
                                    <input type="number" min="1" value={formData.max_participants} onChange={(e) => setFormData({ ...formData, max_participants: parseInt(e.target.value) || 30 })} className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-800 dark:text-white focus:ring-2 focus:ring-amber-500" />
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Hari Jadwal</label>
                                    <select value={formData.schedule_day} onChange={(e) => setFormData({ ...formData, schedule_day: e.target.value })} className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-800 dark:text-white focus:ring-2 focus:ring-amber-500">
                                        <option value="">Pilih Hari</option>
                                        {['Senin','Selasa','Rabu','Kamis','Jumat','Sabtu'].map(d => <option key={d} value={d}>{d}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Jam Jadwal</label>
                                    <input type="time" value={formData.schedule_time} onChange={(e) => setFormData({ ...formData, schedule_time: e.target.value })} className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-800 dark:text-white focus:ring-2 focus:ring-amber-500" />
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Nama Pembina</label>
                                <input type="text" value={formData.coach_name} onChange={(e) => setFormData({ ...formData, coach_name: e.target.value })} className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-800 dark:text-white focus:ring-2 focus:ring-amber-500" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Deskripsi</label>
                                <textarea rows={3} value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-800 dark:text-white focus:ring-2 focus:ring-amber-500 resize-none" />
                            </div>
                            <div className="flex items-center gap-3 p-4 bg-slate-50 dark:bg-slate-700/50 rounded-xl border border-slate-200 dark:border-slate-600">
                                <input type="checkbox" id="is_active" checked={formData.is_active} onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })} className="w-5 h-5 rounded text-amber-500 focus:ring-amber-500 bg-white border-slate-300" />
                                <label htmlFor="is_active" className="text-sm font-medium text-slate-700 dark:text-slate-300">Ekstrakurikuler Aktif</label>
                            </div>
                            <div className="pt-2 flex gap-3">
                                <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-300 font-medium hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors">Batal</button>
                                <button type="submit" disabled={mutations.extracurricularMutation.isPending} className="flex-1 px-4 py-2.5 bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded-xl font-bold hover:opacity-90 transition-opacity">{mutations.extracurricularMutation.isPending ? 'Menyimpan...' : 'Simpan'}</button>
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
                                        <input required type="text" value={row.name} onChange={(e) => { const n = [...newStudentRows]; n[index].name = e.target.value; setNewStudentRows(n); }} placeholder="Nama Siswa" className="flex-[2] px-3 py-2 rounded-xl border dark:border-slate-600 bg-white dark:bg-slate-700 dark:text-white" />
                                        <select value={row.gender} onChange={(e) => { const n = [...newStudentRows]; n[index].gender = e.target.value as Gender; setNewStudentRows(n); }} className="flex-1 px-3 py-2 rounded-xl border dark:border-slate-600 bg-white dark:bg-slate-700 dark:text-white">
                                            <option value="Laki-laki">L</option><option value="Perempuan">P</option>
                                        </select>
                                        <input type="text" value={row.class_name} onChange={(e) => { const n = [...newStudentRows]; n[index].class_name = e.target.value; setNewStudentRows(n); }} placeholder="Kelas (Opsional)" className="flex-1 px-3 py-2 rounded-xl border dark:border-slate-600 bg-white dark:bg-slate-700 dark:text-white" />
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
                            <input required type="text" value={editingExtraStudent.name} onChange={(e) => setEditingExtraStudent({...editingExtraStudent, name: e.target.value})} className="w-full px-3 py-2 rounded-xl border dark:border-slate-600 dark:bg-slate-700 dark:text-white" placeholder="Nama" />
                            <select value={editingExtraStudent.gender} onChange={(e) => setEditingExtraStudent({...editingExtraStudent, gender: e.target.value})} className="w-full px-3 py-2 rounded-xl border dark:border-slate-600 dark:bg-slate-700 dark:text-white">
                                <option value="Laki-laki">Laki-laki</option><option value="Perempuan">Perempuan</option>
                            </select>
                            <input type="text" value={editingExtraStudent.class_name || ''} onChange={(e) => setEditingExtraStudent({...editingExtraStudent, class_name: e.target.value})} className="w-full px-3 py-2 rounded-xl border dark:border-slate-600 dark:bg-slate-700 dark:text-white" placeholder="Kelas" />
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
