import React, { useState } from 'react';
import { Info, ChevronDown, AlertTriangle, Sparkles, FileText } from 'lucide-react';

export const BintangScoringBanner: React.FC = () => {
    const [showInfoBanner, setShowInfoBanner] = useState(false);

    return (
        <div className="rounded-2xl border border-brand-200/60 dark:border-brand-800/40 overflow-hidden">
            <button
                type="button"
                onClick={() => setShowInfoBanner(v => !v)}
                className="w-full flex items-center justify-between px-4 py-3 bg-gradient-to-r from-brand-100 to-brand-200 dark:from-brand-950/30 dark:to-brand-950/30 hover:opacity-90 transition-opacity text-left"
            >
                <div className="flex items-center gap-2 text-brand-700 dark:text-brand-300">
                    <Info size={15} />
                    <span className="font-semibold text-sm">Cara kerja Skor BINTANG</span>
                </div>
                <ChevronDown size={16} className={`text-brand-500 transition-transform duration-200 ${showInfoBanner ? 'rotate-180' : ''}`} />
            </button>
            {showInfoBanner && (
                <div className="p-4 bg-gradient-to-r from-brand-50 to-brand-100 dark:from-brand-950/20 dark:to-brand-950/20">
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs text-slate-600 dark:text-slate-400">
                        <div className="flex items-start gap-2 p-2.5 rounded-xl bg-white/60 dark:bg-slate-900/40">
                            <div className="w-7 h-7 rounded-lg bg-rose-100 dark:bg-rose-900/30 flex items-center justify-center shrink-0">
                                <AlertTriangle size={14} className="text-rose-500" />
                            </div>
                            <div>
                                <p className="font-medium text-slate-700 dark:text-slate-300">1. Pelanggaran</p>
                                <p className="mt-0.5">Setiap pelanggaran menambah poin per aspek (ADAB/DISIPLIN/RAPI). Makin tinggi poin, makin turun grade.</p>
                            </div>
                        </div>
                        <div className="flex items-start gap-2 p-2.5 rounded-xl bg-white/60 dark:bg-slate-900/40">
                            <div className="w-7 h-7 rounded-lg bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center shrink-0">
                                <Sparkles size={14} className="text-emerald-500" />
                            </div>
                            <div>
                                <p className="font-medium text-slate-700 dark:text-slate-300">2. Poin Keaktifan</p>
                                <p className="mt-0.5">Setiap +1 poin keaktifan <strong>meng-offset</strong> poin pelanggaran (Adab → Disiplin → Rapi).</p>
                            </div>
                        </div>
                        <div className="flex items-start gap-2 p-2.5 rounded-xl bg-white/60 dark:bg-slate-900/40">
                            <div className="w-7 h-7 rounded-lg bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center shrink-0">
                                <FileText size={14} className="text-amber-500" />
                            </div>
                            <div>
                                <p className="font-medium text-slate-700 dark:text-slate-300">3. Evaluasi Bulanan</p>
                                <p className="mt-0.5">Wali kelas review &amp; konfirmasi grade otomatis, tambah catatan, lalu publikasikan.</p>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
