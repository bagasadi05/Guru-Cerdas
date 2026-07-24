/**
 * @fileoverview Dashboard Greeting Header Component
 *
 * Displays a time-aware greeting, online/offline status,
 * live clock, and current date.  Uses `useClock` so only this
 * small component re-renders each second.
 *
 * @module components/dashboard/DashboardGreeting
 */

import React from 'react';
import { useClock } from '../../hooks/useClock';
import { useI18n } from '../../utils/i18n';
import { useAuth } from '../../hooks/useAuth';
import { getHonorificTitle } from '../../utils/greetingUtils';

interface DashboardGreetingProps {
  userName?: string;
  isOnline: boolean;
  randomQuote: string;
  isSidebarOpen: boolean;
  onToggleSidebar: () => void;
}

const GREETING_CONFIG = [
  { minHour: 4, maxHour: 11, greetingKey: 'greetingMorning' as const, icon: '🌅' },
  { minHour: 11, maxHour: 15, greetingKey: 'greetingAfternoon' as const, icon: '☀️' },
  { minHour: 15, maxHour: 19, greetingKey: 'greetingEvening' as const, icon: '🌇' },
] as const;

function getGreetingConfig(hour: number) {
  const match = GREETING_CONFIG.find(c => hour >= c.minHour && hour < c.maxHour);
  if (match) return match;
  // Night: 19:00 – 03:59
  return { greetingKey: 'greetingNight' as const, icon: '🌙' };
}

const DashboardGreeting: React.FC<DashboardGreetingProps> = ({
  userName,
  isOnline,
  randomQuote,
  isSidebarOpen,
  onToggleSidebar,
}) => {
  const currentTime = useClock();
  const { t, language } = useI18n();
  const { user, userRole } = useAuth();
  const hour = currentTime.getHours();
  const { greetingKey, icon } = getGreetingConfig(hour);
  const greeting = t.dashboard[greetingKey];
  
  let roleLabel = 'Guru';
  if (userRole === 'kepala_madrasah') roleLabel = 'Kepala Madrasah';
  else if (userRole === 'waka_kesiswaan') roleLabel = 'Waka Kesiswaan';
  else if (userRole === 'admin') roleLabel = 'Admin';
  else if (userRole === 'student') roleLabel = 'Siswa';

  const firstName = (userName && userName !== 'Guru') ? userName.split(' ')[0] : roleLabel;
  const honorific = getHonorificTitle(userName, user?.gender, user?.title, userRole);
  const displayName = honorific ? `${honorific} ${firstName}` : firstName;
  const locale = language === 'id' ? 'id-ID' : 'en-US';

  return (
    <header className="bg-gradient-to-br from-indigo-100/90 via-purple-100/60 to-pink-100/60 dark:from-indigo-950/40 dark:via-purple-950/20 dark:to-pink-950/20 backdrop-blur-xl border border-indigo-200/50 dark:border-slate-800/60 p-4 sm:p-6 md:p-7 rounded-3xl shadow-[0_8px_30px_rgb(79,70,229,0.08)] dark:shadow-indigo-500/5 flex flex-col md:flex-row md:items-center justify-between gap-4 sm:gap-5 animate-scale-in relative overflow-hidden">
      {/* Decorative background blur element */}
      <div className="absolute -top-20 -right-20 w-64 h-64 bg-indigo-400/20 dark:bg-indigo-500/10 rounded-full blur-3xl pointer-events-none"></div>
      
      <div className="flex items-center gap-3 sm:gap-4 relative z-10 min-w-0">
        <span className="text-3xl sm:text-4xl filter drop-shadow-md animate-bounce select-none shrink-0">{icon}</span>
        <div className="min-w-0 flex-1">
          <h1 className="text-lg sm:text-2xl md:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight leading-snug">
            {greeting}, <span className="text-indigo-600 dark:text-indigo-400">{displayName}</span>! 🌟
          </h1>
          <p className="text-xs sm:text-sm font-medium text-slate-500 dark:text-indigo-200/70 mt-1 italic leading-relaxed">
            &ldquo;{randomQuote}&rdquo;
          </p>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2 sm:gap-2.5 relative z-10 pt-2.5 md:pt-0 border-t md:border-t-0 border-slate-200/40 dark:border-slate-800/40">
        {/* Online / Offline badge */}
        <div className={`flex items-center gap-1.5 font-bold text-xs px-2.5 py-1 sm:px-3 sm:py-1.5 rounded-xl border shadow-sm transition-all duration-300 ${
          isOnline
            ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-200/20 shadow-emerald-500/5'
            : 'bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-200/20 shadow-amber-500/5 animate-pulse'
        }`}>
          <span className={`w-2 h-2 rounded-full shrink-0 ${
            isOnline ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.6)]' : 'bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.6)] animate-ping'
          }`} />
          <span>{isOnline ? t.dashboard.cloudSyncActive : t.dashboard.modeOffline}</span>
        </div>

        {/* Date */}
        <div className="flex items-center gap-1.5 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 font-bold text-xs px-2.5 py-1 sm:px-3 sm:py-1.5 rounded-xl border border-emerald-200/20 shadow-sm">
          📅 <span>{currentTime.toLocaleDateString(locale, { day: 'numeric', month: 'short' })}</span>
             <span className="hidden sm:inline">{currentTime.toLocaleDateString(locale, { year: 'numeric' })}</span>
        </div>

        {/* Live clock */}
        <div className="flex items-center gap-1.5 bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 font-mono font-bold text-xs sm:text-sm px-2.5 py-1 sm:px-3 sm:py-1.5 rounded-xl border border-indigo-200/20 shadow-sm tracking-wider">
          ⏰ {currentTime.toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit', second: '2-digit' }).replace(/\./g, ':')}
        </div>

        {/* Sidebar toggle (XL only) */}
        <button type="button"
          onClick={onToggleSidebar}
          className="hidden lg:flex items-center gap-2 bg-white/40 dark:bg-slate-900/40 border border-slate-200/40 dark:border-slate-800/40 hover:bg-slate-50 dark:hover:bg-slate-800/50 rounded-2xl text-xs font-extrabold text-slate-700 dark:text-indigo-200 px-3.5 py-1.5 shadow-sm transition-all hover:scale-[1.02] active:scale-[0.98]"
        >
          {isSidebarOpen ? t.dashboard.hidePanel : t.dashboard.showPanel}
        </button>
      </div>
    </header>
  );
};

export default DashboardGreeting;
