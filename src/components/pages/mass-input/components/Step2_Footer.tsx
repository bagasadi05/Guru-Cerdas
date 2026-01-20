import React from 'react';
import { Button } from '../../../ui/Button';
import { XCircleIcon, DownloadIcon, BarChartIcon } from '../../../Icons';
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
    setScores: (scores: Record<string, string>) => void;
    setSelectedStudentIds: (ids: Set<string>) => void;
    isExporting: boolean;
    exportProgress: string;
    handleSubmit: () => void;
    isSubmitDisabled: boolean;
    submitButtonTooltip: string;
    isSubmitting: boolean;
    isDeleting: boolean;
    // New props for export
    scores?: Record<string, string>;
    students?: { id: string; name: string }[];
    subjectGradeInfo?: { subject: string; assessment_name: string };
    className?: string;
    existingViolations?: any[];
    onShowChart?: () => void;
}

export const Step2_Footer: React.FC<Step2_FooterProps> = ({
    summaryText, mode, selectedStudentIds, gradedCount, setScores, setSelectedStudentIds,
    isExporting, exportProgress, handleSubmit, isSubmitDisabled, submitButtonTooltip,
    isSubmitting, isDeleting,
    scores, students, subjectGradeInfo, className, existingViolations, onShowChart
}) => {
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
            });
        } catch (error) {
            toast.error(error instanceof Error ? error.message : 'Gagal export nilai.');
        }
    };

    const { user } = useAuth();
    const toast = useToast();

    const handleViolationExport = async (type: 'pdf' | 'excel') => {
        if (!existingViolations || !students) return;

        const options = {
            studentName: 'Semua Siswa',
            className: className || 'Kelas',
            schoolName: user?.school_name || 'Sekolah',
            violations: existingViolations as ViolationRow[]
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
        <footer className="sticky bottom-4 sm:bottom-6 md:bottom-8 z-30 animate-fade-in-up">
            <div className="bg-white/90 dark:bg-gray-900/80 backdrop-blur-xl border border-slate-200 dark:border-white/10 rounded-2xl p-4 flex flex-col sm:flex-row justify-between items-center gap-4 shadow-2xl shadow-black/10 dark:shadow-black/50 mx-auto max-w-4xl ring-1 ring-slate-200 dark:ring-white/10">
                <div className="flex items-center gap-4">
                    <div className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10">
                        <p className="text-sm font-medium text-green-700 dark:text-green-200">{summaryText}</p>
                    </div>
                    {(mode !== 'subject_grade' && selectedStudentIds.size > 0) || (mode === 'subject_grade' && gradedCount > 0) ? (
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => mode === 'subject_grade' ? setScores({}) : setSelectedStudentIds(new Set())}
                            className="text-gray-400 hover:text-white hover:bg-white/10 transition-colors"
                        >
                            <XCircleIcon className="w-4 h-4 mr-1" /> Bersihkan
                        </Button>
                    ) : null}
                </div>

                <div className="flex items-center gap-2">
                    {/* Chart Button */}
                    {mode === 'subject_grade' && onShowChart && gradedCount > 0 && (
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={onShowChart}
                            className="text-green-400 hover:text-green-300 hover:bg-green-500/10"
                        >
                            <BarChartIcon className="w-4 h-4 mr-1" />
                            Chart
                        </Button>
                    )}

                    {/* Export Button */}
                    {mode === 'subject_grade' && scores && students && gradedCount > 0 && (
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={handleExportExcel}
                            className="text-emerald-400 hover:text-emerald-300 hover:bg-emerald-500/10"
                        >
                            <DownloadIcon className="w-4 h-4 mr-1" />
                            Export
                        </Button>
                    )}

                    {/* Violation Export Button */}
                    {mode === 'violation' && existingViolations && existingViolations.length > 0 && (
                        <DropdownMenu>
                            <DropdownTrigger>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    className="relative gap-2 bg-gradient-to-r from-orange-500/10 to-amber-500/10 border-orange-500/30 text-orange-500 dark:text-orange-400 hover:from-orange-500/20 hover:to-amber-500/20 hover:border-orange-500/50 transition-all duration-300"
                                >
                                    <DownloadIcon className="w-4 h-4" />
                                    <span>Export Data</span>
                                    <span className="absolute -top-2 -right-2 flex items-center justify-center min-w-[20px] h-5 px-1.5 text-[10px] font-bold rounded-full bg-orange-500 text-white shadow-lg shadow-orange-500/30">
                                        {existingViolations.length}
                                    </span>
                                </Button>
                            </DropdownTrigger>
                            <DropdownContent className="min-w-[180px]">
                                <div className="px-3 py-2 border-b border-gray-200 dark:border-gray-700">
                                    <p className="text-xs font-medium text-gray-500 dark:text-gray-400">Export {existingViolations.length} pelanggaran</p>
                                </div>
                                <DropdownItem
                                    onClick={() => handleViolationExport('pdf')}
                                    icon={<FileTextIcon className="w-4 h-4 text-red-500" />}
                                    className="gap-3"
                                >
                                    <div>
                                        <p className="font-medium">PDF (Formal)</p>
                                        <p className="text-xs text-gray-500 dark:text-gray-400">Laporan formal dengan kop</p>
                                    </div>
                                </DropdownItem>
                                <DropdownItem
                                    onClick={() => handleViolationExport('excel')}
                                    icon={<FileSpreadsheetIcon className="w-4 h-4 text-green-600" />}
                                    className="gap-3"
                                >
                                    <div>
                                        <p className="font-medium">Excel</p>
                                        <p className="text-xs text-gray-500 dark:text-gray-400">Data terstruktur untuk analisis</p>
                                    </div>
                                </DropdownItem>
                            </DropdownContent>
                        </DropdownMenu>
                    )}

                    {isExporting ? (
                        <div className="w-full sm:w-64 text-center">
                            <div className="relative pt-1">
                                <div className="overflow-hidden h-2 mb-2 text-xs flex rounded-full bg-white/10">
                                    <div style={{ width: exportProgress }} className="shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center bg-gradient-to-r from-green-500 to-emerald-500 transition-all duration-500 relative">
                                        <div className="absolute inset-0 bg-white/20 animate-pulse"></div>
                                    </div>
                                </div>
                                <p className="text-xs font-bold text-green-300 animate-pulse">{exportProgress} - Memproses...</p>
                            </div>
                        </div>
                    ) : (
                        <Button
                            onClick={handleSubmit}
                            disabled={isSubmitDisabled}
                            title={submitButtonTooltip}
                            className={`
                                w-full sm:w-auto font-bold tracking-wide shadow-lg transition-all duration-300 transform hover:-translate-y-1
                                ${mode === 'delete_subject_grade'
                                    ? 'bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-500 hover:to-red-500 shadow-rose-900/20'
                                    : 'bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-500 hover:to-emerald-500 shadow-green-900/20'
                                }
                            `}
                        >
                            {isSubmitting || isDeleting ? (
                                <span className="flex items-center gap-2">
                                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                                    Memproses...
                                </span>
                            ) : mode === 'delete_subject_grade' ? 'Hapus Nilai Terpilih' : (mode?.includes('print') || mode?.includes('report')) ? 'Cetak Laporan' : 'Simpan Data'}
                        </Button>
                    )}
                </div>
            </div>
        </footer>
    );
};
