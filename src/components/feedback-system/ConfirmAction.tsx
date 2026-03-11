import React, { useState } from 'react';
import { Loader2 } from 'lucide-react';
import { useHapticFeedback } from './haptics';

export interface ConfirmActionProps {
    trigger: React.ReactElement;
    title: string;
    message: string;
    confirmLabel?: string;
    cancelLabel?: string;
    variant?: 'danger' | 'warning' | 'info';
    onConfirm: () => void | Promise<void>;
    onCancel?: () => void;
}

export const ConfirmAction: React.FC<ConfirmActionProps> = ({
    trigger,
    title,
    message,
    confirmLabel = 'Konfirmasi',
    cancelLabel = 'Batal',
    variant = 'danger',
    onConfirm,
    onCancel
}) => {
    const [isOpen, setIsOpen] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const haptic = useHapticFeedback();

    const handleConfirm = async () => {
        setIsLoading(true);
        try {
            await onConfirm();
            haptic.success();
            setIsOpen(false);
        } catch {
            haptic.error();
        } finally {
            setIsLoading(false);
        }
    };

    const handleCancel = () => {
        haptic.light();
        onCancel?.();
        setIsOpen(false);
    };

    const variantClasses = {
        danger: 'bg-red-500 hover:bg-red-600',
        warning: 'bg-amber-500 hover:bg-amber-600',
        info: 'bg-indigo-500 hover:bg-indigo-600'
    };

    return (
        <>
            {React.cloneElement(trigger, {
                onClick: (event: React.MouseEvent) => {
                    event.preventDefault();
                    haptic.medium();
                    setIsOpen(true);
                }
            })}

            {isOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-black/50" onClick={handleCancel} />
                    <div className="relative w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl animate-scale-in dark:bg-slate-900">
                        <h3 className="mb-2 text-lg font-semibold text-slate-900 dark:text-white">{title}</h3>
                        <p className="mb-6 text-slate-600 dark:text-slate-400">{message}</p>
                        <div className="flex gap-3">
                            <button
                                onClick={handleCancel}
                                disabled={isLoading}
                                className="flex-1 rounded-lg bg-slate-100 px-4 py-2.5 font-medium text-slate-700 transition-colors hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
                            >
                                {cancelLabel}
                            </button>
                            <button
                                onClick={handleConfirm}
                                disabled={isLoading}
                                className={`flex-1 rounded-lg px-4 py-2.5 font-medium text-white transition-colors ${variantClasses[variant]}`}
                            >
                                {isLoading ? (
                                    <Loader2 className="mx-auto h-5 w-5 animate-spin" />
                                ) : confirmLabel}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
};
