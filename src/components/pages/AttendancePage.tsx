import React, { useState } from 'react';
import { AttendancePageSkeleton } from '../skeletons/PageSkeletons';
import { SemesterSelector } from '../ui/SemesterSelector';
import {
    CalendarIcon,
    ChevronDownIcon,
    SearchIcon,
    CheckCircleIcon,
    InfoIcon,
    UsersIcon,
    RotateCcw,
    AlertTriangle
} from 'lucide-react';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Modal } from '../ui/Modal';
import BottomSheet from '../ui/BottomSheet';

// Hooks & Sub-components
import { useAttendance } from '../attendance/useAttendance';
import { AttendanceSummaryWidget } from '../attendance/AttendanceSummaryWidget';
import { AttendanceHeader } from '../attendance/AttendanceHeader';
import { AttendanceList } from '../attendance/AttendanceList';
import { AttendanceExportModal } from '../attendance/AttendanceExportModal';
import { AiAnalysisModal } from '../attendance/AiAnalysisModal';
import { AttendanceCalendar } from '../attendance/AttendanceCalendar';
import { AttendanceClassSelector } from '../attendance/AttendanceClassSelector';
import { AttendanceQuickActionsBar } from '../attendance/AttendanceQuickActionsBar';
import { EmptyState } from '../ui/EmptyState';
import { ErrorState } from '../ui/ErrorState';
import { AttendanceStreakIndicator } from '../attendance/AttendanceStreakIndicator';
import { CollapsibleSection } from '../ui/CollapsibleSection';
import { BarChart3 } from 'lucide-react';

