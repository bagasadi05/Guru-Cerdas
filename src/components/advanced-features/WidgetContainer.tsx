import React, { useState } from 'react';
import { EyeOff, MoreHorizontal, Settings, Trash2 } from 'lucide-react';
import { useDashboard } from './dashboardShared';
import type { DashboardWidget } from './dashboardTypes';

interface WidgetContainerProps {
    widget: DashboardWidget;
    children: React.ReactNode;
    onSettings?: () => void;
    className?: string;
}

export const WidgetContainer: React.FC<WidgetContainerProps> = ({
    widget,
    children,
    onSettings,
    className = ''
}) => {
    const { removeWidget, toggleWidget } = useDashboard();
    const [showMenu, setShowMenu] = useState(false);

    const sizeClasses = {
        sm: 'col-span-1',
        md: 'col-span-2',
        lg: 'col-span-3',
        full: 'col-span-full'
    };

    if (!widget.visible) return null;

    return (
        <div
            className={`
                ${sizeClasses[widget.size]}
                overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-800
                ${className}
            `}
        >
            <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3 dark:border-slate-700">
                <h3 className="font-medium text-slate-900 dark:text-white">{widget.title}</h3>
                <div className="relative">
                    <button
                        onClick={() => setShowMenu(!showMenu)}
                        className="rounded-lg p-1 hover:bg-slate-100 dark:hover:bg-slate-700"
                    >
                        <MoreHorizontal className="h-4 w-4 text-slate-400" />
                    </button>

                    {showMenu && (
                        <>
                            <div className="fixed inset-0 z-10" onClick={() => setShowMenu(false)} />
                            <div className="absolute right-0 top-full z-20 mt-1 w-40 rounded-lg border border-slate-200 bg-white py-1 shadow-lg dark:border-slate-700 dark:bg-slate-800">
                                {onSettings && (
                                    <button
                                        onClick={() => {
                                            onSettings();
                                            setShowMenu(false);
                                        }}
                                        className="flex w-full items-center gap-2 px-3 py-2 text-sm text-slate-700 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-700"
                                    >
                                        <Settings className="h-4 w-4" />
                                        Pengaturan
                                    </button>
                                )}
                                <button
                                    onClick={() => {
                                        toggleWidget(widget.id);
                                        setShowMenu(false);
                                    }}
                                    className="flex w-full items-center gap-2 px-3 py-2 text-sm text-slate-700 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-700"
                                >
                                    <EyeOff className="h-4 w-4" />
                                    Sembunyikan
                                </button>
                                <button
                                    onClick={() => {
                                        removeWidget(widget.id);
                                        setShowMenu(false);
                                    }}
                                    className="flex w-full items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
                                >
                                    <Trash2 className="h-4 w-4" />
                                    Hapus
                                </button>
                            </div>
                        </>
                    )}
                </div>
            </div>

            <div className="p-4">{children}</div>
        </div>
    );
};
