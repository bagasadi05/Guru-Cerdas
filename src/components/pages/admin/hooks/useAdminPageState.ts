import { useState, useEffect, useCallback } from 'react';
import type { TabType } from '../types';
import { useAdminAuth } from './useAdminAuth';
import { useAdminStats } from './useAdminStats';
import { useAdminSystemHealth } from './useAdminSystemHealth';
import { useAdminActivityLogs } from './useAdminActivityLogs';
import { useAdminAnnouncements } from './useAdminAnnouncements';
import { useAdminUsers } from './useAdminUsers';
import { useRealTimeClock } from './useRealTimeClock';

export const useAdminPageState = () => {
    const [error, setError] = useState<string | null>(null);
    const [activeTab, setActiveTab] = useState<TabType>('overview');

    const currentTime = useRealTimeClock();
    const { user, authLoading, isAdmin } = useAdminAuth();

    const { stats, statsLoading, fetchStats } = useAdminStats();
    const { systemHealth, checkSystemHealth } = useAdminSystemHealth();

    const {
        activityLogs,
        logsLoading,
        logSearchTerm,
        setLogSearchTerm,
        logPage,
        setLogPage,
        logTotal,
        fetchActivityLogs,
        logAdminAction,
    } = useAdminActivityLogs({
        userId: user?.id,
        userEmail: user?.email,
    });

    const {
        announcements,
        announcementsLoading,
        fetchAnnouncements,
        handleCreateAnnouncement,
        handleDeleteAnnouncement,
    } = useAdminAnnouncements({
        onError: setError,
        onLogAction: async (tbl, act, id, oldD, newD) => {
            await logAdminAction(tbl, act, id, oldD, newD);
            fetchActivityLogs();
        },
    });

    const {
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
    } = useAdminUsers({
        currentUserId: user?.id,
        onError: setError,
        onLogAction: async (tbl, act, id, oldD, newD) => {
            await logAdminAction(tbl, act, id, oldD, newD);
            fetchActivityLogs();
        },
        onAfterMutation: () => {
            fetchStats();
        },
    });

    // Initial load when admin confirmed
    useEffect(() => {
        if (isAdmin) {
            fetchStats();
            fetchAnnouncements();
            checkSystemHealth();
        }
    }, [isAdmin, fetchStats, fetchAnnouncements, checkSystemHealth]);

    useEffect(() => {
        if (isAdmin) {
            fetchUsers();
        }
    }, [isAdmin, debouncedSearchTerm, roleFilter, userPage, deletedPage, fetchUsers]);

    useEffect(() => {
        if (isAdmin) {
            fetchActivityLogs();
        }
    }, [isAdmin, logPage, fetchActivityLogs]);

    const refreshAll = useCallback(() => {
        fetchStats();
        fetchUsers();
        fetchAnnouncements();
        fetchActivityLogs();
        checkSystemHealth();
    }, [fetchStats, fetchUsers, fetchAnnouncements, fetchActivityLogs, checkSystemHealth]);

    return {
        user,
        authLoading,
        isAdmin,
        activeTab,
        setActiveTab,
        error,
        setError,
        currentTime,
        refreshAll,
        // Stats
        stats,
        statsLoading,
        fetchStats,
        // System Health
        systemHealth,
        checkSystemHealth,
        // Logs
        activityLogs,
        logsLoading,
        logSearchTerm,
        setLogSearchTerm,
        logPage,
        setLogPage,
        logTotal,
        fetchActivityLogs,
        logAdminAction,
        // Announcements
        announcements,
        announcementsLoading,
        handleCreateAnnouncement,
        handleDeleteAnnouncement,
        // Users
        users,
        deletedUsers,
        showDeletedUsers,
        setShowDeletedUsers,
        usersLoading,
        searchTerm,
        setSearchTerm,
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
