/**
 * @fileoverview Dashboard Greeting Header Component
 *
 * Displays a time-aware greeting, online/offline status,
 * live clock, and current date.  Uses `useClock` so only this
 * small component re-renders each second.
 *
 * @module components/dashboard/DashboardGreeting
 */

import React, { useState, useMemo } from 'react';
import {
  CloudSun,
  Sun,
  Sunset,
  MoonStar,
  Calendar,
  Clock,
  Sparkles,
  RefreshCw,
} from 'lucide-react';
import { useClock } from '../../hooks/useClock';
import { useI18n } from '../../utils/i18n';
import { useAuth } from '../../hooks/useAuth';
import { getHonorificTitle } from '../../utils/greetingUtils';

interface DashboardGreetingProps {
  userName?: string;
  isOnline: boolean;
  randomQuote?: string;
}

type DayPhase = 'morning' | 'afternoon' | 'evening' | 'night';

/**
 * Rich multi-layered SVG illustration for Morning (Pagi):
 * Warm rising golden sun with rays + soft white morning cloud.
 */
const MorningSceneSvg: React.FC<{ className?: string }> = ({ className = 'w-9 h-9' }) => (
  <svg viewBox="0 0 48 48" fill="none" className={className} aria-hidden="true">
    {/* Sun rays */}
    <path
      d="M22 7V10M11.4 11.4L13.5 13.5M7 22H10M32.6 11.4L30.5 13.5"
      stroke="#FEF08A"
      strokeWidth="2.5"
      strokeLinecap="round"
    />
    {/* Warm rising sun */}
    <circle cx="22" cy="22" r="9" fill="#FDE047" />
    <circle cx="22" cy="22" r="6.5" fill="#FFFBEB" fillOpacity="0.65" />
    {/* Soft morning cloud in foreground */}
    <path
      d="M17 35H35.5C38.5376 35 41 32.5376 41 29.5C41 26.6455 38.8235 24.2994 36.038 24.0266C35.2998 19.4767 31.3563 16 26.6 16C21.2981 16 17 20.2981 17 25.6C17 25.7999 17.0061 25.9984 17.0181 26.1951C14.7495 26.6341 13 28.6285 13 31.02C13 33.2181 14.7819 35 17 35Z"
      fill="#FFFFFF"
    />
    {/* Subtle golden horizon line */}
    <path d="M10 39H38" stroke="#FEF08A" strokeWidth="2.2" strokeLinecap="round" strokeOpacity="0.85" />
  </svg>
);

/**
 * Rich multi-layered SVG illustration for Afternoon (Siang):
 * Radiant full sun with 8 warm beams + crisp sky cloud.
 */
const AfternoonSceneSvg: React.FC<{ className?: string }> = ({ className = 'w-9 h-9' }) => (
  <svg viewBox="0 0 48 48" fill="none" className={className} aria-hidden="true">
    {/* 8 Sunbeams */}
    <path
      d="M21 6V9.5M21 32.5V36M6 21H9.5M32.5 21H36M10.4 10.4L12.9 12.9M29.1 29.1L31.6 31.6M31.6 10.4L29.1 12.9M12.9 29.1L10.4 31.6"
      stroke="#FEF08A"
      strokeWidth="2.5"
      strokeLinecap="round"
    />
    {/* Radiant Sun Core */}
    <circle cx="21" cy="21" r="9.5" fill="#FACC15" />
    <circle cx="21" cy="21" r="6.5" fill="#FEF9C3" />
    {/* Crisp Afternoon Cloud */}
    <path
      d="M24 38H37.5C40.2614 38 42.5 35.7614 42.5 33C42.5 30.3914 40.5019 28.2496 37.951 28.0205C37.2899 24.0419 33.8359 21 29.65 21C25.0108 21 21.25 24.7608 21.25 29.4C21.25 29.5665 21.2548 29.7319 21.2644 29.896C19.3996 30.2966 18 31.9547 18 33.95C18 36.1868 19.8132 38 22.05 38H24Z"
      fill="#FFFFFF"
    />
  </svg>
);

