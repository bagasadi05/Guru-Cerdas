import React, { useMemo, useState } from 'react';
import { CardTitle, CardDescription } from '../../ui/Card';
import { Button } from '../../ui/Button';
import { PlusIcon, BookOpenIcon, PencilIcon, TrashIcon, SearchIcon, CalendarIcon, FileTextIcon, XIcon, User, HeartPulse, Trophy, Paperclip } from 'lucide-react';
import { ReportRow } from './types';

// Report Categories
export const REPORT_CATEGORIES = {
    akademik: { label: 'Akademik', color: 'indigo', description: 'Catatan terkait pembelajaran & nilai' },
    perilaku: { label: 'Perilaku', color: 'slate', description: 'Catatan sikap & perilaku siswa' },
    kesehatan: { label: 'Kesehatan', color: 'emerald', description: 'Catatan kondisi kesehatan' },
    prestasi: { label: 'Prestasi', color: 'indigo', description: 'Pencapaian & prestasi siswa' },
    lainnya: { label: 'Lainnya', color: 'slate', description: 'Catatan umum lainnya' },
} as const;

export const renderReportCategoryIcon = (category: string | null | undefined, className = "w-3.5 h-3.5 shrink-0 inline mr-1") => {
    switch (category) {
        case 'akademik': return <BookOpenIcon className={className} />;
        case 'perilaku': return <User className={className} />;
        case 'kesehatan': return <HeartPulse className={className} />;
        case 'prestasi': return <Trophy className={className} />;
        default: return <FileTextIcon className={className} />;
    }
};

// Spelled out in full so Tailwind's scanner generates every class.
const CATEGORY_TONES: Record<string, { dot: string; card: string; chip: string }> = {
    indigo: {
        dot: 'bg-indigo-500',
        card: 'from-indigo-50/50 dark:from-indigo-900/10 border-indigo-100 dark:border-indigo-800/30',
        chip: 'bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300',
    },
    emerald: {
        dot: 'bg-emerald-500',
        card: 'from-emerald-50/50 dark:from-emerald-900/10 border-emerald-100 dark:border-emerald-800/30',
        chip: 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300',
    },
    slate: {
        dot: 'bg-slate-500',
        card: 'from-slate-50/50 dark:from-slate-900/10 border-slate-200 dark:border-slate-700/50',
        chip: 'bg-slate-100 dark:bg-slate-700/50 text-slate-700 dark:text-slate-300',
    },
};

export type ReportCategory = keyof typeof REPORT_CATEGORIES;

const getReportCategory = (category: string | null | undefined) => (
    category && category in REPORT_CATEGORIES
        ? REPORT_CATEGORIES[category as ReportCategory]
        : null
);

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
    currentUserId?: string;
    canAdd?: boolean;
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

    const statItems = [
        { label: 'Total Catatan', value: stats.total, badgeBg: 'bg-slate-600', icon: FileTextIcon },
        { label: 'Akademik', value: stats.byCategory.akademik || 0, badgeBg: 'bg-blue-600', icon: BookOpenIcon },
        { label: 'Perilaku', value: stats.byCategory.perilaku || 0, badgeBg: 'bg-violet-600', icon: User },
        { label: 'Prestasi', value: stats.byCategory.prestasi || 0, badgeBg: 'bg-amber-500', icon: Trophy },
        { label: 'Bulan Ini', value: stats.thisMonth, badgeBg: 'bg-emerald-600', icon: CalendarIcon },
        { label: 'Lampiran', value: stats.withAttachment, badgeBg: 'bg-teal-600', icon: Paperclip },
    ];

    return (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mb-6">
            {statItems.map((item) => (
                <div
                    key={item.label}
                    className="bg-slate-50/80 dark:bg-slate-900/60 rounded-2xl border border-slate-200/80 dark:border-slate-700/60 p-3 sm:p-3.5 flex items-center gap-3 transition-all hover:border-slate-300 dark:hover:border-slate-600 shadow-xs"
                >
                    <div className={`w-10 h-10 sm:w-11 sm:h-11 rounded-xl flex items-center justify-center shrink-0 shadow-sm ${item.badgeBg}`}>
                        <item.icon className="w-5 h-5 text-white" strokeWidth={2.2} />
                    </div>
                    <div className="flex flex-col justify-center min-w-0">
                        <p className="text-base sm:text-lg font-bold text-slate-900 dark:text-white leading-tight truncate">
                            {item.value}
                        </p>
                        <p className="text-xs text-slate-500 dark:text-slate-400 font-medium truncate mt-0.5">
                            {item.label}
                        </p>
                    </div>
                </div>
            ))}
        </div>
    );
};

