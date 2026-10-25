import React from 'react';
import { Modal } from '../../../ui/Modal';
import { Button } from '../../../ui/Button';
import { CustomDropdown } from '../../../ui/CustomDropdown';
import {
    KeyRoundIcon,
    CopyIcon,
    CopyCheckIcon,
    Share2Icon,
    PrinterIcon,
    SparklesIcon,
    AlertCircleIcon,
    CheckCircleIcon,
} from '../../../Icons';
import { EditStudentForm } from '../forms/EditStudentForm';
import { ReportForm } from '../forms/ReportForm';
import { AcademicForm } from '../forms/AcademicForm';
import { QuizForm } from '../forms/QuizForm';
import { ViolationForm } from '../forms/ViolationForm';
import { AchievementForm } from '../forms/AchievementForm';
import { CommunicationForm } from '../forms/CommunicationForm';
import { DuplicateViolationDialog } from './DuplicateViolationDialog';
import { createWhatsAppLink } from '../../../../utils/whatsappUtils';
import type { ClassRow, StudentWithClass } from '../types';
import type { AchievementFormValues } from '../schemas';

interface StudentDetailModalsProps {
    modalState: any;
    setModalState: React.Dispatch<React.SetStateAction<any>>;
    student: StudentWithClass;
    classes: ClassRow[];
    isOnline: boolean;
    // Form submit handlers
    handleEditStudentSubmit: (data: any) => void;
    handleReportSubmit: (data: any) => void;
    handleAcademicSubmit: (data: any) => void;
    handleQuizSubmit: (data: any) => void;
    handleViolationSubmit: (data: any) => void;
    handleAchievementSubmit: (data: AchievementFormValues & { evidence_file?: File | null; certificate_removed?: boolean }) => Promise<void>;
    handleCommunicationSubmit: (data: any) => void;
    // Conflict & duplicate handlers
    violationConflictFields: any[];
    setViolationConflictFields: React.Dispatch<React.SetStateAction<any[]>>;
    duplicateDialog: any;
    handleDuplicateConfirm: () => void;
    handleDuplicateCancel: () => void;
    // Mutation pending states
    studentMutation: any;
    reportMutation: any;
    academicMutation: any;
    quizMutation: any;
    violationMutation: any;
    communicationMutation: any;
    deleteMutation: any;
    deleteAchievementMutation: any;
    createAchievementMutation: any;
    updateAchievementMutation: any;
    applyPointsMutation: any;
    fileActionStatus: 'idle' | 'uploading' | 'deleting';
    // Portal access handlers
    copied: boolean;
    handleCopyAccessCode: () => void;
    handleShare: () => void;
    handlePrint: () => void;
    handleGenerateAccessCode: () => void;
    // Apply points
    availableFilteredQuizPoints: any[];
    subjectToApply: string;
    setSubjectToApply: (val: string) => void;
    uniqueSubjectsForGrades: (string | null | undefined)[];
    currentRecordForSubject: any;
    handleApplyPointsSubmit: () => void;
    // AI Assistant
    isAiReportLoading: boolean;
    aiReportError: string | null;
    aiReport: string;
    setAiReport: (val: string) => void;
    copiedAiReport: boolean;
    setCopiedAiReport: (val: boolean) => void;
    handleGenerateAiReport: () => void;
    toast: any;
}

