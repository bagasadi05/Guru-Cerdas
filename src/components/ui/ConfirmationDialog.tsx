import React, { useState, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { AlertTriangleIcon, TrashIcon, XIcon, AlertCircleIcon } from '../Icons';
import { Button } from './Button';

interface ConfirmationDialogProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => void | Promise<void>;
    title: string;
    message: string | React.ReactNode;
    confirmText?: string;
    cancelText?: string;
    variant?: 'danger' | 'warning' | 'info';
    requireTyping?: string; // If set, user must type this to confirm
    isPending?: boolean;
    maxWidth?: string;
}

const variantConfig = {
    danger: {
        icon: TrashIcon,
        iconColor: 'text-red-500',
        iconBg: 'bg-red-100 dark:bg-red-900/30',
        buttonColor: 'bg-red-600 hover:bg-red-700 text-white',
        borderColor: 'border-red-200 dark:border-red-800',
    },
    warning: {
        icon: AlertTriangleIcon,
        iconColor: 'text-amber-500',
        iconBg: 'bg-amber-100 dark:bg-amber-900/30',
        buttonColor: 'bg-amber-600 hover:bg-amber-700 text-white',
        borderColor: 'border-amber-200 dark:border-amber-800',
    },
    info: {
        icon: AlertCircleIcon,
        iconColor: 'text-blue-500',
        iconBg: 'bg-blue-100 dark:bg-blue-900/30',
        buttonColor: 'bg-blue-600 hover:bg-blue-700 text-white',
        borderColor: 'border-blue-200 dark:border-blue-800',
    },
};

export const ConfirmationDialog: React.FC<ConfirmationDialogProps> = ({
    isOpen,
    onClose,
    onConfirm,
    title,
    message,
    confirmText = 'Konfirmasi',
    cancelText = 'Batal',
    variant = 'danger',
    requireTyping,
    isPending = false,
    maxWidth = 'max-w-lg',
}) => {
    const [typedValue, setTypedValue] = useState('');
    const [isConfirming, setIsConfirming] = useState(false);

    const config = variantConfig[variant];
    const Icon = config.icon;

    const canConfirm = !requireTyping || typedValue === requireTyping;

    const handleConfirm = async () => {
        if (!canConfirm) return;

        setIsConfirming(true);
        try {
            await onConfirm();
            setTypedValue('');
            onClose();
        } catch (error) {
            console.error('Confirmation action failed:', error);
        } finally {
            setIsConfirming(false);
        }
    };

    const handleClose = () => {
        if (isConfirming || isPending) return;
        setTypedValue('');
        onClose();
    };

    if (!isOpen) return null;

    const isClient = typeof document !== 'undefined';
    if (!isClient) return null;

    return createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
            <div
                className={`w-full ${maxWidth} bg-white dark:bg-gray-900 rounded-2xl shadow-2xl border ${config.borderColor} overflow-hidden transition-all`}
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className="p-6 pb-5">
                    <div className="flex items-start gap-4">
                        <div className={`flex-shrink-0 w-12 h-12 rounded-2xl ${config.iconBg} flex items-center justify-center shadow-inner`}>
                            <Icon className={`w-6 h-6 ${config.iconColor}`} />
                        </div>
                        <div className="flex-1 min-w-0">
                            <h3 className="text-lg font-bold text-gray-900 dark:text-white leading-snug">
                                {title}
                            </h3>
                            {typeof message === 'string' ? (
                                <p className="mt-2 text-sm text-gray-600 dark:text-gray-300 leading-relaxed">
                                    {message}
                                </p>
                            ) : (
                                <div className="mt-2 text-sm text-gray-600 dark:text-gray-300 leading-relaxed">
                                    {message}
                                </div>
                            )}
                        </div>
                        <button type="button"
                            onClick={handleClose}
                            disabled={isConfirming || isPending}
                            className="p-1.5 -mr-1 -mt-1 rounded-xl text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors disabled:opacity-50 flex-shrink-0"
                            aria-label="Tutup dialog"
                        >
                            <XIcon className="w-5 h-5" />
                        </button>
                    </div>
                </div>

                {/* Typing Confirmation */}
                {requireTyping && (
                    <div className="px-6 pb-4">
                        <label className="block text-sm text-gray-600 dark:text-gray-400 mb-2">
                            Ketik <span className="font-mono font-bold text-gray-900 dark:text-white">"{requireTyping}"</span> untuk mengonfirmasi:
                        </label>
                        <input
                            type="text"
                            value={typedValue}
                            onChange={(e) => setTypedValue(e.target.value)}
                            placeholder={requireTyping}
                            className="w-full px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                            disabled={isConfirming || isPending}
                        />
                    </div>
                )}

                {/* Actions */}
                <div className="flex flex-col-reverse sm:flex-row sm:items-center sm:justify-end gap-3 p-4 sm:px-6 bg-gray-50/80 dark:bg-gray-800/40 border-t border-gray-100 dark:border-gray-800">
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={handleClose}
                        disabled={isConfirming || isPending}
                        className="w-full sm:w-auto px-5 h-10 text-sm font-semibold rounded-xl"
                    >
                        {cancelText}
                    </Button>
                    <button
                        type="button"
                        onClick={handleConfirm}
                        disabled={!canConfirm || isConfirming || isPending}
                        className={`w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 h-10 rounded-xl text-sm font-semibold whitespace-nowrap transition-all shadow-sm ${config.buttonColor} disabled:opacity-50 disabled:cursor-not-allowed`}
                    >
                        {isConfirming || isPending ? (
                            <>
                                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin flex-shrink-0" />
                                <span>Memproses...</span>
                            </>
                        ) : (
                            <span>{confirmText}</span>
                        )}
                    </button>
                </div>
            </div>
        </div>,
        document.body
    );
};

// Hook for easy usage
export const useConfirmation = () => {
    const [isOpen, setIsOpen] = useState(false);
    const [config, setConfig] = useState<Omit<ConfirmationDialogProps, 'isOpen' | 'onClose'> | null>(null);

    const confirm = useCallback((options: Omit<ConfirmationDialogProps, 'isOpen' | 'onClose'>) => {
        return new Promise<boolean>((resolve) => {
            setConfig({
                ...options,
                onConfirm: async () => {
                    await options.onConfirm();
                    resolve(true);
                },
            });
            setIsOpen(true);
        });
    }, []);

    const close = useCallback(() => {
        setIsOpen(false);
        setConfig(null);
    }, []);

    const Dialog = config ? (
        <ConfirmationDialog
            {...config}
            isOpen={isOpen}
            onClose={close}
        />
    ) : null;

    return { confirm, Dialog, isOpen, close };
};

export default ConfirmationDialog;
