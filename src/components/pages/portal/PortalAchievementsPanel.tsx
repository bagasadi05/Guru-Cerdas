import React, { useMemo } from 'react';
import {
    Trophy,
    CalendarIcon,
    TagIcon,
    GlobeIcon,
    FileTextIcon,
    ExternalLinkIcon,
} from 'lucide-react';
import type { PortalStudentAchievement } from './types';
import {
    getCategoryMeta,
    getLevelLabel,
    getRankMeta,
} from '../../../lib/achievementMeta';

interface PortalAchievementsPanelProps {
    achievements?: PortalStudentAchievement[];
}

export const PortalAchievementsPanel: React.FC<PortalAchievementsPanelProps> = ({ achievements = [] }) => {
    const sortedAchievements = useMemo(() => {
        return [...achievements].sort(
            (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
        );
    }, [achievements]);

    return (
        <div className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-md dark:border-slate-800 dark:bg-slate-900 transition-all duration-300">
            <div className="flex items-center gap-3 mb-6">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-50 dark:bg-amber-950/20">
                    <Trophy className="h-5 w-5 text-amber-500" />
                </div>
                <div>
                    <h3 className="text-base font-extrabold text-slate-900 dark:text-white sm:text-lg">
                        Portofolio Prestasi Siswa
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                        Pencapaian kompetisi dan piagam penghargaan resmi siswa.
                    </p>
                </div>
            </div>

            {sortedAchievements.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                    <div className="w-16 h-16 rounded-2xl bg-slate-50 dark:bg-slate-800/50 flex items-center justify-center mb-3">
                        <Trophy className="w-8 h-8 text-slate-350 dark:text-slate-655" />
                    </div>
                    <h4 className="text-sm font-bold text-slate-700 dark:text-slate-300">Belum Ada Prestasi</h4>
                    <p className="text-xs text-slate-400 dark:text-slate-500 max-w-xs mt-1">
                        Siswa belum memiliki catatan prestasi formal yang dimasukkan oleh wali kelas.
                    </p>
                </div>
            ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {sortedAchievements.map(item => {
                        const catMeta = getCategoryMeta(item.category);
                        const CatIcon = catMeta.icon;
                        const rankMeta = getRankMeta(item.rank);
                        const RankIcon = rankMeta?.icon;

                        return (
                            <div
                                key={item.id}
                                className="relative p-5 rounded-2xl bg-slate-50/50 dark:bg-slate-950/30 border border-slate-100 dark:border-slate-850 hover:shadow-sm transition-all flex flex-col justify-between"
                            >
                                <div>
                                    {/* Header Badges */}
                                    <div className="flex flex-wrap gap-2 items-center mb-3">
                                        <span
                                            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${catMeta.bgClass} ${catMeta.textClass} border ${catMeta.borderClass}`}
                                        >
                                            <CatIcon className="w-3.5 h-3.5" />
                                            {catMeta.label}
                                        </span>
                                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-white dark:bg-slate-900 border border-slate-200/50 dark:border-slate-800 text-slate-600 dark:text-slate-300">
                                            <GlobeIcon className="w-3 h-3 text-slate-400" />
                                            {getLevelLabel(item.level)}
                                        </span>
                                        {item.points && (
                                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-900/50">
                                                +{item.points} Poin
                                            </span>
                                        )}
                                    </div>

                                    {/* Title */}
                                    <h4 className="font-bold text-slate-900 dark:text-white text-sm sm:text-base leading-snug">
                                        {item.title}
                                    </h4>
                                    {item.organizer && (
                                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 flex items-center gap-1">
                                            <TagIcon className="w-3 h-3" />
                                            Penyelenggara: <span className="font-medium text-slate-600 dark:text-slate-300">{item.organizer}</span>
                                        </p>
                                    )}

                                    {/* Description */}
                                    {item.description && (
                                        <p className="text-xs text-slate-600 dark:text-slate-400 mt-3 line-clamp-3 bg-white dark:bg-slate-950 border border-slate-150 dark:border-slate-850 p-2.5 rounded-xl">
                                            {item.description}
                                        </p>
                                    )}
                                </div>

                                <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800/50 flex flex-wrap items-center justify-between gap-3">
                                    <div className="flex items-center gap-3 text-xs text-slate-450">
                                        <span className="flex items-center gap-1">
                                            <CalendarIcon className="w-3.5 h-3.5" />
                                            {new Date(item.date).toLocaleDateString('id-ID', {
                                                day: 'numeric',
                                                month: 'short',
                                                year: 'numeric',
                                            })}
                                        </span>
                                        {item.rank && rankMeta && RankIcon && (
                                            <span className="flex items-center gap-1 font-medium text-amber-600 dark:text-amber-400">
                                                <RankIcon className={`w-3.5 h-3.5 ${rankMeta.color}`} />
                                                {rankMeta.label}
                                            </span>
                                        )}
                                    </div>

                                    {/* Certificate Link */}
                                    {item.certificate_url && (
                                        <a
                                            href={item.certificate_url}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-850 transition-colors"
                                        >
                                            <FileTextIcon className="w-3.5 h-3.5 text-slate-400" />
                                            <span>Sertifikat</span>
                                            <ExternalLinkIcon className="w-3 h-3 text-slate-400" />
                                        </a>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
};
