import React, { useState } from 'react';
import { Download, FileSpreadsheet, X, Check, Calendar, Users, GraduationCap, ClipboardList, AlertTriangle, Activity } from 'lucide-react';
import { Card } from '../../ui/Card';
import { Button } from '../../ui/Button';

interface AnalyticsExportModalProps {
    isOpen: boolean;
    onClose: () => void;
    onExport: (selectedOptions: ExportOptions) => void;
    selectedClassLabel: string;
    dateRangeLabel: string;
}

export interface ExportOptions {
    summary: boolean;
    students: boolean;
    attendance: boolean;
    grades: boolean;
    tasks: boolean;
    violations: boolean;
    activities: boolean;
}

const AnalyticsExportModal: React.FC<AnalyticsExportModalProps> = ({
    isOpen,
    onClose,
    onExport,
    selectedClassLabel,
    dateRangeLabel
}) => {
    const [options, setOptions] = useState<ExportOptions>({
        summary: true,
        students: true,
        attendance: true,
        grades: true,
        tasks: true,
        violations: true,
        activities: true
    });

    const [isExporting, setIsExporting] = useState(false);

    if (!isOpen) return null;

    const handleToggle = (key: keyof ExportOptions) => {
        setOptions(prev => ({ ...prev, [key]: !prev[key] }));
    };

    const handleSelectAll = (checked: boolean) => {
        setOptions({
            summary: checked,
            students: checked,
            attendance: checked,
            grades: checked,
            tasks: checked,
            violations: checked,
            activities: checked
        });
    };

    const handleExportClick = async () => {
        setIsExporting(true);
        // Simulate a small delay for better UX or await actual export if needed
        await new Promise(resolve => setTimeout(resolve, 500));
        onExport(options);
        setIsExporting(false);
        onClose();
    };

    const allSelected = Object.values(options).every(Boolean);

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
            <Card className="w-full max-w-md bg-white dark:bg-slate-900 shadow-2xl border-0 overflow-hidden animate-in zoom-in-95 duration-200">
                {/* Header */}
                <div className="relative p-6 bg-gradient-to-br from-indigo-600 to-violet-700">
                    <button
                        onClick={onClose}
                        className="absolute top-4 right-4 p-1 text-white/70 hover:text-white hover:bg-white/10 rounded-full transition-colors"
                    >
                        <X className="w-5 h-5" />
                    </button>
                    <div className="flex items-center gap-3 text-white mb-2">
                        <div className="p-2 bg-white/20 rounded-lg backdrop-blur-md">
                            <FileSpreadsheet className="w-6 h-6" />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold">Export Data Analitik</h2>
                            <p className="text-indigo-100 text-xs">Unduh laporan dalam format PDF</p>
                        </div>
                    </div>

                    {/* Context Info */}
                    <div className="flex gap-2 mt-4 text-xs font-medium text-indigo-100">
                        <div className="flex items-center gap-1.5 px-2 py-1 bg-white/10 rounded-md">
                            <Users className="w-3.5 h-3.5" />
                            {selectedClassLabel}
                        </div>
                        <div className="flex items-center gap-1.5 px-2 py-1 bg-white/10 rounded-md">
                            <Calendar className="w-3.5 h-3.5" />
                            {dateRangeLabel}
                        </div>
                    </div>
                </div>

                {/* Content */}
                <div className="p-6">
                    <div className="flex items-center justify-between mb-4">
                        <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                            Pilih Data Laporan
                        </label>
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleSelectAll(!allSelected)}
                            className="text-xs h-7 px-2"
                        >
                            {allSelected ? 'Hapus Semua' : 'Pilih Semua'}
                        </Button>
                    </div>

                    <div className="space-y-3">
                        <OptionItem
                            label="Ringkasan Dashboard"
                            desc="Statistik umum dan grafik ringkas"
                            checked={options.summary}
                            onChange={() => handleToggle('summary')}
                            icon={Activity}
                            color="text-indigo-500"
                        />
                        <div className="h-px bg-slate-100 dark:bg-slate-800 my-2" />
                        <OptionItem
                            label="Data Siswa"
                            desc="Daftar siswa dan profil singkat"
                            checked={options.students}
                            onChange={() => handleToggle('students')}
                            icon={Users}
                            color="text-blue-500"
                        />
                        <OptionItem
                            label="Kehadiran"
                            desc="Log kehadiran harian dan persentase"
                            checked={options.attendance}
                            onChange={() => handleToggle('attendance')}
                            icon={Calendar}
                            color="text-green-500"
                        />
                        <OptionItem
                            label="Nilai Akademik"
                            desc="Rekap nilai dan distribusi"
                            checked={options.grades}
                            onChange={() => handleToggle('grades')}
                            icon={GraduationCap}
                            color="text-yellow-500"
                        />
                        <OptionItem
                            label="Tugas"
                            desc="Status pengerjaan tugas"
                            checked={options.tasks}
                            onChange={() => handleToggle('tasks')}
                            icon={ClipboardList}
                            color="text-violet-500"
                        />
                        <OptionItem
                            label="Pelanggaran"
                            desc="Catatan pelanggaran siswa"
                            checked={options.violations}
                            onChange={() => handleToggle('violations')}
                            icon={AlertTriangle}
                            color="text-red-500"
                        />
                        <OptionItem
                            label="Keaktifan"
                            desc="Poin kuis dan partisipasi"
                            checked={options.activities}
                            onChange={() => handleToggle('activities')}
                            icon={Activity}
                            color="text-cyan-500"
                        />
                    </div>

                    <div className="mt-8 flex gap-3">
                        <Button
                            variant="outline"
                            onClick={onClose}
                            className="flex-1"
                        >
                            Batal
                        </Button>
                        <Button
                            onClick={handleExportClick}
                            className="flex-1 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 text-white shadow-lg shadow-indigo-500/25"
                            disabled={!Object.values(options).some(Boolean) || isExporting}
                        >
                            {isExporting ? (
                                <>
                                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2" />
                                    Memproses...
                                </>
                            ) : (
                                <>
                                    <Download className="w-4 h-4 mr-2" />
                                    Download PDF
                                </>
                            )}
                        </Button>
                    </div>
                </div>
            </Card>
        </div>
    );
};

