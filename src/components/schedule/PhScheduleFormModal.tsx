import React from 'react';
import {
    Plus,
    Check,
    CalendarCheck,
} from 'lucide-react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { MAX_ASH_PER_DAY } from './engine/phScheduleValidation';
import { usePhScheduleFormState } from './hooks/usePhScheduleFormState';
import { PhScheduleDateTimeSection } from './components/form/PhScheduleDateTimeSection';
import { PhScheduleSubjectMateriSection } from './components/form/PhScheduleSubjectMateriSection';
import { PhScheduleFormWarnings } from './components/form/PhScheduleFormWarnings';
import type { PhScheduleRow } from '../../types';

export interface PhScheduleFormModalProps {
    isOpen: boolean;
    onClose: () => void;
    editingSchedule: PhScheduleRow | null;
    formData: {
        subject: string;
        date: string;
        period_label: string;
    };
    setFormData: React.Dispatch<
        React.SetStateAction<{
            subject: string;
            date: string;
            period_label: string;
        }>
    >;
    handleSubmit: (e: React.FormEvent) => void;
    isPending: boolean;
    subjectSuggestions: string[];
    rawSchedules?: PhScheduleRow[];
    currentClassName?: string;
    currentSemesterName?: string;
    semester?: { start_date: string; end_date: string };
}

export { parseSubjectString } from './engine/phSchedulePresentation';
export { getDayInfo } from './utils/phScheduleTopicPresets';

