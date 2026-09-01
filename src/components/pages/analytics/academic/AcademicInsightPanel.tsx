import React from 'react';
import { Sparkles, AlertTriangle, AlertCircle, Info, CheckCircle2 } from 'lucide-react';
import type { AcademicInsight } from '../../../../services/academicAnalyticsService';

interface AcademicInsightPanelProps {
    insights: AcademicInsight[];
    isLoading: boolean;
    onAction?: (action: string) => void;
}

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

export const AcademicInsightPanel: React.FC<AcademicInsightPanelProps> = ({ insights, isLoading, onAction }) => {
    if (isLoading) {
        return (
            <div className="rounded-2xl border border-slate-200 dark:border-slate-700 p-4 animate-pulse">
                <div className="flex items-center gap-2 mb-3">
                    <div className="w-5 h-5 rounded bg-slate-200 dark:bg-slate-700" />
                    <div className="w-40 h-4 rounded bg-slate-200 dark:bg-slate-700" />
                </div>
                <div className="space-y-2">
                    <div className="h-16 rounded-xl bg-slate-100 dark:bg-slate-800" />
                    <div className="h-16 rounded-xl bg-slate-100 dark:bg-slate-800" />
                </div>
            </div>
        );
    }

    if (insights.length === 0) return null;

    return (
        <div className="space-y-3">
            <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-brand-500" />
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">Insight Akademik</h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {insights.map((ins) => {
                    const sev = SEV_CONFIG[ins.severity] || SEV_CONFIG.info;
                    const Icon = sev.icon;
                    return (
                        <div
                            key={ins.id}
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
