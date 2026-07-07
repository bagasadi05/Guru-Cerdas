import React, { useState, useEffect, useMemo } from 'react';
import { Button } from '../../ui/Button';
import { CustomDropdown } from '../../ui/CustomDropdown';
import { Card } from '../../ui/Card';
import { useAuth } from '../../../hooks/useAuth';
import { bintangService, calculateAspectPoints, type AspectPointsSummary, type BintangGrade } from '../../../services/bintangService';
import { downloadBintangReportAction } from '../../../services/bintangPdfGenerator';
import { supabase } from '../../../services/supabase';
import { Send, FileText, CheckCircle, Zap, Shield, AlertTriangle, Sparkles, Info, Printer } from 'lucide-react';
import { Modal } from '../../ui/Modal';
import { useToast } from '../../../hooks/useToast';



/** Grade badge color map */
const gradeColors: Record<string, string> = {
    A: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300 ring-emerald-500/20',
    B: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300 ring-blue-500/20',
    C: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300 ring-amber-500/20',
    D: 'bg-rose-100 text-rose-800 dark:bg-rose-900/30 dark:text-rose-300 ring-rose-500/20',
};

const aspectMeta = {
    ADAB: { icon: Shield, label: 'Adab', color: 'text-indigo-500' },
    KEDISIPLINAN: { icon: AlertTriangle, label: 'Kedisiplinan', color: 'text-amber-500' },
    KERAPIAN: { icon: Sparkles, label: 'Kerapian', color: 'text-teal-500' },
} as const;

