import React from 'react';
import { BarChartIcon, BookOpenIcon, ClockIcon, SendIcon, SparklesIcon } from '../../Icons';
import { TabsList, TabsTrigger } from '../../ui/Tabs';
import type { PortalPrimaryTab } from './types';

interface PortalNavigationProps {
    activeTab: PortalPrimaryTab;
    unreadMessagesCount: number;
    attentionCount: number;
}

const tabs: Array<{ value: PortalPrimaryTab; label: string; description: string; icon: React.ElementType }> = [
    { value: 'beranda', label: 'Beranda', description: 'Ringkasan utama siswa', icon: SparklesIcon },
    { value: 'perkembangan', label: 'Perkembangan', description: 'Nilai dan capaian belajar', icon: BarChartIcon },
    { value: 'kehadiran', label: 'Kehadiran', description: 'Rekap presensi semester', icon: ClockIcon },
    { value: 'komunikasi', label: 'Komunikasi', description: 'Pesan dengan guru', icon: SendIcon },
    { value: 'lainnya', label: 'Layanan Lain', description: 'Tugas, jadwal, dokumen', icon: BookOpenIcon },
];

export const PortalNavigation: React.FC<PortalNavigationProps> = ({ activeTab, unreadMessagesCount, attentionCount }) => {
    const activeMenu = tabs.find((tab) => tab.value === activeTab);

    return (
        <div className="border-b border-slate-200 bg-[linear-gradient(180deg,rgba(248,250,252,0.96)_0%,rgba(255,255,255,0.92)_100%)] p-4 dark:border-slate-800 dark:bg-[linear-gradient(180deg,rgba(15,23,42,0.92)_0%,rgba(15,23,42,0.82)_100%)] sm:p-5">
            <div className="mb-4 flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
                <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">Menu Portal</p>
                    <h3 className="mt-1 text-lg font-semibold text-slate-900 dark:text-white">{activeMenu?.label}</h3>
                    <p className="text-sm text-slate-600 dark:text-slate-400">{activeMenu?.description}</p>
                </div>
                <div className="text-xs text-slate-500 dark:text-slate-400">
                    {attentionCount > 0 ? `${attentionCount} perhatian` : 'Tidak ada perhatian mendesak'} • {unreadMessagesCount} pesan belum dibaca
                </div>
            </div>

            <TabsList className="grid min-w-full gap-2 bg-transparent p-0 sm:grid-cols-5">
                {tabs.map((tab) => {
                    const isActive = activeTab === tab.value;

                    return (
                        <TabsTrigger
                            key={tab.value}
                            value={tab.value}
                            className="h-auto min-h-[112px] min-w-0 flex-col items-start rounded-2xl border border-slate-200/80 bg-white px-4 py-4 text-left text-slate-600 shadow-sm transition-all hover:border-slate-300 hover:bg-slate-50 hover:text-slate-900 data-[state=active]:border-slate-900 data-[state=active]:bg-slate-900 data-[state=active]:text-white data-[state=active]:shadow-[0_20px_45px_-28px_rgba(15,23,42,0.8)] dark:border-slate-800 dark:bg-slate-900/70 dark:text-slate-300 dark:hover:border-slate-700 dark:hover:bg-slate-900 dark:data-[state=active]:border-amber-300/60 dark:data-[state=active]:bg-slate-800"
                        >
                            <div className="flex w-full items-start justify-between gap-3">
                                <span className={`inline-flex h-10 w-10 items-center justify-center rounded-2xl transition-colors ${isActive ? 'bg-white/10 text-white' : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200'}`}>
                                    <tab.icon className="h-5 w-5" />
                                </span>
                                {tab.value === 'komunikasi' && unreadMessagesCount > 0 && (
                                    <span className="rounded-full bg-rose-500 px-2 py-0.5 text-[10px] font-bold text-white">{unreadMessagesCount}</span>
                                )}
                                {tab.value === 'beranda' && attentionCount > 0 && (
                                    <span className="rounded-full bg-amber-500 px-2 py-0.5 text-[10px] font-bold text-white">{attentionCount}</span>
                                )}
                            </div>
                            <div className="mt-4">
                                <span className="block text-sm font-semibold">{tab.label}</span>
                                <span className="mt-1 block text-xs leading-5 text-current/75">{tab.description}</span>
                            </div>
                        </TabsTrigger>
                    );
                })}
            </TabsList>
        </div>
    );
};
