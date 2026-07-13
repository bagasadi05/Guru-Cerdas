import React, { useState } from 'react';
import {
    Search,
    Loader2,
    Edit2,
    Save,
    X,
    Trash2,
    Undo2,
    UserPlus,
} from 'lucide-react';
import { UserRoleRecord } from './types';
import { getRoleBadgeClass } from './components';
import { Button } from '../../ui/Button';
import { useAuth } from '../../../hooks/useAuth';
import { createClient } from '@supabase/supabase-js';
import { supabase } from '../../../services/supabase';

const USER_PAGE_SIZE = 20;

interface UsersTabProps {
    users: UserRoleRecord[];
    deletedUsers: UserRoleRecord[];
    usersLoading: boolean;
    searchTerm: string;
    setSearchTerm: (term: string) => void;
    roleFilter: string;
    setRoleFilter: (filter: string) => void;
    userPage: number;
    setUserPage: React.Dispatch<React.SetStateAction<number>>;
    deletedPage: number;
    setDeletedPage: React.Dispatch<React.SetStateAction<number>>;
    editingUserId: string | null;
    setEditingUserId: (id: string | null) => void;
    newRole: string;
    setNewRole: (role: string) => void;
    newName: string;
    setNewName: (name: string) => void;
    updating: boolean;
    handleUpdateUser: (userId: string) => Promise<void>;
    openDeleteModal: (user: UserRoleRecord) => void;
    restoreUser: (user: UserRoleRecord) => Promise<void>;
    permanentDeleteUser: (userId: string) => Promise<void>;
    userTotal: number;
    deletedTotal: number;
    showDeletedUsers: boolean;
    setShowDeletedUsers: (show: boolean) => void;
    handleToggleApproval?: (userId: string, currentStatus: boolean) => Promise<void>;
    onRefreshRequested?: () => void;
}

const roleLabelMap: Record<string, string> = {
    admin: 'Admin',
    teacher: 'Guru',
    waka_kesiswaan: 'Waka Kesiswaan',
    kepala_madrasah: 'Kepala Madrasah',
    student: 'Siswa',
    parent: 'Orang Tua',
    user: 'Pengguna',
};

const getRoleLabel = (value?: string | null) => {
    if (!value) return roleLabelMap.user;
    return roleLabelMap[value] || value;
};

