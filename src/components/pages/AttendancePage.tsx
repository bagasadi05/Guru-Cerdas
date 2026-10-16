import React, { lazy, Suspense, useState, useCallback } from 'react';
import { AttendancePageSkeleton } from '../skeletons/PageSkeletons';
import {
    SearchIcon,
    CheckCircleIcon,
    UsersIcon,
    BarChart3,
    CheckSquare,
    Square,
} from 'lucide-react';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { EmptyState } from '../ui/EmptyState';
import { ErrorState } from '../ui/ErrorState';
import { CollapsibleSection } from '../ui/CollapsibleSection';
import { Modal } from '../ui/Modal';
import { useI18n } from '../../utils/i18n';
import { attendanceCopy } from '../../locales/attendance';

import { useAttendance } from '../attendance/useAttendance';
import { useWarnUnsavedChanges } from '../../hooks/useWarnUnsavedChanges';
import { AttendanceHeader } from '../attendance/AttendanceHeader';
import { AttendanceClassSelector } from '../attendance/AttendanceClassSelector';
import { AttendanceQuickActionsBar } from '../attendance/AttendanceQuickActionsBar';
import { AttendanceList } from '../attendance/AttendanceList';
import { AttendanceSummaryWidget } from '../attendance/AttendanceSummaryWidget';
import { AttendanceStreakIndicator } from '../attendance/AttendanceStreakIndicator';
import { AttendanceOfficialPanel } from '../attendance/AttendanceOfficialPanel';

// Modularized Attendance Components
import { AttendanceDateControlBar } from '../attendance/AttendanceDateControlBar';
import { AttendanceAssistantBanners } from '../attendance/AttendanceAssistantBanners';
import { AttendanceBatchActionBar } from '../attendance/AttendanceBatchActionBar';
import { AttendanceFloatingSaveBar } from '../attendance/AttendanceFloatingSaveBar';
import { AttendanceModals } from '../attendance/AttendanceModals';

const AttendanceCalendar = lazy(() => import('../attendance/AttendanceCalendar').then(module => ({ default: module.AttendanceCalendar })));

