import React from 'react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { SemesterSelector } from '../ui/SemesterSelector';

interface ClassData {
    id: string;
    name: string;
}

interface AttendanceExportModalProps {
    isOpen: boolean;
    onClose: () => void;
    onExport: (format: 'pdf' | 'excel') => void;
    isExporting: boolean;
    exportMonth: string;
    setExportMonth: (month: string) => void;
    classes?: ClassData[];
    selectedExportClasses: string[];
    setSelectedExportClasses: (classIds: string[]) => void;
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
    selectedExportClasses,
    setSelectedExportClasses,
    exportPeriod,
    setExportPeriod,
    exportSemesterId,
    setExportSemesterId
}) => {

    const isAllSelected = selectedExportClasses.length === 0;

    const toggleClass = (classId: string, checked: boolean) => {
        if (isAllSelected) {
            if (!checked) {
                setSelectedExportClasses(classes.filter(c => c.id !== classId).map(c => c.id));
            }
        } else {
            if (checked) {
                const currentSelection = selectedExportClasses.filter(id => id !== '_none_');
                const newSelection = [...currentSelection, classId];
                if (newSelection.length === classes.length) {
                    setSelectedExportClasses([]); // Means all
                } else {
                    setSelectedExportClasses(newSelection);
                }
            } else {
                const newSelection = selectedExportClasses.filter(id => id !== classId);
                if (newSelection.length === 0) {
                    setSelectedExportClasses(['_none_']); 
                } else {
                    setSelectedExportClasses(newSelection);
                }
            }
        }
    };

    const isClassSelected = (classId: string) => {
        if (isAllSelected) return true;
        return selectedExportClasses.includes(classId);
    };

    return (
        <Modal title="Export Laporan Absensi" isOpen={isOpen} onClose={onClose}>
            <div className="space-y-4">
                <p className="text-sm text-slate-600 dark:text-slate-400">Pilih kelas dan bulan untuk mengekspor laporan absensi.</p>

                {/* Class Filter (Multi-select) */}
                <div>
                    <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">Pilih Kelas</label>
                    <div className="max-h-48 overflow-y-auto border border-slate-200 dark:border-slate-700 rounded-md p-2 space-y-1 bg-white dark:bg-slate-900">
                        <label className="flex items-center gap-3 cursor-pointer p-2 hover:bg-slate-50 dark:hover:bg-slate-800 rounded transition-colors">
                            <input
                                type="checkbox"
                                checked={isAllSelected}
                                onChange={(e) => {
                                    if (e.target.checked) setSelectedExportClasses([]);
                                    else setSelectedExportClasses(['_none_']);
                                }}
                                className="w-4 h-4 text-emerald-600 rounded border-slate-300 focus:ring-emerald-500"
                            />
                            <span className="text-sm font-bold text-slate-700 dark:text-slate-300">Semua Kelas</span>
                        </label>
                        <div className="h-px bg-slate-100 dark:bg-slate-800 my-1"></div>
                        {classes.map(c => (
                            <label key={c.id} className="flex items-center gap-3 cursor-pointer p-2 hover:bg-slate-50 dark:hover:bg-slate-800 rounded transition-colors ml-2">
                                <input
                                    type="checkbox"
                                    checked={isClassSelected(c.id)}
                                    onChange={(e) => toggleClass(c.id, e.target.checked)}
                                    className="w-4 h-4 text-emerald-600 rounded border-slate-300 focus:ring-emerald-500"
                                />
                                <span className="text-sm text-slate-600 dark:text-slate-400">{c.name}</span>
                            </label>
                        ))}
                    </div>
                </div>

                {/* Period Type Selection */}
                <div className="flex gap-2 p-1 bg-slate-100 dark:bg-slate-800 rounded-lg">
                    <button
                        type="button"
                        onClick={() => setExportPeriod('monthly')}
                        className={`flex-1 h-10 text-sm font-semibold rounded-md transition-all ${exportPeriod === 'monthly' ? 'bg-white shadow text-emerald-600 dark:bg-slate-700 dark:text-emerald-400' : 'text-slate-500 hover:text-slate-700 dark:text-slate-400'}`}
                    >
                        Bulanan
                    </button>
                    <button
                        type="button"
                        onClick={() => setExportPeriod('semester')}
                        className={`flex-1 h-10 text-sm font-semibold rounded-md transition-all ${exportPeriod === 'semester' ? 'bg-white shadow text-emerald-600 dark:bg-slate-700 dark:text-emerald-400' : 'text-slate-500 hover:text-slate-700 dark:text-slate-400'}`}
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
                    <Button type="button" variant="outline" onClick={() => onExport('excel')} disabled={isExporting || selectedExportClasses.includes('_none_')} className="border-emerald-500 text-emerald-600 hover:bg-emerald-50 disabled:opacity-50">
                        {isExporting ? '...' : 'Excel (.xlsx)'}
                    </Button>
                    <Button type="button" onClick={() => onExport('pdf')} disabled={isExporting || selectedExportClasses.includes('_none_')} className="bg-rose-600 hover:bg-rose-700 text-white disabled:opacity-50">
                        {isExporting ? 'Mengekspor...' : 'PDF (.pdf)'}
                    </Button>
                </div>
            </div>
        </Modal>
    );
};
