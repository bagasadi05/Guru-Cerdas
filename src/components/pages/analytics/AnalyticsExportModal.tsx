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
        await new Promise(resolve => setTimeout(resolve, 500));
        onExport(options);
        setIsExporting(false);
        onClose();
    };

    const allSelected = Object.values(options).every(Boolean);

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
            <Card className="w-full max-w-lg max-h-[85vh] sm:max-h-[90vh] flex flex-col bg-white dark:bg-slate-900 shadow-2xl border-0 rounded-3xl overflow-hidden animate-in zoom-in-95 duration-200">
                {/* Header (Fixed Top) */}
                <div className="relative p-5 sm:p-6 bg-gradient-to-br from-brand-600 to-brand-700 text-white flex-shrink-0">
                    <button
                        type="button"
                        onClick={onClose}
                        className="absolute top-4 right-4 p-1.5 text-white/70 hover:text-white hover:bg-white/10 rounded-full transition-colors"
                        aria-label="Tutup"
                    >
                        <X className="w-5 h-5" />
                    </button>
                    <div className="flex items-center gap-3 mb-2">
                        <div className="p-2.5 bg-white/20 rounded-xl backdrop-blur-md">
                            <FileSpreadsheet className="w-6 h-6 text-white" />
                        </div>
                        <div>
                            <h2 className="text-lg sm:text-xl font-bold">Export Data Analitik</h2>
                            <p className="text-brand-100 text-xs">Unduh laporan ringkas dalam format PDF</p>
                        </div>
                    </div>

                    {/* Context Badges */}
                    <div className="flex flex-wrap gap-2 mt-3 text-xs font-medium text-brand-100">
                        <div className="flex items-center gap-1.5 px-2.5 py-1 bg-white/15 rounded-lg backdrop-blur-sm">
                            <Users className="w-3.5 h-3.5" />
                            {selectedClassLabel}
                        </div>
                        <div className="flex items-center gap-1.5 px-2.5 py-1 bg-white/15 rounded-lg backdrop-blur-sm">
                            <Calendar className="w-3.5 h-3.5" />
                            {dateRangeLabel}
                        </div>
                    </div>
                </div>

                {/* Body (Scrollable Content) */}
                <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-3 custom-scrollbar">
                    <div className="flex items-center justify-between mb-1">
                        <label className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                            Pilih Komponen Laporan
                        </label>
                        <button
                            type="button"
                            onClick={() => handleSelectAll(!allSelected)}
                            className="text-xs font-semibold text-brand-600 dark:text-brand-400 hover:underline"
                        >
                            {allSelected ? 'Hapus Semua' : 'Pilih Semua'}
                        </button>
                    </div>

                    <div className="space-y-2">
                        <OptionItem
                            label="Ringkasan Dashboard"
                            desc="Statistik umum dan grafik ringkas"
                            checked={options.summary}
                            onChange={() => handleToggle('summary')}
                            icon={Activity}
                            color="text-brand-500 bg-brand-50 dark:bg-brand-900/30"
                        />
                        <OptionItem
                            label="Data Siswa"
                            desc="Daftar siswa dan profil singkat"
                            checked={options.students}
                            onChange={() => handleToggle('students')}
                            icon={Users}
                            color="text-blue-500 bg-blue-50 dark:bg-blue-900/30"
                        />
                        <OptionItem
                            label="Kehadiran"
                            desc="Log kehadiran harian dan persentase"
                            checked={options.attendance}
                            onChange={() => handleToggle('attendance')}
                            icon={Calendar}
                            color="text-emerald-500 bg-emerald-50 dark:bg-emerald-900/30"
                        />
                        <OptionItem
                            label="Nilai Akademik"
                            desc="Rekap nilai dan distribusi"
                            checked={options.grades}
                            onChange={() => handleToggle('grades')}
                            icon={GraduationCap}
                            color="text-amber-500 bg-amber-50 dark:bg-amber-900/30"
                        />
                        <OptionItem
                            label="Tugas"
                            desc="Status pengerjaan tugas"
                            checked={options.tasks}
                            onChange={() => handleToggle('tasks')}
                            icon={ClipboardList}
                            color="text-purple-500 bg-purple-50 dark:bg-purple-900/30"
                        />
                        <OptionItem
                            label="Pelanggaran"
                            desc="Catatan perilaku dan poin pelanggaran"
                            checked={options.violations}
                            onChange={() => handleToggle('violations')}
                            icon={AlertTriangle}
                            color="text-red-500 bg-red-50 dark:bg-red-900/30"
                        />
                        <OptionItem
                            label="Keaktifan"
                            desc="Poin kuis dan partisipasi siswa"
                            checked={options.activities}
                            onChange={() => handleToggle('activities')}
                            icon={Activity}
                            color="text-cyan-500 bg-cyan-50 dark:bg-cyan-900/30"
                        />
                    </div>
                </div>

                {/* Footer (Fixed Bottom Buttons) */}
                <div className="p-4 sm:p-5 bg-slate-50 dark:bg-slate-800/50 border-t border-slate-100 dark:border-slate-800 flex gap-3 flex-shrink-0">
                    <Button
                        variant="outline"
                        onClick={onClose}
                        className="flex-1 rounded-xl"
                    >
                        Batal
                    </Button>
                    <Button
                        onClick={handleExportClick}
                        className="flex-1 bg-gradient-to-r from-brand-600 to-brand-700 hover:from-brand-700 hover:to-brand-800 text-white rounded-xl shadow-lg shadow-brand-600/20"
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
        className={`flex items-center p-2.5 sm:p-3 rounded-2xl border cursor-pointer transition-all duration-200 ${checked
            ? 'bg-brand-50/40 dark:bg-brand-950/30 border-brand-300 dark:border-brand-800/60 shadow-sm'
            : 'bg-white dark:bg-slate-800/60 border-slate-200/80 dark:border-slate-700/60 hover:border-slate-300 dark:hover:border-slate-600'
            }`}
    >
        <div className={`p-2 rounded-xl flex-shrink-0 mr-3 ${color}`}>
            <Icon className="w-4 h-4" />
        </div>
        <div className="flex-1 min-w-0 pr-2">
            <h4 className={`text-sm font-bold leading-tight ${checked ? 'text-slate-900 dark:text-white' : 'text-slate-700 dark:text-slate-300'}`}>
                {label}
            </h4>
            <p className="text-xs text-slate-500 dark:text-slate-400 truncate mt-0.5">
                {desc}
            </p>
        </div>
        <div className={`w-5 h-5 rounded-full border flex items-center justify-center flex-shrink-0 transition-all ${checked
            ? 'bg-brand-600 border-brand-500 scale-105 shadow-sm'
            : 'border-slate-300 dark:border-slate-600'
            }`}>
            {checked && <Check className="w-3 h-3 text-white" />}
        </div>
    </div>
);

export default AnalyticsExportModal;
