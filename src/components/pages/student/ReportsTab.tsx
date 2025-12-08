import React, { useMemo, useState } from 'react';
import { CardTitle, CardDescription } from '../../ui/Card';
import { Button } from '../../ui/Button';
import { PlusIcon, BookOpenIcon, PencilIcon, TrashIcon, FilterIcon, SearchIcon, TagIcon, CalendarIcon, FileTextIcon, ImageIcon, XIcon } from 'lucide-react';
import { ReportRow } from './types';

// Report Categories
export const REPORT_CATEGORIES = {
    akademik: { label: 'Akademik', color: 'blue', icon: '📚', description: 'Catatan terkait pembelajaran & nilai' },
    perilaku: { label: 'Perilaku', color: 'orange', icon: '👤', description: 'Catatan sikap & perilaku siswa' },
    kesehatan: { label: 'Kesehatan', color: 'green', icon: '🏥', description: 'Catatan kondisi kesehatan' },
    prestasi: { label: 'Prestasi', color: 'purple', icon: '🏆', description: 'Pencapaian & prestasi siswa' },
    lainnya: { label: 'Lainnya', color: 'gray', icon: '📝', description: 'Catatan umum lainnya' },
} as const;

export type ReportCategory = keyof typeof REPORT_CATEGORIES;

// Common tags for quick selection
export const COMMON_TAGS = [
    'penting', 'mendesak', 'positif', 'perlu-perhatian', 'follow-up',
    'diskusi-ortu', 'bimbingan', 'konseling', 'remedial', 'pengayaan'
];

interface ReportsTabProps {
    reports: ReportRow[];
    onAdd: () => void;
    onEdit: (record: ReportRow) => void;
    onDelete: (id: string) => void;
    isOnline: boolean;
}

// Stats Summary
const ReportsStats: React.FC<{ reports: ReportRow[] }> = ({ reports }) => {
    const stats = useMemo(() => {
        const byCategory = Object.keys(REPORT_CATEGORIES).reduce((acc, cat) => {
            acc[cat] = reports.filter(r => r.category === cat).length;
            return acc;
        }, {} as Record<string, number>);

        const withAttachment = reports.filter(r => r.attachment_url).length;
        const thisMonth = reports.filter(r => {
            const reportDate = new Date(r.date);
            const now = new Date();
            return reportDate.getMonth() === now.getMonth() && reportDate.getFullYear() === now.getFullYear();
        }).length;

        return { total: reports.length, byCategory, withAttachment, thisMonth };
    }, [reports]);

    return (
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3 mb-6">
            <div className="p-3 rounded-xl bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-100 dark:border-indigo-800/30">
                <p className="text-2xl font-bold text-indigo-600 dark:text-indigo-400">{stats.total}</p>
                <p className="text-xs text-indigo-500">Total Catatan</p>
            </div>
            <div className="p-3 rounded-xl bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800/30">
                <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">{stats.byCategory.akademik || 0}</p>
                <p className="text-xs text-blue-500">📚 Akademik</p>
            </div>
            <div className="p-3 rounded-xl bg-orange-50 dark:bg-orange-900/20 border border-orange-100 dark:border-orange-800/30">
                <p className="text-2xl font-bold text-orange-600 dark:text-orange-400">{stats.byCategory.perilaku || 0}</p>
                <p className="text-xs text-orange-500">👤 Perilaku</p>
            </div>
            <div className="p-3 rounded-xl bg-purple-50 dark:bg-purple-900/20 border border-purple-100 dark:border-purple-800/30">
                <p className="text-2xl font-bold text-purple-600 dark:text-purple-400">{stats.byCategory.prestasi || 0}</p>
                <p className="text-xs text-purple-500">🏆 Prestasi</p>
            </div>
            <div className="p-3 rounded-xl bg-green-50 dark:bg-green-900/20 border border-green-100 dark:border-green-800/30">
                <p className="text-2xl font-bold text-green-600 dark:text-green-400">{stats.thisMonth}</p>
                <p className="text-xs text-green-500">Bulan Ini</p>
            </div>
            <div className="p-3 rounded-xl bg-cyan-50 dark:bg-cyan-900/20 border border-cyan-100 dark:border-cyan-800/30">
                <p className="text-2xl font-bold text-cyan-600 dark:text-cyan-400">{stats.withAttachment}</p>
                <p className="text-xs text-cyan-500">📎 Lampiran</p>
            </div>
        </div>
    );
};

