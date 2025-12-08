import React, { useState, useEffect, useRef } from 'react';
import { X, ChevronLeft, ChevronRight, HelpCircle, Search, Book, Lightbulb, Sparkles } from 'lucide-react';
import { useOnboarding, useHelpSystem, ONBOARDING_FLOWS, HELP_TOPICS } from '../hooks/useUXEnhancements';

// ============================================
// ONBOARDING TOOLTIP
// ============================================

interface OnboardingTooltipProps {
    step: {
        id: string;
        title: string;
        description: string;
        target?: string;
        position?: 'top' | 'bottom' | 'left' | 'right' | 'center';
    };
    currentStep: number;
    totalSteps: number;
    onNext: () => void;
    onPrevious: () => void;
    onSkip: () => void;
    isFirst: boolean;
    isLast: boolean;
}

export const OnboardingTooltip: React.FC<OnboardingTooltipProps> = ({
    step,
    currentStep,
    totalSteps,
    onNext,
    onPrevious,
    onSkip,
    isFirst,
    isLast
}) => {
    const [position, setPosition] = useState({ top: 0, left: 0 });
    const tooltipRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (step.position === 'center' || !step.target) {
            // Center on screen
            setPosition({
                top: window.innerHeight / 2 - 100,
                left: window.innerWidth / 2 - 175
            });
            return;
        }

        const target = document.querySelector(step.target);
        if (!target || !tooltipRef.current) return;

        const targetRect = target.getBoundingClientRect();
        const tooltipRect = tooltipRef.current.getBoundingClientRect();
        const gap = 12;

        let top = 0;
        let left = 0;

        switch (step.position) {
            case 'bottom':
                top = targetRect.bottom + gap;
                left = targetRect.left + targetRect.width / 2 - tooltipRect.width / 2;
                break;
            case 'top':
                top = targetRect.top - tooltipRect.height - gap;
                left = targetRect.left + targetRect.width / 2 - tooltipRect.width / 2;
                break;
            case 'left':
                top = targetRect.top + targetRect.height / 2 - tooltipRect.height / 2;
                left = targetRect.left - tooltipRect.width - gap;
                break;
            case 'right':
                top = targetRect.top + targetRect.height / 2 - tooltipRect.height / 2;
                left = targetRect.right + gap;
                break;
        }

        // Keep within viewport
        left = Math.max(16, Math.min(left, window.innerWidth - tooltipRect.width - 16));
        top = Math.max(16, Math.min(top, window.innerHeight - tooltipRect.height - 16));

        setPosition({ top, left });
    }, [step]);

    return (
        <>
            {/* Backdrop */}
            <div className="fixed inset-0 bg-black/50 z-[9998]" onClick={onSkip} />

            {/* Highlight target element */}
            {step.target && (
                <HighlightOverlay target={step.target} />
            )}

            {/* Tooltip */}
            <div
                ref={tooltipRef}
                className="fixed z-[9999] w-[350px] bg-white dark:bg-slate-800 rounded-2xl shadow-2xl p-6"
                style={{ top: position.top, left: position.left }}
            >
                {/* Progress dots */}
                <div className="flex justify-center gap-1.5 mb-4">
                    {Array.from({ length: totalSteps }).map((_, i) => (
                        <div
                            key={i}
                            className={`w-2 h-2 rounded-full transition-colors ${i === currentStep
                                    ? 'bg-indigo-500'
                                    : i < currentStep
                                        ? 'bg-indigo-300'
                                        : 'bg-slate-300 dark:bg-slate-600'
                                }`}
                        />
                    ))}
                </div>

                {/* Icon */}
                {step.position === 'center' && (
                    <div className="flex justify-center mb-4">
                        <div className="w-16 h-16 bg-indigo-100 dark:bg-indigo-900/30 rounded-full flex items-center justify-center">
                            <Sparkles className="w-8 h-8 text-indigo-500" />
                        </div>
                    </div>
                )}

                <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">
                    {step.title}
                </h3>
                <p className="text-slate-600 dark:text-slate-400 text-sm mb-6">
                    {step.description}
                </p>

                {/* Actions */}
                <div className="flex items-center justify-between">
                    <button
                        onClick={onSkip}
                        className="text-sm text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
                    >
                        Lewati
                    </button>
                    <div className="flex gap-2">
                        {!isFirst && (
                            <button
                                onClick={onPrevious}
                                className="p-2 rounded-lg bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors"
                            >
                                <ChevronLeft className="w-5 h-5" />
                            </button>
                        )}
                        <button
                            onClick={onNext}
                            className="px-4 py-2 bg-indigo-500 hover:bg-indigo-600 text-white rounded-lg font-medium transition-colors"
                        >
                            {isLast ? 'Selesai' : 'Lanjut'}
                        </button>
                    </div>
                </div>
            </div>
        </>
    );
};

