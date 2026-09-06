import React, { useState, useMemo } from 'react';
import { Modal } from '../../../ui/Modal';
import { Button } from '../../../ui/Button';
import { FileText, FileSpreadsheet, Users, CheckCircle2, AlertTriangle, Download, Loader2 } from 'lucide-react';
import type { AspectPointsSummary } from '../../../../services/bintangService';

export type BintangExportFormat = 'pdf' | 'excel';
export type BintangExportScope = 'all' | 'selected' | 'evaluated' | 'with_violations';

interface BintangBulkExportModalProps {
    isOpen: boolean;
    onClose: () => void;
    classNameTitle?: string;
    selectedMonth: string;
    students: Array<{ id: string; name: string }>;
    selectedStudentIds: Set<string>;
    evaluations: any[];
    getAspectSummary: (studentId: string) => AspectPointsSummary;
    onExportPdf: (studentIds: string[]) => Promise<void>;
    onExportExcel: (studentIds: string[]) => Promise<void>;
    isExporting: boolean;
    progress: { current: number; total: number } | null;
}

export const BintangBulkExportModal: React.FC<BintangBulkExportModalProps> = ({
    isOpen,
    onClose,
    classNameTitle = 'Kelas',
    selectedMonth,
    students,
    selectedStudentIds,
    evaluations,
    getAspectSummary,
    onExportPdf,
    onExportExcel,
    isExporting,
    progress,
}) => {
    const [format, setFormat] = useState<BintangExportFormat>('pdf');
    const [scope, setScope] = useState<BintangExportScope>(
        selectedStudentIds.size > 0 ? 'selected' : 'all'
    );

    // Compute month label
    const monthLabel = useMemo(() => {
        if (!selectedMonth) return '-';
        const [year, monthNum] = selectedMonth.split('-');
        const d = new Date(parseInt(year, 10), parseInt(monthNum, 10) - 1, 1);
        return d.toLocaleDateString('id-ID', { month: 'long', year: 'numeric' });
    }, [selectedMonth]);

    // Compute target student IDs based on selected scope
    const targetStudents = useMemo(() => {
        switch (scope) {
            case 'selected':
                return students.filter(s => selectedStudentIds.has(s.id));
            case 'evaluated': {
                const evalMap = new Map(evaluations.map(e => [e.student_id, e]));
                return students.filter(s => {
                    const ev = evalMap.get(s.id);
                    return !!ev;
                });
            }
            case 'with_violations':
                return students.filter(s => {
                    const aspect = getAspectSummary(s.id);
                    const totalVioPts = aspect.ADAB.points + aspect.KEDISIPLINAN.points + aspect.KERAPIAN.points;
                    return totalVioPts > 0;
                });
            case 'all':
            default:
                return students;
        }
    }, [scope, students, selectedStudentIds, evaluations, getAspectSummary]);

    const handleExecuteExport = async () => {
        const studentIds = targetStudents.map(s => s.id);
        if (studentIds.length === 0) return;

        if (format === 'pdf') {
            await onExportPdf(studentIds);
        } else {
            await onExportExcel(studentIds);
        }
    };

    const hasSelectedStudents = selectedStudentIds.size > 0;

    return (
        <Modal
            isOpen={isOpen}
            onClose={() => {
                if (!isExporting) onClose();
            }}
            title="Export Bulk Program BINTANG"
        >
            <div className="space-y-6 pt-2">
                {/* Info Card Header */}
                <div className="flex items-center justify-between p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60">
                    <div>
                        <div className="text-xs font-medium text-slate-500 dark:text-slate-400">Target Kelas & Periode</div>
                        <div className="text-sm font-bold text-slate-900 dark:text-white">
                            {classNameTitle} • {monthLabel}
                        </div>
                    </div>
                    <div className="text-right">
                        <div className="text-xs font-medium text-slate-500 dark:text-slate-400">Total Siswa Terdaftar</div>
                        <div className="text-sm font-bold text-brand-600 dark:text-brand-400">
                            {students.length} Siswa
                        </div>
                    </div>
                </div>

                {/* 1. Pilih Format Export */}
                <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2.5">
                        1. Pilih Format Berkas
                    </label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {/* Format PDF */}
                        <button
                            type="button"
                            onClick={() => setFormat('pdf')}
                            disabled={isExporting}
                            className={`flex items-start gap-3 p-3.5 rounded-xl border text-left transition-all ${
                                format === 'pdf'
                                    ? 'border-brand-500 ring-2 ring-brand-500/20 bg-brand-50/40 dark:bg-brand-900/20 text-slate-900 dark:text-white'
                                    : 'border-slate-200 dark:border-slate-700/80 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:border-slate-300 dark:hover:border-slate-600'
                            }`}
                        >
                            <div className={`p-2 rounded-lg shrink-0 ${format === 'pdf' ? 'bg-rose-100 text-rose-600 dark:bg-rose-900/40 dark:text-rose-400' : 'bg-slate-100 text-slate-500 dark:bg-slate-700'}`}>
                                <FileText size={20} />
                            </div>
                            <div>
                                <div className="font-semibold text-sm flex items-center gap-1.5">
                                    PDF Rapor BINTANG
                                    {format === 'pdf' && <span className="text-[10px] bg-brand-100 text-brand-700 dark:bg-brand-900/40 dark:text-brand-300 font-bold px-1.5 py-0.5 rounded">Aktif</span>}
                                </div>
                                <div className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                                    Rapor resmi siap cetak ber-KOP madrasah, tanda tangan wali kelas & wali murid dalam format A4.
                                </div>
                            </div>
                        </button>

                        {/* Format Excel */}
                        <button
                            type="button"
                            onClick={() => setFormat('excel')}
                            disabled={isExporting}
                            className={`flex items-start gap-3 p-3.5 rounded-xl border text-left transition-all ${
                                format === 'excel'
                                    ? 'border-brand-500 ring-2 ring-brand-500/20 bg-brand-50/40 dark:bg-brand-900/20 text-slate-900 dark:text-white'
                                    : 'border-slate-200 dark:border-slate-700/80 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:border-slate-300 dark:hover:border-slate-600'
                            }`}
                        >
                            <div className={`p-2 rounded-lg shrink-0 ${format === 'excel' ? 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/40 dark:text-emerald-400' : 'bg-slate-100 text-slate-500 dark:bg-slate-700'}`}>
                                <FileSpreadsheet size={20} />
                            </div>
                            <div>
                                <div className="font-semibold text-sm flex items-center gap-1.5">
                                    Excel Rekapitulasi (.xlsx)
                                    {format === 'excel' && <span className="text-[10px] bg-brand-100 text-brand-700 dark:bg-brand-900/40 dark:text-brand-300 font-bold px-1.5 py-0.5 rounded">Aktif</span>}
                                </div>
                                <div className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                                    Spreadsheet lengkap: Sheet Ringkasan Nilai, Detail Pelanggaran, dan Poin Keaktifan.
                                </div>
                            </div>
                        </button>
                    </div>
                </div>

                {/* 2. Pilih Cakupan Siswa */}
                <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2.5">
                        2. Tentukan Cakupan Siswa
                    </label>
                    <div className="space-y-2">
                        {/* Semua Siswa */}
                        <label className={`flex items-center justify-between p-3 rounded-xl border cursor-pointer transition-all ${
                            scope === 'all'
                                ? 'border-brand-500 bg-brand-50/30 dark:bg-brand-900/10 text-slate-900 dark:text-white'
                                : 'border-slate-200 dark:border-slate-700/80 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300'
                        }`}>
                            <div className="flex items-center gap-3">
                                <input
                                    type="radio"
                                    name="exportScope"
                                    checked={scope === 'all'}
                                    onChange={() => setScope('all')}
                                    disabled={isExporting}
                                    className="text-brand-600 focus:ring-brand-500"
                                />
                                <div>
                                    <div className="text-sm font-semibold flex items-center gap-1.5">
                                        <Users size={15} className="text-slate-400" /> Semua Siswa di Kelas
                                    </div>
                                    <div className="text-xs text-slate-500 dark:text-slate-400">
                                        Mengekspor seluruh siswa yang terdaftar di {classNameTitle}
                                    </div>
                                </div>
                            </div>
                            <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300">
                                {students.length} siswa
                            </span>
                        </label>

                        {/* Siswa Terpilih (jika ada) */}
                        <label className={`flex items-center justify-between p-3 rounded-xl border transition-all ${
                            !hasSelectedStudents
                                ? 'opacity-40 cursor-not-allowed border-dashed border-slate-200 dark:border-slate-700'
                                : scope === 'selected'
                                    ? 'border-brand-500 bg-brand-50/30 dark:bg-brand-900/10 text-slate-900 dark:text-white cursor-pointer'
                                    : 'border-slate-200 dark:border-slate-700/80 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 cursor-pointer'
                        }`}>
                            <div className="flex items-center gap-3">
                                <input
                                    type="radio"
                                    name="exportScope"
                                    checked={scope === 'selected'}
                                    onChange={() => setScope('selected')}
                                    disabled={isExporting || !hasSelectedStudents}
                                    className="text-brand-600 focus:ring-brand-500"
                                />
                                <div>
                                    <div className="text-sm font-semibold flex items-center gap-1.5">
                                        <CheckCircle2 size={15} className="text-emerald-500" /> Hanya Siswa yang Dipilih (Centang)
                                    </div>
                                    <div className="text-xs text-slate-500 dark:text-slate-400">
                                        {hasSelectedStudents
                                            ? `Berdasarkan ${selectedStudentIds.size} siswa yang sedang dicentang di tabel`
                                            : 'Centang siswa di tabel rekap terlebih dahulu untuk mengaktifkan opsi ini'}
                                    </div>
                                </div>
                            </div>
                            <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-brand-100 dark:bg-brand-900/40 text-brand-700 dark:text-brand-300">
                                {selectedStudentIds.size} siswa
                            </span>
                        </label>

                        {/* Siswa yang Sudah Ada Evaluasi */}
                        <label className={`flex items-center justify-between p-3 rounded-xl border cursor-pointer transition-all ${
                            scope === 'evaluated'
                                ? 'border-brand-500 bg-brand-50/30 dark:bg-brand-900/10 text-slate-900 dark:text-white'
                                : 'border-slate-200 dark:border-slate-700/80 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300'
                        }`}>
                            <div className="flex items-center gap-3">
                                <input
                                    type="radio"
                                    name="exportScope"
                                    checked={scope === 'evaluated'}
                                    onChange={() => setScope('evaluated')}
                                    disabled={isExporting}
                                    className="text-brand-600 focus:ring-brand-500"
                                />
                                <div>
                                    <div className="text-sm font-semibold flex items-center gap-1.5">
                                        <FileText size={15} className="text-blue-500" /> Siswa dengan Evaluasi Saja
                                    </div>
                                    <div className="text-xs text-slate-500 dark:text-slate-400">
                                        Hanya siswa dengan status rapor Draft atau Published
                                    </div>
                                </div>
                            </div>
                            <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300">
                                {evaluations.length} siswa
                            </span>
                        </label>

                        {/* Siswa dengan Pelanggaran */}
                        <label className={`flex items-center justify-between p-3 rounded-xl border cursor-pointer transition-all ${
                            scope === 'with_violations'
                                ? 'border-brand-500 bg-brand-50/30 dark:bg-brand-900/10 text-slate-900 dark:text-white'
                                : 'border-slate-200 dark:border-slate-700/80 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300'
                        }`}>
                            <div className="flex items-center gap-3">
                                <input
                                    type="radio"
                                    name="exportScope"
                                    checked={scope === 'with_violations'}
                                    onChange={() => setScope('with_violations')}
                                    disabled={isExporting}
                                    className="text-brand-600 focus:ring-brand-500"
                                />
                                <div>
                                    <div className="text-sm font-semibold flex items-center gap-1.5">
                                        <AlertTriangle size={15} className="text-amber-500" /> Siswa yang Memiliki Pelanggaran
                                    </div>
                                    <div className="text-xs text-slate-500 dark:text-slate-400">
                                        Hanya siswa yang mencatat poin pelanggaran di bulan ini
                                    </div>
                                </div>
                            </div>
                            <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300">
                                {students.filter(s => {
                                    const a = getAspectSummary(s.id);
                                    return (a.ADAB.points + a.KEDISIPLINAN.points + a.KERAPIAN.points) > 0;
                                }).length} siswa
                            </span>
                        </label>
                    </div>
                </div>

                {/* Progress bar jika sedang exporting */}
                {isExporting && progress && progress.total > 0 && (
                    <div className="p-4 rounded-xl bg-brand-50/60 dark:bg-brand-900/20 border border-brand-200 dark:border-brand-800/60 space-y-2 animate-fade-in">
                        <div className="flex items-center justify-between text-xs font-semibold text-brand-900 dark:text-brand-200">
                            <span className="flex items-center gap-1.5">
                                <Loader2 size={14} className="animate-spin text-brand-600" />
                                Memproses Dokumen {format.toUpperCase()}...
                            </span>
                            <span>
                                {progress.current} / {progress.total} Siswa ({Math.round((progress.current / progress.total) * 100)}%)
                            </span>
                        </div>
                        <div className="h-2 w-full bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                            <div
                                className="h-full bg-brand-600 transition-all duration-300 rounded-full"
                                style={{ width: `${Math.round((progress.current / progress.total) * 100)}%` }}
                            />
                        </div>
                        <div className="text-[11px] text-slate-500 dark:text-slate-400 italic">
                            Mohon tunggu, berkas sedang digenerate dan dikompilasi...
                        </div>
                    </div>
                )}

                {/* Footer Action Buttons */}
                <div className="flex items-center justify-between pt-4 border-t border-slate-200 dark:border-slate-700">
                    <div className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                        Total akan diexport:{' '}
                        <span className="font-bold text-slate-900 dark:text-white">
                            {targetStudents.length} Siswa
                        </span>
                    </div>
                    <div className="flex items-center gap-2">
                        <Button
                            type="button"
                            variant="outline"
                            onClick={onClose}
                            disabled={isExporting}
                        >
                            Batal
                        </Button>
                        <Button
                            type="button"
                            onClick={handleExecuteExport}
                            disabled={isExporting || targetStudents.length === 0}
                            className="flex items-center gap-2"
                        >
                            {isExporting ? (
                                <>
                                    <Loader2 size={16} className="animate-spin" />
                                    <span>Memproses...</span>
                                </>
                            ) : (
                                <>
                                    <Download size={16} />
                                    <span>Download {format.toUpperCase()} ({targetStudents.length})</span>
                                </>
                            )}
                        </Button>
                    </div>
                </div>
            </div>
        </Modal>
    );
};

export default BintangBulkExportModal;
