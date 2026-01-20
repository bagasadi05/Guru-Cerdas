import React, { useState, useMemo } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Select } from '../ui/Select';
import { Modal } from '../ui/Modal';
import {
    PlusIcon,
    TrashIcon,
    EditIcon,
    CalendarIcon,
    SearchIcon,
    CheckSquareIcon,
} from '../Icons';
import { supabase } from '../../services/supabase';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Database } from '../../services/database.types';
import { useToast } from '../../hooks/useToast';
import { TasksPageSkeleton } from '../skeletons/PageSkeletons';
import { MoreVertical, Loader2, PlayCircle, Circle, CheckCircle2, AlertTriangle, ArrowRight } from 'lucide-react';
import { ValidationService } from '../../services/ValidationService';
import { ValidationRules } from '../../types';
import { EmptyError } from '../EmptyStates';

// Native date helpers
const isDateOnly = (value: string) => /^\d{4}-\d{2}-\d{2}$/.test(value);

// Parse YYYY-MM-DD as a local date to avoid timezone shifts.
const parseDateOnly = (value: string) => {
    const [year, month, day] = value.split('-').map(Number);
    return new Date(year, month - 1, day);
};

const formatDateInputValue = (date: Date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
};

const normalizeDueDateForInput = (dueDate: string | null) => {
    if (!dueDate) return '';
    if (isDateOnly(dueDate)) return dueDate;
    const parsed = new Date(dueDate);
    if (Number.isNaN(parsed.getTime())) return '';
    return formatDateInputValue(parsed);
};

const formatDateDisplay = (dueDate: string) => {
    const date = isDateOnly(dueDate) ? parseDateOnly(dueDate) : new Date(dueDate);
    if (Number.isNaN(date.getTime())) return '-';
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
    return `${date.getDate()} ${months[date.getMonth()]}`;
};

const isOverdue = (dueDate: string | null) => {
    if (!dueDate) return false;
    const now = new Date();
    if (isDateOnly(dueDate)) {
        const date = parseDateOnly(dueDate);
        const endOfDay = new Date(date.getFullYear(), date.getMonth(), date.getDate(), 23, 59, 59, 999);
        return endOfDay < now;
    }
    const parsed = new Date(dueDate);
    if (Number.isNaN(parsed.getTime())) return false;
    return parsed < now;
};

type TaskRow = Database['public']['Tables']['tasks']['Row'];
type TaskInsert = Database['public']['Tables']['tasks']['Insert'];
type TaskStatus = 'todo' | 'in_progress' | 'done';

const fetchTasks = async (userId: string): Promise<TaskRow[]> => {
    const { data, error } = await supabase
        .from('tasks')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
};

// Status configuration
const statusConfig: Record<TaskStatus, { title: string; icon: React.ReactNode; color: string; bgColor: string; textColor: string }> = {
    todo: {
        title: 'To Do',
        icon: <Circle className="w-4 h-4" />,
        color: 'text-slate-400',
        bgColor: 'bg-slate-500/20',
        textColor: 'text-slate-600 dark:text-slate-400'
    },
    in_progress: {
        title: 'In Progress',
        icon: <PlayCircle className="w-4 h-4" />,
        color: 'text-blue-400',
        bgColor: 'bg-blue-500/20',
        textColor: 'text-blue-600 dark:text-blue-400'
    },
    done: {
        title: 'Selesai',
        icon: <CheckCircle2 className="w-4 h-4" />,
        color: 'text-emerald-400',
        bgColor: 'bg-emerald-500/20',
        textColor: 'text-emerald-600 dark:text-emerald-400'
    },
};

const statusOrder: TaskStatus[] = ['todo', 'in_progress', 'done'];

const taskRules: ValidationRules = {
    title: [ValidationService.validators.required("Judul tugas harus diisi")]
};

// Task Card Component
interface TaskCardProps {
    task: TaskRow;
    onEdit: (task: TaskRow) => void;
    onDelete: (id: string) => void;
    onStatusChange: (id: string, newStatus: TaskStatus) => void;
    isUpdating?: boolean;
}

