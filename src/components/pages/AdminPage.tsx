import React from 'react';
import {
    useAdminPageState,
    AdminHeader,
    AdminLoadingScreen,
    AdminDeleteUserModal,
    AdminUndoToast,
    AdminErrorToast,
    OverviewTab,
    StudentsMasterDataTab,
    ClassesMasterDataTab,
    UsersTab,
    AnnouncementsTab,
    TeacherAssignmentsTab,
    ActivityLogsTab,
    SystemTab,
    ModulAjarBankTab,
    TelegramNotificationTab,
} from './admin';

export const AdminPage: React.FC = () => {
    const {
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
    } = useAdminPageState();

    if (authLoading || isAdmin === null) {
        return <AdminLoadingScreen />;
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-brand-50/30 dark:from-gray-900 dark:via-gray-900 dark:to-brand-950/20">
            <div className="max-w-7xl mx-auto px-4 py-6 md:px-8">
                {/* Header & Tabs Navigation */}
                <AdminHeader
                    currentTime={currentTime}
                    activeTab={activeTab}
                    onTabChange={setActiveTab}
                    onRefresh={refreshAll}
                    statsLoading={statsLoading}
                />

                {/* Tab Content */}
                {activeTab === 'overview' && (
                    <OverviewTab
                        stats={stats}
                        statsLoading={statsLoading}
                        onTabChange={setActiveTab}
                    />
                )}

                {activeTab === 'students' && (
                    <StudentsMasterDataTab />
                )}

                {activeTab === 'classes' && (
                    <ClassesMasterDataTab onLogAction={logAdminAction} />
                )}

                {activeTab === 'users' && (
                    <UsersTab
                        users={users}
                        deletedUsers={deletedUsers}
                        usersLoading={usersLoading}
                        searchTerm={searchTerm}
                        setSearchTerm={setSearchTerm}
                        roleFilter={roleFilter}
                        setRoleFilter={setRoleFilter}
                        userPage={userPage}
                        setUserPage={setUserPage}
                        deletedPage={deletedPage}
                        setDeletedPage={setDeletedPage}
                        editingUserId={editingUserId}
                        setEditingUserId={setEditingUserId}
                        newRole={newRole}
                        setNewRole={setNewRole}
                        newName={newName}
                        setNewName={setNewName}
                        updating={updating}
                        handleUpdateUser={handleUpdateUser}
                        handleToggleApproval={handleToggleApproval}
                        openDeleteModal={openDeleteModal}
                        restoreUser={restoreUser}
                        permanentDeleteUser={permanentDeleteUser}
                        userTotal={userTotal}
                        deletedTotal={deletedTotal}
                        showDeletedUsers={showDeletedUsers}
                        setShowDeletedUsers={setShowDeletedUsers}
                        onRefreshRequested={() => {
                            fetchStats();
                            fetchUsers();
                            fetchActivityLogs();
                        }}
                    />
                )}

                {activeTab === 'announcements' && (
                    <AnnouncementsTab
                        announcements={announcements}
                        announcementsLoading={announcementsLoading}
                        onCreateAnnouncement={handleCreateAnnouncement}
                        onDeleteAnnouncement={handleDeleteAnnouncement}
                    />
                )}

                {activeTab === 'assignments' && (
                    <TeacherAssignmentsTab
                        currentUserId={user?.id}
                        onLogAction={async (tableName, action, recordId, oldData, newData) => {
                            await logAdminAction(tableName, action, recordId, oldData, newData);
                            fetchActivityLogs();
                        }}
                    />
                )}

                {activeTab === 'activity' && (
                    <ActivityLogsTab
                        activityLogs={activityLogs}
                        logsLoading={logsLoading}
                        logSearchTerm={logSearchTerm}
                        setLogSearchTerm={setLogSearchTerm}
                        logPage={logPage}
                        setLogPage={setLogPage}
                        logTotal={logTotal}
                        fetchActivityLogs={fetchActivityLogs}
                    />
                )}

                {activeTab === 'system' && (
                    <SystemTab
                        systemHealth={systemHealth}
                        checkSystemHealth={checkSystemHealth}
                        stats={stats}
                        deletedTotal={deletedTotal}
                        logTotal={logTotal}
                    />
                )}

                {activeTab === 'modul-ajar-bank' && (
                    <ModulAjarBankTab />
                )}

                {activeTab === 'notifications' && (
                    <TelegramNotificationTab />
                )}

                {/* Error Toast */}
                <AdminErrorToast
                    error={error}
                    onDismiss={() => setError(null)}
                />

                {/* Delete Confirmation Modal */}
                <AdminDeleteUserModal
                    isOpen={deleteModal.show}
                    user={deleteModal.user}
                    onClose={() => setDeleteModal({ show: false, user: null })}
                    onConfirm={confirmSoftDelete}
                />

                {/* Success / Undo Toast */}
                <AdminUndoToast
                    isOpen={undoToast.show}
                    user={undoToast.user}
                    onUndo={(u) => {
                        restoreUser(u);
                        setUndoToast({ show: false, user: null, timeout: null });
                    }}
                    onDismiss={() => setUndoToast({ show: false, user: null, timeout: null })}
                />
            </div>
        </div>
    );
};

export default AdminPage;
