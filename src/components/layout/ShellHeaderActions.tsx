import React from 'react';
import { Link } from 'react-router-dom';
import { GraduationCap } from 'lucide-react';
import ThemeToggle from '../ui/ThemeToggle';
import NotificationPanel from '../ui/NotificationPanel';
import { NetworkQualityIndicator, EnhancedSyncStatus } from '../ui/PerformanceIndicators';

interface ShellHeaderActionsProps {
    user: {
        avatarUrl?: string | null;
    } | null;
    onOpenTutorial?: () => void;
}

const ShellIconButton: React.FC<{ children: React.ReactNode }> = ({ children }) => (
    <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-black/5 bg-white/50 transition-all hover:bg-white dark:border-white/10 dark:bg-slate-800/50 dark:hover:bg-slate-800">
        {children}
    </div>
);

export const ShellHeaderActions: React.FC<ShellHeaderActionsProps> = ({
    user,
    onOpenTutorial,
}) => {
    return (
        <div className="ml-auto flex items-center gap-3">
            {/* Tutorial Button */}
            {onOpenTutorial && (
                <button
                    onClick={onOpenTutorial}
                    className="flex h-10 w-10 items-center justify-center rounded-xl border border-black/5 bg-white/50 transition-all hover:bg-white dark:border-white/10 dark:bg-slate-800/50 dark:hover:bg-slate-800 text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300"
                    aria-label="Tutorial Menu"
                    title="Tutorial Menu"
                >
                    <GraduationCap className="w-5 h-5" />
                </button>
            )}

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
                className="ml-1 flex h-10 w-10 items-center justify-center rounded-full ring-2 ring-white shadow-md transition-transform hover:scale-105 active:scale-95 dark:ring-slate-800"
                aria-label="Settings"
            >
                <img
                    className="h-full w-full rounded-full object-cover"
                    src={user?.avatarUrl || undefined}
                    alt="User avatar"
                />
            </Link>
        </div>
    );
};
