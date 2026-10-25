import React from 'react';
import { Button } from '../ui/Button';
import { TasksPageSkeleton } from '../skeletons/PageSkeletons';
import { EmptyError } from '../EmptyStates';
import {
    AlertTriangleIcon,
    Loader2Icon,
    CheckSquareIcon,
    PlusIcon,
} from '../Icons';
import {
    useTasksPageState,
    statusOrder,
    TaskColumn,
    TasksHeader,
    TasksStatsCards,
    TasksMobileTabs,
    TasksModals,
} from './tasks';

const TasksPage: React.FC = () => {
    const {
        tasks,
        isLoading,
        isError,
        isFetching,
        refetch,
        taskLoadErrorMessage,
        searchQuery,
        setSearchQuery,
        tasksByStatus,
        stats,
        mobileActiveTab,
        setMobileActiveTab,
        updatingTaskId,
        isModalOpen,
        setIsModalOpen,
        editingTask,
        taskToDeleteId,
        setTaskToDeleteId,
        isConfirmingClearAll,
        setIsConfirmingClearAll,
        title,
        setTitle,
        description,
        setDescription,
        dueDate,
        setDueDate,
        status,
        setStatus,
        errors,
        isPastDate,
        resetForm,
        handleSubmit,
        handleEdit,
        handleAddTask,
        handleStatusChange,
        createTaskMutation,
        updateTaskMutation,
        deleteTaskMutation,
        clearCompletedTasksMutation,
    } = useTasksPageState();

    if (isLoading) {
        return <TasksPageSkeleton />;
    }

    if (isError && tasks.length === 0) {
        return (
            <div className="w-full min-h-full p-3 sm:p-4 md:p-6 lg:p-8 flex flex-col space-y-4 sm:space-y-6 lg:space-y-8 bg-transparent max-w-7xl mx-auto pb-24 lg:pb-8">
                <EmptyError
                    message={taskLoadErrorMessage}
                    onRetry={() => refetch()}
                />
            </div>
        );
    }

    return (
        <div className="w-full min-h-full p-3 sm:p-4 md:p-6 lg:p-8 flex flex-col space-y-4 sm:space-y-6 lg:space-y-8 bg-transparent max-w-7xl mx-auto pb-24 lg:pb-8">
            {isError && (
                <div className="rounded-2xl border border-red-200/60 dark:border-red-500/30 bg-red-50/60 dark:bg-red-500/10 px-4 py-3 shadow-sm">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                        <div className="flex items-start gap-3">
                            <div className="p-2 rounded-xl bg-red-100 dark:bg-red-500/20 text-red-700 dark:text-red-400">
                                <AlertTriangleIcon className="w-4 h-4" />
                            </div>
                            <div>
                                <p className="text-sm font-semibold text-red-700 dark:text-red-300">Gagal memuat tugas</p>
                                <p className="text-xs text-red-600/80 dark:text-red-400/80">{taskLoadErrorMessage}</p>
                            </div>
                        </div>
                        <Button
                            onClick={() => refetch()}
                            disabled={isFetching}
                            className="self-start sm:self-auto bg-red-600 hover:bg-red-700 text-white rounded-xl"
                        >
                            {isFetching && <Loader2Icon className="w-4 h-4 mr-2 animate-spin" />}
                            Coba Lagi
                        </Button>
                    </div>
                </div>
            )}

            {/* Header */}
            <TasksHeader
                searchQuery={searchQuery}
                onSearchChange={setSearchQuery}
                hasDoneTasks={stats.done > 0}
                onClearCompletedClick={() => setIsConfirmingClearAll(true)}
                onAddTaskClick={() => handleAddTask('todo')}
            />

            {/* Stats Cards */}
            <TasksStatsCards stats={stats} />

            {/* Mobile Tab Navigation & List */}
            <TasksMobileTabs
                mobileActiveTab={mobileActiveTab}
                onSelectTab={setMobileActiveTab}
                tasksByStatus={tasksByStatus}
                onEdit={handleEdit}
                onDelete={setTaskToDeleteId}
                onStatusChange={handleStatusChange}
                onAddTask={handleAddTask}
                updatingTaskId={updatingTaskId}
            />

            {/* Desktop Kanban Board */}
            <div className="hidden lg:grid lg:grid-cols-3 gap-4">
                {statusOrder.map((statusKey) => (
                    <TaskColumn
                        key={statusKey}
                        status={statusKey}
                        tasks={tasksByStatus[statusKey]}
                        onEdit={handleEdit}
                        onDelete={setTaskToDeleteId}
                        onStatusChange={handleStatusChange}
                        onAddTask={handleAddTask}
                        updatingTaskId={updatingTaskId}
                    />
                ))}
            </div>

            {/* Empty State */}
            {tasks.length === 0 && !isError && (
                <div className="text-center py-16 bg-slate-100/50 dark:bg-slate-800/30 rounded-2xl border border-slate-200/50 dark:border-slate-700/50">
                    <div className="w-20 h-20 mx-auto rounded-2xl bg-slate-200 dark:bg-slate-800 flex items-center justify-center mb-4">
                        <CheckSquareIcon className="w-10 h-10 text-slate-400 dark:text-slate-600" />
                    </div>
                    <h3 className="text-xl font-semibold text-slate-800 dark:text-white mb-2">Belum ada tugas</h3>
                    <p className="text-slate-500 dark:text-slate-400 mb-6">Mulai dengan menambahkan tugas pertama Anda</p>
                    <Button
                        onClick={() => handleAddTask('todo')}
                        className="bg-brand-600 hover:bg-brand-700 text-white rounded-xl"
                    >
                        <PlusIcon className="w-4 h-4 mr-2" />
                        Tambah Tugas Pertama
                    </Button>
                </div>
            )}

            {/* Modals & Dialogs */}
            <TasksModals
                isModalOpen={isModalOpen}
                onCloseModal={() => {
                    setIsModalOpen(false);
                    resetForm();
                }}
                editingTask={editingTask}
                title={title}
                onTitleChange={setTitle}
                description={description}
                onDescriptionChange={setDescription}
                dueDate={dueDate}
                onDueDateChange={setDueDate}
                status={status}
                onStatusChange={setStatus}
                errors={errors}
                isPastDate={isPastDate}
                isSavePending={createTaskMutation.isPending || updateTaskMutation.isPending}
                onSubmitForm={handleSubmit}
                taskToDeleteId={taskToDeleteId}
                onCloseDeleteModal={() => setTaskToDeleteId(null)}
                onConfirmDelete={(id) => deleteTaskMutation.mutate(id)}
                isConfirmingClearAll={isConfirmingClearAll}
                onCloseClearAllModal={() => setIsConfirmingClearAll(false)}
                onConfirmClearAll={() => clearCompletedTasksMutation.mutate()}
                isClearAllPending={clearCompletedTasksMutation.isPending}
            />
        </div>
    );
};

export default TasksPage;