const AttendancePage: React.FC = () => {
    const {
        today,
        yesterday,
        selectedSemesterId,
        setSelectedSemesterId,
        selectedSemester,
        selectedClass,
        setSelectedClass,
        selectedDate,
        setSelectedDate,
        setCalendarMonth,
        attendanceRecords,
        setSelectedStudents,
        isDatePickerOpen,
        setDatePickerOpen,
        isNoteModalOpen,
        setIsNoteModalOpen,
        noteText,
        setNoteText,
        searchQuery,
        setSearchQuery,
        viewMode,
        setViewMode,
        isExportModalOpen,
        setIsExportModalOpen,
        exportMonth,
        setExportMonth,
        selectedExportClass,
        setSelectedExportClass,
        exportPeriod,
        setExportPeriod,
        exportSemesterId,
        setExportSemesterId,
        isExporting,
        isAiModalOpen,
        setIsAiModalOpen,
        aiAnalysisResult,
        isAiLoading,
        isResetModalOpen,
        setIsResetModalOpen,
        isLoadingClasses,
        classesError,
        refetchClasses,
        attendanceClasses,
        students,
        isLoadingStudents,
        studentsError,
        refetchStudents,
        isSaving,
        isResetting,
        attendanceSummary,
        unmarkedStudents,
        filteredStudents,
        calendarSummaryRecords,
        attendanceStreaks,
        handleSaveNote,
        handleStatusChange,
        markRestAsPresent,
        handleApplyTemplate,
        handleResetAttendance,
        confirmResetAttendance,
        handleSave,
        performSave,
        isSaveConfirmOpen,
        setIsSaveConfirmOpen,
        handleExport,
        handleAnalyzeAttendance,
        isOnline,
    } = useAttendance();
    const [highlightedStudentId, setHighlightedStudentId] = useState<string | null>(null);

    if (isLoadingClasses || isLoadingStudents) return <AttendancePageSkeleton />;

    if (classesError || studentsError) {
        return (
            <div className="w-full min-h-full p-4 sm:p-6 lg:p-8">
                <ErrorState
                    title="Gagal memuat data absensi"
                    message="Periksa koneksi internet Anda dan coba lagi."
                    onRetry={() => {
                        refetchClasses();
                        refetchStudents();
                    }}
                    fullWidth
                    className="max-w-xl"
                />
            </div>
        );
    }

    return (
        <div className="w-full min-h-full p-4 sm:p-6 lg:p-8 flex flex-col max-w-7xl mx-auto">
            <h1 className="sr-only">Absensi</h1>
            <AttendanceHeader
                onAnalyze={handleAnalyzeAttendance}
                onExport={() => setIsExportModalOpen(true)}
                isOnline={isOnline}
            />

            {attendanceClasses.length > 0 && (
                <AttendanceClassSelector
                    classes={attendanceClasses}
                    selectedClass={selectedClass}
                    onSelectClass={setSelectedClass}
                />
            )}

            {/* Control Bar: Semester & Date Picker */}
            <div className="flex flex-col lg:flex-row gap-4 lg:items-center mb-6">
                {/* Semester Selector */}
                <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3 lg:w-1/3">
                    <span className="text-sm font-medium text-slate-600 dark:text-slate-400">Semester:</span>
                    <SemesterSelector
                        value={selectedSemesterId || 'all'}
                        onChange={(semId) => setSelectedSemesterId(semId === 'all' ? null : semId)}
                        size="sm"
                        includeAllOption={false}
                        className="w-full"
                    />
                </div>

                {/* Date Picker Banner */}
                <div className="relative z-10 p-3 sm:p-0 -mx-4 px-4 sm:mx-0 transition-all rounded-3xl overflow-hidden flex-1 shadow-[0_8px_30px_rgb(16,185,129,0.15)] mb-2">
                    <button
                        type="button"
                        className="group relative overflow-hidden w-full rounded-3xl bg-gradient-to-r from-emerald-400 via-teal-500 to-emerald-600 dark:from-emerald-600 dark:via-teal-700 dark:to-emerald-800 cursor-pointer text-left"
                        onClick={() => setDatePickerOpen(true)}
                        aria-label="Pilih tanggal absensi"
                    >
                        <div className="absolute inset-0 bg-[url('data:image/svg+xml,%3Csvg viewBox=\'0 0 200 200\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cfilter id=\'noiseFilter\'%3E%3CfeTurbulence type=\'fractalNoise\' baseFrequency=\'0.8\' numOctaves=\'3\' stitchTiles=\'stitch\'/%3E%3C/filter%3E%3Crect width=\'100%25\' height=\'100%25\' filter=\'url(%23noiseFilter)\'/%3E%3C/svg%3E')] opacity-[0.1] mix-blend-overlay"></div>
                        <div className="absolute top-0 right-0 w-64 h-64 bg-white/20 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none"></div>

                        <div className="relative p-3 sm:p-4 flex items-center justify-between gap-3">
                            <div className="flex items-center gap-3 sm:gap-4 flex-1 min-w-0">
                                <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-lg sm:rounded-xl bg-white/20 backdrop-blur-md flex items-center justify-center text-white shadow-inner border border-white/20 group-hover:scale-105 transition-transform duration-300 flex-shrink-0">
                                    <CalendarIcon className="w-5 h-5 sm:w-6 sm:h-6" />
                                </div>
                                <div className="text-left flex-1 min-w-0">
                                    <p className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-green-100 mb-0.5">Tanggal Absensi</p>
                                    <h2 className="text-sm sm:text-xl font-bold text-white leading-tight truncate">
                                        {new Date(selectedDate).toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
                                    </h2>
                                </div>
                            </div>
                            <div className="flex items-center gap-2 flex-shrink-0">
                                {selectedDate === today && <span className="hidden sm:inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-white/20 text-white border border-white/20 backdrop-blur-sm">HARI INI</span>}
                                {selectedDate === today && <span className="sm:hidden inline-flex items-center px-2 py-0.5 rounded-full text-[8px] font-bold bg-white/20 text-white border border-white/20">HARI INI</span>}
                                <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-lg bg-white/10 backdrop-blur-md flex items-center justify-center border border-white/20 group-hover:bg-white/20 transition-colors">
                                    <ChevronDownIcon className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
                                </div>
                            </div>
                        </div>
                    </button>
                </div>
            </div>

            <main className="bg-transparent flex flex-col">
                {students && students.length > 0 && (
                    <AttendanceQuickActionsBar
                        hasAttendanceRecords={Object.keys(attendanceRecords).length > 0}
                        viewMode={viewMode}
                        onApplyTemplate={handleApplyTemplate}
                        onReset={handleResetAttendance}
                        onViewModeChange={setViewMode}
                    />
                )}

                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6 px-1">
                    <div className="flex flex-col sm:flex-row sm:items-center gap-3 w-full sm:w-auto">
                        <h3 className="font-bold text-base sm:text-lg text-slate-900 dark:text-white flex items-center gap-2 tracking-wide">
                            Direktori Peserta Didik
                            <span className="bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-xs font-bold py-1 px-2.5 rounded-full border border-slate-200 dark:border-slate-700">{filteredStudents.length}</span>
                        </h3>
                        <div className="relative flex-1 sm:w-64">
                            <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                            <Input
                                placeholder="Cari nama siswa..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="pl-10 h-12 text-base bg-white/60 dark:bg-slate-800/60 backdrop-blur-md border-slate-200/80 dark:border-white/10 shadow-[0_4px_20px_rgb(0,0,0,0.03)] focus:ring-green-500 rounded-2xl"
                                aria-label="Cari siswa berdasarkan nama"
                            />
                        </div>
                    </div>
                    <div className="flex items-center gap-2 w-full sm:w-auto">
                        {unmarkedStudents.length > 0 && viewMode === 'list' && (
                            <Button
                                onClick={markRestAsPresent}
                                size="default"
                                className="w-full sm:w-auto text-sm font-bold shadow-lg shadow-emerald-500/20 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 border-none transition-all active:scale-95 duration-200"
                            >
                                <CheckCircleIcon className="w-4 h-4 mr-2" />
                                Tandai Sisa Hadir ({unmarkedStudents.length})
                            </Button>
                        )}
                    </div>
                </div>

                <div className="space-y-3">
                    {isLoadingStudents ? (
                        <div className="p-12 text-center text-slate-500">Memuat daftar siswa...</div>
                    ) : !students || students.length === 0 ? (
                        <EmptyState
                            icon={<UsersIcon className="w-10 h-10" />}
                            title="Belum Ada Siswa"
                            description="Pilih kelas untuk memulai absensi atau tambahkan siswa baru terlebih dahulu."
                            className="bg-white/50 dark:bg-white/5 rounded-xl border border-dashed border-slate-300 dark:border-slate-700"
                        />
                    ) : viewMode === 'list' && filteredStudents.length === 0 ? (
                        <EmptyState
                            icon={<UsersIcon className="w-10 h-10" />}
                            title="Tidak ada hasil"
                            description="Tidak ada siswa yang cocok dengan pencarian ini."
                            actionLabel="Reset pencarian"
                            onAction={() => setSearchQuery('')}
                            className="bg-white/50 dark:bg-white/5 rounded-xl border border-dashed border-slate-300 dark:border-slate-700"
                        />
                    ) : viewMode === 'calendar' ? (
                        <AttendanceCalendar
                            records={calendarSummaryRecords}
                            selectedDate={selectedDate}
                            onDateClick={(date) => setSelectedDate(date)}
                            onMonthChange={(date) => setCalendarMonth(`${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`)}
                        />
                    ) : (
                        <AttendanceList
                            students={filteredStudents}
                            attendanceRecords={attendanceRecords}
                            selectedDate={selectedDate}
                            onStatusChange={handleStatusChange}
                            highlightedStudentId={highlightedStudentId}
                            onNoteClick={(studentId, currentNote) => {
                                setNoteText(currentNote);
                                setSelectedStudents(new Set([studentId]));
                                setIsNoteModalOpen(true);
                            }}
                        />
                    )}
                </div>

                {/* Save Button */}
                {students && students.length > 0 && (
                    <div className="mt-8 mb-4">
                        <Button
                            onClick={handleSave}
                            disabled={isSaving}
                            data-tutorial="attendance-save"
                            className="w-full h-14 text-lg font-bold shadow-[0_8px_30px_rgb(16,185,129,0.25)] bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 border border-white/20 rounded-2xl transition-all hover:-translate-y-1 active:scale-[0.98] text-white"
                        >
                            {isSaving ? 'Menyimpan...' : (isOnline ? 'Simpan Perubahan Absensi' : 'Simpan Offline')}
                        </Button>
                    </div>
                )}

                {/* Stats & Streaks — below the list, collapsed by default */}
                {students && students.length > 0 && (
                    <div className="mt-6 space-y-4">
                        <CollapsibleSection
                            title="Ringkasan & Streak Kehadiran"
                            icon={<BarChart3 className="w-4 h-4 text-indigo-500" />}
                            defaultOpen={false}
                        >
                            <AttendanceSummaryWidget
                                summary={attendanceSummary}
                                total={students?.length || 0}
                                unmarked={unmarkedStudents.length}
                            />
                            {attendanceStreaks.length > 0 && (
                                <AttendanceStreakIndicator
                                    streaks={attendanceStreaks}
                                    onStudentClick={(studentId) => {
                                        setHighlightedStudentId(studentId);
                                        const el = document.getElementById(`student-${studentId}`);
                                        if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                                        setTimeout(() => setHighlightedStudentId(null), 2000);
                                    }}
                                />
                            )}
                        </CollapsibleSection>
                    </div>
                )}
            </main>

            {isSaving && (
                <div className="fixed inset-0 bg-black/30 backdrop-blur-sm z-40 flex items-center justify-center">
                    <div className="bg-white/80 dark:bg-slate-900/60 backdrop-blur-xl rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] transition-all p-6 shadow-xl border border-slate-200 dark:border-slate-800 text-center">
                        <div className="w-12 h-12 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
                        <h3 className="text-base font-semibold text-slate-900 dark:text-white">Menyimpan Absensi</h3>
                        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Mohon tunggu sebentar...</p>
                    </div>
                </div>
            )}

            <AiAnalysisModal
                isOpen={isAiModalOpen}
                onClose={() => setIsAiModalOpen(false)}
                isLoading={isAiLoading}
                result={aiAnalysisResult}
            />

            <Modal title="Catatan Absensi" isOpen={isNoteModalOpen} onClose={() => setIsNoteModalOpen(false)}>
                <div className="space-y-4">
                    <p className="text-sm text-slate-500">Tambahkan catatan untuk siswa yang dipilih.</p>
                    <textarea
                        value={noteText}
                        onChange={(e) => setNoteText(e.target.value)}
                        className="w-full h-32 p-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 focus:ring-2 focus:ring-green-500 focus:border-transparent resize-none"
                        placeholder="Contoh: Pulang cepat karena urusan keluarga..."
                    />
                    <div className="flex justify-end gap-2">
                        <Button variant="ghost" onClick={() => setIsNoteModalOpen(false)}>Batal</Button>
                        <Button onClick={handleSaveNote}>Simpan Catatan</Button>
                    </div>
                </div>
            </Modal>

            <AttendanceExportModal
                isOpen={isExportModalOpen}
                onClose={() => setIsExportModalOpen(false)}
                onExport={handleExport}
                isExporting={isExporting}
                exportMonth={exportMonth}
                setExportMonth={setExportMonth}
                classes={attendanceClasses}
                selectedExportClass={selectedExportClass}
                setSelectedExportClass={setSelectedExportClass}
                exportPeriod={exportPeriod}
                setExportPeriod={setExportPeriod}
                exportSemesterId={exportSemesterId}
                setExportSemesterId={setExportSemesterId}
            />

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
                        <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-3">Pilih Tanggal Manual</label>
                        <Input
                            type="date"
                            value={selectedDate}
                            onChange={(e) => {
                                setSelectedDate(e.target.value);
                                setDatePickerOpen(false);
                            }}
                            min={selectedSemester?.start_date}
                            max={selectedSemester?.end_date}
                            className="w-full h-12 text-lg"
                        />
                    </div>
                </div>
            </BottomSheet>

            {/* Save Confirmation Modal — replaces window.confirm */}
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
                                Masih ada <strong>{unmarkedStudents.length} siswa</strong> yang belum diabsen.
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
                            className="flex-1 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white"
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
                                Anda akan menghapus <strong>semua data absensi</strong> untuk kelas <strong>{attendanceClasses.find(c => c.id === selectedClass)?.name}</strong> pada tanggal <strong>{new Date(selectedDate).toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</strong>.
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
        </div>
    );
};

export default AttendancePage;