import React, { useMemo, useState } from 'react';
import { CardTitle, CardDescription } from '../../ui/Card';
import { Button } from '../../ui/Button';
import { PlusIcon, ShieldAlertIcon, PencilIcon, TrashIcon, AlertTriangleIcon, CheckCircleIcon, ClockIcon, CameraIcon, BellIcon, FilterIcon, FileTextIcon, FileSpreadsheetIcon, DownloadIcon, LockIcon } from 'lucide-react';
import { ViolationRow } from './types';
import { DropdownMenu, DropdownTrigger, DropdownContent, DropdownItem } from '../../ui/DropdownMenu';
import { exportViolationsToPDF, exportViolationsToExcel } from '../../../services/violationExport';
import { useAuth } from '../../../hooks/useAuth';
import { useToast } from '../../../hooks/useToast';
import { SemesterSelector, SemesterLockedBanner } from '../../ui/SemesterSelector';


import { useSemester } from '../../../contexts/SemesterContext';

// Severity levels configuration
export const SEVERITY_LEVELS = {
    ringan: { label: 'Ringan', color: 'yellow', points: '1-10', icon: '⚠️', bgClass: 'bg-yellow-50 dark:bg-yellow-900/20', textClass: 'text-yellow-700 dark:text-yellow-400', borderClass: 'border-yellow-200 dark:border-yellow-800' },
    sedang: { label: 'Sedang', color: 'orange', points: '11-25', icon: '🔶', bgClass: 'bg-orange-50 dark:bg-orange-900/20', textClass: 'text-orange-700 dark:text-orange-400', borderClass: 'border-orange-200 dark:border-orange-800' },
    berat: { label: 'Berat', color: 'red', points: '26+', icon: '🔴', bgClass: 'bg-red-50 dark:bg-red-900/20', textClass: 'text-red-700 dark:text-red-400', borderClass: 'border-red-200 dark:border-red-800' },
} as const;

export type SeverityLevel = keyof typeof SEVERITY_LEVELS;

export const FOLLOW_UP_STATUS = {
    pending: { label: 'Belum Ditindak', color: 'gray', icon: ClockIcon },
    in_progress: { label: 'Sedang Diproses', color: 'blue', icon: AlertTriangleIcon },
    resolved: { label: 'Sudah Selesai', color: 'green', icon: CheckCircleIcon },
} as const;

export type FollowUpStatus = keyof typeof FOLLOW_UP_STATUS;

// Warning thresholds
const WARNING_THRESHOLD = 25;
const DANGER_THRESHOLD = 50;
const CRITICAL_THRESHOLD = 75;

interface ViolationsTabProps {
    violations: ViolationRow[];
    onAdd: () => void;
    onEdit: (record: ViolationRow) => void;
    onDelete: (id: string) => void;
    onNotifyParent?: (violation: ViolationRow) => void;
    onUpdateFollowUp?: (id: string, status: FollowUpStatus, notes?: string) => void;
    isOnline: boolean;
    studentName?: string;
}

