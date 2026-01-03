import React, { useState, useMemo, useEffect } from 'react';
import { Button } from '../../../ui/Button';
import { Select } from '../../../ui/Select';
import { DownloadIcon, FileTextIcon, FileSpreadsheetIcon, ShieldAlertIcon, UsersIcon, SearchIcon, SparklesIcon } from '../../../Icons';
import { ClassRow, ViolationRow, StudentRow } from '../types';
import { exportBulkViolationsToPDF, exportBulkViolationsToExcel } from '../../../../services/violationExport';
import { useToast } from '../../../../hooks/useToast';
import { SemesterSelector } from '../../../ui/SemesterSelector';
import { useUserSettings } from '../../../../hooks/useUserSettings';
import { useSemester } from '../../../../contexts/SemesterContext';
import { Checkbox } from '../../../ui/Checkbox';

type StudentFilter = 'all' | 'selected' | 'unselected';

interface ViolationExportPanelProps {
    classes: ClassRow[] | undefined;
    selectedClass: string;
    setSelectedClass: (id: string) => void;
    isLoadingClasses: boolean;
    existingViolations: ViolationRow[] | undefined;
    studentsData: StudentRow[] | undefined;
    isLoadingViolations: boolean;
}

export const ViolationExportPanel: React.FC<ViolationExportPanelProps> = ({
    classes,
    selectedClass,
    setSelectedClass,
    isLoadingClasses,
    existingViolations,
    studentsData,
    isLoadingViolations
}) => {
    const toast = useToast();
    const { activeSemester } = useSemester();
    const [semesterFilter, setSemesterFilter] = useState<string>(activeSemester?.id || 'all');
    const { schoolName } = useUserSettings();

    useEffect(() => {
        if (activeSemester?.id) {
            setSemesterFilter(activeSemester.id);
        }
    }, [activeSemester]);

    const [searchTerm, setSearchTerm] = useState('');
    const [selectedStudentIds, setSelectedStudentIds] = useState<Set<string>>(new Set());
    const [studentFilter, setStudentFilter] = useState<StudentFilter>('all');

    const className = classes?.find(c => c.id === selectedClass)?.name || 'Kelas';

    useEffect(() => {
        setSelectedStudentIds(new Set());
    }, [studentsData, selectedClass]);

    const filteredStudents = useMemo(() => {
        if (!studentsData) return [];
        let result = studentsData;
        if (searchTerm) {
            result = result.filter(s => s.name.toLowerCase().includes(searchTerm.toLowerCase()));
        }
        if (studentFilter === 'selected') {
            result = result.filter(s => selectedStudentIds.has(s.id));
        } else if (studentFilter === 'unselected') {
            result = result.filter(s => !selectedStudentIds.has(s.id));
        }
        return result;
    }, [studentsData, searchTerm, studentFilter, selectedStudentIds]);

    const isAllSelected = filteredStudents.length > 0 && filteredStudents.every(s => selectedStudentIds.has(s.id));

    const handleSelectAll = (checked: boolean) => {
        setSelectedStudentIds(prev => {
            const next = new Set(prev);
            filteredStudents.forEach(s => {
                if (checked) next.add(s.id);
                else next.delete(s.id);
            });
            return next;
        });
    };

    const handleToggleStudent = (studentId: string) => {
        setSelectedStudentIds(prev => {
            const next = new Set(prev);
            if (next.has(studentId)) next.delete(studentId);
            else next.add(studentId);
            return next;
        });
    };

    const filteredViolations = useMemo(() => {
        let bySemester = existingViolations || [];
        if (semesterFilter !== 'all') {
            bySemester = bySemester.filter(v => v.semester_id === semesterFilter);
        }
        if (selectedStudentIds.size === 0) return bySemester;
        return bySemester.filter(v => selectedStudentIds.has(v.student_id));
    }, [existingViolations, semesterFilter, selectedStudentIds]);

    const violationCount = filteredViolations.length;
    const totalPoints = filteredViolations.reduce((sum, v) => sum + v.points, 0);
    const uniqueStudentsWithViolations = new Set(filteredViolations.map(v => v.student_id)).size;

    const handleExport = async (type: 'pdf' | 'excel') => {
        if (selectedStudentIds.size === 0) {
            toast.warning('Pilih setidaknya satu siswa untuk diekspor.');
            return;
        }
        if (filteredViolations.length === 0 || !studentsData) {
            toast.warning('Tidak ada data pelanggaran untuk diekspor.');
            return;
        }

        const options = {
            className: className,
            schoolName: schoolName,
            violations: filteredViolations,
            students: studentsData.filter(s => selectedStudentIds.has(s.id)).map(s => ({
                id: s.id,
                name: s.name,
                gender: s.gender,
                avatar_url: s.avatar_url
            }))
        };

        if (type === 'pdf') {
            exportBulkViolationsToPDF(options);
            toast.success('Mengunduh Rekap Pelanggaran (PDF)...');
        } else {
            toast.info('Memproses export Excel...');
            await exportBulkViolationsToExcel(options);
            toast.success('Rekap Pelanggaran (Excel) berhasil diunduh!');
        }
    };

    const filterTabs: { value: StudentFilter; label: string }[] = [
        { value: 'all', label: 'Semua' },
        { value: 'selected', label: 'Terpilih' },
        { value: 'unselected', label: 'Belum Dipilih' },
    ];

    return (
        <div className="lg:col-span-3 animate-fade-in-up">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Left Column: Configuration */}
                <div className="lg:col-span-1 space-y-6">
                    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700 p-5 shadow-lg">
                        <h3 className="font-bold text-lg mb-4 text-slate-900 dark:text-white flex items-center gap-2">
                            <SparklesIcon className="w-5 h-5 text-indigo-500" />
                            Konfigurasi
                        </h3>

                        <div className="space-y-4">
                            <div>
                                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2">Kelas</label>
                                <Select
                                    value={selectedClass}
                                    onChange={e => setSelectedClass(e.target.value)}
                                    disabled={isLoadingClasses}
                                    className="h-11 bg-slate-100 dark:bg-white/5 border-slate-200 dark:border-white/10 text-slate-900 dark:text-white rounded-xl"
                                >
                                    {classes?.map(c => <option key={c.id} value={c.id} className="text-slate-900">{c.name}</option>)}
                                </Select>
                            </div>

                            <div>
                                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2">Filter Semester</label>
                                <SemesterSelector value={semesterFilter} onChange={setSemesterFilter} showIcon={true} />
                            </div>
                        </div>
                    </div>

                    {/* Stats Card */}
                    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700 p-5 shadow-lg">
                        <h3 className="font-bold text-lg mb-4 text-slate-900 dark:text-white flex items-center gap-2">
                            <ShieldAlertIcon className="w-5 h-5 text-orange-500" />
                            Statistik
                        </h3>
                        <div className="grid grid-cols-2 gap-3">
                            <div className="p-3 rounded-xl bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800/30 text-center">
                                <p className="text-2xl font-bold text-orange-600 dark:text-orange-400">{violationCount}</p>
                                <p className="text-xs text-orange-500">Pelanggaran</p>
                            </div>
                            <div className="p-3 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800/30 text-center">
                                <p className="text-2xl font-bold text-red-600 dark:text-red-400">{totalPoints}</p>
                                <p className="text-xs text-red-500">Total Poin</p>
                            </div>
                            <div className="p-3 rounded-xl bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800/30 text-center">
                                <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">{uniqueStudentsWithViolations}</p>
                                <p className="text-xs text-blue-500">Siswa Melanggar</p>
                            </div>
                            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 text-center">
                                <p className="text-2xl font-bold text-slate-600 dark:text-slate-400">{selectedStudentIds.size}</p>
                                <p className="text-xs text-slate-500">Dipilih</p>
                            </div>
                        </div>
                    </div>

                    {/* Export Card */}
                    {selectedStudentIds.size > 0 && (
                        <div className="bg-gradient-to-br from-indigo-600 to-purple-600 rounded-2xl p-5 shadow-lg text-white">
                            <h3 className="font-bold text-lg mb-2 flex items-center gap-2">
                                <DownloadIcon className="w-5 h-5" />
                                Export
                            </h3>
                            <div className="grid grid-cols-2 gap-3 mt-4">
                                <Button onClick={() => handleExport('pdf')} className="h-12 bg-indigo-600 hover:bg-indigo-700 border-none text-white rounded-xl font-bold">
                                    <FileTextIcon className="w-5 h-5 mr-2" /> PDF
                                </Button>
                                <Button onClick={() => handleExport('excel')} className="h-12 bg-blue-600 hover:bg-blue-700 border-none text-white rounded-xl font-bold">
                                    <FileSpreadsheetIcon className="w-5 h-5 mr-2" /> Excel
                                </Button>
                            </div>
                        </div>
                    )}
                </div>

                {/* Right Column: Student List */}
                <div className="lg:col-span-2 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-lg flex flex-col overflow-hidden">
                    {/* Search & Filter Tabs */}
                    <div className="p-4 border-b border-slate-200 dark:border-slate-800">
                        <div className="relative mb-3">
                            <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                            <input
                                type="text"
                                placeholder="Cari nama siswa..."
                                value={searchTerm}
                                onChange={e => setSearchTerm(e.target.value)}
                                className="w-full h-10 pl-10 pr-4 rounded-lg bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm text-slate-900 dark:text-white placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                            />
                        </div>
                        <div className="flex gap-2">
                            {filterTabs.map(tab => (
                                <button
                                    key={tab.value}
                                    onClick={() => setStudentFilter(tab.value)}
                                    className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors ${studentFilter === tab.value ? 'bg-indigo-600 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'}`}
                                >
                                    {tab.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Table Header */}
                    <div className="grid grid-cols-12 gap-4 px-4 py-3 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                        <div className="col-span-1 flex items-center">
                            <Checkbox checked={isAllSelected} onChange={e => handleSelectAll(e.target.checked)} />
                        </div>
                        <div className="col-span-7">Nama Siswa</div>
                        <div className="col-span-4 text-right">Status</div>
                    </div>

                    {/* Table Body */}
                    <div className="flex-grow overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800">
                        {isLoadingViolations ? (
                            <div className="p-8 text-center text-sm text-gray-500">Memuat data...</div>
                        ) : filteredStudents.length === 0 ? (
                            <div className="p-8 text-center text-sm text-gray-500">Tidak ada siswa ditemukan.</div>
                        ) : (
                            filteredStudents.map(student => (
                                <div key={student.id} className="grid grid-cols-12 gap-4 items-center px-4 py-3 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                                    <div className="col-span-1 flex items-center">
                                        <Checkbox checked={selectedStudentIds.has(student.id)} onChange={() => handleToggleStudent(student.id)} />
                                    </div>
                                    <div className="col-span-7 flex items-center gap-3">
                                        {/* Student Photo */}
                                        {student.avatar_url ? (
                                            <img
                                                src={student.avatar_url}
                                                alt={student.name}
                                                className="w-9 h-9 rounded-full object-cover shrink-0"
                                                onError={(e) => {
                                                    // Fallback to initials if image fails to load
                                                    e.currentTarget.style.display = 'none';
                                                    if (e.currentTarget.nextElementSibling) {
                                                        (e.currentTarget.nextElementSibling as HTMLElement).style.display = 'flex';
                                                    }
                                                }}
                                            />
                                        ) : null}
                                        <div
                                            className="w-9 h-9 rounded-full bg-gradient-to-br from-purple-400 to-pink-500 flex items-center justify-center text-white font-bold text-sm shrink-0"
                                            style={{ display: student.avatar_url ? 'none' : 'flex' }}
                                        >
                                            {student.name.charAt(0).toUpperCase()}
                                        </div>
                                        <span className="font-medium text-slate-800 dark:text-white uppercase text-sm">{student.name}</span>
                                    </div>
                                    <div className="col-span-4 text-right">
                                        <span className={`text-xs italic ${selectedStudentIds.has(student.id) ? 'text-emerald-500' : 'text-slate-400'}`}>
                                            {selectedStudentIds.has(student.id) ? 'Dipilih' : 'Belum dipilih'}
                                        </span>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};
