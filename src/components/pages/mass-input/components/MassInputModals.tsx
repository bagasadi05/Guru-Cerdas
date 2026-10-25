import React from 'react';
import { Button } from '../../../ui/Button';
import { Modal } from '../../../ui/Modal';
import { ExcelImporter } from '../../../ui/ExcelImporter';
import { GradeDistributionChart } from '../../../ui/GradeDistributionChart';
import { UnifiedGradeAdjustmentModal } from '../../../ui/UnifiedGradeAdjustmentModal';
import { ConfirmationDialog } from '../../../ui/ConfirmationDialog';
import { ImportPreviewModal } from './ImportPreviewModal';
import { InputMode, StudentRow } from '../types';

interface MassInputModalsProps {
    mode: InputMode | null;
    confirmDeleteModal: { isOpen: boolean; count: number };
    onCloseConfirmDelete: () => void;
    assessmentName: string;
    confirmDeleteText: string;
    onConfirmDeleteTextChange: (text: string) => void;
    onDeleteConfirmClick: () => void;
    isDeleting: boolean;
    showImportModal: boolean;
    onCloseImportModal: () => void;
    onImport: (data: Record<string, unknown>[]) => void;
    studentsData?: StudentRow[];
    pendingImportData: Record<string, unknown>[] | null;
    onCloseImportPreview: () => void;
    onImportConfirm: (mappedScores: Record<string, string>) => void;
    showChartModal: boolean;
    onCloseChartModal: () => void;
    scores: Record<string, string>;
    kkm: number;
    showAdjustmentModal: boolean;
    onCloseAdjustmentModal: () => void;
    onApplyAdjustment: (scores: Record<string, string>) => void;
    subjectGradeInfo: { subject: string; assessment_name: string; semester: string };
    className: string;
    semesters: { id: string; name: string }[];
    showDuplicateDialog: boolean;
    onCloseDuplicateDialog: () => void;
    duplicateList: { student_id: string; student_name: string; recorded_by_name: string | null; description: string; date: string; points: number }[];
    selectedStudentCount: number;
    onSubmitDuplicate: (bypass: boolean) => void;
    pendingClearAction: { kind: 'scores' | 'selection' | 'back' | 'switch_config'; count: number } | null;
    onDismissPendingAction: () => void;
    onConfirmPendingAction: () => void;
    gradeConflicts?: { student_id: string; serverScore: number | null; localScore: number }[] | null;
    studentNameById: Map<string, string>;
    onDismissGradeConflicts?: () => void;
    onAcceptServerGrades?: () => void;
    onOverwriteGradeConflicts?: () => void;
}

