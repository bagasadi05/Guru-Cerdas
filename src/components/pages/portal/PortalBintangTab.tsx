import React from 'react';
import { GlassCard } from './PortalComponents';
import { SparklesIcon } from '../../Icons';
import { Shield, AlertTriangle, Sparkles, Calendar, FileText } from 'lucide-react';

export interface PortalBintangEvaluation {
    id: string;
    month: string;
    is_published: boolean;
    adab_score?: string | null;
    adab_notes?: string | null;
    kedisiplinan_score?: string | null;
    kedisiplinan_notes?: string | null;
    kerapian_score?: string | null;
    kerapian_notes?: string | null;
    catatan_wali?: string | null;
}

interface PortalBintangTabProps {
    evaluations: PortalBintangEvaluation[];
}

export const PortalBintangTab: React.FC<PortalBintangTabProps> = ({ evaluations }) => {
    // Defensively filter only published evaluations so draft notes are never visible to parents
    const publishedEvaluations = React.useMemo(() => {
        return (evaluations || []).filter(item => Boolean(item?.is_published));
    }, [evaluations]);

    return (
        <div className="space-y-6">
            <div className="flex items-center gap-3.5 mb-6">
                <div className="w-11 h-11 rounded-2xl bg-amber-500 text-white shadow-sm shadow-amber-500/20 flex items-center justify-center shrink-0">
                    <SparklesIcon className="text-white w-5 h-5" />
                </div>
                <div>
                    <h3 className="text-xl font-extrabold text-slate-900 dark:text-white tracking-tight">
                        Rapor BINTANG
                    </h3>
                    <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5">
                        Laporan Adab, Kedisiplinan, dan Kerapian siswa.
                    </p>
                </div>
            </div>
            
            {publishedEvaluations.length === 0 ? (
                <GlassCard className="p-8 text-center border-dashed border-2 border-slate-200 dark:border-slate-700 bg-transparent">
                    <div className="w-14 h-14 rounded-2xl bg-amber-500/10 text-amber-600 dark:text-amber-400 mx-auto mb-3.5 flex items-center justify-center border border-amber-500/20">
                        <SparklesIcon className="h-7 w-7" />
                    </div>
                    <h4 className="text-lg font-bold text-slate-800 dark:text-slate-200 mb-1.5">Belum Ada Rapor</h4>
                    <p className="text-sm text-slate-500 dark:text-slate-400 max-w-md mx-auto">
                        Rapor BINTANG untuk semester ini belum dipublikasikan oleh Wali Kelas.
                    </p>
                </GlassCard>
            ) : (
                <div className="space-y-6">
                    {publishedEvaluations.map((evalItem) => (
                        <GlassCard key={evalItem.id} className="p-5 sm:p-6">
                            <div className="flex items-center gap-3 mb-5 border-b border-slate-200/80 dark:border-slate-700/80 pb-4">
                                <div className="w-10 h-10 rounded-xl bg-brand-600 text-white flex items-center justify-center shrink-0 shadow-sm shadow-brand-600/20">
                                    <Calendar size={18} />
                                </div>
                                <h4 className="text-base sm:text-lg font-extrabold text-slate-900 dark:text-white">
                                    Bulan: {new Date(evalItem.month + '-01').toLocaleDateString('id-ID', { month: 'long', year: 'numeric' })}
                                </h4>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div className="bg-slate-50/80 dark:bg-slate-900/60 rounded-2xl border border-slate-200/80 dark:border-slate-700/60 p-4 space-y-3">
                                    <div className="flex justify-between items-center gap-2">
                                        <div className="flex items-center gap-2.5">
                                            <div className="w-9 h-9 rounded-xl bg-indigo-600 text-white flex items-center justify-center shrink-0 shadow-sm">
                                                <Shield size={16} />
                                            </div>
                                            <span className="font-bold text-slate-800 dark:text-slate-200">Adab</span>
                                        </div>
                                        <span className="px-3 py-1 rounded-xl text-xs font-extrabold bg-indigo-100 text-indigo-800 dark:bg-indigo-900/40 dark:text-indigo-300">
                                            Nilai: {evalItem.adab_score}
                                        </span>
                                    </div>
                                    <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 italic bg-white dark:bg-slate-800/80 p-3 rounded-xl border border-slate-200/60 dark:border-slate-700/60 min-h-[60px] leading-relaxed">
                                        "{evalItem.adab_notes || '-'}"
                                    </p>
                                </div>

                                <div className="bg-slate-50/80 dark:bg-slate-900/60 rounded-2xl border border-slate-200/80 dark:border-slate-700/60 p-4 space-y-3">
                                    <div className="flex justify-between items-center gap-2">
                                        <div className="flex items-center gap-2.5">
                                            <div className="w-9 h-9 rounded-xl bg-amber-500 text-white flex items-center justify-center shrink-0 shadow-sm">
                                                <AlertTriangle size={16} />
                                            </div>
                                            <span className="font-bold text-slate-800 dark:text-slate-200">Kedisiplinan</span>
                                        </div>
                                        <span className="px-3 py-1 rounded-xl text-xs font-extrabold bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300">
                                            Nilai: {evalItem.kedisiplinan_score}
                                        </span>
                                    </div>
                                    <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 italic bg-white dark:bg-slate-800/80 p-3 rounded-xl border border-slate-200/60 dark:border-slate-700/60 min-h-[60px] leading-relaxed">
                                        "{evalItem.kedisiplinan_notes || '-'}"
                                    </p>
                                </div>

                                <div className="bg-slate-50/80 dark:bg-slate-900/60 rounded-2xl border border-slate-200/80 dark:border-slate-700/60 p-4 space-y-3">
                                    <div className="flex justify-between items-center gap-2">
                                        <div className="flex items-center gap-2.5">
                                            <div className="w-9 h-9 rounded-xl bg-teal-600 text-white flex items-center justify-center shrink-0 shadow-sm">
                                                <Sparkles size={16} />
                                            </div>
                                            <span className="font-bold text-slate-800 dark:text-slate-200">Kerapian</span>
                                        </div>
                                        <span className="px-3 py-1 rounded-xl text-xs font-extrabold bg-teal-100 text-teal-800 dark:bg-teal-900/40 dark:text-teal-300">
                                            Nilai: {evalItem.kerapian_score}
                                        </span>
                                    </div>
                                    <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 italic bg-white dark:bg-slate-800/80 p-3 rounded-xl border border-slate-200/60 dark:border-slate-700/60 min-h-[60px] leading-relaxed">
                                        "{evalItem.kerapian_notes || '-'}"
                                    </p>
                                </div>
                            </div>
                            
                            {(evalItem.catatan_wali || evalItem.adab_notes) && (
                                <div className="mt-5 pt-4 border-t border-slate-200/80 dark:border-slate-700/80 space-y-2.5">
                                    <div className="flex items-center gap-2">
                                        <div className="w-7 h-7 rounded-lg bg-emerald-500 text-white flex items-center justify-center shrink-0">
                                            <FileText size={14} />
                                        </div>
                                        <span className="font-bold text-sm text-slate-800 dark:text-slate-200 block">Catatan Wali Kelas</span>
                                    </div>
                                    <p className="text-sm text-slate-600 dark:text-slate-300 bg-slate-50/80 dark:bg-slate-900/60 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-700/60 min-h-[60px] leading-relaxed">
                                        {evalItem.catatan_wali || evalItem.adab_notes}
                                    </p>
                                </div>
                            )}
                        </GlassCard>
                    ))}
                </div>
            )}
        </div>
    );
};