// Highlight overlay for target element
const HighlightOverlay: React.FC<{ target: string }> = ({ target }) => {
    const [rect, setRect] = useState<DOMRect | null>(null);

    useEffect(() => {
        const el = document.querySelector(target);
        if (el) {
            setRect(el.getBoundingClientRect());
        }
    }, [target]);

    if (!rect) return null;

    return (
        <div
            className="fixed z-[9998] ring-4 ring-indigo-500 ring-offset-4 rounded-lg pointer-events-none"
            style={{
                top: rect.top,
                left: rect.left,
                width: rect.width,
                height: rect.height
            }}
        />
    );
};

// ============================================
// ONBOARDING PROVIDER
// ============================================

interface OnboardingOverlayProps {
    flowId: string;
    steps: typeof ONBOARDING_FLOWS.newUser;
    autoStart?: boolean;
}

export const OnboardingOverlay: React.FC<OnboardingOverlayProps> = ({
    flowId,
    steps,
    autoStart = true
}) => {
    const {
        isActive,
        currentStep,
        currentStepData,
        totalSteps,
        isFirstStep,
        isLastStep,
        isFlowCompleted,
        start,
        next,
        previous,
        skip
    } = useOnboarding(flowId, steps);

    // Auto-start for new users
    useEffect(() => {
        if (autoStart && !isFlowCompleted) {
            start();
        }
    }, [autoStart, isFlowCompleted, start]);

    if (!isActive || !currentStepData) return null;

    return (
        <OnboardingTooltip
            step={currentStepData}
            currentStep={currentStep}
            totalSteps={totalSteps}
            onNext={next}
            onPrevious={previous}
            onSkip={skip}
            isFirst={isFirstStep}
            isLast={isLastStep}
        />
    );
};

// ============================================
// HELP PANEL
// ============================================

