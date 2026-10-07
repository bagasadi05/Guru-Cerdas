import React from 'react';
import { Button } from '../../../ui/Button';
import { XCircleIcon, DownloadIcon, BarChartIcon, SparklesIcon } from '../../../Icons';
import { InputMode, ViolationRow } from '../types';
import { exportGradesToExcel } from '../../../../utils/gradeExporter';
import { DropdownMenu, DropdownTrigger, DropdownContent, DropdownItem } from '../../../ui/DropdownMenu';
import { FileTextIcon, FileSpreadsheetIcon } from 'lucide-react';
import { exportViolationsToPDF, exportViolationsToExcel } from '../../../../services/violationExport';
import { useAuth } from '../../../../hooks/useAuth';
import { useToast } from '../../../../hooks/useToast';

interface Step2_FooterProps {
    summaryText: string;
    mode: InputMode | null;
    selectedStudentIds: Set<string>;
    gradedCount: number;
    /** Opens the confirmation dialog for the destructive clear action. */
    onClearRequest: () => void;
    isExporting: boolean;
    exportProgress: string;
    // New props for export
    scores?: Record<string, string>;
    students?: { id: string; name: string }[];
    subjectGradeInfo?: { subject: string; assessment_name: string };
    className?: string;
    kkm?: number;
    existingViolations?: any[];
    onShowChart?: () => void;
    onShowAdjustment?: () => void;
    onDeleteSelected?: () => void;
}

