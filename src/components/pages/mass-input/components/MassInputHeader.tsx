import React from 'react';
import { ArrowLeftIcon } from '../../../Icons';
import { Button } from '../../../ui/Button';
import { School } from 'lucide-react';
import { InputMode, ClassRow } from '../types';
import { actionCards } from '../constants';

interface MassInputHeaderProps {
    handleBack: () => void;
    currentCard: { title: string; description: string } | undefined;
    activeModeConfig: (typeof actionCards)[number] | undefined;
    mode: InputMode | null;
    selectedClass: string;
    classes: ClassRow[] | undefined;
}

export const MassInputHeader: React.FC<MassInputHeaderProps> = ({
    handleBack,
    currentCard,
    activeModeConfig,
    mode,
    selectedClass,
    classes,
}) => {
    const ActiveModeIcon = activeModeConfig?.icon;
    const headerIconAccent = activeModeConfig?.accent === 'rose'
        ? 'bg-rose-500 text-white shadow-rose-500/25'
        : activeModeConfig?.accent === 'amber'
        ? 'bg-amber-500 text-white shadow-amber-500/25'
        : activeModeConfig?.accent === 'brand'
        ? 'bg-brand-600 text-white shadow-brand-600/25'
        : 'bg-emerald-500 text-white shadow-emerald-500/25';

    return (
        <header className="mb-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 p-3.5 sm:p-4 shadow-sm flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="flex items-center gap-3">
                <Button
                    variant="outline"
                    size="icon"
                    onClick={handleBack}
                    aria-label="Kembali ke langkah sebelumnya"
                    className="h-10 w-10 rounded-xl bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 flex-shrink-0"
                >
                    <ArrowLeftIcon className="w-4 h-4" />
                </Button>
                {ActiveModeIcon && (
                    <div className={`hidden sm:flex w-10 h-10 rounded-xl items-center justify-center flex-shrink-0 shadow-sm ${headerIconAccent}`}>
                        <ActiveModeIcon className="w-5 h-5" />
                    </div>
                )}
                <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                        <h1 className="text-lg sm:text-xl font-extrabold tracking-tight text-slate-900 dark:text-white leading-tight">
                            {currentCard?.title}
                        </h1>
                        {activeModeConfig?.badge && (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-lg text-[10px] font-bold bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-200/80 dark:border-emerald-500/20">
                                {activeModeConfig.badge}
                            </span>
                        )}
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-400 truncate max-w-2xl">
                        {currentCard?.description}
                    </p>
                </div>
            </div>

            {mode !== 'violation_export' && (
                <div className="flex items-center gap-2 sm:flex-shrink-0">
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-bold border border-slate-200/80 dark:border-slate-700">
                        <School className="w-3.5 h-3.5 text-brand-600 dark:text-brand-400" />
                        <span>{classes?.find(c => c.id === selectedClass)?.name || 'Pilih Kelas'}</span>
                    </span>
                </div>
            )}
        </header>
    );
};
