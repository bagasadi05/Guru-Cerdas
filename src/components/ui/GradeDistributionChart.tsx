import React, { useMemo } from 'react';
import { BarChartIcon } from '../Icons';

interface GradeDistributionChartProps {
    scores: Record<string, string | number>;
    kkm?: number;
    className?: string;
}

interface DistributionBucket {
    range: string;
    count: number;
    percentage: number;
    color: string;
    isAboveKkm: boolean;
}

/**
 * Simple bar chart showing grade distribution
 */
export const GradeDistributionChart: React.FC<GradeDistributionChartProps> = ({
    scores,
    kkm = 75,
    className = '',
}) => {
    const distribution = useMemo(() => {
        const buckets: DistributionBucket[] = [
            { range: '0-20', count: 0, percentage: 0, color: 'bg-red-500', isAboveKkm: false },
            { range: '21-40', count: 0, percentage: 0, color: 'bg-orange-500', isAboveKkm: false },
            { range: '41-60', count: 0, percentage: 0, color: 'bg-yellow-500', isAboveKkm: false },
            { range: '61-75', count: 0, percentage: 0, color: 'bg-amber-500', isAboveKkm: false },
            { range: '76-85', count: 0, percentage: 0, color: 'bg-lime-500', isAboveKkm: true },
            { range: '86-95', count: 0, percentage: 0, color: 'bg-green-500', isAboveKkm: true },
            { range: '96-100', count: 0, percentage: 0, color: 'bg-emerald-500', isAboveKkm: true },
        ];

        const validScores = Object.values(scores)
            .map(s => typeof s === 'string' ? parseFloat(s) : s)
            .filter(s => !isNaN(s) && s >= 0 && s <= 100);

        if (validScores.length === 0) {
            return { buckets, total: 0, stats: null };
        }

        validScores.forEach(score => {
            if (score <= 20) buckets[0].count++;
            else if (score <= 40) buckets[1].count++;
            else if (score <= 60) buckets[2].count++;
            else if (score <= 75) buckets[3].count++;
            else if (score <= 85) buckets[4].count++;
            else if (score <= 95) buckets[5].count++;
            else buckets[6].count++;
        });

        const total = validScores.length;
        const maxCount = Math.max(...buckets.map(b => b.count), 1);

        buckets.forEach(bucket => {
            bucket.percentage = (bucket.count / maxCount) * 100;
        });

        // Calculate statistics
        const sorted = [...validScores].sort((a, b) => a - b);
        const sum = validScores.reduce((a, b) => a + b, 0);
        const mean = sum / total;
        const median = total % 2 === 0
            ? (sorted[total / 2 - 1] + sorted[total / 2]) / 2
            : sorted[Math.floor(total / 2)];
        const variance = validScores.reduce((acc, val) => acc + Math.pow(val - mean, 2), 0) / total;
        const stdDev = Math.sqrt(variance);
        const aboveKkm = validScores.filter(s => s >= kkm).length;
        const belowKkm = total - aboveKkm;

        return {
            buckets,
            total,
            stats: {
                mean: Math.round(mean * 10) / 10,
                median: Math.round(median * 10) / 10,
                stdDev: Math.round(stdDev * 10) / 10,
                min: Math.min(...validScores),
                max: Math.max(...validScores),
                aboveKkm,
                belowKkm,
                aboveKkmPercent: Math.round((aboveKkm / total) * 100),
            },
        };
    }, [scores, kkm]);

    if (distribution.total === 0) {
        return (
            <div className={`p-4 rounded-xl bg-gray-100 dark:bg-gray-800/50 text-center ${className}`}>
                <BarChartIcon className="w-8 h-8 mx-auto text-gray-400 mb-2" />
                <p className="text-sm text-gray-500">Belum ada nilai untuk ditampilkan</p>
            </div>
        );
    }

    return (
        <div className={`space-y-4 ${className}`}>
            {/* Stats Summary */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                <div className="p-3 rounded-lg bg-blue-50 dark:bg-blue-900/20 text-center">
                    <p className="text-lg font-bold text-blue-600 dark:text-blue-400">{distribution.stats?.mean}</p>
                    <p className="text-[10px] text-blue-500 uppercase tracking-wide">Rata-rata</p>
                </div>
                <div className="p-3 rounded-lg bg-purple-50 dark:bg-purple-900/20 text-center">
                    <p className="text-lg font-bold text-purple-600 dark:text-purple-400">{distribution.stats?.median}</p>
                    <p className="text-[10px] text-purple-500 uppercase tracking-wide">Median</p>
                </div>
                <div className="p-3 rounded-lg bg-green-50 dark:bg-green-900/20 text-center">
                    <p className="text-lg font-bold text-green-600 dark:text-green-400">{distribution.stats?.aboveKkmPercent}%</p>
                    <p className="text-[10px] text-green-500 uppercase tracking-wide">Tuntas</p>
                </div>
                <div className="p-3 rounded-lg bg-gray-50 dark:bg-gray-800 text-center">
                    <p className="text-lg font-bold text-gray-600 dark:text-gray-400">±{distribution.stats?.stdDev}</p>
                    <p className="text-[10px] text-gray-500 uppercase tracking-wide">Std Dev</p>
                </div>
            </div>

            {/* Bar Chart */}
            <div className="space-y-2">
                <div className="flex items-end justify-between h-32 gap-1 px-2">
                    {distribution.buckets.map((bucket, index) => (
                        <div key={index} className="flex-1 flex flex-col items-center gap-1">
                            <span className="text-[10px] text-gray-500 font-medium">
                                {bucket.count > 0 ? bucket.count : ''}
                            </span>
                            <div
                                className={`w-full ${bucket.color} rounded-t transition-all duration-300`}
                                style={{
                                    height: `${Math.max(bucket.percentage, bucket.count > 0 ? 5 : 0)}%`,
                                    opacity: bucket.count > 0 ? 1 : 0.2,
                                }}
                            />
                        </div>
                    ))}
                </div>
                <div className="flex justify-between gap-1 px-2 border-t border-gray-200 dark:border-gray-700 pt-2">
                    {distribution.buckets.map((bucket, index) => (
                        <div key={index} className="flex-1 text-center">
                            <span className="text-[9px] text-gray-500 dark:text-gray-400">
                                {bucket.range}
                            </span>
                        </div>
                    ))}
                </div>
            </div>

            {/* Legend */}
            <div className="flex items-center justify-center gap-4 text-xs">
                <div className="flex items-center gap-1">
                    <div className="w-3 h-3 rounded bg-gradient-to-r from-red-500 to-amber-500" />
                    <span className="text-gray-500">Di bawah KKM ({distribution.stats?.belowKkm})</span>
                </div>
                <div className="flex items-center gap-1">
                    <div className="w-3 h-3 rounded bg-gradient-to-r from-lime-500 to-emerald-500" />
                    <span className="text-gray-500">Di atas KKM ({distribution.stats?.aboveKkm})</span>
                </div>
            </div>

            {/* Min/Max */}
            <div className="flex justify-between text-xs text-gray-400 px-2">
                <span>Min: {distribution.stats?.min}</span>
                <span>Max: {distribution.stats?.max}</span>
            </div>
        </div>
    );
};

/**
 * Compact version for inline display
 */
export const GradeDistributionMini: React.FC<{
    scores: Record<string, string | number>;
    kkm?: number;
}> = ({ scores, kkm = 75 }) => {
    const { aboveKkm, total, mean } = useMemo(() => {
        const validScores = Object.values(scores)
            .map(s => typeof s === 'string' ? parseFloat(s) : s)
            .filter(s => !isNaN(s) && s >= 0 && s <= 100);

        if (validScores.length === 0) {
            return { aboveKkm: 0, total: 0, mean: 0 };
        }

        return {
            aboveKkm: validScores.filter(s => s >= kkm).length,
            total: validScores.length,
            mean: Math.round(validScores.reduce((a, b) => a + b, 0) / validScores.length),
        };
    }, [scores, kkm]);

    if (total === 0) return null;

    const passRate = Math.round((aboveKkm / total) * 100);

    return (
        <div className="flex items-center gap-3 text-sm">
            <div className="flex items-center gap-1">
                <div className="w-16 h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                    <div
                        className="h-full bg-gradient-to-r from-green-500 to-emerald-500 transition-all"
                        style={{ width: `${passRate}%` }}
                    />
                </div>
                <span className="text-xs text-gray-500">{passRate}%</span>
            </div>
            <span className="text-xs text-gray-400">Rata-rata: {mean}</span>
        </div>
    );
};

export default GradeDistributionChart;
