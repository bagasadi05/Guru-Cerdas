import React, { useState } from 'react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { supabase } from '../../services/supabase';
import { useToast } from '../../hooks/useToast';
import { useAuth } from '../../hooks/useAuth';
import { useQueryClient } from '@tanstack/react-query';
import { UsersIcon, SearchIcon, CheckCircleIcon, CopyIcon, GraduationCapIcon, AlertCircleIcon, SparklesIcon } from '../Icons';
import { Database } from '../../services/database.types';

type ClassRow = Database['public']['Tables']['classes']['Row'];
type StudentRow = Database['public']['Tables']['students']['Row'];

interface TeacherData {
    user_id: string;
    full_name: string | null;
    email: string | null;
}

interface ClassWithStudents extends ClassRow {
    students: StudentRow[];
}

interface ImportFromTeacherModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export const ImportFromTeacherModal: React.FC<ImportFromTeacherModalProps> = ({ isOpen, onClose }) => {
    const toast = useToast();
    const { user } = useAuth();
    const queryClient = useQueryClient();

    const [step, setStep] = useState<'search' | 'select' | 'confirm' | 'importing'>('search');
    const [searchEmail, setSearchEmail] = useState('');
    const [isSearching, setIsSearching] = useState(false);
    const [foundTeacher, setFoundTeacher] = useState<TeacherData | null>(null);
    const [teacherClasses, setTeacherClasses] = useState<ClassWithStudents[]>([]);
    const [selectedClasses, setSelectedClasses] = useState<Set<string>>(new Set());
    const [isImporting, setIsImporting] = useState(false);
    const [importProgress, setImportProgress] = useState(0);

    const resetState = () => {
        setStep('search');
        setSearchEmail('');
        setFoundTeacher(null);
        setTeacherClasses([]);
        setSelectedClasses(new Set());
        setIsImporting(false);
        setImportProgress(0);
    };

    const handleClose = () => {
        resetState();
        onClose();
    };

    const handleSearch = async () => {
        if (!searchEmail.trim()) {
            toast.warning("Masukkan email guru terlebih dahulu.");
            return;
        }

        if (searchEmail.trim().toLowerCase() === user?.email?.toLowerCase()) {
            toast.error("Anda tidak dapat mengimport data dari akun Anda sendiri.");
            return;
        }

        setIsSearching(true);

        try {
            // Search for teacher by email in user_roles table
            const { data: teacherData, error: teacherError } = await supabase
                .from('user_roles')
                .select('user_id, full_name, email')
                .eq('email', searchEmail.trim().toLowerCase())
                .single();

            if (teacherError || !teacherData) {
                toast.error("Guru dengan email tersebut tidak ditemukan. Pastikan email sudah terdaftar di sistem.");
                setIsSearching(false);
                return;
            }

            setFoundTeacher(teacherData);

            // Fetch classes owned by this teacher
            const { data: classesData, error: classesError } = await supabase
                .from('classes')
                .select('*')
                .eq('user_id', teacherData.user_id)
                .order('name');

            if (classesError) throw classesError;

            if (!classesData || classesData.length === 0) {
                toast.warning("Guru ini belum memiliki data kelas.");
                setIsSearching(false);
                return;
            }

            // Fetch students for each class
            const { data: studentsData, error: studentsError } = await supabase
                .from('students')
                .select('*')
                .eq('user_id', teacherData.user_id)
                .is('deleted_at', null);

            if (studentsError) throw studentsError;

            const classesWithStudents: ClassWithStudents[] = classesData.map(cls => ({
                ...cls,
                students: (studentsData || []).filter(s => s.class_id === cls.id)
            }));

            setTeacherClasses(classesWithStudents);
            setStep('select');
        } catch (error: any) {
            console.error('Search error:', error);
            toast.error(`Gagal mencari data: ${error.message}`);
        } finally {
            setIsSearching(false);
        }
    };

    const toggleClassSelection = (classId: string) => {
        setSelectedClasses(prev => {
            const newSet = new Set(prev);
            if (newSet.has(classId)) {
                newSet.delete(classId);
            } else {
                newSet.add(classId);
            }
            return newSet;
        });
    };

    const selectAllClasses = () => {
        setSelectedClasses(new Set(teacherClasses.map(c => c.id)));
    };

    const deselectAllClasses = () => {
        setSelectedClasses(new Set());
    };

    const getSelectedStudentCount = () => {
        return teacherClasses
            .filter(c => selectedClasses.has(c.id))
            .reduce((sum, c) => sum + c.students.length, 0);
    };