const AttendancePage: React.FC = () => {
    const { language } = useI18n();
    const copy = attendanceCopy[language];
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
        selectedStudents,
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
        selectedExportClasses,
        setSelectedExportClasses,
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
        confirmSave = performSave,
        cancelSave = () => setIsSaveConfirmOpen(false),
        isSaveConfirmOpen,
        setIsSaveConfirmOpen,
        handleExport,
        handleAnalyzeAttendance,
        isOnline,
        isHomeroom,
        missingWeekdays,
        isAutoFilling,
        isAssistantDismissed,
        setIsAssistantDismissed,
        handleAutoFillWeekdays,
        isCurrentDateAutoFilled,
        isDirty,
        pendingContext,
        isResolvingContext,
        keepEditing,
        discardAndContinue,
        saveAndContinue,
    } = useAttendance();

    const [highlightedStudentId, setHighlightedStudentId] = useState<string | null>(null);
    const [dismissedAutoFillKey, setDismissedAutoFillKey] = useState<string | null>(null);
    const isAutoFillBannerDismissed = dismissedAutoFillKey === `${selectedClass}_${selectedDate}`;

    useWarnUnsavedChanges(isDirty, 'Ada data absensi yang belum disimpan. Yakin ingin keluar?');

    const handleToggleSelect = useCallback((studentId: string) => {
        setSelectedStudents(prev => {
            const next = new Set(prev);
            if (next.has(studentId)) next.delete(studentId);
            else next.add(studentId);
            return next;
        });
    }, [setSelectedStudents]);

    const handleSelectAll = useCallback(() => {
        setSelectedStudents(prev => {
            const allSelected = filteredStudents.every(s => prev.has(s.id));
            if (allSelected) return new Set();
            return new Set(filteredStudents.map(s => s.id));
        });
    }, [filteredStudents, setSelectedStudents]);

    const handleBatchStatusChange = useCallback((status: string) => {
        const ids = Array.from(selectedStudents);
        ids.forEach(id => handleStatusChange(id, status as import('../../types').AttendanceStatus));
        setSelectedStudents(new Set());
    }, [selectedStudents, handleStatusChange, setSelectedStudents]);

    const handleNoteClick = useCallback((studentId: string, currentNote: string) => {
        setNoteText(currentNote);
        setSelectedStudents(new Set([studentId]));
        setIsNoteModalOpen(true);
    }, [setNoteText, setSelectedStudents, setIsNoteModalOpen]);

    // Keep the selected class and page controls visible while its students load.
    if (isLoadingClasses) return <AttendancePageSkeleton />;

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
        <div className="w-full min-h-full px-0 py-4 sm:p-6 lg:p-8 flex flex-col max-w-7xl mx-auto">
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
            <AttendanceDateControlBar
                selectedSemesterId={selectedSemesterId}
                setSelectedSemesterId={setSelectedSemesterId}
                selectedDate={selectedDate}
                today={today}
                setDatePickerOpen={setDatePickerOpen}
            />

            <main className="bg-transparent flex flex-col">
                {/* Assistant Banners: Missing Weekdays & Auto-filled indicators */}
                <AttendanceAssistantBanners
                    key={`${selectedClass}_${selectedDate}`}
                    className={attendanceClasses.find(item => item.id === selectedClass)?.name}
                    missingWeekdays={missingWeekdays}
                    isAssistantDismissed={isAssistantDismissed}
                    setIsAssistantDismissed={setIsAssistantDismissed}
                    handleAutoFillWeekdays={handleAutoFillWeekdays}
                    isAutoFilling={isAutoFilling}
                    isCurrentDateAutoFilled={isCurrentDateAutoFilled}
                    isAutoFillBannerDismissed={isAutoFillBannerDismissed}
                    setIsAutoFillBannerDismissed={(dismissed) => {
                        if (dismissed) setDismissedAutoFillKey(`${selectedClass}_${selectedDate}`);
                        else setDismissedAutoFillKey(null);
                    }}
                />

                {students && students.length > 0 && (
                    <AttendanceQuickActionsBar
                        hasAttendanceRecords={Object.keys(attendanceRecords).length > 0}
                        viewMode={viewMode}
                        onApplyTemplate={handleApplyTemplate}
                        onReset={handleResetAttendance}
                        onViewModeChange={setViewMode}
                    />
                )}

                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 mb-2 px-1">
                    <div className="flex flex-col sm:flex-row sm:items-center gap-2 w-full sm:w-auto">
                        <div className="flex items-center justify-between gap-2">
                        <h3 className="font-bold text-base sm:text-lg text-slate-900 dark:text-white flex items-center gap-2 tracking-wide">
                            {copy.students}
                            <span className="bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-xs font-bold py-1 px-2.5 rounded-full border border-slate-200 dark:border-slate-700">{filteredStudents.length}</span>
                        </h3>
                        {viewMode === 'list' && filteredStudents.length > 0 && <button type="button" onClick={handleSelectAll}
                            aria-pressed={filteredStudents.every(student => selectedStudents.has(student.id))}
                            className="min-h-11 flex items-center gap-1 text-xs font-semibold text-slate-600 dark:text-slate-300 rounded-lg focus-visible:ring-2 focus-visible:ring-emerald-500">
                            {filteredStudents.every(student => selectedStudents.has(student.id)) ? <CheckSquare size={16} /> : <Square size={16} />}
                            {filteredStudents.every(student => selectedStudents.has(student.id)) ? 'Batal pilih' : 'Pilih semua'}
                        </button>}
                        </div>
                        <div className="relative flex-1 sm:w-64">
                            <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                            <Input
                                placeholder="Cari nama siswa..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="pl-10 h-12 text-base bg-white dark:bg-slate-800 border-slate-200/80 dark:border-slate-700 shadow-sm focus:ring-emerald-500 rounded-xl"
                                aria-label="Cari siswa berdasarkan nama"
                            />
                        </div>
                    </div>
                    <div className="flex items-center gap-2 w-full sm:w-auto">
                        {unmarkedStudents.length > 0 && viewMode === 'list' && (
                            <Button
                                onClick={markRestAsPresent}
                                size="default"
                                className="w-full sm:w-auto text-sm font-bold shadow-md bg-brand-600 hover:bg-brand-700 border border-brand-500/30 transition-all cursor-pointer active:scale-95 duration-200 !min-h-11 rounded-xl"
                            >
                                <CheckCircleIcon className="w-4 h-4 mr-2" />
                                Tandai Sisa Hadir ({unmarkedStudents.length})
                            </Button>
                        )}
                    </div>
                </div>

                {/* Batch Action Bar — appears when students are selected in list view */}
                {viewMode === 'list' && (
                    <AttendanceBatchActionBar
                        selectedStudents={selectedStudents}
                        setSelectedStudents={setSelectedStudents}
                        handleBatchStatusChange={handleBatchStatusChange}
                    />
                )}

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
                        <Suspense fallback={<div className="p-8 text-center text-slate-500">Memuat kalender...</div>}>
                            <AttendanceCalendar
                                records={calendarSummaryRecords}
                                selectedDate={selectedDate}
                                onDateClick={(date) => { setSelectedDate(date); setViewMode('list'); }}
                                onMonthChange={(date) => setCalendarMonth(`${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`)}
                            />
                        </Suspense>
                    ) : (
                        <AttendanceList
                            students={filteredStudents}
                            attendanceRecords={attendanceRecords}
                            selectedDate={selectedDate}
                            selectedStudents={selectedStudents}
                            onStatusChange={handleStatusChange}
                            highlightedStudentId={highlightedStudentId}
                            onNoteClick={handleNoteClick}
                            onToggleSelect={handleToggleSelect}
                            onSelectAll={handleSelectAll}
                            showSelectionHeader={false}
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
                            className={`w-full !h-14 text-base sm:text-lg font-bold rounded-2xl transition-all cursor-pointer active:scale-[0.98] text-white ${
                                isDirty
                                    ? 'bg-emerald-600 hover:bg-emerald-700 shadow-md ring-2 ring-emerald-400/50'
                                    : 'bg-brand-700 hover:bg-brand-800 shadow-md border border-white/20'
                            }`}
                        >
                            {isSaving ? copy.saving : (isOnline ? copy.save : copy.offline)}
                        </Button>
                    </div>
                )}

                {/* Stats & Streaks — below the list, collapsed by default */}
                {students && students.length > 0 && (
                    <div className="mt-6 space-y-4">
                        <CollapsibleSection
                            title="Ringkasan & Streak Kehadiran"
                            icon={<BarChart3 className="w-4 h-4 text-brand-500" />}
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

                        {/* Panel Wali Kelas — only for homeroom teachers */}
                        {isHomeroom && (
                            <div className="mt-6">
                                <AttendanceOfficialPanel
                                    students={students}
                                    attendanceRecords={attendanceRecords}
                                    selectedDate={selectedDate}
                                    isHomeroom={isHomeroom}
                                />
                            </div>
                        )}
                    </div>
                )}
            </main>

            {/* Attendance Modals & Overlays */}
            <AttendanceModals
                isSaving={isSaving}
                isAiModalOpen={isAiModalOpen}
                setIsAiModalOpen={setIsAiModalOpen}
                isAiLoading={isAiLoading}
                aiAnalysisResult={aiAnalysisResult}
                isNoteModalOpen={isNoteModalOpen}
                setIsNoteModalOpen={setIsNoteModalOpen}
                noteText={noteText}
                setNoteText={setNoteText}
                handleSaveNote={handleSaveNote}
                isExportModalOpen={isExportModalOpen}
                setIsExportModalOpen={setIsExportModalOpen}
                handleExport={handleExport}
                isExporting={isExporting}
                exportMonth={exportMonth}
                setExportMonth={setExportMonth}
                attendanceClasses={attendanceClasses}
                selectedExportClasses={selectedExportClasses}
                setSelectedExportClasses={setSelectedExportClasses}
                exportPeriod={exportPeriod}
                setExportPeriod={setExportPeriod}
                exportSemesterId={exportSemesterId}
                setExportSemesterId={setExportSemesterId}
                isDatePickerOpen={isDatePickerOpen}
                setDatePickerOpen={setDatePickerOpen}
                selectedDate={selectedDate}
                setSelectedDate={setSelectedDate}
                today={today}
                yesterday={yesterday}
                selectedSemester={selectedSemester}
                isSaveConfirmOpen={isSaveConfirmOpen}
                setIsSaveConfirmOpen={setIsSaveConfirmOpen}
                unmarkedStudentsCount={unmarkedStudents.length}
                performSave={confirmSave}
                cancelSave={cancelSave}
                isResetModalOpen={isResetModalOpen}
                setIsResetModalOpen={setIsResetModalOpen}
                selectedClassName={attendanceClasses.find(c => c.id === selectedClass)?.name}
                confirmResetAttendance={confirmResetAttendance}
                isResetting={isResetting}
            />

            <Modal isOpen={!!pendingContext && !isResolvingContext && !isSaveConfirmOpen} onClose={() => keepEditing?.()} title={copy.unsavedTitle}>
                <p className="text-sm text-slate-600 dark:text-slate-300">{copy.unsavedDescription}</p>
                <p className="mt-2 text-sm font-semibold text-slate-800 dark:text-slate-100">
                    {attendanceClasses.find(item => item.id === selectedClass)?.name} · {selectedDate}
                </p>
                <div className="mt-5 flex flex-col gap-2">
                    <Button variant="outline" onClick={() => keepEditing?.()} className="min-h-11">{copy.stay}</Button>
                    <Button variant="outline" onClick={() => discardAndContinue?.()} className="min-h-11 text-rose-700 dark:text-rose-300">{copy.discard}</Button>
                    <Button onClick={() => void saveAndContinue?.()} disabled={isSaving} className="min-h-11">{copy.saveAndMove}</Button>
                </div>
            </Modal>

            {/* Floating Save Bar for unsaved changes */}
            <AttendanceFloatingSaveBar
                isDirty={isDirty}
                viewMode={viewMode}
                handleSave={handleSave}
                isSaving={isSaving}
                isOnline={isOnline}
            />
        </div>
    );
};

export default AttendancePage;
