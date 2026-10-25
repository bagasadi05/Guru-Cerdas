import { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import { PERIOD_PRESETS } from '../engine/usePhScheduleDomain';
import {
    MAX_ASH_PER_DAY,
    findNextAvailableAshDate,
    getHolidayForDate,
    getSameDaySchedules,
    phPeriodsOverlap,
    validatePhDraft,
} from '../engine/phScheduleValidation';
import { parseSubjectString } from '../engine/phSchedulePresentation';
import {
    getProtaTopicSuggestions,
    formatLocalYmd,
    getDayInfo,
} from '../utils/phScheduleTopicPresets';
import type { PhScheduleRow } from '../../../types';

interface UsePhScheduleFormStateParams {
    isOpen: boolean;
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
    subjectSuggestions?: string[];
    rawSchedules?: PhScheduleRow[];
    currentClassName?: string;
    currentSemesterName?: string;
    semester?: { start_date: string; end_date: string };
}

export function usePhScheduleFormState({
    isOpen,
    editingSchedule,
    formData,
    setFormData,
    subjectSuggestions = [],
    rawSchedules = [],
    currentClassName,
    currentSemesterName,
    semester,
}: UsePhScheduleFormStateParams) {
    // Subject state
    const [selectedSubject, setSelectedSubject] = useState<string>('');
    const [topic, setTopic] = useState<string>('');
    const [isCustomSubject, setIsCustomSubject] = useState(false);
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);
    const [subjectSearch, setSubjectSearch] = useState('');
    const dropdownRef = useRef<HTMLDivElement>(null);

    // Period state
    const [isCustomPeriod, setIsCustomPeriod] = useState(false);

    // Sync state whenever editingSchedule or modal opens
    /* eslint-disable react-hooks/set-state-in-effect */
    useEffect(() => {
        if (!isOpen) return;

        if (formData.subject) {
            const { baseSubject, topic: parsedTopic } = parseSubjectString(formData.subject);
            setSelectedSubject(baseSubject);
            setTopic(parsedTopic);

            const isKnown = subjectSuggestions.some(
                (s) => s.toLowerCase() === baseSubject.toLowerCase()
            );
            setIsCustomSubject(!isKnown && baseSubject.length > 0);
        } else {
            const defaultSubject = subjectSuggestions[0] || '';
            setSelectedSubject(defaultSubject);
            setTopic('');
            setIsCustomSubject(false);
            if (defaultSubject) {
                setFormData((prev) => ({ ...prev, subject: defaultSubject }));
            }
        }

        if (formData.period_label) {
            const isPreset = PERIOD_PRESETS.includes(formData.period_label);
            setIsCustomPeriod(!isPreset);
        } else {
            setIsCustomPeriod(false);
        }

        setIsDropdownOpen(false);
        setSubjectSearch('');
    }, [isOpen, editingSchedule]);
    /* eslint-enable react-hooks/set-state-in-effect */

    // Close subject dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
                setIsDropdownOpen(false);
            }
        };
        if (isDropdownOpen) {
            document.addEventListener('mousedown', handleClickOutside);
        }
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [isDropdownOpen]);

    // Subject handlers
    const updateCombinedSubject = useCallback(
        (subj: string, top: string) => {
            const cleanSubj = subj.trim();
            const cleanTop = top.trim();
            const combined = cleanTop ? `${cleanSubj} (${cleanTop})` : cleanSubj;
            setFormData((prev) => ({ ...prev, subject: combined }));
        },
        [setFormData]
    );

    const handleSelectSubject = (s: string) => {
        if (s === '__CUSTOM__') {
            setIsCustomSubject(true);
            setSelectedSubject('');
            updateCombinedSubject('', topic);
        } else {
            setIsCustomSubject(false);
            setSelectedSubject(s);
            updateCombinedSubject(s, topic);
        }
        setIsDropdownOpen(false);
        setSubjectSearch('');
    };

    const handleTopicChange = (newTopic: string) => {
        setTopic(newTopic);
        updateCombinedSubject(selectedSubject, newTopic);
    };

    const handleCustomSubjectChange = (val: string) => {
        setSelectedSubject(val);
        updateCombinedSubject(val, topic);
    };

    // Period handlers
    const handlePresetPeriod = (label: string) => {
        setIsCustomPeriod(false);
        setFormData((prev) => ({ ...prev, period_label: label }));
    };

    const handleCustomPeriodClick = () => {
        setIsCustomPeriod(true);
        if (PERIOD_PRESETS.includes(formData.period_label)) {
            setFormData((prev) => ({ ...prev, period_label: '' }));
        }
    };

    const handleCustomPeriodChange = (val: string) => {
        setFormData((prev) => ({ ...prev, period_label: val }));
    };

    // Date & Holiday helpers
    const dayInfo = useMemo(() => getDayInfo(formData.date), [formData.date]);
    const holidayInfo = useMemo(() => getHolidayForDate(formData.date), [formData.date]);

    // Quick date values for active-state highlighting
    const quickDateTargets = useMemo(() => {
        const today = new Date();
        const tomorrow = new Date();
        tomorrow.setDate(today.getDate() + 1);
        const nextMon = new Date();
        const day = nextMon.getDay();
        const daysUntilMonday = ((8 - day) % 7) || 7;
        nextMon.setDate(nextMon.getDate() + daysUntilMonday);
        return {
            today: formatLocalYmd(today),
            tomorrow: formatLocalYmd(tomorrow),
            nextMonday: formatLocalYmd(nextMon),
        };
    }, []);

    // Topic recommendations from Prota / Kurikulum / Fallback
    const topicSuggestions = useMemo(
        () => getProtaTopicSuggestions(selectedSubject, currentClassName, currentSemesterName),
        [selectedSubject, currentClassName, currentSemesterName]
    );

    const setQuickDate = (offsetDays: number) => {
        const d = new Date();
        d.setDate(d.getDate() + offsetDays);
        setFormData((prev) => ({ ...prev, date: formatLocalYmd(d) }));
    };

    const setQuickNextMonday = () => {
        const d = new Date();
        const day = d.getDay();
        const daysUntilMonday = ((8 - day) % 7) || 7;
        d.setDate(d.getDate() + daysUntilMonday);
        setFormData((prev) => ({ ...prev, date: formatLocalYmd(d) }));
    };

    // Filtered subject suggestions for dropdown search
    const filteredSubjectSuggestions = useMemo(() => {
        if (!subjectSearch.trim()) return subjectSuggestions;
        return subjectSuggestions.filter((s) =>
            s.toLowerCase().includes(subjectSearch.toLowerCase().trim())
        );
    }, [subjectSuggestions, subjectSearch]);

    // Same-day schedules & daily quota (max 2 ASH per day)
    const sameDaySchedules = useMemo(
        () => getSameDaySchedules(formData.date, rawSchedules, editingSchedule?.id),
        [formData.date, rawSchedules, editingSchedule?.id]
    );
    const isDailyQuotaFull = sameDaySchedules.length >= MAX_ASH_PER_DAY;
    const nextAvailableDate = useMemo(
        () =>
            isDailyQuotaFull || holidayInfo
                ? findNextAvailableAshDate(formData.date, rawSchedules, editingSchedule?.id, semester?.end_date)
                : null,
        [isDailyQuotaFull, holidayInfo, formData.date, rawSchedules, editingSchedule?.id, semester?.end_date]
    );

    // Schedule conflict detection
    const conflictSchedule = useMemo(() => {
        if (!formData.date || !formData.period_label || rawSchedules.length === 0) return null;
        return rawSchedules.find(
            (s) =>
                s.date === formData.date &&
                phPeriodsOverlap(s.period_label, formData.period_label) &&
                s.id !== editingSchedule?.id
        );
    }, [formData.date, formData.period_label, rawSchedules, editingSchedule]);

    const validationError = validatePhDraft({ ...formData, id: editingSchedule?.id }, semester, rawSchedules);

    return {
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
        updateCombinedSubject,
        handleSelectSubject,
        handleTopicChange,
        handleCustomSubjectChange,
        handlePresetPeriod,
        handleCustomPeriodClick,
        handleCustomPeriodChange,
        setQuickDate,
        setQuickNextMonday,
    };
}
