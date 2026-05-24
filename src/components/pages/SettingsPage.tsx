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

import { Search, Sparkles, ArrowRight, Settings } from 'lucide-react';

const SettingsPage: React.FC = () => {
    const { logout, loading } = useAuth();
    const [activeTab, setActiveTab] = useState('profile');
    const [searchQuery, setSearchQuery] = useState('');

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

    const searchItems = [
        { query: 'semester', tab: 'academic', title: 'Tahun Ajaran & Semester', desc: 'Ganti atau kelola semester aktif, kurikulum, dan tahun ajaran.' },
        { query: 'tahun ajaran', tab: 'academic', title: 'Tahun Ajaran & Semester', desc: 'Ganti atau kelola semester aktif, kurikulum, dan tahun ajaran.' },
        { query: 'kkm', tab: 'academic', title: 'Ketuntasan Minimal (KKM)', desc: 'Pengaturan kriteria ketuntasan minimal nilai siswa.' },
        { query: 'kurikulum', tab: 'academic', title: 'Kurikulum Sekolah', desc: 'Ubah basis kurikulum kelas (Merdeka / K13).' },
        
        { query: 'tema', tab: 'appearance', title: 'Tema Aplikasi (Terang/Gelap)', desc: 'Ganti tampilan portal menjadi mode malam atau siang.' },
        { query: 'mode gelap', tab: 'appearance', title: 'Tema Gelap / Dark Mode', desc: 'Aktifkan mode malam untuk kenyamanan mata.' },
        { query: 'mode terang', tab: 'appearance', title: 'Tema Terang / Light Mode', desc: 'Tampilan bersih putih cerah untuk siang hari.' },
        { query: 'kontras', tab: 'appearance', title: 'Kontras Tinggi', desc: 'Tingkatkan keterbacaan warna teks bagi gangguan penglihatan.' },
        { query: 'animasi', tab: 'appearance', title: 'Kurangi Gerakan / Animasi', desc: 'Matikan animasi transisi untuk performa perangkat hemat daya.' },
        { query: 'tutorial', tab: 'appearance', title: 'Mulai Ulang Panduan / Onboarding', desc: 'Reset pemandu interaktif untuk mempelajari kembali fitur-fitur.' },
        
        { query: 'profil', tab: 'profile', title: 'Informasi Profil & Avatar', desc: 'Perbarui nama lengkap, foto profil, NIP, atau biodata guru.' },
        { query: 'avatar', tab: 'profile', title: 'Foto Profil / Avatar', desc: 'Unggah foto pribadi atau gunakan avatar kustom.' },
        { query: 'biodata', tab: 'profile', title: 'Biodata & Identitas', desc: 'Kelola informasi instansi dan data mengajar.' },
        
        { query: 'whatsapp', tab: 'notifications', title: 'Notifikasi & WhatsApp', desc: 'Konfigurasi otomatisasi pesan WhatsApp laporan presensi dan kuis.' },
        { query: 'notifikasi', tab: 'notifications', title: 'Preferensi Notifikasi', desc: 'Kelola push notification, email, dan peringatan presensi.' },
        
        { query: 'sinkronisasi', tab: 'database', title: 'Sinkronisasi Data Offline', desc: 'Pantau antrean penyimpanan luring dan unggah manual.' },
        { query: 'manajemen data', tab: 'database', title: 'Backup & Manajemen Data', desc: 'Ekspor database siswa, bersihkan sampah, atau backup lokal.' },
        { query: 'backup', tab: 'database', title: 'Backup Data Siswa', desc: 'Cadangkan data presensi dan nilai dalam format JSON/Excel.' },
        
        { query: 'password', tab: 'account', title: 'Ganti Kata Sandi / Password', desc: 'Perbarui kunci akses akun Anda dengan standar keamanan tinggi.' },
        { query: 'keamanan', tab: 'account', title: 'Keamanan Akun & Sesi', desc: 'Atur batas waktu sesi (session timeout) dan autentikasi ganda.' },
        { query: 'logout', tab: 'account', title: 'Keluar Sesi / Logout', desc: 'Keluar dari akun Portal Guru secara aman.' },
    ];

    const filteredSearch = searchQuery.trim() === ''
        ? []
        : searchItems.filter(item => 
            item.query.toLowerCase().includes(searchQuery.toLowerCase()) ||
            item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
            item.desc.toLowerCase().includes(searchQuery.toLowerCase())
          );

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
        <div className="min-h-screen bg-slate-50 dark:bg-slate-950 p-3 sm:p-4 md:p-8 font-sans pb-24 lg:pb-8 relative overflow-hidden">
            {/* Background Blob Shines */}
            <div className="absolute top-0 left-1/4 w-96 h-96 bg-emerald-500/5 dark:bg-emerald-400/5 rounded-full blur-3xl -z-10 pointer-events-none"></div>
            <div className="absolute bottom-10 right-1/4 w-96 h-96 bg-green-500/5 dark:bg-green-400/5 rounded-full blur-3xl -z-10 pointer-events-none"></div>

            <div className="max-w-7xl mx-auto space-y-4 sm:space-y-8 relative">
                {/* Premium Header */}
                <header className="relative p-6 sm:p-8 md:p-12 rounded-2xl sm:rounded-3xl bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-green-950 via-emerald-950 to-slate-950 text-white shadow-2xl shadow-green-950/20 overflow-hidden isolate border border-emerald-900/30">
                    {/* Decorative Elements */}
                    <div className="absolute -top-24 -right-24 w-64 h-64 bg-emerald-500/20 rounded-full blur-3xl -z-10"></div>
                    <div className="absolute bottom-0 left-0 w-full h-1/2 bg-gradient-to-t from-black/30 to-transparent -z-10"></div>

                    {/* Mechanical Settings Spinning Gear Logo */}
                    <div className="absolute top-6 right-6 md:top-8 md:right-8 opacity-20 sm:opacity-30 pointer-events-none">
                        <Settings className="w-16 h-16 sm:w-28 sm:h-28 text-emerald-300 animate-[spin_20s_linear_infinite]" />
                    </div>

                    <div className="relative z-10 animate-fade-in-up space-y-6">
                        <div>
                            <h1 className="text-2xl sm:text-3xl md:text-5xl font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-white via-green-100 to-emerald-200">
                                Pengaturan Portal
                            </h1>
                            <p className="mt-2 text-emerald-100/70 text-xs sm:text-base max-w-2xl leading-relaxed">
                                Konfigurasikan profil guru, kurikulum akademik, otentikasi akun, preferensi notifikasi, dan tema visual secara dinamis.
                            </p>
                        </div>

                        {/* Integrated Settings Intelligent Search Bar */}
                        <div className="max-w-xl relative">
                            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                <Search className="h-5 w-5 text-emerald-300/60" />
                            </div>
                            <input
                                type="text"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                placeholder="Cari KKM, mapel, semester, ganti password, mode gelap..."
                                className="block w-full pl-11 pr-10 py-3 sm:py-3.5 rounded-2xl border border-white/10 bg-white/10 backdrop-blur-md text-white placeholder-emerald-200/40 focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:border-transparent text-sm transition-all shadow-inner"
                            />
                            {searchQuery && (
                                <button
                                    onClick={() => setSearchQuery('')}
                                    className="absolute inset-y-0 right-0 pr-4 flex items-center text-xs text-emerald-300 hover:text-white font-semibold transition-colors"
                                >
                                    Batal
                                </button>
                            )}
                        </div>
                    </div>
                </header>

                {/* Intelligent Search Results Board */}
                {filteredSearch.length > 0 && (
                    <div className="bg-white/80 dark:bg-slate-900/60 border border-emerald-500/20 rounded-2xl p-4 sm:p-6 shadow-xl backdrop-blur-xl animate-fade-in space-y-3 relative z-20">
                        <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400">
                            <Sparkles className="w-5 h-5 animate-pulse" />
                            <h3 className="font-bold text-sm sm:text-base">Navigasi Pintar Ditemukan:</h3>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                            {filteredSearch.map((item, index) => (
                                <button
                                    key={index}
                                    onClick={() => {
                                        setActiveTab(item.tab);
                                        setSearchQuery('');
                                    }}
                                    className="flex items-start text-left p-3.5 rounded-xl border border-slate-200/50 dark:border-white/5 hover:border-emerald-500 bg-white dark:bg-slate-800/40 hover:bg-emerald-50/50 dark:hover:bg-emerald-950/20 transition-all duration-300 group shadow-sm hover:shadow-md"
                                >
                                    <div className="min-w-0 flex-1">
                                        <p className="font-bold text-xs sm:text-sm text-slate-800 dark:text-slate-200 group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors flex items-center justify-between">
                                            {item.title}
                                            <ArrowRight className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all text-emerald-500" />
                                        </p>
                                        <p className="text-[10px] sm:text-xs text-slate-500 dark:text-slate-400 mt-1 line-clamp-2">{item.desc}</p>
                                    </div>
                                </button>
                            ))}
                        </div>
                    </div>
                )}

                {/* Popular Topics Navigation Helpers (Empty Search State) */}
                {searchQuery === '' && (
                    <div className="flex items-center gap-2 overflow-x-auto pb-1 -mx-3 px-3 scrollbar-hide">
                        <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest whitespace-nowrap">Asisten Cerdas:</span>
                        <button
                            onClick={() => setActiveTab('appearance')}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-slate-200/60 dark:border-white/5 bg-white/70 dark:bg-slate-900/40 hover:border-green-500/30 text-xs font-semibold text-slate-700 dark:text-slate-300 transition-all duration-300 shadow-sm whitespace-nowrap hover:scale-105 active:scale-95"
                        >
                            <span>🌓 Mode Gelap/Terang</span>
                        </button>
                        <button
                            onClick={() => setActiveTab('academic')}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-slate-200/60 dark:border-white/5 bg-white/70 dark:bg-slate-900/40 hover:border-emerald-500/30 text-xs font-semibold text-slate-700 dark:text-slate-300 transition-all duration-300 shadow-sm whitespace-nowrap hover:scale-105 active:scale-95"
                        >
                            <span>🏫 Kelola Semester / KKM</span>
                        </button>
                        <button
                            onClick={() => setActiveTab('account')}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-slate-200/60 dark:border-white/5 bg-white/70 dark:bg-slate-900/40 hover:border-blue-500/30 text-xs font-semibold text-slate-700 dark:text-slate-300 transition-all duration-300 shadow-sm whitespace-nowrap hover:scale-105 active:scale-95"
                        >
                            <span>🔑 Ganti Sandi Akun</span>
                        </button>
                        <button
                            onClick={() => setActiveTab('database')}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-slate-200/60 dark:border-white/5 bg-white/70 dark:bg-slate-900/40 hover:border-amber-500/30 text-xs font-semibold text-slate-700 dark:text-slate-300 transition-all duration-300 shadow-sm whitespace-nowrap hover:scale-105 active:scale-95"
                        >
                            <span>💾 Backup Data Siswa</span>
                        </button>
                    </div>
                )}

                {/* Mobile Tab Navigation - Horizontal scroll with visual premium capsules */}
                <div className="lg:hidden overflow-x-auto -mx-3 px-3 scrollbar-hide relative z-10">
                    <div className="pointer-events-none absolute inset-y-0 left-0 w-8 bg-gradient-to-r from-slate-50 to-transparent dark:from-slate-950 z-10"></div>
                    <div className="pointer-events-none absolute inset-y-0 right-0 w-8 bg-gradient-to-l from-slate-50 to-transparent dark:from-slate-950 z-10"></div>
                    <nav className="flex gap-2 p-2 rounded-2xl bg-white/80 dark:bg-slate-900/60 backdrop-blur-xl border border-slate-200/50 dark:border-white/5 shadow-lg min-w-max relative">
                        {navItems.map((item) => (
                            <button
                                key={item.id}
                                onClick={() => setActiveTab(item.id)}
                                aria-current={activeTab === item.id ? 'page' : undefined}
                                className={`
                                    flex items-center gap-2 px-4 py-3 rounded-xl transition-all duration-300 whitespace-nowrap hover:scale-105 active:scale-95
                                    ${activeTab === item.id
                                        ? 'bg-gradient-to-r from-green-600 to-emerald-600 dark:from-emerald-500 dark:to-green-600 text-white shadow-md shadow-green-500/25 ring-1 ring-white/10'
                                        : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100/50 dark:hover:bg-white/5 font-semibold text-xs sm:text-sm'
                                    }
                                    focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/40
                                `}
                            >
                                <item.icon className={`w-4 h-4 flex-shrink-0 ${activeTab === item.id ? 'scale-110' : ''}`} />
                                <span className="font-semibold text-xs sm:text-sm">{item.label}</span>
                            </button>
                        ))}
                    </nav>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 lg:gap-8">
                    {/* Desktop Navigation Sidebar - Overhauled Glassmorphic Menu */}
                    <aside className="hidden lg:block lg:col-span-3">
                        <nav className="flex flex-col gap-2 p-3 rounded-3xl bg-white/80 dark:bg-slate-900/60 backdrop-blur-xl border border-slate-200/50 dark:border-white/5 shadow-xl sticky top-4">
                            <div className="px-3 py-2.5 mb-2 border-b border-slate-100 dark:border-white/5">
                                <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">Menu Navigasi</p>
                            </div>
                            {navItems.map((item) => (
                                <button
                                    key={item.id}
                                    onClick={() => setActiveTab(item.id)}
                                    aria-current={activeTab === item.id ? 'page' : undefined}
                                    className={`
                                        group flex items-center gap-3 w-full text-left px-4 py-3.5 rounded-2xl transition-all duration-300 relative overflow-hidden hover:translate-x-1
                                        ${activeTab === item.id
                                            ? 'bg-gradient-to-r from-green-600 to-emerald-600 dark:from-emerald-500 dark:to-green-600 text-white shadow-lg shadow-green-500/20 ring-1 ring-white/10'
                                            : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-white/5 hover:text-slate-900 dark:hover:text-white'
                                        }
                                        focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/40
                                    `}
                                >
                                    <item.icon className={`w-5 h-5 flex-shrink-0 transition-transform duration-300 ${activeTab === item.id ? 'scale-110' : 'group-hover:scale-110 group-hover:rotate-12'}`} />
                                    <span className="text-sm font-semibold tracking-wide">{item.label}</span>
                                    {activeTab === item.id && (
                                        <div className="absolute right-0 top-0 bottom-0 w-1.5 bg-white/30 rounded-l-full"></div>
                                    )}
                                </button>
                            ))}
                        </nav>
                    </aside>

                    {/* Main Content Area - Render Section with Smooth Fade-in */}
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

