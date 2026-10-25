import React, { useEffect, useRef, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useReactToPrint } from 'react-to-print';
import { CheckCircle2, AlertCircle, BellRing, UserCheck } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { usePhScheduleDomain } from './engine/usePhScheduleDomain';
import { PhScheduleEngine, type ExamStatus } from './engine/PhScheduleEngine';
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
import type { PhScheduleRow } from '../../types';
import { parseSubjectString, phSubjectColor } from './engine/phSchedulePresentation';

const STATUS_LABEL: Record<ExamStatus, string> = { today: 'Hari ini', upcoming: 'Mendatang', past: 'Lewat' };

const STATUS_BADGE: Record<ExamStatus, string> = {
    today: 'bg-brand-700 text-white dark:bg-brand-600',
    upcoming: 'bg-brand-50 text-brand-800 dark:bg-brand-950/60 dark:text-brand-200',
    past: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300',
};

const STATUS_TILE: Record<ExamStatus, string> = {
    today: 'bg-brand-700 text-white dark:bg-brand-600',
    upcoming: 'bg-brand-50 text-brand-700 dark:bg-brand-950/60 dark:text-brand-300',
    past: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400',
};

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
    const { openAdd } = domain;

    // Handle URL action=add (e.g. navigation from Dashboard TodayPhScheduleWidget)
    useEffect(() => {
        if (searchParams.get('action') === 'add') {
            openAdd();
            const nextParams = new URLSearchParams(searchParams);
            nextParams.delete('action');
            setSearchParams(nextParams, { replace: true });
        }
    }, [searchParams, setSearchParams, openAdd]);

    const handleExecutePrint = useReactToPrint({
        contentRef: printSheetRef,
        documentTitle: `Agenda_ASH_${domain.currentClassName}`,
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
            const gradeStatus = domain.gradeStatusById.get(item.id);
            const dynamicAssessmentName =
                gradeStatus?.assessmentName ||
                PhScheduleEngine.getAssessmentSequenceName(item, domain.rawSchedules);

            navigate('/input-massal', {
                state: {
                    prefill: {
                        mode: 'subject_grade',
                        classId: item.class_id,
                        subject: parseSubjectString(item.subject).baseSubject || item.subject,
                        assessment_name: dynamicAssessmentName,
                        notes: parseSubjectString(item.subject).topic || '',
                        semester: item.semester_id,
                    },
                },
            });
        },
        [navigate, domain.gradeStatusById, domain.rawSchedules]
    );

    const isPending = domain.createMutation.isPending || domain.updateMutation.isPending;

    if (authLoading) {
        return (
            <div className="flex flex-col items-center justify-center gap-3 py-20" role="status">
                <div className="h-10 w-10 animate-spin rounded-full border-[3px] border-brand-500 border-t-transparent" />
                <p className="text-sm text-slate-600 dark:text-slate-300">Memuat data jadwal…</p>
            </div>
        );
    }

    return (
        <div className="space-y-4 sm:space-y-6 animate-fade-in">
            <PhScheduleToolbar domain={domain} onPrint={handleTriggerPrint} />

            {/* Homeroom / External Teacher Notification Banner */}
            {domain.newExternalSchedules.length > 0 && (
                <div
                    role="status"
                    className="rounded-2xl border border-indigo-200 bg-indigo-50/90 p-4 shadow-xs dark:border-indigo-500/30 dark:bg-indigo-950/35 flex flex-col sm:flex-row sm:items-start justify-between gap-3"
                >
                    <div className="flex items-start gap-3">
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-indigo-600 text-white shadow-xs">
                            <BellRing className="h-4 w-4 animate-pulse" aria-hidden />
                        </div>
                        <div className="space-y-1 text-xs sm:text-sm">
                            <div className="flex flex-wrap items-center gap-2">
                                <h4 className="font-bold text-indigo-950 dark:text-indigo-100">
                                    {domain.isHomeroomForSelectedClass
                                        ? `Info Wali Kelas: ${domain.newExternalSchedules.length} Jadwal ASH Baru dari Guru Mapel`
                                        : `${domain.newExternalSchedules.length} Jadwal ASH Baru Ditambahkan Guru Lain`}
                                </h4>
                                <span className="rounded-full bg-indigo-600 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white">
                                    Baru
                                </span>
                            </div>
                            <ul className="list-disc list-inside text-indigo-900 dark:text-indigo-200 space-y-0.5">
                                {domain.newExternalSchedules.slice(0, 4).map((ext) => (
                                    <li key={ext.id}>
                                        <strong>{ext.subject}</strong> — {PhScheduleEngine.formatDateHeading(ext.date)} (Jam ke-{ext.period_label})
                                    </li>
                                ))}
                                {domain.newExternalSchedules.length > 4 && (
                                    <li className="italic">
                                        +{domain.newExternalSchedules.length - 4} jadwal lainnya di kelas {domain.currentClassName}
                                    </li>
                                )}
                            </ul>
                        </div>
                    </div>
                    <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={domain.acknowledgeNewSchedules}
                        className="shrink-0 self-end sm:self-center border-indigo-300 bg-white text-xs font-semibold text-indigo-800 hover:bg-indigo-100 dark:border-indigo-700 dark:bg-slate-900 dark:text-indigo-200 dark:hover:bg-indigo-900/50"
                    >
                        <UserCheck className="mr-1.5 h-3.5 w-3.5" />
                        Tandai Sudah Dilihat
                    </Button>
                </div>
            )}

            {!domain.isLoadingSchedules && !domain.loadError && domain.nextUpcomingPh && (
                <section aria-label="ASH berikutnya" className="flex flex-wrap items-center justify-between gap-x-2.5 gap-y-1.5 rounded-2xl border border-brand-200/80 bg-brand-50/70 px-3.5 py-2.5 text-xs sm:text-sm dark:border-brand-800/60 dark:bg-brand-950/30">
                    <span className="order-1 shrink-0 rounded-lg bg-brand-700 px-2 py-0.5 text-[11px] font-bold uppercase tracking-wide text-white dark:bg-brand-600">ASH berikutnya</span>
                    <p className="order-3 sm:order-2 w-full sm:w-auto sm:flex-1 min-w-0 text-xs sm:text-sm leading-snug text-slate-800 dark:text-slate-100">
                        <span className="font-semibold">{domain.nextUpcomingPh.subject}</span>
                        <span className="text-slate-600 dark:text-slate-300">
                            {' · '}{PhScheduleEngine.formatDateHeading(domain.nextUpcomingPh.date)}{' · jam '}{domain.nextUpcomingPh.period_label}
                        </span>
                    </p>
                    <span className="order-2 sm:order-3 shrink-0 rounded-lg bg-white px-2.5 py-0.5 text-xs font-bold text-brand-800 shadow-2xs dark:bg-slate-900 dark:text-brand-300">
                        {PhScheduleEngine.getRelativeDateLabel(domain.nextUpcomingPh.date)}
                    </span>
                </section>
            )}

            {/* Schedule Anomaly Alerts */}
            {domain.scheduleAnomalies.conflicts.length > 0 && (
                <div className="bg-rose-50 dark:bg-rose-500/10 rounded-2xl border border-rose-200 dark:border-rose-500/20 p-4 flex items-start gap-3">
                    <AlertTriangleIcon className="w-5 h-5 text-rose-700 dark:text-rose-400 shrink-0 mt-0.5" aria-hidden />
                    <div className="space-y-1 text-sm">
                        <h4 className="font-semibold text-rose-900 dark:text-rose-200">Ada jadwal yang bertumpang tindih</h4>
                        <ul className="list-disc list-inside text-rose-800 dark:text-rose-300 space-y-0.5">
                            {domain.scheduleAnomalies.conflicts.map((c, i) => (
                                <li key={i}>
                                    Tanggal <strong>{PhScheduleEngine.formatDateHeading(c.date)}</strong> (Jam {c.period}): {c.subjects.join(' dan ')} dijadwalkan bersamaan.
                                </li>
                            ))}
                        </ul>
                    </div>
                </div>
            )}

            {domain.scheduleAnomalies.holidaySchedules.length > 0 && (
                <div className="bg-amber-50 dark:bg-amber-500/10 rounded-2xl border border-amber-200 dark:border-amber-500/20 p-4 flex items-start gap-3">
                    <AlertTriangleIcon className="w-5 h-5 text-amber-700 dark:text-amber-400 shrink-0 mt-0.5" aria-hidden />
                    <div className="space-y-1 text-sm text-amber-900 dark:text-amber-200">
                        <p className="font-semibold">Jadwal ASH bertepatan dengan Hari Libur / Cuti Bersama (Kaldik)</p>
                        <ul className="list-inside list-disc space-y-0.5">
                            {domain.scheduleAnomalies.holidaySchedules.map((h) => (
                                <li key={h.id}>
                                    <strong>{PhScheduleEngine.formatDateHeading(h.date)}</strong> ({h.kind === 'CUTI' ? 'Cuti Bersama' : 'Libur Nasional'}: {h.holidayName}): {h.subject}
                                </li>
                            ))}
                        </ul>
                    </div>
                </div>
            )}

            {domain.scheduleAnomalies.heavyDays.length > 0 && (
                <div className="bg-amber-50 dark:bg-amber-500/10 rounded-2xl border border-amber-200 dark:border-amber-500/20 p-4 flex items-start gap-3">
                    <AlertTriangleIcon className="w-5 h-5 text-amber-700 dark:text-amber-400 shrink-0 mt-0.5" aria-hidden />
                    <div className="space-y-1 text-sm text-amber-900 dark:text-amber-200">
                        <p className="font-semibold">Beberapa ASH menumpuk pada hari yang sama</p>
                        <ul className="list-inside list-disc space-y-0.5">
                            {domain.scheduleAnomalies.heavyDays.map((h) => (
                                <li key={h.date}>
                                    <strong>{PhScheduleEngine.formatDateHeading(h.date)}</strong>: {h.count} ASH dalam sehari.
                                </li>
                            ))}
                        </ul>
                        <p>Pastikan beban belajar siswa pada hari itu masih wajar.</p>
                    </div>
                </div>
            )}

            {domain.selectedSemester?.is_locked && (
                <p className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700 dark:border-slate-700 dark:bg-slate-800/60 dark:text-slate-200">
                    Semester ini terkunci, jadi jadwal ASH hanya dapat dilihat.
                </p>
            )}
            {/* Main Content Area */}
            {!domain.isLoadingClasses && !domain.loadError && (!domain.effectiveClassId || !domain.selectedSemesterId) ? (
                <div className="space-y-3 rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center dark:border-slate-700 dark:bg-slate-900">
                    <CalendarIcon className="mx-auto h-10 w-10 text-slate-400" aria-hidden />
                    <p className="text-sm font-medium text-slate-700 dark:text-slate-200">Pilih kelas dan semester di atas untuk melihat jadwal ASH.</p>
                </div>
            ) : domain.loadError ? (
                <div role="alert" className="space-y-3 rounded-2xl border border-rose-200 bg-rose-50 p-5 dark:border-rose-900 dark:bg-rose-950/30">
                    <h3 className="font-semibold text-rose-900 dark:text-rose-200">Jadwal ASH gagal dimuat</h3>
                    <p className="text-sm text-rose-800 dark:text-rose-300">Periksa koneksi internet Anda, lalu muat ulang. Jadwal tidak ditampilkan agar tidak terbaca sebagai kelas tanpa ASH.</p>
                    <Button type="button" onClick={domain.retryLoad}>Coba lagi</Button>
                </div>
            ) : domain.isLoadingSchedules || domain.isLoadingClasses ? (
                <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-slate-200 bg-white py-16 dark:border-slate-800 dark:bg-slate-900" role="status">
                    <div className="h-8 w-8 animate-spin rounded-full border-[3px] border-brand-500 border-t-transparent" />
                    <p className="text-sm text-slate-600 dark:text-slate-300">Memuat jadwal Asesmen Sumatif Harian (ASH)…</p>
                </div>
            ) : domain.rawSchedules.length === 0 ? (
                <div className="flex flex-col items-center space-y-4 rounded-2xl border border-slate-200 bg-white p-6 text-center shadow-sm sm:p-8 dark:border-slate-800 dark:bg-slate-900">
                    <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-50 text-brand-700 dark:bg-brand-950/60 dark:text-brand-300"><CalendarIcon className="h-7 w-7" aria-hidden /></div>
                    <div className="max-w-md space-y-1.5">
                        <h2 className="text-base font-semibold tracking-tight text-slate-900 dark:text-white">Belum ada jadwal ASH</h2>
                        <p className="text-sm leading-relaxed text-slate-600 dark:text-slate-300">
                            Belum ada agenda asesmen sumatif harian untuk {domain.currentClassName} pada semester ini.
                            {domain.canAdd ? ' Tambahkan jadwal agar wali kelas dan guru lain ikut melihatnya.' : ''}
                        </p>
                    </div>
                    {domain.canAdd && (
                        <Button type="button" variant="primary" onClick={() => domain.openAdd()} className="min-h-11 w-full max-w-[280px] gap-1.5 rounded-xl">
                            <PlusIcon className="h-4 w-4" aria-hidden />
                            Tambah Jadwal ASH
                        </Button>
                    )}
                </div>
            ) : domain.viewMode === 'weekly' && domain.filteredSchedules.length > 0 ? (
                /* Weekly view includes weekend schedules. */
                <PhWeeklyScheduleView
                    schedules={domain.filteredSchedules}
                    referenceDate={domain.todayStr}
                    canAdd={domain.canAdd}
                    canModify={domain.canModify}
                    onAdd={(initialDate) => domain.openAdd(initialDate)}
                    onEdit={domain.openEdit}
                    onDuplicate={domain.handleDuplicate}
                    onDelete={(item) => domain.setDeleteConfirm(item)}
                    onInputNilai={handleInputNilai}
                    gradeStatusById={domain.gradeStatusById}
                    isCreatedByOtherTeacher={domain.isCreatedByOtherTeacher}
                    isNewlyAddedByOtherTeacher={domain.isNewlyAddedByOtherTeacher}
                />
            ) : domain.filteredSchedules.length === 0 ? (
                <div className="space-y-2 rounded-2xl border border-slate-200 bg-white p-8 text-center dark:border-slate-800 dark:bg-slate-900">
                    <SearchIcon className="mx-auto h-8 w-8 text-slate-400" aria-hidden />
                    <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">Tidak ada jadwal yang cocok</p>
                    <p className="text-sm text-slate-600 dark:text-slate-400">Kata kunci atau filter di atas menyaring semua jadwal. Hapus filter untuk melihat {domain.rawSchedules.length} ASH di kelas ini.</p>
                    <Button
                        type="button"
                        variant="outline"
                        className="min-h-11"
                        onClick={() => {
                            domain.setSearchQuery('');
                            domain.setStatusFilter('all');
                            domain.setSelectedMonth('all');
                            domain.setSelectedSubject('all');
                        }}
                    >
                        Hapus filter
                    </Button>
                </div>
            ) : domain.viewMode === 'table' ? (
                /* Table View */
                <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm">
                            <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase tracking-wide text-slate-600 dark:border-slate-800 dark:bg-slate-800/60 dark:text-slate-300">
                                <tr>
                                    <th className="py-3 px-3.5 sm:px-4">Tanggal & Waktu</th>
                                    <th className="py-3 px-3.5 sm:px-4">Mata Pelajaran & Materi</th>
                                    <th className="py-3 px-3.5 sm:px-4">Jam Ke-</th>
                                    <th className="py-3 px-3.5 sm:px-4">Status & Nilai</th>
                                    <th className="py-3 px-3.5 sm:px-4 text-right">Aksi</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                {domain.filteredSchedules.map((item) => {
                                    const st = PhScheduleEngine.getItemStatus(item.date, domain.todayStr);
                                    const rel = PhScheduleEngine.getRelativeDateLabel(item.date);
                                    const gradeStatus = domain.gradeStatusById.get(item.id);
                                    const seqLabel = gradeStatus?.assessmentName || PhScheduleEngine.getAssessmentSequenceName(item, domain.rawSchedules);
                                    const isOtherTeacher = domain.isCreatedByOtherTeacher(item);
                                    const isNewFromOther = domain.isNewlyAddedByOtherTeacher(item);

                                    return (
                                        <tr
                                            key={item.id}
                                            className={`transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/50 ${
                                                isNewFromOther ? 'bg-indigo-50/40 dark:bg-indigo-950/20' : ''
                                            }`}
                                        >
                                            <td className="py-3 px-3.5 sm:px-4 whitespace-nowrap">
                                                <div className="font-semibold text-slate-900 dark:text-white">
                                                    {PhScheduleEngine.formatDateHeading(item.date)}
                                                </div>
                                                {rel && <div className="text-xs text-slate-600 dark:text-slate-400">{rel}</div>}
                                            </td>
                                            <td className="py-3 px-3.5 sm:px-4">
                                                <div className="flex flex-wrap items-center gap-1.5">
                                                    <span aria-hidden className={`inline-block h-2.5 w-2.5 rounded-full shrink-0 ${phSubjectColor(item.subject)}`} />
                                                    <span className="font-bold text-slate-800 dark:text-slate-200">{parseSubjectString(item.subject).baseSubject}</span>
                                                    <span className="rounded bg-brand-100/80 px-1.5 py-0.5 text-[10px] font-bold text-brand-800 dark:bg-brand-900/50 dark:text-brand-200">
                                                        {seqLabel}
                                                    </span>
                                                    {isNewFromOther && (
                                                        <span className="rounded bg-indigo-600 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white">
                                                            Baru
                                                        </span>
                                                    )}
                                                    {isOtherTeacher && (
                                                        <span className="rounded bg-indigo-100/80 px-1.5 py-0.5 text-[10px] font-semibold text-indigo-800 dark:bg-indigo-950/60 dark:text-indigo-300">
                                                            Guru Mapel
                                                        </span>
                                                    )}
                                                </div>
                                                <p className="mt-1 text-xs text-slate-600 dark:text-slate-300">{parseSubjectString(item.subject).topic || 'Materi belum diisi'}</p>
                                            </td>
                                            <td className="py-3 px-3.5 sm:px-4 whitespace-nowrap">
                                                <span className="inline-flex items-center rounded-md bg-slate-100 px-2 py-0.5 text-xs tabular-nums text-slate-700 dark:bg-slate-800 dark:text-slate-200">
                                                    {item.period_label}
                                                </span>
                                            </td>
                                            <td className="py-3 px-3.5 sm:px-4 whitespace-nowrap">
                                                <div className="flex flex-col items-start gap-1">
                                                    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${STATUS_BADGE[st]}`}>
                                                        {STATUS_LABEL[st]}
                                                    </span>
                                                    {gradeStatus?.state === 'complete' && (
                                                        <span className="inline-flex items-center gap-1 rounded-md bg-emerald-100 px-2 py-0.5 text-[11px] font-semibold text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300">
                                                            <CheckCircle2 className="h-3 w-3 shrink-0" />
                                                            Nilai Lengkap ({gradeStatus.gradedCount}/{gradeStatus.totalStudents})
                                                        </span>
                                                    )}
                                                    {gradeStatus?.state === 'partial' && (
                                                        <span className="inline-flex items-center gap-1 rounded-md bg-amber-100 px-2 py-0.5 text-[11px] font-semibold text-amber-800 dark:bg-amber-950/60 dark:text-amber-300">
                                                            <AlertCircle className="h-3 w-3 shrink-0" />
                                                            Nilai {gradeStatus.gradedCount}/{gradeStatus.totalStudents}
                                                        </span>
                                                    )}
                                                    {gradeStatus?.state === 'overdue' && (
                                                        <span className="inline-flex items-center gap-1 rounded-md bg-rose-100 px-2 py-0.5 text-[11px] font-semibold text-rose-800 dark:bg-rose-950/60 dark:text-rose-300">
                                                            <AlertCircle className="h-3 w-3 shrink-0" />
                                                            Belum Dinilai
                                                        </span>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="py-3 px-3.5 sm:px-4 text-right whitespace-nowrap">
                                                <div className="flex items-center justify-end gap-1.5">
                                                    <Button
                                                        type="button"
                                                        size="sm"
                                                        variant="primary"
                                                        onClick={() => handleInputNilai(item)}
                                                        className={`!min-h-11 px-2.5 text-xs text-white ${
                                                            gradeStatus?.state === 'complete'
                                                                ? '!bg-emerald-700 hover:!bg-emerald-800'
                                                                : '!bg-teal-700 hover:!bg-teal-800'
                                                        }`}
                                                        title={`Input Nilai ${seqLabel}`}
                                                    >
                                                        <ClipboardPenIcon className="w-3.5 h-3.5 mr-1" />
                                                        <span>
                                                            {gradeStatus?.state === 'complete'
                                                                ? 'Lihat Nilai'
                                                                : gradeStatus?.state === 'partial'
                                                                    ? `Nilai (${gradeStatus.gradedCount}/${gradeStatus.totalStudents})`
                                                                    : `Nilai (${seqLabel})`}
                                                        </span>
                                                    </Button>
                                                    {domain.canModify(item) && (
                                                        <>
                                                            <Button
                                                                type="button"
                                                                size="sm"
                                                                variant="ghost"
                                                                onClick={() => domain.openEdit(item)}
                                                                aria-label={`Edit jadwal ${item.subject}`}
                                                                className="h-11 w-11 lg:h-8 lg:w-8 p-0"
                                                            >
                                                                <EditIcon className="w-3.5 h-3.5" />
                                                            </Button>
                                                            <Button
                                                                type="button"
                                                                size="sm"
                                                                variant="ghost"
                                                                onClick={() => domain.setDeleteConfirm(item)}
                                                                aria-label={`Hapus jadwal ${item.subject}`}
                                                                className="h-11 w-11 lg:h-8 lg:w-8 p-0 text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30"
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
                        const st = PhScheduleEngine.getItemStatus(date, domain.todayStr);

                        return (
                            <div key={date} className="space-y-2.5">
                                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 pb-1.5 dark:border-slate-800">
                                    <div className="flex flex-wrap items-center gap-2">
                                        <h3 className="flex items-center gap-2 text-sm font-semibold text-slate-900 dark:text-white sm:text-base">
                                            <CalendarIcon className="h-4 w-4 text-brand-700 dark:text-brand-300" aria-hidden />
                                            {heading}
                                        </h3>
                                        {rel && (
                                            <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${STATUS_BADGE[st]}`}>
                                                {rel}
                                            </span>
                                        )}
                                    </div>
                                    <span className="text-xs text-slate-600 dark:text-slate-400">{items.length} ASH</span>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                                    {items.map((item) => {
                                        const gradeStatus = domain.gradeStatusById.get(item.id);
                                        const seqLabel = gradeStatus?.assessmentName || PhScheduleEngine.getAssessmentSequenceName(item, domain.rawSchedules);
                                        const isOtherTeacher = domain.isCreatedByOtherTeacher(item);
                                        const isNewFromOther = domain.isNewlyAddedByOtherTeacher(item);

                                        return (
                                            <div
                                                key={item.id}
                                                className={`flex flex-col justify-between gap-3 rounded-2xl border bg-white p-4 shadow-sm transition-shadow hover:shadow-md dark:bg-slate-900 ${
                                                    isNewFromOther
                                                        ? 'border-indigo-400 ring-1 ring-indigo-300/60 dark:border-indigo-500/70'
                                                        : st === 'today'
                                                            ? 'border-brand-300 dark:border-brand-700'
                                                            : 'border-slate-200 dark:border-slate-800'
                                                }`}
                                            >
                                                <div className="flex items-start justify-between gap-2">
                                                    <div className="flex min-w-0 items-start gap-2.5">
                                                        <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${STATUS_TILE[st]}`}>
                                                            <CalendarIcon className="h-4 w-4" aria-hidden />
                                                        </div>
                                                        <div className="min-w-0">
                                                            <h4 className="break-words hyphens-none text-base font-semibold leading-6 text-slate-900 dark:text-white">
                                                                <span aria-hidden className={`mr-2 inline-block h-2.5 w-2.5 rounded-full ${phSubjectColor(item.subject)}`} />
                                                                {parseSubjectString(item.subject).baseSubject}
                                                            </h4>
                                                            <p className="mt-1 text-xs text-slate-600 dark:text-slate-300">{parseSubjectString(item.subject).topic || 'Materi belum diisi'}</p>
                                                            <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                                                                <span className="inline-flex rounded bg-slate-100 px-1.5 py-0.5 text-xs tabular-nums text-slate-700 dark:bg-slate-800 dark:text-slate-200">
                                                                    Jam ke-{item.period_label}
                                                                </span>
                                                                <span className="inline-flex rounded bg-brand-100/80 px-1.5 py-0.5 text-[11px] font-bold text-brand-800 dark:bg-brand-900/50 dark:text-brand-200">
                                                                    {seqLabel}
                                                                </span>
                                                                {isNewFromOther && (
                                                                    <span className="inline-flex rounded bg-indigo-600 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white">
                                                                        Baru
                                                                    </span>
                                                                )}
                                                                {isOtherTeacher && (
                                                                    <span className="inline-flex rounded bg-indigo-100/80 px-1.5 py-0.5 text-[10px] font-semibold text-indigo-800 dark:bg-indigo-950/60 dark:text-indigo-300">
                                                                        Guru Mapel
                                                                    </span>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </div>

                                                    {domain.canAdd && (
                                                        <DropdownMenu>
                                                            <DropdownTrigger aria-label={`Aksi jadwal ${item.subject}`} className="!h-11 !w-11 !min-h-11 !min-w-11 !p-0 !rounded-xl"><MoreVerticalIcon className="w-4 h-4" /></DropdownTrigger>
                                                            <DropdownContent align="right">
                                                                {domain.canModify(item) && (
                                                                    <DropdownItem onClick={() => domain.openEdit(item)}>
                                                                        <EditIcon className="w-4 h-4 mr-2" /> Edit Jadwal
                                                                    </DropdownItem>
                                                                )}
                                                                <DropdownItem onClick={() => domain.handleDuplicate(item)}>
                                                                    <CopyIcon className="w-4 h-4 mr-2" /> Duplikasi ke Formulir
                                                                </DropdownItem>
                                                                {domain.canModify(item) && (
                                                                    <DropdownItem
                                                                        onClick={() => domain.setDeleteConfirm(item)}
                                                                        className="text-rose-600 hover:text-rose-700"
                                                                    >
                                                                        <TrashIcon className="w-4 h-4 mr-2" /> Hapus Jadwal
                                                                    </DropdownItem>
                                                                )}
                                                            </DropdownContent>
                                                        </DropdownMenu>
                                                    )}
                                                </div>

                                                <div className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 pt-2.5 dark:border-slate-800">
                                                    <div>
                                                        {gradeStatus?.state === 'complete' && (
                                                            <span className="inline-flex items-center gap-1 rounded-md bg-emerald-100/90 px-2 py-0.5 text-xs font-semibold text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300">
                                                                <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
                                                                Nilai Lengkap ({gradeStatus.gradedCount}/{gradeStatus.totalStudents})
                                                            </span>
                                                        )}
                                                        {gradeStatus?.state === 'partial' && (
                                                            <span className="inline-flex items-center gap-1 rounded-md bg-amber-100/90 px-2 py-0.5 text-xs font-semibold text-amber-800 dark:bg-amber-950/60 dark:text-amber-300">
                                                                <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                                                                Nilai {gradeStatus.gradedCount}/{gradeStatus.totalStudents}
                                                            </span>
                                                        )}
                                                        {gradeStatus?.state === 'overdue' && (
                                                            <span className="inline-flex items-center gap-1 rounded-md bg-rose-100/90 px-2 py-0.5 text-xs font-semibold text-rose-800 dark:bg-rose-950/60 dark:text-rose-300">
                                                                <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                                                                Belum Dinilai
                                                            </span>
                                                        )}
                                                    </div>
                                                    <Button
                                                        type="button"
                                                        size="sm"
                                                        variant="primary"
                                                        onClick={() => handleInputNilai(item)}
                                                        className={`min-h-11 px-3 text-sm rounded-xl ${
                                                            gradeStatus?.state === 'complete'
                                                                ? '!bg-emerald-700 hover:!bg-emerald-800 text-white'
                                                                : ''
                                                        }`}
                                                    >
                                                        <ClipboardPenIcon className="w-3.5 h-3.5 mr-1" />
                                                        {gradeStatus?.state === 'complete'
                                                            ? 'Lihat / Edit Nilai'
                                                            : gradeStatus?.state === 'partial'
                                                                ? `Lengkapi Nilai (${gradeStatus.gradedCount}/${gradeStatus.totalStudents})`
                                                                : `Input Nilai (${seqLabel})`}
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
            {domain.isBatchOpen && <PhBatchFormModal className={domain.currentClassName} semester={domain.selectedSemester} existing={domain.rawSchedules} initialDate={domain.todayStr} pending={domain.batchMutation.isPending} canManage={domain.canAdd} onClose={() => domain.setIsBatchOpen(false)} onSave={(drafts) => domain.batchMutation.mutate(drafts)} />}
            <Modal isOpen={domain.isReportPreviewOpen} onClose={() => domain.setIsReportPreviewOpen(false)} maxWidth="max-w-2xl" title={`ASH di laporan WhatsApp — ${domain.currentClassName}`}>
                <p className="text-sm text-slate-600 dark:text-slate-300 mb-3">Bagian ASH memakai semester aktif, untuk hari ini dan tujuh hari ke depan. Pratinjau ini tidak mengirim pesan.</p>
                {domain.reportPreview.isLoading ? <p role="status">Memuat pratinjau…</p> : domain.reportPreview.error ? <div role="alert"><p>Pratinjau gagal dimuat.</p><Button onClick={() => void domain.reportPreview.refetch()}>Coba lagi</Button></div> : <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 sm:p-5 dark:border-slate-700 dark:bg-slate-800"><p className="mb-3 text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">Cuplikan pesan</p><pre className="whitespace-pre-wrap break-words font-sans text-sm leading-7 text-slate-800 dark:text-slate-100">{domain.reportPreview.data}</pre></div>}
            </Modal>

            {/* WhatsApp Share Options Modal */}
            <Modal
                isOpen={domain.isWaModalOpen}
                onClose={() => domain.setIsWaModalOpen(false)}
                title="Salin Format WhatsApp"
                maxWidth="max-w-2xl"
            >
                <div className="space-y-4 pt-2">
                    <p className="text-sm text-slate-600 dark:text-slate-400">
                        Pilih cakupan jadwal ASH yang ingin disalin untuk dibagikan ke grup WhatsApp kelas atau paguyuban orang tua:
                    </p>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <button
                            type="button"
                            onClick={() => domain.handleCopyWhatsApp('this_week')}
                            className="p-4 rounded-2xl border-2 border-slate-200 dark:border-slate-800 hover:border-teal-500 dark:hover:border-teal-500 bg-white dark:bg-slate-900/50 hover:bg-teal-50/40 dark:hover:bg-teal-950/20 text-left transition-all group"
                        >
                            <div className="w-10 h-10 rounded-xl bg-teal-100 dark:bg-teal-900/40 text-teal-700 flex items-center justify-center mb-2.5">
                                <CalendarIcon className="w-5 h-5" />
                            </div>
                            <div className="font-bold text-slate-900 dark:text-white group-hover:text-teal-600 transition-colors">
                                ASH Pekan Ini
                            </div>
                            <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                                Rekap jadwal ASH minggu berjalan untuk pengumuman mingguan wali murid.
                            </div>
                        </button>

                        <button
                            type="button"
                            onClick={() => domain.handleCopyWhatsApp('upcoming')}
                            className="p-4 rounded-2xl border-2 border-slate-200 dark:border-slate-800 hover:border-emerald-500 dark:hover:border-emerald-500 bg-white dark:bg-slate-900/50 hover:bg-emerald-50/40 dark:hover:bg-emerald-950/20 text-left transition-all group"
                        >
                            <div className="w-10 h-10 rounded-xl bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 flex items-center justify-center mb-2.5">
                                <ClockIcon className="w-5 h-5" />
                            </div>
                            <div className="font-bold text-slate-900 dark:text-white group-hover:text-emerald-600 transition-colors">
                                ASH Mendatang Saja
                            </div>
                            <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                                Salin {domain.statusCounts.upcoming + domain.statusCounts.today} jadwal ASH aktif &amp; yang akan datang.
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
                                Seluruh Jadwal ASH
                            </div>
                            <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                                Salin semua {domain.statusCounts.all} jadwal ASH untuk semester ini.
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
                title="Cetak Jadwal Asesmen Sumatif Harian"
            >
                <div className="space-y-4 pt-2">
                    <div id="ph-schedule-print-area" ref={printSheetRef} className="bg-white text-slate-900 p-6 rounded-xl border border-slate-200 text-xs sm:text-sm space-y-4">
                        <div className="text-center border-b pb-3 border-slate-300">
                            <h2 className="text-base sm:text-lg font-bold uppercase tracking-wide">
                                Agenda Asesmen Sumatif Harian (ASH)
                            </h2>
                            <p className="text-xs text-slate-600">
                                Kelas: <strong>{domain.currentClassName}</strong> &bull; Semester: <strong>{domain.currentSemesterName}</strong>
                            </p>
                        </div>

                        <div className="overflow-x-auto">
                            <table className="w-full border-collapse border border-slate-300 text-xs min-w-[480px]" aria-label="Tabel Agenda Asesmen Sumatif Harian Cetak">
                                <thead>
                                    <tr className="bg-slate-100 text-slate-800">
                                        <th className="border border-slate-300 px-2 py-1.5 w-8 text-center">No</th>
                                        <th className="border border-slate-300 px-3 py-1.5 text-left">Hari &amp; Tanggal</th>
                                        <th className="border border-slate-300 px-2 py-1.5 w-20 text-center">Jam Ke-</th>
                                        <th className="border border-slate-300 px-3 py-1.5 text-left">Mata Pelajaran &amp; Materi</th>
                                        <th className="border border-slate-300 px-2 py-1.5 w-24 text-center">Status Nilai</th>
                                        <th className="border border-slate-300 px-3 py-1.5 w-24 text-center">Paraf Guru</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {domain.filteredSchedules.map((item, idx) => {
                                        const gradeStatus = domain.gradeStatusById.get(item.id);
                                        const seqLabel = gradeStatus?.assessmentName || PhScheduleEngine.getAssessmentSequenceName(item, domain.rawSchedules);
                                        return (
                                            <tr key={item.id}>
                                                <td className="border border-slate-300 px-2 py-1.5 text-center">{idx + 1}</td>
                                                <td className="border border-slate-300 px-3 py-1.5">{PhScheduleEngine.formatDateHeading(item.date)}</td>
                                                <td className="border border-slate-300 px-2 py-1.5 text-center font-mono">{item.period_label}</td>
                                                <td className="border border-slate-300 px-3 py-1.5 font-medium">
                                                    {item.subject} <span className="text-slate-500">[{seqLabel}]</span>
                                                </td>
                                                <td className="border border-slate-300 px-2 py-1.5 text-center">
                                                    {gradeStatus?.state === 'complete'
                                                        ? `Lengkap (${gradeStatus.gradedCount}/${gradeStatus.totalStudents})`
                                                        : gradeStatus?.state === 'partial'
                                                            ? `Sebagian (${gradeStatus.gradedCount}/${gradeStatus.totalStudents})`
                                                            : '-'}
                                                </td>
                                                <td className="border border-slate-300 px-3 py-1.5 text-center"></td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>

                        <div className="pt-4 flex justify-between text-xs text-slate-600">
                            <div className="text-center">
                                <p>Mengetahui,</p>
                                <p className="mt-8 font-bold">( Wali Kelas {domain.currentClassName} )</p>
                            </div>
                            <div className="text-center">
                                <p>Guru Pengampu,</p>
                                <p className="mt-8 font-bold">
                                    ( {domain.teacherFullName || '........................................'} )
                                </p>
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
                title="Hapus Jadwal Asesmen Sumatif Harian?"
                message={
                    <span>
                        Apakah Anda yakin ingin menghapus jadwal ASH untuk mata pelajaran{' '}
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
