import React, { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import {
    Calendar,
    Clock,
    Plus,
    Check,
    AlertTriangle,
    CalendarCheck,
    Sparkles,
    ChevronDown,
    Search,
    BookOpen,
} from 'lucide-react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { PERIOD_PRESETS, normalizeSubjectDisplay } from './engine/usePhScheduleDomain';
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
}

/**
 * Parses a combined subject string into subject name and optional topic.
 * e.g. "Matematika (Pecahan & Desimal)" -> { baseSubject: "Matematika", topic: "Pecahan & Desimal" }
 * e.g. "IPA - Ekosistem" -> { baseSubject: "IPA", topic: "Ekosistem" }
 * e.g. "Fikih" -> { baseSubject: "Fikih", topic: "" }
 */
export function parseSubjectString(fullStr: string): { baseSubject: string; topic: string } {
    if (!fullStr || !fullStr.trim()) return { baseSubject: '', topic: '' };

    const trimmed = fullStr.trim();
    // Pattern: Subject (Topic)
    const parenMatch = trimmed.match(/^(.+?)\s*\((.+?)\)$/);
    if (parenMatch) {
        return {
            baseSubject: parenMatch[1].trim(),
            topic: parenMatch[2].trim(),
        };
    }

    // Pattern: Subject - Topic
    const dashMatch = trimmed.match(/^(.+?)\s*[-–]\s*(.+)$/);
    if (dashMatch) {
        return {
            baseSubject: dashMatch[1].trim(),
            topic: dashMatch[2].trim(),
        };
    }

    return { baseSubject: trimmed, topic: '' };
}

/**
 * Calculates day of the week and friendly Indonesian format for a date string.
 */
export function getDayInfo(dateStr: string) {
    if (!dateStr) return null;
    const parts = dateStr.split('-');
    if (parts.length !== 3) return null;
    const y = parseInt(parts[0], 10);
    const m = parseInt(parts[1], 10);
    const d = parseInt(parts[2], 10);
    if (isNaN(y) || isNaN(m) || isNaN(d)) return null;

    const date = new Date(y, m - 1, d);
    if (isNaN(date.getTime())) return null;

    const dayIndex = date.getDay(); // 0 is Sunday, 6 is Saturday
    const days = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
    const months = [
        'Januari',
        'Februari',
        'Maret',
        'April',
        'Mei',
        'Juni',
        'Juli',
        'Agustus',
        'September',
        'Oktober',
        'November',
        'Desember',
    ];

    const dayName = days[dayIndex];
    const isWeekend = dayIndex === 0 || dayIndex === 6;
    const formatted = `${dayName}, ${d} ${months[m - 1]} ${y}`;

    return { dayName, formatted, isWeekend };
}