/**
 * Rich multi-layered SVG illustration for Evening (Sore):
 * Glowing golden-rose sunset sinking into the horizon with twilight clouds.
 */
const EveningSceneSvg: React.FC<{ className?: string }> = ({ className = 'w-9 h-9' }) => (
  <svg viewBox="0 0 48 48" fill="none" className={className} aria-hidden="true">
    {/* Sunset Rays */}
    <path
      d="M24 9V12.5M12.7 13.7L15.2 16.2M35.3 13.7L32.8 16.2M8 25H11.5M36.5 25H40"
      stroke="#FDE047"
      strokeWidth="2.5"
      strokeLinecap="round"
    />
    {/* Setting Sun Half-Dome */}
    <path d="M13 29C13 22.9249 17.9249 18 24 18C30.0751 18 35 22.9249 35 29H13Z" fill="#FDE047" />
    <path d="M16.5 29C16.5 24.8579 19.8579 21.5 24 21.5C28.1421 21.5 31.5 24.8579 31.5 29H16.5Z" fill="#FFFBEB" fillOpacity="0.6" />
    {/* Twilight Horizon Waves */}
    <path d="M7 29H41" stroke="#FFFFFF" strokeWidth="2.5" strokeLinecap="round" />
    <path d="M11 34H37" stroke="#FDE047" strokeWidth="2.2" strokeLinecap="round" strokeOpacity="0.9" />
    <path d="M16 38.5H32" stroke="#FDE047" strokeWidth="2" strokeLinecap="round" strokeOpacity="0.65" />
  </svg>
);

/**
 * Rich multi-layered SVG illustration for Night (Malam):
 * Glowing golden crescent moon + twinkling stars + soft night cloud.
 */
const NightSceneSvg: React.FC<{ className?: string }> = ({ className = 'w-9 h-9' }) => (
  <svg viewBox="0 0 48 48" fill="none" className={className} aria-hidden="true">
    {/* Twinkling Stars */}
    <path
      d="M35 10L36.1 12.4L38.5 13.5L36.1 14.6L35 17L33.9 14.6L31.5 13.5L33.9 12.4L35 10Z"
      fill="#FDE047"
    />
    <path
      d="M13 11L13.7 12.5L15.2 13.2L13.7 13.9L13 15.4L12.3 13.9L10.8 13.2L12.3 12.5L13 11Z"
      fill="#FEF08A"
    />
    <circle cx="38" cy="23" r="1.5" fill="#FEF08A" />
    {/* Glowing Crescent Moon */}
    <path
      d="M27.8 12.2C25.2 14.3 23.6 17.5 23.6 21.1C23.6 27.4 28.7 32.5 35 32.5C36.2 32.5 37.3 32.3 38.4 31.9C36.2 35.6 32.1 38 27.5 38C20.5 38 14.8 32.3 14.8 25.3C14.8 18.8 19.7 13.4 26 12.7C26.6 12.6 27.3 12.4 27.8 12.2Z"
      fill="#FDE047"
    />
    {/* Soft Night Cloud */}
    <path
      d="M14 39H28.5C31.2614 39 33.5 36.7614 33.5 34C33.5 31.3914 31.5019 29.2496 28.951 29.0205C28.2899 25.0419 24.8359 22 20.65 22C16.0108 22 12.25 25.7608 12.25 30.4C12.25 30.5665 12.2548 30.7319 12.2644 30.896C10.3996 31.2966 9 32.9547 9 34.95C9 37.1868 10.8132 39 13.05 39H14Z"
      fill="#FFFFFF"
      fillOpacity="0.92"
    />
  </svg>
);

