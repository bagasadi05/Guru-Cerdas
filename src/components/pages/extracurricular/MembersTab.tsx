import React, { useMemo, useState } from 'react';
import {
    Search,
    Users,
    Plus,
    UserPlus,
    UserMinus,
    CheckSquare,
    Square,
    Pencil,
    X,
    CheckCircle2,
} from 'lucide-react';
import { EnrollmentView, ParticipantOption } from './types';
import { compareEnrollmentsByClassAndName, compareClassNames } from './extracurricularUtils';

interface MembersTabProps {
    extracurricularId: string;
    enrollments: EnrollmentView[];
    participants: ParticipantOption[];
    enrolledParticipantIds: Set<string>;
    classes: Array<{ id: string; name: string }>;
    selectedClassId: string;
    onClassIdChange: (id: string) => void;
    onEnrollmentChange: (
        studentId: string,
        studentType: 'student' | 'extracurricular_student',
        action: 'enroll' | 'unenroll'
    ) => void;
    onBulkEnroll?: (
        items: Array<{ studentId: string; studentType: 'student' | 'extracurricular_student' }>
    ) => void;
    isEnrolling?: boolean;
    maxParticipants?: number | null;
    canEdit?: boolean;
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
    onBulkEnroll,
    isEnrolling = false,
    maxParticipants = 30,
    canEdit = true,
    onAddExternalStudent,
    onEditExternalStudent,
}) => {
    const [viewMode, setViewMode] = useState<'enrolled' | 'add'>('enrolled');
    const [searchTerm, setSearchTerm] = useState('');
    const [memberTypeFilter, setMemberTypeFilter] = useState<'all' | 'student' | 'extracurricular_student'>('all');
    const [memberClassFilter, setMemberClassFilter] = useState<string>('all');
    const [showEnrolledInAddView, setShowEnrolledInAddView] = useState(false);
    const [selectedCandidates, setSelectedCandidates] = useState<Set<string>>(new Set());
    const [confirmUnenrollTarget, setConfirmUnenrollTarget] = useState<EnrollmentView | null>(null);

    const maxCap = maxParticipants || 30;
    const remainingQuota = Math.max(0, maxCap - enrollments.length);

    // Unique class names among enrolled members
    const enrolledClassNames = useMemo(() => {
        const set = new Set<string>();
        enrollments.forEach((e) => {
            if (e.className) set.add(e.className);
        });
        return Array.from(set).sort(compareClassNames);
    }, [enrollments]);

    // Filtered enrolled members
    const filteredEnrollments = useMemo(() => {
        const query = searchTerm.trim().toLowerCase();
        return enrollments
            .filter((e) => {
                if (memberTypeFilter !== 'all' && e.participantType !== memberTypeFilter) return false;
                if (memberClassFilter !== 'all' && (e.className || '') !== memberClassFilter) return false;
                if (!query) return true;
                return (
                    e.name.toLowerCase().includes(query) ||
                    (e.className && e.className.toLowerCase().includes(query))
                );
            })
            .sort(compareEnrollmentsByClassAndName);
    }, [enrollments, searchTerm, memberTypeFilter, memberClassFilter]);

    // Filtered candidate participants for "Daftarkan Siswa" mode
    const filteredCandidates = useMemo(() => {
        const query = searchTerm.trim().toLowerCase();
        return participants
            .filter((p) => {
                const key = `${p.type}:${p.id}`;
                const isEnrolled = enrolledParticipantIds.has(key);
                if (!showEnrolledInAddView && isEnrolled) return false;
                if (memberTypeFilter !== 'all' && p.type !== memberTypeFilter) return false;
                if (!query) return true;
                return (
                    p.name.toLowerCase().includes(query) ||
                    (p.className && p.className.toLowerCase().includes(query))
                );
            })
            .sort(compareEnrollmentsByClassAndName);
    }, [participants, enrolledParticipantIds, showEnrolledInAddView, memberTypeFilter, searchTerm]);

    const selectableCandidates = useMemo(() => {
        return filteredCandidates.filter((p) => !enrolledParticipantIds.has(`${p.type}:${p.id}`));
    }, [filteredCandidates, enrolledParticipantIds]);

    const allSelectableChecked =
        selectableCandidates.length > 0 &&
        selectableCandidates.every((p) => selectedCandidates.has(`${p.type}:${p.id}`));

    const toggleCandidateSelection = (key: string) => {
        setSelectedCandidates((prev) => {
            const next = new Set(prev);
            if (next.has(key)) {
                next.delete(key);
            } else {
                next.add(key);
            }
            return next;
        });
    };

    const toggleSelectAllCandidates = () => {
        if (allSelectableChecked) {
            setSelectedCandidates((prev) => {
                const next = new Set(prev);
                selectableCandidates.forEach((p) => next.delete(`${p.type}:${p.id}`));
                return next;
            });
        } else {
            setSelectedCandidates((prev) => {
                const next = new Set(prev);
                selectableCandidates.forEach((p) => next.add(`${p.type}:${p.id}`));
                return next;
            });
        }
    };

    const handleBulkEnrollSubmit = () => {
        if (selectedCandidates.size === 0) return;
        const items = Array.from(selectedCandidates).map((key) => {
            const [type, id] = key.split(':');
            return {
                studentId: id,
                studentType: (type === 'student' ? 'student' : 'extracurricular_student') as
                    | 'student'
                    | 'extracurricular_student',
            };
        });

        if (onBulkEnroll) {
            onBulkEnroll(items);
        } else {
            items.forEach((item) => onEnrollmentChange(item.studentId, item.studentType, 'enroll'));
        }
        setSelectedCandidates(new Set());
    };

    return (
        <div className="space-y-6 animate-in fade-in duration-300">
            {/* Header & Mode Switcher */}
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                <div>
                    <h3 className="text-lg font-bold text-slate-800 dark:text-white flex items-center gap-2">
                        <Users className="w-5 h-5 text-amber-500" />
                        Manajemen Anggota Ekstrakurikuler
                    </h3>
                    <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                        {viewMode === 'enrolled'
                            ? 'Daftar siswa yang aktif mengikuti kegiatan ekstrakurikuler ini.'
                            : 'Pilih satu atau beberapa siswa reguler maupun eksternal untuk didaftarkan.'}
                    </p>
                </div>

                <div className="flex flex-wrap items-center gap-2.5">
                    {/* Quota Pill */}
                    <div className="flex items-center gap-2 bg-amber-50 dark:bg-amber-900/20 px-3.5 py-2 rounded-xl border border-amber-200 dark:border-amber-900/50">
                        <span className="text-xs sm:text-sm font-medium text-amber-800 dark:text-amber-300">
                            Terdaftar:
                        </span>
                        <span className="text-sm sm:text-base font-bold text-amber-600 dark:text-amber-400">
                            {enrollments.length} / {maxCap}
                        </span>
                    </div>

                    {canEdit && (
                        <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-xl border border-slate-200 dark:border-slate-700">
                            <button
                                type="button"
                                onClick={() => setViewMode('enrolled')}
                                className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs sm:text-sm font-semibold transition-all ${
                                    viewMode === 'enrolled'
                                        ? 'bg-white dark:bg-slate-900 text-amber-600 dark:text-amber-400 shadow-sm'
                                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white'
                                }`}
                            >
                                <Users className="w-4 h-4" />
                                Anggota ({enrollments.length})
                            </button>
                            <button
                                type="button"
                                onClick={() => setViewMode('add')}
                                className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs sm:text-sm font-semibold transition-all ${
                                    viewMode === 'add'
                                        ? 'bg-amber-500 text-white shadow-sm'
                                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white'
                                }`}
                            >
                                <UserPlus className="w-4 h-4" />
                                + Daftarkan Siswa
                            </button>
                        </div>
                    )}
                </div>
            </div>

            {/* Filters Bar */}
            <div className="flex flex-col sm:flex-row gap-3 bg-slate-50 dark:bg-slate-900/50 p-3 rounded-2xl border border-slate-200 dark:border-slate-800">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                        type="text"
                        aria-label="Cari nama siswa atau kelas"
                        placeholder={
                            viewMode === 'enrolled'
                                ? 'Cari nama anggota atau kelas...'
                                : 'Cari nama calon anggota atau kelas...'
                        }
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-9 pr-8 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-white focus:ring-2 focus:ring-amber-500 focus:border-transparent transition-all"
                    />
                    {searchTerm && (
                        <button
                            type="button"
                            onClick={() => setSearchTerm('')}
                            aria-label="Bersihkan pencarian"
                            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                        >
                            <X className="w-4 h-4" />
                        </button>
                    )}
                </div>

                <div className="flex flex-wrap items-center gap-2">
                    {viewMode === 'enrolled' ? (
                        <select
                            aria-label="Filter kelas anggota terdaftar"
                            value={memberClassFilter}
                            onChange={(e) => setMemberClassFilter(e.target.value)}
                            className="px-3 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-white focus:ring-2 focus:ring-amber-500"
                        >
                            <option value="all">Semua Kelas</option>
                            {enrolledClassNames.map((cn) => (
                                <option key={cn} value={cn}>
                                    {cn}
                                </option>
                            ))}
                        </select>
                    ) : (
                        <select
                            aria-label="Filter kelas calon anggota"
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
                    )}

                    <select
                        aria-label="Filter jenis siswa"
                        value={memberTypeFilter}
                        onChange={(e) =>
                            setMemberTypeFilter(
                                e.target.value as 'all' | 'student' | 'extracurricular_student'
                            )
                        }
                        className="px-3 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-white focus:ring-2 focus:ring-amber-500"
                    >
                        <option value="all">Semua Jenis Siswa</option>
                        <option value="student">Siswa Reguler</option>
                        <option value="extracurricular_student">Siswa Eksternal</option>
                    </select>

                    {canEdit && (
                        <button
                            type="button"
                            onClick={onAddExternalStudent}
                            className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-slate-800 dark:bg-white text-white dark:text-slate-900 text-xs sm:text-sm font-semibold rounded-xl hover:bg-slate-700 dark:hover:bg-slate-100 transition-colors whitespace-nowrap"
                        >
                            <Plus className="w-4 h-4" />
                            <span>Siswa Ekskul Baru</span>
                        </button>
                    )}
                </div>
            </div>

            {/* Bulk Selection Banner in Add Mode */}
            {viewMode === 'add' && (
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-4 py-3 rounded-2xl bg-amber-50/70 dark:bg-amber-950/30 border border-amber-200/80 dark:border-amber-800/50">
                    <div className="flex flex-wrap items-center gap-3">
                        <button
                            type="button"
                            onClick={toggleSelectAllCandidates}
                            disabled={selectableCandidates.length === 0}
                            className="inline-flex items-center gap-2 text-xs sm:text-sm font-semibold text-slate-700 dark:text-slate-200 hover:text-amber-600 disabled:opacity-50"
                        >
                            {allSelectableChecked ? (
                                <CheckSquare className="w-4 h-4 text-amber-600" />
                            ) : (
                                <Square className="w-4 h-4 text-slate-400" />
                            )}
                            Pilih Semua ({selectableCandidates.length} siswa belum terdaftar)
                        </button>
                        <label className="inline-flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-400 cursor-pointer">
                            <input
                                type="checkbox"
                                checked={showEnrolledInAddView}
                                onChange={(e) => setShowEnrolledInAddView(e.target.checked)}
                                className="rounded border-slate-300 text-amber-600 focus:ring-amber-500"
                            />
                            Tampilkan yang sudah terdaftar
                        </label>
                    </div>

                    <div className="flex items-center gap-2">
                        {selectedCandidates.size > 0 && (
                            <>
                                <span className="text-xs font-semibold text-amber-800 dark:text-amber-300">
                                    {selectedCandidates.size} dipilih (Sisa kuota: {remainingQuota})
                                </span>
                                <button
                                    type="button"
                                    onClick={() => setSelectedCandidates(new Set())}
                                    className="px-2.5 py-1.5 text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-white/60 rounded-lg"
                                >
                                    Batal
                                </button>
                                <button
                                    type="button"
                                    disabled={isEnrolling}
                                    onClick={handleBulkEnrollSubmit}
                                    className="inline-flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs sm:text-sm font-bold rounded-xl shadow-sm transition-all disabled:opacity-60"
                                >
                                    <UserPlus className="w-4 h-4" />
                                    {isEnrolling
                                        ? 'Mendaftarkan...'
                                        : `Daftarkan ${selectedCandidates.size} Siswa`}
                                </button>
                            </>
                        )}
                    </div>
                </div>
            )}

            {/* VIEW 1: ENROLLED MEMBERS TABLE */}
            {viewMode === 'enrolled' ? (
                <div className="border border-slate-200 dark:border-slate-700 rounded-2xl overflow-hidden bg-white dark:bg-slate-800 shadow-sm">
                    {enrollments.length === 0 ? (
                        <div className="px-6 py-16 text-center">
                            <Users className="w-12 h-12 mx-auto text-slate-300 dark:text-slate-600 mb-3" />
                            <h4 className="text-base font-bold text-slate-700 dark:text-slate-200 mb-1">
                                Belum Ada Anggota Terdaftar
                            </h4>
                            <p className="text-sm text-slate-500 dark:text-slate-400 max-w-md mx-auto mb-5">
                                Kegiatan ekstrakurikuler ini belum memiliki peserta. Silakan daftarkan siswa dari kelas reguler atau tambahkan siswa eksternal.
                            </p>
                            {canEdit && (
                                <button
                                    type="button"
                                    onClick={() => setViewMode('add')}
                                    className="inline-flex items-center gap-2 px-5 py-2.5 bg-amber-500 hover:bg-amber-600 text-white text-sm font-bold rounded-xl shadow-md transition-all"
                                >
                                    <UserPlus className="w-4 h-4" />
                                    Daftarkan Anggota Sekarang
                                </button>
                            )}
                        </div>
                    ) : filteredEnrollments.length === 0 ? (
                        <div className="px-6 py-12 text-center text-slate-500 dark:text-slate-400">
                            Tidak ada anggota terdaftar yang cocok dengan filter pencarian.
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full block lg:table" aria-label="Tabel Anggota Terdaftar">
                                <thead className="bg-slate-50 dark:bg-slate-900/50 border-b border-slate-200 dark:border-slate-700 hidden lg:table-header-group">
                                    <tr>
                                        <th className="px-4 py-3.5 text-center text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider w-14">
                                            No
                                        </th>
                                        <th className="px-6 py-3.5 text-left text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                                            Nama Anggota
                                        </th>
                                        <th className="px-6 py-3.5 text-left text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                                            Kelas / Asal
                                        </th>
                                        <th className="px-6 py-3.5 text-center text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                                            Kategori Siswa
                                        </th>
                                        {canEdit && (
                                            <th className="px-6 py-3.5 text-center text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                                                Aksi
                                            </th>
                                        )}
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 dark:divide-slate-700/50 block lg:table-row-group">
                                    {filteredEnrollments.map((member, idx) => (
                                        <tr
                                            key={member.id}
                                            className="block lg:table-row p-4 lg:p-0 hover:bg-slate-50/80 dark:hover:bg-slate-700/30 transition-colors"
                                        >
                                            <td className="hidden lg:table-cell px-4 py-4 text-center text-sm font-semibold text-slate-400">
                                                {idx + 1}
                                            </td>
                                            <td className="block lg:table-cell lg:px-6 lg:py-4 pb-2 lg:pb-4">
                                                <div className="flex items-center justify-between gap-2">
                                                    <div className="flex items-center gap-3 min-w-0">
                                                        <div className="w-9 h-9 rounded-full bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 flex items-center justify-center font-bold text-sm shrink-0">
                                                            {member.name.charAt(0).toUpperCase()}
                                                        </div>
                                                        <div className="min-w-0">
                                                            <div className="font-semibold text-slate-800 dark:text-white flex items-center gap-2 flex-wrap">
                                                                <span>{member.name}</span>
                                                                {member.gender && (
                                                                    <span
                                                                        className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                                                                            member.gender === 'Laki-laki'
                                                                                ? 'bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-300'
                                                                                : 'bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-300'
                                                                        }`}
                                                                    >
                                                                        {member.gender === 'Laki-laki' ? 'L' : 'P'}
                                                                    </span>
                                                                )}
                                                            </div>
                                                            <div className="lg:hidden text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                                                                Kelas: {member.className || '-'}
                                                            </div>
                                                        </div>
                                                    </div>
                                                    <span className="lg:hidden inline-flex px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400">
                                                        Terdaftar
                                                    </span>
                                                </div>
                                            </td>
                                            <td className="hidden lg:table-cell px-6 py-4 text-sm font-medium text-slate-600 dark:text-slate-300">
                                                {member.className || '-'}
                                            </td>
                                            <td className="hidden lg:table-cell px-6 py-4 text-center">
                                                {member.participantType === 'extracurricular_student' ? (
                                                    <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300">
                                                        Siswa Eksternal
                                                    </span>
                                                ) : (
                                                    <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-300">
                                                        Siswa Reguler
                                                    </span>
                                                )}
                                            </td>
                                            {canEdit && (
                                                <td className="block lg:table-cell lg:px-6 lg:py-4 pt-2 lg:pt-4 border-t border-dashed border-slate-100 dark:border-slate-700/60 lg:border-none">
                                                    <div className="flex items-center justify-end lg:justify-center gap-2">
                                                        {member.participantType === 'extracurricular_student' && (
                                                            <button
                                                                type="button"
                                                                onClick={() =>
                                                                    onEditExternalStudent(member.participantId)
                                                                }
                                                                className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold rounded-lg text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-700 transition-colors border border-slate-200 dark:border-slate-600"
                                                            >
                                                                <Pencil className="w-3.5 h-3.5" />
                                                                Edit
                                                            </button>
                                                        )}
                                                        <button
                                                            type="button"
                                                            onClick={() => setConfirmUnenrollTarget(member)}
                                                            aria-label={`Keluarkan ${member.name}`}
                                                            className="inline-flex items-center gap-1 px-3.5 py-1.5 text-xs font-semibold rounded-lg bg-red-50 text-red-700 hover:bg-red-100 dark:bg-red-900/20 dark:text-red-400 dark:hover:bg-red-900/40 transition-colors"
                                                        >
                                                            <UserMinus className="w-3.5 h-3.5" />
                                                            Keluarkan
                                                        </button>
                                                    </div>
                                                </td>
                                            )}
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            ) : (
                /* VIEW 2: ADD / ENROLL PARTICIPANTS TABLE */
                <div className="border border-slate-200 dark:border-slate-700 rounded-2xl overflow-hidden bg-white dark:bg-slate-800 shadow-sm">
                    <div className="overflow-x-auto">
                        <table className="w-full block lg:table" aria-label="Tabel Pendaftaran Anggota Ekstrakurikuler">
                            <thead className="bg-slate-50 dark:bg-slate-900/50 sticky top-0 z-10 border-b border-slate-200 dark:border-slate-700 hidden lg:table-header-group">
                                <tr>
                                    <th className="px-4 py-3.5 text-center w-12">
                                        <span className="sr-only">Pilih</span>
                                    </th>
                                    <th className="px-6 py-3.5 text-left text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider min-w-[200px]">
                                        Nama Siswa
                                    </th>
                                    <th className="px-6 py-3.5 text-left text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider min-w-[120px]">
                                        Kelas / Asal
                                    </th>
                                    <th className="px-6 py-3.5 text-center text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider min-w-[100px]">
                                        Status
                                    </th>
                                    <th className="px-6 py-3.5 text-center text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider min-w-[180px]">
                                        Aksi
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 dark:divide-slate-700/50 block lg:table-row-group">
                                {filteredCandidates.length === 0 ? (
                                    <tr>
                                        <td
                                            colSpan={5}
                                            className="px-6 py-12 text-center text-slate-500 dark:text-slate-400"
                                        >
                                            Tidak ada calon anggota yang ditemukan (atau semua siswa di filter ini sudah terdaftar).
                                        </td>
                                    </tr>
                                ) : (
                                    filteredCandidates.map((student) => {
                                        const key = `${student.type}:${student.id}`;
                                        const isEnrolled = enrolledParticipantIds.has(key);
                                        const isChecked = selectedCandidates.has(key);

                                        return (
                                            <tr
                                                key={key}
                                                className={`block lg:table-row p-4 lg:p-0 transition-colors ${
                                                    isEnrolled
                                                        ? 'bg-emerald-50/30 dark:bg-emerald-900/10'
                                                        : isChecked
                                                            ? 'bg-amber-50/60 dark:bg-amber-900/20'
                                                            : 'hover:bg-slate-50 dark:hover:bg-slate-700/30'
                                                }`}
                                            >
                                                <td className="hidden lg:table-cell px-4 py-4 text-center">
                                                    {!isEnrolled && (
                                                        <input
                                                            type="checkbox"
                                                            aria-label={`Pilih ${student.name}`}
                                                            checked={isChecked}
                                                            onChange={() => toggleCandidateSelection(key)}
                                                            className="w-4 h-4 rounded border-slate-300 text-amber-600 focus:ring-amber-500 cursor-pointer"
                                                        />
                                                    )}
                                                </td>
                                                <td className="block lg:table-cell lg:px-6 lg:py-4 pb-2 lg:pb-4">
                                                    <div className="flex justify-between items-start gap-2">
                                                        <div className="flex items-start gap-2.5">
                                                            {!isEnrolled && (
                                                                <input
                                                                    type="checkbox"
                                                                    aria-label={`Pilih ${student.name}`}
                                                                    checked={isChecked}
                                                                    onChange={() => toggleCandidateSelection(key)}
                                                                    className="lg:hidden mt-1 w-4 h-4 rounded border-slate-300 text-amber-600 focus:ring-amber-500"
                                                                />
                                                            )}
                                                            <div>
                                                                <div className="font-medium text-slate-800 dark:text-white flex items-center gap-2">
                                                                    <span>{student.name}</span>
                                                                    {student.gender && (
                                                                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300">
                                                                            {student.gender === 'Laki-laki' ? 'L' : 'P'}
                                                                        </span>
                                                                    )}
                                                                </div>
                                                                <div className="lg:hidden text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                                                                    {student.className || '-'}
                                                                </div>
                                                                {student.type === 'extracurricular_student' && (
                                                                    <span className="inline-flex items-center px-2 py-0.5 mt-1 rounded text-xxs font-medium bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300">
                                                                        Siswa Eksternal
                                                                    </span>
                                                                )}
                                                            </div>
                                                        </div>
                                                        <div className="lg:hidden shrink-0">
                                                            <span
                                                                className={`inline-flex whitespace-nowrap px-2.5 py-1 rounded-full text-xs font-semibold ${
                                                                    isEnrolled
                                                                        ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
                                                                        : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
                                                                }`}
                                                            >
                                                                {isEnrolled ? 'Terdaftar' : 'Belum'}
                                                            </span>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="hidden lg:table-cell px-6 py-4 text-sm text-slate-600 dark:text-slate-400">
                                                    {student.className || '-'}
                                                </td>
                                                <td className="hidden lg:table-cell px-6 py-4 text-center">
                                                    <span
                                                        className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold ${
                                                            isEnrolled
                                                                ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
                                                                : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
                                                        }`}
                                                    >
                                                        {isEnrolled && <CheckCircle2 className="w-3.5 h-3.5" />}
                                                        {isEnrolled ? 'Terdaftar' : 'Belum'}
                                                    </span>
                                                </td>
                                                <td className="block lg:table-cell lg:px-6 lg:py-4">
                                                    <div className="flex items-center justify-end lg:justify-center gap-2">
                                                        <button
                                                            type="button"
                                                            onClick={() =>
                                                                onEnrollmentChange(
                                                                    student.id,
                                                                    student.type,
                                                                    isEnrolled ? 'unenroll' : 'enroll'
                                                                )
                                                            }
                                                            className={`px-4 py-1.5 text-xs sm:text-sm font-semibold rounded-lg transition-all w-full lg:w-auto ${
                                                                isEnrolled
                                                                    ? 'bg-red-50 text-red-700 hover:bg-red-100 dark:bg-red-900/20 dark:text-red-400'
                                                                    : 'bg-emerald-600 text-white hover:bg-emerald-700 shadow-sm'
                                                            }`}
                                                        >
                                                            {isEnrolled ? 'Keluarkan' : 'Daftarkan'}
                                                        </button>

                                                        {student.type === 'extracurricular_student' && (
                                                            <button
                                                                type="button"
                                                                onClick={() => onEditExternalStudent(student.id)}
                                                                className="px-3 py-1.5 text-xs sm:text-sm font-medium rounded-lg text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-700 transition-colors border border-slate-200 dark:border-slate-600 w-full lg:w-auto"
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
            )}

            {/* Confirm Unenroll Modal */}
            {confirmUnenrollTarget && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div
                        role="presentation"
                        aria-hidden="true"
                        onClick={() => setConfirmUnenrollTarget(null)}
                        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
                    />
                    <div className="relative w-full max-w-sm bg-white dark:bg-slate-800 rounded-2xl shadow-2xl p-6 border border-slate-200 dark:border-slate-700">
                        <h4 className="text-lg font-bold text-slate-800 dark:text-white mb-2">
                            Keluarkan Anggota?
                        </h4>
                        <p className="text-sm text-slate-600 dark:text-slate-300 mb-5">
                            Keluarkan <strong>{confirmUnenrollTarget.name}</strong> dari ekstrakurikuler ini? Riwayat presensi dan nilai sebelumnya tetap aman.
                        </p>
                        <div className="flex gap-3">
                            <button
                                type="button"
                                onClick={() => setConfirmUnenrollTarget(null)}
                                className="flex-1 py-2 rounded-xl border border-slate-200 dark:border-slate-600 text-slate-700 dark:text-slate-200 text-sm font-semibold hover:bg-slate-50 dark:hover:bg-slate-700"
                            >
                                Batal
                            </button>
                            <button
                                type="button"
                                onClick={() => {
                                    onEnrollmentChange(
                                        confirmUnenrollTarget.participantId,
                                        confirmUnenrollTarget.participantType,
                                        'unenroll'
                                    );
                                    setConfirmUnenrollTarget(null);
                                }}
                                className="flex-1 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white text-sm font-bold"
                            >
                                Ya, Keluarkan
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
