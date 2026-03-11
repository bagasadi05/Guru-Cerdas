import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { GraduationCapIcon, LogoutIcon } from '../Icons';
import { useAuth } from '../../hooks/useAuth';
import { useSound } from '../../hooks/useSound';
import { getDashboardNavSections } from './dashboardMenuConfig';

interface DashboardSidebarProps {
  isAdmin: boolean;
  onLinkClick?: () => void;
}

const DashboardSidebar: React.FC<DashboardSidebarProps> = ({ isAdmin, onLinkClick }) => {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const { playClick } = useSound();
  const navSections = getDashboardNavSections(isAdmin);

  const handleLogout = async () => {
    if (onLinkClick) {
      onLinkClick();
    }
    await logout();
    navigate('/', { replace: true });
  };

  return (
    <aside className="relative w-72 h-full flex-shrink-0 font-sans">
      <div className="h-full m-4 rounded-3xl bg-white/95 dark:bg-slate-900/90 backdrop-blur-xl border border-slate-200 dark:border-white/10 shadow-2xl flex flex-col overflow-hidden relative">
        <div className="absolute top-0 left-0 w-full h-64 bg-gradient-to-b from-indigo-500/10 dark:from-indigo-500/20 to-transparent opacity-50 pointer-events-none"></div>
        <div className="absolute bottom-0 right-0 w-64 h-64 bg-purple-500/5 dark:bg-purple-500/10 rounded-full blur-3xl pointer-events-none"></div>

        <div className="relative z-10 flex flex-col h-full p-5">
          <div className="flex items-center gap-4 px-2 mb-8 mt-2">
            <div className="relative group">
              <div className="absolute inset-0 bg-indigo-600 blur-lg opacity-40 group-hover:opacity-60 transition-opacity duration-500"></div>
              <div className="relative w-12 h-12 bg-gradient-to-br from-indigo-600 to-purple-700 rounded-xl flex items-center justify-center shadow-lg border border-white/20 group-hover:scale-105 transition-transform duration-300">
                <GraduationCapIcon className="w-7 h-7 text-white drop-shadow-md" />
              </div>
            </div>
            <div>
              <h1 className="text-lg font-bold tracking-wide text-slate-800 dark:text-white uppercase font-serif">
                Portal Guru
              </h1>
              <p className="text-[10px] font-medium text-indigo-600 dark:text-indigo-300 tracking-[0.2em] uppercase opacity-80">
                Ecosystem
              </p>
            </div>
          </div>

          <div className="mb-6 p-1 rounded-2xl bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/5 relative overflow-hidden group">
            <div className="absolute inset-0 bg-gradient-to-r from-indigo-500/5 dark:from-indigo-500/10 to-purple-500/5 dark:to-purple-500/10 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
            <div className="flex items-center gap-3 p-3 relative z-10">
              <div className="relative">
                <div className="absolute inset-0 bg-indigo-600 rounded-full blur-sm opacity-50"></div>
                <img
                  className="relative h-10 w-10 rounded-full object-cover border-2 border-white dark:border-white/20 shadow-md"
                  src={user?.avatarUrl}
                  alt="User avatar"
                />
              </div>
              <div className="overflow-hidden">
                <p className="font-semibold text-sm text-slate-800 dark:text-white truncate">
                  {user?.name}
                </p>
                <p className="text-[10px] text-slate-500 dark:text-slate-400 truncate">
                  {user?.email}
                </p>
              </div>
            </div>
          </div>

          <nav
            id="navigation"
            className="flex-1 space-y-5 overflow-y-auto scrollbar-hide pr-1"
            aria-label="Main navigation"
          >
            {navSections.map((section, sectionIndex) => (
              <div
                key={section.id}
                className={
                  sectionIndex === 0 ? '' : 'pt-4 border-t border-slate-200/70 dark:border-white/5'
                }
              >
                <p className="px-4 pb-2 text-[9px] font-medium uppercase tracking-[0.18em] text-slate-500/80 dark:text-slate-500/70">
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
                        `relative flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-300 group overflow-hidden focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/60 focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:focus-visible:ring-offset-slate-900 ${
                          isActive
                            ? 'text-white shadow-lg shadow-indigo-600/20'
                            : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/5'
                        }`
                      }
                    >
                      {({ isActive }) => (
                        <>
                          {isActive && (
                            <div className="absolute inset-0 bg-gradient-to-r from-indigo-600 to-purple-700 z-0"></div>
                          )}
                          {isActive && (
                            <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-white/50 rounded-r-full blur-[1px]"></div>
                          )}
                          <item.icon
                            className={`w-5 h-5 relative z-10 transition-transform duration-300 ${isActive ? 'scale-110 text-white' : 'group-hover:scale-110 group-hover:text-indigo-600 dark:group-hover:text-indigo-400'}`}
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

export default DashboardSidebar;
