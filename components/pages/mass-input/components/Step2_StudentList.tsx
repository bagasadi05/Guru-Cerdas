import React from 'react';
import { Input } from '../../../ui/Input';
import { Checkbox } from '../../../ui/Checkbox';
import { SearchIcon, CheckSquareIcon } from '../../../Icons';
import { FilterPills } from './FilterPills';
import { StudentRow, InputMode, StudentFilter, AcademicRecordRow } from '../types';

interface Step2_StudentListProps {
    mode: InputMode | null;
    searchTerm: string;
    setSearchTerm: (term: string) => void;
    filterOptions: { value: StudentFilter; label: string }[];
    studentFilter: StudentFilter;
    setStudentFilter: (filter: StudentFilter) => void;
    isLoadingStudents: boolean;
    students: StudentRow[];
    isAllSelected: boolean;
    handleSelectAllStudents: (checked: boolean) => void;
    selectedStudentIds: Set<string>;
    handleStudentSelect: (id: string) => void;
    scores: Record<string, string>;
    handleScoreChange: (id: string, value: string) => void;
    existingGrades: AcademicRecordRow[] | undefined;
}

export const Step2_StudentList: React.FC<Step2_StudentListProps> = ({
    mode, searchTerm, setSearchTerm, filterOptions, studentFilter, setStudentFilter,
    isLoadingStudents, students, isAllSelected, handleSelectAllStudents,
    selectedStudentIds, handleStudentSelect, scores, handleScoreChange, existingGrades
}) => {
    return (
        <div className="lg:col-span-2 bg-white/5 backdrop-blur-lg rounded-2xl border border-white/10 flex flex-col">
            <div className="p-4 sm:p-6 border-b border-white/10 flex-shrink-0 flex flex-col sm:flex-row items-start sm:items-center gap-4 justify-between">
                <div className="relative flex-grow w-full sm:w-auto">
                    <SearchIcon className="w-5 h-5 text-gray-400 absolute top-1/2 left-3 -translate-y-1/2" />
                    <Input value={searchTerm} onChange={e => setSearchTerm(e.target.value)} placeholder="Cari nama siswa..." className="pl-10 w-full" />
                </div>
                <FilterPills options={filterOptions} currentValue={studentFilter} onFilterChange={setStudentFilter} />
            </div>
            <div className="flex-grow overflow-y-auto p-4">
                {isLoadingStudents ? <p className="p-6 text-center">Memuat siswa...</p> : students && students.length > 0 ? (
                    <>
                        <div className="hidden md:block overflow-x-auto">
                            <table className="w-full text-sm striped-table sticky-header">
                                <thead>
                                    <tr>
                                        <th className="p-4 text-left w-10">{mode !== 'subject_grade' && <Checkbox checked={isAllSelected} onChange={e => handleSelectAllStudents(e.target.checked)} />}</th>
                                        <th className="p-4 text-left font-semibold">Nama Siswa</th>
                                        <th className="p-4 text-left font-semibold">{mode === 'subject_grade' ? 'Input Nilai' : (mode === 'academic_print' || mode === 'delete_subject_grade') ? 'Nilai Saat Ini' : 'Status'}</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {students.map((s: StudentRow) => {
                                        const isSelected = selectedStudentIds.has(s.id);
                                        const gradeRecord = (mode === 'delete_subject_grade' || mode === 'academic_print') ? (existingGrades || []).find(g => g.student_id === s.id) : null;
                                        const hasGrade = !!gradeRecord;
                                        return (
                                            <tr key={s.id} onClick={mode !== 'subject_grade' ? () => handleStudentSelect(s.id) : undefined} className={`border-b border-white/10 transition-colors ${(isSelected || (mode === 'subject_grade' && scores[s.id]?.trim())) ? 'bg-purple-500/10' : 'hover:bg-white/5'} ${mode !== 'subject_grade' ? 'cursor-pointer' : ''}`}>
                                                <td className="p-4">{mode !== 'subject_grade' && <Checkbox checked={isSelected} onChange={() => handleStudentSelect(s.id)} disabled={mode === 'delete_subject_grade' && !hasGrade} />}</td>
                                                <td className="p-4 flex items-center gap-3">
                                                    <img src={s.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(s.name)}&background=random`} alt={s.name} className="w-10 h-10 rounded-full object-cover ring-2 ring-white/10" />
                                                    <span className="font-medium">{s.name}</span>
                                                </td>
                                                <td className="p-4">
                                                    {mode === 'subject_grade' ?
                                                        <Input type="number" inputMode="numeric" min="0" max="100" value={scores[s.id] || ''} onChange={e => handleScoreChange(s.id, e.target.value)} placeholder="0-100" className="w-28" /> :
                                                        (mode === 'academic_print' || mode === 'delete_subject_grade') ?
                                                            <span className={`font-bold px-3 py-1.5 rounded-lg ${hasGrade ? 'bg-purple-500/20 text-purple-200' : 'bg-white/10 text-gray-500'}`}>{hasGrade ? gradeRecord?.score : 'N/A'}</span> :
                                                            isSelected ? <span className="text-green-400 font-semibold">Terpilih</span> : <span className="text-gray-500">Belum dipilih</span>
                                                    }
                                                </td>
                                            </tr>
                                        )
                                    })}
                                </tbody>
                            </table>
                        </div>
                        <div className="md:hidden space-y-3">
                            {students.map((s: StudentRow) => {
                                const isSelected = selectedStudentIds.has(s.id);
                                const gradeRecord = (mode === 'delete_subject_grade' || mode === 'academic_print') ? (existingGrades || []).find(g => g.student_id === s.id) : null;
                                const hasGrade = !!gradeRecord;
                                return (
                                    <div key={s.id} onClick={mode !== 'subject_grade' ? () => handleStudentSelect(s.id) : undefined} className={`bg-white/5 backdrop-blur-sm rounded-xl border transition-all duration-200 ${(isSelected || (mode === 'subject_grade' && scores[s.id]?.trim())) ? 'border-purple-500/50 bg-purple-500/10 shadow-lg shadow-purple-500/20' : 'border-white/10 hover:border-white/20'} ${mode !== 'subject_grade' ? 'cursor-pointer active:scale-98' : ''} p-4`}>
                                        <div className="flex items-center gap-3 mb-3">
                                            {mode !== 'subject_grade' && <Checkbox checked={isSelected} onChange={() => handleStudentSelect(s.id)} disabled={mode === 'delete_subject_grade' && !hasGrade} />}
                                            <img src={s.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(s.name)}&background=random`} alt={s.name} className="w-12 h-12 rounded-full object-cover ring-2 ring-white/20 shadow-md" />
                                            <div className="flex-grow">
                                                <p className="font-semibold text-white text-base leading-tight">{s.name}</p>
                                                <p className="text-xs text-gray-400 mt-0.5">No. {students.indexOf(s) + 1}</p>
                                            </div>
                                        </div>
                                        {mode === 'subject_grade' ? (
                                            <div className="flex items-center gap-3 mt-3 pt-3 border-t border-white/10">
                                                <label className="text-sm font-medium text-gray-300 min-w-[60px]">Nilai:</label>
                                                <Input type="number" inputMode="numeric" min="0" max="100" value={scores[s.id] || ''} onChange={e => handleScoreChange(s.id, e.target.value)} placeholder="0-100" className="flex-grow text-lg font-semibold text-center" />
                                                {scores[s.id] && (
                                                    <span className={`px-3 py-1.5 rounded-lg text-sm font-bold ${parseInt(scores[s.id]) >= 75 ? 'bg-green-500/20 text-green-300' : parseInt(scores[s.id]) >= 60 ? 'bg-yellow-500/20 text-yellow-300' : 'bg-red-500/20 text-red-300'}`}>
                                                        {parseInt(scores[s.id]) >= 75 ? 'Baik' : parseInt(scores[s.id]) >= 60 ? 'Cukup' : 'Kurang'}
                                                    </span>
                                                )}
                                            </div>
                                        ) : (mode === 'academic_print' || mode === 'delete_subject_grade') ? (
                                            <div className="flex items-center justify-between mt-3 pt-3 border-t border-white/10">
                                                <span className="text-sm text-gray-400">Nilai Saat Ini:</span>
                                                <span className={`font-bold px-3 py-1.5 rounded-lg text-lg ${hasGrade ? 'bg-purple-500/20 text-purple-200' : 'bg-white/10 text-gray-500'}`}>{hasGrade ? gradeRecord?.score : 'N/A'}</span>
                                            </div>
                                        ) : (
                                            <div className="flex items-center justify-between mt-3 pt-3 border-t border-white/10">
                                                <span className="text-sm text-gray-400">Status:</span>
                                                {isSelected ? <span className="text-green-400 font-semibold flex items-center gap-1"><CheckSquareIcon className="w-4 h-4" />Terpilih</span> : <span className="text-gray-500">Belum dipilih</span>}
                                            </div>
                                        )}
                                    </div>
                                )
                            })}
                        </div>
                    </>
                ) : <p className="p-6 text-center">Tidak ada siswa di kelas ini atau tidak ada hasil pencarian.</p>}
            </div>
        </div>
    );
};
