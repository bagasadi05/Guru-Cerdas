import React, { useState, useMemo, useEffect, useDeferredValue } from 'react';
import { triggerSuccessConfetti } from '../../utils/confetti';

import { Link } from 'react-router-dom';
import { Input } from '../ui/Input';
import { Button } from '../ui/Button';
import { Select } from '../ui/Select';
import { Modal } from '../ui/Modal';
import { DropdownMenu, DropdownTrigger, DropdownContent, DropdownItem } from '../ui/DropdownMenu';
import { useToast } from '../../hooks/useToast';
import { UsersIcon, PlusIcon, PencilIcon, TrashIcon, AlertCircleIcon, KeyRoundIcon, MoreVerticalIcon, EyeIcon, ClipboardIcon, DownloadCloudIcon, PrinterIcon, ArrowRightIcon } from '../Icons';
import { supabase } from '../../services/supabase';
import { useAuth } from '../../hooks/useAuth';
import { Database } from '../../services/database.types';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import StudentsPageSkeleton from '../skeletons/StudentsPageSkeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/Tabs';
import BottomSheet from '../ui/BottomSheet';
import { exportToExcel } from '../../utils/exportUtils';
import { useBulkSelection, BulkActionBar, ExportPreviewModal, ExportFormat } from '../AdvancedFeatures';
import { ImportModal } from '../ui/ImportModal';
import { ParsedRow } from '../../services/ImportService';
import { UploadCloudIcon } from 'lucide-react';
import { StudentGrid } from '../students/StudentGrid';
import { StudentTable } from '../students/StudentTable';
import { StudentFilters } from '../students/StudentFilters';
import { IDCardPrintModal } from '../students/IDCardPrintModal';
import { BulkMoveModal } from '../students/BulkMoveModal';
import { ImportFromTeacherModal } from '../students/ImportFromTeacherModal';
import { StudentRow, ClassRow } from '../students/types';


