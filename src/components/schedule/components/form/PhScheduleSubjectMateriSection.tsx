import React from 'react';
import {
    BookOpen,
    ChevronDown,
    Search,
    Check,
    Plus,
    Sparkles,
    Clock,
} from 'lucide-react';
import { Input } from '../../../ui/Input';

interface PhScheduleSubjectMateriSectionProps {
    selectedSubject: string;
    topic: string;
    isCustomSubject: boolean;
    onResetToSuggestions: () => void;
    onCustomSubjectChange: (val: string) => void;
    isDropdownOpen: boolean;
    onToggleDropdown: () => void;
    dropdownRef: React.RefObject<HTMLDivElement>;
    subjectSearch: string;
    onSubjectSearchChange: (val: string) => void;
    filteredSubjectSuggestions: string[];
    onSelectSubject: (s: string) => void;
    onTopicChange: (topic: string) => void;
    topicSuggestions: string[];
    periodLabel: string;
}

export const PhScheduleSubjectMateriSection: React.FC<PhScheduleSubjectMateriSectionProps> = ({
    selectedSubject,
    topic,
    isCustomSubject,
    onResetToSuggestions,
    onCustomSubjectChange,
    isDropdownOpen,
    onToggleDropdown,
    dropdownRef,
    subjectSearch,
    onSubjectSearchChange,
    filteredSubjectSuggestions,
    onSelectSubject,
    onTopicChange,
    topicSuggestions,
    periodLabel,
}) => {
    return (
        <div className="rounded-2xl border border-slate-200/80 bg-slate-50/50 p-4 space-y-3.5 dark:border-slate-800 dark:bg-slate-850/40">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                <BookOpen className="w-4 h-4 text-brand-600 dark:text-brand-400" />
                <span>2. Mata Pelajaran &amp; Materi</span>
            </div>

            {/* Mata Pelajaran */}
            <div className="space-y-1.5">
                <div className="flex items-center justify-between gap-2">
                    <label
                        htmlFor="ph-modal-subject-trigger"
                        className="block text-sm font-semibold text-slate-700 dark:text-slate-200"
                    >
                        Mata Pelajaran <span className="text-brand-500">*</span>
                    </label>
                    <span className="text-[11px] font-medium text-slate-400">
                        Pilih mata pelajaran atau tambah sendiri
                    </span>
                </div>

                {!isCustomSubject ? (
                    <div className="relative" ref={dropdownRef}>
                        <button
                            id="ph-modal-subject-trigger"
                            type="button"
                            onClick={onToggleDropdown}
                            className={`w-full h-11 px-3.5 rounded-xl border text-left flex items-center justify-between text-sm font-medium transition-all ${
                                isDropdownOpen
                                    ? 'border-brand-500 ring-2 ring-brand-500/20 bg-white dark:bg-slate-800'
                                    : 'border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 hover:border-slate-400 dark:hover:border-slate-600'
                            } text-slate-900 dark:text-white`}
                        >
                            <div className="flex items-center gap-2.5 truncate">
                                <BookOpen className="w-4 h-4 text-brand-500 shrink-0" />
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

                        {isDropdownOpen && (
                            <div className="absolute left-0 right-0 z-50 mt-1.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-750 shadow-2xl overflow-hidden animate-fade-in">
                                <div className="p-2 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/50">
                                    <div className="relative">
                                        <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                                        <input
                                            type="text"
                                            value={subjectSearch}
                                            onChange={(e) => onSubjectSearchChange(e.target.value)}
                                            placeholder="Cari mata pelajaran..."
                                            className="w-full pl-8 pr-3 py-1.5 text-xs rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-brand-500"
                                            autoFocus
                                        />
                                    </div>
                                </div>

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
                                                    onClick={() => onSelectSubject(s)}
                                                    className={`w-full px-3.5 py-2 text-xs text-left flex items-center justify-between transition-colors ${
                                                        isSelected
                                                            ? 'bg-brand-500/15 text-brand-600 dark:text-brand-400 font-bold'
                                                            : 'text-slate-800 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800'
                                                    }`}
                                                >
                                                    <span>{s}</span>
                                                    {isSelected && (
                                                        <Check className="w-3.5 h-3.5 stroke-[2.5] text-brand-500" />
                                                    )}
                                                </button>
                                            );
                                        })
                                    )}
                                </div>

                                <button
                                    type="button"
                                    onClick={() => onSelectSubject('__CUSTOM__')}
                                    className="w-full px-3.5 py-2.5 text-xs text-left font-bold text-brand-600 dark:text-brand-300 hover:bg-brand-50 dark:hover:bg-brand-950/40 border-t border-slate-200 dark:border-slate-700 flex items-center gap-1.5 transition-colors bg-white dark:bg-slate-900"
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
                            <span className="text-xs font-semibold text-brand-600 dark:text-brand-400 flex items-center gap-1">
                                <Plus className="w-3.5 h-3.5" />
                                <span>Mata Pelajaran Kustom:</span>
                            </span>
                            <button
                                type="button"
                                onClick={onResetToSuggestions}
                                className="text-xs text-slate-500 hover:text-brand-500 underline font-medium"
                            >
                                ← Kembali ke List Mapel
                            </button>
                        </div>
                        <Input
                            type="text"
                            value={selectedSubject}
                            onChange={(e) => onCustomSubjectChange(e.target.value)}
                            placeholder="Ketik nama mata pelajaran baru..."
                            className="h-11 rounded-xl font-medium bg-white dark:bg-slate-900"
                            autoFocus
                            required
                        />
                    </div>
                )}
            </div>

            {/* Dedicated Topic / Materi Field */}
            <div className="space-y-2">
                <div className="flex items-center justify-between gap-2">
                    <label
                        htmlFor="ph-modal-topic"
                        className="block text-sm font-semibold text-slate-700 dark:text-slate-200"
                    >
                        Materi / Topik ASH{' '}
                        <span className="text-xs font-normal text-slate-400">(opsional)</span>
                    </label>
                    {topic && (
                        <button
                            type="button"
                            onClick={() => onTopicChange('')}
                            className="text-[11px] font-medium text-slate-400 hover:text-rose-500 transition-colors"
                        >
                            Reset topik
                        </button>
                    )}
                </div>
                <Input
                    id="ph-modal-topic"
                    type="text"
                    value={topic}
                    onChange={(e) => onTopicChange(e.target.value)}
                    placeholder="cth. Pecahan & Desimal, Bab 1: Bilangan Cacah..."
                    className="h-11 rounded-xl bg-white dark:bg-slate-900"
                />

                {/* Quick-Pick Topic Pills */}
                {topicSuggestions.length > 0 && (
                    <div className="space-y-1.5 pt-1">
                        <p className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                            Pilih cepat dari Lingkup Materi / TP Kurikulum:
                        </p>
                        <div className="flex flex-wrap gap-1.5">
                            {topicSuggestions.map((suggested) => {
                                const isPicked = topic.trim().toLowerCase() === suggested.toLowerCase();
                                return (
                                    <button
                                        key={suggested}
                                        type="button"
                                        onClick={() => onTopicChange(isPicked ? '' : suggested)}
                                        className={`rounded-lg border px-2.5 py-1 text-left text-xs font-medium transition-all active:scale-95 ${
                                            isPicked
                                                ? 'border-brand-600 bg-brand-600 text-white shadow-2xs'
                                                : 'border-slate-200 bg-white text-slate-700 hover:border-brand-400 hover:bg-brand-50/50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:border-brand-600'
                                        }`}
                                    >
                                        {suggested}
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                )}
            </div>

            {/* Real-time Schedule Summary Preview */}
            {selectedSubject.trim() ? (
                <div className="flex flex-wrap items-center justify-between gap-2 p-2.5 rounded-xl bg-white dark:bg-slate-900/90 border border-slate-200/80 dark:border-slate-700/80 text-xs">
                    <div className="flex items-center gap-2 min-w-0">
                        <Sparkles className="w-4 h-4 text-brand-500 dark:text-brand-400 shrink-0" />
                        <span className="text-slate-500 dark:text-slate-400 font-medium shrink-0">
                            Nama di Jadwal:
                        </span>
                        <span className="font-bold text-slate-900 dark:text-white truncate">
                            {topic.trim() ? `${selectedSubject} (${topic.trim()})` : selectedSubject}
                        </span>
                    </div>
                    {periodLabel && (
                        <span className="inline-flex items-center gap-1 rounded-md bg-slate-100 dark:bg-slate-800 px-2 py-0.5 text-[11px] font-semibold text-slate-600 dark:text-slate-300 shrink-0">
                            <Clock className="w-3 h-3 text-brand-500" />
                            Jam {periodLabel}
                        </span>
                    )}
                </div>
            ) : (
                <p className="text-xs text-slate-400">
                    Pilih mata pelajaran untuk melihat pratinjau jadwal.
                </p>
            )}
        </div>
    );
};
