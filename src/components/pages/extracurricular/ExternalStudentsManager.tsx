import React, { useMemo, useState } from 'react';
import { UserCog, Plus, Search, Trash2, Pencil } from 'lucide-react';
import { ExtracurricularStudent } from './types';

interface ExternalStudentsManagerProps {
    students: ExtracurricularStudent[];
    loading: boolean;
    uniqueClasses: string[];
    onAddStudent: () => void;
    onEditStudent: (student: ExtracurricularStudent) => void;
    onDeleteStudent: (student: ExtracurricularStudent) => void;
}

export const ExternalStudentsManager: React.FC<ExternalStudentsManagerProps> = ({
    students,
    loading,
    uniqueClasses,
    onAddStudent,
    onEditStudent,
    onDeleteStudent
}) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [classFilter, setClassFilter] = useState('all');

    const filteredStudents = useMemo(() => {
        let result = classFilter === 'all' 
            ? students 
            : students.filter((s) => s.class_name === classFilter);
        
        if (searchTerm.trim()) {
            const search = searchTerm.toLowerCase();
            result = result.filter((s) => 
                s.name.toLowerCase().includes(search) ||
                (s.class_name && s.class_name.toLowerCase().includes(search))
            );
        }
        
        return result;
    }, [students, classFilter, searchTerm]);

    return (
        <div className="space-y-6 animate-in fade-in duration-300">
            {/* Header & Actions */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h2 className="text-xl font-bold text-slate-800 dark:text-white flex items-center gap-2">
                        <UserCog className="w-6 h-6 text-amber-500" />
                        Siswa Eksternal / Khusus Ekskul
                    </h2>
                    <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 max-w-2xl">
                        Kelola data siswa yang hanya mengikuti ekstrakurikuler dan bukan merupakan siswa kelas reguler di sistem ini.
                    </p>
                </div>
                <button
                    onClick={onAddStudent}
                    className="flex items-center justify-center gap-2 px-4 py-2 bg-slate-800 dark:bg-slate-100 text-white dark:text-slate-900 rounded-xl font-medium shadow-md hover:shadow-lg hover:-translate-y-0.5 transition-all whitespace-nowrap"
                >
                    <Plus className="w-4 h-4" />
                    Tambah Siswa Ekskul
                </button>
            </div>

            {/* Filters */}
            <div className="flex flex-col sm:flex-row gap-3 bg-white/70 dark:bg-slate-900/40 border border-slate-200 dark:border-slate-700 rounded-2xl p-3 shadow-sm backdrop-blur-sm">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                    <input
                        type="text"
                        placeholder="Cari nama siswa atau kelas asal..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-white focus:ring-2 focus:ring-amber-500 focus:border-transparent transition-all"
                    />
                </div>
                <div className="flex items-center gap-3">
                    <select
                        value={classFilter}
                        onChange={(e) => setClassFilter(e.target.value)}
                        className="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm font-medium text-slate-700 dark:text-slate-300 focus:ring-2 focus:ring-amber-500 transition-all min-w-[150px]"
                    >
                        <option value="all">Semua Kelas Asal</option>
                        {uniqueClasses.map((className) => (
                            <option key={className} value={className}>
                                Kelas {className}
                            </option>
                        ))}
                    </select>
                    <div className="px-4 py-2.5 bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400 rounded-xl font-semibold border border-amber-200 dark:border-amber-900/50 whitespace-nowrap">
                        Total: {filteredStudents.length}
                    </div>
                </div>
            </div>

            {/* Grid / Table */}
            {loading ? (
                <div className="flex items-center justify-center py-20">
                    <div className="w-8 h-8 border-4 border-amber-500 border-t-transparent rounded-full animate-spin" />
                </div>
            ) : filteredStudents.length === 0 ? (
                <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 border-dashed p-12 text-center shadow-sm">
                    <UserCog className="w-12 h-12 mx-auto text-slate-300 dark:text-slate-600 mb-3" />
                    <h3 className="text-lg font-medium text-slate-800 dark:text-white mb-1">
                        Data Tidak Ditemukan
                    </h3>
                    <p className="text-slate-500 dark:text-slate-400 max-w-sm mx-auto">
                        Belum ada siswa eksternal yang terdaftar, atau kata kunci pencarian Anda tidak cocok.
                    </p>
                </div>
            ) : (
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                    {filteredStudents.map((student) => (
                        <div 
                            key={student.id} 
                            className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-5 shadow-sm hover:shadow-md transition-shadow group flex flex-col"
                        >
                            <div className="flex items-start justify-between mb-4">
                                <div className="w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-700 flex items-center justify-center text-slate-500 dark:text-slate-400 font-bold text-lg uppercase flex-shrink-0">
                                    {student.name.charAt(0)}
                                </div>
                                <span className={`px-2 py-0.5 rounded text-[10px] font-bold tracking-wider uppercase ${
                                    student.gender === 'Laki-laki' 
                                        ? 'bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400'
                                        : 'bg-rose-50 text-rose-600 dark:bg-rose-900/30 dark:text-rose-400'
                                }`}>
                                    {student.gender === 'Laki-laki' ? 'L' : 'P'}
                                </span>
                            </div>
                            
                            <div className="flex-1 mb-4">
                                <h4 className="font-bold text-slate-800 dark:text-white line-clamp-1" title={student.name}>
                                    {student.name}
                                </h4>
                                <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 flex items-center gap-1.5">
                                    <span className="w-2 h-2 rounded-full bg-amber-400" />
                                    {student.class_name ? `Asal: ${student.class_name}` : 'Asal tidak diketahui'}
                                </p>
                            </div>

                            <div className="flex gap-2 pt-4 border-t border-slate-100 dark:border-slate-700/50 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button
                                    onClick={() => onEditStudent(student)}
                                    className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-50 dark:bg-slate-700 text-slate-600 dark:text-slate-300 text-xs font-semibold hover:bg-slate-100 dark:hover:bg-slate-600 transition-colors"
                                >
                                    <Pencil className="w-3.5 h-3.5" /> Edit
                                </button>
                                <button
                                    onClick={() => onDeleteStudent(student)}
                                    className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-xs font-semibold hover:bg-red-100 dark:hover:bg-red-900/40 transition-colors"
                                >
                                    <Trash2 className="w-3.5 h-3.5" /> Hapus
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};