// Timeline View Component
const TimelineView: React.FC<{
    reports: ReportRow[];
    onEdit: (r: ReportRow) => void;
    onDelete: (id: string) => void;
    isOnline: boolean;
}> = ({ reports, onEdit, onDelete, isOnline }) => {
    // Group reports by month/year
    const groupedReports = useMemo(() => {
        const groups: Record<string, ReportRow[]> = {};

        [...reports]
            .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
            .forEach(report => {
                const date = new Date(report.date);
                const key = `${date.toLocaleString('id-ID', { month: 'long' })} ${date.getFullYear()}`;
                if (!groups[key]) groups[key] = [];
                groups[key].push(report);
            });

        return groups;
    }, [reports]);

    const monthKeys = Object.keys(groupedReports);

    if (reports.length === 0) {
        return (
            <div className="text-center py-16 text-gray-400">
                <BookOpenIcon className="w-16 h-16 mx-auto mb-4 text-gray-600" />
                <h4 className="font-semibold">Tidak Ada Catatan</h4>
                <p>Belum ada catatan guru untuk siswa ini.</p>
            </div>
        );
    }

    return (
        <div className="relative">
            {/* Timeline line */}
            <div className="absolute left-6 top-0 bottom-0 w-0.5 bg-gradient-to-b from-indigo-500 via-purple-500 to-pink-500" />

            {monthKeys.map((monthKey, groupIndex) => (
                <div key={monthKey} className="mb-8">
                    {/* Month header */}
                    <div className="flex items-center gap-3 mb-4 relative">
                        <div className="w-12 h-12 rounded-full bg-indigo-600 flex items-center justify-center z-10">
                            <CalendarIcon className="w-5 h-5 text-white" />
                        </div>
                        <h3 className="text-lg font-bold text-gray-800 dark:text-white">{monthKey}</h3>
                        <span className="text-sm text-gray-400">({groupedReports[monthKey].length} catatan)</span>
                    </div>

                    {/* Reports in this month */}
                    <div className="ml-6 space-y-4">
                        {groupedReports[monthKey].map((report, index) => {
                            const category = report.category ? REPORT_CATEGORIES[report.category] : null;
                            const categoryColor = category?.color || 'gray';

                            return (
                                <div
                                    key={report.id}
                                    className="group relative pl-8 pb-4 border-l-2 border-gray-200 dark:border-gray-700 last:border-l-0"
                                >
                                    {/* Timeline dot */}
                                    <div className={`absolute left-[-5px] top-0 w-3 h-3 rounded-full bg-${categoryColor}-500 ring-4 ring-white dark:ring-gray-900`} />

                                    {/* Card */}
                                    <div className={`relative p-4 rounded-xl bg-gradient-to-r from-${categoryColor}-50/50 to-transparent dark:from-${categoryColor}-900/10 border border-${categoryColor}-100 dark:border-${categoryColor}-800/30 hover:shadow-lg transition-shadow`}>
                                        {/* Actions */}
                                        <div className="absolute top-3 right-3 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => onEdit(report)} disabled={!isOnline}>
                                                <PencilIcon className="h-4 w-4" />
                                            </Button>
                                            <Button variant="ghost" size="icon" className="h-8 w-8 text-red-600 dark:text-red-400" onClick={() => onDelete(report.id)} disabled={!isOnline}>
                                                <TrashIcon className="h-4 w-4" />
                                            </Button>
                                        </div>

                                        {/* Header */}
                                        <div className="flex items-start gap-3 mb-2">
                                            {category && (
                                                <span className={`px-2 py-1 rounded-full text-xs font-medium bg-${categoryColor}-100 dark:bg-${categoryColor}-900/30 text-${categoryColor}-700 dark:text-${categoryColor}-400`}>
                                                    {category.icon} {category.label}
                                                </span>
                                            )}
                                            <span className="text-xs text-gray-400">
                                                {new Date(report.date).toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'short' })}
                                            </span>
                                        </div>

                                        {/* Title */}
                                        <h4 className="font-bold text-gray-900 dark:text-white text-lg mb-2">{report.title}</h4>

                                        {/* Notes */}
                                        <p className="text-sm text-gray-600 dark:text-gray-300 whitespace-pre-line">{report.notes}</p>

                                        {/* Tags */}
                                        {report.tags && report.tags.length > 0 && (
                                            <div className="flex flex-wrap gap-1 mt-3">
                                                {report.tags.map(tag => (
                                                    <span
                                                        key={tag}
                                                        className="px-2 py-0.5 rounded-full text-xs bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400"
                                                    >
                                                        #{tag}
                                                    </span>
                                                ))}
                                            </div>
                                        )}

                                        {/* Attachment */}
                                        {report.attachment_url && (
                                            <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
                                                {report.attachment_url.match(/\.(jpg|jpeg|png|gif|webp)$/i) ? (
                                                    <a
                                                        href={report.attachment_url}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="block"
                                                    >
                                                        <img
                                                            src={report.attachment_url}
                                                            alt="Attachment"
                                                            className="max-h-40 rounded-lg object-cover hover:opacity-90 transition-opacity"
                                                        />
                                                    </a>
                                                ) : (
                                                    <a
                                                        href={report.attachment_url}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-sm transition-colors"
                                                    >
                                                        <FileTextIcon className="w-4 h-4" />
                                                        <span>Lihat Lampiran</span>
                                                    </a>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            ))}
        </div>
    );
};

// Filter Types
type CategoryFilter = ReportCategory | 'all';
type ViewMode = 'timeline' | 'list';

export const ReportsTab: React.FC<ReportsTabProps> = ({ reports, onAdd, onEdit, onDelete, isOnline }) => {
    const [searchQuery, setSearchQuery] = useState('');
    const [categoryFilter, setCategoryFilter] = useState<CategoryFilter>('all');
    const [tagFilter, setTagFilter] = useState<string | null>(null);
    const [viewMode, setViewMode] = useState<ViewMode>('timeline');

    // Get all unique tags from reports
    const allTags = useMemo(() => {
        const tags = new Set<string>();
        reports.forEach(r => r.tags?.forEach(t => tags.add(t)));
        return Array.from(tags);
    }, [reports]);

    // Filter reports
    const filteredReports = useMemo(() => {
        return reports.filter(r => {
            // Category filter
            if (categoryFilter !== 'all' && r.category !== categoryFilter) return false;

            // Tag filter
            if (tagFilter && !r.tags?.includes(tagFilter)) return false;

            // Search filter
            if (searchQuery) {
                const query = searchQuery.toLowerCase();
                const matchesTitle = r.title.toLowerCase().includes(query);
                const matchesNotes = r.notes.toLowerCase().includes(query);
                const matchesTags = r.tags?.some(t => t.toLowerCase().includes(query));
                if (!matchesTitle && !matchesNotes && !matchesTags) return false;
            }

            return true;
        });
    }, [reports, categoryFilter, tagFilter, searchQuery]);

    const clearFilters = () => {
        setSearchQuery('');
        setCategoryFilter('all');
        setTagFilter(null);
    };

    const hasActiveFilters = searchQuery || categoryFilter !== 'all' || tagFilter;

    return (
        <div className="p-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-4">
                <div>
                    <CardTitle>Catatan Guru</CardTitle>
                    <CardDescription>Catatan perkembangan, laporan, atau insiden khusus.</CardDescription>
                </div>
                <Button onClick={onAdd} disabled={!isOnline}>
                    <PlusIcon className="w-4 h-4 mr-2" />Tambah Catatan
                </Button>
            </div>

            {/* Stats */}
            <ReportsStats reports={reports} />

            {/* Search & Filters */}
            <div className="flex flex-wrap items-center gap-3 mb-6 p-4 bg-gray-50 dark:bg-gray-800/50 rounded-xl">
                {/* Search */}
                <div className="relative flex-1 min-w-[200px]">
                    <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Cari catatan..."
                        className="w-full pl-10 pr-4 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder:text-gray-400 focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    />
                </div>

                {/* Category Filter */}
                <select
                    value={categoryFilter}
                    onChange={(e) => setCategoryFilter(e.target.value as CategoryFilter)}
                    className="px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 text-sm"
                >
                    <option value="all">Semua Kategori</option>
                    {Object.entries(REPORT_CATEGORIES).map(([key, cat]) => (
                        <option key={key} value={key}>{cat.icon} {cat.label}</option>
                    ))}
                </select>

                {/* Tag Filter */}
                {allTags.length > 0 && (
                    <select
                        value={tagFilter || ''}
                        onChange={(e) => setTagFilter(e.target.value || null)}
                        className="px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 text-sm"
                    >
                        <option value="">Semua Tag</option>
                        {allTags.map(tag => (
                            <option key={tag} value={tag}>#{tag}</option>
                        ))}
                    </select>
                )}

                {/* View Mode Toggle */}
                <div className="flex rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
                    <button
                        onClick={() => setViewMode('timeline')}
                        className={`px-3 py-2 text-sm ${viewMode === 'timeline' ? 'bg-indigo-600 text-white' : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-400'}`}
                    >
                        Timeline
                    </button>
                    <button
                        onClick={() => setViewMode('list')}
                        className={`px-3 py-2 text-sm ${viewMode === 'list' ? 'bg-indigo-600 text-white' : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-400'}`}
                    >
                        List
                    </button>
                </div>

                {/* Clear Filters */}
                {hasActiveFilters && (
                    <button
                        onClick={clearFilters}
                        className="px-3 py-2 text-sm text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1"
                    >
                        <XIcon className="w-3 h-3" />
                        Reset
                    </button>
                )}
            </div>

            {/* Filter Info */}
            {hasActiveFilters && (
                <div className="mb-4 p-3 rounded-lg bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-100 dark:border-indigo-800/30">
                    <p className="text-sm text-indigo-700 dark:text-indigo-400">
                        Menampilkan {filteredReports.length} dari {reports.length} catatan
                        {categoryFilter !== 'all' && ` • Kategori: ${REPORT_CATEGORIES[categoryFilter].label}`}
                        {tagFilter && ` • Tag: #${tagFilter}`}
                        {searchQuery && ` • Pencarian: "${searchQuery}"`}
                    </p>
                </div>
            )}

            {/* Content */}
            {viewMode === 'timeline' ? (
                <TimelineView
                    reports={filteredReports}
                    onEdit={onEdit}
                    onDelete={onDelete}
                    isOnline={isOnline}
                />
            ) : (
                /* List View */
                filteredReports.length > 0 ? (
                    <div className="space-y-3">
                        {[...filteredReports]
                            .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                            .map(r => {
                                const category = r.category ? REPORT_CATEGORIES[r.category] : null;
                                return (
                                    <div key={r.id} className="group relative p-4 rounded-lg bg-gray-50 dark:bg-black/20 hover:bg-gray-100 dark:hover:bg-black/30 transition-colors">
                                        <div className="absolute top-3 right-3 opacity-100 lg:opacity-0 lg:group-hover:opacity-100 transition-opacity">
                                            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => onEdit(r)} disabled={!isOnline}>
                                                <PencilIcon className="h-4 w-4" />
                                            </Button>
                                            <Button variant="ghost" size="icon" className="h-8 w-8 text-red-600 dark:text-red-400" onClick={() => onDelete(r.id)} disabled={!isOnline}>
                                                <TrashIcon className="h-4 w-4" />
                                            </Button>
                                        </div>
                                        <div className="flex items-center gap-2 mb-1">
                                            {category && (
                                                <span className="text-sm">{category.icon}</span>
                                            )}
                                            <h4 className="font-bold text-gray-900 dark:text-white">{r.title}</h4>
                                        </div>
                                        <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">
                                            {new Date(r.date).toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
                                        </p>
                                        <p className="text-sm text-gray-600 dark:text-gray-300 line-clamp-2">{r.notes}</p>
                                        {r.tags && r.tags.length > 0 && (
                                            <div className="flex flex-wrap gap-1 mt-2">
                                                {r.tags.map(tag => (
                                                    <span key={tag} className="px-2 py-0.5 rounded-full text-xs bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-400">
                                                        #{tag}
                                                    </span>
                                                ))}
                                            </div>
                                        )}
                                        {r.attachment_url && (
                                            <div className="mt-2 flex items-center gap-1 text-xs text-indigo-600 dark:text-indigo-400">
                                                <FileTextIcon className="w-3 h-3" />
                                                <span>Ada lampiran</span>
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                    </div>
                ) : (
                    <div className="text-center py-16 text-gray-400">
                        <BookOpenIcon className="w-16 h-16 mx-auto mb-4 text-gray-600" />
                        <h4 className="font-semibold">{reports.length === 0 ? 'Tidak Ada Catatan' : 'Tidak Ada Hasil'}</h4>
                        <p>{reports.length === 0 ? 'Belum ada catatan untuk siswa ini.' : 'Coba ubah filter pencarian.'}</p>
                    </div>
                )
            )}
        </div>
    );
};
