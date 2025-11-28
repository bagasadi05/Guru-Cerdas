import React, { useState, useMemo, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Input } from '../ui/Input';
import { Button } from '../ui/Button';
import { Select } from '../ui/Select';
import { Modal } from '../ui/Modal';
import { useToast } from '../../hooks/useToast';
import { GraduationCapIcon, UsersIcon, PlusIcon, PencilIcon, TrashIcon, AlertCircleIcon, LayoutGridIcon, ListIcon, KeyRoundIcon, SearchIcon, MoreVerticalIcon, EyeIcon, ClipboardIcon } from '../Icons';
import { supabase } from '../../services/supabase';
import { useAuth } from '../../hooks/useAuth';
import { Database } from '../../services/database.types';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import StudentsPageSkeleton from '../skeletons/StudentsPageSkeleton';
import { Card } from '../ui/Card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/Tabs';
import BottomSheet from '../ui/BottomSheet';


type StudentRow = Database['public']['Tables']['students']['Row'];
type ClassRow = Database['public']['Tables']['classes']['Row'];

// Simplified data type for this page to improve performance
type StudentsPageData = {
    classes: ClassRow[];
    students: StudentRow[];
};

interface ConfirmActionModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => void;
    title: string;
    message: string;
    confirmText?: string;
    confirmVariant?: 'default' | 'destructive';
    isLoading?: boolean;
}

const ConfirmActionModal: React.FC<ConfirmActionModalProps> = ({ isOpen, onClose, onConfirm, title, message, confirmText = 'Confirm', confirmVariant = 'destructive', isLoading = false }) => (
    <Modal isOpen={isOpen} onClose={onClose} title={title} icon={<AlertCircleIcon className="w-5 h-5" />}>
        <div className="space-y-4">
            <div className="text-sm text-gray-600 dark:text-gray-400"><p>{message}</p></div>
            <div className="flex justify-end gap-2 pt-4">
                <Button type="button" variant="ghost" onClick={onClose} disabled={isLoading}>
                    Batal
                </Button>
                <Button type="button" variant={confirmVariant} onClick={onConfirm} disabled={isLoading}>
                    {isLoading ? 'Memproses...' : confirmText}
                </Button>
            </div>
        </div>
    </Modal>
);

const generateAccessCode = (): string => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let result = '';
    for (let i = 0; i < 6; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
};

