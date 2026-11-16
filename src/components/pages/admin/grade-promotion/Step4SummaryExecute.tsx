import React from 'react';
import { AlertTriangle } from 'lucide-react';
import { Button } from '../../../ui/Button';
import type { ClassTransitionSummaryRow } from './useGradePromotionWizard';

interface Step4SummaryExecuteProps {
    effectiveYearName: string;
    unassignedCount: number;
    onGoToStep3: () => void;
    moveSummary: {
        graduated: number;
        promoted: number;
        rolled: number;
        retained: number;
        total: number;
    };
    classTransitionSummary: ClassTransitionSummaryRow[];
    copyTeacherAssignments: boolean;
    onToggleCopyTeacherAssignments: (checked: boolean) => void;
    confirmExecute: boolean;
}

/**
 * Step 4: Per-class transition summary, teacher assignment copy toggle, and final execute confirmation.
 */
export const Step4SummaryExecute: React.FC<Step4SummaryExecuteProps> = ({
    effectiveYearName,
    unassignedCount,
    onGoToStep3,
    moveSummary,
    classTransitionSummary,
    copyTeacherAssignments,
    onToggleCopyTeacherAssignments,
    confirmExecute,
}) => {
    return (
        <div className="space-y-5">
            {unassignedCount > 0 && (
                <div className="p-4 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-center gap-2.5 text-sm text-amber-900 dark:text-amber-200">
                        <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" aria-hidden="true" />
                        <span>
                            Masih ada <strong>{unassignedCount} siswa Kelas 3</strong> yang belum dipilih kelas 4 tujuannya.
                        </span>
                    </div>
                    <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={onGoToStep3}
                        className="shrink-0"
                    >
                        Buka Pembagian Kelas 4
                    </Button>
                </div>
            )}

            {/* Summary Table by Class */}
            <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
                <div className="p-4 sm:p-5 border-b border-slate-200 dark:border-slate-700 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div>
                        <h2 className="text-base font-semibold text-slate-900 dark:text-white">
                            Ringkasan Perpindahan Kelas
                        </h2>
                        <p className="text-sm text-slate-500 dark:text-slate-400">
                            Periksa kembali jumlah siswa yang naik kelas, dibagi ke kelas 4, atau lulus sebelum disimpan.
                        </p>
                    </div>
                    <div className="text-xs text-slate-600 dark:text-slate-300 tabular-nums flex flex-wrap items-center gap-3">
                        <span>Lulus: <strong>{moveSummary.graduated}</strong></span>
                        <span>•</span>
                        <span>Naik Reguler: <strong>{moveSummary.promoted}</strong></span>
                        <span>•</span>
                        <span>Masuk Kelas 4: <strong>{moveSummary.rolled}</strong></span>
                        <span>•</span>
                        <span>Tinggal Kelas: <strong>{moveSummary.retained}</strong></span>
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="text-xs text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-900/60 border-b border-slate-200 dark:border-slate-700">
                            <tr>
                                <th className="py-3 px-4 font-medium">Kelas Asal</th>
                                <th className="py-3 px-4 font-medium">Tujuan</th>
                                <th className="py-3 px-4 font-medium text-right">Naik / Lulus</th>
                                <th className="py-3 px-4 font-medium text-right">Tinggal Kelas</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200 dark:divide-slate-700 tabular-nums">
                            {classTransitionSummary.map(row => (
                                <tr key={row.fromClassId} className="hover:bg-slate-50 dark:hover:bg-slate-700/40">
                                    <td className="py-3 px-4 font-medium text-slate-900 dark:text-white">
                                        {row.fromClassName}
                                    </td>
                                    <td className="py-3 px-4 text-slate-600 dark:text-slate-300">
                                        {row.targetLabel}
                                    </td>
                                    <td className="py-3 px-4 text-right font-medium text-slate-900 dark:text-white">
                                        {row.movingCount} siswa
                                    </td>
                                    <td className="py-3 px-4 text-right text-slate-600 dark:text-slate-400">
                                        {row.retainedCount > 0 ? (
                                            <span className="text-rose-600 dark:text-rose-400 font-medium">
                                                {row.retainedCount} siswa
                                            </span>
                                        ) : (
                                            '-'
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Teacher Assignment Copy Option */}
            <label className="p-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 flex items-start gap-3 cursor-pointer">
                <input
                    type="checkbox"
                    checked={copyTeacherAssignments}
                    onChange={e => onToggleCopyTeacherAssignments(e.target.checked)}
                    className="mt-1 w-4 h-4 rounded text-emerald-600 focus:ring-emerald-600 cursor-pointer"
                />
                <div className="text-sm">
                    <p className="font-medium text-slate-900 dark:text-white">
                        Salin penugasan Wali Kelas dan Guru Mata Pelajaran ke semester baru
                    </p>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                        Menjaga akses guru ke kelas masing-masing pada semester baru. Perubahan wali kelas tetap dapat diatur kapan saja melalui menu Penugasan Guru.
                    </p>
                </div>
            </label>

            {confirmExecute && (
                <div className="p-4 rounded-xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-800/60 space-y-1.5">
                    <p className="font-semibold text-sm text-rose-900 dark:text-rose-200">
                        Konfirmasi Simpan Kenaikan Kelas ({effectiveYearName})
                    </p>
                    <p className="text-xs text-rose-800 dark:text-rose-300">
                        Sebanyak {moveSummary.total} data siswa akan diperbarui ke kelas baru. Anda tetap dapat membatalkan perubahan ini melalui tombol Batalkan Kenaikan Kelas jika diperlukan.
                    </p>
                </div>
            )}
        </div>
    );
};
