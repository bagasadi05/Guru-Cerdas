import React, { useCallback, useState, useRef, TouchEvent } from 'react';
import { hapticMedium } from '@/services/haptics';

// Inline cn utility since @/lib/utils doesn't exist
const cn = (...classes: (string | boolean | undefined)[]) =>
    classes.filter(Boolean).join(' ');

interface SwipeDismissModalProps {
    isOpen: boolean;
    onClose: () => void;
    children: React.ReactNode;
    className?: string;
    threshold?: number; // Distance to trigger dismiss (default: 100px)
    direction?: 'down' | 'up' | 'left' | 'right';
}

/**
 * A modal wrapper that can be dismissed by swiping
 * - Swipe down (default) to dismiss
 * - Shows visual feedback during swipe
 * - Haptic feedback when threshold reached
 */
export const SwipeDismissModal: React.FC<SwipeDismissModalProps> = ({
    isOpen,
    onClose,
    children,
    className,
    threshold = 100,
    direction = 'down',
}) => {
    const [deltaY, setDeltaY] = useState(0);
    const [deltaX, setDeltaX] = useState(0);
    const [isDragging, setIsDragging] = useState(false);
    const startRef = useRef<{ x: number; y: number } | null>(null);
    const hasTriggeredHaptic = useRef(false);

    const handleTouchStart = useCallback((e: TouchEvent) => {
        const touch = e.touches[0];
        startRef.current = { x: touch.clientX, y: touch.clientY };
        setIsDragging(false);
        setDeltaY(0);
        setDeltaX(0);
        hasTriggeredHaptic.current = false;
    }, []);

    const handleTouchMove = useCallback((e: TouchEvent) => {
        if (!startRef.current) return;

        const touch = e.touches[0];
        const newDeltaY = touch.clientY - startRef.current.y;
        const newDeltaX = touch.clientX - startRef.current.x;

        // Only allow swipe in the specified direction
        if (direction === 'down' && newDeltaY > 10) {
            setDeltaY(Math.max(0, newDeltaY));
            setIsDragging(true);
            e.preventDefault();
        } else if (direction === 'up' && newDeltaY < -10) {
            setDeltaY(Math.min(0, newDeltaY));
            setIsDragging(true);
            e.preventDefault();
        } else if (direction === 'right' && newDeltaX > 10) {
            setDeltaX(Math.max(0, newDeltaX));
            setIsDragging(true);
            e.preventDefault();
        } else if (direction === 'left' && newDeltaX < -10) {
            setDeltaX(Math.min(0, newDeltaX));
            setIsDragging(true);
            e.preventDefault();
        }

        // Trigger haptic when threshold reached
        const currentDelta = direction === 'down' || direction === 'up' ? Math.abs(newDeltaY) : Math.abs(newDeltaX);
        if (currentDelta >= threshold && !hasTriggeredHaptic.current) {
            hapticMedium();
            hasTriggeredHaptic.current = true;
        }
    }, [threshold, direction]);

    const handleTouchEnd = useCallback(() => {
        if (!startRef.current) return;

        const absDelta = direction === 'down' || direction === 'up' ? Math.abs(deltaY) : Math.abs(deltaX);

        if (absDelta >= threshold) {
            onClose();
        }

        // Reset
        startRef.current = null;
        setDeltaY(0);
        setDeltaX(0);
        setIsDragging(false);
        hasTriggeredHaptic.current = false;
    }, [deltaY, deltaX, threshold, onClose, direction]);

    if (!isOpen) return null;

    const transform = direction === 'down' || direction === 'up'
        ? `translateY(${deltaY}px)`
        : `translateX(${deltaX}px)`;

    const opacity = 1 - (Math.abs(direction === 'down' || direction === 'up' ? deltaY : deltaX) / (threshold * 2));

    return (
        <div
            className={cn(
                'fixed inset-0 z-50 flex items-end sm:items-center justify-center',
                'transition-opacity duration-200',
                isDragging ? '' : 'ease-out'
            )}
            onClick={onClose}
        >
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                style={{ opacity: Math.max(0.3, opacity) }}
            />

            {/* Modal content */}
            <div
                className={cn(
                    'relative bg-white dark:bg-slate-900 rounded-t-2xl sm:rounded-2xl shadow-2xl',
                    'w-full sm:max-w-lg max-h-[90vh] overflow-hidden',
                    isDragging ? '' : 'transition-transform duration-200 ease-out',
                    className
                )}
                style={{ transform }}
                onClick={(e) => e.stopPropagation()}
                onTouchStart={handleTouchStart}
                onTouchMove={handleTouchMove}
                onTouchEnd={handleTouchEnd}
            >
                {/* Swipe indicator */}
                <div className="flex justify-center pt-3 pb-2">
                    <div className={cn(
                        'w-12 h-1.5 bg-slate-300 dark:bg-slate-600 rounded-full',
                        isDragging && 'bg-indigo-500 dark:bg-indigo-400'
                    )} />
                </div>

                {children}
            </div>
        </div>
    );
};

export default SwipeDismissModal;
