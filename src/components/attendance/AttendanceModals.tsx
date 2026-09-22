import React, { lazy, Suspense } from 'react';
import { CalendarIcon, InfoIcon, AlertTriangle, RotateCcw } from 'lucide-react';
import { Modal } from '../ui/Modal';
import BottomSheet from '../ui/BottomSheet';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { AiAnalysis } from '../../types';

const AttendanceExportModal = lazy(() =>
    import('./AttendanceExportModal').then(module => ({ default: module.AttendanceExportModal }))
);
const AiAnalysisModal = lazy(() =>
    import('./AiAnalysisModal').then(module => ({ default: module.AiAnalysisModal }))
);

export interface AttendanceModalsProps {
    // Saving Overlay
    isSaving: boolean;

    // AI Analysis Modal
    isAiModalOpen: boolean;
    setIsAiModalOpen: (open: boolean) => void;
    isAiLoading: boolean;
    aiAnalysisResult: AiAnalysis | null;

    // Note Modal
    isNoteModalOpen: boolean;
    setIsNoteModalOpen: (open: boolean) => void;
    noteText: string;
    setNoteText: (text: string) => void;
    handleSaveNote: () => void;

    // Export Modal
    isExportModalOpen: boolean;
    setIsExportModalOpen: (open: boolean) => void;
    handleExport: (format: 'pdf' | 'excel') => void;
    isExporting: boolean;
    exportMonth: string;
    setExportMonth: (month: string) => void;
    attendanceClasses: Array<{ id: string; name: string }>;
    selectedExportClasses: string[];
    setSelectedExportClasses: (classes: string[]) => void;
    exportPeriod: 'monthly' | 'semester';
    setExportPeriod: (period: 'monthly' | 'semester') => void;
    exportSemesterId: string | null;
    setExportSemesterId: (id: string | null) => void;

    // DatePicker BottomSheet
    isDatePickerOpen: boolean;
    setDatePickerOpen: (open: boolean) => void;
    selectedDate: string;
    setSelectedDate: (date: string) => void;
    today: string;
    yesterday: string;
    selectedSemester?: { start_date?: string; end_date?: string } | null;

    // Save Confirmation Modal
    isSaveConfirmOpen: boolean;
    setIsSaveConfirmOpen: (open: boolean) => void;
    unmarkedStudentsCount: number;
    performSave: () => Promise<void> | void;

    // Reset Attendance Modal
    isResetModalOpen: boolean;
    setIsResetModalOpen: (open: boolean) => void;
    selectedClassName?: string;
    confirmResetAttendance: () => Promise<void> | void;
    isResetting: boolean;
}

