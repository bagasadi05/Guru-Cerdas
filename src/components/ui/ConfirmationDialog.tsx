import React, { useState, useCallback } from 'react';
import { AlertTriangleIcon, TrashIcon, AlertCircleIcon } from '../Icons';
import { Button } from './Button';
import { Modal } from './Modal';

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

    return (
        <Modal
            isOpen={isOpen}
            onClose={handleClose}
            title={title}
            maxWidth={maxWidth}
            icon={<Icon className={`w-5 h-5 ${config.iconColor}`} />}
            footer={
                <div className="flex flex-col-reverse sm:flex-row sm:items-center sm:justify-end gap-3">
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
            }
        >
            <div className="space-y-4">
                {typeof message === 'string' ? (
                    <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                        {message}
                    </p>
                ) : (
                    <div className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                        {message}
                    </div>
                )}

                {requireTyping && (
                    <div>
                        <label className="block text-sm text-slate-600 dark:text-slate-400 mb-2">
                            Ketik <span className="font-mono font-bold text-slate-900 dark:text-white">&quot;{requireTyping}&quot;</span> untuk mengonfirmasi:
                        </label>
                        <input
                            type="text"
                            value={typedValue}
                            onChange={(e) => setTypedValue(e.target.value)}
                            placeholder={requireTyping}
                            className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                            disabled={isConfirming || isPending}
                        />
                    </div>
                )}
            </div>
        </Modal>
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
