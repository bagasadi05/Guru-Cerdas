import React, { useState } from 'react';
import { TrendingUp, ChevronDown } from 'lucide-react';
import { MotionDiv, AnimatePresence } from '../../../ui/MotionComponents';
import BintangTrendChart from '../BintangTrendChart';

interface BintangTrendSectionProps {
    selectedClass: string;
}

export const BintangTrendSection: React.FC<BintangTrendSectionProps> = ({ selectedClass }) => {
    const [showTrendChart, setShowTrendChart] = useState(false);

    return (
        <div className="rounded-2xl border border-slate-200/80 dark:border-slate-700/60 bg-white dark:bg-slate-900 overflow-hidden shadow-xs">
            <button
                type="button"
                onClick={() => setShowTrendChart(!showTrendChart)}
                className="w-full flex items-center justify-between px-4 py-3.5 sm:px-5 sm:py-4 text-left hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-all cursor-pointer active:scale-[0.99] duration-150"
            >
                <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-brand-600 flex items-center justify-center shrink-0 shadow-sm shadow-brand-600/20">
                        <TrendingUp size={18} className="text-white" />
                    </div>
                    <div>
                        <p className="font-bold text-sm text-slate-800 dark:text-white leading-tight">
                            Tren Bulanan
                        </p>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                            Grafik perkembangan poin per aspek karakter
                        </p>
                    </div>
                </div>
                <div className="flex items-center gap-1.5 shrink-0 ml-3 px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-xs font-medium text-slate-600 dark:text-slate-300">
                    <span className="hidden sm:inline">{showTrendChart ? 'Tutup' : 'Grafik'}</span>
                    <ChevronDown
                        size={15}
                        className={`text-slate-500 transition-transform duration-300 ${
                            showTrendChart ? 'rotate-180' : ''
                        }`}
                    />
                </div>
            </button>

            <AnimatePresence>
                {showTrendChart && (
                    <MotionDiv
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.25 }}
                        className="overflow-hidden"
                    >
                        <div className="border-t border-slate-200 dark:border-slate-700 p-4 sm:p-6">
                            <BintangTrendChart selectedClass={selectedClass} />
                        </div>
                    </MotionDiv>
                )}
            </AnimatePresence>
        </div>
    );
};
