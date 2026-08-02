import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Button } from '../../ui/Button';
import { Card } from '../../ui/Card';
import { useAuth } from '../../../hooks/useAuth';
import { bintangService, calculateAspectPoints, type AspectPointsSummary, type BintangGrade } from '../../../services/bintangService';
import { supabase } from '../../../services/supabase';
import { Send, FileText, CheckCircle, Zap, Info, Printer, FileSpreadsheet } from 'lucide-react';
import { Modal } from '../../ui/Modal';
import { useToast } from '../../../hooks/useToast';
import { useConfirmation } from '../../ui/ConfirmationDialog';
import { gradeColors } from './bintangConstants';
import { AspectSectionEditor } from './AspectSectionEditor';
import { useBintangEvaluation } from './hooks/useBintangEvaluation';

interface BintangEvaluationPageProps {
    selectedClass: string;
    selectedMonth: string;
}

export const BintangEvaluationPage: React.FC<BintangEvaluationPageProps> = ({ selectedClass, selectedMonth }) => {
    const { user } = useAuth();
    const toast = useToast();
    const { confirm: confirmPublish, Dialog: PublishConfirmDialog } = useConfirmation();

    const [students, setStudents] = useState<Array<{id: string; name: string}>>([]);
    const [evaluations, setEvaluations] = useState<Array<{
        id: string; student_id: string; month: string;
        adab_score: string | null; kedisiplinan_score: string | null; kerapian_score: string | null;
        adab_notes: string | null; kedisiplinan_notes: string | null; kerapian_notes: string | null;
        catatan_wali: string | null; is_published: boolean; evaluator_id: string;
    }>>([]);
    const [violations, setViolations] = useState<Array<{
        id: string; student_id: string; description: string; points: number;
        date: string; severity: string | null; students: {name: string} | null;
    }>>([]);
    const [isLoading, setIsLoading] = useState(false);

    // Shared evaluation hook
    const evalHook = useBintangEvaluation({
        toast,
        confirmPublish,
        fetchData: async () => {
            await fetchData();
        },
        selectedMonth,
        user,
        students,
        evaluations,
        selectedClass,
    });

    const fetchData = useCallback(async () => {
        setIsLoading(true);
        try {
            const { data: studentsData } = await supabase
                .from('students')
                .select('id, name')
                .eq('class_id', selectedClass)
                .is('deleted_at', null)
                .order('name');
            setStudents(studentsData || []);

            const evals = await bintangService.getMonthlyEvaluations(selectedClass, selectedMonth);
            setEvaluations(evals || []);

            const vios = await bintangService.getViolationsForClass(selectedClass, selectedMonth);
            setViolations(vios || []);
        } catch (error) {
            console.error('Failed to fetch evaluation data', error);
        } finally {
            setIsLoading(false);
        }
    }, [selectedClass, selectedMonth]);

    useEffect(() => {
        if (selectedClass && selectedMonth) {
            fetchData();
        } else {
            setStudents([]);
            setEvaluations([]);
            setViolations([]);
        }
    }, [selectedClass, selectedMonth, fetchData]);

    const studentAspectMap = useMemo(() => {
        const map = new Map<string, AspectPointsSummary>();
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

    const getAspectSummary = (studentId: string): AspectPointsSummary => {
        return studentAspectMap.get(studentId) ?? {
            ADAB: { points: 0, count: 0, grade: 'A' as BintangGrade },
            KEDISIPLINAN: { points: 0, count: 0, grade: 'A' as BintangGrade },
            KERAPIAN: { points: 0, count: 0, grade: 'A' as BintangGrade },
        };
    };

    return (
        <div className="space-y-6">
            {students.length > 0 && (
                <div className="flex items-center justify-end gap-1.5 sm:gap-2 w-full sm:w-auto">
                        <Button
                            onClick={() => evalHook.handleGenerateAll(getAspectSummary)}
                            disabled={evalHook.isGenerating || students.length === 0}
                            variant="outline"
                            className="flex-1 sm:flex-none flex items-center justify-center gap-1 text-xs sm:text-sm h-10 px-2 sm:px-3.5 whitespace-nowrap font-medium"
                        >
                            <Zap size={14} />
                            <span>{evalHook.isGenerating ? 'Proses...' : 'Generate'}<span className="hidden sm:inline"> Semua</span></span>
                        </Button>
                        <Button
                            onClick={evalHook.handleExportExcel}
                            disabled={evalHook.isExportingExcel || students.length === 0}
                            variant="outline"
                            className="flex-1 sm:flex-none border-emerald-300 dark:border-emerald-700 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 flex items-center justify-center gap-1 text-xs sm:text-sm h-10 px-2 sm:px-3.5 whitespace-nowrap font-medium"
                        >
                            {evalHook.isExportingExcel ? (
                                <span className="animate-spin inline-block w-3.5 h-3.5 border-[2px] border-current border-t-transparent rounded-full" />
                            ) : (
                                <FileSpreadsheet size={14} />
                            )}
                            <span>{evalHook.isExportingExcel ? 'Proses...' : 'Export Excel'}</span>
                        </Button>
                        <Button
                            onClick={evalHook.handleDownloadClassPdf}
                            disabled={evalHook.isDownloadingClass || !selectedClass}
                            className="flex-1 sm:flex-none bg-emerald-600 hover:bg-emerald-700 text-white flex items-center justify-center gap-1 text-xs sm:text-sm h-10 px-2 sm:px-3.5 whitespace-nowrap font-medium"
                        >
                            {evalHook.isDownloadingClass ? (
                                <span className="animate-spin inline-block w-3.5 h-3.5 border-[2px] border-current border-t-transparent rounded-full" />
                            ) : (
                                <Printer size={14} />
                            )}
                            <span>{evalHook.isDownloadingClass ? 'Proses...' : 'Cetak'}<span className="hidden sm:inline"> Kelas</span></span>
                        </Button>
                        <Button
                            onClick={evalHook.handlePublish}
                            disabled={evaluations.length === 0 || evalHook.isPublishing}
                            className="flex-1 sm:flex-none flex items-center justify-center gap-1 bg-brand-600 hover:bg-brand-700 text-white text-xs sm:text-sm h-10 px-2 sm:px-3.5 whitespace-nowrap font-medium"
                        >
                            <Send size={14} />
                            <span>Publikasi</span>
                        </Button>
                    </div>
                )}

            {/* Progress bar */}
            {selectedClass && students.length > 0 && (
                <div>
                    <div className="flex items-center gap-4 text-sm">
                        <div className="flex-1 bg-slate-200 dark:bg-slate-700 rounded-full h-2 overflow-hidden">
                            <div
                                className="bg-brand-600 h-2 rounded-full transition-all duration-500"
                                style={{ width: `${(evalHook.evalStats.filled / evalHook.evalStats.total) * 100}%` }}
                            />
                        </div>
                        <span className="text-slate-600 dark:text-slate-400 whitespace-nowrap">
                            {evalHook.evalStats.filled}/{evalHook.evalStats.total} terisi
                            {evalHook.evalStats.published > 0 && (
                                <span className="text-emerald-600 dark:text-emerald-400 ml-2">
                                    ({evalHook.evalStats.published} published)
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
                        <div className="overflow-x-auto custom-scrollbar">
                            <table className="w-full text-left border-collapse min-w-[480px]">
                                <thead>
                                    <tr className="border-b border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/50">
                                        <th className="py-2.5 px-3 font-semibold text-xs sm:text-sm text-slate-600 dark:text-slate-300 whitespace-nowrap">Nama Siswa</th>
                                        <th className="py-2.5 px-2 font-semibold text-xs sm:text-sm text-slate-600 dark:text-slate-300 text-center whitespace-nowrap">Poin</th>
                                        <th className="py-2.5 px-2 font-semibold text-xs sm:text-sm text-slate-600 dark:text-slate-300 text-center whitespace-nowrap">Adab</th>
                                        <th className="py-2.5 px-2 font-semibold text-xs sm:text-sm text-slate-600 dark:text-slate-300 text-center whitespace-nowrap">Disiplin</th>
                                        <th className="py-2.5 px-2 font-semibold text-xs sm:text-sm text-slate-600 dark:text-slate-300 text-center whitespace-nowrap">Rapi</th>
                                        <th className="hidden md:table-cell py-2.5 px-3 font-semibold text-xs sm:text-sm text-slate-600 dark:text-slate-300 text-center whitespace-nowrap">Status</th>
                                        <th className="py-2.5 px-3 font-semibold text-xs sm:text-sm text-slate-600 dark:text-slate-300 text-right whitespace-nowrap">Aksi</th>
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
                                            const ev = evalHook.getEvaluationForStudent(student.id);
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
                                                                onClick={() => evalHook.handleOpenEditModal(student, getAspectSummary)}
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
                                                                onClick={() => evalHook.handleDownloadSinglePdf(student.id)}
                                                                disabled={evalHook.downloadingStudentId === student.id}
                                                                title="Cetak Rapor Bintang"
                                                            >
                                                                {evalHook.downloadingStudentId === student.id ? (
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
                isOpen={evalHook.isEditModalOpen}
                onClose={() => evalHook.setIsEditModalOpen(false)}
                title={`Rapor BINTANG: ${evalHook.editingStudent?.name}`}
                maxWidth="max-w-2xl"
            >
                <form onSubmit={(e) => evalHook.handleSaveEvaluation(e, getAspectSummary)} className="space-y-4 pt-4">
                    <div className="flex items-start gap-3 p-3 rounded-lg bg-brand-50 dark:bg-brand-900/20 border border-brand-200 dark:border-brand-800">
                        <Info size={18} className="text-brand-500 mt-0.5 shrink-0" />
                        <p className="text-xs text-brand-700 dark:text-brand-300">
                            Nilai otomatis dihitung dari poin pelanggaran siswa bulan ini. Anda dapat mengubah nilai secara manual jika diperlukan.
                        </p>
                    </div>

                    <AspectSectionEditor
                        aspectKey="ADAB" scoreField="adab_score"
                        formValue={evalHook.formData.adab_score} notesValue={evalHook.formData.adab_notes}
                        onScoreChange={(val) => evalHook.setFormData(prev => ({ ...prev, adab_score: val }))}
                        onNotesChange={(val) => evalHook.setFormData(prev => ({ ...prev, adab_notes: val }))}
                        editingStudent={evalHook.editingStudent} getAspectSummary={getAspectSummary}
                    />
                    <AspectSectionEditor
                        aspectKey="KEDISIPLINAN" scoreField="kedisiplinan_score"
                        formValue={evalHook.formData.kedisiplinan_score} notesValue={evalHook.formData.kedisiplinan_notes}
                        onScoreChange={(val) => evalHook.setFormData(prev => ({ ...prev, kedisiplinan_score: val }))}
                        onNotesChange={(val) => evalHook.setFormData(prev => ({ ...prev, kedisiplinan_notes: val }))}
                        editingStudent={evalHook.editingStudent} getAspectSummary={getAspectSummary}
                    />
                    <AspectSectionEditor
                        aspectKey="KERAPIAN" scoreField="kerapian_score"
                        formValue={evalHook.formData.kerapian_score} notesValue={evalHook.formData.kerapian_notes}
                        onScoreChange={(val) => evalHook.setFormData(prev => ({ ...prev, kerapian_score: val }))}
                        onNotesChange={(val) => evalHook.setFormData(prev => ({ ...prev, kerapian_notes: val }))}
                        editingStudent={evalHook.editingStudent} getAspectSummary={getAspectSummary}
                    />

                    <div className="p-4 border border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50/50 dark:bg-slate-800/30">
                        <div className="flex items-center gap-2 mb-3">
                            <FileText size={18} className="text-emerald-600 dark:text-emerald-400" />
                            <span className="font-bold text-sm text-slate-800 dark:text-slate-200">Catatan Wali Kelas</span>
                        </div>
                        <div className="w-full">
                            <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Tuliskan pesan atau catatan perkembangan umum siswa untuk Orang Tua / Wali</label>
                            <textarea
                                className="w-full bg-white dark:bg-slate-900/50 border border-slate-300 dark:border-slate-700 rounded-lg p-2.5 text-slate-800 dark:text-slate-200 text-sm focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500"
                                rows={3}
                                value={evalHook.formData.catatan_wali}
                                onChange={(e) => evalHook.setFormData(prev => ({ ...prev, catatan_wali: e.target.value }))}
                                placeholder="Tuliskan catatan umum wali kelas di sini..."
                            />
                        </div>
                    </div>

                    <div className="flex justify-end gap-3 pt-4 border-t border-slate-200 dark:border-slate-700">
                        <Button type="button" variant="outline" onClick={() => evalHook.setIsEditModalOpen(false)}>Batal</Button>
                        <Button type="submit" disabled={evalHook.isSubmitting}>
                            {evalHook.isSubmitting ? 'Menyimpan...' : 'Simpan Rapor'}
                        </Button>
                    </div>
                </form>
            </Modal>

            {PublishConfirmDialog}
        </div>
    );
};

export default BintangEvaluationPage;
