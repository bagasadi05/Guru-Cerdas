import React, { useState, useRef, useEffect } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { HomeIcon, UsersIcon, CalendarIcon, ClipboardIcon, LogoutIcon, SettingsIcon, GraduationCapIcon, SearchIcon, CheckSquareIcon, BrainCircuitIcon, ClipboardPenIcon } from './Icons';
import ThemeToggle from './ui/ThemeToggle';
import GlobalSearch from './ui/GlobalSearch';
import { Button } from './ui/Button';
import { useSyncQueue } from '../hooks/useSyncQueue';
import GreetingRobot from './GreetingRobot';

const navItems = [
    { href: '/dashboard', label: 'Dashboard', icon: HomeIcon },
    { href: '/absensi', label: 'Absensi', icon: ClipboardIcon },
    { href: '/siswa', label: 'Siswa', icon: UsersIcon },
    { href: '/jadwal', label: 'Jadwal', icon: CalendarIcon },
    { href: '/tugas', label: 'Tugas', icon: CheckSquareIcon },
    { href: '/input-massal', label: 'Input Massal', icon: ClipboardPenIcon },
    { href: '/pengaturan', label: 'Pengaturan', icon: SettingsIcon },
];

const mobileNavItems = [
    { href: '/dashboard', label: 'Home', icon: HomeIcon },
    { href: '/absensi', label: 'Absensi', icon: ClipboardIcon },
    { href: '/jadwal', label: 'Jadwal', icon: CalendarIcon },
    { href: '/tugas', label: 'Tugas', icon: CheckSquareIcon },
    { href: '/siswa', label: 'Siswa', icon: UsersIcon },
    { href: '/input-massal', label: 'Input', icon: ClipboardPenIcon },
];

interface SidebarProps {
    onLinkClick?: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ onLinkClick }) => {
    const navigate = useNavigate();
    const { user, logout } = useAuth();

    const handleLogout = async () => {
        if (onLinkClick) {
            onLinkClick();
        }
        await logout();
        navigate('/', { replace: true });
    };

    return (
        <aside className="relative w-72 h-full flex-shrink-0 bg-[#0f172a] text-white overflow-hidden font-sans border-r border-white/5">
            {/* Rich Gradient Background */}
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-indigo-900/50 via-slate-900 to-slate-950 z-0"></div>

            {/* Decorative Orbs */}
            <div className="absolute -top-20 -left-20 w-64 h-64 bg-purple-600/30 rounded-full blur-3xl z-0"></div>
            <div className="absolute bottom-0 right-0 w-64 h-64 bg-indigo-600/20 rounded-full blur-3xl z-0"></div>

            <div className="relative z-10 flex flex-col h-full p-5">
                {/* Header */}
                <div className="flex items-center gap-4 px-2 mb-10 mt-2">
                    <div className="relative group">
                        <div className="absolute inset-0 bg-purple-500 blur-lg opacity-50 group-hover:opacity-75 transition-opacity"></div>
                        <div className="relative w-12 h-12 bg-gradient-to-br from-white/20 to-white/5 backdrop-blur-xl rounded-2xl border border-white/20 flex items-center justify-center shadow-inner">
                            <GraduationCapIcon className="w-7 h-7 text-white drop-shadow-md" />
                        </div>
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-white to-purple-200">
                            Guru Cerdas
                        </h1>
                        <p className="text-xs font-medium text-indigo-200/80 tracking-wide">Asisten Digital Anda</p>
                    </div>
                </div>

                {/* Profile Card */}
                <div className="mb-8 p-4 rounded-2xl bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-md border border-white/10 shadow-xl relative overflow-hidden group">
                    <div className="absolute inset-0 bg-gradient-to-r from-purple-500/10 to-indigo-500/10 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                    <div className="flex items-center gap-4 relative z-10">
                        <div className="relative">
                            <div className="absolute inset-0 bg-gradient-to-tr from-purple-500 to-indigo-500 rounded-full blur-sm opacity-70"></div>
                            <img
                                className="relative h-12 w-12 rounded-full object-cover border-2 border-white/20 shadow-md"
                                src={user?.avatarUrl}
                                alt="User avatar"
                            />
                        </div>
                        <div className="overflow-hidden">
                            <p className="font-bold text-base text-white truncate">{user?.name}</p>
                            <p className="text-xs text-indigo-200 truncate opacity-80">{user?.email}</p>
                        </div>
                    </div>
                </div>

                {/* Navigation */}
                <nav className="flex-1 space-y-1.5">
                    {navItems.map((item) => (
                        <NavLink
                            key={item.href}
                            to={item.href}
                            end={item.href === '/dashboard'}
                            onClick={onLinkClick}
                            className={({ isActive }) =>
                                `relative flex items-center gap-4 px-4 py-3.5 rounded-xl transition-all duration-300 group overflow-hidden ${isActive
                                    ? 'text-white shadow-lg shadow-purple-900/20'
                                    : 'text-slate-400 hover:text-white hover:bg-white/5'
                                }`
                            }
                        >
                            {({ isActive }) => (
                                <>
                                    {isActive && (
                                        <div className="absolute inset-0 bg-gradient-to-r from-purple-600 to-indigo-600 z-0"></div>
                                    )}
                                    <item.icon className={`w-5 h-5 relative z-10 transition-transform duration-300 ${isActive ? 'scale-110' : 'group-hover:scale-110'}`} />
                                    <span className={`relative z-10 font-medium tracking-wide ${isActive ? 'font-semibold' : ''}`}>{item.label}</span>
                                    {isActive && (
                                        <div className="absolute right-3 w-1.5 h-1.5 rounded-full bg-white shadow-glow animate-pulse z-10"></div>
                                    )}
                                </>
                            )}
                        </NavLink>
                    ))}
                </nav>

                {/* Logout */}
                <div className="mt-auto pt-6 border-t border-white/10">
                    <button
                        onClick={handleLogout}
                        className="flex items-center w-full gap-4 px-4 py-3.5 text-slate-400 rounded-xl hover:bg-red-500/10 hover:text-red-400 transition-all duration-300 group"
                    >
                        <LogoutIcon className="w-5 h-5 transition-transform group-hover:-translate-x-1" />
                        <span className="font-medium">Logout</span>
                    </button>
                </div>
            </div>
        </aside>
    );
};

