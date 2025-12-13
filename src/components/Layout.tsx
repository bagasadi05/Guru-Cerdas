import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Link, NavLink, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { HomeIcon, UsersIcon, CalendarIcon, ClipboardIcon, LogoutIcon, SettingsIcon, GraduationCapIcon, SearchIcon, CheckSquareIcon, BrainCircuitIcon, ClipboardPenIcon, MoreHorizontalIcon } from './Icons';
import { Trash2, History, BarChart3 } from 'lucide-react';
import ThemeToggle from './ui/ThemeToggle';
import { Button } from './ui/Button';
import GreetingRobot from './GreetingRobot';
import { useSound } from '../hooks/useSound';
import { NotificationCenter, useNotifications } from './ui/NotificationCenter';
import { useOnboarding } from './ui/OnboardingTour';
import { SearchTrigger } from './SearchSystem';
import { SyncStatusIndicator } from './StatusIndicators';
import { SkipLinks } from './ui/AccessibilityFeatures';
import { KeyboardShortcutsPanel } from './ui/KeyboardShortcuts';
import { NetworkQualityIndicator, EnhancedSyncStatus, UploadProgressIndicator } from './ui/PerformanceIndicators';
import { useParentMessageNotifications } from '../hooks/useParentMessageNotifications';
import PullToRefresh from './ui/PullToRefresh';
import { useQueryClient } from '@tanstack/react-query';

const navItems = [
    { href: '/dashboard', label: 'Beranda', icon: HomeIcon },
    { href: '/absensi', label: 'Rekap Absensi', icon: ClipboardIcon },
    { href: '/siswa', label: 'Data Siswa', icon: UsersIcon },
    { href: '/jadwal', label: 'Jadwal Pelajaran', icon: CalendarIcon },
    { href: '/tugas', label: 'Manajemen Tugas', icon: CheckSquareIcon },
    { href: '/analytics', label: 'Analytics', icon: BarChart3 },
    { href: '/input-massal', label: 'Input Nilai Cepat', icon: ClipboardPenIcon },
    { href: '/sampah', label: 'Sampah', icon: Trash2 },
    { href: '/riwayat', label: 'Riwayat Aksi', icon: History },
    { href: '/pengaturan', label: 'Pengaturan Sistem', icon: SettingsIcon },
];

// Main 4 items for mobile bottom nav (reduced from 6 for better UX)
const mobileNavItems = [
    { href: '/dashboard', label: 'Beranda', icon: HomeIcon },
    { href: '/absensi', label: 'Absensi', icon: ClipboardIcon },
    { href: '/jadwal', label: 'Jadwal', icon: CalendarIcon },
    { href: '/tugas', label: 'Tugas', icon: CheckSquareIcon },
];

