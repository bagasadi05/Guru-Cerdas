import React from 'react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Select } from '../ui/Select';

interface ClassData {
    id: string;
    name: string;
}

import { SemesterWithYear } from '../../contexts/SemesterContext';

interface AttendanceExportModalProps {
    isOpen: boolean;
    onClose: () => void;
    onExport: (format: 'pdf' | 'excel') => void;
    isExporting: boolean;
    exportMonth: string;
    setExportMonth: (month: string) => void;
    classes?: ClassData[];
    selectedExportClass: string;
    setSelectedExportClass: (classId: string) => void;
    // New props for semester export
    exportScope: 'month' | 'semester';
    setExportScope: (scope: 'month' | 'semester') => void;
    semesters?: SemesterWithYear[];
    selectedSemesterId: string;
    setSelectedSemesterId: (id: string) => void;
}

export const AttendanceExportModal: React.FC<AttendanceExportModalProps> = ({
    isOpen,
    onClose,
    onExport,
    isExporting,
    exportMonth,
    setExportMonth,
    classes = [],
    selectedExportClass,
    setSelectedExportClass,
    exportScope = 'month',
    setExportScope,
    semesters = [],
    selectedSemesterId,
    setSelectedSemesterId
}) => {
    return (
        <Modal title="Export Laporan Absensi" isOpen={isOpen} onClose={onClose}>
            <div className="space-y-4">
                <p className="text-sm text-slate-600 dark:text-slate-400">Pilih kelas dan bulan untuk mengekspor laporan absensi.</p>

                {/* Class Filter */}
                <div>
                    <label htmlFor="export-class" className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">Pilih Kelas</label>
                    <Select
                        id="export-class"
                        value={selectedExportClass}
                        onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setSelectedExportClass(e.target.value)}
                        className="h-12"
                    >
                        <option value="all">📚 Semua Kelas</option>
                        {classes.map(c => (
                            <option key={c.id} value={c.id}>{c.name}</option>
                        ))}
                    </Select>
                </div>

                {/* Month Picker */}
                <div>
                    <div className="flex items-center justify-between mb-2">
                        <label className="block text-sm font-bold text-slate-700 dark:text-slate-300">Periode Laporan</label>
                        <div className="flex bg-slate-100 dark:bg-slate-800 rounded-lg p-1">
                            <button
                                type="button"
                                onClick={() => setExportScope('month')}
                                className={`px-3 py-1 text-xs font-medium rounded-md transition-all ${exportScope === 'month'
                                    ? 'bg-white dark:bg-slate-600 text-indigo-600 dark:text-indigo-400 shadow-sm'
                                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-700'
                                    }`}
                            >
                                Bulanan
                            </button>
                            <button
                                type="button"
                                onClick={() => setExportScope('semester')}
                                className={`px-3 py-1 text-xs font-medium rounded-md transition-all ${exportScope === 'semester'
                                    ? 'bg-white dark:bg-slate-600 text-indigo-600 dark:text-indigo-400 shadow-sm'
                                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-700'
                                    }`}
                            >
                                Semester
                            </button>
                        </div>
                    </div>

                    {exportScope === 'month' ? (
                        <Input
                            id="export-month"
                            type="month"
                            value={exportMonth}
                            onChange={e => setExportMonth(e.target.value)}
                            className="h-12"
                        />
                    ) : (
                        <Select
                            id="export-semester"
                            value={selectedSemesterId}
                            onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setSelectedSemesterId(e.target.value)}
                            className="h-12"
                        >
                            <option value="" disabled>Pilih Semester</option>
                            {semesters.map((s: SemesterWithYear) => {
                                const yearLabel = s.academic_years ? `${s.academic_years.name} ` : '';
                                const semesterLabel = s.semester_number === 1 ? 'Ganjil' : 'Genap';
                                return (
                                    <option key={s.id} value={s.id}>
                                        {yearLabel}{semesterLabel} ({new Date(s.start_date).getFullYear()})
                                    </option>
                                );
                            })}
                        </Select>
                    )}
                </div>

                <div className="flex justify-end gap-3 pt-4">
                    <Button type="button" variant="ghost" onClick={onClose} disabled={isExporting}>Batal</Button>
                    <Button type="button" variant="outline" onClick={() => onExport('excel')} disabled={isExporting} className="border-emerald-500 text-emerald-600 hover:bg-emerald-50">
                        {isExporting ? '...' : 'Excel (.xlsx)'}
                    </Button>
                    <Button type="button" onClick={() => onExport('pdf')} disabled={isExporting} className="bg-rose-600 hover:bg-rose-700 text-white">
                        {isExporting ? 'Mengekspor...' : 'PDF (.pdf)'}
                    </Button>
                </div>
            </div>
        </Modal>
    );
};