// Threshold Alert Component
const ThresholdAlert: React.FC<{ totalPoints: number; studentName?: string }> = ({ totalPoints, studentName }) => {
    if (totalPoints < WARNING_THRESHOLD) return null;

    let alertType: 'warning' | 'danger' | 'critical' = 'warning';
    let message = '';
    let recommendation = '';

    if (totalPoints >= CRITICAL_THRESHOLD) {
        alertType = 'critical';
        message = `PERINGATAN KRITIS: ${studentName || 'Siswa'} telah mengumpulkan ${totalPoints} poin pelanggaran!`;
        recommendation = 'Segera lakukan pemanggilan orang tua dan konseling intensif.';
    } else if (totalPoints >= DANGER_THRESHOLD) {
        alertType = 'danger';
        message = `PERINGATAN: ${studentName || 'Siswa'} telah mengumpulkan ${totalPoints} poin pelanggaran.`;
        recommendation = 'Pertimbangkan untuk menghubungi orang tua dan memberikan pembinaan khusus.';
    } else {
        message = `Perhatian: ${studentName || 'Siswa'} telah mengumpulkan ${totalPoints} poin pelanggaran.`;
        recommendation = 'Pantau perilaku siswa dan berikan bimbingan pencegahan.';
    }

    const alertStyles = {
        warning: 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800',
        danger: 'bg-orange-50 dark:bg-orange-900/20 border-orange-200 dark:border-orange-800',
        critical: 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800 animate-pulse',
    };

    const textStyles = {
        warning: 'text-yellow-800 dark:text-yellow-200',
        danger: 'text-orange-800 dark:text-orange-200',
        critical: 'text-red-800 dark:text-red-200',
    };

    return (
        <div className={`mb-6 p-4 rounded-xl border-2 ${alertStyles[alertType]}`}>
            <div className="flex items-start gap-3">
                <AlertTriangleIcon className={`w-6 h-6 flex-shrink-0 ${textStyles[alertType]}`} />
                <div>
                    <p className={`font-bold ${textStyles[alertType]}`}>{message}</p>
                    <p className={`text-sm mt-1 ${textStyles[alertType]} opacity-80`}>{recommendation}</p>
                    <div className="flex items-center gap-4 mt-3">
                        <div className="flex items-center gap-2">
                            <div className={`w-full h-2 rounded-full bg-gray-200 dark:bg-gray-700 overflow-hidden`} style={{ width: '200px' }}>
                                <div
                                    className={`h-full ${alertType === 'critical' ? 'bg-red-500' : alertType === 'danger' ? 'bg-orange-500' : 'bg-yellow-500'}`}
                                    style={{ width: `${Math.min(100, (totalPoints / 100) * 100)}%` }}
                                />
                            </div>
                            <span className={`text-xs font-bold ${textStyles[alertType]}`}>{totalPoints}/100</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

// Stats Summary
const ViolationStats: React.FC<{ violations: ViolationRow[] }> = ({ violations }) => {
    const stats = useMemo(() => {
        const totalPoints = violations.reduce((sum, v) => sum + v.points, 0);
        const bySeverity = {
            ringan: violations.filter(v => v.severity === 'ringan').length,
            sedang: violations.filter(v => v.severity === 'sedang').length,
            berat: violations.filter(v => v.severity === 'berat').length,
        };
        const pending = violations.filter(v => v.follow_up_status === 'pending' || !v.follow_up_status).length;
        const notified = violations.filter(v => v.parent_notified).length;

        return { totalPoints, bySeverity, pending, notified, total: violations.length };
    }, [violations]);

    return (
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3 mb-6">
            <div className="p-3 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-800/30">
                <p className="text-2xl font-bold text-red-600 dark:text-red-400">{stats.totalPoints}</p>
                <p className="text-xs text-red-500">Total Poin</p>
            </div>
            <div className="p-3 rounded-xl bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-100 dark:border-yellow-800/30">
                <p className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">{stats.bySeverity.ringan}</p>
                <p className="text-xs text-yellow-500">Ringan</p>
            </div>
            <div className="p-3 rounded-xl bg-orange-50 dark:bg-orange-900/20 border border-orange-100 dark:border-orange-800/30">
                <p className="text-2xl font-bold text-orange-600 dark:text-orange-400">{stats.bySeverity.sedang}</p>
                <p className="text-xs text-orange-500">Sedang</p>
            </div>
            <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-900/20 border border-rose-100 dark:border-rose-800/30">
                <p className="text-2xl font-bold text-rose-600 dark:text-rose-400">{stats.bySeverity.berat}</p>
                <p className="text-xs text-rose-500">Berat</p>
            </div>
            <div className="p-3 rounded-xl bg-gray-50 dark:bg-gray-800/50 border border-gray-100 dark:border-gray-700">
                <p className="text-2xl font-bold text-gray-600 dark:text-gray-400">{stats.pending}</p>
                <p className="text-xs text-gray-500">Pending</p>
            </div>
            <div className="p-3 rounded-xl bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800/30">
                <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">{stats.notified}</p>
                <p className="text-xs text-blue-500">Notifikasi</p>
            </div>
        </div>
    );
};

// Violation Card Component
const ViolationCard: React.FC<{
    violation: ViolationRow;
    onEdit: () => void;
    onDelete: () => void;
    onNotifyParent?: () => void;
    onUpdateFollowUp?: (status: FollowUpStatus) => void;
    isOnline: boolean;
    isLocked?: boolean;
}> = ({ violation, onEdit, onDelete, onNotifyParent, onUpdateFollowUp, isOnline, isLocked = false }) => {
    const [showFollowUp, setShowFollowUp] = useState(false);
    const severity = violation.severity ? SEVERITY_LEVELS[violation.severity] : SEVERITY_LEVELS.ringan;
    const followUp = violation.follow_up_status ? FOLLOW_UP_STATUS[violation.follow_up_status] : FOLLOW_UP_STATUS.pending;
    const FollowUpIcon = followUp.icon;
    const canModify = !isLocked;

    return (
        <div className={`group relative p-4 rounded-xl border-2 ${severity.borderClass} ${severity.bgClass} transition-all hover:shadow-md`}>
            {/* Header */}
            <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2">
                    <span className="text-xl">{severity.icon}</span>
                    <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${severity.bgClass} ${severity.textClass} border ${severity.borderClass}`}>
                        {severity.label}
                    </span>
                    {violation.parent_notified && (
                        <span className="px-2 py-0.5 rounded-full text-xs bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 flex items-center gap-1">
                            <BellIcon className="w-3 h-3" />
                            Terkirim
                        </span>
                    )}
                </div>
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    {!violation.parent_notified && onNotifyParent && (
                        <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-blue-500 hover:text-blue-600"
                            onClick={onNotifyParent}
                            disabled={!isOnline}
                            title="Notifikasi Orang Tua"
                        >
                            <BellIcon className="h-4 w-4" />
                        </Button>
                    )}
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onEdit} disabled={!isOnline || !canModify} title={!canModify ? 'Semester Terkunci' : 'Edit'}>
                        {canModify ? <PencilIcon className="h-4 w-4" /> : <LockIcon className="h-4 w-4 text-amber-500" />}
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-red-600 dark:text-red-400" onClick={onDelete} disabled={!isOnline || !canModify} title={!canModify ? 'Semester Terkunci' : 'Hapus'}>
                        <TrashIcon className="h-4 w-4" />
                    </Button>
                </div>
            </div>

            {/* Content */}
            <div className="mb-3">
                <p className="font-semibold text-gray-900 dark:text-white text-lg">{violation.description}</p>
                <div className="flex items-center gap-4 mt-2 text-sm text-gray-500 dark:text-gray-400">
                    <span>{new Date(violation.date).toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</span>
                    <span className={`font-bold ${severity.textClass}`}>+{violation.points} poin</span>
                </div>
            </div>

            {/* Evidence */}
            {violation.evidence_url && (
                <div className="mb-3">
                    <a
                        href={violation.evidence_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-white/50 dark:bg-black/20 border border-gray-200 dark:border-gray-700 hover:bg-white dark:hover:bg-black/30 transition-colors text-sm"
                    >
                        <CameraIcon className="w-4 h-4" />
                        <span>Lihat Bukti</span>
                    </a>
                </div>
            )}

            {/* Follow-up Status */}
            <div className="flex items-center justify-between pt-3 border-t border-gray-200 dark:border-gray-700">
                <button
                    onClick={() => setShowFollowUp(!showFollowUp)}
                    className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${followUp.color === 'green'
                        ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400'
                        : followUp.color === 'blue'
                            ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400'
                            : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-400'
                        }`}
                >
                    <FollowUpIcon className="w-4 h-4" />
                    {followUp.label}
                </button>

                {/* Quick Follow-up Actions */}
                {showFollowUp && onUpdateFollowUp && (
                    <div className="flex items-center gap-1 animate-fade-in">
                        {(['pending', 'in_progress', 'resolved'] as FollowUpStatus[]).map((status) => {
                            const StatusIcon = FOLLOW_UP_STATUS[status].icon;
                            const isActive = violation.follow_up_status === status;
                            return (
                                <button
                                    key={status}
                                    onClick={() => onUpdateFollowUp(status)}
                                    disabled={!isOnline || isActive}
                                    className={`p-2 rounded-lg transition-colors ${isActive
                                        ? 'bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600'
                                        : 'hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500'
                                        }`}
                                    title={FOLLOW_UP_STATUS[status].label}
                                >
                                    <StatusIcon className="w-4 h-4" />
                                </button>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* Follow-up Notes */}
            {violation.follow_up_notes && (
                <p className="mt-2 text-sm text-gray-500 dark:text-gray-400 italic">
                    📝 {violation.follow_up_notes}
                </p>
            )}
        </div>
    );
};

// Filter options
type SeverityFilter = SeverityLevel | 'all';
type StatusFilter = FollowUpStatus | 'all';

export const ViolationsTab: React.FC<ViolationsTabProps> = ({
    violations,
    onAdd,
    onEdit,
    onDelete,
    onNotifyParent,
    onUpdateFollowUp,
    isOnline,
    studentName
}) => {
    const [severityFilter, setSeverityFilter] = useState<SeverityFilter>('all');
    const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
    const { activeSemester, isLocked } = useSemester();
    const [semesterFilter, setSemesterFilter] = useState<string>(activeSemester?.id || 'all');
    const { user } = useAuth();
    const toast = useToast();

    // ... useEffect ...

    // Find the viewing semester to check lock status for banner
    const isViewingLocked = semesterFilter !== 'all' ? isLocked(semesterFilter) : false;

    const totalPoints = useMemo(() => violations.reduce((sum, v) => sum + v.points, 0), [violations]);

    const filteredViolations = useMemo(() => {
        let semesterFiltered = violations;
        if (semesterFilter !== 'all') {
            semesterFiltered = violations.filter(v => v.semester_id === semesterFilter);
        }

        return [...semesterFiltered]
            .filter(v => severityFilter === 'all' || v.severity === severityFilter)
            .filter(v => statusFilter === 'all' || v.follow_up_status === statusFilter || (!v.follow_up_status && statusFilter === 'pending'))
            .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    }, [violations, severityFilter, statusFilter, semesterFilter]);

    return (
        <div className="p-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-4">
                <div>
                    <CardTitle>Riwayat Pelanggaran</CardTitle>
                    <CardDescription>Semua catatan pelanggaran tata tertib sekolah.</CardDescription>
                </div>
            </div>
            <div className="flex gap-2">
                <DropdownMenu>
                    <DropdownTrigger className="gap-2">
                        <DownloadIcon className="w-4 h-4" />
                        Export
                    </DropdownTrigger>
                    <DropdownContent>
                        <DropdownItem onClick={() => {
                            exportViolationsToPDF({
                                studentName: studentName || 'Siswa',
                                className: 'Fase F', // Placeholder, ideally passed from parent
                                schoolName: user?.school_name || 'Sekolah',
                                violations: filteredViolations
                            });
                            toast.success('Mengunduh Laporan PDF...');
                        }} icon={<FileTextIcon className="w-4 h-4 text-red-500" />}>
                            Export PDF (Formal)
                        </DropdownItem>
                        <DropdownItem onClick={() => {
                            exportViolationsToExcel({
                                studentName: studentName || 'Siswa',
                                className: 'Fase F', // Placeholder
                                schoolName: user?.school_name || 'Sekolah',
                                violations: filteredViolations
                            });
                            toast.success('Mengunduh Data Excel...');
                        }} icon={<FileSpreadsheetIcon className="w-4 h-4 text-green-600" />}>
                            Export Excel
                        </DropdownItem>
                    </DropdownContent>
                </DropdownMenu>
                <Button onClick={onAdd} disabled={!isOnline}>
                    <PlusIcon className="w-4 h-4 mr-2" />Tambah Pelanggaran
                </Button>
            </div>

            {/* Threshold Alert */}
            <ThresholdAlert totalPoints={totalPoints} studentName={studentName} />

            {/* Stats */}
            <ViolationStats violations={violations} />

            {/* Semester Locked Banner */}
            {semesterFilter !== 'all' && isViewingLocked && (
                <div className="mb-4">
                    <SemesterLockedBanner isLocked={true} />
                </div>
            )}

            {/* Filters */}
            <div className="flex flex-wrap items-center gap-3 mb-6 pb-4 border-b border-gray-200 dark:border-gray-700">
                <div className="flex items-center gap-2">
                    <FilterIcon className="w-4 h-4 text-gray-400" />
                    <span className="text-sm text-gray-500">Filter:</span>
                </div>

                {/* Semester Filter */}
                <SemesterSelector
                    value={semesterFilter}
                    onChange={setSemesterFilter}
                    size="sm"
                />

                {/* Severity Filter */}
                <select
                    value={severityFilter}
                    onChange={(e) => setSeverityFilter(e.target.value as SeverityFilter)}
                    className="px-3 py-1.5 text-sm rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300"
                >
                    <option value="all">Semua Tingkat</option>
                    <option value="ringan">⚠️ Ringan</option>
                    <option value="sedang">🔶 Sedang</option>
                    <option value="berat">🔴 Berat</option>
                </select>

                {/* Status Filter */}
                <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
                    className="px-3 py-1.5 text-sm rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300"
                >
                    <option value="all">Semua Status</option>
                    <option value="pending">Belum Ditindak</option>
                    <option value="in_progress">Sedang Diproses</option>
                    <option value="resolved">Sudah Selesai</option>
                </select>

                {(severityFilter !== 'all' || statusFilter !== 'all') && (
                    <button
                        onClick={() => { setSeverityFilter('all'); setStatusFilter('all'); }}
                        className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline"
                    >
                        Reset Filter
                    </button>
                )}
            </div>

            {/* Content */}
            {
                filteredViolations.length > 0 ? (
                    <div className="space-y-4">
                        {filteredViolations.map(v => {
                            // Check lock status using semester ID
                            const isViolationLocked = v.semester_id ? isLocked(v.semester_id) : isLocked(v.date);

                            return (
                                <ViolationCard
                                    key={v.id}
                                    violation={v}
                                    onEdit={() => onEdit(v)}
                                    onDelete={() => onDelete(v.id)}
                                    onNotifyParent={onNotifyParent ? () => onNotifyParent(v) : undefined}
                                    onUpdateFollowUp={onUpdateFollowUp ? (status) => onUpdateFollowUp(v.id, status) : undefined}
                                    isOnline={isOnline}
                                    isLocked={isViolationLocked}
                                />
                            );
                        })}
                    </div>
                ) : (
                    <div className="text-center py-16 text-gray-400">
                        <ShieldAlertIcon className="w-16 h-16 mx-auto mb-4 text-gray-600" />
                        <h4 className="font-semibold">
                            {violations.length === 0 ? 'Tidak Ada Pelanggaran' : 'Tidak Ada Hasil Filter'}
                        </h4>
                        <p>
                            {violations.length === 0
                                ? 'Siswa ini memiliki catatan perilaku yang bersih.'
                                : 'Coba ubah filter untuk melihat pelanggaran lainnya.'}
                        </p>
                    </div>
                )
            }
        </div>
    );
};
