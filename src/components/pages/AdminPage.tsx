import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Users,
    ShieldCheck,
    Loader2,
    AlertCircle,
    Edit2,
    Save,
    X,
    RefreshCw,
    Search,
    Megaphone,
    Trash2,
    BarChart3,
    Settings,
    Activity,
    AlertTriangle,
    Undo2,
    HardDrive,
    Cpu,
    CheckCircle2,
    Database,
    Server,
    Shield,
    TrendingUp,
    ChevronDown,
    Clock,
} from 'lucide-react';
import { supabase } from '../../services/supabase';
import { useAuth } from '../../hooks/useAuth';

// Import from admin module
import {
    UserRoleRecord,
    SystemStats,
    Announcement,
    AuditLog,
    TabType,
    SystemHealth,
    useRealTimeClock,
    getRoleBadgeClass,
    OverviewTab,
    AnnouncementsTab,
} from './admin';

const USER_PAGE_SIZE = 20;
const LOG_PAGE_SIZE = 25;

const roleLabelMap: Record<string, string> = {
    admin: 'Admin',
    teacher: 'Guru',
    student: 'Siswa',
    parent: 'Orang Tua',
    user: 'Pengguna',
};

const getRoleLabel = (value?: string | null) => {
    if (!value) return roleLabelMap.user;
    return roleLabelMap[value] || value;
};