    const handleImport = async () => {
        if (!user || selectedClasses.size === 0) return;

        setStep('importing');
        setIsImporting(true);
        setImportProgress(0);

        try {
            const selectedClassList = teacherClasses.filter(c => selectedClasses.has(c.id));
            const totalItems = selectedClassList.length + getSelectedStudentCount();
            let processedItems = 0;

            // Create class mapping (old ID -> new ID)
            const classIdMap = new Map<string, string>();

            // Step 1: Create new classes for current user
            for (const classData of selectedClassList) {
                const newClassId = crypto.randomUUID();
                classIdMap.set(classData.id, newClassId);

                const { error } = await supabase.from('classes').insert({
                    id: newClassId,
                    name: classData.name,
                    user_id: user.id
                });

                if (error) throw error;
                processedItems++;
                setImportProgress(Math.round((processedItems / totalItems) * 100));
            }

            // Step 2: Create new students for current user
            for (const classData of selectedClassList) {
                const newClassId = classIdMap.get(classData.id)!;

                for (const student of classData.students) {
                    const { error } = await supabase.from('students').insert({
                        name: student.name,
                        gender: student.gender,
                        avatar_url: student.avatar_url,
                        class_id: newClassId,
                        user_id: user.id,
                        parent_name: student.parent_name,
                        parent_phone: student.parent_phone,
                        // Don't copy access_code - each teacher should generate their own
                    });

                    if (error) throw error;
                    processedItems++;
                    setImportProgress(Math.round((processedItems / totalItems) * 100));
                }
            }

            // Invalidate queries to refresh data
            queryClient.invalidateQueries({ queryKey: ['studentsPageData'] });

            toast.success(`Berhasil mengimport ${selectedClasses.size} kelas dan ${getSelectedStudentCount()} siswa!`);
            handleClose();
        } catch (error: any) {
            console.error('Import error:', error);
            toast.error(`Gagal mengimport data: ${error.message}`);
            setStep('select');
        } finally {
            setIsImporting(false);
        }
    };

