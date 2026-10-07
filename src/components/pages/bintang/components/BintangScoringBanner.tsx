import React, { useState } from 'react';
import { Info, ChevronDown, AlertTriangle, Sparkles, FileText } from 'lucide-react';

export const BintangScoringBanner: React.FC = () => {
    const [showInfoBanner, setShowInfoBanner] = useState(false);

    return (
        <div className="rounded-2xl border border-slate-200/80 dark:border-slate-700/60 bg-white dark:bg-slate-900 overflow-hidden shadow-xs">
            <button
                type="button"
                onClick={() => setShowInfoBanner(v => !v)}
                className="w-full flex items-center justify-between px-4 py-3 sm:px-5 sm:py-3.5 hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors text-left cursor-pointer"
            >
                <div className="flex items-center gap-3 min-w-0">
                    <div className="w-9 h-9 rounded-xl bg-brand-600 flex items-center justify-center shrink-0 shadow-sm shadow-brand-600/20">
                        <Info size={18} className="text-white" />
                    </div>
                    <div className="min-w-0">
                        <p className="font-bold text-sm text-slate-800 dark:text-white leading-tight">Cara Kerja Skor BINTANG</p>
                        <p className="text-xs text-slate-500 dark:text-slate-400 truncate mt-0.5">
                            Panduan perhitungan poin pelanggaran, offset keaktifan, dan rapor bulanan
                        </p>
                    </div>
                </div>
                <div className="flex items-center gap-1.5 shrink-0 ml-3 px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-xs font-medium text-slate-600 dark:text-slate-300">
                    <span className="hidden sm:inline">{showInfoBanner ? 'Tutup' : 'Panduan'}</span>
                    <ChevronDown size={15} className={`text-slate-500 transition-transform duration-200 ${showInfoBanner ? 'rotate-180' : ''}`} />
                </div>
            </button>
            {showInfoBanner && (
                <div className="px-4 pb-4 pt-2 sm:px-5 sm:pb-5 border-t border-slate-100 dark:border-slate-800 bg-slate-50/40 dark:bg-slate-900/40">
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs text-slate-600 dark:text-slate-400">
                        <div className="flex items-start gap-3 p-3.5 rounded-2xl bg-white dark:bg-slate-800/90 border border-slate-200/80 dark:border-slate-700/60 shadow-2xs">
                            <div className="w-10 h-10 rounded-xl bg-rose-500 flex items-center justify-center shrink-0 shadow-sm shadow-rose-500/20">
                                <AlertTriangle size={18} className="text-white" />
                            </div>
                            <div className="min-w-0">
                                <p className="font-bold text-slate-800 dark:text-white text-xs sm:text-sm">1. Pelanggaran</p>
                                <p className="mt-1 leading-relaxed">Setiap pelanggaran menambah poin per aspek (Adab, Disiplin, Rapi). Makin tinggi poin, makin turun grade.</p>
                            </div>
                        </div>
                        <div className="flex items-start gap-3 p-3.5 rounded-2xl bg-white dark:bg-slate-800/90 border border-slate-200/80 dark:border-slate-700/60 shadow-2xs">
                            <div className="w-10 h-10 rounded-xl bg-emerald-500 flex items-center justify-center shrink-0 shadow-sm shadow-emerald-500/20">
                                <Sparkles size={18} className="text-white" />
                            </div>
                            <div className="min-w-0">
                                <p className="font-bold text-slate-800 dark:text-white text-xs sm:text-sm">2. Poin Keaktifan</p>
                                <p className="mt-1 leading-relaxed">Setiap +1 poin keaktifan <strong>meng-offset</strong> poin pelanggaran secara berurutan (Adab &rarr; Disiplin &rarr; Rapi).</p>
                            </div>
                        </div>
                        <div className="flex items-start gap-3 p-3.5 rounded-2xl bg-white dark:bg-slate-800/90 border border-slate-200/80 dark:border-slate-700/60 shadow-2xs">
                            <div className="w-10 h-10 rounded-xl bg-amber-500 flex items-center justify-center shrink-0 shadow-sm shadow-amber-500/20">
                                <FileText size={18} className="text-white" />
                            </div>
                            <div className="min-w-0">
                                <p className="font-bold text-slate-800 dark:text-white text-xs sm:text-sm">3. Evaluasi Bulanan</p>
                                <p className="mt-1 leading-relaxed">Wali kelas meninjau dan mengonfirmasi grade otomatis, menambah catatan pembinaan, lalu mempublikasikan rapor.</p>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
