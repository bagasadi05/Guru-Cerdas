import React, { useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useReactToPrint } from 'react-to-print';
import { useAuth } from '../../hooks/useAuth';
import { usePhScheduleDomain, PERIOD_PRESETS } from './engine/usePhScheduleDomain';
import { PhScheduleEngine } from './engine/PhScheduleEngine';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Modal } from '../ui/Modal';
import { CustomDropdown } from '../ui/CustomDropdown';
import { ConfirmationDialog } from '../ui/ConfirmationDialog';
import { DropdownMenu, DropdownTrigger, DropdownContent, DropdownItem } from '../ui/DropdownMenu';
import {
    CalendarIcon,
    ClockIcon,
    PlusIcon,
    EditIcon,
    TrashIcon,
    CopyIcon,
    MoreVerticalIcon,
    ClipboardPenIcon,
    SearchIcon,
    AlertTriangleIcon,
    Share2Icon,
    PrinterIcon,
    CheckCircleIcon,
    XIcon,
} from '../Icons';
import { getColorForSubject } from '../../utils/scheduleUtils';
import type { PhScheduleRow } from '../../types';

export interface PhScheduleTabProps {
    externalOpenAdd?: boolean;
    onResetExternalOpenAdd?: () => void;
    externalTriggerWa?: boolean;
    onResetExternalTriggerWa?: () => void;
    externalTriggerPrint?: boolean;
    onResetExternalTriggerPrint?: () => void;
    externalTriggerIcs?: boolean;
    onResetExternalTriggerIcs?: () => void;
    selectedClassId?: string;
    onSelectClassId?: (classId: string) => void;
    onCanManageChange?: (canManage: boolean) => void;
}

