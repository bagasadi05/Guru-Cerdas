import { useState, useRef, useCallback, TouchEvent } from 'react';

interface SwipeConfig {
    onSwipeDown?: () => void;
    onSwipeUp?: () => void;
    onSwipeLeft?: () => void;
    onSwipeRight?: () => void;
    threshold?: number;
    preventScrollOnSwipe?: boolean;
}

interface SwipeHandlers {
    onTouchStart: (e: TouchEvent) => void;
    onTouchMove: (e: TouchEvent) => void;
    onTouchEnd: (e: TouchEvent) => void;
}

interface SwipeState {
    isSwiping: boolean;
    direction: 'up' | 'down' | 'left' | 'right' | null;
    deltaX: number;
    deltaY: number;
}

/**
 * Hook for detecting swipe gestures on touch devices
 * @param config - Configuration for swipe detection
 * @returns Handlers to attach to the element and current swipe state
 */
export function useSwipeGesture(config: SwipeConfig): [SwipeHandlers, SwipeState] {
    const {
        onSwipeDown,
        onSwipeUp,
        onSwipeLeft,
        onSwipeRight,
        threshold = 50,
        preventScrollOnSwipe = false,
    } = config;

    const [state, setState] = useState<SwipeState>({
        isSwiping: false,
        direction: null,
        deltaX: 0,
        deltaY: 0,
    });

    const touchStart = useRef<{ x: number; y: number } | null>(null);
    const isSwiping = useRef(false);

    const onTouchStart = useCallback((e: TouchEvent) => {
        const touch = e.touches[0];
        touchStart.current = { x: touch.clientX, y: touch.clientY };
        isSwiping.current = false;
        setState(prev => ({ ...prev, isSwiping: false, direction: null, deltaX: 0, deltaY: 0 }));
    }, []);

    const onTouchMove = useCallback((e: TouchEvent) => {
        if (!touchStart.current) return;

        const touch = e.touches[0];
        const deltaX = touch.clientX - touchStart.current.x;
        const deltaY = touch.clientY - touchStart.current.y;
        const absDeltaX = Math.abs(deltaX);
        const absDeltaY = Math.abs(deltaY);

        // Determine direction based on which axis has more movement
        let direction: 'up' | 'down' | 'left' | 'right' | null = null;
        if (absDeltaX > absDeltaY && absDeltaX > 10) {
            direction = deltaX > 0 ? 'right' : 'left';
        } else if (absDeltaY > absDeltaX && absDeltaY > 10) {
            direction = deltaY > 0 ? 'down' : 'up';
        }

        if (direction) {
            isSwiping.current = true;
            if (preventScrollOnSwipe) {
                e.preventDefault();
            }
        }

        setState({
            isSwiping: isSwiping.current,
            direction,
            deltaX,
            deltaY,
        });
    }, [preventScrollOnSwipe]);

    const onTouchEnd = useCallback((e: TouchEvent) => {
        if (!touchStart.current) return;

        const { deltaX, deltaY } = state;
        const absDeltaX = Math.abs(deltaX);
        const absDeltaY = Math.abs(deltaY);

        // Trigger callbacks if threshold is met
        if (absDeltaY > threshold && absDeltaY > absDeltaX) {
            if (deltaY > 0 && onSwipeDown) {
                onSwipeDown();
            } else if (deltaY < 0 && onSwipeUp) {
                onSwipeUp();
            }
        } else if (absDeltaX > threshold && absDeltaX > absDeltaY) {
            if (deltaX > 0 && onSwipeRight) {
                onSwipeRight();
            } else if (deltaX < 0 && onSwipeLeft) {
                onSwipeLeft();
            }
        }

        // Reset
        touchStart.current = null;
        isSwiping.current = false;
        setState({
            isSwiping: false,
            direction: null,
            deltaX: 0,
            deltaY: 0,
        });
    }, [state, threshold, onSwipeDown, onSwipeUp, onSwipeLeft, onSwipeRight]);

    return [
        { onTouchStart, onTouchMove, onTouchEnd },
        state,
    ];
}

export default useSwipeGesture;
