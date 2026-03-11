import React from 'react';
import { AlertCircle, AlertTriangle, Check, Loader2 } from 'lucide-react';
import { ProgressIndicator } from './ProgressIndicator';

export interface OperationProgressProps {
    title: string;
    description?: string;
    progress: number;
    status?: 'running' | 'success' | 'error' | 'paused';
    onCancel?: () => void;
    onRetry?: () => void;
    className?: string;
}

export const OperationProgress: React.FC<OperationProgressProps> = ({
    title,
    description,
    progress,
    status = 'running',
    onCancel,
    onRetry,
    className = ''
}) => {
    const statusColors = {
        running: 'indigo',
        success: 'emerald',
        error: 'red',
        paused: 'amber'
    } as const;

    const statusIcons = {
        running: <Loader2 className="h-5 w-5 animate-spin" />,
        success: <Check className="h-5 w-5" />,
        error: <AlertCircle className="h-5 w-5" />,
        paused: <AlertTriangle className="h-5 w-5" />
    };

    const statusIconClasses = {
        running: 'bg-indigo-100 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-400',
        success: 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400',
        error: 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400',
        paused: 'bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400'
    };

    return (
        <div className={`rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-800 ${className}`}>
            <div className="flex items-start gap-3">
                <div className={`rounded-lg p-2 ${statusIconClasses[status]}`}>
                    {statusIcons[status]}
                </div>
                <div className="min-w-0 flex-1">
                    <h4 className="font-medium text-slate-900 dark:text-white">{title}</h4>
                    {description && (
                        <p className="mt-0.5 text-sm text-slate-500 dark:text-slate-400">{description}</p>
                    )}

                    <div className="mt-3">
                        <ProgressIndicator
                            value={progress}
                            size="sm"
                            showLabel={false}
                            color={statusColors[status]}
                        />
                        <div className="mt-1 flex items-center justify-between">
                            <span className="text-xs text-slate-500">{Math.round(progress)}% selesai</span>
                            <div className="flex gap-2">
                                {status === 'error' && onRetry && (
                                    <button
                                        onClick={onRetry}
                                        className="text-xs font-medium text-indigo-600 hover:text-indigo-700"
                                    >
                                        Coba Lagi
                                    </button>
                                )}
                                {status === 'running' && onCancel && (
                                    <button
                                        onClick={onCancel}
                                        className="text-xs font-medium text-red-600 hover:text-red-700"
                                    >
                                        Batalkan
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