const FRESH_QUOTES_BY_PHASE: Record<DayPhase, string[]> = {
  morning: [
    'Langkah kecil di kelas pagi ini adalah awal dari mimpi besar yang sedang Anda tumbuhkan.',
    'Senyum dan sapaan hangat Anda di pintu kelas adalah energi terbaik bagi siswa hari ini.',
    'Setiap jam pelajaran baru adalah halaman kosong untuk menanamkan ilmu, adab, dan harapan.',
    'Awali hari dengan niat tulus; setiap peluh mengajar hari ini bernilai amal jariyah yang tak terputus.',
    'Kelas yang hidup berawal dari guru yang hadir dengan hati penuh semangat. Selamat berkarya hari ini!',
  ],
  afternoon: [
    'Di tengah padatnya jam mengajar, kesabaran Anda adalah teladan paling nyata bagi para siswa.',
    'Jangan lelah menyemai kebaikan; benih ilmu yang Anda tanam siang ini kelak berbuah manis pada waktunya.',
    'Satu penjelasan sabar dari Anda hari ini bisa menjadi titik balik yang mencerahkan masa depan seorang anak.',
    'Tetap jaga ritme dan senyum terbaik Anda, energi positif guru menular ke seluruh penjuru kelas.',
    'Mengajar di siang hari butuh energi ekstra, terima kasih telah tetap sabar dan berdedikasi tinggi.',
  ],
  evening: [
    'Terima kasih telah hadir sepenuh hati hari ini. Setiap ilmu yang tersampaikan adalah jejak kebaikan abadi.',
    'Hari yang produktif! Luangkan sejenak untuk bersyukur atas tumbuh kembang siswa yang Anda dampingi hari ini.',
    'Lelah mengajar hari ini akan luruh menjadi berkah. Terima kasih atas dedikasi tanpa batas Anda.',
    'Setiap catatan nilai dan perkembangan yang Anda rapikan sore ini adalah wujud kepedulian nyata pada siswa.',
  ],
  night: [
    'Waktunya mengistirahatkan pikiran. Esok hari ada cerita dan inspirasi baru yang siap Anda bagikan kembali.',
    'Terima kasih atas pengabdian hari ini. Semoga malam Anda tenang dan penuh keberkahan bersama keluarga.',
    'Persiapan terbaik untuk mengajar esok hari dimulai dari istirahat yang berkualitas malam ini.',
    'Tenangkan hati dan pikiran malam ini; Anda telah memberikan yang terbaik bagi generasi masa depan.',
  ],
};

const PHASE_META: Record<
  DayPhase,
  {
    id: DayPhase;
    label: string;
    greetingKey: 'greetingMorning' | 'greetingAfternoon' | 'greetingEvening' | 'greetingNight';
    SceneIcon: React.FC<{ className?: string }>;
    SmallIcon: React.FC<{ className?: string }>;
    badgeBg: string;
  }
> = {
  morning: {
    id: 'morning',
    label: 'Pagi',
    greetingKey: 'greetingMorning',
    SceneIcon: MorningSceneSvg,
    SmallIcon: CloudSun,
    badgeBg: 'bg-gradient-to-br from-emerald-500 via-teal-500 to-brand-600 shadow-md shadow-emerald-500/20 ring-1 ring-white/20',
  },
  afternoon: {
    id: 'afternoon',
    label: 'Siang',
    greetingKey: 'greetingAfternoon',
    SceneIcon: AfternoonSceneSvg,
    SmallIcon: Sun,
    badgeBg: 'bg-gradient-to-br from-brand-400 via-brand-500 to-sky-600 shadow-md shadow-brand-500/20 ring-1 ring-white/20',
  },
  evening: {
    id: 'evening',
    label: 'Sore',
    greetingKey: 'greetingEvening',
    SceneIcon: EveningSceneSvg,
    SmallIcon: Sunset,
    badgeBg: 'bg-gradient-to-br from-brand-600 via-indigo-500 to-violet-600 shadow-md shadow-indigo-500/20 ring-1 ring-white/20',
  },
  night: {
    id: 'night',
    label: 'Malam',
    greetingKey: 'greetingNight',
    SceneIcon: NightSceneSvg,
    SmallIcon: MoonStar,
    badgeBg: 'bg-gradient-to-br from-slate-800 via-indigo-900 to-brand-950 shadow-md shadow-indigo-950/40 ring-1 ring-brand-400/30',
  },
};

const PHASE_ORDER: DayPhase[] = ['morning', 'afternoon', 'evening', 'night'];