// Timeline View Component
const TimelineView: React.FC<{
    reports: ReportRow[];
    onEdit: (r: ReportRow) => void;
    onDelete: (id: string) => void;
    isOnline: boolean;
    currentUserId?: string;
}> = ({ reports, onEdit, onDelete, isOnline, currentUserId }) => {
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
            <div className="flex flex-col items-center justify-center py-16 text-center">
                <div className="w-16 h-16 rounded-2xl bg-slate-100 dark:bg-slate-800/50 flex items-center justify-center mb-4">
                    <BookOpenIcon className="w-8 h-8 text-slate-400 dark:text-slate-600" />
                </div>
                <h4 className="text-lg font-semibold text-slate-900 dark:text-white">Tidak Ada Catatan</h4>
                <p className="text-sm text-slate-500 dark:text-slate-400">Belum ada catatan guru untuk siswa ini.</p>
            </div>
        );
    }

    return (
        <div className="relative">
            {/* Timeline line */}
            <div className="absolute left-6 top-0 bottom-0 w-0.5 bg-gradient-to-b from-emerald-500 via-teal-500 to-indigo-500" />

            {monthKeys.map((monthKey) => (
                <div key={monthKey} className="mb-8">
                    {/* Month header */}
                    <div className="flex items-center gap-3 mb-4 relative">
                        <div className="w-12 h-12 rounded-full bg-emerald-600 flex items-center justify-center z-10">
                            <CalendarIcon className="w-5 h-5 text-white" />
                        </div>
                        <h3 className="text-lg font-bold text-gray-800 dark:text-white">{monthKey}</h3>
                        <span className="text-sm text-gray-400">({groupedReports[monthKey].length} catatan)</span>
                    </div>

                    {/* Reports in this month */}
                    <div className="ml-6 space-y-4">
                        {groupedReports[monthKey].map((report) => {
                            const category = getReportCategory(report.category);
                            const tone = CATEGORY_TONES[category?.color ?? 'slate'] ?? CATEGORY_TONES.slate;

                            return (
                                <div
                                    key={report.id}
                                    className="group relative pl-8 pb-4 border-l-2 border-gray-200 dark:border-gray-700 last:border-l-0"
                                >
                                    {/* Timeline dot */}
                                    <div className={`absolute -left-1.5 top-0 w-3 h-3 rounded-full ${tone.dot} ring-4 ring-white dark:ring-slate-800`} />

                                    {/* Card */}
                                    <div className={`relative p-4 rounded-xl bg-gradient-to-r to-transparent border hover:shadow-lg transition-shadow ${tone.card}`}>
                                        {/* Actions */}
                                        <div className="reveal-on-hover absolute top-2 right-2 flex gap-1">
                                            <Button variant="ghost" size="icon" className="h-11 w-11 lg:h-9 lg:w-9" onClick={() => onEdit(report)} disabled={!isOnline || report.user_id !== currentUserId} aria-label="Edit laporan">
                                                <PencilIcon className="h-4 w-4" />
                                            </Button>
                                            <Button variant="ghost" size="icon" className="h-11 w-11 lg:h-9 lg:w-9 text-red-600 dark:text-red-400" onClick={() => onDelete(report.id)} disabled={!isOnline || report.user_id !== currentUserId} aria-label="Hapus laporan">
                                                <TrashIcon className="h-4 w-4" />
                                            </Button>
                                        </div>

                                        {/* Header */}
                                        <div className="flex flex-wrap items-start gap-x-3 gap-y-1 mb-2 pr-24 lg:pr-20">
                                            {category && (
                                                <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold ${tone.chip}`}>
                                                    {renderReportCategoryIcon(report.category)}
                                                    <span>{category.label}</span>
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

export const ReportsTab: React.FC<ReportsTabProps> = ({ reports, onAdd, onEdit, onDelete, isOnline, currentUserId, canAdd = true }) => {
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
        <div className="p-4 sm:p-6 space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-4 border-b border-slate-100 dark:border-slate-800/60">
                <div>
                    <CardTitle className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2.5">
                        <BookOpenIcon className="w-5 h-5 text-emerald-500 shrink-0" /> Catatan Guru
                    </CardTitle>
                    <CardDescription className="mt-1 text-slate-500 dark:text-slate-400 text-sm">
                        Catatan perkembangan, laporan, atau insiden khusus.
                    </CardDescription>
                </div>
                <div className="flex items-center gap-2.5 self-start sm:self-auto shrink-0">
                    <Button
                        onClick={onAdd}
                        disabled={!isOnline || !canAdd}
                        className="h-10 px-4 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-medium rounded-xl shadow-sm transition-all flex items-center gap-2 text-sm whitespace-nowrap"
                    >
                        <PlusIcon className="w-4 h-4" />
                        Tambah Catatan
                    </Button>
                </div>
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
                        className="w-full pl-10 pr-4 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder:text-gray-400 focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
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
                        <option key={key} value={key}>{cat.label}</option>
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
                    <button type="button"
                        onClick={() => setViewMode('timeline')}
                        className={`px-3 py-2 text-sm ${viewMode === 'timeline' ? 'bg-emerald-600 text-white' : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-400'}`}
                    >
                        Timeline
                    </button>
                    <button type="button"
                        onClick={() => setViewMode('list')}
                        className={`px-3 py-2 text-sm ${viewMode === 'list' ? 'bg-emerald-600 text-white' : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-400'}`}
                    >
                        List
                    </button>
                </div>

                {/* Clear Filters */}
                {hasActiveFilters && (
                    <button type="button"
                        onClick={clearFilters}
                        className="px-3 py-2 text-sm text-emerald-600 dark:text-emerald-400 hover:underline flex items-center gap-1"
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
                    currentUserId={currentUserId}
                />
            ) : (
                /* List View */
                filteredReports.length > 0 ? (
                    <div className="space-y-3">
                        {[...filteredReports]
                            .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                            .map(r => {
                                const category = getReportCategory(r.category);
                                return (
                                    <div key={r.id} className="group relative p-4 rounded-lg bg-gray-50 dark:bg-black/20 hover:bg-gray-100 dark:hover:bg-black/30 transition-colors">
                                        <div className="absolute top-3 right-3 opacity-100 lg:opacity-0 lg:group-hover:opacity-100 lg:group-focus-within:opacity-100 transition-opacity">
                                            <Button variant="ghost" size="icon" className="h-10 w-10 lg:h-8 lg:w-8 min-h-[40px] min-w-[40px] lg:min-h-0 lg:min-w-0" onClick={() => onEdit(r)} disabled={!isOnline || r.user_id !== currentUserId} aria-label="Edit laporan">
                                                <PencilIcon className="h-4 w-4" />
                                            </Button>
                                            <Button variant="ghost" size="icon" className="h-10 w-10 lg:h-8 lg:w-8 min-h-[40px] min-w-[40px] lg:min-h-0 lg:min-w-0 text-red-600 dark:text-red-400" onClick={() => onDelete(r.id)} disabled={!isOnline || r.user_id !== currentUserId} aria-label="Hapus laporan">
                                                <TrashIcon className="h-4 w-4" />
                                            </Button>
                                        </div>
                                        <div className="flex items-center gap-2 mb-1">
                                            {category && renderReportCategoryIcon(r.category)}
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
                                            <div className="mt-2 flex items-center gap-1 text-xs text-emerald-600 dark:text-emerald-400">
                                                <FileTextIcon className="w-3 h-3" />
                                                <span>Ada lampiran</span>
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                    </div>
                ) : (
                    <div className="flex flex-col items-center justify-center py-16 text-center">
                        <div className="w-16 h-16 rounded-2xl bg-slate-100 dark:bg-slate-800/50 flex items-center justify-center mb-4">
                            <BookOpenIcon className="w-8 h-8 text-slate-400 dark:text-slate-600" />
                        </div>
                        <h4 className="text-lg font-semibold text-slate-900 dark:text-white">{reports.length === 0 ? 'Tidak Ada Catatan' : 'Tidak Ada Hasil'}</h4>
                        <p className="text-sm text-slate-500 dark:text-slate-400">{reports.length === 0 ? 'Belum ada catatan untuk siswa ini.' : 'Coba ubah filter pencarian.'}</p>
                    </div>
                )
            )}
        </div>
    );
};
