import React, { useState, useMemo } from 'react';
import {
    Trophy,
    Plus,
    Search,
    Calendar,
    GraduationCap,
    Users,
    ChevronRight,
    Pencil,
    Trash2,
    X,
} from 'lucide-react';
import { Extracurricular, CATEGORIES } from './types';

interface ExtracurricularMasterViewProps {
    extracurriculars: Extracurricular[];
    enrollmentCountsByEkskul?: Record<string, number>;
    loading: boolean;
    onSelectExtracurricular: (id: string) => void;
    onOpenModal: (extracurricular?: Extracurricular) => void;
    onDeleteExtracurricular: (extracurricular: Extracurricular) => void;
    canAdd?: boolean;
}

export const ExtracurricularMasterView: React.FC<ExtracurricularMasterViewProps> = ({
    extracurriculars,
    enrollmentCountsByEkskul = {},
    loading,
    onSelectExtracurricular,
    onOpenModal,
    onDeleteExtracurricular,
    canAdd = true,
}) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [categoryFilter, setCategoryFilter] = useState('all');
    const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');

    const filteredExtracurriculars = useMemo(() => {
        const query = searchTerm.trim().toLowerCase();
        return extracurriculars.filter((e) => {
            const matchesSearch =
                !query ||
                e.name.toLowerCase().includes(query) ||
                e.category?.toLowerCase().includes(query) ||
                e.coach_name?.toLowerCase().includes(query) ||
                e.schedule_day?.toLowerCase().includes(query);
            if (!matchesSearch) return false;
            if (categoryFilter !== 'all' && e.category !== categoryFilter) return false;
            if (statusFilter === 'active' && !e.is_active) return false;
            if (statusFilter === 'inactive' && e.is_active) return false;
            return true;
        });
    }, [extracurriculars, searchTerm, categoryFilter, statusFilter]);

    const stats = useMemo(() => {
        const active = extracurriculars.filter((e) => e.is_active !== false).length;
        const totalParticipants = extracurriculars.reduce(
            (sum, e) => sum + (enrollmentCountsByEkskul[e.id] || 0),
            0
        );
        return {
            total: extracurriculars.length,
            active,
            inactive: extracurriculars.length - active,
            totalParticipants,
        };
    }, [extracurriculars, enrollmentCountsByEkskul]);

    const hasActiveFilters = searchTerm.trim().length > 0 || categoryFilter !== 'all' || statusFilter !== 'all';

    return (
        <div className="flex flex-col gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Stats Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
                <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-4 shadow-sm">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="w-9 h-9 rounded-xl bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center text-amber-700 dark:text-amber-400 shrink-0">
                            <Trophy className="w-4 h-4" />
                        </div>
                        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                            Total Ekskul
                        </p>
                    </div>
                    <p className="text-2xl sm:text-3xl font-bold text-slate-800 dark:text-white pl-12">
                        {stats.total}
                    </p>
                </div>

                <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-4 shadow-sm">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="w-9 h-9 rounded-xl bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center text-emerald-700 dark:text-emerald-400 shrink-0">
                            <GraduationCap className="w-4 h-4" />
                        </div>
                        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                            Ekskul Aktif
                        </p>
                    </div>
                    <p className="text-2xl sm:text-3xl font-bold text-emerald-600 dark:text-emerald-400 pl-12">
                        {stats.active}
                    </p>
                </div>

                <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-4 shadow-sm">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="w-9 h-9 rounded-xl bg-sky-100 dark:bg-sky-900/30 flex items-center justify-center text-sky-700 dark:text-sky-400 shrink-0">
                            <Users className="w-4 h-4" />
                        </div>
                        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                            Total Anggota
                        </p>
                    </div>
                    <p className="text-2xl sm:text-3xl font-bold text-sky-600 dark:text-sky-400 pl-12">
                        {stats.totalParticipants}
                    </p>
                </div>

                <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-4 shadow-sm">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="w-9 h-9 rounded-xl bg-slate-100 dark:bg-slate-700 flex items-center justify-center text-slate-600 dark:text-slate-400 shrink-0">
                            <Calendar className="w-4 h-4" />
                        </div>
                        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                            Nonaktif
                        </p>
                    </div>
                    <p className="text-2xl sm:text-3xl font-bold text-slate-600 dark:text-slate-400 pl-12">
                        {stats.inactive}
                    </p>
                </div>
            </div>

            {/* Filters & Action Bar */}
            <div className="flex flex-col sm:flex-row gap-3 bg-white/80 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-2xl p-3 shadow-sm backdrop-blur-sm">
                <div className="relative flex-1">
                    <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                        type="text"
                        aria-label="Cari ekstrakurikuler, pembina, atau hari jadwal"
                        placeholder="Cari nama ekskul, pembina, atau hari jadwal..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-10 pr-9 py-2.5 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-white focus:ring-2 focus:ring-amber-500 focus:border-transparent transition-all"
                    />
                    {searchTerm && (
                        <button
                            type="button"
                            onClick={() => setSearchTerm('')}
                            aria-label="Bersihkan pencarian"
                            className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                        >
                            <X className="w-4 h-4" />
                        </button>
                    )}
                </div>
                <div className="flex flex-wrap items-center gap-2">
                    <select
                        aria-label="Filter kategori ekstrakurikuler"
                        value={categoryFilter}
                        onChange={(e) => setCategoryFilter(e.target.value)}
                        className="px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm font-medium text-slate-700 dark:text-slate-300 focus:ring-2 focus:ring-amber-500 transition-all"
                    >
                        <option value="all">Semua Kategori</option>
                        {CATEGORIES.map((c) => (
                            <option key={c} value={c}>
                                {c}
                            </option>
                        ))}
                    </select>
                    <select
                        aria-label="Filter status ekstrakurikuler"
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value as 'all' | 'active' | 'inactive')}
                        className="px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm font-medium text-slate-700 dark:text-slate-300 focus:ring-2 focus:ring-amber-500 transition-all"
                    >
                        <option value="all">Semua Status</option>
                        <option value="active">Aktif</option>
                        <option value="inactive">Nonaktif</option>
                    </select>
                    {hasActiveFilters && (
                        <button
                            type="button"
                            onClick={() => {
                                setSearchTerm('');
                                setCategoryFilter('all');
                                setStatusFilter('all');
                            }}
                            className="px-3 py-2.5 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:text-rose-600 dark:hover:text-rose-400 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 transition-colors"
                        >
                            Reset Filter
                        </button>
                    )}
                </div>
            </div>

            {/* Grid */}
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {loading ? (
                    [...Array(6)].map((_, i) => (
                        <div
                            key={i}
                            className="h-64 rounded-2xl bg-slate-200 dark:bg-slate-800 animate-pulse"
                        />
                    ))
                ) : filteredExtracurriculars.length === 0 ? (
                    <div className="col-span-full text-center py-16 px-4 bg-white dark:bg-slate-800 rounded-3xl border border-slate-200 dark:border-slate-700 border-dashed">
                        <Trophy className="w-16 h-16 mx-auto text-slate-300 dark:text-slate-600 mb-4" />
                        <h3 className="text-lg font-semibold text-slate-700 dark:text-slate-300 mb-1">
                            {hasActiveFilters
                                ? 'Tidak Ada Ekstrakurikuler yang Cocok'
                                : 'Belum Ada Ekstrakurikuler'}
                        </h3>
                        <p className="text-slate-500 dark:text-slate-400 mb-6 max-w-md mx-auto text-sm">
                            {hasActiveFilters
                                ? 'Coba ubah kata kunci pencarian atau reset filter kategori dan status.'
                                : 'Tambahkan kegiatan ekstrakurikuler pertama Anda untuk mulai mencatat anggota, presensi, dan nilai.'}
                        </p>
                        {hasActiveFilters ? (
                            <button
                                type="button"
                                onClick={() => {
                                    setSearchTerm('');
                                    setCategoryFilter('all');
                                    setStatusFilter('all');
                                }}
                                className="inline-flex items-center gap-2 px-5 py-2.5 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl font-medium hover:bg-slate-200 dark:hover:bg-slate-600 transition-all"
                            >
                                Reset Filter Pencarian
                            </button>
                        ) : (
                            canAdd && (
                                <button
                                    type="button"
                                    onClick={() => onOpenModal()}
                                    className="inline-flex items-center gap-2 px-6 py-2.5 bg-gradient-to-r from-amber-600 to-orange-600 text-white rounded-xl font-semibold shadow-lg hover:shadow-xl hover:scale-105 transition-all"
                                >
                                    <Plus className="w-5 h-5" />
                                    Tambah Ekskul
                                </button>
                            )
                        )}
                    </div>
                ) : (
                    filteredExtracurriculars.map((extracurricular) => {
                        const enrolledCount = enrollmentCountsByEkskul[extracurricular.id] || 0;
                        const maxCount = extracurricular.max_participants || 30;
                        const fillPercent = Math.min(100, Math.round((enrolledCount / Math.max(1, maxCount)) * 100));
                        const isFull = enrolledCount >= maxCount;
                        const isNearFull = !isFull && fillPercent >= 80;
                        const isActive = extracurricular.is_active !== false;

                        return (
                            <div
                                key={extracurricular.id}
                                role="button"
                                tabIndex={0}
                                aria-label={`Pilih ekstrakurikuler ${extracurricular.name}`}
                                onClick={() => onSelectExtracurricular(extracurricular.id)}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter' || e.key === ' ') {
                                        e.preventDefault();
                                        onSelectExtracurricular(extracurricular.id);
                                    }
                                }}
                                className={`group relative flex flex-col p-5 rounded-2xl bg-white dark:bg-slate-800 border shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all cursor-pointer overflow-hidden focus:outline-none focus:ring-2 focus:ring-amber-500 ${
                                    isActive
                                        ? 'border-slate-200 dark:border-slate-700 hover:border-amber-300 dark:hover:border-amber-700/50'
                                        : 'border-slate-200/70 dark:border-slate-800 opacity-80'
                                }`}
                            >
                                {/* Decorative background glow */}
                                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-amber-500 to-orange-600 opacity-0 group-hover:opacity-100 transition-opacity" />
                                <div className="absolute -right-6 -top-6 w-24 h-24 bg-gradient-to-br from-amber-500/10 to-orange-500/10 rounded-full blur-2xl group-hover:bg-amber-500/20 transition-colors" />

                                <div className="flex items-start justify-between gap-2 mb-4 relative z-10">
                                    <div className="flex items-center gap-3 min-w-0">
                                        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center shadow-md shadow-amber-500/20 group-hover:scale-105 transition-transform shrink-0">
                                            <Trophy className="w-6 h-6 text-white" />
                                        </div>
                                        <div className="min-w-0">
                                            <h3 className="font-bold text-slate-800 dark:text-white line-clamp-1">
                                                {extracurricular.name}
                                            </h3>
                                            <div className="flex flex-wrap items-center gap-1.5 mt-1">
                                                <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300">
                                                    {extracurricular.category || 'Lainnya'}
                                                </span>
                                                {!isActive && (
                                                    <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300">
                                                        Nonaktif
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div className="flex-1 text-sm text-slate-600 dark:text-slate-400 space-y-2.5 mb-4 relative z-10">
                                    {extracurricular.description && (
                                        <p className="line-clamp-2 text-xs text-slate-500 dark:text-slate-400 mb-2">
                                            {extracurricular.description}
                                        </p>
                                    )}
                                    <div className="flex items-center gap-2 text-xs sm:text-sm">
                                        <Calendar className="w-4 h-4 text-amber-500 shrink-0" />
                                        <span className="font-medium truncate">
                                            {extracurricular.schedule_day || 'Jadwal belum diatur'}
                                            {extracurricular.schedule_time && ` • ${extracurricular.schedule_time}`}
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-2 text-xs sm:text-sm">
                                        <GraduationCap className="w-4 h-4 text-emerald-500 shrink-0" />
                                        <span className="line-clamp-1">
                                            Pembina: {extracurricular.coach_name || '-'}
                                        </span>
                                    </div>

                                    {/* Participant Capacity Bar */}
                                    <div className="pt-2">
                                        <div className="flex items-center justify-between text-xs mb-1">
                                            <span className="flex items-center gap-1.5 font-medium text-slate-600 dark:text-slate-300">
                                                <Users className="w-3.5 h-3.5 text-sky-500" />
                                                Anggota Terdaftar
                                            </span>
                                            <span
                                                className={`font-bold ${
                                                    isFull
                                                        ? 'text-rose-600 dark:text-rose-400'
                                                        : isNearFull
                                                            ? 'text-amber-600 dark:text-amber-400'
                                                            : 'text-slate-700 dark:text-slate-200'
                                                }`}
                                            >
                                                {enrolledCount} / {maxCount}
                                            </span>
                                        </div>
                                        <div className="w-full h-1.5 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                                            <div
                                                className={`h-full rounded-full transition-all duration-300 ${
                                                    isFull
                                                        ? 'bg-rose-500'
                                                        : isNearFull
                                                            ? 'bg-amber-500'
                                                            : 'bg-emerald-500'
                                                }`}
                                                style={{ width: `${fillPercent}%` }}
                                            />
                                        </div>
                                    </div>
                                </div>

                                {/* Actions Footer */}
                                <div className="mt-auto pt-3 border-t border-slate-100 dark:border-slate-700/70 flex items-center gap-2 relative z-10">
                                    <button
                                        type="button"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            onSelectExtracurricular(extracurricular.id);
                                        }}
                                        className="flex-1 inline-flex items-center justify-center gap-1 px-3 py-1.5 text-xs font-semibold bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-300 rounded-lg hover:bg-amber-100 dark:hover:bg-amber-900/40 transition-colors"
                                    >
                                        Kelola
                                        <ChevronRight className="w-3.5 h-3.5" />
                                    </button>
                                    {canAdd && (
                                        <>
                                            <button
                                                type="button"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    onOpenModal(extracurricular);
                                                }}
                                                aria-label={`Edit ${extracurricular.name}`}
                                                className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold bg-slate-50 dark:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-lg hover:bg-amber-50 hover:text-amber-600 dark:hover:bg-amber-900/30 dark:hover:text-amber-400 transition-colors"
                                            >
                                                <Pencil className="w-3.5 h-3.5" />
                                                Edit
                                            </button>
                                            <button
                                                type="button"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    onDeleteExtracurricular(extracurricular);
                                                }}
                                                aria-label={`Hapus ${extracurricular.name}`}
                                                className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold bg-slate-50 dark:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-lg hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-900/30 dark:hover:text-red-400 transition-colors"
                                            >
                                                <Trash2 className="w-3.5 h-3.5" />
                                                Hapus
                                            </button>
                                        </>
                                    )}
                                </div>
                            </div>
                        );
                    })
                )}
            </div>
        </div>
    );
};
