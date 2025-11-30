import React, { useState, useMemo, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../../services/supabase';
import { useAuth } from '../../hooks/useAuth';
import { useToast } from '../../hooks/useToast';
import { Database } from '../../services/database.types';
import { Button } from '../ui/Button';
import { Modal } from '../ui/Modal';
import { Input } from '../ui/Input';
import { Checkbox } from '../ui/Checkbox';
import FloatingActionButton from '../ui/FloatingActionButton';
import { DropdownMenu, DropdownTrigger, DropdownContent, DropdownItem } from '../ui/DropdownMenu';
import { PlusIcon, PencilIcon, TrashIcon, CalendarIcon, MoreVerticalIcon, AlertCircleIcon, ClockIcon, CheckCircleIcon, SearchIcon, CheckSquareIcon } from '../Icons';
import { useOfflineStatus } from '../../hooks/useOfflineStatus';
import { useTaskNotifications } from '../../hooks/useTaskNotifications';

type Task = Database['public']['Tables']['tasks']['Row'];
type TaskStatus = Task['status'];
type TaskMutationVars =
    | { mode: 'add', data: Database['public']['Tables']['tasks']['Insert'] }
    | { mode: 'edit', data: Database['public']['Tables']['tasks']['Update'], id: string }
    | { mode: 'status_change', data: { status: TaskStatus }, id: string };

const TaskCard: React.FC<{
    task: Task;
    onEdit: (task: Task) => void;
    onDelete: (id: string) => void;
    onStatusChange: (id: string, newStatus: TaskStatus) => void;
    isOnline: boolean;
}> = ({ task, onEdit, onDelete, onStatusChange, isOnline }) => {
    const isDone = task.status === 'done';

    // Determine status color and urgency
    const getTaskStatusInfo = () => {
        if (isDone) return { border: 'border-emerald-500', bg: 'bg-emerald-500/5', text: 'text-emerald-600 dark:text-emerald-400', badge: 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400' };

        if (!task.due_date) return { border: 'border-slate-300 dark:border-slate-600', bg: 'bg-white dark:bg-slate-800/50', text: 'text-slate-600 dark:text-slate-400', badge: 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400' };

        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const dueDate = new Date(task.due_date);
        dueDate.setHours(0, 0, 0, 0);

        if (dueDate < today) return { border: 'border-rose-500', bg: 'bg-rose-50 dark:bg-rose-900/10', text: 'text-rose-600 dark:text-rose-400', badge: 'bg-rose-100 dark:bg-rose-900/30 text-rose-700 dark:text-rose-400' };
        if (dueDate.getTime() === today.getTime()) return { border: 'border-amber-500', bg: 'bg-amber-50 dark:bg-amber-900/10', text: 'text-amber-600 dark:text-amber-400', badge: 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400' };

        return { border: 'border-indigo-500', bg: 'bg-white dark:bg-slate-800/50', text: 'text-indigo-600 dark:text-indigo-400', badge: 'bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-400' };
    };

    const statusInfo = getTaskStatusInfo();

    return (
        <div className={`
            group relative overflow-hidden
            glass-card rounded-2xl p-5
            transition-all duration-300 hover:shadow-lg hover:-translate-y-1
            ${isDone ? 'opacity-75 grayscale-[0.5]' : ''}
        `}>
            {/* Status Indicator Line */}
            <div className={`absolute left-0 top-0 bottom-0 w-1.5 ${statusInfo.border}`}></div>

            <div className="flex items-start gap-4 pl-2">
                <div className="pt-1">
                    <Checkbox
                        checked={isDone}
                        onChange={() => onStatusChange(task.id, isDone ? 'todo' : 'done')}
                        disabled={!isOnline}
                        className={`w-6 h-6 rounded-full border-2 transition-all duration-300 ${isDone ? 'bg-emerald-500 border-emerald-500' : 'border-slate-300 dark:border-slate-600 hover:border-indigo-500'}`}
                    />
                </div>

                <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-start mb-2">
                        <h3 className={`font-bold text-lg break-words transition-all duration-300 ${isDone ? 'line-through text-slate-500' : 'text-slate-800 dark:text-white'}`}>
                            {task.title}
                        </h3>

                        <DropdownMenu>
                            <DropdownTrigger className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-400 dark:text-slate-500 transition-colors -mr-2 -mt-1">
                                <MoreVerticalIcon className="w-5 h-5" />
                            </DropdownTrigger>
                            <DropdownContent>
                                <DropdownItem icon={<PencilIcon className="w-4 h-4" />} onClick={() => onEdit(task)}>Edit</DropdownItem>
                                <DropdownItem icon={<TrashIcon className="w-4 h-4 text-rose-500" />} onClick={() => onDelete(task.id)} className="text-rose-600 dark:text-rose-400">Hapus</DropdownItem>
                            </DropdownContent>
                        </DropdownMenu>
                    </div>

                    {task.description && (
                        <p className={`text-sm mb-4 line-clamp-2 ${isDone ? 'text-slate-400' : 'text-slate-600 dark:text-slate-300'}`}>
                            {task.description}
                        </p>
                    )}

                    <div className="flex flex-wrap items-center gap-3">
                        {task.due_date ? (
                            <span className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold tracking-wide ${statusInfo.badge}`}>
                                <CalendarIcon className="w-3.5 h-3.5" />
                                {new Date(task.due_date).toLocaleDateString('id-ID', { day: 'numeric', month: 'long' })}
                            </span>
                        ) : (
                            <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium bg-slate-100 dark:bg-slate-800 text-slate-500">
                                <ClockIcon className="w-3.5 h-3.5" />
                                Tanpa Tenggat
                            </span>
                        )}

                        {isDone && (
                            <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400">
                                <CheckCircleIcon className="w-3.5 h-3.5" />
                                Selesai
                            </span>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

const TasksPage: React.FC = () => {
    const { user } = useAuth();
    const queryClient = useQueryClient();
    const toast = useToast();
    const isOnline = useOfflineStatus();
    const location = useLocation();
    const navigate = useNavigate();

    const [modalState, setModalState] = useState<{ isOpen: boolean; mode: 'add' | 'edit'; data: Task | null }>({ isOpen: false, mode: 'add', data: null });
    const [confirmDeleteModal, setConfirmDeleteModal] = useState<Task | null>(null);
    const [filter, setFilter] = useState<'all' | 'todo' | 'done'>('all');
    const [searchQuery, setSearchQuery] = useState('');

    const { data: tasks = [], isLoading } = useQuery({
        queryKey: ['tasks', user?.id],
        queryFn: async (): Promise<Task[]> => {
            const { data, error } = await supabase.from('tasks').select('*').eq('user_id', user!.id).order('created_at', { ascending: false });
            if (error) throw error;
            return data || [];
        },
        enabled: !!user,
    });

    useTaskNotifications(tasks);

    useEffect(() => {
        const prefillData = location.state?.prefill;
        if (prefillData) {
            const prefilledTask: Task = {
                id: '',
                user_id: user?.id || '',
                created_at: new Date().toISOString(),
                title: prefillData.title || '',
                description: prefillData.description || '',
                due_date: prefillData.due_date || null,
                status: prefillData.status || 'todo',
            };
            setModalState({ isOpen: true, mode: 'add', data: prefilledTask });
            navigate(location.pathname, { replace: true, state: {} });
        }
    }, [location.state?.prefill, user, navigate]);

    const taskMutation = useMutation({
        mutationFn: async (taskData: TaskMutationVars) => {
            if (taskData.mode === 'add') {
                const { error } = await supabase.from('tasks').insert(taskData.data);
                if (error) throw error;
            } else {
                const { error } = await supabase.from('tasks').update(taskData.data).eq('id', taskData.id);
                if (error) throw error;
            }
        },
        onSuccess: (_data, variables) => {
            queryClient.invalidateQueries({ queryKey: ['tasks', user?.id] });
            if (variables.mode !== 'status_change') {
                toast.success("Tugas berhasil disimpan!");
                setModalState({ isOpen: false, mode: 'add', data: null });
            }
        },
        onError: (error: Error) => toast.error(error.message),
    });

    const deleteMutation = useMutation({
        mutationFn: async (id: string) => {
            const { error } = await supabase.from('tasks').delete().eq('id', id);
            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['tasks', user?.id] });
            toast.success("Tugas berhasil dihapus.");
        },
        onError: (error: Error) => toast.error(error.message),
    });

    const stats = useMemo(() => {
        const total = tasks.length;
        const completed = tasks.filter(t => t.status === 'done').length;
        const pending = total - completed;
        return { total, completed, pending };
    }, [tasks]);

    const filteredTasks = useMemo(() => {
        return tasks
            .filter(task => {
                if (filter === 'todo') return task.status !== 'done';
                if (filter === 'done') return task.status === 'done';
                return true;
            })
            .filter(task =>
                task.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                (task.description && task.description.toLowerCase().includes(searchQuery.toLowerCase()))
            );
    }, [tasks, filter, searchQuery]);

    const handleFormSubmit = (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        const formData = new FormData(e.currentTarget);
        const taskData = {
            title: formData.get('title') as string,
            description: formData.get('description') as string,
            due_date: formData.get('due_date') ? (formData.get('due_date') as string) : null,
        };

        if (modalState.mode === 'add') {
            taskMutation.mutate({ mode: 'add', data: { ...taskData, user_id: user!.id, status: 'todo' } });
        } else if (modalState.data) {
            taskMutation.mutate({ mode: 'edit', data: taskData, id: modalState.data.id });
        }
    };

    const handleStatusChange = (id: string, newStatus: TaskStatus) => {
        taskMutation.mutate({ mode: 'status_change', data: { status: newStatus }, id });
    };

    const handleDeleteClick = (id: string) => {
        const taskToDelete = tasks.find(t => t.id === id);
        if (taskToDelete) {
            setConfirmDeleteModal(taskToDelete);
        }
    };

    const handleConfirmDelete = () => {
        if (confirmDeleteModal) {
            deleteMutation.mutate(confirmDeleteModal.id);
            setConfirmDeleteModal(null);
        }
    };

    if (isLoading) {
        return <div className="flex items-center justify-center h-full"><div className="w-12 h-12 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div></div>;
    }

    return (
        <div className="w-full min-h-full p-3 sm:p-4 md:p-6 lg:p-8 flex flex-col animate-fade-in-up">
            <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white font-serif">Manajemen Tugas</h1>
                    <p className="mt-1 text-sm font-medium text-slate-500 dark:text-slate-400 tracking-wide">Kelola prioritas dan tenggat waktu Anda dengan efisien.</p>
                </div>
                <div className="relative w-full md:w-64">
                    <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <Input
                        placeholder="Cari tugas..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-9 h-10 bg-white/50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700 focus:ring-indigo-500 rounded-xl"
                    />
                </div>
            </header>

            {/* Stats Grid */}
            <div className="grid grid-cols-3 gap-3 sm:gap-4 mb-8">
                <div className="glass-card p-4 rounded-2xl flex flex-col items-center justify-center text-center relative overflow-hidden group">
                    <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/10 to-purple-500/10 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                    <span className="text-3xl font-bold text-slate-800 dark:text-white mb-1">{stats.total}</span>
                    <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Total Tugas</span>
                </div>
                <div className="glass-card p-4 rounded-2xl flex flex-col items-center justify-center text-center relative overflow-hidden group">
                    <div className="absolute inset-0 bg-gradient-to-br from-amber-500/10 to-orange-500/10 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                    <span className="text-3xl font-bold text-amber-600 dark:text-amber-400 mb-1">{stats.pending}</span>
                    <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Pending</span>
                </div>
                <div className="glass-card p-4 rounded-2xl flex flex-col items-center justify-center text-center relative overflow-hidden group">
                    <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/10 to-green-500/10 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                    <span className="text-3xl font-bold text-emerald-600 dark:text-emerald-400 mb-1">{stats.completed}</span>
                    <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Selesai</span>
                </div>
            </div>

            {/* Filter Tabs */}
            <div className="flex items-center gap-2 mb-6 overflow-x-auto pb-2 scrollbar-hide">
                {[
                    { id: 'all', label: 'Semua Tugas', icon: CheckSquareIcon },
                    { id: 'todo', label: 'Belum Selesai', icon: ClockIcon },
                    { id: 'done', label: 'Selesai', icon: CheckCircleIcon },
                ].map((tab) => (
                    <button
                        key={tab.id}
                        onClick={() => setFilter(tab.id as any)}
                        className={`
                            flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold transition-all whitespace-nowrap
                            ${filter === tab.id
                                ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/30'
                                : 'bg-white dark:bg-slate-800 text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-700'
                            }
                        `}
                    >
                        <tab.icon className="w-4 h-4" />
                        {tab.label}
                    </button>
                ))}
            </div>

            {/* Task List */}
            <div className="space-y-4 pb-24">
                {filteredTasks.length > 0 ? (
                    filteredTasks.map(task => (
                        <TaskCard
                            key={task.id}
                            task={task}
                            onEdit={(t) => setModalState({ isOpen: true, mode: 'edit', data: t })}
                            onDelete={handleDeleteClick}
                            onStatusChange={handleStatusChange}
                            isOnline={isOnline}
                        />
                    ))
                ) : (
                    <div className="flex flex-col items-center justify-center py-20 text-center glass-card rounded-3xl border-dashed border-2 border-slate-200 dark:border-slate-700 bg-transparent">
                        <div className="w-20 h-20 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mb-4">
                            <CheckCircleIcon className="w-10 h-10 text-slate-300 dark:text-slate-600" />
                        </div>
                        <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-1">Tidak ada tugas ditemukan</h3>
                        <p className="text-slate-500 dark:text-slate-400 max-w-xs mx-auto text-sm">
                            {filter === 'all' ? 'Mulai dengan menambahkan tugas baru.' : 'Coba ubah filter atau kata kunci pencarian Anda.'}
                        </p>
                    </div>
                )}
            </div>

            <FloatingActionButton
                position="bottom-right"
                offset={{ bottom: 32, right: 32 }}
                size={64}
                onClick={() => setModalState({ isOpen: true, mode: 'add', data: null })}
                className="z-40 shadow-2xl shadow-indigo-500/40 bg-gradient-to-r from-indigo-600 to-violet-600 hover:scale-110 transition-transform duration-300"
            >
                <PlusIcon className="w-8 h-8 text-white" />
            </FloatingActionButton>

            <Modal title={modalState.mode === 'add' ? 'Tambah Tugas Baru' : 'Edit Tugas'} isOpen={modalState.isOpen} onClose={() => setModalState(prev => ({ ...prev, isOpen: false }))}>
                <form onSubmit={handleFormSubmit} className="space-y-5">
                    <div>
                        <label htmlFor="title" className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1.5">Judul Tugas</label>
                        <Input id="title" name="title" defaultValue={modalState.data?.title || ''} required className="h-12 rounded-xl" placeholder="Contoh: Periksa ujian kelas 7A" />
                    </div>
                    <div>
                        <label htmlFor="description" className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1.5">Deskripsi (Opsional)</label>
                        <textarea
                            id="description"
                            name="description"
                            defaultValue={modalState.data?.description || ''}
                            rows={3}
                            className="block w-full rounded-xl border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 focus:ring-2 focus:ring-indigo-500 focus:border-transparent p-3 text-sm dark:text-white transition-all"
                            placeholder="Tambahkan detail tugas..."
                        />
                    </div>
                    <div>
                        <label htmlFor="due_date" className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1.5">Tenggat Waktu (Opsional)</label>
                        <Input id="due_date" name="due_date" type="date" defaultValue={modalState.data?.due_date || ''} className="h-12 rounded-xl" />
                    </div>
                    <div className="flex justify-end gap-3 pt-4">
                        <Button type="button" variant="ghost" onClick={() => setModalState(prev => ({ ...prev, isOpen: false }))}>Batal</Button>
                        <Button type="submit" disabled={taskMutation.isPending || !isOnline} className="bg-indigo-600 hover:bg-indigo-700 text-white px-6">
                            {taskMutation.isPending ? 'Menyimpan...' : 'Simpan Tugas'}
                        </Button>
                    </div>
                </form>
            </Modal>

            <Modal
                title="Konfirmasi Hapus"
                isOpen={!!confirmDeleteModal}
                onClose={() => setConfirmDeleteModal(null)}
                icon={<AlertCircleIcon className="w-6 h-6 text-rose-500" />}
            >
                <div>
                    <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                        Apakah Anda yakin ingin menghapus tugas ini? Tindakan ini tidak dapat dibatalkan.
                    </p>
                    <div className="mt-4 p-4 bg-rose-50 dark:bg-rose-900/10 rounded-xl border border-rose-100 dark:border-rose-900/30">
                        <p className="font-bold text-rose-700 dark:text-rose-400 line-clamp-2">"{confirmDeleteModal?.title}"</p>
                    </div>
                    <div className="flex justify-end gap-3 pt-6">
                        <Button variant="ghost" onClick={() => setConfirmDeleteModal(null)} disabled={deleteMutation.isPending}>Batal</Button>
                        <Button variant="destructive" onClick={handleConfirmDelete} disabled={deleteMutation.isPending} className="bg-rose-600 hover:bg-rose-700 text-white">
                            {deleteMutation.isPending ? 'Menghapus...' : 'Hapus Tugas'}
                        </Button>
                    </div>
                </div>
            </Modal>
        </div>
    );
};

export default TasksPage;