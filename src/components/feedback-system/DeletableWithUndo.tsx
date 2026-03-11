import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useFeedbackToast } from './useFeedbackToast';

interface DeletableWithUndoProps<T> {
    item: T;
    onDelete: (item: T) => Promise<void>;
    renderItem: (item: T, isPendingDelete: boolean) => React.ReactNode;
    undoDuration?: number;
}

export function DeletableWithUndo<T extends { id: string }>({
    item,
    onDelete,
    renderItem,
    undoDuration = 5000
}: DeletableWithUndoProps<T>) {
    const [isPendingDelete, setIsPendingDelete] = useState(false);
    const [isDeleted, setIsDeleted] = useState(false);
    const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const toast = useFeedbackToast();

    // Intentionally kept local until a concrete consumer needs the callback exposed.
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const handleDelete = useCallback(async () => {
        setIsPendingDelete(true);

        const toastId = toast.addToast({
            type: 'warning',
            title: 'Item akan dihapus',
            message: `Dalam ${undoDuration / 1000} detik...`,
            duration: undoDuration,
            undoAction: () => {
                setIsPendingDelete(false);
                if (timeoutRef.current) {
                    clearTimeout(timeoutRef.current);
                }
            }
        });

        timeoutRef.current = setTimeout(async () => {
            try {
                await onDelete(item);
                setIsDeleted(true);
                toast.removeToast(toastId);
                toast.success('Item berhasil dihapus');
            } catch {
                setIsPendingDelete(false);
                toast.error('Gagal menghapus item');
            }
        }, undoDuration);
    }, [item, onDelete, toast, undoDuration]);

    useEffect(() => () => {
        if (timeoutRef.current) {
            clearTimeout(timeoutRef.current);
        }
    }, []);

    if (isDeleted) {
        return null;
    }

    return (
        <div className={`transition-opacity duration-200 ${isPendingDelete ? 'opacity-50' : ''}`}>
            {renderItem(item, isPendingDelete)}
        </div>
    );
}
