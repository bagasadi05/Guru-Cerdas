import React, { createContext, useCallback, useRef, useState } from 'react';
import { useFocusTrap, useKeyboardNavigation } from './shared';

interface FocusContextValue {
    focusedId: string | null;
    setFocusedId: (id: string | null) => void;
    registerElement: (id: string, ref: React.RefObject<HTMLElement>) => void;
    unregisterElement: (id: string) => void;
    focusElement: (id: string) => void;
    focusNext: () => void;
    focusPrevious: () => void;
}

const FocusContext = createContext<FocusContextValue | null>(null);

export const FocusProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [focusedId, setFocusedId] = useState<string | null>(null);
    const elementsRef = useRef<Map<string, React.RefObject<HTMLElement>>>(new Map());
    const orderRef = useRef<string[]>([]);

    const registerElement = useCallback((id: string, ref: React.RefObject<HTMLElement>) => {
        elementsRef.current.set(id, ref);
        if (!orderRef.current.includes(id)) {
            orderRef.current.push(id);
        }
    }, []);

    const unregisterElement = useCallback((id: string) => {
        elementsRef.current.delete(id);
        orderRef.current = orderRef.current.filter(item => item !== id);
    }, []);

    const focusElement = useCallback((id: string) => {
        const ref = elementsRef.current.get(id);
        if (ref?.current) {
            ref.current.focus();
            setFocusedId(id);
        }
    }, []);

    const focusNext = useCallback(() => {
        const currentIndex = focusedId ? orderRef.current.indexOf(focusedId) : -1;
        const nextIndex = (currentIndex + 1) % orderRef.current.length;
        focusElement(orderRef.current[nextIndex]);
    }, [focusElement, focusedId]);

    const focusPrevious = useCallback(() => {
        const currentIndex = focusedId ? orderRef.current.indexOf(focusedId) : 0;
        const previousIndex = currentIndex === 0 ? orderRef.current.length - 1 : currentIndex - 1;
        focusElement(orderRef.current[previousIndex]);
    }, [focusElement, focusedId]);

    return (
        <FocusContext.Provider value={{
            focusedId,
            setFocusedId,
            registerElement,
            unregisterElement,
            focusElement,
            focusNext,
            focusPrevious
        }}>
            {children}
        </FocusContext.Provider>
    );
};

interface AccessibleModalProps {
    isOpen: boolean;
    onClose: () => void;
    title: string;
    description?: string;
    children: React.ReactNode;
    closeOnEscape?: boolean;
    closeOnOverlay?: boolean;
}

export const AccessibleModal: React.FC<AccessibleModalProps> = ({
    isOpen,
    onClose,
    title,
    description,
    children,
    closeOnEscape = true,
    closeOnOverlay = true
}) => {
    const containerRef = useFocusTrap(isOpen);
    const uniqueId = React.useId();
    const titleId = `modal-title-${uniqueId}`;
    const descriptionId = description ? `modal-desc-${uniqueId}` : undefined;

    const { onKeyDown } = useKeyboardNavigation({
        onEscape: closeOnEscape ? onClose : undefined
    });

    React.useEffect(() => {
        if (isOpen) {
            document.addEventListener('keydown', onKeyDown as EventListener);
            document.body.style.overflow = 'hidden';
        }

        return () => {
            document.removeEventListener('keydown', onKeyDown as EventListener);
            document.body.style.overflow = '';
        };
    }, [isOpen, onKeyDown]);

    if (!isOpen) return null;

    return (
        <div
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            aria-describedby={descriptionId}
            className="fixed inset-0 z-50 flex items-center justify-center"
        >
            <div
                className="absolute inset-0 bg-black/50"
                onClick={closeOnOverlay ? onClose : undefined}
                aria-hidden="true"
            />

            <div
                ref={containerRef}
                className="relative mx-4 max-h-[90vh] w-full max-w-lg overflow-auto rounded-2xl bg-white shadow-xl dark:bg-slate-900"
            >
                <div className="p-6">
                    <div className="mb-4 flex items-start justify-between">
                        <h2 id={titleId} className="text-xl font-semibold text-slate-900 dark:text-white">
                            {title}
                        </h2>
                        <button
                            onClick={onClose}
                            aria-label="Tutup modal"
                            className="p-1 text-slate-400 transition-colors hover:text-slate-600 dark:hover:text-slate-300"
                        >
                            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    </div>
                    {description && (
                        <p id={descriptionId} className="mb-4 text-slate-600 dark:text-slate-400">
                            {description}
                        </p>
                    )}
                    {children}
                </div>
            </div>
        </div>
    );
};
