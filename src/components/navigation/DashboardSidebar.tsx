import React, { useMemo, useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { LogoutIcon } from '../Icons';
import { useAuth } from '../../hooks/useAuth';
import { useSound } from '../../hooks/useSound';
import { getDashboardNavSections } from './dashboardMenuConfig';
import { useAccessibility } from '../ui/AccessibilityFeatures';

interface DashboardSidebarProps {
  isAdmin: boolean;
  isHomeroomTeacher: boolean;
  onLinkClick?: () => void;
}

const DashboardSidebar: React.FC<DashboardSidebarProps> = ({ isAdmin, isHomeroomTeacher, onLinkClick }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout, userRole } = useAuth();
  const { playClick } = useSound();
  const { isEasyMode } = useAccessibility();
  const navSections = getDashboardNavSections(isAdmin, userRole, isHomeroomTeacher, isEasyMode);
  const [showAllEasyMenu, setShowAllEasyMenu] = useState(false);

  const easyModePaths = useMemo(() => new Set([
    '/dashboard',
    '/input-massal',
    '/siswa',
    '/absensi',
  ]), []);

  const isOutsideEasyMenu = navSections.some((section) =>
    section.items.some((item) =>
      !easyModePaths.has(item.href) && (location.pathname === item.href || location.pathname.startsWith(`${item.href}/`)),
    ),
  );

  const displayedNavSections = useMemo(() => {
    if (!isEasyMode || showAllEasyMenu || isOutsideEasyMenu) {
      return navSections;
    }

    const primaryItems = navSections.flatMap((section) =>
      section.items.filter((item) => easyModePaths.has(item.href)),
    );

    return [{ id: 'easy-primary', label: 'Menu Utama', items: primaryItems }];
  }, [easyModePaths, isEasyMode, isOutsideEasyMenu, navSections, showAllEasyMenu]);

  const handleLogout = async () => {
    if (onLinkClick) {
      onLinkClick();
    }
    await logout();
    navigate('/', { replace: true });
  };

  const getRoleLabel = (role: string | null) => {
    switch (role) {
      case 'admin': return 'Administrator';
      case 'kepala_madrasah': return 'Kepala Madrasah';
      case 'waka_kesiswaan': return 'Waka Kesiswaan';
      case 'student': return 'Siswa';
      case 'parent': return 'Orang Tua';
      default: return 'Guru';
    }
  };

  return (
    <aside className="relative w-72 h-full flex-shrink-0 font-sans">
      <div className="h-full m-4 rounded-3xl bg-white/95 dark:bg-slate-900/90 backdrop-blur-xl border border-slate-200 dark:border-white/10 shadow-2xl flex flex-col overflow-hidden relative">
        <div className="absolute top-0 left-0 w-full h-64 bg-gradient-to-b from-emerald-500/10 dark:from-emerald-500/20 to-transparent opacity-50 pointer-events-none"></div>
        <div className="absolute bottom-0 right-0 w-64 h-64 bg-indigo-500/5 dark:bg-indigo-500/10 rounded-full blur-3xl pointer-events-none"></div>

        <div className="relative z-10 flex flex-col h-full p-5">
          <div className="flex items-center gap-4 px-2 mb-8 mt-2">
            <div className="relative group">
              <div className="absolute inset-0 bg-emerald-600 blur-lg opacity-20 group-hover:opacity-40 transition-opacity duration-500 rounded-full"></div>
              <img 
                src="/logo_sekolah.png" 
                alt="Logo MI Al Irsyad" 
                className="relative w-12 h-12 object-contain group-hover:scale-105 transition-transform duration-300 drop-shadow-md"
              />
            </div>
            <div>
              <h1 className="text-lg font-bold tracking-wide text-slate-800 dark:text-white uppercase font-serif">
                MI Al Irsyad
              </h1>
              <p className="text-xxs font-medium text-emerald-600 dark:text-emerald-400 tracking-[0.2em] uppercase opacity-80">
                KOTA MADIUN
              </p>
            </div>
          </div>

          <div className="mb-6 p-1 rounded-2xl bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/5 relative overflow-hidden group">
            <div className="absolute inset-0 bg-gradient-to-r from-emerald-500/5 dark:from-emerald-500/10 to-indigo-500/5 dark:to-indigo-500/10 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
            <div className="flex items-center gap-3 p-3 relative z-10">
              <div className="relative">
                <div className="absolute inset-0 bg-emerald-500 rounded-full blur-sm opacity-50"></div>
                <img
                  className="relative h-10 w-10 rounded-full object-cover border-2 border-white dark:border-white/20 shadow-md"
                  src={user?.avatarUrl}
                  alt="User avatar"
                />
              </div>
              <div className="overflow-hidden">
                <p className="font-semibold text-sm text-slate-800 dark:text-white truncate">
                  {user?.name === 'Guru' ? getRoleLabel(userRole) : user?.name}
                </p>
                <p className="text-xxs text-slate-500 dark:text-slate-400 truncate">
                  {getRoleLabel(userRole)} • {user?.email}
                </p>
              </div>
            </div>
          </div>

          <nav
            id="navigation"
            className="flex-1 space-y-5 overflow-y-auto scrollbar-hide pr-1"
            aria-label="Main navigation"
          >
            {displayedNavSections.map((section, sectionIndex) => (
              <div
                key={section.id}
                className={
                  sectionIndex === 0 ? '' : 'pt-4 border-t border-slate-200/70 dark:border-white/5'
                }
              >
                <p className="px-4 pb-2 text-xxs font-medium uppercase tracking-[0.18em] text-slate-500/80 dark:text-slate-500/70">
                  {section.label}
                </p>
                <div className="space-y-1">
                  {section.items.map((item) => (
                    <NavLink
                      key={item.href}
                      to={item.href}
                      end={item.href === '/dashboard'}
                      onClick={() => {
                        playClick();
                        if (onLinkClick) onLinkClick();
                      }}
                      className={({ isActive }) =>
                        `relative flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-300 group overflow-hidden focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/60 focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:focus-visible:ring-offset-slate-900 ${
                          isActive
                            ? 'text-white shadow-lg shadow-emerald-500/20'
                            : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/5'
                        }`
                      }
                    >
                      {({ isActive }) => (
                        <>
                          {isActive && (
                            <motion.div
                              layoutId="activeSidebarPill"
                              className="absolute inset-0 bg-gradient-to-r from-emerald-500 to-emerald-600 z-0"
                              transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                            />
                          )}
                          {isActive && (
                            <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-white/50 rounded-r-full blur-[1px]"></div>
                          )}
                          <item.icon
                            className={`w-5 h-5 relative z-10 transition-transform duration-300 ${isActive ? 'scale-110 text-white' : 'group-hover:scale-110 group-hover:text-emerald-600 dark:group-hover:text-emerald-400'}`}
                          />
                          <span
                            className={`relative z-10 text-sm tracking-wide ${isActive ? 'font-semibold' : 'font-medium'}`}
                          >
                            {item.label}
                          </span>
                        </>
                      )}
                    </NavLink>
                  ))}
                </div>
              </div>
            ))}
          </nav>

          {isEasyMode && (
            <button
              type="button"
              onClick={() => setShowAllEasyMenu((isOpen) => !isOpen)}
              disabled={isOutsideEasyMenu}
              className="mb-2 flex min-h-[48px] w-full items-center justify-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 text-sm font-semibold text-emerald-800 transition-colors hover:bg-emerald-100 disabled:cursor-default disabled:opacity-80 dark:border-emerald-800/60 dark:bg-emerald-950/30 dark:text-emerald-300 dark:hover:bg-emerald-900/40"
              aria-expanded={showAllEasyMenu || isOutsideEasyMenu}
            >
              {showAllEasyMenu || isOutsideEasyMenu ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              {isOutsideEasyMenu
                ? 'Menu lengkap untuk halaman ini'
                : showAllEasyMenu
                  ? 'Tampilkan menu utama'
                  : 'Tampilkan semua menu'}
            </button>
          )}

          <div className="mt-auto pt-4 border-t border-slate-200 dark:border-white/5">
            <button type="button"
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

export default DashboardSidebar;