// Type definition removed since it was unused

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
    const deferredSearchTerm = useDeferredValue(searchTerm);
    const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
    const [activeClassId, setActiveClassId] = useState<string>('');
    const [sortConfig, setSortConfig] = useState<{ key: string, direction: 'asc' | 'desc' }>({ key: 'name', direction: 'asc' });
    const [genderFilter, setGenderFilter] = useState<'all' | 'Laki-laki' | 'Perempuan'>('all');
    const [accessCodeFilter, setAccessCodeFilter] = useState<'all' | 'has_code' | 'no_code'>('all');

    const [isStudentModalOpen, setIsStudentModalOpen] = useState(false);
    const [studentModalMode, setStudentModalMode] = useState<'add' | 'edit'>('add');
    const [currentStudent, setCurrentStudent] = useState<StudentRow | null>(null);
    const [genderSelection, setGenderSelection] = useState<'Laki-laki' | 'Perempuan'>('Laki-laki');

    const [isClassModalOpen, setIsClassModalOpen] = useState(false);
    const [classModalMode, setClassModalMode] = useState<'add' | 'edit'>('add');
    const [currentClass, setCurrentClass] = useState<ClassRow | null>(null);
    const [classNameInput, setClassNameInput] = useState('');
    const [isClassManageModalOpen, setIsClassManageModalOpen] = useState(false);

    const [confirmModalState, setConfirmModalState] = useState<{ isOpen: boolean; title: string; message: string; onConfirm: () => void; confirmVariant?: 'default' | 'destructive', confirmText?: string }>({ isOpen: false, title: '', message: '', onConfirm: () => { }, confirmVariant: 'destructive' });
    const [selectedStudentForActions, setSelectedStudentForActions] = useState<StudentRow | null>(null);

    const { data: classesData, isLoading: isLoadingClasses, isError: isClassesError, error: classesError } = useQuery({
        queryKey: ['classes', user?.id],
        queryFn: async () => {
            if (!user) return [];
            const { data, error } = await supabase.from('classes').select('*').eq('user_id', user.id).is('deleted_at', null).order('name');
            if (error) throw new Error(error.message);
            return data || [];
        },
        enabled: !!user,
    });

    const { data: studentsData, isLoading: isLoadingStudents, isError: isStudentsError, error: studentsError } = useQuery({
        queryKey: ['students', user?.id, activeClassId],
        queryFn: async () => {
            if (!user || !activeClassId) return [];
            const { data, error } = await supabase.from('students').select('*').eq('user_id', user.id).eq('class_id', activeClassId).is('deleted_at', null);
            if (error) throw new Error(error.message);
            return data || [];
        },
        enabled: !!user && !!activeClassId,
    });

    const isLoading = isLoadingClasses || isLoadingStudents;
    const isError = isClassesError || isStudentsError;
    const queryError = classesError || studentsError;
    const EMPTY_CLASSES: ClassRow[] = useMemo(() => [], []);
    const EMPTY_STUDENTS: StudentRow[] = useMemo(() => [], []);
    const classes = classesData || EMPTY_CLASSES;
    const students = studentsData || EMPTY_STUDENTS;

    const [isExportModalOpen, setIsExportModalOpen] = useState(false);
    const [isImportModalOpen, setIsImportModalOpen] = useState(false);

    useEffect(() => { if (isError) { toast.error(`Gagal memuat data: ${(queryError as Error).message}`); } }, [isError, queryError, toast]);



    useEffect(() => {
        if (classes && classes.length > 0 && !activeClassId) {
            const timer = setTimeout(() => setActiveClassId(classes[0].id), 0);
            return () => clearTimeout(timer);
        }
    }, [classes, activeClassId]);

    const mutationOptions = {
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['students'] });
            queryClient.invalidateQueries({ queryKey: ['classes'] });
        },
        onError: (error: Error) => toast.error(`Error: ${error.message}`),
    };

    const { mutate: addStudent, isPending: isAddingStudent } = useMutation({
        mutationFn: async (newStudent: Database['public']['Tables']['students']['Insert']) => { const { error } = await supabase.from('students').insert([newStudent]); if (error) throw error; },
        ...mutationOptions,
        onSuccess: () => {
            mutationOptions.onSuccess();
            toast.success("Siswa berhasil ditambahkan.");
            setIsStudentModalOpen(false);
            // Trigger celebration confetti!
            setTimeout(() => triggerSuccessConfetti(), 300);
        },
    });

    const { mutate: updateStudent, isPending: isUpdatingStudent } = useMutation({
        mutationFn: async ({ id, ...updateData }: { id: string } & Database['public']['Tables']['students']['Update']) => { const { error } = await supabase.from('students').update(updateData).eq('id', id); if (error) throw error; },
        ...mutationOptions,
        onSuccess: () => { mutationOptions.onSuccess(); toast.success("Siswa berhasil diperbarui."); setIsStudentModalOpen(false); },
    });

    const { mutate: deleteStudent, isPending: isDeletingStudent } = useMutation({
        mutationFn: async (studentId: string) => {
            // Revert to hard delete as 'deleted_at' doesn't exist in type
            const { error } = await supabase.from('students').delete().eq('id', studentId);
            if (error) throw error;
        },
        ...mutationOptions,
        onSuccess: () => { mutationOptions.onSuccess(); toast.success("Siswa berhasil dihapus. Lihat Sampah untuk memulihkan."); setConfirmModalState(prev => ({ ...prev, isOpen: false })); },
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
        mutationFn: async (classId: string) => {
            // Use hard delete
            const { error } = await supabase.from('classes').delete().eq('id', classId);
            if (error) throw error;
        },
        ...mutationOptions,
        onSuccess: () => { mutationOptions.onSuccess(); toast.success("Kelas berhasil dihapus. Lihat Sampah untuk memulihkan."); setConfirmModalState(prev => ({ ...prev, isOpen: false })); },
    });

    const { mutate: generateBulkCodes, isPending: isGeneratingBulkCodes } = useMutation({
        mutationFn: async (classId: string) => {
            const studentsInClass = students.filter(s => s.class_id === classId);
            const studentsToUpdate = studentsInClass.filter(s => !s.access_code);
            if (studentsToUpdate.length === 0) return { message: "Semua siswa di kelas ini sudah memiliki kode akses." };

            await Promise.all(studentsToUpdate.map(async (s) => {
                const { error } = await supabase.from('students').update({ access_code: generateAccessCode() }).eq('id', s.id);
                if (error) throw error;
            }));
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
        // Students are already filtered by activeClassId from the query
        let filtered = students;

        if (deferredSearchTerm) {
            const lowerTerm = deferredSearchTerm.toLowerCase();
            filtered = filtered.filter(student =>
                student.name.toLowerCase().includes(lowerTerm) ||
                (student.access_code && student.access_code.toLowerCase().includes(lowerTerm))
            );
        }

        if (genderFilter !== 'all') {
            filtered = filtered.filter(student => student.gender === genderFilter);
        }

        if (accessCodeFilter !== 'all') {
            if (accessCodeFilter === 'has_code') {
                filtered = filtered.filter(student => !!student.access_code);
            } else {
                filtered = filtered.filter(student => !student.access_code);
            }
        }

        return filtered.sort((a, b) => {
            const aValue = a[sortConfig.key as keyof StudentRow];
            const bValue = b[sortConfig.key as keyof StudentRow];

            if (aValue === bValue) return 0;
            if (aValue === null || aValue === undefined) return 1;
            if (bValue === null || bValue === undefined) return -1;

            const comparison = String(aValue).localeCompare(String(bValue), 'id-ID', { numeric: true });
            return sortConfig.direction === 'asc' ? comparison : -comparison;
        });
    }, [deferredSearchTerm, students, sortConfig, genderFilter, accessCodeFilter]);

    const handleSort = (key: string) => {
        setSortConfig(current => ({
            key,
            direction: current.key === key && current.direction === 'asc' ? 'desc' : 'asc'
        }));
    };


    const [isIDCardModalOpen, setIsIDCardModalOpen] = useState(false);
    const [isBulkMoveModalOpen, setIsBulkMoveModalOpen] = useState(false);
    const [isImportFromTeacherModalOpen, setIsImportFromTeacherModalOpen] = useState(false);

    const { selectedItems, toggleItem, toggleAll, isAllSelected, isSelected, selectedCount, clearSelection } = useBulkSelection(studentsForActiveClass);

    const { mutate: bulkMoveStudents, isPending: isMovingStudents } = useMutation({
        mutationFn: async ({ studentIds, targetClassId }: { studentIds: string[], targetClassId: string }) => {
            const { error } = await supabase.from('students').update({ class_id: targetClassId }).in('id', studentIds);
            if (error) throw error;
        },
        ...mutationOptions,
        onSuccess: () => {
            mutationOptions.onSuccess();
            toast.success("Siswa berhasil dipindahkan.");
            setIsBulkMoveModalOpen(false);
            clearSelection();
        }
    });

    const handleBulkDelete = async (ids: string[]) => {
        setConfirmModalState({
            isOpen: true,
            title: 'Hapus Siswa Terpilih',
            message: `Apakah Anda yakin ingin menghapus ${ids.length} siswa terpilih secara permanen?`,
            onConfirm: async () => {
                try {
                    // Execute sequentially to avoid overloading or concurrent issues
                    for (const id of ids) {
                        await deleteStudent(id);
                    }
                    clearSelection();
                    setConfirmModalState(prev => ({ ...prev, isOpen: false }));
                    toast.success(`${ids.length} siswa berhasil dihapus.`);
                } catch {
                    toast.error("Gagal menghapus beberapa siswa.");
                }
            },
            confirmVariant: 'destructive',
            confirmText: `Hapus ${ids.length} Siswa`
        });
    };

    const handleBulkExport = (ids: string[]) => {
        const selectedStudents = studentsForActiveClass.filter(s => ids.includes(s.id));
        if (selectedStudents.length === 0) {
            toast.warning("Tidak ada siswa terpilih untuk diekspor.");
            return;
        }

        const currentClassName = classes.find(c => c.id === activeClassId)?.name || 'Terpilih';
        const dataToExport = selectedStudents.map((student, index) => ({
            'No': index + 1,
            'Nama Lengkap': student.name,
            'Jenis Kelamin': student.gender,
            'Kelas': currentClassName,
            'Kode Akses': student.access_code || 'Belum Ada'
        }));

        exportToExcel(dataToExport, `Data_Siswa_Terpilih_${currentClassName}`, `Data Siswa Terpilih - ${currentClassName}`);
        toast.success(`${selectedStudents.length} siswa berhasil diekspor!`);
        clearSelection();
    };

    const handleBulkGenerateCodes = async (ids: string[]) => {
        const studentsNeedCode = studentsForActiveClass.filter(s => ids.includes(s.id) && !s.access_code);

        if (studentsNeedCode.length === 0) {
            toast.info("Semua siswa terpilih sudah memiliki kode akses.");
            return;
        }

        setConfirmModalState({
            isOpen: true,
            title: 'Buat Kode Akses Massal',
            message: `Ini akan membuat kode akses untuk ${studentsNeedCode.length} siswa yang belum memiliki kode. Lanjutkan?`,
            onConfirm: async () => {
                try {
                    // Replaced upsert mapping with update logic below

                    await Promise.all(studentsNeedCode.map(async (s) => {
                        const { error } = await supabase.from('students').update({ access_code: generateAccessCode() }).eq('id', s.id);
                        if (error) throw error;
                    }));

                    queryClient.invalidateQueries({ queryKey: ['students'] });
                    toast.success(`${studentsNeedCode.length} kode akses baru berhasil dibuat!`);
                    clearSelection();
                    setConfirmModalState(prev => ({ ...prev, isOpen: false }));
                } catch (error: unknown) {
                    toast.error(`Gagal membuat kode: ${error instanceof Error ? error.message : String(error)}`);
                }
            },
            confirmVariant: 'default',
            confirmText: `Buat ${studentsNeedCode.length} Kode`
        });
    };

    const bulkActions = [
        {
            id: 'export',
            label: 'Ekspor',
            icon: <DownloadCloudIcon className="w-4 h-4" />,
            variant: 'default' as const,
            onClick: handleBulkExport
        },
        {
            id: 'generate_codes',
            label: 'Buat Kode',
            icon: <KeyRoundIcon className="w-4 h-4" />,
            variant: 'default' as const,
            onClick: handleBulkGenerateCodes
        },
        {
            id: 'print_ids',
            label: 'Cetak Kartu',
            icon: <PrinterIcon className="w-4 h-4" />,
            variant: 'default' as const,
            onClick: () => setIsIDCardModalOpen(true)
        },
        {
            id: 'move_class',
            label: 'Pindah Kelas',
            icon: <ArrowRightIcon className="w-4 h-4" />,
            variant: 'default' as const,
            onClick: () => setIsBulkMoveModalOpen(true)
        },
        {
            id: 'delete',
            label: 'Hapus',
            icon: <TrashIcon className="w-4 h-4" />,
            variant: 'danger' as const,
            onClick: handleBulkDelete
        }
    ];


    const handleOpenStudentModal = (mode: 'add' | 'edit', student: StudentRow | null = null) => {
        if (classes.length === 0) { toast.warning("Silakan tambah data kelas terlebih dahulu sebelum menambah siswa."); return; }
        setStudentModalMode(mode);
        setCurrentStudent(student);
        setGenderSelection(student?.gender ?? 'Laki-laki');
        setIsStudentModalOpen(true);
    };

    const handleStudentFormSubmit = (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault(); if (!user) return;
        const formData = new FormData(e.currentTarget);
        const name = formData.get('name') as string;
        const class_id = formData.get('class_id') as string;
        const gender = genderSelection;
        const bgColor = gender === 'Laki-laki' ? 'b6e3f4' : 'ffd5dc'; const avatar_url = `https://api.dicebear.com/7.x/adventurer/svg?seed=${encodeURIComponent(name || Date.now())}&backgroundColor=${bgColor}`;

        if (studentModalMode === 'add') {
            const className = classes.find(c => c.id === class_id)?.name || '';
            const newStudentData: Database['public']['Tables']['students']['Insert'] = {
                name,
                class_id,
                user_id: user.id,
                gender,
                avatar_url,
                address: '',
                class: className,
                contact: '',
                date_of_birth: new Date().toISOString().split('T')[0],
                email: '',
                guardian_name: '',
                nis: '',
                nisn: '',
                photo_url: avatar_url || ''
            };
            addStudent(newStudentData);
        } else if (currentStudent) {
            const newAvatarUrl = (currentStudent.gender !== gender || (currentStudent.avatar_url && currentStudent.avatar_url.includes('pravatar'))) ? avatar_url : currentStudent.avatar_url;
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
            addClass({
                name: classNameInput,
                teacher_id: user.id,
                academic_year: `${new Date().getFullYear()}/${new Date().getFullYear() + 1}`,
                grade_level: 1
            });
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

    const handleExportStudents = () => {
        if (studentsForActiveClass.length === 0) {
            toast.warning("Tidak ada data siswa untuk diekspor.");
            return;
        }
        setIsExportModalOpen(true);
    };

    const handleExportConfirm = (format: ExportFormat, selectedColumns: string[]) => {
        const currentClassName = classes.find(c => c.id === activeClassId)?.name || 'Semua Kelas';

        // Map data based on selected columns
        // This is a simplified mapping, ideally we map keys dynamically
        const dataToExport = studentsForActiveClass.map((student, index) => {
            const row: Record<string, string | number | boolean | null | undefined> = {};
            // We construct the full object then filter? 
            // Or better, we just construct what's needed.
            // For simplicity, let's construct the standard object and let the export utility handle it if possible,
            // or just filter here.

            // Key mapping
            const map: Record<string, string | number | boolean | null | undefined> = {
                'name': student.name,
                'gender': student.gender,
                'class_id': classes.find(c => c.id === student.class_id)?.name || '-',
                'access_code': student.access_code || 'Belum Ada'
            };

            // Add No if requested or always? Standard export usually has No.
            row['No'] = index + 1;

            selectedColumns.forEach(col => {
                const label = col === 'class_id' ? 'Kelas' : (col === 'access_code' ? 'Kode Akses' : (col === 'name' ? 'Nama Lengkap' : 'Jenis Kelamin'));
                // We need to match existing exportToExcel structure which expects specific keys usually
                // But exportToExcel (from context) takes an array of objects.

                if (map[col as string]) {
                    row[label] = map[col as string];
                }
            });

            return row;
        });

        if (format === 'xlsx' || format === 'csv') {
            exportToExcel(dataToExport, `Data_Siswa_${currentClassName.replace(/\s+/g, '_')}`, `Data Siswa - ${currentClassName}`);
            toast.success(`Data siswa berhasil diekspor ke ${format.toUpperCase()}!`);
        } else {
            toast.info(`Format ${format.toUpperCase()} belum didukung sepenuhnya, menggunakan Excel.`);
            exportToExcel(dataToExport, `Data_Siswa_${currentClassName.replace(/\s+/g, '_')}`, `Data Siswa - ${currentClassName}`);
        }
    };

    const handleImportStudents = async (validRows: ParsedRow[]) => {
        if (!user) throw new Error("User not authenticated");

        // Map parsed rows to student insert format
        const studentsToInsert = validRows.map(row => {
            const gender = row.data.gender as 'Laki-laki' | 'Perempuan';
            const bgColor = gender === 'Laki-laki' ? 'b6e3f4' : 'ffd5dc';
            const avatarUrl = `https://api.dicebear.com/7.x/adventurer/svg?seed=${encodeURIComponent(String(row.data.name || Date.now()))}&backgroundColor=${bgColor}`;

            // Find class ID from class name if provided
            let classId = activeClassId;
            if (row.data.class_name && typeof row.data.class_name === 'string') {
                const matchedClass = classes.find(c =>
                    c.name.toLowerCase() === String(row.data.class_name).toLowerCase()
                );
                if (matchedClass) classId = matchedClass.id;
            }

            return {
                name: String(row.data.name || ''),
                gender: gender,
                class_id: classId,
                user_id: user.id,
                avatar_url: avatarUrl,
                access_code: row.data.access_code ? String(row.data.access_code) : undefined,
                address: '',
                class: classId ? classes.find(c => c.id === classId)?.name || '' : '',
                contact: '',
                date_of_birth: new Date().toISOString().split('T')[0],
                email: '',
                guardian_name: '',
                nis: '',
                nisn: '',
                photo_url: avatarUrl
            };
        });

        const { error } = await supabase.from('students').insert(studentsToInsert);
        if (error) throw error;

        queryClient.invalidateQueries({ queryKey: ['students'] });
        toast.success(`${studentsToInsert.length} siswa berhasil diimport!`);
        setIsImportModalOpen(false);
    };

    if (isLoading) return <StudentsPageSkeleton />;

    const handleStudentAction = (student: StudentRow, action: 'view' | 'edit' | 'delete' | 'menu') => {
        if (action === 'edit') {
            handleOpenStudentModal('edit', student);
        } else if (action === 'delete') {
            handleDeleteStudentClick(student);
        } else if (action === 'menu') {
            setSelectedStudentForActions(student);
        }
    };

    const outlineActionClasses = 'h-11 px-3 sm:px-4 rounded-xl bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 hover:border-emerald-300 dark:hover:border-emerald-600 shadow-sm';
    const primaryActionClasses = 'h-11 px-4 rounded-xl shadow-lg shadow-emerald-500/20 bg-emerald-600 hover:bg-emerald-700 text-white border-none';
    const overflowTriggerClasses = 'h-11 w-11 p-0 rounded-xl items-center bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 shadow-sm';

    return (
        <div className="w-full min-h-full p-3 sm:p-4 md:p-6 lg:p-8 flex flex-col space-y-4 sm:space-y-6 max-w-7xl mx-auto pb-24 lg:pb-8 animate-fade-in-up">
            <header className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                <div>
                    <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-gray-900 dark:text-white font-serif">Manajemen Siswa</h1>
                    <p className="mt-2 text-gray-600 dark:text-gray-400">Kelola data siswa, kelas, dan kode akses.</p>
                </div>
                <div className="flex items-center gap-3">
                    {/* Desktop: show all actions */}
                    <div className="hidden lg:flex items-center gap-3">
                        <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setIsImportFromTeacherModalOpen(true)}
                            className={outlineActionClasses}
                            title="Import data kelas & siswa dari guru lain"
                        >
                            <UsersIcon className="w-4 h-4 mr-2" />Import Guru
                        </Button>
                        <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setIsImportModalOpen(true)}
                            className={outlineActionClasses}
                            title="Import data siswa dari file Excel"
                        >
                            <UploadCloudIcon className="w-4 h-4 mr-2" />Import Excel
                        </Button>
                        <Button
                            size="sm"
                            variant="outline"
                            onClick={handleExportStudents}
                            className={outlineActionClasses}
                        >
                            <DownloadCloudIcon className="w-4 h-4 mr-2" /> Export
                        </Button>
                        <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setIsClassManageModalOpen(true)}
                            className={outlineActionClasses}
                        >
                            <PencilIcon className="w-4 h-4 mr-2" /> Kelola Kelas
                        </Button>
                        <Button
                            size="sm"
                            onClick={() => handleOpenStudentModal('add')}
                            className={primaryActionClasses}
                        >
                            <PlusIcon className="w-4 h-4 mr-2" /> Siswa Baru
                        </Button>
                    </div>

                    {/* Tablet: 3 primary + overflow */}
                    <div className="hidden sm:flex lg:hidden items-center gap-3">
                        <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setIsImportModalOpen(true)}
                            className={outlineActionClasses}
                            title="Import data siswa dari file Excel"
                        >
                            <UploadCloudIcon className="w-4 h-4 mr-2" />Import Excel
                        </Button>
                        <Button
                            size="sm"
                            variant="outline"
                            onClick={handleExportStudents}
                            className={outlineActionClasses}
                        >
                            <DownloadCloudIcon className="w-4 h-4 mr-2" /> Export
                        </Button>
                        <Button
                            size="sm"
                            onClick={() => handleOpenStudentModal('add')}
                            className={primaryActionClasses}
                        >
                            <PlusIcon className="w-4 h-4 mr-2" /> Siswa Baru
                        </Button>
                        <DropdownMenu>
                            <DropdownTrigger className={overflowTriggerClasses}>
                                <MoreVerticalIcon className="w-5 h-5" />
                                <span className="sr-only">Menu tindakan</span>
                            </DropdownTrigger>
                            <DropdownContent align="right">
                                <DropdownItem icon={<UsersIcon className="w-4 h-4" />} onClick={() => setIsImportFromTeacherModalOpen(true)}>
                                    Import Guru
                                </DropdownItem>
                                <DropdownItem icon={<PencilIcon className="w-4 h-4" />} onClick={() => setIsClassManageModalOpen(true)}>
                                    Kelola Kelas
                                </DropdownItem>
                            </DropdownContent>
                        </DropdownMenu>
                    </div>

                    {/* Mobile: primary + overflow */}
                    <div className="flex sm:hidden items-center gap-3">
                        <Button
                            size="sm"
                            onClick={() => handleOpenStudentModal('add')}
                            className={primaryActionClasses}
                        >
                            <PlusIcon className="w-4 h-4 mr-2" /> Siswa Baru
                        </Button>
                        <DropdownMenu>
                            <DropdownTrigger className={overflowTriggerClasses}>
                                <MoreVerticalIcon className="w-5 h-5" />
                                <span className="sr-only">Menu tindakan</span>
                            </DropdownTrigger>
                            <DropdownContent align="right">
                                <DropdownItem icon={<UsersIcon className="w-4 h-4" />} onClick={() => setIsImportFromTeacherModalOpen(true)}>
                                    Import Guru
                                </DropdownItem>
                                <DropdownItem icon={<UploadCloudIcon className="w-4 h-4" />} onClick={() => setIsImportModalOpen(true)}>
                                    Import Excel
                                </DropdownItem>
                                <DropdownItem icon={<DownloadCloudIcon className="w-4 h-4" />} onClick={handleExportStudents}>
                                    Export
                                </DropdownItem>
                                <DropdownItem icon={<PencilIcon className="w-4 h-4" />} onClick={() => setIsClassManageModalOpen(true)}>
                                    Kelola Kelas
                                </DropdownItem>
                            </DropdownContent>
                        </DropdownMenu>
                    </div>
                </div>
            </header>

            <div className="space-y-6">
                {/* Search and Filters */}
                <StudentFilters
                    searchTerm={searchTerm}
                    onSearchChange={setSearchTerm}
                    viewMode={viewMode}
                    onViewModeChange={setViewMode}
                    genderFilter={genderFilter}
                    onGenderFilterChange={setGenderFilter}
                    accessCodeFilter={accessCodeFilter}
                    onAccessCodeFilterChange={setAccessCodeFilter}
                />

                {/* Class Tabs */}
                <Tabs value={activeClassId} onValueChange={setActiveClassId} className="w-full">
                    <div className="mb-6 overflow-x-auto pb-2 scrollbar-hide">
                        <TabsList className="bg-transparent p-0 gap-2 flex h-auto w-max">
                            {classes.map(c => (
                                <TabsTrigger
                                    key={c.id}
                                    value={c.id}
                                    className="data-[state=active]:bg-emerald-600 data-[state=active]:text-white dark:data-[state=active]:bg-emerald-500 dark:data-[state=active]:text-white bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-gray-700 rounded-full px-5 py-3 min-h-[44px] text-sm font-semibold transition-all shadow-sm hover:bg-gray-50 dark:hover:bg-gray-700"
                                >
                                    {c.name}
                                </TabsTrigger>
                            ))}
                        </TabsList>
                    </div>

                    {classes.map(c => (
                        <TabsContent key={c.id} value={c.id} className="mt-0 focus:outline-none">
                            <div className="flex items-center justify-between mb-4 px-1">
                                <p className="text-sm text-gray-500 dark:text-gray-400">
                                    Menampilkan <span className="font-bold text-gray-900 dark:text-white">{studentsForActiveClass.length}</span> siswa
                                    {searchTerm && ` untuk pencarian "${searchTerm}"`}
                                </p>
                                {studentsForActiveClass.length > 0 && viewMode === 'list' && (
                                    <span className="hidden lg:inline-block text-xs text-gray-400 italic">
                                        *Klik header tabel untuk mengurutkan (segera hadir)
                                    </span>
                                )}
                            </div>

                            {studentsForActiveClass.length === 0 ? (
                                <div className="flex flex-col items-center justify-center py-20 sm:py-24 px-4 text-center animate-fade-in bg-white dark:bg-gray-800/50 rounded-3xl border border-dashed border-gray-200 dark:border-gray-700">
                                    <div className="relative mb-6">
                                        <span className="absolute -top-3 -left-4 w-10 h-10 bg-emerald-100/70 dark:bg-emerald-900/30 rounded-full blur-sm" />
                                        <span className="absolute -bottom-3 -right-5 w-12 h-12 bg-sky-100/70 dark:bg-sky-900/20 rounded-full blur-sm" />
                                        <div className="relative w-20 h-20 bg-emerald-50 dark:bg-emerald-900/20 rounded-2xl flex items-center justify-center">
                                            <UsersIcon className="w-9 h-9 text-emerald-400 dark:text-emerald-300" />
                                        </div>
                                    </div>
                                    <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Tidak Ada Data Siswa</h3>
                                    <p className="text-gray-500 dark:text-gray-400 max-w-md mx-auto mb-6">
                                        Belum ada siswa di kelas ini atau tidak ada yang cocok dengan filter pencarian Anda.
                                    </p>
                                    <Button onClick={() => handleOpenStudentModal('add')} className="rounded-xl shadow-lg shadow-emerald-500/20 bg-emerald-600 hover:bg-emerald-700 text-white">
                                        <PlusIcon className="w-4 h-4 mr-2" /> Tambah Siswa Baru
                                    </Button>
                                </div>
                            ) : (
                                <>
                                    {viewMode === 'grid' ? (
                                        <StudentGrid
                                            students={studentsForActiveClass}
                                            isSelected={isSelected}
                                            toggleItem={toggleItem}
                                            onAction={handleStudentAction}
                                        />
                                    ) : (
                                        <StudentTable
                                            students={studentsForActiveClass}
                                            isSelected={isSelected}
                                            toggleItem={toggleItem}
                                            isAllSelected={isAllSelected}
                                            toggleAll={toggleAll}
                                            onAction={handleStudentAction}
                                            sortConfig={sortConfig}
                                            onSort={handleSort}
                                        />
                                    )}
                                </>
                            )}
                        </TabsContent>
                    ))}
                </Tabs>
            </div>

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
                            <div className="w-10 h-10 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
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
                <form onSubmit={handleStudentFormSubmit} className="space-y-5">
                    <div>
                        <label htmlFor="student-name" className="text-sm font-medium text-gray-700 dark:text-gray-300">Nama Lengkap</label>
                        <Input id="student-name" name="name" defaultValue={currentStudent?.name || ''} required />
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                            <label htmlFor="student-class" className="text-sm font-medium text-gray-700 dark:text-gray-300">Kelas</label>
                            <Select id="student-class" name="class_id" defaultValue={currentStudent?.class_id || activeClassId} required>
                                {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                            </Select>
                        </div>
                        <div>
                            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Jenis Kelamin</label>
                            <div className="grid grid-cols-2 gap-3 mt-2">
                                <label className={`flex items-center justify-center gap-3 p-3 rounded-xl border-2 cursor-pointer transition-all ${genderSelection === 'Laki-laki'
                                    ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-900/20'
                                    : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                                    }`}>
                                    <input
                                        type="radio"
                                        name="gender"
                                        value="Laki-laki"
                                        checked={genderSelection === 'Laki-laki'}
                                        onChange={() => setGenderSelection('Laki-laki')}
                                        className="sr-only"
                                    />
                                    <span className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${genderSelection === 'Laki-laki'
                                        ? 'bg-emerald-500 text-white'
                                        : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
                                        }`}>L</span>
                                    <span className="text-sm font-medium text-gray-800 dark:text-gray-200">Laki-laki</span>
                                </label>
                                <label className={`flex items-center justify-center gap-3 p-3 rounded-xl border-2 cursor-pointer transition-all ${genderSelection === 'Perempuan'
                                    ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-900/20'
                                    : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                                    }`}>
                                    <input
                                        type="radio"
                                        name="gender"
                                        value="Perempuan"
                                        checked={genderSelection === 'Perempuan'}
                                        onChange={() => setGenderSelection('Perempuan')}
                                        className="sr-only"
                                    />
                                    <span className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${genderSelection === 'Perempuan'
                                        ? 'bg-emerald-500 text-white'
                                        : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
                                        }`}>P</span>
                                    <span className="text-sm font-medium text-gray-800 dark:text-gray-200">Perempuan</span>
                                </label>
                            </div>
                        </div>
                    </div>
                    <div className="flex justify-end gap-2 pt-4">
                        <Button type="button" variant="ghost" onClick={() => setIsStudentModalOpen(false)}>Batal</Button>
                        <Button type="submit" disabled={isAddingStudent || isUpdatingStudent}>{isAddingStudent || isUpdatingStudent ? 'Menyimpan...' : 'Simpan'}</Button>
                    </div>
                </form>
            </Modal>

            {/* Class Management Modals */}
            <Modal isOpen={isClassManageModalOpen} onClose={() => setIsClassManageModalOpen(false)} title="Kelola Kelas">
                <div className="space-y-3 max-h-80 overflow-y-auto pr-2">
                    {classes.map(c => (
                        <div key={c.id} className="flex items-center justify-between p-3 rounded-lg bg-gray-100 dark:bg-black/20">
                            <span className="font-semibold">{c.name}</span>
                            <div className="flex items-center gap-1">
                                <Button size="icon" variant="ghost" className="h-10 w-10" onClick={() => { setIsClassManageModalOpen(false); handleGenerateCodesClick(c); }} title="Buat kode akses massal"><KeyRoundIcon className="h-4 w-4 text-emerald-500" /></Button>
                                <Button size="icon" variant="ghost" className="h-10 w-10" onClick={() => { setIsClassManageModalOpen(false); handleOpenClassModal('edit', c); }}><PencilIcon className="h-4 w-4" /></Button>
                                <Button size="icon" variant="ghost" className="h-10 w-10 text-red-500" onClick={() => handleDeleteClassClick(c)}><TrashIcon className="h-4 w-4" /></Button>
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
            <BulkActionBar
                selectedCount={selectedCount}
                actions={bulkActions}
                onClear={clearSelection}
            />

            <ExportPreviewModal
                isOpen={isExportModalOpen}
                onClose={() => setIsExportModalOpen(false)}
                data={studentsForActiveClass}
                columns={[
                    { key: 'name', label: 'Nama Lengkap' },
                    { key: 'gender', label: 'Jenis Kelamin' },
                    { key: 'class_id', label: 'Kelas' }, // We'll map value during export
                    { key: 'access_code', label: 'Kode Akses' }
                ]}
                onExport={handleExportConfirm}
                title="Ekspor Data Siswa"
            />

            <ImportModal
                isOpen={isImportModalOpen}
                onClose={() => setIsImportModalOpen(false)}
                onImport={handleImportStudents}
                title="Import Data Siswa"
            />

            <IDCardPrintModal
                isOpen={isIDCardModalOpen}
                onClose={() => setIsIDCardModalOpen(false)}
                students={studentsForActiveClass.filter(s => isSelected(s.id))}
                classes={classes}
            />

            <BulkMoveModal
                isOpen={isBulkMoveModalOpen}
                onClose={() => setIsBulkMoveModalOpen(false)}
                onAttributesConfirm={(targetClassId) => bulkMoveStudents({ studentIds: Array.from(selectedItems), targetClassId })}
                classes={classes}
                studentCount={selectedCount}
                currentClassId={activeClassId}
                isMoving={isMovingStudents}
            />

            <ImportFromTeacherModal
                isOpen={isImportFromTeacherModalOpen}
                onClose={() => setIsImportFromTeacherModalOpen(false)}
            />
        </div>
    );
};

export default StudentsPage;
