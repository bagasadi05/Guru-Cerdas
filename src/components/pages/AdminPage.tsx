import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Users,
    UserCog,
    ShieldCheck,
    Loader2,
    AlertCircle,
    Edit2,
    Save,
    X,
    RefreshCw,
    Search,
    GraduationCap,
    BookOpen,
    Calendar,
    Megaphone,
    Trash2,
    Plus,
    Clock,
    BarChart3,
    Settings,
    Database,
    Activity,
    AlertTriangle,
    Undo2
} from 'lucide-react';
import { supabase } from '../../services/supabase';
import { useAuth } from '../../hooks/useAuth';

// Types
interface UserRoleRecord {
    user_id: string;
    role: string | null;
    email: string | null;
    full_name: string | null;
    created_at?: string;
    deleted_at?: string | null;
}

interface SystemStats {
    totalUsers: number;
    totalClasses: number;
    totalStudents: number;
    totalAttendance: number;
    totalGrades: number;
    totalTasks: number;
    admins: number;
    teachers: number;
    students: number;
}

interface Announcement {
    id: string;
    title: string;
    content: string;
    audience_type: string | null;
    date: string | null;
    created_at: string | null;
}

interface AuditLog {
    id: string;
    created_at: string;
    user_email: string | null;
    table_name: string;
    action: string;
    record_id: string | null;
    old_data: Record<string, unknown> | null;
    new_data: Record<string, unknown> | null;
}

