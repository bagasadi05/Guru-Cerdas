import React, { useState, useMemo, useCallback } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Select } from '../ui/Select';
import { Modal } from '../ui/Modal';
import {
    PlusIcon,
    CheckCircleIcon,
    ClockIcon,
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
import {
    DndContext,
    DragEndEvent,
    DragOverlay,
    DragStartEvent,
    PointerSensor,
    TouchSensor,
    useSensor,
    useSensors,
    useDroppable,
    DragOverEvent,
    rectIntersection,
} from '@dnd-kit/core';
import {
    SortableContext,
    useSortable,
    verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical, MoreVertical, Loader2, PlayCircle, Circle, CheckCircle2, AlertTriangle } from 'lucide-react';
import { ValidationService } from '../../services/ValidationService';
import { ValidationRules } from '../../types';

// Native date helpers
const formatDateDisplay = (date: Date) => {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
    return `${date.getDate()} ${months[date.getMonth()]}`;
};

const isOverdue = (dueDate: string | null) => {
    if (!dueDate) return false;
    return new Date(dueDate) < new Date();
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

// Column configuration
const columns: { id: TaskStatus; title: string; icon: React.ReactNode; color: string; bgColor: string }[] = [
    {
        id: 'todo',
        title: 'To Do',
        icon: <Circle className="w-4 h-4" />,
        color: 'text-slate-400',
        bgColor: 'bg-slate-500/20'
    },
    {
        id: 'in_progress',
        title: 'In Progress',
        icon: <PlayCircle className="w-4 h-4" />,
        color: 'text-blue-400',
        bgColor: 'bg-blue-500/20'
    },
    {
        id: 'done',
        title: 'Selesai',
        icon: <CheckCircle2 className="w-4 h-4" />,
        color: 'text-emerald-400',
        bgColor: 'bg-emerald-500/20'
    },
];

const taskRules: ValidationRules = {
    title: [ValidationService.validators.required("Judul tugas harus diisi")]
};


// Task Card Component
interface TaskCardProps {
    task: TaskRow;
    onEdit: (task: TaskRow) => void;
    onDelete: (id: string) => void;
    isDragging?: boolean;
    isOverlay?: boolean;
}

const TaskCard: React.FC<TaskCardProps> = ({ task, onEdit, onDelete, isDragging, isOverlay }) => {
    const [showMenu, setShowMenu] = useState(false);
    const overdue = isOverdue(task.due_date) && task.status !== 'done';

    return (
        <div
            className={`
                rounded-2xl p-4 border transition-all duration-300 group relative overflow-hidden
                ${isDragging
                    ? 'shadow-2xl border-indigo-500/50 ring-2 ring-indigo-500/30 rotate-2 scale-105 z-50 bg-slate-800/90'
                    : 'glass-card border-white/20 dark:border-white/5 hover:border-indigo-500/30 hover:shadow-lg hover:shadow-indigo-500/10 hover:-translate-y-1'
                }
                ${isOverlay ? 'shadow-2xl rotate-3 cursor-grabbing' : ''}
                ${overdue ? 'border-l-4 border-l-red-500' : 'border-l-4 border-l-transparent hover:border-l-indigo-500'}
            `}
        >
            <div className="absolute inset-0 bg-gradient-to-br from-white/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"></div>
            <div className="flex items-start gap-3">
                {/* Drag Handle */}
                <div className="pt-0.5 cursor-grab active:cursor-grabbing">
                    <GripVertical className="w-4 h-4 text-slate-500 group-hover:text-slate-400" />
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                        <h4 className={`font-medium text-white leading-snug ${task.status === 'done' ? 'line-through text-slate-400' : ''}`}>
                            {task.title}
                        </h4>

                        {/* Menu */}
                        {!isOverlay && (
                            <div className="relative">
                                <button
                                    onClick={(e) => { e.stopPropagation(); setShowMenu(!showMenu); }}
                                    className="p-1 rounded-lg hover:bg-slate-700/50 text-slate-400 hover:text-white transition-colors opacity-0 group-hover:opacity-100"
                                >
                                    <MoreVertical className="w-4 h-4" />
                                </button>

                                {showMenu && (
                                    <>
                                        <div className="fixed inset-0 z-10" onClick={() => setShowMenu(false)} />
                                        <div className="absolute right-0 top-full mt-1 w-36 bg-slate-800 rounded-xl shadow-2xl border border-slate-700 py-1 z-20">
                                            <button
                                                onClick={(e) => { e.stopPropagation(); onEdit(task); setShowMenu(false); }}
                                                className="w-full flex items-center gap-2 px-3 py-2 text-sm text-slate-300 hover:bg-slate-700/50"
                                            >
                                                <EditIcon className="w-4 h-4" />
                                                Edit
                                            </button>
                                            <button
                                                onClick={(e) => { e.stopPropagation(); onDelete(task.id); setShowMenu(false); }}
                                                className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-400 hover:bg-red-500/10"
                                            >
                                                <TrashIcon className="w-4 h-4" />
                                                Hapus
                                            </button>
                                        </div>
                                    </>
                                )}
                            </div>
                        )}
                    </div>

                    {task.description && (
                        <p className="text-sm text-slate-400 mt-1 line-clamp-2">
                            {task.description}
                        </p>
                    )}

                    {/* Footer */}
                    {task.due_date && (
                        <div className="flex items-center gap-3 mt-3">
                            <div className={`inline-flex items-center gap-1.5 text-xs font-medium px-2 py-1 rounded-lg ${overdue
                                ? 'bg-red-500/20 text-red-400'
                                : 'bg-slate-700/50 text-slate-400'
                                }`}>
                                {overdue ? <AlertTriangle className="w-3 h-3" /> : <CalendarIcon className="w-3 h-3" />}
                                {formatDateDisplay(new Date(task.due_date))}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

// Draggable Task Card Wrapper
interface DraggableTaskCardProps {
    task: TaskRow;
    onEdit: (task: TaskRow) => void;
    onDelete: (id: string) => void;
}

const DraggableTaskCard: React.FC<DraggableTaskCardProps> = ({ task, onEdit, onDelete }) => {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging,
    } = useSortable({ id: task.id });

    const style: React.CSSProperties = {
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.3 : 1,
    };

    return (
        <div
            ref={setNodeRef}
            style={style}
            {...attributes}
            {...listeners}
            className="touch-none"
        >
            <TaskCard
                task={task}
                onEdit={onEdit}
                onDelete={onDelete}
                isDragging={isDragging}
            />
        </div>
    );
};

// Droppable Column Component
interface DroppableColumnProps {
    column: typeof columns[0];
    tasks: TaskRow[];
    onEdit: (task: TaskRow) => void;
    onDelete: (id: string) => void;
    onAddTask: (status: TaskStatus) => void;
    isOver: boolean;
}

const DroppableColumn: React.FC<DroppableColumnProps> = ({
    column,
    tasks,
    onEdit,
    onDelete,
    onAddTask,
    isOver
}) => {
    const { setNodeRef } = useDroppable({
        id: column.id,
    });

    return (
        <div className="flex-1 min-w-[300px] max-w-[400px]">
            {/* Column Header */}
            <div className="flex items-center justify-between mb-4 px-2">
                <div className="flex items-center gap-2">
                    <div className={`w-8 h-8 rounded-xl ${column.bgColor} flex items-center justify-center ${column.color} shadow-sm`}>
                        {column.icon}
                    </div>
                    <div>
                        <h3 className="font-bold text-slate-800 dark:text-white dark:text-shadow-sm">{column.title}</h3>
                        <span className="text-xs font-medium text-slate-500 dark:text-slate-400 bg-slate-200/50 dark:bg-slate-700/50 px-2 py-0.5 rounded-full">{tasks.length} tugas</span>
                    </div>
                </div>
                <button
                    onClick={() => onAddTask(column.id)}
                    className="p-2 rounded-lg hover:bg-slate-700/50 text-slate-400 hover:text-white transition-colors"
                    title="Tambah tugas"
                >
                    <PlusIcon className="w-4 h-4" />
                </button>
            </div>

            {/* Droppable Task List */}
            <div
                ref={setNodeRef}
                className={`
                    rounded-3xl p-3 min-h-[300px] border-2 border-dashed transition-all duration-300
                    ${isOver
                        ? 'bg-indigo-500/10 border-indigo-500/50 scale-[1.02]'
                        : 'bg-slate-50/50 dark:bg-slate-800/30 border-slate-200/50 dark:border-slate-700/30'
                    }
                `}
            >
                <SortableContext items={tasks.map(t => t.id)} strategy={verticalListSortingStrategy}>
                    <div className="space-y-3">
                        {tasks.length === 0 ? (
                            <div className={`text-center py-8 transition-all ${isOver ? 'scale-105' : ''}`}>
                                <div className={`w-12 h-12 mx-auto rounded-xl ${column.bgColor} flex items-center justify-center ${column.color} mb-3`}>
                                    {column.icon}
                                </div>
                                <p className="text-sm text-slate-500">
                                    {isOver ? 'Lepaskan di sini!' : 'Tidak ada tugas'}
                                </p>
                                {!isOver && (
                                    <button
                                        onClick={() => onAddTask(column.id)}
                                        className="mt-3 text-sm text-indigo-400 hover:text-indigo-300"
                                    >
                                        + Tambah tugas
                                    </button>
                                )}
                            </div>
                        ) : (
                            tasks.map(task => (
                                <DraggableTaskCard
                                    key={task.id}
                                    task={task}
                                    onEdit={onEdit}
                                    onDelete={onDelete}
                                />
                            ))
                        )}
                    </div>
                </SortableContext>
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

    // Form state
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [dueDate, setDueDate] = useState('');
    const [status, setStatus] = useState<TaskStatus>('todo');
    const [errors, setErrors] = useState<Record<string, string>>({});


    // Drag state
    const [activeId, setActiveId] = useState<string | null>(null);
    const [overId, setOverId] = useState<string | null>(null);

    const sensors = useSensors(
        useSensor(PointerSensor, {
            activationConstraint: { distance: 5 },
        }),
        useSensor(TouchSensor, {
            activationConstraint: { delay: 150, tolerance: 5 },
        })
    );

    const { data: tasks = [], isLoading } = useQuery({
        queryKey: ['tasks', user?.id],
        queryFn: () => fetchTasks(user!.id),
        enabled: !!user,
    });

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
            // Use soft delete by setting deleted_at instead of permanent delete
            const { error } = await supabase.from('tasks').update({ deleted_at: new Date().toISOString() }).eq('id', id);
            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['tasks'] });
            toast.success('Tugas berhasil dihapus. Lihat Sampah untuk memulihkan.');
        },
        onError: () => toast.error('Gagal menghapus tugas'),
    });

    const updateStatusMutation = useMutation({
        mutationFn: async ({ id, newStatus }: { id: string; newStatus: TaskStatus }) => {
            const { error } = await supabase.from('tasks').update({ status: newStatus }).eq('id', id);
            if (error) throw error;
        },
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({ queryKey: ['tasks'] });
            const statusLabels: Record<TaskStatus, string> = {
                'todo': 'To Do',
                'in_progress': 'In Progress',
                'done': 'Selesai'
            };
            toast.success(`Status diubah ke ${statusLabels[variables.newStatus]}`);
        },
        onError: () => toast.error('Gagal mengubah status'),
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
        setDueDate(task.due_date || '');
        setStatus(task.status);
        setIsModalOpen(true);
    };

    const handleAddTask = (newStatus: TaskStatus) => {
        resetForm();
        setStatus(newStatus);
        setIsModalOpen(true);
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

    // Drag handlers
    const handleDragStart = (event: DragStartEvent) => {
        setActiveId(event.active.id as string);
    };

    const handleDragOver = (event: DragOverEvent) => {
        const { over } = event;
        if (over) {
            // Check if we're over a column
            const isColumn = columns.some(col => col.id === over.id);
            if (isColumn) {
                setOverId(over.id as string);
            } else {
                // We're over a task, find its column
                const task = tasks.find(t => t.id === over.id);
                if (task) {
                    setOverId(task.status);
                }
            }
        } else {
            setOverId(null);
        }
    };

    const handleDragEnd = (event: DragEndEvent) => {
        const { active, over } = event;

        setActiveId(null);
        setOverId(null);

        if (!over) return;

        const activeTask = tasks.find(t => t.id === active.id);
        if (!activeTask) return;

        // Check if dropped on a column directly
        const targetColumn = columns.find(col => col.id === over.id);
        if (targetColumn) {
            if (activeTask.status !== targetColumn.id) {
                updateStatusMutation.mutate({
                    id: activeTask.id,
                    newStatus: targetColumn.id
                });
            }
            return;
        }

        // Check if dropped on another task
        const overTask = tasks.find(t => t.id === over.id);
        if (overTask && activeTask.status !== overTask.status) {
            updateStatusMutation.mutate({
                id: activeTask.id,
                newStatus: overTask.status
            });
        }
    };

    const activeTask = activeId ? tasks.find(t => t.id === activeId) : null;

    if (isLoading) {
        return <TasksPageSkeleton />;
    }

    return (
        <div className="w-full min-h-full p-4 sm:p-6 lg:p-8 flex flex-col space-y-8 bg-transparent max-w-7xl mx-auto pb-32 lg:pb-12 animate-fade-in-up">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
                <div>
                    <h1 className="text-3xl font-bold text-slate-900 dark:text-white tracking-tight font-serif bg-clip-text text-transparent bg-gradient-to-r from-slate-900 to-slate-600 dark:from-white dark:to-slate-300 mb-2">
                        Manajemen Tugas
                    </h1>
                    <p className="text-slate-500 dark:text-slate-400 text-sm font-medium flex items-center gap-2">
                        <CheckSquareIcon className="w-4 h-4" />
                        Seret tugas ke kolom lain untuk mengubah status
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

            {/* Stats Cards */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                <div className="glass-card rounded-2xl p-5 hover:-translate-y-1 transition-all duration-300 relative overflow-hidden group border-white/20 dark:border-white/5">
                    <div className="absolute inset-0 bg-gradient-to-br from-white/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                    <div className="relative z-10">
                        <div className="text-3xl font-bold text-slate-800 dark:text-white mb-1">{stats.total}</div>
                        <div className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Total</div>
                    </div>
                </div>
                <div className="glass-card rounded-2xl p-5 hover:-translate-y-1 transition-all duration-300 relative overflow-hidden group border-white/20 dark:border-white/5">
                    <div className="absolute inset-0 bg-gradient-to-br from-white/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                    <div className="relative z-10">
                        <div className="text-3xl font-bold text-slate-400 mb-1">{stats.todo}</div>
                        <div className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">To Do</div>
                    </div>
                </div>
                <div className="glass-card rounded-2xl p-5 hover:-translate-y-1 transition-all duration-300 relative overflow-hidden group border-white/20 dark:border-white/5">
                    <div className="absolute inset-0 bg-gradient-to-br from-blue-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                    <div className="relative z-10">
                        <div className="text-3xl font-bold text-blue-500 mb-1">{stats.inProgress}</div>
                        <div className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Progress</div>
                    </div>
                </div>
                <div className="glass-card rounded-2xl p-5 hover:-translate-y-1 transition-all duration-300 relative overflow-hidden group border-white/20 dark:border-white/5">
                    <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                    <div className="relative z-10">
                        <div className="text-3xl font-bold text-emerald-500 mb-1">{stats.done}</div>
                        <div className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Selesai</div>
                    </div>
                </div>
                {stats.overdue > 0 && (
                    <div className="glass-card rounded-2xl p-5 hover:-translate-y-1 transition-all duration-300 relative overflow-hidden group border-red-500/30 bg-red-500/5">
                        <div className="absolute inset-0 bg-gradient-to-br from-red-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                        <div className="relative z-10">
                            <div className="text-3xl font-bold text-red-500 mb-1">{stats.overdue}</div>
                            <div className="text-xs font-bold text-red-400 uppercase tracking-wider flex items-center gap-1">
                                <AlertTriangle className="w-3 h-3" />
                                Terlambat
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Kanban Board */}
            <DndContext
                sensors={sensors}
                collisionDetection={rectIntersection}
                onDragStart={handleDragStart}
                onDragOver={handleDragOver}
                onDragEnd={handleDragEnd}
            >
                <div className="flex gap-6 overflow-x-auto pb-4 -mx-4 px-4">
                    {columns.map(column => (
                        <DroppableColumn
                            key={column.id}
                            column={column}
                            tasks={tasksByStatus[column.id]}
                            onEdit={handleEdit}
                            onDelete={(id) => deleteTaskMutation.mutate(id)}
                            onAddTask={handleAddTask}
                            isOver={overId === column.id}
                        />
                    ))}
                </div>

                {/* Drag Overlay */}
                <DragOverlay dropAnimation={{
                    duration: 200,
                    easing: 'cubic-bezier(0.18, 0.67, 0.6, 1.22)',
                }}>
                    {activeTask && (
                        <div className="w-[350px]">
                            <TaskCard
                                task={activeTask}
                                onEdit={() => { }}
                                onDelete={() => { }}
                                isOverlay
                            />
                        </div>
                    )}
                </DragOverlay>
            </DndContext>

            {/* Empty State */}
            {tasks.length === 0 && (
                <div className="text-center py-16 bg-slate-800/30 rounded-2xl border border-slate-700/50">
                    <div className="w-20 h-20 mx-auto rounded-2xl bg-slate-800 flex items-center justify-center mb-4">
                        <CheckSquareIcon className="w-10 h-10 text-slate-600" />
                    </div>
                    <h3 className="text-xl font-semibold text-white mb-2">Belum ada tugas</h3>
                    <p className="text-slate-400 mb-6">Mulai dengan menambahkan tugas pertama Anda</p>
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
