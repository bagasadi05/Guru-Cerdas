import React from 'react';
import { Sparkles, AlertTriangle, AlertCircle, Info, CheckCircle2 } from 'lucide-react';
import type { AcademicInsight, AcademicInsightResult, InsightAction } from '../../../../services/academicAnalyticsService';

interface AcademicInsightPanelProps {
    insights: AcademicInsight[];
    /** null until the teacher asks for an AI analysis. */
    source: AcademicInsightResult['source'] | null;
    isAiLoading: boolean;
    onGenerateAi: () => void;
    onAction?: (action: InsightAction) => void;
}

const SOURCE_NOTE: Record<'none' | AcademicInsightResult['source'], string> = {
    none: 'Dihitung otomatis dari nilai yang sudah masuk.',
    ai: 'Disusun AI dari ringkasan nilai. Nama siswa tidak dikirim ke AI.',
    offline: 'AI sedang tidak tersedia, jadi ini hasil hitungan otomatis.',
};

const SEV_CONFIG: Record<string, { ring: string; bg: string; text: string; iconText: string; icon: React.ElementType }> = {
    high: {
        ring: 'border-red-200 dark:border-red-500/20',
        bg: 'bg-red-50 dark:bg-red-500/10',
        text: 'text-red-700 dark:text-red-300',
        iconText: 'text-red-500',
        icon: AlertTriangle,
    },
    warning: {
        ring: 'border-amber-200 dark:border-amber-500/20',
        bg: 'bg-amber-50 dark:bg-amber-500/10',
        text: 'text-amber-700 dark:text-amber-300',
        iconText: 'text-amber-500',
        icon: AlertCircle,
    },
    info: {
        ring: 'border-blue-200 dark:border-blue-500/20',
        bg: 'bg-blue-50 dark:bg-blue-500/10',
        text: 'text-blue-700 dark:text-blue-300',
        iconText: 'text-blue-500',
        icon: Info,
    },
    good: {
        ring: 'border-green-200 dark:border-green-500/20',
        bg: 'bg-green-50 dark:bg-green-500/10',
        text: 'text-green-700 dark:text-green-300',
        iconText: 'text-green-500',
        icon: CheckCircle2,
    },
};

export const AcademicInsightPanel: React.FC<AcademicInsightPanelProps> = ({
    insights, source, isAiLoading, onGenerateAi, onAction,
}) => {
    if (insights.length === 0) return null;

    return (
        <div className="space-y-3" aria-busy={isAiLoading}>
            <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                    <div className="flex items-center gap-2">
                        <Sparkles className="w-4 h-4 text-brand-500" />
                        <h3 className="text-sm font-bold text-slate-900 dark:text-white">Insight Akademik</h3>
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{SOURCE_NOTE[source ?? 'none']}</p>
                </div>
                <button
                    type="button"
                    onClick={onGenerateAi}
                    disabled={isAiLoading}
                    className="inline-flex items-center gap-1.5 min-h-[44px] sm:min-h-[36px] px-3 rounded-xl border border-brand-200 dark:border-brand-500/30 text-xs font-semibold text-brand-700 dark:text-brand-300 hover:bg-brand-50 dark:hover:bg-brand-500/10 disabled:opacity-60 disabled:cursor-wait focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
                >
                    <Sparkles className={`w-3.5 h-3.5 ${isAiLoading ? 'animate-pulse' : ''}`} />
                    {isAiLoading ? 'Menganalisis…' : source === 'ai' ? 'Analisis ulang dengan AI' : 'Analisis dengan AI'}
                </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {insights.map((ins, index) => {
                    const sev = SEV_CONFIG[ins.severity] || SEV_CONFIG.info;
                    const Icon = sev.icon;
                    return (
                        <div
                            key={`${ins.id}-${index}`}
                            className={`rounded-2xl border ${sev.ring} ${sev.bg} p-4`}
                        >
                            <div className="flex items-start gap-3">
                                <Icon className={`w-5 h-5 mt-0.5 shrink-0 ${sev.iconText}`} />
                                <div className="flex-1 min-w-0">
                                    <p className={`text-sm font-semibold ${sev.text}`}>{ins.title}</p>
                                    <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5 leading-relaxed">
                                        {ins.detail}
                                    </p>
                                    {ins.cta && (
                                        <button
                                            type="button"
                                            onClick={() => onAction?.(ins.cta!.action)}
                                            className={`mt-2 text-xs font-semibold ${sev.text} hover:underline inline-flex items-center gap-1`}
                                        >
                                            {ins.cta.label} &rarr;
                                        </button>
                                    )}
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};
