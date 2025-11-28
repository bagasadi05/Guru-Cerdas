import React, { useState, useMemo, useEffect } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase, ai } from '../../services/supabase';
import { useAuth } from '../../hooks/useAuth';
import { useToast } from '../../hooks/useToast';
import { Database } from '../../services/database.types';
import { Button } from '../ui/Button';
import { useOfflineStatus } from '../../hooks/useOfflineStatus';
import { ArrowLeftIcon } from '../Icons';
import { violationList } from '../../services/violations.data';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Type } from '@google/genai';
import { generateStudentReport, ReportData as ReportDataType } from '../../services/pdfGenerator';
import { Modal } from '../ui/Modal';
import { useLocation, useNavigate } from 'react-router-dom';

import { InputMode, Step, ReviewDataItem, StudentFilter, StudentRow, AcademicRecordRow } from './mass-input/types';
import { useMassInputData } from './mass-input/hooks/useMassInputData';
import { Step1_ModeSelection, actionCards } from './mass-input/components/Step1_ModeSelection';
import { Step2_Configuration } from './mass-input/components/Step2_Configuration';
import { Step2_StudentList } from './mass-input/components/Step2_StudentList';
import { Step2_Footer } from './mass-input/components/Step2_Footer';

const MassInputPage: React.FC = () => {
    const { user } = useAuth();
    const queryClient = useQueryClient();
    const toast = useToast();
    const isOnline = useOfflineStatus();
    const location = useLocation();
    const navigate = useNavigate();

    const [step, setStep] = useState<Step>(1);
    const [mode, setMode] = useState<InputMode | null>(null);
    const [selectedClass, setSelectedClass] = useState<string>('');
    const [quizInfo, setQuizInfo] = useState({ name: '', subject: '', date: new Date().toISOString().slice(0, 10) });
    const [subjectGradeInfo, setSubjectGradeInfo] = useState({ subject: '', assessment_name: '', notes: '' });
    const [scores, setScores] = useState<Record<string, string>>({});
    const [pasteData, setPasteData] = useState('');
    const [isParsing, setIsParsing] = useState(false);
    const [selectedViolationCode, setSelectedViolationCode] = useState('');
    const [violationDate, setViolationDate] = useState(new Date().toISOString().slice(0, 10));
    const [selectedStudentIds, setSelectedStudentIds] = useState(new Set<string>());
    const [searchTerm, setSearchTerm] = useState('');
    const [studentFilter, setStudentFilter] = useState<StudentFilter>('all');
    const [isExporting, setIsExporting] = useState(false);
    const [exportProgress, setExportProgress] = useState("0%");
    const [noteMethod, setNoteMethod] = useState<'ai' | 'template'>('ai');
    const [templateNote, setTemplateNote] = useState('Ananda [Nama Siswa] menunjukkan perkembangan yang baik semester ini. Terus tingkatkan semangat belajar dan jangan ragu bertanya jika ada kesulitan.');
    const [confirmDeleteModal, setConfirmDeleteModal] = useState<{ isOpen: boolean; count: number }>({ isOpen: false, count: 0 });
    const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});
    const [isConfigOpen, setIsConfigOpen] = useState(true);
    const [isCustomSubject, setIsCustomSubject] = useState(false);

    // Use custom hook for data fetching
    const {
        classes,
        isLoadingClasses,
        studentsData,
        isLoadingStudents,
        uniqueSubjects,
        assessmentNames,
        existingGrades,
        isLoadingGrades
    } = useMassInputData(selectedClass, subjectGradeInfo.subject, subjectGradeInfo.assessment_name, mode || undefined);

    useEffect(() => {
        const prefill = location.state?.prefill;
        if (prefill) {
            const { mode: preMode, classId, subject, assessment_name } = prefill;
            if (preMode) {
                setMode(preMode);
                setStep(2);
            }
            if (classId) setSelectedClass(classId);
            if (subject || assessment_name) {
                setSubjectGradeInfo(prev => ({
                    ...prev,
                    subject: subject || prev.subject,
                    assessment_name: assessment_name || prev.assessment_name
                }));
            }
            // Clear state to prevent re-triggering
            navigate(location.pathname, { replace: true, state: {} });
        }
    }, [location.state?.prefill, navigate]);

    useEffect(() => {
        if (classes && classes.length > 0 && !selectedClass) {
            setSelectedClass(classes[0].id);
        }
    }, [classes, selectedClass]);

    useEffect(() => {
        if (mode === 'subject_grade' && existingGrades) {
            const initialScores = existingGrades.reduce((acc: Record<string, string>, record: AcademicRecordRow) => {
                acc[record.student_id] = String(record.score);
                return acc;
            }, {} as Record<string, string>);
            setScores(initialScores);
        } else if (mode !== 'subject_grade') {
            setScores(prev => Object.keys(prev).length === 0 ? prev : {});
        }
    }, [existingGrades, mode]);

    const studentsWithGrades = useMemo(() => new Set(existingGrades?.map(g => g.student_id)), [existingGrades]);

    const students = useMemo((): StudentRow[] => {
        if (!studentsData) return [];
        let filtered = studentsData;
        if (mode === 'subject_grade' || mode === 'delete_subject_grade') {
            if (studentFilter === 'graded') {
                filtered = filtered.filter(s => studentsWithGrades.has(s.id));
            } else if (studentFilter === 'ungraded') {
                filtered = filtered.filter(s => !studentsWithGrades.has(s.id));
            }
        } else if (mode) {
            if (studentFilter === 'selected') {
                filtered = filtered.filter(s => selectedStudentIds.has(s.id));
            } else if (studentFilter === 'unselected') {
                filtered = filtered.filter(s => !selectedStudentIds.has(s.id));
            }
        }
        if (searchTerm) {
            filtered = filtered.filter(s => s.name.toLowerCase().includes(searchTerm.toLowerCase()));
        }
        return filtered;
    }, [studentsData, searchTerm, studentFilter, studentsWithGrades, selectedStudentIds, mode]);

    const handleModeSelect = (selectedMode: InputMode) => { setMode(selectedMode); setStep(2); setIsCustomSubject(false); };

    const handleBack = () => {
        setStep(1); setMode(null); setSelectedClass(''); setQuizInfo({ name: '', subject: '', date: new Date().toISOString().slice(0, 10) });
        setSubjectGradeInfo({ subject: '', assessment_name: '', notes: '' }); setScores({}); setPasteData(''); setSelectedViolationCode('');
        setViolationDate(new Date().toISOString().slice(0, 10)); setSelectedStudentIds(new Set()); setSearchTerm(''); setStudentFilter('all');
        setConfirmDeleteModal({ isOpen: false, count: 0 }); setIsCustomSubject(false);
    };

    useEffect(() => { setSelectedStudentIds(new Set()); setScores({}); setSearchTerm(''); setStudentFilter('all'); }, [selectedClass]);
    useEffect(() => { setStudentFilter('all'); }, [mode]);

    const gradedCount = useMemo(() => Object.values(scores).filter((s: string) => s && s.trim() !== '').length, [scores]);

    const selectableStudentsCount = useMemo(() => {
        if (!studentsData) return 0;
        if (mode === 'delete_subject_grade') {
            return studentsData.filter(s => studentsWithGrades.has(s.id)).length;
        }
        return studentsData.length;
    }, [studentsData, mode, studentsWithGrades]);

    const isAllSelected = useMemo(() => {
        if (selectableStudentsCount === 0) return false;
        return selectedStudentIds.size === selectableStudentsCount;
    }, [selectedStudentIds.size, selectableStudentsCount]);

    const selectedViolation = useMemo(() => violationList.find(v => v.code === selectedViolationCode) || null, [selectedViolationCode]);

    const handleSelectAllStudents = (checked: boolean) => {
        if (checked) {
            if (!studentsData) return;
            let idsToSelect = studentsData.map(s => s.id);
            if (mode === 'delete_subject_grade') {
                idsToSelect = studentsData.filter(s => studentsWithGrades.has(s.id)).map(s => s.id);
            }
            setSelectedStudentIds(new Set(idsToSelect));
        } else {
            setSelectedStudentIds(new Set());
        }
    };

    const handleStudentSelect = (studentId: string) => {
        setSelectedStudentIds(prev => {
            const newSet = new Set(prev);
            newSet.has(studentId) ? newSet.delete(studentId) : newSet.add(studentId);
            return newSet;
        });
    };

    const handleScoreChange = (studentId: string, value: string) => {
        const numValue = Number(value);
        const errors = { ...validationErrors };

        if (value && (isNaN(numValue) || numValue < 0 || numValue > 100)) {
            errors[studentId] = 'Nilai harus antara 0-100';
        } else {
            delete errors[studentId];
        }

        setValidationErrors(errors);
        setScores(prev => ({ ...prev, [studentId]: value }));
    };

    const { mutate: submitData, isPending: isSubmitting } = useMutation({
        mutationFn: async () => {
            if (!mode || !user) throw new Error("Mode atau pengguna tidak diatur");
            switch (mode) {
                case 'quiz': {
                    if (!quizInfo.name || !quizInfo.subject || selectedStudentIds.size === 0) throw new Error("Informasi aktivitas dan siswa harus diisi.");
                    const records: Database['public']['Tables']['quiz_points']['Insert'][] = Array.from(selectedStudentIds).map((student_id: string) => ({
                        quiz_name: quizInfo.name,
                        subject: quizInfo.subject,
                        quiz_date: quizInfo.date,
                        student_id,
                        user_id: user.id,
                        points: 1,
                        max_points: 1,
                    }));
                    const { error } = await supabase.from('quiz_points').insert(records); if (error) throw error; return `Poin keaktifan untuk ${records.length} siswa berhasil disimpan.`;
                }
                case 'subject_grade': {
                    if (!subjectGradeInfo.subject || !subjectGradeInfo.assessment_name || gradedCount === 0) throw new Error("Mata pelajaran, nama penilaian, dan setidaknya satu nilai harus diisi.");
                    if (Object.keys(validationErrors).length > 0) throw new Error("Perbaiki nilai yang tidak valid sebelum menyimpan.");

                    const existingGradesMap = new Map((existingGrades || []).map(g => [g.student_id, g.id]));
                    const records = Object.entries(scores)
                        .filter(([, score]: [string, string]) => score && score.trim() !== '')
                        .map(([student_id, score]: [string, string]) => {
                            const numScore = Number(score);
                            if (numScore < 0 || numScore > 100) {
                                throw new Error(`Nilai untuk siswa tidak valid: ${numScore}. Harus antara 0-100.`);
                            }
                            return {
                                id: existingGradesMap.get(student_id) || crypto.randomUUID(),
                                subject: subjectGradeInfo.subject,
                                assessment_name: subjectGradeInfo.assessment_name,
                                notes: subjectGradeInfo.notes,
                                score: numScore,
                                student_id,
                                user_id: user.id
                            };
                        });
                    const { error } = await supabase.from('academic_records').upsert(records);
                    if (error) throw error;
                    return `Nilai untuk ${records.length} siswa berhasil disimpan.`;
                }
                case 'violation': {
                    if (!selectedViolation || selectedStudentIds.size === 0) throw new Error("Jenis pelanggaran dan siswa harus dipilih.");
                    const records: Database['public']['Tables']['violations']['Insert'][] = Array.from(selectedStudentIds).map((student_id: string) => ({
                        date: violationDate, description: selectedViolation.description, points: selectedViolation.points, student_id, user_id: user.id
                    }));
                    const { error } = await supabase.from('violations').insert(records); if (error) throw error; return `Pelanggaran untuk ${records.length} siswa berhasil dicatat.`;
                }
            }
        },
        onSuccess: (message) => { toast.success(message || "Data berhasil disimpan!"); queryClient.invalidateQueries({ queryKey: ['studentDetails'] }); },
        onError: (err: Error) => toast.error(`Gagal menyimpan: ${err.message}`),
    });

    const { mutate: deleteGrades, isPending: isDeleting } = useMutation({
        mutationFn: async (recordIds: string[]) => {
            if (recordIds.length === 0) return "Tidak ada nilai yang dipilih untuk dihapus.";
            const { error } = await supabase.from('academic_records').delete().in('id', recordIds);
            if (error) throw error;
            return `${recordIds.length} data nilai berhasil dihapus.`;
        },
        onSuccess: (message) => {
            toast.success(message);
            queryClient.invalidateQueries({ queryKey: ['existingGrades'] });
            setSelectedStudentIds(new Set());
        },
        onError: (err: Error) => toast.error(`Gagal menghapus: ${err.message}`),
    });

    const handleAiParse = async () => {
        if (!studentsData || studentsData.length === 0) { toast.warning("Pilih kelas dengan siswa terlebih dahulu."); return; }
        if (!pasteData.trim()) { toast.warning("Tempelkan data nilai terlebih dahulu."); return; }
        setIsParsing(true);
        try {
            const studentNames = studentsData.map(s => s.name);
            const systemInstruction = `Anda adalah asisten entri data. Tugas Anda adalah mencocokkan nama dari teks yang diberikan dengan daftar nama siswa yang ada dan mengekstrak nilainya. Hanya cocokkan nama yang ada di daftar. Abaikan nama yang tidak ada di daftar. Format output harus JSON yang valid sesuai skema.`;
            const prompt = `Daftar Siswa: ${JSON.stringify(studentNames)}\n\nTeks Nilai untuk Diproses:\n${pasteData}`;
            const responseSchema = { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { studentName: { type: Type.STRING }, score: { type: Type.STRING } } } };
            const response = await ai.models.generateContent({ model: 'gemini-2.5-flash', contents: prompt, config: { systemInstruction, responseMimeType: "application/json", responseSchema } });
            const responseText = response.text || "[]";
            const parsedResults = JSON.parse(responseText.trim()) as ReviewDataItem[];
            const newScores: Record<string, string> = {}; let matchedCount = 0;
            parsedResults.forEach(item => {
                const student = studentsData.find(s => s.name.toLowerCase() === item.studentName.toLowerCase());
                if (student) { newScores[student.id] = String(item.score); matchedCount++; }
            });
            setScores(prev => ({ ...prev, ...newScores }));
            toast.success(`${matchedCount} dari ${parsedResults.length} nilai berhasil dicocokkan dan diisi.`);
        } catch (error) {
            console.error("AI Parsing Error:", error); toast.error("Gagal memproses data. Pastikan format teks benar.");
        } finally { setIsParsing(false); }
    };

    const fetchReportDataForStudent = async (studentId: string, userId: string): Promise<ReportDataType> => {
        const studentRes = await supabase.from('students').select('*, classes(id, name)').eq('id', studentId).eq('user_id', userId).single();
        if (studentRes.error) throw new Error(studentRes.error.message);
        const [reportsRes, attendanceRes, academicRes, violationsRes, quizPointsRes] = await Promise.all([
            supabase.from('reports').select('*').eq('student_id', studentId),
            supabase.from('attendance').select('*').eq('student_id', studentId),
            supabase.from('academic_records').select('*').eq('student_id', studentId),
            supabase.from('violations').select('*').eq('student_id', studentId),
            supabase.from('quiz_points').select('*').eq('student_id', studentId)
        ]) as any;
        const errors = [reportsRes, attendanceRes, academicRes, violationsRes, quizPointsRes].map((r: any) => r.error).filter((e: any) => e !== null);
        if (errors.length > 0) throw new Error(errors.map((e: any) => e!.message).join(', '));
        return { student: studentRes.data as any, reports: reportsRes.data || [], attendanceRecords: attendanceRes.data || [], academicRecords: academicRes.data || [], violations: violationsRes.data || [], quizPoints: quizPointsRes.data || [] };
    };

    const handlePrintBulkReports = async () => {
        if (selectedStudentIds.size === 0) { toast.warning("Pilih setidaknya satu siswa."); return; }
        if (!studentsData) return;
        setIsExporting(true); setExportProgress("0%"); toast.info(`Mulai proses cetak ${selectedStudentIds.size} rapor...`);
        const studentsToPrint = studentsData.filter(s => selectedStudentIds.has(s.id));
        try {
            setExportProgress("10%"); toast.info("Mengambil data siswa...");
            const allReportData = await Promise.all(studentsToPrint.map(student => fetchReportDataForStudent(student.id, user!.id)));
            setExportProgress("40%"); toast.info("Membuat catatan guru...");
            let teacherNotesMap: Map<string, string>;
            if (noteMethod === 'template') {
                teacherNotesMap = new Map(allReportData.map(data => [data.student.id, templateNote.replace(/\[Nama Siswa\]/g, data.student.name)]));
            } else {
                const studentDataForPrompt = allReportData.map(data => {
                    const academicSummary = data.academicRecords.length > 0 ? `Nilai rata-rata: ${Math.round(data.academicRecords.reduce((sum, r) => sum + r.score, 0) / data.academicRecords.length)}. Pelajaran terbaik: ${[...data.academicRecords].sort((a, b) => b.score - a.score)[0]?.subject || 'N/A'}.` : 'Belum ada data nilai.';
                    const behaviorSummary = data.violations.length > 0 ? `${data.violations.length} pelanggaran dengan total ${data.violations.reduce((sum, v) => sum + v.points, 0)} poin.` : 'Perilaku baik, tidak ada pelanggaran.';
                    const attendanceSummary = `Sakit: ${data.attendanceRecords.filter(r => r.status === 'Sakit').length}, Izin: ${data.attendanceRecords.filter(r => r.status === 'Izin').length}, Alpha: ${data.attendanceRecords.filter(r => r.status === 'Alpha').length}.`;
                    return { studentId: data.student.id, studentName: data.student.name, academicSummary, behaviorSummary, attendanceSummary };
                });
                const systemInstruction = `Anda adalah seorang guru wali kelas yang bijaksana dan suportif. Tugas Anda adalah menulis paragraf "Catatan Wali Kelas" untuk setiap siswa berdasarkan data yang diberikan. Catatan harus holistik, memotivasi, dan dalam satu paragraf (3-5 kalimat). Jawab dalam format JSON array yang diminta.`;
                const prompt = `Buatkan "Catatan Wali Kelas" untuk setiap siswa dalam daftar JSON berikut. Data Siswa: ${JSON.stringify(studentDataForPrompt)}`;
                const responseSchema = { type: Type.OBJECT, properties: { notes: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { studentId: { type: Type.STRING }, teacherNote: { type: Type.STRING } }, required: ["studentId", "teacherNote"] } } }, required: ["notes"] };
                const response = await ai.models.generateContent({ model: 'gemini-2.5-flash', contents: prompt, config: { systemInstruction, responseMimeType: "application/json", responseSchema } });
                const responseText = response.text || "{\"notes\": []}";
                const parsedResponse = JSON.parse(responseText);
                const parsedNotes = parsedResponse.notes as { studentId: string; teacherNote: string }[];
                teacherNotesMap = new Map(parsedNotes.map(item => [item.studentId, item.teacherNote.replace(/\\n/g, ' ')]));
            }
            setExportProgress("70%"); toast.info("Menyusun file PDF...");
            const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' }); let isFirstPage = true;
            for (let i = 0; i < allReportData.length; i++) {
                const reportData = allReportData[i];
                const teacherNote = teacherNotesMap.get(reportData.student.id) || "Catatan tidak dapat dibuat.";
                if (!isFirstPage) doc.addPage(); isFirstPage = false;
                generateStudentReport(doc, reportData, teacherNote, new Date().toISOString().slice(0, 10), 'Ganjil', `${new Date().getFullYear()} / ${new Date().getFullYear() + 1}`, user);
                setExportProgress(`${Math.round(70 + ((i + 1) / studentsToPrint.length) * 30)}%`);
            }
            doc.save(`Rapor_Massal_${classes?.find(c => c.id === selectedClass)?.name || 'Kelas'}.pdf`);
            toast.success("Semua rapor terpilih berhasil digabung dalam satu PDF!");
        } catch (err) {
            console.error("Gagal membuat rapor massal:", err); toast.error(`Gagal membuat rapor massal: ${err instanceof Error ? err.message : 'Unknown error'}`);
        } finally { setIsExporting(false); }
    };

    const handlePrintGrades = async () => {
        if (!selectedClass || !subjectGradeInfo.subject) { toast.warning("Pilih kelas dan mata pelajaran."); return; }
        if (selectedStudentIds.size === 0) { toast.warning("Pilih setidaknya satu siswa untuk mencetak."); return; }
        setIsExporting(true); toast.info("Membuat rekap nilai...");
        const doc = new jsPDF(); const className = classes?.find(c => c.id === selectedClass)?.name;
        doc.setFontSize(14); doc.setFont('helvetica', 'bold'); doc.text(`Rekap Nilai: ${subjectGradeInfo.subject}`, 14, 22);
        doc.setFontSize(12); doc.setFont('helvetica', 'normal'); doc.text(`Kelas: ${className}`, 14, 30);
        doc.text(`Tanggal Cetak: ${new Date().toLocaleDateString('id-ID')}`, 14, 38);

        const { data: allSubjectGrades } = await supabase
            .from('academic_records')
            .select('*')
            .eq('subject', subjectGradeInfo.subject)
            .in('student_id', Array.from(selectedStudentIds));

        const allAssessments = [...new Set(allSubjectGrades?.map(r => r.assessment_name || 'Lainnya'))].sort();

        const head = [['No', 'Nama Siswa', ...allAssessments]];

        const tableData = (studentsData || [])
            .filter(s => selectedStudentIds.has(s.id))
            .map((s, index) => {
                const studentScores: Record<string, string | number> = {};
                (allSubjectGrades || [])
                    .filter(r => r.student_id === s.id)
                    .forEach(r => {
                        studentScores[r.assessment_name || 'Lainnya'] = r.score;
                    });

                const rowData: (string | number)[] = [index + 1, s.name];
                allAssessments.forEach(assessmentName => {
                    rowData.push(studentScores[assessmentName] ?? 'N/A');
                });
                return rowData;
            });

        autoTable(doc, { startY: 45, head, body: tableData, theme: 'grid', headStyles: { fillColor: '#0284c7' } });
        doc.save(`Nilai_${subjectGradeInfo.subject.replace(/\s/g, '_')}_${className}.pdf`);
        toast.success("Rekap nilai berhasil diunduh."); setIsExporting(false);
    };

    const handleConfirmDelete = () => {
        const recordIdsToDelete = (existingGrades || [])
            .filter(g => selectedStudentIds.has(g.student_id))
            .map(g => g.id);
        deleteGrades(recordIdsToDelete);
        setConfirmDeleteModal({ isOpen: false, count: 0 });
    };

    const handleSubmit = () => {
        if (mode === 'bulk_report') handlePrintBulkReports();
        else if (mode === 'academic_print') handlePrintGrades();
        else if (mode === 'delete_subject_grade') setConfirmDeleteModal({ isOpen: true, count: selectedStudentIds.size });
        else submitData();
    };

    const summaryText = useMemo(() => {
        const totalStudents = studentsData?.length || 0;
        if (mode === 'subject_grade') { return `${gradedCount} dari ${totalStudents} siswa telah dinilai.`; }
        if (mode === 'delete_subject_grade') { return `${selectedStudentIds.size} dari ${studentsWithGrades.size} siswa terpilih untuk dihapus.`; }
        return `${selectedStudentIds.size} dari ${totalStudents} siswa dipilih.`;
    }, [mode, gradedCount, selectedStudentIds.size, studentsData, studentsWithGrades]);

    const submitButtonTooltip = useMemo(() => {
        if (!isOnline) return "Fitur ini memerlukan koneksi internet.";
        if (isSubmitting || isExporting || isDeleting) return "Sedang memproses...";
        if (!selectedClass) return "Pilih kelas terlebih dahulu.";
        switch (mode) {
            case 'subject_grade':
                if (!subjectGradeInfo.subject || !subjectGradeInfo.assessment_name) return "Lengkapi mata pelajaran dan nama penilaian.";
                if (gradedCount === 0) return "Masukkan setidaknya satu nilai siswa."; break;
            case 'quiz':
                if (!quizInfo.name || !quizInfo.subject) return "Lengkapi nama dan mata pelajaran aktivitas.";
                if (selectedStudentIds.size === 0) return "Pilih setidaknya satu siswa."; break;
            case 'violation':
                if (!selectedViolationCode) return "Pilih jenis pelanggaran.";
                if (selectedStudentIds.size === 0) return "Pilih setidaknya satu siswa."; break;
            case 'delete_subject_grade':
                if (!subjectGradeInfo.subject || !subjectGradeInfo.assessment_name) return "Pilih mata pelajaran dan penilaian.";
                if (selectedStudentIds.size === 0) return "Pilih setidaknya satu nilai siswa untuk dihapus."; break;
            case 'bulk_report':
            case 'academic_print':
                if (selectedStudentIds.size === 0) return "Pilih setidaknya satu siswa.";
                if (mode === 'academic_print' && !subjectGradeInfo.subject) return "Pilih mata pelajaran untuk dicetak."; break;
        }
        return '';
    }, [isOnline, isSubmitting, isExporting, isDeleting, selectedClass, mode, subjectGradeInfo, gradedCount, quizInfo, selectedStudentIds, selectedViolationCode]);

    const isSubmitDisabled = !!submitButtonTooltip;

    const filterOptions = useMemo((): { value: StudentFilter; label: string }[] => {
        if (mode === 'subject_grade' || mode === 'delete_subject_grade') return [{ value: 'all', label: 'Semua' }, { value: 'graded', label: 'Sudah Dinilai' }, { value: 'ungraded', label: 'Belum Dinilai' }];
        if (['quiz', 'violation', 'bulk_report', 'academic_print'].includes(mode || '')) return [{ value: 'all', label: 'Semua' }, { value: 'selected', label: 'Terpilih' }, { value: 'unselected', label: 'Belum Dipilih' }];
        return [];
    }, [mode]);

    return (
        <div className="w-full min-h-screen p-4 sm:p-6 md:p-8 pb-24 flex flex-col cosmic-bg text-white overflow-y-auto">
            {step === 1 ? <Step1_ModeSelection handleModeSelect={handleModeSelect} /> : (
                <div className="w-full max-w-7xl mx-auto flex flex-col flex-grow">
                    <header className="flex items-center gap-4 mb-6">
                        <Button variant="outline" size="icon" onClick={handleBack} className="bg-white/10 border-white/20 hover:bg-white/20 flex-shrink-0">
                            <ArrowLeftIcon className="w-4 h-4" />
                        </Button>
                        <div>
                            <h1 className="text-3xl font-bold tracking-tight">{actionCards.find(c => c.mode === mode)?.title}</h1>
                            <p className="mt-1 text-gray-300">{actionCards.find(c => c.mode === mode)?.description}</p>
                        </div>
                    </header>
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 flex-grow">
                        <Step2_Configuration
                            mode={mode}
                            isConfigOpen={isConfigOpen}
                            setIsConfigOpen={setIsConfigOpen}
                            selectedClass={selectedClass}
                            setSelectedClass={setSelectedClass}
                            classes={classes}
                            isLoadingClasses={isLoadingClasses}
                            quizInfo={quizInfo}
                            setQuizInfo={setQuizInfo}
                            subjectGradeInfo={subjectGradeInfo}
                            setSubjectGradeInfo={setSubjectGradeInfo}
                            isCustomSubject={isCustomSubject}
                            setIsCustomSubject={setIsCustomSubject}
                            uniqueSubjects={uniqueSubjects}
                            selectedViolationCode={selectedViolationCode}
                            setSelectedViolationCode={setSelectedViolationCode}
                            violationDate={violationDate}
                            setViolationDate={setViolationDate}
                            noteMethod={noteMethod}
                            setNoteMethod={setNoteMethod}
                            templateNote={templateNote}
                            setTemplateNote={setTemplateNote}
                            assessmentNames={assessmentNames}
                            pasteData={pasteData}
                            setPasteData={setPasteData}
                            isParsing={isParsing}
                            handleAiParse={handleAiParse}
                            isOnline={isOnline}
                        />

                        <Step2_StudentList
                            mode={mode}
                            searchTerm={searchTerm}
                            setSearchTerm={setSearchTerm}
                            filterOptions={filterOptions}
                            studentFilter={studentFilter}
                            setStudentFilter={setStudentFilter}
                            isLoadingStudents={isLoadingStudents}
                            students={students}
                            isAllSelected={isAllSelected}
                            handleSelectAllStudents={handleSelectAllStudents}
                            selectedStudentIds={selectedStudentIds}
                            handleStudentSelect={handleStudentSelect}
                            scores={scores}
                            handleScoreChange={handleScoreChange}
                            existingGrades={existingGrades}
                        />
                    </div>

                    <Modal isOpen={confirmDeleteModal.isOpen} onClose={() => setConfirmDeleteModal({ isOpen: false, count: 0 })} title="Konfirmasi Hapus Nilai">
                        <div className="space-y-4">
                            <p className="text-sm text-gray-600 dark:text-gray-400">Anda akan menghapus <strong className="text-white">{confirmDeleteModal.count} data nilai</strong> untuk penilaian <strong className="text-white">"{subjectGradeInfo.assessment_name}"</strong>. Aksi ini tidak dapat dibatalkan.</p>
                            <div className="pt-3 border-t border-gray-200 dark:border-gray-700">
                                <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">Ketik <strong className="text-red-500">HAPUS</strong> untuk mengonfirmasi:</p>
                                <input type="text" id="delete-confirm-input" placeholder="Ketik HAPUS" className="w-full px-3 py-2 text-sm border rounded-md mb-3 bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-gray-100" />
                            </div>
                            <div className="flex justify-end gap-2 pt-2">
                                <Button type="button" variant="ghost" onClick={() => setConfirmDeleteModal({ isOpen: false, count: 0 })}>Batal</Button>
                                <Button type="button" variant="destructive" onClick={() => {
                                    const input = document.getElementById('delete-confirm-input') as HTMLInputElement;
                                    if (input && input.value === 'HAPUS') {
                                        handleConfirmDelete();
                                    } else {
                                        toast.error('Konfirmasi tidak valid. Ketik HAPUS dengan benar.');
                                    }
                                }} disabled={isDeleting}>{isDeleting ? 'Menghapus...' : 'Ya, Hapus'}</Button>
                            </div>
                        </div>
                    </Modal>

                    <Step2_Footer
                        summaryText={summaryText}
                        mode={mode}
                        selectedStudentIds={selectedStudentIds}
                        gradedCount={gradedCount}
                        setScores={setScores}
                        setSelectedStudentIds={setSelectedStudentIds}
                        isExporting={isExporting}
                        exportProgress={exportProgress}
                        handleSubmit={handleSubmit}
                        isSubmitDisabled={isSubmitDisabled}
                        submitButtonTooltip={submitButtonTooltip}
                        isSubmitting={isSubmitting}
                        isDeleting={isDeleting}
                    />
                </div>
            )}
        </div>
    );
};

export default MassInputPage;
