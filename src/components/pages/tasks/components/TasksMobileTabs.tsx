import React from 'react';
import { TaskRow, TaskStatus } from '../types';
import { statusConfig, statusOrder } from '../utils';
import { TaskCard } from './TaskCard';

export interface TasksMobileTabsProps {
    mobileActiveTab: TaskStatus;
    onSelectTab: (status: TaskStatus) => void;
    tasksByStatus: Record<TaskStatus, TaskRow[]>;
    onEdit: (task: TaskRow) => void;
    onDelete: (id: string) => void;
    onStatusChange: (id: string, newStatus: TaskStatus) => void;
    onAddTask: (status: TaskStatus) => void;
    updatingTaskId: string | null;
}

export const TasksMobileTabs: React.FC<TasksMobileTabsProps> = ({
    mobileActiveTab,
    onSelectTab,
    tasksByStatus,
    onEdit,
    onDelete,
    onStatusChange,
    onAddTask,
    updatingTaskId,
}) => {
    return (
        <div className="lg:hidden">
            <div className="flex rounded-xl bg-slate-200/50 dark:bg-slate-800/50 p-1 mb-4">
                {statusOrder.map((statusKey) => {
                    const config = statusConfig[statusKey];
                    const count = tasksByStatus[statusKey].length;
                    return (
                        <button
                            type="button"
                            key={statusKey}
                            onClick={() => onSelectTab(statusKey)}
                            className={`flex-1 flex flex-col items-center gap-1 py-2 px-1 rounded-lg text-sm font-medium transition-all cursor-pointer active:scale-95 duration-150 ${
                                mobileActiveTab === statusKey
                                    ? `${config.bgColor} ${config.color} shadow-sm border ${
                                          statusKey === 'todo'
                                              ? 'border-slate-200'
                                              : statusKey === 'in_progress'
                                              ? 'border-blue-200'
                                              : 'border-emerald-200'
                                      } dark:border-slate-600`
                                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300'
                            }`}
                        >
                            <span className="flex items-center justify-center">
                                {React.cloneElement(config.icon as React.ReactElement, { className: 'w-5 h-5 sm:w-4 sm:h-4' })}
                            </span>
                            <span className={`text-xxs sm:text-xs leading-none text-center ${mobileActiveTab === statusKey ? 'font-bold' : ''}`}>
                                {config.title}
                            </span>
                            <span className={`text-xxs mt-0.5 ${mobileActiveTab === statusKey ? config.color : 'text-slate-400 dark:text-slate-500'}`}>
                                {count} tugas
                            </span>
                        </button>
                    );
                })}
            </div>

            {/* Mobile Task List */}
            <div className="space-y-3">
                {tasksByStatus[mobileActiveTab].length === 0 ? (
                    <div className="text-center py-12 bg-slate-100/50 dark:bg-slate-800/30 rounded-2xl border border-dashed border-slate-300/50 dark:border-slate-700/50">
                        <div className={`w-12 h-12 mx-auto rounded-xl ${statusConfig[mobileActiveTab].bgColor} flex items-center justify-center ${statusConfig[mobileActiveTab].color} mb-3`}>
                            {statusConfig[mobileActiveTab].icon}
                        </div>
                        <p className="text-slate-500 dark:text-slate-500 mb-3">Tidak ada tugas {statusConfig[mobileActiveTab].title}</p>
                        <button
                            type="button"
                            onClick={() => onAddTask(mobileActiveTab)}
                            className="text-sm text-brand-600 dark:text-brand-400 hover:text-brand-500 dark:hover:text-brand-300 font-medium cursor-pointer active:scale-95 duration-150"
                        >
                            + Tambah tugas
                        </button>
                    </div>
                ) : (
                    tasksByStatus[mobileActiveTab].map((task) => (
                        <TaskCard
                            key={task.id}
                            task={task}
                            onEdit={onEdit}
                            onDelete={onDelete}
                            onStatusChange={onStatusChange}
                            isUpdating={updatingTaskId === task.id}
                        />
                    ))
                )}
            </div>
        </div>
    );
};
