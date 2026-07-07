import React from 'react';
import { GlassCard } from './PortalComponents';
import { SparklesIcon } from '../../Icons';

interface PortalBintangTabProps {
    evaluations: any[];
}

export const PortalBintangTab: React.FC<PortalBintangTabProps> = ({ evaluations }) => {
    return (
        <div className="space-y-6">
            <div className="mb-6">
                <h3 className="text-xl font-bold text-slate-800 dark:text-white flex items-center gap-2">
                    <SparklesIcon className="text-amber-500" />
                    Rapor BINTANG
                </h3>
                <p className="text-slate-500 dark:text-slate-400 mt-1">
                    Laporan Adab, Kedisiplinan, dan Kerapian siswa.
                </p>
            </div>
            
            {(!evaluations || evaluations.length === 0) ? (
                <GlassCard className="p-8 text-center border-dashed border-2 border-slate-200 dark:border-slate-700 bg-transparent">
                    <SparklesIcon className="mx-auto h-12 w-12 text-slate-300 dark:text-slate-600 mb-4" />
                    <h4 className="text-lg font-medium text-slate-700 dark:text-slate-300 mb-2">Belum Ada Rapor</h4>
                    <p className="text-slate-500 dark:text-slate-400 max-w-md mx-auto">
                        Rapor BINTANG untuk semester ini belum dipublikasikan oleh Wali Kelas.
                    </p>
                </GlassCard>
            ) : (
                <div className="space-y-6">
                    {evaluations.map((evalItem: any) => (
                        <GlassCard key={evalItem.id} className="p-6">
                            <div className="flex justify-between items-center mb-4 border-b border-slate-200 dark:border-slate-700 pb-4">
                                <h4 className="text-lg font-bold text-slate-800 dark:text-white">
                                    Bulan: {new Date(evalItem.month + '-01').toLocaleDateString('id-ID', { month: 'long', year: 'numeric' })}
                                </h4>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                <div className="space-y-2">
                                    <div className="flex justify-between items-center">
                                        <span className="font-semibold text-slate-700 dark:text-slate-300">Adab</span>
                                        <span className="px-3 py-1 rounded-full text-sm font-bold bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300">
                                            Nilai: {evalItem.adab_score}
                                        </span>
                                    </div>
                                    <p className="text-sm text-slate-600 dark:text-slate-400 italic bg-slate-50 dark:bg-slate-800/50 p-3 rounded-lg border border-slate-100 dark:border-slate-700 min-h-[60px]">
                                        "{evalItem.adab_notes || '-'}"
                                    </p>
                                </div>
                                <div className="space-y-2">
                                    <div className="flex justify-between items-center">
                                        <span className="font-semibold text-slate-700 dark:text-slate-300">Kedisiplinan</span>
                                        <span className="px-3 py-1 rounded-full text-sm font-bold bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300">
                                            Nilai: {evalItem.kedisiplinan_score}
                                        </span>
                                    </div>
                                    <p className="text-sm text-slate-600 dark:text-slate-400 italic bg-slate-50 dark:bg-slate-800/50 p-3 rounded-lg border border-slate-100 dark:border-slate-700 min-h-[60px]">
                                        "{evalItem.kedisiplinan_notes || '-'}"
                                    </p>
                                </div>
                                <div className="space-y-2">
                                    <div className="flex justify-between items-center">
                                        <span className="font-semibold text-slate-700 dark:text-slate-300">Kerapian</span>
                                        <span className="px-3 py-1 rounded-full text-sm font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300">
                                            Nilai: {evalItem.kerapian_score}
                                        </span>
                                    </div>
                                    <p className="text-sm text-slate-600 dark:text-slate-400 italic bg-slate-50 dark:bg-slate-800/50 p-3 rounded-lg border border-slate-100 dark:border-slate-700 min-h-[60px]">
                                        "{evalItem.kerapian_notes || '-'}"
                                    </p>
                                </div>
                            </div>
                            
                            {(evalItem.catatan_wali || evalItem.adab_notes) && (
                                <div className="mt-6 pt-4 border-t border-slate-200 dark:border-slate-700 space-y-2">
                                    <span className="font-bold text-sm text-slate-800 dark:text-slate-200 block">Catatan Wali Kelas</span>
                                    <p className="text-sm text-slate-600 dark:text-slate-400 bg-indigo-50/20 dark:bg-indigo-950/10 p-4 rounded-xl border border-indigo-500/10 min-h-[60px] leading-relaxed">
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