export const Step2_Footer: React.FC<Step2_FooterProps> = ({
    summaryText, mode, selectedStudentIds, gradedCount, onClearRequest,
    isExporting, exportProgress,
    scores, students, subjectGradeInfo, className, kkm, existingViolations, onShowChart,
    onShowAdjustment, onDeleteSelected
}) => {
    const { user } = useAuth();
    const toast = useToast();

    const handleExportExcel = async () => {
        if (!scores || !students) return;

        const data = students.map(s => ({
            studentName: s.name,
            studentId: s.id,
            score: scores[s.id] || '',
        }));

        try {
            await exportGradesToExcel(data, {
                filename: `nilai_${subjectGradeInfo?.subject || 'mapel'}_${subjectGradeInfo?.assessment_name || 'penilaian'}.xlsx`,
                subject: subjectGradeInfo?.subject,
                assessmentName: subjectGradeInfo?.assessment_name,
                className: className,
                includeStats: true,
                // Otherwise the exported sheet silently grades against 75.
                kkm,
            });
        } catch (error) {
            toast.error(error instanceof Error ? error.message : 'Gagal export nilai.');
        }
    };

    const handleViolationExport = async (type: 'pdf' | 'excel') => {
        if (!existingViolations || !students) return;

        const options = {
            studentName: 'Semua Siswa',
            className: className || 'Kelas',
            schoolName: user?.school_name || 'Sekolah',
            violations: existingViolations as ViolationRow[],
            teacherName: user?.name
        };

        if (type === 'pdf') {
            await exportViolationsToPDF(options);
            toast.success('Mengunduh Laporan Pelanggaran (PDF)...');
        } else {
            await exportViolationsToExcel(options);
            toast.success('Mengunduh Laporan Pelanggaran (Excel)...');
        }
    };

    return (
        <footer className="mt-6 animate-fade-in-up">
            <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-4 flex flex-col sm:flex-row justify-between items-center gap-4 shadow-sm mx-auto w-full">
                <div className="flex flex-wrap items-center gap-3">
                    <div className="px-3.5 py-2 rounded-xl bg-emerald-50/80 dark:bg-emerald-500/10 border border-emerald-200/80 dark:border-emerald-500/20">
                        <p className="text-xs sm:text-sm font-bold text-emerald-700 dark:text-emerald-300">{summaryText}</p>
                    </div>
                    {(mode !== 'subject_grade' && selectedStudentIds.size > 0) || (mode === 'subject_grade' && gradedCount > 0) ? (
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={onClearRequest}
                            className="min-h-[44px] px-3 rounded-xl text-slate-500 dark:text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-500/10 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-500 font-semibold"
                        >
                            <XCircleIcon className="w-4 h-4 mr-1.5" /> Bersihkan
                        </Button>
                    ) : null}
                </div>

                <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto justify-end">
                    {/* Chart Button */}
                    {mode === 'subject_grade' && onShowChart && gradedCount > 0 && (
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={onShowChart}
                            className="min-h-[44px] px-3.5 rounded-xl border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 font-semibold"
                        >
                            <BarChartIcon className="w-4 h-4 mr-1.5 text-emerald-600 dark:text-emerald-400" />
                            Chart
                        </Button>
                    )}

                    {/* Export Button */}
                    {mode === 'subject_grade' && scores && students && gradedCount > 0 && (
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={handleExportExcel}
                            className="min-h-[44px] px-3.5 rounded-xl border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 font-semibold"
                        >
                            <DownloadIcon className="w-4 h-4 mr-1.5 text-brand-600 dark:text-brand-400" />
                            Export
                        </Button>
                    )}

                    {/* Violation Export Button */}
                    {mode === 'violation' && existingViolations && existingViolations.length > 0 && (
                        <DropdownMenu>
                            <DropdownTrigger className="relative inline-flex items-center gap-2 bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/30 text-amber-700 dark:text-amber-300 hover:bg-amber-100 dark:hover:bg-amber-500/20 transition-all duration-200 text-sm px-3.5 py-2.5 min-h-[44px] rounded-xl font-bold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500">
                                <DownloadIcon className="w-4 h-4" />
                                <span>Export Data</span>
                                <span className="ml-0.5 flex items-center justify-center min-w-[20px] h-5 px-1.5 text-xxs font-bold rounded-full bg-amber-500 text-white shadow-sm">
                                    {existingViolations.length}
                                </span>
                            </DropdownTrigger>
                            <DropdownContent className="min-w-[180px]">
                                <div className="px-3 py-2 border-b border-slate-200 dark:border-slate-700">
                                    <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Export {existingViolations.length} pelanggaran</p>
                                </div>
                                <DropdownItem
                                    onClick={() => handleViolationExport('pdf')}
                                    icon={<FileTextIcon className="w-4 h-4 text-rose-500" />}
                                    className="gap-3"
                                >
                                    <div>
                                        <p className="font-medium">PDF (Formal)</p>
                                        <p className="text-xs text-slate-500 dark:text-slate-400">Laporan formal dengan kop</p>
                                    </div>
                                </DropdownItem>
                                <DropdownItem
                                    onClick={() => handleViolationExport('excel')}
                                    icon={<FileSpreadsheetIcon className="w-4 h-4 text-emerald-600" />}
                                    className="gap-3"
                                >
                                    <div>
                                        <p className="font-medium">Excel</p>
                                        <p className="text-xs text-slate-500 dark:text-slate-400">Data terstruktur untuk analisis</p>
                                    </div>
                                </DropdownItem>
                            </DropdownContent>
                        </DropdownMenu>
                    )}

                    {mode === 'subject_grade' && gradedCount > 0 && onShowAdjustment && (
                        <Button
                            onClick={onShowAdjustment}
                            variant="outline"
                            className="w-full sm:w-auto min-h-[44px] px-4 rounded-xl font-bold border-brand-200 dark:border-brand-800 bg-brand-50/70 dark:bg-brand-500/10 text-brand-700 dark:text-brand-300 hover:bg-brand-100 dark:hover:bg-brand-500/20 shadow-sm flex items-center justify-center gap-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
                        >
                            <SparklesIcon className="w-4 h-4 text-brand-600 dark:text-brand-400" />
                            Katrol & Pratinjau
                        </Button>
                    )}

                    {mode === 'subject_grade' && selectedStudentIds.size > 0 && onDeleteSelected && (
                        <Button
                            onClick={onDeleteSelected}
                            className="w-full sm:w-auto min-h-[44px] px-4 rounded-xl font-bold tracking-wide text-white bg-rose-600 hover:bg-rose-700 shadow-sm flex items-center justify-center gap-2 transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-500"
                        >
                            <XCircleIcon className="w-4 h-4 text-white" />
                            Hapus Nilai Terpilih ({selectedStudentIds.size})
                        </Button>
                    )}

                    {isExporting ? (
                        <div className="w-full sm:w-64 text-center">
                            <div className="relative pt-1">
                                <div className="overflow-hidden h-2 mb-2 text-xs flex rounded-full bg-slate-100 dark:bg-slate-800">
                                    <div style={{ width: exportProgress }} className="shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center bg-emerald-600 transition-all duration-500 relative">
                                        <div className="absolute inset-0 bg-white/20 animate-pulse"></div>
                                    </div>
                                </div>
                                <p className="text-xs font-bold text-emerald-600 dark:text-emerald-300 animate-pulse">{exportProgress} - Memproses...</p>
                            </div>
                        </div>
                    ) : null}
                    {/* Simpan hanya ada di floating save bar supaya tidak ada dua tombol utama
                        dengan aksi yang sama di satu layar (PRD §5.3). */}
                </div>
            </div>
        </footer>
    );
};

