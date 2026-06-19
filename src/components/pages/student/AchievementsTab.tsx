import React, { useMemo, useState } from 'react';
import { CardTitle, CardDescription } from '../../ui/Card';
import { Button } from '../../ui/Button';
import {
    PlusIcon,
    PencilIcon,
    TrashIcon,
    Trophy,
    SearchIcon,
    FileTextIcon,
    CalendarIcon,
    TagIcon,
    GlobeIcon,
    ExternalLinkIcon,
} from 'lucide-react';
import { StudentAchievement, AchievementCategory, AchievementLevel } from '../../../types/studentAchievement';
import {
    getCategoryMeta,
    getLevelLabel,
    getRankMeta,
    ACHIEVEMENT_CATEGORY_META,
    ACHIEVEMENT_LEVEL_META,
} from '../../../lib/achievementMeta';

interface AchievementsTabProps {
    achievements: StudentAchievement[];
    isLoading: boolean;
    onAdd: () => void;
    onEdit: (achievement: StudentAchievement) => void;
    onDelete: (id: string) => void;
    isOnline: boolean;
    currentUserId?: string;
    canAdd?: boolean;
}

const AchievementsStats: React.FC<{ achievements: StudentAchievement[] }> = ({ achievements }) => {
    const stats = useMemo(() => {
        const total = achievements.length;
        const totalPoints = achievements.reduce((sum, item) => sum + (item.points || 0), 0);
        
        // Count top placements (Juara 1, 2, 3)
        const topPlacements = achievements.filter(
            item => item.rank && ['juara_1', 'juara_2', 'juara_3'].includes(item.rank)
        ).length;

        // Count level distribution
        const levelCounts = achievements.reduce((acc, item) => {
            acc[item.level] = (acc[item.level] || 0) + 1;
            return acc;
        }, {} as Record<AchievementLevel, number>);

        return { total, totalPoints, topPlacements, levelCounts };
    }, [achievements]);

    return (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900/20 border border-slate-100 dark:border-slate-800/30">
                <p className="text-2xl font-bold text-slate-700 dark:text-slate-300">{stats.total}</p>
                <p className="text-xs text-slate-500">Total Prestasi</p>
            </div>
            <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-900/20 border border-amber-100 dark:border-amber-800/30">
                <p className="text-2xl font-bold text-amber-600 dark:text-amber-400">{stats.topPlacements}</p>
                <p className="text-xs text-amber-500">🏆 Podium (Juara 1-3)</p>
            </div>
            <div className="p-3 rounded-xl bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-100 dark:border-indigo-800/30">
                <p className="text-2xl font-bold text-indigo-600 dark:text-indigo-400">{stats.totalPoints}</p>
                <p className="text-xs text-indigo-500">⭐️ Total Poin Prestasi</p>
            </div>
            <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-100 dark:border-emerald-800/30">
                <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
                    {(stats.levelCounts.nasional || 0) + (stats.levelCounts.internasional || 0)}
                </p>
                <p className="text-xs text-emerald-500">🌍 Level Nasional/Int</p>
            </div>
        </div>
    );
};

