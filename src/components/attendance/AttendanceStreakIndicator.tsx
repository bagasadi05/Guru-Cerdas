/**
 * Attendance Streak Indicator
 * 
 * Shows students' attendance streaks (consecutive days present)
 */

import React from 'react';
import { Flame, TrendingUp, Award } from 'lucide-react';

interface StreakData {
    studentId: string;
    studentName: string;
    currentStreak: number;
    longestStreak: number;
    attendanceRate: number;
}

interface AttendanceStreakIndicatorProps {
    streaks: StreakData[];
    onStudentClick?: (studentId: string) => void;
}

export const AttendanceStreakIndicator: React.FC<AttendanceStreakIndicatorProps> = ({
    streaks,
    onStudentClick,
}) => {
    // Sort by current streak (highest first)
    const topStreaks = [...streaks]
        .filter(s => s.currentStreak > 0)
        .sort((a, b) => b.currentStreak - a.currentStreak)
        .slice(0, 5);

    if (topStreaks.length === 0) {
        return null;
    }

    const getStreakColor = (streak: number) => {
        if (streak >= 30) return 'from-yellow-500 to-orange-500';
        if (streak >= 14) return 'from-purple-500 to-pink-500';
        if (streak >= 7) return 'from-blue-500 to-indigo-500';
        return 'from-emerald-500 to-teal-500';
    };

    const getStreakEmoji = (streak: number) => {
        if (streak >= 30) return '🏆';
        if (streak >= 14) return '⭐';
        if (streak >= 7) return '🔥';
        return '✨';
    };

    return (
        <div className="bg-gradient-to-br from-orange-50 to-amber-50 dark:from-orange-900/20 dark:to-amber-900/20 rounded-2xl p-4 border border-orange-200 dark:border-orange-700/50 shadow-sm">
            <div className="flex items-center gap-2 mb-3">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-orange-500 to-amber-500 flex items-center justify-center shadow-lg shadow-orange-500/30">
                    <Flame className="w-5 h-5 text-white" />
                </div>
                <div>
                    <h3 className="font-bold text-gray-900 dark:text-white">Achievement Streak</h3>
                    <p className="text-xs text-gray-600 dark:text-gray-400">Top kehadiran berturut-turut</p>
                </div>
            </div>

            <div className="space-y-2">
                {topStreaks.map((streak, index) => (
                    <div
                        key={streak.studentId}
                        onClick={() => onStudentClick?.(streak.studentId)}
                        className="group flex items-center gap-3 p-3 bg-white dark:bg-gray-800 rounded-xl hover:shadow-md transition-all cursor-pointer border border-gray-100 dark:border-gray-700"
                    >
                        {/* Rank Badge */}
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-sm ${index === 0 ? 'bg-gradient-to-br from-yellow-400 to-yellow-600 text-white shadow-lg shadow-yellow-500/30' :
                                index === 1 ? 'bg-gradient-to-br from-gray-300 to-gray-500 text-white shadow-lg shadow-gray-400/30' :
                                    index === 2 ? 'bg-gradient-to-br from-orange-400 to-orange-600 text-white shadow-lg shadow-orange-500/30' :
                                        'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400'
                            }`}>
                            {index + 1}
                        </div>

                        {/* Student Info */}
                        <div className="flex-1 min-w-0">
                            <p className="font-semibold text-sm text-gray-900 dark:text-white truncate">
                                {streak.studentName}
                            </p>
                            <div className="flex items-center gap-2 mt-0.5">
                                <span className="text-xs text-gray-500 dark:text-gray-400">
                                    {streak.attendanceRate.toFixed(0)}% kehadiran
                                </span>
                            </div>
                        </div>

                        {/* Streak Count */}
                        <div className="flex items-center gap-2">
                            <div className={`px-3 py-1.5 rounded-full bg-gradient-to-r ${getStreakColor(streak.currentStreak)} shadow-lg flex items-center gap-1.5`}>
                                <span className="text-lg">{getStreakEmoji(streak.currentStreak)}</span>
                                <span className="font-bold text-white text-sm">
                                    {streak.currentStreak}
                                </span>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {/* Legend */}
            <div className="mt-3 pt-3 border-t border-orange-200 dark:border-orange-700/50">
                <div className="flex flex-wrap items-center gap-2 text-xs text-gray-600 dark:text-gray-400">
                    <div className="flex items-center gap-1">
                        <span>🔥</span>
                        <span>7+ hari</span>
                    </div>
                    <span>•</span>
                    <div className="flex items-center gap-1">
                        <span>⭐</span>
                        <span>14+ hari</span>
                    </div>
                    <span>•</span>
                    <div className="flex items-center gap-1">
                        <span>🏆</span>
                        <span>30+ hari</span>
                    </div>
                </div>
            </div>
        </div>
    );
};