type TabType = 'overview' | 'users' | 'announcements' | 'activity' | 'system';

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
    const [roleFilter, setRoleFilter] = useState<string>('all');
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
    const [showAnnouncementForm, setShowAnnouncementForm] = useState(false);
    const [announcementForm, setAnnouncementForm] = useState({ title: '', content: '', audience_type: 'all' });

    // Activity Logs State
    const [activityLogs, setActivityLogs] = useState<AuditLog[]>([]);
    const [logsLoading, setLogsLoading] = useState(true);

    // Error State
    const [error, setError] = useState<string | null>(null);

    // Delete Modal State
    const [deleteModal, setDeleteModal] = useState<{ show: boolean; user: UserRoleRecord | null }>({ show: false, user: null });

    // Undo Toast State
    const [undoToast, setUndoToast] = useState<{ show: boolean; user: UserRoleRecord | null; timeout: NodeJS.Timeout | null }>({
        show: false, user: null, timeout: null
    });

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

    // Fetch all data when admin status is confirmed
    useEffect(() => {
        if (isAdmin) {
            fetchStats();
            fetchUsers();
            fetchAnnouncements();
            fetchActivityLogs();
        }
    }, [isAdmin]);

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
                supabase.from('user_roles').select('*', { count: 'exact', head: true }),
                supabase.from('classes').select('*', { count: 'exact', head: true }),
                supabase.from('students').select('*', { count: 'exact', head: true }),
                supabase.from('attendance').select('*', { count: 'exact', head: true }),
                supabase.from('academic_records').select('*', { count: 'exact', head: true }),
                supabase.from('tasks').select('*', { count: 'exact', head: true })
            ]);

            // Get role breakdown
            const { data: roleData } = await supabase.from('user_roles').select('role');
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
    const fetchUsers = async () => {
        setUsersLoading(true);
        try {
            // Fetch active users (not deleted)
            const { data: activeData, error: activeError } = await supabase
                .from('user_roles')
                .select('*')
                .is('deleted_at', null)
                .order('created_at', { ascending: false });
            if (activeError) throw activeError;
            setUsers(activeData || []);

            // Fetch deleted users
            const { data: deletedData, error: deletedError } = await supabase
                .from('user_roles')
                .select('*')
                .not('deleted_at', 'is', null)
                .order('deleted_at', { ascending: false });
            if (deletedError) throw deletedError;
            setDeletedUsers(deletedData || []);
        } catch (err: unknown) {
            setError((err as Error).message);
        } finally {
            setUsersLoading(false);
        }
    };

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
    const fetchActivityLogs = async () => {
        setLogsLoading(true);
        try {
            const { data, error } = await (supabase as any)
                .from('audit_logs')
                .select('id, created_at, user_email, table_name, action, record_id, old_data, new_data')
                .order('created_at', { ascending: false })
                .limit(50);
            if (error) throw error;
            setActivityLogs(data || []);
        } catch (err) {
            console.error('Activity logs fetch error:', err);
            setActivityLogs([]);
        } finally {
            setLogsLoading(false);
        }
    };

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

    // Update user role
    const handleUpdateRole = async (userId: string) => {
        if (!newRole) return;
        setUpdating(true);
        try {
            const { error } = await supabase
                .from('user_roles')
                .update({ role: newRole as 'admin' | 'teacher' | 'student' | 'parent' })
                .eq('user_id', userId);
            if (error) throw error;
            setUsers(prev => prev.map(u => u.user_id === userId ? { ...u, role: newRole } : u));
            setEditingUserId(null);
            fetchStats(); // Refresh stats
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
            const { error } = await supabase
                .from('user_roles')
                .update({ deleted_at: new Date().toISOString() } as any)
                .eq('user_id', userToDelete.user_id);

            if (error) throw error;

            // Log the action
            logAdminAction('user_roles', 'SOFT_DELETE', userToDelete.user_id, userToDelete, null);

            // Move to deleted list in UI
            setUsers(prev => prev.filter(u => u.user_id !== userToDelete.user_id));
            setDeletedUsers(prev => [...prev, { ...userToDelete, deleted_at: new Date().toISOString() }]);
            setDeleteModal({ show: false, user: null });
            fetchStats();
            fetchActivityLogs(); // Refresh logs

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

            // Move back to active list
            setDeletedUsers(prev => prev.filter(u => u.user_id !== userToRestore.user_id));
            setUsers(prev => [...prev, { ...userToRestore, deleted_at: null }]);
            fetchStats();
        } catch (err: unknown) {
            setError('Error: ' + (err as Error).message);
        }
    };

    // Permanently delete user (cannot be undone)
    const permanentDeleteUser = async (userId: string) => {
        if (!confirm('HAPUS PERMANEN? User tidak akan bisa dipulihkan!')) return;

        try {
            await supabase.from('user_roles').delete().eq('user_id', userId);
            setDeletedUsers(prev => prev.filter(u => u.user_id !== userId));
        } catch (err: unknown) {
            setError('Error: ' + (err as Error).message);
        }
    };

    // Create announcement
    const handleCreateAnnouncement = async () => {
        if (!announcementForm.title || !announcementForm.content) {
            alert('Judul dan konten wajib diisi');
            return;
        }
        try {
            const { error } = await supabase.from('announcements').insert({
                title: announcementForm.title,
                content: announcementForm.content,
                audience_type: announcementForm.audience_type || 'all'
            });
            if (error) throw error;
            setAnnouncementForm({ title: '', content: '', audience_type: 'all' });
            setShowAnnouncementForm(false);
            fetchAnnouncements();
        } catch (err: unknown) {
            alert('Error: ' + (err as Error).message);
        }
    };

    // Delete announcement
    const handleDeleteAnnouncement = async (id: string) => {
        if (!confirm('Hapus pengumuman ini?')) return;
        try {
            await supabase.from('announcements').delete().eq('id', id);
            fetchAnnouncements();
        } catch (err: unknown) {
            alert('Error: ' + (err as Error).message);
        }
    };

    // Filtered users
    const filteredUsers = useMemo(() => {
        return users.filter(u => {
            const matchesSearch =
                (u.full_name?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
                (u.email?.toLowerCase() || '').includes(searchTerm.toLowerCase());
            const matchesRole = roleFilter === 'all' || u.role === roleFilter;
            return matchesSearch && matchesRole;
        });
    }, [users, searchTerm, roleFilter]);

    // Loading screen
    if (authLoading || isAdmin === null) {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen bg-white dark:bg-gray-900">
                <Loader2 className="w-12 h-12 animate-spin text-indigo-600 mb-4" />
                <p className="text-gray-500 dark:text-gray-400 animate-pulse">Loading Admin Dashboard...</p>
            </div>
        );
    }

    const tabs: { id: TabType; label: string; icon: React.ReactNode }[] = [
        { id: 'overview', label: 'Overview', icon: <BarChart3 size={18} /> },
        { id: 'users', label: 'Users', icon: <Users size={18} /> },
        { id: 'announcements', label: 'Pengumuman', icon: <Megaphone size={18} /> },
        { id: 'activity', label: 'Activity', icon: <Activity size={18} /> },
        { id: 'system', label: 'System', icon: <Settings size={18} /> },
    ];

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
                                    Admin Dashboard
                                </h1>
                                <p className="text-sm text-gray-500 dark:text-gray-400 flex items-center gap-2">
                                    <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                                    System Management Portal
                                </p>
                            </div>
                        </div>
                        <button
                            onClick={() => { fetchStats(); fetchUsers(); fetchAnnouncements(); }}
                            className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl hover:border-indigo-500/50 transition-all shadow-sm"
                        >
                            <RefreshCw size={16} className={statsLoading ? 'animate-spin' : ''} />
                            <span className="text-sm font-medium">Refresh</span>
                        </button>
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
                    <div className="space-y-6">
                        {/* Stats Grid */}
                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                            <StatCard icon={<Users size={20} />} label="Total Users" value={stats.totalUsers} color="indigo" loading={statsLoading} />
                            <StatCard icon={<BookOpen size={20} />} label="Kelas" value={stats.totalClasses} color="blue" loading={statsLoading} />
                            <StatCard icon={<GraduationCap size={20} />} label="Siswa" value={stats.totalStudents} color="green" loading={statsLoading} />
                            <StatCard icon={<Calendar size={20} />} label="Absensi" value={stats.totalAttendance} color="orange" loading={statsLoading} />
                            <StatCard icon={<BarChart3 size={20} />} label="Nilai" value={stats.totalGrades} color="purple" loading={statsLoading} />
                            <StatCard icon={<Clock size={20} />} label="Tugas" value={stats.totalTasks} color="pink" loading={statsLoading} />
                        </div>

                        {/* Role Distribution */}
                        <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 border border-gray-100 dark:border-gray-700 shadow-sm">
                            <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                                <Activity size={20} className="text-indigo-500" />
                                Distribusi Role Pengguna
                            </h3>
                            <div className="grid grid-cols-3 gap-4">
                                <div className="text-center p-4 bg-purple-50 dark:bg-purple-900/20 rounded-xl">
                                    <p className="text-3xl font-bold text-purple-600">{stats.admins}</p>
                                    <p className="text-sm text-purple-600/70">Admin</p>
                                </div>
                                <div className="text-center p-4 bg-blue-50 dark:bg-blue-900/20 rounded-xl">
                                    <p className="text-3xl font-bold text-blue-600">{stats.teachers}</p>
                                    <p className="text-sm text-blue-600/70">Teacher</p>
                                </div>
                                <div className="text-center p-4 bg-green-50 dark:bg-green-900/20 rounded-xl">
                                    <p className="text-3xl font-bold text-green-600">{stats.students}</p>
                                    <p className="text-sm text-green-600/70">Student</p>
                                </div>
                            </div>
                        </div>

                        {/* Quick Actions */}
                        <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 border border-gray-100 dark:border-gray-700 shadow-sm">
                            <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                                <Database size={20} className="text-indigo-500" />
                                Quick Actions
                            </h3>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                                <button onClick={() => setActiveTab('users')} className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-xl hover:bg-indigo-50 dark:hover:bg-indigo-900/20 transition-all text-left group">
                                    <UserCog size={24} className="text-gray-400 group-hover:text-indigo-500 mb-2" />
                                    <p className="font-medium text-sm">Kelola Users</p>
                                </button>
                                <button onClick={() => setActiveTab('announcements')} className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-xl hover:bg-indigo-50 dark:hover:bg-indigo-900/20 transition-all text-left group">
                                    <Megaphone size={24} className="text-gray-400 group-hover:text-indigo-500 mb-2" />
                                    <p className="font-medium text-sm">Pengumuman</p>
                                </button>
                                <button onClick={() => navigate('/analytics')} className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-xl hover:bg-indigo-50 dark:hover:bg-indigo-900/20 transition-all text-left group">
                                    <BarChart3 size={24} className="text-gray-400 group-hover:text-indigo-500 mb-2" />
                                    <p className="font-medium text-sm">Analytics</p>
                                </button>
                                <button onClick={() => navigate('/pengaturan')} className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-xl hover:bg-indigo-50 dark:hover:bg-indigo-900/20 transition-all text-left group">
                                    <Settings size={24} className="text-gray-400 group-hover:text-indigo-500 mb-2" />
                                    <p className="font-medium text-sm">Settings</p>
                                </button>
                            </div>
                        </div>
                    </div>
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
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="w-full pl-10 pr-4 py-2.5 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                                />
                            </div>
                            <select
                                value={roleFilter}
                                onChange={(e) => setRoleFilter(e.target.value)}
                                className="px-4 py-2.5 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                            >
                                <option value="all">Semua Role</option>
                                <option value="admin">Admin</option>
                                <option value="teacher">Teacher</option>
                                <option value="student">Student</option>
                                <option value="parent">Parent</option>
                            </select>
                        </div>

                        {/* User Table */}
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead className="bg-gray-50 dark:bg-gray-900/50">
                                    <tr className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                                        <th className="px-6 py-4 text-left">User</th>
                                        <th className="px-6 py-4 text-left">Role</th>
                                        <th className="px-6 py-4 text-left">Joined</th>
                                        <th className="px-6 py-4 text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                                    {usersLoading ? (
                                        <tr>
                                            <td colSpan={4} className="px-6 py-12 text-center">
                                                <Loader2 className="w-8 h-8 animate-spin text-indigo-500 mx-auto" />
                                            </td>
                                        </tr>
                                    ) : filteredUsers.length === 0 ? (
                                        <tr>
                                            <td colSpan={4} className="px-6 py-12 text-center text-gray-500">
                                                Tidak ada user ditemukan
                                            </td>
                                        </tr>
                                    ) : filteredUsers.map((u) => (
                                        <tr key={u.user_id} className="hover:bg-gray-50 dark:hover:bg-gray-700/30">
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-bold">
                                                        {u.full_name?.[0]?.toUpperCase() || u.email?.[0]?.toUpperCase() || 'U'}
                                                    </div>
                                                    <div>
                                                        <p className="font-medium text-gray-900 dark:text-white">{u.full_name || 'No Name'}</p>
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
                                                            <option value="teacher">Teacher</option>
                                                            <option value="student">Student</option>
                                                            <option value="parent">Parent</option>
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
                                                        {u.role || 'user'}
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

                        {/* Deleted Users Toggle */}
                        {deletedUsers.length > 0 && (
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
                                            Recycle Bin ({deletedUsers.length})
                                        </span>
                                    </div>
                                    <span className={`text-gray-400 transition-transform ${showDeletedUsers ? 'rotate-180' : ''}`}>▼</span>
                                </button>

                                {showDeletedUsers && (
                                    <div className="px-6 pb-6">
                                        <div className="bg-red-50 dark:bg-red-900/10 rounded-xl border border-red-100 dark:border-red-900/30 overflow-hidden">
                                            <table className="w-full">
                                                <thead className="bg-red-100/50 dark:bg-red-900/20">
                                                    <tr className="text-xs font-semibold text-red-600 dark:text-red-400 uppercase tracking-wider">
                                                        <th className="px-6 py-3 text-left">User</th>
                                                        <th className="px-6 py-3 text-left">Dihapus</th>
                                                        <th className="px-6 py-3 text-right">Actions</th>
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
                                                                        <p className="font-medium text-gray-600 dark:text-gray-400 line-through">{u.full_name || 'No Name'}</p>
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
                                                                        Restore
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
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                )}

                {activeTab === 'announcements' && (
                    <div className="space-y-6">
                        {/* Create Button */}
                        <div className="flex justify-end">
                            <button
                                onClick={() => setShowAnnouncementForm(!showAnnouncementForm)}
                                className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-500/30"
                            >
                                <Plus size={18} />
                                Buat Pengumuman
                            </button>
                        </div>

                        {/* Create Form */}
                        {showAnnouncementForm && (
                            <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 border border-gray-100 dark:border-gray-700 shadow-sm">
                                <h3 className="text-lg font-bold mb-4">Pengumuman Baru</h3>
                                <div className="space-y-4">
                                    <input
                                        type="text"
                                        placeholder="Judul pengumuman"
                                        value={announcementForm.title}
                                        onChange={(e) => setAnnouncementForm(prev => ({ ...prev, title: e.target.value }))}
                                        className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl"
                                    />
                                    <textarea
                                        placeholder="Isi pengumuman..."
                                        rows={4}
                                        value={announcementForm.content}
                                        onChange={(e) => setAnnouncementForm(prev => ({ ...prev, content: e.target.value }))}
                                        className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl resize-none"
                                    />
                                    <select
                                        value={announcementForm.audience_type}
                                        onChange={(e) => setAnnouncementForm(prev => ({ ...prev, audience_type: e.target.value }))}
                                        className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl"
                                    >
                                        <option value="all">Semua</option>
                                        <option value="teachers">Guru</option>
                                        <option value="parents">Orang Tua</option>
                                        <option value="students">Siswa</option>
                                    </select>
                                    <div className="flex gap-3">
                                        <button onClick={handleCreateAnnouncement} className="px-6 py-2.5 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700">
                                            Simpan
                                        </button>
                                        <button onClick={() => setShowAnnouncementForm(false)} className="px-6 py-2.5 bg-gray-100 dark:bg-gray-700 rounded-xl">
                                            Batal
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Announcements List */}
                        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 overflow-hidden">
                            {announcementsLoading ? (
                                <div className="p-12 text-center">
                                    <Loader2 className="w-8 h-8 animate-spin text-indigo-500 mx-auto" />
                                </div>
                            ) : announcements.length === 0 ? (
                                <div className="p-12 text-center text-gray-500">
                                    <Megaphone size={48} className="mx-auto mb-4 opacity-30" />
                                    <p>Belum ada pengumuman</p>
                                </div>
                            ) : (
                                <div className="divide-y divide-gray-100 dark:divide-gray-700">
                                    {announcements.map(a => (
                                        <div key={a.id} className="p-6 hover:bg-gray-50 dark:hover:bg-gray-700/30">
                                            <div className="flex justify-between items-start gap-4">
                                                <div className="flex-1">
                                                    <h4 className="font-bold text-gray-900 dark:text-white">{a.title}</h4>
                                                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">{a.content}</p>
                                                    <div className="flex items-center gap-4 mt-3 text-xs text-gray-500">
                                                        <span className="px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded">{a.audience_type || 'Semua'}</span>
                                                        <span>{a.created_at ? new Date(a.created_at).toLocaleDateString('id-ID') : '-'}</span>
                                                    </div>
                                                </div>
                                                <button onClick={() => handleDeleteAnnouncement(a.id)} className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg">
                                                    <Trash2 size={16} />
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {activeTab === 'activity' && (
                    <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 overflow-hidden">
                        <div className="p-6 border-b border-gray-100 dark:border-gray-700">
                            <div className="flex items-center justify-between">
                                <h3 className="text-lg font-bold flex items-center gap-2">
                                    <Activity size={20} className="text-indigo-500" />
                                    Activity Logs
                                </h3>
                                <button
                                    onClick={fetchActivityLogs}
                                    className="flex items-center gap-2 px-4 py-2 text-sm bg-gray-100 dark:bg-gray-700 rounded-xl hover:bg-gray-200 dark:hover:bg-gray-600 transition-all"
                                >
                                    <RefreshCw size={16} />
                                    Refresh
                                </button>
                            </div>
                            <p className="text-sm text-gray-500 mt-1">History semua aksi admin (50 terbaru)</p>
                        </div>

                        {logsLoading ? (
                            <div className="p-12 text-center">
                                <Loader2 className="w-8 h-8 animate-spin text-indigo-500 mx-auto" />
                            </div>
                        ) : activityLogs.length === 0 ? (
                            <div className="p-12 text-center text-gray-500">
                                <Activity size={48} className="mx-auto mb-4 opacity-30" />
                                <p>Belum ada activity log</p>
                            </div>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="w-full">
                                    <thead className="bg-gray-50 dark:bg-gray-900/50">
                                        <tr className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                                            <th className="px-6 py-3 text-left">Waktu</th>
                                            <th className="px-6 py-3 text-left">User</th>
                                            <th className="px-6 py-3 text-left">Action</th>
                                            <th className="px-6 py-3 text-left">Table</th>
                                            <th className="px-6 py-3 text-left">Details</th>
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
                                                    {log.user_email || 'System'}
                                                </td>
                                                <td className="px-6 py-4">
                                                    <span className={`px-2 py-1 text-xs font-semibold rounded-lg ${log.action === 'INSERT' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' :
                                                            log.action === 'UPDATE' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' :
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
                    </div>
                )}

                {activeTab === 'system' && (
                    <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 border border-gray-100 dark:border-gray-700">
                        <h3 className="text-lg font-bold mb-6 flex items-center gap-2">
                            <Database size={20} className="text-indigo-500" />
                            System Information
                        </h3>
                        <div className="space-y-4">
                            <div className="flex justify-between py-3 border-b border-gray-100 dark:border-gray-700">
                                <span className="text-gray-600 dark:text-gray-400">Database Status</span>
                                <span className="flex items-center gap-2 text-green-600">
                                    <span className="w-2 h-2 bg-green-500 rounded-full" />
                                    Connected
                                </span>
                            </div>
                            <div className="flex justify-between py-3 border-b border-gray-100 dark:border-gray-700">
                                <span className="text-gray-600 dark:text-gray-400">Total Records</span>
                                <span className="font-mono">{stats.totalUsers + stats.totalStudents + stats.totalAttendance}</span>
                            </div>
                            <div className="flex justify-between py-3 border-b border-gray-100 dark:border-gray-700">
                                <span className="text-gray-600 dark:text-gray-400">App Version</span>
                                <span className="font-mono">1.0.0</span>
                            </div>
                            <div className="flex justify-between py-3">
                                <span className="text-gray-600 dark:text-gray-400">Last Refresh</span>
                                <span className="font-mono text-sm">{new Date().toLocaleString('id-ID')}</span>
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
                                    <h3 className="text-lg font-bold text-gray-900 dark:text-white">Hapus User?</h3>
                                    <p className="text-sm text-gray-500">Aksi ini tidak dapat dibatalkan secara permanen</p>
                                </div>
                            </div>

                            <div className="bg-gray-50 dark:bg-gray-900/50 rounded-xl p-4 mb-6">
                                <div className="flex items-center gap-3">
                                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-red-500 to-orange-600 flex items-center justify-center text-white font-bold text-lg">
                                        {deleteModal.user.full_name?.[0]?.toUpperCase() || deleteModal.user.email?.[0]?.toUpperCase() || 'U'}
                                    </div>
                                    <div>
                                        <p className="font-semibold text-gray-900 dark:text-white">{deleteModal.user.full_name || 'No Name'}</p>
                                        <p className="text-sm text-gray-500">{deleteModal.user.email}</p>
                                        <span className={`inline-block mt-1 px-2 py-0.5 rounded text-xs font-medium ${getRoleBadgeClass(deleteModal.user.role || 'user')}`}>
                                            {deleteModal.user.role || 'user'}
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
                                    Hapus User
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
                                <p className="font-medium">User dipindahkan ke Trash</p>
                                <p className="text-sm text-gray-400">{undoToast.user.email}</p>
                            </div>
                        </div>
                        <button
                            onClick={() => { restoreUser(undoToast.user!); setUndoToast({ show: false, user: null, timeout: null }); }}
                            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 rounded-xl font-medium transition-all"
                        >
                            <Undo2 size={16} />
                            Undo
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

// Stat Card Component
interface StatCardProps {
    icon: React.ReactNode;
    label: string;
    value: number;
    color: 'indigo' | 'blue' | 'green' | 'orange' | 'purple' | 'pink';
    loading?: boolean;
}

const StatCard: React.FC<StatCardProps> = ({ icon, label, value, color, loading }) => {
    const colorMap = {
        indigo: 'from-indigo-500 to-indigo-600',
        blue: 'from-blue-500 to-blue-600',
        green: 'from-green-500 to-green-600',
        orange: 'from-orange-500 to-orange-600',
        purple: 'from-purple-500 to-purple-600',
        pink: 'from-pink-500 to-pink-600'
    };

    return (
        <div className="bg-white dark:bg-gray-800 p-4 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm hover:shadow-md transition-all">
            <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${colorMap[color]} flex items-center justify-center text-white mb-3`}>
                {icon}
            </div>
            {loading ? (
                <div className="h-8 w-16 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
            ) : (
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{value.toLocaleString()}</p>
            )}
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{label}</p>
        </div>
    );
};

// Role badge helper
const getRoleBadgeClass = (role: string) => {
    switch (role.toLowerCase()) {
        case 'admin': return 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300';
        case 'teacher': return 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300';
        case 'student': return 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300';
        case 'parent': return 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300';
        default: return 'bg-gray-100 text-gray-700 dark:bg-gray-900 dark:text-gray-300';
    }
};

export default AdminPage;
