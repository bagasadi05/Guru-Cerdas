import React, { useState, useMemo } from 'react';
import { TrophyIcon, MedalIcon, ChevronDownIcon, ChevronUpIcon } from 'lucide-react';
import { generateLeaderboard, StudentGameData } from '../../services/gamificationService';
import { BadgeIcons } from './BadgeDisplay';
import { Link } from 'react-router-dom';

interface LeaderboardCardProps {
    studentsData: StudentGameData[];
    classes: { id: string; name: string }[];
    defaultOpen?: boolean;
}

export const LeaderboardCard: React.FC<LeaderboardCardProps> = ({
    studentsData,
    classes,
    defaultOpen = false,
}) => {
    const [selectedClass, setSelectedClass] = useState<string>('');
    const [limit, setLimit] = useState(5);
    const [isOpen, setIsOpen] = useState(defaultOpen);

    const leaderboard = useMemo(() => {
        return generateLeaderboard(studentsData, selectedClass || undefined).slice(0, limit);
    }, [studentsData, selectedClass, limit]);

    const getRankStyle = (rank: number) => {
        switch (rank) {
            case 1:
                return 'bg-gradient-to-r from-yellow-400 to-amber-500 text-white';
            case 2:
                return 'bg-gradient-to-r from-slate-300 to-slate-400 text-white';
            case 3:
                return 'bg-gradient-to-r from-amber-600 to-orange-700 text-white';
            default:
                return 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400';
        }
    };

    const getRankIcon = (rank: number) => {
        if (rank === 1) return <TrophyIcon className="w-4 h-4" />;
        if (rank <= 3) return <MedalIcon className="w-4 h-4" />;
        return rank;
    };

    if (studentsData.length === 0) {
        return null;
    }

    return (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
            {/* Header */}
            <div className="p-4 border-b border-slate-100 dark:border-slate-800 bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-900/20 dark:to-orange-900/20">
                <div className="flex items-center justify-between">
                    <button
                        onClick={() => setIsOpen(!isOpen)}
                        className="flex items-center gap-2 hover:opacity-80 transition-opacity"
                    >
                        <TrophyIcon className="w-5 h-5 text-amber-500" />
                        <h3 className="font-bold text-slate-900 dark:text-white">Papan Peringkat</h3>
                        {isOpen ? <ChevronUpIcon className="w-4 h-4 text-slate-500" /> : <ChevronDownIcon className="w-4 h-4 text-slate-500" />}
                    </button>

                    {/* Class Filter - Only show if open */}
                    {isOpen && (
                        <div className="relative">
                            <select
                                value={selectedClass}
                                onChange={(e) => setSelectedClass(e.target.value)}
                                className="appearance-none pl-3 pr-8 py-1.5 text-xs font-medium bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
                            >
                                <option value="">Semua Kelas</option>
                                {classes.map(c => (
                                    <option key={c.id} value={c.id}>{c.name}</option>
                                ))}
                            </select>
                            <ChevronDownIcon className="w-4 h-4 absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                        </div>
                    )}
                </div>
            </div>

            {/* Leaderboard List */}
            {isOpen && (
                <>
                    <div className="divide-y divide-slate-100 dark:divide-slate-800">
                        {leaderboard.map((entry) => (
                            <Link
                                key={entry.studentId}
                                to={`/siswa/${entry.studentId}`}
                                className="flex items-center gap-3 p-3 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
                            >
                                {/* Rank */}
                                <div
                                    className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${getRankStyle(entry.rank)}`}
                                >
                                    {getRankIcon(entry.rank)}
                                </div>

                                {/* Student Info */}
                                <div className="flex-1 min-w-0">
                                    <p className="font-medium text-slate-900 dark:text-white truncate">
                                        {entry.studentName}
                                    </p>
                                    <p className="text-xs text-slate-500 truncate">{entry.className}</p>
                                </div>

                                {/* Badges */}
                                <BadgeIcons badges={entry.badges} />

                                {/* Points */}
                                <div className="text-right">
                                    <p className="font-bold text-amber-600 dark:text-amber-400">
                                        {entry.totalPoints}
                                    </p>
                                    <p className="text-[10px] text-slate-400">poin</p>
                                </div>
                            </Link>
                        ))}
                    </div>

                    {/* Show More */}
                    {leaderboard.length >= limit && (
                        <div className="p-3 border-t border-slate-100 dark:border-slate-800">
                            <button
                                onClick={() => setLimit(prev => prev + 5)}
                                className="w-full py-2 text-sm font-medium text-amber-600 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-900/20 rounded-lg transition-colors"
                            >
                                Tampilkan Lebih Banyak
                            </button>
                        </div>
                    )}
                </>
            )}
        </div>
    );
};

export default LeaderboardCard;
