import { useState, useMemo } from 'react';
import { useAuth } from '../../../../hooks/useAuth';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useToast } from '../../../../hooks/useToast';
import { useSoftDelete } from '../../../../hooks/useSoftDelete';
import { supabase } from '../../../../services/supabase';
import { ValidationService } from '../../../../services/ValidationService';
import { TaskRow, TaskInsert, TaskStatus, TaskStats } from '../types';
import {
    fetchTasks,
    isOverdue,
    parseDateOnly,
    normalizeDueDateForInput,
    taskRules,
    statusConfig,
} from '../utils';

export const useTasksPageState = () => {
    const { user } = useAuth();
    const toast = useToast();
    const queryClient = useQueryClient();

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingTask, setEditingTask] = useState<TaskRow | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [updatingTaskId, setUpdatingTaskId] = useState<string | null>(null);
    const [mobileActiveTab, setMobileActiveTab] = useState<TaskStatus>('todo');
    const [taskToDeleteId, setTaskToDeleteId] = useState<string | null>(null);
    const [isConfirmingClearAll, setIsConfirmingClearAll] = useState(false);

    // Form state
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [dueDate, setDueDate] = useState('');
    const [status, setStatus] = useState<TaskStatus>('todo');
    const [errors, setErrors] = useState<Record<string, string>>({});

    const isPastDate = useMemo(() => {
        if (!dueDate) return false;
        const chosenDate = parseDateOnly(dueDate);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        return chosenDate < today;
    }, [dueDate]);

    const {
        data: tasks = [],
        isLoading,
        isError,
        error,
        refetch,
        isFetching,
    } = useQuery({
        queryKey: ['tasks', user?.id],
        queryFn: () => fetchTasks(user!.id),
        enabled: !!user,
    });

    const taskLoadErrorMessage = error instanceof Error
        ? error.message
        : 'Gagal memuat tugas. Silakan coba lagi.';

    const resetForm = () => {
        setTitle('');
        setDescription('');
        setDueDate('');
        setStatus('todo');
        setEditingTask(null);
        setErrors({});
    };

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

    const { deleteItem: softDeleteTask, deleteItems: softDeleteBulkTasks } = useSoftDelete({
        entity: 'tasks',
        queryKey: ['tasks'],
        entityLabel: 'tugas',
    });

    const deleteTaskMutation = useMutation({
        mutationFn: async (id: string) => {
            await softDeleteTask(id);
        },
    });

    const clearCompletedTasksMutation = useMutation({
        mutationFn: async () => {
            if (!user) return;
            const completedTaskIds = tasks.filter((t) => t.status === 'done').map((t) => t.id);
            if (completedTaskIds.length === 0) return;
            await softDeleteBulkTasks(completedTaskIds);
        },
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
            const status = (task.status as TaskStatus) || 'todo';
            if (grouped[status]) {
                grouped[status].push(task);
            }
        });
        return grouped;
    }, [filteredTasks]);

    // Stats
    const stats: TaskStats = useMemo(() => {
        const total = tasks.length;
        const todo = tasks.filter(t => t.status === 'todo').length;
        const inProgress = tasks.filter(t => t.status === 'in_progress').length;
        const done = tasks.filter(t => t.status === 'done').length;
        const overdue = tasks.filter(t => isOverdue(t.due_date) && t.status !== 'done').length;
        return { total, todo, inProgress, done, overdue };
    }, [tasks]);

    return {
        user,
        tasks,
        isLoading,
        isError,
        isFetching,
        refetch,
        taskLoadErrorMessage,
        searchQuery,
        setSearchQuery,
        filteredTasks,
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
        updateStatusMutation,
    };
};
