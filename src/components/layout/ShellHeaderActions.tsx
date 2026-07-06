import React from 'react';
import { Link } from 'react-router-dom';
import { HelpCircle } from 'lucide-react';
import ThemeToggle from '../ui/ThemeToggle';
import NotificationPanel from '../ui/NotificationPanel';
import { NetworkQualityIndicator, EnhancedSyncStatus } from '../ui/PerformanceIndicators';

interface ShellHeaderActionsProps {
    user: {
        avatarUrl?: string | null;
    } | null;
    onOpenTutorial?: () => void; // Keep for compatibility if needed, though we won't use it directly here
}

const ShellIconButton: React.FC<{ children: React.ReactNode }> = ({ children }) => (
    <div className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-xl border border-black/5 bg-white/50 transition-all hover:bg-white dark:border-white/10 dark:bg-slate-800/50 dark:hover:bg-slate-800">
        {children}
    </div>
);

export const ShellHeaderActions: React.FC<ShellHeaderActionsProps> = ({
    user,
}) => {
    return (
        <div className="ml-auto flex items-center gap-3">
            {/* Unified Help & Tutorial Button */}
            <button
                onClick={() => document.dispatchEvent(new CustomEvent('open-help-center'))}
                className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-xl border border-black/5 bg-white/50 transition-all hover:bg-white dark:border-white/10 dark:bg-slate-800/50 dark:hover:bg-slate-800 text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300"
                aria-label="Pusat Bantuan & Tutorial"
                title="Bantuan & Tutorial"
            >
                <HelpCircle className="w-5 h-5" />
            </button>

            <ShellIconButton>
                <ThemeToggle />
            </ShellIconButton>

            <div className="hidden md:block">
                <NetworkQualityIndicator size="sm" showLabel={true} />
            </div>

            <EnhancedSyncStatus showDetails={true} />

            <ShellIconButton>
                <NotificationPanel />
            </ShellIconButton>

            <Link
                to="/pengaturan"
                className="ml-1 flex h-11 w-11 items-center justify-center rounded-full ring-2 ring-white shadow-md transition-transform hover:scale-105 active:scale-95 dark:ring-slate-800 overflow-hidden shrink-0"
                aria-label="Settings"
            >
                <img
                    className="h-full w-full object-cover"
                    src={user?.avatarUrl || undefined}
                    alt="User avatar"
                />
            </Link>
        </div>
    );
};
