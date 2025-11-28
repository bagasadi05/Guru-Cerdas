import React, { useState, useMemo, useEffect, useRef } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import { AttendanceStatus } from '../../types';
import { useToast } from '../../hooks/useToast';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { Input } from '../ui/Input';
import { Select } from '../ui/Select';
import { ArrowLeftIcon, CheckCircleIcon, XCircleIcon, AlertCircleIcon, FileTextIcon, UserCircleIcon, BrainCircuitIcon, CameraIcon, ShieldAlertIcon, PlusIcon } from '../Icons';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/Tabs';
import { Modal } from '../ui/Modal';
import { supabase } from '../../services/supabase';
import { useAuth } from '../../hooks/useAuth';
import { Database } from '../../services/database.types';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useOfflineStatus } from '../../hooks/useOfflineStatus';
import { optimizeImage } from '../utils/image';
import { violationList } from '../../services/violations.data';
import { ChildDevelopmentAnalysisTab } from './ChildDevelopmentAnalysisTab';
import { ChildDevelopmentData } from '../../services/childDevelopmentAnalysis';
import FloatingActionButton from '../ui/FloatingActionButton';
import { AiStudentSummary } from './student/AiStudentSummary';
import { StatCard } from './student/StatCard';
import { GradesTab } from './student/GradesTab';
import { ActivityTab } from './student/ActivityTab';
import { ViolationsTab } from './student/ViolationsTab';
import { ReportsTab } from './student/ReportsTab';
import { CommunicationTab } from './student/CommunicationTab';
import { PortalTab } from './student/PortalTab';
import { StudentDetailsData, ModalState, StudentMutationVars, ReportMutationVars, AcademicMutationVars, QuizMutationVars, ViolationMutationVars, CommunicationMutationVars, ClassRow, AcademicRecordRow, AttendanceRow, ViolationRow, QuizPointRow } from './student/types';
import { EditStudentFormValues, ReportFormValues, AcademicFormValues, QuizFormValues, ViolationFormValues, CommunicationFormValues } from './student/schemas';
import { EditStudentForm } from './student/forms/EditStudentForm';
import { ReportForm } from './student/forms/ReportForm';
import { AcademicForm } from './student/forms/AcademicForm';
import { QuizForm } from './student/forms/QuizForm';
import { ViolationForm } from './student/forms/ViolationForm';
import { CommunicationForm } from './student/forms/CommunicationForm';
import { useStudentMutations } from './student/hooks/useStudentMutations';

const generateAccessCode = (): string => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // No 0, O, 1, I
    let result = '';
    for (let i = 0; i < 6; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
};

