import React, { useState } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { UserCircleIcon, PaletteIcon, BellIcon, ShieldIcon, LinkIcon, DatabaseIcon } from '../Icons';
import ProfileSection from '../settings/ProfileSection';
import AppearanceSection from '../settings/AppearanceSection';
import NotificationsSection from '../settings/NotificationsSection';
import IntegrationsSection from '../settings/IntegrationsSection';
import AccountSection from '../settings/AccountSection';
import DataManagementSection from '../settings/DataManagementSection';

import { SettingsPageSkeleton } from '../skeletons/PageSkeletons';

const SettingsPage: React.FC = () => {
    const { logout, loading } = useAuth();
    const [activeTab, setActiveTab] = useState('profile');

    if (loading) return <SettingsPageSkeleton />;

    const navItems = [
        { id: 'profile', label: 'Profil', icon: UserCircleIcon },
        { id: 'appearance', label: 'Tampilan', icon: PaletteIcon },
        { id: 'notifications', label: 'Notifikasi', icon: BellIcon },
        { id: 'integrations', label: 'Integrasi', icon: LinkIcon },
        { id: 'database', label: 'Manajemen Data', icon: DatabaseIcon },
        { id: 'account', label: 'Akun & Keamanan', icon: ShieldIcon },
    ];

    const renderContent = () => {
        switch (activeTab) {
            case 'profile': return <ProfileSection />;
            case 'appearance': return <AppearanceSection />;
            case 'notifications': return <NotificationsSection />;
            case 'integrations': return <IntegrationsSection />;
            case 'database': return <DataManagementSection />;
            case 'account': return <AccountSection onLogout={logout} />;
            default: return null;
        }
    }

    return (
        <div className="min-h-screen bg-gray-50/50 dark:bg-slate-950/50 p-4 md:p-8 font-sans">
            <div className="max-w-7xl mx-auto space-y-8">
                {/* Premium Header */}
                <header className="relative p-8 md:p-12 rounded-3xl bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-indigo-900 via-purple-900 to-slate-900 text-white shadow-2xl shadow-indigo-900/20 overflow-hidden isolate">
                    {/* Decorative Elements */}
                    <div className="absolute -top-24 -right-24 w-64 h-64 bg-purple-500/30 rounded-full blur-3xl -z-10"></div>
                    <div className="absolute bottom-0 left-0 w-full h-1/2 bg-gradient-to-t from-black/20 to-transparent -z-10"></div>

                    <div className="relative z-10 animate-fade-in-up">
                        <h1 className="text-3xl md:text-5xl font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-white via-purple-100 to-indigo-200">
                            Pengaturan
                        </h1>
                        <p className="mt-4 text-indigo-100/80 text-lg max-w-2xl leading-relaxed">
                            Kelola profil, tampilan, dan preferensi notifikasi Anda dengan pengalaman yang lebih personal.
                        </p>
                    </div>
                </header>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                    {/* Navigation Sidebar */}
                    <aside className="lg:col-span-3 space-y-4">
                        <nav className="flex flex-wrap lg:flex-col gap-2 p-2 rounded-2xl bg-white/50 dark:bg-slate-900/50 backdrop-blur-xl border border-white/20 dark:border-white/5 shadow-lg">
                            {navItems.map((item) => (
                                <button
                                    key={item.id}
                                    onClick={() => setActiveTab(item.id)}
                                    className={`
                                        group flex items-center gap-3 w-full text-left px-4 py-3.5 rounded-xl transition-all duration-300 relative overflow-hidden
                                        ${activeTab === item.id
                                            ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-lg shadow-indigo-500/30'
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