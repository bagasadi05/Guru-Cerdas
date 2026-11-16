import React from 'react';
import { Link } from 'react-router-dom';
import { HelpCircle, Eye } from 'lucide-react';
import ThemeToggle from '../ui/ThemeToggle';
import NotificationPanel from '../ui/NotificationPanel';
import { NetworkQualityIndicator, EnhancedSyncStatus } from '../ui/PerformanceIndicators';
import { useAccessibility } from '../ui/AccessibilityFeatures';

interface ShellHeaderActionsProps {
    user: {
        name?: string | null;
        avatarUrl?: string | null;
    } | null;
    onOpenTutorial?: () => void; // Keep for compatibility if needed, though we won't use it directly here
}

export const ShellHeaderActions: React.FC<ShellHeaderActionsProps> = ({
    user,
}) => {
    const { isEasyMode, toggleEasyMode } = useAccessibility();
    const userInitial = (user?.name?.trim()?.[0] || 'G').toUpperCase();

    return (
        <div className="ml-auto flex items-center gap-1.5 sm:gap-3">
            {/* Easy Mode Toggle */}
            <button type="button"
                onClick={toggleEasyMode}
                className={`flex min-h-[44px] items-center justify-center gap-2 px-3 rounded-xl border transition-all ${
                    isEasyMode 
                    ? 'bg-emerald-100 border-emerald-300 text-emerald-800 dark:bg-emerald-900/50 dark:border-emerald-700/50 dark:text-emerald-300' 
                    : 'border-black/5 bg-white/50 text-slate-600 hover:bg-white dark:border-white/10 dark:bg-slate-800/50 dark:text-slate-300 dark:hover:bg-slate-800'
                }`}
                aria-label={isEasyMode ? "Nonaktifkan Mode Mudah" : "Aktifkan Mode Mudah"}
                aria-pressed={isEasyMode}
                title={isEasyMode ? 'Nonaktifkan Mode Mudah' : 'Aktifkan Mode Mudah'}
            >
                <Eye className="w-5 h-5" />
                {/* The pressed state is already carried by the colour and
                    aria-pressed, so the label stays short — it has to fit a
                    375px header once Easy Mode reveals every label. */}
                <span className="text-sm font-medium hidden sm:block">
                    Mode Mudah
                </span>
            </button>

            {/* Unified Help & Tutorial Button */}
            <button type="button"
                onClick={() => document.dispatchEvent(new CustomEvent('open-help-center'))}
                className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-xl border border-black/5 bg-white/50 transition-all hover:bg-white dark:border-white/10 dark:bg-slate-800/50 dark:hover:bg-slate-800 text-brand-600 dark:text-brand-400 hover:text-brand-700 dark:hover:text-brand-300"
                aria-label="Pusat Bantuan & Tutorial"
                title="Bantuan & Tutorial"
            >
                <HelpCircle className="w-5 h-5" />
            </button>

            <ThemeToggle />

            <div className="hidden xl:block">
                <NetworkQualityIndicator size="sm" showLabel={true} />
            </div>

            <EnhancedSyncStatus showDetails={true} />

            <NotificationPanel />

            <Link
                to="/pengaturan"
                className="hidden sm:flex lg:hidden ml-1 h-11 w-11 items-center justify-center rounded-full ring-2 ring-white shadow-md transition-transform hover:scale-105 active:scale-95 dark:ring-slate-800 overflow-hidden shrink-0 bg-emerald-600 text-white font-bold text-sm"
                aria-label="Pengaturan"
            >
                {user?.avatarUrl ? (
                    <img
                        className="h-full w-full object-cover"
                        src={user.avatarUrl}
                        alt={user.name || 'Avatar pengguna'}
                    />
                ) : (
                    <span aria-hidden="true">{userInitial}</span>
                )}
            </Link>
        </div>
    );
};
