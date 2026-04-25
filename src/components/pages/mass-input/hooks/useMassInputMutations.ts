import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../../../../services/supabase';
import { generateOpenRouterJson } from '../../../../services/openRouterService';
import { useAuth } from '../../../../hooks/useAuth';
import { useToast } from '../../../../hooks/useToast';
import { useSemester } from '../../../../contexts/SemesterContext';
import { useOfflineStatus } from '../../../../hooks/useOfflineStatus';
import { Database } from '../../../../services/database.types';
import { generateStudentReport, ReportData as ReportDataType } from '../../../../services/pdfGenerator';
import { addPdfHeader, ensureLogosLoaded } from '../../../../utils/pdfHeaderUtils';
import { getAutoTable, getJsPDF } from '../../../../utils/dynamicImports';
import { recordAction } from '../../../../services/UndoManager';
import { violationList } from '../../../../services/violations.data';
import { sanitizeFilename } from '../../../../services/securityEnhanced';
import { InputMode, ClassRow, StudentRow, AcademicRecordRow, ReviewDataItem } from '../types';
import { dedupeAcademicRecords } from '../../../../utils/academicRecordUtils';

const DUPLICATE_GUARD_WINDOW_MINUTES = 10;

const getDuplicateGuardWindowIso = () => (
    new Date(Date.now() - DUPLICATE_GUARD_WINDOW_MINUTES * 60 * 1000).toISOString()
);

export interface UseMassInputMutationsParams {
    mode: InputMode | null;
    selectedClass: string;
    quizInfo: { name: string; subject: string; date: string };
    subjectGradeInfo: { subject: string; assessment_name: string; notes: string; semester: string };
    scores: Record<string, string>;
    validationErrors: Record<string, string>;
    existingGrades: AcademicRecordRow[] | undefined;
    selectedStudentIds: Set<string>;
    selectedViolationCode: string;
    violationDate: string;
    studentsData: StudentRow[] | undefined;
    noteMethod: 'ai' | 'template';
    templateNote: string;
    pasteData: string;
    gradedCount: number;
    filteredExistingGrades: AcademicRecordRow[];
    classes: ClassRow[] | undefined;
    setScores: React.Dispatch<React.SetStateAction<Record<string, string>>>;
    setSelectedStudentIds: React.Dispatch<React.SetStateAction<Set<string>>>;
}

