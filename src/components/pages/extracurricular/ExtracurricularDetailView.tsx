import React, { useState } from 'react';
import {
    ArrowLeft,
    Users,
    Calendar,
    GraduationCap,
    Clock,
    UserCog,
    Pencil,
    Sparkles,
} from 'lucide-react';
import { Extracurricular } from './types';

export type DetailTabType = 'members' | 'attendance' | 'grades';

interface ExtracurricularDetailViewProps {
    extracurricular: Extracurricular;
    onBack: () => void;
    onEdit?: (extracurricular: Extracurricular) => void;
    canEdit?: boolean;
    enrolledCount?: number;
    attendanceFilledCount?: number;
    gradedCount?: number;
    semesterLabel?: string;
    activeTab?: DetailTabType;
    onTabChange?: (tab: DetailTabType) => void;
    children: (activeTab: DetailTabType) => React.ReactNode;
}

export const ExtracurricularDetailView: React.FC<ExtracurricularDetailViewProps> = ({
    extracurricular,
    onBack,
    onEdit,
    canEdit = true,
    enrolledCount = 0,
    attendanceFilledCount,
    gradedCount,
    semesterLabel,
    activeTab: controlledTab,
    onTabChange,
    children,
}) => {
    const [internalTab, setInternalTab] = useState<DetailTabType>('members');
    const activeTab = controlledTab ?? internalTab;

    const handleTabSelect = (nextTab: DetailTabType) => {
        if (onTabChange) {
            onTabChange(nextTab);
        } else {
            setInternalTab(nextTab);
        }
    };

    const maxParticipants = extracurricular.max_participants || 30;
    const isActive = extracurricular.is_active !== false;

    const tabs: Array<{
        id: DetailTabType;
        label: string;
        icon: React.ComponentType<{ className?: string }>;
        badge?: string;
    }> = [
        {
            id: 'members',
            label: 'Anggota',
            icon: Users,
            badge: `${enrolledCount}`,
        },
        {
            id: 'attendance',
            label: 'Presensi',
            icon: Calendar,
            badge:
                attendanceFilledCount !== undefined && enrolledCount > 0
                    ? `${attendanceFilledCount}/${enrolledCount}`
                    : undefined,
        },
        {
            id: 'grades',
            label: 'Nilai',
            icon: GraduationCap,
            badge:
                gradedCount !== undefined && enrolledCount > 0
                    ? `${gradedCount}/${enrolledCount}`
                    : undefined,
        },
    ];

    return (
        <div className="flex flex-col h-full animate-in fade-in slide-in-from-right-4 duration-500">
            {/* Header Hero */}
            <div className="relative bg-gradient-to-br from-slate-900 to-slate-800 dark:from-slate-950 dark:to-slate-900 rounded-2xl sm:rounded-3xl p-5 sm:p-7 mb-5 overflow-hidden shadow-xl">
                {/* Decorative Elements */}
                <div className="absolute top-0 right-0 w-64 h-64 bg-amber-500/20 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3" />
                <div className="absolute bottom-0 left-0 w-48 h-48 bg-orange-500/20 rounded-full blur-3xl translate-y-1/2 -translate-x-1/4" />

                <div className="relative z-10">
                    <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
                        <button
                            type="button"
                            onClick={onBack}
                            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white/90 hover:text-white transition-all text-sm font-medium backdrop-blur-sm"
                        >
                            <ArrowLeft className="w-4 h-4" />
                            Kembali ke Daftar
                        </button>

                        <div className="flex items-center gap-2">
                            {semesterLabel && (
                                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/10 border border-white/15 text-xs font-medium text-amber-200 backdrop-blur-sm">
                                    <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                                    {semesterLabel}
                                </span>
                            )}
                            {canEdit && onEdit && (
                                <button
                                    type="button"
                                    onClick={() => onEdit(extracurricular)}
                                    className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs sm:text-sm font-semibold border border-white/15 transition-all backdrop-blur-sm"
                                >
                                    <Pencil className="w-3.5 h-3.5 text-amber-400" />
                                    Edit Info Ekskul
                                </button>
                            )}
                        </div>
                    </div>

                    <div className="flex flex-col sm:flex-row gap-4 sm:gap-6 items-start sm:items-center">
                        <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center shadow-lg shadow-amber-500/30 flex-shrink-0">
                            <span className="text-2xl sm:text-3xl font-bold text-white uppercase">
                                {extracurricular.name.substring(0, 2)}
                            </span>
                        </div>
                        <div className="flex-1 min-w-0">
                            <div className="flex flex-wrap items-center gap-2.5 mb-2">
                                <h2 className="text-2xl sm:text-3xl font-bold text-white">
                                    {extracurricular.name}
                                </h2>
                                <span className="px-3 py-1 rounded-full bg-amber-500/20 border border-amber-500/30 text-amber-300 text-xs font-semibold backdrop-blur-md">
                                    {extracurricular.category || 'Lainnya'}
                                </span>
                                {!isActive && (
                                    <span className="px-3 py-1 rounded-full bg-rose-500/20 border border-rose-500/30 text-rose-200 text-xs font-semibold backdrop-blur-md">
                                        Nonaktif
                                    </span>
                                )}
                            </div>
                            <p className="text-slate-300 text-sm max-w-2xl line-clamp-2 mb-4">
                                {extracurricular.description || 'Belum ada deskripsi kegiatan ekstrakurikuler.'}
                            </p>

                            <div className="flex flex-wrap gap-2 sm:gap-3 text-xs sm:text-sm text-slate-200">
                                <div className="flex items-center gap-2 bg-white/5 px-3 py-1.5 rounded-xl backdrop-blur-sm border border-white/10">
                                    <Clock className="w-4 h-4 text-amber-400 shrink-0" />
                                    <span>
                                        {extracurricular.schedule_day || 'Jadwal belum diatur'}
                                        {extracurricular.schedule_time
                                            ? ` • ${extracurricular.schedule_time}`
                                            : ''}
                                    </span>
                                </div>
                                <div className="flex items-center gap-2 bg-white/5 px-3 py-1.5 rounded-xl backdrop-blur-sm border border-white/10">
                                    <UserCog className="w-4 h-4 text-amber-400 shrink-0" />
                                    <span>Pembina: {extracurricular.coach_name || 'Belum diatur'}</span>
                                </div>
                                <div className="flex items-center gap-2 bg-white/5 px-3 py-1.5 rounded-xl backdrop-blur-sm border border-white/10">
                                    <Users className="w-4 h-4 text-amber-400 shrink-0" />
                                    <span>
                                        Anggota: <strong className="text-white">{enrolledCount}</strong> / {maxParticipants} peserta
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Sticky Tab Navigation */}
            <div className="sticky top-0 z-30 bg-gray-50/90 dark:bg-gray-900/90 backdrop-blur-md -mx-4 md:-mx-6 px-4 md:px-6 py-3 border-b border-slate-200 dark:border-slate-800 mb-5">
                <div className="flex justify-center w-full">
                    <div
                        className="grid grid-cols-3 gap-2 sm:gap-3 w-full max-w-2xl"
                        role="tablist"
                        aria-label="Menu Kelola Ekstrakurikuler"
                    >
                        {tabs.map((tab) => {
                            const Icon = tab.icon;
                            const isTabActive = activeTab === tab.id;
                            return (
                                <button
                                    type="button"
                                    role="tab"
                                    aria-selected={isTabActive}
                                    key={tab.id}
                                    onClick={() => handleTabSelect(tab.id)}
                                    className={`relative flex items-center justify-center gap-1.5 sm:gap-2 px-2 sm:px-5 py-2.5 rounded-xl font-semibold text-xs sm:text-sm transition-all whitespace-nowrap border cursor-pointer ${
                                        isTabActive
                                            ? 'bg-white dark:bg-slate-800 text-amber-600 dark:text-amber-400 shadow-sm border-amber-300 dark:border-amber-800/80 ring-1 ring-amber-400/20'
                                            : 'bg-white/40 dark:bg-slate-800/30 text-slate-600 dark:text-slate-400 hover:bg-white dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-slate-200 border-slate-200/60 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
                                    }`}
                                >
                                    <Icon className={`w-4 h-4 shrink-0 ${isTabActive ? 'text-amber-500' : ''}`} />
                                    <span className="truncate">{tab.label}</span>
                                    {tab.badge && (
                                        <span
                                            className={`px-1.5 sm:px-2 py-0.5 rounded-full text-[10px] sm:text-xs font-bold shrink-0 ${
                                                isTabActive
                                                    ? 'bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300'
                                                    : 'bg-slate-200/70 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
                                            }`}
                                        >
                                            {tab.badge}
                                        </span>
                                    )}
                                    {isTabActive && (
                                        <span className="absolute -bottom-3 left-1/2 -translate-x-1/2 w-2 h-2 rounded-full bg-amber-500 shadow-sm shadow-amber-500/50" />
                                    )}
                                </button>
                            );
                        })}
                    </div>
                </div>
            </div>

            {/* Content Area */}
            <div className="flex-1 min-h-0 bg-white dark:bg-slate-900 rounded-2xl shadow-sm transition-all border border-slate-200 dark:border-slate-800 p-3 sm:p-6">
                {children(activeTab)}
            </div>
        </div>
    );
};
