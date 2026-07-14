import React, { useMemo } from 'react';
import { Search, Users, Plus } from 'lucide-react';
import { EnrollmentView } from './types';

interface MembersTabProps {
    extracurricularId: string;
    enrollments: EnrollmentView[];
    participants: { id: string; type: 'student' | 'extracurricular_student'; name: string; className: string | null }[];
    enrolledParticipantIds: Set<string>;
    classes: any[];
    selectedClassId: string;
    onClassIdChange: (id: string) => void;
    onEnrollmentChange: (studentId: string, studentType: 'student' | 'extracurricular_student', action: 'enroll' | 'unenroll') => void;
    onAddExternalStudent: () => void;
    onEditExternalStudent: (id: string) => void;
}

export const MembersTab: React.FC<MembersTabProps> = ({
    extracurricularId: _extracurricularId,
    enrollments,
    participants,
    enrolledParticipantIds,
    classes,
    selectedClassId,
    onClassIdChange,
    onEnrollmentChange,
    onAddExternalStudent,
    onEditExternalStudent
}) => {
    const [searchTerm, setSearchTerm] = React.useState('');

    const filteredParticipants = useMemo(() => {
        if (!searchTerm) return participants;
        const lower = searchTerm.toLowerCase();
        return participants.filter(p => 
            p.name.toLowerCase().includes(lower) || 
            (p.className && p.className.toLowerCase().includes(lower))
        );
    }, [participants, searchTerm]);

    return (
        <div className="space-y-6 animate-in fade-in duration-300">
            {/* Header / Actions */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h3 className="text-lg font-bold text-slate-800 dark:text-white flex items-center gap-2">
                        <Users className="w-5 h-5 text-amber-500" />
                        Manajemen Anggota
                    </h3>
                    <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                        Pilih siswa untuk didaftarkan ke ekstrakurikuler ini.
                    </p>
                </div>
                <div className="flex items-center gap-2 bg-amber-50 dark:bg-amber-900/20 px-4 py-2 rounded-xl border border-amber-200 dark:border-amber-900/50">
                    <span className="text-sm font-medium text-amber-800 dark:text-amber-300">Total Anggota:</span>
                    <span className="text-lg font-bold text-amber-600 dark:text-amber-400">{enrollments.length}</span>
                </div>
            </div>

            {/* Filters */}
            <div className="flex flex-col sm:flex-row gap-3 bg-slate-50 dark:bg-slate-900/50 p-3 rounded-2xl border border-slate-200 dark:border-slate-800">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                        type="text"
                        placeholder="Cari nama siswa atau kelas..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-9 pr-4 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-white focus:ring-2 focus:ring-amber-500 focus:border-transparent transition-all"
                    />
                </div>
                <div className="flex gap-2">
                    <select
                        value={selectedClassId}
                        onChange={(e) => onClassIdChange(e.target.value)}
                        className="px-3 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-white focus:ring-2 focus:ring-amber-500 min-w-[140px]"
                    >
                        <option value="">Semua Kelas (Reguler)</option>
                        {classes.map((c) => (
                            <option key={c.id} value={c.id}>
                                {c.name}
                            </option>
                        ))}
                    </select>
                    <button type="button"
                        onClick={onAddExternalStudent}
                        className="inline-flex items-center gap-1.5 px-4 py-2 bg-slate-800 dark:bg-white text-white dark:text-slate-900 text-sm font-medium rounded-xl hover:bg-slate-700 dark:hover:bg-slate-100 transition-colors whitespace-nowrap"
                    >
                        <Plus className="w-4 h-4" />
                        <span className="hidden sm:inline">Siswa Ekskul Baru</span>
                    </button>
                </div>
            </div>

            {/* Table */}
            <div className="border border-slate-200 dark:border-slate-700 rounded-2xl overflow-hidden bg-white dark:bg-slate-800 shadow-sm">
                <div className="overflow-x-auto">
                    <table className="w-full block lg:table">
                        <thead className="bg-slate-50 dark:bg-slate-900/50 sticky top-0 z-10 border-b border-slate-200 dark:border-slate-700 hidden lg:table-header-group">
                            <tr>
                                <th className="px-6 py-4 text-left text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider min-w-[200px] whitespace-nowrap">Nama Siswa</th>
                                <th className="px-6 py-4 text-left text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider min-w-[120px] whitespace-nowrap">Kelas / Asal</th>
                                <th className="px-6 py-4 text-center text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider min-w-[100px] whitespace-nowrap">Status</th>
                                <th className="px-6 py-4 text-center text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider min-w-[200px] whitespace-nowrap">Aksi</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-700/50 block lg:table-row-group">
                            {filteredParticipants.length === 0 ? (
                                <tr>
                                    <td colSpan={4} className="px-6 py-12 text-center text-slate-500 dark:text-slate-400">
                                        Tidak ada siswa yang ditemukan.
                                    </td>
                                </tr>
                            ) : (
                                filteredParticipants.map((student) => {
                                    const key = `${student.type}:${student.id}`;
                                    const isEnrolled = enrolledParticipantIds.has(key);
                                    
                                    return (
                                        <tr key={key} className={`
                                            block lg:table-row p-4 lg:p-0
                                            transition-colors
                                            ${isEnrolled ? 'bg-amber-50/30 dark:bg-amber-900/10' : 'hover:bg-slate-50 dark:hover:bg-slate-700/30'}
                                        `}>
                                            <td className="block lg:table-cell lg:px-6 lg:py-4 pb-2 lg:pb-4 border-b border-dashed border-slate-200 lg:border-none dark:border-slate-700 mb-3 lg:mb-0">
                                                <div className="flex justify-between items-start">
                                                    <div>
                                                        <div className="font-medium text-slate-800 dark:text-white">{student.name}</div>
                                                        <div className="lg:hidden text-sm text-slate-500 dark:text-slate-400 mt-0.5">{student.className || '-'}</div>
                                                        {student.type === 'extracurricular_student' && (
                                                            <span className="inline-flex items-center px-2 py-0.5 mt-1 rounded text-xxs font-medium bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300">
                                                                Siswa Eksternal/Ekskul
                                                            </span>
                                                        )}
                                                    </div>
                                                    <div className="lg:hidden mt-1">
                                                        <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-semibold ${
                                                            isEnrolled 
                                                                ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/50' 
                                                                : 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400 border border-slate-200 dark:border-slate-700'
                                                        }`}>
                                                            {isEnrolled ? 'Terdaftar' : 'Belum'}
                                                        </span>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="hidden lg:table-cell px-6 py-4 text-sm text-slate-600 dark:text-slate-400">
                                                {student.className || '-'}
                                            </td>
                                            <td className="hidden lg:table-cell px-6 py-4 text-center">
                                                <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-semibold ${
                                                    isEnrolled 
                                                        ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/50' 
                                                        : 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400 border border-slate-200 dark:border-slate-700'
                                                }`}>
                                                    {isEnrolled ? 'Terdaftar' : 'Belum'}
                                                </span>
                                            </td>
                                            <td className="block lg:table-cell lg:px-6 lg:py-4">
                                                <div className="flex items-center justify-end lg:justify-center gap-2">
                                                    <button type="button"
                                                        onClick={() => onEnrollmentChange(student.id, student.type, isEnrolled ? 'unenroll' : 'enroll')}
                                                        className={`px-4 py-1.5 text-sm font-medium rounded-lg transition-all w-full lg:w-auto ${
                                                            isEnrolled
                                                                ? 'bg-red-50 text-red-600 hover:bg-red-100 dark:bg-red-900/20 dark:text-red-400 dark:hover:bg-red-900/40'
                                                                : 'bg-emerald-500 text-white hover:bg-emerald-600 shadow-sm shadow-emerald-500/20'
                                                        }`}
                                                    >
                                                        {isEnrolled ? 'Keluarkan' : 'Daftarkan'}
                                                    </button>
                                                    
                                                    {student.type === 'extracurricular_student' && (
                                                        <button type="button"
                                                            onClick={() => onEditExternalStudent(student.id)}
                                                            className="px-3 py-1.5 text-sm font-medium rounded-lg text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-700 transition-colors border border-slate-200 dark:border-slate-600 w-full lg:w-auto"
                                                        >
                                                            Edit
                                                        </button>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};