const sanitizeSearchTerm = (value: string) => value.replace(/[%_,()'"]/g, '').trim();

const AdminPage: React.FC = () => {
    const { user, loading: authLoading } = useAuth();
    const navigate = useNavigate();

    // Core State
    const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
    const [activeTab, setActiveTab] = useState<TabType>('overview');

    // Users State
    const [users, setUsers] = useState<UserRoleRecord[]>([]);
    const [deletedUsers, setDeletedUsers] = useState<UserRoleRecord[]>([]);
    const [showDeletedUsers, setShowDeletedUsers] = useState(false);
    const [usersLoading, setUsersLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');
    const [roleFilter, setRoleFilter] = useState<string>('all');
    const [userPage, setUserPage] = useState(1);
    const [userTotal, setUserTotal] = useState(0);
    const [deletedPage, setDeletedPage] = useState(1);
    const [deletedTotal, setDeletedTotal] = useState(0);
    const [editingUserId, setEditingUserId] = useState<string | null>(null);
    const [newRole, setNewRole] = useState<string>('');
    const [updating, setUpdating] = useState(false);

    // Stats State
    const [stats, setStats] = useState<SystemStats>({
        totalUsers: 0, totalClasses: 0, totalStudents: 0,
        totalAttendance: 0, totalGrades: 0, totalTasks: 0,
        admins: 0, teachers: 0, students: 0
    });
    const [statsLoading, setStatsLoading] = useState(true);

    // Announcements State
    const [announcements, setAnnouncements] = useState<Announcement[]>([]);
    const [announcementsLoading, setAnnouncementsLoading] = useState(true);

    // Activity Logs State
    const [activityLogs, setActivityLogs] = useState<AuditLog[]>([]);
    const [logsLoading, setLogsLoading] = useState(true);
    const [logSearchTerm, setLogSearchTerm] = useState('');
    const [debouncedLogSearchTerm, setDebouncedLogSearchTerm] = useState('');
    const [logPage, setLogPage] = useState(1);
    const [logTotal, setLogTotal] = useState(0);

    // Error State
    const [error, setError] = useState<string | null>(null);

    // Delete Modal State
    const [deleteModal, setDeleteModal] = useState<{ show: boolean; user: UserRoleRecord | null }>({ show: false, user: null });

    // Undo Toast State
    const [undoToast, setUndoToast] = useState<{ show: boolean; user: UserRoleRecord | null; timeout: NodeJS.Timeout | null }>({
        show: false, user: null, timeout: null
    });

    // Real-time clock
    const currentTime = useRealTimeClock();

    // System health states
    const [systemHealth, setSystemHealth] = useState<SystemHealth>({
        database: 'healthy',
        api: 'healthy',
        lastChecked: null,
        databaseLatencyMs: null,
        apiLatencyMs: null
    });

    // Check system health
    const checkSystemHealth = async () => {
        try {
            const dbStart = Date.now();
            const { error: dbError } = await supabase.from('user_roles').select('user_id').limit(1);
            const dbLatency = Date.now() - dbStart;

            const apiStart = Date.now();
            const { error: apiError } = await supabase.auth.getSession();
            const apiLatency = Date.now() - apiStart;

            setSystemHealth({
                database: dbError ? 'down' : dbLatency > 1000 ? 'degraded' : 'healthy',
                api: apiError ? 'down' : apiLatency > 1000 ? 'degraded' : 'healthy',
                lastChecked: new Date(),
                databaseLatencyMs: dbLatency,
                apiLatencyMs: apiLatency
            });
        } catch {
            setSystemHealth(prev => ({
                ...prev,
                database: 'down',
                api: 'down',
                lastChecked: new Date(),
                databaseLatencyMs: null,
                apiLatencyMs: null
            }));
        }
    };

    // Check admin status
    const checkAdminStatus = useCallback(async () => {
        if (!user) return;
        try {
            const { data, error } = await supabase
                .from('user_roles')
                .select('role')
                .eq('user_id', user.id)
                .single();
            if (error || !data || data.role !== 'admin') {
                navigate('/');
                return;
            }
            setIsAdmin(true);
        } catch {
            navigate('/');
        }
    }, [user, navigate]);

    useEffect(() => {
        if (!authLoading) {
            if (!user) navigate('/');
            else checkAdminStatus();
        }
    }, [user, authLoading, checkAdminStatus, navigate]);



    // Fetch system statistics
    const fetchStats = async () => {
        setStatsLoading(true);
        try {
            const [
                { count: usersCount },
                { count: classesCount },
                { count: studentsCount },
                { count: attendanceCount },
                { count: gradesCount },
                { count: tasksCount }
            ] = await Promise.all([
                supabase.from('user_roles').select('*', { count: 'exact', head: true }).is('deleted_at', null),
                supabase.from('classes').select('*', { count: 'exact', head: true }),
                supabase.from('students').select('*', { count: 'exact', head: true }),
                supabase.from('attendance').select('*', { count: 'exact', head: true }),
                supabase.from('academic_records').select('*', { count: 'exact', head: true }),
                supabase.from('tasks').select('*', { count: 'exact', head: true })
            ]);

            // Get role breakdown
            const { data: roleData } = await supabase.from('user_roles').select('role').is('deleted_at', null);
            let admins = 0, teachers = 0, students = 0;
            roleData?.forEach(r => {
                if (r.role === 'admin') admins++;
                else if (r.role === 'teacher') teachers++;
                else if (r.role === 'student') students++;
            });

            setStats({
                totalUsers: usersCount || 0,
                totalClasses: classesCount || 0,
                totalStudents: studentsCount || 0,
                totalAttendance: attendanceCount || 0,
                totalGrades: gradesCount || 0,
                totalTasks: tasksCount || 0,
                admins, teachers, students
            });
        } catch (err) {
            console.error('Error fetching stats:', err);
        } finally {
            setStatsLoading(false);
        }
    };

    // Fetch users (active and deleted separately)
    const fetchUsers = useCallback(async () => {
        setUsersLoading(true);
        const safeSearch = sanitizeSearchTerm(debouncedSearchTerm);
        const activeFrom = (userPage - 1) * USER_PAGE_SIZE;
        const activeTo = activeFrom + USER_PAGE_SIZE - 1;
        const deletedFrom = (deletedPage - 1) * USER_PAGE_SIZE;
        const deletedTo = deletedFrom + USER_PAGE_SIZE - 1;
        try {
            // Fetch active users (not deleted)
            let activeQuery = supabase
                .from('user_roles')
                .select('*', { count: 'exact' })
                .is('deleted_at', null);

            let deletedQuery = supabase
                .from('user_roles')
                .select('*', { count: 'exact' })
                .not('deleted_at', 'is', null);

            if (safeSearch) {
                activeQuery = activeQuery.or(`full_name.ilike.%${safeSearch}%,email.ilike.%${safeSearch}%`);
                deletedQuery = deletedQuery.or(`full_name.ilike.%${safeSearch}%,email.ilike.%${safeSearch}%`);
            }

            if (roleFilter !== 'all') {
                activeQuery = activeQuery.eq('role', roleFilter);
                deletedQuery = deletedQuery.eq('role', roleFilter);
            }

            const [activeResult, deletedResult] = await Promise.all([
                activeQuery
                    .order('created_at', { ascending: false })
                    .range(activeFrom, activeTo),
                deletedQuery
                    .order('deleted_at', { ascending: false })
                    .range(deletedFrom, deletedTo)
            ]);

            if (activeResult.error) throw activeResult.error;
            if (deletedResult.error) throw deletedResult.error;

            setUsers(activeResult.data || []);
            setUserTotal(activeResult.count || 0);
            setDeletedUsers(deletedResult.data || []);
            setDeletedTotal(deletedResult.count || 0);
        } catch (err: unknown) {
            setError((err as Error).message);
            setUsers([]);
            setDeletedUsers([]);
            setUserTotal(0);
            setDeletedTotal(0);
        } finally {
            setUsersLoading(false);
        }
    }, [debouncedSearchTerm, userPage, deletedPage, roleFilter]);

    // Fetch announcements
    const fetchAnnouncements = async () => {
        setAnnouncementsLoading(true);
        try {
            const { data, error } = await supabase
                .from('announcements')
                .select('*')
                .order('created_at', { ascending: false });
            if (error) throw error;
            setAnnouncements(data || []);
        } catch (err) {
            console.error('Announcements fetch error:', err);
            setAnnouncements([]);
        } finally {
            setAnnouncementsLoading(false);
        }
    };

    // Fetch activity logs
    const fetchActivityLogs = useCallback(async () => {
        setLogsLoading(true);
        const safeSearch = sanitizeSearchTerm(debouncedLogSearchTerm);
        const logFrom = (logPage - 1) * LOG_PAGE_SIZE;
        const logTo = logFrom + LOG_PAGE_SIZE - 1;
        try {
            let query = (supabase as any)
                .from('audit_logs')
                .select('id, created_at, user_email, table_name, action, record_id, old_data, new_data', { count: 'exact' })
                .order('created_at', { ascending: false });

            if (safeSearch) {
                query = query.or(`user_email.ilike.%${safeSearch}%,action.ilike.%${safeSearch}%,table_name.ilike.%${safeSearch}%,record_id.ilike.%${safeSearch}%`);
            }

            const { data, error, count } = await query.range(logFrom, logTo);
            if (error) throw error;
            setActivityLogs(data || []);
            setLogTotal(count || 0);
        } catch (err) {
            console.error('Activity logs fetch error:', err);
            setActivityLogs([]);
            setLogTotal(0);
        } finally {
            setLogsLoading(false);
        }
    }, [debouncedLogSearchTerm, logPage]);

    // Log admin action
    const logAdminAction = async (tableName: string, action: string, recordId: string, oldData?: unknown, newData?: unknown) => {
        try {
            await (supabase as any).from('audit_logs').insert({
                user_id: user?.id,
                user_email: user?.email,
                table_name: tableName,
                action: action,
                record_id: recordId,
                old_data: oldData ? oldData : null,
                new_data: newData ? newData : null
            });
        } catch (err) {
            console.error('Failed to log action:', err);
        }
    };

    useEffect(() => {
        if (isAdmin) {
            fetchStats();
            fetchAnnouncements();
            checkSystemHealth();
        }
    }, [isAdmin]);

    useEffect(() => {
        const handle = setTimeout(() => setDebouncedSearchTerm(searchTerm.trim()), 300);
        return () => clearTimeout(handle);
    }, [searchTerm]);

    useEffect(() => {
        const handle = setTimeout(() => setDebouncedLogSearchTerm(logSearchTerm.trim()), 300);
        return () => clearTimeout(handle);
    }, [logSearchTerm]);

    useEffect(() => {
        if (isAdmin) {
            fetchUsers();
        }
    }, [isAdmin, debouncedSearchTerm, roleFilter, userPage, deletedPage, fetchUsers]);

    useEffect(() => {
        if (isAdmin) {
            fetchActivityLogs();
        }
    }, [isAdmin, debouncedLogSearchTerm, logPage, fetchActivityLogs]);

    useEffect(() => {
        const pageCount = Math.max(1, Math.ceil(userTotal / USER_PAGE_SIZE));
        if (userPage > pageCount) {
            setUserPage(pageCount);
        }
    }, [userTotal, userPage]);

    useEffect(() => {
        const pageCount = Math.max(1, Math.ceil(deletedTotal / USER_PAGE_SIZE));
        if (deletedPage > pageCount) {
            setDeletedPage(pageCount);
        }
    }, [deletedTotal, deletedPage]);

    useEffect(() => {
        const pageCount = Math.max(1, Math.ceil(logTotal / LOG_PAGE_SIZE));
        if (logPage > pageCount) {
            setLogPage(pageCount);
        }
    }, [logTotal, logPage]);


    // Update user role
    const handleUpdateRole = async (userId: string) => {
        if (!newRole) return;
        setUpdating(true);
        try {
            const userToUpdate = users.find(u => u.user_id === userId) || null;
            const { error } = await supabase
                .from('user_roles')
                .update({ role: newRole as 'admin' | 'teacher' | 'student' | 'parent' })
                .eq('user_id', userId);
            if (error) throw error;
            const updatedUser = userToUpdate ? { ...userToUpdate, role: newRole } : { user_id: userId, role: newRole };
            await logAdminAction('user_roles', 'UPDATE_ROLE', userId, userToUpdate, updatedUser);
            setEditingUserId(null);
            fetchStats();
            fetchUsers();
            fetchActivityLogs();
        } catch (err: unknown) {
            alert('Error: ' + (err as Error).message);
        } finally {
            setUpdating(false);
        }
    };

    // Soft delete user (sets deleted_at timestamp)
    const openDeleteModal = (userToDelete: UserRoleRecord) => {
        setDeleteModal({ show: true, user: userToDelete });
    };

    const confirmSoftDelete = async () => {
        const userToDelete = deleteModal.user;
        if (!userToDelete) return;

        try {
            // Soft delete: set deleted_at timestamp
            const deletedAt = new Date().toISOString();
            const { error } = await supabase
                .from('user_roles')
                .update({ deleted_at: deletedAt } as any)
                .eq('user_id', userToDelete.user_id);

            if (error) throw error;

            // Log the action
            await logAdminAction(
                'user_roles',
                'SOFT_DELETE',
                userToDelete.user_id,
                userToDelete,
                { ...userToDelete, deleted_at: deletedAt }
            );

            setDeleteModal({ show: false, user: null });
            fetchStats();
            fetchUsers();
            fetchActivityLogs();

            // Show success toast
            setUndoToast({ show: true, user: userToDelete, timeout: null });
            setTimeout(() => setUndoToast({ show: false, user: null, timeout: null }), 3000);
        } catch (err: unknown) {
            setError('Error: ' + (err as Error).message);
        }
    };

    // Restore soft-deleted user
    const restoreUser = async (userToRestore: UserRoleRecord) => {
        try {
            const { error } = await supabase
                .from('user_roles')
                .update({ deleted_at: null } as any)
                .eq('user_id', userToRestore.user_id);

            if (error) throw error;

            await logAdminAction(
                'user_roles',
                'RESTORE',
                userToRestore.user_id,
                userToRestore,
                { ...userToRestore, deleted_at: null }
            );
            fetchStats();
            fetchUsers();
            fetchActivityLogs();
        } catch (err: unknown) {
            setError('Error: ' + (err as Error).message);
        }
    };

    // Permanently delete user (cannot be undone)
    const permanentDeleteUser = async (userId: string) => {
        if (!confirm('HAPUS PERMANEN? Pengguna tidak akan bisa dipulihkan!')) return;

        try {
            const deletedUser = deletedUsers.find(u => u.user_id === userId) || null;
            await supabase.from('user_roles').delete().eq('user_id', userId);
            await logAdminAction('user_roles', 'DELETE', userId, deletedUser, null);
            fetchStats();
            fetchUsers();
            fetchActivityLogs();
        } catch (err: unknown) {
            setError('Error: ' + (err as Error).message);
        }
    };

    // Create announcement
    const handleCreateAnnouncement = async (form: { title: string; content: string; audience_type: string }) => {
        if (!form.title || !form.content) {
            alert('Judul dan konten wajib diisi');
            return;
        }
        try {
            const { data, error } = await supabase.from('announcements').insert({
                title: form.title,
                content: form.content,
                audience_type: form.audience_type || 'all'
            }).select().single();
            if (error) throw error;
            if (data) {
                await logAdminAction('announcements', 'INSERT', data.id, null, data);
            }
            fetchAnnouncements();
            fetchActivityLogs();
        } catch (err: unknown) {
            alert('Error: ' + (err as Error).message);
        }
    };

    // Delete announcement
    const handleDeleteAnnouncement = async (id: string) => {
        if (!confirm('Hapus pengumuman ini?')) return;
        try {
            const announcement = announcements.find(a => a.id === id) || null;
            const { error } = await supabase.from('announcements').delete().eq('id', id);
            if (error) {
                console.error('Delete announcement error:', error);
                alert('Gagal menghapus pengumuman: ' + error.message);
                return;
            }
            await logAdminAction('announcements', 'DELETE', id, announcement, null);
            fetchAnnouncements();
            fetchActivityLogs();
        } catch (err: unknown) {
            console.error('Delete announcement exception:', err);
            alert('Error: ' + (err as Error).message);
        }
    };

    // Loading screen
    if (authLoading || isAdmin === null) {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen bg-white dark:bg-gray-900">
                <Loader2 className="w-12 h-12 animate-spin text-indigo-600 mb-4" />
                <p className="text-gray-500 dark:text-gray-400 animate-pulse">Memuat Dasbor Admin...</p>
            </div>
        );
    }

    const tabs: { id: TabType; label: string; icon: React.ReactNode }[] = [
        { id: 'overview', label: 'Ringkasan', icon: <BarChart3 size={18} /> },
        { id: 'users', label: 'Pengguna', icon: <Users size={18} /> },
        { id: 'announcements', label: 'Pengumuman', icon: <Megaphone size={18} /> },
        { id: 'activity', label: 'Aktivitas', icon: <Activity size={18} /> },
        { id: 'system', label: 'Sistem', icon: <Settings size={18} /> },
    ];

    const userPageCount = Math.max(1, Math.ceil(userTotal / USER_PAGE_SIZE));
    const deletedPageCount = Math.max(1, Math.ceil(deletedTotal / USER_PAGE_SIZE));
    const logPageCount = Math.max(1, Math.ceil(logTotal / LOG_PAGE_SIZE));

    const userRangeStart = userTotal === 0 ? 0 : (userPage - 1) * USER_PAGE_SIZE + 1;
    const userRangeEnd = userTotal === 0 ? 0 : Math.min(userRangeStart + users.length - 1, userTotal);
    const deletedRangeStart = deletedTotal === 0 ? 0 : (deletedPage - 1) * USER_PAGE_SIZE + 1;
    const deletedRangeEnd = deletedTotal === 0 ? 0 : Math.min(deletedRangeStart + deletedUsers.length - 1, deletedTotal);
    const logRangeStart = logTotal === 0 ? 0 : (logPage - 1) * LOG_PAGE_SIZE + 1;
    const logRangeEnd = logTotal === 0 ? 0 : Math.min(logRangeStart + activityLogs.length - 1, logTotal);
    const distributionMax = Math.max(stats.totalStudents, stats.totalAttendance, stats.totalGrades, stats.totalTasks);

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-indigo-50/30 dark:from-gray-900 dark:via-gray-900 dark:to-indigo-950/20">
            <div className="max-w-7xl mx-auto px-4 py-6 md:px-8">

                {/* Header */}
                <header className="mb-8">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div className="flex items-center gap-4">
                            <div className="p-3 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl text-white shadow-lg shadow-indigo-500/30">
                                <ShieldCheck size={28} />
                            </div>
                            <div>
                                <h1 className="text-2xl md:text-3xl font-bold bg-gradient-to-r from-gray-900 to-gray-600 dark:from-white dark:to-gray-400 bg-clip-text text-transparent">
                                    Dasbor Admin
                                </h1>
                                <p className="text-sm text-gray-500 dark:text-gray-400 flex items-center gap-2">
                                    <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                                    Portal Manajemen Sistem
                                </p>
                            </div>
                        </div>

                        {/* Real-time Info */}
                        <div className="hidden md:flex items-center gap-6">
                            <div className="text-right">
                                <p className="text-2xl font-bold text-gray-900 dark:text-white font-mono">
                                    {currentTime.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                                </p>
                                <p className="text-xs text-gray-500 dark:text-gray-400">
                                    {currentTime.toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
                                </p>
                            </div>
                            <button
                                onClick={() => { fetchStats(); fetchUsers(); fetchAnnouncements(); fetchActivityLogs(); checkSystemHealth(); }}
                                className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl hover:border-indigo-500/50 transition-all shadow-sm"
                            >
                                <RefreshCw size={16} className={statsLoading ? 'animate-spin' : ''} />
                                <span className="text-sm font-medium">Muat Ulang</span>
                            </button>
                        </div>
                    </div>

                    {/* Tab Navigation */}
                    <div className="mt-6 flex gap-2 overflow-x-auto pb-2">
                        {tabs.map(tab => (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium whitespace-nowrap transition-all ${activeTab === tab.id
                                    ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/30'
                                    : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700 border border-gray-200 dark:border-gray-700'
                                    }`}
                            >
                                {tab.icon}
                                {tab.label}
                            </button>
                        ))}
                    </div>
                </header>

                {/* Tab Content */}
                {activeTab === 'overview' && (
                    <OverviewTab
                        stats={stats}
                        statsLoading={statsLoading}
                        onTabChange={setActiveTab}
                    />
                )}

                {activeTab === 'users' && (
                    <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm overflow-hidden">
                        {/* Controls */}
                        <div className="p-6 border-b border-gray-100 dark:border-gray-700 flex flex-col md:flex-row gap-4">
                            <div className="flex-1 relative">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                                <input
                                    type="text"
                                    placeholder="Cari nama atau email..."
                                    value={searchTerm}
                                    onChange={(e) => {
                                        setSearchTerm(e.target.value);
                                        setUserPage(1);
                                        setDeletedPage(1);
                                    }}
                                    className="w-full pl-10 pr-4 py-2.5 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                                />
                            </div>
                            <select
                                value={roleFilter}
                                onChange={(e) => {
                                    setRoleFilter(e.target.value);
                                    setUserPage(1);
                                    setDeletedPage(1);
                                }}
                                className="px-4 py-2.5 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                            >
                                <option value="all">Semua Peran</option>
                                <option value="admin">Admin</option>
                                <option value="teacher">Guru</option>
                                <option value="student">Siswa</option>
                                <option value="parent">Orang Tua</option>
                            </select>
                        </div>

                        {/* User Table */}
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead className="bg-gray-50 dark:bg-gray-900/50">
                                    <tr className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                                        <th className="px-6 py-4 text-left">Pengguna</th>
                                        <th className="px-6 py-4 text-left">Peran</th>
                                        <th className="px-6 py-4 text-left">Bergabung</th>
                                        <th className="px-6 py-4 text-right">Aksi</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                                    {usersLoading ? (
                                        <tr>
                                            <td colSpan={4} className="px-6 py-12 text-center">
                                                <Loader2 className="w-8 h-8 animate-spin text-indigo-500 mx-auto" />
                                            </td>
                                        </tr>
                                    ) : users.length === 0 ? (
                                        <tr>
                                            <td colSpan={4} className="px-6 py-12 text-center text-gray-500">
                                                Tidak ada pengguna ditemukan
                                            </td>
                                        </tr>
                                    ) : users.map((u) => (
                                        <tr key={u.user_id} className="hover:bg-gray-50 dark:hover:bg-gray-700/30">
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-bold">
                                                        {u.full_name?.[0]?.toUpperCase() || u.email?.[0]?.toUpperCase() || 'U'}
                                                    </div>
                                                    <div>
                                                        <p className="font-medium text-gray-900 dark:text-white">{u.full_name || 'Tanpa Nama'}</p>
                                                        <p className="text-xs text-gray-500">{u.email}</p>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                {editingUserId === u.user_id ? (
                                                    <div className="flex items-center gap-2">
                                                        <select
                                                            value={newRole}
                                                            onChange={(e) => setNewRole(e.target.value)}
                                                            className="px-3 py-1.5 text-sm border-2 border-indigo-500 rounded-lg bg-white dark:bg-gray-900"
                                                        >
                                                            <option value="admin">Admin</option>
                                                            <option value="teacher">Guru</option>
                                                            <option value="student">Siswa</option>
                                                            <option value="parent">Orang Tua</option>
                                                        </select>
                                                        <button onClick={() => handleUpdateRole(u.user_id)} disabled={updating} className="p-1.5 bg-green-500 text-white rounded-lg hover:bg-green-600">
                                                            {updating ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                                                        </button>
                                                        <button onClick={() => setEditingUserId(null)} className="p-1.5 bg-gray-200 dark:bg-gray-700 rounded-lg">
                                                            <X size={14} />
                                                        </button>
                                                    </div>
                                                ) : (
                                                    <span className={`px-3 py-1 rounded-full text-xs font-semibold ${getRoleBadgeClass(u.role || 'user')}`}>
                                                        {getRoleLabel(u.role)}
                                                    </span>
                                                )}
                                            </td>
                                            <td className="px-6 py-4 text-sm text-gray-500">
                                                {u.created_at ? new Date(u.created_at).toLocaleDateString('id-ID') : '-'}
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <div className="flex justify-end gap-2">
                                                    <button
                                                        onClick={() => { setEditingUserId(u.user_id); setNewRole(u.role || 'teacher'); }}
                                                        className="p-2 text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 rounded-lg"
                                                    >
                                                        <Edit2 size={16} />
                                                    </button>
                                                    <button
                                                        onClick={() => openDeleteModal(u)}
                                                        className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg"
                                                    >
                                                        <Trash2 size={16} />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 px-6 py-4 border-t border-gray-100 dark:border-gray-700">
                            <p className="text-sm text-gray-500">
                                Menampilkan {userRangeStart}-{userRangeEnd} dari {userTotal}
                            </p>
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={() => setUserPage(prev => Math.max(1, prev - 1))}
                                    disabled={userPage === 1 || usersLoading}
                                    className="px-3 py-2 text-sm bg-gray-100 dark:bg-gray-700 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-200 dark:hover:bg-gray-600 transition-all"
                                >
                                    Sebelumnya
                                </button>
                                <span className="text-sm text-gray-500">
                                    Halaman {userPage} dari {userPageCount}
                                </span>
                                <button
                                    onClick={() => setUserPage(prev => Math.min(userPageCount, prev + 1))}
                                    disabled={userPage >= userPageCount || usersLoading}
                                    className="px-3 py-2 text-sm bg-gray-100 dark:bg-gray-700 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-200 dark:hover:bg-gray-600 transition-all"
                                >
                                    Berikutnya
                                </button>
                            </div>
                        </div>

                        {/* Deleted Users Toggle */}
                        {deletedTotal > 0 && (
                            <div className="border-t border-gray-100 dark:border-gray-700">
                                <button
                                    onClick={() => setShowDeletedUsers(!showDeletedUsers)}
                                    className="w-full px-6 py-4 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-all"
                                >
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 rounded-lg bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
                                            <Trash2 size={16} className="text-red-500" />
                                        </div>
                                        <span className="font-medium text-gray-700 dark:text-gray-300">
                                            Tempat Sampah ({deletedTotal})
                                        </span>
                                    </div>
                                    <ChevronDown className={`text-gray-400 transition-transform ${showDeletedUsers ? 'rotate-180' : ''}`} size={16} />
                                </button>

                                {showDeletedUsers && (
                                    <div className="px-6 pb-6">
                                        <div className="bg-red-50 dark:bg-red-900/10 rounded-xl border border-red-100 dark:border-red-900/30 overflow-hidden">
                                            <table className="w-full">
                                                <thead className="bg-red-100/50 dark:bg-red-900/20">
                                                    <tr className="text-xs font-semibold text-red-600 dark:text-red-400 uppercase tracking-wider">
                                                        <th className="px-6 py-3 text-left">Pengguna</th>
                                                        <th className="px-6 py-3 text-left">Terhapus</th>
                                                        <th className="px-6 py-3 text-right">Aksi</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-red-100 dark:divide-red-900/30">
                                                    {deletedUsers.map((u) => (
                                                        <tr key={u.user_id} className="hover:bg-red-100/30 dark:hover:bg-red-900/10">
                                                            <td className="px-6 py-3">
                                                                <div className="flex items-center gap-3">
                                                                    <div className="w-8 h-8 rounded-full bg-gray-300 dark:bg-gray-600 flex items-center justify-center text-gray-500 dark:text-gray-400 font-bold text-sm opacity-60">
                                                                        {u.full_name?.[0]?.toUpperCase() || u.email?.[0]?.toUpperCase() || 'U'}
                                                                    </div>
                                                                    <div>
                                                                        <p className="font-medium text-gray-600 dark:text-gray-400 line-through">{u.full_name || 'Tanpa Nama'}</p>
                                                                        <p className="text-xs text-gray-400">{u.email}</p>
                                                                    </div>
                                                                </div>
                                                            </td>
                                                            <td className="px-6 py-3 text-sm text-gray-500">
                                                                {u.deleted_at ? new Date(u.deleted_at).toLocaleDateString('id-ID') : '-'}
                                                            </td>
                                                            <td className="px-6 py-3 text-right">
                                                                <div className="flex justify-end gap-2">
                                                                    <button
                                                                        onClick={() => restoreUser(u)}
                                                                        className="flex items-center gap-1 px-3 py-1.5 text-sm text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20 rounded-lg"
                                                                    >
                                                                        <Undo2 size={14} />
                                                                        Pulihkan
                                                                    </button>
                                                                    <button
                                                                        onClick={() => permanentDeleteUser(u.user_id)}
                                                                        className="flex items-center gap-1 px-3 py-1.5 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg"
                                                                    >
                                                                        <X size={14} />
                                                                        Hapus Permanen
                                                                    </button>
                                                                </div>
                                                            </td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mt-4">
                                            <p className="text-sm text-gray-500">
                                                Menampilkan {deletedRangeStart}-{deletedRangeEnd} dari {deletedTotal}
                                            </p>
                                            <div className="flex items-center gap-2">
                                                <button
                                                    onClick={() => setDeletedPage(prev => Math.max(1, prev - 1))}
                                                    disabled={deletedPage === 1 || usersLoading}
                                                    className="px-3 py-2 text-sm bg-red-100/60 dark:bg-red-900/20 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-red-100 dark:hover:bg-red-900/30 transition-all"
                                                >
                                                    Sebelumnya
                                                </button>
                                                <span className="text-sm text-gray-500">
                                                    Halaman {deletedPage} dari {deletedPageCount}
                                                </span>
                                                <button
                                                    onClick={() => setDeletedPage(prev => Math.min(deletedPageCount, prev + 1))}
                                                    disabled={deletedPage >= deletedPageCount || usersLoading}
                                                    className="px-3 py-2 text-sm bg-red-100/60 dark:bg-red-900/20 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-red-100 dark:hover:bg-red-900/30 transition-all"
                                                >
                                                    Berikutnya
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                )}

                {activeTab === 'announcements' && (
                    <AnnouncementsTab
                        announcements={announcements}
                        announcementsLoading={announcementsLoading}
                        onCreateAnnouncement={async (form) => {
                            await handleCreateAnnouncement(form);
                        }}
                        onDeleteAnnouncement={handleDeleteAnnouncement}
                    />
                )}

                {activeTab === 'activity' && (
                    <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 overflow-hidden">
                        <div className="p-6 border-b border-gray-100 dark:border-gray-700">
                            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                                <h3 className="text-lg font-bold flex items-center gap-2">
                                    <Activity size={20} className="text-indigo-500" />
                                    Log Aktivitas
                                </h3>
                                <button
                                    onClick={fetchActivityLogs}
                                    className="flex items-center gap-2 px-4 py-2 text-sm bg-gray-100 dark:bg-gray-700 rounded-xl hover:bg-gray-200 dark:hover:bg-gray-600 transition-all"
                                >
                                    <RefreshCw size={16} />
                                    Muat Ulang
                                </button>
                            </div>
                            <div className="mt-4 flex flex-col md:flex-row gap-3">
                                <div className="flex-1 relative">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                                    <input
                                        type="text"
                                        placeholder="Cari log, pengguna, atau tabel..."
                                        value={logSearchTerm}
                                        onChange={(e) => {
                                            setLogSearchTerm(e.target.value);
                                            setLogPage(1);
                                        }}
                                        className="w-full pl-10 pr-4 py-2.5 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                                    />
                                </div>
                            </div>
                            <p className="text-sm text-gray-500 mt-3">Riwayat semua aksi admin</p>
                        </div>

                        {logsLoading ? (
                            <div className="p-12 text-center">
                                <Loader2 className="w-8 h-8 animate-spin text-indigo-500 mx-auto" />
                            </div>
                        ) : activityLogs.length === 0 ? (
                            <div className="p-12 text-center text-gray-500">
                                <Activity size={48} className="mx-auto mb-4 opacity-30" />
                                <p>Belum ada log aktivitas</p>
                            </div>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="w-full">
                                    <thead className="bg-gray-50 dark:bg-gray-900/50">
                                        <tr className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                                            <th className="px-6 py-3 text-left">Waktu</th>
                                            <th className="px-6 py-3 text-left">Pengguna</th>
                                            <th className="px-6 py-3 text-left">Aksi</th>
                                            <th className="px-6 py-3 text-left">Tabel</th>
                                            <th className="px-6 py-3 text-left">Detail</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                                        {activityLogs.map((log) => (
                                            <tr key={log.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/30">
                                                <td className="px-6 py-4 text-sm text-gray-500 whitespace-nowrap">
                                                    {new Date(log.created_at).toLocaleString('id-ID', {
                                                        day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit'
                                                    })}
                                                </td>
                                                <td className="px-6 py-4 text-sm">
                                                    {log.user_email || 'Sistem'}
                                                </td>
                                                <td className="px-6 py-4">
                                                    <span className={`px-2 py-1 text-xs font-semibold rounded-lg ${log.action === 'INSERT' || log.action === 'RESTORE' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' :
                                                        log.action === 'UPDATE' || log.action === 'UPDATE_ROLE' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' :
                                                            log.action === 'DELETE' || log.action === 'SOFT_DELETE' ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' :
                                                                'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300'
                                                        }`}>
                                                        {log.action}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 text-sm font-mono text-gray-600 dark:text-gray-400">
                                                    {log.table_name}
                                                </td>
                                                <td className="px-6 py-4 text-sm text-gray-500">
                                                    {log.record_id ? `ID: ${log.record_id.slice(0, 8)}...` : '-'}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 px-6 py-4 border-t border-gray-100 dark:border-gray-700">
                            <p className="text-sm text-gray-500">
                                Menampilkan {logRangeStart}-{logRangeEnd} dari {logTotal}
                            </p>
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={() => setLogPage(prev => Math.max(1, prev - 1))}
                                    disabled={logPage === 1 || logsLoading}
                                    className="px-3 py-2 text-sm bg-gray-100 dark:bg-gray-700 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-200 dark:hover:bg-gray-600 transition-all"
                                >
                                    Sebelumnya
                                </button>
                                <span className="text-sm text-gray-500">
                                    Halaman {logPage} dari {logPageCount}
                                </span>
                                <button
                                    onClick={() => setLogPage(prev => Math.min(logPageCount, prev + 1))}
                                    disabled={logPage >= logPageCount || logsLoading}
                                    className="px-3 py-2 text-sm bg-gray-100 dark:bg-gray-700 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-200 dark:hover:bg-gray-600 transition-all"
                                >
                                    Berikutnya
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {activeTab === 'system' && (
                    <div className="space-y-6">
                        {/* Health Status Cards */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 border border-gray-100 dark:border-gray-700 shadow-sm">
                                <div className="flex items-center justify-between mb-4">
                                    <div className="flex items-center gap-3">
                                        <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${systemHealth.database === 'healthy' ? 'bg-green-100 dark:bg-green-900/30' :
                                            systemHealth.database === 'degraded' ? 'bg-amber-100 dark:bg-amber-900/30' :
                                                'bg-red-100 dark:bg-red-900/30'
                                            }`}>
                                            <Database size={24} className={`${systemHealth.database === 'healthy' ? 'text-green-600' :
                                                systemHealth.database === 'degraded' ? 'text-amber-600' :
                                                    'text-red-600'
                                                }`} />
                                        </div>
                                        <div>
                                            <p className="font-semibold text-gray-900 dark:text-white">Database</p>
                                            <p className="text-xs text-gray-500">Supabase PostgreSQL</p>
                                            <p className="text-xs text-gray-500">
                                                Latensi {systemHealth.databaseLatencyMs !== null ? `${systemHealth.databaseLatencyMs} ms` : '-'}
                                            </p>
                                        </div>
                                    </div>
                                    <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold ${systemHealth.database === 'healthy' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' :
                                        systemHealth.database === 'degraded' ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' :
                                            'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                                        }`}>
                                        <span className={`w-2 h-2 rounded-full ${systemHealth.database === 'healthy' ? 'bg-green-500' :
                                            systemHealth.database === 'degraded' ? 'bg-amber-500' :
                                                'bg-red-500'
                                            }`} />
                                        {systemHealth.database === 'healthy' ? 'Sehat' : systemHealth.database === 'degraded' ? 'Lambat' : 'Offline'}
                                    </div>
                                </div>
                            </div>

                            <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 border border-gray-100 dark:border-gray-700 shadow-sm">
                                <div className="flex items-center justify-between mb-4">
                                    <div className="flex items-center gap-3">
                                        <div className="w-12 h-12 rounded-xl bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                                            <Server size={24} className="text-blue-600" />
                                        </div>
                                        <div>
                                            <p className="font-semibold text-gray-900 dark:text-white">API Supabase</p>
                                            <p className="text-xs text-gray-500">Auth dan REST</p>
                                            <p className="text-xs text-gray-500">
                                                Latensi {systemHealth.apiLatencyMs !== null ? `${systemHealth.apiLatencyMs} ms` : '-'}
                                            </p>
                                        </div>
                                    </div>
                                    <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold ${systemHealth.api === 'healthy' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' :
                                        systemHealth.api === 'degraded' ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' :
                                            'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                                        }`}>
                                        <span className={`w-2 h-2 rounded-full ${systemHealth.api === 'healthy' ? 'bg-green-500' :
                                            systemHealth.api === 'degraded' ? 'bg-amber-500' :
                                                'bg-red-500'
                                            }`} />
                                        {systemHealth.api === 'healthy' ? 'Sehat' : systemHealth.api === 'degraded' ? 'Lambat' : 'Offline'}
                                    </div>
                                </div>
                            </div>

                            <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 border border-gray-100 dark:border-gray-700 shadow-sm">
                                <div className="flex items-center justify-between mb-4">
                                    <div className="flex items-center gap-3">
                                        <div className="w-12 h-12 rounded-xl bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
                                            <Shield size={24} className="text-purple-600" />
                                        </div>
                                        <div>
                                            <p className="font-semibold text-gray-900 dark:text-white">Keamanan</p>
                                            <p className="text-xs text-gray-500">RLS Aktif</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
                                        <CheckCircle2 size={14} />
                                        Terlindungi
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* System Info */}
                        <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 border border-gray-100 dark:border-gray-700 shadow-sm">
                            <div className="flex items-center justify-between mb-6">
                                <h3 className="text-lg font-bold flex items-center gap-2">
                                    <Cpu size={20} className="text-indigo-500" />
                                    Informasi Sistem
                                </h3>
                                <button
                                    onClick={checkSystemHealth}
                                    className="flex items-center gap-2 px-3 py-1.5 text-sm bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-all"
                                >
                                    <RefreshCw size={14} />
                                    Cek Kesehatan
                                </button>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-4">
                                    <div className="flex justify-between py-3 border-b border-gray-100 dark:border-gray-700">
                                        <span className="text-gray-600 dark:text-gray-400 flex items-center gap-2">
                                            <HardDrive size={16} className="text-gray-400" />
                                            Total Rekaman
                                        </span>
                                        <span className="font-mono font-bold text-gray-900 dark:text-white">
                                            {(stats.totalUsers + stats.totalStudents + stats.totalAttendance + stats.totalGrades + stats.totalTasks).toLocaleString()}
                                        </span>
                                    </div>
                                    <div className="flex justify-between py-3 border-b border-gray-100 dark:border-gray-700">
                                        <span className="text-gray-600 dark:text-gray-400 flex items-center gap-2">
                                            <Users size={16} className="text-gray-400" />
                                            Pengguna Aktif
                                        </span>
                                        <span className="font-mono font-bold text-gray-900 dark:text-white">{stats.totalUsers}</span>
                                    </div>
                                    <div className="flex justify-between py-3 border-b border-gray-100 dark:border-gray-700">
                                        <span className="text-gray-600 dark:text-gray-400 flex items-center gap-2">
                                            <Trash2 size={16} className="text-gray-400" />
                                            Pengguna Terhapus
                                        </span>
                                        <span className="font-mono font-bold text-gray-900 dark:text-white">{deletedTotal}</span>
                                    </div>
                                </div>
                                <div className="space-y-4">
                                    <div className="flex justify-between py-3 border-b border-gray-100 dark:border-gray-700">
                                        <span className="text-gray-600 dark:text-gray-400 flex items-center gap-2">
                                            <Activity size={16} className="text-gray-400" />
                                            Log Aktivitas
                                        </span>
                                        <span className="font-mono font-bold text-gray-900 dark:text-white">{logTotal}</span>
                                    </div>
                                    <div className="flex justify-between py-3 border-b border-gray-100 dark:border-gray-700">
                                        <span className="text-gray-600 dark:text-gray-400 flex items-center gap-2">
                                            <TrendingUp size={16} className="text-gray-400" />
                                            Versi Aplikasi
                                        </span>
                                        <span className="font-mono font-bold text-indigo-600 dark:text-indigo-400">v2.0.0</span>
                                    </div>
                                    <div className="flex justify-between py-3 border-b border-gray-100 dark:border-gray-700">
                                        <span className="text-gray-600 dark:text-gray-400 flex items-center gap-2">
                                            <Clock size={16} className="text-gray-400" />
                                            Cek Kesehatan Terakhir
                                        </span>
                                        <span className="font-mono text-sm text-gray-900 dark:text-white">
                                            {systemHealth.lastChecked ? systemHealth.lastChecked.toLocaleTimeString('id-ID') : 'Belum Pernah'}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Data Usage */}
                        <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 border border-gray-100 dark:border-gray-700 shadow-sm">
                            <h3 className="text-lg font-bold mb-6 flex items-center gap-2">
                                <BarChart3 size={20} className="text-indigo-500" />
                                Distribusi Data
                            </h3>
                            <div className="space-y-4">
                                {[
                                    { label: 'Siswa', value: stats.totalStudents, max: distributionMax, color: 'bg-blue-500' },
                                    { label: 'Absensi', value: stats.totalAttendance, max: distributionMax, color: 'bg-green-500' },
                                    { label: 'Nilai', value: stats.totalGrades, max: distributionMax, color: 'bg-purple-500' },
                                    { label: 'Tugas', value: stats.totalTasks, max: distributionMax, color: 'bg-orange-500' },
                                ].map(item => (
                                    <div key={item.label} className="space-y-2">
                                        <div className="flex justify-between text-sm">
                                            <span className="text-gray-600 dark:text-gray-400">{item.label}</span>
                                            <span className="font-mono font-bold text-gray-900 dark:text-white">{item.value.toLocaleString()}</span>
                                        </div>
                                        <div className="h-2 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                                            <div
                                                className={`h-full ${item.color} rounded-full transition-all duration-500`}
                                                style={{ width: item.max > 0 ? `${(item.value / item.max) * 100}%` : '0%' }}
                                            />
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                )}

                {/* Error Toast */}
                {error && (
                    <div className="fixed bottom-4 right-4 bg-red-500 text-white px-6 py-3 rounded-xl shadow-lg flex items-center gap-3">
                        <AlertCircle size={20} />
                        <span>{error}</span>
                        <button onClick={() => setError(null)}><X size={18} /></button>
                    </div>
                )}

                {/* Delete Confirmation Modal */}
                {deleteModal.show && deleteModal.user && (
                    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                        <div className="bg-white dark:bg-gray-800 rounded-2xl max-w-md w-full p-6 shadow-2xl animate-in fade-in zoom-in duration-200">
                            <div className="flex items-center gap-4 mb-4">
                                <div className="p-3 bg-red-100 dark:bg-red-900/30 rounded-full">
                                    <AlertTriangle size={24} className="text-red-600 dark:text-red-400" />
                                </div>
                                <div>
                                    <h3 className="text-lg font-bold text-gray-900 dark:text-white">Hapus Pengguna?</h3>
                                    <p className="text-sm text-gray-500">Aksi ini tidak dapat dibatalkan secara permanen</p>
                                </div>
                            </div>

                            <div className="bg-gray-50 dark:bg-gray-900/50 rounded-xl p-4 mb-6">
                                <div className="flex items-center gap-3">
                                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-red-500 to-orange-600 flex items-center justify-center text-white font-bold text-lg">
                                        {deleteModal.user.full_name?.[0]?.toUpperCase() || deleteModal.user.email?.[0]?.toUpperCase() || 'U'}
                                    </div>
                                    <div>
                                        <p className="font-semibold text-gray-900 dark:text-white">{deleteModal.user.full_name || 'Tanpa Nama'}</p>
                                        <p className="text-sm text-gray-500">{deleteModal.user.email}</p>
                                        <span className={`inline-block mt-1 px-2 py-0.5 rounded text-xs font-medium ${getRoleBadgeClass(deleteModal.user.role || 'user')}`}>
                                            {getRoleLabel(deleteModal.user.role)}
                                        </span>
                                    </div>
                                </div>
                            </div>

                            <div className="flex gap-3">
                                <button
                                    onClick={() => setDeleteModal({ show: false, user: null })}
                                    className="flex-1 px-4 py-2.5 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 font-medium rounded-xl hover:bg-gray-200 dark:hover:bg-gray-600 transition-all"
                                >
                                    Batal
                                </button>
                                <button
                                    onClick={confirmSoftDelete}
                                    className="flex-1 px-4 py-2.5 bg-red-600 text-white font-medium rounded-xl hover:bg-red-700 transition-all flex items-center justify-center gap-2 shadow-lg shadow-red-500/30"
                                >
                                    <Trash2 size={16} />
                                    Hapus Pengguna
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* Success Toast */}
                {undoToast.show && undoToast.user && (
                    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-gray-900 dark:bg-gray-800 text-white px-6 py-4 rounded-2xl shadow-2xl flex items-center gap-4 z-50 animate-in slide-in-from-bottom duration-300">
                        <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-green-500/20 flex items-center justify-center">
                                <Trash2 size={16} className="text-green-400" />
                            </div>
                            <div>
                                <p className="font-medium">Pengguna dipindahkan ke Tempat Sampah</p>
                                <p className="text-sm text-gray-400">{undoToast.user.email}</p>
                            </div>
                        </div>
                        <button
                            onClick={() => { restoreUser(undoToast.user!); setUndoToast({ show: false, user: null, timeout: null }); }}
                            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 rounded-xl font-medium transition-all"
                        >
                            <Undo2 size={16} />
                            Batalkan
                        </button>
                        <button
                            onClick={() => setUndoToast({ show: false, user: null, timeout: null })}
                            className="p-1.5 hover:bg-white/10 rounded-lg transition-all"
                        >
                            <X size={16} />
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};

export default AdminPage;
