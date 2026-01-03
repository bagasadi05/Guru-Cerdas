import React, { useMemo, useState } from 'react';
import { CardTitle, CardDescription } from '../../ui/Card';
import { Button } from '../../ui/Button';
import { PlusIcon, TrendingUpIcon, CheckCircleIcon, PencilIcon, TrashIcon, HistoryIcon, TagIcon, AlertTriangleIcon, StarIcon } from 'lucide-react';
import { QuizPointRow } from './types';

// Point Categories with labels and colors
export const POINT_CATEGORIES = {
    bertanya: { label: 'Bertanya', color: 'blue', icon: '❓' },
    presentasi: { label: 'Presentasi', color: 'purple', icon: '🎤' },
    tugas_tambahan: { label: 'Tugas Tambahan', color: 'green', icon: '📝' },
    menjawab: { label: 'Menjawab', color: 'orange', icon: '💡' },
    diskusi: { label: 'Diskusi', color: 'cyan', icon: '💬' },
    lainnya: { label: 'Lainnya', color: 'gray', icon: '⭐' },
} as const;

export type PointCategory = keyof typeof POINT_CATEGORIES;

// Settings for point usage limits
const MAX_POINTS_PER_SUBJECT = 10; // Maximum points that can be applied to one subject

interface ActivityTabProps {
    quizPoints: QuizPointRow[];
    onAdd: () => void;
    onEdit: (record: QuizPointRow) => void;
    onDelete: (id: number) => void;
    onApplyPoints: () => void;
    isOnline: boolean;
}

// Category Filter Component
const CategoryFilter: React.FC<{
    selectedCategory: PointCategory | 'all';
    onSelect: (category: PointCategory | 'all') => void;
}> = ({ selectedCategory, onSelect }) => {
    return (
        <div className="flex flex-wrap gap-2 mb-4">
            <button
                onClick={() => onSelect('all')}
                className={`px-3 py-1.5 text-xs font-medium rounded-full transition-all ${selectedCategory === 'all'
                    ? 'bg-indigo-600 text-white'
                    : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
                    }`}
            >
                Semua
            </button>
            {Object.entries(POINT_CATEGORIES).map(([key, { label, icon }]) => (
                <button
                    key={key}
                    onClick={() => onSelect(key as PointCategory)}
                    className={`px-3 py-1.5 text-xs font-medium rounded-full transition-all flex items-center gap-1 ${selectedCategory === key
                        ? 'bg-indigo-600 text-white'
                        : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
                        }`}
                >
                    <span>{icon}</span>
                    {label}
                </button>
            ))}
        </div>
    );
};

// Stats Summary Component
const PointsStats: React.FC<{ records: QuizPointRow[] }> = ({ records }) => {
    const stats = useMemo(() => {
        const available = records.filter(r => !r.is_used);
        const used = records.filter(r => r.is_used);

        const byCategory = Object.keys(POINT_CATEGORIES).reduce((acc, cat) => {
            acc[cat] = available.filter(r => r.category === cat).length;
            return acc;
        }, {} as Record<string, number>);

        const bySubject = available.reduce((acc, r) => {
            const subject = r.subject || 'Lainnya';
            acc[subject] = (acc[subject] || 0) + 1;
            return acc;
        }, {} as Record<string, number>);

        return {
            total: records.length,
            available: available.length,
            used: used.length,
            byCategory,
            bySubject
        };
    }, [records]);

    return (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
            <div className="p-3 rounded-xl bg-green-50 dark:bg-green-900/20 border border-green-100 dark:border-green-800/30">
                <p className="text-2xl font-bold text-green-600 dark:text-green-400">{stats.available}</p>
                <p className="text-xs text-green-500">Poin Tersedia</p>
            </div>
            <div className="p-3 rounded-xl bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800/30">
                <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">{stats.used}</p>
                <p className="text-xs text-blue-500">Sudah Digunakan</p>
            </div>
            <div className="p-3 rounded-xl bg-purple-50 dark:bg-purple-900/20 border border-purple-100 dark:border-purple-800/30">
                <p className="text-2xl font-bold text-purple-600 dark:text-purple-400">{stats.total}</p>
                <p className="text-xs text-purple-500">Total Poin</p>
            </div>
            <div className="p-3 rounded-xl bg-orange-50 dark:bg-orange-900/20 border border-orange-100 dark:border-orange-800/30">
                <p className="text-2xl font-bold text-orange-600 dark:text-orange-400">{Object.keys(stats.bySubject).length}</p>
                <p className="text-xs text-orange-500">Mata Pelajaran</p>
            </div>
        </div>
    );
};

