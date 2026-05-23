import React, { useState } from 'react';
import { ArrowLeft, Users, Calendar, GraduationCap, Clock, UserCog } from 'lucide-react';
import { Extracurricular } from './types';

export type DetailTabType = 'members' | 'attendance' | 'grades';

interface ExtracurricularDetailViewProps {
    extracurricular: Extracurricular;
    onBack: () => void;
    children: (activeTab: DetailTabType) => React.ReactNode;
}

export const ExtracurricularDetailView: React.FC<ExtracurricularDetailViewProps> = ({
    extracurricular,
    onBack,
    children
}) => {
    const [activeTab, setActiveTab] = useState<DetailTabType>('members');

    const tabs = [
        { id: 'members', label: 'Anggota', icon: Users },
        { id: 'attendance', label: 'Presensi', icon: Calendar },
        { id: 'grades', label: 'Nilai', icon: GraduationCap },
    ] as const;

    return (
        <div className="flex flex-col h-full animate-in fade-in slide-in-from-right-4 duration-500">
            {/* Header Hero */}
            <div className="relative bg-gradient-to-br from-slate-900 to-slate-800 dark:from-slate-950 dark:to-slate-900 rounded-3xl p-6 sm:p-8 mb-6 overflow-hidden shadow-xl">
                {/* Decorative Elements */}
                <div className="absolute top-0 right-0 w-64 h-64 bg-amber-500/20 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3" />
                <div className="absolute bottom-0 left-0 w-48 h-48 bg-orange-500/20 rounded-full blur-3xl translate-y-1/2 -translate-x-1/4" />

                <div className="relative z-10">
                    <button
                        onClick={onBack}
                        className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white/80 hover:text-white transition-all text-sm font-medium mb-6 backdrop-blur-sm"
                    >
                        <ArrowLeft className="w-4 h-4" />
                        Kembali ke Daftar
                    </button>

                    <div className="flex flex-col sm:flex-row gap-6 items-start sm:items-center">
                        <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center shadow-lg shadow-amber-500/30 flex-shrink-0">
                            <span className="text-3xl sm:text-4xl font-bold text-white uppercase">
                                {extracurricular.name.substring(0, 2)}
                            </span>
                        </div>
                        <div className="flex-1">
                            <div className="flex flex-wrap items-center gap-3 mb-2">
                                <h2 className="text-2xl sm:text-3xl font-bold text-white">{extracurricular.name}</h2>
                                <span className="px-3 py-1 rounded-full bg-amber-500/20 border border-amber-500/30 text-amber-300 text-xs font-semibold backdrop-blur-md">
                                    {extracurricular.category || 'Lainnya'}
                                </span>
                            </div>
                            <p className="text-slate-300 text-sm max-w-2xl line-clamp-2 mb-4">
                                {extracurricular.description || 'Tidak ada deskripsi.'}
                            </p>
                            
                            <div className="flex flex-wrap gap-4 text-sm text-slate-300">
                                <div className="flex items-center gap-2 bg-white/5 px-3 py-1.5 rounded-lg backdrop-blur-sm border border-white/10">
                                    <Clock className="w-4 h-4 text-amber-400" />
                                    <span>{extracurricular.schedule_day || '-'}, {extracurricular.schedule_time || '-'}</span>
                                </div>
                                <div className="flex items-center gap-2 bg-white/5 px-3 py-1.5 rounded-lg backdrop-blur-sm border border-white/10">
                                    <UserCog className="w-4 h-4 text-amber-400" />
                                    <span>{extracurricular.coach_name || 'Belum ada pembina'}</span>
                                </div>
                                <div className="flex items-center gap-2 bg-white/5 px-3 py-1.5 rounded-lg backdrop-blur-sm border border-white/10">
                                    <Users className="w-4 h-4 text-amber-400" />
                                    <span>Maks. {extracurricular.max_participants} peserta</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Sticky Tab Navigation */}
            <div className="sticky top-0 z-30 bg-gray-50/90 dark:bg-gray-900/90 backdrop-blur-md -mx-4 md:-mx-6 px-4 md:px-6 py-3 border-b border-slate-200 dark:border-slate-800 mb-6">
                <div className="flex gap-2 overflow-x-auto scrollbar-hide">
                    {tabs.map((tab) => {
                        const Icon = tab.icon;
                        const isActive = activeTab === tab.id;
                        return (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                className={`
                                    relative flex items-center gap-2 px-5 py-2.5 rounded-xl font-medium transition-all whitespace-nowrap
                                    ${isActive
                                        ? 'bg-white dark:bg-slate-800 text-amber-600 dark:text-amber-400 shadow-sm border border-amber-200 dark:border-amber-900/50'
                                        : 'text-slate-500 dark:text-slate-400 hover:bg-white/50 dark:hover:bg-slate-800/50 hover:text-slate-800 dark:hover:text-slate-200'
                                    }
                                `}
                            >
                                <Icon className={`w-4 h-4 ${isActive ? 'text-amber-500' : ''}`} />
                                {tab.label}
                                {isActive && (
                                    <span className="absolute -bottom-3 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full bg-amber-500" />
                                )}
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* Content Area */}
            <div className="flex-1 min-h-0 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm p-4 sm:p-6">
                {children(activeTab)}
            </div>
        </div>
    );
};
