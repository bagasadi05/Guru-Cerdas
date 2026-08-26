import React, { useMemo, useState, useRef, useEffect } from 'react';
import { SubmitHandler, useForm, useWatch } from 'react-hook-form';
import { violationRules, ViolationFormValues } from '../schemas';
import { validationResolver } from '../../../../utils/formValidation';
import { Button } from '../../../ui/Button';
import { Input } from '../../../ui/Input';
import { Textarea } from '../../../ui/Textarea';
import { ViolationRow } from '../types';
import { violationList, ViolationItem } from '../../../../services/violations.data';
import { SEVERITY_LEVELS, SeverityLevel } from '../violationMeta';
import { AlertTriangle, Camera, Upload, Search, ChevronDown, Check, X } from 'lucide-react';

interface ViolationFormProps {
    defaultValues: ViolationRow | null;
    onSubmit: (data: ViolationFormValues & { evidence_file?: File }) => void;
    onClose: () => void;
    isPending: boolean;
    conflictFields?: string[];
}

export const ViolationForm: React.FC<ViolationFormProps> = ({ defaultValues, onSubmit, onClose, isPending, conflictFields = [] }) => {
    const [evidenceFile, setEvidenceFile] = useState<File | null>(null);
    const [evidencePreview, setEvidencePreview] = useState<string | null>(defaultValues?.evidence_url || null);
    const defaultSeverity = defaultValues?.severity;
    const normalizedSeverity =
        defaultSeverity === 'ringan' || defaultSeverity === 'sedang' || defaultSeverity === 'berat'
            ? defaultSeverity
            : null;

    const { register, handleSubmit, control, setValue, formState: { errors } } = useForm<ViolationFormValues>({
        resolver: validationResolver<ViolationFormValues>(violationRules),
        defaultValues: {
            date: defaultValues?.date || new Date().toISOString().slice(0, 10),
            description: defaultValues?.description || '',
            severity: normalizedSeverity,
            context_notes: defaultValues?.context_notes || '',
        }
    });

    const selectedDescription = useWatch({ control, name: 'description' });
    const selectedSeverity = useWatch({ control, name: 'severity' });

    // ─── Custom Searchable Dropdown State ─────────────────────────────────────
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [activeCategoryTab, setActiveCategoryTab] = useState<'Semua' | 'Ringan' | 'Sedang' | 'Berat'>('Semua');
    const dropdownRef = useRef<HTMLDivElement>(null);
    const searchInputRef = useRef<HTMLInputElement>(null);

    // Sync active category tab if user clicks severity radio
    const handleSeverityChange = (level: SeverityLevel) => {
        setValue('severity', level);
        if (level === 'ringan') setActiveCategoryTab('Ringan');
        else if (level === 'sedang') setActiveCategoryTab('Sedang');
        else if (level === 'berat') setActiveCategoryTab('Berat');
    };

    // Close on click outside or escape key
    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
                setIsDropdownOpen(false);
            }
        };
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                setIsDropdownOpen(false);
            }
        };

        if (isDropdownOpen) {
            document.addEventListener('mousedown', handleClickOutside);
            document.addEventListener('keydown', handleKeyDown);
            setTimeout(() => searchInputRef.current?.focus(), 50);
        }
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
            document.removeEventListener('keydown', handleKeyDown);
        };
    }, [isDropdownOpen]);

    // Filtered violations based on tab & search query
    const filteredViolations = useMemo(() => {
        let list = violationList;
        if (activeCategoryTab !== 'Semua') {
            list = list.filter(v => v.category === activeCategoryTab);
        }
        if (searchQuery.trim()) {
            const q = searchQuery.toLowerCase();
            list = list.filter(v =>
                v.description.toLowerCase().includes(q) ||
                v.bintangAspect.toLowerCase().includes(q) ||
                v.category.toLowerCase().includes(q) ||
                v.code.includes(q)
            );
        }
        return list;
    }, [activeCategoryTab, searchQuery]);

    // Category count metrics
    const categoryCounts = useMemo(() => ({
        Semua: violationList.length,
        Ringan: violationList.filter(v => v.category === 'Ringan').length,
        Sedang: violationList.filter(v => v.category === 'Sedang').length,
        Berat: violationList.filter(v => v.category === 'Berat').length,
    }), []);

    // Currently selected violation object
    const currentViolation = useMemo(() => {
        return violationList.find(v => v.description === selectedDescription) || null;
    }, [selectedDescription]);

    const handleSelectViolation = (violation: ViolationItem) => {
        setValue('description', violation.description, { shouldValidate: true });
        setValue('severity', violation.category.toLowerCase() as SeverityLevel);
        setIsDropdownOpen(false);
        setSearchQuery('');
    };

    // Auto-detect severity based on selected violation
    const detectedSeverity = useMemo(() => {
        if (!selectedDescription) return null;
        const violation = violationList.find(v => v.description === selectedDescription);
        if (!violation) return null;
        return violation.category.toLowerCase() as SeverityLevel;
    }, [selectedDescription]);

    // Update severity when violation is selected
    useEffect(() => {
        if (detectedSeverity && !defaultValues?.severity) {
            setValue('severity', detectedSeverity);
        }
    }, [detectedSeverity, setValue, defaultValues?.severity]);

    // Get violation points
    const selectedPoints = useMemo(() => {
        if (!selectedDescription) return null;
        const violation = violationList.find(v => v.description === selectedDescription);
        return violation?.points || null;
    }, [selectedDescription]);

    const handleEvidenceChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            setEvidenceFile(file);
            if (file.type.startsWith('image/')) {
                setEvidencePreview(URL.createObjectURL(file));
            } else {
                setEvidencePreview(null);
            }
        }
    };

    const handleRemoveEvidence = () => {
        setEvidenceFile(null);
        if (evidencePreview && !defaultValues?.evidence_url) {
            URL.revokeObjectURL(evidencePreview);
        }
        setEvidencePreview(null);
    };

    const handleFormSubmit: SubmitHandler<ViolationFormValues> = (data) => {
        onSubmit({
            ...data,
            evidence_file: evidenceFile || undefined
        });
    };

    return (
        <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-4">
            {/* Severity Selection */}
            <div>
                <label className="block text-sm font-medium mb-2">Tingkat Pelanggaran</label>
                <div className="grid grid-cols-3 gap-2">
                    {(Object.entries(SEVERITY_LEVELS) as [SeverityLevel, typeof SEVERITY_LEVELS[SeverityLevel]][]).map(([key, level]) => (
                        <label
                            key={key}
                            onClick={() => handleSeverityChange(key)}
                            className={`flex items-center justify-center gap-2 p-3 rounded-xl border-2 cursor-pointer transition-all ${selectedSeverity === key
                                    ? `${level.borderClass} ${level.bgClass}`
                                    : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600'
                                }`}
                        >
                            <input
                                type="radio"
                                value={key}
                                {...register('severity')}
                                className="sr-only"
                            />
                            <span className="text-xl">{level.icon}</span>
                            <div className="text-left">
                                <p className={`font-medium text-sm ${selectedSeverity === key ? level.textClass : 'text-slate-700 dark:text-slate-300'}`}>
                                    {level.label}
                                </p>
                                <p className="text-xs text-slate-400">{level.points} poin</p>
                            </div>
                        </label>
                    ))}
                </div>
            </div>

            {/* Date */}
            <div className={conflictFields.includes('date') ? 'p-3 rounded-lg border-2 border-amber-300 dark:border-amber-700 bg-amber-50 dark:bg-amber-900/20' : ''}>
                <label className="block text-sm font-medium mb-1">
                    Tanggal Kejadian
                    {conflictFields.includes('date') && (
                        <span className="ml-2 text-xs text-amber-600 dark:text-amber-400 font-medium">
                            ⚠️ Sudah tercatat di tanggal ini
                        </span>
                    )}
                </label>
                <Input type="date" {...register('date')} error={errors.date?.message} className={conflictFields.includes('date') ? 'border-amber-300 dark:border-amber-600' : ''} />
            </div>

            {/* Violation Type Selection (Searchable Dropdown) */}
            <div className={conflictFields.includes('description') ? 'p-3 rounded-lg border-2 border-amber-300 dark:border-amber-700 bg-amber-50 dark:bg-amber-900/20' : ''}>
                <label className="block text-sm font-medium mb-1">
                    Jenis Pelanggaran <span className="text-rose-500">*</span>
                    {conflictFields.includes('description') && (
                        <span className="ml-2 text-xs text-amber-600 dark:text-amber-400 font-medium">
                            ⚠️ Jenis pelanggaran ini sudah tercatat
                        </span>
                    )}
                </label>

                {/* Hidden input for react-hook-form registration */}
                <input type="hidden" {...register('description')} />

                <div className="relative" ref={dropdownRef}>
                    <button
                        type="button"
                        onClick={() => setIsDropdownOpen(prev => !prev)}
                        className={`w-full min-h-[48px] px-3.5 py-2.5 rounded-xl border text-left flex items-center justify-between gap-2 transition-all bg-slate-50 dark:bg-slate-800/60 ${
                            errors.description
                                ? 'border-rose-500 ring-1 ring-rose-500'
                                : isDropdownOpen
                                ? 'border-brand-500 ring-2 ring-brand-500/20 bg-white dark:bg-slate-800'
                                : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600'
                        }`}
                    >
                        {currentViolation ? (
                            <div className="flex flex-wrap items-center gap-2 min-w-0 flex-1">
                                <span className="text-sm font-medium text-slate-800 dark:text-slate-100 line-clamp-1">
                                    {currentViolation.description}
                                </span>
                                <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-md ${
                                    currentViolation.category === 'Ringan'
                                        ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300'
                                        : currentViolation.category === 'Sedang'
                                        ? 'bg-orange-100 text-orange-800 dark:bg-orange-900/40 dark:text-orange-300'
                                        : 'bg-rose-100 text-rose-800 dark:bg-rose-900/40 dark:text-rose-300'
                                }`}>
                                    +{currentViolation.points} poin
                                </span>
                                <span className="text-[11px] font-medium px-2 py-0.5 rounded-md bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300">
                                    {currentViolation.bintangAspect}
                                </span>
                            </div>
                        ) : (
                            <span className="text-sm text-slate-400 dark:text-slate-500 flex items-center gap-2">
                                <Search className="w-4 h-4 text-slate-400" />
                                Cari atau pilih jenis pelanggaran ({violationList.length} butir)...
                            </span>
                        )}
                        <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform duration-200 shrink-0 ${isDropdownOpen ? 'rotate-180' : ''}`} />
                    </button>

                    {/* Popover Dropdown Panel */}
                    {isDropdownOpen && (
                        <div className="absolute z-50 mt-1.5 left-0 right-0 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 shadow-2xl overflow-hidden p-2.5">
                            {/* Search Box */}
                            <div className="relative mb-2">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                                <input
                                    ref={searchInputRef}
                                    type="text"
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    placeholder="Cari pelanggaran (cth: seragam, sepatu, kuku, hp, berantem)..."
                                    className="w-full pl-9 pr-8 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-200 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500"
                                />
                                {searchQuery && (
                                    <button
                                        type="button"
                                        onClick={() => setSearchQuery('')}
                                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                                    >
                                        <X className="w-4 h-4" />
                                    </button>
                                )}
                            </div>

                            {/* Category Filter Tabs */}
                            <div className="flex gap-1 mb-2 p-1 bg-slate-100 dark:bg-slate-800/80 rounded-xl overflow-x-auto custom-scrollbar">
                                {(['Semua', 'Ringan', 'Sedang', 'Berat'] as const).map(cat => (
                                    <button
                                        key={cat}
                                        type="button"
                                        onClick={() => setActiveCategoryTab(cat)}
                                        className={`px-2.5 py-1 text-xs font-semibold rounded-lg transition-all whitespace-nowrap ${
                                            activeCategoryTab === cat
                                                ? 'bg-white dark:bg-slate-700 text-brand-600 dark:text-brand-300 shadow-sm'
                                                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                                        }`}
                                    >
                                        {cat === 'Ringan' && '⚠️ '}
                                        {cat === 'Sedang' && '🔶 '}
                                        {cat === 'Berat' && '🔴 '}
                                        {cat} ({categoryCounts[cat]})
                                    </button>
                                ))}
                            </div>

                            {/* Scrollable Violation Option List */}
                            <div className="max-h-56 overflow-y-auto space-y-1 custom-scrollbar pr-1">
                                {filteredViolations.length === 0 ? (
                                    <div className="py-8 text-center text-slate-500 text-sm">
                                        Tidak ada pelanggaran yang sesuai dengan pencarian "{searchQuery}"
                                    </div>
                                ) : (
                                    filteredViolations.map(v => {
                                        const isSelected = selectedDescription === v.description;
                                        return (
                                            <button
                                                key={v.code}
                                                type="button"
                                                onClick={() => handleSelectViolation(v)}
                                                className={`w-full text-left px-3 py-2 rounded-xl text-sm transition-colors flex items-center justify-between gap-2.5 ${
                                                    isSelected
                                                        ? 'bg-rose-50 dark:bg-rose-900/30 text-rose-800 dark:text-rose-200 border border-rose-200 dark:border-rose-800/50'
                                                        : 'hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200'
                                                }`}
                                            >
                                                <div className="flex items-center gap-2.5 min-w-0 flex-1">
                                                    <div className={`w-4 h-4 rounded-md flex items-center justify-center shrink-0 ${
                                                        isSelected
                                                            ? 'bg-rose-500 text-white'
                                                            : 'border border-slate-300 dark:border-slate-600'
                                                    }`}>
                                                        {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                                                    </div>
                                                    <div className="min-w-0">
                                                        <p className="font-medium text-xs sm:text-sm leading-snug line-clamp-1">
                                                            {v.description}
                                                        </p>
                                                        <span className="text-[10px] text-slate-400 dark:text-slate-500">
                                                            {v.bintangAspect} • Kode {v.code}
                                                        </span>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-1 shrink-0">
                                                    <span className={`text-[10px] sm:text-[11px] font-bold px-2 py-0.5 rounded-md ${
                                                        v.category === 'Ringan'
                                                            ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300'
                                                            : v.category === 'Sedang'
                                                            ? 'bg-orange-100 text-orange-800 dark:bg-orange-900/40 dark:text-orange-300'
                                                            : 'bg-rose-100 text-rose-800 dark:bg-rose-900/40 dark:text-rose-300'
                                                    }`}>
                                                        +{v.points} poin
                                                    </span>
                                                </div>
                                            </button>
                                        );
                                    })
                                )}
                            </div>
                        </div>
                    )}
                </div>

                {errors.description && (
                    <p className="text-xs text-rose-500 mt-1">{errors.description.message}</p>
                )}

                {/* Points & Aspect Preview */}
                {selectedPoints && (
                    <div className="mt-2 p-2.5 rounded-xl bg-rose-50 dark:bg-rose-900/20 border border-rose-200 dark:border-rose-800/40 flex items-center gap-2">
                        <AlertTriangle className="w-4 h-4 text-rose-500 shrink-0" />
                        <span className="text-xs text-rose-700 dark:text-rose-300">
                            Pelanggaran ini akan menambah <strong>{selectedPoints} poin</strong> ke aspek <strong>{currentViolation?.bintangAspect || 'terkait'}</strong>.
                        </span>
                    </div>
                )}
            </div>

            {/* Evidence Upload */}
            <div>
                <label className="block text-sm font-medium mb-1">Bukti Foto (Opsional)</label>
                {!evidencePreview && !evidenceFile ? (
                    <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-lg cursor-pointer hover:border-brand-500 dark:hover:border-brand-500 transition-colors">
                        <div className="flex flex-col items-center justify-center pt-5 pb-6">
                            <Upload className="w-8 h-8 mb-2 text-gray-400" />
                            <p className="text-sm text-gray-500 dark:text-gray-400">Klik untuk upload bukti foto</p>
                            <p className="text-xs text-gray-400">PNG, JPG (maks. 5MB)</p>
                        </div>
                        <input
                            type="file"
                            className="hidden"
                            accept="image/*"
                            onChange={handleEvidenceChange}
                        />
                    </label>
                ) : (
                    <div className="relative">
                        {evidencePreview && (
                            <img
                                src={evidencePreview}
                                alt="Evidence preview"
                                className="w-full h-32 object-cover rounded-lg"
                            />
                        )}
                        {evidenceFile && !evidencePreview && (
                            <div className="flex items-center gap-2 p-3 bg-gray-100 dark:bg-gray-800 rounded-lg">
                                <Camera className="w-5 h-5 text-gray-500" />
                                <span className="text-sm text-gray-600 dark:text-gray-400">{evidenceFile.name}</span>
                            </div>
                        )}
                        <button
                            type="button"
                            onClick={handleRemoveEvidence}
                            className="absolute top-2 right-2 p-1.5 bg-red-500 text-white rounded-full hover:bg-red-600"
                        >
                            ✕
                        </button>
                    </div>
                )}
            </div>

            {/* Keterangan / Konteks */}
            <div>
                <label className="block text-sm font-medium mb-1">Keterangan (Opsional)</label>
                <Textarea
                    {...register('context_notes')}
                    placeholder="Keterangan atau konteks tambahan terkait pelanggaran ini..."
                    rows={3}
                />
            </div>



            {/* Actions */}
            <div className="flex justify-end gap-2 pt-4">
                <Button type="button" variant="ghost" onClick={onClose}>Batal</Button>
                <Button type="submit" disabled={isPending} className="bg-red-600 hover:bg-red-700">
                    {isPending ? 'Menyimpan...' : 'Simpan Pelanggaran'}
                </Button>
            </div>
        </form>
    );
};