const TaskCard: React.FC<TaskCardProps> = ({ task, onEdit, onDelete, onStatusChange, isUpdating }) => {
    const [showMenu, setShowMenu] = useState(false);
    const overdue = isOverdue(task.due_date) && task.status !== 'done';
    const currentStatus = statusConfig[task.status];

    // Get next status
    const currentIndex = statusOrder.indexOf(task.status);
    const nextStatus = currentIndex < statusOrder.length - 1 ? statusOrder[currentIndex + 1] : null;
    const prevStatus = currentIndex > 0 ? statusOrder[currentIndex - 1] : null;

    return (
        <div
            className={`
                rounded-2xl p-4 border transition-all duration-300 group relative overflow-hidden
                bg-white dark:bg-slate-800/50 border-slate-200 dark:border-white/5 hover:border-indigo-500/30 hover:shadow-lg hover:shadow-indigo-500/10 shadow-sm
                ${overdue ? 'border-l-4 border-l-red-500' : 'border-l-4 border-l-transparent'}
                ${isUpdating ? 'opacity-60 pointer-events-none' : ''}
            `}
        >
            <div className="absolute inset-0 bg-gradient-to-br from-slate-50/50 dark:from-white/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"></div>

            {/* Header with Status Badge */}
            <div className="flex items-start gap-3">
                {/* Status Badge */}
                <div className={`p-2 rounded-xl ${currentStatus.bgColor} ${currentStatus.color}`}>
                    {currentStatus.icon}
                </div>

                {/* Content */}
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
                                onClick={(e) => { e.stopPropagation(); setShowMenu(!showMenu); }}
                                className="p-1.5 rounded-lg hover:bg-slate-200/50 dark:hover:bg-slate-700/50 text-slate-400 hover:text-slate-700 dark:hover:text-white transition-colors"
                                aria-label="Opsi tugas"
                                aria-expanded={showMenu}
                                aria-haspopup="menu"
                            >
                                <MoreVertical className="w-4 h-4" />
                            </button>

                            {showMenu && (
                                <>
                                    <div className="fixed inset-0 z-10" onClick={() => setShowMenu(false)} />
                                    <div className="absolute right-0 top-full mt-1 w-36 bg-white dark:bg-slate-800 rounded-xl shadow-2xl border border-slate-200 dark:border-slate-700 py-1 z-20">
                                        <button
                                            onClick={(e) => { e.stopPropagation(); onEdit(task); setShowMenu(false); }}
                                            className="w-full flex items-center gap-2 px-3 py-2 text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700/50"
                                        >
                                            <EditIcon className="w-4 h-4" />
                                            Edit
                                        </button>
                                        <button
                                            onClick={(e) => { e.stopPropagation(); onDelete(task.id); setShowMenu(false); }}
                                            className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-500 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10"
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
                            {task.description}
                        </p>
                    )}

                    {/* Footer with Date and Status Buttons */}
                    <div className="flex items-center justify-between gap-3 mt-4">
                        {/* Due Date */}
                        {task.due_date && (
                            <div className={`inline-flex items-center gap-1.5 text-xs font-medium px-2 py-1 rounded-lg ${overdue
                                ? 'bg-red-100 dark:bg-red-500/20 text-red-600 dark:text-red-400'
                                : 'bg-slate-100 dark:bg-slate-700/50 text-slate-600 dark:text-slate-400'
                                }`}>
                                {overdue ? <AlertTriangle className="w-3 h-3" /> : <CalendarIcon className="w-3 h-3" />}
                                {formatDateDisplay(task.due_date)}
                            </div>
                        )}

                        {/* Status Change Buttons */}
                        <div className="flex items-center gap-2 ml-auto">
                            {prevStatus && (
                                <button
                                    onClick={() => onStatusChange(task.id, prevStatus)}
                                    className="px-2.5 py-1.5 text-xs font-medium rounded-lg bg-slate-100 dark:bg-slate-700/50 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-600/50 hover:text-slate-800 dark:hover:text-white transition-all flex items-center gap-1"
                                    title={`Pindah ke ${statusConfig[prevStatus].title}`}
                                    disabled={isUpdating}
                                >
                                    <ArrowRight className="w-3 h-3 rotate-180" />
                                    {statusConfig[prevStatus].title}
                                </button>
                            )}
                            {nextStatus && (
                                <button
                                    onClick={() => onStatusChange(task.id, nextStatus)}
                                    className={`px-2.5 py-1.5 text-xs font-medium rounded-lg transition-all flex items-center gap-1 ${nextStatus === 'done'
                                        ? 'bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30'
                                        : 'bg-blue-500/20 text-blue-400 hover:bg-blue-500/30'
                                        }`}
                                    title={`Pindah ke ${statusConfig[nextStatus].title}`}
                                    disabled={isUpdating}
                                >
                                    {statusConfig[nextStatus].title}
                                    <ArrowRight className="w-3 h-3" />
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

// Column Component (non-draggable)
interface ColumnProps {
    status: TaskStatus;
    tasks: TaskRow[];
    onEdit: (task: TaskRow) => void;
    onDelete: (id: string) => void;
    onStatusChange: (id: string, newStatus: TaskStatus) => void;
    onAddTask: (status: TaskStatus) => void;
    updatingTaskId: string | null;
}

const Column: React.FC<ColumnProps> = ({
    status,
    tasks,
    onEdit,
    onDelete,
    onStatusChange,
    onAddTask,
    updatingTaskId
}) => {
    const config = statusConfig[status];

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
                        <span className="text-xs font-medium text-slate-500 dark:text-slate-400 bg-slate-200/50 dark:bg-slate-700/50 px-2 py-0.5 rounded-full">{tasks.length} tugas</span>
                    </div>
                </div>
                <button
                    onClick={() => onAddTask(status)}
                    className="p-2 rounded-lg hover:bg-slate-200/50 dark:hover:bg-slate-700/50 text-slate-400 hover:text-slate-700 dark:hover:text-white transition-colors"
                    title="Tambah tugas"
                    aria-label="Tambah tugas baru"
                >
                    <PlusIcon className="w-4 h-4" />
                </button>
            </div>

            {/* Task List */}
            <div className="rounded-3xl p-3 min-h-[300px] bg-white/50 dark:bg-slate-800/30 border border-slate-200/80 dark:border-slate-700/30 shadow-inner">
                <div className="space-y-3">
                    {tasks.length === 0 ? (
                        <div className="text-center py-8">
                            <div className={`w-12 h-12 mx-auto rounded-xl ${config.bgColor} flex items-center justify-center ${config.color} mb-3`}>
                                {config.icon}
                            </div>
                            <p className="text-sm text-slate-500">Tidak ada tugas</p>
                            <button
                                onClick={() => onAddTask(status)}
                                className="mt-3 text-sm text-indigo-400 hover:text-indigo-300"
                            >
                                + Tambah tugas
                            </button>
                        </div>
                    ) : (
                        tasks.map(task => (
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

const TasksPage: React.FC = () => {
    const { user } = useAuth();
    const toast = useToast();
    const queryClient = useQueryClient();
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingTask, setEditingTask] = useState<TaskRow | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [updatingTaskId, setUpdatingTaskId] = useState<string | null>(null);
    const [mobileActiveTab, setMobileActiveTab] = useState<TaskStatus>('todo');

    // Form state
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [dueDate, setDueDate] = useState('');
    const [status, setStatus] = useState<TaskStatus>('todo');
    const [errors, setErrors] = useState<Record<string, string>>({});

    const { data: tasks = [], isLoading, isError, error, refetch, isFetching } = useQuery({
        queryKey: ['tasks', user?.id],
        queryFn: () => fetchTasks(user!.id),
        enabled: !!user,
    });
    const taskLoadErrorMessage = error instanceof Error
        ? error.message
        : 'Gagal memuat tugas. Silakan coba lagi.';

    const createTaskMutation = useMutation({
        mutationFn: async (task: TaskInsert) => {
            const { error } = await supabase.from('tasks').insert(task);
            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['tasks'] });
            toast.success('Tugas berhasil ditambahkan');
            resetForm();
            setIsModalOpen(false);
        },
        onError: () => toast.error('Gagal menambahkan tugas'),
    });

    const updateTaskMutation = useMutation({
        mutationFn: async ({ id, updates }: { id: string; updates: Partial<TaskRow> }) => {
            const { error } = await supabase.from('tasks').update(updates).eq('id', id);
            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['tasks'] });
            toast.success('Tugas berhasil diperbarui');
            resetForm();
            setIsModalOpen(false);
            setEditingTask(null);
        },
        onError: () => toast.error('Gagal memperbarui tugas'),
    });

    const deleteTaskMutation = useMutation({
        mutationFn: async (id: string) => {
            const { error } = await supabase.from('tasks').delete().eq('id', id);
            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['tasks'] });
            toast.success('Tugas berhasil dihapus');
        },
        onError: () => toast.error('Gagal menghapus tugas'),
    });

    const updateStatusMutation = useMutation({
        mutationFn: async ({ id, newStatus }: { id: string; newStatus: TaskStatus }) => {
            setUpdatingTaskId(id);
            const { error } = await supabase.from('tasks').update({ status: newStatus }).eq('id', id);
            if (error) throw error;
        },
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({ queryKey: ['tasks'] });
            toast.success(`Status diubah ke ${statusConfig[variables.newStatus].title}`);
            setUpdatingTaskId(null);
        },
        onError: () => {
            toast.error('Gagal mengubah status');
            setUpdatingTaskId(null);
        },
    });

    const resetForm = () => {
        setTitle('');
        setDescription('');
        setDueDate('');
        setStatus('todo');
        setEditingTask(null);
        setErrors({});
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!user) return;

        const validationResult = ValidationService.validateForm({ title }, taskRules);
        if (!validationResult.isValid) {
            setErrors(validationResult.errors);
            return;
        }
        setErrors({});

        if (editingTask) {
            updateTaskMutation.mutate({
                id: editingTask.id,
                updates: { title, description: description || null, due_date: dueDate || null, status },
            });
        } else {
            createTaskMutation.mutate({
                user_id: user.id,
                title,
                description: description || null,
                due_date: dueDate || null,
                status,
            });
        }
    };

    const handleEdit = (task: TaskRow) => {
        setEditingTask(task);
        setTitle(task.title);
        setDescription(task.description || '');
        setDueDate(normalizeDueDateForInput(task.due_date));
        setStatus(task.status);
        setIsModalOpen(true);
    };

    const handleAddTask = (newStatus: TaskStatus) => {
        resetForm();
        setStatus(newStatus);
        setIsModalOpen(true);
    };

    const handleStatusChange = (id: string, newStatus: TaskStatus) => {
        updateStatusMutation.mutate({ id, newStatus });
    };

    // Filter tasks
    const filteredTasks = useMemo(() => {
        return tasks.filter(task => {
            const matchesSearch = task.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                (task.description?.toLowerCase().includes(searchQuery.toLowerCase()));
            return matchesSearch;
        });
    }, [tasks, searchQuery]);

    // Group tasks by status
    const tasksByStatus = useMemo(() => {
        const grouped: Record<TaskStatus, TaskRow[]> = {
            todo: [],
            in_progress: [],
            done: [],
        };
        filteredTasks.forEach(task => {
            grouped[task.status].push(task);
        });
        return grouped;
    }, [filteredTasks]);

    // Stats
    const stats = useMemo(() => {
        const total = tasks.length;
        const todo = tasks.filter(t => t.status === 'todo').length;
        const inProgress = tasks.filter(t => t.status === 'in_progress').length;
        const done = tasks.filter(t => t.status === 'done').length;
        const overdue = tasks.filter(t => isOverdue(t.due_date) && t.status !== 'done').length;
        return { total, todo, inProgress, done, overdue };
    }, [tasks]);

    if (isLoading) {
        return <TasksPageSkeleton />;
    }
    if (isError && tasks.length === 0) {
        return (
            <div className="w-full min-h-full p-3 sm:p-4 md:p-6 lg:p-8 flex flex-col space-y-4 sm:space-y-6 lg:space-y-8 bg-transparent max-w-7xl mx-auto pb-24 lg:pb-8 animate-fade-in-up">
                <EmptyError
                    message={taskLoadErrorMessage}
                    onRetry={() => refetch()}
                />
            </div>
        );
    }

    return (
        <div className="w-full min-h-full p-3 sm:p-4 md:p-6 lg:p-8 flex flex-col space-y-4 sm:space-y-6 lg:space-y-8 bg-transparent max-w-7xl mx-auto pb-24 lg:pb-8 animate-fade-in-up">
            {isError && (
                <div className="rounded-2xl border border-red-200/60 dark:border-red-500/30 bg-red-50/60 dark:bg-red-500/10 px-4 py-3 shadow-sm">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                        <div className="flex items-start gap-3">
                            <div className="p-2 rounded-xl bg-red-100 dark:bg-red-500/20 text-red-600 dark:text-red-400">
                                <AlertTriangle className="w-4 h-4" />
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
                            {isFetching && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                            Coba Lagi
                        </Button>
                    </div>
                </div>
            )}
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
                <div>
                    <h1 className="text-3xl font-bold text-slate-900 dark:text-white tracking-tight font-serif bg-clip-text text-transparent bg-gradient-to-r from-slate-900 to-slate-600 dark:from-white dark:to-slate-300 mb-2">
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
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="Cari tugas..."
                            className="w-full pl-10 pr-4 py-2.5 bg-white/50 dark:bg-slate-800/50 backdrop-blur-sm border border-slate-200 dark:border-slate-700/50 rounded-xl text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all shadow-sm"
                        />
                    </div>

                    {/* Add Task Button */}
                    <Button
                        onClick={() => handleAddTask('todo')}
                        className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl shadow-lg shadow-indigo-500/20"
                    >
                        <PlusIcon className="w-4 h-4 mr-2" />
                        <span className="hidden sm:inline">Tugas Baru</span>
                    </Button>
                </div>
            </div>

            {/* Stats Cards - Aligned with header */}
            <div className="grid grid-cols-4 gap-4">
                <div className="bg-white dark:bg-slate-800/50 rounded-2xl border border-slate-200 dark:border-slate-700/50 shadow-lg p-4 sm:p-6 text-center">
                    <div className="text-2xl sm:text-4xl font-bold text-slate-800 dark:text-white mb-1">{stats.total}</div>
                    <div className="text-xs sm:text-sm font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Total</div>
                </div>
                <div className="bg-white dark:bg-slate-800/50 rounded-2xl border border-slate-200 dark:border-slate-700/50 shadow-lg p-4 sm:p-6 text-center">
                    <div className="text-2xl sm:text-4xl font-bold text-slate-400 mb-1">{stats.todo}</div>
                    <div className="text-xs sm:text-sm font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">To Do</div>
                </div>
                <div className="bg-white dark:bg-slate-800/50 rounded-2xl border border-slate-200 dark:border-slate-700/50 shadow-lg p-4 sm:p-6 text-center">
                    <div className="text-2xl sm:text-4xl font-bold text-blue-500 mb-1">{stats.inProgress}</div>
                    <div className="text-xs sm:text-sm font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Progress</div>
                </div>
                <div className="bg-white dark:bg-slate-800/50 rounded-2xl border border-slate-200 dark:border-slate-700/50 shadow-lg p-4 sm:p-6 text-center">
                    <div className="text-2xl sm:text-4xl font-bold text-emerald-500 mb-1">{stats.done}</div>
                    <div className="text-xs sm:text-sm font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Selesai</div>
                </div>
            </div>

            {/* Mobile Tab Navigation - Only visible on small screens */}
            <div className="lg:hidden">
                <div className="flex rounded-xl bg-slate-200/50 dark:bg-slate-800/50 p-1 mb-4">
                    {statusOrder.map(statusKey => {
                        const config = statusConfig[statusKey];
                        const count = tasksByStatus[statusKey].length;
                        return (
                            <button
                                key={statusKey}
                                onClick={() => setMobileActiveTab(statusKey)}
                                className={`flex-1 flex flex-col items-center gap-0.5 py-2.5 px-2 rounded-lg text-sm font-medium transition-all ${mobileActiveTab === statusKey
                                    ? `${config.bgColor} ${config.color}`
                                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300'
                                    }`}
                            >
                                <span className="flex items-center gap-1.5">
                                    {config.icon}
                                    <span className="hidden sm:inline">{config.title}</span>
                                </span>
                                <span className={`text-xs ${mobileActiveTab === statusKey ? config.color : 'text-slate-400 dark:text-slate-500'}`}>
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
                                onClick={() => handleAddTask(mobileActiveTab)}
                                className="text-sm text-indigo-600 dark:text-indigo-400 hover:text-indigo-500 dark:hover:text-indigo-300 font-medium"
                            >
                                + Tambah tugas
                            </button>
                        </div>
                    ) : (
                        tasksByStatus[mobileActiveTab].map(task => (
                            <TaskCard
                                key={task.id}
                                task={task}
                                onEdit={handleEdit}
                                onDelete={(id) => deleteTaskMutation.mutate(id)}
                                onStatusChange={handleStatusChange}
                                isUpdating={updatingTaskId === task.id}
                            />
                        ))
                    )}
                </div>
            </div>


            {/* Desktop Kanban Board - Hidden on mobile */}
            <div className="hidden lg:grid lg:grid-cols-3 gap-4">
                {statusOrder.map((statusKey) => (
                    <Column
                        key={statusKey}
                        status={statusKey}
                        tasks={tasksByStatus[statusKey]}
                        onEdit={handleEdit}
                        onDelete={(id) => deleteTaskMutation.mutate(id)}
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
                        className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl"
                    >
                        <PlusIcon className="w-4 h-4 mr-2" />
                        Tambah Tugas Pertama
                    </Button>
                </div>
            )}

            {/* Add/Edit Modal */}
            <Modal
                isOpen={isModalOpen}
                onClose={() => { setIsModalOpen(false); resetForm(); }}
                title={editingTask ? 'Edit Tugas' : 'Tambah Tugas Baru'}
                icon={<CheckSquareIcon className="w-5 h-5" />}
            >
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                            Judul Tugas
                        </label>
                        <Input
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            placeholder="Masukkan judul tugas..."
                            error={errors.title}
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                            Deskripsi (opsional)
                        </label>
                        <textarea
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            placeholder="Tambahkan deskripsi..."
                            rows={3}
                            className="w-full px-4 py-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all resize-none"
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                                Tenggat Waktu
                            </label>
                            <Input
                                type="date"
                                value={dueDate}
                                onChange={(e) => setDueDate(e.target.value)}
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                                Status
                            </label>
                            <Select
                                value={status}
                                onChange={(e) => setStatus(e.target.value as TaskStatus)}
                            >
                                <option value="todo">To Do</option>
                                <option value="in_progress">In Progress</option>
                                <option value="done">Selesai</option>
                            </Select>
                        </div>
                    </div>

                    <div className="flex justify-end gap-3 pt-4">
                        <Button
                            type="button"
                            variant="ghost"
                            onClick={() => { setIsModalOpen(false); resetForm(); }}
                        >
                            Batal
                        </Button>
                        <Button
                            type="submit"
                            disabled={createTaskMutation.isPending || updateTaskMutation.isPending}
                            className="bg-indigo-600 hover:bg-indigo-700"
                        >
                            {(createTaskMutation.isPending || updateTaskMutation.isPending) && (
                                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            )}
                            {editingTask ? 'Simpan Perubahan' : 'Tambah Tugas'}
                        </Button>
                    </div>
                </form>
            </Modal>
        </div>
    );
};

export default TasksPage;