export const HelpPanel: React.FC = () => {
    const {
        isOpen,
        searchQuery,
        setSearchQuery,
        searchResults,
        selectedTopic,
        setSelectedTopic,
        topicsByCategory,
        close
    } = useHelpSystem();

    const [localOpen, setLocalOpen] = useState(false);

    if (!localOpen && !isOpen) {
        return (
            <button
                onClick={() => setLocalOpen(true)}
                className="fixed bottom-6 right-6 z-50 w-14 h-14 bg-indigo-500 hover:bg-indigo-600 text-white rounded-full shadow-lg flex items-center justify-center transition-all hover:scale-110"
                aria-label="Bantuan"
            >
                <HelpCircle className="w-6 h-6" />
            </button>
        );
    }

    return (
        <div className="fixed bottom-6 right-6 z-50 w-96 max-h-[70vh] bg-white dark:bg-slate-900 rounded-2xl shadow-2xl overflow-hidden flex flex-col">
            {/* Header */}
            <div className="p-4 bg-indigo-500 text-white">
                <div className="flex items-center justify-between mb-4">
                    <h2 className="font-semibold text-lg flex items-center gap-2">
                        <Book className="w-5 h-5" />
                        Pusat Bantuan
                    </h2>
                    <button
                        onClick={() => { close(); setLocalOpen(false); }}
                        className="p-1 hover:bg-white/20 rounded-lg transition-colors"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Search */}
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-indigo-200" />
                    <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Cari bantuan..."
                        className="w-full pl-10 pr-4 py-2 bg-white/20 border border-white/30 rounded-lg text-white placeholder-indigo-200 focus:outline-none focus:ring-2 focus:ring-white/50"
                    />
                </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-4">
                {selectedTopic ? (
                    // Topic detail view
                    <div>
                        <button
                            onClick={() => setSelectedTopic(null)}
                            className="flex items-center gap-1 text-sm text-indigo-500 hover:text-indigo-600 mb-4"
                        >
                            <ChevronLeft className="w-4 h-4" />
                            Kembali
                        </button>
                        <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-3">
                            {selectedTopic.title}
                        </h3>
                        <div className="text-slate-600 dark:text-slate-400 text-sm whitespace-pre-line">
                            {selectedTopic.content}
                        </div>
                    </div>
                ) : searchQuery ? (
                    // Search results
                    <div>
                        <p className="text-sm text-slate-500 mb-3">
                            {searchResults.length} hasil ditemukan
                        </p>
                        {searchResults.map(topic => (
                            <button
                                key={topic.id}
                                onClick={() => setSelectedTopic(topic)}
                                className="w-full text-left p-3 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors mb-2"
                            >
                                <div className="font-medium text-slate-900 dark:text-white">
                                    {topic.title}
                                </div>
                                <div className="text-sm text-slate-500 truncate">
                                    {topic.content.slice(0, 80)}...
                                </div>
                            </button>
                        ))}
                    </div>
                ) : (
                    // Categories view
                    <div className="space-y-6">
                        {Object.entries(topicsByCategory).map(([category, topics]) => (
                            <div key={category}>
                                <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                                    {category}
                                </h4>
                                <div className="space-y-1">
                                    {topics.map(topic => (
                                        <button
                                            key={topic.id}
                                            onClick={() => setSelectedTopic(topic)}
                                            className="w-full text-left p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors flex items-center gap-2"
                                        >
                                            <Lightbulb className="w-4 h-4 text-amber-500" />
                                            <span className="text-sm text-slate-700 dark:text-slate-300">
                                                {topic.title}
                                            </span>
                                        </button>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50">
                <p className="text-xs text-center text-slate-500">
                    Butuh bantuan lain? <a href="mailto:support@portaguru.com" className="text-indigo-500 hover:underline">Hubungi kami</a>
                </p>
            </div>
        </div>
    );
};

// ============================================
// UNDO/REDO TOOLBAR
// ============================================

interface UndoRedoToolbarProps {
    canUndo: boolean;
    canRedo: boolean;
    onUndo: () => void;
    onRedo: () => void;
    undoCount?: number;
    redoCount?: number;
}

export const UndoRedoToolbar: React.FC<UndoRedoToolbarProps> = ({
    canUndo,
    canRedo,
    onUndo,
    onRedo,
    undoCount = 0,
    redoCount = 0
}) => {
    return (
        <div className="flex items-center gap-1 p-1 bg-slate-100 dark:bg-slate-800 rounded-lg">
            <button
                onClick={onUndo}
                disabled={!canUndo}
                className={`p-2 rounded-lg transition-colors ${canUndo
                        ? 'hover:bg-white dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300'
                        : 'text-slate-400 cursor-not-allowed'
                    }`}
                title={`Undo (${undoCount})`}
            >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
                </svg>
            </button>
            <button
                onClick={onRedo}
                disabled={!canRedo}
                className={`p-2 rounded-lg transition-colors ${canRedo
                        ? 'hover:bg-white dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300'
                        : 'text-slate-400 cursor-not-allowed'
                    }`}
                title={`Redo (${redoCount})`}
            >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 10h-10a8 8 0 00-8 8v2M21 10l-6 6m6-6l-6-6" />
                </svg>
            </button>
        </div>
    );
};

// ============================================
// BULK ACTIONS BAR
// ============================================

interface BulkActionsBarProps {
    selectedCount: number;
    onDelete?: () => void;
    onExport?: () => void;
    onUpdate?: () => void;
    onClear: () => void;
    children?: React.ReactNode;
}

export const BulkActionsBar: React.FC<BulkActionsBarProps> = ({
    selectedCount,
    onDelete,
    onExport,
    onUpdate,
    onClear,
    children
}) => {
    if (selectedCount === 0) return null;

    return (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 bg-slate-900 text-white px-6 py-3 rounded-2xl shadow-2xl flex items-center gap-4">
            <div className="font-medium">
                {selectedCount} item dipilih
            </div>
            <div className="w-px h-6 bg-slate-700" />
            <div className="flex items-center gap-2">
                {onExport && (
                    <button
                        onClick={onExport}
                        className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 rounded-lg text-sm transition-colors"
                    >
                        Export
                    </button>
                )}
                {onUpdate && (
                    <button
                        onClick={onUpdate}
                        className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 rounded-lg text-sm transition-colors"
                    >
                        Update
                    </button>
                )}
                {onDelete && (
                    <button
                        onClick={onDelete}
                        className="px-3 py-1.5 bg-red-600 hover:bg-red-700 rounded-lg text-sm transition-colors"
                    >
                        Hapus
                    </button>
                )}
                {children}
            </div>
            <button
                onClick={onClear}
                className="p-1.5 hover:bg-slate-800 rounded-lg transition-colors"
                aria-label="Clear selection"
            >
                <X className="w-5 h-5" />
            </button>
        </div>
    );
};

// ============================================
// ADVANCED FILTER UI
// ============================================

interface FilterBuilderProps {
    fields: { key: string; label: string; type: 'text' | 'number' | 'date' | 'select'; options?: { value: string; label: string }[] }[];
    onApply: (filters: any) => void;
    onClear: () => void;
}

export const FilterBuilder: React.FC<FilterBuilderProps> = ({ fields, onApply, onClear }) => {
    const [conditions, setConditions] = useState<{ field: string; operator: string; value: string }[]>([]);
    const [logic, setLogic] = useState<'and' | 'or'>('and');

    const addCondition = () => {
        setConditions([...conditions, { field: fields[0]?.key || '', operator: 'contains', value: '' }]);
    };

    const removeCondition = (index: number) => {
        setConditions(conditions.filter((_, i) => i !== index));
    };

    const updateCondition = (index: number, updates: Partial<typeof conditions[0]>) => {
        setConditions(conditions.map((c, i) => i === index ? { ...c, ...updates } : c));
    };

    const operators = [
        { value: 'equals', label: 'Sama dengan' },
        { value: 'not_equals', label: 'Tidak sama dengan' },
        { value: 'contains', label: 'Mengandung' },
        { value: 'starts_with', label: 'Dimulai dengan' },
        { value: 'ends_with', label: 'Diakhiri dengan' },
        { value: 'greater_than', label: 'Lebih dari' },
        { value: 'less_than', label: 'Kurang dari' },
        { value: 'is_empty', label: 'Kosong' },
        { value: 'is_not_empty', label: 'Tidak kosong' }
    ];

    return (
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4">
            <div className="flex items-center justify-between mb-4">
                <h3 className="font-medium text-slate-900 dark:text-white">Filter Lanjutan</h3>
                <div className="flex items-center gap-2">
                    <span className="text-sm text-slate-500">Logika:</span>
                    <select
                        value={logic}
                        onChange={(e) => setLogic(e.target.value as 'and' | 'or')}
                        className="px-2 py-1 text-sm border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700"
                    >
                        <option value="and">DAN</option>
                        <option value="or">ATAU</option>
                    </select>
                </div>
            </div>

            <div className="space-y-2 mb-4">
                {conditions.map((condition, index) => (
                    <div key={index} className="flex items-center gap-2">
                        <select
                            value={condition.field}
                            onChange={(e) => updateCondition(index, { field: e.target.value })}
                            className="flex-1 px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-sm"
                        >
                            {fields.map(field => (
                                <option key={field.key} value={field.key}>{field.label}</option>
                            ))}
                        </select>
                        <select
                            value={condition.operator}
                            onChange={(e) => updateCondition(index, { operator: e.target.value })}
                            className="px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-sm"
                        >
                            {operators.map(op => (
                                <option key={op.value} value={op.value}>{op.label}</option>
                            ))}
                        </select>
                        {!['is_empty', 'is_not_empty'].includes(condition.operator) && (
                            <input
                                type="text"
                                value={condition.value}
                                onChange={(e) => updateCondition(index, { value: e.target.value })}
                                placeholder="Nilai"
                                className="flex-1 px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-sm"
                            />
                        )}
                        <button
                            onClick={() => removeCondition(index)}
                            className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg"
                        >
                            <X className="w-4 h-4" />
                        </button>
                    </div>
                ))}
            </div>

            <div className="flex items-center justify-between">
                <button
                    onClick={addCondition}
                    className="text-sm text-indigo-500 hover:text-indigo-600"
                >
                    + Tambah Kondisi
                </button>
                <div className="flex gap-2">
                    <button
                        onClick={onClear}
                        className="px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg"
                    >
                        Reset
                    </button>
                    <button
                        onClick={() => onApply({ logic, conditions })}
                        className="px-3 py-1.5 text-sm bg-indigo-500 hover:bg-indigo-600 text-white rounded-lg"
                    >
                        Terapkan
                    </button>
                </div>
            </div>
        </div>
    );
};

// ============================================
// EXPORTS
// ============================================

export default {
    OnboardingOverlay,
    OnboardingTooltip,
    HelpPanel,
    UndoRedoToolbar,
    BulkActionsBar,
    FilterBuilder
};