// Used Points History Component
const UsedPointsHistory: React.FC<{ records: QuizPointRow[] }> = ({ records }) => {
    const usedRecords = useMemo(() =>
        records.filter(r => r.is_used).sort((a, b) => {
            const dateA = a.used_at || a.quiz_date || a.created_at;
            const dateB = b.used_at || b.quiz_date || b.created_at;
            return new Date(dateB).getTime() - new Date(dateA).getTime();
        }), [records]);

    if (usedRecords.length === 0) return null;

    return (
        <div className="mb-6">
            <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3 flex items-center gap-2">
                <HistoryIcon className="w-4 h-4" />
                Riwayat Poin yang Sudah Digunakan
            </h4>
            <div className="space-y-2 max-h-40 overflow-y-auto">
                {usedRecords.map(record => (
                    <div key={record.id} className="flex items-center gap-3 p-2 rounded-lg bg-gray-100 dark:bg-gray-800/50 text-sm">
                        <div className="w-8 h-8 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center text-gray-500">
                            <CheckCircleIcon className="w-4 h-4" />
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="font-medium text-gray-600 dark:text-gray-400 truncate">{record.quiz_name}</p>
                            <p className="text-xs text-gray-400">
                                Digunakan untuk {record.used_for_subject || record.subject}
                                {record.used_at && ` • ${new Date(record.used_at).toLocaleDateString('id-ID')}`}
                            </p>
                        </div>
                        <span className="text-xs px-2 py-0.5 rounded bg-gray-200 dark:bg-gray-700 text-gray-500">+1</span>
                    </div>
                ))}
            </div>
        </div>
    );
};

