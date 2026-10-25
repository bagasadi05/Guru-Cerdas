import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../../../services/supabase';
import type { UserRoleRecord } from '../types';
import { USER_PAGE_SIZE, sanitizeSearchTerm } from '../utils';

interface UseAdminUsersOptions {
    currentUserId?: string;
    onError: (msg: string) => void;
    onLogAction?: (tableName: string, action: string, recordId: string, oldData?: unknown, newData?: unknown) => Promise<void>;
    onAfterMutation?: () => void;
}

export const useAdminUsers = ({ currentUserId, onError, onLogAction, onAfterMutation }: UseAdminUsersOptions) => {
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
    const [newName, setNewName] = useState<string>('');
    const [updating, setUpdating] = useState(false);

    const [deleteModal, setDeleteModal] = useState<{ show: boolean; user: UserRoleRecord | null }>({
        show: false,
        user: null,
    });

    const [undoToast, setUndoToast] = useState<{
        show: boolean;
        user: UserRoleRecord | null;
        timeout: ReturnType<typeof setTimeout> | null;
    }>({
        show: false,
        user: null,
        timeout: null,
    });

    useEffect(() => {
        const handle = setTimeout(() => setDebouncedSearchTerm(searchTerm.trim()), 300);
        return () => clearTimeout(handle);
    }, [searchTerm]);

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

    const fetchUsers = useCallback(async () => {
        setUsersLoading(true);
        const safeSearch = sanitizeSearchTerm(debouncedSearchTerm);
        const activeFrom = (userPage - 1) * USER_PAGE_SIZE;
        const activeTo = activeFrom + USER_PAGE_SIZE - 1;
        const deletedFrom = (deletedPage - 1) * USER_PAGE_SIZE;
        const deletedTo = deletedFrom + USER_PAGE_SIZE - 1;

        try {
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
                activeQuery.order('created_at', { ascending: false }).range(activeFrom, activeTo),
                deletedQuery.order('deleted_at', { ascending: false }).range(deletedFrom, deletedTo),
            ]);

            if (activeResult.error) throw activeResult.error;
            if (deletedResult.error) throw deletedResult.error;

            setUsers((activeResult.data || []) as UserRoleRecord[]);
            setUserTotal(activeResult.count || 0);
            setDeletedUsers((deletedResult.data || []) as UserRoleRecord[]);
            setDeletedTotal(deletedResult.count || 0);
        } catch (err: unknown) {
            onError((err as Error).message);
            setUsers([]);
            setDeletedUsers([]);
            setUserTotal(0);
            setDeletedTotal(0);
        } finally {
            setUsersLoading(false);
        }
    }, [debouncedSearchTerm, userPage, deletedPage, roleFilter, onError]);

    const handleUpdateUser = async (userId: string) => {
        if (!newRole) return;
        if (userId === currentUserId) {
            onError('Tidak dapat mengubah akun sendiri');
            return;
        }
        setUpdating(true);
        try {
            const userToUpdate = users.find((u) => u.user_id === userId) || null;
            const { error } = await supabase
                .from('user_roles')
                .update({ role: newRole as 'admin' | 'teacher' | 'student' | 'parent', full_name: newName || null })
                .eq('user_id', userId);
            if (error) throw error;
            const updatedUser = userToUpdate
                ? { ...userToUpdate, role: newRole, full_name: newName }
                : { user_id: userId, role: newRole, full_name: newName };
            if (onLogAction) {
                await onLogAction('user_roles', 'UPDATE', userId, userToUpdate, updatedUser);
            }
            setEditingUserId(null);
            fetchUsers();
            onAfterMutation?.();
        } catch (err: unknown) {
            onError('Error: ' + (err as Error).message);
        } finally {
            setUpdating(false);
        }
    };

    const handleToggleApproval = async (userId: string, currentStatus: boolean) => {
        if (userId === currentUserId) {
            onError('Tidak dapat mengubah status persetujuan akun sendiri');
            return;
        }
        try {
            const userToUpdate = users.find((u) => u.user_id === userId) || null;
            const nextStatus = !currentStatus;
            const { data, error } = await supabase
                .from('user_roles')
                .update({ is_approved: nextStatus })
                .eq('user_id', userId)
                .select('user_id, is_approved')
                .maybeSingle();
            if (error) throw error;
            if (!data || data.is_approved !== nextStatus) {
                throw new Error('Status persetujuan tidak berubah. Pastikan akun Anda memiliki izin admin.');
            }
            const updatedUser = userToUpdate
                ? { ...userToUpdate, is_approved: nextStatus }
                : { user_id: userId, is_approved: nextStatus };
            if (onLogAction) {
                await onLogAction('user_roles', 'UPDATE', userId, userToUpdate, updatedUser);
            }
            fetchUsers();
            onAfterMutation?.();
        } catch (err: unknown) {
            onError('Error: ' + (err as Error).message);
        }
    };

    const openDeleteModal = (userToDelete: UserRoleRecord) => {
        if (userToDelete.user_id === currentUserId) {
            onError('Tidak dapat menghapus akun sendiri');
            return;
        }
        setDeleteModal({ show: true, user: userToDelete });
    };

    const confirmSoftDelete = async () => {
        const userToDelete = deleteModal.user;
        if (!userToDelete) return;

        try {
            const deletedAt = new Date().toISOString();
            const { error } = await supabase
                .from('user_roles')
                .update({ deleted_at: deletedAt } as any) // eslint-disable-line @typescript-eslint/no-explicit-any
                .eq('user_id', userToDelete.user_id);

            if (error) throw error;

            if (onLogAction) {
                await onLogAction('user_roles', 'UPDATE', userToDelete.user_id, userToDelete, {
                    ...userToDelete,
                    deleted_at: deletedAt,
                });
            }

            setDeleteModal({ show: false, user: null });
            fetchUsers();
            onAfterMutation?.();

            if (undoToast.timeout) clearTimeout(undoToast.timeout);
            const timeoutId = setTimeout(() => setUndoToast({ show: false, user: null, timeout: null }), 3000);
            setUndoToast({ show: true, user: userToDelete, timeout: timeoutId });
        } catch (err: unknown) {
            onError('Error: ' + (err as Error).message);
        }
    };

    const restoreUser = async (userToRestore: UserRoleRecord) => {
        try {
            const { error } = await supabase
                .from('user_roles')
                .update({ deleted_at: null } as any) // eslint-disable-line @typescript-eslint/no-explicit-any
                .eq('user_id', userToRestore.user_id);

            if (error) throw error;

            if (onLogAction) {
                await onLogAction('user_roles', 'UPDATE', userToRestore.user_id, userToRestore, {
                    ...userToRestore,
                    deleted_at: null,
                });
            }
            fetchUsers();
            onAfterMutation?.();
        } catch (err: unknown) {
            onError('Error: ' + (err as Error).message);
        }
    };

    const permanentDeleteUser = async (userId: string) => {
        if (!userId) return;
        if (userId === currentUserId) {
            onError('Tidak dapat menghapus akun sendiri');
            return;
        }

        try {
            const deletedUser = deletedUsers.find((u) => u.user_id === userId) || null;
            await supabase.from('user_roles').delete().eq('user_id', userId);
            if (onLogAction) {
                await onLogAction('user_roles', 'DELETE', userId, deletedUser, null);
            }
            fetchUsers();
            onAfterMutation?.();
        } catch (err: unknown) {
            onError('Error: ' + (err as Error).message);
        }
    };

    return {
        users,
        deletedUsers,
        showDeletedUsers,
        setShowDeletedUsers,
        usersLoading,
        searchTerm,
        setSearchTerm,
        debouncedSearchTerm,
        roleFilter,
        setRoleFilter,
        userPage,
        setUserPage,
        userTotal,
        deletedPage,
        setDeletedPage,
        deletedTotal,
        editingUserId,
        setEditingUserId,
        newRole,
        setNewRole,
        newName,
        setNewName,
        updating,
        deleteModal,
        setDeleteModal,
        undoToast,
        setUndoToast,
        fetchUsers,
        handleUpdateUser,
        handleToggleApproval,
        openDeleteModal,
        confirmSoftDelete,
        restoreUser,
        permanentDeleteUser,
    };
};