function getDayPhase(hour: number): DayPhase {
  if (hour >= 4 && hour < 11) return 'morning';
  if (hour >= 11 && hour < 15) return 'afternoon';
  if (hour >= 15 && hour < 19) return 'evening';
  return 'night';
}

const DashboardGreeting: React.FC<DashboardGreetingProps> = ({
  userName,
  isOnline,
}) => {
  const currentTime = useClock();
  const { t, language } = useI18n();
  const { user, userRole } = useAuth();
  const hour = currentTime.getHours();
  const currentPhase = getDayPhase(hour);
  const meta = PHASE_META[currentPhase];
  const greeting = t.dashboard[meta.greetingKey];

  const [quoteOffset, setQuoteOffset] = useState(0);

  const activeQuote = useMemo(() => {
    const pool = FRESH_QUOTES_BY_PHASE[currentPhase];
    const baseIndex = new Date().getDate() % pool.length;
    return pool[(baseIndex + quoteOffset) % pool.length];
  }, [currentPhase, quoteOffset]);

  let roleLabel = 'Guru';
  if (userRole === 'kepala_madrasah') roleLabel = 'Kepala Madrasah';
  else if (userRole === 'waka_kesiswaan') roleLabel = 'Waka Kesiswaan';
  else if (userRole === 'waka_kurikulum') roleLabel = 'Waka Kurikulum';
  else if (userRole === 'admin') roleLabel = 'Admin';
  else if (userRole === 'student') roleLabel = 'Siswa';

  const firstName = (userName && userName !== 'Guru') ? userName.split(' ')[0] : roleLabel;
  const honorific = getHonorificTitle(userName, user?.gender, user?.title, userRole);
  const displayName = honorific ? `${honorific} ${firstName}` : firstName;
  const locale = language === 'id' ? 'id-ID' : 'en-US';

  const SceneIcon = meta.SceneIcon;

  return (
    <header className="bg-gradient-to-br from-brand-50/60 via-white to-emerald-50/40 dark:from-slate-900 dark:via-slate-900 dark:to-brand-950/35 border border-slate-200/80 dark:border-slate-800 p-4 sm:p-6 rounded-2xl shadow-sm flex flex-col gap-4 animate-scale-in relative overflow-hidden transition-colors duration-300">
      {/* Top Gradient Accent Bar matching the app's Emerald & Laguna Brand palette */}
      <div className="absolute top-0 inset-x-0 h-1.5 bg-gradient-to-r from-emerald-500 via-brand-500 to-teal-400" />

      {/* Top Row: Scene Illustration + Greeting Title + Time-of-Day Phase Strip & Status Pills */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 relative z-10">
        <div className="flex items-start sm:items-center gap-3.5 sm:gap-4 min-w-0">
          {/* Expressive Sky Scene Squircle Illustration */}
          <div className={`w-14 h-14 sm:w-16 sm:h-16 rounded-2xl flex items-center justify-center shrink-0 ${meta.badgeBg} transition-transform duration-300 hover:scale-105`}>
            <SceneIcon className="w-9 h-9 sm:w-10 sm:h-10" />
          </div>

          <div className="min-w-0 flex-1">
            {/* Time-of-Day Phase Strip (Pagi • Siang • Sore • Malam) */}
            <div className="inline-flex items-center gap-1 p-1 rounded-xl bg-slate-100 dark:bg-slate-850 border border-slate-200/80 dark:border-slate-800 mb-2">
              {PHASE_ORDER.map((phaseKey) => {
                const p = PHASE_META[phaseKey];
                const isActive = phaseKey === currentPhase;
                const PhaseSmallIcon = p.SmallIcon;
                return (
                  <span
                    key={phaseKey}
                    className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-lg text-[11px] font-bold transition-all select-none ${
                      isActive
                        ? 'bg-emerald-600 dark:bg-emerald-500 text-white shadow-xs'
                        : 'text-slate-500 dark:text-slate-400'
                    }`}
                    title={`Waktu ${p.label}`}
                  >
                    <PhaseSmallIcon className="w-3.5 h-3.5 shrink-0" />
                    <span className={isActive ? 'inline' : 'hidden sm:inline'}>{p.label}</span>
                  </span>
                );
              })}
            </div>

            <h1 className="text-xl sm:text-2xl md:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight leading-snug">
              {greeting}, <span className="text-brand-600 dark:text-brand-400">{displayName}</span>
            </h1>
          </div>
        </div>

        {/* Right Status Pills: Online/Offline + Date + Live Clock */}
        <div className="flex flex-wrap items-center gap-2 sm:gap-2.5 shrink-0 pt-2 lg:pt-0 border-t lg:border-t-0 border-slate-200/60 dark:border-slate-800/60">
          {/* Online / Offline badge */}
          <div className={`flex items-center gap-1.5 font-bold text-xs px-3 py-1.5 rounded-xl border transition-all duration-300 ${
            isOnline
              ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-200/70 dark:border-emerald-800/50'
              : 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border-amber-200/70 dark:border-amber-800/50 animate-pulse'
          }`}>
            <span className={`w-2 h-2 rounded-full shrink-0 ${
              isOnline ? 'bg-emerald-500 ring-2 ring-emerald-400/40' : 'bg-amber-500 ring-2 ring-amber-400/40 animate-ping'
            }`} />
            <span>{isOnline ? t.dashboard.cloudSyncActive : t.dashboard.modeOffline}</span>
          </div>

          {/* Date */}
          <div className="flex items-center gap-1.5 bg-slate-50 dark:bg-slate-850 text-slate-700 dark:text-slate-200 font-bold text-xs px-3 py-1.5 rounded-xl border border-slate-200/80 dark:border-slate-800 shadow-2xs">
            <Calendar className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
            <span>{currentTime.toLocaleDateString(locale, { day: 'numeric', month: 'short' })}</span>
            <span className="hidden sm:inline">{currentTime.toLocaleDateString(locale, { year: 'numeric' })}</span>
          </div>

          {/* Live clock */}
          <div className="flex items-center gap-1.5 bg-brand-50/80 dark:bg-brand-950/40 text-brand-700 dark:text-brand-300 font-mono font-bold text-xs sm:text-sm px-3 py-1.5 rounded-xl border border-brand-200/60 dark:border-brand-800/50 shadow-2xs tracking-wider">
            <Clock className="w-3.5 h-3.5 text-brand-600 dark:text-brand-400 shrink-0" />
            <span>{currentTime.toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit', second: '2-digit' }).replace(/\./g, ':')}</span>
          </div>
        </div>
      </div>

      {/* Bottom Motivational Quote Banner harmonized with Slate + Brand/Emerald */}
      <div className="flex items-center justify-between gap-3 px-3.5 py-2.5 rounded-xl bg-slate-50/90 dark:bg-slate-850/90 border border-slate-200/80 dark:border-slate-800 text-slate-700 dark:text-slate-200 relative z-10">
        <div className="flex items-start sm:items-center gap-2.5 min-w-0">
          <div className="w-7 h-7 rounded-lg bg-emerald-500/15 dark:bg-emerald-500/20 border border-emerald-500/25 flex items-center justify-center shrink-0 mt-0.5 sm:mt-0">
            <Sparkles className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
          </div>
          <p className="text-xs sm:text-sm font-medium text-slate-700 dark:text-slate-200 leading-relaxed">
            &ldquo;{activeQuote}&rdquo;
          </p>
        </div>

        <button
          type="button"
          onClick={() => setQuoteOffset((prev) => prev + 1)}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[11px] font-bold bg-white hover:bg-brand-50/60 dark:bg-slate-900 dark:hover:bg-slate-800 text-slate-700 hover:text-brand-600 dark:text-slate-200 dark:hover:text-brand-400 border border-slate-200/80 dark:border-slate-700/80 hover:border-brand-500/40 transition-all cursor-pointer active:scale-95 shrink-0 shadow-2xs"
          title="Ganti kalimat penyemangat"
          aria-label="Ganti kalimat penyemangat"
        >
          <RefreshCw className="w-3 h-3 text-brand-600 dark:text-brand-400" />
          <span className="hidden sm:inline">Penyemangat Baru</span>
        </button>
      </div>
    </header>
  );
};

export default DashboardGreeting;
