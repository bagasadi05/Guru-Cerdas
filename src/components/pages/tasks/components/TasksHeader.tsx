import React from 'react';
import {
    CheckSquareIcon,
    SearchIcon,
    TrashIcon,
    PlusIcon,
} from '../../../Icons';
import { Button } from '../../../ui/Button';

export interface TasksHeaderProps {
    searchQuery: string;
    onSearchChange: (value: string) => void;
    hasDoneTasks: boolean;
    onClearCompletedClick: () => void;
    onAddTaskClick: () => void;
}

export const TasksHeader: React.FC<TasksHeaderProps> = ({
    searchQuery,
    onSearchChange,
    hasDoneTasks,
    onClearCompletedClick,
    onAddTaskClick,
}) => {
    return (
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
            <div>
                <h1 className="text-3xl font-bold tracking-tight font-serif mb-2 text-slate-900 dark:text-white bg-clip-text text-transparent bg-gradient-to-r from-slate-900 to-slate-800 dark:from-white dark:to-slate-300">
                    Manajemen Tugas
                </h1>
                <p className="text-slate-500 dark:text-slate-400 text-sm font-medium flex items-center gap-2">
                    <CheckSquareIcon className="w-4 h-4" />
                    Kelola tugas Anda dengan mudah
                </p>
            </div>
            <div className="flex items-center gap-3">
                {/* Search */}
                <div className="relative flex-1 md:w-72">
                    <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                    <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => onSearchChange(e.target.value)}
                        placeholder="Cari tugas..."
                        className="w-full pl-10 pr-4 py-2.5 bg-white/50 dark:bg-slate-800/50 backdrop-blur-sm border border-slate-200 dark:border-slate-700/50 rounded-xl text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent transition-all shadow-sm"
                    />
                </div>

                {/* Clear Completed Tasks Button */}
                {hasDoneTasks && (
                    <Button
                        variant="ghost"
                        onClick={onClearCompletedClick}
                        className="text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/20 rounded-xl border border-red-200 dark:border-red-900/50 transition-all font-medium cursor-pointer active:scale-95 duration-150"
                    >
                        <TrashIcon className="w-4 h-4 mr-2" />
                        <span className="hidden sm:inline">Bersihkan Selesai</span>
                    </Button>
                )}

                {/* Add Task Button */}
                <Button
                    onClick={onAddTaskClick}
                    className="bg-brand-600 hover:bg-brand-700 text-white rounded-xl shadow-lg shadow-brand-600/20 cursor-pointer active:scale-95 duration-150"
                >
                    <PlusIcon className="w-4 h-4 mr-2" />
                    <span className="hidden sm:inline">Tugas Baru</span>
                </Button>
            </div>
        </div>
    );
};
