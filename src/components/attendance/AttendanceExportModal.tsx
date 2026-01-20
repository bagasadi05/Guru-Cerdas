import React from 'react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Select } from '../ui/Select';
import { SemesterSelector } from '../ui/SemesterSelector';


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
    exportPeriod: 'monthly' | 'semester';
    setExportPeriod: (period: 'monthly' | 'semester') => void;
    exportSemesterId: string | null;
    setExportSemesterId: (id: string | null) => void;
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
    exportPeriod,
    setExportPeriod,
    exportSemesterId,
    setExportSemesterId
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

                {/* Period Type Selection */}
                <div className="flex gap-4 p-1 bg-slate-100 dark:bg-slate-800 rounded-lg">
                    <button
                        type="button"
                        onClick={() => setExportPeriod('monthly')}
                        className={`flex-1 py-2 text-sm font-bold rounded-md transition-all ${exportPeriod === 'monthly' ? 'bg-white shadow text-green-600 dark:bg-slate-700 dark:text-green-400' : 'text-slate-500 hover:text-slate-700 dark:text-slate-400'}`}
                    >
                        Bulanan
                    </button>
                    <button
                        type="button"
                        onClick={() => setExportPeriod('semester')}
                        className={`flex-1 py-2 text-sm font-bold rounded-md transition-all ${exportPeriod === 'semester' ? 'bg-white shadow text-green-600 dark:bg-slate-700 dark:text-green-400' : 'text-slate-500 hover:text-slate-700 dark:text-slate-400'}`}
                    >
                        Satu Semester
                    </button>
                </div>

                {/* Period Filter Inputs */}
                {exportPeriod === 'monthly' ? (
                    <div>
                        <label htmlFor="export-month" className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">Bulan & Tahun</label>
                        <Input id="export-month" type="month" value={exportMonth} onChange={e => setExportMonth(e.target.value)} className="h-12" />
                    </div>
                ) : (
                    <div>
                        <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">Pilih Semester</label>
                        <SemesterSelector
                            value={exportSemesterId || ''}
                            onChange={(id) => setExportSemesterId(id === 'all' ? null : id)}
                            includeAllOption={false}
                            className="h-12 w-full"
                        />
                    </div>
                )}

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
