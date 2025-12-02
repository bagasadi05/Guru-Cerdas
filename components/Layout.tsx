import React, { useState, useRef, useEffect } from 'react';
import { Link, NavLink, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { HomeIcon, UsersIcon, CalendarIcon, ClipboardIcon, LogoutIcon, SettingsIcon, GraduationCapIcon, SearchIcon, CheckSquareIcon, BrainCircuitIcon, ClipboardPenIcon } from './Icons';
import ThemeToggle from './ui/ThemeToggle';
import GlobalSearch from './ui/GlobalSearch';
import { Button } from './ui/Button';
import { useSyncQueue } from '../hooks/useSyncQueue';
import GreetingRobot from './GreetingRobot';
import { useSound } from '../hooks/useSound';

const navItems = [
    { href: '/dashboard', label: 'Beranda', icon: HomeIcon },
    { href: '/absensi', label: 'Rekap Absensi', icon: ClipboardIcon },
    { href: '/siswa', label: 'Data Siswa', icon: UsersIcon },
    { href: '/jadwal', label: 'Jadwal Pelajaran', icon: CalendarIcon },
    { href: '/tugas', label: 'Manajemen Tugas', icon: CheckSquareIcon },
    { href: '/input-massal', label: 'Input Nilai Cepat', icon: ClipboardPenIcon },
    { href: '/pengaturan', label: 'Pengaturan Sistem', icon: SettingsIcon },
];

const mobileNavItems = [
    { href: '/dashboard', label: 'Beranda', icon: HomeIcon },
    { href: '/absensi', label: 'Absensi', icon: ClipboardIcon },
    { href: '/jadwal', label: 'Jadwal', icon: CalendarIcon },
    { href: '/tugas', label: 'Tugas', icon: CheckSquareIcon },
    { href: '/siswa', label: 'Siswa', icon: UsersIcon },
    { href: '/input-massal', label: 'Nilai', icon: ClipboardPenIcon },
];

interface SidebarProps {
    onLinkClick?: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ onLinkClick }) => {
    const navigate = useNavigate();
    const { user, logout } = useAuth();
    const { playClick } = useSound();

    const handleLogout = async () => {
        if (onLinkClick) {
            onLinkClick();
        }
        await logout();
        navigate('/', { replace: true });
    };

    return (
        <aside className="relative w-72 h-full flex-shrink-0 font-sans">
            {/* Floating Glass Container */}
            <div className="h-full m-4 rounded-3xl bg-slate-900/90 backdrop-blur-xl border border-white/10 shadow-2xl flex flex-col overflow-hidden relative">

                {/* Ambient Background Effects */}
                <div className="absolute top-0 left-0 w-full h-64 bg-gradient-to-b from-indigo-500/20 to-transparent opacity-50 pointer-events-none"></div>
                <div className="absolute bottom-0 right-0 w-64 h-64 bg-purple-500/10 rounded-full blur-3xl pointer-events-none"></div>

                <div className="relative z-10 flex flex-col h-full p-5">
                    {/* Header */}
                    <div className="flex items-center gap-4 px-2 mb-8 mt-2">
                        <div className="relative group">
                            <div className="absolute inset-0 bg-indigo-500 blur-lg opacity-40 group-hover:opacity-60 transition-opacity duration-500"></div>
                            <div className="relative w-12 h-12 bg-gradient-to-br from-indigo-500 to-violet-600 rounded-xl flex items-center justify-center shadow-lg border border-white/20 group-hover:scale-105 transition-transform duration-300">
                                <GraduationCapIcon className="w-7 h-7 text-white drop-shadow-md" />
                            </div>
                        </div>
                        <div>
                            <h1 className="text-lg font-bold tracking-wide text-white uppercase font-serif">
                                Portal Guru
                            </h1>
                            <p className="text-[10px] font-medium text-indigo-200 tracking-[0.2em] uppercase opacity-80">Ecosystem</p>
                        </div>
                    </div>

                    {/* Profile Card */}
                    <div className="mb-6 p-1 rounded-2xl bg-white/5 border border-white/5 relative overflow-hidden group">
                        <div className="absolute inset-0 bg-gradient-to-r from-indigo-500/10 to-purple-500/10 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                        <div className="flex items-center gap-3 p-3 relative z-10">
                            <div className="relative">
                                <div className="absolute inset-0 bg-indigo-500 rounded-full blur-sm opacity-50"></div>
                                <img
                                    className="relative h-10 w-10 rounded-full object-cover border border-white/20"
                                    src={user?.avatarUrl}
                                    alt="User avatar"
                                />
                            </div>
                            <div className="overflow-hidden">
                                <p className="font-semibold text-sm text-white truncate">{user?.name}</p>
                                <p className="text-[10px] text-slate-400 truncate">{user?.email}</p>
                            </div>
                        </div>
                    </div>

                    {/* Navigation */}
                    <nav className="flex-1 space-y-1 overflow-y-auto scrollbar-hide pr-1">
                        {navItems.map((item) => (
                            <NavLink
                                key={item.href}
                                to={item.href}
                                end={item.href === '/dashboard'}
                                onClick={() => {
                                    playClick();
                                    if (onLinkClick) onLinkClick();
                                }}
                                className={({ isActive }) =>
                                    `relative flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-300 group overflow-hidden ${isActive
                                        ? 'text-white shadow-lg shadow-indigo-500/20'
                                        : 'text-slate-400 hover:text-white hover:bg-white/5'
                                    }`
                                }
                            >
                                {({ isActive }) => (
                                    <>
                                        {isActive && (
                                            <div className="absolute inset-0 bg-gradient-to-r from-indigo-600 to-violet-600 z-0"></div>
                                        )}
                                        {isActive && (
                                            <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-white/50 rounded-r-full blur-[1px]"></div>
                                        )}
                                        <item.icon className={`w-5 h-5 relative z-10 transition-transform duration-300 ${isActive ? 'scale-110 text-white' : 'group-hover:scale-110 group-hover:text-indigo-300'}`} />
                                        <span className={`relative z-10 text-sm tracking-wide ${isActive ? 'font-semibold' : 'font-medium'}`}>{item.label}</span>
                                    </>
                                )}
                            </NavLink>
                        ))}
                    </nav>

                    {/* Logout */}
                    <div className="mt-auto pt-4 border-t border-white/5">
                        <button
                            onClick={handleLogout}
                            className="flex items-center w-full gap-3 px-4 py-3 text-slate-400 rounded-xl hover:bg-red-500/10 hover:text-red-400 transition-all duration-300 group"
                        >
                            <LogoutIcon className="w-5 h-5 transition-transform group-hover:-translate-x-1" />
                            <span className="text-sm font-medium">Logout</span>
                        </button>
                    </div>
                </div>
            </div>
        </aside>
    );
};