export const PhScheduleFormModal: React.FC<PhScheduleFormModalProps> = ({
    isOpen,
    onClose,
    editingSchedule,
    formData,
    setFormData,
    handleSubmit,
    isPending,
    subjectSuggestions = [],
    rawSchedules = [],
    currentClassName,
    currentSemesterName,
    semester,
}) => {
    const {
        selectedSubject,
        topic,
        isCustomSubject,
        setIsCustomSubject,
        isDropdownOpen,
        setIsDropdownOpen,
        subjectSearch,
        setSubjectSearch,
        dropdownRef,
        isCustomPeriod,
        dayInfo,
        holidayInfo,
        quickDateTargets,
        topicSuggestions,
        filteredSubjectSuggestions,
        sameDaySchedules,
        isDailyQuotaFull,
        nextAvailableDate,
        conflictSchedule,
        validationError,
        handleSelectSubject,
        handleTopicChange,
        handleCustomSubjectChange,
        handlePresetPeriod,
        handleCustomPeriodClick,
        handleCustomPeriodChange,
        setQuickDate,
        setQuickNextMonday,
    } = usePhScheduleFormState({
        isOpen,
        editingSchedule,
        formData,
        setFormData,
        subjectSuggestions,
        rawSchedules,
        currentClassName,
        currentSemesterName,
        semester,
    });

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            placement="bottom"
            maxWidth="max-w-2xl"
            title={
                editingSchedule
                    ? 'Edit Jadwal Asesmen Sumatif Harian (ASH)'
                    : 'Tambah Jadwal Asesmen Sumatif Harian (ASH)'
            }
            icon={<CalendarCheck className="w-5 h-5 stroke-[2.2]" />}
        >
            <form onSubmit={handleSubmit} className="space-y-4">
                {/* Context Class & Daily Quota Bar */}
                {(currentClassName || formData.date) && (
                    <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-slate-200/80 bg-slate-50/80 px-3.5 py-2 text-xs dark:border-slate-800 dark:bg-slate-800/50">
                        <div className="flex items-center gap-2 min-w-0">
                            {currentClassName && (
                                <span className="inline-flex items-center rounded-md bg-brand-600/10 px-2 py-0.5 font-bold text-brand-700 dark:bg-brand-500/20 dark:text-brand-300">
                                    {currentClassName}
                                </span>
                            )}
                            {currentSemesterName && (
                                <>
                                    <span className="text-slate-300 dark:text-slate-600">•</span>
                                    <span className="font-medium text-slate-600 dark:text-slate-300 truncate">
                                        {currentSemesterName}
                                    </span>
                                </>
                            )}
                        </div>

                        {formData.date && (
                            <span
                                className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold tabular-nums ${
                                    isDailyQuotaFull
                                        ? 'bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300 border border-rose-200 dark:border-rose-800/60'
                                        : sameDaySchedules.length === 1
                                        ? 'bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-200 dark:border-amber-800/60'
                                        : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/60'
                                }`}
                            >
                                <span
                                    className={`w-1.5 h-1.5 rounded-full ${
                                        isDailyQuotaFull
                                            ? 'bg-rose-500'
                                            : sameDaySchedules.length === 1
                                            ? 'bg-amber-500'
                                            : 'bg-emerald-500'
                                    }`}
                                />
                                Kuota: {sameDaySchedules.length}/{MAX_ASH_PER_DAY} ASH
                            </span>
                        )}
                    </div>
                )}

                {/* SECTION 1: Waktu & Jam Pelaksanaan */}
                <PhScheduleDateTimeSection
                    date={formData.date}
                    onDateChange={(newDate) => setFormData((prev) => ({ ...prev, date: newDate }))}
                    semester={semester}
                    dayInfo={dayInfo}
                    holidayInfo={holidayInfo}
                    quickDateTargets={quickDateTargets}
                    onSetQuickDate={setQuickDate}
                    onSetQuickNextMonday={setQuickNextMonday}
                    periodLabel={formData.period_label}
                    isCustomPeriod={isCustomPeriod}
                    onPresetPeriod={handlePresetPeriod}
                    onCustomPeriodClick={handleCustomPeriodClick}
                    onCustomPeriodChange={handleCustomPeriodChange}
                />

                {/* SECTION 2: Mata Pelajaran & Materi */}
                <PhScheduleSubjectMateriSection
                    selectedSubject={selectedSubject}
                    topic={topic}
                    isCustomSubject={isCustomSubject}
                    onResetToSuggestions={() => {
                        setIsCustomSubject(false);
                        const fallback = subjectSuggestions[0] || '';
                        handleSelectSubject(fallback);
                    }}
                    onCustomSubjectChange={handleCustomSubjectChange}
                    isDropdownOpen={isDropdownOpen}
                    onToggleDropdown={() => setIsDropdownOpen(!isDropdownOpen)}
                    dropdownRef={dropdownRef}
                    subjectSearch={subjectSearch}
                    onSubjectSearchChange={setSubjectSearch}
                    filteredSubjectSuggestions={filteredSubjectSuggestions}
                    onSelectSubject={handleSelectSubject}
                    onTopicChange={handleTopicChange}
                    topicSuggestions={topicSuggestions}
                    periodLabel={formData.period_label}
                />

                {/* Warning Alerts */}
                <PhScheduleFormWarnings
                    holidayInfo={holidayInfo}
                    isDailyQuotaFull={isDailyQuotaFull}
                    sameDaySchedules={sameDaySchedules}
                    nextAvailableDate={nextAvailableDate}
                    conflictSchedule={conflictSchedule}
                    validationError={validationError}
                    onSelectDate={(newDate) => setFormData((prev) => ({ ...prev, date: newDate }))}
                />

                {/* Footer Action Buttons */}
                <div className="grid grid-cols-2 gap-2.5 pt-3 border-t border-slate-100 dark:border-slate-800 sm:flex sm:justify-end">
                    <Button
                        type="button"
                        variant="outline"
                        onClick={onClose}
                        disabled={isPending}
                        className="rounded-xl border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 min-h-[44px] px-5 w-full sm:w-auto font-semibold"
                    >
                        Batal
                    </Button>
                    <Button
                        type="submit"
                        variant="primary"
                        disabled={isPending || !selectedSubject.trim() || Boolean(validationError) || isDailyQuotaFull}
                        className="!bg-brand-700 hover:!bg-brand-800 text-white rounded-xl font-bold min-h-[44px] px-6 shadow-xs flex items-center justify-center gap-2 w-full sm:w-auto"
                    >
                        {isPending ? (
                            <>
                                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                <span>Menyimpan...</span>
                            </>
                        ) : editingSchedule ? (
                            <>
                                <Check className="w-4 h-4 stroke-[2.5]" />
                                <span>Simpan Perubahan</span>
                            </>
                        ) : (
                            <>
                                <Plus className="w-4 h-4 stroke-[2.5]" />
                                <span>Tambah ASH</span>
                            </>
                        )}
                    </Button>
                </div>
            </form>
        </Modal>
    );
};
