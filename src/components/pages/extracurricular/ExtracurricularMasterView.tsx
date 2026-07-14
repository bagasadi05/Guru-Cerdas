import React, { useState, useMemo } from 'react';
import { Trophy, Plus, Search, Calendar, GraduationCap, Users } from 'lucide-react';
import { Extracurricular, CATEGORIES } from './types';

interface ExtracurricularMasterViewProps {
    extracurriculars: Extracurricular[];
    loading: boolean;
    onSelectExtracurricular: (id: string) => void;
    onOpenModal: (extracurricular?: Extracurricular) => void;
    onDeleteExtracurricular: (extracurricular: Extracurricular) => void;
    canAdd?: boolean;
}

export const ExtracurricularMasterView: React.FC<ExtracurricularMasterViewProps> = ({
    extracurriculars,
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
        return extracurriculars.filter((e) => {
            const matchesSearch = e.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                e.category?.toLowerCase().includes(searchTerm.toLowerCase());
            if (!matchesSearch) return false;
            if (categoryFilter !== 'all' && e.category !== categoryFilter) return false;
            if (statusFilter === 'active' && !e.is_active) return false;
            if (statusFilter === 'inactive' && e.is_active) return false;
            return true;
        });
    }, [extracurriculars, searchTerm, categoryFilter, statusFilter]);

    const stats = useMemo(() => {
        const active = extracurriculars.filter((e) => e.is_active).length;
        return {
            total: extracurriculars.length,
            active,
            inactive: extracurriculars.length - active,
        };
    }, [extracurriculars]);

    return (
        <div className="flex flex-col gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Stats Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-4 shadow-sm hover:shadow-md transition-shadow">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="w-8 h-8 rounded-lg bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center text-amber-600 dark:text-amber-400">
                            <Trophy className="w-4 h-4" />
                        </div>
                        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Total Ekskul</p>
                    </div>
                    <p className="text-3xl font-bold text-slate-800 dark:text-white pl-11">{stats.total}</p>
                </div>
                <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-4 shadow-sm hover:shadow-md transition-shadow">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="w-8 h-8 rounded-lg bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
                            <GraduationCap className="w-4 h-4" />
                        </div>
                        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Ekskul Aktif</p>
                    </div>
                    <p className="text-3xl font-bold text-emerald-600 dark:text-emerald-400 pl-11">{stats.active}</p>
                </div>
                <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-4 shadow-sm hover:shadow-md transition-shadow col-span-2 sm:col-span-1">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-slate-700 flex items-center justify-center text-slate-500 dark:text-slate-400">
                            <Calendar className="w-4 h-4" />
                        </div>
                        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Nonaktif</p>
                    </div>
                    <p className="text-3xl font-bold text-slate-600 dark:text-slate-400 pl-11">{stats.inactive}</p>
                </div>
            </div>

            {/* Filters */}
            <div className="flex flex-col sm:flex-row gap-3 bg-white/70 dark:bg-slate-900/40 border border-slate-200 dark:border-slate-700 rounded-2xl p-3 shadow-sm backdrop-blur-sm">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                    <input
                        type="text"
                        placeholder="Cari ekstrakurikuler..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-white focus:ring-2 focus:ring-amber-500 focus:border-transparent transition-all"
                    />
                </div>
                <div className="flex flex-wrap items-center gap-2">
                    <select
                        value={categoryFilter}
                        onChange={(e) => setCategoryFilter(e.target.value)}
                        className="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm font-medium text-slate-700 dark:text-slate-300 focus:ring-2 focus:ring-amber-500 transition-all"
                    >
                        <option value="all">Semua Kategori</option>
                        {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                    <select
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value as any)}
                        className="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm font-medium text-slate-700 dark:text-slate-300 focus:ring-2 focus:ring-amber-500 transition-all"
                    >
                        <option value="all">Semua Status</option>
                        <option value="active">Aktif</option>
                        <option value="inactive">Nonaktif</option>
                    </select>
                </div>
            </div>

            {/* Grid */}
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {loading ? (
                    [...Array(8)].map((_, i) => (
                        <div key={i} className="h-56 rounded-2xl bg-slate-200 dark:bg-slate-800 animate-pulse" />
                    ))
                ) : filteredExtracurriculars.length === 0 ? (
                    <div className="col-span-full text-center py-16 bg-white dark:bg-slate-800 rounded-3xl border border-slate-200 dark:border-slate-700 border-dashed">
                        <Trophy className="w-16 h-16 mx-auto text-slate-300 dark:text-slate-600 mb-4" />
                        <h3 className="text-lg font-semibold text-slate-700 dark:text-slate-300 mb-1">
                            Belum Ada Ekstrakurikuler
                        </h3>
                        <p className="text-slate-500 dark:text-slate-400 mb-6 max-w-md mx-auto">
                            Anda belum menambahkan data ekstrakurikuler atau tidak ada data yang cocok dengan pencarian Anda.
                        </p>
                        {canAdd && (
                            <button type="button"
                                onClick={() => onOpenModal()}
                                className="inline-flex items-center gap-2 px-6 py-2.5 bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded-xl font-medium shadow-lg hover:shadow-xl hover:scale-105 transition-all"
                            >
                                <Plus className="w-5 h-5" />
                                Tambah Ekskul
                            </button>
                        )}
                    </div>
                ) : (
                    filteredExtracurriculars.map((extracurricular) => (
                        <div
                            key={extracurricular.id}
                            onClick={() => onSelectExtracurricular(extracurricular.id)}
                            className="group relative flex flex-col p-5 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm hover:shadow-xl hover:border-amber-300 dark:hover:border-amber-700/50 hover:-translate-y-1 transition-all cursor-pointer overflow-hidden"
                        >
                            {/* Decorative background glow */}
                            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-amber-400 to-orange-500 opacity-0 group-hover:opacity-100 transition-opacity" />
                            <div className="absolute -right-6 -top-6 w-24 h-24 bg-gradient-to-br from-amber-500/10 to-orange-500/10 rounded-full blur-2xl group-hover:bg-amber-500/20 transition-colors" />

                            <div className="flex items-start justify-between mb-4 relative z-10">
                                <div className="flex items-center gap-3">
                                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center shadow-md shadow-amber-500/20 group-hover:scale-110 transition-transform">
                                        <Trophy className="w-6 h-6 text-white" />
                                    </div>
                                    <div>
                                        <h3 className="font-bold text-slate-800 dark:text-white line-clamp-1">{extracurricular.name}</h3>
                                        <span className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300">
                                            {extracurricular.category || 'Lainnya'}
                                        </span>
                                    </div>
                                </div>
                            </div>

                            <div className="flex-1 text-sm text-slate-600 dark:text-slate-400 space-y-2.5 mb-5 relative z-10">
                                {extracurricular.description && (
                                    <p className="line-clamp-2 text-xs text-slate-500 dark:text-slate-400 mb-3">{extracurricular.description}</p>
                                )}
                                {extracurricular.schedule_day && (
                                    <div className="flex items-center gap-2">
                                        <Calendar className="w-4 h-4 text-amber-500" />
                                        <span className="font-medium">
                                            {extracurricular.schedule_day}
                                            {extracurricular.schedule_time && ` • ${extracurricular.schedule_time}`}
                                        </span>
                                    </div>
                                )}
                                {extracurricular.coach_name && (
                                    <div className="flex items-center gap-2">
                                        <GraduationCap className="w-4 h-4 text-emerald-500" />
                                        <span className="line-clamp-1">Pembina: {extracurricular.coach_name}</span>
                                    </div>
                                )}
                                <div className="flex items-center gap-2">
                                    <Users className="w-4 h-4 text-blue-500" />
                                    <span>Maks: {extracurricular.max_participants} peserta</span>
                                </div>
                            </div>

                            {/* Actions Overlay */}
                            <div className="mt-auto pt-4 border-t border-slate-100 dark:border-slate-700 flex gap-2 relative z-10" onClick={(e) => e.stopPropagation()}>
                                <button type="button"
                                    onClick={() => onOpenModal(extracurricular)}
                                    className="flex-1 px-3 py-1.5 text-xs font-semibold bg-slate-50 dark:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-lg hover:bg-amber-50 hover:text-amber-600 dark:hover:bg-amber-900/30 dark:hover:text-amber-400 transition-colors"
                                >
                                    Edit
                                </button>
                                <button type="button"
                                    onClick={() => onDeleteExtracurricular(extracurricular)}
                                    className="px-3 py-1.5 text-xs font-semibold bg-slate-50 dark:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-lg hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-900/30 dark:hover:text-red-400 transition-colors"
                                >
                                    Hapus
                                </button>
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
};
