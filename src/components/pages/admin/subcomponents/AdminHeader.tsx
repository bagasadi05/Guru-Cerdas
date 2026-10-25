import React from 'react';
import {
    ShieldCheck,
    RefreshCw,
    BarChart3,
    GraduationCap,
    Library,
    Users,
    UserCheck,
    Megaphone,
    Activity,
    Settings,
    Bell,
} from 'lucide-react';
import type { TabType } from '../types';

interface AdminHeaderProps {
    currentTime: Date;
    activeTab: TabType;
    onTabChange: (tab: TabType) => void;
    onRefresh: () => void;
    statsLoading: boolean;
}

const TABS: { id: TabType; label: string; icon: React.ReactNode }[] = [
    { id: 'overview', label: 'Ringkasan', icon: <BarChart3 size={18} /> },
    { id: 'students', label: 'Kelola Siswa', icon: <GraduationCap size={18} /> },
    { id: 'classes', label: 'Kelola Kelas', icon: <Library size={18} /> },
    { id: 'users', label: 'Pengguna & Guru', icon: <Users size={18} /> },
    { id: 'assignments', label: 'Penugasan Guru', icon: <UserCheck size={18} /> },
    { id: 'announcements', label: 'Pengumuman', icon: <Megaphone size={18} /> },
    { id: 'activity', label: 'Aktivitas', icon: <Activity size={18} /> },
    { id: 'system', label: 'Sistem', icon: <Settings size={18} /> },
    { id: 'modul-ajar-bank', label: 'Bank Modul Ajar', icon: <Library size={18} /> },
    { id: 'notifications', label: 'Telegram', icon: <Bell size={18} /> },
];

export const AdminHeader: React.FC<AdminHeaderProps> = ({
    currentTime,
    activeTab,
    onTabChange,
    onRefresh,
    statsLoading,
}) => {
    return (
        <header className="mb-8">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                    <div className="p-3 bg-gradient-to-br from-brand-600 to-brand-700 rounded-2xl text-white shadow-lg shadow-brand-600/30">
                        <ShieldCheck size={28} />
                    </div>
                    <div>
                        <h1 className="text-2xl md:text-3xl font-bold bg-gradient-to-r from-slate-900 to-slate-800 dark:from-white dark:to-gray-400 bg-clip-text text-transparent">
                            Dasbor Admin
                        </h1>
                        <p className="text-sm text-gray-500 dark:text-gray-400 flex items-center gap-2">
                            <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
                            Portal Manajemen Sistem
                        </p>
                    </div>
                </div>

                {/* Real-time Info */}
                <div className="hidden md:flex items-center gap-6">
                    <div className="text-right">
                        <p className="text-2xl font-bold text-gray-900 dark:text-white font-mono">
                            {currentTime.toLocaleTimeString('id-ID', {
                                hour: '2-digit',
                                minute: '2-digit',
                                second: '2-digit',
                            })}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                            {currentTime.toLocaleDateString('id-ID', {
                                weekday: 'long',
                                day: 'numeric',
                                month: 'long',
                                year: 'numeric',
                            })}
                        </p>
                    </div>
                    <button
                        type="button"
                        onClick={onRefresh}
                        className="flex items-center gap-2 px-4 py-2 min-h-[44px] bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl hover:border-brand-500/50 transition-all duration-150 shadow-sm cursor-pointer active:scale-95"
                        aria-label="Muat ulang data admin"
                    >
                        <RefreshCw size={16} className={statsLoading ? 'animate-spin text-brand-600' : ''} />
                        <span className="text-sm font-medium">Muat Ulang</span>
                    </button>
                </div>
            </div>

            {/* Tab Navigation */}
            <div className="mt-6 flex gap-2 overflow-x-auto pb-2 scrollbar-hide -mx-4 px-4 sm:mx-0 sm:px-0">
                {TABS.map((tab) => (
                    <button
                        type="button"
                        key={tab.id}
                        onClick={() => onTabChange(tab.id)}
                        className={`flex items-center gap-2 px-4 py-2.5 min-h-[44px] rounded-xl text-xs sm:text-sm font-semibold whitespace-nowrap transition-all duration-150 cursor-pointer active:scale-95 ${
                            activeTab === tab.id
                                ? 'bg-brand-600 text-white shadow-lg shadow-brand-600/30'
                                : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700 border border-gray-200 dark:border-gray-700'
                        }`}
                    >
                        {tab.icon}
                        {tab.label}
                    </button>
                ))}
            </div>
        </header>
    );
};
