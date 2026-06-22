import React, { useState, useMemo, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../../../../hooks/useAuth';
import {
    getAllDeletedItems,
    SoftDeleteEntity,
    DeletedItem,
} from '../../../../services/SoftDeleteService';
import {
    Users,
    BookOpen,
    ClipboardCheck,
    FileText,
    ShieldAlert,
    Star,
    BarChart3,
    CalendarDays,
    MessageSquare,
    GraduationCap,
    Trophy,
    School,
    Megaphone,
    FolderKanban,
    Calendar,
    Settings,
    BookMarked,
} from 'lucide-react';

// Entity configuration
export const entityConfig: Partial<Record<SoftDeleteEntity, {
    label: string;
    labelPlural: string;
    icon: React.ReactNode;
    color: string;
    bgColor: string;
    borderColor: string;
}>> = {
    students: {
        label: 'Siswa',
        labelPlural: 'Siswa',
        icon: <Users className="w-4 h-4" />,
        color: 'text-blue-500',
        bgColor: 'bg-blue-500/10',
        borderColor: 'border-blue-500/20',
    },
    classes: {
        label: 'Kelas',
        labelPlural: 'Kelas',
        icon: <BookOpen className="w-4 h-4" />,
        color: 'text-purple-500',
        bgColor: 'bg-purple-500/10',
        borderColor: 'border-purple-500/20',
    },
    attendance: {
        label: 'Absensi',
        labelPlural: 'Absensi',
        icon: <ClipboardCheck className="w-4 h-4" />,
        color: 'text-green-500',
        bgColor: 'bg-green-500/10',
        borderColor: 'border-green-500/20',
    },
    tasks: {
        label: 'Tugas',
        labelPlural: 'Tugas',
        icon: <FileText className="w-4 h-4" />,
        color: 'text-amber-500',
        bgColor: 'bg-amber-500/10',
        borderColor: 'border-amber-500/20',
    },
    violations: {
        label: 'Pelanggaran',
        labelPlural: 'Pelanggaran',
        icon: <ShieldAlert className="w-4 h-4" />,
        color: 'text-red-500',
        bgColor: 'bg-red-500/10',
        borderColor: 'border-red-500/20',
    },
    quiz_points: {
        label: 'Poin',
        labelPlural: 'Poin',
        icon: <Star className="w-4 h-4" />,
        color: 'text-amber-500',
        bgColor: 'bg-amber-500/10',
        borderColor: 'border-amber-500/20',
    },
    academic_records: {
        label: 'Nilai',
        labelPlural: 'Nilai',
        icon: <BarChart3 className="w-4 h-4" />,
        color: 'text-indigo-500',
        bgColor: 'bg-indigo-500/10',
        borderColor: 'border-indigo-500/20',
    },
    reports: {
        label: 'Laporan',
        labelPlural: 'Laporan',
        icon: <FileText className="w-4 h-4" />,
        color: 'text-cyan-500',
        bgColor: 'bg-cyan-500/10',
        borderColor: 'border-cyan-500/20',
    },
    schedules: {
        label: 'Jadwal',
        labelPlural: 'Jadwal',
        icon: <CalendarDays className="w-4 h-4" />,
        color: 'text-orange-500',
        bgColor: 'bg-orange-500/10',
        borderColor: 'border-orange-500/20',
    },
    communications: {
        label: 'Komunikasi',
        labelPlural: 'Komunikasi',
        icon: <MessageSquare className="w-4 h-4" />,
        color: 'text-teal-500',
        bgColor: 'bg-teal-500/10',
        borderColor: 'border-teal-500/20',
    },
    homework: {
        label: 'PR',
        labelPlural: 'PR',
        icon: <BookMarked className="w-4 h-4" />,
        color: 'text-violet-500',
        bgColor: 'bg-violet-500/10',
        borderColor: 'border-violet-500/20',
    },
    extracurriculars: {
        label: 'Ekskul',
        labelPlural: 'Ekskul',
        icon: <GraduationCap className="w-4 h-4" />,
        color: 'text-pink-500',
        bgColor: 'bg-pink-500/10',
        borderColor: 'border-pink-500/20',
    },
    student_achievements: {
        label: 'Prestasi',
        labelPlural: 'Prestasi',
        icon: <Trophy className="w-4 h-4" />,
        color: 'text-yellow-500',
        bgColor: 'bg-yellow-500/10',
        borderColor: 'border-yellow-500/20',
    },
    school_info: {
        label: 'Info Sekolah',
        labelPlural: 'Info Sekolah',
        icon: <School className="w-4 h-4" />,
        color: 'text-sky-500',
        bgColor: 'bg-sky-500/10',
        borderColor: 'border-sky-500/20',
    },
    announcements: {
        label: 'Pengumuman',
        labelPlural: 'Pengumuman',
        icon: <Megaphone className="w-4 h-4" />,
        color: 'text-rose-500',
        bgColor: 'bg-rose-500/10',
        borderColor: 'border-rose-500/20',
    },
    academic_years: {
        label: 'Tahun Ajaran',
        labelPlural: 'Tahun Ajaran',
        icon: <Calendar className="w-4 h-4" />,
        color: 'text-lime-500',
        bgColor: 'bg-lime-500/10',
        borderColor: 'border-lime-500/20',
    },
    semesters: {
        label: 'Semester',
        labelPlural: 'Semester',
        icon: <FolderKanban className="w-4 h-4" />,
        color: 'text-emerald-500',
        bgColor: 'bg-emerald-500/10',
        borderColor: 'border-emerald-500/20',
    },
    user_settings: {
        label: 'Pengaturan',
        labelPlural: 'Pengaturan',
        icon: <Settings className="w-4 h-4" />,
        color: 'text-slate-500',
        bgColor: 'bg-slate-500/10',
        borderColor: 'border-slate-500/20',
    },
};

// Sorting options
export type SortOption = 'newest' | 'oldest' | 'expiring' | 'name_asc' | 'name_desc' | 'remaining';

export const sortOptions: { value: SortOption; label: string }[] = [
    { value: 'newest', label: 'Terbaru Dihapus' },
    { value: 'oldest', label: 'Terlama Dihapus' },
    { value: 'expiring', label: 'Segera Dihapus' },
    { value: 'remaining', label: 'Sisa Waktu' },
    { value: 'name_asc', label: 'Nama A-Z' },
    { value: 'name_desc', label: 'Nama Z-A' },
];

// Get display name for an item
export function getItemDisplayName(item: DeletedItem): string {
    const data = item.data;
    switch (item.entity) {
        case 'students':
            return data.name || data.nama || 'Siswa';
        case 'classes':
            return data.name || data.nama || 'Kelas';
        case 'attendance':
            return `Absensi ${data.date || data.tanggal || ''}`;
        case 'tasks':
            return data.title || data.judul || 'Tugas';
        case 'violations':
            return data.description || data.jenis || 'Pelanggaran';
        case 'quiz_points':
            return data.activity || data.keterangan || 'Poin';
        case 'academic_records':
            return data.subject || data.mapel || 'Nilai';
        case 'reports':
            return data.title || data.judul || 'Laporan';
        case 'schedules':
            return `${data.subject || ''} ${data.day || ''}`;
        case 'communications':
            return data.message?.substring(0, 50) || 'Komunikasi';
        case 'homework':
            return data.title || data.judul || 'PR';
        case 'extracurriculars':
            return data.name || data.nama || 'Ekskul';
        case 'student_extracurriculars':
            return 'Anggota Ekskul';
        case 'extracurricular_attendance':
            return `Absensi ${data.date || ''}`;
        case 'extracurricular_grades':
            return `${data.grade || ''} - ${data.student_name || ''}`;
        case 'extracurricular_students':
            return data.name || 'Siswa Ekskul';
        case 'student_achievements':
            return data.title || data.judul || 'Prestasi';
        case 'student_development_analyses':
            return 'Analisis Perkembangan';
        case 'school_info':
            return data.school_name || 'Info Sekolah';
        case 'announcements':
            return data.title || data.judul || 'Pengumuman';
        case 'academic_years':
            return data.name || 'Tahun Ajaran';
        case 'semesters':
            return data.name || 'Semester';
        case 'user_settings':
            return 'Pengaturan User';
        default:
            return 'Item';
    }
}

// Get additional info for an item
export function getItemSubtitle(item: DeletedItem): string {
    const data = item.data;
    switch (item.entity) {
        case 'students':
            return data.class_name || data.nis || '';
        case 'classes':
            return `${data.student_count || 0} siswa`;
        case 'attendance':
            return data.status || '';
        case 'tasks':
            return data.due_date || data.deadline || '';
        case 'violations':
            return `${data.points || 0} poin`;
        case 'quiz_points':
            return `${data.points || 0} poin`;
        case 'academic_records':
            return data.assessment_name || data.keterangan || '';
        case 'reports':
            return data.category || '';
        case 'schedules':
            return `${data.start_time || ''}-${data.end_time || ''}`;
        case 'communications':
            return data.sender || '';
        case 'homework':
            return data.subject || '';
        case 'extracurriculars':
            return data.category || '';
        case 'student_achievements':
            return `${data.category || ''} - ${data.level || ''}`;
        case 'school_info':
            return data.school_address || '';
        case 'announcements':
            return data.date || '';
        case 'academic_years':
            return `${data.start_date || ''} - ${data.end_date || ''}`;
        case 'semesters':
            return `${data.semester_number || ''}`;
        default:
            return '';
    }
}

export function getViolationRiskBadge(item: DeletedItem): string | null {
    if (item.entity !== 'violations') return null;
    const points = Number(item.data?.points ?? 0);
    if (Number.isNaN(points)) return null;
    return points >= 50 ? 'Risiko Tinggi' : null;
}

// Format relative time
export const formatDeletedTime = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return 'Hari ini';
    if (diffDays === 1) return 'Kemarin';
    if (diffDays < 7) return `${diffDays} hari lalu`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} minggu lalu`;
    return date.toLocaleDateString('id-ID');
};

export const useTrashData = () => {
    const { user } = useAuth();

    // UI and selection states
    const [searchQuery, setSearchQuery] = useState('');
    const [filterEntity, setFilterEntity] = useState<SoftDeleteEntity | 'all'>('all');
    const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
    const [sortBy, setSortBy] = useState<SortOption>('newest');
    const [showExpiringOnly, setShowExpiringOnly] = useState(false);

    // Modal triggers states
    const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
    const [confirmBulkDelete, setConfirmBulkDelete] = useState(false);
    const [viewDetailItem, setViewDetailItem] = useState<DeletedItem | null>(null);
    const [confirmEmptyTrash, setConfirmEmptyTrash] = useState(false);
    const [confirmRestoreAll, setConfirmRestoreAll] = useState(false);
    const [confirmRestoreEntity, setConfirmRestoreEntity] = useState<SoftDeleteEntity | null>(null);
    const [showInfo, setShowInfo] = useState(false);

    // Query data
    const { data: allDeletedItems = [], isLoading } = useQuery({
        queryKey: ['deleted-items', user?.id],
        queryFn: () => getAllDeletedItems(user!.id),
        enabled: !!user,
        staleTime: 30_000,
    });

    // Client-side filtering based on entity configuration
    const visibleItems = useMemo(() => {
        if (filterEntity === 'all') return allDeletedItems;
        return allDeletedItems.filter(item => item.entity === filterEntity);
    }, [allDeletedItems, filterEntity]);

    // Complex filters, search, and sorting
    const filteredItems = useMemo(() => {
        const items = visibleItems.filter(item => {
            if (filterEntity !== 'all' && item.entity !== filterEntity) {
                return false;
            }
            if (showExpiringOnly && item.daysRemaining > 7) {
                return false;
            }
            if (searchQuery) {
                const displayName = getItemDisplayName(item).toLowerCase();
                const subtitle = getItemSubtitle(item).toLowerCase();
                const entityLabel = (entityConfig[item.entity]?.label || item.entity).toLowerCase();
                const searchTarget = `${displayName} ${subtitle} ${entityLabel}`;
                if (!searchTarget.includes(searchQuery.toLowerCase())) {
                    return false;
                }
            }
            return true;
        });

        // Apply sorting
        items.sort((a, b) => {
            switch (sortBy) {
                case 'newest':
                    return new Date(b.deletedAt).getTime() - new Date(a.deletedAt).getTime();
                case 'oldest':
                    return new Date(a.deletedAt).getTime() - new Date(b.deletedAt).getTime();
                case 'expiring':
                case 'remaining':
                    return a.daysRemaining - b.daysRemaining;
                case 'name_asc':
                    return getItemDisplayName(a).localeCompare(getItemDisplayName(b), 'id-ID');
                case 'name_desc':
                    return getItemDisplayName(b).localeCompare(getItemDisplayName(a), 'id-ID');
                default:
                    return 0;
            }
        });

        return items;
    }, [visibleItems, filterEntity, searchQuery, sortBy, showExpiringOnly]);

    // Group items by entity
    const groupedItems = useMemo(() => {
        const groups: Record<string, DeletedItem[]> = {};

        filteredItems.forEach(item => {
            if (!groups[item.entity]) {
                groups[item.entity] = [];
            }
            groups[item.entity].push(item);
        });

        return groups;
    }, [filteredItems]);

    // Single-pass stats compilation
    const stats = useMemo(() => {
        const base: Record<string, number> = {
            total: allDeletedItems.length,
            expiringToday: 0,
            expiringThisWeek: 0,
        };
        for (const item of allDeletedItems) {
            base[item.entity] = (base[item.entity] || 0) + 1;
            if (item.daysRemaining <= 1) base.expiringToday++;
            if (item.daysRemaining <= 7) base.expiringThisWeek++;
        }
        return base;
    }, [allDeletedItems]);

    // Toggle items selection
    const toggleSelect = (id: string) => {
        const newSelected = new Set(selectedItems);
        if (newSelected.has(id)) {
            newSelected.delete(id);
        } else {
            newSelected.add(id);
        }
        setSelectedItems(newSelected);
    };

    // Select all visible
    const selectAll = () => {
        if (selectedItems.size === filteredItems.length) {
            setSelectedItems(new Set());
        } else {
            setSelectedItems(new Set(filteredItems.map(i => i.id)));
        }
    };

    // Get selected items as array
    const selectedItemsArray = useMemo(() => {
        return filteredItems.filter(i => selectedItems.has(i.id));
    }, [filteredItems, selectedItems]);

    const restoreEntityItems = useMemo(() => {
        if (!confirmRestoreEntity) return [];
        return groupedItems[confirmRestoreEntity] || [];
    }, [confirmRestoreEntity, groupedItems]);

    const hasActiveFilters = Boolean(searchQuery || filterEntity !== 'all' || showExpiringOnly);

    // Cache itemToDelete when modal opens
    const [cachedDeleteItem, setCachedDeleteItem] = useState<DeletedItem | null>(null);

    const itemToDelete = cachedDeleteItem || (confirmDeleteId
        ? visibleItems.find(i => i.id === confirmDeleteId) || allDeletedItems.find(i => i.id === confirmDeleteId) || null
        : null);

    useEffect(() => {
        const timer = setTimeout(() => {
            if (confirmDeleteId) {
                const found = visibleItems.find(i => i.id === confirmDeleteId) || allDeletedItems.find(i => i.id === confirmDeleteId);
                if (found) setCachedDeleteItem(found);
            } else {
                setCachedDeleteItem(null);
            }
        }, 0);
        return () => clearTimeout(timer);
    }, [confirmDeleteId, visibleItems, allDeletedItems]);

    // Cleanup ghost selections when items are permanently deleted or restored
    useEffect(() => {
        const timer = setTimeout(() => {
            const validIds = new Set(allDeletedItems.map(i => i.id));
            setSelectedItems(prev => {
                const next = new Set([...prev].filter(id => validIds.has(id)));
                return next.size === prev.size ? prev : next;
            });
        }, 0);
        return () => clearTimeout(timer);
    }, [allDeletedItems]);

    // Reset selection when changing filters
    useEffect(() => {
        const timer = setTimeout(() => {
            setSelectedItems(new Set());
        }, 0);
        return () => clearTimeout(timer);
    }, [filterEntity]);

    return {
        isLoading,
        allDeletedItems,
        visibleItems,
        filteredItems,
        groupedItems,
        stats,
        searchQuery,
        setSearchQuery,
        filterEntity,
        setFilterEntity,
        selectedItems,
        setSelectedItems,
        sortBy,
        setSortBy,
        showExpiringOnly,
        setShowExpiringOnly,
        confirmDeleteId,
        setConfirmDeleteId,
        confirmBulkDelete,
        setConfirmBulkDelete,
        viewDetailItem,
        setViewDetailItem,
        confirmEmptyTrash,
        setConfirmEmptyTrash,
        confirmRestoreAll,
        setConfirmRestoreAll,
        confirmRestoreEntity,
        setConfirmRestoreEntity,
        showInfo,
        setShowInfo,
        toggleSelect,
        selectAll,
        selectedItemsArray,
        restoreEntityItems,
        hasActiveFilters,
        itemToDelete,
    };
};
