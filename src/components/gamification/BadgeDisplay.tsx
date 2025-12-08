import React from 'react';
import { Badge, BADGES } from '../../services/gamificationService';

interface BadgeDisplayProps {
    earnedBadges: Badge[];
    showAll?: boolean;
    size?: 'sm' | 'md' | 'lg';
}

export const BadgeDisplay: React.FC<BadgeDisplayProps> = ({
    earnedBadges,
    showAll = false,
    size = 'md',
}) => {
    const displayBadges = showAll ? BADGES : earnedBadges;
    const earnedIds = new Set(earnedBadges.map(b => b.id));

    const sizeClasses = {
        sm: 'w-10 h-10 text-lg',
        md: 'w-14 h-14 text-2xl',
        lg: 'w-20 h-20 text-4xl',
    };

    const badgeSize = sizeClasses[size];

    if (displayBadges.length === 0 && !showAll) {
        return (
            <div className="text-center py-4 text-slate-400 text-sm">
                Belum ada badge. Terus semangat! 💪
            </div>
        );
    }

    return (
        <div className="flex flex-wrap gap-3 justify-center">
            {displayBadges.map(badge => {
                const isEarned = earnedIds.has(badge.id);

                return (
                    <div
                        key={badge.id}
                        className={`
                            group relative flex flex-col items-center
                            ${!isEarned && showAll ? 'opacity-30 grayscale' : ''}
                        `}
                    >
                        {/* Badge Icon */}
                        <div
                            className={`
                                ${badgeSize} rounded-full flex items-center justify-center
                                ${isEarned
                                    ? `bg-gradient-to-br ${badge.color} shadow-lg`
                                    : 'bg-slate-200 dark:bg-slate-700'
                                }
                                transition-all duration-300 group-hover:scale-110
                                ${isEarned ? 'animate-pulse-subtle' : ''}
                            `}
                        >
                            <span className="drop-shadow-md">{badge.emoji}</span>
                        </div>

                        {/* Badge Name */}
                        <span className={`
                            mt-1.5 text-xs font-medium text-center
                            ${isEarned ? 'text-slate-700 dark:text-slate-200' : 'text-slate-400'}
                        `}>
                            {badge.name}
                        </span>

                        {/* Tooltip */}
                        <div className="absolute bottom-full mb-2 px-3 py-2 bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-xs rounded-lg shadow-xl opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap z-10">
                            <p className="font-semibold">{badge.name}</p>
                            <p className="mt-0.5 text-slate-300 dark:text-slate-600">{badge.description}</p>
                            <p className="mt-1 text-amber-400 dark:text-amber-600">+{badge.points} poin</p>
                            <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-slate-900 dark:border-t-white" />
                        </div>
                    </div>
                );
            })}
        </div>
    );
};

// Compact badge list for leaderboard
export const BadgeIcons: React.FC<{ badges: Badge[] }> = ({ badges }) => {
    if (badges.length === 0) return null;

    return (
        <div className="flex -space-x-1">
            {badges.slice(0, 3).map(badge => (
                <span
                    key={badge.id}
                    className="w-6 h-6 rounded-full bg-gradient-to-br flex items-center justify-center text-xs shadow-sm"
                    style={{ background: `linear-gradient(to bottom right, var(--tw-gradient-stops))` }}
                    title={badge.name}
                >
                    {badge.emoji}
                </span>
            ))}
            {badges.length > 3 && (
                <span className="w-6 h-6 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center text-[10px] font-bold text-slate-500">
                    +{badges.length - 3}
                </span>
            )}
        </div>
    );
};

export default BadgeDisplay;
