import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Star, ClipboardCheck, BarChart3 } from 'lucide-react';
import BintangMentoringPage from './BintangMentoringPage';
import BintangDailyObservationPage from './BintangDailyObservationPage';
import BintangEvaluationPage from './BintangEvaluationPage';

type TabId = 'mentoring' | 'violation-recap' | 'evaluation';

const BintangDashboardPage: React.FC = () => {
    const [activeTab, setActiveTab] = useState<TabId>('mentoring');

    const tabs: Array<{ id: TabId; label: string; icon: React.ComponentType<any> }> = [
        { id: 'mentoring', label: 'Jurnal Pembinaan', icon: Star },
        { id: 'violation-recap', label: 'Observasi & Rekap Poin', icon: BarChart3 },
        { id: 'evaluation', label: 'Evaluasi & Cetak Rapor', icon: ClipboardCheck },
    ];

    return (
        <div className="p-4 sm:p-6 lg:p-8 space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800 dark:text-white flex items-center gap-2">
                        <Star className="text-amber-500" />
                        Program BINTANG
                    </h1>
                    <p className="text-slate-500 dark:text-slate-400 mt-1">
                        Bina Tertib dan Tanggung Jawab — Nilai otomatis dari poin pelanggaran
                    </p>
                </div>
            </div>

            <div className="flex space-x-1 p-1 bg-slate-100 dark:bg-slate-800/50 rounded-xl w-full max-w-3xl overflow-x-auto scrollbar-hide snap-x">
                {tabs.map(tab => (
                    <button type="button"
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        className={`snap-start flex-shrink-0 sm:flex-1 flex items-center justify-center gap-2 px-4 py-3 text-sm font-medium rounded-lg whitespace-nowrap transition-all duration-200 min-h-[44px] ${
                            activeTab === tab.id
                                ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm ring-1 ring-slate-900/5 dark:ring-white/10'
                                : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-white/50 dark:hover:bg-slate-700/50'
                        }`}
                    >
                        <tab.icon size={18} />
                        {tab.label}
                    </button>
                ))}
            </div>

            <div className="mt-6">
                <AnimatePresence mode="wait">
                    {activeTab === 'mentoring' && (
                        <motion.div
                            key="mentoring"
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            transition={{ duration: 0.2 }}
                        >
                            <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden relative">
                                <BintangMentoringPage />
                            </div>
                        </motion.div>
                    )}
                    {activeTab === 'violation-recap' && (
                        <motion.div
                            key="violation-recap"
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            transition={{ duration: 0.2 }}
                        >
                            <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden relative">
                                <BintangDailyObservationPage />
                            </div>
                        </motion.div>
                    )}
                    {activeTab === 'evaluation' && (
                        <motion.div
                            key="evaluation"
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            transition={{ duration: 0.2 }}
                        >
                            <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden relative">
                                <BintangEvaluationPage />
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </div>
    );
};

export default BintangDashboardPage;