const StudentsPage: React.FC = () => {
    const toast = useToast();
    const { user } = useAuth();
    const queryClient = useQueryClient();

    const [searchTerm, setSearchTerm] = useState('');
    const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
    const [activeClassId, setActiveClassId] = useState<string>('');
    const [sortBy, setSortBy] = useState<'name' | 'gender'>('name');
    const [genderFilter, setGenderFilter] = useState<'all' | 'Laki-laki' | 'Perempuan'>('all');

    const [isStudentModalOpen, setIsStudentModalOpen] = useState(false);
    const [studentModalMode, setStudentModalMode] = useState<'add' | 'edit'>('add');
    const [currentStudent, setCurrentStudent] = useState<StudentRow | null>(null);

    const [isClassModalOpen, setIsClassModalOpen] = useState(false);
    const [classModalMode, setClassModalMode] = useState<'add' | 'edit'>('add');
    const [currentClass, setCurrentClass] = useState<ClassRow | null>(null);
    const [classNameInput, setClassNameInput] = useState('');
    const [isClassManageModalOpen, setIsClassManageModalOpen] = useState(false);

    const [confirmModalState, setConfirmModalState] = useState<{ isOpen: boolean; title: string; message: string; onConfirm: () => void; confirmVariant?: 'default' | 'destructive', confirmText?: string }>({ isOpen: false, title: '', message: '', onConfirm: () => { }, confirmVariant: 'destructive' });
    const [selectedStudentForActions, setSelectedStudentForActions] = useState<StudentRow | null>(null);

    const { data, isLoading, isError, error: queryError } = useQuery({
        queryKey: ['studentsPageData', user?.id],
        queryFn: async (): Promise<StudentsPageData | null> => {
            if (!user) return null;
            const [classesRes, studentsRes] = await Promise.all([
                supabase.from('classes').select('*').eq('user_id', user.id).order('name'),
                supabase.from('students').select('*').eq('user_id', user.id),
            ]);
            if (classesRes.error) throw new Error(classesRes.error.message);
            if (studentsRes.error) throw new Error(studentsRes.error.message);
            return { classes: classesRes.data || [], students: studentsRes.data || [] };
        },
        enabled: !!user,
    });

    useEffect(() => { if (isError) { toast.error(`Gagal memuat data: ${(queryError as Error).message}`); } }, [isError, queryError, toast]);

    const { students = [], classes = [] } = data || {};

    useEffect(() => {
        if (classes && classes.length > 0 && !activeClassId) {
            setActiveClassId(classes[0].id);
        }
    }, [classes, activeClassId]);

    const mutationOptions = {
        onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['studentsPageData'] }); },
        onError: (error: Error) => toast.error(`Error: ${error.message}`),
    };

    const { mutate: addStudent, isPending: isAddingStudent } = useMutation({
        mutationFn: async (newStudent: Database['public']['Tables']['students']['Insert']) => { const { error } = await supabase.from('students').insert([newStudent]); if (error) throw error; },
        ...mutationOptions,
        onSuccess: () => { mutationOptions.onSuccess(); toast.success("Siswa berhasil ditambahkan."); setIsStudentModalOpen(false); },
    });

    const { mutate: updateStudent, isPending: isUpdatingStudent } = useMutation({
        mutationFn: async ({ id, ...updateData }: { id: string } & Database['public']['Tables']['students']['Update']) => { const { error } = await supabase.from('students').update(updateData).eq('id', id); if (error) throw error; },
        ...mutationOptions,
        onSuccess: () => { mutationOptions.onSuccess(); toast.success("Siswa berhasil diperbarui."); setIsStudentModalOpen(false); },
    });

    const { mutate: deleteStudent, isPending: isDeletingStudent } = useMutation({
        mutationFn: async (studentId: string) => { const { error } = await supabase.from('students').delete().eq('id', studentId); if (error) throw error; },
        ...mutationOptions,
        onSuccess: () => { mutationOptions.onSuccess(); toast.success("Siswa berhasil dihapus."); setConfirmModalState(prev => ({ ...prev, isOpen: false })); },
    });

    const { mutate: addClass, isPending: isAddingClass } = useMutation({
        mutationFn: async (newClass: Database['public']['Tables']['classes']['Insert']) => { const { error } = await supabase.from('classes').insert([newClass]); if (error) throw error; },
        ...mutationOptions,
        onSuccess: () => { mutationOptions.onSuccess(); toast.success("Kelas berhasil ditambahkan."); setIsClassModalOpen(false); },
    });

    const { mutate: updateClass, isPending: isUpdatingClass } = useMutation({
        mutationFn: async ({ id, ...updateData }: { id: string } & Database['public']['Tables']['classes']['Update']) => { const { error } = await supabase.from('classes').update(updateData).eq('id', id); if (error) throw error; },
        ...mutationOptions,
        onSuccess: () => { mutationOptions.onSuccess(); toast.success("Kelas berhasil diperbarui."); setIsClassModalOpen(false); },
    });

    const { mutate: deleteClass, isPending: isDeletingClass } = useMutation({
        mutationFn: async (classId: string) => { const { error } = await supabase.from('classes').delete().eq('id', classId); if (error) throw error; },
        ...mutationOptions,
        onSuccess: () => { mutationOptions.onSuccess(); toast.success("Kelas berhasil dihapus."); setConfirmModalState(prev => ({ ...prev, isOpen: false })); },
    });

    const { mutate: generateBulkCodes, isPending: isGeneratingBulkCodes } = useMutation({
        mutationFn: async (classId: string) => {
            const studentsInClass = students.filter(s => s.class_id === classId);
            const studentsToUpdate = studentsInClass.filter(s => !s.access_code).map(s => ({
                id: s.id,
                name: s.name,
                class_id: s.class_id,
                avatar_url: s.avatar_url,
                user_id: s.user_id,
                gender: s.gender,
                access_code: generateAccessCode(),
            }));
            if (studentsToUpdate.length === 0) return { message: "Semua siswa di kelas ini sudah memiliki kode akses." };
            const { error } = await supabase.from('students').upsert(studentsToUpdate);
            if (error) throw error;
            return { count: studentsToUpdate.length };
        },
        ...mutationOptions,
        onSuccess: (result) => {
            mutationOptions.onSuccess();
            if (result.message) { toast.info(result.message); }
            else { toast.success(`${result.count} kode akses baru berhasil dibuat.`); }
            setConfirmModalState(prev => ({ ...prev, isOpen: false }));
        },
    });

    const studentsForActiveClass = useMemo(() => {
        let filtered = students.filter(student => student.class_id === activeClassId);

        if (searchTerm) {
            filtered = filtered.filter(student => student.name.toLowerCase().includes(searchTerm.toLowerCase()));
        }

        if (genderFilter !== 'all') {
            filtered = filtered.filter(student => student.gender === genderFilter);
        }

        return filtered.sort((a, b) => {
            if (sortBy === 'name') {
                return a.name.localeCompare(b.name, 'id-ID');
            } else {
                return a.gender.localeCompare(b.gender);
            }
        });
    }, [searchTerm, students, activeClassId, sortBy, genderFilter]);

    const studentStats = useMemo(() => {
        const allInClass = students.filter(s => s.class_id === activeClassId);
        const maleCount = allInClass.filter(s => s.gender === 'Laki-laki').length;
        const femaleCount = allInClass.filter(s => s.gender === 'Perempuan').length;
        return { total: allInClass.length, male: maleCount, female: femaleCount };
    }, [students, activeClassId]);

    const handleOpenStudentModal = (mode: 'add' | 'edit', student: StudentRow | null = null) => {
        if (classes.length === 0) { toast.warning("Silakan tambah data kelas terlebih dahulu sebelum menambah siswa."); return; }
        setStudentModalMode(mode); setCurrentStudent(student); setIsStudentModalOpen(true);
    };

    const handleStudentFormSubmit = (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault(); if (!user) return;
        const formData = new FormData(e.currentTarget);
        const name = formData.get('name') as string; const class_id = formData.get('class_id') as string; const gender = formData.get('gender') as 'Laki-laki' | 'Perempuan';
        const avatarGender = gender === 'Laki-laki' ? 'boy' : 'girl'; const avatar_url = `https://avatar.iran.liara.run/public/${avatarGender}?username=${encodeURIComponent(name || Date.now())}`;

        if (studentModalMode === 'add') {
            const newStudentData: Database['public']['Tables']['students']['Insert'] = { name, class_id, user_id: user.id, gender, avatar_url };
            addStudent(newStudentData);
        } else if (currentStudent) {
            const newAvatarUrl = (currentStudent.gender !== gender || currentStudent.avatar_url.includes('pravatar')) ? avatar_url : currentStudent.avatar_url;
            const updateData: Database['public']['Tables']['students']['Update'] = { name, class_id, gender, avatar_url: newAvatarUrl };
            updateStudent({ id: currentStudent.id, ...updateData });
        }
    };

    const handleDeleteStudentClick = (student: StudentRow) => {
        setConfirmModalState({
            isOpen: true, title: 'Hapus Siswa', message: `Apakah Anda yakin ingin menghapus data siswa "${student.name}" secara permanen?`,
            onConfirm: () => deleteStudent(student.id), confirmVariant: 'destructive', confirmText: 'Ya, Hapus Siswa'
        });
    };

    const handleOpenClassModal = (mode: 'add' | 'edit', classData: ClassRow | null = null) => {
        setClassModalMode(mode); setCurrentClass(classData); setClassNameInput(classData?.name || ''); setIsClassModalOpen(true);
    };

    const handleClassFormSubmit = (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault(); if (!user || !classNameInput) return;
        if (classModalMode === 'add') {
            addClass({ name: classNameInput, user_id: user.id });
        } else if (currentClass) {
            updateClass({ id: currentClass.id, name: classNameInput });
        }
    };

    const handleDeleteClassClick = (classData: ClassRow) => {
        const studentCount = students.filter(s => s.class_id === classData.id).length;
        if (studentCount > 0) {
            toast.error(`Tidak dapat menghapus kelas "${classData.name}" karena masih ada ${studentCount} siswa di dalamnya.`); return;
        }
        setConfirmModalState({
            isOpen: true, title: 'Hapus Kelas', message: `Apakah Anda yakin ingin menghapus kelas "${classData.name}"?`,
            onConfirm: () => deleteClass(classData.id), confirmVariant: 'destructive', confirmText: 'Ya, Hapus Kelas'
        });
    };

    const handleGenerateCodesClick = (classData: ClassRow) => {
        setConfirmModalState({
            isOpen: true, title: 'Buat Kode Akses Massal', message: `Ini akan membuat kode akses untuk semua siswa di kelas "${classData.name}" yang belum memilikinya. Lanjutkan?`,
            onConfirm: () => generateBulkCodes(classData.id), confirmVariant: 'default', confirmText: 'Ya, Buat Kode'
        });
    };

    if (isLoading) return <StudentsPageSkeleton />;

    return (
        <div className="w-full min-h-full p-4 sm:p-6 md:p-8 flex flex-col space-y-6 max-w-7xl mx-auto">
            <header>
                <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-gray-900 dark:text-white">Manajemen Siswa</h1>
                <p className="mt-1 text-gray-600 dark:text-indigo-200">Kelola data siswa dan kelas Anda.</p>
            </header>

            <div className="sticky top-0 z-30 bg-gray-50/95 dark:bg-gray-900/95 backdrop-blur-sm pt-2 pb-4 -mx-4 px-4 sm:static sm:bg-transparent sm:p-0 sm:mx-0 border-b sm:border-none border-gray-200 dark:border-gray-800 transition-all">
                <div className="flex flex-col gap-3 max-w-7xl mx-auto">
                    <div className="relative group">
                        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                            <SearchIcon className="h-5 w-5 text-gray-400 group-focus-within:text-indigo-500 transition-colors" />
                        </div>
                        <Input
                            type="text"
                            placeholder="Cari siswa..."
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                            className="pl-11 h-12 text-base w-full shadow-sm border-gray-200 dark:border-gray-700 focus:ring-2 focus:ring-indigo-500 rounded-2xl bg-white dark:bg-gray-800"
                        />
                        <div className="absolute right-2 top-1/2 -translate-y-1/2 flex gap-1 bg-gray-100 dark:bg-gray-700 rounded-xl p-1">
                            <button
                                onClick={() => setViewMode('grid')}
                                className={`p-2 rounded-lg transition-all ${viewMode === 'grid' ? 'bg-white dark:bg-gray-600 shadow-sm text-indigo-600 dark:text-indigo-400' : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-300'}`}
                            >
                                <LayoutGridIcon className="h-5 w-5" />
                            </button>
                            <button
                                onClick={() => setViewMode('list')}
                                className={`p-2 rounded-lg transition-all ${viewMode === 'list' ? 'bg-white dark:bg-gray-600 shadow-sm text-indigo-600 dark:text-indigo-400' : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-300'}`}
                            >
                                <ListIcon className="h-5 w-5" />
                            </button>
                        </div>
                    </div>

                    <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-hide -mx-4 px-4 sm:mx-0 sm:px-0 mask-image-linear-gradient">
                        <Button size="sm" onClick={() => handleOpenStudentModal('add')} className="flex-shrink-0 rounded-full shadow-md bg-indigo-600 hover:bg-indigo-700 text-white border-none"><PlusIcon className="w-4 h-4 mr-1" /> Siswa Baru</Button>
                        <div className="w-px h-6 bg-gray-300 dark:bg-gray-700 mx-2 flex-shrink-0"></div>

                        {[
                            { id: 'all', label: 'Semua', count: studentStats.total, activeClass: 'bg-gray-900 text-white dark:bg-white dark:text-gray-900', inactiveClass: 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-gray-700' },
                            { id: 'Laki-laki', label: 'Laki-laki', count: studentStats.male, activeClass: 'bg-blue-600 text-white shadow-blue-200', inactiveClass: 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-gray-700' },
                            { id: 'Perempuan', label: 'Perempuan', count: studentStats.female, activeClass: 'bg-pink-600 text-white shadow-pink-200', inactiveClass: 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-gray-700' }
                        ].map((filter) => (
                            <button
                                key={filter.id}
                                onClick={() => setGenderFilter(filter.id as any)}
                                className={`flex-shrink-0 px-4 py-2 rounded-full text-sm font-medium transition-all duration-200 whitespace-nowrap shadow-sm hover:shadow-md ${genderFilter === filter.id ? filter.activeClass : filter.inactiveClass}`}
                            >
                                {filter.label} <span className="opacity-70 ml-1 text-xs">({filter.count})</span>
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            <main className="flex-grow">
                <Tabs value={activeClassId} onValueChange={setActiveClassId} className="w-full">
                    <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
                        <TabsList className="bg-transparent p-0 gap-2 flex-wrap h-auto">
                            {classes.map(c => (
                                <TabsTrigger
                                    key={c.id}
                                    value={c.id}
                                    className="data-[state=active]:bg-indigo-100 data-[state=active]:text-indigo-700 dark:data-[state=active]:bg-indigo-900/30 dark:data-[state=active]:text-indigo-300 border border-transparent data-[state=active]:border-indigo-200 dark:data-[state=active]:border-indigo-800 rounded-full px-4 py-2 transition-all"
                                >
                                    {c.name}
                                </TabsTrigger>
                            ))}
                        </TabsList>
                        <Button size="sm" variant="outline" onClick={() => setIsClassManageModalOpen(true)} className="rounded-full border-dashed border-gray-300 text-gray-500 hover:text-indigo-600 hover:border-indigo-300"><PencilIcon className="w-3.5 h-3.5 mr-2" /> Kelola Kelas</Button>
                    </div>

                    {classes.map(c => (
                        <TabsContent key={c.id} value={c.id} className="mt-0">
                            {studentsForActiveClass.length === 0 ? (
                                <div className="flex flex-col items-center justify-center py-20 text-center animate-fade-in">
                                    <div className="w-24 h-24 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mb-6">
                                        <UsersIcon className="w-12 h-12 text-gray-300 dark:text-gray-600" />
                                    </div>
                                    <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Belum Ada Siswa</h3>
                                    <p className="text-gray-500 dark:text-gray-400 max-w-xs mx-auto">Kelas ini masih kosong atau tidak ada siswa yang cocok dengan filter pencarian.</p>
                                    <Button variant="outline" className="mt-6" onClick={() => handleOpenStudentModal('add')}>Tambah Siswa Baru</Button>
                                </div>
                            ) : (
                                <div className={viewMode === 'grid'
                                    ? "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6"
                                    : "space-y-3"}>
                                    {studentsForActiveClass.map((student, index) => (
                                        viewMode === 'grid' ? (
                                            <Card
                                                key={student.id}
                                                className="relative p-0 group overflow-hidden border-0 shadow-md hover:shadow-xl transition-all duration-300 hover:-translate-y-1 bg-white dark:bg-gray-800 rounded-2xl"
                                                style={{ animationDelay: `${index * 50}ms` }}
                                            >
                                                <div className={`h-24 w-full bg-gradient-to-br ${student.gender === 'Laki-laki' ? 'from-blue-400 to-indigo-500' : 'from-pink-400 to-rose-500'} opacity-80`}></div>
                                                <div className="px-5 pb-6 flex flex-col items-center -mt-12">
                                                    <div className="relative">
                                                        <img
                                                            src={student.avatar_url}
                                                            alt={student.name}
                                                            className="w-24 h-24 rounded-full object-cover border-4 border-white dark:border-gray-800 shadow-md bg-white dark:bg-gray-700"
                                                        />
                                                        <div className={`absolute bottom-1 right-1 w-7 h-7 rounded-full border-2 border-white dark:border-gray-800 flex items-center justify-center shadow-sm ${student.gender === 'Laki-laki' ? 'bg-blue-500' : 'bg-pink-500'}`}>
                                                            <span className="text-white text-[10px] font-bold">{student.gender === 'Laki-laki' ? 'L' : 'P'}</span>
                                                        </div>
                                                    </div>

                                                    <h4 className="mt-3 font-bold text-lg text-gray-900 dark:text-white text-center line-clamp-1 w-full px-2">{student.name}</h4>
                                                    <div className="mt-1 flex items-center gap-2">
                                                        <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300">
                                                            {student.access_code || 'No Code'}
                                                        </span>
                                                    </div>

                                                    <div className="mt-4 flex gap-2 w-full">
                                                        <Link
                                                            to={`/siswa/${student.id}`}
                                                            className="flex-1 py-2 text-center text-sm font-semibold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/20 rounded-lg hover:bg-indigo-100 dark:hover:bg-indigo-900/40 transition-colors"
                                                        >
                                                            Detail
                                                        </Link>
                                                        <button
                                                            onClick={() => setSelectedStudentForActions(student)}
                                                            className="w-10 flex items-center justify-center rounded-lg bg-gray-50 dark:bg-gray-700 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors"
                                                        >
                                                            <MoreVerticalIcon className="w-5 h-5" />
                                                        </button>
                                                    </div>
                                                </div>
                                            </Card>
                                        ) : (
                                            <Card
                                                key={student.id}
                                                className="p-3 flex items-center gap-4 transition-all duration-200 hover:bg-gray-50 dark:hover:bg-white/5 border-l-4 border-transparent hover:border-indigo-500"
                                                style={{ animationDelay: `${index * 30}ms` }}
                                            >
                                                <div className="relative flex-shrink-0">
                                                    <img src={student.avatar_url} alt={student.name} className="w-14 h-14 rounded-full object-cover bg-gray-100 dark:bg-gray-700" />
                                                    <div className={`absolute -bottom-1 -right-1 w-5 h-5 rounded-full border-2 border-white dark:border-gray-800 flex items-center justify-center ${student.gender === 'Laki-laki' ? 'bg-blue-500' : 'bg-pink-500'}`}>
                                                        <span className="text-white text-[8px] font-bold">{student.gender === 'Laki-laki' ? 'L' : 'P'}</span>
                                                    </div>
                                                </div>

                                                <Link to={`/siswa/${student.id}`} className="flex-grow min-w-0 flex flex-col justify-center h-full py-1">
                                                    <h4 className="font-bold text-gray-900 dark:text-white truncate text-base">{student.name}</h4>
                                                    <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
                                                        <span>Kode: <span className="font-mono font-medium text-gray-700 dark:text-gray-300">{student.access_code || '-'}</span></span>
                                                    </div>
                                                </Link>

                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="h-10 w-10 rounded-full text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-800"
                                                    onClick={() => setSelectedStudentForActions(student)}
                                                >
                                                    <MoreVerticalIcon className="w-5 h-5" />
                                                </Button>
                                            </Card>
                                        )
                                    ))}
                                </div>
                            )}
                        </TabsContent>
                    ))}
                </Tabs>
            </main>

            <BottomSheet isOpen={!!selectedStudentForActions} onClose={() => setSelectedStudentForActions(null)} title={selectedStudentForActions?.name || 'Aksi Siswa'}>
                <div className="flex flex-col gap-2">
                    <Link
                        to={`/siswa/${selectedStudentForActions?.id}`}
                        className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                        onClick={() => setSelectedStudentForActions(null)}
                    >
                        <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-blue-600 dark:text-blue-400">
                            <EyeIcon className="w-5 h-5" />
                        </div>
                        <div className="flex-grow">
                            <p className="font-semibold text-gray-900 dark:text-gray-100">Lihat Detail</p>
                            <p className="text-xs text-gray-500">Lihat profil, nilai, dan absensi</p>
                        </div>
                    </Link>

                    <button
                        className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors text-left"
                        onClick={() => {
                            if (selectedStudentForActions) {
                                handleOpenStudentModal('edit', selectedStudentForActions);
                                setSelectedStudentForActions(null);
                            }
                        }}
                    >
                        <div className="w-10 h-10 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center text-amber-600 dark:text-amber-400">
                            <PencilIcon className="w-5 h-5" />
                        </div>
                        <div className="flex-grow">
                            <p className="font-semibold text-gray-900 dark:text-gray-100">Edit Data</p>
                            <p className="text-xs text-gray-500">Ubah nama, kelas, atau foto</p>
                        </div>
                    </button>

                    {!selectedStudentForActions?.access_code && (
                        <button
                            className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors text-left"
                            onClick={() => {
                                // Logic to generate single code could be added here, for now just a placeholder or reuse bulk logic if adapted
                                toast.info("Fitur generate kode per siswa akan segera hadir. Gunakan fitur massal di menu kelas.");
                                setSelectedStudentForActions(null);
                            }}
                        >
                            <div className="w-10 h-10 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center text-green-600 dark:text-green-400">
                                <KeyRoundIcon className="w-5 h-5" />
                            </div>
                            <div className="flex-grow">
                                <p className="font-semibold text-gray-900 dark:text-gray-100">Buat Kode Akses</p>
                                <p className="text-xs text-gray-500">Generate kode login siswa</p>
                            </div>
                        </button>
                    )}

                    {selectedStudentForActions?.access_code && (
                        <button
                            className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors text-left"
                            onClick={() => {
                                navigator.clipboard.writeText(selectedStudentForActions.access_code || '');
                                toast.success("Kode akses disalin!");
                                setSelectedStudentForActions(null);
                            }}
                        >
                            <div className="w-10 h-10 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-gray-600 dark:text-gray-400">
                                <ClipboardIcon className="w-5 h-5" />
                            </div>
                            <div className="flex-grow">
                                <p className="font-semibold text-gray-900 dark:text-gray-100">Salin Kode</p>
                                <p className="text-xs text-gray-500">{selectedStudentForActions.access_code}</p>
                            </div>
                        </button>
                    )}

                    <div className="h-px bg-gray-200 dark:bg-gray-800 my-1"></div>

                    <button
                        className="flex items-center gap-3 p-3 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/10 transition-colors text-left group"
                        onClick={() => {
                            if (selectedStudentForActions) {
                                handleDeleteStudentClick(selectedStudentForActions);
                                setSelectedStudentForActions(null);
                            }
                        }}
                    >
                        <div className="w-10 h-10 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center text-red-600 dark:text-red-400 group-hover:bg-red-200 dark:group-hover:bg-red-900/50 transition-colors">
                            <TrashIcon className="w-5 h-5" />
                        </div>
                        <div className="flex-grow">
                            <p className="font-semibold text-red-600 dark:text-red-400">Hapus Siswa</p>
                            <p className="text-xs text-red-400/70">Tindakan ini tidak dapat dibatalkan</p>
                        </div>
                    </button>
                </div>
            </BottomSheet>

            {/* Student Modal */}
            <Modal isOpen={isStudentModalOpen} onClose={() => setIsStudentModalOpen(false)} title={studentModalMode === 'add' ? 'Tambah Siswa Baru' : 'Edit Siswa'}>
                <form onSubmit={handleStudentFormSubmit} className="space-y-4">
                    <div><label htmlFor="student-name">Nama Lengkap</label><Input id="student-name" name="name" defaultValue={currentStudent?.name || ''} required /></div>
                    <div><label htmlFor="student-class">Kelas</label><Select id="student-class" name="class_id" defaultValue={currentStudent?.class_id || activeClassId} required>{classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</Select></div>
                    <div><label>Jenis Kelamin</label><div className="flex gap-4 mt-2"><label className="flex items-center"><input type="radio" name="gender" value="Laki-laki" defaultChecked={currentStudent?.gender !== 'Perempuan'} className="form-radio" /><span className="ml-2">Laki-laki</span></label><label className="flex items-center"><input type="radio" name="gender" value="Perempuan" defaultChecked={currentStudent?.gender === 'Perempuan'} className="form-radio" /><span className="ml-2">Perempuan</span></label></div></div>
                    <div className="flex justify-end gap-2 pt-4"><Button type="button" variant="ghost" onClick={() => setIsStudentModalOpen(false)}>Batal</Button><Button type="submit" disabled={isAddingStudent || isUpdatingStudent}>{isAddingStudent || isUpdatingStudent ? 'Menyimpan...' : 'Simpan'}</Button></div>
                </form>
            </Modal>

            {/* Class Management Modals */}
            <Modal isOpen={isClassManageModalOpen} onClose={() => setIsClassManageModalOpen(false)} title="Kelola Kelas">
                <div className="space-y-3 max-h-80 overflow-y-auto pr-2">
                    {classes.map(c => (
                        <div key={c.id} className="flex items-center justify-between p-3 rounded-lg bg-gray-100 dark:bg-black/20">
                            <span className="font-semibold">{c.name}</span>
                            <div className="flex items-center gap-1">
                                <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => { setIsClassManageModalOpen(false); handleGenerateCodesClick(c); }} title="Buat kode akses massal"><KeyRoundIcon className="h-4 w-4 text-green-500" /></Button>
                                <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => { setIsClassManageModalOpen(false); handleOpenClassModal('edit', c); }}><PencilIcon className="h-4 w-4" /></Button>
                                <Button size="icon" variant="ghost" className="h-7 w-7 text-red-500" onClick={() => handleDeleteClassClick(c)}><TrashIcon className="h-4 w-4" /></Button>
                            </div>
                        </div>
                    ))}
                </div>
                <div className="mt-4 pt-4 border-t border-gray-200 dark:border-white/10">
                    <Button onClick={() => { setIsClassManageModalOpen(false); handleOpenClassModal('add'); }} className="w-full"><PlusIcon className="w-4 h-4 mr-2" /> Tambah Kelas Baru</Button>
                </div>
            </Modal>
            <Modal isOpen={isClassModalOpen} onClose={() => setIsClassModalOpen(false)} title={classModalMode === 'add' ? 'Tambah Kelas Baru' : 'Edit Kelas'}>
                <form onSubmit={handleClassFormSubmit} className="space-y-4">
                    <div><label htmlFor="class-name">Nama Kelas</label><Input id="class-name" value={classNameInput} onChange={e => setClassNameInput(e.target.value)} required placeholder="cth. 7A" /></div>
                    <div className="flex justify-end gap-2 pt-4"><Button type="button" variant="ghost" onClick={() => setIsClassModalOpen(false)}>Batal</Button><Button type="submit" disabled={isAddingClass || isUpdatingClass}>{isAddingClass || isUpdatingClass ? 'Menyimpan...' : 'Simpan'}</Button></div>
                </form>
            </Modal>

            <ConfirmActionModal
                isOpen={confirmModalState.isOpen}
                onClose={() => setConfirmModalState(prev => ({ ...prev, isOpen: false }))}
                onConfirm={confirmModalState.onConfirm}
                title={confirmModalState.title}
                message={confirmModalState.message}
                confirmText={confirmModalState.confirmText}
                confirmVariant={confirmModalState.confirmVariant}
                isLoading={isDeletingStudent || isDeletingClass || isGeneratingBulkCodes}
            />
        </div>
    );
};

export default StudentsPage;