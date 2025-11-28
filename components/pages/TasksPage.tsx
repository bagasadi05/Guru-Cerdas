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
import { PlusIcon, PencilIcon, TrashIcon, CalendarIcon, MoreVerticalIcon, AlertCircleIcon, ClockIcon, CheckCircleIcon } from '../Icons';
import { useOfflineStatus } from '../../hooks/useOfflineStatus';

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
        if (isDone) return { border: 'border-green-500', bg: 'bg-green-500/10', text: 'text-green-600 dark:text-green-400' };

        if (!task.due_date) return { border: 'border-gray-300 dark:border-gray-600', bg: 'bg-white dark:bg-gray-800', text: 'text-gray-600 dark:text-gray-400' };

        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const dueDate = new Date(task.due_date);
        dueDate.setHours(0, 0, 0, 0);

        if (dueDate < today) return { border: 'border-red-500', bg: 'bg-red-50 dark:bg-red-900/10', text: 'text-red-600 dark:text-red-400' };
        if (dueDate.getTime() === today.getTime()) return { border: 'border-sky-500', bg: 'bg-sky-50 dark:bg-sky-900/10', text: 'text-sky-600 dark:text-sky-400' };

        return { border: 'border-l-4 border-l-gray-300 dark:border-l-gray-600', bg: 'bg-white dark:bg-gray-800', text: 'text-gray-600 dark:text-gray-400' };
    };

    const statusInfo = getTaskStatusInfo();

    return (
        <div className={`
            relative group
            bg-white dark:bg-gray-800 
            rounded-xl p-5 
            border-l-4 ${statusInfo.border}
            shadow-sm hover:shadow-md transition-all duration-200
            ${isDone ? 'opacity-60' : ''}
        `}>
            <div className="flex items-start gap-4">
                <Checkbox
                    checked={isDone}
                    onChange={() => onStatusChange(task.id, isDone ? 'todo' : 'done')}
                    disabled={!isOnline}
                    className="mt-1 w-7 h-7 rounded-full border-2"
                />

                <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-start">
                        <h3 className={`font-semibold text-lg mb-1 break-words ${isDone ? 'line-through text-gray-500' : 'text-gray-900 dark:text-white'}`}>
                            {task.title}
                        </h3>

                        <DropdownMenu>
                            <DropdownTrigger className="w-10 h-10 flex items-center justify-center rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-400 dark:text-gray-500 transition-colors -mr-2 -mt-2">
                                <MoreVerticalIcon className="w-5 h-5" />
                            </DropdownTrigger>
                            <DropdownContent>
                                <DropdownItem icon={<PencilIcon className="w-4 h-4" />} onClick={() => onEdit(task)}>Edit</DropdownItem>
                                <DropdownItem icon={<TrashIcon className="w-4 h-4 text-red-500" />} onClick={() => onDelete(task.id)} className="text-red-600 dark:text-red-400">Hapus</DropdownItem>
                            </DropdownContent>
                        </DropdownMenu>
                    </div>

                    {task.description && (
                        <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2 mb-3">
                            {task.description}
                        </p>
                    )}

                    <div className="flex items-center gap-3 text-xs">
                        {task.due_date && (
                            <span className={`flex items-center gap-1.5 font-medium ${statusInfo.text}`}>
                                <CalendarIcon className="w-4 h-4" />
                                {new Date(task.due_date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })}
                            </span>
                        )}
                        {!task.due_date && (
                            <span className="flex items-center gap-1.5 text-gray-400">
                                <ClockIcon className="w-4 h-4" />
                                Tanpa tenggat
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

    const { data: tasks = [], isLoading } = useQuery({
        queryKey: ['tasks', user?.id],
        queryFn: async (): Promise<Task[]> => {
            const { data, error } = await supabase.from('tasks').select('*').eq('user_id', user!.id).order('created_at', { ascending: false });
            if (error) throw error;
            return data || [];
        },
        enabled: !!user,
    });

    // ... (Keep existing useEffect for prefill) ...
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
            } else {
                // toast.success("Status tugas diperbarui!"); // Optional: reduce noise
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

    const groupedTasks = useMemo(() => {
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const overdue: Task[] = [];
        const todayTasks: Task[] = [];
        const upcoming: Task[] = [];
        const completed: Task[] = [];

        tasks.forEach(task => {
            if (task.status === 'done') {
                completed.push(task);
                return;
            }

            if (!task.due_date) {
                upcoming.push(task);
                return;
            }

            const dueDate = new Date(task.due_date);
            dueDate.setHours(0, 0, 0, 0);

            if (dueDate < today) {
                overdue.push(task);
            } else if (dueDate.getTime() === today.getTime()) {
                todayTasks.push(task);
            } else {
                upcoming.push(task);
            }
        });

        // Sort upcoming by date
        upcoming.sort((a, b) => {
            if (!a.due_date) return 1;
            if (!b.due_date) return -1;
            return new Date(a.due_date).getTime() - new Date(b.due_date).getTime();
        });

        return { overdue, today: todayTasks, upcoming, completed };
    }, [tasks]);

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
        return <div className="flex items-center justify-center h-full bg-gray-50 dark:bg-gray-950"><div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div></div>;
    }

    return (
        <div className="w-full min-h-full pb-24 bg-gray-50 dark:bg-gray-950">
            <div className="holographic-orb-container" style={{ top: '-40px', width: '120px', height: '120px', opacity: 0.7 }}>
                <div className="holographic-orb">
                    <div className="orb-glow"></div>
                    <div className="orb-core"></div>
                    <div className="orb-ring orb-ring-1"></div>
                    <div className="orb-ring orb-ring-2"></div>
                </div>
            </div>

            <div className="p-4 sm:p-6 max-w-3xl mx-auto relative z-10">
                <header className="mb-8">
                    <h1 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-white">Tugas Saya</h1>
                    <p className="mt-1 text-gray-600 dark:text-indigo-200">Kelola tenggat waktu dan prioritas Anda.</p>
                </header>

                <div className="space-y-8">
                    {/* Overdue Section */}
                    {groupedTasks.overdue.length > 0 && (
                        <section className="animate-fade-in-up">
                            <div className="flex items-center gap-2 mb-4 px-1">
                                <AlertCircleIcon className="w-5 h-5 text-red-500" />
                                <h2 className="font-bold text-lg text-red-600 dark:text-red-400">
                                    Terlambat ({groupedTasks.overdue.length})
                                </h2>
                            </div>
                            <div className="space-y-3">
                                {groupedTasks.overdue.map(task => (
                                    <TaskCard
                                        key={task.id}
                                        task={task}
                                        onEdit={(t) => setModalState({ isOpen: true, mode: 'edit', data: t })}
                                        onDelete={handleDeleteClick}
                                        onStatusChange={handleStatusChange}
                                        isOnline={isOnline}
                                    />
                                ))}
                            </div>
                        </section>
                    )}

                    {/* Today Section */}
                    {groupedTasks.today.length > 0 && (
                        <section className="animate-fade-in-up animation-delay-100">
                            <div className="flex items-center gap-2 mb-4 px-1">
                                <CalendarIcon className="w-5 h-5 text-sky-500" />
                                <h2 className="font-bold text-lg text-gray-900 dark:text-white">
                                    Hari Ini ({groupedTasks.today.length})
                                </h2>
                            </div>
                            <div className="space-y-3">
                                {groupedTasks.today.map(task => (
                                    <TaskCard
                                        key={task.id}
                                        task={task}
                                        onEdit={(t) => setModalState({ isOpen: true, mode: 'edit', data: t })}
                                        onDelete={handleDeleteClick}
                                        onStatusChange={handleStatusChange}
                                        isOnline={isOnline}
                                    />
                                ))}
                            </div>
                        </section>
                    )}

                    {/* Upcoming Section */}
                    {groupedTasks.upcoming.length > 0 && (
                        <section className="animate-fade-in-up animation-delay-200">
                            <div className="flex items-center gap-2 mb-4 px-1">
                                <ClockIcon className="w-5 h-5 text-gray-500 dark:text-gray-400" />
                                <h2 className="font-bold text-lg text-gray-900 dark:text-white">
                                    Mendatang ({groupedTasks.upcoming.length})
                                </h2>
                            </div>
                            <div className="space-y-3">
                                {groupedTasks.upcoming.map(task => (
                                    <TaskCard
                                        key={task.id}
                                        task={task}
                                        onEdit={(t) => setModalState({ isOpen: true, mode: 'edit', data: t })}
                                        onDelete={handleDeleteClick}
                                        onStatusChange={handleStatusChange}
                                        isOnline={isOnline}
                                    />
                                ))}
                            </div>
                        </section>
                    )}

                    {/* Completed Section */}
                    {groupedTasks.completed.length > 0 && (
                        <section className="animate-fade-in-up animation-delay-300">
                            <div className="flex items-center gap-2 mb-4 px-1">
                                <CheckCircleIcon className="w-5 h-5 text-green-500" />
                                <h2 className="font-bold text-lg text-gray-900 dark:text-white">
                                    Selesai ({groupedTasks.completed.length})
                                </h2>
                            </div>
                            <div className="space-y-3">
                                {groupedTasks.completed.map(task => (
                                    <TaskCard
                                        key={task.id}
                                        task={task}
                                        onEdit={(t) => setModalState({ isOpen: true, mode: 'edit', data: t })}
                                        onDelete={handleDeleteClick}
                                        onStatusChange={handleStatusChange}
                                        isOnline={isOnline}
                                    />
                                ))}
                            </div>
                        </section>
                    )}

                    {tasks.length === 0 && (
                        <div className="flex flex-col items-center justify-center py-20 text-center">
                            <div className="w-24 h-24 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mb-4">
                                <CheckCircleIcon className="w-10 h-10 text-gray-400" />
                            </div>
                            <h3 className="text-lg font-medium text-gray-900 dark:text-white">Semua beres!</h3>
                            <p className="text-gray-500 dark:text-gray-400 max-w-xs mx-auto mt-1">
                                Anda tidak memiliki tugas yang tertunda. Nikmati waktu luang Anda atau tambahkan tugas baru.
                            </p>
                        </div>
                    )}
                </div>
            </div>

            <FloatingActionButton
                position="bottom-right"
                offset={{ bottom: 88, right: 16 }}
                size={64}
                onClick={() => setModalState({ isOpen: true, mode: 'add', data: null })}
                className="z-40 shadow-xl shadow-blue-500/20"
            >
                <div className="flex items-center gap-2">
                    <PlusIcon className="w-6 h-6" />
                    <span className="max-w-0 overflow-hidden group-hover:max-w-xs transition-all duration-300 text-base font-medium whitespace-nowrap">
                        Tambah Tugas
                    </span>
                </div>
            </FloatingActionButton>

            <Modal title={modalState.mode === 'add' ? 'Tambah Tugas Baru' : 'Edit Tugas'} isOpen={modalState.isOpen} onClose={() => setModalState(prev => ({ ...prev, isOpen: false }))}>
                <form onSubmit={handleFormSubmit} className="space-y-4">
                    <div>
                        <label htmlFor="title" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Judul</label>
                        <Input id="title" name="title" defaultValue={modalState.data?.title || ''} required className="mt-1" placeholder="Contoh: Periksa ujian kelas 7A" />
                    </div>
                    <div>
                        <label htmlFor="description" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Deskripsi (Opsional)</label>
                        <textarea
                            id="description"
                            name="description"
                            defaultValue={modalState.data?.description || ''}
                            rows={3}
                            className="mt-1 block w-full rounded-xl border-gray-300 shadow-sm focus:border-sky-500 focus:ring-sky-500 sm:text-sm dark:bg-gray-800 dark:border-gray-600 dark:text-white p-3"
                            placeholder="Tambahkan detail tugas..."
                        />
                    </div>
                    <div>
                        <label htmlFor="due_date" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Tanggal Jatuh Tempo (Opsional)</label>
                        <Input id="due_date" name="due_date" type="date" defaultValue={modalState.data?.due_date || ''} className="mt-1" />
                    </div>
                    <div className="flex justify-end gap-2 pt-4">
                        <Button type="button" variant="ghost" onClick={() => setModalState(prev => ({ ...prev, isOpen: false }))}>Batal</Button>
                        <Button type="submit" disabled={taskMutation.isPending || !isOnline}>{taskMutation.isPending ? 'Menyimpan...' : 'Simpan'}</Button>
                    </div>
                </form>
            </Modal>

            <Modal
                title="Konfirmasi Hapus Tugas"
                isOpen={!!confirmDeleteModal}
                onClose={() => setConfirmDeleteModal(null)}
            >
                <div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                        Apakah Anda yakin ingin menghapus tugas ini?
                        <strong className="block mt-2 p-3 bg-gray-100 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white">"{confirmDeleteModal?.title}"</strong>
                    </p>
                    <div className="flex justify-end gap-2 pt-4 mt-4">
                        <Button variant="ghost" onClick={() => setConfirmDeleteModal(null)} disabled={deleteMutation.isPending}>Batal</Button>
                        <Button variant="destructive" onClick={handleConfirmDelete} disabled={deleteMutation.isPending}>
                            {deleteMutation.isPending ? 'Menghapus...' : 'Ya, Hapus'}
                        </Button>
                    </div>
                </div>
            </Modal>
        </div>
    );
};

export default TasksPage;