export const PhScheduleTab: React.FC<PhScheduleTabProps> = ({
    externalOpenAdd,
    onResetExternalOpenAdd,
    externalTriggerWa,
    onResetExternalTriggerWa,
    externalTriggerPrint,
    onResetExternalTriggerPrint,
    externalTriggerIcs,
    onResetExternalTriggerIcs,
    selectedClassId: externalSelectedClassId,
    onSelectClassId,
    onCanManageChange,
}) => {
    const { loading: authLoading } = useAuth();
    const navigate = useNavigate();
    const printSheetRef = useRef<HTMLDivElement>(null);

    const domain = usePhScheduleDomain({
        externalSelectedClassId,
        onSelectClassId,
        onCanManageChange,
    });

    const handleExecutePrint = useReactToPrint({
        contentRef: printSheetRef,
        documentTitle: `Agenda_PH_${domain.currentClassName}`,
        pageStyle: `
            @page { size: A4 portrait; margin: 12mm; }
            @media print {
                body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
            }
        `,
    });

    const handleTriggerPrint = () => {
        domain.setIsPrintModalOpen(true);
    };

    // External triggers from SchedulePage header
    useEffect(() => {
        if (externalOpenAdd) {
            domain.openAdd();
            onResetExternalOpenAdd?.();
        }
    }, [externalOpenAdd, domain, onResetExternalOpenAdd]);

    useEffect(() => {
        if (externalTriggerWa) {
            domain.setIsWaModalOpen(true);
            onResetExternalTriggerWa?.();
        }
    }, [externalTriggerWa, domain, onResetExternalTriggerWa]);

    useEffect(() => {
        if (externalTriggerPrint) {
            domain.setIsPrintModalOpen(true);
            onResetExternalTriggerPrint?.();
        }
    }, [externalTriggerPrint, domain, onResetExternalTriggerPrint]);

    useEffect(() => {
        if (externalTriggerIcs) {
            domain.handleExportIcs();
            onResetExternalTriggerIcs?.();
        }
    }, [externalTriggerIcs, domain, onResetExternalTriggerIcs]);

    const handleInputNilai = useCallback(
        (item: PhScheduleRow) => {
            navigate('/input-massal', {
                state: {
                    prefill: {
                        mode: 'form',
                        classId: item.class_id,
                        subject: item.subject,
                        assessment_name: `PH ${item.subject}`,
                    },
                },
            });
        },
        [navigate]
    );

    const isPending = domain.createMutation.isPending || domain.updateMutation.isPending;

    if (authLoading) {
        return (
            <div className="py-20 flex flex-col items-center justify-center text-slate-400 gap-3">
                <div className="w-10 h-10 border-3 border-brand-500 border-t-transparent rounded-full animate-spin" />
                <p className="text-sm">Memuat data jadwal...</p>
            </div>
        );
    }

    return (
        <div className="space-y-6 animate-fade-in">
            {/* Stat Summary Cards Bar */}
            {domain.effectiveClassId && domain.selectedSemesterId && !domain.isLoadingSchedules && domain.rawSchedules.length > 0 && (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
                    <div className="bg-white/90 dark:bg-[#111c2e]/80 backdrop-blur-md rounded-2xl border border-slate-200/80 dark:border-[#1c2b44] p-4 shadow-sm flex items-center gap-3.5">
                        <div className="w-11 h-11 rounded-xl bg-brand-50 dark:bg-brand-500/10 text-brand-600 dark:text-brand-400 flex items-center justify-center shrink-0 border border-brand-200/60 dark:border-brand-500/20">
                            <CalendarIcon className="w-5 h-5" />
                        </div>
                        <div className="min-w-0">
                            <div className="text-xs font-semibold text-slate-500 dark:text-slate-400">Total Jadwal PH</div>
                            <div className="text-xl font-bold text-slate-900 dark:text-white font-serif">{domain.statusCounts.all} PH</div>
                            <div className="text-xxs text-slate-400 truncate">Terjadwal di semester ini</div>
                        </div>
                    </div>

                    <div className="bg-white/90 dark:bg-[#111c2e]/80 backdrop-blur-md rounded-2xl border border-slate-200/80 dark:border-[#1c2b44] p-4 shadow-sm flex items-center gap-3.5">
                        <div className="w-11 h-11 rounded-xl bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0 border border-blue-200/60 dark:border-blue-500/20">
                            <ClockIcon className="w-5 h-5" />
                        </div>
                        <div className="min-w-0">
                            <div className="text-xs font-semibold text-slate-500 dark:text-slate-400">PH Mendatang</div>
                            <div className="text-xl font-bold text-blue-600 dark:text-blue-400 font-serif">{domain.statusCounts.upcoming} PH</div>
                            <div className="text-xxs text-slate-400 truncate">
                                {domain.nextUpcomingPh
                                    ? `Terdekat: ${domain.nextUpcomingPh.subject} (${PhScheduleEngine.getRelativeDateLabel(domain.nextUpcomingPh.date)})`
                                    : 'Tidak ada PH mendatang'}
                            </div>
                        </div>
                    </div>

                    <div className="bg-white/90 dark:bg-[#111c2e]/80 backdrop-blur-md rounded-2xl border border-slate-200/80 dark:border-[#1c2b44] p-4 shadow-sm flex items-center gap-3.5">
                        <div className="w-11 h-11 rounded-xl bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0 border border-emerald-200/60 dark:border-emerald-500/20">
                            <CheckCircleIcon className="w-5 h-5" />
                        </div>
                        <div className="min-w-0">
                            <div className="text-xs font-semibold text-slate-500 dark:text-slate-400">PH Terlaksana</div>
                            <div className="text-xl font-bold text-emerald-600 dark:text-emerald-400 font-serif">{domain.statusCounts.past} PH</div>
                            <div className="text-xxs text-slate-400 truncate">
                                {domain.statusCounts.today > 0 ? `✨ ${domain.statusCounts.today} PH hari ini!` : 'Selesai diuji'}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Schedule Anomaly Alerts */}
            {domain.scheduleAnomalies.conflicts.length > 0 && (
                <div className="bg-rose-50 dark:bg-rose-500/10 rounded-2xl border border-rose-200 dark:border-rose-500/20 p-4 flex items-start gap-3">
                    <AlertTriangleIcon className="w-5 h-5 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
                    <div className="space-y-1 text-xs sm:text-sm">
                        <h4 className="font-bold text-rose-800 dark:text-rose-300">Peringatan Bentrok Jadwal PH Terdeteksi!</h4>
                        <ul className="list-disc list-inside text-rose-700 dark:text-rose-400 space-y-0.5">
                            {domain.scheduleAnomalies.conflicts.map((c, i) => (
                                <li key={i}>
                                    Tanggal <strong>{PhScheduleEngine.formatDateHeading(c.date)}</strong> (Jam {c.period}): {c.subjects.join(' dan ')} dijadwalkan bersamaan.
                                </li>
                            ))}
                        </ul>
                    </div>
                </div>
            )}

            {domain.scheduleAnomalies.heavyDays.length > 0 && (
                <div className="bg-amber-50 dark:bg-amber-500/10 rounded-2xl border border-amber-200 dark:border-amber-500/20 p-3.5 flex items-start gap-3">
                    <AlertTriangleIcon className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                    <div className="text-xs text-amber-800 dark:text-amber-300">
                        <span className="font-bold">Info Kepadatan Ujian: </span>
                        {domain.scheduleAnomalies.heavyDays.map((h, i) => (
                            <span key={i}>
                                Tanggal <strong>{PhScheduleEngine.formatDateHeading(h.date)}</strong> memiliki {h.count} PH dalam sehari. Pastikan tidak melebihi beban belajar siswa.
                            </span>
                        ))}
                    </div>
                </div>
            )}

            {/* Filter & Action Card */}
            <div className="bg-white/95 dark:bg-[#111c2e]/80 backdrop-blur-xl rounded-2xl border border-slate-200/80 dark:border-[#1c2b44] p-3 sm:p-3.5 shadow-sm dark:shadow-[0_0_0_1px_rgba(28,43,68,0.8),0_4px_20px_-2px_rgba(0,0,0,0.4)] space-y-3 sm:space-y-3.5">
                <div className="grid grid-cols-2 gap-2 sm:gap-2.5">
                    <div className="space-y-1">
                        <label className="block text-[10px] sm:text-[11px] font-bold tracking-wider text-slate-400 dark:text-[#64748b] uppercase">
                            KELAS
                        </label>
                        <CustomDropdown
                            value={domain.effectiveClassId}
                            onChange={domain.handleSelectClass}
                            options={domain.classes.map((c) => ({ value: c.id, label: c.name }))}
                            placeholder="Pilih Kelas"
                        />
                    </div>
                    <div className="space-y-1">
                        <label className="block text-[10px] sm:text-[11px] font-bold tracking-wider text-slate-400 dark:text-[#64748b] uppercase">
                            SEMESTER
                        </label>
                        <CustomDropdown
                            value={domain.selectedSemesterId}
                            onChange={domain.setSelectedSemesterId}
                            options={domain.semesterOptions}
                            placeholder="Pilih Semester"
                        />
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    <div className="flex items-center border border-slate-200 dark:border-[#1c2b44] rounded-xl bg-slate-100/70 dark:bg-[#0f1828]/60 p-0.5">
                        <button
                            type="button"
                            onClick={() => domain.setIsWaModalOpen(true)}
                            disabled={domain.rawSchedules.length === 0}
                            className="w-9 h-9 rounded-lg flex items-center justify-center text-slate-500 dark:text-[#94a3b8] hover:text-slate-900 dark:hover:text-white hover:bg-white dark:hover:bg-[#111c2e] disabled:opacity-40 transition-colors"
                            title="Salin Jadwal untuk WhatsApp"
                            aria-label="Bagikan WhatsApp"
                        >
                            <Share2Icon className="w-4 h-4" />
                        </button>
                        <button
                            type="button"
                            onClick={handleTriggerPrint}
                            disabled={domain.rawSchedules.length === 0}
                            className="w-9 h-9 rounded-lg flex items-center justify-center text-slate-500 dark:text-[#94a3b8] hover:text-slate-900 dark:hover:text-white hover:bg-white dark:hover:bg-[#111c2e] disabled:opacity-40 transition-colors"
                            title="Cetak Jadwal PH"
                            aria-label="Cetak"
                        >
                            <PrinterIcon className="w-4 h-4" />
                        </button>
                        <button
                            type="button"
                            onClick={domain.handleExportIcs}
                            disabled={domain.rawSchedules.length === 0}
                            className="w-9 h-9 rounded-lg flex items-center justify-center text-slate-500 dark:text-[#94a3b8] hover:text-slate-900 dark:hover:text-white hover:bg-white dark:hover:bg-[#111c2e] disabled:opacity-40 transition-colors"
                            title="Ekspor Jadwal PH ke Kalender (.ics)"
                            aria-label="Kalender ICS"
                        >
                            <CalendarIcon className="w-4 h-4" />
                        </button>
                    </div>

                    {domain.canManage && (
                        <button
                            type="button"
                            onClick={domain.openAdd}
                            className="flex-1 h-10 bg-[#00d284] hover:bg-[#00ba74] text-slate-950 font-bold text-[13px] rounded-xl flex items-center justify-center gap-1.5 transition-all shadow-[0_4px_14px_0_rgba(0,210,132,0.25)] active:scale-[0.98] whitespace-nowrap px-3"
                        >
                            <PlusIcon className="w-4 h-4 stroke-[2.5] shrink-0" />
                            <span className="whitespace-nowrap">Tambah PH</span>
                        </button>
                    )}
                </div>

                {/* Search & Month Filter */}
                <div className="flex items-center gap-2">
                    <div className="relative flex-1 min-w-0">
                        <SearchIcon className="w-4 h-4 text-slate-400 dark:text-[#64748b] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                        <Input
                            type="text"
                            placeholder="Cari mata pelajaran PH..."
                            value={domain.searchQuery}
                            onChange={(e) => domain.setSearchQuery(e.target.value)}
                            className="w-full bg-slate-50 dark:bg-[#0f1828] border border-slate-200 dark:border-[#1f314d] text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-[#64748b] text-[13px] rounded-xl py-2.5 pl-10 pr-8 focus:outline-none focus:border-emerald-500 dark:focus:border-[#00d284]/80 transition-colors h-10"
                        />
                        {domain.searchQuery && (
                            <button
                                type="button"
                                onClick={() => domain.setSearchQuery('')}
                                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                            >
                                <XIcon className="w-4 h-4" />
                            </button>
                        )}
                    </div>
                    {domain.availableMonths.length > 0 && (
                        <div className="w-28 sm:w-36 shrink-0">
                            <CustomDropdown
                                value={domain.selectedMonth}
                                onChange={domain.setSelectedMonth}
                                options={[{ value: 'all', label: 'Semua Bulan' }, ...domain.availableMonths]}
                                placeholder="Bulan"
                            />
                        </div>
                    )}
                </div>

                {/* Filter Pills & View Mode */}
                <div className="flex items-center justify-between pt-0.5">
                    <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-hide py-0.5 min-w-0">
                        <button
                            type="button"
                            onClick={() => domain.setStatusFilter('all')}
                            className={`px-2.5 py-1.5 rounded-lg font-semibold text-[11px] whitespace-nowrap shadow-sm shrink-0 transition-all ${
                                domain.statusFilter === 'all'
                                    ? 'bg-slate-700/80 dark:bg-slate-700/90 text-white border border-slate-600'
                                    : 'text-slate-600 dark:text-[#94a3b8] hover:bg-slate-100 dark:hover:bg-[#0f1828]'
                            }`}
                        >
                            Semua ({domain.statusCounts.all})
                        </button>
                        <button
                            type="button"
                            onClick={() => domain.setStatusFilter('today')}
                            className={`px-2.5 py-1.5 rounded-lg font-medium text-[11px] whitespace-nowrap shrink-0 transition-colors ${
                                domain.statusFilter === 'today'
                                    ? 'bg-emerald-500 text-white shadow-sm font-semibold'
                                    : 'text-emerald-600 dark:text-[#00d284] hover:bg-slate-100 dark:hover:bg-[#0f1828]'
                            }`}
                        >
                            Hari Ini ({domain.statusCounts.today})
                        </button>
                        <button
                            type="button"
                            onClick={() => domain.setStatusFilter('upcoming')}
                            className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg font-medium text-[11px] whitespace-nowrap shrink-0 transition-colors ${
                                domain.statusFilter === 'upcoming'
                                    ? 'bg-blue-500 text-white shadow-sm font-semibold'
                                    : 'text-blue-500 dark:text-blue-400 hover:bg-slate-100 dark:hover:bg-[#0f1828]'
                            }`}
                        >
                            <span>Mendatang ({domain.statusCounts.upcoming})</span>
                            <span className="text-[10px]">↑</span>
                        </button>
                        <button
                            type="button"
                            onClick={() => domain.setStatusFilter('past')}
                            className={`px-2.5 py-1.5 rounded-lg font-medium text-[11px] whitespace-nowrap shrink-0 transition-colors ${
                                domain.statusFilter === 'past'
                                    ? 'bg-slate-400 text-white shadow-sm font-semibold'
                                    : 'text-slate-500 dark:text-[#64748b] hover:bg-slate-100 dark:hover:bg-[#0f1828]'
                            }`}
                        >
                            Selesai ({domain.statusCounts.past})
                        </button>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0 ml-2">
                        <button
                            type="button"
                            onClick={() => domain.setSortOrder(domain.sortOrder === 'asc' ? 'desc' : 'asc')}
                            title={domain.sortOrder === 'asc' ? 'Urutan: Tanggal Terdekat' : 'Urutan: Tanggal Terjauh'}
                            className="h-7 px-2 rounded-lg bg-slate-100 dark:bg-[#0f1828] text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white text-[11px] font-semibold flex items-center gap-1 whitespace-nowrap shrink-0 border border-slate-200 dark:border-[#1c2b44]/80 transition-colors"
                        >
                            <span className="font-bold">{domain.sortOrder === 'asc' ? '↑' : '↓'}</span>
                            <span className="hidden sm:inline">{domain.sortOrder === 'asc' ? 'Terdekat' : 'Terjauh'}</span>
                        </button>

                        <div className="flex items-center bg-slate-100 dark:bg-[#0f1828] border border-slate-200 dark:border-[#1c2b44]/80 rounded-lg p-0.5 shrink-0">
                            <button
                                type="button"
                                onClick={() => domain.setViewMode('cards')}
                                title="Tampilan Grid / Kartu"
                                className={`w-7 h-7 rounded flex items-center justify-center transition-all ${
                                    domain.viewMode === 'cards'
                                        ? 'bg-white dark:bg-slate-700 text-brand-600 dark:text-cyan-300 shadow-sm'
                                        : 'text-slate-400 dark:text-[#64748b] hover:text-slate-700 dark:hover:text-white'
                                }`}
                            >
                                <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 16 16">
                                    <rect height="5.5" rx="1.2" width="5.5" x="1" y="1" />
                                    <rect height="5.5" rx="1.2" width="5.5" x="9.5" y="1" />
                                    <rect height="5.5" rx="1.2" width="5.5" x="1" y="9.5" />
                                    <rect height="5.5" rx="1.2" width="5.5" x="9.5" y="9.5" />
                                </svg>
                            </button>
                            <button
                                type="button"
                                onClick={() => domain.setViewMode('table')}
                                title="Tampilan Tabel / Daftar"
                                className={`w-7 h-7 rounded flex items-center justify-center transition-all ${
                                    domain.viewMode === 'table'
                                        ? 'bg-white dark:bg-slate-700 text-brand-600 dark:text-cyan-300 shadow-sm'
                                        : 'text-slate-400 dark:text-[#64748b] hover:text-slate-700 dark:hover:text-white'
                                }`}
                            >
                                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                                    <line x1="8" x2="21" y1="6" y2="6" />
                                    <line x1="8" x2="21" y1="12" y2="12" />
                                    <line x1="8" x2="21" y1="18" y2="18" />
                                    <line x1="3" x2="3.01" y1="6" y2="6" />
                                    <line x1="3" x2="3.01" y1="12" y2="12" />
                                    <line x1="3" x2="3.01" y1="18" y2="18" />
                                </svg>
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Main Content Area */}
            {!domain.effectiveClassId || !domain.selectedSemesterId ? (
                <div className="bg-white dark:bg-[#111c2e]/70 rounded-2xl border border-dashed border-slate-300 dark:border-[#1c2b44] p-8 text-center text-slate-500 dark:text-slate-400 space-y-3">
                    <CalendarIcon className="w-10 h-10 mx-auto text-slate-400 opacity-60" />
                    <p className="text-sm font-semibold">Pilih kelas dan semester di atas untuk melihat jadwal PH.</p>
                </div>
            ) : domain.isLoadingSchedules || domain.isLoadingClasses ? (
                <div className="py-16 flex flex-col items-center justify-center text-slate-400 gap-3">
                    <div className="w-8 h-8 border-3 border-emerald-500 border-t-transparent rounded-full animate-spin" />
                    <p className="text-xs">Memuat jadwal Penilaian Harian...</p>
                </div>
            ) : domain.rawSchedules.length === 0 ? (
                <div className="bg-white/90 dark:bg-[#111c2e]/70 border border-slate-200/80 dark:border-[#1c2b44]/90 rounded-2xl p-6 sm:p-8 flex flex-col items-center text-center space-y-4 shadow-sm dark:shadow-[0_0_0_1px_rgba(28,43,68,0.8),0_4px_20px_-2px_rgba(0,0,0,0.4)] my-2">
                    <div className="w-16 h-16 rounded-2xl bg-gradient-to-b from-cyan-950/60 to-slate-900 border border-cyan-500/30 flex items-center justify-center shadow-[0_0_24px_-2px_rgba(6,182,212,0.2)] text-cyan-400">
                        <svg className="w-8 h-8" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
                            <path d="M12 2l2.4 6.6L21 11l-6.6 2.4L12 20l-2.4-6.6L3 11l6.6-2.4L12 2z" strokeLinejoin="round" />
                            <circle cx="19" cy="5" fill="currentColor" r="1" />
                        </svg>
                    </div>
                    <div className="space-y-1.5 max-w-[280px] sm:max-w-md">
                        <h2 className="text-base font-bold text-slate-900 dark:text-white tracking-tight">Belum Ada Jadwal PH</h2>
                        <p className="text-[13px] text-slate-500 dark:text-[#94a3b8] leading-relaxed">
                            Belum ada agenda penilaian harian yang dijadwalkan untuk {domain.currentClassName} pada semester ini.
                        </p>
                    </div>
                    {domain.canManage && (
                        <button
                            type="button"
                            onClick={domain.openAdd}
                            className="w-full max-w-[280px] py-3 px-3 bg-[#00d284] hover:bg-[#00ba74] text-slate-950 font-bold text-[13px] rounded-xl flex items-center justify-center gap-1.5 transition-all shadow-[0_4px_14px_0_rgba(0,210,132,0.25)] active:scale-[0.98] mt-2 whitespace-nowrap"
                        >
                            <PlusIcon className="w-4 h-4 stroke-[2.5]" />
                            <span>Tambah Jadwal PH</span>
                        </button>
                    )}
                </div>
            ) : domain.filteredSchedules.length === 0 ? (
                <div className="bg-white dark:bg-[#111c2e]/70 rounded-2xl border border-slate-200 dark:border-[#1c2b44] p-8 text-center text-slate-400 space-y-2">
                    <SearchIcon className="w-8 h-8 mx-auto opacity-50 text-slate-400" />
                    <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">Tidak ada jadwal yang cocok</p>
                    <p className="text-xs text-slate-500">Coba ubah kata kunci pencarian atau filter status di atas.</p>
                </div>
            ) : domain.viewMode === 'table' ? (
                /* Table View */
                <div className="bg-white/95 dark:bg-[#111c2e]/80 backdrop-blur-xl rounded-2xl border border-slate-200/80 dark:border-[#1c2b44] overflow-hidden shadow-sm">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs sm:text-sm">
                            <thead className="bg-slate-50 dark:bg-[#0f1828] text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-[#1c2b44] uppercase tracking-wider text-[10px] sm:text-xs">
                                <tr>
                                    <th className="py-3 px-3.5 sm:px-4">Tanggal & Waktu</th>
                                    <th className="py-3 px-3.5 sm:px-4">Mata Pelajaran & Materi</th>
                                    <th className="py-3 px-3.5 sm:px-4">Jam Ke-</th>
                                    <th className="py-3 px-3.5 sm:px-4">Status</th>
                                    <th className="py-3 px-3.5 sm:px-4 text-right">Aksi</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 dark:divide-[#1c2b44]/60">
                                {domain.filteredSchedules.map((item) => {
                                    const st = PhScheduleEngine.getItemStatus(item.date);
                                    const rel = PhScheduleEngine.getRelativeDateLabel(item.date);
                                    return (
                                        <tr key={item.id} className="hover:bg-slate-50/80 dark:hover:bg-[#15233a]/60 transition-colors">
                                            <td className="py-3 px-3.5 sm:px-4 whitespace-nowrap">
                                                <div className="font-semibold text-slate-900 dark:text-white">
                                                    {PhScheduleEngine.formatDateHeading(item.date)}
                                                </div>
                                                {rel && <div className="text-[11px] text-slate-400">{rel}</div>}
                                            </td>
                                            <td className="py-3 px-3.5 sm:px-4">
                                                <span className="font-bold text-slate-800 dark:text-slate-200">{item.subject}</span>
                                            </td>
                                            <td className="py-3 px-3.5 sm:px-4 whitespace-nowrap">
                                                <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-mono text-xs">
                                                    Jam {item.period_label}
                                                </span>
                                            </td>
                                            <td className="py-3 px-3.5 sm:px-4 whitespace-nowrap">
                                                {st === 'today' ? (
                                                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700">
                                                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" /> Hari Ini
                                                    </span>
                                                ) : st === 'upcoming' ? (
                                                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                                                        Mendatang
                                                    </span>
                                                ) : (
                                                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                                                        Selesai
                                                    </span>
                                                )}
                                            </td>
                                            <td className="py-3 px-3.5 sm:px-4 text-right whitespace-nowrap">
                                                <div className="flex items-center justify-end gap-1.5">
                                                    <Button
                                                        type="button"
                                                        size="sm"
                                                        variant="ghost"
                                                        onClick={() => handleInputNilai(item)}
                                                        className="h-8 px-2.5 text-xs text-brand-600 hover:text-brand-700 hover:bg-brand-50 dark:hover:bg-brand-950/30"
                                                        title="Input Nilai PH Siswa"
                                                    >
                                                        <ClipboardPenIcon className="w-3.5 h-3.5 mr-1" />
                                                        <span>Nilai</span>
                                                    </Button>
                                                    {domain.canManage && (
                                                        <>
                                                            <Button
                                                                type="button"
                                                                size="sm"
                                                                variant="ghost"
                                                                onClick={() => domain.openEdit(item)}
                                                                className="h-8 w-8 p-0"
                                                            >
                                                                <EditIcon className="w-3.5 h-3.5" />
                                                            </Button>
                                                            <Button
                                                                type="button"
                                                                size="sm"
                                                                variant="ghost"
                                                                onClick={() => domain.setDeleteConfirm(item)}
                                                                className="h-8 w-8 p-0 text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30"
                                                            >
                                                                <TrashIcon className="w-3.5 h-3.5" />
                                                            </Button>
                                                        </>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>
            ) : (
                /* Cards View (Grouped by Date) */
                <div className="space-y-5">
                    {Array.from(domain.groupedByDate.entries()).map(([date, items]) => {
                        const heading = PhScheduleEngine.formatDateHeading(date);
                        const rel = PhScheduleEngine.getRelativeDateLabel(date);
                        const st = PhScheduleEngine.getItemStatus(date);

                        return (
                            <div key={date} className="space-y-2.5">
                                <div className="flex items-center justify-between pb-1 border-b border-slate-200/80 dark:border-[#1c2b44]">
                                    <div className="flex items-center gap-2">
                                        <h3 className="font-bold text-sm sm:text-base text-slate-800 dark:text-slate-100 flex items-center gap-2">
                                            <CalendarIcon className="w-4 h-4 text-brand-600 dark:text-cyan-400" />
                                            {heading}
                                        </h3>
                                        {rel && (
                                            <span
                                                className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${
                                                    st === 'today'
                                                        ? 'bg-emerald-500 text-white animate-pulse'
                                                        : st === 'upcoming'
                                                        ? 'bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300'
                                                        : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400'
                                                }`}
                                            >
                                                {rel}
                                            </span>
                                        )}
                                    </div>
                                    <span className="text-xs text-slate-400">{items.length} PH</span>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                                    {items.map((item) => {
                                        const subjectColor = getColorForSubject(item.subject);
                                        return (
                                            <div
                                                key={item.id}
                                                className="bg-white/95 dark:bg-[#111c2e]/80 backdrop-blur-md rounded-2xl border border-slate-200/80 dark:border-[#1c2b44] p-4 shadow-sm hover:shadow-md transition-all flex flex-col justify-between gap-3 group"
                                            >
                                                <div className="flex items-start justify-between gap-2">
                                                    <div className="flex items-start gap-2.5 min-w-0">
                                                        <div
                                                            className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 border ${subjectColor}`}
                                                        >
                                                            <CalendarIcon className="w-4 h-4" />
                                                        </div>
                                                        <div className="min-w-0">
                                                            <h4 className="font-bold text-sm text-slate-900 dark:text-white truncate">
                                                                {item.subject}
                                                            </h4>
                                                            <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                                                                <span className="font-mono bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded text-[11px]">
                                                                    Jam Ke-{item.period_label}
                                                                </span>
                                                            </div>
                                                        </div>
                                                    </div>

                                                    {domain.canManage && (
                                                        <DropdownMenu>
                                                            <DropdownTrigger>
                                                                <button
                                                                    type="button"
                                                                    className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
                                                                >
                                                                    <MoreVerticalIcon className="w-4 h-4" />
                                                                </button>
                                                            </DropdownTrigger>
                                                            <DropdownContent align="right">
                                                                <DropdownItem onClick={() => domain.openEdit(item)}>
                                                                    <EditIcon className="w-4 h-4 mr-2" /> Edit Jadwal
                                                                </DropdownItem>
                                                                <DropdownItem onClick={() => domain.handleDuplicate(item)}>
                                                                    <CopyIcon className="w-4 h-4 mr-2" /> Duplikasi ke Formulir
                                                                </DropdownItem>
                                                                <DropdownItem
                                                                    onClick={() => domain.setDeleteConfirm(item)}
                                                                    className="text-rose-600 hover:text-rose-700"
                                                                >
                                                                    <TrashIcon className="w-4 h-4 mr-2" /> Hapus Jadwal
                                                                </DropdownItem>
                                                            </DropdownContent>
                                                        </DropdownMenu>
                                                    )}
                                                </div>

                                                <div className="pt-2 border-t border-slate-100 dark:border-[#1c2b44]/60 flex items-center justify-between">
                                                    <Button
                                                        type="button"
                                                        size="sm"
                                                        variant="primary"
                                                        onClick={() => handleInputNilai(item)}
                                                        className="h-7 px-2.5 text-xs font-bold rounded-lg"
                                                    >
                                                        <ClipboardPenIcon className="w-3.5 h-3.5 mr-1" />
                                                        Input Nilai
                                                    </Button>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* Add / Edit Modal */}
            <Modal
                isOpen={domain.dialogOpen}
                onClose={domain.closeModal}
                title={domain.editingSchedule ? 'Edit Jadwal Penilaian Harian' : 'Tambah Jadwal Penilaian Harian'}
            >
                <form onSubmit={domain.handleSubmit} className="space-y-4 pt-2">
                    <div>
                        <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-1.5">
                            Tanggal Pelaksanaan
                        </label>
                        <Input
                            type="date"
                            value={domain.formData.date}
                            onChange={(e) => domain.setFormData({ ...domain.formData, date: e.target.value })}
                            className="h-11 rounded-xl"
                            required
                        />
                    </div>

                    <div>
                        <div className="flex justify-between items-center mb-1.5">
                            <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider">
                                Mata Pelajaran & Materi PH
                            </label>
                            <span className="text-xxs text-slate-400">Pilih saran atau ketik manual</span>
                        </div>
                        <Input
                            type="text"
                            value={domain.formData.subject}
                            onChange={(e) => domain.setFormData({ ...domain.formData, subject: e.target.value })}
                            placeholder="cth. Matematika (Pecahan & Desimal)"
                            className="h-11 rounded-xl mb-2"
                            required
                        />
                        <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto pr-1">
                            {domain.subjectSuggestions.map((s) => (
                                <button
                                    key={s}
                                    type="button"
                                    onClick={() => domain.setFormData({ ...domain.formData, subject: `${s} ` })}
                                    className="px-2 py-0.5 text-xxs font-medium rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-brand-50 hover:text-brand-600 dark:hover:bg-brand-900/30 transition-colors"
                                >
                                    + {s}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-1.5">
                            Jam Pelajaran Ke-
                        </label>
                        <Input
                            type="text"
                            value={domain.formData.period_label}
                            onChange={(e) => domain.setFormData({ ...domain.formData, period_label: e.target.value })}
                            placeholder="cth. 1-2 atau 7-8"
                            className="h-11 rounded-xl"
                            required
                        />
                        <div className="flex flex-wrap gap-1.5 mt-2">
                            {PERIOD_PRESETS.map((label) => {
                                const isSelected = domain.formData.period_label === label;
                                return (
                                    <button
                                        key={label}
                                        type="button"
                                        onClick={() => domain.setFormData({ ...domain.formData, period_label: label })}
                                        className={`px-3 py-1 text-xs font-semibold rounded-lg transition-all ${
                                            isSelected
                                                ? 'bg-brand-600 text-white shadow-sm font-bold scale-105'
                                                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-brand-50 hover:text-brand-600 dark:hover:bg-brand-900/30'
                                        }`}
                                    >
                                        Jam {label}
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    <div className="flex justify-end gap-2.5 pt-4 border-t border-slate-100 dark:border-slate-800">
                        <Button type="button" variant="ghost" onClick={domain.closeModal} disabled={isPending} className="rounded-xl">
                            Batal
                        </Button>
                        <Button type="submit" variant="primary" disabled={isPending} className="rounded-xl font-bold px-5">
                            {isPending ? 'Menyimpan...' : domain.editingSchedule ? 'Simpan Perubahan' : 'Tambah Jadwal PH'}
                        </Button>
                    </div>
                </form>
            </Modal>

            {/* WhatsApp Share Options Modal */}
            <Modal
                isOpen={domain.isWaModalOpen}
                onClose={() => domain.setIsWaModalOpen(false)}
                title="Salin Format WhatsApp"
            >
                <div className="space-y-4 pt-2">
                    <p className="text-sm text-slate-600 dark:text-slate-400">
                        Pilih jadwal PH yang ingin disalin untuk dibagikan ke grup WhatsApp kelas atau paguyuban orang tua:
                    </p>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <button
                            type="button"
                            onClick={() => domain.handleCopyWhatsApp('upcoming')}
                            className="p-4 rounded-2xl border-2 border-slate-200 dark:border-slate-800 hover:border-emerald-500 dark:hover:border-emerald-500 bg-white dark:bg-slate-900/50 hover:bg-emerald-50/40 dark:hover:bg-emerald-950/20 text-left transition-all group"
                        >
                            <div className="w-10 h-10 rounded-xl bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600 flex items-center justify-center mb-2.5">
                                <ClockIcon className="w-5 h-5" />
                            </div>
                            <div className="font-bold text-slate-900 dark:text-white group-hover:text-emerald-600 transition-colors">
                                PH Mendatang Saja
                            </div>
                            <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                                Salin {domain.statusCounts.upcoming + domain.statusCounts.today} jadwal PH aktif & yang akan datang.
                            </div>
                        </button>

                        <button
                            type="button"
                            onClick={() => domain.handleCopyWhatsApp('all')}
                            className="p-4 rounded-2xl border-2 border-slate-200 dark:border-slate-800 hover:border-brand-500 dark:hover:border-brand-500 bg-white dark:bg-slate-900/50 hover:bg-brand-50/40 dark:hover:bg-brand-950/20 text-left transition-all group"
                        >
                            <div className="w-10 h-10 rounded-xl bg-brand-100 dark:bg-brand-900/40 text-brand-600 flex items-center justify-center mb-2.5">
                                <CalendarIcon className="w-5 h-5" />
                            </div>
                            <div className="font-bold text-slate-900 dark:text-white group-hover:text-brand-600 transition-colors">
                                Seluruh Jadwal PH
                            </div>
                            <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                                Salin semua {domain.statusCounts.all} jadwal PH untuk semester ini.
                            </div>
                        </button>
                    </div>

                    <div className="flex justify-end pt-3">
                        <Button variant="ghost" onClick={() => domain.setIsWaModalOpen(false)}>
                            Tutup
                        </Button>
                    </div>
                </div>
            </Modal>

            {/* Print Friendly Preview Modal */}
            <Modal
                isOpen={domain.isPrintModalOpen}
                onClose={() => domain.setIsPrintModalOpen(false)}
                title="Cetak Jadwal Penilaian Harian"
            >
                <div className="space-y-4 pt-2">
                    <div id="ph-schedule-print-area" ref={printSheetRef} className="bg-white text-slate-900 p-6 rounded-xl border border-slate-200 text-xs sm:text-sm space-y-4">
                        <div className="text-center border-b pb-3 border-slate-300">
                            <h2 className="text-base sm:text-lg font-bold uppercase tracking-wide">
                                Agenda Penilaian Harian (PH)
                            </h2>
                            <p className="text-xs text-slate-600">
                                Kelas: <strong>{domain.currentClassName}</strong> &bull; Semester: <strong>{domain.currentSemesterName}</strong>
                            </p>
                        </div>

                        <div className="overflow-x-auto">
                            <table className="w-full border-collapse border border-slate-300 text-xs min-w-[480px]" aria-label="Tabel Agenda Penilaian Harian Cetak">
                                <thead>
                                    <tr className="bg-slate-100 text-slate-800">
                                        <th className="border border-slate-300 px-2 py-1.5 w-8 text-center">No</th>
                                        <th className="border border-slate-300 px-3 py-1.5 text-left">Hari & Tanggal</th>
                                        <th className="border border-slate-300 px-2 py-1.5 w-20 text-center">Jam Ke-</th>
                                        <th className="border border-slate-300 px-3 py-1.5 text-left">Mata Pelajaran & Materi</th>
                                        <th className="border border-slate-300 px-3 py-1.5 w-24 text-center">Paraf Guru</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {domain.filteredSchedules.map((item, idx) => (
                                        <tr key={item.id}>
                                            <td className="border border-slate-300 px-2 py-1.5 text-center">{idx + 1}</td>
                                            <td className="border border-slate-300 px-3 py-1.5">{PhScheduleEngine.formatDateHeading(item.date)}</td>
                                            <td className="border border-slate-300 px-2 py-1.5 text-center font-mono">{item.period_label}</td>
                                            <td className="border border-slate-300 px-3 py-1.5 font-medium">{item.subject}</td>
                                            <td className="border border-slate-300 px-3 py-1.5 text-center"></td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        <div className="pt-4 flex justify-between text-xs text-slate-600">
                            <div className="text-center">
                                <p>Mengetahui,</p>
                                <p className="mt-8 font-bold">( Wali Kelas )</p>
                            </div>
                            <div className="text-center">
                                <p>Guru Pengampu,</p>
                                <p className="mt-8 font-bold">( ........................................ )</p>
                            </div>
                        </div>
                    </div>

                    <div className="flex justify-end gap-2 pt-2">
                        <Button variant="ghost" onClick={() => domain.setIsPrintModalOpen(false)}>
                            Tutup
                        </Button>
                        <Button variant="primary" onClick={handleExecutePrint} className="font-bold flex items-center gap-2">
                            <PrinterIcon className="w-4 h-4" />
                            <span>Cetak Sekarang</span>
                        </Button>
                    </div>
                </div>
            </Modal>

            {/* Delete Confirmation Dialog */}
            <ConfirmationDialog
                isOpen={!!domain.deleteConfirm}
                onClose={() => domain.setDeleteConfirm(null)}
                onConfirm={() => {
                    if (domain.deleteConfirm) {
                        domain.deleteMutation.mutate(domain.deleteConfirm.id);
                    }
                }}
                title="Hapus Jadwal Penilaian Harian?"
                message={
                    <span>
                        Apakah Anda yakin ingin menghapus jadwal PH untuk mata pelajaran{' '}
                        <strong>"{domain.deleteConfirm?.subject}"</strong> pada tanggal{' '}
                        <strong>{domain.deleteConfirm?.date ? PhScheduleEngine.formatDateHeading(domain.deleteConfirm.date) : ''}</strong>?
                    </span>
                }
                confirmText="Hapus Jadwal"
                cancelText="Batal"
                variant="danger"
                isPending={domain.deleteMutation.isPending}
            />
        </div>
    );
};

export default PhScheduleTab;