export const AttendanceModals: React.FC<AttendanceModalsProps> = ({
    isSaving,
    isAiModalOpen,
    setIsAiModalOpen,
    isAiLoading,
    aiAnalysisResult,
    isNoteModalOpen,
    setIsNoteModalOpen,
    noteText,
    setNoteText,
    handleSaveNote,
    isExportModalOpen,
    setIsExportModalOpen,
    handleExport,
    isExporting,
    exportMonth,
    setExportMonth,
    attendanceClasses,
    selectedExportClasses,
    setSelectedExportClasses,
    exportPeriod,
    setExportPeriod,
    exportSemesterId,
    setExportSemesterId,
    isDatePickerOpen,
    setDatePickerOpen,
    selectedDate,
    setSelectedDate,
    today,
    yesterday,
    selectedSemester,
    isSaveConfirmOpen,
    setIsSaveConfirmOpen,
    unmarkedStudentsCount,
    performSave,
    isResetModalOpen,
    setIsResetModalOpen,
    selectedClassName,
    confirmResetAttendance,
    isResetting,
}) => {
    return (
        <>
            {isSaving && (
                <div className="fixed inset-0 bg-black/30 backdrop-blur-sm z-40 flex items-center justify-center">
                    <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-800 text-center p-6">
                        <div className="w-12 h-12 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
                        <h3 className="text-base font-semibold text-slate-900 dark:text-white">Menyimpan Absensi</h3>
                        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Mohon tunggu sebentar...</p>
                    </div>
                </div>
            )}

            {isAiModalOpen && (
                <Suspense fallback={null}>
                    <AiAnalysisModal
                        isOpen={isAiModalOpen}
                        onClose={() => setIsAiModalOpen(false)}
                        isLoading={isAiLoading}
                        result={aiAnalysisResult}
                    />
                </Suspense>
            )}

            <Modal title="Catatan Absensi" isOpen={isNoteModalOpen} onClose={() => setIsNoteModalOpen(false)}>
                <div className="space-y-4">
                    <p className="text-sm text-slate-500">Tambahkan catatan untuk siswa yang dipilih.</p>
                    <textarea
                        value={noteText}
                        onChange={(e) => setNoteText(e.target.value)}
                        className="w-full h-32 p-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 focus:ring-2 focus:ring-green-500 focus:border-transparent resize-none"
                        placeholder="Contoh: Pulang cepat karena urusan keluarga..."
                        aria-label="Catatan absensi siswa"
                    />
                    <div className="flex justify-end gap-2">
                        <Button variant="ghost" onClick={() => setIsNoteModalOpen(false)}>Batal</Button>
                        <Button onClick={handleSaveNote}>Simpan Catatan</Button>
                    </div>
                </div>
            </Modal>

            {isExportModalOpen && (
                <Suspense fallback={null}>
                    <AttendanceExportModal
                        isOpen={isExportModalOpen}
                        onClose={() => setIsExportModalOpen(false)}
                        onExport={handleExport}
                        isExporting={isExporting}
                        exportMonth={exportMonth}
                        setExportMonth={setExportMonth}
                        classes={attendanceClasses}
                        selectedExportClasses={selectedExportClasses}
                        setSelectedExportClasses={setSelectedExportClasses}
                        exportPeriod={exportPeriod}
                        setExportPeriod={setExportPeriod}
                        exportSemesterId={exportSemesterId}
                        setExportSemesterId={setExportSemesterId}
                    />
                </Suspense>
            )}

            <BottomSheet isOpen={isDatePickerOpen} onClose={() => setDatePickerOpen(false)} title="Pilih Tanggal Absensi">
                <div className="space-y-6 pb-6">
                    <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-xl border border-green-100 dark:border-green-800/50 flex items-start gap-3">
                        <InfoIcon className="w-5 h-5 text-green-600 dark:text-green-400 flex-shrink-0 mt-0.5" />
                        <p className="text-sm text-green-800 dark:text-green-200">
                            Anda sedang melihat data absensi untuk tanggal <span className="font-bold">{new Date(selectedDate).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}</span>.
                        </p>
                    </div>

                    <div>
                        <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-3">Aksi Cepat</label>
                        <div className="grid grid-cols-2 gap-3">
                            <button
                                type="button"
                                onClick={() => {
                                    setSelectedDate(today);
                                    setDatePickerOpen(false);
                                }}
                                className={`flex items-center justify-center gap-2 p-4 rounded-xl border transition-all ${selectedDate === today
                                    ? 'bg-emerald-600 border-emerald-600 text-white shadow-lg shadow-emerald-500/30'
                                    : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:border-emerald-400 dark:hover:border-emerald-500 text-slate-700 dark:text-slate-200'
                                    }`}
                            >
                                <CalendarIcon className="w-5 h-5" />
                                <span className="font-bold">Hari Ini</span>
                            </button>
                            <button
                                type="button"
                                onClick={() => {
                                    setSelectedDate(yesterday);
                                    setDatePickerOpen(false);
                                }}
                                className={`flex items-center justify-center gap-2 p-4 rounded-xl border transition-all ${selectedDate === yesterday
                                    ? 'bg-emerald-600 border-emerald-600 text-white shadow-lg shadow-emerald-500/30'
                                    : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:border-emerald-400 dark:hover:border-emerald-500 text-slate-700 dark:text-slate-200'
                                    }`}
                            >
                                <span className="font-bold">Kemarin</span>
                            </button>
                        </div>
                    </div>

                    <div>
                        <label htmlFor="manual-attendance-date" className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-3">Pilih Tanggal Manual</label>
                        <Input
                            id="manual-attendance-date"
                            type="date"
                            value={selectedDate}
                            onChange={(e) => {
                                setSelectedDate(e.target.value);
                                setDatePickerOpen(false);
                            }}
                            min={selectedSemester?.start_date}
                            max={selectedSemester?.end_date}
                            className="w-full h-12 text-lg"
                            aria-label="Pilih tanggal manual"
                        />
                    </div>
                </div>
            </BottomSheet>

            {/* Save Confirmation Modal */}
            <Modal
                isOpen={isSaveConfirmOpen}
                onClose={() => setIsSaveConfirmOpen(false)}
                title="Konfirmasi Simpan"
            >
                <div className="space-y-4">
                    <div className="flex items-start gap-3 p-4 bg-amber-50 dark:bg-amber-900/20 rounded-xl border border-amber-200 dark:border-amber-800">
                        <AlertTriangle className="w-6 h-6 text-amber-500 flex-shrink-0 mt-0.5" />
                        <div>
                            <h4 className="font-bold text-amber-700 dark:text-amber-300">Siswa Belum Diabsen</h4>
                            <p className="text-sm text-amber-600 dark:text-amber-400 mt-1">
                                Masih ada <strong>{unmarkedStudentsCount} siswa</strong> yang belum diabsen.
                            </p>
                            <p className="text-sm text-amber-600 dark:text-amber-400 mt-2">
                                Mereka akan otomatis ditandai <strong>"Hadir"</strong> saat disimpan.
                            </p>
                        </div>
                    </div>

                    <div className="flex gap-3 pt-2">
                        <Button
                            onClick={() => setIsSaveConfirmOpen(false)}
                            variant="outline"
                            className="flex-1"
                        >
                            Batal
                        </Button>
                        <Button
                            onClick={() => {
                                setIsSaveConfirmOpen(false);
                                performSave();
                            }}
                            className="flex-1 bg-brand-700 hover:bg-brand-800 text-white"
                        >
                            {isSaving ? 'Menyimpan...' : 'Simpan & Tandai Hadir'}
                        </Button>
                    </div>
                </div>
            </Modal>

            {/* Reset Attendance Confirmation Modal */}
            <Modal
                isOpen={isResetModalOpen}
                onClose={() => setIsResetModalOpen(false)}
                title="Reset Absensi"
            >
                <div className="space-y-4">
                    <div className="flex items-start gap-3 p-4 bg-orange-50 dark:bg-orange-900/20 rounded-xl border border-orange-200 dark:border-orange-800">
                        <AlertTriangle className="w-6 h-6 text-orange-500 flex-shrink-0 mt-0.5" />
                        <div>
                            <h4 className="font-bold text-orange-700 dark:text-orange-300">Peringatan</h4>
                            <p className="text-sm text-orange-600 dark:text-orange-400 mt-1">
                                Anda akan menghapus <strong>semua data absensi</strong> untuk kelas <strong>{selectedClassName}</strong> pada tanggal <strong>{new Date(selectedDate).toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</strong>.
                            </p>
                            <p className="text-sm text-orange-600 dark:text-orange-400 mt-2">
                                Tindakan ini tidak dapat dibatalkan!
                            </p>
                        </div>
                    </div>

                    <div className="flex gap-3 pt-2">
                        <Button
                            onClick={() => setIsResetModalOpen(false)}
                            variant="outline"
                            className="flex-1"
                        >
                            Batal
                        </Button>
                        <Button
                            onClick={confirmResetAttendance}
                            variant="destructive"
                            className="flex-1"
                            disabled={isResetting}
                        >
                            {isResetting ? (
                                <>
                                    <RotateCcw className="w-4 h-4 mr-2 animate-spin" />
                                    Mereset...
                                </>
                            ) : (
                                <>
                                    <RotateCcw className="w-4 h-4 mr-2" />
                                    Ya, Reset Absensi
                                </>
                            )}
                        </Button>
                    </div>
                </div>
            </Modal>
        </>
    );
};