const Layout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const { user } = useAuth();
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

    return (
        <div className="flex h-screen bg-gray-50 dark:bg-gray-950 overflow-hidden">
            {showGreeting && user && (
                <GreetingRobot userName={user.name} onAnimationEnd={handleGreetingEnd} />
            )}

            {/* Mobile sidebar overlay */}
            {isMobileSidebarOpen && (
                <div className="fixed inset-0 bg-black/50 z-40 lg:hidden" onClick={() => setIsMobileSidebarOpen(false)} />
            )}

            {/* Desktop sidebar - hidden on mobile */}
            <div className={`fixed lg:static inset-y-0 left-0 z-50 transform transition-transform duration-300 lg:translate-x-0 ${isMobileSidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
                <Sidebar onLinkClick={() => setIsMobileSidebarOpen(false)} />
            </div>

            <div className="flex flex-col flex-1 w-full overflow-hidden">
                {/* Mobile header with menu button */}
                <header className="h-16 bg-white/80 dark:bg-gray-950/70 backdrop-blur-md border-b border-gray-200/50 dark:border-gray-800/50 flex items-center justify-between px-4 sticky top-0 z-20">
                    {/* Mobile menu button */}
                    <button
                        onClick={() => setIsMobileSidebarOpen(true)}
                        className="lg:hidden flex items-center justify-center w-12 h-12 -ml-2 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors active:scale-95"
                        aria-label="Open menu"
                    >
                        <svg className="w-6 h-6 text-gray-700 dark:text-gray-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                        </svg>
                    </button>

                    {/* Search button - hidden on small mobile, shown on desktop */}
                    <Button
                        variant="outline"
                        onClick={() => setIsSearchOpen(true)}
                        className="hidden sm:flex items-center justify-center gap-2 h-10 px-4 text-gray-600 dark:text-gray-300"
                    >
                        <SearchIcon className="w-5 h-5" />
                        <span className="hidden md:inline text-sm font-medium">Cari Siswa...</span>
                    </Button>

                    {/* Mobile search icon */}
                    <button
                        onClick={() => setIsSearchOpen(true)}
                        className="sm:hidden flex items-center justify-center w-12 h-12 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors active:scale-95"
                        aria-label="Search"
                    >
                        <SearchIcon className="w-6 h-6 text-gray-700 dark:text-gray-200" />
                    </button>

                    <div className="flex items-center gap-1">
                        {/* Theme Toggle */}
                        <div className="flex items-center justify-center w-12 h-12">
                            <ThemeToggle />
                        </div>

                        {/* Sync Status - simplified on mobile */}
                        <div className="hidden sm:flex items-center justify-center gap-2 px-2 h-10">
                            <div className={`w-2 h-2 rounded-full ${isSyncing ? 'bg-blue-500 animate-pulse' : (pendingCount > 0 ? 'bg-yellow-500' : 'bg-green-500')}`}></div>
                            <span className="hidden md:inline text-sm font-medium text-gray-600 dark:text-gray-300">{pendingCount > 0 ? pendingCount : ''}</span>
                        </div>

                        {/* Profile - simplified on mobile */}
                        <Link
                            to="/pengaturan"
                            className="flex items-center justify-center w-12 h-12 rounded-full transition-transform hover:scale-105 active:scale-95 ml-1"
                            aria-label="Settings"
                        >
                            <img
                                className="w-10 h-10 rounded-full object-cover ring-2 ring-offset-2 ring-sky-500 dark:ring-purple-500 shadow-sm"
                                src={user?.avatarUrl}
                                alt="User avatar"
                            />
                        </Link>
                    </div>
                </header>

                <main className="flex-1 overflow-y-auto pb-16 lg:pb-0">
                    {children}
                </main>

                {/* Bottom Navigation for Mobile */}
                <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-30 bg-white/95 dark:bg-gray-900/95 backdrop-blur-xl border-t border-gray-200/50 dark:border-gray-800/50 shadow-[0_-2px_10px_rgba(0,0,0,0.05)]">
                    <div className="w-full grid grid-cols-6 items-center justify-items-center h-16 px-1 safe-area-inset-bottom">
                        {mobileNavItems.map((item) => (
                            <NavLink
                                key={item.href}
                                to={item.href}
                                end={item.href === '/dashboard'}
                                className={({ isActive }) =>
                                    `flex flex-col items-center justify-center gap-1 w-full h-full rounded-xl transition-all duration-200 active:scale-95 ${isActive
                                        ? 'text-sky-600 dark:text-purple-400'
                                        : 'text-gray-500 dark:text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
                                    }`
                                }
                            >
                                {({ isActive }) => (
                                    <>
                                        <item.icon className={`w-6 h-6 transition-transform ${isActive ? 'scale-110' : 'scale-100'}`} />
                                        <span className={`text-[9px] leading-tight font-medium ${isActive ? 'font-bold' : ''}`}>{item.label}</span>
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