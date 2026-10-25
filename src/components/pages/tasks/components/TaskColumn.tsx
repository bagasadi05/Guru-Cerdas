import React, { useState } from 'react';
import { PlusIcon } from '../../../Icons';
import { TaskRow, TaskStatus } from '../types';
import { statusConfig } from '../utils';
import { TaskCard } from './TaskCard';

export interface TaskColumnProps {
    status: TaskStatus;
    tasks: TaskRow[];
    onEdit: (task: TaskRow) => void;
    onDelete: (id: string) => void;
    onStatusChange: (id: string, newStatus: TaskStatus) => void;
    onAddTask: (status: TaskStatus) => void;
    updatingTaskId: string | null;
}

export const TaskColumn: React.FC<TaskColumnProps> = ({
    status,
    tasks,
    onEdit,
    onDelete,
    onStatusChange,
    onAddTask,
    updatingTaskId,
}) => {
    const config = statusConfig[status];
    const [isDragOver, setIsDragOver] = useState(false);

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = "move";
        if (!isDragOver) setIsDragOver(true);
    };

    const handleDragLeave = () => {
        setIsDragOver(false);
    };

    const handleDropLocal = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragOver(false);
        const id = e.dataTransfer.getData("text/plain");
        if (id) {
            onStatusChange(id, status);
        }
    };

    return (
        <div className="w-full">
            {/* Column Header */}
            <div className="flex items-center justify-between mb-4 px-2">
                <div className="flex items-center gap-2">
                    <div className={`w-8 h-8 rounded-xl ${config.bgColor} flex items-center justify-center ${config.color} shadow-sm`}>
                        {config.icon}
                    </div>
                    <div>
                        <h3 className="font-bold text-slate-800 dark:text-white dark:text-shadow-sm">{config.title}</h3>
                        <span className="text-xs font-medium text-slate-500 dark:text-slate-400 bg-slate-200/50 dark:bg-slate-700/50 px-2 py-0.5 rounded-full">
                            {tasks.length} tugas
                        </span>
                    </div>
                </div>
                <button
                    type="button"
                    onClick={() => onAddTask(status)}
                    className="p-2 min-h-[36px] min-w-[36px] flex items-center justify-center rounded-xl hover:bg-slate-200/50 dark:hover:bg-slate-700/50 text-slate-400 hover:text-slate-700 dark:hover:text-white transition-all cursor-pointer active:scale-90"
                    title="Tambah tugas"
                    aria-label="Tambah tugas baru"
                >
                    <PlusIcon className="w-4 h-4" />
                </button>
            </div>

            {/* Task List */}
            <div
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDropLocal}
                className={`rounded-3xl p-3 min-h-[300px] transition-all duration-300 ${
                    isDragOver
                        ? 'bg-brand-500/10 border-2 border-dashed border-brand-500 shadow-lg shadow-brand-600/5'
                        : 'bg-white/50 dark:bg-slate-800/30 border border-slate-200/80 dark:border-slate-700/30 shadow-inner'
                }`}
            >
                <div className="space-y-3">
                    {tasks.length === 0 ? (
                        <div className="text-center py-8">
                            <div className={`w-12 h-12 mx-auto rounded-xl ${config.bgColor} flex items-center justify-center ${config.color} mb-3`}>
                                {config.icon}
                            </div>
                            <p className="text-sm text-slate-500">Tidak ada tugas</p>
                            <button
                                type="button"
                                onClick={() => onAddTask(status)}
                                className="mt-3 text-sm text-brand-400 hover:text-brand-300 cursor-pointer active:scale-95 duration-150 font-medium"
                            >
                                + Tambah tugas
                            </button>
                        </div>
                    ) : (
                        tasks.map((task) => (
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
        </div>
    );
};
