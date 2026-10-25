import React, { useState, useMemo } from 'react';
import {
    FileText,
    FileSpreadsheet,
    Download,
    CheckCircle2,
    CalendarDays,
    CalendarRange,
    Layers,
    Info,
    Loader2,
} from 'lucide-react';
import { Modal } from '../../../ui/Modal';
import {
    Extracurricular,
    EnrollmentView,
} from '../types';
import {
    MONTH_NAMES_ID,
    AttendanceExportPeriodConfig,
    AttendanceExportFormat,
    AttendanceExportPeriodType,
    resolveAttendancePeriod,
    parseLocalDate,
} from '../extracurricularUtils';

export interface ExtracurricularAttendanceExportModalProps {
    isOpen: boolean;
    onClose: () => void;
    extracurricular: Partial<Extracurricular> | null;
    enrollments: EnrollmentView[];
    activeSemester?: { name: string; semester_number: number } | null;
    selectedDate?: string;
    initialFormat?: AttendanceExportFormat;
    onExport: (config: AttendanceExportPeriodConfig, format: AttendanceExportFormat) => Promise<void>;
}

export const ExtracurricularAttendanceExportModal: React.FC<ExtracurricularAttendanceExportModalProps> = ({
    isOpen,
    onClose,
    extracurricular,
    enrollments,
    activeSemester,
    selectedDate,
    initialFormat = 'pdf',
    onExport,
}) => {
    const { year: curDateYear, month: curDateMonth } = useMemo(
        () => parseLocalDate(selectedDate),
        [selectedDate]
    );

    const defaultAcademicYear = useMemo(() => {
        const startY = curDateMonth >= 6 ? curDateYear : curDateYear - 1;
        return `${startY}/${startY + 1}`;
    }, [curDateMonth, curDateYear]);

    const defaultSemesterType = useMemo((): 'Ganjil' | 'Genap' => {
        if (activeSemester?.name) {
            const lower = activeSemester.name.toLowerCase();
            if (lower.includes('genap') || lower.includes('2')) return 'Genap';
            return 'Ganjil';
        }
        return curDateMonth >= 6 ? 'Ganjil' : 'Genap';
    }, [activeSemester, curDateMonth]);

    const [format, setFormat] = useState<AttendanceExportFormat>(initialFormat);
    const [periodType, setPeriodType] = useState<AttendanceExportPeriodType>('single_month');

    // Single month state
    const [singleMonth, setSingleMonth] = useState<number>(curDateMonth);
    const [singleYear, setSingleYear] = useState<number>(curDateYear);

    // Month range state
    const [startMonth, setStartMonth] = useState<number>(curDateMonth >= 6 ? 6 : 0);
    const [startYear, setStartYear] = useState<number>(curDateYear);
    const [endMonth, setEndMonth] = useState<number>(curDateMonth);
    const [endYear, setEndYear] = useState<number>(curDateYear);

    // Semester state
    const [semesterType, setSemesterType] = useState<'Ganjil' | 'Genap'>(defaultSemesterType);
    const [academicYear, setAcademicYear] = useState<string>(defaultAcademicYear);

    // Options
    const [includeMonthlyDetails, setIncludeMonthlyDetails] = useState<boolean>(true);
    const [isExporting, setIsExporting] = useState<boolean>(false);

    // Current resolved preview
    const previewPeriod = useMemo(() => {
        return resolveAttendancePeriod({
            periodType,
            month: singleMonth,
            year: singleYear,
            startMonth,
            startYear,
            endMonth,
            endYear,
            semesterType,
            academicYear,
            includeMonthlyDetails,
        });
    }, [
        periodType,
        singleMonth,
        singleYear,
        startMonth,
        startYear,
        endMonth,
        endYear,
        semesterType,
        academicYear,
        includeMonthlyDetails,
    ]);

    const handleFormSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (isExporting) return;
        setIsExporting(true);
        try {
            await onExport(
                {
                    periodType,
                    month: singleMonth,
                    year: singleYear,
                    startMonth,
                    startYear,
                    endMonth,
                    endYear,
                    semesterType,
                    academicYear,
                    includeMonthlyDetails,
                    selectedDate,
                },
                format
            );
            onClose();
        } finally {
            setIsExporting(false);
        }
    };

    const yearOptions = useMemo(() => {
        const currentY = new Date().getFullYear();
        return [currentY - 1, currentY, currentY + 1];
    }, []);

    return (
        <Modal
            isOpen={isOpen}
            onClose={isExporting ? () => {} : onClose}
            title="Export Rekap Presensi Ekstrakurikuler"
            maxWidth="max-w-xl"
            icon={<Download className="w-5 h-5 text-amber-500" />}
        >
            <form onSubmit={handleFormSubmit} className="space-y-5">
                {/* Ekskul Identity Badge */}
                <div className="bg-gradient-to-r from-amber-500/10 via-orange-500/10 to-amber-500/5 dark:from-amber-900/20 dark:via-orange-900/10 dark:to-transparent border border-amber-200 dark:border-amber-900/50 rounded-2xl p-3.5">
                    <div className="flex items-center justify-between gap-3">
                        <div>
                            <span className="text-[11px] font-bold uppercase tracking-wider text-amber-700 dark:text-amber-400">
                                Ekstrakurikuler
                            </span>
                            <h4 className="text-base font-bold text-slate-900 dark:text-white">
                                {extracurricular?.name || 'Ekstrakurikuler'}
                            </h4>
                            <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">
                                Pembina: <span className="font-medium text-slate-800 dark:text-slate-200">{extracurricular?.coach_name || '-'}</span> • Jadwal: <span className="font-medium text-slate-800 dark:text-slate-200">{extracurricular?.schedule_day || '-'} {extracurricular?.schedule_time || ''}</span>
                            </p>
                        </div>
                        <div className="text-right shrink-0">
                            <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300">
                                {enrollments.length} Anggota
                            </span>
                        </div>
                    </div>
                </div>

                {/* 1. Format Selection */}
                <div className="space-y-2">
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300">
                        1. Pilih Format Berkas
                    </label>
                    <div className="grid grid-cols-2 gap-3">
                        <button
                            type="button"
                            onClick={() => setFormat('pdf')}
                            className={`flex items-center gap-3 p-3 rounded-xl border text-left transition-all ${
                                format === 'pdf'
                                    ? 'bg-rose-50 border-rose-500 text-rose-900 dark:bg-rose-950/40 dark:border-rose-600 dark:text-rose-200 ring-2 ring-rose-500/20 shadow-sm'
                                    : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:border-slate-300 dark:hover:border-slate-600'
                            }`}
                        >
                            <div
                                className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${
                                    format === 'pdf'
                                        ? 'bg-rose-600 text-white'
                                        : 'bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400'
                                }`}
                            >
                                <FileText className="w-5 h-5" />
                            </div>
                            <div className="min-w-0">
                                <div className="font-bold text-sm flex items-center gap-1.5">
                                    <span>Dokumen PDF</span>
                                    {format === 'pdf' && (
                                        <CheckCircle2 className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0" />
                                    )}
                                </div>
                                <div className="text-xs text-slate-500 dark:text-slate-400 truncate">
                                    Format A4 Landscape & Tanda Tangan
                                </div>
                            </div>
                        </button>

                        <button
                            type="button"
                            onClick={() => setFormat('excel')}
                            className={`flex items-center gap-3 p-3 rounded-xl border text-left transition-all ${
                                format === 'excel'
                                    ? 'bg-emerald-50 border-emerald-500 text-emerald-900 dark:bg-emerald-950/40 dark:border-emerald-600 dark:text-emerald-200 ring-2 ring-emerald-500/20 shadow-sm'
                                    : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:border-slate-300 dark:hover:border-slate-600'
                            }`}
                        >
                            <div
                                className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${
                                    format === 'excel'
                                        ? 'bg-emerald-600 text-white'
                                        : 'bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400'
                                }`}
                            >
                                <FileSpreadsheet className="w-5 h-5" />
                            </div>
                            <div className="min-w-0">
                                <div className="font-bold text-sm flex items-center gap-1.5">
                                    <span>Microsoft Excel</span>
                                    {format === 'excel' && (
                                        <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                                    )}
                                </div>
                                <div className="text-xs text-slate-500 dark:text-slate-400 truncate">
                                    File .xlsx dengan Formula Rekap
                                </div>
                            </div>
                        </button>
                    </div>
                </div>

                {/* 2. Period Selection Tabs / Cards */}
                <div className="space-y-2">
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300">
                        2. Pilih Opsi Periode
                    </label>
                    <div className="grid grid-cols-3 gap-2.5">
                        {/* Option 1: 1 Bulan */}
                        <button
                            type="button"
                            onClick={() => setPeriodType('single_month')}
                            className={`p-3 rounded-xl border text-left transition-all flex flex-col justify-between ${
                                periodType === 'single_month'
                                    ? 'bg-amber-50/80 border-amber-500 text-amber-900 dark:bg-amber-950/40 dark:border-amber-600 dark:text-amber-200 ring-2 ring-amber-500/20 shadow-sm'
                                    : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:border-slate-300 dark:hover:border-slate-600'
                            }`}
                        >
                            <div className="flex items-center justify-between mb-1.5">
                                <CalendarDays className={`w-4 h-4 ${periodType === 'single_month' ? 'text-amber-600 dark:text-amber-400' : 'text-slate-400'}`} />
                                <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${periodType === 'single_month' ? 'bg-amber-200/80 text-amber-900 dark:bg-amber-900 dark:text-amber-200' : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-400'}`}>
                                    Bulanan
                                </span>
                            </div>
                            <div className="font-bold text-xs sm:text-sm">1 Bulan</div>
                            <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 leading-snug">
                                Presensi 1 bulan penuh
                            </div>
                        </button>

                        {/* Option 2: Bulan - Bulan */}
                        <button
                            type="button"
                            onClick={() => setPeriodType('month_range')}
                            className={`p-3 rounded-xl border text-left transition-all flex flex-col justify-between ${
                                periodType === 'month_range'
                                    ? 'bg-amber-50/80 border-amber-500 text-amber-900 dark:bg-amber-950/40 dark:border-amber-600 dark:text-amber-200 ring-2 ring-amber-500/20 shadow-sm'
                                    : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:border-slate-300 dark:hover:border-slate-600'
                            }`}
                        >
                            <div className="flex items-center justify-between mb-1.5">
                                <CalendarRange className={`w-4 h-4 ${periodType === 'month_range' ? 'text-amber-600 dark:text-amber-400' : 'text-slate-400'}`} />
                                <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${periodType === 'month_range' ? 'bg-amber-200/80 text-amber-900 dark:bg-amber-900 dark:text-amber-200' : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-400'}`}>
                                    Rentang
                                </span>
                            </div>
                            <div className="font-bold text-xs sm:text-sm">Bulan - Bulan</div>
                            <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 leading-snug">
                                Rentang beberapa bulan
                            </div>
                        </button>

                        {/* Option 3: Semester */}
                        <button
                            type="button"
                            onClick={() => setPeriodType('semester')}
                            className={`p-3 rounded-xl border text-left transition-all flex flex-col justify-between ${
                                periodType === 'semester'
                                    ? 'bg-amber-50/80 border-amber-500 text-amber-900 dark:bg-amber-950/40 dark:border-amber-600 dark:text-amber-200 ring-2 ring-amber-500/20 shadow-sm'
                                    : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:border-slate-300 dark:hover:border-slate-600'
                            }`}
                        >
                            <div className="flex items-center justify-between mb-1.5">
                                <Layers className={`w-4 h-4 ${periodType === 'semester' ? 'text-amber-600 dark:text-amber-400' : 'text-slate-400'}`} />
                                <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${periodType === 'semester' ? 'bg-amber-200/80 text-amber-900 dark:bg-amber-900 dark:text-amber-200' : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-400'}`}>
                                    Semester
                                </span>
                            </div>
                            <div className="font-bold text-xs sm:text-sm">1 Semester</div>
                            <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 leading-snug">
                                6 bulan pembelajaran
                            </div>
                        </button>
                    </div>
                </div>

                {/* 3. Parameter Inputs based on Period Type */}
                <div className="bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 p-4 rounded-2xl space-y-4">
                    {/* Mode 1: 1 Bulan */}
                    {periodType === 'single_month' && (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <div>
                                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                                    Pilih Bulan
                                </label>
                                <select
                                    value={singleMonth}
                                    onChange={(e) => setSingleMonth(Number(e.target.value))}
                                    aria-label="Pilih Bulan Ekspor"
                                    className="w-full px-3 py-2 text-sm rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-800 dark:text-white focus:ring-2 focus:ring-amber-500"
                                >
                                    {MONTH_NAMES_ID.map((name, idx) => (
                                        <option key={name} value={idx}>
                                            {name}
                                        </option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                                    Tahun
                                </label>
                                <select
                                    value={singleYear}
                                    onChange={(e) => setSingleYear(Number(e.target.value))}
                                    aria-label="Pilih Tahun Ekspor"
                                    className="w-full px-3 py-2 text-sm rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-800 dark:text-white focus:ring-2 focus:ring-amber-500"
                                >
                                    {yearOptions.map((y) => (
                                        <option key={y} value={y}>
                                            {y}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        </div>
                    )}

                    {/* Mode 2: Bulan - Bulan */}
                    {periodType === 'month_range' && (
                        <div className="space-y-3">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                <div className="space-y-1.5">
                                    <span className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1">
                                        Dari Bulan:
                                    </span>
                                    <div className="grid grid-cols-2 gap-2">
                                        <select
                                            value={startMonth}
                                            onChange={(e) => setStartMonth(Number(e.target.value))}
                                            aria-label="Dari Bulan"
                                            className="px-2.5 py-2 text-xs sm:text-sm rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-800 dark:text-white focus:ring-2 focus:ring-amber-500"
                                        >
                                            {MONTH_NAMES_ID.map((name, idx) => (
                                                <option key={name} value={idx}>
                                                    {name}
                                                </option>
                                            ))}
                                        </select>
                                        <select
                                            value={startYear}
                                            onChange={(e) => setStartYear(Number(e.target.value))}
                                            aria-label="Dari Tahun"
                                            className="px-2.5 py-2 text-xs sm:text-sm rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-800 dark:text-white focus:ring-2 focus:ring-amber-500"
                                        >
                                            {yearOptions.map((y) => (
                                                <option key={y} value={y}>
                                                    {y}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                </div>

                                <div className="space-y-1.5">
                                    <span className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1">
                                        Sampai Bulan:
                                    </span>
                                    <div className="grid grid-cols-2 gap-2">
                                        <select
                                            value={endMonth}
                                            onChange={(e) => setEndMonth(Number(e.target.value))}
                                            aria-label="Sampai Bulan"
                                            className="px-2.5 py-2 text-xs sm:text-sm rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-800 dark:text-white focus:ring-2 focus:ring-amber-500"
                                        >
                                            {MONTH_NAMES_ID.map((name, idx) => (
                                                <option key={name} value={idx}>
                                                    {name}
                                                </option>
                                            ))}
                                        </select>
                                        <select
                                            value={endYear}
                                            onChange={(e) => setEndYear(Number(e.target.value))}
                                            aria-label="Sampai Tahun"
                                            className="px-2.5 py-2 text-xs sm:text-sm rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-800 dark:text-white focus:ring-2 focus:ring-amber-500"
                                        >
                                            {yearOptions.map((y) => (
                                                <option key={y} value={y}>
                                                    {y}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Mode 3: 1 Semester */}
                    {periodType === 'semester' && (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <div>
                                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                                    Pilihan Semester
                                </label>
                                <select
                                    value={semesterType}
                                    onChange={(e) => setSemesterType(e.target.value as 'Ganjil' | 'Genap')}
                                    aria-label="Pilih Semester"
                                    className="w-full px-3 py-2 text-sm rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-800 dark:text-white focus:ring-2 focus:ring-amber-500"
                                >
                                    <option value="Ganjil">Semester 1 (Ganjil) • Juli - Desember</option>
                                    <option value="Genap">Semester 2 (Genap) • Januari - Juni</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                                    Tahun Pelajaran
                                </label>
                                <input
                                    type="text"
                                    value={academicYear}
                                    onChange={(e) => setAcademicYear(e.target.value)}
                                    placeholder="2026/2027"
                                    aria-label="Tahun Pelajaran"
                                    className="w-full px-3 py-2 text-sm rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-800 dark:text-white focus:ring-2 focus:ring-amber-500"
                                />
                            </div>
                        </div>
                    )}

                    {/* Additional Option for Multi-month / Semester */}
                    {periodType !== 'single_month' && (
                        <div className="pt-2 border-t border-slate-200 dark:border-slate-700">
                            <label className="flex items-start gap-2.5 cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={includeMonthlyDetails}
                                    onChange={(e) => setIncludeMonthlyDetails(e.target.checked)}
                                    className="mt-0.5 rounded border-slate-300 text-amber-600 focus:ring-amber-500 dark:border-slate-600"
                                />
                                <div className="text-xs text-slate-700 dark:text-slate-300">
                                    <span className="font-semibold text-slate-900 dark:text-white">
                                        Sertakan lembar detail harian per bulan
                                    </span>
                                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                                        {format === 'pdf'
                                            ? 'PDF akan memuat Lembar Rekap Kumulatif di halaman awal diikuti lembar presensi detail untuk tiap-tiap bulan.'
                                            : 'Excel akan memuat Sheet Rekap Kumulatif di tab pertama + Sheet terpisah untuk masing-masing bulan.'}
                                    </p>
                                </div>
                            </label>
                        </div>
                    )}
                </div>

                {/* 4. Resolved Period Summary Badge */}
                <div className="flex items-center gap-2.5 p-3 rounded-xl bg-sky-50 text-sky-900 dark:bg-sky-950/30 dark:text-sky-300 border border-sky-200 dark:border-sky-800/50 text-xs">
                    <Info className="w-4 h-4 text-sky-600 dark:text-sky-400 shrink-0" />
                    <div className="min-w-0">
                        <span className="font-semibold">Target Ekspor: </span>
                        <span>{previewPeriod.titlePeriodText}</span>
                        <div className="text-[11px] text-sky-700 dark:text-sky-400">
                            Rentang: {previewPeriod.startDate} s/d {previewPeriod.endDate} ({previewPeriod.months.length} Bulan)
                        </div>
                    </div>
                </div>

                {/* Actions Footer */}
                <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-100 dark:border-slate-800">
                    <button
                        type="button"
                        onClick={onClose}
                        disabled={isExporting}
                        className="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-sm font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors disabled:opacity-50"
                    >
                        Batal
                    </button>
                    <button
                        type="submit"
                        disabled={isExporting}
                        className={`inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold text-white shadow-md hover:shadow-lg transition-all ${
                            format === 'pdf'
                                ? 'bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-700 hover:to-red-700'
                                : 'bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700'
                        } disabled:opacity-60 disabled:cursor-not-allowed`}
                    >
                        {isExporting ? (
                            <>
                                <Loader2 className="w-4 h-4 animate-spin" />
                                <span>Menyiapkan Berkas...</span>
                            </>
                        ) : (
                            <>
                                <Download className="w-4 h-4" />
                                <span>Download {format === 'pdf' ? 'PDF' : 'Excel'}</span>
                            </>
                        )}
                    </button>
                </div>
            </form>
        </Modal>
    );
};