export const UsersTab: React.FC<UsersTabProps> = ({
    users,
    deletedUsers,
    usersLoading,
    searchTerm,
    setSearchTerm,
    roleFilter,
    setRoleFilter,
    userPage,
    setUserPage,
    deletedPage,
    setDeletedPage,
    editingUserId,
    setEditingUserId,
    newRole,
    setNewRole,
    newName,
    setNewName,
    updating,
    handleUpdateUser,
    openDeleteModal,
    restoreUser,
    permanentDeleteUser,
    userTotal,
    deletedTotal,
    showDeletedUsers,
    setShowDeletedUsers,
    handleToggleApproval,
    onRefreshRequested,
}) => {
    const { user } = useAuth();
    const [showAddModal, setShowAddModal] = useState(false);
    const [addUserForm, setAddUserForm] = useState({ name: '', email: '', password: '', role: 'teacher' });
    const [isAddingUser, setIsAddingUser] = useState(false);
    const [addUserError, setAddUserError] = useState<string | null>(null);

    const handleAddUser = async (e: React.FormEvent) => {
        e.preventDefault();
        setAddUserError(null);
        setIsAddingUser(true);
        try {
            // Gunakan tempClient dengan persistSession: false agar tidak me-logout admin
            const tempClient = createClient(
                import.meta.env.VITE_SUPABASE_URL,
                import.meta.env.VITE_SUPABASE_ANON_KEY,
                { auth: { persistSession: false, autoRefreshToken: false } }
            );

            const { data, error } = await tempClient.auth.signUp({
                email: addUserForm.email,
                password: addUserForm.password,
                options: {
                    data: { full_name: addUserForm.name }
                }
            });

            if (error) throw error;
            if (!data.user) throw new Error('Gagal membuat akun.');

            // Update role dan auto-approve (karena dibuat oleh admin)
            const { error: updateError } = await supabase.from('user_roles').update({
                role: addUserForm.role as any,
                is_approved: true
            }).eq('user_id', data.user.id);

            if (updateError) throw updateError;

            setShowAddModal(false);
            setAddUserForm({ name: '', email: '', password: '', role: 'teacher' });
            if (onRefreshRequested) onRefreshRequested();
        } catch (err: unknown) {
            setAddUserError((err as Error).message);
        } finally {
            setIsAddingUser(false);
        }
    };

    const userPageCount = Math.max(1, Math.ceil(userTotal / USER_PAGE_SIZE));
    const deletedPageCount = Math.max(1, Math.ceil(deletedTotal / USER_PAGE_SIZE));

    const userRangeStart = userTotal === 0 ? 0 : (userPage - 1) * USER_PAGE_SIZE + 1;
    const userRangeEnd = userTotal === 0 ? 0 : Math.min(userRangeStart + users.length - 1, userTotal);
    const deletedRangeStart = deletedTotal === 0 ? 0 : (deletedPage - 1) * USER_PAGE_SIZE + 1;
    const deletedRangeEnd = deletedTotal === 0 ? 0 : Math.min(deletedRangeStart + deletedUsers.length - 1, deletedTotal);

    return (
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
                    <option value="waka_kesiswaan">Waka Kesiswaan</option>
                    <option value="kepala_madrasah">Kepala Madrasah</option>
                    <option value="student">Siswa</option>
                    <option value="parent">Orang Tua</option>
                </select>
                <Button 
                    onClick={() => setShowAddModal(true)}
                    className="flex items-center gap-2 whitespace-nowrap bg-indigo-600 hover:bg-indigo-700 text-white"
                >
                    <UserPlus size={18} />
                    <span>Tambah Pengguna</span>
                </Button>
            </div>

            {/* User Table */}
            <div className="overflow-x-auto">
                <table className="w-full">
                    <thead className="bg-gray-50 dark:bg-gray-900/50">
                        <tr className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                            <th className="px-6 py-4 text-left">Pengguna</th>
                            <th className="px-6 py-4 text-left">Peran</th>
                            <th className="px-6 py-4 text-left">Persetujuan</th>
                            <th className="px-6 py-4 text-left">Bergabung</th>
                            <th className="px-6 py-4 text-right">Aksi</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                        {usersLoading ? (
                            <tr>
                                <td colSpan={5} className="px-6 py-12 text-center">
                                    <Loader2 className="w-8 h-8 animate-spin text-indigo-500 mx-auto" />
                                </td>
                            </tr>
                        ) : users.length === 0 ? (
                            <tr>
                                <td colSpan={5} className="px-6 py-12 text-center text-gray-500">
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
                                        <div className="flex-1 min-w-0">
                                            {editingUserId === u.user_id ? (
                                                <input
                                                    type="text"
                                                    value={newName}
                                                    onChange={e => setNewName(e.target.value)}
                                                    className="w-full px-2 py-1 mb-1 text-sm font-medium border-2 border-indigo-500 rounded-lg dark:bg-gray-900"
                                                    placeholder="Nama Lengkap"
                                                    autoFocus
                                                />
                                            ) : (
                                                <p className="font-medium text-gray-900 dark:text-white truncate">{u.full_name || 'Tanpa Nama'}</p>
                                            )}
                                            <p className="text-xs text-gray-500 truncate">{u.email}</p>
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
                                                <option value="waka_kesiswaan">Waka Kesiswaan</option>
                                                <option value="kepala_madrasah">Kepala Madrasah</option>
                                                <option value="student">Siswa</option>
                                                <option value="parent">Orang Tua</option>
                                            </select>
                                            <button onClick={() => handleUpdateUser(u.user_id)} disabled={updating} className="p-1.5 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600">
                                                {updating ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                                            </button>
                                            <button
                                                onClick={() => setEditingUserId(null)}
                                                aria-label="Batal edit"
                                                className="p-1.5 bg-gray-200 dark:bg-gray-700 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
                                            >
                                                <X size={14} aria-hidden="true" />
                                            </button>
                                        </div>
                                    ) : (
                                        <span className={`px-3 py-1 rounded-full text-xs font-semibold ${getRoleBadgeClass(u.role || 'user')}`}>
                                            {getRoleLabel(u.role)}
                                        </span>
                                    )}
                                </td>
                                <td className="px-6 py-4">
                                    <div className="flex items-center gap-2">
                                        {u.is_approved ? (
                                            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/20 dark:text-emerald-400 dark:border-emerald-900/50">
                                                Disetujui
                                            </span>
                                        ) : (
                                            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-950/20 dark:text-amber-400 dark:border-amber-900/50 animate-pulse">
                                                Menunggu
                                            </span>
                                        )}
                                        {u.user_id !== user?.id && (
                                            <button
                                                onClick={() => handleToggleApproval?.(u.user_id, !!u.is_approved)}
                                                className={`text-xs px-2 py-0.5 rounded-lg border transition-all ${
                                                    u.is_approved
                                                        ? 'border-gray-200 text-gray-600 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-400 dark:hover:bg-gray-800'
                                                        : 'border-indigo-200 text-indigo-600 hover:bg-indigo-50 dark:border-indigo-850 dark:text-indigo-450 dark:hover:bg-indigo-950/20 font-medium'
                                                }`}
                                            >
                                                {u.is_approved ? 'Blokir' : 'Setujui'}
                                            </button>
                                        )}
                                    </div>
                                </td>
                                <td className="px-6 py-4 text-sm text-gray-500">
                                    {u.created_at ? new Date(u.created_at).toLocaleDateString('id-ID') : '-'}
                                </td>
                                <td className="px-6 py-4 text-right">
                                    <div className="flex justify-end gap-2">
                                        <button
                                            onClick={() => { setEditingUserId(u.user_id); setNewRole(u.role || 'teacher'); setNewName(u.full_name || ''); }}
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

            {/* Pagination Controls active users */}
            {!usersLoading && userTotal > 0 && (
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 px-6 py-4 border-t border-gray-100 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-900/10">
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
            )}

            {/* Deleted Users Toggle Block */}
            <div className="mt-8 border-t border-gray-100 dark:border-gray-700 pt-6">
                <div className="px-6 pb-4 flex items-center justify-between">
                    <div>
                        <h3 className="text-lg font-bold text-gray-900 dark:text-white">Pengguna yang Dihapus</h3>
                        <p className="text-xs text-gray-500">Daftar akun yang dinonaktifkan (dapat dipulihkan)</p>
                    </div>
                    <Button
                        variant="outline"
                        onClick={() => setShowDeletedUsers(!showDeletedUsers)}
                        className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300"
                    >
                        {showDeletedUsers ? 'Sembunyikan' : `Tampilkan (${deletedTotal})`}
                    </Button>
                </div>

                {showDeletedUsers && (
                    <div className="animate-fade-in">
                        <div className="overflow-x-auto border-t border-gray-100 dark:border-gray-700">
                            <table className="w-full">
                                <thead className="bg-red-50/30 dark:bg-red-950/10">
                                    <tr className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                                        <th className="px-6 py-4 text-left">Pengguna</th>
                                        <th className="px-6 py-4 text-left">Peran Sebelum Hapus</th>
                                        <th className="px-6 py-4 text-left">Tanggal Dihapus</th>
                                        <th className="px-6 py-4 text-right">Aksi Pemulihan</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                                    {usersLoading ? (
                                        <tr>
                                            <td colSpan={4} className="px-6 py-12 text-center">
                                                <Loader2 className="w-8 h-8 animate-spin text-indigo-500 mx-auto" />
                                            </td>
                                        </tr>
                                    ) : deletedUsers.length === 0 ? (
                                        <tr>
                                            <td colSpan={4} className="px-6 py-12 text-center text-gray-500">
                                                Tidak ada pengguna terhapus ditemukan
                                            </td>
                                        </tr>
                                    ) : deletedUsers.map((u) => (
                                        <tr key={u.user_id} className="hover:bg-red-50/10 dark:hover:bg-red-950/5">
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-10 h-10 rounded-full bg-gray-300 dark:bg-gray-700 flex items-center justify-center text-gray-600 dark:text-gray-300 font-bold">
                                                        {u.full_name?.[0]?.toUpperCase() || u.email?.[0]?.toUpperCase() || 'U'}
                                                    </div>
                                                    <div>
                                                        <p className="font-medium text-gray-500 dark:text-gray-400 line-through">{u.full_name || 'Tanpa Nama'}</p>
                                                        <p className="text-xs text-gray-400">{u.email}</p>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className={`px-3 py-1 rounded-full text-xs font-semibold ${getRoleBadgeClass(u.role || 'user')} opacity-60`}>
                                                    {getRoleLabel(u.role)}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-sm text-gray-500">
                                                {u.deleted_at ? new Date(u.deleted_at).toLocaleDateString('id-ID') : '-'}
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <div className="flex justify-end gap-2">
                                                    <button
                                                        onClick={() => restoreUser(u)}
                                                        className="p-2 text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/20 rounded-lg flex items-center gap-1.5 text-xs font-semibold transition-all border border-emerald-200 dark:border-emerald-800 px-3"
                                                        title="Pulihkan Pengguna"
                                                    >
                                                        <Undo2 size={14} />
                                                        Pulihkan
                                                    </button>
                                                    <button
                                                        onClick={() => permanentDeleteUser(u.user_id)}
                                                        className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20 rounded-lg"
                                                        title="Hapus Permanen"
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

                        {/* Pagination Deleted Users */}
                        {!usersLoading && deletedTotal > 0 && (
                            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 px-6 py-4 border-t border-gray-100 dark:border-gray-700 bg-red-50/10 dark:bg-red-950/5">
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
                        )}
                    </div>
                )}
            </div>

            {/* Add User Modal */}
            {showAddModal && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-white dark:bg-gray-800 rounded-2xl max-w-md w-full p-6 shadow-2xl animate-in fade-in zoom-in duration-200">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-xl font-bold text-gray-900 dark:text-white">Tambah Pengguna Baru</h3>
                            <button
                                onClick={() => setShowAddModal(false)}
                                className="text-gray-400 hover:text-gray-500 dark:hover:text-gray-300"
                            >
                                <X size={20} />
                            </button>
                        </div>
                        {addUserError && (
                            <div className="mb-4 p-3 bg-red-50 text-red-600 rounded-xl text-sm">
                                {addUserError}
                            </div>
                        )}
                        <form onSubmit={handleAddUser} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Nama Lengkap</label>
                                <input
                                    type="text"
                                    required
                                    value={addUserForm.name}
                                    onChange={e => setAddUserForm({ ...addUserForm, name: e.target.value })}
                                    className="w-full px-4 py-2 border rounded-xl dark:bg-gray-900 dark:border-gray-700"
                                    placeholder="Masukkan nama lengkap"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Email</label>
                                <input
                                    type="email"
                                    required
                                    value={addUserForm.email}
                                    onChange={e => setAddUserForm({ ...addUserForm, email: e.target.value })}
                                    className="w-full px-4 py-2 border rounded-xl dark:bg-gray-900 dark:border-gray-700"
                                    placeholder="email@sekolah.sch.id"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Password</label>
                                <input
                                    type="password"
                                    required
                                    minLength={6}
                                    value={addUserForm.password}
                                    onChange={e => setAddUserForm({ ...addUserForm, password: e.target.value })}
                                    className="w-full px-4 py-2 border rounded-xl dark:bg-gray-900 dark:border-gray-700"
                                    placeholder="Minimal 6 karakter"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Peran</label>
                                <select
                                    value={addUserForm.role}
                                    onChange={e => setAddUserForm({ ...addUserForm, role: e.target.value })}
                                    className="w-full px-4 py-2 border rounded-xl dark:bg-gray-900 dark:border-gray-700"
                                >
                                    <option value="admin">Admin</option>
                                    <option value="teacher">Guru</option>
                                    <option value="waka_kesiswaan">Waka Kesiswaan</option>
                                    <option value="kepala_madrasah">Kepala Madrasah</option>
                                    <option value="student">Siswa</option>
                                    <option value="parent">Orang Tua</option>
                                </select>
                            </div>
                            <div className="flex gap-3 pt-4">
                                <Button
                                    type="button"
                                    variant="outline"
                                    className="flex-1"
                                    onClick={() => setShowAddModal(false)}
                                >
                                    Batal
                                </Button>
                                <Button
                                    type="submit"
                                    className="flex-1 bg-indigo-600 hover:bg-indigo-700"
                                    disabled={isAddingUser}
                                >
                                    {isAddingUser ? <Loader2 size={18} className="animate-spin mx-auto" /> : 'Simpan Akun'}
                                </Button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};