export const AchievementsTab: React.FC<AchievementsTabProps> = ({
    achievements,
    isLoading,
    onAdd,
    onEdit,
    onDelete,
    isOnline,
    currentUserId,
    canAdd = true,
}) => {
    const [searchQuery, setSearchQuery] = useState('');
    const [categoryFilter, setCategoryFilter] = useState<AchievementCategory | 'all'>('all');
    const [levelFilter, setLevelFilter] = useState<AchievementLevel | 'all'>('all');

    // Filter achievements
    const filteredAchievements = useMemo(() => {
        return achievements.filter(item => {
            const matchesSearch =
                item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                (item.organizer && item.organizer.toLowerCase().includes(searchQuery.toLowerCase())) ||
                (item.description && item.description.toLowerCase().includes(searchQuery.toLowerCase()));

            const matchesCategory = categoryFilter === 'all' || item.category === categoryFilter;
            const matchesLevel = levelFilter === 'all' || item.level === levelFilter;

            return matchesSearch && matchesCategory && matchesLevel;
        });
    }, [achievements, searchQuery, categoryFilter, levelFilter]);

    if (isLoading) {
        return (
            <div className="space-y-4 animate-pulse">
                <div className="h-24 bg-slate-100 dark:bg-slate-800 rounded-xl" />
                <div className="h-10 bg-slate-100 dark:bg-slate-800 rounded-lg w-1/3" />
                <div className="space-y-3">
                    <div className="h-32 bg-slate-100 dark:bg-slate-800 rounded-xl" />
                    <div className="h-32 bg-slate-100 dark:bg-slate-800 rounded-xl" />
                </div>
            </div>
        );
    }

    return (
        <div>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
                <div>
                    <CardTitle className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                        <Trophy className="w-5 h-5 text-amber-500" /> Portofolio Prestasi Siswa
                    </CardTitle>
                    <CardDescription>
                        Daftar kompetisi, perlombaan, dan penghargaan terstruktur yang dimenangkan siswa.
                    </CardDescription>
                </div>
                {canAdd && (
                    <Button
                        onClick={onAdd}
                        disabled={!isOnline}
                        className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl shadow-sm flex items-center gap-2 self-start sm:self-auto"
                    >
                        <PlusIcon className="w-4 h-4" />
                        Tambah Prestasi
                    </Button>
                )}
            </div>

            {achievements.length > 0 && <AchievementsStats achievements={achievements} />}

            {/* Filter controls */}
            <div className="flex flex-col md:flex-row gap-3 mb-6">
                {/* Search */}
                <div className="relative flex-1">
                    <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                        type="text"
                        placeholder="Cari prestasi, penyelenggara..."
                        value={searchQuery}
                        onChange={e => setSearchQuery(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                    />
                </div>

                {/* Category Filter */}
                <select
                    value={categoryFilter}
                    onChange={e => setCategoryFilter(e.target.value as any)}
                    className="px-3 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                >
                    <option value="all">Semua Bidang</option>
                    {Object.entries(ACHIEVEMENT_CATEGORY_META).map(([key, value]) => (
                        <option key={key} value={key}>
                            {value.label}
                        </option>
                    ))}
                </select>

                {/* Level Filter */}
                <select
                    value={levelFilter}
                    onChange={e => setLevelFilter(e.target.value as any)}
                    className="px-3 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                >
                    <option value="all">Semua Tingkat</option>
                    {Object.entries(ACHIEVEMENT_LEVEL_META).map(([key, value]) => (
                        <option key={key} value={key}>
                            Tingkat {value.label}
                        </option>
                    ))}
                </select>
            </div>

            {/* List */}
            {filteredAchievements.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-center border border-dashed border-slate-200 dark:border-slate-800 rounded-2xl">
                    <div className="w-16 h-16 rounded-2xl bg-amber-50 dark:bg-amber-950/20 flex items-center justify-center mb-4">
                        <Trophy className="w-8 h-8 text-amber-500" />
                    </div>
                    <h4 className="text-lg font-semibold text-slate-900 dark:text-white">
                        {achievements.length === 0 ? 'Belum Ada Portofolio Prestasi' : 'Pencarian Tidak Ditemukan'}
                    </h4>
                    <p className="text-sm text-slate-500 dark:text-slate-400 max-w-sm mt-1">
                        {achievements.length === 0
                            ? 'Catat pencapaian prestasi akademik maupun non-akademik siswa di sini.'
                            : 'Coba ubah kata kunci pencarian atau filter yang Anda terapkan.'}
                    </p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {filteredAchievements.map(item => {
                        const catMeta = getCategoryMeta(item.category);
                        const CatIcon = catMeta.icon;
                        const rankMeta = getRankMeta(item.rank);
                        const RankIcon = rankMeta?.icon;

                        return (
                            <div
                                key={item.id}
                                className="group relative p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800/80 hover:shadow-md transition-all flex flex-col justify-between"
                            >
                                <div>
                                    {/* Action Buttons */}
                                    <div className="absolute top-4 right-4 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="h-8 w-8"
                                            onClick={() => onEdit(item)}
                                            disabled={!isOnline || item.user_id !== currentUserId}
                                            aria-label="Edit prestasi"
                                        >
                                            <PencilIcon className="h-4 w-4" />
                                        </Button>
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="h-8 w-8 text-red-600 dark:text-red-400"
                                            onClick={() => onDelete(item.id)}
                                            disabled={!isOnline || item.user_id !== currentUserId}
                                            aria-label="Hapus prestasi"
                                        >
                                            <TrashIcon className="h-4 w-4" />
                                        </Button>
                                    </div>

                                    {/* Header Badges */}
                                    <div className="flex flex-wrap gap-2 items-center mb-3">
                                        <span
                                            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${catMeta.bgClass} ${catMeta.textClass} border ${catMeta.borderClass}`}
                                        >
                                            <CatIcon className="w-3.5 h-3.5" />
                                            {catMeta.label}
                                        </span>
                                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                                            <GlobeIcon className="w-3 h-3 text-slate-400" />
                                            {getLevelLabel(item.level)}
                                        </span>
                                        {item.points && (
                                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-900/50">
                                                +{item.points} Poin
                                            </span>
                                        )}
                                    </div>

                                    {/* Title & Organizer */}
                                    <h4 className="font-bold text-slate-900 dark:text-white text-base leading-snug pr-16">
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
                                        <p className="text-sm text-slate-600 dark:text-slate-300 mt-3 line-clamp-3 bg-slate-50/50 dark:bg-slate-950/20 p-2.5 rounded-lg border border-slate-100 dark:border-slate-800/30">
                                            {item.description}
                                        </p>
                                    )}
                                </div>

                                <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800/50 flex flex-wrap items-center justify-between gap-3">
                                    <div className="flex items-center gap-4 text-xs text-slate-400">
                                        <span className="flex items-center gap-1">
                                            <CalendarIcon className="w-3.5 h-3.5" />
                                            {new Date(item.date).toLocaleDateString('id-ID', {
                                                day: 'numeric',
                                                month: 'short',
                                                year: 'numeric',
                                            })}
                                        </span>
                                        {item.rank && rankMeta && (
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
                                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-900 transition-colors"
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