export const BintangEvaluationPage: React.FC = () => {
    const { user } = useAuth();
    const toast = useToast();
    
    const [classes, setClasses] = useState<any[]>([]);
    const [selectedClass, setSelectedClass] = useState('');
    
    const currentMonth = new Date().toISOString().slice(0, 7);
    const [selectedMonth, setSelectedMonth] = useState(currentMonth);
    
    const [students, setStudents] = useState<any[]>([]);
    const [evaluations, setEvaluations] = useState<any[]>([]);
    const [violations, setViolations] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    
    // Edit Modal state
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [editingStudent, setEditingStudent] = useState<any>(null);
    const [formData, setFormData] = useState({
        adab_score: 'A' as BintangGrade,
        kedisiplinan_score: 'A' as BintangGrade,
        kerapian_score: 'A' as BintangGrade,
        adab_notes: '',
        kedisiplinan_notes: '',
        kerapian_notes: '',
        catatan_wali: ''
    });
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isPublishing, setIsPublishing] = useState(false);
    const [downloadingStudentId, setDownloadingStudentId] = useState<string | null>(null);
    const [isDownloadingClass, setIsDownloadingClass] = useState(false);
    const [isGenerating, setIsGenerating] = useState(false);

    useEffect(() => {
        fetchClasses();
    }, []);

    useEffect(() => {
        if (selectedClass && selectedMonth) {
            fetchData();
        } else {
            setStudents([]);
            setEvaluations([]);
            setViolations([]);
        }
    }, [selectedClass, selectedMonth]);

    const fetchClasses = async () => {
        const { data } = await supabase.from('classes').select('id, name').eq('is_archived', false);
        if (data) setClasses(data);
    };

    const fetchData = async () => {
        setIsLoading(true);
        try {
            // Fetch students
            const { data: studentsData } = await supabase
                .from('students')
                .select('id, name')
                .eq('class_id', selectedClass)
                .is('deleted_at', null)
                .order('name');
                
            setStudents(studentsData || []);
            
            // Fetch evaluations
            const evals = await bintangService.getMonthlyEvaluations(selectedClass, selectedMonth);
            setEvaluations(evals || []);
            
            // Fetch violations for this class + month
            const vios = await bintangService.getViolationsForClass(selectedClass, selectedMonth);
            setViolations(vios || []);
            
        } catch (error) {
            console.error('Failed to fetch evaluation data', error);
        } finally {
            setIsLoading(false);
        }
    };
    
    // Build a map: studentId → AspectPointsSummary
    const studentAspectMap = useMemo(() => {
        const map = new Map<string, AspectPointsSummary>();
        // Group violations by student_id
        const grouped = new Map<string, Array<{ description: string; points: number }>>();
        for (const v of violations) {
            if (!grouped.has(v.student_id)) grouped.set(v.student_id, []);
            grouped.get(v.student_id)!.push({ description: v.description, points: v.points });
        }
        for (const [sid, vList] of grouped) {
            map.set(sid, calculateAspectPoints(vList));
        }
        return map;
    }, [violations]);

    const getEvaluationForStudent = (studentId: string) => {
        return evaluations.find(e => e.student_id === studentId);
    };

    const handleDownloadSinglePdf = async (studentId: string) => {
        setDownloadingStudentId(studentId);
        try {
            await downloadBintangReportAction({
                studentId,
                month: selectedMonth,
                user: (user as any) ? {
                    id: (user as any).id,
                    name: (user as any).user_metadata?.full_name || 'Wali Kelas',
                    avatarUrl: (user as any).user_metadata?.avatar_url || '',
                    email: (user as any).email
                } : null
            });
            toast.success('Rapor Bintang berhasil diunduh');
        } catch (error: any) {
            console.error('Error downloading PDF:', error);
            toast.error(error.message || 'Gagal mengunduh PDF');
        } finally {
            setDownloadingStudentId(null);
        }
    };

    const handleDownloadClassPdf = async () => {
        if (!selectedClass) return;
        setIsDownloadingClass(true);
        try {
            await downloadBintangReportAction({
                classId: selectedClass,
                month: selectedMonth,
                user: (user as any) ? {
                    id: (user as any).id,
                    name: (user as any).user_metadata?.full_name || 'Wali Kelas',
                    avatarUrl: (user as any).user_metadata?.avatar_url || '',
                    email: (user as any).email
                } : null
            });
            toast.success('Rapor Bintang Kelas berhasil diunduh');
        } catch (error: any) {
            console.error('Error downloading PDF:', error);
            toast.error(error.message || 'Gagal mengunduh PDF');
        } finally {
            setIsDownloadingClass(false);
        }
    };

    const getAspectSummary = (studentId: string): AspectPointsSummary => {
        return studentAspectMap.get(studentId) ?? {
            ADAB: { points: 0, count: 0, grade: 'A' as BintangGrade },
            KEDISIPLINAN: { points: 0, count: 0, grade: 'A' as BintangGrade },
            KERAPIAN: { points: 0, count: 0, grade: 'A' as BintangGrade },
        };
    };

    const generateAutoNote = (adab: BintangGrade, kedis: BintangGrade, kerapian: BintangGrade) => {
        let adabNote = '';
        let kedisNote = '';
        let kerapianNote = '';

        if (adab === 'A') adabNote = "Ananda menunjukkan akhlak mulia dan sopan santun yang sangat baik.";
        else if (adab === 'B') adabNote = "Secara umum adab Ananda sudah baik, namun bisa lebih ramah dan santun lagi.";
        else if (adab === 'C') adabNote = "Adab dan perilaku Ananda perlu lebih diperhatikan, terutama dalam berinteraksi dengan orang lain.";
        else adabNote = "Sangat perlu bimbingan orang tua di rumah terkait tata krama dan sopan santun Ananda.";

        if (kedis === 'A') kedisNote = "Kedisiplinannya di sekolah sangat tinggi dan selalu menaati aturan.";
        else if (kedis === 'B') kedisNote = "Kedisiplinan cukup memadai meski sesekali masih perlu diingatkan.";
        else if (kedis === 'C') kedisNote = "Ananda masih sering kurang disiplin, mohon dorongan agar lebih tepat waktu dan fokus.";
        else kedisNote = "Tingkat kedisiplinan sangat kurang dan butuh pengawasan ekstra ketat dari rumah.";

        if (kerapian === 'A') kerapianNote = "Serta senantiasa menjaga kebersihan dan kerapian seragam dengan sangat konsisten.";
        else if (kerapian === 'B') kerapianNote = "Penampilan sudah cukup rapi, mohon pertahankan kelengkapan atribut sekolah.";
        else if (kerapian === 'C') kerapianNote = "Sering terlihat kurang rapi, mohon dicek kembali penampilannya sebelum berangkat sekolah.";
        else kerapianNote = "Kerapian sangat kurang diperhatikan, mohon kerja samanya untuk selalu mengingatkan Ananda.";

        return { adabNote, kedisNote, kerapianNote };
    };

    const generateHomeroomNote = (adab: BintangGrade, kedis: BintangGrade, kerapian: BintangGrade) => {
        const grades = [adab, kedis, kerapian];
        const countA = grades.filter(g => g === 'A').length;
        const countB = grades.filter(g => g === 'B').length;
        const hasD = grades.includes('D');
        const hasC = grades.includes('C');
        
        if (countA === 3) {
            return "Alhamdulillah, perkembangan sikap Ananda pada bulan ini sangat baik di kelas. Pertahankan adab mulia, kedisiplinan, dan kerapian yang telah ditunjukkan.";
        }
        if (hasD) {
            return "Ananda memerlukan perhatian khusus dan bimbingan ekstra, baik di sekolah maupun di rumah, untuk memperbaiki kedisiplinan dan kepatuhan terhadap tata tertib sekolah.";
        }
        if (hasC) {
            return "Secara keseluruhan sikap Ananda sudah cukup baik, namun mohon bantuan Orang Tua untuk memotivasi Ananda agar lebih meningkatkan kedisiplinan dan kerapian berpakaian.";
        }
        if (countB >= 2 || (countA >= 1 && countB >= 1)) {
            return "Perkembangan sikap Ananda pada bulan ini dinilai baik. Teruslah bersemangat dalam belajar dan selalu konsisten mempertahankan sikap yang positif di sekolah.";
        }
        return "Perkembangan sikap Ananda secara keseluruhan dinilai baik. Mohon terus dukung dan arahkan Ananda agar dapat terus konsisten meningkatkan pembiasaan baiknya.";
    };

    const handleOpenEditModal = (student: any) => {
        setEditingStudent(student);
        const existingEval = getEvaluationForStudent(student.id);
        const aspect = getAspectSummary(student.id);
        
        if (existingEval) {
            setFormData({
                adab_score: existingEval.adab_score || aspect.ADAB.grade,
                kedisiplinan_score: existingEval.kedisiplinan_score || aspect.KEDISIPLINAN.grade,
                kerapian_score: existingEval.kerapian_score || aspect.KERAPIAN.grade,
                adab_notes: existingEval.adab_notes || '',
                kedisiplinan_notes: existingEval.kedisiplinan_notes || '',
                kerapian_notes: existingEval.kerapian_notes || '',
                catatan_wali: existingEval.catatan_wali || ''
            });
        } else {
            const autoNotes = generateAutoNote(aspect.ADAB.grade, aspect.KEDISIPLINAN.grade, aspect.KERAPIAN.grade);
            const autoHomeroomNote = generateHomeroomNote(aspect.ADAB.grade, aspect.KEDISIPLINAN.grade, aspect.KERAPIAN.grade);
            setFormData({
                adab_score: aspect.ADAB.grade,
                kedisiplinan_score: aspect.KEDISIPLINAN.grade,
                kerapian_score: aspect.KERAPIAN.grade,
                adab_notes: autoNotes.adabNote,
                kedisiplinan_notes: autoNotes.kedisNote,
                kerapian_notes: autoNotes.kerapianNote,
                catatan_wali: autoHomeroomNote
            });
        }
        setIsEditModalOpen(true);
    };

    const handleSaveEvaluation = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        try {
            await bintangService.upsertEvaluation({
                student_id: editingStudent.id,
                month: selectedMonth,
                evaluator_id: user?.id || '',
                adab_score: formData.adab_score,
                kedisiplinan_score: formData.kedisiplinan_score,
                kerapian_score: formData.kerapian_score,
                adab_notes: formData.adab_notes,
                kedisiplinan_notes: formData.kedisiplinan_notes,
                kerapian_notes: formData.kerapian_notes,
                catatan_wali: formData.catatan_wali
            });
            toast.success('Rapor BINTANG berhasil disimpan');
            setIsEditModalOpen(false);
            fetchData();
        } catch (error) {
            console.error(error);
            toast.error('Gagal menyimpan rapor');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleGenerateAll = async () => {
        setIsGenerating(true);
        try {
            const evalInserts = students.map(student => {
                const aspect = getAspectSummary(student.id);
                const autoNotes = generateAutoNote(aspect.ADAB.grade, aspect.KEDISIPLINAN.grade, aspect.KERAPIAN.grade);
                const autoHomeroomNote = generateHomeroomNote(aspect.ADAB.grade, aspect.KEDISIPLINAN.grade, aspect.KERAPIAN.grade);
                return {
                    student_id: student.id,
                    month: selectedMonth,
                    evaluator_id: user?.id || '',
                    adab_score: aspect.ADAB.grade,
                    adab_notes: autoNotes.adabNote,
                    kedisiplinan_score: aspect.KEDISIPLINAN.grade,
                    kedisiplinan_notes: autoNotes.kedisNote,
                    kerapian_score: aspect.KERAPIAN.grade,
                    kerapian_notes: autoNotes.kerapianNote,
                    catatan_wali: autoHomeroomNote
                };
            });
            
            await bintangService.bulkUpsertEvaluations(evalInserts);
            toast.success(`Berhasil generate rapor BINTANG untuk ${students.length} siswa`);
            fetchData();
        } catch (error) {
            console.error(error);
            toast.error('Gagal generate rapor otomatis');
        } finally {
            setIsGenerating(false);
        }
    };

    const handlePublish = async () => {
        setIsPublishing(true);
        try {
            await bintangService.publishEvaluations(selectedClass, selectedMonth);
            toast.success('Rapor BINTANG berhasil dipublikasikan');
            fetchData();
        } catch (error) {
            console.error(error);
            toast.error('Gagal mempublikasikan rapor');
        } finally {
            setIsPublishing(false);
        }
    };
    
    // Progress stats
    const evalStats = useMemo(() => {
        const filled = evaluations.length;
        const published = evaluations.filter(e => e.is_published).length;
        return { filled, published, total: students.length };
    }, [evaluations, students]);

    // Aspect section for the edit modal
    const renderAspectSection = (
        aspectKey: 'ADAB' | 'KEDISIPLINAN' | 'KERAPIAN', 
        scoreField: 'adab_score' | 'kedisiplinan_score' | 'kerapian_score'
    ) => {
        const meta = aspectMeta[aspectKey];
        const Icon = meta.icon;
        const aspect = editingStudent ? getAspectSummary(editingStudent.id) : null;
        const data = aspect?.[aspectKey];

        return (
            <div className="p-4 border border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50/50 dark:bg-slate-800/30">
                <div className="flex items-center gap-2 mb-3">
                    <Icon size={18} className={meta.color} />
                    <span className="font-bold text-sm text-slate-800 dark:text-slate-200">{meta.label}</span>
                    {data && data.count > 0 && (
                        <span className="ml-auto text-xs text-slate-500 dark:text-slate-400 bg-slate-200 dark:bg-slate-700 px-2 py-0.5 rounded-full">
                            {data.points} poin / {data.count} pelanggaran → Rekomendasi: <strong className={`${gradeColors[data.grade].split(' ')[1]}`}>{data.grade}</strong>
                        </span>
                    )}
                    {data && data.count === 0 && (
                        <span className="ml-auto text-xs text-emerald-600 dark:text-emerald-400 bg-emerald-100 dark:bg-emerald-900/20 px-2 py-0.5 rounded-full">
                            ✓ Tidak ada pelanggaran
                        </span>
                    )}
                </div>
                <div className="w-full sm:w-1/3 mt-2 sm:mt-0">
                    <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Nilai</label>
                    <CustomDropdown
                        value={formData[scoreField]}
                        onChange={(val) => setFormData({...formData, [scoreField]: val as BintangGrade})}
                        options={[
                            { value: 'A', label: 'A (Sangat Baik)' },
                            { value: 'B', label: 'B (Baik)' },
                            { value: 'C', label: 'C (Cukup)' },
                            { value: 'D', label: 'D (Kurang)' },
                        ]}
                    />
                </div>
                <div className="w-full mt-3">
                    <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Catatan {meta.label}</label>
                    <textarea
                        className="w-full bg-white dark:bg-slate-900/50 border border-slate-300 dark:border-slate-700 rounded-lg p-2 text-slate-800 dark:text-slate-200 text-sm focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                        rows={2}
                        value={aspectKey === 'ADAB' ? formData.adab_notes : aspectKey === 'KEDISIPLINAN' ? formData.kedisiplinan_notes : formData.kerapian_notes}
                        onChange={(e) => {
                            if (aspectKey === 'ADAB') setFormData({...formData, adab_notes: e.target.value});
                            else if (aspectKey === 'KEDISIPLINAN') setFormData({...formData, kedisiplinan_notes: e.target.value});
                            else setFormData({...formData, kerapian_notes: e.target.value});
                        }}
                        placeholder={`Tuliskan catatan khusus untuk ${meta.label.toLowerCase()}...`}
                    />
                </div>
            </div>
        );
    };

    return (
        <div className="space-y-6">
            {/* Header with filters and actions */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 p-4 sm:p-6 border-b border-slate-200 dark:border-slate-800">
                <div className="flex flex-col sm:flex-row gap-3 flex-1 w-full">
                    <div className="flex-1 w-full sm:max-w-xs">
                        <CustomDropdown value={selectedClass} onChange={setSelectedClass} placeholder="Pilih Kelas" options={classes.map(c => ({ value: c.id, label: c.name }))} />
                    </div>
                    <div className="flex-1 w-full sm:max-w-xs">
                        <CustomDropdown value={selectedMonth} onChange={setSelectedMonth} options={
                            Array.from({length: 6}).map((_, i) => {
                                const d = new Date();
                                d.setMonth(d.getMonth() - i);
                                const val = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
                                const label = d.toLocaleDateString('id-ID', { month: 'long', year: 'numeric' });
                                return { value: val, label };
                            })
                        } />
                    </div>
                </div>
                {students.length > 0 && (
                    <div className="grid grid-cols-2 sm:flex gap-2 w-full sm:w-auto">
                        <Button 
                            onClick={handleGenerateAll} 
                            disabled={isGenerating || students.length === 0}
                            variant="outline"
                            className="flex items-center justify-center gap-2 col-span-2 sm:col-span-1 min-h-[44px] sm:min-h-0"
                        >
                            <Zap size={16} />
                            {isGenerating ? 'Generating...' : 'Generate Semua'}
                        </Button>
                        <Button 
                            onClick={handleDownloadClassPdf}
                            disabled={isDownloadingClass || !selectedClass}
                            className="bg-emerald-600 hover:bg-emerald-700 text-white flex items-center justify-center gap-2 min-h-[44px] sm:min-h-0"
                        >
                            {isDownloadingClass ? (
                                <span className="animate-spin inline-block w-4 h-4 border-[2px] border-current border-t-transparent rounded-full" />
                            ) : (
                                <Printer size={16} />
                            )}
                            <span className="hidden sm:inline">{isDownloadingClass ? 'Proses...' : 'Cetak Kelas'}</span>
                        </Button>
                        <Button 
                            onClick={handlePublish} 
                            disabled={evaluations.length === 0 || isPublishing}
                            className="flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 min-h-[44px] sm:min-h-0"
                        >
                            <Send size={16} />
                            Publikasi
                        </Button>
                    </div>
                )}
            </div>

            {/* Progress bar */}
            {selectedClass && students.length > 0 && (
                <div className="px-4 sm:px-6">
                    <div className="flex items-center gap-4 text-sm">
                        <div className="flex-1 bg-slate-200 dark:bg-slate-700 rounded-full h-2 overflow-hidden">
                            <div 
                                className="bg-indigo-500 h-2 rounded-full transition-all duration-500"
                                style={{ width: `${(evalStats.filled / evalStats.total) * 100}%` }}
                            />
                        </div>
                        <span className="text-slate-600 dark:text-slate-400 whitespace-nowrap">
                            {evalStats.filled}/{evalStats.total} terisi
                            {evalStats.published > 0 && (
                                <span className="text-emerald-600 dark:text-emerald-400 ml-2">
                                    ({evalStats.published} published)
                                </span>
                            )}
                        </span>
                    </div>
                </div>
            )}

            <div className="p-0">
                {selectedClass && (
                <Card className="p-0 overflow-hidden">
                    {isLoading ? (
                        <div className="text-center py-10 text-slate-500">Memuat data siswa dan evaluasi...</div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="border-b border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/50">
                                        <th className="py-2 px-2 sm:py-3 sm:px-4 font-semibold text-xs sm:text-sm text-slate-600 dark:text-slate-300">Nama Siswa</th>
                                        <th className="py-2 px-1 sm:py-3 sm:px-4 font-semibold text-[10px] sm:text-sm text-slate-600 dark:text-slate-300 text-center">Poin</th>
                                        <th className="py-2 px-1 sm:py-3 sm:px-4 font-semibold text-[10px] sm:text-sm text-slate-600 dark:text-slate-300 text-center">Adab</th>
                                        <th className="py-2 px-1 sm:py-3 sm:px-4 font-semibold text-[10px] sm:text-sm text-slate-600 dark:text-slate-300 text-center">
                                            <span className="hidden sm:inline">Kedisiplinan</span>
                                            <span className="sm:hidden">Disiplin</span>
                                        </th>
                                        <th className="py-2 px-1 sm:py-3 sm:px-4 font-semibold text-[10px] sm:text-sm text-slate-600 dark:text-slate-300 text-center">
                                            <span className="hidden sm:inline">Kerapian</span>
                                            <span className="sm:hidden">Rapi</span>
                                        </th>
                                        <th className="hidden md:table-cell py-2 px-2 sm:py-3 sm:px-4 font-semibold text-xs sm:text-sm text-slate-600 dark:text-slate-300 text-center">Status</th>
                                        <th className="py-2 px-2 sm:py-3 sm:px-4 font-semibold text-[10px] sm:text-sm text-slate-600 dark:text-slate-300 text-right">Aksi</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {students.length === 0 ? (
                                        <tr>
                                            <td colSpan={7} className="text-center py-10 text-slate-500">
                                                Tidak ada data siswa ditemukan di kelas ini.
                                            </td>
                                        </tr>
                                    ) : (
                                        students.map((student) => {
                                            const ev = getEvaluationForStudent(student.id);
                                            const aspect = getAspectSummary(student.id);
                                            const isCompleted = !!ev;
                                            const isPublished = ev?.is_published;
                                            const totalPoints = (aspect.ADAB.points + aspect.KEDISIPLINAN.points + aspect.KERAPIAN.points);
                                            
                                            return (
                                                <tr key={student.id} className="border-b border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                                                    <td className="py-2 px-2 sm:py-3 sm:px-4 text-[11px] sm:text-sm font-medium text-slate-900 dark:text-white max-w-[90px] sm:max-w-none truncate" title={student.name}>
                                                        {student.name}
                                                    </td>
                                                    <td className="py-2 px-1 sm:py-3 sm:px-4 text-[10px] sm:text-sm text-center">
                                                        <span className={`font-bold ${totalPoints > 20 ? 'text-rose-600' : totalPoints > 10 ? 'text-amber-600' : totalPoints > 0 ? 'text-blue-600' : 'text-emerald-600'}`}>
                                                            {totalPoints}
                                                        </span>
                                                    </td>
                                                    {(['adab_score', 'kedisiplinan_score', 'kerapian_score'] as const).map((field, idx) => {
                                                        const aspectKey = (['ADAB', 'KEDISIPLINAN', 'KERAPIAN'] as const)[idx];
                                                        const score = ev?.[field] || aspect[aspectKey].grade;
                                                        return (
                                                            <td key={field} className="py-2 px-1 sm:py-3 sm:px-4 text-center">
                                                                <span className={`inline-flex px-1.5 py-0.5 sm:px-2.5 sm:py-1 rounded-full text-[10px] sm:text-xs font-bold ring-1 ${gradeColors[score]}`}>
                                                                    {score}
                                                                </span>
                                                            </td>
                                                        );
                                                    })}
                                                    <td className="hidden md:table-cell py-2 px-2 sm:py-3 sm:px-4 text-xs sm:text-sm text-center">
                                                        {isPublished ? (
                                                            <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-[10px] sm:text-xs font-medium bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300">
                                                                <CheckCircle size={12} /> Published
                                                            </span>
                                                        ) : isCompleted ? (
                                                            <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-[10px] sm:text-xs font-medium bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300">
                                                                Draft
                                                            </span>
                                                        ) : (
                                                            <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-[10px] sm:text-xs font-medium bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400">
                                                                Auto
                                                            </span>
                                                        )}
                                                    </td>
                                                    <td className="py-2 px-2 sm:py-3 sm:px-4 text-right">
                                                        <div className="flex justify-end gap-1 sm:gap-2">
                                                            <Button 
                                                                variant="outline" 
                                                                size="sm"
                                                                className="px-1.5 py-1 sm:px-3 sm:py-1.5 h-auto min-h-[44px] min-w-[44px] sm:min-h-0 sm:min-w-0"
                                                                onClick={() => handleOpenEditModal(student)}
                                                                disabled={isPublished}
                                                                title={isCompleted ? 'Edit' : 'Isi Rapor'}
                                                            >
                                                                <FileText size={14} className="sm:mr-1" />
                                                                <span className="hidden lg:inline">{isCompleted ? 'Edit' : 'Isi'}</span>
                                                            </Button>
                                                            <Button
                                                                variant="outline"
                                                                size="sm"
                                                                className="px-1.5 py-1 sm:px-3 sm:py-1.5 h-auto min-h-[44px] min-w-[44px] sm:min-h-0 sm:min-w-0"
                                                                onClick={() => handleDownloadSinglePdf(student.id)}
                                                                disabled={downloadingStudentId === student.id}
                                                                title="Cetak Rapor Bintang"
                                                            >
                                                                {downloadingStudentId === student.id ? (
                                                                    <span className="animate-spin inline-block w-3 h-3 sm:w-4 sm:h-4 border-[2px] border-current border-t-transparent rounded-full sm:mr-1" />
                                                                ) : (
                                                                    <Printer size={14} className="sm:mr-1" />
                                                                )}
                                                                <span className="hidden lg:inline">Cetak</span>
                                                            </Button>
                                                        </div>
                                                    </td>
                                                </tr>
                                            );
                                        })
                                    )}
                                </tbody>
                            </table>
                        </div>
                    )}
                </Card>
                )}
            </div>

            {/* Edit Modal */}
            <Modal
                isOpen={isEditModalOpen}
                onClose={() => setIsEditModalOpen(false)}
                title={`Rapor BINTANG: ${editingStudent?.name}`}
                maxWidth="max-w-2xl"
            >
                <form onSubmit={handleSaveEvaluation} className="space-y-4 pt-4">
                    <div className="flex items-start gap-3 p-3 rounded-lg bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-200 dark:border-indigo-800">
                        <Info size={18} className="text-indigo-500 mt-0.5 shrink-0" />
                        <p className="text-xs text-indigo-700 dark:text-indigo-300">
                            Nilai otomatis dihitung dari poin pelanggaran siswa bulan ini. Anda dapat mengubah nilai secara manual jika diperlukan.
                        </p>
                    </div>

                    {renderAspectSection('ADAB', 'adab_score')}
                    {renderAspectSection('KEDISIPLINAN', 'kedisiplinan_score')}
                    {renderAspectSection('KERAPIAN', 'kerapian_score')}

                    <div className="p-4 border border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50/50 dark:bg-slate-800/30">
                        <div className="flex items-center gap-2 mb-3">
                            <FileText size={18} className="text-emerald-600 dark:text-emerald-400" />
                            <span className="font-bold text-sm text-slate-800 dark:text-slate-200">Catatan Wali Kelas</span>
                        </div>
                        <div className="w-full">
                            <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Tuliskan pesan atau catatan perkembangan umum siswa untuk Orang Tua / Wali</label>
                            <textarea
                                className="w-full bg-white dark:bg-slate-900/50 border border-slate-300 dark:border-slate-700 rounded-lg p-2.5 text-slate-800 dark:text-slate-200 text-sm focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                                rows={3}
                                value={formData.catatan_wali}
                                onChange={(e) => setFormData({...formData, catatan_wali: e.target.value})}
                                placeholder="Tuliskan catatan umum wali kelas di sini..."
                            />
                        </div>
                    </div>



                    <div className="flex justify-end gap-3 pt-4 border-t border-slate-200 dark:border-slate-700">
                        <Button type="button" variant="outline" onClick={() => setIsEditModalOpen(false)}>Batal</Button>
                        <Button type="submit" disabled={isSubmitting}>
                            {isSubmitting ? 'Menyimpan...' : 'Simpan Rapor'}
                        </Button>
                    </div>
                </form>
            </Modal>
        </div>
    );
};

export default BintangEvaluationPage;
