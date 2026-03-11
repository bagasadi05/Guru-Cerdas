import React from 'react';
import { Eye, EyeOff, Plus, X } from 'lucide-react';
import { useDashboard } from './dashboardShared';

export const DashboardConfigurator: React.FC<{
    isOpen: boolean;
    onClose: () => void;
    availableWidgets: { type: string; title: string; description: string }[];
}> = ({ isOpen, onClose, availableWidgets }) => {
    const { widgets, addWidget, toggleWidget, resetLayout } = useDashboard();

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/50" onClick={onClose} />

            <div className="relative w-full max-w-lg overflow-hidden rounded-2xl bg-white shadow-2xl dark:bg-slate-900">
                <div className="flex items-center justify-between border-b border-slate-200 p-4 dark:border-slate-800">
                    <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
                        Kustomisasi Dashboard
                    </h2>
                    <button onClick={onClose} className="rounded-lg p-2 hover:bg-slate-100 dark:hover:bg-slate-800">
                        <X className="h-5 w-5 text-slate-500" />
                    </button>
                </div>

                <div className="max-h-96 overflow-y-auto p-4">
                    <div className="space-y-3">
                        {availableWidgets.map(available => {
                            const existing = widgets.find(widget => widget.type === available.type);

                            return (
                                <div
                                    key={available.type}
                                    className="flex items-center justify-between rounded-2xl bg-slate-50 p-3 dark:bg-slate-800"
                                >
                                    <div>
                                        <p className="font-medium text-slate-900 dark:text-white">
                                            {available.title}
                                        </p>
                                        <p className="text-sm text-slate-500">{available.description}</p>
                                    </div>
                                    {existing ? (
                                        <button
                                            onClick={() => toggleWidget(existing.id)}
                                            className={`rounded-lg p-2 ${
                                                existing.visible
                                                    ? 'bg-indigo-100 text-indigo-600 dark:bg-indigo-900/40'
                                                    : 'bg-slate-200 text-slate-500 dark:bg-slate-700'
                                            }`}
                                        >
                                            {existing.visible ? <Eye className="h-5 w-5" /> : <EyeOff className="h-5 w-5" />}
                                        </button>
                                    ) : (
                                        <button
                                            onClick={() => addWidget({
                                                type: available.type,
                                                title: available.title,
                                                size: 'md',
                                                visible: true
                                            })}
                                            className="rounded-lg bg-indigo-500 p-2 text-white hover:bg-indigo-600"
                                        >
                                            <Plus className="h-5 w-5" />
                                        </button>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </div>

                <div className="flex justify-between border-t border-slate-200 p-4 dark:border-slate-800">
                    <button
                        onClick={resetLayout}
                        className="rounded-lg px-4 py-2 text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800"
                    >
                        Reset ke Default
                    </button>
                    <button
                        onClick={onClose}
                        className="rounded-lg bg-indigo-500 px-4 py-2 text-white hover:bg-indigo-600"
                    >
                        Selesai
                    </button>
                </div>
            </div>
        </div>
    );
};
