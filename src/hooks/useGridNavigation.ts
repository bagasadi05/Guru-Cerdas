import { useRef, useCallback } from 'react';

/**
 * Hook for grid/list keyboard navigation between inputs
 */
export const useGridNavigation = <T extends HTMLElement>(
    itemCount: number,
    options: {
        onEnter?: (index: number) => void;
        onEscape?: () => void;
        columnsPerRow?: number;
        enabled?: boolean;
    } = {}
) => {
    const {
        onEnter,
        onEscape,
        columnsPerRow = 1,
        enabled = true
    } = options;

    const itemRefs = useRef<Map<number, T>>(new Map());
    const currentIndex = useRef(0);

    const focusItem = useCallback((index: number) => {
        if (index >= 0 && index < itemCount) {
            const item = itemRefs.current.get(index);
            if (item) {
                item.focus();
                currentIndex.current = index;
            }
        }
    }, [itemCount]);

    const handleKeyDown = useCallback((e: React.KeyboardEvent, index: number) => {
        if (!enabled) return;

        switch (e.key) {
            case 'ArrowDown':
                e.preventDefault();
                focusItem(index + columnsPerRow);
                break;
            case 'ArrowUp':
                e.preventDefault();
                focusItem(index - columnsPerRow);
                break;
            case 'ArrowRight':
                if (columnsPerRow > 1) {
                    e.preventDefault();
                    focusItem(index + 1);
                }
                break;
            case 'ArrowLeft':
                if (columnsPerRow > 1) {
                    e.preventDefault();
                    focusItem(index - 1);
                }
                break;
            case 'Enter':
                if (!e.shiftKey) {
                    e.preventDefault();
                    if (onEnter) {
                        onEnter(index);
                    } else {
                        focusItem(index + 1);
                    }
                }
                break;
            case 'Tab':
                // Let Tab work naturally, but track the index
                if (e.shiftKey) {
                    currentIndex.current = Math.max(0, index - 1);
                } else {
                    currentIndex.current = Math.min(itemCount - 1, index + 1);
                }
                break;
            case 'Escape':
                if (onEscape) {
                    e.preventDefault();
                    onEscape();
                }
                break;
            case 'Home':
                if (e.ctrlKey) {
                    e.preventDefault();
                    focusItem(0);
                }
                break;
            case 'End':
                if (e.ctrlKey) {
                    e.preventDefault();
                    focusItem(itemCount - 1);
                }
                break;
        }
    }, [enabled, focusItem, itemCount, columnsPerRow, onEnter, onEscape]);

    const registerRef = useCallback((index: number, element: T | null) => {
        if (element) {
            itemRefs.current.set(index, element);
        } else {
            itemRefs.current.delete(index);
        }
    }, []);

    return {
        registerRef,
        handleKeyDown,
        focusItem,
        currentIndex: currentIndex.current,
    };
};