const Layout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const { user } = useAuth();
    const { playClick } = useSound();
    const { pendingCount, isSyncing } = useSyncQueue();
    const [isSearchOpen, setIsSearchOpen] = useState(false);
    const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
    const [showGreeting, setShowGreeting] = useState(() => {
        if (typeof sessionStorage !== 'undefined') {
            return !sessionStorage.getItem('greeted');
        }
        return false;
    });

    useEffect(() => {
        const handleKeyDown = (event: KeyboardEvent) => {
            if ((event.metaKey || event.ctrlKey) && event.key === 'k') {
                event.preventDefault();
                setIsSearchOpen(true);
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, []);

    // Expose Search toggle to window for header/FAB buttons
    useEffect(() => {
        (window as any).toggleSearch = () => setIsSearchOpen(true);
        return () => {
            delete (window as any).toggleSearch;
        };
    }, []);

    useEffect(() => {
        const ensureNavbarVisible = () => {
            const navbar = document.querySelector('nav[class*="bottom-0"]');
            if (navbar && window.innerWidth < 1024) {
                const style = 'position: fixed !important; bottom: 0 !important; left: 0 !important; right: 0 !important; z-index: 30 !important; display: flex !important; visibility: visible !important; opacity: 1 !important; transform: translateY(0) !important;';
                (navbar as HTMLElement).style.cssText = style;
            }
        };

        ensureNavbarVisible();

        const timer = setInterval(ensureNavbarVisible, 1000);

        window.addEventListener('resize', ensureNavbarVisible);
        window.addEventListener('orientationchange', ensureNavbarVisible);

        return () => {
            clearInterval(timer);
            window.removeEventListener('resize', ensureNavbarVisible);
            window.removeEventListener('orientationchange', ensureNavbarVisible);
        };
    }, []);

    const handleGreetingEnd = () => {
        setShowGreeting(false);
        if (typeof sessionStorage !== 'undefined') {
            sessionStorage.setItem('greeted', 'true');
        }
    };

    const location = useLocation();

    return (
        <div className="flex h-screen overflow-hidden bg-slate-50 dark:bg-slate-950/50">
            {/* Background Gradients */}
            <div className="fixed inset-0 z-0 pointer-events-none">
                <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-indigo-500/5 rounded-full blur-[100px]"></div>
                <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-purple-500/5 rounded-full blur-[100px]"></div>
            </div>

            {showGreeting && user && (
                <GreetingRobot userName={user.name} onAnimationEnd={handleGreetingEnd} />
            )}

            {/* Mobile sidebar overlay */}
            {isMobileSidebarOpen && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-40 lg:hidden" onClick={() => setIsMobileSidebarOpen(false)} />
            )}

            {/* Desktop sidebar - hidden on mobile */}
            <div className={`fixed lg:static inset-y-0 left-0 z-50 transform transition-transform duration-300 lg:translate-x-0 ${isMobileSidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
                <Sidebar onLinkClick={() => setIsMobileSidebarOpen(false)} />
            </div>

            <div className="flex flex-col flex-1 w-full overflow-hidden relative z-10">
                {/* Header */}
                <header className="h-20 flex items-center justify-between px-6 lg:px-8 sticky top-0 z-20 transition-all duration-300">
                    <div className="absolute inset-0 bg-white/70 dark:bg-slate-900/70 backdrop-blur-xl border-b border-white/20 dark:border-white/5 shadow-sm"></div>

                    <div className="relative z-10 flex items-center gap-4 w-full">
                        {/* Mobile menu button */}
                        <button
                            onClick={() => setIsMobileSidebarOpen(true)}
                            className="lg:hidden flex items-center justify-center w-10 h-10 rounded-xl bg-white/50 dark:bg-slate-800/50 hover:bg-white dark:hover:bg-slate-800 transition-all active:scale-95 border border-black/5 dark:border-white/10"
                            aria-label="Open menu"
                        >
                            <svg className="w-5 h-5 text-slate-700 dark:text-slate-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                            </svg>
                        </button>

                        {/* Search button */}
                        <Button
                            variant="ghost"
                            onClick={() => setIsSearchOpen(true)}
                            className="hidden sm:flex items-center gap-3 h-11 px-4 rounded-xl bg-white/50 dark:bg-slate-800/50 hover:bg-white dark:hover:bg-slate-800 border border-black/5 dark:border-white/10 text-slate-500 dark:text-slate-400 w-full max-w-md transition-all group"
                        >
                            <SearchIcon className="w-4 h-4 group-hover:text-indigo-500 transition-colors" />
                            <span className="text-sm font-medium">Cari Siswa...</span>
                            <div className="ml-auto flex items-center gap-1">
                                <kbd className="hidden md:inline-flex h-5 items-center gap-1 rounded border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 px-1.5 font-mono text-[10px] font-medium text-slate-500 dark:text-slate-400">
                                    <span className="text-xs">⌘</span>K
                                </kbd>
                            </div>
                        </Button>

                        {/* Mobile search icon */}
                        <button
                            onClick={() => setIsSearchOpen(true)}
                            className="sm:hidden flex items-center justify-center w-10 h-10 rounded-xl bg-white/50 dark:bg-slate-800/50 hover:bg-white dark:hover:bg-slate-800 transition-all active:scale-95 border border-black/5 dark:border-white/10"
                            aria-label="Search"
                        >
                            <SearchIcon className="w-5 h-5 text-slate-700 dark:text-slate-200" />
                        </button>

                        <div className="flex items-center gap-3 ml-auto">
                            {/* Theme Toggle */}
                            <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-white/50 dark:bg-slate-800/50 hover:bg-white dark:hover:bg-slate-800 border border-black/5 dark:border-white/10 transition-all">
                                <ThemeToggle />
                            </div>

                            {/* Sync Status */}
                            <div className="hidden sm:flex items-center justify-center gap-2 px-3 h-10 rounded-xl bg-white/50 dark:bg-slate-800/50 border border-black/5 dark:border-white/10">
                                <div className={`w-2 h-2 rounded-full ${isSyncing ? 'bg-indigo-500 animate-pulse' : (pendingCount > 0 ? 'bg-amber-500' : 'bg-emerald-500')}`}></div>
                                <span className="hidden md:inline text-xs font-semibold text-slate-600 dark:text-slate-300">{pendingCount > 0 ? `${pendingCount} Pending` : 'Synced'}</span>
                            </div>

                            {/* Profile */}
                            <Link
                                to="/pengaturan"
                                className="flex items-center justify-center w-10 h-10 rounded-full transition-transform hover:scale-105 active:scale-95 ml-1 ring-2 ring-white dark:ring-slate-800 shadow-md"
                                aria-label="Settings"
                            >
                                <img
                                    className="w-full h-full rounded-full object-cover"
                                    src={user?.avatarUrl}
                                    alt="User avatar"
                                />
                            </Link>
                        </div>
                    </div>
                </header>

                <main className="flex-1 overflow-y-auto pb-20 lg:pb-6 px-4 lg:px-8 pt-6">
                    <div className="max-w-7xl mx-auto h-full">
                        <div key={location.pathname} className="animate-page-transition h-full">
                            {children}
                        </div>
                    </div>
                </main>

                {/* Bottom Navigation for Mobile */}
                <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-30 bg-white/90 dark:bg-slate-900/90 backdrop-blur-xl border-t border-slate-200/50 dark:border-slate-800/50 shadow-[0_-4px_20px_rgba(0,0,0,0.05)]">
                    <div className="w-full grid grid-cols-6 items-center justify-items-center h-16 px-2 safe-area-inset-bottom">
                        {mobileNavItems.map((item) => (
                            <NavLink
                                key={item.href}
                                to={item.href}
                                end={item.href === '/dashboard'}
                                onClick={() => playClick()}
                                className={({ isActive }) =>
                                    `flex flex-col items-center justify-center gap-1 w-full h-full rounded-xl transition-all duration-300 active:scale-95 ${isActive
                                        ? 'text-indigo-600 dark:text-indigo-400'
                                        : 'text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300'
                                    }`
                                }
                            >
                                {({ isActive }) => (
                                    <>
                                        <div className={`relative p-1.5 rounded-xl transition-all duration-300 ${isActive ? 'bg-indigo-50 dark:bg-indigo-500/10 -translate-y-1' : ''}`}>
                                            <item.icon className={`w-5 h-5 transition-transform ${isActive ? 'scale-110' : 'scale-100'}`} />
                                        </div>
                                        <span className={`text-[9px] leading-tight font-medium transition-all ${isActive ? 'font-bold opacity-100' : 'opacity-80'}`}>{item.label}</span>
                                    </>
                                )}
                            </NavLink>
                        ))}
                    </div>
                </nav>
            </div>

            <GlobalSearch isOpen={isSearchOpen} setIsOpen={setIsSearchOpen} />
        </div>
    );
};

export default Layout;