// Items in the "More" menu
const moreMenuItems = [
    { href: '/siswa', label: 'Data Siswa', icon: UsersIcon },
    { href: '/input-massal', label: 'Input Nilai Cepat', icon: ClipboardPenIcon },
    { href: '/sampah', label: 'Sampah', icon: Trash2 },
    { href: '/riwayat', label: 'Riwayat Aksi', icon: History },
    { href: '/pengaturan', label: 'Pengaturan', icon: SettingsIcon },
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
            {/* Floating Glass Container - Light/Dark Mode Support */}
            <div className="h-full m-4 rounded-3xl bg-white/95 dark:bg-slate-900/90 backdrop-blur-xl border border-slate-200 dark:border-white/10 shadow-2xl flex flex-col overflow-hidden relative">

                {/* Ambient Background Effects */}
                <div className="absolute top-0 left-0 w-full h-64 bg-gradient-to-b from-indigo-500/10 dark:from-indigo-500/20 to-transparent opacity-50 pointer-events-none"></div>
                <div className="absolute bottom-0 right-0 w-64 h-64 bg-purple-500/5 dark:bg-purple-500/10 rounded-full blur-3xl pointer-events-none"></div>

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
                            <h1 className="text-lg font-bold tracking-wide text-slate-800 dark:text-white uppercase font-serif">
                                Portal Guru
                            </h1>
                            <p className="text-[10px] font-medium text-indigo-600 dark:text-indigo-200 tracking-[0.2em] uppercase opacity-80">Ecosystem</p>
                        </div>
                    </div>

                    {/* Profile Card */}
                    <div className="mb-6 p-1 rounded-2xl bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/5 relative overflow-hidden group">
                        <div className="absolute inset-0 bg-gradient-to-r from-indigo-500/5 dark:from-indigo-500/10 to-purple-500/5 dark:to-purple-500/10 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                        <div className="flex items-center gap-3 p-3 relative z-10">
                            <div className="relative">
                                <div className="absolute inset-0 bg-indigo-500 rounded-full blur-sm opacity-50"></div>
                                <img
                                    className="relative h-10 w-10 rounded-full object-cover border-2 border-white dark:border-white/20 shadow-md"
                                    src={user?.avatarUrl}
                                    alt="User avatar"
                                />
                            </div>
                            <div className="overflow-hidden">
                                <p className="font-semibold text-sm text-slate-800 dark:text-white truncate">{user?.name}</p>
                                <p className="text-[10px] text-slate-500 dark:text-slate-400 truncate">{user?.email}</p>
                            </div>
                        </div>
                    </div>

                    {/* Navigation */}
                    <nav id="navigation" className="flex-1 space-y-1 overflow-y-auto scrollbar-hide pr-1" aria-label="Main navigation">
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
                                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/5'
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
                                        <item.icon className={`w-5 h-5 relative z-10 transition-transform duration-300 ${isActive ? 'scale-110 text-white' : 'group-hover:scale-110 group-hover:text-indigo-600 dark:group-hover:text-indigo-300'}`} />
                                        <span className={`relative z-10 text-sm tracking-wide ${isActive ? 'font-semibold' : 'font-medium'}`}>{item.label}</span>
                                    </>
                                )}
                            </NavLink>
                        ))}
                    </nav>

                    {/* Logout */}
                    <div className="mt-auto pt-4 border-t border-slate-200 dark:border-white/5">
                        <button
                            onClick={handleLogout}
                            className="flex items-center w-full gap-3 px-4 py-3 text-slate-500 dark:text-slate-400 rounded-xl hover:bg-red-50 dark:hover:bg-red-500/10 hover:text-red-600 dark:hover:text-red-400 transition-all duration-300 group"
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
    const navigate = useNavigate();
    const { playClick } = useSound();
    const { notifications, markAsRead, markAllAsRead, deleteNotification, clearAll } = useNotifications();
    const { showTour, endTour } = useOnboarding();

    // Listen for real-time parent messages and show notifications
    useParentMessageNotifications();

    // Pull-to-refresh handler
    const queryClient = useQueryClient();
    const handleRefresh = useCallback(async () => {
        await queryClient.invalidateQueries();
    }, [queryClient]);

    const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
    const [isMobile, setIsMobile] = useState(false);
    const [isMoreMenuOpen, setIsMoreMenuOpen] = useState(false);
    const [showGreeting, setShowGreeting] = useState(() => {
        if (typeof sessionStorage !== 'undefined') {
            return !sessionStorage.getItem('greeted');
        }
        return false;
    });

    // Track screen size for mobile navbar visibility
    useEffect(() => {
        const checkMobile = () => {
            setIsMobile(window.innerWidth < 1024);
        };
        checkMobile();
        window.addEventListener('resize', checkMobile);
        return () => window.removeEventListener('resize', checkMobile);
    }, []);



    // Ensure proper mobile navbar behavior (only needed for < lg breakpoint)
    useEffect(() => {
        const handleResize = () => {
            const navbar = document.querySelector('.mobile-bottom-nav') as HTMLElement;
            if (navbar) {
                // Only show on mobile (< 1024px)
                if (window.innerWidth >= 1024) {
                    navbar.style.setProperty('display', 'none', 'important');
                } else {
                    navbar.style.setProperty('display', 'block', 'important');
                }
            }
        };

        // Run immediately
        handleResize();

        // Run after a short delay to ensure DOM is ready
        const timer = setTimeout(handleResize, 100);

        window.addEventListener('resize', handleResize);
        window.addEventListener('orientationchange', handleResize);

        return () => {
            clearTimeout(timer);
            window.removeEventListener('resize', handleResize);
            window.removeEventListener('orientationchange', handleResize);
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
            {/* Accessibility: Skip Links */}
            <SkipLinks />

            {/* Keyboard Shortcuts Panel */}
            <KeyboardShortcutsPanel />

            {/* Background Gradients */}
            <div className="fixed inset-0 z-0 pointer-events-none">
                <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-indigo-500/5 rounded-full blur-[100px]"></div>
                <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-purple-500/5 rounded-full blur-[100px]"></div>
            </div>

            {showGreeting && user && (
                <GreetingRobot userName={user.name} onAnimationEnd={handleGreetingEnd} />
            )}

            {/* Onboarding Tour managed globally via TourProvider */}

            {/* Mobile sidebar overlay */}
            {isMobileSidebarOpen && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-40 lg:hidden" onClick={() => setIsMobileSidebarOpen(false)} />
            )}

            {/* Desktop sidebar - hidden on mobile */}
            <div className={`fixed lg:static inset-y-0 left-0 z-50 transform transition-transform duration-300 lg:translate-x-0 ${isMobileSidebarOpen ? 'translate-x-0' : '-translate-x-full'}`} id="navigation" role="navigation" aria-label="Main navigation">
                <Sidebar onLinkClick={() => setIsMobileSidebarOpen(false)} />
            </div>

            <div className="flex flex-col flex-1 w-full overflow-hidden relative z-10">
                {/* Header */}
                <header className="h-16 lg:h-20 flex items-center justify-between px-4 lg:px-8 sticky top-0 z-20 transition-all duration-300" role="banner">
                    <div className="absolute inset-0 bg-white/70 dark:bg-slate-900/70 backdrop-blur-xl border-b border-white/20 dark:border-white/5 shadow-sm"></div>

                    <div className="relative z-10 flex items-center gap-4 w-full">
                        {/* Mobile menu button */}
                        <button
                            onClick={() => setIsMobileSidebarOpen(true)}
                            className="lg:hidden flex items-center justify-center w-10 h-10 rounded-xl bg-white/50 dark:bg-slate-800/50 hover:bg-white dark:hover:bg-slate-800 transition-all active:scale-95 border border-black/5 dark:border-white/10"
                            aria-label="Open menu"
                            aria-expanded={isMobileSidebarOpen}
                            aria-controls="navigation"
                        >
                            <svg className="w-5 h-5 text-slate-700 dark:text-slate-200" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                            </svg>
                        </button>

                        {/* Search button */}
                        <div id="search">
                            <SearchTrigger className="hidden sm:flex" />
                        </div>

                        {/* Mobile search icon */}
                        <div className="sm:hidden">
                            <SearchTrigger className="!w-10 !h-10 !p-0 justify-center" />
                        </div>

                        <div className="flex items-center gap-3 ml-auto">
                            {/* Theme Toggle */}
                            <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-white/50 dark:bg-slate-800/50 hover:bg-white dark:hover:bg-slate-800 border border-black/5 dark:border-white/10 transition-all">
                                <ThemeToggle />
                            </div>

                            {/* Network Quality Indicator - Desktop only */}
                            <div className="hidden md:block">
                                <NetworkQualityIndicator size="sm" showLabel={true} />
                            </div>

                            {/* Enhanced Sync Status */}
                            <EnhancedSyncStatus showDetails={true} />

                            {/* Notification Center */}
                            <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-white/50 dark:bg-slate-800/50 hover:bg-white dark:hover:bg-slate-800 border border-black/5 dark:border-white/10 transition-all">
                                <NotificationCenter
                                    notifications={notifications}
                                    onMarkAsRead={markAsRead}
                                    onMarkAllAsRead={markAllAsRead}
                                    onDelete={deleteNotification}
                                    onClearAll={clearAll}
                                />
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

                <main id="main-content" className="flex-1 overflow-hidden" role="main">
                    <PullToRefresh
                        onRefresh={handleRefresh}
                        className="h-full pb-20 lg:pb-6 px-4 lg:px-8 pt-4 lg:pt-6"
                    >
                        <div className="max-w-7xl mx-auto h-full">
                            <div key={location.pathname} className="animate-page-transition h-full">
                                {children}
                            </div>
                        </div>
                    </PullToRefresh>
                </main>

                {/* Bottom Navigation for Mobile Only - Improved UX */}
                {isMobile && (
                    <>
                        {/* More Menu Backdrop */}
                        {isMoreMenuOpen && (
                            <div
                                className="fixed inset-0 z-40 bg-black/30 backdrop-blur-sm"
                                onClick={() => setIsMoreMenuOpen(false)}
                            />
                        )}

                        {/* More Menu */}
                        {isMoreMenuOpen && (
                            <div className="fixed bottom-20 right-4 z-50 animate-fade-in-up">
                                <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700 overflow-hidden min-w-[220px]">
                                    {moreMenuItems.map((item, index) => (
                                        <button
                                            key={item.href}
                                            onClick={() => {
                                                playClick();
                                                navigate(item.href);
                                                setIsMoreMenuOpen(false);
                                            }}
                                            className={`flex items-center gap-3 w-full px-4 py-3.5 text-left hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors ${index !== moreMenuItems.length - 1 ? 'border-b border-slate-100 dark:border-slate-800' : ''
                                                }`}
                                            style={{ minHeight: '48px' }}
                                        >
                                            <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center flex-shrink-0">
                                                <item.icon className="w-5 h-5 text-slate-600 dark:text-slate-400" />
                                            </div>
                                            <span className="font-medium text-slate-700 dark:text-slate-300">{item.label}</span>
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Bottom Navigation Bar */}
                        <nav className="mobile-bottom-nav fixed bottom-0 left-0 right-0 z-30 bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl border-t border-slate-200/50 dark:border-slate-800/50 shadow-[0_-4px_20px_rgba(0,0,0,0.08)]">
                            <div className="w-full grid grid-cols-5 items-center justify-items-center px-2 safe-area-inset-bottom" style={{ height: '68px' }}>
                                {mobileNavItems.map((item) => (
                                    <NavLink
                                        key={item.href}
                                        to={item.href}
                                        end={item.href === '/dashboard'}
                                        onClick={() => {
                                            playClick();
                                            setIsMoreMenuOpen(false);
                                        }}
                                        className={({ isActive }) =>
                                            `flex flex-col items-center justify-center gap-1 w-full h-full rounded-xl transition-all duration-300 active:scale-95 touch-manipulation ${isActive
                                                ? 'text-indigo-600 dark:text-indigo-400'
                                                : 'text-slate-400 dark:text-slate-500'
                                            }`
                                        }
                                        style={{ minWidth: '48px', minHeight: '48px' }}
                                    >
                                        {({ isActive }) => (
                                            <>
                                                <div className={`relative p-2 rounded-xl transition-all duration-300 ${isActive ? 'bg-indigo-50 dark:bg-indigo-500/15 -translate-y-0.5' : ''}`}>
                                                    <item.icon className={`w-6 h-6 transition-transform ${isActive ? 'scale-105' : 'scale-100'}`} />
                                                </div>
                                                <span className={`text-[10px] leading-tight transition-all ${isActive ? 'font-bold opacity-100' : 'font-medium opacity-70'}`}>{item.label}</span>
                                            </>
                                        )}
                                    </NavLink>
                                ))}

                                {/* More Button */}
                                <button
                                    onClick={() => {
                                        playClick();
                                        setIsMoreMenuOpen(!isMoreMenuOpen);
                                    }}
                                    className={`flex flex-col items-center justify-center gap-1 w-full h-full rounded-xl transition-all duration-300 active:scale-95 touch-manipulation ${isMoreMenuOpen
                                        ? 'text-indigo-600 dark:text-indigo-400'
                                        : 'text-slate-400 dark:text-slate-500'
                                        }`}
                                    style={{ minWidth: '48px', minHeight: '48px' }}
                                    aria-label="More options"
                                    aria-expanded={isMoreMenuOpen}
                                >
                                    <div className={`relative p-2 rounded-xl transition-all duration-300 ${isMoreMenuOpen ? 'bg-indigo-50 dark:bg-indigo-500/15 -translate-y-0.5' : ''}`}>
                                        <MoreHorizontalIcon className={`w-6 h-6 transition-transform ${isMoreMenuOpen ? 'scale-105' : 'scale-100'}`} />
                                    </div>
                                    <span className={`text-[10px] leading-tight transition-all ${isMoreMenuOpen ? 'font-bold opacity-100' : 'font-medium opacity-70'}`}>Lainnya</span>
                                </button>
                            </div>
                        </nav>
                    </>
                )}
            </div>

            {/* Upload Progress Indicator - Floating */}
            <UploadProgressIndicator />

        </div>
    );
};

export default Layout;