export const PhScheduleFormModal: React.FC<PhScheduleFormModalProps> = ({
    isOpen,
    onClose,
    editingSchedule,
    formData,
    setFormData,
    handleSubmit,
    isPending,
    subjectSuggestions,
    rawSchedules = [],
    currentClassName,
    currentSemesterName,
}) => {
    // Initial parse
    const initialParsed = useMemo(() => {
        const parsed = parseSubjectString(formData.subject);
        return {
            baseSubject: normalizeSubjectDisplay(parsed.baseSubject),
            topic: parsed.topic,
        };
    }, [formData.subject]);

    // Internal state with lazy initialization from formData
    const [selectedSubject, setSelectedSubject] = useState<string>(() => initialParsed.baseSubject);
    const [topic, setTopic] = useState<string>(() => initialParsed.topic);
    const [isCustomSubject, setIsCustomSubject] = useState<boolean>(() => {
        const base = initialParsed.baseSubject;
        return !subjectSuggestions.includes(base) && base.length > 0;
    });
    const [isCustomPeriod, setIsCustomPeriod] = useState<boolean>(() => {
        const p = formData.period_label || '1-2';
        return !PERIOD_PRESETS.includes(p) && p.length > 0 && p !== '1-2';
    });

    // Custom dropdown state
    const [isDropdownOpen, setIsDropdownOpen] = useState<boolean>(false);
    const [subjectSearch, setSubjectSearch] = useState<string>('');
    const dropdownRef = useRef<HTMLDivElement>(null);

    // Track previous open state to only initialize when modal transitions to open
    const prevIsOpenRef = useRef<boolean>(false);

    useEffect(() => {
        // Only run initialization when modal opens or editing schedule reference changes
        if (isOpen && (!prevIsOpenRef.current || editingSchedule)) {
            const { baseSubject, topic: parsedTopic } = parseSubjectString(formData.subject);
            const normalizedBase = normalizeSubjectDisplay(baseSubject);
            setSelectedSubject(normalizedBase);
            setTopic(parsedTopic);

            const isKnown = subjectSuggestions.includes(normalizedBase);
            setIsCustomSubject(!isKnown && normalizedBase.length > 0);

            // Default period to '1-2' if empty
            const currentPeriod = formData.period_label || '1-2';
            const isKnownPeriod = PERIOD_PRESETS.includes(currentPeriod);
            setIsCustomPeriod(!isKnownPeriod && currentPeriod.length > 0 && currentPeriod !== '1-2');

            if (!formData.period_label) {
                setFormData((prev) => ({ ...prev, period_label: '1-2' }));
            }

            setIsDropdownOpen(false);
            setSubjectSearch('');
        }
        prevIsOpenRef.current = isOpen;
    }, [isOpen, editingSchedule, subjectSuggestions]); // Deliberately omit formData.* to prevent reset on user typing

    // Click outside dropdown listener
    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
                setIsDropdownOpen(false);
            }
        };
        if (isDropdownOpen) {
            document.addEventListener('mousedown', handleClickOutside);
        }
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [isDropdownOpen]);

    // Helper to update formData.subject cleanly
    const updateCombinedSubject = useCallback(
        (subj: string, top: string) => {
            const cleanSubj = subj.trim();
            const cleanTopic = top.trim();
            let combined = cleanSubj;
            if (cleanTopic) {
                combined = `${cleanSubj} (${cleanTopic})`;
            }
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
        // Clear preset from input so user can type freely
        if (PERIOD_PRESETS.includes(formData.period_label)) {
            setFormData((prev) => ({ ...prev, period_label: '' }));
        }
    };

    const handleCustomPeriodChange = (val: string) => {
        setFormData((prev) => ({ ...prev, period_label: val }));
    };

    // Date helpers
    const dayInfo = useMemo(() => getDayInfo(formData.date), [formData.date]);

    const setQuickDate = (offsetDays: number) => {
        const d = new Date();
        d.setDate(d.getDate() + offsetDays);
        const yyyy = d.getFullYear();
        const mm = String(d.getMonth() + 1).padStart(2, '0');
        const dd = String(d.getDate()).padStart(2, '0');
        setFormData((prev) => ({ ...prev, date: `${yyyy}-${mm}-${dd}` }));
    };

    const setQuickNextMonday = () => {
        const d = new Date();
        const day = d.getDay();
        const daysUntilMonday = ((8 - day) % 7) || 7;
        d.setDate(d.getDate() + daysUntilMonday);
        const yyyy = d.getFullYear();
        const mm = String(d.getMonth() + 1).padStart(2, '0');
        const dd = String(d.getDate()).padStart(2, '0');
        setFormData((prev) => ({ ...prev, date: `${yyyy}-${mm}-${dd}` }));
    };

    // Filtered subject suggestions for dropdown search
    const filteredSubjectSuggestions = useMemo(() => {
        if (!subjectSearch.trim()) return subjectSuggestions;
        return subjectSuggestions.filter((s) =>
            s.toLowerCase().includes(subjectSearch.toLowerCase().trim())
        );
    }, [subjectSuggestions, subjectSearch]);

    // Schedule conflict detection
    const conflictSchedule = useMemo(() => {
        if (!formData.date || !formData.period_label || rawSchedules.length === 0) return null;
        return rawSchedules.find(
            (s) =>
                s.date === formData.date &&
                s.period_label === formData.period_label &&
                s.id !== editingSchedule?.id
        );
    }, [formData.date, formData.period_label, rawSchedules, editingSchedule]);

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            placement="bottom"
            title={editingSchedule ? 'Edit Jadwal Penilaian Harian' : 'Tambah Jadwal Penilaian Harian'}
            icon={
                <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-600 dark:text-[#00d284] flex items-center justify-center shrink-0 shadow-sm">
                    <CalendarCheck className="w-5 h-5 stroke-[2.2]" />
                </div>
            }
        >
            <form onSubmit={handleSubmit} className="space-y-3.5 sm:space-y-4 pt-1">
                {/* Context Class Subtitle */}
                {currentClassName && (
                    <div className="flex items-center gap-2 pb-1.5 border-b border-slate-200/80 dark:border-slate-800 text-xs">
                        <span className="font-bold text-slate-900 dark:text-white">
                            {currentClassName}
                        </span>
                        {currentSemesterName && (
                            <>
                                <span className="text-slate-400 dark:text-slate-600">•</span>
                                <span className="text-slate-600 dark:text-slate-400 font-medium">
                                    {currentSemesterName}
                                </span>
                            </>
                        )}
                    </div>
                )}

                {/* Field 1: Tanggal Pelaksanaan */}
                <div>
                    <label
                        htmlFor="ph-modal-date"
                        className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5"
                    >
                        Tanggal Pelaksanaan
                    </label>
                    <Input
                        id="ph-modal-date"
                        type="date"
                        value={formData.date}
                        onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                        className="h-11 rounded-xl font-medium"
                        required
                    />

                    {/* Day contextual indicator & Quick presets CENTERED */}
                    <div className="flex flex-col items-center justify-center gap-2 mt-2 w-full text-center">
                        {dayInfo ? (
                            <div
                                className={`inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold ${
                                    dayInfo.isWeekend
                                        ? 'bg-amber-500/15 text-amber-700 dark:text-amber-400 border border-amber-500/30'
                                        : 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20'
                                }`}
                            >
                                <Calendar className="w-3.5 h-3.5 shrink-0" />
                                <span>{dayInfo.formatted}</span>
                                {dayInfo.isWeekend && (
                                    <span className="text-[10px] ml-1 bg-amber-500/20 text-amber-700 dark:text-amber-300 px-1.5 py-0.5 rounded font-bold uppercase tracking-wider">
                                        Hari Libur
                                    </span>
                                )}
                            </div>
                        ) : (
                            <span className="text-xs text-slate-400">Pilih tanggal ujian</span>
                        )}

                        {/* Quick Date Shortcuts - CENTERED */}
                        <div className="flex items-center justify-center gap-2 w-full pt-0.5">
                            <button
                                type="button"
                                onClick={() => setQuickDate(0)}
                                className="px-3 py-1 text-xs font-semibold rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:text-emerald-600 dark:hover:text-emerald-400 border border-slate-200 dark:border-slate-700 hover:border-emerald-500/50 shadow-sm active:scale-95 transition-all"
                            >
                                Hari Ini
                            </button>
                            <button
                                type="button"
                                onClick={() => setQuickDate(1)}
                                className="px-3 py-1 text-xs font-semibold rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:text-emerald-600 dark:hover:text-emerald-400 border border-slate-200 dark:border-slate-700 hover:border-emerald-500/50 shadow-sm active:scale-95 transition-all"
                            >
                                Besok
                            </button>
                            <button
                                type="button"
                                onClick={setQuickNextMonday}
                                className="px-3 py-1 text-xs font-semibold rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:text-emerald-600 dark:hover:text-emerald-400 border border-slate-200 dark:border-slate-700 hover:border-emerald-500/50 shadow-sm active:scale-95 transition-all"
                            >
                                Senin Depan
                            </button>
                        </div>
                    </div>
                </div>

                {/* Field 2: Mata Pelajaran (List / Dropdown & Kustom) */}
                <div className="space-y-2">
                    <div className="flex justify-between items-center">
                        <label
                            htmlFor="ph-modal-subject-trigger"
                            className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider"
                        >
                            Mata Pelajaran <span className="text-emerald-500">*</span>
                        </label>
                        <span className="text-[11px] text-slate-400">Pilih dari list database atau kustom</span>
                    </div>

                    {!isCustomSubject ? (
                        <div className="relative" ref={dropdownRef}>
                            {/* Dropdown Trigger Button */}
                            <button
                                id="ph-modal-subject-trigger"
                                type="button"
                                onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                                className={`w-full h-11 px-3.5 rounded-xl border text-left flex items-center justify-between text-sm font-medium transition-all ${
                                    isDropdownOpen
                                        ? 'border-emerald-500 ring-2 ring-emerald-500/20 bg-white dark:bg-slate-800'
                                        : 'border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-850/80 hover:border-slate-400 dark:hover:border-slate-600'
                                } text-slate-900 dark:text-white`}
                            >
                                <div className="flex items-center gap-2 truncate">
                                    <BookOpen className="w-4 h-4 text-emerald-500 shrink-0" />
                                    <span className={selectedSubject ? 'font-bold' : 'text-slate-400 dark:text-slate-500'}>
                                        {selectedSubject || '-- Pilih Mata Pelajaran --'}
                                    </span>
                                </div>
                                <ChevronDown
                                    className={`w-4 h-4 text-slate-400 transition-transform duration-200 ${
                                        isDropdownOpen ? 'rotate-180' : ''
                                    }`}
                                />
                            </button>

                            {/* Dropdown List Popover */}
                            {isDropdownOpen && (
                                <div className="absolute left-0 right-0 z-50 mt-1.5 rounded-xl bg-white dark:bg-slate-850 border border-slate-200 dark:border-slate-700/80 shadow-2xl overflow-hidden animate-fade-in">
                                    {/* Search Filter Header */}
                                    <div className="p-2 border-b border-slate-100 dark:border-slate-750 bg-slate-50/50 dark:bg-slate-800/50">
                                        <div className="relative">
                                            <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                                            <input
                                                type="text"
                                                value={subjectSearch}
                                                onChange={(e) => setSubjectSearch(e.target.value)}
                                                placeholder="Cari mata pelajaran..."
                                                className="w-full pl-8 pr-3 py-1.5 text-xs rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                                                autoFocus
                                            />
                                        </div>
                                    </div>

                                    {/* Subjects List Scrollable */}
                                    <div className="max-h-48 overflow-y-auto py-1 divide-y divide-slate-100 dark:divide-slate-800/40">
                                        {filteredSubjectSuggestions.length === 0 ? (
                                            <div className="p-3 text-xs text-center text-slate-400">
                                                Mata pelajaran tidak ditemukan
                                            </div>
                                        ) : (
                                            filteredSubjectSuggestions.map((s) => {
                                                const isSelected = selectedSubject === s;
                                                return (
                                                    <button
                                                        key={s}
                                                        type="button"
                                                        onClick={() => handleSelectSubject(s)}
                                                        className={`w-full px-3.5 py-2 text-xs text-left flex items-center justify-between transition-colors ${
                                                            isSelected
                                                                ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 font-bold'
                                                                : 'text-slate-800 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-750'
                                                        }`}
                                                    >
                                                        <span>{s}</span>
                                                        {isSelected && (
                                                            <Check className="w-3.5 h-3.5 stroke-[2.5] text-emerald-500" />
                                                        )}
                                                    </button>
                                                );
                                            })
                                        )}
                                    </div>

                                    {/* Pinned Add Custom Option */}
                                    <button
                                        type="button"
                                        onClick={() => handleSelectSubject('__CUSTOM__')}
                                        className="w-full px-3.5 py-2.5 text-xs text-left font-bold text-emerald-600 dark:text-[#00d284] hover:bg-emerald-50 dark:hover:bg-emerald-950/40 border-t border-slate-200 dark:border-slate-700 flex items-center gap-1.5 transition-colors bg-white dark:bg-slate-850"
                                    >
                                        <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
                                        <span>Tambah Mapel Kustom...</span>
                                    </button>
                                </div>
                            )}
                        </div>
                    ) : (
                        <div className="space-y-1.5 animate-fade-in">
                            <div className="flex items-center justify-between">
                                <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                                    <Plus className="w-3.5 h-3.5" />
                                    <span>Mata Pelajaran Kustom:</span>
                                </span>
                                <button
                                    type="button"
                                    onClick={() => {
                                        setIsCustomSubject(false);
                                        const fallback = subjectSuggestions[0] || '';
                                        setSelectedSubject(fallback);
                                        updateCombinedSubject(fallback, topic);
                                    }}
                                    className="text-xs text-slate-500 hover:text-emerald-500 underline font-medium"
                                >
                                    ← Kembali ke List Mapel
                                </button>
                            </div>
                            <Input
                                type="text"
                                value={selectedSubject}
                                onChange={(e) => handleCustomSubjectChange(e.target.value)}
                                placeholder="Ketik nama mata pelajaran baru..."
                                className="h-11 rounded-xl font-medium"
                                autoFocus
                                required
                            />
                        </div>
                    )}

                    {/* Dedicated Topic / Materi Field */}
                    <div className="pt-1">
                        <label
                            htmlFor="ph-modal-topic"
                            className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5"
                        >
                            Materi / Topik PH{' '}
                            <span className="text-[11px] font-normal text-slate-400 lowercase">(opsional)</span>
                        </label>
                        <Input
                            id="ph-modal-topic"
                            type="text"
                            value={topic}
                            onChange={(e) => handleTopicChange(e.target.value)}
                            placeholder="cth. Pecahan & Desimal, Bab 1: Bilangan Cacah..."
                            className="h-11 rounded-xl"
                        />
                    </div>

                    {/* Real-time Preview Pill */}
                    {selectedSubject.trim() ? (
                        <div className="flex items-center gap-2 p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/60 text-xs">
                            <Sparkles className="w-4 h-4 text-emerald-500 dark:text-[#00d284] shrink-0" />
                            <span className="text-slate-500 dark:text-slate-400 font-medium shrink-0">Nama di Jadwal:</span>
                            <span className="font-bold text-slate-900 dark:text-white truncate">
                                {topic.trim() ? `${selectedSubject} (${topic.trim()})` : selectedSubject}
                            </span>
                        </div>
                    ) : (
                        <p className="text-[11px] text-slate-400 dark:text-slate-500 italic pl-1">
                            💡 Pilih mata pelajaran dari list di atas untuk melanjutkan
                        </p>
                    )}
                </div>

                {/* Field 3: Jam Pelajaran Ke- */}
                <div>
                    <div className="flex justify-between items-center mb-1.5">
                        <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                            Jam Pelajaran Ke-
                        </label>
                        <span className="text-[11px] text-slate-400">Pilih jam atau kustom</span>
                    </div>

                    {/* Segmented Preset Grid: 4 Preset Buttons + 1 Kustom Button */}
                    <div className="grid grid-cols-5 gap-1.5">
                        {PERIOD_PRESETS.map((label) => {
                            const isSelected = !isCustomPeriod && formData.period_label === label;
                            return (
                                <button
                                    key={label}
                                    type="button"
                                    onClick={() => handlePresetPeriod(label)}
                                    className={`h-10 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-1 border active:scale-95 ${
                                        isSelected
                                            ? 'bg-emerald-600 text-white border-emerald-500 shadow-md shadow-emerald-500/20 scale-[1.02]'
                                            : 'bg-slate-100 dark:bg-slate-800/80 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-200 dark:hover:bg-slate-700/80'
                                    }`}
                                >
                                    <Clock className="w-3.5 h-3.5 hidden sm:inline" />
                                    <span>Jam {label}</span>
                                </button>
                            );
                        })}

                        {/* Kustom Button */}
                        <button
                            type="button"
                            onClick={handleCustomPeriodClick}
                            className={`h-10 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-1 border active:scale-95 ${
                                isCustomPeriod
                                    ? 'bg-emerald-600 text-white border-emerald-500 shadow-md shadow-emerald-500/20 scale-[1.02]'
                                    : 'bg-slate-100 dark:bg-slate-800/80 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-200 dark:hover:bg-slate-700/80'
                            }`}
                        >
                            <span>+ Kustom</span>
                        </button>
                    </div>

                    {/* Custom Period Input: only displayed when Kustom is active */}
                    {isCustomPeriod && (
                        <div className="mt-2 animate-fade-in">
                            <Input
                                type="text"
                                value={formData.period_label}
                                onChange={(e) => handleCustomPeriodChange(e.target.value)}
                                placeholder="cth. 1-3 atau 7-8"
                                className="h-11 rounded-xl font-medium"
                                autoFocus
                                required
                            />
                        </div>
                    )}
                </div>

                {/* Inline Conflict Warning */}
                {conflictSchedule && (
                    <div className="flex items-start gap-2.5 p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-700 dark:text-amber-300 text-xs">
                        <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                        <div>
                            <span className="font-bold">Potensi Bentrok Jadwal!</span>
                            <p className="text-[11px] opacity-90 mt-0.5">
                                Sudah ada jadwal PH <strong>"{conflictSchedule.subject}"</strong> pada Jam{' '}
                                {conflictSchedule.period_label} di tanggal yang sama.
                            </p>
                        </div>
                    </div>
                )}

                {/* Footer Action Buttons: Side-by-side on mobile and desktop */}
                <div className="grid grid-cols-2 gap-2.5 pt-3 sm:pt-4 border-t border-slate-100 dark:border-slate-800 sm:flex sm:justify-end">
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
                        disabled={isPending || !formData.subject.trim()}
                        className="rounded-xl font-bold min-h-[44px] px-6 shadow-lg shadow-emerald-500/20 flex items-center justify-center gap-2 w-full sm:w-auto"
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
                                <span>Tambah Jadwal PH</span>
                            </>
                        )}
                    </Button>
                </div>
            </form>
        </Modal>
    );
};
