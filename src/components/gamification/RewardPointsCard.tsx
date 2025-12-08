import React from 'react';
import { StarIcon, TrendingUpIcon } from 'lucide-react';
import { Badge, calculateStudentPoints, StudentGameData } from '../../services/gamificationService';

interface RewardPointsCardProps {
    studentData: StudentGameData;
    earnedBadges: Badge[];
}

export const RewardPointsCard: React.FC<RewardPointsCardProps> = ({
    studentData,
    earnedBadges,
}) => {
    const basePoints = calculateStudentPoints(studentData);
    const badgePoints = earnedBadges.reduce((sum, b) => sum + b.points, 0);
    const totalPoints = basePoints + badgePoints;

    const pointBreakdown = [
        {
            label: 'Nilai Akademik',
            points: Math.max(0, Math.round((studentData.averageScore - 70) * 2)),
            color: 'text-blue-500',
            bgColor: 'bg-blue-50 dark:bg-blue-900/20',
        },
        {
            label: 'Kehadiran',
            points: Math.round((studentData.attendanceRate / 100) * 30),
            color: 'text-green-500',
            bgColor: 'bg-green-50 dark:bg-green-900/20',
        },
        {
            label: 'Quiz',
            points: studentData.quizPoints,
            color: 'text-purple-500',
            bgColor: 'bg-purple-50 dark:bg-purple-900/20',
        },
        {
            label: 'Badge',
            points: badgePoints,
            color: 'text-amber-500',
            bgColor: 'bg-amber-50 dark:bg-amber-900/20',
        },
    ];

    const penaltyPoints = studentData.violationCount * 5;

    return (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
            {/* Header with Total Points */}
            <div className="p-5 bg-gradient-to-br from-amber-400 via-orange-500 to-red-500 text-white">
                <div className="flex items-center justify-between">
                    <div>
                        <p className="text-amber-100 text-sm font-medium">Total Poin</p>
                        <p className="text-4xl font-black tracking-tight mt-1">{totalPoints}</p>
                    </div>
                    <div className="w-16 h-16 rounded-full bg-white/20 flex items-center justify-center">
                        <StarIcon className="w-10 h-10 text-white fill-white" />
                    </div>
                </div>

                {/* Progress to next level (example: every 100 points is a level) */}
                <div className="mt-4">
                    <div className="flex justify-between text-xs mb-1">
                        <span className="text-amber-100">Level {Math.floor(totalPoints / 100) + 1}</span>
                        <span className="text-amber-100">{totalPoints % 100}/100 ke level berikutnya</span>
                    </div>
                    <div className="h-2 bg-white/30 rounded-full overflow-hidden">
                        <div
                            className="h-full bg-white rounded-full transition-all duration-500"
                            style={{ width: `${totalPoints % 100}%` }}
                        />
                    </div>
                </div>
            </div>

            {/* Point Breakdown */}
            <div className="p-4 space-y-3">
                <h4 className="text-sm font-semibold text-slate-600 dark:text-slate-400 flex items-center gap-2">
                    <TrendingUpIcon className="w-4 h-4" />
                    Rincian Poin
                </h4>

                {pointBreakdown.map((item, index) => (
                    <div
                        key={index}
                        className={`flex items-center justify-between p-3 rounded-xl ${item.bgColor}`}
                    >
                        <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
                            {item.label}
                        </span>
                        <span className={`font-bold ${item.color}`}>
                            +{item.points}
                        </span>
                    </div>
                ))}

                {/* Penalty */}
                {penaltyPoints > 0 && (
                    <div className="flex items-center justify-between p-3 rounded-xl bg-red-50 dark:bg-red-900/20">
                        <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
                            Pelanggaran ({studentData.violationCount}x)
                        </span>
                        <span className="font-bold text-red-500">
                            -{penaltyPoints}
                        </span>
                    </div>
                )}
            </div>
        </div>
    );
};

export default RewardPointsCard;