const StudentDetailPage = () => {
    const { studentId } = useParams<{ studentId: string }>();
    const navigate = useNavigate();
    const location = useLocation();
    const { user } = useAuth();
    const isOnline = useOfflineStatus();
    const toast = useToast();
    const queryClient = useQueryClient();
    const [modalState, setModalState] = useState<ModalState>({ type: 'closed' });
    const [activeTab, setActiveTab] = useState('grades');
    const [copied, setCopied] = useState(false);
    const photoInputRef = useRef<HTMLInputElement>(null);
    const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const [subjectToApply, setSubjectToApply] = useState('');

    useEffect(() => {
        if (location.state?.openTab) {
            setActiveTab(location.state.openTab);
        }
    }, [location.state]);

    const { data: studentDetails, isLoading, isError, error: queryError } = useQuery<StudentDetailsData>({
        queryKey: ['studentDetails', studentId],
        queryFn: async () => {
            if (!studentId || !user) throw new Error("User or Student ID not found");
            const studentRes = await supabase.from('students').select('*').eq('id', studentId).eq('user_id', user.id).single();
            if (studentRes.error) throw new Error(studentRes.error.message);

            const [reportsRes, attendanceRes, academicRes, violationsRes, quizPointsRes, classesRes, commsRes] = await Promise.all([
                supabase.from('reports').select('*').eq('student_id', studentId),
                supabase.from('attendance').select('*').eq('student_id', studentId),
                supabase.from('academic_records').select('*').eq('student_id', studentId),
                supabase.from('violations').select('*').eq('student_id', studentId),
                supabase.from('quiz_points').select('*').eq('student_id', studentId),
                supabase.from('classes').select('*').eq('user_id', user.id),
                supabase.from('communications').select('*').eq('student_id', studentId).order('created_at', { ascending: true }),
            ]);

            // Combine error handling
            const errors = [reportsRes, attendanceRes, academicRes, violationsRes, quizPointsRes, classesRes, commsRes].map(r => r.error).filter(Boolean);
            if (errors.length > 0) throw new Error(errors.map(e => e!.message).join(', '));

            const studentData = studentRes.data;
            const classInfo = (classesRes.data || []).find(c => c.id === studentData.class_id);
            const studentWithClass = { ...studentData, classes: classInfo ? { id: classInfo.id, name: classInfo.name } : null };


            return {
                student: studentWithClass,
                reports: reportsRes.data || [],
                attendanceRecords: attendanceRes.data || [],
                academicRecords: academicRes.data || [],
                violations: violationsRes.data || [],
                quizPoints: quizPointsRes.data || [],
                classes: classesRes.data || [],
                communications: commsRes.data || [],
            };
        },
        enabled: !!studentId && !!user,
    });

    // Mutations setup using custom hook
    const {
        studentMutation,
        reportMutation,
        academicMutation,
        quizMutation,
        violationMutation,
        communicationMutation,
        deleteMutation,
        sendMessageMutation,
        applyPointsMutation
    } = useStudentMutations(studentId, () => setModalState({ type: 'closed' }));

    // Handlers
    const handleEditStudentSubmit = (data: EditStudentFormValues) => {
        const studentPayload: StudentMutationVars = {
            name: data.name,
            gender: data.gender,
            class_id: data.class_id,
        };
        studentMutation.mutate(studentPayload);
    };

    const handleReportSubmit = (data: ReportFormValues) => {
        if (!user || !studentId) return;
        const reportPayload = {
            date: data.date,
            title: data.title,
            notes: data.notes,
            student_id: studentId,
            user_id: user.id,
        };
        if (modalState.type === 'report' && modalState.data?.id) {
            reportMutation.mutate({ operation: 'edit', data: reportPayload, id: modalState.data.id });
        } else {
            reportMutation.mutate({ operation: 'add', data: reportPayload });
        }
    };

    const handleAcademicSubmit = (data: AcademicFormValues) => {
        if (!user || !studentId) return;
        const academicPayload = {
            subject: data.subject,
            assessment_name: data.assessment_name,
            score: data.score,
            notes: data.notes || '',
            student_id: studentId,
            user_id: user.id,
        };
        if (modalState.type === 'academic' && modalState.data?.id) {
            academicMutation.mutate({ operation: 'edit', data: academicPayload, id: modalState.data.id });
        } else {
            academicMutation.mutate({ operation: 'add', data: academicPayload });
        }
    };

    const handleQuizSubmit = (data: QuizFormValues) => {
        if (!user || !studentId) return;
        const quizPayload = {
            quiz_date: data.quiz_date,
            subject: data.subject,
            quiz_name: data.quiz_name,
            points: 1,
            max_points: 1,
            student_id: studentId,
            user_id: user.id,
        };
        if (modalState.type === 'quiz' && modalState.data?.id) {
            quizMutation.mutate({ operation: 'edit', data: quizPayload, id: modalState.data.id });
        } else {
            quizMutation.mutate({ operation: 'add', data: quizPayload });
        }
    };

    const handleViolationSubmit = (data: ViolationFormValues) => {
        if (!user || !studentId) return;
        const selectedViolation = violationList.find(v => v.description === data.description);
        const violationPayload = {
            date: data.date,
            description: data.description,
            points: selectedViolation?.points || 0,
            student_id: studentId,
            user_id: user.id,
        };
        if (modalState.type === 'violation' && modalState.data?.id) {
            violationMutation.mutate({ operation: 'edit', data: violationPayload, id: modalState.data.id });
        } else {
            violationMutation.mutate({ operation: 'add', data: violationPayload });
        }
    };

    const handleCommunicationSubmit = (data: CommunicationFormValues) => {
        if (modalState.type === 'editCommunication' && modalState.data?.id) {
            communicationMutation.mutate({ operation: 'edit', data: { message: data.message }, id: modalState.data.id });
        }
    };

    const handleDelete = (table: keyof Database['public']['Tables'], id: string | number) => {
        setModalState({ type: 'confirmDelete', title: 'Konfirmasi Hapus', message: 'Apakah Anda yakin ingin menghapus data ini secara permanen?', onConfirm: () => deleteMutation.mutate({ table, id }), isPending: deleteMutation.isPending });
    };

    const attendanceSummary = useMemo(() => {
        const summary = { Hadir: 0, Izin: 0, Sakit: 0, Alpha: 0 };
        studentDetails?.attendanceRecords.forEach(rec => { summary[rec.status as AttendanceStatus]++; });
        return summary;
    }, [studentDetails?.attendanceRecords]);

    const totalViolationPoints = useMemo(() => studentDetails?.violations.reduce((sum, v) => sum + v.points, 0) || 0, [studentDetails?.violations]);
    const unreadMessagesCount = useMemo(() => studentDetails?.communications.filter(m => m.sender === 'parent' && !m.is_read).length || 0, [studentDetails?.communications]);

    const handleCopyAccessCode = () => {
        if (!studentDetails?.student.access_code) return;
        navigator.clipboard.writeText(studentDetails.student.access_code);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const handleGenerateAccessCode = async () => {
        if (!studentId || studentMutation.isPending) return;
        const newCode = generateAccessCode();
        studentMutation.mutate({ access_code: newCode });
    };

    const handlePhotoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!e.target.files || e.target.files.length === 0 || !studentId) return;
        setIsUploadingPhoto(true);
        const file = e.target.files[0];
        try {
            const optimizedBlob = await optimizeImage(file, { maxWidth: 300, quality: 0.8 });
            const filePath = `student_avatars/${studentId}-${new Date().getTime()}.jpg`;
            const { error: uploadError } = await supabase.storage.from('student_assets').upload(filePath, optimizedBlob, { upsert: true });
            if (uploadError) throw uploadError;

            const { data: publicUrlData } = supabase.storage.from('student_assets').getPublicUrl(filePath);
            studentMutation.mutate({ avatar_url: publicUrlData.publicUrl });
        } catch (error: any) {
            toast.error(`Gagal unggah foto: ${error.message}`);
        } finally {
            setIsUploadingPhoto(false);
        }
    };

    useEffect(() => {
        const markMessagesAsRead = async () => {
            if (activeTab === 'communication' && studentDetails?.communications) {
                const unreadIds = studentDetails.communications
                    .filter(m => m.sender === 'parent' && !m.is_read)
                    .map(m => m.id);

                if (unreadIds.length > 0) {
                    const { error } = await supabase
                        .from('communications')
                        .update({ is_read: true })
                        .in('id', unreadIds);

                    if (error) {
                        console.error("Failed to mark messages as read:", error);
                    } else {
                        // Invalidate to refetch and update UI
                        queryClient.invalidateQueries({ queryKey: ['studentDetails', studentId] });
                    }
                }
            }
        };
        markMessagesAsRead();
    }, [activeTab, studentDetails?.communications, studentId, queryClient]);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [studentDetails?.communications]);

    const handleShare = () => {
        if (navigator.share && studentDetails?.student.access_code) {
            navigator.share({
                title: `Akses Portal Siswa - ${studentDetails.student.name}`,
                text: `Gunakan kode akses ${studentDetails.student.access_code} untuk melihat perkembangan ${studentDetails.student.name} di portal siswa.`,
                url: window.location.origin,
            })
                .then(() => console.log('Successful share'))
                .catch((error) => console.log('Error sharing', error));
        } else {
            toast.info("Fitur berbagi tidak didukung di browser ini. Silakan salin kodenya secara manual.");
        }
    };

    const handlePrint = () => {
        window.print();
    };

    const uniqueSubjectsForGrades = useMemo((): (string | null)[] => {
        if (!studentDetails?.academicRecords) return [];
        const records = studentDetails.academicRecords as AcademicRecordRow[];
        const subjects = records.map(r => r.subject);
        return [...new Set(subjects)];
    }, [studentDetails?.academicRecords]);

    const currentRecordForSubject = useMemo(() => {
        if (!subjectToApply || !studentDetails?.academicRecords) return null;
        return studentDetails.academicRecords
            .filter((r: AcademicRecordRow) => r.subject === subjectToApply)
            .sort((a: AcademicRecordRow, b: AcademicRecordRow) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0];
    }, [subjectToApply, studentDetails?.academicRecords]);

    useEffect(() => {
        if (modalState.type === 'applyPoints') {
            const firstSubject = uniqueSubjectsForGrades.length > 0 ? uniqueSubjectsForGrades[0] : '';
            setSubjectToApply(firstSubject || '');
        } else {
            setSubjectToApply('');
        }
    }, [modalState.type, uniqueSubjectsForGrades]);

    const handleApplyPointsSubmit = () => {
        if (!subjectToApply) {
            toast.error("Silakan pilih mata pelajaran.");
            return;
        }
        applyPointsMutation.mutate(subjectToApply);
    };

    if (isLoading) return <div className="flex items-center justify-center h-screen"><div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div></div>;
    if (isError) return <div className="flex items-center justify-center h-screen">Error: {(queryError as Error).message}</div>;
    if (!studentDetails || !studentDetails.student) return null;

    const { student, reports, academicRecords, quizPoints, violations, classes, communications } = studentDetails;


    return (
        <div className="space-y-8 p-4 md:p-6 pb-32 lg:pb-6 animate-fade-in-up bg-gray-50 dark:bg-gray-950 min-h-full max-w-7xl mx-auto">
            <div className="no-print">
                <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div className="flex items-center gap-4">
                        <Button variant="outline" size="icon" onClick={() => navigate(-1)} aria-label="Kembali" className="bg-white/50 dark:bg-white/10 border-gray-200 dark:border-white/20 hover:bg-white/80 dark:hover:bg-white/20 text-gray-900 dark:text-white"><ArrowLeftIcon className="w-5 h-5" /></Button>
                        <div className="relative">
                            <img src={student.avatar_url || `https://i.pravatar.cc/150?u=${student.id}`} alt={student.name} className="w-20 h-20 rounded-full object-cover border-4 border-white shadow-lg dark:border-white/10" />
                            <input type="file" ref={photoInputRef} onChange={handlePhotoChange} accept="image/png, image/jpeg" className="hidden" disabled={isUploadingPhoto || !isOnline} />
                            <button onClick={() => photoInputRef.current?.click()} disabled={isUploadingPhoto || !isOnline} className="absolute -bottom-1 -right-1 p-1.5 bg-purple-600 text-white rounded-full shadow-md hover:scale-110 transition-transform"><CameraIcon className="w-4 h-4" /></button>
                        </div>
                        <div>
                            <h1 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white">{student.name}</h1>
                            <p className="text-md text-gray-500 dark:text-gray-400">Kelas {student.classes?.name || 'N/A'}</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2 self-start md:self-center">
                        <Button variant="outline" onClick={() => setModalState({ type: 'editStudent', data: student })} disabled={!isOnline} className="bg-white/50 dark:bg-white/10 border-gray-200 dark:border-white/20 hover:bg-white/80 dark:hover:bg-white/20 text-gray-900 dark:text-white"><UserCircleIcon className="w-4 h-4 mr-2" />Edit Profil</Button>
                        <Link to={`/cetak-rapot/${studentId}`}><Button><FileTextIcon className="w-4 h-4 mr-2" />Cetak Rapor</Button></Link>
                    </div>
                </header>

                <AiStudentSummary studentDetails={studentDetails} />

                <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    <StatCard icon={CheckCircleIcon} label="Total Kehadiran" value={`${attendanceSummary.Hadir} hari`} color="from-green-500 to-emerald-400" />
                    <StatCard icon={AlertCircleIcon} label="Total Izin/Sakit" value={`${attendanceSummary.Izin + attendanceSummary.Sakit} hari`} color="from-yellow-500 to-amber-400" />
                    <StatCard icon={XCircleIcon} label="Total Alpha" value={`${attendanceSummary.Alpha} hari`} color="from-orange-500 to-red-400" />
                    <StatCard icon={ShieldAlertIcon} label="Poin Pelanggaran" value={totalViolationPoints} color="from-red-500 to-rose-400" />
                </section>

                <Card>
                    <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                        <div className="border-b border-gray-200 dark:border-white/10">
                            <div className="flex justify-start sm:justify-center px-4 sm:px-6 overflow-x-auto scrollbar-hide">
                                <TabsList className="bg-gray-100 dark:bg-black/20">
                                    <TabsTrigger value="grades">Nilai</TabsTrigger>
                                    <TabsTrigger value="activity">Keaktifan</TabsTrigger>
                                    <TabsTrigger value="violations">Pelanggaran</TabsTrigger>
                                    <TabsTrigger value="reports">Catatan Guru</TabsTrigger>
                                    <TabsTrigger value="development">
                                        <BrainCircuitIcon className="w-4 h-4 mr-1.5 inline" />
                                        Analisis Perkembangan
                                    </TabsTrigger>
                                    <TabsTrigger value="communication">
                                        <div className="relative">Komunikasi
                                            {unreadMessagesCount > 0 && <span className="absolute -top-1 -right-3 w-4 h-4 bg-red-500 rounded-full text-xs text-white flex items-center justify-center">{unreadMessagesCount}</span>}
                                        </div>
                                    </TabsTrigger>
                                    <TabsTrigger value="portal">Portal Ortu</TabsTrigger>
                                </TabsList>
                            </div>
                        </div>
                        <TabsContent value="grades" className="p-0">
                            <GradesTab records={academicRecords} onAdd={() => setModalState({ type: 'academic', data: null })} onEdit={(r) => setModalState({ type: 'academic', data: r })} onDelete={(id) => handleDelete('academic_records', id)} isOnline={isOnline} />
                        </TabsContent>
                        <TabsContent value="activity" className="p-0">
                            <ActivityTab quizPoints={quizPoints} onAdd={() => setModalState({ type: 'quiz', data: null })} onEdit={(r) => setModalState({ type: 'quiz', data: r })} onDelete={(id) => handleDelete('quiz_points', id)} onApplyPoints={() => setModalState({ type: 'applyPoints' })} isOnline={isOnline} />
                        </TabsContent>
                        <TabsContent value="violations" className="p-0">
                            <ViolationsTab violations={violations} onAdd={() => setModalState({ type: 'violation', mode: 'add', data: null })} onEdit={(r) => setModalState({ type: 'violation', mode: 'edit', data: r })} onDelete={(id) => handleDelete('violations', id)} isOnline={isOnline} />
                        </TabsContent>
                        <TabsContent value="reports" className="p-0">
                            <ReportsTab reports={reports} onAdd={() => setModalState({ type: 'report', data: null })} onEdit={(r) => setModalState({ type: 'report', data: r })} onDelete={(id) => handleDelete('reports', id)} isOnline={isOnline} />
                        </TabsContent>
                        <TabsContent value="development" className="p-6">
                            <ChildDevelopmentAnalysisTab
                                studentData={{
                                    student: {
                                        name: student.name,
                                        age: (student as any).age || 12,
                                        class: student.classes?.name
                                    },
                                    academicRecords: academicRecords.map((r: AcademicRecordRow) => ({
                                        subject: r.subject,
                                        score: r.score,
                                        assessment_name: r.assessment_name,
                                        notes: r.notes
                                    })),
                                    attendanceRecords: studentDetails.attendanceRecords.map((a: AttendanceRow) => ({
                                        status: a.status,
                                        date: a.date
                                    })),
                                    violations: violations.map((v: ViolationRow) => ({
                                        description: v.description,
                                        points: v.points,
                                        date: v.date
                                    })),
                                    quizPoints: quizPoints.map((q: QuizPointRow) => ({
                                        activity: q.quiz_name,
                                        points: q.points,
                                        date: q.quiz_date
                                    }))
                                } as ChildDevelopmentData}
                            />
                        </TabsContent>
                        <TabsContent value="communication" className="p-0">
                            <CommunicationTab communications={communications} userAvatarUrl={user?.avatarUrl} onSendMessage={(msg) => sendMessageMutation.mutate(msg)} onEditMessage={(msg) => setModalState({ type: 'editCommunication', data: msg })} onDeleteMessage={(id) => handleDelete('communications', id)} isOnline={isOnline} isSending={sendMessageMutation.isPending} />
                        </TabsContent>
                        <TabsContent value="portal" className="p-0">
                            <PortalTab student={student} onGenerateCode={handleGenerateAccessCode} isOnline={isOnline} isGenerating={studentMutation.isPending} />
                        </TabsContent>
                    </Tabs>
                </Card>
            </div>

            <div className="hidden print:block">
                <div id="printable-slip">
                    <div className="p-8 text-black" style={{ width: '12cm', fontFamily: 'sans-serif' }}>
                        <h3 className="text-lg font-bold">Informasi Akses Portal Siswa</h3>
                        <p className="text-sm mb-4">Harap simpan informasi ini dengan baik.</p>
                        <div className="border-t border-b border-gray-300 py-4 my-4">
                            <p className="text-xs">Nama Siswa:</p>
                            <p className="text-base font-semibold">{student.name}</p>
                            <p className="text-xs mt-2">Kelas:</p>
                            <p className="text-base font-semibold">{student.classes?.name || 'N/A'}</p>
                        </div>
                        <p className="text-center text-sm">Gunakan kode berikut untuk masuk:</p>
                        <div className="text-center my-2 p-3 bg-gray-100 rounded-md">
                            <p className="text-3xl font-mono font-bold tracking-widest">{student.access_code}</p>
                        </div>
                        <p className="text-center text-xs mt-4">
                            Masuk melalui: <span className="font-mono">{window.location.origin}</span>
                        </p>
                    </div>
                </div>
            </div>

            {/* Floating Action Button for Mobile & Desktop */}
            {['grades', 'activity', 'violations', 'reports'].includes(activeTab) && (
                <FloatingActionButton
                    icon={<PlusIcon className="w-6 h-6" />}
                    onClick={() => {
                        if (activeTab === 'grades') setModalState({ type: 'academic', data: null });
                        if (activeTab === 'activity') setModalState({ type: 'quiz', data: null });
                        if (activeTab === 'violations') setModalState({ type: 'violation', mode: 'add', data: null });
                        if (activeTab === 'reports') setModalState({ type: 'report', data: null });
                    }}
                    className="fixed bottom-24 right-4 lg:bottom-8 lg:right-8 z-40 shadow-xl shadow-blue-500/20"
                    aria-label="Tambah Data"
                />
            )}

            {modalState.type === 'applyPoints' ? (
                <Modal isOpen={true} onClose={() => setModalState({ type: 'closed' })} title="Gunakan Poin Keaktifan">
                    <div className="space-y-4">
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                            Anda akan menggunakan <strong>{quizPoints.length} poin</strong> keaktifan sebagai nilai tambahan. Poin ini akan dihapus setelah digunakan.
                        </p>
                        <div>
                            <label htmlFor="subject-select" className="block text-sm font-medium mb-1">Pilih Mata Pelajaran</label>
                            {/* FIX: Explicitly type the event object in onChange to resolve 'unknown' type error. */}
                            <Select id="subject-select" value={subjectToApply} onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setSubjectToApply(e.target.value)} required>
                                <option value="" disabled>-- Pilih --</option>
                                {/* FIX: Explicitly type the 's' parameter to resolve 'unknown' type error. */}
                                {uniqueSubjectsForGrades.map((s) => s && <option key={s} value={s}>{s}</option>)}
                            </Select>
                        </div>
                        {currentRecordForSubject && (
                            <div className="p-3 bg-gray-100 dark:bg-gray-800 rounded-md text-sm">
                                <p>Nilai Saat Ini: <strong className="text-lg">{currentRecordForSubject.score}</strong></p>
                                <p>Nilai Baru: <strong className="text-lg text-green-500">{Math.min(100, currentRecordForSubject.score + quizPoints.length)}</strong></p>
                            </div>
                        )}
                        <div className="flex justify-end gap-2 pt-4">
                            <Button type="button" variant="ghost" onClick={() => setModalState({ type: 'closed' })}>Batal</Button>
                            <Button type="button" onClick={handleApplyPointsSubmit} disabled={applyPointsMutation.isPending || !subjectToApply}>
                                {applyPointsMutation.isPending ? 'Menerapkan...' : 'Terapkan Poin'}
                            </Button>
                        </div>
                    </div>
                </Modal>
            ) : modalState.type !== 'closed' && modalState.type !== 'confirmDelete' && (
                <Modal isOpen={true} onClose={() => setModalState({ type: 'closed' })} title={
                    modalState.type === 'editStudent' ? 'Edit Profil Siswa' :
                        modalState.type === 'report' ? (modalState.data ? 'Edit Catatan' : 'Tambah Catatan Baru') :
                            modalState.type === 'academic' ? (modalState.data ? 'Edit Nilai' : 'Tambah Nilai Baru') :
                                modalState.type === 'quiz' ? (modalState.data ? 'Edit Poin' : 'Tambah Poin Keaktifan') :
                                    modalState.type === 'editCommunication' ? 'Edit Pesan' :
                                        'Tambah Pelanggaran'
                }>
                    {modalState.type === 'editStudent' && (
                        <EditStudentForm
                            defaultValues={modalState.data}
                            classes={classes}
                            onSubmit={handleEditStudentSubmit}
                            onClose={() => setModalState({ type: 'closed' })}
                            isPending={studentMutation.isPending}
                        />
                    )}
                    {modalState.type === 'report' && (
                        <ReportForm
                            defaultValues={modalState.data}
                            onSubmit={handleReportSubmit}
                            onClose={() => setModalState({ type: 'closed' })}
                            isPending={reportMutation.isPending}
                        />
                    )}
                    {modalState.type === 'academic' && (
                        <AcademicForm
                            defaultValues={modalState.data}
                            onSubmit={handleAcademicSubmit}
                            onClose={() => setModalState({ type: 'closed' })}
                            isPending={academicMutation.isPending}
                        />
                    )}
                    {modalState.type === 'quiz' && (
                        <QuizForm
                            defaultValues={modalState.data}
                            onSubmit={handleQuizSubmit}
                            onClose={() => setModalState({ type: 'closed' })}
                            isPending={quizMutation.isPending}
                        />
                    )}
                    {modalState.type === 'violation' && (
                        <ViolationForm
                            defaultValues={modalState.data}
                            onSubmit={handleViolationSubmit}
                            onClose={() => setModalState({ type: 'closed' })}
                            isPending={violationMutation.isPending}
                        />
                    )}
                    {modalState.type === 'editCommunication' && (
                        <CommunicationForm
                            defaultValues={modalState.data}
                            onSubmit={handleCommunicationSubmit}
                            onClose={() => setModalState({ type: 'closed' })}
                            isPending={communicationMutation.isPending}
                        />
                    )}
                </Modal>
            )}
            {modalState.type === 'confirmDelete' && (
                <Modal isOpen={true} onClose={() => setModalState({ type: 'closed' })} title={modalState.title}>
                    <p className="text-sm text-gray-600 dark:text-gray-400">{modalState.message}</p>
                    <div className="flex justify-end gap-2 pt-4">
                        <Button type="button" variant="ghost" onClick={() => setModalState({ type: 'closed' })} disabled={modalState.isPending}>Batal</Button>
                        <Button type="button" variant="destructive" onClick={modalState.onConfirm} disabled={modalState.isPending}>
                            {modalState.isPending ? 'Menghapus...' : 'Ya, Hapus'}
                        </Button>
                    </div>
                </Modal>
            )}
        </div>
    );
};

export default StudentDetailPage;