// Subject Points Overview
const SubjectPointsOverview: React.FC<{ records: QuizPointRow[] }> = ({ records }) => {
    const subjectStats = useMemo(() => {
        const available = records.filter(r => !r.is_used);
        const stats = available.reduce((acc, r) => {
            const subject = r.subject || 'Lainnya';
            if (!acc[subject]) {
                acc[subject] = { available: 0, used: 0 };
            }
            acc[subject].available += 1;
            return acc;
        }, {} as Record<string, { available: number; used: number }>);

        // Add used counts
        records.filter(r => r.is_used && r.used_for_subject).forEach(r => {
            if (!stats[r.used_for_subject!]) {
                stats[r.used_for_subject!] = { available: 0, used: 0 };
            }
            stats[r.used_for_subject!].used += 1;
        });

        return Object.entries(stats).sort((a, b) => b[1].available - a[1].available);
    }, [records]);

    if (subjectStats.length === 0) return null;

    return (
        <div className="mb-6 p-4 bg-gradient-to-r from-indigo-50 to-purple-50 dark:from-indigo-900/20 dark:to-purple-900/20 rounded-xl border border-indigo-100 dark:border-indigo-800/30">
            <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3 flex items-center gap-2">
                <StarIcon className="w-4 h-4 text-indigo-500" />
                Poin per Mata Pelajaran
            </h4>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
                {subjectStats.map(([subject, { available, used }]) => {
                    const canApplyMore = available > 0 && used < MAX_POINTS_PER_SUBJECT;
                    return (
                        <div
                            key={subject}
                            className={`p-3 rounded-lg ${canApplyMore
                                ? 'bg-white dark:bg-slate-800 border border-indigo-200 dark:border-indigo-700/50'
                                : 'bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700'
                                }`}
                        >
                            <p className="font-medium text-sm text-gray-800 dark:text-gray-200 truncate">{subject}</p>
                            <div className="flex items-center gap-2 mt-1">
                                <span className="text-lg font-bold text-green-600 dark:text-green-400">{available}</span>
                                <span className="text-xs text-gray-400">tersedia</span>
                            </div>
                            {used > 0 && (
                                <p className="text-xs text-gray-400 mt-0.5">
                                    {used}/{MAX_POINTS_PER_SUBJECT} sudah digunakan
                                </p>
                            )}
                            {used >= MAX_POINTS_PER_SUBJECT && (
                                <p className="text-xs text-amber-500 mt-1 flex items-center gap-1">
                                    <AlertTriangleIcon className="w-3 h-3" />
                                    Limit tercapai
                                </p>
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

// Available Points List
const ActivityPointsHistory: React.FC<{
    records: QuizPointRow[],
    onEdit: (record: QuizPointRow) => void,
    onDelete: (recordId: number) => void,
    isOnline: boolean;
    categoryFilter: PointCategory | 'all';
}> = ({ records, onEdit, onDelete, isOnline, categoryFilter }) => {
    const filteredRecords = useMemo(() => {
        let filtered = records.filter(r => !r.is_used);
        if (categoryFilter !== 'all') {
            filtered = filtered.filter(r => r.category === categoryFilter);
        }
        return [...filtered].sort((a, b) => {
            const dateA = a.quiz_date || a.created_at;
            const dateB = b.quiz_date || b.created_at;
            return new Date(dateB).getTime() - new Date(dateA).getTime();
        });
    }, [records, categoryFilter]);

    if (filteredRecords.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center py-16 text-center text-gray-400">
                <CheckCircleIcon className="w-16 h-16 mb-4 text-gray-600" />
                <h4 className="text-lg font-semibold">
                    {categoryFilter !== 'all' ? 'Tidak Ada Poin untuk Kategori Ini' : 'Tidak Ada Poin Keaktifan'}
                </h4>
                <p className="text-sm">Poin yang Anda tambahkan akan muncul di sini.</p>
            </div>
        );
    }

    return (
        <div className="space-y-3">
            <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
                Poin Tersedia ({filteredRecords.length})
            </h4>
            {filteredRecords.map((record) => {
                const categoryInfo = record.category ? POINT_CATEGORIES[record.category] : null;

                return (
                    <div key={record.id} className="group flex items-center gap-4 p-3 rounded-lg bg-gray-50 dark:bg-black/20 hover:bg-gray-100 dark:hover:bg-black/30 transition-all">
                        <div className="flex-shrink-0 w-12 h-12 rounded-full flex items-center justify-center font-bold text-2xl bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-200">
                            +1
                        </div>
                        <div className="flex-grow min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                                <p className="font-semibold text-gray-900 dark:text-white">{record.quiz_name}</p>
                                {categoryInfo && (
                                    <span className={`text-xs px-2 py-0.5 rounded-full bg-${categoryInfo.color}-100 dark:bg-${categoryInfo.color}-900/30 text-${categoryInfo.color}-600 dark:text-${categoryInfo.color}-400 flex items-center gap-1`}>
                                        <span>{categoryInfo.icon}</span>
                                        {categoryInfo.label}
                                    </span>
                                )}
                            </div>
                            <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                                {record.subject || 'N/A'} &middot; {new Date(record.quiz_date || record.created_at).toLocaleDateString('id-ID')}
                            </p>
                        </div>
                        <div className="flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => onEdit(record)} aria-label="Edit Poin" disabled={!isOnline}><PencilIcon className="h-4 w-4" /></Button>
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-red-500 dark:text-red-400" onClick={() => onDelete(Number(record.id))} aria-label="Hapus Poin" disabled={!isOnline}><TrashIcon className="h-4 w-4" /></Button>
                        </div>
                    </div>
                );
            })}
        </div>
    );
};

// Apply Points Panel with Limit Info
const ApplyPointsPanel: React.FC<{
    availablePoints: number;
    onApplyPoints: () => void;
    isOnline: boolean;
}> = ({ availablePoints, onApplyPoints, isOnline }) => {
    if (availablePoints === 0) return null;

    return (
        <div className="mb-6 p-4 bg-purple-50 dark:bg-purple-900/20 rounded-xl border border-purple-100 dark:border-purple-800/30">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                    <p className="font-bold text-gray-900 dark:text-white">Total {availablePoints} Poin Tersedia</p>
                    <p className="text-sm text-purple-600 dark:text-purple-300">
                        Gunakan poin untuk menambah nilai akhir (maks. {MAX_POINTS_PER_SUBJECT} per mapel).
                    </p>
                </div>
                <Button
                    onClick={onApplyPoints}
                    disabled={!isOnline}
                    variant="outline"
                    className="bg-white/50 dark:bg-white/10 border-purple-200 dark:border-purple-400/50 hover:bg-purple-100 dark:hover:bg-purple-500/20 text-purple-700 dark:text-purple-300 hover:text-purple-900 dark:hover:text-white whitespace-nowrap"
                >
                    <TrendingUpIcon className="w-4 h-4 mr-2" /> Gunakan Poin
                </Button>
            </div>
            <div className="mt-3 p-2 bg-amber-50 dark:bg-amber-900/20 rounded-lg border border-amber-100 dark:border-amber-800/30">
                <p className="text-xs text-amber-700 dark:text-amber-400 flex items-center gap-1">
                    <AlertTriangleIcon className="w-3 h-3" />
                    Poin yang sudah digunakan tidak akan hilang, tetapi tercatat di riwayat.
                </p>
            </div>
        </div>
    );
};

// View Toggle
type ViewMode = 'available' | 'history' | 'overview';

export const ActivityTab: React.FC<ActivityTabProps> = ({ quizPoints, onAdd, onEdit, onDelete, onApplyPoints, isOnline }) => {
    const [categoryFilter, setCategoryFilter] = useState<PointCategory | 'all'>('all');
    const [viewMode, setViewMode] = useState<ViewMode>('available');

    const availablePoints = useMemo(() => quizPoints.filter(r => !r.is_used).length, [quizPoints]);

    return (
        <div className="p-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-4">
                <div>
                    <CardTitle>Poin Keaktifan Kelas</CardTitle>
                    <CardDescription>Catatan poin untuk keaktifan siswa saat pelajaran.</CardDescription>
                </div>
                <Button onClick={onAdd} disabled={!isOnline}>
                    <PlusIcon className="w-4 h-4 mr-2" />Tambah Poin
                </Button>
            </div>

            {/* Stats */}
            <PointsStats records={quizPoints} />

            {/* View Toggle */}
            <div className="flex items-center gap-2 mb-4 pb-4 border-b border-gray-200 dark:border-gray-700">
                <button
                    onClick={() => setViewMode('available')}
                    className={`px-4 py-2 text-sm font-medium rounded-lg transition-all ${viewMode === 'available'
                        ? 'bg-indigo-600 text-white'
                        : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
                        }`}
                >
                    <StarIcon className="w-4 h-4 inline mr-1" />
                    Tersedia
                </button>
                <button
                    onClick={() => setViewMode('overview')}
                    className={`px-4 py-2 text-sm font-medium rounded-lg transition-all ${viewMode === 'overview'
                        ? 'bg-indigo-600 text-white'
                        : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
                        }`}
                >
                    <TagIcon className="w-4 h-4 inline mr-1" />
                    Per Mapel
                </button>
                <button
                    onClick={() => setViewMode('history')}
                    className={`px-4 py-2 text-sm font-medium rounded-lg transition-all ${viewMode === 'history'
                        ? 'bg-indigo-600 text-white'
                        : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
                        }`}
                >
                    <HistoryIcon className="w-4 h-4 inline mr-1" />
                    Riwayat
                </button>
            </div>

            {/* Apply Points Panel */}
            {viewMode === 'available' && (
                <ApplyPointsPanel
                    availablePoints={availablePoints}
                    onApplyPoints={onApplyPoints}
                    isOnline={isOnline}
                />
            )}

            {/* Content based on view mode */}
            {viewMode === 'available' && (
                <>
                    <CategoryFilter
                        selectedCategory={categoryFilter}
                        onSelect={setCategoryFilter}
                    />
                    <ActivityPointsHistory
                        records={quizPoints}
                        onEdit={onEdit}
                        onDelete={onDelete}
                        isOnline={isOnline}
                        categoryFilter={categoryFilter}
                    />
                </>
            )}

            {viewMode === 'overview' && (
                <SubjectPointsOverview records={quizPoints} />
            )}

            {viewMode === 'history' && (
                <UsedPointsHistory records={quizPoints} />
            )}
        </div>
    );
};