export const StudentDetailModals: React.FC<StudentDetailModalsProps> = ({
    modalState,
    setModalState,
    student,
    classes,
    isOnline,
    handleEditStudentSubmit,
    handleReportSubmit,
    handleAcademicSubmit,
    handleQuizSubmit,
    handleViolationSubmit,
    handleAchievementSubmit,
    handleCommunicationSubmit,
    violationConflictFields,
    setViolationConflictFields,
    duplicateDialog,
    handleDuplicateConfirm,
    handleDuplicateCancel,
    studentMutation,
    reportMutation,
    academicMutation,
    quizMutation,
    violationMutation,
    communicationMutation,
    deleteMutation,
    deleteAchievementMutation,
    createAchievementMutation,
    updateAchievementMutation,
    applyPointsMutation,
    fileActionStatus,
    copied,
    handleCopyAccessCode,
    handleShare,
    handlePrint,
    handleGenerateAccessCode,
    availableFilteredQuizPoints,
    subjectToApply,
    setSubjectToApply,
    uniqueSubjectsForGrades,
    currentRecordForSubject,
    handleApplyPointsSubmit,
    isAiReportLoading,
    aiReportError,
    aiReport,
    setAiReport,
    copiedAiReport,
    setCopiedAiReport,
    handleGenerateAiReport,
    toast,
}) => {
    return (
        <>
            {modalState.type === 'applyPoints' ? (
                <Modal isOpen={true} onClose={() => setModalState({ type: 'closed' })} title="Gunakan Poin Keaktifan">
                    <div className="space-y-4">
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                            Anda akan menggunakan <strong>{availableFilteredQuizPoints.length} poin</strong> keaktifan sebagai nilai tambahan. Poin ini akan ditandai sudah digunakan.
                        </p>
                        <div>
                            <label htmlFor="subject-select" className="block text-sm font-medium mb-1">
                                Pilih Mata Pelajaran
                            </label>
                            <CustomDropdown
                                id="subject-select"
                                value={subjectToApply}
                                onChange={setSubjectToApply}
                                options={uniqueSubjectsForGrades.filter((s): s is string => !!s).map((s) => ({ value: s, label: s }))}
                                placeholder="-- Pilih --"
                            />
                        </div>
                        {currentRecordForSubject && (
                            <div className="p-3 bg-gray-100 dark:bg-gray-800 rounded-md text-sm">
                                <p>
                                    Nilai Saat Ini: <strong className="text-lg">{currentRecordForSubject.score}</strong>
                                </p>
                                <p>
                                    Nilai Baru:{' '}
                                    <strong className="text-lg text-green-500">
                                        {Math.min(100, currentRecordForSubject.score + availableFilteredQuizPoints.length)}
                                    </strong>
                                </p>
                            </div>
                        )}
                        <div className="flex justify-end gap-2 pt-4">
                            <Button type="button" variant="ghost" onClick={() => setModalState({ type: 'closed' })}>
                                Batal
                            </Button>
                            <Button
                                type="button"
                                onClick={handleApplyPointsSubmit}
                                disabled={applyPointsMutation.isPending || !subjectToApply || availableFilteredQuizPoints.length === 0}
                            >
                                {applyPointsMutation.isPending ? 'Menerapkan...' : 'Terapkan Poin'}
                            </Button>
                        </div>
                    </div>
                </Modal>
            ) : modalState.type !== 'closed' && modalState.type !== 'confirmDelete' && (
                <Modal
                    isOpen={true}
                    onClose={() => setModalState({ type: 'closed' })}
                    maxWidth={modalState.type === 'editStudent' ? 'max-w-xl' : undefined}
                    title={
                        modalState.type === 'editStudent'
                            ? 'Edit Profil Siswa'
                            : modalState.type === 'report'
                            ? modalState.data
                                ? 'Edit Catatan'
                                : 'Tambah Catatan Baru'
                            : modalState.type === 'academic'
                            ? modalState.data
                                ? 'Edit Nilai'
                                : 'Tambah Nilai Baru'
                            : modalState.type === 'quiz'
                            ? modalState.data
                                ? 'Edit Poin'
                                : 'Tambah Poin Keaktifan'
                            : modalState.type === 'editCommunication'
                            ? 'Edit Pesan'
                            : modalState.type === 'portalAccess'
                            ? 'Akses Portal Orang Tua'
                            : modalState.type === 'achievement'
                            ? modalState.mode === 'edit'
                                ? 'Edit Prestasi'
                                : 'Tambah Prestasi Baru'
                            : 'Tambah Pelanggaran'
                    }
                >
                    {modalState.type === 'editStudent' && (
                        <EditStudentForm
                            defaultValues={modalState.data}
                            classes={classes}
                            onSubmit={handleEditStudentSubmit}
                            onClose={() => setModalState({ type: 'closed' })}
                            isPending={studentMutation.isPending}
                        />
                    )}
                    {modalState.type === 'report' && (
                        <ReportForm
                            defaultValues={modalState.data || null}
                            onSubmit={handleReportSubmit}
                            onClose={() => setModalState({ type: 'closed' })}
                            isPending={reportMutation.isPending}
                        />
                    )}
                    {modalState.type === 'academic' && (
                        <AcademicForm
                            defaultValues={modalState.data || null}
                            onSubmit={handleAcademicSubmit}
                            onClose={() => setModalState({ type: 'closed' })}
                            isPending={academicMutation.isPending}
                        />
                    )}
                    {modalState.type === 'quiz' && (
                        <QuizForm
                            defaultValues={modalState.data || null}
                            onSubmit={handleQuizSubmit}
                            onClose={() => setModalState({ type: 'closed' })}
                            isPending={quizMutation.isPending}
                        />
                    )}
                    {modalState.type === 'violation' && (
                        <ViolationForm
                            defaultValues={modalState.data || null}
                            onSubmit={handleViolationSubmit}
                            onClose={() => {
                                setModalState({ type: 'closed' });
                                setViolationConflictFields([]);
                            }}
                            isPending={violationMutation.isPending}
                            conflictFields={violationConflictFields}
                        />
                    )}
                    {modalState.type === 'achievement' && (
                        <AchievementForm
                            defaultValues={modalState.data || null}
                            onSubmit={handleAchievementSubmit}
                            onClose={() => setModalState({ type: 'closed' })}
                            isPending={
                                createAchievementMutation.isPending ||
                                updateAchievementMutation.isPending ||
                                fileActionStatus !== 'idle'
                            }
                            fileActionStatus={fileActionStatus}
                        />
                    )}
                    {modalState.type === 'editCommunication' && (
                        <CommunicationForm
                            defaultValues={modalState.data}
                            onSubmit={handleCommunicationSubmit}
                            onClose={() => setModalState({ type: 'closed' })}
                            isPending={communicationMutation.isPending}
                        />
                    )}
                    {modalState.type === 'portalAccess' && (
                        <div className="p-4 flex flex-col items-center">
                            <p className="text-sm text-gray-500 dark:text-gray-400 mb-6 text-center">
                                Bagikan kode akses ini kepada orang tua atau wali siswa.
                            </p>

                            {student.access_code ? (
                                <div className="w-full max-w-sm p-6 rounded-2xl bg-gradient-to-br from-green-100 to-emerald-100 dark:from-green-900/40 dark:to-emerald-900/40 shadow-inner border border-green-200 dark:border-green-800 text-center mb-6">
                                    <p className="text-sm font-semibold text-green-900 dark:text-green-200 mb-2">
                                        Kode Akses Siswa
                                    </p>
                                    <div className="bg-white/80 dark:bg-black/40 p-3 rounded-lg border border-green-100 dark:border-green-800 mb-2">
                                        <p className="text-3xl font-mono font-bold tracking-[0.2em] text-green-700 dark:text-green-300">
                                            {student.access_code}
                                        </p>
                                    </div>
                                    <p className="text-xs text-green-600 dark:text-green-400">Kode ini bersifat rahasia.</p>
                                </div>
                            ) : (
                                <div className="text-center py-8 mb-6">
                                    <KeyRoundIcon className="w-12 h-12 mx-auto text-gray-300 dark:text-gray-600 mb-3" />
                                    <p className="text-gray-500">Belum ada kode akses.</p>
                                </div>
                            )}

                            <div className="grid grid-cols-2 gap-3 w-full">
                                <Button
                                    onClick={handleCopyAccessCode}
                                    variant="outline"
                                    className="w-full h-11 rounded-xl cursor-pointer active:scale-95 transition-all font-medium"
                                    disabled={!student.access_code}
                                >
                                    {copied ? <CopyCheckIcon className="w-4 h-4 mr-2 text-green-500" /> : <CopyIcon className="w-4 h-4 mr-2" />}
                                    {copied ? 'Disalin' : 'Salin'}
                                </Button>
                                <Button
                                    onClick={handleShare}
                                    variant="outline"
                                    className="w-full h-11 rounded-xl cursor-pointer active:scale-95 transition-all font-medium"
                                    disabled={!student.access_code}
                                >
                                    <Share2Icon className="w-4 h-4 mr-2" /> Bagikan
                                </Button>
                                <Button
                                    onClick={handlePrint}
                                    variant="outline"
                                    className="w-full h-11 rounded-xl cursor-pointer active:scale-95 transition-all font-medium"
                                    disabled={!student.access_code}
                                >
                                    <PrinterIcon className="w-4 h-4 mr-2" /> Cetak
                                </Button>
                                <Button
                                    onClick={handleGenerateAccessCode}
                                    variant="outline"
                                    className="w-full h-11 rounded-xl cursor-pointer active:scale-95 transition-all font-medium"
                                    disabled={!isOnline || studentMutation.isPending}
                                >
                                    <SparklesIcon className="w-4 h-4 mr-2" /> {student.access_code ? 'Reset' : 'Buat Baru'}
                                </Button>
                            </div>
                        </div>
                    )}
                </Modal>
            )}

            {modalState.type === 'confirmDelete' && (
                <Modal isOpen={true} onClose={() => setModalState({ type: 'closed' })} title={modalState.title}>
                    <p className="text-sm text-gray-600 dark:text-gray-400">{modalState.message}</p>
                    <div className="flex justify-end gap-2 pt-4">
                        <Button
                            type="button"
                            variant="ghost"
                            onClick={() => setModalState({ type: 'closed' })}
                            disabled={deleteMutation.isPending || deleteAchievementMutation.isPending}
                        >
                            Batal
                        </Button>
                        <Button
                            type="button"
                            variant="destructive"
                            onClick={modalState.onConfirm}
                            disabled={deleteMutation.isPending || deleteAchievementMutation.isPending}
                        >
                            {deleteMutation.isPending || deleteAchievementMutation.isPending ? 'Menghapus...' : 'Ya, Hapus'}
                        </Button>
                    </div>
                </Modal>
            )}

            {modalState.type === 'aiAssistant' && (
                <Modal isOpen={true} onClose={() => setModalState({ type: 'closed' })} title="Asisten AI Wali Kelas: Laporan Orang Tua">
                    <div className="space-y-4">
                        {isAiReportLoading ? (
                            <div className="flex flex-col items-center justify-center py-12 text-center animate-fade-in">
                                <div className="relative w-16 h-16 mb-4">
                                    <div className="absolute inset-0 rounded-full border-4 border-fuchsia-200 animate-ping"></div>
                                    <div className="relative w-16 h-16 rounded-full border-4 border-fuchsia-600 border-t-transparent animate-spin"></div>
                                </div>
                                <h4 className="font-semibold text-gray-900 dark:text-white mb-2">Merangkum Laporan Perkembangan...</h4>
                                <p className="text-xs text-gray-500 dark:text-gray-400 max-w-sm">
                                    Kecerdasan Buatan sedang menganalisis data nilai akademik, kehadiran, keaktifan, dan perilaku {student.name} secara menyeluruh untuk menyusun pesan WhatsApp yang santun, apresiatif, dan memotivasi.
                                </p>
                            </div>
                        ) : aiReportError ? (
                            <div className="p-4 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900 rounded-xl text-center">
                                <AlertCircleIcon className="w-12 h-12 text-red-500 mx-auto mb-2 animate-bounce" />
                                <h4 className="font-semibold text-red-800 dark:text-red-300 mb-1">Gagal Membuat Laporan</h4>
                                <p className="text-xs text-red-600 dark:text-red-400 mb-4">{aiReportError}</p>
                                <Button
                                    onClick={handleGenerateAiReport}
                                    variant="outline"
                                    className="text-red-600 border-red-200 hover:bg-red-50 dark:border-red-900 dark:hover:bg-red-950/40"
                                >
                                    Coba Lagi
                                </Button>
                            </div>
                        ) : (
                            <div className="space-y-4 animate-fade-in">
                                <p className="text-xs text-gray-600 dark:text-gray-400 leading-relaxed bg-fuchsia-50 dark:bg-fuchsia-950/20 p-3 rounded-xl border border-fuchsia-100 dark:border-fuchsia-900/30">
                                    Laporan perkembangan anak telah berhasil dibuat berdasarkan data riil semester ini. Anda dapat menyunting atau langsung menyalin laporan ini untuk WhatsApp orang tua.
                                </p>

                                <textarea
                                    value={aiReport}
                                    onChange={(e) => setAiReport(e.target.value)}
                                    rows={12}
                                    className="w-full rounded-xl border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white shadow-sm focus:border-fuchsia-500 focus:ring-fuchsia-500 text-sm p-4 transition-all resize-y min-h-[250px] overflow-y-auto leading-relaxed"
                                />

                                <div className="flex flex-col sm:flex-row gap-3 pt-2">
                                    <Button
                                        onClick={() => {
                                            navigator.clipboard.writeText(aiReport);
                                            setCopiedAiReport(true);
                                            toast.success('Laporan WhatsApp berhasil disalin ke clipboard!');
                                            setTimeout(() => setCopiedAiReport(false), 2000);
                                        }}
                                        className="flex-1 bg-gradient-to-r from-fuchsia-600 to-pink-600 hover:from-fuchsia-700 hover:to-pink-700 text-white shadow-lg shadow-fuchsia-500/20 transition-all font-semibold h-11"
                                    >
                                        {copiedAiReport ? (
                                            <>
                                                <CheckCircleIcon className="w-4 h-4 mr-2 animate-scale-in" />
                                                Tersalin!
                                            </>
                                        ) : (
                                            <>
                                                <CopyIcon className="w-4 h-4 mr-2" />
                                                Salin Laporan WhatsApp
                                            </>
                                        )}
                                    </Button>

                                    {student.parent_phone && (
                                        <a
                                            href={createWhatsAppLink(student.parent_phone, aiReport)}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="flex-1 flex items-center justify-center bg-emerald-600 hover:bg-emerald-700 text-white shadow-lg shadow-emerald-500/20 rounded-lg text-sm font-semibold transition-all h-11"
                                        >
                                            <Share2Icon className="w-4 h-4 mr-2" />
                                            Kirim via WhatsApp
                                        </a>
                                    )}

                                    <Button
                                        variant="outline"
                                        onClick={handleGenerateAiReport}
                                        className="h-11 border-gray-200 dark:border-white/10 hover:bg-gray-50 dark:hover:bg-white/5"
                                    >
                                        <SparklesIcon className="w-4 h-4 mr-2 text-fuchsia-500 animate-pulse" />
                                        Buat Ulang
                                    </Button>
                                </div>
                            </div>
                        )}
                    </div>
                </Modal>
            )}

            {duplicateDialog && (
                <DuplicateViolationDialog
                    isOpen={true}
                    onClose={handleDuplicateCancel}
                    onConfirm={handleDuplicateConfirm}
                    existingViolation={duplicateDialog.existingViolation}
                />
            )}
        </>
    );
};
