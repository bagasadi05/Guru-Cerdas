import React, { useState } from 'react';
import { CardTitle, CardDescription } from '../../ui/Card';
import { Button } from '../../ui/Button';
import {
    FileSpreadsheetIcon,
    FileTextIcon,
    AlertCircle,
    BookOpen,
    Loader2
} from 'lucide-react';
import { isTeachingJournalsBackendMissing } from '../../../utils/journalBackend';
import { useTeachingJournals, useTeachingJournalsRekap } from '../../../hooks/useTeachingJournals';
import { exportJournalsToExcel, exportJournalsToPDF } from '../../../services/journalExport';
import { useAuth } from '../../../hooks/useAuth';
import { useToast } from '../../../hooks/useToast';
import type { TeachingJournalFilters } from '../../../types/teachingJournal';

interface JournalRekapPanelProps {
    filters: TeachingJournalFilters;
}

export const JournalRekapPanel: React.FC<JournalRekapPanelProps> = ({ filters }) => {
    const { user } = useAuth();
    const toast = useToast();
    const [isExportingExcel, setIsExportingExcel] = useState(false);
    const [isExportingPdf, setIsExportingPdf] = useState(false);
    const showTeacherColumn = filters.allTeachers === true;

    // Fetch summary rekap data
    const { 
        data: rekap, 
        isLoading: isRekapLoading, 
        error: rekapError, 
        refetch: refetchRekap 
    } = useTeachingJournalsRekap(filters);

    // Fetch detailed journals for PDF export (only active when filters match)
    const { 
        data: journals, 
        isLoading: isJournalsLoading 
    } = useTeachingJournals(filters);

    const isBackendMissing = isTeachingJournalsBackendMissing(rekapError);

    // Helper to format date string
    const formatDate = (dateStr: string | null) => {
        if (!dateStr) return '-';
        try {
            return new Date(dateStr).toLocaleDateString('id-ID', {
                day: '2-digit',
                month: '2-digit',
                year: 'numeric'
            });
        } catch {
            return dateStr;
        }
    };

    const handleExportExcel = async () => {
        if (!rekap || rekap.length === 0) {
            toast.warning('Tidak ada data rekap untuk diekspor.');
            return;
        }
        setIsExportingExcel(true);
        try {
            await exportJournalsToExcel({
                rekap,
                journals,
                schoolName: user?.school_name || 'MI AL IRSYAD KOTA MADIUN',
                teacherName: user?.name,
                className: filters.classId ? rekap[0]?.className : undefined,
                subject: filters.subject,
                startDate: filters.startDate,
                endDate: filters.endDate
            });
            toast.success('File Excel berhasil diunduh!');
        } catch (err) {
            const msg = err instanceof Error ? err.message : String(err);
            toast.error(`Gagal mengekspor Excel: ${msg}`);
        } finally {
            setIsExportingExcel(false);
        }
    };

    const handleExportPdf = async () => {
        if (!journals || journals.length === 0) {
            toast.warning('Tidak ada data jurnal detail untuk diekspor.');
            return;
        }
        setIsExportingPdf(true);
        try {
            await exportJournalsToPDF({
                journals,
                schoolName: user?.school_name || 'MI AL IRSYAD KOTA MADIUN',
                teacherName: user?.name,
                className: filters.classId ? rekap?.[0]?.className : undefined,
                subject: filters.subject,
                startDate: filters.startDate,
                endDate: filters.endDate
            });
            toast.success('File PDF berhasil diunduh!');
        } catch (err) {
            const msg = err instanceof Error ? err.message : String(err);
            toast.error(`Gagal mengekspor PDF: ${msg}`);
        } finally {
            setIsExportingPdf(false);
        }
    };

    if (isRekapLoading) {
        return (
            <div className="space-y-4 animate-pulse">
                <div className="h-16 bg-slate-100 dark:bg-slate-800 rounded-2xl" />
                <div className="h-40 bg-slate-100 dark:bg-slate-800 rounded-2xl" />
            </div>
        );
    }

    if (isBackendMissing) {
        return (
            <div className="p-6 rounded-2xl bg-amber-50/80 dark:bg-indigo-950/20 border border-amber-200 dark:border-indigo-800/30 flex items-start gap-4 animate-fade-in">
                <div className="w-10 h-10 rounded-xl bg-amber-100 dark:bg-indigo-900/40 flex items-center justify-center shrink-0">
                    <AlertCircle className="w-5 h-5 text-amber-600 dark:text-indigo-400" />
                </div>
                <div>
                    <h4 className="font-bold text-slate-900 dark:text-white text-base">
                        Fitur Jurnal Mengajar Belum Aktif
                    </h4>
                    <p className="text-sm text-slate-600 dark:text-slate-300 mt-1 leading-relaxed">
                        Fitur Jurnal Mengajar belum aktif. Silakan jalankan migrasi database di Supabase (`20260621100000_create_teaching_journals.sql`) untuk mengaktifkannya.
                    </p>
                </div>
            </div>
        );
    }

    if (rekapError) {
        return (
            <div className="p-6 rounded-2xl bg-rose-50 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-800/30 flex items-start gap-4 text-rose-600 dark:text-rose-400">
                <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
                <div>
                    <h4 className="font-bold text-slate-900 dark:text-white">Gagal memuat rekap jurnal</h4>
                    <p className="text-sm mt-1">{rekapError instanceof Error ? rekapError.message : String(rekapError)}</p>
                    <Button onClick={() => refetchRekap()} className="mt-3 text-xs bg-rose-600 hover:bg-rose-700 text-white rounded-xl px-3 py-1.5">
                        Coba Lagi
                    </Button>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <CardTitle className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                        <BookOpen className="w-5 h-5 text-emerald-600 dark:text-emerald-400" /> Rekapitulasi Jurnal Mengajar
                    </CardTitle>
                    <CardDescription>
                        Ringkasan kehadiran mengajar dan pencapaian KBM per kelas & mata pelajaran.
                    </CardDescription>
                </div>
                <div className="flex flex-wrap gap-2">
                    <Button
                        onClick={handleExportExcel}
                        disabled={isExportingExcel || !rekap || rekap.length === 0}
                        className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl flex items-center gap-2 px-4 py-2.5 font-medium shadow-sm transition-colors text-sm disabled:opacity-50"
                    >
                        {isExportingExcel ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                            <FileSpreadsheetIcon className="w-4 h-4" />
                        )}
                        Ekspor Excel
                    </Button>
                    <Button
                        onClick={handleExportPdf}
                        disabled={isExportingPdf || isJournalsLoading || !journals || journals.length === 0}
                        className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl flex items-center gap-2 px-4 py-2.5 font-medium shadow-sm transition-colors text-sm disabled:opacity-50"
                    >
                        {isExportingPdf ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                            <FileTextIcon className="w-4 h-4" />
                        )}
                        Ekspor PDF
                    </Button>
                </div>
            </div>

            {!rekap || rekap.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-center border border-dashed border-slate-200 dark:border-slate-800 rounded-2xl">
                    <div className="w-16 h-16 rounded-2xl bg-emerald-50 dark:bg-emerald-950/20 flex items-center justify-center mb-4">
                        <BookOpen className="w-8 h-8 text-emerald-600 dark:text-emerald-400" />
                    </div>
                    <h4 className="text-lg font-semibold text-slate-900 dark:text-white">
                        Belum Ada Data Jurnal
                    </h4>
                    <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 max-w-sm">
                        Belum ada data jurnal mengajar yang terekam pada periode/filter ini.
                    </p>
                </div>
            ) : (
                <div className="bg-white/80 dark:bg-slate-900/60 backdrop-blur-xl rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] transition-all hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)] border border-slate-200 dark:border-slate-800 overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm border-collapse">
                            <thead className="bg-slate-50 dark:bg-slate-950/50 border-b border-slate-200 dark:border-slate-800">
                                <tr>
                                    <th className="px-6 py-4 font-semibold text-slate-900 dark:text-white w-12 text-center">No</th>
                                    {showTeacherColumn && <th className="px-6 py-4 font-semibold text-slate-900 dark:text-white">Guru</th>}
                                    <th className="px-6 py-4 font-semibold text-slate-900 dark:text-white">Kelas</th>
                                    <th className="px-6 py-4 font-semibold text-slate-900 dark:text-white">Mata Pelajaran</th>
                                    <th className="px-6 py-4 font-semibold text-slate-900 dark:text-white text-center">Pertemuan Terisi</th>
                                    <th className="px-6 py-4 font-semibold text-slate-900 dark:text-white text-center">Jurnal Terakhir</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                                {rekap.map((item, index) => (
                                    <tr key={`${item.classId}-${item.subject}-${item.userId || 'me'}`} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                                        <td className="px-6 py-4 text-center text-slate-500 dark:text-slate-400">{index + 1}</td>
                                        {showTeacherColumn && <td className="px-6 py-4 font-medium text-slate-900 dark:text-white">{item.teacherName}</td>}
                                        <td className="px-6 py-4 font-medium text-slate-900 dark:text-white">{item.className}</td>
                                        <td className="px-6 py-4 text-slate-700 dark:text-slate-300">{item.subject}</td>
                                        <td className="px-6 py-4 text-center font-semibold text-emerald-600 dark:text-emerald-400">
                                            {item.journalsFilled}
                                        </td>
                                        <td className="px-6 py-4 text-center text-slate-600 dark:text-slate-400">
                                            {formatDate(item.lastJournalDate)}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </div>
    );
};
