import React, { useState } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { UserCircleIcon, PaletteIcon, BellIcon, ShieldIcon, LinkIcon, DatabaseIcon, GraduationCapIcon } from '../Icons';
import ProfileSection from '../settings/ProfileSection';
import AppearanceSection from '../settings/AppearanceSection';
import NotificationsSection from '../settings/NotificationsSection';
import IntegrationsSection from '../settings/IntegrationsSection';
import AccountSection from '../settings/AccountSection';
import DataManagementSection from '../settings/DataManagementSection';
import { SemesterManagement } from '../settings/SemesterManagement';

import { SettingsPageSkeleton } from '../skeletons/PageSkeletons';

const SettingsPage: React.FC = () => {
    const { logout, loading } = useAuth();
    const [activeTab, setActiveTab] = useState('profile');

    if (loading) return <SettingsPageSkeleton />;

    const navItems = [
        { id: 'profile', label: 'Profil', icon: UserCircleIcon },
        { id: 'appearance', label: 'Tampilan', icon: PaletteIcon },
        { id: 'academic', label: 'Akademik', icon: GraduationCapIcon },
        { id: 'notifications', label: 'Notifikasi', icon: BellIcon },
        { id: 'integrations', label: 'Integrasi', icon: LinkIcon },
        { id: 'database', label: 'Manajemen Data', icon: DatabaseIcon },
        { id: 'account', label: 'Akun & Keamanan', icon: ShieldIcon },
    ];

    const renderContent = () => {
        switch (activeTab) {
            case 'profile': return <ProfileSection />;
            case 'appearance': return <AppearanceSection />;
            case 'academic': return <SemesterManagement />;
            case 'notifications': return <NotificationsSection />;
            case 'integrations': return <IntegrationsSection />;
            case 'database': return <DataManagementSection />;
            case 'account': return <AccountSection onLogout={logout} />;
            default: return null;
        }
    }

    return (
        <div className="min-h-screen bg-gray-50/50 dark:bg-slate-950/50 p-3 sm:p-4 md:p-8 font-sans pb-24 lg:pb-8">
            <div className="max-w-7xl mx-auto space-y-4 sm:space-y-8">
                {/* Premium Header - Compact on mobile */}
                <header className="relative p-5 sm:p-8 md:p-12 rounded-2xl sm:rounded-3xl bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-green-900 via-emerald-900 to-slate-900 text-white shadow-2xl shadow-green-900/20 overflow-hidden isolate">
                    {/* Decorative Elements */}
                    <div className="absolute -top-24 -right-24 w-64 h-64 bg-emerald-500/30 rounded-full blur-3xl -z-10"></div>
                    <div className="absolute bottom-0 left-0 w-full h-1/2 bg-gradient-to-t from-black/20 to-transparent -z-10"></div>

                    <div className="relative z-10 animate-fade-in-up">
                        <h1 className="text-2xl sm:text-3xl md:text-5xl font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-white via-green-100 to-emerald-200">
                            Pengaturan
                        </h1>
                        <p className="mt-2 sm:mt-4 text-indigo-100/80 text-sm sm:text-lg max-w-2xl leading-relaxed">
                            Kelola profil, tampilan, dan preferensi notifikasi Anda.
                        </p>
                    </div>
                </header>

                {/* Mobile Tab Navigation - Horizontal scroll */}
                <div className="lg:hidden overflow-x-auto -mx-3 px-3 scrollbar-hide">
                    <nav className="flex gap-2 p-1.5 rounded-xl bg-white/50 dark:bg-slate-900/50 backdrop-blur-xl border border-white/20 dark:border-white/5 shadow-lg min-w-max">
                        {navItems.map((item) => (
                            <button
                                key={item.id}
                                onClick={() => setActiveTab(item.id)}
                                className={`
                                    flex items-center gap-2 px-3 py-2.5 rounded-lg transition-all duration-300 whitespace-nowrap
                                    ${activeTab === item.id
                                        ? 'bg-gradient-to-r from-green-600 to-emerald-600 text-white shadow-lg shadow-green-500/30'
                                        : 'text-slate-600 dark:text-slate-400 hover:bg-white/60 dark:hover:bg-white/5'
                                    }
                                `}
                            >
                                <item.icon className="w-4 h-4 flex-shrink-0" />
                                <span className="text-sm font-semibold">{item.label}</span>
                            </button>
                        ))}
                    </nav>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 lg:gap-8">
                    {/* Desktop Navigation Sidebar - Hidden on mobile */}
                    <aside className="hidden lg:block lg:col-span-3 space-y-4">
                        <nav className="flex flex-col gap-2 p-2 rounded-2xl bg-white/50 dark:bg-slate-900/50 backdrop-blur-xl border border-white/20 dark:border-white/5 shadow-lg sticky top-4">
                            {navItems.map((item) => (
                                <button
                                    key={item.id}
                                    onClick={() => setActiveTab(item.id)}
                                    className={`
                                        group flex items-center gap-3 w-full text-left px-4 py-3.5 rounded-xl transition-all duration-300 relative overflow-hidden
                                        ${activeTab === item.id
                                            ? 'bg-gradient-to-r from-green-600 to-emerald-600 text-white shadow-lg shadow-green-500/30'
                                            : 'text-slate-600 dark:text-slate-400 hover:bg-white/60 dark:hover:bg-white/5 hover:text-slate-900 dark:hover:text-white'
                                        }
                                    `}
                                >
                                    <item.icon className={`w-5 h-5 flex-shrink-0 transition-transform duration-300 ${activeTab === item.id ? 'scale-110' : 'group-hover:scale-110'}`} />
                                    <span className="text-sm font-semibold tracking-wide">{item.label}</span>
                                    {activeTab === item.id && (
                                        <div className="absolute right-0 top-0 bottom-0 w-1 bg-white/20"></div>
                                    )}
                                </button>
                            ))}
                        </nav>
                    </aside>

                    {/* Main Content Area */}
                    <main className="lg:col-span-9">
                        <div key={activeTab} className="transition-all duration-500 animate-fade-in">
                            {renderContent()}
                        </div>
                    </main>
                </div>
            </div>
        </div>
    );
};

export default SettingsPage;