    return (
        <Modal isOpen={isOpen} onClose={handleClose} title="Import Data dari Guru Lain">
            <div className="space-y-6">
                {step === 'search' && (
                    <>
                        <div className="text-center p-6 bg-gradient-to-br from-indigo-50 to-purple-50 dark:from-indigo-900/20 dark:to-purple-900/20 rounded-2xl border border-indigo-100 dark:border-indigo-800/30">
                            <div className="w-16 h-16 bg-indigo-100 dark:bg-indigo-900/50 rounded-2xl flex items-center justify-center mx-auto mb-4">
                                <CopyIcon className="w-8 h-8 text-indigo-600 dark:text-indigo-400" />
                            </div>
                            <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-2">Import Data Kelas & Siswa</h3>
                            <p className="text-sm text-slate-600 dark:text-slate-400">
                                Salin data kelas dan siswa dari guru lain yang sudah menggunakan aplikasi ini.
                                Data akan disalin ke akun Anda dengan ID baru.
                            </p>
                        </div>

                        <div className="space-y-2">
                            <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300">
                                Email Guru
                            </label>
                            <div className="relative">
                                <Input
                                    type="email"
                                    value={searchEmail}
                                    onChange={(e) => setSearchEmail(e.target.value)}
                                    placeholder="contoh@sekolah.sch.id"
                                    className="pr-12"
                                    onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                                />
                                <button
                                    onClick={handleSearch}
                                    disabled={isSearching}
                                    className="absolute right-2 top-1/2 -translate-y-1/2 p-2 rounded-lg bg-indigo-100 dark:bg-indigo-900/50 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-200 dark:hover:bg-indigo-800/50 transition-colors"
                                >
                                    <SearchIcon className="w-4 h-4" />
                                </button>
                            </div>
                            <p className="text-xs text-slate-500 dark:text-slate-400">
                                Masukkan email guru yang datanya ingin Anda salin.
                            </p>
                        </div>

                        <div className="flex justify-end gap-2 pt-4">
                            <Button variant="ghost" onClick={handleClose}>Batal</Button>
                            <Button onClick={handleSearch} disabled={isSearching}>
                                {isSearching ? 'Mencari...' : 'Cari Guru'}
                            </Button>
                        </div>
                    </>
                )}

                {step === 'select' && foundTeacher && (
                    <>
                        {/* Teacher Info */}
                        <div className="flex items-center gap-4 p-4 bg-emerald-50 dark:bg-emerald-900/20 rounded-2xl border border-emerald-200 dark:border-emerald-800/30">
                            <div className="w-12 h-12 rounded-full bg-emerald-100 dark:bg-emerald-900/50 flex items-center justify-center">
                                <CheckCircleIcon className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
                            </div>
                            <div>
                                <p className="font-bold text-slate-800 dark:text-white">{foundTeacher.full_name || 'Guru'}</p>
                                <p className="text-sm text-slate-600 dark:text-slate-400">{foundTeacher.email}</p>
                            </div>
                        </div>

                        {/* Class Selection */}
                        <div>
                            <div className="flex items-center justify-between mb-3">
                                <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                                    Pilih Kelas untuk Di-import
                                </label>
                                <div className="flex gap-2">
                                    <button
                                        onClick={selectAllClasses}
                                        className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline"
                                    >
                                        Pilih Semua
                                    </button>
                                    <span className="text-slate-300 dark:text-slate-600">|</span>
                                    <button
                                        onClick={deselectAllClasses}
                                        className="text-xs text-slate-500 hover:underline"
                                    >
                                        Hapus Pilihan
                                    </button>
                                </div>
                            </div>

                            <div className="space-y-2 max-h-64 overflow-y-auto pr-2">
                                {teacherClasses.map(classData => (
                                    <label
                                        key={classData.id}
                                        className={`flex items-center gap-3 p-4 rounded-xl border cursor-pointer transition-all ${selectedClasses.has(classData.id)
                                                ? 'bg-indigo-50 dark:bg-indigo-900/20 border-indigo-300 dark:border-indigo-700'
                                                : 'bg-white dark:bg-slate-800/50 border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800'
                                            }`}
                                    >
                                        <input
                                            type="checkbox"
                                            checked={selectedClasses.has(classData.id)}
                                            onChange={() => toggleClassSelection(classData.id)}
                                            className="w-5 h-5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                                        />
                                        <div className="flex-grow">
                                            <div className="flex items-center gap-2">
                                                <GraduationCapIcon className="w-4 h-4 text-indigo-500" />
                                                <span className="font-semibold text-slate-800 dark:text-white">{classData.name}</span>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-1 text-sm text-slate-500 dark:text-slate-400">
                                            <UsersIcon className="w-4 h-4" />
                                            <span>{classData.students.length} siswa</span>
                                        </div>
                                    </label>
                                ))}
                            </div>
                        </div>

                        {/* Summary */}
                        {selectedClasses.size > 0 && (
                            <div className="p-4 bg-amber-50 dark:bg-amber-900/20 rounded-xl border border-amber-200 dark:border-amber-800/30">
                                <div className="flex items-start gap-3">
                                    <AlertCircleIcon className="w-5 h-5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
                                    <div>
                                        <p className="text-sm font-medium text-amber-800 dark:text-amber-200">
                                            Akan mengimport {selectedClasses.size} kelas dan {getSelectedStudentCount()} siswa
                                        </p>
                                        <p className="text-xs text-amber-600 dark:text-amber-400 mt-1">
                                            Data akan disalin sebagai data baru di akun Anda. Kode akses siswa tidak akan disalin.
                                        </p>
                                    </div>
                                </div>
                            </div>
                        )}

                        <div className="flex justify-between gap-2 pt-4">
                            <Button variant="ghost" onClick={() => setStep('search')}>Kembali</Button>
                            <Button
                                onClick={handleImport}
                                disabled={selectedClasses.size === 0}
                                className="bg-indigo-600 hover:bg-indigo-700"
                            >
                                <SparklesIcon className="w-4 h-4 mr-2" />
                                Import {selectedClasses.size} Kelas
                            </Button>
                        </div>
                    </>
                )}

                {step === 'importing' && (
                    <div className="text-center py-8">
                        <div className="w-20 h-20 mx-auto mb-6 relative">
                            <svg className="w-full h-full transform -rotate-90">
                                <circle
                                    cx="40"
                                    cy="40"
                                    r="36"
                                    stroke="currentColor"
                                    strokeWidth="8"
                                    fill="none"
                                    className="text-slate-200 dark:text-slate-700"
                                />
                                <circle
                                    cx="40"
                                    cy="40"
                                    r="36"
                                    stroke="currentColor"
                                    strokeWidth="8"
                                    fill="none"
                                    strokeDasharray={`${2 * Math.PI * 36}`}
                                    strokeDashoffset={`${2 * Math.PI * 36 * (1 - importProgress / 100)}`}
                                    className="text-indigo-600 dark:text-indigo-400 transition-all duration-300"
                                    strokeLinecap="round"
                                />
                            </svg>
                            <div className="absolute inset-0 flex items-center justify-center">
                                <span className="text-lg font-bold text-slate-800 dark:text-white">{importProgress}%</span>
                            </div>
                        </div>
                        <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-2">Mengimport Data...</h3>
                        <p className="text-sm text-slate-600 dark:text-slate-400">
                            Mohon tunggu, sedang menyalin data kelas dan siswa ke akun Anda.
                        </p>
                    </div>
                )}
            </div>
        </Modal>
    );
};

export default ImportFromTeacherModal;