export function useMassInputMutations(params: UseMassInputMutationsParams) {
    const {
        mode, selectedClass, quizInfo, subjectGradeInfo, scores, validationErrors,
        existingGrades, selectedStudentIds, selectedViolationCode, violationDate,
        studentsData, noteMethod, templateNote, pasteData,
        gradedCount, filteredExistingGrades, classes,
        setScores, setSelectedStudentIds,
    } = params;

    const { user } = useAuth();
    const queryClient = useQueryClient();
    const { activeSemester, activeAcademicYear } = useSemester();
    const toast = useToast();
    const isOnline = useOfflineStatus();

    const [isParsing, setIsParsing] = useState(false);
    const [isExporting, setIsExporting] = useState(false);
    const [exportProgress, setExportProgress] = useState('0%');
    const [confirmDeleteModal, setConfirmDeleteModal] = useState<{ isOpen: boolean; count: number }>({ isOpen: false, count: 0 });
    const [confirmDeleteText, setConfirmDeleteText] = useState('');

    const selectedViolation = violationList.find(v => v.code === selectedViolationCode) || null;

    const { mutate: submitData, isPending: isSubmitting } = useMutation({
        mutationFn: async () => {
            if (!mode || !user) throw new Error('Mode atau pengguna tidak diatur');
            switch (mode) {
                case 'quiz': {
                    if (!quizInfo.name || !quizInfo.subject || selectedStudentIds.size === 0)
                        throw new Error('Informasi aktivitas dan siswa harus diisi.');
                    const studentIds = Array.from(selectedStudentIds);
                    let existingQuizQuery = supabase
                        .from('quiz_points')
                        .select('id, student_id')
                        .in('student_id', studentIds)
                        .eq('user_id', user.id)
                        .eq('quiz_name', quizInfo.name)
                        .eq('subject', quizInfo.subject)
                        .eq('quiz_date', quizInfo.date)
                        .gte('created_at', getDuplicateGuardWindowIso())
                        .is('deleted_at', null);

                    existingQuizQuery = activeSemester?.id
                        ? existingQuizQuery.eq('semester_id', activeSemester.id)
                        : existingQuizQuery.is('semester_id', null);

                    const { data: existingQuizRows, error: existingQuizError } = await existingQuizQuery;
                    if (existingQuizError) throw existingQuizError;

                    const duplicateStudentIds = new Set((existingQuizRows || []).map((row) => row.student_id));
                    const records: Database['public']['Tables']['quiz_points']['Insert'][] = studentIds
                        .filter((student_id) => !duplicateStudentIds.has(student_id))
                        .map((student_id: string) => ({
                            quiz_name: quizInfo.name,
                            subject: quizInfo.subject,
                            quiz_date: quizInfo.date,
                            student_id,
                            user_id: user.id,
                            points: 1,
                            max_points: 1,
                            semester_id: activeSemester?.id || null,
                        }));

                    if (records.length === 0) {
                        return 'Tidak ada poin baru yang disimpan. Sistem mendeteksi input yang sama sudah tersimpan beberapa menit terakhir.';
                    }

                    const { data, error } = await supabase.from('quiz_points').insert(records).select();
                    if (error) throw error;
                    await recordAction(user.id, 'create', 'quiz_points', data.map(d => d.id));
                    return duplicateStudentIds.size > 0
                        ? `Poin keaktifan untuk ${records.length} siswa berhasil disimpan. ${duplicateStudentIds.size} data duplikat terbaru dilewati.`
                        : `Poin keaktifan untuk ${records.length} siswa berhasil disimpan.`;
                }
                case 'subject_grade': {
                    if (!subjectGradeInfo.subject || !subjectGradeInfo.assessment_name || gradedCount === 0)
                        throw new Error('Mata pelajaran, nama penilaian, dan setidaknya satu nilai harus diisi.');
                    if (Object.keys(validationErrors).length > 0)
                        throw new Error('Perbaiki nilai yang tidak valid sebelum menyimpan.');
                    const existingGradesMap = new Map(
                        dedupeAcademicRecords(existingGrades || []).map(g => [g.student_id, g.id])
                    );
                    const records = Object.entries(scores)
                        .filter(([, score]: [string, string]) => score && score.trim() !== '')
                        .map(([student_id, score]: [string, string]) => {
                            const numScore = Number(score);
                            if (numScore < 0 || numScore > 100)
                                throw new Error(`Nilai untuk siswa tidak valid: ${numScore}. Harus antara 0-100.`);
                            return {
                                id: existingGradesMap.get(student_id) || crypto.randomUUID(),
                                subject: subjectGradeInfo.subject,
                                assessment_name: subjectGradeInfo.assessment_name,
                                notes: subjectGradeInfo.notes || '',
                                score: numScore,
                                student_id,
                                user_id: user.id,
                                semester_id: subjectGradeInfo.semester || null,
                            };
                        });
                    const { data, error } = await supabase.from('academic_records').upsert(records).select();
                    if (error) throw error;
                    await recordAction(user.id, 'create', 'academic_records', data.map(d => d.id));
                    return `Nilai untuk ${records.length} siswa berhasil disimpan.`;
                }
                case 'violation': {
                    if (!selectedViolation || selectedStudentIds.size === 0)
                        throw new Error('Jenis pelanggaran dan siswa harus dipilih.');
                    const studentIds = Array.from(selectedStudentIds);
                    let existingViolationQuery = supabase
                        .from('violations')
                        .select('id, student_id')
                        .in('student_id', studentIds)
                        .eq('user_id', user.id)
                        .eq('date', violationDate)
                        .eq('description', selectedViolation.description)
                        .eq('points', selectedViolation.points)
                        .eq('type', selectedViolation.code)
                        .gte('created_at', getDuplicateGuardWindowIso())
                        .is('deleted_at', null);

                    existingViolationQuery = activeSemester?.id
                        ? existingViolationQuery.eq('semester_id', activeSemester.id)
                        : existingViolationQuery.is('semester_id', null);

                    const { data: existingViolationRows, error: existingViolationError } = await existingViolationQuery;
                    if (existingViolationError) throw existingViolationError;

                    const duplicateStudentIds = new Set((existingViolationRows || []).map((row) => row.student_id));
                    const records: Database['public']['Tables']['violations']['Insert'][] = studentIds
                        .filter((student_id) => !duplicateStudentIds.has(student_id))
                        .map((student_id: string) => ({
                            date: violationDate,
                            description: selectedViolation.description,
                            points: selectedViolation.points,
                            type: selectedViolation.code,
                            student_id,
                            user_id: user.id,
                            semester_id: activeSemester?.id || null,
                        }));

                    if (records.length === 0) {
                        return 'Tidak ada pelanggaran baru yang disimpan. Sistem mendeteksi input yang sama sudah tersimpan beberapa menit terakhir.';
                    }

                    const { data, error } = await supabase.from('violations').insert(records).select();
                    if (error) throw error;
                    await recordAction(user.id, 'create', 'violations', data.map(d => d.id));
                    return duplicateStudentIds.size > 0
                        ? `Pelanggaran untuk ${records.length} siswa berhasil dicatat. ${duplicateStudentIds.size} data duplikat terbaru dilewati.`
                        : `Pelanggaran untuk ${records.length} siswa berhasil dicatat.`;
                }
                default:
                    throw new Error(`Mode "${mode}" tidak mendukung penyimpanan data.`);
            }
        },
        onSuccess: (message) => {
            toast.success(message || 'Data berhasil disimpan!');
            queryClient.invalidateQueries({ queryKey: ['studentDetails'] });
        },
        onError: (err: Error) => toast.error(`Gagal menyimpan: ${err.message}`),
    });

    const { mutate: deleteGrades, isPending: isDeleting } = useMutation({
        mutationFn: async (recordIds: string[]) => {
            if (recordIds.length === 0) return 'Tidak ada nilai yang dipilih untuk dihapus.';
            const { error } = await supabase
                .from('academic_records')
                .update({ deleted_at: new Date().toISOString() } as Record<string, unknown>)
                .in('id', recordIds);
            if (error) throw error;
            return `${recordIds.length} data nilai berhasil dihapus.`;
        },
        onSuccess: (message) => {
            toast.success(message);
            queryClient.invalidateQueries({ queryKey: ['existingGrades'] });
            queryClient.invalidateQueries({ queryKey: ['deleted-items'] });
            queryClient.invalidateQueries({ queryKey: ['deleted-items-all'] });
            setSelectedStudentIds(new Set());
        },
        onError: (err: Error) => toast.error(`Gagal menghapus: ${err.message}`),
    });

    const handleAiParse = async () => {
        if (!studentsData || studentsData.length === 0) { toast.warning('Pilih kelas dengan siswa terlebih dahulu.'); return; }
        if (!pasteData.trim()) { toast.warning('Tempelkan data nilai terlebih dahulu.'); return; }
        setIsParsing(true);
        try {
            const studentNames = studentsData.map(s => s.name);
            const systemInstruction = `Anda adalah asisten entri data. Tugas Anda adalah mencocokkan nama dari teks yang diberikan dengan daftar nama siswa yang ada dan mengekstrak nilainya. Hanya cocokkan nama yang ada di daftar. Abaikan nama yang tidak ada di daftar. Format output harus JSON yang valid.
            
            Format JSON yang diharapkan:
            [
              { "studentName": "Nama Siswa", "score": "85" }
            ]`;
            const prompt = `Daftar Siswa: ${JSON.stringify(studentNames)}\n\nTeks Nilai untuk Diproses:\n${pasteData}`;
            const parsedResults = await generateOpenRouterJson<ReviewDataItem[]>(prompt, systemInstruction);
            if (!Array.isArray(parsedResults)) throw new Error('Format respon AI tidak valid (bukan list).');
            const newScores: Record<string, string> = {}; let matchedCount = 0;
            parsedResults.forEach(item => {
                const student = studentsData.find(s => s.name.toLowerCase() === item.studentName.toLowerCase());
                if (student) { newScores[student.id] = String(item.score); matchedCount++; }
            });
            setScores(prev => ({ ...prev, ...newScores }));
            toast.success(`${matchedCount} dari ${parsedResults.length} nilai berhasil dicocokkan dan diisi.`);
        } catch (error) {
            console.error('AI Parsing Error:', error);
            const errMsg = error instanceof Error ? error.message : '';
            if (errMsg.includes('network') || errMsg.includes('fetch') || errMsg.includes('Failed to fetch')) {
                toast.error('Gagal terhubung ke server AI. Periksa koneksi internet Anda.');
            } else if (errMsg.includes('rate') || errMsg.includes('limit') || errMsg.includes('429')) {
                toast.error('Batas permintaan AI tercapai. Coba lagi dalam beberapa saat.');
            } else {
                toast.error('Gagal memproses data. Pastikan format teks sesuai contoh yang diberikan.');
            }
        } finally { setIsParsing(false); }
    };

    const fetchReportDataForStudent = async (studentId: string, semesterId: string): Promise<ReportDataType> => {
        const studentRes = await supabase.from('students').select('*, classes(id, name)').eq('id', studentId).is('deleted_at', null).single();
        if (studentRes.error) throw new Error(studentRes.error.message);
        const [reportsRes, attendanceRes, academicRes, violationsRes, quizPointsRes] = await Promise.all([
            supabase.from('reports').select('*').eq('student_id', studentId),
            supabase.from('attendance').select('*').eq('student_id', studentId).eq('semester_id', semesterId).is('deleted_at', null),
            supabase.from('academic_records').select('*').eq('student_id', studentId).eq('semester_id', semesterId).is('deleted_at', null),
            supabase.from('violations').select('*').eq('student_id', studentId).eq('semester_id', semesterId).is('deleted_at', null),
            supabase.from('quiz_points').select('*').eq('student_id', studentId).eq('semester_id', semesterId).is('deleted_at', null),
        ]) as any; // eslint-disable-line @typescript-eslint/no-explicit-any
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const errors = [reportsRes, attendanceRes, academicRes, violationsRes, quizPointsRes].map((r: any) => r.error).filter((e: any) => e !== null);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        if (errors.length > 0) throw new Error(errors.map((e: any) => e!.message).join(', '));
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        return { student: studentRes.data as any, reports: reportsRes.data || [], attendanceRecords: attendanceRes.data || [], academicRecords: academicRes.data || [], violations: violationsRes.data || [], quizPoints: quizPointsRes.data || [] };
    };

    const handlePrintBulkReports = async () => {
        if (selectedStudentIds.size === 0) { toast.warning('Pilih setidaknya satu siswa.'); return; }
        if (!studentsData) return;
        setIsExporting(true); setExportProgress('0%'); toast.info(`Mulai proses cetak ${selectedStudentIds.size} rapor...`);
        const studentsToPrint = studentsData.filter(s => selectedStudentIds.has(s.id));
        try {
            setExportProgress('10%');
            if (!activeSemester?.id) throw new Error('Semester aktif tidak ditemukan.');
            const allReportData = await Promise.all(studentsToPrint.map(student => fetchReportDataForStudent(student.id, activeSemester.id)));
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
                const prompt = `Buat catatan wali kelas SINGKAT (2-3 kalimat saja per siswa) untuk:
${JSON.stringify(studentDataForPrompt.map(s => ({ id: s.studentId, nama: s.studentName, ringkasan: s.academicSummary.split('.')[0] })))}

Contoh output yang benar:
"Ananda menunjukkan kemajuan baik dalam belajar. Terus tingkatkan semangat dan keaktifan di kelas."`;
                const parsedResponse = await generateOpenRouterJson<{ notes: { studentId: string; teacherNote: string }[] }>(prompt, systemInstruction);
                const parsedNotes = parsedResponse.notes;
                teacherNotesMap = new Map(parsedNotes.map(item => {
                    let note = item.teacherNote.replace(/\\n/g, ' ').trim();
                    const sentences = note.split(/[.!?]+/).filter(s => s.trim().length > 0);
                    if (sentences.length > 3) note = sentences.slice(0, 3).join('. ').trim() + '.';
                    return [item.studentId, note];
                }));
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
                const semName = activeSemester.semester_number % 2 !== 0 ? 'Ganjil' : 'Genap';
                const acadYear = activeAcademicYear?.name || `${new Date().getFullYear()} / ${new Date().getFullYear() + 1}`;
                await generateStudentReport(doc, reportData, teacherNote, new Date().toISOString().slice(0, 10), semName, acadYear, user);
                setExportProgress(`${Math.round(70 + ((i + 1) / studentsToPrint.length) * 30)}%`);
            }
            const selectedClassName = classes?.find(c => c.id === selectedClass)?.name || 'Kelas';
            const fileName = allReportData.length === 1
                ? `Rapor_${sanitizeFilename(allReportData[0]?.student.name || studentsToPrint[0]?.name || 'Siswa')}.pdf`
                : `Rapor_Massal_${sanitizeFilename(selectedClassName)}.pdf`;
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
        const { data: allSubjectGrades } = await supabase
            .from('academic_records').select('*')
            .eq('subject', subjectGradeInfo.subject)
            .in('student_id', Array.from(selectedStudentIds))
            .is('deleted_at', null);
        const allAssessments = [...new Set(allSubjectGrades?.map(r => r.assessment_name || 'Lainnya'))].sort();
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
        doc.save(`Nilai_${subjectGradeInfo.subject.replace(/\s/g, '_')}_${className}.pdf`);
        toast.success('Rekap nilai berhasil diunduh.'); setIsExporting(false);
    };

    const handleConfirmDelete = () => {
        const recordIdsToDelete = filteredExistingGrades.filter(g => selectedStudentIds.has(g.student_id)).map(g => g.id);
        deleteGrades(recordIdsToDelete);
        setConfirmDeleteModal({ isOpen: false, count: 0 });
    };

    const handleSubmit = () => {
        if (mode === 'bulk_report') handlePrintBulkReports();
        else if (mode === 'academic_print') handlePrintGrades();
        else if (mode === 'delete_subject_grade') setConfirmDeleteModal({ isOpen: true, count: selectedStudentIds.size });
        else submitData();
    };

    return {
        submitData, isSubmitting,
        deleteGrades, isDeleting,
        handleAiParse, isParsing,
        handlePrintBulkReports, handlePrintGrades,
        isExporting, exportProgress,
        confirmDeleteModal, setConfirmDeleteModal,
        confirmDeleteText, setConfirmDeleteText,
        handleConfirmDelete, handleSubmit,
        isOnline,
    };
}
