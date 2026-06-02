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
  const hour = currentTime.getHours();
  const { greetingKey, icon } = getGreetingConfig(hour);
  const greeting = t.dashboard[greetingKey];
  const firstName = userName?.split(' ')[0] || 'Guru';
  const locale = language === 'id' ? 'id-ID' : 'en-US';

  return (
    <header className="bg-gradient-to-r from-indigo-500/10 via-purple-500/5 to-pink-500/5 dark:from-indigo-950/20 dark:via-purple-950/10 dark:to-pink-950/10 backdrop-blur-xl border border-white/20 dark:border-slate-800/40 p-6 rounded-3xl shadow-xl shadow-indigo-500/5 flex flex-col md:flex-row md:items-center justify-between gap-4 animate-scale-in">
      <div className="flex items-start gap-4">
        <span className="text-4xl filter drop-shadow-md animate-bounce select-none">{icon}</span>
        <div>
          <h1 className="text-2xl md:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
            {greeting}, {firstName}! 🌟
          </h1>
          <p className="text-xs sm:text-sm font-medium text-slate-500 dark:text-indigo-200/70 mt-1 italic">
            &ldquo;{randomQuote}&rdquo;
          </p>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3 self-start md:self-auto">
        {/* Online / Offline badge */}
        <div className={`flex items-center gap-1.5 font-extrabold text-xs px-3.5 py-1.5 rounded-2xl border shadow-sm transition-all duration-300 ${
          isOnline
            ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-200/20 shadow-emerald-500/5'
            : 'bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-200/20 shadow-amber-500/5 animate-pulse'
        }`}>
          <span className={`w-2 h-2 rounded-full shrink-0 ${
            isOnline ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.6)]' : 'bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.6)] animate-ping'
          }`} />
          <span>{isOnline ? t.dashboard.cloudSyncActive : t.dashboard.modeOffline}</span>
        </div>

        {/* Sidebar toggle (XL only) */}
        <button
          onClick={onToggleSidebar}
          className="hidden lg:flex items-center gap-2 bg-white/40 dark:bg-slate-900/40 border border-slate-200/40 dark:border-slate-800/40 hover:bg-slate-50 dark:hover:bg-slate-800/50 rounded-2xl text-xs font-black text-slate-700 dark:text-indigo-200 px-3.5 py-1.5 shadow-sm transition-all hover:scale-[1.02] active:scale-[0.98]"
        >
          {isSidebarOpen ? t.dashboard.hidePanel : t.dashboard.showPanel}
        </button>

        {/* Date */}
        <div className="flex items-center gap-1.5 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 font-extrabold text-xs px-3.5 py-1.5 rounded-2xl border border-emerald-200/20 shadow-sm">
          📅 {currentTime.toLocaleDateString(locale, { weekday: 'long', day: 'numeric', month: 'long' })}
        </div>

        {/* Live clock */}
        <div className="flex items-center gap-1.5 bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 font-mono font-black text-sm px-3.5 py-1.5 rounded-2xl border border-indigo-200/20 shadow-sm tracking-widest">
          ⏰ {currentTime.toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit', second: '2-digit' }).replace(/\./g, ':')}
        </div>
      </div>
    </header>
  );
};

export default DashboardGreeting;
