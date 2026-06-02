import React from 'react';
import {
    Search,
    Loader2,
    Edit2,
    Save,
    X,
    Trash2,
    Undo2,
} from 'lucide-react';
import { UserRoleRecord } from './types';
import { getRoleBadgeClass } from './components';
import { Button } from '../../ui/Button';

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
    updating: boolean;
    handleUpdateRole: (userId: string) => Promise<void>;
    openDeleteModal: (user: UserRoleRecord) => void;
    restoreUser: (user: UserRoleRecord) => Promise<void>;
    permanentDeleteUser: (userId: string) => Promise<void>;
    userTotal: number;
    deletedTotal: number;
    showDeletedUsers: boolean;
    setShowDeletedUsers: (show: boolean) => void;
}

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
    updating,
    handleUpdateRole,
    openDeleteModal,
    restoreUser,
    permanentDeleteUser,
    userTotal,
    deletedTotal,
    showDeletedUsers,
    setShowDeletedUsers,
}) => {
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
                                                        className="p-2 text-green-600 hover:bg-green-50 dark:hover:bg-green-950/20 rounded-lg flex items-center gap-1.5 text-xs font-semibold transition-all border border-green-200 dark:border-green-800 px-3"
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
        </div>
    );
};
