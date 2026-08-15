import React, { useState, useEffect } from 'react';
import { CardTitle, CardDescription } from '../../ui/Card';
import { Button } from '../../ui/Button';
import { PrinterIcon, ShieldAlertIcon } from '../../Icons';
import { bintangService, calculateAspectPoints, type BintangGrade } from '../../../services/bintangService';
import { ViolationRow } from './types';
import { useToast } from '../../../hooks/useToast';
import { useAuth } from '../../../hooks/useAuth';
import { supabase } from '../../../services/supabase';
import { downloadBintangReportAction } from '../../../services/bintangPdfGenerator';

const GRADE_COLORS: Record<BintangGrade, string> = {
    A: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300',
    B: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
    C: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300',
    D: 'bg-rose-100 text-rose-800 dark:bg-rose-900/30 dark:text-rose-300',
};

interface BintangTabProps {
    studentId: string;
    studentName: string;
    violations: ViolationRow[];
}

/** Bulan berjalan dalam WIB (UTC+7) — hindari off-by-one di 00:00–07:00 WIB. */
function getCurrentMonthWib(): string {
    const now = new Date(Date.now() + 7 * 60 * 60 * 1000);
    return `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, '0')}`;
}

export const BintangTab: React.FC<BintangTabProps> = ({ studentId, studentName: _studentName, violations }) => {
    const toast = useToast();
    const { user } = useAuth();
    const [selectedMonth, setSelectedMonth] = useState<string>(getCurrentMonthWib());
    const [evaluations, setEvaluations] = useState<any[]>([]);
    const [quizPoints, setQuizPoints] = useState<number>(0);
    const [isLoading, setIsLoading] = useState(true);
    const [isDownloadingPdf, setIsDownloadingPdf] = useState(false);

    useEffect(() => {
        const fetchEvals = async () => {
            setIsLoading(true);
            try {
                const evals = await bintangService.getStudentEvaluations(studentId, false);
                setEvaluations(evals);
            } catch (error) {
                console.error("Failed to load BINTANG evaluations:", error);
                toast.error("Gagal memuat evaluasi BINTANG");
            } finally {
                setIsLoading(false);
            }
        };
        fetchEvals();
    }, [studentId, toast]);

    // Fetch quiz points (poin keaktifan) for the selected month so the
    // auto-grade matches the dashboard & PDF (keaktifan offset applied).
    useEffect(() => {
        let active = true;
        (async () => {
            try {
                const lastDay = new Date(parseInt(selectedMonth.split('-')[0]), parseInt(selectedMonth.split('-')[1]), 0).getDate();
                const { data, error } = await supabase
                    .from('quiz_points')
                    .select('points')
                    .eq('student_id', studentId)
                    .is('deleted_at', null)
                    .gte('quiz_date', `${selectedMonth}-01`)
                    .lte('quiz_date', `${selectedMonth}-${lastDay}`);
                if (active && !error) {
                    const total = (data || []).reduce((sum: number, q: any) => sum + (q.points || 0), 0);
                    setQuizPoints(total);
                }
            } catch {
                if (active) setQuizPoints(0);
            }
        })();
        return () => { active = false; };
    }, [studentId, selectedMonth]);

    // Filter violations for the selected month
    const monthlyViolations = violations.filter(v => v.date?.startsWith(selectedMonth));
    const aspects = calculateAspectPoints(monthlyViolations, quizPoints);
    
    // Check if there is an evaluation for the selected month
    const currentEval = evaluations.find(e => e.month === selectedMonth);

    // Use saved evaluation scores if available, otherwise use calculated aspects
    const adabScore = currentEval?.adab_score || aspects.ADAB.grade;
    const kedisiplinanScore = currentEval?.kedisiplinan_score || aspects.KEDISIPLINAN.grade;
    const kerapianScore = currentEval?.kerapian_score || aspects.KERAPIAN.grade;

    // Build last 6 months options
    const monthOptions = [];
    for (let i = 0; i < 6; i++) {
        const nowWib = new Date(Date.now() + 7 * 60 * 60 * 1000);
        const d = new Date(nowWib.getUTCFullYear(), nowWib.getUTCMonth() - i, 1);
        const val = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
        const label = d.toLocaleDateString('id-ID', { month: 'long', year: 'numeric' });
        monthOptions.push({ value: val, label });
    }

    const handleDownloadPdf = async () => {
        setIsDownloadingPdf(true);
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
            setIsDownloadingPdf(false);
        }
    };

    return (
        <div className="p-4 sm:p-6 space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-4 border-b border-slate-100 dark:border-slate-800/60">
                <div>
                    <CardTitle className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2.5">
                        <ShieldAlertIcon className="w-5 h-5 text-emerald-500 shrink-0" />
                        Rapor BINTANG
                    </CardTitle>
                    <CardDescription className="mt-1 text-slate-500 dark:text-slate-400 text-sm">
                        Bina Tertib dan Tanggung Jawab - dihitung otomatis dari poin pelanggaran
                    </CardDescription>
                </div>
                
                <div className="flex items-center gap-2.5 self-start sm:self-auto shrink-0 w-full sm:w-auto">
                    <select
                        value={selectedMonth}
                        onChange={(e) => setSelectedMonth(e.target.value)}
                        className="h-10 px-3.5 text-sm font-medium rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/90 text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 cursor-pointer shadow-sm flex-1 sm:flex-none"
                    >
                        {monthOptions.map(m => (
                            <option key={m.value} value={m.value}>{m.label}</option>
                        ))}
                    </select>
                    
                    <Button 
                        onClick={handleDownloadPdf}
                        disabled={isDownloadingPdf}
                        className="h-10 px-4 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-medium rounded-xl shadow-sm transition-all flex items-center gap-2 text-sm justify-center flex-1 sm:flex-none"
                    >
                        {isDownloadingPdf ? (
                            <span className="flex items-center gap-2">
                                <span className="animate-spin inline-block w-4 h-4 border-[2px] border-current border-t-transparent rounded-full shrink-0" />
                                Proses...
                            </span>
                        ) : (
                            <>
                                <PrinterIcon className="w-4 h-4 shrink-0" /> Cetak Rapor
                            </>
                        )}
                    </Button>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
                <AspectCard title="Adab" score={adabScore} points={aspects.ADAB.points} notes={currentEval?.adab_notes} />
                <AspectCard title="Kedisiplinan" score={kedisiplinanScore} points={aspects.KEDISIPLINAN.points} notes={currentEval?.kedisiplinan_notes} />
                <AspectCard title="Kerapian" score={kerapianScore} points={aspects.KERAPIAN.points} notes={currentEval?.kerapian_notes} />
            </div>

            {(currentEval?.catatan_wali || currentEval?.adab_notes) && (
                <div className="mt-6 bg-white dark:bg-slate-800 p-5 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm space-y-2">
                    <span className="font-bold text-sm text-slate-800 dark:text-slate-200 block">Catatan Wali Kelas</span>
                    <p className="text-sm text-slate-600 dark:text-slate-400 bg-brand-50/20 dark:bg-brand-950/10 p-4 rounded-xl border border-brand-500/10 min-h-[60px] leading-relaxed">
                        {currentEval?.catatan_wali || currentEval?.adab_notes}
                    </p>
                </div>
            )}

            <div className="mt-6 bg-slate-50 dark:bg-slate-800/50 p-4 rounded-xl border border-slate-200 dark:border-slate-700">
                <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200 mb-3">Status Evaluasi Bulan Ini:</h4>
                {isLoading ? (
                    <div className="animate-pulse flex gap-2"><div className="w-24 h-6 bg-slate-200 rounded"></div></div>
                ) : currentEval ? (
                    currentEval.is_published ? (
                        <div className="text-sm flex items-center gap-2 text-emerald-600 dark:text-emerald-400">
                            <span className="w-3 h-3 rounded-full bg-emerald-500"></span>
                            Rapor BINTANG sudah diverifikasi dan dipublikasi oleh Wali Kelas.
                        </div>
                    ) : (
                        <div className="text-sm flex items-center gap-2 text-amber-600 dark:text-amber-400">
                            <span className="w-3 h-3 rounded-full bg-amber-500"></span>
                            Draft - Menunggu publikasi Wali Kelas.
                        </div>
                    )
                ) : (
                    <div className="text-sm flex items-center gap-2 text-slate-500 dark:text-slate-400">
                        <span className="w-3 h-3 rounded-full bg-slate-300"></span>
                        Otomatis - Nilai diambil langsung dari rekapitulasi poin pelanggaran bulan ini.
                    </div>
                )}
            </div>
        </div>
    );
};

const AspectCard = ({ title, score, points, notes }: { title: string, score: BintangGrade, points: number, notes?: string }) => {
    return (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl overflow-hidden flex flex-col shadow-sm">
            <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50/50 dark:bg-slate-800/20">
                <h3 className="font-bold text-slate-700 dark:text-slate-300">{title}</h3>
                <span className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${GRADE_COLORS[score]}`}>
                    {score}
                </span>
            </div>
            <div className="p-5 flex-1 flex flex-col">
                <div className="mb-4">
                    <p className="text-xs text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1 font-semibold">Total Poin Pelanggaran</p>
                    <p className="text-2xl font-black text-slate-800 dark:text-slate-100">{points}</p>
                </div>
                <div>
                    <p className="text-xs text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1 font-semibold">Catatan</p>
                    <p className="text-sm text-slate-600 dark:text-slate-300 italic min-h-[40px]">
                        {notes || '-'}
                    </p>
                </div>
            </div>
        </div>
    );
};