export const MassInputModals: React.FC<MassInputModalsProps> = ({
    mode,
    confirmDeleteModal,
    onCloseConfirmDelete,
    assessmentName,
    confirmDeleteText,
    onConfirmDeleteTextChange,
    onDeleteConfirmClick,
    isDeleting,
    showImportModal,
    onCloseImportModal,
    onImport,
    studentsData,
    pendingImportData,
    onCloseImportPreview,
    onImportConfirm,
    showChartModal,
    onCloseChartModal,
    scores,
    kkm,
    showAdjustmentModal,
    onCloseAdjustmentModal,
    onApplyAdjustment,
    subjectGradeInfo,
    className,
    semesters,
    showDuplicateDialog,
    onCloseDuplicateDialog,
    duplicateList,
    selectedStudentCount,
    onSubmitDuplicate,
    pendingClearAction,
    onDismissPendingAction,
    onConfirmPendingAction,
    gradeConflicts,
    studentNameById,
    onDismissGradeConflicts,
    onAcceptServerGrades,
    onOverwriteGradeConflicts,
}) => {
    return (
        <>
            {/* Confirm Delete Modal */}
            <Modal
                isOpen={confirmDeleteModal.isOpen}
                onClose={onCloseConfirmDelete}
                title="Konfirmasi Hapus Nilai"
            >
                <div className="space-y-4">
                    <p className="text-sm text-slate-600 dark:text-slate-400">
                        Anda akan menghapus <strong className="text-slate-900 dark:text-white">{confirmDeleteModal.count} data nilai</strong> untuk penilaian <strong className="text-slate-900 dark:text-white">"{assessmentName}"</strong>. Aksi ini tidak dapat dibatalkan.
                    </p>
                    <div className="pt-3 border-t border-slate-200 dark:border-slate-700">
                        <p className="text-xs text-slate-500 dark:text-slate-400 mb-3">Ketik <strong className="text-rose-500">HAPUS</strong> untuk mengonfirmasi:</p>
                        <input
                            type="text"
                            value={confirmDeleteText}
                            onChange={e => onConfirmDeleteTextChange(e.target.value)}
                            placeholder="Ketik HAPUS"
                            className="w-full px-3 py-2 text-sm border rounded-lg mb-3 bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-600 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
                        />
                    </div>
                    <div className="flex justify-end gap-2 pt-2">
                        <Button type="button" variant="ghost" onClick={onCloseConfirmDelete}>Batal</Button>
                        <Button type="button" variant="destructive" onClick={onDeleteConfirmClick} disabled={isDeleting}>
                            {isDeleting ? 'Menghapus...' : 'Ya, Hapus'}
                        </Button>
                    </div>
                </div>
            </Modal>

            {/* Import Excel Modal / Preview Matcher */}
            {mode === 'subject_grade' && (
                <>
                    <Modal isOpen={showImportModal} onClose={onCloseImportModal} title="Import Nilai dari Excel">
                        <ExcelImporter
                            columns={[
                                { key: 'name', label: 'Nama Siswa', required: true, type: 'string' },
                                { key: 'score', label: 'Nilai', required: true, type: 'number' },
                            ]}
                            onImport={onImport}
                            onCancel={onCloseImportModal}
                            templateData={studentsData?.map(s => ({ id: s.id, name: s.name }))}
                        />
                    </Modal>

                    {pendingImportData && pendingImportData.length > 0 && (
                        <ImportPreviewModal
                            isOpen={Array.isArray(pendingImportData) && pendingImportData.length > 0}
                            onClose={onCloseImportPreview}
                            parsedData={pendingImportData as unknown as { name: string; score: string | number }[]}
                            students={studentsData?.map(s => ({ id: s.id, name: s.name })) || []}
                            onConfirm={onImportConfirm}
                        />
                    )}
                </>
            )}

            {/* Chart Modal */}
            {mode === 'subject_grade' && (
                <Modal isOpen={showChartModal} onClose={onCloseChartModal} title="Distribusi Nilai">
                    <div className="p-4">
                        <GradeDistributionChart scores={scores} kkm={kkm} />
                    </div>
                </Modal>
            )}

            {/* Integrated Grade Adjustment & Print Preview Modal */}
            {mode === 'subject_grade' && (
                <UnifiedGradeAdjustmentModal
                    isOpen={showAdjustmentModal}
                    onClose={onCloseAdjustmentModal}
                    students={studentsData || []}
                    scores={scores}
                    onApply={onApplyAdjustment}
                    kkm={kkm}
                    subject={subjectGradeInfo.subject}
                    assessmentName={subjectGradeInfo.assessment_name}
                    className={className}
                    semesterLabel={subjectGradeInfo.semester ? semesters.find(s => s.id === subjectGradeInfo.semester)?.name : undefined}
                />
            )}

            {/* Duplicate preview dialog */}
            <Modal
                isOpen={showDuplicateDialog}
                onClose={onCloseDuplicateDialog}
                title={mode === 'violation' ? 'Pelanggaran Sudah Tercatat Hari Ini' : 'Data Sudah Tercatat Sebelumnya'}
                maxWidth="max-w-lg"
            >
                <div className="space-y-4 pt-2">
                    <div className="p-4 rounded-xl bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800">
                        <p className="text-sm font-medium text-amber-800 dark:text-amber-200 mb-3">
                            {mode === 'violation'
                                ? `Pelanggaran ini sudah pernah dicatat pada hari ini untuk ${duplicateList.length} siswa berikut:`
                                : `Poin ${mode === 'attitude' ? 'sikap' : 'keaktifan'} ini sudah tercatat beberapa menit terakhir untuk ${duplicateList.length} siswa berikut:`}
                        </p>
                        <div className="max-h-48 overflow-y-auto space-y-2">
                            {duplicateList.map((dup) => (
                                <div key={dup.student_id} className="flex items-center justify-between p-2.5 rounded-lg bg-white/70 dark:bg-black/20 text-xs border border-amber-200/50 dark:border-amber-800/40">
                                    <span className="font-semibold text-slate-800 dark:text-slate-200">{dup.student_name}</span>
                                    <span className="text-amber-700 dark:text-amber-300 font-medium">
                                        dicatat oleh: <strong>{dup.recorded_by_name || 'Guru lain'}</strong>
                                    </span>
                                </div>
                            ))}
                        </div>
                    </div>
                    <p className="text-sm text-slate-600 dark:text-slate-400">
                        {mode === 'violation'
                            ? 'Apakah Anda ingin tetap mencatat pelanggaran ini? Pilih simpan semua siswa (termasuk yang sudah dicatat) atau hanya siswa yang belum tercatat hari ini.'
                            : 'Apakah Anda ingin tetap memberi poin ini? Pilih simpan semua siswa (termasuk yang baru saja tercatat) atau hanya siswa yang belum tercatat.'}
                    </p>
                    <div className="flex flex-wrap justify-end gap-2 pt-2">
                        <Button type="button" variant="ghost" onClick={onCloseDuplicateDialog}>
                            Batal
                        </Button>
                        {selectedStudentCount > duplicateList.length && (
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => onSubmitDuplicate(false)}
                            >
                                Lewati yang Duplikat ({duplicateList.length})
                            </Button>
                        )}
                        <Button
                            type="button"
                            onClick={() => onSubmitDuplicate(true)}
                            className="bg-red-600 hover:bg-red-700 text-white"
                        >
                            Tetap Simpan Semua
                        </Button>
                    </div>
                </div>
            </Modal>

            {/* Guard for every destructive clear/back action */}
            <ConfirmationDialog
                isOpen={pendingClearAction !== null}
                onClose={onDismissPendingAction}
                onConfirm={onConfirmPendingAction}
                variant="warning"
                title={
                    pendingClearAction?.kind === 'back'
                        ? 'Ada Nilai Belum Disimpan'
                        : pendingClearAction?.kind === 'switch_config'
                        ? 'Pindah ke Penilaian Lain?'
                        : 'Bersihkan Input Belum Disimpan?'
                }
                confirmText={
                    pendingClearAction?.kind === 'back'
                        ? 'Ya, Tinggalkan'
                        : pendingClearAction?.kind === 'switch_config'
                        ? 'Pindah'
                        : 'Ya, Bersihkan'
                }
                cancelText={pendingClearAction?.kind === 'switch_config' ? 'Tetap di Sini' : 'Batalkan'}
                message={
                    pendingClearAction?.kind === 'back'
                        ? `${pendingClearAction.count} nilai yang sudah diketik belum tersimpan. Meninggalkan layar ini akan menghapusnya.`
                        : pendingClearAction?.kind === 'switch_config'
                        ? `${pendingClearAction.count} nilai untuk ${assessmentName || 'penilaian ini'} (${className || 'kelas ini'}) belum disimpan. Nilai itu disimpan sebagai draf di perangkat ini dan muncul lagi saat Anda kembali ke penilaian tersebut.`
                        : pendingClearAction?.kind === 'scores'
                        ? `${pendingClearAction.count} nilai yang sudah diketik akan dihapus dari formulir. Nilai yang sudah tersimpan di database tidak terpengaruh, dan Anda masih bisa mengurungkannya beberapa detik setelah ini.`
                        : `${pendingClearAction?.count ?? 0} siswa akan dihapus dari pilihan. Anda masih bisa mengurungkannya beberapa detik setelah ini.`
                }
            />

            {/* Scores changed on another device since this form loaded them */}
            <Modal
                isOpen={Boolean(gradeConflicts && gradeConflicts.length > 0)}
                onClose={() => onDismissGradeConflicts?.()}
                title="Nilai Sudah Diubah di Perangkat Lain"
                maxWidth="max-w-lg"
            >
                <div className="space-y-4 pt-2">
                    <p className="text-sm text-slate-600 dark:text-slate-300">
                        Belum ada yang disimpan. Sejak formulir ini dibuka, nilai berikut diubah dari perangkat atau akun lain. Pilih nilai yang dipakai.
                    </p>
                    <div className="max-h-56 overflow-y-auto rounded-xl border border-slate-200 dark:border-slate-700">
                        <table className="w-full text-sm">
                            <thead className="bg-slate-50 text-xs text-slate-500 dark:bg-slate-800 dark:text-slate-400">
                                <tr>
                                    <th className="px-3 py-2 text-left font-semibold">Siswa</th>
                                    <th className="px-3 py-2 text-right font-semibold">Tersimpan</th>
                                    <th className="px-3 py-2 text-right font-semibold">Isian Anda</th>
                                </tr>
                            </thead>
                            <tbody>
                                {(gradeConflicts || []).map(conflict => (
                                    <tr key={conflict.student_id} className="border-t border-slate-100 dark:border-slate-800">
                                        <td className="px-3 py-2 text-slate-800 dark:text-slate-200">{studentNameById.get(conflict.student_id) || 'Siswa'}</td>
                                        <td className="px-3 py-2 text-right tabular-nums text-slate-700 dark:text-slate-300">{conflict.serverScore ?? 'dihapus'}</td>
                                        <td className="px-3 py-2 text-right font-semibold tabular-nums text-slate-900 dark:text-white">{conflict.localScore}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                    <div className="flex flex-wrap justify-end gap-2 pt-2">
                        <Button type="button" variant="ghost" onClick={() => onDismissGradeConflicts?.()}>
                            Batal
                        </Button>
                        <Button type="button" variant="outline" onClick={() => onAcceptServerGrades?.()}>
                            Pakai nilai yang tersimpan
                        </Button>
                        <Button type="button" onClick={() => onOverwriteGradeConflicts?.()} className="bg-amber-600 hover:bg-amber-700 text-white">
                            Simpan isian saya
                        </Button>
                    </div>
                </div>
            </Modal>
        </>
    );
};
