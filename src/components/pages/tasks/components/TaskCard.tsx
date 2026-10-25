import React, { useState } from 'react';
import {
    EditIcon,
    TrashIcon,
    CalendarIcon,
    AlertTriangleIcon,
    MoreVerticalIcon,
    ArrowRightIcon,
} from '../../../Icons';
import { TaskRow, TaskStatus } from '../types';
import {
    statusConfig,
    statusOrder,
    isOverdue,
    formatDateDisplay,
    renderDescription,
} from '../utils';

export interface TaskCardProps {
    task: TaskRow;
    onEdit: (task: TaskRow) => void;
    onDelete: (id: string) => void;
    onStatusChange: (id: string, newStatus: TaskStatus) => void;
    isUpdating?: boolean;
}

export const TaskCard: React.FC<TaskCardProps> = ({
    task,
    onEdit,
    onDelete,
    onStatusChange,
    isUpdating,
}) => {
    const [showMenu, setShowMenu] = useState(false);
    const taskStatus = (task.status as TaskStatus) || 'todo';
    const overdue = isOverdue(task.due_date) && taskStatus !== 'done';
    const currentStatus = statusConfig[taskStatus];

    const currentIndex = statusOrder.indexOf(taskStatus);
    const nextStatus = currentIndex < statusOrder.length - 1 ? statusOrder[currentIndex + 1] : null;
    const prevStatus = currentIndex > 0 ? statusOrder[currentIndex - 1] : null;

    return (
        <div
            draggable={!isUpdating}
            onDragStart={(e) => {
                e.dataTransfer.setData("text/plain", task.id);
                e.dataTransfer.effectAllowed = "move";
            }}
            className={`
                rounded-2xl p-4 border transition-all duration-300 group relative overflow-hidden cursor-grab active:cursor-grabbing
                bg-white dark:bg-slate-800/50 border-slate-200 dark:border-white/5 hover:border-brand-500/30 hover:shadow-lg hover:shadow-brand-600/10 shadow-sm
                ${overdue ? 'border-l-4 border-l-red-500' : 'border-l-4 border-l-transparent'}
                ${isUpdating ? 'opacity-60 pointer-events-none' : ''}
            `}
        >
            <div className="absolute inset-0 bg-gradient-to-br from-slate-50/50 dark:from-white/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"></div>

            {/* Header with Status Badge */}
            <div className="flex items-start gap-3">
                <div className={`p-2 rounded-xl ${currentStatus.bgColor} ${currentStatus.color}`}>
                    {currentStatus.icon}
                </div>

                <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                        <div>
                            <h4 className={`font-medium text-slate-800 dark:text-white leading-snug ${task.status === 'done' ? 'line-through text-slate-400 dark:text-slate-400' : ''}`}>
                                {task.title}
                            </h4>
                            <span className={`text-xs font-medium ${currentStatus.textColor}`}>
                                {currentStatus.title}
                            </span>
                        </div>

                        {/* Menu */}
                        <div className="relative">
                            <button
                                type="button"
                                onClick={(e) => { e.stopPropagation(); setShowMenu(!showMenu); }}
                                className="p-2 min-h-[36px] min-w-[36px] flex items-center justify-center rounded-xl hover:bg-slate-200/50 dark:hover:bg-slate-700/50 text-slate-400 hover:text-slate-700 dark:hover:text-white transition-all cursor-pointer active:scale-90"
                                aria-label="Opsi tugas"
                                aria-expanded={showMenu}
                                aria-haspopup="menu"
                            >
                                <MoreVerticalIcon className="w-5 h-5 sm:w-4 sm:h-4" />
                            </button>

                            {showMenu && (
                                <>
                                    <div
                                        role="presentation"
                                        aria-hidden="true"
                                        onKeyDown={(e) => { if (e.key === 'Escape') setShowMenu(false); }}
                                        className="fixed inset-0 z-10"
                                        onClick={() => setShowMenu(false)}
                                    />
                                    <div className="absolute right-0 top-full mt-1 w-40 sm:w-36 bg-white dark:bg-slate-800 rounded-xl shadow-2xl border border-slate-200 dark:border-slate-700 py-1 z-20">
                                        <button
                                            type="button"
                                            onClick={(e) => { e.stopPropagation(); onEdit(task); setShowMenu(false); }}
                                            className="w-full flex items-center gap-3 sm:gap-2 px-4 sm:px-3 py-3 sm:py-2 text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700/50 cursor-pointer active:scale-[0.98] transition-transform"
                                        >
                                            <EditIcon className="w-4 h-4" />
                                            Edit
                                        </button>
                                        <button
                                            type="button"
                                            onClick={(e) => { e.stopPropagation(); onDelete(task.id); setShowMenu(false); }}
                                            className="w-full flex items-center gap-3 sm:gap-2 px-4 sm:px-3 py-3 sm:py-2 text-sm text-red-500 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10 cursor-pointer active:scale-[0.98] transition-transform"
                                        >
                                            <TrashIcon className="w-4 h-4" />
                                            Hapus
                                        </button>
                                    </div>
                                </>
                            )}
                        </div>
                    </div>

                    {task.description && (
                        <p className="text-sm text-slate-500 dark:text-slate-400 mt-2 line-clamp-2">
                            {renderDescription(task.description)}
                        </p>
                    )}

                    {/* Footer with Date and Status Buttons */}
                    <div className="flex items-center justify-between gap-3 mt-4">
                        {task.due_date && (
                            <div className={`inline-flex items-center gap-1.5 text-xs font-medium px-2 py-1 rounded-lg ${overdue
                                ? 'bg-red-100 dark:bg-red-500/20 text-red-700 dark:text-red-400'
                                : 'bg-slate-100 dark:bg-slate-700/50 text-slate-600 dark:text-slate-400'
                                }`}>
                                {overdue ? <AlertTriangleIcon className="w-3 h-3" /> : <CalendarIcon className="w-3 h-3" />}
                                {formatDateDisplay(task.due_date)}
                            </div>
                        )}

                        <div className="flex items-center gap-2 ml-auto">
                            {prevStatus && (
                                <button
                                    type="button"
                                    onClick={() => onStatusChange(task.id, prevStatus)}
                                    className="px-3 py-2 sm:px-2.5 sm:py-1.5 text-xs font-medium rounded-lg bg-slate-100 dark:bg-slate-700/50 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-600/50 hover:text-slate-800 dark:hover:text-white transition-all flex items-center gap-1.5 sm:gap-1 cursor-pointer active:scale-95 duration-150"
                                    title={`Pindah ke ${statusConfig[prevStatus].title}`}
                                    disabled={isUpdating}
                                >
                                    <ArrowRightIcon className="w-3.5 h-3.5 sm:w-3 sm:h-3 rotate-180" />
                                    {statusConfig[prevStatus].title}
                                </button>
                            )}
                            {nextStatus && (
                                <button
                                    type="button"
                                    onClick={() => onStatusChange(task.id, nextStatus)}
                                    className={`px-3 py-2 sm:px-2.5 sm:py-1.5 text-xs font-medium rounded-lg transition-all flex items-center gap-1.5 sm:gap-1 cursor-pointer active:scale-95 duration-150 ${nextStatus === 'done'
                                        ? 'bg-emerald-500/20 text-emerald-700 hover:bg-emerald-500/30'
                                        : 'bg-blue-500/20 text-blue-600 hover:bg-blue-500/30'
                                        }`}
                                    title={`Pindah ke ${statusConfig[nextStatus].title}`}
                                    disabled={isUpdating}
                                >
                                    {statusConfig[nextStatus].title}
                                    <ArrowRightIcon className="w-3.5 h-3.5 sm:w-3 sm:h-3" />
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