interface OptionItemProps {
    label: string;
    desc: string;
    checked: boolean;
    onChange: () => void;
    icon: React.ElementType;
    color: string;
}

const OptionItem: React.FC<OptionItemProps> = ({ label, desc, checked, onChange, icon: Icon, color }) => (
    <div
        onClick={onChange}
        className={`flex items-center p-3 rounded-xl border cursor-pointer transition-all duration-200 ${checked
            ? 'bg-indigo-50/50 dark:bg-indigo-900/10 border-indigo-200 dark:border-indigo-800/50'
            : 'bg-white dark:bg-slate-800 border-slate-100 dark:border-slate-700 hover:border-indigo-100 dark:hover:border-slate-600'
            }`}
    >
        <div className={`p-2 rounded-lg bg-white dark:bg-slate-700 shadow-sm mr-3 ${color}`}>
            <Icon className="w-4 h-4" />
        </div>
        <div className="flex-1">
            <h4 className={`text-sm font-medium ${checked ? 'text-indigo-900 dark:text-indigo-100' : 'text-slate-700 dark:text-slate-300'}`}>
                {label}
            </h4>
            <p className="text-xs text-slate-500 dark:text-slate-400">
                {desc}
            </p>
        </div>
        <div className={`w-5 h-5 rounded-full border flex items-center justify-center transition-colors ${checked
            ? 'bg-indigo-500 border-indigo-500'
            : 'border-slate-300 dark:border-slate-600'
            }`}>
            {checked && <Check className="w-3 h-3 text-white" />}
        </div>
    </div>
);

export default AnalyticsExportModal;
