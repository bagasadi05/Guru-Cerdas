import React, { useEffect, useRef, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useReactToPrint } from 'react-to-print';
import { useAuth } from '../../hooks/useAuth';
import { usePhScheduleDomain } from './engine/usePhScheduleDomain';
import { PhScheduleEngine } from './engine/PhScheduleEngine';
import { PhWeeklyScheduleView } from './PhWeeklyScheduleView';
import { PhScheduleFormModal } from './PhScheduleFormModal';
import { PhBatchFormModal } from './PhBatchFormModal';
import { PhScheduleToolbar } from './PhScheduleToolbar';
import { Button } from '../ui/Button';
import { Modal } from '../ui/Modal';
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
    PrinterIcon,
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
    const [searchParams, setSearchParams] = useSearchParams();
    const printSheetRef = useRef<HTMLDivElement>(null);

    const domain = usePhScheduleDomain({
        externalSelectedClassId,
        onSelectClassId,
        onCanManageChange,
    });

    // Handle URL action=add (e.g. navigation from Dashboard TodayPhScheduleWidget)
    useEffect(() => {
        if (searchParams.get('action') === 'add') {
            domain.openAdd();
            const nextParams = new URLSearchParams(searchParams);
            nextParams.delete('action');
            setSearchParams(nextParams, { replace: true });
        }
    }, [searchParams, setSearchParams, domain.openAdd]);

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
            <PhScheduleToolbar domain={domain} onPrint={handleTriggerPrint} />
            {!domain.isLoadingSchedules && !domain.loadError && domain.rawSchedules.length > 0 && (
                <section aria-label="Ringkasan jadwal PH" className="grid grid-cols-2 gap-px overflow-hidden rounded-2xl border border-slate-200 bg-slate-200 sm:grid-cols-4 dark:border-slate-700 dark:bg-slate-700">
                    {[{ label: 'Jadwal semester ini', count: domain.statusCounts.all }, { label: 'Hari ini', count: domain.statusCounts.today }, { label: 'Mendatang', count: domain.statusCounts.upcoming }, { label: 'Tanggal sudah lewat', count: domain.statusCounts.past }].map((stat) => (
                        <div key={stat.label} className="bg-white px-4 py-4 sm:px-5 dark:bg-slate-900">
                            <p className="text-sm text-slate-600 dark:text-slate-300">{stat.label}</p>
                            <p className="mt-1 text-2xl font-semibold tabular-nums text-slate-900 dark:text-white">{stat.count}<span className="ml-1.5 text-sm font-normal text-slate-500 dark:text-slate-400">PH</span></p>
                        </div>
                    ))}
                </section>
            )}

            {/* Schedule Anomaly Alerts */}
            {domain.scheduleAnomalies.conflicts.length > 0 && (
                <div className="bg-rose-50 dark:bg-rose-500/10 rounded-2xl border border-rose-200 dark:border-rose-500/20 p-4 flex items-start gap-3">
                    <AlertTriangleIcon className="w-5 h-5 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
                    <div className="space-y-1 text-xs sm:text-sm">
                        <h4 className="font-bold text-rose-800 dark:text-rose-300">Ada jadwal yang bertumpang tindih</h4>
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
                        <span className="font-bold">Beberapa PH pada hari yang sama: </span>
                        {domain.scheduleAnomalies.heavyDays.map((h, i) => (
                            <span key={i}>
                                Tanggal <strong>{PhScheduleEngine.formatDateHeading(h.date)}</strong> memiliki {h.count} PH dalam sehari. Pastikan tidak melebihi beban belajar siswa.
                            </span>
                        ))}
                    </div>
                </div>
            )}

            {domain.selectedSemester?.is_locked && <p className="mb-4 text-sm text-amber-700 dark:text-amber-300">Semester ini terkunci. Jadwal PH hanya dapat dilihat.</p>}
            {/* Main Content Area */}
            {!domain.effectiveClassId || !domain.selectedSemesterId ? (
                <div className="bg-white dark:bg-slate-900/70 rounded-2xl border border-dashed border-slate-300 dark:border-slate-700 p-8 text-center text-slate-500 dark:text-slate-400 space-y-3">
                    <CalendarIcon className="w-10 h-10 mx-auto text-slate-400 opacity-60" />
                    <p className="text-sm font-semibold">Pilih kelas dan semester di atas untuk melihat jadwal PH.</p>
                </div>
            ) : domain.loadError ? (
                <div role="alert" className="rounded-xl border border-amber-300 p-5 space-y-3">
                    <p>Jadwal atau izin akses gagal dimuat. Data yang tampil mungkin belum lengkap.</p>
                    <Button type="button" onClick={domain.retryLoad}>Coba lagi</Button>
                </div>
            ) : domain.isLoadingSchedules || domain.isLoadingClasses ? (
                <div className="py-16 flex flex-col items-center justify-center text-slate-400 gap-3">
                    <div className="w-8 h-8 border-3 border-emerald-500 border-t-transparent rounded-full animate-spin" />
                    <p className="text-xs">Memuat jadwal Penilaian Harian...</p>
                </div>
            ) : domain.rawSchedules.length === 0 ? (
                <div className="bg-white/90 dark:bg-slate-900/70 border border-slate-200/80 dark:border-slate-700/90 rounded-2xl p-6 sm:p-8 flex flex-col items-center text-center space-y-4 shadow-sm dark:shadow-[0_0_0_1px_rgba(28,43,68,0.8),0_4px_20px_-2px_rgba(0,0,0,0.4)] my-2">
                    <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-50 text-brand-700 dark:bg-brand-900/40 dark:text-brand-300"><CalendarIcon className="h-7 w-7" /></div>
                    <div className="space-y-1.5 max-w-[280px] sm:max-w-md">
                        <h2 className="text-base font-bold text-slate-900 dark:text-white tracking-tight">Belum ada jadwal PH</h2>
                        <p className="text-[13px] text-slate-500 dark:text-[#94a3b8] leading-relaxed">
                            Belum ada agenda penilaian harian yang dijadwalkan untuk {domain.currentClassName} pada semester ini.
                        </p>
                    </div>
                    {domain.canManage && (
                        <button
                            type="button"
                            onClick={() => domain.openAdd()}
                            className="w-full max-w-[280px] py-3 px-3 bg-brand-600 hover:bg-brand-700 text-white font-semibold text-[13px] rounded-xl flex items-center justify-center gap-1.5 transition-all active:scale-[0.98] mt-2 whitespace-nowrap"
                        >
                            <PlusIcon className="w-4 h-4 stroke-[2.5]" />
                            <span>Tambah Jadwal PH</span>
                        </button>
                    )}
                </div>
            ) : domain.viewMode === 'weekly' && domain.filteredSchedules.length > 0 ? (
                /* Weekly view includes weekend schedules. */
                <PhWeeklyScheduleView
                    schedules={domain.filteredSchedules}
                    referenceDate={domain.todayStr}
                    canManage={domain.canManage}
                    onAdd={(initialDate) => domain.openAdd(initialDate)}
                    onEdit={domain.openEdit}
                    onDuplicate={domain.handleDuplicate}
                    onDelete={(item) => domain.setDeleteConfirm(item)}
                    onInputNilai={handleInputNilai}
                />
            ) : domain.filteredSchedules.length === 0 ? (
                <div className="bg-white dark:bg-slate-900/70 rounded-2xl border border-slate-200 dark:border-slate-700 p-8 text-center text-slate-400 space-y-2">
                    <SearchIcon className="w-8 h-8 mx-auto opacity-50 text-slate-400" />
                    <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">Tidak ada jadwal yang cocok</p>
                    <p className="text-xs text-slate-500">Coba ubah kata kunci pencarian atau filter status di atas.</p>
                    <Button type="button" variant="outline" onClick={() => { domain.setSearchQuery(''); domain.setStatusFilter('all'); domain.setSelectedMonth('all'); }}>Hapus filter</Button>
                </div>
            ) : domain.viewMode === 'table' ? (
                /* Table View */
                <div className="bg-white/95 dark:bg-slate-900/80 rounded-2xl border border-slate-200/80 dark:border-slate-700 overflow-hidden shadow-sm">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs sm:text-sm">
                            <thead className="bg-slate-50 dark:bg-slate-950 text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-700 uppercase tracking-wider text-[10px] sm:text-xs">
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
                                <div className="flex items-center justify-between pb-1 border-b border-slate-200/80 dark:border-slate-700">
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
                                                        : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
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
                                                className="bg-white/95 dark:bg-slate-900/80 rounded-2xl border border-slate-200/80 dark:border-slate-700 p-4 shadow-sm hover:shadow-md transition-all flex flex-col justify-between gap-3 group"
                                            >
                                                <div className="flex items-start justify-between gap-2">
                                                    <div className="flex items-start gap-2.5 min-w-0">
                                                        <div
                                                            className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 border ${subjectColor}`}
                                                        >
                                                            <CalendarIcon className="w-4 h-4" />
                                                        </div>
                                                        <div className="min-w-0">
                                                            <h4 className="font-semibold text-base leading-6 text-slate-900 dark:text-white break-words">
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
                                                            <DropdownTrigger aria-label={`Aksi jadwal ${item.subject}`} className="!h-11 !w-11 !min-h-11 !min-w-11 !p-0 !rounded-xl"><MoreVerticalIcon className="w-4 h-4" /></DropdownTrigger>
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

                                                <div className="pt-2 border-t border-slate-100 dark:border-slate-700/60 flex items-center justify-between">
                                                    <Button
                                                        type="button"
                                                        size="sm"
                                                        variant="primary"
                                                        onClick={() => handleInputNilai(item)}
                                                        className="min-h-11 px-3 text-sm rounded-xl"
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
            <PhScheduleFormModal
                isOpen={domain.dialogOpen}
                onClose={domain.closeModal}
                editingSchedule={domain.editingSchedule}
                formData={domain.formData}
                setFormData={domain.setFormData}
                handleSubmit={domain.handleSubmit}
                isPending={isPending}
                subjectSuggestions={domain.subjectSuggestions}
                rawSchedules={domain.rawSchedules}
                semester={domain.selectedSemester}
                currentClassName={domain.currentClassName}
                currentSemesterName={domain.currentSemesterName}
            />
            {domain.isBatchOpen && <PhBatchFormModal className={domain.currentClassName} semester={domain.selectedSemester} existing={domain.rawSchedules} initialDate={domain.todayStr} pending={domain.batchMutation.isPending} canManage={domain.canManage} onClose={() => domain.setIsBatchOpen(false)} onSave={(drafts) => domain.batchMutation.mutate(drafts)} />}
            <Modal isOpen={domain.isReportPreviewOpen} onClose={() => domain.setIsReportPreviewOpen(false)} maxWidth="max-w-2xl" title={`PH di laporan WhatsApp — ${domain.currentClassName}`}>
                <p className="text-sm text-slate-600 dark:text-slate-300 mb-3">Bagian PH memakai semester aktif, untuk hari ini dan tujuh hari ke depan. Pratinjau ini tidak mengirim pesan.</p>
                {domain.reportPreview.isLoading ? <p role="status">Memuat pratinjau…</p> : domain.reportPreview.error ? <div role="alert"><p>Pratinjau gagal dimuat.</p><Button onClick={() => void domain.reportPreview.refetch()}>Coba lagi</Button></div> : <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 sm:p-5 dark:border-slate-700 dark:bg-slate-800"><p className="mb-3 text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">Cuplikan pesan</p><pre className="whitespace-pre-wrap break-words font-sans text-sm leading-7 text-slate-800 dark:text-slate-100">{domain.reportPreview.data}</pre></div>}
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
                            <div className="w-10 h-10 rounded-xl bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 flex items-center justify-center mb-2.5">
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
                            <div className="w-10 h-10 rounded-xl bg-brand-100 dark:bg-brand-900/40 text-brand-700 flex items-center justify-center mb-2.5">
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
